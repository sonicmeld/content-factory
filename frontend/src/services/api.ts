import axios from 'axios';
import type { Channel, GCPProfile, UploadJob, Asset, Prompt, ContentPackage, ChannelStorageStats, QueueItem, PackageGeneration, PromptContext, GenerationCombo, GenerationReadiness, MetadataVariant, GenerationAsset, MetadataLibraryItem, ExternalAccount, ConnectorJob, AssetInbox } from '../types';

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
export const getHealth = () => api.get<any>('/health').then(res => res.data);

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
export const getUploadLogs = (limit?: number) => {
    const params: any = {};
    if (limit) params.limit = limit;
    return api.get<string[]>('/uploads/logs', { params }).then(res => res.data);
};

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
export const createPackagesFromAssets = (assetIds: string[], channelId?: string) =>
    api.post<ContentPackage[]>('/packages/create-from-assets', { asset_ids: assetIds, channel_id: channelId }).then(res => res.data);
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

// Prompt Contexts CRUD
export const getPromptContexts = (channelId: string, includeInactive: boolean = false) =>
    api.get<PromptContext[]>(`/channels/${channelId}/prompt-contexts`, { params: { include_inactive: includeInactive } }).then(res => res.data);

export const getGlobalPromptContexts = (promptType?: string, includeInactive: boolean = false) =>
    api.get<PromptContext[]>('/prompt-contexts', { params: { prompt_type: promptType, include_inactive: includeInactive } }).then(res => res.data);

export const createPromptContext = (channelId: string, data: Partial<PromptContext>) =>
    api.post<PromptContext>(`/channels/${channelId}/prompt-contexts`, data).then(res => res.data);

export const createGlobalPromptContext = (data: Partial<PromptContext>) =>
    api.post<PromptContext>('/prompt-contexts', data).then(res => res.data);

export const updatePromptContext = (id: string, data: Partial<PromptContext>) =>
    api.put<PromptContext>(`/prompt-contexts/${id}`, data).then(res => res.data);

export const deletePromptContext = (id: string) =>
    api.delete<{ message: string }>(`/prompt-contexts/${id}`).then(res => res.data);

// Sprint 7B-2: Channel Prompt Assignments
export const getChannelPromptAssignments = (channelId: string, includeInactive: boolean = false) =>
    api.get<any[]>(`/channels/${channelId}/prompt-assignments`, { params: { include_inactive: includeInactive } }).then(res => res.data);

export const createChannelPromptAssignment = (channelId: string, data: { prompt_id: string, assignment_order?: number, is_active?: number }) =>
    api.post<any>(`/channels/${channelId}/prompt-assignments`, data).then(res => res.data);

export const updateChannelPromptAssignment = (channelId: string, assignmentId: string, data: { assignment_order?: number, is_active?: number }) =>
    api.put<any>(`/channels/${channelId}/prompt-assignments/${assignmentId}`, data).then(res => res.data);

export const deleteChannelPromptAssignment = (channelId: string, assignmentId: string) =>
    api.delete<{ message: string }>(`/channels/${channelId}/prompt-assignments/${assignmentId}`).then(res => res.data);


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

export const deleteMetadataLibraryItem = (itemId: string) =>
    api.delete(`/metadata-library/${itemId}`).then(res => res.data);

// Sprint 7C-1: Runtime Audit Layer
import type { RuntimeAudit } from '../types';

export const getRuntimeAudits = (packageId: string) =>
    api.get<RuntimeAudit[]>(`/packages/${packageId}/runtime-audits`).then(res => res.data);

// Sprint 7C-2: Global Execution Center
import type { ExecutionTask } from '../types';

export const getExecutionTasks = (status?: string, channelId?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (channelId) params.append('channel_id', channelId);
    return api.get<ExecutionTask[]>(`/execution-center/tasks?${params.toString()}`).then(res => res.data);
};

import type { WorkboxPackage } from '../types';
export const getWorkboxPackages = (channelId?: string) => {
    const params = new URLSearchParams();
    if (channelId) params.append('channel_id', channelId);
    return api.get<WorkboxPackage[]>(`/execution-center/workbox?${params.toString()}`).then(res => res.data);
};

export const getExecutionTraces = () =>
    api.get<RuntimeAudit[]>('/execution-center/traces').then(res => res.data);

export const generateGlobalAsset = (data: { asset_type: string; combo_id: string; prompt_ids: string[]; output_count: number }) =>
    api.post<{ message: string; execution_id: string }>('/execution-center/generate', data).then(res => res.data);

// Flow Connector & Asset Inbox API helpers
export const getExternalAccounts = (workspaceId?: string, provider?: string) => {
    const params: any = {};
    if (workspaceId) params.workspace_id = workspaceId;
    if (provider) params.provider = provider;
    return api.get<ExternalAccount[]>('/connectors/accounts', { params }).then(res => res.data);
};

export const createExternalAccount = (data: Partial<ExternalAccount>) =>
    api.post<ExternalAccount>('/connectors/accounts', data).then(res => res.data);

export const updateExternalAccount = (id: string, data: Partial<ExternalAccount>) =>
    api.patch<ExternalAccount>(`/connectors/accounts/${id}`, data).then(res => res.data);

export const deleteExternalAccount = (id: string) =>
    api.delete<{ message: string }>(`/connectors/accounts/${id}`).then(res => res.data);

export const getProviders = () =>
    api.get<any[]>('/connectors/providers').then(res => res.data);

export const createConnectorJob = (data: Partial<ConnectorJob>) =>
    api.post<ConnectorJob>('/connectors/jobs', data).then(res => res.data);

export const getConnectorJobs = (workspaceId?: string) => {
    const params: any = {};
    if (workspaceId) params.workspace_id = workspaceId;
    return api.get<ConnectorJob[]>('/connectors/jobs', { params }).then(res => res.data);
};

export const getActiveConnectorJob = (workspaceId?: string, channelId?: string) => {
    const params: any = {};
    if (workspaceId) params.workspace_id = workspaceId;
    if (channelId) params.channel_id = channelId;
    return api.get<ConnectorJob | null>('/connectors/jobs/active', { params }).then(res => res.data);
};

export const getInboxAssets = (workspaceId?: string, status?: string) => {
    const params: any = {};
    if (workspaceId) params.workspace_id = workspaceId;
    if (status) params.status = status;
    return api.get<AssetInbox[]>('/connectors/inbox', { params }).then(res => res.data);
};

export const approveInboxAsset = (id: string, channelId: string | null) =>
    api.post<AssetInbox>(`/connectors/inbox/${id}/approve`, { channel_id: channelId }).then(res => res.data);

export const rejectInboxAsset = (id: string) =>
    api.post<AssetInbox>(`/connectors/inbox/${id}/reject`).then(res => res.data);

export const archiveInboxAsset = (id: string) =>
    api.post<AssetInbox>(`/connectors/inbox/${id}/archive`).then(res => res.data);

export default api;

