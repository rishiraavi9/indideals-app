# Redis Cache Testing Guide

This guide shows you how to verify that Redis caching is working correctly in your deals application.

## Prerequisites

Make sure all services are running:
```bash
# 1. Elasticsearch & Redis containers
docker compose -f docker-compose.elasticsearch.yml up -d

# 2. Backend server
npm run dev

# 3. Verify Redis is running
docker exec deals-redis redis-cli ping
# Expected output: PONG
```

## Method 1: Response Time Comparison (Easiest)

The simplest way to verify caching is to measure response times.

### Test Search Endpoint

```bash
# First request (cache miss - slower)
time curl -s "http://localhost:3001/api/search/deals?q=sony" > /dev/null

# Second request (cache hit - much faster)
time curl -s "http://localhost:3001/api/search/deals?q=sony" > /dev/null
```

**Expected Results:**
- First request: ~20-50ms (Elasticsearch query + network)
- Second request: ~5-10ms (Redis cache + network)
- **You should see 2-5x speedup on the second request**

### Test Aggregations Endpoint

```bash
# First request
time curl -s "http://localhost:3001/api/search/aggregations" > /dev/null

# Second request (should be faster)
time curl -s "http://localhost:3001/api/search/aggregations" > /dev/null
```

## Method 2: Check Redis Keys Directly

Monitor what's being stored in Redis.

### Check Cached Keys

```bash
# List all cached keys
docker exec deals-redis redis-cli KEYS "*"

# Expected output:
# search:{"q":"sony"}
# agg:all
```

### Check TTL (Time To Live)

```bash
# Check how long until a key expires
docker exec deals-redis redis-cli TTL 'search:{"q":"sony"}'

# Expected output: A number between 1-60 (seconds remaining)
# -1 means no expiration
# -2 means key doesn't exist
```

### View Cached Data

```bash
# Get the actual cached value
docker exec deals-redis redis-cli GET 'search:{"q":"sony"}'

# You'll see the full JSON response that was cached
```

## Method 3: Real-time Cache Monitoring

Watch cache operations as they happen.

### Monitor All Redis Commands

```bash
# Open a monitoring session (Ctrl+C to stop)
docker exec deals-redis redis-cli MONITOR
```

Now in another terminal, make a request:
```bash
curl "http://localhost:3001/api/search/deals?q=sony"
```

**What you'll see:**
- First request: `GET "search:..."` (miss), then `SETEX "search:..." 60 "{...}"`
- Second request: Just `GET "search:..."` (hit)

## Method 4: Test Cache Invalidation

Verify that cache clears when data changes.

### Step 1: Create some cached data

```bash
# Make a search request
curl "http://localhost:3001/api/search/deals?q=test"

# Verify it's cached
docker exec deals-redis redis-cli KEYS "*"
# Should see: search:{"q":"test"}
```

### Step 2: Trigger cache invalidation by creating a deal

```bash
# Create a new deal (requires authentication)
curl -X POST http://localhost:3001/api/deals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "Cache Test Deal",
    "description": "Testing cache invalidation",
    "price": 999,
    "originalPrice": 1499,
    "merchant": "TestMerchant",
    "url": "https://example.com",
    "imageUrl": "https://images.unsplash.com/photo-1523275335684-37898b6baf30",
    "categoryId": "YOUR_CATEGORY_ID_HERE"
  }'
```

### Step 3: Verify cache was cleared

```bash
# Check cache keys again
docker exec deals-redis redis-cli KEYS "*"
# Should see: (empty) or very few keys

# The search cache should be gone!
```

### Step 4: Test voting invalidation

```bash
# First, make a search to populate cache
curl "http://localhost:3001/api/search/deals?q=sony"

# Vote on a deal
curl -X POST "http://localhost:3001/api/deals/DEAL_ID/vote" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"voteType": 1}'

# Verify cache was cleared
docker exec deals-redis redis-cli KEYS "*"
# Should be empty again
```

## Method 5: Cache Statistics

Get detailed Redis performance metrics.

### Memory Usage

```bash
docker exec deals-redis redis-cli INFO memory | grep used_memory_human
```

### Hit/Miss Ratio

```bash
docker exec deals-redis redis-cli INFO stats | grep keyspace
```

### Connection Info

```bash
docker exec deals-redis redis-cli INFO clients
```

## Method 6: Automated Testing Script

Create a test script to run multiple scenarios.

### Create test file: `test-cache.sh`

