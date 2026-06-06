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
    is_active: number;
    created_at: string;
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
