import { useQuery } from '@tanstack/react-query';
import { getChannels, getUploadJobs, getUploadLogs } from '../services/api';
import { formatToJakartaTime } from '../utils/formatDate';
import { MonitorPlay, Upload, CheckCircle, XCircle, Terminal } from 'lucide-react';

export default function Dashboard() {
    const { data: channels = [] } = useQuery({ queryKey: ['channels'], queryFn: getChannels });
    const { data: uploads = [] } = useQuery({ 
        queryKey: ['uploads'], 
        queryFn: () => getUploadJobs(),
        refetchInterval: 3000
    });
    const { data: logs = [] } = useQuery({
        queryKey: ['upload-logs'],
        queryFn: () => getUploadLogs(50),
        refetchInterval: 3000
    });

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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                {/* Left Column: Recent Uploads */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-semibold">Recent Uploads</h2>
                    <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
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
                                        <td className="px-6 py-4 font-medium">
                                            <div>
                                                <span>{job.title || job.video_path.split('/').pop()}</span>
                                                {job.status === 'uploading' && job.progress !== undefined && job.progress !== null && (
                                                    <div className="w-full bg-secondary rounded-full h-1.5 mt-1.5 max-w-[200px]">
                                                        <div 
                                                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" 
                                                            style={{ width: `${job.progress}%` }}
                                                        ></div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">{channels.find(c => c.id === job.channel_id)?.name || job.channel_id}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold
                                                ${job.status === 'published' ? 'bg-green-500/20 text-green-400' : 
                                                  job.status === 'failed' ? 'bg-red-500/20 text-red-400' : 
                                                  job.status === 'uploading' ? 'bg-blue-500/20 text-blue-400' :
                                                  'bg-yellow-500/20 text-yellow-400'}`}>
                                                {job.status === 'uploading' && job.progress !== undefined && job.progress !== null
                                                    ? `UPLOADING (${job.progress}%)`
                                                    : job.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">{job.scheduled_at ? formatToJakartaTime(job.scheduled_at) : 'Immediate'}</td>
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

                {/* Right Column: Live Logs Terminal */}
                <div className="lg:col-span-1 space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-blue-400" />
                        Live Upload Logs
                    </h2>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 font-mono text-[11px] text-zinc-300 h-[300px] overflow-y-auto shadow-inner">
                        <div className="flex flex-col gap-1.5">
                            {logs.length === 0 ? (
                                <p className="text-zinc-600 italic">No upload activity logged yet.</p>
                            ) : (
                                [...logs].reverse().map((log, index) => (
                                    <div key={index} className="leading-relaxed whitespace-pre-wrap break-all border-b border-zinc-900/50 pb-1.5 last:border-0 last:pb-0">
                                        <span className="text-zinc-600 font-semibold">›</span> {log}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
