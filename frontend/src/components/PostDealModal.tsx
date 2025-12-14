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
  'diwali', 'pongal', 'holi', 'dussehra', 'navratri',
  'christmas', 'new-year', 'republic-day', 'independence-day',
  'eid', 'raksha-bandhan', 'ganesh-chaturthi', 'onam'
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
      if (imageUrl) return; // Don't overwrite if user already has an image

      setFetchingImage(true);
      try {
        const result = await scraperApi.fetchImageFromUrl(normalizedUrl);
        setImageUrl(result.imageUrl);
      } catch (err) {
        // Silently fail - user can manually enter image URL if needed
        console.error('Failed to fetch image:', err);
      } finally {
        setFetchingImage(false);
      }
    };

    // Debounce the fetch
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

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.62)',
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
          width: 520,
          maxWidth: '100%',
          borderRadius: 18,
          border: '1px solid rgba(255,255,255,0.16)',
          background:
            'linear-gradient(180deg, rgba(14, 46, 110, 0.45), rgba(2, 6, 16, 0.85))',
          boxShadow: '0 24px 70px rgba(0,0,0,0.6)',
          padding: 20,
          color: '#eaf2ff',
          margin: '20px 0',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 22 }}>Post a Deal</h2>
          <button
            onClick={onClose}
            style={{
              padding: '6px 10px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.16)',
              background: 'rgba(0,0,0,0.25)',
              color: '#eaf2ff',
              cursor: 'pointer',
              fontWeight: 800,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.85 }}>Title *</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Product name + key details"
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(0,0,0,0.25)',
                color: '#eaf2ff',
                outline: 'none',
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.85 }}>Description (optional)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details about this deal..."
              rows={3}
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(0,0,0,0.25)',
                color: '#eaf2ff',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.85 }}>Price *</span>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="18999"
                inputMode="numeric"
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'rgba(0,0,0,0.25)',
                  color: '#eaf2ff',
                  outline: 'none',
                }}
              />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.85 }}>Original Price</span>
              <input
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                placeholder="24900"
                inputMode="numeric"
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'rgba(0,0,0,0.25)',
                  color: '#eaf2ff',
                  outline: 'none',
                }}
              />
            </label>
          </div>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.85 }}>Merchant *</span>
            <input
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="Amazon / Flipkart / Croma"
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(0,0,0,0.25)',
                color: '#eaf2ff',
                outline: 'none',
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.85 }}>Deal URL (optional)</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(0,0,0,0.25)',
                color: '#eaf2ff',
                outline: 'none',
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.85 }}>
              Image URL {fetchingImage && '(auto-fetching...)'}
            </span>
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder={fetchingImage ? "Fetching from product page..." : "Auto-filled from URL or enter manually"}
              disabled={fetchingImage}
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.14)',
                background: fetchingImage ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.25)',
                color: '#eaf2ff',
                outline: 'none',
                opacity: fetchingImage ? 0.6 : 1,
              }}
            />
          </label>

          {categories.length > 0 && (
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.85 }}>Category</span>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'rgba(0,0,0,0.25)',
                  color: '#eaf2ff',
                  outline: 'none',
                }}
              >
                <option value="">Select a category...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id} style={{ background: '#1a1a2e' }}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.85 }}>Festive Tags (optional)</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {FESTIVE_OPTIONS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleFestiveTag(tag)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 999,
                    border: festiveTags.includes(tag)
                      ? '1px solid rgba(255, 193, 7, 0.5)'
                      : '1px solid rgba(255,255,255,0.14)',
                    background: festiveTags.includes(tag)
                      ? 'rgba(255, 193, 7, 0.25)'
                      : 'rgba(0,0,0,0.18)',
                    color: festiveTags.includes(tag) ? '#ffd54f' : 'rgba(234,242,255,0.85)',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: 11,
                    textTransform: 'capitalize',
                  }}
                >
                  {tag.replace('-', ' ')}
                </button>
              ))}
            </div>
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.85 }}>Seasonal Tag (optional)</span>
            <select
              value={seasonalTag}
              onChange={(e) => setSeasonalTag(e.target.value)}
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(0,0,0,0.25)',
                color: '#eaf2ff',
                outline: 'none',
              }}
            >
              <option value="">Select a season...</option>
              {SEASONAL_OPTIONS.map((season) => (
                <option key={season} value={season} style={{ background: '#1a1a2e', textTransform: 'capitalize' }}>
                  {season.charAt(0).toUpperCase() + season.slice(1)}
                </option>
              ))}
            </select>
          </label>

          {error && (
            <div
              style={{
                color: '#ff8080',
                fontWeight: 700,
                fontSize: 13,
                padding: '8px 12px',
                borderRadius: 8,
                background: 'rgba(255,0,0,0.1)',
              }}
            >
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={loading || !canSubmit}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.18)',
              background:
                canSubmit && !loading
                  ? 'rgba(38, 118, 255, 0.9)'
                  : 'rgba(255,255,255,0.08)',
              color: canSubmit && !loading ? '#fff' : 'rgba(234,242,255,0.65)',
              cursor: canSubmit && !loading ? 'pointer' : 'not-allowed',
              fontWeight: 900,
              fontSize: 16,
            }}
          >
            {loading ? 'Creating...' : 'Create Deal'}
          </button>

          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Tip: press <b>Esc</b> to close.
          </div>
        </div>
      </div>
    </div>
  );
}
