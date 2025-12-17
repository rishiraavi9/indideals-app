import { useState, useEffect } from 'react';
import { getDealQualityScore } from '../api/ai';
import type { QualityScoreResult } from '../api/ai';

interface AIQualityBadgeInlineProps {
  dealId: string;
  onClick?: () => void;
}

export default function AIQualityBadgeInline({ dealId, onClick }: AIQualityBadgeInlineProps) {
  const [aiScore, setAiScore] = useState<QualityScoreResult | null>(null);
  const [loading, setLoading] = useState(true);

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
        console.error('Failed to fetch AI score for deal', dealId, err);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchScore();

    return () => {
      mounted = false;
    };
  }, [dealId]);

  // Don't render anything while loading or if fetch failed
  if (loading || !aiScore) return null;

  const score = aiScore.totalScore;

  const getBadgeGradient = (score: number) => {
    if (score >= 90) return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    if (score >= 80) return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
    if (score >= 70) return 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
    if (score >= 60) return 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)';
    return 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 90) return '💎';
    if (score >= 80) return '🔥';
    if (score >= 70) return '⭐';
    if (score >= 60) return '👍';
    return '📊';
  };

  return (
    <span
      onClick={onClick}
      style={{
        position: 'absolute',
        top: 10,
        left: 10,
        zIndex: 20,
        padding: '4px 10px',
        borderRadius: 6,
        background: getBadgeGradient(score),
        fontSize: 11,
        fontWeight: 700,
        color: '#fff',
        cursor: onClick ? 'pointer' : 'default',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        transition: 'transform 0.2s ease',
        pointerEvents: 'auto',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'scale(1.05)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
      title={`AI Score: ${score}/100 - ${aiScore.reasoning} (Click for details)`}
    >
      <span>{getScoreEmoji(score)}</span>
      <span>AI: {score}</span>
    </span>
  );
}
