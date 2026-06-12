import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileEdit, Trash2, Calendar, BookOpen, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { getPromptDrafts, getChannels, approvePromptDraft, discardPromptDraft } from '../../services/api';
import type { PromptExpertDraft } from '../../services/api';
import { toast } from 'sonner';

interface Props {
    workspaceId: string;
}

export default function GeneratedDraftsTab({ workspaceId }: Props) {
    const queryClient = useQueryClient();
    const [selectedDraft, setSelectedDraft] = useState<PromptExpertDraft | null>(null);

    // Modal Form States
    const [targetChannelId, setTargetChannelId] = useState('global');
    const [title, setTitle] = useState('');
    const [topic, setTopic] = useState('');
    const [keywords, setKeywords] = useState('');
    const [notes, setNotes] = useState('');

    const { data: drafts = [], isLoading: isDraftsLoading } = useQuery({
        queryKey: ['prompt-drafts', workspaceId],
        queryFn: () => getPromptDrafts(workspaceId)
    });

    const { data: channels = [] } = useQuery({
        queryKey: ['channels'],
        queryFn: getChannels
    });

    const discardMutation = useMutation({
        mutationFn: discardPromptDraft,
        onSuccess: () => {
            toast.success("Draft discarded successfully");
            queryClient.invalidateQueries({ queryKey: ['prompt-drafts', workspaceId] });
        },
        onError: (err: any) => {
            toast.error(`Failed to discard draft: ${err.message}`);
        }
    });

    const approveMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) => approvePromptDraft(id, data),
        onSuccess: () => {
            toast.success("Draft approved and context successfully saved!");
            setSelectedDraft(null);
            queryClient.invalidateQueries({ queryKey: ['prompt-drafts', workspaceId] });
            queryClient.invalidateQueries({ queryKey: ['prompt-contexts'] });
        },
        onError: (err: any) => {
            toast.error(`Failed to approve context: ${err.response?.data?.detail || err.message}`);
        }
    });

    const handleOpenReview = (draft: PromptExpertDraft) => {
        setSelectedDraft(draft);
        setTargetChannelId('global');
        // Pre-fill fields
        setTitle(`Expert: ${draft.input_text.substring(0, 30)}${draft.input_text.length > 30 ? '...' : ''}`);
        setTopic(draft.topic);
        setKeywords(draft.keywords.join(', '));
        setNotes(draft.notes);
    };

    const handleSaveApproval = () => {
        if (!selectedDraft) return;
        if (!title.trim()) {
            toast.error("Please specify a Title for the Prompt Context");
            return;
        }

        approveMutation.mutate({
            id: selectedDraft.id,
            data: {
                channel_id: targetChannelId,
                title: title.trim(),
                prompt_type: selectedDraft.expert_type,
                topic: topic.trim(),
                keywords: keywords.trim(),
                notes: notes.trim()
            }
        });
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (isDraftsLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <div className="animate-spin text-primary">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <p className="text-xs text-muted-foreground">Loading draft contexts...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center pb-2 border-b border-border/60">
                <div>
                    <h2 className="text-sm font-bold text-foreground">Draft List Pending Review</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Semua draf AI harus ditinjau dan diedit secara manual sebelum disimpan ke sistem produksi.</p>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 bg-secondary text-foreground rounded-full border border-border/80">
                    {drafts.length} draft(s) pending
                </span>
            </div>

            {/* Draft Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {drafts.map(draft => (
                    <div key={draft.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
                        <div>
                            {/* Card Header Info */}
                            <div className="flex items-center justify-between mb-4">
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                                    draft.expert_type === 'metadata' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                    draft.expert_type === 'thumbnail' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                    'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                }`}>
                                    {draft.expert_type} expert
                                </span>
                                <span className="text-[10px] text-muted-foreground flex items-center">
                                    <Calendar className="w-3 h-3 mr-1" /> {formatDate(draft.created_at)}
                                </span>
                            </div>

                            {/* Input Prompt Preview */}
                            <div className="bg-secondary/40 border border-border/60 rounded-xl p-3 mb-4 text-xs">
                                <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-1">Source Input:</p>
                                <p className="font-semibold text-foreground italic">"{draft.input_text}"</p>
                            </div>

                            {/* Content Snippet */}
                            <div className="space-y-3">
                                <div>
                                    <h4 className="text-xs font-bold text-foreground flex items-center">
                                        <BookOpen className="w-3.5 h-3.5 mr-1 text-primary" /> Topic Context
                                    </h4>
                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                                        {draft.topic}
                                    </p>
                                </div>

                                {draft.keywords.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-foreground mb-1.5">Visual/Theme Keywords</h4>
                                        <div className="flex flex-wrap gap-1">
                                            {draft.keywords.map((kw, i) => (
                                                <span key={i} className="text-[10px] bg-secondary border border-border/60 text-foreground px-2 py-0.5 rounded-md">
                                                    {kw}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Card Actions */}
                        <div className="flex gap-2.5 mt-6 pt-4 border-t border-border/60">
                            <button
                                onClick={() => handleOpenReview(draft)}
                                className="flex-1 flex items-center justify-center space-x-1.5 bg-primary text-primary-foreground hover:opacity-90 transition py-2 rounded-xl text-xs font-bold shadow-sm"
                            >
                                <FileEdit className="w-3.5 h-3.5" />
                                <span>Review & Approve</span>
                            </button>
                            <button
                                onClick={() => {
                                    if (confirm("Are you sure you want to discard this draft?")) {
                                        discardMutation.mutate(draft.id);
                                    }
                                }}
                                disabled={discardMutation.isPending}
                                className="flex items-center justify-center bg-secondary border border-border text-muted-foreground hover:text-red-500 hover:border-red-500/20 transition p-2 rounded-xl"
                                title="Discard Draft"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}

                {drafts.length === 0 && (
                    <div className="col-span-2 bg-card border border-border border-dashed rounded-2xl py-12 flex flex-col items-center justify-center text-center">
                        <AlertCircle className="w-10 h-10 text-muted-foreground/60 mb-2" />
                        <p className="text-sm font-semibold text-foreground">No draft contexts pending</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">Gunakan tab 'Prompt Expert Assistant' untuk menjabarkan ide topik baru menggunakan AI.</p>
                    </div>
                )}
            </div>

            {/* Review Modal */}
            {selectedDraft && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
                            <div>
                                <h3 className="font-bold text-sm text-foreground flex items-center">
                                    <FileEdit className="w-4 h-4 mr-2 text-primary" /> Review & Approve Draft Context
                                </h3>
                                <p className="text-[11px] text-muted-foreground mt-0.5">Tinjau dan sesuaikan parameter sebelum didaftarkan sebagai context aktif.</p>
                            </div>
                            <button
                                onClick={() => setSelectedDraft(null)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Scroll Content */}
                        <div className="p-5 overflow-y-auto space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="font-bold text-foreground">Target Sub-Channel</label>
                                    <select
                                        value={targetChannelId}
                                        onChange={(e) => setTargetChannelId(e.target.value)}
                                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                    >
                                        <option value="global">Global Shared Context (No sub-channel)</option>
                                        {channels.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="font-bold text-foreground">Draft Context Title</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Enter title..."
                                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="font-bold text-foreground">Topic Description</label>
                                <textarea
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    rows={3}
                                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="font-bold text-foreground">Keywords (Comma separated)</label>
                                <input
                                    type="text"
                                    value={keywords}
                                    onChange={(e) => setKeywords(e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="font-bold text-foreground">System Guidelines & Notes</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={6}
                                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed font-mono text-[11px]"
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-border flex justify-end gap-2.5 bg-muted/10 shrink-0">
                            <button
                                onClick={() => setSelectedDraft(null)}
                                className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveApproval}
                                disabled={approveMutation.isPending}
                                className="flex items-center bg-primary text-primary-foreground font-bold px-4 py-2 rounded-xl text-xs hover:opacity-90 disabled:opacity-50 transition shadow-sm"
                            >
                                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                                <span>{approveMutation.isPending ? "Approving..." : "Approve & Save Context"}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
