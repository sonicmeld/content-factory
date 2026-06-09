
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMetadataVariants, selectMetadataVariant, deleteMetadataVariant } from '../services/api';
import VariantCard from './VariantCard';
import { toast } from 'sonner';
import { Loader2, Database } from 'lucide-react';

interface Props {
    packageId: string;
}

export default function MetadataVariantList({ packageId }: Props) {
    const queryClient = useQueryClient();

    const { data: variants, isLoading, isError } = useQuery({
        queryKey: ['metadata-variants', packageId],
        queryFn: () => getMetadataVariants(packageId),
        refetchInterval: 5000, // auto-refresh to catch background completions
    });

    const selectMutation = useMutation({
        mutationFn: (variantId: string) => selectMetadataVariant(packageId, variantId),
        onSuccess: () => {
            toast.success('Metadata variant selected');
            queryClient.invalidateQueries({ queryKey: ['package-generation', packageId] });
            queryClient.invalidateQueries({ queryKey: ['metadata-variants', packageId] });
        },
        onError: (err: any) => {
            const detail = err.response?.data?.error || err.response?.data?.detail || 'Failed to select variant';
            toast.error(detail);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (variantId: string) => deleteMetadataVariant(variantId),
        onSuccess: () => {
            toast.success('Variant deleted');
            queryClient.invalidateQueries({ queryKey: ['metadata-variants', packageId] });
        },
        onError: (err: any) => {
            const detail = err.response?.data?.error || err.response?.data?.detail || 'Failed to delete variant';
            toast.error(detail);
        }
    });

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading variants...
            </div>
        );
    }

    if (isError) {
        return (
            <div className="text-sm text-red-400 py-4">
                Failed to load metadata variants.
            </div>
        );
    }

    if (!variants || variants.length === 0) {
        return null;
    }

    return (
        <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
                <Database className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-semibold text-foreground">Generated Candidates</h3>
                <span className="bg-secondary text-muted-foreground px-2 py-0.5 rounded-full text-[10px] font-medium">
                    {variants.length}
                </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {variants.map(variant => (
                    <VariantCard
                        key={variant.id}
                        variant={variant}
                        onSelect={(id) => selectMutation.mutate(id)}
                        onDelete={(id) => deleteMutation.mutate(id)}
                        isSelecting={selectMutation.isPending}
                        isDeleting={deleteMutation.isPending}
                    />
                ))}
            </div>
        </div>
    );
}
