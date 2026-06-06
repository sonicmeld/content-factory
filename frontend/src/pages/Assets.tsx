import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAssets, getChannels, uploadAsset, deleteAsset } from '../services/api';
import { FileText, FileVideo, Download, UploadCloud, Trash2, X, Image as ImageIcon, Music, HardDrive } from 'lucide-react';
import { toast } from 'sonner';
import { useParams } from 'react-router-dom';
const TextPreviewSnippet = ({ url }: { url: string }) => {
    const { data: snippet, isLoading } = useQuery({
        queryKey: ['textPreview', url],
        queryFn: async () => {
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch text');
            const text = await res.text();
            return text.length > 80 ? text.substring(0, 80) + '...' : text;
        },
        staleTime: Infinity,
    });

    if (isLoading) return <div className="text-xs text-muted-foreground animate-pulse p-4 text-left w-full h-full flex items-start">Loading preview...</div>;
    return <div className="text-xs text-muted-foreground p-4 text-left w-full h-full overflow-hidden whitespace-pre-wrap font-mono break-all bg-background/50">{snippet}</div>;
};

export default function Assets() {
    const { slug: workspaceSlug } = useParams();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<string>('shared');
    const [filterType, setFilterType] = useState<string>('all');
    
    // Upload Modal State
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [uploadChannelId, setUploadChannelId] = useState<string>('shared');
    const [uploadAssetType, setUploadAssetType] = useState<string>('footage');
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: channels = [] } = useQuery({ queryKey: ['channels'], queryFn: getChannels });
    
    const workspaceChannel = workspaceSlug ? channels.find(c => c.slug === workspaceSlug) : null;
    const resolvedTab = workspaceSlug ? (workspaceChannel?.id || 'shared') : activeTab;

    const { data: assets = [], isFetching } = useQuery({ 
        queryKey: ['assets', resolvedTab, filterType !== 'all' ? filterType : undefined], 
        queryFn: () => getAssets(resolvedTab, filterType !== 'all' ? filterType : undefined) 
    });

    const deleteMutation = useMutation({
        mutationFn: deleteAsset,
        onSuccess: () => {
            toast.success("Asset deleted successfully");
            queryClient.invalidateQueries({ queryKey: ['assets'] });
        },
        onError: () => toast.error("Failed to delete asset")
    });

    const uploadMutation = useMutation({
        mutationFn: () => {
            if (!uploadFile) throw new Error("No file selected");
            return uploadAsset(uploadFile, workspaceSlug ? (workspaceChannel?.id || 'shared') : uploadChannelId, uploadAssetType);
        },
        onSuccess: () => {
            toast.success("Asset uploaded successfully");
            setIsUploadOpen(false);
            setUploadFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            queryClient.invalidateQueries({ queryKey: ['assets'] });
        },
        onError: () => toast.error("Failed to upload asset")
    });

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this asset?")) {
            deleteMutation.mutate(id);
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileIcon = (mimeType: string) => {
        if (mimeType.startsWith('image/')) return <ImageIcon className="w-10 h-10 text-muted-foreground" />;
        if (mimeType.startsWith('video/')) return <FileVideo className="w-10 h-10 text-muted-foreground" />;
        if (mimeType.startsWith('audio/')) return <Music className="w-10 h-10 text-muted-foreground" />;
        return <FileText className="w-10 h-10 text-muted-foreground" />;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border pb-4 gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Asset Library</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Manage reusable resources and content blocks.</p>
                </div>
                <button 
                    onClick={() => setIsUploadOpen(true)}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center shadow-sm"
                >
                    <UploadCloud className="w-4 h-4 mr-2" />
                    Upload Asset
                </button>
            </div>

            {/* Navigation & Filters */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-card p-4 rounded-xl border border-border shadow-sm">
                {!workspaceSlug ? (
                    <div className="flex gap-2 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
                        <button 
                            onClick={() => setActiveTab('shared')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'shared' ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-secondary text-muted-foreground'}`}
                        >
                            Shared Assets
                        </button>
                        {channels.map(c => (
                            <button 
                                key={c.id}
                                onClick={() => setActiveTab(c.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === c.id ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-secondary text-muted-foreground'}`}
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="flex gap-2 w-full lg:w-auto">
                        <span className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground shadow-sm whitespace-nowrap">
                            Channel Assets
                        </span>
                    </div>
                )}
                
                <div className="flex gap-2 w-full lg:w-auto">
                    <select 
                        className="bg-background border border-border text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-ring focus:border-primary w-full lg:w-auto shadow-sm"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="all">All Types</option>
                        <option value="footage">Footage</option>
                        <option value="thumbnails">Thumbnails</option>
                        <option value="audio">Audio</option>
                        <option value="prompts">Prompts</option>
                    </select>
                </div>
            </div>

            {/* Asset Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {assets.map(asset => {
                    const slug = channels.find(c => c.id === asset.channel_id)?.slug || 'shared';
                    const isImage = asset.mime_type.startsWith('image/');
                    const isText = asset.mime_type.startsWith('text/') || asset.filename.endsWith('.txt') || asset.filename.endsWith('.md');
                    
                    // Note: file_path contains the UUID and extension
                    const ext = asset.filename.split('.').pop() || '';
                    const finalExt = ext ? `.${ext}` : '';
                    const downloadUrl = asset.channel_id 
                        ? `/data/channels/${slug}/${asset.asset_type}/${asset.id}${finalExt}`
                        : `/data/shared/${asset.asset_type}/${asset.id}${finalExt}`;

                    return (
                        <div key={asset.id} className="bg-card border border-border rounded-xl overflow-hidden group hover:border-primary/50 transition-colors flex flex-col shadow-sm">
                            <div className="h-40 bg-secondary flex items-center justify-center relative overflow-hidden">
                                {isImage ? (
                                    <img src={downloadUrl} alt={asset.filename} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                ) : isText ? (
                                    <TextPreviewSnippet url={downloadUrl} />
                                ) : (
                                    getFileIcon(asset.mime_type)
                                )}
                                 
                                <div className="absolute inset-0 bg-background/80 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <a href={downloadUrl} target="_blank" rel="noreferrer" download className="bg-primary hover:bg-primary/90 text-primary-foreground p-2.5 rounded-full transition-colors shadow-sm">
                                        <Download className="w-4 h-4" />
                                    </a>
                                    <button onClick={() => handleDelete(asset.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground p-2.5 rounded-full transition-colors shadow-sm">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-4 flex-1 flex flex-col justify-between">
                                <div>
                                    <p className="text-sm font-semibold truncate text-foreground" title={asset.filename}>{asset.filename}</p>
                                    <div className="flex items-center justify-between mt-3">
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground uppercase tracking-wider">
                                            {asset.asset_type}
                                        </span>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                                            <HardDrive className="w-3 h-3" />
                                            {formatBytes(asset.file_size)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        {new Date(asset.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {!isFetching && assets.length === 0 && (
                <div className="py-24 text-center border-2 border-dashed border-border rounded-xl bg-card/30">
                    <div className="bg-secondary w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground">No assets found</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                        This location is currently empty. Upload files to start building your library.
                    </p>
                </div>
            )}

            {/* Upload Modal Overlay */}
            {isUploadOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
                    <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/20">
                            <h2 className="text-lg font-semibold">Upload Asset</h2>
                            <button onClick={() => setIsUploadOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-secondary">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-5">
                                {!workspaceSlug && (
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Target Channel</label>
                                        <select 
                                            className="w-full bg-secondary border border-border text-sm rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring focus:border-primary"
                                            value={uploadChannelId}
                                            onChange={(e) => setUploadChannelId(e.target.value)}
                                        >
                                            <option value="shared">Shared Assets (Global)</option>
                                            {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Asset Type</label>
                                <select 
                                    className="w-full bg-background border border-border text-sm rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring focus:border-primary shadow-sm"
                                    value={uploadAssetType}
                                    onChange={(e) => setUploadAssetType(e.target.value)}
                                >
                                    <option value="footage">Footage</option>
                                    <option value="thumbnails">Thumbnails</option>
                                    <option value="audio">Audio</option>
                                    <option value="prompts">Prompts</option>
                                </select>
                            </div>

                            <div className="space-y-2 pt-2">
                                <label className="text-sm font-medium">Select File</label>
                                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:bg-secondary/50 hover:border-primary/50 transition-all relative group cursor-pointer">
                                    <input 
                                        type="file" 
                                        ref={fileInputRef}
                                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    {uploadFile ? (
                                        <div className="flex flex-col items-center">
                                            <div className="bg-primary/10 p-3 rounded-full mb-3">
                                                <FileText className="w-8 h-8 text-primary" />
                                            </div>
                                            <p className="text-sm font-medium text-foreground truncate max-w-full px-4">{uploadFile.name}</p>
                                            <p className="text-xs text-muted-foreground mt-1 font-medium">{formatBytes(uploadFile.size)}</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <div className="bg-secondary p-3 rounded-full mb-3 group-hover:bg-primary/10 transition-colors">
                                                <UploadCloud className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                                            </div>
                                            <p className="text-sm font-medium text-foreground">Click or drag file here</p>
                                            <p className="text-xs text-muted-foreground mt-1">Supports up to 2GB limits</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-5 bg-muted/20 border-t border-border flex justify-end gap-3">
                            <button 
                                onClick={() => setIsUploadOpen(false)}
                                className="px-4 py-2 rounded-md text-sm font-medium text-foreground bg-background border border-border hover:bg-secondary transition-colors shadow-sm"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => uploadMutation.mutate()}
                                disabled={!uploadFile || uploadMutation.isPending}
                                className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-sm"
                            >
                                {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
