function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < 1970 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;

  const daysInMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
}

function isValidClockTime(hour: number, minute: number, second: number): boolean {
  return (
    Number.isInteger(hour) && hour >= 0 && hour <= 23 &&
    Number.isInteger(minute) && minute >= 0 && minute <= 59 &&
    Number.isInteger(second) && second >= 0 && second <= 59
  );
}

export function parseStrictIsoOrCalendarTime(rawTime: string): number | null {
  if (typeof rawTime !== 'string') return null;
  const str = rawTime.trim();
  if (!str) return null;

  // 1. ISO format: YYYY-MM-DDTHH:mm:ss...
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/i);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    const hh = parseInt(isoMatch[4], 10);
    const mm = parseInt(isoMatch[5], 10);
    const ss = parseInt(isoMatch[6], 10);
    if (!isValidCalendarDate(y, m, d) || !isValidClockTime(hh, mm, ss)) return null;

    const ms = Date.parse(str);
    return Number.isFinite(ms) ? ms : null;
  }

  // 2. Format: YYYY-MM-DD HH:mm:ss
  const stdMatch = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})\s+(\d{2}):(\d{2}):(\d{2})(?:\s*([A-Za-z]+|[+-]\d{2}:?\d{2}))?$/);
  if (stdMatch) {
    const y = parseInt(stdMatch[1], 10);
    const m = parseInt(stdMatch[2], 10);
    const d = parseInt(stdMatch[3], 10);
    const hh = parseInt(stdMatch[4], 10);
    const mm = parseInt(stdMatch[5], 10);
    const ss = parseInt(stdMatch[6], 10);
    if (!isValidCalendarDate(y, m, d) || !isValidClockTime(hh, mm, ss)) return null;

    const tz = stdMatch[7]?.toUpperCase();
    let tzOffset: string;
    if (!tz) {
      tzOffset = '+07:00';
    } else if (tz === 'WIB') {
      tzOffset = '+07:00';
    } else if (tz === 'WITA') {
      tzOffset = '+08:00';
    } else if (tz === 'WIT') {
      tzOffset = '+09:00';
    } else if (tz === 'UTC' || tz === 'Z') {
      tzOffset = 'Z';
    } else if (/^[+-]\d{2}:?\d{2}$/.test(tz)) {
      tzOffset = tz.includes(':') ? tz : `${tz.slice(0, 3)}:${tz.slice(3)}`;
    } else {
      return null;
    }
    const ms = Date.parse(`${stdMatch[1]}-${stdMatch[2]}-${stdMatch[3]}T${stdMatch[4]}:${stdMatch[5]}:${stdMatch[6]}${tzOffset}`);
    return Number.isFinite(ms) ? ms : null;
  }

  // 3. Format: DD-MM-YYYY HH:mm:ss (or DD/MM/YYYY)
  const dmyMatch = str.match(/^(\d{2})[-/](\d{2})[-/](\d{4})\s+(\d{2}):(\d{2}):(\d{2})(?:\s*([A-Za-z]+|[+-]\d{2}:?\d{2}))?$/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    const y = parseInt(dmyMatch[3], 10);
    const hh = parseInt(dmyMatch[4], 10);
    const mm = parseInt(dmyMatch[5], 10);
    const ss = parseInt(dmyMatch[6], 10);
    if (!isValidCalendarDate(y, m, d) || !isValidClockTime(hh, mm, ss)) return null;

    const tz = dmyMatch[7]?.toUpperCase();
    let tzOffset: string;
    if (!tz) {
      tzOffset = '+07:00';
    } else if (tz === 'WIB') {
      tzOffset = '+07:00';
    } else if (tz === 'WITA') {
      tzOffset = '+08:00';
    } else if (tz === 'WIT') {
      tzOffset = '+09:00';
    } else if (tz === 'UTC' || tz === 'Z') {
      tzOffset = 'Z';
    } else if (/^[+-]\d{2}:?\d{2}$/.test(tz)) {
      tzOffset = tz.includes(':') ? tz : `${tz.slice(0, 3)}:${tz.slice(3)}`;
    } else {
      return null;
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    const ms = Date.parse(`${y}-${pad(m)}-${pad(d)}T${pad(hh)}:${pad(mm)}:${pad(ss)}${tzOffset}`);
    return Number.isFinite(ms) ? ms : null;
  }

  return null;
}

