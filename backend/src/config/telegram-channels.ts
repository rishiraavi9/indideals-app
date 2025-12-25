/**
 * Telegram Channels Configuration
 *
 * Add or remove channels here to control which Telegram deal channels are scraped.
 *
 * Format:
 *   { url: 'https://t.me/s/CHANNEL_NAME', username: 'CHANNEL_NAME' }
 *
 * Note: Use the /s/ prefix for public web preview (no login required)
 */

/**
 * Scraper Settings
 */
export const TELEGRAM_SCRAPER_CONFIG = {
  // Number of deals to fetch per channel on each scrape run
  // Reduced from 30 to 15 to avoid overwhelming merchant APIs with price extraction requests
  dealsPerChannel: 15,

  // How often to run the scraper (cron expression)
  // Examples: '0 */2 * * *' = every 2 hours, '0 * * * *' = every hour, '*/30 * * * *' = every 30 mins
  scheduleCron: '0 */2 * * *', // Every 2 hours

  // Delay between scraping different channels (in milliseconds)
  // Increased from 2000ms to 5000ms to reduce scraping intensity
  delayBetweenChannels: 5000,

  // Minimum deals required before importing (skip if fewer)
  minDealsToImport: 1,

  // Maximum URLs allowed per post (skip roundup/compilation posts with more)
  maxUrlsPerDeal: 2,

  // Phase 1: Scrape NEW messages (newest first, catches new posts)
  enablePhase1NewDeals: true,

  // Phase 2: BACKFILL older messages (continues from oldest known, catches missed posts)
  enablePhase2Backfill: true,

  // Max pages to fetch per phase (50 messages per page, 10 pages = 500 messages)
  maxPagesPerPhase: 10,

  // Skip channels that haven't posted in this many days (saves resources)
  // Set to 0 to disable this check
  inactivityThresholdDays: 3,
};

export interface TelegramChannel {
  url: string;
  username: string;
  enabled?: boolean;  // Optional: set to false to temporarily disable
}

export const TELEGRAM_CHANNELS: TelegramChannel[] = [
  // Active deal channels
  { url: 'https://t.me/s/MahidharZone', username: 'MahidharZone', enabled: true },
  { url: 'https://t.me/s/iamprasadtech', username: 'iamprasadtech', enabled: true },

  // Add more channels below:
   { url: 'https://t.me/s/TechFactsDeals', username: 'TechFactsDeals', enabled: true },
  // { url: 'https://t.me/s/DealsCorner', username: 'DealsCorner', enabled: true },
];

/**
 * Get all enabled channels
 */
export function getEnabledChannels(): TelegramChannel[] {
  return TELEGRAM_CHANNELS.filter(channel => channel.enabled !== false);
}

/**
 * Get channel by username
 */
export function getChannelByUsername(username: string): TelegramChannel | undefined {
  return TELEGRAM_CHANNELS.find(
    channel => channel.username.toLowerCase() === username.toLowerCase()
  );
}
