import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { dealsApi } from '../../api/deals';
import { categoriesApi } from '../../api/categories';
import { useHaptics } from '../../hooks/useHaptics';
import { isFeatureEnabled } from '../../config/features';
import MobileDealCard from './MobileDealCard';
import type { Deal, Category } from '../../types';

type SearchTab = 'stores' | 'categories';

// Popular stores with their logos
const popularStores = [
  { name: 'Amazon', icon: '🛒', color: '#FF9900' },
  { name: 'Flipkart', icon: '🛍️', color: '#2874F0' },
  { name: 'Myntra', icon: '👗', color: '#FF3F6C' },
  { name: 'Ajio', icon: '👕', color: '#000000' },
  { name: 'Nykaa', icon: '💄', color: '#FC2779' },
  { name: 'Croma', icon: '📺', color: '#00A9A6' },
  { name: 'Tata Cliq', icon: '🏬', color: '#F36D00' },
  { name: 'Meesho', icon: '🎁', color: '#F43397' },
  { name: 'Snapdeal', icon: '📦', color: '#E40046' },
  { name: 'Reliance Digital', icon: '⚡', color: '#001F5C' },
  { name: 'Vijay Sales', icon: '🔌', color: '#FF6B00' },
  { name: 'JioMart', icon: '🏪', color: '#003087' },
];

