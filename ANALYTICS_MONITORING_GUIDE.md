## Analytics & Monitoring Implementation Guide

## Overview

This guide covers the comprehensive analytics and monitoring system for tracking AI tutor usage, rate limits, costs, and user engagement.

## Features Implemented

### 1. Analytics Tracking Service ✅
- User engagement metrics
- Rate limit monitoring
- API cost tracking
- Database performance metrics
- Feedback analysis

### 2. Admin API Endpoints ✅
- `/admin/analytics/dashboard` - Comprehensive dashboard
- `/admin/analytics/engagement` - User engagement metrics
- `/admin/analytics/rate-limits` - Rate limit metrics
- `/admin/analytics/costs` - Cost analysis
- `/admin/analytics/feedback` - Feedback analysis
- `/admin/analytics/database-performance` - DB performance

### 3. Database Indexes ✅
- Optimized queries for analytics
- TTL indexes for automatic cleanup
- Compound indexes for common queries

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Analytics Flow                            │
└─────────────────────────────────────────────────────────────┘

User Action (Chat, Hint, Feedback)
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Tutor Service / Rate Limit Service                         │
│  • Process request                                           │
│  • Track event via AnalyticsTrackingService                 │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  MongoDB Collections                                         │
│  • tutor_analytics_events (90 day TTL)                      │
│  • tutor_sessions                                            │
│  • tutor_feedback                                            │
│  • chat_messages (30 day TTL)                               │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Analytics Admin API                                         │
│  • Aggregate metrics                                         │
│  • Generate reports                                          │
│  • Provide insights                                          │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Admin Dashboard (Frontend)                                  │
│  • Visualize metrics                                         │
│  • Monitor trends                                            │
│  • Alert on issues                                           │
└─────────────────────────────────────────────────────────────┘
```

## Setup Instructions

### 1. Create Database Indexes

Run this during application startup or as a one-time migration:

```python
# In your main.py or startup script
from app.db_indexes import create_all_indexes
from app.db import get_database

@app.on_event("startup")
async def startup_event():
    db = get_database()
    await create_all_indexes(db)
```

Or run manually:

```python
python -c "
import asyncio
from app.db import get_database
from app.db_indexes import create_all_indexes

async def main():
    db = get_database()
    await create_all_indexes(db)

asyncio.run(main())
"
```

### 2. Register Analytics Router

Add to your `main.py`:

```python
from app.routers import analytics_admin

app.include_router(analytics_admin.router)
```

### 3. Integrate Tracking (Optional Enhancement)

The analytics service is ready to use. To integrate tracking into existing services:

```python
# In tutor_service.py
from .analytics_tracking_service import get_analytics_tracking_service

# After successful chat
analytics_service = get_analytics_tracking_service(self.db)
await analytics_service.track_tutor_usage(
    user_id=user_id,
    question_id=question_id,
    session_id=session_id,
    event_type="chat",
    metadata={
        "tutor_mode": tutor_mode,
        "tokens_used": tokens_used,
        "message_length": len(message)
    }
)

# Track API costs
await analytics_service.track_api_cost(
    user_id=user_id,
    session_id=session_id,
    tokens_used=tokens_used,
    estimated_cost=tokens_used * 0.00001,  # Adjust based on actual pricing
    is_byok=bool(user.get("byok_groq_key"))
)
```

## API Usage

### Get Comprehensive Dashboard

```bash
curl -X GET "http://localhost:8000/admin/analytics/dashboard?days=30" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

Response:
```json
{
  "period_days": 30,
  "generated_at": "2026-01-24T12:00:00Z",
  "engagement": {
    "active_users": 150,
    "total_sessions": 450,
    "total_chats": 1200,
    "total_hints": 300,
    "avg_messages_per_session": 2.67,
    "avg_hints_per_session": 0.67,
    "avg_time_per_session_seconds": 180,
    "feedback_distribution": {
      "positive": 85,
      "negative": 15
    }
  },
  "rate_limits": {
    "total_rate_limit_hits": 45,
    "users_hit_limits": 20,
    "total_active_users": 150,
    "percentage_hit_limits": 13.3,
    "limit_type_breakdown": {
      "tokens": 30,
      "requests": 15
    }
  },
  "costs": {
    "total_tokens": 500000,
    "total_cost_usd": 5.00,
    "server_tokens": 400000,
    "server_cost_usd": 4.00,
    "byok_tokens": 100000,
    "cost_savings_from_byok_usd": 1.00,
    "daily_breakdown": [...]
  },
  "feedback": {
    "total_feedback": 100,
    "rating_distribution": {
      "positive": 85,
      "negative": 15
    },
    "satisfaction_rate_percent": 85.0,
    "recent_negative_feedback": [...]
  },
  "database_performance": {
    "collection_stats": {...},
    "index_stats": {...}
  }
}
```

