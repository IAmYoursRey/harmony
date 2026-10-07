export interface ActiveFireHotspot {
  id: string;
  lat: number;
  lng: number;
  brightnessKelvin: number | null;
  brightnessCelsius: number | null;
  frpMw: number | null;
  confidence: 'low' | 'nominal' | 'high' | 'unknown' | number;
  satellite: string;
  instrument: 'VIIRS' | 'MODIS' | 'UNKNOWN';
  acqDate: string;
  acqTime: string;
  dayNight: 'D' | 'N' | 'unknown';
  locationName?: string;
  fireRiskLevel?: 'Rendah' | 'Sedang' | 'Tinggi' | 'Ekstrem' | 'Belum dinilai';
  vegetationType?: string;
  isPartial?: boolean;
}

export interface HotspotQueryOptions {
  bbox?: [number, number, number, number]; // [west, south, east, north]
  source?: 'VIIRS_SNPP_NRT' | 'VIIRS_NOAA20_NRT' | 'VIIRS_NOAA21_NRT' | 'MODIS_NRT' | 'ALL' | 'VIIRS';
  dayRange?: number; // 1 to 7
  force?: boolean;
  signal?: AbortSignal;
}

export interface HotspotSnapshot {
  readonly queryKey: string;
  readonly requestId: string;
  readonly dataSnapshotId?: string;
  readonly provider: string;
  readonly source: string;
  readonly bbox: [number, number, number, number];
  readonly dayRange: number;
  readonly records: readonly ActiveFireHotspot[];
  readonly renderedRecords: readonly ActiveFireHotspot[];
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
    readonly source: string;
    readonly bbox?: [number, number, number, number];
    readonly date?: string;
    readonly dayRange?: number;
    readonly status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
    readonly receivedCount: number;
    readonly validCount: number;
    readonly acceptedCount?: number;
    readonly rejectedCount?: number;
    readonly httpStatus?: number;
    readonly error?: string;
  }>;
  readonly reason?: string;
}

