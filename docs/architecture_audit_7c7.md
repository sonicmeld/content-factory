# Architecture Audit — Sprint 7C-7
## Production Asset Ownership & Library Lifecycle

**Status:** Evidence-Based Audit (No Implementation, No Migration, No PRD/TDD)
**Scope:** `models.py`, `packages.py`, `asset_service.py`, `asset_engine_service.py`, `metadata_library_service.py`, `repositories/`

---

## 1. Current Asset Lifecycle Map

Berdasarkan analisis repositori dan database model saat ini, terdapat **dua jalur lifecycle aset** yang berjalan secara paralel namun tidak terintegrasi secara utuh:

### 1A. Text Asset (Metadata) Lifecycle Flow
```text
[Production Runtime]              [Package Runtime]
        │                                 │
        ▼                                 ▼
   Direct Write?                  MetadataVariant
(Belum Diimplementasi)            (Staging Table)
        │                                 │
        │                        [is_selected = True]
        │                                 │
        │                                 ▼
        └────────────────────────► [Manual Publish]
                                          │
                                          ▼
                                   MetadataLibrary
                            (Single Source of Truth)
                                    ▲     ▲
                                    │     │
                               Cloning    Workspace Mapping
                                    │     (Belum Diimplementasi)
                                    ▼
                             MetadataVariant (New copy)
```
*   **Staging:** Metadata hasil LLM disimpan pertama kali ke `MetadataVariant` yang terikat ke `package_generation_id`.
*   **Promotion:** Melalui `publish_variant_to_library()`, variant yang dipilih dipromosikan (dikopi) ke `MetadataLibrary`.
*   **Consumption (Gap):** Saat ini `MetadataLibrary` tidak dibaca langsung oleh Assembly. Jika user ingin menggunakan item library, item tersebut harus di-clone kembali menjadi `MetadataVariant` baru untuk paket target (`clone_library_item_to_variant()`).

### 1B. Media Asset (Thumbnail & Footage) Lifecycle Flow
```text
  [Manual Upload]                 [Package Runtime]
        │                                 │
        ▼                                 ▼
      Asset                        GenerationAsset
  (Asset Library)                  (Staging Table)
(channel_id=null/str)            (package_gen_id FK)
        │                                 │
        │                        [is_selected = True]
        │                                 │
        │                                 ▼
        │                         Assembly (manifest)
        ▼                                 ❌
      (Gap) ◄─────────────────────────────┘
No promotion path from GenerationAsset to Asset table
```
*   **Staging:** Thumbnail hasil generate disimpan ke `GenerationAsset` (terikat ke `package_generation_id`).
*   **Library:** File media yang diupload secara manual langsung disimpan ke tabel `Asset` (Asset Library) yang bersifat global/independen dari package.
*   **Promotion Gap:** Tidak ada jalur untuk mempromosikan candidate thumbnail terpilih dari `GenerationAsset` ke tabel `Asset`. Akibatnya, Asset Library saat ini **hanya berfungsi sebagai Upload Storage**, bukan Production Asset Database.

---

## 2. Q1: Production Asset Ownership Audit

### 1. Siapa pemilik asset setelah asset tersimpan?
Setelah aset disimpan di **Library Domain** (yaitu tabel `MetadataLibrary` dan `Asset`), kepemilikan berada pada **Global Library**. 
*   `MetadataLibrary` tidak memiliki keterikatan terhadap package.
*   `Asset` hanya mereferensikan `channel_id` (untuk tenancy/branding) atau `null`/`"shared"` untuk aset global yang bisa dipakai lintas channel (seperti footage umum).
*   Aset tidak dimiliki oleh package mana pun.

### 2. Apakah asset masih memiliki keterikatan terhadap Package?
Secara skema database:
*   **Metadata Library:** Memiliki kolom `source_variant_id` (nullable). Keterikatan ini bersifat *soft* dan hanya berfungsi sebagai audit trail sejarah pembuatan.
*   **Asset Library:** Tidak memiliki kolom `package_id` atau `package_generation_id` sama sekali. Aset bersifat sepenuhnya mandiri.