### Get Engagement Metrics Only

```bash
curl -X GET "http://localhost:8000/admin/analytics/engagement?days=7" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Get Rate Limit Metrics

```bash
curl -X GET "http://localhost:8000/admin/analytics/rate-limits?days=30" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Get Cost Metrics

```bash
curl -X GET "http://localhost:8000/admin/analytics/costs?days=30" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Get Feedback Analysis

```bash
curl -X GET "http://localhost:8000/admin/analytics/feedback?days=30" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Get Database Performance

```bash
curl -X GET "http://localhost:8000/admin/analytics/database-performance" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

## Metrics Explained

### 1. User Engagement Metrics

**Active Users**: Unique users who used AI tutor in the period
- **Good**: Growing steadily
- **Warning**: Declining trend
- **Action**: Investigate user experience issues

**Total Sessions**: Number of tutor sessions started
- **Good**: High session count relative to active users
- **Warning**: Low sessions per user
- **Action**: Improve feature discoverability

**Avg Messages Per Session**: Average chat messages per session
- **Good**: 3-5 messages (engaged conversation)
- **Warning**: <2 messages (users giving up quickly)
- **Action**: Improve AI response quality

**Avg Hints Per Session**: Average hints unlocked per session
- **Good**: 1-2 hints (users getting help when needed)
- **Warning**: >3 hints (users struggling too much)
- **Action**: Review hint quality and progression

### 2. Rate Limit Metrics

**Percentage Hit Limits**: % of users hitting rate limits
- **Good**: <10%
- **Warning**: 10-20%
- **Critical**: >20%
- **Action**: Consider increasing limits or promoting BYOK

**Limit Type Breakdown**: Which limits are hit most
- **Tokens**: Users having long conversations
- **Requests**: Users making many quick requests
- **Action**: Adjust limits based on usage patterns

### 3. Cost Metrics

**Total Cost**: Server API costs
- **Monitor**: Track against budget
- **Optimize**: Encourage BYOK for heavy users

**Cost Savings from BYOK**: Estimated savings
- **Good**: Growing over time
- **Action**: Promote BYOK to reduce costs

**Daily Breakdown**: Cost trends over time
- **Monitor**: Spikes or unusual patterns
- **Action**: Investigate high-cost days

### 4. Feedback Analysis

**Satisfaction Rate**: % of positive feedback
- **Good**: >80%
- **Warning**: 70-80%
- **Critical**: <70%
- **Action**: Review negative feedback and improve

**Recent Negative Feedback**: Latest complaints
- **Monitor**: Common themes or issues
- **Action**: Address recurring problems

### 5. Database Performance

**Collection Sizes**: Storage usage
- **Monitor**: Growth rate
- **Action**: Ensure TTL indexes are working

**Index Usage**: Query optimization
- **Monitor**: Unused indexes (waste of space)
- **Action**: Remove unused indexes, add missing ones

## Monitoring Best Practices

### Daily Checks
- [ ] Check satisfaction rate (should be >80%)
- [ ] Review rate limit hit percentage (should be <10%)
- [ ] Monitor API costs (should be within budget)
- [ ] Check for error spikes in logs

### Weekly Reviews
- [ ] Analyze engagement trends
- [ ] Review negative feedback themes
- [ ] Check database growth rate
- [ ] Verify index performance

### Monthly Analysis
- [ ] Generate comprehensive dashboard
- [ ] Compare month-over-month metrics
- [ ] Identify optimization opportunities
- [ ] Plan feature improvements

## Alerting Recommendations

### Critical Alerts (Immediate Action)
- Satisfaction rate drops below 70%
- >25% of users hitting rate limits
- API costs exceed budget by 50%
- Database size growing >10GB/day

### Warning Alerts (Review Within 24h)
- Satisfaction rate drops below 80%
- >15% of users hitting rate limits
- API costs exceed budget by 25%
- Engagement drops >20% week-over-week

### Info Alerts (Review Weekly)
- New negative feedback received
- Unusual usage patterns detected
- Database indexes not being used

## Dashboard Visualization Ideas

### Engagement Dashboard
- Line chart: Active users over time
- Bar chart: Sessions per day
- Pie chart: Feedback distribution
- Gauge: Satisfaction rate

### Cost Dashboard
- Line chart: Daily costs
- Stacked area: Server vs BYOK costs
- Number: Total cost this month
- Number: Cost savings from BYOK

### Rate Limit Dashboard
- Line chart: Rate limit hits over time
- Bar chart: Limit type breakdown
- Gauge: % users hitting limits
- Number: Users affected today

### Performance Dashboard
- Table: Collection sizes
- Bar chart: Index usage
- Number: Total documents
- Number: Storage used

## Integration with External Tools

### Grafana
Export metrics to Prometheus format:
```python
# Create a /metrics endpoint
from prometheus_client import Counter, Histogram, Gauge

