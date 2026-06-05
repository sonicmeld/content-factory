# Content Factory Architecture Audit Report

**Date of Audit:** 2026-06-05
**Scope:** Complete project source code and documentation

---

## Executive Summary & Scores

* **Architecture Score:** 7/10
* **Backend Score:** 6/10
* **Frontend Score:** 7/10
* **Database Score:** 5/10
* **Production Readiness:** 3/10

The project has a solid foundational structure that strictly follows the outlined modular pattern, but it currently resides in a "Bootstrap/MVP" state. There are several critical bugs related to database schemas and API integrations that will outright prevent the core workflows from succeeding in a production environment. 

---

## 1. Architecture Consistency

* **Implementation vs PRD:** The core modules (Channels, Assets, Prompts, Uploads) are stubbed out and generally align with the PRD. However, advanced functionalities like "Niche Research" are missing, and AI Metadata Generation is minimally implemented.
* **Implementation vs TECH_STACK:** The implementation adheres to the defined stack (FastAPI, React, SQLite). However, `TECH_STACK.md` dictates the use of `APScheduler` for background jobs. While `scheduler_runner.py` uses APScheduler, `uploader_runner.py` relies on a generic `while True` loop and `time.sleep()`.
* **Implementation vs DATABASE:** Significant inconsistencies exist between the `models.py` implementation, the `DATABASE.md` spec, and how the codebase consumes these models (detailed in the Database Audit).

## 2. Backend Audit

* **FastAPI Structure:** The backend has a well-organized layout (`app/`, `api/`, `services/`, `repositories/`, `workers/`).
* **API Routing:** RESTful routing is well implemented.
* **Service / Repository Layer:** There is a good separation of concerns. Services handle business logic, while repositories handle SQLAlchemy session commits.
* **Dependency Injection:** Properly utilizes `Depends(get_db)` across routers.
* **Error Handling:** Basic global exception handlers exist, but specific services (like `ai_service.py`) wrap requests in generic `try/except` blocks, throwing broad 500 HTTPExceptions that obscure root causes.

## 3. Frontend Audit

* **React Structure:** The standard Vite + React TS project structure is intact.
* **Routing:** `react-router-dom` is properly configured in `App.tsx`.
* **State Management:** Uses `@tanstack/react-query` correctly for caching and server state synchronization.
* **Component Organization:** Follows standard component boundaries (pages vs generic components).
* **API Integration:** The Axios wrapper in `services/api.ts` maps directly to backend endpoints. However, there are no generic Axios interceptors to handle broad network errors or structured backend validation errors cleanly.

## 4. Database Audit

* **Schema Consistency:** The SQLAlchemy models generally match `DATABASE.md`.
* **Missing Columns (CRITICAL):** `backend/database/models.py` defines `UploadJob`, but is completely missing the `retry_count` (Integer) and `error_message` (String) fields. The `uploader.py` worker explicitly attempts to access and update these fields (`job.retry_count + 1`). This will cause a SQLAlchemy `AttributeError` and crash the worker on the first upload failure.
* **Future Migration Risks:** `TECH_STACK.md` specifies `Alembic` for migrations, but there is no `alembic/` directory or `alembic.ini` present. Any changes to the database schema currently require manual SQL intervention or dropping the database.

## 5. Filesystem Audit

* **Folder Generation:** `channel_service.py` correctly generates the nested channel folders (`assets/footage`, `uploads/pending`, etc.) upon channel creation, conforming exactly to `FOLDER_STRUCTURE.md`.
* **Missing Validations:** While folders are created upon channel creation, there is no startup check to ensure critical shared directories (`/data/shared-assets`, `/data/temp`) exist beyond the basic ones initialized in `main.py` lifespan.

## 6. OAuth Audit

* **OAuth Flow Completeness:** Implements the standard `google_auth_oauthlib` flow correctly.
* **Token Storage:** Access and refresh tokens are stored in the SQLite database linked to specific channels.
* **Security Concerns:** `oauth_service.py` attempts to encrypt the `refresh_token` using Fernet. However, if `settings.ENCRYPTION_KEY` is missing or invalid, the exception is swallowed and it silently falls back to storing tokens in plain text.

## 7. 9Router Audit

