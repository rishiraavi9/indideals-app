import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from '../../utils/date';
import { useHaptics } from '../../hooks/useHaptics';
import type { Deal } from '../../types';
import MobilePriceTrendBadge from './MobilePriceTrendBadge';

// AI Score tooltip component
function AIScoreTooltip({ score, onClose }: { score: number; onClose: () => void }) {
  const { t } = useTranslation();

  const getScoreLabel = () => {
    if (score >= 70) return { label: t('aiScore.excellentDeal'), color: '#059669' };
    if (score >= 55) return { label: t('aiScore.goodDeal'), color: '#0891b2' };
    if (score >= 40) return { label: t('aiScore.fairDeal'), color: '#ca8a04' };
    return { label: t('aiScore.belowAverage'), color: '#6b7280' };
  };

  const { label, color } = getScoreLabel();

  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#1a1a1a',
          borderRadius: 16,
          padding: 20,
          maxWidth: 320,
          width: '100%',
          border: '1px solid #333',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${color} 0%, ${color}99 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>{score}</span>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>{label}</div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>{t('aiScore.qualityScore')}</div>
          </div>
        </div>

        <div style={{ fontSize: 13, color: '#d1d5db', lineHeight: 1.6, marginBottom: 16 }}>
          {t('aiScore.analyzesIntro')} <strong style={{ color: 'white' }}>{t('aiScore.keyFactors')}</strong>:
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}>💰</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{t('aiScore.valueProposition')}</div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>{t('aiScore.valuePropositionDesc')}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}>✅</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{t('aiScore.authenticity')}</div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>{t('aiScore.authenticityDesc')}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}>⚡</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{t('aiScore.urgency')}</div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>{t('aiScore.urgencyDesc')}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}>👥</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{t('aiScore.socialProof')}</div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>{t('aiScore.socialProofDesc')}</div>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            marginTop: 16,
            padding: '12px',
            borderRadius: 8,
            border: 'none',
            background: '#333',
            color: 'white',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {t('aiScore.gotIt')}
        </button>
      </div>
    </div>
  );
}

interface MobileDealCardProps {
  deal: Deal;
  onPress: () => void;
  onVote: (voteType: number) => void;
  showBadge?: 'popular' | 'promoted' | null;
}

// Compute AI quality score - uses real AI score if available, otherwise computes a proxy score
function getDisplayScore(deal: Deal): number {
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

  // Boost for good discount
  if ((deal.discountPercentage || 0) >= 50) score += 10;
  else if ((deal.discountPercentage || 0) >= 30) score += 5;

  // Penalty for expired deals
  if (deal.isExpired) score -= 30;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export default function MobileDealCard({
  deal,
  onPress,
  onVote,
  showBadge = null,
}: MobileDealCardProps) {
  const { t } = useTranslation();
  const { triggerHaptic } = useHaptics();
  const [isPressed, setIsPressed] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showAITooltip, setShowAITooltip] = useState(false);

  // Get display score (real AI score or computed fallback)
  const displayScore = getDisplayScore(deal);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const score = (deal.upvotes || 0) - (deal.downvotes || 0);

  return (
    <div
      onClick={onPress}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onTouchCancel={() => setIsPressed(false)}
      style={{
        background: '#1a1a1a',
        display: 'flex',
        padding: '16px',
        gap: 12,
        borderBottom: '1px solid #2a2a2a',
        cursor: 'pointer',
        transition: 'background 0.15s',
        opacity: isPressed ? 0.9 : 1,
      }}
    >
      {/* Product Image */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 8,
          overflow: 'hidden',
          background: '#2a2a2a',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={imageError ? '/placeholder-deal.svg' : (deal.imageUrl || '/placeholder-deal.svg')}
          alt={deal.title}
          loading="lazy"
          onError={() => setImageError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Badges Row - Discount, AI Score, Popular/Promoted */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
          {/* Discount Badge */}
          {deal.discountPercentage && deal.discountPercentage >= 10 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: deal.discountPercentage >= 50 ? '#dc2626' : '#ea580c',
                color: 'white',
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 4,
              }}
            >
              {deal.discountPercentage}% OFF
            </span>
          )}

          {/* AI Score Badge - Always shown with computed fallback */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic('light');
              setShowAITooltip(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              background: displayScore >= 70 ? '#059669' : displayScore >= 55 ? '#0891b2' : displayScore >= 40 ? '#ca8a04' : '#6b7280',
              color: 'white',
              fontSize: 10,
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: 4,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 9 }}>✨</span>
            {t('aiScore.aiScoreLabel')}: {displayScore}
          </button>

          {/* Popular/Promoted Badge */}
          {showBadge && (
            <span
              style={{
                display: 'inline-block',
                background: showBadge === 'popular' ? '#7c3aed' : '#667eea',
                color: 'white',
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: 4,
                textTransform: 'capitalize',
              }}
            >
              {showBadge === 'popular' ? `🔥 ${t('deals.popular')}` : showBadge}
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 500,
            color: 'white',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {deal.title}
        </h3>

        {/* Price Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 6,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#10b981',
            }}
          >
            {formatPrice(deal.price)}
          </span>
          {deal.originalPrice && deal.originalPrice > deal.price && (
            <span
              style={{
                fontSize: 13,
                color: '#6b7280',
                textDecoration: 'line-through',
              }}
            >
              {formatPrice(deal.originalPrice)}
            </span>
          )}
          <span
            style={{
              fontSize: 12,
              color: '#9ca3af',
            }}
          >
            {t('deals.at')} {deal.merchant}
          </span>
          {deal.user && (
            <span
              style={{
                fontSize: 12,
                color: '#9ca3af',
              }}
            >
              {' • by '}
              <span style={{ color: '#60a5fa', fontWeight: 500 }}>
                {deal.user.username}
              </span>
            </span>
          )}
        </div>

        {/* AI Price Trend Badge */}
        <MobilePriceTrendBadge dealId={deal.id} style={{ marginTop: 6 }} />

        {/* Bottom Row - Votes, Comments, Time */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 8,
          }}
        >
          {/* Upvote */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic('light');
              onVote(deal.userVote === 1 ? 0 : 1);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: deal.userVote === 1 ? '#10b981' : '#6b7280',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={deal.userVote === 1 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{score}</span>
          </button>

          {/* Downvote */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic('light');
              onVote(deal.userVote === -1 ? 0 : -1);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: deal.userVote === -1 ? '#ef4444' : '#6b7280',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={deal.userVote === -1 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" style={{ transform: 'rotate(180deg)' }}>
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
            </svg>
          </button>

          {/* Separator */}
          <span style={{ color: '#444' }}>|</span>

          {/* Comments */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: '#6b7280',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span style={{ fontSize: 13 }}>{deal.commentCount || 0}</span>
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Time */}
          <span style={{ fontSize: 12, color: '#6b7280' }}>
            {formatDistanceToNow(new Date(deal.createdAt))}
          </span>
        </div>
      </div>

      {/* AI Score Tooltip Modal */}
      {showAITooltip && (
        <AIScoreTooltip score={displayScore} onClose={() => setShowAITooltip(false)} />
      )}
    </div>
  );
}
