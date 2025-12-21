import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dealsApi } from '../api/deals';
import { categoriesApi } from '../api/categories';
import type { Deal, Category } from '../types';
import MobileHeader from './MobileHeader';
import MobileBottomNav from './MobileBottomNav';

export default function HomePageModern() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Detect mobile viewport
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadCategories();
    loadDeals();
  }, []);

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
      const response = await dealsApi.getDeals({
        tab: 'frontpage',
        limit: 50,
      });
      setDeals(response.deals);
    } catch (error) {
      console.error('Failed to load deals:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-rotate hero slider
  useEffect(() => {
    const topDeals = deals.slice(0, 5);
    if (topDeals.length <= 1) return;

    const interval = setInterval(() => {
      setHeroSlideIndex((prev) => (prev >= topDeals.length - 1 ? 0 : prev + 1));
    }, 5000);

    return () => clearInterval(interval);
  }, [deals]);

  const topDeals = deals.slice(0, 5);
  const currentHeroDeal = topDeals[heroSlideIndex];

  // Mobile Layout
  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f7fa', paddingBottom: '70px' }}>
        <MobileHeader
          activeTab="All"
          onTabChange={() => {}}
          onSearchClick={() => {}}
        />
        <div style={{ padding: 16 }}>
          <p style={{ textAlign: 'center', color: '#6b7280' }}>Mobile version - Work in progress</p>
        </div>
        <MobileBottomNav activeItem="home" onNavigate={() => {}} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      {/* Header */}
      <div
        style={{
          background: '#131921',
          color: 'white',
          padding: '12px 24px',
        }}
      >
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 24 }}>
          {/* Logo */}
          <h1
            onClick={() => navigate('/')}
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 900,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            DesiDealsAI
          </h1>

          {/* Search Bar */}
          <div style={{ flex: 1, maxWidth: 600 }}>
            <div style={{ display: 'flex' }}>
              <input
                type="text"
                placeholder="Search for deals, products, or brands..."
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  border: 'none',
                  outline: 'none',
                  fontSize: 14,
                }}
              />
              <button
                style={{
                  padding: '0 24px',
                  background: '#febd69',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                🔍
              </button>
            </div>
          </div>

          {/* User Actions */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexShrink: 0 }}>
            {isAuthenticated && user ? (
              <>
                <div
                  onClick={() => navigate('/profile')}
                  style={{
                    cursor: 'pointer',
                    fontSize: 13,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                  }}
                >
                  <span style={{ fontSize: 11, opacity: 0.9 }}>Hello, {user.username}</span>
                  <span style={{ fontWeight: 700 }}>Account & Lists</span>
                </div>
                <button
                  onClick={logout}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    border: '1px solid #febd69',
                    color: 'white',
                    cursor: 'pointer',
                    borderRadius: 4,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/login')}
                style={{
                  padding: '8px 20px',
                  background: 'transparent',
                  border: '1px solid #febd69',
                  color: 'white',
                  cursor: 'pointer',
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Sign In
              </button>
            )}

            <button
              onClick={() => navigate('/post-deal')}
              style={{
                padding: '8px 20px',
                background: '#febd69',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 700,
                color: '#131921',
              }}
            >
              Share Deal
            </button>
          </div>
        </div>

        {/* Navigation Bar */}
        <div
          style={{
            maxWidth: 1400,
            margin: '12px auto 0',
            display: 'flex',
            gap: 24,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <div style={{ cursor: 'pointer', padding: '4px 0' }}>🔥 Today's Deals</div>
          <div onClick={() => navigate('/deals')} style={{ cursor: 'pointer', padding: '4px 0' }}>
            Popular
          </div>
          {categories.slice(0, 6).map((cat) => (
            <div
              key={cat.id}
              onClick={() => navigate(`/deals/${cat.slug}`)}
              style={{ cursor: 'pointer', padding: '4px 0' }}
            >
              {cat.icon} {cat.name}
            </div>
          ))}
        </div>
      </div>

      {/* Hero Slider */}
      {currentHeroDeal && (
        <div
          style={{
            position: 'relative',
            background: `linear-gradient(135deg, rgba(102, 126, 234, 0.9), rgba(118, 75, 162, 0.9)), url(${currentHeroDeal.imageUrl || ''})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            height: 400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ textAlign: 'center', color: 'white', maxWidth: 800, padding: 40 }}>
            <h1 style={{ fontSize: 48, fontWeight: 900, margin: '0 0 16px' }}>{currentHeroDeal.title}</h1>
            <p style={{ fontSize: 24, margin: '0 0 24px', opacity: 0.95 }}>
              Save ₹
              {currentHeroDeal.originalPrice
                ? (currentHeroDeal.originalPrice - currentHeroDeal.price).toLocaleString('en-IN')
                : currentHeroDeal.price.toLocaleString('en-IN')}
              {currentHeroDeal.discountPercentage && ` (${currentHeroDeal.discountPercentage}% OFF)`}
            </p>
            <button
              onClick={() => navigate(`/deal/${currentHeroDeal.id}`)}
              style={{
                padding: '14px 32px',
                background: '#febd69',
                border: 'none',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
                color: '#131921',
              }}
            >
              View Deal
            </button>
          </div>

          {/* Slide Indicators */}
          <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8 }}>
            {topDeals.map((_, idx) => (
              <div
                key={idx}
                onClick={() => setHeroSlideIndex(idx)}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: idx === heroSlideIndex ? 'white' : 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px' }}>
        {/* Category Sections */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading amazing deals...</div>
        ) : (
          <div style={{ display: 'grid', gap: 24 }}>
            {categories.slice(0, 4).map((category) => {
              const categoryDeals = deals.filter((d) => d.categoryId === category.id).slice(0, 4);
              if (categoryDeals.length === 0) return null;

              return (
                <div
                  key={category.id}
                  style={{
                    background: 'white',
                    borderRadius: 12,
                    padding: 24,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1a1a1a' }}>
                      {category.icon} {category.name}
                    </h2>
                    <button
                      onClick={() => navigate(`/deals/${category.slug}`)}
                      style={{
                        padding: '8px 16px',
                        background: 'transparent',
                        border: 'none',
                        color: '#0066c0',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      See all →
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                    {categoryDeals.map((deal) => (
                      <div
                        key={deal.id}
                        onClick={() => navigate(`/deal/${deal.id}`)}
                        style={{
                          cursor: 'pointer',
                          borderRadius: 8,
                          overflow: 'hidden',
                          border: '1px solid #e5e7eb',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        {/* Product Image */}
                        <div
                          style={{
                            width: '100%',
                            paddingTop: '100%',
                            background: deal.imageUrl ? `url(${deal.imageUrl})` : '#f3f4f6',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            position: 'relative',
                          }}
                        >
                          {deal.discountPercentage && (
                            <div
                              style={{
                                position: 'absolute',
                                top: 8,
                                left: 8,
                                padding: '4px 8px',
                                background: '#cc0c39',
                                color: 'white',
                                fontSize: 12,
                                fontWeight: 700,
                                borderRadius: 4,
                              }}
                            >
                              {deal.discountPercentage}% OFF
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div style={{ padding: 12 }}>
                          <div
                            style={{
                              fontSize: 14,
                              color: '#1a1a1a',
                              fontWeight: 500,
                              marginBottom: 8,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              minHeight: 40,
                            }}
                          >
                            {deal.title}
                          </div>

                          <div style={{ fontSize: 20, fontWeight: 700, color: '#cc0c39', marginBottom: 4 }}>
                            ₹{deal.price.toLocaleString('en-IN')}
                          </div>

                          {deal.originalPrice && (
                            <div style={{ fontSize: 13, color: '#6b7280' }}>
                              <span style={{ textDecoration: 'line-through' }}>
                                ₹{deal.originalPrice.toLocaleString('en-IN')}
                              </span>
                              <span style={{ marginLeft: 8, color: '#10b981', fontWeight: 600 }}>
                                Save ₹{(deal.originalPrice - deal.price).toLocaleString('en-IN')}
                              </span>
                            </div>
                          )}

                          <div
                            style={{
                              marginTop: 8,
                              fontSize: 12,
                              color: '#6b7280',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <span>⬆️ {deal.upvotes}</span>
                            <span>•</span>
                            <span>{deal.merchant}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
