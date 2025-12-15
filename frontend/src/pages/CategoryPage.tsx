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
        </div>
      </div>

      {/* Main Content Area with Sidebar */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', gap: 24 }}>
          {/* Left Sidebar - Filters */}
          <div style={{ width: 280, flexShrink: 0 }}>
            {/* Filter Header */}
            <div style={{
              background: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              padding: '20px',
              marginBottom: 16
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>
                  Show Results For
                </h3>
                <button style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}>
                  Reset All
                </button>
              </div>

              {/* Rating Filter */}
              <div style={{ marginBottom: 20 }}>
                <button
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    padding: '12px 0',
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#1a1a1a',
                    cursor: 'pointer',
                    borderBottom: '1px solid #e5e7eb'
                  }}
                >
                  <span>Rating</span>
                  <span>▼</span>
                </button>
                <div style={{ marginTop: 12 }}>
                  {[
                    { label: 'Frontpage Deals', value: 'frontpage' },
                    { label: 'Popular Deals', value: 'popular' },
                    { label: '5+ Thumbs', value: '5plus' },
                    { label: '4+ Thumbs', value: '4plus' },
                    { label: '3+ Thumbs', value: '3plus' },
                    { label: '2+ Thumbs', value: '2plus' },
                    { label: '1+ Thumbs', value: '1plus' },
                    { label: '0+ Thumbs', value: '0plus' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 0',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="radio"
                        name="rating"
                        value={option.value}
                        style={{ marginRight: 10 }}
                      />
                      <span style={{ fontSize: 14, color: '#374151' }}>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Merchants Filter */}
              <div>
                <button
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    padding: '12px 0',
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#1a1a1a',
                    cursor: 'pointer',
                    borderBottom: '1px solid #e5e7eb'
                  }}
                >
                  <span>Stores</span>
                  <span>▼</span>
                </button>
                <div style={{ marginTop: 12 }}>
                  {['Amazon', 'Flipkart', 'Myntra', 'Reliance Digital'].map((store) => (
                    <label
                      key={store}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 0',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="checkbox"
                        style={{ marginRight: 10 }}
                      />
                      <span style={{ fontSize: 14, color: '#374151' }}>{store}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Deals */}
          <div style={{ flex: 1 }}>
            {/* Sort Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 14, color: '#6b7280' }}>
                {deals.length} deal{deals.length !== 1 ? 's' : ''} found
              </div>

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

            {/* Main Content with Deals and Right Ads */}
            <div style={{ display: 'flex', gap: 20 }}>
              {/* Deals Grid */}
              <div style={{ flex: 1 }}>
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
                  <div>
                    {/* Render deals in rows with ads every 2 rows */}
                    {Array.from({ length: Math.ceil(deals.length / 5) }).map((_, rowIndex) => {
                      const rowDeals = deals.slice(rowIndex * 5, (rowIndex + 1) * 5);
                      const showAdAfterRow = (rowIndex + 1) % 2 === 0;

                      return (
                        <div key={rowIndex}>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(5, 1fr)',
                              gap: 16,
                              marginBottom: 16,
                            }}
                          >
                            {rowDeals.map((deal) => (
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

                          {/* Ad Banner every 2 rows */}
                          {showAdAfterRow && (
                            <div
                              style={{
                                background: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
                                borderRadius: 12,
                                padding: '24px',
                                color: '#ffffff',
                                textAlign: 'center',
                                marginBottom: 16,
                                minHeight: '120px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <div style={{ fontSize: 32, marginBottom: 8 }}>🎁</div>
                              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                                Sponsored Deal
                              </div>
                              <div style={{ fontSize: 13, opacity: 0.95 }}>
                                Feature your seasonal offers in this premium spot
                              </div>
                              <button
                                style={{
                                  background: '#ffffff',
                                  color: '#8fd3f4',
                                  border: 'none',
                                  borderRadius: 8,
                                  padding: '8px 16px',
                                  fontSize: 13,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  marginTop: 12,
                                }}
                              >
                                Get Started
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Sidebar - Ads */}
              <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Ad 1 */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: 12,
                    padding: '24px',
                    color: '#ffffff',
                    textAlign: 'center',
                    boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)',
                    minHeight: '250px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📢</div>
                  <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, lineHeight: 1.2 }}>
                    Your Ad Here
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.95, lineHeight: 1.5, marginBottom: 16 }}>
                    Promote your deals to thousands of shoppers daily
                  </div>
                  <button
                    style={{
                      background: '#ffffff',
                      color: '#667eea',
                      border: 'none',
                      borderRadius: 8,
                      padding: '10px 20px',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Learn More
                  </button>
                </div>

                {/* Ad 2 */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    borderRadius: 12,
                    padding: '24px',
                    color: '#ffffff',
                    textAlign: 'center',
                    boxShadow: '0 4px 16px rgba(245, 87, 108, 0.3)',
                    minHeight: '250px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🎁</div>
                  <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, lineHeight: 1.2 }}>
                    Sponsored Deal
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.95, lineHeight: 1.5, marginBottom: 16 }}>
                    Feature your seasonal offers in this premium spot
                  </div>
                  <button
                    style={{
                      background: '#ffffff',
                      color: '#f5576c',
                      border: 'none',
                      borderRadius: 8,
                      padding: '10px 20px',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Get Started
                  </button>
                </div>

                {/* Ad 3 */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                    borderRadius: 12,
                    padding: '24px',
                    color: '#ffffff',
                    textAlign: 'center',
                    boxShadow: '0 4px 16px rgba(250, 112, 154, 0.3)',
                    minHeight: '250px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ fontSize: 48, marginBottom: 16 }}>⭐</div>
                  <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, lineHeight: 1.2 }}>
                    Premium Listing
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.95, lineHeight: 1.5, marginBottom: 16 }}>
                    Boost your visibility and reach more customers
                  </div>
                  <button
                    style={{
                      background: '#ffffff',
                      color: '#fa709a',
                      border: 'none',
                      borderRadius: 8,
                      padding: '10px 20px',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Upgrade Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </Layout>
  );
}
