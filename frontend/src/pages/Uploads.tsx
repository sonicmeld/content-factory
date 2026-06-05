import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUploadJobs, retryUploadJob, getChannels } from '../services/api';
import { RefreshCw, PlayCircle } from 'lucide-react';

export default function Uploads() {
    const queryClient = useQueryClient();
    
    // Auto refresh every 10 seconds per requirements
    const { data: uploads = [], isFetching } = useQuery({ 
        queryKey: ['uploads'], 
        queryFn: () => getUploadJobs(),
        refetchInterval: 10000 
    });
    
    const { data: channels = [] } = useQuery({ queryKey: ['channels'], queryFn: getChannels });

    const retryMutation = useMutation({
        mutationFn: retryUploadJob,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['uploads'] });
        }
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold flex items-center gap-3">
                    Upload Queue
                    {isFetching && <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />}
                </h1>
                <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors">
                    + Add to Queue
                </button>
            </div>

            <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-secondary/50 text-muted-foreground">
                        <tr>
                            <th className="px-6 py-3">Video File</th>
                            <th className="px-6 py-3">Channel</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Retries</th>
                            <th className="px-6 py-3">Scheduled At</th>
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {uploads.map((job) => (
                            <tr key={job.id} className="hover:bg-secondary/20 transition-colors">
                                <td className="px-6 py-4 font-medium truncate max-w-[200px]">{job.video_path.split('/').pop()}</td>
                                <td className="px-6 py-4">{channels.find(c => c.id === job.channel_id)?.name || job.channel_id}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
                                        ${job.status === 'published' ? 'bg-green-500/20 text-green-400' : 
                                          job.status === 'failed' ? 'bg-red-500/20 text-red-400' : 
                                          job.status === 'uploading' ? 'bg-blue-500/20 text-blue-400' :
                                          'bg-yellow-500/20 text-yellow-400'}`}>
                                        {job.status.toUpperCase()}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-muted-foreground">{job.retry_count} / 3</td>
                                <td className="px-6 py-4 text-muted-foreground">{job.scheduled_at ? new Date(job.scheduled_at).toLocaleString() : 'N/A'}</td>
                                <td className="px-6 py-4">
                                    {job.status === 'failed' && (
                                        <button 
                                            onClick={() => retryMutation.mutate(job.id)}
                                            className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-xs font-medium bg-blue-400/10 px-2 py-1 rounded"
                                        >
                                            <PlayCircle className="w-3.5 h-3.5" /> Retry
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {uploads.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">Queue is currently empty.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
