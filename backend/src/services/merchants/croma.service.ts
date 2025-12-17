import { BaseMerchantService, ScrapedDeal } from './base-merchant.service';
import { Page } from 'puppeteer';

export class CromaService extends BaseMerchantService {
  protected merchantName = 'Croma';
  protected baseUrl = 'https://www.croma.com';

  /**
   * Scrape daily deals from Croma
   * Targets: Hot Deals, Today's Deals
   */
  async scrapeDailyDeals(): Promise<ScrapedDeal[]> {
    const deals: ScrapedDeal[] = [];
    const page = await this.createPage();

    try {
      // Croma deals page
      const url = `${this.baseUrl}/deals-of-the-day`;
      console.log(`[Croma] Scraping: ${url}`);

      await this.navigateWithRetry(page, url);

      // Wait for products to load
      await page.waitForSelector('.product-item, .product, .cp-product', {
        timeout: 15000
      }).catch(() => {
        console.log(`[Croma] No products found, trying alternative selectors`);
      });

      // Scroll to load more products (lazy loading)
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Scrape deals
      const pageDeals = await this.scrapeDealsFromPage(page);
      deals.push(...pageDeals);

      console.log(`[Croma] Found ${deals.length} deals`);
    } catch (error) {
      console.error('[Croma] Error scraping deals:', error);
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
      const deals: any[] = [];

      // Try multiple selectors for Croma's product cards
      const productCards = document.querySelectorAll(
        '.product-item, .product, .cp-product, [class*="product"], [class*="Product"]'
      );

      console.log(`Found ${productCards.length} product cards`);

      productCards.forEach((card, index) => {
        try {
          // Title - try multiple selectors
          const titleSelectors = [
            '.product-title',
            '.product-name',
            '.cp-product__title',
            'h2', 'h3', 'h4',
            '[class*="title"]',
            '[class*="Title"]',
            'a[title]'
          ];

          let title = '';
          for (const selector of titleSelectors) {
            const el = card.querySelector(selector);
            if (el) {
              title = el.textContent?.trim() || el.getAttribute('title') || '';
              if (title) break;
            }
          }

          if (!title || title.length < 5) {
            console.log(`Skipping card ${index}: no valid title`);
            return;
          }

          // Price - try multiple selectors
          const priceSelectors = [
            '.price',
            '.product-price',
            '.cp-product__price',
            '[class*="price"]',
            '[class*="Price"]',
            '.amount',
            '.new-price',
            '.sale-price'
          ];

          let priceText = '';
          for (const selector of priceSelectors) {
            const el = card.querySelector(selector);
            if (el) {
              priceText = el.textContent?.trim() || '';
              if (priceText && /\d/.test(priceText)) break;
            }
          }

          if (!priceText) {
            console.log(`Skipping card ${index}: no price found`);
            return;
          }

          // Parse price
          const priceMatch = priceText.match(/[\d,]+/);
          if (!priceMatch) {
            console.log(`Skipping card ${index}: invalid price format`);
            return;
          }

          const price = parseFloat(priceMatch[0].replace(/,/g, ''));
          if (isNaN(price) || price <= 0) {
            console.log(`Skipping card ${index}: invalid price value`);
            return;
          }

          // Original price
          const originalPriceSelectors = [
            '.old-price',
            '.original-price',
            '.mrp',
            '.list-price',
            '[class*="old-price"]',
            '[class*="mrp"]',
            'del', 's', 'strike'
          ];

          let originalPrice: number | undefined;
          for (const selector of originalPriceSelectors) {
            const el = card.querySelector(selector);
            if (el) {
              const originalText = el.textContent?.trim() || '';
              const originalMatch = originalText.match(/[\d,]+/);
              if (originalMatch) {
                const parsed = parseFloat(originalMatch[0].replace(/,/g, ''));
                if (!isNaN(parsed) && parsed > price) {
                  originalPrice = Math.round(parsed);
                  break;
                }
              }
            }
          }

          // Discount percentage
          const discountSelectors = [
            '.discount',
            '.save',
            '.offer',
            '[class*="discount"]',
            '[class*="Discount"]',
            '[class*="save"]'
          ];

          let discountPercentage: number | undefined;
          for (const selector of discountSelectors) {
            const el = card.querySelector(selector);
            if (el) {
              const discountText = el.textContent?.trim() || '';
              const match = discountText.match(/(\d+)%/);
              if (match) {
                discountPercentage = parseInt(match[1]);
                break;
              }
            }
          }

          // Product URL
          const linkEl = card.querySelector('a[href]') as HTMLAnchorElement;
          if (!linkEl) {
            console.log(`Skipping card ${index}: no product link`);
            return;
          }

          let productUrl = linkEl.href;
          if (!productUrl.startsWith('http')) {
            productUrl = `https://www.croma.com${productUrl}`;
          }

          // Image
          const imgEl = card.querySelector('img') as HTMLImageElement;
          let imageUrl = imgEl?.src || imgEl?.getAttribute('data-src') || imgEl?.getAttribute('data-lazy-src');

          // Clean image URL (remove query params for cleaner URLs)
          if (imageUrl && imageUrl.includes('?')) {
            imageUrl = imageUrl.split('?')[0];
          }

          deals.push({
            title: title.substring(0, 255), // Limit title length
            price: Math.round(price),
            originalPrice,
            discountPercentage,
            productUrl,
            imageUrl,
            merchant: 'Croma',
          });

          console.log(`Scraped deal ${index + 1}: ${title.substring(0, 50)}`);
        } catch (error) {
          console.error(`Error parsing product card ${index}:`, error);
        }
      });

      return deals;
    });
  }

  /**
   * Scrape specific product by URL
   */
  async scrapeProductByUrl(url: string): Promise<ScrapedDeal | null> {
    const page = await this.createPage();

    try {
      await this.navigateWithRetry(page, url);

      // Wait for product page to load
      await page.waitForSelector('h1, .product-title, [class*="title"]', { timeout: 10000 });

      const scrapedData = await page.evaluate(() => {
        // Title
        const titleSelectors = ['h1', '.product-title', '.product-name', '[class*="title"]'];
        let title = '';
        for (const selector of titleSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            title = el.textContent?.trim() || '';
            if (title) break;
          }
        }

        if (!title) return null;

        // Price
        const priceSelectors = ['.price', '.product-price', '.sale-price', '[class*="price"]'];
        let price: number | undefined;
        for (const selector of priceSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            const priceText = el.textContent?.trim() || '';
            const match = priceText.match(/[\d,]+/);
            if (match) {
              price = parseFloat(match[0].replace(/,/g, ''));
              if (!isNaN(price) && price > 0) break;
            }
          }
        }

        if (!price) return null;

        // Original price
        const originalPriceSelectors = ['.old-price', '.mrp', '.list-price', 'del', 's'];
        let originalPrice: number | undefined;
        for (const selector of originalPriceSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            const originalText = el.textContent?.trim() || '';
            const match = originalText.match(/[\d,]+/);
            if (match) {
              const parsed = parseFloat(match[0].replace(/,/g, ''));
              if (!isNaN(parsed) && parsed > price) {
                originalPrice = Math.round(parsed);
                break;
              }
            }
          }
        }

        // Image
        const imgEl = document.querySelector('img[class*="product"], .product-image img, img') as HTMLImageElement;
        let imageUrl = imgEl?.src || imgEl?.getAttribute('data-src');

        // Description
        const descSelectors = ['.description', '.product-description', '[class*="description"]'];
        let description = '';
        for (const selector of descSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            description = el.textContent?.trim().substring(0, 500) || '';
            if (description) break;
          }
        }

        return {
          title,
          price: Math.round(price),
          originalPrice,
          imageUrl,
          description: description || undefined,
        };
      });

      if (!scrapedData) return null;

      return {
        ...scrapedData,
        productUrl: url,
        merchant: 'Croma',
      };
    } catch (error) {
      console.error(`[Croma] Error scraping product ${url}:`, error);
      return null;
    } finally {
      await page.close();
    }
  }
}

// Export singleton instance
export const cromaService = new CromaService();
