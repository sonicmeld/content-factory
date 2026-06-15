import { useState } from 'react';
import { X, Sparkles, BookOpen, Users, Compass, Anchor, Layout, Flame, ShieldAlert, Award } from 'lucide-react';
import type { EnrichedContextPayload } from '../../types';

interface Props {
    payload: EnrichedContextPayload;
    onClose: () => void;
    onLoadIntoBuilder: (payload: EnrichedContextPayload) => void;
}

type TabType = 'research' | 'audience' | 'competitors' | 'keywords' | 'topics' | 'intent' | 'signals';

export default function ContextEnrichmentViewer({ payload, onClose, onLoadIntoBuilder }: Props) {
    const [activeTab, setActiveTab] = useState<TabType>('research');

    const handleLoad = () => {
        onLoadIntoBuilder(payload);
    };

    const tabStyles = (tab: TabType) => 
        `flex items-center space-x-1.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === tab 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
        }`;

    const researchContext = payload.signals?.research_context || {};
    const audienceContext = payload.audience || {};
    const competitorContext = payload.competitors || {};
    const keywordExpansion = payload.keywords || {};
    const topicExpansion = payload.signals?.topic_expansion || {};
    const searchIntentContext = payload.signals?.search_intent_context || {};
    const marketSignals = (payload.signals?.market_signals || {}) as any;

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
                                Research Context Dataset
                            </h2>
                            <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                                Topic: <span className="text-foreground font-semibold">{payload.topic}</span>
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
                                    {researchContext.research_notes?.map((note: string, idx: number) => (
                                        <li key={idx} className="bg-secondary/10 border border-border/30 rounded-xl p-3 leading-relaxed">
                                            {note}
                                        </li>
                                    )) || (
                                        <li className="text-muted-foreground italic">No research notes compiled.</li>
                                    )}
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
                                        {researchContext.supporting_facts?.map((fact: string, idx: number) => (
                                            <li key={idx} className="list-disc list-inside bg-secondary/5 p-2 rounded-lg border border-border/20">
                                                {fact}
                                            </li>
                                        )) || (
                                            <li className="text-muted-foreground italic">No supporting facts compiled.</li>
                                        )}
                                    </ul>
                                </div>

                                <div className="bg-secondary/15 border border-border/50 rounded-2xl p-5 space-y-4">
                                    <div className="flex items-center gap-2 text-foreground font-bold text-xs border-b border-border/50 pb-2">
                                        <Compass className="w-4 h-4 text-indigo-500" />
                                        <span>Related Entities</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {researchContext.related_entities?.map((entity: string, idx: number) => (
                                            <span key={idx} className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-lg font-semibold text-xs">
                                                {entity}
                                            </span>
                                        )) || (
                                            <span className="text-muted-foreground italic text-xs">No related entities identified.</span>
                                        )}
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
                                    {audienceContext.audience_level || 'General'}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                                        <ShieldAlert className="w-4 h-4" /> Pain Points
                                    </h4>
                                    <ul className="space-y-2 text-xs text-muted-foreground">
                                        {audienceContext.pain_points?.map((pp: string, idx: number) => (
                                            <li key={idx} className="bg-secondary/10 border border-border/30 rounded-xl p-3 leading-relaxed">
                                                {pp}
                                            </li>
                                        )) || (
                                            <li className="text-muted-foreground italic">None identified.</li>
                                        )}
                                    </ul>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-green-400 flex items-center gap-1.5">
                                        <Award className="w-4 h-4" /> Goals
                                    </h4>
                                    <ul className="space-y-2 text-xs text-muted-foreground">
                                        {audienceContext.goals?.map((g: string, idx: number) => (
                                            <li key={idx} className="bg-secondary/10 border border-border/30 rounded-xl p-3 leading-relaxed">
                                                {g}
                                            </li>
                                        )) || (
                                            <li className="text-muted-foreground italic">None identified.</li>
                                        )}
                                    </ul>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                                        <Sparkles className="w-4 h-4" /> Common Questions
                                    </h4>
                                    <ul className="space-y-2 text-xs text-muted-foreground">
                                        {audienceContext.common_questions?.map((q: string, idx: number) => (
                                            <li key={idx} className="bg-secondary/10 border border-border/30 rounded-xl p-3 leading-relaxed italic">
                                                "{q}"
                                            </li>
                                        )) || (
                                            <li className="text-muted-foreground italic">None identified.</li>
                                        )}
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
                                    {competitorContext.oversaturated_topics?.map((ot: string, idx: number) => (
                                        <li key={idx} className="bg-secondary/10 border border-border/30 rounded-xl p-3 leading-relaxed">
                                            {ot}
                                        </li>
                                    )) || (
                                        <li className="text-muted-foreground italic">None identified.</li>
                                    )}
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                                    <Compass className="w-4 h-4" /> Undercovered Topics
                                </h4>
                                <ul className="space-y-2 text-xs text-muted-foreground">
                                    {competitorContext.undercovered_topics?.map((ut: string, idx: number) => (
                                        <li key={idx} className="bg-secondary/10 border border-border/30 rounded-xl p-3 leading-relaxed">
                                            {ut}
                                        </li>
                                    )) || (
                                        <li className="text-muted-foreground italic">None identified.</li>
                                    )}
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-green-400 flex items-center gap-1.5">
                                    <Award className="w-4 h-4" /> Content Gaps
                                </h4>
                                <ul className="space-y-2 text-xs text-muted-foreground">
                                    {competitorContext.content_gaps?.map((cg: string, idx: number) => (
                                        <li key={idx} className="bg-secondary/10 border border-border/30 rounded-xl p-3 leading-relaxed font-medium">
                                            {cg}
                                        </li>
                                    )) || (
                                        <li className="text-muted-foreground italic">None identified.</li>
                                    )}
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
                                    {keywordExpansion.primary_keywords?.map((kw: string, idx: number) => (
                                        <li key={idx} className="bg-secondary/10 border border-border/30 rounded-xl p-3 leading-relaxed font-semibold">
                                            {kw}
                                        </li>
                                    )) || (
                                        <li className="text-muted-foreground italic">None identified.</li>
                                    )}
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                                    <Compass className="w-4 h-4" /> Secondary Keywords
                                </h4>
                                <ul className="space-y-2 text-xs text-muted-foreground">
                                    {keywordExpansion.secondary_keywords?.map((kw: string, idx: number) => (
                                        <li key={idx} className="bg-secondary/10 border border-border/30 rounded-xl p-3 leading-relaxed">
                                            {kw}
                                        </li>
                                    )) || (
                                        <li className="text-muted-foreground italic">None identified.</li>
                                    )}
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-green-400 flex items-center gap-1.5">
                                    <Sparkles className="w-4 h-4" /> Related Keywords
                                </h4>
                                <ul className="space-y-2 text-xs text-muted-foreground">
                                    {keywordExpansion.related_keywords?.map((kw: string, idx: number) => (
                                        <li key={idx} className="bg-secondary/10 border border-border/30 rounded-xl p-3 leading-relaxed">
                                            {kw}
                                        </li>
                                    )) || (
                                        <li className="text-muted-foreground italic">None identified.</li>
                                    )}
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
                                    {topicExpansion.related_topics?.map((tp: string, idx: number) => (
                                        <li key={idx} className="bg-secondary/10 border border-border/30 rounded-xl p-3 leading-relaxed font-semibold">
                                            {tp}
                                        </li>
                                    )) || (
                                        <li className="text-muted-foreground italic">None identified.</li>
                                    )}
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                                    <Compass className="w-4 h-4" /> Adjacent Topics
                                </h4>
                                <ul className="space-y-2 text-xs text-muted-foreground">
                                    {topicExpansion.adjacent_topics?.map((tp: string, idx: number) => (
                                        <li key={idx} className="bg-secondary/10 border border-border/30 rounded-xl p-3 leading-relaxed">
                                            {tp}
                                        </li>
                                    )) || (
                                        <li className="text-muted-foreground italic">None identified.</li>
                                    )}
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-green-400 flex items-center gap-1.5">
                                    <Sparkles className="w-4 h-4" /> Semantic Clusters
                                </h4>
                                <ul className="space-y-2 text-xs text-muted-foreground">
                                    {topicExpansion.semantic_clusters?.map((tp: string, idx: number) => (
                                        <li key={idx} className="bg-secondary/10 border border-border/30 rounded-xl p-3 leading-relaxed">
                                            {tp}
                                        </li>
                                    )) || (
                                        <li className="text-muted-foreground italic">None identified.</li>
                                    )}
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
                                    {searchIntentContext.informational?.map((q: string, idx: number) => (
                                        <li key={idx} className="bg-secondary/10 border border-border/30 rounded-xl p-2 leading-relaxed">
                                            {q}
                                        </li>
                                    )) || (
                                        <li className="italic">None identified.</li>
                                    )}
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-green-400 border-b border-border/55 pb-1">
                                    Comparative
                                </h4>
                                <ul className="space-y-2 text-[11px] text-muted-foreground">
                                    {searchIntentContext.comparative?.map((q: string, idx: number) => (
                                        <li key={idx} className="bg-secondary/10 border border-border/30 rounded-xl p-2 leading-relaxed">
                                            {q}
                                        </li>
                                    )) || (
                                        <li className="italic">None identified.</li>
                                    )}
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-orange-400 border-b border-border/55 pb-1">
                                    Transactional
                                </h4>
                                <ul className="space-y-2 text-[11px] text-muted-foreground">
                                    {searchIntentContext.transactional?.map((q: string, idx: number) => (
                                        <li key={idx} className="bg-secondary/10 border border-border/30 rounded-xl p-2 leading-relaxed">
                                            {q}
                                        </li>
                                    )) || (
                                        <li className="italic">None identified.</li>
                                    )}
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-muted-foreground border-b border-border/55 pb-1">
                                    Navigational
                                </h4>
                                <ul className="space-y-2 text-[11px] text-muted-foreground">
                                    {searchIntentContext.navigational?.map((q: string, idx: number) => (
                                        <li key={idx} className="bg-secondary/10 border border-border/30 rounded-xl p-2 leading-relaxed">
                                            {q}
                                        </li>
                                    )) || (
                                        <li className="italic">None identified.</li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    )}

                    {activeTab === 'signals' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-2">
                                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Demand Score</span>
                                    <span className="text-3xl font-black text-indigo-500">{marketSignals.demand_score || 0.0}</span>
                                </div>
                                <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-2">
                                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Competition Score</span>
                                    <span className="text-3xl font-black text-orange-500">{marketSignals.competition_score || 0.0}</span>
                                </div>
                                <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-2">
                                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Forecast Score</span>
                                    <span className="text-3xl font-black text-green-500">{marketSignals.forecast_score || 0.0}</span>
                                </div>
                                <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-2">
                                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Opportunity Score</span>
                                    <span className="text-3xl font-black text-pink-500">{marketSignals.opportunity_score || 0.0}</span>
                                </div>
                            </div>

                            <div className="bg-indigo-600/5 border border-indigo-500/10 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                                <h3 className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider">Research Integrity Metric</h3>
                                <div className="flex items-center gap-3">
                                    <div className="w-full bg-secondary rounded-full h-3.5 overflow-hidden border border-border/40">
                                        <div 
                                            className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                                            style={{ width: `${marketSignals.opportunity_score || 50}%` }}
                                        />
                                    </div>
                                </div>
                                <p className="text-[10px] text-muted-foreground leading-relaxed pt-1">
                                    This metric calculates the demand-to-competition ratio. A higher score represents lower competition and higher market demand growth.
                                </p>
                            </div>
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
                        <Sparkles className="w-4 h-4" /> Load Research Context
                    </button>
                </div>
            </div>
        </div>
    );
}
