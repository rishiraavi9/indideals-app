# Telegram Scraper Improvements

## Issues Fixed

### 1. Invalid/Expired URLs Being Imported ❌ → ✅

**Problem**: Deals with expired shortened URLs (like `ajiio.co/zavv4P`) were being imported into the database even though the URLs were invalid.

**Root Cause**:
- Telegram messages contain shortened URLs that may expire
- Scraper was importing deals without validating if the URL is actually accessible
- Even when price extraction failed (indicating invalid URL), the deal was still created

**Solution**:
- Added URL validation during price extraction
- If `AffiliateService.extractPriceInfo()` returns null (can't fetch prices), we now **skip** the deal entirely
- Invalid deals are no longer created in the database

**Code Changes**: `telegram-scraper.service.ts:447-479`
```typescript
if (priceInfo.currentPrice) {
  // Use extracted prices
} else {
  // Skip this deal - URL is likely expired/invalid
  logger.warn(`[Telegram] ❌ Could not extract prices from merchant - URL may be invalid/expired`);
  continue;
}
```

---

### 2. URL Extraction Breaking on Keywords ❌ → ✅

**Problem**: URLs were being extracted with message keywords appended to them:
- Stored URL: `https://ajiio.co/zavv4PMore` ❌
- Actual URL: `https://ajiio.co/zavv4P` ✅

**Root Cause**:
- Telegram messages format: `...https://ajiio.co/zavv4PMore : https://ajiio.co/OW3Jb3`
- Regex `/(https?:\/\/[^\s]+)/` captured everything until whitespace
- "More" was not followed by whitespace, so it got included in the URL

**Solution**:
- Updated regex to stop at common keywords: `More`, `Buy`, `Click`, `Deal`, `Price`, `Off`
- New regex: `/(https?:\/\/[^\s]+?)(?:More|Buy|Click|Deal|Price|Off|\s|$)/i`

**Code Changes**: `telegram-scraper.service.ts:133`
```typescript
const urlMatch = text.match(/(https?:\/\/[^\s]+?)(?:More|Buy|Click|Deal|Price|Off|\s|$)/i);
```

---

### 3. Messy Deal Titles with Emojis and URLs ❌ → ✅

**Problem**: Deal titles contained:
- Fire emojis: `🔥🔥`
- Gift emojis: `🎁`
- URLs: `https://amzn.to/...`
- "Buy Here", "More", "Deal Price" text

**Example**:
- Before: `🔥🔥PERFORMAX Men Self-Stripes Regular Fit Crew-Neck Training Sweatshirt🎁 Deal Price : ₹300Buy Here : https://ajiio.co/zavv4PMore : https://ajiio.co/OW3Jb3`
- After: `PERFORMAX Men Self-Stripes Regular Fit Crew-Neck Training Sweatshirt`

**Solution**: Added comprehensive title cleaning logic

**Code Changes**: `telegram-scraper.service.ts:202-214`
```typescript
// Remove URLs and "Buy Here", "More", "Deal Price" sections
title = title.replace(/Buy Here\s*:.*$/i, '');
title = title.replace(/More\s*:.*$/i, '');
title = title.replace(/Deal Price\s*:.*$/i, '');
title = title.replace(/https?:\/\/[^\s]+/g, '');

// Remove emojis
title = title.replace(/🎁/g, '');
title = title.replace(/🔥+/g, '');
title = title.replace(/🔴+/g, '');

// Clean up extra whitespace
title = title.replace(/\s+/g, ' ').trim();
```

---

### 4. Reprocessing Same Messages Repeatedly ❌ → ✅

**Problem**:
- Telegram shows the same ~20 messages every time you scrape
- Scraper was re-processing the same messages on every run
- Wasting time checking duplicates, fetching prices, etc.
- Could only import 0-5 new deals per run instead of 20

**Solution**: Added message tracking to avoid reprocessing

**Database Changes**: Added new table `telegram_messages`
```sql
CREATE TABLE telegram_messages (
  id UUID PRIMARY KEY,
  message_id VARCHAR(255) UNIQUE NOT NULL,  -- e.g., "iamprasadtech/100311"
  channel_username VARCHAR(100) NOT NULL,
  deal_id UUID REFERENCES deals(id),
  processed BOOLEAN NOT NULL DEFAULT TRUE,
  skipped_reason VARCHAR(100),              -- 'duplicate', 'invalid_url', 'no_price'
  posted_at TIMESTAMP NOT NULL,             -- When message was posted on Telegram
  created_at TIMESTAMP NOT NULL DEFAULT NOW -- When we processed it
);
```

**Code Changes**:

1. Extract message metadata (`telegram-scraper.service.ts:100-109`):
```typescript
const messageId = $message.attr('data-post');           // "iamprasadtech/100311"
const timestampStr = $message.find('.tgme_widget_message_date time').attr('datetime');
const postedAt = new Date(timestampStr);                // 2025-12-17T11:16:08+00:00
```

2. Check if already processed (`telegram-scraper.service.ts:367-377`):
```typescript
const [existingMessage] = await db
  .select()
  .from(telegramMessages)
  .where(eq(telegramMessages.messageId, deal.messageId))
  .limit(1);

if (existingMessage) {
  logger.info(`[Telegram] Already processed message ${deal.messageId}, skipping`);
  continue;
}
```

3. Record successful imports (`telegram-scraper.service.ts:461-469`):
```typescript
await db.insert(telegramMessages).values({
  messageId: deal.messageId,
  channelUsername: 'iamprasadtech',
  dealId: insertedDeal.id,
  processed: true,
  skippedReason: null,
  postedAt: deal.postedAt,
});
```

4. Record skipped messages (for various reasons):
- `duplicate_url`: Deal already exists in database
- `duplicate_ml`: ML similarity detection found duplicate
- `invalid_url`: URL is expired/inaccessible
- `no_url`: No valid URL found in message

---

## Benefits

### Before:
- ❌ 4 invalid Ajio deals imported with broken URLs
- ❌ Messy titles with emojis and URLs
- ❌ Re-processing same 20 messages every run
- ❌ Only importing 0-5 new deals per scraper run

### After:
- ✅ Invalid/expired URLs are rejected before import
- ✅ Clean, professional deal titles
- ✅ Each message processed only once
- ✅ Can import up to 20 new deals per run (limited only by actual new Telegram messages)
- ✅ Detailed tracking of why messages were skipped

---

## Testing

### URL Extraction Test
```bash
npx tsx test-telegram-url-extraction.ts
```

Results:
```
✅ PASS: Ajio URL extraction (https://ajiio.co/zavv4P)
✅ PASS: Amazon URL extraction (https://amzn.to/4rZ2MXu)
✅ PASS: Flipkart URL extraction (https://fkrt.co/TKfpLW)
✅ PASS: All title cleaning tests
```

### Database Cleanup
```bash
npx tsx clean-deal-titles.ts
```

Results:
```
✅ Cleaned 27 deal titles (removed emojis, URLs, etc.)
```

### Invalid Deals Removed
```sql
DELETE FROM deals WHERE url LIKE '%ajiio.co%More' OR url LIKE '%ajiio.co%Buy';
-- Deleted 4 deals with malformed URLs
```

---

## Migration Applied

Generated migration: `drizzle/0010_dear_william_stryker.sql`

```sql
CREATE TABLE "telegram_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "message_id" varchar(255) NOT NULL UNIQUE,
  "channel_username" varchar(100) NOT NULL,
  "deal_id" uuid REFERENCES "deals"("id") ON DELETE SET NULL,
  "processed" boolean DEFAULT true NOT NULL,
  "skipped_reason" varchar(100),
  "posted_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX telegram_messages_message_id_idx ON telegram_messages(message_id);
CREATE INDEX telegram_messages_channel_idx ON telegram_messages(channel_username);
CREATE INDEX telegram_messages_posted_at_idx ON telegram_messages(posted_at);
```

---

## Future Improvements

1. **Scheduled scraping**: Run scraper every hour with cron job
2. **Multi-channel support**: Track multiple Telegram channels
3. **Retry logic**: Retry failed URLs after 1 hour (maybe they're temporarily down)
4. **Analytics dashboard**: Show message processing stats (imported vs skipped)
5. **Deal expiry automation**: Auto-mark deals as expired if URL validation fails after 7 days

---

## Monitoring Queries

Check message processing stats:
```sql
-- How many messages processed today?
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_messages,
  SUM(CASE WHEN deal_id IS NOT NULL THEN 1 ELSE 0 END) as imported,
  SUM(CASE WHEN skipped_reason IS NOT NULL THEN 1 ELSE 0 END) as skipped
FROM telegram_messages
WHERE created_at >= CURRENT_DATE
GROUP BY DATE(created_at);

-- Why are messages being skipped?
SELECT
  skipped_reason,
  COUNT(*) as count
FROM telegram_messages
WHERE skipped_reason IS NOT NULL
GROUP BY skipped_reason
ORDER BY count DESC;
```

Check for old messages that need reprocessing:
```sql
-- Messages posted in last 24h but not processed yet
SELECT message_id, posted_at
FROM telegram_messages
WHERE posted_at >= NOW() - INTERVAL '24 hours'
AND processed = FALSE;
```
