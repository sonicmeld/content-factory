# Architecture Audit — Sprint 7C-6
## Runtime Core Realignment: Package Runtime vs Production Runtime

**Status:** Evidence-Based Audit (No Implementation, No Migration, No PRD/TDD)
**Scope:** `runtime_core_service.py`, `generation_service.py`, `image_service.py`, `models.py`, `repositories/`

---

## 1. Current Runtime Architecture Map

```text
API Layer
│
├── POST /packages/{id}/generate-metadata        ← Package-bound entry point
├── POST /packages/{id}/generate-thumbnail       ← Package-bound entry point
│
└── [EXECUTION PATH]
    │
    ├── generation_service.py
    │   ├── get_package(db, package_id)          ← HARD dependency
    │   ├── get_channel(db, package.channel_id)  ← Derived from Package
    │   ├── get_generation(db, package_id)        ← Hard dependency
    │   │
    │   └── → runtime_core_service.py
    │       ├── resolve_prompt_chain()
    │       ├── build_prompt_chain_text()
    │       ├── build_runtime_payload()           ← INJECTS Package context
    │       ├── create_runtime_audit()            ← Requires package_id (non-nullable)
    │       └── finalize_runtime_audit()
    │
    ├── 9Router / image_service.py               ← PROVIDER LAYER (stateless)
    │
    └── [OUTPUT STORAGE]
        ├── MetadataVariant (package_generation_id FK)
        ├── GenerationAsset (package_generation_id FK)
        └── RuntimeAudit (package_id non-nullable)
```

---

## 2. Dependency Map

### 2A. Runtime Core Dependencies (`runtime_core_service.py`)

| Fungsi | Dependency | Tipe |
|---|---|---|
| `resolve_assigned_prompts()` | `channel_id` | **Production-bound** ✅ |
| `resolve_prompt_chain()` | `channel_id`, optional `context_id` | **Production-bound** ✅ |
| `build_prompt_chain_text()` | `PromptContext` objects | **Production-bound** ✅ |
| `build_runtime_payload()` | `Channel`, **`ContentPackage`**, `timestamp_content` | **Package-bound** ❌ |
| `resolve_combo()` | `combo_string` (raw string) | **Stateless** ✅ |
| `create_runtime_audit()` | **`package_id`** (non-nullable), `execution_type`, prompts | **Package-bound** ❌ |
| `finalize_runtime_audit()` | `execution_id` | **Stateless** ✅ |

### 2B. Generation Service Dependencies (`generation_service.py`)

| Langkah | Dependency | Wajib / Historis |
|---|---|---|
| Load `ContentPackage` | `package_id` | **Historis** — hanya sebagai Container context |
| Load `Channel` | `package.channel_id` | **Wajib** — Combo resolver butuh channel |
| Load `video_filename` | `package.video_path` | **Historis** — dipakai untuk konteks prompt |
| Load `timestamp_content` | `package.timestamp_path` | **Historis** — dipakai untuk konteks prompt |
| Create `PackageGeneration` record | `package_id` | **Package-bound** ❌ |
| Update `PackageGeneration` status | `package_id` | **Package-bound** ❌ |
| Create `MetadataVariant` | `gen.id` (package_generation FK) | **Package-bound** ❌ |
| Create `RuntimeAudit` | `package_id` | **Package-bound** ❌ |

### 2C. Output Storage Dependencies

| Output | Storage Target | FK Dependency |
|---|---|---|
| Metadata hasil LLM | `MetadataVariant` | `package_generation_id` → `PackageGeneration` |
| Metadata dipilih | `MetadataLibrary` | `source_variant_id` → `MetadataVariant` |
| Thumbnail/Footage | File di disk | Path via `channel.slug` |
| Thumbnail record | `GenerationAsset` | `package_generation_id` → `PackageGeneration` |
| Execution log | `RuntimeAudit` | `package_id` (non-nullable, non-FK) |

---

## 3. Package Dependency Assessment

### Q1: Apakah Runtime Core dimiliki oleh Package Domain, Production Domain, atau Hybrid?

**Temuan: Hybrid Domain — dengan kecondongan berat ke Package Domain.**

Berikut breakdown-nya berdasarkan evidence kode:

