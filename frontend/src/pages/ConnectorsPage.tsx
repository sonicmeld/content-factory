import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
    Cpu,
    Inbox,
    Layers,
    History,
    Loader2,
    CheckCircle2,
    XCircle,
    Archive,
    Sparkles,
    Clock,
    Plus,
    Trash2,
    ImageIcon,
    FileVideo,
    Calendar,
    Settings,
    Globe,
    Plug,
    Eye,
    MoreVertical,
    RotateCcw,
    ShieldAlert
} from 'lucide-react';
import {
    getInboxAssets,
    approveInboxAsset,
    rejectInboxAsset,
    archiveInboxAsset,
    getChannels,
    getExternalAccounts,
    createExternalAccount,
    updateExternalAccount,
    deleteExternalAccount,
    getConnectorJobs,
    clearConnectorJobs,
    deleteConnectorJob,
    getProviders,
    getCompanionRuntimes,
    revokeCompanionRuntime,
    deleteInboxAsset,
    restoreInboxAsset,
    purgeInboxAsset,
    purgeImportedInboxAssets,
    bulkArchiveInboxAssets,
    bulkDeleteInboxAssets
} from '../services/api';
import type { AssetInbox } from '../types';

type TabType = 'inbox' | 'accounts' | 'jobs' | 'providers' | 'runtimes';

