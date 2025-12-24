import axios, { AxiosError } from 'axios';
import * as cheerio from 'cheerio';
import { logger } from '../utils/logger.js';

/**
 * Affiliate Link Service
 * Handles URL expansion and affiliate tag replacement
 */

interface AffiliateConfig {
  amazon: string;
  flipkart: string;
  myntra?: string;
  ajio?: string;
}

export interface PriceInfo {
  currentPrice: number | null;
  originalPrice: number | null;
  discountPercentage: number | null;
}

/**
 * Anti-bot protection: Rotate User-Agent strings to avoid detection
 */
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
];

/**
 * Get a random User-Agent string
 */
function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Delay utility for rate limiting
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Request delay between merchant requests (milliseconds)
 * Helps avoid anti-bot detection
 */
const REQUEST_DELAY_MS = 2500; // 2.5 seconds between requests

/**
 * Track last request time per domain
 */
const lastRequestTime: Map<string, number> = new Map();

/**
 * Wait if needed to respect rate limits
 */
async function waitForRateLimit(domain: string): Promise<void> {
  const lastTime = lastRequestTime.get(domain) || 0;
  const elapsed = Date.now() - lastTime;

  if (elapsed < REQUEST_DELAY_MS) {
    const waitTime = REQUEST_DELAY_MS - elapsed;
    logger.info(`[Affiliate] Rate limiting: waiting ${waitTime}ms before ${domain} request`);
    await delay(waitTime);
  }

  lastRequestTime.set(domain, Date.now());
}

export class AffiliateService {
  // Your affiliate IDs (configure these in .env)
  private static readonly affiliateIds: AffiliateConfig = {
    amazon: process.env.AMAZON_AFFILIATE_ID || 'rishiraavi9-21',
    flipkart: process.env.FLIPKART_AFFILIATE_ID || '',
    myntra: process.env.MYNTRA_AFFILIATE_ID || '',
    ajio: process.env.AJIO_AFFILIATE_ID || '',
  };

  /**
   * Retry configuration
   */
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY_BASE = 2000; // 2 seconds base delay

  /**
   * Expand shortened URL to get the real product URL
   */
  static async expandUrl(shortUrl: string): Promise<string> {
    try {
      // Wait for rate limit
      const domain = new URL(shortUrl).hostname;
      await waitForRateLimit(domain);

      // Follow redirects to get final URL
      const response = await axios.get(shortUrl, {
        maxRedirects: 10,
        timeout: 20000, // Increased from 10s to 20s for slow URL shorteners (myntr.in, fkrt.co, etc.)
        validateStatus: () => true, // Accept any status code
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
      });

      // Return final URL after all redirects
      return response.request.res.responseUrl || shortUrl;
    } catch (error: any) {
      logger.warn(`[Affiliate] Failed to expand URL: ${shortUrl}`, error.message);
      return shortUrl; // Return original if expansion fails
    }
  }

  /**
   * Replace affiliate tags in URL with your own
   */
  static replaceAffiliateTags(url: string): string {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Amazon
    if (hostname.includes('amazon')) {
      return this.replaceAmazonTag(url);
    }

    // Flipkart
    if (hostname.includes('flipkart')) {
      return this.replaceFlipkartTag(url);
    }

    // Myntra
    if (hostname.includes('myntra')) {
      return this.replaceMyntraTag(url);
    }

    // Ajio
    if (hostname.includes('ajio')) {
      return this.replaceAjioTag(url);
    }

    // Return original if not a known merchant
    return url;
  }

  /**
   * Replace Amazon affiliate tag
   */
  private static replaceAmazonTag(url: string): string {
    if (!this.affiliateIds.amazon) return url;

    const urlObj = new URL(url);

    // Remove existing tag parameter
    urlObj.searchParams.delete('tag');
    urlObj.searchParams.delete('linkCode');
    urlObj.searchParams.delete('linkId');

    // Add your affiliate tag
    urlObj.searchParams.set('tag', this.affiliateIds.amazon);

    return urlObj.toString();
  }

  /**
   * Replace Flipkart affiliate tag
   */
  private static replaceFlipkartTag(url: string): string {
    if (!this.affiliateIds.flipkart) return url;

    const urlObj = new URL(url);

    // Remove existing affiliate parameters
    urlObj.searchParams.delete('affid');
    urlObj.searchParams.delete('affExtParam1');
    urlObj.searchParams.delete('affExtParam2');

    // Add your affiliate ID
    urlObj.searchParams.set('affid', this.affiliateIds.flipkart);

    return urlObj.toString();
  }

