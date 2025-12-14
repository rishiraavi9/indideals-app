# Elasticsearch Integration Guide

## Overview

This guide explains how to set up and use Elasticsearch for advanced search functionality in the IndiaDeals app.

## Features

✅ **Full-text search** - Search across titles, descriptions, merchants
✅ **Autocomplete** - Real-time search suggestions as users type
✅ **Fuzzy matching** - Handles typos and misspellings
✅ **Faceted search** - Filter by categories, price ranges, discounts
✅ **Relevance scoring** - Better search result ranking
✅ **Multi-field search** - Search across multiple fields simultaneously
✅ **Aggregations** - Get category/merchant/price distribution

## Setup Instructions

### 1. Start Elasticsearch & Kibana

```bash
cd backend
docker-compose -f docker-compose.elasticsearch.yml up -d
```

This will start:
- **Elasticsearch** on `http://localhost:9200`
- **Kibana** (UI) on `http://localhost:5601`

### 2. Verify Elasticsearch is Running

```bash
curl http://localhost:9200
```

You should see a JSON response with cluster information.

### 3. Add Environment Variable

Add to `backend/.env`:

```env
ELASTICSEARCH_URL=http://localhost:9200
```

### 4. Initialize Index and Bulk Index Existing Deals

```bash
cd backend
NODE_ENV=development npx tsx src/scripts/index-deals.ts
```

This will:
1. Check Elasticsearch health
2. Create the `deals` index with proper mappings
3. Fetch all deals from PostgreSQL
4. Bulk index them into Elasticsearch

Expected output:
```
🚀 Starting Elasticsearch indexing process...

1️⃣ Checking Elasticsearch health...
✅ Elasticsearch cluster health: green

2️⃣ Initializing Elasticsearch index...
✅ Elasticsearch index "deals" created successfully

3️⃣ Fetching deals from PostgreSQL...
   Found 50 deals to index

4️⃣ Transforming deals to Elasticsearch documents...

5️⃣ Bulk indexing deals...
   Indexing batch 1/1...
✅ Bulk indexed 50 deals successfully

✅ Successfully indexed all deals!
   Total: 50 deals

🎉 Indexing complete!
```

## API Endpoints

All endpoints are now **LIVE** and ready to use! 🚀

### 1. Advanced Search

```http
GET /api/search/deals?q=samsung&categoryIds=<uuid>&minPrice=5000&maxPrice=50000&sortBy=price_asc
```

**Query Parameters:**
- `q` - Search query (searches across title, description, merchant)
- `categoryIds` - Comma-separated category IDs
- `merchants` - Comma-separated merchant names
- `minPrice` - Minimum price
- `maxPrice` - Maximum price
- `minScore` - Minimum deal score (upvotes - downvotes)
- `festiveTags` - Comma-separated festive tags
- `seasonalTag` - Seasonal tag
- `from` - Pagination offset (default: 0)
- `size` - Number of results (default: 20)
- `sortBy` - Sort order: `relevance`, `price_asc`, `price_desc`, `score`, `date`

**Response:**
```json
{
  "deals": [...],
  "total": 42,
  "took": 15
}
```

### 2. Autocomplete Suggestions

```http
GET /api/search/autocomplete?q=sam
```

**Response:**
```json
{
  "suggestions": [
    {
      "title": "Samsung Galaxy S23",
      "merchant": "Flipkart",
      "categoryName": "Electronics"
    },
    {
      "title": "Samsung TV 55 inch",
      "merchant": "Amazon",
      "categoryName": "Electronics"
    }
  ]
}
```

### 3. Search Aggregations (Facets)

```http
GET /api/search/aggregations?q=laptop
```

**Response:**
```json
{
  "categories": {
    "buckets": [
      { "key": "Electronics", "doc_count": 156 },
      { "key": "Fashion", "doc_count": 42 }
    ]
  },
  "merchants": {
    "buckets": [
      { "key": "Amazon", "doc_count": 89 },
      { "key": "Flipkart", "doc_count": 67 }
    ]
  },
  "priceRanges": {
    "buckets": [
      { "key": "Under ₹500", "doc_count": 12 },
      { "key": "₹500-₹1000", "doc_count": 34 }
    ]
  }
}
```

## Usage Examples

### Search for Deals

