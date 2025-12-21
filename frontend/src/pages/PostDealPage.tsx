import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dealsApi } from '../api/deals';
import { scraperApi } from '../api/scraper';
import { categoriesApi } from '../api/categories';
import type { Category } from '../types';

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

export default function PostDealPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
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

  // Load categories
  useEffect(() => {
    categoriesApi.getCategories().then(setCategories).catch(console.error);
  }, []);

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

      // Navigate back to home
      navigate('/');
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
      style={{
        minHeight: '100vh',
        background: '#f5f7fa',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header - Same as HomePage */}
      <div
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          padding: '16px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          {/* Logo */}
          <h1
            onClick={() => navigate('/')}
            style={{
              margin: 0,
              fontSize: 28,
              letterSpacing: -0.5,
              color: '#1a1a1a',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            🔥 <span style={{ fontWeight: 900 }}>DesiDealsAI</span>
          </h1>

          {/* User actions */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            {isAuthenticated && user ? (
              <>
                <div
                  onClick={() => navigate("/profile")}
                  style={{
                    fontSize: 13,
                    color: '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    padding: '6px 10px',
                    borderRadius: 8,
                    transition: 'background 0.2s',
                    background: '#f9fafb',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e5e7eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{user.username}</span>
                  <span
                    style={{
                      padding: '2px 6px',
                      borderRadius: 999,
                      background: '#10b981',
                      color: 'white',
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    {user.reputation}
                  </span>
                </div>
                <button
                  onClick={() => navigate("/profile")}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    background: '#ffffff',
                    color: '#374151',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 13,
                    whiteSpace: 'nowrap',
                  }}
                >
                  📊
                </button>
                <button
                  onClick={logout}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    background: '#ffffff',
                    color: '#374151',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 13,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/login')}
                style={{
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 14,
                  whiteSpace: 'nowrap',
                }}
              >
                Login
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '60px 24px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', color: 'white' }}>
          <h1 style={{ fontSize: 48, fontWeight: 800, margin: '0 0 16px', lineHeight: 1.2, letterSpacing: '-0.5px' }}>
            Share a Great Deal
          </h1>
          <p style={{ fontSize: 18, margin: 0, opacity: 0.95, lineHeight: 1.6 }}>
            Help the community save money by sharing amazing deals you've found 💰
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '40px 24px', maxWidth: '800px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <div
          style={{
            background: '#ffffff',
            borderRadius: 16,
            padding: 40,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ display: 'grid', gap: 24 }}>
            {/* Title */}
            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>
                Product Title <span style={{ color: '#10b981' }}>*</span>
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., iPhone 15 Pro Max 256GB - Titanium Blue"
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  background: '#ffffff',
                  color: '#1a1a1a',
                  outline: 'none',
                  fontSize: 15,
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#10b981';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </label>

            {/* Description */}
            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>
                Description <span style={{ fontSize: 12, color: '#6b7280' }}>(optional)</span>
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add key features, why this is a great deal, or any important details..."
                rows={4}
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  background: '#ffffff',
                  color: '#1a1a1a',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  fontSize: 15,
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#10b981';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </label>

            {/* Price Section */}
            <div
              style={{
                padding: 24,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                border: '2px solid #10b981',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <label style={{ display: 'grid', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#065f46' }}>
                    Deal Price <span style={{ color: '#10b981' }}>*</span>
                  </span>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 18, fontWeight: 700, color: '#10b981' }}>₹</span>
                    <input
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="18999"
                      inputMode="numeric"
                      style={{
                        padding: '12px 16px 12px 36px',
                        borderRadius: 8,
                        border: '2px solid #10b981',
                        background: '#ffffff',
                        color: '#1a1a1a',
                        outline: 'none',
                        fontSize: 18,
                        fontWeight: 700,
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </label>

                <label style={{ display: 'grid', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#065f46' }}>
                    Original Price <span style={{ fontSize: 12, color: '#6b7280' }}>(optional)</span>
                  </span>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: '#6b7280' }}>₹</span>
                    <input
                      value={originalPrice}
                      onChange={(e) => setOriginalPrice(e.target.value)}
                      placeholder="24900"
                      inputMode="numeric"
                      style={{
                        padding: '12px 16px 12px 36px',
                        borderRadius: 8,
                        border: '1px solid #d1d5db',
                        background: '#ffffff',
                        color: '#1a1a1a',
                        outline: 'none',
                        fontSize: 18,
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </label>
              </div>

              {/* Savings Preview */}
              {savingsPreview && (
                <div
                  style={{
                    padding: 16,
                    borderRadius: 10,
                    background: '#ffffff',
                    border: '2px solid #10b981',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <span style={{ fontSize: 32 }}>💰</span>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981' }}>
                      Save ₹{savingsPreview.savings.toLocaleString('en-IN')} ({savingsPreview.percentage}% OFF)
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                      Great deal! AI will score this highly
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Merchant */}
            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>
                Merchant <span style={{ color: '#10b981' }}>*</span>
              </span>
              <input
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="Amazon / Flipkart / Croma / etc."
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  background: '#ffffff',
                  color: '#1a1a1a',
                  outline: 'none',
                  fontSize: 15,
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#10b981';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </label>

            {/* URL */}
            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>
                Product URL <span style={{ fontSize: 12, color: '#6b7280' }}>(optional)</span>
              </span>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.amazon.in/product/..."
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  background: '#ffffff',
                  color: '#1a1a1a',
                  outline: 'none',
                  fontSize: 14,
                  fontFamily: 'monospace',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#10b981';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </label>

            {/* Image URL */}
            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>
                Image URL {fetchingImage && <span style={{ color: '#3b82f6', fontSize: 13 }}>🔄 Auto-fetching...</span>}
              </span>
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder={fetchingImage ? "Fetching from product page..." : "Auto-filled or enter manually"}
                disabled={fetchingImage}
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  background: fetchingImage ? '#f9fafb' : '#ffffff',
                  color: '#1a1a1a',
                  outline: 'none',
                  fontSize: 14,
                  fontFamily: 'monospace',
                  opacity: fetchingImage ? 0.6 : 1,
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                  if (!fetchingImage) {
                    e.currentTarget.style.borderColor = '#10b981';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)';
                  }
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </label>

            {/* Category */}
            {categories.length > 0 && (
              <label style={{ display: 'grid', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>
                  Category <span style={{ fontSize: 12, color: '#6b7280' }}>(optional)</span>
                </span>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    background: '#ffffff',
                    color: '#1a1a1a',
                    outline: 'none',
                    fontSize: 15,
                    cursor: 'pointer',
                  }}
                >
                  <option value="">Select a category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {/* Festive Tags */}
            <label style={{ display: 'grid', gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>
                Festive Tags <span style={{ fontSize: 12, color: '#6b7280' }}>(optional - boosts visibility!)</span>
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {FESTIVE_OPTIONS.map(tag => (
                  <button
                    key={tag.value}
                    type="button"
                    onClick={() => toggleFestiveTag(tag.value)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 999,
                      border: festiveTags.includes(tag.value)
                        ? '2px solid #f59e0b'
                        : '1px solid #d1d5db',
                      background: festiveTags.includes(tag.value)
                        ? '#fef3c7'
                        : '#ffffff',
                      color: festiveTags.includes(tag.value) ? '#b45309' : '#374151',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 13,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!festiveTags.includes(tag.value)) {
                        e.currentTarget.style.background = '#f9fafb';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!festiveTags.includes(tag.value)) {
                        e.currentTarget.style.background = '#ffffff';
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
              <span style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>
                Seasonal Tag <span style={{ fontSize: 12, color: '#6b7280' }}>(optional)</span>
              </span>
              <select
                value={seasonalTag}
                onChange={(e) => setSeasonalTag(e.target.value)}
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  background: '#ffffff',
                  color: '#1a1a1a',
                  outline: 'none',
                  fontSize: 15,
                  cursor: 'pointer',
                }}
              >
                <option value="">Select a season...</option>
                {SEASONAL_OPTIONS.map((season) => (
                  <option key={season} value={season} style={{ textTransform: 'capitalize' }}>
                    {season.charAt(0).toUpperCase() + season.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            {/* Error Message */}
            {error && (
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: 10,
                  background: '#fee2e2',
                  border: '1px solid #ef4444',
                  color: '#991b1b',
                  fontWeight: 600,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 20 }}>⚠️</span>
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
                borderRadius: 10,
                border: 'none',
                background:
                  canSubmit && !loading
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : '#e5e7eb',
                color: canSubmit && !loading ? '#fff' : '#9ca3af',
                cursor: canSubmit && !loading ? 'pointer' : 'not-allowed',
                fontWeight: 700,
                fontSize: 16,
                boxShadow: canSubmit && !loading ? '0 4px 14px rgba(102, 126, 234, 0.4)' : 'none',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (canSubmit && !loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = canSubmit && !loading ? '0 4px 14px rgba(102, 126, 234, 0.4)' : 'none';
              }}
            >
              {loading ? '🔄 Creating Deal...' : '✨ Share This Deal'}
            </button>
          </div>
        </div>

        {/* Footer Tip */}
        <div
          style={{
            textAlign: 'center',
            fontSize: 14,
            color: '#6b7280',
            marginTop: 24,
            padding: 16,
            background: '#ffffff',
            borderRadius: 10,
            border: '1px solid #e5e7eb',
          }}
        >
          💡 Your deal will be instantly analyzed by AI and scored for quality
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#1a1a1a', color: '#9ca3af', padding: '40px 24px', marginTop: 60 }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 12, color: '#ffffff' }}>
            🔥 DesiDealsAI
          </div>
          <p style={{ margin: '0 0 20px', fontSize: 14 }}>
            AI-Powered Deal Discovery Platform
          </p>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            © 2025 DesiDealsAI. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
