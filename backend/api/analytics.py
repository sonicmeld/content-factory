import uuid
import re
import time
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from database.database import get_db, SessionLocal
from database.models import (
    AnalyticsChannel,
    AnalyticsChannelIdentity,
    AnalyticsWorkspaceLink,
    AnalyticsVideo,
    AnalyticsSnapshot,
    AnalyticsInsight,
    GoogleTrendsSnapshot,
    AnalyticsSyncLog
)
from api.schemas import (
    ObserveChannelRequest,
    LinkChannelIdentityRequest,
    AnalyticsChannelResponse,
    AnalyticsOverviewResponse,
    AnalyticsVideoResponse,
    AnalyticsInsightResponse,
    GoogleTrendsSnapshotResponse,
    AnalyticsSyncStatus,
    SyncActivityLog,
    InsightRefreshResponse,
    InsightStatusUpdateRequest
)
from services.analytics.collector import sync_channel, get_any_youtube_client
from services.analytics.explorer import (
    get_channel_timeline,
    get_publishing_pattern,
    compare_channels_data
)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

def resolve_handle_to_channel_id(handle: str, db: Session) -> str:
    try:
        youtube = get_any_youtube_client(db)
        if not handle.startswith("@"):
            handle = f"@{handle}"
        ch_resp = youtube.channels().list(
            part="id",
            forHandle=handle
        ).execute()
        if ch_resp.get("items"):
            return ch_resp["items"][0]["id"]
    except Exception as e:
        print(f"Failed to resolve handle {handle}: {e}")
    raise HTTPException(status_code=400, detail=f"Could not resolve YouTube handle '{handle}' to a channel ID")

def resolve_username_to_channel_id(username: str, db: Session) -> str:
    try:
        youtube = get_any_youtube_client(db)
        ch_resp = youtube.channels().list(
            part="id",
            forUsername=username
        ).execute()
        if ch_resp.get("items"):
            return ch_resp["items"][0]["id"]
    except Exception as e:
        print(f"Failed to resolve username {username}: {e}")
    raise HTTPException(status_code=400, detail=f"Could not resolve YouTube username '{username}' to a channel ID")

def normalize_youtube_channel_input(input_val: str, db: Session) -> str:
    input_val = input_val.strip()
    
    # 1. Check if it's already a channel ID
    if re.match(r"^UC[A-Za-z0-9_-]{22}$", input_val):
        return input_val
        
    # 2. Parse URLs
    channel_match = re.search(r"youtube\.com/channel/(UC[A-Za-z0-9_-]{22})", input_val, re.IGNORECASE)
    if channel_match:
        return channel_match.group(1)
        
    handle_match = re.search(r"youtube\.com/@([A-Za-z0-9_\-\.]+)", input_val, re.IGNORECASE)
    if handle_match:
        handle = "@" + handle_match.group(1)
        return resolve_handle_to_channel_id(handle, db)
        
    user_match = re.search(r"youtube\.com/user/([A-Za-z0-9_\-\.]+)", input_val, re.IGNORECASE)
    if user_match:
        username = user_match.group(1)
        return resolve_username_to_channel_id(username, db)
        
    # 3. Handle @handle directly
    if input_val.startswith("@"):
        return resolve_handle_to_channel_id(input_val, db)
        
    # 4. Fallback: treat plain text as a handle
    if "/" not in input_val and " " not in input_val:
        handle = input_val if input_val.startswith("@") else f"@{input_val}"
        try:
            return resolve_handle_to_channel_id(handle, db)
        except Exception:
            try:
                return resolve_username_to_channel_id(input_val, db)
            except Exception:
                pass
                
    raise HTTPException(status_code=400, detail="Invalid YouTube channel ID, handle, or URL format")

