#!/usr/bin/env tsx
/**
 * Test importing a single deal with price extraction
 */
import 'dotenv/config';
import { db } from './src/db/index.js';
import { deals, users, categories } from './src/db/schema.js';
import { eq } from 'drizzle-orm';
import { AffiliateService } from './src/services/affiliate.service.js';

console.log('\n🧪 Testing Single Deal Import with Price Extraction\n');
console.log('='.repeat(70));

(async () => {
  try {
    // 1. Get or create test user
    console.log('\n1️⃣  Getting/creating test user...');
    let [testUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, 'test-user'))
      .limit(1);

    if (!testUser) {
      const bcrypt = await import('bcrypt');
      const passwordHash = await bcrypt.hash('test123', 10);

      [testUser] = await db.insert(users).values({
        username: 'test-user',
        email: 'test@example.com',
        passwordHash,
      }).returning();
      console.log('   ✅ Created test user');
    } else {
      console.log('   ✅ Found existing test user');
    }

    // 2. Get or create category
    console.log('\n2️⃣  Getting/creating category...');
    let [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.name, 'Electronics'))
      .limit(1);

    if (!category) {
      [category] = await db.insert(categories).values({
        name: 'Electronics',
        slug: 'electronics',
      }).returning();
      console.log('   ✅ Created Electronics category');
    } else {
      console.log('   ✅ Found Electronics category');
    }

    // 3. Process URL and extract prices
    console.log('\n3️⃣  Processing Amazon URL...');
    const testUrl = 'https://amzn.to/4qdnDEQ'; // Havells mixer
    const processedUrl = await AffiliateService.processUrl(testUrl);
    console.log(`   Original: ${testUrl}`);
    console.log(`   Processed: ${processedUrl.substring(0, 80)}...`);

    console.log('\n4️⃣  Extracting price information...');
    const priceInfo = await AffiliateService.extractPriceInfo(processedUrl);
    console.log(`   Current Price: ₹${priceInfo.currentPrice}`);
    console.log(`   Original Price: ₹${priceInfo.originalPrice}`);
    console.log(`   Discount: ${priceInfo.discountPercentage}%`);

    // 4. Insert deal
    console.log('\n5️⃣  Inserting deal into database...');
    const [insertedDeal] = await db.insert(deals).values({
      title: 'Havells MIXWELL 500 W 3 Jar Mixer Grinder',
      description: 'Test deal with price extraction',
      price: priceInfo.currentPrice!,
      originalPrice: priceInfo.originalPrice,
      discountPercentage: priceInfo.discountPercentage,
      merchant: 'Amazon',
      url: processedUrl,
      userId: testUser.id,
      categoryId: category.id,
    }).returning();

    console.log('   ✅ Deal inserted successfully!');
    console.log(`   ID: ${insertedDeal.id}`);

    // 5. Verify in database
    console.log('\n6️⃣  Verifying in database...');
    const [verifiedDeal] = await db
      .select()
      .from(deals)
      .where(eq(deals.id, insertedDeal.id));

    console.log(`   Title: ${verifiedDeal.title}`);
    console.log(`   Price: ₹${verifiedDeal.price}`);
    console.log(`   Original Price: ₹${verifiedDeal.originalPrice}`);
    console.log(`   Discount: ${verifiedDeal.discountPercentage}%`);
    console.log(`   URL: ${verifiedDeal.url?.substring(0, 80)}...`);

    if (verifiedDeal.discountPercentage && verifiedDeal.discountPercentage > 0) {
      console.log('\n   ✅ SUCCESS: Discount percentage is present!');
    } else {
      console.log('\n   ❌ FAIL: Discount percentage is missing!');
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n✅ Test complete!\n');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
