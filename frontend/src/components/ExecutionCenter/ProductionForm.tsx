import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Image as ImageIcon, FileText, Loader2, PlayCircle, Settings2, Sliders } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getGenerationCombos,
    getGlobalPromptContexts,
    generateGlobalAsset,
    getExternalAccounts,
    getProviders,
    createConnectorJob,
    generateSingleModelAsset,
    getGenerationModels
} from '../../services/api';
import { toast } from 'sonner';

interface ProductionFormProps {
    assetType: 'Metadata' | 'Thumbnail' | 'Footage';
    disabled?: boolean;
}

export default function ProductionForm({ assetType, disabled = false }: ProductionFormProps) {
    const { slug } = useParams();
    const queryClient = useQueryClient();
    
    // Mode selection: combo (Standard 9Router), single (API direct call), external (Browser Connector)
    const [genMode, setGenMode] = useState<'combo' | 'single' | 'external'>('combo');

    // --- Path 1: Combo Mode States ---
    const [selectedComboId, setSelectedComboId] = useState<string>('');
    const [selectedPromptIds, setSelectedPromptIds] = useState<string[]>([]);
    const [outputCount, setOutputCount] = useState<number>(1);

    // --- Path 2: Single Model Mode States ---
    const [selectedModel, setSelectedModel] = useState<string>('');
    const [customPrompt, setCustomPrompt] = useState<string>('');
    const [selectedFormat, setSelectedFormat] = useState<string>('JSON (Base64)');

    // --- Path 3: External Connector Mode States ---
    const [selectedExternalContextId, setSelectedExternalContextId] = useState<string>('');
    const [selectedExternalProvider, setSelectedExternalProvider] = useState<string>('Google Flow');
    const [selectedExternalAccount, setSelectedExternalAccount] = useState<string>('');

    // Fetch combos and prompt contexts specific to this asset type
    const { data: combos = [] } = useQuery({
        queryKey: ['combos', assetType.toLowerCase()],
        queryFn: () => getGenerationCombos(assetType.toLowerCase()),
    });

    const { data: prompts = [] } = useQuery({
        queryKey: ['prompts', assetType.toLowerCase()],
        queryFn: () => getGlobalPromptContexts(assetType.toLowerCase(), false),
    });

    // Fetch connector providers
    const { data: providersList = [] } = useQuery({
        queryKey: ['connector-providers'],
        queryFn: () => getProviders()
    });

    // Fetch external accounts
    const { data: externalAccounts = [] } = useQuery({
        queryKey: ['external-accounts', slug],
        queryFn: () => getExternalAccounts(slug),
        enabled: !!slug
    });

    // Fetch active generation models for Single Model Mode
    const { data: dbModels = [] } = useQuery({
        queryKey: ['generation-models'],
        queryFn: getGenerationModels,
        enabled: genMode === 'single'
    });

    // Auto-select first model if none selected
    useEffect(() => {
        if (dbModels.length > 0 && !selectedModel) {
            setSelectedModel(dbModels[0].name);
        }
    }, [dbModels, selectedModel]);

    // Auto-select first combo if none selected
    useEffect(() => {
        if (!selectedComboId && combos.length > 0) {
            setSelectedComboId(combos[0].id);
        }
    }, [combos, selectedComboId]);

    // Mutation: Standard 9Router Combo Generation
    const generateComboMutation = useMutation({
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
            setSelectedPromptIds([]);
            setOutputCount(1);
            queryClient.invalidateQueries({ queryKey: ['global-execution-traces'] });
            queryClient.invalidateQueries({ queryKey: ['execution-tasks'] });
        },
        onError: (err: any) => {
            toast.error(`Failed to generate ${assetType}: ${err.response?.data?.detail || err.message}`);
        }
    });

    // Mutation: Direct Single Model API Generation
    const generateSingleModelMutation = useMutation({
        mutationFn: async () => {
            return generateSingleModelAsset({
                workspace_id: slug || 'default',
                asset_type: assetType,
                model: selectedModel,
                prompt: customPrompt,
                size: '1280x720', // standard YouTube 16:9 aspect ratio
                output_format: selectedFormat,
                output_count: outputCount
            });
        },
        onSuccess: () => {
            toast.success(`Direct Single Model generated & saved to Shared Library`);
            setCustomPrompt('');
            queryClient.invalidateQueries({ queryKey: ['global-execution-traces'] });
            queryClient.invalidateQueries({ queryKey: ['assets'] });
        },
        onError: (err: any) => {
            toast.error(`Direct Single Model Generation failed: ${err.response?.data?.detail || err.message}`);
        }
    });

    // Mutation: Connector Job Trigger
    const triggerConnectorMutation = useMutation({
        mutationFn: async () => {
            const jobs = [];
            for (let i = 0; i < outputCount; i++) {
                const job = await createConnectorJob({
                    workspace_id: slug || 'default',
                    provider: selectedExternalProvider,
                    account_id: selectedExternalAccount || undefined,
                    asset_type: assetType.toLowerCase(),
                    prompt_id: selectedExternalContextId || undefined
                });
                jobs.push(job);
            }
            return jobs;
        },
        onSuccess: (jobs) => {
            const data = jobs[0];
            toast.success(`${jobs.length} External connector job(s) logged: ${data.provider}`);
            queryClient.invalidateQueries({ queryKey: ['connector-jobs', slug] });
        },
        onError: (err: any) => {
            toast.error(`Failed to register connector job(s): ${err.message}`);
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

    const handlePromptContextSelectForSingle = (id: string) => {
        const found = prompts.find(p => p.id === id);
        if (found) {
            setCustomPrompt(found.notes || found.description || found.title);
        }
    };

    const handleGenerate = () => {
        if (genMode === 'combo') {
            if (!selectedComboId) {
                toast.error("Please select a Combo.");
                return;
            }
            if (selectedPromptIds.length === 0) {
                toast.error("Please select at least one Prompt Context.");
                return;
            }
            generateComboMutation.mutate();
        } else if (genMode === 'single') {
            if (!customPrompt) {
                toast.error("Please specify a prompt context or write custom prompt.");
                return;
            }
            if (!selectedModel) {
                toast.error("Please select a model.");
                return;
            }
            generateSingleModelMutation.mutate();
        } else if (genMode === 'external') {
            if (!selectedExternalContextId) {
                toast.error("Please select a Prompt Context.");
                return;
            }
            triggerConnectorMutation.mutate();
        }
    };

    const isConnectorProvider = (providerName: string) => {
        const found = providersList.find(p => p.name === providerName);
        return found?.type === 'connector';
    };

    const Icon = assetType === 'Metadata' ? FileText : ImageIcon;

    // Direct Single Model List loaded dynamically from database

    const isProcessing = generateComboMutation.isPending || generateSingleModelMutation.isPending || triggerConnectorMutation.isPending;

    return (
        <div className={`bg-card border border-border shadow-md rounded-2xl flex flex-col overflow-hidden h-[540px] transition-all duration-200 hover:shadow-lg ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* Header */}
            <div className="bg-muted/30 border-b border-border p-4 flex items-center justify-between">
                <div className="flex items-center">
                    <div className="bg-primary/10 p-2.5 rounded-xl mr-3 text-primary">
                        <Icon className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">{assetType} Workbox</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Produce global {assetType.toLowerCase()}s</p>
                    </div>
                </div>
            </div>

            {/* Mode selection tabs (only show for non-text assetTypes like Thumbnail and Footage) */}
            {assetType !== 'Metadata' && (
                <div className="flex bg-muted/20 border-b border-border/50 p-1.5 gap-1 shrink-0">
                    <button
                        type="button"
                        onClick={() => setGenMode('combo')}
                        className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-all ${genMode === 'combo' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Combo
                    </button>
                    <button
                        type="button"
                        onClick={() => setGenMode('single')}
                        className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-all ${genMode === 'single' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Single Model
                    </button>
                    <button
                        type="button"
                        onClick={() => setGenMode('external')}
                        className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-all ${genMode === 'external' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        External Connector
                    </button>
                </div>
            )}

            <div className="p-4 flex-1 overflow-y-auto space-y-4">
                
                {/* --- 1. COMBO MODE UI --- */}
                {genMode === 'combo' && (
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center">
                            <Settings2 className="w-3.5 h-3.5 mr-1.5" /> Combo Setup (9Router)
                        </h3>
                        
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">{assetType} Combo</label>
                            <select 
                                value={selectedComboId} 
                                onChange={(e) => setSelectedComboId(e.target.value)}
                                className="w-full text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                disabled={disabled}
                            >
                                <option value="" disabled>Select combo...</option>
                                {combos.map(combo => (
                                    <option key={combo.id} value={combo.id}>{combo.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">{assetType} Prompt Contexts</label>
                            <select 
                                value="" 
                                onChange={(e) => handleAddPrompt(e.target.value)}
                                className="w-full text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                disabled={disabled || prompts.length === 0}
                            >
                                <option value="">{prompts.length === 0 ? 'No prompts available' : 'Add prompt context...'}</option>
                                {prompts.filter(p => !selectedPromptIds.includes(p.id)).map(prompt => (
                                    <option key={prompt.id} value={prompt.id}>{prompt.title}</option>
                                ))}
                            </select>

                            {selectedPromptIds.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2 p-2 bg-secondary/20 rounded-xl border border-border/40 max-h-[120px] overflow-y-auto">
                                    {selectedPromptIds.map(id => {
                                        const prompt = prompts.find(p => p.id === id);
                                        if (!prompt) return null;
                                        return (
                                            <div key={id} className="flex items-center gap-1.5 bg-background border border-border text-foreground px-2.5 py-0.5 rounded-lg text-[11px] shadow-sm font-medium">
                                                <span>{prompt.title}</span>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleRemovePrompt(id)}
                                                    className="text-muted-foreground hover:text-red-500 font-bold ml-1 transition-colors text-[13px]"
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
                                <label className="text-xs font-semibold text-foreground flex items-center">
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
                                className="w-full text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                    </div>
                )}

                {/* --- 2. SINGLE MODEL MODE UI --- */}
                {genMode === 'single' && (
                    <div className="space-y-3.5">
                        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center">
                            <Settings2 className="w-3.5 h-3.5 mr-1.5" /> Direct Single Model API
                        </h3>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-foreground">Model</label>
                                <select 
                                    value={selectedModel} 
                                    onChange={(e) => setSelectedModel(e.target.value)}
                                    className="w-full text-xs bg-background border border-border rounded-xl px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    {dbModels.map(model => (
                                        <option key={model.id} value={model.name}>{model.name}</option>
                                    ))}
                                    {dbModels.length === 0 && (
                                        <option value="">No models configured</option>
                                    )}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-foreground">Aspect Ratio Size</label>
                                <div className="w-full text-xs bg-muted/30 border border-border rounded-xl px-3 py-2 text-muted-foreground font-semibold">
                                    1280x720 (16:9 HD)
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-foreground">Load Prompt Context</label>
                                <select 
                                    value=""
                                    onChange={(e) => handlePromptContextSelectForSingle(e.target.value)}
                                    className="w-full text-xs bg-background border border-border rounded-xl px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option value="">Select context...</option>
                                    {prompts.map(p => (
                                        <option key={p.id} value={p.id}>{p.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-foreground">Output Format</label>
                                <select 
                                    value={selectedFormat} 
                                    onChange={(e) => setSelectedFormat(e.target.value)}
                                    className="w-full text-xs bg-background border border-border rounded-xl px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option value="JSON (Base64)">JSON (Base64)</option>
                                    <option value="URL">URL</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-foreground">Custom Generation Prompt</label>
                            <textarea
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                rows={2}
                                className="w-full text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                                placeholder="A cute cat wearing a hat..."
                            />
                        </div>
                    </div>
                )}

                {/* --- 3. EXTERNAL CONNECTOR MODE UI --- */}
                {genMode === 'external' && (
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center">
                            <Settings2 className="w-3.5 h-3.5 mr-1.5" /> External Browser Connector
                        </h3>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">Prompt Context</label>
                            <select 
                                value={selectedExternalContextId} 
                                onChange={(e) => setSelectedExternalContextId(e.target.value)}
                                className="w-full text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                <option value="">Select prompt context...</option>
                                {prompts.map(prompt => (
                                    <option key={prompt.id} value={prompt.id}>{prompt.title}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">External Provider</label>
                            <select 
                                value={selectedExternalProvider} 
                                onChange={(e) => {
                                    setSelectedExternalProvider(e.target.value);
                                    setSelectedExternalAccount('');
                                }}
                                className="w-full text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                {providersList.filter(p => p.type === 'connector').map(p => (
                                    <option key={p.name} value={p.name}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">Linked Account</label>
                            <select 
                                value={selectedExternalAccount} 
                                onChange={(e) => setSelectedExternalAccount(e.target.value)}
                                className="w-full text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-40"
                                disabled={!isConnectorProvider(selectedExternalProvider)}
                            >
                                <option value="">Global/Workspace Account</option>
                                {externalAccounts
                                    .filter(a => a.provider === selectedExternalProvider && a.is_active === 1)
                                    .map(a => (
                                        <option key={a.id} value={a.id}>{a.account_name}</option>
                                    ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-semibold text-foreground flex items-center">
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
                                className="w-full text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Run Button Footer */}
            <div className="p-4 border-t border-border bg-muted/10">
                {genMode === 'external' ? (
                    <button
                        onClick={handleGenerate}
                        disabled={disabled || isProcessing || !selectedExternalContextId}
                        className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 py-2.5 rounded-xl font-bold text-xs transition-all text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? (
                            <Loader2 className="w-4.5 h-4.5 animate-spin" />
                        ) : (
                            <PlayCircle className="w-4.5 h-4.5" />
                        )}
                        <span>Generate {assetType}</span>
                    </button>
                ) : (
                    <button
                        onClick={handleGenerate}
                        disabled={
                            disabled || 
                            isProcessing || 
                            (genMode === 'combo' && selectedPromptIds.length === 0) ||
                            (genMode === 'single' && !customPrompt)
                        }
                        className="w-full flex items-center justify-center space-x-2 bg-primary text-primary-foreground hover:bg-primary/95 py-2.5 rounded-xl font-bold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? (
                            <Loader2 className="w-4.5 h-4.5 animate-spin" />
                        ) : (
                            <PlayCircle className="w-4.5 h-4.5" />
                        )}
                        <span>Generate {assetType}</span>
                    </button>
                )}
            </div>
        </div>
    );
}
