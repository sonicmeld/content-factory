import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getYoutubeAccounts, toggleYoutubeAnalytics, deleteYoutubeIdentity, getGCPProfiles, connectYoutubeIdentity, syncYoutubeAccounts } from '../services/api';
import { Video, Trash2, Power, PowerOff, ShieldCheck, UserPlus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function YouTubeAccounts() {
    const queryClient = useQueryClient();
    
    // Fetch data
    const { data: accounts = [], isLoading } = useQuery({ 
        queryKey: ['youtube-accounts'], 
        queryFn: () => getYoutubeAccounts() 
    });
    
    const { data: gcpProfiles = [] } = useQuery({ 
        queryKey: ['gcp-profiles'], 
        queryFn: getGCPProfiles 
    });

    const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
    const [selectedGcpProfile, setSelectedGcpProfile] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === 'oauth_success') {
                queryClient.invalidateQueries({ queryKey: ['youtube-accounts'] });
                toast.success("YouTube account connected successfully");
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [queryClient]);

    // Mutations
    const toggleAnalyticsMutation = useMutation({
        mutationFn: ({ id, enabled }: { id: string, enabled: boolean }) => toggleYoutubeAnalytics(id, enabled),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['youtube-accounts'] });
            toast.success("Analytics status updated");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteYoutubeIdentity,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['youtube-accounts'] });
            setDeleteConfirmId(null);
            toast.success("YouTube Account deleted");
        }
    });

    const connectMutation = useMutation({
        mutationFn: ({ workspaceId, gcpProfileId }: { workspaceId: string, gcpProfileId: string }) => 
            connectYoutubeIdentity(workspaceId, gcpProfileId),
        onSuccess: (data) => {
            setIsAddAccountOpen(false);
            const width = 500;
            const height = 600;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;
            window.open(data.url, 'youtube-oauth', `width=${width},height=${height},left=${left},top=${top}`);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || "Failed to generate OAuth URL");
        }
    });

    const syncMutation = useMutation({
        mutationFn: syncYoutubeAccounts,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['youtube-accounts'] });
            toast.success(data.message || "Sync complete");
        }
    });

    const handleConnect = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGcpProfile) return;
        // Gunakan placeholder "global" untuk workspaceId jika ini dibuat independen
        connectMutation.mutate({ workspaceId: 'global', gcpProfileId: selectedGcpProfile });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Video className="w-8 h-8 text-red-500" />
                        YouTube Identity Layer
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Single Source of Truth for YouTube accounts. Connect once, use across channels and analytics.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => syncMutation.mutate()}
                        disabled={syncMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md font-medium transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                        Sync Legacy Channels
                    </button>
                    <button 
                        onClick={() => setIsAddAccountOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-medium transition-colors"
                    >
                        <UserPlus className="w-4 h-4" />
                        Connect Account
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-10">
                    <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                </div>
            ) : accounts.length === 0 ? (
                <div className="text-center py-20 bg-card rounded-lg border border-border border-dashed">
                    <Video className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-foreground">No YouTube accounts connected</h3>
                    <p className="text-muted-foreground mt-1">Connect a YouTube account to use Market Intelligence and Context Pipeline.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {Object.entries(
                        accounts.reduce((acc: Record<string, any[]>, account: any) => {
                            const email = account.google_account_email || 'Uncategorized / Legacy';
                            if (!acc[email]) acc[email] = [];
                            acc[email].push(account);
                            return acc;
                        }, {})
                    ).map(([email, emailAccounts]) => (
                        <div key={email} className="bg-card border border-border rounded-lg overflow-hidden">
                            <div className="bg-secondary/50 px-6 py-4 border-b border-border flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="font-semibold text-lg">{email}</h2>
                                        <p className="text-sm text-muted-foreground">
                                            {emailAccounts.length} channel{emailAccounts.length !== 1 ? 's' : ''} connected
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="divide-y divide-border">
                                {emailAccounts.map(account => (
                                    <div key={account.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-secondary/10 transition-colors">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center border border-red-500/20 shrink-0">
                                                <Video className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-lg">{account.youtube_channel_title}</h3>
                                                {account.youtube_handle && (
                                                    <p className="text-sm text-muted-foreground">{account.youtube_handle}</p>
                                                )}
                                                <div className="mt-2 flex items-center gap-3 text-xs font-mono text-muted-foreground">
                                                    <span className="bg-muted px-2 py-1 rounded">ID: {account.youtube_channel_id}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                                    account.analytics_enabled ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'
                                                }`}>
                                                    {account.analytics_enabled ? 'Analytics Active' : 'Analytics Inactive'}
                                                </span>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 border-l border-border pl-4">
                                                <button
                                                    onClick={() => toggleAnalyticsMutation.mutate({ id: account.id, enabled: !account.analytics_enabled })}
                                                    className={`p-2 rounded-md transition-colors ${
                                                        account.analytics_enabled 
                                                            ? 'text-amber-500 hover:bg-amber-500/10' 
                                                            : 'text-green-500 hover:bg-green-500/10'
                                                    }`}
                                                    title={account.analytics_enabled ? "Disable Analytics" : "Enable Analytics"}
                                                >
                                                    {account.analytics_enabled ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                                                </button>

                                                {deleteConfirmId === account.id ? (
                                                    <div className="flex items-center gap-1 bg-destructive/10 rounded-md p-1">
                                                        <button 
                                                            onClick={() => deleteMutation.mutate(account.id)}
                                                            className="text-xs font-medium text-destructive hover:bg-destructive/20 px-2 py-1 rounded"
                                                        >
                                                            Confirm
                                                        </button>
                                                        <button 
                                                            onClick={() => setDeleteConfirmId(null)}
                                                            className="text-xs font-medium text-muted-foreground hover:bg-background px-2 py-1 rounded"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setDeleteConfirmId(account.id)}
                                                        className="text-muted-foreground hover:text-destructive p-2 rounded-md hover:bg-destructive/10 transition-colors"
                                                        title="Disconnect & Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Account Modal */}
            {isAddAccountOpen && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-card border border-border shadow-lg rounded-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-border">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Video className="w-5 h-5 text-red-500" />
                                Connect YouTube Account
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">Select a GCP Profile to use for authentication.</p>
                        </div>
                        
                        <form onSubmit={handleConnect} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">GCP Profile</label>
                                <select
                                    value={selectedGcpProfile}
                                    onChange={(e) => setSelectedGcpProfile(e.target.value)}
                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                    required
                                >
                                    <option value="">Select a GCP Profile</option>
                                    {gcpProfiles.map((profile: any) => (
                                        <option key={profile.id} value={profile.id}>
                                            {profile.name} ({profile.project_id})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsAddAccountOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!selectedGcpProfile || connectMutation.isPending}
                                    className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                                >
                                    {connectMutation.isPending ? 'Connecting...' : 'Sign in with Google'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
