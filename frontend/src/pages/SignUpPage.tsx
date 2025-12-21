import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SignUpPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signup(email, username, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:3001/api/auth/google';
  };

  const handleFacebookLogin = () => {
    window.location.href = 'http://localhost:3001/api/auth/facebook';
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#f5f7fa',
      }}
    >
      {/* Header */}
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
            justifyContent: 'center',
          }}
        >
          <h1
            onClick={() => navigate('/')}
            style={{
              margin: 0,
              fontSize: 28,
              letterSpacing: -0.5,
              color: '#1a1a1a',
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
        </div>
      </div>

      {/* Hero Section */}
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '60px 24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', color: 'white' }}>
          <h1 style={{ fontSize: 42, fontWeight: 800, margin: '0 0 16px', lineHeight: 1.2, letterSpacing: '-0.5px' }}>
            Join DesiDealsAI
          </h1>
          <p style={{ fontSize: 18, margin: 0, opacity: 0.95, lineHeight: 1.6 }}>
            Create your account to start sharing deals and saving money
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '40px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            width: 480,
            maxWidth: '100%',
            background: '#ffffff',
            borderRadius: 16,
            padding: 40,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        >
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 20 }}>
            {/* Email */}
            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
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
                  e.currentTarget.style.borderColor = '#667eea';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102,126,234,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </label>

            {/* Username */}
            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>Username</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                required
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
                  e.currentTarget.style.borderColor = '#667eea';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102,126,234,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </label>

            {/* Password */}
            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                required
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
                  e.currentTarget.style.borderColor = '#667eea';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102,126,234,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </label>

            {/* Error Message */}
            {error && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  background: '#fee2e2',
                  border: '1px solid #ef4444',
                  color: '#991b1b',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {error}
              </div>
            )}

            {/* Sign Up Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 10,
                border: 'none',
                background: loading
                  ? '#e5e7eb'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: loading ? '#9ca3af' : '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: 16,
                boxShadow: loading ? 'none' : '0 4px 14px rgba(102, 126, 234, 0.4)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = loading ? 'none' : '0 4px 14px rgba(102, 126, 234, 0.4)';
              }}
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
              <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>OR</span>
              <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
            </div>

            {/* Social Login Buttons */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                background: '#ffffff',
                color: '#374151',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 15,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
              }}
            >
              <span style={{ fontSize: 20 }}>🔍</span>
              Continue with Google
            </button>

            <button
              type="button"
              onClick={handleFacebookLogin}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                background: '#ffffff',
                color: '#374151',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 15,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
              }}
            >
              <span style={{ fontSize: 20 }}>📘</span>
              Continue with Facebook
            </button>

            {/* Login Link */}
            <div style={{ textAlign: 'center', fontSize: 14, color: '#6b7280', marginTop: 8 }}>
              Already have an account?{' '}
              <Link
                to="/login"
                style={{
                  color: '#667eea',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                Login
              </Link>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#1a1a1a', color: '#9ca3af', padding: '40px 24px' }}>
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
