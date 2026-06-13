import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    getAnalyticsChannels, 
    observeAnalyticsChannel, 
    syncAnalyticsChannel, 
    archiveAnalyticsChannel, 
    getChannelOverview, 
    getRecentSyncActivity, 
    getAnalyticsWorkspaceLinks, 
    getAnalyticsIdentities, 
    assignWorkspaceChannel, 
    linkChannelIdentity,
    getChannels 
} from '../services/api';
import { 
    TrendingUp, 
    PlusCircle, 
    RefreshCw, 
    Archive, 
    Eye, 
    Link2, 
    Users, 
    CheckCircle2, 
    AlertCircle, 
    Clock, 
    Database, 
    Calendar, 
    ShieldAlert, 
    Globe, 
    Search, 
    X,
    Cpu, 
    ArrowRight, 
    History, 
    UserCheck, 
    LayoutGrid 
} from 'lucide-react';
import type { AnalyticsChannel } from '../types';
import { toast } from 'sonner';

type TabType = 'registry' | 'identity' | 'workspace' | 'queue';

export default function AnalyticsHub() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<TabType>('registry');
    
    // Add Channel Form State
    const [isObserveOpen, setIsObserveOpen] = useState(false);
    const [externalChannelId, setExternalChannelId] = useState('');
    const [analyticsType, setAnalyticsType] = useState<'owned' | 'competitor' | 'observed'>('observed');
    const [assignedChannelId, setAssignedChannelId] = useState('');

    // Detail Modal State
    const [selectedChannel, setSelectedChannel] = useState<AnalyticsChannel | null>(null);

    // Queries
    const { data: channels = [], isLoading: isChannelsLoading } = useQuery({
        queryKey: ['analyticsChannels'],
        queryFn: () => getAnalyticsChannels()
    });

    const { data: localChannels = [] } = useQuery({
        queryKey: ['channels'],
        queryFn: getChannels
    });

    const { data: workspaceLinks = [] } = useQuery({
        queryKey: ['workspaceLinks'],
        queryFn: getAnalyticsWorkspaceLinks
    });

    const { data: identities = [] } = useQuery({
        queryKey: ['identities'],
        queryFn: getAnalyticsIdentities
    });

    const { data: syncLogs = [], isLoading: isLogsLoading } = useQuery({
        queryKey: ['syncLogs'],
        queryFn: getRecentSyncActivity,
        refetchInterval: activeTab === 'queue' ? 5000 : undefined // Auto-refresh only when on queue tab
    });

    const { data: overview, isLoading: isOverviewLoading } = useQuery({
        queryKey: ['channelOverview', selectedChannel?.id],
        queryFn: () => getChannelOverview(selectedChannel!.id),
        enabled: !!selectedChannel
    });

    // Mutations
    const observeMutation = useMutation({
        mutationFn: observeAnalyticsChannel,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['analyticsChannels'] });
            queryClient.invalidateQueries({ queryKey: ['workspaceLinks'] });
            queryClient.invalidateQueries({ queryKey: ['syncLogs'] });
            toast.success('Channel is now being observed');
            setIsObserveOpen(false);
            setExternalChannelId('');
            setAnalyticsType('observed');
            setAssignedChannelId('');
        },
        onError: (err: any) => {
            const msg = err.response?.data?.detail || 'Failed to observe channel';
            toast.error(msg);
        }
    });

    const syncMutation = useMutation({
        mutationFn: syncAnalyticsChannel,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['analyticsChannels'] });
            queryClient.invalidateQueries({ queryKey: ['syncLogs'] });
            toast.success('Sync request queued');
        },
        onError: () => {
            toast.error('Failed to queue sync');
        }
    });

    const archiveMutation = useMutation({
        mutationFn: archiveAnalyticsChannel,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['analyticsChannels'] });
            toast.success('Channel archived logically');
        },
        onError: () => {
            toast.error('Failed to archive channel');
        }
    });

    const assignWorkspaceMutation = useMutation({
        mutationFn: ({ channelId, workspaceChannelId }: { channelId: string, workspaceChannelId: string | null }) => 
            assignWorkspaceChannel(channelId, workspaceChannelId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workspaceLinks'] });
            toast.success('Workspace channel assignment updated');
        },
        onError: () => {
            toast.error('Failed to update workspace assignment');
        }
    });

    const linkIdentityMutation = useMutation({
        mutationFn: ({ channelId, identityReferenceId }: { channelId: string, identityReferenceId: string }) => 
            linkChannelIdentity(channelId, identityReferenceId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['identities'] });
            queryClient.invalidateQueries({ queryKey: ['analyticsChannels'] });
            toast.success('OAuth identity linked successfully');
        },
        onError: () => {
            toast.error('Failed to link OAuth identity');
        }
    });

    // Health Stats Calculations
    const totalCount = channels.length;
    const healthyCount = channels.filter(c => c.sync_status === 'SUCCESS').length;
    const pendingCount = channels.filter(c => c.sync_status === 'PENDING' || c.sync_status === 'SYNCING').length;
    const errorCount = channels.filter(c => c.sync_status === 'FAILED').length;
    
    // Stale: last_sync_at > 7 days ago
    const staleCount = channels.filter(c => {
        if (!c.last_sync_at) return false;
        const lastSync = new Date(c.last_sync_at).getTime();
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return lastSync < sevenDaysAgo;
    }).length;

    const handleObserveSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!externalChannelId.trim()) {
            toast.error('Please enter a YouTube Channel ID, Handle, or URL');
            return;
        }
        observeMutation.mutate({
            external_channel_id: externalChannelId.trim(),
            analytics_type: analyticsType,
            channel_id: assignedChannelId || undefined
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-primary">
                        <TrendingUp className="w-6 h-6 text-red-500" />
                        Analytics Hub
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Sprint A — Monitor and observe metrics across owned, competitor, and observed YouTube channels.
                    </p>
                </div>
                <button 
                    onClick={() => setIsObserveOpen(true)}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90 flex items-center gap-2 transition-all hover:scale-105"
                >
                    <PlusCircle className="w-4 h-4" /> Observe Channel
                </button>
            </div>

            {/* Health Overview Panel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-card border border-border/80 p-4 rounded-xl flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-border transition-all">
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Observed Channels</p>
                        <h3 className="text-2xl font-bold mt-1 font-mono">{totalCount}</h3>
                    </div>
                    <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <Globe className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-card border border-border/80 p-4 rounded-xl flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-green-500/30 transition-all">
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-green-500">Healthy</p>
                        <h3 className="text-2xl font-bold mt-1 text-green-500 font-mono">{healthyCount}</h3>
                    </div>
                    <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-card border border-border/80 p-4 rounded-xl flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-amber-500/30 transition-all">
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-amber-500">Syncing/Pending</p>
                        <h3 className="text-2xl font-bold mt-1 text-amber-500 font-mono">{pendingCount}</h3>
                    </div>
                    <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                        <Clock className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-card border border-border/80 p-4 rounded-xl flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-red-500/30 transition-all">
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-red-500">Errors</p>
                        <h3 className="text-2xl font-bold mt-1 text-red-500 font-mono">{errorCount}</h3>
                    </div>
                    <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-card border border-border/80 p-4 rounded-xl flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-blue-500/30 transition-all">
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-blue-500">Stale (&gt;7 days)</p>
                        <h3 className="text-2xl font-bold mt-1 text-blue-500 font-mono">{staleCount}</h3>
                    </div>
                    <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                        <Database className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-border">
                <nav className="flex space-x-6">
                    <button
                        onClick={() => setActiveTab('registry')}
                        className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
                            activeTab === 'registry'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <LayoutGrid className="w-4 h-4" /> Observation Registry
                    </button>
                    <button
                        onClick={() => setActiveTab('identity')}
                        className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
                            activeTab === 'identity'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <UserCheck className="w-4 h-4" /> Identity Mapping
                    </button>
                    <button
                        onClick={() => setActiveTab('workspace')}
                        className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
                            activeTab === 'workspace'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Link2 className="w-4 h-4" /> Workspace Assignment
                    </button>
                    <button
                        onClick={() => setActiveTab('queue')}
                        className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
                            activeTab === 'queue'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <History className="w-4 h-4" /> Observation Queue
                    </button>
                </nav>
            </div>

            {/* TAB CONTENT: Registry */}
            {activeTab === 'registry' && (
                <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                        <h3 className="font-semibold text-base">Observed Channels List</h3>
                        <span className="text-xs bg-secondary px-2.5 py-1 rounded-full font-mono text-muted-foreground">
                            {channels.length} Total
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="bg-secondary/40 text-muted-foreground border-b border-border">
                                    <th className="p-4 font-semibold">Channel Details</th>
                                    <th className="p-4 font-semibold">Analytics Type</th>
                                    <th className="p-4 font-semibold">Subscribers</th>
                                    <th className="p-4 font-semibold">Last Sync Time</th>
                                    <th className="p-4 font-semibold">Sync Duration</th>
                                    <th className="p-4 font-semibold">Status</th>
                                    <th className="p-4 font-semibold text-right">Actions</th>
                                </tr>
                            </table>
                            
                            {isChannelsLoading ? (
                                <div className="p-8 text-center text-muted-foreground">Loading observed channels...</div>
                            ) : channels.length === 0 ? (
                                <div className="p-12 text-center text-muted-foreground">
                                    No observed channels yet. Click "Observe Channel" to start monitoring.
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {channels.map((channel) => {
                                        const typeColor = 
                                            channel.is_own ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 
                                            channel.sync_status === 'competitor' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 
                                            'bg-teal-500/10 text-teal-400 border border-teal-500/20';
                                            
                                        const statusBadge = 
                                            channel.sync_status === 'SUCCESS' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                            channel.sync_status === 'SYNCING' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse' :
                                            channel.sync_status === 'PENDING' ? 'bg-amber-500/5 text-amber-500/80 border border-amber-500/10' :
                                            channel.sync_status === 'DISABLED' ? 'bg-gray-500/10 text-gray-500 border border-gray-500/20' :
                                            'bg-red-500/10 text-red-500 border border-red-500/20';

                                        return (
                                            <div key={channel.id} className="flex flex-row items-center border-b border-border/50 hover:bg-secondary/20 transition-all p-4">
                                                <div className="w-[25%] flex flex-col pr-4">
                                                    <span className="font-semibold text-foreground text-sm flex items-center gap-1.5 truncate">
                                                        {channel.channel_name}
                                                    </span>
                                                    <span className="text-xs font-mono text-muted-foreground/80 truncate">
                                                        {channel.channel_handle || channel.external_channel_id}
                                                    </span>
                                                </div>

                                                <div className="w-[12%] text-xs font-medium uppercase pr-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] tracking-wide ${typeColor}`}>
                                                        {channel.is_own ? 'owned' : 'competitor'}
                                                    </span>
                                                </div>

                                                <div className="w-[13%] text-sm pr-4">
                                                    {channel.sync_status === 'PENDING' ? (
                                                        <span className="text-xs text-muted-foreground italic">Pending Initial Sync</span>
                                                    ) : (
                                                        <span className="font-mono font-medium">—</span>
                                                    )}
                                                </div>

                                                <div className="w-[18%] text-xs text-muted-foreground pr-4 font-mono">
                                                    {channel.last_sync_at ? new Date(channel.last_sync_at).toLocaleString() : 'Never'}
                                                </div>

                                                <div className="w-[12%] text-xs font-mono text-muted-foreground pr-4">
                                                    {channel.last_sync_duration_seconds !== null && channel.last_sync_duration_seconds !== undefined
                                                        ? `${channel.last_sync_duration_seconds}s` 
                                                        : '—'}
                                                </div>

                                                <div className="w-[12%] pr-4">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border ${statusBadge}`}>
                                                        {channel.sync_status}
                                                    </span>
                                                </div>

                                                <div className="w-[8%] flex items-center justify-end gap-2.5">
                                                    <button 
                                                        onClick={() => setSelectedChannel(channel)}
                                                        title="View Details"
                                                        className="p-1.5 hover:text-blue-400 bg-secondary rounded transition-colors"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => syncMutation.mutate(channel.id)}
                                                        disabled={syncMutation.isPending || channel.sync_status === 'SYNCING'}
                                                        title="Refresh Metrics"
                                                        className="p-1.5 hover:text-green-400 bg-secondary rounded transition-colors disabled:opacity-50"
                                                    >
                                                        <RefreshCw className={`w-4 h-4 ${channel.sync_status === 'SYNCING' ? 'animate-spin text-green-500' : ''}`} />
                                                    </button>
                                                    <button 
                                                        onClick={() => archiveMutation.mutate(channel.id)}
                                                        title="Archive Channel"
                                                        className="p-1.5 hover:text-red-400 bg-secondary rounded transition-colors"
                                                    >
                                                        <Archive className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </table>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: Identity Mapping */}
            {activeTab === 'identity' && (
                <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-base">Channel Identity Connections</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">Map owned observed channels to Google OAuth credential references.</p>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        {channels.filter(c => c.is_own).length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-lg">
                                No owned observed channels registered. Register an owned observed channel first.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6">
                                {channels.filter(c => c.is_own).map(channel => {
                                    const linkedIdentity = identities.find(i => i.analytics_channel_id === channel.id);
                                    const linkedLocalChannel = localChannels.find(lc => lc.id === linkedIdentity?.identity_reference_id);
                                    const hasOauthConnected = linkedLocalChannel?.oauth_status === 'OAuth Connected';

                                    return (
                                        <div key={channel.id} className="bg-secondary/20 border border-border p-5 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="space-y-1.5">
                                                <h4 className="font-semibold text-base text-foreground">{channel.channel_name}</h4>
                                                <p className="text-xs font-mono text-muted-foreground">{channel.external_channel_id}</p>
                                                
                                                {linkedIdentity ? (
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                                                            Linked Profile: {linkedLocalChannel?.name || `ID: ${linkedIdentity.identity_reference_id.substring(0, 8)}...`}
                                                        </span>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                                                            hasOauthConnected 
                                                                ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                                                                : 'bg-red-500/10 text-red-500 border-red-500/20'
                                                        }`}>
                                                            {linkedLocalChannel?.oauth_status || 'OAuth Missing'}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="inline-block text-xs bg-red-500/10 text-red-500 border border-red-500/20 px-2.5 py-0.5 rounded-full mt-2 font-medium">
                                                        No OAuth Credential Linked
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <select
                                                    value={linkedIdentity?.identity_reference_id || ''}
                                                    onChange={(e) => {
                                                        if (e.target.value) {
                                                            linkIdentityMutation.mutate({
                                                                channelId: channel.id,
                                                                identityReferenceId: e.target.value
                                                            });
                                                        }
                                                    }}
                                                    className="bg-card border border-border rounded-md px-3 py-2 text-sm max-w-xs focus:ring-1 focus:ring-primary focus:outline-none font-medium"
                                                >
                                                    <option value="">-- Choose Local OAuth Channel --</option>
                                                    {localChannels
                                                        .filter(lc => lc.oauth_status === 'OAuth Connected')
                                                        .map(lc => (
                                                            <option key={lc.id} value={lc.id}>
                                                                {lc.name} ({lc.youtube_handle || 'No Handle'})
                                                            </option>
                                                        ))}
                                                </select>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB CONTENT: Workspace Assignment */}
            {activeTab === 'workspace' && (
                <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-border">
                        <h3 className="font-semibold text-base">Workspace Assignments</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Map independent Analytics Channels to Workspace Channels for content assembly alignment.</p>
                    </div>

                    <div className="p-6">
                        {channels.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-lg">
                                No observed channels yet. Set up observed channels first.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {channels.map(channel => {
                                    const linkedLink = workspaceLinks.find(wl => wl.analytics_channel_id === channel.id);
                                    const linkedLocalChannel = localChannels.find(lc => lc.id === linkedLink?.workspace_id);

                                    return (
                                        <div key={channel.id} className="bg-secondary/20 border border-border p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-border transition-all">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-semibold text-sm">{channel.channel_name}</h4>
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${channel.is_own ? 'bg-indigo-500/10 text-indigo-400' : 'bg-teal-500/10 text-teal-400'}`}>
                                                        {channel.is_own ? 'owned' : 'observed'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground font-mono mt-1">{channel.channel_handle || channel.external_channel_id}</p>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <select
                                                    value={linkedLink?.workspace_id || ''}
                                                    onChange={(e) => {
                                                        assignWorkspaceMutation.mutate({
                                                            channelId: channel.id,
                                                            workspaceChannelId: e.target.value || null
                                                        });
                                                    }}
                                                    className="bg-card border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none font-medium"
                                                >
                                                    <option value="">-- Unassigned (Not Mapped) --</option>
                                                    {localChannels.map(lc => (
                                                        <option key={lc.id} value={lc.id}>
                                                            {lc.name} ({lc.slug})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB CONTENT: Observation Queue */}
            {activeTab === 'queue' && (
                <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-base">Observation Queue logs</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">Passive monitor of all background sync tasks (read-only execution trace).</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="bg-secondary/40 text-muted-foreground border-b border-border">
                                    <th className="p-4 font-semibold">Channel Name</th>
                                    <th className="p-4 font-semibold">Started At</th>
                                    <th className="p-4 font-semibold">Finished At</th>
                                    <th className="p-4 font-semibold">Duration</th>
                                    <th className="p-4 font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {isLogsLoading ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-muted-foreground">Loading sync history...</td>
                                    </tr>
                                ) : syncLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-muted-foreground">No sync logs available yet.</td>
                                    </tr>
                                ) : (
                                    syncLogs.map((log) => {
                                        const statusColor = 
                                            log.status === 'SUCCESS' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                            log.status === 'SYNCING' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse' :
                                            'bg-red-500/10 text-red-500 border border-red-500/20';

                                        return (
                                            <tr key={log.id} className="hover:bg-secondary/20 transition-all">
                                                <td className="p-4 font-semibold text-foreground">{log.channel_name}</td>
                                                <td className="p-4 font-mono text-muted-foreground text-xs">{new Date(log.started_at).toLocaleString()}</td>
                                                <td className="p-4 font-mono text-muted-foreground text-xs">
                                                    {log.finished_at ? new Date(log.finished_at).toLocaleString() : '—'}
                                                </td>
                                                <td className="p-4 font-mono text-muted-foreground text-xs">
                                                    {log.duration_seconds !== null && log.duration_seconds !== undefined ? `${log.duration_seconds}s` : '—'}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border tracking-wider uppercase ${statusColor}`}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Observe Channel Modal */}
            {isObserveOpen && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <h2 className="font-semibold text-lg flex items-center gap-2">
                                <PlusCircle className="w-5 h-5 text-primary" /> Observe New Channel
                            </h2>
                            <button 
                                onClick={() => setIsObserveOpen(false)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleObserveSubmit}>
                            <div className="p-4 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">YouTube Channel ID, @Handle, or URL</label>
                                    <input 
                                        type="text" 
                                        value={externalChannelId}
                                        onChange={e => setExternalChannelId(e.target.value)}
                                        placeholder="e.g. UC12345..., @mychannel, or youtube.com/..." 
                                        className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                                    />
                                    <p className="text-[10px] text-muted-foreground/80">Supports standard UC IDs, handles, and channel homepages.</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Analytics Type</label>
                                    <select 
                                        value={analyticsType}
                                        onChange={e => setAnalyticsType(e.target.value as any)}
                                        className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                                    >
                                        <option value="observed">Observed (Regular Competitor/Public Channel)</option>
                                        <option value="owned">Owned (Requires Google OAuth mapping)</option>
                                        <option value="competitor">Competitor (Compare with owned channel)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Workspace Channel Assignment (Optional)</label>
                                    <select 
                                        value={assignedChannelId}
                                        onChange={e => setAssignedChannelId(e.target.value)}
                                        className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                                    >
                                        <option value="">-- Leave Unassigned --</option>
                                        {localChannels.map((c: any) => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.slug})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="p-4 border-t border-border flex justify-end gap-2">
                                <button 
                                    type="button"
                                    onClick={() => setIsObserveOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={observeMutation.isPending || !externalChannelId}
                                    className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md disabled:opacity-50"
                                >
                                    {observeMutation.isPending ? "Connecting..." : "Observe Channel"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Details Modal */}
            {selectedChannel && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <div>
                                <h2 className="font-semibold text-lg">{selectedChannel.channel_name}</h2>
                                <p className="text-xs text-muted-foreground font-mono">{selectedChannel.channel_handle || selectedChannel.external_channel_id}</p>
                            </div>
                            <button 
                                onClick={() => setSelectedChannel(null)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-6 flex-1 min-h-[300px]">
                            {isOverviewLoading ? (
                                <div className="text-center text-muted-foreground py-12">Loading metrics overview...</div>
                            ) : !overview ? (
                                <div className="text-center text-muted-foreground py-12">No data captured yet. Click refresh to sync.</div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-secondary/30 p-4 border border-border rounded-lg">
                                            <p className="text-xs text-muted-foreground uppercase font-semibold">Subscribers</p>
                                            <p className="text-xl font-bold font-mono mt-1">
                                                {overview.subscribers ? overview.subscribers.toLocaleString() : 'Pending Initial Sync'}
                                            </p>
                                        </div>
                                        <div className="bg-secondary/30 p-4 border border-border rounded-lg">
                                            <p className="text-xs text-muted-foreground uppercase font-semibold">Total Views</p>
                                            <p className="text-xl font-bold font-mono mt-1">
                                                {overview.views ? overview.views.toLocaleString() : '—'}
                                            </p>
                                        </div>
                                        <div className="bg-secondary/30 p-4 border border-border rounded-lg">
                                            <p className="text-xs text-muted-foreground uppercase font-semibold">Watch Time (min)</p>
                                            <p className="text-xl font-bold font-mono mt-1">
                                                {overview.watch_time ? overview.watch_time.toLocaleString() : '—'}
                                            </p>
                                        </div>
                                        <div className="bg-secondary/30 p-4 border border-border rounded-lg">
                                            <p className="text-xs text-muted-foreground uppercase font-semibold">CTR</p>
                                            <p className="text-xl font-bold font-mono mt-1">
                                                {overview.ctr ? `${overview.ctr.toFixed(2)}%` : '—'}
                                            </p>
                                        </div>
                                        <div className="bg-secondary/30 p-4 border border-border rounded-lg">
                                            <p className="text-xs text-muted-foreground uppercase font-semibold">Likes</p>
                                            <p className="text-xl font-bold font-mono mt-1">
                                                {overview.likes ? overview.likes.toLocaleString() : '—'}
                                            </p>
                                        </div>
                                        <div className="bg-secondary/30 p-4 border border-border rounded-lg">
                                            <p className="text-xs text-muted-foreground uppercase font-semibold">Comments</p>
                                            <p className="text-xl font-bold font-mono mt-1">
                                                {overview.comments ? overview.comments.toLocaleString() : '—'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-secondary/15 border border-border/80 p-4 rounded-lg space-y-2.5">
                                        <h4 className="font-semibold text-xs uppercase text-muted-foreground tracking-wider">Sync Log Details</h4>
                                        <div className="grid grid-cols-2 gap-y-2 text-xs">
                                            <span className="text-muted-foreground">Observed Since:</span>
                                            <span className="font-mono text-foreground">{new Date(selectedChannel.created_at).toLocaleString()}</span>

                                            <span className="text-muted-foreground">Last Sync Completed:</span>
                                            <span className="font-mono text-foreground">
                                                {selectedChannel.last_sync_at ? new Date(selectedChannel.last_sync_at).toLocaleString() : 'Never'}
                                            </span>

                                            <span className="text-muted-foreground">Last Sync Duration:</span>
                                            <span className="font-mono text-foreground">
                                                {selectedChannel.last_sync_duration_seconds !== null ? `${selectedChannel.last_sync_duration_seconds} seconds` : 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {selectedChannel.last_error && (
                                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg space-y-1">
                                            <h4 className="font-semibold text-xs uppercase text-red-500 flex items-center gap-1.5">
                                                <ShieldAlert className="w-4 h-4" /> Sync Error Log
                                            </h4>
                                            <p className="text-xs text-muted-foreground leading-relaxed break-words">{selectedChannel.last_error}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-border flex justify-end bg-secondary/10">
                            <button 
                                onClick={() => setSelectedChannel(null)}
                                className="px-4 py-2 text-sm font-semibold bg-secondary hover:bg-secondary/80 rounded-md transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
