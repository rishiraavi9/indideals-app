import { db } from '../../db/index.js';
import { categories } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from '../../utils/logger.js';

/**
 * Category Detection Service
 * Automatically categorizes deals based on title and description using keyword matching
 */

export class CategoryDetectorService {
  /**
   * Detect category for a deal (main method)
   */
  static async detectCategory(dealTitle: string, dealDescription?: string, merchant?: string): Promise<string | null> {
    return this.detectCategoryByKeywords(dealTitle, dealDescription);
  }

  /**
   * Detect category using keywords (fallback method without API)
   */
  static async detectCategoryByKeywords(dealTitle: string, dealDescription?: string): Promise<string | null> {
    const text = `${dealTitle} ${dealDescription || ''}`.toLowerCase();

    const categoryKeywords: Record<string, string[]> = {
      'electronics': [
        'phone', 'mobile', 'smartphone', 'tablet', 'laptop', 'computer', 'monitor', 'keyboard',
        'mouse', 'charger', 'cable', 'usb', 'bluetooth', 'wireless', 'earphone', 'headphone',
        'earbuds', 'speaker', 'tv', 'television', 'smartwatch', 'watch digital', 'camera',
        'drone', 'power bank', 'extension board', 'smart plug', 'led bulb', 'led light',
        'torch', 'flashlight', 'boat', 'rockerz', 'airdopes', 'ptron', 'realme buds'
      ],
      'fashion': [
        'tshirt', 't-shirt', 'shirt', 'jeans', 'trouser', 'dress', 'shoes', 'footwear',
        'sandal', 'slipper', 'sneaker', 'jacket', 'sweater', 'hoodie', 'cap', 'hat', 'belt',
        'watch analog', 'sunglasses', 'bag', 'backpack', 'wallet', 'purse', 'kurta', 'kurti',
        'saree', 'lehenga', 'dupatta', 'shorts', 'trackpant', 'pullover', 'sweatshirt',
        'blazer', 'coat', 'scarf', 'gloves', 'socks'
      ],
      'home-kitchen': [
        'cooktop', 'induction', 'mixer', 'grinder', 'blender', 'toaster', 'kettle', 'iron',
        'vacuum', 'fan', 'heater', 'cooler', 'bedsheet', 'curtain', 'pillow', 'mattress',
        'furniture', 'chair', 'table', 'storage', 'container', 'bottle', 'cookware', 'utensil',
        'tiffin', 'lunch box', 'water bottle', 'flask', 'coffee maker', 'pressure cooker',
        'pan', 'kadai', 'shelf', 'organizer', 'bathroom', 'kitchen'
      ],
      'books': ['book', 'diary', 'notebook', 'journal', 'novel', 'textbook', 'magazine', 'comic'],
      'sports-fitness': [
        'gym', 'fitness', 'exercise', 'yoga', 'dumbbell', 'treadmill', 'cycle', 'sports',
        'cricket', 'football', 'badminton', 'tennis', 'swimming', 'floats', 'arm bands'
      ],
      'toys-kids': [
        'toy', 'kids', 'children', 'baby', 'infant', 'toddler', 'doll', 'puzzle',
        'game board', 'lego', 'car toy', 'chess', 'board game'
      ],
      'health-beauty': [
        'skincare', 'facewash', 'face wash', 'cream', 'lotion', 'shampoo', 'conditioner',
        'soap', 'perfume', 'makeup', 'lipstick', 'cosmetic', 'trimmer', 'shaver', 'razor',
        'grooming', 'deodorant', 'deo', 'body spray', 'moisturizer', 'serum', 'sunscreen'
      ],
      'groceries': [
        'grocery', 'snack', 'coffee beans', 'tea leaves', 'sugar pack', 'flour pack',
        'rice pack', 'cooking oil', 'spice pack', 'masala pack', 'atta', 'dal'
      ],
      'music-audio': [
        'guitar', 'piano', 'drum', 'musical instrument', 'microphone', 'amplifier',
        'audio interface', 'studio headphones', 'synthesizer', 'ukulele'
      ],
      'automotive': [
        'car', 'bike', 'motorcycle', 'vehicle', 'automotive', 'tire', 'battery car',
        'helmet', 'car accessory', 'mechanic tool', 'auto repair', 'a.c stabilizer',
        'voltage stabilizer'
      ],
      'gaming': [
        'playstation', 'xbox', 'nintendo', 'gaming', 'console', 'controller',
        'joystick', 'video game'
      ],
      'apple': ['iphone', 'ipad', 'macbook', 'airpods', 'apple watch', 'imac', 'mac mini'],
    };

    // Check keywords for each category
    for (const [categorySlug, keywords] of Object.entries(categoryKeywords)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          // Find category ID from slug
          const [category] = await db
            .select()
            .from(categories)
            .where(eq(categories.slug, categorySlug))
            .limit(1);

          if (category) {
            logger.info(`[CategoryDetector] Keyword match: "${keyword}" -> ${category.name} for: ${dealTitle}`);
            return category.id;
          }
        }
      }
    }

    logger.warn(`[CategoryDetector] No keyword match found for: ${dealTitle}`);
    return null;
  }
}