tutor_sessions_total = Counter('tutor_sessions_total', 'Total tutor sessions')
tutor_cost_usd = Gauge('tutor_cost_usd', 'API costs in USD')
rate_limit_hits = Counter('rate_limit_hits_total', 'Rate limit hits')
```

### DataDog
Send metrics via StatsD:
```python
from datadog import statsd

statsd.increment('tutor.sessions')
statsd.gauge('tutor.cost', cost_usd)
statsd.histogram('tutor.session_length', duration_seconds)
```

### Sentry
Track errors and performance:
```python
import sentry_sdk

sentry_sdk.capture_message(
    f"High rate limit hits: {percentage}%",
    level="warning"
)
```

## Data Retention

### Current Settings
- **tutor_analytics_events**: 90 days (TTL index)
- **chat_messages**: 30 days (TTL index)
- **tutor_sessions**: Permanent (for user history)
- **tutor_feedback**: Permanent (for analysis)

### Adjusting Retention
To change retention periods, update TTL indexes:

```python
# Extend analytics events to 180 days
await db["tutor_analytics_events"].drop_index("expires_at_ttl")
# Update expires_at calculation in tracking service
expires_at = datetime.now(UTC) + timedelta(days=180)
```

## Performance Optimization

### Query Optimization
- Use indexes for all time-based queries
- Limit result sets with `.limit()`
- Use aggregation pipelines for complex queries
- Cache frequently accessed metrics

### Storage Optimization
- Enable compression on MongoDB
- Archive old data to cold storage
- Remove unused indexes
- Use projection to fetch only needed fields

### Cost Optimization
- Promote BYOK to heavy users
- Implement caching for common queries
- Batch analytics updates
- Use read replicas for analytics queries

## Troubleshooting

### High API Costs
1. Check cost metrics dashboard
2. Identify heavy users
3. Reach out to promote BYOK
4. Consider implementing usage caps

### Many Users Hitting Limits
1. Check rate limit metrics
2. Analyze usage patterns
3. Consider increasing limits
4. Improve limit communication to users

### Low Satisfaction Rate
1. Review negative feedback
2. Identify common issues
3. Improve AI responses
4. Enhance user experience

### Slow Analytics Queries
1. Check index usage
2. Verify indexes are being used
3. Optimize aggregation pipelines
4. Consider materialized views

## Future Enhancements

### Phase 1: Real-time Monitoring
- [ ] WebSocket for live metrics
- [ ] Real-time alerts
- [ ] Live dashboard updates

### Phase 2: Predictive Analytics
- [ ] Predict rate limit hits
- [ ] Forecast costs
- [ ] Identify at-risk users

### Phase 3: Advanced Insights
- [ ] ML-based feedback analysis
- [ ] User segmentation
- [ ] Churn prediction
- [ ] Personalized recommendations

### Phase 4: Automated Actions
- [ ] Auto-scale rate limits
- [ ] Auto-promote BYOK
- [ ] Auto-optimize queries
- [ ] Auto-archive old data

## Conclusion

This analytics and monitoring system provides comprehensive insights into AI tutor usage, costs, and user satisfaction. Use it to:

1. **Track engagement** - Understand how users interact with AI tutor
2. **Monitor rate limits** - Ensure users aren't being blocked
3. **Control costs** - Keep API expenses within budget
4. **Improve quality** - Use feedback to enhance the experience
5. **Optimize performance** - Keep the system running smoothly

Regular monitoring and analysis will help you make data-driven decisions to improve the AI tutor feature and provide better value to your users.