export function isUsgsFeatureCollectionStructure(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  if ((value as any).type && (value as any).type !== 'FeatureCollection') return false;
  if (!Array.isArray((value as any).features)) return false;
  return true;
}

export function isValidUsgsFeature(feature: any, maxFutureMs = Date.now() + 2 * 3600 * 1000): boolean {
  if (!feature || typeof feature !== 'object') return false;
  const coordinates = feature?.geometry?.coordinates;
  const properties = feature?.properties;
  if (feature?.geometry?.type !== 'Point' || !Array.isArray(coordinates) || !properties || !feature.id) return false;
  const [lng, lat, depth] = coordinates;
  if (typeof lng !== 'number' || !Number.isFinite(lng) || Math.abs(lng) > 180 || typeof lat !== 'number' || !Number.isFinite(lat) || Math.abs(lat) > 90) return false;
  if (depth != null && (typeof depth !== 'number' || !Number.isFinite(depth))) return false;
  if (properties.mag != null && (typeof properties.mag !== 'number' || !Number.isFinite(properties.mag))) return false;
  if (typeof properties.time !== 'number' || !Number.isFinite(properties.time) || properties.time <= 0 || properties.time > maxFutureMs) return false;
  return true;
}

export function isValidUsgsFeed(value: unknown): boolean {
  if (!isUsgsFeatureCollectionStructure(value)) return false;
  const maxFutureMs = Date.now() + 2 * 3600 * 1000;
  const ids = new Set<string>();
  return (value as any).features.every((feature: any) => {
    if (!isValidUsgsFeature(feature, maxFutureMs)) return false;
    const id = String(feature.id);
    if (ids.has(id)) return false;
    ids.add(id);
    return true;
  });
}

export function isValidBmkgRecord(b: unknown): boolean {
  if (!b || typeof b !== 'object') return false;
  const item = b as Record<string, any>;
  if (typeof item.lat !== 'number' || typeof item.lng !== 'number' || !Number.isFinite(item.lat) || !Number.isFinite(item.lng)) return false;
  if (item.lat < -90 || item.lat > 90 || item.lng < -180 || item.lng > 180) return false;

  const rawTime = item.datetime || (item.date && item.time ? `${item.date} ${item.time}` : '');
  if (!rawTime || typeof rawTime !== 'string') return false;
  const parsedMs = parseStrictIsoOrCalendarTime(rawTime);
  if (parsedMs === null) {
    return false;
  }
  if (parsedMs > Date.now() + 2 * 3600 * 1000) {
    return false;
  }

  if (item.magnitude != null && (typeof item.magnitude !== 'number' || !Number.isFinite(item.magnitude) || item.magnitude < 0 || item.magnitude > 10)) {
    return false;
  }
  if (item.depthKm != null && (typeof item.depthKm !== 'number' || !Number.isFinite(item.depthKm) || item.depthKm < 0)) {
    return false;
  }
  return true;
}

export function earthquakeRetrievalState(usgsValid: boolean, bmkgValid: boolean): 'LIVE' | 'PARTIAL' | 'STALE' {
  return usgsValid && bmkgValid ? 'LIVE' : usgsValid || bmkgValid ? 'PARTIAL' : 'STALE';
}

export interface EarthquakeRecord {
  id: string;
  lat: number;
  lng: number;
  depth?: number;
  mag?: number;
  place?: string;
  time?: number | string;
  felt?: string;
  source: 'USGS' | 'BMKG';
  monitoringSource: string;
  name: string;
  visualSummary: string;
}

export interface EarthquakeSnapshot {
  readonly queryKey: string;
  readonly requestId: string;
  readonly dataSnapshotId?: string;
  readonly provider: string;
  readonly feed: string;
  readonly records: readonly EarthquakeRecord[];
  readonly renderedRecords: readonly EarthquakeRecord[];
  readonly status: 'LIVE' | 'PARTIAL' | 'STALE' | 'EMPTY' | 'UNAVAILABLE';
  readonly fetchedAt: number;
  readonly fetchedAtIso: string;
  readonly lastAttemptAt?: number;
  readonly lastSuccessfulFetchAt?: number | null;
  readonly counts: {
    readonly totalReceived: number;
    readonly validRecords: number;
    readonly renderedMarkers: number;
  };
  readonly sourceAttempts: ReadonlyArray<{
    readonly source: 'USGS' | 'BMKG';
    readonly status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
    readonly receivedCount: number;
    readonly validCount: number;
    readonly httpStatus?: number;
    readonly error?: string;
  }>;
  readonly reason?: string;
}

