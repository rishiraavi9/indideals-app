import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from './Layout';

interface AdminStats {
  users: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  deals: {
    total: number;
    active: number;
    today: number;
    thisWeek: number;
  };
  engagement: {
    totalComments: number;
    commentsToday: number;
    totalVotes: number;
    votesToday: number;
  };
  affiliate: {
    totalClicks: number;
    clicksToday: number;
    totalConversions: number;
    conversionRate: string;
    totalCommission: number;
  };
  alerts: {
    total: number;
    active: number;
  };
  telegram: {
    totalProcessed: number;
    dealsCreated: number;
    skipped: number;
    processedToday: number;
    processedThisWeek: number;
    byChannel: Array<{ channel: string; count: number }>;
    skipReasons: Array<{ reason: string; count: number }>;
  };
  dealSources: {
    telegram: number;
    userSubmitted: number;
    expiredDeals: number;
  };
  topDeals: Array<{
    id: string;
    title: string;
    merchant: string;
    price: number;
    upvotes: number;
    downvotes: number;
    commentCount: number;
    viewCount: number;
  }>;
  recentDeals: Array<{
    id: string;
    title: string;
    merchant: string;
    price: number;
    createdAt: string;
  }>;
  dealsByMerchant: Array<{
    merchant: string;
    count: number;
  }>;
  growth: {
    users: Array<{ date: string; count: number }>;
    deals: Array<{ date: string; count: number }>;
  };
  generatedAt: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [healthStatus, setHealthStatus] = useState<{ status: string; timestamp: string } | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const fetchStats = async (username: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/admin/stats`, {
        headers: {
          'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
        },
      });

      if (response.status === 401) {
        setError('Invalid credentials');
        setIsAuthenticated(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data);
      setIsAuthenticated(true);

      // Save credentials for refresh
      localStorage.setItem('admin_auth', btoa(`${username}:${password}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check for saved credentials
    const savedAuth = localStorage.getItem('admin_auth');
    if (savedAuth) {
      const decoded = atob(savedAuth);
      const [username, password] = decoded.split(':');
      setCredentials({ username, password });
      fetchStats(username, password);
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStats(credentials.username, credentials.password);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_auth');
    setIsAuthenticated(false);
    setStats(null);
    setCredentials({ username: '', password: '' });
  };

  const handleRefresh = () => {
    const savedAuth = localStorage.getItem('admin_auth');
    if (savedAuth) {
      const decoded = atob(savedAuth);
      const [username, password] = decoded.split(':');
      fetchStats(username, password);
    }
  };

  const checkHealth = async () => {
    setHealthLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/health`);
      const data = await response.json();
      setHealthStatus(data);
    } catch (err) {
      setHealthStatus({ status: 'error', timestamp: new Date().toISOString() });
    } finally {
      setHealthLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  // Login Form
  if (!isAuthenticated) {
    return (
      <Layout>
        <div style={{
          maxWidth: 400,
          margin: '80px auto',
          padding: 32,
          background: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}>
          <h1 style={{ margin: '0 0 24px', fontSize: 24, fontWeight: 700, textAlign: 'center' }}>
            Admin Dashboard
          </h1>

          {error && (
            <div style={{
              padding: 12,
              marginBottom: 16,
              borderRadius: 8,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: 14,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>
                Username
              </label>
              <input
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  fontSize: 15,
                  boxSizing: 'border-box',
                }}
                required
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>
                Password
              </label>
              <input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  fontSize: 15,
                  boxSizing: 'border-box',
                }}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontSize: 16,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Loading...' : 'Login'}
            </button>
          </form>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: 80 }}>
          <div style={{ fontSize: 24 }}>Loading dashboard...</div>
        </div>
      </Layout>
    );
  }

  if (!stats) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: 80 }}>
          <div style={{ fontSize: 24, color: '#dc2626' }}>Failed to load stats</div>
          <button onClick={handleRefresh} style={{ marginTop: 16, padding: '12px 24px', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      </Layout>
    );
  }

  const StatCard = ({ title, value, subtitle, icon, color = '#667eea' }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: string;
    color?: string;
  }) => (
    <div style={{
      background: '#ffffff',
      borderRadius: 12,
      padding: 20,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      border: '1px solid #e5e7eb',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 2 }}>{title}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1f2937' }}>{value}</div>
          {subtitle && (
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{subtitle}</div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#1f2937' }}>
              Admin Dashboard
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6b7280' }}>
              Last updated: {new Date(stats.generatedAt).toLocaleString()}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleRefresh}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                background: 'white',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Refresh
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                background: '#ef4444',
                color: 'white',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}>
          <StatCard
            icon="👥"
            title="Total Users"
            value={formatNumber(stats.users.total)}
            subtitle={`+${stats.users.today} today, +${stats.users.thisWeek} this week`}
            color="#3b82f6"
          />
          <StatCard
            icon="🏷️"
            title="Total Deals"
            value={formatNumber(stats.deals.total)}
            subtitle={`${stats.deals.active} active, +${stats.deals.today} today`}
            color="#10b981"
          />
          <StatCard
            icon="💬"
            title="Comments"
            value={formatNumber(stats.engagement.totalComments)}
            subtitle={`+${stats.engagement.commentsToday} today`}
            color="#f59e0b"
          />
          <StatCard
            icon="👍"
            title="Total Votes"
            value={formatNumber(stats.engagement.totalVotes)}
            subtitle={`+${stats.engagement.votesToday} today`}
            color="#8b5cf6"
          />
        </div>

        {/* Affiliate Stats */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 16,
          padding: 24,
          marginBottom: 32,
          color: 'white',
        }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700 }}>
            Affiliate Performance
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 24,
          }}>
            <div>
              <div style={{ fontSize: 13, opacity: 0.8 }}>Total Clicks</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{formatNumber(stats.affiliate.totalClicks)}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>+{stats.affiliate.clicksToday} today</div>
            </div>
            <div>
              <div style={{ fontSize: 13, opacity: 0.8 }}>Conversions</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{formatNumber(stats.affiliate.totalConversions)}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{stats.affiliate.conversionRate}% rate</div>
            </div>
            <div>
              <div style={{ fontSize: 13, opacity: 0.8 }}>Est. Commission</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{formatCurrency(stats.affiliate.totalCommission)}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, opacity: 0.8 }}>Active Alerts</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{formatNumber(stats.alerts.active)}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>of {stats.alerts.total} total</div>
            </div>
          </div>
        </div>

        {/* Telegram Scraper Stats */}
        <div style={{
          background: '#ffffff',
          borderRadius: 16,
          padding: 24,
          marginBottom: 32,
          border: '1px solid #e5e7eb',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📱</span> Telegram Scraper
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 24,
            marginBottom: 24,
          }}>
            <div style={{ padding: 16, background: '#f0fdf4', borderRadius: 12 }}>
              <div style={{ fontSize: 13, color: '#166534' }}>Deals Created</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#15803d' }}>{formatNumber(stats.telegram?.dealsCreated || 0)}</div>
              <div style={{ fontSize: 12, color: '#166534' }}>
                {stats.dealSources?.telegram > 0 && stats.deals.total > 0
                  ? `${((stats.dealSources.telegram / stats.deals.total) * 100).toFixed(1)}% of all deals`
                  : 'from Telegram channels'}
              </div>
            </div>
            <div style={{ padding: 16, background: '#eff6ff', borderRadius: 12 }}>
              <div style={{ fontSize: 13, color: '#1e40af' }}>Messages Processed</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1d4ed8' }}>{formatNumber(stats.telegram?.totalProcessed || 0)}</div>
              <div style={{ fontSize: 12, color: '#1e40af' }}>+{stats.telegram?.processedToday || 0} today</div>
            </div>
            <div style={{ padding: 16, background: '#fef3c7', borderRadius: 12 }}>
              <div style={{ fontSize: 13, color: '#92400e' }}>Skipped</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#b45309' }}>{formatNumber(stats.telegram?.skipped || 0)}</div>
              <div style={{ fontSize: 12, color: '#92400e' }}>duplicates/invalid</div>
            </div>
            <div style={{ padding: 16, background: '#fae8ff', borderRadius: 12 }}>
              <div style={{ fontSize: 13, color: '#86198f' }}>User Submitted</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#a21caf' }}>{formatNumber(stats.dealSources?.userSubmitted || 0)}</div>
              <div style={{ fontSize: 12, color: '#86198f' }}>manual posts</div>
            </div>
            <div style={{ padding: 16, background: '#fef2f2', borderRadius: 12 }}>
              <div style={{ fontSize: 13, color: '#991b1b' }}>Expired Deals</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#dc2626' }}>{formatNumber(stats.dealSources?.expiredDeals || 0)}</div>
              <div style={{ fontSize: 12, color: '#991b1b' }}>no longer active</div>
            </div>
          </div>

          {/* Channel Breakdown */}
          {stats.telegram?.byChannel && stats.telegram.byChannel.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#374151' }}>
                Messages by Channel
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {stats.telegram.byChannel.map((channel) => (
                  <div
                    key={channel.channel}
                    style={{
                      padding: '6px 12px',
                      background: '#f3f4f6',
                      borderRadius: 16,
                      fontSize: 13,
                      color: '#374151',
                    }}
                  >
                    @{channel.channel}: <strong>{channel.count}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skip Reasons */}
          {stats.telegram?.skipReasons && stats.telegram.skipReasons.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#374151' }}>
                Skip Reasons
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {stats.telegram.skipReasons.map((item) => (
                  <div
                    key={item.reason}
                    style={{
                      padding: '6px 12px',
                      background: '#fef3c7',
                      borderRadius: 16,
                      fontSize: 13,
                      color: '#92400e',
                    }}
                  >
                    {item.reason}: <strong>{item.count}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Two Column Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
          {/* Top Deals */}
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #e5e7eb',
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: '#1f2937' }}>
              Top Performing Deals
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {stats.topDeals.slice(0, 5).map((deal, index) => (
                <div
                  key={deal.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    borderRadius: 8,
                    background: '#f9fafb',
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate(`/deal/${deal.id}`)}
                >
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: index < 3 ? '#fbbf24' : '#e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    color: index < 3 ? '#78350f' : '#6b7280',
                  }}>
                    {index + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#1f2937',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {deal.title}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      {deal.merchant} • {formatCurrency(deal.price)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#10b981' }}>
                      +{deal.upvotes - deal.downvotes}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>
                      {deal.commentCount} comments
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Deals by Merchant */}
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #e5e7eb',
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: '#1f2937' }}>
              Deals by Merchant
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stats.dealsByMerchant.map((item) => {
                const percentage = (item.count / stats.deals.total) * 100;
                return (
                  <div key={item.merchant}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>
                        {item.merchant}
                      </span>
                      <span style={{ fontSize: 14, color: '#6b7280' }}>
                        {item.count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div style={{
                      height: 8,
                      borderRadius: 4,
                      background: '#e5e7eb',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: 4,
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Deals */}
        <div style={{
          marginTop: 24,
          background: '#ffffff',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb',
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: '#1f2937' }}>
            Recent Deals
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: 13, color: '#6b7280', fontWeight: 600 }}>Title</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: 13, color: '#6b7280', fontWeight: 600 }}>Merchant</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: 13, color: '#6b7280', fontWeight: 600 }}>Price</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: 13, color: '#6b7280', fontWeight: 600 }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentDeals.map((deal) => (
                  <tr
                    key={deal.id}
                    style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                    onClick={() => navigate(`/deal/${deal.id}`)}
                  >
                    <td style={{
                      padding: '12px 8px',
                      fontSize: 14,
                      maxWidth: 400,
                      minWidth: 200,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      color: '#1f2937',
                    }}>
                      {deal.title || 'Untitled Deal'}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: 14, color: '#6b7280' }}>
                      {deal.merchant}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: 14, fontWeight: 600, color: '#10b981', textAlign: 'right' }}>
                      {formatCurrency(deal.price)}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: 13, color: '#6b7280', textAlign: 'right' }}>
                      {new Date(deal.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Links */}
        <div style={{
          marginTop: 24,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
        }}>
          <a
            href={`${(import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '')}/admin/queues`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 16,
              background: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              textDecoration: 'none',
              color: '#1f2937',
            }}
          >
            <span style={{ fontSize: 24 }}>📊</span>
            <div>
              <div style={{ fontWeight: 600 }}>Queue Dashboard</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Monitor background jobs</div>
            </div>
          </a>
          <button
            onClick={checkHealth}
            disabled={healthLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 16,
              background: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              textDecoration: 'none',
              color: '#1f2937',
              cursor: healthLoading ? 'wait' : 'pointer',
              textAlign: 'left',
              width: '100%',
            }}
          >
            <span style={{ fontSize: 24 }}>
              {healthStatus?.status === 'ok' ? '💚' : healthStatus?.status === 'error' ? '❌' : '💚'}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>Health Check</div>
              {healthLoading ? (
                <div style={{ fontSize: 12, color: '#6b7280' }}>Checking...</div>
              ) : healthStatus ? (
                <div style={{ fontSize: 12, color: healthStatus.status === 'ok' ? '#10b981' : '#dc2626' }}>
                  Status: {healthStatus.status.toUpperCase()} • {new Date(healthStatus.timestamp).toLocaleTimeString()}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#6b7280' }}>Click to check API status</div>
              )}
            </div>
          </button>
        </div>
      </div>
    </Layout>
  );
}
