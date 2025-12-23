import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MobileDealCard from './MobileDealCard';
import { dealsApi } from '../../api/deals';
import { useAuth } from '../../context/AuthContext';
import { useHaptics } from '../../hooks/useHaptics';
import { useTranslatedDeals } from '../../hooks/useTranslatedDeals';
import { isFeatureEnabled } from '../../config/features';
import type { Deal } from '../../types';
import type { FilterTab } from './MobileHeader';

// Check if user has seen the AI intro banner
const AI_INTRO_SEEN_KEY = 'desidealsai_ai_intro_seen';

function AIIntroBanner({ onDismiss, t }: { onDismiss: () => void; t: (key: string) => string }) {
  return (
    <div
      style={{
        margin: '12px 16px',
        background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
        borderRadius: 16,
        padding: 16,
        border: '1px solid #334155',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow effect */}
      <div
        style={{
          position: 'absolute',
          top: -50,
          right: -50,
          width: 150,
          height: 150,
          background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)',
          borderRadius: '50%',
        }}
      />

      {/* Close button */}
      <button
        onClick={onDismiss}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 24,
          height: 24,
          borderRadius: 12,
          border: 'none',
          background: 'rgba(255,255,255,0.1)',
          color: '#9ca3af',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
        }}
      >
        ×
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 20 }}>✨</span>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>{t('aiScore.introBannerTitle')}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>{t('aiScore.introBannerSubtitle')}</div>
        </div>
      </div>

      {/* Features */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12 }}>📊</span>
          <span style={{ fontSize: 12, color: '#e2e8f0' }}>
            <strong style={{ color: 'white' }}>{t('aiScore.priceHistoryAnalysis')}</strong> — {t('aiScore.tracksPriceTrends')}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12 }}>🔍</span>
          <span style={{ fontSize: 12, color: '#e2e8f0' }}>
            <strong style={{ color: 'white' }}>{t('aiScore.discountVerification')}</strong> — {t('aiScore.spotsFakeDiscounts')}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12 }}>⭐</span>
          <span style={{ fontSize: 12, color: '#e2e8f0' }}>
            <strong style={{ color: 'white' }}>{t('aiScore.merchantTrustScore')}</strong> — {t('aiScore.verifiedSellers')}
          </span>
        </div>
      </div>

      {/* CTA hint */}
      <div
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid #334155',
          fontSize: 11,
          color: '#94a3b8',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            background: '#059669',
            color: 'white',
            fontSize: 9,
            fontWeight: 600,
            padding: '2px 6px',
            borderRadius: 4,
          }}
        >
          ✨ 75
        </span>
        <span>{t('aiScore.tapToLearnMore')}</span>
      </div>
    </div>
  );
}

interface MobileHomeProps {
  activeFilter?: FilterTab;
}

