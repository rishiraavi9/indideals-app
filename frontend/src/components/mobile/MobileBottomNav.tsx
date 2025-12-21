import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

export type ActiveTab = 'home' | 'search' | 'post' | 'forums' | 'alerts';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  alertCount?: number;
}

export default function MobileBottomNav({ activeTab, onTabChange, alertCount = 0 }: MobileBottomNavProps) {
  const { t } = useTranslation();

  const tabs: { id: ActiveTab; label: string; icon: ReactElement; activeIcon: ReactElement }[] = [
    {
      id: 'home',
      label: t('nav.home'),
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
      activeIcon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
      ),
    },
    {
      id: 'search',
      label: t('nav.search'),
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      ),
      activeIcon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      ),
    },
    {
      id: 'post',
      label: t('nav.postDeal'),
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      ),
      activeIcon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="12" y1="8" x2="12" y2="16" stroke="white" />
          <line x1="8" y1="12" x2="16" y2="12" stroke="white" />
        </svg>
      ),
    },
    {
      id: 'forums',
      label: t('nav.forums'),
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
      activeIcon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      id: 'alerts',
      label: t('nav.alerts'),
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
      activeIcon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
    },
  ];

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: `calc(60px + env(safe-area-inset-bottom))`,
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: '#1a1a1a',
        borderTop: '1px solid #2a2a2a',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-around',
        zIndex: 100,
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: 1,
              height: 60,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: isActive ? '#667eea' : '#6b7280',
              position: 'relative',
              transition: 'color 0.2s',
            }}
          >
            {/* Icon */}
            <div style={{ position: 'relative' }}>
              {isActive ? tab.activeIcon : tab.icon}

              {/* Alert badge */}
              {tab.id === 'alerts' && alertCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -8,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    background: '#ef4444',
                    color: 'white',
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                  }}
                >
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </div>

            {/* Label */}
            <span
              style={{
                fontSize: 10,
                fontWeight: isActive ? 700 : 500,
                letterSpacing: -0.2,
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
