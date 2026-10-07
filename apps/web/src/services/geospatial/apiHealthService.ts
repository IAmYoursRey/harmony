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
    name: 'BMKG — API informasi gempa',
    url: 'https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json',
    method: 'GET',
    timeoutMs: 4000,
  },
  {
    id: 'open_meteo_dem',
    name: 'Open-Meteo — API elevasi',
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
    name: 'Harmony Backend — ketersediaan layanan',
    url: '/api/debug',
    method: 'GET',
    timeoutMs: 4000,
  },
];

class APIHealthService {
  private reports = new Map<string, ProviderHealthReport>();
  private lastCheckedTimestamp = 0;
  private inFlightCheck: Promise<ProviderHealthReport[]> | null = null;
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

    if (this.inFlightCheck) {
      return this.inFlightCheck;
    }

    this.inFlightCheck = (async () => {
      try {
        await Promise.all(
          HEALTH_TARGETS.map(async (target) => {
            const report = await this.checkSingleProvider(target);
            this.reports.set(target.id, report);
          })
        );
        this.lastCheckedTimestamp = Date.now();
        return Array.from(this.reports.values());
      } finally {
        this.inFlightCheck = null;
      }
    })();

    return this.inFlightCheck;
  }

  private async checkSingleProvider(target: HealthTarget): Promise<ProviderHealthReport> {
    const start = Date.now();
    const existing = this.reports.get(target.id);
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), target.timeoutMs);

      const res = await fetch(target.url, {
        method: target.method,
        signal: controller.signal,
      });

      const body = res.ok ? await res.json() : null;
      if (res.ok) {
        const valid = target.id === 'bmkg' ? (() => {
            const g = body?.Infogempa?.gempa;
            const dt = g?.DateTime;
            if (!dt || typeof dt !== 'string' || !Number.isFinite(Date.parse(dt))) return false;
            const match = dt.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (match) {
              const [_, y, m, d] = match;
              const year = Number(y);
              const month = Number(m);
              const dayNum = Number(d);
              if (month < 1 || month > 12 || dayNum < 1 || dayNum > 31) return false;
              const checkDate = new Date(Date.UTC(year, month - 1, dayNum));
              if (checkDate.getUTCFullYear() !== year || (checkDate.getUTCMonth() + 1) !== month || checkDate.getUTCDate() !== dayNum) return false;
            }
            let latVal: number | null = null;
            let lngVal: number | null = null;
            const coordPartRegex = /^[+-]?\d+(?:\.\d+)?$/;
            if (typeof g.Coordinates === 'string' && g.Coordinates.includes(',')) {
              const rawParts = g.Coordinates.split(',').map((s: string) => s.trim());
              if (rawParts.length === 2 && coordPartRegex.test(rawParts[0]) && coordPartRegex.test(rawParts[1])) {
                latVal = parseFloat(rawParts[0]);
                lngVal = parseFloat(rawParts[1]);
              } else {
                return false;
              }
            } else if (typeof g.latitude === 'number' && typeof g.longitude === 'number') {
              latVal = g.latitude;
              lngVal = g.longitude;
            }
            if (latVal === null || lngVal === null || Math.abs(latVal) > 90 || Math.abs(lngVal) > 180) return false;
            const rawMag = String(g.Magnitude || '').trim();
            const magMatch = rawMag.match(/^(?:M\s*)?([0-9]+(?:\.[0-9]+)?)(?:\s*(?:SR|M))?$/i);
            if (!magMatch) return false;
            const magVal = parseFloat(magMatch[1]);
            if (!Number.isFinite(magVal) || magVal < 0 || magVal > 10) return false;
            const rawDepth = String(g.Kedalaman || '').trim();
            const depthMatch = rawDepth.match(/^([0-9]+(?:\.[0-9]+)?)(?:\s*km)?$/i);
            if (!depthMatch) return false;
            const depthVal = parseFloat(depthMatch[1]);
            if (!Number.isFinite(depthVal) || depthVal < 0 || depthVal > 1000) return false;
            return true;
          })()
          : target.id === 'open_meteo_dem' ? Array.isArray(body?.elevation) && body.elevation.length === 1 && body.elevation.every((v: unknown) => typeof v === 'number' && Number.isFinite(v))
          : target.id === 'stac_earth_search' ? typeof body?.stac_version === 'string' && Array.isArray(body.links)
          : body && body.success !== false && !body.error;
        if (!valid) throw new Error('HTTP berhasil tetapi isi respons tidak valid.');
      }
      const latencyMs = Date.now() - start;

      let state: ProviderHealthState = 'ONLINE';
      if (!res.ok) {
        state = res.status >= 500 ? 'OFFLINE' : 'DEGRADED';
      } else if (latencyMs > 2500) {
        state = 'DEGRADED';
      }

      const isoNow = new Date().toISOString();
      return {
        providerId: target.id,
        name: target.name,
        state,
        lastCheckedAt: isoNow,
        lastSuccessfulRequest: res.ok ? isoNow : existing?.lastSuccessfulRequest,
        latencyMs,
        httpStatus: res.status,
        endpointUrl: target.url,
      };
    } catch (err: any) {
      return {
        providerId: target.id,
        name: target.name,
        state: 'OFFLINE',
        lastCheckedAt: new Date().toISOString(),
        lastSuccessfulRequest: existing?.lastSuccessfulRequest,
        latencyMs: Date.now() - start,
        errorMessage: err.name === 'AbortError' ? 'Koneksi melebihi batas waktu (Timeout)' : err.message,
        endpointUrl: target.url,
      };
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  public getReport(providerId: string): ProviderHealthReport | undefined {
    return this.reports.get(providerId);
  }
}

export const apiHealthService = new APIHealthService();
