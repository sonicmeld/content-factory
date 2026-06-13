# Changelog — Sprint 7C-9: 3-Way Generation Pipeline & Package DOM Restoration

## 1. Single Model Generation API (`POST /api/connectors/generate-single`)
*   **Direct API Generation**: Created backend routing bypassing combo adapters, communicating directly with third-party image endpoints (e.g. Flux, SDXL) based on custom user prompts.
*   **Asset Registration**: Images generated through binary base64 or URL outputs are downloaded, stored in the global library under `data/shared/<asset_type>/`, and registered as standard asset records.
*   **Audit Trails**: Configured active request logging inside the `RuntimeAudit` database table for tracking success/failure status.

## 2. 3-Way Production Modes
*   Refactored the central workspace form `ProductionForm.tsx` to handle three generation modes:
    1.  **Combo Mode**: Triggers standardized 9Router combos.
    2.  **Single Model Mode**: Offers custom controls for endpoints, API keys, dimensions, formats, and custom prompts.
    3.  **External Connector Mode**: Automatically dispatches Google Flow, Gemini, and ChatGPT integrations.

## 3. DOM Context Restoration
*   Restored DOM payload tracking (`#content-factory-context` context blocks) on the Package Studio page (`PackageGenerationPanel.tsx`) to support legacy Companion Extension workflows.
*   Updated Google Labs redirection URLs to point directly to `https://labs.google/fx/tools/flow`.
