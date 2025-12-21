import { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { categoriesApi } from '../api/categories';
import Logo from './Logo';
import type { Category } from '../types';

interface AppHeaderProps {
  // Optional custom logo click handler (for HomePage to reset filters)
  onLogoClick?: () => void;
  // Custom search component (HomePage has its own search with local state)
  searchComponent?: ReactNode;
  // Optional custom "Share a Deal" click handler
  onShareDealClick?: () => void;
}

export default function AppHeader({
  onLogoClick,
  searchComponent,
  onShareDealClick,
}: AppHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  // Categories dropdown state
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoriesDropdown, setShowCategoriesDropdown] = useState(false);
  const categoriesRef = useRef<HTMLDivElement>(null);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await categoriesApi.getCategories();
        setCategories(cats);
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };
    loadCategories();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoriesRef.current && !categoriesRef.current.contains(event.target as Node)) {
        setShowCategoriesDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogoClick = () => {
    if (onLogoClick) {
      onLogoClick();
    } else {
      navigate('/');
    }
  };

  const handleShareDeal = () => {
    if (onShareDealClick) {
      onShareDealClick();
    } else {
      navigate('/post-deal');
    }
  };

  return (
    <div
      style={{
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        {/* Logo */}
        <div
          onClick={handleLogoClick}
          style={{
            cursor: 'pointer',
            transition: 'opacity 0.2s',
            display: 'flex',
            alignItems: 'center',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.7';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          <Logo variant="horizontal" size="md" />
        </div>

        {/* Categories Dropdown */}
        <div style={{ position: 'relative' }} ref={categoriesRef}>
          <button
            onClick={() => setShowCategoriesDropdown(!showCategoriesDropdown)}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              background: showCategoriesDropdown ? '#f3f4f6' : '#ffffff',
              color: '#374151',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!showCategoriesDropdown) e.currentTarget.style.background = '#f9fafb';
            }}
            onMouseLeave={(e) => {
              if (!showCategoriesDropdown) e.currentTarget.style.background = '#ffffff';
            }}
          >
            <span>{t('search.categories')}</span>
            <span style={{ fontSize: 12, transition: 'transform 0.2s', transform: showCategoriesDropdown ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
          </button>

          {/* Dropdown Menu */}
          {showCategoriesDropdown && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                background: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 100,
                minWidth: 250,
                maxHeight: '70vh',
                overflowY: 'auto',
              }}
            >
              {/* Popular Deals Option */}
              <div
                onClick={() => {
                  navigate('/deals');
                  setShowCategoriesDropdown(false);
                }}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #e5e7eb',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#2563eb',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#eff6ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff';
                }}
              >
                🔥 {t('home.popularDeals')}
              </div>

              {/* Category List */}
              {categories.map((category) => (
                <div
                  key={category.id}
                  onClick={() => {
                    navigate(`/deals/${category.slug}`);
                    setShowCategoriesDropdown(false);
                  }}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f3f4f6',
                    fontSize: 14,
                    color: '#374151',
                    transition: 'background 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                  }}
                >
                  <span style={{ fontSize: 18 }}>{category.icon}</span>
                  <span style={{ fontWeight: 500 }}>{category.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Search Component (custom or default) */}
        {searchComponent || <div style={{ flex: 1 }} />}

        {/* User Actions */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {isAuthenticated && user ? (
            <>
              {/* Wishlist Button */}
              <button
                onClick={() => navigate('/wishlist')}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  background: '#ffffff',
                  color: '#374151',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 13,
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
                title={t('profile.wishlist')}
              >
                <span>❤️</span>
              </button>

              {/* Alerts Button */}
              <button
                onClick={() => navigate('/alerts')}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  background: '#ffffff',
                  color: '#374151',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 13,
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
                title={t('profile.priceAlerts')}
              >
                <span>🔔</span>
              </button>

              {/* User Profile */}
              <div
                onClick={() => navigate('/profile')}
                style={{
                  fontSize: 13,
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  padding: '6px 10px',
                  borderRadius: 8,
                  transition: 'background 0.2s',
                  background: '#f9fafb',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f9fafb';
                }}
              >
                <span style={{ fontWeight: 600 }}>{user.username}</span>
                <span
                  style={{
                    padding: '2px 6px',
                    borderRadius: 999,
                    background: '#10b981',
                    color: 'white',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {user.reputation}
                </span>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  background: '#ffffff',
                  color: '#374151',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 13,
                  whiteSpace: 'nowrap',
                }}
              >
                {t('auth.logout')}
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/login')}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 14,
                whiteSpace: 'nowrap',
              }}
            >
              {t('auth.login')}
            </button>
          )}

          {/* Share a Deal Button */}
          <button
            onClick={handleShareDeal}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
            }}
          >
            + {t('nav.postDeal')}
          </button>
        </div>
      </div>
    </div>
  );
}
