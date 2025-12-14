interface MobileBottomNavProps {
  activeItem: string;
  onNavigate: (item: string) => void;
}

export default function MobileBottomNav({
  activeItem,
  onNavigate,
}: MobileBottomNavProps) {
  const navItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'search', label: 'Search', icon: '🔍' },
    { id: 'post', label: 'Post', icon: '+' },
    { id: 'forums', label: 'Forums', icon: '💬' },
    { id: 'alerts', label: 'Alerts', icon: '🔔' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#1a1a1a',
        borderTop: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '8px 0 max(8px, env(safe-area-inset-bottom))',
        zIndex: 100,
        boxShadow: '0 -2px 8px rgba(0,0,0,0.15)',
      }}
    >
      {navItems.map((item) => {
        const isActive = activeItem === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              background: 'transparent',
              border: 'none',
              color: isActive ? '#fff' : '#888',
              cursor: 'pointer',
              padding: '8px 0',
            }}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 500 }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
