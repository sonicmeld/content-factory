# Database Workflow

## Purpose

Dokumen ini mendefinisikan standar perubahan database pada Content Factory.

Tujuannya adalah memastikan:

* `models.py`
* `schema.sql`
* Alembic Migration
* Database Production

tetap sinkron.

---

# Source of Truth

Content Factory menggunakan tiga lapisan database yang memiliki tanggung jawab berbeda.

## 1. models.py

Berfungsi sebagai:

```text
ORM Truth
```

Semua perubahan struktur database harus terlebih dahulu direpresentasikan pada SQLAlchemy model.

Contoh:

* Tambah tabel
* Tambah kolom
* Ubah tipe data

---

## 2. schema.sql

Berfungsi sebagai:

```text
Fresh Install Truth
```

File ini digunakan ketika:

* Instalasi server baru
* Recovery database
* Rebuild database dari nol

Setiap perubahan schema wajib diperbarui di file ini.

---

## 3. Alembic

Berfungsi sebagai:

```text
Upgrade Truth
```

Digunakan untuk:

* Menambah tabel
* Menambah kolom
* Menambah index
* Evolusi schema database existing

Alembic tidak menggantikan schema.sql.

Alembic hanya digunakan sebagai jalur upgrade.

---

# Required Workflow

Setiap perubahan database WAJIB mengikuti urutan berikut:

```text
Update models.py
↓
Update schema.sql
↓
Create Alembic Migration
↓
Review Migration
↓
Commit
```

---

# Migration Review Checklist

Sebelum merge:

## Verify Down Revision

Pastikan:

```python
down_revision
```

mengarah ke revision HEAD yang benar.

Contoh:

```text
Current Head
↓
New Migration
```

Jangan membuat branch migration yang tidak disengaja.

---

## Verify Schema Sync

Pastikan perubahan yang sama muncul di:

```text
models.py
schema.sql
migration file
```

---

# Deployment Workflow

Untuk server existing:

```bash
alembic upgrade head
```

---

Untuk server baru:

```bash
sqlite3 content_factory.db < schema.sql
```

---

# Recovery Strategy

Jika migration gagal atau database test rusak:

1. Verifikasi schema.sql
2. Rebuild database dari schema.sql
3. Jalankan validasi aplikasi

Schema.sql dianggap sebagai Golden Snapshot dari database project.

---

# Notes For AI Agents

Saat melakukan perubahan database:

DO:

```text
Update models.py
Update schema.sql
Create migration
Review migration chain
```

DO NOT:

```text
Update models.py only
Update migration only
Ignore schema.sql
```

Semua perubahan database harus menjaga sinkronisasi antara:

models.py
schema.sql
alembic migrations

```
```
