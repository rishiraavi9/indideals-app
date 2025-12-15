import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { dealsApi } from '../api/deals';
import { categoriesApi } from '../api/categories';
import CompactDealCard from '../components/CompactDealCard';
import type { Deal, Category } from '../types';

export default function CategoryPage() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const navigate = useNavigate();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'best' | 'newest'>('best');

  useEffect(() => {
    loadCategoryAndDeals();
  }, [categorySlug, sortBy]);

  const loadCategoryAndDeals = async () => {
    setLoading(true);
    try {
      // Load categories to find the current one
      const categories = await categoriesApi.getCategories();
      const foundCategory = categories.find(c => c.slug === categorySlug);
      setCategory(foundCategory || null);

      if (foundCategory) {
        // Load deals for this category
        const response = await dealsApi.getDeals({
          tab: 'frontpage', // Always use frontpage to get all deals
          category: foundCategory.id,
          limit: 100,
          sort: sortBy === 'newest' ? 'newest' : 'popular', // Use sort parameter instead
        });
        setDeals(response.deals);
      }
    } catch (error) {
      console.error('Failed to load category deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async (dealId: string) => {
    // Implement voting logic
    console.log('Upvote', dealId);
  };

  const handleDownvote = async (dealId: string) => {
    // Implement voting logic
    console.log('Downvote', dealId);
  };

  if (loading) {
    return (
      <Layout onPostDealClick={() => console.log('Post deal clicked')}>
        <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, color: '#6b7280' }}>Loading {categorySlug} deals...</div>
        </div>
      </Layout>
    );
  }

  if (!category) {
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
      <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Header Section */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e5e7eb', padding: '32px 0' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 48 }}>{category.icon}</div>
            <div>
              <h1 style={{ margin: '0 0 4px', fontSize: 36, fontWeight: 900, color: '#1a1a1a' }}>
                {category.name} Deals
              </h1>
              {category.description && (
                <p style={{ margin: 0, fontSize: 16, color: '#6b7280' }}>
                  {category.description}
                </p>
              )}
            </div>
          </div>

          {/* Controls Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 }}>
            <div style={{ fontSize: 14, color: '#6b7280' }}>
              {deals.length} deal{deals.length !== 1 ? 's' : ''} found
            </div>

            {/* Sort Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 14, color: '#6b7280', fontWeight: 600 }}>Sort by</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'best' | 'newest')}
                style={{
                  padding: '8px 32px 8px 12px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  background: '#ffffff',
                  color: '#374151',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="best">Best New Deals</option>
                <option value="newest">Newest First</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Deals Grid */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
        {deals.length === 0 ? (
          <div
            style={{
              background: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              padding: '60px 24px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>
              No deals found in {category.name}
            </div>
            <div style={{ fontSize: 14, color: '#6b7280' }}>
              Check back later for new deals!
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: 16,
            }}
          >
            {deals.map((deal) => (
              <CompactDealCard
                key={deal.id}
                deal={deal}
                onUpvote={() => handleUpvote(deal.id)}
                onDownvote={() => handleDownvote(deal.id)}
                onView={() => navigate(`/deal/${deal.id}`)}
                onUserClick={(userId) => console.log('User clicked:', userId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
    </Layout>
  );
}
