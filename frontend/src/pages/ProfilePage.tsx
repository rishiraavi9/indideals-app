import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getWishlist, type SavedDeal } from '../api/wishlist';
import Layout from '../components/Layout';
import { supportedLanguages, changeLanguage, type LanguageCode } from '../i18n';

interface MenuItem {
  icon: string;
  label: string;
  path: string;
  action?: string;
  currentValue?: string;
}

interface MenuSection {
  section: string;
  items: MenuItem[];
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();
  const [wishlistItems, setWishlistItems] = useState<SavedDeal[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(i18n.language as LanguageCode);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const handleLanguageChange = async (lang: LanguageCode) => {
    setSelectedLanguage(lang);
    await changeLanguage(lang);
    setShowLanguageModal(false);
  };

  const getCurrentLanguageName = () => {
    const lang = supportedLanguages.find(l => l.code === selectedLanguage);
    return lang?.nativeName || 'English';
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadWishlist();
  }, [isAuthenticated, navigate]);

  const loadWishlist = async () => {
    if (!user?.id) return;
    try {
      const response = await getWishlist(100, 0);
      setWishlistItems(response.wishlist);
    } catch (error) {
      console.error('Failed to load wishlist:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) {
    return null;
  }

  const menuItems: MenuSection[] = [
    {
      section: t('profile.myAccount'),
      items: [
        { icon: '📦', label: t('profile.myOrders'), path: '/orders' },
        { icon: '❤️', label: t('profile.wishlist'), path: '/wishlist' },
        { icon: '🔔', label: t('profile.priceAlerts'), path: '/alerts' },
        { icon: '📊', label: t('profile.dealHistory'), path: '/history' },
      ],
    },
    {
      section: t('profile.settings'),
      items: [
        { icon: '👤', label: t('profile.editProfile'), path: '/profile/edit' },
        { icon: '🔐', label: t('profile.changePassword'), path: '/profile/password' },
        { icon: '📧', label: t('profile.emailPreferences'), path: '/profile/notifications' },
        { icon: '🌐', label: t('profile.language'), path: '', action: 'language', currentValue: getCurrentLanguageName() },
      ],
    },
    {
      section: t('profile.helpSupport'),
      items: [
        { icon: '❓', label: t('profile.faqs'), path: '/help/faq' },
        { icon: '💬', label: t('profile.contactUs'), path: '/help/contact' },
        { icon: '📜', label: t('profile.termsOfService'), path: '/terms' },
        { icon: '🔒', label: t('profile.privacyPolicy'), path: '/privacy' },
      ],
    },
  ];

  // Calculate stats from wishlist items
  const totalSavings = wishlistItems.reduce((sum, item) => {
    const deal = item.deal;
    if (deal.originalPrice && deal.price) {
      return sum + (deal.originalPrice - deal.price);
    }
    return sum;
  }, 0);

  return (
    <Layout>
      <div style={{ background: '#1a1a1a', minHeight: '100vh' }}>
        {/* Header Section with Gradient */}
        <div
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '40px 24px',
            color: 'white',
          }}
        >
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              {/* Avatar */}
              <div
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '4px solid rgba(255,255,255,0.3)',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 48, fontWeight: 700 }}>
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* User Info */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>{user.username}</h1>
                <p style={{ margin: '8px 0 0', fontSize: 14, opacity: 0.9 }}>{user.email}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      background: '#10b981',
                      padding: '6px 14px',
                      borderRadius: 20,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    ⭐ {user.reputation || 0} {t('profile.reputation')}
                  </span>
                  <span
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      padding: '6px 14px',
                      borderRadius: 20,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {t('profile.memberSince')} {user.createdAt ? new Date(user.createdAt).getFullYear() : new Date().getFullYear()}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 16,
                marginTop: 32,
              }}
            >
              {[
                { label: t('profile.dealsSaved'), value: wishlistItems.length.toString() },
                { label: t('profile.alertsActive'), value: '0' },
                { label: t('profile.totalSavings'), value: `₹${(totalSavings / 100).toFixed(0)}` },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: 16,
                    padding: '20px 16px',
                    textAlign: 'center',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <div style={{ fontSize: 28, fontWeight: 800 }}>{stat.value}</div>
                  <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Menu Sections */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
              gap: 24,
            }}
          >
            {menuItems.map((section) => (
              <div key={section.section}>
                <div
                  style={{
                    padding: '12px 16px',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#9ca3af',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {section.section}
                </div>
                <div
                  style={{
                    background: '#2a2a2a',
                    borderRadius: 16,
                    overflow: 'hidden',
                  }}
                >
                  {section.items.map((item, index) => (
                    <button
                      key={item.path || item.action}
                      onClick={() => {
                        if (item.action === 'language') {
                          setShowLanguageModal(true);
                        } else {
                          navigate(item.path);
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '18px 20px',
                        border: 'none',
                        borderBottom: index < section.items.length - 1 ? '1px solid #3a3a3a' : 'none',
                        background: 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#333';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <span style={{ fontSize: 22 }}>{item.icon}</span>
                      <span style={{ flex: 1, fontSize: 15, color: 'white', fontWeight: 500 }}>
                        {item.label}
                      </span>
                      {item.currentValue && (
                        <span style={{ fontSize: 13, color: '#667eea', fontWeight: 600 }}>
                          {item.currentValue}
                        </span>
                      )}
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Logout Button */}
          <div style={{ marginTop: 32, maxWidth: 400 }}>
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: 12,
                border: '2px solid #ef4444',
                background: 'transparent',
                color: '#ef4444',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ef4444';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#ef4444';
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {t('nav.logout')}
            </button>
          </div>

          {/* App Version */}
          <div
            style={{
              textAlign: 'center',
              padding: '32px 16px',
              color: '#6b7280',
              fontSize: 13,
            }}
          >
            {t('profile.appVersion')}
          </div>
        </div>

        {/* Language Selection Modal */}
        {showLanguageModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => setShowLanguageModal(false)}
          >
            <div
              style={{
                width: '100%',
                maxWidth: 480,
                margin: '0 16px',
                background: '#2a2a2a',
                borderRadius: 20,
                overflow: 'hidden',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '20px 24px',
                  borderBottom: '1px solid #3a3a3a',
                }}
              >
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'white' }}>
                  {t('profile.selectLanguage')}
                </h3>
                <button
                  onClick={() => setShowLanguageModal(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#9ca3af',
                    fontSize: 28,
                    cursor: 'pointer',
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>

              {/* Language Options */}
              <div style={{ padding: '12px 0' }}>
                {supportedLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    style={{
                      width: '100%',
                      padding: '18px 24px',
                      border: 'none',
                      background: selectedLanguage === lang.code ? 'rgba(102, 126, 234, 0.2)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedLanguage !== lang.code) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedLanguage !== lang.code) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 16, color: 'white', fontWeight: 600 }}>
                        {lang.nativeName}
                      </div>
                      <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>
                        {lang.name}
                      </div>
                    </div>
                    {selectedLanguage === lang.code && (
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#667eea"
                        strokeWidth="3"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
