import { useState, useEffect } from 'react';
import { getPricePrediction, type PricePrediction } from '../../api/ai';

interface MobilePriceTrendBadgeProps {
  dealId: string;
  style?: React.CSSProperties;
}

export default function MobilePriceTrendBadge({ dealId, style }: MobilePriceTrendBadgeProps) {
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

  if (loading || !prediction) return null;

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'down': return '📉';
      case 'up': return '📈';
      default: return '➡️';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'down': return '#10b981';
      case 'up': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getTrendText = (trend: string) => {
    switch (trend) {
      case 'down': return 'Dropping';
      case 'up': return 'Rising';
      default: return 'Stable';
    }
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'buy_now': return { bg: '#dcfce7', text: '#15803d', label: 'Buy' };
      case 'wait': return { bg: '#fef3c7', text: '#b45309', label: 'Wait' };
      case 'skip': return { bg: '#fee2e2', text: '#b91c1c', label: 'Skip' };
      default: return null;
    }
  };

  const rec = getRecommendationColor(prediction.recommendation);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        ...style,
      }}
    >
      {/* Trend indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          padding: '3px 6px',
          borderRadius: 4,
          background: getTrendColor(prediction.trend) + '15',
          fontSize: 10,
          fontWeight: 600,
          color: getTrendColor(prediction.trend),
        }}
      >
        <span>{getTrendIcon(prediction.trend)}</span>
        <span>{getTrendText(prediction.trend)}</span>
      </div>

      {/* Recommendation pill */}
      {rec && (
        <div
          style={{
            padding: '3px 6px',
            borderRadius: 4,
            background: rec.bg,
            fontSize: 10,
            fontWeight: 700,
            color: rec.text,
          }}
        >
          {rec.label}
        </div>
      )}

      {/* Flash sale indicator */}
      {prediction.flashSalePattern && (
        <span style={{ fontSize: 10 }} title="Flash sale pattern detected">
          ⚡
        </span>
      )}
    </div>
  );
}
