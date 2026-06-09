import { useQuery } from '@tanstack/react-query';
import { getGenerationReadiness } from '../services/api';
import { CheckCircle2, XCircle, AlertCircle, Server } from 'lucide-react';

interface Props {
    channelId: string;
}

export default function GenerationReadinessPanel({ channelId }: Props) {
    const { data: readiness, isLoading, isError } = useQuery({
        queryKey: ['generation-readiness', channelId],
        queryFn: () => getGenerationReadiness(channelId),
        enabled: !!channelId
    });

    if (isLoading) {
        return (
            <div className="bg-card border border-border rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-secondary w-1/3 mb-4 rounded"></div>
                <div className="space-y-2">
                    <div className="h-3 bg-secondary w-full rounded"></div>
                    <div className="h-3 bg-secondary w-full rounded"></div>
                    <div className="h-3 bg-secondary w-full rounded"></div>
                </div>
            </div>
        );
    }

    if (isError || !readiness) {
        return (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-500 font-medium">Failed to load generation readiness</p>
            </div>
        );
    }

    const readinessItems = [
        { label: 'Metadata Combo', ready: readiness.metadata_ready },
        { label: 'Thumbnail Combo', ready: readiness.thumbnail_ready },
        { label: 'Footage Combo', ready: readiness.footage_ready },
    ];

    return (
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/50">
                <Server className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Generation Readiness</h3>
            </div>
            
            <div className="space-y-3">
                {readinessItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                        <div className="flex items-center gap-1.5">
                            {item.ready ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-500">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-red-400">
                                    <XCircle className="w-3.5 h-3.5" /> Missing
                                </span>
                            )}
                        </div>
                    </div>
                ))}

                <div className="pt-3 mt-3 border-t border-border/50 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Prompt Contexts</span>
                        <span className="font-semibold">{readiness.active_prompt_contexts} Active</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Generation Combos</span>
                        <span className="font-semibold">{readiness.active_combos} Active</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
