import { BaseMerchantService, ScrapedDeal } from './base-merchant.service';
import { Page } from 'puppeteer';

export class AmazonService extends BaseMerchantService {
  protected merchantName = 'Amazon India';
  protected baseUrl = 'https://www.amazon.in';

  /**
   * Scrape daily deals from Amazon India
   * Targets: Today's Deals, Lightning Deals, Best Sellers with discounts
   */
  async scrapeDailyDeals(): Promise<ScrapedDeal[]> {
    const deals: ScrapedDeal[] = [];

    // Amazon deal pages to scrape
    const dealPages = [
      '/deals',
      '/gp/goldbox',
    ];

    const page = await this.createPage();

    try {
      for (const dealPage of dealPages) {
        const url = `${this.baseUrl}${dealPage}`;
        console.log(`[Amazon] Scraping: ${url}`);

        try {
          await this.navigateWithRetry(page, url);

          // Wait for deals to load
          await page.waitForSelector('[data-testid="deal-card"], .DealCard-module__card, .a-section.octopus-dlp-asin-section', {
            timeout: 10000
          }).catch(() => {
            console.log(`[Amazon] No deals found on ${url}`);
          });

          // Scrape deal cards
          const pageDeals = await this.scrapeDealsFromPage(page);
          deals.push(...pageDeals);

          // Add delay between pages to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`[Amazon] Error scraping ${url}:`, error);
        }
      }
    } finally {
      await page.close();
    }

    return deals;
  }

  /**
   * Scrape deals from current page
   */
  private async scrapeDealsFromPage(page: Page): Promise<ScrapedDeal[]> {
    return await page.evaluate(() => {
      const deals: ScrapedDeal[] = [];

      // Amazon deal card selectors (multiple formats)
      const dealCards = document.querySelectorAll('[data-testid="deal-card"], .DealCard-module__card, .octopus-dlp-asin-section, .a-section.dealContainer');

      dealCards.forEach((card) => {
        try {
          // Title
          const titleEl = card.querySelector('[data-testid="deal-title"], .DealTitle-module__truncate, .a-size-base-plus.a-color-base, a.a-link-normal .a-size-base-plus');
          let title = titleEl?.textContent?.trim();
          if (!title) return;

          // Clean up title (remove extra whitespace)
          title = title.replace(/\s+/g, ' ').trim();

          // Price
          const priceEl = card.querySelector('.a-price-whole, .DealPrice-module__price, [data-testid="deal-price"]');
          const priceText = priceEl?.textContent?.trim();
          if (!priceText) return;

          const price = parseFloat(priceText.replace(/[₹,]/g, '').replace('.', ''));
          if (isNaN(price) || price <= 0) return;

          // Original price
          const originalPriceEl = card.querySelector('.a-price.a-text-price .a-offscreen, [data-testid="list-price"]');
          const originalPriceText = originalPriceEl?.textContent?.trim();
          let originalPrice: number | undefined;
          if (originalPriceText) {
            const parsedOriginal = parseFloat(originalPriceText.replace(/[₹,]/g, ''));
            if (!isNaN(parsedOriginal) && parsedOriginal > price) {
              originalPrice = Math.round(parsedOriginal);
            }
          }

          // Discount percentage
          const discountEl = card.querySelector('.savingPriceOverride, .DealBadge-module__text, [data-testid="deal-badge-text"]');
          const discountText = discountEl?.textContent?.trim();
          let discountPercentage: number | undefined;
          if (discountText) {
            const match = discountText.match(/(\d+)%/);
            if (match) {
              discountPercentage = parseInt(match[1]);
            }
          }

          // Product URL
          const linkEl = card.querySelector('a[href*="/dp/"], a[href*="/gp/product/"]') as HTMLAnchorElement;
          const href = linkEl?.href;
          if (!href) return;

          // Construct full URL
          let productUrl = href;
          if (!productUrl.startsWith('http')) {
            productUrl = `https://www.amazon.in${href}`;
          }

          // Extract ASIN (Amazon product ID)
          const asinMatch = productUrl.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})/);
          const externalProductId = asinMatch ? (asinMatch[1] || asinMatch[2]) : undefined;

          if (!externalProductId) return; // Skip if we can't extract ASIN

          // Clean URL (remove query params except essential ones)
          productUrl = `https://www.amazon.in/dp/${externalProductId}`;

          // Image URL
          const imgEl = card.querySelector('img[data-testid="deal-image"], img.dealImage') as HTMLImageElement;
          let imageUrl = imgEl?.src;

          // Amazon uses lazy loading, try data-src as fallback
          if (!imageUrl || imageUrl.includes('data:image')) {
            imageUrl = imgEl?.getAttribute('data-src') || undefined;
          }

          deals.push({
            title,
            price: Math.round(price),
            originalPrice,
            discountPercentage,
            productUrl,
            imageUrl,
            merchant: 'Amazon India',
            externalProductId,
          });
        } catch (error) {
          console.error('Error parsing Amazon deal card:', error);
        }
      });