### 3. Apakah asset menjadi Production Asset permanen?
**Ya.** Aset yang telah dipromosikan ke `MetadataLibrary` or disimpan di `Asset` menjadi aset produksi permanen. Aset ini tidak akan terhapus atau ter-override jika `ContentPackage` atau `PackageGeneration` di-generate ulang atau dihapus.

### 4. Apakah Package hanya menjadi consumer?
Secara konseptual, **Ya**. Package seharusnya tidak memiliki file fisik maupun metadata sendiri, melainkan hanya mereferensikan aset yang ada di Library. Namun secara implementasi saat ini, Package masih bertindak sebagai pemilik sekunder karena Assembly masih membaca langsung dari tabel staging (`MetadataVariant` dan `GenerationAsset`).

---

## 3. Q2: Metadata Lifecycle Audit

### 1. Apakah MetadataVariant masih diperlukan?
**Ya, tetapi hanya untuk Package-bound flow.** `MetadataVariant` berfungsi sebagai sandbox/workspace bagi operator untuk membandingkan berbagai alternatif judul/deskripsi yang dihasilkan oleh LLM sebelum memutuskan mana yang terbaik untuk dipromosikan ke Library atau dipetakan ke Package.

### 2. Apakah MetadataVariant hanya staging layer?
**Ya.** Perannya murni sebagai staging layer (tempat penampungan sementara candidate hasil runtime). Ia tidak boleh menjadi target akhir penyimpanan jangka panjang.

### 3. Apakah Metadata Library seharusnya menjadi source of truth?
**Ya, secara mutlak.** Seluruh sistem (Assembly, Workspace, Publisher) harus menjadikan `MetadataLibrary` sebagai satu-satunya sumber kebenaran data metadata yang siap pakai.

### 4. Apa risiko jika Runtime langsung menulis ke Metadata Library?
*   **Library Cluttering:** Library akan dipenuhi oleh hasil generate mentah yang berkualitas rendah atau tidak relevan, karena tidak melalui kurasi (filtering/selection) oleh operator.
*   **Data Pollution:** Kehilangan fungsi kurasi menyebabkan library kotor dan menurunkan kualitas pencarian/penggunaan kembali aset.
*   **Ambiguity of Selection:** Jika runtime langsung menulis 3 opsi ke library, sistem tidak tahu opsi mana yang benar-benar disetujui untuk dipublikasikan tanpa adanya flag review tambahan.

---

## 4. Q3: Asset Library Lifecycle Audit

### 1. Apakah Asset Library siap menjadi repository global?
Secara struktur data tabel `Asset` (memiliki `id`, `asset_type`, `file_path`, `mime_type`, dan `channel_id` nullable), **sudah siap**.
Namun secara fungsional, **belum siap** karena:
1.  Belum ada mekanisme promosi dari `GenerationAsset` (hasil generate runtime) ke tabel `Asset` (library).
2.  Belum ada API untuk mendaftarkan hasil eksekusi global dari Production Runtime langsung ke tabel `Asset`.

### 2. Apakah asset perlu channel ownership?
**Ya, opsional.**
*   Aset seperti thumbnail spesifik atau video rekaman channel harus memiliki `channel_id` agar tidak bocor ke channel lain (multi-tenancy safety).
*   Aset seperti template intro, sound effect, atau stock footage generik harus memiliki `channel_id = null` (shared) agar bisa diakses secara global oleh seluruh workspace.

### 3. Apakah asset harus independen dari Package?
**Ya.** Kemandirian ini memungkinkan:
1.  Penggunaan kembali (*reusability*) aset (misal: satu footage dipakai di 5 video berbeda).
2.  Pra-produksi aset (*bulk asset generation*) di Execution Center jauh sebelum Package dibuat.

