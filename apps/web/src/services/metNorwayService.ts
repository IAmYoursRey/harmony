import { finiteNumber, validateMetNorwayPayload, isValidMetPoint } from './weatherDataIntegrity';

export interface MetNorwayPoint {
  time: string;
  epoch: number;
  temperatureC: number;
  relativeHumidityPct: number;
  windSpeedKmh: number | null;
  windFromDirectionDeg: number | null;
  cloudAreaFractionPct: number | null;
  airPressureSeaLevelHpa: number | null;
  precipitationNext1hMm: number | null;
  precipitationNext6hMm: number | null;
  symbolCode: string | null;
  windGustsKmh?: number | null;
}

export interface MetNorwayAttempt {
  id: string;
  url: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  httpStatus: number | null;
  latencyMs: number;
  payloadBytes: number;
  checkedAt: string;
  error?: string;
  rejectedCount?: number;
  acceptedCount?: number;
  cacheCheckedAt?: string;
}

export interface MetNorwayForecastResponse {
  success: boolean;
  provider: 'MET Norway (Meteorologisk institutt)';
  modelLineage: 'ECMWF HRES / MEPS (AEMET/MET Norway)';
  updatedAt: string | null;
  points: MetNorwayPoint[];
  current: MetNorwayPoint | null;
  rawPayload?: any;
  servedFromCache?: boolean;
  units: {
    temperature: '°C';
    windSpeed: 'km/h';
    windDirection: '°';
    cloudCover: '%';
    relativeHumidity: '%';
    airPressureSeaLevel: 'hPa (sea level, distinct from surface pressure)';
    precipitation: 'mm';
  };
  provenance: {
    source: string;
    termsOfService: string;
    derivedVariables: string[];
  };
  attempt?: MetNorwayAttempt;
  error?: string;
}

interface CacheEntry {
  expiresAt: number;
  data: MetNorwayForecastResponse;
}

interface Subscriber {
  resolve: (data: MetNorwayForecastResponse) => void;
  reject: (err: any) => void;
  signal?: AbortSignal;
  onAbort?: () => void;
}

interface InFlightEntry {
  controller: AbortController;
  subscribers: Set<Subscriber>;
  timeoutId: ReturnType<typeof setTimeout>;
}

class MetNorwayService {
  private cache = new Map<string, CacheEntry>();
  private inFlight = new Map<string, InFlightEntry>();
  private readonly USER_AGENT = 'HarmonyDisasterPlatform/1.0 (https://github.com/IAmYoursRey/harmony)';

  public async fetchForecast(lat: number, lng: number, signal?: AbortSignal): Promise<MetNorwayForecastResponse> {
    if (signal?.aborted) {
      throw new DOMException('Permintaan MET Norway telah dibatalkan oleh pemanggil.', 'AbortError');
    }
    if (!finiteNumber(lat) || !finiteNumber(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      throw new Error('Koordinat lokasi untuk MET Norway tidak valid.');
    }

    const roundedLat = parseFloat(lat.toFixed(4));
    const roundedLng = parseFloat(lng.toFixed(4));
    const cacheKey = `${roundedLat},${roundedLng}`;

    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      const cachedResult: MetNorwayForecastResponse = {
        ...cached.data,
        servedFromCache: true,
        attempt: cached.data.attempt ? {
          ...cached.data.attempt,
          cacheCheckedAt: new Date().toISOString(),
        } : undefined,
      };
      return cachedResult;
    }

    let inFlightEntry = this.inFlight.get(cacheKey);
    if (!inFlightEntry) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort('timeout'), 12000);
      inFlightEntry = {
        controller,
        subscribers: new Set(),
        timeoutId,
      };
      this.inFlight.set(cacheKey, inFlightEntry);

