import { useState } from 'react';
import { Activity, ScrollText, X, LayoutGrid } from 'lucide-react';
import ExecutionList from '../components/ExecutionCenter/ExecutionList';
import ProductionForm from '../components/ExecutionCenter/ProductionForm';
import RuntimeTraceViewer from '../components/RuntimeTraceViewer';
import { useQuery } from '@tanstack/react-query';
import { getExecutionTraces } from '../services/api';

export default function GlobalExecutionCenterPage() {
    const [selectedTracePackageId, setSelectedTracePackageId] = useState<string | null>(null);

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
                    let destination = '';
                    
                    if (isSuccess) {
                        destination = trace.execution_type.toLowerCase() === 'metadata' ? 'Metadata Library' : 'Asset Library';
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
                                        <span className="mr-2 px-1.5 py-0.5 bg-muted rounded border border-border">Target: {trace.channel_name} - {trace.package_number}</span>
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

            {/* Production Forms Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ProductionForm assetType="Metadata" />
                <ProductionForm assetType="Thumbnail" />
                <ProductionForm assetType="Footage" disabled={true} />
            </div>

            {/* Runtime Monitoring & Feed Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                {/* Active Operations */}
                <div className="bg-card border border-border shadow-sm rounded-lg flex flex-col overflow-hidden h-[600px]">
                    <div className="bg-muted/30 border-b border-border p-4 flex items-center">
                        <Activity className="w-5 h-5 text-primary mr-3" />
                        <div>
                            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Active Operations</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">Currently processing generations</p>
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
