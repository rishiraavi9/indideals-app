import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from '../../utils/date';
import { useHaptics } from '../../hooks/useHaptics';
import { useAuth } from '../../context/AuthContext';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '../../api/notifications';
import type { Notification } from '../../api/notifications';

interface MobileNotificationsProps {
  onClose: () => void;
  onCountChange?: (count: number) => void;
}

export default function MobileNotifications({ onClose, onCountChange }: MobileNotificationsProps) {
  const navigate = useNavigate();
  const { triggerHaptic } = useHaptics();
  const { isAuthenticated } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const { notifications: data } = await getNotifications({ limit: 50 });
      setNotifications(data);
      const unreadCount = data.filter(n => !n.read).length;
      onCountChange?.(unreadCount);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    triggerHaptic('light');

    // Mark as read if unread
    if (!notification.read) {
      try {
        await markAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n => (n.id === notification.id ? { ...n, read: true } : n))
        );
        const newUnreadCount = notifications.filter(n => !n.read && n.id !== notification.id).length;
        onCountChange?.(newUnreadCount);
      } catch (err) {
        console.error('Failed to mark as read:', err);
      }
    }

    if (notification.dealId) {
      navigate(`/deal/${notification.dealId}`);
      onClose();
    }
  };

  const handleMarkAllRead = async () => {
    triggerHaptic('light');
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      onCountChange?.(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'price_drop':
        return '📉';
      case 'deal_alert':
        return '🔔';
      case 'wishlist':
        return '❤️';
      case 'system':
        return '⚙️';
      default:
        return '📢';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Get image URL - prefer deal image, then notification image
  const getImageUrl = (notification: Notification) => {
    return notification.deal?.imageUrl || notification.imageUrl;
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 200,
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '85%',
          maxWidth: 380,
          height: '100%',
          background: 'white',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideIn 0.3s ease-out',
        }}
      >
        <style>{`
          @keyframes slideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}</style>

        {/* Header */}
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 'calc(16px + env(safe-area-inset-top))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
              Notifications
            </h2>
            {unreadCount > 0 && (
              <span
                style={{
                  background: '#ef4444',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {unreadCount}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#f3f4f6',
                  color: '#667eea',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: 'none',
                background: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Notification List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {!isAuthenticated ? (
            <div
              style={{
                textAlign: 'center',
                padding: 40,
                color: '#6b7280',
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>
                Sign in to see notifications
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 13 }}>
                Get alerts for price drops and deals
              </p>
              <button
                onClick={() => {
                  navigate('/login');
                  onClose();
                }}
                style={{
                  marginTop: 16,
                  padding: '10px 24px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Sign In
              </button>
            </div>
          ) : loading ? (
            <div
              style={{
                textAlign: 'center',
                padding: 40,
                color: '#6b7280',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  border: '3px solid #e5e7eb',
                  borderTopColor: '#667eea',
                  borderRadius: '50%',
                  margin: '0 auto 16px',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <style>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
              <p style={{ margin: 0, fontSize: 14 }}>Loading notifications...</p>
            </div>
          ) : error ? (
            <div
              style={{
                textAlign: 'center',
                padding: 40,
                color: '#ef4444',
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>{error}</p>
              <button
                onClick={fetchNotifications}
                style={{
                  marginTop: 16,
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#f3f4f6',
                  color: '#374151',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Try again
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 40,
                color: '#6b7280',
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔔</div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>
                No notifications yet
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 13 }}>
                Set up alerts to get notified about deals
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                style={{
                  padding: 16,
                  borderBottom: '1px solid #f3f4f6',
                  display: 'flex',
                  gap: 12,
                  cursor: notification.dealId ? 'pointer' : 'default',
                  background: notification.read ? 'white' : '#eff6ff',
                  transition: 'background 0.2s',
                }}
              >
                {/* Image or Icon */}
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 8,
                    background: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    overflow: 'hidden',
                  }}
                >
                  {getImageUrl(notification) ? (
                    <img
                      src={getImageUrl(notification)!}
                      alt=""
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: 24 }}>
                      {getNotificationIcon(notification.type)}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 8,
                    }}
                  >
                    <h4
                      style={{
                        margin: 0,
                        fontSize: 14,
                        fontWeight: notification.read ? 500 : 600,
                        color: '#1a1a1a',
                      }}
                    >
                      {notification.title}
                    </h4>
                    {!notification.read && (
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: '#667eea',
                          flexShrink: 0,
                          marginTop: 4,
                        }}
                      />
                    )}
                  </div>
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: 13,
                      color: '#6b7280',
                      lineHeight: 1.4,
                    }}
                  >
                    {notification.message}
                  </p>
                  <span
                    style={{
                      fontSize: 11,
                      color: '#9ca3af',
                      marginTop: 4,
                      display: 'block',
                    }}
                  >
                    {formatDistanceToNow(new Date(notification.createdAt))}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: 16,
            borderTop: '1px solid #e5e7eb',
            paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
          }}
        >
          <button
            onClick={() => {
              triggerHaptic('light');
              navigate('/alerts');
              onClose();
            }}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Manage Alert Settings
          </button>
        </div>
      </div>
    </div>
  );
}