**Yang murni Production-bound (baik):**
- `resolve_prompt_chain()` → hanya butuh `channel_id` dan `context_id`
- `build_prompt_chain_text()` → stateless, murni teks
- `resolve_combo()` → stateless string validator
- `_generate_image()` di `image_service.py` → stateless, murni HTTP call
- `generate_footage()` di `image_service.py` → sudah Production-bound ✅

**Yang Package-bound (sisa historis Sprint 7A):**
1. `build_runtime_payload()` menerima `ContentPackage` object dan menulis:
   ```python
   payload += f"Package Number: {package.package_number}\n"
   payload += f"Video File: {video_filename}\n"
   payload += f"Timestamp File Content:\n{timestamp_content}\n"
   ```
   → Package Number dan Video File di-inject ke dalam prompt untuk *konteks*. Ini adalah **Package Context Injection** yang menyebabkan Runtime Core tidak bisa berjalan tanpa Package.

2. `create_runtime_audit()` memerlukan `package_id` sebagai kolom `NOT NULL`:
   ```python
   package_id = Column(String, index=True, nullable=False)
   ```
   → Ini adalah **Hard Constraint** yang mencegah audit berjalan tanpa paket.

3. Seluruh Output Storage (`MetadataVariant`, `GenerationAsset`) terikat ke `PackageGeneration`:
   ```python
   package_generation_id = Column(String, nullable=False)
   ```
   → Tidak ada hasil generasi yang bisa disimpan ke Library secara langsung tanpa melewati `PackageGeneration` terlebih dahulu.

---

## 4. Production Dependency Assessment

### Q3: Apakah Runtime Core benar-benar membutuhkan Package Context?

**Temuan: TIDAK SEPENUHNYA.**

Berdasarkan kode aktual, `build_runtime_payload()` menggunakan `ContentPackage` untuk dua tujuan:

1. **Konteks Produksi** (`Package Number`, `Video Filename`, `Timestamp Content`) → Memberikan *ground truth* kepada LLM tentang konten yang sedang diproduksi. Ini **hanya relevan dalam skenario Package-bound** (menghasilkan metadata untuk video spesifik). Untuk Global Production Workbox (menghasilkan metadata untuk Library), informasi ini tidak diperlukan — prompt sudah cukup menjadi konteks.

2. **Channel Identifier** — digunakan untuk `channel_id` yang diperlukan oleh `resolve_prompt_chain()`. Ini bisa dipass langsung tanpa melewati Package.

**Kesimpulan:** Package Context adalah *optional enrichment*, bukan *core requirement*. Runtime Core bisa menghasilkan output berkualitas tanpa Package Context, asalkan Prompt Library sudah cukup informatif.

---

## 5. Execution Path Audit (Q2)

### Path A — Metadata Generation (Current)

```
POST /packages/{id}/generate-metadata
│
├── 1. Load ContentPackage                       [Package-bound]
├── 2. Load Channel via package.channel_id       [Package-derived]
├── 3. Validate metadata_combo from channel      [Production-bound]
├── 4. Get/Create PackageGeneration              [Package-bound]
├── 5. Set metadata_status = "processing"        [Package-bound]
│
└── runtime_core_service
    ├── 6.  resolve_prompt_chain(channel.id)     [Production-bound ✅]
    ├── 7.  build_prompt_chain_text()            [Production-bound ✅]
    ├── 8.  build_runtime_payload(ch, pkg, ts)   [Package-bound ❌ — pkg injected]
    ├── 9.  create_runtime_audit(package_id)     [Package-bound ❌]
    ├── 10. POST to 9Router                      [Stateless ✅]
    ├── 11. Parse title/description              [Stateless ✅]
    ├── 12. Create MetadataVariant(gen.id)       [Package-bound ❌]
    ├── 13. finalize_runtime_audit()             [Stateless ✅]
    └── 14. Update PackageGeneration status      [Package-bound ❌]
```

Dari 14 langkah, **6 langkah adalah Package-bound**, **8 langkah sudah Production-bound atau stateless**.

### Path B — Thumbnail Generation (Current)

Identik dengan Metadata. Perbedaan hanya pada langkah 10-12:
- Step 10: `image_service.generate_thumbnail(db, prompt, channel_id, combo)`
- Step 12: `GenerationAsset` dengan `package_generation_id`

Catatan penting: `image_service.generate_thumbnail()` menerima `channel_id` — ini **sudah mendekati Production-bound**, namun masih mengharuskan `channel_id` karena dipakai untuk menentukan path penyimpanan file (`channels/{slug}/assets/thumbnails/`).

