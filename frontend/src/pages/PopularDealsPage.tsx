import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { dealsApi } from '../api/deals';
import AdBlock from '../components/AdBlock';
import type { Deal } from '../types';

export default function PopularDealsPage() {
  const navigate = useNavigate();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'newest' | 'popular'>('newest');

  useEffect(() => {
    loadDeals();
  }, [sortBy]);

  const loadDeals = async () => {
    setLoading(true);
    try {
      const response = await dealsApi.getDeals({
        tab: sortBy === 'newest' ? 'frontpage' : 'popular',
        limit: 100,
      });
      setDeals(response.deals);
    } catch (error) {
      console.error('Failed to load deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString('en-IN')}`;
  };

  const calculateSavings = (price: number, originalPrice?: number | null) => {
    if (!originalPrice) return null;
    return originalPrice - price;
  };

  return (
    <Layout onPostDealClick={() => console.log('Post deal clicked')}>
      <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Header Section */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e5e7eb', padding: '24px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 32, fontWeight: 900, color: '#1a1a1a' }}>
            🔥 Popular Deals
          </h1>
          <p style={{ margin: 0, fontSize: 16, color: '#6b7280' }}>
            Trending deals sorted by community votes and activity
          </p>

          {/* Sort Controls */}
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, color: '#6b7280', fontWeight: 600 }}>Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'popular')}
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
              <option value="newest">Newest</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'flex', gap: 24 }}>
          {/* Deals Table */}
          <div style={{ flex: 1 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', fontSize: 16, color: '#6b7280' }}>
                Loading deals...
              </div>
            ) : deals.length === 0 ? (
              <div>
                <div style={{ textAlign: 'center', padding: '60px 0', fontSize: 16, color: '#6b7280', marginBottom: 16, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
                  No deals found
                </div>
                <AdBlock type="banner" />
              </div>
            ) : (
          <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            {/* Table Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr 120px 100px 100px',
                gap: 16,
                padding: '16px 20px',
                background: '#f9fafb',
                borderBottom: '1px solid #e5e7eb',
                fontSize: 12,
                fontWeight: 700,
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              <div></div>
              <div>Deals</div>
              <div style={{ textAlign: 'center' }}>Price</div>
              <div style={{ textAlign: 'center' }}>Rating</div>
              <div style={{ textAlign: 'center' }}>Activity</div>
            </div>

            {/* Table Rows */}
            {deals.map((deal, index) => {
              const score = deal.score ?? deal.upvotes - deal.downvotes;
              const savings = calculateSavings(deal.price, deal.originalPrice);
              const showAdAfter = (index + 1) % 10 === 0 && index < deals.length - 1;

              return (
                <>
                  <div
                  key={deal.id}
                  onClick={() => navigate(`/deal/${deal.id}`)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr 120px 100px 100px',
                    gap: 16,
                    padding: '16px 20px',
                    borderBottom: '1px solid #f3f4f6',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                  }}
                >
                  {/* Image/Icon */}
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 8,
                      background: '#f3f4f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                      flexShrink: 0,
                    }}
                  >
                    {deal.category?.icon || '🏷️'}
                  </div>

                  {/* Deal Info */}
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: '#1a1a1a',
                        marginBottom: 6,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {deal.title}
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>
                      at <span style={{ fontWeight: 600, color: '#374151' }}>{deal.merchant}</span>
                      {deal.user && (
                        <>
                          {' • '}
                          Posted by{' '}
                          <span style={{ fontWeight: 600, color: '#2563eb' }}>{deal.user.username}</span>
                        </>
                      )}
                    </div>
                    {deal.category && (
                      <div
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#1e40af',
                        }}
                      >
                        {deal.category.icon} {deal.category.name}
                      </div>
                    )}
                  </div>

                  {/* Price */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981' }}>
                      {formatPrice(deal.price)}
                    </div>
                    {deal.originalPrice && (
                      <>
                        <div style={{ fontSize: 12, color: '#9ca3af', textDecoration: 'line-through' }}>
                          {formatPrice(deal.originalPrice)}
                        </div>
                        {savings && (
                          <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>
                            Save {formatPrice(savings)}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Rating */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: score > 50 ? '#10b981' : '#3b82f6',
                      }}
                    >
                      {score > 0 ? '+' : ''}{score}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>
                      {deal.upvotes} 👍 {deal.downvotes} 👎
                    </div>
                  </div>

                  {/* Activity */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <div style={{ fontSize: 13, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                      💬 {deal.commentCount}
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                      👁️ {deal.viewCount || 0}
                    </div>
                  </div>
                </div>

                {/* Ad Banner every 10 rows */}
                {showAdAfter && (
                  <div style={{ padding: 16, borderBottom: '1px solid #f3f4f6' }}>
                    <AdBlock type="banner" />
                  </div>
                )}
              </>
              );
            })}
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
    </div>
    </Layout>
  );
}
