import os
import sys
import unittest
import tempfile
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from database.database import get_db
from database.models import Base, Channel, ExternalAccount, ConnectorJob, AssetInbox
from app.config import settings

from sqlalchemy.pool import StaticPool

class TestConnectors(unittest.TestCase):
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

        # Create temporary directory for settings.DATA_PATH
        self.temp_dir = tempfile.TemporaryDirectory()
        self.original_data_path = settings.DATA_PATH
        settings.DATA_PATH = self.temp_dir.name

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
        self.db.commit()

    def tearDown(self):
        app.dependency_overrides.clear()
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)
        settings.DATA_PATH = self.original_data_path
        self.temp_dir.cleanup()

    def test_accounts_crud(self):
        # Create account
        response = self.client.post(
            "/api/connectors/accounts",
            json={
                "workspace_id": "default",
                "provider": "Google Flow",
                "account_name": "Gmail A",
                "profile_name": "Profile 1"
            }
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        account_id = data["id"]
        self.assertEqual(data["workspace_id"], "default")
        self.assertEqual(data["provider"], "Google Flow")
        self.assertEqual(data["account_name"], "Gmail A")

        # Get accounts
        response = self.client.get("/api/connectors/accounts?workspace_id=default")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

        # Update account
        response = self.client.patch(
            f"/api/connectors/accounts/{account_id}",
            json={"account_name": "Gmail B"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["account_name"], "Gmail B")

        # Delete account
        response = self.client.delete(f"/api/connectors/accounts/{account_id}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["message"], "External account deleted successfully")

    def test_connector_jobs(self):
        # Create job
        response = self.client.post(
            "/api/connectors/jobs",
            json={
                "workspace_id": "default",
                "project_id": "channel-1",
                "provider": "Google Flow",
                "asset_type": "thumbnail",
                "prompt": "Test prompt woodworking"
            }
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "pending")
        self.assertEqual(data["prompt"], "Test prompt woodworking")

        # Get active job
        response = self.client.get("/api/connectors/jobs/active?project_id=channel-1")
        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(response.json())
        self.assertEqual(response.json()["project_id"], "channel-1")

    def test_inbox_operations(self):
        # Create dummy file to upload
        dummy_file_path = os.path.join(settings.DATA_PATH, "dummy.png")
        with open(dummy_file_path, "wb") as f:
            f.write(b"dummy image content")

        with open(dummy_file_path, "rb") as f:
            response = self.client.post(
                "/api/connectors/inbox/upload",
                data={
                    "workspace_id": "default",
                    "project_id": "channel-1",
                    "source": "Flow",
                    "asset_type": "thumbnail"
                },
                files={"file": ("dummy.png", f, "image/png")}
            )
        self.assertEqual(response.status_code, 200)
        inbox_data = response.json()
        inbox_id = inbox_data["id"]
        self.assertEqual(inbox_data["status"], "pending")
        self.assertEqual(inbox_data["source"], "Flow")

        # Fetch inbox list
        response = self.client.get("/api/connectors/inbox?project_id=channel-1")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

        # Approve item
        response = self.client.post(f"/api/connectors/inbox/{inbox_id}/approve")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "approved")

        # Verify that file has been moved to channel assets
        expected_channel_dir = os.path.join(settings.DATA_PATH, "channels", "testchan", "thumbnail")
        self.assertTrue(os.path.exists(expected_channel_dir))
        self.assertEqual(len(os.listdir(expected_channel_dir)), 1)
