"""
channel_profile_extractor.py
Sprint D — Identity Projection Layer

Membangun Analytics Projection dari YouTube Identity Layer.
Data TIDAK diambil langsung dari YouTube API.
Data dibaca dari YoutubeAccount (Identity Layer) yang sudah tersedia.

Rule: JANGAN melakukan OAuth baru. JANGAN membuat koneksi YouTube baru.
      Semua data berasal dari Identity Layer yang sudah tersimpan di database.
"""
import uuid
import json
import re
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session

from database.models import YoutubeAccount, AnalyticsChannelProfile, AnalyticsVideo, AnalyticsChannel, AnalyticsChannelIdentity


# ─────────────────────────────────────────────────────────
# Keyword Extraction Helpers
# ─────────────────────────────────────────────────────────

# Stopwords yang tidak berguna sebagai seed keyword
_STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "it", "this", "that", "are", "was",
    "be", "as", "do", "did", "has", "have", "not", "my", "your", "our",
    "we", "i", "you", "he", "she", "they", "what", "how", "when", "where",
    "why", "all", "new", "get", "use", "using", "will", "can", "one",
    "channel", "youtube", "video", "watch", "subscribe", "like", "comment",
    "tutorial", "guide", "learn", "ep", "part", "episode"
}

_MIN_KEYWORD_LENGTH = 3
_MAX_SEED_KEYWORDS = 30


def _tokenize(text: str) -> List[str]:
    """Tokenize text into meaningful words."""
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s\-]', ' ', text)
    words = text.split()
    return [w.strip('-') for w in words if len(w) >= _MIN_KEYWORD_LENGTH and w not in _STOPWORDS]


def _extract_ngrams(tokens: List[str], n: int = 2) -> List[str]:
    """Generate bigrams from token list."""
    return [" ".join(tokens[i:i+n]) for i in range(len(tokens) - n + 1)]


def _extract_keywords_from_text(text: str) -> List[str]:
    """Extract meaningful keyword candidates from freeform text."""
    if not text:
        return []
    tokens = _tokenize(text)
    # Include unigrams and bigrams
    unigrams = [t for t in tokens if t not in _STOPWORDS]
    bigrams = _extract_ngrams(tokens, 2)
    return unigrams + bigrams


def _parse_channel_keywords(raw: str) -> List[str]:
    """
    Parse YouTube channel keywords string.
    YouTube stores these as space-separated, with quoted phrases.
    Example: '"AI automation" "n8n workflow" mcp'
    """
    if not raw:
        return []
    # Extract quoted phrases first
    quoted = re.findall(r'"([^"]+)"', raw)
    # Then remaining unquoted words
    remainder = re.sub(r'"[^"]+"', '', raw)
    unquoted = [w.strip() for w in remainder.split() if len(w.strip()) >= _MIN_KEYWORD_LENGTH]
    return [kw.lower() for kw in quoted + unquoted if kw.strip()]


def _get_video_titles_from_identity(db: Session, youtube_account_id: str) -> List[str]:
    """
    Get sample video titles from AnalyticsVideo via the AnalyticsChannel
    linked to this YoutubeAccount.

    Path: YoutubeAccount → youtube_channel_id
          → AnalyticsChannel.external_channel_id
          → AnalyticsVideo.analytics_channel_id
    """
    account = db.query(YoutubeAccount).filter(
        YoutubeAccount.id == youtube_account_id
    ).first()
    if not account or not account.youtube_channel_id:
        return []

    # Find the AnalyticsChannel linked to this youtube_channel_id
    analytics_channel = db.query(AnalyticsChannel).filter(
        AnalyticsChannel.external_channel_id == account.youtube_channel_id
    ).first()
    if not analytics_channel:
        return []

    # Fetch top 30 video titles ordered by views (via latest snapshot)
    videos = db.query(AnalyticsVideo).filter(
        AnalyticsVideo.analytics_channel_id == analytics_channel.id
    ).order_by(AnalyticsVideo.views.desc()).limit(30).all()

    return [v.title for v in videos if v.title]


