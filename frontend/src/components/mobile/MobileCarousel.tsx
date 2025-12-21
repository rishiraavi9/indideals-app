import { useState, useEffect, useRef } from 'react';
import type { Deal } from '../../types';

interface MobileCarouselProps {
  deals: Deal[];
  onDealClick: (deal: Deal) => void;
}

export default function MobileCarousel({ deals, onDealClick }: MobileCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-rotate carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % deals.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [deals.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      // Swipe left
      setCurrentIndex((prev) => (prev + 1) % deals.length);
    }
    if (touchStart - touchEnd < -75) {
      // Swipe right
      setCurrentIndex((prev) => (prev - 1 + deals.length) % deals.length);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (deals.length === 0) return null;

  const currentDeal = deals[currentIndex];

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'relative',
        width: '100%',
        height: 200,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        overflow: 'hidden',
      }}
    >
      {/* Banner Content */}
      <div
        onClick={() => onDealClick(currentDeal)}
        style={{
          display: 'flex',
          height: '100%',
          padding: '16px',
          cursor: 'pointer',
        }}
      >
        {/* Left: Deal Info */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          color: 'white',
          paddingRight: 16,
        }}>
          {/* Tag */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.2)',
            padding: '4px 10px',
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 600,
            marginBottom: 8,
            width: 'fit-content',
          }}>
            {currentDeal.discountPercentage && currentDeal.discountPercentage >= 70 ? '🔥 HOT DEAL' : '✨ RECOMMENDED'}
          </div>

          {/* Title */}
          <h3 style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 700,
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {currentDeal.title}
          </h3>

          {/* Price */}
          <div style={{ marginTop: 8 }}>
            <span style={{
              fontSize: 24,
              fontWeight: 800,
            }}>
              {formatPrice(currentDeal.price)}
            </span>
            {currentDeal.originalPrice && (
              <>
                <span style={{
                  fontSize: 14,
                  textDecoration: 'line-through',
                  opacity: 0.7,
                  marginLeft: 8,
                }}>
                  {formatPrice(currentDeal.originalPrice)}
                </span>
                <span style={{
                  background: '#10b981',
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 700,
                  marginLeft: 8,
                }}>
                  -{currentDeal.discountPercentage}%
                </span>
              </>
            )}
          </div>

          {/* CTA */}
          <button style={{
            marginTop: 12,
            background: 'white',
            color: '#667eea',
            border: 'none',
            padding: '10px 20px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            width: 'fit-content',
          }}>
            Shop Now →
          </button>
        </div>

        {/* Right: Image */}
        <div style={{
          width: 140,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <img
            src={imageErrors.has(currentIndex) ? '/placeholder-deal.svg' : (currentDeal.imageUrl || '/placeholder-deal.svg')}
            alt={currentDeal.title}
            onError={() => setImageErrors(prev => new Set(prev).add(currentIndex))}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: 8,
              background: 'white',
              padding: 8,
            }}
          />
        </div>
      </div>

      {/* Dots Indicator */}
      <div style={{
        position: 'absolute',
        bottom: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 6,
      }}>
        {deals.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            style={{
              width: index === currentIndex ? 20 : 8,
              height: 8,
              borderRadius: 4,
              border: 'none',
              background: index === currentIndex ? 'white' : 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              transition: 'all 0.3s',
            }}
          />
        ))}
      </div>
    </div>
  );
}
