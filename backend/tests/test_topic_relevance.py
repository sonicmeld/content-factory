"""
test_topic_relevance.py
Sprint D — Tests for Topic Relevance Layer

Tests:
1. calculate_relevance_scores() creates AnalyticsTopicRelevance records
2. Relevance score is 0.0-1.0
3. Exact keyword match produces higher score than no match
4. Topics with no seed overlap get score 0.0
5. Upsert works correctly on second call
6. get_relevance_map() returns dict of topic_id → score
7. get_relevance_label() returns correct labels
8. Topics are NOT duplicated by relevance calculation
"""
import os
import sys
import json
import uuid
import unittest
from datetime import datetime, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.models import (
    Base, YoutubeAccount, AnalyticsChannelProfile,
    AnalyticsTopic, AnalyticsKeyword, AnalyticsTopicRelevance
)
from services.analytics.topic_relevance import (
    calculate_relevance_scores,
    get_relevance_map,
    get_relevance_label,
    _keyword_overlap_score,
    _normalize_to_01
)


class TestTopicRelevance(unittest.TestCase):

    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool
        )
        self.SessionLocal = sessionmaker(bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        self.db = self.SessionLocal()

        # Create YoutubeAccount
        self.account = YoutubeAccount(
            id="acct-rel-001",
            workspace_id="ws-123",
            youtube_channel_id="UC_rel_test",
            youtube_channel_title="AI Workflow Channel",
            analytics_enabled=True
        )
        self.db.add(self.account)

        # Create ChannelProfile with seed keywords
        self.profile = AnalyticsChannelProfile(
            id="cp-001",
            youtube_account_id="acct-rel-001",
            channel_title="AI Workflow Channel",
            seed_keywords_json=json.dumps(["n8n", "ai automation", "mcp", "agent workflow"]),
            extracted_at=datetime.now(timezone.utc),
            version=1
        )
        self.db.add(self.profile)

        # Create topics with keywords
        # Topic 1: Highly relevant (n8n, ai automation overlap)
        self.topic_relevant = AnalyticsTopic(
            id="topic-rel-001",
            topic_name="N8N Automation",
            topic_slug="n8n-automation",
            fingerprint="n8n",
            status="active",
            trend_score=80.0, demand_score=70.0,
            competition_score=30.0, forecast_score=75.0, opportunity_score=80.0
        )
        self.db.add(self.topic_relevant)
        self.db.add(AnalyticsKeyword(
            id="kw-rel-001", topic_id="topic-rel-001",
            keyword="n8n tutorial", trend_score=80.0, search_volume=5000.0, competition_score=0.0
        ))
        self.db.add(AnalyticsKeyword(
            id="kw-rel-002", topic_id="topic-rel-001",
            keyword="n8n ai automation", trend_score=70.0, search_volume=3000.0, competition_score=0.0
        ))

        # Topic 2: Unrelated (cooking)
        self.topic_unrelated = AnalyticsTopic(
            id="topic-rel-002",
            topic_name="Cooking Recipes",
            topic_slug="cooking-recipes",
            fingerprint="cooking",
            status="active",
            trend_score=50.0, demand_score=60.0,
            competition_score=70.0, forecast_score=40.0, opportunity_score=30.0
        )
        self.db.add(self.topic_unrelated)
        self.db.add(AnalyticsKeyword(
            id="kw-rel-003", topic_id="topic-rel-002",
            keyword="pasta recipe", trend_score=50.0, search_volume=8000.0, competition_score=0.0
        ))
        self.db.add(AnalyticsKeyword(
            id="kw-rel-004", topic_id="topic-rel-002",
            keyword="cooking tutorial", trend_score=45.0, search_volume=6000.0, competition_score=0.0
        ))

        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    # ── Unit Tests ────────────────────────────────────────────

    def test_keyword_overlap_score_exact_match(self):
        result = _keyword_overlap_score(
            seed_keywords=["n8n", "ai automation"],
            topic_keywords=["n8n tutorial", "n8n workflow"],
            fingerprint="n8n"
        )
        self.assertGreater(result["raw_score"], 0)
        self.assertGreater(result["overlap_count"], 0)

    def test_keyword_overlap_score_no_match(self):
        result = _keyword_overlap_score(
            seed_keywords=["n8n", "ai automation"],
            topic_keywords=["pasta recipe", "cooking tutorial"],
            fingerprint="cooking"
        )
        self.assertEqual(result["raw_score"], 0.0)
        self.assertEqual(result["overlap_count"], 0)

    def test_normalize_to_01_clamps(self):
        score = _normalize_to_01(raw_score=100.0, seed_count=3, topic_kw_count=5)
        self.assertLessEqual(score, 1.0)
        self.assertGreaterEqual(score, 0.0)

    def test_normalize_to_01_zero_seeds(self):
        score = _normalize_to_01(raw_score=0.0, seed_count=0, topic_kw_count=5)
        self.assertEqual(score, 0.0)

    def test_get_relevance_label_high(self):
        self.assertEqual(get_relevance_label(0.6), "High")

    def test_get_relevance_label_medium(self):
        self.assertEqual(get_relevance_label(0.3), "Medium")

    def test_get_relevance_label_low(self):
        self.assertEqual(get_relevance_label(0.1), "Low")

    def test_get_relevance_label_none(self):
        self.assertEqual(get_relevance_label(0.0), "None")

    # ── Integration Tests ─────────────────────────────────────

    def test_calculate_relevance_scores_creates_records(self):
        """Should create AnalyticsTopicRelevance for all topics."""
        scored = calculate_relevance_scores(self.db, "acct-rel-001")
        self.assertEqual(scored, 2)  # 2 topics in DB

        records = self.db.query(AnalyticsTopicRelevance).filter(
            AnalyticsTopicRelevance.youtube_account_id == "acct-rel-001"
        ).all()
        self.assertEqual(len(records), 2)

    def test_relevant_topic_scores_higher_than_unrelated(self):
        """N8N topic should have higher relevance than Cooking topic for this channel."""
        calculate_relevance_scores(self.db, "acct-rel-001")

        relevant_rel = self.db.query(AnalyticsTopicRelevance).filter(
            AnalyticsTopicRelevance.topic_id == "topic-rel-001",
            AnalyticsTopicRelevance.youtube_account_id == "acct-rel-001"
        ).first()

        unrelated_rel = self.db.query(AnalyticsTopicRelevance).filter(
            AnalyticsTopicRelevance.topic_id == "topic-rel-002",
            AnalyticsTopicRelevance.youtube_account_id == "acct-rel-001"
        ).first()

        self.assertIsNotNone(relevant_rel)
        self.assertIsNotNone(unrelated_rel)
        self.assertGreater(relevant_rel.relevance_score, unrelated_rel.relevance_score)

    def test_unrelated_topic_scores_zero(self):
        """Cooking topic should have 0.0 relevance for AI channel."""
        calculate_relevance_scores(self.db, "acct-rel-001")

        cooking_rel = self.db.query(AnalyticsTopicRelevance).filter(
            AnalyticsTopicRelevance.topic_id == "topic-rel-002",
            AnalyticsTopicRelevance.youtube_account_id == "acct-rel-001"
        ).first()

        self.assertEqual(cooking_rel.relevance_score, 0.0)

    def test_relevance_score_in_valid_range(self):
        """All relevance scores must be 0.0-1.0."""
        calculate_relevance_scores(self.db, "acct-rel-001")

        records = self.db.query(AnalyticsTopicRelevance).filter(
            AnalyticsTopicRelevance.youtube_account_id == "acct-rel-001"
        ).all()
        for r in records:
            self.assertGreaterEqual(r.relevance_score, 0.0)
            self.assertLessEqual(r.relevance_score, 1.0)

    def test_upsert_on_second_calculation(self):
        """Second call should upsert, not create duplicate records."""
        calculate_relevance_scores(self.db, "acct-rel-001")
        calculate_relevance_scores(self.db, "acct-rel-001")

        count = self.db.query(AnalyticsTopicRelevance).filter(
            AnalyticsTopicRelevance.youtube_account_id == "acct-rel-001"
        ).count()
        # Should still only be 2 records, not 4
        self.assertEqual(count, 2)

    def test_topics_not_duplicated(self):
        """Topics themselves must not be duplicated by relevance calculation."""
        topics_before = self.db.query(AnalyticsTopic).count()
        calculate_relevance_scores(self.db, "acct-rel-001")
        topics_after = self.db.query(AnalyticsTopic).count()
        self.assertEqual(topics_before, topics_after)

    def test_get_relevance_map_returns_dict(self):
        """get_relevance_map() should return topic_id → score dict."""
        calculate_relevance_scores(self.db, "acct-rel-001")
        relevance_map = get_relevance_map(self.db, "acct-rel-001")

        self.assertIsInstance(relevance_map, dict)
        self.assertIn("topic-rel-001", relevance_map)
        self.assertIn("topic-rel-002", relevance_map)

    def test_get_relevance_map_empty_if_no_records(self):
        """Should return empty dict if no relevance has been calculated yet."""
        relevance_map = get_relevance_map(self.db, "acct-rel-001")
        self.assertEqual(relevance_map, {})

    def test_no_seed_keywords_returns_zero_scored(self):
        """If account has no profile, should return 0 scored topics gracefully."""
        # Account without profile
        acct2 = YoutubeAccount(
            id="acct-no-profile",
            workspace_id="ws-123",
            youtube_channel_id="UC_no_profile",
            youtube_channel_title="",
            analytics_enabled=True
        )
        self.db.add(acct2)
        self.db.commit()

        result = calculate_relevance_scores(self.db, "acct-no-profile")
        self.assertEqual(result, 0)


if __name__ == "__main__":
    unittest.main()
