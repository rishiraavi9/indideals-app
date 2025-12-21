import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MobileHeader, { type FilterTab } from './MobileHeader';
import MobileBottomNav, { type ActiveTab } from './MobileBottomNav';
import MobileHome from './MobileHome';
import MobileSearch from './MobileSearch';
import MobileForums from './MobileForums';
import MobileAlerts from './MobileAlerts';
import MobileProfile from './MobileProfile';
import MobilePostDeal from './MobilePostDeal';
import { useAuth } from '../../context/AuthContext';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { useHaptics } from '../../hooks/useHaptics';
import { getUnreadCount } from '../../api/notifications';

export default function MobileApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { triggerHaptic } = useHaptics();

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [showPostDeal, setShowPostDeal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch notification count on mount and when auth changes
  useEffect(() => {
    const fetchNotificationCount = async () => {
      if (isAuthenticated) {
        try {
          const { count } = await getUnreadCount();
          setNotificationCount(count);
        } catch (err) {
          console.error('Failed to fetch notification count:', err);
        }
      } else {
        setNotificationCount(0);
      }
    };

    fetchNotificationCount();
    // Poll for new notifications every 60 seconds
    const interval = setInterval(fetchNotificationCount, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Sync active tab with URL
  useEffect(() => {
    const path = location.pathname;
    if (path === '/' || path === '/home') setActiveTab('home');
    else if (path === '/search') setActiveTab('search');
    else if (path === '/forums') setActiveTab('forums');
    else if (path === '/alerts') setActiveTab('alerts');
  }, [location]);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    triggerHaptic('medium');
    setRefreshKey(prev => prev + 1);
    // Simulate network delay for better UX
    await new Promise(resolve => setTimeout(resolve, 800));
  }, [triggerHaptic]);

  const { isRefreshing, pullProgress } = usePullToRefresh({
    onRefresh: handleRefresh,
    containerRef,
    threshold: 80,
  });

  const handleTabChange = (tab: ActiveTab) => {
    triggerHaptic('light');

    if (tab === 'post') {
      setShowPostDeal(true);
      return;
    }

    setActiveTab(tab);
    setShowProfile(false);

    // Navigate to appropriate route
    switch (tab) {
      case 'home':
        navigate('/');
        break;
      case 'search':
        navigate('/search');
        break;
      case 'forums':
        navigate('/forums');
        break;
      case 'alerts':
        navigate('/alerts');
        break;
    }
  };

  const handleFilterChange = (filter: FilterTab) => {
    triggerHaptic('light');
    setActiveFilter(filter);
  };

  const handleProfileClick = () => {
    triggerHaptic('light');
    setShowProfile(true);
  };

  const renderContent = () => {
    if (showProfile) {
      return <MobileProfile onClose={() => setShowProfile(false)} />;
    }

    switch (activeTab) {
      case 'home':
        return <MobileHome key={refreshKey} activeFilter={activeFilter} />;
      case 'search':
        return <MobileSearch />;
      case 'forums':
        return <MobileForums />;
      case 'alerts':
        return <MobileAlerts />;
      default:
        return <MobileHome key={refreshKey} activeFilter={activeFilter} />;
    }
  };

  // Calculate header height for proper padding
  const headerHeight = activeTab === 'home' ? 60 : 0;

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: '100vh',
        background: '#1a1a1a',
        paddingBottom: 'calc(60px + env(safe-area-inset-bottom))',
        overflowX: 'hidden',
        position: 'relative',
      }}
    >
      {/* Pull to Refresh Indicator */}
      {(isRefreshing || pullProgress > 0) && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: Math.min(pullProgress, 80),
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            transition: isRefreshing ? 'none' : 'height 0.2s',
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              border: '3px solid rgba(255,255,255,0.3)',
              borderTopColor: 'white',
              borderRadius: '50%',
              animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none',
              transform: `rotate(${pullProgress * 3.6}deg)`,
            }}
          />
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Header - only show on home tab */}
      {activeTab === 'home' && !showProfile && (
        <MobileHeader
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          onProfileClick={handleProfileClick}
        />
      )}

      {/* Main Content */}
      <div style={{ paddingTop: headerHeight }}>
        {renderContent()}
      </div>

      {/* Bottom Navigation */}
      {!showPostDeal && !showProfile && (
        <MobileBottomNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          alertCount={notificationCount}
        />
      )}

      {/* Post Deal Modal */}
      {showPostDeal && (
        <MobilePostDeal onClose={() => setShowPostDeal(false)} />
      )}
    </div>
  );
}
