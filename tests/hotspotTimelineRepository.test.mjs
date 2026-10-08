import test from 'node:test';
import assert from 'node:assert/strict';
import {
  saveHotspotSnapshot,
  getLatestHotspotSnapshot,
  getHotspotSnapshotById,
  listTimelineSnapshots,
  getTimelineSummary,
} from '../apps/server/src/repositories/hotspotRepository.js';
import {
  getPublicHotspotsFeed,
  getHotspotsTimeline,
  getHotspotsSnapshotByIdEndpoint,
  saveHotspotSnapshotEndpoint,
} from '../apps/server/src/controllers/spatialController.js';

function createMockReqRes({ query = {}, params = {}, body = {} } = {}) {
  let statusCode = 200;
  let responseData = null;
  const req = { query, params, body };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
  };
  return {
    req,
    res,
    getStatusCode: () => statusCode,
    getData: () => responseData,
  };
}

test('Hotspot Repository: Baseline historical snapshots are seeded across multiple years', async () => {
  const summary = await getTimelineSummary();
  assert.ok(summary.totalSnapshots >= 8, 'Must have at least 8 baseline snapshots');
  assert.ok(summary.years.includes(2026), 'Must include year 2026');
  assert.ok(summary.years.includes(2025), 'Must include year 2025');
  assert.ok(summary.years.includes(2024), 'Must include year 2024');
  assert.ok(summary.totalHotspots > 500, 'Baseline snapshots must contain real hotspots');
});

test('Hotspot Repository: listTimelineSnapshots filters by year and scope', async () => {
  const allSnapshots = await listTimelineSnapshots();
  assert.ok(allSnapshots.snapshots.length > 0);
  assert.ok(allSnapshots.availableYears.length >= 3);

  const snaps2025 = await listTimelineSnapshots({ year: 2025 });
  assert.ok(snaps2025.snapshots.length > 0);
  assert.ok(snaps2025.snapshots.every(s => s.year === 2025), 'All returned snapshots must be from 2025');

  const snapsJava = await listTimelineSnapshots({ scope: 'java' });
  assert.ok(snapsJava.snapshots.length > 0);
  assert.ok(snapsJava.snapshots.every(s => s.scope === 'java'), 'All returned snapshots must have java scope');
});

test('Hotspot Repository: getSnapshotById returns full CSV and valid attributes', async () => {
  const timeline = await listTimelineSnapshots();
  const firstId = timeline.snapshots[0].id;

  const snapshot = await getHotspotSnapshotById(firstId);
  assert.ok(snapshot !== null);
  assert.equal(snapshot.id, firstId);
  assert.ok(typeof snapshot.rawCsv === 'string');
  assert.ok(snapshot.rawCsv.includes('latitude,longitude'));
  assert.ok(snapshot.summary.total > 0);
  assert.ok(Number.isFinite(snapshot.summary.highConfidence));
});

test('Hotspot Repository: saveHotspotSnapshot persists new snapshot with auto-computed metrics', async () => {
  const sampleCsv = `latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,frp,daynight
-3.1234,104.5678,330.5,0.375,0.375,2026-10-08,0230,NOAA-20,VIIRS,high,45.2,D
-2.9876,113.4321,315.0,1.0,1.0,2026-10-08,0315,Aqua,MODIS,nominal,22.0,D`;

  const saved = await saveHotspotSnapshot({
    scope: 'indonesia',
    rawCsv: sampleCsv,
    snapshotDate: '2026-10-08',
    notes: 'Uji Coba Snapshot Otomatis',
  });

  assert.ok(saved.id);
  assert.equal(saved.recordCount, 2);
  assert.equal(saved.summary.highConfidence, 1);
  assert.equal(saved.summary.nominalConfidence, 1);
  assert.equal(saved.summary.sensorBreakdown.VIIRS, 1);
  assert.equal(saved.summary.sensorBreakdown.MODIS, 1);

  const retrieved = await getHotspotSnapshotById(saved.id);
  assert.equal(retrieved.id, saved.id);
  assert.equal(retrieved.recordCount, 2);
});

test('Hotspot Endpoints: getHotspotsTimeline returns formatted timeline', async () => {
  const { req, res, getStatusCode, getData } = createMockReqRes({
    query: { year: '2026' },
  });

  await getHotspotsTimeline(req, res);
  assert.equal(getStatusCode(), 200);
  const body = getData();
  assert.equal(body.success, true);
  assert.ok(Array.isArray(body.snapshots));
  assert.ok(body.snapshots.length > 0);
  assert.ok(body.snapshots.every(s => s.year === 2026));
});

test('Hotspot Endpoints: getHotspotsSnapshotByIdEndpoint handles valid and missing IDs', async () => {
  const timeline = await listTimelineSnapshots();
  const validId = timeline.snapshots[0].id;

  const validCall = createMockReqRes({ params: { id: validId } });
  await getHotspotsSnapshotByIdEndpoint(validCall.req, validCall.res);
  assert.equal(validCall.getStatusCode(), 200);
  assert.equal(validCall.getData().success, true);
  assert.equal(validCall.getData().snapshot.id, validId);

  const invalidCall = createMockReqRes({ params: { id: 'non-existent-snapshot-id-xyz' } });
  await getHotspotsSnapshotByIdEndpoint(invalidCall.req, invalidCall.res);
  assert.equal(invalidCall.getStatusCode(), 404);
  assert.equal(invalidCall.getData().success, false);
});

test('Hotspot Fallback: getPublicHotspotsFeed returns stored snapshot fallback with date/time when live feeds fail', async () => {
  const originalFetch = globalThis.fetch;
  try {
    // Simulate NASA server downtime / failure
    globalThis.fetch = async () => {
      throw new Error('Connection reset by NASA EOSDIS upstream');
    };

    const { req, res, getStatusCode, getData } = createMockReqRes({
      query: { scope: 'indonesia', dayRange: '1', fresh: 'true' },
    });

    await getPublicHotspotsFeed(req, res);

    assert.equal(getStatusCode(), 200);
    const body = getData();
    assert.equal(body.success, true);
    assert.equal(body.isFallback, true);
    assert.equal(body.provenance.dataStatus, 'CACHED');
    assert.ok(body.snapshotDate, 'Must include snapshotDate');
    assert.ok(body.snapshotFetchedAt, 'Must include snapshotFetchedAt timestamp');
    assert.ok(body.rawCsv && body.rawCsv.includes('latitude,longitude'));
    assert.ok(body.count > 0, 'Fallback snapshot must provide cached hotspots');
    assert.ok(body.reason?.message.includes('arsip tersimpan'), 'Must have descriptive fallback message');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
