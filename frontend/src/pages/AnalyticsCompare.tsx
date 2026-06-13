import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAnalyticsChannels, compareChannels } from '../services/api';
import { 
    ChevronLeft, 
    RefreshCw, 
    TrendingUp, 
    Users, 
    Eye,
    Video,
    BarChart3,
    AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    ResponsiveContainer 
} from 'recharts';

const PALETTE = [
    '#6366f1', // Indigo
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#8b5cf6'  // Purple
];

export default function AnalyticsCompare() {
    const [searchParams, setSearchParams] = useSearchParams();
    const channelIdsStr = searchParams.get('channel_ids') || '';
    
    // Parse channel IDs
    const channelIds = channelIdsStr.split(',').map(id => id.trim()).filter(id => id.length > 0);

    // Selected state for local checkbox selector
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Sync local selection when query string changes
    useEffect(() => {
        setSelectedIds(channelIds);
    }, [channelIdsStr]);

    // Fetch list of observed channels (staleTime 5m)
    const { data: allChannels = [], isLoading: isAllChannelsLoading } = useQuery({
        queryKey: ['analyticsChannels'],
        queryFn: () => getAnalyticsChannels(),
        staleTime: 5 * 60 * 1000
    });

    // Fetch Comparison dataset (staleTime 2m)
    const { data: compareData, isLoading: isCompareLoading, error } = useQuery({
        queryKey: ['compareData', channelIdsStr],
        queryFn: () => compareChannels(channelIdsStr),
        enabled: channelIds.length >= 2 && channelIds.length <= 5,
        staleTime: 2 * 60 * 1000
    });

    const handleCheckboxChange = (id: string) => {
        setSelectedIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(x => x !== id);
            } else {
                if (prev.length >= 5) {
                    toast.warning("You can compare a maximum of 5 channels simultaneously");
                    return prev;
                }
                return [...prev, id];
            }
        });
    };

    const triggerComparison = () => {
        if (selectedIds.length < 2) {
            toast.error("Please select at least 2 channels to compare");
            return;
        }
        setSearchParams({ channel_ids: selectedIds.join(',') });
    };

    const clearComparison = () => {
        setSelectedIds([]);
        setSearchParams({});
    };

    const hasActiveComparison = channelIds.length >= 2 && channelIds.length <= 5;

    return (
        <div className="container mx-auto p-6 space-y-6 max-w-7xl text-foreground">
            
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <Link to="/analytics" className="hover:text-indigo-400 transition-colors flex items-center gap-1">
                    <ChevronLeft className="w-3 h-3" /> Analytics Hub
                </Link>
                <span>/</span>
                <span className="text-indigo-400">Compare Center</span>
            </nav>

            {/* Header */}
            <div className="bg-secondary/15 border border-border p-6 rounded-xl backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="space-y-1 relative z-10">
                    <h1 className="text-2xl font-extrabold tracking-tight">Analytics Compare Center</h1>
                    <p className="text-xs text-muted-foreground">Compare growth trajectories and publication metrics side-by-side (2 to 5 channels).</p>
                </div>

                {hasActiveComparison && (
                    <button 
                        onClick={clearComparison}
                        className="bg-secondary/40 hover:bg-secondary/60 text-foreground border border-border px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all z-10"
                    >
                        Reset Comparison
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* Left side selector */}
                <div className="bg-secondary/5 border border-border p-5 rounded-xl space-y-4 self-start">
                    <h3 className="font-extrabold text-xs text-muted-foreground uppercase tracking-wider">Select Observed Channels</h3>
                    {isAllChannelsLoading ? (
                        <div className="text-xs text-muted-foreground py-4 flex items-center gap-2">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading channels list...
                        </div>
                    ) : allChannels.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">No channels observed yet.</p>
                    ) : (
                        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                            {allChannels.map(ch => (
                                <label key={ch.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-secondary/20 hover:bg-secondary/40 border border-border/20 cursor-pointer transition-all">
                                    <input 
                                        type="checkbox"
                                        checked={selectedIds.includes(ch.id)}
                                        onChange={() => handleCheckboxChange(ch.id)}
                                        className="rounded border-border bg-secondary text-indigo-600 focus:ring-0 focus:ring-offset-0 focus:outline-none w-4 h-4 cursor-pointer"
                                    />
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold truncate">{ch.channel_name}</p>
                                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{ch.channel_handle || ch.external_channel_id.substring(0, 10) + '...'}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}

                    <button
                        onClick={triggerComparison}
                        disabled={selectedIds.length < 2 || selectedIds.length > 5}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-2 rounded-lg text-xs transition-all shadow-lg shadow-indigo-600/10"
                    >
                        Compare Channels ({selectedIds.length})
                    </button>
                </div>

                {/* Right side results */}
                <div className="lg:col-span-3 space-y-6">
                    {!hasActiveComparison ? (
                        <div className="bg-secondary/5 border border-border border-dashed p-12 rounded-xl text-center space-y-3">
                            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto" />
                            <h4 className="font-extrabold text-sm">Compare Center Ready</h4>
                            <p className="text-xs text-muted-foreground max-w-sm mx-auto">Please select between 2 and 5 channels from the sidebar panel and click "Compare Channels" to visualize performance side-by-side.</p>
                        </div>
                    ) : isCompareLoading ? (
                        <div className="bg-secondary/5 border border-border p-12 rounded-xl text-center flex items-center justify-center gap-2 text-xs text-muted-foreground">
                            <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" /> Aligning snapshot histories...
                        </div>
                    ) : error ? (
                        <div className="bg-rose-500/5 border border-rose-500/10 p-6 rounded-xl flex items-start gap-3 text-xs text-rose-300">
                            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                            <div>
                                <h4 className="font-extrabold text-rose-400">Comparison Error</h4>
                                <p className="mt-1">{error instanceof Error ? error.message : "Failed to load comparison data. Please ensure channels have sync snapshots."}</p>
                            </div>
                        </div>
                    ) : !compareData || compareData.channels.length === 0 ? (
                        <div className="bg-secondary/5 border border-border p-6 rounded-xl text-center text-xs text-muted-foreground">
                            No comparison metrics generated. Please make sure the selected channels have been synchronized at least once.
                        </div>
                    ) : (
                        <div className="space-y-6">
                            
                            {/* Side-by-side KPI grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {compareData.channels.map((ch, idx) => (
                                    <div key={ch.id} className="bg-secondary/10 border border-border p-5 rounded-xl space-y-3 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: PALETTE[idx % PALETTE.length] }} />
                                        <div className="pl-2">
                                            <h4 className="font-bold text-xs truncate" title={ch.channel_name}>{ch.channel_name}</h4>
                                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{ch.channel_handle || ch.id.substring(0, 8)}</p>
                                            
                                            <div className="grid grid-cols-3 gap-2 pt-4 text-left">
                                                <div>
                                                    <span className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-0.5"><Users className="w-3 h-3" /> Subs</span>
                                                    <p className="font-bold font-mono text-sm mt-0.5">{ch.subscribers?.toLocaleString() || 0}</p>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-0.5"><Eye className="w-3 h-3" /> Views</span>
                                                    <p className="font-bold font-mono text-sm mt-0.5">{ch.views?.toLocaleString() || 0}</p>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-0.5"><Video className="w-3 h-3" /> Videos</span>
                                                    <p className="font-bold font-mono text-sm mt-0.5">{ch.video_count || 0}</p>
                                                </div>
                                            </div>

                                            <div className="mt-3.5 border-t border-border/40 pt-2 flex items-center justify-between">
                                                <span className="text-[10px] text-muted-foreground uppercase font-bold">Active Insights</span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ch.active_insights_count > 0 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'}`}>
                                                    {ch.active_insights_count} active
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Chart: Subscriber Growth Comparison */}
                            <div className="bg-secondary/5 border border-border p-6 rounded-xl space-y-4">
                                <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-indigo-400" /> Subscriber Growth Comparison
                                </h3>
                                <div className="h-[320px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={compareData.subscribers_timeline}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#2a2e3f" />
                                            <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                                            <YAxis stroke="#6b7280" style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#1e2230', borderColor: '#2e334a', color: '#fff', fontSize: '11px', borderRadius: '8px' }} 
                                                labelStyle={{ fontWeight: 'bold', color: '#818cf8' }}
                                            />
                                            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                                            {compareData.channels.map((ch, idx) => (
                                                <Line 
                                                    key={ch.id} 
                                                    type="monotone" 
                                                    dataKey={ch.id} 
                                                    name={ch.channel_name} 
                                                    stroke={PALETTE[idx % PALETTE.length]} 
                                                    strokeWidth={2}
                                                    dot={false}
                                                    connectNulls={true}
                                                />
                                            ))}
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Chart: Views Growth Comparison */}
                            <div className="bg-secondary/5 border border-border p-6 rounded-xl space-y-4">
                                <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-emerald-400" /> Views Growth Comparison
                                </h3>
                                <div className="h-[320px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={compareData.views_timeline}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#2a2e3f" />
                                            <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                                            <YAxis stroke="#6b7280" style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#1e2230', borderColor: '#2e334a', color: '#fff', fontSize: '11px', borderRadius: '8px' }} 
                                                labelStyle={{ fontWeight: 'bold', color: '#818cf8' }}
                                            />
                                            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                                            {compareData.channels.map((ch, idx) => (
                                                <Line 
                                                    key={ch.id} 
                                                    type="monotone" 
                                                    dataKey={ch.id} 
                                                    name={ch.channel_name} 
                                                    stroke={PALETTE[idx % PALETTE.length]} 
                                                    strokeWidth={2}
                                                    dot={false}
                                                    connectNulls={true}
                                                />
                                            ))}
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
