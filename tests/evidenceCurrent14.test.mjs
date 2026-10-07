/**
 * Harmony Stage 2 Remediation Review — 14 Evidence Assertions Test Suite
 * Directly verifies that each of the 14 reproduction cases identified in
 * 2026-10-03-second-remediation-review/evidence-current.json passes cleanly.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

let apiClient;
let routing;
let lst;
let ispu;
let parseTime;
let eq;
let fire;
let geo;

const originalFetch = globalThis.fetch;
const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
const tick = () => new Promise((r) => setTimeout(r, 0));

before(async () => {
  const repo = process.cwd();
  const bundle = await build({
    stdin: {
      contents: `
        export { apiClient } from './apps/web/src/services/apiClient.ts';
        export { routingService as routing } from './apps/web/src/services/routingService.ts';
        export { lstService as lst } from './apps/web/src/services/geospatial/lstService.ts';
        export { ispuCalculatorService as ispu } from './apps/web/src/services/geospatial/ispuCalculatorService.ts';
        export { parseStrictIsoOrCalendarTime as parseTime, earthquakeSnapshotService as eq } from './apps/web/src/services/geospatial/earthquakeSnapshotService.ts';
        export { hotspotFireService as fire } from './apps/web/src/services/hotspotFireService.ts';
        export { geospatialAnalysisService as geo } from './apps/web/src/services/geospatialAnalysisService.ts';
      `,
      resolveDir: repo,
      loader: 'ts',
    },
    tsconfig: `${repo}/apps/web/tsconfig.app.json`,
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    define: { 'import.meta.env': '{}' },
  });

  const imported = await import(
    `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`
  );
  apiClient = imported.apiClient;
  routing = imported.routing;
  lst = imported.lst;
  ispu = imported.ispu;
  parseTime = imported.parseTime;
  eq = imported.eq;
  fire = imported.fire;
  geo = imported.geo;
});

after(() => {
  globalThis.fetch = originalFetch;
});

describe('Harmony Stage 2 - 14 Evidence Verification Suite', () => {
  test('1. API_OLD_ABORT_DELETES_NEW_FLIGHT: Aborting first request does not delete second in-flight request', async () => {
    apiClient.clearCache();
    let calls = 0;
    const gates = [];

    globalThis.fetch = (url, options) => {
      calls++;
      return new Promise((resolve, reject) => {
        gates.push(() => resolve(json({ version: calls })));
        options.signal?.addEventListener(
          'abort',
          () => reject(new DOMException('fixture cancelled', 'AbortError')),
          { once: true }
        );
      });
    };

    const cancel = new AbortController();
    const a = apiClient.get('/fixture/race', { signal: cancel.signal });
    a.catch(() => {});
    cancel.abort();

    const b = apiClient.get('/fixture/race');
    await tick();
    const c = apiClient.get('/fixture/race');

    assert.equal(calls, 2, 'Third caller C must share second request B, resulting in exactly 2 network calls');

    gates.forEach((release) => release());
    const [resA, resB, resC] = await Promise.allSettled([a, b, c]);
    assert.equal(resA.status, 'rejected');
    assert.equal(resB.status, 'fulfilled');
    assert.equal(resC.status, 'fulfilled');
    assert.deepEqual(resB.value, resC.value);
  });

  test('2. API_OLD_GET_REPOPULATES_INVALIDATED_CACHE: Stale in-flight GET does not overwrite mutated cache', async () => {
    apiClient.clearCache();
    let releaseOld;
    let gets = 0;

    globalThis.fetch = (url, options) =>
      options.method === 'POST'
        ? Promise.resolve(json({ version: 2 }))
        : gets === 0
        ? new Promise((resolve) => {
            gets++;
            releaseOld = () => resolve(json({ version: 1 }));
          })
        : (gets++, Promise.resolve(json({ version: 2 })));

    const oldGet = apiClient.get('/fixture/mutation');
    await apiClient.post('/fixture/mutation', { version: 2 });
    releaseOld();
    await oldGet;

    const afterMutation = await apiClient.get('/fixture/mutation');
    assert.equal(
      afterMutation.version,
      2,
      'Subsequent GET after mutation must return fresh version 2, not stale version 1'
    );
    assert.equal(gets, 2, 'Must issue a fresh network request because cache was invalidated');
  });

  test('3. API_CACHE_BYPASSES_JSON_CONTRACT: Cached text responses must not bypass JSON contract checks', async () => {
    apiClient.clearCache();
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return new Response('<html>fallback</html>', {
        headers: { 'content-type': 'text/html' },
      });
    };

    const textVal = await apiClient.get('/fixture/type', { expectedType: 'text' });
    assert.equal(typeof textVal, 'string');

    let thrownError = null;
    try {
      await apiClient.get('/fixture/type', { expectedType: 'json' });
    } catch (e) {
      thrownError = e;
    }

    assert.ok(thrownError, 'Request expecting JSON must reject non-JSON content');
    assert.equal(thrownError.name, 'APIError');
    assert.equal(calls, 2, 'Different expectedType must bypass conflicting text cache key');
  });

  test('4. API_BODY_ABORT_RECLASSIFIED_AS_JSON_FAILURE: AbortError during json reading is not wrapped as 502', async () => {
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => {
        throw new DOMException('fixture cancelled while reading body', 'AbortError');
      },
    });

    let thrownError = null;
    try {
      await apiClient.fetch('/fixture/body-abort');
    } catch (e) {
      thrownError = e;
    }

    assert.ok(thrownError, 'Must throw error on abort');
    assert.equal(thrownError.name, 'AbortError', 'Must preserve AbortError without reclassifying as 502 APIError');
  });

  test('5. ROUTE_NEGATIVE_WEATHER_SAFE: Negative physical weather parameters cannot yield Sangat Aman', async () => {
    globalThis.fetch = async () =>
      json({
        code: 'Ok',
        routes: [
          {
            distance: 1000,
            duration: 60,
            geometry: { type: 'LineString', coordinates: [[112, -7], [112.1, -7.1]] },
            legs: [],
          },
        ],
      });

    const route = await routing.calculateRoute({ lat: -7, lng: 112 }, { lat: -7.1, lng: 112.1 }, -1, -10);
    assert.equal(route.safetyLevel, 'Belum Dinilai', 'Negative weather parameters must result in Belum Dinilai');
    assert.equal(route.safetyScore, null, 'Safety score must be null for invalid physical parameters');
    assert.equal(route.recommendedSpeedKmh, null, 'Recommended speed must be null');
    assert.ok(route.weatherRiskSummary.includes('tidak valid') || route.weatherRiskSummary.includes('negatif'));
  });

  test('6. LST_AOI_IGNORED: Points outside AOI polygon are clipped by point-in-polygon', () => {
    const aoi = {
      id: 'fixture-aoi',
      name: 'Fixture polygon',
      sourceType: 'DRAWN_POLYGON',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [111, -8],
            [113, -8],
            [113, -6],
            [111, -6],
            [111, -8],
          ],
        ],
      },
      crs: 'EPSG:4326',
      bbox: [111, -8, 113, -6],
      areaKm2: 1,
      perimeterKm: 4,
      centroid: [112, -7],
      createdAt: new Date().toISOString(),
    };
    const meta = { id: 'fixture-modis', satellite: 'MODIS Terra/Aqua', acquisitionDate: new Date().toISOString() };
    const outside = lst.processThermalRaster(aoi, meta, [
      { lat: -7, lng: 112, rawDN: 15000, qaPixel: 0 },
      { lat: 45, lng: -100, rawDN: 16000, qaPixel: 0 },
    ]);

    assert.equal(outside.data?.validPixelCount, 1, 'Only pixel inside AOI polygon should be valid');
    assert.equal(outside.provenance.validAreaKm2, 1, 'Valid area should only reflect clipped inside pixels');
    assert.equal(outside.data?.meanCelsius, 26.85, 'Mean temperature must only consider inside pixel');
  });

  test('7. LST_MISSING_QA_VALID: Pixels without QA pixel band are rejected as unverified', () => {
    const meta = { id: 'fixture-modis', satellite: 'MODIS Terra/Aqua', acquisitionDate: new Date().toISOString() };
    const noQa = lst.processThermalRaster(null, meta, [{ lat: -7, lng: 112, rawDN: 15000 }]);

    assert.equal(noQa.dataStatus, 'UNAVAILABLE');
    assert.equal(noQa.data?.samples[0]?.qualityValid, false);
    assert.equal(noQa.reason?.code, 'QA_UNVERIFIED');
  });

  test('8. LST_CLEAR_COLD_PIXEL_CLOUD_REASON: Valid cold radiometric pixels are retained within physical range', () => {
    const meta = { id: 'fixture-modis', satellite: 'MODIS Terra/Aqua', acquisitionDate: new Date().toISOString() };
    const cold = lst.processThermalRaster(null, meta, [{ lat: 65, lng: 20, rawDN: 12250, qaPixel: 0 }]);

    const converted = lst.convertDNToCelsius(12250, 'MODIS Terra/Aqua');
    assert.equal(converted, -28.15);
    assert.equal(cold.dataStatus, 'DERIVED', 'Cold pixel with clear QA is valid within physical -70 to 80C range');
    assert.equal(cold.data?.meanCelsius, -28.15);
  });

  test('9. BMKG_TIMEZONE_FALLBACK: Calendar time without timezone defaults to WIB (+07:00), rejects unknown timezone', () => {
    const withoutZone = new Date(parseTime('2026-10-03 10:00:00')).toISOString();
    const explicitWib = new Date(parseTime('2026-10-03 10:00:00 WIB')).toISOString();
    const unknownZone = parseTime('2026-10-03 10:00:00 XYZ');

    assert.equal(withoutZone, explicitWib, 'Datetime without timezone must default to WIB matching explicit WIB');
    assert.equal(unknownZone, null, 'Unknown timezone must be rejected as null');
  });

  test('10. USGS_MIXED_ROWS_DISCARDED: Partial valid feed preserves valid rows and reports status PARTIAL', async () => {
    const goodFeature = {
      id: 'fixture-good',
      geometry: { type: 'Point', coordinates: [112, -7, 10] },
      properties: { time: Date.now() - 1000, mag: 4 },
    };
    globalThis.fetch = async () =>
      json({
        type: 'FeatureCollection',
        features: [
          goodFeature,
          { ...goodFeature, id: 'fixture-invalid', geometry: { type: 'Point', coordinates: [112, 999, 10] } },
        ],
      });

    const mixed = await eq.fetchEarthquakeSnapshot({ feed: 'all_hour', includeBmkg: false, force: true });
    assert.equal(mixed.status, 'PARTIAL', 'Feed with partial errors must have status PARTIAL');
    assert.equal(mixed.records.length, 1, 'Valid record must be retained');
    assert.equal(mixed.counts.totalReceived, 2);
    assert.equal(mixed.counts.validRecords, 1);
    assert.equal(mixed.sourceAttempts[0].status, 'PARTIAL');
  });

  test('11. CANCELLED_EARTHQUAKE_WRITES_FAILURE: Aborted earthquake requests do not write UNAVAILABLE to cache', async () => {
    globalThis.fetch = (url, options) =>
      new Promise((resolve, reject) =>
        options.signal.addEventListener(
          'abort',
          () => reject(new DOMException('fixture cancelled', 'AbortError')),
          { once: true }
        )
      );

    const eqCancel = new AbortController();
    const eqPromise = eq.fetchEarthquakeSnapshot({
      feed: 'all_week',
      includeBmkg: false,
      force: true,
      signal: eqCancel.signal,
    });
    eqPromise.catch(() => {});
    eqCancel.abort();
    await Promise.allSettled([eqPromise]);
    await tick();

    const cancelledCache = eq.cache.get('eq:all_week:nobmkg');
    assert.equal(cancelledCache, undefined, 'Aborted fetch must not write failure snapshot to cache');
  });

  test('12. FIRMS_CONTRADICTORY_ATTEMPTS_LIVE: All source attempts failed cannot yield LIVE snapshot', async () => {
    const d = new Date(Date.now() - 3600000);
    const date = d.toISOString().slice(0, 10);
    const hhmm = d.toISOString().slice(11, 16).replace(':', '');

    globalThis.fetch = async () =>
      json({
        success: true,
        partial: false,
        data: [
          {
            lat: -7,
            lng: 112,
            acqDate: date,
            acqTime: hhmm,
            brightness: 330,
            frp: 3,
            confidence: 'h',
            satellite: 'N',
            instrument: 'VIIRS',
            source: 'VIIRS_SNPP_NRT',
          },
        ],
        sourceAttempts: [
          { source: 'VIIRS_SNPP_NRT', status: 'FAILED', httpStatus: 503, receivedCount: 0, validCount: 0 },
        ],
        provenance: { fetchedAt: new Date().toISOString(), dataStatus: 'LIVE' },
      });

    const conflicting = await fire.fetchHotspotSnapshot({
      bbox: [111, -8, 113, -6],
      source: 'VIIRS_SNPP_NRT',
      dayRange: 1,
      force: true,
    });

    assert.equal(conflicting.status, 'UNAVAILABLE', 'When all attempts failed, snapshot must be UNAVAILABLE, not LIVE');
    assert.equal(conflicting.counts.validRecords, 0);
  });

  test('13. GNSS_GEOJSON_LOSES_PER_POINT_METADATA: Exported GeoJSON preserves per-vertex metadata', () => {
    const track = JSON.parse(
      geo.exportTrackToGeoJSON(
        [
          { lat: -7, lng: 112, alt: null, speedKmh: null, accuracyM: 12, time: Date.now() - 1000, source: 'DEVICE_GEOLOCATION' },
          { lat: -7.1, lng: 112.1, alt: null, speedKmh: null, accuracyM: 10, time: Date.now(), source: 'SIMULATION' },
        ],
        'Fixture'
      )
    );

    const props = track.features[0].properties;
    assert.ok(props.coordinateProperties, 'Must contain coordinateProperties');
    assert.equal(props.coordinateProperties.times.length, 2, 'Must contain per-point timestamps');
    assert.equal(props.coordinateProperties.accuracies.length, 2, 'Must contain per-point accuracies');
    assert.equal(props.coordinateProperties.sources.length, 2, 'Must contain per-point sources');
    assert.ok(JSON.stringify(track).includes('DEVICE_GEOLOCATION'));
    assert.ok(JSON.stringify(track).includes('SIMULATION'));
  });

  test('14. ISPU_HOUR_BUCKET_OVERCOUNTS_NONALIGNED_WINDOW: Exactly 24 buckets in 24h rolling average with non-aligned anchor', () => {
    const anchor = Math.floor(Date.now() / 3600000) * 3600000 + 1800000;
    const minutePoints = Array.from({ length: 1440 }, (_, i) => ({
      time: anchor - i * 60000,
      value: 10,
    }));

    const result = ispu.calculateRollingAverageFromSeries(minutePoints, 24, { anchorTime: anchor });
    assert.equal(result.validSamples, 24, 'Must have exactly 24 hourly buckets, eliminating 25-bucket overcount');
    assert.equal(result.coveragePct, 1.0, 'Coverage must be 1.0 (100%), not 1.04');
    assert.equal(result.isSufficient, true);
    assert.equal(result.average, 10);
  });
});
