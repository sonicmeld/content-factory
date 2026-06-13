from datetime import datetime, timezone
from sqlalchemy.orm import Session
from database.models import AnalyticsTopic, AnalyticsKeyword, AnalyticsMarketTrend
from services.analytics.forecast_engine import calculate_forecasts

def calculate_opportunity_scores(db: Session):
    """
    Computes and updates scoring and lifecycle status for all topics.
    """
    now = datetime.now(timezone.utc)
    topics = db.query(AnalyticsTopic).filter(AnalyticsTopic.status != "archived").all()
    
    for topic in topics:
        # 1. Fetch keywords
        keywords = db.query(AnalyticsKeyword).filter(AnalyticsKeyword.topic_id == topic.id).all()
        if not keywords:
            continue
            
        # 2. Calculate average keyword metrics
        avg_search_volume = sum(k.search_volume for k in keywords) / len(keywords)
        avg_trend_score = sum(k.trend_score for k in keywords) / len(keywords)
        
        # Scale demand_score to 0-100 range (assuming max volume is around 10000)
        demand_score = min(100.0, avg_search_volume / 100.0)
        
        # 3. Calculate forecast metrics
        forecasts = calculate_forecasts(db, topic.id)
        forecast_score = forecasts["forecast_score"]
        
        # 4. Grab competition score (updated by competitor analysis engine)
        competition_score = topic.competition_score or 0.0
        
        # 5. Opportunity Formula
        # Penalty = 0.3 * Competition Score
        competition_penalty = competition_score * 0.3
        
        opp_score = (
            demand_score * 0.45 +
            avg_trend_score * 0.35 +
            forecast_score * 0.20
        ) - competition_penalty
        
        opp_score = round(max(0.0, min(100.0, opp_score)), 2)
        
        # 6. Lifecycle Status update
        # Get recent growth rate if available
        recent_trend = db.query(AnalyticsMarketTrend).filter(
            AnalyticsMarketTrend.topic_id == topic.id
        ).order_by(AnalyticsMarketTrend.collected_at.desc()).first()
        
        growth_rate = recent_trend.growth_rate if recent_trend else 0.0
        
        if opp_score >= 75:
            status = "active"
        elif growth_rate >= 0.15 and opp_score >= 50:
            status = "emerging"
        elif opp_score < 40:
            status = "declining"
        else:
            status = "active"
            
        # 7. Update database fields
        topic.demand_score = float(demand_score)
        topic.trend_score = float(avg_trend_score)
        topic.forecast_score = float(forecast_score)
        topic.opportunity_score = float(opp_score)
        topic.status = status
        topic.last_calculated_at = now
        topic.updated_at = now
        
    db.commit()
