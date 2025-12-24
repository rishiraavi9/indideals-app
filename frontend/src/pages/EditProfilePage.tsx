import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../api/profile';
import Layout from '../components/Layout';

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user) {
      setUsername(user.username);
    }
  }, [isAuthenticated, navigate, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await updateProfile({ username });
      setSuccess(true);
      // Refresh user data in context
      if (refreshUser) {
        await refreshUser();
      }
      setTimeout(() => navigate('/profile'), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

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
              {t('profile.editProfile')}
            </h1>
          </div>
        </div>

        {/* Form */}
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>
          <form onSubmit={handleSubmit}>
            {/* Avatar Preview */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '4px solid #3a3a3a',
                }}
              >
                <span style={{ fontSize: 48, fontWeight: 700, color: 'white' }}>
                  {username.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>

            {/* Email (read-only) */}
            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: 'block',
                  color: '#9ca3af',
                  fontSize: 14,
                  marginBottom: 8,
                }}
              >
                {t('auth.email')}
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: 12,
                  border: '1px solid #3a3a3a',
                  background: '#2a2a2a',
                  color: '#6b7280',
                  fontSize: 16,
                  boxSizing: 'border-box',
                }}
              />
              <p style={{ margin: '8px 0 0', fontSize: 13, color: '#6b7280' }}>
                {t('profile.emailCannotBeChanged')}
              </p>
            </div>

            {/* Username */}
            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: 'block',
                  color: '#9ca3af',
                  fontSize: 14,
                  marginBottom: 8,
                }}
              >
                {t('auth.username')}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('auth.usernamePlaceholder')}
                minLength={3}
                maxLength={50}
                pattern="^[a-zA-Z0-9_-]+$"
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: 12,
                  border: '1px solid #3a3a3a',
                  background: '#2a2a2a',
                  color: 'white',
                  fontSize: 16,
                  boxSizing: 'border-box',
                }}
              />
              <p style={{ margin: '8px 0 0', fontSize: 13, color: '#6b7280' }}>
                {t('profile.usernameHint')}
              </p>
            </div>

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
                }}
              >
                {t('profile.profileUpdated')}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || username === user.username}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: 12,
                border: 'none',
                background: loading || username === user.username
                  ? '#4a4a4a'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontSize: 16,
                fontWeight: 600,
                cursor: loading || username === user.username ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? t('common.saving') : t('common.saveChanges')}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
