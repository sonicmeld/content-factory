/**
 * PackageGenerationPanel.tsx — Sprint 7A-3
 *
 * Displays the Generation Studio state for a single Content Package.
 * Reads from GET /api/packages/{id}/generation.
 * Sprint 7A-3: Active metadata generation with 9Router integration and polling.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPackageGeneration, generateMetadata, getGlobalPromptContexts, getChannelPromptAssignments, generateThumbnail, getGenerationReadiness, assemblePackage, getMetadataLibrary, cloneLibraryItem } from '../services/api';
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
    PackageCheck,
    BookMarked,
} from 'lucide-react';
import GenerationReadinessPanel from './GenerationReadinessPanel';
import MetadataVariantList from './MetadataVariantList';
import AssetGrid from './AssetGrid';

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
    const [selectedMetadataContextId, setSelectedMetadataContextId] = useState<string>('');
    const [selectedThumbnailContextId, setSelectedThumbnailContextId] = useState<string>('');
    const [sourceMode, setSourceMode] = useState<'generate' | 'library'>('generate');
    const [selectedLibraryItemId, setSelectedLibraryItemId] = useState<string>('');

    const { data: assignments = [] } = useQuery({
        queryKey: ['channel-prompt-assignments', package_.channel_id],
        queryFn: () => getChannelPromptAssignments(package_.channel_id),
    });

    const { data: globalPrompts = [] } = useQuery({
        queryKey: ['global-prompt-contexts'],
        queryFn: () => getGlobalPromptContexts(),
    });

    // Compute assigned prompts with full context data
    const assignedPrompts = assignments
        .sort((a: any, b: any) => a.assignment_order - b.assignment_order)
        .map((a: any) => globalPrompts.find((p: any) => p.id === a.prompt_id))
        .filter(Boolean);

    const metadataPrompts = assignedPrompts.filter((p: any) => p.prompt_type === 'metadata');
    const thumbnailPrompts = assignedPrompts.filter((p: any) => p.prompt_type === 'thumbnail');

    const { data: libraryItems = [] } = useQuery({
        queryKey: ['metadata-library'],
        queryFn: () => getMetadataLibrary(),
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
        mutationFn: () => generateMetadata(package_.id, selectedMetadataContextId || undefined),
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

    const cloneLibraryMutation = useMutation({
        mutationFn: () => cloneLibraryItem(selectedLibraryItemId, package_.id),
        onSuccess: () => {
            toast.success('Cloned metadata from library');
            queryClient.invalidateQueries({ queryKey: ['metadata-variants', package_.id] });
        },
        onError: (err: any) => {
            const detail = err.response?.data?.error || err.response?.data?.detail || 'Failed to clone library item';
            toast.error(detail);
        }
    });

    const generateThumbnailMutation = useMutation({
        mutationFn: () => generateThumbnail(package_.id, selectedThumbnailContextId || undefined),
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

    // Sprint 7A-8: Assembly Readiness
    const hasVideo = !!package_.video_path;
    const hasMetadata = !!(gen?.title && gen?.description);
    const hasThumbnail = !!gen?.thumbnail_path;
    const isAssembleReady = hasVideo && hasMetadata && hasThumbnail;

    const assembleMutation = useMutation({
        mutationFn: () => assemblePackage(package_.id),
        onSuccess: () => {
            toast.success('Package assembled successfully');
            queryClient.invalidateQueries({ queryKey: ['package', package_.id] });
            queryClient.invalidateQueries({ queryKey: ['packages'] });
            queryClient.invalidateQueries({ queryKey: ['package-generation', package_.id] });
        },
        onError: (err: any) => {
            const detail = err.response?.data?.error || err.response?.data?.detail || 'Failed to assemble package';
            toast.error(detail);
        }
    });

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

                {/* Source Mode Toggle */}
                <div className="pt-3 border-t border-border/60">
                    <div className="flex gap-2 mb-4 p-1 bg-secondary/50 rounded-lg w-fit">
                        <button
                            onClick={() => setSourceMode('generate')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-2 ${sourceMode === 'generate' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            Generate New
                        </button>
                        <button
                            onClick={() => setSourceMode('library')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-2 ${sourceMode === 'library' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <BookMarked className="w-3.5 h-3.5" />
                            Use Library
                        </button>
                    </div>

                    {sourceMode === 'generate' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Metadata Context</label>
                                <select
                                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                                    value={selectedMetadataContextId}
                                    onChange={(e) => setSelectedMetadataContextId(e.target.value)}
                                    disabled={isMetadataProcessing || generateMetadataMutation.isPending}
                                >
                                    <option value="">Default (No Context)</option>
                                    {metadataPrompts.map((ctx: any) => (
                                        <option key={ctx.id} value={ctx.id}>
                                            {ctx.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Thumbnail Context</label>
                                <select
                                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                                    value={selectedThumbnailContextId}
                                    onChange={(e) => setSelectedThumbnailContextId(e.target.value)}
                                    disabled={isThumbnailProcessing || generateThumbnailMutation.isPending}
                                >
                                    <option value="">Default (No Context)</option>
                                    {thumbnailPrompts.map((ctx: any) => (
                                        <option key={ctx.id} value={ctx.id}>
                                            {ctx.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Select Library Item</label>
                            <select
                                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                                value={selectedLibraryItemId}
                                onChange={(e) => setSelectedLibraryItemId(e.target.value)}
                                disabled={cloneLibraryMutation.isPending}
                            >
                                <option value="">Select an item to clone...</option>
                                {libraryItems.filter(i => i.is_active).map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.title} {item.category ? `(${item.category})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Selected Context Preview (Metadata) */}
                {sourceMode === 'generate' && selectedMetadataContextId && (
                    <div className="mt-2 p-3 bg-secondary/30 rounded-md border border-border/50 space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary px-2 py-0.5 rounded">Metadata Context</span>
                        </div>
                        {globalPrompts.find((c: any) => c.id === selectedMetadataContextId)?.topic && (
                            <div>
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">Topic</span>
                                <p className="text-xs text-foreground font-medium">{globalPrompts.find((c: any) => c.id === selectedMetadataContextId)?.topic}</p>
                            </div>
                        )}
                        {globalPrompts.find((c: any) => c.id === selectedMetadataContextId)?.keywords && (
                            <div>
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">Keywords</span>
                                <p className="text-xs text-muted-foreground">{globalPrompts.find((c: any) => c.id === selectedMetadataContextId)?.keywords}</p>
                            </div>
                        )}
                        {globalPrompts.find((c: any) => c.id === selectedMetadataContextId)?.notes && (
                            <div>
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">Notes</span>
                                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{globalPrompts.find((c: any) => c.id === selectedMetadataContextId)?.notes}</p>
                            </div>
                        )}
                    </div>
                )}
                
                {/* Selected Context Preview (Thumbnail) */}
                {sourceMode === 'generate' && selectedThumbnailContextId && (
                    <div className="mt-2 p-3 bg-secondary/30 rounded-md border border-border/50 space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary px-2 py-0.5 rounded">Thumbnail Context</span>
                        </div>
                        {globalPrompts.find((c: any) => c.id === selectedThumbnailContextId)?.topic && (
                            <div>
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">Topic</span>
                                <p className="text-xs text-foreground font-medium">{globalPrompts.find((c: any) => c.id === selectedThumbnailContextId)?.topic}</p>
                            </div>
                        )}
                        {globalPrompts.find((c: any) => c.id === selectedThumbnailContextId)?.keywords && (
                            <div>
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">Keywords</span>
                                <p className="text-xs text-muted-foreground">{globalPrompts.find((c: any) => c.id === selectedThumbnailContextId)?.keywords}</p>
                            </div>
                        )}
                        {globalPrompts.find((c: any) => c.id === selectedThumbnailContextId)?.notes && (
                            <div>
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">Notes</span>
                                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{globalPrompts.find((c: any) => c.id === selectedThumbnailContextId)?.notes}</p>
                            </div>
                        )}
                    </div>
                )}
                
                {sourceMode === 'library' && selectedLibraryItemId && (
                    <div className="mt-2 p-3 bg-secondary/30 rounded-md border border-border/50 space-y-2">
                        <div>
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">Description</span>
                            <p className="text-xs text-muted-foreground line-clamp-3">{libraryItems.find(i => i.id === selectedLibraryItemId)?.description}</p>
                        </div>
                    </div>
                )}

                <div className="pt-3 border-t border-border/60">
                    <GenerationReadinessPanel channelId={package_.channel_id} />
                </div>
                
                <div className="pt-3 border-t border-border/60">
                    <MetadataVariantList packageId={package_.id} />
                </div>

                <div className="pt-3 border-t border-border/60">
                    <AssetGrid packageId={package_.id} />
                </div>

                {/* Placeholder action buttons */}
                <div className="pt-3 border-t border-border/60 flex gap-2 flex-wrap">
                    {sourceMode === 'generate' ? (
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
                    ) : (
                        <button
                            onClick={() => cloneLibraryMutation.mutate()}
                            disabled={cloneLibraryMutation.isPending || !selectedLibraryItemId}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 active:bg-violet-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {cloneLibraryMutation.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <BookMarked className="w-3.5 h-3.5" />
                            )}
                            Clone from Library
                        </button>
                    )}
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

                {/* Sprint 7A-8: Package Assembly Section */}
                <div className="pt-4 mt-2 border-t border-border/60">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-secondary/20 p-4 rounded-lg border border-border/40">
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                                <PackageCheck className="w-4 h-4 text-emerald-400" />
                                Package Assembly
                            </h4>
                            <div className="flex gap-4 text-xs">
                                <span className={hasVideo ? "text-emerald-400 flex items-center gap-1" : "text-red-400 flex items-center gap-1"}>
                                    {hasVideo ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                    Video
                                </span>
                                <span className={hasMetadata ? "text-emerald-400 flex items-center gap-1" : "text-red-400 flex items-center gap-1"}>
                                    {hasMetadata ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                    Metadata
                                </span>
                                <span className={hasThumbnail ? "text-emerald-400 flex items-center gap-1" : "text-red-400 flex items-center gap-1"}>
                                    {hasThumbnail ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                    Thumbnail
                                </span>
                            </div>
                        </div>
                        
                        <button
                            onClick={() => assembleMutation.mutate()}
                            disabled={!isAssembleReady || assembleMutation.isPending || package_.status === 'ready'}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm flex items-center gap-2 ${
                                package_.status === 'ready' 
                                ? 'bg-emerald-500/20 text-emerald-400 cursor-default'
                                : isAssembleReady
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white active:bg-emerald-700'
                                : 'bg-secondary/50 text-muted-foreground cursor-not-allowed'
                            }`}
                        >
                            {assembleMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : package_.status === 'ready' ? (
                                <CheckCircle2 className="w-4 h-4" />
                            ) : (
                                <PackageCheck className="w-4 h-4" />
                            )}
                            {package_.status === 'ready' ? 'Assembled' : 'Assemble Package'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
