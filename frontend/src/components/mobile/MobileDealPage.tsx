import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { dealsApi } from '../../api/deals';
import * as wishlistApi from '../../api/wishlist';
import { getDealQualityScore } from '../../api/ai';
import { useAuth } from '../../context/AuthContext';
import { useHaptics } from '../../hooks/useHaptics';
import { useTranslatedText } from '../../hooks/useTranslatedDeals';
import { formatDistanceToNow } from '../../utils/date';
import PriceHistoryChart from '../PriceHistoryChart';
import PriceAlertModal from '../PriceAlertModal';
import type { Deal } from '../../types';

export default function MobileDealPage() {
  const { dealId } = useParams<{ dealId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { triggerHaptic } = useHaptics();

  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showPriceAlert, setShowPriceAlert] = useState(false);
  const [imageIndex] = useState(0);
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [aiBreakdown, setAiBreakdown] = useState<any>(null);
  const [imageError, setImageError] = useState(false);

  // Translate deal title and description
  const { translatedText: translatedTitle } = useTranslatedText(deal?.title || '');
  const { translatedText: translatedDescription } = useTranslatedText(deal?.description || '');

  useEffect(() => {
    if (dealId) {
      loadDeal();
      checkWishlist();
      loadAIScore();
    }
  }, [dealId]);

  const loadAIScore = async () => {
    if (!dealId) return;
    try {
      const scoreData = await getDealQualityScore(dealId);
      setAiScore(scoreData.totalScore);
      setAiBreakdown(scoreData.breakdown);
    } catch (error) {
      console.error('Failed to load AI score:', error);
      setAiScore(null);
    }
  };

  const loadDeal = async () => {
    if (!dealId) return;
    setLoading(true);
    try {
      const dealData = await dealsApi.getDeal(dealId);
      setDeal(dealData);
      // Also check if aiScore is already in deal data
      if (dealData.aiScore) {
        setAiScore(dealData.aiScore);
      }
    } catch (error) {
      console.error('Failed to load deal:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkWishlist = async () => {
    if (!dealId || !isAuthenticated) return;
    try {
      const result = await wishlistApi.checkWishlist(dealId);
      setIsWishlisted(result.inWishlist);
    } catch (error) {
      console.error('Failed to check wishlist:', error);
    }
  };

  const handleWishlist = async () => {
    if (!dealId) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    triggerHaptic('medium');
    try {
      if (isWishlisted) {
        await wishlistApi.removeDeal(dealId);
        setIsWishlisted(false);
      } else {
        await wishlistApi.saveDeal(dealId);
        setIsWishlisted(true);
      }
    } catch (error) {
      console.error('Failed to update wishlist:', error);
    }
  };

  const handleVote = async (voteType: number) => {
    if (!deal || !isAuthenticated) {
      if (!isAuthenticated) navigate('/login');
      return;
    }

    triggerHaptic('medium');
    try {
      const result = await dealsApi.voteDeal(deal.id, voteType);
      setDeal({
        ...deal,
        upvotes: result.upvotes,
        downvotes: result.downvotes,
        userVote: result.userVote,
      });
    } catch (error) {
      console.error('Failed to vote:', error);
    }
  };

  const handleShare = async () => {
    if (!deal) return;
    triggerHaptic('light');

    try {
      if (navigator.share) {
        await navigator.share({
          title: deal.title,
          text: `Check out this deal: ${deal.title} at ₹${deal.price}`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const handleBuyNow = () => {
    if (!deal) return;
    triggerHaptic('medium');
    if (deal.url) {
      window.open(deal.url, '_blank');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return '#059669';
    if (score >= 55) return '#0891b2';
    if (score >= 40) return '#ca8a04';
    return '#6b7280';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 70) return t('aiScore.excellentDeal');
    if (score >= 55) return t('aiScore.goodDeal');
    if (score >= 40) return t('aiScore.fairDeal');
    return t('aiScore.belowAverage');
  };

  if (loading) {
    return (
      <div style={{ background: '#1a1a1a', minHeight: '100vh', paddingTop: 'env(safe-area-inset-top)' }}>
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top) + 12px)',
            left: 12,
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(42,42,42,0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        {/* Skeleton loader */}
        <div style={{ height: 320, background: '#2a2a2a' }} />
        <div style={{ padding: 16 }}>
          <div style={{ height: 40, borderRadius: 8, marginBottom: 12, background: '#2a2a2a' }} />
          <div style={{ height: 20, borderRadius: 4, marginBottom: 12, background: '#2a2a2a' }} />
          <div style={{ height: 20, borderRadius: 4, width: '60%', marginBottom: 16, background: '#2a2a2a' }} />
          <div style={{ height: 28, borderRadius: 4, width: '40%', background: '#2a2a2a' }} />
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div style={{ background: '#1a1a1a', minHeight: '100vh', paddingTop: 'env(safe-area-inset-top)' }}>
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top) + 12px)',
            left: 12,
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(42,42,42,0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        {/* Not Found Content */}
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>😔</div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'white' }}>{t('dealPage.dealNotFound')}</h2>
          <p style={{ margin: '12px 0 24px', color: '#9ca3af' }}>
            {t('dealPage.dealNotFoundDesc')}
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '12px 24px',
              borderRadius: 22,
              border: 'none',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t('dealPage.browseDeals')}
          </button>
        </div>
      </div>
    );
  }

  const images = deal.imageUrl ? [deal.imageUrl] : [];

  return (
    <div style={{ background: '#1a1a1a', minHeight: '100vh', paddingBottom: 100 }}>
      {/* Back Button - Fixed position at top */}
      <button
        onClick={() => navigate(-1)}
        style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top) + 12px)',
          left: 12,
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: 'none',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 100,
          color: 'white',
          fontSize: 22,
          fontWeight: 300,
        }}
      >
        ‹
      </button>

      {/* Image Gallery */}
      <div
        style={{
          background: '#2a2a2a',
          position: 'relative',
        }}
      >
        {/* Image */}
        <div
          style={{
            height: 320,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'white',
          }}
        >
          <img
            src={imageError ? '/placeholder-deal.svg' : (images[imageIndex] || '/placeholder-deal.svg')}
            alt={deal.title}
            onError={() => setImageError(true)}
            style={{
              maxWidth: '85%',
              maxHeight: '85%',
              objectFit: 'contain',
            }}
          />
        </div>

        {/* Image dots indicator (if multiple images) */}
        {images.length > 1 && (
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: 6,
            }}
          >
            {images.map((_, i) => (
              <div
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: i === imageIndex ? 'white' : 'rgba(255,255,255,0.4)',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Action Row */}
      <div
        style={{
          background: '#2a2a2a',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderBottom: '1px solid #333',
        }}
      >
        {/* Upvote Button */}
        <button
          onClick={() => handleVote(deal.userVote === 1 ? 0 : 1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '8px 12px',
            borderRadius: 20,
            border: '1px solid #444',
            background: deal.userVote === 1 ? 'rgba(5, 150, 105, 0.2)' : '#333',
            color: deal.userVote === 1 ? '#10b981' : '#9ca3af',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={deal.userVote === 1 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
          </svg>
          {deal.upvotes}
        </button>

        {/* Downvote Button */}
        <button
          onClick={() => handleVote(deal.userVote === -1 ? 0 : -1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '8px 12px',
            borderRadius: 20,
            border: '1px solid #444',
            background: deal.userVote === -1 ? 'rgba(239, 68, 68, 0.2)' : '#333',
            color: deal.userVote === -1 ? '#ef4444' : '#9ca3af',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={deal.userVote === -1 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" style={{ transform: 'rotate(180deg)' }}>
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
          </svg>
        </button>

        {/* Comments */}
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '8px 12px',
            borderRadius: 20,
            border: '1px solid #444',
            background: '#333',
            color: '#9ca3af',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {deal.commentCount || 0}
        </button>

        {/* Bookmark/Save */}
        <button
          onClick={handleWishlist}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 12px',
            borderRadius: 20,
            border: '1px solid #444',
            background: isWishlisted ? 'rgba(239, 68, 68, 0.2)' : '#333',
            color: isWishlisted ? '#ef4444' : '#9ca3af',
            cursor: 'pointer',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={isWishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 12px',
            borderRadius: 20,
            border: '1px solid #444',
            background: '#333',
            color: '#9ca3af',
            cursor: 'pointer',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Popular Badge */}
        {(deal.upvotes - deal.downvotes) >= 5 && (
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 4,
              background: 'rgba(124, 58, 237, 0.2)',
              color: '#a78bfa',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            🔥 {t('deals.popular')}
          </span>
        )}
      </div>

      {/* Title & Price Section */}
      <div style={{ background: '#2a2a2a', padding: 16 }}>
        {/* Discount Badge */}
        {deal.discountPercentage && deal.discountPercentage >= 10 && (
          <span
            style={{
              display: 'inline-block',
              background: deal.discountPercentage >= 50 ? '#dc2626' : '#ea580c',
              color: 'white',
              fontSize: 12,
              fontWeight: 700,
              padding: '4px 8px',
              borderRadius: 4,
              marginBottom: 8,
            }}
          >
            {deal.discountPercentage}% OFF
          </span>
        )}

        {/* Title */}
        <h1
          style={{
            margin: 0,
            fontSize: 17,
            fontWeight: 600,
            color: 'white',
            lineHeight: 1.4,
          }}
        >
          {translatedTitle || deal.title}
        </h1>

        {/* Price Row */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 12 }}>
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#10b981',
            }}
          >
            {formatPrice(deal.price)}
          </span>
          {deal.originalPrice && (
            <span
              style={{
                fontSize: 15,
                color: '#6b7280',
                textDecoration: 'line-through',
              }}
            >
              {formatPrice(deal.originalPrice)}
            </span>
          )}
        </div>

        {/* Merchant */}
        <div style={{ marginTop: 8, fontSize: 14, color: '#9ca3af' }}>
          {t('deals.at')} {deal.merchant}
        </div>

        {/* AI Score Badge */}
        {aiScore !== null && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 12,
              padding: '8px 12px',
              borderRadius: 8,
              background: `${getScoreColor(aiScore)}20`,
              border: `1px solid ${getScoreColor(aiScore)}40`,
            }}
          >
            <span style={{ fontSize: 14 }}>✨</span>
            <span style={{ color: getScoreColor(aiScore), fontSize: 14, fontWeight: 600 }}>
              {t('aiScore.aiScoreLabel')}: {aiScore}
            </span>
            <span style={{ color: '#9ca3af', fontSize: 12 }}>
              ({getScoreLabel(aiScore)})
            </span>
          </div>
        )}

        {/* Affiliate Disclaimer */}
        <p style={{ margin: '12px 0 0', fontSize: 12, color: '#6b7280' }}>
          {t('dealPage.affiliateDisclaimer')}
        </p>
      </div>

      {/* Divider */}
      <div style={{ height: 8, background: '#1a1a1a' }} />

      {/* AI Score Breakdown */}
      {aiScore !== null && aiBreakdown && (
        <>
          <div style={{ background: '#2a2a2a', padding: 16 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: 'white' }}>
              {t('aiScore.aiAnalysis')}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: '#333', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span>💰</span>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>{t('aiScore.value')}</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>{aiBreakdown.valueProp}/100</div>
              </div>
              <div style={{ background: '#333', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span>✅</span>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>{t('aiScore.authenticity')}</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>{aiBreakdown.authenticity}/100</div>
              </div>
              <div style={{ background: '#333', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span>⚡</span>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>{t('aiScore.urgency')}</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>{aiBreakdown.urgency}/100</div>
              </div>
              <div style={{ background: '#333', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span>👥</span>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>{t('aiScore.socialProof')}</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>{aiBreakdown.socialProof}/100</div>
              </div>
            </div>
          </div>
          <div style={{ height: 8, background: '#1a1a1a' }} />
        </>
      )}

      {/* Details Section */}
      <div style={{ background: '#2a2a2a', padding: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'white' }}>{t('dealPage.details')}</h2>

        {/* Posted Info */}
        <div style={{ marginTop: 12, fontSize: 14, color: '#9ca3af' }}>
          {t('dealPage.posted')} {formatDistanceToNow(new Date(deal.createdAt))}
          {deal.user && (
            <>
              {' by '}
              <span style={{ color: '#60a5fa', fontWeight: 600 }}>
                {deal.user.username}
              </span>
            </>
          )}
        </div>

        {/* Description */}
        {deal.description && (
          <p style={{ margin: '12px 0 0', fontSize: 14, color: '#d1d5db', lineHeight: 1.6 }}>
            {translatedDescription || deal.description}
          </p>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 8, background: '#1a1a1a' }} />

      {/* Price History */}
      <div style={{ background: '#2a2a2a', padding: 16 }}>
        <PriceHistoryChart dealId={deal.id} currentPrice={deal.price} theme="dark" />
      </div>

      {/* Bottom Action Bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#2a2a2a',
          borderTop: '1px solid #333',
          padding: '12px 16px',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          zIndex: 100,
        }}
      >
        {/* Share icon */}
        <button
          onClick={handleShare}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '1px solid #444',
            background: '#333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        </button>

        {/* See Deal Button - Primary CTA */}
        <button
          onClick={handleBuyNow}
          style={{
            flex: 1,
            height: 44,
            borderRadius: 22,
            border: 'none',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {t('dealPage.seeDealAt')} {deal.merchant}
        </button>
      </div>

      {/* Price Alert Modal */}
      {showPriceAlert && (
        <PriceAlertModal
          dealId={deal.id}
          currentPrice={deal.price}
          dealTitle={deal.title}
          onClose={() => setShowPriceAlert(false)}
          onSuccess={() => {
            setShowPriceAlert(false);
            triggerHaptic('success');
          }}
        />
      )}
    </div>
  );
}
