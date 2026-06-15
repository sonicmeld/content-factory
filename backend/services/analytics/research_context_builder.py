import uuid
import json
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import HTTPException
from sqlalchemy.orm import Session
from database.models import (
    AnalyticsTopic,
    AnalyticsKeyword,
    AnalyticsInsight,
    AnalyticsContextExport
)
from services.analytics.competitor_topic_analysis import analyze_competitor_coverage

def export_topic_context(db: Session, topic_id: str, workspace_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Exports a Topic Context from Topic Radar.
    """
    topic = db.query(AnalyticsTopic).filter(AnalyticsTopic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    payload = {
        "source_type": "topic",
        "topic": topic.topic_name,
        "market_score": float(topic.trend_score),
        "forecast_score": float(topic.forecast_score),
        "competition_score": float(topic.competition_score),
        "opportunity_score": float(topic.opportunity_score)
    }

    # Record audit trail
    export_record = AnalyticsContextExport(
        id=str(uuid.uuid4()),
        source_type="topic",
        source_reference_id=topic_id,
        context_type="topic",
        context_version="1.0",
        status="new",
        workspace_id=workspace_id,
        exported_at=datetime.utcnow()
    )
    db.add(export_record)
    db.commit()

    return payload


def export_opportunity_context(db: Session, topic_id: str, workspace_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Exports an Opportunity Context from the Opportunity Board.
    """
    topic = db.query(AnalyticsTopic).filter(AnalyticsTopic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Opportunity topic not found")

    payload = {
        "source_type": "opportunity",
        "topic": topic.topic_name,
        "opportunity_score": float(topic.opportunity_score),
        "market_demand": float(topic.demand_score),
        "forecast": float(topic.forecast_score),
        "competition": float(topic.competition_score)
    }

    # Record audit trail
    export_record = AnalyticsContextExport(
        id=str(uuid.uuid4()),
        source_type="opportunity",
        source_reference_id=topic_id,
        context_type="opportunity",
        context_version="1.0",
        status="new",
        workspace_id=workspace_id,
        exported_at=datetime.utcnow()
    )
    db.add(export_record)
    db.commit()

    return payload


def export_insight_context(db: Session, insight_id: str, workspace_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Exports an Insight Context from the Insight Engine.
    """
    insight = db.query(AnalyticsInsight).filter(AnalyticsInsight.id == insight_id).first()
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")

    payload = {
        "source_type": "insight",
        "insight_type": insight.insight_type,
        "severity": insight.severity,
        "finding": insight.title,
        "recommendation": insight.description
    }

    # Record audit trail
    export_record = AnalyticsContextExport(
        id=str(uuid.uuid4()),
        source_type="insight",
        source_reference_id=insight_id,
        context_type="insight",
        context_version="1.0",
        status="new",
        workspace_id=workspace_id,
        exported_at=datetime.utcnow()
    )
    db.add(export_record)
    db.commit()

    return payload


def build_research_dataset(db: Session, source_type: str, source_reference_id: str) -> Dict[str, Any]:
    """
    Aggregates all relevant topics, keywords, competitor data, and insights into a unified
    structure of context_type 'aggregated', version '1.0'.
    """
    topic_name = ""
    topic_obj = None
    insight_obj = None
    aggregated_sources = []

    if source_type in ("topic", "opportunity"):
        topic_obj = db.query(AnalyticsTopic).filter(AnalyticsTopic.id == source_reference_id).first()
        if topic_obj:
            topic_name = topic_obj.topic_name
            aggregated_sources.append({"type": source_type, "id": topic_obj.id})
    elif source_type == "insight":
        insight_obj = db.query(AnalyticsInsight).filter(AnalyticsInsight.id == source_reference_id).first()
        if insight_obj:
            aggregated_sources.append({"type": "insight", "id": insight_obj.id})
            # Try to identify a matching topic by scanning topic names inside the insight text
            topics = db.query(AnalyticsTopic).filter(AnalyticsTopic.status != "archived").all()
            for t in topics:
                if t.topic_name.lower() in insight_obj.title.lower() or t.topic_name.lower() in insight_obj.description.lower():
                    topic_obj = t
                    topic_name = t.topic_name
                    aggregated_sources.append({"type": "topic", "id": t.id})
                    break
            if not topic_obj and insight_obj.title:
                # Fallback to the insight title itself if no topic matches
                topic_name = insight_obj.title.split(":")[0].strip()

    # Dynamic Aggregation
    signals = []
    market_data = {}
    competitor_data = {}
    opportunities = []
    insights = []

    if topic_obj:
        # 1. Signals (Keywords)
        keywords = db.query(AnalyticsKeyword).filter(AnalyticsKeyword.topic_id == topic_obj.id).all()
        signals = [
            {
                "keyword": kw.keyword,
                "trend_score": float(kw.trend_score),
                "competition_score": float(kw.competition_score)
            } for kw in keywords
        ]

        # 2. Market Data
        market_data = {
            "trend_score": float(topic_obj.trend_score),
            "demand_score": float(topic_obj.demand_score),
            "competition_score": float(topic_obj.competition_score),
            "forecast_score": float(topic_obj.forecast_score),
            "opportunity_score": float(topic_obj.opportunity_score)
        }

        # 3. Competitor Data
        try:
            comp_res = analyze_competitor_coverage(db)
            video_count = comp_res.get("raw_counts", {}).get(topic_obj.id, 0)
        except Exception:
            video_count = 0
        competitor_data = {
            "competition_score": float(topic_obj.competition_score),
            "video_count": int(video_count)
        }

        # 4. Opportunities list (if emerging or active)
        if topic_obj.status in ("active", "emerging"):
            opportunities.append({
                "topic": topic_obj.topic_name,
                "opportunity_score": float(topic_obj.opportunity_score),
                "market_demand": float(topic_obj.demand_score),
                "forecast": float(topic_obj.forecast_score),
                "competition": float(topic_obj.competition_score)
            })

        # 5. Related Insights
        db_insights = db.query(AnalyticsInsight).filter(
            AnalyticsInsight.status == "active",
            (AnalyticsInsight.title.ilike(f"%{topic_obj.topic_name}%")) |
            (AnalyticsInsight.description.ilike(f"%{topic_obj.topic_name}%"))
        ).all()
        insights = [
            {
                "insight_type": ins.insight_type,
                "severity": ins.severity,
                "finding": ins.title,
                "recommendation": ins.description
            } for ins in db_insights
        ]

    # Include triggering insight if it was not already added
    if insight_obj:
        insight_info = {
            "insight_type": insight_obj.insight_type,
            "severity": insight_obj.severity,
            "finding": insight_obj.title,
            "recommendation": insight_obj.description
        }
        if insight_info not in insights:
            insights.append(insight_info)

    return {
        "context_type": "aggregated",
        "context_version": "1.0",
        "topic": topic_name or topic_obj.topic_name if topic_obj else (insight_obj.title if insight_obj else "Unknown"),
        "market_data": market_data,
        "competitor_data": competitor_data,
        "signals": signals,
        "opportunities": opportunities,
        "insights": insights,
        "aggregated_sources": aggregated_sources
    }
