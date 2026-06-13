# Changelog — Sprint 7C-8: Global Production Framework & Shift to Workspace Layer

## 1. Global Production Relocation
*   **Decoupling from Packages**: Migrated all connector configurations, accounts settings, job monitors, and inbox directories from the package-level layer to a workspace-level, package-agnostic global production layer. This avoids redundancy for future workbox modules (Footage, Scene, Character).
*   **Workspace Settings Hub**: Removed `#content-factory-context` DOM bindings in favor of pure companion API calls, and created a unified `/workspace/:slug/production` workspace layout.

## 2. API Adjustments
*   **Project-Agnostic Actions**: Cleaned database schemas (`d44af0502be3_adjust_connector_models_for_global` migration) to remove package and project constraints. Job parameters resolve prompts and profiles dynamically.
*   **Shared Library Destinations**: Refactored `/approve` endpoint to direct assets either to sub-channel directories or to the global shared library (`shared/thumbnail/`, `shared/footage/`) when `channel_id` is null.
*   **Static Providers Registry**: Exposed static providers (`/api/connectors/providers`) mapping distinct API and Connector integration classes.

## 3. UI Refactoring
*   Implemented `ProductionForm.tsx` global settings tabs.
*   Created an interactive selection dialog mapping sub-channels and shared destination choices during inbox item approvals.
