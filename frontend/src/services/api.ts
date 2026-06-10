import axios from 'axios';
import type { Channel, GCPProfile, UploadJob, Asset, Prompt, ContentPackage, ChannelStorageStats, QueueItem, PackageGeneration, PromptContext, GenerationCombo, GenerationReadiness, MetadataVariant, GenerationAsset, MetadataLibraryItem } from '../types';

const api = axios.create({
    baseURL: '/api',
});

// Channels
export const getChannels = () => api.get<Channel[]>('/channels').then(res => res.data);
export const getChannel = (id: string) => api.get<Channel>(`/channels/${id}`).then(res => res.data);
export const createChannel = (data: Partial<Channel>) => api.post<Channel>('/channels', data).then(res => res.data);
export const updateChannel = (id: string, data: Partial<Channel>) => api.put<Channel>(`/channels/${id}`, data).then(res => res.data);
export const deleteChannel = (id: string) => api.delete(`/channels/${id}`).then(res => res.data);
export const getChannelStorage = (id: string) => api.get<ChannelStorageStats>(`/channels/${id}/storage`).then(res => res.data);

// GCP Profiles
export const getGCPProfiles = () => api.get<GCPProfile[]>('/gcp-profiles').then(res => res.data);
export const createGCPProfile = (data: Partial<GCPProfile>) => api.post<GCPProfile>('/gcp-profiles', data).then(res => res.data);

// OAuth
export const connectOAuth = (data: { channel_id: string }) => api.post<{ url: string }>('/oauth/connect', data).then(res => res.data);
export const disconnectOAuth = (data: { channel_id: string }) => api.post<{ message: string }>('/oauth/disconnect', data).then(res => res.data);

// System Config
export const getConfig = () => api.get<any>('/config').then(res => res.data);

// Assets
export const getAssets = (channelId?: string, assetType?: string) => {
    let url = channelId === 'shared' ? '/assets/shared' : '/assets';
    const params: any = {};
    if (channelId && channelId !== 'shared') params.channel_id = channelId;
    if (assetType) params.asset_type = assetType;
    return api.get<Asset[]>(url, { params }).then(res => res.data);
};
export const uploadAsset = (file: File, channelId: string, assetType: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('channel_id', channelId);
    formData.append('asset_type', assetType);
    
    const url = channelId === 'shared' ? '/assets/shared' : '/assets';
    return api.post<Asset>(url, formData).then(res => res.data);
};
export const deleteAsset = (id: string) => api.delete(`/assets/${id}`).then(res => res.data);

// Uploads
export const getUploadJobs = (channelId?: string, status?: string) => {
    const params: any = {};
    if (channelId) params.channel_id = channelId;
    if (status) params.status = status;
    return api.get<UploadJob[]>('/uploads', { params }).then(res => res.data);
};
export const retryUploadJob = (id: string) => api.post<UploadJob>(`/uploads/${id}/retry`).then(res => res.data);
export const createUploadJob = (data: Partial<UploadJob>) => api.post<UploadJob>('/uploads', data).then(res => res.data);
export const deleteUploadJob = (id: string) => api.delete(`/uploads/${id}`).then(res => res.data);

// Prompts & Metadata
export const generatePrompt = (data: { channel_id: string, theme: string, mood: string }) => 
    api.post<Prompt>('/prompts/generate', data).then(res => res.data);

export const generateLegacyThumbnail = (data: { channel_id: string, prompt: string }) => 
    api.post<Asset>('/prompts/thumbnails/generate', data).then(res => res.data);

// Content Packages
export const getPackages = (channelId?: string, status?: string) => {
    const params: any = {};
    if (channelId) params.channel_id = channelId;
    if (status) params.status = status;
    return api.get<ContentPackage[]>('/packages', { params }).then(res => res.data);
};
export const getPackage = (id: string) => api.get<ContentPackage>(`/packages/${id}`).then(res => res.data);
export const createPackage = (data: FormData) => api.post<ContentPackage>('/packages', data).then(res => res.data);
export const updatePackage = (id: string, data: Partial<ContentPackage>) => api.put<ContentPackage>(`/packages/${id}`, data).then(res => res.data);
export const deletePackage = (id: string) => api.delete(`/packages/${id}`).then(res => res.data);
export const updatePackageStatus = (id: string, status: string) => api.patch<ContentPackage>(`/packages/${id}/status`, { status }).then(res => res.data);

// Queue
export const getQueue = (channelId: string) => api.get<QueueItem[]>(`/queue/${channelId}`).then(res => res.data);
export const addToQueue = (packageId: string) => api.post(`/queue/${packageId}`).then(res => res.data);
export const removeFromQueue = (packageId: string) => api.delete(`/queue/${packageId}`).then(res => res.data);
export const reorderQueue = (channelId: string, newOrder: string[]) => api.patch(`/queue/${channelId}/reorder`, { new_order: newOrder }).then(res => res.data);

// Jobs
export const getJobStats = (channelId: string) => api.get<{pending: number, uploading: number, completed: number, failed: number}>(`/channels/${channelId}/jobs/stats`).then(res => res.data);
export const createJobFromQueue = (channelId: string) => api.post(`/channels/${channelId}/jobs/from-queue`).then(res => res.data);
export const updateJobStatus = (channelId: string, jobId: string, status: string) => api.put(`/channels/${channelId}/jobs/${jobId}/status`, { status }).then(res => res.data);

