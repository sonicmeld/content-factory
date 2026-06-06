# STORAGE_CONVENTION.md

## Purpose

Defines storage structure and asset organization.

This document is the source of truth for filesystem layout.

---

# Root Storage

/data

---

# Shared Assets

/data/shared

Shared assets are available to all channels.

Structure:

/data/shared

├── footage
├── thumbnails
├── audio
└── prompts

Examples:

/data/shared/footage
/data/shared/thumbnails
/data/shared/audio
/data/shared/prompts

---

# Channel Assets

/data/channels/{channel_slug}

Examples:

/data/channels/relaxing-nature
/data/channels/deep-sleep-sounds

Used for channel-specific resources.

---

# Upload Storage

/data/uploads

Contains uploaded content packages.

Examples:

* video.mp4
* timestamp.txt

---

# Asset Types

Valid asset_type values:

* footage
* thumbnails
* audio
* prompts

These values represent business categories.

They do NOT represent file extensions.

Incorrect:

* txt
* jpg
* png
* mp4

Correct:

* footage
* thumbnails
* audio
* prompts

---

# File Metadata

Technical file information should be stored in:

* filename
* mime_type
* file_size

Example:

asset_type = prompts
filename = script.txt
mime_type = text/plain
