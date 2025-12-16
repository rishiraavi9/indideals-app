import { BaseMerchantService, ScrapedDeal } from './base-merchant.service';
import { Page } from 'puppeteer';

export class FlipkartService extends BaseMerchantService {
  protected merchantName = 'Flipkart';
  protected baseUrl = 'https://www.flipkart.com';

  /**
   * Scrape daily deals from Flipkart
   * Targets: Electronics, Fashion, Home & Kitchen top deals
   */
  async scrapeDailyDeals(): Promise<ScrapedDeal[]> {
    const deals: ScrapedDeal[] = [];

    // Flipkart deal pages to scrape
    const dealPages = [
      '/offers-store?screen=dynamic&pk=themeViews%3DDeal-Of-The-Day~widgetType%3DdealCard~contentType%3Dneo&wid=1.dealCard.OMU',
      '/offers-store?screen=dynamic&pk=themeViews%3DElectronics-Sale~widgetType%3DdealCard~contentType%3Dneo&wid=2.dealCard.OMU',
      '/offers-store?screen=dynamic&pk=themeViews%3DFashion-Sale~widgetType%3DdealCard~contentType%3Dneo&wid=3.dealCard.OMU',
    ];

    const page = await this.createPage();

    try {
      for (const dealPage of dealPages) {
        const url = `${this.baseUrl}${dealPage}`;
        console.log(`[Flipkart] Scraping: ${url}`);

        try {
          await this.navigateWithRetry(page, url);

          // Wait for deals to load
          await page.waitForSelector('._1AtVbE', { timeout: 10000 }).catch(() => {
            console.log(`[Flipkart] No deals found on ${url}`);
          });

          // Scrape product cards
          const pageDeals = await this.scrapeDealsFromPage(page);
          deals.push(...pageDeals);

          // Add delay between pages to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`[Flipkart] Error scraping ${url}:`, error);
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

      // Flipkart product card selectors (updated as of 2024)
      const productCards = document.querySelectorAll('._1AtVbE, ._2kHMtA, .cPHDOP, ._13oc-S');

      productCards.forEach((card) => {
        try {
          // Title
          const titleEl = card.querySelector('._4rR01T, .IRpwTa, ._2WkVRV, .s1Q9rs');
          const title = titleEl?.textContent?.trim();
          if (!title) return;

          // Price
          const priceEl = card.querySelector('._30jeq3._1_WhY, ._30jeq3');
          const priceText = priceEl?.textContent?.trim();
          if (!priceText) return;
          const price = parseFloat(priceText.replace(/[₹,]/g, ''));

          // Original price
          const originalPriceEl = card.querySelector('._3I9_wc, ._3auQ3N');
          const originalPriceText = originalPriceEl?.textContent?.trim();
          let originalPrice: number | undefined;
          if (originalPriceText) {
            originalPrice = parseFloat(originalPriceText.replace(/[₹,]/g, ''));
          }

          // Discount percentage
          const discountEl = card.querySelector('._3Ay6Sb, ._3fF_st');
          const discountText = discountEl?.textContent?.trim();
          let discountPercentage: number | undefined;
          if (discountText) {
            const match = discountText.match(/(\d+)%/);
            if (match) {
              discountPercentage = parseInt(match[1]);
            }
          }

          // Product URL
          const linkEl = card.querySelector('a._1fQZEK, a._2rpwqI') as HTMLAnchorElement;
          const productUrl = linkEl?.href;
          if (!productUrl || !productUrl.includes('flipkart.com')) return;

          // Image URL
          const imgEl = card.querySelector('img._396cs4, img._2r_T1I') as HTMLImageElement;
          const imageUrl = imgEl?.src;

          // Extract product ID from URL
          const pidMatch = productUrl.match(/pid=([^&]+)/);
          const externalProductId = pidMatch ? pidMatch[1] : undefined;

          deals.push({
            title,
            price: Math.round(price),
            originalPrice: originalPrice ? Math.round(originalPrice) : undefined,
            discountPercentage,
            productUrl,
            imageUrl,
            merchant: 'Flipkart',
            externalProductId,
          });
        } catch (error) {
          console.error('Error parsing product card:', error);
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
      await page.waitForSelector('.B_NuCI, ._35KyD6', { timeout: 10000 });

      const scrapedData = await page.evaluate(() => {
        // Title
        const titleEl = document.querySelector('.B_NuCI, ._35KyD6, .yhB1nd');
        const title = titleEl?.textContent?.trim();
        if (!title) return null;

        // Price
        const priceEl = document.querySelector('._30jeq3._16Jk6d, ._30jeq3');
        const priceText = priceEl?.textContent?.trim();
        if (!priceText) return null;
        const price = parseFloat(priceText.replace(/[₹,]/g, ''));

        // Original price
        const originalPriceEl = document.querySelector('._3I9_wc._27UcVY, ._3I9_wc');
        const originalPriceText = originalPriceEl?.textContent?.trim();
        let originalPrice: number | undefined;
        if (originalPriceText) {
          originalPrice = parseFloat(originalPriceText.replace(/[₹,]/g, ''));
        }

        // Discount percentage
        const discountEl = document.querySelector('._3Ay6Sb._31Dcoz, ._3Ay6Sb');
        const discountText = discountEl?.textContent?.trim();
        let discountPercentage: number | undefined;
        if (discountText) {
          const match = discountText.match(/(\d+)%/);
          if (match) {
            discountPercentage = parseInt(match[1]);
          }
        }

        // Image
        const imgEl = document.querySelector('._396cs4._2amPTt._3qGmMb, ._396cs4') as HTMLImageElement;
        const imageUrl = imgEl?.src;

        // Description (highlights)
        const highlights = Array.from(document.querySelectorAll('._1mXcCf, .rgwDj7'))
          .map(el => el.textContent?.trim())
          .filter(Boolean)
          .join(', ');

        return {
          title,
          price: Math.round(price),
          originalPrice: originalPrice ? Math.round(originalPrice) : undefined,
          discountPercentage,
          imageUrl,
          description: highlights || undefined,
        };
      });

      if (!scrapedData) {
        return null;
      }

      // Extract product ID from URL
      const pidMatch = url.match(/pid=([^&]+)/);
      const externalProductId = pidMatch ? pidMatch[1] : undefined;

      return {
        ...scrapedData,
        productUrl: url,
        merchant: 'Flipkart',
        externalProductId,
      };
    } catch (error) {
      console.error(`[Flipkart] Error scraping product ${url}:`, error);
      return null;
    } finally {
      await page.close();
    }
  }

  /**
   * Scrape specific category deals
   */
  async scrapeCategoryDeals(categorySlug: string, maxPages = 3): Promise<ScrapedDeal[]> {
    const deals: ScrapedDeal[] = [];
    const page = await this.createPage();

    try {
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        const url = `${this.baseUrl}/${categorySlug}?page=${pageNum}`;
        console.log(`[Flipkart] Scraping category: ${url}`);

        try {
          await this.navigateWithRetry(page, url);

          // Wait for products to load
          await page.waitForSelector('._1AtVbE, ._2kHMtA', { timeout: 10000 });

          // Scrape products
          const pageDeals = await this.scrapeDealsFromPage(page);

          // Filter for deals only (has discount)
          const dealsOnly = pageDeals.filter(deal =>
            deal.discountPercentage && deal.discountPercentage >= 20
          );

          deals.push(...dealsOnly);

          // Stop if no deals found
          if (dealsOnly.length === 0) break;

          // Add delay between pages
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`[Flipkart] Error scraping category page ${pageNum}:`, error);
          break;
        }
      }
    } finally {
      await page.close();
    }

    return deals;
  }
}

// Export singleton instance
export const flipkartService = new FlipkartService();
