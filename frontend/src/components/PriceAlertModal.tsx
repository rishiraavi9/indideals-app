import { useState } from 'react';
import { createPriceAlert } from '../api/priceHistory';

interface PriceAlertModalProps {
  dealId: string;
  dealTitle: string;
  currentPrice: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PriceAlertModal({
  dealId,
  dealTitle,
  currentPrice,
  onClose,
  onSuccess,
}: PriceAlertModalProps) {
  const [targetPrice, setTargetPrice] = useState(Math.round(currentPrice * 0.9)); // Default 10% lower
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presetDiscounts = [5, 10, 20, 30];

  const handleSubmit = async () => {
    if (targetPrice <= 0) {
      setError('Please enter a valid target price');
      return;
    }

    if (targetPrice >= currentPrice) {
      setError('Target price should be lower than current price');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await createPriceAlert(dealId, targetPrice);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create price alert');
    } finally {
      setLoading(false);
    }
  };

  const discount = Math.round(((currentPrice - targetPrice) / currentPrice) * 100);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          padding: 24,
          maxWidth: 420,
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1a1a1a' }}>
              Set Price Alert
            </h2>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: '#6b7280', lineHeight: 1.4 }}>
              {dealTitle.length > 60 ? dealTitle.substring(0, 60) + '...' : dealTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: '#9ca3af',
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Current Price */}
        <div style={{
          background: '#f3f4f6',
          borderRadius: 8,
          padding: 12,
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: 13, color: '#6b7280' }}>Current Price</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>₹{currentPrice.toLocaleString()}</span>
        </div>

        {/* Quick preset buttons */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Alert me when price drops by:</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {presetDiscounts.map((pct) => {
              const presetPrice = Math.round(currentPrice * (1 - pct / 100));
              const isSelected = targetPrice === presetPrice;
              return (
                <button
                  key={pct}
                  onClick={() => setTargetPrice(presetPrice)}
                  style={{
                    flex: 1,
                    padding: '10px 8px',
                    borderRadius: 8,
                    border: isSelected ? '2px solid #667eea' : '1px solid #d1d5db',
                    background: isSelected ? '#eff6ff' : '#ffffff',
                    color: isSelected ? '#667eea' : '#374151',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  -{pct}%
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom price input */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Or set custom target price:</div>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 16,
              color: '#6b7280',
            }}>₹</span>
            <input
              type="number"
              value={targetPrice}
              onChange={(e) => setTargetPrice(parseInt(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: '12px 12px 12px 32px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontSize: 16,
                fontWeight: 600,
                outline: 'none',
                boxSizing: 'border-box',
              }}
              placeholder="Enter target price"
            />
          </div>
          {targetPrice > 0 && targetPrice < currentPrice && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#10b981' }}>
              You'll be notified when price drops by {discount}% (₹{(currentPrice - targetPrice).toLocaleString()} off)
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: '#fef2f2',
            color: '#dc2626',
            padding: 12,
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              background: '#ffffff',
              color: '#374151',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || targetPrice <= 0 || targetPrice >= currentPrice}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 8,
              border: 'none',
              background: loading || targetPrice <= 0 || targetPrice >= currentPrice
                ? '#9ca3af'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: 14,
              cursor: loading || targetPrice <= 0 || targetPrice >= currentPrice ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {loading ? 'Creating...' : '🔔 Set Alert'}
          </button>
        </div>

        {/* Info */}
        <div style={{
          marginTop: 16,
          padding: 12,
          background: '#f0f9ff',
          borderRadius: 8,
          fontSize: 12,
          color: '#0369a1',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
        }}>
          <span>💡</span>
          <span>We'll send you an email when the price drops to or below your target. You can manage your alerts in your profile.</span>
        </div>
      </div>
    </div>
  );
}
