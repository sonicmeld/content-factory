export interface Channel {
    id: string;
    name: string;
    slug: string;
    description?: string;
    gcp_profile_id?: string;
    upload_frequency?: string;
    thumbnail_style?: string;
    metadata_style?: string;
    oauth_status?: string;
    youtube_channel_id?: string;
    youtube_channel_title?: string;
    youtube_handle?: string;
    youtube_channel_url?: string;
    is_active: number;
    created_at: string;
    // Sprint 7A: 9Router Combo Configuration
    metadata_combo?: string;
    thumbnail_combo?: string;
    footage_combo?: string;
}

export interface GCPProfile {
    id: string;
    name: string;
    client_id: string;
    client_secret: string;
    project_id?: string;
    is_active: number;
    created_at: string;
}

export interface UploadJob {
    id: string;
    channel_id: string;
    video_path: string;
    title?: string;
    description?: string;
    thumbnail_path?: string;
    status: string;
    retry_count: number;
    error_message?: string;
    scheduled_at?: string;
    published_at?: string;
    created_at: string;
}

export interface Asset {
    id: string;
    channel_id?: string;
    asset_type: string;
    filename: string;
    file_path: string;
    file_size: number;
    mime_type: string;
    created_at: string;
}

export interface Prompt {
    id: string;
    channel_id: string;
    title?: string;
    prompt: string;
    category?: string;
    created_at: string;
}

export interface MetadataTemplate {
    id: string;
    channel_id: string;
    title_template?: string;
    description_template?: string;
    tags_template?: string;
    created_at: string;
}

export interface ContentPackage {
    id: string;
    channel_id: string;
    package_number: string;
    video_path: string;
    timestamp_path?: string;
    status: 'draft' | 'ready' | 'queued' | 'published' | 'failed';
    created_at: string;
    updated_at: string;
}

export interface ChannelStorageStats {
    package_count: number;
    video_count: number;
    storage_bytes: number;
}

export interface QueueItem {
    package_id: string;
    channel_id: string;
    queue_position: number;
    created_at: string;
    package_number: string;
    status: string;
    video_path: string;
}

// Sprint 7A: Generation Studio
export interface PackageGeneration {
    id: string;
    package_id: string;
    title?: string;
    description?: string;
    thumbnail_path?: string;
    metadata_status: 'pending' | 'processing' | 'completed' | 'failed';
    thumbnail_status: 'pending' | 'processing' | 'completed' | 'failed';
    error_message?: string;
    is_ready: boolean;
    created_at: string;
    updated_at: string;
}
