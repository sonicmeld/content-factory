import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useLocation } from 'react-router-dom';
import { getGlobalPromptContexts, createGlobalPromptContext, updatePromptContext, deletePromptContext, getChannels } from '../services/api';
import { Sparkles, PlusCircle, Edit2, Trash2, Loader2, X, FileText, Filter, Cpu, FileEdit } from 'lucide-react';
import { toast } from 'sonner';
import type { PromptContext } from '../types';

import PromptExpertAssistantTab from '../components/PromptLibrary/PromptExpertAssistantTab';
import GeneratedDraftsTab from '../components/PromptLibrary/GeneratedDraftsTab';

export default function PromptLibraryPage() {
    const queryClient = useQueryClient();
    const { slug } = useParams();
    const location = useLocation();
    
    const [activeTab, setActiveTab] = useState<'contexts' | 'expert' | 'drafts'>(
        (location.state as any)?.activeTab || 'contexts'
    );
    const [selectedType, setSelectedType] = useState<string>(''); // empty means all
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContext, setEditingContext] = useState<PromptContext | null>(null);
    
    // Form states
    const [promptType, setPromptType] = useState('metadata');
    const [title, setTitle] = useState('');
    const [topic, setTopic] = useState('');
    const [keywords, setKeywords] = useState('');
    const [notes, setNotes] = useState('');
    const [description, setDescription] = useState('');

    // Fetch channels to resolve workspace/channel ID
    const { data: channels = [] } = useQuery({ 
        queryKey: ['channels'], 
        queryFn: getChannels 
    });
    
    const currentChannel = channels.find(c => c.slug === slug);
    const workspaceId = currentChannel ? currentChannel.id : 'default';

    // Fetch global prompt contexts
    const { data: contexts = [], isLoading: isContextsLoading } = useQuery({
        queryKey: ['global-prompt-contexts', selectedType],
        queryFn: () => getGlobalPromptContexts(selectedType || undefined, true),
    });

    const openCreateModal = () => {
        setEditingContext(null);
        setPromptType('metadata');
        setTitle('');
        setTopic('');
        setKeywords('');
        setNotes('');
        setDescription('');
        setIsModalOpen(true);
    };

    const openEditModal = (ctx: PromptContext) => {
        setEditingContext(ctx);
        setPromptType(ctx.prompt_type || 'metadata');
        setTitle(ctx.title);
        setTopic(ctx.topic || '');
        setKeywords(ctx.keywords || '');
        setNotes(ctx.notes || '');
        setDescription(ctx.description || '');
        setIsModalOpen(true);
    };

    const createMutation = useMutation({
        mutationFn: (data: Partial<PromptContext>) => createGlobalPromptContext(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['global-prompt-contexts'] });
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
            queryClient.invalidateQueries({ queryKey: ['global-prompt-contexts'] });
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
            queryClient.invalidateQueries({ queryKey: ['global-prompt-contexts'] });
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
            prompt_type: promptType,
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
                        Global Prompt Library
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Manage global, reusable prompt contexts (Metadata, Thumbnail, Footage) to be assigned across channels.
                    </p>
                </div>
                {activeTab === 'contexts' && (
                    <button 
                        onClick={openCreateModal}
                        className="bg-primary text-primary-foreground px-4 py-2.5 rounded-md font-medium text-sm hover:bg-primary/90 flex items-center gap-2 shadow-sm transition-all hover:scale-[1.02]"
                    >
                        <PlusCircle className="w-4 h-4" /> Add Prompt
                    </button>
                )}
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-border gap-6 text-sm font-medium">
                <button
                    onClick={() => setActiveTab('contexts')}
                    className={`pb-3 border-b-2 transition-colors ${activeTab === 'contexts' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    Prompt Contexts
                </button>
                <button
                    onClick={() => setActiveTab('expert')}
                    className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'expert' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    <Cpu className="w-4 h-4" /> Prompt Expert Assistant
                </button>
                <button
                    onClick={() => setActiveTab('drafts')}
                    className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'drafts' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    <FileEdit className="w-4 h-4" /> Generated Drafts
                </button>
            </div>

            {/* Tab Body */}
            {activeTab === 'contexts' && (
                <div className="space-y-6">
                    {/* Filter */}
                    <div className="flex items-center gap-2 bg-card border border-border p-3 rounded-lg shadow-sm w-fit">
                        <Filter className="w-4 h-4 text-muted-foreground" />
                        <label className="text-sm font-medium text-foreground">Type Filter:</label>
                        <select 
                            className="bg-secondary border border-border rounded-md px-3 py-1 text-sm focus:ring-1 focus:ring-primary focus:outline-none ml-2"
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                        >
                            <option value="">All Types</option>
                            <option value="metadata">Metadata</option>
                            <option value="thumbnail">Thumbnail</option>
                            <option value="footage">Footage</option>
                        </select>
                    </div>

                    {/* Context Manager Area */}
                    {isContextsLoading ? (
                        <div className="h-64 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : contexts.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center border border-dashed border-border rounded-xl bg-secondary/15 text-muted-foreground space-y-4">
                            <FileText className="w-10 h-10 text-muted-foreground/30" />
                            <div className="text-center">
                                <p className="font-semibold text-foreground">No prompts found</p>
                                <p className="text-sm mt-1">Create a global prompt context to begin.</p>
                            </div>
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
                                            <div>
                                                <h3 className="font-semibold text-lg text-card-foreground group-hover:text-primary transition-colors line-clamp-1" title={ctx.title}>
                                                    {ctx.title}
                                                </h3>
                                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{ctx.prompt_type}</span>
                                            </div>
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
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'expert' && (
                <PromptExpertAssistantTab 
                    workspaceId={workspaceId}
                    onDraftGenerated={() => setActiveTab('drafts')}
                />
            )}

            {activeTab === 'drafts' && (
                <GeneratedDraftsTab 
                    workspaceId={workspaceId}
                />
            )}

            {/* Modal Dialog */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-card border border-border rounded-xl max-w-lg w-full shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                        
                        <div className="p-5 border-b border-border flex items-center justify-between bg-secondary/20">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-primary" />
                                {editingContext ? 'Edit Global Prompt' : 'Add Global Prompt'}
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
                                <label className="text-sm font-semibold text-foreground mb-1 block">Prompt Type</label>
                                <select 
                                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                                    value={promptType}
                                    onChange={(e) => setPromptType(e.target.value)}
                                >
                                    <option value="metadata">Metadata</option>
                                    <option value="thumbnail">Thumbnail</option>
                                    <option value="footage">Footage</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-foreground mb-1 block">Title <span className="text-red-500">*</span></label>
                                <input 
                                    type="text"
                                    required
                                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                                    placeholder="e.g. Universal Hook Framework"
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
                                    placeholder="e.g. Focus on educational hooks"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-foreground mb-1 block">Keywords</label>
                                <input 
                                    type="text"
                                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                                    placeholder="e.g. learning, step-by-step, actionable"
                                    value={keywords}
                                    onChange={(e) => setKeywords(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-foreground mb-1 block">Notes / Rules</label>
                                <textarea 
                                    rows={4}
                                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                                    placeholder="e.g. Make sure to adhere to strict brand guidelines."
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
