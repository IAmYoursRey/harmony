const SOURCES = ['VIIRS_SNPP_NRT', 'VIIRS_NOAA20_NRT', 'VIIRS_NOAA21_NRT', 'MODIS_NRT'];
const DAY_MS = 86400000;
const CSV_HEADER = 'latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,frp,daynight,source_id';
const cache = new Map();
const pending = new Map();
const numeric = value => value == null || String(value).trim() === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null;

export function normalizeFirmsQuery(query = {}) {
  const source = typeof query.source === 'string' ? query.source : 'VIIRS_SNPP_NRT';
  if (![...SOURCES, 'ALL', 'VIIRS'].includes(source)) throw new Error('INVALID_SOURCE');
  const dayRange = Number(query.dayRange ?? 1);
  if (!Number.isInteger(dayRange) || dayRange < 1 || dayRange > 7) throw new Error('INVALID_DAY_RANGE');
  if (typeof query.bbox !== 'string') throw new Error('INVALID_BBOX');
  const parts = query.bbox.split(',');
  const bbox = parts.map(numeric);
  if (parts.length !== 4 || bbox.some(v => v === null)) throw new Error('INVALID_BBOX');
  const [west, south, east, north] = bbox;
  if (west < -180 || west > 180 || east < -180 || east > 180 || south < -90 || north > 90 || south >= north || west === east) throw new Error('INVALID_BBOX');
  return { bbox, source, dayRange, sources: source === 'ALL' ? SOURCES : source === 'VIIRS' ? SOURCES.filter(s => s.startsWith('VIIRS')) : [source] };
}
export function parseFirmsCsv(csv, source) {
  const lines = csv.trim().split(/\r?\n/);
  const headers = lines[0].replace(/^\uFEFF/, '').split(',').map(h => h.trim().toLowerCase());
  if (!['latitude', 'longitude', 'acq_date', 'acq_time'].every(h => headers.includes(h))) throw new Error('INVALID_CSV_HEADER');
  const records = [];
  let receivedCount = 0, rejectedCount = 0;
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    receivedCount++;
    const columns = line.split(',').map(v => v.trim());
    if (columns.length !== headers.length) { rejectedCount++; continue; }
    const row = Object.fromEntries(headers.map((h, i) => [h, columns[i]]));
    const lat = numeric(row.latitude), lng = numeric(row.longitude);
    const time = /^\d{1,4}$/.test(row.acq_time) ? row.acq_time.padStart(4, '0') : '';
    const hh = Number(time.slice(0, 2)), mm = Number(time.slice(2));
    const acquisitionTime = /^\d{4}-\d{2}-\d{2}$/.test(row.acq_date) && time && hh < 24 && mm < 60 ? `${row.acq_date}T${time.slice(0,2)}:${time.slice(2)}:00.000Z` : '';
    const stamp = Date.parse(acquisitionTime);
    if (lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180 || !Number.isFinite(stamp) || new Date(stamp).toISOString() !== acquisitionTime) { rejectedCount++; continue; }
    const brightness = numeric(row.brightness || row.bright_ti4), frp = numeric(row.frp);
    records.push({ id: `${source}:${row.satellite || 'unknown'}:${acquisitionTime}:${lat}:${lng}`, source, lat, lng, acquisitionTime, acqDate: row.acq_date, acqTime: time, brightness: brightness !== null && brightness > 0 ? brightness : null, frp: frp !== null && frp >= 0 ? frp : null, confidence: row.confidence || 'unknown', satellite: row.satellite || 'Unknown', instrument: source.startsWith('MODIS') ? 'MODIS' : 'VIIRS', scan: numeric(row.scan), track: numeric(row.track), dayNight: row.daynight || 'unknown', rawAttributes: row });
  }
  if (receivedCount > 0 && records.length === 0) throw Object.assign(new Error('ALL_CSV_RECORDS_INVALID'), { receivedCount, rejectedCount });
  return { records, receivedCount, rejectedCount };
}
const toCsv = records => [CSV_HEADER, ...records.map(r => [r.lat,r.lng,r.brightness ?? '',r.scan ?? '',r.track ?? '',r.acqDate,r.acqTime,r.satellite,r.instrument,r.confidence,r.frp ?? '',r.dayNight,r.source].join(','))].join('\n');

