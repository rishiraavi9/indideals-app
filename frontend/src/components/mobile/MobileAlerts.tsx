import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHaptics } from '../../hooks/useHaptics';
import { useAuth } from '../../context/AuthContext';
import { getNotifications, markAsRead } from '../../api/notifications';

type AlertTab = 'deal-alerts' | 'notifications';

interface DealAlert {
  id: string;
  keyword: string;
  rating?: string;
  createdAt: string;
}


// Mock data for deal alerts (would come from API)
const mockDealAlerts: DealAlert[] = [
  { id: '1', keyword: 'Apple', rating: 'Firedeal', createdAt: '2025-01-15' },
  { id: '2', keyword: 'Samsung', rating: 'Any Thread', createdAt: '2025-01-14' },
  { id: '3', keyword: 'Sony TV', rating: 'Rating Alert', createdAt: '2025-01-13' },
];

// Mock notification deals
const mockNotificationDeals = [
  {
    id: '1',
    type: 'deal_alert',
    title: '75" Roku Pro Series Mini-LED QLED 4K Smart RokuTV + Wall Mount Kit',
    message: 'Deal Alert: apple',
    price: 629,
    originalPrice: 798,
    merchant: 'Amazon',
    imageUrl: '/placeholder-deal.svg',
    isRead: false,
    createdAt: 'Today 09:35 PM',
  },
  {
    id: '2',
    type: 'deal_alert',
    title: 'JOYROOM 2500mAh Portable Magnetic Charger for Apple Watch w/ USB C Cable',
    message: 'Deal Alert: apple',
    price: 9.80,
    originalPrice: 20,
    merchant: 'Amazon',
    imageUrl: '/placeholder-deal.svg',
    isRead: false,
    createdAt: 'Today 08:42 PM',
  },
];

