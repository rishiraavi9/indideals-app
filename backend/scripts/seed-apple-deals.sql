-- Add Apple deals to the database
DO $$
DECLARE
  apple_category_id UUID;
  demo_user_id UUID;
BEGIN
  -- Get Apple category ID
  SELECT id INTO apple_category_id FROM categories WHERE slug = 'apple' LIMIT 1;

  -- Get existing demo user
  SELECT id INTO demo_user_id FROM users WHERE email = 'demo@deals.com' LIMIT 1;

  -- Insert Apple AirPods Pro deal
  INSERT INTO deals (
    title,
    description,
    price,
    original_price,
    merchant,
    url,
    image_url,
    category_id,
    user_id,
    upvotes,
    downvotes,
    comment_count,
    view_count,
    expires_at,
    created_at
  ) VALUES (
    'Apple AirPods Pro (2nd Gen) - USB-C',
    'Active Noise Cancellation, Adaptive Audio, up to 6 hours listening time. USB-C charging case.',
    21999,
    24900,
    'Amazon',
    'https://amazon.in/airpods-pro',
    'https://m.media-amazon.com/images/I/61SUj2aKoEL._SL1500_.jpg',
    apple_category_id,
    demo_user_id,
    412,
    20,
    89,
    6200,
    NOW() + INTERVAL '4 days',
    NOW() - INTERVAL '3 hours'
  );

  -- Insert Apple iPhone 15 deal
  INSERT INTO deals (
    title,
    description,
    price,
    original_price,
    merchant,
    url,
    image_url,
    category_id,
    user_id,
    upvotes,
    downvotes,
    comment_count,
    view_count,
    expires_at,
    created_at
  ) VALUES (
    'Apple iPhone 15 (128GB) - Massive Discount!',
    'Latest iPhone with A17 chip, 48MP camera, and Dynamic Island. Limited stock.',
    69999,
    79900,
    'Flipkart',
    'https://flipkart.com/iphone-15',
    'https://rukminim2.flixcart.com/image/416/416/xif0q/mobile/k/l/l/-original-imagtc5fz9spysyk.jpeg',
    apple_category_id,
    demo_user_id,
    389,
    18,
    78,
    5600,
    NOW() + INTERVAL '3 days',
    NOW() - INTERVAL '5 hours'
  );

  RAISE NOTICE 'Apple deals added successfully!';
END $$;
