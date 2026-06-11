# PRD — Sprint 7C-4 — Assembly Foundation

## 1. Objectives
Establish the **Assembly Foundation** within the Content Factory. This sprint bridges the gap between the `Grouping & Mapping Domain` (Packages) and the future `Upload Layer`. The objective is to introduce a formal `Production Processing Domain` that consumes mapped production assets and compiles them into a unified production artifact.

## 2. Domain Classifications & Architecture Rules
To prevent architectural drift, the following domain boundaries are strictly enforced:
- **Channel** = Configuration Domain
- **Production Database** = Asset Domain
- **Package** = Grouping & Mapping Domain
- **Assembly** = Production Processing Domain

**Production Ownership Rule:**
Metadata, Thumbnail, and future Footage belong strictly to the **Content Factory Production Database**. Channels do not own production assets. Assembly must preserve this ownership model.

## 3. The Assembly Lifecycle
The architecture must maintain the strict progression:
`Prompt Library` → `Runtime Core` → `Production Database` → `Libraries` → `Package Mapping` → `Assembly`

**What Assembly Consumes:**
Assembly is strictly isolated from Runtime. It consumes ONLY:
`Package ID` → `Mapped Asset References` → `Production Assets` (e.g., Metadata, Thumbnail).
It must NOT consume Runtime Outputs, Prompt Outputs, or Unmapped Library Records.

**What Assembly Produces:**
A compiled production object ready for future Upload workflows. This sprint will output a **Unified JSON Package Manifest** stored within the Package or a dedicated Assembly storage path, acting as the structured payload for publishing.

## 4. Mapping vs. Locking Rule
`Mapping ≠ Locking`. A package marked as `Assembly Ready` simply means it contains all required mapped production assets. It does **not** imply immutability or final approval state. The package remains fully editable (assets can be re-mapped or replaced) right up until Assembly is executed.

## 5. User Stories
1. **As an Operator**, I want to see an "Assemble" action on `READY` packages directly in the Global Execution Workbox, so I can initiate the production compilation globally.
2. **As an Operator**, I want the Assembly process to compile all currently mapped assets (Metadata, Thumbnail) into a single Production Manifest, so the package is prepared for future uploading.
3. **As an Operator**, I want to track the Assembly Status globally (e.g., `Pending Assembly`, `Assembled`), so I know which packages have completed the production lifecycle.
4. **As an Operator**, I want the freedom to remap an asset even if the package is `READY`, so I can make last-minute creative changes before triggering Assembly.

## 6. Functional Requirements
- **Workbox Integration:** The Global Execution Workbox must expose "Assemble" actions for `READY` packages.
- **Assembly Status Visibility:** Introduce tracking for Assembly state (e.g., an `assembly_status` on the Package) visible globally without entering the Channel Workspace.
- **Assembly Execution:** Clicking "Assemble" triggers a backend service that fetches mapped assets and writes an Assembly Manifest.
- **Non-Goals:** Do NOT introduce Queue Engines, `execution_jobs`, Scheduler Systems, Multi Operator Systems, Provider Routing, Provider Orchestration, Upload Pipelines, Publishing Pipelines, or Channel-Centric Production Logic.

## 7. Acceptance Criteria
- [ ] Assembly execution is triggerable directly from the Workbox for `READY` packages.
- [ ] Assembly consumes only Package-mapped assets from the Production Database.
- [ ] Assembly produces a compiled Production Manifest representing the final state.
- [ ] The global UI accurately reflects the `assembly_status` (e.g., whether it has been successfully assembled).
- [ ] Packages remain editable prior to clicking "Assemble". No forced locking mechanisms are introduced.

## 8. Success Metrics
- Successful transition of `READY` packages to an `Assembled` state via the Global Workbox.
- Zero reliance on channel-centric configurations during the Assembly process.
