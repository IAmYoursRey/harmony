/**
 * Harmony Geospatial Shared Freshness Engine
 * 
 * Implements authoritative data freshness classification, provider-native timezone resolution,
 * separation of the three clocks (dataTime, lastCheckedAt, nextCheckAt), and Harmony's operational
 * freshness policy based on reported data intervals without assuming unverified provider cadences.
 */

export type FreshnessStatus =
  | 'CURRENT'
  | 'RECENT'
  | 'STALE'
  | 'CACHED'
  | 'STATIC'
  | 'DERIVED'
  | 'UNAVAILABLE'
  | 'UNKNOWN_FRESHNESS';

export type DataClassification =
  | 'OBSERVATION'
  | 'FORECAST'
  | 'MODEL'
  | 'RADAR'
  | 'SATELLITE'
  | 'DERIVED'
  | 'ESTIMATED';

export type ProviderHealth = 'ONLINE' | 'DEGRADED' | 'OFFLINE';

export type DateRecencyCategory = 'HARI_INI' | 'KEMARIN' | 'DATA_LAMA' | 'TIDAK_TERSEDIA';

export interface TimezoneInfo {
  tz: string;
  abbr: 'WIB' | 'WITA' | 'WIT' | string;
}

export interface FreshnessEvaluationParams {
  dataTime: string | null;              // Canonical ISO UTC timestamp of the weather record (or null)
  lastCheckedAt: string;                // Canonical ISO UTC timestamp of when Harmony received data
  dataIntervalMs?: number | null;       // Data time step in ms (e.g. 900000ms = 15min from current.interval)
  isFromCache?: boolean;                // Served from fallback cache because current request failed
  providerHealth?: ProviderHealth;      // Provider connection health
  now?: Date;                           // Reference clock for deterministic evaluation
  tz?: string;                          // Provider-returned timezone (e.g. 'Asia/Jakarta', 'Asia/Makassar')
}

export interface FreshnessResult {
  dataTime: string | null;
  lastCheckedAt: string;
  nextCheckAt: string;
  ageMs: number | null;
  ageMinutes: number | null;
  dateRecency: DateRecencyCategory;
  sameLocalDate: boolean | null;
  status: FreshnessStatus;
  statusLabelId: string;                // Indonesian label: 'TERKINI', 'RECENT', 'STALE', 'CACHED', etc.
  providerHealth: ProviderHealth;
  formattedDate: string;
  formattedTime: string;
  formattedLastChecked: string;
  timezoneAbbr: string;
  dataStepMinutes: number | null;
}

export const MAP_REFRESH_INTERVAL_MS = 300000; // Harmony polling interval: exactly 5 minutes (300,000 ms)

/**
 * Resolves authoritative timezone from provider metadata first, falling back to longitude only if omitted.
 */
export function getTimezoneInfo(providerTz?: string | null, lng?: number): TimezoneInfo {
  if (providerTz && typeof providerTz === 'string' && providerTz.trim().length > 0) {
    const tz = providerTz.trim();
    if (tz === 'Asia/Jakarta' || tz === 'Asia/Pontianak') {
      return { tz, abbr: 'WIB' };
    }
    if (tz === 'Asia/Makassar' || tz === 'Asia/Ujung_Pandang') {
      return { tz, abbr: 'WITA' };
    }
    if (tz === 'Asia/Jayapura') {
      return { tz, abbr: 'WIT' };
    }
    return { tz, abbr: 'WIB' };
  }

  // Fallback to geographic longitude estimation if provider did not supply timezone
  if (typeof lng === 'number' && !isNaN(lng)) {
    if (lng < 115.0) return { tz: 'Asia/Jakarta', abbr: 'WIB' };
    if (lng < 125.0) return { tz: 'Asia/Makassar', abbr: 'WITA' };
    return { tz: 'Asia/Jayapura', abbr: 'WIT' };
  }

  return { tz: 'Asia/Jakarta', abbr: 'WIB' };
}

/**
 * Legacy wrapper for longitude-only resolution
 */
export function getTimezoneForCoords(lng?: number): TimezoneInfo {
  return getTimezoneInfo(null, lng);
}

/**
 * Calculates data age in milliseconds and whole minutes from data timestamp to current reference time.
 */
export function calculateAge(
  dataTimeStr: string | null,
  now: Date = new Date()
): { ageMs: number | null; ageMinutes: number | null } {
  if (!dataTimeStr) {
    return { ageMs: null, ageMinutes: null };
  }
  const t = new Date(dataTimeStr).getTime();
  if (isNaN(t)) {
    return { ageMs: null, ageMinutes: null };
  }
  const ageMs = Math.max(0, now.getTime() - t);
  const ageMinutes = Math.floor(ageMs / 60000);
  return { ageMs, ageMinutes };
}

/**
 * Compares data local date against reference local date in the provider's timezone.
 */
export function getDateRecency(
  dataTimeStr: string | null,
  now: Date = new Date(),
  tz = 'Asia/Jakarta'
): DateRecencyCategory {
  if (!dataTimeStr) return 'TIDAK_TERSEDIA';
  const dataDate = new Date(dataTimeStr);
  if (isNaN(dataDate.getTime())) return 'TIDAK_TERSEDIA';

  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const dataDayStr = formatter.format(dataDate);
    const nowDayStr = formatter.format(now);

    if (dataDayStr === nowDayStr) {
      return 'HARI_INI';
    }

    const dataDayNum = new Date(`${dataDayStr}T00:00:00Z`).getTime();
    const nowDayNum = new Date(`${nowDayStr}T00:00:00Z`).getTime();
    const diffDays = Math.round((nowDayNum - dataDayNum) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'KEMARIN';
    }
    return 'DATA_LAMA';
  } catch {
    return 'TIDAK_TERSEDIA';
  }
}

