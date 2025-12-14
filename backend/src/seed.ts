import { db, users, categories, deals } from './db/index.js';
import { hashPassword } from './utils/auth.js';

const categoriesData = [
  { name: 'Electronics', slug: 'electronics', icon: '📱', description: 'Phones, laptops, accessories' },
  { name: 'Fashion', slug: 'fashion', icon: '👕', description: 'Clothing, shoes, accessories' },
  { name: 'Home & Kitchen', slug: 'home-kitchen', icon: '🏠', description: 'Appliances, furniture, decor' },
  { name: 'Books', slug: 'books', icon: '📚', description: 'Physical and digital books' },
  { name: 'Gaming', slug: 'gaming', icon: '🎮', description: 'Games, consoles, accessories' },
  { name: 'Health & Beauty', slug: 'health-beauty', icon: '💄', description: 'Skincare, makeup, wellness' },
  { name: 'Sports & Fitness', slug: 'sports-fitness', icon: '⚽', description: 'Equipment, apparel, supplements' },
  { name: 'Groceries', slug: 'groceries', icon: '🛒', description: 'Food, beverages, essentials' },
];

async function seed() {
  console.log('🌱 Starting seed...');

  try {
    // Create demo users
    console.log('Creating users...');
    const passwordHash = await hashPassword('password123');

    const [user1, user2] = await db
      .insert(users)
      .values([
        {
          email: 'demo@deals.com',
          username: 'dealfinder',
          passwordHash,
          reputation: 150,
        },
        {
          email: 'buyer@deals.com',
          username: 'smartbuyer',
          passwordHash,
          reputation: 85,
        },
      ])
      .returning();

    console.log('✅ Users created');

    // Create categories
    console.log('Creating categories...');
    const createdCategories = await db.insert(categories).values(categoriesData).returning();
    console.log('✅ Categories created');

    // Create sample deals
    console.log('Creating deals...');
    const NOW = Date.now();
    const electronicsCategory = createdCategories.find((c) => c.slug === 'electronics')!;
    const fashionCategory = createdCategories.find((c) => c.slug === 'fashion')!;
    const homeCategory = createdCategories.find((c) => c.slug === 'home-kitchen')!;

    await db.insert(deals).values([
      {
        title: 'Apple AirPods Pro (2nd Gen) with MagSafe',
        description: 'Active Noise Cancellation, Adaptive Transparency, Personalized Spatial Audio',
        price: 18999,
        originalPrice: 24900,
        discountPercentage: 24,
        merchant: 'Amazon',
        url: 'https://www.amazon.in/',
        categoryId: electronicsCategory.id,
        userId: user1.id,
        upvotes: 145,
        downvotes: 8,
        commentCount: 12,
        createdAt: new Date(NOW - 1000 * 60 * 60 * 3),
      },
      {
        title: 'Samsung Galaxy S23 5G (Cream, 256GB)',
        description: '8GB RAM, Snapdragon 8 Gen 2, 50MP Camera, 120Hz Display',
        price: 52999,
        originalPrice: 79999,
        discountPercentage: 34,
        merchant: 'Flipkart',
        url: 'https://www.flipkart.com/',
        categoryId: electronicsCategory.id,
        userId: user2.id,
        upvotes: 210,
        downvotes: 15,
        commentCount: 24,
        createdAt: new Date(NOW - 1000 * 60 * 45),
      },
      {
        title: 'Sony WH-1000XM5 Wireless Headphones',
        description: 'Industry-leading noise cancellation, 30hr battery, Premium sound quality',
        price: 26999,
        originalPrice: 32990,
        discountPercentage: 18,
        merchant: 'Croma',
        url: 'https://www.croma.com/',
        categoryId: electronicsCategory.id,
        userId: user1.id,
        upvotes: 189,
        downvotes: 6,
        commentCount: 18,
        createdAt: new Date(NOW - 1000 * 60 * 20),
      },
      {
        title: 'Levi\'s Men\'s Slim Fit Jeans',
        description: 'Classic 511 Slim Fit, Multiple colors available, Premium denim',
        price: 1899,
        originalPrice: 3999,
        discountPercentage: 53,
        merchant: 'Myntra',
        url: 'https://www.myntra.com/',
        categoryId: fashionCategory.id,
        userId: user2.id,
        upvotes: 67,
        downvotes: 4,
        commentCount: 5,
        createdAt: new Date(NOW - 1000 * 60 * 10),
      },
      {
        title: 'Philips Air Fryer HD9252/90',
        description: '4.1L capacity, Digital touchscreen, Rapid Air technology, 7 preset modes',
        price: 7999,
        originalPrice: 12995,
        discountPercentage: 38,
        merchant: 'Amazon',
        url: 'https://www.amazon.in/',
        categoryId: homeCategory.id,
        userId: user1.id,
        upvotes: 156,
        downvotes: 12,
        commentCount: 21,
        createdAt: new Date(NOW - 1000 * 60 * 60 * 1),
      },
      {
        title: 'Nothing Phone (2) 12GB RAM 256GB',
        description: 'Glyph Interface, Snapdragon 8+ Gen 1, 120Hz LTPO display, 50MP dual camera',
        price: 39999,
        originalPrice: 44999,
        discountPercentage: 11,
        merchant: 'Flipkart',
        url: 'https://www.flipkart.com/',
        categoryId: electronicsCategory.id,
        userId: user2.id,
        upvotes: 92,
        downvotes: 18,
        commentCount: 15,
        createdAt: new Date(NOW - 1000 * 60 * 5),
      },
      {
        title: 'Boat Airdopes 141 TWS Earbuds',
        description: 'Beast Mode, 42hr playback, ENx Tech, ASAP Charge, IPX4',
        price: 1299,
        originalPrice: 2990,
        discountPercentage: 57,
        merchant: 'Amazon',
        url: 'https://www.amazon.in/',
        categoryId: electronicsCategory.id,
        userId: user1.id,
        upvotes: 43,
        downvotes: 9,
        commentCount: 7,
        createdAt: new Date(NOW - 1000 * 60 * 2),
      },
    ]);

    console.log('✅ Deals created');

    console.log('\n✨ Seed completed successfully!');
    console.log('\n📝 Demo accounts:');
    console.log('   Email: demo@deals.com');
    console.log('   Email: buyer@deals.com');
    console.log('   Password: password123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();
