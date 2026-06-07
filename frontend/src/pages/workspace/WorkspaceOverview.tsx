import { 
    Package, 
    Activity, 
    CheckCircle2,
    XCircle,
    PlaySquare,
    ExternalLink,
    HardDrive,
    FileVideo,
    Calendar,
    AlertTriangle
} from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getChannels, getPackages, getChannelStorage, getJobStats } from '../../services/api';
import { format } from 'date-fns';

function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function WorkspaceOverview() {
    const { slug } = useParams();
    const { data: channels = [] } = useQuery({ queryKey: ['channels'], queryFn: getChannels });
    const currentChannel = channels.find(c => c.slug === slug);

    const { data: packages = [], isLoading: isLoadingPackages } = useQuery({ 
        queryKey: ['packages', currentChannel?.id], 
        queryFn: () => getPackages(currentChannel?.id),
        enabled: !!currentChannel?.id 
    });

    const { data: storageStats, isLoading: isLoadingStorage } = useQuery({
        queryKey: ['storage', currentChannel?.id],
        queryFn: () => getChannelStorage(currentChannel?.id!),
        enabled: !!currentChannel?.id
    });

    const { data: jobStats } = useQuery({
        queryKey: ['jobStats', currentChannel?.id],
        queryFn: () => getJobStats(currentChannel?.id!),
        enabled: !!currentChannel?.id
    });

    if (!currentChannel) return null;

    const draftPackages = packages.filter(p => p.status === 'draft');
    const readyPackages = packages.filter(p => p.status === 'ready');
    const queuedPackages = packages.filter(p => p.status === 'queued');
    const publishedPackages = packages.filter(p => p.status === 'published');
    const failedPackages = packages.filter(p => p.status === 'failed');

    const isOAuthConnected = currentChannel.oauth_status === 'OAuth Connected';

    // Compile Recent Activity
    const recentActivity = [
        ...(isOAuthConnected ? [{
            id: 'oauth-event',
            type: 'oauth',
            title: 'OAuth Connected',
            date: new Date(currentChannel.created_at), // Fallback to channel created_at
            status: 'completed'
        }] : []),
        ...packages.map(p => ({
            id: p.id,
            type: 'package',
            title: `Package ${p.package_number} created`,
            date: new Date(p.created_at),
            status: p.status
        }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 8);

    return (
        <div className="space-y-8 max-w-6xl pb-12">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Channel Dashboard</h1>
                <p className="text-muted-foreground mt-1 text-sm">Operational overview for {currentChannel.name}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* LEFT COLUMN: Main Snapshot & Publishing */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* SECTION 1: Channel Snapshot */}
                    <section>
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Channel Snapshot</h2>
                        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                <div>
                                    <h3 className="text-2xl font-bold">{currentChannel.name}</h3>
                                    <p className="text-muted-foreground text-sm font-mono mt-1">/{currentChannel.slug}</p>
                                    
                                    <div className="flex items-center gap-4 mt-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-muted-foreground">OAuth:</span>
                                            {isOAuthConnected ? (
                                                <span className="flex items-center text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
                                                </span>
                                            ) : (
                                                <span className="flex items-center text-xs font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded">
                                                    <XCircle className="w-3 h-3 mr-1" /> Disconnected
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {currentChannel.youtube_channel_title ? (
                                                <>
                                                    <span className="text-sm text-muted-foreground">Connected Channel:</span>
                                                    <span className="text-sm font-bold text-primary">
                                                        {currentChannel.youtube_channel_title}
                                                    </span>
                                                    {currentChannel.youtube_handle && (
                                                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                                                            {currentChannel.youtube_handle}
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-sm text-muted-foreground">Account:</span>
                                                    <span className="text-sm font-medium">Unknown</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                        <Calendar className="w-4 h-4" />
                                        Created on {format(new Date(currentChannel.created_at), 'PPP')}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {currentChannel.youtube_channel_id ? (
                                        <>
                                            <a 
                                                href={`https://studio.youtube.com/channel/${currentChannel.youtube_channel_id}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors"
                                            >
                                                YouTube Studio
                                            </a>
                                            <a 
                                                href={currentChannel.youtube_channel_url || `https://youtube.com/channel/${currentChannel.youtube_channel_id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-md font-medium text-sm transition-colors"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                                Open Channel
                                            </a>
                                        </>
                                    ) : (
                                        <>
                                            <button disabled className="flex items-center justify-center gap-2 bg-secondary/50 text-muted-foreground px-4 py-2 rounded-md font-medium text-sm transition-colors cursor-not-allowed">
                                                YouTube Studio
                                            </button>
                                            <button disabled className="flex items-center justify-center gap-2 bg-secondary/50 text-muted-foreground px-4 py-2 rounded-md font-medium text-sm transition-colors cursor-not-allowed">
                                                <ExternalLink className="w-4 h-4" />
                                                Open Channel
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* SECTION 2: Publishing Snapshot */}
                    <section>
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Publishing Snapshot</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                            <div className="bg-card border border-border p-4 rounded-xl shadow-sm text-center">
                                <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">Draft</p>
                                {isLoadingPackages ? <div className="h-8 w-12 mx-auto bg-secondary rounded animate-pulse" /> : <p className="text-2xl font-bold">{draftPackages.length}</p>}
                            </div>
                            <div className="bg-card border border-emerald-500/30 bg-emerald-500/5 p-4 rounded-xl shadow-sm text-center">
                                <p className="text-xs text-emerald-600/80 dark:text-emerald-400 font-medium mb-1 uppercase tracking-wider">Ready</p>
                                {isLoadingPackages ? <div className="h-8 w-12 mx-auto bg-secondary rounded animate-pulse" /> : <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{readyPackages.length}</p>}
                            </div>
                            <div className="bg-card border border-blue-500/30 bg-blue-500/5 p-4 rounded-xl shadow-sm text-center">
                                <p className="text-xs text-blue-600/80 dark:text-blue-400 font-medium mb-1 uppercase tracking-wider">Queued</p>
                                {isLoadingPackages ? <div className="h-8 w-12 mx-auto bg-secondary rounded animate-pulse" /> : <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{queuedPackages.length}</p>}
                            </div>
                            <div className="bg-card border border-border p-4 rounded-xl shadow-sm text-center opacity-70">
                                <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">Published</p>
                                {isLoadingPackages ? <div className="h-8 w-12 mx-auto bg-secondary rounded animate-pulse" /> : <p className="text-2xl font-bold">{publishedPackages.length}</p>}
                            </div>
                            <div className="bg-card border border-destructive/30 bg-destructive/5 p-4 rounded-xl shadow-sm text-center">
                                <p className="text-xs text-destructive/80 font-medium mb-1 uppercase tracking-wider">Failed</p>
                                {isLoadingPackages ? <div className="h-8 w-12 mx-auto bg-secondary rounded animate-pulse" /> : <p className="text-2xl font-bold text-destructive">{failedPackages.length}</p>}
                            </div>
                        </div>
                    </section>

                    {/* SECTION 3: Upload Jobs */}
                    <section>
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Upload Jobs (Execution)</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="bg-card border border-border p-4 rounded-xl shadow-sm text-center">
                                <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">Pending</p>
                                <p className="text-2xl font-bold">{jobStats?.pending || 0}</p>
                            </div>
                            <div className="bg-card border border-blue-500/30 bg-blue-500/5 p-4 rounded-xl shadow-sm text-center">
                                <p className="text-xs text-blue-600/80 dark:text-blue-400 font-medium mb-1 uppercase tracking-wider">Uploading</p>
                                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{jobStats?.uploading || 0}</p>
                            </div>
                            <div className="bg-card border border-emerald-500/30 bg-emerald-500/5 p-4 rounded-xl shadow-sm text-center">
                                <p className="text-xs text-emerald-600/80 dark:text-emerald-400 font-medium mb-1 uppercase tracking-wider">Completed</p>
                                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{jobStats?.completed || 0}</p>
                            </div>
                            <div className="bg-card border border-destructive/30 bg-destructive/5 p-4 rounded-xl shadow-sm text-center">
                                <p className="text-xs text-destructive/80 font-medium mb-1 uppercase tracking-wider">Failed</p>
                                <p className="text-2xl font-bold text-destructive">{jobStats?.failed || 0}</p>
                            </div>
                        </div>
                    </section>

                </div>

                {/* RIGHT COLUMN: Health, Storage, Activity */}
                <div className="space-y-8">

                    {/* SECTION 5: Queue Health */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Queue Health</h2>
                            <Link to={`/workspace/${slug}/queue`} className="text-xs text-primary hover:underline font-medium">Manage Queue</Link>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Packages Ready</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{readyPackages.length}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Packages Queued</span>
                                <span className="font-bold text-blue-600 dark:text-blue-400">{queuedPackages.length}</span>
                            </div>
                            
                            {queuedPackages.length === 0 && (
                                <div className="mt-4 flex items-start gap-3 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 text-amber-600 dark:text-amber-500 text-sm">
                                    <AlertTriangle className="w-5 h-5 shrink-0" />
                                    <p><strong>Queue Empty Warning</strong><br/>The upload queue is empty. Content will not be published.</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* SECTION 4: Storage Status */}
                    <section>
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Storage Status</h2>
                        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-border pb-4">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <HardDrive className="w-5 h-5" />
                                    <span className="text-sm font-medium">Storage Used</span>
                                </div>
                                <span className="font-bold">
                                    {isLoadingStorage ? '...' : formatBytes(storageStats?.storage_bytes || 0)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Package className="w-4 h-4" />
                                    <span className="text-sm">Total Packages</span>
                                </div>
                                <span className="font-medium text-sm">
                                    {isLoadingStorage ? '...' : storageStats?.package_count || 0}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <FileVideo className="w-4 h-4" />
                                    <span className="text-sm">Video Files</span>
                                </div>
                                <span className="font-medium text-sm">
                                    {isLoadingStorage ? '...' : storageStats?.video_count || 0}
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* SECTION 3: Latest Activity */}
                    <section>
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Latest Activity</h2>
                        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
                            {recentActivity.length > 0 ? (
                                <div className="relative border-l-2 border-border ml-3 space-y-6 pb-2">
                                    {recentActivity.map((activity, idx) => (
                                        <div key={activity.id + activity.type + idx} className="relative pl-6">
                                            <span className="absolute -left-[9px] top-1 bg-background border-2 border-border w-4 h-4 rounded-full" />
                                            <div>
                                                <p className="text-sm font-medium leading-tight">{activity.title}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="bg-secondary px-1.5 py-0.5 rounded text-[10px] font-medium uppercase text-muted-foreground">
                                                        {activity.type}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {format(activity.date, 'PPp')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-6 text-center space-y-3 opacity-60">
                                    <Activity className="w-8 h-8 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm font-medium">No recent activity</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
}
