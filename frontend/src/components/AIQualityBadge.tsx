import { useState, useEffect } from 'react';
import { getDealQualityScore, QualityScoreResult } from '../api/ai';

interface AIQualityBadgeProps {
  dealId: string;
  fallbackScore?: number; // Fallback to simple score if AI score fails
}

export default function AIQualityBadge({ dealId, fallbackScore = 50 }: AIQualityBadgeProps) {
  const [aiScore, setAiScore] = useState<QualityScoreResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchScore = async () => {
      try {
        const result = await getDealQualityScore(dealId);
        if (mounted) {
          setAiScore(result);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching AI quality score:', err);
        if (mounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    fetchScore();

    return () => {
      mounted = false;
    };
  }, [dealId]);

  // Use AI score if available, otherwise fallback
  const displayScore = aiScore ? aiScore.totalScore : fallbackScore;
  const badges = aiScore ? aiScore.badges : [];

  // Determine badge color based on score
  const getBadgeGradient = (score: number) => {
    if (score >= 90) return 'linear-gradient(135deg, #10b981 0%, #059669 100%)'; // Green
    if (score >= 75) return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'; // Amber
    if (score >= 60) return 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'; // Blue
    return 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'; // Gray
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 10,
        left: 10,
        padding: '5px 9px',
        borderRadius: 6,
        background: getBadgeGradient(displayScore),
        fontSize: 11,
        fontWeight: 700,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        cursor: 'help',
      }}
      title={
        aiScore
          ? `AI Quality Score: ${displayScore}/100\n\nBreakdown:\n• Discount: ${aiScore.breakdown.discount}/100\n• Price History: ${aiScore.breakdown.priceHistory}/100\n• Merchant: ${aiScore.breakdown.merchant}/100\n• Engagement: ${aiScore.breakdown.engagement}/100\n• Freshness: ${aiScore.breakdown.freshness}/100\n\nBadges: ${badges.join(', ') || 'None'}`
          : `Score: ${displayScore}/100 (Simple calculation)`
      }
    >
      {displayScore >= 90 ? '🌟' : displayScore >= 75 ? '🔥' : '⭐'} {displayScore}
    </div>
  );
}
