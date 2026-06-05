# Database Documentation

## Engine
SQLite

## Location
The only valid database path for production deployment is:
`/opt/apps/content-factory/database/content_factory.db`

Do NOT use local or relative repository paths (`backend/database/content_factory.db`) for production or testing unless specified by local `.env`. The repository must remain clean of `.db` files.

---

## Migration Notes (Alembic)

This project uses **Alembic** to manage database schema migrations. 

**Never modify the database schema manually or drop the database.**

*   **Generate a new migration:** `alembic revision --autogenerate -m "description"`
*   **Apply migrations to database:** `alembic upgrade head`
*   **Rollback one step:** `alembic downgrade -1`

Migrations are stored in the `backend/alembic/versions/` directory.

---

## Schema

### gcp_profiles
```sql
CREATE TABLE gcp_profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    client_id TEXT NOT NULL,
    client_secret TEXT NOT NULL,
    project_id TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### channels
```sql
CREATE TABLE channels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    gcp_profile_id TEXT,
    upload_frequency TEXT,
    thumbnail_style TEXT,
    metadata_style TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### oauth_tokens
```sql
CREATE TABLE oauth_tokens (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### assets
```sql
CREATE TABLE assets (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    type TEXT NOT NULL,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### prompts
```sql
CREATE TABLE prompts (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    title TEXT,
    prompt TEXT NOT NULL,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### metadata_templates
```sql
CREATE TABLE metadata_templates (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    title_template TEXT,
    description_template TEXT,
    tags_template TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### upload_jobs
```sql
CREATE TABLE upload_jobs (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    video_path TEXT NOT NULL,
    title TEXT,
    description TEXT,
    thumbnail_path TEXT,
    status TEXT NOT NULL,
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    scheduled_at DATETIME,
    published_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### scheduler_jobs
```sql
CREATE TABLE scheduler_jobs (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    cron_expression TEXT,
    is_enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### channel_profiles
```sql
CREATE TABLE channel_profiles (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    niche TEXT,
    mood TEXT,
    thumbnail_prompt TEXT,
    metadata_prompt TEXT,
    asset_prompt TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```
