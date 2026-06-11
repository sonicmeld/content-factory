import os
import sys
import unittest
from unittest.mock import patch, MagicMock

# Add backend directory to path if needed
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database.models import Base, Channel, ContentPackage, PromptContext, PackageGeneration, GenerationCombo
from services import generation_service
from app.config import settings

class TestGenerationStudio(unittest.TestCase):
    def setUp(self):
        # Create an in-memory SQLite database
        self.engine = create_engine("sqlite:///:memory:")
        self.SessionLocal = sessionmaker(bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        self.db = self.SessionLocal()

        # Create temporary directory for settings.DATA_PATH
        import tempfile
        self.temp_dir = tempfile.TemporaryDirectory()
        self.original_data_path = settings.DATA_PATH
        settings.DATA_PATH = self.temp_dir.name

        # Seed data
        self.channel1 = Channel(
            id="channel-1",
            name="Woodworking channel",
            slug="woodworking",
            metadata_combo="test-model",
            thumbnail_combo="test-image-model"
        )
        self.channel2 = Channel(
            id="channel-2",
            name="Cooking channel",
            slug="cooking",
            metadata_combo="test-model-2"
        )

        self.package1 = ContentPackage(
            id="package-1",
            channel_id="channel-1",
            package_number="001",
            video_path="path/to/video1.mp4",
            timestamp_path=None,
            status="draft"
        )

        self.context1 = PromptContext(
            id="context-1",
            channel_id="channel-1",
            title="Woodworking Tips",
            topic="10 tips",
            keywords="diy, wood",
            notes="Targeting beginners"
        )

        self.context_wrong_channel = PromptContext(
            id="context-wrong",
            channel_id="channel-2",
            title="Cooking Tips",
            topic="10 cooking tips",
            keywords="cooking, food",
            notes="Targeting chefs"
        )

        self.db.add(self.channel1)
        self.db.add(self.channel2)
        self.db.add(self.package1)
        self.db.add(self.context1)
        self.db.add(self.context_wrong_channel)
        
        # Add combos
        self.combo1 = GenerationCombo(
            id="combo-1",
            name="test-model",
            category="metadata",
            endpoint_type="chat",
            is_active=1
        )
        self.combo2 = GenerationCombo(
            id="combo-2",
            name="test-image-model",
            category="thumbnail",
            endpoint_type="image",
            is_active=1
        )
        self.db.add(self.combo1)
        self.db.add(self.combo2)
        
        self.db.commit()

        # Mock settings config
        settings.NINE_ROUTER_URL = "http://mock-9router.api"
        settings.NINE_ROUTER_API_KEY = "mock-key"

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)
        settings.DATA_PATH = self.original_data_path
        self.temp_dir.cleanup()

    @patch("services.generation_service.requests.post")
    def test_metadata_generation_without_context_id(self, mock_post):
        # Mock 9Router response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.headers = {"content-type": "application/json"}
        mock_response.text = '{"choices": [{"message": {"content": "Title: Hello Woodworking\\nDescription: First woodworking video!"}}]}'
        mock_response.json.return_value = {
            "choices": [{"message": {"content": "Title: Hello Woodworking\nDescription: First woodworking video!"}}]
        }
        mock_post.return_value = mock_response

        # Execute
        res = generation_service.generate_metadata(self.db, "package-1", context_id=None)

        # Assertions
        self.assertEqual(res.metadata_status, "completed")
        from database.models import MetadataVariant
        variants = self.db.query(MetadataVariant).filter(MetadataVariant.package_generation_id == res.id).all()
        self.assertEqual(len(variants), 1)
        self.assertEqual(variants[0].title, "Hello Woodworking")
        self.assertEqual(variants[0].description, "First woodworking video!")
        
        # Verify backward compatibility with Sprint 7A-3:
        # payload must only contain channel info, package number and video file
        mock_post.assert_called_once()
        called_args, called_kwargs = mock_post.call_args
        payload = called_kwargs["json"]
        user_content = payload["messages"][1]["content"]
        self.assertIn("Channel: Woodworking channel", user_content)
        self.assertIn("Package Number: 001", user_content)
        self.assertIn("Video File: video1.mp4", user_content)
        self.assertNotIn("=== CHANNEL CONTEXT ===", user_content)

    @patch("services.generation_service.requests.post")
    def test_metadata_generation_with_context_id(self, mock_post):
        # Mock 9Router response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.headers = {"content-type": "application/json"}
        mock_response.text = '{"choices": [{"message": {"content": "Title: Real Woodworking\\nDescription: Great woodworking tips!"}}]}'
        mock_response.json.return_value = {
            "choices": [{"message": {"content": "Title: Real Woodworking\nDescription: Great woodworking tips!"}}]
        }
        mock_post.return_value = mock_response

        # Execute
        res = generation_service.generate_metadata(self.db, "package-1", context_id="context-1")

        # Assertions
        self.assertEqual(res.metadata_status, "completed")
        from database.models import MetadataVariant
        variants = self.db.query(MetadataVariant).filter(MetadataVariant.package_generation_id == res.id).all()
        self.assertEqual(len(variants), 1)
        self.assertEqual(variants[0].title, "Real Woodworking")
        self.assertEqual(variants[0].description, "Great woodworking tips!")
        
        mock_post.assert_called_once()
        called_args, called_kwargs = mock_post.call_args
        payload = called_kwargs["json"]
        user_content = payload["messages"][1]["content"]
        
        # Verify context payload injection format
        self.assertIn("=== WOODWORKING TIPS ===", user_content)
        self.assertIn("Topic: 10 tips", user_content)
        self.assertIn("Keywords: diy, wood", user_content)
        self.assertIn("Notes: Targeting beginners", user_content)
        self.assertIn("=== PACKAGE INFORMATION ===", user_content)
        self.assertIn("Channel: Woodworking channel", user_content)
        self.assertIn("Package Number: 001", user_content)
        self.assertIn("Video File: video1.mp4", user_content)

    @patch("services.generation_service.requests.post")
    def test_channel_ownership_validation(self, mock_post):
        # Passing wrong context_id should raise ValueError
        with self.assertRaises(ValueError) as context:
            generation_service.generate_metadata(self.db, "package-1", context_id="context-wrong")
        
        self.assertEqual(str(context.exception), "Prompt Context does not belong to Package Channel")
        mock_post.assert_not_called()

    @patch("services.image_service.requests.post")
    def test_thumbnail_generation_without_context_id(self, mock_post):
        # Mock 9Router response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": [{"b64_json": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="}]
        }
        mock_post.return_value = mock_response

        # Execute
        res = generation_service.generate_thumbnail(self.db, "package-1", context_id=None)

        # Assertions
        self.assertEqual(res.thumbnail_status, "completed")
        self.assertTrue(res.thumbnail_path.startswith("thumb_"))
        self.assertTrue(res.thumbnail_path.endswith(".png"))

        # Verify file is physically saved
        saved_file_path = os.path.join(
            settings.DATA_PATH, "channels", "woodworking", "assets", "thumbnails", res.thumbnail_path
        )
        self.assertTrue(os.path.exists(saved_file_path))

        # Verify 9Router payload uses combo as model
        mock_post.assert_called_once()
        called_args, called_kwargs = mock_post.call_args
        payload = called_kwargs["json"]
        self.assertEqual(payload["model"], "test-image-model")
        user_content = payload["prompt"]
        self.assertIn("=== PACKAGE INFORMATION ===", user_content)
        self.assertIn("Channel: Woodworking channel", user_content)
        self.assertIn("Package Number: 001", user_content)
        self.assertNotIn("=== CHANNEL CONTEXT ===", user_content)

    @patch("services.image_service.requests.post")
    def test_thumbnail_generation_with_context_id(self, mock_post):
        # Mock 9Router response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": [{"b64_json": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="}]
        }
        mock_post.return_value = mock_response

        # Execute
        res = generation_service.generate_thumbnail(self.db, "package-1", context_id="context-1")

        # Assertions
        self.assertEqual(res.thumbnail_status, "completed")
        
        # Verify prompt context payload injection format
        called_args, called_kwargs = mock_post.call_args
        payload = called_kwargs["json"]
        user_content = payload["prompt"]
        self.assertIn("=== WOODWORKING TIPS ===", user_content)
        self.assertIn("Topic: 10 tips", user_content)
        self.assertIn("Keywords: diy, wood", user_content)
        self.assertIn("Notes: Targeting beginners", user_content)
        self.assertIn("=== PACKAGE INFORMATION ===", user_content)

    @patch("services.image_service.requests.post")
    def test_thumbnail_generation_combo_missing(self, mock_post):
        # Update channel to have empty thumbnail_combo
        self.channel1.thumbnail_combo = ""
        self.db.commit()

        from fastapi import HTTPException
        with self.assertRaises(HTTPException) as context:
            generation_service.generate_thumbnail(self.db, "package-1", context_id=None)

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(context.exception.detail, "Selected Combo is missing or inactive.")
        mock_post.assert_not_called()

    @patch("services.image_service.requests.post")
    def test_thumbnail_channel_ownership_validation(self, mock_post):
        with self.assertRaises(ValueError) as context:
            generation_service.generate_thumbnail(self.db, "package-1", context_id="context-wrong")

        self.assertEqual(str(context.exception), "Prompt Context does not belong to Package Channel")
        mock_post.assert_not_called()
