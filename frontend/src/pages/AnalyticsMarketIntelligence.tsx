import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    getMarketTrends, 
    getMarketTopics, 
    getMarketKeywords, 
    getMarketOpportunities, 
    getMarketForecast, 
    getMarketTopicOpportunities,
    refreshMarketIntelligence,
    exportTopicContext,
    exportOpportunityContext,
    syncYoutubeAccounts
} from '../services/api';
import YouTubeAccountSelector from '../components/YouTubeAccountSelector';
import { useYoutubeAccount } from '../hooks/useYoutubeAccount';
import { 
    TrendingUp, 
    Compass, 
    LineChart, 
    Flame, 
    Zap, 
    BookOpen, 
    RefreshCw, 
    Search, 
    Filter, 
    ArrowUpRight, 
    ArrowDownRight, 
    Sparkles, 
    Clock, 
    Share2, 
    Database, 
    Copy
} from 'lucide-react';
import { toast } from 'sonner';

type TabType = 'trend_explorer' | 'topic_radar' | 'keywords' | 'competitor' | 'opportunity_board' | 'forecast';

export default function AnalyticsMarketIntelligence() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<TabType>('trend_explorer');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState('opportunity_score');
    
    // Detailed view states
    const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
    const [exportedPayload, setExportedPayload] = useState<any | null>(null);

    // YouTube Identity SSOT — menggantikan activeChannelId lokal + channels dropdown
    const {
        activeAccountId,
        setActiveAccountId,
        accounts: youtubeAccounts,
        isLoading: isAccountsLoading,
    } = useYoutubeAccount();

    // Queries
    const { data: trends = [], isLoading: isTrendsLoading } = useQuery({
        queryKey: ['marketTrends'],
        queryFn: getMarketTrends
    });

    const { data: topics = [], isLoading: isTopicsLoading } = useQuery({
        queryKey: ['marketTopics', searchQuery, sortField],
        queryFn: () => getMarketTopics({ search: searchQuery, sort: sortField })
    });

    const { data: keywords = [], isLoading: isKeywordsLoading } = useQuery({
        queryKey: ['marketKeywords'],
        queryFn: () => getMarketKeywords()
    });

    const { data: opportunities = [], isLoading: isOpportunitiesLoading } = useQuery({
        queryKey: ['marketOpportunities'],
        queryFn: getMarketOpportunities
    });

    const { data: forecasts = [], isLoading: isForecastsLoading } = useQuery({
        queryKey: ['marketForecasts'],
        queryFn: getMarketForecast
    });

    const { data: selectedTopicDetails, isLoading: isTopicDetailsLoading } = useQuery({
        queryKey: ['marketTopicOpportunities', selectedTopicId],
        queryFn: () => getMarketTopicOpportunities(selectedTopicId!),
        enabled: !!selectedTopicId
    });

    // Mutations
    const refreshMutation = useMutation({
        mutationFn: refreshMarketIntelligence,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['marketTrends'] });
            queryClient.invalidateQueries({ queryKey: ['marketTopics'] });
            queryClient.invalidateQueries({ queryKey: ['marketKeywords'] });
            queryClient.invalidateQueries({ queryKey: ['marketOpportunities'] });
            queryClient.invalidateQueries({ queryKey: ['marketForecasts'] });
            if (selectedTopicId) {
                queryClient.invalidateQueries({ queryKey: ['marketTopicOpportunities', selectedTopicId] });
            }
            toast.success(`Refresh complete! Analyzed ${data.topics_analyzed} topics and collected ${data.keywords_collected} keywords in ${data.duration_ms}ms.`);
        },
        onError: () => {
            toast.error('Failed to refresh market intelligence data');
        }
    });

    const exportMutation = useMutation({
        mutationFn: (topicId: string) => exportOpportunityContext(topicId, activeAccountId || undefined),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['marketTopicOpportunities', selectedTopicId || ''] });
            setExportedPayload(data);
            toast.success('Opportunity sent successfully to AI Context Builder!');
        },
        onError: (err: any) => {
            toast.error(`Failed to send opportunity: ${err.response?.data?.detail || err.message}`);
        }
    });

    const exportTopicMutation = useMutation({
        mutationFn: (topicId: string) => exportTopicContext(topicId, activeAccountId || undefined),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['marketTopicOpportunities', selectedTopicId || ''] });
            setExportedPayload(data);
            toast.success('Topic sent successfully to AI Context Builder!');
        },
        onError: (err: any) => {
            toast.error(`Failed to send topic: ${err.response?.data?.detail || err.message}`);
        }
    });

    const syncMutation = useMutation({
        mutationFn: syncYoutubeAccounts,
        onSuccess: (data) => {
            toast.success(data.message);
            queryClient.invalidateQueries({ queryKey: ['youtubeActiveAccounts'] });
        },
        onError: () => {
            toast.error('Sync failed. Check channel OAuth status.');
        }
    });


    const handleCopyPayload = () => {
        if (exportedPayload) {
            navigator.clipboard.writeText(JSON.stringify(exportedPayload, null, 2));
            toast.success('Payload copied to clipboard');
        }
    };

    return (
        <div className="space-y-6 p-6 max-w-[1600px] mx-auto text-foreground">
            {/* Header section */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-border/60 pb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold flex items-center gap-2 text-primary tracking-tight">
                        <Compass className="w-8 h-8 text-destructive animate-spin-slow" />
                        Market Intelligence
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1.5">
                        Exclusively monitoring Long-form YouTube metrics, Google Trends, YouTube suggestions, and competitor coverage.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* YouTube Account Selector (SSOT) — menggantikan dropdown channel lokal */}
                    <YouTubeAccountSelector
                        activeAccountId={activeAccountId}
                        setActiveAccountId={setActiveAccountId}
                        accounts={youtubeAccounts}
                        isLoading={isAccountsLoading}
                        showSyncButton={true}
                        onSync={() => syncMutation.mutate()}
                        isSyncing={syncMutation.isPending}
                    />
                    <button
                        onClick={() => refreshMutation.mutate()}
                        disabled={refreshMutation.isPending}
                        className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-primary/90 flex items-center gap-2 transition-all shadow-md shadow-primary/10 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                        Refresh Market Data
                    </button>
                </div>
            </div>

            {/* Main Tabs */}
            <div className="border-b border-border/80">
                <nav className="flex flex-wrap gap-6" aria-label="Tabs">
                    {[
                        { id: 'trend_explorer', label: 'Trend Explorer', icon: TrendingUp },
                        { id: 'topic_radar', label: 'Topic Radar', icon: Compass },
                        { id: 'keywords', label: 'Keyword Intelligence', icon: BookOpen },
                        { id: 'competitor', label: 'Competitor Coverage', icon: Zap },
                        { id: 'opportunity_board', label: 'Opportunity Board', icon: Flame },
                        { id: 'forecast', label: 'Future Forecast', icon: LineChart }
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id as TabType);
                                    setSelectedTopicId(null);
                                }}
                                className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                                    active
                                        ? 'border-destructive text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Content Views */}
            <div className="min-h-[500px]">
                {/* 1. TREND EXPLORER */}
                {activeTab === 'trend_explorer' && (
                    <div className="space-y-6">
                        <div className="bg-card border border-border/60 rounded-xl p-6 shadow-sm">
                            <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
                                <TrendingUp className="text-red-500 w-5 h-5" />
                                Top Rising Search Trends
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                Real-time demand trends scraped from search autocomplete query velocity data.
                            </p>
                            
                            {isTrendsLoading ? (
                                <div className="py-12 flex justify-center"><RefreshCw className="animate-spin w-8 h-8 text-muted-foreground" /></div>
                            ) : trends.length === 0 ? (
                                <div className="py-12 text-center text-muted-foreground text-sm">No trends collected yet. Click Refresh Market Data to bootstrap trends.</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                                    {trends.slice(0, 15).map((trend, idx) => {
                                        const isPositive = trend.growth_rate >= 0;
                                        return (
                                            <div key={trend.id} className="bg-secondary/40 border border-border/40 p-4 rounded-xl flex items-center justify-between hover:border-border transition-all hover:bg-secondary/60">
                                                <div>
                                                    <span className="text-[10px] text-muted-foreground font-mono">#{idx+1} TREND</span>
                                                    <h4 className="font-bold text-sm text-foreground mt-0.5">{trend.keyword}</h4>
                                                    <p className="text-[11px] text-muted-foreground mt-1">Source: {trend.source}</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs font-mono font-semibold">Score: {trend.trend_score}</div>
                                                    <div className={`text-[11px] font-bold flex items-center justify-end gap-0.5 mt-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                                                        {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                                        {isPositive ? '+' : ''}{(trend.growth_rate * 100).toFixed(0)}%
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 2. TOPIC RADAR */}
                {activeTab === 'topic_radar' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* List / Cards column */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="bg-card border border-border/60 rounded-xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Search topics..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="bg-secondary/60 border border-border/80 pl-9 pr-4 py-2 rounded-lg text-sm w-full focus:outline-none focus:border-border"
                                    />
                                </div>
                                <div className="flex gap-2 items-center">
                                    <Filter className="w-4 h-4 text-muted-foreground" />
                                    <select
                                        value={sortField}
                                        onChange={(e) => setSortField(e.target.value)}
                                        className="bg-secondary/60 border border-border/80 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-border"
                                    >
                                        <option value="opportunity_score">Sort by Opportunity</option>
                                        <option value="trend_score">Sort by Trend</option>
                                        <option value="demand_score">Sort by Demand</option>
                                        <option value="competition_score">Sort by Competition</option>
                                    </select>
                                </div>
                            </div>

                            {isTopicsLoading ? (
                                <div className="py-12 flex justify-center"><RefreshCw className="animate-spin w-8 h-8 text-muted-foreground" /></div>
                            ) : topics.length === 0 ? (
                                <div className="py-12 text-center text-muted-foreground text-sm">No topics found matching search criteria.</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {topics.map((topic) => {
                                        const isSelected = selectedTopicId === topic.id;
                                        return (
                                            <div 
                                                key={topic.id}
                                                onClick={() => setSelectedTopicId(topic.id)}
                                                className={`bg-card border rounded-xl p-5 cursor-pointer hover:shadow-md transition-all flex flex-col justify-between ${
                                                    isSelected ? 'border-destructive shadow-sm shadow-destructive/10' : 'border-border/60'
                                                }`}
                                            >
                                                <div>
                                                    <div className="flex items-center justify-between">
                                                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                                                            topic.status === 'active' ? 'bg-green-500/10 text-green-500' :
                                                            topic.status === 'emerging' ? 'bg-blue-500/10 text-blue-500' :
                                                            'bg-amber-500/10 text-amber-500'
                                                        }`}>
                                                            {topic.status}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground font-mono">
                                                            Score: {topic.opportunity_score.toFixed(0)}
                                                        </span>
                                                    </div>
                                                    <h3 className="font-bold text-base mt-2 hover:text-destructive transition-colors">{topic.topic_name}</h3>
                                                </div>

                                                <div className="grid grid-cols-3 gap-2 border-t border-border/40 pt-4 mt-4 text-center">
                                                    <div>
                                                        <div className="text-[10px] text-muted-foreground uppercase font-semibold">Demand</div>
                                                        <div className="text-sm font-bold mt-0.5">{topic.demand_score.toFixed(0)}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] text-muted-foreground uppercase font-semibold">Comp.</div>
                                                        <div className="text-sm font-bold mt-0.5">{topic.competition_score.toFixed(0)}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] text-muted-foreground uppercase font-semibold">Forecast</div>
                                                        <div className="text-sm font-bold mt-0.5">{topic.forecast_score.toFixed(0)}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Details Panel column */}
                        <div className="bg-card border border-border/60 rounded-xl p-6 shadow-sm h-fit">
                            <h3 className="font-extrabold text-base border-b border-border/60 pb-3 flex items-center gap-2">
                                <Sparkles className="text-amber-500 w-5 h-5" />
                                Topic Details Inspector
                            </h3>
                            
                            {!selectedTopicId ? (
                                <div className="py-24 text-center text-muted-foreground text-xs flex flex-col items-center gap-2">
                                    <Compass className="w-8 h-8 text-muted-foreground/30 animate-pulse" />
                                    Select a topic card from Topic Radar to inspect detailed metrics, keyword clusters, and export history.
                                </div>
                            ) : isTopicDetailsLoading ? (
                                <div className="py-24 flex justify-center"><RefreshCw className="animate-spin w-6 h-6 text-muted-foreground" /></div>
                            ) : !selectedTopicDetails ? (
                                <div className="py-24 text-center text-muted-foreground text-xs">Failed to load topic details.</div>
                            ) : (
                                <div className="space-y-6 pt-4">
                                    <div>
                                        <h4 className="text-lg font-bold text-foreground">{selectedTopicDetails.topic_name}</h4>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className="text-[11px] text-muted-foreground">Status:</span>
                                            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                                                selectedTopicDetails.status === 'active' ? 'bg-green-500/10 text-green-500' :
                                                selectedTopicDetails.status === 'emerging' ? 'bg-blue-500/10 text-blue-500' :
                                                'bg-amber-500/10 text-amber-500'
                                            }`}>
                                                {selectedTopicDetails.status}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Stats grid */}
                                    <div className="grid grid-cols-2 gap-3 bg-secondary/30 p-4 rounded-xl border border-border/40">
                                        <div>
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Opportunity Score</span>
                                            <div className="text-xl font-extrabold text-primary font-mono mt-0.5">{selectedTopicDetails.opportunity_score}</div>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Competition Score</span>
                                            <div className="text-xl font-extrabold text-foreground font-mono mt-0.5">{selectedTopicDetails.competition_score}</div>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Demand Score</span>
                                            <div className="text-xl font-extrabold text-foreground font-mono mt-0.5">{selectedTopicDetails.demand_score}</div>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Forecast Score</span>
                                            <div className="text-xl font-extrabold text-foreground font-mono mt-0.5">{selectedTopicDetails.forecast_score}</div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => exportTopicMutation.mutate(selectedTopicDetails.topic_id)}
                                        disabled={exportTopicMutation.isPending || !activeAccountId}
                                        className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/10 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:from-muted disabled:to-muted disabled:text-muted-foreground"
                                    >
                                        <Share2 className="w-3.5 h-3.5" />
                                        {activeAccountId ? "Use In AI Context Builder" : "⚠ Select YouTube Account First"}
                                    </button>

                                    {/* Forecast Projection */}
                                    <div className="space-y-2 border-t border-border/40 pt-4">
                                        <h5 className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                                            <LineChart className="w-3.5 h-3.5 text-blue-500" /> Statistical Projections
                                        </h5>
                                        <div className="grid grid-cols-3 gap-2 bg-secondary/20 p-2.5 rounded-lg border border-border/40 text-center font-mono">
                                            <div>
                                                <div className="text-[9px] text-muted-foreground">T+7 Days</div>
                                                <div className="text-xs font-bold mt-0.5 text-blue-400">{selectedTopicDetails.forecast_history.forecast_7}</div>
                                            </div>
                                            <div>
                                                <div className="text-[9px] text-muted-foreground">T+30 Days</div>
                                                <div className="text-xs font-bold mt-0.5 text-blue-400">{selectedTopicDetails.forecast_history.forecast_30}</div>
                                            </div>
                                            <div>
                                                <div className="text-[9px] text-muted-foreground">T+90 Days</div>
                                                <div className="text-xs font-bold mt-0.5 text-blue-400">{selectedTopicDetails.forecast_history.forecast_90}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Keywords Cluster */}
                                    <div className="space-y-2 border-t border-border/40 pt-4">
                                        <h5 className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                                            <Database className="w-3.5 h-3.5 text-emerald-500" /> Clustered Keywords
                                        </h5>
                                        <div className="max-h-36 overflow-y-auto border border-border/40 rounded-lg p-2 bg-secondary/10 space-y-1.5 scrollbar-thin">
                                            {keywords.filter(k => k.topic_id === selectedTopicDetails.topic_id).map((k) => (
                                                <div key={k.id} className="flex justify-between items-center text-xs p-1.5 hover:bg-secondary/40 rounded transition-colors">
                                                    <span className="font-medium truncate pr-2">{k.keyword}</span>
                                                    <span className="text-[10px] font-mono text-muted-foreground shrink-0 bg-secondary/60 px-1.5 py-0.5 rounded">Vol: {k.search_volume}</span>
                                                </div>
                                            ))}
                                            {keywords.filter(k => k.topic_id === selectedTopicDetails.topic_id).length === 0 && (
                                                <div className="text-center py-4 text-[11px] text-muted-foreground">No linked keywords found.</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Exports History */}
                                    <div className="space-y-2 border-t border-border/40 pt-4">
                                        <h5 className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5 text-amber-500" /> Export Snapshot History
                                        </h5>
                                        <div className="max-h-32 overflow-y-auto space-y-1.5">
                                            {selectedTopicDetails.exports.map((e) => (
                                                <div key={e.id} className="text-[11px] bg-secondary/20 border border-border/40 rounded-lg p-2.5 flex justify-between items-center">
                                                    <div>
                                                        <div className="font-semibold text-foreground">Score: {e.opportunity_score}</div>
                                                        <div className="text-muted-foreground text-[10px] mt-0.5">Exported: {new Date(e.exported_at).toLocaleDateString()}</div>
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground font-mono bg-secondary/60 px-1.5 py-0.5 rounded">ID: {e.id.slice(0,8)}</span>
                                                </div>
                                            ))}
                                            {selectedTopicDetails.exports.length === 0 && (
                                                <div className="text-center py-4 text-[11px] text-muted-foreground">No prior exports found.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. KEYWORD INTELLIGENCE */}
                {activeTab === 'keywords' && (
                    <div className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-border/60 flex items-center gap-3 bg-secondary/20">
                            <BookOpen className="w-5 h-5 text-primary" />
                            <h3 className="font-bold text-base">Observed Keyword Table</h3>
                        </div>
                        {isKeywordsLoading ? (
                            <div className="py-24 flex justify-center"><RefreshCw className="animate-spin w-8 h-8 text-muted-foreground" /></div>
                        ) : keywords.length === 0 ? (
                            <div className="py-12 text-center text-muted-foreground text-sm">No keywords in dataset. Run Refresh to bootstrap.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-secondary/40 border-b border-border/60 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                            <th className="p-4">Keyword</th>
                                            <th className="p-4">Trend Score</th>
                                            <th className="p-4">Search Volume</th>
                                            <th className="p-4">Competition Score</th>
                                            <th className="p-4">Collected At</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40">
                                        {keywords.map((k) => (
                                            <tr key={k.id} className="hover:bg-secondary/20 transition-colors">
                                                <td className="p-4 font-bold text-foreground">{k.keyword}</td>
                                                <td className="p-4 font-mono">{k.trend_score}</td>
                                                <td className="p-4 font-mono">{k.search_volume.toFixed(0)}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                                        k.competition_score >= 70 ? 'bg-red-500/10 text-red-500' :
                                                        k.competition_score >= 40 ? 'bg-amber-500/10 text-amber-500' :
                                                        'bg-green-500/10 text-green-500'
                                                    }`}>
                                                        {k.competition_score.toFixed(0)}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-xs text-muted-foreground">{new Date(k.created_at).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* 4. COMPETITOR COVERAGE */}
                {activeTab === 'competitor' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* High Competition / Top Covered */}
                        <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                                <Zap className="text-red-500 w-5 h-5" />
                                <h3 className="font-extrabold text-base">Top Covered Topics</h3>
                            </div>
                            <p className="text-xs text-muted-foreground">Topics heavily targeted by competitors with high coverage counts.</p>
                            <div className="space-y-3">
                                {topics.filter(t => t.competition_score >= 70).map(t => (
                                    <div key={t.id} className="bg-secondary/20 border border-border/40 p-3 rounded-lg flex items-center justify-between">
                                        <div>
                                            <h4 className="font-bold text-xs text-foreground">{t.topic_name}</h4>
                                            <span className="text-[10px] text-muted-foreground font-mono">Comp Score: {t.competition_score}</span>
                                        </div>
                                        <span className="text-xs bg-red-500/10 text-red-500 font-bold px-2 py-0.5 rounded">High Comp</span>
                                    </div>
                                ))}
                                {topics.filter(t => t.competition_score >= 70).length === 0 && (
                                    <div className="text-center py-6 text-xs text-muted-foreground">No highly covered competitor topics.</div>
                                )}
                            </div>
                        </div>

                        {/* Emerging Competitor Coverage */}
                        <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                                <Sparkles className="text-blue-500 w-5 h-5" />
                                <h3 className="font-extrabold text-base">Emerging Niche Coverage</h3>
                            </div>
                            <p className="text-xs text-muted-foreground">Topics seeing recent spikes in competitor video publishing (last 30 days).</p>
                            <div className="space-y-3">
                                {topics.filter(t => t.status === 'emerging').map(t => (
                                    <div key={t.id} className="bg-secondary/20 border border-border/40 p-3 rounded-lg flex items-center justify-between">
                                        <div>
                                            <h4 className="font-bold text-xs text-foreground">{t.topic_name}</h4>
                                            <span className="text-[10px] text-muted-foreground font-mono">Comp Score: {t.competition_score}</span>
                                        </div>
                                        <span className="text-xs bg-blue-500/10 text-blue-500 font-bold px-2 py-0.5 rounded">Emerging</span>
                                    </div>
                                ))}
                                {topics.filter(t => t.status === 'emerging').length === 0 && (
                                    <div className="text-center py-6 text-xs text-muted-foreground">No emerging competitor topics detected.</div>
                                )}
                            </div>
                        </div>

                        {/* Underserved Topics / Ignored */}
                        <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                                <Flame className="text-green-500 w-5 h-5" />
                                <h3 className="font-extrabold text-base">Underserved Topics</h3>
                            </div>
                            <p className="text-xs text-muted-foreground">Topics ignored by competitors, representing massive market voids/gaps.</p>
                            <div className="space-y-3">
                                {topics.filter(t => t.competition_score < 40).map(t => (
                                    <div key={t.id} className="bg-secondary/20 border border-border/40 p-3 rounded-lg flex items-center justify-between">
                                        <div>
                                            <h4 className="font-bold text-xs text-foreground">{t.topic_name}</h4>
                                            <span className="text-[10px] text-muted-foreground font-mono">Comp Score: {t.competition_score}</span>
                                        </div>
                                        <span className="text-xs bg-green-500/10 text-green-500 font-bold px-2 py-0.5 rounded">High Opportunity</span>
                                    </div>
                                ))}
                                {topics.filter(t => t.competition_score < 40).length === 0 && (
                                    <div className="text-center py-6 text-xs text-muted-foreground">No underserved topics in dataset.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 5. OPPORTUNITY BOARD */}
                {activeTab === 'opportunity_board' && (
                    <div className="space-y-6">
                        <div className="bg-card border border-border/60 rounded-xl p-6 shadow-sm">
                            <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
                                <Flame className="text-destructive w-5 h-5" />
                                Opportunity Board
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                High-demand, low-competition topic clusters prioritized for Content Package integration.
                            </p>
                            
                            {isOpportunitiesLoading ? (
                                <div className="py-12 flex justify-center"><RefreshCw className="animate-spin w-8 h-8 text-muted-foreground" /></div>
                            ) : opportunities.length === 0 ? (
                                <div className="py-12 text-center text-muted-foreground text-sm">No active opportunities found. Check Topic Radar or run Refresh.</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                                    {opportunities.map((opp) => (
                                        <div key={opp.id} className="bg-secondary/30 border border-border/40 p-6 rounded-xl flex flex-col justify-between hover:border-destructive/40 transition-all shadow-sm">
                                            <div>
                                                <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4">
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                                        opp.status === 'emerging' ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'
                                                    }`}>
                                                        {opp.status}
                                                    </span>
                                                    <div className="flex items-center gap-1 font-mono text-xs">
                                                        <Flame className="w-3.5 h-3.5 text-destructive animate-pulse" />
                                                        <span className="font-extrabold text-foreground">{opp.opportunity_score.toFixed(0)} opp score</span>
                                                    </div>
                                                </div>
                                                <h3 className="font-extrabold text-lg text-foreground tracking-tight">{opp.topic_name}</h3>
                                                <p className="text-[11px] text-muted-foreground mt-1.5 font-mono">Slug: {opp.topic_slug}</p>
                                                
                                                <div className="grid grid-cols-3 gap-2 mt-5 bg-secondary/10 border border-border/40 rounded-lg p-3 text-center text-xs font-mono">
                                                    <div>
                                                        <div className="text-[9px] text-muted-foreground uppercase">Demand</div>
                                                        <div className="font-bold mt-0.5 text-foreground">{opp.demand_score.toFixed(0)}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[9px] text-muted-foreground uppercase">Comp.</div>
                                                        <div className="font-bold mt-0.5 text-foreground">{opp.competition_score.toFixed(0)}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[9px] text-muted-foreground uppercase">Forecast</div>
                                                        <div className="font-bold mt-0.5 text-foreground">{opp.forecast_score.toFixed(0)}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => exportMutation.mutate(opp.id)}
                                                disabled={exportMutation.isPending || !activeAccountId}
                                                className="mt-6 w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/10 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:from-muted disabled:to-muted disabled:text-muted-foreground"
                                            >
                                                <Share2 className="w-3.5 h-3.5" />
                                                {activeAccountId ? "Send To AI Context Builder" : "⚠ Select YouTube Account First"}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 6. FORECAST */}
                {activeTab === 'forecast' && (
                    <div className="space-y-6">
                        <div className="bg-card border border-border/60 rounded-xl p-6 shadow-sm">
                            <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
                                <LineChart className="text-blue-500 w-5 h-5" />
                                Future Search Forecast (7/30/90 Days)
                            </h2>
                            <p className="text-xs text-muted-foreground font-medium">
                                Projections generated via Linear Regression and Growth Velocity statistics.
                            </p>
                            
                            {isForecastsLoading ? (
                                <div className="py-12 flex justify-center"><RefreshCw className="animate-spin w-8 h-8 text-muted-foreground" /></div>
                            ) : forecasts.length === 0 ? (
                                <div className="py-12 text-center text-muted-foreground text-sm">No forecasts generated yet. Run refresh.</div>
                            ) : (
                                <div className="space-y-4 mt-6">
                                    {forecasts.map((forecast) => {
                                        const trendUp = forecast.forecast_90 > forecast.forecast_7;
                                        return (
                                            <div key={forecast.topic_id} className="bg-secondary/20 border border-border/40 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                                <div className="space-y-1">
                                                    <h3 className="font-bold text-base text-foreground">{forecast.topic_name}</h3>
                                                    <span className={`text-[10px] font-bold flex items-center gap-0.5 ${trendUp ? 'text-green-500' : 'text-amber-500'}`}>
                                                        {trendUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                                                        {trendUp ? 'Rising Projection' : 'Stabilizing Projection'}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-6 font-mono text-center shrink-0 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                                                    <div className="bg-secondary/40 border border-border/60 rounded-lg px-4 py-2 min-w-[90px]">
                                                        <div className="text-[9px] text-muted-foreground uppercase font-bold">7-Day</div>
                                                        <div className="text-sm font-bold text-foreground mt-0.5">{forecast.forecast_7}</div>
                                                    </div>
                                                    <div className="bg-secondary/40 border border-border/60 rounded-lg px-4 py-2 min-w-[90px]">
                                                        <div className="text-[9px] text-muted-foreground uppercase font-bold">30-Day</div>
                                                        <div className="text-sm font-bold text-foreground mt-0.5">{forecast.forecast_30}</div>
                                                    </div>
                                                    <div className="bg-secondary/40 border border-border/60 rounded-lg px-4 py-2 min-w-[90px]">
                                                        <div className="text-[9px] text-muted-foreground uppercase font-bold">90-Day</div>
                                                        <div className="text-sm font-bold text-foreground mt-0.5">{forecast.forecast_90}</div>
                                                    </div>
                                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-2 min-w-[90px]">
                                                        <div className="text-[9px] text-blue-500 uppercase font-bold">Index</div>
                                                        <div className="text-sm font-bold text-blue-400 mt-0.5">{forecast.forecast_score}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Export Dialog Modal */}
            {exportedPayload && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
                    <div className="bg-card border border-border/80 rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">
                        <div className="p-5 border-b border-border/60 flex items-center justify-between bg-secondary/30">
                            <h3 className="font-extrabold text-base flex items-center gap-2">
                                <Share2 className="text-indigo-500 w-5 h-5" />
                                Exported Opportunity Package
                            </h3>
                            <button 
                                onClick={() => setExportedPayload(null)}
                                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary transition-all"
                            >
                                Close
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-xs text-muted-foreground">
                                This payload has been persisted under a unique snapshot ID in `analytics_opportunity_exports`. This represents the formal contract for Sprint E.
                            </p>
                            
                            <div className="relative">
                                <pre className="bg-secondary/80 border border-border/80 rounded-xl p-4 text-xs font-mono text-foreground overflow-x-auto max-h-60 scrollbar-thin">
                                    {JSON.stringify(exportedPayload, null, 2)}
                                </pre>
                                <button
                                    onClick={handleCopyPayload}
                                    className="absolute top-3 right-3 bg-card border border-border/80 hover:bg-secondary p-2 rounded-lg text-muted-foreground hover:text-foreground transition-all shadow-sm"
                                    title="Copy payload"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="p-4 bg-secondary/20 border-t border-border/60 flex justify-end">
                            <button
                                onClick={() => setExportedPayload(null)}
                                className="bg-primary text-primary-foreground px-5 py-2 rounded-lg font-bold text-xs hover:bg-primary/90 transition-all"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
