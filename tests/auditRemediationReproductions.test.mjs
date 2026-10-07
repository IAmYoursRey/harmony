/**
 * Harmony Audit Remediation Reproductions & Regression Test Suite
 * Specifically tests the 6 audit reproductions and core domain edge-cases
 * established in "Prompt Gemini — audit ulang dan perbaikan data/API Harmony" (3 Oct 2026).
 */

import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundled = await build({
  stdin: {
    contents: `
      export { 
        earthquakeSnapshotService, 
        selectDeterministicEarthquakeLOD,
        isValidUsgsFeed,
        earthquakeRetrievalState 
      } from './apps/web/src/services/geospatial/earthquakeSnapshotService.ts';
      export { 
        hotspotFireService,
        selectDeterministicHotspotLOD 
      } from './apps/web/src/services/hotspotFireService.ts';
      export {
        ispuCalculatorService
      } from './apps/web/src/services/geospatial/ispuCalculatorService.ts';
      export {
        routingService
      } from './apps/web/src/services/routingService.ts';
      export {
        transportEmissionService
      } from './apps/web/src/services/geospatial/transportEmissionService.ts';
      export {
        terrainService
      } from './apps/web/src/services/geospatial/terrainService.ts';
      export {
        fetchCheckedJson
      } from './apps/web/src/services/weatherDataIntegrity.ts';
    `,
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  tsconfig: 'apps/web/tsconfig.app.json',
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  define: { 'import.meta.env': '{}' },
});

const {
  earthquakeSnapshotService: eqService,
  hotspotFireService: fireService,
  ispuCalculatorService: ispuService,
  routingService,
  transportEmissionService: emissionService,
  terrainService,
  fetchCheckedJson,
} = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);

import { getFacilityAccessibility } from '../apps/server/src/controllers/spatialController.js';

const results = [];
let passed = 0;
let failed = 0;

const test = async (name, fn) => {
  try {
    await fn();
    passed++;
    results.push({ name, passed: true });
  } catch (err) {
    failed++;
    results.push({ name, passed: false, error: err.message });
  }
};

const originalFetch = globalThis.fetch;

console.log('=== HARMONY AUDIT REMEDIATION REPRODUCTIONS TEST SUITE ===\n');

// ============================================================================
// REPRODUCTION 1: P0-01 BMKG All-Invalid Records Must NOT Report Source Success
// ============================================================================
await test('R1: BMKG all-invalid coordinates rejected with validation failure, combined status PARTIAL', async () => {
  globalThis.fetch = async (url) => {
    const s = String(url);
    if (s.includes('usgs.gov')) {
      // Valid empty USGS feed
      return new Response(JSON.stringify({ type: 'FeatureCollection', features: [] }));
    }
    // BMKG returns success:true but coordinate is out of bounds (lat: 999)
    return new Response(JSON.stringify({
      success: true,
      data: [
        {
          datetime: '2026-10-03T02:00:00Z',
          lat: 999.0, // INVALID
          lng: 115.2,
          magnitude: 5.4,
          depthKm: 15,
        }
      ]
    }));
  };

  const snap = await eqService.fetchEarthquakeSnapshot({ feed: '2.5_day', force: true });
  
  // BMKG attempt must be FAILED, not SUCCESS
  const bmkgAttempt = snap.sourceAttempts.find(a => a.source === 'BMKG');
  assert.ok(bmkgAttempt, 'BMKG attempt must be recorded');
  assert.equal(bmkgAttempt.status, 'FAILED', 'BMKG with invalid coordinates must fail');
  assert.ok(/valid|koordinat/i.test(bmkgAttempt.error || ''), 'Error message must reflect validation rejection');

  // Overall status must be PARTIAL because USGS succeeded empty but BMKG failed
  assert.equal(snap.status, 'PARTIAL', 'Overall status must be PARTIAL when one source fails');
  assert.equal(snap.counts.totalReceived, 1, '1 upstream raw record received in snapshot counts');
  assert.equal(bmkgAttempt.receivedCount, 1, 'BMKG receivedCount must be 1');
  assert.equal(bmkgAttempt.validCount, 0, 'BMKG validCount must be 0');
  assert.equal(snap.counts.validRecords, 0, '0 valid records accepted overall');
  assert.equal(snap.records.length, 0, 'No records presented to renderer');
});

