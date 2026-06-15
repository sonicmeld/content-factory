"""
test_channel_profile_extractor.py
Sprint D — Tests for Identity Projection Layer

Tests:
1. sync_channel_profile() creates AnalyticsChannelProfile from Identity Layer
2. seed_keywords_json is saved correctly
3. Profile upserts correctly on second call (version increments)
4. get_seed_keywords() returns list and triggers sync if missing
5. Works without videos (graceful fallback)
"""
import os
import sys
import json
import unittest
from datetime import datetime, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.models import (
    Base, YoutubeAccount, AnalyticsChannelProfile,
    AnalyticsChannel, AnalyticsVideo
)
from services.analytics.channel_profile_extractor import (
    sync_channel_profile,
    get_seed_keywords,
    _parse_channel_keywords,
    _extract_keywords_from_text,
    _build_seed_keywords
)


class TestChannelProfileExtractor(unittest.TestCase):

    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool
        )
        self.SessionLocal = sessionmaker(bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        self.db = self.SessionLocal()

        # Create a base YoutubeAccount (Identity Layer source)
        self.account = YoutubeAccount(
            id="acct-001",
            workspace_id="ws-123",
            youtube_channel_id="UC_test_channel",
            youtube_channel_title="Midnight Cassette",
            analytics_enabled=True
        )
        self.db.add(self.account)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    # ── Unit Tests ────────────────────────────────────────────

    def test_parse_channel_keywords_quoted(self):
        raw = '"ai automation" "n8n workflow" mcp'
        result = _parse_channel_keywords(raw)
        self.assertIn("ai automation", result)
        self.assertIn("n8n workflow", result)
        self.assertIn("mcp", result)

    def test_parse_channel_keywords_empty(self):
        result = _parse_channel_keywords("")
        self.assertEqual(result, [])

    def test_parse_channel_keywords_none(self):
        result = _parse_channel_keywords(None)
        self.assertEqual(result, [])

    def test_extract_keywords_from_text_basic(self):
        text = "AI automation workflow with n8n"
        result = _extract_keywords_from_text(text)
        # Should contain unigrams and bigrams from meaningful words
        self.assertIsInstance(result, list)
        self.assertTrue(len(result) > 0)

    def test_build_seed_keywords_deduplication(self):
        seeds = _build_seed_keywords(
            channel_title="AI Automation Channel",
            channel_description=None,
            channel_keywords_raw='"ai automation" "n8n"',
            video_titles=["n8n Tutorial Guide", "AI Automation Basics", "n8n Tutorial Advanced"]
        )
        # Ensure deduplication works — "n8n" should not appear twice
        counts = {}
        for s in seeds:
            counts[s] = counts.get(s, 0) + 1
        for kw, count in counts.items():
            self.assertEqual(count, 1, f"Duplicate found: '{kw}'")

    def test_build_seed_keywords_max_limit(self):
        # Generate many titles to test the 30-keyword cap
        titles = [f"Video about topic {i}" for i in range(50)]
        seeds = _build_seed_keywords(
            channel_title="Test Channel",
            channel_description=None,
            channel_keywords_raw=None,
            video_titles=titles
        )
        self.assertLessEqual(len(seeds), 30)

    # ── Integration Tests ─────────────────────────────────────

    def test_sync_channel_profile_creates_record(self):
        """Profile should be created for a valid YoutubeAccount."""
        profile = sync_channel_profile(self.db, "acct-001")

        self.assertIsNotNone(profile)
        self.assertEqual(profile.youtube_account_id, "acct-001")
        self.assertEqual(profile.channel_title, "Midnight Cassette")
        self.assertEqual(profile.version, 1)

        # seed_keywords_json must be a valid JSON list
        seeds = json.loads(profile.seed_keywords_json)
        self.assertIsInstance(seeds, list)

    def test_sync_channel_profile_upserts_on_second_call(self):
        """Second sync should increment version, not create duplicate."""
        profile1 = sync_channel_profile(self.db, "acct-001")
        profile2 = sync_channel_profile(self.db, "acct-001")

        # Same record
        self.assertEqual(profile1.id, profile2.id)
        # Version incremented
        self.assertEqual(profile2.version, 2)

        # Only one record in DB
        count = self.db.query(AnalyticsChannelProfile).filter(
            AnalyticsChannelProfile.youtube_account_id == "acct-001"
        ).count()
        self.assertEqual(count, 1)

    def test_sync_profile_with_videos(self):
        """Videos linked to the account should contribute to seed keywords."""
        # Create linked AnalyticsChannel
        channel = AnalyticsChannel(
            id="ch-001",
            external_channel_id="UC_test_channel",
            channel_name="Midnight Cassette",
            is_own=True,
            analytics_type="owned"
        )
        self.db.add(channel)

        # Add some videos
        for i, title in enumerate(["n8n Tutorial Basics", "AI Agent Workflow", "MCP Server Guide"]):
            video = AnalyticsVideo(
                id=f"vid-{i}",
                external_video_id=f"extv{i}",
                analytics_channel_id="ch-001",
                title=title,
                published_at=datetime.now(timezone.utc),
                views=1000 - i * 100
            )
            self.db.add(video)
        self.db.commit()

        profile = sync_channel_profile(self.db, "acct-001")
        seeds = json.loads(profile.seed_keywords_json)

        # Keywords from video titles should be in seeds
        all_seeds_str = " ".join(seeds)
        # At least one video-derived keyword should appear
        self.assertTrue(
            any(kw in all_seeds_str for kw in ["n8n", "agent", "mcp"]),
            f"Expected video-derived keywords in seeds but got: {seeds}"
        )

    def test_sync_profile_invalid_account_raises(self):
        """Should raise ValueError for non-existent account."""
        with self.assertRaises(ValueError):
            sync_channel_profile(self.db, "nonexistent-account-id")

    def test_get_seed_keywords_returns_list(self):
        """get_seed_keywords should always return a list."""
        seeds = get_seed_keywords(self.db, "acct-001")
        self.assertIsInstance(seeds, list)

    def test_get_seed_keywords_triggers_sync_if_missing(self):
        """Should auto-create profile if none exists."""
        # No profile exists yet
        count_before = self.db.query(AnalyticsChannelProfile).count()
        self.assertEqual(count_before, 0)

        seeds = get_seed_keywords(self.db, "acct-001")

        count_after = self.db.query(AnalyticsChannelProfile).count()
        self.assertEqual(count_after, 1)
        self.assertIsInstance(seeds, list)


if __name__ == "__main__":
    unittest.main()
