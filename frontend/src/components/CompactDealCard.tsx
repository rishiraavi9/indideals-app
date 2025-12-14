import { useState } from 'react';
import type { Deal } from '../types';
import { affiliateApi } from '../api/affiliate';

export default function CompactDealCard({
  deal,
  onUpvote,
  onDownvote,
  onView,
  onUserClick,
}: {
  deal: Deal;
  onUpvote: () => void;
  onDownvote: () => void;
  onView?: () => void;
  onUserClick?: (userId: string) => void;
}) {
  const score = deal.score ?? deal.upvotes - deal.downvotes;
  const [isVoteHovered, setIsVoteHovered] = useState(false);
  const savings = deal.originalPrice ? deal.originalPrice - deal.price : null;

  const handleCardClick = () => {
    if (onView) onView();
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/deal/${deal.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: deal.title,
          text: `Check out this deal: ${deal.title}`,
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled or error occurred
        console.log('Share cancelled');
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('Link copied to clipboard!');
      } catch (error) {
        console.error('Failed to copy link:', error);
      }
    }
  };

  const handleGoClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!deal.url) return;

    try {
      // Track the affiliate click and get the tracked URL
      const response = await affiliateApi.trackClick(deal.id);
      window.open(response.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Failed to track affiliate click:', error);
      // Fallback to the original URL if tracking fails
      window.open(deal.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      onClick={handleCardClick}
      style={{
        borderRadius: 12,
        border: '1px solid #e5e7eb',
        background: '#ffffff',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
        e.currentTarget.style.borderColor = '#d1d5db';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
        e.currentTarget.style.borderColor = '#e5e7eb';
      }}
    >
      {/* Image Section */}
      <div
        style={{
          width: '100%',
          height: 140,
          background: deal.imageUrl
            ? `url(${deal.imageUrl}) center/cover`
            : 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          borderBottom: '1px solid #f3f4f6',
        }}
      >
        {!deal.imageUrl && (
          <div style={{ fontSize: 48, opacity: 0.2 }}>
            {deal.category?.icon || '🏷️'}
          </div>
        )}

        {/* Discount badge */}
        {deal.discountPercentage && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              padding: '6px 12px',
              borderRadius: 8,
              background: '#dc2626',
              fontSize: 14,
              fontWeight: 800,
              color: '#fff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            -{deal.discountPercentage}%
          </div>
        )}

        {/* Featured badge */}
        {(deal as any).isFeatured && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              padding: '5px 10px',
              borderRadius: 6,
              background: '#fbbf24',
              fontSize: 11,
              fontWeight: 800,
              color: '#78350f',
            }}
          >
            ⭐ FEATURED
          </div>
        )}

        {/* Score badge */}
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            left: 10,
            padding: '5px 10px',
            borderRadius: 6,
            background: score > 50 ? '#10b981' : '#3b82f6',
            fontSize: 13,
            fontWeight: 700,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          🔥 {score}
        </div>
      </div>

      {/* Content Section */}
      <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Title */}
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            lineHeight: 1.4,
            marginBottom: 8,
            color: '#1a1a1a',
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

        {/* Price Section */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#10b981' }}>
              ₹{deal.price.toLocaleString('en-IN')}
            </span>
            {deal.originalPrice && (
              <span
                style={{
                  fontSize: 14,
                  color: '#9ca3af',
                  textDecoration: 'line-through',
                }}
              >
                ₹{deal.originalPrice.toLocaleString('en-IN')}
              </span>
            )}
          </div>
          {savings && (
            <div style={{ fontSize: 12, color: '#10b981', fontWeight: 600, marginTop: 3 }}>
              Save ₹{savings.toLocaleString('en-IN')}
            </div>
          )}
        </div>

        {/* Merchant & User */}
        <div
          style={{
            fontSize: 12,
            color: '#6b7280',
            marginBottom: 8,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          at <span style={{ fontWeight: 600, color: '#374151' }}>{deal.merchant}</span>
          {deal.user && (
            <>
              {' • '}
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onUserClick && onUserClick(deal.userId);
                }}
                style={{
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: '#2563eb',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#1d4ed8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#2563eb';
                }}
              >
                {deal.user.username}
              </span>
            </>
          )}
        </div>

        {deal.category && (
          <div
            style={{
              fontSize: 11,
              padding: '4px 8px',
              borderRadius: 6,
              background: '#f3f4f6',
              border: '1px solid #e5e7eb',
              alignSelf: 'flex-start',
              fontWeight: 600,
              color: '#6b7280',
              marginBottom: 8,
            }}
          >
            {deal.category.icon} {deal.category.name}
          </div>
        )}

        {/* Festive Tags */}
        {(deal as any).festiveTags && (deal as any).festiveTags.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
            {(deal as any).festiveTags.slice(0, 1).map((tag: string) => (
              <span
                key={tag}
                style={{
                  fontSize: 10,
                  padding: '3px 8px',
                  borderRadius: 4,
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  color: '#92400e',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions - 4 icon buttons (Slickdeals style) */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            paddingTop: 12,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Thumbs up with score - expands on hover */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              position: 'relative',
            }}
            onMouseEnter={() => setIsVoteHovered(true)}
            onMouseLeave={() => setIsVoteHovered(false)}
          >
            {!isVoteHovered ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpvote();
                }}
                style={{
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                  color: deal.userVote === 1 ? '#10b981' : '#9ca3af',
                  cursor: 'pointer',
                  fontSize: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (deal.userVote !== 1) e.currentTarget.style.color = '#6b7280';
                }}
                onMouseLeave={(e) => {
                  if (deal.userVote !== 1) e.currentTarget.style.color = '#9ca3af';
                }}
              >
                <span>👍</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{score}</span>
              </button>
            ) : (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpvote();
                  }}
                  style={{
                    padding: 0,
                    border: 'none',
                    background: 'transparent',
                    color: deal.userVote === 1 ? '#10b981' : '#9ca3af',
                    cursor: 'pointer',
                    fontSize: 20,
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (deal.userVote !== 1) e.currentTarget.style.color = '#6b7280';
                  }}
                  onMouseLeave={(e) => {
                    if (deal.userVote !== 1) e.currentTarget.style.color = '#9ca3af';
                  }}
                >
                  👍
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownvote();
                  }}
                  style={{
                    padding: 0,
                    border: 'none',
                    background: 'transparent',
                    color: deal.userVote === -1 ? '#dc2626' : '#9ca3af',
                    cursor: 'pointer',
                    fontSize: 20,
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (deal.userVote !== -1) e.currentTarget.style.color = '#6b7280';
                  }}
                  onMouseLeave={(e) => {
                    if (deal.userVote !== -1) e.currentTarget.style.color = '#9ca3af';
                  }}
                >
                  👎
                </button>
              </>
            )}
          </div>

          {/* Comment icon with count */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onView) onView();
            }}
            style={{
              padding: 0,
              border: 'none',
              background: 'transparent',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#6b7280';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#9ca3af';
            }}
            title="View comments"
          >
            <span>💬</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{deal.commentCount || 0}</span>
          </button>

          {/* Share icon */}
          <button
            onClick={handleShare}
            style={{
              padding: 0,
              border: 'none',
              background: 'transparent',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: 20,
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#6b7280';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#9ca3af';
            }}
            title="Share deal"
          >
            ↗
          </button>

          {/* Cart icon */}
          <button
            onClick={handleGoClick}
            style={{
              marginLeft: 'auto',
              padding: 0,
              border: 'none',
              background: 'transparent',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: 20,
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#6b7280';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#9ca3af';
            }}
            title="Go to deal"
          >
            🛒
          </button>
        </div>
      </div>
    </div>
  );
}
