# CONTENT FACTORY WORKFLOW

Version: 1.0
Status: Living Document

---

# 1. PROJECT VISION

Content Factory adalah platform produksi konten YouTube berbasis AI yang dirancang untuk:

* Mengelola banyak channel YouTube dalam satu dashboard.
* Menghasilkan aset konten secara otomatis.
* Mengelola workflow produksi dari ide hingga publikasi.
* Menyimpan seluruh aset secara terstruktur.
* Mendukung skalabilitas multi-channel.

Target akhir bukan sekadar upload video ke YouTube, tetapi membangun sistem produksi konten otomatis end-to-end.

---

# 2. CORE PRINCIPLES

## Single Source of Truth

### Database

SQLite digunakan untuk:

* Metadata
* Queue
* OAuth
* Scheduler
* Asset Records

SQLite tidak menyimpan file binary.

---

### Filesystem

Filesystem adalah sumber kebenaran untuk:

* Thumbnail
* Footage
* Audio
* Prompt Files
* Render Output

Semua file fisik disimpan di filesystem.

---

## Production First

Mini Server adalah environment utama.

Urutan validasi:

AG IDE
→ GitHub
→ Mini Server
→ Real Testing

Feature dianggap selesai hanya setelah lolos pengujian di Mini Server.

---

# 3. SYSTEM ARCHITECTURE

## Frontend

React
TypeScript
React Query

Berfungsi sebagai:

* Dashboard
* Channel Management
* Asset Management
* Upload Queue
* Scheduler
* AI Studio

---

## Backend

FastAPI

Berfungsi sebagai:

* API Layer
* Business Logic
* OAuth Management
* Asset Management
* Upload Engine
* Scheduler Engine

---

## Database

SQLite

Menyimpan:

* Channels
* GCP Profiles
* OAuth Tokens
* Upload Jobs
* Assets Metadata
* Scheduler Jobs

---

## Storage

Filesystem

Struktur:

/data
├── shared
│   ├── thumbnails
│   ├── footage
│   └── prompts
│
└── channels
└── <channel_slug>
├── thumbnails
├── footage
└── prompts

---

# 4. CHANNEL WORKFLOW

## Create Channel

User membuat channel baru.

Input:

* Name
* Slug
* Description
* GCP Profile

Output:

* Record channel
* Folder channel dibuat otomatis

---

## OAuth Connection

Channel
→ Connect OAuth
→ Google Consent Screen
→ Callback
→ Token Saved

Status:

* OAuth Missing
* OAuth Connected
* OAuth Expired

---

## Channel Lifecycle

Create
→ Edit
→ OAuth Connect
→ Produce Content
→ Publish Content
→ Archive/Delete

---

# 5. ASSET WORKFLOW

## Shared Assets

Asset yang dapat digunakan oleh semua channel.

Contoh:

* Global thumbnails
* Stock footage
* Shared prompts

Lokasi:

/data/shared/

---

## Channel Assets

Asset khusus channel tertentu.

Lokasi:

/data/channels/<slug>/

---

## Asset Types

### Thumbnails

Image asset.

Format:

* JPG
* JPEG
* PNG
* WEBP

---

### Footage

Video asset.

Format:

* MP4
* MOV
* MKV
* WEBM

---

### Audio

Audio asset.

Format:

* WAV
* MP3

---

### Prompts

Prompt asset.

Format:

* TXT
* MD

---

# 6. ASSET STORAGE POLICY

## File Size

Maksimum:

2 GB

---

## Upload Method

Wajib menggunakan:

Streaming Upload

Contoh:

while chunk := await file.read(1024 * 1024):
f.write(chunk)

Tidak boleh menggunakan:

await file.read()

untuk keseluruhan file.

---

## Database Asset Metadata

Database hanya menyimpan:

* id
* filename
* file_path
* asset_type
* file_size
* mime_type
* channel_id
* created_at

Binary tidak boleh disimpan ke SQLite.

---

# 7. CONTENT PRODUCTION WORKFLOW

Target workflow utama:

Topic
→ Research
→ Prompt Generation
→ Thumbnail Generation
→ Footage Generation
→ Asset Library
→ Video Assembly
→ Upload Queue
→ Scheduler
→ YouTube Publish

---

# 8. AI STUDIO WORKFLOW

## Prompt Factory

Input:

* Theme
* Mood
* Duration
* Language
* Audience

Output:

Prompt terstruktur.

---

## Thumbnail Generator

Prompt
→ AI Image Generation
→ Save Asset
→ Asset Library

---

## Footage Generator

Prompt
→ AI Footage Generation
→ Save Asset
→ Asset Library

---

Semua hasil AI harus masuk ke Asset Library.

Tidak boleh ada storage terpisah.

---

# 9. UPLOAD WORKFLOW

## Upload Queue

Status:

Pending
→ Processing
→ Scheduled
→ Published

Error:

Failed
→ Retry
→ Published

---

## Queue Metadata

Upload Job menyimpan:

* title
* description
* thumbnail
* video_path
* retry_count
* error_message

---

# 10. SCHEDULER WORKFLOW

Content siap publish.

Queue
→ Scheduler
→ Scheduled Time
→ Upload Engine
→ YouTube API
→ Published

---

# 11. DEVELOPMENT WORKFLOW

## Mandatory Flow

AG IDE
→ Code
→ Git Commit
→ Git Push

Mini Server
→ Git Pull
→ Restart Service
→ Real Testing
→ Log Validation

---

## Completion Criteria

Feature dianggap selesai hanya jika:

* Backend berhasil
* Frontend berhasil
* Mini Server berhasil
* Database berhasil
* Tidak ada error log

---

# 12. PROJECT ROADMAP

## Completed

* SQLite Production Database
* Alembic Migration
* Channel CRUD
* Upload Queue CRUD
* OAuth Integration
* OAuth Status
* Asset Storage Architecture

---

## Current Sprint

Sprint 2

Asset Library Enhancement

* Upload 2GB
* Asset Metadata
* Asset Preview
* Asset Delete
* Asset Download
* Upload Progress

---

## Next Sprint

AI Studio

* Prompt Factory
* Thumbnail Generator
* Footage Generator

---

## Future Sprint

Publishing Engine

* Scheduler
* Automated Upload
* Retry Engine
* Multi Channel Automation

---

# END GOAL

Membangun sistem produksi konten YouTube berbasis AI yang mampu mengelola banyak channel dari satu dashboard, menghasilkan aset secara otomatis, menjadwalkan publikasi, dan mengotomatisasi workflow produksi konten secara end-to-end.
