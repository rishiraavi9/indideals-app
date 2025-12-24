import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { changePassword } from '../api/profile';
import Layout from '../components/Layout';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 8) errors.push(t('auth.passwordMinLength'));
    if (!/[A-Z]/.test(password)) errors.push(t('auth.passwordUppercase'));
    if (!/[a-z]/.test(password)) errors.push(t('auth.passwordLowercase'));
    if (!/[0-9]/.test(password)) errors.push(t('auth.passwordNumber'));
    if (!/[^A-Za-z0-9]/.test(password)) errors.push(t('auth.passwordSpecial'));
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordsDoNotMatch'));
      return;
    }

    // Validate new password requirements
    const validationErrors = validatePassword(newPassword);
    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '));
      return;
    }

    setLoading(true);
    setSuccess(false);

    try {
      await changePassword({ currentPassword, newPassword });
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => navigate('/profile'), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = (): { label: string; color: string; width: string } => {
    const errors = validatePassword(newPassword);
    if (newPassword.length === 0) return { label: '', color: '#4a4a4a', width: '0%' };
    if (errors.length >= 4) return { label: t('auth.passwordWeak'), color: '#ef4444', width: '25%' };
    if (errors.length >= 2) return { label: t('auth.passwordFair'), color: '#f59e0b', width: '50%' };
    if (errors.length >= 1) return { label: t('auth.passwordGood'), color: '#3b82f6', width: '75%' };
    return { label: t('auth.passwordStrong'), color: '#10b981', width: '100%' };
  };

  const strength = passwordStrength();

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
              {t('profile.changePassword')}
            </h1>
          </div>
        </div>

        {/* Form */}
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>
          <form onSubmit={handleSubmit}>
            {/* Current Password */}
            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: 'block',
                  color: '#9ca3af',
                  fontSize: 14,
                  marginBottom: 8,
                }}
              >
                {t('auth.currentPassword')}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '14px 48px 14px 16px',
                    borderRadius: 12,
                    border: '1px solid #3a3a3a',
                    background: '#2a2a2a',
                    color: 'white',
                    fontSize: 16,
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#6b7280',
                    cursor: 'pointer',
                    padding: 4,
                  }}
                >
                  {showCurrentPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: 'block',
                  color: '#9ca3af',
                  fontSize: 14,
                  marginBottom: 8,
                }}
              >
                {t('auth.newPassword')}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '14px 48px 14px 16px',
                    borderRadius: 12,
                    border: '1px solid #3a3a3a',
                    background: '#2a2a2a',
                    color: 'white',
                    fontSize: 16,
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#6b7280',
                    cursor: 'pointer',
                    padding: 4,
                  }}
                >
                  {showNewPassword ? '🙈' : '👁️'}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {newPassword.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div
                    style={{
                      height: 4,
                      background: '#3a3a3a',
                      borderRadius: 2,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: strength.width,
                        background: strength.color,
                        transition: 'all 0.3s ease',
                      }}
                    />
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: strength.color }}>
                    {strength.label}
                  </p>
                </div>
              )}

              <p style={{ margin: '8px 0 0', fontSize: 13, color: '#6b7280' }}>
                {t('auth.passwordRequirements')}
              </p>
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: 'block',
                  color: '#9ca3af',
                  fontSize: 14,
                  marginBottom: 8,
                }}
              >
                {t('auth.confirmNewPassword')}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: 12,
                  border: `1px solid ${
                    confirmPassword.length > 0 && confirmPassword !== newPassword
                      ? '#ef4444'
                      : '#3a3a3a'
                  }`,
                  background: '#2a2a2a',
                  color: 'white',
                  fontSize: 16,
                  boxSizing: 'border-box',
                }}
              />
              {confirmPassword.length > 0 && confirmPassword !== newPassword && (
                <p style={{ margin: '8px 0 0', fontSize: 13, color: '#ef4444' }}>
                  {t('auth.passwordsDoNotMatch')}
                </p>
              )}
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
                {t('profile.passwordChanged')}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !currentPassword || !newPassword || !confirmPassword}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: 12,
                border: 'none',
                background:
                  loading || !currentPassword || !newPassword || !confirmPassword
                    ? '#4a4a4a'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontSize: 16,
                fontWeight: 600,
                cursor:
                  loading || !currentPassword || !newPassword || !confirmPassword
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              {loading ? t('common.saving') : t('profile.updatePassword')}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
