import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useHaptics } from '../../hooks/useHaptics';
import { supportedLanguages, changeLanguage, type LanguageCode } from '../../i18n';

interface MobileProfileProps {
  onClose: () => void;
}

export default function MobileProfile({ onClose }: MobileProfileProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();
  const { triggerHaptic } = useHaptics();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(i18n.language as LanguageCode);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showLanguageModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showLanguageModal]);

  const handleLanguageChange = async (lang: LanguageCode) => {
    triggerHaptic('light');
    setSelectedLanguage(lang);
    await changeLanguage(lang);
    setShowLanguageModal(false);
  };

  const getCurrentLanguageName = () => {
    const lang = supportedLanguages.find(l => l.code === selectedLanguage);
    return lang?.nativeName || 'English';
  };

  const menuItems = [
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

  const handleLogout = () => {
    triggerHaptic('medium');
    logout();
    navigate('/');
  };

  if (!isAuthenticated) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#1a1a1a',
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        {/* Back Button */}
        <button
          onClick={() => {
            triggerHaptic('light');
            onClose();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: 15,
            cursor: 'pointer',
            padding: 16,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {t('common.back')}
        </button>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            textAlign: 'center',
            minHeight: '70vh',
          }}
        >
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}
          >
            <span style={{ fontSize: 48 }}>👤</span>
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'white' }}>
            {t('profile.welcomeTitle')}
          </h2>
          <p style={{ margin: '12px 0 24px', fontSize: 14, color: '#9ca3af', lineHeight: 1.5 }}>
            {t('profile.welcomeDescription')}
          </p>
          <button
            onClick={() => {
              triggerHaptic('light');
              navigate('/login');
            }}
            style={{
              width: '100%',
              maxWidth: 280,
              padding: '14px 32px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
            }}
          >
            {t('profile.loginSignup')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#1a1a1a', minHeight: '100vh', paddingBottom: 20 }}>
      {/* Profile Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '24px 16px',
          paddingTop: 'calc(24px + env(safe-area-inset-top))',
          color: 'white',
        }}
      >
        {/* Back Button */}
        <button
          onClick={() => {
            triggerHaptic('light');
            onClose();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: 15,
            cursor: 'pointer',
            padding: 0,
            marginBottom: 16,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {t('common.back')}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '3px solid rgba(255,255,255,0.3)',
            }}
          >
            <span style={{ fontSize: 32 }}>
              {user?.username?.charAt(0).toUpperCase() || '👤'}
            </span>
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{user?.username}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.9 }}>{user?.email}</p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 8,
              }}
            >
              <span
                style={{
                  background: '#10b981',
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                ⭐ {user?.reputation || 0} {t('profile.reputation')}
              </span>
              <span
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {t('profile.memberSince')} 2024
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            marginTop: 20,
          }}
        >
          {[
            { label: t('profile.dealsSaved'), value: '12' },
            { label: t('profile.alertsActive'), value: '5' },
            { label: t('profile.totalSavings'), value: '₹8.2K' },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: 'rgba(255,255,255,0.15)',
                borderRadius: 12,
                padding: '12px 8px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 700 }}>{stat.value}</div>
              <div style={{ fontSize: 11, opacity: 0.9 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Menu Sections */}
      {menuItems.map((section) => (
        <div key={section.section} style={{ marginTop: 8 }}>
          <div
            style={{
              padding: '12px 16px',
              fontSize: 13,
              fontWeight: 600,
              color: '#9ca3af',
              background: '#1a1a1a',
            }}
          >
            {section.section}
          </div>
          <div style={{ background: '#2a2a2a' }}>
            {section.items.map((item, index) => (
              <button
                key={item.path || item.action}
                onClick={() => {
                  triggerHaptic('light');
                  if (item.action === 'language') {
                    setShowLanguageModal(true);
                  } else {
                    navigate(item.path);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '16px',
                  border: 'none',
                  borderBottom: index < section.items.length - 1 ? '1px solid #333' : 'none',
                  background: '#2a2a2a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <span style={{ flex: 1, fontSize: 15, color: 'white' }}>{item.label}</span>
                {item.currentValue && (
                  <span style={{ fontSize: 13, color: '#667eea', fontWeight: 600 }}>
                    {item.currentValue}
                  </span>
                )}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Logout Button */}
      <div style={{ padding: '24px 16px' }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 12,
            border: '1px solid #ef4444',
            background: 'transparent',
            color: '#ef4444',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {t('nav.logout')}
        </button>
      </div>

      {/* App Version */}
      <div style={{ textAlign: 'center', padding: '0 16px 20px', color: '#6b7280', fontSize: 12 }}>
        {t('profile.appVersion')}
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
            alignItems: 'flex-end',
          }}
          onClick={() => setShowLanguageModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxHeight: '80vh',
              background: '#2a2a2a',
              borderRadius: '20px 20px 0 0',
              display: 'flex',
              flexDirection: 'column',
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
                padding: '16px 20px',
                borderBottom: '1px solid #333',
                flexShrink: 0,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'white' }}>
                {t('profile.selectLanguage')}
              </h3>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setShowLanguageModal(false);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9ca3af',
                  fontSize: 24,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                ×
              </button>
            </div>

            {/* Language Options */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
                overscrollBehavior: 'contain',
              }}
            >
              {supportedLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    border: 'none',
                    background: selectedLanguage === lang.code ? 'rgba(102, 126, 234, 0.15)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 16, color: 'white', fontWeight: 500 }}>
                      {lang.nativeName}
                    </div>
                    <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>
                      {lang.name}
                    </div>
                  </div>
                  {selectedLanguage === lang.code && (
                    <svg
                      width="20"
                      height="20"
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
  );
}