def _build_seed_keywords(
    channel_title: Optional[str],
    channel_description: Optional[str],
    channel_keywords_raw: Optional[str],
    video_titles: List[str]
) -> List[str]:
    """
    Aggregate and deduplicate seed keywords from all sources.
    Priority: channel_keywords_raw > video titles > channel title > description
    """
    seed_set = []

    # 1. Channel official keywords (highest signal)
    parsed_channel_kws = _parse_channel_keywords(channel_keywords_raw or "")
    seed_set.extend(parsed_channel_kws)

    # 2. Video titles (strong SEO signal)
    for title in video_titles[:30]:
        keywords = _extract_keywords_from_text(title)
        seed_set.extend(keywords[:3])  # top 3 per title to avoid one-title dominance

    # 3. Channel title
    if channel_title:
        title_kws = _extract_keywords_from_text(channel_title)
        seed_set.extend(title_kws)

    # 4. Channel description (noisy but useful)
    if channel_description:
        desc_kws = _extract_keywords_from_text(channel_description)
        seed_set.extend(desc_kws[:10])  # limit description contribution

    # Deduplicate preserving order
    seen = set()
    deduped = []
    for kw in seed_set:
        kw_clean = kw.strip().lower()
        if kw_clean and kw_clean not in seen and len(kw_clean) >= _MIN_KEYWORD_LENGTH:
            seen.add(kw_clean)
            deduped.append(kw_clean)

    return deduped[:_MAX_SEED_KEYWORDS]


# ─────────────────────────────────────────────────────────
# Main Service Function
# ─────────────────────────────────────────────────────────

def sync_channel_profile(db: Session, youtube_account_id: str) -> AnalyticsChannelProfile:
    """
    Builds or updates the Analytics Channel Profile projection
    from Identity Layer data only. No new OAuth or YouTube API calls.

    Data sources (all from existing DB):
      - YoutubeAccount.youtube_channel_title
      - YoutubeAccount.youtube_channel_id  (to look up videos)
      - [Future] brandingSettings stored in YoutubeAccount
      - AnalyticsVideo titles (from synced channel videos)

    Returns: AnalyticsChannelProfile instance
    """
    # 1. Load account from Identity Layer
    account = db.query(YoutubeAccount).filter(
        YoutubeAccount.id == youtube_account_id
    ).first()
    if not account:
        raise ValueError(f"YoutubeAccount not found: {youtube_account_id}")

    # 2. Get video titles from existing DB (no API call)
    video_titles = _get_video_titles_from_identity(db, youtube_account_id)

    # 3. Build seed keywords
    seed_keywords = _build_seed_keywords(
        channel_title=account.youtube_channel_title,
        channel_description=None,      # Not stored in YoutubeAccount yet
        channel_keywords_raw=None,     # Not stored in YoutubeAccount yet — placeholder for future
        video_titles=video_titles
    )

    # 4. Upsert AnalyticsChannelProfile
    now = datetime.now(timezone.utc)
    profile = db.query(AnalyticsChannelProfile).filter(
        AnalyticsChannelProfile.youtube_account_id == youtube_account_id
    ).first()

    if not profile:
        profile = AnalyticsChannelProfile(
            id=str(uuid.uuid4()),
            youtube_account_id=youtube_account_id,
        )
        db.add(profile)

    profile.channel_title = account.youtube_channel_title
    profile.seed_keywords_json = json.dumps(seed_keywords)
    profile.video_titles_sample_json = json.dumps(video_titles[:30])
    profile.extracted_at = now
    profile.version = (profile.version or 0) + 1

    db.commit()
    db.refresh(profile)

    print(f"[ChannelProfileExtractor] Synced profile for {account.youtube_channel_title}: "
          f"{len(seed_keywords)} seed keywords extracted (v{profile.version})")

    return profile


def get_seed_keywords(db: Session, youtube_account_id: str) -> List[str]:
    """
    Returns seed keywords for a given YoutubeAccount.
    Triggers sync if profile doesn't exist yet.
    """
    profile = db.query(AnalyticsChannelProfile).filter(
        AnalyticsChannelProfile.youtube_account_id == youtube_account_id
    ).first()

    if not profile or not profile.seed_keywords_json:
        profile = sync_channel_profile(db, youtube_account_id)

    try:
        return json.loads(profile.seed_keywords_json or "[]")
    except (json.JSONDecodeError, TypeError):
        return []
