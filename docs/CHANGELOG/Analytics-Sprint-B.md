# Changelog — Analytics Sprint B: Channel Explorer & Performance Intelligence

## 1. Channel Explorer Layer
*   **Versioned Summary Payload (`GET /api/analytics/channels/{id}/summary`)**: Re-structured explorer payloads to return segregated sections under keys `channel`, `overview`, `publishing_pattern`, `diagnostics`, and `meta`.
*   **Lazy-Loaded Timeline & Growth Velocity (`GET /api/analytics/channels/{id}/timeline`)**: Created endpoints delivering growth delta values, velocity percentages, and trend timelines.
*   **Persistent Video Statistics**: Configured the collector and service layer to store dynamic counts (`views`, `likes`, `comments`) directly as columns inside the `AnalyticsVideo` database table. Removed the privacy-violating CTR column.
*   **Explorer Workspace**: Designed the explorer layout containing Tab Overview, Timeline Growth charts, Video Explorer tables with pagination and sorting, Top Videos highlight cards, and Publishing Habits patterns.

## 2. Compare Center
*   **Compare API Endpoint (`GET /api/analytics/compare`)**: Aligns up to 5 distinct channel snapshots, resolving gaps with null placeholders.
*   **Compare Response Normalization**: Separated comparative outputs into `subscribers_timeline` and `views_timeline` lists with keys mapped directly to channel IDs.
*   **Compare UI Center**: Added multi-select checkboxes to the registry, dynamic redirection routes, and comparative Recharts line charts for subscribers and views.

## 3. Caching & Performance Optimizations
*   Configured explicit `staleTime` values to reduce server waterfalls and database lock contention:
    *   **Summary**: 5 minutes
    *   **Timeline**: 5 minutes
    *   **Videos list**: 1 minute
    *   **Compare Center**: 2 minutes
