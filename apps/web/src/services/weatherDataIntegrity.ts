import { weatherValue, weatherUnitError } from './weatherValueValidation';

export type FetchState = 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'NOT_REQUESTED';

export interface SourceFetchAttempt {
  id: string;
  url: string;
  status: FetchState;
  httpStatus: number | null;
  checkedAt: string;
  latencyMs: number;
  payloadBytes: number;
  error?: string;
  acceptedCount?: number;
  rejectedCount?: number;
}

export const finiteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export function assertCoordinates(lat: number, lng: number): void {
  if (!finiteNumber(lat) || !finiteNumber(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new Error('Koordinat lokasi tidak valid.');
  }
}

export const REQUIRED_CURRENT_FIELDS = [
  'temperature_2m', 'relative_humidity_2m', 'apparent_temperature',
  'precipitation', 'weather_code', 'cloud_cover', 'surface_pressure',
  'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m',
] as const;

export function validateCurrentWeather(data: any, lat?: number, lng?: number): string | null {
  if (!data || data.error || !data.current) return data?.reason || 'Blok cuaca saat ini tidak tersedia.';
  const unitError = weatherUnitError(data.current_units) || weatherUnitError(data.hourly_units) || weatherUnitError(data.daily_units);
  if (unitError) return unitError;
  if (data.current_units && typeof data.current_units === 'object') {
    const u = data.current_units;
    if (typeof u.temperature_2m === 'string' && !['°c', 'celsius'].includes(u.temperature_2m.trim().toLowerCase())) {
      return `Satuan suhu tidak didukung: ${u.temperature_2m} (diharapkan °C).`;
    }
    if (typeof u.surface_pressure === 'string' && !['hpa', 'hectopascal'].includes(u.surface_pressure.trim().toLowerCase())) {
      return `Satuan tekanan permukaan tidak didukung: ${u.surface_pressure} (diharapkan hPa).`;
    }
    if (typeof u.wind_speed_10m === 'string' && !['km/h', 'km/jam'].includes(u.wind_speed_10m.trim().toLowerCase())) {
      return `Satuan kecepatan angin tidak didukung: ${u.wind_speed_10m} (diharapkan km/h).`;
    }
  }
  const missing = REQUIRED_CURRENT_FIELDS.filter(key => weatherValue(key, data.current[key]) === null);
  if (missing.length) return `Parameter cuaca kosong/tidak valid: ${missing.join(', ')}.`;
  const c = data.current;
  if (!finiteNumber(c.time) || !finiteNumber(c.interval) || c.interval <= 0) return 'Waktu/interval data cuaca tidak valid.';
  if (!Number.isFinite(new Date(c.time * 1000).getTime()) || Math.abs(Date.now() / 1000 - c.time) > 3 * 3600) return 'Waktu data cuaca terlalu lama atau tidak valid.';
  try { new Intl.DateTimeFormat('en', { timeZone: data.timezone || 'UTC' }); }
  catch { return 'Zona waktu respons tidak valid.'; }
  if (!finiteNumber(data.latitude) || !finiteNumber(data.longitude) || Math.abs(data.latitude) > 90 || Math.abs(data.longitude) > 180) return 'Koordinat respons tidak tersedia/tidak valid.';
  if (lat !== undefined && lng !== undefined &&
    (Math.abs(data.latitude - lat) > 1.0 || Math.abs(data.longitude - lng) > 1.0)) return 'Respons cuaca berasal dari lokasi yang berbeda.';
  if (c.relative_humidity_2m < 0 || c.relative_humidity_2m > 100 || c.cloud_cover < 0 || c.cloud_cover > 100 ||
    c.surface_pressure <= 0 || c.precipitation < 0 || c.wind_speed_10m < 0 || c.wind_gusts_10m < 0 || c.wind_direction_10m < 0 || c.wind_direction_10m > 360) {
    return 'Parameter cuaca berada di luar rentang fisik.';
  }
  return null;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

export function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < 1970 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;
  const daysInMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
}

export function isValidIsoDateTime(str: unknown): boolean {
  if (typeof str !== 'string') return false;
  const s = str.trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|([+-])(0\d|1[0-4]):([0-5]\d))?)?$/i);
  if (!m) return false;
  if (m[8] === '14' && m[9] !== '00') return false;
  const y = parseInt(m[1], 10);
  const mon = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  if (!isValidCalendarDate(y, mon, d)) return false;
  if (m[4] !== undefined) {
    const hh = parseInt(m[4], 10);
    const mm = parseInt(m[5], 10);
    const ss = m[6] !== undefined ? parseInt(m[6], 10) : 0;
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59 || ss < 0 || ss > 59) return false;
  }
  const parsed = Date.parse(s);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 4102444800000) return false;
  return true;
}

