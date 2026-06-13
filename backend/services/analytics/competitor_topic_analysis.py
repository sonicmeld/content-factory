from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from database.models import AnalyticsTopic, AnalyticsKeyword, AnalyticsVideo, AnalyticsChannel

def analyze_competitor_coverage(db: Session) -> Dict[str, Any]:
    """
    Analyzes competitor videos to map topic coverage.
    Returns competitor topic lists: Top Covered, Emerging, and Ignored.
    """
    # 1. Fetch competitor channels
    competitor_channels = db.query(AnalyticsChannel).filter(
        AnalyticsChannel.is_own == False,
        AnalyticsChannel.is_archived == False
    ).all()
    
    comp_channel_ids = [c.id for c in competitor_channels]
    if not comp_channel_ids:
        # Fallback if no competitor channels exist
        return {
            "top_covered": [],
            "emerging": [],
            "ignored": [],
            "raw_counts": {}
        }
        
    # 2. Fetch competitor videos
    videos = db.query(AnalyticsVideo).filter(
        AnalyticsVideo.analytics_channel_id.in_(comp_channel_ids)
    ).all()
    
    # 3. Analyze against active topics
    topics = db.query(AnalyticsTopic).filter(AnalyticsTopic.status != "archived").all()
    
    raw_counts = {}
    emerging_counts = {}
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    
    for t in topics:
        raw_counts[t.id] = 0
        emerging_counts[t.id] = 0
        
        # Get keywords for this topic
        keywords = db.query(AnalyticsKeyword).filter(AnalyticsKeyword.topic_id == t.id).all()
        search_terms = [t.topic_name.lower(), t.topic_slug.lower()] + [k.keyword.lower() for k in keywords]
        
        # Count matches
        for v in videos:
            title_lower = v.title.lower()
            if any(term in title_lower for term in search_terms):
                raw_counts[t.id] += 1
                # Check if published in last 30 days
                # Convert v.published_at to timezone-aware if naive
                pub_at = v.published_at
                if pub_at.tzinfo is None:
                    pub_at = pub_at.replace(tzinfo=timezone.utc)
                if pub_at >= thirty_days_ago:
                    emerging_counts[t.id] += 1
                    
        # Calculate competition score for topic (scale to 0-100)
        # 0 match -> 0 score, 1 match -> 10, 10+ match -> 100
        t.competition_score = float(min(100.0, raw_counts[t.id] * 10))
        
        # Update keywords' competition score too
        for k in keywords:
            kw_match_count = sum(1 for v in videos if k.keyword.lower() in v.title.lower())
            k.competition_score = float(min(100.0, kw_match_count * 10))
            
    db.commit()
    
    # Sort topics by raw_counts
    sorted_topics = sorted(topics, key=lambda x: raw_counts.get(x.id, 0), reverse=True)
    
    top_covered = []
    emerging = []
    ignored = []
    
    for t in sorted_topics:
        count = raw_counts.get(t.id, 0)
        topic_info = {
            "id": t.id,
            "topic_name": t.topic_name,
            "topic_slug": t.topic_slug,
            "video_count": count,
            "competition_score": t.competition_score
        }
        
        if count >= 3:
            top_covered.append(topic_info)
        elif count > 0:
            emerging.append(topic_info)
        else:
            ignored.append(topic_info)
            
    return {
        "top_covered": top_covered,
        "emerging": emerging,
        "ignored": ignored,
        "raw_counts": raw_counts
    }
