import { useQuery } from '@tanstack/react-query';
import { getChannels, getUploadJobs } from '../services/api';
import { MonitorPlay, Upload, CheckCircle, XCircle } from 'lucide-react';

export default function Dashboard() {
    const { data: channels = [] } = useQuery({ queryKey: ['channels'], queryFn: getChannels });
    const { data: uploads = [] } = useQuery({ queryKey: ['uploads'], queryFn: () => getUploadJobs() });

    const pendingUploads = uploads.filter(u => u.status === 'pending').length;
    const publishedUploads = uploads.filter(u => u.status === 'published').length;
    const failedUploads = uploads.filter(u => u.status === 'failed').length;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-6 bg-card border border-border rounded-lg shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-full"><MonitorPlay className="text-blue-500" /></div>
                    <div>
                        <p className="text-sm text-muted-foreground">Total Channels</p>
                        <h3 className="text-2xl font-bold">{channels.length}</h3>
                    </div>
                </div>
                <div className="p-6 bg-card border border-border rounded-lg shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-yellow-500/10 rounded-full"><Upload className="text-yellow-500" /></div>
                    <div>
                        <p className="text-sm text-muted-foreground">Pending Queue</p>
                        <h3 className="text-2xl font-bold">{pendingUploads}</h3>
                    </div>
                </div>
                <div className="p-6 bg-card border border-border rounded-lg shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-500/10 rounded-full"><CheckCircle className="text-green-500" /></div>
                    <div>
                        <p className="text-sm text-muted-foreground">Published</p>
                        <h3 className="text-2xl font-bold">{publishedUploads}</h3>
                    </div>
                </div>
                <div className="p-6 bg-card border border-border rounded-lg shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-red-500/10 rounded-full"><XCircle className="text-red-500" /></div>
                    <div>
                        <p className="text-sm text-muted-foreground">Failed Jobs</p>
                        <h3 className="text-2xl font-bold">{failedUploads}</h3>
                    </div>
                </div>
            </div>

            <h2 className="text-xl font-semibold mt-8">Recent Uploads</h2>
            <div className="bg-card border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-secondary/50 text-muted-foreground">
                        <tr>
                            <th className="px-6 py-3">Video</th>
                            <th className="px-6 py-3">Channel</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Scheduled</th>
                        </tr>
                    </thead>
                    <tbody>
                        {uploads.slice(0, 5).map((job) => (
                            <tr key={job.id} className="border-b border-border hover:bg-secondary/20">
                                <td className="px-6 py-4 font-medium">{job.title || job.video_path.split('/').pop()}</td>
                                <td className="px-6 py-4">{channels.find(c => c.id === job.channel_id)?.name || job.channel_id}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold
                                        ${job.status === 'published' ? 'bg-green-500/20 text-green-400' : 
                                          job.status === 'failed' ? 'bg-red-500/20 text-red-400' : 
                                          'bg-yellow-500/20 text-yellow-400'}`}>
                                        {job.status.toUpperCase()}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-muted-foreground">{job.scheduled_at ? new Date(job.scheduled_at).toLocaleString() : 'Immediate'}</td>
                            </tr>
                        ))}
                        {uploads.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">No recent upload jobs.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
