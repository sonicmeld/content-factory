# Roadmap — Analytics Sprint D: Market Intelligence & Growth Forecasting

Sprint D introduces predictive analytics, keyword search trends, and growth forecasting vectors.

## 1. Summary Endpoint Integration
The `GET /api/analytics/channels/{id}/summary` endpoint will incorporate predictive and intelligence fields:
```json
{
  "channel": {},
  "overview": {},
  "publishing_pattern": {},
  "diagnostics": {},
  "insights": {},
  "market_intelligence": {
    "forecasting": {
      "predicted_subscribers_30d": 15000,
      "growth_trend": "positive"
    },
    "trending_keywords": ["keyword-1", "keyword-2"]
  },
  "meta": {}
}
```

## 2. Growth Forecasting
*   Utilize historical daily metrics from `analytics_snapshots` to project growth trajectories for subscribers and views over 30-day, 60-day, and 90-day periods.
*   The aligned, normalized comparative timelines implemented in Sprint B will serve as baseline datasets for linear regression calculations.

## 3. Google Trends Integrations
*   Query search term interest values and related topics using the `google_trends_snapshots` registry.
*   Cross-reference keyword trends with observed video titles to calculate niche saturation indices.
