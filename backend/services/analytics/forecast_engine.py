from datetime import datetime, timezone
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from database.models import AnalyticsTopic, AnalyticsMarketTrend

def linear_regression_forecast(history: List[float], steps_ahead: int) -> float:
    """
    Fits y = m * x + c on history and projects it steps_ahead into the future.
    """
    n = len(history)
    if n < 2:
        return history[0] if history else 50.0
        
    x = list(range(n))
    y = history
    
    mean_x = sum(x) / n
    mean_y = sum(y) / n
    
    num = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(n))
    den = sum((x[i] - mean_x) ** 2 for i in range(n))
    
    if den == 0:
        return mean_y
        
    slope = num / den
    intercept = mean_y - slope * mean_x
    
    pred_x = (n - 1) + steps_ahead
    pred_val = slope * pred_x + intercept
    return max(0.0, min(100.0, pred_val))

def calculate_forecasts(db: Session, topic_id: str) -> Dict[str, float]:
    """
    Retrieves history from analytics_market_trends and calculates
    7-day, 30-day, and 90-day forecasts.
    """
    # 1. Fetch trends
    trends = db.query(AnalyticsMarketTrend).filter(
        AnalyticsMarketTrend.topic_id == topic_id
    ).order_by(AnalyticsMarketTrend.collected_at.asc()).all()
    
    # Extract trend scores
    history = [t.trend_score for t in trends]
    
    # 2. Handle cold start / bootstrap simulation
    if len(history) < 14:
        # If we have at least one trend score, bootstrap a simulated 14-day history
        # based on growth rate.
        base_trend = history[-1] if history else 50.0
        # Check if we have a growth rate in the trends table
        growth_rate = trends[-1].growth_rate if trends else 0.05
        
        # Build 14 days of history
        history = []
        for i in range(14):
            # linear projection backward
            simulated_val = base_trend - (13 - i) * (growth_rate * base_trend / 10.0)
            history.append(max(0.0, min(100.0, simulated_val)))
            
    # 3. Calculate projections
    forecast_7 = linear_regression_forecast(history, 7)
    forecast_30 = linear_regression_forecast(history, 30)
    forecast_90 = linear_regression_forecast(history, 90)
    
    # Combine predictions with a basic moving average smoothing
    ma_5 = sum(history[-5:]) / 5.0 if len(history) >= 5 else history[-1]
    
    # Weighted forecast score
    forecast_score = (forecast_7 * 0.5 + forecast_30 * 0.3 + forecast_90 * 0.2)
    
    return {
        "forecast_7": round(forecast_7, 2),
        "forecast_30": round(forecast_30, 2),
        "forecast_90": round(forecast_90, 2),
        "forecast_score": round(forecast_score, 2)
    }
