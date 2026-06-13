# Changelog — Sprint 7C-5: Bulk Upload, Asset Library, Prompt Expert & Companion Integration

## 1. Bulk Upload and Asset Library Pipeline
*   **Bulk Package Creation (`POST /api/packages/create-from-assets`)**: Implemented endpoint to create content packages in bulk from selected video assets in the Asset Library.
*   **Automated Copy & Unique Folders**: Video assets are copied from the library to unique channel package folders (`channels/<slug>/packages/<package_number>`). Package names are derived from the base filenames. Collisions are handled by appending numerical suffixes (e.g., `_1`, `_2`).
*   **Automated Timestamp Mapping**: Associated `.txt` timestamp files with matching base names (e.g. `episode_01.txt` for `episode_01.mp4`) are automatically mapped, copied, and registered as `timestamp_path` in the database.
*   **Security Validation**: Tightened prompt chain resolution to validate Prompt Context ownership on a per-channel basis.
*   **UI Updates**: Integrated multi-file selection, visual upload progress bars, timestamp type filtering, and multi-select bulk creator buttons in `Assets.tsx`.

## 2. Prompt Expert Assistant Framework
*   **AI-powered Context Builder**: Added support for Metadata, Thumbnail, and Footage experts to help users generate high-quality Prompt Contexts from simple topic inputs using system-locked rules.
*   **Expert Drafts Queue (`/api/prompt-experts`)**: Introduces draft generation, persistent draft storage (`prompt_expert_drafts` table), and review workflows where users can manually inspect, modify, and promote drafts to permanent Prompt Contexts, or discard them.
*   **UI Review Tabs**: Integrated `PromptExpertAssistantTab` and `GeneratedDraftsTab` into `PromptLibraryPage.tsx`.

## 3. Companion Extension Foundation
*   **Chrome Profile-Based Runtime**: Refactored the browser extension into a manifest V3 **Companion Extension** structure where every Chrome Profile behaves as an independent worker (e.g. `flow-thumbnail`, `flow-footage`) with its own settings.
*   **Centralized Client & Poller**: Included `client-manager.js` for profile ID generation, `api-client.js` for sending standard HTTP headers (`X-Client-Id`, `X-Runtime-Name`), and `job-poller.js` for claiming provider jobs.
*   **Downloads API Redirection**: Used the `chrome.downloads` API to save generated footage to standard, sanitized subdirectories under the browser's download folder.

## 4. Companion Runtime Server Integration
*   **Runtime Tracker (`companion_runtimes` table)**: Added database tracking for companion profiles, mapping their connection status, uptime, and last-seen heartbeats.
*   **Security Middleware (`companion_auth.py`)**: Secured endpoint routes using SHA256 API key hashing, authorization headers, and registration controls.
*   **Management Dashboard**: Integrated a new "Companion Runtimes" grid in the Connectors settings page with remote revoke actions.
