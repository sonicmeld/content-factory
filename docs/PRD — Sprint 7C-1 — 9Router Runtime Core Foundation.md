# PRD — Sprint 7C-1: 9Router Runtime Core Foundation

## 1. Executive Summary
The **9Router Runtime Core Foundation** serves as the central execution Composition Layer for Content Factory. While the previous sprints successfully built foundational knowledge and configuration layers (Global Prompt Library, Generation Combos, Metadata Library), the Generation Studio runtime currently bypasses them. Sprint 7C-1 establishes a robust, auditable Runtime Core capable of resolving selected prompts alongside assigned prompts, building context dynamically, and capturing deep runtime telemetry, completely replacing the legacy hardcoded execution flows.

## 2. Business Problem
Presently, generation execution within the platform operates on legacy workflows. The service layer blindly sends a single explicitly selected prompt to 9Router alongside hardcoded system instructions, bypassing the newly introduced `channel_prompt_assignments` table. When an output is generated, operators cannot comprehensively answer *"Why was this output generated?"* because there is no traceability regarding the exact prompt chain, combo, and assignments used at the exact moment of execution.

## 3. Objectives
- **Standardize Composition**: Introduce a formal Runtime Core that dynamically compiles execution payloads, eliminating hardcoded python strings in the service layer.
- **Respect Operator Intent**: Maintain the `selectedContextId` workflow from the UI, while extending the backend resolver to merge assigned prompts.
- **Ensure Transparency**: Implement a first-class Runtime Audit Layer that provides complete execution traceability.
- **Architectural Integrity**: Ensure the Runtime Core acts purely as a Composition Layer (consuming data) without assuming ownership of the Prompt Library, Metadata Library, Asset Pool, or Package Assembly.

## 4. Current State
- **Prompt Fetching**: Fetches a single prompt based on `selectedContextId` and ignores `channel_prompt_assignments`.
- **Composition**: Hardcoded python string templates inject basic `topic`, `keywords`, and `notes`.
- **System Prompts**: Hardcoded rules ("You are a YouTube metadata generator...").
- **Combo Resolution**: Raw combo strings are passed directly to 9Router without translation.
- **Auditing**: Basic success/fail statuses in the generation record with no detailed telemetry of the exact prompt chain used.

## 5. Target State
- **Prompt Resolver**: Respects the operator's `selectedContextId` as the entry point, while actively querying and compiling `Assigned Prompts` based on their `assignment_order`.
- **Prompt Composition Infrastructure**: A foundational composition engine that safely concatenates the Selected Prompt + Assigned Prompts Metadata into a runtime payload.
- **Runtime Context Builder**: A standardized utility that binds Package Data, Channel Data, and Video Timestamps to the final prompt.
- **Combo Resolver**: Parses the raw Combo string to prepare it for 9Router delegation.
- **Runtime Audit**: A new telemetry persistence layer logging exact conditions of the execution (Package, Prompt Chain, Combo, Status, Timestamp).

## 6. User Stories
- **As an Operator**, I want the system to honor my `selectedContextId` but also automatically enforce channel-assigned SEO/Audience rules during generation.
- **As an Operator**, I want to view a detailed Runtime Audit so I can troubleshoot and understand exactly why a specific output was generated.
- **As a Developer**, I want a modular Prompt Composition Infrastructure so I don't have to write hardcoded prompt strings for every new generation feature.
- **As a System Administrator**, I want the Runtime Core to respect existing library boundaries so that my Prompt and Metadata libraries remain intact and untampered.

## 7. Workflow Design
1. **Initiation**: Operator clicks "Generate Metadata/Thumbnail" with a `selectedContextId`.
2. **Context Resolution**: The Runtime Core fetches the `selectedContextId`.
3. **Assignment Resolution**: The Runtime Core fetches all active `channel_prompt_assignments` for the given channel and prompt type, ordered by `assignment_order`.
4. **Composition**: The Engine concatenates the Selected Prompt with the Assigned Prompts to form the base prompt chain.
5. **Context Building**: Package, Channel, and Timestamp data are injected into the final Payload.
6. **Combo Resolution**: The Combo String is resolved and readied.
7. **Execution**: The payload is dispatched to 9Router.
8. **Auditing**: The Runtime Audit Layer records the execution telemetry (regardless of success/failure).
9. **Output**: Result is passed to the Metadata Library/Asset Pool.

