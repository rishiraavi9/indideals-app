import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppHeader from './AppHeader';
import SearchBar from './SearchBar';
import CompactDealCard from './CompactDealCard';
import MobileDealCard from './MobileDealCard';
import MobileHeader from './MobileHeader';
import MobileBottomNav from './MobileBottomNav';
import PostDealModal from './PostDealModal';
import SearchResultsPage from './SearchResultsPage';
import PreferencesModal from './PreferencesModal';
import AdBlock from './AdBlock';
import { useAuth } from '../context/AuthContext';
import { dealsApi } from '../api/deals';
import { categoriesApi } from '../api/categories';
import type { Deal, Tab, Category } from '../types';
import { trackBrowsingActivity, getPreferredCategories } from '../utils/anonymousTracking';
import ForYouTab from './ForYouTab';

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('All');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [personalizedDeals, setPersonalizedDeals] = useState<Deal[]>([]);
  const [festiveDeals, setFestiveDeals] = useState<Deal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPostOpen, setIsPostOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [personalizedCarouselIndex, setPersonalizedCarouselIndex] = useState(0);
  const [festiveCarouselIndex, setFestiveCarouselIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [bottomNavItem, setBottomNavItem] = useState('home');
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'price_low' | 'price_high' | 'discount' | 'popular'>('newest');
  const [selectedMerchant, setSelectedMerchant] = useState<string | null>(null);
  const [availableMerchants, setAvailableMerchants] = useState<string[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalDeals, setTotalDeals] = useState(0);
  const DEALS_PER_PAGE = 150; // 25 rows x 6 columns for desktop

  const { isAuthenticated } = useAuth();

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
    // Reset to page 1 when filters change
    setCurrentPage(1);
    loadDeals(false, 1);
  }, [activeTab, selectedCategory, selectedMerchant, searchQuery, sortBy]);

  const loadCategories = async () => {
    try {
      const cats = await categoriesApi.getCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  // Sort function
  const sortDeals = (dealsToSort: Deal[]) => {
    const sorted = [...dealsToSort];
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'price_low':
        return sorted.sort((a, b) => a.price - b.price);
      case 'price_high':
        return sorted.sort((a, b) => b.price - a.price);
      case 'discount':
        return sorted.sort((a, b) => (b.discountPercentage || 0) - (a.discountPercentage || 0));
      case 'popular':
        return sorted.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
      default:
        return sorted;
    }
  };

  const loadDeals = async (loadMore = false, page?: number) => {
    if (loadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setDeals([]);
    }

    // For desktop pagination, use page number; for mobile, use offset
    const pageToLoad = page ?? currentPage;
    const limit = isMobile ? 50 : DEALS_PER_PAGE;
    const offset = isMobile
      ? (loadMore ? deals.length : 0)
      : (pageToLoad - 1) * DEALS_PER_PAGE;

    try {
      // Use 'new' tab when New is selected to get deals sorted by creation date from backend
      const response = await dealsApi.getDeals({
        tab: activeTab === 'New' ? 'new' : 'frontpage',
        category: selectedCategory || undefined,
        search: searchQuery || undefined,
        limit,
        offset,
      });

      // Extract unique merchants from all deals (for dropdown) - only on initial load
      if (!loadMore && pageToLoad === 1) {
        const merchants = [...new Set(response.deals.map(d => d.merchant))].sort();
        setAvailableMerchants(merchants);
      }

      let filteredDeals = response.deals;

      // Apply merchant filter
      if (selectedMerchant) {
        filteredDeals = filteredDeals.filter(d => d.merchant === selectedMerchant);
      }

      // Apply client-side filtering based on active tab
      if (activeTab === 'Hot Deals') {
        // 70%+ discount
        filteredDeals = filteredDeals.filter(d => (d.discountPercentage || 0) >= 70);
      } else if (activeTab === 'Great Deals') {
        // 50%+ discount
        filteredDeals = filteredDeals.filter(d => (d.discountPercentage || 0) >= 50);
      } else if (activeTab === 'Budget Buys') {
        // Under ₹500
        filteredDeals = filteredDeals.filter(d => d.price < 500);
      } else if (activeTab === 'New') {
        // New today
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        filteredDeals = filteredDeals.filter(d => new Date(d.createdAt) > oneDayAgo);
      }
      // 'All' tab shows everything without filtering

      // Update hasMore based on pagination
      setHasMore(response.pagination?.hasMore ?? response.deals.length === limit);

      // Estimate total deals for pagination display (rough estimate)
      if (response.pagination?.hasMore) {
        setTotalDeals(Math.max(totalDeals, offset + response.deals.length + limit));
      } else {
        setTotalDeals(offset + response.deals.length);
      }

      // Apply sorting and merge with existing deals if loading more (mobile only)
      if (loadMore && isMobile) {
        setDeals(prev => sortDeals([...prev, ...filteredDeals]));
      } else {
        setDeals(sortDeals(filteredDeals));
      }
    } catch (error) {
      // Error handled silently - empty deals will be shown
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Handle page change for desktop pagination
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    loadDeals(false, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      navigate('/login');
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
          ? { ...d, upvotes: result.upvotes, downvotes: result.downvotes, score: result.score, userVote: result.userVote }
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

  // Auto-rotate festive deals carousel
  useEffect(() => {
    if (festiveDeals.length <= 7) return;

    const interval = setInterval(() => {
      setFestiveCarouselIndex((prev) =>
        prev >= festiveDeals.length - 7 ? 0 : prev + 1
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [festiveDeals.length]);

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

  const handleFestivePrev = () => {
    setFestiveCarouselIndex((prev) =>
      prev <= 0 ? Math.max(0, festiveDeals.length - 6) : prev - 1
    );
  };

  const handleFestiveNext = () => {
    setFestiveCarouselIndex((prev) =>
      prev >= festiveDeals.length - 6 ? 0 : prev + 1
    );
  };

  const handleCreateDeal = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    navigate('/post-deal');
  };

  const handleDealCreated = () => {
    setIsPostOpen(false);
    setActiveTab('New');
    loadDeals();
  };

  // Mobile Layout
  if (isMobile) {
    const displayDeals = deals;

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
              {t('home.loadingDeals')}
            </div>
          ) : displayDeals.length === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#888',
              }}
            >
              <p style={{ margin: 0, fontSize: 16 }}>{t('home.noDeals')}</p>
              <p style={{ margin: '8px 0 0', fontSize: 14 }}>{t('home.beFirstToPost')}</p>
            </div>
          ) : (
            <>
              {displayDeals.map((deal) => (
                <MobileDealCard
                  key={deal.id}
                  deal={deal}
                  onUpvote={() => handleVote(deal.id, deal.userVote === 1 ? 0 : 1)}
                  onDownvote={() => handleVote(deal.id, deal.userVote === -1 ? 0 : -1)}
                  onView={() => handleDealView(deal.id)}
                />
              ))}

              {/* Mobile Load More Button */}
              {hasMore && (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <button
                    onClick={() => loadDeals(true)}
                    disabled={loadingMore}
                    style={{
                      width: '100%',
                      padding: '14px 24px',
                      borderRadius: 10,
                      border: 'none',
                      background: loadingMore ? '#333' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: '#ffffff',
                      cursor: loadingMore ? 'not-allowed' : 'pointer',
                      fontWeight: 600,
                      fontSize: 15,
                    }}
                  >
                    {loadingMore ? t('home.loadingDeals') : t('home.loadMore', 'Load More Deals')}
                  </button>
                </div>
              )}
            </>
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
        {/* Header - Using Shared AppHeader Component */}
        <AppHeader
          onLogoClick={() => {
            setIsSearchActive(false);
            setSearchQuery('');
            setSelectedCategory(null);
            setActiveTab('All');
          }}
          searchComponent={
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={(q) => {
                setSearchQuery(q);
                setIsSearchActive(true);
              }}
            />
          }
          onShareDealClick={handleCreateDeal}
        />

        {/* AI Hero Section */}
        {!isSearchActive && !searchQuery && (
          <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px 20px' }}>
            <div
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 16,
                padding: '60px 40px',
                textAlign: 'center',
                color: 'white',
                boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)',
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, opacity: 0.95, letterSpacing: '0.5px' }}>
                🤖 {t('home.aiPowered')}
              </div>
              <h1 style={{ fontSize: 42, fontWeight: 800, margin: '0 0 16px', lineHeight: 1.2, letterSpacing: '-0.5px' }}>
                {t('home.heroTitle')}
              </h1>
              <p style={{ fontSize: 18, margin: '0 0 40px', opacity: 0.95, maxWidth: 700, marginInline: 'auto', lineHeight: 1.6 }}>
                {t('home.heroSubtitle')}
              </p>

              {/* Live Stats */}
              <div style={{ display: 'flex', gap: 48, justifyContent: 'center', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 140 }}>
                  <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 4 }}>
                    {deals.length > 0 ? `${(deals.length * 50).toLocaleString()}+` : '10,000+'}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 500 }}>{t('home.dealsAnalyzed')}</div>
                </div>
                <div style={{ minWidth: 140 }}>
                  <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 4 }}>₹2.5Cr+</div>
                  <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 500 }}>{t('home.totalSavings')}</div>
                </div>
                <div style={{ minWidth: 140 }}>
                  <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 4 }}>100+</div>
                  <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 500 }}>{t('home.storesMonitored')}</div>
                </div>
                <div style={{ minWidth: 140 }}>
                  <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 4 }}>24/7</div>
                  <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 500 }}>{t('home.aiPriceTracking')}</div>
                </div>
              </div>
            </div>
          </div>
        )}

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
                  onUserClick={() => {
                    navigate("/profile");
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
                    ✨ {t('home.justForYou')}
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
                      ? t('home.basedOnActivity')
                      : getPreferredCategories().length > 0
                        ? t('home.basedOnBrowsing')
                        : t('home.popularDeals')}
                  </span>
                </div>

                {personalizedDeals.length > 6 && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={handlePersonalizedPrev}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid #d1d5db',
                        background: '#ffffff',
                        color: '#374151',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 16,
                      }}
                    >
                      ←
                    </button>
                    <button
                      onClick={handlePersonalizedNext}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid #d1d5db',
                        background: '#ffffff',
                        color: '#374151',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 16,
                      }}
                    >
                      →
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
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1a1a1a' }}>
                    🎉 {t('home.festiveSeasonal')}
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
                    {t('home.specialOffers')}
                  </span>
                </div>

                {/* Navigation arrows */}
                {festiveDeals.length > 6 && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={handleFestivePrev}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid #d1d5db',
                        background: '#ffffff',
                        color: '#374151',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 16,
                      }}
                    >
                      ←
                    </button>
                    <button
                      onClick={handleFestiveNext}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid #d1d5db',
                        background: '#ffffff',
                        color: '#374151',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 16,
                      }}
                    >
                      →
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
                  transform: `translateX(calc(-${festiveCarouselIndex} * (calc(100% / 6) + 10px)))`,
                }}
              >
                {festiveDeals.map((deal) => (
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

                    />
                  </div>
                ))}
              </div>
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
                  <option value="">📂 {t('home.allCategories')}</option>
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
                {(['All', 'For You', 'Hot Deals', 'Great Deals', 'Budget Buys', 'New'] as Tab[]).map((tab) => {
                  const active = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        padding: '10px 20px',
                        borderRadius: 8,
                        border: active ? 'none' : '1px solid #d1d5db',
                        background: active ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#ffffff',
                        color: active ? '#ffffff' : '#374151',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 14,
                        boxShadow: active ? '0 2px 6px rgba(102, 126, 234, 0.3)' : 'none',
                      }}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>

              {/* Vertical Divider */}
              <div style={{
                width: 1,
                height: 32,
                background: '#d1d5db',
              }} />

              {/* Sort By Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, color: '#6b7280', fontWeight: 500 }}>{t('home.sortBy')}:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    background: '#ffffff',
                    color: '#374151',
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="newest">{t('home.newestFirst')}</option>
                  <option value="discount">{t('home.highestDiscount')}</option>
                  <option value="price_low">{t('search.priceLowToHigh')}</option>
                  <option value="price_high">{t('search.priceHighToLow')}</option>
                  <option value="popular">{t('home.mostPopular')}</option>
                </select>
              </div>

              {/* Vertical Divider */}
              <div style={{
                width: 1,
                height: 32,
                background: '#d1d5db',
              }} />

              {/* Retailers Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, color: '#6b7280', fontWeight: 500 }}>{t('home.retailer')}:</span>
                <select
                  value={selectedMerchant || ''}
                  onChange={(e) => setSelectedMerchant(e.target.value || null)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    background: '#ffffff',
                    color: '#374151',
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                    outline: 'none',
                    minWidth: 140,
                  }}
                >
                  <option value="">{t('home.allRetailers')}</option>
                  {availableMerchants.map((merchant) => (
                    <option key={merchant} value={merchant}>
                      {merchant}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* For You Tab - AI Personalized Recommendations */}
          {activeTab === 'For You' ? (
            <ForYouTab
              onVote={handleVote}
              onView={handleDealView}
            />
          ) : (
          <>
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
              {t('home.loadingDeals')}
            </div>
          ) : deals.length === 0 ? (
            <div>
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: 12,
                  padding: '60px 24px',
                  textAlign: 'center',
                  color: '#6b7280',
                  marginBottom: 16,
                }}
              >
                <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{t('home.noDeals')}</p>
                <p style={{ margin: '8px 0 0', fontSize: 14 }}>{t('home.beFirstToPost')}</p>
              </div>
              <AdBlock type="banner" />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 40 }}>
              {/* Render deals in groups of 12 (2 rows × 6 columns) with ads in between */}
              {Array.from({ length: Math.ceil(deals.length / 12) }).map((_, groupIndex) => {
                const startIdx = groupIndex * 12;
                const endIdx = Math.min(startIdx + 12, deals.length);
                const groupDeals = deals.slice(startIdx, endIdx);

                return (
                  <div key={`group-${groupIndex}`} style={{ marginBottom: 20 }}>
                    {/* Deals Grid - 6 columns */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(6, 1fr)',
                        gap: 16,
                      }}
                    >
                      {groupDeals.map((deal) => (
                        <CompactDealCard
                          key={deal.id}
                          deal={deal}
                          onUpvote={() => handleVote(deal.id, deal.userVote === 1 ? 0 : 1)}
                          onDownvote={() => handleVote(deal.id, deal.userVote === -1 ? 0 : -1)}
                          onView={() => handleDealView(deal.id)}

                        />
                      ))}
                    </div>

                    {/* Horizontal Ad Banner after every 2 rows (except the last group) */}
                    {groupIndex < Math.ceil(deals.length / 12) - 1 && (
                      <div style={{ marginTop: 20 }}>
                        <AdBlock type="banner" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Pagination Controls - Previous / Next like Slickdeals */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 12,
                marginTop: 24,
                paddingTop: 20,
                borderTop: '1px solid #e5e7eb',
              }}>
                {/* Previous Button */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '10px 20px',
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    background: currentPage === 1 ? '#f3f4f6' : '#ffffff',
                    color: currentPage === 1 ? '#9ca3af' : '#374151',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: 14,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (currentPage !== 1) {
                      e.currentTarget.style.background = '#f9fafb';
                      e.currentTarget.style.borderColor = '#9ca3af';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentPage !== 1) {
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.borderColor = '#d1d5db';
                    }
                  }}
                >
                  <span style={{ fontSize: 16 }}>‹</span> Previous
                </button>

                {/* Next Button */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!hasMore || loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '10px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: !hasMore ? '#d1d5db' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#ffffff',
                    cursor: !hasMore ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: 14,
                    boxShadow: hasMore ? '0 2px 8px rgba(102, 126, 234, 0.3)' : 'none',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (hasMore) {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (hasMore) {
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
                    }
                  }}
                >
                  Next <span style={{ fontSize: 16 }}>›</span>
                </button>
              </div>
            </div>
          )}
          </>
          )}
            </div>

            {/* Ad Sidebar */}
            <div style={{ flex: '0 0 300px', display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 20 }}>
              <AdBlock type="rectangle" />
              <AdBlock type="rectangle" />
              <AdBlock type="rectangle" />
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        {!isSearchActive && !searchQuery && (
          <div style={{ background: '#f9fafb', padding: '80px 24px', marginTop: 40 }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: 60 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#667eea', letterSpacing: '1px', marginBottom: 12 }}>
                  {t('home.howItWorks')}
                </div>
                <h2 style={{ fontSize: 36, fontWeight: 800, color: '#1a1a1a', margin: '0 0 16px', fontFamily: 'Poppins' }}>
                  {t('home.howAiFinds')}
                </h2>
                <p style={{ fontSize: 16, color: '#6b7280', maxWidth: 600, margin: '0 auto', lineHeight: 1.6 }}>
                  {t('home.aiDescription')}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 40 }}>
                <div style={{
                  background: 'white',
                  borderRadius: 16,
                  padding: 32,
                  textAlign: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-8px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 40,
                    margin: '0 auto 20px',
                    boxShadow: '0 8px 20px rgba(102, 126, 234, 0.3)',
                  }}>
                    🤖
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: '#1a1a1a', fontFamily: 'Poppins' }}>
                    {t('home.aiScraping')}
                  </h3>
                  <p style={{ color: '#6b7280', lineHeight: 1.6, fontSize: 14 }}>
                    {t('home.aiScrapingDesc')}
                  </p>
                </div>

                <div style={{
                  background: 'white',
                  borderRadius: 16,
                  padding: 32,
                  textAlign: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-8px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 40,
                    margin: '0 auto 20px',
                    boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)',
                  }}>
                    📊
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: '#1a1a1a', fontFamily: 'Poppins' }}>
                    {t('home.smartAnalysis')}
                  </h3>
                  <p style={{ color: '#6b7280', lineHeight: 1.6, fontSize: 14 }}>
                    {t('home.smartAnalysisDesc')}
                  </p>
                </div>

                <div style={{
                  background: 'white',
                  borderRadius: 16,
                  padding: 32,
                  textAlign: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-8px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 40,
                    margin: '0 auto 20px',
                    boxShadow: '0 8px 20px rgba(245, 158, 11, 0.3)',
                  }}>
                    🎯
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: '#1a1a1a', fontFamily: 'Poppins' }}>
                    {t('home.personalizedAlerts')}
                  </h3>
                  <p style={{ color: '#6b7280', lineHeight: 1.6, fontSize: 14 }}>
                    {t('home.personalizedAlertsDesc')}
                  </p>
                </div>
              </div>

              {/* Trust Indicators */}
              <div style={{
                marginTop: 60,
                textAlign: 'center',
                padding: '32px',
                background: 'white',
                borderRadius: 16,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#667eea', marginBottom: 16 }}>
                  {t('home.trustedBy')}
                </div>
                <div style={{ display: 'flex', gap: 48, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#1a1a1a' }}>{t('home.verified')}</div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>{t('home.aiChecked')}</div>
                  </div>
                  <div style={{ width: 1, height: 40, background: '#d1d5db' }} />
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#1a1a1a' }}>{t('home.realTime')}</div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>{t('home.priceUpdates')}</div>
                  </div>
                  <div style={{ width: 1, height: 40, background: '#d1d5db' }} />
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#1a1a1a' }}>{t('home.community')}</div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>{t('home.drivenPlatform')}</div>
                  </div>
                  <div style={{ width: 1, height: 40, background: '#d1d5db' }} />
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#1a1a1a' }}>{t('home.noSpam')}</div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>{t('home.cleanExperience')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {isPostOpen && (
        <PostDealModal
          onClose={() => setIsPostOpen(false)}
          onCreate={handleDealCreated}
          categories={categories}
        />
      )}

      {isPreferencesOpen && (
        <PreferencesModal
          onClose={() => setIsPreferencesOpen(false)}
          categories={categories}
        />
      )}
    </div>
  );
}
