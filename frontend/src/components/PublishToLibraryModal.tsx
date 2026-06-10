import React, { useState } from 'react';
import { X, Loader2, BookMarked } from 'lucide-react';
import type { MetadataVariant } from '../types';

interface Props {
    variant: MetadataVariant;
    onClose: () => void;
    onPublish: (categoryId: string, tags: string) => void;
    isPublishing?: boolean;
}

export default function PublishToLibraryModal({ variant, onClose, onPublish, isPublishing }: Props) {
    const [category, setCategory] = useState('');
    const [tags, setTags] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onPublish(category, tags);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="bg-card border border-border w-full max-w-lg rounded-xl shadow-lg flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <BookMarked className="w-5 h-5 text-primary" />
                        Publish to Global Library
                    </h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-secondary">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-4 border-b border-border/50 bg-secondary/20">
                    <p className="text-sm font-semibold mb-1 truncate">{variant.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{variant.description}</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                            Category (Optional)
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                            disabled={isPublishing}
                        >
                            <option value="">None</option>
                            <option value="gaming">Gaming</option>
                            <option value="education">Education</option>
                            <option value="entertainment">Entertainment</option>
                            <option value="tech">Tech</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                            Tags (Optional)
                        </label>
                        <input
                            type="text"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="e.g., epic, funny, tutorial (comma separated)"
                            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
                            disabled={isPublishing}
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            disabled={isPublishing}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isPublishing}
                            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isPublishing && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isPublishing ? 'Publishing...' : 'Publish'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