* **Base URL Issues (HIGH):** `DEPLOYMENT.md` specifies `NINE_ROUTER_URL=http://.../v1`. However, `ai_service.py` appends `/v1/chat/completions` directly to this URL (`f"{settings.NINE_ROUTER_URL.rstrip('/')}/v1/chat/completions"`). This results in a malformed endpoint (`/v1/v1/chat/completions`), leading to guaranteed 404s from 9Router.
* **API Abstraction:** API calls are made directly via the `requests` library.

## 8. Worker Audit

* **Separation of Responsibilities:** Background processes correctly communicate strictly via SQLite status columns (`pending` -> `scheduled` -> `uploading` -> `published`/`failed`).
* **Scheduler Worker:** `scheduler.py` effectively manages timestamp checks and transitions jobs.
* **Upload Worker:** `uploader_runner.py` is disconnected from APScheduler and implements an infinite loop, breaking the documented standard in `TECH_STACK.md`.

## 9. Technical Debt

* **Unused Code:** `ChannelProfile` model exists but is not integrated into the prompt generation flow.
* **Timezone Handling:** Models rely on naive datetimes (`func.now()`). Combining this with Python's `datetime.utcnow()` can lead to scheduling inconsistencies.
* **Alembic:** Missing Alembic setup forces destructive database updates.

## 10. Production Readiness

* **What blocks production deployment:** The application currently lacks authentication for the API and Dashboard. Deploying this on a network (or via a tunnel) exposes the entire application, API keys, and channel management to anyone who accesses the IP/Domain.
* **What must be fixed before first YouTube upload:** The DB schema crash in `uploader.py` and the 9Router endpoint `/v1/v1` bug must be patched immediately.

---

## Detailed Findings

### [CRITICAL] UploadJob Model Missing Fields Causes Worker Crash
**Problem:** `uploader.py` expects `retry_count` and `error_message` fields to handle failed uploads, but `models.py` does not define them on the `UploadJob` class.
**Impact:** If a YouTube upload fails (e.g., rate limit, quota exceeded), the worker will crash with an `AttributeError` when attempting to increment `retry_count`, leaving the job in a corrupted "uploading" state forever.
**Recommended Fix:** Add `retry_count = Column(Integer, default=0)` and `error_message = Column(String)` to `UploadJob` in `backend/database/models.py`.

### [HIGH] 9Router URL Duplicates /v1 Path
**Problem:** `DEPLOYMENT.md` specifies the env var `NINE_ROUTER_URL=http://IP:PORT/v1`, but `ai_service.py` constructs the URL by explicitly appending `/v1/chat/completions`.
**Impact:** AI generation (prompts/metadata) will instantly fail with a 404 Not Found due to the resulting `/v1/v1/chat/completions` URI.
**Recommended Fix:** Remove the hardcoded `/v1` in `ai_service.py` or specify in documentation that `NINE_ROUTER_URL` should NOT contain the trailing `/v1`.

### [HIGH] No Application Authentication
**Problem:** There is no Session Cookie or JWT authentication implemented on the backend FastAPI routes, nor on the frontend.
**Impact:** Unauthorized actors on the same LAN or anyone accessing the Cloudflare tunnel (if accidentally exposed) can access, modify, or delete YouTube channels and API keys.
**Recommended Fix:** Implement the "Session Cookie" auth layer described in `TECH_STACK.md` via a FastAPI dependency.

### [MEDIUM] Silent Fallback to Plain Text OAuth Tokens
**Problem:** In `oauth_service.py`, if `Fernet` initialization fails (e.g. bad `ENCRYPTION_KEY`), the `encrypt_token` and `decrypt_token` functions swallow the error and return the token in plain text.
**Impact:** Refresh tokens could be silently stored in plain text, compromising the security guarantees of the database.
**Recommended Fix:** Raise an explicit startup error if `ENCRYPTION_KEY` is invalid, preventing the application from booting without secure token storage.

### [MEDIUM] Missing Alembic Configuration
**Problem:** Alembic is missing despite being listed in `TECH_STACK.md`.
**Impact:** Cannot perform database schema migrations safely (e.g., adding the missing `retry_count` column).
**Recommended Fix:** Run `alembic init alembic`, configure `env.py` to target `Base.metadata`, and generate initial migration scripts.

### [LOW] Inconsistent Worker Implementation
**Problem:** `scheduler_runner.py` uses `APScheduler` while `uploader_runner.py` uses a simple `while True` loop.
**Impact:** Harder to manage, monitor, and scale background workers uniformly.
**Recommended Fix:** Standardize `uploader_runner.py` to also use `APScheduler` as defined in the technical stack.
