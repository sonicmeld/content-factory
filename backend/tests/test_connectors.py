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
from database.models import Base, Channel, ExternalAccount, ConnectorJob, AssetInbox, PromptContext
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

        # Seed channel data
        self.channel = Channel(
            id="channel-1",
            name="Test Channel",
            slug="testchan"
        )
        self.db.add(self.channel)
        self.db.commit()

        # Seed prompt context data
        self.prompt_ctx = PromptContext(
            id="prompt-123",
            channel_id="channel-1",
            title="Cool Woodworking Wood",
            notes="Please generate a nice woodwork thumbnail."
        )
        self.db.add(self.prompt_ctx)
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
                "provider": "Google Flow",
                "asset_type": "thumbnail",
                "prompt_id": "prompt-123"
            }
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        job_id = data["id"]
        self.assertEqual(data["status"], "pending")
        # Dynamic resolution checks
        self.assertEqual(data["channel_id"], "channel-1")
        self.assertEqual(data["prompt"], "Please generate a nice woodwork thumbnail.")

        # Get active job filtered by channel_id
        response = self.client.get("/api/connectors/jobs/active?channel_id=channel-1")
        self.assertEqual(response.status_code, 200)
        active_job = response.json()
        self.assertIsNotNone(active_job)
        self.assertEqual(active_job["id"], job_id)
        self.assertEqual(active_job["channel_id"], "channel-1")

        # Get details by ID which transitions status to 'opened'
        response = self.client.get(f"/api/connectors/jobs/{job_id}")
        self.assertEqual(response.status_code, 200)
        details = response.json()
        self.assertEqual(details["status"], "opened")

    def test_inbox_operations(self):
        # Create dummy file to upload
        dummy_file_path = os.path.join(settings.DATA_PATH, "dummy.png")
        with open(dummy_file_path, "wb") as f:
            f.write(b"dummy image content")

        # Create a job first to link source_id
        job_response = self.client.post(
            "/api/connectors/jobs",
            json={
                "workspace_id": "default",
                "provider": "Google Flow",
                "asset_type": "thumbnail",
                "prompt_id": "prompt-123"
            }
        )
        self.assertEqual(job_response.status_code, 200)
        job_id = job_response.json()["id"]

        with open(dummy_file_path, "rb") as f:
            response = self.client.post(
                "/api/connectors/inbox/upload",
                data={
                    "workspace_id": "default",
                    "source": "Flow",
                    "source_id": job_id,
                    "asset_type": "thumbnail",
                    "metadata": '{"generation_time": 12.5}'
                },
                files={"file": ("dummy.png", f, "image/png")}
            )
        self.assertEqual(response.status_code, 200)
        inbox_data = response.json()
        inbox_id = inbox_data["id"]
        self.assertEqual(inbox_data["status"], "pending")
        self.assertEqual(inbox_data["source"], "Flow")
        self.assertEqual(inbox_data["source_id"], job_id)
        self.assertEqual(inbox_data["metadata"], '{"generation_time": 12.5}')

        # Fetch inbox list
        response = self.client.get("/api/connectors/inbox?workspace_id=default")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

        # Approve item routing to a channel
        response = self.client.post(
            f"/api/connectors/inbox/{inbox_id}/approve",
            json={"channel_id": "channel-1"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "approved")

        # Verify that file has been moved to channel assets
        expected_channel_dir = os.path.join(settings.DATA_PATH, "channels", "testchan", "thumbnail")
        self.assertTrue(os.path.exists(expected_channel_dir))
        self.assertEqual(len(os.listdir(expected_channel_dir)), 1)

        # Verify job status was marked completed
        job_status_response = self.client.get(f"/api/connectors/jobs/{job_id}")
        self.assertEqual(job_status_response.status_code, 200)
        self.assertEqual(job_status_response.json()["status"], "completed")

    def test_inbox_approve_to_shared_library(self):
        # Create dummy file to upload
        dummy_file_path = os.path.join(settings.DATA_PATH, "dummy_shared.png")
        with open(dummy_file_path, "wb") as f:
            f.write(b"dummy image shared content")

        with open(dummy_file_path, "rb") as f:
            response = self.client.post(
                "/api/connectors/inbox/upload",
                data={
                    "workspace_id": "default",
                    "source": "Flow",
                    "asset_type": "thumbnail"
                },
                files={"file": ("dummy_shared.png", f, "image/png")}
            )
        self.assertEqual(response.status_code, 200)
        inbox_id = response.json()["id"]

        # Approve item routing to global shared library (channel_id=None)
        response = self.client.post(
            f"/api/connectors/inbox/{inbox_id}/approve",
            json={"channel_id": None}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "approved")

        # Verify that file has been moved to global shared assets
        expected_shared_dir = os.path.join(settings.DATA_PATH, "shared", "thumbnail")
        self.assertTrue(os.path.exists(expected_shared_dir))
        self.assertEqual(len(os.listdir(expected_shared_dir)), 1)
