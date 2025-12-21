import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import DealPage from './components/DealPage';
import WishlistPage from './components/WishlistPage';
import AlertsPage from './components/AlertsPage';
import PopularDealsPage from './pages/PopularDealsPage';
import CategoryPage from './pages/CategoryPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import ProfilePage from './pages/ProfilePage';
import PostDealPage from './pages/PostDealPage';
import { initializeCapacitor } from './utils/capacitor';

// Mobile Components
import { MobileApp, MobileDealPage, MobileCategories, MobileProfile } from './components/mobile';

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

export default function App() {
  const isMobile = useIsMobile();

  useEffect(() => {
    // Initialize Capacitor when app loads
    initializeCapacitor().catch((error) => {
      console.error('Failed to initialize Capacitor:', error);
    });
  }, []);

  // Mobile-optimized routes
  if (isMobile) {
    return (
      <Routes>
        {/* Mobile-specific routes */}
        <Route path="/" element={<MobileApp />} />
        <Route path="/deal/:dealId" element={<MobileDealPage />} />
        <Route path="/deals" element={<MobileApp />} />
        <Route path="/deals/:categorySlug" element={<MobileApp />} />
        <Route path="/search" element={<MobileApp />} />
        <Route path="/forums" element={<MobileApp />} />
        <Route path="/categories" element={<MobileCategories />} />
        <Route path="/category/:categoryId" element={<MobileApp />} />
        <Route path="/wishlist" element={<MobileApp />} />
        <Route path="/alerts" element={<MobileApp />} />
        <Route path="/profile" element={<MobileProfile onClose={() => window.history.back()} />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/post-deal" element={<PostDealPage />} />
      </Routes>
    );
  }

  // Desktop routes
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/deal/:dealId" element={<DealPage />} />
      <Route path="/deals" element={<PopularDealsPage />} />
      <Route path="/deals/:categorySlug" element={<CategoryPage />} />
      <Route path="/wishlist" element={<WishlistPage />} />
      <Route path="/alerts" element={<AlertsPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/post-deal" element={<PostDealPage />} />
    </Routes>
  );
}