/**
 * Boolean helper for same local calendar date
 */
export function isSameLocalDate(
  dataTimeStr: string | null,
  now: Date = new Date(),
  tz = 'Asia/Jakarta'
): boolean | null {
  const recency = getDateRecency(dataTimeStr, now, tz);
  if (recency === 'TIDAK_TERSEDIA') return null;
  return recency === 'HARI_INI';
}

/**
 * Formats canonical UTC ISO string to Indonesian date string using provider timezone.
 */
export function formatIndonesianDate(
  isoString: string | null,
  tz = 'Asia/Jakarta'
): string {
  if (!isoString) return 'Tidak tersedia';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'Format tanggal tidak valid';

  try {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: tz,
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return 'Gagal memformat tanggal';
  }
}

/**
 * Formats canonical UTC ISO string to Indonesian time with timezone abbreviation.
 */
export function formatIndonesianTime(
  isoString: string | null,
  tz = 'Asia/Jakarta',
  abbr = 'WIB',
  includeSeconds = false
): string {
  if (!isoString) return 'Tidak disediakan sumber';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'Waktu tidak valid';

  try {
    const formatted = new Intl.DateTimeFormat('id-ID', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      ...(includeSeconds ? { second: '2-digit' } : {}),
      hour12: false,
    }).format(d).replace(/\./g, ':');

    return `${formatted} ${abbr}`;
  } catch {
    return 'Gagal memformat waktu';
  }
}

/**
 * Formats full datetime string (e.g. "20 September 2026 • 08:15 WIB")
 */
export function formatIndonesianDateTime(
  isoString: string | null,
  tz = 'Asia/Jakarta',
  abbr = 'WIB'
): string {
  if (!isoString) return 'Tidak disediakan sumber';
  const datePart = formatIndonesianDate(isoString, tz);
  const timePart = formatIndonesianTime(isoString, tz, abbr);
  return `${datePart} • ${timePart}`;
}

/**
 * Formats countdown in mm:ss
 */
export function formatCountdown(remainingMs: number): string {
  const safeMs = Math.max(0, remainingMs);
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Evaluates operational freshness according to Harmony's application freshness policy.
 * 
 * NOTE: Thresholds are derived from the reported data step (dataIntervalMs) as Harmony's
 * operational evaluation policy. They are NOT an official provider publication guarantee.
 * 
 * Policy:
 * - age <= 1.5 * dataIntervalMs -> CURRENT ('TERKINI')
 * - age <= 3.0 * dataIntervalMs -> RECENT
 * - age > 3.0 * dataIntervalMs -> STALE
 * - prior calendar day -> STALE
 * - failed request with retained cache -> CACHED
 * - null dataTime -> UNKNOWN_FRESHNESS
 */
export function evaluateFreshness(params: FreshnessEvaluationParams): FreshnessResult {
  const now = params.now || new Date();
  const tz = params.tz || 'Asia/Jakarta';
  const tzInfo = getTimezoneInfo(tz);

  const providerHealth = params.providerHealth || 'ONLINE';
  const { ageMs, ageMinutes } = calculateAge(params.dataTime, now);
  const dateRecency = getDateRecency(params.dataTime, now, tz);
  const sameLocalDate = dateRecency === 'HARI_INI';

  const dataStepMinutes = params.dataIntervalMs ? Math.round(params.dataIntervalMs / 60000) : null;
  const nextCheckAt = new Date(new Date(params.lastCheckedAt).getTime() + MAP_REFRESH_INTERVAL_MS).toISOString();

  let status: FreshnessStatus = 'UNKNOWN_FRESHNESS';
  let statusLabelId = 'UNKNOWN';

  if (!params.dataTime) {
    status = params.isFromCache ? 'CACHED' : 'UNKNOWN_FRESHNESS';
    statusLabelId = params.isFromCache ? 'CACHED' : 'TIDAK DIKETAHUI';
  } else if (dateRecency === 'KEMARIN' || dateRecency === 'DATA_LAMA') {
    status = 'STALE';
    statusLabelId = 'KEDALUWARSA';
  } else if (params.isFromCache) {
    status = (ageMinutes !== null && ageMinutes > 60) ? 'STALE' : 'CACHED';
    statusLabelId = status === 'STALE' ? 'KEDALUWARSA' : 'CACHED';
  } else if (typeof params.dataIntervalMs === 'number' && params.dataIntervalMs > 0) {
    if (ageMs !== null) {
      if (ageMs <= params.dataIntervalMs * 1.5) {
        status = 'CURRENT';
        statusLabelId = 'TERKINI';
      } else if (ageMs <= params.dataIntervalMs * 3.0) {
        status = 'RECENT';
        statusLabelId = 'BARU';
      } else {
        status = 'STALE';
        statusLabelId = 'KEDALUWARSA';
      }
    }
  } else {
    status = 'UNKNOWN_FRESHNESS';
    statusLabelId = 'TIDAK DIKETAHUI';
  }

  return {
    dataTime: params.dataTime,
    lastCheckedAt: params.lastCheckedAt,
    nextCheckAt,
    ageMs,
    ageMinutes,
    dateRecency,
    sameLocalDate,
    status,
    statusLabelId,
    providerHealth,
    formattedDate: formatIndonesianDate(params.dataTime, tz),
    formattedTime: formatIndonesianTime(params.dataTime, tz, tzInfo.abbr),
    formattedLastChecked: formatIndonesianTime(params.lastCheckedAt, tz, tzInfo.abbr),
    timezoneAbbr: tzInfo.abbr,
    dataStepMinutes,
  };
}
