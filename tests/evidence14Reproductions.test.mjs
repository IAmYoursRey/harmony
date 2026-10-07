/**
 * Harmony 14 Reproduction Cases Verification Suite
 * Directly checks that each of the 14 reproduction cases identified in the
 * October 3, 2026 post-remediation review resolves with correct domain behavior.
 */

import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const bundled = await build({
  stdin: {
    contents: `
      export { ispuCalculatorService as ispu } from './apps/web/src/services/geospatial/ispuCalculatorService.ts';
      export { hotspotFireService as fire } from './apps/web/src/services/hotspotFireService.ts';
      export { isValidBmkgRecord, isValidUsgsFeed, earthquakeSnapshotService as eq } from './apps/web/src/services/geospatial/earthquakeSnapshotService.ts';
      export { lstService as lst } from './apps/web/src/services/geospatial/lstService.ts';
      export { routingService as routing } from './apps/web/src/services/routingService.ts';
      export { apiClient } from './apps/web/src/services/apiClient.ts';
    `,
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  tsconfig: 'apps/web/tsconfig.app.json',
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  define: { 'import.meta.env': '{}' },
});

const { ispu, fire, isValidBmkgRecord, isValidUsgsFeed, lst, routing, apiClient, eq } =
  await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);

const { fetchFirmsSnapshot, normalizeFirmsQuery } = await import(
  pathToFileURL(`${process.cwd()}/apps/server/src/services/firmsIntegrity.js`)
);

const { getFacilityAccessibility } = await import(
  pathToFileURL(`${process.cwd()}/apps/server/src/controllers/spatialController.js`)
);

const originalFetch = globalThis.fetch;
const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

let passed = 0;
let failed = 0;
const results = [];

async function check(name, fn) {
  try {
    await fn();
    passed++;
    results.push({ name, passed: true });
    console.log(`[PASS] ${name}`);
  } catch (err) {
    failed++;
    results.push({ name, passed: false, error: err.message });
    console.error(`[FAIL] ${name}: ${err.message}`);
  }
}

const now = Date.now();
const anchor = Math.floor(now / 3600000) * 3600000;

// 1. ISPU_UI_FALLBACK_FUTURE
await check('Case 1: ISPU_UI_FALLBACK_FUTURE excludes future forecast from rolling average', () => {
  const futureSeries = Array.from({ length: 48 }, (_, i) => ({
    time: anchor + i * 3600000,
    value: i === 0 ? 10 : 100,
  }));
  const res = ispu.calculateRollingAverageFromSeries(futureSeries, 24, {
    anchorTime: anchor,
    allowFutureHours: true,
  });
  assert.equal(res.validSamples, 1, 'Only the single anchor point should be within (anchor-24h, anchor]');
  assert.equal(res.isSufficient, false, '1 sample out of 24 is insufficient for 24h rolling average');
  assert.equal(res.average, null, 'Insufficient samples must return null average');
});

// 2. ISPU_25_HOURS_IN_24_WINDOW
await check('Case 2: ISPU_25_HOURS_IN_24_WINDOW uses half-open interval containing exactly 24 hourly samples', () => {
  const inclusiveSeries = Array.from({ length: 25 }, (_, i) => ({
    time: anchor - (24 - i) * 3600000,
    value: i === 0 ? 250 : 10,
  }));
  const res = ispu.calculateRollingAverageFromSeries(inclusiveSeries, 24, { anchorTime: anchor });
  assert.equal(res.validSamples, 24, 'Exactly 24 samples must be included in half-open interval');
  assert.equal(res.average, 10.0, 'Average must be 10.0, excluding the t - 24h boundary sample');
  assert.equal(res.coveragePct, 1.0);
  assert.equal(res.isSufficient, true);
});

// 3. ISPU_SECONDS_ANCHOR
await check('Case 3: ISPU_SECONDS_ANCHOR normalizes seconds anchor timestamp to current epoch', () => {
  const inclusiveSeries = Array.from({ length: 25 }, (_, i) => ({
    time: anchor - (24 - i) * 3600000,
    value: 10,
  }));
  const res = ispu.calculateRollingAverageFromSeries(inclusiveSeries, 24, { anchorTime: anchor / 1000 });
  assert.equal(res.validSamples, 24);
  assert.ok(res.windowEnd?.startsWith('202'), `Window end must be in 2020s, not 1970 (was ${res.windowEnd})`);
});

// 4. BMKG_IMPOSSIBLE_DATE_ACCEPTED
await check('Case 4: BMKG_IMPOSSIBLE_DATE_ACCEPTED strictly rejects impossible calendar date 2026-99-99', () => {
  const valid = isValidBmkgRecord({
    lat: -7,
    lng: 112,
    datetime: '2026-99-99T99:99:99Z',
    magnitude: 4,
    depthKm: 10,
  });
  assert.equal(valid, false, '2026-99-99 must be rejected as invalid date');
});

