/
├── opt
│   └── apps
│       └── content-factory
│
└── data
Application Directory
/opt/apps/content-factory
│
├── backend
│
├── frontend
│
├── database
│   ├── schema.sql
│   ├── migrations
│   └── content_factory.db
│
├── config
│   ├── app.json
│   ├── storage.json
│   └── router.json
│
├── logs
│
├── docs
│
├── scripts
│
└── credentials
Data Directory
/data
│
├── channels
│
├── shared-assets
│
├── temp
│
└── backups
Channel Structure

Saat user menambahkan channel:

Rain Memories

sistem otomatis membuat:

/data/channels/rain-memories
Channel Directory
/data/channels/rain-memories
│
├── assets
│
├── uploads
│
├── config
│
└── logs
Assets

Semua asset channel berada di sini.

assets
│
├── footage
│
├── thumbnails
│
└── prompts
Footage

Gambar yang digunakan untuk membuat video.

assets/footage
│
├── rainy-night-001.jpg
├── rainy-night-002.jpg
├── rainy-night-003.jpg
└── ...
Thumbnails

Template dan hasil thumbnail.

assets/thumbnails
│
├── thumb-001.jpg
├── thumb-002.jpg
└── thumb-003.jpg
Prompt Packs

Prompt hasil generator.

assets/prompts
│
├── rainy-window.txt
├── midnight-drive.txt
└── first-love.txt
Uploads

Video final yang sudah dibuat menggunakan tool eksternal.

uploads
│
├── pending
│
├── scheduled
│
├── published
│
└── failed
Pending

Video baru upload.

uploads/pending
Scheduled

Video menunggu jadwal publish.

uploads/scheduled
Published

Video berhasil upload.

uploads/published
Failed

Upload gagal.

uploads/failed
Config

Konfigurasi channel.

config
│
└── channel.json

Contoh:

{
  "channel_name": "Rain Memories",
  "slug": "rain-memories",
  "gcp_profile": "gcp-01",
  "upload_frequency": "daily",
  "timezone": "Asia/Jakarta"
}
Logs
logs
│
├── upload.log
├── scheduler.log
└── oauth.log
Shared Assets

Aset yang digunakan lintas channel.

/data/shared-assets
│
├── thumbnails
│
├── prompts
│
└── templates

Contoh:

shared-assets/prompts

berisi:

Rain Prompt Pack
Night Drive Prompt Pack
Nostalgia Prompt Pack

yang bisa digunakan banyak channel.

Temporary Files
/data/temp

Digunakan untuk:

Upload sementara
Thumbnail processing
Import asset
Export data

Dapat dibersihkan otomatis.

Backup Structure
/data/backups
│
├── database
│
├── channels
│
└── configs
Folder Creation Rules

Saat Channel Manager membuat channel baru:

Add Channel
↓
Create Database Record
↓
Create Folder Structure
↓
Ready

Contoh:

Broken Heart Memories

otomatis membuat:

/data/channels/broken-heart-memories
│
├── assets
│   ├── footage
│   ├── thumbnails
│   └── prompts
│
├── uploads
│   ├── pending
│   ├── scheduled
│   ├── published
│   └── failed
│
├── config
│
└── logs