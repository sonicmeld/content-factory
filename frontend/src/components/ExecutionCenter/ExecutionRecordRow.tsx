import { PlayCircle, Eye, FileText, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ExecutionTask } from '../../types';

interface ExecutionRecordRowProps {
    task: ExecutionTask;
    onReRun: (task: ExecutionTask) => void;
    onOpenTrace: (packageId: string) => void;
    isReRunning: boolean;
}

export default function ExecutionRecordRow({ task, onReRun, onOpenTrace, isReRunning }: ExecutionRecordRowProps) {
    const getStatusIcon = (status: string) => {
        if (status === 'completed') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
        if (status === 'failed') return <AlertCircle className="w-4 h-4 text-red-500" />;
        if (status === 'pending' || status === 'processing') return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
        return null;
    };

    return (
        <div className="flex items-center justify-between p-4 border-b border-border/40 hover:bg-muted/50 transition-colors">
            <div className="flex items-center space-x-4">
                <div className="flex flex-col">
                    <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold px-2 py-1 bg-secondary text-secondary-foreground rounded-md uppercase">
                            {task.execution_type}
                        </span>
                        <span className="text-sm font-medium text-foreground">
                            {task.channel_name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                            Package #{task.package_number}
                        </span>
                    </div>
                    <div className="flex items-center mt-2 space-x-3 text-xs">
                        <span className="flex items-center space-x-1">
                            {getStatusIcon(task.status)}
                            <span className="capitalize text-muted-foreground ml-1">{task.status}</span>
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">
                            Source: <span className="font-medium text-foreground">{task.source_type}</span>
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <button
                    onClick={() => onOpenTrace(task.package_id)}
                    className="flex items-center px-3 py-1.5 text-xs font-medium text-muted-foreground bg-secondary/50 rounded hover:bg-secondary hover:text-foreground transition-colors"
                    title="Open Runtime Trace"
                >
                    <FileText className="w-3.5 h-3.5 mr-1.5" />
                    Trace
                </button>
                <Link
                    to={`/workspace/${task.channel_slug}/packages/${task.package_id}`}
                    className="flex items-center px-3 py-1.5 text-xs font-medium text-muted-foreground bg-secondary/50 rounded hover:bg-secondary hover:text-foreground transition-colors"
                >
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    Package
                </Link>
                <button
                    onClick={() => onReRun(task)}
                    disabled={isReRunning}
                    className="flex items-center px-3 py-1.5 text-xs font-medium text-primary-foreground bg-primary rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                    {isReRunning ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5 mr-1.5" />}
                    Re-run
                </button>
            </div>
        </div>
    );
}
