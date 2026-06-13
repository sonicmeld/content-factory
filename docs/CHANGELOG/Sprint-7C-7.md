# Changelog — Sprint 7C-7: Flow Connector & Project Asset Inbox Framework

## 1. Connector Database Schema
*   **Database Tables**: Added SQL schemas and SQLAlchemy model definitions for `external_accounts`, `connector_jobs`, and `asset_inbox`.
*   **Alembic Migration (`233cad05abbb_add_external_connectors.py`)**: Generated and applied SQLite table migrations.

## 2. API Connectivity
*   **Accounts CRUD**: Added endpoints managing external profile settings for Google Flow, Gemini, and ChatGPT.
*   **Job Dispatching & Context Handshakes**:
    *   `POST /api/connectors/jobs` registers active browser generator triggers.
    *   `GET /api/connectors/jobs/active` returns the latest pending job to the companion browser extension.
    *   Chrome companion browser automation reads context payload parameters through hidden DOM elements (`#content-factory-context`).

## 3. Asset Inbox Pipeline
*   **Inbox Upload (`POST /api/connectors/inbox/upload`)**: Allows direct multipart transfers of generated visual assets to local staging directories (`data/inbox`).
*   **Approval / Rejection Engine**:
    *   *Approve*: Transfers files into standard channel directories (`data/channels/<slug>/<asset_type>`), registers assets, and updates job logs.
    *   *Reject*: Discards files immediately and marks database records.
    *   *Archive*: Flags inbox records.

## 4. UI Integrations
*   Added provider selectors (Google Flow, Gemini, ChatGPT) inside the Generation Workbox.
*   Built the sidebar navigation menu and the dedicated `AssetInboxPage.tsx` interface.
