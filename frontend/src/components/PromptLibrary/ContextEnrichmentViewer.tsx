import { useState } from 'react';
import { X, Sparkles, BookOpen, Users, Compass, Anchor, Layout, Eye, Check, Copy, Flame, ShieldAlert, Award } from 'lucide-react';
import type { EnrichedContextPayload } from '../../types';

interface Props {
    payload: EnrichedContextPayload;
    onClose: () => void;
    onLoadIntoBuilder: (markdown: string) => void;
}

type TabType = 'recs' | 'audience' | 'competitors' | 'angles' | 'outlines' | 'raw';

export default function ContextEnrichmentViewer({ payload, onClose, onLoadIntoBuilder }: Props) {
    const [activeTab, setActiveTab] = useState<TabType>('recs');
    const [copied, setCopied] = useState(false);

    const handleCopyMarkdown = () => {
        navigator.clipboard.writeText(payload.markdown_content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleLoad = () => {
        onLoadIntoBuilder(payload.markdown_content);
    };

    const tabStyles = (tab: TabType) => 
        `flex items-center space-x-1.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === tab 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
        }`;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden relative">
                {/* Header */}
                <div className="border-b border-border/80 px-6 py-4 flex items-center justify-between bg-muted/20">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-500">
                            <Sparkles className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-sm font-extrabold text-foreground leading-none">
                                AI Context Enrichment Results
                            </h2>
                            <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                                Topic: <span className="text-foreground font-semibold">{payload.topic_name}</span> &bull; Model: <span className="font-mono text-indigo-400 capitalize">{payload.generated_by}</span>
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary/50 transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tab Selector */}
                <div className="flex bg-muted/40 border-b border-border/60 px-6 py-2 overflow-x-auto scrollbar-none gap-2">
                    <button onClick={() => setActiveTab('recs')} className={tabStyles('recs')}>
                        <Award className="w-4 h-4" />
                        <span>Recommendations</span>
                    </button>
                    <button onClick={() => setActiveTab('audience')} className={tabStyles('audience')}>
                        <Users className="w-4 h-4" />
                        <span>Audience</span>
                    </button>
                    <button onClick={() => setActiveTab('competitors')} className={tabStyles('competitors')}>
                        <Compass className="w-4 h-4" />
                        <span>Competitors</span>
                    </button>
                    <button onClick={() => setActiveTab('angles')} className={tabStyles('angles')}>
                        <Anchor className="w-4 h-4" />
                        <span>Angles & Hooks</span>
                    </button>
                    <button onClick={() => setActiveTab('outlines')} className={tabStyles('outlines')}>
                        <Layout className="w-4 h-4" />
                        <span>Outline</span>
                    </button>
                    <button onClick={() => setActiveTab('raw')} className={tabStyles('raw')}>
                        <Eye className="w-4 h-4" />
                        <span>Markdown Raw</span>
                    </button>
                </div>

                {/* Content Panel */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
                    {activeTab === 'recs' && (
                        <div className="space-y-6">
                            {/* Recommendations Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-indigo-600/5 border border-indigo-500/10 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                        <Award className="w-24 h-24 text-indigo-500" />
                                    </div>
                                    <h3 className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider">Target Recommendations</h3>
                                    <div className="space-y-2.5 text-xs text-foreground">
                                        <div>
                                            <span className="text-muted-foreground block text-[10px]">Best Angle:</span>
                                            <span className="font-semibold">{payload.recommendations?.best_angle || 'No angle recommended'}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-[10px]">Best Hook:</span>
                                            <span className="font-semibold italic">"{payload.recommendations?.best_hook || 'No hook recommended'}"</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 pt-1">
                                            <div>
                                                <span className="text-muted-foreground block text-[10px]">Video Length:</span>
                                                <span className="font-semibold">{payload.recommendations?.recommended_video_length || '10-15m'}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground block text-[10px]">Target Audience:</span>
                                                <span className="font-semibold">{payload.recommendations?.recommended_audience || 'General'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-card border border-border/80 rounded-2xl p-5 flex flex-col justify-between">
                                    <div className="space-y-2">
                                        <h3 className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider">Confidence Score</h3>
                                        <div className="flex items-center gap-3">
                                            <span className="text-4xl font-black text-indigo-500">
                                                {payload.recommendations?.confidence_score || 85}
                                            </span>
                                            <div className="w-full bg-secondary rounded-full h-3.5 overflow-hidden border border-border/40">
                                                <div 
                                                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${payload.recommendations?.confidence_score || 85}%` }}
                                                />
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground leading-relaxed pt-1.5">
                                            Skor keyakinan analisis berdasarkan metrik kejenuhan kompetitor, perolehan tren mingguan, dan kelengkapan keyword target.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Research Notes */}
                            <div className="bg-secondary/15 border border-border/50 rounded-2xl p-5 space-y-4">
                                <div className="flex items-center gap-2 text-foreground font-bold text-xs border-b border-border/50 pb-2">
                                    <BookOpen className="w-4 h-4 text-indigo-500" />
                                    <span>Research Notes & Provenance</span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed font-normal">
                                    {payload.research_context?.research_notes}
                                </p>
                                <div className="text-[10px] text-muted-foreground/80 flex flex-wrap gap-2 pt-2 border-t border-border/20 items-center">
                                    <span className="font-semibold text-foreground uppercase tracking-wider mr-1">Research Sources:</span>
                                    {payload.research_context?.research_sources?.map((s, idx) => (
                                        <span key={idx} className="bg-secondary px-2 py-0.5 rounded border border-border/40 font-semibold">{s}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'audience' && (
                        <div className="space-y-5">
                            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                                <span className="text-xs text-muted-foreground font-bold uppercase">Target Audience Level:</span>
                                <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded font-extrabold text-xs">
                                    {payload.audience_context?.audience_level}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                                        <ShieldAlert className="w-4 h-4" /> Pain Points
                                    </h4>
                                    <ul className="space-y-2 text-xs text-muted-foreground">
                                        {payload.audience_context?.pain_points?.map((pp, idx) => (
                                            <li key={idx} className="bg-secondary/10 border border-border/30 rounded-xl p-3 leading-relaxed">
                                                {pp}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-green-400 flex items-center gap-1.5">
                                        <Award className="w-4 h-4" /> Goals
                                    </h4>
                                    <ul className="space-y-2 text-xs text-muted-foreground">
                                        {payload.audience_context?.goals?.map((g, idx) => (
                                            <li key={idx} className="bg-secondary/10 border border-border/30 rounded-xl p-3 leading-relaxed">
                                                {g}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                                        <Sparkles className="w-4 h-4" /> Common Questions
                                    </h4>
                                    <ul className="space-y-2 text-xs text-muted-foreground">
                                        {payload.audience_context?.common_questions?.map((q, idx) => (
                                            <li key={idx} className="bg-secondary/10 border border-border/30 rounded-xl p-3 leading-relaxed italic">
                                                "{q}"
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'competitors' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-orange-400 flex items-center gap-1.5">
                                    <Flame className="w-4 h-4" /> Oversaturated Topics
                                </h4>
                                <ul className="space-y-2 text-xs text-muted-foreground">
                                    {payload.competitor_context?.oversaturated_topics?.map((ot, idx) => (
                                        <li key={idx} className="bg-secondary/10 border border-border/30 rounded-xl p-3 leading-relaxed">
                                            {ot}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                                    <Compass className="w-4 h-4" /> Undercovered Topics
                                </h4>
                                <ul className="space-y-2 text-xs text-muted-foreground">
                                    {payload.competitor_context?.undercovered_topics?.map((ut, idx) => (
                                        <li key={idx} className="bg-secondary/10 border border-border/30 rounded-xl p-3 leading-relaxed">
                                            {ut}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-green-400 flex items-center gap-1.5">
                                    <Award className="w-4 h-4" /> Content Gaps
                                </h4>
                                <ul className="space-y-2 text-xs text-muted-foreground">
                                    {payload.competitor_context?.content_gaps?.map((cg, idx) => (
                                        <li key={idx} className="bg-secondary/10 border border-border/30 rounded-xl p-3 leading-relaxed font-medium">
                                            {cg}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {activeTab === 'angles' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3 bg-secondary/10 border border-border/40 rounded-2xl p-5">
                                <h4 className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider flex items-center gap-2 mb-2 border-b border-border/30 pb-2">
                                    <Anchor className="w-4 h-4" /> Angles Candidates
                                </h4>
                                <ul className="space-y-2.5 text-xs text-foreground">
                                    {payload.angle_candidates?.map((angle, idx) => (
                                        <li key={idx} className="flex gap-2 items-start font-semibold">
                                            <span className="text-indigo-500 font-bold font-mono">[{idx + 1}]</span>
                                            <span>{angle}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="space-y-3 bg-secondary/10 border border-border/40 rounded-2xl p-5">
                                <h4 className="text-xs font-extrabold text-green-400 uppercase tracking-wider flex items-center gap-2 mb-2 border-b border-border/30 pb-2">
                                    <Flame className="w-4 h-4" /> Hooks Candidates
                                </h4>
                                <ul className="space-y-2.5 text-xs text-foreground">
                                    {payload.hook_candidates?.map((hook, idx) => (
                                        <li key={idx} className="flex gap-2 items-start italic">
                                            <span className="text-green-500 font-bold font-mono">[{idx + 1}]</span>
                                            <span>{hook}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {activeTab === 'outlines' && (
                        <div className="space-y-4">
                            {payload.outline_candidates?.map((outline, idx) => (
                                <div key={idx} className="bg-secondary/10 hover:bg-secondary/20 border border-border/30 hover:border-border/60 transition-all rounded-xl p-4 flex gap-4 text-xs">
                                    <div className="min-w-[100px] border-r border-border/30 pr-3 flex flex-col justify-center">
                                        <span className="font-extrabold text-foreground">{outline.segment}</span>
                                        <span className="text-[10px] text-indigo-400 font-mono font-bold mt-1 bg-indigo-500/10 px-1.5 py-0.5 rounded w-max">{outline.duration}</span>
                                    </div>
                                    <p className="text-muted-foreground leading-relaxed flex-1 flex items-center">
                                        {outline.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'raw' && (
                        <div className="relative">
                            <pre className="bg-muted text-foreground border border-border rounded-xl p-4 text-[11px] font-mono whitespace-pre-wrap max-h-[450px] overflow-y-auto leading-relaxed scrollbar-thin">
                                {payload.markdown_content}
                            </pre>
                            <button
                                onClick={handleCopyMarkdown}
                                className="absolute top-3 right-3 bg-card/85 hover:bg-card border border-border/80 text-foreground text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow transition-all"
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-3.5 h-3.5 text-green-500" />
                                        <span>Copied!</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Copy Markdown</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="border-t border-border/80 px-6 py-4 flex items-center justify-between bg-muted/20">
                    <button
                        onClick={onClose}
                        className="border border-border hover:bg-secondary/50 font-bold text-xs px-4 py-2.5 rounded-xl text-foreground transition-all"
                    >
                        Close
                    </button>
                    
                    <button
                        onClick={handleLoad}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/15 hover:shadow-indigo-600/25 flex items-center gap-1.5 transition-all"
                    >
                        <Sparkles className="w-4 h-4" /> Load Enriched Context
                    </button>
                </div>
            </div>
        </div>
    );
}
