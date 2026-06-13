import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from database.database import get_db
from database.models import (
    AnalyticsChannel,
    AnalyticsChannelIdentity,
    AnalyticsWorkspaceLink,
    AnalyticsVideo,
    AnalyticsSnapshot,
    AnalyticsInsight,
    GoogleTrendsSnapshot
)
from api.schemas import (
    ObserveChannelRequest,
    LinkChannelIdentityRequest,
    AnalyticsChannelResponse,
    AnalyticsOverviewResponse,
    AnalyticsVideoResponse,
    AnalyticsInsightResponse,
    GoogleTrendsSnapshotResponse
)
from services.analytics.collector import sync_channel, get_any_youtube_client

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/channels", response_model=List[AnalyticsChannelResponse])
def list_observed_channels(workspace_id: Optional[str] = None, db: Session = Depends(get_db)):
    if workspace_id:
        links = db.query(AnalyticsWorkspaceLink).filter(AnalyticsWorkspaceLink.workspace_id == workspace_id).all()
        channel_ids = [link.analytics_channel_id for link in links]
        return db.query(AnalyticsChannel).filter(AnalyticsChannel.id.in_(channel_ids)).all()
    return db.query(AnalyticsChannel).all()

@router.post("/channels/observe", response_model=AnalyticsChannelResponse)
def observe_channel(request: ObserveChannelRequest, db: Session = Depends(get_db)):
    # Check if channel is already observed
    channel = db.query(AnalyticsChannel).filter(
        AnalyticsChannel.external_channel_id == request.external_channel_id
    ).first()

    if not channel:
        # Resolve name and handle using public API client
        channel_name = f"Channel {request.external_channel_id}"
        channel_handle = None
        try:
            youtube = get_any_youtube_client(db)
            ch_resp = youtube.channels().list(
                part="snippet",
                id=request.external_channel_id
            ).execute()
            if ch_resp.get("items"):
                snippet = ch_resp["items"][0].get("snippet", {})
                channel_name = snippet.get("title", channel_name)
                channel_handle = snippet.get("customUrl", channel_handle)
        except Exception as e:
            print(f"Warning: Failed to fetch channel details during observe: {e}")

        channel = AnalyticsChannel(
            id=str(uuid.uuid4()),
            external_channel_id=request.external_channel_id,
            channel_name=channel_name,
            channel_handle=channel_handle,
            is_own=request.is_own,
            sync_status="pending"
        )
        db.add(channel)
        db.commit()
        db.refresh(channel)

    # Associate with workspace if provided
    if request.workspace_id:
        link = db.query(AnalyticsWorkspaceLink).filter(
            AnalyticsWorkspaceLink.workspace_id == request.workspace_id,
            AnalyticsWorkspaceLink.analytics_channel_id == channel.id
        ).first()
        if not link:
            link = AnalyticsWorkspaceLink(
                id=str(uuid.uuid4()),
                workspace_id=request.workspace_id,
                analytics_channel_id=channel.id
            )
            db.add(link)
            db.commit()

    # Trigger initial sync
    try:
        sync_channel(db, channel.id)
        db.refresh(channel)
    except Exception as e:
        print(f"Error doing initial sync: {e}")

    return channel

@router.post("/channels/{channel_id}/link-identity", response_model=AnalyticsChannelResponse)
def link_channel_identity(channel_id: str, request: LinkChannelIdentityRequest, db: Session = Depends(get_db)):
    channel = db.query(AnalyticsChannel).filter(AnalyticsChannel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Observed channel not found")

    identity = db.query(AnalyticsChannelIdentity).filter(
        AnalyticsChannelIdentity.analytics_channel_id == channel_id
    ).first()

    if not identity:
        identity = AnalyticsChannelIdentity(
            id=str(uuid.uuid4()),
            analytics_channel_id=channel_id,
            identity_reference_id=request.identity_reference_id
        )
        db.add(identity)
    else:
        identity.identity_reference_id = request.identity_reference_id

    # Marking the channel as owned
    channel.is_own = True
    db.commit()

    # Trigger sync
    try:
        sync_channel(db, channel.id)
        db.refresh(channel)
    except Exception as e:
        print(f"Error during linked identity sync: {e}")

    return channel

@router.get("/channels/{channel_id}/overview", response_model=AnalyticsOverviewResponse)
def get_channel_overview(channel_id: str, db: Session = Depends(get_db)):
    channel = db.query(AnalyticsChannel).filter(AnalyticsChannel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Observed channel not found")

    snapshot = db.query(AnalyticsSnapshot).filter(
        AnalyticsSnapshot.target_id == channel_id,
        AnalyticsSnapshot.target_type == "channel"
    ).order_by(AnalyticsSnapshot.snapshot_date.desc()).first()

    if not snapshot:
        return AnalyticsOverviewResponse(
            channel_id=channel_id,
            views=0,
            watch_time=0.0,
            subscribers=0,
            impressions=0,
            ctr=0.0,
            likes=0,
            comments=0,
            last_sync_at=channel.last_sync_at
        )

    return AnalyticsOverviewResponse(
        channel_id=channel_id,
        views=snapshot.views or 0,
        watch_time=snapshot.watch_time or 0.0,
        subscribers=snapshot.subscribers or 0,
        impressions=snapshot.impressions or 0,
        ctr=snapshot.ctr or 0.0,
        likes=snapshot.likes or 0,
        comments=snapshot.comments or 0,
        last_sync_at=channel.last_sync_at
    )

@router.get("/channels/{channel_id}/videos", response_model=List[AnalyticsVideoResponse])
def get_channel_videos(channel_id: str, db: Session = Depends(get_db)):
    channel = db.query(AnalyticsChannel).filter(AnalyticsChannel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Observed channel not found")

    return db.query(AnalyticsVideo).filter(
        AnalyticsVideo.analytics_channel_id == channel_id
    ).order_by(AnalyticsVideo.published_at.desc()).all()

@router.get("/channels/{channel_id}/insights", response_model=List[AnalyticsInsightResponse])
def get_channel_insights(channel_id: str, db: Session = Depends(get_db)):
    return db.query(AnalyticsInsight).filter(
        (AnalyticsInsight.analytics_channel_id == channel_id) | (AnalyticsInsight.analytics_channel_id == None)
    ).order_by(AnalyticsInsight.created_at.desc()).all()

@router.get("/market-trends", response_model=List[GoogleTrendsSnapshotResponse])
def get_market_trends(query: Optional[str] = None, geo: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(GoogleTrendsSnapshot)
    if query:
        q = q.filter(GoogleTrendsSnapshot.query_term.like(f"%{query}%"))
    if geo:
        q = q.filter(GoogleTrendsSnapshot.geo == geo)
    return q.order_by(GoogleTrendsSnapshot.snapshot_date.desc()).all()
