# PRD — Sprint 7B-2: Global Prompt Library Foundation

## 1. Business Goal
The primary objective of this sprint is to transition the system from a "Channel-Owned Prompt" architecture to a "Global Prompt Library" architecture. This prepares the foundation for Sprint 7C-1 (9Router Runtime Core), where prompt composition and orchestration will occur. 

By centralizing prompts globally, we enable maximum reusability and decouple prompt management from individual channels. Channels will now simply *assign* prompts from the global library to themselves, rather than owning them outright.

## 2. Core Principles & Boundaries
To ensure strict separation of concerns within the 9Router ecosystem:
- **Prompt Library** is the **Generation Input Layer**.
- **Metadata Library** is the **Generation Output Layer**.
- **Asset Pool** is the **Operator Managed Asset Layer**.
- **Runtime Composition**: One Prompt is valid; Many Prompts are supported. The actual composition, merging, and runtime execution of these prompts are entirely out of scope for this sprint.

## 3. User Stories
- **As an Operator**, I want to manage a centralized library of prompts (Metadata, Thumbnail, Footage) so that I don't have to duplicate the same prompt across multiple channels.
- **As an Operator**, I want to assign multiple prompts to a specific channel so that I can combine modular rules (e.g., SEO Rules + Audience Rules).
- **As an Operator**, I want to define the execution order of assigned prompts so that the future runtime engine merges them correctly.
- **As a System Administrator**, I want legacy prompts to remain functional during the transition so that current operations are not disrupted.

## 4. Workflows

### 4.1 Manage Global Prompts
1. Operator navigates to the new Global Prompt Library interface.
2. Operator creates a new Prompt, defining its `prompt_type` (Metadata, Thumbnail, or Footage) and required fields.
3. The prompt is saved globally and is available to be assigned to any channel.

### 4.2 Assign Prompts to Channel
1. Operator navigates to Channel Settings > Prompt Assignments.
2. Operator selects a prompt from the Global Prompt Library to assign to the channel.
3. Operator defines the `assignment_order` (e.g., Order 1, Order 2) to establish priority.
4. The system validates the assignment without altering the global prompt.

### 4.3 Generation Studio Consumption
1. Operator navigates to Generation Studio to generate a package.
2. The UI reads from the channel's `assigned_prompts` to display the active rules.
3. The generation system continues to operate as before, relying on the assignment list.

## 5. Acceptance Criteria
- [ ] `prompt_contexts` is refactored in place to include `prompt_type` (Metadata, Thumbnail, Footage).
- [ ] `channel_id` is preserved in `prompt_contexts` as a legacy compatibility field.
- [ ] A new `channel_prompt_assignments` table manages multiple, ordered assignments per channel.
- [ ] `prompt_type` is strictly sourced from the parent prompt, not duplicated in the assignment table.
- [ ] Endpoints support global prompt CRUD and channel-specific assignment management.
- [ ] The Frontend UI allows managing global prompts independent of any selected channel.
- [ ] The Frontend UI allows channels to assign and order multiple prompts from the global library.
- [ ] Existing workflows and integrations (Generation Studio, Diagnostics) are unharmed via a backward-compatible migration strategy.