export default function MobileSearch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { triggerHaptic } = useHaptics();
  const inputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<SearchTab>('stores');
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [results, setResults] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'ai-score' | 'discount' | 'price-low' | 'price-high' | 'recent'>('relevance');

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await categoriesApi.getCategories();
        setCategories(cats);
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };
    loadCategories();
  }, []);

  const handleSearch = async (searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q.trim()) return;

    triggerHaptic('light');
    setLoading(true);
    setHasSearched(true);

    try {
      const response = await dealsApi.getDeals({
        search: q,
        limit: 50,
      });
      setResults(response.deals);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStoreClick = async (storeName: string) => {
    triggerHaptic('light');
    setQuery(storeName);
    setLoading(true);
    setHasSearched(true);

    try {
      // Use merchant filter for store clicks for better results
      const response = await dealsApi.getDeals({
        merchant: storeName,
        limit: 50,
      });

      // If no results with merchant filter, fallback to search
      if (response.deals.length === 0) {
        const searchResponse = await dealsApi.getDeals({
          search: storeName,
          limit: 50,
        });
        setResults(searchResponse.deals);
      } else {
        setResults(response.deals);
      }
    } catch (error) {
      console.error('Store search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = async (categoryId: string, categoryName: string) => {
    triggerHaptic('light');
    setQuery(categoryName);
    setLoading(true);
    setHasSearched(true);

    try {
      // Use category filter for category clicks
      const response = await dealsApi.getDeals({
        category: categoryId,
        limit: 50,
      });
      setResults(response.deals);
    } catch (error) {
      console.error('Category search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDealClick = (dealId: string) => {
    navigate(`/deal/${dealId}`);
  };

  const handleVote = async (dealId: string, voteType: number) => {
    try {
      await dealsApi.voteDeal(dealId, voteType);
      setResults(prev => prev.map(d =>
        d.id === dealId
          ? { ...d, userVote: d.userVote === voteType ? 0 : voteType }
          : d
      ));
    } catch (error) {
      console.error('Vote error:', error);
    }
  };

  // Sort results based on selected option
  const sortedResults = [...results].sort((a, b) => {
    switch (sortBy) {
      case 'ai-score':
        return (b.aiScore || 0) - (a.aiScore || 0);
      case 'discount':
        return (b.discountPercentage || 0) - (a.discountPercentage || 0);
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'recent':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:
        return 0; // Keep original relevance order
    }
  });

  // Alphabetically sorted stores for "All Stores" section
  const allStores = [...popularStores].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a1a1a',
    }}>
      {/* Search Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        background: '#1a1a1a',
        zIndex: 10,
        paddingTop: 'env(safe-area-inset-top)',
      }}>
        {/* Title */}
        <div style={{
          padding: '16px 16px 12px',
          textAlign: 'center',
        }}>
          <h1 style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 600,
            color: 'white',
          }}>
            {t('search.title')}
          </h1>
        </div>

        {/* Search Input */}
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{
            position: 'relative',
          }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              placeholder={t('search.placeholderLong')}
              style={{
                width: '100%',
                height: 44,
                padding: '0 40px',
                border: 'none',
                borderRadius: 8,
                fontSize: 15,
                outline: 'none',
                background: '#2a2a2a',
                color: 'white',
              }}
            />
            {/* Search Icon */}
            <div
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9ca3af"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>

            {/* Clear Button */}
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  setHasSearched(false);
                }}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  border: 'none',
                  background: '#444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#9ca3af',
                  fontSize: 18,
                  fontWeight: 300,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        {!hasSearched && (
          <div style={{
            display: 'flex',
            padding: '0 16px',
          }}>
            <button
              onClick={() => setActiveTab('stores')}
              style={{
                flex: 1,
                padding: '12px 0',
                border: 'none',
                borderBottom: activeTab === 'stores' ? '2px solid #667eea' : '2px solid transparent',
                background: 'transparent',
                color: activeTab === 'stores' ? 'white' : '#6b7280',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t('search.stores')}
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              style={{
                flex: 1,
                padding: '12px 0',
                border: 'none',
                borderBottom: activeTab === 'categories' ? '2px solid #667eea' : '2px solid transparent',
                background: 'transparent',
                color: activeTab === 'categories' ? 'white' : '#6b7280',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t('search.categories')}
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {hasSearched ? (
        // Search Results
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
              <div style={{
                width: 32,
                height: 32,
                border: '3px solid #333',
                borderTopColor: '#667eea',
                borderRadius: '50%',
                margin: '0 auto 12px',
                animation: 'spin 0.8s linear infinite',
              }} />
              {t('search.searching')}
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : results.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: 40,
              color: '#6b7280',
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'white' }}>{t('search.noResults')}</p>
              <p style={{ margin: '8px 0 0', fontSize: 14 }}>{t('search.tryDifferent')}</p>
            </div>
          ) : (
            <>
              <div style={{
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: 14, color: '#6b7280' }}>
                  {results.length} {t('search.resultsFor')} "{query}"
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid #444',
                    background: '#2a2a2a',
                    color: 'white',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="relevance">{t('search.relevance')}</option>
                  <option value="ai-score">{t('search.aiScore')}</option>
                  <option value="discount">{t('search.discountPercent')}</option>
                  <option value="price-low">{t('search.priceLowToHigh')}</option>
                  <option value="price-high">{t('search.priceHighToLow')}</option>
                  <option value="recent">{t('search.mostRecent')}</option>
                </select>
              </div>
              {sortedResults.map((deal, index) => (
                <div key={deal.id}>
                  <MobileDealCard
                    deal={deal}
                    onPress={() => handleDealClick(deal.id)}
                    onVote={(voteType) => handleVote(deal.id, voteType)}
                  />
                  {/* Show ad after every 4 deals if ads are enabled */}
                  {isFeatureEnabled('adsEnabled') && (index + 1) % 4 === 0 && index < sortedResults.length - 1 && (
                    <AdBlock />
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      ) : activeTab === 'stores' ? (
        // Stores View
        <div style={{ padding: '16px' }}>
          {/* Popular Stores Grid */}
          <h2 style={{
            margin: '0 0 16px',
            fontSize: 14,
            fontWeight: 600,
            color: '#9ca3af',
          }}>
            {t('search.popularStores')}
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16,
            marginBottom: 32,
          }}>
            {popularStores.slice(0, 12).map((store) => (
              <button
                key={store.name}
                onClick={() => handleStoreClick(store.name)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                }}>
                  {store.icon}
                </div>
                <span style={{
                  fontSize: 11,
                  color: '#9ca3af',
                  textAlign: 'center',
                  lineHeight: 1.2,
                }}>
                  {store.name}
                </span>
              </button>
            ))}
          </div>

          {/* All Stores List */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}>
            <h2 style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              color: '#9ca3af',
            }}>
              {t('search.allStores')}
            </h2>
            <span style={{
              fontSize: 12,
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}>
              A-Z
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </span>
          </div>

          {allStores.map((store) => (
            <button
              key={store.name}
              onClick={() => handleStoreClick(store.name)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '14px 0',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid #2a2a2a',
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: '#2a2a2a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                color: 'white',
                fontWeight: 600,
              }}>
                {store.name.charAt(0)}
              </div>
              <span style={{
                flex: 1,
                fontSize: 15,
                color: 'white',
                textAlign: 'left',
              }}>
                {store.name}
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ))}
        </div>
      ) : (
        // Categories View
        <div style={{ padding: '16px' }}>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.id, category.name)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '14px 0',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid #2a2a2a',
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: '#2a2a2a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
              }}>
                {getCategoryIcon(category.name)}
              </div>
              <span style={{
                flex: 1,
                fontSize: 15,
                color: 'white',
                textAlign: 'left',
              }}>
                {category.name}
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function getCategoryIcon(categoryName: string): string {
  const icons: Record<string, string> = {
    'Electronics': '📱',
    'Fashion': '👗',
    'Home': '🏠',
    'Beauty': '💄',
    'Sports': '⚽',
    'Books': '📚',
    'Toys': '🧸',
    'Grocery': '🛒',
    'Health': '💊',
    'Automotive': '🚗',
    'Gaming': '🎮',
    'Appliances': '🔌',
  };

  for (const [key, icon] of Object.entries(icons)) {
    if (categoryName.toLowerCase().includes(key.toLowerCase())) {
      return icon;
    }
  }
  return '📦';
}

// Ad block component matching MobileDealCard dimensions
function AdBlock() {
  return (
    <div style={{
      background: '#1a1a1a',
      display: 'flex',
      padding: '16px',
      gap: 12,
      borderBottom: '1px solid #2a2a2a',
      alignItems: 'center',
      minHeight: 104,
    }}>
      {/* Ad placeholder image area */}
      <div style={{
        width: 72,
        height: 72,
        borderRadius: 8,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ fontSize: 28 }}>📢</span>
      </div>

      {/* Ad content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#667eea',
          marginBottom: 4,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          Sponsored
        </div>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: 'white',
          marginBottom: 4,
        }}>
          Your Ad Could Be Here
        </div>
        <div style={{
          fontSize: 12,
          color: '#6b7280',
        }}>
          Reach thousands of deal seekers
        </div>
      </div>

      {/* CTA */}
      <div style={{
        padding: '8px 12px',
        background: '#667eea',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
        color: 'white',
        whiteSpace: 'nowrap',
      }}>
        Learn More
      </div>
    </div>
  );
}
