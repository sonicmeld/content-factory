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
    AnalyticsSyncLog,
    AnalyticsTopic,
    AnalyticsKeyword,
    AnalyticsMarketTrend,
    AnalyticsOpportunityExport,
    AnalyticsContextExport,
    AnalyticsGeneratedDraft,
    YoutubeAccount
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
    InsightStatusUpdateRequest,
    MarketTopicResponse,
    MarketKeywordResponse,
    MarketTrendResponse,
    MarketOpportunityResponse,
    MarketForecastResponse,
    OpportunityExportResponse,
    OpportunityExportRequest,
    ExportContextRequest,
    AnalyticsContextExportResponse,
    AIContextPayloadResponse,
    EnrichContextRequest,
    EnrichedContextPayloadResponse,
    EnrichmentHistoryResponse,
    GenerateDraftRequest,
    AnalyticsDraftResponse,
    DraftStatusUpdateRequest,
    BulkActionRequest,
    PipelineStatsResponse,
    ActivityTimelineItem
)
from database.models import AnalyticsEnrichedContext
from services.analytics.collector import sync_channel, get_any_youtube_client
from services.analytics.analytics_context_builder import (
    export_topic_context,
    export_opportunity_context,
    export_insight_context,
    create_ai_context
)
from services.analytics.context_enrichment import enrich_context
from services.analytics.draft_generation import generate_draft


from services.analytics.explorer import (
    get_channel_timeline,
    get_publishing_pattern,
    compare_channels_data
)
from services.analytics.market_collector import collect_market_trends
from services.analytics.topic_radar import cluster_and_save_trends
from services.analytics.competitor_topic_analysis import analyze_competitor_coverage
from services.analytics.forecast_engine import calculate_forecasts
from services.analytics.opportunity_engine import calculate_opportunity_scores

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
    from sqlalchemy import or_
    
    query = db.query(AnalyticsChannel).outerjoin(
        AnalyticsChannelIdentity, AnalyticsChannel.id == AnalyticsChannelIdentity.analytics_channel_id
    ).outerjoin(
        YoutubeAccount, AnalyticsChannelIdentity.identity_reference_id == YoutubeAccount.id
    ).filter(
        AnalyticsChannel.is_archived == False,
        or_(
            YoutubeAccount.id == None,
            YoutubeAccount.analytics_enabled == True
        )
    )
    
    if channel_id:
        links = db.query(AnalyticsWorkspaceLink).filter(AnalyticsWorkspaceLink.channel_id == channel_id).all()
        channel_ids = [link.analytics_channel_id for link in links]
        channels = query.filter(AnalyticsChannel.id.in_(channel_ids)).all()
    else:
        channels = query.all()
        
    result = []
    for ch in channels:
        ch_dict = ch.__dict__.copy()
        # Fetch latest snapshot to get subscribers
        latest_snapshot = db.query(AnalyticsSnapshot).filter(
            AnalyticsSnapshot.target_id == ch.id,
            AnalyticsSnapshot.target_type == "channel"
        ).order_by(AnalyticsSnapshot.snapshot_date.desc()).first()
        
        ch_dict["subscribers"] = latest_snapshot.subscribers if latest_snapshot else None
        result.append(ch_dict)
        
    return result

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


# --- Sprint D: Market Intelligence Endpoints ---

@router.get("/market/trends", response_model=List[MarketTrendResponse])
def get_market_trends(db: Session = Depends(get_db)):
    """
    Fetch all collected market trends, ordered by collected_at descending.
    """
    results = db.query(
        AnalyticsMarketTrend,
        AnalyticsKeyword.keyword
    ).outerjoin(
        AnalyticsKeyword, AnalyticsMarketTrend.keyword_id == AnalyticsKeyword.id
    ).order_by(AnalyticsMarketTrend.collected_at.desc()).all()
    
    trends = []
    for trend, keyword in results:
        trend_dict = {
            "id": trend.id,
            "keyword_id": trend.keyword_id,
            "topic_id": trend.topic_id,
            "source": trend.source,
            "trend_score": trend.trend_score,
            "growth_rate": trend.growth_rate,
            "region": trend.region,
            "collected_at": trend.collected_at,
            "keyword": keyword or "Unknown"
        }
        trends.append(trend_dict)
    return trends


