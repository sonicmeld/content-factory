import { formatDistanceToNow } from 'date-fns';
import { Image as ImageIcon, Video, File, Trash2, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { GenerationAsset } from '../types';

interface Props {
    asset: GenerationAsset;
    onDelete?: (id: string) => void;
    onSelect?: (id: string) => void;
    isDeleting?: boolean;
    isSelecting?: boolean;
}

const getAssetIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="w-8 h-8 text-muted-foreground" />;
    if (mimeType.startsWith('video/')) return <Video className="w-8 h-8 text-muted-foreground" />;
    return <File className="w-8 h-8 text-muted-foreground" />;
};

const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export default function AssetCard({ asset, onDelete, onSelect, isDeleting, isSelecting }: Props) {
    const isImage = asset.mime_type.startsWith('image/');
    const isSelected = asset.is_selected === 1;

    return (
        <div className={`group relative rounded-lg border bg-secondary/10 overflow-hidden flex flex-col transition-all ${
            isSelected ? 'border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)] ring-1 ring-green-500/20' : 'border-border/60 hover:border-border'
        }`}>
            <div className="aspect-video w-full bg-secondary/30 flex flex-col items-center justify-center relative">
                {asset.status === 'pending' ? (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="text-xs font-medium uppercase tracking-wider">Generating...</span>
                    </div>
                ) : asset.status === 'failed' ? (
                    <div className="flex flex-col items-center gap-2 text-red-400">
                        <AlertTriangle className="w-6 h-6" />
                        <span className="text-xs font-medium uppercase tracking-wider">Failed</span>
                    </div>
                ) : isImage ? (
                    <img 
                        src={`/data/${asset.file_path}`} 
                        alt={asset.filename} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            // Fallback if image fails to load
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                    />
                ) : null}
                
                {/* Fallback icon for non-images or failed image loads */}
                {asset.status === 'ready' && (
                    <div className={`absolute inset-0 flex items-center justify-center ${isImage ? 'hidden' : ''}`}>
                        {getAssetIcon(asset.mime_type)}
                    </div>
                )}
                
                {/* Selected Indicator Overlay */}
                {isSelected && (
                    <div className="absolute top-2 left-2 z-10">
                        <div className="bg-black/50 backdrop-blur-md rounded-full p-1">
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                        </div>
                    </div>
                )}

                {/* Hover Actions */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10">
                    {onSelect && asset.status === 'ready' && !isSelected && (
                        <button
                            onClick={() => onSelect(asset.id)}
                            disabled={isSelecting}
                            className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded shadow-lg transition-colors disabled:opacity-50"
                        >
                            {isSelecting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Select'}
                        </button>
                    )}
                    
                    {onDelete && !isSelected && (
                        <button
                            onClick={() => onDelete(asset.id)}
                            disabled={isDeleting}
                            className="p-1.5 bg-black/50 hover:bg-red-500/80 text-white rounded backdrop-blur-sm transition-colors disabled:opacity-50"
                            title="Delete Asset"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
            
            <div className="p-3 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-2">
                    <p className={`text-xs font-medium truncate flex-1 ${isSelected ? 'text-green-400' : ''}`} title={asset.filename}>
                        {asset.filename}
                    </p>
                    <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                        {formatBytes(asset.file_size)}
                    </span>
                </div>
                
                <div className="mt-auto flex items-center justify-between text-[10px] text-muted-foreground">
                    <div className="flex gap-1.5 items-center">
                        <span className={`px-1.5 py-0.5 rounded font-medium capitalize ${isSelected ? 'bg-green-500/10 text-green-400' : 'bg-secondary/50'}`}>
                            {asset.asset_type}
                        </span>
                        {asset.source_combo && (
                            <span className="px-1.5 py-0.5 rounded bg-secondary/50 truncate max-w-[80px]" title={asset.source_combo}>
                                {asset.source_combo}
                            </span>
                        )}
                    </div>
                    <span>{formatDistanceToNow(new Date(asset.created_at), { addSuffix: true })}</span>
                </div>
            </div>
        </div>
    );
}
