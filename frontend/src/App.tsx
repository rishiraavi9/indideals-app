import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import DealPage from './components/DealPage';
import PopularDealsPage from './pages/PopularDealsPage';
import CategoryPage from './pages/CategoryPage';
import { initializeCapacitor } from './utils/capacitor';

export default function App() {
  useEffect(() => {
    // Initialize Capacitor when app loads
    initializeCapacitor().catch((error) => {
      console.error('Failed to initialize Capacitor:', error);
    });
  }, []);

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/deal/:dealId" element={<DealPage />} />
      <Route path="/deals" element={<PopularDealsPage />} />
      <Route path="/deals/:categorySlug" element={<CategoryPage />} />
    </Routes>
  );
}
