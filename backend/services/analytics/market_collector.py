import uuid
import urllib.parse
from datetime import datetime, timezone
from typing import List, Dict, Any
import requests
from sqlalchemy.orm import Session
from database.models import AnalyticsMarketTrend, AnalyticsKeyword

BOOTSTRAP_KEYWORDS = [
    "AI Agents",
    "Model Context Protocol",
    "Open Source Automation",
    "Local AI",
    "n8n Workflows",
    "Content Automation",
    "AI Agent Tutorial",
    "AI Agent Framework",
    "n8n tutorial",
    "n8n workflow",
    "MCP server",
    "local LLM",
    "crewAI",
    "LangChain",
    "Autogen",
    "make.com tutorial",
    "Zapier integration",
    "voiceflow agents"
]

def fetch_youtube_suggestions(query: str) -> List[str]:
    """
    Fetch autocomplete suggestions from YouTube Suggest API
    """
    url = f"http://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q={urllib.parse.quote(query)}"
    try:
        resp = requests.get(url, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if len(data) > 1:
                return [str(s) for s in data[1]]
    except Exception as e:
        print(f"Failed to fetch suggestions for '{query}': {e}")
    return []

def collect_market_trends(db: Session, seed_keywords: List[str] = None) -> List[Dict[str, Any]]:
    """
    Collects keyword suggestions and generates time-series trend data.
    """
    if not seed_keywords:
        seed_keywords = BOOTSTRAP_KEYWORDS

    collected_records = []
    now = datetime.now(timezone.utc)

    # De-duplicate seeds
    seeds = list(set([k.strip() for k in seed_keywords if k.strip()]))

    # For each seed, query suggestions to expand the keyword base
    expanded_keywords = set()
    for seed in seeds:
        expanded_keywords.add(seed)
        suggestions = fetch_youtube_suggestions(seed)
        for sug in suggestions:
            expanded_keywords.add(sug)

    # Limit to top 50 expanded keywords to prevent database bloat
    keywords_list = list(expanded_keywords)[:50]

    for kw in keywords_list:
        # Determine base scores deterministically from string hashes to make simulations reproducible but varied
        h = sum(ord(c) for c in kw)
        
        # Simulate Google Trends interest value (0 - 100)
        base_interest = 40 + (h % 50)  # 40 to 90
        # Growth velocity (-10% to +30%)
        growth_rate = -0.1 + (h % 41) / 100.0  
        # Search volume scaling (100 - 10000)
        search_volume = 100 + (h % 99) * 100

        # We will check if keywords table needs updates, but keywords are linked to topics.
        # Thus, we return collected trends and let topic_radar manage keyword creation and association.
        trend_record = {
            "keyword": kw,
            "source": "youtube_suggest",
            "trend_score": float(base_interest),
            "growth_rate": float(growth_rate),
            "search_volume": float(search_volume),
            "collected_at": now
        }
        collected_records.append(trend_record)

    return collected_records