## 8. Functional Requirements
### 8.1 Prompt Resolver
- MUST accept `selectedContextId` as the primary user instruction.
- MUST query `channel_prompt_assignments` for the channel and prompt type.
- MUST order assigned prompts by `assignment_order`.

### 8.2 Prompt Composition Engine
- MUST concatenate the Selected Prompt with the Assigned Prompts.
- MUST NOT implement Advanced Prompt Merge Logic, Prompt Priority Engine, or Conflict Resolution (deferred to future sprints).

### 8.3 Runtime Context Builder
- MUST format and inject dynamic variables: Package Details, Channel Details, Timestamp text.
- MUST produce a standardized payload string compatible with 9Router.

### 8.4 Combo Resolver
- MUST parse the provided Combo String into a recognizable execution configuration for 9Router.

### 8.5 Runtime Audit Layer
- MUST record every execution attempt.
- MUST persist the following minimum information:
  - Package ID
  - Execution Type (e.g., Metadata, Thumbnail)
  - Selected Prompt (ID/Title)
  - Assigned Prompts (List of IDs/Titles)
  - Prompt Chain (The final composed text payload)
  - Combo Used
  - Execution Status
  - Generated At (Timestamp)

## 9. Non Functional Requirements
- **Performance**: The prompt resolution and composition steps must not add more than 50ms of overhead to the generation lifecycle.
- **Isolation**: The Runtime Core MUST NOT perform `INSERT`, `UPDATE`, or `DELETE` operations on `prompt_contexts`, `metadata_variants`, or `assets`. It only calls their respective repository creation functions.
- **Scalability**: The audit layer must be designed to handle high-frequency writes without locking the main generation process.

## 10. UI Requirements
- The Generation Studio UI will **NOT** change structurally.
- The `Metadata Context` and `Thumbnail Context` dropdowns MUST remain intact to support the `selectedContextId` workflow.
- **New Feature**: An "Audit Log" or "Runtime Trace" view (drawer/modal) should be added to the Generation Studio to display the newly collected Runtime Audit records for the package.

## 11. API Requirements
- The existing `/generate-metadata` and `/generate-thumbnail` endpoints MUST retain the `context_id` input parameter.
- A new endpoint `GET /api/packages/{package_id}/runtime-audits` MUST be created to serve execution telemetry to the frontend.

## 12. Migration Strategy
- Create a new database table `runtime_audits` (or similar) to satisfy the Runtime Audit Requirements.
- No data migration is needed for existing generations; they simply will not possess historical runtime audit traces.
- Seamless cutover: Existing workflows will transparently transition from hardcoded composition to dynamic composition via the Runtime Core.

## 13. Acceptance Criteria
1. When generating metadata, the system successfully combines the user's selected prompt with the channel's assigned prompts.
2. The `runtime_audits` table successfully captures a record for every generation attempt containing Package ID, Selected Prompt, Assigned Prompts, Prompt Chain, Combo, Status, and Timestamp.
3. The codebase contains ZERO hardcoded prompt logic inside `generation_service.py` for metadata and thumbnail generation.
4. The generation process completes successfully via 9Router and persists variants exactly as it did prior to Sprint 7C-1.

## 14. Out Of Scope
The following features are strictly excluded from Sprint 7C-1:
- **Provider Features**: Provider Resolver, Provider Registry, Provider Routing, Provider Failover, Provider Health Monitoring, Multi Provider Routing.
- **Advanced Composition**: Prompt Weighting, Priority Engine, Conflict Resolution, Prompt DSL.
- **Infrastructure**: Load Balancing, Distributed Workers, Queue Orchestration, Execution Scheduler.
- **Other Modalities**: Voice Models, Audio Generation, TTS, Narration Systems.
- **Permissions**: Operator Permissions.
