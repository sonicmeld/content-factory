# TECH_STACK.md

# Technology Stack

## Overview

Content Factory menggunakan arsitektur ringan yang dioptimalkan untuk:

* Self-hosted deployment
* Low resource server
* SQLite database
* Local file storage
* Multi-channel YouTube automation
* 9Router integration

---

# Architecture

Frontend
↓
FastAPI Backend
↓
SQLite Database

↓

Filesystem Storage

↓

Workers

↓

YouTube API

---

# Frontend

Framework:

React

Build Tool:

Vite

Language:

TypeScript

Reason:

* Ringan
* Cepat
* Mudah dikembangkan
* Cocok untuk dashboard internal

---

# UI Framework

Shadcn/UI

Dependencies:

* TailwindCSS
* Radix UI

Reason:

* Modern
* Konsisten
* Mudah dikustomisasi
* Cocok untuk dashboard admin

---

# Backend

Framework:

FastAPI

Language:

Python 3.13+

Reason:

* Performa tinggi
* Dokumentasi otomatis
* OAuth friendly
* Cocok untuk SQLite
* Cocok untuk background jobs

---

# API Style

REST API

Base URL:

/api

Example:

GET /api/channels

POST /api/channels

GET /api/assets

POST /api/uploads

---

# Database

Engine:

SQLite

Location:

database/content_factory.db

Reason:

* Single server
* Tidak memerlukan service tambahan
* Backup mudah
* Resource ringan

---

# ORM

SQLAlchemy

Migration:

Alembic

Reason:

* Stabil
* Mature
* Cocok untuk FastAPI

---

# File Storage

Type:

Native Filesystem

Root Path:

/data

Reason:

* Asset berupa file gambar dan video
* Tidak memerlukan object storage
* Mudah di-backup

---

# Authentication

Type:

Session Cookie

Purpose:

Dashboard Access

Reason:

* Sederhana
* Tidak membutuhkan JWT kompleks

---

# YouTube Integration

API:

YouTube Data API v3

Authentication:

OAuth 2.0

Purpose:

* Upload Video
* Schedule Publish
* Update Metadata
* Upload Thumbnail

---

# OAuth Strategy

Provider:

Google Cloud Platform

Support:

Multi GCP Profiles

Reason:

* Distribusi kuota
* Isolasi channel

---

# AI Integration

Provider:

9Router

Protocol:

OpenAI Compatible API

Functions:

* Prompt Generator
* Metadata Generator
* Thumbnail Prompt Generator
* Niche Research

---

# Background Jobs

Framework:

APScheduler

Job Types:

* Upload Queue
* Publish Scheduler
* Cleanup Tasks

Reason:

* Ringan
* Tidak membutuhkan Redis

---

# Queue Strategy

Storage:

SQLite

Statuses:

pending

scheduled

uploading

published

failed

Reason:

* Tidak memerlukan RabbitMQ
* Tidak memerlukan Redis

---

# Reverse Proxy

Server:

Nginx

Functions:

* Reverse Proxy
* Static Asset Delivery
* SSL Termination

---

# Public Access

Service:

Cloudflare Tunnel

Purpose:

OAuth Callback

Notes:

Dashboard tetap berjalan pada jaringan lokal.

Tunnel hanya digunakan saat proses OAuth.

---

# Process Manager

Systemd

Services:

content-factory.service

scheduler.service

upload-worker.service

Reason:

* Native Debian
* Stabil
* Mudah dipantau

---

# Logging

Format:

Structured Log

Location:

/opt/apps/content-factory/logs

Retention:

30 Days

---

# Development Environment

Operating System:

Windows 11

Tools:

VSCode

Roo Code

Git

Node.js

Python

---

# Production Environment

Operating System:

Debian

Requirements:

Python 3.13+

Node.js 20+

Nginx

Cloudflared

FFmpeg

Git

SQLite

---

# Explicitly Not Used

Docker

Kubernetes

Redis

RabbitMQ

PostgreSQL

MongoDB

Next.js

NestJS

Reason:

Tidak diperlukan untuk kebutuhan MVP dan akan menambah kompleksitas serta konsumsi resource.