export function validateMetNorwayPayload(
  d: any,
  lat: number,
  lng: number,
): { valid: boolean; status: 'ONLINE' | 'PARTIAL' | 'OFFLINE'; error?: string; acceptedCount: number; rejectedCount: number } {
  if (!d?.geometry || d.geometry.type !== 'Point' || !Array.isArray(d.geometry.coordinates)) {
    return { valid: false, status: 'OFFLINE', error: 'Respons MET Norway tidak memuat geometri lokasi yang valid.', acceptedCount: 0, rejectedCount: 0 };
  }
  const [rLon, rLat] = d.geometry.coordinates;
  if (!finiteNumber(rLon) || !finiteNumber(rLat) || Math.abs(rLat - lat) > 0.5 || Math.abs(rLon - lng) > 0.5) {
    return { valid: false, status: 'OFFLINE', error: 'Koordinat respons MET Norway tidak sesuai dengan lokasi permintaan.', acceptedCount: 0, rejectedCount: 0 };
  }
  const u = d?.properties?.meta?.units;
  if (!u || typeof u !== 'object') {
    return { valid: false, status: 'OFFLINE', error: 'Metadata satuan MET Norway tidak tersedia.', acceptedCount: 0, rejectedCount: 0 };
  }
  const tempUnit = String(u.air_temperature || '').toLowerCase();
  if (tempUnit !== 'celsius' && tempUnit !== 'degc' && tempUnit !== 'c') {
    return { valid: false, status: 'OFFLINE', error: 'Satuan suhu MET Norway tidak kompatibel (wajib celsius).', acceptedCount: 0, rejectedCount: 0 };
  }
  const rhUnit = String(u.relative_humidity || '').toLowerCase();
  if (rhUnit !== '%') {
    return { valid: false, status: 'OFFLINE', error: 'Satuan kelembapan MET Norway tidak kompatibel (wajib %).', acceptedCount: 0, rejectedCount: 0 };
  }
  if (u.air_pressure_at_sea_level !== undefined) {
    const pressUnit = String(u.air_pressure_at_sea_level || '').toLowerCase();
    if (pressUnit !== 'hpa') {
      return { valid: false, status: 'OFFLINE', error: 'Satuan tekanan MET Norway tidak kompatibel (wajib hPa).', acceptedCount: 0, rejectedCount: 0 };
    }
  }
  if (u.wind_speed !== undefined) {
    const windUnit = String(u.wind_speed || '').toLowerCase();
    if (windUnit !== 'm/s') {
      return { valid: false, status: 'OFFLINE', error: 'Satuan kecepatan angin MET Norway tidak kompatibel (wajib m/s).', acceptedCount: 0, rejectedCount: 0 };
    }
  }
  for (const [field, expected] of Object.entries({ wind_speed_of_gust: 'm/s', wind_from_direction: 'degrees', cloud_area_fraction: '%', precipitation_amount: 'mm' })) {
    if (u[field] !== undefined && String(u[field]).trim().toLowerCase() !== expected) {
      return { valid: false, status: 'OFFLINE', error: `Satuan ${field} MET Norway tidak kompatibel.`, acceptedCount: 0, rejectedCount: 0 };
    }
  }
  const upd = d?.properties?.meta?.updated_at;
  if (!isValidIsoDateTime(upd)) {
    return { valid: false, status: 'OFFLINE', error: 'Metadata updated_at MET Norway tidak valid.', acceptedCount: 0, rejectedCount: 0 };
  }
  if (Date.parse(upd) - Date.now() > 3600 * 1000) {
    return { valid: false, status: 'OFFLINE', error: 'Waktu terbit MET Norway berada di masa depan.', acceptedCount: 0, rejectedCount: 0 };
  }
  if (Date.now() - Date.parse(upd) > 48 * 3600 * 1000) {
    return { valid: false, status: 'OFFLINE', error: 'Metadata updated_at MET Norway sudah usang (>48 jam).', acceptedCount: 0, rejectedCount: 0 };
  }
  const ts = d?.properties?.timeseries;
  if (!Array.isArray(ts) || ts.length === 0) {
    return { valid: false, status: 'OFFLINE', error: 'Data prakiraan MET Norway kosong.', acceptedCount: 0, rejectedCount: 0 };
  }
  if (ts.every(entry => isValidIsoDateTime(entry?.time) && Date.now() - Date.parse(entry.time) > 48 * 3600 * 1000)) {
    return { valid: false, status: 'OFFLINE', error: 'Seluruh titik prakiraan MET Norway sudah usang (>48 jam lalu).', acceptedCount: 0, rejectedCount: ts.length };
  }

  let acceptedCount = 0;
  let rejectedCount = 0;
  let latestPointEpoch = -Infinity;
  const seenTimes = new Set<number>();
  for (const entry of ts) {
    if (!isValidIsoDateTime(entry?.time)) {
      rejectedCount++;
      continue;
    }
    const epoch = Math.floor(new Date(entry.time).getTime() / 1000);
    if (!isValidMetPoint(entry) || seenTimes.has(epoch)) { rejectedCount++; continue; }
    seenTimes.add(epoch);
    const details = entry?.data?.instant?.details;
    if (!details) {
      rejectedCount++;
      continue;
    }
    const temp = details.air_temperature;
    const rh = details.relative_humidity;
    const wind = details.wind_speed;
    const windDir = details.wind_from_direction;
    const cloud = details.cloud_area_fraction;
    const pressure = details.air_pressure_at_sea_level;

    if (!finiteNumber(temp) || temp < -100 || temp > 70 ||
        !finiteNumber(rh) || rh < 0 || rh > 100 ||
        (wind !== undefined && (!finiteNumber(wind) || wind < 0 || wind > 150)) ||
        (windDir !== undefined && (!finiteNumber(windDir) || windDir < 0 || windDir > 360)) ||
        (cloud !== undefined && (!finiteNumber(cloud) || cloud < 0 || cloud > 100)) ||
        (pressure !== undefined && (!finiteNumber(pressure) || pressure < 300 || pressure > 1200))) {
      rejectedCount++;
      continue;
    }
    acceptedCount++;
    if (epoch > latestPointEpoch) latestPointEpoch = epoch;
  }

  if (acceptedCount === 0) {
    return { valid: false, status: 'OFFLINE', error: 'Tidak ada titik data prakiraan numerik dengan nilai fisik valid dari MET Norway.', acceptedCount: 0, rejectedCount };
  }

  const nowEpoch = Math.floor(Date.now() / 1000);
  if (nowEpoch - latestPointEpoch > 86400 * 2) {
    return { valid: false, status: 'OFFLINE', error: 'Seluruh titik prakiraan MET Norway sudah usang (>48 jam lalu).', acceptedCount, rejectedCount };
  }

  if (rejectedCount > 0) {
    return { valid: true, status: 'PARTIAL', error: `${rejectedCount} titik prakiraan tidak valid ditolak.`, acceptedCount, rejectedCount };
  }

  return { valid: true, status: 'ONLINE', acceptedCount, rejectedCount: 0 };
}

