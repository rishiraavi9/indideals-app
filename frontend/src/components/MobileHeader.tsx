import { useTranslation } from 'react-i18next';
import Logo from './Logo';
import type { Tab } from '../types';

interface MobileHeaderProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onSearchClick: () => void;
}

export default function MobileHeader({
  activeTab,
  onTabChange,
  onSearchClick,
}: MobileHeaderProps) {
  const { t } = useTranslation();
  const tabs: Tab[] = ['All', 'Hot Deals', 'Great Deals', 'Budget Buys', 'New'];

  // Tab translation map
  const getTabLabel = (tab: Tab): string => {
    switch (tab) {
      case 'All': return t('common.all');
      case 'Hot Deals': return t('home.hot');
      case 'Great Deals': return t('home.greatDeals');
      case 'Budget Buys': return t('home.budgetBuys');
      case 'New': return t('home.new');
      default: return tab;
    }
  };

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
        <Logo variant="horizontal" size="sm" darkMode />

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
          🔍 <span style={{ fontSize: 14, fontWeight: 600 }}>{t('common.search')}</span>
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
              {getTabLabel(tab)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
