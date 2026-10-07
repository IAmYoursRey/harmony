import { weatherValue } from '../weatherValueValidation';
import { assertCoordinates, finiteNumber, validateCurrentWeather, fetchCheckedJson } from '../weatherDataIntegrity';
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
  private locationKey: string | null = null;
  private requestGeneration = 0;
  private activeController: AbortController | null = null;
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
    providerHealth: 'OFFLINE',
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
    assertCoordinates(lat, lng);
    const requestedKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const nowMs = Date.now();
    if (this.locationKey !== requestedKey) {
      this.activeController?.abort();
      this.requestGeneration++;
      this.inFlightPromise = null;
      this.locationKey = requestedKey;
      this.lastSuccessfulPayload = null;
      this.lastSuccessfulFetchIso = null;
      this.lastFetchTimeMs = 0;
      this.currentState = { ...this.currentState, data: null, freshness: null, dataTime: null, lastSuccessfulFetch: null, providerHealth: 'OFFLINE' };
    }

    // Concurrency guard: return running in-flight request if already active
    if (this.inFlightPromise) {
      await this.inFlightPromise;
      return this.currentState;
    }

    // If within 5 minutes and not forced, return current state
    if (!force && this.lastFetchTimeMs > 0 && nowMs - this.lastFetchTimeMs < MAP_REFRESH_INTERVAL_MS) {
      return this.currentState;
    }

    this.currentState = {
      ...this.currentState,
      isFetching: true,
      error: null,
    };
    this.notify();

    const generation = ++this.requestGeneration;
    const requestController = new AbortController();
    this.activeController = requestController;

    const fetchPromise = (async () => {
      const fetchedAtIso = new Date().toISOString();

      try {
        let payload: MapWeatherPayload | null = null;

        // 1. Try backend caching proxy first
        try {
          const backendUrl = `/api/spatial/weather/current?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}`;
          const { data: bJson } = await fetchCheckedJson('map_weather_proxy', backendUrl,
            d => d?.success && d?.data ? null : 'Proxy cuaca tidak tersedia.', { signal: requestController.signal }, 3000);
          if (bJson) {
            if (bJson.success && bJson.data) {
              const d = bJson.data;
              const required = ['temperature', 'apparentTemp', 'humidity', 'pressure', 'windSpeedKmh', 'windDirectionDeg', 'precipitationMm', 'weatherCode', 'dataIntervalSeconds'];
              if (!required.every(key => finiteNumber(d[key])) || d.dataIntervalSeconds <= 0 || !d.dataTime || !Number.isFinite(Date.parse(d.dataTime))) throw new Error('Payload proxy cuaca tidak lengkap/tidak valid.');
              if (Math.abs(Date.now() - Date.parse(d.dataTime)) > 10800000 || d.humidity < 0 || d.humidity > 100 || d.pressure <= 0 || d.windSpeedKmh < 0 || d.precipitationMm < 0 || d.windDirectionDeg < 0 || d.windDirectionDeg > 360) throw new Error('Waktu atau parameter proxy cuaca tidak valid.');
              const fieldMap: Record<string, string> = { temperature: 'temperature_2m', apparentTemp: 'apparent_temperature', humidity: 'relative_humidity_2m', pressure: 'surface_pressure', windSpeedKmh: 'wind_speed_10m', windDirectionDeg: 'wind_direction_10m', precipitationMm: 'precipitation', weatherCode: 'weather_code' };
              if (Object.entries(fieldMap).some(([key, field]) => weatherValue(field, d[key]) === null)) throw new Error('Parameter proxy cuaca di luar rentang yang valid.');
              const code = d.weatherCode;
              const pTimezone = d.providerTimezone || 'Asia/Jakarta';
              const pTzInfo = getTimezoneInfo(pTimezone, lng);
              const dataIntSec = d.dataIntervalSeconds;
              const dataStpMin = Math.round(dataIntSec / 60);

              payload = {
                temperature: d.temperature,
                apparentTemp: d.apparentTemp,
                humidity: d.humidity,
                pressure: d.pressure,
                windSpeedKmh: d.windSpeedKmh,
                windDirectionDeg: d.windDirectionDeg,
                precipitationMm: d.precipitationMm,
                weatherCode: code,
                weatherDesc: WMO_CODE_MAP[code] || 'Kondisi Atmosfer Terbuka',
                provider: d.provider || 'Open-Meteo',
                providerModel: d.providerModel || 'Open-Meteo Best Match',
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
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&timeformat=unixtime&timezone=auto`;
          const { data: json, attempt } = await fetchCheckedJson('map_weather_direct', url,
            d => validateCurrentWeather(d, lat, lng), { signal: requestController.signal }, 6000);
          if (!json) throw new Error(attempt.error || 'Data cuaca tidak tersedia.');
          const current = json.current;

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
          const code = current.weather_code;
          const dataIntervalSeconds = current.interval;
          const dataStepMinutes = Math.round(dataIntervalSeconds / 60);
          const dataIntervalMs = dataIntervalSeconds * 1000;

          payload = {
            temperature: current.temperature_2m,
            apparentTemp: current.apparent_temperature,
            humidity: current.relative_humidity_2m,
            pressure: Math.round(current.surface_pressure),
            windSpeedKmh: current.wind_speed_10m,
            windDirectionDeg: current.wind_direction_10m,
            precipitationMm: current.precipitation,
            weatherCode: code,
            weatherDesc: WMO_CODE_MAP[code] || 'Kondisi Atmosfer Terbuka',
            provider: 'Open-Meteo',
            providerModel: 'Open-Meteo Best Match',
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

        if (generation !== this.requestGeneration || requestController.signal.aborted) return null;
        this.lastSuccessfulPayload = payload;
        this.lastSuccessfulFetchIso = fetchedAtIso;
        this.lastFetchTimeMs = Date.now();

        const freshness = evaluateFreshness({
          dataTime: payload.dataTime,
          dataIntervalMs: payload.dataIntervalMs,
          lastCheckedAt: fetchedAtIso,
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
        if (generation !== this.requestGeneration || requestController.signal.aborted) return null;
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
        if (generation === this.requestGeneration) {
          this.inFlightPromise = null;
          this.activeController = null;
        }
      }
    })();

    this.inFlightPromise = fetchPromise;
    await fetchPromise;
    return this.currentState;
  }
}

export const mapWeatherLiveService = new MapWeatherLiveService();
