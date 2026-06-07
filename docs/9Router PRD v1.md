# 9Router PRD v1.0

## Multi-Provider AI Content Generation Engine

### Vision

9Router adalah AI Orchestration Engine yang bertugas menghasilkan aset produksi konten menggunakan banyak provider AI secara terpusat.

Tujuan utama 9Router bukan menjadi Asset Manager ataupun Publisher, melainkan menjadi mesin produksi yang mampu memanfaatkan berbagai provider AI dalam satu eksekusi untuk memangkas waktu produksi konten.

---

# Core Principle

9Router harus mampu:

```text
1 Input
↓
Multiple AI Providers
↓
Multiple Content Assets
```

tanpa pengguna perlu berpindah antar provider secara manual.

---

# Architecture Position

```text
Tiny Manager
    │
    ├─ Generated Assets
    └─ Asset Repository

            ↓

9Router
    │
    ├─ Metadata Generation
    ├─ Footage Generation
    └─ Thumbnail Generation

            ↓

Content Factory
    │
    ├─ Package
    ├─ Queue
    ├─ Publisher
    └─ YouTube Upload
```

---

# Scope

## Included

### Metadata Generation

Output:

```text
Title
Description
```

API:

```text
/v1/chat/completions
```

Storage:

```text
Content Factory Database
```

---

### Footage Generation

Output:

```text
Image (.png/.jpg)
```

Purpose:

```text
Source visual untuk proses render video
```

API:

```text
/v1/images/generations
```

Storage:

```text
Tiny Manager
```

Notes:

Footage bukan video.

Footage berupa image yang nantinya digunakan oleh tools produksi untuk dirender menjadi video sesuai durasi lagu.

---

### Thumbnail Generation

Output:

```text
Thumbnail Image
```

API:

```text
/v1/images/generations
```

Storage:

```text
Tiny Manager
```

---

# Non Scope

9Router tidak bertanggung jawab terhadap:

```text
Upload YouTube
Queue Management
Scheduling
Analytics
Video Rendering
Audio Processing
```

Semua proses tersebut berada di luar domain 9Router.

---

# Generation Combo System

9Router menggunakan 3 combo yang independen.

---

## Combo A - Metadata

Purpose:

```text
Generate Title + Description
```

Provider Type:

```text
Chat Completion
```

Output:

```json
{
  "title": "...",
  "description": "..."
}
```

Storage:

```text
Content Factory Database
```

---

## Combo B - Footage

Purpose:

```text
Generate source image untuk video production
```

Provider Type:

```text
Image Generation
```

Output:

```text
footage_image.png
```

Storage:

```text
Tiny Manager
```

---

## Combo C - Thumbnail

Purpose:

```text
Generate thumbnail image
```

Provider Type:

```text
Image Generation
```

Output:

```text
thumbnail.png
```

Storage:

```text
Tiny Manager
```

---

# Provider Routing

Setiap combo dapat menggunakan provider berbeda.

Contoh:

```json
{
  "metadata": "gemini",
  "footage": "flux",
  "thumbnail": "minimax"
}
```

Atau:

```json
{
  "metadata": "openai",
  "footage": "sdwebui",
  "thumbnail": "flux"
}
```

9Router bertanggung jawab penuh terhadap routing provider.

Content Factory tidak perlu mengetahui provider yang digunakan.

---

# Content Factory Integration

Content Factory hanya mengetahui:

```text
Metadata Combo
Footage Combo
Thumbnail Combo
```

dan endpoint:

```text
/v1/chat/completions
/v1/images/generations
```

---

# Data Ownership

## Stored In Content Factory

```text
Title
Description
Package Metadata
Queue Status
Upload Status
```

---

## Stored In Tiny Manager

```text
Generated Footage Images
Generated Thumbnails
```

---

## Stored In 9Router

```text
Provider Configuration
Provider Routing Rules
Generation Profiles
Prompt Logic
Prompt Templates
```

---

# Production Workflow

Step 1

User memilih combo.

```text
Metadata Combo
Footage Combo
Thumbnail Combo
```

---

Step 2

9Router melakukan generation.

```text
Metadata
↓
Title + Description

Footage
↓
Footage Image

Thumbnail
↓
Thumbnail Image
```

---

Step 3

Result disimpan.

```text
Title
Description
↓
Content Factory Database

Footage Image
Thumbnail Image
↓
Tiny Manager
```

---

Step 4

User melakukan produksi video.

```text
Footage Image
+
Audio
↓
Video Rendering Tool
↓
video.mp4
timestamp.txt
```

---

Step 5

Content Factory.

```text
Upload video.mp4
Upload timestamp.txt
```

---

Step 6

Publisher.

```text
Queue
↓
Upload
↓
YouTube
```

---

# Long-Term Goal

Target akhir 9Router adalah:

```text
1 Execution
↓
Multiple Providers
↓
Multiple Assets Generated
```

untuk menghilangkan proses manual berpindah antar provider AI dan mempercepat produksi konten dalam skala besar.
