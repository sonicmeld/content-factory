import { useState } from 'react';
import { Activity, CheckCircle2, AlertCircle, ScrollText, X } from 'lucide-react';
import ExecutionList from '../components/ExecutionCenter/ExecutionList';
import WorkboxList from '../components/ExecutionCenter/WorkboxList';
import RuntimeTraceViewer from '../components/RuntimeTraceViewer';
import { useQuery } from '@tanstack/react-query';
import { getExecutionTraces } from '../services/api';

export default function GlobalExecutionCenterPage() {
    const [activeTab, setActiveTab] = useState<'gaps' | 'active' | 'ready' | 'traces'>('gaps');
    const [selectedTracePackageId, setSelectedTracePackageId] = useState<string | null>(null);

    const tabs = [
        { id: 'gaps', label: 'Production Gaps', icon: AlertCircle },
        { id: 'active', label: 'Active Executions', icon: Activity },
        { id: 'ready', label: 'Assembly Ready', icon: CheckCircle2 },
        { id: 'traces', label: 'Traces', icon: ScrollText },
    ] as const;

    // Component for global traces
    const GlobalTracesList = () => {
        const { data: traces, isLoading, error } = useQuery({
            queryKey: ['global-execution-traces'],
            queryFn: getExecutionTraces,
            refetchInterval: 5000,
        });

        if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading traces...</div>;
        if (error) return <div className="p-8 text-center text-red-500">Failed to load traces.</div>;
        if (!traces?.length) return <div className="p-8 text-center text-muted-foreground">No recent traces found.</div>;

        return (
            <div className="divide-y divide-border/40">
                {traces.map((trace) => (
                    <div key={trace.id} className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-foreground">
                                    {trace.channel_name} - Package #{trace.package_number}
                                </span>
                                <span className="text-xs text-muted-foreground font-mono mt-1">
                                    ID: {trace.execution_id}
                                </span>
                            </div>
                            <span className={`text-xs font-medium px-2 py-1 rounded ${
                                trace.status === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                trace.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}>
                                {trace.status.toUpperCase()}
                            </span>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-2">
                            <span><strong className="text-foreground">Type:</strong> {trace.execution_type}</span>
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
                ))}
            </div>
        );
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Global Execution Center</h1>
                <p className="text-muted-foreground mt-2">Monitor and trace cross-channel execution tasks.</p>
            </div>

            <div className="bg-card border border-border shadow-sm rounded-lg overflow-hidden flex flex-col min-h-[600px]">
                <div className="border-b border-border bg-muted/20">
                    <nav className="flex items-center px-4" aria-label="Tabs">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                                        flex items-center px-4 py-4 text-sm font-medium border-b-2 transition-colors
                                        ${isActive 
                                            ? 'border-primary text-primary' 
                                            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}
                                    `}
                                >
                                    <Icon className={`w-4 h-4 mr-2 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div className="flex-1 bg-card">
                    {activeTab === 'gaps' && <WorkboxList filterReadiness={undefined} />}
                    {activeTab === 'active' && <ExecutionList statusFilter="active" onOpenTrace={setSelectedTracePackageId} />}
                    {activeTab === 'ready' && <WorkboxList filterReadiness="READY" />}
                    {activeTab === 'traces' && <GlobalTracesList />}
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
