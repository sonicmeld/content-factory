# TDD — Sprint 7C-5: Global Execution Center Realignment

## 1. Objective
Mengubah implementasi teknis `GlobalExecutionCenterPage` agar sepenuhnya mencerminkan fungsi produksi, dengan menghapus UI berbasis *monitoring* dan menggantinya dengan *Production Forms* (Metadata, Thumbnail, Footage) serta tab khusus *Runtime Monitoring*. Mengingat *constraint* **Zero Breaking Changes**, kita tidak akan mengubah *Endpoint API* saat ini, melainkan merekayasa cara *Frontend* menyajikan alur kerja produksi tersebut.

## 2. Technical Scope

### 2.1 Refactor Struktur Halaman GlobalExecutionCenterPage
File: `frontend/src/pages/GlobalExecutionCenterPage.tsx`
- Hapus tab eksisting: `gaps`, `active`, `ready`.
- Hapus mekanisme navigasi *Tab* sepenuhnya.
- Susun ulang halaman menjadi **Single Page Layout** vertikal yang memuat:
  - Baris atas: Kumpulan *Production Form Workbox* (Metadata, Thumbnail, Footage) yang dirender bersebelahan atau bersusun.
  - Baris bawah: Panel **Runtime Monitoring & Feed** terintegrasi.

### 2.2 Komponen Baru: Production Form
File: `frontend/src/components/ExecutionCenter/ProductionForm.tsx` (baru)
- Membuat komponen Form generik yang dapat dikonfigurasi secara ketat untuk tipe produksinya: `metadata` atau `thumbnail`. **Dilarang keras** menggabungkannya menjadi form "Image Production", karena Thumbnail (PNG) dan Footage (PNG) melayani tujuan bisnis yang berbeda (Thumbnail Candidate vs Content Material Candidate).
- **Target Selector (Mencegah Breaking Changes):** Karena API `generateMetadata` dan `generateThumbnail` secara historis dan fundamental membutuhkan `package_id`, Form ini akan memuat *Dropdown* khusus bernama "Production Target". Dropdown ini diisi dari *endpoint* `getWorkboxPackages` (difilter hanya untuk menampilkan paket yang masih berstatus `uninitialized` di *asset type* tersebut).
- **Production Setup:** Berisi *dropdown* untuk:
  - System Combo (`getGenerationCombos`)
  - Prompt Context (`getGlobalPromptContexts`)
- **Action:** Tombol `Generate [Asset Type]` yang akan mengeksekusi mutasi API yang ada tanpa membongkar *backend*.

### 2.3 Panel Monitoring & Feed Terpadu
Komponen `ExecutionList` dan `GlobalTracesList` akan disempurnakan dan digabungkan di bagian bawah halaman.
- **Runtime Output Feed:** Menambahkan komponen *feed* atau notifikasi sukses historis yang memvisualisasikan "Aset baru saja diproduksi dan dikirim ke Library".
- **Active Operations:** Menampilkan eksekusi yang sedang berjalan (`processing` / `pending`).
- **Traces:** Menampilkan log di bagian bawah untuk melihat kesehatan respon dari LLM/Provider gambar.

## 3. Data Flow & Zero Breaking Changes
- **Backend API:** Tidak ada perubahan pada rute `POST /packages/{packageId}/generate-metadata` atau `POST /packages/{packageId}/generate-thumbnail`.
- **Backend Models:** Tidak ada perubahan pada skema `ContentPackage` atau `PackageGeneration`.
- **Workbox API:** API `GET /api/execution-center/workbox` masih akan digunakan oleh *Frontend* murni sebagai sumber data (data source) untuk mengisi dropdown "Production Target" di dalam Form, BUKAN untuk dirender sebagai tabel *Production Gaps*.

## 4. Acceptance Criteria
1. Saat pengguna membuka *Global Execution Center*, mereka langsung disambut oleh "Metadata Workbox" yang berisi Form, bukan tabel monitoring.
2. Pengguna tidak dapat melihat "Assembly Ready" atau "Production Gaps" secara eksplisit di Execution Center (sebagai tabel mandiri). Informasi perakitan hanya dapat dilihat di dalam *Channel Workspace*.
3. Form produksi berfungsi secara *end-to-end* (memilih target, merangkai *combo*/*prompt*, menekan Generate, dan melihat notifikasi sukses) tanpa ada error API yang disebabkan oleh struktur tabel *database*.
