import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Hook to detect mobile viewport
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
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

  // Mobile Login Page
  if (isMobile) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#1a1a1a',
          display: 'flex',
          flexDirection: 'column',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Header with back button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '16px',
            borderBottom: '1px solid #2a2a2a',
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              padding: 8,
              marginRight: 8,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'white' }}>
            Login
          </h1>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '32px 20px', overflowY: 'auto' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: 'white' }}>DesiDealsAI</span>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: '#9ca3af' }}>
              AI-Powered Deal Discovery
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#9ca3af', marginBottom: 8 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: 10,
                  border: '1px solid #333',
                  background: '#2a2a2a',
                  color: 'white',
                  outline: 'none',
                  fontSize: 16,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#9ca3af', marginBottom: 8 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: 10,
                  border: '1px solid #333',
                  background: '#2a2a2a',
                  color: 'white',
                  outline: 'none',
                  fontSize: 16,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid #ef4444',
                  color: '#ef4444',
                  fontWeight: 500,
                  fontSize: 14,
                }}
              >
                {error}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: 12,
                border: 'none',
                background: loading ? '#333' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: loading ? '#6b7280' : 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: 16,
                marginTop: 8,
              }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#333' }} />
              <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>OR</span>
              <div style={{ flex: 1, height: 1, background: '#333' }} />
            </div>

            {/* Social Login Buttons */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 12,
                border: '1px solid #333',
                background: '#2a2a2a',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 15,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <button
              type="button"
              onClick={handleFacebookLogin}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 12,
                border: '1px solid #333',
                background: '#2a2a2a',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 15,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Continue with Facebook
            </button>

            {/* Sign Up Link */}
            <div style={{ textAlign: 'center', fontSize: 14, color: '#9ca3af', marginTop: 16 }}>
              Don't have an account?{' '}
              <Link
                to="/signup"
                style={{
                  color: '#667eea',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                Sign Up
              </Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Desktop Login Page (original design)
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
            <span style={{ fontWeight: 900 }}>DesiDealsAI</span>
          </h1>
        </div>
      </div>

      {/* Hero Section */}
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '60px 24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', color: 'white' }}>
          <h1 style={{ fontSize: 42, fontWeight: 800, margin: '0 0 16px', lineHeight: 1.2, letterSpacing: '-0.5px' }}>
            Welcome Back!
          </h1>
          <p style={{ fontSize: 18, margin: 0, opacity: 0.95, lineHeight: 1.6 }}>
            Login to access exclusive deals and track your savings
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

            {/* Password */}
            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
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

            {/* Login Button */}
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
              {loading ? 'Logging in...' : 'Login'}
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
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Continue with Facebook
            </button>

            {/* Sign Up Link */}
            <div style={{ textAlign: 'center', fontSize: 14, color: '#6b7280', marginTop: 8 }}>
              Don't have an account?{' '}
              <Link
                to="/signup"
                style={{
                  color: '#667eea',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                Sign Up
              </Link>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#1a1a1a', color: '#9ca3af', padding: '40px 24px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 12, color: '#ffffff' }}>
            DesiDealsAI
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
