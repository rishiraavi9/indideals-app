import type { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
  onPostDealClick?: () => void;
  onAnalyticsClick?: () => void;
  onProfileClick?: () => void;
  onLoginClick?: () => void;
}

export default function Layout({
  children,
  onPostDealClick,
  onAnalyticsClick,
  onProfileClick,
  onLoginClick,
}: LayoutProps) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#f5f7fa',
    }}>
      <Header
        onPostDealClick={onPostDealClick}
        onAnalyticsClick={onAnalyticsClick}
        onProfileClick={onProfileClick}
        onLoginClick={onLoginClick}
      />

      <main style={{ flex: 1 }}>
        {children}
      </main>

      <Footer />
    </div>
  );
}