  /**
   * Replace Myntra affiliate tag
   */
  private static replaceMyntraTag(url: string): string {
    if (!this.affiliateIds.myntra) return url;

    // Myntra uses different affiliate system
    // Add your implementation based on Myntra's affiliate program
    return url;
  }

  /**
   * Replace Ajio affiliate tag
   */
  private static replaceAjioTag(url: string): string {
    if (!this.affiliateIds.ajio) return url;

    // Ajio affiliate implementation
    return url;
  }

  /**
   * Clean up URL - remove tracking parameters but keep affiliate tags
   */
  static cleanUrl(url: string): string {
    try {
      const urlObj = new URL(url);

      // Remove common tracking parameters (but keep affiliate tags)
      const trackingParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'fbclid', 'gclid', 'mc_cid', 'mc_eid',
        '_encoding', 'psc', 'pd_rd_w', 'pd_rd_r', 'pd_rd_wg',
        'pf_rd_p', 'pf_rd_r', 'pf_rd_s', 'pf_rd_t', 'pf_rd_i',
        'qid', 'sr', 'keywords',
      ];

      trackingParams.forEach(param => urlObj.searchParams.delete(param));

      return urlObj.toString();
    } catch (error) {
      return url;
    }
  }

  /**
   * Full URL processing: expand shortened URL and replace affiliate tags
   */
  static async processUrl(url: string): Promise<string> {
    try {
      logger.info(`[Affiliate] Processing URL: ${url.substring(0, 50)}...`);

      // Step 1: Expand shortened URLs (amzn.to, fkrt.co, etc.)
      let expandedUrl = url;
      if (this.isShortened(url)) {
        logger.info(`[Affiliate] Expanding shortened URL...`);
        expandedUrl = await this.expandUrl(url);
        logger.info(`[Affiliate] Expanded to: ${expandedUrl.substring(0, 80)}...`);
      }

      // Step 2: Replace affiliate tags
      const urlWithAffiliateTag = this.replaceAffiliateTags(expandedUrl);

      // Step 3: Clean tracking parameters
      const cleanedUrl = this.cleanUrl(urlWithAffiliateTag);

      logger.info(`[Affiliate] Final URL: ${cleanedUrl.substring(0, 80)}...`);

      return cleanedUrl;
    } catch (error: any) {
      logger.error(`[Affiliate] URL processing failed:`, error.message);
      return url; // Return original on error
    }
  }

  /**
   * Check if URL is a shortened link
   */
  private static isShortened(url: string): boolean {
    const shortenedDomains = [
      'amzn.to',
      'amzn.in',
      'fkrt.co',
      'fkrt.it',
      'myntr.in',
      'ajiio.co',
      'bit.ly',
      'goo.gl',
      'tinyurl.com',
      't.co',
    ];

    const lowerUrl = url.toLowerCase();
    return shortenedDomains.some(domain => lowerUrl.includes(domain));
  }

  /**
   * Extract product ID from Amazon URL
   */
  static extractAmazonProductId(url: string): string | null {
    // Amazon product ID patterns:
    // /dp/B08L5VQGQY/
    // /gp/product/B08L5VQGQY
    const dpMatch = url.match(/\/dp\/([A-Z0-9]{10})/);
    if (dpMatch) return dpMatch[1];

    const productMatch = url.match(/\/product\/([A-Z0-9]{10})/);
    if (productMatch) return productMatch[1];

    return null;
  }

  /**
   * Build clean Amazon URL with affiliate tag
   */
  static buildAmazonUrl(productId: string, domain: string = 'amazon.in'): string {
    if (!this.affiliateIds.amazon) {
      return `https://www.${domain}/dp/${productId}`;
    }
    return `https://www.${domain}/dp/${productId}?tag=${this.affiliateIds.amazon}`;
  }

  /**
   * Fetch and extract price information from product URL
   */
  static async extractPriceInfo(url: string): Promise<PriceInfo> {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      // Determine merchant and use appropriate scraping logic
      if (hostname.includes('amazon')) {
        return await this.extractAmazonPrice(url);
      } else if (hostname.includes('flipkart')) {
        return await this.extractFlipkartPrice(url);
      } else if (hostname.includes('myntra')) {
        return await this.extractMyntraPrice(url);
      } else if (hostname.includes('ajio')) {
        return await this.extractAjioPrice(url);
      }

      return { currentPrice: null, originalPrice: null, discountPercentage: null };
    } catch (error: any) {
      logger.error(`[Affiliate] Failed to extract price from ${url}:`, error.message);
      return { currentPrice: null, originalPrice: null, discountPercentage: null };
    }
  }

  /**
   * Extract price from Amazon product page with retry and anti-bot protection
   */
  private static async extractAmazonPrice(url: string): Promise<PriceInfo> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        // Wait for rate limit before making request
        await waitForRateLimit('amazon.in');

        const response = await axios.get(url, {
          headers: {
            'User-Agent': getRandomUserAgent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0',
          },
          timeout: 15000,
        });

        const $ = cheerio.load(response.data);

      // Try multiple selectors for current price
      let currentPrice: number | null = null;
      const priceSelectors = [
        '.a-price-whole',
        '#priceblock_dealprice',
        '#priceblock_ourprice',
        '.a-price .a-offscreen',
      ];

      for (const selector of priceSelectors) {
        const priceText = $(selector).first().text().trim();
        if (priceText) {
          currentPrice = parseInt(priceText.replace(/[₹,.\s]/g, ''));
          if (currentPrice && currentPrice > 0) break;
        }
      }

      // Try multiple selectors for MRP/original price (2024-2025 Amazon India selectors)
      let originalPrice: number | null = null;
      const mrpSelectors = [
        // New 2024-2025 selectors
        '.a-price[data-a-strike="true"] .a-offscreen',
        '.a-text-price[data-a-strike="true"] .a-offscreen',
        '.a-text-price .a-offscreen',
        '.basisPrice .a-offscreen',
        '.a-price.a-text-price .a-offscreen',
        // Strikethrough price selectors
        'span.a-price.a-text-price span.a-offscreen',
        '.a-section .a-text-price .a-offscreen',
        // Legacy selectors
        '#priceblock_dealprice + .a-text-price',
        '#listPrice',
        '#priceblock_saleprice',
        // Savings row selectors
        '.savingsPercentage',
        '#dealprice_savings .a-offscreen',
      ];

      for (const selector of mrpSelectors) {
        const mrpText = $(selector).first().text().trim();
        if (mrpText) {
          const price = parseInt(mrpText.replace(/[₹,.\s%\-off]/gi, ''));
          // Sanity check: MRP should be higher than current price and reasonable (< 1 million)
          if (price && currentPrice && price > currentPrice && price < 1000000) {
            originalPrice = price;
            break;
          }
        }
      }

      // Method 2: Look for savings percentage and calculate MRP
      if (!originalPrice && currentPrice) {
        const savingsText = $('.savingsPercentage, .a-color-price').text();
        const savingsMatch = savingsText.match(/(\d+)%/);
        if (savingsMatch) {
          const discountPct = parseInt(savingsMatch[1]);
          if (discountPct > 0 && discountPct < 95) {
            // Calculate original price: current = original * (1 - discount/100)
            // original = current / (1 - discount/100)
            const calculatedMrp = Math.round(currentPrice / (1 - discountPct / 100));
            if (calculatedMrp > currentPrice && calculatedMrp < 1000000) {
              originalPrice = calculatedMrp;
              logger.info(`[Amazon] Calculated MRP from ${discountPct}% discount: ₹${originalPrice}`);
            }
          }
        }
      }

      // Method 3: Look for "M.R.P." text pattern in HTML
      if (!originalPrice && currentPrice) {
        const bodyText = $('body').text();
        const mrpMatch = bodyText.match(/M\.?R\.?P\.?\s*:?\s*₹?\s*([\d,]+)/i);
        if (mrpMatch) {
          const price = parseInt(mrpMatch[1].replace(/,/g, ''));
          if (price > currentPrice && price < 1000000) {
            originalPrice = price;
          }
        }
      }

      // Method 4: Look for "was ₹" pattern
      if (!originalPrice && currentPrice) {
        const bodyText = $('body').text();
        const wasMatch = bodyText.match(/was\s*₹?\s*([\d,]+)/i);
        if (wasMatch) {
          const price = parseInt(wasMatch[1].replace(/,/g, ''));
          if (price > currentPrice && price < 1000000) {
            originalPrice = price;
          }
        }
      }

      // Method 5: Extract from structured data (JSON-LD)
      if (!originalPrice && currentPrice) {
        try {
          const jsonLdScript = $('script[type="application/ld+json"]').html();
          if (jsonLdScript) {
            const jsonData = JSON.parse(jsonLdScript);
            if (jsonData.offers?.highPrice || jsonData.offers?.price) {
              const highPrice = parseInt(String(jsonData.offers?.highPrice || '0').replace(/[^\d]/g, ''));
              if (highPrice > currentPrice && highPrice < 1000000) {
                originalPrice = highPrice;
              }
            }
          }
        } catch {
          // JSON parsing failed, continue
        }
      }

      // Calculate discount percentage
      let discountPercentage: number | null = null;
      if (currentPrice && originalPrice && originalPrice > currentPrice) {
        discountPercentage = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
      }

        logger.info(`[Amazon] Price: ₹${currentPrice}, MRP: ₹${originalPrice}, Discount: ${discountPercentage}%`);

        return { currentPrice, originalPrice, discountPercentage };
      } catch (error: any) {
        lastError = error;
        const isRetryable = error.response?.status === 500 || error.response?.status === 503 || error.code === 'ECONNRESET';

        if (isRetryable && attempt < this.MAX_RETRIES) {
          const backoffDelay = this.RETRY_DELAY_BASE * Math.pow(2, attempt - 1); // Exponential backoff: 2s, 4s, 8s
          logger.warn(`[Amazon] Request failed (${error.response?.status || error.code}), retrying in ${backoffDelay}ms (attempt ${attempt}/${this.MAX_RETRIES})`);
          await delay(backoffDelay);
        } else if (!isRetryable) {
          // Non-retryable error, exit immediately
          logger.warn(`[Amazon] Price extraction failed (non-retryable):`, error.message);
          return { currentPrice: null, originalPrice: null, discountPercentage: null };
        }
      }
    }

    // All retries exhausted
    logger.warn(`[Amazon] Price extraction failed after ${this.MAX_RETRIES} attempts:`, lastError?.message);
    return { currentPrice: null, originalPrice: null, discountPercentage: null };
  }

  /**
   * Extract price from Flipkart product page with anti-bot protection
   */
  private static async extractFlipkartPrice(url: string): Promise<PriceInfo> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        await waitForRateLimit('flipkart.com');

        const response = await axios.get(url, {
          headers: {
            'User-Agent': getRandomUserAgent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
          },
          timeout: 15000,
        });

        const $ = cheerio.load(response.data);

      // Flipkart price selectors (updated 2025)
      // Try multiple selectors as Flipkart changes classes frequently
      let currentPrice: number | null = null;
      const priceSelectors = [
        '.hZ3P6w', // 2025 selector
        '.bnqy13', // 2025 alternate
        '._30jeq3._16Jk6d', // Old selector
        '._25b18c',
        '._30jeq3'
      ];

      for (const selector of priceSelectors) {
        const priceText = $(selector).first().text().trim();
        if (priceText) {
          currentPrice = parseInt(priceText.replace(/[₹,]/g, ''));
          if (currentPrice && currentPrice > 0) break;
        }
      }

      // MRP selectors
      let originalPrice: number | null = null;
      const mrpSelectors = [
        '.kRYCnD', // 2025 selector
        '.yHYOcc', // 2025 alternate
        '._3I9_wc._2p6lqe', // Old selector
        '._3auQ3N._1POkHg'
      ];

      for (const selector of mrpSelectors) {
        const mrpText = $(selector).first().text().trim();
        if (mrpText) {
          const price = parseInt(mrpText.replace(/[₹,]/g, ''));
          // Sanity check: MRP should be higher than current price and reasonable
          if (price && price > currentPrice! && price < 1000000) {
            originalPrice = price;
            break;
          }
        }
      }

      // Calculate discount
      let discountPercentage: number | null = null;
      if (currentPrice && originalPrice && originalPrice > currentPrice) {
        discountPercentage = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
      }

        logger.info(`[Flipkart] Price: ₹${currentPrice}, MRP: ₹${originalPrice}, Discount: ${discountPercentage}%`);

        return { currentPrice, originalPrice, discountPercentage };
      } catch (error: any) {
        lastError = error;
        const isRetryable = error.response?.status === 500 || error.response?.status === 503 || error.code === 'ECONNRESET';

        if (isRetryable && attempt < this.MAX_RETRIES) {
          const backoffDelay = this.RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
          logger.warn(`[Flipkart] Request failed (${error.response?.status || error.code}), retrying in ${backoffDelay}ms (attempt ${attempt}/${this.MAX_RETRIES})`);
          await delay(backoffDelay);
        } else if (!isRetryable) {
          logger.warn(`[Flipkart] Price extraction failed (non-retryable):`, error.message);
          return { currentPrice: null, originalPrice: null, discountPercentage: null };
        }
      }
    }

    logger.warn(`[Flipkart] Price extraction failed after ${this.MAX_RETRIES} attempts:`, lastError?.message);
    return { currentPrice: null, originalPrice: null, discountPercentage: null };
  }

  /**
   * Extract price from Myntra product page with anti-bot protection
   */
  private static async extractMyntraPrice(url: string): Promise<PriceInfo> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        await waitForRateLimit('myntra.com');

        const response = await axios.get(url, {
          headers: {
            'User-Agent': getRandomUserAgent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
          },
          timeout: 15000,
        });

        const $ = cheerio.load(response.data);

        // Myntra price selectors
        const currentPriceText = $('.pdp-price strong, .pdp-discount-container .pdp-price').first().text().trim();
        const originalPriceText = $('.pdp-mrp, .pdp-discount-container s').first().text().trim();

        const currentPrice = currentPriceText ? parseInt(currentPriceText.replace(/[₹,]/g, '')) : null;
        const originalPrice = originalPriceText ? parseInt(originalPriceText.replace(/[₹,]/g, '')) : null;

        let discountPercentage: number | null = null;
        if (currentPrice && originalPrice && originalPrice > currentPrice) {
          discountPercentage = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
        }

        logger.info(`[Myntra] Price: ₹${currentPrice}, MRP: ₹${originalPrice}, Discount: ${discountPercentage}%`);

        return { currentPrice, originalPrice, discountPercentage };
      } catch (error: any) {
        lastError = error;
        const isRetryable = error.response?.status === 500 || error.response?.status === 503 || error.code === 'ECONNRESET';

        if (isRetryable && attempt < this.MAX_RETRIES) {
          const backoffDelay = this.RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
          logger.warn(`[Myntra] Request failed (${error.response?.status || error.code}), retrying in ${backoffDelay}ms (attempt ${attempt}/${this.MAX_RETRIES})`);
          await delay(backoffDelay);
        } else if (!isRetryable) {
          logger.warn(`[Myntra] Price extraction failed (non-retryable):`, error.message);
          return { currentPrice: null, originalPrice: null, discountPercentage: null };
        }
      }
    }

    logger.warn(`[Myntra] Price extraction failed after ${this.MAX_RETRIES} attempts:`, lastError?.message);
    return { currentPrice: null, originalPrice: null, discountPercentage: null };
  }

  /**
   * Extract price from Ajio product page with anti-bot protection
   */
  private static async extractAjioPrice(url: string): Promise<PriceInfo> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        await waitForRateLimit('ajio.com');

        const response = await axios.get(url, {
          headers: {
            'User-Agent': getRandomUserAgent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
          },
          timeout: 15000,
        });

        const $ = cheerio.load(response.data);

        // Ajio price selectors
        const currentPriceText = $('.prod-sp, .price-value').first().text().trim();
        const originalPriceText = $('.prod-orginal-price, .price-mrp').first().text().trim();

        const currentPrice = currentPriceText ? parseInt(currentPriceText.replace(/[₹,]/g, '')) : null;
        const originalPrice = originalPriceText ? parseInt(originalPriceText.replace(/[₹,]/g, '')) : null;

        let discountPercentage: number | null = null;
        if (currentPrice && originalPrice && originalPrice > currentPrice) {
          discountPercentage = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
        }

        logger.info(`[Ajio] Price: ₹${currentPrice}, MRP: ₹${originalPrice}, Discount: ${discountPercentage}%`);

        return { currentPrice, originalPrice, discountPercentage };
      } catch (error: any) {
        lastError = error;
        const isRetryable = error.response?.status === 500 || error.response?.status === 503 || error.code === 'ECONNRESET';

        if (isRetryable && attempt < this.MAX_RETRIES) {
          const backoffDelay = this.RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
          logger.warn(`[Ajio] Request failed (${error.response?.status || error.code}), retrying in ${backoffDelay}ms (attempt ${attempt}/${this.MAX_RETRIES})`);
          await delay(backoffDelay);
        } else if (!isRetryable) {
          logger.warn(`[Ajio] Price extraction failed (non-retryable):`, error.message);
          return { currentPrice: null, originalPrice: null, discountPercentage: null };
        }
      }
    }

    logger.warn(`[Ajio] Price extraction failed after ${this.MAX_RETRIES} attempts:`, lastError?.message);
    return { currentPrice: null, originalPrice: null, discountPercentage: null };
  }
}
