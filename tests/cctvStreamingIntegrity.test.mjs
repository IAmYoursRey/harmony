import test from 'node:test';
import assert from 'node:assert/strict';
import { cctvService } from '../apps/server/src/services/cctvService.js';

test('CCTV Nusantara Integration - Catalog count and geographic coordinates', () => {
  const all = cctvService.getCameras({ limit: 6000 });
  assert.ok(all.total >= 5000, `Expected at least 5000 cameras, got ${all.total}`);

  // Validate cameras have valid coordinates
  const sample = all.data.slice(0, 50);
  sample.forEach((cam) => {
    assert.ok(typeof cam.lat === 'number' && !isNaN(cam.lat), `Camera ${cam.id} has invalid lat`);
    assert.ok(typeof cam.lng === 'number' && !isNaN(cam.lng), `Camera ${cam.id} has invalid lng`);
    assert.ok(cam.lat >= -12 && cam.lat <= 10, `Camera ${cam.id} lat out of Indonesia range`);
    assert.ok(cam.lng >= 94 && cam.lng <= 142, `Camera ${cam.id} lng out of Indonesia range`);
    assert.ok(cam.streamType, `Camera ${cam.id} missing streamType`);
    assert.ok(cam.authority, `Camera ${cam.id} missing authority`);
  });
});

test('CCTV Nusantara Integration - Filtering by city and category', () => {
  const bandung = cctvService.getCameras({ city: 'Kota Bandung' });
  assert.ok(bandung.total > 100, `Expected > 100 cameras in Bandung, got ${bandung.total}`);
  bandung.data.forEach((c) => {
    assert.match(c.city.toLowerCase(), /bandung/);
  });

  const tol = cctvService.getCameras({ category: 'tol' });
  assert.ok(tol.total > 50, `Expected > 50 tol cameras, got ${tol.total}`);
  tol.data.forEach((c) => {
    assert.equal(c.category, 'tol');
  });

  const search = cctvService.getCameras({ search: 'Pasteur' });
  assert.ok(search.total > 0, 'Expected to find Pasteur cameras');
  assert.ok(search.data.some((c) => c.name.toLowerCase().includes('pasteur') || c.road.toLowerCase().includes('pasteur')));
});

test('CCTV Nusantara Integration - Rewriter transforms relative segments to proxy endpoints', async () => {
  const stream = await cctvService.fetchHlsPlaylist('pelindung-05d5d4bd-05d6-4816-9cbf-e186c41ac638');
  assert.ok(stream.ok, 'Stream playlist fetch should succeed');
  assert.ok(stream.playlist.includes('#EXTM3U'), 'Should contain valid EXTM3U header');
  assert.ok(
    stream.playlist.includes('/api/spatial/traffic/cctv-proxy?url='),
    'Relative segment URLs must be rewritten to server proxy endpoints'
  );
  assert.equal(stream.contentType, 'application/vnd.apple.mpegurl; charset=utf-8');
});
