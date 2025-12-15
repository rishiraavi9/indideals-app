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
import PreferencesModal from './PreferencesModal';
import { useAuth } from '../context/AuthContext';
import { dealsApi } from '../api/deals';
import { categoriesApi } from '../api/categories';
import { searchApi } from '../api/search';
import type { Deal, Tab, Category } from '../types';
import { trackBrowsingActivity, getPreferredCategories } from '../utils/anonymousTracking';
import { getFrontpageFilters, hasPreferences } from '../utils/userPreferences';

export default function HomePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('All');
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
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

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
      // Handle "All" tab - shows all deals without specific tab filtering
      if (activeTab === 'All') {
        const response = await dealsApi.getDeals({
          tab: 'frontpage', // Use frontpage as base, but get more deals
          category: selectedCategory || undefined,
          search: searchQuery || undefined,
          limit: 100,
        });
        setDeals(response.deals);
      } else {
        const tab = activeTab.toLowerCase() as 'frontpage' | 'popular' | 'new';

        // For Frontpage tab, apply user preferences
        let response;
        if (tab === 'frontpage' && hasPreferences()) {
          const filters = getFrontpageFilters();
          response = await dealsApi.getDeals({
            tab,
            category: selectedCategory || undefined,
            search: searchQuery || undefined,
            limit: 100, // Fetch more to filter client-side
          });

          // Client-side filtering based on preferences
          let filteredDeals = response.deals;

          // Filter by liked/disliked categories
          if (filters.likedCategories.length > 0) {
            // Show only liked categories (or deals without category)
            filteredDeals = filteredDeals.filter(
              (deal) =>
                !deal.categoryId ||
                filters.likedCategories.includes(deal.categoryId) ||
                (filters.showFireDealsOnly && deal.trending) // Always show fire deals if enabled
            );
          } else if (filters.dislikedCategories.length > 0) {
            // Hide disliked categories
            filteredDeals = filteredDeals.filter(
              (deal) =>
                !deal.categoryId ||
                !filters.dislikedCategories.includes(deal.categoryId) ||
                (filters.showFireDealsOnly && deal.trending)
            );
          }

          // Filter expired deals if enabled
          if (filters.hideExpired) {
            const now = new Date();
            filteredDeals = filteredDeals.filter(
              (deal) =>
                !deal.expiresAt || new Date(deal.expiresAt) > now
            );
          }

          // Filter fire deals only if enabled
          if (filters.showFireDealsOnly) {
            filteredDeals = filteredDeals.filter((deal) => deal.trending || deal.verified);
          }

          setDeals(filteredDeals.slice(0, 40));
        } else {
          // For Popular/New tabs or Frontpage without preferences, use normal loading
          response = await dealsApi.getDeals({
            tab,
            category: selectedCategory || undefined,
            search: searchQuery || undefined,
            limit: 40,
          });
          setDeals(response.deals);
        }
      }
    } catch (error) {
      console.error('Failed to load deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPersonalizedDeals = async () => {
    try {
      const preferredCategories = getPreferredCategories();

      // For authenticated users or users with browsing history
      if (isAuthenticated || preferredCategories.length > 0) {
        const response = await dealsApi.getDeals({
          tab: 'personalized',
          limit: 20,
          preferredCategories: preferredCategories.join(','),
        });
        setPersonalizedDeals(response.deals);
      } else {
        // For new/first-time visitors, show trending deals as fallback
        const response = await dealsApi.getDeals({
          tab: 'popular',
          limit: 20,
        });
        setPersonalizedDeals(response.deals);
      }
    } catch (error) {
      console.error('Failed to load personalized deals:', error);
      setPersonalizedDeals([]);
    }
  };

  const loadFestiveDeals = async () => {
    try {
      const response = await dealsApi.getDeals({
        limit: 100,
      });
      // Filter deals that have festiveTags or seasonalTag
      const festive = response.deals.filter(deal =>
        (deal.festiveTags && deal.festiveTags.length > 0) ||
        deal.seasonalTag
      ).slice(0, 8);
      setFestiveDeals(festive);
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
      // Track upvote for anonymous personalization
      if (voteType === 1) {
        const deal = [...deals, ...personalizedDeals, ...festiveDeals].find(d => d.id === dealId);
        if (deal) {
          trackBrowsingActivity(dealId, deal.categoryId || null, 'upvote');
        }
      }

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
      prev <= 0 ? Math.max(0, personalizedDeals.length - 6) : prev - 1
    );
  };

  const handlePersonalizedNext = () => {
    setPersonalizedCarouselIndex((prev) =>
      prev >= personalizedDeals.length - 6 ? 0 : prev + 1
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

        {/* Main Content Container - Two Column Layout */}
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '12px 24px' }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            {/* Main Content Area */}
            <div style={{ flex: '1 1 auto', minWidth: 0 }}>
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
              marginBottom: 8,
              background: '#ffffff',
              borderRadius: 12,
              padding: '10px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1a1a1a' }}>
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
                    {isAuthenticated
                      ? 'Based on your activity'
                      : getPreferredCategories().length > 0
                        ? 'Based on your browsing'
                        : 'Popular deals'}
                  </span>
                </div>

                {personalizedDeals.length > 6 && (
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
                  transform: `translateX(calc(-${personalizedCarouselIndex} * (calc(100% / 6) + 10px)))`,
                }}
              >
                {personalizedDeals.map((deal) => (
                  <div
                    key={deal.id}
                    style={{
                      flex: '0 0 calc((100% - 50px) / 6)',
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
              marginBottom: 8,
              background: '#ffffff',
              borderRadius: 12,
              padding: '10px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1a1a1a' }}>
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
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: 10,
                width: '100%',
              }}
            >
              {festiveDeals.slice(0, 6).map((deal) => (
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

          {/* Category Dropdown + Tabs on One Line */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {/* Category Dropdown */}
              {categories.length > 0 && (
                <select
                  value={selectedCategory || ''}
                  onChange={(e) => setSelectedCategory(e.target.value || null)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    background: '#ffffff',
                    color: '#374151',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 14,
                    minWidth: '180px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    outline: 'none',
                  }}
                >
                  <option value="">📂 All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Vertical Divider */}
              <div style={{
                width: 1,
                height: 32,
                background: '#d1d5db',
              }} />

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 10 }}>
                {(['All', 'Frontpage', 'Popular', 'New'] as Tab[]).map((tab) => {
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
            </div>

            {/* Personalize Frontpage Button - Right Corner */}
            <button
              onClick={() => setIsPreferencesOpen(true)}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                background: '#ffffff',
                color: '#374151',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14,
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
              title="Customize what appears on your Frontpage"
            >
              <span style={{ fontSize: 16 }}>⚙️</span>
              <span>Personalize Frontpage</span>
            </button>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 40 }}>
              {/* Render deals in groups of 12 (2 rows × 6 columns) with ads in between */}
              {Array.from({ length: Math.ceil(deals.length / 12) }).map((_, groupIndex) => {
                const startIdx = groupIndex * 12;
                const endIdx = Math.min(startIdx + 12, deals.length);
                const groupDeals = deals.slice(startIdx, endIdx);

                return (
                  <div key={`group-${groupIndex}`}>
                    {/* Deals Grid - 6 columns */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(6, 1fr)',
                        gap: 16,
                        marginBottom: groupIndex < Math.ceil(deals.length / 12) - 1 ? 20 : 0,
                      }}
                    >
                      {groupDeals.map((deal) => (
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

                    {/* Horizontal Ad Banner after every 2 rows (except the last group) */}
                    {groupIndex < Math.ceil(deals.length / 12) - 1 && (
                      <div
                        style={{
                          background: 'linear-gradient(135deg, #ffa726 0%, #fb8c00 100%)',
                          borderRadius: 12,
                          padding: '32px',
                          textAlign: 'center',
                          color: '#ffffff',
                          marginTop: 20,
                          boxShadow: '0 4px 16px rgba(251, 140, 0, 0.3)',
                        }}
                      >
                        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
                          🎯 Sponsored Deals
                        </div>
                        <div style={{ fontSize: 14, opacity: 0.95 }}>
                          Your advertisement could be here - Reach thousands of deal hunters daily
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
            </>
          )}
            </div>

            {/* Ad Sidebar */}
            <div style={{ flex: '0 0 300px', display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 20 }}>
              {/* Ad 1 - General Promotion */}
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

              {/* Ad 2 - Sponsored Deal */}
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

              {/* Ad 3 - Brand Spotlight */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #ffa500 0%, #ff6347 100%)',
                  borderRadius: 12,
                  padding: '24px',
                  color: '#ffffff',
                  textAlign: 'center',
                  boxShadow: '0 4px 16px rgba(255, 165, 0, 0.3)',
                  minHeight: '250px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 16 }}>⭐</div>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, lineHeight: 1.2 }}>
                  Brand Spotlight
                </div>
                <div style={{ fontSize: 13, opacity: 0.95, lineHeight: 1.5, marginBottom: 16 }}>
                  Showcase your brand to engaged deal hunters
                </div>
                <button
                  style={{
                    background: '#ffffff',
                    color: '#ff6347',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 20px',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Advertise Now
                </button>
              </div>
            </div>
          </div>
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

      {isPreferencesOpen && (
        <PreferencesModal
          onClose={() => setIsPreferencesOpen(false)}
          categories={categories}
        />
      )}

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
