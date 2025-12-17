import { useState, useEffect } from 'react';
import { getDealQualityScore } from '../api/ai';
import type { QualityScoreResult } from '../api/ai';

interface AIQualityBadgeProps {
  dealId: string;
  fallbackScore?: number;
  showDetailed?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AIQualityBadge({
  dealId,
  fallbackScore = 50,
  showDetailed = false,
  isOpen = false,
  onClose
}: AIQualityBadgeProps) {
  const [aiScore, setAiScore] = useState<QualityScoreResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showModal, setShowModal] = useState(isOpen);

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

  const displayScore = aiScore ? aiScore.totalScore : fallbackScore;
  const badges = aiScore ? aiScore.badges : [];

  // Determine badge color based on score
  const getBadgeGradient = (score: number) => {
    if (score >= 90) return 'linear-gradient(135deg, #10b981 0%, #059669 100%)'; // Exceptional - Green
    if (score >= 80) return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'; // Hot - Amber
    if (score >= 70) return 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'; // Great - Blue
    if (score >= 60) return 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'; // Good - Purple
    return 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'; // Gray
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 90) return '💎';
    if (score >= 80) return '🔥';
    if (score >= 70) return '⭐';
    if (score >= 60) return '👍';
    return '📊';
  };

  const getBreakdownBar = (value: number, label: string, color: string) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 4,
        fontSize: 12,
        color: '#6b7280'
      }}>
        <span>{label}</span>
        <span style={{ fontWeight: 600, color: '#1f2937' }}>{value}/100</span>
      </div>
      <div style={{
        width: '100%',
        height: 6,
        backgroundColor: '#e5e7eb',
        borderRadius: 3,
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${value}%`,
          height: '100%',
          backgroundColor: color,
          transition: 'width 0.3s ease'
        }} />
      </div>
    </div>
  );

  return (
    <>
      {/* Detailed Modal */}
      {(showModal || isOpen) && aiScore && (
        <div
          onClick={() => {
            setShowModal(false);
            onClose?.();
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 24,
              maxWidth: 500,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            }}
          >
            {/* Header */}
            <div style={{ marginBottom: 20 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 12
              }}>
                <div style={{
                  fontSize: 36,
                  background: getBadgeGradient(displayScore),
                  color: '#fff',
                  width: 60,
                  height: 60,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                  {displayScore}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: 20,
                    fontWeight: 700,
                    color: '#111827'
                  }}>
                    AI Quality Score
                  </h3>
                  <p style={{
                    margin: '4px 0 0 0',
                    fontSize: 13,
                    color: '#6b7280'
                  }}>
                    Powered by smart analytics
                  </p>
                </div>
              </div>

              {/* Reasoning */}
              <div style={{
                backgroundColor: '#f9fafb',
                padding: 12,
                borderRadius: 8,
                fontSize: 14,
                color: '#374151',
                lineHeight: 1.5,
                borderLeft: '3px solid #3b82f6'
              }}>
                {aiScore.reasoning}
              </div>
            </div>

            {/* Badges */}
            {badges.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#6b7280',
                  marginBottom: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Badges
                </h4>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8
                }}>
                  {badges.map((badge, idx) => (
                    <span
                      key={idx}
                      style={{
                        backgroundColor: '#f3f4f6',
                        padding: '6px 12px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 500,
                        color: '#374151',
                        border: '1px solid #e5e7eb'
                      }}
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Breakdown */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#6b7280',
                marginBottom: 14,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Score Breakdown
              </h4>
              {getBreakdownBar(aiScore.breakdown.valueProp, 'Value Proposition (40%)', '#10b981')}
              {getBreakdownBar(aiScore.breakdown.authenticity, 'Authenticity (25%)', '#3b82f6')}
              {getBreakdownBar(aiScore.breakdown.urgency, 'Urgency (20%)', '#f59e0b')}
              {getBreakdownBar(aiScore.breakdown.socialProof, 'Social Proof (15%)', '#8b5cf6')}
            </div>

            {/* Legend */}
            <div style={{
              fontSize: 11,
              color: '#9ca3af',
              paddingTop: 16,
              borderTop: '1px solid #e5e7eb'
            }}>
              <div style={{ marginBottom: 6 }}>
                <strong style={{ color: '#6b7280' }}>What this means:</strong>
              </div>
              <ul style={{
                margin: 0,
                paddingLeft: 20,
                lineHeight: 1.6
              }}>
                <li><strong>Value:</strong> Price quality vs market</li>
                <li><strong>Authenticity:</strong> Deal trustworthiness</li>
                <li><strong>Urgency:</strong> Time sensitivity</li>
                <li><strong>Social:</strong> Community feedback</li>
              </ul>
            </div>

            {/* Close Button */}
            <button
              onClick={() => {
                setShowModal(false);
                onClose?.();
              }}
              style={{
                marginTop: 20,
                width: '100%',
                padding: '12px 24px',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                color: '#374151',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e5e7eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
