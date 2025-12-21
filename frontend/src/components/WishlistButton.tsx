import { useState, useEffect } from 'react';
import { saveDeal, removeDeal, checkWishlist } from '../api/wishlist';
import { useAuth } from '../context/AuthContext';

interface WishlistButtonProps {
  dealId: string;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  onAuthRequired?: () => void;
}

export default function WishlistButton({
  dealId,
  size = 'medium',
  showLabel = false,
  onAuthRequired,
}: WishlistButtonProps) {
  const { isAuthenticated } = useAuth();
  const [inWishlist, setInWishlist] = useState(false);
  const [loading, setLoading] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      checkStatus();
    }
  }, [dealId, isAuthenticated]);

  const checkStatus = async () => {
    try {
      const { inWishlist: status } = await checkWishlist(dealId);
      setInWishlist(status);
    } catch (err) {
      // Ignore errors
    }
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!isAuthenticated) {
      onAuthRequired?.();
      return;
    }

    try {
      setLoading(true);
      setAnimating(true);

      if (inWishlist) {
        await removeDeal(dealId);
        setInWishlist(false);
      } else {
        await saveDeal(dealId);
        setInWishlist(true);
      }
    } catch (err) {
      console.error('Wishlist error:', err);
    } finally {
      setLoading(false);
      setTimeout(() => setAnimating(false), 300);
    }
  };

  const sizeStyles = {
    small: { padding: '4px 8px', fontSize: 14, iconSize: 14 },
    medium: { padding: '8px 12px', fontSize: 16, iconSize: 18 },
    large: { padding: '12px 16px', fontSize: 18, iconSize: 22 },
  };

  const { padding, fontSize, iconSize } = sizeStyles[size];

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        padding: showLabel ? padding : `${parseInt(padding) / 2}px`,
        borderRadius: showLabel ? 8 : '50%',
        border: inWishlist ? '1px solid #ec4899' : '1px solid #d1d5db',
        background: inWishlist ? '#fdf2f8' : '#ffffff',
        color: inWishlist ? '#ec4899' : '#6b7280',
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        fontSize,
        fontWeight: 600,
        transition: 'all 0.2s',
        transform: animating ? 'scale(1.2)' : 'scale(1)',
        boxShadow: inWishlist ? '0 2px 8px rgba(236, 72, 153, 0.2)' : 'none',
      }}
      title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <span style={{
        fontSize: iconSize,
        transition: 'transform 0.2s',
        transform: animating ? 'scale(1.3)' : 'scale(1)',
      }}>
        {inWishlist ? '❤️' : '🤍'}
      </span>
      {showLabel && (
        <span>{inWishlist ? 'Saved' : 'Save'}</span>
      )}
    </button>
  );
}
