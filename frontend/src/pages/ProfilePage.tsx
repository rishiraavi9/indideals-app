import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { dealsApi } from '../api/deals';
import AffiliateAnalytics from '../components/AffiliateAnalytics';
import Layout from '../components/Layout';
import { supportedLanguages, changeLanguage, type LanguageCode } from '../i18n';
import type { Deal } from '../types';

type TabType = 'activity' | 'deals' | 'analytics' | 'settings';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('activity');
  const [userDeals, setUserDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(i18n.language as LanguageCode);

  const handleLanguageChange = async (lang: LanguageCode) => {
    setSelectedLanguage(lang);
    await changeLanguage(lang);
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadUserDeals();
  }, [isAuthenticated, navigate]);

  const loadUserDeals = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const response = await dealsApi.getDeals({ userId: user.id, limit: 100 });
      setUserDeals(response.deals);
    } catch (error) {
      console.error('Failed to load user deals:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  // Calculate user statistics
  const totalUpvotes = userDeals.reduce((sum, deal) => sum + (deal.upvotes || 0), 0);
  const totalDownvotes = userDeals.reduce((sum, deal) => sum + (deal.downvotes || 0), 0);
  const totalComments = userDeals.reduce((sum, deal) => sum + (deal.commentCount || 0), 0);

  return (
    <Layout>
      <div style={{ background: '#f5f7fa', minHeight: '100vh' }}>
        {/* Header Section */}
        <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
              {/* Avatar */}
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 48,
                  fontWeight: 900,
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                {user.username.charAt(0).toUpperCase()}
              </div>

              {/* User Info */}
              <div style={{ flex: 1 }}>
                <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, color: '#1a1a1a', marginBottom: 8 }}>
                  {user.username}
                </h1>
                <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
                  {t('profile.memberSince')} {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''}
                </div>

                {/* Reputation Badge */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    borderRadius: 999,
                    background: '#10b981',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  ⭐ {user.reputation} {t('profile.reputation')}
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 32 }}>
              <div
                style={{
                  padding: 20,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff',
                }}
              >
                <div style={{ fontSize: 36, fontWeight: 900, marginBottom: 4 }}>{userDeals.length}</div>
                <div style={{ fontSize: 14, opacity: 0.9 }}>{t('profile.dealsPosted')}</div>
              </div>

              <div
                style={{
                  padding: 20,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                }}
              >
                <div style={{ fontSize: 36, fontWeight: 900, marginBottom: 4 }}>{totalUpvotes}</div>
                <div style={{ fontSize: 14, opacity: 0.9 }}>{t('profile.totalUpvotes')}</div>
              </div>

              <div
                style={{
                  padding: 20,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#fff',
                }}
              >
                <div style={{ fontSize: 36, fontWeight: 900, marginBottom: 4 }}>{totalDownvotes}</div>
                <div style={{ fontSize: 14, opacity: 0.9 }}>{t('profile.totalDownvotes')}</div>
              </div>

              <div
                style={{
                  padding: 20,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#fff',
                }}
              >
                <div style={{ fontSize: 36, fontWeight: 900, marginBottom: 4 }}>{totalComments}</div>
                <div style={{ fontSize: 14, opacity: 0.9 }}>{t('profile.totalComments')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { id: 'activity' as TabType, label: t('profile.myActivity'), icon: '📊' },
                { id: 'deals' as TabType, label: t('profile.myDeals'), icon: '🔥' },
                { id: 'analytics' as TabType, label: t('profile.analytics'), icon: '📈' },
                { id: 'settings' as TabType, label: t('profile.settings'), icon: '⚙️' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '16px 24px',
                    border: 'none',
                    background: activeTab === tab.id ? '#fff' : 'transparent',
                    borderBottom: activeTab === tab.id ? '3px solid #2563eb' : '3px solid transparent',
                    color: activeTab === tab.id ? '#2563eb' : '#6b7280',
                    cursor: 'pointer',
                    fontSize: 15,
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
          {activeTab === 'activity' && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 32, border: '1px solid #e5e7eb' }}>
              <h2 style={{ margin: '0 0 24px 0', fontSize: 24, fontWeight: 700, color: '#1a1a1a' }}>
                {t('profile.recentActivity')}
              </h2>
              <div style={{ color: '#6b7280', fontSize: 14 }}>
                {t('profile.activityDescription')}
              </div>
            </div>
          )}

          {activeTab === 'deals' && (
            <div>
              <div style={{ background: '#fff', borderRadius: 12, padding: 32, border: '1px solid #e5e7eb' }}>
                <h2 style={{ margin: '0 0 24px 0', fontSize: 24, fontWeight: 700, color: '#1a1a1a' }}>
                  {t('profile.myDeals')} ({userDeals.length})
                </h2>

                {loading ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>{t('common.loading')}</div>
                ) : userDeals.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                    {t('profile.noDealsPosted')}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 16 }}>
                    {userDeals.map((deal) => (
                      <div
                        key={deal.id}
                        onClick={() => navigate(`/deal/${deal.id}`)}
                        style={{
                          padding: 20,
                          borderRadius: 12,
                          border: '1px solid #e5e7eb',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          background: '#fff',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                          e.currentTarget.style.borderColor = '#2563eb';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = 'none';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }}
                      >
                        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                          {deal.imageUrl && (
                            <img
                              src={deal.imageUrl}
                              alt={deal.title}
                              style={{
                                width: 80,
                                height: 80,
                                objectFit: 'cover',
                                borderRadius: 8,
                              }}
                            />
                          )}
                          <div style={{ flex: 1 }}>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 600, color: '#1a1a1a' }}>
                              {deal.title}
                            </h3>
                            <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 12 }}>
                              {deal.merchant} • Posted {new Date(deal.createdAt).toLocaleDateString()}
                            </div>
                            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                              <div style={{ fontSize: 24, fontWeight: 900, color: '#10b981' }}>
                                ₹{deal.price.toLocaleString()}
                              </div>
                              {deal.originalPrice && (
                                <div style={{ fontSize: 16, color: '#9ca3af', textDecoration: 'line-through' }}>
                                  ₹{deal.originalPrice.toLocaleString()}
                                </div>
                              )}
                              <div style={{ display: 'flex', gap: 12, marginLeft: 'auto' }}>
                                <span style={{ color: '#10b981', fontSize: 14, fontWeight: 600 }}>
                                  👍 {deal.upvotes || 0}
                                </span>
                                <span style={{ color: '#ef4444', fontSize: 14, fontWeight: 600 }}>
                                  👎 {deal.downvotes || 0}
                                </span>
                                <span style={{ color: '#6b7280', fontSize: 14, fontWeight: 600 }}>
                                  💬 {deal.commentCount || 0}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 32, border: '1px solid #e5e7eb' }}>
              <AffiliateAnalytics />
            </div>
          )}

          {activeTab === 'settings' && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 32, border: '1px solid #e5e7eb' }}>
              <h2 style={{ margin: '0 0 24px 0', fontSize: 24, fontWeight: 700, color: '#1a1a1a' }}>
                {t('profile.accountSettings')}
              </h2>

              <div style={{ display: 'grid', gap: 24 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                    {t('profile.email')}
                  </label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: '1px solid #d1d5db',
                      background: '#f9fafb',
                      color: '#6b7280',
                      fontSize: 15,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                    {t('profile.username')}
                  </label>
                  <input
                    type="text"
                    value={user.username}
                    disabled
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: '1px solid #d1d5db',
                      background: '#f9fafb',
                      color: '#6b7280',
                      fontSize: 15,
                    }}
                  />
                </div>

                {/* Language Preference */}
                <div style={{
                  padding: 24,
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                  borderRadius: 12,
                  border: '1px solid rgba(102, 126, 234, 0.2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <span style={{ fontSize: 24 }}>🌐</span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>
                        {t('profile.languagePreference')}
                      </h3>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
                        {t('profile.selectLanguage')}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                    {supportedLanguages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        style={{
                          padding: '16px 20px',
                          borderRadius: 10,
                          border: selectedLanguage === lang.code
                            ? '2px solid #667eea'
                            : '2px solid #e5e7eb',
                          background: selectedLanguage === lang.code
                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            : '#fff',
                          color: selectedLanguage === lang.code ? '#fff' : '#374151',
                          cursor: 'pointer',
                          fontSize: 15,
                          fontWeight: 600,
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                        }}
                      >
                        <span>{lang.nativeName}</span>
                        {selectedLanguage === lang.code && (
                          <span style={{ fontSize: 16 }}>✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <button
                    style={{
                      padding: '12px 24px',
                      borderRadius: 8,
                      border: 'none',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: '#fff',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: 15,
                    }}
                  >
                    {t('profile.saveChanges')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