// Publisher
export const runPublisherOnce = (channelId: string) => api.post(`/channels/${channelId}/publisher/run-once`).then(res => res.data);
export const completePublisherJob = (channelId: string) => api.post(`/channels/${channelId}/publisher/complete`).then(res => res.data);
export const getPublisherStatus = (channelId: string) => api.get(`/channels/${channelId}/publisher/status`).then(res => res.data);
export const executePublisherUpload = (channelId: string) => api.post(`/channels/${channelId}/publisher/upload`).then(res => res.data);

// Generation Studio (Sprint 7A)
export const getPackageGeneration = (packageId: string) =>
    api.get<PackageGeneration>(`/packages/${packageId}/generation`).then(res => res.data);

export const generateMetadata = (packageId: string, contextId?: string) =>
    api.post<PackageGeneration>(`/packages/${packageId}/generate-metadata`, { context_id: contextId }).then(res => res.data);

export const generateThumbnail = (packageId: string, contextId?: string) =>
    api.post<PackageGeneration>(`/packages/${packageId}/generate-thumbnail`, { context_id: contextId }).then(res => res.data);

// Prompt Contexts CRUD (Sprint 7A-3.1)
export const getPromptContexts = (channelId: string, includeInactive: boolean = false) =>
    api.get<PromptContext[]>(`/channels/${channelId}/prompt-contexts`, { params: { include_inactive: includeInactive } }).then(res => res.data);

export const createPromptContext = (channelId: string, data: Partial<PromptContext>) =>
    api.post<PromptContext>(`/channels/${channelId}/prompt-contexts`, data).then(res => res.data);

export const updatePromptContext = (id: string, data: Partial<PromptContext>) =>
    api.put<PromptContext>(`/prompt-contexts/${id}`, data).then(res => res.data);

export const deletePromptContext = (id: string) =>
    api.delete<{ message: string }>(`/prompt-contexts/${id}`).then(res => res.data);

// Sprint 7A-4.5: Global Combo Registry
export const getGenerationCombos = (category?: string) => {
    const params: any = {};
    if (category) params.category = category;
    return api.get<GenerationCombo[]>('/generation-combos', { params }).then(res => res.data);
};

export const createGenerationCombo = (data: Partial<GenerationCombo>) =>
    api.post<GenerationCombo>('/generation-combos', data).then(res => res.data);

export const updateGenerationCombo = (id: string, data: Partial<GenerationCombo>) =>
    api.put<GenerationCombo>(`/generation-combos/${id}`, data).then(res => res.data);

export const deleteGenerationCombo = (id: string) =>
    api.delete<{ detail: string }>(`/generation-combos/${id}`).then(res => res.data);

// Sprint 7A-4.7: Diagnostics
export const getGenerationReadiness = (channelId: string) =>
    api.get<GenerationReadiness>(`/diagnostics/generation-readiness/${channelId}`).then(res => res.data);

// Sprint 7A-5: Metadata Variant Library
export const getMetadataVariants = (packageId: string) =>
    api.get<MetadataVariant[]>(`/packages/${packageId}/metadata-variants`).then(res => res.data);

export const selectMetadataVariant = (packageId: string, variantId: string) =>
    api.post<MetadataVariant>(`/packages/${packageId}/metadata-variants/${variantId}/select`).then(res => res.data);

export const deleteMetadataVariant = (variantId: string) =>
    api.delete<{ detail: string }>(`/metadata-variants/${variantId}`).then(res => res.data);

// Sprint 7A-6: Asset Engine Foundation
export const getGenerationAssets = (packageId: string) =>
    api.get<GenerationAsset[]>(`/packages/${packageId}/assets`).then(res => res.data);

export const getGenerationAssetsByType = (packageId: string, assetType: string) =>
    api.get<GenerationAsset[]>(`/packages/${packageId}/assets/${assetType}`).then(res => res.data);

export const selectGenerationAsset = (packageId: string, assetId: string) =>
    api.post<GenerationAsset>(`/packages/${packageId}/assets/${assetId}/select`).then(res => res.data);

export const deleteGenerationAsset = (assetId: string) =>
    api.delete<{ detail: string }>(`/assets/${assetId}`).then(res => res.data);

// Sprint 7A-8: Package Assembly Layer
export const assemblePackage = (packageId: string) =>
    api.post<ContentPackage>(`/packages/${packageId}/assemble`).then(res => res.data);

// Sprint 7B-1: Global Metadata Library
export const getMetadataLibrary = (params?: { skip?: number; limit?: number; search_query?: string; category?: string }) =>
    api.get<MetadataLibraryItem[]>('/metadata-library', { params }).then(res => res.data);

export const publishVariantToLibrary = (variantId: string, data: { category?: string; tags?: string }) =>
    api.post<MetadataLibraryItem>(`/metadata-library/publish/${variantId}`, data).then(res => res.data);

export const cloneLibraryItem = (itemId: string, packageGenerationId: string) =>
    api.post<MetadataVariant>(`/metadata-library/${itemId}/clone/${packageGenerationId}`).then(res => res.data);

export default api;
