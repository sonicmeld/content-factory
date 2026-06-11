# TDD — Sprint 7C-3 — Global Execution Workbox Foundation

## 1. System Context & Constraints
- **Goal:** Upgrade the Execution Center to an Actionable Workbox resolving Production Gaps.
- **Constraint: No Database Changes.** We will leverage existing `content_packages`, `package_generations`, and `metadata_variants` tables.
- **Constraint: No New Execution Pathways.** Initial gap resolution triggers will call the exact same API endpoints as the Package Workspace (`POST /api/packages/{id}/generate-metadata`).

## 2. API Design

### 2.1 Backend Aggregation (`execution_center.py`)
To expose Production Gaps and Assembly Readiness, we will update the existing `execution_center` endpoints or introduce a new `/api/execution-center/workbox` endpoint that returns a package-centric (rather than task-centric) aggregate view.

**Proposed Endpoint:** `GET /api/execution-center/workbox`
**Behavior:**
1. Queries `ContentPackage` and `PackageGeneration`.
2. Evaluates the Extensible Production Gaps for each package:
   - Evaluates `metadata_status` -> Is it `completed`? If not, Gap: `Metadata`.
   - Evaluates `thumbnail_status` -> Is it `completed`? If not, Gap: `Thumbnail`.
   - Evaluates future asset logic dynamically based on definitions.
3. Evaluates Assembly Readiness based on formal definitions:
   - `READY`: Both `metadata_status` and `thumbnail_status` are `completed`.
   - `PARTIAL`: At least one status is `completed`, `pending`, or `processing`, but not all.
   - `BLOCKED`: All statuses are `uninitialized`, `failed`, or explicitly missing.
4. Evaluates `Production Source` generically mapping from `source_combo` to `Generated`, `Library`, `Imported`, or `Manual`.

**Response Shape Example:**
```json
[
  {
    "package_id": "uuid",
    "channel_name": "Channel A",
    "channel_slug": "channel-a",
    "package_number": "002",
    "assembly_readiness": "BLOCKED",
    "production_gaps": ["Metadata", "Thumbnail"],
    "asset_statuses": {
      "metadata": "uninitialized",
      "thumbnail": "uninitialized"
    },
    "production_sources": {
      "metadata": "Manual",
      "thumbnail": "Unknown"
    }
  }
]
```

## 3. Frontend Design

### 3.1 Workbox UI Re-Architecture
- **`GlobalExecutionCenterPage.tsx`**: Update tabs to align with the Workbox paradigm.
  - Tab 1: **Production Gaps** (Surfaces `PARTIAL` or `BLOCKED` packages).
  - Tab 2: **Active Executions** (Preserved from 7C-2).
  - Tab 3: **Assembly Ready** (Surfaces `READY` packages).
  - Tab 4: **Traces** (Preserved from 7C-2).

### 3.2 Component Additions
- **`ProductionGapRow.tsx`**: A new row component designed around a Package (rather than an individual execution task).
  - Displays missing assets as badges.
  - Displays the `READY`/`PARTIAL`/`BLOCKED` status.
  - Contains "Action Buttons" to trigger initial generation for missing assets (e.g., "Generate Metadata", "Generate Thumbnail").
  - Actions delegate explicitly to existing `generateMetadata(packageId)` service calls.

## 4. Backend Design (Evaluation Logic)

To ensure **Extensibility**, the gap evaluation logic in Python should be abstracted into an evaluator function:
```python
def evaluate_assembly_readiness(asset_statuses: dict) -> str:
    # asset_statuses = {"metadata": "completed", "thumbnail": "uninitialized"}
    if all(s == "completed" for s in asset_statuses.values()):
        return "READY"
    if any(s in ["completed", "pending", "processing"] for s in asset_statuses.values()):
        return "PARTIAL"
    return "BLOCKED"
```
This guarantees that when `footage` is introduced in the future, we simply append it to the dictionary and the logic inherently scales without structural redesign.

## 5. Justification for Zero Database Changes
The concepts of "Production Gaps" and "Assembly Readiness" are inherently **derived states**. By calculating them at runtime via SQL JOINs during Workbox initialization, we maintain the single source of truth (`package_generations`) without introducing a caching layer or synchronization complexities (`execution_jobs` tables), which perfectly adheres to the architectural guidelines for this phase.
