# Changelog — Sprint 7C-10: Single Model DB Config & YouTube Aspect Ratio Lock

## 1. Database-Driven Configuration
*   **System Settings & Generation Models Tables**: Introduced permanent database models (`system_settings` and `generation_models` tables) to persist API credentials and active model registries.
*   **Alembic Seeding (`65b27d5eb8d8`)**: Seeded default endpoints, empty keys, and starting models (`FLUX.2 Klein 9B`, `SDXL 1.0`, `Flux Schnell`, `Flux Dev`).
*   **Refactored direct generation routing**: The `/generate-single` API reads configurations from database options.

## 2. YouTube Aspect Ratio Locks
*   Locked image dimensions within the `/generate-single` handler to the standard YouTube 16:9 widescreen ratio (`1280x720` HD resolution) to prevent rendering mismatches.
*   Removed custom dimension selectors and key fields from the UI inputs.

## 3. UI Settings Panel
*   Added two controls in the global Settings page:
    *   **Direct Single Model API Settings**: For modifying endpoints and access keys.
    *   **Manage Available Models**: For executing CRUD modifications on the system-wide model list.
