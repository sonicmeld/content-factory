import { 
    Package, 
    Clock, 
    Activity, 
    FileVideo, 
    FileText, 
    Image as ImageIcon,
    CheckCircle2,
    XCircle,
    PlaySquare,
    UploadCloud,
    FolderOpen,
    FolderKanban,
    AlertCircle
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getChannels, getPackages, getAssets } from '../../services/api';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

export default function WorkspaceOverview() {
    const { slug } = useParams();
    const { data: channels = [] } = useQuery({ queryKey: ['channels'], queryFn: getChannels });
    const currentChannel = channels.find(c => c.slug === slug);

    const { data: packages = [], isLoading: isLoadingPackages } = useQuery({ 
        queryKey: ['packages', currentChannel?.id], 
        queryFn: () => getPackages(currentChannel?.id),
        enabled: !!currentChannel?.id 
    });

    const { data: channelAssets = [], isLoading: isLoadingAssets } = useQuery({
        queryKey: ['assets', currentChannel?.id],
        queryFn: () => getAssets(currentChannel?.id),
        enabled: !!currentChannel?.id
    });

    const { data: sharedAssets = [], isLoading: isLoadingShared } = useQuery({
        queryKey: ['assets', 'shared'],
        queryFn: () => getAssets('shared')
    });

    if (!currentChannel) return null;

    const draftPackages = packages.filter(p => p.status === 'draft');
    const readyPackages = packages.filter(p => p.status === 'ready');
    const publishedPackages = packages.filter(p => p.status === 'published');
    // Using 0 for queued as per instructions since it doesn't exist yet
    const queuedPackagesCount = 0;

    const isOAuthConnected = currentChannel.oauth_status === 'OAuth Connected';
    const totalAssets = channelAssets.length + sharedAssets.length;

    const sharedFootageCount = sharedAssets.filter(a => a.mime_type.startsWith('video/') || a.filename.endsWith('.mp4')).length;
    const sharedPromptsCount = sharedAssets.filter(a => a.mime_type.startsWith('text/') || a.filename.endsWith('.txt')).length;

    const channelFootageCount = channelAssets.filter(a => a.mime_type.startsWith('video/') || a.filename.endsWith('.mp4')).length;
    const channelThumbnailsCount = channelAssets.filter(a => a.mime_type.startsWith('image/')).length;

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
        })),
        ...channelAssets.map(a => ({
            id: a.id,
            type: 'asset',
            title: `Asset uploaded: ${a.filename}`,
            date: new Date(a.created_at),
            status: 'completed'
        }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 6);

    const isLoading = isLoadingPackages || isLoadingAssets || isLoadingShared;

    return (
        <div className="space-y-10 max-w-6xl pb-12">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Channel Operations</h1>
                <p className="text-muted-foreground mt-1 text-sm">Mission Control for {currentChannel.name}</p>
            </div>

            {/* SECTION 1: Channel Health */}
            <section className="space-y-4">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Channel Health</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* OAuth Status */}
                    <div className="bg-card border border-border p-5 rounded-xl shadow-sm flex flex-col justify-between h-28">
                        <span className="text-sm text-muted-foreground font-medium">OAuth Status</span>
                        <div className="flex items-center gap-2 mt-auto">
                            {isOAuthConnected ? (
                                <span className="flex items-center text-sm font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-md">
                                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                    Connected
                                </span>
                            ) : (
                                <span className="flex items-center text-sm font-bold text-destructive bg-destructive/10 px-2.5 py-1 rounded-md">
                                    <XCircle className="w-4 h-4 mr-1.5" />
                                    Disconnected
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Content Packages */}
                    <div className="bg-card border border-border p-5 rounded-xl shadow-sm flex flex-col justify-between h-28">
                        <span className="text-sm text-muted-foreground font-medium">Content Packages</span>
                        <div className="flex items-end gap-2 mt-auto">
                            {isLoading ? (
                                <div className="h-8 w-12 bg-secondary rounded animate-pulse" />
                            ) : (
                                <>
                                    <span className="text-3xl font-bold">{packages.length}</span>
                                    <span className="text-sm text-muted-foreground mb-1">total</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Total Assets */}
                    <div className="bg-card border border-border p-5 rounded-xl shadow-sm flex flex-col justify-between h-28">
                        <span className="text-sm text-muted-foreground font-medium">Available Assets</span>
                        <div className="flex items-end gap-2 mt-auto">
                            {isLoading ? (
                                <div className="h-8 w-12 bg-secondary rounded animate-pulse" />
                            ) : (
                                <>
                                    <span className="text-3xl font-bold">{totalAssets}</span>
                                    <span className="text-sm text-muted-foreground mb-1">items</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Published Videos (Future) */}
                    <div className="bg-card border border-border p-5 rounded-xl shadow-sm flex flex-col justify-between h-28 opacity-70">
                        <span className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
                            Published Videos <PlaySquare className="w-4 h-4 text-red-500" />
                        </span>
                        <div className="mt-auto">
                            {publishedPackages.length > 0 ? (
                                <span className="text-3xl font-bold">{publishedPackages.length}</span>
                            ) : (
                                <span className="text-xs font-medium bg-secondary px-2 py-1 rounded text-muted-foreground">Not Implemented Yet</span>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION 2: Production Status */}
            <section className="space-y-4">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Production Status</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    <div className="bg-card border border-border p-5 rounded-xl shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground font-medium mb-1">Draft Packages</p>
                            {isLoading ? <div className="h-7 w-8 bg-secondary rounded animate-pulse" /> : <p className="text-2xl font-bold">{draftPackages.length}</p>}
                        </div>
                        <div className="p-3 bg-secondary rounded-lg">
                            <FolderOpen className="w-5 h-5 text-muted-foreground" />
                        </div>
                    </div>

                    <div className="bg-card border border-emerald-500/30 p-5 rounded-xl shadow-sm flex items-center justify-between bg-emerald-500/5">
                        <div>
                            <p className="text-sm text-emerald-600/80 dark:text-emerald-400 font-medium mb-1">Ready Packages</p>
                            {isLoading ? <div className="h-7 w-8 bg-secondary rounded animate-pulse" /> : <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{readyPackages.length}</p>}
                        </div>
                        <div className="p-3 bg-emerald-500/20 rounded-lg">
                            <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </div>

                    <div className="bg-card border border-blue-500/30 p-5 rounded-xl shadow-sm flex items-center justify-between bg-blue-500/5">
                        <div>
                            <p className="text-sm text-blue-600/80 dark:text-blue-400 font-medium mb-1">Queued Packages</p>
                            {isLoading ? <div className="h-7 w-8 bg-secondary rounded animate-pulse" /> : <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{queuedPackagesCount}</p>}
                        </div>
                        <div className="p-3 bg-blue-500/20 rounded-lg">
                            <UploadCloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>

                    <div className="bg-card border border-purple-500/30 p-5 rounded-xl shadow-sm flex items-center justify-between bg-purple-500/5">
                        <div>
                            <p className="text-sm text-purple-600/80 dark:text-purple-400 font-medium mb-1">Published</p>
                            {isLoading ? <div className="h-7 w-8 bg-secondary rounded animate-pulse" /> : <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{publishedPackages.length}</p>}
                        </div>
                        <div className="p-3 bg-purple-500/20 rounded-lg">
                            <PlaySquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                    </div>

                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* SECTION 3: Asset Overview */}
                <section className="space-y-4">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Asset Overview</h2>
                    <div className="space-y-4">
                        {/* Shared Assets */}
                        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <FolderKanban className="w-4 h-4 text-blue-500" /> 
                                    Shared Assets
                                </h3>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground flex items-center gap-2"><FileVideo className="w-4 h-4" /> Footage</span>
                                    <span className="font-medium text-sm bg-secondary px-2 py-0.5 rounded-md">{isLoadingShared ? '...' : sharedFootageCount}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground flex items-center gap-2"><FileText className="w-4 h-4" /> Prompts</span>
                                    <span className="font-medium text-sm bg-secondary px-2 py-0.5 rounded-md">{isLoadingShared ? '...' : sharedPromptsCount}</span>
                                </div>
                            </div>
                        </div>

                        {/* Channel Assets */}
                        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <FolderOpen className="w-4 h-4 text-emerald-500" /> 
                                    Channel Assets
                                </h3>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground flex items-center gap-2"><FileVideo className="w-4 h-4" /> Footage</span>
                                    <span className="font-medium text-sm bg-secondary px-2 py-0.5 rounded-md">{isLoadingAssets ? '...' : channelFootageCount}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Thumbnails</span>
                                    <span className="font-medium text-sm bg-secondary px-2 py-0.5 rounded-md">{isLoadingAssets ? '...' : channelThumbnailsCount}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Queue Status Card */}
                    <section className="space-y-4">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Queue Status</h2>
                        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "p-4 rounded-full",
                                    readyPackages.length > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-secondary text-muted-foreground"
                                )}>
                                    <Clock className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">
                                        {isLoadingPackages ? 'Loading...' : readyPackages.length === 0 ? "No packages ready" : `${readyPackages.length} packages ready`}
                                    </h3>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        Queue module not implemented yet
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Recent Activity Timeline */}
                    <section className="space-y-4">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent Activity</h2>
                        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
                            {recentActivity.length > 0 ? (
                                <div className="relative border-l-2 border-border ml-3 space-y-8 pb-4">
                                    {recentActivity.map((activity, idx) => (
                                        <div key={activity.id + activity.type + idx} className="relative pl-6">
                                            <span className="absolute -left-[9px] top-1 bg-background border-2 border-border w-4 h-4 rounded-full" />
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="text-sm font-medium">{activity.title}</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        {format(activity.date, 'PPp')}
                                                    </p>
                                                </div>
                                                <span className="bg-secondary px-2 py-0.5 rounded text-[10px] font-medium uppercase text-muted-foreground">
                                                    {activity.type}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 text-center space-y-3 opacity-60">
                                    <Activity className="w-8 h-8 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm font-medium">No recent activity</p>
                                        <p className="text-xs text-muted-foreground">Create a package or upload an asset to get started.</p>
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
