# PRD — 9Router Ecosystem Integration

## Document Information

| Item    | Value                |
| ------- | -------------------- |
| Project | Content Factory      |
| Module  | 9Router Ecosystem    |
| Status  | Draft                |
| Version | 1.0                  |
| Owner   | Product Architecture |

---

# 1. Vision

9Router berfungsi sebagai AI Orchestration Layer yang menghubungkan Content Factory dengan berbagai AI Provider tanpa membuat Content Factory bergantung langsung pada provider tertentu.

Content Factory hanya berinteraksi dengan 9Router.

```text
Content Factory
        ↓
     9Router
        ↓
 AI Providers
```

Contoh provider:

* Gemini
* Claude
* OpenAI
* DeepSeek
* Flux
* Stability
* Recraft
* Provider lainnya di masa depan

---

# 2. Objectives

## Primary Objective

Menyediakan satu ekosistem terpusat untuk:

* Metadata Generation
* Thumbnail Generation
* Asset Generation

tanpa perubahan kode backend setiap kali provider atau workflow AI berubah.

---

## Secondary Objective

Memungkinkan operator:

* Mengelola Combo secara terpusat
* Menggunakan Combo berbeda per Channel
* Menghasilkan banyak kandidat output
* Memilih hasil terbaik sebelum dipublikasikan

---

# 3. Scope

## Included

### Metadata Generation

Output:

* Title
* Description

Endpoint:

```http
POST /v1/chat/completions
```

---

### Thumbnail Generation

Output:

* Thumbnail PNG

Endpoint:

```http
POST /v1/images/generations
```

---

### Asset Generation

Output:

* PNG Assets

Endpoint:

```http
POST /v1/images/generations
```

---

### Prompt Context

Digunakan sebagai input layer untuk proses generasi.

---

### Combo Registry

Digunakan sebagai konfigurasi global workflow AI.

---

## Excluded

* Direct provider integration
* Video generation
* Publishing workflow
* Analytics workflow

---

# 4. Core Concepts

## 4.1 Prompt Context

Prompt Context adalah kumpulan instruksi dan informasi yang digunakan untuk memperkaya prompt AI.

Prompt Context bukan tempat penyimpanan hasil.

Prompt Context hanya digunakan sebagai:

```text
Input Layer
```

---

## 4.2 Combo

Combo adalah workflow AI yang dikelola oleh 9Router.

Content Factory tidak mengetahui model atau provider yang digunakan di dalam Combo.

Contoh:

```text
YT_Research
```

```text
Horror_Thumbnail
```

```text
Woodworking_Assets
```

---

## 4.3 Generation Output

Generation Output adalah hasil yang dihasilkan AI dan disimpan ke dalam Content Package.

Contoh:

* Titles
* Descriptions
* Thumbnails
* Assets

---

# 5. Architecture

## Global Layer

### 9Router Configuration

Disimpan pada Settings.

Konfigurasi:

* Base URL
* API Key
* Timeout
* Health Check

---

### Combo Registry

Disimpan secara global.

Kategori:

* Metadata Combos
* Thumbnail Combos
* Footage Combos

---

### Prompt Context Library

Disimpan secara global.

Dapat digunakan oleh banyak Channel.

---

## Channel Layer

Channel dapat menentukan Combo yang digunakan.

Channel dapat melakukan override terhadap konfigurasi global.

Contoh:

```text
Global Metadata Combo
        ↓
Channel Override
```

---

## Package Layer

Package dapat memilih Prompt Context tertentu untuk proses generasi.

---

# 6. Runtime Resolution

Prioritas konfigurasi:

```text
Package Override
        ↓
Channel Override
        ↓
Global Default
```

---

Contoh:

Jika Package memiliki Context sendiri:

```text
Package Context
```

digunakan.

Jika tidak:

```text
Channel Context
```

digunakan.

Jika tidak ada:

```text
Global Context
```

digunakan.

---

# 7. Multi Variant Strategy

AI tidak menghasilkan satu hasil tunggal.

AI menghasilkan beberapa kandidat.

---

## Metadata

Contoh:

* 5 Titles
* 5 Descriptions

---

## Thumbnail

Contoh:

* 5 Thumbnail Variants

---

## Assets

Contoh:

* 20 PNG Assets

---

Operator memilih hasil terbaik.

Hanya hasil yang dipilih yang digunakan pada proses publish.

---

# 8. Asset Engine Vision

Asset Engine bukan Video Generator.

Asset Engine menghasilkan aset visual.

Output utama:

```text
PNG
```

Contoh:

```text
workbench.png
drill.png
ghost.png
dark_forest.png
```

Semua aset disimpan ke Asset Library.

---

# 9. Monitoring & Operations

## AI Operations Dashboard

Digunakan untuk memantau aktivitas 9Router.

### Metadata Statistics

* Generated Today
* Success
* Failed
* Average Runtime

---

### Thumbnail Statistics

* Generated Today
* Success
* Failed
* Average Runtime

---

### Asset Statistics

* Generated Today
* Success
* Failed
* Average Runtime

---

### Combo Usage

Contoh:

```text
YT_Research
152 runs

YT_Research_Claude
73 runs

Thumbnail_Flux
40 runs
```

---

### Error Logs

Contoh:

* Timeout
* Invalid Combo
* Rate Limit
* Parsing Error

---

# 10. Future Direction

## Phase 1

Metadata Engine

Status:

Completed

---

## Phase 2

Thumbnail Engine

Status:

In Progress

---

## Phase 3

Global Combo Registry

Status:

Planned

---

## Phase 4

Asset Engine

Status:

Planned

---

## Phase 5

AI Operations Dashboard

Status:

Planned

```
```
