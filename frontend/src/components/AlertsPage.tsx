import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from './Layout';
import { getPriceAlerts, deletePriceAlert, updatePriceAlert, type PriceAlert } from '../api/priceHistory';
import { getAlerts, deleteAlert, updateAlert, createAlert, type Alert } from '../api/alerts';
import { useAuth } from '../context/AuthContext';

export default function AlertsPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [keywordAlerts, setKeywordAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'price' | 'keyword'>('price');

  // New keyword alert form
  const [showNewAlert, setShowNewAlert] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [newMinDiscount, setNewMinDiscount] = useState<number | ''>('');
  const [newMaxPrice, setNewMaxPrice] = useState<number | ''>('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadAlerts();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const [priceRes, keywordRes] = await Promise.all([
        getPriceAlerts(false).catch(() => ({ alerts: [] })),
        getAlerts().catch(() => ({ alerts: [] })),
      ]);
      setPriceAlerts(priceRes.alerts);
      setKeywordAlerts(keywordRes.alerts);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePriceAlert = async (alertId: string) => {
    try {
      await deletePriceAlert(alertId);
      setPriceAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (err) {
      console.error('Failed to delete alert:', err);
    }
  };

  const handleTogglePriceAlert = async (alertId: string, isActive: boolean) => {
    try {
      await updatePriceAlert(alertId, { isActive: !isActive });
      setPriceAlerts(prev => prev.map(a =>
        a.id === alertId ? { ...a, isActive: !isActive } : a
      ));
    } catch (err) {
      console.error('Failed to toggle alert:', err);
    }
  };

  const handleDeleteKeywordAlert = async (alertId: string) => {
    try {
      await deleteAlert(alertId);
      setKeywordAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (err) {
      console.error('Failed to delete alert:', err);
    }
  };

  const handleToggleKeywordAlert = async (alertId: string, isActive: boolean) => {
    try {
      await updateAlert(alertId, { isActive: !isActive });
      setKeywordAlerts(prev => prev.map(a =>
        a.id === alertId ? { ...a, isActive: !isActive } : a
      ));
    } catch (err) {
      console.error('Failed to toggle alert:', err);
    }
  };

  const handleCreateKeywordAlert = async () => {
    if (!newKeyword.trim()) return;

    try {
      setCreating(true);
      const response = await createAlert({
        keyword: newKeyword,
        minDiscount: newMinDiscount || undefined,
        maxPrice: newMaxPrice || undefined,
        frequency: 'instant',
      });
      setKeywordAlerts(prev => [response.alert, ...prev]);
      setNewKeyword('');
      setNewMinDiscount('');
      setNewMaxPrice('');
      setShowNewAlert(false);
    } catch (err) {
      console.error('Failed to create alert:', err);
    } finally {
      setCreating(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Layout onPostDealClick={() => navigate('/')}>
        <div style={{
          maxWidth: 600,
          margin: '60px auto',
          padding: 40,
          textAlign: 'center',
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>🔒</div>
          <h2 style={{ margin: '0 0 12px', color: '#1a1a1a', fontSize: 24, fontWeight: 700 }}>
            Login Required
          </h2>
          <p style={{ color: '#6b7280', marginBottom: 24, fontSize: 15 }}>
            Please log in to manage your deal alerts.
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '12px 32px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            Go to Homepage
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout onPostDealClick={() => navigate('/')}>
      <div style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: 24,
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          borderRadius: 16,
          padding: 32,
          marginBottom: 24,
          color: '#ffffff',
        }}>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800 }}>
            🔔 My Alerts
          </h1>
          <p style={{ margin: '12px 0 0', opacity: 0.9, fontSize: 16 }}>
            Get notified when prices drop or new deals match your interests
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: 8,
          marginBottom: 24,
          background: '#f3f4f6',
          padding: 4,
          borderRadius: 10,
        }}>
          <button
            onClick={() => setActiveTab('price')}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === 'price' ? '#ffffff' : 'transparent',
              color: activeTab === 'price' ? '#1a1a1a' : '#6b7280',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              boxShadow: activeTab === 'price' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            Price Alerts ({priceAlerts.length})
          </button>
          <button
            onClick={() => setActiveTab('keyword')}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === 'keyword' ? '#ffffff' : 'transparent',
              color: activeTab === 'keyword' ? '#1a1a1a' : '#6b7280',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              boxShadow: activeTab === 'keyword' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            Keyword Alerts ({keywordAlerts.length})
          </button>
        </div>

        {loading ? (
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: 60,
            textAlign: 'center',
            color: '#6b7280',
          }}>
            Loading your alerts...
          </div>
        ) : activeTab === 'price' ? (
          /* Price Alerts Tab */
          <div>
            {priceAlerts.length === 0 ? (
              <div style={{
                background: '#ffffff',
                borderRadius: 12,
                padding: 60,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 64, marginBottom: 20 }}>📉</div>
                <h3 style={{ margin: '0 0 12px', color: '#1a1a1a', fontSize: 20, fontWeight: 700 }}>
                  No price alerts yet
                </h3>
                <p style={{ color: '#6b7280', marginBottom: 24, fontSize: 15 }}>
                  Set price alerts on deals you're interested in to get notified when prices drop.
                </p>
                <button
                  onClick={() => navigate('/')}
                  style={{
                    padding: '12px 32px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: 'pointer',
                  }}
                >
                  Browse Deals
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {priceAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    style={{
                      background: '#ffffff',
                      borderRadius: 12,
                      padding: 20,
                      border: '1px solid #e5e7eb',
                      opacity: alert.isActive ? 1 : 0.6,
                    }}
                  >
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      {/* Deal info */}
                      <div style={{ flex: 1 }}>
                        <h4
                          style={{
                            margin: '0 0 8px',
                            fontSize: 15,
                            fontWeight: 700,
                            color: '#1a1a1a',
                            cursor: 'pointer',
                          }}
                          onClick={() => alert.deal && navigate(`/deals/${alert.deal.id}`)}
                        >
                          {alert.deal?.title || 'Unknown Deal'}
                        </h4>
                        <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#6b7280' }}>
                          <span>Current: ₹{alert.deal?.price?.toLocaleString() || '?'}</span>
                          <span style={{ color: '#10b981', fontWeight: 700 }}>
                            Target: ₹{alert.targetPrice.toLocaleString()}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
                          Created {new Date(alert.createdAt).toLocaleDateString()}
                          {alert.notifiedAt && ` • Notified ${new Date(alert.notifiedAt).toLocaleDateString()}`}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleTogglePriceAlert(alert.id, alert.isActive)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 6,
                            border: '1px solid #d1d5db',
                            background: alert.isActive ? '#ffffff' : '#f3f4f6',
                            color: alert.isActive ? '#10b981' : '#6b7280',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {alert.isActive ? '✓ Active' : 'Paused'}
                        </button>
                        <button
                          onClick={() => handleDeletePriceAlert(alert.id)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 6,
                            border: '1px solid #fecaca',
                            background: '#fef2f2',
                            color: '#dc2626',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Keyword Alerts Tab */
          <div>
            {/* New Alert Form */}
            <div style={{
              background: '#ffffff',
              borderRadius: 12,
              padding: 20,
              marginBottom: 16,
              border: '1px solid #e5e7eb',
            }}>
              {!showNewAlert ? (
                <button
                  onClick={() => setShowNewAlert(true)}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    borderRadius: 8,
                    border: '2px dashed #d1d5db',
                    background: 'transparent',
                    color: '#667eea',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  + Create New Keyword Alert
                </button>
              ) : (
                <div>
                  <h4 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>
                    Create Keyword Alert
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                        Keyword *
                      </label>
                      <input
                        type="text"
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        placeholder="e.g., iPhone 15, Sony headphones"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 6,
                          border: '1px solid #d1d5db',
                          fontSize: 14,
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                          Min Discount %
                        </label>
                        <input
                          type="number"
                          value={newMinDiscount}
                          onChange={(e) => setNewMinDiscount(e.target.value ? parseInt(e.target.value) : '')}
                          placeholder="e.g., 30"
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: 6,
                            border: '1px solid #d1d5db',
                            fontSize: 14,
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                          Max Price (₹)
                        </label>
                        <input
                          type="number"
                          value={newMaxPrice}
                          onChange={(e) => setNewMaxPrice(e.target.value ? parseInt(e.target.value) : '')}
                          placeholder="e.g., 5000"
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: 6,
                            border: '1px solid #d1d5db',
                            fontSize: 14,
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button
                        onClick={handleCreateKeywordAlert}
                        disabled={creating || !newKeyword.trim()}
                        style={{
                          padding: '10px 20px',
                          borderRadius: 6,
                          border: 'none',
                          background: creating || !newKeyword.trim() ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: creating || !newKeyword.trim() ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {creating ? 'Creating...' : 'Create Alert'}
                      </button>
                      <button
                        onClick={() => {
                          setShowNewAlert(false);
                          setNewKeyword('');
                          setNewMinDiscount('');
                          setNewMaxPrice('');
                        }}
                        style={{
                          padding: '10px 20px',
                          borderRadius: 6,
                          border: '1px solid #d1d5db',
                          background: '#ffffff',
                          color: '#374151',
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Keyword Alerts List */}
            {keywordAlerts.length === 0 && !showNewAlert ? (
              <div style={{
                background: '#ffffff',
                borderRadius: 12,
                padding: 60,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 64, marginBottom: 20 }}>🔍</div>
                <h3 style={{ margin: '0 0 12px', color: '#1a1a1a', fontSize: 20, fontWeight: 700 }}>
                  No keyword alerts yet
                </h3>
                <p style={{ color: '#6b7280', fontSize: 15 }}>
                  Create keyword alerts to get notified when new deals match your search.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {keywordAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    style={{
                      background: '#ffffff',
                      borderRadius: 12,
                      padding: 20,
                      border: '1px solid #e5e7eb',
                      opacity: alert.isActive ? 1 : 0.6,
                    }}
                  >
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      {/* Alert info */}
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>
                          "{alert.keyword}"
                        </h4>
                        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#6b7280', flexWrap: 'wrap' }}>
                          {alert.minDiscount && (
                            <span style={{ background: '#f0fdf4', color: '#059669', padding: '2px 8px', borderRadius: 4 }}>
                              Min {alert.minDiscount}% off
                            </span>
                          )}
                          {alert.maxPrice && (
                            <span style={{ background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 4 }}>
                              Under ₹{alert.maxPrice.toLocaleString()}
                            </span>
                          )}
                          <span style={{ background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: 4 }}>
                            {alert.frequency === 'instant' ? '⚡ Instant' : alert.frequency === 'daily' ? '📅 Daily' : '📆 Weekly'}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
                          {alert.notificationCount} notifications sent
                          {alert.lastNotified && ` • Last: ${new Date(alert.lastNotified).toLocaleDateString()}`}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleToggleKeywordAlert(alert.id, alert.isActive)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 6,
                            border: '1px solid #d1d5db',
                            background: alert.isActive ? '#ffffff' : '#f3f4f6',
                            color: alert.isActive ? '#10b981' : '#6b7280',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {alert.isActive ? '✓ Active' : 'Paused'}
                        </button>
                        <button
                          onClick={() => handleDeleteKeywordAlert(alert.id)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 6,
                            border: '1px solid #fecaca',
                            background: '#fef2f2',
                            color: '#dc2626',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
