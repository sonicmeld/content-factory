import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getChannelPromptAssignments, getGlobalPromptContexts, createChannelPromptAssignment, updateChannelPromptAssignment, deleteChannelPromptAssignment } from '../services/api';
import { PlusCircle, Trash2, ArrowUp, ArrowDown, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ChannelPromptAssignment, PromptContext } from '../types';

interface PromptAssignmentManagerProps {
    channelId: string;
}

export default function PromptAssignmentManager({ channelId }: PromptAssignmentManagerProps) {
    const queryClient = useQueryClient();
    
    const [selectedPromptId, setSelectedPromptId] = useState('');

    const { data: assignments = [], isLoading: isAssignmentsLoading } = useQuery({
        queryKey: ['channel-prompt-assignments', channelId],
        queryFn: () => getChannelPromptAssignments(channelId, true)
    });

    const { data: globalPrompts = [] } = useQuery({
        queryKey: ['global-prompt-contexts'],
        queryFn: () => getGlobalPromptContexts(undefined, true)
    });

    const createMutation = useMutation({
        mutationFn: (promptId: string) => createChannelPromptAssignment(channelId, { prompt_id: promptId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['channel-prompt-assignments', channelId] });
            toast.success("Prompt assigned successfully");
            setSelectedPromptId('');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.detail || "Failed to assign prompt");
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ assignmentId, data }: { assignmentId: string, data: any }) => updateChannelPromptAssignment(channelId, assignmentId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['channel-prompt-assignments', channelId] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.detail || "Failed to update assignment");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (assignmentId: string) => deleteChannelPromptAssignment(channelId, assignmentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['channel-prompt-assignments', channelId] });
            toast.success("Assignment removed");
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.detail || "Failed to remove assignment");
        }
    });

    const handleAssign = () => {
        if (!selectedPromptId) return;
        createMutation.mutate(selectedPromptId);
    };

    const handleRemove = (assignmentId: string) => {
        if (window.confirm("Remove this prompt assignment?")) {
            deleteMutation.mutate(assignmentId);
        }
    };

    const handleMove = (assignment: ChannelPromptAssignment, index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index > 0) {
            const prev = assignments[index - 1];
            updateMutation.mutate({ assignmentId: assignment.id, data: { assignment_order: prev.assignment_order } });
            updateMutation.mutate({ assignmentId: prev.id, data: { assignment_order: assignment.assignment_order } });
        } else if (direction === 'down' && index < assignments.length - 1) {
            const next = assignments[index + 1];
            updateMutation.mutate({ assignmentId: assignment.id, data: { assignment_order: next.assignment_order } });
            updateMutation.mutate({ assignmentId: next.id, data: { assignment_order: assignment.assignment_order } });
        }
    };

    const unassignedPrompts = globalPrompts.filter(p => !assignments.some(a => a.prompt_id === p.id) && p.is_active);

    return (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-secondary/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-lg">Channel Prompt Assignments</h3>
                </div>
            </div>
            
            <div className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                    <select
                        value={selectedPromptId}
                        onChange={(e) => setSelectedPromptId(e.target.value)}
                        className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <option value="">-- Select a Global Prompt --</option>
                        {unassignedPrompts.map(p => (
                            <option key={p.id} value={p.id}>{p.title} ({p.prompt_type})</option>
                        ))}
                    </select>
                    <button
                        onClick={handleAssign}
                        disabled={!selectedPromptId || createMutation.isPending}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                        Assign Prompt
                    </button>
                </div>

                <div className="space-y-3">
                    {isAssignmentsLoading ? (
                        <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                    ) : assignments.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center p-4 border border-dashed border-border rounded-md">No prompts assigned to this channel.</p>
                    ) : (
                        <div className="space-y-2">
                            {assignments.map((assignment, index) => {
                                const prompt = globalPrompts.find(p => p.id === assignment.prompt_id);
                                return (
                                    <div key={assignment.id} className="flex items-center justify-between p-3 bg-secondary/20 border border-border rounded-md group hover:border-primary/30 transition-colors">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm text-card-foreground">
                                                {prompt?.title || 'Unknown Prompt'}
                                            </span>
                                            {prompt && (
                                                <span className="text-xs text-muted-foreground uppercase mt-0.5">
                                                    {prompt.prompt_type}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleMove(assignment, index, 'up')}
                                                disabled={index === 0}
                                                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded disabled:opacity-30"
                                            >
                                                <ArrowUp className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleMove(assignment, index, 'down')}
                                                disabled={index === assignments.length - 1}
                                                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded disabled:opacity-30"
                                            >
                                                <ArrowDown className="w-4 h-4" />
                                            </button>
                                            <div className="w-px h-4 bg-border mx-1"></div>
                                            <button 
                                                onClick={() => handleRemove(assignment.id)}
                                                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
