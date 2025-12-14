#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Redis Cache Testing Script${NC}"
echo "================================"
echo ""

# Check if Redis is running
echo -e "${YELLOW}Checking Redis connection...${NC}"
if docker exec deals-redis redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis is running${NC}"
else
    echo -e "${RED}❌ Redis is not running. Start it with:${NC}"
    echo "   docker compose -f docker-compose.elasticsearch.yml up -d redis"
    exit 1
fi

echo ""

# Test 1: Response Time Comparison
echo -e "${BLUE}Test 1: Response Time Comparison${NC}"
echo "================================"
echo "Testing search endpoint with query 'sony'..."
echo ""

echo -n "First request (cache miss):  "
FIRST_TIME=$( { time curl -s "http://localhost:3001/api/search/deals?q=sony" > /dev/null 2>&1; } 2>&1 | grep real | awk '{print $2}')
echo "$FIRST_TIME"

echo -n "Second request (cache hit):  "
SECOND_TIME=$( { time curl -s "http://localhost:3001/api/search/deals?q=sony" > /dev/null 2>&1; } 2>&1 | grep real | awk '{print $2}')
echo "$SECOND_TIME"

echo ""

# Test 2: Check Cached Keys
echo -e "${BLUE}Test 2: Cached Keys in Redis${NC}"
echo "============================"
KEYS=$(docker exec deals-redis redis-cli KEYS "*")
if [ -z "$KEYS" ]; then
    echo "No keys found in cache"
else
    echo -e "${GREEN}Cached keys found:${NC}"
    echo "$KEYS"
fi

echo ""

# Test 3: Check TTL
echo -e "${BLUE}Test 3: Cache Expiration (TTL)${NC}"
echo "=============================="
SEARCH_KEY=$(docker exec deals-redis redis-cli KEYS "search:*" | head -1)
if [ -n "$SEARCH_KEY" ]; then
    TTL=$(docker exec deals-redis redis-cli TTL "$SEARCH_KEY")
    echo "Key: $SEARCH_KEY"
    echo "TTL: $TTL seconds remaining"

    if [ "$TTL" -gt 0 ] && [ "$TTL" -le 60 ]; then
        echo -e "${GREEN}✅ TTL is correct (should be ≤60s for search)${NC}"
    fi
else
    echo "No search keys found to check TTL"
fi

echo ""

# Test 4: Test Aggregations Cache
echo -e "${BLUE}Test 4: Aggregations Endpoint${NC}"
echo "============================"
echo "Testing aggregations endpoint..."
echo ""

echo -n "First request (cache miss):  "
AGG_FIRST=$( { time curl -s "http://localhost:3001/api/search/aggregations" > /dev/null 2>&1; } 2>&1 | grep real | awk '{print $2}')
echo "$AGG_FIRST"

echo -n "Second request (cache hit):  "
AGG_SECOND=$( { time curl -s "http://localhost:3001/api/search/aggregations" > /dev/null 2>&1; } 2>&1 | grep real | awk '{print $2}')
echo "$AGG_SECOND"

echo ""

# Test 5: Redis Memory Usage
echo -e "${BLUE}Test 5: Redis Memory Usage${NC}"
echo "=========================="
docker exec deals-redis redis-cli INFO memory | grep "used_memory_human"

echo ""

# Test 6: Cache Statistics
echo -e "${BLUE}Test 6: Cache Statistics${NC}"
echo "======================="
KEY_COUNT=$(docker exec deals-redis redis-cli DBSIZE)
echo "Total keys in cache: $KEY_COUNT"

echo ""
echo -e "${BLUE}Test 7: Connection Info${NC}"
echo "===================="
docker exec deals-redis redis-cli INFO clients | grep "connected_clients"

echo ""

# Summary
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✅ Cache Testing Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Summary:"
echo "--------"
echo "1. If second requests are faster than first → Caching is working!"
echo "2. Keys in Redis → Data is being cached"
echo "3. TTL counting down → Cache will expire correctly"
echo ""
echo "Next steps:"
echo "- View cached data: docker exec deals-redis redis-cli GET 'search:{...}'"
echo "- Monitor in real-time: docker exec deals-redis redis-cli MONITOR"
echo "- Clear cache: docker exec deals-redis redis-cli FLUSHALL"
echo "- Read full guide: cat CACHE_TESTING_GUIDE.md"
