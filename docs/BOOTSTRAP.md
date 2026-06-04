# BOOTSTRAP.md

# Project Bootstrap Specification

Version: 1.0

Purpose:

Generate initial project structure for Content Factory.

Do NOT implement all business logic.

Only create project foundation.

---

# Backend Structure

backend/

```text
backend
│
├── app
│   ├── main.py
│   ├── config.py
│   └── dependencies.py
│
├── api
│   ├── channels.py
│   ├── assets.py
│   ├── uploads.py
│   ├── prompts.py
│   ├── oauth.py
│   └── gcp_profiles.py
│
├── database
│   ├── database.py
│   ├── models.py
│   └── schema.sql
│
├── services
│   ├── channel_service.py
│   ├── asset_service.py
│   ├── upload_service.py
│   ├── oauth_service.py
│   └── ai_service.py
│
├── repositories
│   ├── channel_repository.py
│   ├── asset_repository.py
│   └── upload_repository.py
│
├── workers
│   ├── scheduler.py
│   ├── uploader.py
│   └── cleanup.py
│
├── tests
│
├── requirements.txt
│
└── .env.example
```

---

# Frontend Structure

frontend/

```text
frontend
│
├── src
│   │
│   ├── pages
│   │   ├── Dashboard.tsx
│   │   ├── Channels.tsx
│   │   ├── Assets.tsx
│   │   ├── Uploads.tsx
│   │   ├── Scheduler.tsx
│   │   └── Settings.tsx
│   │
│   ├── components
│   │   ├── Layout
│   │   ├── Sidebar
│   │   ├── Header
│   │   ├── DataTable
│   │   └── Modal
│   │
│   ├── services
│   │   └── api.ts
│   │
│   ├── hooks
│   │
│   ├── types
│   │
│   └── App.tsx
│
├── public
│
├── package.json
│
└── vite.config.ts
```

---

# Workers

Workers must run independently.

Workers:

Scheduler Worker

Upload Worker

Cleanup Worker

Workers communicate through SQLite.

Workers must not depend on frontend.

---

# Database Bootstrap

Create:

database/content_factory.db

Initialize:

channels

oauth_tokens

gcp_profiles

assets

prompts

metadata_templates

upload_jobs

scheduler_jobs

channel_profiles

---

# API Bootstrap

Create empty route handlers.

Routes:

GET /api/channels

POST /api/channels

GET /api/assets

POST /api/assets

POST /api/prompts/generate

POST /api/uploads

POST /api/oauth/connect

GET /api/gcp-profiles

Return:

HTTP 200

JSON placeholder responses

No business logic yet.

---

# Frontend Bootstrap

Create:

Sidebar Navigation

Page Routing

Basic Layout

Dark Theme

Responsive Layout

No backend integration required.

---

# AI Integration

Create interface only.

File:

services/ai_service.py

Provider:

9Router

No implementation required.

---

# OAuth Integration

Create interface only.

File:

oauth_service.py

No implementation required.

---

# File Storage

Create startup validation.

Required folders:

/data

/data/channels

/data/shared-assets

/data/backups

Create automatically if missing.

---

# Logging

Create logging module.

Location:

logs/

Files:

app.log

scheduler.log

upload.log

---

# Success Criteria

Application starts.

Frontend starts.

Backend starts.

Database initializes.

Routes accessible.

Workers start.

No business logic required.