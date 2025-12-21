import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { categoriesApi } from '../../api/categories';
import { useHaptics } from '../../hooks/useHaptics';
import type { Category } from '../../types';

export default function MobileCategories() {
  const navigate = useNavigate();
  const { triggerHaptic } = useHaptics();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const cats = await categoriesApi.getCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (category: Category) => {
    triggerHaptic('light');
    navigate(`/deals/${category.slug}`);
  };

  // Featured sections
  const featuredSections = [
    {
      title: '🔥 Hot Right Now',
      items: [
        { icon: '📱', name: 'Mobiles', slug: 'mobiles' },
        { icon: '💻', name: 'Laptops', slug: 'laptops' },
        { icon: '👟', name: 'Footwear', slug: 'footwear' },
        { icon: '👕', name: 'Fashion', slug: 'fashion' },
      ],
    },
    {
      title: '⚡ Lightning Deals',
      items: [
        { icon: '🎧', name: 'Audio', slug: 'audio' },
        { icon: '⌚', name: 'Watches', slug: 'watches' },
        { icon: '🎮', name: 'Gaming', slug: 'gaming' },
        { icon: '📷', name: 'Cameras', slug: 'cameras' },
      ],
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="skeleton"
              style={{
                height: 90,
                borderRadius: 12,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', paddingBottom: 20 }}>
      {/* Featured Sections */}
      {featuredSections.map((section, sectionIndex) => (
        <div
          key={sectionIndex}
          style={{
            background: 'white',
            marginBottom: 8,
            padding: '16px 12px',
          }}
        >
          <h2
            style={{
              margin: '0 0 12px',
              fontSize: 16,
              fontWeight: 700,
              color: '#1a1a1a',
            }}
          >
            {section.title}
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 8,
            }}
          >
            {section.items.map((item) => (
              <button
                key={item.slug}
                onClick={() => {
                  triggerHaptic('light');
                  navigate(`/deals/${item.slug}`);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  padding: '12px 8px',
                  borderRadius: 12,
                  border: 'none',
                  background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 28 }}>{item.icon}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#374151',
                    textAlign: 'center',
                  }}
                >
                  {item.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* All Categories */}
      <div style={{ background: 'white', padding: '16px 12px' }}>
        <h2
          style={{
            margin: '0 0 16px',
            fontSize: 16,
            fontWeight: 700,
            color: '#1a1a1a',
          }}
        >
          📂 All Categories
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
          }}
        >
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                padding: '16px 8px',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                background: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: 24 }}>{category.icon || '📦'}</span>
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#374151',
                  textAlign: 'center',
                }}
              >
                {category.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Brands Section */}
      <div style={{ background: 'white', padding: '16px 12px', marginTop: 8 }}>
        <h2
          style={{
            margin: '0 0 16px',
            fontSize: 16,
            fontWeight: 700,
            color: '#1a1a1a',
          }}
        >
          🏷️ Popular Brands
        </h2>
        <div
          style={{
            display: 'flex',
            gap: 12,
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: 4,
          }}
          className="hide-scrollbar"
        >
          {['Apple', 'Samsung', 'Sony', 'Nike', 'Adidas', 'OnePlus', 'Boat', 'Xiaomi'].map((brand) => (
            <button
              key={brand}
              onClick={() => {
                triggerHaptic('light');
                navigate(`/?q=${brand}`);
              }}
              style={{
                flexShrink: 0,
                padding: '10px 20px',
                borderRadius: 20,
                border: '1px solid #d1d5db',
                background: 'white',
                fontSize: 13,
                fontWeight: 600,
                color: '#374151',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {brand}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
