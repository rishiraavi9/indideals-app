import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authApi } from '../api/auth';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        // Check for OAuth token in URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (token) {
          // Store the token and clear URL
          localStorage.setItem('token', token);
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        if (authApi.isAuthenticated()) {
          try {
            const { user } = await authApi.getMe();
            setUser(user);
          } catch (error) {
            console.error('Failed to load user:', error);
            authApi.logout();
          }
        }
      } catch (error) {
        console.error('Error during auth initialization:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    const { user } = await authApi.login(email, password);
    setUser(user);
  };

  const signup = async (email: string, username: string, password: string) => {
    const { user } = await authApi.signup(email, username, password);
    setUser(user);
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