### Path C — Footage Generation

`image_service.generate_footage()` sudah ada dan strukturnya identik dengan `generate_thumbnail`. Saat ini belum dipanggil dari mana pun. Ini **sudah Production-ready secara teknis**.

---

## 6. Library Ownership Audit (Q4)

### Kapan output berubah menjadi Production Asset?

**Saat ini:** Output LLM pertama kali disimpan ke `MetadataVariant` (milik `PackageGeneration`). Baru setelah user secara eksplisit "publish" ke Library, output masuk ke `MetadataLibrary`.

```text
Current Flow:
9Router Response → MetadataVariant (Package-owned) → [Manual Publish] → MetadataLibrary (Global)
```

Artinya: **Output TIDAK langsung menjadi Global Asset.** Output pertama kali menjadi milik Package, dan baru menjadi Library Asset setelah tindakan eksplisit.

**Implikasi untuk Production Runtime:**
Untuk Global Production Workbox yang *bypass* Package, kita perlu jalur alternatif:
```text
Production Flow:
9Router Response → MetadataLibrary (Global) [Langsung, tanpa Package]
```

Ini **tidak memerlukan skema baru** — `MetadataLibrary` sudah ada dan `source_variant_id` bersifat nullable (bisa diisi `None` jika tidak dari Variant).

Untuk Thumbnail/Footage, alur yang diinginkan:
```text
Production Flow:
image_service → File on disk → Asset table (channel_id = null atau channel_id = "shared")
```

`Asset.channel_id` sudah nullable (`nullable=True` di model), sehingga ini juga **tidak memerlukan skema baru**.

---

## 7. RuntimeAudit Compatibility (Q8)

### Apakah RuntimeAudit terlalu bergantung pada Package?

**Temuan: YA, ada satu hambatan teknis.**

```python
# models.py, line 276
package_id = Column(String, index=True, nullable=False)
```

Kolom ini `NOT NULL` dan tidak memiliki *foreign key constraint* ke `content_packages`. Artinya:
- Secara database, ini adalah plain String, bukan FK.
- Untuk Production Runtime, kita bisa mengisi `package_id` dengan nilai sentinel string seperti `"GLOBAL_WORKBOX"` tanpa perlu migrasi skema.
- Query di `GET /execution-center/traces` melakukan **JOIN ke `ContentPackage`**, sehingga record dengan `package_id = "GLOBAL_WORKBOX"` akan gagal di-join dan tidak tampil.

**Rekomendasi tanpa schema change:**
Ubah query di `execution_center.py` menggunakan `outerjoin` alih-alih `join`:
```python
# Saat ini (inner join — Package required):
query = db.query(RuntimeAudit, ContentPackage, Channel).join(
    ContentPackage, RuntimeAudit.package_id == ContentPackage.id
)

# Seharusnya (outerjoin — Package optional):
query = db.query(RuntimeAudit, ContentPackage, Channel).outerjoin(
    ContentPackage, RuntimeAudit.package_id == ContentPackage.id
).outerjoin(
    Channel, ContentPackage.channel_id == Channel.id
)
```

Ini adalah **perubahan satu baris**, tidak memerlukan migrasi atau schema change.

---

## 8. Workspace Compatibility (Q7)

**Temuan: ZERO RISK untuk Workspace.**

Seluruh Workspace (Generate, Use Library, Assembly, Upload, Publish) menggunakan endpoint:
- `POST /packages/{id}/generate-metadata`
- `POST /packages/{id}/generate-thumbnail`
- `POST /packages/{id}/assemble`
- `POST /channels/{id}/publisher/`

Semua endpoint ini **tidak akan diubah** dalam skenario apapun (A, B, atau C). Runtime Core yang dimodifikasi untuk mendukung Production Mode akan berjalan **secara paralel** dengan Package Runtime yang sudah ada, bukan menggantikannya.

**Risiko: NIHIL** selama API endpoint yang ada tidak disentuh.

---

## 9. Comparative Evaluation: Tiga Opsi Arsitektur (Q9)

---

### Option A — Pertahankan Package Runtime (Status Quo)

```text
Package → Runtime Core → Library
```

**Kelebihan:**
- Zero effort. Tidak ada perubahan.
- Audit trail sempurna per-paket.
- Workspace tetap stabil.

