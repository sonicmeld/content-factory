import { useState, useMemo, useEffect } from 'react';
import { Package, Image as ImageIcon, FileText, Loader2, PlayCircle, Settings2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWorkboxPackages, getGenerationCombos, getGlobalPromptContexts, updateChannel, generateMetadata, generateThumbnail } from '../../services/api';
import { toast } from 'sonner';
import type { WorkboxPackage } from '../../types';

interface ProductionFormProps {
    assetType: 'Metadata' | 'Thumbnail' | 'Footage';
    disabled?: boolean;
}

export default function ProductionForm({ assetType, disabled = false }: ProductionFormProps) {
    const queryClient = useQueryClient();
    const [selectedPackageId, setSelectedPackageId] = useState<string>('');
    const [selectedComboId, setSelectedComboId] = useState<string>('');
    const [selectedPromptId, setSelectedPromptId] = useState<string>('');

    // Fetch data
    const { data: packages = [] } = useQuery({
        queryKey: ['workbox'],
        queryFn: () => getWorkboxPackages(),
    });

    const { data: combos = [] } = useQuery({
        queryKey: ['combos', assetType.toLowerCase()],
        queryFn: () => getGenerationCombos(assetType.toLowerCase()),
    });

    const { data: prompts = [] } = useQuery({
        queryKey: ['prompts', assetType.toLowerCase()],
        queryFn: () => getGlobalPromptContexts(assetType.toLowerCase(), false),
    });

    // Filter packages that need this asset type
    const eligiblePackages = useMemo(() => {
        return packages.filter(pkg => pkg.production_gaps.includes(assetType));
    }, [packages, assetType]);

    // Derived states
    const selectedPackage = packages.find(p => p.package_id === selectedPackageId);
    
    // Auto-select first eligible package if none selected
    useEffect(() => {
        if (!selectedPackageId && eligiblePackages.length > 0) {
            setSelectedPackageId(eligiblePackages[0].package_id);
        }
    }, [eligiblePackages, selectedPackageId]);

    // Mutations
    const updateChannelMutation = useMutation({
        mutationFn: ({ channelId, updates }: { channelId: string, updates: any }) => updateChannel(channelId, updates),
    });

    const generateMutation = useMutation({
        mutationFn: async () => {
            if (!selectedPackage) throw new Error("No package selected");
            
            // 1. Update channel combo if selected
            if (selectedComboId) {
                const updates: any = {};
                if (assetType === 'Metadata') updates.metadata_combo = selectedComboId;
                if (assetType === 'Thumbnail') updates.thumbnail_combo = selectedComboId;
                if (assetType === 'Footage') updates.footage_combo = selectedComboId;
                
                await updateChannelMutation.mutateAsync({ channelId: selectedPackage.channel_id, updates });
            }

            // 2. Trigger generation
            if (assetType === 'Metadata') {
                return generateMetadata(selectedPackage.package_id, selectedPromptId || undefined);
            } else if (assetType === 'Thumbnail') {
                return generateThumbnail(selectedPackage.package_id, selectedPromptId || undefined);
            } else {
                throw new Error("Generation for this asset type is not supported yet.");
            }
        },
        onSuccess: () => {
            // Runtime Output Feed Rule: Asset Produced, not Package Updated
            toast.success(`${assetType} Generated → Saved to ${assetType === 'Metadata' ? 'Metadata Library' : 'Asset Library'}`);
            setSelectedPackageId('');
            queryClient.invalidateQueries({ queryKey: ['workbox'] });
            queryClient.invalidateQueries({ queryKey: ['global-execution-traces'] });
            queryClient.invalidateQueries({ queryKey: ['execution-tasks'] });
        },
        onError: (err: any) => {
            toast.error(`Failed to generate ${assetType}: ${err.response?.data?.detail || err.message}`);
        }
    });

    const handleGenerate = () => {
        if (!selectedPackageId) {
            toast.error("Please select a Target Package.");
            return;
        }
        generateMutation.mutate();
    };

    const Icon = assetType === 'Metadata' ? FileText : ImageIcon;

    return (
        <div className={`bg-card border border-border shadow-sm rounded-lg flex flex-col overflow-hidden h-[500px] ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="bg-muted/30 border-b border-border p-4 flex items-center">
                <div className="bg-primary/10 p-2 rounded-md mr-3 text-primary">
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">{assetType} Workbox</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Produce {assetType.toLowerCase()} assets</p>
                </div>
                {disabled && (
                    <span className="ml-auto text-[10px] font-bold px-2 py-1 bg-muted text-muted-foreground rounded uppercase tracking-wider">COMING SOON</span>
                )}
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-6">
                {/* Target Selection */}
                <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center">
                        <Package className="w-3.5 h-3.5 mr-1.5" /> Target Assignment
                    </h3>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">Target Package</label>
                        <select 
                            value={selectedPackageId} 
                            onChange={(e) => setSelectedPackageId(e.target.value)}
                            className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            disabled={disabled}
                        >
                            <option value="" disabled>Select a package with missing {assetType}...</option>
                            {eligiblePackages.map(pkg => (
                                <option key={pkg.package_id} value={pkg.package_id}>
                                    {pkg.channel_name} - {pkg.package_number}
                                </option>
                            ))}
                        </select>
                        <p className="text-[10px] text-muted-foreground">Packages with uninitialized {assetType} assets.</p>
                    </div>
                </div>

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
                            className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            disabled={disabled}
                        >
                            <option value="">Use Channel Default Combo...</option>
                            {combos.map(combo => (
                                <option key={combo.id} value={combo.id}>{combo.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">{assetType} Prompt</label>
                        <select 
                            value={selectedPromptId} 
                            onChange={(e) => setSelectedPromptId(e.target.value)}
                            className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            disabled={disabled}
                        >
                            <option value="">No context (Base Combo Only)...</option>
                            {prompts.map(prompt => (
                                <option key={prompt.id} value={prompt.id}>{prompt.title}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">Output Count</label>
                        <input 
                            type="number" 
                            value="1" 
                            disabled 
                            className="w-full text-sm bg-muted border border-border rounded-md px-3 py-2 text-muted-foreground cursor-not-allowed"
                        />
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-border bg-muted/10">
                <button
                    onClick={handleGenerate}
                    disabled={disabled || !selectedPackageId || generateMutation.isPending}
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
