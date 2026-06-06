import { Package, AlertCircle, Clock, Activity, FileVideo, FileAudio, FileText, Image as ImageIcon } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getChannels, getPackages, getAssets } from '../../services/api';
import { format } from 'date-fns';

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

    const draftPackages = packages.filter(p => p.status === 'draft');
    const readyPackages = packages.filter(p => p.status === 'ready');
    const publishedPackages = packages.filter(p => p.status === 'published');

    const allAssets = [...channelAssets, ...sharedAssets];
    
    const footageCount = allAssets.filter(a => a.mime_type.startsWith('video/') || a.filename.endsWith('.mp4')).length;
    const audioCount = allAssets.filter(a => a.mime_type.startsWith('audio/') || a.filename.endsWith('.mp3') || a.filename.endsWith('.wav')).length;
    const promptCount = allAssets.filter(a => a.mime_type.startsWith('text/') || a.filename.endsWith('.txt')).length;
    const thumbnailCount = allAssets.filter(a => a.mime_type.startsWith('image/')).length;

    // Compile Recent Activity
    const recentActivity = [
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
    ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

    if (!currentChannel) return null;

    return (
        <div className="space-y-6 max-w-5xl">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Workspace Overview</h1>
                <p className="text-muted-foreground mt-1 text-sm">Monitor content pipeline and publishing status for this channel.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold flex items-center gap-2"><Package className="w-5 h-5 text-primary" /> Pipeline Health</h3>
                    </div>
                    {isLoadingPackages ? (
                        <div className="space-y-4 animate-pulse">
                            <div className="h-6 bg-secondary/50 rounded w-full"></div>
                            <div className="h-6 bg-secondary/50 rounded w-full"></div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Draft Packages</span>
                                <span className="font-bold text-lg">{draftPackages.length}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Ready Packages</span>
                                <span className="font-bold text-lg text-emerald-500">{readyPackages.length}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Published Packages</span>
                                <span className="font-bold text-lg text-blue-500">{publishedPackages.length}</span>
                            </div>
                            <div className="pt-4 border-t border-border flex justify-between items-center">
                                <span className="text-sm font-semibold">Total Packages</span>
                                <span className="font-bold text-xl">{packages.length}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold flex items-center gap-2"><ImageIcon className="w-5 h-5 text-purple-500" /> Asset Inventory</h3>
                    </div>
                    {isLoadingAssets || isLoadingShared ? (
                        <div className="space-y-4 animate-pulse">
                            <div className="h-6 bg-secondary/50 rounded w-full"></div>
                            <div className="h-6 bg-secondary/50 rounded w-full"></div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground flex items-center gap-2"><FileVideo className="w-4 h-4" /> Footage</span>
                                <span className="font-bold">{footageCount}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground flex items-center gap-2"><FileAudio className="w-4 h-4" /> Audio</span>
                                <span className="font-bold">{audioCount}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground flex items-center gap-2"><FileText className="w-4 h-4" /> Prompts</span>
                                <span className="font-bold">{promptCount}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Thumbnails</span>
                                <span className="font-bold">{thumbnailCount}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold flex items-center gap-2"><Clock className="w-5 h-5 text-blue-500" /> Upcoming Queue</h3>
                    </div>
                    <div className="text-sm text-muted-foreground flex flex-col items-center justify-center h-24 text-center">
                        No packages scheduled for the upcoming days.
                    </div>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2"><Activity className="w-5 h-5 text-emerald-500" /> Recent Activity</h3>
                </div>
                {recentActivity.length > 0 ? (
                    <div className="space-y-4">
                        {recentActivity.map(activity => (
                            <div key={activity.id + activity.type} className="flex items-center gap-4 p-3 bg-secondary/10 rounded-lg border border-border">
                                <div className="p-2 bg-secondary rounded-full">
                                    {activity.type === 'package' ? <Package className="w-4 h-4 text-primary" /> : <ImageIcon className="w-4 h-4 text-purple-500" />}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">{activity.title}</p>
                                    <p className="text-xs text-muted-foreground">{format(activity.date, 'PPp')}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-sm text-muted-foreground flex flex-col items-center justify-center h-32 text-center border-2 border-dashed border-border rounded-lg bg-secondary/20">
                        No recent activity found.
                    </div>
                )}
            </div>
        </div>
    );
}