@router.get("/market/topics", response_model=List[MarketTopicResponse])
def get_market_topics(
    page: int = 1,
    search: Optional[str] = None,
    sort: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Fetch all clustered topics, supporting pagination, keyword search, and sorting.
    """
    limit = 20
    offset = (page - 1) * limit
    
    query = db.query(AnalyticsTopic).filter(AnalyticsTopic.status != "archived")
    
    if search:
        query = query.filter(AnalyticsTopic.topic_name.like(f"%{search}%"))
        
    if sort:
        # e.g., "opportunity_score", "trend_score", "demand_score", "competition_score"
        if sort == "opportunity_score":
            query = query.order_by(AnalyticsTopic.opportunity_score.desc())
        elif sort == "trend_score":
            query = query.order_by(AnalyticsTopic.trend_score.desc())
        elif sort == "demand_score":
            query = query.order_by(AnalyticsTopic.demand_score.desc())
        elif sort == "competition_score":
            query = query.order_by(AnalyticsTopic.competition_score.desc())
        else:
            query = query.order_by(AnalyticsTopic.topic_name.asc())
    else:
        query = query.order_by(AnalyticsTopic.opportunity_score.desc())
        
    return query.offset(offset).limit(limit).all()


@router.get("/market/topics/{id}", response_model=MarketTopicResponse)
def get_market_topic_detail(id: str, db: Session = Depends(get_db)):
    """
    Fetch details of a single topic.
    """
    topic = db.query(AnalyticsTopic).filter(AnalyticsTopic.id == id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    return topic


@router.get("/market/topics/{id}/opportunities")
def get_market_topic_opportunities(id: str, db: Session = Depends(get_db)):
    """
    Fetch opportunities history and forecast values for a single topic.
    """
    topic = db.query(AnalyticsTopic).filter(AnalyticsTopic.id == id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
        
    # Get forecasts
    forecasts = calculate_forecasts(db, id)
    
    # Get exports
    exports = db.query(AnalyticsOpportunityExport).filter(
        AnalyticsOpportunityExport.topic_id == id
    ).order_by(AnalyticsOpportunityExport.exported_at.desc()).all()
    
    return {
        "topic_id": topic.id,
        "topic_name": topic.topic_name,
        "opportunity_score": topic.opportunity_score,
        "demand_score": topic.demand_score,
        "competition_score": topic.competition_score,
        "forecast_score": topic.forecast_score,
        "status": topic.status,
        "forecast_history": {
            "forecast_7": forecasts["forecast_7"],
            "forecast_30": forecasts["forecast_30"],
            "forecast_90": forecasts["forecast_90"]
        },
        "exports": [
            {
                "id": e.id,
                "market_score": e.market_score,
                "competition_score": e.competition_score,
                "forecast_score": e.forecast_score,
                "opportunity_score": e.opportunity_score,
                "exported_at": e.exported_at
            } for e in exports
        ]
    }


@router.get("/market/keywords", response_model=List[MarketKeywordResponse])
def get_market_keywords(topic_id: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Fetch all keywords, optionally filtered by topic_id.
    """
    query = db.query(AnalyticsKeyword)
    if topic_id:
        query = query.filter(AnalyticsKeyword.topic_id == topic_id)
    return query.order_by(AnalyticsKeyword.trend_score.desc()).all()


@router.get("/market/opportunities", response_model=List[MarketOpportunityResponse])
def get_market_opportunities(db: Session = Depends(get_db)):
    """
    Fetch active/emerging opportunities ordered by opportunity_score descending.
    """
    return db.query(AnalyticsTopic).filter(
        AnalyticsTopic.status.in_(["active", "emerging"])
    ).order_by(AnalyticsTopic.opportunity_score.desc()).all()


@router.get("/market/forecast", response_model=List[MarketForecastResponse])
def get_market_forecasts_list(db: Session = Depends(get_db)):
    """
    Calculate and fetch forecasts for all active topics.
    """
    topics = db.query(AnalyticsTopic).filter(AnalyticsTopic.status != "archived").all()
    results = []
    for t in topics:
        f = calculate_forecasts(db, t.id)
        results.append(MarketForecastResponse(
            topic_id=t.id,
            topic_name=t.topic_name,
            forecast_7=f["forecast_7"],
            forecast_30=f["forecast_30"],
            forecast_90=f["forecast_90"],
            forecast_score=f["forecast_score"]
        ))
    return results


@router.post("/market/refresh")
def refresh_market_intelligence(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Manually triggers the market collection and calculation pipeline.
    Runs synchronously to ensure database state is updated immediately for client responsiveness.
    """
    start_time = time.time()
    
    from database.models import YoutubeAccount
    # Ambil semua channel yang analytics_enabled = True sebagai sumber niche/keyword
    active_accounts = db.query(YoutubeAccount).filter(YoutubeAccount.analytics_enabled == True).all()
    seed_keywords = []
    for account in active_accounts:
        if account.youtube_channel_title:
            # Bersihkan judul (misal: hapus suffix atau ambil kata utama)
            clean_title = account.youtube_channel_title.split("(@")[0].strip()
            seed_keywords.append(clean_title)

    # 1. Collect trends and suggestions (fallback ke BOOTSTRAP_KEYWORDS jika tidak ada seed)
    trends = collect_market_trends(db, seed_keywords if seed_keywords else None)
    
    # 2. Cluster keywords and save/update database
    cluster_and_save_trends(db, trends)
    
    # 3. Analyze competitor coverage
    analyze_competitor_coverage(db)
    
    # 4. Calculate opportunity scores and forecasts
    calculate_opportunity_scores(db)
    
    duration_ms = int((time.time() - start_time) * 1000)
    
    topics_count = db.query(AnalyticsTopic).filter(AnalyticsTopic.status != "archived").count()
    keywords_count = db.query(AnalyticsKeyword).count()
    
    return {
        "status": "success",
        "topics_analyzed": topics_count,
        "keywords_collected": keywords_count,
        "duration_ms": duration_ms
    }


@router.post("/market/exports", response_model=OpportunityExportResponse)
def export_opportunity_topic(req: OpportunityExportRequest, db: Session = Depends(get_db)):
    """
    Exports a Topic Opportunity and stores a history snapshot in database.
    """
    topic = db.query(AnalyticsTopic).filter(AnalyticsTopic.id == req.topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
        
    export_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    export = AnalyticsOpportunityExport(
        id=export_id,
        topic_id=topic.id,
        market_score=topic.demand_score,
        competition_score=topic.competition_score,
        forecast_score=topic.forecast_score,
        opportunity_score=topic.opportunity_score,
        exported_at=now
    )
    db.add(export)
    db.commit()
    db.refresh(export)
    
    return export


from pydantic import BaseModel

class UpdateContextStatusRequest(BaseModel):
    status: str


@router.post("/context/topic")
def api_export_topic_context(req: ExportContextRequest, db: Session = Depends(get_db)):
    return export_topic_context(db, req.id, workspace_id=req.workspace_id)


@router.post("/context/opportunity")
def api_export_opportunity_context(req: ExportContextRequest, db: Session = Depends(get_db)):
    return export_opportunity_context(db, req.id, workspace_id=req.workspace_id)


@router.post("/context/insight")
def api_export_insight_context(req: ExportContextRequest, db: Session = Depends(get_db)):
    return export_insight_context(db, req.id, workspace_id=req.workspace_id)


@router.get("/context/recent", response_model=List[AnalyticsContextExportResponse])
def api_list_recent_contexts(
    status: Optional[str] = None,
    workspace_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(AnalyticsContextExport)
    if status:
        query = query.filter(AnalyticsContextExport.status == status)
    else:
        query = query.filter(AnalyticsContextExport.status != "archived")
    if workspace_id:
        query = query.filter(AnalyticsContextExport.workspace_id == workspace_id)
        
    exports = query.order_by(AnalyticsContextExport.exported_at.desc()).limit(20).all()
    
    enriched_results = []
    for e in exports:
        topic_name = "Unknown"
        opp_score = 0.0
        forecast_score = 0.0
        severity = None
        insight_type = None
        
        if e.source_type in ("topic", "opportunity"):
            t = db.query(AnalyticsTopic).filter(AnalyticsTopic.id == e.source_reference_id).first()
            if t:
                topic_name = t.topic_name
                opp_score = t.opportunity_score
                forecast_score = t.forecast_score
        elif e.source_type == "insight":
            ins = db.query(AnalyticsInsight).filter(AnalyticsInsight.id == e.source_reference_id).first()
            if ins:
                topic_name = ins.title
                severity = ins.severity
                insight_type = ins.insight_type
                opp_score = float(ins.score)
                
        res = {
            "id": e.id,
            "source_type": e.source_type,
            "source_reference_id": e.source_reference_id,
            "context_type": e.context_type,
            "context_version": e.context_version,
            "status": e.status,
            "workspace_id": e.workspace_id,
            "exported_at": e.exported_at,
            "topic_name": topic_name,
            "opportunity_score": opp_score,
            "forecast_score": forecast_score,
            "severity": severity,
            "insight_type": insight_type
        }
        enriched_results.append(res)
        
    return enriched_results


@router.post("/context/enrich", response_model=EnrichedContextPayloadResponse)
def api_enrich_context(req: EnrichContextRequest, db: Session = Depends(get_db)):
    """
    Triggers the context enrichment process.
    """
    return enrich_context(db, req.export_id)


@router.get("/context/enriched", response_model=List[EnrichmentHistoryResponse])
def api_list_enriched_contexts(
    workspace_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Retrieves the history of all enriched contexts, filterable by status and workspace.
    """
    query = db.query(AnalyticsEnrichedContext)
    if status:
        query = query.filter(AnalyticsEnrichedContext.status == status)
    else:
        query = query.filter(AnalyticsEnrichedContext.status != "archived")
    if workspace_id:
        query = query.filter(AnalyticsEnrichedContext.workspace_id == workspace_id)
        
    return query.order_by(AnalyticsEnrichedContext.generated_at.desc()).all()


@router.get("/context-pipeline/inbox", response_model=List[AnalyticsContextExportResponse])
def get_pipeline_inbox(
    workspace_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(AnalyticsContextExport)
    if status:
        query = query.filter(AnalyticsContextExport.status == status)
    else:
        query = query.filter(AnalyticsContextExport.status != "archived")
    if workspace_id:
        query = query.filter(AnalyticsContextExport.workspace_id == workspace_id)
        
    exports = query.order_by(AnalyticsContextExport.exported_at.desc()).all()
    
    enriched_results = []
    for e in exports:
        topic_name = "Unknown"
        opp_score = 0.0
        forecast_score = 0.0
        severity = None
        insight_type = None
        
        if e.source_type in ("topic", "opportunity"):
            t = db.query(AnalyticsTopic).filter(AnalyticsTopic.id == e.source_reference_id).first()
            if t:
                topic_name = t.topic_name
                opp_score = t.opportunity_score
                forecast_score = t.forecast_score
        elif e.source_type == "insight":
            ins = db.query(AnalyticsInsight).filter(AnalyticsInsight.id == e.source_reference_id).first()
            if ins:
                topic_name = ins.title
                severity = ins.severity
                insight_type = ins.insight_type
                opp_score = float(ins.score)
                
        res = {
            "id": e.id,
            "source_type": e.source_type,
            "source_reference_id": e.source_reference_id,
            "context_type": e.context_type,
            "context_version": e.context_version,
            "status": e.status,
            "workspace_id": e.workspace_id,
            "exported_at": e.exported_at,
            "topic_name": topic_name,
            "opportunity_score": opp_score,
            "forecast_score": forecast_score,
            "severity": severity,
            "insight_type": insight_type
        }
        enriched_results.append(res)
    return enriched_results


@router.get("/context-pipeline/enriched", response_model=List[EnrichmentHistoryResponse])
def get_pipeline_enriched(
    workspace_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(AnalyticsEnrichedContext)
    if status:
        query = query.filter(AnalyticsEnrichedContext.status == status)
    else:
        query = query.filter(AnalyticsEnrichedContext.status != "deleted")
    if workspace_id:
        query = query.filter(AnalyticsEnrichedContext.workspace_id == workspace_id)
    return query.order_by(AnalyticsEnrichedContext.generated_at.desc()).all()


@router.get("/context-pipeline/enriched/{id}", response_model=EnrichedContextPayloadResponse)
def get_pipeline_enriched_detail(id: str, db: Session = Depends(get_db)):
    enriched = db.query(AnalyticsEnrichedContext).filter(AnalyticsEnrichedContext.id == id).first()
    if not enriched:
        raise HTTPException(status_code=404, detail="Enriched context record not found")
    import json
    return json.loads(enriched.payload_json)


@router.post("/context-pipeline/drafts/generate", response_model=AnalyticsDraftResponse)
def api_generate_draft(req: GenerateDraftRequest, db: Session = Depends(get_db)):
    return generate_draft(db, req.enriched_context_id)


@router.get("/context-pipeline/drafts", response_model=List[AnalyticsDraftResponse])
def get_pipeline_drafts(
    workspace_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(AnalyticsGeneratedDraft)
    if status:
        query = query.filter(AnalyticsGeneratedDraft.status == status)
    else:
        query = query.filter(AnalyticsGeneratedDraft.status != "deleted")
    if workspace_id:
        query = query.filter(AnalyticsGeneratedDraft.workspace_id == workspace_id)
    return query.order_by(AnalyticsGeneratedDraft.created_at.desc()).all()


@router.get("/context-pipeline/drafts/{id}", response_model=AnalyticsDraftResponse)
def get_pipeline_draft_detail(id: str, db: Session = Depends(get_db)):
    draft = db.query(AnalyticsGeneratedDraft).filter(AnalyticsGeneratedDraft.id == id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft record not found")
    return draft


@router.patch("/context-pipeline/drafts/{id}/status", response_model=AnalyticsDraftResponse)
def update_pipeline_draft_status(id: str, req: DraftStatusUpdateRequest, db: Session = Depends(get_db)):
    draft = db.query(AnalyticsGeneratedDraft).filter(AnalyticsGeneratedDraft.id == id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft record not found")
        
    current = draft.status
    target = req.status
    allowed = False
    
    # Valid transitions: draft ➔ reviewed ➔ approved ➔ loaded_to_prompt ➔ archived
    if current == "draft" and target in ("reviewed", "archived"):
        allowed = True
    elif current == "reviewed" and target in ("approved", "archived"):
        allowed = True
    elif current == "approved" and target in ("loaded_to_prompt", "archived"):
        allowed = True
    elif current == "loaded_to_prompt" and target == "archived":
        allowed = True
    elif target == current:
        allowed = True
        
    if not allowed:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid draft transition from '{current}' to '{target}'. Sequential flow is required."
        )
        
    draft.status = target
    draft.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(draft)
    return draft


@router.post("/context-pipeline/bulk/archive")
def bulk_archive(req: BulkActionRequest, db: Session = Depends(get_db)):
    if req.stage == "inbox":
        db.query(AnalyticsContextExport).filter(AnalyticsContextExport.id.in_(req.ids)).update({"status": "archived"}, synchronize_session=False)
    elif req.stage == "enriched":
        db.query(AnalyticsEnrichedContext).filter(AnalyticsEnrichedContext.id.in_(req.ids)).update({"status": "archived"}, synchronize_session=False)
    elif req.stage == "drafts":
        db.query(AnalyticsGeneratedDraft).filter(AnalyticsGeneratedDraft.id.in_(req.ids)).update({"status": "archived"}, synchronize_session=False)
    db.commit()
    return {"message": f"Bulk archived {len(req.ids)} items"}


@router.post("/context-pipeline/bulk/delete")
def bulk_delete(req: BulkActionRequest, db: Session = Depends(get_db)):
    if req.stage == "inbox":
        # Physical delete for inbox/exports as per architecture revision 1
        db.query(AnalyticsContextExport).filter(AnalyticsContextExport.id.in_(req.ids)).delete(synchronize_session=False)
    elif req.stage == "enriched":
        db.query(AnalyticsEnrichedContext).filter(AnalyticsEnrichedContext.id.in_(req.ids)).update({"status": "deleted"}, synchronize_session=False)
    elif req.stage == "drafts":
        db.query(AnalyticsGeneratedDraft).filter(AnalyticsGeneratedDraft.id.in_(req.ids)).update({"status": "deleted"}, synchronize_session=False)
    db.commit()
    return {"message": f"Bulk deleted {len(req.ids)} items"}


@router.post("/context-pipeline/bulk/purge")
def bulk_purge(req: BulkActionRequest, db: Session = Depends(get_db)):
    if req.stage == "inbox":
        db.query(AnalyticsContextExport).filter(AnalyticsContextExport.id.in_(req.ids)).delete(synchronize_session=False)
    elif req.stage == "enriched":
        db.query(AnalyticsEnrichedContext).filter(AnalyticsEnrichedContext.id.in_(req.ids)).delete(synchronize_session=False)
    elif req.stage == "drafts":
        db.query(AnalyticsGeneratedDraft).filter(AnalyticsGeneratedDraft.id.in_(req.ids)).delete(synchronize_session=False)
    db.commit()
    return {"message": f"Bulk purged {len(req.ids)} items"}


@router.post("/context-pipeline/drafts/purge-old")
def purge_old_drafts(db: Session = Depends(get_db)):
    cutoff = datetime.utcnow() - timedelta(days=30)
    deleted_count = db.query(AnalyticsGeneratedDraft).filter(AnalyticsGeneratedDraft.created_at < cutoff).delete(synchronize_session=False)
    db.commit()
    return {"message": f"Purged {deleted_count} drafts older than 30 days"}


@router.post("/context-pipeline/drafts/purge-archived")
def purge_archived_drafts(db: Session = Depends(get_db)):
    deleted_count = db.query(AnalyticsGeneratedDraft).filter(AnalyticsGeneratedDraft.status.in_(["archived", "deleted"])).delete(synchronize_session=False)
    db.commit()
    return {"message": f"Purged {deleted_count} archived/deleted drafts"}


@router.get("/context-pipeline/stats")
def get_pipeline_stats(workspace_id: Optional[str] = None, db: Session = Depends(get_db)):
    exp_query = db.query(AnalyticsContextExport)
    enr_query = db.query(AnalyticsEnrichedContext)
    dr_query = db.query(AnalyticsGeneratedDraft)
    
    if workspace_id:
        exp_query = exp_query.filter(AnalyticsContextExport.workspace_id == workspace_id)
        enr_query = enr_query.filter(AnalyticsEnrichedContext.workspace_id == workspace_id)
        dr_query = dr_query.filter(AnalyticsGeneratedDraft.workspace_id == workspace_id)
        
    total_contexts = exp_query.filter(AnalyticsContextExport.status != "archived").count()
    new_contexts = exp_query.filter(AnalyticsContextExport.status == "new").count()
    
    total_enrichments = enr_query.filter(AnalyticsEnrichedContext.status != "deleted").count()
    ready_enrichments = enr_query.filter(AnalyticsEnrichedContext.status == "ready").count()
    failed_enrichments = enr_query.filter(AnalyticsEnrichedContext.status == "failed").count()
    
    total_drafts = dr_query.filter(AnalyticsGeneratedDraft.status != "deleted").count()
    draft_queue = dr_query.filter(AnalyticsGeneratedDraft.status == "draft").count()
    loaded_to_prompt_count = dr_query.filter(AnalyticsGeneratedDraft.status == "loaded_to_prompt").count()
    archived_items = dr_query.filter(AnalyticsGeneratedDraft.status == "archived").count()
    
    # Reconstruct Activity Timeline from db records
    timeline = []
    
    # 1. Context Exported
    exports = exp_query.order_by(AnalyticsContextExport.exported_at.desc()).limit(10).all()
    for e in exports:
        timeline.append({
            "id": f"export-{e.id}",
            "event_type": "Context Exported",
            "title": f"Context Exported: Source {e.source_type.capitalize()} (Ref: {e.source_reference_id[:8]})",
            "timestamp": e.exported_at
        })
        
    # 2. Context Enriched
    enrichments = enr_query.filter(AnalyticsEnrichedContext.status == "ready").order_by(AnalyticsEnrichedContext.generated_at.desc()).limit(10).all()
    for en in enrichments:
        timeline.append({
            "id": f"enrich-{en.id}",
            "event_type": "Context Enriched",
            "title": f"Context Enriched: {en.topic_name or 'Topic'}",
            "timestamp": en.generated_at
        })
        
    # 3. Drafts events
    drafts = dr_query.order_by(AnalyticsGeneratedDraft.created_at.desc()).limit(20).all()
    for d in drafts:
        if d.status == "draft":
            timeline.append({
                "id": f"draft-gen-{d.id}",
                "event_type": "Draft Generated",
                "title": f"Draft Generated: {d.title or 'Script'}",
                "timestamp": d.created_at
            })
        elif d.status == "reviewed":
            timeline.append({
                "id": f"draft-rev-{d.id}",
                "event_type": "Draft Reviewed",
                "title": f"Draft Reviewed: {d.title or 'Script'}",
                "timestamp": d.updated_at
            })
        elif d.status == "loaded_to_prompt":
            timeline.append({
                "id": f"draft-load-{d.id}",
                "event_type": "Loaded To Prompt Expert",
                "title": f"Loaded To Prompt Expert: {d.title or 'Script'}",
                "timestamp": d.updated_at
            })
        elif d.status == "archived":
            timeline.append({
                "id": f"draft-arc-{d.id}",
                "event_type": "Draft Archived",
                "title": f"Draft Archived: {d.title or 'Script'}",
                "timestamp": d.updated_at
            })
        elif d.status == "deleted":
            timeline.append({
                "id": f"draft-del-{d.id}",
                "event_type": "Draft Deleted",
                "title": f"Draft Deleted: {d.title or 'Script'}",
                "timestamp": d.updated_at
            })
            
    # Sort timeline descending by timestamp
    timeline.sort(key=lambda x: x["timestamp"], reverse=True)
    timeline = timeline[:15]
    
    return {
        "new_contexts": new_contexts,
        "ready_enrichments": ready_enrichments,
        "draft_queue": draft_queue,
        "archived_items": archived_items,
        "failed_enrichments": failed_enrichments,
        "loaded_to_prompt_count": loaded_to_prompt_count,
        "total_contexts": total_contexts,
        "total_enrichments": total_enrichments,
        "total_drafts": total_drafts,
        "timeline": timeline
    }


@router.get("/context/enriched/{id}", response_model=EnrichedContextPayloadResponse)
def api_get_enriched_context(id: str, db: Session = Depends(get_db)):
    """
    Retrieves a single pre-rendered enriched context payload.
    """
    enriched = db.query(AnalyticsEnrichedContext).filter(AnalyticsEnrichedContext.id == id).first()
    if not enriched:
        raise HTTPException(status_code=404, detail="Enriched context record not found")
    
    import json
    return json.loads(enriched.payload_json)


@router.get("/context/{id}", response_model=AIContextPayloadResponse)
def api_get_aggregated_context(id: str, db: Session = Depends(get_db)):

    export = db.query(AnalyticsContextExport).filter(AnalyticsContextExport.id == id).first()
    if not export:
        raise HTTPException(status_code=404, detail="Context export record not found")
    
    return create_ai_context(db, export.source_type, export.source_reference_id)


@router.patch("/context/{id}/status", response_model=AnalyticsContextExportResponse)
def api_update_context_status(id: str, req: UpdateContextStatusRequest, db: Session = Depends(get_db)):
    export = db.query(AnalyticsContextExport).filter(AnalyticsContextExport.id == id).first()
    if not export:
        raise HTTPException(status_code=404, detail="Context export record not found")
        
    if req.status not in ("new", "loaded", "archived"):
        raise HTTPException(status_code=400, detail="Invalid status. Must be 'new', 'loaded', or 'archived'")
        
    export.status = req.status
    db.commit()
    db.refresh(export)
    return export






