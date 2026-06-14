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
from services.analytics.angle_generator import generate_angles
from services.analytics.hook_generator import generate_hooks
from services.analytics.outline_generator import generate_outlines
from services.analytics.context_renderer import render_enriched_context_markdown



def _build_9router_url() -> str:
    """Build the normalised 9Router /v1/chat/completions URL from settings."""
    base = settings.NINE_ROUTER_URL.rstrip("/")
    if not base.endswith("/v1"):
        base = f"{base}/v1"
    return f"{base}/chat/completions"


def enrich_context(db: Session, export_id: str) -> Dict[str, Any]:
    """
    Generates Enriched Context v2.0 using parent Analytics Context v1.0.
    1. Loads the export metadata audit log
    2. Writes a draft Enriched Context record
    3. Triggers LLM or modular Heuristic components
    4. Renders output as markdown
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
        channel_id=None, # Loaded or derived if available
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
        insights = context_v1.get("insights", [])

        # 2. Build lightweight source snapshot
        snapshot = {
            "topic": topic,
            "signals": signals,
            "market_data": market_data,
            "competitor_data": competitor_data
        }
        source_snapshot_json = json.dumps(snapshot)

        # 3. Enrichment Process
        generated_by = "heuristic"
        payload_data = None

        if settings.NINE_ROUTER_URL and settings.NINE_ROUTER_API_KEY:
            # Let's attempt LLM compilation
            try:
                system_prompt = (
                    "You are a master YouTube content strategist and keyword researcher. "
                    "Analyze the provided Analytics Context (including keywords and metrics) and enrich it with structured planning. "
                    "You MUST reply ONLY with a valid JSON object matching the exact structure below. Do not put markdown blocks like ```json around it, do not output conversational text.\n\n"
                    "JSON Schema structure:\n"
                    "{\n"
                    "  \"research_notes\": \"Detailed research and fact-finding notes regarding target topics...\",\n"
                    "  \"research_sources\": [\"Google Trends\", \"YouTube Suggestions\", \"Competitor Coverage\", \"Analytics Insights\"],\n"
                    "  \"audience_context\": {\n"
                    "    \"audience_level\": \"Beginner|Intermediate|Advanced\",\n"
                    "    \"pain_points\": [\"pain point 1\", \"pain point 2\"],\n"
                    "    \"goals\": [\"goal 1\", \"goal 2\"],\n"
                    "    \"common_questions\": [\"question 1\", \"question 2\"]\n"
                    "  },\n"
                    "  \"competitor_context\": {\n"
                    "    \"oversaturated_topics\": [\"oversaturated 1\", \"oversaturated 2\"],\n"
                    "    \"undercovered_topics\": [\"undercovered 1\", \"undercovered 2\"],\n"
                    "    \"content_gaps\": [\"gap 1\", \"gap 2\"]\n"
                    "  },\n"
                    "  \"angle_candidates\": [\"Angle 1\", \"Angle 2\", \"Angle 3\", \"Angle 4\", \"Angle 5\"],\n"
                    "  \"hook_candidates\": [\"Hook 1\", \"Hook 2\", \"Hook 3\", \"Hook 4\"],\n"
                    "  \"outline_candidates\": [\n"
                    "    {\"segment\": \"Segment Name\", \"duration\": \"0:00 - 1:00\", \"description\": \"details\"}\n"
                    "  ],\n"
                    "  \"recommendations\": {\n"
                    "    \"best_angle\": \"recommended angle from angles\",\n"
                    "    \"best_hook\": \"recommended hook from hooks\",\n"
                    "    \"recommended_video_length\": \"e.g., 10-15 minutes\",\n"
                    "    \"recommended_audience\": \"e.g., Intermediate developers\",\n"
                    "    \"confidence_score\": 85\n"
                    "  }\n"
                    "}"
                )

                user_message = f"Analytics Context:\n{json.dumps(context_v1, indent=2)}"
                
                headers = {
                    "Authorization": f"Bearer {settings.NINE_ROUTER_API_KEY}",
                    "Content-Type": "application/json",
                }
                
                payload = {
                    "model": settings.NINE_ROUTER_MODEL or "YT_Research",
                    "stream": False,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message}
                    ]
                }
                
                from services.runtime_core_service import sanitize_9router_payload
                payload, timeout_sec = sanitize_9router_payload(db, payload)

                response = requests.post(
                    _build_9router_url(),
                    json=payload,
                    headers=headers,
                    timeout=timeout_sec
                )
                response.raise_for_status()
                
                raw_content = response.json().get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                # Clean up any potential markdown wraps
                if raw_content.startswith("```"):
                    raw_content = raw_content.split("\n", 1)[1]
                    if raw_content.endswith("```"):
                        raw_content = raw_content.rsplit("```", 1)[0]
                raw_content = raw_content.strip()

                parsed_json = json.loads(raw_content)
                
                # Check for mandatory keys to validate the LLM structure
                required_keys = ["research_notes", "audience_context", "competitor_context", "angle_candidates", "hook_candidates", "outline_candidates", "recommendations"]
                if all(k in parsed_json for k in required_keys):
                    generated_by = settings.NINE_ROUTER_MODEL or "9router"
                    payload_data = parsed_json
            except Exception as llm_err:
                print(f"[Enrichment Warning] LLM call failed or produced malformed JSON: {llm_err}. Falling back to Heuristics.")
                
        # 4. Heuristic fallbacks if LLM fails or is unconfigured
        if not payload_data:
            audience = enrich_audience(topic, keywords)
            competitor = enrich_competitors(topic, competitor_data)
            angles = generate_angles(topic, keywords)
            hooks = generate_hooks(topic, keywords)
            outlines = generate_outlines(topic, keywords)
            
            # Simple rules for recommendations
            best_angle = angles[2] if len(angles) > 2 else angles[0]
            best_hook = hooks[0] if hooks else "Modern hook"
            
            recommendations = {
                "best_angle": best_angle,
                "best_hook": best_hook,
                "recommended_video_length": "10-15 minutes",
                "recommended_audience": f"{audience['audience_level']} Developers",
                "confidence_score": 85
            }
            
            opp_score = market_data.get("opportunity_score", 50.0)
            forecast_score = market_data.get("forecast_score", 50.0)
            comp_count = competitor_data.get("video_count", 0)
            
            research_notes = (
                f"Detailed keyword and market indicators for '{topic}'. "
                f"The topic holds an Opportunity Index of {opp_score:.0f} and a Forecast trajectory of {forecast_score:.0f}. "
                f"Competitor analysis detected {comp_count} related videos published in observed channels. "
                f"Key keywords to target include: {', '.join(keywords[:5])}."
            )
            
            payload_data = {
                "research_notes": research_notes,
                "research_sources": ["Google Trends", "YouTube Suggestions", "Competitor Coverage", "Analytics Insights"],
                "audience_context": audience,
                "competitor_context": competitor,
                "angle_candidates": angles,
                "hook_candidates": hooks,
                "outline_candidates": outlines,
                "recommendations": recommendations
            }
            generated_by = "heuristic"

        # Assemble full Output Schema v2.0
        final_payload = {
            "context_version": "2.0",
            "enrichment_version": "1.0",
            "topic_name": topic,
            "generated_by": generated_by,
            "analytics_context": context_v1,
            "research_context": {
                "research_notes": payload_data.get("research_notes"),
                "research_sources": payload_data.get("research_sources", ["Google Trends", "YouTube Suggestions"])
            },
            "audience_context": payload_data.get("audience_context"),
            "competitor_context": payload_data.get("competitor_context"),
            "angle_candidates": payload_data.get("angle_candidates"),
            "hook_candidates": payload_data.get("hook_candidates"),
            "outline_candidates": payload_data.get("outline_candidates"),
            "recommendations": payload_data.get("recommendations")
        }

        # Render preformatted markdown
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
        # Set status to failed on database
        failed_record = db.query(AnalyticsEnrichedContext).filter(AnalyticsEnrichedContext.id == enrichment_id).first()
        if failed_record:
            failed_record.status = "failed"
            db.commit()
        raise HTTPException(status_code=500, detail=f"Context enrichment failed: {str(exc)}")
