import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { cctvService } from '../apps/server/src/services/cctvService.js';
import { trafficSignalsService } from '../apps/server/src/services/trafficSignalsService.js';
import { getLiveTrafficNetwork } from '../apps/server/src/controllers/spatialController.js';

test('All returned CCTV cameras have valid Indonesia coordinates and trafficOnly excludes courtrooms', () => {
  const allResult = cctvService.getCameras({ limit: 10000 });
  assert.ok(allResult.total >= 5000, `Expected >= 5000 cameras, got ${allResult.total}`);
  assert.ok(allResult.data.length >= 5000, `Expected >= 5000 returned cameras, got ${allResult.data.length}`);

  for (const cam of allResult.data) {
    assert.ok(Number.isFinite(cam.lat) && Number.isFinite(cam.lng), `Invalid numeric coords on ${cam.id}`);
    assert.ok(!(cam.lat === 0 && cam.lng === 0), `Zero coords leaked on ${cam.id}`);
    assert.ok(cam.lat >= -12 && cam.lat <= 10, `Lat out of Indonesia bounds on ${cam.id}: ${cam.lat}`);
    assert.ok(cam.lng >= 94 && cam.lng <= 142, `Lng out of Indonesia bounds on ${cam.id}: ${cam.lng}`);
  }

  const trafficResult = cctvService.getCameras({ limit: 10000, trafficOnly: true });
  assert.ok(trafficResult.data.length >= 5000, `Expected >= 5000 traffic CCTVs, got ${trafficResult.data.length}`);
  const leakedCourt = trafficResult.data.find(
    (c) => c.category === 'pengadilan' || c.category === 'pengadilannegeri'
  );
  assert.equal(leakedCourt, undefined, 'trafficOnly must exclude indoor courtroom cameras');

  const compactCctv = cctvService.getCameras({ limit: 7000, trafficOnly: true, compact: true });
  const compactCctvMb = Buffer.byteLength(JSON.stringify(compactCctv), 'utf8') / (1024 * 1024);
  assert.ok(compactCctvMb < 2.2, `Expected compact CCTV payload < 2.2 MB for Vercel limit, got ${compactCctvMb.toFixed(2)} MB`);
});

test('Nationwide traffic signals merge curated Dishub ATCS and verified Indonesian OSM APILL', () => {
  const signals = trafficSignalsService.getSignals(Date.now(), { compact: true });
  const compactSignalsMb = Buffer.byteLength(JSON.stringify({ success: true, data: signals }), 'utf8') / (1024 * 1024);
  assert.ok(compactSignalsMb < 1.5, `Expected compact Signals payload < 1.5 MB for Vercel limit, got ${compactSignalsMb.toFixed(2)} MB`);
  assert.ok(signals.length >= 2000, `Expected >= 2000 nationwide signals, got ${signals.length}`);

  const prov = trafficSignalsService.getProvenance();
  assert.ok(prov.curatedAtcsCount >= 30, `Expected >= 30 curated ATCS signals, got ${prov.curatedAtcsCount}`);
  assert.ok(prov.osmVerifiedCount >= 1900, `Expected >= 1900 verified OSM signals, got ${prov.osmVerifiedCount}`);

  // Ensure major cities + East Java corridor are represented
  const citiesLower = signals.map((s) => String(s.city || '').toLowerCase());
  for (const needle of ['jakarta', 'bandung', 'semarang', 'surabaya', 'mojokerto', 'malang', 'medan', 'denpasar', 'makassar', 'balikpapan']) {
    assert.ok(
      citiesLower.some((c) => c.includes(needle)),
      `Missing expected city traffic signals for ${needle}`
    );
  }

  // Verify no Singapore traffic lights leaked into Indonesian catalog
  const singaporeLeak = signals.filter(
    (s) => s.lat >= 1.18 && s.lat <= 1.49 && s.lng >= 103.55 && s.lng <= 104.15
  );
  assert.equal(singaporeLeak.length, 0, `Singapore signals leaked: ${singaporeLeak.length}`);
});

test('Optimized traffic-corridors.json preserves all 112 corridors under 3.8 MB', () => {
  const corridorsPath = path.resolve(process.cwd(), 'apps/web/public/data/traffic-corridors.json');
  const sizeMb = fs.statSync(corridorsPath).size / (1024 * 1024);
  assert.ok(sizeMb < 3.8, `Expected optimized traffic-corridors.json < 3.8 MB, got ${sizeMb.toFixed(2)} MB`);

  const list = JSON.parse(fs.readFileSync(corridorsPath, 'utf8'));
  assert.equal(list.length, 112, `Expected 112 corridors, got ${list.length}`);
  for (const c of list) {
    assert.ok(Array.isArray(c.segments) && c.segments.length >= 1, `Corridor ${c.id} missing segments`);
    assert.ok(Array.isArray(c.center) && c.center.length === 2, `Corridor ${c.id} missing center`);
  }
});

test('Live traffic network summary reports 112 corridors and valid camera/signal counts cleanly', async () => {
  let payload = null;
  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      payload = data;
      return this;
    },
  };
  await getLiveTrafficNetwork({}, res);
  assert.equal(res.statusCode, 200);
  assert.equal(payload.success, true);
  assert.equal(payload.data.monitoredCorridors, 112);
  assert.ok(payload.data.onlineCctvCount >= 5000);
  assert.ok(payload.data.onlineSignalsCount >= 2000);
  assert.notEqual(payload.data.dataStatus, 'ERROR');
});
