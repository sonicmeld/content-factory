/**
 * PackageGenerationPanel.tsx — Sprint 7A-2
 *
 * Displays the Generation Studio state for a single Content Package.
 * Reads from GET /api/packages/{id}/generation.
 * Sprint 7A-2: Read-only + placeholder action buttons (no 9Router calls).
 */

import { useQuery } from '@tanstack/react-query';
import { getPackageGeneration } from '../../services/api';
import type { ContentPackage } from '../../types';
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
    });

    const noRecord = isError && (error as any)?.response?.status === 404;

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

                {/* Placeholder action buttons (Sprint 7A-2) */}
                <div className="pt-3 border-t border-border/60 flex gap-2 flex-wrap">
                    <button
                        disabled
                        title="9Router integration coming in Sprint 7A-3"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-violet-500/10 text-violet-400 opacity-50 cursor-not-allowed transition-colors"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        Generate Metadata
                    </button>
                    <button
                        disabled
                        title="9Router integration coming in Sprint 7A-3"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-violet-500/10 text-violet-400 opacity-50 cursor-not-allowed transition-colors"
                    >
                        <ImageIcon className="w-3.5 h-3.5" />
                        Generate Thumbnail
                    </button>
                </div>
            </div>
        </div>
    );
}
