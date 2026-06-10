# TDD — Sprint 7B-2: Global Prompt Library Foundation

## 1. Architecture Decisions
- **Refactor In Place**: The existing `prompt_contexts` table will be evolved rather than creating a new `prompt_library` table to minimize migration risk.
- **Legacy Field Retention**: `prompt_contexts.channel_id` is retained temporarily. It must not be dropped in this sprint to avoid hard cutovers on legacy services.
- **Single Source of Truth**: The `prompt_type` is strictly defined in `prompt_contexts` and not duplicated in the assignment table to prevent data drift.
- **Multiple Ordered Assignment**: A channel can be assigned multiple prompts of the same type via `channel_prompt_assignments`. The execution order is guaranteed by the `assignment_order` field.
- **Scope Boundary**: No runtime orchestration, merge logic, or dynamic JSON schema (config_json) implementation will occur. This sprint solely builds the assignment mapping.

## 2. Database Design

### 2.1 Evolving `prompt_contexts`
```python
class PromptContext(Base):
    __tablename__ = "prompt_contexts"
    # ... existing fields (id, title, topic, keywords, notes, description) ...
    
    # [NEW] Categorize the prompt
    prompt_type = Column(String, nullable=True, default="metadata") 
    
    # [LEGACY] Do not drop. Retained for backward compatibility.
    channel_id = Column(String, nullable=False) 
```

### 2.2 New Table: `channel_prompt_assignments`
```python
class ChannelPromptAssignment(Base):
    __tablename__ = "channel_prompt_assignments"

    id = Column(String, primary_key=True)
    channel_id = Column(String, nullable=False, index=True)
    prompt_id = Column(String, nullable=False) # FK to prompt_contexts.id
    assignment_order = Column(Integer, nullable=False)
    is_active = Column(Integer, default=1)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
```

## 3. Backend Design

### 3.1 Global Prompt Library Endpoints
Location: `api/prompt_contexts.py`
Modify existing routes to support global operations without requiring `channel_id` in the URL path, or provide new global routes while deprecating the old nested ones.
- `GET /api/prompt-contexts`
- `POST /api/prompt-contexts`
- `PUT /api/prompt-contexts/{id}`

### 3.2 Channel Prompt Assignments Endpoints
Location: `api/channel_prompt_assignments.py`
- `GET /api/channels/{channel_id}/prompt-assignments`
- `POST /api/channels/{channel_id}/prompt-assignments` (Bulk assignment with order or single assignment)
- `PUT /api/channels/{channel_id}/prompt-assignments` (Reordering)
- `DELETE /api/channels/{channel_id}/prompt-assignments/{assignment_id}`

### 3.3 Diagnostics & Readiness
Location: `api/diagnostics.py`
Readiness checks will begin querying `channel_prompt_assignments` coupled with the linked `prompt_contexts.prompt_type` to determine if a channel has the necessary active assignments to generate content.

## 4. Frontend Design

### 4.1 Prompt Library Page (Formerly Prompt Factory)
- Location: `frontend/src/pages/PromptLibraryPage.tsx`
- **Changes**: Remove the channel selector dependency. Introduce a global view that lists all available prompts categorized by `prompt_type`.

### 4.2 Channel Settings - Assignment UI
- Location: `frontend/src/components/PromptAssignmentManager.tsx` (New inside Channel Settings)
- **Features**: Allow dragging and dropping prompts from the global library into the channel's active assignment list. Maintain the `assignment_order` visually.

### 4.3 Generation Studio
- Location: `frontend/src/components/PackageGenerationPanel.tsx`
- **Changes**: Fetch from the channel's assigned prompts instead of owned contexts. Display them strictly as read-only assignments according to their `prompt_type`.

## 5. Migration Strategy

### 5.1 Schema Updates
1. Generate Alembic migration to add `prompt_type` to `prompt_contexts`.
2. Generate Alembic migration to create `channel_prompt_assignments` table.

### 5.2 Data Backfill Script
Create an idempotent script (or integrate into Alembic) that:
1. Iterates over all `prompt_contexts`.
2. Sets `prompt_type = "metadata"`.
3. Creates a `channel_prompt_assignments` record linking the context to its `channel_id`, with `assignment_order = 1`.

### 5.3 Soft Cutover
The system will run using the new assignments table while `prompt_contexts.channel_id` is silently maintained in the background to ensure no legacy dependent modules crash during the transition.
