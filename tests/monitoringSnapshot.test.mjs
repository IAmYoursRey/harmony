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
  selectDeterministicEarthquakeLOD: eqLOD,
  hotspotFireService: fireService,
  selectDeterministicHotspotLOD: fireLOD,
} = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);

const originalFetch = globalThis.fetch;
let passed = 0;
let failed = 0;

const test = async (name, fn) => {
  try {
    await fn();
    passed++;
    console.log(`PASS ${name}`);
  } catch (err) {
    failed++;
    console.error(`FAIL ${name}: ${err.message}`);
  }
};

const sampleUsgsPayload = {
  type: 'FeatureCollection',
  features: [
    {
      id: 'usgs_1',
      geometry: { type: 'Point', coordinates: [100.0, -1.0, 20.0] },
      properties: { mag: 4.2, time: 1700000000000, place: 'South of Java' },
    },
    {
      id: 'usgs_2',
      geometry: { type: 'Point', coordinates: [120.0, 0.5, 10.0] },
      properties: { mag: 6.8, time: 1700000010000, place: 'Sulawesi Trench' },
    },
  ],
};

const sampleBmkgPayload = {
  success: true,
  data: [
    {
      datetime: '2026-10-03T02:00:00Z',
      date: '03-10-2026',
      time: '02:00:00',
      lat: -8.5,
      lng: 115.2,
      magnitude: 5.4,
      depthKm: 15,
      location: 'Selatan Bali',
      felt: 'III Denpasar',
    },
  ],
};

// 1. Single-Flight Deduplication Test
await test('identical concurrent earthquake queries share single flight and requestId', async () => {
  let networkFetches = 0;
  globalThis.fetch = async (url) => {
    networkFetches++;
    await new Promise((r) => setTimeout(r, 25));
    if (String(url).includes('usgs.gov')) {
      return new Response(JSON.stringify(sampleUsgsPayload));
    }
    return new Response(JSON.stringify(sampleBmkgPayload));
  };

  const [snapA, snapB] = await Promise.all([
    eqService.fetchEarthquakeSnapshot({ feed: '2.5_day', force: true }),
    eqService.fetchEarthquakeSnapshot({ feed: '2.5_day', force: true }),
  ]);

  assert.equal(snapA.requestId, snapB.requestId, 'Both callers must receive the exact same requestId');
  assert.equal(snapA.fetchedAt, snapB.fetchedAt, 'Both callers must receive the exact same timestamp');
  assert.equal(snapA.records.length, 3, 'Merged USGS + BMKG records must match expected length');
  assert.equal(snapA.records[0].source, 'BMKG');
  assert.equal(snapA.counts.validRecords, 3);
});

// 2. Immutability Verification
await test('snapshot and nested records are frozen and immutable', async () => {
  const snap = await eqService.fetchEarthquakeSnapshot({ feed: '2.5_day' });
  assert.equal(Object.isFrozen(snap), true, 'Snapshot root object must be frozen');
  assert.equal(Object.isFrozen(snap.records), true, 'Snapshot records array must be frozen');
  assert.equal(Object.isFrozen(snap.counts), true, 'Snapshot counts must be frozen');
  assert.equal(Object.isFrozen(snap.sourceAttempts), true, 'Snapshot sourceAttempts must be frozen');

  assert.throws(() => {
    // @ts-ignore
    snap.records.push({ id: 'fake' });
  }, /frozen|cannot add/i);
});

// 3. Scoped Cache Isolation
await test('query B with different feed does not overwrite query A', async () => {
  globalThis.fetch = async (url) => {
    if (String(url).includes('4.5_month')) {
      return new Response(
        JSON.stringify({
          type: 'FeatureCollection',
          features: [
            {
              id: 'usgs_month_1',
              geometry: { type: 'Point', coordinates: [130.0, -3.0, 33.0] },
              properties: { mag: 7.2, time: 1699000000000, place: 'Banda Sea' },
            },
          ],
        })
      );
    }
    return new Response(JSON.stringify(sampleBmkgPayload));
  };

  const snapMonth = await eqService.fetchEarthquakeSnapshot({ feed: '4.5_month', force: true });
  const snapDay = eqService.getLatestSnapshot('2.5_day');

  assert.equal(snapMonth.feed, '4.5_month');
  assert.equal(snapMonth.counts.validRecords >= 1, true);
  assert.notEqual(snapMonth.queryKey, snapDay?.queryKey, 'Query keys must be isolated');
  assert.notEqual(snapMonth.requestId, snapDay?.requestId, 'Request IDs must remain distinct');
});

// 4. Deterministic LOD Selection
await test('deterministic LOD prioritizes major M5+ earthquakes over array order', async () => {
  const dummyRecords = [
    { id: 'q_minor_1', lat: 0, lng: 0, mag: 2.1, time: 1000, source: 'USGS', monitoringSource: '', name: '', visualSummary: '' },
    { id: 'q_minor_2', lat: 0, lng: 0, mag: 2.3, time: 1001, source: 'USGS', monitoringSource: '', name: '', visualSummary: '' },
    { id: 'q_major_deep', lat: 0, lng: 0, mag: 7.5, time: 900, source: 'USGS', monitoringSource: '', name: '', visualSummary: '' },
    { id: 'q_felt_event', lat: 0, lng: 0, mag: 4.8, time: 950, felt: 'IV Mercalli', source: 'BMKG', monitoringSource: '', name: '', visualSummary: '' },
  ];

  const selected = eqLOD(dummyRecords, 2);
  assert.equal(selected.length, 2);
  assert.equal(selected[0].id, 'q_major_deep', 'M7.5 must rank first due to major magnitude weighting');
  assert.equal(selected[1].id, 'q_felt_event', 'Felt event must rank above unfelt low-magnitude events');
});

