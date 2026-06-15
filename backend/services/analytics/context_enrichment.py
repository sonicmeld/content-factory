import uuid
import json
import requests
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from fastapi import HTTPException

from database.models import AnalyticsContextExport, AnalyticsEnrichedContext
from app.config import settings
from services.analytics.analytics_context_builder import create_ai_context
from services.analytics.audience_enricher import enrich_audience
from services.analytics.competitor_enricher import enrich_competitors
from services.analytics.context_renderer import render_enriched_context_markdown


def _build_9router_url() -> str:
    """Build the normalised 9Router /v1/chat/completions URL from settings."""
    base = settings.NINE_ROUTER_URL.rstrip("/")
    if not base.endswith("/v1"):
        base = f"{base}/v1"
    return f"{base}/chat/completions"


def _build_heuristic_enrichment(topic: str, keywords: List[str], market_data: dict, competitor_data: dict) -> dict:
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


def enrich_context(db: Session, export_id: str) -> Dict[str, Any]:
    """
    Generates Enriched Context v2.0 using parent Analytics Context v1.0.
    1. Loads the export metadata audit log
    2. Writes a draft Enriched Context record
    3. Runs Heuristics first
    4. Triggers LLM for research assist optionally if configured
    5. Saves full JSON and Markdown output, updating status to ready.
    """
    export = db.query(AnalyticsContextExport).filter(AnalyticsContextExport.id == export_id).first()
    if not export:
        raise HTTPException(status_code=404, detail="Parent context export not found")

    enrichment_id = str(uuid.uuid4())

    # Create DRAFT record in database
    enriched_record = AnalyticsEnrichedContext(
        id=enrichment_id,
        export_id=export_id,
        source_type=export.source_type,
        source_reference_id=export.source_reference_id,
        workspace_id=export.workspace_id,
        channel_id=None,
        topic_name="Pending...",
        context_version="2.0",
        enrichment_version="1.0",
        status="draft",
        generated_by="heuristic",
        source_snapshot_json="{}",
        payload_json="{}",
        markdown_content="",
        generated_at=datetime.utcnow()
    )
    db.add(enriched_record)
    db.commit()

    try:
        # 1. Compile Analytics Context v1.0
        context_v1 = create_ai_context(db, export.source_type, export.source_reference_id)
        topic = context_v1.get("topic", "Unknown Topic")
        signals = context_v1.get("signals", [])
        keywords = [sig["keyword"] for sig in signals]
        market_data = context_v1.get("market_data", {})
        competitor_data = context_v1.get("competitor_data", {})

        # 2. Build snapshot
        snapshot = {
            "topic": topic,
            "signals": signals,
            "market_data": market_data,
            "competitor_data": competitor_data
        }
        source_snapshot_json = json.dumps(snapshot)

        # 3. Build heuristic research context (Heuristics First)
        payload_data = _build_heuristic_enrichment(topic, keywords, market_data, competitor_data)
        generated_by = "heuristic"

        # 4. Optional 9Router Research Assist
        if settings.NINE_ROUTER_URL and settings.NINE_ROUTER_API_KEY:
            try:
                system_prompt = (
                    "You are a master YouTube research assistant. "
                    "Analyze the provided Analytics Context and Heuristic Research, and refine/enrich it. "
                    "You MUST reply ONLY with a valid JSON object matching the exact structure below. Do not put markdown blocks like ```json around it, do not output conversational text.\n\n"
                    "CRITICAL: Do NOT generate creative hooks, content angles, outlines, scripts, or content recommendations.\n\n"
                    "JSON Schema structure:\n"
                    "{\n"
                    "  \"research_context\": {\n"
                    "    \"research_notes\": [\"note 1\", \"note 2\"],\n"
                    "    \"supporting_facts\": [\"fact 1\", \"fact 2\"],\n"
                    "    \"related_entities\": [\"entity 1\", \"entity 2\"]\n"
                    "  },\n"
                    "  \"audience_context\": {\n"
                    "    \"audience_level\": \"Beginner|Intermediate|Advanced\",\n"
                    "    \"pain_points\": [\"pain point 1\", \"pain point 2\"],\n"
                    "    \"goals\": [\"goal 1\", \"goal 2\"],\n"
                    "    \"common_questions\": [\"question 1\", \"question 2\"]\n"
                    "  },\n"
                    "  \"competitor_context\": {\n"
                    "    \"oversaturated_topics\": [\"topic 1\", \"topic 2\"],\n"
                    "    \"undercovered_topics\": [\"topic 1\", \"topic 2\"],\n"
                    "    \"content_gaps\": [\"gap 1\", \"gap 2\"]\n"
                    "  },\n"
                    "  \"keyword_expansion\": {\n"
                    "    \"primary_keywords\": [\"kw 1\", \"kw 2\"],\n"
                    "    \"secondary_keywords\": [\"kw 1\", \"kw 2\"],\n"
                    "    \"related_keywords\": [\"kw 1\", \"kw 2\"]\n"
                    "  },\n"
                    "  \"topic_expansion\": {\n"
                    "    \"related_topics\": [\"topic 1\", \"topic 2\"],\n"
                    "    \"adjacent_topics\": [\"topic 1\", \"topic 2\"],\n"
                    "    \"semantic_clusters\": [\"cluster 1\", \"cluster 2\"]\n"
                    "  },\n"
                    "  \"market_signals\": {\n"
                    "    \"demand_score\": 0.0,\n"
                    "    \"competition_score\": 0.0,\n"
                    "    \"forecast_score\": 0.0,\n"
                    "    \"opportunity_score\": 0.0\n"
                    "  },\n"
                    "  \"search_intent_context\": {\n"
                    "    \"informational\": [\"query 1\", \"query 2\"],\n"
                    "    \"comparative\": [\"query 1\", \"query 2\"],\n"
                    "    \"transactional\": [\"query 1\", \"query 2\"],\n"
                    "    \"navigational\": [\"query 1\", \"query 2\"]\n"
                    "  }\n"
                    "}"
                )

                user_message = (
                    f"Analytics Context:\n{json.dumps(context_v1, indent=2)}\n\n"
                    f"Base Heuristic Research:\n{json.dumps(payload_data, indent=2)}"
                )

                headers = {
                    "Authorization": f"Bearer {settings.NINE_ROUTER_API_KEY}",
                    "Content-Type": "application/json",
                }

                req_payload = {
                    "model": settings.NINE_ROUTER_MODEL or "YT_Research",
                    "stream": False,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message}
                    ]
                }

                from services.runtime_core_service import sanitize_9router_payload
                req_payload, timeout_sec = sanitize_9router_payload(db, req_payload)

                response = requests.post(
                    _build_9router_url(),
                    json=req_payload,
                    headers=headers,
                    timeout=timeout_sec
                )
                response.raise_for_status()

                raw_content = response.json().get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                if raw_content.startswith("```"):
                    raw_content = raw_content.split("\n", 1)[1]
                    if raw_content.endswith("```"):
                        raw_content = raw_content.rsplit("```", 1)[0]
                raw_content = raw_content.strip()

                parsed_json = json.loads(raw_content)

                required_keys = ["research_context", "audience_context", "competitor_context", "keyword_expansion", "topic_expansion", "market_signals", "search_intent_context"]
                if all(k in parsed_json for k in required_keys):
                    generated_by = settings.NINE_ROUTER_MODEL or "9router"
                    payload_data = parsed_json
            except Exception as llm_err:
                print(f"[Enrichment Warning] LLM call failed or produced malformed JSON: {llm_err}. Using Heuristics.")

        # Assemble full Output Schema v2.0
        final_payload = {
            "context_version": "2.0",
            "enrichment_version": "1.0",
            "topic_name": topic,
            "generated_by": generated_by,
            "source_export_id": export_id,
            "source_type": export.source_type,
            "source_reference_id": export.source_reference_id,
            "analytics_context": context_v1,
            "research_context": payload_data.get("research_context"),
            "audience_context": payload_data.get("audience_context"),
            "competitor_context": payload_data.get("competitor_context"),
            "keyword_expansion": payload_data.get("keyword_expansion"),
            "topic_expansion": payload_data.get("topic_expansion"),
            "market_signals": payload_data.get("market_signals"),
            "search_intent_context": payload_data.get("search_intent_context")
        }

        # Render preformatted markdown (Research Report)
        markdown_content = render_enriched_context_markdown(final_payload)
        final_payload["markdown_content"] = markdown_content

        # Update DB record with completed data
        enriched_record.topic_name = topic
        enriched_record.status = "ready"
        enriched_record.generated_by = generated_by
        enriched_record.source_snapshot_json = source_snapshot_json
        enriched_record.payload_json = json.dumps(final_payload)
        enriched_record.markdown_content = markdown_content

        db.commit()
        db.refresh(enriched_record)

        return final_payload

    except Exception as exc:
        db.rollback()
        failed_record = db.query(AnalyticsEnrichedContext).filter(AnalyticsEnrichedContext.id == enrichment_id).first()
        if failed_record:
            failed_record.status = "failed"
            db.commit()
        raise HTTPException(status_code=500, detail=f"Context enrichment failed: {str(exc)}")

