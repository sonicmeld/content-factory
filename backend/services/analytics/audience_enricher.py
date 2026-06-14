from typing import Optional, List, Dict, Any

def enrich_audience(topic: str, keywords: List[str], llm_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Analyzes target audience context, mapping skill levels, pain points, goals, and questions.
    Uses LLM data if provided; otherwise falls back to keyword-based heuristics.
    """
    if llm_data and isinstance(llm_data, dict):
        # Clean and sanitize incoming LLM fields safely
        return {
            "audience_level": llm_data.get("audience_level", "Intermediate"),
            "pain_points": llm_data.get("pain_points", []),
            "goals": llm_data.get("goals", []),
            "common_questions": llm_data.get("common_questions", [])
        }

    # Heuristic Fallback
    keywords_lower = [k.lower() for k in keywords]
    topic_lower = topic.lower()

    # Determine audience level
    if any(x in topic_lower or any(x in kw for kw in keywords_lower) for x in ["advanced", "expert", "mastery", "deep dive"]):
        audience_level = "Advanced"
    elif any(x in topic_lower or any(x in kw for kw in keywords_lower) for x in ["beginner", "tutorial", "intro", "guide", "simple"]):
        audience_level = "Beginner"
    else:
        audience_level = "Intermediate"

    pain_points = [
        f"Struggling to set up and optimize workflows for {topic}.",
        f"Wasting time on generic tutorials that don't address specific problems related to {topic}.",
        f"Difficulty keeping up with rapid changes and new updates in the {topic} ecosystem."
    ]

    goals = [
        f"Master the core pillars and architecture of {topic}.",
        f"Implement a high-efficiency production setup for {topic}.",
        f"Reduce development time and increase performance when deploying {topic} solutions."
    ]

    common_questions = [
        f"How do I get started with {topic}?",
        f"What are the best frameworks or libraries to use for {topic}?",
        f"What are the most common pitfalls to avoid when working with {topic}?"
    ]

    return {
        "audience_level": audience_level,
        "pain_points": pain_points,
        "goals": goals,
        "common_questions": common_questions
    }
