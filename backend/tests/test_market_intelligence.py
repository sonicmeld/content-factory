import os
import sys
import json
import unittest
from datetime import datetime, timezone, timedelta
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
    AnalyticsMarketTrend,
    AnalyticsOpportunityExport,
    AnalyticsVideo,
    AnalyticsChannel
)
from services.analytics.market_collector import collect_market_trends
from services.analytics.topic_radar import clean_fingerprint, cluster_and_save_trends, levenshtein_distance
from services.analytics.competitor_topic_analysis import analyze_competitor_coverage
from services.analytics.forecast_engine import calculate_forecasts
from services.analytics.opportunity_engine import calculate_opportunity_scores

class TestMarketIntelligence(unittest.TestCase):
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

        # Override FastAPI dependency
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

    def test_clean_fingerprint(self):
        self.assertEqual(clean_fingerprint("AI Agents"), "aiagent")
        self.assertEqual(clean_fingerprint("AI Agent Tutorial"), "aiagent")
        self.assertEqual(clean_fingerprint("Building AI Agents"), "aiagent")
        self.assertEqual(clean_fingerprint("n8n workflow Integration"), "n8n")

    def test_levenshtein_distance(self):
        self.assertEqual(levenshtein_distance("cat", "cat"), 0)
        self.assertEqual(levenshtein_distance("cat", "bat"), 1)
        self.assertEqual(levenshtein_distance("aiagent", "aiagents"), 1)

    def test_market_collection_and_clustering(self):
        # 1. Run collector mock
        trends = collect_market_trends(self.db, seed_keywords=["AI Agents", "n8n tutorial"])
        self.assertTrue(len(trends) > 0)
        
        # 2. Run clustering and database saving
        cluster_and_save_trends(self.db, trends)
        
        topics = self.db.query(AnalyticsTopic).all()
        keywords_in_db = self.db.query(AnalyticsKeyword).all()
        
        self.assertTrue(len(topics) > 0)
        self.assertTrue(len(keywords_in_db) > 0)
        
        # Ensure fingerprints are populated and unique
        fingerprints = [t.fingerprint for t in topics]
        self.assertEqual(len(fingerprints), len(set(fingerprints)))

    def test_competitor_coverage_analysis(self):
        # Setup competitor channels and videos
        channel = AnalyticsChannel(
            id="comp-1",
            external_channel_id="UCcompetitor123",
            channel_name="Competitor channel",
            is_own=False,
            analytics_type="competitor"
        )
        self.db.add(channel)
        self.db.commit()
        
        # Create topic first
        topic = AnalyticsTopic(
            id="topic-ai",
            topic_name="AI Agents",
            topic_slug="ai-agents",
            fingerprint="aiagent",
            status="active"
        )
        self.db.add(topic)
        
        # Create keyword
        keyword = AnalyticsKeyword(
            id="kw-ai",
            topic_id="topic-ai",
            keyword="crewai tutorial",
            trend_score=80.0,
            search_volume=5000.0,
            competition_score=0.0
        )
        self.db.add(keyword)
        
        # Create matching video
        video1 = AnalyticsVideo(
            id="vid-1",
            external_video_id="v1",
            analytics_channel_id="comp-1",
            title="Building CrewAI Agents tutorial",
            published_at=datetime.now(timezone.utc) - timedelta(days=5),
            views=1000
        )
        self.db.add(video1)
        self.db.commit()

        # Run analysis
        result = analyze_competitor_coverage(self.db)
        self.assertEqual(len(result["top_covered"]) + len(result["emerging"]) + len(result["ignored"]), 1)
        
        # Check that competition score was calculated
        db_topic = self.db.query(AnalyticsTopic).filter(AnalyticsTopic.id == "topic-ai").first()
        self.assertGreater(db_topic.competition_score, 0.0)

    def test_forecast_and_opportunity_engines(self):
        # Setup topic, keywords, and historical trends
        topic = AnalyticsTopic(
            id="t-1",
            topic_name="Local AI",
            topic_slug="local-ai",
            fingerprint="localai",
            status="active"
        )
        self.db.add(topic)
        
        keyword = AnalyticsKeyword(
            id="k-1",
            topic_id="t-1",
            keyword="local llm guide",
            trend_score=75.0,
            search_volume=3000.0,
            competition_score=10.0
        )
        self.db.add(keyword)
        
        now = datetime.now(timezone.utc)
        # Create 15 days of time-series trend points for linear regression
        for i in range(15):
            mt = AnalyticsMarketTrend(
                id=f"mt-{i}",
                keyword_id="k-1",
                topic_id="t-1",
                source="google_trends",
                trend_score=60.0 + i * 2,  # upward trend
                growth_rate=0.05,
                collected_at=now - timedelta(days=(14 - i))
            )
            self.db.add(mt)
            
        self.db.commit()

        # Run forecast
        forecasts = calculate_forecasts(self.db, "t-1")
        self.assertGreater(forecasts["forecast_7"], 80)
        self.assertGreater(forecasts["forecast_90"], 90)

        # Run opportunity engine
        calculate_opportunity_scores(self.db)
        db_topic = self.db.query(AnalyticsTopic).filter(AnalyticsTopic.id == "t-1").first()
        self.assertGreater(db_topic.opportunity_score, 0.0)
        self.assertIn(db_topic.status, ["active", "emerging"])

    def test_api_endpoints(self):
        # Trigger refresh via endpoint to populate database
        refresh_resp = self.client.post("/api/analytics/market/refresh")
        self.assertEqual(refresh_resp.status_code, 200)
        data = refresh_resp.json()
        self.assertEqual(data["status"], "success")
        self.assertTrue(data["topics_analyzed"] > 0)
        
        # Test GET market trends
        trends_resp = self.client.get("/api/analytics/market/trends")
        self.assertEqual(trends_resp.status_code, 200)
        self.assertTrue(len(trends_resp.json()) > 0)

        # Test GET market topics
        topics_resp = self.client.get("/api/analytics/market/topics")
        self.assertEqual(topics_resp.status_code, 200)
        topics = topics_resp.json()
        self.assertTrue(len(topics) > 0)
        
        topic_id = topics[0]["id"]
        
        # Test GET single topic detail
        detail_resp = self.client.get(f"/api/analytics/market/topics/{topic_id}")
        self.assertEqual(detail_resp.status_code, 200)
        self.assertEqual(detail_resp.json()["id"], topic_id)
        
        # Test GET topic opportunities endpoint
        opp_detail_resp = self.client.get(f"/api/analytics/market/topics/{topic_id}/opportunities")
        self.assertEqual(opp_detail_resp.status_code, 200)
        opp_data = opp_detail_resp.json()
        self.assertEqual(opp_data["topic_id"], topic_id)
        self.assertIn("forecast_history", opp_data)
        self.assertIn("exports", opp_data)

        # Test GET market opportunities list
        opp_list_resp = self.client.get("/api/analytics/market/opportunities")
        self.assertEqual(opp_list_resp.status_code, 200)
        
        # Test GET forecast endpoint
        forecast_list_resp = self.client.get("/api/analytics/market/forecast")
        self.assertEqual(forecast_list_resp.status_code, 200)
        self.assertTrue(len(forecast_list_resp.json()) > 0)
        
        # Test POST exports snapshot
        export_resp = self.client.post("/api/analytics/market/exports", json={"topic_id": topic_id})
        self.assertEqual(export_resp.status_code, 200)
        export_data = export_resp.json()
        self.assertEqual(export_data["topic_id"], topic_id)
        self.assertIn("exported_at", export_data)