export function isValidMetPoint(entry: any): boolean {
  if (!isValidIsoDateTime(entry?.time) || !/(Z|[+-]\d{2}:\d{2})$/i.test(entry.time)) return false;
  const epoch = Date.parse(entry.time) / 1000;
  const now = Date.now() / 1000;
  if (epoch < now - 48 * 3600 || epoch > now + 16 * 86400) return false;
  const d = entry?.data?.instant?.details;
  if (!d || !finiteNumber(d.air_temperature) || d.air_temperature < -100 || d.air_temperature > 70 ||
      !finiteNumber(d.relative_humidity) || d.relative_humidity < 0 || d.relative_humidity > 100) return false;
  const ranges: Array<[string, number, number]> = [['wind_speed', 0, 150], ['wind_speed_of_gust', 0, 150], ['wind_from_direction', 0, 360], ['cloud_area_fraction', 0, 100], ['air_pressure_at_sea_level', 300, 1200]];
  if (ranges.some(([field, min, max]) => d[field] !== undefined && (!finiteNumber(d[field]) || d[field] < min || d[field] > max))) return false;
  return ['next_1_hours', 'next_6_hours', 'next_12_hours'].every(period => {
    const amount = entry.data[period]?.details?.precipitation_amount;
    return amount === undefined || (finiteNumber(amount) && amount >= 0);
  });
}

