/**
 * Harmony Maps Operational Weather Live Service
 * 
 * Manages the 5-minute (300,000 ms) refresh lifecycle, in-flight concurrency guards,
 * failure cache retention, and strict timestamp separation for Harmony Maps.
 */

import {
  evaluateFreshness,
  FreshnessResult,
  getTimezoneInfo,
  MAP_REFRESH_INTERVAL_MS,
  DataClassification,
  ProviderHealth,
} from './mapFreshnessEngine';

export interface MapWeatherPayload {
  temperature: number;
  apparentTemp: number;
  humidity: number;
  pressure: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  precipitationMm: number;
  weatherCode: number;
  weatherDesc: string;
  provider: string;
  providerModel: string;
  classification: DataClassification;
  dataTime: string | null;
  observationTime?: string | null; // backward-compat alias
  dataIntervalSeconds: number;
  dataStepMinutes: number;
  dataIntervalMs: number;
  providerTimezone: string;
  timezoneAbbr: string;
  lastCheckedAt: string;
}

export interface MapWeatherState {
  data: MapWeatherPayload | null;
  freshness: FreshnessResult | null;
  dataTime: string | null;
  lastCheckedAt: string | null;
  fetchedAt: string | null; // backward-compat alias
  lastSuccessfulFetch: string | null;
  nextRefreshAt: string | null;
  isFetching: boolean;
  providerHealth: ProviderHealth;
  error: string | null;
}

const WMO_CODE_MAP: Record<number, string> = {
  0: 'Cerah',
  1: 'Cerah Berawan',
  2: 'Sebagian Berawan',
  3: 'Berawan Tebal',
  45: 'Berkabut',
  48: 'Kabut Tebal',
  51: 'Gerimis Ringan',
  53: 'Gerimis Sedang',
  55: 'Gerimis Lebat',
  56: 'Gerimis Dingin',
  57: 'Gerimis Dingin Lebat',
  61: 'Hujan Ringan',
  63: 'Hujan Sedang',
  65: 'Hujan Lebat',
  66: 'Hujan Dingin',
  67: 'Hujan Dingin Lebat',
  80: 'Hujan Rintik Lokal',
  81: 'Hujan Deras Lokal',
  82: 'Hujan Sangat Lebat',
  95: 'Badai Petir',
  96: 'Badai Petir Disertai Es',
  99: 'Badai Petir Hebat',
};

class MapWeatherLiveService {
  private inFlightPromise: Promise<MapWeatherPayload | null> | null = null;
  private lastSuccessfulPayload: MapWeatherPayload | null = null;
  private lastSuccessfulFetchIso: string | null = null;
  private lastFetchTimeMs = 0;
  private subscribers = new Set<(state: MapWeatherState) => void>();

  private currentState: MapWeatherState = {
    data: null,
    freshness: null,
    dataTime: null,
    lastCheckedAt: null,
    fetchedAt: null,
    lastSuccessfulFetch: null,
    nextRefreshAt: null,
    isFetching: false,
    providerHealth: 'ONLINE',
    error: null,
  };

  public getState(): MapWeatherState {
    return this.currentState;
  }

