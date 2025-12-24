import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getPricePrediction,
  getDealSummary,
  getSmartAlertSuggestion,
  createSmartAlert,
  type PricePrediction,
  type DealSummary,
  type SmartAlertSuggestion,
} from '../api/ai';
import { useAuth } from '../context/AuthContext';

interface AIInsightsProps {
  dealId: string;
  currentPrice: number;
  originalPrice?: number | null;
}

export default function AIInsights({ dealId, currentPrice, originalPrice }: AIInsightsProps) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [prediction, setPrediction] = useState<PricePrediction | null>(null);
  const [summary, setSummary] = useState<DealSummary | null>(null);
  const [alertSuggestion, setAlertSuggestion] = useState<SmartAlertSuggestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'prediction' | 'summary' | 'alert'>('prediction');
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [creatingAlert, setCreatingAlert] = useState(false);
  const [alertCreated, setAlertCreated] = useState(false);

  useEffect(() => {
    loadAIData();
  }, [dealId]);

  const loadAIData = async () => {
    setLoading(true);
    try {
      const [predictionData, summaryData] = await Promise.all([
        getPricePrediction(dealId).catch(() => null),
        getDealSummary(dealId).catch(() => null),
      ]);
      setPrediction(predictionData);
      setSummary(summaryData);

      // Set default target price for alert (10% below current)
      const defaultTarget = Math.round(currentPrice * 0.9);
      setTargetPrice(defaultTarget.toString());
    } catch (error) {
      console.error('Failed to load AI data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGetAlertSuggestion = async () => {
    if (!targetPrice) return;
    try {
      const suggestion = await getSmartAlertSuggestion(dealId, parseInt(targetPrice));
      setAlertSuggestion(suggestion);
    } catch (error) {
      console.error('Failed to get alert suggestion:', error);
    }
  };

  const handleCreateAlert = async () => {
    if (!targetPrice || !isAuthenticated) return;
    setCreatingAlert(true);
    try {
      await createSmartAlert(dealId, parseInt(targetPrice));
      setAlertCreated(true);
      setTimeout(() => setAlertCreated(false), 3000);
    } catch (error) {
      console.error('Failed to create alert:', error);
    } finally {
      setCreatingAlert(false);
    }
  };

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

  const getRecommendationStyle = (rec: string) => {
    switch (rec) {
      case 'buy_now':
      case 'buy':
        return { bg: '#dcfce7', color: '#15803d', icon: '✅' };
      case 'wait':
        return { bg: '#fef3c7', color: '#b45309', icon: '⏳' };
      case 'skip':
        return { bg: '#fee2e2', color: '#b91c1c', icon: '❌' };
      default:
        return { bg: '#f3f4f6', color: '#374151', icon: '📊' };
    }
  };

  if (loading) {
    return (
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        padding: 24,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>🤖</span>
          <span style={{ color: '#6b7280' }}>Loading AI insights...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '16px 20px',
        color: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 24 }}>🤖</span>
          <span style={{ fontSize: 18, fontWeight: 700 }}>AI Insights</span>
          <span style={{
            marginLeft: 'auto',
            fontSize: 12,
            background: 'rgba(255,255,255,0.2)',
            padding: '4px 8px',
            borderRadius: 4,
          }}>
            Cost-Free
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e5e7eb',
      }}>
        {(['prediction', 'summary', 'alert'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: 'none',
              background: activeTab === tab ? '#f9fafb' : 'transparent',
              borderBottom: activeTab === tab ? '2px solid #667eea' : '2px solid transparent',
              color: activeTab === tab ? '#667eea' : '#6b7280',
              fontWeight: activeTab === tab ? 700 : 500,
              cursor: 'pointer',
              fontSize: 14,
              transition: 'all 0.2s',
            }}
          >
            {tab === 'prediction' && '📊 Price Forecast'}
            {tab === 'summary' && '📝 Summary'}
            {tab === 'alert' && '🔔 Smart Alert'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: 20 }}>
        {/* Price Prediction Tab */}
        {activeTab === 'prediction' && prediction && (
          <div>
            {/* Trend Overview */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              marginBottom: 20,
            }}>
              <div style={{
                background: '#f9fafb',
                borderRadius: 8,
                padding: 16,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 28 }}>{getTrendIcon(prediction.trend)}</div>
                <div style={{
                  color: getTrendColor(prediction.trend),
                  fontWeight: 700,
                  fontSize: 14,
                  textTransform: 'capitalize',
                }}>
                  {prediction.trend} Trend
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  {prediction.trendStrength}% confidence
                </div>
              </div>

              <div style={{
                background: '#f9fafb',
                borderRadius: 8,
                padding: 16,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 28 }}>🎯</div>
                <div style={{ fontWeight: 700, color: '#374151' }}>
                  {prediction.predictedPrice
                    ? `₹${prediction.predictedPrice.toLocaleString('en-IN')}`
                    : 'N/A'}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  Predicted in 7 days
                </div>
              </div>

              <div style={{
                background: '#f9fafb',
                borderRadius: 8,
                padding: 16,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 28 }}>📅</div>
                <div style={{ fontWeight: 700, color: '#374151' }}>
                  {prediction.bestBuyDay || 'Any day'}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  Best day to buy
                </div>
              </div>
            </div>

            {/* Price Range */}
            <div style={{
              background: '#f9fafb',
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#374151' }}>
                30-Day Price Range
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>Lowest</span>
                  <div style={{ fontWeight: 700, color: '#10b981' }}>
                    ₹{prediction.lowestPriceLast30Days?.toLocaleString('en-IN') || 'N/A'}
                  </div>
                </div>
                <div style={{
                  flex: 1,
                  height: 8,
                  background: '#e5e7eb',
                  borderRadius: 4,
                  margin: '0 16px',
                  position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute',
                    left: '50%',
                    top: -4,
                    width: 16,
                    height: 16,
                    background: '#667eea',
                    borderRadius: '50%',
                    transform: 'translateX(-50%)',
                    border: '2px solid #fff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  }} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>Highest</span>
                  <div style={{ fontWeight: 700, color: '#ef4444' }}>
                    ₹{prediction.highestPriceLast30Days?.toLocaleString('en-IN') || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Flash Sale Alert */}
            {prediction.flashSalePattern && (
              <div style={{
                background: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>⚡</span>
                  <div>
                    <div style={{ fontWeight: 700, color: '#b45309' }}>Flash Sale Pattern Detected!</div>
                    <div style={{ fontSize: 13, color: '#92400e' }}>
                      {prediction.nextFlashSaleDate
                        ? `Next expected: ${new Date(prediction.nextFlashSaleDate).toLocaleDateString()}`
                        : 'This product frequently has flash sales'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Recommendation */}
            {prediction.recommendation && (
              <div style={{
                background: getRecommendationStyle(prediction.recommendation).bg,
                borderRadius: 8,
                padding: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 32 }}>
                    {getRecommendationStyle(prediction.recommendation).icon}
                  </span>
                  <div>
                    <div style={{
                      fontWeight: 700,
                      color: getRecommendationStyle(prediction.recommendation).color,
                      fontSize: 16,
                    }}>
                      {prediction.recommendation === 'buy_now' && 'Buy Now - Good Price!'}
                      {prediction.recommendation === 'wait' && 'Wait - Price May Drop'}
                      {prediction.recommendation === 'skip' && 'Skip - Not Recommended'}
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                      {prediction.confidence}% confidence based on price history
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Summary Tab */}
        {activeTab === 'summary' && summary && (
          <div>
            {/* Headline */}
            <div style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#1f2937',
              marginBottom: 16,
              lineHeight: 1.4,
            }}>
              {summary.headline}
            </div>

            {/* Value Points */}
            {summary.valuePoints.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                  Key Benefits
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {summary.valuePoints.map((point, idx) => (
                    <span
                      key={idx}
                      style={{
                        background: '#dcfce7',
                        color: '#15803d',
                        padding: '6px 12px',
                        borderRadius: 20,
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      ✓ {point}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Price Analysis */}
            <div style={{
              background: '#f9fafb',
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
                Price Analysis
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Current Price</div>
                  <div style={{ fontWeight: 700, color: '#10b981', fontSize: 18 }}>
                    ₹{summary.priceAnalysis.currentPrice.toLocaleString('en-IN')}
                  </div>
                </div>
                {summary.priceAnalysis.savings && (
                  <div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>You Save</div>
                    <div style={{ fontWeight: 700, color: '#10b981', fontSize: 18 }}>
                      ₹{summary.priceAnalysis.savings.toLocaleString('en-IN')}
                    </div>
                  </div>
                )}
              </div>
              <div style={{
                marginTop: 12,
                padding: '8px 12px',
                background: summary.priceAnalysis.priceStatus.includes('Lowest') ? '#dcfce7' : '#f3f4f6',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                color: summary.priceAnalysis.priceStatus.includes('Lowest') ? '#15803d' : '#374151',
              }}>
                {summary.priceAnalysis.priceStatus}
              </div>
            </div>

            {/* Buy Recommendation */}
            <div style={{
              background: getRecommendationStyle(summary.buyRecommendation.action).bg,
              borderRadius: 8,
              padding: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ fontSize: 32 }}>
                  {getRecommendationStyle(summary.buyRecommendation.action).icon}
                </span>
                <div>
                  <div style={{
                    fontWeight: 700,
                    color: getRecommendationStyle(summary.buyRecommendation.action).color,
                    fontSize: 16,
                    textTransform: 'capitalize',
                  }}>
                    {summary.buyRecommendation.action === 'buy' ? 'Recommended Buy' : summary.buyRecommendation.action}
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                    {summary.buyRecommendation.reasoning}
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                    {summary.buyRecommendation.confidence}% confidence
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Smart Alert Tab */}
        {activeTab === 'alert' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                Set Your Target Price
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: '8px 12px',
                  flex: 1,
                }}>
                  <span style={{ color: '#6b7280', marginRight: 4 }}>₹</span>
                  <input
                    type="number"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      fontSize: 16,
                      fontWeight: 600,
                      width: '100%',
                      outline: 'none',
                    }}
                    placeholder="Enter target price"
                  />
                </div>
                <button
                  onClick={handleGetAlertSuggestion}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#667eea',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  Analyze
                </button>
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
                Current price: ₹{currentPrice.toLocaleString('en-IN')}
              </div>
            </div>

            {/* Suggestion Result */}
            {alertSuggestion && (
              <div style={{ marginBottom: 16 }}>
                <div style={{
                  background: alertSuggestion.recommendation === 'buy_now' ? '#dcfce7' :
                             alertSuggestion.recommendation === 'wait' ? '#fef3c7' : '#f9fafb',
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 16,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 24 }}>
                      {alertSuggestion.recommendation === 'buy_now' ? '✅' :
                       alertSuggestion.recommendation === 'wait' ? '⏳' : '🔔'}
                    </span>
                    <div style={{ fontWeight: 700, color: '#374151' }}>
                      {alertSuggestion.recommendation === 'buy_now' && 'Buy Now!'}
                      {alertSuggestion.recommendation === 'wait' && 'Wait for Better Price'}
                      {alertSuggestion.recommendation === 'set_alert' && 'Set Alert'}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 12 }}>
                    {alertSuggestion.reasoning}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Drop Probability</div>
                      <div style={{ fontWeight: 700, color: '#374151' }}>
                        {alertSuggestion.dropProbability}%
                      </div>
                    </div>
                    {alertSuggestion.suggestedWaitDays && (
                      <div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>Wait Time</div>
                        <div style={{ fontWeight: 700, color: '#374151' }}>
                          ~{alertSuggestion.suggestedWaitDays} days
                        </div>
                      </div>
                    )}
                  </div>
                  {alertSuggestion.suggestedTargetPrice && (
                    <div style={{
                      marginTop: 12,
                      padding: '8px 12px',
                      background: 'rgba(255,255,255,0.5)',
                      borderRadius: 6,
                      fontSize: 13,
                    }}>
                      💡 Suggested realistic target: <strong>₹{alertSuggestion.suggestedTargetPrice.toLocaleString('en-IN')}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Create Alert Button */}
            {isAuthenticated ? (
              <button
                onClick={handleCreateAlert}
                disabled={creatingAlert || alertCreated}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: alertCreated
                    ? '#10b981'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: creatingAlert ? 'wait' : 'pointer',
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {alertCreated ? (
                  <>✅ Alert Created!</>
                ) : creatingAlert ? (
                  <>Creating...</>
                ) : (
                  <>🔔 Create Smart Alert</>
                )}
              </button>
            ) : (
              <div style={{
                background: '#f9fafb',
                borderRadius: 8,
                padding: 16,
                textAlign: 'center',
                color: '#6b7280',
              }}>
                <div style={{ marginBottom: 8 }}>🔒 Login required to create alerts</div>
              </div>
            )}
          </div>
        )}

        {/* No data fallback */}
        {activeTab === 'prediction' && !prediction && (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: 20 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
            <div>Not enough price history for predictions</div>
          </div>
        )}

        {activeTab === 'summary' && !summary && (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: 20 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
            <div>Unable to generate summary</div>
          </div>
        )}
      </div>
    </div>
  );
}
