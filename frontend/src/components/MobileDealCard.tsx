import type { Deal } from '../types';

interface MobileDealCardProps {
  deal: Deal;
  onUpvote: () => void;
  onDownvote: () => void;
  onView: () => void;
}

export default function MobileDealCard({
  deal,
  onUpvote,
  onDownvote,
  onView,
}: MobileDealCardProps) {
  const discount = deal.originalPrice
    ? Math.round(((deal.originalPrice - deal.price) / deal.originalPrice) * 100)
    : 0;

  const formatPrice = (price: number) => {
    return `₹${(price / 100).toLocaleString('en-IN')}`;
  };

  return (
    <div
      onClick={onView}
      style={{
        background: '#1a1a1a',
        borderRadius: 0,
        overflow: 'hidden',
        cursor: 'pointer',
        borderBottom: '8px solid #0a0a0a',
        padding: '16px',
      }}
    >
      <div style={{ display: 'flex', gap: 12 }}>
        {/* Product Image */}
        {deal.imageUrl && (
          <div
            style={{
              flexShrink: 0,
              width: 90,
              height: 90,
              background: '#fff',
              borderRadius: 8,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={deal.imageUrl}
              alt={deal.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Deal Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title */}
          <h3
            style={{
              margin: '0 0 8px 0',
              fontSize: 15,
              fontWeight: 600,
              color: '#fff',
              lineHeight: 1.3,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {deal.title}
          </h3>

          {/* Price */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
            <span
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: '#10b981',
              }}
            >
              {formatPrice(deal.price)}
            </span>
            {deal.originalPrice && (
              <>
                <span
                  style={{
                    fontSize: 14,
                    color: '#888',
                    textDecoration: 'line-through',
                  }}
                >
                  {formatPrice(deal.originalPrice)}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#ef4444',
                  }}
                >
                  -{discount}%
                </span>
              </>
            )}
          </div>

          {/* Merchant */}
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 12 }}>
            at <strong style={{ color: '#fff' }}>{deal.merchant}</strong>
          </div>

          {/* Interaction Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            {/* Upvote/Downvote */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpvote();
                }}
                style={{
                  background: deal.userVote === 1 ? '#10b981' : '#333',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 10px',
                  color: deal.userVote === 1 ? '#fff' : '#aaa',
                  cursor: 'pointer',
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                👍
              </button>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', minWidth: 30, textAlign: 'center' }}>
                {deal.upvotes}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDownvote();
                }}
                style={{
                  background: deal.userVote === -1 ? '#ef4444' : '#333',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 10px',
                  color: deal.userVote === -1 ? '#fff' : '#aaa',
                  cursor: 'pointer',
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                👎
              </button>
            </div>

            {/* Comments */}
            {deal.commentCount !== undefined && deal.commentCount > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  color: '#aaa',
                }}
              >
                <span>💬</span>
                <span>{deal.commentCount}</span>
              </div>
            )}

            {/* Time */}
            <div style={{ marginLeft: 'auto', fontSize: 11, color: '#666' }}>
              {new Date(deal.createdAt).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
