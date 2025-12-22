import { useState, useEffect } from 'react';
import { getPriceHistory, type PriceHistoryResponse } from '../api/priceHistory';

interface PriceHistoryChartProps {
  dealId: string;
  currentPrice: number;
  theme?: 'light' | 'dark';
}

export default function PriceHistoryChart({ dealId, currentPrice, theme = 'light' }: PriceHistoryChartProps) {
  const isDark = theme === 'dark';

  // Theme colors
  const colors = {
    background: isDark ? '#333' : '#ffffff',
    cardBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
    text: isDark ? 'white' : '#1a1a1a',
    textMuted: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#444' : '#e5e7eb',
    buttonBg: isDark ? '#444' : '#f3f4f6',
    buttonActiveBg: '#667eea',
  };
  const [data, setData] = useState<PriceHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [days] = useState(7);

  useEffect(() => {
    loadPriceHistory();
  }, [dealId, days]);

  const loadPriceHistory = async () => {
    try {
      setLoading(true);
      const response = await getPriceHistory(dealId, days);
      setData(response);
      setError(null);
    } catch (err) {
      setError('Failed to load price history');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: colors.textMuted }}>
        Loading price history...
      </div>
    );
  }

  if (!data || data.history.length === 0) {
    return (
      <div style={{
        background: colors.background,
        borderRadius: 12,
        padding: 20,
        border: isDark ? 'none' : `1px solid ${colors.border}`,
      }}>
        <div style={{
          background: 'rgba(102, 126, 234, 0.15)',
          padding: 16,
          borderRadius: 8,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#667eea', marginBottom: 8 }}>
            Current Price: ₹{currentPrice.toLocaleString()}
          </div>
          <div style={{ fontSize: 13, color: colors.textMuted }}>
            Price tracking started. Historical data will appear as prices are monitored.
          </div>
        </div>
      </div>
    );
  }

  const { history, stats } = data;
  const isAllTimeLow = currentPrice <= stats.lowest;

  // Calculate chart dimensions (using fixed numeric values for proper SVG rendering)
  const chartWidth = 400;
  const chartHeight = 120;
  const padding = { top: 10, right: 10, bottom: 20, left: 10 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Calculate min/max for scaling
  const prices = history.map(h => h.price);
  const minPrice = Math.min(...prices) * 0.95;
  const maxPrice = Math.max(...prices) * 1.05;
  const priceRange = maxPrice - minPrice || 1;

  // Generate points with numeric coordinates
  const chartPoints = history.map((point, index) => {
    const x = padding.left + (index / Math.max(history.length - 1, 1)) * innerWidth;
    const y = padding.top + innerHeight - ((point.price - minPrice) / priceRange) * innerHeight;
    return { x, y, price: point.price, id: point.id };
  });

  // Generate SVG path for line
  const pathD = chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Area fill path
  const areaPath = `${pathD} L ${padding.left + innerWidth} ${padding.top + innerHeight} L ${padding.left} ${padding.top + innerHeight} Z`;

  return (
    <div style={{
      background: colors.background,
      borderRadius: 12,
      padding: 16,
      border: isDark ? 'none' : `1px solid ${colors.border}`,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isAllTimeLow && (
            <span style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}>
              ALL-TIME LOW
            </span>
          )}
        </div>
        <div style={{
          padding: '6px 10px',
          borderRadius: 6,
          background: colors.buttonActiveBg,
          color: 'white',
          fontSize: 12,
          fontWeight: 600,
        }}>
          7D
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: 10, borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: '#34d399', fontWeight: 600, marginBottom: 4 }}>LOWEST</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>₹{stats.lowest.toLocaleString()}</div>
        </div>
        <div style={{ background: 'rgba(251, 191, 36, 0.15)', padding: 10, borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: '#fbbf24', fontWeight: 600, marginBottom: 4 }}>AVERAGE</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b' }}>₹{stats.average.toLocaleString()}</div>
        </div>
        <div style={{ background: 'rgba(248, 113, 113, 0.15)', padding: 10, borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: '#f87171', fontWeight: 600, marginBottom: 4 }}>HIGHEST</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#ef4444' }}>₹{stats.highest.toLocaleString()}</div>
        </div>
        <div style={{ background: 'rgba(102, 126, 234, 0.15)', padding: 10, borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: '#a78bfa', fontWeight: 600, marginBottom: 4 }}>CURRENT</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#818cf8' }}>₹{currentPrice.toLocaleString()}</div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ position: 'relative', height: chartHeight, width: '100%' }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%' }}
        >
          {/* Grid lines */}
          <defs>
            <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#667eea" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#667eea" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines */}
          {[0.25, 0.5, 0.75].map((ratio, i) => (
            <line
              key={i}
              x1={padding.left}
              y1={padding.top + innerHeight * ratio}
              x2={padding.left + innerWidth}
              y2={padding.top + innerHeight * ratio}
              stroke={colors.border}
              strokeWidth="0.5"
            />
          ))}

          {/* Area fill */}
          <path
            d={areaPath}
            fill="url(#areaGradient)"
          />

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke="#667eea"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* Data points - only show if reasonable number of points */}
          {chartPoints.length <= 15 && chartPoints.map((point) => {
            const isLowest = point.price === stats.lowest;
            return (
              <circle
                key={point.id}
                cx={point.x}
                cy={point.y}
                r={isLowest ? 4 : 3}
                fill={isLowest ? '#10b981' : '#667eea'}
                stroke="white"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>

        {/* X-axis labels */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 10,
          right: 10,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 10,
          color: colors.textMuted,
        }}>
          <span>{new Date(history[0]?.scrapedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
          <span>{new Date(history[history.length - 1]?.scrapedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Price recommendation */}
      <div style={{
        marginTop: 16,
        padding: 12,
        background: isAllTimeLow ? 'rgba(16, 185, 129, 0.15)' : currentPrice <= stats.average ? 'rgba(251, 191, 36, 0.15)' : 'rgba(248, 113, 113, 0.15)',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <span style={{ fontSize: 20 }}>
          {isAllTimeLow ? '🎉' : currentPrice <= stats.average ? '👍' : '⏳'}
        </span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
            {isAllTimeLow
              ? 'Best time to buy! This is the all-time lowest price.'
              : currentPrice <= stats.average
                ? 'Good price! Below the average price.'
                : 'Wait for a better deal. Price is above average.'}
          </div>
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
            {currentPrice > stats.lowest && (
              <>Lowest recorded: ₹{stats.lowest.toLocaleString()} ({Math.round(((currentPrice - stats.lowest) / stats.lowest) * 100)}% higher now)</>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
