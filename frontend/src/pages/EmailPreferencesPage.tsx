import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getEmailPreferences, updateEmailPreferences, type EmailPreferences } from '../api/profile';
import Layout from '../components/Layout';

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

function Toggle({ enabled, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      style={{
        width: 52,
        height: 28,
        borderRadius: 14,
        border: 'none',
        background: enabled ? '#667eea' : '#4a4a4a',
        cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative',
        transition: 'background 0.2s',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: 'white',
          position: 'absolute',
          top: 3,
          left: enabled ? 27 : 3,
          transition: 'left 0.2s',
        }}
      />
    </button>
  );
}

interface PreferenceItemProps {
  icon: string;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

function PreferenceItem({ icon, title, description, enabled, onChange, disabled }: PreferenceItemProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '20px 0',
        borderBottom: '1px solid #3a3a3a',
      }}
    >
      <span style={{ fontSize: 24 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, color: 'white', fontWeight: 500 }}>{title}</div>
        <div style={{ fontSize: 14, color: '#9ca3af', marginTop: 4 }}>{description}</div>
      </div>
      <Toggle enabled={enabled} onChange={onChange} disabled={disabled} />
    </div>
  );
}

export default function EmailPreferencesPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [preferences, setPreferences] = useState<EmailPreferences>({
    dealAlerts: true,
    priceDrops: true,
    weeklyDigest: false,
    promotions: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadPreferences();
  }, [isAuthenticated, navigate]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const response = await getEmailPreferences();
      setPreferences(response.preferences);
    } catch (err: any) {
      setError(err.message || 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = async (key: keyof EmailPreferences, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    setSuccess(false);
    setError(null);

    try {
      setSaving(true);
      await updateEmailPreferences({ [key]: value });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: any) {
      // Revert on error
      setPreferences(preferences);
      setError(err.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div style={{ background: '#1a1a1a', minHeight: '100vh' }}>
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '24px',
            color: 'white',
          }}
        >
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <button
              onClick={() => navigate('/profile')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                padding: 0,
                marginBottom: 16,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              {t('common.back')}
            </button>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
              {t('profile.emailPreferences')}
            </h1>
            <p style={{ margin: '8px 0 0', fontSize: 14, opacity: 0.9 }}>
              {t('profile.emailPreferencesDescription')}
            </p>
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
              {t('common.loading')}
            </div>
          ) : (
            <>
              {/* Success Message */}
              {success && (
                <div
                  style={{
                    padding: '12px 16px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid #10b981',
                    borderRadius: 12,
                    color: '#10b981',
                    fontSize: 14,
                    marginBottom: 24,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span>✓</span> {t('profile.preferencesSaved')}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div
                  style={{
                    padding: '12px 16px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid #ef4444',
                    borderRadius: 12,
                    color: '#ef4444',
                    fontSize: 14,
                    marginBottom: 24,
                  }}
                >
                  {error}
                </div>
              )}

              {/* Preferences Card */}
              <div
                style={{
                  background: '#2a2a2a',
                  borderRadius: 16,
                  padding: '0 20px',
                }}
              >
                <PreferenceItem
                  icon="🔔"
                  title={t('profile.dealAlerts')}
                  description={t('profile.dealAlertsDescription')}
                  enabled={preferences.dealAlerts}
                  onChange={(value) => handleChange('dealAlerts', value)}
                  disabled={saving}
                />
                <PreferenceItem
                  icon="📉"
                  title={t('profile.priceDrops')}
                  description={t('profile.priceDropsDescription')}
                  enabled={preferences.priceDrops}
                  onChange={(value) => handleChange('priceDrops', value)}
                  disabled={saving}
                />
                <PreferenceItem
                  icon="📬"
                  title={t('profile.weeklyDigest')}
                  description={t('profile.weeklyDigestDescription')}
                  enabled={preferences.weeklyDigest}
                  onChange={(value) => handleChange('weeklyDigest', value)}
                  disabled={saving}
                />
                <div style={{ borderBottom: 'none' }}>
                  <PreferenceItem
                    icon="🎁"
                    title={t('profile.promotions')}
                    description={t('profile.promotionsDescription')}
                    enabled={preferences.promotions}
                    onChange={(value) => handleChange('promotions', value)}
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Info Text */}
              <p
                style={{
                  margin: '24px 0 0',
                  fontSize: 13,
                  color: '#6b7280',
                  textAlign: 'center',
                }}
              >
                {t('profile.emailPreferencesNote')}
              </p>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
