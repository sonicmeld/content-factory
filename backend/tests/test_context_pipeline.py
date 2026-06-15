import os
import sys
import unittest
import json
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from database.database import get_db
from database.models import (
    Base,
    AnalyticsTopic,
    AnalyticsKeyword,
    AnalyticsContextExport,
    ResearchContextRecord,
    AnalyticsGeneratedDraft
)
from services.analytics.draft_generation import generate_draft
from app.config import settings

class TestContextPipeline(unittest.TestCase):
    def setUp(self):
        # Create an in-memory SQLite database
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool
        )
        self.SessionLocal = sessionmaker(bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        self.db = self.SessionLocal()

        # Seed mock data
        self.topic = AnalyticsTopic(
            id="topic-pipeline-1",
            topic_name="AI Agents",
            topic_slug="ai-agents",
            fingerprint="aiagents",
            status="active",
            trend_score=92.5,
            demand_score=88.0,
            competition_score=24.0,
            forecast_score=91.0,
            opportunity_score=95.0
        )
        self.db.add(self.topic)

        self.keyword1 = AnalyticsKeyword(
            id="kw-pipeline-1",
            topic_id="topic-pipeline-1",
            keyword="autogen",
            trend_score=95.0,
            search_volume=1200.0,
            competition_score=30.0
        )
        self.db.add(self.keyword1)

        self.export = AnalyticsContextExport(
            id="export-pipeline-1",
            source_type="topic",
            source_reference_id="topic-pipeline-1",
            context_type="topic",
            context_version="1.0",
            status="new",
            workspace_id="ws-pipeline",
            exported_at=datetime.utcnow()
        )
        self.db.add(self.export)

        # Mock enrichment payload
        mock_payload = {
            "research_context": {
                "research_notes": ["Note 1"],
                "supporting_facts": ["Fact 1"],
                "related_entities": ["AI Agents"]
            },
            "audience_context": {
                "audience_level": "Intermediate",
                "pain_points": ["lack of automation", "complex APIs"],
                "goals": ["build agents quickly"],
                "common_questions": ["How to automate?"]
            },
            "competitor_context": {
                "content_gaps": ["lack of production examples"],
                "oversaturated_topics": ["basic hello world agents"],
                "undercovered_topics": ["advanced agents"]
            },
            "keyword_expansion": {
                "primary_keywords": ["autogen"],
                "secondary_keywords": [],
                "related_keywords": ["how to use autogen"]
            },
            "topic_expansion": {
                "related_topics": ["AI automation"],
                "adjacent_topics": ["software development"],
                "semantic_clusters": ["AI deployment"]
            },
            "market_signals": {
                "demand_score": 88.0,
                "competition_score": 24.0,
                "forecast_score": 91.0,
                "opportunity_score": 95.0
            },
            "search_intent_context": {
                "informational": ["how to use autogen"],
                "comparative": ["autogen vs crewai"],
                "transactional": ["deploy autogen"],
                "navigational": ["autogen official docs"]
            }
        }

        self.enriched = ResearchContextRecord(
            id="enriched-pipeline-1",
            export_id="export-pipeline-1",
            source_type="topic",
            source_reference_id="topic-pipeline-1",
            workspace_id="ws-pipeline",
            channel_id="chan-pipeline",
            topic="AI Agents",
            trend_score=92.5,
            keyword_count=2,
            competitor_count=0,
            signal_count=2,
            keywords_json=json.dumps(mock_payload["keyword_expansion"]),
            audience_json=json.dumps(mock_payload["audience_context"]),
            competitors_json=json.dumps(mock_payload["competitor_context"]),
            opportunities_json=json.dumps([]),
            signals_json=json.dumps({
                "market_signals": mock_payload["market_signals"],
                "search_intent_context": mock_payload["search_intent_context"],
                "research_context": mock_payload["research_context"],
                "topic_expansion": mock_payload["topic_expansion"]
            }),
            status="ready",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        self.db.add(self.enriched)
        self.db.commit()

        # Override dependency
        def override_get_db():
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()
        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def test_draft_generation_heuristics(self):
        # Trigger draft generation via service directly (LLM settings disabled by default in test env)
        with patch.object(settings, "NINE_ROUTER_URL", ""), patch.object(settings, "NINE_ROUTER_API_KEY", ""):
            res = generate_draft(self.db, "enriched-pipeline-1")
            
            self.assertEqual(res["draft_type"], "youtube_longform")
            self.assertEqual(res["status"], "draft")
            self.assertEqual(res["generated_by"], "heuristic")
            self.assertEqual(res["source_export_id"], "export-pipeline-1")
            self.assertEqual(res["source_enriched_context_id"], "enriched-pipeline-1")
            self.assertIn("# Fallback YouTube Long-form Script: AI Agents", res["content_markdown"])
            self.assertIn("Tutorial Angle", res["content_markdown"])
            self.assertIn("lack of production examples", res["content_markdown"])

    @patch("services.analytics.draft_generation.requests.post")
    def test_draft_generation_llm_success(self, mock_post):
        # Mock LLM API response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": "# Custom LLM YouTube Script\nThis is a custom script from LLM."
                    }
                }
            ]
        }
        mock_post.return_value = mock_response

        # Override settings for LLM execution
        with patch.object(settings, "NINE_ROUTER_URL", "http://nine-router.example.com"), \
             patch.object(settings, "NINE_ROUTER_API_KEY", "test-api-key"), \
             patch.object(settings, "NINE_ROUTER_MODEL", "Test-Model"):
            
            res = generate_draft(self.db, "enriched-pipeline-1")
            
            self.assertEqual(res["draft_type"], "youtube_longform")
            self.assertEqual(res["status"], "draft")
            self.assertEqual(res["generated_by"], "Test-Model")
            self.assertEqual(res["source_export_id"], "export-pipeline-1")
            self.assertEqual(res["source_enriched_context_id"], "enriched-pipeline-1")
            self.assertIn("# Custom LLM YouTube Script", res["content_markdown"])

    def test_draft_generation_not_found(self):
        # Test generation with non-existent enriched context
        with self.assertRaises(Exception) as ctx:
            generate_draft(self.db, "enriched-non-existent")
        self.assertIn("Research context record not found", str(ctx.exception))

    def test_draft_generation_not_ready(self):
        # Create non-ready enriched context
        not_ready_enriched = ResearchContextRecord(
            id="enriched-pipeline-failed",
            export_id="export-pipeline-1",
            source_type="topic",
            source_reference_id="topic-pipeline-1",
            workspace_id="ws-pipeline",
            status="failed",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        self.db.add(not_ready_enriched)
        self.db.commit()

        with self.assertRaises(Exception) as ctx:
            generate_draft(self.db, "enriched-pipeline-failed")
        self.assertIn("Research context record not found or not in 'ready' status", str(ctx.exception))

    def test_api_generate_draft_endpoint(self):
        # Trigger draft generation via REST API
        with patch.object(settings, "NINE_ROUTER_URL", ""), patch.object(settings, "NINE_ROUTER_API_KEY", ""):
            resp = self.client.post(
                "/api/analytics/context-pipeline/drafts/generate",
                json={"enriched_context_id": "enriched-pipeline-1"}
            )
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertEqual(data["status"], "draft")
            self.assertEqual(data["source_enriched_context_id"], "enriched-pipeline-1")

    def test_draft_status_transition_rules(self):
        # Seed draft
        draft = AnalyticsGeneratedDraft(
            id="draft-test-1",
            source_export_id="export-pipeline-1",
            source_enriched_context_id="enriched-pipeline-1",
            workspace_id="ws-pipeline",
            title="Draft AI Agents",
            draft_type="youtube_longform",
            content_markdown="Some script",
            status="draft",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        self.db.add(draft)
        self.db.commit()

        # Helper path status updater
        def update_status(draft_id: str, new_status: str):
            return self.client.patch(
                f"/api/analytics/context-pipeline/drafts/{draft_id}/status",
                json={"status": new_status}
            )

        # 1. draft -> reviewed (Valid)
        resp = update_status("draft-test-1", "reviewed")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "reviewed")

        # 2. reviewed -> draft (Invalid)
        resp = update_status("draft-test-1", "draft")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Invalid draft transition", resp.json()["detail"])

        # 3. reviewed -> approved (Valid)
        resp = update_status("draft-test-1", "approved")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "approved")

        # 4. approved -> loaded_to_prompt (Valid)
        resp = update_status("draft-test-1", "loaded_to_prompt")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "loaded_to_prompt")

        # 5. loaded_to_prompt -> archived (Valid)
        resp = update_status("draft-test-1", "archived")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "archived")

        # 6. archived -> approved (Invalid)
        resp = update_status("draft-test-1", "approved")
        self.assertEqual(resp.status_code, 400)

        # 7. Test identity transition (same state to same state)
        # Reset draft to draft first
        self.db.query(AnalyticsGeneratedDraft).filter_by(id="draft-test-1").update({"status": "draft"})
        self.db.commit()
        resp = update_status("draft-test-1", "draft")
        self.assertEqual(resp.status_code, 200)

    def test_bulk_operations(self):
        # Create multiple exports, enriched, drafts
        exp1 = AnalyticsContextExport(id="bulk-exp-1", source_type="topic", source_reference_id="topic-1", context_type="topic", status="new", workspace_id="ws-pipeline", exported_at=datetime.utcnow())
        exp2 = AnalyticsContextExport(id="bulk-exp-2", source_type="topic", source_reference_id="topic-1", context_type="topic", status="new", workspace_id="ws-pipeline", exported_at=datetime.utcnow())
        
        enr1 = ResearchContextRecord(id="bulk-enr-1", export_id="bulk-exp-1", source_type="topic", source_reference_id="topic-1", status="ready", created_at=datetime.utcnow(), updated_at=datetime.utcnow())
        enr2 = ResearchContextRecord(id="bulk-enr-2", export_id="bulk-exp-2", source_type="topic", source_reference_id="topic-1", status="ready", created_at=datetime.utcnow(), updated_at=datetime.utcnow())
        
        dr1 = AnalyticsGeneratedDraft(id="bulk-dr-1", source_export_id="bulk-exp-1", source_enriched_context_id="bulk-enr-1", content_markdown="", status="draft", created_at=datetime.utcnow(), updated_at=datetime.utcnow())
        dr2 = AnalyticsGeneratedDraft(id="bulk-dr-2", source_export_id="bulk-exp-2", source_enriched_context_id="bulk-enr-2", content_markdown="", status="draft", created_at=datetime.utcnow(), updated_at=datetime.utcnow())
        
        self.db.add_all([exp1, exp2, enr1, enr2, dr1, dr2])
        self.db.commit()

        # 1. Bulk Archive
        resp = self.client.post("/api/analytics/context-pipeline/bulk/archive", json={"ids": ["bulk-exp-1", "bulk-exp-2"], "stage": "inbox"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(self.db.query(AnalyticsContextExport).filter(AnalyticsContextExport.id == "bulk-exp-1").first().status, "archived")

        resp = self.client.post("/api/analytics/context-pipeline/bulk/archive", json={"ids": ["bulk-enr-1"], "stage": "enriched"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(self.db.query(ResearchContextRecord).filter(ResearchContextRecord.id == "bulk-enr-1").first().status, "archived")

        resp = self.client.post("/api/analytics/context-pipeline/bulk/archive", json={"ids": ["bulk-dr-1"], "stage": "drafts"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(self.db.query(AnalyticsGeneratedDraft).filter(AnalyticsGeneratedDraft.id == "bulk-dr-1").first().status, "archived")

        # 2. Bulk Delete
        # Inbox: Physical delete
        resp = self.client.post("/api/analytics/context-pipeline/bulk/delete", json={"ids": ["bulk-exp-2"], "stage": "inbox"})
        self.assertEqual(resp.status_code, 200)
        self.assertIsNone(self.db.query(AnalyticsContextExport).filter(AnalyticsContextExport.id == "bulk-exp-2").first())

        # Enriched/Drafts: Soft delete
        resp = self.client.post("/api/analytics/context-pipeline/bulk/delete", json={"ids": ["bulk-enr-2"], "stage": "enriched"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(self.db.query(ResearchContextRecord).filter(ResearchContextRecord.id == "bulk-enr-2").first().status, "deleted")

        resp = self.client.post("/api/analytics/context-pipeline/bulk/delete", json={"ids": ["bulk-dr-2"], "stage": "drafts"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(self.db.query(AnalyticsGeneratedDraft).filter(AnalyticsGeneratedDraft.id == "bulk-dr-2").first().status, "deleted")

        # 3. Bulk Purge (Physical delete for all stages)
        resp = self.client.post("/api/analytics/context-pipeline/bulk/purge", json={"ids": ["bulk-enr-1", "bulk-enr-2"], "stage": "enriched"})
        self.assertEqual(resp.status_code, 200)
        self.assertIsNone(self.db.query(ResearchContextRecord).filter(ResearchContextRecord.id == "bulk-enr-1").first())
        self.assertIsNone(self.db.query(ResearchContextRecord).filter(ResearchContextRecord.id == "bulk-enr-2").first())

        resp = self.client.post("/api/analytics/context-pipeline/bulk/purge", json={"ids": ["bulk-dr-1", "bulk-dr-2"], "stage": "drafts"})
        self.assertEqual(resp.status_code, 200)
        self.assertIsNone(self.db.query(AnalyticsGeneratedDraft).filter(AnalyticsGeneratedDraft.id == "bulk-dr-1").first())
        self.assertIsNone(self.db.query(AnalyticsGeneratedDraft).filter(AnalyticsGeneratedDraft.id == "bulk-dr-2").first())

    def test_retention_purges(self):
        # Seed draft older than 30 days
        old_time = datetime.utcnow() - timedelta(days=31)
        old_draft = AnalyticsGeneratedDraft(
            id="draft-old-31",
            source_export_id="export-pipeline-1",
            source_enriched_context_id="enriched-pipeline-1",
            workspace_id="ws-pipeline",
            content_markdown="script",
            status="draft",
            created_at=old_time,
            updated_at=old_time
        )
        archived_draft = AnalyticsGeneratedDraft(
            id="draft-archived-purged",
            source_export_id="export-pipeline-1",
            source_enriched_context_id="enriched-pipeline-1",
            workspace_id="ws-pipeline",
            content_markdown="script",
            status="archived",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        deleted_draft = AnalyticsGeneratedDraft(
            id="draft-deleted-purged",
            source_export_id="export-pipeline-1",
            source_enriched_context_id="enriched-pipeline-1",
            workspace_id="ws-pipeline",
            content_markdown="script",
            status="deleted",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        self.db.add_all([old_draft, archived_draft, deleted_draft])
        self.db.commit()

        # 1. Purge old drafts (> 30 days)
        resp = self.client.post("/api/analytics/context-pipeline/drafts/purge-old")
        self.assertEqual(resp.status_code, 200)
        self.assertIsNone(self.db.query(AnalyticsGeneratedDraft).filter(AnalyticsGeneratedDraft.id == "draft-old-31").first())
        self.assertIsNotNone(self.db.query(AnalyticsGeneratedDraft).filter(AnalyticsGeneratedDraft.id == "draft-archived-purged").first())

        # 2. Purge archived/deleted drafts
        resp = self.client.post("/api/analytics/context-pipeline/drafts/purge-archived")
        self.assertEqual(resp.status_code, 200)
        self.assertIsNone(self.db.query(AnalyticsGeneratedDraft).filter(AnalyticsGeneratedDraft.id == "draft-archived-purged").first())
        self.assertIsNone(self.db.query(AnalyticsGeneratedDraft).filter(AnalyticsGeneratedDraft.id == "draft-deleted-purged").first())

    def test_stats_and_timeline(self):
        # Seed various records with known states
        self.export.status = "new"
        self.enriched.status = "ready"
        
        draft_ok = AnalyticsGeneratedDraft(
            id="draft-stats-ok",
            source_export_id="export-pipeline-1",
            source_enriched_context_id="enriched-pipeline-1",
            workspace_id="ws-pipeline",
            title="Ok Draft",
            draft_type="youtube_longform",
            content_markdown="script",
            status="loaded_to_prompt",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        self.db.add(draft_ok)
        self.db.commit()

        resp = self.client.get("/api/analytics/context-pipeline/stats?workspace_id=ws-pipeline")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        # Check KPIs
        self.assertEqual(data["new_contexts"], 1)
        self.assertEqual(data["ready_enrichments"], 1)
        self.assertEqual(data["loaded_to_prompt_count"], 1)
        self.assertEqual(data["total_contexts"], 1) # status != 'archived'
        self.assertEqual(data["total_enrichments"], 1) # status != 'deleted'
        self.assertEqual(data["total_drafts"], 1) # status != 'deleted'

        # Check timeline log contains elements
        timeline = data["timeline"]
        self.assertGreater(len(timeline), 0)
        # Check event structure
        first_event = timeline[0]
        self.assertIn("event_type", first_event)
        self.assertIn("title", first_event)
        self.assertIn("timestamp", first_event)

    def test_api_rest_endpoints(self):
        # 1. GET /context-pipeline/inbox
        resp = self.client.get("/api/analytics/context-pipeline/inbox?workspace_id=ws-pipeline")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 1)
        self.assertEqual(resp.json()[0]["id"], "export-pipeline-1")

        # 2. GET /context-pipeline/enriched
        resp = self.client.get("/api/analytics/context-pipeline/enriched?workspace_id=ws-pipeline")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 1)
        self.assertEqual(resp.json()[0]["id"], "enriched-pipeline-1")

        # 3. GET /context-pipeline/enriched/{id}
        resp = self.client.get("/api/analytics/context-pipeline/enriched/enriched-pipeline-1")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["topic"], "AI Agents")

        # 4. GET /context-pipeline/drafts (empty initially)
        resp = self.client.get("/api/analytics/context-pipeline/drafts?workspace_id=ws-pipeline")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 0)
