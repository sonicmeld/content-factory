import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMetadataLibrary } from '../services/api';
import { BookMarked, Search, Loader2 } from 'lucide-react';

export default function MetadataLibraryPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [category, setCategory] = useState('');

    const { data: libraryItems, isLoading } = useQuery({
        queryKey: ['metadata-library', searchQuery, category],
        queryFn: () => getMetadataLibrary({ search_query: searchQuery || undefined, category: category || undefined })
    });

    const { data: allItems } = useQuery({
        queryKey: ['metadata-library', 'all'],
        queryFn: () => getMetadataLibrary({})
    });

    const derivedCategories = Array.from(
        new Set((allItems || []).map(item => item.category).filter(Boolean))
    ).sort();

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <BookMarked className="w-6 h-6 text-primary" />
                        Metadata Library
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Global curated metadata for reuse across all channels.
                    </p>
                </div>
            </div>

            <div className="flex gap-4 items-center bg-card p-4 rounded-xl shadow-sm border border-border">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search metadata..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-secondary border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                </div>
                <div className="w-64">
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    >
                        <option value="">All Categories</option>
                        {derivedCategories.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            ) : libraryItems?.length === 0 ? (
                <div className="text-center py-12 bg-secondary/30 rounded-xl border border-border border-dashed">
                    <p className="text-muted-foreground">No metadata found in the library.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {libraryItems?.map((item) => (
                        <div key={item.id} className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col gap-3">
                            <div>
                                <div className="flex justify-between items-start gap-2">
                                    <h3 className="font-semibold text-sm line-clamp-2">{item.title}</h3>
                                    {item.category && (
                                        <span className="shrink-0 px-2 py-0.5 bg-primary/10 text-primary text-[10px] uppercase font-bold tracking-wider rounded-full">
                                            {item.category}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-2 line-clamp-4 leading-relaxed">
                                    {item.description}
                                </p>
                            </div>
                            
                            {item.tags && (
                                <div className="mt-auto pt-3 border-t border-border/50 flex flex-wrap gap-1">
                                    {item.tags.split(',').map((tag: string, idx: number) => (
                                        <span key={idx} className="px-1.5 py-0.5 bg-secondary text-secondary-foreground text-[10px] rounded-sm">
                                            {tag.trim()}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
