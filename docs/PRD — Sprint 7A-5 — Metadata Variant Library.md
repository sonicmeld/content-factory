# PRD — Sprint 7A-5 — Metadata Variant Library

## Status

Draft v1.0

## Objective

Membangun Metadata Variant Library sebagai lapisan penyimpanan hasil generasi metadata dari 9Router.

Alih-alih hanya menyimpan satu `title` dan satu `description` pada `package_generations`, sistem akan mampu menyimpan banyak variasi metadata hasil generasi dan memungkinkan operator memilih kandidat terbaik sebelum digunakan pada Content Package.

Sprint ini menjadi fondasi utama sebelum memasuki Asset Engine dan Package Assembly Layer.

---

# Problem Statement

Saat ini Generation Studio hanya menyimpan:

```text
Title
Description
```

langsung ke:

```text
package_generations
```

Kondisi ini memiliki beberapa keterbatasan:

* Hasil generasi sebelumnya hilang ketika dilakukan regenerasi.
* Operator tidak dapat membandingkan beberapa kandidat metadata.
* Tidak tersedia histori kualitas output AI.
* Tidak tersedia workflow seleksi sebelum metadata digunakan.

---

# Product Goals

## Goal 1

Menyimpan seluruh hasil metadata yang dihasilkan oleh 9Router.

## Goal 2

Memungkinkan operator memilih metadata terbaik.

## Goal 3

Memisahkan:

```text
Generated Metadata
```

dari:

```text
Selected Metadata
```

## Goal 4

Menjadi fondasi untuk:

```text
Asset Variant Library
```

pada sprint berikutnya.

---

# Scope

## In Scope

### Metadata Variant Storage

Setiap hasil generasi metadata disimpan sebagai record terpisah.

### Variant Selection

Operator dapat memilih satu variant sebagai metadata aktif.

### Variant History

Riwayat hasil generasi tetap tersedia.

### Variant Regeneration

Generasi baru tidak menghapus variant lama.

---

## Out of Scope

### Thumbnail Variant Library

Akan dikerjakan pada Asset Engine.

### Footage Variant Library

Akan dikerjakan pada Asset Engine.

### Scoring AI

Belum termasuk.

### A/B Testing

Belum termasuk.

---

# Data Model

## New Table

### metadata_variants

```text
id
package_generation_id
title
description
source_combo
source_context
is_selected
created_at
```

---

## Rules

### Selection Rule

Hanya boleh ada:

```text
1 selected variant
```

per package generation.

### History Rule

Variant lama tidak boleh dihapus saat regenerasi.

### Audit Rule

Combo dan Context yang digunakan saat generasi harus disimpan.

---

# Generation Workflow

## Current

```text
Generate Metadata
        ↓
package_generations
        ↓
title
description
```

---

## New

```text
Generate Metadata
        ↓
metadata_variants
        ↓
Variant #1
Variant #2
Variant #3
...
        ↓
Operator Select
        ↓
package_generations
```

---

# User Experience

## Package Detail

Tambahkan section:

```text
Metadata Variants
```

---

### Variant Card

Menampilkan:

```text
Title
Description
Generated At
Source Combo
Source Context
Selected Status
```

---

### Actions

```text
Select
Delete
Preview
```

---

## Generation Studio

Ketika operator menekan:

```text
Generate Metadata
```

hasil tidak langsung overwrite metadata aktif.

Sebaliknya:

```text
Create Variant
```

baru kemudian operator memilih.

---

# API Requirements

## GET

```http
GET /api/packages/{package_id}/metadata-variants
```

Mengambil seluruh variant.

---

## POST

```http
POST /api/packages/{package_id}/metadata-variants/{variant_id}/select
```

Menjadikan variant aktif.

---

## DELETE

```http
DELETE /api/metadata-variants/{variant_id}
```

Menghapus variant yang tidak digunakan.

---

# Acceptance Criteria

## Variant Storage

* Semua generasi metadata menghasilkan variant baru.
* Variant lama tidak hilang.

## Variant Selection

* Hanya satu variant aktif.
* Pergantian variant memperbarui metadata aktif package.

## UI

* Operator dapat melihat seluruh variant.
* Operator dapat memilih variant.
* Operator dapat menghapus variant yang tidak digunakan.

## Audit

* Source Combo tersimpan.
* Source Context tersimpan.
* Timestamp tersimpan.

## Compatibility

* Existing metadata generation tetap berjalan.
* Existing package_generations tetap digunakan sebagai metadata aktif.
* Tidak ada perubahan pada Thumbnail Engine.

---

# Success Metrics

## Operational

Operator dapat membandingkan beberapa hasil metadata sebelum dipakai.

## Technical

Tidak ada overwrite metadata ketika regenerasi dilakukan.

## Strategic

Menjadi fondasi langsung untuk:

Sprint 7A-6 — Asset Engine Foundation
Sprint 7A-7 — Asset Variant Library
Sprint 7A-8 — Package Assembly Layer
