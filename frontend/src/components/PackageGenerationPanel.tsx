/**
 * PackageGenerationPanel.tsx
 *
 * Displays the Generation Studio state for a single Content Package.
 * Centralized production workspace connector settings integration.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getPackageGeneration,
    generateMetadata,
    getGlobalPromptContexts,
    getChannelPromptAssignments,
    generateThumbnail,
    getGenerationReadiness,
    assemblePackage,
    getMetadataLibrary,
    cloneLibraryItem,
    createConnectorJob,
    getProviders,
    getExternalAccounts,
    getConnectorJobs
} from '../services/api';
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
    Video,
    ExternalLink
} from 'lucide-react';
import GenerationReadinessPanel from './GenerationReadinessPanel';
import MetadataVariantList from './MetadataVariantList';
import AssetGrid from './AssetGrid';
import RuntimeTraceViewer from './RuntimeTraceViewer';

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
    const [sourceMode, setSourceMode] = useState<'generate' | 'library'>('generate');
    const [selectedLibraryItemId, setSelectedLibraryItemId] = useState<string>('');

    // Thumbnail Workbox selection state
    const [selectedThumbnailContextId, setSelectedThumbnailContextId] = useState<string>('');
    const [selectedThumbnailProvider, setSelectedThumbnailProvider] = useState<string>('NanoBanana');
    const [selectedThumbnailAccount, setSelectedThumbnailAccount] = useState<string>('');

    // Footage Workbox selection state
    const [selectedFootageContextId, setSelectedFootageContextId] = useState<string>('');
    const [selectedFootageProvider, setSelectedFootageProvider] = useState<string>('Google Flow');
    const [selectedFootageAccount, setSelectedFootageAccount] = useState<string>('');

    // Fetch connector providers
    const { data: providersList = [] } = useQuery({
        queryKey: ['connector-providers'],
        queryFn: () => getProviders()
    });

    // Fetch external accounts
    const { data: externalAccounts = [] } = useQuery({
        queryKey: ['external-accounts', channelSlug],
        queryFn: () => getExternalAccounts(channelSlug)
    });

    // Fetch all active/completed connector jobs for the workspace to render progress
    const { data: connectorJobs = [], refetch: refetchJobs } = useQuery({
        queryKey: ['connector-jobs', channelSlug],
        queryFn: () => getConnectorJobs(channelSlug),
        refetchInterval: 5000
    });

    const isConnectorProvider = (providerName: string) => {
        const found = providersList.find(p => p.name === providerName);
        return found?.type === 'connector';
    };

    const activeThumbnailJob = connectorJobs.find(
        j => j.asset_type === 'thumbnail' && (j.status === 'pending' || j.status === 'opened')
    );

    const activeFootageJob = connectorJobs.find(
        j => j.asset_type === 'footage' && (j.status === 'pending' || j.status === 'opened')
    );

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
    const footagePrompts = assignedPrompts.filter((p: any) => p.prompt_type === 'footage');

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

    const triggerConnectorJobMutation = useMutation({
        mutationFn: ({ provider, accountId, assetType, promptId }: { provider: string; accountId: string; assetType: string; promptId: string }) => {
            return createConnectorJob({
                workspace_id: channelSlug,
                provider,
                account_id: accountId || undefined,
                asset_type: assetType,
                prompt_id: promptId || undefined
            });
        },
        onSuccess: (data) => {
            toast.success(`Connector job registered for ${data.provider}`);
            const urlMap: Record<string, string> = {
                'Google Flow': 'https://flow.google.com',
                'Gemini': 'https://gemini.google.com',
                'ChatGPT': 'https://chatgpt.com',
            };
            const targetUrl = urlMap[data.provider] || 'https://flow.google.com';
            window.open(targetUrl, '_blank');
            refetchJobs();
        },
        onError: () => {
            toast.error('Failed to trigger connector job');
        }
    });

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

    // Assembly Readiness
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
        <div className="border border-border/60 rounded-2xl overflow-hidden shadow-sm bg-card">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-violet-500/5 border-b border-border/60">
                <div className="flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-violet-400" />
                    <span className="text-sm font-bold text-violet-300">Generation Studio</span>
                </div>
                {gen?.is_ready && (
                    <span className="text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/25">
                        Ready
                    </span>
                )}
            </div>

            <div className="p-5 space-y-6">
                {/* Status displays */}
                {isLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 font-medium">
                        <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                        Loading generation logs…
                    </div>
                )}

                {noRecord && (
                    <div className="text-sm text-muted-foreground py-2 flex items-center gap-2 bg-yellow-500/5 border border-yellow-500/10 p-3 rounded-xl">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        <span>No generations exist yet for this package. Start by routing contexts.</span>
                    </div>
                )}

                {gen && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-border/50 p-4 rounded-2xl bg-secondary/10">
                        {/* Track: Metadata */}
                        <div className="flex items-center justify-between p-2 border-r border-border/30 pr-4">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                                <FileText className="w-4.5 h-4.5 text-muted-foreground" />
                                <span className="text-foreground/90">Metadata Status</span>
                            </div>
                            <StatusBadge status={gen.metadata_status} />
                        </div>

                        {/* Track: Thumbnail */}
                        <div className="flex items-center justify-between p-2 pl-4">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                                <ImageIcon className="w-4.5 h-4.5 text-muted-foreground" />
                                <span className="text-foreground/90">Thumbnail Status</span>
                            </div>
                            <StatusBadge status={gen.thumbnail_status} />
                        </div>
                    </div>
                )}

                {/* Generated Content Preview */}
                {gen && gen.metadata_status === 'completed' && (gen.title || gen.description) && (
                    <div className="p-4 border border-border/80 rounded-2xl bg-secondary/20 space-y-3">
                        {gen.title && (
                            <div>
                                <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest block mb-1">Generated Title</span>
                                <p className="text-sm font-bold text-foreground">{gen.title}</p>
                            </div>
                        )}
                        {gen.description && (
                            <div>
                                <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest block mb-1">Generated Description</span>
                                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto pr-1">
                                    {gen.description}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Thumbnail Preview */}
                {gen && gen.thumbnail_status === 'completed' && gen.thumbnail_path && (
                    <div className="border border-border/80 rounded-2xl overflow-hidden bg-secondary/20 p-4">
                        <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest block mb-2">Generated Thumbnail</span>
                        <img
                            src={`/data/channels/${channelSlug}/assets/thumbnails/${gen.thumbnail_path.split('/').pop()}`}
                            alt="Generated Thumbnail"
                            className="rounded-xl w-full object-cover max-h-48 border border-border/60 hover:scale-[1.01] transition-transform duration-200"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                    </div>
                )}

                {/* Source Mode Toggle */}
                <div className="pt-2 border-t border-border/50">
                    <div className="flex gap-2 mb-6 p-1 bg-secondary/40 rounded-xl w-fit border border-border/40">
                        <button
                            onClick={() => setSourceMode('generate')}
                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                                sourceMode === 'generate'
                                    ? 'bg-background shadow-sm text-foreground border border-border/20'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            Studio Generators
                        </button>
                        <button
                            onClick={() => setSourceMode('library')}
                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                                sourceMode === 'library'
                                    ? 'bg-background shadow-sm text-foreground border border-border/20'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <BookMarked className="w-3.5 h-3.5 text-purple-400" />
                            Global Library
                        </button>
                    </div>

                    {sourceMode === 'generate' ? (
                        <div className="space-y-6">
                            {/* METADATA GENERATOR WORKBOX */}
                            <div className="p-4 border border-border/60 rounded-2xl bg-secondary/5 space-y-4">
                                <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                                    <FileText className="w-4 h-4 text-violet-400" />
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-violet-300">Metadata Workbox</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Metadata Context</label>
                                        <select
                                            className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
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
                                    <div className="flex items-end">
                                        <button
                                            onClick={() => generateMetadataMutation.mutate()}
                                            disabled={generateMetadataMutation.isPending || isMetadataProcessing || readiness?.metadata_ready === false}
                                            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white py-2 px-4 rounded-xl text-xs font-bold disabled:opacity-50 transition-colors shadow-sm"
                                        >
                                            {generateMetadataMutation.isPending || isMetadataProcessing ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Sparkles className="w-3.5 h-3.5" />
                                            )}
                                            Generate Metadata
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* THUMBNAIL WORKBOX */}
                            <div className="p-4 border border-border/60 rounded-2xl bg-secondary/5 space-y-4">
                                <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                                    <ImageIcon className="w-4 h-4 text-indigo-400" />
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300">Thumbnail Workbox</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Thumbnail Context</label>
                                        <select
                                            className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
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
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Provider</label>
                                        <select
                                            className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                                            value={selectedThumbnailProvider}
                                            onChange={(e) => {
                                                setSelectedThumbnailProvider(e.target.value);
                                                setSelectedThumbnailAccount('');
                                            }}
                                        >
                                            {providersList.map((p) => (
                                                <option key={p.name} value={p.name}>
                                                    {p.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Linked Account</label>
                                        <select
                                            className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none disabled:opacity-40"
                                            value={selectedThumbnailAccount}
                                            onChange={(e) => setSelectedThumbnailAccount(e.target.value)}
                                            disabled={!isConnectorProvider(selectedThumbnailProvider)}
                                        >
                                            <option value="">Global/Workspace Account</option>
                                            {externalAccounts
                                                .filter(a => a.provider === selectedThumbnailProvider && a.is_active === 1)
                                                .map((a) => (
                                                    <option key={a.id} value={a.id}>
                                                        {a.account_name}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between gap-4 pt-1.5">
                                    <div className="text-xs text-muted-foreground font-medium">
                                        {activeThumbnailJob ? (
                                            <span className="flex items-center gap-1.5 text-indigo-400 font-semibold animate-pulse">
                                                <Clock className="w-3.5 h-3.5 animate-spin" />
                                                Connector Job pending: {activeThumbnailJob.status} ({activeThumbnailJob.provider})
                                            </span>
                                        ) : (
                                            <span>No active job connector queued.</span>
                                        )}
                                    </div>
                                    <div>
                                        {isConnectorProvider(selectedThumbnailProvider) ? (
                                            <button
                                                type="button"
                                                onClick={() => triggerConnectorJobMutation.mutate({
                                                    provider: selectedThumbnailProvider,
                                                    accountId: selectedThumbnailAccount,
                                                    assetType: 'thumbnail',
                                                    promptId: selectedThumbnailContextId
                                                })}
                                                disabled={triggerConnectorJobMutation.isPending}
                                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white py-2 px-4 rounded-xl text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
                                            >
                                                {triggerConnectorJobMutation.isPending ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                )}
                                                Open in {selectedThumbnailProvider}
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => generateThumbnailMutation.mutate()}
                                                disabled={generateThumbnailMutation.isPending || isThumbnailProcessing || readiness?.thumbnail_ready === false}
                                                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white py-2 px-4 rounded-xl text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
                                            >
                                                {generateThumbnailMutation.isPending || isThumbnailProcessing ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <Sparkles className="w-3.5 h-3.5" />
                                                )}
                                                Generate Thumbnail
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* FOOTAGE WORKBOX */}
                            <div className="p-4 border border-border/60 rounded-2xl bg-secondary/5 space-y-4">
                                <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                                    <Video className="w-4 h-4 text-pink-400" />
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-pink-300">Footage Workbox</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Footage Context</label>
                                        <select
                                            className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                                            value={selectedFootageContextId}
                                            onChange={(e) => setSelectedFootageContextId(e.target.value)}
                                        >
                                            <option value="">Default (No Context)</option>
                                            {footagePrompts.map((ctx: any) => (
                                                <option key={ctx.id} value={ctx.id}>
                                                    {ctx.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Provider</label>
                                        <select
                                            className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                                            value={selectedFootageProvider}
                                            onChange={(e) => {
                                                setSelectedFootageProvider(e.target.value);
                                                setSelectedFootageAccount('');
                                            }}
                                        >
                                            {providersList.map((p) => (
                                                <option key={p.name} value={p.name}>
                                                    {p.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Linked Account</label>
                                        <select
                                            className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none disabled:opacity-40"
                                            value={selectedFootageAccount}
                                            onChange={(e) => setSelectedFootageAccount(e.target.value)}
                                            disabled={!isConnectorProvider(selectedFootageProvider)}
                                        >
                                            <option value="">Global/Workspace Account</option>
                                            {externalAccounts
                                                .filter(a => a.provider === selectedFootageProvider && a.is_active === 1)
                                                .map((a) => (
                                                    <option key={a.id} value={a.id}>
                                                        {a.account_name}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between gap-4 pt-1.5">
                                    <div className="text-xs text-muted-foreground font-medium">
                                        {activeFootageJob ? (
                                            <span className="flex items-center gap-1.5 text-indigo-400 font-semibold animate-pulse">
                                                <Clock className="w-3.5 h-3.5 animate-spin" />
                                                Connector Job pending: {activeFootageJob.status} ({activeFootageJob.provider})
                                            </span>
                                        ) : (
                                            <span>No active job connector queued.</span>
                                        )}
                                    </div>
                                    <div>
                                        {isConnectorProvider(selectedFootageProvider) ? (
                                            <button
                                                type="button"
                                                onClick={() => triggerConnectorJobMutation.mutate({
                                                    provider: selectedFootageProvider,
                                                    accountId: selectedFootageAccount,
                                                    assetType: 'footage',
                                                    promptId: selectedFootageContextId
                                                })}
                                                disabled={triggerConnectorJobMutation.isPending}
                                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white py-2 px-4 rounded-xl text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
                                            >
                                                {triggerConnectorJobMutation.isPending ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                )}
                                                Open in {selectedFootageProvider}
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                disabled
                                                title="API footage generation is not implemented yet"
                                                className="flex items-center gap-2 bg-secondary text-muted-foreground py-2 px-4 rounded-xl text-xs font-bold border border-border cursor-not-allowed"
                                            >
                                                <Sparkles className="w-3.5 h-3.5" />
                                                Generate Footage
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Select Library Item</label>
                                <select
                                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
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

                            {selectedLibraryItemId && (
                                <div className="p-3 bg-secondary/30 rounded-xl border border-border/50">
                                    <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest block mb-1">Description</span>
                                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                                        {libraryItems.find(i => i.id === selectedLibraryItemId)?.description}
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={() => cloneLibraryMutation.mutate()}
                                disabled={cloneLibraryMutation.isPending || !selectedLibraryItemId}
                                className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-colors shadow-sm"
                            >
                                {cloneLibraryMutation.isPending ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <BookMarked className="w-3.5 h-3.5" />
                                )}
                                Clone from Library
                            </button>
                        </div>
                    )}
                </div>

                <div className="pt-2 border-t border-border/50">
                    <GenerationReadinessPanel channelId={package_.channel_id} />
                </div>
                
                <div className="pt-2 border-t border-border/50">
                    <MetadataVariantList packageId={package_.id} />
                </div>

                <div className="pt-2 border-t border-border/50">
                    <AssetGrid packageId={package_.id} />
                </div>

                <div className="pt-2 border-t border-border/50">
                    <RuntimeTraceViewer packageId={package_.id} />
                </div>

                {/* Package Assembly Section */}
                <div className="pt-4 mt-2 border-t border-border/60">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-secondary/20 p-4 rounded-2xl border border-border/40">
                        <div className="space-y-2">
                            <h4 className="text-sm font-bold flex items-center gap-2 text-foreground/90">
                                <PackageCheck className="w-4.5 h-4.5 text-emerald-400" />
                                Package Assembly
                            </h4>
                            <div className="flex gap-4 text-xs font-medium">
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
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-2 ${
                                package_.status === 'ready' 
                                ? 'bg-emerald-500/20 text-emerald-400 cursor-default border border-emerald-500/30'
                                : isAssembleReady
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white active:bg-emerald-700'
                                : 'bg-secondary/50 text-muted-foreground cursor-not-allowed border border-border/50'
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
