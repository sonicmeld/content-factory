# PRD — Sprint 7C-3 — Global Execution Workbox Foundation

## 1. Objectives
Transform the existing Global Execution Center from a passive `Visibility Layer` (Sprint 7C-2) into an active `Visibility + Action Layer` known as the **Global Execution Workbox**. The objective is to identify and resolve missing production assets (Production Gaps) and surface Assembly Readiness across all channels directly from a unified global interface, without resorting to complex queue or scheduling systems.

### Workbox Evolution Direction
- **Sprint 7C-2:** Global Visibility Layer
- **Sprint 7C-3:** Global Visibility + Action Layer (Workbox)
- **Future:** Production Coordination Layer

## 2. Architecture Constraints & Ownership Rules

### 2.1 Global Execution Workbox Ownership Rule
The Global Execution Workbox **owns**: Visibility, Monitoring, Inspection, Triggering, Production Gap Resolution, and Assembly Readiness Visibility.
The Workbox **does NOT own**: Prompt Library, Prompt Assignments, Runtime Composition, Runtime Execution, Asset Storage, Metadata Library, Package Assembly, Upload Logic, or Publishing Logic. It is strictly an **Operational Layer**.

### 2.2 Production Asset Ownership Rule
Generated production assets (Metadata, Thumbnail, Footage) belong exclusively to the **Content Factory Production Database**. Channels are merely Configuration, Publishing, and Distribution Targets; they do *not* own production assets. This PRD actively rejects Channel-centric production workflows.

### 2.3 Global Production Guardrail
This sprint **MUST NOT** introduce:
- New Channel Production Features or Channel-Specific Workflows
- Queue Engines, Scheduler Systems, `execution_jobs` Tables, or Multi Operator Systems
- Provider Routing/Orchestration, or Upload/Publishing Pipelines

### 2.4 Extensible Production Gaps
Production Gap detection must be asset-type agnostic. While currently evaluating Metadata, Thumbnail, and Footage, the system must focus on the generic concept of "Production Gap Resolution" rather than hardcoded categories, ensuring new future asset types can be supported seamlessly.

## 3. Formal Assembly Readiness Definitions
The Workbox must evaluate and expose Assembly Readiness using these explicit definitions:

| Status | Definition |
|---|---|
| **READY** | All required production assets are available. Package is eligible for Assembly. |
| **PARTIAL** | One or more production assets exist. Assembly requirements are not yet satisfied. |
| **BLOCKED** | Required production assets are missing. No valid Assembly path currently exists. |

## 4. User Stories
1. **As an Operator**, I want to see a unified view of "Production Gaps" globally, so that I can instantly identify packages missing required assets (e.g., Metadata, Thumbnail) without opening individual Channel Workspaces.
2. **As an Operator**, I want to trigger initial generation for missing production assets directly from the global view, so that I can resolve gaps efficiently.
3. **As an Operator**, I want to instantly see the Assembly Readiness (`READY`, `PARTIAL`, `BLOCKED`) of any package, so I know which content is prepared for the next pipeline stage.
4. **As an Operator**, I want to see the Origin/Source of an asset identified generically (`Generated`, `Library`, `Imported`, `Manual`), ensuring consistent tracking regardless of asset type.

## 5. Acceptance Criteria
- [ ] A dedicated "Pending Work" / "Production Gaps" view exists in the Workbox, exposing packages that lack one or more production assets.
- [ ] Operators can trigger initial asset generation from the Workbox, reusing the existing Runtime Core pathway (no new execution pathways).
- [ ] Every package record in the Workbox displays an Assembly Readiness status matching the formal definitions.
- [ ] Asset sources utilize a unified `Production Source` vocabulary rather than relying exclusively on metadata-specific tables.
- [ ] No new database tables or schema migrations are introduced.

## 6. Verification & Regression Plan
- **Verification Plan:** Verify UI tabs successfully identify packages missing initial executions. Verify that clicking "Generate" delegates properly to the existing generation endpoints and immediately transitions the package from "BLOCKED" towards "PARTIAL" or "READY".
- **Regression Plan:** Ensure existing package-level generation triggers (inside PackageGenerationPanel) continue to function identically. Ensure Sprint 7C-2 traces and failed execution views remain intact.
