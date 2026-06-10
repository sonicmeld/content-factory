import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getExecutionTasks, generateMetadata, generateThumbnail } from '../../../services/api';
import ExecutionRecordRow from './ExecutionRecordRow';
import { Loader2, Inbox } from 'lucide-react';
import type { ExecutionTask } from '../../../types';
import { toast } from 'sonner';

interface ExecutionListProps {
    statusFilter?: string; // 'active', 'completed', 'failed'
    onOpenTrace: (packageId: string) => void;
}

export default function ExecutionList({ statusFilter, onOpenTrace }: ExecutionListProps) {
    const queryClient = useQueryClient();

    const { data: tasks, isLoading, error } = useQuery({
        queryKey: ['execution-tasks', statusFilter],
        queryFn: () => getExecutionTasks(statusFilter),
        refetchInterval: statusFilter === 'active' || statusFilter === 'failed' ? 5000 : false,
    });

    const reRunMutation = useMutation({
        mutationFn: async (task: ExecutionTask) => {
            if (task.execution_type === 'Metadata') {
                return generateMetadata(task.package_id);
            } else if (task.execution_type === 'Thumbnail') {
                return generateThumbnail(task.package_id);
            }
            throw new Error(`Unsupported execution type: ${task.execution_type}`);
        },
        onSuccess: () => {
            toast.success('Execution re-run triggered');
            queryClient.invalidateQueries({ queryKey: ['execution-tasks'] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.detail || 'Failed to trigger re-run');
        }
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p>Loading executions...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 text-sm text-red-500 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-200 dark:border-red-900 m-4">
                Failed to load execution tasks.
            </div>
        );
    }

    if (!tasks || tasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Inbox className="w-12 h-12 mb-4 opacity-20" />
                <p>No executions found in this view.</p>
            </div>
        );
    }

    return (
        <div className="divide-y divide-border/40">
            {tasks.map((task) => (
                <ExecutionRecordRow
                    key={`${task.package_generation_id}-${task.execution_type}`}
                    task={task}
                    onOpenTrace={onOpenTrace}
                    onReRun={(t) => reRunMutation.mutate(t)}
                    isReRunning={reRunMutation.isPending && reRunMutation.variables?.package_generation_id === task.package_generation_id && reRunMutation.variables?.execution_type === task.execution_type}
                />
            ))}
        </div>
    );
}