---

## 5. Q4: Asset Provenance Audit

### 1. Apakah provenance perlu dicatat?
**Ya, sangat penting.** Provenance (asal-usul) aset dibutuhkan untuk:
*   **Audit Trail & Tracing:** Mengetahui prompt, combo, dan provider mana yang menghasilkan aset tersebut jika terjadi kesalahan atau degradasi kualitas.
*   **Copyright & Licensing:** Membedakan aset yang murni dibuat oleh AI (dan model apa) dengan aset yang diupload secara manual oleh manusia (imported/licensed).
*   **Cost Tracking:** Melacak konsumsi token/biaya API yang digunakan untuk menghasilkan suatu aset spesifik di library.

### 2. Apakah provenance sudah tersedia?
**Sebagian kecil.**
*   `MetadataLibrary` memiliki kolom `source_variant_id` yang dapat ditelusuri kembali ke `MetadataVariant` -> `PackageGeneration` -> `RuntimeAudit`. Namun jika metadata ditulis langsung dari Production Runtime (bypass variant), kolom ini bernilai `null` dan provenance hilang.
*   Tabel `Asset` **sama sekali tidak memiliki kolom provenance** (tidak ada `source_combo`, `source_context`, atau `execution_id`).

### 3. Apakah provenance penting untuk Library Domain?
**Ya.** Tanpa provenance, Library Domain akan kehilangan konteks penciptaan aset. Operator tidak akan bisa menjawab pertanyaan: *"Judul/Thumbnail ini dihasilkan menggunakan model AI apa dan prompt yang mana?"*

---

## 6. Q5: Library as Single Source of Truth Audit

Tabel evaluasi kesiapan Library menjadi Single Source of Truth (SSoT) pada setiap layer:

| Layer | Kesiapan | Deskripsi Evidence / Gap |
|---|---|---|
| **Runtime** | **Belum Siap** ❌ | Runtime Core (`generation_service.py`) masih menulis output langsung ke `MetadataVariant` dan `GenerationAsset`. Belum ada entry point untuk menulis langsung ke `MetadataLibrary` atau `Asset`. |
| **Workspace** | **Belum Siap** ❌ | Workspace UI menampilkan kandidat dari tabel staging (`MetadataVariant`/`GenerationAsset`) dan menyimpannya di sana, bukan mengambil referensi dari Library. |
| **Assembly** | **Belum Siap** ❌ | `assemble_package` (`packages.py` line 130-157) melakukan query langsung ke tabel `MetadataVariant` dan `GenerationAsset` berdasarkan flag `is_selected`. Assembly sama sekali tidak membaca `MetadataLibrary` atau `Asset`. |
| **Upload** | **Siap secara tidak langsung** ⚠️ | Upload membaca file dari manifest hasil kompilasi Assembly. Karena manifest saat ini merujuk ke data staging, secara tidak langsung Upload juga bergantung pada staging. |
| **Publishing** | **Siap secara tidak langsung** ⚠️ | Status sinkronisasi dipersist ke `UploadJob` dan `ContentPackage`. Sama seperti Upload, data yang dipublikasikan bergantung pada data staging hasil Assembly. |

---

## 7. Q6: Package Mapping Boundary Audit

### 1. Apakah Package memiliki asset?
Secara arsitektur baru: **Tidak.** Package tidak memiliki aset. Package hanya bertindak sebagai "jadwal publikasi" (publication schedule container) yang membutuhkan aset.

### 2. Apakah Package hanya mereferensikan asset?
**Ya.** Hubungan yang benar adalah hubungan referensial. Package menyimpan kunci referensi (ID) dari aset yang terpilih di Library.

### 3. Apakah Package boleh menyimpan salinan asset?
**Tidak.** Menyimpan salinan (kopi fisik atau data) di tingkat Package akan merusak konsep SSoT, memicu risiko inkonsistensi data jika aset di library diperbarui (data drift), dan memboroskan ruang penyimpanan.

