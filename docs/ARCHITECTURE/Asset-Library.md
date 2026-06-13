# Architecture — Asset Library & Bulk Packaging

The Asset Library manages raw files (footage, thumbnails, audio) and automates package assemblies.

```text
/data
├── channels/
│   └── {channel-slug}/
│       ├── assets/
│       │   ├── footage/
│       │   ├── thumbnails/
│       │   └── prompts/
│       └── packages/
│           └── {package_number}/
│               ├── video.mp4
│               └── timestamps.txt
└── shared/
    ├── footage/
    └── thumbnails/
```

## 1. Storage Hierarchies
*   **Workspace Library**: Files are stored in sub-channel folders (`data/channels/<slug>/assets/`) separated by type.
*   **Global Shared Library**: Package-agnostic shared assets reside in `/data/shared/` to support global staging and workspace-wide reuse.

## 2. Bulk Creation & Copy Pipeline
When users trigger bulk package assemblies:
1.  **Unique Package Directories**: Creates distinct folders for each output package named after the original asset.
2.  **Naming Collisions**: Checks folder availability. If a duplicate exists, appends numerical indexes (e.g. `_1`, `_2`).
3.  **File Copying**: Copies video files from the library to the package target folder to maintain independent copies for local editing workflows.
4.  **Automatic Timestamp TXT Mapping**: Scans the asset directory for matching timestamp text files (e.g. `file_01.txt` for `file_01.mp4`). If a match is found, copies the text file and registers `timestamp_path` inside the package table, eliminating manual mapping tasks.
