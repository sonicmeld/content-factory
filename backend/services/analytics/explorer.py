import math
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from sqlalchemy import func
from sqlalchemy.orm import Session
from database.models import AnalyticsChannel, AnalyticsVideo, AnalyticsSnapshot, AnalyticsInsight

def get_channel_timeline(db: Session, channel_id: str, range_days: str = "30"):
    query = db.query(AnalyticsSnapshot).filter(
        AnalyticsSnapshot.target_id == channel_id,
        AnalyticsSnapshot.target_type == "channel"
    )
    
    if range_days != "all":
        try:
            days = int(range_days)
            cutoff = datetime.now(timezone.utc) - timedelta(days=days)
            query = query.filter(AnalyticsSnapshot.snapshot_date >= cutoff)
        except ValueError:
            pass
            
    snapshots = query.order_by(AnalyticsSnapshot.snapshot_date.asc()).all()
    
    timeline = []
    seen_dates = set()
    for s in snapshots:
        date_str = s.snapshot_date.strftime("%Y-%m-%d")
        if date_str not in seen_dates:
            seen_dates.add(date_str)
            timeline.append({
                "date": date_str,
                "views": s.views or 0,
                "subscribers": s.subscribers or 0,
                "watch_time": s.watch_time or 0.0,
                "impressions": s.impressions or 0,
                "ctr": s.ctr or 0.0
            })
            
    # Calculate Growth Velocity & absolute delta
    sub_delta = 0
    sub_growth_rate = 0.0
    view_delta = 0
    view_growth_rate = 0.0
    
    if len(timeline) >= 2:
        first = timeline[0]
        last = timeline[-1]
        
        sub_delta = last["subscribers"] - first["subscribers"]
        if first["subscribers"] > 0:
            sub_growth_rate = round((sub_delta / first["subscribers"]) * 100.0, 2)
            
        view_delta = last["views"] - first["views"]
        if first["views"] > 0:
            view_growth_rate = round((view_delta / first["views"]) * 100.0, 2)
            
    return {
        "timeline": timeline,
        "subscriber_delta": sub_delta,
        "subscriber_growth_rate": sub_growth_rate,
        "view_delta": view_delta,
        "view_growth_rate": view_growth_rate
    }

def get_publishing_pattern(db: Session, channel_id: str):
    videos = db.query(AnalyticsVideo).filter(
        AnalyticsVideo.analytics_channel_id == channel_id
    ).order_by(AnalyticsVideo.published_at.desc()).all()
    
    if not videos:
        return {
            "upload_frequency": "Unknown",
            "average_interval_days": 0.0,
            "interval_stddev": 0.0,
            "most_active_day": "Unknown",
            "most_active_hour": 0,
            "consistency_score": 0,
            "posting_habit": "Irregular"
        }
        
    intervals = []
    for i in range(len(videos) - 1):
        diff = videos[i].published_at - videos[i+1].published_at
        intervals.append(diff.total_seconds() / 86400.0)
        
    avg_interval = sum(intervals) / len(intervals) if intervals else 0.0
    
    # Standard deviation & Coefficient of variation
    stddev = 0.0
    cv = 0.0
    if len(intervals) >= 2:
        variance = sum((x - avg_interval) ** 2 for x in intervals) / len(intervals)
        stddev = math.sqrt(variance)
        if avg_interval > 0:
            cv = stddev / avg_interval
            
    # Consistency Score (0-100)
    consistency_score = max(0, min(100, int((1.0 - min(cv, 2.0) / 2.0) * 100)))
    
    # Active day and hour
    day_counts = {}
    hour_counts = {}
    days_map = {0: "Monday", 1: "Tuesday", 2: "Wednesday", 3: "Thursday", 4: "Friday", 5: "Saturday", 6: "Sunday"}
    
    for v in videos:
        weekday = v.published_at.weekday()
        day_name = days_map.get(weekday, "Unknown")
        day_counts[day_name] = day_counts.get(day_name, 0) + 1
        
        hour = v.published_at.hour
        hour_counts[hour] = hour_counts.get(hour, 0) + 1
        
    most_active_day = max(day_counts, key=day_counts.get) if day_counts else "Unknown"
    most_active_hour = max(hour_counts, key=hour_counts.get) if hour_counts else 0
    
    # Posting Habit Label
    weekend_days = sum(1 for v in videos if v.published_at.weekday() in (4, 5, 6))
    weekend_ratio = weekend_days / len(videos) if videos else 0.0
    
    if avg_interval == 0.0:
        posting_habit = "Single Upload"
        upload_frequency = "Single Upload"
    elif avg_interval <= 1.5:
        posting_habit = "Daily"
        upload_frequency = "Daily"
    elif weekend_ratio >= 0.6:
        posting_habit = "Weekend Heavy"
        upload_frequency = "Weekend-targeted"
    elif cv > 1.2 and avg_interval <= 7.0:
        posting_habit = "Burst Uploader"
        upload_frequency = "Irregular bursts"
    elif 5.0 <= avg_interval <= 9.0:
        posting_habit = "Weekly"
        upload_frequency = "Weekly"
    elif avg_interval <= 35.0:
        posting_habit = "Monthly"
        upload_frequency = "Monthly"
    else:
        posting_habit = "Irregular"
        upload_frequency = "Irregular"
        
    return {
        "upload_frequency": upload_frequency,
        "average_interval_days": round(avg_interval, 2),
        "interval_stddev": round(stddev, 2),
        "most_active_day": most_active_day,
        "most_active_hour": most_active_hour,
        "consistency_score": consistency_score,
        "posting_habit": posting_habit
    }