**Kekurangan:**
- Execution Center tidak bisa menjadi Global Production Workbox sejati.
- Setiap produksi aset global tetap memerlukan pembuatan Package "dummy".
- Hambatan pertumbuhan: Metadata Library dan Asset Library tidak bisa diisi secara independen.
- Kontradiksi dengan identitas proyek yang sudah ditetapkan ("Execution Center = Global Production Workbox").

**Dampak jangka panjang:**
- Technical debt akan terus bertambah karena Execution Center akan selalu "pura-pura" menjadi Package Workbox.
- Setiap sprint baru akan ada gesekan antara Package Domain dan Production Domain.

**Verdict: TIDAK DIREKOMENDASIKAN** — Bertentangan dengan arah arsitektur yang sudah disetujui.

---

### Option B — Full Production Runtime

```text
Execution Center → Runtime Core → Library
Workspace → Library Mapping → Package
```

**Kelebihan:**
- Selaras 100% dengan identitas proyek ("Execution Center = Global Production Workbox").
- Metadata Library dan Asset Library benar-benar menjadi entitas Global yang independen.
- Eksekusi bisa berjalan tanpa Package — volume produksi murni berbasis Prompt × Count.

**Kekurangan:**
- Membutuhkan endpoint baru yang melewati `PackageGeneration`.
- `RuntimeAudit` perlu penanganan khusus (`package_id` sentinel atau `outerjoin`).
- Output storage perlu jalur baru: langsung ke `MetadataLibrary` dan `Asset`, bukan ke `MetadataVariant` dan `GenerationAsset`.

**Risiko migrasi:**
- **Rendah** — tidak ada schema change yang diperlukan.
- `MetadataLibrary.source_variant_id` adalah nullable (bisa diisi `None`).
- `Asset.channel_id` adalah nullable (bisa diisi `None` atau "shared").
- `RuntimeAudit.package_id` adalah non-FK String (bisa diisi sentinel `"GLOBAL_WORKBOX"`).
- Perubahan backend minimal: satu endpoint baru + `outerjoin` di Traces query.

**Verdict: DIREKOMENDASIKAN** — Selaras penuh dengan identitas proyek. Risiko teknis rendah berdasarkan evidence kode aktual.

---

### Option C — Dual Runtime Architecture

```text
Runtime Core
├── Package Runtime (existing, unchanged)
└── Production Runtime (new, parallel)
```

**Kelebihan:**
- Zero breaking changes pada Package Runtime.
- Fleksibilitas tertinggi — setiap mode bisa berevolusi secara independen.
- Backward compatible 100%.

**Kekurangan:**
- Kompleksitas lebih tinggi — dua jalur eksekusi yang harus dimaintain.
- Risiko drift: kedua jalur bisa berkembang ke arah berbeda dan menjadi tidak konsisten.
- Developer harus memahami dua paradigma sekaligus.

**Kompleksitas:**
- `build_runtime_payload()` perlu direfaktor menjadi dua varian: `build_package_payload()` dan `build_production_payload()`.
- `create_runtime_audit()` perlu mendukung optional `package_id`.
- Seluruh `generation_service.py` perlu dijaga agar tidak "bocor" ke Production Runtime.

**Kompatibilitas:**
- Workspace: 100% aman.
- Execution Center: aman jika Production Runtime diimplementasikan sebagai jalur paralel.

**Verdict: DAPAT DIPERTIMBANGKAN sebagai transisi menuju Option B** — Ideal sebagai pendekatan "incremental" jika Option B ingin diimplementasikan secara bertahap tanpa risiko.

---

## 10. Production Identity Validation (Q10)

**Pertanyaan:** Apakah Runtime Core saat ini mendukung identitas `Execution Center = Produce Assets`?

**Jawaban berdasarkan evidence:**

```text
TIDAK — dalam kondisinya saat ini.

Runtime Core (via generation_service.py) MEMAKSA:
  - Package harus ada sebagai titik masuk.
  - PackageGeneration harus ada sebagai storage container.
  - RuntimeAudit package_id harus diisi.

Runtime Core TIDAK MENDUKUNG:
  - Eksekusi tanpa Package.
  - Output langsung ke MetadataLibrary.
  - Output langsung ke Asset (tanpa PackageGeneration).
```

