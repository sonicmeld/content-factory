import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import {
    getInboxAssets,
    approveInboxAsset,
    rejectInboxAsset,
    archiveInboxAsset,
    getChannels
} from '../../services/api';
import type { AssetInbox } from '../../types';
import { toast } from 'sonner';
import {
    Inbox,
    CheckCircle2,
    XCircle,
    Archive,
    Loader2,
    ImageIcon,
    FileVideo,
    Calendar,
    Clock,
    Sparkles,
    Trash2
} from 'lucide-react';
import { format } from 'date-fns';

type StatusType = 'pending' | 'approved' | 'rejected' | 'archived';

export default function AssetInboxPage() {
    const { slug } = useParams();
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState<StatusType>('pending');

    const { data: channels = [] } = useQuery({
        queryKey: ['channels'],
        queryFn: getChannels
    });

    const currentChannel = channels.find(c => c.slug === slug);

    const { data: assets = [], isLoading, refetch } = useQuery({
        queryKey: ['inbox-assets', currentChannel?.id, statusFilter],
        queryFn: () => getInboxAssets(undefined, currentChannel?.id, statusFilter),
        enabled: !!currentChannel?.id,
        refetchInterval: statusFilter === 'pending' ? 5000 : false // auto poll pending assets
    });

    const approveMutation = useMutation({
        mutationFn: (id: string) => approveInboxAsset(id),
        onSuccess: () => {
            toast.success('Asset approved and imported to Channel Assets library');
            refetch();
            queryClient.invalidateQueries({ queryKey: ['assets', currentChannel?.id] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Failed to approve asset');
        }
    });

    const rejectMutation = useMutation({
        mutationFn: (id: string) => rejectInboxAsset(id),
        onSuccess: () => {
            toast.success('Asset rejected and deleted');
            refetch();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Failed to reject asset');
        }
    });

    const archiveMutation = useMutation({
        mutationFn: (id: string) => archiveInboxAsset(id),
        onSuccess: () => {
            toast.success('Asset archived');
            refetch();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Failed to archive asset');
        }
    });

    const getAssetPreviewUrl = (asset: AssetInbox) => {
        const filename = asset.file_path.split(/[/\\]/).pop();
        if (asset.status === 'approved') {
            return `/data/channels/${currentChannel?.slug}/${asset.asset_type}/${filename}`;
        }
        return `/data/inbox/${filename}`;
    };

    if (!currentChannel) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const tabs: { value: StatusType; label: string; icon: any; color: string }[] = [
        { value: 'pending', label: 'Pending Inbox', icon: Inbox, color: 'text-yellow-400 bg-yellow-500/10' },
        { value: 'approved', label: 'Approved', icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/10' },
        { value: 'rejected', label: 'Rejected', icon: XCircle, color: 'text-red-400 bg-red-500/10' },
        { value: 'archived', label: 'Archived', icon: Archive, color: 'text-muted-foreground bg-secondary' }
    ];

    const isActionPending = approveMutation.isPending || rejectMutation.isPending || archiveMutation.isPending;

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Project Asset Inbox</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Approve, reject, or archive assets imported from Google Flow or other external connector workflows.
                    </p>
                </div>
                {statusFilter === 'pending' && (
                    <div className="flex items-center gap-1.5 text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg w-fit">
                        <Clock className="w-3.5 h-3.5 animate-pulse" />
                        <span>Auto-refreshing queue...</span>
                    </div>
                )}
            </div>

            {/* Status Filter Tabs */}
            <div className="flex border-b border-border/60 gap-1 overflow-x-auto">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = statusFilter === tab.value;
                    return (
                        <button
                            key={tab.value}
                            onClick={() => setStatusFilter(tab.value)}
                            className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-all shrink-0 ${
                                isActive
                                    ? 'border-primary text-primary bg-primary/5'
                                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/20'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                </div>
            ) : assets.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-12 border border-dashed border-border rounded-xl bg-card/25 min-h-[300px]">
                    <div className="p-4 bg-muted/40 text-muted-foreground rounded-full mb-4">
                        <Inbox className="w-8 h-8" />
                    </div>
                    <h3 className="font-semibold text-lg text-foreground">No assets found</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                        {statusFilter === 'pending'
                            ? "No pending external assets awaiting approval. Launch Google Flow from a Package to generate and import thumbnails/footage."
                            : `No assets currently in '${statusFilter}' state.`}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                    {assets.map((asset) => {
                        const dateFormatted = format(new Date(asset.created_at), 'MMM d, yyyy h:mm a');
                        const isImage = asset.asset_type === 'thumbnail' || asset.file_path.match(/\.(jpg|jpeg|png|webp)$/i);
                        const isVideo = asset.asset_type === 'footage' || asset.file_path.match(/\.(mp4|mov|webm)$/i);

                        return (
                            <div
                                key={asset.id}
                                className="flex flex-col bg-card border border-border/70 rounded-xl overflow-hidden shadow-sm hover:border-border transition-all hover:translate-y-[-2px] duration-200"
                            >
                                {/* Media Preview Container */}
                                <div className="relative aspect-video bg-muted flex items-center justify-center border-b border-border/50 overflow-hidden">
                                    {asset.status === 'rejected' ? (
                                        <div className="text-center text-xs text-red-400 p-4">
                                            <Trash2 className="w-6 h-6 mx-auto mb-1 opacity-55" />
                                            File Deleted
                                        </div>
                                    ) : isImage ? (
                                        <img
                                            src={getAssetPreviewUrl(asset)}
                                            alt={asset.asset_type}
                                            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    ) : isVideo ? (
                                        <div className="flex flex-col items-center text-indigo-400">
                                            <FileVideo className="w-8 h-8" />
                                            <span className="text-[10px] mt-1 font-semibold">Video Footage</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center text-muted-foreground">
                                            <ImageIcon className="w-8 h-8" />
                                            <span className="text-[10px] mt-1 font-semibold">Asset File</span>
                                        </div>
                                    )}

                                    {/* Source Badge */}
                                    <span className="absolute top-2 left-2 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-background/85 border border-border shadow-sm text-foreground flex items-center gap-1">
                                        <Sparkles className="w-3 h-3 text-indigo-400" />
                                        {asset.source}
                                    </span>

                                    {/* Asset Type Badge */}
                                    <span className="absolute top-2 right-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500 text-white shadow-sm">
                                        {asset.asset_type}
                                    </span>
                                </div>

                                {/* Content Details */}
                                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Created</span>
                                        <div className="flex items-center gap-1.5 text-xs text-foreground/85">
                                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span>{dateFormatted}</span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground font-mono truncate mt-1">ID: {asset.id}</p>
                                    </div>

                                    {/* Actions */}
                                    {asset.status === 'pending' && (
                                        <div className="space-y-2 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => approveMutation.mutate(asset.id)}
                                                disabled={isActionPending}
                                                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white py-1.5 px-3 rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                                            >
                                                {approveMutation.isPending ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                )}
                                                Approve & Import
                                            </button>

                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => rejectMutation.mutate(asset.id)}
                                                    disabled={isActionPending}
                                                    className="flex items-center justify-center gap-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 active:bg-red-500/30 border border-red-500/20 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                                                >
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    Reject
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => archiveMutation.mutate(asset.id)}
                                                    disabled={isActionPending}
                                                    className="flex items-center justify-center gap-1 bg-secondary hover:bg-secondary/80 active:bg-secondary/70 border border-border py-1.5 px-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                                                >
                                                    <Archive className="w-3.5 h-3.5 text-muted-foreground" />
                                                    Archive
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {asset.status === 'approved' && (
                                        <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg w-full justify-center">
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span>Imported to Library</span>
                                        </div>
                                    )}

                                    {asset.status === 'rejected' && (
                                        <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1.5 rounded-lg w-full justify-center">
                                            <XCircle className="w-4 h-4" />
                                            <span>Asset Rejected</span>
                                        </div>
                                    )}

                                    {asset.status === 'archived' && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary border border-border px-2.5 py-1.5 rounded-lg w-full justify-center">
                                            <Archive className="w-4 h-4" />
                                            <span>Archived</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