```bash
#!/bin/bash

echo "🧪 Testing Redis Cache..."
echo ""

# Test 1: Response time comparison
echo "Test 1: Response Time Comparison"
echo "================================"
echo -n "First request (cache miss): "
time curl -s "http://localhost:3001/api/search/deals?q=laptop" > /dev/null 2>&1

echo -n "Second request (cache hit): "
time curl -s "http://localhost:3001/api/search/deals?q=laptop" > /dev/null 2>&1

echo ""

# Test 2: Check cached keys
echo "Test 2: Cached Keys"
echo "==================="
docker exec deals-redis redis-cli KEYS "*"

echo ""

# Test 3: Check TTL
echo "Test 3: Cache Expiration (TTL)"
echo "=============================="
docker exec deals-redis redis-cli TTL 'search:{"q":"laptop"}'

echo ""

# Test 4: Memory usage
echo "Test 4: Redis Memory Usage"
echo "=========================="
docker exec deals-redis redis-cli INFO memory | grep used_memory_human

echo ""
echo "✅ Cache testing complete!"
```

Make it executable and run:
```bash
chmod +x test-cache.sh
./test-cache.sh
```

## Method 7: Browser Developer Tools

Test from the frontend.

### Step 1: Open browser DevTools (F12)
### Step 2: Go to Network tab
### Step 3: Make a search request in the app
### Step 4: Look at the response time

**First request:**
- Time: ~20-50ms
- Response will come from Elasticsearch

**Second request (same search):**
- Time: ~5-10ms (much faster!)
- Response comes from Redis cache

## Expected Behaviors

### Cache Hit Indicators:
✅ Response time < 10ms
✅ Key exists in Redis: `docker exec deals-redis redis-cli EXISTS "search:{...}"`
✅ TTL is counting down
✅ No Elasticsearch query in logs

### Cache Miss Indicators:
❌ Response time 20-50ms
❌ Key doesn't exist in Redis
❌ Elasticsearch query appears in logs
❌ New key created with full TTL

### Cache Invalidation Indicators:
✅ Keys disappear after creating/voting on deals
✅ Search cache cleared: `search:*` keys gone
✅ Aggregation cache cleared: `agg:*` keys gone
✅ Next request will be slower (cache rebuilt)

## Common Issues

### Issue 1: Cache always misses
**Symptom:** Every request takes 20-50ms, no keys in Redis

**Check:**
```bash
# Is Redis running?
docker exec deals-redis redis-cli ping

# Is backend connected?
# Check backend logs for "✅ Redis connected"
```

### Issue 2: Cache never invalidates
**Symptom:** Old data keeps showing even after updates

**Check:**
```bash
# Look for invalidation errors in backend logs
# Keys should disappear after mutations
docker exec deals-redis redis-cli KEYS "*"
```

### Issue 3: Cache expires too quickly/slowly
**Symptom:** TTL doesn't match expectations

**Check TTL configuration:**
```typescript
// src/services/cache.service.ts
export const CacheTTL = {
  SHORT: 60,      // Search results
  MEDIUM: 300,    // Aggregations
  LONG: 1800,
  VERY_LONG: 3600,
}
```

## Performance Benchmarks

### Search Endpoint (GET /api/search/deals)
- **Without cache:** 15-30ms (Elasticsearch)
- **With cache hit:** 2-5ms (Redis)
- **Speedup:** 5-10x faster

### Aggregations Endpoint (GET /api/search/aggregations)
- **Without cache:** 10-20ms (Elasticsearch)
- **With cache hit:** 1-3ms (Redis)
- **Speedup:** 5-15x faster

## Real-World Testing Scenario

Here's a complete test flow:

```bash
# 1. Clear all cache
docker exec deals-redis redis-cli FLUSHALL

# 2. Make search request (cache miss)
time curl "http://localhost:3001/api/search/deals?q=sony"
# Should take ~20-50ms

# 3. Repeat same search (cache hit)
time curl "http://localhost:3001/api/search/deals?q=sony"
# Should take ~5-10ms (faster!)

# 4. Check what's cached
docker exec deals-redis redis-cli KEYS "*"
# Should show: search:{"q":"sony"}

# 5. Wait for TTL to expire (or check it)
docker exec deals-redis redis-cli TTL 'search:{"q":"sony"}'
# Should show time remaining (up to 60 seconds)

# 6. Test invalidation - create a deal
curl -X POST http://localhost:3001/api/deals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"title":"Test","price":999,...}'

# 7. Verify cache cleared
docker exec deals-redis redis-cli KEYS "*"
# Should be empty

# 8. Search again (cache miss, will be slower)
time curl "http://localhost:3001/api/search/deals?q=sony"
# Back to ~20-50ms (cache rebuilding)
```

## Monitoring Dashboard (Optional)

For production monitoring, consider:

1. **Redis Insight** - Visual Redis client
2. **Redis Commander** - Web-based Redis management
3. **Grafana + Prometheus** - Metrics visualization

Install Redis Commander:
```bash
npm install -g redis-commander
redis-commander --redis-host localhost --redis-port 6379
# Open http://localhost:8081
```

## Summary

The **easiest way** to verify caching is working:

1. Make a search request
2. Check Redis keys: `docker exec deals-redis redis-cli KEYS "*"`
3. Make the same request again
4. Compare response times - second should be 2-5x faster!

If you see keys in Redis and faster response times on repeated requests, **your cache is working!** 🎉
