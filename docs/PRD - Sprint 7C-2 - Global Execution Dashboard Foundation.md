# PRD — Sprint 7C-2 — Global Execution Dashboard Foundation

## 1. Objective
Build the **Global Execution Dashboard** to shift operational visibility away from the isolated Channel Workspace model toward a unified **Global Execution Center**. The dashboard will act strictly as a **Visibility Layer** without owning execution logic or requiring new database schema.

## 2. Core Principles
1. **Global First:** The dashboard must prioritize cross-channel visibility.
2. **Operational State Ownership:** The dashboard derives current execution state *exclusively* from `package_generations`. `runtime_audits` provide append-only history and error enrichment.
3. **Execution-Centric:** All executions are treated generically (Execution Type is an attribute, not a structural silo) to remain future-proof for Thumbnail and Footage integrations.
4. **Visibility Layer Boundary:** The dashboard aggregates, filters, and triggers existing routines. It does *not* manage queues, assign operators, or own generation logic.
5. **No Database Changes:** Visibility must be achieved through SQL aggregations across existing tables.

## 3. Scope & Features

### 3.1. Global Execution Center UI
A single unified page (`GlobalExecutionCenter.tsx`) containing the following primary tabs:
- **Active Executions:** Packages with status `pending` or `processing`.
- **Completed Executions:** Packages with status `completed`.
- **Failed Executions:** Packages with status `failed`.
- **Runtime Traces:** A global feed of the append-only `runtime_audits` history.

### 3.2. Execution Record Display
Each record in the dashboard must display:
- **Execution Type:** `Metadata`, `Thumbnail`, or `Footage` (Future-proofed).
- **Channel & Package Context:** Identify exactly where the execution belongs.
- **Status:** Standard vocabulary (`Pending`, `Processing`, `Completed`, `Failed`).
- **Source Type:** Determines origin. The underlying model is future-proofed (`Generated`, `Library`, `Imported`, `Manual`), but for Sprint 7C-2 the UI exposes `Generated` and `Library`.
  - *Logic:* If `MetadataVariant.source_combo == "Library"`, Source = `Library`. Otherwise, Source = `Generated`.

### 3.3. Dashboard Actions
- **View Package Details:** Link directly into the specific Package Workspace (`PackageGenerationPanel.tsx`).
- **Open Runtime Trace:** Launch a modal utilizing the existing `RuntimeTraceViewer` to inspect trace logs directly from an execution record.
- **Re-run Generation:** Trigger a generation retry using existing background tasks via the `generation_service`.
- **Filters/Search:** Ability to filter execution records by Channel, Execution Type, Status, and Source Type.

## 4. System Architecture
### 4.1. Backend Aggregation Layer
The API will introduce new endpoints grouped under `/api/execution-center/`.
- `GET /api/execution-center/active`
- `GET /api/execution-center/completed`
- `GET /api/execution-center/failed`
- `GET /api/execution-center/traces`

These endpoints will perform multi-table JOINs across `package_generations`, `content_packages`, `channels`, `metadata_variants`, and `runtime_audits` to synthesize the required payload.

### 4.2. Component Reuse
The dashboard must re-use the `RuntimeTraceViewer` component implemented in Sprint 7C-1 to ensure a consistent tracing experience without duplicating code.

## 5. Excluded Scope
- Global Queue Engine (Deferred to Sprint 7C-3)
- Operator Assignment / Role Separation (Deferred to Sprint 7C-4)
- New Database Models
- Modifying Prompt Library or Runtime Core schema
