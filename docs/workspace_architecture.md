# Revised Channel Workspace Information Architecture (IA)

This revised architecture aligns deeply with the principle that the **Content Package** is the primary business entity. Assets, tools, and external AI systems exist strictly to support the assembly and publishing of Content Packages.

---

## 1. Revised Workspace Route Structure

Routes are structured to emphasize that users spend the majority of their time building and scheduling Content Packages. 

### Global Routes (Platform Management)
* `/` — Platform Dashboard (System health, Global scheduler).
* `/channels` — Channel Launcher (Grid/List to enter a Workspace).
* `/assets` — Global Asset Administration (Manage Shared Assets).
* `/settings` — Platform Configuration (9Router API, Global GCP).

### Workspace Routes (Channel Operations)
* `/workspace/:slug` — **Workspace Overview**: Package-centric mission control.
* `/workspace/:slug/packages` — **Content Packages**: The core catalog (Pending, Ready, Assembling).
* `/workspace/:slug/packages/builder` — **Package Assembly**: The consumption view where Shared and Channel assets are merged to build a package.
* `/workspace/:slug/queue` — **Upload Queue**: Active publishing pipeline for the channel.
* `/workspace/:slug/published` — **Published Videos**: Historical package archive.
* `/workspace/:slug/assets` — **Channel Asset Admin**: Management of niche/channel-specific files.
* `/workspace/:slug/prompts` — **Prompt Factory**: Channel-scoped AI prompt templates.
* `/workspace/:slug/settings` — **Channel Settings**: Metadata profiles, OAuth, upload defaults.

---

## 2. Revised Navigation Structure

The navigation hierarchy visually reinforces that everything leads to publishing. 

### Workspace Sidebar Menu

**[← Back to Channels]**
**[Channel Avatar] Midnight Cassette**
*(Badge: OAuth Connected)*

**Production Pipeline (Primary Focus)**
* **Overview** 
* **Content Packages** *(Bolded / Highlighted)*
* **Upload Queue**
* **Published Videos**

**Supporting Tools (Secondary Focus)**
* **Asset Library** *(Channel-specific admin)*
* **Prompt Factory** 

**Administration**
* **Settings**

*Note: The UI should visually separate the "Production Pipeline" from the "Supporting Tools", perhaps using a dividing line or grouped sections, making Content Packages the undeniable center of gravity.*

---

## 3. Revised Workspace Overview (Package-Centric)

The Overview dashboard must immediately answer: *"What content is ready for publishing, and what is broken?"* It completely avoids raw asset lists.

**Core Widgets:**
1. **Pipeline Health (Top Level)**
   - **Ready Packages:** X (Fully assembled, waiting for schedule).
   - **Pending Packages:** Y (Missing metadata, footage, or audio).
   - **Scheduled Packages:** Z (In the upload queue).
2. **Action Required (Alerts)**
   - **Failed Upload Jobs:** "Video [X] failed: OAuth Token Expired."
   - **Queue Warning:** "Queue is empty starting [Date]."
3. **Upcoming Publishing Schedule**
   - Mini calendar or timeline showing the next 5 packages scheduled to go live.
4. **Recent Production Activity**
   - "Content Package 'Rain Sounds Vol 4' was assembled 2 hours ago."

---

## 4. Asset Strategy: Administration vs. Consumption

The previous architecture forced users to switch contexts to find Shared vs. Channel assets. This is solved by splitting how assets are conceptually handled:

### A. Asset Administration (File Management)
* **Where:** `/assets` (Global) and `/workspace/:slug/assets` (Local).
* **What:** Uploading, deleting, tagging, and organizing raw files.
* **Why:** This is a backend maintenance task, often done in bulk (e.g., uploading 50 new rain sounds).

### B. Asset Consumption (Production)
* **Where:** Inside the **Content Package Builder** (`/workspace/:slug/packages/builder`).
* **What:** The user is assembling a video.
* **How:** The UI provides an **Integrated Asset Picker**. When selecting footage or audio for the package, the picker displays a tabbed or split-pane view showing *both* "Shared Assets" and "Channel Assets" simultaneously. 
* **Result:** The user never leaves the Workspace to find a global background track. They consume shared and local assets side-by-side during package assembly.

---

## 5. Content Package Lifecycle

This illustrates how supporting elements flow into the primary entity, and eventually out to YouTube.

1. **Generation (External Layer)**
   - *9Router AI* generates raw metadata, prompts, or visuals.
2. **Asset Administration (Supporting Layer)**
   - Raw files are stored as *Shared Assets* (e.g., ambient noise) or *Channel Assets* (e.g., specific branding).
3. **Assembly (Production Layer)**
   - Inside the Workspace, the user creates a new **Content Package**.
   - `Shared Footage` + `Channel Audio` + `AI Metadata` are consumed together.
   - Result: `video.mp4` + `thumbnail.webp` + `metadata.json` are locked into the package.
4. **Scheduling (Operations)**
   - The completed Content Package is pushed to the **Upload Queue**.
   - An *Upload Job* is created with a specific schedule.
5. **Publishing (Distribution)**
   - The Scheduler executes the Upload Job.
   - Upon success, the package moves to **Published Videos**.

---

## 6. Scalability Analysis

Does this architecture scale to the future vision?

* **Multiple Niches & 5–10 Channels per Niche:**
  - **Yes.** Because workspaces are strictly isolated, a user working on "Horror Stories Channel 1" is insulated from "Sleep Sounds Channel 5". 
  - To support Niches, the Global `/channels` page simply introduces grouping/folders (e.g., Niches -> Channels). The Workspace IA remains completely untouched.
* **Shared Production Resources:**
  - **Yes.** By decoupling Asset Admin from Asset Consumption, we can add infinitely more Shared Assets at the global level, and every channel's Package Builder immediately gains access to them via the Integrated Asset Picker.
* **Future AI Profiles:**
  - **Yes.** AI Profiles can be configured globally and attached to a Channel in Workspace Settings. When a Content Package is created, it inherits the AI Profile context, ensuring 9Router generates the correct metadata automatically without UI clutter.

---

## 7. Final Recommended IA

This architecture successfully re-orients the platform. It strips away the feeling of an "Asset Management Platform" and behaves like a true **Content Factory**. The user's primary mental model becomes: *"I am in my channel's factory. I use the tools (Assets/Prompts) to build products (Content Packages), and I put them on the conveyor belt (Upload Queue)."*
