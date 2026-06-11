import { useState } from 'react';
import { Activity, ScrollText, X, LayoutGrid, Heart, ShieldCheck, Cpu, Database } from 'lucide-react';
import ExecutionList from '../components/ExecutionCenter/ExecutionList';
import ProductionForm from '../components/ExecutionCenter/ProductionForm';
import RuntimeTraceViewer from '../components/RuntimeTraceViewer';
import { useQuery } from '@tanstack/react-query';
import { getExecutionTraces, getHealth } from '../services/api';

export default function GlobalExecutionCenterPage() {
    const [selectedTracePackageId, setSelectedTracePackageId] = useState<string | null>(null);

    // Component for System Health monitoring
    const SystemHealth = () => {
        const { data: health, isLoading } = useQuery({
            queryKey: ['system-health'],
            queryFn: getHealth,
            refetchInterval: 10000,
        });

        const isOk = health?.status === 'ok';

        return (
            <div className="bg-card border border-border shadow-md rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 bg-gradient-to-r from-card to-secondary/15 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${isOk ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'} border ${isOk ? 'border-green-500/20' : 'border-yellow-500/20'}`}>
                        <Heart className={`w-5 h-5 ${isOk ? 'animate-pulse' : ''}`} />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">System Engine Health</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Status: <span className={`font-semibold ${isOk ? 'text-green-500' : 'text-yellow-500'}`}>{isLoading ? 'Checking...' : isOk ? 'Operational' : 'Degraded'}</span>
                        </p>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-6 text-xs font-mono">
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-green-500 animate-ping" />
                        <Cpu className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Runtime Core:</span>
                        <span className="font-semibold text-foreground">ONLINE</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">9Router:</span>
                        <span className="font-semibold text-foreground">ONLINE</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <Database className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Providers:</span>
                        <span className="font-semibold text-foreground">Gemini/OpenAI</span>
                    </div>
                    {health?.uptime_seconds && (
                        <div className="text-muted-foreground border-l border-border/80 pl-6 hidden md:block">
                            Uptime: <span className="font-semibold text-foreground">{Math.round(health.uptime_seconds / 60)}m</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Component for global traces (Runtime Output Feed)
    const GlobalTracesList = () => {
        const { data: traces, isLoading, error } = useQuery({
            queryKey: ['global-execution-traces'],
            queryFn: getExecutionTraces,
            refetchInterval: 5000,
        });

        if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading feed...</div>;
        if (error) return <div className="p-8 text-center text-red-500">Failed to load feed.</div>;
        if (!traces?.length) return <div className="p-8 text-center text-muted-foreground">No recent production history.</div>;

        return (
            <div className="divide-y divide-border/40 max-h-[500px] overflow-y-auto">
                {traces.map((trace) => {
                    const isSuccess = trace.status === 'success';
                    const isFailed = trace.status === 'failed';
                    
                    // Runtime Output Feed Rule: Emphasize Asset Produced
                    let feedMessage = `${trace.execution_type} Processing...`;
                    let destination = 'Asset Library';
                    
                    if (isSuccess) {
                        if (trace.execution_type.toLowerCase() === 'metadata') {
                            destination = 'Metadata Library';
                        } else if (trace.execution_type.toLowerCase() === 'thumbnail') {
                            destination = 'Thumbnail Library';
                        } else if (trace.execution_type.toLowerCase() === 'footage') {
                            destination = 'Production Output';
                        }
                        feedMessage = `${trace.execution_type} Generated → Saved to ${destination}`;
                    } else if (isFailed) {
                        feedMessage = `${trace.execution_type} Generation Failed`;
                    }

                    return (
                        <div key={trace.id} className="p-4 hover:bg-muted/50 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-foreground">
                                        {feedMessage}
                                    </span>
                                    <span className="text-xs text-muted-foreground font-mono mt-1 flex items-center">
                                        {trace.package_number === 'N/A' ? (
                                            <span className="mr-2 px-1.5 py-0.5 bg-primary/10 text-primary rounded border border-primary/20 font-semibold uppercase">Global Workbox</span>
                                        ) : (
                                            <span className="mr-2 px-1.5 py-0.5 bg-muted rounded border border-border">Target: {trace.channel_name} - {trace.package_number}</span>
                                        )}
                                        ID: {trace.execution_id}
                                    </span>
                                </div>
                                <span className={`text-xs font-medium px-2 py-1 rounded whitespace-nowrap ${
                                    isSuccess ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                    isFailed ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                }`}>
                                    {trace.status.toUpperCase()}
                                </span>
                            </div>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-2">
                                <span><strong className="text-foreground">Time:</strong> {new Date(trace.executed_at + 'Z').toLocaleString()}</span>
                                <button
                                    onClick={() => setSelectedTracePackageId(trace.package_id)}
                                    className="text-primary hover:underline ml-auto"
                                >
                                    View Full Trace Log
                                </button>
                            </div>
                            {trace.error_message && (
                                <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded text-xs border border-red-100 dark:border-red-900/50 whitespace-pre-wrap">
                                    {trace.error_message}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8">
            <div className="mb-4">
                <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
                    <LayoutGrid className="w-8 h-8 mr-3 text-primary" />
                    Global Production Workbox
                </h1>
                <p className="text-muted-foreground mt-2 text-lg">Produce global assets across all channels.</p>
            </div>

            {/* System Health Dashboard Panel */}
            <SystemHealth />

            {/* Production Forms Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ProductionForm assetType="Metadata" />
                <ProductionForm assetType="Thumbnail" />
                <ProductionForm assetType="Footage" />
            </div>

            {/* Runtime Monitoring & Feed Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Runtime Activity */}
                <div className="bg-card border border-border shadow-sm rounded-lg flex flex-col overflow-hidden h-[600px]">
                    <div className="bg-muted/30 border-b border-border p-4 flex items-center">
                        <Activity className="w-5 h-5 text-primary mr-3" />
                        <div>
                            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Runtime Activity</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">Runtime execution state & operations</p>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto bg-background">
                        <ExecutionList statusFilter="active" onOpenTrace={setSelectedTracePackageId} />
                    </div>
                </div>

                {/* Runtime Output Feed */}
                <div className="bg-card border border-border shadow-sm rounded-lg flex flex-col overflow-hidden h-[600px]">
                    <div className="bg-muted/30 border-b border-border p-4 flex items-center">
                        <ScrollText className="w-5 h-5 text-primary mr-3" />
                        <div>
                            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Runtime Output Feed</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">Historical log of produced assets</p>
                        </div>
                    </div>
                    <div className="flex-1 bg-background">
                        <GlobalTracesList />
                    </div>
                </div>
            </div>

            {/* Trace Modal utilizing reused RuntimeTraceViewer */}
            {selectedTracePackageId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-card w-full max-w-3xl max-h-[85vh] flex flex-col rounded-xl shadow-lg border border-border">
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <h3 className="text-lg font-semibold flex items-center">
                                <ScrollText className="w-5 h-5 mr-2 text-primary" />
                                Runtime Trace Inspection
                            </h3>
                            <button
                                onClick={() => setSelectedTracePackageId(null)}
                                className="p-1 hover:bg-muted rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <RuntimeTraceViewer packageId={selectedTracePackageId} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