// ============================================================================
// REPRODUCTION 2: P0-02 STALE Snapshot Retains Original fetchedAt and snapshotId
// ============================================================================
await test('R2: STALE earthquake snapshot retains original fetchedAt, lastSuccessfulFetchAt, and dataSnapshotId on failed refresh', async () => {
  const validUsgs = {
    type: 'FeatureCollection',
    features: [{
      id: 'usgs_stale_1',
      geometry: { type: 'Point', coordinates: [100.0, -1.0, 20.0] },
      properties: { mag: 5.5, time: 1700000000000, place: 'Mentawai' }
    }]
  };

  // Step 1: Successful fetch
  globalThis.fetch = async (url) => {
    if (String(url).includes('usgs.gov')) {
      return new Response(JSON.stringify(validUsgs));
    }
    return new Response(JSON.stringify({ success: true, data: [] }));
  };

  const snap1 = await eqService.fetchEarthquakeSnapshot({ feed: '2.5_day', force: true });
  assert.equal(snap1.status, 'LIVE');
  assert.equal(snap1.records.length, 1);
  const originalFetchedAt = snap1.fetchedAt;
  const originalSnapshotId = snap1.dataSnapshotId;
  assert.ok(originalFetchedAt > 0);
  assert.ok(originalSnapshotId);

  // Small delay so timestamp would differ if re-generated
  await new Promise(r => setTimeout(r, 20));

  // Step 2: Failed refresh (network 500 error on both sources)
  globalThis.fetch = async () => {
    return new Response('Internal Server Error', { status: 500 });
  };

  const snap2 = await eqService.fetchEarthquakeSnapshot({ feed: '2.5_day', force: true });
  assert.equal(snap2.status, 'STALE', 'Status must be STALE');
  assert.equal(snap2.records.length, 1, 'Records must be preserved from previous snapshot');
  assert.equal(snap2.fetchedAt, originalFetchedAt, 'fetchedAt must NOT be overwritten with Date.now() on failure');
  assert.equal(snap2.lastSuccessfulFetchAt, originalFetchedAt, 'lastSuccessfulFetchAt must match original successful fetch');
  assert.equal(snap2.dataSnapshotId, originalSnapshotId, 'dataSnapshotId must point to original data snapshot');
  assert.ok(snap2.lastAttemptAt > originalFetchedAt, 'lastAttemptAt must reflect the time of the failed refresh attempt');
});

// ============================================================================
// REPRODUCTION 3: P0-03 Hotspot Visibility Resume & Preserved Options
// ============================================================================
await test('R3: FIRMS multi-underscore product (VIIRS_SNPP_NRT) and dayRange 7 retain exact query key', async () => {
  let requestedSource = null;
  let requestedDayRange = null;

  globalThis.fetch = async (url) => {
    const u = new URL(String(url), 'http://localhost');
    requestedSource = u.searchParams.get('source');
    requestedDayRange = u.searchParams.get('dayRange');
    return new Response(JSON.stringify({
      success: true,
      data: [],
      sourceAttempts: [{ product: 'VIIRS_SNPP_NRT', status: 'SUCCESS', receivedCount: 0 }],
      receivedCount: 0,
      rejectedCount: 0,
      acceptedCount: 0,
    }));
  };

  const options = {
    bbox: [100, -2, 101, -1],
    source: 'VIIRS_SNPP_NRT',
    dayRange: 7,
    force: true,
  };

  const snap = await fireService.fetchHotspotSnapshot(options);
  assert.equal(requestedSource, 'VIIRS_SNPP_NRT', 'Requested source must remain VIIRS_SNPP_NRT');
  assert.equal(requestedDayRange, '7', 'Requested dayRange must remain 7');
  assert.equal(snap.source, 'VIIRS_SNPP_NRT', 'Snapshot source must be VIIRS_SNPP_NRT');
  assert.equal(snap.dayRange, 7, 'Snapshot dayRange must be 7');

  // Also test earthquake snapshot options retention
  let receivedBmkgQuery = false;
  globalThis.fetch = async (url) => {
    if (String(url).includes('bmkg')) receivedBmkgQuery = true;
    return new Response(JSON.stringify({ type: 'FeatureCollection', features: [] }));
  };

  const eqSnap = await eqService.fetchEarthquakeSnapshot({ feed: '2.5_day', includeBmkg: false, force: true });
  assert.equal(receivedBmkgQuery, false, 'includeBmkg: false must be respected and not queried');
  assert.equal(eqSnap.sourceAttempts.some(a => a.source === 'BMKG'), false, 'BMKG attempt must not be recorded when disabled');
});

