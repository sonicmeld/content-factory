import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getChannels, getPromptContexts, createPromptContext, updatePromptContext, deletePromptContext } from '../services/api';
import { Sparkles, PlusCircle, Edit2, Trash2, Loader2, X, FileText, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useParams } from 'react-router-dom';
import type { PromptContext } from '../types';

export default function PromptFactory() {
    const { slug } = useParams();
    const queryClient = useQueryClient();
    
    // Fetch channels to find the current channel by slug or list them
    const { data: channels = [] } = useQuery({ queryKey: ['channels'], queryFn: getChannels });
    
    // Determine active channel if in workspace
    const workspaceChannel = slug ? channels.find(c => c.slug === slug) : null;
    const [selectedChannelId, setSelectedChannelId] = useState('');
    
    const activeChannelId = workspaceChannel?.id || selectedChannelId;
    const activeChannel = channels.find(c => c.id === activeChannelId);

    // Fetch prompt contexts for the active channel
    const { data: contexts = [], isLoading: isContextsLoading } = useQuery({
        queryKey: ['prompt-contexts', activeChannelId],
        queryFn: () => getPromptContexts(activeChannelId, true), // Fetch all including inactive
        enabled: !!activeChannelId
    });

    // Form states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContext, setEditingContext] = useState<PromptContext | null>(null);
    const [title, setTitle] = useState('');
    const [topic, setTopic] = useState('');
    const [keywords, setKeywords] = useState('');
    const [notes, setNotes] = useState('');
    const [description, setDescription] = useState('');

    const openCreateModal = () => {
        setEditingContext(null);
        setTitle('');
        setTopic('');
        setKeywords('');
        setNotes('');
        setDescription('');
        setIsModalOpen(true);
    };

    const openEditModal = (ctx: PromptContext) => {
        setEditingContext(ctx);
        setTitle(ctx.title);
        setTopic(ctx.topic || '');
        setKeywords(ctx.keywords || '');
        setNotes(ctx.notes || '');
        setDescription(ctx.description || '');
        setIsModalOpen(true);
    };

    const createMutation = useMutation({
        mutationFn: (data: Partial<PromptContext>) => createPromptContext(activeChannelId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prompt-contexts', activeChannelId] });
            toast.success("Prompt Context created successfully");
            setIsModalOpen(false);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.detail || "Failed to create Prompt Context");
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: Partial<PromptContext> }) => updatePromptContext(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prompt-contexts', activeChannelId] });
            toast.success("Prompt Context updated successfully");
            setIsModalOpen(false);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.detail || "Failed to update Prompt Context");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deletePromptContext(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prompt-contexts', activeChannelId] });
            toast.success("Prompt Context deleted successfully");
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.detail || "Failed to delete Prompt Context");
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            toast.error("Title is required");
            return;
        }

        const payload = {
            title,
            topic: topic || undefined,
            keywords: keywords || undefined,
            notes: notes || undefined,
            description: description || undefined
        };

        if (editingContext) {
            updateMutation.mutate({ id: editingContext.id, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Are you sure you want to delete this prompt context?")) {
            deleteMutation.mutate(id);
        }
    };

    const handleToggleActive = (ctx: PromptContext) => {
        updateMutation.mutate({ id: ctx.id, data: { is_active: !ctx.is_active } });
    };

    return (
        <div className="space-y-8 max-w-6xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-primary" />
                        Prompt Contexts
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Manage reusable channel-level contexts that provide topic, keywords, and notes for YouTube metadata generation.
                    </p>
                </div>
                {activeChannelId && (
                    <button 
                        onClick={openCreateModal}
                        className="bg-primary text-primary-foreground px-4 py-2.5 rounded-md font-medium text-sm hover:bg-primary/90 flex items-center gap-2 shadow-sm transition-all hover:scale-[1.02]"
                    >
                        <PlusCircle className="w-4 h-4" /> Add Context
                    </button>
                )}
            </div>

            {/* General Channel Selector (Only visible if not inside a channel workspace) */}
            {!slug && (
                <div className="bg-card border border-border p-5 rounded-lg max-w-md shadow-sm">
                    <label className="text-sm font-semibold text-foreground mb-2 block">Select Channel Target</label>
                    <select 
                        className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                        value={selectedChannelId}
                        onChange={(e) => setSelectedChannelId(e.target.value)}
                    >
                        <option value="">Select a Channel...</option>
                        {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            )}

            {/* Context Manager Area */}
            {!activeChannelId ? (
                <div className="h-64 flex flex-col items-center justify-center border border-dashed border-border rounded-xl bg-secondary/10 text-muted-foreground space-y-2">
                    <Info className="w-8 h-8 text-muted-foreground/50" />
                    <p className="font-medium">Please select a channel to manage prompt contexts.</p>
                </div>
            ) : isContextsLoading ? (
                <div className="h-64 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : contexts.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center border border-dashed border-border rounded-xl bg-secondary/15 text-muted-foreground space-y-4">
                    <FileText className="w-10 h-10 text-muted-foreground/30" />
                    <div className="text-center">
                        <p className="font-semibold text-foreground">No prompt contexts yet</p>
                        <p className="text-sm mt-1">Create a context to start tuning metadata outputs for <strong>{activeChannel?.name}</strong>.</p>
                    </div>
                    <button 
                        onClick={openCreateModal}
                        className="bg-secondary text-secondary-foreground border border-border px-4 py-2 rounded-md font-medium text-sm hover:bg-secondary/80 flex items-center gap-2 transition-colors"
                    >
                        <PlusCircle className="w-4 h-4" /> Create First Context
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {contexts.map((ctx) => (
                        <div 
                            key={ctx.id}
                            className="bg-card border border-border rounded-lg p-5 flex flex-col justify-between shadow-sm hover:border-primary/45 transition-all group hover:shadow-md"
                        >
                            <div className="space-y-4">
                                <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
                                    <h3 className="font-semibold text-lg text-card-foreground group-hover:text-primary transition-colors truncate" title={ctx.title}>
                                        {ctx.title}
                                    </h3>
                                    <div className="flex items-center gap-1 opacity-80 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => handleToggleActive(ctx)}
                                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors"
                                            title={ctx.is_active ? "Disable Context" : "Enable Context"}
                                        >
                                            {ctx.is_active ? <X className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                                        </button>
                                        <button 
                                            onClick={() => openEditModal(ctx)}
                                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors"
                                            title="Edit Context"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(ctx.id)}
                                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                                            title="Delete Context"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3 text-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${ctx.is_active ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${ctx.is_active ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                                            {ctx.is_active ? 'Active' : 'Disabled'}
                                        </span>
                                    </div>
                                    {ctx.description && (
                                        <div>
                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">Description</span>
                                            <p className="text-muted-foreground text-xs leading-relaxed">{ctx.description}</p>
                                        </div>
                                    )}
                                    {ctx.topic && (
                                        <div>
                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">Topic</span>
                                            <p className="text-card-foreground font-medium">{ctx.topic}</p>
                                        </div>
                                    )}
                                    {ctx.keywords && (
                                        <div>
                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">Keywords</span>
                                            <p className="text-card-foreground font-medium text-xs bg-secondary/40 px-2 py-1 rounded border border-border/40 w-fit">{ctx.keywords}</p>
                                        </div>
                                    )}
                                    {ctx.notes && (
                                        <div>
                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">Notes</span>
                                            <p className="text-muted-foreground text-xs whitespace-pre-wrap leading-relaxed line-clamp-4">{ctx.notes}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="text-[10px] text-muted-foreground mt-4 pt-3 border-t border-border/30 flex items-center justify-between">
                                <span>Updated {new Date(ctx.updated_at).toLocaleDateString()}</span>
                                <span>Usage Count: 0</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Dialog */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-card border border-border rounded-xl max-w-lg w-full shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                        
                        <div className="p-5 border-b border-border flex items-center justify-between bg-secondary/20">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-primary" />
                                {editingContext ? 'Edit Prompt Context' : 'Add Prompt Context'}
                            </h2>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-secondary transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div>
                                <label className="text-sm font-semibold text-foreground mb-1 block">Context Title <span className="text-red-500">*</span></label>
                                <input 
                                    type="text"
                                    required
                                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                                    placeholder="e.g. Woodworking Beginner Series"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-foreground mb-1 block">Description</label>
                                <textarea 
                                    rows={2}
                                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                                    placeholder="Short summary of this context..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-foreground mb-1 block">Topic</label>
                                <input 
                                    type="text"
                                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                                    placeholder="e.g. 10 Woodworking Tips for Small Workshops"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-foreground mb-1 block">Keywords</label>
                                <input 
                                    type="text"
                                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                                    placeholder="e.g. woodworking, diy workshop, beginner woodworking"
                                    value={keywords}
                                    onChange={(e) => setKeywords(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-foreground mb-1 block">Notes / Niche Rules</label>
                                <textarea 
                                    rows={4}
                                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                                    placeholder="e.g. Educational content targeting hobbyists. Keep the tone friendly and encouraging."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                                <button 
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-secondary transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                    className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90 flex items-center justify-center gap-2 shadow-sm transition-colors"
                                >
                                    {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {editingContext ? 'Save Changes' : 'Create Context'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
