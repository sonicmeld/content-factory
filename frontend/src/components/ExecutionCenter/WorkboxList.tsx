import { useQuery } from '@tanstack/react-query';
import { getWorkboxPackages } from '../../services/api';
import ProductionGapRow from './ProductionGapRow';
import { Loader2, Inbox } from 'lucide-react';
import type { WorkboxPackage } from '../../types';

interface WorkboxListProps {
    channelId?: string;
    filterReadiness?: 'READY' | 'PARTIAL' | 'BLOCKED';
}

export default function WorkboxList({ channelId, filterReadiness }: WorkboxListProps) {
    const { data: packages = [], isLoading, error } = useQuery({
        queryKey: ['workbox', channelId],
        queryFn: () => getWorkboxPackages(channelId),
        refetchInterval: 10000, // Poll every 10s
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p>Loading workbox data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
                Failed to load workbox data. Please try again.
            </div>
        );
    }

    let displayPackages = packages;
    if (filterReadiness) {
        displayPackages = packages.filter((p: WorkboxPackage) => p.assembly_readiness === filterReadiness);
    } else {
        // By default, if no filter, maybe show PARTIAL and BLOCKED for "Production Gaps"
        displayPackages = packages.filter((p: WorkboxPackage) => p.assembly_readiness !== 'READY');
    }

    if (displayPackages.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground border border-dashed border-border rounded-lg bg-card/50">
                <Inbox className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">No packages found</p>
                <p className="text-sm">All clear in this view.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {displayPackages.map((pkg: WorkboxPackage) => (
                <ProductionGapRow key={pkg.package_generation_id} pkg={pkg} />
            ))}
        </div>
    );
}
