from typing import Optional, List

def generate_hooks(topic: str, keywords: List[str], llm_data: Optional[List[str]] = None) -> List[str]:
    """
    Generates compelling hooks (Title, Opening, Curiosity, Problem) to capture viewer attention.
    Uses LLM list if provided; otherwise falls back to template structures.
    """
    if llm_data and isinstance(llm_data, list):
        return llm_data

    # Heuristic Fallback
    keyword_snippet = keywords[0] if keywords else "Modern Tools"

    return [
        f"Title Hook: The Hidden {topic} Feature 99% of Developers Are Ignoring",
        f"Opening Hook: 'If you are still writing code using old methods, you are already falling behind. Let\\'s talk about how {topic} changes everything.'",
        f"Curiosity Hook: 'This one single configuration change in {topic} will save you hours of debugging, but almost no one is talking about it.'",
        f"Problem Hook: 'Most developers struggle to scale {topic} in production. Today, we break down the exact blueprint to fix it step-by-step using {keyword_snippet}.'"
    ]
