/**
 * PackageGenerationPanel.tsx — Sprint 7A-3
 *
 * Displays the Generation Studio state for a single Content Package.
 * Reads from GET /api/packages/{id}/generation.
 * Sprint 7A-3: Active metadata generation with 9Router integration and polling.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPackageGeneration, generateMetadata, getPromptContexts, generateThumbnail, getGenerationReadiness } from '../services/api';
import type { ContentPackage } from '../types';
import { toast } from 'sonner';
import {
    Cpu,
    FileText,
    Image as ImageIcon,
    CheckCircle2,
    Clock,
    Loader2,
    XCircle,
    Sparkles,
    AlertTriangle,
} from 'lucide-react';
import GenerationReadinessPanel from './GenerationReadinessPanel';
import MetadataVariantList from './MetadataVariantList';

interface Props {
    package_: ContentPackage;
    channelSlug: string;
}

type GenStatus = 'pending' | 'processing' | 'completed' | 'failed';

function StatusBadge({ status }: { status: GenStatus }) {
    const map: Record<GenStatus, { label: string; className: string; icon: React.ReactNode }> = {
        pending: {
            label: 'Pending',
            className: 'bg-muted text-muted-foreground',
            icon: <Clock className="w-3 h-3" />,
        },
        processing: {
            label: 'Processing',
            className: 'bg-blue-500/15 text-blue-400',
            icon: <Loader2 className="w-3 h-3 animate-spin" />,
        },
        completed: {
            label: 'Completed',
            className: 'bg-emerald-500/15 text-emerald-400',
            icon: <CheckCircle2 className="w-3 h-3" />,
        },
        failed: {
            label: 'Failed',
            className: 'bg-red-500/15 text-red-400',
            icon: <XCircle className="w-3 h-3" />,
        },
    };
    const cfg = map[status] ?? map.pending;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.className}`}>
            {cfg.icon}
            {cfg.label}
        </span>
    );
}

export default function PackageGenerationPanel({ package_, channelSlug }: Props) {
    const queryClient = useQueryClient();
    const [selectedContextId, setSelectedContextId] = useState<string>('');

    const { data: promptContexts = [] } = useQuery({
        queryKey: ['prompt-contexts', package_.channel_id],
        queryFn: () => getPromptContexts(package_.channel_id),
    });

    const {
        data: gen,
        isLoading,
        isError,
        error,
    } = useQuery({
        queryKey: ['package-generation', package_.id],
        queryFn: () => getPackageGeneration(package_.id),
        // 404 means no generation record yet — not a fatal error
        retry: false,
        refetchInterval: (query) => {
            const data = query.state.data;
            if (data && (data.metadata_status === 'processing' || data.thumbnail_status === 'processing')) {
                return 2000;
            }
            return false;
        }
    });

    const { data: readiness } = useQuery({
        queryKey: ['generation-readiness', package_.channel_id],
        queryFn: () => getGenerationReadiness(package_.channel_id),
        enabled: !!package_.channel_id
    });

    const noRecord = isError && (error as any)?.response?.status === 404;

    const generateMetadataMutation = useMutation({
        mutationFn: () => generateMetadata(package_.id, selectedContextId || undefined),
        onSuccess: () => {
            toast.success('Metadata generation triggered');
            queryClient.invalidateQueries({ queryKey: ['package-generation', package_.id] });
            queryClient.invalidateQueries({ queryKey: ['package', package_.id] });
        },
        onError: (err: any) => {
            const detail = err.response?.data?.error || err.response?.data?.detail || 'Failed to generate metadata';
            toast.error(detail);
        }
    });

    const generateThumbnailMutation = useMutation({
        mutationFn: () => generateThumbnail(package_.id, selectedContextId || undefined),
        onSuccess: () => {
            toast.success('Thumbnail generation triggered');
            queryClient.invalidateQueries({ queryKey: ['package-generation', package_.id] });
            queryClient.invalidateQueries({ queryKey: ['package', package_.id] });
        },
        onError: (err: any) => {
            const detail = err.response?.data?.error || err.response?.data?.detail || 'Failed to generate thumbnail';
            toast.error(detail);
        }
    });

    const isMetadataProcessing = gen?.metadata_status === 'processing';
    const isThumbnailProcessing = gen?.thumbnail_status === 'processing';

    return (
        <div className="border border-border/60 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-violet-500/5 border-b border-border/60">
                <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-violet-400" />
                    <span className="text-sm font-semibold text-violet-300">Generation Studio</span>
                </div>
                {gen?.is_ready && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                        Ready
                    </span>
                )}
            </div>

            <div className="p-4 space-y-4">
                {/* Loading state */}
                {isLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading generation data…
                    </div>
                )}

                {/* No generation record yet */}
                {noRecord && (
                    <div className="text-sm text-muted-foreground py-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500/70" />
                        No generation record yet. Use the buttons below to start.
                    </div>
                )}

                {/* Unexpected error */}
                {isError && !noRecord && (
                    <div className="text-sm text-red-400 py-2 flex items-center gap-2">
                        <XCircle className="w-4 h-4" />
                        Failed to load generation data.
                    </div>
                )}

                {/* Generation status tracks */}
                {gen && (
                    <div className="space-y-3">
                        {/* Track: Metadata */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Metadata</span>
                            </div>
                            <StatusBadge status={gen.metadata_status} />
                        </div>

                        {/* Track: Thumbnail */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm">
                                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Thumbnail</span>
                            </div>
                            <StatusBadge status={gen.thumbnail_status} />
                        </div>

                        {/* Generated content (read-only) */}
                        {gen.metadata_status === 'completed' && (gen.title || gen.description) && (
                            <div className="mt-2 pt-3 border-t border-border/60 space-y-2">
                                {gen.title && (
                                    <div>
                                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Generated Title</p>
                                        <p className="text-sm font-medium">{gen.title}</p>
                                    </div>
                                )}
                                {gen.description && (
                                    <div>
                                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Generated Description</p>
                                        <p className="text-xs text-muted-foreground line-clamp-3">{gen.description}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Thumbnail preview */}
                        {gen.thumbnail_status === 'completed' && gen.thumbnail_path && (
                            <div className="mt-2 pt-3 border-t border-border/60">
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Generated Thumbnail</p>
                                <img
                                    src={`/data/channels/${channelSlug}/assets/thumbnails/${gen.thumbnail_path.split('/').pop()}`}
                                    alt="Generated Thumbnail"
                                    className="rounded-md w-full object-cover max-h-32 border border-border"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                            </div>
                        )}

                        {/* Error message */}
                        {gen.error_message && (
                            <div className="mt-2 pt-3 border-t border-red-500/20">
                                <p className="text-[10px] font-medium text-red-400 uppercase tracking-wider mb-1">Error</p>
                                <p className="text-xs text-red-400/80 font-mono">{gen.error_message}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Metadata Context Dropdown */}
                <div className="space-y-1.5 pt-3 border-t border-border/60">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Metadata Context</label>
                    <select
                        className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                        value={selectedContextId}
                        onChange={(e) => setSelectedContextId(e.target.value)}
                        disabled={isMetadataProcessing || generateMetadataMutation.isPending}
                    >
                        <option value="">Default (No Context)</option>
                        {promptContexts.map((ctx) => (
                            <option key={ctx.id} value={ctx.id}>
                                {ctx.title}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Selected Context Preview */}
                {selectedContextId && (
                    <div className="mt-2 p-3 bg-secondary/30 rounded-md border border-border/50 space-y-2">
                        {promptContexts.find(c => c.id === selectedContextId)?.topic && (
                            <div>
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">Topic</span>
                                <p className="text-xs text-foreground font-medium">{promptContexts.find(c => c.id === selectedContextId)?.topic}</p>
                            </div>
                        )}
                        {promptContexts.find(c => c.id === selectedContextId)?.keywords && (
                            <div>
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">Keywords</span>
                                <p className="text-xs text-muted-foreground">{promptContexts.find(c => c.id === selectedContextId)?.keywords}</p>
                            </div>
                        )}
                        {promptContexts.find(c => c.id === selectedContextId)?.notes && (
                            <div>
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">Notes</span>
                                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{promptContexts.find(c => c.id === selectedContextId)?.notes}</p>
                            </div>
                        )}
                    </div>
                )}

                <div className="pt-3 border-t border-border/60">
                    <GenerationReadinessPanel channelId={package_.channel_id} />
                </div>
                
                <div className="pt-3 border-t border-border/60">
                    <MetadataVariantList packageId={package_.id} />
                </div>

                {/* Placeholder action buttons */}
                <div className="pt-3 border-t border-border/60 flex gap-2 flex-wrap">
                    <button
                        onClick={() => generateMetadataMutation.mutate()}
                        disabled={generateMetadataMutation.isPending || isMetadataProcessing || readiness?.metadata_ready === false}
                        title={readiness?.metadata_ready === false ? "Metadata combo is missing or inactive" : undefined}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 active:bg-violet-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {generateMetadataMutation.isPending || isMetadataProcessing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                        )}
                        Generate Metadata
                    </button>
                    <button
                        onClick={() => generateThumbnailMutation.mutate()}
                        disabled={generateThumbnailMutation.isPending || isThumbnailProcessing || readiness?.thumbnail_ready === false}
                        title={readiness?.thumbnail_ready === false ? "Thumbnail combo is missing or inactive" : undefined}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 active:bg-violet-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {generateThumbnailMutation.isPending || isThumbnailProcessing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <ImageIcon className="w-3.5 h-3.5" />
                        )}
                        Generate Thumbnail
                    </button>
                </div>
            </div>
        </div>
    );
}
