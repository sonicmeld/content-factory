import { 
    Package, 
    Activity, 
    CheckCircle2,
    XCircle,
    PlaySquare,
    Youtube,
    ExternalLink,
    HardDrive,
    FileVideo,
    Calendar,
    AlertTriangle
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getChannels, getPackages, getChannelStorage } from '../../services/api';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

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

    if (!currentChannel) return null;

    const draftPackages = packages.filter(p => p.status === 'draft');
    const readyPackages = packages.filter(p => p.status === 'ready');
    const publishedPackages = packages.filter(p => p.status === 'published');
    const failedPackages = packages.filter(p => p.status === 'failed'); // if any

    const isOAuthConnected = currentChannel.oauth_status === 'OAuth Connected';
    const hasPackages = packages.length > 0;
    const hasReadyPackages = readyPackages.length > 0;

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
                                            <span className="text-sm text-muted-foreground">Account:</span>
                                            <span className="text-sm font-medium">Unknown</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                        <Calendar className="w-4 h-4" />
                                        Created on {format(new Date(currentChannel.created_at), 'PPP')}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button disabled className="flex items-center justify-center gap-2 bg-secondary/50 text-muted-foreground px-4 py-2 rounded-md font-medium text-sm transition-colors cursor-not-allowed">
                                        <Youtube className="w-4 h-4" />
                                        YouTube Studio
                                    </button>
                                    <button disabled className="flex items-center justify-center gap-2 bg-secondary/50 text-muted-foreground px-4 py-2 rounded-md font-medium text-sm transition-colors cursor-not-allowed">
                                        <ExternalLink className="w-4 h-4" />
                                        Open Channel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* SECTION 2: Publishing Snapshot */}
                    <section>
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Publishing Snapshot</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="bg-card border border-border p-5 rounded-xl shadow-sm text-center">
                                <p className="text-sm text-muted-foreground font-medium mb-1">Total</p>
                                {isLoadingPackages ? <div className="h-8 w-12 mx-auto bg-secondary rounded animate-pulse" /> : <p className="text-3xl font-bold">{packages.length}</p>}
                            </div>
                            <div className="bg-card border border-border p-5 rounded-xl shadow-sm text-center">
                                <p className="text-sm text-muted-foreground font-medium mb-1">Draft</p>
                                {isLoadingPackages ? <div className="h-8 w-12 mx-auto bg-secondary rounded animate-pulse" /> : <p className="text-3xl font-bold">{draftPackages.length}</p>}
                            </div>
                            <div className="bg-card border border-emerald-500/30 bg-emerald-500/5 p-5 rounded-xl shadow-sm text-center">
                                <p className="text-sm text-emerald-600/80 dark:text-emerald-400 font-medium mb-1">Ready</p>
                                {isLoadingPackages ? <div className="h-8 w-12 mx-auto bg-secondary rounded animate-pulse" /> : <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{readyPackages.length}</p>}
                            </div>
                            <div className="bg-card border border-destructive/30 bg-destructive/5 p-5 rounded-xl shadow-sm text-center">
                                <p className="text-sm text-destructive/80 font-medium mb-1">Failed</p>
                                {isLoadingPackages ? <div className="h-8 w-12 mx-auto bg-secondary rounded animate-pulse" /> : <p className="text-3xl font-bold text-destructive">{failedPackages.length}</p>}
                            </div>
                        </div>
                    </section>

                    {/* Published Placeholder */}
                    <section>
                        <div className="bg-card border border-dashed border-border rounded-xl p-8 shadow-sm flex flex-col items-center justify-center text-center opacity-60">
                            <PlaySquare className="w-10 h-10 text-muted-foreground mb-3" />
                            <h3 className="text-lg font-semibold">Published Videos</h3>
                            <p className="text-sm text-muted-foreground mt-1">Publisher Module Not Implemented Yet</p>
                        </div>
                    </section>

                </div>

                {/* RIGHT COLUMN: Health, Storage, Activity */}
                <div className="space-y-8">

                    {/* SECTION 5: Channel Health */}
                    <section>
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Channel Health</h2>
                        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">OAuth Connected</span>
                                {isOAuthConnected ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertTriangle className="w-5 h-5 text-amber-500" />}
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Packages Available</span>
                                {hasPackages ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertTriangle className="w-5 h-5 text-amber-500" />}
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Ready For Publishing</span>
                                {hasReadyPackages ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertTriangle className="w-5 h-5 text-amber-500" />}
                            </div>
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