// 5. USGS_WRONG_COLLECTION_FUTURE_ACCEPTED
await check('Case 5: USGS_WRONG_COLLECTION_FUTURE_ACCEPTED rejects non-FeatureCollection and future timestamps', () => {
  const valid = isValidUsgsFeed({
    type: 'not-a-FeatureCollection',
    features: [
      {
        id: 'fixture',
        geometry: { type: 'Point', coordinates: [112, -7, 10] },
        properties: { mag: 4, time: now + 86400000 },
      },
    ],
  });
  assert.equal(valid, false, 'Invalid collection type and future time must be rejected');
});

// 6. FIRMS_ACTUAL_BACKEND_TO_FRONTEND_CONTRACT
await check('Case 6: FIRMS_ACTUAL_BACKEND_TO_FRONTEND_CONTRACT aligns attempts and preserves counts', async () => {
  const dateStr = new Date(now - 3600000).toISOString().slice(0, 10);
  const csv = `latitude,longitude,acq_date,acq_time,brightness,frp,satellite,confidence\n-7,112,${dateStr},0000,330,3,N,90`;
  const query = normalizeFirmsQuery({ bbox: '111,-8,113,-6', source: 'VIIRS_SNPP_NRT', dayRange: 2 });
  const backend = await fetchFirmsSnapshot(query, 'fixture-key', {
    useCache: false,
    now,
    fetchImpl: async () => new Response(csv),
  });

  assert.equal(backend.sourceAttempts[0].validCount, 1, 'Backend attempt must report validCount');
  assert.equal(backend.sourceAttempts[0].acceptedCount, 1, 'Backend attempt must report acceptedCount');

  globalThis.fetch = async () => json(backend);
  const snap = await fire.fetchHotspotSnapshot({
    bbox: query.bbox,
    source: query.source,
    dayRange: 2,
    force: true,
  });

  assert.equal(snap.counts.validRecords, 1);
  assert.equal(snap.sourceAttempts[0].validCount, 1, 'Frontend sourceAttempt must reflect actual valid count');
  assert.equal(snap.status, 'LIVE');
});

// 7. FIRMS_CLIENT_INVALID_CALENDAR
await check('Case 7: FIRMS_CLIENT_INVALID_CALENDAR rejects impossible calendar date 2026-02-31 and time 9999', async () => {
  globalThis.fetch = async () =>
    json({
      success: true,
      data: [
        {
          lat: -7,
          lng: 112,
          acqDate: '2026-02-31',
          acqTime: '9999',
          brightness: 330,
          frp: 3,
          confidence: '999',
          satellite: 'N',
          instrument: 'VIIRS',
        },
      ],
    });

  const badFire = await fire.fetchHotspotSnapshot({
    bbox: [111, -8, 113, -6],
    source: 'VIIRS_SNPP_NRT',
    dayRange: 1,
    force: true,
  });

  assert.equal(badFire.counts.validRecords, 0, 'Invalid calendar date and time must be rejected');
  assert.equal(badFire.status, 'UNAVAILABLE', 'When all records are rejected, status must be UNAVAILABLE, not LIVE');
});

// 8. API_HTML_200_CACHED
await check('Case 8: API_HTML_200_CACHED rejects text/html on json endpoints and does not cache', async () => {
  apiClient.clearCache();
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response('<html>SPA fallback</html>', {
      status: 200,
      headers: { 'content-type': 'text/html' },
    });
  };

  await assert.rejects(async () => {
    await apiClient.get('/fixture/json-endpoint');
  }, /HTML|Content-Type|bukan JSON/i);

  // Second call must NOT be served from cache; it must make a second network fetch
  await assert.rejects(async () => {
    await apiClient.get('/fixture/json-endpoint');
  }, /HTML|Content-Type|bukan JSON/i);

  assert.equal(calls, 2, 'Failed HTML response must not be cached as successful JSON');
});

// 9. API_APPLICATION_FAILURE_CACHED
await check('Case 9: API_APPLICATION_FAILURE_CACHED does not cache { success: false } as valid data', async () => {
  apiClient.clearCache();
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return json({ success: false, reason: { code: 'UPSTREAM_FAILED' } });
  };

  const res1 = await apiClient.get('/fixture/failed-envelope');
  assert.equal(res1.success, false);

  const res2 = await apiClient.get('/fixture/failed-envelope');
  assert.equal(res2.success, false);
  assert.equal(calls, 2, 'Application failure envelope must not be cached as successful response');
});

// 10. MODIS_LANDSAT_PROVENANCE
await check('Case 10: MODIS_LANDSAT_PROVENANCE reports MODIS metadata, 1000m GSD, and 1km² pixel area', () => {
  const meta = { id: 'fixture-modis', satellite: 'MODIS Terra/Aqua', acquisitionDate: new Date(anchor).toISOString() };
  const res = lst.processThermalRaster(null, meta, [{ lat: -7, lng: 112, rawDN: 15000, qaPixel: 0 }]);
  assert.ok(res.provenance.dataset.includes('MODIS'), `Dataset must specify MODIS (was ${res.provenance.dataset})`);
  assert.equal(res.provenance.spatialResolution, '1000m GSD (Sinusoidal grid)');
  assert.equal(res.provenance.validAreaKm2, 1.0, 'MODIS pixel area must be 1.0 km² per pixel, not 30m');
});

