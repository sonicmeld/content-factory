import os
import sys
import unittest
import tempfile
import json
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from database.database import get_db
from database.models import Base, Channel, GenerationCombo, PromptExpertDraft, PromptContext
from app.config import settings

class TestPromptExperts(unittest.TestCase):
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

        # Seed data
        self.channel = Channel(
            id="channel-1",
            name="Test Channel",
            slug="testchan"
        )
        self.db.add(self.channel)

        self.combo = GenerationCombo(
            id="combo-expert-1",
            name="gpt-4o",
            category="metadata",
            endpoint_type="chat",
            is_active=1
        )
        self.db.add(self.combo)

        # Seed an existing draft
        self.draft1 = PromptExpertDraft(
            id="draft-123",
            workspace_id="channel-1",
            expert_type="metadata",
            combo_id="combo-expert-1",
            input_text="elon musk robot",
            topic="Elon Musk and AI Tesla Robot Optimus",
            keywords=json.dumps(["elon musk", "robot", "optimus"]),
            notes="Focus on visual elements",
            status="draft"
        )
        self.db.add(self.draft1)

        self.db.commit()

        # Mock settings config
        settings.NINE_ROUTER_URL = "http://mock-9router.api"
        settings.NINE_ROUTER_API_KEY = "mock-key"

    def tearDown(self):
        app.dependency_overrides.clear()
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    @patch("httpx.AsyncClient.post", new_callable=AsyncMock)
    def test_generate_draft_success(self, mock_post):
        # Mock httpx response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": '{"topic": "SpaceX Starship Launch", "keywords": ["spacex", "starship", "mars"], "notes": "Cinematic and grand"}'
                    }
                }
            ]
        }
        mock_post.return_value = mock_response

        # Call endpoint
        response = self.client.post(
            "/api/prompt-experts/generate",
            json={
                "workspace_id": "channel-1",
                "expert_type": "metadata",
                "combo_id": "combo-expert-1",
                "input_text": "spacex starship"
            }
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("id", data)
        self.assertEqual(data["topic"], "SpaceX Starship Launch")
        self.assertEqual(data["keywords"], ["spacex", "starship", "mars"])
        self.assertEqual(data["notes"], "Cinematic and grand")
        self.assertEqual(data["status"], "draft")
        self.assertEqual(data["expert_type"], "metadata")

        # Verify draft is saved to database
        db_draft = self.db.query(PromptExpertDraft).filter(PromptExpertDraft.id == data["id"]).first()
        self.assertIsNotNone(db_draft)
        self.assertEqual(db_draft.topic, "SpaceX Starship Launch")

    def test_get_drafts_pending(self):
        response = self.client.get("/api/prompt-experts/drafts?workspace_id=channel-1")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["id"], "draft-123")
        self.assertEqual(data[0]["topic"], "Elon Musk and AI Tesla Robot Optimus")

    def test_approve_draft_success(self):
        response = self.client.post(
            "/api/prompt-experts/drafts/draft-123/approve",
            json={
                "channel_id": "channel-1",
                "title": "Elon Musk Approved Prompt",
                "prompt_type": "metadata",
                "topic": "Optimized Elon Topic",
                "keywords": "elon, musk, robot",
                "notes": "Tone: excited"
            }
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["title"], "Elon Musk Approved Prompt")
        self.assertEqual(data["topic"], "Optimized Elon Topic")

        # Check draft status is now approved
        self.db.refresh(self.draft1)
        self.assertEqual(self.draft1.status, "approved")

        # Check if PromptContext is created in database
        context = self.db.query(PromptContext).filter(PromptContext.title == "Elon Musk Approved Prompt").first()
        self.assertIsNotNone(context)
        self.assertEqual(context.channel_id, "channel-1")
        self.assertEqual(context.topic, "Optimized Elon Topic")

    def test_discard_draft_success(self):
        response = self.client.post("/api/prompt-experts/drafts/draft-123/discard")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"message": "Draft discarded successfully"})

        # Check draft status is now discarded
        self.db.refresh(self.draft1)
        self.assertEqual(self.draft1.status, "discarded")

        # Verify it is no longer listed as pending
        response = self.client.get("/api/prompt-experts/drafts?workspace_id=channel-1")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 0)
