import axios from 'axios';
import type { Channel, GCPProfile, UploadJob, Asset, Prompt } from '../types';

const api = axios.create({
    baseURL: '/api',
});

// Channels
export const getChannels = () => api.get<Channel[]>('/channels').then(res => res.data);
export const getChannel = (id: string) => api.get<Channel>(`/channels/${id}`).then(res => res.data);
export const createChannel = (data: Partial<Channel>) => api.post<Channel>('/channels', data).then(res => res.data);

// GCP Profiles
export const getGCPProfiles = () => api.get<GCPProfile[]>('/gcp-profiles').then(res => res.data);
export const createGCPProfile = (data: Partial<GCPProfile>) => api.post<GCPProfile>('/gcp-profiles', data).then(res => res.data);

// System Config
export const getConfig = () => api.get<any>('/config').then(res => res.data);

// Assets
export const getAssets = (channelId?: string, type?: string) => {
    let url = channelId === 'shared' ? '/assets/shared' : '/assets';
    const params: any = {};
    if (channelId && channelId !== 'shared') params.channel_id = channelId;
    if (type) params.type = type;
    return api.get<Asset[]>(url, { params }).then(res => res.data);
};
export const uploadAsset = (file: File, channelId: string, type: string, tags?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('channel_id', channelId);
    formData.append('type', type);
    if (tags) formData.append('tags', tags);
    
    const url = channelId === 'shared' ? '/assets/shared' : '/assets';
    return api.post<Asset>(url, formData).then(res => res.data);
};

// Uploads
export const getUploadJobs = (channelId?: string, status?: string) => {
    const params: any = {};
    if (channelId) params.channel_id = channelId;
    if (status) params.status = status;
    return api.get<UploadJob[]>('/uploads', { params }).then(res => res.data);
};
export const createUploadJob = (data: Partial<UploadJob>) => api.post<UploadJob>('/uploads', data).then(res => res.data);
export const retryUploadJob = (id: string) => api.post<UploadJob>(`/uploads/${id}/retry`).then(res => res.data);

// Prompts & Metadata
export const generatePrompt = (data: { channel_id: string, theme: string, mood: string }) => 
    api.post<Prompt>('/prompts/generate', data).then(res => res.data);

export const generateThumbnail = (data: { channel_id: string, prompt: string }) => 
    api.post<Asset>('/prompts/thumbnails/generate', data).then(res => res.data);

export default api;
