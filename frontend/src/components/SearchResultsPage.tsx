import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { searchApi } from '../api/search';
import { categoriesApi } from '../api/categories';
import type { Deal, Category } from '../types';
import CompactDealCard from './CompactDealCard';

interface SearchResultsPageProps {
  initialQuery: string;
  onClose: () => void;
  onDealClick: (dealId: string) => void;
  onUserClick: (userId: string) => void;
  onVote: (dealId: string, voteType: number) => Promise<void>;
}

export default function SearchResultsPage({
  initialQuery,
  onClose,
  onDealClick,
  onUserClick: _onUserClick,
  onVote
}: SearchResultsPageProps) {
  const { t } = useTranslation();
  const [query] = useState(initialQuery);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedMerchants, setSelectedMerchants] = useState<string[]>([]);
  const [minDiscount, setMinDiscount] = useState<number>(0);
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'relevance' | 'price-low' | 'price-high' | 'discount' | 'recent'>('relevance');
  const [showExpired, setShowExpired] = useState(false);

  // Available merchants from current results
  const [availableMerchants, setAvailableMerchants] = useState<string[]>([]);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadDeals();
  }, [query, selectedCategories, selectedMerchants, minDiscount, minPrice, maxPrice, sortBy, showExpired]);

  const loadCategories = async () => {
    try {
      const cats = await categoriesApi.getCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadDeals = async () => {
    setLoading(true);
    try {
      // Map sortBy to Elasticsearch format
      let esSortBy: 'relevance' | 'price_asc' | 'price_desc' | 'score' | 'date' = 'relevance';
      if (sortBy === 'price-low') esSortBy = 'price_asc';
      else if (sortBy === 'price-high') esSortBy = 'price_desc';
      else if (sortBy === 'discount') esSortBy = 'score';
      else if (sortBy === 'recent') esSortBy = 'date';

      // Use Elasticsearch search API with synonym support
      const response = await searchApi.searchDeals({
        q: query,
        categoryIds: selectedCategories.length > 0 ? selectedCategories : undefined,
        merchants: selectedMerchants.length > 0 ? selectedMerchants : undefined,
        minPrice: minPrice > 0 ? minPrice * 100 : undefined,
        maxPrice: maxPrice > 0 ? maxPrice * 100 : undefined,
        size: 100,
        sortBy: esSortBy,
      });

      let filteredDeals = response.deals;

      // Additional client-side filtering for minDiscount (not supported by ES yet)
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
      console.error('Failed to load deals:', error);
      setDeals([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleMerchant = (merchant: string) => {
    setSelectedMerchants(prev =>
      prev.includes(merchant)
        ? prev.filter(m => m !== merchant)
        : [...prev, merchant]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedMerchants([]);
    setMinDiscount(0);
    setMinPrice(0);
    setMaxPrice(0);
    setSortBy('relevance');
    setShowExpired(false);
  };

  const activeFiltersCount =
    selectedCategories.length +
    selectedMerchants.length +
    (minDiscount > 0 ? 1 : 0) +
    (minPrice > 0 ? 1 : 0) +
    (maxPrice > 0 ? 1 : 0);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
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
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid #d1d5db',
            background: '#ffffff',
            color: '#374151',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
            whiteSpace: 'nowrap',
          }}
        >
          ← {t('common.back')}
        </button>

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
          <option value="relevance">{t('search.sortBy')}: {t('search.relevance')}</option>
          <option value="price-low">{t('search.priceLowToHigh')}</option>
          <option value="price-high">{t('search.priceHighToLow')}</option>
          <option value="discount">{t('search.discountPercent')}</option>
          <option value="recent">{t('search.mostRecent')}</option>
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
            {t('search.clearFilters')} ({activeFiltersCount})
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
              {t('search.filters')} {activeFiltersCount > 0 && `(${activeFiltersCount})`}
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
                {t('search.clearFilters')}
              </button>
            )}
          </div>

          {/* Categories */}
          <FilterSection title={t('search.categories')} defaultExpanded={false}>
            {categories.map(cat => (
              <FilterCheckbox
                key={cat.id}
                label={`${cat.icon} ${cat.name}`}
                checked={selectedCategories.includes(cat.id)}
                onChange={() => toggleCategory(cat.id)}
              />
            ))}
          </FilterSection>

          {/* Merchants */}
          <FilterSection title={t('search.stores')}>
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
          <FilterSection title={t('deals.discount')}>
            {[10, 25, 50, 75].map(discount => (
              <FilterCheckbox
                key={discount}
                label={`${discount}% ${t('search.offOrMore')}`}
                checked={minDiscount === discount}
                onChange={() => setMinDiscount(minDiscount === discount ? 0 : discount)}
                radio
              />
            ))}
          </FilterSection>

          {/* Price Range */}
          <FilterSection title={t('deals.price')}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="number"
                placeholder={t('search.minPrice')}
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
              <span style={{ color: '#6b7280', fontSize: 14 }}>{t('search.to')}</span>
              <input
                type="number"
                placeholder={t('search.maxPrice')}
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
          <FilterSection title={t('search.filters')}>
            <FilterCheckbox
              label={t('search.showExpired')}
              checked={showExpired}
              onChange={() => setShowExpired(!showExpired)}
            />
          </FilterSection>
        </div>

        {/* Results */}
        <div style={{ flex: 1, padding: 24, background: '#f5f7fa' }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 24, fontWeight: 700, color: '#1a1a1a' }}>
            {loading ? t('search.searching') : `${deals.length} ${t('search.resultsFor')} "${query}"`}
          </h2>

          {loading ? (
            <div style={{
              background: '#ffffff',
              borderRadius: 12,
              padding: '60px 24px',
              textAlign: 'center',
              color: '#6b7280',
            }}>
              {t('common.loading')}
            </div>
          ) : deals.length === 0 ? (
            <div style={{
              background: '#ffffff',
              borderRadius: 12,
              padding: '60px 24px',
              textAlign: 'center',
              color: '#6b7280',
            }}>
              <p style={{ fontSize: 18, marginBottom: 8, fontWeight: 600, margin: 0 }}>{t('search.noResults')}</p>
              <p style={{ fontSize: 14, margin: '8px 0 0' }}>{t('search.tryDifferent')}</p>
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
                  onUpvote={() => onVote(deal.id, deal.userVote === 1 ? 0 : 1)}
                  onDownvote={() => onVote(deal.id, deal.userVote === -1 ? 0 : -1)}
                  onView={() => onDealClick(deal.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterSection({ title, children, defaultExpanded = true }: { title: string; children: React.ReactNode; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

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
          color: '#374151',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: 12,
        }}
      >
        {title}
        <span style={{ fontSize: 16 }}>{expanded ? '−' : '+'}</span>
      </button>
      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
      gap: 10,
      cursor: 'pointer',
      fontSize: 14,
      color: '#374151',
      fontWeight: checked ? 600 : 400,
      padding: '4px 0',
    }}>
      <input
        type={radio ? 'radio' : 'checkbox'}
        checked={checked}
        onChange={onChange}
        style={{
          cursor: 'pointer',
          width: 16,
          height: 16,
          accentColor: '#2563eb',
        }}
      />
      {label}
    </label>
  );
}
