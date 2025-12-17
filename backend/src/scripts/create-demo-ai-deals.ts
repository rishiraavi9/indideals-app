import { db } from '../db';
import { deals, priceHistory, users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';

/**
 * Create demo AI-discovered deals to showcase AI features
 */
async function createDemoAIDeals() {
  logger.info('Creating demo AI-discovered deals...\n');

  try {
    // Get or create AI bot user
    let [aiBot] = await db
      .select()
      .from(users)
      .where(eq(users.username, 'ai-bot'))
      .limit(1);

    if (!aiBot) {
      const bcrypt = await import('bcryptjs');
      const randomPassword = await bcrypt.default.hash(Math.random().toString(36), 10);

      [aiBot] = await db
        .insert(users)
        .values({
          email: 'ai-bot@indadeals.internal',
          username: 'ai-bot',
          passwordHash: randomPassword,
          reputation: 1000,
          emailVerified: true,
        })
        .returning();

      logger.info('✅ Created AI bot user');
    }

    // Demo deals data
    const demoDealData = [
      {
        title: 'Samsung Galaxy S24 Ultra 512GB [AI Edition]',
        description: 'Latest flagship with AI camera, S Pen, 200MP camera, Snapdragon 8 Gen 3',
        price: 119999,
        originalPrice: 134999,
        merchant: 'Flipkart',
        url: 'https://www.flipkart.com/samsung-galaxy-s24-ultra',
        imageUrl: 'https://rukminim2.flixcart.com/image/312/312/xif0q/mobile/8/9/v/-original-imah2fjd7wfd9ksh.jpeg',
        categoryId: null,
      },
      {
        title: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
        description: 'Industry-leading noise cancellation, 30hr battery, Premium sound quality',
        price: 26990,
        originalPrice: 34990,
        merchant: 'Amazon India',
        url: 'https://www.amazon.in/Sony-WH-1000XM5-Cancelling-Headphones',
        imageUrl: 'https://m.media-amazon.com/images/I/61vJn4+RdlL._SL1500_.jpg',
        categoryId: null,
      },
      {
        title: 'LG 139 cm (55 inch) OLED Ultra HD 4K Smart TV',
        description: 'OLED Display, AI ThinQ, Dolby Vision IQ, 120Hz refresh rate',
        price: 89990,
        originalPrice: 139990,
        merchant: 'Flipkart',
        url: 'https://www.flipkart.com/lg-oled-55-inch-4k-smart-tv',
        imageUrl: 'https://rukminim2.flixcart.com/image/312/312/xif0q/television/9/v/j/-original-imagwvj9gpnynfzn.jpeg',
        categoryId: null,
      },
      {
        title: 'Apple MacBook Air M3 13.6" (8GB RAM, 256GB SSD)',
        description: 'M3 Chip, Liquid Retina Display, 18hr battery, Midnight color',
        price: 114990,
        originalPrice: 134900,
        merchant: 'Amazon India',
        url: 'https://www.amazon.in/Apple-MacBook-Air-M3-13',
        imageUrl: 'https://m.media-amazon.com/images/I/71f5Eu5lJSL._SL1500_.jpg',
        categoryId: null,
      },
      {
        title: 'Dyson V15 Detect Absolute Cordless Vacuum Cleaner',
        description: 'Laser dust detection, 60min runtime, HEPA filtration, LCD screen',
        price: 54900,
        originalPrice: 66900,
        merchant: 'Flipkart',
        url: 'https://www.flipkart.com/dyson-v15-detect-absolute',
        imageUrl: 'https://rukminim2.flixcart.com/image/312/312/xif0q/vacuum-cleaner/9/l/z/-original-imagvfzqhhzqgzmt.jpeg',
        categoryId: null,
      },
      {
        title: 'Canon EOS R6 Mark II Mirrorless Camera (Body Only)',
        description: '24.2MP Full-Frame, 40fps continuous shooting, 4K 60p video',
        price: 214995,
        originalPrice: 249995,
        merchant: 'Amazon India',
        url: 'https://www.amazon.in/Canon-EOS-R6-Mark-II',
        imageUrl: 'https://m.media-amazon.com/images/I/81Qv3Y9vHrL._SL1500_.jpg',
        categoryId: null,
      },
      {
        title: 'Boat Airdopes 141 TWS Earbuds with 42H Playback',
        description: 'Quad Mics ENx, ASAP Charge, IWP Technology, IPX4 water resistant',
        price: 1299,
        originalPrice: 4990,
        merchant: 'Flipkart',
        url: 'https://www.flipkart.com/boat-airdopes-141-tws-earbuds',
        imageUrl: 'https://rukminim2.flixcart.com/image/312/312/xif0q/headphone/n/y/h/-original-imagrdfzhqzmz6b2.jpeg',
        categoryId: null,
      },
      {
        title: 'OnePlus 12R 5G (Iron Gray, 8GB RAM, 128GB Storage)',
        description: 'Snapdragon 8 Gen 2, 120Hz AMOLED, 100W SUPERVOOC, 50MP Camera',
        price: 39999,
        originalPrice: 45999,
        merchant: 'Amazon India',
        url: 'https://www.amazon.in/OnePlus-12R-Iron-Gray-128GB',
        imageUrl: 'https://m.media-amazon.com/images/I/71xUxJvc8xL._SL1500_.jpg',
        categoryId: null,
      },
    ];

    let created = 0;
    let skipped = 0;

    for (const dealData of demoDealData) {
      try {
        // Check if deal already exists
        const [existing] = await db
          .select()
          .from(deals)
          .where(eq(deals.title, dealData.title))
          .limit(1);

        if (existing) {
          logger.info(`⏭️  Skipped: ${dealData.title} (already exists)`);
          skipped++;
          continue;
        }

        // Calculate discount
        const discountPct = Math.round(
          ((dealData.originalPrice - dealData.price) / dealData.originalPrice) * 100
        );

        // Create deal
        const [newDeal] = await db
          .insert(deals)
          .values({
            ...dealData,
            discountPercentage: discountPct,
            userId: aiBot.id,
            upvotes: Math.floor(Math.random() * 200) + 50, // Random upvotes 50-250
            downvotes: Math.floor(Math.random() * 20), // Random downvotes 0-20
            viewCount: Math.floor(Math.random() * 500) + 100, // Random views 100-600
            commentCount: Math.floor(Math.random() * 15), // Random comments 0-15
          })
          .returning();

        // Add to price history
        await db.insert(priceHistory).values({
          dealId: newDeal.id,
          price: dealData.price,
          originalPrice: dealData.originalPrice,
          merchant: dealData.merchant,
          source: 'scraper',
        });

        logger.info(`✅ Created: ${dealData.title}`);
        logger.info(`   Price: ₹${dealData.price} (${discountPct}% off)`);
        created++;
      } catch (error) {
        logger.error(`❌ Error creating deal: ${dealData.title}`, error);
      }
    }

    logger.info(`\n🎉 Demo deals creation complete!`);
    logger.info(`   Created: ${created} deals`);
    logger.info(`   Skipped: ${skipped} deals (already existed)`);
    logger.info(`\nThese deals will now appear on your homepage with AI quality scores!`);

    return { created, skipped };
  } catch (error) {
    logger.error('Error creating demo AI deals:', error);
    throw error;
  }
}

export { createDemoAIDeals };

// Run if called directly
createDemoAIDeals()
  .then(() => {
    logger.info('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Failed:', error);
    process.exit(1);
  });
