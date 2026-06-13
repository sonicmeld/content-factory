# Roadmap — Analytics Sprint C: Insight Engine

Sprint C focuses on moving from data visualization to data interpretation by introducing the **Insight Engine** to analyze raw database snapshots and output recommendations.

## 1. Summary Endpoint Integration
The `GET /api/analytics/channels/{id}/summary` endpoint will be expanded to return insights without modifying the current JSON response structure:
```json
{
  "channel": {},
  "overview": {},
  "publishing_pattern": {},
  "diagnostics": {},
  "insights": {
    "recommendations": [
      {
        "id": "ins-101",
        "title": "Posting Frequency Alert",
        "summary": "We recommend uploading on Fridays at 15:00 based on competitor activity.",
        "confidence_score": 0.85
      }
    ]
  },
  "meta": {}
}
```

## 2. AnalyticsInsight Table Utilization
*   Persist structured waisan outputs into the `analytics_insights` database table.
*   Implement expiration lifecycles for waisan recommendations (e.g. insights expire after 7 days to keep suggestions relevant).

## 3. Rule-Based Recommendations
*   **Viewer Retention**: Identifies drop-offs in watch time and triggers script adjustments.
*   **Competitor Upload Density**: Alerts when competitors publish on similar topics.
*   **Optimal Posting Slots**: Matches local upload intervals with active audience engagement metrics.
