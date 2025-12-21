import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHaptics } from '../../hooks/useHaptics';

type ForumTab = 'the-deals' | 'deal-discussion' | 'general' | 'slickdeals';

interface ForumCategory {
  id: string;
  name: string;
  icon: string;
  description?: string;
}

const dealCategories: ForumCategory[] = [
  { id: 'hot-deals', name: 'Hot Deals', icon: '🔥' },
  { id: 'festive', name: 'Festive Sale 2025', icon: '🎊' },
  { id: 'freebies', name: 'Freebies', icon: '🎁' },
  { id: 'free-magazines', name: 'Free Magazines', icon: '📰' },
  { id: 'free-digital', name: 'Free Digital Goods', icon: '📲' },
  { id: 'marketplace', name: 'Marketplace Deals', icon: '🏪' },
  { id: 'coupons', name: 'Coupons', icon: '🎫' },
  { id: 'contests', name: 'Contests & Sweepstakes', icon: '🏆' },
];

const discussionCategories: ForumCategory[] = [
  { id: 'tech', name: 'Tech & Electronics', icon: '📱' },
  { id: 'fashion', name: 'Fashion & Beauty', icon: '👗' },
  { id: 'home', name: 'Home & Garden', icon: '🏠' },
  { id: 'travel', name: 'Travel & Entertainment', icon: '✈️' },
  { id: 'finance', name: 'Finance & Banking', icon: '💳' },
];

export default function MobileForums() {
  const navigate = useNavigate();
  const { triggerHaptic } = useHaptics();

  const [activeTab, setActiveTab] = useState<ForumTab>('the-deals');

  const handleTabChange = (tab: ForumTab) => {
    triggerHaptic('light');
    setActiveTab(tab);
  };

  const handleCategoryClick = (categoryId: string) => {
    triggerHaptic('light');
    // Navigate to category forum
    navigate(`/forum/${categoryId}`);
  };

  const tabs: { id: ForumTab; label: string }[] = [
    { id: 'the-deals', label: 'The Deals' },
    { id: 'deal-discussion', label: 'Deal Discussion' },
    { id: 'general', label: 'General' },
    { id: 'slickdeals', label: 'Slickdeals' },
  ];

  const getCurrentCategories = () => {
    switch (activeTab) {
      case 'the-deals':
        return dealCategories;
      case 'deal-discussion':
        return discussionCategories;
      default:
        return dealCategories;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a1a1a',
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        background: '#1a1a1a',
        zIndex: 10,
        paddingTop: 'env(safe-area-inset-top)',
      }}>
        {/* Title */}
        <div style={{
          padding: '16px 16px 12px',
          textAlign: 'center',
        }}>
          <h1 style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 600,
            color: 'white',
          }}>
            Forums
          </h1>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: 4,
          padding: '0 16px 12px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 20,
                  border: isActive ? 'none' : '1px solid #444',
                  background: isActive ? 'white' : 'transparent',
                  color: isActive ? '#1a1a1a' : '#aaa',
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Forum Categories */}
      <div style={{ padding: 16 }}>
        {getCurrentCategories().map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategoryClick(category.id)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '16px',
              marginBottom: 8,
              background: '#2a2a2a',
              border: 'none',
              borderRadius: 12,
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: '#1a1a1a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}>
              {category.icon}
            </div>
            <span style={{
              flex: 1,
              fontSize: 15,
              fontWeight: 500,
              color: 'white',
              textAlign: 'left',
            }}>
              {category.name}
            </span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        ))}
      </div>

      {/* Popular Discussions Section */}
      <div style={{ padding: '0 16px 16px' }}>
        <h2 style={{
          margin: '0 0 12px',
          fontSize: 14,
          fontWeight: 600,
          color: '#9ca3af',
        }}>
          Popular Discussions
        </h2>
        {[
          { title: 'Best Credit Card Deals January 2025', replies: 234, views: '12.5k' },
          { title: 'Amazon Great Republic Day Sale Megathread', replies: 567, views: '45.2k' },
          { title: 'Flipkart Big Saving Days - All Deals', replies: 189, views: '8.9k' },
        ].map((discussion, index) => (
          <button
            key={index}
            onClick={() => handleCategoryClick(`discussion-${index}`)}
            style={{
              width: '100%',
              padding: '14px 0',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid #2a2a2a',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ color: 'white', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
              {discussion.title}
            </div>
            <div style={{ display: 'flex', gap: 16, color: '#6b7280', fontSize: 12 }}>
              <span>{discussion.replies} replies</span>
              <span>{discussion.views} views</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
