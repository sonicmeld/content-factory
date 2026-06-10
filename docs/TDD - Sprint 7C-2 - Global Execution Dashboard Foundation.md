# TDD — Sprint 7C-2 — Global Execution Dashboard Foundation

## 1. System Context & Database Usage
The Global Execution Dashboard is a **read-heavy aggregate visibility layer**. No new schema objects will be created.

### 1.1 Data Ownership Rules
- **State Source:** `package_generations.metadata_status` and `package_generations.thumbnail_status`.
- **Enrichment Source:** `runtime_audits.error_message`, `runtime_audits.status`.
- **Identity Source:** `content_packages.package_number`, `channels.name`.
- **Asset/Metadata Validation Source:** `metadata_variants.source_combo` for "Source Type" evaluation.

## 2. API Endpoints

### 2.1 Router: `execution_center.py`
A new dedicated router `backend/api/execution_center.py` will handle cross-channel visibility endpoints.

#### `GET /api/execution-center/tasks`
Fetches a unified list of tasks spanning `metadata` and `thumbnail` types, categorized by status.
- **Query Params:** `status` (active, completed, failed), `channel_id` (optional).
- **Backend Logic:**
  - Query `PackageGeneration` joining `ContentPackage` and `Channel`.
  - For **Metadata Tasks**: Check `PackageGeneration.metadata_status`.
  - For **Thumbnail Tasks**: Check `PackageGeneration.thumbnail_status`.
  - To determine **Source Type** for completed tasks: Left outer join `MetadataVariant` on `package_generation_id`. If `source_combo == 'Library'`, Source = `Library`, else `Generated`.
- **Response Shape:**
  ```json
  [
    {
      "package_generation_id": "uuid",
      "package_id": "uuid",
      "channel_name": "Channel A",
      "package_number": "001",
      "execution_type": "Metadata",
      "status": "completed",
      "source_type": "Generated"
    }
  ]
  ```

#### `GET /api/execution-center/traces`
Fetches a feed of recent runtime audits globally.
- **Backend Logic:**
  - Query `RuntimeAudit`, joining `ContentPackage` and `Channel` to provide global context.
  - Ordered by `executed_at DESC`.
  - Can be filtered by `execution_type` or `status`.

## 3. Frontend Architecture

### 3.1 Views & Components
- **`src/pages/GlobalExecutionCenterPage.tsx`**
  - Main container page.
  - Implements a tabbed layout: `Active`, `Completed`, `Failed`, `Traces`.
- **`src/components/ExecutionCenter/ExecutionList.tsx`**
  - Generic list component to render the array of tasks.
  - Renders rows with badges for `Execution Type` (e.g. `[Metadata]`) and `Source Type`.
- **`src/components/ExecutionCenter/ExecutionRecordRow.tsx`**
  - Displays context (`Channel`, `Package Number`).
  - Contains Action Buttons: `View Package` (React Router `Link`), `Open Trace`, `Re-run`.

### 3.2 Modal & Trace Integration
- Use the existing `RuntimeTraceViewer.tsx`.
- The dashboard will maintain a state variable: `selectedPackageId` (and `traceModalOpen`).
- When a user clicks "Open Trace" on a failed task row, it mounts `<RuntimeTraceViewer packageId={selectedPackageId} />` within a dialog.

### 3.3 State Management
- Extend `src/services/api.ts` with `getExecutionTasks(status)` and `getGlobalTraces()`.
- Use React Query for periodic polling (e.g. `refetchInterval: 5000`) on the "Active" and "Failed" tabs to provide pseudo-real-time visibility without WebSockets.

## 4. Verification & Testing Constraints
1. Verify the `source_type` calculation correctly identifies a `Library` reuse versus an AI `Generated` run based on `metadata_variants.source_combo`.
2. Verify that initiating a "Re-run" correctly delegates to the existing `generateMetadata` flow and that the resulting state change immediately reflects in the Active list.
3. Verify that `RuntimeTraceViewer` correctly loads history for a specific package from the global view without breaking its local package-panel context.