export async function fetchFirmsSnapshot(query, key, { now = Date.now(), fetchImpl = (...args) => globalThis.fetch(...args), useCache = true, totalTimeoutMs = 45000 } = {}) {
  const cacheKey = `${key}:${JSON.stringify(query)}`;
  const stored = cache.get(cacheKey);
  if (useCache && stored && now - stored.at < 300000) return { ...stored.body, cached: true, provenance: { ...stored.body.provenance, cached: true } };
  if (useCache && pending.has(cacheKey)) return pending.get(cacheKey);
  const run = async () => {
    const deadline = Date.now() + totalTimeoutMs;
    const startTime = now - query.dayRange * DAY_MS;
    const earliestDay = Math.floor(startTime / DAY_MS);
    const currentDay = Math.floor(now / DAY_MS);
    // Latest calendar days first; each NASA query is at most five days.
    const intervals = [];
    for (let end = currentDay; end >= earliestDay;) {
      const start = Math.max(earliestDay, end - 4);
      intervals.push({ date: new Date(start * DAY_MS).toISOString().slice(0,10), days: end - start + 1 });
      end = start - 1;
    }
    const [west,south,east,north] = query.bbox;
    const boxes = west > east ? [[west,south,180,north],[-180,south,east,north]].filter(b => b[0] < b[2]) : [query.bbox];
    const attempts = [], all = [], seen = new Set();
    let receivedCount = 0, rejectedCount = 0, successfulRequests = 0;
    for (const source of query.sources) {
      for (const bbox of boxes) for (const interval of intervals) {
        const remainingMs = deadline - Date.now();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), Math.max(1, Math.min(12000, remainingMs)));
        const attempt = { source, bbox, date: interval.date, dayRange: interval.days, status: 'FAILED', httpStatus: null, receivedCount: 0, rejectedCount: 0, validCount: 0, acceptedCount: 0 };
        try {
          if (remainingMs <= 0) throw new Error('REQUEST_BUDGET_EXHAUSTED');
          const response = await fetchImpl(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(key)}/${source}/${bbox.join(',')}/${interval.days}/${interval.date}`, { signal: controller.signal });
          attempt.httpStatus = response.status;
          if (!response.ok) throw new Error(`HTTP_${response.status}`);
          if (Number(response.headers.get('content-length')) > 8 * 1024 * 1024) throw new Error('RESPONSE_TOO_LARGE');
          const csv = await response.text();
          if (csv.length > 8 * 1024 * 1024) throw new Error('RESPONSE_TOO_LARGE');
          const parsed = parseFirmsCsv(csv, source);
          attempt.receivedCount = parsed.receivedCount;
          attempt.rejectedCount = parsed.rejectedCount;
          attempt.validCount = parsed.records.length;
          receivedCount += parsed.receivedCount;
          rejectedCount += parsed.rejectedCount;
          attempt.status = parsed.rejectedCount ? 'PARTIAL' : 'SUCCESS';
          successfulRequests++;
          let attemptAccepted = 0;
          for (const record of parsed.records) {
            const stamp = Date.parse(record.acquisitionTime);
            if (stamp < startTime || stamp > now || record.lat < south || record.lat > north || (west <= east ? record.lng < west || record.lng > east : record.lng < west && record.lng > east) || seen.has(record.id)) continue;
            seen.add(record.id); all.push(record);
            attemptAccepted++;
          }
          attempt.acceptedCount = attemptAccepted;
        } catch (error) {
          attempt.receivedCount = error?.receivedCount || 0;
          attempt.rejectedCount = error?.rejectedCount || 0;
          receivedCount += attempt.receivedCount;
          rejectedCount += attempt.rejectedCount;
          // Never return raw network messages/URLs because they may contain the MAP_KEY.
          attempt.error = error?.name === 'AbortError' ? 'TIMEOUT' : /^(HTTP_\d+|INVALID_CSV_HEADER|ALL_CSV_RECORDS_INVALID|RESPONSE_TOO_LARGE|REQUEST_BUDGET_EXHAUSTED)$/.test(error?.message || '') ? error.message : 'UPSTREAM_FETCH_FAILED';
        } finally { clearTimeout(timeout); attempts.push(attempt); }
      }
    }
    const partial = attempts.some(a => a.status !== 'SUCCESS');
    const fetchedAt = new Date(now).toISOString();
    const success = successfulRequests > 0;
    const body = { success, count: all.length, acceptedCount: all.length, receivedCount, rejectedCount, data: all, rawCsv: toCsv(all), csvFormat: 'HARMONY_NORMALIZED_FIRMS_V1', source: query.source, dayRange: query.dayRange, windowStart: new Date(startTime).toISOString(), windowEnd: fetchedAt, sourceAttempts: attempts, partial, cached: false, ...(success ? {} : { error: 'Tidak ada respons FIRMS yang valid. Data kosong ini bukan nol deteksi yang terverifikasi.' }), provenance: { sourceType: 'SATELLITE_HOTSPOT', provider: 'NASA FIRMS', dataStatus: success ? partial ? 'PARTIAL' : 'LIVE' : 'UNAVAILABLE', fetchedAt, attribution: 'NASA LANCE / FIRMS MODIS & VIIRS', cached: false } };
    if (useCache && success) { if (cache.size >= 32) cache.delete(cache.keys().next().value); cache.set(cacheKey, { at: now, body }); }
    return body;
  };
  const promise = run();
  if (useCache) pending.set(cacheKey, promise);
  try { return await promise; } finally { if (useCache) pending.delete(cacheKey); }
}
