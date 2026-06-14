import os
import sys
import unittest
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.models import (
    Base,
    AnalyticsTopic,
    AnalyticsKeyword,
    AnalyticsInsight,
    AnalyticsContextExport
)
from services.analytics.analytics_context_builder import (
    export_topic_context,
    export_opportunity_context,
    export_insight_context,
    create_ai_context
)

class TestAnalyticsContextBuilder(unittest.TestCase):
    def setUp(self):
        # Create an in-memory SQLite database
        self.engine = create_engine("sqlite:///:memory:")
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

        # Seed mock insight
        self.insight = AnalyticsInsight(
            id="insight-1",
            channel_id="channel-1",
            insight_source="growth_engine",
            insight_type="competitor_outperforming",
            severity="High",
            status="active",
            entity_type="channel",
            entity_id="channel-2",
            engine_version="1.0",
            fingerprint="competitor_outperforming_fingerprint",
            title="Competitor Outperforming: AI Agents",
            description="Competitor channels are publishing 3x more AI Agents videos.",
            score=85
        )
        self.db.add(self.insight)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def test_export_topic_context_success(self):
        payload = export_topic_context(self.db, "topic-1", workspace_id="ws-123")
        
        self.assertEqual(payload["source_type"], "topic")
        self.assertEqual(payload["topic"], "AI Agents")
        self.assertEqual(payload["market_score"], 92.5)
        self.assertEqual(payload["opportunity_score"], 95.0)

        # Check export record
        export = self.db.query(AnalyticsContextExport).first()
        self.assertIsNotNone(export)
        self.assertEqual(export.source_type, "topic")
        self.assertEqual(export.source_reference_id, "topic-1")
        self.assertEqual(export.context_type, "topic")
        self.assertEqual(export.status, "new")
        self.assertEqual(export.workspace_id, "ws-123")

    def test_export_opportunity_context_success(self):
        payload = export_opportunity_context(self.db, "topic-1")
        
        self.assertEqual(payload["source_type"], "opportunity")
        self.assertEqual(payload["topic"], "AI Agents")
        self.assertEqual(payload["opportunity_score"], 95.0)
        self.assertEqual(payload["market_demand"], 88.0)

        # Check export record
        export = self.db.query(AnalyticsContextExport).first()
        self.assertIsNotNone(export)
        self.assertEqual(export.source_type, "opportunity")
        self.assertEqual(export.status, "new")
        self.assertIsNone(export.workspace_id)

    def test_export_insight_context_success(self):
        payload = export_insight_context(self.db, "insight-1", workspace_id="ws-456")
        
        self.assertEqual(payload["source_type"], "insight")
        self.assertEqual(payload["insight_type"], "competitor_outperforming")
        self.assertEqual(payload["severity"], "High")

        # Check export record
        export = self.db.query(AnalyticsContextExport).first()
        self.assertIsNotNone(export)
        self.assertEqual(export.source_type, "insight")
        self.assertEqual(export.source_reference_id, "insight-1")
        self.assertEqual(export.status, "new")
        self.assertEqual(export.workspace_id, "ws-456")

    def test_create_ai_context_aggregated_success(self):
        # We test topic aggregation
        agg_context = create_ai_context(self.db, "topic", "topic-1")
        
        self.assertEqual(agg_context["context_type"], "aggregated")
        self.assertEqual(agg_context["context_version"], "1.0")
        self.assertEqual(agg_context["topic"], "AI Agents")
        
        # Market Data
        self.assertEqual(agg_context["market_data"]["opportunity_score"], 95.0)
        self.assertEqual(agg_context["market_data"]["trend_score"], 92.5)

        # Signals
        self.assertEqual(len(agg_context["signals"]), 2)
        kws = [s["keyword"] for s in agg_context["signals"]]
        self.assertIn("autogen", kws)
        self.assertIn("crewai", kws)

        # Competitor data
        self.assertEqual(agg_context["competitor_data"]["competition_score"], 24.0)

        # Opportunities list
        self.assertEqual(len(agg_context["opportunities"]), 1)
        self.assertEqual(agg_context["opportunities"][0]["topic"], "AI Agents")

        # Insights matching topic name
        self.assertEqual(len(agg_context["insights"]), 1)
        self.assertEqual(agg_context["insights"][0]["finding"], "Competitor Outperforming: AI Agents")

        # Check aggregated sources list
        self.assertEqual(agg_context["aggregated_sources"], [{"type": "topic", "id": "topic-1"}])

    def test_create_ai_context_insight_triggered_success(self):
        # We test insight aggregation, which should auto-find topic and link both
        agg_context = create_ai_context(self.db, "insight", "insight-1")
        
        self.assertEqual(agg_context["context_type"], "aggregated")
        self.assertEqual(agg_context["topic"], "AI Agents")
        self.assertEqual(len(agg_context["insights"]), 1)
        self.assertEqual(agg_context["insights"][0]["finding"], "Competitor Outperforming: AI Agents")
        
        # Verify it automatically linked both sources
        self.assertEqual(len(agg_context["aggregated_sources"]), 2)
        self.assertEqual(agg_context["aggregated_sources"][0], {"type": "insight", "id": "insight-1"})
        self.assertEqual(agg_context["aggregated_sources"][1], {"type": "topic", "id": "topic-1"})