export function validateOpenMeteoModelPayload(
  d: any,
  lat: number,
  lng: number,
  expectedModelId?: string,
): { valid: boolean; status: 'ONLINE' | 'PARTIAL' | 'OFFLINE'; error?: string; acceptedCount?: number; rejectedCount?: number } {
  if (!d || d.error || d.success === false) {
    return { valid: false, status: 'OFFLINE', error: d?.reason?.message || d?.reason || d?.error || 'Sumber model melaporkan kegagalan.' };
  }
  if (!finiteNumber(d?.latitude) || !finiteNumber(d?.longitude) || Math.abs(d.latitude) > 90 || Math.abs(d.longitude) > 180) {
    return { valid: false, status: 'OFFLINE', error: 'Respons model tidak memuat koordinat lokasi.' };
  }
  if (Math.abs(d.latitude - lat) > 2 || Math.abs(d.longitude - lng) > 2) {
    return { valid: false, status: 'OFFLINE', error: 'Koordinat model tidak sesuai lokasi pilihan.' };
  }
  const hourly = d?.hourly;
  if (!hourly || typeof hourly !== 'object') {
    return { valid: false, status: 'OFFLINE', error: 'Blok data per jam (hourly) tidak tersedia.' };
  }
  const times = hourly.time;
  if (!Array.isArray(times) || times.length === 0) {
    return { valid: false, status: 'OFFLINE', error: 'Waktu perbandingan model tidak tersedia.' };
  }

  const epochs: number[] = [];
  for (const t of times) {
    if (typeof t === 'number') {
      if (!Number.isFinite(t) || t <= 0) {
        return { valid: false, status: 'OFFLINE', error: 'Waktu model numerik tidak valid.' };
      }
      const sec = t > 1e11 ? Math.floor(t / 1000) : t;
      if (sec < 0 || sec > 4102444800) {
        return { valid: false, status: 'OFFLINE', error: 'Nilai epoch waktu model di luar rentang representasi yang sah.' };
      }
      epochs.push(sec);
    } else if (typeof t === 'string') {
      if (!isValidIsoDateTime(t)) {
        return { valid: false, status: 'OFFLINE', error: 'Waktu model memuat tanggal kalender yang tidak valid.' };
      }
      const parsed = Math.floor(Date.parse(t) / 1000);
      epochs.push(parsed);
    } else {
      return { valid: false, status: 'OFFLINE', error: 'Tipe data waktu model tidak valid.' };
    }
  }

  for (let i = 1; i < epochs.length; i++) {
    if (epochs[i] <= epochs[i - 1]) {
      return { valid: false, status: 'OFFLINE', error: 'Deret waktu model tidak berurutan atau memuat duplikasi.' };
    }
  }

  const minEpoch = Math.min(...epochs);
  const maxEpoch = Math.max(...epochs);
  const nowEpoch = Math.floor(Date.now() / 1000);
  if (nowEpoch - maxEpoch > 48 * 3600) {
    return { valid: false, status: 'OFFLINE', error: 'Data model adalah data historis masa lalu (bukan prakiraan saat ini).' };
  }
  if (maxEpoch - nowEpoch > 30 * 86400) {
    return { valid: false, status: 'OFFLINE', error: 'Data model berada di luar batas horizon prakiraan operasional.' };
  }

  const ALLOWED_TEMP_UNITS = new Set(['°c', 'celsius', 'c', 'degc']);
  const u = d.hourly_units;
  if (u && typeof u === 'object') {
    const unitsToCheck = expectedModelId
      ? [u[`temperature_2m_${expectedModelId}`], u.temperature_2m].filter(v => v !== undefined)
      : Object.entries(u)
          .filter(([k]) => k === 'temperature_2m' || k.startsWith('temperature_2m_'))
          .map(([, v]) => v);

    for (const unit of unitsToCheck) {
      if (typeof unit !== 'string') return { valid: false, status: 'OFFLINE', error: 'Metadata satuan suhu model tidak valid.' };
      if (typeof unit === 'string') {
        const normalizedUnit = unit.trim().toLowerCase();
        if (!ALLOWED_TEMP_UNITS.has(normalizedUnit)) {
          return { valid: false, status: 'OFFLINE', error: `Satuan suhu model tidak sesuai kontrak query (${unit}).` };
        }
      }
    }
  }

  let targetEntries: Array<[string, any[]]> = [];
  if (expectedModelId) {
    const specificKey = `temperature_2m_${expectedModelId}`;
    const temps = hourly[specificKey] || hourly.temperature_2m;
    if (Array.isArray(temps)) {
      targetEntries.push([expectedModelId, temps]);
    }
  } else {
    targetEntries = Object.entries(hourly).filter(([k, v]) =>
      (k === 'temperature_2m' || k.startsWith('temperature_2m_')) && Array.isArray(v)
    ) as Array<[string, any[]]>;
  }

  if (targetEntries.length === 0) {
    return { valid: false, status: 'OFFLINE', error: 'Nilai model tidak tersedia.' };
  }

  let totalAccepted = 0;
  let totalRejected = 0;
  let hasAnyInvalidModel = false;

  for (const [key, temps] of targetEntries) {
    if (temps.length !== times.length) {
      return { valid: false, status: 'OFFLINE', error: 'Panjang array suhu dan array waktu tidak selaras.' };
    }
    let modelAccepted = 0;
    let modelRejected = 0;
    for (const t of temps) {
      if (finiteNumber(t) && t >= -100 && t <= 65) {
        modelAccepted++;
      } else {
        modelRejected++;
      }
    }
    totalAccepted += modelAccepted;
    totalRejected += modelRejected;

    if (modelAccepted === 0 || modelRejected > 0) {
      hasAnyInvalidModel = true;
    }
  }

  if (expectedModelId) {
    const specificTemps = targetEntries[0]?.[1] || [];
    const allNull = specificTemps.length > 0 && specificTemps.every(t => t === null);
    const hasPhysicalViolation = specificTemps.some(t => typeof t === 'number' && (!Number.isFinite(t) || t < -100 || t > 65));

    if (totalAccepted === 0) {
      const errorMsg = allNull
        ? `Data model ${expectedModelId} kosong dari server hulu Open-Meteo (pemeliharaan upstream BoM/penyedia atau di luar cakupan).`
        : `Nilai suhu model (${expectedModelId}) tidak valid atau di luar rentang fisik.`;
      return { valid: false, status: 'OFFLINE', error: errorMsg, acceptedCount: 0, rejectedCount: totalRejected };
    }
    if (hasPhysicalViolation) {
      return { valid: true, status: 'PARTIAL', error: `Sebagian nilai suhu model (${expectedModelId}) tidak valid atau di luar rentang fisik.`, acceptedCount: totalAccepted, rejectedCount: totalRejected };
    }
    if (totalRejected > 0) {
      // Natural forecast horizon limit: model provides >= 48h continuous valid forecast
      if (totalAccepted >= 48) {
        return { valid: true, status: 'ONLINE', acceptedCount: totalAccepted, rejectedCount: 0 };
      }
      return { valid: true, status: 'PARTIAL', error: `Cakupan horizon ${Math.round(totalAccepted / 24)} hari (${totalAccepted} jam valid).`, acceptedCount: totalAccepted, rejectedCount: totalRejected };
    }
    return { valid: true, status: 'ONLINE', acceptedCount: totalAccepted, rejectedCount: 0 };
  }

  if (totalAccepted === 0) {
    return { valid: false, status: 'OFFLINE', error: 'Tidak ada nilai suhu model yang valid.', acceptedCount: 0, rejectedCount: totalRejected };
  }
  if (hasAnyInvalidModel || totalRejected > 0) {
    return { valid: true, status: 'PARTIAL', error: `${totalRejected} nilai suhu model di luar rentang fisik ditolak.`, acceptedCount: totalAccepted, rejectedCount: totalRejected };
  }

  return { valid: true, status: 'ONLINE', acceptedCount: totalAccepted, rejectedCount: 0 };
}

