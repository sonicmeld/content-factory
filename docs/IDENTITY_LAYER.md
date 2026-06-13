# OAuth Identity Layer

The Content Factory Identity Layer handles API connectivity and credentials.

## 1. Connection vs. Ownership
To support multi-channel management, Content Factory decouples authentication connections from database ownership models:
*   **Google Accounts & OAuth**: A connected Google Account profile acts solely as a **Connection Layer**, not an ownership root.
*   **Decoupled Entities**: 
    *   Operational workspace channels represent local publishing targets.
    *   Observed analytics channels represent historical metrics registries.
    *   Both domains refer to the same OAuth profile for fetching data without establishing strict parent-child dependencies.

```text
Google Account
      │
      ▼
OAuth Connection (Identity Layer)
      │
 ┌────┴────┐
 ▼         ▼
Publishing   Analytics
Domain       Domain
```

## 2. Multi-Tenant Guardrails
*   A single OAuth credential profile can be shared by multiple analytics instances and upload queues.
*   Deleting a sub-channel workspace deletes its local publishing records, but does **not** delete its associated OAuth credential profile or its observed historical performance snapshots.
