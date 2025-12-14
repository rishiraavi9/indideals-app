import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
// import Layout from './Layout'; // TODO: Refactor to use Layout component
import CompactDealCard from './CompactDealCard';
import MobileDealCard from './MobileDealCard';
import MobileHeader from './MobileHeader';
import MobileBottomNav from './MobileBottomNav';
import PostDealModal from './PostDealModal';
import AuthModal from './AuthModal';
import AffiliateAnalytics from './AffiliateAnalytics';
import UserProfile from './UserProfile';
import SearchResultsPage from './SearchResultsPage';
import { useAuth } from '../context/AuthContext';
import { dealsApi } from '../api/deals';
import { categoriesApi } from '../api/categories';
import { searchApi } from '../api/search';
import type { Deal, Tab, Category } from '../types';
import { trackBrowsingActivity, getPreferredCategories } from '../utils/anonymousTracking';

export default function HomePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('Frontpage');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [personalizedDeals, setPersonalizedDeals] = useState<Deal[]>([]);
  const [festiveDeals, setFestiveDeals] = useState<Deal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPostOpen, setIsPostOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [personalizedCarouselIndex, setPersonalizedCarouselIndex] = useState(0);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<Array<{title: string; merchant: string; categoryName: string}>>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [bottomNavItem, setBottomNavItem] = useState('home');

  const { user, isAuthenticated, logout } = useAuth();

  // Detect mobile viewport
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadCategories();
    loadFestiveDeals();
  }, [isAuthenticated]);

  // Load personalized deals separately (runs even for anonymous users)
  useEffect(() => {
    loadPersonalizedDeals();
  }, [isAuthenticated, deals.length]);

  useEffect(() => {
    loadDeals();
  }, [activeTab, selectedCategory, searchQuery]);

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
      const tab = activeTab.toLowerCase() as 'frontpage' | 'popular' | 'new';
      const response = await dealsApi.getDeals({
        tab,
        category: selectedCategory || undefined,
        search: searchQuery || undefined,
        limit: 40,
      });
      setDeals(response.deals);
    } catch (error) {
      console.error('Failed to load deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPersonalizedDeals = async () => {
    try {
      const preferredCategories = getPreferredCategories();

      if (isAuthenticated || preferredCategories.length > 0) {
        const response = await dealsApi.getDeals({
          tab: 'personalized',
          limit: 20,
          preferredCategories: preferredCategories.join(','),
        });
        setPersonalizedDeals(response.deals);
      } else {
        setPersonalizedDeals([]);
      }
    } catch (error) {
      console.error('Failed to load personalized deals:', error);
      setPersonalizedDeals([]);
    }
  };

  const loadFestiveDeals = async () => {
    try {
      const response = await dealsApi.getDeals({
        festive: true,
        limit: 8,
      });
      setFestiveDeals(response.deals);
    } catch (error) {
      console.error('Failed to load festive deals:', error);
      setFestiveDeals([]);
    }
  };

  const handleVote = async (dealId: string, voteType: number) => {
    if (!isAuthenticated) {
      setIsAuthOpen(true);
      return;
    }

    try {
      const result = await dealsApi.voteDeal(dealId, voteType);
      const updateDeal = (d: Deal) =>
        d.id === dealId
          ? { ...d, upvotes: result.upvotes, downvotes: result.downvotes, userVote: result.userVote }
          : d;

      setDeals((prev) => prev.map(updateDeal));
      setPersonalizedDeals((prev) => prev.map(updateDeal));
      setFestiveDeals((prev) => prev.map(updateDeal));
    } catch (error) {
      console.error('Failed to vote:', error);
    }
  };

  const handleDealView = async (dealId: string) => {
    const deal = [...deals, ...personalizedDeals, ...festiveDeals].find(d => d.id === dealId);

    if (deal) {
      trackBrowsingActivity(dealId, deal.categoryId || null, 'view');
    }

    if (isAuthenticated) {
      try {
        await dealsApi.trackActivity(dealId, 'view');
      } catch (error) {
        console.error('Failed to track view:', error);
      }
    }

    // Navigate to deal page instead of opening modal
    navigate(`/deal/${dealId}`);
  };

  // Auto-rotate personalized deals carousel
  useEffect(() => {
    if (personalizedDeals.length <= 7) return;

    const interval = setInterval(() => {
      setPersonalizedCarouselIndex((prev) =>
        prev >= personalizedDeals.length - 7 ? 0 : prev + 1
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [personalizedDeals.length]);

  const handlePersonalizedPrev = () => {
    setPersonalizedCarouselIndex((prev) =>
      prev <= 0 ? Math.max(0, personalizedDeals.length - 7) : prev - 1
    );
  };

  const handlePersonalizedNext = () => {
    setPersonalizedCarouselIndex((prev) =>
      prev >= personalizedDeals.length - 7 ? 0 : prev + 1
    );
  };

  // Autocomplete functionality
  useEffect(() => {
    const fetchAutocomplete = async () => {
      if (searchQuery.trim().length >= 2) {
        try {
          const suggestions = await searchApi.autocomplete(searchQuery, 8);
          setAutocompleteSuggestions(suggestions);
          setShowAutocomplete(true);
        } catch (error) {
          console.error('Failed to fetch autocomplete:', error);
          setAutocompleteSuggestions([]);
        }
      } else {
        setAutocompleteSuggestions([]);
        setShowAutocomplete(false);
      }
    };

    const debounceTimer = setTimeout(fetchAutocomplete, 200);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Close autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowAutocomplete(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateDeal = () => {
    if (!isAuthenticated) {
      setIsAuthOpen(true);
      return;
    }
    setIsPostOpen(true);
  };

  const handleDealCreated = () => {
    setIsPostOpen(false);
    setActiveTab('New');
    loadDeals();
  };

  // If showing analytics, render the analytics view
  if (showAnalytics) {
    return (
      <div
        style={{
          minHeight: '100vh',
          padding: 0,
          margin: 0,
          background: '#f5f7fa',
          color: '#1a1a1a',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '100%',
            margin: 0,
            padding: '8px',
            boxSizing: 'border-box',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 24,
              flexWrap: 'wrap',
            }}
          >
            <h1 style={{ margin: 0, fontSize: 36, letterSpacing: -1 }}>
              🔥 <span style={{ fontWeight: 900 }}>IndiaDeals</span>
            </h1>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowAnalytics(false)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.18)',
                  background: 'rgba(38, 118, 255, 0.65)',
                  color: '#fff',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                ← Back to Deals
              </button>
            </div>
          </div>

          <AffiliateAnalytics />
        </div>
      </div>
    );
  }

  // Mobile Layout
  if (isMobile) {
    const displayDeals = activeTab === 'For You' ? personalizedDeals : deals;

    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0a0a0a',
          paddingBottom: '70px', // Space for bottom nav
        }}
      >
        <MobileHeader
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setBottomNavItem('home');
          }}
          onSearchClick={() => setIsSearchActive(true)}
          isAuthenticated={isAuthenticated}
          onPostClick={handleCreateDeal}
        />

        {/* Mobile Deals List */}
        <div>
          {loading ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#888',
              }}
            >
              Loading deals...
            </div>
          ) : displayDeals.length === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#888',
              }}
            >
              <p style={{ margin: 0, fontSize: 16 }}>No deals found</p>
              <p style={{ margin: '8px 0 0', fontSize: 14 }}>Be the first to post one!</p>
            </div>
          ) : (
            displayDeals.map((deal) => (
              <MobileDealCard
                key={deal.id}
                deal={deal}
                onUpvote={() => handleVote(deal.id, deal.userVote === 1 ? 0 : 1)}
                onDownvote={() => handleVote(deal.id, deal.userVote === -1 ? 0 : -1)}
                onView={() => handleDealView(deal.id)}
              />
            ))
          )}
        </div>

        <MobileBottomNav
          activeItem={bottomNavItem}
          onNavigate={(item) => {
            setBottomNavItem(item);
            if (item === 'search') {
              setIsSearchActive(true);
            } else if (item === 'post') {
              handleCreateDeal();
            } else if (item === 'home') {
              setIsSearchActive(false);
              setSearchQuery('');
            }
          }}
          isAuthenticated={isAuthenticated}
        />

        {isPostOpen && (
          <PostDealModal
            onClose={() => setIsPostOpen(false)}
            onCreate={handleDealCreated}
            categories={categories}
          />
        )}

        {isAuthOpen && <AuthModal onClose={() => setIsAuthOpen(false)} />}
      </div>
    );
  }

  // Desktop Layout
  return (
    <div
      style={{
        minHeight: '100vh',
        padding: 0,
        margin: 0,
        background: '#f5f7fa',
        color: '#1a1a1a',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '100%',
          margin: 0,
          padding: 0,
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e5e7eb',
            padding: '16px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <div
            style={{
              maxWidth: '1400px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            {/* Logo */}
            <h1
              onClick={() => {
                setIsSearchActive(false);
                setSearchQuery('');
                setSelectedCategory(null);
                setActiveTab('Frontpage');
              }}
              style={{
                margin: 0,
                fontSize: 28,
                letterSpacing: -0.5,
                color: '#1a1a1a',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.7';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              🔥 <span style={{ fontWeight: 900 }}>IndiaDeals</span>
            </h1>

            {/* Search bar */}
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }} ref={searchInputRef}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    setIsSearchActive(true);
                    setShowAutocomplete(false);
                  } else if (e.key === 'Escape') {
                    setShowAutocomplete(false);
                  }
                }}
                onFocus={() => {
                  if (searchQuery.trim().length >= 2 && autocompleteSuggestions.length > 0) {
                    setShowAutocomplete(true);
                  }
                }}
                placeholder="Search for deals, products, or merchants..."
                style={{
                  width: '100%',
                  padding: '12px 110px 12px 16px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  background: '#ffffff',
                  color: '#1a1a1a',
                  outline: 'none',
                  fontSize: 15,
                  boxSizing: 'border-box',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              />
              <button
                onClick={() => {
                  if (searchQuery.trim()) {
                    setIsSearchActive(true);
                    setShowAutocomplete(false);
                  }
                }}
                style={{
                  position: 'absolute',
                  right: 6,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  padding: '8px 18px',
                  borderRadius: 6,
                  border: 'none',
                  background: searchQuery.trim() ? '#2563eb' : '#9ca3af',
                  color: 'white',
                  cursor: searchQuery.trim() ? 'pointer' : 'not-allowed',
                  fontSize: 14,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                disabled={!searchQuery.trim()}
              >
                <span>🔍</span>
                <span>Search</span>
              </button>

              {/* Autocomplete Suggestions */}
              {showAutocomplete && autocompleteSuggestions.length > 0 && !isSearchActive && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: 4,
                    background: '#ffffff',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    zIndex: 100,
                    maxHeight: '400px',
                    overflowY: 'auto',
                  }}
                >
                  {autocompleteSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        setSearchQuery(suggestion.title);
                        setShowAutocomplete(false);
                        setIsSearchActive(true);
                      }}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderBottom: index < autocompleteSuggestions.length - 1 ? '1px solid #f3f4f6' : 'none',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f9fafb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#ffffff';
                      }}
                    >
                      <div style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: '#1a1a1a',
                        marginBottom: 4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        🔍 {suggestion.title}
                      </div>
                      <div style={{
                        fontSize: 12,
                        color: '#6b7280',
                        display: 'flex',
                        gap: 8,
                      }}>
                        {suggestion.merchant && (
                          <span>at <strong>{suggestion.merchant}</strong></span>
                        )}
                        {suggestion.categoryName && (
                          <span>• {suggestion.categoryName}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User actions */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
              {isAuthenticated && user ? (
                <>
                  <div
                    onClick={() => {
                      setSelectedUserId(null);
                      setShowProfile(true);
                    }}
                    style={{
                      fontSize: 13,
                      color: '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer',
                      padding: '6px 10px',
                      borderRadius: 8,
                      transition: 'background 0.2s',
                      background: '#f9fafb',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e5e7eb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f9fafb';
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{user.username}</span>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: 999,
                        background: '#10b981',
                        color: 'white',
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      {user.reputation}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowAnalytics(true)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #d1d5db',
                      background: '#ffffff',
                      color: '#374151',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: 13,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    📊
                  </button>
                  <button
                    onClick={logout}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 8,
                      border: '1px solid #d1d5db',
                      background: '#ffffff',
                      color: '#374151',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: 13,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsAuthOpen(true)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#2563eb',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 14,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Login
                </button>
              )}

              <button
                onClick={handleCreateDeal}
                style={{
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#f97316',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 14,
                  whiteSpace: 'nowrap',
                }}
              >
                + Post Deal
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Container */}
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
          {/* Search Results */}
          {isSearchActive && searchQuery ? (
            <SearchResultsPage
              initialQuery={searchQuery}
              onClose={() => {
                setIsSearchActive(false);
                setSearchQuery('');
              }}
              onDealClick={(dealId) => {
                navigate(`/deal/${dealId}`);
                setIsSearchActive(false);
              }}
              onUserClick={(userId) => {
                setSelectedUserId(userId);
                setShowProfile(true);
                setIsSearchActive(false);
              }}
              onVote={handleVote}
            />
          ) : (
            <>
          {/* Just For You Section */}
          {personalizedDeals.length > 0 && !searchQuery && (
            <div style={{
              marginBottom: 32,
              background: '#ffffff',
              borderRadius: 12,
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1a1a1a' }}>
                    ✨ Just For You
                  </h2>
                  <span
                    style={{
                      fontSize: 13,
                      color: '#6b7280',
                      padding: '4px 10px',
                      background: '#f3f4f6',
                      borderRadius: 6,
                      fontWeight: 500,
                    }}
                  >
                    {isAuthenticated ? 'Based on your browsing' : 'Personalized for you'}
                  </span>
                </div>

                {personalizedDeals.length > 7 && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={handlePersonalizedPrev}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        border: '1px solid #d1d5db',
                        background: '#ffffff',
                        color: '#374151',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                        fontWeight: 700,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f9fafb';
                        e.currentTarget.style.borderColor = '#2563eb';
                        e.currentTarget.style.color = '#2563eb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.borderColor = '#d1d5db';
                        e.currentTarget.style.color = '#374151';
                      }}
                    >
                      ‹
                    </button>
                    <button
                      onClick={handlePersonalizedNext}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        border: '1px solid #d1d5db',
                        background: '#ffffff',
                        color: '#374151',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                        fontWeight: 700,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f9fafb';
                        e.currentTarget.style.borderColor = '#2563eb';
                        e.currentTarget.style.color = '#2563eb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.borderColor = '#d1d5db';
                        e.currentTarget.style.color = '#374151';
                      }}
                    >
                      ›
                    </button>
                  </div>
                )}
              </div>

            <div style={{ position: 'relative', overflow: 'hidden', width: '100%' }}>
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  transition: 'transform 0.5s ease-in-out',
                  transform: `translateX(calc(-${personalizedCarouselIndex} * (100% / 7 + 10px)))`,
                }}
              >
                {personalizedDeals.map((deal) => (
                  <div
                    key={deal.id}
                    style={{
                      flex: '0 0 calc((100% - 60px) / 7)',
                      minWidth: 0,
                    }}
                  >
                    <CompactDealCard
                      deal={deal}
                      onUpvote={() => handleVote(deal.id, deal.userVote === 1 ? 0 : 1)}
                      onDownvote={() => handleVote(deal.id, deal.userVote === -1 ? 0 : -1)}
                      onView={() => handleDealView(deal.id)}
                      onUserClick={(userId) => {
                        setSelectedUserId(userId);
                        setShowProfile(true);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
            </div>
          )}

          {/* Festive Deals Section */}
          {festiveDeals.length > 0 && !searchQuery && (
            <div style={{
              marginBottom: 32,
              background: '#ffffff',
              borderRadius: 12,
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1a1a1a' }}>
                  🎉 Festive & Seasonal Deals
                </h2>
                <span
                  style={{
                    fontSize: 13,
                    color: '#6b7280',
                    padding: '4px 10px',
                    background: '#fef3c7',
                    borderRadius: 6,
                    fontWeight: 500,
                  }}
                >
                  Special offers for the season
                </span>
              </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 10,
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              {festiveDeals.map((deal) => (
                <CompactDealCard
                  key={deal.id}
                  deal={deal}
                  onUpvote={() => handleVote(deal.id, deal.userVote === 1 ? 0 : 1)}
                  onDownvote={() => handleVote(deal.id, deal.userVote === -1 ? 0 : -1)}
                  onView={() => handleDealView(deal.id)}
                  onUserClick={(userId) => {
                    setSelectedUserId(userId);
                    setShowProfile(true);
                  }}
                />
              ))}
            </div>
            </div>
          )}

          {/* Categories */}
          {categories.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: 10,
                marginBottom: 20,
                overflowX: 'auto',
                paddingBottom: 8,
              }}
            >
              <button
                onClick={() => setSelectedCategory(null)}
                style={{
                  padding: '10px 18px',
                  borderRadius: 8,
                  border: !selectedCategory ? 'none' : '1px solid #d1d5db',
                  background: !selectedCategory ? '#2563eb' : '#ffffff',
                  color: !selectedCategory ? '#ffffff' : '#374151',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                  whiteSpace: 'nowrap',
                  boxShadow: !selectedCategory ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 8,
                    border: selectedCategory === cat.id ? 'none' : '1px solid #d1d5db',
                    background: selectedCategory === cat.id ? '#2563eb' : '#ffffff',
                    color: selectedCategory === cat.id ? '#ffffff' : '#374151',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 14,
                    whiteSpace: 'nowrap',
                    boxShadow: selectedCategory === cat.id ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  }}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            {(['Frontpage', 'Popular', 'New'] as Tab[]).map((tab) => {
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 8,
                    border: active ? 'none' : '1px solid #d1d5db',
                    background: active ? '#2563eb' : '#ffffff',
                    color: active ? '#ffffff' : '#374151',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 14,
                    boxShadow: active ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Deals Grid */}
          {loading ? (
            <div
              style={{
                background: '#ffffff',
                borderRadius: 12,
                padding: '60px 24px',
                textAlign: 'center',
                color: '#6b7280',
              }}
            >
              Loading deals...
            </div>
          ) : deals.length === 0 ? (
            <div
              style={{
                background: '#ffffff',
                borderRadius: 12,
                padding: '60px 24px',
                textAlign: 'center',
                color: '#6b7280',
              }}
            >
              <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>No deals found</p>
              <p style={{ margin: '8px 0 0', fontSize: 14 }}>Be the first to post one!</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 16,
                marginBottom: 40,
              }}
            >
            {deals.map((deal) => (
              <CompactDealCard
                key={deal.id}
                deal={deal}
                onUpvote={() => handleVote(deal.id, deal.userVote === 1 ? 0 : 1)}
                onDownvote={() => handleVote(deal.id, deal.userVote === -1 ? 0 : -1)}
                onView={() => handleDealView(deal.id)}
                onUserClick={(userId) => {
                  setSelectedUserId(userId);
                  setShowProfile(true);
                }}
              />
            ))}
            </div>
          )}
            </>
          )}
        </div>
      </div>

      {isPostOpen && (
        <PostDealModal
          onClose={() => setIsPostOpen(false)}
          onCreate={handleDealCreated}
          categories={categories}
        />
      )}

      {isAuthOpen && <AuthModal onClose={() => setIsAuthOpen(false)} />}

      {showProfile && (
        <UserProfile
          userId={selectedUserId || undefined}
          onClose={() => {
            setShowProfile(false);
            setSelectedUserId(null);
          }}
        />
      )}
    </div>
  );
}
