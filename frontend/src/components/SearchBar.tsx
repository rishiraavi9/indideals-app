import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchApi } from '../api/search';

interface SearchBarProps {
  // For HomePage: updates local state instead of navigating
  onSearch?: (query: string) => void;
  // Initial value (for controlled input)
  value?: string;
  // Called when input changes (for controlled input)
  onChange?: (value: string) => void;
}

export default function SearchBar({ onSearch, value, onChange }: SearchBarProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(value || '');
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<Array<{title: string; merchant: string; categoryName: string}>>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const searchInputRef = useRef<HTMLDivElement>(null);

  // Sync with controlled value
  useEffect(() => {
    if (value !== undefined) {
      setSearchQuery(value);
    }
  }, [value]);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (newValue: string) => {
    setSearchQuery(newValue);
    onChange?.(newValue);
  };

  const handleSearch = (query?: string) => {
    const q = query || searchQuery;
    if (!q.trim()) return;

    setShowAutocomplete(false);

    if (onSearch) {
      // HomePage mode: update local state
      onSearch(q);
    } else {
      // Other pages: navigate to home with search query
      navigate(`/?q=${encodeURIComponent(q)}`);
    }
  };

  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 200 }} ref={searchInputRef}>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => handleInputChange(e.target.value)}
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
        onClick={() => handleSearch()}
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
                handleInputChange(suggestion.title);
                handleSearch(suggestion.title);
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
  );
}
