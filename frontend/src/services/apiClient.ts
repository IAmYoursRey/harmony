import { TOKEN_KEY } from '@/data/accounts';

// In development, Vite proxies /api/* → localhost:3001 (configured in vite.config.ts).
// In production, set VITE_API_BASE_URL to the actual API origin (e.g. https://api.geosense.app).
// When VITE_API_BASE_URL is empty/unset, requests use relative paths (proxy mode).
const API_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export class APIError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message);
    this.name = 'APIError';
  }
}

export const apiClient = {
  async fetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem(TOKEN_KEY);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        throw new APIError(response.status, (data as {error?: string, message?: string}).error || (data as {message?: string}).message || 'API request failed', data);
      }

      return data as T;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error instanceof Error ? error.message : 'Network error');
    }
  },

  get<T = any>(endpoint: string, options?: RequestInit) {
    return this.fetch<T>(endpoint, { ...options, method: 'GET' });
  },

  post<T = any>(endpoint: string, body: unknown, options?: RequestInit) {
    return this.fetch<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) });
  },

  put<T = any>(endpoint: string, body: unknown, options?: RequestInit) {
    return this.fetch<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) });
  },

  delete<T = any>(endpoint: string, options?: RequestInit) {
    return this.fetch<T>(endpoint, { ...options, method: 'DELETE' });
  }
};
