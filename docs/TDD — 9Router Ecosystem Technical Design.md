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

# 13. Monitoring Architecture

## 13.1 Objectives

Monitoring Architecture menyediakan observability untuk seluruh ekosistem 9Router dan Generation Studio.

Tujuan utama:

* Mengetahui penggunaan setiap Combo.
* Mengetahui penggunaan Prompt Context.
* Mengetahui performa Generation Studio.
* Mengetahui kegagalan generation.
* Mengetahui kesehatan runtime sistem.
* Menyediakan fondasi untuk optimasi provider AI di masa depan.
* Menjadi pusat monitoring operasional Content Factory.

---

## 13.2 Usage Dashboard

### 13.2.1 Purpose

Memberikan visibilitas terhadap penggunaan Generation Studio dan seluruh komponen ekosistem 9Router.

---

### 13.2.2 Metadata Generation Count

Menampilkan jumlah metadata yang dihasilkan.

Metrics:

```text
Per Day
Per Week
Per Month
Total Lifetime
```

---

### 13.2.3 Thumbnail Generation Count

Menampilkan jumlah thumbnail yang dihasilkan.

Metrics:

```text
Per Day
Per Week
Per Month
Total Lifetime
```

---

### 13.2.4 Prompt Context Usage

Menampilkan Prompt Context yang paling sering digunakan.

Contoh:

```text
Woodworking Beginners     42
Advanced Workshop         18
Horror Stories            11
```

---

### 13.2.5 Combo Usage

Menampilkan Combo yang paling sering digunakan.

Contoh:

```text
YT_Research               65
Gemini Thumbnail          28
Flux Asset Generator      12
```

Metrics:

```text
Metadata Combo Usage
Thumbnail Combo Usage
Footage Combo Usage
```

---

### 13.2.6 Channel Activity

Menampilkan channel yang paling aktif menggunakan Generation Studio.

Contoh:

```text
Woodworking Channel       52
Horror Stories            23
DIY Workshop              18
```

---

### 13.2.7 Variant Usage Analytics

Reserved for future Variant Library implementation.

Metrics:

```text
Generated Variants
Selected Variants
Rejected Variants
Selection Rate
```

---

## 13.3 Error Dashboard

### 13.3.1 Purpose

Membantu operator melakukan troubleshooting dan identifikasi masalah operasional.

---

### 13.3.2 Generation Failures

Menampilkan jumlah generation yang gagal.

Kategori:

```text
Metadata
Thumbnail
Footage
```

---

### 13.3.3 Failure Reasons

Menampilkan distribusi penyebab kegagalan.

Kategori:

```text
Validation Error
Missing Combo
Inactive Combo
Prompt Context Error
9Router Error
Provider Error
Network Error
Storage Error
Unknown Error
```

---

### 13.3.4 Recent Failures

Menampilkan histori error terbaru.

Field:

```text
Timestamp
Channel
Package
Operation
Error Message
```

---

### 13.3.5 Failure Rate

Formula:

```text
Failed Generations
/
Total Generations
```

Ditampilkan per:

```text
Day
Week
Month
```

---

## 13.4 Runtime Dashboard

### 13.4.1 Purpose

Menampilkan kesehatan sistem secara realtime.

Runtime Dashboard merupakan sumber kebenaran utama (authoritative source) untuk status operasional platform.

---

### 13.4.2 Service Health

#### Content Factory API

Status:

```text
Online
Offline
```

---

#### SQLite Database

Status:

```text
Connected
Disconnected
```

Additional Metrics:

```text
Database Version
Current Alembic Revision
```

---

#### 9Router Connectivity

Status:

```text
Reachable
Unreachable
```

Metrics:

```text
Response Time (ms)
Last Successful Request
```

---

#### Cloudflare Tunnel

Status:

```text
Connected
Disconnected
```

Metrics:

```text
Tunnel Health
Last Seen
```

---

### 13.4.3 Runtime Metrics

#### Generation Queue

Jumlah generation yang sedang berjalan.

Metrics:

```text
Metadata Processing
Thumbnail Processing
Footage Processing
```

---

#### Active Prompt Contexts

Metrics:

```text
Total Active Contexts
```

---

#### Active Combos

Metrics:

```text
Metadata Combos
Thumbnail Combos
Footage Combos
Total Active Combos
```

---

#### Package Statistics

Metrics:

```text
Total Packages
Completed Packages
Pending Packages
Failed Packages
```

---

### 13.4.4 Resource Metrics

#### SQLite Database Size

Contoh:

```text
192 MB
```

---

#### Storage Usage

Direktori:

```text
/assets
/uploads
/thumbnails
```

Metrics:

```text
Used Space
Free Space
```

---

#### Local Asset Count

Kategori:

```text
Images
Metadata Variants
Thumbnail Assets
Footage Assets
```

---

#### PM2 Runtime Status

Menampilkan status service yang dikelola PM2.

Contoh:

```text
sqlite-web
online

scheduler
online
```

---

## 13.5 Future Monitoring Extensions

### 13.5.1 Cost Dashboard

Planned for future release.

Metrics:

```text
Cost Per Combo
Cost Per Channel
Cost Per Generation
Daily Cost
Monthly Cost
```

