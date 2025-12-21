import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import './i18n'; // Initialize i18n
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

console.log('[DesiDealsAI] App starting...');
console.log('[DesiDealsAI] API URL:', import.meta.env.VITE_API_URL);

try {
  const rootElement = document.getElementById('root');
  console.log('[DesiDealsAI] Root element:', rootElement);

  if (rootElement) {
    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <BrowserRouter>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </ErrorBoundary>
      </StrictMode>
    );
    console.log('[DesiDealsAI] Render called');
  } else {
    console.error('[DesiDealsAI] Root element not found!');
  }
} catch (error) {
  console.error('[DesiDealsAI] Fatal error:', error);
}
