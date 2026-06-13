import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    getChannelSummary, 
    getChannelTimeline, 
    getChannelVideos, 
    syncAnalyticsChannel 
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
    ArrowRight
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

                {/* 7. INSIGHTS ROADMAP TAB */}
                {activeTab === 'insights' && (
                    <div className="bg-secondary/5 border border-border p-8 rounded-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />
                        
                        <div className="max-w-2xl space-y-8 relative z-10">
                            <div className="space-y-2">
                                <h3 className="text-xl font-extrabold text-indigo-400 flex items-center gap-2">
                                    <Cpu className="w-5 h-5" /> Performance Insight Engine
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Modul AI terpusat yang menganalisis snapshot performa historis, efisiensi metadata, dan pola posting untuk memberikan strategi optimasi.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                <div className="bg-secondary/15 border border-border/40 p-5 rounded-lg space-y-3">
                                    <h4 className="font-extrabold text-xs text-foreground uppercase tracking-wider border-b border-border/40 pb-2">
                                        Sprint C Roadmap
                                    </h4>
                                    <ul className="space-y-2 text-xs text-muted-foreground">
                                        <li className="flex items-center gap-2"><ArrowRight className="w-3.5 h-3.5 text-indigo-500" /> Performance Insights (AI diagnosis)</li>
                                        <li className="flex items-center gap-2"><ArrowRight className="w-3.5 h-3.5 text-indigo-500" /> Growth Prediction model</li>
                                        <li className="flex items-center gap-2"><ArrowRight className="w-3.5 h-3.5 text-indigo-500" /> Thumbnail CTR Intelligence</li>
                                        <li className="flex items-center gap-2"><ArrowRight className="w-3.5 h-3.5 text-indigo-500" /> Content Gap Analysis</li>
                                        <li className="flex items-center gap-2"><ArrowRight className="w-3.5 h-3.5 text-indigo-500" /> Posting Time Recommendation</li>
                                    </ul>
                                </div>

                                <div className="bg-secondary/15 border border-border/40 p-5 rounded-lg space-y-3">
                                    <h4 className="font-extrabold text-xs text-foreground uppercase tracking-wider border-b border-border/40 pb-2">
                                        Sprint D Roadmap
                                    </h4>
                                    <ul className="space-y-2 text-xs text-muted-foreground">
                                        <li className="flex items-center gap-2"><ArrowRight className="w-3.5 h-3.5 text-emerald-500" /> Market Intelligence & Google Trends</li>
                                        <li className="flex items-center gap-2"><ArrowRight className="w-3.5 h-3.5 text-emerald-500" /> Competitor Radar alerts</li>
                                        <li className="flex items-center gap-2"><ArrowRight className="w-3.5 h-3.5 text-emerald-500" /> Topic Trend Forecasting</li>
                                        <li className="flex items-center gap-2"><ArrowRight className="w-3.5 h-3.5 text-emerald-500" /> Video Opportunity Detection</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
