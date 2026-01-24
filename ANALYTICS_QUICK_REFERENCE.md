# Analytics & Monitoring - Quick Reference

## 🚀 Quick Setup (3 Steps)

### 1. Create Indexes
```python
# Add to main.py
from app.db_indexes import create_all_indexes

@app.on_event("startup")
async def startup():
    await create_all_indexes(get_database())
```

### 2. Register Router
```python
# Add to main.py
from app.routers import analytics_admin
app.include_router(analytics_admin.router)
```

### 3. Test
```bash
curl "http://localhost:8000/admin/analytics/dashboard?days=7" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

## 📊 API Endpoints

| Endpoint | Description | Query Params |
|----------|-------------|--------------|
| `/admin/analytics/dashboard` | All metrics | `days` (1-365) |
| `/admin/analytics/engagement` | User engagement | `days` (1-365) |
| `/admin/analytics/rate-limits` | Rate limit stats | `days` (1-365) |
| `/admin/analytics/costs` | Cost analysis | `days` (1-365) |
| `/admin/analytics/feedback` | User feedback | `days` (1-365) |
| `/admin/analytics/database-performance` | DB stats | None |

**Auth**: All endpoints require admin JWT token

## 📈 Key Metrics

### Engagement
- **Active Users**: Unique users using AI tutor
- **Total Sessions**: Number of tutor sessions
- **Avg Messages**: Messages per session
- **Satisfaction Rate**: % positive feedback

### Rate Limits
- **Hit Rate**: % of users hitting limits
- **Limit Type**: Tokens vs requests
- **Affected Users**: Count of users blocked

### Costs
- **Total Cost**: Server API costs (USD)
- **BYOK Savings**: Cost savings from BYOK
- **Daily Trend**: Cost over time

### Feedback
- **Rating Distribution**: Positive vs negative
- **Satisfaction Rate**: % positive
- **Recent Issues**: Latest negative feedback

## 🎯 Health Thresholds

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| Satisfaction Rate | >80% | 70-80% | <70% |
| Rate Limit Hits | <10% | 10-20% | >20% |
| Cost vs Budget | <80% | 80-100% | >100% |
| Engagement Trend | Growing | Stable | Declining |

## 🔔 Alert Recommendations

### Critical (Immediate)
```
- Satisfaction < 70%
- Rate limit hits > 25%
- Cost > budget + 50%
- DB size > 10GB/day growth
```

### Warning (24h)
```
- Satisfaction < 80%
- Rate limit hits > 15%
- Cost > budget + 25%
- Engagement down 20%
```

### Info (Weekly)
```
- New negative feedback
- Unusual usage patterns
- Unused indexes
```

## 📅 Monitoring Schedule

### Daily (5 min)
```bash
# Check satisfaction
curl "/admin/analytics/feedback?days=1"

# Check rate limits
curl "/admin/analytics/rate-limits?days=1"

# Check costs
curl "/admin/analytics/costs?days=1"
```

### Weekly (15 min)
```bash
# Full engagement review
curl "/admin/analytics/engagement?days=7"

# Cost trends
curl "/admin/analytics/costs?days=7"

# DB performance
curl "/admin/analytics/database-performance"
```

### Monthly (30 min)
```bash
# Comprehensive dashboard
curl "/admin/analytics/dashboard?days=30"

# Compare to previous month
curl "/admin/analytics/dashboard?days=60"
```

## 🗄️ Database Collections

| Collection | Purpose | Retention |
|------------|---------|-----------|
| `tutor_analytics_events` | All events | 90 days |
| `tutor_sessions` | Session data | Permanent |
| `tutor_feedback` | User feedback | Permanent |
| `chat_messages` | Chat history | 30 days |

## 🔧 Common Queries

### Get Today's Stats
```bash
curl "/admin/analytics/engagement?days=1"
```

### Get This Week
```bash
curl "/admin/analytics/dashboard?days=7"
```

### Get This Month
```bash
curl "/admin/analytics/dashboard?days=30"
```

### Get This Quarter
```bash
curl "/admin/analytics/dashboard?days=90"
```

## 💡 Quick Insights

### High Rate Limit Hits?
1. Check `/admin/analytics/rate-limits`
2. Identify affected users
3. Promote BYOK to heavy users
4. Consider increasing limits

### High Costs?
1. Check `/admin/analytics/costs`
2. Review daily breakdown
3. Identify cost spikes
4. Promote BYOK

### Low Satisfaction?
1. Check `/admin/analytics/feedback`
2. Read negative feedback
3. Identify common issues
4. Improve AI responses

### Slow Queries?
1. Check `/admin/analytics/database-performance`
2. Review index usage
3. Optimize unused indexes
4. Add missing indexes

## 🎨 Dashboard Ideas

### Engagement Dashboard
```
┌─────────────────────────────────────┐
│ Active Users: 150 ↑ 12%            │
│ Total Sessions: 450 ↑ 8%           │
│ Satisfaction: 85% ↑ 2%             │
└─────────────────────────────────────┘

[Line Chart: Active Users Over Time]
[Bar Chart: Sessions Per Day]
[Pie Chart: Feedback Distribution]
```

### Cost Dashboard
```
┌─────────────────────────────────────┐
│ This Month: $125.50 (75% of budget)│
│ BYOK Savings: $42.30               │
│ Avg Daily: $4.18                   │
└─────────────────────────────────────┘

[Line Chart: Daily Costs]
[Stacked Area: Server vs BYOK]
```

### Rate Limit Dashboard
```
┌─────────────────────────────────────┐
│ Users Hit Limits: 20 (13%)         │
│ Total Hits: 45                     │
│ Most Common: Tokens (67%)          │
└─────────────────────────────────────┘

[Line Chart: Hits Over Time]
[Bar Chart: Limit Type Breakdown]
```

## 🔗 Integration Examples

### Track Chat Event
```python
await analytics_service.track_tutor_usage(
    user_id=user_id,
    question_id=question_id,
    session_id=session_id,
    event_type="chat",
    metadata={"tokens": 150}
)
```

### Track Rate Limit Hit
```python
await analytics_service.track_rate_limit_hit(
    user_id=user_id,
    limit_type="tokens",
    tokens_used=25000,
    requests_used=28
)
```

### Track API Cost
```python
await analytics_service.track_api_cost(
    user_id=user_id,
    session_id=session_id,
    tokens_used=150,
    estimated_cost=0.0015,
    is_byok=False
)
```

## 📚 Documentation

- **Full Guide**: `ANALYTICS_MONITORING_GUIDE.md`
- **Implementation**: `ANALYTICS_IMPLEMENTATION_SUMMARY.md`
- **Code**: `fastapi_backend/app/services/analytics_tracking_service.py`

## 🆘 Troubleshooting

### Endpoints Return 403
→ Ensure you're using admin JWT token

### No Data Returned
→ Check if indexes are created
→ Verify events are being tracked

### Slow Queries
→ Check index usage
→ Optimize aggregation pipelines

### High Storage Usage
→ Verify TTL indexes are working
→ Check retention periods

---

**Quick Start**: Setup indexes → Register router → Test endpoints  
**Daily Check**: Satisfaction + Rate limits + Costs (5 min)  
**Weekly Review**: Full dashboard (15 min)  
**Monthly Analysis**: Trends + Optimization (30 min)
