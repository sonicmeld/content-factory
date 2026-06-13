import os
import sys
import unittest
import hashlib
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from database.database import get_db
from database.models import Base, CompanionRuntime, SystemSetting

class TestCompanion(unittest.TestCase):
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

        # Seed registration system setting
        self.db.add(SystemSetting(key="allow_runtime_registration", value="1"))
        self.db.commit()

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

    def test_register_success(self):
        payload = {
            "runtime_name": "flow-thumbnail",
            "client_id": "client-uuid-1"
        }
        response = self.client.post("/api/companion/register", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("runtime_id", data)
        self.assertIn("api_key", data)

        # Check DB entry exists and hash matches
        runtime_id = data["runtime_id"]
        api_key = data["api_key"]
        
        db_runtime = self.db.query(CompanionRuntime).filter(CompanionRuntime.id == runtime_id).first()
        self.assertIsNotNone(db_runtime)
        self.assertEqual(db_runtime.runtime_name, "flow-thumbnail")
        self.assertEqual(db_runtime.client_id, "client-uuid-1")
        
        expected_hash = hashlib.sha256(api_key.encode()).hexdigest()
        self.assertEqual(db_runtime.api_key_hash, expected_hash)

    def test_register_disabled(self):
        # Disable registration
        reg_setting = self.db.query(SystemSetting).filter(SystemSetting.key == "allow_runtime_registration").first()
        reg_setting.value = "0"
        self.db.commit()

        payload = {
            "runtime_name": "flow-footage",
            "client_id": "client-uuid-2"
        }
        response = self.client.post("/api/companion/register", json=payload)
        self.assertEqual(response.status_code, 403)
        self.assertIn("disabled", response.json()["detail"])

    def test_register_duplicate_name(self):
        payload = {
            "runtime_name": "flow-thumbnail",
            "client_id": "client-uuid-1"
        }
        # First registration
        resp1 = self.client.post("/api/companion/register", json=payload)
        self.assertEqual(resp1.status_code, 200)

        # Duplicate name
        payload2 = {
            "runtime_name": "flow-thumbnail",
            "client_id": "client-uuid-2"
        }
        resp2 = self.client.post("/api/companion/register", json=payload2)
        self.assertEqual(resp2.status_code, 400)
        self.assertIn("already registered", resp2.json()["detail"])

    def test_register_duplicate_client_id(self):
        payload = {
            "runtime_name": "flow-thumbnail",
            "client_id": "client-uuid-1"
        }
        # First registration
        resp1 = self.client.post("/api/companion/register", json=payload)
        self.assertEqual(resp1.status_code, 200)

        # Duplicate client_id
        payload2 = {
            "runtime_name": "flow-footage",
            "client_id": "client-uuid-1"
        }
        resp2 = self.client.post("/api/companion/register", json=payload2)
        self.assertEqual(resp2.status_code, 400)
        self.assertIn("already registered", resp2.json()["detail"])

    def test_heartbeat_and_me(self):
        # 1. Register a runtime
        payload = {
            "runtime_name": "flow-thumbnail",
            "client_id": "client-uuid-1"
        }
        resp_reg = self.client.post("/api/companion/register", json=payload)
        reg_data = resp_reg.json()
        api_key = reg_data["api_key"]

        # 2. Test Heartbeat
        headers = {
            "X-Client-Id": "client-uuid-1",
            "Authorization": f"Bearer {api_key}"
        }
        resp_hb = self.client.post("/api/companion/heartbeat", headers=headers)
        self.assertEqual(resp_hb.status_code, 200)
        self.assertEqual(resp_hb.json(), {"status": "ok"})

        # Verify DB updated
        db_runtime = self.db.query(CompanionRuntime).filter(CompanionRuntime.client_id == "client-uuid-1").first()
        self.assertEqual(db_runtime.status, "online")
        self.assertIsNotNone(db_runtime.last_seen_at)

        # 3. Test Me Endpoint
        resp_me = self.client.get("/api/companion/me", headers=headers)
        self.assertEqual(resp_me.status_code, 200)
        me_data = resp_me.json()
        self.assertEqual(me_data["runtime_name"], "flow-thumbnail")
        self.assertEqual(me_data["client_id"], "client-uuid-1")
        self.assertEqual(me_data["status"], "online")

    def test_heartbeat_unauthorized(self):
        # 1. Register
        payload = {
            "runtime_name": "flow-thumbnail",
            "client_id": "client-uuid-1"
        }
        resp_reg = self.client.post("/api/companion/register", json=payload)
        reg_data = resp_reg.json()
        api_key = reg_data["api_key"]

        # 2. Heartbeat with wrong key
        headers_wrong_key = {
            "X-Client-Id": "client-uuid-1",
            "Authorization": "Bearer wrong-key"
        }
        resp = self.client.post("/api/companion/heartbeat", headers=headers_wrong_key)
        self.assertEqual(resp.status_code, 401)

        # 3. Heartbeat with wrong client ID
        headers_wrong_client = {
            "X-Client-Id": "wrong-client",
            "Authorization": f"Bearer {api_key}"
        }
        resp = self.client.post("/api/companion/heartbeat", headers=headers_wrong_client)
        self.assertEqual(resp.status_code, 401)

    def test_runtimes_list(self):
        # Register two runtimes
        self.client.post("/api/companion/register", json={"runtime_name": "flow-thumbnail", "client_id": "c1"})
        self.client.post("/api/companion/register", json={"runtime_name": "flow-footage", "client_id": "c2"})

        response = self.client.get("/api/companion/runtimes")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]["runtime_name"], "flow-footage")
        self.assertEqual(data[1]["runtime_name"], "flow-thumbnail")

    def test_revoke_runtime(self):
        # 1. Register a runtime
        payload = {
            "runtime_name": "flow-thumbnail",
            "client_id": "client-uuid-1"
        }
        resp_reg = self.client.post("/api/companion/register", json=payload)
        reg_data = resp_reg.json()
        runtime_id = reg_data["runtime_id"]
        api_key = reg_data["api_key"]

        headers = {
            "X-Client-Id": "client-uuid-1",
            "Authorization": f"Bearer {api_key}"
        }

        # Verify active
        self.assertEqual(self.client.post("/api/companion/heartbeat", headers=headers).status_code, 200)

        # 2. Revoke
        resp_rev = self.client.post(f"/api/companion/runtimes/{runtime_id}/revoke")
        self.assertEqual(resp_rev.status_code, 200)

        # Check DB flag
        db_runtime = self.db.query(CompanionRuntime).filter(CompanionRuntime.id == runtime_id).first()
        self.assertEqual(db_runtime.is_revoked, 1)

        # 3. Heartbeat should now fail with 401
        self.assertEqual(self.client.post("/api/companion/heartbeat", headers=headers).status_code, 401)

        # 4. Check list status shows revoked
        resp_list = self.client.get("/api/companion/runtimes")
        self.assertEqual(resp_list.json()[0]["status"], "revoked")
