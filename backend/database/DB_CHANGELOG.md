# DB Changelog

## Sprint 4

### content_packages

**OLD**
- `video_asset_id`
- `timestamp_asset_id`

**NEW**
- `video_path`
- `timestamp_path`

**Reason:**
Content Package is now file-based.
Asset Library is no longer used for video ingestion.

## Sprint 5B

### upload_queue
**NEW TABLE**
- `package_id`
- `channel_id`
- `queue_position`
- `created_at`

**Reason:**
Queue management domain.
