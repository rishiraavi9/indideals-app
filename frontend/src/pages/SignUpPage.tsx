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
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 16,
      }}
    >
      <div
        style={{
          width: 420,
          maxWidth: '100%',
          borderRadius: 18,
          border: '1px solid rgba(255,255,255,0.16)',
          background:
            'linear-gradient(180deg, rgba(14, 46, 110, 0.45), rgba(2, 6, 16, 0.85))',
          boxShadow: '0 24px 70px rgba(0,0,0,0.6)',
          padding: 32,
          color: '#eaf2ff',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <h1
            onClick={() => navigate('/')}
            style={{
              margin: 0,
              fontSize: 32,
              letterSpacing: -0.5,
              cursor: 'pointer',
              marginBottom: 8,
            }}
          >
            🔥 <span style={{ fontWeight: 900 }}>IndiaDeals</span>
          </h1>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Sign Up</h2>
          <p style={{ margin: '8px 0 0 0', fontSize: 14, opacity: 0.7 }}>
            Create your account to start sharing deals!
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.85 }}>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(0,0,0,0.25)',
                color: '#eaf2ff',
                outline: 'none',
                fontSize: 15,
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.85 }}>Username</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="cooluser123"
              required
              minLength={3}
              maxLength={50}
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(0,0,0,0.25)',
                color: '#eaf2ff',
                outline: 'none',
                fontSize: 15,
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.85 }}>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(0,0,0,0.25)',
                color: '#eaf2ff',
                outline: 'none',
                fontSize: 15,
              }}
            />
          </label>

          {error && (
            <div
              style={{
                color: '#ff8080',
                fontWeight: 700,
                fontSize: 13,
                padding: '8px 12px',
                borderRadius: 8,
                background: 'rgba(255,0,0,0.1)',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.18)',
              background: loading
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(38, 118, 255, 0.9)',
              color: loading ? 'rgba(234,242,255,0.65)' : '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 900,
              fontSize: 16,
            }}
          >
            {loading ? 'Please wait...' : 'Sign Up'}
          </button>
        </form>

        <div style={{ marginTop: 20, marginBottom: 20, position: 'relative', textAlign: 'center' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '-80px',
                right: '-80px',
                height: 1,
                background: 'rgba(255,255,255,0.2)',
              }}
            />
            <span
              style={{
                position: 'relative',
                padding: '0 12px',
                background: 'linear-gradient(180deg, rgba(14, 46, 110, 0.45), rgba(2, 6, 16, 0.85))',
                fontSize: 12,
                opacity: 0.7,
              }}
            >
              or continue with
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={handleGoogleLogin}
            type="button"
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.18)',
              background: '#fff',
              color: '#333',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.593.102-1.17.282-1.709V4.958H.957C.347 6.173 0 7.548 0 9c0 1.452.348 2.827.957 4.042l3.007-2.335z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            Google
          </button>

          <button
            onClick={handleFacebookLogin}
            type="button"
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.18)',
              background: '#1877F2',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Facebook
          </button>
        </div>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 14 }}>
          Already have an account?{' '}
          <Link
            to="/login"
            style={{
              color: '#78aaff',
              fontWeight: 800,
              textDecoration: 'underline',
            }}
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
