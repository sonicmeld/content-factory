import { useQuery } from '@tanstack/react-query';
import { getRuntimeAudits } from '../services/api';
import { Loader2, ScrollText, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

interface RuntimeTraceViewerProps {
    packageId: string;
}

export default function RuntimeTraceViewer({ packageId }: RuntimeTraceViewerProps) {
    const { data: audits, isLoading, error } = useQuery({
        queryKey: ['runtime-audits', packageId],
        queryFn: () => getRuntimeAudits(packageId),
        refetchInterval: 5000, // Poll every 5s just in case
    });

    if (isLoading) {
        return (
            <div className="p-4 flex justify-center items-center">
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                <span className="ml-2 text-sm text-gray-500">Loading traces...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 flex items-start text-red-500 text-sm">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                <span>Failed to load runtime traces.</span>
            </div>
        );
    }

    if (!audits || audits.length === 0) {
        return (
            <div className="p-4 text-center text-sm text-gray-500">
                No runtime audit history found for this package.
            </div>
        );
    }

    return (
        <div className="space-y-4 p-4">
            <h3 className="text-sm font-semibold flex items-center text-gray-700">
                <ScrollText className="w-4 h-4 mr-2" />
                Runtime Trace
            </h3>
            
            <div className="space-y-4">
                {audits.map((audit) => (
                    <div key={audit.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-xs">
                        <div className="flex justify-between items-start mb-2">
                            <div className="font-mono text-gray-500 truncate max-w-[200px]" title={audit.execution_id}>
                                ID: {audit.execution_id}
                            </div>
                            <div className="flex items-center">
                                {audit.status === 'success' ? (
                                    <span className="flex items-center text-green-600 font-medium">
                                        <CheckCircle2 className="w-3 h-3 mr-1" /> Success
                                    </span>
                                ) : audit.status === 'failed' ? (
                                    <span className="flex items-center text-red-600 font-medium">
                                        <XCircle className="w-3 h-3 mr-1" /> Failed
                                    </span>
                                ) : (
                                    <span className="flex items-center text-yellow-600 font-medium">
                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Pending
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mt-2 text-gray-600">
                            <div>
                                <span className="font-medium">Type:</span> <span className="uppercase">{audit.execution_type}</span>
                            </div>
                            <div>
                                <span className="font-medium">Combo:</span> {audit.combo_used || '-'}
                            </div>
                            <div className="col-span-2">
                                <span className="font-medium">Time:</span> {new Date(audit.executed_at + 'Z').toLocaleString()}
                            </div>
                            <div className="col-span-2">
                                <span className="font-medium">Selected Prompt:</span> {audit.selected_prompt_title || '-'}
                            </div>
                            <div className="col-span-2">
                                <span className="font-medium">Assigned Prompts:</span>{' '}
                                {audit.assigned_prompt_titles ? (
                                    <span className="text-gray-500">
                                        {JSON.parse(audit.assigned_prompt_titles).join(', ') || '-'}
                                    </span>
                                ) : (
                                    '-'
                                )}
                            </div>
                        </div>
                        
                        {audit.error_message && (
                            <div className="mt-2 p-2 bg-red-50 text-red-700 rounded border border-red-100 whitespace-pre-wrap">
                                <span className="font-semibold block mb-1">Error:</span>
                                {audit.error_message}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
