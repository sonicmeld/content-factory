import unittest
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.models import Base, Channel, ContentPackage, PackageGeneration
from app.config import settings
from services import generation_service

# Setup in-memory SQLite DB for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class TestGenerationStudioService(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(bind=engine)
        self.db = TestingSessionLocal()

        # Seed data
        self.channel = Channel(
            id="test-channel-id",
            name="Test Channel",
            slug="test-channel-slug",
            metadata_combo="YT_Research",
            thumbnail_combo="YT_Thumbnail",
            footage_combo="YT_Footage",
            is_active=1
        )
        self.db.add(self.channel)

        self.package = ContentPackage(
            id="test-package-id",
            channel_id="test-channel-id",
            package_number="YT-001",
            video_path="channels/test-channel-slug/packages/YT-001.mp4",
            timestamp_path=None,
            status="draft"
        )
        self.db.add(self.package)
        self.db.commit()

        # Mock settings
        settings.NINE_ROUTER_URL = "http://mock-9router.api/v1"
        settings.NINE_ROUTER_API_KEY = "mock-key"

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=engine)

    @patch("requests.post")
    def test_generate_metadata_success(self, mock_post):
        # Mock 9Router response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": "Title: Awesome YouTube Video Title\nDescription: This is a generated description of the video."
                    }
                }
            ]
        }
        mock_post.return_value = mock_response

        # Call service directly
        gen = generation_service.generate_metadata(self.db, "test-package-id")
        self.assertIsNotNone(gen)
        self.assertEqual(gen.metadata_status, "completed")
        self.assertEqual(gen.title, "Awesome YouTube Video Title")
        self.assertEqual(gen.description, "This is a generated description of the video.")
        self.assertIsNone(gen.error_message)

        # Verify 9Router was called with correct payload
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        self.assertEqual(args[0], "http://mock-9router.api/v1/chat/completions")
        self.assertEqual(kwargs["json"]["model"], "YT_Research")
        self.assertEqual(kwargs["headers"]["Authorization"], "Bearer mock-key")

    @patch("requests.post")
    def test_generate_metadata_9router_failure(self, mock_post):
        # Mock 9Router exception
        mock_post.side_effect = Exception("Connection refused by mock 9Router")

        # Call service directly, expecting the exception to be raised to the caller,
        # but the database record is updated to failed first
        with self.assertRaises(Exception):
            generation_service.generate_metadata(self.db, "test-package-id")

        # Verify DB records the failed status and error message
        gen = self.db.query(PackageGeneration).filter_by(package_id="test-package-id").first()
        self.assertIsNotNone(gen)
        self.assertEqual(gen.metadata_status, "failed")
        self.assertIn("Connection refused", gen.error_message)

    @patch("requests.post")
    def test_generate_metadata_direct_json_success(self, mock_post):
        # Mock 9Router direct JSON response (Combo metadata output format)
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "title": "Direct JSON Title",
            "description": "Direct JSON Description text content."
        }
        mock_post.return_value = mock_response

        # Call service directly
        gen = generation_service.generate_metadata(self.db, "test-package-id")
        self.assertIsNotNone(gen)
        self.assertEqual(gen.metadata_status, "completed")
        self.assertEqual(gen.title, "Direct JSON Title")
        self.assertEqual(gen.description, "Direct JSON Description text content.")
        self.assertIsNone(gen.error_message)


if __name__ == "__main__":
    unittest.main()
