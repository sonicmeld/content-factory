import uuid
import re
from datetime import datetime, timezone
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from database.models import AnalyticsTopic, AnalyticsKeyword, AnalyticsMarketTrend

def clean_fingerprint(text: str) -> str:
    """
    Computes a simplified fingerprint key for matching keywords.
    E.g. 'AI Agents' -> 'aiagent', 'Building AI Agents' -> 'aiagent'
    """
    text = text.lower()
    # Remove common filler words
    fillers = ["building", "tutorial", "workflow", "workflows", "integration", "server", "how to", "create", "using", "guide"]
    for f in fillers:
        text = text.replace(f, "")
    
    # Strip non-alphanumeric and spaces
    text = re.sub(r'[^a-z0-9]', '', text)
    
    # Singularize common endings
    if text.endswith('s') and not text.endswith('ss'):
        text = text[:-1]
        
    return text.strip()

def levenshtein_distance(s1: str, s2: str) -> int:
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    
    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
        
    return previous_row[-1]

def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    text = re.sub(r'[\s-]+', '-', text)
    return text.strip('-')

def find_best_topic_match(db: Session, fingerprint: str, keyword: str) -> AnalyticsTopic:
    """
    Check if a topic with same/similar fingerprint exists in the database.
    """
    # 1. Exact match on fingerprint
    existing = db.query(AnalyticsTopic).filter(AnalyticsTopic.fingerprint == fingerprint).first()
    if existing:
        return existing
        
    # 2. Substring match or Levenshtein distance match
    all_topics = db.query(AnalyticsTopic).all()
    for t in all_topics:
        # If one fingerprint is a subset of the other
        if fingerprint in t.fingerprint or t.fingerprint in fingerprint:
            return t
            
        # Or close Levenshtein distance (e.g. <= 2 character difference for short keys)
        dist = levenshtein_distance(fingerprint, t.fingerprint)
        if dist <= 2:
            return t
            
    return None

def cluster_and_save_trends(db: Session, trend_records: List[Dict[str, Any]]):
    """
    Takes collected market trends, clusters them into topics,
    and saves/updates topics, keywords, and market trends in the database.
    """
    now = datetime.now(timezone.utc)
    
    for record in trend_records:
        kw_text = record["keyword"]
        fingerprint = clean_fingerprint(kw_text)
        
        if not fingerprint:
            fingerprint = slugify(kw_text).replace("-", "")
            
        # Find or create Topic
        topic = find_best_topic_match(db, fingerprint, kw_text)
        if not topic:
            # Determine topic name
            # Let's clean it up slightly
            words = [w.capitalize() for w in kw_text.split() if w.lower() not in ["tutorial", "guide", "how", "to", "using"]]
            topic_name = " ".join(words) if words else kw_text.capitalize()
            topic_slug = slugify(topic_name)
            
            # Avoid slug collisions
            collision_check = db.query(AnalyticsTopic).filter(AnalyticsTopic.topic_slug == topic_slug).first()
            if collision_check:
                topic_slug = f"{topic_slug}-{str(uuid.uuid4())[:4]}"
                
            topic = AnalyticsTopic(
                id=str(uuid.uuid4()),
                topic_name=topic_name,
                topic_slug=topic_slug,
                fingerprint=fingerprint,
                status="active",
                last_calculated_at=now,
                created_at=now,
                updated_at=now
            )
            db.add(topic)
            db.commit()
            db.refresh(topic)

        # Find or create Keyword
        keyword = db.query(AnalyticsKeyword).filter(
            AnalyticsKeyword.topic_id == topic.id,
            AnalyticsKeyword.keyword == kw_text
        ).first()
        
        if not keyword:
            keyword = AnalyticsKeyword(
                id=str(uuid.uuid4()),
                topic_id=topic.id,
                keyword=kw_text,
                trend_score=record["trend_score"],
                search_volume=record["search_volume"],
                competition_score=0.0,
                created_at=now
            )
            db.add(keyword)
        else:
            keyword.trend_score = record["trend_score"]
            keyword.search_volume = record["search_volume"]
        db.commit()
        db.refresh(keyword)

        # Save Market Trend snapshot (Time-Series)
        market_trend = AnalyticsMarketTrend(
            id=str(uuid.uuid4()),
            keyword_id=keyword.id,
            topic_id=topic.id,
            source=record["source"],
            trend_score=record["trend_score"],
            growth_rate=record["growth_rate"],
            region="US",
            collected_at=record["collected_at"]
        )
        db.add(market_trend)
        db.commit()