export function selectDeterministicHotspotLOD(
  records: readonly ActiveFireHotspot[],
  maxCount = 60
): ActiveFireHotspot[] {
  if (records.length <= maxCount) return [...records];

  const scored = records.map((h, index) => {
    const frp = typeof h.frpMw === 'number' && Number.isFinite(h.frpMw) ? h.frpMw : 0;
    const confScore =
      h.confidence === 'high'
        ? 300
        : h.confidence === 'nominal'
        ? 100
        : typeof h.confidence === 'number'
        ? h.confidence
        : 50;
    const tempK = typeof h.brightnessKelvin === 'number' && Number.isFinite(h.brightnessKelvin) ? h.brightnessKelvin : 0;

    const priority = frp * 10 + confScore + (tempK > 350 ? 50 : 0);
    return { record: h, priority, id: h.id || String(index) };
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

export interface FireMonitoringSummary {
  totalHotspots: number;
  highConfidenceCount: number;
  maxFrpMw: number | null;
  maxTempCelsius: number | null;
  criticalRegions: Array<{ region: string; count: number }>;
  lastUpdated: string;
  attribution: string;
  dataStatus: 'LIVE' | 'PARTIAL' | 'STALE' | 'EMPTY' | 'UNAVAILABLE';
}

class HotspotFireService {
  private cache = new Map<string, HotspotSnapshot>();
  private inFlight = new Map<
    string,
    {
      id: string;
      promise: Promise<HotspotSnapshot>;
      controller: AbortController;
      consumerCount: number;
      signals: Set<AbortSignal>;
    }
  >();
  private subscribers = new Map<string, Set<(snapshot: HotspotSnapshot) => void>>();
  private subscribedOptions = new Map<string, HotspotQueryOptions>();
  private timers = new Map<string, any>();
  private visibilityAttached = false;

  private status: 'UNCHECKED' | 'AVAILABLE' | 'PARTIAL' | 'FAILED' = 'UNCHECKED';
  private error: string | null = null;
  private lastFetchTime = 0;

  private ensureVisibilityListener() {
    if (this.visibilityAttached || typeof document === 'undefined') return;
    this.visibilityAttached = true;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        for (const [queryKey, subs] of this.subscribers.entries()) {
          if (subs.size === 0) continue;
          const cached = this.cache.get(queryKey);
          if (!cached || now - (cached.lastAttemptAt || cached.fetchedAt) >= 180000) {
            this.fetchHotspotSnapshotByKey(queryKey, true).catch(() => {});
          }
        }
      }
    });
  }

  public getRetrievalStatus() {
    return {
      status: this.status,
      error: this.error,
      fetchedAt: this.lastFetchTime ? new Date(this.lastFetchTime).toISOString() : null,
    };
  }

  public getLatestSnapshot(options?: HotspotQueryOptions): HotspotSnapshot | null {
    const bbox = options?.bbox || [94.0, -11.0, 141.5, 6.5];
    const source = options?.source || 'VIIRS_SNPP_NRT';
    const dayRange = Math.min(7, Math.max(1, options?.dayRange || 1));
    const cacheKey = `${bbox.join(',')}_${source}_${dayRange}`;
    return this.cache.get(cacheKey) || null;
  }

  private async fetchHotspotSnapshotByKey(queryKey: string, force = false): Promise<HotspotSnapshot> {
    const orig = this.subscribedOptions.get(queryKey);
    if (orig) {
      return this.fetchHotspotSnapshot({ ...orig, force });
    }
    const last_ = queryKey.lastIndexOf('_');
    const dayRange = parseInt(queryKey.slice(last_ + 1), 10) || 1;
    const first_ = queryKey.indexOf('_');
    const bboxParts = queryKey.slice(0, first_).split(',').map(Number);
    const bbox: [number, number, number, number] = [bboxParts[0], bboxParts[1], bboxParts[2], bboxParts[3]];
    const source = queryKey.slice(first_ + 1, last_) as HotspotQueryOptions['source'];
    return this.fetchHotspotSnapshot({ bbox, source, dayRange, force });
  }

  public async fetchHotspotSnapshot(options?: HotspotQueryOptions): Promise<HotspotSnapshot> {
    if (options?.signal?.aborted) {
      throw new DOMException('Permintaan titik panas telah dibatalkan oleh pemanggil.', 'AbortError');
    }

    const bbox = options?.bbox || [94.0, -11.0, 141.5, 6.5];
    const source = options?.source || 'VIIRS_SNPP_NRT';
    const dayRange = Math.min(7, Math.max(1, options?.dayRange || 1));
    const queryKey = `${bbox.join(',')}_${source}_${dayRange}`;

    if (!options?.force) {
      const cached = this.cache.get(queryKey);
      if (cached && Date.now() - cached.fetchedAt < 60000 && cached.status !== 'UNAVAILABLE') {
        this.status = (cached.status === 'LIVE' || cached.status === 'EMPTY') ? 'AVAILABLE'
          : cached.status === 'PARTIAL' ? 'PARTIAL'
          : cached.status === 'STALE' ? 'PARTIAL'
          : 'FAILED';
        this.error = cached.reason || null;
        this.lastFetchTime = cached.fetchedAt;
        return cached;
      }
    }

    const existing = this.inFlight.get(queryKey);
    if (existing) {
      existing.consumerCount++;
      let cleanedUp = false;
      let onAbort: (() => void) | undefined;
      const flightId = existing.id;

      if (options?.signal) {
        const sig = options.signal;
        existing.signals.add(sig);
        onAbort = () => {
          if (cleanedUp) return;
          cleanedUp = true;
          const current = this.inFlight.get(queryKey);
          if (current && current.id === flightId) {
            current.signals.delete(sig);
            current.consumerCount--;
            if (current.consumerCount <= 0) {
              current.controller.abort();
            }
          }
        };
        sig.addEventListener('abort', onAbort, { once: true });
      }

      try {
        return await existing.promise;
      } finally {
        if (options?.signal && onAbort) {
          cleanedUp = true;
          options.signal.removeEventListener('abort', onAbort);
        }
      }
    }

    const flightId = `flight_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const controller = new AbortController();
    const signals = new Set<AbortSignal>();
    let cleanedUp = false;
    let onAbort: (() => void) | undefined;

    if (options?.signal) {
      const sig = options.signal;
      signals.add(sig);
      onAbort = () => {
        if (cleanedUp) return;
        cleanedUp = true;
        const current = this.inFlight.get(queryKey);
        if (current && current.id === flightId) {
          current.signals.delete(sig);
          current.consumerCount--;
          if (current.consumerCount <= 0) {
            current.controller.abort();
          }
        }
      };
      sig.addEventListener('abort', onAbort, { once: true });
    }

    const fetchPromise = this.executeFetch(queryKey, bbox, source, dayRange, controller.signal);
    this.inFlight.set(queryKey, {
      id: flightId,
      promise: fetchPromise,
      controller,
      consumerCount: 1,
      signals,
    });

    try {
      const snapshot = await fetchPromise;
      return snapshot;
    } finally {
      if (options?.signal && onAbort) {
        cleanedUp = true;
        options.signal.removeEventListener('abort', onAbort);
      }
      const current = this.inFlight.get(queryKey);
      if (current && current.id === flightId) {
        this.inFlight.delete(queryKey);
      }
    }
  }

  private async executeFetch(
    queryKey: string,
    bbox: [number, number, number, number],
    source: string,
    dayRange: number,
    signal: AbortSignal
  ): Promise<HotspotSnapshot> {
    const requestId = `firms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const previous = this.cache.get(queryKey);
    const now = Date.now();

    const timeoutDuration = source === 'ALL' || source === 'VIIRS' || dayRange > 5 ? 60000 : 30000;
    const internalController = new AbortController();
    const abortHandler = () => internalController.abort();

    if (signal.aborted) {
      internalController.abort();
    } else {
      signal.addEventListener('abort', abortHandler, { once: true });
    }
    const timer = setTimeout(() => internalController.abort(), timeoutDuration);

    let resHttp = 0;
    let resError: string | undefined;

    try {
      const query = new URLSearchParams({
        bbox: bbox.join(','),
        source,
        dayRange: String(dayRange),
      });

      const res = await fetch(`/api/spatial/hotspots?${query.toString()}`, {
        signal: internalController.signal,
      });
      resHttp = res.status;
      const body = await res.json();

      if (!res.ok || body.success !== true || !Array.isArray(body.data)) {
        throw new Error(body?.reason?.message || body?.error || 'Respons titik panas tidak valid.');
      }

      let partialCount = 0;
      let rejectedCount = 0;
      const mapped: ActiveFireHotspot[] = [];

      const parseStrictNum = (v: unknown): number | null => {
        if (typeof v === 'number') return Number.isFinite(v) ? v : null;
        if (typeof v === 'string' && /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(v.trim())) {
          const num = Number(v.trim());
          return Number.isFinite(num) ? num : null;
        }
        return null;
      };

      for (let index = 0; index < body.data.length; index++) {
        const item = body.data[index];
        const lat = parseStrictNum(item.lat);
        const lng = parseStrictNum(item.lng);

        if (lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
          rejectedCount++;
          continue;
        }

        let acqDate: string | null = null;
        if (typeof item.acqDate === 'string') {
          const matchDate = item.acqDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (matchDate) {
            const y = parseInt(matchDate[1], 10);
            const m = parseInt(matchDate[2], 10);
            const d = parseInt(matchDate[3], 10);
            const isLeap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
            const daysInMonth = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
            if (y >= 1970 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth[m - 1]) {
              acqDate = item.acqDate.trim();
            }
          }
        }

        let acqTime: string | null = null;
        if (typeof item.acqTime === 'string') {
          const strTime = item.acqTime.trim().padStart(4, '0');
          const matchTime = strTime.match(/^(\d{2})(\d{2})$/);
          if (matchTime) {
            const hh = parseInt(matchTime[1], 10);
            const mm = parseInt(matchTime[2], 10);
            if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
              acqTime = strTime;
            }
          }
        }

        if (!acqDate || !acqTime) {
          rejectedCount++;
          continue;
        }

        const rawBrightness = item.brightness ?? item.bright_ti4;
        const bNum = parseStrictNum(rawBrightness);
        const brightnessKelvin = bNum !== null && bNum > 0 ? bNum : null;
        const brightnessCelsius = brightnessKelvin !== null ? Number((brightnessKelvin - 273.15).toFixed(1)) : null;

        const rawFrp = item.frp;
        const frpNum = parseStrictNum(rawFrp);
        const frpMw = frpNum !== null && frpNum >= 0 ? frpNum : null;

        const isPartial = brightnessKelvin === null || frpMw === null;
        if (isPartial) partialCount++;

        const rawConf = String(item.confidence ?? '').trim().toLowerCase();
        let confidence: 'low' | 'nominal' | 'high' | 'unknown' | number = 'unknown';
        if (/^\d+(\.\d+)?$/.test(rawConf)) {
          const numConf = Number(rawConf);
          if (Number.isFinite(numConf) && numConf >= 0 && numConf <= 100) {
            confidence = numConf;
          } else {
            rejectedCount++;
            continue;
          }
        } else if (['h', 'high'].includes(rawConf)) {
          confidence = 'high';
        } else if (['l', 'low'].includes(rawConf)) {
          confidence = 'low';
        } else if (['n', 'nominal'].includes(rawConf)) {
          confidence = 'nominal';
        } else if (rawConf === '' || rawConf === 'null' || rawConf === 'undefined') {
          confidence = 'unknown';
        } else {
          rejectedCount++;
          continue;
        }

        const sat = String(item.satellite || '').trim();
        const instrument: 'VIIRS' | 'MODIS' | 'UNKNOWN' =
          item.instrument === 'MODIS' || /MODIS|Terra|Aqua/i.test(sat) || source.startsWith('MODIS')
            ? 'MODIS'
            : item.instrument === 'VIIRS' || /VIIRS|SNPP|NOAA/i.test(sat) || source.startsWith('VIIRS')
            ? 'VIIRS'
            : 'UNKNOWN';

        mapped.push({
          id:
            item.id ||
            `firms-${item.source || source}-${item.satellite || 'unknown'}-${acqDate}-${acqTime}-${lat}-${lng}`,
          lat,
          lng,
          brightnessKelvin,
          brightnessCelsius,
          frpMw,
          confidence,
          satellite: sat || 'Tidak tersedia',
          instrument,
          acqDate,
          acqTime,
          dayNight: item.dayNight === 'N' ? 'N' : item.dayNight === 'D' ? 'D' : 'unknown',
          locationName: `Deteksi anomali termal (${lat.toFixed(2)}, ${lng.toFixed(2)})`,
          fireRiskLevel: 'Belum dinilai',
          isPartial,
        });
      }

      if (body.data.length > 0 && mapped.length === 0) {
        throw new Error('Semua deteksi memiliki atribut, tanggal, atau koordinat tidak valid.');
      }

      const allAttemptsFailed = Array.isArray(body.sourceAttempts) &&
        body.sourceAttempts.length > 0 &&
        body.sourceAttempts.every((att: any) => att.status === 'FAILED');

      const anyAttemptFailed = Array.isArray(body.sourceAttempts) &&
        body.sourceAttempts.some((att: any) => att.status === 'FAILED');

      const totalReceived = typeof body.receivedCount === 'number' ? body.receivedCount : body.data.length;
      const isBodyPartial = body.partial === true || body.provenance?.dataStatus === 'PARTIAL';
      const isPartial = partialCount > 0 || rejectedCount > 0 || isBodyPartial || (typeof body.rejectedCount === 'number' && body.rejectedCount > 0) || anyAttemptFailed;

      let status: HotspotSnapshot['status'];
      let finalRecords = mapped;
      if (allAttemptsFailed) {
        status = 'UNAVAILABLE';
        finalRecords = [];
      } else if (body.provenance?.dataStatus === 'STALE') {
        status = 'STALE';
      } else if (mapped.length === 0 && !isPartial) {
        status = 'EMPTY';
      } else if (isPartial) {
        status = 'PARTIAL';
      } else {
        status = 'LIVE';
      }

      const providerTime = Date.parse(body.provenance?.fetchedAt || '');
      const fetchedAt = Number.isFinite(providerTime) ? providerTime : now;

      const reason = allAttemptsFailed
        ? 'Seluruh percobaan akuisisi FIRMS berstatus FAILED; payload tidak dapat diverifikasi sebagai observasi LIVE.'
        : isPartial
        ? [
            isBodyPartial ? 'Sebagian sumber atau rentang waktu tidak lengkap.' : '',
            anyAttemptFailed ? 'Satu atau lebih sumber sensor FIRMS mengalami kegagalan pengambilan.' : '',
            rejectedCount ? `${rejectedCount} rekaman tidak valid ditolak di klien.` : '',
            body.rejectedCount ? `${body.rejectedCount} rekaman tidak valid ditolak di penyedia.` : '',
            partialCount ? `${partialCount} deteksi memiliki parameter intensitas/suhu parsial.` : '',
          ]
            .filter(Boolean)
            .join(' ')
        : undefined;

      const rendered = selectDeterministicHotspotLOD(finalRecords, 60);

      const sourceAttempts = Array.isArray(body.sourceAttempts) && body.sourceAttempts.length > 0
        ? body.sourceAttempts.map((att: any) => ({
            source: String(att.source || `FIRMS_${source}`),
            bbox: Array.isArray(att.bbox) ? att.bbox : bbox,
            date: att.date ? String(att.date) : undefined,
            dayRange: typeof att.dayRange === 'number' ? att.dayRange : dayRange,
            status: att.status === 'SUCCESS' ? 'SUCCESS' : att.status === 'PARTIAL' ? 'PARTIAL' : 'FAILED',
            receivedCount: typeof att.receivedCount === 'number' ? att.receivedCount : 0,
            validCount: typeof att.validCount === 'number' ? att.validCount : (typeof att.acceptedCount === 'number' ? att.acceptedCount : 0),
            acceptedCount: typeof att.acceptedCount === 'number' ? att.acceptedCount : undefined,
            rejectedCount: typeof att.rejectedCount === 'number' ? att.rejectedCount : 0,
            httpStatus: typeof att.httpStatus === 'number' ? att.httpStatus : undefined,
            error: att.error ? String(att.error) : undefined,
          }))
        : [
            {
              source: `FIRMS_${source}`,
              bbox,
              dayRange,
              status: isPartial ? 'PARTIAL' : 'SUCCESS',
              receivedCount: totalReceived,
              validCount: mapped.length,
              acceptedCount: mapped.length,
              rejectedCount,
              httpStatus: resHttp,
              error: reason,
            },
          ];

      const snapshot: HotspotSnapshot = deepFreeze({
        queryKey,
        requestId,
        dataSnapshotId: requestId,
        provider: 'NASA_FIRMS',
        source,
        bbox,
        dayRange,
        records: finalRecords,
        renderedRecords: rendered,
        status,
        fetchedAt,
        fetchedAtIso: new Date(fetchedAt).toISOString(),
        lastAttemptAt: now,
        lastSuccessfulFetchAt: status !== 'UNAVAILABLE' ? fetchedAt : null,
        counts: {
          totalReceived: allAttemptsFailed ? 0 : totalReceived,
          validRecords: finalRecords.length,
          renderedMarkers: rendered.length,
        },
        sourceAttempts,
        reason,
      });

      this.cache.set(queryKey, snapshot);
      this.status = (status === 'LIVE' || status === 'EMPTY') ? 'AVAILABLE' : status === 'PARTIAL' ? 'PARTIAL' : status === 'UNAVAILABLE' ? 'FAILED' : 'AVAILABLE';
      this.error = reason || null;
      this.lastFetchTime = fetchedAt;

      this.notifySubscribers(queryKey, snapshot);
      return snapshot;
    } catch (err: any) {
      resError = err instanceof Error ? err.message : 'Pengambilan titik panas gagal.';

      let fallbackSnapshot: HotspotSnapshot;
      if (previous && previous.records.length > 0) {
        fallbackSnapshot = deepFreeze({
          ...previous,
          status: 'STALE',
          lastAttemptAt: now,
          lastSuccessfulFetchAt: previous.lastSuccessfulFetchAt ?? previous.fetchedAt,
          dataSnapshotId: previous.dataSnapshotId ?? previous.requestId,
          reason: `Pembaruan gagal: ${resError}`,
          sourceAttempts: [
            {
              source: `FIRMS_${source}`,
              status: 'FAILED',
              receivedCount: 0,
              validCount: 0,
              httpStatus: resHttp || undefined,
              error: resError,
            },
          ],
        });
        this.status = 'PARTIAL';
      } else {
        fallbackSnapshot = deepFreeze({
          queryKey,
          requestId,
          dataSnapshotId: requestId,
          provider: 'NASA_FIRMS',
          source,
          bbox,
          dayRange,
          records: [],
          renderedRecords: [],
          status: 'UNAVAILABLE',
          fetchedAt: now,
          fetchedAtIso: new Date(now).toISOString(),
          lastAttemptAt: now,
          lastSuccessfulFetchAt: null,
          counts: {
            totalReceived: 0,
            validRecords: 0,
            renderedMarkers: 0,
          },
          sourceAttempts: [
            {
              source: `FIRMS_${source}`,
              status: 'FAILED',
              receivedCount: 0,
              validCount: 0,
              httpStatus: resHttp || undefined,
              error: resError,
            },
          ],
          reason: resError,
        });
        this.status = 'FAILED';
      }

      this.error = resError;
      this.cache.set(queryKey, fallbackSnapshot);
      this.notifySubscribers(queryKey, fallbackSnapshot);
      return fallbackSnapshot;
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', abortHandler);
    }
  }

  private notifySubscribers(queryKey: string, snapshot: HotspotSnapshot) {
    const subs = this.subscribers.get(queryKey);
    if (subs) {
      subs.forEach(listener => {
        try {
          listener(snapshot);
        } catch (e) {
          console.error('Error in hotspot snapshot subscriber:', e);
        }
      });
    }
  }

  public subscribeHotspots(
    options: HotspotQueryOptions,
    listener: (snapshot: HotspotSnapshot) => void
  ): () => void {
    const bbox = options?.bbox || [94.0, -11.0, 141.5, 6.5];
    const source = options?.source || 'VIIRS_SNPP_NRT';
    const dayRange = Math.min(7, Math.max(1, options?.dayRange || 1));
    const queryKey = `${bbox.join(',')}_${source}_${dayRange}`;

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
        console.error('Initial hotspot subscriber emission error:', err);
      }
    }

    if (subs.size === 1) {
      this.fetchHotspotSnapshot(options).catch(() => {});
      const timer = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
          return;
        }
        this.fetchHotspotSnapshot({ ...options, force: true }).catch(() => {});
      }, 180000);
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

  public async getActiveHotspots(options?: HotspotQueryOptions): Promise<ActiveFireHotspot[]> {
    const snapshot = await this.fetchHotspotSnapshot(options);
    return [...snapshot.records];
  }

  public async getSummary(options?: HotspotQueryOptions): Promise<FireMonitoringSummary> {
    const snapshot = await this.fetchHotspotSnapshot(options);
    const hotspots = snapshot.records;
    let highConfidenceCount = 0;
    let maxFrpMw: number | null = null;
    let maxTempCelsius: number | null = null;

    for (let i = 0; i < hotspots.length; i++) {
      const h = hotspots[i];
      if (h.confidence === 'high' || (typeof h.confidence === 'number' && h.confidence >= 80)) {
        highConfidenceCount++;
      }
      if (h.frpMw !== null && (maxFrpMw === null || h.frpMw > maxFrpMw)) {
        maxFrpMw = h.frpMw;
      }
      if (h.brightnessCelsius !== null && (maxTempCelsius === null || h.brightnessCelsius > maxTempCelsius)) {
        maxTempCelsius = h.brightnessCelsius;
      }
    }

    return {
      totalHotspots: hotspots.length,
      highConfidenceCount,
      maxFrpMw,
      maxTempCelsius,
      criticalRegions: [],
      lastUpdated: snapshot.fetchedAt ? new Date(snapshot.fetchedAt).toISOString() : 'Belum tersedia',
      attribution: 'NASA FIRMS; data SiPongi tidak diunduh secara langsung',
      dataStatus: snapshot.status,
    };
  }
}

export const hotspotFireService = new HotspotFireService();
