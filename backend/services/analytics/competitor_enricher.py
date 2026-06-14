from typing import Optional, Dict, Any, List

def enrich_competitors(topic: str, competitor_data: Dict[str, Any], llm_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Analyzes competitor coverage, mapping oversaturated topics, undercovered topics, and content gaps.
    Uses LLM data if provided; otherwise falls back to heuristics based on competitive metrics.
    """
    if llm_data and isinstance(llm_data, dict):
        return {
            "oversaturated_topics": llm_data.get("oversaturated_topics", []),
            "undercovered_topics": llm_data.get("undercovered_topics", []),
            "content_gaps": llm_data.get("content_gaps", [])
        }

    # Heuristic Fallback
    comp_score = float(competitor_data.get("competition_score", 50.0))

    if comp_score > 60.0:
        oversaturated = [
            f"Basic introductory tutorials and general definitions of {topic}.",
            f"Surface-level summaries of recent news and announcements about {topic}."
        ]
        undercovered = [
            f"Deep dives into production scaling, debugging, and security audits for {topic}.",
            f"Detailed post-mortems of real-world failures and edge cases of {topic}."
        ]
        gaps = [
            f"Direct performance benchmarks and structural comparisons of {topic} frameworks.",
            f"Uncommon integration workflows, custom plugins, and automation scripts for {topic}."
        ]
    else:
        oversaturated = [
            f"Generic high-level comparisons of {topic} vs. older alternative solutions."
        ]
        undercovered = [
            f"Comprehensive step-by-step implementation roadmaps for {topic}.",
            f"Real-world case studies and cost-benefit analysis of deploying {topic}."
        ]
        gaps = [
            f"Ready-to-use boilerplate templates and quick-start templates for {topic}.",
            f"A-Z configuration blueprints targeting solopreneurs and rapid developers using {topic}."
        ]

    return {
        "oversaturated_topics": oversaturated,
        "undercovered_topics": undercovered,
        "content_gaps": gaps
    }
