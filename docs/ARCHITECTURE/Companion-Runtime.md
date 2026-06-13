# Architecture — Companion Runtime Worker System

The Companion Extension worker system bridges the gaps between sandbox web environments (such as Google Labs and OpenAI ChatGPT) and the local self-hosted Content Factory server.

```mermaid
graph TD
    subgraph Browser (Chrome Profiles)
        Ext[Companion Extension MV3]
        Tab[Active Browser Tab: Google Flow / ChatGPT]
        Ext -->|Injects script & Context DOM| Tab
    end
    subgraph Server
        API[Companion API Router]
        DB[(SQLite: companion_runtimes)]
        JobQ[Connector Job Queue]
    end
    Ext -->|1. Register / Heartbeat| API
    Ext -->|2. Poll active jobs| API
    API <-->|Lookup runtime & credentials| DB
    API <-->|Get/Update jobs| JobQ
    Tab -->|3. Perform automation| Tab
    Tab -->|4. Download & Upload result| Ext
    Ext -->|5. Multi-part POST| API
```

## 1. Chrome Profile Workers
Unlike traditional extensions that assume a single user environment, the Companion Extension treats each Google Chrome Profile as a distinct worker node:
*   **Decoupled Contexts**: Profiles run independent extension instances (e.g. Profile A acts as `flow-thumbnail`, Profile B acts as `flow-footage`) containing unique connection settings, cookies, and Google accounts.
*   **Authentication**: Each profile registers itself (`POST /api/companion/register`) and stores a unique persistent API token (`Authorization: Bearer <token>`) and client ID.

## 2. Server Integration & Security
*   **Hashed Tokens**: The server receives runtime registrations and persists companion metadata inside the `companion_runtimes` database table. The auth tokens are stored as secure SHA256 hashes.
*   **Uptime Tracking**:
    *   Runtimes send periodic heartbeat signals to `/api/companion/heartbeat` (triggered every 60 seconds by `chrome.alarms` in the background script).
    *   The server flags runtimes as `offline` if no heartbeat is received for more than 180 seconds.
*   **Revocation (Access Control)**: Administrators can revoke any companion runtime from the global Connectors control panel, flagging `is_revoked = 1` in the database to instantly reject further connection requests.

## 3. Chrome Downloads API Integration
To bypassed sandbox writing constraints:
*   Generators write outputs directly using standard browser downloads (`chrome.downloads` API).
*   The download directory maps cleanly to designated folder templates (e.g. `Downloads/ContentFactory/Footage`) with safe sanitization of directory backslashes.