      const entryRef = inFlightEntry;
      this.executeFetch(lat, lng, roundedLat, roundedLng, cacheKey, controller.signal)
        .then((res) => {
          clearTimeout(entryRef.timeoutId);
          if (this.inFlight.get(cacheKey) === entryRef) {
            this.inFlight.delete(cacheKey);
          }
          entryRef.subscribers.forEach((sub) => {
            if (sub.signal && sub.onAbort) sub.signal.removeEventListener('abort', sub.onAbort);
            sub.resolve(res);
          });
          entryRef.subscribers.clear();
        })
        .catch((err) => {
          clearTimeout(entryRef.timeoutId);
          if (this.inFlight.get(cacheKey) === entryRef) {
            this.inFlight.delete(cacheKey);
          }
          entryRef.subscribers.forEach((sub) => {
            if (sub.signal && sub.onAbort) sub.signal.removeEventListener('abort', sub.onAbort);
            sub.reject(err);
          });
          entryRef.subscribers.clear();
        });
    }

    const currentEntry = inFlightEntry;
    return new Promise<MetNorwayForecastResponse>((resolve, reject) => {
      const sub: Subscriber = { resolve, reject, signal };
      const onAbort = () => {
        if (signal && sub.onAbort) signal.removeEventListener('abort', sub.onAbort);
        currentEntry.subscribers.delete(sub);
        reject(new DOMException('Permintaan MET Norway telah dibatalkan oleh pemanggil.', 'AbortError'));
        if (currentEntry.subscribers.size === 0) {
          clearTimeout(currentEntry.timeoutId);
          currentEntry.controller.abort('all_subscribers_aborted');
          if (this.inFlight.get(cacheKey) === currentEntry) {
            this.inFlight.delete(cacheKey);
          }
        }
      };

      sub.onAbort = onAbort;
      if (signal) {
        signal.addEventListener('abort', onAbort, { once: true });
      }
      currentEntry.subscribers.add(sub);
    });
  }

  private async executeFetch(
    lat: number,
    lng: number,
    roundedLat: number,
    roundedLng: number,
    cacheKey: string,
    signal?: AbortSignal,
  ): Promise<MetNorwayForecastResponse> {
    const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${roundedLat}&lon=${roundedLng}`;
    const startTime = Date.now();
    let httpStatus: number | null = null;
    let payloadBytes = 0;

    const timeoutCtrl = new AbortController();
    const timeoutId = setTimeout(() => timeoutCtrl.abort('timeout'), 12000);
    const onCallerAbort = () => timeoutCtrl.abort(signal?.reason);
    signal?.addEventListener('abort', onCallerAbort, { once: true });

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': this.USER_AGENT,
          'Accept': 'application/json',
        },
        signal: timeoutCtrl.signal,
      });

      httpStatus = res.status;
      const rawText = await res.text();
      payloadBytes = new TextEncoder().encode(rawText).length;

      if (!res.ok) {
        throw new Error(`MET Norway HTTP ${res.status}`);
      }

      let json: any;
      try {
        json = JSON.parse(rawText);
      } catch {
        throw new Error('Respons MET Norway bukan JSON yang valid.');
      }

      const validation = validateMetNorwayPayload(json, lat, lng);
      if (!validation.valid) {
        throw new Error(validation.error || 'Prakiraan MET Norway tidak valid.');
      }

      const timeseries = json?.properties?.timeseries || [];
      const points: MetNorwayPoint[] = [];
      const seenTimes = new Set<number>();

      for (const entry of timeseries) {
        if (!isValidMetPoint(entry)) continue;
        const epoch = Math.floor(Date.parse(entry.time) / 1000);
        if (seenTimes.has(epoch)) continue;
        seenTimes.add(epoch);
        const details = entry?.data?.instant?.details;
        if (!details) continue;

        const temp = details.air_temperature;
        const rh = details.relative_humidity;
        const windSpeedMs = details.wind_speed;
        const windDir = details.wind_from_direction;
        const cloud = details.cloud_area_fraction;
        const pressure = details.air_pressure_at_sea_level;

        if (!finiteNumber(temp) || temp < -100 || temp > 70 ||
            !finiteNumber(rh) || rh < 0 || rh > 100 ||
            (windSpeedMs !== undefined && (!finiteNumber(windSpeedMs) || windSpeedMs < 0 || windSpeedMs > 150)) ||
            (windDir !== undefined && (!finiteNumber(windDir) || windDir < 0 || windDir > 360)) ||
            (cloud !== undefined && (!finiteNumber(cloud) || cloud < 0 || cloud > 100)) ||
            (pressure !== undefined && (!finiteNumber(pressure) || pressure < 300 || pressure > 1200))) {
          continue;
        }

        const next1h = entry?.data?.next_1_hours?.details?.precipitation_amount;
        const next6h = entry?.data?.next_6_hours?.details?.precipitation_amount;
        const symbol = entry?.data?.next_1_hours?.summary?.symbol_code || entry?.data?.next_6_hours?.summary?.symbol_code || entry?.data?.next_12_hours?.summary?.symbol_code || null;
        const gustMs = details.wind_speed_of_gust;

        points.push({
          time: entry.time,
          epoch,
          temperatureC: temp,
          relativeHumidityPct: rh,
          windSpeedKmh: finiteNumber(windSpeedMs) && windSpeedMs >= 0 ? parseFloat((windSpeedMs * 3.6).toFixed(1)) : null,
          windFromDirectionDeg: finiteNumber(windDir) && windDir >= 0 && windDir <= 360 ? windDir : null,
          cloudAreaFractionPct: finiteNumber(cloud) && cloud >= 0 && cloud <= 100 ? cloud : null,
          airPressureSeaLevelHpa: finiteNumber(pressure) && pressure >= 300 && pressure <= 1200 ? pressure : null,
          precipitationNext1hMm: finiteNumber(next1h) && next1h >= 0 ? next1h : null,
          precipitationNext6hMm: finiteNumber(next6h) && next6h >= 0 ? next6h : null,
          symbolCode: symbol,
          windGustsKmh: finiteNumber(gustMs) && gustMs >= 0 ? parseFloat((gustMs * 3.6).toFixed(1)) : null,
        });
      }

      points.sort((a, b) => a.epoch - b.epoch);
      const nowEpoch = Math.floor(Date.now() / 1000);
      const validCurrentPoints = points.filter(p => Math.abs(p.epoch - nowEpoch) <= 3600);
      let currentPoint: MetNorwayPoint | null = null;
      if (validCurrentPoints.length > 0) {
        validCurrentPoints.sort((a, b) => Math.abs(a.epoch - nowEpoch) - Math.abs(b.epoch - nowEpoch));
        currentPoint = validCurrentPoints[0];
      }

      const expiresHeader = res.headers.get('expires');
      let ttlMs = 300000;
      if (expiresHeader) {
        const expiresEpoch = new Date(expiresHeader).getTime();
        if (Number.isFinite(expiresEpoch) && expiresEpoch > Date.now()) {
          ttlMs = Math.min(expiresEpoch - Date.now(), 3600000);
        }
      }

      const latencyMs = Math.max(0, Date.now() - startTime);
      const rejectedCount = validation.rejectedCount;
      const attemptStatus: 'SUCCESS' | 'PARTIAL' = (rejectedCount === 0 && currentPoint) ? 'SUCCESS' : 'PARTIAL';
      const result: MetNorwayForecastResponse = {
        success: true,
        provider: 'MET Norway (Meteorologisk institutt)',
        modelLineage: 'ECMWF HRES / MEPS (AEMET/MET Norway)',
        updatedAt: json.properties.meta.updated_at,
        points,
        current: currentPoint,
        rawPayload: json,
        servedFromCache: false,
        units: {
          temperature: '°C',
          windSpeed: 'km/h',
          windDirection: '°',
          cloudCover: '%',
          relativeHumidity: '%',
          airPressureSeaLevel: 'hPa (sea level, distinct from surface pressure)',
          precipitation: 'mm',
        },
        provenance: {
          source: 'https://api.met.no/weatherapi/locationforecast/2.0/',
          termsOfService: 'https://api.met.no/doc/TermsOfService',
          derivedVariables: ['windSpeedKmh = wind_speed (m/s) * 3.6'],
        },
        attempt: {
          id: 'met_norway_fallback',
          url,
          status: attemptStatus,
          httpStatus: res.status,
          latencyMs,
          payloadBytes,
          checkedAt: new Date().toISOString(),
          rejectedCount,
          acceptedCount: points.length,
          error: rejectedCount > 0 ? `${rejectedCount} titik prakiraan ditolak karena nilai tidak valid.` : undefined,
        },
      };

      if (signal?.aborted) throw new DOMException('Permintaan MET Norway dibatalkan.', 'AbortError');
      this.cache.set(cacheKey, { expiresAt: Date.now() + ttlMs, data: result });
      return result;
    } catch (err: any) {
      if (signal?.aborted && signal.reason !== 'timeout') throw err;
      const latencyMs = Math.max(0, Date.now() - startTime);
      const isTimeout = (timeoutCtrl.signal.aborted && !signal?.aborted) || signal?.reason === 'timeout';
      const errorMsg = isTimeout ? 'Batas waktu pengambilan data MET Norway terlampaui.' : (err instanceof Error ? err.message : String(err));
      return {
        success: false,
        provider: 'MET Norway (Meteorologisk institutt)',
        modelLineage: 'ECMWF HRES / MEPS (AEMET/MET Norway)',
        updatedAt: null,
        points: [],
        current: null,
        units: {
          temperature: '°C',
          windSpeed: 'km/h',
          windDirection: '°',
          cloudCover: '%',
          relativeHumidity: '%',
          airPressureSeaLevel: 'hPa (sea level, distinct from surface pressure)',
          precipitation: 'mm',
        },
        provenance: {
          source: 'https://api.met.no/weatherapi/locationforecast/2.0/',
          termsOfService: 'https://api.met.no/doc/TermsOfService',
          derivedVariables: ['windSpeedKmh = wind_speed (m/s) * 3.6'],
        },
        attempt: {
          id: 'met_norway_fallback',
          url,
          status: 'FAILED',
          httpStatus,
          latencyMs,
          payloadBytes,
          checkedAt: new Date().toISOString(),
          error: errorMsg,
        },
        error: errorMsg,
      };
    } finally {
      clearTimeout(timeoutId);
      signal?.removeEventListener('abort', onCallerAbort);
    }
  }
}

export const metNorwayService = new MetNorwayService();
