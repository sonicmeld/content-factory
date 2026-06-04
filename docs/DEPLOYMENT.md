# DEPLOYMENT.md

# Deployment Strategy

Content Factory menggunakan model deployment sederhana:

Development
↓
GitHub
↓
Production Server

Server tidak digunakan untuk development.

Seluruh development dilakukan di PC lokal.

Production hanya menjalankan aplikasi.

---

# Environment Overview

## Development

Location:

PC Lokal

Purpose:

* Coding
* Testing
* UI Development
* API Development

Repository:

GitHub

---

## Production

Location:

Mini Server Debian

Purpose:

* Asset Storage
* Scheduler
* Upload Automation
* YouTube Publishing
* 9Router Integration

---

# Server Specification

Hostname:

bondshells

Operating System:

Debian

Storage:

~462GB

Main Application Path:

/opt/apps/content-factory

Data Path:

/data

---

# Directory Structure

Application:

/opt/apps/content-factory

Data:

/data

Logs:

/opt/apps/content-factory/logs

Backups:

/data/backups

---

# Deployment Flow

Developer

git push

↓

GitHub

↓

Mini Server

git pull

↓

Restart Service

---

# Initial Deployment

Clone repository:

git clone <repository-url>

Application path:

/opt/apps/content-factory

---

# Environment Variables

Stored in:

/opt/apps/content-factory/.env

Example:

APP_ENV=production

DATABASE_PATH=/opt/apps/content-factory/database/content_factory.db

DATA_PATH=/data

NINE_ROUTER_URL=http://192.168.5.100:20128/v1

NINE_ROUTER_API_KEY=xxxxx

---

# Database

Engine:

SQLite

Location:

/opt/apps/content-factory/database/content_factory.db

Backup Frequency:

Daily

Backup Location:

/data/backups/database

---

# Reverse Proxy

Server:

Nginx

Purpose:

* Reverse Proxy
* Static File Serving
* SSL Termination

---

# Cloudflare Tunnel

Purpose:

OAuth Callback

Public URL:

oauth.domain.com

Tunnel Destination:

http://127.0.0.1:3000

Notes:

Dashboard tetap diakses melalui LAN.

Tunnel hanya digunakan untuk OAuth callback.

---

# Application Services

Main Services:

Frontend

Backend

Scheduler Worker

Upload Worker

---

# Startup Strategy

Services start automatically after reboot.

Recommended:

systemd

Service Examples:

content-factory.service

scheduler-worker.service

upload-worker.service

---

# Backup Strategy

Daily:

Database Backup

Weekly:

Configuration Backup

Monthly:

Full Asset Backup

Location:

/data/backups

---

# Logging

Application Logs:

/opt/apps/content-factory/logs

Channel Logs:

/data/channels/{channel}/logs

Retention:

30 Days

---

# Upgrade Process

1. Backup Database

2. Backup Config

3. git pull

4. Run Migration

5. Restart Services

6. Verify Health Checks

---

# Rollback Strategy

1. Restore Database Backup

2. Restore Configuration Backup

3. Checkout Previous Git Commit

4. Restart Services

---

# Security Notes

Never commit:

.env

OAuth Tokens

Database Files

Credentials

Backup Files

Use .gitignore for all sensitive data.
