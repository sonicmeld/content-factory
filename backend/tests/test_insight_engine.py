import os
import sys
import json
import unittest
from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.models import (
    Base,
    AnalyticsChannel,
    AnalyticsVideo,
    AnalyticsSnapshot,
    AnalyticsInsight,
    AnalyticsWorkspaceLink,
    Channel
)
from services.analytics.insight_engine import generate_channel_insights

class TestInsightEngine(unittest.TestCase):
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

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def test_generate_channel_insights_basic(self):
        # 1. Setup channel and videos
        channel = AnalyticsChannel(
            id="chan-own",
            external_channel_id="UCowner123",
            channel_name="Owned Channel",
            is_own=True,
            analytics_type="owned"
        )
        self.db.add(channel)
        
        # Add snapshots for growth/decline
        now = datetime.now(timezone.utc)
        snap_old = AnalyticsSnapshot(
            id="snap-old",
            target_id="chan-own",
            target_type="channel",
            metric_source="youtube_analytics",
            snapshot_date=now - timedelta(days=30),
            views=1000,
            subscribers=200,
            ctr=5.0
        )
        snap_mid = AnalyticsSnapshot(
            id="snap-mid",
            target_id="chan-own",
            target_type="channel",
            metric_source="youtube_analytics",
            snapshot_date=now - timedelta(days=15),
            views=2000,
            subscribers=150,
            ctr=5.0
        )
        snap_new = AnalyticsSnapshot(
            id="snap-new",
            target_id="chan-own",
            target_type="channel",
            metric_source="youtube_analytics",
            snapshot_date=now,
            views=2500, # growth decelerated: 1000 views in 1st 15 days, 500 in 2nd 15 days (50% drop)
            subscribers=140, # subscriber decline: 200 down to 140 (30% drop)
            ctr=6.0
        )
        self.db.add_all([snap_old, snap_mid, snap_new])
        
        # Add videos
        v1 = AnalyticsVideo(
            id="vid-1",
            external_video_id="v1",
            analytics_channel_id="chan-own",
            title="Good Video",
            published_at=now - timedelta(days=10),
            views=100,
            likes=10,
            comments=2
        )
        # Low CTR warning video (should trigger warning since sum(ord(c)) % 3 == 0 or simulated CTR < 0.7*avg_ctr)
        # Let's specify CTR directly in AnalyticsSnapshot to test real lookup
        v2 = AnalyticsVideo(
            id="vid-2",
            external_video_id="v2",
            analytics_channel_id="chan-own",
            title="Bad Thumbnail",
            published_at=now - timedelta(days=5),
            views=100,
            likes=2,
            comments=0
        )
        # Add a custom snapshot for video 2 to test direct CTR detection
        snap_v2 = AnalyticsSnapshot(
            id="snap-v2",
            target_id="vid-2",
            target_type="video",
            metric_source="youtube_analytics",
            snapshot_date=now,
            views=100,
            ctr=1.5  # average channel is 6.0, 1.5 is less than 0.7 * 6.0 (4.2)
        )
        
        self.db.add_all([v1, v2, snap_v2])
        self.db.commit()

        # 2. Run engine
        result = generate_channel_insights(self.db, "chan-own")
        
        # Verify result shape
        self.assertIn("generated", result)
        self.assertIn("removed", result)
        self.assertIn("duration_ms", result)
        
        # Query generated insights
        insights = self.db.query(AnalyticsInsight).filter(AnalyticsInsight.channel_id == "chan-own").all()
        self.assertGreater(len(insights), 0)
        
        # Verify we detected subscriber_decline
        sub_decline = [i for i in insights if i.insight_type == "subscriber_decline"]
        self.assertEqual(len(sub_decline), 1)
        self.assertEqual(sub_decline[0].status, "active")
        self.assertEqual(sub_decline[0].severity, "High")
        
        # Verify thumbnail CTR warnings
        thumb_warning = [i for i in insights if i.insight_type == "thumbnail_warning" and i.entity_id == "vid-2"]
        self.assertEqual(len(thumb_warning), 1)

    def test_fingerprint_deduplication_and_soft_archival(self):
        channel = AnalyticsChannel(
            id="chan-own",
            external_channel_id="UCowner123",
            channel_name="Owned Channel",
            is_own=True,
            analytics_type="owned"
        )
        self.db.add(channel)
        
        now = datetime.now(timezone.utc)
        snap_old = AnalyticsSnapshot(
            id="snap-old",
            target_id="chan-own",
            target_type="channel",
            metric_source="youtube_analytics",
            snapshot_date=now - timedelta(days=30),
            views=1000,
            subscribers=100,
            ctr=5.0
        )
        snap_new = AnalyticsSnapshot(
            id="snap-new",
            target_id="chan-own",
            target_type="channel",
            metric_source="youtube_analytics",
            snapshot_date=now,
            views=2000,
            subscribers=150,
            ctr=5.0
        )
        self.db.add_all([snap_old, snap_new])
        self.db.commit()

        # Run 1: Should generate consistent insights (e.g. upload consistency because 0 uploads)
        res1 = generate_channel_insights(self.db, "chan-own")
        insights1 = self.db.query(AnalyticsInsight).filter(AnalyticsInsight.status == "active").all()
        self.assertGreater(len(insights1), 0)
        original_created_at = insights1[0].created_at
        
        # Run 2: Re-run engine. The fingerprint should match, so no new rows should be created, only updated.
        res2 = generate_channel_insights(self.db, "chan-own")
        insights2 = self.db.query(AnalyticsInsight).filter(AnalyticsInsight.status == "active").all()
        self.assertEqual(len(insights1), len(insights2))
        self.assertEqual(insights2[0].created_at, original_created_at)

        # Run 3: Soft-archival. Add a video to satisfy upload frequency expected score.
        v1 = AnalyticsVideo(
            id="vid-1",
            external_video_id="v1",
            analytics_channel_id="chan-own",
            title="Consistency Builder 1",
            published_at=now - timedelta(days=1),
            views=10
        )
        v2 = AnalyticsVideo(
            id="vid-2",
            external_video_id="v2",
            analytics_channel_id="chan-own",
            title="Consistency Builder 2",
            published_at=now - timedelta(days=2),
            views=10
        )
        v3 = AnalyticsVideo(
            id="vid-3",
            external_video_id="v3",
            analytics_channel_id="chan-own",
            title="Consistency Builder 3",
            published_at=now - timedelta(days=3),
            views=10
        )
        v4 = AnalyticsVideo(
            id="vid-4",
            external_video_id="v4",
            analytics_channel_id="chan-own",
            title="Consistency Builder 4",
            published_at=now - timedelta(days=4),
            views=10
        )
        self.db.add_all([v1, v2, v3, v4])
        
        # Setup channel expected frequency as weekly (4 uploads)
        profile = Channel(
            id="chan-profile",
            name="Profile",
            slug="profile-slug",
            youtube_channel_id="UCowner123",
            upload_frequency="weekly",
            is_active=1
        )
        self.db.add(profile)
        self.db.commit()

        # Run 4: Upload consistency rule is now satisfied (4 videos in 30 days), so `upload_frequency` active insight should disappear (archived)
        res4 = generate_channel_insights(self.db, "chan-own")
        self.assertEqual(res4["removed"], 1)
        
        # The upload_frequency insight should now have status = "archived"
        archived_insight = self.db.query(AnalyticsInsight).filter(
            AnalyticsInsight.insight_type == "upload_frequency"
        ).first()
        self.assertEqual(archived_insight.status, "archived")

    def test_competitor_outperforming_median(self):
        # Setup owned channel and competitor channel
        now = datetime.now(timezone.utc)
        own = AnalyticsChannel(
            id="own-chan",
            external_channel_id="UCowned",
            channel_name="Owned Channel",
            is_own=True,
            analytics_type="owned"
        )
        comp = AnalyticsChannel(
            id="comp-chan",
            external_channel_id="UCcompetitor",
            channel_name="Competitor Channel",
            is_own=False,
            analytics_type="competitor"
        )
        self.db.add_all([own, comp])
        
        # Sibling links in same workspace
        link1 = AnalyticsWorkspaceLink(id="l1", channel_id="work-1", analytics_channel_id="own-chan")
        link2 = AnalyticsWorkspaceLink(id="l2", channel_id="work-1", analytics_channel_id="comp-chan")
        self.db.add_all([link1, link2])

        # Owned Channel Snapshots (5% growth)
        self.db.add(AnalyticsSnapshot(id="s-own-old", target_id="own-chan", target_type="channel", metric_source="youtube_analytics", snapshot_date=now - timedelta(days=30), subscribers=100))
        self.db.add(AnalyticsSnapshot(id="s-own-new", target_id="own-chan", target_type="channel", metric_source="youtube_analytics", snapshot_date=now, subscribers=105))

        # Competitor Channel Snapshots (20% growth)
        self.db.add(AnalyticsSnapshot(id="s-comp-old", target_id="comp-chan", target_type="channel", metric_source="youtube_data_api", snapshot_date=now - timedelta(days=30), subscribers=100))
        self.db.add(AnalyticsSnapshot(id="s-comp-new", target_id="comp-chan", target_type="channel", metric_source="youtube_data_api", snapshot_date=now, subscribers=120))
        
        self.db.commit()

        # Run engine: competitor median growth (20%) - owned growth (5%) = 15% (> 10% threshold) -> should trigger competitor_outperforming
        generate_channel_insights(self.db, "own-chan")
        
        competitor_out = self.db.query(AnalyticsInsight).filter(
            AnalyticsInsight.channel_id == "own-chan",
            AnalyticsInsight.insight_type == "competitor_outperforming"
        ).first()
        
        self.assertIsNotNone(competitor_out)
        self.assertEqual(competitor_out.severity, "High")
