import { FEATURE_FLAGS } from '../config/features';

interface AdBlockProps {
  type?: 'sidebar' | 'banner' | 'square' | 'rectangle';
  className?: string;
}

export default function AdBlock({ type = 'rectangle', className = '' }: AdBlockProps) {
  // Don't render ads if feature is disabled
  if (!FEATURE_FLAGS.ADS_ENABLED) {
    return null;
  }
  const getAdStyles = () => {
    const baseStyles = {
      background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
      border: '2px dashed #d1d5db',
      borderRadius: 12,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      color: '#6b7280',
      fontSize: 14,
      fontWeight: 600,
      textAlign: 'center' as const,
    };

    switch (type) {
      case 'sidebar':
        return { ...baseStyles, minHeight: 600, width: '100%' };
      case 'banner':
        return { ...baseStyles, minHeight: 70, width: '100%', padding: 12 };
      case 'square':
        return { ...baseStyles, minHeight: 300, width: 300, maxWidth: '100%' };
      case 'rectangle':
      default:
        return { ...baseStyles, minHeight: 250, width: '100%' };
    }
  };

  return (
    <div style={getAdStyles()} className={className}>
      <div style={{ fontSize: type === 'banner' ? 20 : 48, marginBottom: type === 'banner' ? 4 : 12, opacity: 0.5 }}>📢</div>
      <div style={{ marginBottom: type === 'banner' ? 2 : 8, fontSize: type === 'banner' ? 13 : 16, fontWeight: 700 }}>
        Advertisement
      </div>
      {type !== 'banner' && (
        <div style={{ fontSize: 12, opacity: 0.7, maxWidth: 200 }}>
          Your ad could be here
        </div>
      )}
    </div>
  );
}
