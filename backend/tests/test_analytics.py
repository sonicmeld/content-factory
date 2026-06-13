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
                "is_own": True,
                "workspace_id": "workspace-123"
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
                "is_own": False,
                "workspace_id": "workspace-123"
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
