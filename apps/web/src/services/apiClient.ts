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

export interface ApiRequestOptions extends RequestInit {
  expectedType?: 'json' | 'text' | 'blob' | 'auto';
  timeoutMs?: number;
  ttl?: number;
}

interface ActiveFlight<T> {
  id: string;
  generation: number;
  timestamp: number;
  promise: Promise<T>;
  controller: AbortController;
  consumerCount: number;
}

interface CacheEntry<T = any> {
  timestamp: number;
  generation: number;
  ownerFlightId: string;
  endpoint: string;
  data: T;
}

const requestCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, ActiveFlight<any>>();

let cacheGeneration = 0;

function normalizeHeaders(init?: HeadersInit): Headers {
  const headers = new Headers();
  if (!init) return headers;
  if (typeof Headers !== 'undefined' && init instanceof Headers) {
    init.forEach((value, key) => headers.set(key, value));
  } else if (Array.isArray(init)) {
    for (const [key, value] of init) {
      if (key) headers.set(String(key), String(value));
    }
  } else if (typeof init === 'object') {
    for (const [key, value] of Object.entries(init)) {
      if (value !== undefined && value !== null) {
        headers.set(key, String(value));
      }
    }
  }
  return headers;
}

function extractHeader(headers: HeadersInit | undefined, name: string): string | null {
  if (!headers) return null;
  const target = name.toLowerCase();
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    return headers.get(target);
  }
  if (Array.isArray(headers)) {
    for (const [k, v] of headers) {
      if (typeof k === 'string' && k.toLowerCase() === target) return typeof v === 'string' ? v : String(v);
    }
    return null;
  }
  if (typeof headers === 'object') {
    for (const [k, v] of Object.entries(headers)) {
      if (k.toLowerCase() === target && typeof v === 'string') return v;
    }
  }
  return null;
}

