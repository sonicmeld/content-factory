# Changelog — Sprint 7C-11: 9Router Payload Sanitizer & Safeguards

## 1. 9Router Database Safeguards
*   **System Settings Seeding (`ed2a02c8af7e`)**: Added global adapter settings to SQLite:
    *   `nine_router_timeout` = 60s
    *   `nine_router_max_tokens` = 4000
    *   `nine_router_strip_json_mode` = True
    *   `nine_router_strip_penalties` = True
    *   `nine_router_convert_system_to_user` = False

## 2. Sanitizer Engine (`sanitize_9router_payload`)
*   Created utility function in `runtime_core_service.py` to intercept payload requests sent to the 9Router:
    *   **JSON Mode & Penalties Strip**: Strips `response_format`, `presence_penalty`, and `frequency_penalty` fields if the target model is non-GPT (to prevent Error 400 API failures).
    *   **Max Token Cap**: Enforces upper limit boundaries using database values.
    *   **Role Conversions**: Converts `system` instruction roles to `user` roles (by prepending `[System Instructions]` to the first user message) for models that fail on system role schemas.
    *   **Dynamic Timeouts**: Extracts settings to apply customized timeout values on downstream REST requests.

## 3. UI System Safeguards Panel
*   Added the "9Router Adapter & Safe-guard Settings" card inside the global Settings page to configure timeout parameters and adapter toggles.