---

### 13.5.2 Provider Dashboard

Planned for future release.

Metrics:

```text
Provider Success Rate
Provider Latency
Provider Availability
```

Contoh:

```text
9Router
OpenRouter
Custom Provider
```

---

### 13.5.3 Variant Analytics

Planned after Metadata Variant Library.

Metrics:

```text
Generated Variants
Selected Variants
Rejected Variants
Selection Rate
Top Performing Variants
```

---

## 13.6 Technical Decision Records

### TDR-006 — Read-Only Monitoring

Monitoring Dashboard bersifat read-only.

Monitoring tidak diperbolehkan menjalankan:

```text
Generate Metadata
Generate Thumbnail
Generate Footage
Delete Assets
Modify Packages
```

---

### TDR-007 — Monitoring Separation

Monitoring harus tetap independen dari workflow Generation Studio.

Monitoring tidak boleh menjadi dependency untuk:

```text
Metadata Engine
Thumbnail Engine
Asset Engine
Package Assembly
```

---

### TDR-008 — Runtime Dashboard Authority

Runtime Dashboard merupakan sumber informasi operasional utama untuk:

```text
Content Factory
SQLite Database
9Router
Cloudflare Tunnel
PM2 Services
```

Semua status operasional harus mengacu pada Runtime Dashboard sebagai referensi utama.

---

### TDR-009 — Future Observability Strategy

Seluruh metrik observability harus dibangun menggunakan data yang sudah tersedia pada:

```text
package_generations
metadata_variants
generation_combos
prompt_contexts
channels
```

untuk meminimalkan kebutuhan refactor pada sprint berikutnya.

# 14. Global Metadata Library Architecture

## 14.1 Purpose

Global Metadata Library menyediakan reusable knowledge layer di atas Generation Studio.

Generation Studio menghasilkan metadata candidates.

Metadata Library menyimpan metadata yang sudah dikurasi operator dan dapat digunakan kembali oleh channel lain.

Tujuan:

* Mengurangi generation berulang.
* Meningkatkan reuse metadata berkualitas.
* Menjadikan generation sebagai opsi, bukan kewajiban.

---

## 14.2 Metadata Library

Source:

metadata_variants

Promotion:

Publish To Library

Target:

metadata_library

Workflow:

Generate
↓
Review
↓
Select
↓
Publish To Library
↓
Metadata Library

---

## 14.3 Metadata Reuse Workflow

Library Item
↓
Channel
↓
Package

Library bersifat global.

Library tidak memiliki channel ownership.

Channel hanya menjadi consumer.

Package dapat menggunakan metadata dari:

* Metadata Library
* Generation Studio

---

## 14.4 Source Mode

Package Workspace menyediakan dua mode:

Metadata Source

○ Generate New

○ Use Library

Generate New:

Metadata dihasilkan melalui Generation Studio.

Use Library:

Metadata dipilih dari Metadata Library.

---

## 14.5 Prompt Library Integration

Prompt Contexts berfungsi sebagai Global Prompt Library.

Prompt Library menyediakan:

* Metadata Prompt Templates
* Thumbnail Prompt Templates
* Future Footage Prompt Templates

Prompt Library bersifat global.

Channel tidak memiliki prompt.

Channel hanya melakukan assignment dan consumption.

---

## 14.6 Asset Pool Architecture

Asset Library bukan bagian dari Knowledge Library.

Asset Library berfungsi sebagai:

Operator Managed Asset Pool & Monitoring Layer.

Supported Types:

* Video (.mp4)
* Timestamp (.txt)
* Thumbnail (.png/.jpg/.webp)

Not Supported:

* Audio
* Prompt Files

Asset Library digunakan untuk:

* Upload
* Monitoring
* Channel Asset Assignment
* Bulk Content Preparation

---

## 14.7 Asset Pool Workflow

Filesystem
↓
Asset Library
↓
Channel
↓
Package

Asset Library dapat melakukan scan terhadap:

* MP4 Files
* Timestamp Files
* Thumbnail Files

sesuai folder channel.

---

## 14.8 Architecture Decision

TDR-010

Generation dan Metadata Library dipisahkan.

Generation menghasilkan candidate.

Metadata Library menyimpan curated metadata.

---

## 14.9 Architecture Decision

TDR-011

Metadata Library bersifat immutable.

Perubahan dilakukan melalui clone.

Source metadata tidak boleh berubah.

---

## 14.10 Architecture Decision

TDR-012

Generate dan Reuse adalah workflow yang setara.

Package dapat berasal dari:

* Generation Studio
* Metadata Library

---

## 14.11 Architecture Decision

TDR-013

Asset Library dan Generation Assets memiliki fungsi berbeda.

Asset Library:
Operator Managed Assets

Generation Assets:
AI Generated Assets

---

## 14.12 Architecture Decision

TDR-014

Prompt Library bersifat global.

Channels consume prompts.

Channels do not own prompts.

---

## 14.13 Architecture Decision

TDR-015

Metadata Library dan Asset Pool merupakan subsystem terpisah.

Metadata Library:
Reusable Knowledge

Asset Pool:
Reusable Files

```
```
