# UPLOAD_QUEUE_WORKFLOW.md

## Purpose

Defines how completed content enters the upload pipeline.

---

# Workflow

9Router AI Infrastructure
↓

Generate:

* Footage Images
* Thumbnail
* Title
* Description

  ```
    ↓
  ```

Manual / External Video Production

Combine:

* Footage Images
* Audio

Output:

* video.mp4
* timestamp.txt

  ```
    ↓
  ```

Upload to Content Factory

```
    ↓
```

Create Content Package

Content Package:

* Video File
* Thumbnail
* Description
* Timestamp

  ```
    ↓
  ```

Assign Channel

Example:

Sleep Sounds #001
→ Relaxing Nature

Sleep Sounds #002
→ Deep Sleep Sounds

```
    ↓
```

Configure Schedule

Example:

2026-06-07 07:00
2026-06-07 12:00
2026-06-07 18:00
2026-06-07 21:00

```
    ↓
```

Queue Status

* Draft
* Queued
* Uploading
* Published
* Failed

  ```
    ↓
  ```

YouTube Upload

```
    ↓
```

Published

---

# Design Principle

Users should interact with Content Packages.

Users should not need to manually manage API endpoints, database records, or filesystem paths.

The Upload Queue is the operational center of Content Factory.
