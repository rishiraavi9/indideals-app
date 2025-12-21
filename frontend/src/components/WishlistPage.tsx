import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from './Layout';
import DealCard from './DealCard';
import { getWishlist, removeDeal, type SavedDeal } from '../api/wishlist';
import { useAuth } from '../context/AuthContext';

export default function WishlistPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [wishlist, setWishlist] = useState<SavedDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadWishlist();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadWishlist = async () => {
    try {
      setLoading(true);
      const response = await getWishlist(100, 0);
      setWishlist(response.wishlist);
    } catch (err) {
      console.error('Failed to load wishlist:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (dealId: string) => {
    try {
      setRemoving(dealId);
      await removeDeal(dealId);
      setWishlist(prev => prev.filter(item => item.dealId !== dealId));
    } catch (err) {
      console.error('Failed to remove from wishlist:', err);
    } finally {
      setRemoving(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <Layout onPostDealClick={() => navigate('/')}>
        <div style={{
          maxWidth: 600,
          margin: '60px auto',
          padding: 40,
          textAlign: 'center',
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>🔒</div>
          <h2 style={{ margin: '0 0 12px', color: '#1a1a1a', fontSize: 24, fontWeight: 700 }}>
            Login Required
          </h2>
          <p style={{ color: '#6b7280', marginBottom: 24, fontSize: 15 }}>
            Please log in to view your saved deals and wishlists.
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '12px 32px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            Go to Homepage
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout onPostDealClick={() => navigate('/')}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: 24,
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 16,
          padding: 32,
          marginBottom: 24,
          color: '#ffffff',
        }}>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800 }}>
            ❤️ My Wishlist
          </h1>
          <p style={{ margin: '12px 0 0', opacity: 0.9, fontSize: 16 }}>
            {wishlist.length} saved deal{wishlist.length !== 1 ? 's' : ''} - Track prices and never miss a great deal
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: 60,
            textAlign: 'center',
            color: '#6b7280',
          }}>
            Loading your wishlist...
          </div>
        ) : wishlist.length === 0 ? (
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: 60,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>💔</div>
            <h3 style={{ margin: '0 0 12px', color: '#1a1a1a', fontSize: 20, fontWeight: 700 }}>
              Your wishlist is empty
            </h3>
            <p style={{ color: '#6b7280', marginBottom: 24, fontSize: 15 }}>
              Save deals you're interested in to track their prices and get notified of drops.
            </p>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '12px 32px',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 15,
                cursor: 'pointer',
              }}
            >
              Browse Deals
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 20,
          }}>
            {wishlist.map((item) => (
              <div key={item.id} style={{ position: 'relative' }}>
                <DealCard
                  deal={item.deal}
                  onUpvote={() => {}}
                  onDownvote={() => {}}
                />
                {/* Remove button overlay */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(item.dealId);
                  }}
                  disabled={removing === item.dealId}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: 'none',
                    background: 'rgba(255,255,255,0.95)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    cursor: removing === item.dealId ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    zIndex: 10,
                  }}
                  title="Remove from wishlist"
                >
                  {removing === item.dealId ? '...' : '×'}
                </button>
                {/* Saved date */}
                <div style={{
                  position: 'absolute',
                  bottom: 8,
                  left: 8,
                  background: 'rgba(0,0,0,0.7)',
                  color: '#ffffff',
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 600,
                  zIndex: 10,
                }}>
                  Saved {new Date(item.savedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tips Section */}
        {wishlist.length > 0 && (
          <div style={{
            marginTop: 32,
            background: '#f0f9ff',
            borderRadius: 12,
            padding: 20,
            border: '1px solid #bae6fd',
          }}>
            <h4 style={{ margin: '0 0 12px', color: '#0369a1', fontSize: 14, fontWeight: 700 }}>
              💡 Pro Tips
            </h4>
            <ul style={{ margin: 0, paddingLeft: 20, color: '#0369a1', fontSize: 13, lineHeight: 1.8 }}>
              <li>Set price alerts on deals to get notified when prices drop</li>
              <li>Check back often - deals can expire quickly</li>
              <li>Compare prices across different retailers before buying</li>
            </ul>
          </div>
        )}
      </div>
    </Layout>
  );
}