def run_async_channel_sync(channel_id: str):
    db_session = SessionLocal()
    start_time = datetime.now(timezone.utc)
    log_id = str(uuid.uuid4())
    
    # Update status to SYNCING
    channel = db_session.query(AnalyticsChannel).filter(AnalyticsChannel.id == channel_id).first()
    channel_name = "Unknown Channel"
    if channel:
        channel.sync_status = AnalyticsSyncStatus.SYNCING.value
        channel_name = channel.channel_name
        db_session.commit()
        
    # Create sync log
    sync_log = AnalyticsSyncLog(
        id=log_id,
        channel_name=channel_name,
        started_at=start_time,
        status=AnalyticsSyncStatus.SYNCING.value
    )
    db_session.add(sync_log)
    db_session.commit()
    
    try:
        sync_channel(db_session, channel_id)
        
        # Calculate duration and set status to SUCCESS
        finished_time = datetime.now(timezone.utc)
        duration = int((finished_time - start_time).total_seconds())
        
        channel = db_session.query(AnalyticsChannel).filter(AnalyticsChannel.id == channel_id).first()
        if channel:
            channel.sync_status = AnalyticsSyncStatus.SUCCESS.value
            channel.last_sync_duration_seconds = duration
            channel.last_sync_at = finished_time
            channel.last_error = None
            db_session.commit()
            
        log = db_session.query(AnalyticsSyncLog).filter(AnalyticsSyncLog.id == log_id).first()
        if log:
            log.finished_at = finished_time
            log.duration_seconds = duration
            log.status = AnalyticsSyncStatus.SUCCESS.value
            db_session.commit()
            
        cleanup_sync_logs_retention(db_session)
        
    except Exception as e:
        db_session.rollback()
        finished_time = datetime.now(timezone.utc)
        duration = int((finished_time - start_time).total_seconds())
        
        channel = db_session.query(AnalyticsChannel).filter(AnalyticsChannel.id == channel_id).first()
        if channel:
            channel.sync_status = AnalyticsSyncStatus.FAILED.value
            channel.last_error = str(e)[:500]
            db_session.commit()
            
        log = db_session.query(AnalyticsSyncLog).filter(AnalyticsSyncLog.id == log_id).first()
        if log:
            log.finished_at = finished_time
            log.duration_seconds = duration
            log.status = AnalyticsSyncStatus.FAILED.value
            db_session.commit()
    finally:
        db_session.close()

def cleanup_sync_logs_retention(db: Session):
    try:
        # 1. Delete records > 90 days old
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=90)
        db.query(AnalyticsSyncLog).filter(AnalyticsSyncLog.started_at < cutoff_date).delete()
        db.commit()
        
        # 2. Keep at most 10,000 records
        total_count = db.query(AnalyticsSyncLog).count()
        if total_count > 10000:
            threshold_log = db.query(AnalyticsSyncLog).order_by(AnalyticsSyncLog.started_at.desc()).offset(10000).first()
            if threshold_log:
                db.query(AnalyticsSyncLog).filter(AnalyticsSyncLog.started_at <= threshold_log.started_at).delete()
                db.commit()
    except Exception as cleanup_err:
        print(f"Error during sync log cleanup retention: {cleanup_err}")
        db.rollback()

