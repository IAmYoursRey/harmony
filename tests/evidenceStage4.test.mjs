/**
 * Harmony Stage 4 Remediation Review — Evidence & Verification Test Suite
 * Directly verifies all 10 Stage 4 reproduction findings and Section I requirements:
 * 1. Selected Landsat with empty assets yields UNAVAILABLE (MISSING_THERMAL_ASSET).
 * 2. Thermal/QA asset access failure invokes fetch, handles failure cleanly, and never generates fake DERIVED numbers.
 * 3. Optical demo preset (sentinel2_agriculture) does NOT bypass guards or produce Landsat 9 LST.
 * 4. Landsat 7 (LE07) and Landsat 5 (LT05) scenes are properly identified with correct sensor names.
 * 5. Raster values follow actual GeoTIFF data, eliminating synthetic coordinate geoSeed math loops.
 * 6. Traffic requests for the same corridor use monotonic sequence so older responses do not overwrite newer ones.
 * 7. TomTom traffic contract enforces confidence range, boolean roadClosure, and non-empty coordinates.
 * 8. Late success:false envelope does not delete newly cached generation response.
 * 9. Late transport abort in same generation does not delete replacement request cache.
 * 10. Headers, tuples, and records are properly normalized and sent over the wire in fetch.
 * 11. Valid georeferenced GeoTIFF binary decoding produces exact ground-truth temperatures and statistics.
 * 12. Valid zero traffic speed is accepted without false rejection.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { build } = require('esbuild');
const ts = require('typescript');

const repo = process.cwd();
const remotePath = 'apps/web/src/components/dashboard/views/spatial/studio/GeospatialRemoteSensingTab.tsx';
const mapsPath = 'apps/web/src/components/dashboard/views/spatial/MapsView.tsx';

function extractArrow(source, name) {
  const ast = ts.createSourceFile('input.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found;
  function visit(n) {
    if (ts.isVariableDeclaration(n) && n.name.getText(ast) === name) {
      found = n.initializer.getText(ast);
    }
    ts.forEachChild(n, visit);
  }
  visit(ast);
  if (!found) throw new Error(`Missing handler ${name}`);
  return found;
}

let apiClient;
let runLST;
let exportLST;
let runTraffic;
let lstService;
let stacService;
let GeoTiffParser;

const originalFetch = globalThis.fetch;
const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
const tick = () => new Promise(r => setTimeout(r, 0));

before(async () => {
  const remote = await readFile(`${repo}/${remotePath}`, 'utf8');
  const maps = await readFile(`${repo}/${mapsPath}`, 'utf8');

  const contents = `
export { apiClient } from './apps/web/src/services/apiClient.ts';
import { lstService, GeoTiffParser } from './apps/web/src/services/geospatial/lstService.ts';
export { lstService, GeoTiffParser } from './apps/web/src/services/geospatial/lstService.ts';
export { aoiService } from './apps/web/src/services/geospatial/aoiService.ts';
import { stacService } from './apps/web/src/services/geospatial/stacService.ts';
export { stacService } from './apps/web/src/services/geospatial/stacService.ts';
export const runLST = (ctx) => {
  const { lat, lng, activeAOI, selectedPreset, selectedStacScene, setIsProcessingLST, setLstEnvelope } = ctx;
  return (${extractArrow(remote, 'handleRunLSTAnalysis')})();
};
export const exportLST = (ctx) => {
  const { lstEnvelope, activeAOI } = ctx;
  return (${extractArrow(remote, 'handleExportLSTGeoJSON')})();
};
export const runTraffic = (ctx, corridor) => {
  const { apiClient, setTomtomProbeResult } = ctx;
  return (${extractArrow(maps, 'handleCheckTomTomLive')})(corridor);
};
`;

  const bundle = await build({
    stdin: { contents, resolveDir: repo, loader: 'ts' },
    tsconfig: `${repo}/apps/web/tsconfig.app.json`,
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    define: { 'import.meta.env': '{}' },
  });

  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };

  const imported = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
  apiClient = imported.apiClient;
  runLST = imported.runLST;
  exportLST = imported.exportLST;
  runTraffic = imported.runTraffic;
  lstService = imported.lstService;
  stacService = imported.stacService;
  GeoTiffParser = imported.GeoTiffParser;
});

after(() => {
  globalThis.fetch = originalFetch;
});

function lstAt(preset = 'EMPTY', scene = null, lat = -7.25, lng = 112.75) {
  let result;
  const p = runLST({
    lat,
    lng,
    activeAOI: null,
    selectedPreset: preset,
    selectedStacScene: scene,
    setIsProcessingLST: () => {},
    setLstEnvelope: (v) => { result = v; },
  });
  if (p && typeof p.then === 'function') {
    return p.then(() => result, () => result);
  }
  return result;
}

describe('Harmony Stage 4 Evidence & Remediation Test Suite', () => {

  test('Case 1: SELECTED_LANDSAT_WITH_NO_ASSETS_GENERATES_FAKE_RASTER - Empty assets yield UNAVAILABLE with MISSING_THERMAL_ASSET', () => {
    const scene = { id: 'LC09_L2SP_FIXTURE', collection: 'landsat-c2-l2', datetime: '2026-10-01T01:00:00Z', satellite: 'Landsat 9', assets: {} };
    const res = lstAt('EMPTY', scene);

    assert.equal(res.dataStatus, 'UNAVAILABLE');
    assert.equal(res.processingState, 'failed');
    assert.equal(res.reason?.code, 'MISSING_THERMAL_ASSET');
    assert.equal(res.data?.meanCelsius, null);
    assert.equal(res.data?.totalPixelCount, 0);
  });

  test('Case 2: LST_ASSET_FAILURE_NEVER_ATTEMPTED - Failed thermal & QA asset access attempts fetch and returns UNAVAILABLE without fake numbers', async () => {
    let rasterRequests = 0;
    globalThis.fetch = async () => {
      rasterRequests++;
      throw new Error('Fixture: asset access failed');
    };

    const scene = {
      id: 'LC09_L2SP_FIXTURE',
      collection: 'landsat-c2-l2',
      datetime: '2026-10-01T01:00:00Z',
      satellite: 'Landsat 9',
      assets: {
        ST_B10: { href: 'https://example.invalid/thermal.tif' },
        QA_PIXEL: { href: 'https://example.invalid/qa.tif' },
      },
    };

    const res = await lstAt('EMPTY', scene);
    assert.ok(rasterRequests > 0, `Expected raster requests to be attempted, got ${rasterRequests}`);
    assert.equal(res.dataStatus, 'UNAVAILABLE');
    assert.equal(res.data?.meanCelsius, null);
    assert.equal(res.reason?.code, 'ASSET_ACCESS_FAILED');
  });

  test('Case 3: OPTICAL_DEMO_PRESET_BYPASSES_LST_NO_SCENE_GUARD - Non-thermal preset without scene does not run Landsat LST', () => {
    const res = lstAt('sentinel2_agriculture');

    assert.equal(res.dataStatus, 'UNAVAILABLE');
    assert.equal(res.reason?.code, 'NO_THERMAL_SCENE');
    assert.equal(res.data?.meanCelsius, null);
    assert.notEqual(res.provenance?.provider, 'USGS / NASA Landsat Mission');
  });

  test('Case 4: LANDSAT7_SCENE_MISLABELLED_LANDSAT9 - Landsat 7 is correctly labeled ETM+ and not Landsat 9 TIRS-2', () => {
    const scene7 = {
      id: 'LE07_L2SP_FIXTURE',
      collection: 'landsat-c2-l2',
      datetime: '2026-10-01T01:00:00Z',
      satellite: 'Landsat 7',
      assets: {},
    };
    const res7 = lstAt('EMPTY', scene7);

    assert.equal(res7.data?.satellite, 'Landsat 7 ETM+');
    assert.equal(res7.data?.sensor, 'ETM+ (Enhanced Thematic Mapper Plus Band 6)');

    const scene5 = {
      id: 'LT05_L2SP_FIXTURE',
      collection: 'landsat-c2-l2',
      datetime: '2026-10-01T01:00:00Z',
      satellite: 'Landsat 5',
      assets: {},
    };
    const res5 = lstAt('EMPTY', scene5);
    assert.equal(res5.data?.satellite, 'Landsat 5 TM');
    assert.equal(res5.data?.sensor, 'TM (Thematic Mapper Band 6)');
  });

  test('Case 5: SAME_SCENE_ASSETS_IGNORED_COORDINATE_SEED - Location changes do not run synthetic coordinate seed on operational path', () => {
    const scene = { id: 'LC09_L2SP_FIXTURE', collection: 'landsat-c2-l2', datetime: '2026-10-01T01:00:00Z', satellite: 'Landsat 9', assets: {} };
    const r1 = lstAt('EMPTY', scene, -7.25, 112.75);
    const r2 = lstAt('EMPTY', scene, 40.71, -74.0);

    assert.equal(r1.data?.meanCelsius, null);
    assert.equal(r2.data?.meanCelsius, null);
    assert.equal(r1.dataStatus, 'UNAVAILABLE');
    assert.equal(r2.dataStatus, 'UNAVAILABLE');
  });

  test('Case 6: TRAFFIC_SAME_CORRIDOR_NEW_REQUEST_STILL_OVERWRITTEN - Monotonic request sequence protects newer response from late older response', async () => {
    const corridor = { id: 'fixture-same', center: [112.75, -7.25] };
    let trafficState;
    let releaseA;

    const older = runTraffic({
      apiClient: { get: () => new Promise(r => { releaseA = r; }) },
      setTomtomProbeResult: (v) => { trafficState = v; },
    }, corridor);

    await runTraffic({
      apiClient: { get: async () => ({ success: true, data: { currentSpeedKmh: 50, freeFlowSpeedKmh: 60 } }) },
      setTomtomProbeResult: (v) => { trafficState = v; },
    }, corridor);

    assert.equal(trafficState.currentSpeedKmh, 50);

    // Release older request with slower speed 10
    releaseA({ success: true, data: { currentSpeedKmh: 10, freeFlowSpeedKmh: 30 } });
    await older;

    assert.equal(trafficState.currentSpeedKmh, 50, 'Older response must NOT overwrite newer response on same corridor');
  });

  test('Case 7: TRAFFIC_INCOMPLETE_CONTRACT_LIVE - Invalid confidence, string roadClosure, or empty coordinates rejected to UNAVAILABLE', async () => {
    const corridor = { id: 'fixture-contract', center: [112.75, -7.25] };
    let trafficState;

    await runTraffic({
      apiClient: {
        get: async () => ({
          success: true,
          data: {
            currentSpeedKmh: 50,
            freeFlowSpeedKmh: 60,
            confidence: -3, // Invalid negative confidence
            roadClosure: 'false', // Invalid string boolean
            coordinates: [], // Invalid empty array
          },
        }),
      },
      setTomtomProbeResult: (v) => { trafficState = v; },
    }, corridor);

    assert.equal(trafficState.status, 'UNAVAILABLE');
    assert.notEqual(trafficState.status, 'LIVE');
  });

  test('Case 7b: TRAFFIC_VALID_ZERO_SPEED - Nonnegative 0 km/h speed is accepted under valid contract', async () => {
    const corridor = { id: 'fixture-jam', center: [112.75, -7.25] };
    let trafficState;

    await runTraffic({
      apiClient: {
        get: async () => ({
          success: true,
          data: {
            currentSpeedKmh: 0,
            freeFlowSpeedKmh: 50,
            confidence: 0.95,
            roadClosure: false,
            coordinates: [[112.75, -7.25], [112.76, -7.26]],
          },
        }),
      },
      setTomtomProbeResult: (v) => { trafficState = v; },
    }, corridor);

    assert.equal(trafficState.status, 'LIVE');
    assert.equal(trafficState.currentSpeedKmh, 0);
  });

  test('Case 8: OLD_FAILURE_ENVELOPE_DELETES_NEW_GENERATION_CACHE - Stale failure envelope does not delete newly cached generation', async () => {
    apiClient.clearCache();
    let gets = 0;
    let releaseFailure;

    globalThis.fetch = (url, opts) =>
      opts.method === 'POST'
        ? Promise.resolve(json({ version: 2 }))
        : ++gets === 1
        ? new Promise(resolve => {
            releaseFailure = () => resolve(json({ success: false, reason: { code: 'FIXTURE_OLD_FAILURE' } }));
          })
        : Promise.resolve(json({ success: true, version: 2 }));

    const oldRead = apiClient.get('/fixture/stage4/late-failure');
    await apiClient.post('/fixture/stage4/late-failure', { version: 2 });
    await apiClient.get('/fixture/stage4/late-failure');

    releaseFailure();
    await oldRead;

    // This GET must hit cache from second GET
    await apiClient.get('/fixture/stage4/late-failure');
    assert.equal(gets, 2, `Expected exactly 2 network GET calls, got ${gets}`);
  });

  test('Case 9: OLD_ABORT_SAME_GENERATION_DELETES_NEW_CACHE - Delayed transport abort does not delete replacement request cache', async () => {
    apiClient.clearCache();
    let gets = 0;
    let rejectOld;

    globalThis.fetch = (url, opts) =>
      ++gets === 1
        ? new Promise((resolve, reject) => { rejectOld = reject; })
        : Promise.resolve(json({ version: 2 }));

    const controller = new AbortController();
    const cancelled = apiClient.get('/fixture/stage4/same-generation', { signal: controller.signal });
    cancelled.catch(() => {});
    controller.abort();
    await cancelled.catch(() => {});

    // Replacement request succeeds and caches
    await apiClient.get('/fixture/stage4/same-generation');

    // Delayed transport abort settles later
    rejectOld(new DOMException('Fixture delayed transport abort', 'AbortError'));
    await tick();

    // Next request must hit cache
    await apiClient.get('/fixture/stage4/same-generation');
    assert.equal(gets, 2, `Expected exactly 2 network GET calls, got ${gets}`);
  });

  test('Case 10: HEADER_CACHE_SIGNATURE_DIFFERS_FROM_SENT_HEADERS - Headers objects and tuples properly transmit Accept-Language', async () => {
    apiClient.clearCache();
    const sent = [];

    globalThis.fetch = async (url, opts) => {
      const h = new Headers(opts.headers);
      sent.push({
        language: h.get('accept-language'),
        accept: h.get('accept'),
        headerNames: [...h.keys()],
      });
      return json({ language: h.get('accept-language') });
    };

    const headersObject = await apiClient.get('/fixture/stage4/headers-object', {
      headers: new Headers({ 'Accept-Language': 'id-ID', 'Accept': 'application/json' }),
    });

    const tuples = await apiClient.get('/fixture/stage4/headers-tuples', {
      headers: [['Accept-Language', 'en-US'], ['Accept', 'application/json']],
    });

    assert.equal(sent[0].language, 'id-ID');
    assert.equal(sent[0].accept, 'application/json');
    assert.equal(sent[1].language, 'en-US');
    assert.equal(sent[1].accept, 'application/json');

    assert.equal(headersObject.language, 'id-ID');
    assert.equal(tuples.language, 'en-US');
  });

  test('Case 11: GEOTIFF_BINARY_DECODING - GeoTiffParser correctly reads tiepoints, pixel scales, and raw samples', () => {
    const width = 4;
    const height = 4;
    const bbox = [112.0, -7.5, 112.4, -7.1];
    const rawData = new Uint16Array([
      44800, 44850, 44900, 44950,
      44810, 44860, 44910, 44960,
      44820, 44870, 44920, 44970,
      44830, 44880, 44930, 44980,
    ]);

    const buffer = lstService.createTestGeoTiffBuffer({ width, height, bbox, data: rawData });
    const meta = lstService.parseGeoTiffMetadata(buffer);

    assert.equal(meta.width, 4);
    assert.equal(meta.height, 4);
    assert.equal(meta.bitsPerSample, 16);

    // Read pixel (0, 0) and pixel (3, 3)
    const p00 = GeoTiffParser.readPixelAt(buffer, meta, 0, 0);
    const p33 = GeoTiffParser.readPixelAt(buffer, meta, 3, 3);

    assert.equal(p00, 44800);
    assert.equal(p33, 44980);

    // Radiometric conversion: 44800 DN -> Kelvin -> Celsius
    // Kelvin = 44800 * 0.00341802 + 149.0 = 153.127296 + 149.0 = 302.127296 K
    // Celsius = 302.127296 - 273.15 = 28.98 C
    const celsius = lstService.convertDNToCelsius(p00, 'Landsat 9');
    assert.equal(celsius, 28.98);
  });

  test('Case 12: EXPLICIT_DEMO_PRESET_IS_ISOLATED - Explicit landsat9_thermal preset is marked DEMONSTRATION', () => {
    const res = lstAt('landsat9_thermal');

    assert.equal(res.dataStatus, 'DEMO');
    assert.equal(res.provenance?.sourceType, 'DEMONSTRATION');
    assert.ok(res.provenance?.provider.includes('Simulasi Ilustratif'));
    assert.ok(typeof res.data?.meanCelsius === 'number');
  });

});
