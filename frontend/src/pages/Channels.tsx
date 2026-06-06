import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getChannels, createChannel, updateChannel, deleteChannel, getGCPProfiles, connectOAuth } from '../services/api';
import { PlusCircle, MonitorPlay, KeyRound, X, Trash2, Edit2, AlertTriangle } from 'lucide-react';
import type { Channel } from '../types';

export default function Channels() {
    const queryClient = useQueryClient();
    const { data: channels = [] } = useQuery({ queryKey: ['channels'], queryFn: getChannels });
    const { data: gcpProfiles = [] } = useQuery({ queryKey: ['gcp-profiles'], queryFn: getGCPProfiles });
    const [isAddChannelOpen, setIsAddChannelOpen] = useState(false);

    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [gcpProfileId, setGcpProfileId] = useState('');

    const [isEditChannelOpen, setIsEditChannelOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const updateMutation = useMutation({
        mutationFn: (data: Partial<Channel> & { id: string }) => updateChannel(data.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['channels'] });
            setIsEditChannelOpen(false);
            setEditingId(null);
            setName('');
            setSlug('');
            setDescription('');
            setGcpProfileId('');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteChannel,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['channels'] });
            setDeleteConfirmId(null);
        }
    });

    const openEditModal = (channel: Channel) => {
        setEditingId(channel.id);
        setName(channel.name);
        setSlug(channel.slug);
        setDescription(channel.description || '');
        setGcpProfileId(channel.gcp_profile_id || '');
        setIsEditChannelOpen(true);
    };

    const handleUpdate = () => {
        if (!editingId || !name || !slug) return;
        updateMutation.mutate({ id: editingId, name, slug, description, gcp_profile_id: gcpProfileId || undefined });
    };

    const createMutation = useMutation({
        mutationFn: createChannel,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['channels'] });
            setIsAddChannelOpen(false);
            setName('');
            setSlug('');
            setDescription('');
            setGcpProfileId('');
        }
    });

    const connectOAuthMutation = useMutation({
        mutationFn: connectOAuth,
        onSuccess: (data) => {
            const width = 500;
            const height = 600;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;
            const popup = window.open(data.url, "OAuth", `width=${width},height=${height},left=${left},top=${top}`);
            
            if (popup) {
                const timer = setInterval(() => {
                    if (popup.closed) {
                        clearInterval(timer);
                        queryClient.invalidateQueries({ queryKey: ['channels'] });
                    }
                }, 1000);
            }
        }
    });

    const handleConnectOAuth = (id: string) => {
        connectOAuthMutation.mutate({ channel_id: id });
    };

    const handleSave = () => {
        if (!name || !slug) return;
        createMutation.mutate({ name, slug, description, gcp_profile_id: gcpProfileId || undefined });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Channels</h1>
                <button 
                    onClick={() => setIsAddChannelOpen(true)}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90 flex items-center gap-2"
                >
                    <PlusCircle className="w-4 h-4" /> Add Channel
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {channels.map(channel => (
                    <div key={channel.id} className="bg-card border border-border p-6 rounded-lg shadow-sm space-y-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
                                    <MonitorPlay className="w-6 h-6 text-red-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">{channel.name}</h3>
                                    <p className="text-sm text-muted-foreground">/{channel.slug}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${channel.is_active ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                {channel.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        
                        <p className="text-sm text-muted-foreground line-clamp-2">
                            {channel.description || "No description provided."}
                        </p>

                        <div className="pt-4 border-t border-border flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                <KeyRound className="w-4 h-4" />
                                {channel.oauth_status === 'OAuth Missing' && channel.gcp_profile_id ? 'Ready to Connect' : channel.oauth_status}
                            </span>
                            <div className="flex items-center gap-2">
                                {channel.oauth_status !== 'OAuth Connected' && channel.gcp_profile_id && (
                                    <button 
                                        onClick={() => handleConnectOAuth(channel.id)}
                                        disabled={connectOAuthMutation.isPending}
                                        className="text-xs bg-secondary hover:bg-secondary/80 text-foreground px-3 py-1.5 rounded font-medium transition-colors disabled:opacity-50"
                                    >
                                        {connectOAuthMutation.isPending ? 'Connecting...' : 'Connect OAuth'}
                                    </button>
                                )}
                                <button onClick={() => openEditModal(channel)} className="p-1.5 text-muted-foreground hover:text-blue-400 bg-secondary/50 rounded transition-colors">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => setDeleteConfirmId(channel.id)} className="p-1.5 text-muted-foreground hover:text-red-400 bg-secondary/50 rounded transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                {channels.length === 0 && (
                    <div className="col-span-full py-12 text-center text-muted-foreground bg-card border border-border rounded-lg border-dashed">
                        No channels found. Click "Add Channel" to start.
                    </div>
                )}
            </div>

            {/* Add Channel Modal */}
            {isAddChannelOpen && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <h2 className="font-semibold text-lg">Add New Channel</h2>
                            <button 
                                onClick={() => setIsAddChannelOpen(false)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Channel Name</label>
                                <input 
                                    type="text" 
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g. My Tech Channel" 
                                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Channel Slug</label>
                                <input 
                                    type="text" 
                                    value={slug}
                                    onChange={e => setSlug(e.target.value)}
                                    placeholder="e.g. my-tech-channel" 
                                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Description</label>
                                <textarea 
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Short description..." 
                                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm min-h-[80px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">GCP Profile (Optional)</label>
                                <select 
                                    value={gcpProfileId}
                                    onChange={e => setGcpProfileId(e.target.value)}
                                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm"
                                >
                                    <option value="">-- No GCP Profile --</option>
                                    {gcpProfiles.map((p: any) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="p-4 border-t border-border flex justify-end gap-2">
                            <button 
                                onClick={() => setIsAddChannelOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={createMutation.isPending || !name || !slug}
                                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md disabled:opacity-50"
                            >
                                {createMutation.isPending ? "Creating..." : "Create Channel"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Edit Channel Modal */}
            {isEditChannelOpen && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <h2 className="font-semibold text-lg">Edit Channel</h2>
                            <button 
                                onClick={() => {
                                    setIsEditChannelOpen(false);
                                    setName(''); setSlug(''); setDescription(''); setGcpProfileId('');
                                }}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Channel Name</label>
                                <input 
                                    type="text" 
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Channel Slug</label>
                                <input 
                                    type="text" 
                                    value={slug}
                                    onChange={e => setSlug(e.target.value)}
                                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Description</label>
                                <textarea 
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm min-h-[80px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">GCP Profile (Optional)</label>
                                <select 
                                    value={gcpProfileId}
                                    onChange={e => setGcpProfileId(e.target.value)}
                                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm"
                                >
                                    <option value="">-- No GCP Profile --</option>
                                    {gcpProfiles.map((p: any) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="p-4 border-t border-border flex justify-end gap-2">
                            <button 
                                onClick={() => {
                                    setIsEditChannelOpen(false);
                                    setName(''); setSlug(''); setDescription(''); setGcpProfileId('');
                                }}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleUpdate}
                                disabled={updateMutation.isPending || !name || !slug}
                                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md disabled:opacity-50"
                            >
                                {updateMutation.isPending ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmId && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-red-500/20 rounded-lg shadow-lg w-full max-w-sm overflow-hidden">
                        <div className="p-6 text-center space-y-4">
                            <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <h2 className="text-lg font-semibold">Delete Channel?</h2>
                            <p className="text-sm text-muted-foreground">
                                This will permanently remove the channel and disconnect its OAuth token. This action cannot be undone.
                            </p>
                            <div className="flex justify-center gap-3 pt-4">
                                <button 
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-4 py-2 text-sm font-medium bg-secondary hover:bg-secondary/80 rounded-md"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => deleteMutation.mutate(deleteConfirmId)}
                                    disabled={deleteMutation.isPending}
                                    className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-md disabled:opacity-50"
                                >
                                    {deleteMutation.isPending ? "Deleting..." : "Yes, Delete"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