export interface EarthquakeQueryOptions {
  feed?: '2.5_day' | '2.5_week' | 'all_day' | '4.5_month' | string;
  includeBmkg?: boolean;
  force?: boolean;
  signal?: AbortSignal;
}

export function selectDeterministicEarthquakeLOD(
  records: readonly EarthquakeRecord[],
  maxCount = 40
): EarthquakeRecord[] {
  if (records.length <= maxCount) return [...records];

  const scored = records.map((r, index) => {
    const mag = typeof r.mag === 'number' && Number.isFinite(r.mag) ? r.mag : 0;
    const isMajor = mag >= 5.0;
    const isFelt = !!r.felt;
    const rawTime = typeof r.time === 'number' ? r.time : Date.parse(String(r.time || ''));
    const timeNorm = Number.isFinite(rawTime) ? rawTime / 1e12 : 0;

    let priority = 0;
    if (isMajor) priority += 10000 + mag * 100;
    else if (mag >= 3.0) priority += 1000 + mag * 10;
    else priority += mag * 10;

    if (isFelt) priority += 500;
    priority += timeNorm;

    return { record: r, priority, id: r.id || String(index) };
  });

  scored.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.id.localeCompare(b.id);
  });

  return scored.slice(0, maxCount).map(s => s.record);
}

function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== 'object') return obj as Readonly<T>;
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    const val = (obj as any)[key];
    if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  }
  return obj as Readonly<T>;
}

class EarthquakeSnapshotService {
  private cache = new Map<string, EarthquakeSnapshot>();
  private inFlight = new Map<
    string,
    {
      id: string;
      promise: Promise<EarthquakeSnapshot>;
      controller: AbortController;
      consumerCount: number;
      signals: Set<AbortSignal>;
    }
  >();
  private subscribers = new Map<string, Set<(snapshot: EarthquakeSnapshot) => void>>();
  private subscribedOptions = new Map<string, EarthquakeQueryOptions>();
  private timers = new Map<string, any>();
  private visibilityAttached = false;

