import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGenerationAssets, deleteGenerationAsset, selectGenerationAsset } from '../services/api';
import AssetCard from './AssetCard';
import { toast } from 'sonner';
import { Loader2, FolderOpen } from 'lucide-react';

interface Props {
    packageId: string;
}

export default function AssetGrid({ packageId }: Props) {
    const queryClient = useQueryClient();

    const { data: assets, isLoading, isError } = useQuery({
        queryKey: ['generation-assets', packageId],
        queryFn: () => getGenerationAssets(packageId),
        refetchInterval: 5000, // Poll to update pending/failed statuses automatically
    });

    const deleteMutation = useMutation({
        mutationFn: (assetId: string) => deleteGenerationAsset(assetId),
        onSuccess: () => {
            toast.success('Asset deleted');
            queryClient.invalidateQueries({ queryKey: ['generation-assets', packageId] });
        },
        onError: (err: any) => {
            const detail = err.response?.data?.error || err.response?.data?.detail || 'Failed to delete asset';
            toast.error(detail);
        }
    });

    const selectMutation = useMutation({
        mutationFn: (assetId: string) => selectGenerationAsset(packageId, assetId),
        onSuccess: () => {
            toast.success('Asset selected and promoted');
            queryClient.invalidateQueries({ queryKey: ['generation-assets', packageId] });
            queryClient.invalidateQueries({ queryKey: ['packages'] });
            queryClient.invalidateQueries({ queryKey: ['package-generation'] });
        },
        onError: (err: any) => {
            const detail = err.response?.data?.error || err.response?.data?.detail || 'Failed to select asset';
            toast.error(detail);
        }
    });

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading assets...
            </div>
        );
    }

    if (isError) {
        return (
            <div className="text-sm text-red-400 py-4">
                Failed to load generation assets.
            </div>
        );
    }

    if (!assets || assets.length === 0) {
        return null;
    }

    return (
        <div className="mt-6">
            <div className="flex items-center gap-2 mb-4">
                <FolderOpen className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-foreground">Generated Assets</h3>
                <span className="bg-secondary text-muted-foreground px-2 py-0.5 rounded-full text-[10px] font-medium">
                    {assets.length}
                </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {assets.map(asset => (
                    <AssetCard
                        key={asset.id}
                        asset={asset}
                        onDelete={(id) => deleteMutation.mutate(id)}
                        onSelect={(id) => selectMutation.mutate(id)}
                        isDeleting={deleteMutation.isPending && deleteMutation.variables === asset.id}
                        isSelecting={selectMutation.isPending && selectMutation.variables === asset.id}
                    />
                ))}
            </div>
        </div>
    );
}
