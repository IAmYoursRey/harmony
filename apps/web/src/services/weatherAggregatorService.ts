import { assertCoordinates, finiteNumber, fetchCheckedJson, validateCurrentWeather, validateOpenMeteoModelPayload, type SourceFetchAttempt } from './weatherDataIntegrity';
import {
  atmosphericNwpAiService,
  AiNwpVerificationResult,
} from './atmosphericNwpAiService';
import { geospatialDataTelemetryService } from './geospatialDataTelemetryService';
import {
  cloudThermodynamicsEngine,
  CloudThermodynamicsResult,
} from './cloudThermodynamicsEngine';
import { metNorwayService } from './metNorwayService';
import { increasingForecastTimes, weatherValue, validateAirQuality } from './weatherValueValidation';

export interface WeatherModelValue {
  modelId?: string;
  dataTime?: string;
  modelName: string;
  sourceFlag: string;
  temperature: number;
  country?: string;
  agency?: string;
  category?: 'ASEAN_NEIGHBOR' | 'INDO_PACIFIC' | 'GLOBAL_TOP_NWP';
  resolution?: string;
  notes?: string;
}

export interface WeatherHourlyPoint {
  time: string;
  hour: number;
  label: string;
  temperature: number;
  apparentTemp?: number | null;
  ecmwfTemp?: number;
  gfsTemp?: number;
  iconTemp?: number;
  jmaTemp?: number;
  humidity: number;
  precipitation: number | null;
  precipitationProb: number | null;
  cloudCover?: number | null;
  conditionCode?: number | null;
  conditionText?: string;
  pressure?: number | null;
  seaLevelPressure?: number | null;
  windSpeed?: number | null;
  windGusts?: number | null;
  windDirection?: number | null;
  pm25: number | null;
  ozone: number | null;
  uvIndex: number | null;
}

export interface WeatherDailyPoint {
  date: string;
  dayName: string;
  tempMax: number;
  tempMin: number;
  ecmwfTempMax?: number;
  gfsTempMax?: number;
  iconTempMax?: number;
  precipitationSum: number;
  precipitationProbMax: number | null;
  windSpeedMax: number;
  apparentTempMax?: number | null;
  windGustMax?: number | null;
  uvIndexMax: number | null;
  condition: string;
}

export interface WeatherCurrentData {
  consensusTemperature: number | null;
  apparentTemperature: number | null;
  tempMin: number | null;
  tempMax: number | null;
  confidenceScore: number | null;
  humidity: number | null;
  precipitation: number | null;
  precipitationProb: number | null;
  cloudCover?: number | null;
  pressure: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  windGusts: number | null;
  conditionCode: number | null;
  conditionText: string;
  
  pm25: number | null;
  pm10: number | null;
  ozone: number | null;
  uvIndex: number | null;
  aqiLevel: 'Sangat Baik' | 'Baik' | 'Sedang' | 'Tidak Sehat' | 'Berbahaya' | 'Tidak Tersedia';
  aqiColor: string;
}

export interface WeatherConsensusData {
  locationName: string;
  lat: number;
  lng: number;
  elevation: number;
  timestamp: string;
  timezone: string;
  
  dataStatus: 'AVAILABLE' | 'PARTIAL';
  dataTime: string;
  fetchedAt: string;
  servedFromCache?: boolean;
  sourceFetches: SourceFetchAttempt[];
  modelSpread: number | null;
  accuracyValidated: false;
  coverageScope: string;

  current: WeatherCurrentData | null;
  modelComparison: WeatherModelValue[];

  sources: {
    id: string;
    name: string;
    origin: string;
    type: string;
    status: 'online' | 'active';
  }[];

  hourly: WeatherHourlyPoint[];
  extendedHourly?: WeatherHourlyPoint[];
  daily: WeatherDailyPoint[];
  historicalAirQuality?: Array<{
    time: string;
    pm25: number | null;
    pm10: number | null;
    ozone: number | null;
  }>;

  cloudThermodynamics?: CloudThermodynamicsResult;

  aiBriefing: {
    summaryText: string;
    peakExtremeHour?: string;
    hazardAlert?: string;
    preparednessAdvice: string[];
  };

  aiNwpVerification?: AiNwpVerificationResult;
}

export function getWeatherConditionText(code: number): string {
  if (code === 0) return 'Cerah';
  if (code === 1) return 'Cerah Berawan';
  if (code === 2) return 'Sebagian Berawan';
  if (code === 3) return 'Berawan Tebal';
  if (code >= 45 && code <= 48) return 'Berkabut / Udara Kabur';
  if (code >= 51 && code <= 55) return 'Gerimis Ringan';
  if (code === 56 || code === 57) return 'Gerimis Dingin';
  if (code === 61) return 'Hujan Ringan';
  if (code === 63) return 'Hujan Sedang';
  if (code === 65) return 'Hujan Lebat';
  if (code === 66 || code === 67) return 'Hujan Dingin';
  if (code === 71) return 'Salju Ringan';
  if (code === 73) return 'Salju Sedang';
  if (code === 75) return 'Salju Lebat';
  if (code === 77) return 'Butiran Salju';
  if (code === 85 || code === 86) return 'Hujan Salju';
  if (code >= 80 && code <= 82) return 'Hujan Guyuran Lokal';
  if (code >= 95) return 'Hujan Badai Petir';
  return 'Kondisi belum dikenali';
}

