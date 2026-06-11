import { useState, useEffect } from 'react';
import { Image as ImageIcon, FileText, Loader2, PlayCircle, Settings2, Sliders } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGenerationCombos, getGlobalPromptContexts, generateGlobalAsset } from '../../services/api';
import { toast } from 'sonner';

interface ProductionFormProps {
    assetType: 'Metadata' | 'Thumbnail' | 'Footage';
    disabled?: boolean;
}

export default function ProductionForm({ assetType, disabled = false }: ProductionFormProps) {
    const queryClient = useQueryClient();
    const [selectedComboId, setSelectedComboId] = useState<string>('');
    const [selectedPromptIds, setSelectedPromptIds] = useState<string[]>([]);
    const [outputCount, setOutputCount] = useState<number>(1);

    // Fetch combos and prompt contexts specific to this asset type
    const { data: combos = [] } = useQuery({
        queryKey: ['combos', assetType.toLowerCase()],
        queryFn: () => getGenerationCombos(assetType.toLowerCase()),
    });

    const { data: prompts = [] } = useQuery({
        queryKey: ['prompts', assetType.toLowerCase()],
        queryFn: () => getGlobalPromptContexts(assetType.toLowerCase(), false),
    });

    // Auto-select first combo if none selected
    useEffect(() => {
        if (!selectedComboId && combos.length > 0) {
            setSelectedComboId(combos[0].id);
        }
    }, [combos, selectedComboId]);

    // Mutation for package-less global asset generation
    const generateMutation = useMutation({
        mutationFn: async () => {
            return generateGlobalAsset({
                asset_type: assetType,
                combo_id: selectedComboId,
                prompt_ids: selectedPromptIds,
                output_count: outputCount
            });
        },
        onSuccess: () => {
            let destination = 'Asset Library';
            if (assetType === 'Metadata') {
                destination = 'Metadata Library';
            } else if (assetType === 'Thumbnail') {
                destination = 'Thumbnail Library';
            } else if (assetType === 'Footage') {
                destination = 'Production Output';
            }
            toast.success(`${assetType} Generated → Saved to ${destination}`);
            
            // Reset state
            setSelectedPromptIds([]);
            setOutputCount(1);
            
            // Invalidate queries to refresh traces/activity panels
            queryClient.invalidateQueries({ queryKey: ['global-execution-traces'] });
            queryClient.invalidateQueries({ queryKey: ['execution-tasks'] });
        },
        onError: (err: any) => {
            toast.error(`Failed to generate ${assetType}: ${err.response?.data?.detail || err.message}`);
        }
    });

    const handleAddPrompt = (id: string) => {
        if (id && !selectedPromptIds.includes(id)) {
            setSelectedPromptIds([...selectedPromptIds, id]);
        }
    };

    const handleRemovePrompt = (id: string) => {
        setSelectedPromptIds(selectedPromptIds.filter(pid => pid !== id));
    };

    const handleGenerate = () => {
        if (!selectedComboId) {
            toast.error("Please select a Combo.");
            return;
        }
        if (selectedPromptIds.length === 0) {
            toast.error("Please select at least one Prompt Context.");
            return;
        }
        generateMutation.mutate();
    };

    const Icon = assetType === 'Metadata' ? FileText : ImageIcon;

    return (
        <div className={`bg-card border border-border shadow-md rounded-lg flex flex-col overflow-hidden h-[500px] transition-all duration-200 hover:shadow-lg ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="bg-muted/30 border-b border-border p-4 flex items-center">
                <div className="bg-primary/10 p-2 rounded-md mr-3 text-primary">
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">{assetType} Workbox</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Produce {assetType.toLowerCase()} assets</p>
                </div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-6">
                {/* Production Setup */}
                <div className="space-y-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center">
                        <Settings2 className="w-3.5 h-3.5 mr-1.5" /> Production Setup
                    </h3>
                    
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">{assetType} Combo</label>
                        <select 
                            value={selectedComboId} 
                            onChange={(e) => setSelectedComboId(e.target.value)}
                            className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                            disabled={disabled}
                        >
                            <option value="" disabled>Select combo...</option>
                            {combos.map(combo => (
                                <option key={combo.id} value={combo.id}>{combo.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">{assetType} Prompts</label>
                        <select 
                            value="" 
                            onChange={(e) => handleAddPrompt(e.target.value)}
                            className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                            disabled={disabled || prompts.length === 0}
                        >
                            <option value="">{prompts.length === 0 ? 'No prompts available' : 'Add prompt context...'}</option>
                            {prompts.filter(p => !selectedPromptIds.includes(p.id)).map(prompt => (
                                <option key={prompt.id} value={prompt.id}>{prompt.title}</option>
                            ))}
                        </select>

                        {/* Tag-Based Prompt List (YouTube Studio style interaction) */}
                        {selectedPromptIds.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2.5 p-2.5 bg-secondary/35 rounded-md border border-border/50 max-h-[120px] overflow-y-auto">
                                {selectedPromptIds.map(id => {
                                    const prompt = prompts.find(p => p.id === id);
                                    if (!prompt) return null;
                                    return (
                                        <div key={id} className="flex items-center gap-1.5 bg-background border border-border text-foreground px-2 py-0.5 rounded text-xs shadow-sm">
                                            <span>{prompt.title}</span>
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemovePrompt(id)}
                                                className="text-muted-foreground hover:text-red-500 font-bold ml-1 transition-colors text-[14px]"
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-medium text-foreground flex items-center">
                                <Sliders className="w-3.5 h-3.5 mr-1.5" /> Output Count
                            </label>
                            <span className="text-xs text-muted-foreground font-mono">{outputCount} output(s)</span>
                        </div>
                        <input 
                            type="number" 
                            min="1"
                            max="10"
                            value={outputCount} 
                            onChange={(e) => setOutputCount(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <p className="text-[10px] text-muted-foreground">Specify the exact quantity of final outputs to produce.</p>
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-border bg-muted/10">
                <button
                    onClick={handleGenerate}
                    disabled={disabled || generateMutation.isPending || selectedPromptIds.length === 0}
                    className="w-full flex items-center justify-center space-x-2 bg-primary text-primary-foreground hover:bg-primary/90 py-2.5 rounded-md font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {generateMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <PlayCircle className="w-4 h-4" />
                    )}
                    <span>Generate {assetType}</span>
                </button>
            </div>
        </div>
    );
}
