import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGenerationCombos, createGenerationCombo, updateGenerationCombo, deleteGenerationCombo } from '../services/api';
import { Plus, Pencil, Trash2, Power, PowerOff, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { GenerationCombo } from '../types';

export default function GenerationCombos() {
    const queryClient = useQueryClient();
    const { data: combos = [], isLoading } = useQuery({ 
        queryKey: ['generation-combos'], 
        queryFn: () => getGenerationCombos() 
    });
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCombo, setEditingCombo] = useState<GenerationCombo | null>(null);
    
    // Form state
    const [name, setName] = useState('');
    const [category, setCategory] = useState('metadata');
    const [endpointType, setEndpointType] = useState('chat');
    const [description, setDescription] = useState('');
    const [configJson, setConfigJson] = useState('');

    const resetForm = () => {
        setName('');
        setCategory('metadata');
        setEndpointType('chat');
        setDescription('');
        setConfigJson('');
        setEditingCombo(null);
    };

    const handleOpenCreate = () => {
        resetForm();
        setIsModalOpen(true);
    };

    const handleOpenEdit = (combo: GenerationCombo) => {
        setEditingCombo(combo);
        setName(combo.name);
        setCategory(combo.category);
        setEndpointType(combo.endpoint_type);
        setDescription(combo.description || '');
        setConfigJson(combo.config_json || '');
        setIsModalOpen(true);
    };

    const createMutation = useMutation({
        mutationFn: createGenerationCombo,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['generation-combos'] });
            setIsModalOpen(false);
            toast.success("Combo created successfully");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || "Failed to create combo");
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: Partial<GenerationCombo> }) => updateGenerationCombo(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['generation-combos'] });
            setIsModalOpen(false);
            toast.success("Combo updated successfully");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || "Failed to update combo");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteGenerationCombo,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['generation-combos'] });
            toast.success("Combo deleted successfully");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || "Failed to delete combo");
        }
    });

    const handleSave = () => {
        if (!name || !category || !endpointType) return;
        
        const payload = {
            name,
            category,
            endpoint_type: endpointType,
            description: description || undefined,
            config_json: configJson || undefined
        };

        if (editingCombo) {
            updateMutation.mutate({ id: editingCombo.id, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const handleToggleActive = (combo: GenerationCombo) => {
        updateMutation.mutate({ id: combo.id, data: { is_active: combo.is_active ? 0 : 1 } });
    };

    const handleDelete = (combo: GenerationCombo) => {
        if (confirm(`Are you sure you want to delete combo: ${combo.name}?`)) {
            deleteMutation.mutate(combo.id);
        }
    };

    return (
        <div className="max-w-6xl space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold mb-2">Generation Combos</h1>
                    <p className="text-muted-foreground">Manage AI generation combos for metadata, thumbnails, and footage.</p>
                </div>
                <button 
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium"
                >
                    <Plus className="w-4 h-4" /> Add Combo
                </button>
            </div>

            <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
                            <tr>
                                <th className="px-6 py-4 font-medium">Name</th>
                                <th className="px-6 py-4 font-medium">Category</th>
                                <th className="px-6 py-4 font-medium">Endpoint</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium">Description</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        Loading combos...
                                    </td>
                                </tr>
                            ) : combos.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                                        No combos found. Create one to get started.
                                    </td>
                                </tr>
                            ) : (
                                combos.map((combo) => (
                                    <tr key={combo.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                                        <td className="px-6 py-4 font-medium">{combo.name}</td>
                                        <td className="px-6 py-4 capitalize">{combo.category}</td>
                                        <td className="px-6 py-4 capitalize">{combo.endpoint_type}</td>
                                        <td className="px-6 py-4">
                                            {combo.is_active ? (
                                                <span className="inline-flex items-center gap-1.5 py-1 px-2 rounded-md text-xs font-medium bg-green-500/10 text-green-500">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 py-1 px-2 rounded-md text-xs font-medium bg-yellow-500/10 text-yellow-500">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                                                    Disabled
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground truncate max-w-[200px]" title={combo.description}>
                                            {combo.description || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => handleToggleActive(combo)}
                                                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded"
                                                    title={combo.is_active ? "Disable" : "Enable"}
                                                >
                                                    {combo.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                                                </button>
                                                <button 
                                                    onClick={() => handleOpenEdit(combo)}
                                                    className="p-1.5 text-muted-foreground hover:text-blue-400 hover:bg-secondary rounded"
                                                    title="Edit"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(combo)}
                                                    className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-secondary rounded"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <h2 className="font-semibold text-lg">{editingCombo ? 'Edit Combo' : 'Add Combo'}</h2>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Name</label>
                                <input 
                                    type="text" 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. YT_Research" 
                                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Category</label>
                                    <select
                                        value={category}
                                        onChange={(e) => {
                                            const newCat = e.target.value;
                                            setCategory(newCat);
                                            if (newCat === 'metadata') setEndpointType('chat');
                                            else setEndpointType('image');
                                        }}
                                        className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                    >
                                        <option value="metadata">Metadata</option>
                                        <option value="thumbnail">Thumbnail</option>
                                        <option value="footage">Footage</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Endpoint Type</label>
                                    <select
                                        value={endpointType}
                                        onChange={(e) => setEndpointType(e.target.value)}
                                        className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                                        disabled={true} // Auto-determined by category
                                    >
                                        <option value="chat">Chat</option>
                                        <option value="image">Image</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Description</label>
                                <textarea 
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Brief description..." 
                                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm h-20 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center justify-between">
                                    Config JSON
                                    <span className="text-[10px] text-muted-foreground uppercase bg-secondary px-1.5 py-0.5 rounded">Optional</span>
                                </label>
                                <textarea 
                                    value={configJson}
                                    onChange={(e) => setConfigJson(e.target.value)}
                                    placeholder='{"variants": 5}' 
                                    className="w-full font-mono text-xs bg-secondary border border-border rounded-md px-3 py-2 h-24 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-border flex justify-end gap-2 bg-secondary/20">
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={createMutation.isPending || updateMutation.isPending || !name}
                                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md disabled:opacity-50"
                            >
                                {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : "Save Combo"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