export function mapMetSymbolToWmo(symbolCode?: string | null): number | null {
  if (!symbolCode) return null;
  const s = symbolCode.toLowerCase();
  if (s.includes('clearsky') || s.includes('fair')) return 0;
  if (s.includes('partlycloudy')) return 1;
  if (s.includes('cloudy')) return 3;
  if (s.includes('fog')) return 45;
  if (s.includes('heavyrainshowers_and_thunder') || s.includes('rainandthunder') || s.includes('thunder')) return 95;
  if (s.includes('heavyrain')) return 65;
  if (s.includes('rainshowers') || s.includes('rain')) return 61;
  if (s.includes('sleet')) return 68;
  if (s.includes('snow')) return 71;
  return null;
}

export function formatMetSymbolText(symbolCode?: string | null): string {
  if (!symbolCode) return 'Data Simbol Tidak Tersedia';
  const s = symbolCode.toLowerCase();
  if (s.includes('clearsky')) return 'Langit Cerah (MET Norway)';
  if (s.includes('fair')) return 'Cerah / Sedikit Berawan (MET Norway)';
  if (s.includes('partlycloudy')) return 'Sebagian Berawan (MET Norway)';
  if (s.includes('cloudy')) return 'Berawan (MET Norway)';
  if (s.includes('fog')) return 'Kabut (MET Norway)';
  if (s.includes('thunder')) return 'Hujan Petir (MET Norway)';
  if (s.includes('heavyrain')) return 'Hujan Lebat (MET Norway)';
  if (s.includes('rain')) return 'Hujan (MET Norway)';
  if (s.includes('sleet')) return 'Hujan Es / Sleet (MET Norway)';
  if (s.includes('snow')) return 'Salju (MET Norway)';
  return `${symbolCode} (MET Norway)`;
}

export function computeAqiLevel(
  pm25: number | null,
  pm10: number | null,
  ozone: number | null
): { level: 'Sangat Baik' | 'Baik' | 'Sedang' | 'Tidak Sehat' | 'Berbahaya' | 'Tidak Tersedia'; color: string } {
  if (typeof pm25 === 'number' && Number.isFinite(pm25)) {
    if (pm25 <= 15.5) return { level: 'Baik', color: '#10b981' };
    if (pm25 <= 55.4) return { level: 'Sedang', color: '#3b82f6' };
    if (pm25 <= 150.4) return { level: 'Tidak Sehat', color: '#f59e0b' };
    return { level: 'Berbahaya', color: '#ef4444' };
  }
  if (typeof pm10 === 'number' && Number.isFinite(pm10)) {
    if (pm10 <= 50) return { level: 'Baik', color: '#10b981' };
    if (pm10 <= 150) return { level: 'Sedang', color: '#3b82f6' };
    if (pm10 <= 350) return { level: 'Tidak Sehat', color: '#f59e0b' };
    return { level: 'Berbahaya', color: '#ef4444' };
  }
  if (typeof ozone === 'number' && Number.isFinite(ozone)) {
    if (ozone <= 120) return { level: 'Baik', color: '#10b981' };
    if (ozone <= 235) return { level: 'Sedang', color: '#3b82f6' };
    return { level: 'Tidak Sehat', color: '#f59e0b' };
  }
  return { level: 'Tidak Tersedia', color: '#94a3b8' };
}

export function formatPointLabel(isoOrEpoch: string | number, timezone: string): { hour: number; label: string } {
  const date = typeof isoOrEpoch === 'number' ? new Date(isoOrEpoch * 1000) : new Date(isoOrEpoch);
  let hourStr = '00';
  let minuteStr = '00';
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
    hourStr = parts.find(p => p.type === 'hour')?.value || '00';
    minuteStr = parts.find(p => p.type === 'minute')?.value || '00';
  } catch {
    hourStr = String(date.getUTCHours()).padStart(2, '0');
    minuteStr = String(date.getUTCMinutes()).padStart(2, '0');
  }
  const hour = parseInt(hourStr, 10);
  return { hour, label: `${hourStr}:${minuteStr}` };
}

export const WEATHER_MODELS = [
  { id: 'ecmwf_ifs025', name: 'ECMWF IFS 0.25°', country: 'Uni Eropa', flag: '🇪🇺' },
  { id: 'gfs_seamless', name: 'NOAA GFS', country: 'Amerika Serikat', flag: '🇺🇸' },
  { id: 'icon_seamless', name: 'DWD ICON', country: 'Jerman', flag: '🇩🇪' },
  { id: 'jma_seamless', name: 'JMA', country: 'Jepang', flag: '🇯🇵' },
  { id: 'bom_access_global', name: 'BoM ACCESS-G', country: 'Australia', flag: '🇦🇺' },
  { id: 'cma_grapes_global', name: 'CMA GRAPES', country: 'Tiongkok', flag: '🇨🇳' },
  { id: 'meteofrance_seamless', name: 'Météo-France', country: 'Prancis', flag: '🇫🇷' },
  { id: 'ukmo_seamless', name: 'UK Met Office', country: 'Britania Raya', flag: '🇬🇧' },
  { id: 'gem_seamless', name: 'CMC GEM', country: 'Kanada', flag: '🇨🇦' },
];

const nullableNumber = (value: unknown): number | null => finiteNumber(value) ? value : null;
const epochIso = (epoch: number) => new Date(epoch * 1000).toISOString();
const localHour = (epoch: number, timezone: string) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', hourCycle: 'h23' }).format(epoch * 1000));

class WeatherAggregatorService {
  private cache = new Map<string, { data: WeatherConsensusData; timestamp: number }>();
  private inFlight = new Map<string, Promise<WeatherConsensusData>>();
  private CACHE_TTL_MS = 5 * 60 * 1000;