export const apiClient = {
  clearCache(prefix?: string) {
    cacheGeneration++;
    if (prefix) {
      for (const [key, entry] of requestCache.entries()) {
        if (entry.endpoint.startsWith(prefix) || key.startsWith(prefix)) {
          requestCache.delete(key);
        }
      }
    } else {
      requestCache.clear();
    }
  },

  async fetch<T = any>(
    endpoint: string,
    options: ApiRequestOptions = {},
  ): Promise<T> {
    const normalizedHeaders = normalizeHeaders(options.headers);
    if (!normalizedHeaders.has("Content-Type")) {
      normalizedHeaders.set("Content-Type", "application/json");
    }

    const token = localStorage.getItem(TOKEN_KEY);
    if (token && !normalizedHeaders.has("Authorization")) {
      normalizedHeaders.set("Authorization", `Bearer ${token}`);
    }

    const timeoutMs = options.timeoutMs ?? 15000;
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    }

    const callerSignal = options.signal;
    const onCallerAbort = () => controller.abort();
    if (callerSignal) {
      if (callerSignal.aborted) {
        controller.abort();
      } else {
        callerSignal.addEventListener("abort", onCallerAbort, { once: true });
      }
    }

    try {
      const { headers: _, ...otherFetchOptions } = options;
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...otherFetchOptions,
        headers: normalizedHeaders,
        signal: controller.signal,
      });

      const expectedType = options.expectedType ?? 'json';
      const contentType = response.headers.get("content-type") || "";

      let data: any;
      if (expectedType === 'json') {
        if (!contentType.includes("application/json") && !contentType.includes("+json")) {
          const textPreview = (await response.text()).slice(0, 300);
          throw new APIError(
            response.ok ? 502 : response.status,
            `Format respons tidak sesuai. Diharapkan application/json namun menerima ${contentType || 'teks bukan JSON'}.`,
            { contentType, textPreview }
          );
        }
        try {
          data = await response.json();
        } catch (jsonErr: any) {
          if (jsonErr?.name === "AbortError" || controller.signal.aborted || callerSignal?.aborted) {
            throw jsonErr;
          }
          throw new APIError(502, `Gagal membaca format JSON: ${jsonErr?.message}`);
        }
      } else if (expectedType === 'blob') {
        data = await response.blob();
      } else if (expectedType === 'text') {
        data = await response.text();
      } else {
        // Auto mode
        if (contentType.includes("application/json") || contentType.includes("+json")) {
          data = await response.json();
        } else {
          data = await response.text();
        }
      }

      if (!response.ok) {
        throw new APIError(
          response.status,
          (data as { error?: string; message?: string })?.error ||
            (data as { message?: string })?.message ||
            "API request failed",
          data,
        );
      }

      return data as T;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      if ((error as any)?.name === "AbortError") {
        throw error;
      }
      throw new APIError(
        500,
        error instanceof Error ? error.message : "Network error",
      );
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      if (callerSignal) {
        callerSignal.removeEventListener("abort", onCallerAbort);
      }
    }
  },

  get<T = any>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
    const ttl = options?.ttl ?? 300000; // Default 5 minutes cache
    const token = localStorage.getItem(TOKEN_KEY) || "";
    const expectedType = options?.expectedType ?? 'json';
    const acceptLang = extractHeader(options?.headers, 'Accept-Language');
    const accept = extractHeader(options?.headers, 'Accept');
    const headerSig = [acceptLang ? `lang=${acceptLang}` : '', accept ? `accept=${accept}` : ''].filter(Boolean).join(';');
    const cacheKey = `${token}:${expectedType}:${headerSig ? headerSig + ':' : ''}${endpoint}`;

    const callerSignal = options?.signal;
    if (callerSignal?.aborted) {
      const abortErr = new Error("This operation was aborted");
      abortErr.name = "AbortError";
      return Promise.reject(abortErr);
    }

    if (ttl > 0 && requestCache.has(cacheKey)) {
      const cached = requestCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < ttl) {
        return Promise.resolve(cached.data as T);
      }
      requestCache.delete(cacheKey);
    }

    const flight = inFlightRequests.get(cacheKey);
    if (flight && flight.generation === cacheGeneration) {
      flight.consumerCount++;
      return this.bindCallerToFlight<T>(flight, callerSignal, cacheKey);
    }

    const controller = new AbortController();
    const flightId = `flight_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const flightGeneration = cacheGeneration;
    const { signal: _, ...sharedFetchOptions } = options || {};

    const promise = this.fetch<T>(endpoint, {
      ...sharedFetchOptions,
      method: "GET",
      signal: controller.signal,
    })
      .then((val) => {
        if (inFlightRequests.get(cacheKey)?.id === flightId) {
          inFlightRequests.delete(cacheKey);
        }
        // Do not cache application failure envelopes
        if (val && typeof val === 'object' && (val as any).success === false) {
          const existing = requestCache.get(cacheKey);
          if (existing && existing.ownerFlightId === flightId) {
            requestCache.delete(cacheKey);
          }
          return val;
        }
        if (ttl > 0 && flightGeneration === cacheGeneration) {
          requestCache.set(cacheKey, {
            timestamp: Date.now(),
            generation: flightGeneration,
            ownerFlightId: flightId,
            endpoint,
            data: val,
          });
        }
        return val;
      })
      .catch((err) => {
        if (inFlightRequests.get(cacheKey)?.id === flightId) {
          inFlightRequests.delete(cacheKey);
        }
        const existing = requestCache.get(cacheKey);
        if (existing && existing.ownerFlightId === flightId) {
          requestCache.delete(cacheKey);
        }
        throw err;
      });

    const newFlight: ActiveFlight<T> = {
      id: flightId,
      generation: flightGeneration,
      timestamp: Date.now(),
      promise,
      controller,
      consumerCount: 1,
    };
    inFlightRequests.set(cacheKey, newFlight);

    return this.bindCallerToFlight<T>(newFlight, callerSignal, cacheKey);
  },

  bindCallerToFlight<T>(
    flight: ActiveFlight<T>,
    callerSignal: AbortSignal | null | undefined,
    cacheKey: string
  ): Promise<T> {
    if (!callerSignal) {
      return flight.promise;
    }

    return new Promise<T>((resolve, reject) => {
      let settled = false;
      const onAbort = () => {
        if (settled) return;
        settled = true;
        callerSignal.removeEventListener("abort", onAbort);
        flight.consumerCount--;
        if (flight.consumerCount <= 0) {
          flight.controller.abort();
          if (inFlightRequests.get(cacheKey)?.id === flight.id) {
            inFlightRequests.delete(cacheKey);
          }
        }
        const abortErr = new Error("This operation was aborted");
        abortErr.name = "AbortError";
        reject(abortErr);
      };

      callerSignal.addEventListener("abort", onAbort, { once: true });
      flight.promise.then(
        (val) => {
          if (!settled) {
            settled = true;
            callerSignal.removeEventListener("abort", onAbort);
            resolve(val);
          }
        },
        (err) => {
          if (!settled) {
            settled = true;
            callerSignal.removeEventListener("abort", onAbort);
            reject(err);
          }
        }
      );
    });
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
