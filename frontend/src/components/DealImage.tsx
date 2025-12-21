import { useState, useEffect } from 'react';
import { getImageStrategy } from '../config/features';

const PLACEHOLDER_URL = '/placeholder-deal.svg';

interface DealImageProps {
  src: string | null | undefined;
  alt: string;
  dealId?: string;
  merchantUrl?: string | null;
  style?: React.CSSProperties;
  className?: string;
  showSkeleton?: boolean;
}

/**
 * Smart image component that handles failed images based on configured strategy
 */
export default function DealImage({
  src,
  alt,
  dealId,
  merchantUrl,
  style,
  className,
  showSkeleton = true,
}: DealImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(src || PLACEHOLDER_URL);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [fallbackAttempted, setFallbackAttempted] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setImageSrc(src || PLACEHOLDER_URL);
    setHasError(false);
    setFallbackAttempted(false);
    setIsLoading(true);

    // Timeout fallback - if image doesn't load within 8 seconds, show placeholder
    const timeout = setTimeout(() => {
      if (isMounted) {
        setIsLoading(false);
        if (!src) {
          setImageSrc(PLACEHOLDER_URL);
        }
      }
    }, 8000);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [src]);

  const handleError = async () => {
    setIsLoading(false);

    // Already tried fallback, show placeholder
    if (fallbackAttempted || hasError) {
      setImageSrc(PLACEHOLDER_URL);
      return;
    }

    setHasError(true);
    const strategy = getImageStrategy();

    switch (strategy) {
      case 'placeholder':
        // Option 1: Just show placeholder
        setImageSrc(PLACEHOLDER_URL);
        break;

      case 'merchant-fallback':
        // Option 2: Try to get image from merchant URL
        if (merchantUrl && dealId) {
          setFallbackAttempted(true);
          try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const response = await fetch(`${apiUrl}/api/deals/${dealId}/image-fallback`);
            if (response.ok) {
              const data = await response.json();
              if (data.imageUrl) {
                setImageSrc(data.imageUrl);
                return;
              }
            }
          } catch {
            console.error('Failed to fetch merchant image fallback');
          }
        }
        setImageSrc(PLACEHOLDER_URL);
        break;

      case 'proxy-cache':
        // Option 3: Use proxy URL
        if (src && dealId) {
          setFallbackAttempted(true);
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
          const proxyUrl = `${apiUrl}/api/image-proxy?url=${encodeURIComponent(src)}&dealId=${dealId}`;
          setImageSrc(proxyUrl);
        } else {
          setImageSrc(PLACEHOLDER_URL);
        }
        break;

      default:
        setImageSrc(PLACEHOLDER_URL);
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  return (
    <div style={{ position: 'relative', ...style }} className={className}>
      {/* Loading skeleton */}
      {isLoading && showSkeleton && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            borderRadius: 8,
          }}
        />
      )}

      <img
        src={imageSrc}
        alt={alt}
        loading="lazy"
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
        onError={handleError}
        onLoad={handleLoad}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.2s',
        }}
      />

      {/* CSS for shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}
