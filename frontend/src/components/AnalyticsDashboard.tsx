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
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-red-500">{error}</div>
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
    <div className="space-y-6">
      {/* Header with period selector */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-md p-6 text-white">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span>📊</span> Site Analytics
          </h2>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-white"
          >
            <option value="24h" className="text-gray-800">Last 24 Hours</option>
            <option value="7d" className="text-gray-800">Last 7 Days</option>
            <option value="30d" className="text-gray-800">Last 30 Days</option>
            <option value="90d" className="text-gray-800">Last 90 Days</option>
          </select>
        </div>

        {/* Real-time indicator */}
        <div className="flex items-center gap-2 text-white/80">
          <span className="animate-pulse w-2 h-2 bg-green-400 rounded-full"></span>
          <span>{data.realtime.activeVisitors} active visitors right now</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <span className="text-2xl">👥</span>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Unique Visitors</p>
              <p className="text-2xl font-bold text-gray-800">{data.uniqueVisitors.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <span className="text-2xl">📄</span>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Page Views</p>
              <p className="text-2xl font-bold text-gray-800">{data.totalPageViews.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <span className="text-2xl">🔗</span>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Sessions</p>
              <p className="text-2xl font-bold text-gray-800">{data.totalSessions.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-lg">
              <span className="text-2xl">⏱️</span>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Avg. Session Duration</p>
              <p className="text-2xl font-bold text-gray-800">{formatDuration(data.avgSessionDuration)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Traffic Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Daily Traffic</h3>
          <div className="h-48 flex items-end gap-1">
            {data.dailyStats.slice(-14).map((day, index) => {
              const maxViews = Math.max(...data.dailyStats.map(d => d.pageViews));
              const height = maxViews ? (day.pageViews / maxViews) * 100 : 0;
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                    style={{ height: `${height}%`, minHeight: day.pageViews > 0 ? '4px' : '0' }}
                    title={`${day.date}: ${day.pageViews} views, ${day.visitors} visitors`}
                  ></div>
                  <span className="text-xs text-gray-400 mt-1 rotate-45 origin-left">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Device Breakdown */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Device Breakdown</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">💻 Desktop</span>
                <span className="font-medium">{devicePercentages.desktop}%</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${devicePercentages.desktop}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">📱 Mobile</span>
                <span className="font-medium">{devicePercentages.mobile}%</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${devicePercentages.mobile}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">📟 Tablet</span>
                <span className="font-medium">{devicePercentages.tablet}%</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${devicePercentages.tablet}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Pages</h3>
          <div className="space-y-3">
            {data.topPages.slice(0, 8).map((page, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-gray-600 truncate flex-1" title={page.path}>
                  {formatPath(page.path)}
                </span>
                <span className="font-medium text-gray-800 ml-4">{page.views.toLocaleString()}</span>
              </div>
            ))}
            {data.topPages.length === 0 && (
              <p className="text-gray-400 text-center py-4">No data yet</p>
            )}
          </div>
        </div>

        {/* Top Referrers */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Traffic Sources</h3>
          <div className="space-y-3">
            {data.topReferrers.slice(0, 8).map((ref, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-gray-600 truncate flex-1" title={ref.referrer}>
                  {ref.referrer === 'Direct' ? '🔗 Direct Traffic' : ref.referrer.replace(/https?:\/\/(www\.)?/, '')}
                </span>
                <span className="font-medium text-gray-800 ml-4">{ref.count.toLocaleString()}</span>
              </div>
            ))}
            {data.topReferrers.length === 0 && (
              <p className="text-gray-400 text-center py-4">No referrer data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Events */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">User Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { name: 'get_deal_click', label: 'Deal Clicks', icon: '🛒' },
            { name: 'save_deal', label: 'Saves', icon: '❤️' },
            { name: 'create_alert', label: 'Alerts Created', icon: '🔔' },
            { name: 'share_deal', label: 'Shares', icon: '📤' },
            { name: 'upvote_deal', label: 'Upvotes', icon: '👍' },
            { name: 'search', label: 'Searches', icon: '🔍' },
          ].map(event => (
            <div key={event.name} className="text-center p-3 bg-gray-50 rounded-lg">
              <span className="text-2xl">{event.icon}</span>
              <p className="text-xl font-bold text-gray-800 mt-1">
                {(data.eventCounts[event.name] || 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">{event.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
