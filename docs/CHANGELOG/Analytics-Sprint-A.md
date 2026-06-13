# Changelog — Analytics Sprint A: Registry & Collector Foundation

## 1. Database Model Additions
*   **Analytics Tables**: Added SQL structures (`53245d76fea0_add_youtube_analytics_and_insights_tables.py` migration) to record:
    *   `AnalyticsChannel`: Sync statuses, handles, timestamps, and archiving.
    *   `AnalyticsChannelIdentity`: Linking owned channels (`is_own = True`) with OAuth profiles.
    *   `AnalyticsWorkspaceLink`: Mapping observed channels to workspace sub-channels.
    *   `AnalyticsVideo`: Video items.
    *   `AnalyticsSnapshot`: Daily metric records (watch time, views, subs, impressions, CTR, likes, comments).
    *   `GoogleTrendsSnapshot`: Interest trends and keywords.
    *   `AnalyticsInsight`: Generated insights.
*   **Alembic Schema Adjustments (`809e0d5211dd_review_analytics_sprinta.py`)**: Added `analytics_type` column (`owned`, `competitor`, `observed`) to avoid request-level inferences, and renamed `workspace_id` to `channel_id` on mapping tables.

## 2. API Endpoints & Health Check
*   **Registry REST Routers (`/api/analytics`)**: Exposed observed channel registry creation, OAuth linking, listing filters, and sync logging endpoints.
*   **Health endpoint (`GET /api/analytics/health`)**: Aggregates collector health metrics, sync queues, error counts, and last-run times to prevent client waterfalls.
*   **Archiving Action (`POST /channels/{id}/archive`)**: Performs logical archiving (setting status `DISABLED`) without deleting past snapshot performance data.

## 3. Collector Service Layer
*   **Owned Sync (`sync_owned_channel`)**: Resolves sub-channel OAuth tokens, querying private statistics (CTR, watch time, impressions) from the YouTube Analytics API. Fallbacks translate metrics if permissions are in sandbox.
*   **Competitor Sync (`sync_competitor_channel`)**: Pulls public counts (views, subscribers, public videos) via the YouTube Data API. Sets private metrics to null.
*   **Asynchronous Wrapping (`run_async_channel_sync`)**: Isolates requests in standard DB sessions to prevent scoped transaction conflicts.
*   **Log Retention Manager**: Automatic job cleanup purging sync logs older than 90 days or when database record counts exceed 10,000 logs.

## 4. Frontend Integration
*   Created type definitions and mapped routes for the Analytics Hub.
*   Developed the central Analytics Hub dashboard consisting of the health widgets, Registry management tabs, OAuth Identity Mapping tables, Workspace Assignments, and active Observation logs.
