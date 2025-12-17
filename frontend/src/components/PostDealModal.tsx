import { useState, useMemo, useEffect } from 'react';
import { dealsApi } from '../api/deals';
import { scraperApi } from '../api/scraper';
import type { Category } from '../types';

type Props = {
  onClose: () => void;
  onCreate: () => void;
  categories: Category[];
};

function normalizeUrl(raw: string) {
  const s = raw.trim();
  if (!s) return '';
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  return `https://${s}`;
}

function isProbablyValidUrl(url: string) {
  if (!url) return true;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

const FESTIVE_OPTIONS = [
  { value: 'diwali', label: 'Diwali', emoji: '🪔' },
  { value: 'pongal', label: 'Pongal', emoji: '🌾' },
  { value: 'holi', label: 'Holi', emoji: '🎨' },
  { value: 'dussehra', label: 'Dussehra', emoji: '🏹' },
  { value: 'navratri', label: 'Navratri', emoji: '💃' },
  { value: 'christmas', label: 'Christmas', emoji: '🎄' },
  { value: 'new-year', label: 'New Year', emoji: '🎉' },
  { value: 'republic-day', label: 'Republic Day', emoji: '🇮🇳' },
  { value: 'independence-day', label: 'Independence Day', emoji: '🇮🇳' },
  { value: 'eid', label: 'Eid', emoji: '🌙' },
  { value: 'raksha-bandhan', label: 'Raksha Bandhan', emoji: '🧵' },
  { value: 'ganesh-chaturthi', label: 'Ganesh Chaturthi', emoji: '🐘' },
  { value: 'onam', label: 'Onam', emoji: '🌺' },
];

const SEASONAL_OPTIONS = ['summer', 'winter', 'monsoon', 'spring', 'autumn'];

export default function PostDealModal({ onClose, onCreate, categories }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [merchant, setMerchant] = useState('');
  const [url, setUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [festiveTags, setFestiveTags] = useState<string[]>([]);
  const [seasonalTag, setSeasonalTag] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingImage, setFetchingImage] = useState(false);

  const priceNumber = useMemo(() => {
    const n = Number(price);
    return Number.isFinite(n) ? n : NaN;
  }, [price]);

  // Auto-fetch image when URL changes
  useEffect(() => {
    const fetchImage = async () => {
      const normalizedUrl = normalizeUrl(url);
      if (!normalizedUrl || !isProbablyValidUrl(normalizedUrl)) return;
      if (imageUrl) return;

      setFetchingImage(true);
      try {
        const result = await scraperApi.fetchImageFromUrl(normalizedUrl);
        setImageUrl(result.imageUrl);
      } catch (err) {
        console.error('Failed to fetch image:', err);
      } finally {
        setFetchingImage(false);
      }
    };

    const timeoutId = setTimeout(fetchImage, 1000);
    return () => clearTimeout(timeoutId);
  }, [url, imageUrl]);

  const originalPriceNumber = useMemo(() => {
    if (!originalPrice) return undefined;
    const n = Number(originalPrice);
    return Number.isFinite(n) ? n : undefined;
  }, [originalPrice]);

  const normalizedUrl = useMemo(() => normalizeUrl(url), [url]);

  const canSubmit =
    title.trim().length >= 3 &&
    merchant.trim().length >= 2 &&
    Number.isFinite(priceNumber) &&
    priceNumber > 0 &&
    isProbablyValidUrl(normalizedUrl);

  const submit = async () => {
    setError(null);

    if (!canSubmit) {
      if (!isProbablyValidUrl(normalizedUrl)) {
        setError('Please enter a valid URL (http/https), or leave it empty.');
        return;
      }
      setError('Please enter Title, Merchant, and a valid Price.');
      return;
    }

    setLoading(true);

    try {
      await dealsApi.createDeal({
        title: title.trim(),
        description: description.trim() || undefined,
        price: priceNumber,
        originalPrice: originalPriceNumber,
        merchant: merchant.trim(),
        url: normalizedUrl || undefined,
        imageUrl: imageUrl.trim() || undefined,
        categoryId: categoryId || undefined,
        festiveTags: festiveTags.length > 0 ? festiveTags : undefined,
        seasonalTag: seasonalTag || undefined,
      } as any);

      onCreate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create deal');
      setLoading(false);
    }
  };

  const toggleFestiveTag = (tag: string) => {
    setFestiveTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Calculate savings preview
  const savingsPreview = useMemo(() => {
    if (!originalPriceNumber || !priceNumber) return null;
    const savings = originalPriceNumber - priceNumber;
    const percentage = Math.round((savings / originalPriceNumber) * 100);
    return { savings, percentage };
  }, [originalPriceNumber, priceNumber]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
        overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 580,
          maxWidth: '100%',
          borderRadius: 24,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 24px 70px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
          padding: 28,
          color: '#fff',
          margin: '20px 0',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, background: 'linear-gradient(135deg, #fff 0%, #a8c0ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Share a Deal
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: 13, opacity: 0.7 }}>
              Help the community save money 💰
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px 12px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.16)',
              background: 'rgba(0,0,0,0.2)',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: 18,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0,0,0,0.2)';
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          {/* Title */}
          <label style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>
              Product Title <span style={{ color: '#10b981' }}>*</span>
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., iPhone 15 Pro Max 256GB - Titanium Blue"
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.16)',
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
                outline: 'none',
                fontSize: 15,
                transition: 'all 0.2s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                e.currentTarget.style.borderColor = 'rgba(16,185,129,0.5)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)';
              }}
            />
          </label>

          {/* Description */}
          <label style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>
              Description <span style={{ fontSize: 11, opacity: 0.6 }}>(optional)</span>
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add key features, why this is a great deal, or any important details..."
              rows={3}
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.16)',
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                fontSize: 15,
                transition: 'all 0.2s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                e.currentTarget.style.borderColor = 'rgba(16,185,129,0.5)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)';
              }}
            />
          </label>

          {/* Price Section with Preview */}
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.1) 100%)',
              border: '1px solid rgba(16,185,129,0.2)',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <label style={{ display: 'grid', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>
                  Deal Price <span style={{ color: '#10b981' }}>*</span>
                </span>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 16, fontWeight: 700, color: '#10b981' }}>₹</span>
                  <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="18999"
                    inputMode="numeric"
                    style={{
                      padding: '12px 16px 12px 32px',
                      borderRadius: 12,
                      border: '1px solid rgba(16,185,129,0.3)',
                      background: 'rgba(255,255,255,0.12)',
                      color: '#fff',
                      outline: 'none',
                      fontSize: 16,
                      fontWeight: 700,
                      width: '100%',
                    }}
                  />
                </div>
              </label>

              <label style={{ display: 'grid', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>
                  Original Price <span style={{ fontSize: 11, opacity: 0.6 }}>(optional)</span>
                </span>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 16, opacity: 0.6 }}>₹</span>
                  <input
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    placeholder="24900"
                    inputMode="numeric"
                    style={{
                      padding: '12px 16px 12px 32px',
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.16)',
                      background: 'rgba(255,255,255,0.08)',
                      color: '#fff',
                      outline: 'none',
                      fontSize: 16,
                      width: '100%',
                    }}
                  />
                </div>
              </label>
            </div>

            {/* Savings Preview */}
            {savingsPreview && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: 'rgba(16,185,129,0.15)',
                  border: '1px solid rgba(16,185,129,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 24 }}>💰</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>
                    Save ₹{savingsPreview.savings.toLocaleString('en-IN')} ({savingsPreview.percentage}% OFF)
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
                    Great deal! AI will score this highly
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Merchant */}
          <label style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>
              Merchant <span style={{ color: '#10b981' }}>*</span>
            </span>
            <input
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="Amazon / Flipkart / Croma / etc."
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.16)',
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
                outline: 'none',
                fontSize: 15,
              }}
            />
          </label>

          {/* URL */}
          <label style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>
              Product URL <span style={{ fontSize: 11, opacity: 0.6 }}>(optional)</span>
            </span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.amazon.in/product/..."
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.16)',
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
                outline: 'none',
                fontSize: 14,
                fontFamily: 'monospace',
              }}
            />
          </label>

          {/* Image URL */}
          <label style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>
              Image URL {fetchingImage && <span style={{ color: '#3b82f6', fontSize: 12 }}>🔄 Auto-fetching...</span>}
            </span>
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder={fetchingImage ? "Fetching from product page..." : "Auto-filled or enter manually"}
              disabled={fetchingImage}
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.16)',
                background: fetchingImage ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)',
                color: '#fff',
                outline: 'none',
                fontSize: 14,
                fontFamily: 'monospace',
                opacity: fetchingImage ? 0.6 : 1,
              }}
            />
          </label>

          {/* Category */}
          {categories.length > 0 && (
            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>
                Category <span style={{ fontSize: 11, opacity: 0.6 }}>(optional)</span>
              </span>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={{
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.16)',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#fff',
                  outline: 'none',
                  fontSize: 15,
                }}
              >
                <option value="" style={{ background: '#1a1a2e' }}>Select a category...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id} style={{ background: '#1a1a2e' }}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* Festive Tags */}
          <label style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>
              Festive Tags <span style={{ fontSize: 11, opacity: 0.6 }}>(optional - boosts visibility!)</span>
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {FESTIVE_OPTIONS.map(tag => (
                <button
                  key={tag.value}
                  type="button"
                  onClick={() => toggleFestiveTag(tag.value)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 999,
                    border: festiveTags.includes(tag.value)
                      ? '2px solid rgba(255, 193, 7, 0.6)'
                      : '1px solid rgba(255,255,255,0.16)',
                    background: festiveTags.includes(tag.value)
                      ? 'linear-gradient(135deg, rgba(255, 193, 7, 0.3) 0%, rgba(255, 152, 0, 0.2) 100%)'
                      : 'rgba(255,255,255,0.08)',
                    color: festiveTags.includes(tag.value) ? '#ffd54f' : '#fff',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: 12,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!festiveTags.includes(tag.value)) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!festiveTags.includes(tag.value)) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                    }
                  }}
                >
                  {tag.emoji} {tag.label}
                </button>
              ))}
            </div>
          </label>

          {/* Seasonal Tag */}
          <label style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>
              Seasonal Tag <span style={{ fontSize: 11, opacity: 0.6 }}>(optional)</span>
            </span>
            <select
              value={seasonalTag}
              onChange={(e) => setSeasonalTag(e.target.value)}
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.16)',
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
                outline: 'none',
                fontSize: 15,
              }}
            >
              <option value="" style={{ background: '#1a1a2e' }}>Select a season...</option>
              {SEASONAL_OPTIONS.map((season) => (
                <option key={season} value={season} style={{ background: '#1a1a2e', textTransform: 'capitalize' }}>
                  {season.charAt(0).toUpperCase() + season.slice(1)}
                </option>
              ))}
            </select>
          </label>

          {/* Error Message */}
          {error && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.15) 100%)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#fca5a5',
                fontWeight: 700,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span style={{ fontSize: 18 }}>⚠️</span>
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={submit}
            disabled={loading || !canSubmit}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 14,
              border: 'none',
              background:
                canSubmit && !loading
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'rgba(255,255,255,0.1)',
              color: canSubmit && !loading ? '#fff' : 'rgba(255,255,255,0.4)',
              cursor: canSubmit && !loading ? 'pointer' : 'not-allowed',
              fontWeight: 900,
              fontSize: 16,
              boxShadow: canSubmit && !loading ? '0 4px 14px rgba(16,185,129,0.4)' : 'none',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (canSubmit && !loading) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(16,185,129,0.5)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = canSubmit && !loading ? '0 4px 14px rgba(16,185,129,0.4)' : 'none';
            }}
          >
            {loading ? '🔄 Creating Deal...' : '✨ Share This Deal'}
          </button>

          {/* Footer Tip */}
          <div
            style={{
              textAlign: 'center',
              fontSize: 12,
              opacity: 0.6,
              paddingTop: 8,
            }}
          >
            💡 Tip: Press <kbd style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.1)', fontFamily: 'monospace' }}>Esc</kbd> to close
          </div>
        </div>
      </div>
    </div>
  );
}
