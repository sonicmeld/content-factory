import { useState } from 'react';
import { X, Sparkles, BookOpen, Users, Compass, Anchor, Layout, Eye, Check, Copy, Flame, ShieldAlert, Award } from 'lucide-react';
import type { EnrichedContextPayload } from '../../types';

interface Props {
    payload: EnrichedContextPayload;
    onClose: () => void;
    onLoadIntoBuilder: (markdown: string) => void;
}

type TabType = 'research' | 'audience' | 'competitors' | 'keywords' | 'topics' | 'intent' | 'signals' | 'raw';

export default function ContextEnrichmentViewer({ payload, onClose, onLoadIntoBuilder }: Props) {
    const [activeTab, setActiveTab] = useState<TabType>('research');
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
                                AI Context Research Results
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
                    <button onClick={() => setActiveTab('research')} className={tabStyles('research')}>
                        <BookOpen className="w-4 h-4" />
                        <span>Research</span>
                    </button>
                    <button onClick={() => setActiveTab('audience')} className={tabStyles('audience')}>
                        <Users className="w-4 h-4" />
                        <span>Audience</span>
                    </button>
                    <button onClick={() => setActiveTab('competitors')} className={tabStyles('competitors')}>
                        <Compass className="w-4 h-4" />
                        <span>Competitors</span>
                    </button>
                    <button onClick={() => setActiveTab('keywords')} className={tabStyles('keywords')}>
                        <Anchor className="w-4 h-4" />
                        <span>Keywords</span>
                    </button>
                    <button onClick={() => setActiveTab('topics')} className={tabStyles('topics')}>
                        <Layout className="w-4 h-4" />
                        <span>Topics</span>
                    </button>
                    <button onClick={() => setActiveTab('intent')} className={tabStyles('intent')}>
                        <Flame className="w-4 h-4" />
                        <span>Search Intent</span>
                    </button>
                    <button onClick={() => setActiveTab('signals')} className={tabStyles('signals')}>
                        <Award className="w-4 h-4" />
                        <span>Market Signals</span>
                    </button>
                    <button onClick={() => setActiveTab('raw')} className={tabStyles('raw')}>
                        <Eye className="w-4 h-4" />
                        <span>Markdown Raw</span>
                    </button>
                </div>

                {/* Content Panel */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
                    {activeTab === 'research' && (
                        <div className="space-y-6">
                            {/* Research Notes */}
                            <div className="bg-secondary/15 border border-border/50 rounded-2xl p-5 space-y-4">
                                <div className="flex items-center gap-2 text-foreground font-bold text-xs border-b border-border/50 pb-2">
                                    <BookOpen className="w-4 h-4 text-indigo-500" />
                                    <span>Research Notes</span>
                                </div>
                                <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed font-normal">
                                    {payload.research_context?.research_notes?.map((note, idx) => (
                                        <li key={idx} className="bg-secondary/10 border border-border/30 rounded-xl p-3 leading-relaxed">
                                            {note}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Supporting Facts & Entities Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-secondary/15 border border-border/50 rounded-2xl p-5 space-y-4">
                                    <div className="flex items-center gap-2 text-foreground font-bold text-xs border-b border-border/50 pb-2">
                                        <Award className="w-4 h-4 text-green-500" />
                                        <span>Supporting Facts</span>
                                    </div>
                                    <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                                        {payload.research_context?.supporting_facts?.map((fact, idx) => (
                                            <li key={idx} className="list-disc list-inside bg-secondary/5 p-2 rounded-lg border border-border/20">
                                                {fact}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="bg-secondary/15 border border-border/50 rounded-2xl p-5 space-y-4">
                                    <div className="flex items-center gap-2 text-foreground font-bold text-xs border-b border-border/50 pb-2">
                                        <Compass className="w-4 h-4 text-indigo-500" />
                                        <span>Related Entities</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {payload.research_context?.related_entities?.map((entity, idx) => (
                                            <span key={idx} className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-lg font-semibold text-xs">
                                                {entity}
                                            </span>
                                        ))}
                                    </div>
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

                    {activeTab === 'keywords' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                                    <Award className="w-4 h-4" /> Primary Keywords
                                </h4>
                                <ul className="space-y-2 text-xs text-muted-foreground">
                                    {payload.keyword_expansion?.primary_keywords?.map((kw, idx) => (
                                        <li key={idx} className="bg-secondary/10 border border-border/30 rounded-xl p-3 leading-relaxed font-semibold">
                                            {kw}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                                    <Compass className="w-4 h-4" /> Secondary Keywords
                                </h4>
                                <ul className="space-y-2 text-xs text-muted-foreground">
                                    {payload.keyword_expansion?.secondary_keywords?.map((kw, idx) => (
                                        <li key={idx} className="bg-secondary/10 border border-border/30 rounded-xl p-3 leading-relaxed">
                                            {kw}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-green-400 flex items-center gap-1.5">
                                    <Sparkles className="w-4 h-4" /> Related Keywords
                                </h4>
                                <ul className="space-y-2 text-xs text-muted-foreground">
                                    {payload.keyword_expansion?.related_keywords?.map((kw, idx) => (
                                        <li key={idx} className="bg-secondary/10 border border-border/30 rounded-xl p-3 leading-relaxed">
                                            {kw}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {activeTab === 'topics' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                                    <Award className="w-4 h-4" /> Related Topics
                                </h4>
                                <ul className="space-y-2 text-xs text-muted-foreground">
                                    {payload.topic_expansion?.related_topics?.map((tp, idx) => (
                                        <li key={idx} className="bg-secondary/10 border border-border/30 rounded-xl p-3 leading-relaxed font-semibold">
                                            {tp}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                                    <Compass className="w-4 h-4" /> Adjacent Topics
                                </h4>
                                <ul className="space-y-2 text-xs text-muted-foreground">
                                    {payload.topic_expansion?.adjacent_topics?.map((tp, idx) => (
                                        <li key={idx} className="bg-secondary/10 border border-border/30 rounded-xl p-3 leading-relaxed">
                                            {tp}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-green-400 flex items-center gap-1.5">
                                    <Sparkles className="w-4 h-4" /> Semantic Clusters
                                </h4>
                                <ul className="space-y-2 text-xs text-muted-foreground">
                                    {payload.topic_expansion?.semantic_clusters?.map((tp, idx) => (
                                        <li key={idx} className="bg-secondary/10 border border-border/30 rounded-xl p-3 leading-relaxed">
                                            {tp}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {activeTab === 'intent' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-indigo-400 border-b border-border/55 pb-1">
                                    Informational
                                </h4>
                                <ul className="space-y-2 text-[11px] text-muted-foreground">
                                    {payload.search_intent_context?.informational?.map((q, idx) => (
                                        <li key={idx} className="bg-secondary/10 border border-border/30 rounded-xl p-2 leading-relaxed">
                                            {q}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-green-400 border-b border-border/55 pb-1">
                                    Comparative
                                </h4>
                                <ul className="space-y-2 text-[11px] text-muted-foreground">
                                    {payload.search_intent_context?.comparative?.map((q, idx) => (
                                        <li key={idx} className="bg-secondary/10 border border-border/30 rounded-xl p-2 leading-relaxed">
                                            {q}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-orange-400 border-b border-border/55 pb-1">
                                    Transactional
                                </h4>
                                <ul className="space-y-2 text-[11px] text-muted-foreground">
                                    {payload.search_intent_context?.transactional?.map((q, idx) => (
                                        <li key={idx} className="bg-secondary/10 border border-border/30 rounded-xl p-2 leading-relaxed">
                                            {q}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-muted-foreground border-b border-border/55 pb-1">
                                    Navigational
                                </h4>
                                <ul className="space-y-2 text-[11px] text-muted-foreground">
                                    {payload.search_intent_context?.navigational?.map((q, idx) => (
                                        <li key={idx} className="bg-secondary/10 border border-border/30 rounded-xl p-2 leading-relaxed">
                                            {q}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {activeTab === 'signals' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-2">
                                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Demand Score</span>
                                    <span className="text-3xl font-black text-indigo-500">{payload.market_signals?.demand_score}</span>
                                </div>
                                <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-2">
                                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Competition Score</span>
                                    <span className="text-3xl font-black text-orange-500">{payload.market_signals?.competition_score}</span>
                                </div>
                                <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-2">
                                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Forecast Score</span>
                                    <span className="text-3xl font-black text-green-500">{payload.market_signals?.forecast_score}</span>
                                </div>
                                <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-2">
                                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Opportunity Score</span>
                                    <span className="text-3xl font-black text-pink-500">{payload.market_signals?.opportunity_score}</span>
                                </div>
                            </div>

                            <div className="bg-indigo-600/5 border border-indigo-500/10 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                                <h3 className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider">Research Integrity Metric</h3>
                                <div className="flex items-center gap-3">
                                    <div className="w-full bg-secondary rounded-full h-3.5 overflow-hidden border border-border/40">
                                        <div 
                                            className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                                            style={{ width: `${payload.market_signals?.opportunity_score || 50}%` }}
                                        />
                                    </div>
                                </div>
                                <p className="text-[10px] text-muted-foreground leading-relaxed pt-1">
                                    This metric calculates the demand-to-competition ratio. A higher score represents lower competition and higher market demand growth.
                                </p>
                            </div>
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
