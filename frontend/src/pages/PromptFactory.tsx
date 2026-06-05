import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getChannels, generatePrompt, generateThumbnail } from '../services/api';
import { Sparkles, Copy, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PromptFactory() {
    const { data: channels = [] } = useQuery({ queryKey: ['channels'], queryFn: getChannels });
    
    const [channelId, setChannelId] = useState('');
    const [theme, setTheme] = useState('');
    const [mood, setMood] = useState('');
    const [generatedPrompt, setGeneratedPrompt] = useState('');
    const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null);

    const promptMutation = useMutation({
        mutationFn: () => generatePrompt({ channel_id: channelId, theme, mood }),
        onSuccess: (data) => {
            setGeneratedPrompt(data.prompt);
            toast.success("Prompt generated successfully!");
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.detail || "Failed to generate prompt");
        }
    });

    const thumbnailMutation = useMutation({
        mutationFn: () => generateThumbnail({ channel_id: channelId, prompt: generatedPrompt }),
        onSuccess: (data) => {
            const staticUrl = `http://localhost:8000/data/channels/${channels.find(c => c.id === channelId)?.slug || 'shared'}/assets/thumbnails/${data.filename}`;
            setGeneratedThumbnail(staticUrl);
            toast.success("Thumbnail generated successfully!");
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.detail || "Failed to generate thumbnail");
        }
    });

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedPrompt);
        toast.success("Prompt copied to clipboard!");
    };

    return (
        <div className="max-w-4xl space-y-8">
            <div>
                <h1 className="text-2xl font-bold mb-2">Prompt Factory</h1>
                <p className="text-muted-foreground">Generate AI metadata and thumbnails instantly via 9Router.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-card border border-border p-6 rounded-lg shadow-sm space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2 border-b border-border pb-2">
                        <Sparkles className="w-5 h-5 text-primary" /> Configuration
                    </h3>
                    
                    <div className="space-y-3">
                        <div>
                            <label className="text-sm text-muted-foreground mb-1 block">Channel Target</label>
                            <select 
                                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm"
                                value={channelId}
                                onChange={(e) => setChannelId(e.target.value)}
                            >
                                <option value="">Select a Channel...</option>
                                {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-muted-foreground mb-1 block">Theme / Subject</label>
                            <input 
                                type="text"
                                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm"
                                placeholder="e.g. 10 Scary Ghost Encounters"
                                value={theme}
                                onChange={(e) => setTheme(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-sm text-muted-foreground mb-1 block">Mood / Tone</label>
                            <input 
                                type="text"
                                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm"
                                placeholder="e.g. Creepy, mysterious, suspenseful"
                                value={mood}
                                onChange={(e) => setMood(e.target.value)}
                            />
                        </div>
                    </div>

                    <button 
                        onClick={() => promptMutation.mutate()}
                        disabled={!channelId || !theme || !mood || promptMutation.isPending}
                        className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                    >
                        {promptMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        Generate Prompt
                    </button>
                </div>

                <div className="bg-card border border-border p-6 rounded-lg shadow-sm space-y-4">
                    <h3 className="font-semibold text-lg flex items-center justify-between border-b border-border pb-2">
                        Output Result
                        {generatedPrompt && (
                            <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground">
                                <Copy className="w-4 h-4" />
                            </button>
                        )}
                    </h3>

                    {!generatedPrompt ? (
                        <div className="h-48 flex items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-lg bg-secondary/20">
                            Awaiting configuration...
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <textarea 
                                className="w-full h-32 bg-secondary border border-border rounded-md p-3 text-sm resize-none focus:outline-none"
                                value={generatedPrompt}
                                readOnly
                            />
                            
                            <button 
                                onClick={() => thumbnailMutation.mutate()}
                                disabled={thumbnailMutation.isPending}
                                className="w-full bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 py-2 rounded-md font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                            >
                                {thumbnailMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                                Generate Thumbnail from Prompt
                            </button>
                        </div>
                    )}

                    {generatedThumbnail && (
                        <div className="mt-4 border border-border rounded-lg overflow-hidden bg-secondary">
                            <img src={generatedThumbnail} alt="Generated Thumbnail" className="w-full object-cover" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
