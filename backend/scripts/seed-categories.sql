-- Comprehensive category seeding for IndiaDeals
-- Based on Slickdeals category structure

-- First, clear existing categories (optional - comment out if you want to keep existing)
-- DELETE FROM categories;

-- Insert comprehensive categories
INSERT INTO categories (name, slug, description, icon) VALUES
  -- Technology & Electronics
  ('Apple', 'apple', 'Apple products - iPhones, iPads, MacBooks, AirPods', '🍎'),
  ('Computers & Laptops', 'computers', 'Laptops, desktops, monitors, and computer accessories', '💻'),
  ('Tech & Electronics', 'tech-electronics', 'Consumer electronics, gadgets, and tech accessories', '🔌'),
  ('Phones & Tablets', 'phones', 'Smartphones, tablets, and mobile accessories', '📱'),
  ('Video Games', 'video-games', 'Gaming consoles, video games, and gaming accessories', '🎮'),
  ('TV & Home Theater', 'tv', 'Televisions, streaming devices, soundbars, and home entertainment', '📺'),
  ('Cameras & Photography', 'cameras', 'DSLR, mirrorless, action cameras, and photography equipment', '📷'),

  -- Fashion & Accessories
  ('Clothing & Accessories', 'clothing-accessories', 'Mens, womens, and kids fashion and accessories', '👕'),
  ('Shoes', 'shoes', 'Footwear for men, women, and children', '👟'),
  ('Bags & Luggage', 'bags-luggage', 'Backpacks, handbags, suitcases, and travel gear', '🎒'),
  ('Watches & Jewelry', 'watches-jewelry', 'Watches, jewelry, and fashion accessories', '⌚'),

  -- Home & Living
  ('Home & Home Improvement', 'home-improvement', 'Tools, hardware, furniture, and home renovation', '🏠'),
  ('Grocery & Household', 'grocery', 'Groceries, household essentials, and personal care', '🛒'),
  ('Kitchen & Dining', 'kitchen-dining', 'Cookware, appliances, utensils, and dining essentials', '🍳'),
  ('Furniture & Decor', 'furniture-decor', 'Home furniture, decor, and interior design', '🛋️'),
  ('Garden & Outdoor', 'garden-outdoor', 'Gardening tools, plants, outdoor furniture', '🌱'),

  -- Health & Wellness
  ('Health & Beauty', 'health-beauty', 'Skincare, makeup, wellness, and personal care', '💄'),
  ('Fitness & Sports', 'fitness-sports', 'Exercise equipment, sportswear, and athletic gear', '🏋️'),
  ('Medical & Pharmacy', 'medical-pharmacy', 'Healthcare products, medicines, and medical devices', '💊'),

  -- Entertainment & Leisure
  ('Entertainment & Events', 'entertainment', 'Movies, music, events, and entertainment subscriptions', '🎭'),
  ('Movies & Streaming', 'movies-streaming', 'Movie tickets, streaming subscriptions, and digital content', '🎬'),
  ('Books & Magazines', 'books-magazines', 'Books, e-books, audiobooks, and magazine subscriptions', '📚'),
  ('Music & Audio', 'music-audio', 'Headphones, speakers, instruments, and audio equipment', '🎧'),

  -- Automotive
  ('Autos & Vehicles', 'autos', 'Car accessories, parts, tools, and automotive services', '🚗'),
  ('Auto Parts & Accessories', 'auto-parts', 'Vehicle parts, accessories, and maintenance items', '🔧'),

  -- Services & Experiences
  ('Travel & Vacations', 'travel-vacations', 'Flight tickets, hotels, vacation packages, and travel gear', '✈️'),
  ('Restaurants & Dining', 'restaurants', 'Restaurant deals, food delivery, and dining offers', '🍽️'),
  ('Services', 'services', 'Professional services, subscriptions, and digital services', '⚙️'),

  -- Family & Kids
  ('Babies & Kids', 'babies-kids', 'Baby products, toys, kids clothing, and parenting essentials', '👶'),
  ('Toys & Games', 'toys-games', 'Childrens toys, board games, and educational products', '🧸'),
  ('Education & Learning', 'education', 'Online courses, educational materials, and learning tools', '🎓'),

  -- Pets
  ('Pets & Animals', 'pets', 'Pet food, toys, accessories, and pet care products', '🐾'),

  -- Office & Business
  ('Office & School Supplies', 'office-school', 'Stationery, office equipment, and school supplies', '✏️'),

  -- Special Categories
  ('Flowers & Gifts', 'flowers-gifts', 'Gift items, flower delivery, and greeting cards', '🎁'),
  ('Freebies & Samples', 'freebies', 'Free products, samples, and promotional giveaways', '🆓'),
  ('Occasions & Events', 'occasions', 'Festival specials, seasonal deals, and event promotions', '🎉'),

  -- Specialty
  ('Sporting Goods', 'sporting-goods', 'Sports equipment, outdoor gear, and athletic accessories', '⚽'),
  ('Finance & Insurance', 'finance', 'Financial services, insurance, and investment products', '💰'),
  ('Other', 'other', 'Miscellaneous deals and uncategorized products', '❓')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  slug = EXCLUDED.slug;

-- Verify the insert
SELECT
  COUNT(*) as total_categories,
  COUNT(DISTINCT slug) as unique_slugs
FROM categories;

-- Display all categories
SELECT id, name, slug, icon FROM categories ORDER BY name;
