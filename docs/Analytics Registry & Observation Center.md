Saya akan membuatnya dalam format yang siap diberikan ke AG/Sonnet sebagai Implementation Plan terpisah per sprint, sehingga setiap sprint bisa dieksekusi independen dan tidak menghabiskan konteks agent.

---

# Sprint A — Analytics Registry & Observation Center

## Objective

Membangun fondasi Analytics Domain sebagai domain independen yang bertugas mengelola observasi channel, identity mapping, workspace assignment, dan collection status.

Sprint ini **tidak membuat chart atau visual analytics**.

---

## Scope

### Analytics Hub Page

Route:

```text
/analytics
```

Aktifkan menu:

```text
Analytics Hub
```

pada Sidebar.

---

### Analytics Registry

Menampilkan seluruh channel yang sedang diobservasi.

Fields:

```text
Channel Name
Platform
Subscriber Count
Video Count
Observed Since
Status
```

Actions:

```text
View Details
Refresh
Archive
```

---

### Identity Mapping

Menampilkan relasi:

```text
Analytics Channel
      ↓
Google OAuth Identity
      ↓
YouTube Channel
```

Fields:

```text
Analytics Channel
OAuth Account
YouTube Channel ID
Connection Status
```

---

### Workspace Assignment

Menampilkan relasi:

```text
Analytics Channel
      ↓
Workspace
```

Karena Analytics dan Channel adalah domain terpisah.

Satu Analytics Channel dapat terhubung ke:

```text
1..N Workspace
```

---

### Collection Status

Menampilkan:

```text
Last Sync
Snapshot Count
Video Count
Collector Status
```

Status:

```text
Healthy
Pending
Error
Disabled
```

---

## New API Helpers

Tambahkan:

```typescript
getAnalyticsChannels()
observeAnalyticsChannel()
refreshAnalyticsChannel()
getAnalyticsIdentities()
getAnalyticsWorkspaceLinks()
```

---

## Deliverables

```text
Analytics Hub
├─ Registry
├─ Identity Mapping
├─ Workspace Assignment
└─ Collection Status
```

---

# Sprint B — Analytics Explorer

## Objective

Membangun eksplorasi data analytics yang sudah dikumpulkan collector.

Sprint ini fokus membaca data, bukan menghasilkan insight.

---

## Scope

### Channel Overview

Halaman detail:

```text
/analytics/:channelId
```

Sections:

```text
Channel Profile
Performance Summary
Recent Videos
Latest Snapshots
```

---

### Video Explorer

Menampilkan:

```text
Title
Views
Likes
Comments
CTR
Published Date
```

Filter:

```text
Last 7 Days
Last 30 Days
Last 90 Days
Custom
```

---

### Snapshot Explorer

Menampilkan histori collector.

Fields:

```text
Captured At
Subscribers
Views
Watch Time
Impressions
CTR
```

---

### Trend Explorer

Memanfaatkan:

```text
Google Trends
YouTube Search Trends
```

Menampilkan:

```text
Keyword
Trend Score
Country
Category
```

---

## New API Helpers

```typescript
getAnalyticsOverview()
getAnalyticsVideos()
getAnalyticsSnapshots()
getMarketTrends()
```

---

## Deliverables

```text
Analytics Explorer
├─ Channel Overview
├─ Video Explorer
├─ Snapshot Explorer
└─ Trend Explorer
```

---

# Sprint C — AI Insight Engine

## Objective

Mengubah data analytics menjadi insight yang dapat digunakan oleh Prompt Domain dan Production Domain.

---

## Scope

### Insight Center

Tab baru:

```text
Insights
```

Menampilkan insight yang dihasilkan AI.

---

### Performance Diagnostics

Contoh:

```text
CTR Low
Retention Drop
Topic Saturation
Upload Gap
```

---

### Competitor Analysis

Perbandingan:

```text
Observed Channel
vs
Competitor Channel
```

Metrics:

```text
Views
Growth
Upload Frequency
Topic Coverage
```

---

### Opportunity Finder

Menghasilkan:

```text
Underserved Topics
Emerging Keywords
High Potential Niches
```

---

### Prompt Suggestions

Bridge pertama menuju Prompt Domain.

Output:

```text
Suggested Metadata Prompt
Suggested Thumbnail Prompt
Suggested Content Angle
```

---

## New API Helpers

```typescript
getAnalyticsInsights()
generateInsight()
compareChannels()
```

---

## Deliverables

```text
Insight Engine
├─ Performance Diagnostics
├─ Competitor Analysis
├─ Opportunity Finder
└─ Prompt Suggestions
```

---

# Sprint D — Visualization Layer

## Objective

Membangun dashboard visual analytics yang selama ini dianggap sebagai Analytics Hub.

Sprint ini baru fokus pada chart dan visual reporting.

---

## Scope

### KPI Dashboard

Cards:

```text
Subscribers
Views
Watch Time
CTR
Impressions
Revenue (future)
```

---

### Growth Charts

Menggunakan:

```text
Recharts
```

Charts:

```text
Subscriber Growth
Views Growth
Watch Time Growth
```

---

### CTR Analytics

Visualisasi:

```text
CTR Trend
Thumbnail Performance
Metadata Performance
```

---

### Competitive Dashboard

Visual comparison:

```text
Our Channel
vs
Competitor
```

Charts:

```text
Growth
Views
Uploads
CTR
```

---

### Executive Dashboard

Ringkasan untuk owner.

Sections:

```text
Weekly Summary
Monthly Summary
Top Videos
Top Opportunities
Critical Alerts
```

---

## New Components

```text
KpiCard
TrendChart
CompetitorChart
InsightSummary
ExecutiveReport
```

---

## Deliverables

```text
Analytics Visualization
├─ KPI Dashboard
├─ Growth Charts
├─ CTR Analytics
├─ Competitive Dashboard
└─ Executive Dashboard
```

---

Urutan implementasi yang saya rekomendasikan:

```text
Sprint A  → WAJIB
Sprint B  → WAJIB
Sprint C  → WAJIB
Sprint D  → OPSIONAL
```

Karena nilai bisnis terbesar Content Factory justru berada pada:

```text
Analytics Registry
      ↓
Explorer
      ↓
Insight Engine
```

bukan pada chart dan dashboard visual. Chart hanyalah lapisan presentasi dari data yang sudah dikelola oleh tiga sprint sebelumnya.
