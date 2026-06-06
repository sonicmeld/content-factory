import { useState, useRef } from 'react';
import { PackagePlus, ArrowLeft, Loader2, FileVideo, Clock, UploadCloud } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getChannels, createPackage } from '../../services/api';
import { toast } from 'sonner';

export default function CreatePackage() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [packageNumber, setPackageNumber] = useState('');
    const [status, setStatus] = useState('draft');
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [timestampFile, setTimestampFile] = useState<File | null>(null);

    const videoInputRef = useRef<HTMLInputElement>(null);
    const timestampInputRef = useRef<HTMLInputElement>(null);

    const { data: channels = [] } = useQuery({ queryKey: ['channels'], queryFn: getChannels });
    const currentChannel = channels.find(c => c.slug === slug);

    const createMutation = useMutation({
        mutationFn: async () => {
            if (!currentChannel || !videoFile) throw new Error("Missing required fields");
            
            const formData = new FormData();
            formData.append('channel_id', currentChannel.id);
            formData.append('package_number', packageNumber);
            formData.append('status', status);
            formData.append('video', videoFile);
            if (timestampFile) {
                formData.append('timestamp', timestampFile);
            }
            
            return createPackage(formData);
        },
        onSuccess: () => {
            toast.success('Content Package created successfully');
            queryClient.invalidateQueries({ queryKey: ['packages'] });
            navigate(`/workspace/${slug}/packages`);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.detail || err.message || 'Failed to create package');
        }
    });

    const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setVideoFile(file);
            
            // Auto-suggest package number if empty
            if (!packageNumber) {
                // e.g. "01.mp4" -> "01", "episode_15.mp4" -> "episode_15"
                const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                setPackageNumber(nameWithoutExt);
            }
        }
    };

    const handleTimestampSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setTimestampFile(e.target.files[0]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!packageNumber || !videoFile || !currentChannel?.id) return;
        createMutation.mutate();
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto pb-12">
            <div className="flex items-center gap-4">
                <Link 
                    to={`/workspace/${slug}/packages`}
                    className="p-2 -ml-2 rounded-md hover:bg-secondary text-muted-foreground transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Create Package</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Assemble a new content package by uploading production files.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-card border border-border p-6 rounded-xl shadow-sm">
                <div className="space-y-6">
                    
                    {/* Video File Upload */}
                    <div className="space-y-3">
                        <label className="text-sm font-semibold flex items-center gap-2">
                            <FileVideo className="w-4 h-4 text-blue-500" />
                            Production Video (Required)
                        </label>
                        <div 
                            className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-secondary/20 transition-colors"
                            onClick={() => videoInputRef.current?.click()}
                        >
                            <input 
                                type="file" 
                                ref={videoInputRef}
                                className="hidden" 
                                accept=".mp4"
                                onChange={handleVideoSelect}
                            />
                            <div className="bg-blue-500/10 p-3 rounded-full mb-3">
                                <UploadCloud className="w-6 h-6 text-blue-500" />
                            </div>
                            {videoFile ? (
                                <div>
                                    <p className="text-sm font-medium">{videoFile.name}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-sm font-medium">Click to select MP4 file</p>
                                    <p className="text-xs text-muted-foreground mt-1">Must be a valid .mp4 video file</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Timestamp File Upload */}
                    <div className="space-y-3 pt-4 border-t border-border">
                        <label className="text-sm font-semibold flex items-center gap-2">
                            <Clock className="w-4 h-4 text-emerald-500" />
                            Timestamp File (Optional)
                        </label>
                        <div 
                            className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-secondary/20 transition-colors"
                            onClick={() => timestampInputRef.current?.click()}
                        >
                            <input 
                                type="file" 
                                ref={timestampInputRef}
                                className="hidden" 
                                accept=".txt"
                                onChange={handleTimestampSelect}
                            />
                            <div className="bg-emerald-500/10 p-3 rounded-full mb-3">
                                <UploadCloud className="w-6 h-6 text-emerald-500" />
                            </div>
                            {timestampFile ? (
                                <div>
                                    <p className="text-sm font-medium">{timestampFile.name}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{(timestampFile.size / 1024).toFixed(2)} KB</p>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-sm font-medium">Click to select TXT file</p>
                                    <p className="text-xs text-muted-foreground mt-1">Only .txt files are supported</p>
                                </div>
                            )}
                        </div>
                        {timestampFile && (
                            <div className="flex justify-end">
                                <button 
                                    type="button" 
                                    onClick={() => setTimestampFile(null)}
                                    className="text-xs text-destructive hover:underline"
                                >
                                    Remove Timestamp
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Package Number</label>
                            <input 
                                type="text" 
                                required
                                placeholder="e.g. 01, 02, episode_15"
                                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                value={packageNumber}
                                onChange={e => setPackageNumber(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">This number is auto-suggested from the video filename but can be changed.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Initial Status</label>
                            <select 
                                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                value={status}
                                onChange={e => setStatus(e.target.value)}
                            >
                                <option value="draft">Draft (Needs review)</option>
                                <option value="ready">Ready (For queue)</option>
                            </select>
                        </div>
                    </div>

                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-border mt-6">
                    <Link 
                        to={`/workspace/${slug}/packages`}
                        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Cancel
                    </Link>
                    <button 
                        type="submit" 
                        disabled={createMutation.isPending || !packageNumber || !videoFile}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackagePlus className="w-4 h-4" />}
                        {createMutation.isPending ? 'Uploading...' : 'Create Package'}
                    </button>
                </div>
            </form>
        </div>
    );
}
