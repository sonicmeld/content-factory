import { PackagePlus, FileVideo, Clock, Calendar, CheckCircle2, ChevronRight, Package as PackageIcon } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getChannels, getPackages, getAssets } from '../../services/api';
import { format } from 'date-fns';

export default function ContentPackages() {
    const { slug } = useParams();

    const { data: channels = [] } = useQuery({ queryKey: ['channels'], queryFn: getChannels });
    const currentChannel = channels.find(c => c.slug === slug);

    const { data: packages = [], isLoading: isLoadingPackages } = useQuery({
        queryKey: ['packages', currentChannel?.id],
        queryFn: () => getPackages(currentChannel?.id),
        enabled: !!currentChannel?.id
    });

    const { data: assets = [] } = useQuery({
        queryKey: ['assets', currentChannel?.id],
        queryFn: () => getAssets(currentChannel?.id),
        enabled: !!currentChannel?.id
    });

    // We also need shared assets because a package might use a shared timestamp or video.
    const { data: sharedAssets = [] } = useQuery({
        queryKey: ['assets', 'shared'],
        queryFn: () => getAssets('shared')
    });

    const allAssets = [...assets, ...sharedAssets];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Content Packages</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Manage the primary content units for this channel.</p>
                </div>
                <Link 
                    to={`/workspace/${slug}/packages/create`}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors"
                >
                    <PackagePlus className="w-4 h-4" />
                    Create Package
                </Link>
            </div>

            {isLoadingPackages ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : packages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed border-border rounded-lg bg-secondary/10">
                    <PackagePlus className="w-12 h-12 mb-4 text-muted-foreground/50" />
                    <p>No content packages found.</p>
                    <p className="text-sm mt-1">Create a new package to start publishing.</p>
                </div>
            ) : (
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-secondary/30">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Package</th>
                                    <th className="px-6 py-4 font-medium">Video Asset</th>
                                    <th className="px-6 py-4 font-medium">Timestamp</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                    <th className="px-6 py-4 font-medium">Created Date</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {packages.map(pkg => {
                                    const videoAsset = allAssets.find(a => a.id === pkg.video_asset_id);
                                    const timestampAsset = allAssets.find(a => a.id === pkg.timestamp_asset_id);
                                    
                                    return (
                                        <tr key={pkg.id} className="hover:bg-secondary/20 group transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                                                        <PackageIcon className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-medium text-foreground">
                                                        {pkg.package_number}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <FileVideo className="w-4 h-4 text-blue-500" />
                                                    <span className="truncate max-w-[200px]" title={videoAsset?.filename || pkg.video_asset_id}>
                                                        {videoAsset?.filename || 'Unknown'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {pkg.timestamp_asset_id ? (
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <Clock className="w-4 h-4 text-emerald-500" />
                                                        <span className="truncate max-w-[150px]" title={timestampAsset?.filename || pkg.timestamp_asset_id}>
                                                            {timestampAsset?.filename || 'Yes'}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground/50 text-xs italic">None</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-secondary text-secondary-foreground border border-border">
                                                    {pkg.status === 'ready' && <CheckCircle2 className="w-3 h-3 mr-1.5 text-emerald-500" />}
                                                    {pkg.status}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Calendar className="w-4 h-4" />
                                                    {format(new Date(pkg.created_at), 'MMM d, yyyy')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link 
                                                    to={`/workspace/${slug}/packages/${pkg.id}`}
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <ChevronRight className="w-5 h-5" />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