export default function MobileAlerts() {
  const navigate = useNavigate();
  const { triggerHaptic } = useHaptics();
  const { isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<AlertTab>('deal-alerts');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [alertKeyword, setAlertKeyword] = useState('');

  // Load notifications
  useEffect(() => {
    if (isAuthenticated && activeTab === 'notifications') {
      loadNotifications();
    }
  }, [isAuthenticated, activeTab]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await getNotifications();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      // Use mock data for demo
      setNotifications(mockNotificationDeals);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: AlertTab) => {
    triggerHaptic('light');
    setActiveTab(tab);
  };

  const handleAlertClick = (_alert: DealAlert) => {
    triggerHaptic('light');
    // Navigate to edit alert or show deals for this keyword
  };

  const handleNotificationClick = async (notification: any) => {
    triggerHaptic('light');
    if (!notification.isRead) {
      try {
        await markAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
        );
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }
    if (notification.dealId) {
      navigate(`/deal/${notification.dealId}`);
    }
  };

  const handleCreateAlert = () => {
    triggerHaptic('light');
    if (!alertKeyword.trim()) return;
    // Would call API to create alert
    setAlertKeyword('');
  };

  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#1a1a1a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
      }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <h2 style={{ color: 'white', margin: '16px 0 8px', fontSize: 20 }}>
          Sign in to see alerts
        </h2>
        <p style={{ color: '#6b7280', textAlign: 'center', margin: 0 }}>
          Create deal alerts to get notified when deals match your criteria
        </p>
        <button
          onClick={() => navigate('/login')}
          style={{
            marginTop: 24,
            padding: '12px 32px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: 8,
            color: 'white',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Sign In
        </button>
      </div>
    );
  }

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
            Alerts
          </h1>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          padding: '0 16px',
        }}>
          <button
            onClick={() => handleTabChange('deal-alerts')}
            style={{
              flex: 1,
              padding: '12px 0',
              border: 'none',
              borderBottom: activeTab === 'deal-alerts' ? '2px solid #667eea' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === 'deal-alerts' ? 'white' : '#6b7280',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Deal Alerts
          </button>
          <button
            onClick={() => handleTabChange('notifications')}
            style={{
              flex: 1,
              padding: '12px 0',
              border: 'none',
              borderBottom: activeTab === 'notifications' ? '2px solid #667eea' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === 'notifications' ? 'white' : '#6b7280',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Notifications
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'deal-alerts' ? (
        <div>
          {/* Create Alert Section */}
          <div style={{
            padding: 16,
            background: 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)',
          }}>
            <h2 style={{
              margin: '0 0 8px',
              fontSize: 16,
              fontWeight: 600,
              color: 'white',
            }}>
              Don't miss out
            </h2>
            <p style={{
              margin: '0 0 12px',
              fontSize: 13,
              color: '#9ca3af',
            }}>
              Get notified when great deals drop
            </p>
            <div style={{
              display: 'flex',
              gap: 8,
            }}>
              <input
                type="text"
                value={alertKeyword}
                onChange={(e) => setAlertKeyword(e.target.value)}
                placeholder="Add keywords, stores, brands..."
                style={{
                  flex: 1,
                  height: 44,
                  padding: '0 16px',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  outline: 'none',
                  background: '#333',
                  color: 'white',
                }}
              />
              <button
                onClick={handleCreateAlert}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  border: 'none',
                  background: '#667eea',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              </button>
            </div>
          </div>

          {/* My Deal Alerts */}
          <div style={{ padding: 16 }}>
            <h3 style={{
              margin: '0 0 16px',
              fontSize: 14,
              fontWeight: 600,
              color: '#9ca3af',
            }}>
              My Deal Alerts
            </h3>
            {mockDealAlerts.map((alert) => (
              <button
                key={alert.id}
                onClick={() => handleAlertClick(alert)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 0',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid #2a2a2a',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: '#667eea',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  color: 'white',
                  fontWeight: 600,
                }}>
                  {alert.keyword.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ color: 'white', fontSize: 15, fontWeight: 500 }}>
                    {alert.keyword} ({alert.rating || 'Any Thread'})
                  </div>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>
                    Rating: {alert.rating || 'Firedeal'}
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            ))}
          </div>

          {/* Deal of the Day Section */}
          <div style={{
            margin: 16,
            padding: 20,
            background: 'linear-gradient(135deg, #f0abfc 0%, #c084fc 50%, #8b5cf6 100%)',
            borderRadius: 12,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🛍️👕🏠</div>
            <h3 style={{
              margin: '0 0 4px',
              fontSize: 18,
              fontWeight: 700,
              color: '#1a1a1a',
            }}>
              Deal of the Day
            </h3>
            <p style={{
              margin: '0 0 16px',
              fontSize: 13,
              color: '#374151',
            }}>
              Get alerts on the very best, ultimate, hottest deals.
            </p>
            <button
              style={{
                padding: '10px 24px',
                background: '#1a1a1a',
                border: 'none',
                borderRadius: 20,
                color: 'white',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Added ✓
            </button>
          </div>
        </div>
      ) : (
        // Notifications Tab
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
              <div style={{
                width: 32,
                height: 32,
                border: '3px solid #333',
                borderTopColor: '#667eea',
                borderRadius: '50%',
                margin: '0 auto 12px',
                animation: 'spin 0.8s linear infinite',
              }} />
              Loading...
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : notifications.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: 40,
              color: '#6b7280',
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" style={{ marginBottom: 16 }}>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'white' }}>No notifications yet</p>
              <p style={{ margin: '8px 0 0', fontSize: 14 }}>Set up deal alerts to get notified</p>
            </div>
          ) : (
            mockNotificationDeals.map((notification: any) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: 16,
                  background: notification.isRead ? 'transparent' : 'rgba(102, 126, 234, 0.1)',
                  border: 'none',
                  borderBottom: '1px solid #2a2a2a',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {/* Bell Icon */}
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  </svg>
                </div>

                {/* Product Image */}
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: 8,
                  background: '#2a2a2a',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}>
                  <img
                    src={notification.imageUrl}
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                    }}
                  />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#10b981', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
                    {notification.message}
                  </div>
                  <div style={{
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 500,
                    lineHeight: 1.3,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {notification.title}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 4,
                  }}>
                    <span style={{ color: '#10b981', fontSize: 14, fontWeight: 700 }}>
                      ₹{notification.price}
                    </span>
                    {notification.originalPrice && (
                      <span style={{ color: '#6b7280', fontSize: 12, textDecoration: 'line-through' }}>
                        ₹{notification.originalPrice}
                      </span>
                    )}
                    <span style={{ color: '#6b7280', fontSize: 12 }}>
                      at {notification.merchant}
                    </span>
                  </div>
                  <div style={{ color: '#6b7280', fontSize: 11, marginTop: 4 }}>
                    {notification.createdAt}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
