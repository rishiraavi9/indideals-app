import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHaptics } from '../../hooks/useHaptics';
import { useAuth } from '../../context/AuthContext';
import { dealsApi } from '../../api/deals';
import { categoriesApi } from '../../api/categories';
import { apiClient } from '../../api/client';
import type { Category } from '../../types';

// Helper to extract merchant name from URL
function extractMerchant(url: string): string | null {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    if (hostname.includes('amazon')) return 'Amazon';
    if (hostname.includes('flipkart')) return 'Flipkart';
    if (hostname.includes('myntra')) return 'Myntra';
    if (hostname.includes('ajio')) return 'Ajio';
    if (hostname.includes('nykaa')) return 'Nykaa';
    if (hostname.includes('croma')) return 'Croma';
    if (hostname.includes('tatacliq')) return 'Tata Cliq';
    if (hostname.includes('meesho')) return 'Meesho';
    if (hostname.includes('snapdeal')) return 'Snapdeal';
    if (hostname.includes('jiomart')) return 'JioMart';
    if (hostname.includes('reliancedigital')) return 'Reliance Digital';
    if (hostname.includes('vijaysales')) return 'Vijay Sales';

    // Extract domain name as fallback (e.g., "example" from "www.example.com")
    const parts = hostname.replace('www.', '').split('.');
    if (parts.length > 0) {
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
    return null;
  } catch {
    return null;
  }
}

interface PostDealProps {
  onClose: () => void;
}

