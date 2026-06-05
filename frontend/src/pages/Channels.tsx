import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getChannels, createChannel } from '../services/api';
import { PlusCircle, MonitorPlay, KeyRound, X } from 'lucide-react';

export default function Channels() {
    const queryClient = useQueryClient();
    const { data: channels = [] } = useQuery({ queryKey: ['channels'], queryFn: getChannels });
    const [isAddChannelOpen, setIsAddChannelOpen] = useState(false);

    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');

    const createMutation = useMutation({
        mutationFn: createChannel,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['channels'] });
            setIsAddChannelOpen(false);
            setName('');
            setSlug('');
            setDescription('');
        }
    });

    const handleConnectOAuth = (slug: string) => {
        window.location.href = `http://localhost:8000/api/oauth/connect?channel_slug=${slug}`;
    };

    const handleSave = () => {
        if (!name || !slug) return;
        createMutation.mutate({ name, slug, description });
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
                                {channel.gcp_profile_id ? 'OAuth Connected' : 'Disconnected'}
                            </span>
                            {!channel.gcp_profile_id && (
                                <button 
                                    onClick={() => handleConnectOAuth(channel.slug)}
                                    className="text-xs bg-secondary hover:bg-secondary/80 text-foreground px-3 py-1.5 rounded font-medium transition-colors"
                                >
                                    Connect OAuth
                                </button>
                            )}
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
        </div>
    );
}
