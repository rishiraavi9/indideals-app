import { useEffect, useState } from 'react';
import { affiliateApi, type AffiliateStats } from '../api/affiliate';

export default function AffiliateAnalytics() {
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    loadStats();
  }, [dateRange]);

  const loadStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      let startDate: string | undefined;

      if (dateRange !== 'all') {
        const days = parseInt(dateRange);
        const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        startDate = start.toISOString();
      }

      const data = await affiliateApi.getStats({
        startDate,
        endDate: now.toISOString(),
      });

      setStats(data);
    } catch (err) {
      setError('Failed to load affiliate statistics');
      console.error('Error loading affiliate stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (paise: number) => {
    return `₹${(paise / 100).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (loading) {
    return (
      <div
        style={{
          padding: 24,
          textAlign: 'center',
          color: '#eaf2ff',
        }}
      >
        Loading analytics...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: 24,
          textAlign: 'center',
          color: '#f44336',
        }}
      >
        {error}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div
      style={{
        padding: 24,
        maxWidth: 1200,
        margin: '0 auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <h2
          style={{
            fontSize: 28,
            fontWeight: 900,
            color: '#eaf2ff',
            margin: 0,
          }}
        >
          Affiliate Analytics
        </h2>

        <div style={{ display: 'flex', gap: 8 }}>
          {(['7d', '30d', '90d', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border:
                  dateRange === range
                    ? '1px solid rgba(76, 175, 80, 0.5)'
                    : '1px solid rgba(255,255,255,0.14)',
                background:
                  dateRange === range
                    ? 'rgba(76, 175, 80, 0.25)'
                    : 'rgba(0,0,0,0.25)',
                color: '#eaf2ff',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {range === 'all' ? 'All Time' : range.replace('d', ' Days')}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(0,0,0,0.25)',
            padding: 20,
          }}
        >
          <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 8, color: '#eaf2ff' }}>
            Total Clicks
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#4ade80' }}>
            {stats.totalClicks.toLocaleString('en-IN')}
          </div>
        </div>

        <div
          style={{
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(0,0,0,0.25)',
            padding: 20,
          }}
        >
          <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 8, color: '#eaf2ff' }}>
            Conversions
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#2676ff' }}>
            {stats.totalConversions.toLocaleString('en-IN')}
          </div>
        </div>

        <div
          style={{
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(0,0,0,0.25)',
            padding: 20,
          }}
        >
          <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 8, color: '#eaf2ff' }}>
            Conversion Rate
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#ff9800' }}>
            {stats.conversionRate.toFixed(2)}%
          </div>
        </div>

        <div
          style={{
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(0,0,0,0.25)',
            padding: 20,
          }}
        >
          <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 8, color: '#eaf2ff' }}>
            Total Earnings
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#4caf50' }}>
            {formatCurrency(stats.totalCommission)}
          </div>
        </div>
      </div>

      {/* By Merchant Table */}
      {stats.byMerchant.length > 0 && (
        <div
          style={{
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(0,0,0,0.25)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: 16,
              borderBottom: '1px solid rgba(255,255,255,0.14)',
            }}
          >
            <h3
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: '#eaf2ff',
                margin: 0,
              }}
            >
              Performance by Merchant
            </h3>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    borderBottom: '1px solid rgba(255,255,255,0.14)',
                  }}
                >
                  <th
                    style={{
                      padding: 12,
                      textAlign: 'left',
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#eaf2ff',
                      opacity: 0.8,
                    }}
                  >
                    Merchant
                  </th>
                  <th
                    style={{
                      padding: 12,
                      textAlign: 'right',
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#eaf2ff',
                      opacity: 0.8,
                    }}
                  >
                    Clicks
                  </th>
                  <th
                    style={{
                      padding: 12,
                      textAlign: 'right',
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#eaf2ff',
                      opacity: 0.8,
                    }}
                  >
                    Conversions
                  </th>
                  <th
                    style={{
                      padding: 12,
                      textAlign: 'right',
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#eaf2ff',
                      opacity: 0.8,
                    }}
                  >
                    Rate
                  </th>
                  <th
                    style={{
                      padding: 12,
                      textAlign: 'right',
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#eaf2ff',
                      opacity: 0.8,
                    }}
                  >
                    Commission
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.byMerchant.map((merchant) => (
                  <tr
                    key={merchant.merchant}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <td
                      style={{
                        padding: 12,
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#eaf2ff',
                      }}
                    >
                      {merchant.merchant}
                    </td>
                    <td
                      style={{
                        padding: 12,
                        textAlign: 'right',
                        fontSize: 14,
                        color: '#eaf2ff',
                      }}
                    >
                      {merchant.clicks.toLocaleString('en-IN')}
                    </td>
                    <td
                      style={{
                        padding: 12,
                        textAlign: 'right',
                        fontSize: 14,
                        color: '#eaf2ff',
                      }}
                    >
                      {merchant.conversions.toLocaleString('en-IN')}
                    </td>
                    <td
                      style={{
                        padding: 12,
                        textAlign: 'right',
                        fontSize: 14,
                        color: '#eaf2ff',
                      }}
                    >
                      {merchant.clicks > 0
                        ? ((merchant.conversions / merchant.clicks) * 100).toFixed(2)
                        : '0.00'}
                      %
                    </td>
                    <td
                      style={{
                        padding: 12,
                        textAlign: 'right',
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#4ade80',
                      }}
                    >
                      {formatCurrency(merchant.commission)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
