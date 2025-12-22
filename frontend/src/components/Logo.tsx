/**
 * DesiDealsAI Logo Component
 * Based on Tech Hex branding kit
 */

interface LogoProps {
  variant?: 'full' | 'icon' | 'horizontal';
  darkMode?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export default function Logo({
  variant = 'horizontal',
  darkMode = false,
  size = 'md',
  onClick
}: LogoProps) {
  // Size mappings
  const sizes = {
    sm: { width: 140, height: 40 },
    md: { width: 200, height: 50 },
    lg: { width: 240, height: 70 },
  };

  const { width, height } = sizes[size];

  // Colors based on brand kit
  const textColor = darkMode ? '#ffffff' : '#1a1a1a';

  if (variant === 'icon') {
    return (
      <svg
        width={height}
        height={height}
        viewBox="0 0 80 80"
        onClick={onClick}
        style={{ cursor: onClick ? 'pointer' : 'default' }}
      >
        <defs>
          <linearGradient id="iconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#667eea' }} />
            <stop offset="100%" style={{ stopColor: '#764ba2' }} />
          </linearGradient>
        </defs>
        <rect width="80" height="80" rx="18" fill="url(#iconGrad)" />
        <polygon
          points="40,12 62,25 62,51 40,64 18,51 18,25"
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="2"
        />
        <text
          x="26"
          y="48"
          fontFamily="Poppins, sans-serif"
          fontSize="32"
          fontWeight="800"
          fill="#ffffff"
        >
          D
        </text>
      </svg>
    );
  }

  // Full or horizontal logo
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 200 50"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <defs>
        <linearGradient id="hexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#667eea' }} />
          <stop offset="100%" style={{ stopColor: '#764ba2' }} />
        </linearGradient>
        <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#f093fb' }} />
          <stop offset="100%" style={{ stopColor: '#f5576c' }} />
        </linearGradient>
      </defs>

      {/* Hexagon icon */}
      <polygon
        points="25,3 45,14 45,36 25,47 5,36 5,14"
        fill="none"
        stroke="url(#hexGrad)"
        strokeWidth="2.5"
      />

      {/* D letter */}
      <text
        x="15"
        y="33"
        fontFamily="Poppins, sans-serif"
        fontSize="20"
        fontWeight="800"
        fill="url(#accentGrad)"
      >
        D
      </text>

      {/* Wordmark */}
      <text
        x="55"
        y="33"
        fontFamily="Poppins, sans-serif"
        fontSize="22"
        fontWeight="700"
        fill={textColor}
      >
        DesiDeals
      </text>
      <text
        x="156"
        y="33"
        fontFamily="Poppins, sans-serif"
        fontSize="22"
        fontWeight="700"
        fill="url(#hexGrad)"
      >
        AI
      </text>
    </svg>
  );
}