// ============================================================================
// REPRODUCTION 4: P0-04 EMPTY Cached Snapshot Status Remains AVAILABLE / EMPTY
// ============================================================================
await test('R4: EMPTY cached hotspot snapshot returns AVAILABLE retrieval status, never FAILED or LIVE', async () => {
  globalThis.fetch = async () => {
    return new Response(JSON.stringify({
      success: true,
      data: [],
      sourceAttempts: [{ product: 'MODIS_NRT', status: 'SUCCESS', receivedCount: 0 }],
      receivedCount: 0,
      rejectedCount: 0,
      acceptedCount: 0,
    }));
  };

  const options = { bbox: [110, -8, 111, -7], source: 'MODIS_NRT', dayRange: 1, force: true };
  const snap1 = await fireService.fetchHotspotSnapshot(options);
  assert.equal(snap1.status, 'EMPTY');

  const statusFirst = fireService.getRetrievalStatus().status;
  assert.equal(statusFirst, 'AVAILABLE', 'First retrieval of EMPTY must report AVAILABLE');

  // Second retrieval from cache
  const snap2 = await fireService.fetchHotspotSnapshot({ ...options, force: false });
  assert.equal(snap2.status, 'EMPTY');
  const statusCached = fireService.getRetrievalStatus().status;
  assert.equal(statusCached, 'AVAILABLE', 'Cached retrieval of EMPTY must NOT switch to FAILED');
});

// ============================================================================
// REPRODUCTION 5: P1-06 Immediate AbortSignal Pre-Check & Chaining
// ============================================================================
await test('R5: Pre-aborted AbortSignal halts immediately without initiating fetch', async () => {
  let fetchInitiated = false;
  globalThis.fetch = async () => {
    fetchInitiated = true;
    return new Response('{}');
  };

  const ac = new AbortController();
  ac.abort(); // already aborted

  // 1. fetchCheckedJson pre-check
  const res = await fetchCheckedJson('test_abort', 'https://api.example.com/test', (d) => null, { signal: ac.signal });
  assert.equal(fetchInitiated, false, 'Pre-aborted call must never initiate network fetch');
  assert.equal(res.data, null);
  assert.ok(res.attempt.error?.includes('dibatalkan'));

  // 2. earthquakeSnapshotService pre-check
  await assert.rejects(async () => {
    await eqService.fetchEarthquakeSnapshot({ signal: ac.signal });
  }, /dibatalkan|AbortError/i);
});

