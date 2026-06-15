import uuid
import json
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from fastapi import HTTPException

from database.models import AnalyticsContextExport, ResearchContextRecord
from services.analytics.research_context_builder import build_research_dataset
from services.analytics.audience_enricher import enrich_audience
from services.analytics.competitor_enricher import enrich_competitors


def _build_heuristic_aggregation(topic: str, keywords: List[str], market_data: dict, competitor_data: dict) -> dict:
    audience = enrich_audience(topic, keywords)
    competitor = enrich_competitors(topic, competitor_data)

    opp_score = market_data.get("opportunity_score", 50.0)
    demand_score = market_data.get("demand_score", 50.0)
    forecast_score = market_data.get("forecast_score", 50.0)
    comp_score = market_data.get("competition_score", 50.0)
    comp_count = competitor_data.get("video_count", 0)

    research_notes = [
        f"Detailed keyword and market indicators compiled for '{topic}'.",
        f"The topic holds an Opportunity Index of {opp_score:.0f} and a Forecast trajectory of {forecast_score:.0f}.",
        f"Competitor analysis detected {comp_count} related videos published in observed channels."
    ]

    supporting_facts = [
        f"Search demand is calculated at {demand_score:.1f}.",
        f"Market competition level is {comp_score:.1f}.",
        f"Identified {len(keywords)} signal keywords from trend repository."
    ]

    related_entities = [topic, "YouTube Analytics", "Content Factory"]
    if keywords:
        related_entities.extend(keywords[:3])

    primary_kws = keywords[:2] if len(keywords) >= 2 else (keywords if keywords else [topic])
    secondary_kws = keywords[2:5] if len(keywords) > 2 else []
    related_kws = [f"{topic} guide", f"{topic} tutorial", f"how to use {topic}"]

    related_topics = [f"{topic} automation", f"{topic} tools"]
    adjacent_topics = ["software development", "workflow optimization", "api integration"]
    semantic_clusters = [f"{topic} deployment", f"{topic} templates", f"{topic} code"]

    informational = []
    comparative = []
    transactional = []
    navigational = []

    for kw in keywords:
        kw_l = kw.lower()
        if any(w in kw_l for w in ['how', 'what', 'why', 'guide', 'tutorial', 'learn']):
            informational.append(kw)
        elif any(w in kw_l for w in ['vs', 'versus', 'compare', 'alternative']):
            comparative.append(kw)
        elif any(w in kw_l for w in ['deploy', 'setup', 'config', 'download', 'install', 'build', 'create']):
            transactional.append(kw)
        else:
            navigational.append(kw)

    if not informational:
        informational = [f"how to use {topic}", f"{topic} tutorial for beginners"]
    if not comparative:
        comparative = [f"{topic} vs alternative solutions", f"difference between {topic} and competitors"]
    if not transactional:
        transactional = [f"deploy {topic} in production", f"configure {topic} environment"]
    if not navigational:
        navigational = [f"{topic} official docs", f"{topic} github repository"]

    return {
        "research_context": {
            "research_notes": research_notes,
            "supporting_facts": supporting_facts,
            "related_entities": related_entities
        },
        "audience_context": {
            "audience_level": audience.get("audience_level", "Intermediate"),
            "pain_points": audience.get("pain_points", []),
            "goals": audience.get("goals", []),
            "common_questions": audience.get("common_questions", [])
        },
        "competitor_context": {
            "oversaturated_topics": competitor.get("oversaturated_topics", []),
            "undercovered_topics": competitor.get("undercovered_topics", []),
            "content_gaps": competitor.get("content_gaps", [])
        },
        "keyword_expansion": {
            "primary_keywords": primary_kws,
            "secondary_keywords": secondary_kws,
            "related_keywords": related_kws
        },
        "topic_expansion": {
            "related_topics": related_topics,
            "adjacent_topics": adjacent_topics,
            "semantic_clusters": semantic_clusters
        },
        "market_signals": {
            "demand_score": float(demand_score),
            "competition_score": float(comp_score),
            "forecast_score": float(forecast_score),
            "opportunity_score": float(opp_score)
        },
        "search_intent_context": {
            "informational": informational,
            "comparative": comparative,
            "transactional": transactional,
            "navigational": navigational
        }
    }


