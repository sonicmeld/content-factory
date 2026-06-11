# TDD — Sprint 7C-4 — Assembly Foundation

## 1. System Context & Architecture Boundaries
- **Objective:** Build the Assembly Service inside the `Production Processing Domain` that consumes mapped references from the `Grouping & Mapping Domain` (Package) and accesses the `Asset Domain` (Production Database) to produce a unified Production Manifest.
- **Constraints:** Zero Queue Engines, zero `execution_jobs`, zero Runtime-to-Assembly couplings. Assembly operates synchronously or via simple background tasks triggered from the Workbox.

## 2. Backend Design

### 2.1 Database Schema
We need to track Assembly status. `ContentPackage` is the ideal container since it acts as the Grouping Domain. We already have `status` on `ContentPackage`. We should formalize an `assembly_status` string or utilize the existing `status` to represent Assembly phases (e.g., `draft`, `ready`, `assembled`). If `ContentPackage.status` suffices, we'll use it. If not, we will add `assembly_status` (we will try to avoid schema migrations if `status` is available and unused).
*Assuming `ContentPackage.status` or `PackageGeneration.assembly_status` can be leveraged.*

### 2.2 Assembly Service Architecture
Path: `backend/services/assembly_service.py` (New Service)
**Responsibility:**
1. Given a `package_id`, fetch the `ContentPackage`.
2. Fetch explicitly mapped (selected) assets:
   - Query `MetadataVariant` where `package_generation_id` matches the package's generation and `is_selected=True`.
   - Query `GenerationAsset` (Thumbnails) where `package_generation_id` matches and `is_selected=True`.
3. Validate Assembly Readiness: Ensure all required assets are present. If not, raise an error.
4. Compile Output: Create a unified dictionary containing the package identifiers and the exact payloads of the selected assets.
5. Store Output: Write this compiled manifest to a JSON file on disk (or a new database column if preferred, but writing a `manifest.json` inside the package's asset folder aligns with future Upload workflows).
6. Update Status: Mark the package as `assembled`.

### 2.3 API Design
**Endpoint:** `POST /api/packages/{package_id}/assemble`
- **Controller:** Maps to `AssemblyService.assemble_package`.
- **Response:** The compiled JSON manifest or a success confirmation.

**Update Execution Center API (`GET /api/execution-center/workbox`):**
- Ensure the Workbox includes the `assembly_status` (or `package_status`) in the returned `WorkboxPackage`.
- If a package is already successfully assembled, the Workbox should display an `Assembled` badge.

## 3. Frontend Design & Workbox Integration

### 3.1 Data Flow
1. Operator navigates to Global Execution Workbox.
2. The "Assembly Ready" tab displays packages that are `READY` (meaning they have all required assets mapped, calculated dynamically via `metadata_status` and `thumbnail_status`).
3. For packages that are `READY` but not yet `Assembled`, expose an `Assemble` button.
4. Clicking `Assemble` triggers `POST /api/packages/{package_id}/assemble`.
5. Upon success, the UI invalidates queries, and the package reflects the new `Assembled` status.

### 3.2 Component Updates
- **`ProductionGapRow.tsx`**: 
  - Read `pkg.package_status` (or newly defined assembly state).
  - Add an "Assemble" action button, visible only if `pkg.assembly_readiness === 'READY'` and it is not already assembled.
  - Expose a visual badge if the package is already `Assembled`.
- **`api.ts`**:
  - Add or update `assemblePackage(packageId: string)`.

## 4. Verification & Regression Plan
- **Verification Plan:**
  - Map a Metadata variant and a Thumbnail asset to a package.
  - Verify the package shows as `READY` in the Workbox.
  - Click "Assemble". Verify the backend constructs the manifest exclusively from the mapped variants and stores it correctly.
  - Verify the package status updates to `Assembled` and the Workbox reflects this globally.
- **Regression Plan:**
  - Verify that the act of assembling does not block or lock the package from being edited in the Channel Workspace. 
  - Remapping a variant and hitting "Assemble" again should safely overwrite the previous manifest.