def compare_channels_data(db: Session, channel_ids: List[str]):
    channels_meta = []
    ch_snapshots_map = {}
    
    for ch_id in channel_ids:
        channel = db.query(AnalyticsChannel).filter(AnalyticsChannel.id == ch_id).first()
        if not channel:
            continue
            
        video_count = db.query(AnalyticsVideo).filter(AnalyticsVideo.analytics_channel_id == ch_id).count()
        
        # Latest subscribers/views
        snapshot = db.query(AnalyticsSnapshot).filter(
            AnalyticsSnapshot.target_id == ch_id,
            AnalyticsSnapshot.target_type == "channel"
        ).order_by(AnalyticsSnapshot.snapshot_date.desc()).first()
        
        subscribers = snapshot.subscribers if snapshot else 0
        views = snapshot.views if snapshot else 0
        
        # Query active insights count
        active_insights_count = db.query(AnalyticsInsight).filter(
            AnalyticsInsight.channel_id == ch_id,
            AnalyticsInsight.status == "active"
        ).count()

        channels_meta.append({
            "id": ch_id,
            "channel_name": channel.channel_name,
            "channel_handle": channel.channel_handle,
            "analytics_type": channel.analytics_type,
            "subscribers": subscribers,
            "views": views,
            "video_count": video_count,
            "active_insights_count": active_insights_count
        })
        
        # Load snapshots for timeline alignment
        snapshots = db.query(AnalyticsSnapshot).filter(
            AnalyticsSnapshot.target_id == ch_id,
            AnalyticsSnapshot.target_type == "channel"
        ).order_by(AnalyticsSnapshot.snapshot_date.asc()).all()
        
        ch_snapshots_map[ch_id] = {}
        for s in snapshots:
            d_str = s.snapshot_date.strftime("%Y-%m-%d")
            ch_snapshots_map[ch_id][d_str] = s
            
    # Align date timeline across all selected channels (last 30 unique dates)
    all_dates = set()
    for ch_id in ch_snapshots_map:
        all_dates.update(ch_snapshots_map[ch_id].keys())
        
    sorted_dates = sorted(list(all_dates))[-30:]
    
    subscribers_timeline = []
    views_timeline = []
    for d in sorted_dates:
        sub_row = {"date": d}
        view_row = {"date": d}
        for ch_id in ch_snapshots_map:
            snap = ch_snapshots_map[ch_id].get(d)
            sub_row[ch_id] = snap.subscribers if snap else None
            view_row[ch_id] = snap.views if snap else None
        subscribers_timeline.append(sub_row)
        views_timeline.append(view_row)
        
    return {
        "subscribers_timeline": subscribers_timeline,
        "views_timeline": views_timeline,
        "channels": channels_meta
    }
