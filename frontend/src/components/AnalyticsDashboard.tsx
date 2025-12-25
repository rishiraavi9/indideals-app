import { useState, useEffect } from 'react';

interface AnalyticsData {
  period: string;
  uniqueVisitors: number;
  totalPageViews: number;
  totalSessions: number;
  avgSessionDuration: number;
  topPages: Array<{ path: string; views: number }>;
  topReferrers: Array<{ referrer: string; count: number }>;
  deviceBreakdown: { desktop: number; mobile: number; tablet: number };
  eventCounts: Record<string, number>;
  dailyStats: Array<{ date: string; visitors: number; pageViews: number }>;
  realtime: {
    activeVisitors: number;
    currentPages: Array<{ path: string; visitors: number }>;
  };
}

interface AnalyticsDashboardProps {
  credentials: { username: string; password: string };
}

export default function AnalyticsDashboard({ credentials }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('7d');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
        const response = await fetch(`${apiUrl}/analytics/dashboard?period=${period}`, {
          headers: {
            'Authorization': `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch analytics');
        }

        const result = await response.json();
        setData(result);
        setError(null);
      } catch (err) {
        setError('Failed to load analytics data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    // Refresh every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [credentials, period]);

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const formatPath = (path: string): string => {
    if (path === '/') return 'Home';
    if (path.startsWith('/deal/')) return 'Deal Page';
    if (path.startsWith('/category/')) return path.replace('/category/', 'Category: ');
    return path.replace(/^\//, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading && !data) {
    return (
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        padding: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: '1px solid #e5e7eb',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ height: 24, background: '#e5e7eb', borderRadius: 6, width: '25%' }} />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16,
          }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ height: 96, background: '#e5e7eb', borderRadius: 8 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        padding: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: '1px solid #e5e7eb',
      }}>
        <div style={{ color: '#dc2626' }}>{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const totalDevices = data.deviceBreakdown.desktop + data.deviceBreakdown.mobile + data.deviceBreakdown.tablet;
  const devicePercentages = {
    desktop: totalDevices ? Math.round((data.deviceBreakdown.desktop / totalDevices) * 100) : 0,
    mobile: totalDevices ? Math.round((data.deviceBreakdown.mobile / totalDevices) * 100) : 0,
    tablet: totalDevices ? Math.round((data.deviceBreakdown.tablet / totalDevices) * 100) : 0,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header with period selector */}
      <div style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
        borderRadius: 16,
        padding: 24,
        color: 'white',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📊</span> Site Analytics
          </h2>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 8,
              padding: '8px 12px',
              color: 'white',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            <option value="24h" style={{ color: '#1f2937' }}>Last 24 Hours</option>
            <option value="7d" style={{ color: '#1f2937' }}>Last 7 Days</option>
            <option value="30d" style={{ color: '#1f2937' }}>Last 30 Days</option>
            <option value="90d" style={{ color: '#1f2937' }}>Last 90 Days</option>
          </select>
        </div>

        {/* Real-time indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.9 }}>
          <span style={{
            width: 8,
            height: 8,
            background: '#4ade80',
            borderRadius: '50%',
            animation: 'pulse 2s infinite',
          }} />
          <span>{data.realtime.activeVisitors} active visitors right now</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              padding: 12,
              background: '#dbeafe',
              borderRadius: 12,
            }}>
              <span style={{ fontSize: 24 }}>👥</span>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>Unique Visitors</p>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1f2937' }}>{data.uniqueVisitors.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              padding: 12,
              background: '#dcfce7',
              borderRadius: 12,
            }}>
              <span style={{ fontSize: 24 }}>📄</span>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>Page Views</p>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1f2937' }}>{data.totalPageViews.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              padding: 12,
              background: '#f3e8ff',
              borderRadius: 12,
            }}>
              <span style={{ fontSize: 24 }}>🔗</span>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>Sessions</p>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1f2937' }}>{data.totalSessions.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              padding: 12,
              background: '#ffedd5',
              borderRadius: 12,
            }}>
              <span style={{ fontSize: 24 }}>⏱️</span>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>Avg. Session Duration</p>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1f2937' }}>{formatDuration(data.avgSessionDuration)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: 24,
      }}>
        {/* Daily Traffic Chart */}
        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb',
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600, color: '#1f2937' }}>Daily Traffic</h3>
          <div style={{ height: 192, display: 'flex', alignItems: 'flex-end', gap: 4 }}>
            {data.dailyStats.slice(-14).map((day, index) => {
              const maxViews = Math.max(...data.dailyStats.map(d => d.pageViews));
              const height = maxViews ? (day.pageViews / maxViews) * 100 : 0;
              return (
                <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '100%',
                      background: '#3b82f6',
                      borderRadius: '4px 4px 0 0',
                      transition: 'all 0.2s',
                      height: `${height}%`,
                      minHeight: day.pageViews > 0 ? 4 : 0,
                    }}
                    title={`${day.date}: ${day.pageViews} views, ${day.visitors} visitors`}
                  />
                  <span style={{
                    fontSize: 10,
                    color: '#9ca3af',
                    marginTop: 4,
                    transform: 'rotate(45deg)',
                    transformOrigin: 'left',
                    whiteSpace: 'nowrap',
                  }}>
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Device Breakdown */}
        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb',
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600, color: '#1f2937' }}>Device Breakdown</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                <span style={{ color: '#4b5563' }}>💻 Desktop</span>
                <span style={{ fontWeight: 500, color: '#1f2937' }}>{devicePercentages.desktop}%</span>
              </div>
              <div style={{ height: 12, background: '#e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{
                  width: `${devicePercentages.desktop}%`,
                  height: '100%',
                  background: '#3b82f6',
                  borderRadius: 6,
                  transition: 'all 0.3s',
                }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                <span style={{ color: '#4b5563' }}>📱 Mobile</span>
                <span style={{ fontWeight: 500, color: '#1f2937' }}>{devicePercentages.mobile}%</span>
              </div>
              <div style={{ height: 12, background: '#e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{
                  width: `${devicePercentages.mobile}%`,
                  height: '100%',
                  background: '#10b981',
                  borderRadius: 6,
                  transition: 'all 0.3s',
                }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                <span style={{ color: '#4b5563' }}>📟 Tablet</span>
                <span style={{ fontWeight: 500, color: '#1f2937' }}>{devicePercentages.tablet}%</span>
              </div>
              <div style={{ height: 12, background: '#e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{
                  width: `${devicePercentages.tablet}%`,
                  height: '100%',
                  background: '#8b5cf6',
                  borderRadius: 6,
                  transition: 'all 0.3s',
                }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tables Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: 24,
      }}>
        {/* Top Pages */}
        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb',
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600, color: '#1f2937' }}>Top Pages</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.topPages.slice(0, 8).map((page, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={page.path}>
                  {formatPath(page.path)}
                </span>
                <span style={{ fontWeight: 500, color: '#1f2937', marginLeft: 16 }}>{page.views.toLocaleString()}</span>
              </div>
            ))}
            {data.topPages.length === 0 && (
              <p style={{ textAlign: 'center', color: '#9ca3af', padding: 16 }}>No data yet</p>
            )}
          </div>
        </div>

        {/* Top Referrers */}
        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb',
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600, color: '#1f2937' }}>Traffic Sources</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.topReferrers.slice(0, 8).map((ref, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={ref.referrer}>
                  {ref.referrer === 'Direct' ? '🔗 Direct Traffic' : ref.referrer.replace(/https?:\/\/(www\.)?/, '')}
                </span>
                <span style={{ fontWeight: 500, color: '#1f2937', marginLeft: 16 }}>{ref.count.toLocaleString()}</span>
              </div>
            ))}
            {data.topReferrers.length === 0 && (
              <p style={{ textAlign: 'center', color: '#9ca3af', padding: 16 }}>No referrer data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Events */}
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        padding: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: '1px solid #e5e7eb',
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600, color: '#1f2937' }}>User Actions</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 16,
        }}>
          {[
            { name: 'get_deal_click', label: 'Deal Clicks', icon: '🛒' },
            { name: 'save_deal', label: 'Saves', icon: '❤️' },
            { name: 'create_alert', label: 'Alerts Created', icon: '🔔' },
            { name: 'share_deal', label: 'Shares', icon: '📤' },
            { name: 'upvote_deal', label: 'Upvotes', icon: '👍' },
            { name: 'search', label: 'Searches', icon: '🔍' },
          ].map(event => (
            <div key={event.name} style={{
              textAlign: 'center',
              padding: 16,
              background: '#f9fafb',
              borderRadius: 12,
            }}>
              <span style={{ fontSize: 28 }}>{event.icon}</span>
              <p style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 700, color: '#1f2937' }}>
                {(data.eventCounts[event.name] || 0).toLocaleString()}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>{event.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
