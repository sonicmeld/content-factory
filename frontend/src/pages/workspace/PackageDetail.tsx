import { ArrowLeft, Trash2, Loader2, Package as PackageIcon, FileVideo, Clock, Calendar, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPackage, getAssets, deletePackage, getChannels } from '../../services/api';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function PackageDetail() {
    const { slug, packageId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: channels = [] } = useQuery({ queryKey: ['channels'], queryFn: getChannels });
    const currentChannel = channels.find(c => c.slug === slug);

    const { data: pkg, isLoading: isLoadingPackage } = useQuery({
        queryKey: ['package', packageId],
        queryFn: () => getPackage(packageId!),
        enabled: !!packageId
    });

    const { data: assets = [] } = useQuery({
        queryKey: ['assets', currentChannel?.id],
        queryFn: () => getAssets(currentChannel?.id),
        enabled: !!currentChannel?.id
    });

    const { data: sharedAssets = [] } = useQuery({
        queryKey: ['assets', 'shared'],
        queryFn: () => getAssets('shared')
    });

    const allAssets = [...assets, ...sharedAssets];
    
    const videoAsset = pkg ? allAssets.find(a => a.id === pkg.video_asset_id) : null;
    const timestampAsset = pkg ? allAssets.find(a => a.id === pkg.timestamp_asset_id) : null;

    const deleteMutation = useMutation({
        mutationFn: () => deletePackage(packageId!),
        onSuccess: () => {
            toast.success('Content Package deleted');
            queryClient.invalidateQueries({ queryKey: ['packages'] });
            navigate(`/workspace/${slug}/packages`);
        },
        onError: () => toast.error('Failed to delete package')
    });

    if (isLoadingPackage) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!pkg) {
        return (
            <div className="text-center py-12">
                <h2 className="text-xl font-semibold">Package not found</h2>
                <Link to={`/workspace/${slug}/packages`} className="text-primary hover:underline mt-2 inline-block">
                    Back to Packages
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link 
                        to={`/workspace/${slug}/packages`}
                        className="p-2 -ml-2 rounded-md hover:bg-secondary text-muted-foreground transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight">Package {pkg.package_number}</h1>
                            <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize bg-secondary text-secondary-foreground border border-border">
                                {pkg.status === 'ready' && <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />}
                                {pkg.status}
                            </div>
                        </div>
                        <p className="text-muted-foreground mt-1 text-sm flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Created {format(new Date(pkg.created_at), 'PPP')}
                        </p>
                    </div>
                </div>
                
                <button
                    onClick={() => {
                        if (confirm('Are you sure you want to delete this package?')) {
                            deleteMutation.mutate();
                        }
                    }}
                    disabled={deleteMutation.isPending}
                    className="flex items-center gap-2 bg-destructive/10 text-destructive hover:bg-destructive/20 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                    {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Delete Package
                </button>
            </div>

            <div className="grid gap-4">
                <div className="bg-card border border-border rounded-lg p-5 flex items-start gap-4">
                    <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
                        <FileVideo className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-sm">Video Asset</h3>
                        {videoAsset ? (
                            <div className="mt-2 space-y-1">
                                <p className="text-sm font-medium">{videoAsset.filename}</p>
                                <p className="text-xs text-muted-foreground">Type: {videoAsset.mime_type} • Size: {(videoAsset.file_size / 1024 / 1024).toFixed(2)} MB</p>
                                <p className="text-xs text-muted-foreground">Source: {videoAsset.channel_id === 'shared' ? 'Shared Library' : 'Channel Assets'}</p>
                            </div>
                        ) : (
                            <p className="text-sm text-destructive mt-2">Asset missing or deleted (ID: {pkg.video_asset_id})</p>
                        )}
                    </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-5 flex items-start gap-4">
                    <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-sm">Timestamp Asset</h3>
                        {pkg.timestamp_asset_id ? (
                            timestampAsset ? (
                                <div className="mt-2 space-y-1">
                                    <p className="text-sm font-medium">{timestampAsset.filename}</p>
                                    <p className="text-xs text-muted-foreground">Type: {timestampAsset.mime_type} • Size: {(timestampAsset.file_size / 1024).toFixed(2)} KB</p>
                                </div>
                            ) : (
                                <p className="text-sm text-destructive mt-2">Asset missing or deleted (ID: {pkg.timestamp_asset_id})</p>
                            )
                        ) : (
                            <p className="text-sm text-muted-foreground mt-2 italic">No timestamp asset provided for this package.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
