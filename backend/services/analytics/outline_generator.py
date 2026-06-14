from typing import Optional, List, Dict, Any

def generate_outlines(topic: str, keywords: List[str], llm_data: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
    """
    Generates video outline templates dividing content into distinct segments with times.
    Uses LLM structure if provided; otherwise falls back to a standard production flow.
    """
    if llm_data and isinstance(llm_data, list):
        return llm_data

    # Heuristic Fallback
    keyword_str = ", ".join(keywords[:3]) if keywords else "Modern Tools"

    return [
        {
            "segment": "Intro",
            "duration": "0:00 - 1:15",
            "description": f"Grab attention using a problem hook, then overview how {topic} solves this major issue."
        },
        {
            "segment": "The Core Problem",
            "duration": "1:15 - 3:00",
            "description": f"Explain why traditional methods break down and outline the benefits of transition to {topic}."
        },
        {
            "segment": "Architecture Deep Dive",
            "duration": "3:00 - 6:30",
            "description": f"Examine the core components of {topic} (featuring {keyword_str}) and structural data flow."
        },
        {
            "segment": "Step-by-Step Demo",
            "duration": "6:30 - 10:30",
            "description": f"Practical walkthrough building a working prototype utilizing {topic}."
        },
        {
            "segment": "Avoid These 3 Mistakes",
            "duration": "10:30 - 12:45",
            "description": f"Identify common developer mistakes and configuration traps when setting up {topic}."
        },
        {
            "segment": "Summary & Outro",
            "duration": "12:45 - 14:00",
            "description": "Recap the main benefits, call to action, and link to GitHub resources."
        }
    ]
