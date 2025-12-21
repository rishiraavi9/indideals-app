import type { Category } from '../../types';

interface MobileCategoryScrollProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelect: (categoryId: string | null) => void;
}

// Default category icons if not provided
const defaultIcons: Record<string, string> = {
  electronics: '📱',
  fashion: '👕',
  home: '🏠',
  beauty: '💄',
  sports: '⚽',
  toys: '🎮',
  books: '📚',
  grocery: '🛒',
  automotive: '🚗',
  health: '💊',
};

export default function MobileCategoryScroll({
  categories,
  selectedCategory,
  onSelect,
}: MobileCategoryScrollProps) {
  const allCategories = [
    { id: null, name: 'All', icon: '🔥', slug: 'all' },
    ...categories.map(cat => ({
      ...cat,
      icon: cat.icon || defaultIcons[cat.slug.toLowerCase()] || '📦',
    })),
  ];

  return (
    <div style={{
      background: 'white',
      padding: '12px 0',
      borderBottom: '1px solid #e5e7eb',
    }}>
      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          padding: '0 12px',
          WebkitOverflowScrolling: 'touch',
          scrollSnapType: 'x mandatory',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
        }}
        className="hide-scrollbar"
      >
        {allCategories.map((category) => {
          const isSelected = category.id === selectedCategory;
          return (
            <button
              key={category.id || 'all'}
              onClick={() => onSelect(category.id)}
              style={{
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '8px 12px',
                borderRadius: 12,
                border: 'none',
                background: isSelected
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : '#f5f5f5',
                cursor: 'pointer',
                minWidth: 70,
                scrollSnapAlign: 'start',
                transition: 'all 0.2s',
              }}
            >
              <span style={{
                fontSize: 24,
                filter: isSelected ? 'brightness(1.2)' : 'none',
              }}>
                {category.icon}
              </span>
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: isSelected ? 'white' : '#374151',
                whiteSpace: 'nowrap',
              }}>
                {category.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