export default function MobilePostDeal({ onClose }: PostDealProps) {
  const navigate = useNavigate();
  const { triggerHaptic } = useHaptics();
  const { isAuthenticated } = useAuth();

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [fetchingImage, setFetchingImage] = useState(false);
  const urlTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  // Fetch image when URL changes (debounced)
  const fetchImageFromUrl = useCallback(async (dealUrl: string) => {
    if (!dealUrl.trim()) {
      setImageUrl('');
      return;
    }

    // Normalize URL - add https:// if missing
    let normalizedUrl = dealUrl.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    try {
      new URL(normalizedUrl); // Validate URL format
    } catch {
      return; // Invalid URL, skip fetching
    }

    setFetchingImage(true);
    try {
      const result = await apiClient.post<{ imageUrl?: string }>('/scraper/fetch-image', { url: normalizedUrl });
      if (result.imageUrl) {
        setImageUrl(result.imageUrl);
      }
    } catch (err) {
      console.error('Failed to fetch image:', err);
      // Silently fail - image is optional
    } finally {
      setFetchingImage(false);
    }
  }, []);

  // Debounce URL changes
  const handleUrlChange = useCallback((newUrl: string) => {
    setUrl(newUrl);

    // Clear previous timeout
    if (urlTimeoutRef.current) {
      clearTimeout(urlTimeoutRef.current);
    }

    // Set new timeout to fetch image after user stops typing
    urlTimeoutRef.current = setTimeout(() => {
      fetchImageFromUrl(newUrl);
    }, 800);
  }, [fetchImageFromUrl]);

  const loadCategories = async () => {
    try {
      const cats = await categoriesApi.getCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!price) {
      setError('Sale price is required');
      return;
    }
    if (!categoryId) {
      setError('Category is required');
      return;
    }

    triggerHaptic('medium');
    setLoading(true);
    setError('');

    try {
      // Parse prices as integers (backend requires int)
      const priceInt = Math.round(parseFloat(price));
      const originalPriceInt = originalPrice ? Math.round(parseFloat(originalPrice)) : undefined;

      // Normalize URL - add https:// if missing
      let normalizedUrl = url.trim();
      if (normalizedUrl && !normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'https://' + normalizedUrl;
      }

      // Build the deal data - only include merchant if we can extract it
      const dealData: any = {
        title: title.trim(),
        price: priceInt,
        merchant: extractMerchant(normalizedUrl) || 'Unknown',
        categoryId,
      };

      // Only add optional fields if they have values
      if (normalizedUrl) dealData.url = normalizedUrl;
      if (originalPriceInt) dealData.originalPrice = originalPriceInt;
      if (description.trim()) dealData.description = description.trim();
      if (imageUrl) dealData.imageUrl = imageUrl;

      const response = await dealsApi.createDeal(dealData);

      // Navigate to the new deal (response is the deal object directly)
      navigate(`/deal/${response.id}`);
      onClose();
    } catch (err: any) {
      console.error('Failed to create deal:', err);
      setError(err.message || 'Failed to post deal');
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = categories.find(c => c.id === categoryId);
  const isValid = title.trim() && price && categoryId;

  if (!isAuthenticated) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#1a1a1a',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
      }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
        <h2 style={{ color: 'white', margin: '16px 0 8px', fontSize: 20 }}>
          Sign in to post deals
        </h2>
        <p style={{ color: '#6b7280', textAlign: 'center', margin: 0 }}>
          Share amazing deals with the community
        </p>
        <button
          onClick={() => navigate('/login')}
          style={{
            marginTop: 24,
            padding: '12px 32px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: 8,
            color: 'white',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Sign In
        </button>
        <button
          onClick={onClose}
          style={{
            marginTop: 16,
            padding: '12px 32px',
            background: 'transparent',
            border: '1px solid #444',
            borderRadius: 8,
            color: '#9ca3af',
            fontSize: 15,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#1a1a1a',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        paddingTop: 'calc(16px + env(safe-area-inset-top))',
        borderBottom: '1px solid #2a2a2a',
      }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'white' }}>
          Post Deal
        </h1>
        <button
          onClick={onClose}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            border: 'none',
            background: '#444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'white',
            fontSize: 18,
            fontWeight: 400,
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: 16,
      }}>
        {/* Info Banner */}
        <div style={{
          display: 'flex',
          gap: 12,
          padding: 16,
          background: '#2a2a2a',
          borderRadius: 12,
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 24 }}>🛍️</div>
          <div>
            <p style={{ margin: 0, color: '#9ca3af', fontSize: 13, lineHeight: 1.5 }}>
              Got an amazing deal? Share it with the community and help everyone save big!
              Your post will appear in <strong style={{ color: '#667eea' }}>Hot Deals</strong>.
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: 12,
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: 8,
            marginBottom: 16,
            color: '#ef4444',
            fontSize: 14,
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Link */}
          <div>
            <label style={{ display: 'block', marginBottom: 8, color: '#9ca3af', fontSize: 13, fontWeight: 600 }}>
              Link
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="url"
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="Enter URL to deal"
                style={{
                  width: '100%',
                  height: 48,
                  padding: '0 16px',
                  paddingRight: fetchingImage ? 44 : 16,
                  border: '1px solid #333',
                  borderRadius: 8,
                  fontSize: 15,
                  outline: 'none',
                  background: '#2a2a2a',
                  color: 'white',
                }}
              />
              {fetchingImage && (
                <div style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 20,
                  height: 20,
                  border: '2px solid #333',
                  borderTopColor: '#667eea',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
              )}
            </div>
            {imageUrl && (
              <div style={{
                marginTop: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: 8,
                background: 'rgba(102, 126, 234, 0.1)',
                borderRadius: 8,
              }}>
                <img
                  src={imageUrl}
                  alt="Preview"
                  style={{
                    width: 40,
                    height: 40,
                    objectFit: 'contain',
                    borderRadius: 4,
                    background: 'white',
                  }}
                />
                <span style={{ fontSize: 12, color: '#667eea' }}>Image found!</span>
              </div>
            )}
            <style>{`@keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }`}</style>
          </div>

          {/* Title */}
          <div>
            <label style={{ display: 'block', marginBottom: 8, color: '#9ca3af', fontSize: 13, fontWeight: 600 }}>
              Title <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Deal or product name"
              style={{
                width: '100%',
                height: 48,
                padding: '0 16px',
                border: '1px solid #333',
                borderRadius: 8,
                fontSize: 15,
                outline: 'none',
                background: '#2a2a2a',
                color: 'white',
              }}
            />
          </div>

          {/* Prices */}
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 8, color: '#9ca3af', fontSize: 13, fontWeight: 600 }}>
                Sale Price <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#6b7280',
                  fontSize: 15,
                }}>
                  ₹
                </span>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0"
                  style={{
                    width: '100%',
                    height: 48,
                    padding: '0 16px 0 32px',
                    border: '1px solid #333',
                    borderRadius: 8,
                    fontSize: 15,
                    outline: 'none',
                    background: '#2a2a2a',
                    color: 'white',
                  }}
                />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 8, color: '#9ca3af', fontSize: 13, fontWeight: 600 }}>
                List Price
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#6b7280',
                  fontSize: 15,
                }}>
                  ₹
                </span>
                <input
                  type="number"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  placeholder="0"
                  style={{
                    width: '100%',
                    height: 48,
                    padding: '0 16px 0 32px',
                    border: '1px solid #333',
                    borderRadius: 8,
                    fontSize: 15,
                    outline: 'none',
                    background: '#2a2a2a',
                    color: 'white',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Category */}
          <div>
            <label style={{ display: 'block', marginBottom: 8, color: '#9ca3af', fontSize: 13, fontWeight: 600 }}>
              Category <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <button
              onClick={() => setShowCategoryPicker(true)}
              style={{
                width: '100%',
                height: 48,
                padding: '0 16px',
                border: '1px solid #333',
                borderRadius: 8,
                fontSize: 15,
                background: '#2a2a2a',
                color: selectedCategory ? 'white' : '#6b7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>{selectedCategory?.name || 'Add a category'}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', marginBottom: 8, color: '#9ca3af', fontSize: 13, fontWeight: 600 }}>
              Details <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Make it short and focus on the important stuff like product details, coupon codes, and expiration dates!"
              style={{
                width: '100%',
                minHeight: 120,
                padding: 16,
                border: '1px solid #333',
                borderRadius: 8,
                fontSize: 15,
                outline: 'none',
                background: '#2a2a2a',
                color: 'white',
                resize: 'vertical',
                lineHeight: 1.5,
              }}
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div style={{
        padding: 16,
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
        borderTop: '1px solid #2a2a2a',
      }}>
        <button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          style={{
            width: '100%',
            height: 52,
            borderRadius: 26,
            border: 'none',
            background: isValid
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : '#333',
            color: isValid ? 'white' : '#6b7280',
            fontSize: 16,
            fontWeight: 600,
            cursor: isValid ? 'pointer' : 'not-allowed',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Posting...' : 'Share Deal'}
        </button>
      </div>

      {/* Category Picker Modal */}
      {showCategoryPicker && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          zIndex: 300,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
        }}>
          <div style={{
            background: '#1a1a1a',
            borderRadius: '16px 16px 0 0',
            maxHeight: '70vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
              borderBottom: '1px solid #2a2a2a',
            }}>
              <h3 style={{ margin: 0, color: 'white', fontSize: 16, fontWeight: 600 }}>
                Select Category
              </h3>
              <button
                onClick={() => setShowCategoryPicker(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  border: 'none',
                  background: '#333',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div style={{ overflow: 'auto', padding: 16 }}>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    setCategoryId(category.id);
                    setShowCategoryPicker(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 0',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid #2a2a2a',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{
                    flex: 1,
                    fontSize: 15,
                    color: categoryId === category.id ? '#667eea' : 'white',
                    textAlign: 'left',
                    fontWeight: categoryId === category.id ? 600 : 400,
                  }}>
                    {category.name}
                  </span>
                  {categoryId === category.id && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#667eea" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