// ============================================================================
// REPRODUCTION 6: P0-08 ISPU Rolling Average Restricts Strictly to Past Window
// ============================================================================
await test('R6: ISPU rolling average strictly bounds to targetHours up to anchor time, excluding future hours', () => {
  const baseTime = 1700000000000;
  const hourMs = 3600000;
  const series = [];

  // 24 past hours (index 0 to 23): value = 10 µg/m³
  for (let i = 23; i >= 0; i--) {
    series.push({
      time: new Date(baseTime - i * hourMs).toISOString(),
      value: 10,
    });
  }

  // 24 future hours (index 24 to 47): value = 100 µg/m³
  for (let i = 1; i <= 24; i++) {
    series.push({
      time: new Date(baseTime + i * hourMs).toISOString(),
      value: 100,
    });
  }

  assert.equal(series.length, 48, '48 total hours in dataset');

  // Anchor is exactly at baseTime (end of past 24 hours)
  const result = ispuService.calculateRollingAverageFromSeries(series, 24, { anchorTime: baseTime });

  assert.ok(result, 'Result must be returned');
  assert.equal(result.validSamples, 24, 'Only 24 past hours must be used');
  assert.equal(result.average, 10, 'Rolling average must be exactly 10, completely excluding future 100s');
  assert.equal(result.coveragePct, 1.0, 'Coverage ratio must be 1.0 (100%)');
});

// ============================================================================
// REPRODUCTION 7: P0-10 OSRM Route Without Weather Returns "Belum Dinilai"
// ============================================================================
await test('R7: Route missing weather reports safety "Belum Dinilai" and geodesic fallback has null duration', async () => {
  // Mock OSRM to fail (trigger geodesic fallback)
  globalThis.fetch = async () => {
    return new Response('Network timeout', { status: 504 });
  };

  const route = await routingService.calculateRoute(
    { lat: -6.2, lng: 106.8 },
    { lat: -6.3, lng: 106.9 },
    'foot-walking',
    null // no weather
  );

  assert.equal(route.safetyLevel, 'Belum Dinilai', 'Safety level must be "Belum Dinilai" without weather data');
  assert.equal(route.durationMin, null, 'Geodesic fallback must not fabricate road duration');
  assert.equal(route.routeMode, 'GEODESIC_REFERENCE');
  assert.ok(route.durationText?.includes('Garis Geodesi Referensi'));
});

// ============================================================================
// REPRODUCTION 8: P1-I 15-Minute City Service Gaps & Missing Category
// ============================================================================
await test('R8: Facility accessibility separates INSUFFICIENT_DATA from genuinely unserved categories', async () => {
  // Case A: Missing inventory ('transportasi' not provided) -> INSUFFICIENT_DATA, NOT in unservedCategories, compliance null/NOT_EVALUABLE
  const reqA = {
    body: {
      originPoint: [106.828, -6.178],
      originName: 'Menteng Test',
      profile: 'foot-walking',
      facilities: [
        { id: 'f1', name: 'SDN 01', category: 'sekolah', lat: -6.180, lng: 106.830 },
      ],
    },
  };

  let resDataA = null;
  const resA = {
    status(c) { return this; },
    json(d) { resDataA = d; return this; }
  };

  await getFacilityAccessibility(reqA, resA);
  assert.ok(resDataA.success);

  const trans = resDataA.categoryReachability.find(c => c.category === 'transportasi');
  assert.ok(trans, 'Transportasi category must exist in reachability list');
  assert.equal(trans.evaluationStatus, 'INSUFFICIENT_DATA', 'Missing category must report INSUFFICIENT_DATA');
  assert.equal(trans.hasAccess15Min, null, 'hasAccess15Min must be null when data is missing');
  assert.ok(resDataA.insufficientDataCategories.includes('transportasi'), 'transportasi must be in insufficientDataCategories');
  assert.equal(resDataA.unservedCategories.includes('transportasi'), false, 'Missing data must NOT be marked as unserved');
  assert.equal(resDataA.is15MinCityCompliant, null, 'Compliance must be null when data is incomplete');
  assert.equal(resDataA.complianceStatus, 'NOT_EVALUABLE', 'Status must be NOT_EVALUABLE when data is incomplete');

  // Case B: Evaluated but distant facility (> 15 min walking) -> genuinely unserved, NOT insufficient
  const reqB = {
    body: {
      originPoint: [106.828, -6.178],
      originName: 'Menteng Test',
      profile: 'foot-walking',
      facilities: [
        { id: 'f1', name: 'SDN 01', category: 'sekolah', lat: -6.180, lng: 106.830 }, // close (~300m)
        { id: 'f2', name: 'RSUD Jauh', category: 'kesehatan', lat: -6.350, lng: 106.830 }, // far (> 15km)
        { id: 'f3', name: 'Pasar Jauh', category: 'pasar', lat: -6.350, lng: 106.830 },
        { id: 'f4', name: 'TES Jauh', category: 'evakuasi', lat: -6.350, lng: 106.830 },
        { id: 'f5', name: 'Stasiun Jauh', category: 'transportasi', lat: -6.350, lng: 106.830 },
      ],
    },
  };

  let resDataB = null;
  const resB = {
    status(c) { return this; },
    json(d) { resDataB = d; return this; }
  };

  await getFacilityAccessibility(reqB, resB);
  assert.ok(resDataB.success);
  assert.equal(resDataB.insufficientDataCategories.length, 0, 'No categories have insufficient data');
  assert.ok(resDataB.unservedCategories.includes('kesehatan'), 'Distant kesehatan must be in unservedCategories');
  assert.equal(resDataB.is15MinCityCompliant, false, 'Non-compliant when evaluated categories fail 15-min reachability');
  assert.equal(resDataB.complianceStatus, 'NON_COMPLIANT');
});

