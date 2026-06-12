import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Loader2, Send, Cpu, Sliders } from 'lucide-react';
import { getGenerationCombos, generatePromptDraft } from '../../services/api';
import { toast } from 'sonner';

interface Props {
    workspaceId: string;
    onDraftGenerated: () => void;
}

export default function PromptExpertAssistantTab({ workspaceId, onDraftGenerated }: Props) {
    const queryClient = useQueryClient();
    const [expertType, setExpertType] = useState<'metadata' | 'thumbnail' | 'footage'>('metadata');
    const [inputText, setInputText] = useState('');
    const [selectedComboId, setSelectedComboId] = useState('');

    // Fetch combos (use metadata combos which are chat-based)
    const { data: combos = [], isLoading: isCombosLoading } = useQuery({
        queryKey: ['combos', 'metadata'],
        queryFn: () => getGenerationCombos('metadata')
    });

    useEffect(() => {
        if (combos.length > 0 && !selectedComboId) {
            setSelectedComboId(combos[0].id);
        }
    }, [combos, selectedComboId]);

    const generateMutation = useMutation({
        mutationFn: () => generatePromptDraft({
            workspace_id: workspaceId,
            expert_type: expertType,
            combo_id: selectedComboId,
            input_text: inputText
        }),
        onSuccess: () => {
            toast.success("Draft generated successfully! Go to 'Generated Drafts' tab to review it.");
            setInputText('');
            queryClient.invalidateQueries({ queryKey: ['prompt-drafts', workspaceId] });
            onDraftGenerated();
        },
        onError: (err: any) => {
            toast.error(`Draft generation failed: ${err.response?.data?.detail || err.message}`);
        }
    });

    const handleGenerate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim()) {
            toast.error("Please enter some keywords or a topic.");
            return;
        }
        if (!selectedComboId) {
            toast.error("Please select an LLM Combo.");
            return;
        }
        generateMutation.mutate();
    };

    const expertDescriptions = {
        metadata: "Membangun Prompt Context berkualitas tinggi khusus untuk Metadata Generator. Fokus pada topik, target penonton, dan tone semantik tanpa memproduksi Title, Description, atau Tags langsung.",
        thumbnail: "Membangun Prompt Context khusus untuk Thumbnail Generator. Fokus pada CTR opportunities, komposisi visual, pemicu emosi, dan positioning entitas visual tanpa memproduksi prompt generator gambar langsung.",
        footage: "Membangun Prompt Context khusus untuk Footage Generator. Fokus pada klasifikasi jenis B-roll, tema visual, dan ekspansi adegan pendukung tanpa memproduksi query pencarian langsung."
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Input Section */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-card border border-border rounded-2xl p-6 shadow-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                        <Sparkles className="w-36 h-36 text-primary" />
                    </div>

                    <h2 className="text-lg font-bold text-foreground flex items-center mb-1">
                        <Cpu className="w-5 h-5 text-primary mr-2" /> AI Context Builder
                    </h2>
                    <p className="text-xs text-muted-foreground mb-6">
                        Buat draf konteks prompt terstruktur dengan memanfaatkan system rules bawaan yang aman dan terkunci.
                    </p>

                    {/* Expert Selector */}
                    <div className="flex bg-muted/30 border border-border/80 p-1.5 rounded-xl gap-1.5 mb-6">
                        {(['metadata', 'thumbnail', 'footage'] as const).map(type => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setExpertType(type)}
                                className={`flex-1 text-xs font-bold py-2.5 rounded-lg transition-all capitalize ${expertType === type ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                {type} Expert
                            </button>
                        ))}
                    </div>

                    {/* Form */}
                    <form onSubmit={handleGenerate} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-foreground">
                                Pilih LLM Combo
                            </label>
                            <select
                                value={selectedComboId}
                                onChange={(e) => setSelectedComboId(e.target.value)}
                                className="w-full text-xs bg-background border border-border rounded-xl px-3 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                                disabled={isCombosLoading || generateMutation.isPending}
                            >
                                {isCombosLoading ? (
                                    <option>Loading combos...</option>
                                ) : (
                                    combos.map(combo => (
                                        <option key={combo.id} value={combo.id}>{combo.name} ({combo.category})</option>
                                    ))
                                )}
                                {!isCombosLoading && combos.length === 0 && (
                                    <option value="">No metadata/chat combos configured</option>
                                )}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-foreground">
                                Masukkan Topik / Kata Kunci Sederhana
                            </label>
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="Contoh: elon musk ai robot, japan travel vlog spring, woodworking simple chair tutorial..."
                                rows={4}
                                disabled={generateMutation.isPending}
                                className="w-full text-xs bg-background border border-border rounded-xl px-3 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed disabled:opacity-50"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={generateMutation.isPending || !inputText.trim() || !selectedComboId}
                            className="w-full flex items-center justify-center space-x-2 bg-primary text-primary-foreground hover:bg-primary/95 font-bold text-xs py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {generateMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Generating Draft Context...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    <span>Generate Draft Context</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>

            {/* Rules Info Sidebar */}
            <div className="space-y-6">
                <div className="bg-card border border-border rounded-2xl p-6 shadow-md">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center mb-3">
                        <Sliders className="w-4 h-4 text-indigo-500 mr-2" /> Locked System Rules
                    </h3>
                    <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4 text-xs space-y-3">
                        <p className="font-semibold text-indigo-400 capitalize">
                            {expertType} Expert Rules:
                        </p>
                        <p className="text-muted-foreground leading-relaxed">
                            {expertDescriptions[expertType]}
                        </p>
                        <div className="pt-2 border-t border-indigo-500/10 text-[11px] text-muted-foreground/80 space-y-1.5">
                            <p className="font-medium text-foreground">✓ Hanya Menghasilkan:</p>
                            <ul className="list-disc pl-4 space-y-0.5">
                                <li>Topic (Konsep dasar)</li>
                                <li>Keywords (Konsep & visual penting)</li>
                                <li>Notes (Style & CTR guidelines)</li>
                            </ul>
                            <p className="font-medium text-red-400/80 mt-2">✗ Dilarang Menghasilkan:</p>
                            <ul className="list-disc pl-4 space-y-0.5">
                                <li>Title / Description jadi</li>
                                <li>Prompt generator gambar langsung</li>
                                <li>Query pencarian video/footage</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
