"""
topic_relevance.py
Sprint D — Topic Relevance Layer

Menghitung relevance_score antara global AnalyticsTopic dan YoutubeAccount
berdasarkan overlap seed keywords channel vs topic fingerprint + keywords.

Rule: Topics tetap global. Relevance adalah bridge, bukan FK ke topic.
"""
import uuid
import json
import re
from datetime import datetime, timezone
from typing import List, Dict
from sqlalchemy.orm import Session

from database.models import AnalyticsTopic, AnalyticsKeyword, AnalyticsTopicRelevance
from services.analytics.channel_profile_extractor import get_seed_keywords
from services.analytics.topic_radar import clean_fingerprint


# ─────────────────────────────────────────────────────────
# Scoring Helpers
# ─────────────────────────────────────────────────────────

def _normalize(text: str) -> str:
    """Normalize keyword/fingerprint for comparison."""
    return re.sub(r'[^a-z0-9\s]', '', text.lower().strip())


def _tokenize_keyword(kw: str) -> List[str]:
    """Split keyword into tokens for overlap matching."""
    return [t for t in _normalize(kw).split() if len(t) >= 2]


def _keyword_overlap_score(seed_keywords: List[str], topic_keywords: List[str], fingerprint: str) -> Dict:
    """
    Calculate overlap between channel seed keywords and topic signals.

    Matching strategy (hierarchical):
    1. Exact match: seed == topic keyword (score += 1.0 per match)
    2. Token overlap: any token from seed appears in topic keyword or vice versa (score += 0.5)
    3. Fingerprint match: any seed token matches topic fingerprint (score += 0.7)

    Returns {'raw_score': float, 'overlap_count': int}
    """
    raw_score = 0.0
    overlap_count = 0
    matched_seeds = set()

    # Normalize all inputs
    norm_seeds = [_normalize(s) for s in seed_keywords]
    norm_topic_kws = [_normalize(k) for k in topic_keywords]
    norm_fingerprint = _normalize(fingerprint)

    for seed in norm_seeds:
        seed_tokens = set(_tokenize_keyword(seed))
        if not seed_tokens:
            continue

        matched = False

        # 1. Exact match with any topic keyword
        if seed in norm_topic_kws:
            raw_score += 1.0
            overlap_count += 1
            matched = True

        if not matched:
            # 2. Fingerprint match
            fp_tokens = set(_tokenize_keyword(norm_fingerprint))
            if seed_tokens & fp_tokens:
                raw_score += 0.7
                overlap_count += 1
                matched = True

        if not matched:
            # 3. Token overlap with any topic keyword
            for topic_kw in norm_topic_kws:
                topic_tokens = set(_tokenize_keyword(topic_kw))
                if seed_tokens & topic_tokens:
                    raw_score += 0.5
                    overlap_count += 1
                    matched = True
                    break

        if matched and seed not in matched_seeds:
            matched_seeds.add(seed)

    return {"raw_score": raw_score, "overlap_count": len(matched_seeds)}


def _normalize_to_01(raw_score: float, seed_count: int, topic_kw_count: int) -> float:
    """
    Normalize raw_score to 0.0–1.0.
    Max possible score = seed_count × 1.0 (all seeds exact match)
    """
    if seed_count == 0:
        return 0.0
    max_possible = float(seed_count)
    normalized = raw_score / max_possible
    return round(min(1.0, max(0.0, normalized)), 4)


# ─────────────────────────────────────────────────────────
# Main Service Function
# ─────────────────────────────────────────────────────────

def calculate_relevance_scores(db: Session, youtube_account_id: str) -> int:
    """
    Calculate and upsert relevance scores for ALL global topics
    relative to a specific YoutubeAccount.

    Flow:
      1. Get seed keywords from channel profile (via Identity Layer)
      2. For each global AnalyticsTopic:
         - Fetch its keywords
         - Calculate overlap with channel seed keywords
         - Upsert AnalyticsTopicRelevance
      3. Return count of topics scored

    Topics with relevance_score == 0 are still stored (to allow
    frontend to distinguish "no relevance" from "not yet calculated").
    """
    seed_keywords = get_seed_keywords(db, youtube_account_id)
    if not seed_keywords:
        print(f"[TopicRelevance] No seed keywords for account {youtube_account_id} — skipping scoring")
        return 0

    now = datetime.now(timezone.utc)
    topics = db.query(AnalyticsTopic).filter(
        AnalyticsTopic.status != "archived"
    ).all()

    scored_count = 0
    for topic in topics:
        # Get topic's own keywords for overlap matching
        topic_keywords_objs = db.query(AnalyticsKeyword).filter(
            AnalyticsKeyword.topic_id == topic.id
        ).all()
        topic_keywords = [k.keyword for k in topic_keywords_objs]

        # Calculate overlap
        result = _keyword_overlap_score(
            seed_keywords=seed_keywords,
            topic_keywords=topic_keywords,
            fingerprint=topic.fingerprint or ""
        )

        relevance_score = _normalize_to_01(
            raw_score=result["raw_score"],
            seed_count=len(seed_keywords),
            topic_kw_count=len(topic_keywords)
        )
        overlap_count = result["overlap_count"]

        # Upsert AnalyticsTopicRelevance
        existing = db.query(AnalyticsTopicRelevance).filter(
            AnalyticsTopicRelevance.topic_id == topic.id,
            AnalyticsTopicRelevance.youtube_account_id == youtube_account_id
        ).first()

        if existing:
            existing.relevance_score = relevance_score
            existing.seed_overlap_count = overlap_count
            existing.calculated_at = now
        else:
            new_rel = AnalyticsTopicRelevance(
                id=str(uuid.uuid4()),
                topic_id=topic.id,
                youtube_account_id=youtube_account_id,
                relevance_score=relevance_score,
                seed_overlap_count=overlap_count,
                calculated_at=now
            )
            db.add(new_rel)

        scored_count += 1

    db.commit()
    print(f"[TopicRelevance] Scored {scored_count} topics for account {youtube_account_id}")
    return scored_count


def get_relevance_map(db: Session, youtube_account_id: str) -> Dict[str, float]:
    """
    Returns a dict mapping topic_id → relevance_score for fast lookup.
    Used by API layer to enrich topic responses.
    """
    relevances = db.query(AnalyticsTopicRelevance).filter(
        AnalyticsTopicRelevance.youtube_account_id == youtube_account_id
    ).all()
    return {r.topic_id: r.relevance_score for r in relevances}


def get_relevance_label(score: float) -> str:
    """Convert numeric relevance score to display label."""
    if score >= 0.5:
        return "High"
    elif score >= 0.2:
        return "Medium"
    elif score > 0.0:
        return "Low"
    return "None"
