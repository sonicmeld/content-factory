from typing import Optional, List

def generate_angles(topic: str, keywords: List[str], llm_data: Optional[List[str]] = None) -> List[str]:
    """
    Generates structured content angles based on different narrative templates.
    Uses LLM list if provided; otherwise falls back to dynamic templates.
    """
    if llm_data and isinstance(llm_data, list):
        return llm_data

    # Heuristic Fallback
    keyword_snippet = keywords[0] if keywords else "Modern Frameworks"
    
    return [
        f"Educational Angle: Master the Core Pillars of {topic} (Theory & Architecture Deep Dive)",
        f"Case Study Angle: How We Scaled Our Tech Stack and Operations Using {topic}",
        f"Tutorial Angle: Build and Deploy a Production-Ready {topic} Application in 15 Minutes (featuring {keyword_snippet})",
        f"Myth Busting Angle: Debunking the 5 Biggest Lies About {topic} Speed and Complexity",
        f"Comparison Angle: {topic} vs. Alternative Solutions: An Unbiased, Code-First Technical Breakdown"
    ]