      return deals;
    });
  }

  /**
   * Scrape specific product by URL or ASIN
   */
  async scrapeProductByUrl(url: string): Promise<ScrapedDeal | null> {
    const page = await this.createPage();

    try {
      await this.navigateWithRetry(page, url);

      // Wait for product page to load
      await page.waitForSelector('#productTitle, #title', { timeout: 10000 });

      const scrapedData = await page.evaluate(() => {
        // Title
        const titleEl = document.querySelector('#productTitle, #title');
        const title = titleEl?.textContent?.trim();
        if (!title) return null;

        // Price - Amazon has multiple price formats
        let price: number | undefined;
        let originalPrice: number | undefined;

        // Try deal price first
        const dealPriceEl = document.querySelector('.a-price.priceToPay .a-offscreen, .a-price.a-text-price.a-size-medium.apexPriceToPay .a-offscreen');
        if (dealPriceEl) {
          const priceText = dealPriceEl.textContent?.trim();
          if (priceText) {
            price = parseFloat(priceText.replace(/[₹,]/g, ''));
          }
        }

        // Fallback to regular price
        if (!price) {
          const regularPriceEl = document.querySelector('.a-price .a-offscreen');
          if (regularPriceEl) {
            const priceText = regularPriceEl.textContent?.trim();
            if (priceText) {
              price = parseFloat(priceText.replace(/[₹,]/g, ''));
            }
          }
        }

        if (!price) return null;

        // Original price (list price)
        const listPriceEl = document.querySelector('.a-price.a-text-price .a-offscreen, span.a-price.a-text-price span.a-offscreen');
        if (listPriceEl) {
          const listPriceText = listPriceEl.textContent?.trim();
          if (listPriceText) {
            const parsedOriginal = parseFloat(listPriceText.replace(/[₹,]/g, ''));
            if (!isNaN(parsedOriginal) && parsedOriginal > price) {
              originalPrice = Math.round(parsedOriginal);
            }
          }
        }

        // Discount percentage
        let discountPercentage: number | undefined;
        const discountEl = document.querySelector('.savingsPercentage, .savingPriceOverride');
        if (discountEl) {
          const discountText = discountEl.textContent?.trim();
          const match = discountText?.match(/(\d+)%/);
          if (match) {
            discountPercentage = parseInt(match[1]);
          }
        }

        // Image
        const imgEl = document.querySelector('#landingImage, #imgBlkFront') as HTMLImageElement;
        let imageUrl = imgEl?.src;

        // Fallback to data-old-hires for high-res image
        if (!imageUrl || imageUrl.includes('data:image')) {
          imageUrl = imgEl?.getAttribute('data-old-hires') || imgEl?.getAttribute('data-a-dynamic-image') || undefined;
        }

        // Description (bullet points)
        const bulletPoints = Array.from(document.querySelectorAll('#feature-bullets ul li span.a-list-item'))
          .map(el => el.textContent?.trim())
          .filter(Boolean)
          .join(', ')
          .substring(0, 500); // Limit length

        return {
          title,
          price: Math.round(price),
          originalPrice,
          discountPercentage,
          imageUrl,
          description: bulletPoints || undefined,
        };
      });

      if (!scrapedData) {
        return null;
      }

      // Extract ASIN from URL
      const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})/);
      const externalProductId = asinMatch ? (asinMatch[1] || asinMatch[2]) : undefined;

      // Clean URL
      const cleanUrl = externalProductId ? `https://www.amazon.in/dp/${externalProductId}` : url;

      return {
        ...scrapedData,
        productUrl: cleanUrl,
        merchant: 'Amazon India',
        externalProductId,
      };
    } catch (error) {
      console.error(`[Amazon] Error scraping product ${url}:`, error);
      return null;
    } finally {
      await page.close();
    }
  }

  /**
   * Scrape Amazon Prime Day deals (when active)
   */
  async scrapePrimeDayDeals(): Promise<ScrapedDeal[]> {
    const deals: ScrapedDeal[] = [];
    const page = await this.createPage();

    try {
      const url = `${this.baseUrl}/prime`;
      console.log(`[Amazon] Scraping Prime Day: ${url}`);

      await this.navigateWithRetry(page, url);

      // Wait for deals to load
      await page.waitForSelector('[data-testid="deal-card"], .octopus-dlp-asin-section', { timeout: 10000 });

      // Scrape deals
      const pageDeals = await this.scrapeDealsFromPage(page);
      deals.push(...pageDeals);
    } catch (error) {
      console.error('[Amazon] Error scraping Prime Day:', error);
    } finally {
      await page.close();
    }

    return deals;
  }

  /**
   * Scrape Amazon Lightning Deals (time-limited deals)
   */
  async scrapeLightningDeals(): Promise<ScrapedDeal[]> {
    const deals: ScrapedDeal[]= [];
    const page = await this.createPage();

    try {
      const url = `${this.baseUrl}/gp/goldbox?deals-widget=%7B%22version%22%3A1%2C%22viewIndex%22%3A0%2C%22presetId%22%3A%22deals-collection-lightning-deals%22%7D`;
      console.log(`[Amazon] Scraping Lightning Deals: ${url}`);

      await this.navigateWithRetry(page, url);

      // Wait for deals to load
      await page.waitForSelector('[data-testid="deal-card"]', { timeout: 10000 });

      // Scrape deals
      const pageDeals = await this.scrapeDealsFromPage(page);

      // Filter for active lightning deals (>20% discount)
      const lightningDeals = pageDeals.filter(deal =>
        deal.discountPercentage && deal.discountPercentage >= 20
      );

      deals.push(...lightningDeals);
    } catch (error) {
      console.error('[Amazon] Error scraping Lightning Deals:', error);
    } finally {
      await page.close();
    }

    return deals;
  }
}

// Export singleton instance
export const amazonService = new AmazonService();
