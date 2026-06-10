import { Info, PlaySquare, Plug, AlertTriangle, CheckCircle2, Loader2, Save } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getChannels, updateChannel, connectOAuth, disconnectOAuth } from '../../services/api';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import PromptAssignmentManager from '../../components/PromptAssignmentManager';

export default function ChannelSettings() {
    const { slug } = useParams();
    const queryClient = useQueryClient();
    const { data: channels = [] } = useQuery({ queryKey: ['channels'], queryFn: getChannels });
    
    const currentChannel = channels.find(c => c.slug === slug);

    const [name, setName] = useState('');
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        if (currentChannel) {
            setName(currentChannel.name);
            setIsActive(currentChannel.is_active === 1);
        }
    }, [currentChannel]);

    const updateMutation = useMutation({
        mutationFn: () => updateChannel(currentChannel!.id, { name, is_active: isActive ? 1 : 0 }),
        onSuccess: () => {
            toast.success('Channel settings updated');
            queryClient.invalidateQueries({ queryKey: ['channels'] });
        },
        onError: () => toast.error('Failed to update channel')
    });

    const connectOAuthMutation = useMutation({
        mutationFn: () => connectOAuth({ channel_id: currentChannel!.id }),
        onSuccess: (data) => {
            const width = 600;
            const height = 700;
            const left = window.screen.width / 2 - width / 2;
            const top = window.screen.height / 2 - height / 2;
            window.open(data.url, 'YouTube OAuth', `width=${width},height=${height},top=${top},left=${left}`);
            
            // Poll for updates (simplified for now by just letting user refresh or we invalidate after a timeout)
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['channels'] });
            }, 5000);
        },
        onError: () => toast.error('Failed to initiate OAuth')
    });

    const disconnectOAuthMutation = useMutation({
        mutationFn: () => disconnectOAuth({ channel_id: currentChannel!.id }),
        onSuccess: () => {
            toast.success('OAuth disconnected successfully');
            queryClient.invalidateQueries({ queryKey: ['channels'] });
        },
        onError: () => toast.error('Failed to disconnect OAuth')
    });

    if (!currentChannel) return null;

    const handleSaveInfo = (e: React.FormEvent) => {
        e.preventDefault();
        updateMutation.mutate();
    };

    const isOAuthConnected = currentChannel.oauth_status === 'OAuth Connected';

    return (
        <div className="space-y-8 max-w-4xl pb-10">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Channel Settings</h1>
                <p className="text-muted-foreground mt-1 text-sm">Configure channel identity, metadata profiles, and API connections.</p>
            </div>

            {/* Channel Information */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-secondary/30 flex items-center gap-2">
                    <Info className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold text-lg">Channel Information</h3>
                </div>
                <div className="p-6">
                    <form onSubmit={handleSaveInfo} className="space-y-4 max-w-lg">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Channel Name</label>
                            <input 
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div className="space-y-2 opacity-60">
                            <label className="text-sm font-medium">Channel Slug</label>
                            <input 
                                type="text"
                                value={currentChannel.slug}
                                disabled
                                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm cursor-not-allowed"
                            />
                            <p className="text-xs text-muted-foreground">The slug is used for routing and cannot be changed.</p>
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                            <input 
                                type="checkbox" 
                                id="isActive"
                                checked={isActive}
                                onChange={e => setIsActive(e.target.checked)}
                                className="rounded border-border bg-background"
                            />
                            <label htmlFor="isActive" className="text-sm font-medium">Channel is active</label>
                        </div>
                        <div className="pt-2">
                            <button 
                                type="submit"
                                disabled={updateMutation.isPending}
                                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                            >
                                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* OAuth Management */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-secondary/30 flex items-center gap-2">
                    <PlaySquare className="w-5 h-5 text-red-500" />
                    <h3 className="font-semibold text-lg">YouTube API Connection</h3>
                </div>
                <div className="p-6">
                    <div className="flex items-center justify-between max-w-2xl">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="font-medium">Connection Status</span>
                                {isOAuthConnected ? (
                                    <span className="flex items-center text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Connected
                                    </span>
                                ) : (
                                    <span className="flex items-center text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded border border-destructive/20">
                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                        Disconnected
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {isOAuthConnected 
                                    ? "Content Factory can upload and manage videos on your behalf." 
                                    : "Connect your YouTube account to enable automatic publishing."}
                            </p>
                        </div>
                        <div>
                            {isOAuthConnected ? (
                                <button 
                                    onClick={() => {
                                        if (confirm('Are you sure you want to disconnect? Publishing will be disabled.')) {
                                            disconnectOAuthMutation.mutate();
                                        }
                                    }}
                                    disabled={disconnectOAuthMutation.isPending}
                                    className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-md text-sm font-medium transition-colors"
                                >
                                    {disconnectOAuthMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />}
                                    Disconnect OAuth
                                </button>
                            ) : (
                                <button 
                                    onClick={() => connectOAuthMutation.mutate()}
                                    disabled={connectOAuthMutation.isPending}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium transition-colors"
                                >
                                    {connectOAuthMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />}
                                    Connect YouTube
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Future Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden opacity-60">
                    <div className="px-6 py-4 border-b border-border bg-secondary/30 flex items-center justify-between">
                        <h3 className="font-semibold">Upload Preferences</h3>
                        <span className="text-[10px] font-bold uppercase bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">Planned Feature</span>
                    </div>
                    <div className="p-6">
                        <p className="text-sm text-muted-foreground">Configure default privacy status (Public, Private, Unlisted), tags, and category for all videos in this channel.</p>
                    </div>
                </div>

                {/* Prompt Assignment Manager */}
                <PromptAssignmentManager channelId={currentChannel.id} />

                <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden opacity-60">
                    <div className="px-6 py-4 border-b border-border bg-secondary/30 flex items-center justify-between">
                        <h3 className="font-semibold">Publishing Defaults</h3>
                        <span className="text-[10px] font-bold uppercase bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">Planned Feature</span>
                    </div>
                    <div className="p-6">
                        <p className="text-sm text-muted-foreground">Set automatic scheduling behaviors, preferred publish times, and playlist assignments.</p>
                    </div>
                </div>

            </div>
        </div>
    );
}