// 11. MODIS_QC_01_AS_FILL
await check('Case 11: MODIS_QC_01_AS_FILL treats MODIS QC 01 as produced valid LST (other quality), not fill/cloud', () => {
  const meta = { id: 'fixture-modis', satellite: 'MODIS Terra/Aqua', acquisitionDate: new Date(anchor).toISOString() };
  const res = lst.processThermalRaster(null, meta, [{ lat: -7, lng: 112, rawDN: 15000, qaPixel: 1 }]);
  assert.equal(res.dataStatus, 'DERIVED', 'QC flag 01 must be processed as valid LST');
  assert.equal(res.data?.validPixelCount, 1);
});

// 12. OSRM_NEGATIVE_METRICS_ACCEPTED
await check('Case 12: OSRM_NEGATIVE_METRICS_ACCEPTED rejects negative distance/duration and reports null safetyScore', async () => {
  globalThis.fetch = async () =>
    json({
      code: 'Ok',
      routes: [
        {
          distance: -1000,
          duration: -600,
          geometry: { type: 'LineString', coordinates: [[112, -7], [112.1, -7.1]] },
          legs: [],
        },
      ],
    });

  const route = await routing.calculateRoute({ lat: -7, lng: 112 }, { lat: -7.1, lng: 112.1 });
  assert.equal(route.routeMode, 'GEODESIC_REFERENCE', 'Negative metrics must trigger fallback');
  assert.equal(route.durationMin, null, 'Negative duration must not be accepted');
  assert.equal(route.safetyLevel, 'Belum Dinilai');
  assert.equal(route.safetyScore, null, 'Unassessed safetyScore must be null, not 75');
  assert.equal(route.recommendedSpeedKmh, null, 'Unassessed recommendedSpeedKmh must be null, not 60');
});

// 13. CANCELLED_EARTHQUAKE_CALLER_STILL_RESOLVES
await check('Case 13: CANCELLED_EARTHQUAKE_CALLER_STILL_RESOLVES rejects cancelled caller while in-flight fetch continues', async () => {
  let release;
  globalThis.fetch = () =>
    new Promise((resolve) => {
      release = () => resolve(json({ type: 'FeatureCollection', features: [] }));
    });

  const callerA = new AbortController();
  const promiseA = eq.fetchEarthquakeSnapshot({ feed: 'all_month', includeBmkg: false, force: true, signal: callerA.signal });
  const promiseB = eq.fetchEarthquakeSnapshot({ feed: 'all_month', includeBmkg: false, force: true });

  callerA.abort();
  release();

  await assert.rejects(promiseA, /AbortError|dibatalkan/i, 'Caller A must reject with AbortError');
  const snapB = await promiseB;
  assert.equal(snapB.status, 'EMPTY', 'Consumer B must complete normally with snapshot');
});

// 14. UNKNOWN_FACILITY_ALSO_MARKED_UNSERVED
await check('Case 14: UNKNOWN_FACILITY_ALSO_MARKED_UNSERVED separates insufficient data from unserved and sets compliance to null', async () => {
  let facilityBody;
  await getFacilityAccessibility(
    {
      body: {
        originPoint: [106.828, -6.178],
        originName: 'Fixture',
        profile: 'foot-walking',
        facilities: [{ id: 'f1', name: 'Fixture School', category: 'sekolah', lat: -6.18, lng: 106.83 }],
      },
    },
    {
      status() { return this; },
      json(body) { facilityBody = body; return this; },
    }
  );

  const trans = facilityBody.categoryReachability.find((c) => c.category === 'transportasi');
  assert.equal(trans.evaluationStatus, 'INSUFFICIENT_DATA');
  assert.equal(trans.hasAccess15Min, null);
  assert.ok(facilityBody.insufficientDataCategories.includes('transportasi'));
  assert.equal(facilityBody.unservedCategories.includes('transportasi'), false, 'Missing data must NOT be marked unserved');
  assert.equal(facilityBody.is15MinCityCompliant, null, 'Compliance must be null when inventory is incomplete');
  assert.equal(facilityBody.complianceStatus, 'NOT_EVALUABLE');
});

// Reset fetch
globalThis.fetch = originalFetch;

console.log('\n================================================================');
for (const r of results) {
  if (!r.passed) {
    console.error(`FAILED: ${r.name}`);
    console.error(`  Error: ${r.error}`);
  }
}
console.log(`14 REPRODUCTION VERIFICATION RESULTS: ${passed} passed, ${failed} failed`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
