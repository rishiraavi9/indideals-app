import type { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
  onPostDealClick?: () => void;
}

export default function Layout({
  children,
  onPostDealClick,
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
      />

      <main style={{ flex: 1 }}>
        {children}
      </main>

      <Footer />
    </div>
  );
}
