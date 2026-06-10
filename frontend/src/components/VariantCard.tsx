
import type { MetadataVariant } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, Trash2 } from 'lucide-react';

interface Props {
    variant: MetadataVariant;
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
    onPublish?: (variant: MetadataVariant) => void;
    isSelecting?: boolean;
    isDeleting?: boolean;
}

export default function VariantCard({ variant, onSelect, onDelete, onPublish, isSelecting, isDeleting }: Props) {
    return (
        <div className={`p-4 rounded-lg border transition-colors ${variant.is_selected ? 'border-primary bg-primary/5' : 'border-border/60 bg-secondary/20'}`}>
            <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Title Candidate</p>
                    <p className="text-sm font-semibold truncate" title={variant.title}>{variant.title || 'No Title'}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {variant.is_selected ? (
                        <>
                            <span className="flex items-center gap-1.5 px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Selected
                            </span>
                            {onPublish && (
                                <button
                                    onClick={() => onPublish(variant)}
                                    className="px-3 py-1 bg-secondary text-foreground hover:bg-secondary/80 text-xs font-medium rounded transition-colors"
                                >
                                    Publish to Library
                                </button>
                            )}
                        </>
                    ) : (
                        <button
                            onClick={() => onSelect(variant.id)}
                            disabled={isSelecting || isDeleting}
                            className="px-3 py-1 bg-secondary text-foreground hover:bg-secondary/80 text-xs font-medium rounded transition-colors disabled:opacity-50"
                        >
                            Select
                        </button>
                    )}
                    
                    {!variant.is_selected && (
                        <button
                            onClick={() => onDelete(variant.id)}
                            disabled={isSelecting || isDeleting}
                            className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                            title="Delete Variant"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>
            
            <div className="mb-4">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Description</p>
                <p className="text-xs text-muted-foreground line-clamp-3" title={variant.description}>{variant.description || 'No Description'}</p>
            </div>
            
            <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 bg-secondary/50 px-1.5 py-0.5 rounded">
                        Combo: {variant.source_combo || 'Unknown'}
                    </span>
                    {variant.source_context && (
                        <span className="flex items-center gap-1 bg-secondary/50 px-1.5 py-0.5 rounded">
                            Context: {variant.source_context}
                        </span>
                    )}
                </div>
                <span>{formatDistanceToNow(new Date(variant.created_at), { addSuffix: true })}</span>
            </div>
        </div>
    );
}