export default function MobileHome({ activeFilter = 'all' }: MobileHomeProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { triggerHaptic } = useHaptics();

  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showAIIntro, setShowAIIntro] = useState(() => {
    // Check if user has already seen the intro
    return !localStorage.getItem(AI_INTRO_SEEN_KEY);
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Translate deal titles and descriptions based on current language
  const { translatedDeals, isTranslating } = useTranslatedDeals(deals);

  const dismissAIIntro = () => {
    localStorage.setItem(AI_INTRO_SEEN_KEY, 'true');
    setShowAIIntro(false);
  };

  useEffect(() => {
    loadDeals(true);
  }, [activeFilter]);

  // Get AI quality score - uses real AI score if available, otherwise computes a proxy score
  const getQualityScore = (deal: Deal): number => {
    // Use real AI score if available
    if (deal.aiScore !== null && deal.aiScore !== undefined) {
      return deal.aiScore;
    }

    // Fallback: compute proxy score based on available metrics
    let score = 50; // Base score

    // Boost for positive votes (community validation)
    const netVotes = (deal.upvotes || 0) - (deal.downvotes || 0);
    score += Math.min(netVotes * 2, 30); // Max +30 from votes

    // Boost for verified deals
    if (deal.verified) score += 15;

    // Boost for having comments (engagement)
    if ((deal.commentCount || 0) > 0) score += 5;

    // Penalty for expired deals
    if (deal.isExpired) score -= 30;

    return Math.max(0, Math.min(100, score));
  };

  const loadDeals = async (reset = false) => {
    if (reset) {
      setLoading(true);
      setPage(1);
    }

    try {
      const currentPage = reset ? 1 : page;

      // Map filter tabs to API parameters
      const getApiParams = () => {
        switch (activeFilter) {
          case 'top-picks':
            return { tab: 'frontpage' as const };
          case 'hot-deals':
            return { tab: 'frontpage' as const };
          case 'budget-finds':
            return { tab: 'frontpage' as const };
          case 'new':
            return { tab: 'frontpage' as const, sortBy: 'newest' as const };
          default:
            return { tab: 'frontpage' as const };
        }
      };

      const apiParams = getApiParams();
      // Fetch more deals for filtered views to ensure enough results after filtering
      const fetchLimit = activeFilter === 'all' ? 40 : 100;
      const response = await dealsApi.getDeals({
        ...apiParams,
        limit: fetchLimit,
        offset: (currentPage - 1) * fetchLimit,
      });

      let filteredDeals = response.deals;

      // Apply AI Score + criteria based filtering for India
      // AI Score thresholds: All (none), Top Picks (≥70), Hot Deals (≥55), Budget (≥45), New (≥40)
      switch (activeFilter) {
        case 'all':
          // Show all deals - no AI score filtering, but sort by quality
          filteredDeals = filteredDeals
            .sort((a, b) => getQualityScore(b) - getQualityScore(a));
          break;

        case 'top-picks':
          // Top quality deals - AI Score ≥ 70, sorted by score
          filteredDeals = filteredDeals
            .filter(d => getQualityScore(d) >= 70)
            .sort((a, b) => getQualityScore(b) - getQualityScore(a))
            .slice(0, 20);

          // Fallback: if not enough high-quality deals, get top by score
          if (filteredDeals.length < 5) {
            filteredDeals = response.deals
              .sort((a, b) => getQualityScore(b) - getQualityScore(a))
              .slice(0, 20);
          }
          break;

        case 'hot-deals':
          // High discount deals - 50%+ off AND AI Score ≥ 55
          filteredDeals = filteredDeals.filter(d =>
            (d.discountPercentage || 0) >= 50 && getQualityScore(d) >= 55
          );

          // Fallback: just 50%+ off if too few quality deals
          if (filteredDeals.length < 5) {
            filteredDeals = response.deals.filter(d =>
              (d.discountPercentage || 0) >= 50
            );
          }
          break;

        case 'budget-finds':
          // Affordable deals - under ₹499 AND AI Score ≥ 45
          filteredDeals = filteredDeals.filter(d =>
            d.price <= 499 && getQualityScore(d) >= 45
          );

          // Fallback: just under ₹499 if too few
          if (filteredDeals.length < 5) {
            filteredDeals = response.deals.filter(d => d.price <= 499);
          }
          break;

        case 'new':
          // Fresh deals from last 7 days AND AI Score ≥ 40
          const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          filteredDeals = filteredDeals.filter(d => {
            const createdAt = new Date(d.createdAt);
            return createdAt >= oneWeekAgo && getQualityScore(d) >= 40;
          });

          // Fallback: just new deals if too few
          if (filteredDeals.length < 5) {
            filteredDeals = response.deals.filter(d => {
              const createdAt = new Date(d.createdAt);
              return createdAt >= oneWeekAgo;
            });
          }
          break;
      }

      // Handle pagination properly - filter out already loaded deals
      if (reset) {
        // Fresh load - take first 20 filtered deals
        const limitedDeals = filteredDeals.slice(0, 20);
        setDeals(limitedDeals);
        setHasMore(filteredDeals.length > 20);
      } else {
        // Load more - filter out duplicates and append new deals
        setDeals(prev => {
          const existingIds = new Set(prev.map(d => d.id));
          const newDeals = filteredDeals.filter(d => !existingIds.has(d.id));
          const combined = [...prev, ...newDeals.slice(0, 20)];
          return combined;
        });
        // Check if there are more unique deals to load
        setHasMore(filteredDeals.length >= 20);
      }
      setPage(currentPage + 1);
    } catch (error) {
      console.error('Failed to load deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDealClick = (deal: Deal) => {
    triggerHaptic('light');
    navigate(`/deal/${deal.id}`);
  };

  const handleVote = async (dealId: string, voteType: number) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    triggerHaptic('medium');
    try {
      const result = await dealsApi.voteDeal(dealId, voteType);
      setDeals(prev => prev.map(d =>
        d.id === dealId
          ? { ...d, upvotes: result.upvotes, downvotes: result.downvotes, userVote: result.userVote }
          : d
      ));
    } catch (error) {
      console.error('Failed to vote:', error);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadDeals(false);
    }
  };

  // Determine which deals get badges
  const getBadgeForDeal = (deal: Deal, index: number): 'popular' | 'promoted' | null => {
    if (index < 3 && (deal.upvotes - deal.downvotes) >= 10) {
      return 'popular';
    }
    // You could add logic for promoted deals here
    return null;
  };

  // Get section title based on active filter
  const getSectionTitle = () => {
    switch (activeFilter) {
      case 'all':
        return null; // No title for All
      case 'top-picks':
        return '⭐ Top Picks - Best Rated Deals';
      case 'hot-deals':
        return '🔥 Hot Deals - 50%+ Off';
      case 'budget-finds':
        return '💰 Budget Finds - Under ₹499';
      case 'new':
        return '✨ New This Week';
      default:
        return null;
    }
  };

  const sectionTitle = getSectionTitle();

  return (
    <div ref={containerRef} style={{ background: '#1a1a1a', minHeight: '100vh' }}>
      {/* AI Intro Banner - Show for first-time users on 'all' tab */}
      {showAIIntro && activeFilter === 'all' && (
        <AIIntroBanner onDismiss={dismissAIIntro} t={t} />
      )}

      {/* Section Title */}
      {sectionTitle && (
        <div style={{
          padding: '16px 16px 8px',
          color: '#9ca3af',
          fontSize: 13,
          fontWeight: 600,
        }}>
          {sectionTitle}
        </div>
      )}

      {/* Loading State */}
      {(loading || isTranslating) && deals.length === 0 ? (
        <div style={{ padding: 16 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 12,
                padding: 16,
                borderBottom: '1px solid #2a2a2a',
              }}
            >
              <div
                className="skeleton"
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 8,
                  background: '#2a2a2a',
                }}
              />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ height: 16, borderRadius: 4, marginBottom: 8, background: '#2a2a2a' }} />
                <div className="skeleton" style={{ height: 14, borderRadius: 4, width: '60%', marginBottom: 8, background: '#2a2a2a' }} />
                <div className="skeleton" style={{ height: 20, borderRadius: 4, width: '40%', background: '#2a2a2a' }} />
              </div>
            </div>
          ))}
          <style>{`
            @keyframes shimmer {
              0% { background-position: -200% 0; }
              100% { background-position: 200% 0; }
            }
            .skeleton {
              background: linear-gradient(90deg, #2a2a2a 25%, #333 50%, #2a2a2a 75%);
              background-size: 200% 100%;
              animation: shimmer 1.5s infinite;
            }
          `}</style>
        </div>
      ) : deals.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#6b7280',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'white' }}>{t('home.noDeals')}</p>
          <p style={{ margin: '8px 0 0', fontSize: 14 }}>{t('home.checkBack')}</p>
        </div>
      ) : (
        <>
          {/* Deal List - Use translated deals for display */}
          {translatedDeals.map((deal, index) => (
            <div key={deal.id}>
              <MobileDealCard
                deal={deal}
                onPress={() => handleDealClick(deal)}
                onVote={(voteType) => handleVote(deal.id, voteType)}
                showBadge={getBadgeForDeal(deal, index)}
              />
              {/* Show ad after every 4 deals if ads are enabled */}
              {isFeatureEnabled('adsEnabled') && (index + 1) % 4 === 0 && index < translatedDeals.length - 1 && (
                <AdBlock />
              )}
            </div>
          ))}

          {/* Load More */}
          {hasMore && (
            <div style={{ padding: '20px 16px 40px', textAlign: 'center' }}>
              <button
                onClick={handleLoadMore}
                disabled={loading}
                style={{
                  background: '#2a2a2a',
                  color: 'white',
                  border: 'none',
                  padding: '14px 40px',
                  borderRadius: 25,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? t('common.loading') : t('common.loadMore')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
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
