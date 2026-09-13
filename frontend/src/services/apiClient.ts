import { TOKEN_KEY } from "@/data/accounts";

const API_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export class APIError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: any,
  ) {
    super(message);
    this.name = "APIError";
  }
}

const requestCache = new Map<
  string,
  { timestamp: number; promise: Promise<any> }
>();

export const apiClient = {
  clearCache(prefix?: string) {
    if (prefix) {
      for (const key of requestCache.keys()) {
        if (key.startsWith(prefix)) requestCache.delete(key);
      }
    } else {
      requestCache.clear();
    }
  },

  async fetch<T = any>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = localStorage.getItem(TOKEN_KEY);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        throw new APIError(
          response.status,
          (data as { error?: string; message?: string }).error ||
            (data as { message?: string }).message ||
            "API request failed",
          data,
        );
      }

      return data as T;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(
        500,
        error instanceof Error ? error.message : "Network error",
      );
    }
  },

  get<T = any>(endpoint: string, options?: RequestInit & { ttl?: number }) {
    const ttl = options?.ttl ?? 300000; // Default 5 minutes cache for mobile performance/dedup
    const token = localStorage.getItem(TOKEN_KEY) || "";
    const cacheKey = `${token}:${endpoint}`; // Scoped by user safely

    if (ttl > 0 && requestCache.has(cacheKey)) {
      const cached = requestCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < ttl) {
        return cached.promise as Promise<T>;
      }
    }

    const promise = this.fetch<T>(endpoint, {
      ...options,
      method: "GET",
    }).catch((err) => {
      requestCache.delete(cacheKey); // don't cache errors
      throw err;
    });

    if (ttl > 0) {
      requestCache.set(cacheKey, { timestamp: Date.now(), promise });
    }
    return promise;
  },

  post<T = any>(endpoint: string, body: unknown, options?: RequestInit) {
    this.clearCache();
    return this.fetch<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  put<T = any>(endpoint: string, body: unknown, options?: RequestInit) {
    this.clearCache();
    return this.fetch<T>(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  delete<T = any>(endpoint: string, options?: RequestInit) {
    this.clearCache();
    return this.fetch<T>(endpoint, { ...options, method: "DELETE" });
  },
};
