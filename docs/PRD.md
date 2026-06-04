# Content Factory PRD v1

## Vision

Content Factory adalah platform self-hosted untuk mengelola aset visual, metadata, jadwal upload, dan publikasi YouTube untuk banyak channel dalam satu dashboard.

Sistem tidak bertugas membuat video.

Video dibuat menggunakan workflow dan tool eksternal milik pengguna.

Sistem bertugas menyediakan asset, metadata, manajemen channel, dan upload automation.

---

# Core Workflow

## Asset Workflow

9Router
↓
Prompt Generator
↓
Image Generator
↓
Channel Asset Library

---

## Content Workflow

Asset Library
↓
Download Asset
↓
External Editing Tool
↓
Video Final

---

## Upload Workflow

Video Final
↓
Upload ke Server
↓
Upload Queue
↓
Scheduler
↓
YouTube Publish

---

# Goals

## Primary Goals

* Multi Channel YouTube Management
* Asset Management Per Channel
* AI Prompt Generation
* Thumbnail Asset Management
* Upload Queue Management
* YouTube Scheduler
* Multi GCP Support
* 9Router Integration

## Non Goals

* Video Rendering
* FFmpeg Automation
* Video Editing
* Live Streaming
* Multi User SaaS

---

# Infrastructure

Production Server:

Mini Server Debian

Components:

* Nginx
* SQLite
* 9Router
* Cloudflare Tunnel
* Content Factory

Development:

PC Local

Repository:

GitHub

Deployment:

Git Pull

---

# Core Modules

## 1. Settings

System settings.

Features:

* Application configuration
* Storage configuration
* 9Router configuration

---

## 2. GCP Profiles

Manage Google Cloud profiles.

Features:

* Add GCP
* Edit GCP
* Disable GCP

Purpose:

* Multi quota management
* Multi OAuth support

---

## 3. Channel Manager

Manage YouTube channels.

Features:

* Add Channel
* OAuth Authorization
* Assign GCP Profile
* Channel Configuration

Each channel contains:

* Upload schedule
* Thumbnail style
* Metadata style

---

## 4. Asset Library

Store visual assets.

Asset Types:

* Footage Images
* Thumbnail Assets
* Prompt Packs

Features:

* Upload
* Download
* Preview
* Organize

---

## 5. Prompt Factory

Using 9Router.

Input:

* Theme
* Mood
* Channel Style

Output:

* Prompt Packs

---

## 6. Thumbnail Factory

Using 9Router.

Generate:

* Thumbnail Concepts
* Thumbnail Prompts

Output:

* Thumbnail Assets

---

## 7. Metadata Factory

Using 9Router.

Generate:

* Title
* Description
* Tags
* Hashtags

Based On:

* Channel DNA
* Theme
* Content Type

---

## 8. Upload Queue

Manage uploaded videos.

Status:

* Pending
* Scheduled
* Published
* Failed

Features:

* Retry Upload
* Manual Upload
* Schedule Upload

---

## 9. Scheduler

Automated publishing.

Features:

* Daily Schedule
* Weekly Schedule
* Custom Schedule

---

## 10. YouTube Publisher

Using:

* YouTube Data API
* OAuth 2.0

Features:

* Upload Video
* Set Metadata
* Set Thumbnail
* Schedule Publish

---

# Storage Structure

/data

/channels

/backups

/temp

/shared-assets

---

# Channel Structure

/data/channels/{channel-slug}

assets/
│
├── footage
├── thumbnails
└── prompts

uploads/
│
├── pending
├── scheduled
├── published
└── failed

config/
logs/

channel.json

---

# Database Tables

gcp_profiles

channels

assets

prompts

metadata_templates

upload_jobs

scheduler_jobs

oauth_tokens

---

# AI Integration

Provider:

9Router

Functions:

* Prompt Generator
* Metadata Generator
* Thumbnail Generator
* Niche Research

---

# MVP Version

Modules Included:

* Settings
* GCP Profiles
* Channel Manager
* Asset Library
* Prompt Factory
* Metadata Factory
* Upload Queue
* Scheduler
* YouTube Publisher

Modules Deferred:

* Analytics
* Revenue Tracking
* Team Management
* Multi User

---

# Success Criteria

* Add Channel Successfully
* Store Assets Successfully
* Generate Prompt Packs
* Generate Metadata
* Upload Video Successfully
* Schedule Publish Successfully
* Manage Multiple Channels