@router.get("/channels", response_model=List[AnalyticsChannelResponse])
def list_observed_channels(channel_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(AnalyticsChannel).filter(AnalyticsChannel.is_archived == False)
    if channel_id:
        links = db.query(AnalyticsWorkspaceLink).filter(AnalyticsWorkspaceLink.channel_id == channel_id).all()
        channel_ids = [link.analytics_channel_id for link in links]
        return query.filter(AnalyticsChannel.id.in_(channel_ids)).all()
    return query.all()

@router.post("/channels/observe", response_model=AnalyticsChannelResponse)
def observe_channel(request: ObserveChannelRequest, db: Session = Depends(get_db)):
    normalized_channel_id = normalize_youtube_channel_input(request.external_channel_id, db)
    
    # Check if channel is already observed
    channel = db.query(AnalyticsChannel).filter(
        AnalyticsChannel.external_channel_id == normalized_channel_id
    ).first()

    is_own = (request.analytics_type == "owned")
    analytics_type = request.analytics_type

    if channel:
        if channel.is_archived:
            channel.is_archived = False
        channel.is_own = is_own
        channel.analytics_type = analytics_type
        # Reset sync status if it was disabled or archived
        if channel.sync_status == AnalyticsSyncStatus.DISABLED.value:
            channel.sync_status = AnalyticsSyncStatus.PENDING.value
        db.commit()
        db.refresh(channel)
    else:
        # Resolve name and handle using public API client
        channel_name = f"Channel {normalized_channel_id}"
        channel_handle = None
        try:
            youtube = get_any_youtube_client(db)
            ch_resp = youtube.channels().list(
                part="snippet",
                id=normalized_channel_id
            ).execute()
            if ch_resp.get("items"):
                snippet = ch_resp["items"][0].get("snippet", {})
                channel_name = snippet.get("title", channel_name)
                channel_handle = snippet.get("customUrl", channel_handle)
        except Exception as e:
            print(f"Warning: Failed to fetch channel details during observe: {e}")

        channel = AnalyticsChannel(
            id=str(uuid.uuid4()),
            external_channel_id=normalized_channel_id,
            channel_name=channel_name,
            channel_handle=channel_handle,
            is_own=is_own,
            analytics_type=analytics_type,
            sync_status=AnalyticsSyncStatus.PENDING.value,
            is_archived=False
        )
        db.add(channel)
        db.commit()
        db.refresh(channel)

    # Associate with workspace channel if provided
    if request.channel_id:
        link = db.query(AnalyticsWorkspaceLink).filter(
            AnalyticsWorkspaceLink.channel_id == request.channel_id,
            AnalyticsWorkspaceLink.analytics_channel_id == channel.id
        ).first()
        if not link:
            link = AnalyticsWorkspaceLink(
                id=str(uuid.uuid4()),
                channel_id=request.channel_id,
                analytics_channel_id=channel.id
            )
            db.add(link)
            db.commit()

    # Trigger initial sync (run synchronously for the observe call to match tests/expectations)
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
    channel.analytics_type = "owned"
    db.commit()

    # Trigger sync synchronously (so returned value has correct status)
    try:
        sync_channel(db, channel.id)
        db.refresh(channel)
    except Exception as e:
        print(f"Error during linked identity sync: {e}")

    return channel

@router.post("/channels/{channel_id}/archive")
def archive_observed_channel(channel_id: str, db: Session = Depends(get_db)):
    channel = db.query(AnalyticsChannel).filter(AnalyticsChannel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Observed channel not found")
    
    channel.is_archived = True
    channel.sync_status = AnalyticsSyncStatus.DISABLED.value
    db.commit()
    return {"message": "Channel archived successfully"}

@router.post("/channels/{channel_id}/sync")
def sync_observed_channel(
    channel_id: str, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db)
):
    channel = db.query(AnalyticsChannel).filter(AnalyticsChannel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Observed channel not found")
    
    channel.sync_status = AnalyticsSyncStatus.PENDING.value
    db.commit()
    
    background_tasks.add_task(run_async_channel_sync, channel.id)
    return {"status": "queued"}

@router.get("/sync-logs", response_model=List[SyncActivityLog])
def list_sync_logs(db: Session = Depends(get_db)):
    return db.query(AnalyticsSyncLog).order_by(AnalyticsSyncLog.started_at.desc()).all()

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
def get_channel_videos(
    channel_id: str,
    sort: str = "newest",
    query: Optional[str] = None,
    limit: Optional[int] = None,
    page: Optional[int] = None,
    db: Session = Depends(get_db)
):
    channel = db.query(AnalyticsChannel).filter(AnalyticsChannel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Observed channel not found")

    q = db.query(AnalyticsVideo).filter(AnalyticsVideo.analytics_channel_id == channel_id)
    
    if query:
        q = q.filter(AnalyticsVideo.title.like(f"%{query}%"))
        
    if sort == "views":
        q = q.order_by(AnalyticsVideo.views.desc())
    elif sort == "likes":
        q = q.order_by(AnalyticsVideo.likes.desc())
    elif sort == "comments":
        q = q.order_by(AnalyticsVideo.comments.desc())
    else:
        q = q.order_by(AnalyticsVideo.published_at.desc())
        
    if limit is not None:
        if page is not None and page > 0:
            offset = (page - 1) * limit
            q = q.offset(offset)
        q = q.limit(limit)
        
    return q.all()

@router.get("/channels/{channel_id}/insights", response_model=List[AnalyticsInsightResponse])
def get_channel_insights(channel_id: str, db: Session = Depends(get_db)):
    insights = db.query(AnalyticsInsight).filter(
        AnalyticsInsight.channel_id == channel_id,
        AnalyticsInsight.status == "active"
    ).all()
    
    # Sort order: Critical (0), High (1), Medium (2), Low (3)
    severity_order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    insights.sort(key=lambda x: (severity_order.get(x.severity, 4), -x.score))
    return insights

@router.get("/channels/{channel_id}/opportunities", response_model=List[AnalyticsInsightResponse])
def get_channel_opportunities(channel_id: str, db: Session = Depends(get_db)):
    return db.query(AnalyticsInsight).filter(
        AnalyticsInsight.channel_id == channel_id,
        AnalyticsInsight.status == "active",
        AnalyticsInsight.insight_type.in_(["content_opportunity", "growth_opportunity"])
    ).order_by(AnalyticsInsight.score.desc()).all()

@router.post("/channels/{channel_id}/refresh-insights", response_model=InsightRefreshResponse)
def refresh_channel_insights(channel_id: str, db: Session = Depends(get_db)):
    from services.analytics.insight_engine import generate_channel_insights
    return generate_channel_insights(db, channel_id)

@router.post("/insights/{insight_id}/status")
def update_insight_status(insight_id: str, req: InsightStatusUpdateRequest, db: Session = Depends(get_db)):
    insight = db.query(AnalyticsInsight).filter(AnalyticsInsight.id == insight_id).first()
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")
    if req.status not in ("active", "resolved", "dismissed", "archived"):
        raise HTTPException(status_code=400, detail="Invalid status")
    insight.status = req.status
    db.commit()
    return {"message": "Status updated successfully", "status": insight.status}


@router.get("/market-trends", response_model=List[GoogleTrendsSnapshotResponse])
def get_market_trends(query: Optional[str] = None, geo: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(GoogleTrendsSnapshot)
    if query:
        q = q.filter(GoogleTrendsSnapshot.query_term.like(f"%{query}%"))
    if geo:
        q = q.filter(GoogleTrendsSnapshot.geo == geo)
    return q.order_by(GoogleTrendsSnapshot.snapshot_date.desc()).all()

from pydantic import BaseModel
class AssignWorkspaceRequest(BaseModel):
    channel_id: Optional[str] = None

@router.post("/channels/{channel_id}/assign-workspace")
def assign_workspace_channel(channel_id: str, request: AssignWorkspaceRequest, db: Session = Depends(get_db)):
    # Delete old links for this analytics channel
    db.query(AnalyticsWorkspaceLink).filter(AnalyticsWorkspaceLink.analytics_channel_id == channel_id).delete()
    
    if request.channel_id:
        link = AnalyticsWorkspaceLink(
            id=str(uuid.uuid4()),
            channel_id=request.channel_id,
            analytics_channel_id=channel_id
        )
        db.add(link)
    db.commit()
    return {"message": "Workspace assignment updated successfully"}

@router.get("/workspace-links")
def list_workspace_links(db: Session = Depends(get_db)):
    links = db.query(AnalyticsWorkspaceLink).all()
    return [{"id": l.id, "channel_id": l.channel_id, "analytics_channel_id": l.analytics_channel_id} for l in links]

@router.get("/identities")
def list_identities(db: Session = Depends(get_db)):
    identities = db.query(AnalyticsChannelIdentity).all()
    return [{"id": i.id, "analytics_channel_id": i.analytics_channel_id, "identity_reference_id": i.identity_reference_id} for i in identities]

@router.get("/health")
def get_analytics_health(db: Session = Depends(get_db)):
    # count active observed channels
    active_count = db.query(AnalyticsChannel).filter(AnalyticsChannel.is_archived == False).count()
    
    # Count pending and failed syncs
    pending_count = db.query(AnalyticsChannel).filter(
        AnalyticsChannel.is_archived == False,
        AnalyticsChannel.sync_status.in_([AnalyticsSyncStatus.PENDING.value, AnalyticsSyncStatus.SYNCING.value])
    ).count()
    
    failed_count = db.query(AnalyticsChannel).filter(
        AnalyticsChannel.is_archived == False,
        AnalyticsChannel.sync_status == AnalyticsSyncStatus.FAILED.value
    ).count()
    
    # Check the last log
    last_log = db.query(AnalyticsSyncLog).order_by(AnalyticsSyncLog.started_at.desc()).first()
    last_run_at = last_log.started_at.isoformat() if last_log else None
    
    collector_status = "healthy"
    if failed_count > 0:
        collector_status = "unhealthy"
        
    return {
        "collector_status": collector_status,
        "last_run_at": last_run_at,
        "active_channels": active_count,
        "pending_sync": pending_count,
        "failed_sync": failed_count
    }


@router.get("/channels/{channel_id}/summary")
def get_channel_summary_route(channel_id: str, db: Session = Depends(get_db)):
    channel = db.query(AnalyticsChannel).filter(AnalyticsChannel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Observed channel not found")
        
    # Get latest snapshot overview
    snapshot = db.query(AnalyticsSnapshot).filter(
        AnalyticsSnapshot.target_id == channel_id,
        AnalyticsSnapshot.target_type == "channel"
    ).order_by(AnalyticsSnapshot.snapshot_date.desc()).first()
    
    if not snapshot:
        overview = {
            "channel_id": channel_id,
            "views": 0,
            "watch_time": 0.0,
            "subscribers": 0,
            "impressions": 0,
            "ctr": 0.0,
            "likes": 0,
            "comments": 0,
            "last_sync_at": channel.last_sync_at
        }
    else:
        overview = {
            "channel_id": channel_id,
            "views": snapshot.views or 0,
            "watch_time": snapshot.watch_time or 0.0,
            "subscribers": snapshot.subscribers or 0,
            "impressions": snapshot.impressions or 0,
            "ctr": snapshot.ctr or 0.0,
            "likes": snapshot.likes or 0,
            "comments": snapshot.comments or 0,
            "last_sync_at": channel.last_sync_at
        }
        
    # Get diagnostics health score & timestamps
    logs = db.query(AnalyticsSyncLog).filter(
        AnalyticsSyncLog.channel_name == channel.channel_name
    ).order_by(AnalyticsSyncLog.started_at.desc()).limit(5).all()
    
    health_score = 100
    if logs:
        failed_count = sum(1 for l in logs if l.status == "FAILED")
        health_score -= failed_count * 20
        
    if channel.last_sync_at:
        last_sync = channel.last_sync_at
        if last_sync.tzinfo is None:
            last_sync = last_sync.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        if (now - last_sync).days > 7:
            health_score -= 25
            
    health_score = max(0, min(100, health_score))
    
    last_success_log = db.query(AnalyticsSyncLog).filter(
        AnalyticsSyncLog.channel_name == channel.channel_name,
        AnalyticsSyncLog.status == "SUCCESS"
    ).order_by(AnalyticsSyncLog.started_at.desc()).first()
    
    last_failed_log = db.query(AnalyticsSyncLog).filter(
        AnalyticsSyncLog.channel_name == channel.channel_name,
        AnalyticsSyncLog.status == "FAILED"
    ).order_by(AnalyticsSyncLog.started_at.desc()).first()
    
    diagnostics = {
        "sync_status": channel.sync_status,
        "last_error": channel.last_error,
        "last_sync_duration_seconds": channel.last_sync_duration_seconds,
        "last_sync_at": channel.last_sync_at,
        "collector_health_score": health_score,
        "last_successful_sync_at": last_success_log.finished_at if last_success_log else None,
        "last_failed_sync_at": last_failed_log.finished_at if last_failed_log else None
    }
    
    # Get publishing pattern
    publishing_pattern = get_publishing_pattern(db, channel_id)

    # Fetch active insights count
    active_insight_count = db.query(AnalyticsInsight).filter(
        AnalyticsInsight.channel_id == channel_id,
        AnalyticsInsight.status == "active"
    ).count()
    
    # Structure versioned summary
    return {
        "channel": {
            "id": channel.id,
            "external_channel_id": channel.external_channel_id,
            "channel_name": channel.channel_name,
            "channel_handle": channel.channel_handle,
            "is_own": channel.is_own,
            "analytics_type": channel.analytics_type,
            "sync_status": channel.sync_status,
            "last_error": channel.last_error,
            "is_archived": channel.is_archived,
            "last_sync_duration_seconds": channel.last_sync_duration_seconds,
            "created_at": channel.created_at,
            "last_sync_at": channel.last_sync_at
        },
        "overview": overview,
        "publishing_pattern": publishing_pattern,
        "diagnostics": diagnostics,
        "insights": {
            "active_count": active_insight_count
        },
        "meta": {
            "collector_version": "Analytics Collector v1.0",
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
    }


@router.get("/channels/{channel_id}/timeline")
def get_channel_timeline_route(
    channel_id: str,
    range: str = "30",
    db: Session = Depends(get_db)
):
    channel = db.query(AnalyticsChannel).filter(AnalyticsChannel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Observed channel not found")
        
    return get_channel_timeline(db, channel_id, range)


@router.get("/compare")
def compare_channels(channel_ids: str, db: Session = Depends(get_db)):
    ids = [cid.strip() for cid in channel_ids.split(",") if cid.strip()]
    if len(ids) < 2 or len(ids) > 5:
        raise HTTPException(status_code=400, detail="Comparison limited to between 2 and 5 channels")
        
    return compare_channels_data(db, ids)

