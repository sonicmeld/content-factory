import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
    Layers, 
    Inbox, 
    Sparkles, 
    FileEdit, 
    Loader2, 
    Archive, 
    Trash2, 
    Eye, 
    Clock, 
    AlertTriangle,
    ExternalLink,
    Play
} from 'lucide-react';
import { toast } from 'sonner';
import { 
    getContextPipelineInbox, 
    getContextPipelineEnriched, 
    getContextPipelineEnrichedDetail,
    generatePipelineDraft,
    getContextPipelineDrafts,
    getContextPipelineDraftDetail,
    updatePipelineDraftStatus,
    bulkPipelineArchive,
    bulkPipelineDelete,
    bulkPipelinePurge,
    purgeOldPipelineDrafts,
    purgeArchivedPipelineDrafts,
    getContextPipelineStats,
} from '../services/api';
import YouTubeAccountSelector from '../components/YouTubeAccountSelector';
import { useYoutubeAccount } from '../hooks/useYoutubeAccount';
import type { AnalyticsGeneratedDraft, EnrichedContextPayload } from '../types';
import ContextEnrichmentViewer from '../components/PromptLibrary/ContextEnrichmentViewer';

export default function ContextPipelinePage() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [draftStatusFilter, setDraftStatusFilter] = useState<string>('All');
    
    // Checkbox selection states
    const [selectedEnrichedIds, setSelectedEnrichedIds] = useState<string[]>([]);
    const [selectedDraftIds, setSelectedDraftIds] = useState<string[]>([]);

    // Detail Modal states
    const [viewEnrichedId, setViewEnrichedId] = useState<string | null>(null);
    const [viewEnrichedPayload, setViewEnrichedPayload] = useState<EnrichedContextPayload | null>(null);
    const [viewDraft, setViewDraft] = useState<AnalyticsGeneratedDraft | null>(null);

    // Purge confirmation state
    const [purgeType, setPurgeType] = useState<{ stage: string; ids: string[] } | null>(null);
    const [purgeInput, setPurgeInput] = useState<string>('');
    const [isPurgingAllOld, setIsPurgingAllOld] = useState(false);
    const [isPurgingAllArchived, setIsPurgingAllArchived] = useState(false);

    // YouTube Identity SSOT — selector persisten untuk filter pipeline per akun
    const {
        activeAccountId,
        setActiveAccountId,
        accounts: youtubeAccounts,
        isLoading: isAccountsLoading,
    } = useYoutubeAccount();

    // Fetch Stats & Timeline
    const { data: stats, isLoading: isStatsLoading } = useQuery({
        queryKey: ['pipelineStats'],
        queryFn: () => getContextPipelineStats(undefined),
        refetchInterval: 12000
    });

    // Fetch Inbox Contexts
    const { data: inboxItems = [], isLoading: isInboxLoading } = useQuery({
        queryKey: ['pipelineInbox'],
        queryFn: () => getContextPipelineInbox(undefined)
    });

    // Fetch Enriched Contexts
    const { data: enrichedItems = [], isLoading: isEnrichedLoading } = useQuery({
        queryKey: ['pipelineEnriched'],
        queryFn: () => getContextPipelineEnriched(undefined)
    });

    // Fetch Drafts
    const { data: draftItems = [], isLoading: isDraftsLoading } = useQuery({
        queryKey: ['pipelineDrafts', draftStatusFilter],
        queryFn: () => getContextPipelineDrafts(
            undefined, 
            draftStatusFilter === 'All' ? undefined : draftStatusFilter.toLowerCase() === 'loaded' ? 'loaded_to_prompt' : draftStatusFilter.toLowerCase()
        )
    });

    // Reset selection lists when query changes
    useEffect(() => {
        setSelectedEnrichedIds([]);
    }, [enrichedItems]);

    useEffect(() => {
        setSelectedDraftIds([]);
    }, [draftItems]);

    // MUTATIONS


    // Custom Enrich Trigger using our direct api trigger
    const [enrichingId, setEnrichingId] = useState<string | null>(null);
    const handleTriggerEnrich = async (id: string) => {
        setEnrichingId(id);
        try {
            // Hit the API to enrich: POST /analytics/context/enrich
            const { enrichContext } = await import('../services/api');
            await enrichContext(id);
            toast.success("Enriched context generated successfully!");
            queryClient.invalidateQueries({ queryKey: ['pipelineInbox'] });
            queryClient.invalidateQueries({ queryKey: ['pipelineEnriched'] });
            queryClient.invalidateQueries({ queryKey: ['pipelineStats'] });
        } catch (error: any) {
            toast.error(`Enrichment failed: ${error.response?.data?.detail || error.message}`);
        } finally {
            setEnrichingId(null);
        }
    };

    // Trigger Draft Generation
    const [generatingId, setGeneratingId] = useState<string | null>(null);
    const handleGenerateDraft = async (enrichedId: string) => {
        setGeneratingId(enrichedId);
        try {
            await generatePipelineDraft(enrichedId);
            toast.success("Draft created successfully inside Draft Center!");
            queryClient.invalidateQueries({ queryKey: ['pipelineDrafts'] });
            queryClient.invalidateQueries({ queryKey: ['pipelineStats'] });
        } catch (error: any) {
            toast.error(`Draft generation failed: ${error.response?.data?.detail || error.message}`);
        } finally {
            setGeneratingId(null);
        }
    };

    // Load Enriched Detail
    const handleOpenEnrichedDetail = async (id: string) => {
        setViewEnrichedId(id);
        setViewEnrichedPayload(null);
        try {
            const data = await getContextPipelineEnrichedDetail(id);
            setViewEnrichedPayload(data);
        } catch (error: any) {
            toast.error("Failed to load enriched details");
            setViewEnrichedId(null);
        }
    };

    // Load Draft Detail
    const handleOpenDraftDetail = async (id: string) => {
        try {
            const data = await getContextPipelineDraftDetail(id);
            setViewDraft(data);
        } catch (error: any) {
            toast.error("Failed to load draft content");
        }
    };

    // Transition Draft Status (Sequential)
    const handleUpdateStatus = async (id: string, targetStatus: string) => {
        try {
            await updatePipelineDraftStatus(id, targetStatus);
            toast.success(`Draft updated to status '${targetStatus}'`);
            queryClient.invalidateQueries({ queryKey: ['pipelineDrafts'] });
            queryClient.invalidateQueries({ queryKey: ['pipelineStats'] });
            if (viewDraft && viewDraft.id === id) {
                setViewDraft(prev => prev ? { ...prev, status: targetStatus as any } : null);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Invalid state transition");
        }
    };

    // Load draft into Prompt Expert (opens Prompt Library)
    const handleLoadToPromptExpert = async (draft: AnalyticsGeneratedDraft) => {
        try {
            // Update status to 'loaded_to_prompt' first
            await updatePipelineDraftStatus(draft.id, 'loaded_to_prompt');
            queryClient.invalidateQueries({ queryKey: ['pipelineDrafts'] });
            queryClient.invalidateQueries({ queryKey: ['pipelineStats'] });
            
            // Navigate with state to pass text
            navigate('/prompts', { 
                state: { 
                    initialInputText: draft.content_markdown, 
                    activeTab: 'expert' 
                } 
            });
            toast.success("Markdown loaded into Prompt Expert editor!");
        } catch (error: any) {
            toast.error("Failed to transition draft status");
        }
    };

    const handleLoadEnrichedToPromptExpert = (markdown: string) => {
        navigate('/prompts', { 
            state: { 
                initialInputText: markdown, 
                activeTab: 'expert' 
            } 
        });
    };

    // BULK ACTIONS
    const handleBulkArchive = async (stage: 'enriched' | 'drafts') => {
        const ids = stage === 'enriched' ? selectedEnrichedIds : selectedDraftIds;
        if (ids.length === 0) return;
        try {
            await bulkPipelineArchive(ids, stage);
            toast.success(`Archived ${ids.length} item(s)`);
            queryClient.invalidateQueries({ queryKey: [`pipeline${stage.charAt(0).toUpperCase() + stage.slice(1)}`] });
            queryClient.invalidateQueries({ queryKey: ['pipelineStats'] });
            if (stage === 'enriched') setSelectedEnrichedIds([]);
            else setSelectedDraftIds([]);
        } catch (error: any) {
            toast.error("Bulk archive failed");
        }
    };

    const handleBulkDelete = async (stage: 'inbox' | 'enriched' | 'drafts', customIds?: string[]) => {
        const ids = customIds || (stage === 'enriched' ? selectedEnrichedIds : selectedDraftIds);
        if (ids.length === 0) return;
        
        if (stage === 'inbox' && !confirm("Are you sure you want to permanently delete this context from inbox?")) {
            return;
        }

        try {
            await bulkPipelineDelete(ids, stage);
            toast.success(`Deleted ${ids.length} item(s)`);
            queryClient.invalidateQueries({ queryKey: ['pipelineInbox'] });
            queryClient.invalidateQueries({ queryKey: ['pipelineEnriched'] });
            queryClient.invalidateQueries({ queryKey: ['pipelineDrafts'] });
            queryClient.invalidateQueries({ queryKey: ['pipelineStats'] });
            
            if (stage === 'enriched') setSelectedEnrichedIds([]);
            else if (stage === 'drafts') setSelectedDraftIds([]);
        } catch (error: any) {
            toast.error("Bulk delete failed");
        }
    };

    const triggerPurgeDialog = (stage: string) => {
        const ids = stage === 'enriched' ? selectedEnrichedIds : selectedDraftIds;
        if (ids.length === 0) return;
        setPurgeType({ stage, ids });
        setPurgeInput('');
    };

    const handleBulkPurge = async () => {
        if (!purgeType || purgeInput !== 'PURGE') return;
        try {
            await bulkPipelinePurge(purgeType.ids, purgeType.stage);
            toast.success(`Permanently purged ${purgeType.ids.length} item(s)`);
            queryClient.invalidateQueries({ queryKey: ['pipelineInbox'] });
            queryClient.invalidateQueries({ queryKey: ['pipelineEnriched'] });
            queryClient.invalidateQueries({ queryKey: ['pipelineDrafts'] });
            queryClient.invalidateQueries({ queryKey: ['pipelineStats'] });
            
            if (purgeType.stage === 'enriched') setSelectedEnrichedIds([]);
            else if (purgeType.stage === 'drafts') setSelectedDraftIds([]);
            
            setPurgeType(null);
        } catch (error: any) {
            toast.error("Purge failed");
        }
    };

    // RETENTION CLEANUPS
    const handlePurgeOld = async () => {
        if (!confirm("Are you sure you want to physically purge all drafts older than 30 days?")) return;
        setIsPurgingAllOld(true);
        try {
            const res = await purgeOldPipelineDrafts();
            toast.success(res.message || "Old drafts purged successfully");
            queryClient.invalidateQueries({ queryKey: ['pipelineDrafts'] });
            queryClient.invalidateQueries({ queryKey: ['pipelineStats'] });
        } catch (error: any) {
            toast.error("Retention purge failed");
        } finally {
            setIsPurgingAllOld(false);
        }
    };

    const handlePurgeArchived = async () => {
        if (!confirm("Are you sure you want to physically purge all archived and soft-deleted drafts?")) return;
        setIsPurgingAllArchived(true);
        try {
            const res = await purgeArchivedPipelineDrafts();
            toast.success(res.message || "Archived drafts purged successfully");
            queryClient.invalidateQueries({ queryKey: ['pipelineDrafts'] });
            queryClient.invalidateQueries({ queryKey: ['pipelineStats'] });
        } catch (error: any) {
            toast.error("Archived purge failed");
        } finally {
            setIsPurgingAllArchived(false);
        }
    };



    const toggleSelectEnriched = (id: string) => {
        setSelectedEnrichedIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleSelectDraft = (id: string) => {
        setSelectedDraftIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-8 max-w-7xl pb-16">
            
            {/* Title Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2.5">
                        <Layers className="w-6 h-6 text-primary" />
                        Context Pipeline
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Workflow pemantauan dan pembuatan draf YouTube Long-form terpadu dari riset hingga siap pakai.
                    </p>
                </div>
                
                {/* YouTube Account Selector (SSOT) */}
                <YouTubeAccountSelector
                    activeAccountId={activeAccountId}
                    setActiveAccountId={setActiveAccountId}
                    accounts={youtubeAccounts}
                    isLoading={isAccountsLoading}
                />
            </div>

            {/* KPI Metrics Header */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm hover:border-border transition-colors">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Contexts</p>
                    <h3 className="text-2xl font-black mt-2 text-foreground">
                        {isStatsLoading ? <Loader2 className="animate-spin w-4 h-4 text-muted-foreground" /> : stats?.total_contexts || 0}
                    </h3>
                    <p className="text-[10px] text-muted-foreground mt-1">Ready to be processed</p>
                </div>
                <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm hover:border-border transition-colors">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ready Enrichments</p>
                    <h3 className="text-2xl font-black mt-2 text-indigo-400">
                        {isStatsLoading ? <Loader2 className="animate-spin w-4 h-4 text-muted-foreground" /> : stats?.ready_enrichments || 0}
                    </h3>
                    <p className="text-[10px] text-muted-foreground mt-1">Analyzed & structured</p>
                </div>
                <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm hover:border-border transition-colors">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Generated Drafts</p>
                    <h3 className="text-2xl font-black mt-2 text-primary">
                        {isStatsLoading ? <Loader2 className="animate-spin w-4 h-4 text-muted-foreground" /> : stats?.total_drafts || 0}
                    </h3>
                    <p className="text-[10px] text-muted-foreground mt-1">Draft script queue</p>
                </div>
                <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm hover:border-border transition-colors">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Loaded to Prompt</p>
                    <h3 className="text-2xl font-black mt-2 text-emerald-400">
                        {isStatsLoading ? <Loader2 className="animate-spin w-4 h-4 text-muted-foreground" /> : stats?.loaded_to_prompt_count || 0}
                    </h3>
                    <p className="text-[10px] text-muted-foreground mt-1">Consumed by Prompt Expert</p>
                </div>
                <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm hover:border-border transition-colors">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Archived Items</p>
                    <h3 className="text-2xl font-black mt-2 text-muted-foreground">
                        {isStatsLoading ? <Loader2 className="animate-spin w-4 h-4 text-muted-foreground" /> : stats?.archived_items || 0}
                    </h3>
                    <p className="text-[10px] text-muted-foreground mt-1">Soft-archived backups</p>
                </div>
            </div>

            {/* THREE-STAGE PIPELINE GRID */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* STAGE 1: CONTEXT INBOX */}
                <div className="bg-card border border-border/65 rounded-3xl p-6 shadow-md flex flex-col h-[700px] overflow-hidden">
                    <div className="flex items-center justify-between pb-4 border-b border-border/50 mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-indigo-500/10 rounded-xl">
                                <Inbox className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-foreground">Stage 1 — Context Inbox</h2>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Raw analytics exports pending enrichment</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-foreground">
                            {inboxItems.length} items
                        </span>
                    </div>

                    {/* Stage Body */}
                    <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                        {isInboxLoading ? (
                            <div className="py-20 flex justify-center"><Loader2 className="animate-spin w-6 h-6 text-primary" /></div>
                        ) : inboxItems.length === 0 ? (
                            <div className="py-24 text-center space-y-2">
                                <Inbox className="w-8 h-8 mx-auto text-muted-foreground/30" />
                                <p className="text-xs text-muted-foreground italic">Inbox empty. Export topics from radar/intelligence.</p>
                            </div>
                        ) : (
                            inboxItems.map(item => (
                                <div key={item.id} className="bg-secondary/15 hover:bg-secondary/30 border border-border/40 rounded-2xl p-4 transition-all hover:scale-[1.01] flex flex-col gap-3 relative group">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 capitalize">
                                            {item.source_type}
                                        </span>
                                        <span className="text-[9px] text-muted-foreground font-mono">{formatDate(item.exported_at)}</span>
                                    </div>
                                    
                                    <div>
                                        <h4 className="font-extrabold text-foreground leading-snug line-clamp-2 pr-4">{item.topic_name || "Unknown"}</h4>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {item.opportunity_score !== undefined && item.opportunity_score > 0 && (
                                                <span className="text-[10px] bg-secondary/50 text-foreground px-1.5 py-0.5 rounded border border-border/40 font-semibold">
                                                    Index: {item.opportunity_score.toFixed(0)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 border-t border-border/15 pt-3 mt-1">
                                        <button
                                            type="button"
                                            disabled={enrichingId === item.id}
                                            onClick={() => handleTriggerEnrich(item.id)}
                                            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] py-1.5 rounded-xl transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1 disabled:opacity-50"
                                        >
                                            {enrichingId === item.id ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <Sparkles className="w-3 h-3" />
                                            )}
                                            <span>Enrich</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleBulkDelete('inbox', [item.id])}
                                            className="p-1.5 bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-red-400 border border-border rounded-xl transition-all"
                                            title="Delete permanently"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* STAGE 2: ENRICHED CONTEXTS */}
                <div className="bg-card border border-border/65 rounded-3xl p-6 shadow-md flex flex-col h-[700px] overflow-hidden">
                    <div className="flex items-center justify-between pb-4 border-b border-border/50 mb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-indigo-500/10 rounded-xl">
                                <Sparkles className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-foreground">Stage 2 — Enriched Contexts</h2>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Enrichment profiles compiled with strategy</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-foreground">
                            {enrichedItems.length} items
                        </span>
                    </div>

                    {/* Stage Toolbar (Bulk actions) */}
                    {selectedEnrichedIds.length > 0 && (
                        <div className="flex items-center justify-between bg-indigo-500/5 border border-indigo-500/15 rounded-xl px-3 py-2 my-2 text-[11px] gap-2 animate-in slide-in-from-top-2 duration-200">
                            <span className="font-semibold text-indigo-400">{selectedEnrichedIds.length} selected</span>
                            <div className="flex items-center gap-1.5">
                                <button 
                                    onClick={() => handleBulkArchive('enriched')} 
                                    className="bg-secondary text-foreground hover:bg-secondary/80 px-2 py-1 rounded border border-border flex items-center gap-1 font-bold"
                                >
                                    <Archive className="w-3 h-3" /> Archive
                                </button>
                                <button 
                                    onClick={() => handleBulkDelete('enriched')} 
                                    className="bg-secondary text-foreground hover:bg-secondary/80 hover:text-red-400 px-2 py-1 rounded border border-border flex items-center gap-1 font-bold"
                                >
                                    <Trash2 className="w-3 h-3" /> Delete
                                </button>
                                <button 
                                    onClick={() => triggerPurgeDialog('enriched')} 
                                    className="bg-red-500/15 text-red-400 hover:bg-red-500/25 px-2 py-1 rounded border border-red-500/20 flex items-center gap-1 font-bold"
                                >
                                    <AlertTriangle className="w-3 h-3" /> Purge
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Stage Body */}
                    <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin mt-2">
                        {isEnrichedLoading ? (
                            <div className="py-20 flex justify-center"><Loader2 className="animate-spin w-6 h-6 text-primary" /></div>
                        ) : enrichedItems.length === 0 ? (
                            <div className="py-24 text-center space-y-2">
                                <Sparkles className="w-8 h-8 mx-auto text-muted-foreground/30" />
                                <p className="text-xs text-muted-foreground italic">No enriched contexts. Enrich item from Inbox.</p>
                            </div>
                        ) : (
                            enrichedItems.map(item => (
                                <div key={item.id} className="bg-secondary/15 hover:bg-secondary/30 border border-border/40 rounded-2xl p-4 transition-all hover:scale-[1.01] flex flex-col gap-3 relative group">
                                    <div className="absolute top-4 right-4">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedEnrichedIds.includes(item.id)}
                                            onChange={() => toggleSelectEnriched(item.id)}
                                            className="w-3.5 h-3.5 rounded border-border text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded capitalize ${
                                            item.status === 'ready' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                            item.status === 'draft' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                            'bg-red-500/10 text-red-400 border border-red-500/20'
                                        }`}>
                                            {item.status}
                                        </span>
                                        <span className="text-[9px] text-muted-foreground font-mono mr-5">{formatDate(item.generated_at)}</span>
                                    </div>
                                    
                                    <div>
                                        <h4 className="font-extrabold text-foreground leading-snug line-clamp-2 pr-4">{item.topic_name || "Unknown"}</h4>
                                        <p className="text-[10px] text-muted-foreground mt-1">Engine: <span className="font-mono">{item.generated_by}</span></p>
                                    </div>

                                    <div className="flex items-center gap-2 border-t border-border/15 pt-3 mt-1">
                                        <button
                                            type="button"
                                            onClick={() => handleOpenEnrichedDetail(item.id)}
                                            className="bg-secondary hover:bg-secondary/80 text-foreground font-bold text-[10px] px-2 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 border border-border flex-1"
                                        >
                                            <Eye className="w-3.5 h-3.5" /> Details
                                        </button>
                                        <button
                                            type="button"
                                            disabled={generatingId === item.id || item.status !== 'ready'}
                                            onClick={() => handleGenerateDraft(item.id)}
                                            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] py-1.5 rounded-xl transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1 disabled:opacity-50"
                                        >
                                            {generatingId === item.id ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <Play className="w-3 h-3" />
                                            )}
                                            <span>Gen Draft</span>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* STAGE 3: DRAFT CENTER */}
                <div className="bg-card border border-border/65 rounded-3xl p-6 shadow-md flex flex-col h-[700px] overflow-hidden">
                    <div className="flex flex-col pb-4 border-b border-border/50 mb-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-indigo-500/10 rounded-xl">
                                    <FileEdit className="w-5 h-5 text-indigo-400" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-foreground">Stage 3 — Draft Center</h2>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">Generated script draft center</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-foreground">
                                {draftItems.length} items
                            </span>
                        </div>
                        
                        {/* Draft Filters */}
                        <div className="flex bg-muted/40 border border-border/80 p-1 rounded-xl gap-1.5 mt-4 text-[10px] font-bold">
                            {['All', 'Draft', 'Reviewed', 'Approved', 'Loaded', 'Archived'].map(tab => (
                                <button
                                    key={tab}
                                    type="button"
                                    onClick={() => setDraftStatusFilter(tab)}
                                    className={`flex-1 py-1.5 rounded-lg transition-all capitalize ${draftStatusFilter === tab ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Stage Toolbar (Bulk actions) */}
                    {selectedDraftIds.length > 0 && (
                        <div className="flex items-center justify-between bg-indigo-500/5 border border-indigo-500/15 rounded-xl px-3 py-2 my-2 text-[11px] gap-2 animate-in slide-in-from-top-2 duration-200">
                            <span className="font-semibold text-indigo-400">{selectedDraftIds.length} selected</span>
                            <div className="flex items-center gap-1.5">
                                <button 
                                    onClick={() => handleBulkArchive('drafts')} 
                                    className="bg-secondary text-foreground hover:bg-secondary/80 px-2 py-1 rounded border border-border flex items-center gap-1 font-bold"
                                >
                                    <Archive className="w-3 h-3" /> Archive
                                </button>
                                <button 
                                    onClick={() => handleBulkDelete('drafts')} 
                                    className="bg-secondary text-foreground hover:bg-secondary/80 hover:text-red-400 px-2 py-1 rounded border border-border flex items-center gap-1 font-bold"
                                >
                                    <Trash2 className="w-3 h-3" /> Delete
                                </button>
                                <button 
                                    onClick={() => triggerPurgeDialog('drafts')} 
                                    className="bg-red-500/15 text-red-400 hover:bg-red-500/25 px-2 py-1 rounded border border-red-500/20 flex items-center gap-1 font-bold"
                                >
                                    <AlertTriangle className="w-3 h-3" /> Purge
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Stage Body */}
                    <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin mt-2">
                        {isDraftsLoading ? (
                            <div className="py-20 flex justify-center"><Loader2 className="animate-spin w-6 h-6 text-primary" /></div>
                        ) : draftItems.length === 0 ? (
                            <div className="py-24 text-center space-y-2">
                                <FileEdit className="w-8 h-8 mx-auto text-muted-foreground/30" />
                                <p className="text-xs text-muted-foreground italic">No drafts found. Generate draft from Enriched context.</p>
                            </div>
                        ) : (
                            draftItems.map(item => (
                                <div key={item.id} className="bg-secondary/15 hover:bg-secondary/30 border border-border/40 rounded-2xl p-4 transition-all hover:scale-[1.01] flex flex-col gap-3 relative group">
                                    <div className="absolute top-4 right-4">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedDraftIds.includes(item.id)}
                                            onChange={() => toggleSelectDraft(item.id)}
                                            className="w-3.5 h-3.5 rounded border-border text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded capitalize ${
                                            item.status === 'approved' ? 'bg-green-500/15 text-green-400 border border-green-500/20' :
                                            item.status === 'reviewed' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                                            item.status === 'loaded_to_prompt' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                                            item.status === 'archived' ? 'bg-muted/30 text-muted-foreground border border-border/30' :
                                            'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'
                                        }`}>
                                            {item.status.replace(/_/g, ' ')}
                                        </span>
                                        <span className="text-[9px] text-muted-foreground font-mono mr-5">{formatDate(item.created_at)}</span>
                                    </div>
                                    
                                    <div>
                                        <h4 className="font-extrabold text-foreground leading-snug line-clamp-2 pr-4">{item.title || "Script Draft"}</h4>
                                        <div className="flex items-center gap-2 mt-2 text-[9px] text-muted-foreground">
                                            <span className="bg-secondary px-1.5 py-0.5 rounded font-mono">Ver: {item.draft_version}</span>
                                            <span>Creator: <span className="font-mono">{item.generated_by}</span></span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 border-t border-border/15 pt-3 mt-1">
                                        <button
                                            type="button"
                                            onClick={() => handleOpenDraftDetail(item.id)}
                                            className="bg-secondary hover:bg-secondary/80 text-foreground font-bold text-[10px] px-2 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 border border-border flex-1"
                                        >
                                            <Eye className="w-3.5 h-3.5" /> Review
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleLoadToPromptExpert(item)}
                                            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] py-1.5 rounded-xl transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1"
                                        >
                                            <ExternalLink className="w-3 h-3" /> Load to Prompt
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>

            {/* RETENTION CONTROLS & TIMELINE ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
                
                {/* TIMELINE WIDGET */}
                <div className="lg:col-span-2 bg-card border border-border/65 rounded-3xl p-6 shadow-md">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2 pb-4 border-b border-border/50 mb-4">
                        <Clock className="w-4 h-4 text-indigo-400" /> Pipeline Activity Timeline
                    </h3>
                    
                    {isStatsLoading ? (
                        <div className="py-8 flex justify-center"><Loader2 className="animate-spin w-5 h-5 text-muted-foreground" /></div>
                    ) : !stats?.timeline || stats.timeline.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-4">No recent activity logs.</p>
                    ) : (
                        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
                            {stats.timeline.map((event: any, index: number) => {
                                return (
                                    <div key={event.id} className="flex gap-4 items-start relative text-xs">
                                        {index !== stats.timeline.length - 1 && (
                                            <div className="absolute top-5 bottom-0 left-2 w-0.5 bg-border/40 pointer-events-none" />
                                        )}
                                        
                                        {/* Status marker bullet */}
                                        <div className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 z-10 ${
                                            event.event_type === 'Context Exported' ? 'bg-indigo-500/15 border-indigo-400' :
                                            event.event_type === 'Context Enriched' ? 'bg-green-500/15 border-green-400' :
                                            event.event_type === 'Draft Generated' ? 'bg-blue-500/15 border-blue-400' :
                                            event.event_type === 'Draft Reviewed' ? 'bg-amber-500/15 border-amber-400' :
                                            event.event_type === 'Loaded To Prompt Expert' ? 'bg-emerald-500/15 border-emerald-400' :
                                            'bg-muted border-muted-foreground'
                                        }`}>
                                            <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                        </div>
                                        
                                        <div className="flex-1 bg-secondary/15 border border-border/30 rounded-xl p-3 flex justify-between gap-4">
                                            <div>
                                                <p className="font-extrabold text-foreground">{event.event_type}</p>
                                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{event.title}</p>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground font-mono shrink-0 pt-0.5">{formatDate(event.timestamp)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* RETENTION CONTROLS */}
                <div className="bg-card border border-border/65 rounded-3xl p-6 shadow-md flex flex-col justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2 pb-4 border-b border-border/50 mb-4">
                            <Archive className="w-4 h-4 text-indigo-400" /> Retention & Storage Cleanup
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                            Karena jumlah data draf dan analisis terus berkembang, bersihkan database SQLite secara berkala untuk menjaga kinerja query tetap optimal.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <button
                            type="button"
                            disabled={isPurgingAllOld}
                            onClick={handlePurgeOld}
                            className="w-full flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-bold py-3 px-4 rounded-xl transition-all"
                        >
                            {isPurgingAllOld ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5 text-red-400" />}
                            <span>Purge Drafts &gt; 30 Days</span>
                        </button>
                        <button
                            type="button"
                            disabled={isPurgingAllArchived}
                            onClick={handlePurgeArchived}
                            className="w-full flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-bold py-3 px-4 rounded-xl transition-all"
                        >
                            {isPurgingAllArchived ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5 text-red-400" />}
                            <span>Purge Archived & Deleted Drafts</span>
                        </button>
                    </div>
                </div>

            </div>

            {/* MODAL 1: ENRICHED DETAILS VIEWER */}
            {viewEnrichedId && viewEnrichedPayload && (
                <ContextEnrichmentViewer 
                    payload={viewEnrichedPayload} 
                    onClose={() => setViewEnrichedId(null)} 
                    onLoadIntoBuilder={handleLoadEnrichedToPromptExpert}
                />
            )}

            {/* MODAL 2: DRAFT REVIEWER */}
            {viewDraft && (
                <div className="fixed inset-0 bg-background/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/10">
                            <div>
                                <h3 className="font-bold text-sm text-foreground flex items-center">
                                    <FileEdit className="w-4 h-4 mr-2 text-indigo-400" /> Review Generated Script Draft
                                </h3>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Lineage ID: {viewDraft.id.substring(0, 8)}</p>
                            </div>
                            <button onClick={() => setViewDraft(null)} className="text-muted-foreground hover:text-foreground text-sm font-bold bg-secondary/60 hover:bg-secondary px-3 py-1 rounded-lg transition-all">Close</button>
                        </div>
                        
                        {/* Split views */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 flex-1 overflow-hidden">
                            
                            {/* Editor markdown panel */}
                            <div className="lg:col-span-2 p-6 overflow-y-auto space-y-4 max-h-[60vh] border-r border-border/40 scrollbar-thin">
                                <h4 className="font-bold text-foreground">{viewDraft.title}</h4>
                                <textarea
                                    value={viewDraft.content_markdown}
                                    onChange={(e) => setViewDraft({ ...viewDraft, content_markdown: e.target.value })}
                                    rows={18}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-4 font-mono text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>

                            {/* Info & controls panel */}
                            <div className="p-6 bg-secondary/10 overflow-y-auto max-h-[60vh] flex flex-col justify-between gap-6 scrollbar-thin">
                                <div className="space-y-5 text-xs">
                                    <div>
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Lineage Details</span>
                                        <p className="font-mono text-[10px]">Export: {viewDraft.source_export_id.substring(0, 8)}...</p>
                                        <p className="font-mono text-[10px] mt-0.5">Enrich: {viewDraft.source_enriched_context_id.substring(0, 8)}...</p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Sequential Status Flow</span>
                                        <div className="space-y-2">
                                            {['draft', 'reviewed', 'approved', 'loaded_to_prompt', 'archived'].map((statusOption) => {
                                                const isActive = viewDraft.status === statusOption;
                                                return (
                                                    <button
                                                        key={statusOption}
                                                        type="button"
                                                        onClick={() => handleUpdateStatus(viewDraft.id, statusOption)}
                                                        className={`w-full py-2 px-3 rounded-lg text-left font-bold transition-all border flex items-center justify-between capitalize ${
                                                            isActive 
                                                                ? 'bg-indigo-600 border-indigo-500 text-white shadow' 
                                                                : 'bg-background hover:bg-secondary border-border text-muted-foreground hover:text-foreground'
                                                        }`}
                                                    >
                                                        <span>{statusOption.replace(/_/g, ' ')}</span>
                                                        {isActive && <span className="text-[9px] uppercase tracking-wider font-mono">Current</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        type="button"
                                        onClick={() => handleLoadToPromptExpert(viewDraft)}
                                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 px-4 rounded-xl transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5"
                                    >
                                        <ExternalLink className="w-4 h-4" /> Load to Prompt Expert
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleBulkDelete('drafts', [viewDraft.id]);
                                            setViewDraft(null);
                                        }}
                                        className="w-full bg-secondary hover:bg-secondary/80 text-red-400 hover:text-red-500 border border-border text-xs font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-1"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Soft-Delete Draft
                                    </button>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 3: BULK PURGE SAFETY CONFIRMATION DIALOG */}
            {purgeType && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-card border border-red-500/20 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-border bg-red-500/5">
                            <h3 className="font-extrabold text-foreground flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-500" /> Irreversible Purge Operation
                            </h3>
                        </div>
                        <div className="p-6 space-y-4 text-xs">
                            <p className="text-muted-foreground leading-relaxed">
                                Anda memilih untuk melakukan **Purge Fisik** secara permanen terhadap **{purgeType.ids.length}** data pada stage **{purgeType.stage.toUpperCase()}**. Tindakan ini akan menghapusnya secara fisik dari database SQLite dan **tidak dapat dibatalkan (irreversible)**.
                            </p>
                            <div className="space-y-1.5">
                                <label className="font-bold text-foreground">Ketik kata <span className="text-red-400">"PURGE"</span> untuk mengonfirmasi:</label>
                                <input
                                    type="text"
                                    value={purgeInput}
                                    onChange={(e) => setPurgeInput(e.target.value)}
                                    placeholder="PURGE"
                                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground font-extrabold text-center uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-red-500"
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-border flex justify-end gap-2 bg-muted/10">
                            <button onClick={() => setPurgeType(null)} className="px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground">Batal</button>
                            <button
                                disabled={purgeInput !== 'PURGE'}
                                onClick={handleBulkPurge}
                                className="bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-1.5 rounded-xl text-xs disabled:opacity-40 disabled:cursor-not-allowed transition"
                            >
                                Purge Permanen
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
