// Detect platform and set appropriate API URL
const getApiUrl = () => {
  // First check for environment variable (set at build time for production)
  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl) {
    return envApiUrl;
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const isAndroid = userAgent.includes('android');
  const isIOS = /iphone|ipad|ipod/.test(userAgent);

  // For web browser on localhost, always use localhost
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3001/api';
  }

  // For Android emulator, use 10.0.2.2 (maps to host's localhost)
  if (isAndroid) {
    return 'http://10.0.2.2:3001/api';
  }

  // For iOS simulator, localhost works directly
  if (isIOS) {
    return 'http://localhost:3001/api';
  }

  // Fallback
  return 'http://localhost:3001/api';
};

const API_URL = getApiUrl();
console.log('[DesiDealsAI] Platform detected, using API URL:', API_URL);

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('token');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  setRefreshToken(refreshToken: string | null) {
    this.refreshToken = refreshToken;
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    } else {
      localStorage.removeItem('refreshToken');
    }
  }

  getToken() {
    return this.token;
  }

  getRefreshToken() {
    return this.refreshToken;
  }

  private onRefreshed(token: string) {
    this.refreshSubscribers.forEach((callback) => callback(token));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(callback: (token: string) => void) {
    this.refreshSubscribers.push(callback);
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (!this.refreshToken) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) {
        // Refresh token is invalid or expired
        this.setToken(null);
        this.setRefreshToken(null);
        return null;
      }

      const data = await response.json();
      this.setToken(data.accessToken);
      this.setRefreshToken(data.refreshToken);
      return data.accessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.setToken(null);
      this.setRefreshToken(null);
      return null;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry = false
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    // Handle 401 Unauthorized - token expired
    if (response.status === 401 && !isRetry && endpoint !== '/auth/refresh') {
      if (this.isRefreshing) {
        // Wait for the current refresh to complete
        return new Promise((resolve, reject) => {
          this.addRefreshSubscriber(() => {
            // Retry the request with the new token
            this.request<T>(endpoint, options, true)
              .then(resolve)
              .catch(reject);
          });
        });
      }

      this.isRefreshing = true;

      const newToken = await this.refreshAccessToken();

      this.isRefreshing = false;

      if (newToken) {
        this.onRefreshed(newToken);
        // Retry the request with the new token
        return this.request<T>(endpoint, options, true);
      } else {
        // Refresh failed - user needs to login again
        window.dispatchEvent(new CustomEvent('auth:logout'));
        throw new Error('Session expired. Please login again.');
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, data?: unknown) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  put<T>(endpoint: string, data?: unknown) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  patch<T>(endpoint: string, data?: unknown) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

export const apiClient = new ApiClient(API_URL);
