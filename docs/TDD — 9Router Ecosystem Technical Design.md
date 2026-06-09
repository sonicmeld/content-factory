# TDD — 9Router Ecosystem Technical Design

## Document Information

| Item    | Value                     |
| ------- | ------------------------- |
| Project | Content Factory           |
| Module  | 9Router Ecosystem         |
| Type    | Technical Design Document |
| Version | 1.0                       |
| Status  | Draft                     |

---

# 1. Purpose

Dokumen ini menjelaskan desain teknis implementasi ekosistem 9Router pada Content Factory.

Fokus utama:

* Global Combo Registry
* Prompt Context Layer
* Channel Override
* Runtime Resolution
* Multi Variant Generation
* AI Operations Monitoring

---

# 2. Architecture Overview

```text
Settings
│
├── 9Router Configuration
│
├── Combo Registry
│
└── Prompt Context Library
        │
        ▼
Channel
        │
        ▼
Content Package
        │
        ▼
Generation Studio
        │
        ▼
9Router
        │
        ▼
AI Provider
```

---

# 3. Database Design

## 3.1 generation_combos

Global registry seluruh combo.

### Purpose

Menjadi sumber tunggal seluruh workflow AI.

### Table

```sql
generation_combos
```

| Field         | Type     |
| ------------- | -------- |
| id            | VARCHAR  |
| name          | VARCHAR  |
| category      | VARCHAR  |
| endpoint_type | VARCHAR  |
| description   | TEXT     |
| config_json   | JSON     |
| is_active     | BOOLEAN  |
| created_at    | DATETIME |
| updated_at    | DATETIME |

---

### category

Valid values:

```text
metadata
thumbnail
footage
```

---

### endpoint_type

Valid values:

```text
chat
image
```

---

### Example

```json
{
  "variants": 5
}
```

---

```json
{
  "count": 25,
  "format": "png"
}
```

---

## 3.2 prompt_contexts

Global Prompt Library.

### Purpose

Menyimpan reusable prompt context.

### Table

```sql
prompt_contexts
```

| Field      | Type     |
| ---------- | -------- |
| id         | VARCHAR  |
| title      | VARCHAR  |
| topic      | TEXT     |
| keywords   | TEXT     |
| notes      | TEXT     |
| is_global  | BOOLEAN  |
| created_at | DATETIME |
| updated_at | DATETIME |

---

## 3.3 channels

Tambahan relasi ke registry.

### Existing

```text
metadata_combo
thumbnail_combo
footage_combo
```

---

### Future

```text
metadata_combo_id
thumbnail_combo_id
footage_combo_id
```

Foreign key ke:

```text
generation_combos
```

---

### Default Context

```text
default_context_id
```

Foreign key ke:

```text
prompt_contexts
```

---

# 4. Runtime Resolution

## Metadata

Priority:

```text
Package Override
        ↓
Channel Combo
        ↓
Global Default
```

---

Resolution:

```python
if package.override_combo:
    use(package.override_combo)

elif channel.metadata_combo:
    use(channel.metadata_combo)

else:
    use(global_default_metadata_combo)
```

---

## Thumbnail

Priority sama.

---

## Footage

Priority sama.

---

# 5. Combo Registry Design

## Metadata Combo

Endpoint:

```http
/v1/chat/completions
```

Example:

```text
YT_Research
YT_Research_Claude
YT_Research_Gemini
```

---

## Thumbnail Combo

Endpoint:

```http
/v1/images/generations
```

Example:

```text
Thumbnail_Flux
Thumbnail_Gemini
Thumbnail_OpenAI
```

---

## Footage Combo

Endpoint:

```http
/v1/images/generations
```

Example:

```text
Woodworking_Assets
Horror_Assets
Retro_Assets
```

---

# 6. Multi Combo Workflow

Single combo:

```text
YT_Research
```

---

Future workflow:

```json
{
  "pipeline": [
    "YT_Research",
    "SEO_Optimizer",
    "CTR_Reviewer"
  ]
}
```

---

Execution:

```text
Step 1
Generate

Step 2
Optimize

Step 3
Review
```

---

# 7. Multi Variant Generation

## Metadata

Config:

```json
{
  "title_variants": 5,
  "description_variants": 5
}
```

Output:

```text
Title #1
Title #2
Title #3
Title #4
Title #5
```

---

## Thumbnail

Config:

```json
{
  "thumbnail_variants": 5
}
```

---

## Footage

Config:

```json
{
  "count": 20,
  "format": "png"
}
```

---

# 8. Generation Output Model

Current:

```text
package_generations
```

---

Future:

```sql
generation_outputs
```

| Field       | Type     |
| ----------- | -------- |
| id          | VARCHAR  |
| package_id  | VARCHAR  |
| output_type | VARCHAR  |
| content     | TEXT     |
| file_path   | TEXT     |
| score       | FLOAT    |
| is_selected | BOOLEAN  |
| created_at  | DATETIME |

---

### output_type

```text
title
description
thumbnail
asset
```

---

# 9. Prompt Context Resolution

Priority:

```text
Package Context
        ↓
Channel Default Context
        ↓
Global Context
```

---

Compiled Prompt:

```text
GLOBAL CONTEXT
        +
CHANNEL CONTEXT
        +
PACKAGE DATA
```

---

# 10. AI Operations Dashboard

## Purpose

Monitoring seluruh aktivitas AI.

---

### Metadata Metrics

* Total Generated
* Success Rate
* Failure Rate
* Average Runtime

---

### Thumbnail Metrics

* Total Generated
* Success Rate
* Failure Rate
* Average Runtime

---

### Asset Metrics

* Total Generated
* Success Rate
* Failure Rate
* Average Runtime

---

### Combo Usage

```text
YT_Research
YT_Research_Gemini
Thumbnail_Flux
Asset_Woodworking
```

---

### Error Tracking

```text
Provider Timeout

Invalid Combo

JSON Parsing Error

Rate Limit

Provider Error
```

---

# 11. Migration Strategy

## Phase 1

Keep compatibility:

```text
metadata_combo
thumbnail_combo
footage_combo
```

masih dipakai.

---

## Phase 2

Tambahkan:

```text
generation_combos
```

---

## Phase 3

Migrasi Channel ke:

```text
metadata_combo_id
thumbnail_combo_id
footage_combo_id
```

---

## Phase 4

Hapus field string legacy.

---

# 12. Acceptance Criteria

## Registry

* CRUD Combo Registry
* Category validation
* Endpoint validation

---

## Runtime

* Global fallback bekerja
* Channel override bekerja
* Package override bekerja

---

## Metadata

* Multi title generation
* Multi description generation

---

## Thumbnail

* Multi thumbnail generation

---

## Footage

* Batch PNG generation

---

## Monitoring

* Usage dashboard
* Error dashboard
* Runtime dashboard

```
```
