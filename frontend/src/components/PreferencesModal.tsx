import { useState, useEffect } from 'react';
import type { Category } from '../types';
import {
  getLocalPreferences,
  saveLocalPreferences,
  resetPreferences,
  type UserPreferences,
} from '../utils/userPreferences';

interface PreferencesModalProps {
  onClose: () => void;
  categories: Category[];
}

export default function PreferencesModal({
  onClose,
  categories,
}: PreferencesModalProps) {
  const [preferences, setPreferences] = useState<UserPreferences>(getLocalPreferences());

  useEffect(() => {
    // Load preferences on mount
    setPreferences(getLocalPreferences());
  }, []);

  const handleCategoryPreference = (
    categoryId: string,
    preference: 'like' | 'neutral' | 'dislike'
  ) => {
    setPreferences((prev) => ({
      ...prev,
      categoryPreferences: {
        ...prev.categoryPreferences,
        [categoryId]: preference,
      },
    }));
  };

  const handleDisplayPreference = (
    key: keyof UserPreferences['displayPreferences'],
    value: boolean
  ) => {
    setPreferences((prev) => ({
      ...prev,
      displayPreferences: {
        ...prev.displayPreferences,
        [key]: value,
      },
    }));
  };

  const handleSave = () => {
    saveLocalPreferences(preferences);
    onClose();
    // Reload page to apply preferences
    window.location.reload();
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all preferences to default?')) {
      resetPreferences();
      setPreferences(getLocalPreferences());
    }
  };

  const getCategoryPreference = (categoryId: string): 'like' | 'neutral' | 'dislike' => {
    return preferences.categoryPreferences[categoryId] || 'neutral';
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: 16,
          maxWidth: 900,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 32px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1a1a1a' }}>
            Frontpage Deals
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 28,
              cursor: 'pointer',
              color: '#6b7280',
              padding: 0,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '32px',
          }}
        >
          <div style={{ display: 'flex', gap: 40 }}>
            {/* Left Column - Category Preferences */}
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>
                Category Preferences
              </h3>
              <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                Customize your Frontpage by selecting categories you like or dislike. Liked categories will be prioritized.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {categories.map((category) => {
                  const pref = getCategoryPreference(category.id);
                  return (
                    <div
                      key={category.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: '#f9fafb',
                        borderRadius: 8,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 20 }}>{category.icon}</span>
                        <span style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>
                          {category.name}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        {/* Dislike Button */}
                        <button
                          onClick={() => handleCategoryPreference(category.id, 'dislike')}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            border: pref === 'dislike' ? '2px solid #ef4444' : '1px solid #d1d5db',
                            background: pref === 'dislike' ? '#fef2f2' : '#ffffff',
                            color: pref === 'dislike' ? '#ef4444' : '#6b7280',
                            cursor: 'pointer',
                            fontSize: 18,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                          }}
                          title="Dislike"
                        >
                          👎
                        </button>

                        {/* Neutral Button */}
                        <button
                          onClick={() => handleCategoryPreference(category.id, 'neutral')}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            border: pref === 'neutral' ? '2px solid #6b7280' : '1px solid #d1d5db',
                            background: pref === 'neutral' ? '#f3f4f6' : '#ffffff',
                            color: pref === 'neutral' ? '#1a1a1a' : '#9ca3af',
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                          }}
                          title="Neutral"
                        >
                          −
                        </button>

                        {/* Like Button */}
                        <button
                          onClick={() => handleCategoryPreference(category.id, 'like')}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            border: pref === 'like' ? '2px solid #10b981' : '1px solid #d1d5db',
                            background: pref === 'like' ? '#f0fdf4' : '#ffffff',
                            color: pref === 'like' ? '#10b981' : '#6b7280',
                            cursor: 'pointer',
                            fontSize: 18,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                          }}
                          title="Like"
                        >
                          👍
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column - Display Preferences */}
            <div style={{ flex: '0 0 300px' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>
                Display Preferences
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Show Just For You Deals */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    cursor: 'pointer',
                    padding: 12,
                    background: '#f9fafb',
                    borderRadius: 8,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={preferences.displayPreferences.showJustForYou}
                    onChange={(e) =>
                      handleDisplayPreference('showJustForYou', e.target.checked)
                    }
                    style={{
                      width: 18,
                      height: 18,
                      cursor: 'pointer',
                      marginTop: 2,
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>
                      Show Just For You Deals
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
                      Display personalized deals at the top
                    </div>
                  </div>
                </label>

                {/* Hide Expired Deals */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    cursor: 'pointer',
                    padding: 12,
                    background: '#f9fafb',
                    borderRadius: 8,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={preferences.displayPreferences.hideExpired}
                    onChange={(e) =>
                      handleDisplayPreference('hideExpired', e.target.checked)
                    }
                    style={{
                      width: 18,
                      height: 18,
                      cursor: 'pointer',
                      marginTop: 2,
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>
                      Hide Expired Deals
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
                      Collapse all expired deals automatically
                    </div>
                  </div>
                </label>

                {/* Show Fire Deals */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    cursor: 'pointer',
                    padding: 12,
                    background: '#f9fafb',
                    borderRadius: 8,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={preferences.displayPreferences.showFireDeals}
                    onChange={(e) =>
                      handleDisplayPreference('showFireDeals', e.target.checked)
                    }
                    style={{
                      width: 18,
                      height: 18,
                      cursor: 'pointer',
                      marginTop: 2,
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>
                      Show Fire Deals
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
                      Always display fire deals, ignoring my category settings
                    </div>
                  </div>
                </label>
              </div>

              {/* Info Box */}
              <div
                style={{
                  marginTop: 24,
                  padding: 16,
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 8,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1e40af', marginBottom: 8 }}>
                  💡 How it works
                </div>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
                  <li>Liked categories will be shown first</li>
                  <li>Disliked categories will be hidden</li>
                  <li>Neutral categories will appear normally</li>
                  <li>Settings sync across devices when logged in</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '20px 32px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f9fafb',
          }}
        >
          <button
            onClick={handleReset}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              background: '#ffffff',
              color: '#6b7280',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Reset
          </button>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                background: '#ffffff',
                color: '#374151',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#ffffff',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14,
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