export function buildEndpointAuditUrl(rawUrl: string, lat: number, lng: number): string {
  const formatCoord = (n: number) => (Number.isFinite(n) ? String(Number(n.toFixed(4))) : String(n));
  const latStr = formatCoord(lat);
  const lngStr = formatCoord(lng);

  try {
    const isRelative = rawUrl.startsWith('/');
    const dummyBase = 'http://localhost';
    const parsed = new URL(rawUrl, dummyBase);

    if (parsed.searchParams.has('latitude')) parsed.searchParams.set('latitude', latStr);
    if (parsed.searchParams.has('longitude')) parsed.searchParams.set('longitude', lngStr);
    if (parsed.searchParams.has('lat')) parsed.searchParams.set('lat', latStr);
    if (parsed.searchParams.has('lng')) parsed.searchParams.set('lng', lngStr);
    if (parsed.searchParams.has('lon')) parsed.searchParams.set('lon', lngStr);
    if (parsed.searchParams.has('locations')) parsed.searchParams.set('locations', `${latStr},${lngStr}`);

    return isRelative ? `${parsed.pathname}${parsed.search}` : parsed.toString();
  } catch {
    return rawUrl
      .replace(/([?&])latitude=-?[\d.]+/g, `$1latitude=${latStr}`)
      .replace(/([?&])longitude=-?[\d.]+/g, `$1longitude=${lngStr}`)
      .replace(/([?&])lat=-?[\d.]+/g, `$1lat=${latStr}`)
      .replace(/([?&])lon=-?[\d.]+/g, `$1lon=${lngStr}`)
      .replace(/([?&])lng=-?[\d.]+/g, `$1lng=${lngStr}`)
      .replace(/([?&])locations=-?[\d.]+,[\d.]+/g, `$1locations=${latStr},${lngStr}`);
  }
}

