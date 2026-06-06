import { useState } from 'react';
import { PackagePlus, ArrowLeft, Loader2, FileVideo, Clock } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getChannels, getAssets, createPackage } from '../../services/api';
import { toast } from 'sonner';

export default function CreatePackage() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [packageNumber, setPackageNumber] = useState('');
    const [videoAssetId, setVideoAssetId] = useState('');
    const [timestampAssetId, setTimestampAssetId] = useState('');
    const [status, setStatus] = useState('draft');

    const { data: channels = [] } = useQuery({ queryKey: ['channels'], queryFn: getChannels });
    const currentChannel = channels.find(c => c.slug === slug);

    const { data: channelAssets = [], isLoading: isLoadingAssets } = useQuery({
        queryKey: ['assets', currentChannel?.id],
        queryFn: () => getAssets(currentChannel?.id),
        enabled: !!currentChannel?.id
    });

    const { data: sharedAssets = [] } = useQuery({
        queryKey: ['assets', 'shared'],
        queryFn: () => getAssets('shared')
    });

    const allAssets = [...channelAssets, ...sharedAssets];
    
    // Filter assets by type for easier selection
    const videoAssets = allAssets.filter(a => a.mime_type.startsWith('video/') || a.filename.endsWith('.mp4'));
    const textAssets = allAssets.filter(a => a.mime_type.startsWith('text/') || a.filename.endsWith('.txt'));

    const createMutation = useMutation({
        mutationFn: () => createPackage({
            channel_id: currentChannel?.id,
            package_number: packageNumber,
            video_asset_id: videoAssetId,
            timestamp_asset_id: timestampAssetId || undefined,
            status
        }),
        onSuccess: () => {
            toast.success('Content Package created successfully');
            queryClient.invalidateQueries({ queryKey: ['packages'] });
            navigate(`/workspace/${slug}/packages`);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Failed to create package');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!packageNumber || !videoAssetId || !currentChannel?.id) return;
        createMutation.mutate();
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-4">
                <Link 
                    to={`/workspace/${slug}/packages`}
                    className="p-2 -ml-2 rounded-md hover:bg-secondary text-muted-foreground transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Create Package</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Assemble a new content package for publishing.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-card border border-border p-6 rounded-lg">
                <div className="space-y-4">
                    
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Package Number</label>
                        <input 
                            type="text" 
                            required
                            placeholder="e.g. 01, 02, Episode 5"
                            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            value={packageNumber}
                            onChange={e => setPackageNumber(e.target.value)}
                        />
                        <p className="text-[10px] text-muted-foreground">A unique identifier or sequence number for this package.</p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-border">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <FileVideo className="w-4 h-4 text-blue-500" />
                            Video Asset *
                        </label>
                        {isLoadingAssets ? (
                            <div className="h-10 border border-border rounded-md bg-secondary/20 animate-pulse"></div>
                        ) : (
                            <select 
                                required
                                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                value={videoAssetId}
                                onChange={e => setVideoAssetId(e.target.value)}
                            >
                                <option value="">Select Video Asset</option>
                                {videoAssets.length > 0 ? videoAssets.map(asset => (
                                    <option key={asset.id} value={asset.id}>
                                        {asset.filename} ({asset.channel_id === 'shared' ? 'Shared' : 'Channel'})
                                    </option>
                                )) : (
                                    <option value="" disabled>No video assets found. Upload some first.</option>
                                )}
                            </select>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Clock className="w-4 h-4 text-emerald-500" />
                            Timestamp Asset (Optional)
                        </label>
                        {isLoadingAssets ? (
                            <div className="h-10 border border-border rounded-md bg-secondary/20 animate-pulse"></div>
                        ) : (
                            <select 
                                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                value={timestampAssetId}
                                onChange={e => setTimestampAssetId(e.target.value)}
                            >
                                <option value="">None</option>
                                {textAssets.length > 0 ? textAssets.map(asset => (
                                    <option key={asset.id} value={asset.id}>
                                        {asset.filename} ({asset.channel_id === 'shared' ? 'Shared' : 'Channel'})
                                    </option>
                                )) : (
                                    <option value="" disabled>No text assets found.</option>
                                )}
                            </select>
                        )}
                        <p className="text-[10px] text-muted-foreground">If this video requires timestamps, select the text file here.</p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-border">
                        <label className="text-sm font-medium">Initial Status</label>
                        <select 
                            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            value={status}
                            onChange={e => setStatus(e.target.value)}
                        >
                            <option value="draft">Draft</option>
                            <option value="ready">Ready (Assets complete)</option>
                        </select>
                    </div>

                </div>

                <div className="pt-4 flex items-center justify-end gap-3">
                    <Link 
                        to={`/workspace/${slug}/packages`}
                        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Cancel
                    </Link>
                    <button 
                        type="submit" 
                        disabled={createMutation.isPending || !packageNumber || !videoAssetId}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackagePlus className="w-4 h-4" />}
                        Create Package
                    </button>
                </div>
            </form>
        </div>
    );
}
