import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getPersonalizedDeals, getUserProfile, type PersonalizedDeal, type UserPreferenceProfile } from '../api/ai';
import { dealsApi } from '../api/deals';
import CompactDealCard from './CompactDealCard';
import type { Deal } from '../types';

interface ForYouTabProps {
  onVote: (dealId: string, voteType: number) => void;
  onView: (dealId: string) => void;
}

export default function ForYouTab({ onVote, onView }: ForYouTabProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [recommendations, setRecommendations] = useState<PersonalizedDeal[]>([]);
  const [profile, setProfile] = useState<UserPreferenceProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPersonalizedDeals();
  }, [isAuthenticated]);

  const loadPersonalizedDeals = async () => {
    setLoading(true);
    setError(null);

    try {
      if (isAuthenticated) {
        // Get AI personalized recommendations
        const [recs, userProfile] = await Promise.all([
          getPersonalizedDeals(30),
          getUserProfile().catch(() => null),
        ]);

        setRecommendations(recs);
        setProfile(userProfile);

        // Fetch full deal details for the recommended deals
        if (recs.length > 0) {
          const dealIds = recs.map(r => r.dealId);
          const dealsData = await Promise.all(
            dealIds.map(id => dealsApi.getDeal(id).catch(() => null))
          );
          const validDeals = dealsData.filter((d): d is Deal => d !== null);

          // Sort by hybrid score from recommendations
          validDeals.sort((a, b) => {
            const aRec = recs.find(r => r.dealId === a.id);
            const bRec = recs.find(r => r.dealId === b.id);
            return (bRec?.hybridScore || 0) - (aRec?.hybridScore || 0);
          });

          setDeals(validDeals);
        }
      } else {
        // For non-authenticated users, show trending deals
        const response = await dealsApi.getDeals({
          tab: 'popular',
          limit: 30,
        });
        setDeals(response.deals);
      }
    } catch (err) {
      console.error('Failed to load personalized deals:', err);
      setError('Failed to load personalized recommendations');
      // Fallback to regular deals
      try {
        const response = await dealsApi.getDeals({ tab: 'frontpage', limit: 30 });
        setDeals(response.deals);
      } catch {
        setDeals([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const getMatchReason = (dealId: string): string[] => {
    const rec = recommendations.find(r => r.dealId === dealId);
    return rec?.matchReasons || [];
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>🤖</div>
        <div>Finding deals just for you...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div>
        {/* Login prompt */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          color: '#fff',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
          <h3 style={{ margin: '0 0 8px 0', fontWeight: 700 }}>
            Get Personalized Recommendations
          </h3>
          <p style={{ margin: '0 0 16px 0', opacity: 0.9 }}>
            Login to get AI-powered deal recommendations based on your preferences
          </p>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '12px 24px',
              borderRadius: 8,
              border: 'none',
              background: '#fff',
              color: '#667eea',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Login to Personalize
          </button>
        </div>

        {/* Show trending deals as fallback */}
        <h3 style={{ margin: '0 0 16px 0', fontWeight: 700, color: '#374151' }}>
          🔥 Trending Deals
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 16,
        }}>
          {deals.map((deal) => (
            <CompactDealCard
              key={deal.id}
              deal={deal}
              onUpvote={() => onVote(deal.id, deal.userVote === 1 ? 0 : 1)}
              onDownvote={() => onVote(deal.id, deal.userVote === -1 ? 0 : -1)}
              onView={() => onView(deal.id)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* User Profile Summary */}
      {profile && profile.totalInteractions >= 3 && (
        <div style={{
          background: '#f9fafb',
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
          border: '1px solid #e5e7eb',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 24 }}>🤖</span>
            <div>
              <h3 style={{ margin: 0, fontWeight: 700, color: '#374151' }}>
                Your Deal Profile
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
                Based on {profile.totalInteractions} interactions
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            {/* Preferred Categories */}
            {profile.preferredCategories.length > 0 && (
              <div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Top Categories</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {profile.preferredCategories.slice(0, 3).map((cat, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: 11,
                        padding: '4px 8px',
                        borderRadius: 4,
                        background: '#dbeafe',
                        color: '#1e40af',
                        fontWeight: 600,
                      }}
                    >
                      {cat.weight}%
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Preferred Price Range */}
            <div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Price Range</div>
              <div style={{ fontWeight: 600, color: '#374151' }}>
                ₹{profile.preferredPriceRange.min.toLocaleString('en-IN')} - ₹{profile.preferredPriceRange.max.toLocaleString('en-IN')}
              </div>
            </div>

            {/* Preferred Discount */}
            <div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Avg Liked Discount</div>
              <div style={{ fontWeight: 600, color: '#10b981' }}>
                {profile.avgLikedDiscount}% off
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Low activity prompt */}
      {profile && profile.totalInteractions < 3 && (
        <div style={{
          background: '#fef3c7',
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          border: '1px solid #fde68a',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>💡</span>
            <div>
              <div style={{ fontWeight: 600, color: '#92400e' }}>
                Keep exploring to get better recommendations!
              </div>
              <div style={{ fontSize: 13, color: '#b45309' }}>
                Vote on {3 - profile.totalInteractions} more deals to unlock personalized picks
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deals with match reasons */}
      {deals.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>🔍</div>
          <div>No personalized recommendations yet</div>
          <div style={{ fontSize: 14, marginTop: 8 }}>
            Browse more deals and vote to help us learn your preferences
          </div>
        </div>
      ) : (
        <>
          <h3 style={{ margin: '0 0 16px 0', fontWeight: 700, color: '#374151' }}>
            🎯 Picked for You
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 16,
          }}>
            {deals.map((deal) => {
              const reasons = getMatchReason(deal.id);
              return (
                <div key={deal.id} style={{ position: 'relative' }}>
                  <CompactDealCard
                    deal={deal}
                    onUpvote={() => onVote(deal.id, deal.userVote === 1 ? 0 : 1)}
                    onDownvote={() => onVote(deal.id, deal.userVote === -1 ? 0 : -1)}
                    onView={() => onView(deal.id)}
                  />
                  {/* Match reason badge */}
                  {reasons.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      bottom: 8,
                      left: 8,
                      right: 8,
                      background: 'rgba(102, 126, 234, 0.95)',
                      borderRadius: 6,
                      padding: '4px 8px',
                      fontSize: 10,
                      color: '#fff',
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {reasons[0]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {error && (
        <div style={{
          marginTop: 16,
          padding: 12,
          borderRadius: 8,
          background: '#fee2e2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          fontSize: 14,
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
