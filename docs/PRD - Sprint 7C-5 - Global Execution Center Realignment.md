# PRD — Sprint 7C-5: Global Execution Center Realignment

## 1. Objective
Menyelaraskan kembali (*realign*) arsitektur **Global Execution Center** agar murni berfungsi sebagai **Global Production Workbox**, sesuai dengan *Project Identity*. Pembaruan ini menggeser fokus UI dari *Package Monitoring* (yang merupakan domain dari *Channel Workspace*) menjadi *Active Production* (produksi aset Metadata, Thumbnail, dan kelak Footage).

## 2. Core Concepts
- **Domain Separation:** 
  - *Package Lifecycle* (Gaps, Assembly, Upload) adalah milik **Channel Domain**.
  - *Asset Production* (Generate, Monitor Provider, Runtime Logs) adalah milik **Execution Center Domain**.
- **Strict Prompt Type Boundary:** Memisahkan *workbox* secara absolut berdasarkan tujuan produksi (bukan sekadar format file):
  - **Metadata Workbox:** Menghasilkan *Text Asset* ke Metadata Library.
  - **Thumbnail Workbox:** Menghasilkan *Image Asset (PNG)* sebagai *Final Thumbnail Candidate* ke Asset Library.
  - **Footage Workbox:** Menghasilkan *Image Asset (PNG)* sebagai *Content Material Candidate* ke Asset Library.
  > **Note:** Tidak boleh ada *cross-type selector* atau penggabungan modul gambar (*Image Production Workbox*). Walaupun Thumbnail dan Footage sama-sama menghasilkan PNG, fungsi produksinya berbeda secara bisnis.

## 3. Scope of Work

### 3.1 Single Page Workbox Layout
Halaman `GlobalExecutionCenterPage.tsx` akan direstrukturisasi secara radikal menjadi *Single Page Layout* (tanpa tab navigasi) yang merangkum:
1. **Metadata Workbox** (Fokus pada input Form dan Combo teks)
2. **Thumbnail Workbox** (Fokus pada input Form dan Combo gambar untuk Thumbnail)
3. **Footage Workbox** (Placeholder/Disabled untuk iterasi masa depan)
4. **Runtime Monitoring & Feed** (Menyatukan log aktivitas dan hasil output)

> [!NOTE]
> *Production Gaps* dan *Assembly Ready* dihapus sepenuhnya dari layar Execution Center karena hal tersebut adalah domain *Workspace*.

### 3.2 Production Form Workbox
Alih-alih menampilkan baris paket yang *bolong*, tab *Production* akan menampilkan UI Form. Karena `Zero Breaking Changes` melarang perombakan alur API eksisting (di mana `generateMetadata` masih terikat dengan `package_id`), bentuk *Workbox* akan diubah menjadi:

- **Target Assignment:** *Dropdown/Selector* untuk memilih Channel & Package yang membutuhkan aset. (Menjaga kompatibilitas dengan API saat ini).
- **Production Setup (Inti Form):**
  - Pemilihan *Combo* (Sistem Instruksi).
  - Pemilihan *Prompt Context* (Perintah Spesifik).
  - (Opsional) *Output Count* (Berapa varian yang ingin dihasilkan).
- **Execution:** Tombol **Generate Metadata** atau **Generate Thumbnail**.

### 3.3 Runtime Monitoring & Output Feed
Bagian bawah halaman akan didedikasikan untuk memantau kesehatan mesin dan rekam jejak produksi:
- **Runtime Output Feed:** Memperlihatkan secara aktual aset apa yang baru saja berhasil diproduksi dan disimpan (contoh: *Metadata Generated → Saved to Metadata Library*).
- **Active Operations:** Menampilkan tugas-tugas yang berstatus `pending` atau `processing` dari *Runtime Core* (bukan status Package).
- **Runtime Traces:** Menampilkan log eksekusi, pesan *error*, dan riwayat balasan *Provider* (seperti OpenAI atau Replicate).

## 4. Constraints & Guardrails
- **Execution Center produces assets.**
- **Workspace consumes assets.**
- **Execution Center must never evolve into a Package Workspace replacement.**
- **Zero Breaking Changes:** Tidak ada perubahan pada skema `ContentPackage`, `PackageGeneration`, maupun *Channel Workspace*.
- **No Upload/Publishing Refactor:** Eksekusi perakitan (Assembly) dan fitur Upload tidak disentuh di sprint ini.
- **No Queue Engine:** Eksekusi tetap asinkron murni menggunakan mekanisme *FastAPI Background Tasks* saat ini tanpa menjadwalkan tabel `execution_jobs`.

## 5. Success Metrics
- Halaman *Execution Center* tidak lagi menampilkan informasi *Assembly Readiness* atau tabel panjang tentang *Package Gaps*.
- Operator dapat melakukan produksi (*Generate*) melalui Form yang berfokus pada pengaturan *Combo* dan *Prompt*.
- Pemisahan fisik antara *Metadata Workbox* dan *Thumbnail Workbox* di dalam antarmuka.
