# Content Factory

# Analytics Domain Identity Layer & PRD Foundation

Version: Draft v1.0

Status: Architecture Foundation

---

# 1. Purpose

Dokumen ini mendefinisikan identitas, batas domain, ownership model, dan fondasi Product Requirement untuk Analytics Domain.

Analytics bukan bagian dari Production Domain.

Analytics bukan bagian dari Channel Workspace.

Analytics adalah domain independen yang bertanggung jawab menyimpan dan mengolah data performa historis dari platform publikasi.

---

# 2. Core Identity

## Analytics Domain

Analytics Domain bertanggung jawab untuk:

* Mengumpulkan data performa channel
* Mengumpulkan data performa video
* Menyimpan snapshot historis
* Menyediakan insight dan reporting

Analytics Domain tidak bertanggung jawab untuk:

* Produksi konten
* Package Management
* Upload Workflow
* Publishing Workflow
* Assembly Workflow

---

# 3. Domain Separation

```text
Content Factory
│
├── Production Domain
│   ├── Metadata Library
│   ├── Asset Library
│   └── Runtime Core
│
├── Channel Domain
│   ├── Package Management
│   ├── Assembly
│   ├── Upload
│   └── Publishing
│
└── Analytics Domain
    ├── Channel Analytics
    ├── Video Analytics
    ├── Historical Snapshots
    └── Intelligence Layer
```

---

# 4. Ownership Rules

## Rule 1

Analytics Domain tidak dimiliki oleh Channel Domain.

```text
Channel
≠
Analytics Owner
```

---

## Rule 2

Channel Domain tidak boleh menghapus Analytics Domain.

```text
Delete Channel
≠
Delete Analytics
```

---

## Rule 3

Analytics Domain tidak boleh menghapus Channel Domain.

```text
Delete Analytics
≠
Delete Channel
```

---

## Rule 4

Hubungan Channel dan Analytics bersifat referensi.

```text
Channel
↔
Analytics

Reference Only
```

Bukan:

```text
Parent
→
Child
```

---

# 5. OAuth Identity Layer

Analytics dan Publishing menggunakan OAuth yang sama.

Namun OAuth hanyalah:

```text
Connection Layer
```

bukan:

```text
Ownership Layer
```

---

## OAuth Flow

```text
Google Account
        │
        ▼
OAuth Connection
        │
 ┌──────┴──────┐
 ▼             ▼

Publishing   Analytics
Domain       Domain
```

---

## Important Rule

Satu OAuth dapat digunakan oleh:

* Upload Domain
* Publishing Domain
* Analytics Domain

tanpa menjadikan salah satu domain sebagai owner domain lainnya.

---

# 6. Analytics Lifecycle

Analytics memiliki lifecycle tersendiri.

```text
Connect
↓
Collect
↓
Store
↓
Analyze
↓
Report
```

Analytics tidak mengikuti lifecycle Package.

Analytics tidak mengikuti lifecycle Upload.

Analytics tidak mengikuti lifecycle Publishing.

---

# 7. Historical Intelligence Principle

Analytics adalah database historis.

Analytics bukan dashboard real-time semata.

Data yang disimpan:

* Daily Snapshot
* Weekly Snapshot
* Monthly Snapshot

Tujuan:

* Trend Analysis
* Performance Comparison
* Growth Tracking

---

# 8. Analytics Data Ownership

Analytics menyimpan datanya sendiri.

Tidak melakukan query ulang ke YouTube setiap kali halaman dibuka.

---

## Snapshot Model

```text
YouTube API
↓
Collector
↓
Analytics Database
↓
Dashboard
```

Dashboard membaca Analytics Database.

Dashboard tidak membaca YouTube API secara langsung.

---

# 9. Analytics Entities

## Analytics Channel

Representasi channel untuk kebutuhan analytics.

Field konseptual:

* analytics_channel_id
* external_channel_id
* channel_name
* platform
* connected_at
* last_sync_at

---

## Analytics Video

Representasi video untuk kebutuhan analytics.

Field konseptual:

* analytics_video_id
* external_video_id
* analytics_channel_id
* title
* published_at

---

## Analytics Snapshot

Snapshot performa.

Field konseptual:

* snapshot_date
* views
* watch_time
* subscribers
* impressions
* ctr
* retention

---

# 10. Platform Independence

Analytics harus dirancang multi-platform.

Jangan mengikat arsitektur hanya pada YouTube.

---

## Supported Future Platforms

```text
YouTube
TikTok
Facebook
Instagram
X
Threads
```

---

## Platform Rule

Analytics Layer harus menyimpan:

```text
Platform
External ID
Snapshot
```

agar collector dapat ditambahkan tanpa merombak arsitektur.

---

# 11. Analytics Dashboard Scope V1

## Channel Metrics

* Total Views
* Total Watch Time
* Total Subscribers
* Impressions
* CTR
* Published Videos

---

## Video Metrics

* Views
* Likes
* Comments
* Watch Time
* Retention
* CTR

---

## Trend Metrics

* Daily Growth
* Weekly Growth
* Monthly Growth

---

# 12. Analytics Domain Guardrails

Analytics MUST NOT:

* Own Channels
* Own Packages
* Own Uploads
* Own Publishing
* Own Production Assets

Analytics MUST:

* Store Historical Data
* Maintain Independent Lifecycle
* Survive Channel Removal
* Support Multi-Platform Expansion

---

# 13. Critical Architecture Rules

Rule A

```text
OAuth Shared
Ownership Separate
```

---

Rule B

```text
Delete Channel
Does Not Delete Analytics
```

---

Rule C

```text
Delete Analytics
Does Not Delete Channel
```

---

Rule D

```text
Analytics
=
Historical Intelligence Layer
```

---

Rule E

```text
Publishing
=
Operational Workflow
```

---

# Final Identity Statement

```text
Production creates assets.

Workspace assembles assets.

Channel publishes assets.

Analytics observes outcomes.
```

Analytics adalah domain observasi dan intelligence yang independen, menggunakan OAuth yang sama dengan Publishing Domain tetapi memiliki ownership, lifecycle, storage, dan retention policy yang sepenuhnya terpisah.