export default function ConnectorsPage() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<TabType>('inbox');
    const [inboxFilter, setInboxFilter] = useState<'pending' | 'approved' | 'rejected' | 'archived' | 'deleted'>('pending');
    const [selectedWorkspace, setSelectedWorkspace] = useState<string>('all');

    const [selectedInboxIds, setSelectedInboxIds] = useState<string[]>([]);
    const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
    const [viewingAsset, setViewingAsset] = useState<AssetInbox | null>(null);
    const [purgingAsset, setPurgingAsset] = useState<AssetInbox | null>(null);
    const [showPurgeImportedModal, setShowPurgeImportedModal] = useState<boolean>(false);

    // For Approve Destination Modal
    const [selectedAsset, setSelectedAsset] = useState<AssetInbox | null>(null);
    const [targetChannelId, setTargetChannelId] = useState<string | 'shared'>('shared');

    // Form states for adding account
    const [selectedProviders, setSelectedProviders] = useState<string[]>(['Google Flow']);
    const [accountName, setAccountName] = useState('');
    const [profileName, setProfileName] = useState('');
    const [targetWorkspaceId, setTargetWorkspaceId] = useState<string>('default');

    // Query active sub-channels for workspace routing
    const { data: channels = [] } = useQuery({
        queryKey: ['channels'],
        queryFn: getChannels
    });

    const queryWorkspace = selectedWorkspace === 'all' ? undefined : selectedWorkspace;

    // Query inbox assets
    const { data: inboxAssets = [], isLoading: loadingInbox, refetch: refetchInbox } = useQuery({
        queryKey: ['inbox-assets', queryWorkspace, inboxFilter],
        queryFn: () => getInboxAssets(queryWorkspace, inboxFilter),
        refetchInterval: inboxFilter === 'pending' && activeTab === 'inbox' ? 5000 : false
    });

    // Query external accounts
    const { data: externalAccounts = [], refetch: refetchAccounts } = useQuery({
        queryKey: ['external-accounts', queryWorkspace],
        queryFn: () => getExternalAccounts(queryWorkspace),
    });

    // Query connector jobs log
    const { data: jobsLog = [], isLoading: loadingJobs, refetch: refetchJobs } = useQuery({
        queryKey: ['connector-jobs', queryWorkspace],
        queryFn: () => getConnectorJobs(queryWorkspace),
        refetchInterval: activeTab === 'jobs' ? 10000 : false
    });

    // Query providers list
    const { data: providersList = [] } = useQuery({
        queryKey: ['connector-providers'],
        queryFn: getProviders
    });

    // Query companion runtimes
    const { data: companionRuntimes = [], refetch: refetchRuntimes } = useQuery({
        queryKey: ['companion-runtimes'],
        queryFn: getCompanionRuntimes,
        refetchInterval: activeTab === 'runtimes' ? 5000 : false
    });

    // Revoke companion runtime mutation
    const revokeRuntimeMutation = useMutation({
        mutationFn: (id: string) => revokeCompanionRuntime(id),
        onSuccess: () => {
            toast.success('Companion runtime revoked successfully');
            refetchRuntimes();
        },
        onError: () => {
            toast.error('Failed to revoke companion runtime');
        }
    });

    // Mutations
    const approveMutation = useMutation({
        mutationFn: ({ id, channelId }: { id: string; channelId: string | null }) =>
            approveInboxAsset(id, channelId),
        onSuccess: () => {
            toast.success('Asset approved and imported successfully');
            setSelectedAsset(null);
            refetchInbox();
            queryClient.invalidateQueries({ queryKey: ['assets'] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.detail || 'Failed to approve asset');
        }
    });

    const rejectMutation = useMutation({
        mutationFn: (id: string) => rejectInboxAsset(id),
        onSuccess: () => {
            toast.success('Asset rejected');
            refetchInbox();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.detail || 'Failed to reject asset');
        }
    });

    const archiveMutation = useMutation({
        mutationFn: (id: string) => archiveInboxAsset(id),
        onSuccess: () => {
            toast.success('Asset archived');
            refetchInbox();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.detail || 'Failed to archive asset');
        }
    });

    const addAccountMutation = useMutation({
        mutationFn: async () => {
            if (selectedProviders.length === 0) {
                throw new Error("At least one provider must be selected");
            }
            const promises = selectedProviders.map(prov => 
                createExternalAccount({
                    workspace_id: targetWorkspaceId,
                    provider: prov,
                    account_name: accountName,
                    profile_name: profileName || undefined
                })
            );
            return Promise.all(promises);
        },
        onSuccess: () => {
            toast.success('External account(s) added successfully');
            setAccountName('');
            setProfileName('');
            setSelectedProviders(['Google Flow']);
            refetchAccounts();
        },
        onError: (err: any) => toast.error(err.message || 'Failed to add external account(s)')
    });

    const toggleAccountMutation = useMutation({
        mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
            updateExternalAccount(id, { is_active: isActive ? 1 : 0 }),
        onSuccess: () => {
            toast.success('Account status updated');
            refetchAccounts();
        },
        onError: () => toast.error('Failed to update account status')
    });

    const deleteAccountMutation = useMutation({
        mutationFn: (id: string) => deleteExternalAccount(id),
        onSuccess: () => {
            toast.success('External account deleted');
            refetchAccounts();
        },
        onError: () => toast.error('Failed to delete external account')
    });

    const deleteJobMutation = useMutation({
        mutationFn: (id: string) => deleteConnectorJob(id),
        onSuccess: () => {
            toast.success('Connector job deleted successfully');
            refetchJobs();
        },
        onError: () => toast.error('Failed to delete connector job')
    });

    const clearJobsMutation = useMutation({
        mutationFn: ({ status }: { status?: string }) => clearConnectorJobs(queryWorkspace, status),
        onSuccess: (data) => {
            toast.success(`Cleared ${data.deleted_count} job(s) from log`);
            refetchJobs();
        },
        onError: () => toast.error('Failed to clear connector jobs')
    });

    const deleteInboxAssetMutation = useMutation({
        mutationFn: (id: string) => deleteInboxAsset(id),
        onSuccess: (_, id) => {
            toast.success('Asset soft-deleted');
            setSelectedInboxIds(prev => prev.filter(sid => sid !== id));
            refetchInbox();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.detail || 'Failed to delete asset');
        }
    });

    const restoreInboxAssetMutation = useMutation({
        mutationFn: (id: string) => restoreInboxAsset(id),
        onSuccess: () => {
            toast.success('Asset restored');
            refetchInbox();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.detail || 'Failed to restore asset');
        }
    });

    const purgeInboxAssetMutation = useMutation({
        mutationFn: (id: string) => purgeInboxAsset(id),
        onSuccess: (_, id) => {
            toast.success('Asset permanently purged');
            setSelectedInboxIds(prev => prev.filter(sid => sid !== id));
            refetchInbox();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.detail || 'Failed to purge asset');
        }
    });

    const purgeImportedInboxAssetsMutation = useMutation({
        mutationFn: () => purgeImportedInboxAssets(),
        onSuccess: (data: any) => {
            toast.success(data.message || 'Imported assets purged successfully');
            refetchInbox();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.detail || 'Failed to purge imported assets');
        }
    });

    const bulkArchiveInboxAssetsMutation = useMutation({
        mutationFn: (ids: string[]) => bulkArchiveInboxAssets(ids),
        onSuccess: () => {
            toast.success('Selected assets archived');
            setSelectedInboxIds([]);
            refetchInbox();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.detail || 'Failed to archive selected assets');
        }
    });

    const bulkDeleteInboxAssetsMutation = useMutation({
        mutationFn: (ids: string[]) => bulkDeleteInboxAssets(ids),
        onSuccess: () => {
            toast.success('Selected assets soft-deleted');
            setSelectedInboxIds([]);
            refetchInbox();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.detail || 'Failed to delete selected assets');
        }
    });

    useEffect(() => {
        const handleOutsideClick = () => {
            setActiveDropdownId(null);
        };
        window.addEventListener('click', handleOutsideClick);
        return () => window.removeEventListener('click', handleOutsideClick);
    }, []);

    // Helper to extract preview URL
    const getAssetPreviewUrl = (asset: AssetInbox) => {
        const filename = asset.file_path.split(/[/\\]/).pop();
        if (asset.status === 'approved') {
            // Check if file is shared or channel asset
            if (asset.file_path.includes('/shared/')) {
                return `/data/shared/${asset.asset_type}/${filename}`;
            }
            // Fallback lookup or resolve channel slug
            return `/data/inbox/${filename}`; 
        }
        return `/data/inbox/${filename}`;
    };

    const handleApproveClick = (asset: AssetInbox) => {
        setSelectedAsset(asset);
        setTargetChannelId('shared');
    };

    const handleApproveConfirm = () => {
        if (!selectedAsset) return;
        const channelId = targetChannelId === 'shared' ? null : targetChannelId;
        approveMutation.mutate({ id: selectedAsset.id, channelId });
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-2">
                        <Plug className="w-8 h-8 text-indigo-400" />
                        Connector Hub
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Manage external integrations, provider registry, external accounts, and connector jobs at the platform level.
                    </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-secondary/50 border border-border px-3 py-1.5 rounded-xl">
                        <span className="text-xs text-muted-foreground font-semibold">Workspace Filter:</span>
                        <select
                            value={selectedWorkspace}
                            onChange={e => {
                                setSelectedWorkspace(e.target.value);
                                // Also update target workspace for adding connections to match the filter if not 'all'
                                if (e.target.value !== 'all') {
                                    setTargetWorkspaceId(e.target.value);
                                } else {
                                    setTargetWorkspaceId('default');
                                }
                            }}
                            className="bg-transparent text-sm font-semibold focus:outline-none cursor-pointer text-foreground"
                        >
                            <option value="all">All Workspaces</option>
                            <option value="default">Default Workspace</option>
                            {channels.map((chan) => (
                                <option key={chan.id} value={chan.slug}>
                                    {chan.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {inboxFilter === 'pending' && activeTab === 'inbox' && (
                        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-2 rounded-xl w-fit">
                            <Clock className="w-4 h-4 animate-spin-slow" />
                            <span>Polling pending inbox...</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-border/60 gap-2 overflow-x-auto pb-px">
                <button
                    onClick={() => setActiveTab('inbox')}
                    className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-sm font-semibold transition-all shrink-0 ${
                        activeTab === 'inbox'
                            ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/20'
                    }`}
                >
                    <Inbox className="w-4.5 h-4.5" />
                    <span>Asset Inbox</span>
                </button>
                <button
                    onClick={() => setActiveTab('accounts')}
                    className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-sm font-semibold transition-all shrink-0 ${
                        activeTab === 'accounts'
                            ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/20'
                    }`}
                >
                    <Settings className="w-4.5 h-4.5" />
                    <span>External Accounts</span>
                </button>
                <button
                    onClick={() => setActiveTab('jobs')}
                    className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-sm font-semibold transition-all shrink-0 ${
                        activeTab === 'jobs'
                            ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/20'
                    }`}
                >
                    <History className="w-4.5 h-4.5" />
                    <span>Connector Jobs Log</span>
                </button>
                <button
                    onClick={() => setActiveTab('providers')}
                    className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-sm font-semibold transition-all shrink-0 ${
                        activeTab === 'providers'
                            ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/20'
                    }`}
                >
                    <Layers className="w-4.5 h-4.5" />
                    <span>Providers Registry</span>
                </button>
                <button
                    onClick={() => setActiveTab('runtimes')}
                    className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-sm font-semibold transition-all shrink-0 ${
                        activeTab === 'runtimes'
                            ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/20'
                    }`}
                >
                    <Cpu className="w-4.5 h-4.5" />
                    <span>Companion Runtimes</span>
                </button>
            </div>

            {/* TAB CONTENT: ASSET INBOX */}
            {activeTab === 'inbox' && (
                <div className="space-y-6">
                    {/* Inbox sub-tabs & Bulk Actions Toolbar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-muted/10 p-3 rounded-2xl border border-border/50">
                        <div className="flex bg-muted/40 p-1 rounded-xl w-fit border border-border/40 gap-1 shrink-0">
                            {(['pending', 'approved', 'rejected', 'archived', 'deleted'] as const).map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => {
                                        setInboxFilter(filter);
                                        setSelectedInboxIds([]); // Clear selection when filter changes
                                    }}
                                    className={`text-xs font-semibold px-4 py-2 rounded-lg transition-all capitalize ${
                                        inboxFilter === filter
                                            ? 'bg-card text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {inboxAssets.length > 0 && (
                                <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50 border border-border text-xs font-semibold cursor-pointer select-none hover:bg-secondary transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={inboxAssets.length > 0 && selectedInboxIds.length === inboxAssets.length}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedInboxIds(inboxAssets.map(a => a.id));
                                            } else {
                                                setSelectedInboxIds([]);
                                            }
                                        }}
                                        className="w-4 h-4 rounded border-border text-indigo-600 focus:ring-indigo-500 bg-background"
                                    />
                                    <span>Select All ({selectedInboxIds.length}/{inboxAssets.length})</span>
                                </label>
                            )}

                            {selectedInboxIds.length > 0 && inboxFilter !== 'archived' && inboxFilter !== 'deleted' && (
                                <button
                                    onClick={() => bulkArchiveInboxAssetsMutation.mutate(selectedInboxIds)}
                                    disabled={bulkArchiveInboxAssetsMutation.isPending}
                                    className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 px-3.5 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                                >
                                    <Archive className="w-4 h-4" />
                                    Archive Selected
                                </button>
                            )}

                            {selectedInboxIds.length > 0 && inboxFilter !== 'deleted' && (
                                <button
                                    onClick={() => bulkDeleteInboxAssetsMutation.mutate(selectedInboxIds)}
                                    disabled={bulkDeleteInboxAssetsMutation.isPending}
                                    className="flex items-center gap-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 px-3.5 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete Selected
                                </button>
                            )}

                            <button
                                onClick={() => setShowPurgeImportedModal(true)}
                                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                            >
                                <Trash2 className="w-4 h-4" />
                                Purge Imported
                            </button>
                        </div>
                    </div>

                    {loadingInbox ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                        </div>
                    ) : inboxAssets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center p-16 border border-dashed border-border rounded-2xl bg-card/10 min-h-[300px]">
                            <Inbox className="w-12 h-12 text-muted-foreground/60 mb-4" />
                            <h3 className="font-bold text-lg text-foreground">No assets in queue</h3>
                            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                                {inboxFilter === 'pending'
                                    ? "Launch an external connector job from any workbox to generate assets and import them here."
                                    : `No assets found in the '${inboxFilter}' queue.`}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                            {inboxAssets.map((asset) => {
                                const isImage = asset.asset_type === 'thumbnail' || asset.file_path.match(/\.(jpg|jpeg|png|webp)$/i);
                                const isVideo = asset.asset_type === 'footage' || asset.file_path.match(/\.(mp4|mov|webm)$/i);
                                const dateFormatted = format(new Date(asset.created_at), 'MMM d, yyyy h:mm a');

                                return (
                                    <div
                                        key={asset.id}
                                        className="flex flex-col bg-card border border-border/70 rounded-2xl overflow-hidden shadow-sm hover:border-border/100 hover:shadow-md transition-all hover:translate-y-[-2px] duration-200"
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
                                                        (e.target as HTMLImageElement).src = '/logo.png'; 
                                                    }}
                                                />
                                            ) : isVideo ? (
                                                <div className="flex flex-col items-center text-purple-400">
                                                    <FileVideo className="w-8 h-8" />
                                                    <span className="text-[10px] mt-1.5 font-bold uppercase tracking-wider">Footage Video</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center text-muted-foreground">
                                                    <ImageIcon className="w-8 h-8" />
                                                    <span className="text-[10px] mt-1.5 font-bold uppercase tracking-wider">Asset File</span>
                                                </div>
                                            )}

                                            {/* Selection Checkbox */}
                                            <div className="absolute top-2.5 left-2.5 z-10" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedInboxIds.includes(asset.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedInboxIds([...selectedInboxIds, asset.id]);
                                                        } else {
                                                            setSelectedInboxIds(selectedInboxIds.filter(id => id !== asset.id));
                                                        }
                                                    }}
                                                    className="w-4 h-4 rounded border-border text-indigo-600 focus:ring-indigo-500 bg-background/90 cursor-pointer shadow-sm"
                                                />
                                            </div>

                                            {/* Source Badge */}
                                            <span className="absolute top-2.5 left-9 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-background/90 border border-border shadow-sm text-foreground flex items-center gap-1">
                                                <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
                                                {asset.source}
                                            </span>

                                            {/* Asset Type Badge */}
                                            <span className="absolute top-2.5 right-2.5 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded bg-indigo-600 text-white shadow-sm">
                                                {asset.asset_type}
                                            </span>
                                        </div>

                                        {/* Details */}
                                        <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                                            <div className="space-y-2.5 relative">
                                                {/* Dropdown Menu Trigger */}
                                                <div className="absolute top-0 right-0 z-20">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveDropdownId(activeDropdownId === asset.id ? null : asset.id);
                                                        }}
                                                        className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                                                    >
                                                        <MoreVertical className="w-4.5 h-4.5" />
                                                    </button>
                                                    {activeDropdownId === asset.id && (
                                                        <div className="absolute right-0 mt-1 w-36 bg-popover border border-border rounded-xl shadow-lg z-30 py-1.5 text-xs font-semibold animate-in fade-in slide-in-from-top-1 duration-100">
                                                            {inboxFilter === 'deleted' ? (
                                                                <>
                                                                    <button
                                                                        onClick={() => {
                                                                            restoreInboxAssetMutation.mutate(asset.id);
                                                                            setActiveDropdownId(null);
                                                                        }}
                                                                        className="w-full text-left px-3.5 py-2 hover:bg-secondary text-foreground flex items-center gap-2"
                                                                    >
                                                                        <RotateCcw className="w-4 h-4 text-emerald-400" />
                                                                        Restore
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setPurgingAsset(asset);
                                                                            setActiveDropdownId(null);
                                                                        }}
                                                                        className="w-full text-left px-3.5 py-2 hover:bg-secondary text-red-400 hover:text-red-300 flex items-center gap-2"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                        Purge
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button
                                                                        onClick={() => {
                                                                            setViewingAsset(asset);
                                                                            setActiveDropdownId(null);
                                                                        }}
                                                                        className="w-full text-left px-3.5 py-2 hover:bg-secondary text-foreground flex items-center gap-2"
                                                                    >
                                                                        <Eye className="w-4 h-4 text-indigo-400" />
                                                                        View
                                                                    </button>
                                                                    {asset.status === 'pending' && (
                                                                        <button
                                                                            onClick={() => {
                                                                                handleApproveClick(asset);
                                                                                setActiveDropdownId(null);
                                                                            }}
                                                                            className="w-full text-left px-3.5 py-2 hover:bg-secondary text-foreground flex items-center gap-2"
                                                                        >
                                                                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                                            Import
                                                                        </button>
                                                                    )}
                                                                    {asset.status !== 'archived' && (
                                                                        <button
                                                                            onClick={() => {
                                                                                archiveInboxAssetMutation.mutate(asset.id);
                                                                                setActiveDropdownId(null);
                                                                            }}
                                                                            className="w-full text-left px-3.5 py-2 hover:bg-secondary text-foreground flex items-center gap-2"
                                                                        >
                                                                            <Archive className="w-4 h-4 text-amber-400" />
                                                                            Archive
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={() => {
                                                                            deleteInboxAssetMutation.mutate(asset.id);
                                                                            setActiveDropdownId(null);
                                                                        }}
                                                                        className="w-full text-left px-3.5 py-2 hover:bg-secondary text-red-400 hover:text-red-300 flex items-center gap-2"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                        Delete
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <div>
                                                    <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest block">Created At</span>
                                                    <div className="flex items-center gap-1.5 text-xs text-foreground/90 font-medium">
                                                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                                        <span>{dateFormatted}</span>
                                                    </div>
                                                </div>
                                                {asset.workspace_id && (
                                                    <div>
                                                        <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest block">Workspace (Slug)</span>
                                                        <span className="text-xs bg-secondary px-2 py-0.5 rounded text-foreground font-semibold">
                                                            /{asset.workspace_id}
                                                        </span>
                                                    </div>
                                                )}
                                                {asset.metadata && (
                                                    <div>
                                                        <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest block">Metadata</span>
                                                        <p className="text-[11px] font-mono bg-secondary/40 px-2 py-1 rounded border border-border/50 text-foreground/80 break-all max-h-16 overflow-y-auto">
                                                            {asset.metadata}
                                                        </p>
                                                    </div>
                                                )}
                                                <p className="text-[9px] text-muted-foreground font-mono truncate">ID: {asset.id}</p>
                                            </div>

                                            {/* Action triggers */}
                                            {inboxFilter === 'deleted' ? (
                                                <div className="grid grid-cols-2 gap-2 pt-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => restoreInboxAssetMutation.mutate(asset.id)}
                                                        disabled={restoreInboxAssetMutation.isPending}
                                                        className="flex items-center justify-center gap-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 py-2 px-2.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                                                    >
                                                        <RotateCcw className="w-4 h-4" />
                                                        Restore
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setPurgingAsset(asset)}
                                                        disabled={purgeInboxAssetMutation.isPending}
                                                        className="flex items-center justify-center gap-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 py-2 px-2.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Purge
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    {asset.status === 'pending' && (
                                                        <div className="space-y-2 pt-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleApproveClick(asset)}
                                                                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white py-2 px-3 rounded-xl text-xs font-bold shadow-sm transition-colors"
                                                            >
                                                                <CheckCircle2 className="w-4 h-4" />
                                                                Approve & Route
                                                            </button>

                                                            <div className="grid grid-cols-2 gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => rejectMutation.mutate(asset.id)}
                                                                    className="flex items-center justify-center gap-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 py-2 px-2.5 rounded-xl text-xs font-semibold transition-colors"
                                                                >
                                                                    <XCircle className="w-4.5 h-4.5" />
                                                                    Reject
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => archiveMutation.mutate(asset.id)}
                                                                    className="flex items-center justify-center gap-1.5 bg-secondary hover:bg-secondary/80 border border-border py-2 px-2.5 rounded-xl text-xs font-semibold transition-colors"
                                                                >
                                                                    <Archive className="w-4.5 h-4.5 text-muted-foreground" />
                                                                    Archive
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {asset.status === 'approved' && (
                                                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-3 py-2 rounded-xl w-full justify-center">
                                                            <CheckCircle2 className="w-4.5 h-4.5" />
                                                            <span>Imported & Routed</span>
                                                        </div>
                                                    )}

                                                    {asset.status === 'rejected' && (
                                                        <div className="flex items-center gap-2 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/25 px-3 py-2 rounded-xl w-full justify-center">
                                                            <XCircle className="w-4.5 h-4.5" />
                                                            <span>Rejected / Deleted</span>
                                                        </div>
                                                    )}

                                                    {asset.status === 'archived' && (
                                                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground bg-secondary border border-border px-3 py-2 rounded-xl w-full justify-center">
                                                            <Archive className="w-4.5 h-4.5" />
                                                            <span>Archived</span>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: EXTERNAL ACCOUNTS */}
            {activeTab === 'accounts' && (
                <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-border bg-secondary/30 flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-indigo-500" />
                        <h3 className="font-bold text-lg">Central Connector Connections</h3>
                    </div>
                    <div className="p-6 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Add Account */}
                            <div className="space-y-4 border border-border/60 p-5 rounded-2xl bg-muted/15">
                                <h4 className="font-bold text-sm text-foreground/90">Add Workspace Connection</h4>
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-muted-foreground block">Providers (Select multiple)</label>
                                        <div className="flex flex-wrap gap-4 pt-1">
                                            {['Google Flow', 'Gemini', 'ChatGPT'].map(prov => {
                                                const checked = selectedProviders.includes(prov);
                                                return (
                                                    <label key={prov} className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() => {
                                                                if (checked) {
                                                                    setSelectedProviders(selectedProviders.filter(p => p !== prov));
                                                                } else {
                                                                    setSelectedProviders([...selectedProviders, prov]);
                                                                }
                                                            }}
                                                            className="w-4 h-4 rounded border-border text-indigo-600 focus:ring-indigo-500 bg-background"
                                                        />
                                                        <span>{prov}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-muted-foreground">Target Workspace</label>
                                        <select
                                            value={targetWorkspaceId}
                                            onChange={e => setTargetWorkspaceId(e.target.value)}
                                            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none"
                                        >
                                            <option value="default">Default / Global Workspace</option>
                                            {channels.map((chan) => (
                                                <option key={chan.id} value={chan.slug}>
                                                    {chan.name} (/{chan.slug})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-muted-foreground">Account Name / Email</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. workspace_gmail@gmail.com"
                                            value={accountName}
                                            onChange={e => setAccountName(e.target.value)}
                                            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-muted-foreground">Profile Name / Description (Optional)</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Work Profile 1"
                                            value={profileName}
                                            onChange={e => setProfileName(e.target.value)}
                                            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!accountName) {
                                                toast.error("Account Name is required");
                                                return;
                                            }
                                            if (selectedProviders.length === 0) {
                                                toast.error("Please select at least one Provider");
                                                return;
                                            }
                                            addAccountMutation.mutate();
                                        }}
                                        disabled={addAccountMutation.isPending}
                                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white py-2.5 px-4 rounded-xl text-xs font-bold disabled:opacity-50 transition-colors shadow-sm"
                                    >
                                        {addAccountMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                        Link Account
                                    </button>
                                </div>
                            </div>

                            {/* Connections List */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-sm text-foreground/90">Linked Accounts ({externalAccounts.length})</h4>
                                {externalAccounts.length === 0 ? (
                                    <p className="text-xs italic text-muted-foreground py-16 text-center border border-dashed border-border rounded-2xl bg-card/20">
                                        No linked accounts. Add an account to enable browser extension integration or API integrations.
                                    </p>
                                ) : (
                                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                                        {externalAccounts.map((account) => (
                                            <div key={account.id} className="flex items-center justify-between p-4 border border-border/80 rounded-xl hover:border-border transition-colors bg-secondary/10">
                                                <div className="space-y-1 min-w-0 pr-2">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="text-sm font-bold truncate text-foreground">{account.account_name}</span>
                                                        <span className="text-[9px] font-extrabold tracking-widest uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{account.provider}</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5 items-center mt-1">
                                                        {account.profile_name && (
                                                            <span className="text-xs text-muted-foreground truncate">Profile: {account.profile_name}</span>
                                                        )}
                                                        <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.2 rounded font-mono">
                                                            /{account.workspace_id}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleAccountMutation.mutate({ id: account.id, isActive: account.is_active !== 1 })}
                                                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                                                            account.is_active === 1
                                                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20"
                                                                : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                                                        }`}
                                                    >
                                                        {account.is_active === 1 ? "Active" : "Inactive"}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (confirm("Delete this connected account? All active jobs using it will be affected.")) {
                                                                 deleteAccountMutation.mutate(account.id);
                                                            }
                                                        }}
                                                        className="text-red-400 hover:text-red-300 transition-colors p-1.5"
                                                        title="Remove Connection"
                                                    >
                                                        <Trash2 className="w-4.5 h-4.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: CONNECTOR JOBS */}
            {activeTab === 'jobs' && (
                <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-border bg-secondary/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <History className="w-5 h-5 text-indigo-500" />
                            <h3 className="font-bold text-lg">Connector Jobs Log</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    if (confirm("Clear all completed and failed jobs?")) {
                                        clearJobsMutation.mutate({ status: 'completed,failed' });
                                    }
                                }}
                                disabled={clearJobsMutation.isPending || jobsLog.length === 0}
                                className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-40 font-bold"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Clear Completed/Failed
                            </button>
                            <button
                                onClick={() => {
                                    if (confirm("Are you sure you want to clear ALL jobs (including pending ones)?")) {
                                        clearJobsMutation.mutate({});
                                    }
                                }}
                                disabled={clearJobsMutation.isPending || jobsLog.length === 0}
                                className="text-xs bg-red-600 hover:bg-red-700 text-white border border-red-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-40 font-bold"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Clear All
                            </button>
                            <button
                                onClick={() => refetchJobs()}
                                disabled={loadingJobs}
                                className="text-xs bg-secondary hover:bg-secondary/80 border border-border px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 font-bold"
                            >
                                {loadingJobs ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                Refresh Log
                            </button>
                        </div>
                    </div>
                    <div className="p-0 overflow-x-auto">
                        {jobsLog.length === 0 ? (
                            <p className="text-sm italic text-muted-foreground py-16 text-center">
                                No job executions logged in this workspace yet.
                            </p>
                        ) : (
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-border/80 bg-secondary/25">
                                        <th className="p-4 font-bold text-muted-foreground">Job ID</th>
                                        <th className="p-4 font-bold text-muted-foreground">Workspace</th>
                                        <th className="p-4 font-bold text-muted-foreground">Provider</th>
                                        <th className="p-4 font-bold text-muted-foreground">Linked Account</th>
                                        <th className="p-4 font-bold text-muted-foreground">Asset Type</th>
                                        <th className="p-4 font-bold text-muted-foreground">Status</th>
                                        <th className="p-4 font-bold text-muted-foreground">Prompt Context Target</th>
                                        <th className="p-4 font-bold text-muted-foreground">Created At</th>
                                        <th className="p-4 font-bold text-muted-foreground text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {jobsLog.map((job) => {
                                        const account = externalAccounts.find(a => a.id === job.account_id);
                                        const accountLabel = account ? account.account_name : job.account_id || 'Global / None';
                                        const dateLabel = format(new Date(job.created_at), 'MMM d, h:mm a');

                                        let statusBadge = (
                                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-secondary text-muted-foreground border border-border">
                                                {job.status}
                                            </span>
                                        );
                                        if (job.status === 'pending') {
                                            statusBadge = (
                                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center gap-1 w-fit">
                                                    <Clock className="w-3 h-3 animate-pulse" />
                                                    Pending
                                                </span>
                                            );
                                        } else if (job.status === 'opened') {
                                            statusBadge = (
                                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                    Opened in Flow
                                                </span>
                                            );
                                        } else if (job.status === 'completed') {
                                            statusBadge = (
                                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Completed
                                                </span>
                                            );
                                        } else if (job.status === 'failed') {
                                            statusBadge = (
                                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1 w-fit">
                                                    <XCircle className="w-3 h-3" />
                                                    Failed
                                                </span>
                                            );
                                        } else if (job.status === 'expired') {
                                            statusBadge = (
                                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-muted text-muted-foreground border border-border">
                                                    Expired
                                                </span>
                                            );
                                        }

                                        return (
                                            <tr key={job.id} className="border-b border-border/40 hover:bg-secondary/5 transition-colors">
                                                <td className="p-4 font-mono text-xs text-muted-foreground" title={job.id}>
                                                    {job.id.substring(0, 8)}...
                                                </td>
                                                <td className="p-4 text-xs font-bold text-foreground font-mono">
                                                    /{job.workspace_id}
                                                </td>
                                                <td className="p-4 font-semibold text-foreground">
                                                    {job.provider}
                                                </td>
                                                <td className="p-4 text-muted-foreground">
                                                    {accountLabel}
                                                </td>
                                                <td className="p-4 uppercase text-xs font-bold tracking-wider">
                                                    {job.asset_type}
                                                </td>
                                                <td className="p-4">
                                                    {statusBadge}
                                                </td>
                                                <td className="p-4 text-xs font-medium max-w-xs truncate" title={job.prompt || 'No context prompt text resolved'}>
                                                    {job.prompt || <span className="italic text-muted-foreground">N/A (Deleted/Global)</span>}
                                                </td>
                                                <td className="p-4 text-xs text-muted-foreground">
                                                    {dateLabel}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (confirm("Delete this connector job?")) {
                                                                deleteJobMutation.mutate(job.id);
                                                            }
                                                        }}
                                                        disabled={deleteJobMutation.isPending}
                                                        className="text-red-400 hover:text-red-300 disabled:opacity-40 transition-colors p-1"
                                                        title="Delete Job"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* TAB CONTENT: PROVIDERS REGISTRY */}
            {activeTab === 'providers' && (
                <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-border bg-secondary/30 flex items-center gap-2">
                        <Layers className="w-5 h-5 text-indigo-500" />
                        <h3 className="font-bold text-lg">Providers Registry</h3>
                    </div>
                    <div className="p-6">
                        <p className="text-sm text-muted-foreground mb-6">
                            Static list of integrated generation providers. Providers of type <code className="bg-secondary px-1 py-0.5 rounded text-foreground font-mono">api</code> route directly via 9Router. Providers of type <code className="bg-secondary px-1 py-0.5 rounded text-foreground font-mono">connector</code> queue jobs through external browser connectors.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                            {providersList.map((prov) => (
                                <div key={prov.name} className="p-5 border border-border/80 rounded-2xl hover:border-border transition-all bg-secondary/5 flex flex-col justify-between h-32">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-base text-foreground">{prov.name}</span>
                                        <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded border ${
                                            prov.type === 'api'
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                                : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25'
                                        }`}>
                                            {prov.type}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        {prov.type === 'api' 
                                            ? 'Fully automated cloud-generation engine.' 
                                            : 'Requires manual browser action via Chrome Extension.'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: COMPANION RUNTIMES */}
            {activeTab === 'runtimes' && (
                <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-border bg-secondary/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Cpu className="w-5 h-5 text-indigo-500" />
                            <h3 className="font-bold text-lg">Connected Companion Runtimes</h3>
                        </div>
                        <button
                            onClick={() => refetchRuntimes()}
                            className="text-xs bg-secondary hover:bg-secondary/80 border border-border px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                        >
                            Refresh list
                        </button>
                    </div>
                    
                    <div className="p-0 overflow-x-auto">
                        {companionRuntimes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-center p-16 bg-card/10">
                                <Cpu className="w-12 h-12 text-muted-foreground/60 mb-4" />
                                <h3 className="font-bold text-lg text-foreground">No companion runtimes registered</h3>
                                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                                    Open the Companion Chrome Extension to automatically pair your browser profile with the server.
                                </p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-border/80 bg-secondary/25">
                                        <th className="p-4 font-bold text-muted-foreground">Runtime Name</th>
                                        <th className="p-4 font-bold text-muted-foreground">Client ID (UUID)</th>
                                        <th className="p-4 font-bold text-muted-foreground">Status</th>
                                        <th className="p-4 font-bold text-muted-foreground">Last Seen</th>
                                        <th className="p-4 font-bold text-muted-foreground">Registered At</th>
                                        <th className="p-4 font-bold text-muted-foreground text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {companionRuntimes.map((runtime) => {
                                        const dateRegistered = format(new Date(runtime.created_at), 'MMM d, yyyy h:mm a');
                                        const dateLastSeen = runtime.last_seen_at
                                            ? format(new Date(runtime.last_seen_at), 'MMM d, h:mm:ss a')
                                            : 'Never';

                                        let statusBadge = (
                                            <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-gray-500/10 text-gray-400 border border-gray-500/20">
                                                Offline
                                            </span>
                                        );

                                        if (runtime.is_revoked === 1 || runtime.status === 'revoked') {
                                            statusBadge = (
                                                <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                                                    Revoked
                                                </span>
                                            );
                                        } else if (runtime.status === 'online') {
                                            statusBadge = (
                                                <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 w-fit">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    Online
                                                </span>
                                            );
                                        }

                                        return (
                                            <tr key={runtime.id} className="border-b border-border/40 hover:bg-secondary/5 transition-colors">
                                                <td className="p-4 font-bold text-foreground font-mono">
                                                    {runtime.runtime_name}
                                                </td>
                                                <td className="p-4 font-mono text-xs text-muted-foreground">
                                                    {runtime.client_id}
                                                </td>
                                                <td className="p-4">
                                                    {statusBadge}
                                                </td>
                                                <td className="p-4 text-xs text-muted-foreground">
                                                    {dateLastSeen}
                                                </td>
                                                <td className="p-4 text-xs text-muted-foreground">
                                                    {dateRegistered}
                                                </td>
                                                <td className="p-4 text-right">
                                                    {runtime.is_revoked !== 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (confirm(`Revoke companion runtime "${runtime.runtime_name}"? It will no longer be allowed to communicate with this server.`)) {
                                                                    revokeRuntimeMutation.mutate(runtime.id);
                                                                }
                                                            }}
                                                            className="text-red-400 hover:text-red-300 font-semibold text-xs border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 px-3 py-1.5 rounded-xl transition-all"
                                                        >
                                                            Revoke
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* APPROVE ROUTING MODAL */}
            {selectedAsset && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-border bg-secondary/30 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            <h3 className="font-bold text-lg">Approve & Route Asset</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Select the target destination where this asset will be permanently saved and registered.
                            </p>
                            
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Destination</label>
                                <select
                                    value={targetChannelId}
                                    onChange={e => setTargetChannelId(e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="shared">🌐 Global Shared Library</option>
                                    {channels.map((chan) => (
                                        <option key={chan.id} value={chan.id}>
                                            📺 {chan.name} (Sub-channel)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="bg-secondary/20 border border-border/50 rounded-xl p-3.5 text-xs text-muted-foreground">
                                {targetChannelId === 'shared' ? (
                                    <div className="flex gap-2">
                                        <Globe className="w-4.5 h-4.5 text-indigo-400 shrink-0" />
                                        <span>Saving in <strong className="text-foreground">Global Shared Library</strong> under <code className="bg-secondary px-1 py-0.5 rounded text-foreground font-mono">shared/{selectedAsset.asset_type}/</code>. Accessible by all channels.</span>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <Layers className="w-4.5 h-4.5 text-purple-400 shrink-0" />
                                        <span>Saving under sub-channel <strong className="text-foreground">{channels.find(c => c.id === targetChannelId)?.name}</strong> in folder <code className="bg-secondary px-1 py-0.5 rounded text-foreground font-mono">channels/{channels.find(c => c.id === targetChannelId)?.slug}/{selectedAsset.asset_type}/</code>.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="px-6 py-4 border-t border-border bg-secondary/10 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setSelectedAsset(null)}
                                className="px-4 py-2 border border-border bg-background hover:bg-secondary rounded-xl text-xs font-bold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleApproveConfirm}
                                disabled={approveMutation.isPending}
                                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
                            >
                                {approveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                Confirm Route
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW ASSET MODAL */}
            {viewingAsset && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-border bg-secondary/30 flex items-center justify-between">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Eye className="w-5 h-5 text-indigo-400" />
                                Asset Preview
                            </h3>
                            <button
                                onClick={() => setViewingAsset(null)}
                                className="text-muted-foreground hover:text-foreground font-bold text-lg"
                            >
                                &times;
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Preview */}
                            <div className="aspect-video bg-muted rounded-xl border border-border flex items-center justify-center overflow-hidden">
                                {viewingAsset.asset_type === 'thumbnail' || viewingAsset.file_path.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                                    <img
                                        src={getAssetPreviewUrl(viewingAsset)}
                                        alt={viewingAsset.asset_type}
                                        className="w-full h-full object-contain"
                                    />
                                ) : viewingAsset.asset_type === 'footage' || viewingAsset.file_path.match(/\.(mp4|mov|webm)$/i) ? (
                                    <video
                                        src={getAssetPreviewUrl(viewingAsset)}
                                        controls
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <div className="text-center p-8">
                                        <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                                        <span className="text-sm text-muted-foreground">Preview not available for this file type</span>
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span className="font-bold text-muted-foreground block uppercase text-[10px]">ID</span>
                                    <span className="font-mono">{viewingAsset.id}</span>
                                </div>
                                <div>
                                    <span className="font-bold text-muted-foreground block uppercase text-[10px]">Type</span>
                                    <span className="capitalize font-semibold">{viewingAsset.asset_type}</span>
                                </div>
                                <div>
                                    <span className="font-bold text-muted-foreground block uppercase text-[10px]">Source</span>
                                    <span className="font-semibold">{viewingAsset.source}</span>
                                </div>
                                <div>
                                    <span className="font-bold text-muted-foreground block uppercase text-[10px]">Status</span>
                                    <span className="capitalize font-semibold">{viewingAsset.status}</span>
                                </div>
                                <div>
                                    <span className="font-bold text-muted-foreground block uppercase text-[10px]">Workspace</span>
                                    <span>{viewingAsset.workspace_id}</span>
                                </div>
                                <div>
                                    <span className="font-bold text-muted-foreground block uppercase text-[10px]">Created At</span>
                                    <span>{format(new Date(viewingAsset.created_at), 'PPP p')}</span>
                                </div>
                            </div>

                            {viewingAsset.metadata && (
                                <div>
                                    <span className="font-bold text-muted-foreground block uppercase text-[10px] mb-1">Metadata</span>
                                    <pre className="text-xs bg-secondary/40 p-3 rounded-xl border border-border font-mono whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                                        {viewingAsset.metadata}
                                    </pre>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t border-border bg-secondary/10 flex items-center justify-end">
                            <button
                                type="button"
                                onClick={() => setViewingAsset(null)}
                                className="px-4 py-2 bg-secondary hover:bg-secondary/80 border border-border rounded-xl text-xs font-bold transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PURGE SINGLE ASSET CONFIRMATION MODAL */}
            {purgingAsset && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-border bg-red-950/20 flex items-center gap-2 text-red-400">
                            <ShieldAlert className="w-5 h-5" />
                            <h3 className="font-bold text-lg">Confirm Permanent Purge</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-foreground/90">
                                Are you sure you want to permanently purge this asset?
                            </p>
                            <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-3.5 text-xs text-red-400 space-y-1.5">
                                <p className="font-bold">This action is irreversible:</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>Deletes the asset record from the database.</li>
                                    <li>Deletes the physical storage file associated with this asset (if not approved).</li>
                                </ul>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-border bg-secondary/10 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setPurgingAsset(null)}
                                className="px-4 py-2 border border-border bg-background hover:bg-secondary rounded-xl text-xs font-bold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    purgeInboxAssetMutation.mutate(purgingAsset.id);
                                    setPurgingAsset(null);
                                }}
                                className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm"
                            >
                                Purge Permanently
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PURGE ALL IMPORTED/REJECTED ASSETS CONFIRMATION MODAL */}
            {showPurgeImportedModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-border bg-red-950/20 flex items-center gap-2 text-red-400">
                            <ShieldAlert className="w-5 h-5" />
                            <h3 className="font-bold text-lg">Confirm Purge Imported Assets</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-foreground/90">
                                Are you sure you want to purge all approved and rejected assets from the inbox?
                            </p>
                            <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-3.5 text-xs text-red-400 space-y-1.5">
                                <p className="font-bold">Important Details:</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>This removes all <strong className="text-foreground">Approved</strong> and <strong className="text-foreground">Rejected</strong> entries.</li>
                                    <li>Cleans up database and physical storage files (non-approved ones).</li>
                                    <li>This does not affect the main Asset Library.</li>
                                    <li>This action is permanent and irreversible.</li>
                                </ul>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-border bg-secondary/10 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowPurgeImportedModal(false)}
                                className="px-4 py-2 border border-border bg-background hover:bg-secondary rounded-xl text-xs font-bold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    purgeImportedInboxAssetsMutation.mutate();
                                    setShowPurgeImportedModal(false);
                                }}
                                className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm"
                            >
                                Purge All
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
