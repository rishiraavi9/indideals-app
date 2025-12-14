import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dealsApi } from '../api/deals';
import type { Deal, User } from '../types';

interface UserProfileProps {
  userId?: string;
  onClose: () => void;
}

interface UserStats {
  totalDeals: number;
  totalUpvotes: number;
  totalDownvotes: number;
  totalComments: number;
  recentDeals: Deal[];
}

export default function UserProfile({ userId, onClose }: UserProfileProps) {
  const { user: currentUser } = useAuth();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  console.log('[UserProfile] Component rendered with userId:', userId, 'currentUser:', currentUser?.id);

  useEffect(() => {
    console.log('[UserProfile] useEffect triggered - userId:', userId, 'currentUser?.id:', currentUser?.id);
    // Only load if we have a valid target (either userId or currentUser)
    if (userId || currentUser) {
      loadProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, currentUser?.id]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      // Reset stats first to avoid showing stale data
      setStats(null);
      setProfileUser(null);

      // IMPORTANT: If userId is provided, ALWAYS use it (viewing another user's profile)
      // Only use currentUser.id if userId is null/undefined (viewing own profile)
      const targetUserId = userId || currentUser?.id;
      const isOwnProfile = !userId || (currentUser && userId === currentUser.id);

      console.log('[UserProfile] Loading deals for:', {
        'userId prop': userId,
        'currentUserId': currentUser?.id,
        'targetUserId (what we will use)': targetUserId,
        'isOwnProfile': isOwnProfile
      });

      // If viewing own profile, we already have user data
      if (isOwnProfile && currentUser) {
        setProfileUser(currentUser);
      } else if (userId) {
        // TODO: Fetch other user's profile data
        // For now, we'll fetch their deals and extract user info
      }
      if (targetUserId) {
        const response = await dealsApi.getDeals({ userId: targetUserId, limit: 50 });
        const userDeals = response.deals;
        console.log('[UserProfile] Loaded deals:', userDeals.length, 'deals for user', targetUserId);

        // Calculate stats from deals
        const totalUpvotes = userDeals.reduce((sum, deal) => sum + deal.upvotes, 0);
        const totalDownvotes = userDeals.reduce((sum, deal) => sum + deal.downvotes, 0);
        const totalComments = userDeals.reduce((sum, deal) => sum + deal.commentCount, 0);

        setStats({
          totalDeals: userDeals.length,
          totalUpvotes,
          totalDownvotes,
          totalComments,
          recentDeals: userDeals.slice(0, 10),
        });

        // Extract user from first deal if viewing another user
        if (!isOwnProfile && userDeals.length > 0 && userDeals[0].user) {
          setProfileUser(userDeals[0].user as User);
        } else if (!isOwnProfile && userDeals.length === 0) {
          // User has no deals - we can't get their info from deals
          // For now, show a placeholder (ideally we'd have a /users/:id endpoint)
          console.warn('Cannot load user profile - user has no deals');
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      // Reset stats on error
      setStats({
        totalDeals: 0,
        totalUpvotes: 0,
        totalDownvotes: 0,
        totalComments: 0,
        recentDeals: [],
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate these for rendering
  const isOwnProfile = !userId || (currentUser && userId === currentUser.id);
  const displayUser = isOwnProfile ? currentUser : profileUser;

  if (loading) {
    return (
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
      >
        <p style={{ color: '#eaf2ff', fontSize: 18 }}>Loading profile...</p>
      </div>
    );
  }

  if (!displayUser || !stats) {
    return (
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
      >
        <p style={{ color: '#eaf2ff', fontSize: 18 }}>User not found</p>
      </div>
    );
  }

  const joinDate = new Date(displayUser.createdAt || Date.now()).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        zIndex: 1000,
        overflowY: 'auto',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 900,
          background: 'linear-gradient(180deg, rgba(14, 46, 110, 0.6), rgba(2, 6, 16, 0.95))',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 24px 70px rgba(0,0,0,0.6)',
          color: '#eaf2ff',
          marginTop: 20,
        }}
      >
        {/* Header */}
        <div style={{ padding: 24, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              {/* Avatar */}
              <div
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2676ff, #4caf50)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 40,
                  fontWeight: 900,
                  color: '#fff',
                  border: '3px solid rgba(255,255,255,0.2)',
                }}
              >
                {displayUser.username.charAt(0).toUpperCase()}
              </div>

              <div>
                <h2 style={{ margin: 0, fontSize: 32, fontWeight: 900 }}>
                  {displayUser.username}
                </h2>
                <p style={{ margin: '4px 0 8px', opacity: 0.7, fontSize: 14 }}>
                  Joined {joinDate}
                </p>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div
                    style={{
                      padding: '6px 12px',
                      borderRadius: 999,
                      background: 'rgba(76, 175, 80, 0.25)',
                      border: '1px solid rgba(76, 175, 80, 0.4)',
                      fontSize: 14,
                      fontWeight: 800,
                      color: '#4ade80',
                    }}
                  >
                    ⭐ {displayUser.reputation || 0} Reputation
                  </div>
                  {isOwnProfile && (
                    <div
                      style={{
                        padding: '6px 12px',
                        borderRadius: 999,
                        background: 'rgba(38, 118, 255, 0.25)',
                        border: '1px solid rgba(38, 118, 255, 0.4)',
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#78aaff',
                      }}
                    >
                      Your Profile
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.4)',
                color: '#eaf2ff',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 16,
            padding: 24,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: 'rgba(38, 118, 255, 0.15)',
              border: '1px solid rgba(38, 118, 255, 0.3)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 900, color: '#2676ff' }}>
              {stats.totalDeals}
            </div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>Deals Posted</div>
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: 'rgba(76, 175, 80, 0.15)',
              border: '1px solid rgba(76, 175, 80, 0.3)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 900, color: '#4caf50' }}>
              {stats.totalUpvotes}
            </div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>Total Upvotes</div>
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: 'rgba(244, 67, 54, 0.15)',
              border: '1px solid rgba(244, 67, 54, 0.3)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 900, color: '#f44336' }}>
              {stats.totalDownvotes}
            </div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>Total Downvotes</div>
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: 'rgba(255, 193, 7, 0.15)',
              border: '1px solid rgba(255, 193, 7, 0.3)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 900, color: '#ffc107' }}>
              {stats.totalComments}
            </div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>Total Comments</div>
          </div>
        </div>

        {/* Recent Deals */}
        <div style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 800 }}>
            Recent Deals
          </h3>

          {stats.recentDeals.length === 0 ? (
            <p style={{ opacity: 0.6, textAlign: 'center', padding: 20 }}>
              No deals posted yet
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {stats.recentDeals.map((deal) => (
                <div
                  key={deal.id}
                  style={{
                    padding: 16,
                    borderRadius: 10,
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 16,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                      {deal.title}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.7 }}>
                      {deal.merchant} • Posted {new Date(deal.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 900,
                        color: '#4ade80',
                      }}
                    >
                      ₹{deal.price.toLocaleString('en-IN')}
                    </div>

                    <div
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        background: 'rgba(76, 175, 80, 0.2)',
                        border: '1px solid rgba(76, 175, 80, 0.3)',
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#4caf50',
                      }}
                    >
                      👍 {deal.upvotes}
                    </div>

                    <div
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      💬 {deal.commentCount}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