Namun, sekitar **57% dari komponen Runtime Core** (`resolve_prompt_chain`, `build_prompt_chain_text`, `resolve_combo`, `9Router call`, `finalize_audit`) sudah **Production-bound atau stateless**. Hanya **43% sisanya** yang merupakan residu Package-bound.

---

## 11. Recommended Direction

### Rekomendasi: **Option B — Full Production Runtime** (diimplementasikan dengan pendekatan Option C)

**Rationale berdasarkan evidence:**

1. **Package Context di `build_runtime_payload()` adalah opsional** — LLM bisa menghasilkan output berkualitas menggunakan Prompt Library saja, tanpa `Package Number` atau `Video Filename`.

2. **Output Storage tidak memerlukan skema baru** — `MetadataLibrary.source_variant_id` nullable, `Asset.channel_id` nullable, `RuntimeAudit.package_id` adalah non-FK string.

3. **57% Runtime Core sudah Production-bound** — Refaktor yang diperlukan minimal.

4. **`image_service.generate_footage()` sudah ada** — Footage Workbox bisa langsung diaktifkan.

5. **Workspace sama sekali tidak terpengaruh** — Endpoint Package tidak akan disentuh.

**Strategi implementasi yang direkomendasikan (Option C → B):**

```text
Fase 1: Tambahkan jalur Production Runtime secara paralel (Option C)
  - Endpoint baru: POST /api/execution-center/generate
  - build_production_payload() tanpa Package context
  - Output langsung ke MetadataLibrary / Asset
  - RuntimeAudit menggunakan package_id = "GLOBAL_WORKBOX"
  - Traces query diubah ke outerjoin (satu baris)

Fase 2: Workbox UI dihubungkan ke jalur baru
  - Package Runtime (via /packages/{id}/generate-*) tetap berjalan
  - Production Runtime (via /execution-center/generate) paralel

Hasilnya: Dual Runtime Architecture yang sehat
```

---

## 12. Risks

| Risiko | Level | Mitigasi |
|---|---|---|
| RuntimeAudit dengan `package_id = "GLOBAL_WORKBOX"` tidak tampil di Traces | **Rendah** | Ubah JOIN → outerjoin di `execution_center.py` |
| MetadataLibrary item tanpa `source_variant_id` tidak memiliki trace ke asal | **Rendah** | Tambahkan field `source_type` (string enum) ke LibraryItem secara opsional di sprint berikutnya |
| `Asset` tanpa `channel_id` tidak muncul di Channel Asset Browser | **Rendah** | Filtering Asset Browser perlu mendukung `channel_id = null` sebagai "Shared/Global" |
| Output path untuk Thumbnail/Footage global perlu lokasi disk baru | **Rendah** | Gunakan direktori `shared/assets/thumbnails/` atau `shared/assets/footage/` |
| Developer mengira endpoint Package lama sudah deprecated | **Rendah** | Dokumentasi internal yang jelas tentang kedua jalur eksekusi |

---

## 13. Architectural Sequencing Recommendation

```text
Sprint 7C-5 Correction (In Progress)
↓
→ Ubah ProductionForm.tsx (Multi Prompt, Output Count, No Target Package)
→ Tambah POST /api/execution-center/generate (Production Runtime Entry Point)
→ Ubah outerjoin di execution_center.py/traces
→ Aktifkan Footage Workbox

Sprint 7C-6 (Jika disetujui setelah audit ini)
↓
→ Pisahkan build_runtime_payload() menjadi Package Payload vs Production Payload
→ Formalisasi Dual Runtime Architecture
→ Verifikasi output ke MetadataLibrary dan Asset (tanpa PackageGeneration)

Sprint 7D+ (Future)
↓
→ Evaluasi apakah Package Runtime masih relevan atau bisa di-deprecate
→ Full Option B jika Workspace sudah sepenuhnya menggunakan Library Mapping
```

---

## Kesimpulan

| Pertanyaan | Jawaban |
|---|---|
| Apakah Runtime Core saat ini Package-Centric? | **Ya — 43% komponen terikat Package** |
| Apakah Runtime Core bisa dilepas dari Package? | **Ya — tidak ada hambatan teknis yang kritis** |
| Apakah perlu schema change? | **Tidak — semua tabel yang diperlukan sudah ada** |
| Rekomendasi arah? | **Full Production Runtime (Option B) via Dual Runtime transisi (Option C)** |
| Risiko terhadap Workspace? | **Zero Risk** |