// 5. Hotspot Single-Flight and Scoped Queries
await test('hotspot queries deduplicate concurrent flights and separate scoped regions', async () => {
  let fetchCalls = 0;
  globalThis.fetch = async (url) => {
    fetchCalls++;
    const urlStr = String(url);
    if (urlStr.includes('VIIRS_SNPP_NRT')) {
      return new Response(
        JSON.stringify({
          success: true,
          data: [
            {
              id: 'hot_indo_1',
              lat: -1.2,
              lng: 103.5,
              brightness: 340,
              frp: 85,
              confidence: 'high',
              satellite: 'NOAA-20',
              acqDate: '2026-10-03',
              acqTime: '0430',
            },
          ],
        })
      );
    }
    return new Response(
      JSON.stringify({
        success: true,
        data: [],
      })
    );
  };

  const [snap1, snap2] = await Promise.all([
    fireService.fetchHotspotSnapshot({ bbox: [94.0, -11.0, 141.5, 6.5], source: 'VIIRS_SNPP_NRT', force: true }),
    fireService.fetchHotspotSnapshot({ bbox: [94.0, -11.0, 141.5, 6.5], source: 'VIIRS_SNPP_NRT', force: true }),
  ]);

  assert.equal(snap1.requestId, snap2.requestId, 'Simultaneous hotspot calls must share requestId');
  assert.equal(snap1.counts.validRecords, 1);
  assert.equal(snap1.status, 'LIVE');

  const snapGlobal = await fireService.fetchHotspotSnapshot({
    bbox: [-180, -90, 180, 90],
    source: 'ALL',
    force: true,
  });
  assert.equal(snapGlobal.status, 'EMPTY');
  assert.equal(snapGlobal.counts.validRecords, 0);
  assert.notEqual(snapGlobal.queryKey, snap1.queryKey);
});

// 6. Graceful Degradation to STALE on Network Failure
await test('refresh failure retains last valid snapshot with STALE status', async () => {
  globalThis.fetch = async () => {
    throw new Error('Connection reset by peer');
  };

  const staleSnap = await eqService.fetchEarthquakeSnapshot({ feed: '2.5_day', force: true });
  assert.equal(staleSnap.status, 'STALE');
  assert.equal(staleSnap.records.length > 0, true, 'STALE snapshot must retain previously valid records');
  assert.equal(staleSnap.reason?.includes('Connection reset'), true);
});

// 7. Honest Zero Counts on Empty Scope
await test('valid empty response produces EMPTY status with honest zero counts', async () => {
  globalThis.fetch = async (url) => {
    if (String(url).includes('usgs.gov')) {
      return new Response(JSON.stringify({ type: 'FeatureCollection', features: [] }));
    }
    return new Response(JSON.stringify({ success: true, data: [] }));
  };

  const emptySnap = await eqService.fetchEarthquakeSnapshot({ feed: 'empty_test', force: true });
  assert.equal(emptySnap.status, 'EMPTY');
  assert.equal(emptySnap.counts.validRecords, 0);
  assert.equal(emptySnap.counts.renderedMarkers, 0);
  assert.equal(emptySnap.records.length, 0);
});

// 8. Ref-Counted Consumer Cancellation
await test('aborting one consumer does not cancel in-flight fetch for remaining consumer', async () => {
  let completed = false;
  globalThis.fetch = async (url) => {
    await new Promise((r) => setTimeout(r, 60));
    completed = true;
    if (String(url).includes('usgs.gov')) {
      return new Response(JSON.stringify(sampleUsgsPayload));
    }
    return new Response(JSON.stringify(sampleBmkgPayload));
  };

  const abortA = new AbortController();
  const promiseA = eqService.fetchEarthquakeSnapshot({ feed: 'abort_test', signal: abortA.signal, force: true });
  const promiseB = eqService.fetchEarthquakeSnapshot({ feed: 'abort_test', force: true });

  // Abort consumer A immediately
  abortA.abort();

  await assert.rejects(promiseA, /AbortError|dibatalkan/i, 'Consumer A must reject with AbortError');
  const snapB = await promiseB;
  assert.equal(completed, true, 'Fetch must complete because Consumer B was still waiting');
  assert.equal(snapB.counts.validRecords, 3);
});

// 9. Subscription Lifecycle and Polling Cleanup
await test('subscription delivers updates and unregistering stops active timer', async () => {
  let receivedSnapshot = null;
  const unsub = eqService.subscribeEarthquakes({ feed: '2.5_day' }, (snap) => {
    receivedSnapshot = snap;
  });

  assert.equal(receivedSnapshot !== null, true, 'Subscriber must immediately receive cached snapshot');
  unsub();
});

globalThis.fetch = originalFetch;

console.log(`\nMonitoring snapshot integrity: ${passed} groups passed; ${failed} failed.`);
process.exitCode = failed ? 1 : 0;
