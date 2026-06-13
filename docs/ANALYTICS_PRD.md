# Analytics Domain Product Requirements Document (PRD)

## 1. Vision
The Analytics Domain is a self-hosted historical performance data warehouse. It is designed to periodically fetch, persist, and aggregate metrics from public video pages and creator studio dashboards to provide visual intelligence without overloading API quotas.

## 2. Core Goals
*   **Decoupled Analytics Registry**: Maintain channel lists separately from operational publishing workspaces.
*   **Daily Snapshots**: Persist metrics (views, subscribers, watch time, impressions, CTR) at scheduled days to prevent live request waterfalls.
*   **Competitive Intelligence**: Support observing competitor channels using public APIs, while setting private fields (CTR, watch time) to zero.
*   **Performance Comparison**: Enable side-by-side growth comparisons of subscribers and views for up to 5 channels.

## 3. Core Database Entities
*   `AnalyticsChannel`: Holds basic channel information, active status, handles, and last synchronization checkpoints.
*   `AnalyticsVideo`: Stores video details (titles, published dates) and public performance metrics (`views`, `likes`, `comments`).
*   `AnalyticsSnapshot`: Captures daily numerical performance variables for historical line-chart rendering.

## 4. Guardrails & Platform Independence
*   **Platform Agnostic**: Table schemas are designed to hold platform variables (e.g. `youtube`, `tiktok`) to allow future expansions.
*   **Read-Only Operations**: Analytics services must not modify publishing schedules, package lists, or production asset folders.
*   **Independent Lifecycles**: Deleting a publishing workspace channel does not delete its historical snapshot performance registry.
