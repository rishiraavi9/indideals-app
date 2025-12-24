import { useState, useEffect } from 'react';
import { getPricePrediction, type PricePrediction } from '../api/ai';

interface AIPriceTrendBadgeProps {
  dealId: string;
  style?: React.CSSProperties;
  compact?: boolean;
}

export default function AIPriceTrendBadge({ dealId, style, compact = false }: AIPriceTrendBadgeProps) {
  const [prediction, setPrediction] = useState<PricePrediction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchPrediction = async () => {
      try {
        const result = await getPricePrediction(dealId);
        if (mounted) {
          setPrediction(result);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch price prediction for deal', dealId, err);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchPrediction();

    return () => {
      mounted = false;
    };
  }, [dealId]);

  // Don't render anything while loading or if fetch failed
  if (loading || !prediction) return null;

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'down':
        return '📉';
      case 'up':
        return '📈';
      default:
        return '➡️';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'down':
        return '#10b981'; // Green - good for buyer
      case 'up':
        return '#ef4444'; // Red - bad for buyer
      default:
        return '#6b7280'; // Gray - stable
    }
  };

  const getTrendLabel = (trend: string, strength: number) => {
    if (compact) {
      return trend === 'down' ? '↓' : trend === 'up' ? '↑' : '→';
    }
    const strengthLabel = strength >= 70 ? 'Strong' : strength >= 40 ? 'Moderate' : 'Slight';
    switch (trend) {
      case 'down':
        return `${strengthLabel} Drop`;
      case 'up':
        return `${strengthLabel} Rise`;
      default:
        return 'Stable';
    }
  };

  const getRecommendationBadge = (recommendation: string) => {
    switch (recommendation) {
      case 'buy_now':
        return { text: 'Buy Now', color: '#10b981', bg: '#d1fae5' };
      case 'wait':
        return { text: 'Wait', color: '#f59e0b', bg: '#fef3c7' };
      case 'skip':
        return { text: 'Skip', color: '#ef4444', bg: '#fee2e2' };
      default:
        return null;
    }
  };

  const recBadge = getRecommendationBadge(prediction.recommendation);

  if (compact) {
    // Compact version for card listing
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 8px',
          borderRadius: 4,
          background: getTrendColor(prediction.trend) + '15',
          border: `1px solid ${getTrendColor(prediction.trend)}30`,
          fontSize: 11,
          fontWeight: 600,
          color: getTrendColor(prediction.trend),
          ...style,
        }}
        title={`Price ${prediction.trend === 'down' ? 'dropping' : prediction.trend === 'up' ? 'rising' : 'stable'} (${prediction.trendStrength}% confidence)`}
      >
        <span>{getTrendIcon(prediction.trend)}</span>
        <span>{getTrendLabel(prediction.trend, prediction.trendStrength)}</span>
      </div>
    );
  }

  // Full version for deal page
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 8,
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>{getTrendIcon(prediction.trend)}</span>
          <div>
            <div style={{ fontWeight: 600, color: getTrendColor(prediction.trend) }}>
              {getTrendLabel(prediction.trend, prediction.trendStrength)}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              {prediction.trendStrength}% confidence
            </div>
          </div>
        </div>
        {recBadge && (
          <div
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              background: recBadge.bg,
              color: recBadge.color,
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            {recBadge.text}
          </div>
        )}
      </div>

      {/* Price range */}
      {(prediction.lowestPriceLast30Days || prediction.highestPriceLast30Days) && (
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>30-day range:</span>
            <span style={{ fontWeight: 600, color: '#374151' }}>
              ₹{prediction.lowestPriceLast30Days?.toLocaleString('en-IN') || '?'} - ₹{prediction.highestPriceLast30Days?.toLocaleString('en-IN') || '?'}
            </span>
          </div>
        </div>
      )}

      {/* Best buy day */}
      {prediction.bestBuyDay && (
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
          <span>Best day to buy: </span>
          <span style={{ fontWeight: 600, color: '#10b981' }}>{prediction.bestBuyDay}</span>
        </div>
      )}

      {/* Flash sale indicator */}
      {prediction.flashSalePattern && (
        <div
          style={{
            marginTop: 8,
            padding: '6px 10px',
            borderRadius: 6,
            background: '#fef3c7',
            border: '1px solid #fde68a',
            fontSize: 12,
            color: '#92400e',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>⚡</span>
          <span>Flash sale pattern detected!</span>
          {prediction.nextFlashSaleDate && (
            <span style={{ fontWeight: 400 }}>
              Next expected: {new Date(prediction.nextFlashSaleDate).toLocaleDateString()}
            </span>
          )}
        </div>
      )}

      {/* Predicted price */}
      {prediction.predictedPrice && prediction.predictedPrice !== prediction.currentPrice && (
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
          <span>Predicted in 7 days: </span>
          <span
            style={{
              fontWeight: 600,
              color: prediction.predictedPrice < prediction.currentPrice ? '#10b981' : '#ef4444',
            }}
          >
            ₹{prediction.predictedPrice.toLocaleString('en-IN')}
          </span>
        </div>
      )}
    </div>
  );
}