### 4. Apa boundary yang paling sehat?
Boundary yang paling sehat adalah **Reference-Only Mapping**.
Di mana terdapat tabel perantara mapping atau foreign key langsung pada Package yang menunjuk ke `MetadataLibrary.id` dan `Asset.id`.
```text
ContentPackage (ID: PKG-001)
├── metadata_library_id ──► MetadataLibrary (ID: LIB-MD-099)
└── thumbnail_asset_id   ──► Asset (ID: LIB-AST-888)
```

---

## 8. Q7: Assembly Dependency Audit

Arah dependensi Assembly yang paling sesuai dengan identitas proyek adalah:
```text
Assembly
  │
  ▼
Library Assets (via Package Mapping References)
```

### Rationale:
*   Jika Assembly bergantung pada `Package Assets` (tabel staging seperti `MetadataVariant` dan `GenerationAsset`), maka Library kehilangan fungsinya sebagai SSoT.
*   Jika Assembly membaca langsung dari `Library Assets` yang telah dipetakan ke Package, maka seluruh proses build dijamin menggunakan versi final, terkurasi, dan berlisensi yang tersimpan aman di pusat Database Aset Produksi.

---

## 9. Q8: Upload & Publishing Compatibility Audit

Upload Layer sebaiknya membaca **Library References** yang telah dimap ke Package.

### Rationale:
Jika operator melakukan revisi cepat terhadap judul, deskripsi, atau mengganti file thumbnail di dalam Library sesaat sebelum upload, perubahan tersebut akan **otomatis terbawa** oleh Upload Layer karena ia membaca referensi aktif dari Library.
Jika Upload Layer membaca dari Package yang menyimpan salinan lokal, revisi tersebut akan terabaikan, mengakibatkan deviasi antara apa yang tertera di Library lokal dengan apa yang terupload ke YouTube.

---

## 10. Q9: Future Growth Audit

Desain saat ini memiliki beberapa **bottleneck arsitektural** yang membatasi pertumbuhan tipe aset baru di masa depan:

### A. Coupling Ketat di Assembly (`packages.py`)
Logika assembly saat ini ditulis secara hardcoded untuk tipe `Metadata` dan `Thumbnail`:
```python
# packages.py
REQUIRED_ASSET_TYPES = ['Metadata', 'Thumbnail']
...
selected_metadata = db.query(MetadataVariant)...
selected_thumbnail = db.query(GenerationAsset)...
```
Jika kita ingin menambahkan tipe aset baru seperti `Footage`, `Audio`, atau `Subtitle`, kita harus mengubah kode inti `packages.py` untuk menambahkan query dan struktur parsing baru.

### B. Bottleneck Tabel Staging
Tabel staging (`MetadataVariant` dan `GenerationAsset`) memerlukan `package_generation_id` yang non-nullable. Hal ini memaksa setiap eksekusi runtime harus selalu memiliki objek Package. Kita tidak bisa menghasilkan bahan mentah secara bebas tanpa membuat Package dummy terlebih dahulu.

### C. Risiko Duplikasi Penyimpanan (Storage Bloat)
Jika sebuah footage yang sama (misal: video overlay berdurasi 10 detik) digunakan oleh 10 package berbeda, sistem saat ini akan membuat 10 record `GenerationAsset` berbeda dan menyalin file fisik yang sama berkali-kali ke direktori paket masing-masing karena tidak ada konsep referensi aset bersama (*shared assets*) di level Workspace Assembly.

---

## 11. Q10: Final Architecture Validation

### Evaluasi Keselarasan Model:

