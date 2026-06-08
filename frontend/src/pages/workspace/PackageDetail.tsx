import { ArrowLeft, Trash2, Loader2, FileVideo, Clock, Calendar, CheckCircle2, ListOrdered, XCircle, RefreshCcw } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPackage, deletePackage, updatePackageStatus, addToQueue, removeFromQueue } from '../../services/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import PackageGenerationPanel from '../../components/PackageGenerationPanel';

export default function PackageDetail() {
    const { slug, packageId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: pkg, isLoading: isLoadingPackage } = useQuery({
        queryKey: ['package', packageId],
        queryFn: () => getPackage(packageId!),
        enabled: !!packageId
    });

    const deleteMutation = useMutation({
        mutationFn: () => deletePackage(packageId!),
        onSuccess: () => {
            toast.success('Content Package deleted');
            queryClient.invalidateQueries({ queryKey: ['packages'] });
            navigate(`/workspace/${slug}/packages`);
        },
        onError: () => toast.error('Failed to delete package')
    });

    const updateStatusMutation = useMutation({
        mutationFn: (status: string) => updatePackageStatus(packageId!, status),
        onSuccess: () => {
            toast.success('Package status updated');
            queryClient.invalidateQueries({ queryKey: ['package', packageId] });
            queryClient.invalidateQueries({ queryKey: ['packages'] });
        },
        onError: () => toast.error('Failed to update package status')
    });

    const queueAddMutation = useMutation({
        mutationFn: () => addToQueue(packageId!),
        onSuccess: () => {
            toast.success('Added to upload queue');
            queryClient.invalidateQueries({ queryKey: ['package', packageId] });
            queryClient.invalidateQueries({ queryKey: ['packages'] });
        },
        onError: () => toast.error('Failed to add to queue')
    });

    const queueRemoveMutation = useMutation({
        mutationFn: () => removeFromQueue(packageId!),
        onSuccess: () => {
            toast.success('Removed from upload queue');
            queryClient.invalidateQueries({ queryKey: ['package', packageId] });
            queryClient.invalidateQueries({ queryKey: ['packages'] });
        },
        onError: () => toast.error('Failed to remove from queue')
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

    const videoFilename = pkg.video_path ? pkg.video_path.split(/[/\\]/).pop() : 'Unknown';
    const timestampFilename = pkg.timestamp_path ? pkg.timestamp_path.split(/[/\\]/).pop() : null;

    const isPendingAction = updateStatusMutation.isPending || queueAddMutation.isPending || queueRemoveMutation.isPending || deleteMutation.isPending;

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div className="flex flex-col gap-4">
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
                        disabled={isPendingAction}
                        className="flex items-center gap-2 bg-destructive/10 text-destructive hover:bg-destructive/20 px-3 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Delete
                    </button>
                </div>
                
                <div className="flex items-center gap-3 bg-muted/30 p-4 rounded-xl border border-border">
                    <span className="text-sm font-semibold mr-2 text-muted-foreground">Actions:</span>
                    
                    {pkg.status === 'draft' && (
                        <button 
                            onClick={() => updateStatusMutation.mutate('ready')}
                            disabled={isPendingAction}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {updateStatusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            Mark Ready
                        </button>
                    )}
                    
                    {pkg.status === 'ready' && (
                        <button 
                            onClick={() => queueAddMutation.mutate()}
                            disabled={isPendingAction}
                            className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {queueAddMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListOrdered className="w-4 h-4" />}
                            Add To Queue
                        </button>
                    )}
                    
                    {pkg.status === 'queued' && (
                        <button 
                            onClick={() => queueRemoveMutation.mutate()}
                            disabled={isPendingAction}
                            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {queueRemoveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                            Remove From Queue
                        </button>
                    )}

                    {pkg.status === 'failed' && (
                        <button 
                            onClick={() => updateStatusMutation.mutate('ready')}
                            disabled={isPendingAction}
                            className="bg-amber-500 text-white hover:bg-amber-600 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {updateStatusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                            Retry
                        </button>
                    )}

                    {pkg.status === 'published' && (
                        <span className="text-sm italic text-muted-foreground ml-2">This package is published and is read-only.</span>
                    )}
                </div>
            </div>

            <div className="grid gap-4">
                <div className="bg-card border border-border rounded-lg p-5 flex items-start gap-4">
                    <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
                        <FileVideo className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-sm">Production Video</h3>
                        <div className="mt-2 space-y-1">
                            <p className="text-sm font-medium">{videoFilename}</p>
                            <p className="text-xs text-muted-foreground break-all">Path: {pkg.video_path}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-5 flex items-start gap-4">
                    <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-sm">Timestamp File</h3>
                        {pkg.timestamp_path ? (
                            <div className="mt-2 space-y-1">
                                <p className="text-sm font-medium">{timestampFilename}</p>
                                <p className="text-xs text-muted-foreground break-all">Path: {pkg.timestamp_path}</p>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground mt-2 italic">No timestamp file provided for this package.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Generation Studio Panel */}
            <PackageGenerationPanel package_={pkg} channelSlug={slug!} />
        </div>
    );
}
