import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { searchApi } from '../api/search';
import { categoriesApi } from '../api/categories';
import CompactDealCard from '../components/CompactDealCard';
import AdBlock from '../components/AdBlock';
import { FEATURE_FLAGS } from '../config/features';
import type { Deal, Category } from '../types';

export default function CategoryPage() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const navigate = useNavigate();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'relevance' | 'price-low' | 'price-high' | 'discount' | 'recent'>('relevance');

  // Filters
  const [selectedMerchants, setSelectedMerchants] = useState<string[]>([]);
  const [minDiscount, setMinDiscount] = useState<number>(0);
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(0);
  const [showExpired, setShowExpired] = useState(false);

  // Available merchants from current results
  const [availableMerchants, setAvailableMerchants] = useState<string[]>([]);

  useEffect(() => {
    loadCategoryAndDeals();
  }, [categorySlug]);

  useEffect(() => {
    if (category) {
      loadDeals();
    }
  }, [category, sortBy, selectedMerchants, minDiscount, minPrice, maxPrice, showExpired]);

  const loadCategoryAndDeals = async () => {
    setLoading(true);
    try {
      // Load categories to find the current one
      const categories = await categoriesApi.getCategories();
      const foundCategory = categories.find(c => c.slug === categorySlug);
      setCategory(foundCategory || null);
    } catch (error) {
      console.error('Failed to load category:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDeals = async () => {
    if (!category) return;

    setLoading(true);
    try {
      // Map sortBy to Elasticsearch format
      let esSortBy: 'relevance' | 'price_asc' | 'price_desc' | 'score' | 'date' = 'relevance';
      if (sortBy === 'price-low') esSortBy = 'price_asc';
      else if (sortBy === 'price-high') esSortBy = 'price_desc';
      else if (sortBy === 'discount') esSortBy = 'score';
      else if (sortBy === 'recent') esSortBy = 'date';

      // Use Elasticsearch to search deals by category
      const response = await searchApi.searchDeals({
        categoryIds: [category.id],
        merchants: selectedMerchants.length > 0 ? selectedMerchants : undefined,
        minPrice: minPrice > 0 ? minPrice * 100 : undefined,
        maxPrice: maxPrice > 0 ? maxPrice * 100 : undefined,
        size: 100,
        sortBy: esSortBy,
      });

      let filteredDeals = response.deals;

      // Additional client-side filtering for minDiscount
      if (minDiscount > 0) {
        filteredDeals = filteredDeals.filter(d =>
          (d.discountPercentage || 0) >= minDiscount
        );
      }

      if (!showExpired) {
        filteredDeals = filteredDeals.filter(d => !d.isExpired);
      }

      setDeals(filteredDeals);

      // Extract unique merchants from all results
      const merchants = Array.from(new Set(response.deals.map(d => d.merchant))).sort();
      setAvailableMerchants(merchants);
    } catch (error) {
      console.error('Failed to load category deals:', error);
      setDeals([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleMerchant = (merchant: string) => {
    setSelectedMerchants(prev =>
      prev.includes(merchant)
        ? prev.filter(m => m !== merchant)
        : [...prev, merchant]
    );
  };

  const clearFilters = () => {
    setSelectedMerchants([]);
    setMinDiscount(0);
    setMinPrice(0);
    setMaxPrice(0);
    setSortBy('relevance');
    setShowExpired(false);
  };

  const activeFiltersCount =
    selectedMerchants.length +
    (minDiscount > 0 ? 1 : 0) +
    (minPrice > 0 ? 1 : 0) +
    (maxPrice > 0 ? 1 : 0);

  const handleVote = async (dealId: string, voteType: number) => {
    // Implement voting logic
    console.log('Vote', dealId, voteType);
  };

  if (!category && !loading) {
    return (
      <Layout onPostDealClick={() => console.log('Post deal clicked')}>
        <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', marginBottom: 12 }}>
            Category Not Found
          </div>
          <div style={{ fontSize: 16, color: '#6b7280', marginBottom: 24 }}>
            The category "{categorySlug}" doesn't exist.
          </div>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '12px 24px',
              borderRadius: 8,
              border: 'none',
              background: '#2563eb',
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 15,
            }}
          >
            Go to Homepage
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout onPostDealClick={() => console.log('Post deal clicked')}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        {/* Page Header */}
        {category && (
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: '24px',
            marginBottom: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
              <div style={{ fontSize: 48 }}>{category.icon}</div>
              <div>
                <h1 style={{ margin: '0 0 4px', fontSize: 28, fontWeight: 700, color: '#1a1a1a' }}>
                  {category.name} Deals
                </h1>
                {category.description && (
                  <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
                    {category.description}
                  </p>
                )}
              </div>
            </div>
            {/* Horizontal ads in header */}
            {FEATURE_FLAGS.ADS_ENABLED && (
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{
                  background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                  border: '2px dashed #d1d5db',
                  borderRadius: 8,
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: 280,
                  height: 60,
                }}>
                  <span style={{ fontSize: 18, opacity: 0.5 }}>📢</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280' }}>Advertisement</span>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                  border: '2px dashed #d1d5db',
                  borderRadius: 8,
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: 280,
                  height: 60,
                }}>
                  <span style={{ fontSize: 18, opacity: 0.5 }}>📢</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280' }}>Advertisement</span>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                  border: '2px dashed #d1d5db',
                  borderRadius: 8,
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: 280,
                  height: 60,
                }}>
                  <span style={{ fontSize: 18, opacity: 0.5 }}>📢</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280' }}>Advertisement</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search Controls */}
        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              background: '#ffffff',
              color: '#374151',
              fontSize: 14,
              cursor: 'pointer',
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            <option value="relevance">Sort: Relevance</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="discount">Discount %</option>
            <option value="recent">Most Recent</option>
          </select>

          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                background: '#ffffff',
                color: '#dc2626',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 13,
                whiteSpace: 'nowrap',
              }}
            >
              Clear Filters ({activeFiltersCount})
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 20, minHeight: '60vh' }}>
          {/* Sidebar Filters */}
          <div style={{
            width: 280,
            background: '#ffffff',
            borderRight: '1px solid #e5e7eb',
            padding: 20,
            overflowY: 'auto',
            position: 'sticky',
            top: 80,
            height: 'calc(100vh - 80px)',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>
                Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
              </h3>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#dc2626',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Merchants */}
            <FilterSection title="Stores">
              {availableMerchants.map(merchant => (
                <FilterCheckbox
                  key={merchant}
                  label={merchant}
                  checked={selectedMerchants.includes(merchant)}
                  onChange={() => toggleMerchant(merchant)}
                />
              ))}
            </FilterSection>

            {/* Discount */}
            <FilterSection title="Discount">
              {[10, 25, 50, 75].map(discount => (
                <FilterCheckbox
                  key={discount}
                  label={`${discount}% off or more`}
                  checked={minDiscount === discount}
                  onChange={() => setMinDiscount(minDiscount === discount ? 0 : discount)}
                  radio
                />
              ))}
            </FilterSection>

            {/* Price Range */}
            <FilterSection title="Price">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice || ''}
                  onChange={(e) => setMinPrice(Number(e.target.value))}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid #d1d5db',
                    background: '#ffffff',
                    color: '#1a1a1a',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
                <span style={{ color: '#6b7280', fontSize: 14 }}>to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice || ''}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid #d1d5db',
                    background: '#ffffff',
                    color: '#1a1a1a',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>
            </FilterSection>

            {/* Other Options */}
            <FilterSection title="Options">
              <FilterCheckbox
                label="Show Expired Deals"
                checked={showExpired}
                onChange={() => setShowExpired(!showExpired)}
              />
            </FilterSection>
          </div>

          {/* Results */}
          <div style={{ flex: 1, padding: 24, background: '#f5f7fa' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 24, fontWeight: 700, color: '#1a1a1a' }}>
              {loading ? 'Loading...' : `${deals.length} deals found`}
            </h2>

            {loading ? (
              <div style={{
                background: '#ffffff',
                borderRadius: 12,
                padding: '60px 24px',
                textAlign: 'center',
                color: '#6b7280',
              }}>
                Loading...
              </div>
            ) : deals.length === 0 ? (
              <div>
                <div style={{
                  background: '#ffffff',
                  borderRadius: 12,
                  padding: '60px 24px',
                  textAlign: 'center',
                  color: '#6b7280',
                  marginBottom: 16,
                }}>
                  <p style={{ fontSize: 18, marginBottom: 8, fontWeight: 600, margin: 0 }}>No deals found</p>
                  <p style={{ fontSize: 14, margin: '8px 0 0' }}>Try adjusting your filters</p>
                </div>
                <AdBlock type="banner" />
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 16,
              }}>
                {deals.map(deal => (
                  <CompactDealCard
                    key={deal.id}
                    deal={deal}
                    onUpvote={() => handleVote(deal.id, deal.userVote === 1 ? 0 : 1)}
                    onDownvote={() => handleVote(deal.id, deal.userVote === -1 ? 0 : -1)}
                    onView={() => navigate(`/deal/${deal.id}`)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Sidebar - Ads */}
          <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <AdBlock type="rectangle" />
            <AdBlock type="rectangle" />
            <AdBlock type="rectangle" />
          </div>
        </div>
      </div>
    </Layout>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div style={{ marginBottom: 24 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 0',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          fontSize: 15,
          fontWeight: 600,
          color: '#1a1a1a',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <span>{title}</span>
        <span style={{ fontSize: 12 }}>{expanded ? '▼' : '▶'}</span>
      </button>
      {expanded && (
        <div style={{ marginTop: 12 }}>
          {children}
        </div>
      )}
    </div>
  );
}

function FilterCheckbox({
  label,
  checked,
  onChange,
  radio = false
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  radio?: boolean;
}) {
  return (
    <label style={{
      display: 'flex',
      alignItems: 'center',
      padding: '8px 0',
      cursor: 'pointer',
      fontSize: 14,
      color: '#374151',
    }}>
      <input
        type={radio ? 'radio' : 'checkbox'}
        checked={checked}
        onChange={onChange}
        style={{ marginRight: 10 }}
      />
      <span>{label}</span>
    </label>
  );
}
