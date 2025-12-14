import type { Tab } from '../types';

interface MobileHeaderProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onSearchClick: () => void;
  isAuthenticated: boolean;
  onPostClick: () => void;
}

export default function MobileHeader({
  activeTab,
  onTabChange,
  onSearchClick,
  isAuthenticated,
  onPostClick,
}: MobileHeaderProps) {
  const tabs: Tab[] = ['For You', 'Frontpage', 'Popular', 'New'];

  return (
    <div
      style={{
        background: '#1a1a1a',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      {/* Top Bar with Logo and Search */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid #333',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 24 }}>🔥</span>
          <span
            style={{
              fontSize: 20,
              fontWeight: 900,
              color: '#fff',
              letterSpacing: -0.5,
            }}
          >
            IndiaDeals
          </span>
        </div>

        {/* Search Icon */}
        <button
          onClick={onSearchClick}
          style={{
            background: '#333',
            border: 'none',
            borderRadius: 8,
            padding: '8px 16px',
            color: '#fff',
            fontSize: 20,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          🔍 <span style={{ fontSize: 14, fontWeight: 600 }}>Search</span>
        </button>
      </div>

      {/* Horizontal Scrolling Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          padding: '0 16px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              style={{
                padding: '12px 20px',
                background: isActive ? '#fff' : 'transparent',
                color: isActive ? '#1a1a1a' : '#aaa',
                border: 'none',
                borderRadius: isActive ? '12px 12px 0 0' : '0',
                fontSize: 15,
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.2s',
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>
    </div>
  );
}