| Pernyataan Model | Keselarasan dengan Implementasi Saat Ini | Gap Utama |
|---|---|---|
| **Execution Center = Produce Assets** | **Sebagian Selaras** ⚠️ | UI sedang diselaraskan, namun Backend masih mewajibkan `package_id` sebagai pintu masuk eksekusi dan pencatatan audit. |
| **Library = Store Assets** | **Belum Selaras** ❌ | Baru berfungsi untuk teks (`MetadataLibrary`) dan file upload manual (`Asset`). Aset media hasil generate masih tertinggal di staging (`GenerationAsset`). |
| **Workspace = Map Assets** | **Belum Selaras** ❌ | Belum ada mekanisme mapping dari Library ke Package. Workspace saat ini melakukan seleksi variant lokal. |
| **Assembly = Compile Assets** | **Sebagian Selaras** ⚠️ | Konsep kompilasi manifest sudah benar, tetapi sumber data yang dibaca masih berupa data staging lokal paket, bukan referensi Library. |
| **Upload = Publish Assets** | **Sebagian Selaras** ⚠️ | Berfungsi dengan baik membaca manifest kompilasi, namun masih terikat dengan salinan data paket lokal. |

### Risks (Risiko Jangka Pendek & Menengah):
1.  **Data Drift:** Perubahan pada Library Item tidak tersinkronisasi ke Package karena proses kloning memutus hubungan aktif (by-copy, bukan by-reference).
2.  **Asset Siloing:** Hasil produksi gambar (thumbnail/footage) terjebak di dalam direktori dan record paket masing-masing, tidak bisa ditemukan atau digunakan kembali oleh paket lain.
3.  **Asset Type Inflexibility:** Penambahan tipe aset baru (seperti Footage di Sprint berikutnya) akan membutuhkan perubahan skema database staging atau penulisan ulang parser Assembly.

### Koreksi yang Diperlukan (Architectural Correction):
1.  **Introduce Asset Promotion:** Buat mekanisme untuk mempromosikan terpilihnya `GenerationAsset` menjadi entitas global di tabel `Asset`.
2.  **Add Reference Columns to Package:** Tambahkan kolom kunci asing pada `ContentPackage` (seperti `selected_metadata_library_id` dan `selected_thumbnail_asset_id`) atau buat tabel pemetaan `package_asset_mappings`.
3.  **Refactor Assembly Logic:** Ubah `assemble_package` agar mengambil data judul, deskripsi, dan file path secara dinamis berdasarkan ID referensi Library yang terpetakan, bukan query langsung ke tabel variant staging.
4.  **Extend Provenance Schema:** Tambahkan kolom metadata asal-usul (`source_combo`, `source_context`, `execution_id`) pada tabel `MetadataLibrary` dan `Asset` agar siap menerima penulisan langsung dari Production Runtime tanpa kehilangan trace audit.

---

## 12. Recommended Direction

Untuk menyelaraskan arsitektur menuju **Production-Centric / Library-as-SSoT** tanpa melakukan perubahan destruktif (*Zero Breaking Changes*), direkomendasikan pendekatan transisi bertahap:

### Langkah 1: Penyempurnaan Skema Provenance & Library (Persiapan)
*   Tambahkan kolom opsional/nullable pada `MetadataLibrary` dan `Asset` untuk mencatat provenance data (`source_combo`, `source_context`, `execution_id`). Hal ini menjamin audit trail tetap utuh saat Production Runtime menulis langsung ke Library.

### Langkah 2: Pembuatan Jalur Promosi Aset Media (Promotion Layer)
*   Implementasikan service `publish_asset_to_library(db, generation_asset_id)` yang menyalin rekam data dari `GenerationAsset` ke tabel `Asset` global, serta memindahkan/menyalin file fisik ke direktori `/shared/assets/`.

### Langkah 3: Transisi Assembly ke Referensi Library (Consumption Layer)
*   Ubah logic `packages.py` agar secara opsional membaca referensi dari `MetadataLibrary` dan `Asset` jika terpetakan pada paket, dengan fallback ke tabel staging lama (`MetadataVariant`/`GenerationAsset`) untuk menjaga kompatibilitas ke belakang (*backward compatibility*).
