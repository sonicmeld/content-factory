# TDD — Sprint 7C-1: 9Router Runtime Core Foundation

## 1. Architecture Decisions
- **Composition Layer Pattern**: The Runtime Core operates strictly as a Composition Layer. It reads configuration data, composes the execution payload, executes it, and audits the attempt.
- **Consumption Only**: The Runtime Core consumes data from the Prompt Library, Prompt Assignments, Generation Combos, Package Data, Channel Data, and Timestamp Data.
- **No Ownership**: The Runtime Core does NOT own the Prompt Library, Metadata Library, Asset Pool, or Package Assembly. It cannot perform structural modifications to these domains.
- **Role Isolation**: The Runtime Core is characterized as `Read + Compose + Execute + Audit`. It is not responsible for storing knowledge, managing assets, managing metadata, or assembling packages.

## 2. Prompt Resolver
The `selectedContextId` remains the **Primary Operator Instruction**. The UI workflow of explicitly picking a prompt is preserved.

**Workflow**:
```text
selectedContextId
        +
assigned prompts
        ↓
prompt chain
```

**Responsibilities**:
1. Fetch the explicitly selected prompt (`selectedContextId`).
2. Fetch the globally assigned prompts for the channel (`channel_prompt_assignments`).
3. Sort the assigned prompts by `assignment_order`.
4. Build the ordered prompt chain without overriding or mutating the selected prompt. Operator control must be strictly preserved.

## 3. Prompt Composition Engine
Sprint 7C-1 implements a **Basic Composition Engine**.

**Methodology**:
It simply concatenates the resolved prompts into a single chain:
```text
Selected Prompt
+
Assigned Prompt #1
+
Assigned Prompt #2
+
Assigned Prompt #N
```
This sequential concatenation becomes the final `Prompt Chain`.

**Excluded from 7C-1**:
- Priority Engine
- Conflict Resolution
- Prompt Weighting
- Prompt DSL

## 4. Runtime Context Builder
The Runtime Context Builder generates a structured `RuntimePayload`.

**Payload Structure**:
- Prompt Chain
- Package Context
- Channel Context
- Timestamp Context

**Architecture Decision**:
The Runtime Context Builder MUST be extensible for future Metadata Library and Asset Pool context injection. However, Metadata Library Injection and Asset Pool Injection are not implemented in Sprint 7C-1. This is purely an extensibility point.

## 5. Combo Resolver
The Combo Resolver translates the selected Generation Combo into an execution payload.

**Responsibilities**:
1. Read Combo String.
2. Validate Combo.
3. Parse Combo Configuration.
4. Prepare Execution Payload.
5. Delegate to 9Router.

**Excluded from 7C-1**:
- Provider Registry
- Provider Routing
- Provider Failover
- Provider Health Monitoring
These responsibilities remain delegated entirely to 9Router.

## 6. Runtime Audit Layer & Database Design
To provide execution traceability and operator visibility, the Runtime Audit Layer records every execution attempt.

**IMPORTANT CONSTRAINT**: To prevent database growth explosion, the audit MUST NOT store the full runtime payload endlessly. A small preview (500–1000 characters) is permitted for troubleshooting.

**Schema: `runtime_audits`**
```python
class RuntimeAudit(Base):
    __tablename__ = "runtime_audits"
    
    id = Column(String, primary_key=True)
    package_id = Column(String, index=True, nullable=False)
    execution_type = Column(String, nullable=False) # e.g., 'metadata', 'thumbnail'
    
    selected_prompt_id = Column(String, nullable=True)
    selected_prompt_title = Column(String, nullable=True)
    
    assigned_prompt_ids = Column(JSON, nullable=True) # List of IDs
    assigned_prompt_titles = Column(JSON, nullable=True) # List of Titles
    
    prompt_preview = Column(String(1000), nullable=True) # Capped preview
    combo_used = Column(String, nullable=True)
    
    status = Column(String, nullable=False) # 'success', 'failed'
    
    generated_at = Column(DateTime, default=func.now())
```

## 7. Generation Service Refactor
Target: **Remove Hardcoded Prompt Logic** from `generation_service.py`.

The service will no longer manually concatenate `topic`, `keywords`, and `notes`. Instead, it will:
1. Call Runtime Core (passing `selectedContextId`, `package_id`).
2. Receive Result from Runtime Core.
3. Persist Variant via Metadata/Asset libraries.

## 8. API Integration
Maintain full compatibility with existing workflows while exposing the new audit capabilities.

**Preserved Endpoints**:
- `POST /api/packages/{package_id}/generate-metadata` (Parameter `context_id` remains intact).
- `POST /api/packages/{package_id}/generate-thumbnail` (Parameter `context_id` remains intact).

**New Endpoint**:
- `GET /api/packages/{package_id}/runtime-audits`: Retrieves the Runtime Trace Viewer data for a package.

## 9. Runtime Trace Viewer
A minimal UI addition to the Generation Studio to surface the Runtime Audit data.

**Workflow**:
`Package -> Runtime Trace`

**Displayed Data**:
- Execution Type
- Selected Prompt
- Assigned Prompts
- Combo Used
- Status
- Timestamp

**Excluded**: Realtime Monitoring and Dashboard Analytics (reserved for future observability sprints).

## 10. Migration Strategy
1. Create Alembic migration for the new `runtime_audits` table.
2. No data migration required. Existing generation records will not have retroactive audit trails.

## 11. Verification Plan & Acceptance Criteria
- [ ] Runtime Audit records are created for successful executions.
- [ ] Runtime Audit records are created for failed executions.
- [ ] Runtime Audit records are available through the Runtime Trace Viewer UI.
- [ ] Runtime Core does not modify Prompt Library records.
- [ ] Runtime Core does not modify Metadata Library records.
- [ ] Runtime Core does not modify Asset Pool records.

## 12. Out Of Scope
The following are explicitly outside the boundaries of Sprint 7C-1:
- Provider Registry, Provider Routing, Provider Failover, Provider Health Monitoring.
- Prompt Weighting, Prompt Priority Engine, Conflict Resolution, Prompt DSL.
- Load Balancing, Distributed Workers, Queue Orchestration, Execution Scheduler.
- Operator Permissions.
- Audio, Voice, TTS, Narration.