```typescript
// Search for "samsung phone" under ₹30,000
const response = await fetch(
  '/api/search/deals?q=samsung phone&maxPrice=30000&sortBy=price_asc'
);
const { deals, total } = await response.json();
```

### Get Autocomplete Suggestions

```typescript
// As user types "sam..."
const response = await fetch('/api/search/autocomplete?q=sam');
const { suggestions } = await response.json();
```

### Get Filter Options

```typescript
// Get available categories, merchants, price ranges
const response = await fetch('/api/search/aggregations');
const { categories, merchants, priceRanges } = await response.json();
```

## How It Works

### Architecture

```
┌─────────────────┐         ┌──────────────────┐
│   PostgreSQL    │ ──────> │  Elasticsearch   │
│ (Source of      │         │  (Search Index)  │
│  Truth)         │         │                  │
└─────────────────┘         └──────────────────┘
         │                            │
         │                            │
         ↓                            ↓
   CRUD Operations              Fast Searches
```

### Automatic Indexing

When deals are created/updated/deleted in PostgreSQL, they are automatically indexed/updated/removed in Elasticsearch through the service layer.

### Index Mapping

The Elasticsearch index uses:
- **Autocomplete analyzer** - Edge n-grams for fast autocomplete
- **Fuzzy matching** - Handles typos (e.g., "samsnug" → "samsung")
- **Multi-field mapping** - Title has both full-text and keyword fields
- **Numeric ranges** - Fast price/score filtering
- **Nested aggregations** - Category/merchant faceting

## Kibana (Optional)

Access Kibana UI at `http://localhost:5601` to:
- Explore indexed data
- Test search queries
- View index mappings
- Monitor performance
- Create visualizations

### Useful Kibana Queries

1. **Search all deals:**
   ```
   GET /deals/_search
   ```

2. **Search by title:**
   ```
   GET /deals/_search
   {
     "query": {
       "match": { "title": "samsung" }
     }
   }
   ```

3. **Get index mapping:**
   ```
   GET /deals/_mapping
   ```

## Maintenance

### Re-index All Deals

If you make changes to the index mapping or need to re-index:

```bash
# Delete existing index
curl -X DELETE http://localhost:9200/deals

# Re-run indexing script
NODE_ENV=development npx tsx src/scripts/index-deals.ts
```

### Monitor Index Health

```bash
# Check cluster health
curl http://localhost:9200/_cluster/health?pretty

# Check index stats
curl http://localhost:9200/deals/_stats?pretty

# Count documents
curl http://localhost:9200/deals/_count?pretty
```

### Clear All Data

```bash
# Stop containers and remove volumes
docker-compose -f docker-compose.elasticsearch.yml down -v
```

## Performance Tips

1. **Pagination** - Use `from` and `size` parameters instead of fetching all results
2. **Caching** - Cache aggregation results (categories, merchants)
3. **Batch Indexing** - Index deals in batches of 100-1000
4. **Async Indexing** - Don't wait for Elasticsearch when creating/updating deals
5. **Refresh Interval** - Increase refresh interval for bulk operations

## Troubleshooting

### Elasticsearch won't start

```bash
# Check logs
docker logs deals-elasticsearch

# Common fix: Increase Docker memory to 4GB+
```

### Index not found

```bash
# Re-run initialization script
NODE_ENV=development npx tsx src/scripts/index-deals.ts
```

### Search not returning results

```bash
# Check if documents are indexed
curl http://localhost:9200/deals/_count

# Test simple search
curl "http://localhost:9200/deals/_search?q=*"
```

### Slow searches

1. Check index size: `curl http://localhost:9200/deals/_stats`
2. Reduce `size` parameter
3. Add more specific filters
4. Use keyword fields for exact matches

## Next Steps

1. **Implement search controller** - Add REST API endpoints
2. **Frontend integration** - Update UI to use new search
3. **Add synonyms** - Handle "mobile" = "phone", "TV" = "television"
4. **Boost important fields** - Give more weight to title matches
5. **Add filters UI** - Category/price/merchant facets
6. **Search analytics** - Track popular searches
7. **Did you mean?** - Suggest corrections for typos

## Resources

- [Elasticsearch Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Elasticsearch Node.js Client](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/index.html)
- [Search UI Examples](https://www.elastic.co/guide/en/app-search/current/search-ui.html)
