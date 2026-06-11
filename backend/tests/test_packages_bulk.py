import os
import sys
import unittest
import tempfile
import shutil
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.models import Base, Channel, ContentPackage, Asset
from services import packages as package_service
from app.config import settings

class TestPackagesBulk(unittest.TestCase):
    def setUp(self):
        # Create an in-memory SQLite database
        self.engine = create_engine("sqlite:///:memory:")
        self.SessionLocal = sessionmaker(bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        self.db = self.SessionLocal()

        # Create temporary directory for settings.DATA_PATH
        self.temp_dir = tempfile.TemporaryDirectory()
        self.original_data_path = settings.DATA_PATH
        settings.DATA_PATH = self.temp_dir.name

        # Create channels directory inside temp directory
        os.makedirs(os.path.join(settings.DATA_PATH, "channels", "testchan", "video"), exist_ok=True)

        # Seed data
        self.channel = Channel(
            id="channel-1",
            name="Test Channel",
            slug="testchan"
        )
        self.db.add(self.channel)
        
        # Write a dummy video asset file
        self.asset_file_path = os.path.join(settings.DATA_PATH, "channels", "testchan", "video", "dummy.mp4")
        with open(self.asset_file_path, "wb") as f:
            f.write(b"dummy video data")

        self.asset = Asset(
            id="asset-1",
            channel_id="channel-1",
            asset_type="video",
            filename="my_video.mp4",
            file_path=self.asset_file_path,
            file_size=16,
            mime_type="video/mp4"
        )
        self.db.add(self.asset)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)
        settings.DATA_PATH = self.original_data_path
        self.temp_dir.cleanup()

    def test_create_packages_from_assets_success(self):
        import asyncio
        # Run async function using asyncio.run
        packages = asyncio.run(
            package_service.create_packages_from_assets(
                db=self.db,
                asset_ids=["asset-1"],
                channel_id="channel-1"
            )
        )
        
        self.assertEqual(len(packages), 1)
        pkg = packages[0]
        self.assertEqual(pkg.channel_id, "channel-1")
        self.assertEqual(pkg.package_number, "my_video")
        self.assertEqual(pkg.status, "draft")
        
        # Verify physical file copies
        expected_dir = os.path.join(settings.DATA_PATH, "channels", "testchan", "packages", "my_video")
        self.assertTrue(os.path.exists(expected_dir))
        self.assertTrue(os.path.exists(os.path.join(expected_dir, "video.mp4")))

    def test_create_packages_from_assets_with_timestamp_success(self):
        # Write a dummy timestamp asset file
        os.makedirs(os.path.join(settings.DATA_PATH, "channels", "testchan", "timestamp"), exist_ok=True)
        timestamp_file_path = os.path.join(settings.DATA_PATH, "channels", "testchan", "timestamp", "dummy.txt")
        with open(timestamp_file_path, "wb") as f:
            f.write(b"00:00:00 Intro")

        timestamp_asset = Asset(
            id="asset-txt",
            channel_id="channel-1",
            asset_type="timestamp",
            filename="my_video.txt",
            file_path=timestamp_file_path,
            file_size=14,
            mime_type="text/plain"
        )
        self.db.add(timestamp_asset)
        self.db.commit()

        import asyncio
        packages = asyncio.run(
            package_service.create_packages_from_assets(
                db=self.db,
                asset_ids=["asset-1"],
                channel_id="channel-1"
            )
        )
        
        self.assertEqual(len(packages), 1)
        pkg = packages[0]
        self.assertEqual(pkg.package_number, "my_video")
        self.assertIsNotNone(pkg.timestamp_path)
        self.assertTrue(os.path.exists(pkg.timestamp_path))
        self.assertTrue(pkg.timestamp_path.endswith("timestamp.txt"))