  public async fetchConsensusWeather(lat: number, lng: number, placeName?: string, forceRefresh = false): Promise<WeatherConsensusData> {
    assertCoordinates(lat, lng);
    const key = `provider=open_meteo:models=${WEATHER_MODELS.map(m => m.id).join(',')}:lat=${lat}:lng=${lng}`;
    if (forceRefresh) {
      this.cache.delete(key);
    }
    const cached = this.cache.get(key);
    if (!forceRefresh && cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      geospatialDataTelemetryService.addLog('INFO', 'CACHE', 'Menggunakan data cuaca tersimpan; tidak ada pengambilan baru.', { dataTime: cached.data.dataTime, fetchedAt: cached.data.fetchedAt });
      return { ...cached.data, locationName: placeName || cached.data.locationName, servedFromCache: true };
    }
    const existing = this.inFlight.get(key);
    if (existing) return existing;
    const pending = this.fetchFromSources(lat, lng, placeName, key).then(data => {
      this.cache.set(key, { data, timestamp: Date.now() });
      return data;
    }).finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, pending);
    return pending;
  }

  private async fetchFromSources(lat: number, lng: number, placeName?: string, queryKey?: string): Promise<WeatherConsensusData> {
    const coordinates = `latitude=${lat}&longitude=${lng}&timezone=auto&timeformat=unixtime`;
    const currentFields = 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m';
    const hourlyFields = 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index';
    const dailyFields = 'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,uv_index_max';
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?${coordinates}&current=${currentFields}&hourly=${hourlyFields}&daily=${dailyFields}&forecast_days=14`;
    const modelUrl = `https://api.open-meteo.com/v1/forecast?${coordinates}&hourly=temperature_2m&forecast_days=14&models=${WEATHER_MODELS.map(m => m.id).join(',')}`;
    const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?${coordinates}&current=pm10,pm2_5,ozone&hourly=pm10,pm2_5,ozone&past_days=1&forecast_days=7`;
    const [weather, models, air] = await Promise.all([
      fetchCheckedJson('open_meteo_weather', weatherUrl, d => {
        const error = validateCurrentWeather(d, lat, lng);
        if (error) return error;
        if (!increasingForecastTimes(d.hourly?.time) || !d.hourly.time.some((t: number) => t <= d.current.time && d.current.time - t < 3600)) return 'Deret prakiraan tidak berurutan atau tidak mencakup waktu cuaca saat ini.';
        return null;
      }),
      fetchCheckedJson('open_meteo_models', modelUrl, d => {
        const v = validateOpenMeteoModelPayload(d, lat, lng);
        if (!v.valid) return v.error || 'Permintaan model gagal.';
        if (v.status === 'PARTIAL') {
          return { partial: true, message: v.error || 'Sebagian model tidak tersedia atau tidak valid.', acceptedCount: v.acceptedCount, rejectedCount: v.rejectedCount } as any;
        }
        return null;
      }),
      fetchCheckedJson('open_meteo_air', airUrl, d => validateAirQuality(d, lat, lng)),
    ]);
    const attempts = [weather.attempt, models.attempt, air.attempt];
    if (air.data) {
      const raw = air.data;
      const fields = ['pm2_5', 'pm10', 'ozone'];
      const invalidCurrent = fields.some(k => weatherValue(k, raw.current[k]) === null);
      const hourly = increasingForecastTimes(raw.hourly?.time) ? {
        time: raw.hourly.time,
        ...Object.fromEntries(fields.map(k => [k, raw.hourly.time.map((_: number, i: number) => weatherValue(k, raw.hourly[k]?.[i]))])),
      } : { time: [] };
      const validHourlyCounts = fields.map(k => (hourly as any)[k]?.filter((v: number | null) => v !== null).length || 0);
      const incomplete = invalidCurrent || !hourly.time.length || validHourlyCounts.some(count => count < 24);
      if (incomplete) { air.attempt.status = 'PARTIAL'; air.attempt.error = 'Sebagian nilai atau deret kualitas udara tidak tersedia/tidak valid.'; }
      air.data = { ...raw, current: { ...raw.current, ...Object.fromEntries(fields.map(k => [k, weatherValue(k, raw.current[k])])) }, hourly };
    }

    let modelResult = models;
    // A rejected batch must not disable any registered model. Retry missing or
    // invalid series independently, then join only validated values by epoch.
    const initialHourly = modelResult.data?.hourly || {};
    const retryModels = WEATHER_MODELS.filter(m => {
      const values = initialHourly[`temperature_2m_${m.id}`];
      if (!Array.isArray(values)) return true;
      if (values.length > 0 && values.every(v => v === null)) return false;
      return values.some(v => !finiteNumber(v) || v < -100 || v > 65);
    });
    if (retryModels.length) {
      const individual: Array<{ model: typeof WEATHER_MODELS[number]; data: any; attempt: SourceFetchAttempt }> = [];
      // Limit retries to three concurrent requests to avoid a burst against the
      // shared provider quota. Failed attempts remain visible in the audit.
      for (let offset = 0; offset < retryModels.length; offset += 3) {
        const batch = await Promise.all(retryModels.slice(offset, offset + 3).map(async m => {
          const url = `https://api.open-meteo.com/v1/forecast?${coordinates}&hourly=temperature_2m&forecast_days=14&models=${m.id}`;
          const endpointId = ({ bom_access_global: 'open_meteo_model_bom', cma_grapes_global: 'open_meteo_model_cma', jma_seamless: 'open_meteo_model_jma' } as Record<string, string>)[m.id] || `open_meteo_model_${m.id}`;
          const result = await fetchCheckedJson(endpointId, url, d => {
            const v = validateOpenMeteoModelPayload(d, lat, lng, m.id);
            if (!v.valid) return v.error || 'Model tidak tersedia.';
            return v.status === 'PARTIAL' ? { partial: true, message: v.error || 'Sebagian titik model ditolak.', acceptedCount: v.acceptedCount, rejectedCount: v.rejectedCount } : null;
          }, {}, 6000);
          return { model: m, ...result };
        }));
        individual.push(...batch);
      }
      attempts.push(...individual.map(r => r.attempt));
      const toEpoch = (t: string | number): number => typeof t === 'number' ? (t > 1e11 ? Math.floor(t / 1000) : t) : Math.floor(Date.parse(t) / 1000);
      const times: number[] = [...new Set<number>([
        ...(initialHourly.time || []).map(toEpoch),
        ...individual.flatMap(r => (r.data?.hourly?.time || []).map(toEpoch)),
      ])].sort((a, b) => a - b);
      const joined: Record<string, any> = { time: times };
      for (const m of WEATHER_MODELS) {
        const key = `temperature_2m_${m.id}`;
        const values = new Map<number, number>();
        (initialHourly.time || []).forEach((t: number | string, i: number) => {
          const v = initialHourly[key]?.[i];
          if (finiteNumber(v) && v >= -100 && v <= 65) values.set(toEpoch(t), v);
        });
        const retry = individual.find(r => r.model.id === m.id && r.data);
        if (retry) {
          (retry.data.hourly.time || []).forEach((t: number | string, i: number) => {
            const v = (retry.data.hourly[key] || retry.data.hourly.temperature_2m)?.[i];
            if (finiteNumber(v) && v >= -100 && v <= 65) values.set(toEpoch(t), v);
          });
        }
        if (values.size) joined[key] = times.map(t => values.get(t) ?? null);
      }
      // No new SUCCESS attempt is invented for the in-memory merge.
      modelResult = { data: times.length ? { hourly: joined } : null, attempt: models.attempt };
    } else if (modelResult.data) {
      const times = modelResult.data.hourly.time.map((t: string | number) => typeof t === 'number' ? (t > 1e11 ? Math.floor(t / 1000) : t) : Math.floor(Date.parse(t) / 1000));
      modelResult = { ...modelResult, data: { ...modelResult.data, hourly: { ...modelResult.data.hourly, time: times } } };
    }

    if (!weather.data) {
      try {
        const met = await metNorwayService.fetchForecast(lat, lng);
        if (met.attempt) {
          attempts.push(met.attempt);
        }

        if (met.success) {
          const timezone = 'UTC';
          const modelHourly = modelResult.data?.hourly || {};
          const modelTimes: number[] = Array.isArray(modelHourly.time) ? modelHourly.time : [];
          const targetEpoch = met.current?.epoch || (met.points[0]?.epoch ?? Math.floor(Date.now() / 1000));
          const modelHourIndex = modelTimes.findIndex(t => Math.abs(t - targetEpoch) < 3600);
          const modelComparison: WeatherModelValue[] = modelHourIndex >= 0 ? WEATHER_MODELS.flatMap(m => {
            const temperature = modelHourly[`temperature_2m_${m.id}`]?.[modelHourIndex];
            return (finiteNumber(temperature) && temperature >= -100 && temperature <= 65) ? [{
              modelId: m.id,
              modelName: m.name,
              sourceFlag: m.flag,
              country: m.country,
              agency: `${m.name} melalui Open-Meteo`,
              category: 'GLOBAL_TOP_NWP' as const,
              temperature,
              dataTime: epochIso(modelTimes[modelHourIndex]),
              notes: 'Prakiraan model pada koordinat pilihan; bukan pengamatan langsung.',
            }] : [];
          }) : [];

          if (modelResult.data && modelResult.attempt.status !== 'FAILED') {
            if (modelComparison.length >= 7) {
              modelResult.attempt.status = 'SUCCESS';
              modelResult.attempt.error = undefined;
            } else if (modelComparison.length > 0) {
              modelResult.attempt.status = 'PARTIAL';
              const missing = WEATHER_MODELS.filter(m => !modelComparison.some(v => v.modelId === m.id)).map(m => m.name);
              modelResult.attempt.error = `Tersedia ${modelComparison.length} dari ${WEATHER_MODELS.length} model pada waktu yang sama. Tidak tersedia: ${missing.join(", ")}.`;
            } else {
              modelResult.attempt.status = 'FAILED';
              modelResult.attempt.error = 'Tidak ada model cuaca numerik yang tersedia.';
            }
          }

          if (air.data) {
            const airEpoch = air.data.current?.time;
            if (!finiteNumber(airEpoch) || Math.abs(airEpoch - targetEpoch) >= 3600) {
              air.attempt.status = 'FAILED';
              air.attempt.error = 'Waktu kualitas udara tidak sesuai waktu cuaca cadangan.';
              air.data = null;
            }
          }

          const aq = air.data?.current || {};
          const airValue = (value: unknown) => finiteNumber(value) && value >= 0 ? value : null;
          const pm25 = air.data ? airValue(aq.pm2_5) : null;
          const pm10 = air.data ? airValue(aq.pm10) : null;
          const ozone = air.data ? airValue(aq.ozone) : null;

          const airHourly = air.data?.hourly || {};
          const pastAirIndices = (Array.isArray(airHourly.time) ? airHourly.time : [])
            .map((t: number, idx: number) => ({ time: t, index: idx }))
            .filter((p: { time: number; index: number }) => finiteNumber(p.time) && p.time <= targetEpoch && p.time > targetEpoch - 24 * 3600);
          const historicalAirQuality = pastAirIndices.map((p: { time: number; index: number }) => ({
            time: epochIso(p.time),
            pm25: nullableNumber(airHourly.pm2_5?.[p.index]),
            pm10: nullableNumber(airHourly.pm10?.[p.index]),
            ozone: nullableNumber(airHourly.ozone?.[p.index]),
          }));

          const sources: WeatherConsensusData['sources'] = [
            { id: 'met_norway', name: 'MET Norway (Fallback)', origin: 'Norwegia', type: 'Prakiraan MEPS / HRES', status: 'online' },
            ...modelComparison.map(m => ({ id: m.modelId!, name: m.modelName, origin: m.country!, type: 'Model melalui Open-Meteo', status: 'online' as const })),
            ...(air.data ? [{ id: 'cams', name: 'Copernicus CAMS melalui Open-Meteo', origin: 'Koordinat pilihan', type: 'Prakiraan kualitas udara', status: 'online' as const }] : []),
          ];

          let currentBlock: WeatherCurrentData | null = null;
          if (met.current) {
            currentBlock = {
              consensusTemperature: met.current.temperatureC,
              apparentTemperature: null,
              tempMin: null,
              tempMax: null,
              confidenceScore: null,
              humidity: met.current.relativeHumidityPct,
              precipitation: met.current.precipitationNext1hMm,
              precipitationProb: null,
              cloudCover: met.current.cloudAreaFractionPct,
              pressure: null,
              windSpeed: met.current.windSpeedKmh,
              windDirection: met.current.windFromDirectionDeg,
              windGusts: met.current.windGustsKmh ?? null,
              conditionCode: mapMetSymbolToWmo(met.current.symbolCode),
              conditionText: formatMetSymbolText(met.current.symbolCode),
              pm25,
              pm10,
              ozone,
              uvIndex: null,
              aqiLevel: computeAqiLevel(pm25, pm10, ozone).level,
              aqiColor: computeAqiLevel(pm25, pm10, ozone).color,
            };
          }

          const fallbackData: WeatherConsensusData = {
            locationName: placeName || `Koordinat (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
            lat,
            lng,
            elevation: 0,
            timestamp: new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date()),
            timezone,
            dataTime: met.current?.time || (met.points[0]?.time ?? new Date().toISOString()),
            fetchedAt: new Date().toISOString(),
            sourceFetches: attempts,
            dataStatus: 'PARTIAL',
            modelSpread: modelComparison.length > 1 ? Math.max(...modelComparison.map(m => m.temperature)) - Math.min(...modelComparison.map(m => m.temperature)) : null,
            accuracyValidated: false,
            coverageScope: 'Data fallback MET Norway; sumber primer Open-Meteo mengalami gangguan.',
            historicalAirQuality,
            current: currentBlock,
            modelComparison,
            sources,
            hourly: (met.points || []).slice(0, 24).map((p) => {
              const { hour, label } = formatPointLabel(p.time, timezone);
              const mIdx = modelTimes.findIndex(t => Math.abs(t - p.epoch) < 1800);
              const getModel = (id: string) => {
                if (mIdx < 0) return undefined;
                const v = modelHourly[`temperature_2m_${id}`]?.[mIdx];
                return (finiteNumber(v) && v >= -100 && v <= 65) ? v : undefined;
              };
              const aIdx = (airHourly.time || []).findIndex((t: number) => Math.abs(t - p.epoch) < 1800);
              return {
                time: p.time,
                hour,
                label,
                temperature: p.temperatureC,
                apparentTemp: null,
                humidity: p.relativeHumidityPct,
                precipitation: p.precipitationNext1hMm,
                precipitationProb: null,
                cloudCover: p.cloudAreaFractionPct,
                pressure: null,
                seaLevelPressure: p.airPressureSeaLevelHpa,
                windSpeed: p.windSpeedKmh,
                windDirection: p.windFromDirectionDeg,
                windGusts: p.windGustsKmh ?? null,
                conditionCode: mapMetSymbolToWmo(p.symbolCode),
                conditionText: p.symbolCode || 'Tidak Diketahui',
                ecmwfTemp: getModel('ecmwf_ifs025'),
                gfsTemp: getModel('gfs_seamless'),
                iconTemp: getModel('icon_seamless'),
                jmaTemp: getModel('jma_seamless'),
                pm25: nullableNumber(airHourly.pm2_5?.[aIdx]),
                ozone: nullableNumber(airHourly.ozone?.[aIdx]),
                uvIndex: null,
              };
            }),
            extendedHourly: (met.points || []).map((p) => {
              const { hour, label } = formatPointLabel(p.time, timezone);
              const mIdx = modelTimes.findIndex(t => Math.abs(t - p.epoch) < 1800);
              const getModel = (id: string) => {
                if (mIdx < 0) return undefined;
                const v = modelHourly[`temperature_2m_${id}`]?.[mIdx];
                return (finiteNumber(v) && v >= -100 && v <= 65) ? v : undefined;
              };
              const aIdx = (airHourly.time || []).findIndex((t: number) => Math.abs(t - p.epoch) < 1800);
              return {
                time: p.time,
                hour,
                label,
                temperature: p.temperatureC,
                apparentTemp: null,
                humidity: p.relativeHumidityPct,
                precipitation: p.precipitationNext1hMm,
                precipitationProb: null,
                cloudCover: p.cloudAreaFractionPct,
                pressure: null,
                seaLevelPressure: p.airPressureSeaLevelHpa,
                windSpeed: p.windSpeedKmh,
                windDirection: p.windFromDirectionDeg,
                windGusts: p.windGustsKmh ?? null,
                conditionCode: mapMetSymbolToWmo(p.symbolCode),
                conditionText: p.symbolCode || 'Tidak Diketahui',
                ecmwfTemp: getModel('ecmwf_ifs025'),
                gfsTemp: getModel('gfs_seamless'),
                iconTemp: getModel('icon_seamless'),
                jmaTemp: getModel('jma_seamless'),
                pm25: nullableNumber(airHourly.pm2_5?.[aIdx]),
                ozone: nullableNumber(airHourly.ozone?.[aIdx]),
                uvIndex: null,
              };
            }),
            daily: [],
            aiBriefing: {
              summaryText: currentBlock ? `Prakiraan cuaca disediakan oleh penyedia cadangan MET Norway (${currentBlock.conditionText}, suhu ${currentBlock.consensusTemperature}°C).` : 'Prakiraan cuaca saat ini tidak tersedia dari MET Norway; deret masa depan ditampilkan.',
              preparednessAdvice: ['Data fallback operasional; periksa pembaruan berikutnya saat sumber primer kembali aktif.'],
            },
          };
          const rawWeatherForTelemetry = {
            provider: 'met_norway',
            fallback: 'met_norway',
            ...(met.rawPayload || {}),
            metData: met,
            modelComparisonResponse: modelResult.data,
          };
          geospatialDataTelemetryService.recordRawIngestion(lat, lng, fallbackData.locationName, rawWeatherForTelemetry, air.data, fallbackData, undefined, queryKey);
          return fallbackData;
        }
      } catch (metErr: any) {
        attempts.push({
          id: 'met_norway_fallback',
          url: `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lng}`,
          status: 'FAILED',
          httpStatus: null,
          latencyMs: 0,
          checkedAt: new Date().toISOString(),
          payloadBytes: 0,
          error: metErr.message,
        });
      }

      geospatialDataTelemetryService.recordFailedIngestion(lat, lng, placeName || 'Lokasi pilihan', attempts, queryKey);
      throw new Error(`Data cuaca gagal diambil: ${weather.attempt.error}`);
    }

    const w = weather.data, c = w.current;
    const sanitizeSeries = (series: any): any => {
      if (!increasingForecastTimes(series?.time)) return { time: [] };
      return Object.fromEntries(Object.entries(series).map(([field, values]) => [field,
        field === 'time' ? values : Array.isArray(values) ? series.time.map((_: number, i: number) => weatherValue(field, values[i])) : []]));
    };
    const h = sanitizeSeries(w.hourly), d = sanitizeSeries(w.daily);
    if (air.data && Math.abs(air.data.current.time - c.time) >= 3600) { air.attempt.status = "FAILED"; air.attempt.error = "Waktu kualitas udara tidak sesuai waktu cuaca."; air.data = null; }
    const timezone = typeof w.timezone === 'string' ? w.timezone : 'UTC';
    const currentEpoch = c.time;
    const baseTimes: number[] = Array.isArray(h.time) ? h.time : [];
    const matchingTimes = baseTimes.filter(t => finiteNumber(t) && t <= currentEpoch && currentEpoch - t < 3600);
    const currentHourEpoch = matchingTimes[matchingTimes.length - 1];
    if (!finiteNumber(currentHourEpoch)) {
      weather.attempt.status = 'FAILED'; weather.attempt.error = 'Tidak ada titik prakiraan yang sesuai waktu data saat ini.';
      geospatialDataTelemetryService.recordFailedIngestion(lat, lng, placeName || 'Lokasi pilihan', attempts, queryKey);
      throw new Error(weather.attempt.error);
    }
    const modelHourly = modelResult.data?.hourly || {};
    const modelIndex = (modelHourly.time || []).indexOf(currentHourEpoch);
    const modelComparison: WeatherModelValue[] = WEATHER_MODELS.flatMap(m => {
      const temperature = modelHourly[`temperature_2m_${m.id}`]?.[modelIndex];
      return (finiteNumber(temperature) && temperature >= -100 && temperature <= 65) ? [{ modelId: m.id, modelName: m.name, sourceFlag: m.flag, country: m.country, agency: `${m.name} melalui Open-Meteo`, category: 'GLOBAL_TOP_NWP' as const, temperature, dataTime: epochIso(currentHourEpoch), notes: 'Prakiraan model pada koordinat pilihan; bukan pengamatan langsung.' }] : [];
    });
    if (modelResult.data && modelResult.attempt.status !== 'FAILED') {
      if (modelComparison.length >= 7) {
        modelResult.attempt.status = 'SUCCESS';
        modelResult.attempt.error = undefined;
      } else if (modelComparison.length > 0) {
        modelResult.attempt.status = 'PARTIAL';
        const missing = WEATHER_MODELS.filter(m => !modelComparison.some(v => v.modelId === m.id)).map(m => m.name);
        modelResult.attempt.error = `Tersedia ${modelComparison.length} dari ${WEATHER_MODELS.length} model pada waktu yang sama. Tidak tersedia: ${missing.join(", ")}.`;
      } else {
        modelResult.attempt.status = 'FAILED';
        modelResult.attempt.error = 'Tidak ada model cuaca numerik yang tersedia.';
      }
    }
    const hourlyTimes: number[] = Array.isArray(h.time) ? h.time : [];
    const currentIdx = hourlyTimes.indexOf(currentHourEpoch);
    const airHourly = air.data?.hourly || {};
    const hourlyRequired = ['temperature_2m', 'relative_humidity_2m', 'precipitation', 'weather_code', 'cloud_cover', 'surface_pressure', 'wind_speed_10m', 'wind_direction_10m'];
    const buildHourlyPoint = (time: number, index: number): WeatherHourlyPoint | null => {
      if (!hourlyRequired.every(k => finiteNumber(h[k]?.[index]))) return null;
      const airIndex = (airHourly.time || []).indexOf(time);
      const modelHourIndex = (modelHourly.time || []).indexOf(time);
      const getModel = (id: string) => {
        const val = modelHourly[`temperature_2m_${id}`]?.[modelHourIndex];
        return (finiteNumber(val) && val >= -100 && val <= 65) ? val : undefined;
      };
      const hour = localHour(time, timezone);
      return {
        time: epochIso(time),
        hour,
        label: `${String(hour).padStart(2, '0')}:00`,
        temperature: h.temperature_2m[index],
        apparentTemp: finiteNumber(h.apparent_temperature?.[index]) ? h.apparent_temperature[index] : undefined,
        ecmwfTemp: getModel('ecmwf_ifs025'),
        gfsTemp: getModel('gfs_seamless'),
        iconTemp: getModel('icon_seamless'),
        jmaTemp: getModel('jma_seamless'),
        humidity: h.relative_humidity_2m[index],
        precipitation: h.precipitation[index],
        precipitationProb: nullableNumber(h.precipitation_probability?.[index]),
        cloudCover: h.cloud_cover[index],
        conditionCode: h.weather_code[index],
        conditionText: getWeatherConditionText(h.weather_code[index]),
        pressure: h.surface_pressure[index],
        windSpeed: h.wind_speed_10m[index],
        windDirection: h.wind_direction_10m[index],
        windGusts: nullableNumber(h.wind_gusts_10m?.[index]),
        pm25: nullableNumber(airHourly.pm2_5?.[airIndex]),
        ozone: nullableNumber(airHourly.ozone?.[airIndex]),
        uvIndex: nullableNumber(h.uv_index?.[index]),
      };
    };

    const futureIndices = hourlyTimes.map((time, index) => ({ time, index })).filter(p => finiteNumber(p.time) && p.time >= currentHourEpoch).slice(0, 24);
    const hourly: WeatherHourlyPoint[] = futureIndices.flatMap(({ time, index }) => {
      const p = buildHourlyPoint(time, index);
      return p ? [p] : [];
    });

    const pastIndices = hourlyTimes.map((time, index) => ({ time, index })).filter(p => finiteNumber(p.time) && p.time < currentHourEpoch);
    const allFutureIndices = hourlyTimes.map((time, index) => ({ time, index })).filter(p => finiteNumber(p.time) && p.time >= currentHourEpoch).slice(0, 48);
    const selectedPastIndices = pastIndices.slice(-24);
    const extendedHourlyIndices = [...selectedPastIndices, ...allFutureIndices];
    const extendedHourly: WeatherHourlyPoint[] = extendedHourlyIndices.flatMap(({ time, index }) => {
      const p = buildHourlyPoint(time, index);
      return p ? [p] : [];
    });
    const daily: WeatherDailyPoint[] = (Array.isArray(d.time) ? d.time : []).flatMap((time: number, index: number) => {
      if (!finiteNumber(time) || time > Date.now() / 1000 + 30 * 86400 || !['temperature_2m_max', 'temperature_2m_min', 'precipitation_sum', 'wind_speed_10m_max', 'weather_code'].every(k => finiteNumber(d[k]?.[index])) || d.temperature_2m_min[index] > d.temperature_2m_max[index]) return [];
      return [{ date: epochIso(time), dayName: new Intl.DateTimeFormat('id-ID', { timeZone: timezone, weekday: 'short' }).format(time * 1000), tempMax: d.temperature_2m_max[index], tempMin: d.temperature_2m_min[index], apparentTempMax: nullableNumber(d.apparent_temperature_max?.[index]), windGustMax: nullableNumber(d.wind_gusts_10m_max?.[index]), precipitationSum: d.precipitation_sum[index], precipitationProbMax: nullableNumber(d.precipitation_probability_max?.[index]), windSpeedMax: d.wind_speed_10m_max[index], uvIndexMax: nullableNumber(d.uv_index_max?.[index]), condition: getWeatherConditionText(d.weather_code[index]) }];
    });
    if (hourly.length < 24 || daily.length < 14 || hourly.some(p => p.windGusts === null || p.apparentTemp == null || p.uvIndex === null || p.precipitationProb === null) || daily.some(p => p.windGustMax === null || p.apparentTempMax === null || p.uvIndexMax === null || p.precipitationProbMax === null)) {
      weather.attempt.status = 'PARTIAL';
      weather.attempt.error = 'Sebagian deret prakiraan tidak tersedia; titik kosong tidak dibuatkan angka pengganti.';
    }
    const aq = air.data?.current || {};
    const airValue = (value: unknown) => finiteNumber(value) && value >= 0 ? value : null;
    const pm25 = airValue(aq.pm2_5), pm10 = airValue(aq.pm10), ozone = airValue(aq.ozone);
    if (air.data && [pm25, pm10, ozone].some(v => v === null)) { air.attempt.status = 'PARTIAL'; air.attempt.error = 'Sebagian parameter kualitas udara tidak tersedia.'; }
    if (air.data && hourly.some(point => point.pm25 === null || point.ozone === null)) { air.attempt.status = 'PARTIAL'; air.attempt.error = 'Sebagian deret kualitas udara tidak tersedia pada waktu prakiraan cuaca.'; }
    const temperatures = modelComparison.map(m => m.temperature).filter(t => finiteNumber(t) && t >= -100 && t <= 65);
    const modelSpread = temperatures.length > 1 ? Math.max(...temperatures) - Math.min(...temperatures) : null;
    const cloudThermo = cloudThermodynamicsEngine.evaluateCloudDynamics({ temperatureC: c.temperature_2m, relativeHumidityPercent: c.relative_humidity_2m, surfacePressureHpa: c.surface_pressure, cloudCoverPercent: c.cloud_cover, windSpeedKmh: c.wind_speed_10m, windDirectionDeg: c.wind_direction_10m, elevationM: finiteNumber(w.elevation) ? w.elevation : 0, lat });

    const pastAirIndices = (Array.isArray(airHourly.time) ? airHourly.time : [])
      .map((t: number, idx: number) => ({ time: t, index: idx }))
      .filter((p: { time: number; index: number }) => finiteNumber(p.time) && p.time <= currentHourEpoch && p.time > currentHourEpoch - 24 * 3600);
    const historicalAirQuality = pastAirIndices.map((p: { time: number; index: number }) => ({
      time: epochIso(p.time),
      pm25: nullableNumber(airHourly.pm2_5?.[p.index]),
      pm10: nullableNumber(airHourly.pm10?.[p.index]),
      ozone: nullableNumber(airHourly.ozone?.[p.index]),
    }));

    const data: WeatherConsensusData = {
      locationName: placeName || `Koordinat (${lat.toFixed(3)}, ${lng.toFixed(3)})`, lat, lng,
      elevation: finiteNumber(w.elevation) ? w.elevation : 0,
      timestamp: new Intl.DateTimeFormat('id-ID', { timeZone: timezone, hour: '2-digit', minute: '2-digit' }).format(currentEpoch * 1000), timezone,
      dataTime: epochIso(currentEpoch), fetchedAt: new Date().toISOString(), sourceFetches: attempts,
      dataStatus: attempts.every(a => a.status === 'SUCCESS') ? 'AVAILABLE' : 'PARTIAL',
      modelSpread, accuracyValidated: false, coverageScope: 'Koordinat pilihan; asal lembaga model tidak berarti semua wilayah negaranya diunduh.',
      historicalAirQuality,
      current: { consensusTemperature: c.temperature_2m, apparentTemperature: c.apparent_temperature, tempMin: temperatures.length ? Math.min(...temperatures) : c.temperature_2m, tempMax: temperatures.length ? Math.max(...temperatures) : c.temperature_2m, confidenceScore: null,
        humidity: c.relative_humidity_2m, precipitation: c.precipitation, precipitationProb: nullableNumber(h.precipitation_probability?.[currentIdx]), cloudCover: c.cloud_cover, pressure: c.surface_pressure, windSpeed: c.wind_speed_10m, windDirection: c.wind_direction_10m, windGusts: c.wind_gusts_10m, conditionCode: c.weather_code, conditionText: getWeatherConditionText(c.weather_code), pm25, pm10, ozone, uvIndex: nullableNumber(h.uv_index?.[currentIdx]),
        aqiLevel: computeAqiLevel(pm25, pm10, ozone).level, aqiColor: computeAqiLevel(pm25, pm10, ozone).color },
      modelComparison, sources: [
        { id: 'open_meteo', name: 'Open-Meteo Best Match', origin: 'Koordinat pilihan', type: 'Prakiraan model', status: 'online' },
        ...modelComparison.map(m => ({ id: m.modelId!, name: m.modelName, origin: m.country!, type: 'Model melalui Open-Meteo', status: 'online' as const })),
        ...(air.data ? [{ id: 'cams', name: 'Copernicus CAMS melalui Open-Meteo', origin: 'Koordinat pilihan', type: 'Prakiraan kualitas udara', status: 'online' as const }] : []),
      ], hourly, extendedHourly: extendedHourly.length > 0 ? extendedHourly : hourly, daily, cloudThermodynamics: cloudThermo,
      aiBriefing: { summaryText: `Prakiraan Open-Meteo untuk ${placeName || 'koordinat pilihan'}: ${getWeatherConditionText(c.weather_code)}, suhu ${c.temperature_2m}°C, angin ${c.wind_speed_10m} km/jam dari ${c.wind_direction_10m}°, tutupan awan ${c.cloud_cover}%. ${modelComparison.length} model tersedia untuk perbandingan suhu pada waktu yang sama. Akurasi belum diuji terhadap pengamatan lapangan.`, preparednessAdvice: ['Periksa waktu data dan peringatan resmi setempat sebelum mengambil keputusan keselamatan.'] },
    };
    geospatialDataTelemetryService.recordRawIngestion(lat, lng, data.locationName, { ...w, modelComparisonResponse: modelResult.data }, air.data, data, undefined, queryKey);
    return data;
  }

  public async reverifyWithAi(data: WeatherConsensusData, forceRefresh = false): Promise<WeatherConsensusData> {
    if (!data.current) return data;
    const c = data.current;
    const result = await atmosphericNwpAiService.verifyForecastWithNwpAi({
      lat: data.lat,
      lng: data.lng,
      locationName: data.locationName,
      elevation: data.elevation,
      current: {
        consensusTemperature: c.consensusTemperature,
        apparentTemperature: c.apparentTemperature,
        humidity: c.humidity,
        pressure: c.pressure,
        windSpeed: c.windSpeed,
        windDirection: c.windDirection,
        precipitation: c.precipitation,
        precipitationProb: c.precipitationProb,
      },
      modelComparison: data.modelComparison,
    }, forceRefresh);
    // Diagnostic/AI explanations never overwrite provider forecast values or prove their accuracy.
    geospatialDataTelemetryService.addLog(result.isAiVerified ? 'AI_EXEC' : 'INFO', 'ATMOSPHERIC_DIAGNOSTIC', result.scientificBriefing, { model: result.modelName, isAiVerified: result.isAiVerified });
    return {
      ...data,
      aiBriefing: {
        ...data.aiBriefing,
        summaryText: result.scientificBriefing,
      },
      aiNwpVerification: result,
    };
  }
}

export const weatherAggregatorService = new WeatherAggregatorService();
