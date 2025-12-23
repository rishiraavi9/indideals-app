import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { supportedLanguages, changeLanguage, type LanguageCode } from '../../i18n';

export type FilterTab = 'all' | 'top-picks' | 'hot-deals' | 'budget-finds' | 'new';

interface MobileHeaderProps {
  activeFilter: FilterTab;
  onFilterChange: (filter: FilterTab) => void;
  onProfileClick: () => void;
}

export default function MobileHeader({
  activeFilter,
  onFilterChange,
  onProfileClick,
}: MobileHeaderProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { isAuthenticated, user } = useAuth();
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
    setSelectedLanguage(lang);
    await changeLanguage(lang);
    setShowLanguageModal(false);
  };

  // Get current language flag/code
  const getCurrentLanguageFlag = () => {
    switch (selectedLanguage) {
      case 'hi': return 'हि';
      case 'mr': return 'म';
      case 'ta': return 'த';
      case 'te': return 'తె';
      default: return 'EN';
    }
  };

  const filters: { id: FilterTab; label: string; icon?: string }[] = [
    { id: 'all', label: t('common.all') },
    { id: 'top-picks', label: t('home.topPicks'), icon: '⭐' },
    { id: 'hot-deals', label: t('home.hot'), icon: '🔥' },
    { id: 'budget-finds', label: t('home.budgetFinds'), icon: '💰' },
    { id: 'new', label: t('home.new'), icon: '✨' },
  ];

  const handleProfileClick = () => {
    if (isAuthenticated) {
      onProfileClick();
    } else {
      navigate('/login');
    }
  };

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: '#1a1a1a',
        zIndex: 100,
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      {/* Top row with profile and logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px 8px',
          gap: 12,
        }}
      >
        {/* Profile Avatar */}
        <button
          onClick={handleProfileClick}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '2px solid #667eea',
            background: isAuthenticated
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : '#333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
          }}
        >
          {isAuthenticated && user?.username ? (
            <span style={{ color: 'white', fontSize: 14, fontWeight: 700 }}>
              {user.username.charAt(0).toUpperCase()}
            </span>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          )}
        </button>

        {/* Filter Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            flex: 1,
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
          className="hide-scrollbar"
        >
          {filters.map((filter) => {
            const isActive = activeFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => onFilterChange(filter.id)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 20,
                  border: isActive ? 'none' : '1px solid #444',
                  background: isActive ? 'white' : 'transparent',
                  color: isActive ? '#1a1a1a' : '#aaa',
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {filter.icon && <span style={{ fontSize: 12 }}>{filter.icon}</span>}
                {filter.label}
              </button>
            );
          })}
        </div>

        {/* Language Selector */}
        <button
          onClick={() => setShowLanguageModal(true)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            border: '1px solid #444',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
            color: '#667eea',
            fontSize: 12,
            fontWeight: 700,
          }}
          title={t('profile.language')}
        >
          {getCurrentLanguageFlag()}
        </button>
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
            paddingBottom: 'calc(60px + env(safe-area-inset-bottom))',
          }}
          onClick={() => setShowLanguageModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxHeight: '60vh',
              background: '#2a2a2a',
              borderRadius: '20px 20px 0 0',
              display: 'flex',
              flexDirection: 'column',
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
                onClick={() => setShowLanguageModal(false)}
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
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
                paddingBottom: 16,
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
    </header>
  );
}
