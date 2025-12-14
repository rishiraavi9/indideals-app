import type { Deal } from '../types';
import { affiliateApi } from '../api/affiliate';

function Title({ deal }: { deal: Deal }) {
  const handleTitleClick = async (e: React.MouseEvent) => {
    if (!deal.url) return;

    e.preventDefault();
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

  if (!deal.url) {
    return (
      <span style={{ fontWeight: 800 }}>
        {deal.title}
        {deal.discountPercentage && (
          <span
            style={{
              marginLeft: 8,
              padding: '2px 8px',
              borderRadius: 6,
              background: 'rgba(76, 175, 80, 0.25)',
              fontSize: 12,
              fontWeight: 900,
              color: '#4ade80',
            }}
          >
            {deal.discountPercentage}% OFF
          </span>
        )}
      </span>
    );
  }

  return (
    <a
      href={deal.url}
      onClick={handleTitleClick}
      target="_blank"
      rel="noreferrer"
      style={{
        fontWeight: 900,
        color: '#eaf2ff',
        textDecoration: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.textDecoration = 'underline';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.textDecoration = 'none';
      }}
    >
      {deal.title}
      {deal.discountPercentage && (
        <span
          style={{
            marginLeft: 8,
            padding: '2px 8px',
            borderRadius: 6,
            background: 'rgba(76, 175, 80, 0.25)',
            fontSize: 12,
            fontWeight: 900,
            color: '#4ade80',
          }}
        >
          {deal.discountPercentage}% OFF
        </span>
      )}
    </a>
  );
}

export default function DealCard({
  deal,
  onUpvote,
  onDownvote,
  onUserClick,
}: {
  deal: Deal;
  onUpvote: () => void;
  onDownvote: () => void;
  onUserClick?: (userId: string) => void;
}) {
  const score = deal.score ?? deal.upvotes - deal.downvotes;

  return (
    <div
      style={{
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.14)',
        background: 'rgba(0,0,0,0.18)',
        padding: 16,
        marginTop: 12,
        boxShadow: '0 10px 24px rgba(0,0,0,0.25)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, lineHeight: 1.3 }}>
            <Title deal={deal} />
          </div>

          {deal.description && (
            <div
              style={{
                marginTop: 8,
                opacity: 0.85,
                fontSize: 14,
                lineHeight: 1.4,
              }}
            >
              {deal.description}
            </div>
          )}

          <div
            style={{
              marginTop: 10,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              alignItems: 'center',
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 18, color: '#4ade80' }}>
              ₹{deal.price.toLocaleString('en-IN')}
            </div>

            {deal.originalPrice && (
              <div
                style={{
                  fontSize: 14,
                  opacity: 0.6,
                  textDecoration: 'line-through',
                }}
              >
                ₹{deal.originalPrice.toLocaleString('en-IN')}
              </div>
            )}

            <div style={{ opacity: 0.75, fontSize: 13 }}>at {deal.merchant}</div>

            {deal.category && (
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'rgba(255,255,255,0.08)',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {deal.category.icon} {deal.category.name}
              </span>
            )}
          </div>

          {deal.user && (
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
              Posted by{' '}
              <span
                onClick={() => onUserClick && onUserClick(deal.userId)}
                style={{
                  cursor: 'pointer',
                  fontWeight: 700,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#2676ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'inherit';
                }}
              >
                {deal.user.username}
              </span>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          marginTop: 14,
          alignItems: 'center',
        }}
      >
        <button
          onClick={onUpvote}
          style={{
            padding: '8px 12px',
            borderRadius: 10,
            border:
              deal.userVote === 1
                ? '1px solid rgba(76, 175, 80, 0.5)'
                : '1px solid rgba(255,255,255,0.14)',
            background:
              deal.userVote === 1 ? 'rgba(76, 175, 80, 0.25)' : 'rgba(0,0,0,0.25)',
            color: '#eaf2ff',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: 14,
          }}
        >
          👍 {deal.upvotes}
        </button>

        <button
          onClick={onDownvote}
          style={{
            padding: '8px 12px',
            borderRadius: 10,
            border:
              deal.userVote === -1
                ? '1px solid rgba(244, 67, 54, 0.5)'
                : '1px solid rgba(255,255,255,0.14)',
            background:
              deal.userVote === -1 ? 'rgba(244, 67, 54, 0.25)' : 'rgba(0,0,0,0.25)',
            color: '#eaf2ff',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: 14,
          }}
        >
          👎 {deal.downvotes}
        </button>

        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            opacity: 0.75,
            fontSize: 13,
          }}
        >
          <span>Score: {score}</span>
          {deal.commentCount > 0 && <span>💬 {deal.commentCount}</span>}
        </div>
      </div>
    </div>
  );
}
