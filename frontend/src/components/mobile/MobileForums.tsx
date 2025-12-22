export default function MobileForums() {

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a1a1a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 100,
    }}>
      {/* Construction Icon */}
      <div style={{
        width: 120,
        height: 120,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
        boxShadow: '0 20px 40px rgba(102, 126, 234, 0.3)',
      }}>
        <span style={{ fontSize: 56 }}>🚧</span>
      </div>

      {/* Title */}
      <h1 style={{
        margin: 0,
        fontSize: 28,
        fontWeight: 700,
        color: 'white',
        textAlign: 'center',
        marginBottom: 12,
      }}>
        Forums Coming Soon
      </h1>

      {/* Subtitle */}
      <p style={{
        margin: 0,
        fontSize: 16,
        color: '#9ca3af',
        textAlign: 'center',
        lineHeight: 1.6,
        maxWidth: 300,
        marginBottom: 32,
      }}>
        We're building an amazing community forum where you can discuss deals, share tips, and connect with fellow deal hunters.
      </p>

      {/* Features Preview */}
      <div style={{
        width: '100%',
        maxWidth: 320,
        background: '#2a2a2a',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
      }}>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#667eea',
          marginBottom: 16,
        }}>
          What's Coming:
        </div>

        {[
          { icon: '💬', text: 'Deal Discussions & Reviews' },
          { icon: '🔥', text: 'Hot Deals Megathreads' },
          { icon: '🏆', text: 'Community Rewards' },
          { icon: '📢', text: 'Price Drop Alerts' },
        ].map((feature, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 0',
              borderBottom: index < 3 ? '1px solid #3a3a3a' : 'none',
            }}
          >
            <span style={{ fontSize: 20 }}>{feature.icon}</span>
            <span style={{ fontSize: 14, color: '#d1d5db' }}>{feature.text}</span>
          </div>
        ))}
      </div>

      {/* Progress Indicator */}
      <div style={{
        width: '100%',
        maxWidth: 320,
        marginBottom: 16,
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>Development Progress</span>
          <span style={{ fontSize: 12, color: '#667eea', fontWeight: 600 }}>65%</span>
        </div>
        <div style={{
          width: '100%',
          height: 6,
          background: '#3a3a3a',
          borderRadius: 3,
          overflow: 'hidden',
        }}>
          <div style={{
            width: '65%',
            height: '100%',
            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 3,
          }} />
        </div>
      </div>

      {/* Stay Tuned Message */}
      <p style={{
        margin: 0,
        fontSize: 13,
        color: '#6b7280',
        textAlign: 'center',
      }}>
        Stay tuned for updates!
      </p>
    </div>
  );
}