  private ensureVisibilityListener() {
    if (this.visibilityAttached || typeof document === 'undefined') return;
    this.visibilityAttached = true;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        for (const [queryKey, subs] of this.subscribers.entries()) {
          if (subs.size === 0) continue;
          const cached = this.cache.get(queryKey);
          if (!cached || now - (cached.lastAttemptAt || cached.fetchedAt) >= 120000) {
            const original = this.subscribedOptions.get(queryKey);
            const feed = original?.feed || queryKey.split(':')[1] || '2.5_day';
            const includeBmkg = original?.includeBmkg !== undefined ? original.includeBmkg : !queryKey.endsWith(':nobmkg');
            this.fetchEarthquakeSnapshot({ feed, includeBmkg, force: true }).catch(() => {});
          }
        }
      }
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        for (const [queryKey, subs] of this.subscribers.entries()) {
          if (subs.size === 0) continue;
          const original = this.subscribedOptions.get(queryKey);
          const feed = original?.feed || queryKey.split(':')[1] || '2.5_day';
          const includeBmkg = original?.includeBmkg !== undefined ? original.includeBmkg : !queryKey.endsWith(':nobmkg');
          this.fetchEarthquakeSnapshot({ feed, includeBmkg, force: true }).catch(() => {});
        }
      });
    }
  }

  public getLatestSnapshot(optionsOrFeed: EarthquakeQueryOptions | string = '2.5_day'): EarthquakeSnapshot | null {
    if (typeof optionsOrFeed === 'string') {
      const feed = optionsOrFeed;
      return this.cache.get(`eq:${feed}:bmkg`) || this.cache.get(`eq:${feed}:nobmkg`) || null;
    }
    const feed = optionsOrFeed?.feed || '2.5_day';
    const includeBmkg = optionsOrFeed?.includeBmkg !== false;
    const queryKey = `eq:${feed}:${includeBmkg ? 'bmkg' : 'nobmkg'}`;
    return this.cache.get(queryKey) || null;
  }

  public async fetchEarthquakeSnapshot(options?: EarthquakeQueryOptions): Promise<EarthquakeSnapshot> {
    if (options?.signal?.aborted) {
      throw new DOMException('Permintaan gempa telah dibatalkan oleh pemanggil.', 'AbortError');
    }

    const feed = options?.feed || '2.5_day';
    const includeBmkg = options?.includeBmkg !== false;
    const queryKey = `eq:${feed}:${includeBmkg ? 'bmkg' : 'nobmkg'}`;

    if (!options?.force) {
      const cached = this.cache.get(queryKey);
      if (cached && Date.now() - cached.fetchedAt < 60000 && cached.status !== 'UNAVAILABLE') {
        return cached;
      }
    }

    let flight = this.inFlight.get(queryKey);

    if (!flight) {
      const flightId = `flight_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const controller = new AbortController();
      const fetchPromise = this.executeFetch(queryKey, feed, includeBmkg, controller.signal);
      flight = {
        id: flightId,
        promise: fetchPromise,
        controller,
        consumerCount: 0,
        signals: new Set<AbortSignal>(),
      };
      this.inFlight.set(queryKey, flight);

      fetchPromise
        .catch(() => {})
        .finally(() => {
          const current = this.inFlight.get(queryKey);
          if (current && current.id === flightId) {
            this.inFlight.delete(queryKey);
          }
        });
    }

    flight.consumerCount++;
    const currentFlight = flight;

    if (!options?.signal) {
      try {
        return await currentFlight.promise;
      } finally {
        currentFlight.consumerCount--;
        if (currentFlight.consumerCount <= 0) {
          currentFlight.controller.abort();
        }
      }
    }

    const callerSignal = options.signal;
    return new Promise<EarthquakeSnapshot>((resolve, reject) => {
      let settled = false;

      const onAbort = () => {
        if (settled) return;
        settled = true;
        callerSignal.removeEventListener('abort', onAbort);
        currentFlight.consumerCount--;
        if (currentFlight.consumerCount <= 0) {
          currentFlight.controller.abort();
        }
        reject(new DOMException('Permintaan gempa telah dibatalkan oleh pemanggil.', 'AbortError'));
      };

      callerSignal.addEventListener('abort', onAbort, { once: true });

      currentFlight.promise.then(
        (res) => {
          if (settled) return;
          settled = true;
          callerSignal.removeEventListener('abort', onAbort);
          currentFlight.consumerCount--;
          if (currentFlight.consumerCount <= 0) {
            currentFlight.controller.abort();
          }
          resolve(res);
        },
        (err) => {
          if (settled) return;
          settled = true;
          callerSignal.removeEventListener('abort', onAbort);
          currentFlight.consumerCount--;
          if (currentFlight.consumerCount <= 0) {
            currentFlight.controller.abort();
          }
          reject(err);
        }
      );
    });
  }

  private async executeFetch(
    queryKey: string,
    feed: string,
    includeBmkg: boolean,
    signal: AbortSignal
  ): Promise<EarthquakeSnapshot> {
    const requestId = `eq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const usgsUrl = `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${feed}.geojson`;

    let usgsSuccess = false;
    let usgsHttp = 0;
    let usgsPayload: any = null;
    let usgsError: string | undefined;
    let usgsReceivedCount = 0;
    let usgsValidCount = 0;

    let bmkgSuccess = false;
    let bmkgHttp = 0;
    let bmkgData: any[] = [];
    let bmkgError: string | undefined;
    let bmkgReceivedCount = 0;
    let bmkgValidCount = 0;

    const fetches: Promise<void>[] = [];

    fetches.push(
      (async () => {
        const timeoutCtrl = new AbortController();
        const timer = setTimeout(() => {
          timeoutCtrl.abort(new DOMException('Batas waktu USGS 10 detik terlampaui.', 'TimeoutError'));
        }, 10000);
        const onParentAbort = () => timeoutCtrl.abort(signal.reason);
        signal.addEventListener('abort', onParentAbort, { once: true });

        try {
          const res = await fetch(usgsUrl, { signal: timeoutCtrl.signal });
          usgsHttp = res.status;
          if (!res.ok) throw new Error(`USGS HTTP ${res.status}`);
          const payload = await res.json();
          if (!isUsgsFeatureCollectionStructure(payload)) throw new Error('Format feed USGS tidak valid');
          usgsPayload = payload;
          usgsReceivedCount = payload?.features?.length || 0;
          const validFeatures = (payload.features || []).filter((f: any) => isValidUsgsFeature(f));
          usgsValidCount = validFeatures.length;

          if (usgsReceivedCount > 0 && usgsValidCount === 0) {
            usgsSuccess = false;
            usgsError = 'Seluruh fitur USGS memiliki koordinat atau data tidak valid.';
          } else {
            usgsSuccess = true;
            if (usgsValidCount < usgsReceivedCount) {
              usgsError = `${usgsReceivedCount - usgsValidCount} rekaman USGS tidak valid ditolak.`;
            }
          }
        } catch (err: any) {
          usgsSuccess = false;
          usgsError = err?.message || 'Gagal mengambil feed USGS';
        } finally {
          clearTimeout(timer);
          signal.removeEventListener('abort', onParentAbort);
        }
      })()
    );

    if (includeBmkg) {
      fetches.push(
        (async () => {
          const timeoutCtrl = new AbortController();
          const timer = setTimeout(() => {
            timeoutCtrl.abort(new DOMException('Batas waktu BMKG 10 detik terlampaui.', 'TimeoutError'));
          }, 10000);
          const onParentAbort = () => timeoutCtrl.abort(signal.reason);
          signal.addEventListener('abort', onParentAbort, { once: true });

          try {
            const res = await fetch('/api/bmkg/gempa/terkini', { signal: timeoutCtrl.signal });
            bmkgHttp = res.status;
            const body = await res.json().catch(() => null);
            if (!res.ok) {
              if (body?.data && Array.isArray(body.data) && body.data.length > 0) {
                const validRows = body.data.filter(isValidBmkgRecord);
                if (validRows.length > 0) {
                  bmkgData = body.data;
                  bmkgReceivedCount = bmkgData.length;
                  bmkgValidCount = validRows.length;
                  bmkgSuccess = true;
                  bmkgError = body.error || `Server BMKG sementara tidak merespons (HTTP ${res.status}); menggunakan data cache (${body.source || 'stale_cache'}).`;
                } else {
                  throw new Error(body?.error || `BMKG HTTP ${res.status}`);
                }
              } else {
                throw new Error(body?.error || `BMKG HTTP ${res.status}`);
              }
            } else if (body?.success === true && Array.isArray(body?.data)) {
              bmkgData = body.data;
              bmkgReceivedCount = bmkgData.length;
              const validRows = bmkgData.filter(isValidBmkgRecord);
              bmkgValidCount = validRows.length;

              if (bmkgReceivedCount > 0 && bmkgValidCount === 0) {
                bmkgSuccess = false;
                bmkgError = 'Seluruh baris gempa BMKG memiliki data koordinat atau waktu tidak valid.';
              } else {
                bmkgSuccess = true;
                if (bmkgValidCount < bmkgReceivedCount) {
                  bmkgError = `${bmkgReceivedCount - bmkgValidCount} rekaman BMKG tidak valid ditolak.`;
                }
              }
            } else {
              throw new Error(body?.error || body?.message || 'Format data BMKG tidak valid');
            }
          } catch (err: any) {
            bmkgSuccess = false;
            bmkgError = err?.message || 'Gagal mengambil data BMKG InaTEWS';
          } finally {
            clearTimeout(timer);
            signal.removeEventListener('abort', onParentAbort);
          }
        })()
      );
    }

    await Promise.allSettled(fetches);

    if (signal.aborted) {
      throw new DOMException('Permintaan snapshot gempa dibatalkan.', 'AbortError');
    }

    const mergedRecords: EarthquakeRecord[] = [];
    const seenIds = new Set<string>();

    if (bmkgSuccess && Array.isArray(bmkgData)) {
      for (const b of bmkgData) {
        if (!isValidBmkgRecord(b)) continue;
        const id = `bmkg_${b.datetime || `${b.date}_${b.time}`}`;
        if (seenIds.has(id)) continue;
        seenIds.add(id);

        const mag = typeof b.magnitude === 'number' && Number.isFinite(b.magnitude) ? b.magnitude : undefined;
        const depth = typeof b.depthKm === 'number' && Number.isFinite(b.depthKm) ? b.depthKm : undefined;
        mergedRecords.push({
          id,
          lat: b.lat,
          lng: b.lng,
          mag,
          depth,
          place: b.location || 'Wilayah Indonesia',
          time: b.datetime || `${b.date} ${b.time}`,
          felt: b.felt || undefined,
          source: 'BMKG',
          monitoringSource: 'InaTEWS BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)',
          name: `Gempa M${mag != null ? mag.toFixed(1) : '?'} (BMKG)`,
          visualSummary: `Episenter ${b.location || 'Indonesia'}. Magnitudo M${mag != null ? mag.toFixed(1) : '?'} pada kedalaman ${depth ?? 'belum tersedia'} km. [InaTEWS BMKG]`,
        });
      }
      bmkgValidCount = mergedRecords.filter(r => r.source === 'BMKG').length;
    }

    if (usgsSuccess && usgsPayload?.features && Array.isArray(usgsPayload.features)) {
      for (const f of usgsPayload.features) {
        if (!isValidUsgsFeature(f)) continue;
        const [lng, lat, depth] = f.geometry.coordinates;
        const id = `usgs_${f.id}`;
        if (seenIds.has(id)) continue;
        seenIds.add(id);

        const mag = typeof f.properties?.mag === 'number' && Number.isFinite(f.properties.mag) ? f.properties.mag : undefined;
        mergedRecords.push({
          id,
          lat,
          lng,
          mag,
          depth: typeof depth === 'number' && Number.isFinite(depth) ? depth : undefined,
          place: f.properties?.place || 'Samudra / Global',
          time: f.properties?.time,
          source: 'USGS',
          monitoringSource: 'USGS Earthquake Hazards Program (Global Seismographic Network)',
          name: `Gempa M${mag != null ? mag.toFixed(1) : '?'} (USGS)`,
          visualSummary: `Episenter ${f.properties?.place || 'Global'}. Magnitudo M${mag != null ? mag.toFixed(1) : '?'} pada kedalaman ${depth ?? 'belum tersedia'} km. [USGS Global]`,
        });
      }
      usgsValidCount = mergedRecords.filter(r => r.source === 'USGS').length;
      if (usgsReceivedCount > 0 && usgsValidCount === 0) {
        usgsSuccess = false;
        usgsError = 'Seluruh fitur USGS memiliki koordinat tidak valid.';
      }
    }

    const usgsStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED' =
      !usgsSuccess ? 'FAILED'
      : (usgsReceivedCount > 0 && usgsValidCount < usgsReceivedCount) ? 'PARTIAL'
      : 'SUCCESS';

    const bmkgStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED' =
      !bmkgSuccess ? 'FAILED'
      : (bmkgReceivedCount > 0 && bmkgValidCount < bmkgReceivedCount) ? 'PARTIAL'
      : 'SUCCESS';

    const attempts: Array<{
      source: 'USGS' | 'BMKG';
      status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
      receivedCount: number;
      validCount: number;
      httpStatus?: number;
      error?: string;
    }> = [
      {
        source: 'USGS',
        status: usgsStatus,
        receivedCount: usgsReceivedCount,
        validCount: usgsValidCount,
        httpStatus: usgsHttp || undefined,
        error: usgsError,
      },
    ];

    if (includeBmkg) {
      attempts.push({
        source: 'BMKG',
        status: bmkgStatus,
        receivedCount: bmkgReceivedCount,
        validCount: bmkgValidCount,
        httpStatus: bmkgHttp || undefined,
        error: bmkgError,
      });
    }

    const previous = this.cache.get(queryKey);
    let status: EarthquakeSnapshot['status'];
    let finalRecords = mergedRecords;
    const now = Date.now();

    if (usgsSuccess && (bmkgSuccess || !includeBmkg)) {
      if (usgsStatus === 'PARTIAL' || (includeBmkg && bmkgStatus === 'PARTIAL')) {
        status = 'PARTIAL';
      } else {
        status = mergedRecords.length > 0 ? 'LIVE' : 'EMPTY';
      }
    } else if (usgsSuccess || (includeBmkg && bmkgSuccess)) {
      status = 'PARTIAL';
    } else {
      if (previous && previous.records.length > 0) {
        status = 'STALE';
        finalRecords = [...previous.records];
      } else {
        status = 'UNAVAILABLE';
      }
    }

    const rendered = selectDeterministicEarthquakeLOD(finalRecords, 40);

    const fetchedAt = status === 'STALE' && previous ? previous.fetchedAt : now;
    const fetchedAtIso = status === 'STALE' && previous ? previous.fetchedAtIso : new Date(fetchedAt).toISOString();
    const lastSuccessfulFetchAt = status === 'STALE' && previous
      ? (previous.lastSuccessfulFetchAt ?? previous.fetchedAt)
      : (status !== 'UNAVAILABLE' ? now : null);
    const lastAttemptAt = now;
    const dataSnapshotId = status === 'STALE' && previous
      ? (previous.dataSnapshotId ?? previous.requestId)
      : requestId;

    const totalReceived = (includeBmkg ? bmkgReceivedCount : 0) + usgsReceivedCount;

    const snapshot: EarthquakeSnapshot = deepFreeze({
      queryKey,
      requestId,
      dataSnapshotId,
      provider: includeBmkg ? 'USGS+BMKG' : 'USGS',
      feed,
      records: finalRecords,
      renderedRecords: rendered,
      status,
      fetchedAt,
      fetchedAtIso,
      lastAttemptAt,
      lastSuccessfulFetchAt,
      counts: {
        totalReceived: status === 'STALE' && previous ? previous.counts.totalReceived : totalReceived,
        validRecords: finalRecords.length,
        renderedMarkers: rendered.length,
      },
      sourceAttempts: attempts,
      reason:
        status === 'PARTIAL'
          ? [usgsError, bmkgError].filter(Boolean).join('; ')
          : status === 'STALE'
          ? `Gagal memperbarui feed: ${[usgsError, bmkgError].filter(Boolean).join('; ')}`
          : undefined,
    });

    this.cache.set(queryKey, snapshot);

    const subs = this.subscribers.get(queryKey);
    if (subs) {
      subs.forEach(listener => {
        try {
          listener(snapshot);
        } catch (e) {
          console.error('Error in earthquake snapshot subscriber:', e);
        }
      });
    }

    return snapshot;
  }

  public subscribeEarthquakes(
    options: EarthquakeQueryOptions,
    listener: (snapshot: EarthquakeSnapshot) => void
  ): () => void {
    const feed = options?.feed || '2.5_day';
    const includeBmkg = options?.includeBmkg !== false;
    const queryKey = `eq:${feed}:${includeBmkg ? 'bmkg' : 'nobmkg'}`;

    this.subscribedOptions.set(queryKey, { ...options });

    if (!this.subscribers.has(queryKey)) {
      this.subscribers.set(queryKey, new Set());
    }
    const subs = this.subscribers.get(queryKey)!;
    subs.add(listener);

    const cached = this.cache.get(queryKey);
    if (cached) {
      try {
        listener(cached);
      } catch (err) {
        console.error('Initial subscriber emission error:', err);
      }
    }

    if (subs.size === 1) {
      this.fetchEarthquakeSnapshot(options).catch(() => {});
      const timer = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
          return;
        }
        this.fetchEarthquakeSnapshot({ ...options, force: true }).catch(() => {});
      }, 120000);
      this.timers.set(queryKey, timer);
    }

    this.ensureVisibilityListener();

    return () => {
      subs.delete(listener);
      if (subs.size === 0) {
        this.subscribers.delete(queryKey);
        this.subscribedOptions.delete(queryKey);
        const timer = this.timers.get(queryKey);
        if (timer) {
          clearInterval(timer);
          this.timers.delete(queryKey);
        }
      }
    };
  }
}

export const earthquakeSnapshotService = new EarthquakeSnapshotService();