  public subscribe(callback: (state: MapWeatherState) => void): () => void {
    this.subscribers.add(callback);
    callback(this.currentState);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notify() {
    this.subscribers.forEach((cb) => cb(this.currentState));
  }

  /**
   * Fetches operational weather data with concurrency guard and failure caching.
   * Polling cadence is strictly 5 minutes (300,000 ms).
   */
  public async fetchWeather(
    lat: number,
    lng: number,
    force = false
  ): Promise<MapWeatherState> {
    const nowMs = Date.now();

    // Concurrency guard: return running in-flight request if already active
    if (this.inFlightPromise) {
      await this.inFlightPromise;
      return this.currentState;
    }

    // If within 5 minutes and not forced, return current state
    if (!force && this.currentState.data && nowMs - this.lastFetchTimeMs < MAP_REFRESH_INTERVAL_MS) {
      return this.currentState;
    }

    this.currentState = {
      ...this.currentState,
      isFetching: true,
      error: null,
    };
    this.notify();

    const fetchPromise = (async () => {
      const fetchedAtIso = new Date().toISOString();

      try {
        let payload: MapWeatherPayload | null = null;

        // 1. Try backend caching proxy first
        try {
          const backendUrl = `/api/spatial/weather/current?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}`;
          const bController = new AbortController();
          const bTimer = setTimeout(() => bController.abort(), 3000);
          const bRes = await fetch(backendUrl, { signal: bController.signal });
          clearTimeout(bTimer);

          if (bRes.ok) {
            const bJson = await bRes.json();
            if (bJson.success && bJson.data) {
              const d = bJson.data;
              const code = typeof d.weatherCode === 'number' ? d.weatherCode : 0;
              const pTimezone = d.providerTimezone || 'Asia/Jakarta';
              const pTzInfo = getTimezoneInfo(pTimezone, lng);
              const dataIntSec = typeof d.dataIntervalSeconds === 'number' ? d.dataIntervalSeconds : 900;
              const dataStpMin = Math.round(dataIntSec / 60);

              payload = {
                temperature: typeof d.temperature === 'number' ? d.temperature : 28.0,
                apparentTemp: typeof d.apparentTemp === 'number' ? d.apparentTemp : 30.0,
                humidity: typeof d.humidity === 'number' ? d.humidity : 70,
                pressure: typeof d.pressure === 'number' ? d.pressure : 1013,
                windSpeedKmh: typeof d.windSpeedKmh === 'number' ? d.windSpeedKmh : 10.0,
                windDirectionDeg: typeof d.windDirectionDeg === 'number' ? d.windDirectionDeg : 180,
                precipitationMm: typeof d.precipitationMm === 'number' ? d.precipitationMm : 0.0,
                weatherCode: code,
                weatherDesc: WMO_CODE_MAP[code] || 'Kondisi Atmosfer Terbuka',
                provider: d.provider || 'Open-Meteo',
                providerModel: d.providerModel || 'NWP Multi-Model Ensemble (ECMWF, GFS, ICON, JMA)',
                classification: 'MODEL',
                dataTime: d.dataTime || d.observationTime || null,
                observationTime: d.dataTime || d.observationTime || null,
                dataIntervalSeconds: dataIntSec,
                dataStepMinutes: dataStpMin,
                dataIntervalMs: dataIntSec * 1000,
                providerTimezone: pTimezone,
                timezoneAbbr: pTzInfo.abbr,
                lastCheckedAt: d.lastCheckedAt || fetchedAtIso,
              };
            }
          }
        } catch {
          // Non-blocking: will fallback to direct upstream fetch
        }

        // 2. Direct upstream fetch fallback if backend proxy did not resolve
        if (!payload) {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m&timeformat=unixtime&timezone=auto`;
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 6000);

          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timer);

          if (!res.ok) {
            throw new Error(`Provider returned HTTP ${res.status}`);
          }

          const json = await res.json();
          const current = json.current;
          if (!current) {
            throw new Error('Provider response missing current weather block');
          }

          // Authoritative provider timestamp: with timeformat=unixtime, current.time is unix epoch in seconds.
          let dataTimeUtc: string | null = null;
          if (typeof current.time === 'number' && !isNaN(current.time)) {
            dataTimeUtc = new Date(current.time * 1000).toISOString();
          } else if (typeof current.time === 'string' && current.time.trim().length > 0) {
            const parsed = new Date(current.time);
            if (!isNaN(parsed.getTime())) {
              dataTimeUtc = parsed.toISOString();
            }
          }

          const providerTimezone = json.timezone || 'Asia/Jakarta';
          const pTzInfo = getTimezoneInfo(providerTimezone, lng);
          const code = typeof current.weather_code === 'number' ? current.weather_code : 0;
          const dataIntervalSeconds = typeof current.interval === 'number' ? current.interval : 900;
          const dataStepMinutes = Math.round(dataIntervalSeconds / 60);
          const dataIntervalMs = dataIntervalSeconds * 1000;

          payload = {
            temperature: typeof current.temperature_2m === 'number' ? current.temperature_2m : 28.0,
            apparentTemp: typeof current.apparent_temperature === 'number' ? current.apparent_temperature : 30.0,
            humidity: typeof current.relative_humidity_2m === 'number' ? current.relative_humidity_2m : 70,
            pressure: typeof current.surface_pressure === 'number' ? Math.round(current.surface_pressure) : 1013,
            windSpeedKmh: typeof current.wind_speed_10m === 'number' ? current.wind_speed_10m : 10.0,
            windDirectionDeg: typeof current.wind_direction_10m === 'number' ? current.wind_direction_10m : 180,
            precipitationMm: typeof current.precipitation === 'number' ? current.precipitation : 0.0,
            weatherCode: code,
            weatherDesc: WMO_CODE_MAP[code] || 'Kondisi Atmosfer Terbuka',
            provider: 'Open-Meteo',
            providerModel: 'NWP Multi-Model (ECMWF, GFS, ICON, JMA)',
            classification: 'MODEL',
            dataTime: dataTimeUtc,
            observationTime: dataTimeUtc,
            dataIntervalSeconds,
            dataStepMinutes,
            dataIntervalMs,
            providerTimezone,
            timezoneAbbr: pTzInfo.abbr,
            lastCheckedAt: fetchedAtIso,
          };
        }

        this.lastSuccessfulPayload = payload;
        this.lastSuccessfulFetchIso = fetchedAtIso;
        this.lastFetchTimeMs = Date.now();

        const freshness = evaluateFreshness({
          dataTime: payload.dataTime,
          lastCheckedAt: fetchedAtIso,
          dataIntervalMs: payload.dataIntervalMs,
          isFromCache: false,
          providerHealth: 'ONLINE',
          tz: payload.providerTimezone,
        });

        const nextRefreshIso = new Date(Date.now() + MAP_REFRESH_INTERVAL_MS).toISOString();

        this.currentState = {
          data: payload,
          freshness,
          dataTime: payload.dataTime,
          lastCheckedAt: fetchedAtIso,
          fetchedAt: fetchedAtIso,
          lastSuccessfulFetch: fetchedAtIso,
          nextRefreshAt: nextRefreshIso,
          isFetching: false,
          providerHealth: 'ONLINE',
          error: null,
        };
        this.notify();
        return payload;
      } catch (err: any) {
        // Failure preservation: do not reset weather to zero. Retain last known data as CACHED.
        const errorMsg = err?.message || 'Gagal menghubungi penyedia cuaca';
        this.lastFetchTimeMs = Date.now();

        if (this.lastSuccessfulPayload) {
          const cachedFreshness = evaluateFreshness({
            dataTime: this.lastSuccessfulPayload.dataTime,
            lastCheckedAt: fetchedAtIso,
            dataIntervalMs: this.lastSuccessfulPayload.dataIntervalMs,
            isFromCache: true,
            providerHealth: 'DEGRADED',
            tz: this.lastSuccessfulPayload.providerTimezone,
          });

          const nextRefreshIso = new Date(Date.now() + MAP_REFRESH_INTERVAL_MS).toISOString();

          this.currentState = {
            data: this.lastSuccessfulPayload,
            freshness: cachedFreshness,
            dataTime: this.lastSuccessfulPayload.dataTime,
            lastCheckedAt: fetchedAtIso,
            fetchedAt: fetchedAtIso,
            lastSuccessfulFetch: this.lastSuccessfulFetchIso,
            nextRefreshAt: nextRefreshIso,
            isFetching: false,
            providerHealth: 'DEGRADED',
            error: errorMsg,
          };
        } else {
          // No prior data: unavailable
          const nextRefreshIso = new Date(Date.now() + MAP_REFRESH_INTERVAL_MS).toISOString();
          const fallbackTzInfo = getTimezoneInfo(null, lng);
          this.currentState = {
            data: null,
            freshness: evaluateFreshness({
              dataTime: null,
              lastCheckedAt: fetchedAtIso,
              dataIntervalMs: null,
              isFromCache: false,
              providerHealth: 'OFFLINE',
              tz: fallbackTzInfo.tz,
            }),
            dataTime: null,
            lastCheckedAt: fetchedAtIso,
            fetchedAt: fetchedAtIso,
            lastSuccessfulFetch: null,
            nextRefreshAt: nextRefreshIso,
            isFetching: false,
            providerHealth: 'OFFLINE',
            error: errorMsg,
          };
        }

        this.notify();
        return null;
      } finally {
        this.inFlightPromise = null;
      }
    })();

    this.inFlightPromise = fetchPromise;
    await fetchPromise;
    return this.currentState;
  }
}

export const mapWeatherLiveService = new MapWeatherLiveService();
