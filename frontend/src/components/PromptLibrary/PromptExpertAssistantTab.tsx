import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Loader2, Send, Cpu, Sliders, Inbox, Archive, FileText, Flame, TrendingUp } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { 
    getGenerationCombos, 
    generatePromptDraft,
    getRecentAnalyticsContexts,
    getAggregatedAIContext,
    updateContextExportStatus,
    enrichContext
} from '../../services/api';
import { toast } from 'sonner';
import ContextEnrichmentViewer from './ContextEnrichmentViewer';

interface Props {
    workspaceId: string;
    onDraftGenerated: () => void;
}

export default function PromptExpertAssistantTab({ workspaceId, onDraftGenerated }: Props) {
    const queryClient = useQueryClient();
    const location = useLocation();
    const [expertType, setExpertType] = useState<'metadata' | 'thumbnail' | 'footage'>('metadata');
    const [inputText, setInputText] = useState('');
    const [selectedComboId, setSelectedComboId] = useState('');

    useEffect(() => {
        const state = location.state as any;
        if (state && state.initialInputText) {
            setInputText(state.initialInputText);
            // Optional: reset browser history state to avoid reload preloading
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);


    const [inboxStatus, setInboxStatus] = useState<'new' | 'loaded'>('new');
    const [enrichingId, setEnrichingId] = useState<string | null>(null);
    const [enrichedPayload, setEnrichedPayload] = useState<any | null>(null);

    const handleEnrichContext = async (exportId: string) => {
        setEnrichingId(exportId);
        try {
            const result = await enrichContext(exportId);
            setEnrichedPayload(result);
            toast.success("Context enriched successfully!");
            queryClient.invalidateQueries({ queryKey: ['recentAnalyticsContexts'] });
        } catch (error: any) {
            toast.error(`Enrichment failed: ${error.response?.data?.detail || error.message}`);
        } finally {
            setEnrichingId(null);
        }
    };

    // Fetch recent exports
    const { data: recentExports = [], isLoading: isExportsLoading } = useQuery({
        queryKey: ['recentAnalyticsContexts', inboxStatus, workspaceId],
        queryFn: () => getRecentAnalyticsContexts(inboxStatus, workspaceId)
    });

    const loadContextMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) => updateContextExportStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recentAnalyticsContexts'] });
        }
    });

    const archiveContextMutation = useMutation({
        mutationFn: (id: string) => updateContextExportStatus(id, 'archived'),
        onSuccess: () => {
            toast.success("Context archived successfully");
            queryClient.invalidateQueries({ queryKey: ['recentAnalyticsContexts'] });
        },
        onError: () => {
            toast.error("Failed to archive context");
        }
    });

    const handleLoadIntoBuilder = async (item: any) => {
        try {
            const context = await getAggregatedAIContext(item.id);
            let md = `### TOPIC\n${context.topic}\n\n`;
            
            if (context.market_data && Object.keys(context.market_data).length > 0) {
                md += `### MARKET METRICS\n`;
                if (context.market_data.opportunity_score !== undefined) md += `- Opportunity Score: ${context.market_data.opportunity_score.toFixed(0)}\n`;
                if (context.market_data.demand_score !== undefined) md += `- Demand Score: ${context.market_data.demand_score.toFixed(0)}\n`;
                if (context.market_data.trend_score !== undefined) md += `- Trend Score: ${context.market_data.trend_score.toFixed(0)}\n`;
                if (context.market_data.competition_score !== undefined) md += `- Competition Score: ${context.market_data.competition_score.toFixed(0)}\n`;
                if (context.market_data.forecast_score !== undefined) md += `- Forecast Score: ${context.market_data.forecast_score.toFixed(0)}\n\n`;
            }
            
            if (context.signals && context.signals.length > 0) {
                md += `### KEYWORD SIGNALS\n`;
                context.signals.forEach((sig: any) => {
                    md += `- ${sig.keyword} (Trend: ${sig.trend_score.toFixed(0)}, Comp: ${sig.competition_score.toFixed(0)})\n`;
                });
                md += `\n`;
            }

            if (context.competitor_data && Object.keys(context.competitor_data).length > 0) {
                md += `### COMPETITOR DATA\n`;
                md += `- Competitor Match Count: ${context.competitor_data.video_count || 0}\n`;
                md += `- Competition Score: ${context.competitor_data.competition_score.toFixed(0)}\n\n`;
            }

            if (context.insights && context.insights.length > 0) {
                md += `### ACTIVE INSIGHTS\n`;
                context.insights.forEach((ins: any) => {
                    md += `- [${ins.severity}] ${ins.finding}: ${ins.recommendation}\n`;
                });
                md += `\n`;
            }
            
            setInputText(md.trim());
            
            await loadContextMutation.mutateAsync({ id: item.id, status: 'loaded' });
            toast.success(`Loaded context for topic "${context.topic}" successfully!`);
        } catch (error: any) {
            toast.error(`Failed to load context: ${error.message}`);
        }
    };

    // Fetch combos (use metadata combos which are chat-based)
    const { data: combos = [], isLoading: isCombosLoading } = useQuery({
        queryKey: ['combos', 'metadata'],
        queryFn: () => getGenerationCombos('metadata')
    });

    useEffect(() => {
        if (combos.length > 0 && !selectedComboId) {
            setSelectedComboId(combos[0].id);
        }
    }, [combos, selectedComboId]);

    const generateMutation = useMutation({
        mutationFn: () => generatePromptDraft({
            workspace_id: workspaceId,
            expert_type: expertType,
            combo_id: selectedComboId,
            input_text: inputText
        }),
        onSuccess: () => {
            toast.success("Draft generated successfully! Go to 'Generated Drafts' tab to review it.");
            setInputText('');
            queryClient.invalidateQueries({ queryKey: ['prompt-drafts', workspaceId] });
            onDraftGenerated();
        },
        onError: (err: any) => {
            toast.error(`Draft generation failed: ${err.response?.data?.detail || err.message}`);
        }
    });

    const handleGenerate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim()) {
            toast.error("Please enter some keywords or a topic.");
            return;
        }
        if (!selectedComboId) {
            toast.error("Please select an LLM Combo.");
            return;
        }
        generateMutation.mutate();
    };

    const expertDescriptions = {
        metadata: "Membangun Prompt Context berkualitas tinggi khusus untuk Metadata Generator. Fokus pada topik, target penonton, dan tone semantik tanpa memproduksi Title, Description, atau Tags langsung.",
        thumbnail: "Membangun Prompt Context khusus untuk Thumbnail Generator. Fokus pada CTR opportunities, komposisi visual, pemicu emosi, dan positioning entitas visual tanpa memproduksi prompt generator gambar langsung.",
        footage: "Membangun Prompt Context khusus untuk Footage Generator. Fokus pada klasifikasi jenis B-roll, tema visual, dan ekspansi adegan pendukung tanpa memproduksi query pencarian langsung."
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Input Section */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-card border border-border rounded-2xl p-6 shadow-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                        <Sparkles className="w-36 h-36 text-primary" />
                    </div>

                    <h2 className="text-lg font-bold text-foreground flex items-center mb-1">
                        <Cpu className="w-5 h-5 text-primary mr-2" /> AI Context Builder
                    </h2>
                    <p className="text-xs text-muted-foreground mb-6">
                        Buat draf konteks prompt terstruktur dengan memanfaatkan system rules bawaan yang aman dan terkunci.
                    </p>

                    {/* Expert Selector */}
                    <div className="flex bg-muted/30 border border-border/80 p-1.5 rounded-xl gap-1.5 mb-6">
                        {(['metadata', 'thumbnail', 'footage'] as const).map(type => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setExpertType(type)}
                                className={`flex-1 text-xs font-bold py-2.5 rounded-lg transition-all capitalize ${expertType === type ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                {type} Expert
                            </button>
                        ))}
                    </div>

                    {/* Form */}
                    <form onSubmit={handleGenerate} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-foreground">
                                Pilih LLM Combo
                            </label>
                            <select
                                value={selectedComboId}
                                onChange={(e) => setSelectedComboId(e.target.value)}
                                className="w-full text-xs bg-background border border-border rounded-xl px-3 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                                disabled={isCombosLoading || generateMutation.isPending}
                            >
                                {isCombosLoading ? (
                                    <option>Loading combos...</option>
                                ) : (
                                    combos.map(combo => (
                                        <option key={combo.id} value={combo.id}>{combo.name} ({combo.category})</option>
                                    ))
                                )}
                                {!isCombosLoading && combos.length === 0 && (
                                    <option value="">No metadata/chat combos configured</option>
                                )}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-foreground">
                                Masukkan Topik / Kata Kunci Sederhana
                            </label>
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="Contoh: elon musk ai robot, japan travel vlog spring, woodworking simple chair tutorial..."
                                rows={4}
                                disabled={generateMutation.isPending}
                                className="w-full text-xs bg-background border border-border rounded-xl px-3 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed disabled:opacity-50"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={generateMutation.isPending || !inputText.trim() || !selectedComboId}
                            className="w-full flex items-center justify-center space-x-2 bg-primary text-primary-foreground hover:bg-primary/95 font-bold text-xs py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {generateMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Generating Draft Context...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    <span>Generate Draft Context</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>

            {/* Rules Info Sidebar */}
            <div className="space-y-6">
                {/* Analytics Context Inbox */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-md">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center mb-3">
                        <Inbox className="w-4 h-4 text-indigo-500 mr-2" /> Analytics Context Inbox
                    </h3>
                    
                    {/* Tab select: New / Loaded */}
                    <div className="flex bg-muted/30 border border-border/80 p-1 rounded-lg gap-1.5 mb-4 text-[10px]">
                        <button
                            type="button"
                            onClick={() => setInboxStatus('new')}
                            className={`flex-1 py-1.5 rounded-md font-bold transition-all ${inboxStatus === 'new' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            New
                        </button>
                        <button
                            type="button"
                            onClick={() => setInboxStatus('loaded')}
                            className={`flex-1 py-1.5 rounded-md font-bold transition-all ${inboxStatus === 'loaded' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Loaded
                        </button>
                    </div>

                    {isExportsLoading ? (
                        <div className="py-8 flex justify-center"><Loader2 className="animate-spin w-5 h-5 text-muted-foreground" /></div>
                    ) : recentExports.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic text-center py-6">No contexts in inbox.</p>
                    ) : (
                        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                            {recentExports.map((item: any) => {
                                const dateStr = new Date(item.exported_at).toLocaleDateString();
                                return (
                                    <div key={item.id} className="bg-secondary/15 hover:bg-secondary/35 border border-border/40 rounded-xl p-3 flex flex-col justify-between gap-3 text-xs transition-all">
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 capitalize">
                                                    {item.source_type}
                                                </span>
                                                <span className="text-[9px] text-muted-foreground font-mono">{dateStr}</span>
                                            </div>
                                            <h4 className="font-extrabold text-foreground truncate max-w-[180px]">{item.topic_name || "Unknown"}</h4>
                                            
                                            {/* Preview metrics */}
                                            {item.source_type === 'insight' ? (
                                                <div className="mt-2 space-y-1 text-[10px] text-muted-foreground">
                                                    {item.severity && (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-semibold">Severity:</span>
                                                            <span className={`px-1 rounded text-[8px] font-bold ${
                                                                item.severity === 'Critical' ? 'bg-red-500/15 text-red-400 border border-red-500/20' :
                                                                item.severity === 'High' ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20' :
                                                                'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'
                                                            }`}>{item.severity}</span>
                                                        </div>
                                                    )}
                                                    {item.insight_type && (
                                                        <div><span className="font-semibold">Type:</span> <span className="font-mono text-[9px]">{item.insight_type}</span></div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                                                    {item.opportunity_score !== undefined && item.opportunity_score > 0 && (
                                                        <div className="bg-secondary/40 border border-border/40 rounded px-1.5 py-0.5 font-semibold flex items-center gap-0.5 text-foreground">
                                                            <Flame className="w-3 h-3 text-red-500" /> {item.opportunity_score.toFixed(0)}
                                                        </div>
                                                    )}
                                                    {item.forecast_score !== undefined && item.forecast_score > 0 && (
                                                        <div className="bg-secondary/40 border border-border/40 rounded px-1.5 py-0.5 font-semibold flex items-center gap-0.5">
                                                            <TrendingUp className="w-3 h-3 text-blue-500" /> Proj: {item.forecast_score.toFixed(0)}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-2 border-t border-border/15 pt-2.5">
                                            <div className="flex items-center gap-2 justify-between">
                                                <button
                                                    type="button"
                                                    onClick={() => handleLoadIntoBuilder(item)}
                                                    className="flex-1 bg-secondary hover:bg-secondary/80 text-foreground font-bold text-[10px] px-2 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 border border-border"
                                                >
                                                    <FileText className="w-3 h-3" /> Load
                                                </button>
                                                
                                                <button
                                                    type="button"
                                                    onClick={() => handleEnrichContext(item.id)}
                                                    disabled={enrichingId === item.id}
                                                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] px-2 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 shadow-md shadow-indigo-600/15 disabled:opacity-50"
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
                                                    onClick={() => archiveContextMutation.mutate(item.id)}
                                                    disabled={archiveContextMutation.isPending}
                                                    className="text-muted-foreground hover:text-red-400 p-1 rounded-lg hover:bg-red-500/5 transition-all disabled:opacity-50"
                                                    title="Archive context"
                                                >
                                                    <Archive className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="bg-card border border-border rounded-2xl p-6 shadow-md">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center mb-3">
                        <Sliders className="w-4 h-4 text-indigo-500 mr-2" /> Locked System Rules
                    </h3>
                    <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4 text-xs space-y-3">
                        <p className="font-semibold text-indigo-400 capitalize">
                            {expertType} Expert Rules:
                        </p>
                        <p className="text-muted-foreground leading-relaxed">
                            {expertDescriptions[expertType]}
                        </p>
                        <div className="pt-2 border-t border-indigo-500/10 text-[11px] text-muted-foreground/80 space-y-1.5">
                            <p className="font-medium text-foreground">✓ Hanya Menghasilkan:</p>
                            <ul className="list-disc pl-4 space-y-0.5">
                                <li>Topic (Konsep dasar)</li>
                                <li>Keywords (Konsep & visual penting)</li>
                                <li>Notes (Style & CTR guidelines)</li>
                            </ul>
                            <p className="font-medium text-red-400/80 mt-2">✗ Dilarang Menghasilkan:</p>
                            <ul className="list-disc pl-4 space-y-0.5">
                                <li>Title / Description jadi</li>
                                <li>Prompt generator gambar langsung</li>
                                <li>Query pencarian video/footage</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            {enrichedPayload && (
                <ContextEnrichmentViewer
                    payload={enrichedPayload}
                    onClose={() => setEnrichedPayload(null)}
                    onLoadIntoBuilder={(markdown) => {
                        setInputText(markdown);
                        setEnrichedPayload(null);
                        toast.success("Loaded Enriched Context into Builder!");
                    }}
                />
            )}
        </div>
    );
}
