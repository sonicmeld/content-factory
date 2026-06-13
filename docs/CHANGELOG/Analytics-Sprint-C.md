# Changelog — Analytics Sprint C: Insight Engine & Opportunity Detection

## 1. Database & Schema Migration
*   **Batch Alter Table Migration**: Executed migration `d0315cf39f82_recreate_analytics_insights` utilizing Alembic's batch operations to modify the SQLite table `analytics_insights` safely without dropping historical records.
*   **Column Upgrades**: Refactored the database schema to include `channel_id`, `insight_source`, `severity`, `status` (`active` | `resolved` | `dismissed` | `archived`), `entity_type`, `entity_id`, `engine_version`, `fingerprint` (indexed SHA-1 hash), `description`, `score`, `evidence_json`, `first_detected_at`, and `last_detected_at`.

## 2. Deterministic Insight Engine Core
*   **Fingerprint De-duplication**: Implemented hash generation using a secure SHA-1 checksum of `channel_id:insight_type:entity_type:entity_id` to prevent record bloat across synchronized snapshots.
*   **Soft Archival Lifecycle**: Configured engine to safely transition previously active insights that are not detected in the current run to `archived` status instead of deleting them.
*   **Rule Engine Implemented**:
    *   **Growth Engine**: Detects views decline (`growth_decline`), subscriber decline (`subscriber_decline`), and subscriber acceleration (`subscriber_acceleration`).
    *   **Upload Engine**: Analyzes publication consistency against expectations (daily, weekly, monthly).
    *   **Competitor Engine**: Evaluates channel growth against the calculated **median** of observed competitors within the same workspace.
    *   **Thumbnail Engine**: Triggers warnings if a video's relative CTR drops below `average_channel_ctr * 0.7`.
    *   **Opportunity Engine**: Calculates a normalized **Opportunity Score (0-100)** using linear combination weights for views, likes ratio, comments ratio, and growth velocity.

## 3. REST API Routers
*   **Insights Retrieval (`GET /api/analytics/channels/{id}/insights`)**: Serves active insights ordered by severity and score.
*   **Opportunity Board (`GET /api/analytics/channels/{id}/opportunities`)**: Returns high-scoring organic video opportunities.
*   **Manual Refresh (`POST /api/analytics/channels/{id}/refresh-insights`)**: Triggers manual engine execution returning duration metrics.
*   **Status Management (`POST /api/analytics/insights/{id}/status`)**: Allows changing insight status (e.g. dismissing warnings).
*   **Summary Route Integration**: Added `insights` object with active counts for full compatibility with Sprint B explorer entrypoints.

## 4. Frontend UI & Dashboard Integration
*   **Live Dashboard**: Replaced the static roadmap tab inside `AnalyticsChannelExplorer.tsx` with a live interactive console containing a summary metrics banner, severity-colored cards, age counters, and dismiss actions.
*   **Sub-tab Filters**: Divided findings into **Risks**, **Growth & Competitor**, and **Opportunities** boards.
*   **Deep Linking**: Provided a "View Video" button on video-related alerts that filters the list of videos and switches SPA tabs instantly.
*   **Comparison Indicator**: Integrated active insights counts as status badges on the comparison cards in `AnalyticsCompare.tsx`.
