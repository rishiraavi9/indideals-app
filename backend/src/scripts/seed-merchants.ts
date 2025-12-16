import { db } from '../db';
import { merchants } from '../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Seed merchant data for automated scraping
 */
async function seedMerchants() {
  console.log('Seeding merchants...');

  const merchantData = [
    {
      name: 'Flipkart',
      slug: 'flipkart',
      logo: 'https://static-assets-web.flixcart.com/batman-returns/batman-returns/p/images/fkheaderlogo_exploreplus-44005d.svg',
      websiteUrl: 'https://www.flipkart.com',
      apiType: 'scraper',
      isActive: true,
      scrapingEnabled: true,
      scrapingIntervalHours: 6,
      scraperConfig: {
        dealsPages: [
          '/offers-store?screen=dynamic&pk=themeViews%3DDeal-Of-The-Day',
          '/offers-store?screen=dynamic&pk=themeViews%3DElectronics-Sale',
          '/offers-store?screen=dynamic&pk=themeViews%3DFashion-Sale',
        ],
        selectors: {
          productCard: '._1AtVbE, ._2kHMtA, .cPHDOP',
          title: '._4rR01T, .IRpwTa, ._2WkVRV',
          price: '._30jeq3._1_WhY, ._30jeq3',
          originalPrice: '._3I9_wc, ._3auQ3N',
          discount: '._3Ay6Sb, ._3fF_st',
          image: 'img._396cs4, img._2r_T1I',
          link: 'a._1fQZEK, a._2rpwqI',
        },
      },
    },
    {
      name: 'Amazon India',
      slug: 'amazon',
      logo: 'https://m.media-amazon.com/images/G/31/gno/sprites/nav-logo-2x._V349476296_.png',
      websiteUrl: 'https://www.amazon.in',
      apiType: 'scraper',
      isActive: true,
      scrapingEnabled: true,
      scrapingIntervalHours: 6,
      scraperConfig: {
        dealsPages: [
          '/deals',
          '/gp/goldbox',
        ],
        selectors: {
          dealCard: '[data-testid="deal-card"], .DealCard-module__card, .octopus-dlp-asin-section',
          title: '[data-testid="deal-title"], .DealTitle-module__truncate',
          price: '.a-price-whole, .DealPrice-module__price',
          originalPrice: '.a-price.a-text-price .a-offscreen',
          discount: '.savingPriceOverride, .DealBadge-module__text',
          image: 'img[data-testid="deal-image"], img.dealImage',
          link: 'a[href*="/dp/"], a[href*="/gp/product/"]',
        },
      },
    },
    {
      name: 'Myntra',
      slug: 'myntra',
      logo: 'https://constant.myntassets.com/web/assets/img/MyntraWebSprite_27_01_2021.png',
      websiteUrl: 'https://www.myntra.com',
      apiType: 'scraper',
      isActive: false, // Enable later
      scrapingEnabled: false,
      scrapingIntervalHours: 12,
      scraperConfig: {
        dealsPages: [
          '/shop/deals',
        ],
      },
    },
    {
      name: 'Ajio',
      slug: 'ajio',
      logo: 'https://assets.ajio.com/static/img/Ajio-Logo.svg',
      websiteUrl: 'https://www.ajio.com',
      apiType: 'scraper',
      isActive: false, // Enable later
      scrapingEnabled: false,
      scrapingIntervalHours: 12,
      scraperConfig: {
        dealsPages: [
          '/shop/sale',
        ],
      },
    },
  ];

  for (const merchant of merchantData) {
    try {
      // Check if merchant already exists
      const [existing] = await db
        .select()
        .from(merchants)
        .where(eq(merchants.slug, merchant.slug))
        .limit(1);

      if (existing) {
        // Update existing merchant
        await db
          .update(merchants)
          .set({
            ...merchant,
            updatedAt: new Date(),
          })
          .where(eq(merchants.id, existing.id));

        console.log(`✅ Updated merchant: ${merchant.name}`);
      } else {
        // Insert new merchant
        await db.insert(merchants).values(merchant);
        console.log(`✅ Created merchant: ${merchant.name}`);
      }
    } catch (error) {
      console.error(`❌ Error seeding merchant ${merchant.name}:`, error);
    }
  }

  console.log('✅ Merchant seeding complete!');
}

// Run seed if called directly
if (require.main === module) {
  seedMerchants()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error seeding merchants:', error);
      process.exit(1);
    });
}

export { seedMerchants };
