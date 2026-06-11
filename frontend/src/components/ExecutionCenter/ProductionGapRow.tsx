import { PackageSearch, FileText, Image as ImageIcon, PlayCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { WorkboxPackage } from '../../types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { generateMetadata, generateThumbnail, assemblePackage } from '../../services/api';
import { toast } from 'sonner';
import { Package } from 'lucide-react';

interface ProductionGapRowProps {
    pkg: WorkboxPackage;
}

export default function ProductionGapRow({ pkg }: ProductionGapRowProps) {
    const queryClient = useQueryClient();

    const generateMetadataMutation = useMutation({
        mutationFn: () => generateMetadata(pkg.package_id),
        onSuccess: () => {
            toast.success(`Metadata generation started for ${pkg.package_number}`);
            queryClient.invalidateQueries({ queryKey: ['workbox'] });
            queryClient.invalidateQueries({ queryKey: ['execution-tasks'] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.detail || 'Failed to start metadata generation');
        }
    });

    const generateThumbnailMutation = useMutation({
        mutationFn: () => generateThumbnail(pkg.package_id),
        onSuccess: () => {
            toast.success(`Thumbnail generation started for ${pkg.package_number}`);
            queryClient.invalidateQueries({ queryKey: ['workbox'] });
            queryClient.invalidateQueries({ queryKey: ['execution-tasks'] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.detail || 'Failed to start thumbnail generation');
        }
    });

    const assembleMutation = useMutation({
        mutationFn: () => assemblePackage(pkg.package_id),
        onSuccess: () => {
            toast.success(`Assembly completed for ${pkg.package_number}`);
            queryClient.invalidateQueries({ queryKey: ['workbox'] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.detail || 'Failed to assemble package');
        }
    });

    const getReadinessColor = (status: string) => {
        switch (status) {
            case 'READY': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'PARTIAL': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'BLOCKED': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-secondary text-muted-foreground border-border';
        }
    };

    return (
        <div className="flex items-center justify-between p-4 bg-card border border-border/50 rounded-lg shadow-sm hover:border-primary/30 transition-colors group">
            {/* Left: Package Info & Readiness */}
            <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-secondary rounded flex items-center justify-center text-primary border border-border/50">
                    <PackageSearch className="w-5 h-5" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-semibold">{pkg.channel_name}</span>
                        <span className="text-muted-foreground text-sm font-mono">#{pkg.package_number}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getReadinessColor(pkg.assembly_readiness)}`}>
                            {pkg.assembly_readiness}
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-3 mt-1.5 text-xs">
                        {Object.entries(pkg.asset_statuses).map(([assetType, status]) => (
                            <div key={assetType} className="flex items-center gap-1.5">
                                {assetType === 'Metadata' ? <FileText className="w-3 h-3 text-muted-foreground" /> : <ImageIcon className="w-3 h-3 text-muted-foreground" />}
                                <span className="text-muted-foreground">{assetType}:</span>
                                <span className={status === 'completed' ? 'text-green-500' : status === 'uninitialized' ? 'text-red-400' : 'text-yellow-500 capitalize'}>
                                    {status}
                                </span>
                                {status === 'completed' && pkg.production_sources[assetType] && (
                                    <span className="text-[9px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded border border-border/50 uppercase ml-1">
                                        {pkg.production_sources[assetType]}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
                {pkg.production_gaps.includes('Metadata') && (
                    <button
                        onClick={() => generateMetadataMutation.mutate()}
                        disabled={generateMetadataMutation.isPending || pkg.asset_statuses['Metadata'] !== 'uninitialized'}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-secondary hover:bg-secondary/80 border border-border rounded transition-colors disabled:opacity-50"
                    >
                        {generateMetadataMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4 text-primary" />}
                        Gen Metadata
                    </button>
                )}
                
                {pkg.production_gaps.includes('Thumbnail') && (
                    <button
                        onClick={() => generateThumbnailMutation.mutate()}
                        disabled={generateThumbnailMutation.isPending || pkg.asset_statuses['Thumbnail'] !== 'uninitialized'}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-secondary hover:bg-secondary/80 border border-border rounded transition-colors disabled:opacity-50"
                    >
                        {generateThumbnailMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4 text-primary" />}
                        Gen Thumbnail
                    </button>
                )}

                {pkg.package_status === 'assembled' && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-500/10 text-green-500 border border-green-500/20 rounded font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        ASSEMBLED
                    </div>
                )}

                {pkg.assembly_readiness === 'READY' && pkg.package_status !== 'assembled' && (
                    <button
                        onClick={() => assembleMutation.mutate()}
                        disabled={assembleMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground hover:bg-primary/90 border border-primary rounded transition-colors disabled:opacity-50 font-medium"
                    >
                        {assembleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                        Assemble
                    </button>
                )}

                <Link
                    to={`/channels/${pkg.channel_slug}/packages/${pkg.package_id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-secondary border border-transparent hover:border-border rounded transition-colors text-muted-foreground"
                >
                    Workspace
                </Link>
            </div>
        </div>
    );
}
