import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    getChannelSummary, 
    getChannelTimeline, 
    getChannelVideos, 
    syncAnalyticsChannel,
    getChannelInsights,
    refreshChannelInsights,
    updateInsightStatus,
    exportInsightContext
} from '../services/api';
import { 
    TrendingUp, 
    RefreshCw, 
    Users, 
    CheckCircle2, 
    AlertCircle, 
    Clock, 
    Calendar, 
    ShieldAlert, 
    Search, 
    ChevronLeft,
    Activity,
    Award,
    Zap,
    Cpu,
    Trash2,
    ExternalLink,
    Share2
} from 'lucide-react';
import { toast } from 'sonner';
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer 
} from 'recharts';


type ExplorerTab = 'overview' | 'growth' | 'videos' | 'top_videos' | 'pattern' | 'diagnostics' | 'insights';

export default function AnalyticsChannelExplorer() {
    const { id } = useParams<{ id: string }>();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<ExplorerTab>('overview');
    const [range, setRange] = useState<string>('30');
    
    // Video Tab Filters
    const [videoSearch, setVideoSearch] = useState('');
    const [videoSort, setVideoSort] = useState('newest');
    const [videoPage, setVideoPage] = useState(1);
    const videoLimit = 10;
    const [insightFilter, setInsightFilter] = useState<'all' | 'risks' | 'growth' | 'opportunities'>('all');

    // Fetch Summary (First paint entrypoint - staleTime 5m)
    const { data: summary, isLoading: isSummaryLoading } = useQuery({
        queryKey: ['channelSummary', id],
        queryFn: () => getChannelSummary(id!),
        enabled: !!id,
        staleTime: 5 * 60 * 1000
    });

    // Fetch Timeline (Lazy load on 'growth' tab - staleTime 5m)
    const { data: timelineData, isLoading: isTimelineLoading } = useQuery({
        queryKey: ['channelTimeline', id, range],
        queryFn: () => getChannelTimeline(id!, range),
        enabled: activeTab === 'growth' && !!id,
        staleTime: 5 * 60 * 1000
    });

    // Fetch Videos (Lazy load on 'videos' or 'top_videos' tab - staleTime 1m)
    const { data: videosData = [], isLoading: isVideosLoading } = useQuery({
        queryKey: ['channelVideos', id, videoSort, videoSearch, videoPage],
        queryFn: () => getChannelVideos(id!, { 
            sort: videoSort, 
            query: videoSearch || undefined, 
            page: videoPage, 
            limit: videoLimit 
        }),
        enabled: (activeTab === 'videos') && !!id,
        staleTime: 1 * 60 * 1000
    });

    // Fetch Preset top lists (Lazy load on 'top_videos' tab - staleTime 1m)
    const { data: topViews = [] } = useQuery({
        queryKey: ['channelTopViews', id],
        queryFn: () => getChannelVideos(id!, { sort: 'views', limit: 5 }),
        enabled: activeTab === 'top_videos' && !!id,
        staleTime: 1 * 60 * 1000
    });
    const { data: topLikes = [] } = useQuery({
        queryKey: ['channelTopLikes', id],
        queryFn: () => getChannelVideos(id!, { sort: 'likes', limit: 5 }),
        enabled: activeTab === 'top_videos' && !!id,
        staleTime: 1 * 60 * 1000
    });
    const { data: topComments = [] } = useQuery({
        queryKey: ['channelTopComments', id],
        queryFn: () => getChannelVideos(id!, { sort: 'comments', limit: 5 }),
        enabled: activeTab === 'top_videos' && !!id,
        staleTime: 1 * 60 * 1000
    });

    // Sync mutation
    const syncMutation = useMutation({
        mutationFn: (channelId: string) => syncAnalyticsChannel(channelId),
        onSuccess: () => {
            toast.success("Sync task queued successfully");
            queryClient.invalidateQueries({ queryKey: ['channelSummary', id] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.detail || "Failed to trigger sync");
        }
    });

    // Fetch Insights (Lazy load on 'insights' tab - staleTime 5m)
    const { data: insights = [], isLoading: isInsightsLoading } = useQuery({
        queryKey: ['channelInsights', id],
        queryFn: () => getChannelInsights(id!),
        enabled: activeTab === 'insights' && !!id,
        staleTime: 5 * 60 * 1000
    });

    // Refresh Insights mutation
    const refreshInsightsMutation = useMutation({
        mutationFn: (channelId: string) => refreshChannelInsights(channelId),
        onSuccess: (data) => {
            toast.success(`Insights refreshed: ${data.generated} active, ${data.removed} archived in ${data.duration_ms}ms`);
            queryClient.invalidateQueries({ queryKey: ['channelInsights', id] });
            queryClient.invalidateQueries({ queryKey: ['channelSummary', id] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.detail || "Failed to refresh insights");
        }
    });

    // Dismiss Insight mutation
    const dismissInsightMutation = useMutation({
        mutationFn: ({ insightId, status }: { insightId: string, status: string }) => updateInsightStatus(insightId, status),
        onSuccess: () => {
            toast.success("Insight dismissed successfully");
            queryClient.invalidateQueries({ queryKey: ['channelInsights', id] });
            queryClient.invalidateQueries({ queryKey: ['channelSummary', id] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.detail || "Failed to dismiss insight");
        }
    });

    const exportInsightMutation = useMutation({
        mutationFn: (insightId: string) => exportInsightContext(insightId),
        onSuccess: () => {
            toast.success("Insight sent successfully to AI Context Builder!");
        },
        onError: (err: any) => {
            toast.error(`Failed to send insight: ${err.response?.data?.detail || err.message}`);
        }
    });


    const [growthMetric, setGrowthMetric] = useState<'subscribers' | 'views' | 'watch_time'>('views');

    if (isSummaryLoading || !summary) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="text-sm text-muted-foreground">Loading explorer details...</p>
            </div>
        );
    }

    const { channel, overview, publishing_pattern: pattern, diagnostics, meta } = summary;
    const isOwned = channel.analytics_type === 'owned';

    return (
        <div className="container mx-auto p-6 space-y-6 max-w-7xl text-foreground">
            
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <Link to="/analytics" className="hover:text-indigo-400 transition-colors flex items-center gap-1">
                    <ChevronLeft className="w-3 h-3" /> Analytics Hub
                </Link>
                <span>/</span>
                <span className="text-indigo-400">Channel Explorer</span>
                <span>/</span>
                <span className="text-foreground max-w-[200px] truncate">{channel.channel_name}</span>
            </nav>

            {/* Header section */}
            <div className="bg-secondary/15 border border-border p-6 rounded-xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="space-y-2 relative z-10">
                    <div className="flex items-center flex-wrap gap-3">
                        <h1 className="text-2xl font-extrabold tracking-tight">{channel.channel_name}</h1>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            channel.analytics_type === 'owned' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                            channel.analytics_type === 'competitor' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                            'bg-teal-500/10 text-teal-400 border-teal-500/20'
                        }`}>
                            {channel.analytics_type}
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground font-mono">{channel.channel_handle || channel.external_channel_id}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pt-1">
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {overview.subscribers?.toLocaleString() || 0} Subscribers</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Observed since {new Date(channel.created_at).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Last sync: {channel.last_sync_at ? new Date(channel.last_sync_at).toLocaleString() : 'Never'}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3 relative z-10">
                    <div className="flex flex-col">
                        <label className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Time Range</label>
                        <select 
                            value={range} 
                            onChange={(e) => setRange(e.target.value)}
                            className="bg-secondary/40 border border-border px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-500"
                        >
                            <option value="7">Last 7 Days</option>
                            <option value="30">Last 30 Days</option>
                            <option value="90">Last 90 Days</option>
                            <option value="all">All Time</option>
                        </select>
                    </div>

                    <button 
                        onClick={() => syncMutation.mutate(channel.id)}
                        disabled={syncMutation.isPending || channel.sync_status === 'syncing'}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition-all self-end"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${(syncMutation.isPending || channel.sync_status === 'syncing') ? 'animate-spin' : ''}`} />
                        Sync Now
                    </button>
                </div>
            </div>

            {/* Tab navigation */}
            <div className="flex border-b border-border overflow-x-auto pb-px">
                {(['overview', 'growth', 'videos', 'top_videos', 'pattern', 'diagnostics', 'insights'] as ExplorerTab[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-5 py-3 text-xs font-bold border-b-2 whitespace-nowrap capitalize transition-all ${
                            activeTab === tab 
                                ? 'border-indigo-500 text-indigo-400' 
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {tab.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="space-y-6">

                {/* 1. OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-secondary/10 border border-border p-6 rounded-xl hover:border-border/40 transition-all">
                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Views</p>
                            <p className="text-2xl font-black font-mono mt-2">{overview.views?.toLocaleString() || 0}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">Snapshot value</p>
                        </div>
                        <div className="bg-secondary/10 border border-border p-6 rounded-xl hover:border-border/40 transition-all">
                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Subscribers</p>
                            <p className="text-2xl font-black font-mono mt-2">{overview.subscribers?.toLocaleString() || 0}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">Target benchmark</p>
                        </div>
                        <div className="bg-secondary/10 border border-border p-6 rounded-xl hover:border-border/40 transition-all">
                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Likes</p>
                            <p className="text-2xl font-black font-mono mt-2">{overview.likes?.toLocaleString() || 0}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">Sum of observed videos</p>
                        </div>
                        <div className="bg-secondary/10 border border-border p-6 rounded-xl hover:border-border/40 transition-all">
                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Comments</p>
                            <p className="text-2xl font-black font-mono mt-2">{overview.comments?.toLocaleString() || 0}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">Audience engagement</p>
                        </div>

                        {/* Owned Private Metrics Card */}
                        <div className="bg-secondary/10 border border-border p-6 rounded-xl md:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-6 relative overflow-hidden">
                            {!isOwned && (
                                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 z-10">
                                    <ShieldAlert className="w-8 h-8 text-amber-500 mb-2" />
                                    <h4 className="font-bold text-sm">Metrik Privat Disembunyikan</h4>
                                    <p className="text-xs text-muted-foreground mt-1 max-w-md">Impressions, CTR, dan Watch Time hanya dapat diakses pada channel yang Anda miliki (Owned Channel) dan telah ditautkan dengan OAuth.</p>
                                </div>
                            )}

                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Impressions</p>
                                <p className="text-2xl font-black font-mono mt-2">{overview.impressions?.toLocaleString() || 0}</p>
                                <p className="text-[10px] text-indigo-400 mt-1">Private reach metric</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">CTR (Click-Through Rate)</p>
                                <p className="text-2xl font-black font-mono mt-2">{overview.ctr ? `${overview.ctr.toFixed(2)}%` : '0.00%'}</p>
                                <p className="text-[10px] text-indigo-400 mt-1">Thumbnail efficiency</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Watch Time</p>
                                <p className="text-2xl font-black font-mono mt-2">{overview.watch_time ? `${overview.watch_time.toLocaleString()} hrs` : '0 hrs'}</p>
                                <p className="text-[10px] text-indigo-400 mt-1">Audience retention summary</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. GROWTH TAB (Timeline) */}
                {activeTab === 'growth' && (
                    <div className="space-y-6">
                        {/* Selector & Velocity Stats */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-secondary/10 border border-border p-6 rounded-xl">
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => setGrowthMetric('views')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                        growthMetric === 'views' 
                                            ? 'bg-indigo-600 border-indigo-500 text-white' 
                                            : 'bg-secondary/40 border-border text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    Views
                                </button>
                                <button 
                                    onClick={() => setGrowthMetric('subscribers')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                        growthMetric === 'subscribers' 
                                            ? 'bg-indigo-600 border-indigo-500 text-white' 
                                            : 'bg-secondary/40 border-border text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    Subscribers
                                </button>
                                {isOwned && (
                                    <button 
                                        onClick={() => setGrowthMetric('watch_time')}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                            growthMetric === 'watch_time' 
                                                ? 'bg-indigo-600 border-indigo-500 text-white' 
                                                : 'bg-secondary/40 border-border text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Watch Time
                                    </button>
                                )}
                            </div>

                            {/* Velocity Stats */}
                            {timelineData && (
                                <div className="flex items-center gap-8 text-xs">
                                    <div>
                                        <p className="text-muted-foreground font-bold">Subscribers delta</p>
                                        <p className="font-mono text-sm font-bold mt-1">
                                            {timelineData.subscriber_delta >= 0 ? '+' : ''}
                                            {timelineData.subscriber_delta.toLocaleString()}{' '}
                                            <span className={`text-[10px] ${timelineData.subscriber_growth_rate >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                ({timelineData.subscriber_growth_rate}%)
                                            </span>
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground font-bold">Views delta</p>
                                        <p className="font-mono text-sm font-bold mt-1">
                                            {timelineData.view_delta >= 0 ? '+' : ''}
                                            {timelineData.view_delta.toLocaleString()}{' '}
                                            <span className={`text-[10px] ${timelineData.view_growth_rate >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                ({timelineData.view_growth_rate}%)
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Chart Area */}
                        <div className="bg-secondary/5 border border-border p-6 rounded-xl h-[400px]">
                            {isTimelineLoading ? (
                                <div className="flex items-center justify-center h-full gap-2">
                                    <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                                    <span className="text-xs text-muted-foreground">Loading chart timeline...</span>
                                </div>
                            ) : !timelineData || timelineData.timeline.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
                                    <TrendingUp className="w-8 h-8 mb-2" />
                                    <p className="text-xs font-semibold">No snapshot data available for this range</p>
                                    <p className="text-[10px] mt-0.5">Please sync the channel to generate performance snapshot records.</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={timelineData.timeline}>
                                        <defs>
                                            <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2e3f" />
                                        <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                                        <YAxis stroke="#6b7280" style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1e2230', borderColor: '#2e334a', color: '#fff', fontSize: '11px', borderRadius: '8px' }} 
                                            labelStyle={{ fontWeight: 'bold', color: '#818cf8' }}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey={growthMetric} 
                                            stroke="#6366f1" 
                                            strokeWidth={2}
                                            fillOpacity={1} 
                                            fill="url(#colorMetric)" 
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. VIDEOS TAB (Explorer) */}
                {activeTab === 'videos' && (
                    <div className="space-y-6">
                        
                        {/* Search & Sort Panel */}
                        <div className="flex flex-col sm:flex-row items-center gap-4 bg-secondary/15 p-4 border border-border rounded-xl">
                            <div className="relative w-full sm:flex-1">
                                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                                <input 
                                    type="text" 
                                    placeholder="Search observed videos by title..." 
                                    value={videoSearch}
                                    onChange={(e) => { setVideoSearch(e.target.value); setVideoPage(1); }}
                                    className="bg-secondary/40 border border-border pl-10 pr-4 py-2 w-full rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <select 
                                    value={videoSort}
                                    onChange={(e) => { setVideoSort(e.target.value); setVideoPage(1); }}
                                    className="bg-secondary/40 border border-border px-3 py-2 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-500 w-full sm:w-40"
                                >
                                    <option value="newest">Sort by Newest</option>
                                    <option value="views">Sort by Views</option>
                                    <option value="likes">Sort by Likes</option>
                                    <option value="comments">Sort by Comments</option>
                                </select>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="bg-secondary/5 border border-border rounded-xl overflow-hidden">
                            {isVideosLoading ? (
                                <div className="p-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" /> Loading video explorer...
                                </div>
                            ) : videosData.length === 0 ? (
                                <div className="p-12 text-center text-xs text-muted-foreground">
                                    No videos found matching your filters.
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-border bg-secondary/20 text-xs font-bold text-muted-foreground">
                                            <th className="p-4 w-[8%]">Thumbnail</th>
                                            <th className="p-4 w-[52%]">Video Title</th>
                                            <th className="p-4 w-[12%] text-right">Views</th>
                                            <th className="p-4 w-[10%] text-right">Likes</th>
                                            <th className="p-4 w-[10%] text-right">Comments</th>
                                            <th className="p-4 w-[8%] text-right">Published</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border text-xs">
                                        {videosData.map((video) => (
                                            <tr key={video.id} className="hover:bg-secondary/10 transition-colors">
                                                <td className="p-4">
                                                    <img 
                                                        src={video.thumbnail_url || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=120&auto=format&fit=crop&q=60'} 
                                                        alt="thumb" 
                                                        className="w-14 h-8 object-cover rounded border border-border bg-secondary"
                                                    />
                                                </td>
                                                <td className="p-4">
                                                    <p className="font-bold text-foreground hover:text-indigo-400 transition-colors line-clamp-2" title={video.title}>
                                                        {video.title}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground font-mono mt-1">{video.external_video_id}</p>
                                                </td>
                                                <td className="p-4 text-right font-mono font-semibold">{video.views?.toLocaleString() || 0}</td>
                                                <td className="p-4 text-right font-mono text-muted-foreground">{video.likes?.toLocaleString() || 0}</td>
                                                <td className="p-4 text-right font-mono text-muted-foreground">{video.comments?.toLocaleString() || 0}</td>
                                                <td className="p-4 text-right font-medium text-muted-foreground whitespace-nowrap">
                                                    {new Date(video.published_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                            <button 
                                disabled={videoPage === 1}
                                onClick={() => setVideoPage(prev => Math.max(1, prev - 1))}
                                className="bg-secondary/30 border border-border px-3 py-1.5 rounded-lg font-bold hover:bg-secondary/50 disabled:opacity-30 transition-all"
                            >
                                Previous
                            </button>
                            <span className="font-bold font-mono">Page {videoPage}</span>
                            <button 
                                disabled={videosData.length < videoLimit}
                                onClick={() => setVideoPage(prev => prev + 1)}
                                className="bg-secondary/30 border border-border px-3 py-1.5 rounded-lg font-bold hover:bg-secondary/50 disabled:opacity-30 transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}

                {/* 4. TOP VIDEOS TAB */}
                {activeTab === 'top_videos' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Top by Views */}
                        <div className="bg-secondary/5 border border-border p-6 rounded-xl space-y-4">
                            <h4 className="font-extrabold text-sm flex items-center gap-2 text-indigo-400">
                                <Zap className="w-4 h-4" /> Top 5 Views
                            </h4>
                            <div className="space-y-3">
                                {topViews.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">No videos found</p>
                                ) : topViews.map((video, idx) => (
                                    <div key={video.id} className="flex gap-3 text-xs bg-secondary/20 p-2.5 rounded-lg border border-border/40 hover:border-indigo-500/30 transition-all">
                                        <span className="font-black font-mono text-indigo-400/80 w-4 self-center">{idx + 1}</span>
                                        <img src={video.thumbnail_url} alt="thumb" className="w-12 h-8 object-cover rounded bg-secondary self-center" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold truncate" title={video.title}>{video.title}</p>
                                            <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{video.views?.toLocaleString()} views</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Top by Likes */}
                        <div className="bg-secondary/5 border border-border p-6 rounded-xl space-y-4">
                            <h4 className="font-extrabold text-sm flex items-center gap-2 text-emerald-400">
                                <Award className="w-4 h-4" /> Top 5 Likes
                            </h4>
                            <div className="space-y-3">
                                {topLikes.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">No videos found</p>
                                ) : topLikes.map((video, idx) => (
                                    <div key={video.id} className="flex gap-3 text-xs bg-secondary/20 p-2.5 rounded-lg border border-border/40 hover:border-emerald-500/30 transition-all">
                                        <span className="font-black font-mono text-emerald-400/80 w-4 self-center">{idx + 1}</span>
                                        <img src={video.thumbnail_url} alt="thumb" className="w-12 h-8 object-cover rounded bg-secondary self-center" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold truncate" title={video.title}>{video.title}</p>
                                            <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{video.likes?.toLocaleString()} likes</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Top by Comments */}
                        <div className="bg-secondary/5 border border-border p-6 rounded-xl space-y-4">
                            <h4 className="font-extrabold text-sm flex items-center gap-2 text-purple-400">
                                <Activity className="w-4 h-4" /> Top 5 Comments
                            </h4>
                            <div className="space-y-3">
                                {topComments.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">No videos found</p>
                                ) : topComments.map((video, idx) => (
                                    <div key={video.id} className="flex gap-3 text-xs bg-secondary/20 p-2.5 rounded-lg border border-border/40 hover:border-purple-500/30 transition-all">
                                        <span className="font-black font-mono text-purple-400/80 w-4 self-center">{idx + 1}</span>
                                        <img src={video.thumbnail_url} alt="thumb" className="w-12 h-8 object-cover rounded bg-secondary self-center" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold truncate" title={video.title}>{video.title}</p>
                                            <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{video.comments?.toLocaleString()} comments</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                )}

                {/* 5. PUBLISHING PATTERN TAB */}
                {activeTab === 'pattern' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Score and Habit */}
                        <div className="bg-secondary/5 border border-border p-6 rounded-xl flex flex-col justify-between space-y-6">
                            <div>
                                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Consistency Score</h4>
                                <div className="flex items-center gap-4 mt-3">
                                    <div className="relative w-16 h-16 rounded-full border-4 border-secondary flex items-center justify-center font-black font-mono text-lg"
                                        style={{ borderTopColor: '#6366f1' }}
                                    >
                                        {pattern.consistency_score}%
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold">Posting Frequency</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">Stability of upload schedule</p>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-border pt-4">
                                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Posting Habit</h4>
                                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 capitalize">
                                    {pattern.posting_habit}
                                </span>
                            </div>
                        </div>

                        {/* Raw Stats */}
                        <div className="bg-secondary/5 border border-border p-6 rounded-xl md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="bg-secondary/10 border border-border/40 p-4 rounded-lg">
                                <p className="text-xs text-muted-foreground font-bold uppercase">Average Upload Interval</p>
                                <p className="text-2xl font-black font-mono mt-1">{pattern.average_interval_days} days</p>
                                <p className="text-[10px] text-muted-foreground mt-1">Mean duration between uploads</p>
                            </div>
                            <div className="bg-secondary/10 border border-border/40 p-4 rounded-lg">
                                <p className="text-xs text-muted-foreground font-bold uppercase">Interval StdDev</p>
                                <p className="text-2xl font-black font-mono mt-1">{pattern.interval_stddev} days</p>
                                <p className="text-[10px] text-muted-foreground mt-1">Deviation from average pattern</p>
                            </div>
                            <div className="bg-secondary/10 border border-border/40 p-4 rounded-lg">
                                <p className="text-xs text-muted-foreground font-bold uppercase">Most Active Upload Day</p>
                                <p className="text-2xl font-black mt-1">{pattern.most_active_day}</p>
                                <p className="text-[10px] text-muted-foreground mt-1">Day with highest publication density</p>
                            </div>
                            <div className="bg-secondary/10 border border-border/40 p-4 rounded-lg">
                                <p className="text-xs text-muted-foreground font-bold uppercase">Most Active Upload Hour</p>
                                <p className="text-2xl font-black font-mono mt-1">{pattern.most_active_hour.toString().padStart(2, '0')}:00</p>
                                <p className="text-[10px] text-muted-foreground mt-1">Target upload hour slot</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 6. DIAGNOSTICS TAB */}
                {activeTab === 'diagnostics' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        {/* Health Score Gauge */}
                        <div className="bg-secondary/5 border border-border p-6 rounded-xl flex flex-col items-center justify-center text-center space-y-4">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider self-start">Collector Health Score</h4>
                            <div className="relative w-32 h-32 flex items-center justify-center rounded-full border-[6px] border-secondary"
                                style={{ borderTopColor: diagnostics.collector_health_score > 70 ? '#10b981' : diagnostics.collector_health_score > 40 ? '#f59e0b' : '#ef4444' }}
                            >
                                <div className="text-center">
                                    <p className="text-3xl font-black font-mono leading-none">{diagnostics.collector_health_score}</p>
                                    <p className="text-[9px] text-muted-foreground font-bold mt-1 uppercase">Points</p>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground max-w-[200px]">
                                Calculated based on standard cron sync stability and error counts.
                            </p>
                        </div>

                        {/* Diagnostics list */}
                        <div className="bg-secondary/5 border border-border p-6 rounded-xl md:col-span-2 space-y-6">
                            <div className="flex items-center justify-between border-b border-border pb-3">
                                <div>
                                    <h4 className="text-sm font-bold">Collector Engine</h4>
                                    <p className="text-xs text-muted-foreground mt-0.5">Software runtime description</p>
                                </div>
                                <span className="font-mono text-xs text-indigo-400 font-bold">{meta.collector_version}</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground font-bold uppercase">Sync Status</p>
                                    <div className="flex items-center gap-1.5 pt-1">
                                        {diagnostics.sync_status === 'success' ? (
                                            <>
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                <span className="text-xs font-bold uppercase text-emerald-400">Success</span>
                                            </>
                                        ) : diagnostics.sync_status === 'syncing' ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
                                                <span className="text-xs font-bold uppercase text-indigo-400">Syncing</span>
                                            </>
                                        ) : (
                                            <>
                                                <AlertCircle className="w-4 h-4 text-rose-400" />
                                                <span className="text-xs font-bold uppercase text-rose-400">{diagnostics.sync_status || 'Failed'}</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground font-bold uppercase">Last Sync Duration</p>
                                    <p className="text-sm font-mono font-bold mt-1">
                                        {diagnostics.last_sync_duration_seconds ? `${diagnostics.last_sync_duration_seconds} seconds` : '0 seconds'}
                                    </p>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground font-bold uppercase">Last Successful Sync</p>
                                    <p className="text-sm font-mono font-bold mt-1 text-muted-foreground">
                                        {diagnostics.last_successful_sync_at ? new Date(diagnostics.last_successful_sync_at).toLocaleString() : 'No record'}
                                    </p>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground font-bold uppercase">Last Failed Sync</p>
                                    <p className="text-sm font-mono font-bold mt-1 text-rose-400/80">
                                        {diagnostics.last_failed_sync_at ? new Date(diagnostics.last_failed_sync_at).toLocaleString() : 'No record'}
                                    </p>
                                </div>
                            </div>

                            {diagnostics.last_error && (
                                <div className="border-t border-border pt-4 mt-2">
                                    <p className="text-xs text-rose-400 font-bold uppercase mb-2">Last Sync Error Log</p>
                                    <pre className="bg-rose-500/5 border border-rose-500/10 p-3 rounded-lg text-[10px] text-rose-300 font-mono overflow-x-auto whitespace-pre-wrap">
                                        {diagnostics.last_error}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 7. LIVE INSIGHT ENGINE TAB */}
                {activeTab === 'insights' && (() => {
                    const activeInsights = insights.filter(ins => ins.status === 'active');
                    const criticalCount = activeInsights.filter(ins => ins.severity === 'Critical').length;
                    const highCount = activeInsights.filter(ins => ins.severity === 'High').length;
                    const mediumCount = activeInsights.filter(ins => ins.severity === 'Medium').length;
                    const lowCount = activeInsights.filter(ins => ins.severity === 'Low').length;

                    const getInsightAge = (firstDetectedStr: string) => {
                        const firstDetected = new Date(firstDetectedStr);
                        const now = new Date();
                        const diffMs = now.getTime() - firstDetected.getTime();
                        const diffMins = Math.floor(diffMs / (1000 * 60));
                        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                        
                        if (diffDays > 0) return `Detected ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
                        if (diffHours > 0) return `Detected ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
                        if (diffMins > 0) return `Detected ${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
                        return 'Detected just now';
                    };

                    const getSeverityStyles = (severity: string) => {
                        switch (severity) {
                            case 'Critical':
                                return 'bg-red-500/10 text-red-400 border-red-500/20';
                            case 'High':
                                return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
                            case 'Medium':
                                return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
                            case 'Low':
                                return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
                            default:
                                return 'bg-secondary/20 text-muted-foreground border-border';
                        }
                    };

                    const handleDeepLink = (_entityId: string, title: string) => {
                        const videoTitle = title.replace(/^(Low CTR Thumbnail:\s*|High Growth Opportunity:\s*)/i, '');
                        setVideoSearch(videoTitle);
                        setVideoSort('newest');
                        setVideoPage(1);
                        setActiveTab('videos');
                        toast.info(`Filtering videos tab for: "${videoTitle}"`);
                    };

                    const filteredInsights = activeInsights.filter(ins => {
                        if (insightFilter === 'risks') return ['growth_decline', 'thumbnail_warning', 'subscriber_decline'].includes(ins.insight_type);
                        if (insightFilter === 'growth') return ['competitor_outperforming', 'upload_frequency', 'subscriber_acceleration'].includes(ins.insight_type);
                        if (insightFilter === 'opportunities') return ['content_opportunity', 'growth_opportunity'].includes(ins.insight_type);
                        return true;
                    });

                    return (
                        <div className="space-y-6">
                            
                            {/* Summary Widget & Refresh Bar */}
                            <div className="bg-secondary/15 border border-border p-6 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                                
                                <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
                                    <div className="p-3 bg-indigo-600/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                                        <Cpu className="w-8 h-8" />
                                    </div>
                                    <div className="space-y-1 text-center sm:text-left">
                                        <h3 className="text-lg font-black tracking-tight text-indigo-400 flex items-center gap-2 justify-center sm:justify-start">
                                            Performance Insight Engine <span className="text-xs font-mono bg-indigo-500/15 px-2 py-0.5 rounded text-indigo-300">v1.0</span>
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            Deterministis rule-based engine yang memindai channel metrics, upload frequency, CTR, competitor median, dan growth opportunities.
                                        </p>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => refreshInsightsMutation.mutate(channel.id)}
                                    disabled={refreshInsightsMutation.isPending || isInsightsLoading}
                                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition-all z-10 shrink-0"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${refreshInsightsMutation.isPending ? 'animate-spin' : ''}`} />
                                    Refresh Insights
                                </button>
                            </div>

                            {/* Severity Metrics Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-xl text-center">
                                    <p className="text-2xl font-black font-mono text-red-400">{criticalCount}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Critical Alerts</p>
                                </div>
                                <div className="bg-orange-500/5 border border-orange-500/10 p-4 rounded-xl text-center">
                                    <p className="text-2xl font-black font-mono text-orange-400">{highCount}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">High Risk</p>
                                </div>
                                <div className="bg-yellow-500/5 border border-yellow-500/10 p-4 rounded-xl text-center">
                                    <p className="text-2xl font-black font-mono text-yellow-400">{mediumCount}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Medium Warning</p>
                                </div>
                                <div className="bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-xl text-center">
                                    <p className="text-2xl font-black font-mono text-indigo-400">{lowCount}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Low Priority</p>
                                </div>
                            </div>

                            {/* Filter tabs */}
                            <div className="flex border-b border-border gap-2">
                                {(['all', 'risks', 'growth', 'opportunities'] as const).map((filterType) => {
                                    const filterCounts = {
                                        all: activeInsights.length,
                                        risks: activeInsights.filter(ins => ['growth_decline', 'thumbnail_warning', 'subscriber_decline'].includes(ins.insight_type)).length,
                                        growth: activeInsights.filter(ins => ['competitor_outperforming', 'upload_frequency', 'subscriber_acceleration'].includes(ins.insight_type)).length,
                                        opportunities: activeInsights.filter(ins => ['content_opportunity', 'growth_opportunity'].includes(ins.insight_type)).length,
                                    };
                                    return (
                                        <button
                                            key={filterType}
                                            onClick={() => setInsightFilter(filterType)}
                                            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                                                insightFilter === filterType 
                                                    ? 'border-indigo-500 text-indigo-400' 
                                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            <span className="capitalize">{filterType}</span>
                                            <span className="bg-secondary/40 text-[10px] px-1.5 py-0.5 rounded-full font-mono text-muted-foreground">
                                                {filterCounts[filterType]}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Loading State */}
                            {isInsightsLoading && (
                                <div className="flex flex-col items-center justify-center py-12 gap-2">
                                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                                    <p className="text-xs text-muted-foreground">Evaluating performance rules...</p>
                                </div>
                            )}

                            {/* Empty State */}
                            {!isInsightsLoading && filteredInsights.length === 0 && (
                                <div className="border border-dashed border-border rounded-xl p-12 text-center space-y-2">
                                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                                    <h4 className="font-extrabold text-sm">No Active Insights found</h4>
                                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                        All parameters are within acceptable thresholds for this filter. Click "Refresh Insights" or sync your channel metrics to run the engine again.
                                    </p>
                                </div>
                            )}

                            {/* Insights Grid */}
                            {!isInsightsLoading && filteredInsights.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {filteredInsights.map((insight) => (
                                        <div 
                                            key={insight.id}
                                            className={`bg-secondary/5 border rounded-xl p-5 flex flex-col justify-between gap-4 transition-all relative overflow-hidden group hover:bg-secondary/10 ${getSeverityStyles(insight.severity)}`}
                                        >
                                            {/* Score pill */}
                                            {insight.score > 0 && (
                                                <div className="absolute top-4 right-4 flex items-center gap-1 font-mono font-bold text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                                                    <Zap className="w-3.5 h-3.5 fill-indigo-300/30" /> Score: {insight.score}
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                                                        insight.severity === 'Critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                        insight.severity === 'High' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                                        insight.severity === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                        'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                                    }`}>
                                                        {insight.severity}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground font-mono">
                                                        {insight.insight_source}
                                                    </span>
                                                </div>

                                                <h4 className="font-extrabold text-sm text-foreground">{insight.title}</h4>
                                                <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
                                            </div>

                                            {/* Footer Actions */}
                                            <div className="flex items-center justify-between border-t border-border/20 pt-3 mt-1">
                                                <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> {getInsightAge(insight.first_detected_at)}
                                                </span>
                                                
                                                <div className="flex items-center gap-2">
                                                    {['content_gap', 'growth_opportunity', 'competitor_outperforming', 'subscriber_acceleration', 'content_opportunity'].includes(insight.insight_type) && (
                                                        <button
                                                            onClick={() => exportInsightMutation.mutate(insight.id)}
                                                            disabled={exportInsightMutation.isPending}
                                                            className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/20 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white transition-all disabled:opacity-50"
                                                        >
                                                            <Share2 className="w-3 h-3" /> Send Insight To Builder
                                                        </button>
                                                    )}

                                                    {insight.entity_type === 'video' && insight.entity_id && (
                                                        <button
                                                            onClick={() => handleDeepLink(insight.entity_id!, insight.title)}
                                                            className="flex items-center gap-1 bg-secondary/50 hover:bg-secondary border border-border px-2.5 py-1 rounded-lg text-[10px] font-bold text-muted-foreground hover:text-foreground transition-all"
                                                        >
                                                            <ExternalLink className="w-3 h-3" /> View Video
                                                        </button>
                                                    )}
                                                    
                                                    <button
                                                        onClick={() => dismissInsightMutation.mutate({ insightId: insight.id, status: 'dismissed' })}
                                                        disabled={dismissInsightMutation.isPending}
                                                        className="flex items-center gap-1 bg-secondary/50 hover:bg-red-500/10 border border-border hover:border-red-500/20 px-2.5 py-1 rounded-lg text-[10px] font-bold text-muted-foreground hover:text-red-400 transition-all"
                                                    >
                                                        <Trash2 className="w-3 h-3" /> Dismiss
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })()}

            </div>
        </div>
    );
}
