import { ProviderHealthReport, ProviderHealthState } from './types';

interface HealthTarget {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'HEAD';
  timeoutMs: number;
}

const HEALTH_TARGETS: HealthTarget[] = [
  {
    id: 'bmkg',
    name: 'BMKG Satu Peta MKG & InaTEWS',
    url: 'https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json',
    method: 'GET',
    timeoutMs: 4000,
  },
  {
    id: 'open_meteo_dem',
    name: 'Copernicus DEM & NWP Service (Open-Meteo)',
    url: 'https://api.open-meteo.com/v1/elevation?latitude=-7.25&longitude=112.75',
    method: 'GET',
    timeoutMs: 4000,
  },
  {
    id: 'stac_earth_search',
    name: 'Earth Search STAC (Sentinel-2 / Sentinel-1)',
    url: 'https://earth-search.aws.element84.com/v1',
    method: 'GET',
    timeoutMs: 4000,
  },
  {
    id: 'harmony_backend',
    name: 'Harmony Backend & PostGIS Core',
    url: '/api/debug',
    method: 'GET',
    timeoutMs: 4000,
  },
];

class APIHealthService {
  private reports = new Map<string, ProviderHealthReport>();
  private lastCheckedTimestamp = 0;
  private readonly CACHE_TTL_MS = 60 * 1000; // 60s cache to avoid rate limits

  constructor() {
    HEALTH_TARGETS.forEach((target) => {
      this.reports.set(target.id, {
        providerId: target.id,
        name: target.name,
        state: 'UNKNOWN',
        lastCheckedAt: 'Belum Diperiksa',
        endpointUrl: target.url,
      });
    });
  }

  public async checkAllProviders(forceRefresh = false): Promise<ProviderHealthReport[]> {
    const now = Date.now();
    if (!forceRefresh && now - this.lastCheckedTimestamp < this.CACHE_TTL_MS) {
      return Array.from(this.reports.values());
    }

    this.lastCheckedTimestamp = now;

    await Promise.all(
      HEALTH_TARGETS.map(async (target) => {
        const report = await this.checkSingleProvider(target);
        this.reports.set(target.id, report);
      })
    );

    return Array.from(this.reports.values());
  }

  private async checkSingleProvider(target: HealthTarget): Promise<ProviderHealthReport> {
    const start = Date.now();
    const existing = this.reports.get(target.id);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), target.timeoutMs);

      const res = await fetch(target.url, {
        method: target.method,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - start;

      let state: ProviderHealthState = 'ONLINE';
      if (!res.ok) {
        state = res.status >= 500 ? 'OFFLINE' : 'DEGRADED';
      } else if (latencyMs > 2500) {
        state = 'DEGRADED';
      }

      return {
        providerId: target.id,
        name: target.name,
        state,
        lastCheckedAt: new Date().toLocaleTimeString('id-ID'),
        lastSuccessfulRequest: res.ok ? new Date().toLocaleTimeString('id-ID') : existing?.lastSuccessfulRequest,
        latencyMs,
        httpStatus: res.status,
        endpointUrl: target.url,
      };
    } catch (err: any) {
      return {
        providerId: target.id,
        name: target.name,
        state: 'OFFLINE',
        lastCheckedAt: new Date().toLocaleTimeString('id-ID'),
        lastSuccessfulRequest: existing?.lastSuccessfulRequest,
        latencyMs: Date.now() - start,
        errorMessage: err.name === 'AbortError' ? 'Koneksi melebihi batas waktu (Timeout)' : err.message,
        endpointUrl: target.url,
      };
    }
  }

  public getReport(providerId: string): ProviderHealthReport | undefined {
    return this.reports.get(providerId);
  }
}

export const apiHealthService = new APIHealthService();