export async function fetchCheckedJson(
  id: string, url: string, validate: (data: any) => string | null | { partial: true; message: string; acceptedCount?: number; rejectedCount?: number },
  options: RequestInit = {}, timeoutMs = 12000,
): Promise<{ data: any | null; attempt: SourceFetchAttempt }> {
  const started = Date.now();
  const attempt: SourceFetchAttempt = {
    id, url, status: 'FAILED', httpStatus: null, checkedAt: new Date().toISOString(), latencyMs: 0, payloadBytes: 0,
  };

  if (options.signal?.aborted) {
    attempt.error = 'Permintaan dibatalkan sebelum dimulai.';
    return { data: null, attempt };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const onCallerAbort = () => {
    controller.abort();
  };
  options.signal?.addEventListener('abort', onCallerAbort, { once: true });

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    attempt.httpStatus = response.status;
    const body = await response.text();
    if (controller.signal.aborted) throw new DOMException('Permintaan dibatalkan.', 'AbortError');
    attempt.payloadBytes = new TextEncoder().encode(body).length;
    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const errJson = JSON.parse(body);
        if (errJson?.reason) detail = `${detail}: ${errJson.reason}`;
        else if (errJson?.error && typeof errJson.error === 'string') detail = `${detail}: ${errJson.error}`;
      } catch {}
      throw new Error(detail);
    }
    const data = JSON.parse(body);
    const error = validate(data);
    if (error) {
      if (typeof error === 'object' && error !== null && 'partial' in error) {
        attempt.status = 'PARTIAL';
        attempt.error = error.message;
        attempt.acceptedCount = error.acceptedCount;
        attempt.rejectedCount = error.rejectedCount;
        return { data, attempt };
      }
      throw new Error(typeof error === 'string' ? error : JSON.stringify(error));
    }
    attempt.status = 'SUCCESS';
    return { data, attempt };
  } catch (error: any) {
    if (options.signal?.aborted) {
      attempt.error = 'Permintaan dibatalkan oleh pemanggil.';
    } else if (controller.signal.aborted) {
      attempt.error = 'Batas waktu pengambilan data terlampaui.';
    } else {
      attempt.error = error?.message || 'Pengambilan data gagal.';
    }
    return { data: null, attempt };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onCallerAbort);
    attempt.latencyMs = Date.now() - started;
  }
}
