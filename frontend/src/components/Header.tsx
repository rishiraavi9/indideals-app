import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { searchApi } from '../api/search';
import { categoriesApi } from '../api/categories';
import type { Category } from '../types';

interface HeaderProps {
  onPostDealClick?: () => void;
}

export default function Header({
  onPostDealClick,
}: HeaderProps) {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<Array<{title: string; merchant: string; categoryName: string}>>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Categories dropdown state
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoriesDropdown, setShowCategoriesDropdown] = useState(false);
  const categoriesRef = useRef<HTMLDivElement>(null);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await categoriesApi.getCategories();
        setCategories(cats);
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };
    loadCategories();
  }, []);

  // Autocomplete functionality
  useEffect(() => {
    const fetchAutocomplete = async () => {
      if (searchQuery.trim().length >= 2) {
        try {
          const suggestions = await searchApi.autocomplete(searchQuery, 8);
          setAutocompleteSuggestions(suggestions);
          setShowAutocomplete(true);
        } catch (error) {
          console.error('Failed to fetch autocomplete:', error);
          setAutocompleteSuggestions([]);
        }
      } else {
        setAutocompleteSuggestions([]);
        setShowAutocomplete(false);
      }
    };

    const debounceTimer = setTimeout(fetchAutocomplete, 200);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowAutocomplete(false);
      }
      if (categoriesRef.current && !categoriesRef.current.contains(event.target as Node)) {
        setShowCategoriesDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/?q=${encodeURIComponent(searchQuery)}`);
      setShowAutocomplete(false);
    }
  };

  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <div style={{
      background: '#ffffff',
      borderBottom: '1px solid #e5e7eb',
      padding: '16px 24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}>
        {/* Logo */}
        <h1
          onClick={handleLogoClick}
          style={{
            margin: 0,
            fontSize: 28,
            letterSpacing: -0.5,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            transition: 'opacity 0.2s',
            fontFamily: 'Poppins',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.7';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          🤖 <span style={{ fontWeight: 900 }}>IndiaDeals</span>
        </h1>

        {/* Categories Dropdown */}
        <div style={{ position: 'relative' }} ref={categoriesRef}>
          <button
            onClick={() => setShowCategoriesDropdown(!showCategoriesDropdown)}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              background: showCategoriesDropdown ? '#f3f4f6' : '#ffffff',
              color: '#374151',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!showCategoriesDropdown) e.currentTarget.style.background = '#f9fafb';
            }}
            onMouseLeave={(e) => {
              if (!showCategoriesDropdown) e.currentTarget.style.background = '#ffffff';
            }}
          >
            <span>Categories</span>
            <span style={{ fontSize: 12, transition: 'transform 0.2s', transform: showCategoriesDropdown ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
          </button>

          {/* Dropdown Menu */}
          {showCategoriesDropdown && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                background: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 100,
                minWidth: 250,
                maxHeight: '70vh',
                overflowY: 'auto',
              }}
            >
              {/* Popular Deals Option */}
              <div
                onClick={() => {
                  navigate('/deals');
                  setShowCategoriesDropdown(false);
                }}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #e5e7eb',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#2563eb',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#eff6ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff';
                }}
              >
                🔥 Popular Deals
              </div>

              {/* Category List */}
              {categories.map((category) => (
                <div
                  key={category.id}
                  onClick={() => {
                    navigate(`/deals/${category.slug}`);
                    setShowCategoriesDropdown(false);
                  }}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f3f4f6',
                    fontSize: 14,
                    color: '#374151',
                    transition: 'background 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                  }}
                >
                  <span style={{ fontSize: 18 }}>{category.icon}</span>
                  <span style={{ fontWeight: 500 }}>{category.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Search bar */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }} ref={searchInputRef}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                handleSearch();
              } else if (e.key === 'Escape') {
                setShowAutocomplete(false);
              }
            }}
            onFocus={() => {
              if (searchQuery.trim().length >= 2 && autocompleteSuggestions.length > 0) {
                setShowAutocomplete(true);
              }
            }}
            placeholder="Search for deals, products, or merchants..."
            style={{
              width: '100%',
              padding: '12px 110px 12px 16px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              background: '#ffffff',
              color: '#1a1a1a',
              outline: 'none',
              fontSize: 15,
              boxSizing: 'border-box',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          />
          <button
            onClick={handleSearch}
            style={{
              position: 'absolute',
              right: 6,
              top: '50%',
              transform: 'translateY(-50%)',
              padding: '8px 18px',
              borderRadius: 6,
              border: 'none',
              background: searchQuery.trim() ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#9ca3af',
              color: 'white',
              cursor: searchQuery.trim() ? 'pointer' : 'not-allowed',
              fontSize: 14,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            disabled={!searchQuery.trim()}
          >
            <span>🔍</span>
            <span>Search</span>
          </button>

          {/* Autocomplete Suggestions */}
          {showAutocomplete && autocompleteSuggestions.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: 4,
                background: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 100,
                maxHeight: '400px',
                overflowY: 'auto',
              }}
            >
              {autocompleteSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => {
                    setSearchQuery(suggestion.title);
                    setShowAutocomplete(false);
                    navigate(`/?q=${encodeURIComponent(suggestion.title)}`);
                  }}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: index < autocompleteSuggestions.length - 1 ? '1px solid #f3f4f6' : 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                  }}
                >
                  <div style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#1a1a1a',
                    marginBottom: 4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    🔍 {suggestion.title}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: '#6b7280',
                    display: 'flex',
                    gap: 8,
                  }}>
                    {suggestion.merchant && (
                      <span>at <strong>{suggestion.merchant}</strong></span>
                    )}
                    {suggestion.categoryName && (
                      <span>• {suggestion.categoryName}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User actions */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {isAuthenticated && user ? (
            <>
              <div
                onClick={() => navigate('/profile')}
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

          <button
            onClick={onPostDealClick}
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
              boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
            }}
          >
            + Share a Deal
          </button>
        </div>
      </div>
    </div>
  );
}
