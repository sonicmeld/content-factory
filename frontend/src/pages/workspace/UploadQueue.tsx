import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQueue, removeFromQueue, reorderQueue, getChannels } from '../../services/api';
import { ChevronUp, ChevronDown, Trash2, ArrowLeft, Clock, ListOrdered, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export default function UploadQueue() {
    const { slug } = useParams<{ slug: string }>();
    const queryClient = useQueryClient();

    const { data: channels = [] } = useQuery({ queryKey: ['channels'], queryFn: getChannels });
    const currentChannel = channels.find(c => c.slug === slug);

    const { data: queue = [], isLoading } = useQuery({
        queryKey: ['queue', currentChannel?.id],
        queryFn: () => getQueue(currentChannel?.id!),
        enabled: !!currentChannel?.id
    });

    const removeMutation = useMutation({
        mutationFn: removeFromQueue,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['queue', currentChannel?.id] });
            queryClient.invalidateQueries({ queryKey: ['packages', currentChannel?.id] });
        }
    });

    const reorderMutation = useMutation({
        mutationFn: (newOrder: string[]) => reorderQueue(currentChannel?.id!, newOrder),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['queue', currentChannel?.id] });
        }
    });

    const handleMoveUp = (index: number) => {
        if (index === 0) return;
        const newOrder = queue.map(q => q.package_id);
        const temp = newOrder[index - 1];
        newOrder[index - 1] = newOrder[index];
        newOrder[index] = temp;
        reorderMutation.mutate(newOrder);
    };

    const handleMoveDown = (index: number) => {
        if (index === queue.length - 1) return;
        const newOrder = queue.map(q => q.package_id);
        const temp = newOrder[index + 1];
        newOrder[index + 1] = newOrder[index];
        newOrder[index] = temp;
        reorderMutation.mutate(newOrder);
    };

    if (!currentChannel) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to={`/workspace/${slug}`} className="p-2 hover:bg-secondary rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Upload Queue</h1>
                        <p className="text-muted-foreground">Manage publishing order for {currentChannel.name}</p>
                    </div>
                </div>
            </div>

            <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
                <div className="p-6 border-b bg-muted/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ListOrdered className="w-5 h-5 text-primary" />
                        <h2 className="font-semibold">Queued Packages</h2>
                    </div>
                    <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full">
                        {queue.length} items
                    </span>
                </div>

                {isLoading ? (
                    <div className="p-12 text-center text-muted-foreground">Loading queue...</div>
                ) : queue.length === 0 ? (
                    <div className="p-12 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground">Queue is empty</h3>
                        <p className="text-sm text-muted-foreground max-w-md mt-2">
                            There are no packages waiting to be published. Add packages to the queue from the Package Details page.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {queue.map((item, index) => (
                            <div key={item.package_id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                <div className="flex items-center gap-6">
                                    {/* Position / Reorder Controls */}
                                    <div className="flex flex-col items-center justify-center bg-secondary/50 rounded-lg p-1">
                                        <button 
                                            onClick={() => handleMoveUp(index)} 
                                            disabled={index === 0 || reorderMutation.isPending}
                                            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <ChevronUp className="w-4 h-4" />
                                        </button>
                                        <span className="text-sm font-bold w-6 text-center">{index + 1}</span>
                                        <button 
                                            onClick={() => handleMoveDown(index)} 
                                            disabled={index === queue.length - 1 || reorderMutation.isPending}
                                            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <ChevronDown className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Info */}
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <Link to={`/workspace/${slug}/packages/${item.package_id}`} className="font-semibold text-lg hover:underline">
                                                Package #{item.package_number}
                                            </Link>
                                            <span className="bg-blue-500/10 text-blue-500 text-xs px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                                                {item.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>Queued {format(new Date(item.created_at), 'PPp')}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div>
                                    <button 
                                        onClick={() => removeMutation.mutate(item.package_id)}
                                        disabled={removeMutation.isPending}
                                        className="p-2 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                        title="Remove from queue"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