// ============================================================================
// REPRODUCTION 9: P1-11 Transport Emission Frequency 0 Must Not Default to 5
// ============================================================================
await test('R9: Transport emission frequency 0 produces 0 weekly emissions without defaulting to 5', () => {
  const calculation = emissionService.calculateTripEmission({
    distanceKm: 10,
    vehicleMode: 'car_petrol_medium',
    fuelType: 'petrol',
    passengerCount: 1,
    frequencyPerWeek: 0, // Explicitly 0
  });

  assert.equal(calculation.weeklyEmissionKgCO2e, 0, 'Weekly emissions for 0 trips/week must be 0, not 5x');
  assert.ok(calculation.tripEmissionKgCO2e > 0, 'Single trip emissions is non-zero');
});

// ============================================================================
// REPRODUCTION 10: P1-11 Terrain Coordinates Near Poles Clamped to Valid Bounds
// ============================================================================
await test('R10: Terrain service near polar boundary safely evaluates with static DEM provenance and rejects out-of-bounds', async () => {
  globalThis.fetch = async (url) => {
    const u = new URL(String(url));
    const lats = u.searchParams.get('latitude').split(',').map(Number);
    for (const lat of lats) {
      assert.ok(lat >= -89.99 && lat <= 89.99, `Latitude ${lat} must be within polar bounds`);
    }
    return new Response(JSON.stringify({ elevation: [100, 102, 101, 105, 103, 104, 106, 107, 105] }));
  };

  const result = await terrainService.getTerrainIntelligence(89.89, 10.0);
  assert.equal(result.status, 'AVAILABLE');
  assert.equal(result.provenance.dataset, 'Copernicus DEM 2021 (GLO-90)');
  assert.equal(result.provenance.dataStatus, 'STATIC');
  assert.ok(/heuristik/i.test(result.provenance.attribution));

  // Out of bounds coordinates strictly throw
  await assert.rejects(async () => {
    await terrainService.getTerrainIntelligence(91.0, 10.0);
  }, /di luar batas/i);
});

// Reset fetch
globalThis.fetch = originalFetch;

console.log('\n================================================================');
for (const r of results) {
  if (r.passed) {
    console.log(`[PASS] ${r.name}`);
  } else {
    console.log(`[FAIL] ${r.name}`);
    console.log(`       Error: ${r.error}`);
  }
}
console.log('================================================================');
const passCount = results.filter(r => r.passed).length;
const failCount = results.filter(r => !r.passed).length;
console.log(`REPRODUCTION SUITE RESULTS: ${passCount} passed, ${failCount} failed`);
console.log('================================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