def process_research_context(db: Session, export_id: str) -> Dict[str, Any]:
    """
    Processes the Research Context aggregation for the specified Context Export.
    Purely heuristic based, stores structured datasets, and avoids LLM narrative generation.
    """
    export = db.query(AnalyticsContextExport).filter(AnalyticsContextExport.id == export_id).first()
    if not export:
        raise HTTPException(status_code=404, detail="Parent context export not found")

    record_id = str(uuid.uuid4())

    # Create DRAFT record in database
    research_record = ResearchContextRecord(
        id=record_id,
        export_id=export_id,
        source_type=export.source_type,
        source_reference_id=export.source_reference_id,
        workspace_id=export.workspace_id,
        channel_id=None,
        youtube_account_id=export.youtube_account_id,
        topic="Pending...",
        trend_score=0.0,
        keyword_count=0,
        competitor_count=0,
        signal_count=0,
        keywords_json="{}",
        audience_json="{}",
        competitors_json="{}",
        opportunities_json="[]",
        signals_json="{}",
        status="draft",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(research_record)
    db.commit()

    try:
        # 1. Compile Research Context V1
        dataset = build_research_dataset(db, export.source_type, export.source_reference_id)
        topic = dataset.get("topic", "Unknown Topic")
        signals = dataset.get("signals", [])
        keywords = [sig["keyword"] for sig in signals]
        market_data = dataset.get("market_data", {})
        competitor_data = dataset.get("competitor_data", {})
        opportunities_list = dataset.get("opportunities", [])

        # 2. Build heuristic aggregation
        agg_data = _build_heuristic_aggregation(topic, keywords, market_data, competitor_data)

        # 3. Update DB record with structured data
        research_record.topic = topic
        research_record.trend_score = float(market_data.get("trend_score", 0.0))
        research_record.keyword_count = len(keywords)
        research_record.competitor_count = int(competitor_data.get("video_count", 0))
        research_record.signal_count = len(signals)

        research_record.keywords_json = json.dumps(agg_data.get("keyword_expansion", {}))
        research_record.audience_json = json.dumps(agg_data.get("audience_context", {}))
        research_record.competitors_json = json.dumps(agg_data.get("competitor_context", {}))
        research_record.opportunities_json = json.dumps(opportunities_list)
        
        # Merge market signals and search intent under signals_json
        signals_payload = {
            "market_signals": agg_data.get("market_signals", {}),
            "search_intent_context": agg_data.get("search_intent_context", {}),
            "research_context": agg_data.get("research_context", {}),
            "topic_expansion": agg_data.get("topic_expansion", {})
        }
        research_record.signals_json = json.dumps(signals_payload)
        
        research_record.status = "ready"
        research_record.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(research_record)

        # Return structured dataset format
        return {
            "id": research_record.id,
            "export_id": research_record.export_id,
            "source_type": research_record.source_type,
            "source_reference_id": research_record.source_reference_id,
            "workspace_id": research_record.workspace_id,
            "channel_id": research_record.channel_id,
            "youtube_account_id": research_record.youtube_account_id,
            "topic": research_record.topic,
            "trend_score": research_record.trend_score,
            "keyword_count": research_record.keyword_count,
            "competitor_count": research_record.competitor_count,
            "signal_count": research_record.signal_count,
            "keywords": research_record.keywords,
            "audience": research_record.audience,
            "competitors": research_record.competitors,
            "opportunities": research_record.opportunities,
            "signals": research_record.signals,
            "status": research_record.status,
            "created_at": research_record.created_at,
            "updated_at": research_record.updated_at
        }

    except Exception as exc:
        db.rollback()
        failed_record = db.query(ResearchContextRecord).filter(ResearchContextRecord.id == record_id).first()
        if failed_record:
            failed_record.status = "failed"
            db.commit()
        raise HTTPException(status_code=500, detail=f"Research context processing failed: {str(exc)}")
