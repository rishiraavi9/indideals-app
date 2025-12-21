import type { Tab } from '../../types';

interface MobileFilterChipsProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; emoji: string }[] = [
  { id: 'All', label: 'All Deals', emoji: '🛍️' },
  { id: 'Hot Deals', label: '70%+ Off', emoji: '🔥' },
  { id: 'Great Deals', label: '50%+ Off', emoji: '💰' },
  { id: 'Budget Buys', label: 'Under ₹500', emoji: '💵' },
  { id: 'New', label: 'New Today', emoji: '✨' },
];

export default function MobileFilterChips({
  activeTab,
  onTabChange,
}: MobileFilterChipsProps) {
  return (
    <div style={{
      background: 'white',
      padding: '10px 0',
      borderBottom: '1px solid #e5e7eb',
    }}>
      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          padding: '0 12px',
          WebkitOverflowScrolling: 'touch',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
        }}
        className="hide-scrollbar"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '8px 14px',
                borderRadius: 20,
                border: isActive ? 'none' : '1px solid #d1d5db',
                background: isActive
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : 'white',
                color: isActive ? 'white' : '#374151',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                boxShadow: isActive ? '0 2px 8px rgba(102, 126, 234, 0.3)' : 'none',
              }}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
