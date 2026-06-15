import os
import sys
import unittest
import json
from datetime import datetime, timezone
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
    ResearchContextRecord
)
from services.analytics.research_context_pipeline import process_research_context

class TestContextEnrichment(unittest.TestCase):
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

        # Seed mock topic
        self.topic = AnalyticsTopic(
            id="topic-1",
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

        # Seed mock keywords
        self.keyword1 = AnalyticsKeyword(
            id="kw-1",
            topic_id="topic-1",
            keyword="autogen",
            trend_score=95.0,
            search_volume=1200.0,
            competition_score=30.0
        )
        self.keyword2 = AnalyticsKeyword(
            id="kw-2",
            topic_id="topic-1",
            keyword="crewai",
            trend_score=90.0,
            search_volume=800.0,
            competition_score=20.0
        )
        self.db.add_all([self.keyword1, self.keyword2])

        # Seed context export
        self.export = AnalyticsContextExport(
            id="export-1",
            source_type="topic",
            source_reference_id="topic-1",
            context_type="topic",
            context_version="1.0",
            status="new",
            workspace_id="ws-abc",
            exported_at=datetime.utcnow()
        )
        self.db.add(self.export)
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

    def test_process_research_context_heuristic_success(self):
        # Trigger enrichment service directly
        payload = process_research_context(self.db, "export-1")

        self.assertEqual(payload["topic"], "AI Agents")

        # Test Lineage metadata exists
        self.assertEqual(payload["export_id"], "export-1")
        self.assertEqual(payload["source_type"], "topic")
        self.assertEqual(payload["source_reference_id"], "topic-1")

        # Test structured content exists
        self.assertEqual(payload["keyword_count"], 2)
        self.assertEqual(payload["signal_count"], 2)
        self.assertIn("autogen", payload["keywords"]["primary_keywords"])
        self.assertIn("goals", payload["audience"])
        self.assertIn("content_gaps", payload["competitors"])

        # Verify DB entry
        record = self.db.query(ResearchContextRecord).filter(ResearchContextRecord.export_id == "export-1").first()
        self.assertIsNotNone(record)
        self.assertEqual(record.status, "ready")
        self.assertEqual(record.topic, "AI Agents")
        self.assertEqual(record.trend_score, 92.5)

    def test_process_research_context_api_endpoints_success(self):
        # 1. Trigger enrichment endpoint
        resp = self.client.post("/api/analytics/context/enrich", json={"export_id": "export-1"})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["topic"], "AI Agents")

        # Check DB
        record = self.db.query(ResearchContextRecord).first()
        self.assertIsNotNone(record)
        enrichment_id = record.id

        # 2. Get enriched payload endpoint
        resp_get = self.client.get(f"/api/analytics/context/enriched/{enrichment_id}")
        self.assertEqual(resp_get.status_code, 200)
        get_data = resp_get.json()
        self.assertEqual(get_data["topic"], "AI Agents")

        # 3. List history endpoint
        resp_list = self.client.get("/api/analytics/context/enriched?workspace_id=ws-abc")
        self.assertEqual(resp_list.status_code, 200)
        history = resp_list.json()
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0]["id"], enrichment_id)
        self.assertEqual(history[0]["status"], "ready")


