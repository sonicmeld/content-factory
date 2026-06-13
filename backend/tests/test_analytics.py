import os
import sys
import unittest
import json
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from database.database import get_db
from database.models import Base
from app.config import settings

class TestAnalytics(unittest.TestCase):
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

    @patch("services.analytics.collector.oauth_service.get_valid_credentials")
    @patch("services.analytics.collector.build")
    def test_observe_and_sync_owned_channel_success(self, mock_build, mock_get_credentials):
        mock_get_credentials.return_value = MagicMock()
        # Setup mock YouTube client responses
        mock_youtube = MagicMock()
        mock_build.return_value = mock_youtube

        # mock channels().list().execute()
        mock_youtube.channels().list().execute.return_value = {
            "items": [
                {
                    "id": "UC123456",
                    "snippet": {
                        "title": "My Test Owned Channel",
                        "customUrl": "@mytestown"
                    },
                    "statistics": {
                        "viewCount": "1000",
                        "subscriberCount": "150"
                    }
                }
            ]
        }

        # mock search().list().execute() for videos
        mock_youtube.search().list().execute.return_value = {
            "items": [
                {
                    "id": {
                        "kind": "youtube#video",
                        "videoId": "vid-abc"
                    },
                    "snippet": {
                        "title": "Awesome First Video",
                        "publishedAt": "2026-06-13T10:00:00Z",
                        "thumbnails": {
                            "high": {
                                "url": "https://img.youtube.com/vid-abc.jpg"
                            }
                        }
                    }
                }
            ]
        }

        # mock videos().list().execute() for video stats
        mock_youtube.videos().list().execute.return_value = {
            "items": [
                {
                    "statistics": {
                        "viewCount": "500",
                        "likeCount": "40",
                        "commentCount": "5"
                    }
                }
            ]
        }

        mock_yt_analytics = MagicMock()
        def side_effect(serviceName, version, **kwargs):
            if serviceName == "youtube":
                return mock_youtube
            elif serviceName == "youtubeAnalytics":
                return mock_yt_analytics
            return MagicMock()
        mock_build.side_effect = side_effect

        mock_yt_analytics.reports().query().execute.return_value = {
            "rows": [
                ["2026-06-13", 1000, 3500.0, 150, 40, 5]
            ]
        }

        # 1. Observe channel
        resp = self.client.post(
            "/api/analytics/channels/observe",
            json={
                "external_channel_id": "UC123456",
                "analytics_type": "owned",
                "channel_id": "workspace-123"
            }
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        channel_id = data["id"]
        self.assertEqual(data["external_channel_id"], "UC123456")
        self.assertEqual(data["sync_status"], "failed") # initially failed because identity reference is missing

        # 2. Link identity and trigger sync
        resp_link = self.client.post(
            f"/api/analytics/channels/{channel_id}/link-identity",
            json={
                "identity_reference_id": "oauth-channel-uuid-1"
            }
        )
        self.assertEqual(resp_link.status_code, 200)
        data_link = resp_link.json()
        self.assertEqual(data_link["sync_status"], "success")

        # 3. Verify overview is populated
        resp_overview = self.client.get(f"/api/analytics/channels/{channel_id}/overview")
        self.assertEqual(resp_overview.status_code, 200)
        overview = resp_overview.json()
        self.assertEqual(overview["views"], 1000)
        self.assertEqual(overview["subscribers"], 150)
        self.assertGreater(overview["watch_time"], 0.0)

        # 4. Verify videos are created
        resp_videos = self.client.get(f"/api/analytics/channels/{channel_id}/videos")
        self.assertEqual(resp_videos.status_code, 200)
        videos = resp_videos.json()
        self.assertEqual(len(videos), 1)
        self.assertEqual(videos[0]["external_video_id"], "vid-abc")
        self.assertEqual(videos[0]["title"], "Awesome First Video")

    @patch("services.analytics.collector.build")
    def test_observe_competitor_channel_success(self, mock_build):
        mock_youtube = MagicMock()
        mock_build.return_value = mock_youtube

        # Mock channels response
        mock_youtube.channels().list().execute.return_value = {
            "items": [
                {
                    "id": "UCcompetitor",
                    "snippet": {
                        "title": "Competitor Channel",
                        "customUrl": "@competitor"
                    },
                    "statistics": {
                        "viewCount": "50000",
                        "subscriberCount": "10000"
                    }
                }
            ]
        }

        # Mock videos response
        mock_youtube.search().list().execute.return_value = {
            "items": [
                {
                    "id": {
                        "kind": "youtube#video",
                        "videoId": "comp-vid-1"
                    },
                    "snippet": {
                        "title": "Competitor Video 1",
                        "publishedAt": "2026-06-12T10:00:00Z",
                        "thumbnails": {
                            "high": {
                                "url": "https://img.youtube.com/comp-vid-1.jpg"
                            }
                        }
                    }
                }
            ]
        }

        # Mock video stats
        mock_youtube.videos().list().execute.return_value = {
            "items": [
                {
                    "statistics": {
                        "viewCount": "12000",
                        "likeCount": "800",
                        "commentCount": "150"
                    }
                }
            ]
        }

        # Observe competitor channel (is_own = False)
        resp = self.client.post(
            "/api/analytics/channels/observe",
            json={
                "external_channel_id": "UCcompetitor",
                "analytics_type": "competitor",
                "channel_id": "workspace-123"
            }
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["sync_status"], "success") # competitor sync works without identity reference
        self.assertEqual(data["is_own"], False)

        # Verify overview for competitor (should have private metrics as 0.0 or 0)
        resp_overview = self.client.get(f"/api/analytics/channels/{data['id']}/overview")
        self.assertEqual(resp_overview.status_code, 200)
        overview = resp_overview.json()
        self.assertEqual(overview["views"], 50000)
        self.assertEqual(overview["subscribers"], 10000)
        self.assertEqual(overview["watch_time"], 0.0) # Private metric: 0
        self.assertEqual(overview["ctr"], 0.0)         # Private metric: 0

    @patch("services.analytics.collector.build")
    def test_normalization_and_archive(self, mock_build):
        mock_youtube = MagicMock()
        mock_build.return_value = mock_youtube

        # Mock channels response
        mock_youtube.channels().list().execute.return_value = {
            "items": [
                {
                    "id": "UCnormalized123",
                    "snippet": {
                        "title": "Normalized Channel",
                        "customUrl": "@normalized"
                    },
                    "statistics": {
                        "viewCount": "100",
                        "subscriberCount": "10"
                    }
                }
            ]
        }

        # 1. Observe via @handle (url format)
        resp = self.client.post(
            "/api/analytics/channels/observe",
            json={
                "external_channel_id": "https://www.youtube.com/@normalized",
                "analytics_type": "observed"
            }
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["external_channel_id"], "UCnormalized123")
        self.assertEqual(data["channel_name"], "Normalized Channel")
        self.assertEqual(data["is_archived"], False)

        channel_id = data["id"]

        # 2. Archive
        archive_resp = self.client.post(f"/api/analytics/channels/{channel_id}/archive")
        self.assertEqual(archive_resp.status_code, 200)
        
        # Verify it's archived (is_archived == True, sync_status == "DISABLED")
        from database.models import AnalyticsChannel
        db_channel = self.db.query(AnalyticsChannel).filter(AnalyticsChannel.id == channel_id).first()
        self.assertTrue(db_channel.is_archived)
        self.assertEqual(db_channel.sync_status, "DISABLED")

        # 3. Observe again (restoring logic)
        resp_restore = self.client.post(
            "/api/analytics/channels/observe",
            json={
                "external_channel_id": "UCnormalized123",
                "analytics_type": "observed"
            }
        )
        self.assertEqual(resp_restore.status_code, 200)
        data_restore = resp_restore.json()
        self.assertEqual(data_restore["is_archived"], False)
        self.assertNotEqual(data_restore["sync_status"], "DISABLED")

    @patch("api.analytics.sync_channel")
    @patch("api.analytics.SessionLocal")
    def test_async_sync_and_logs(self, mock_session_local, mock_sync_channel):
        from database.models import AnalyticsChannel, AnalyticsSyncLog
        from api.analytics import run_async_channel_sync

        # Setup mock SessionLocal to yield a new test DB session bound to in-memory db
        test_session = self.SessionLocal()
        mock_session_local.return_value = test_session

        # Create channel in DB
        channel = AnalyticsChannel(
            id="test-channel-id",
            external_channel_id="UCtest123",
            channel_name="Test Logging Channel",
            is_own=False,
            sync_status="pending"
        )
        self.db.add(channel)
        self.db.commit()

        # Run run_async_channel_sync (which spawns SessionLocal internally)
        run_async_channel_sync("test-channel-id")

        # Query database to check if status is SUCCESS
        self.db.expire_all()
        db_channel = self.db.query(AnalyticsChannel).filter(AnalyticsChannel.id == "test-channel-id").first()
        self.assertEqual(db_channel.sync_status, "SUCCESS")
        self.assertIsNotNone(db_channel.last_sync_duration_seconds)
        self.assertIsNotNone(db_channel.last_sync_at)

        # Check that sync log was created
        logs_resp = self.client.get("/api/analytics/sync-logs")
        self.assertEqual(logs_resp.status_code, 200)
        logs = logs_resp.json()
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0]["channel_name"], "Test Logging Channel")
        self.assertEqual(logs[0]["status"], "SUCCESS")
        self.assertIsNotNone(logs[0]["duration_seconds"])

    def test_explorer_endpoints_and_comparison(self):
        from database.models import AnalyticsChannel, AnalyticsSnapshot, AnalyticsVideo
        from datetime import datetime, timedelta, timezone

        # 1. Create channels
        ch1 = AnalyticsChannel(
            id="ch-1",
            external_channel_id="UCch1",
            channel_name="Channel One",
            is_own=True,
            analytics_type="owned",
            sync_status="SUCCESS",
            last_sync_at=datetime.now(timezone.utc)
        )
        ch2 = AnalyticsChannel(
            id="ch-2",
            external_channel_id="UCch2",
            channel_name="Channel Two",
            is_own=False,
            analytics_type="competitor",
            sync_status="SUCCESS",
            last_sync_at=datetime.now(timezone.utc)
        )
        self.db.add_all([ch1, ch2])
        self.db.commit()

        # 2. Add snapshots for timelines
        base_date = datetime.now(timezone.utc) - timedelta(days=5)
        for i in range(5):
            d = base_date + timedelta(days=i)
            # ch1 snapshots
            snap1 = AnalyticsSnapshot(
                id=f"snap-1-{i}",
                target_id="ch-1",
                target_type="channel",
                metric_source="youtube_analytics",
                snapshot_date=d,
                views=1000 + i * 200,
                subscribers=100 + i * 10
            )
            # ch2 snapshots
            snap2 = AnalyticsSnapshot(
                id=f"snap-2-{i}",
                target_id="ch-2",
                target_type="channel",
                metric_source="youtube_data_api",
                snapshot_date=d,
                views=5000 + i * 500,
                subscribers=500 + i * 5
            )
            self.db.add_all([snap1, snap2])
            
        # Add a video to ch1 to test publishing pattern & videos endpoint
        v1 = AnalyticsVideo(
            id="video-1",
            external_video_id="v1-ext",
            analytics_channel_id="ch-1",
            title="My video 1",
            published_at=datetime.now(timezone.utc) - timedelta(days=1),
            views=150,
            likes=10,
            comments=2
        )
        self.db.add(v1)
        self.db.commit()

        # Test GET /api/analytics/channels/ch-1/summary
        resp = self.client.get("/api/analytics/channels/ch-1/summary")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("channel", data)
        self.assertIn("overview", data)
        self.assertIn("publishing_pattern", data)
        self.assertIn("diagnostics", data)
        self.assertIn("meta", data)
        self.assertEqual(data["meta"]["collector_version"], "Analytics Collector v1.0")
        self.assertEqual(data["channel"]["channel_name"], "Channel One")

        # Test GET /api/analytics/channels/ch-1/timeline
        resp_timeline = self.client.get("/api/analytics/channels/ch-1/timeline?range=30")
        self.assertEqual(resp_timeline.status_code, 200)
        timeline_data = resp_timeline.json()
        self.assertIn("timeline", timeline_data)
        self.assertIn("subscriber_delta", timeline_data)
        self.assertGreater(len(timeline_data["timeline"]), 0)
        self.assertEqual(timeline_data["subscriber_delta"], 40)

        # Test GET /api/analytics/compare
        # Valid compare
        resp_compare = self.client.get("/api/analytics/compare?channel_ids=ch-1,ch-2")
        self.assertEqual(resp_compare.status_code, 200)
        comp_data = resp_compare.json()
        self.assertIn("subscribers_timeline", comp_data)
        self.assertIn("views_timeline", comp_data)
        self.assertIn("channels", comp_data)
        self.assertEqual(len(comp_data["channels"]), 2)
        
        # Verify normalization/alignment shape
        sub_t = comp_data["subscribers_timeline"]
        self.assertGreater(len(sub_t), 0)
        first_point = sub_t[0]
        self.assertIn("date", first_point)
        self.assertIn("ch-1", first_point)
        self.assertIn("ch-2", first_point)
        self.assertEqual(first_point["ch-1"], 100)
        self.assertEqual(first_point["ch-2"], 500)

        # Invalid compare: too few or too many
        resp_err1 = self.client.get("/api/analytics/compare?channel_ids=ch-1")
        self.assertEqual(resp_err1.status_code, 400)
        
        resp_err2 = self.client.get("/api/analytics/compare?channel_ids=ch-1,ch-2,ch-3,ch-4,ch-5,ch-6")
        self.assertEqual(resp_err2.status_code, 400)

