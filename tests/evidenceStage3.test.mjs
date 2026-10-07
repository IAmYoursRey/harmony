/**
 * Harmony Stage 3 Remediation Review — Evidence & Integration Test Suite
 * Directly verifies that each of the 11 reproduction cases from Stage 3 review
 * are properly resolved in local code and adhere to all strict verification rules.
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

const originalFetch = globalThis.fetch;
const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });

before(async () => {
  const remote = await readFile(`${repo}/${remotePath}`, 'utf8');
  const maps = await readFile(`${repo}/${mapsPath}`, 'utf8');

  const contents = `
export { apiClient } from './apps/web/src/services/apiClient.ts';
import { lstService } from './apps/web/src/services/geospatial/lstService.ts';
export { lstService } from './apps/web/src/services/geospatial/lstService.ts';
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
});

after(() => {
  globalThis.fetch = originalFetch;
});

describe('Harmony Stage 3 Remediation Test Suite', () => {

  test('Case 1: LST_UI_SYNTHETIC_PIXEL_INPUT - No scene selected yields UNAVAILABLE, not fake pixels', () => {
    let result;
    runLST({
      lat: -7.25,
      lng: 112.75,
      activeAOI: null,
      selectedPreset: 'EMPTY',
      selectedStacScene: null,
      setIsProcessingLST: () => {},
      setLstEnvelope: (v) => { result = v; },
    });

    assert.equal(result.dataStatus, 'UNAVAILABLE');
    assert.equal(result.processingState, 'failed');
    assert.equal(result.reason?.code, 'NO_SCENE_SELECTED');
    assert.equal(result.data.totalPixelCount, 0);
    assert.equal(result.data.meanCelsius, null);
    assert.equal(result.provenance.provider, 'Belum Ada Scene Terpilih');
    assert.equal(result.provenance.sourceType, 'NONE');
  });

  test('Case 2: LST_LOCATION_INDEPENDENT_VALUES - No synthetic identical numbers across locations', () => {
    let r1, r2;
    runLST({
      lat: -7.25,
      lng: 112.75,
      activeAOI: null,
      selectedPreset: 'EMPTY',
      selectedStacScene: null,
      setIsProcessingLST: () => {},
      setLstEnvelope: (v) => { r1 = v; },
    });
    runLST({
      lat: 40.71,
      lng: -74.0,
      activeAOI: null,
      selectedPreset: 'EMPTY',
      selectedStacScene: null,
      setIsProcessingLST: () => {},
      setLstEnvelope: (v) => { r2 = v; },
    });

    assert.equal(r1.data.meanCelsius, null);
    assert.equal(r2.data.meanCelsius, null);
    assert.equal(r1.data.samples.length, 0);
    assert.equal(r2.data.samples.length, 0);
  });

  test('Case 3: LST_NONTHERMAL_SCENE_MISATTRIBUTED - Sentinel scene rejected as non-thermal product', () => {
    let result;
    runLST({
      lat: -7.25,
      lng: 112.75,
      activeAOI: null,
      selectedPreset: 'EMPTY',
      selectedStacScene: { id: 'S2_FIXTURE_NOT_A_THERMAL_PRODUCT', datetime: '2026-10-01T01:00:00Z' },
      setIsProcessingLST: () => {},
      setLstEnvelope: (v) => { result = v; },
    });

    assert.equal(result.dataStatus, 'UNAVAILABLE');
    assert.equal(result.processingState, 'failed');
    assert.equal(result.reason?.code, 'INVALID_PRODUCT_COLLECTION');
    assert.equal(result.data.sceneId, 'S2_FIXTURE_NOT_A_THERMAL_PRODUCT');
    assert.notEqual(result.data.satellite, 'Landsat 9');
    assert.equal(result.data.satellite, 'Sentinel-2 (Non-Thermal)');
  });

  test('Case 4: LST_HIGH_CONFIDENCE_CIRRUS_ACCEPTED - qaPixel=4 (bit 2) is cloud/cirrus masked', () => {
    const cirrus = lstService.processThermalRaster(
      null,
      { id: 'FIXTURE_QA_CIRRUS', satellite: 'Landsat 9', acquisitionDate: '2026-10-01T00:00:00Z' },
      [{ lat: -7.25, lng: 112.75, rawDN: 44800, qaPixel: 4 }]
    );

    assert.equal(cirrus.dataStatus, 'UNAVAILABLE');
    assert.equal(cirrus.data.samples[0].qualityValid, false);
    assert.equal(cirrus.data.samples[0].cloudMasked, true);
    assert.equal(cirrus.reason?.code, 'CLOUD_OR_SHADOW');
  });

  test('Case 5: STAC_SIGNER_SWALLOWS_ABORT - Signer rethrows AbortError on cancellation', async () => {
    globalThis.fetch = async () => {
      throw new DOMException('fixture signer cancelled', 'AbortError');
    };

    await assert.rejects(
      async () => {
        await stacService.signAssetUrl('https://example.blob.core.windows.net/fixture/thermal.tif');
      },
      (err) => {
        assert.equal(err.name, 'AbortError');
        return true;
      }
    );
  });

  test('Case 6: LST_EXPORT_NOT_GEOJSON - Export produces valid RFC 7946 GeoJSON FeatureCollection', async () => {
    const priorURL = globalThis.URL;
    const priorDocument = globalThis.document;
    let exportedBlob;

    globalThis.URL = {
      createObjectURL: (blob) => { exportedBlob = blob; return 'blob:fixture'; },
      revokeObjectURL: () => {},
    };
    globalThis.document = {
      createElement: () => ({ click: () => {} }),
      body: { appendChild: () => {}, removeChild: () => {} },
    };

    const fixtureEnvelope = {
      requestId: 'lst-test-1',
      dataStatus: 'DERIVED',
      processingState: 'succeeded',
      data: {
        sceneId: 'LC09_TEST',
        acquisitionDate: '2026-10-01T00:00:00Z',
        meanCelsius: 28.5,
        validPixelCount: 2,
        totalPixelCount: 2,
        samples: [
          { lat: -7.25, lng: 112.75, celsius: 28.5, kelvin: 301.65, rawDN: 44800, qualityValid: true, cloudMasked: false },
          { lat: -7.26, lng: 112.76, celsius: 28.7, kelvin: 301.85, rawDN: 44900, qualityValid: true, cloudMasked: false },
        ],
      },
      provenance: { provider: 'USGS', sourceType: 'SATELLITE_RASTER' },
    };

    exportLST({ lstEnvelope: fixtureEnvelope, activeAOI: null });
    const content = JSON.parse(await exportedBlob.text());

    globalThis.URL = priorURL;
    globalThis.document = priorDocument;

    assert.equal(exportedBlob.type, 'application/geo+json');
    assert.equal(content.type, 'FeatureCollection');
    assert.equal(Array.isArray(content.features), true);
    assert.equal(content.features.length, 2);
    assert.equal(content.features[0].type, 'Feature');
    assert.equal(content.features[0].geometry.type, 'Point');
    assert.deepEqual(content.features[0].geometry.coordinates, [112.75, -7.25]);
    assert.equal(content.features[0].properties.celsius, 28.5);
  });

  test('Case 7: TRAFFIC_NETWORK_ERROR_IS_KEY_MISSING - Calls /api route and reports FAILED, not NOT_CONFIGURED', async () => {
    const corridor = { id: 'fixture-a', center: [112.75, -7.25] };
    let trafficState, trafficPath;

    await runTraffic({
      apiClient: {
        get: async (path) => {
          trafficPath = path;
          throw new Error('fixture: HTTP 404 HTML');
        },
      },
      setTomtomProbeResult: (v) => { trafficState = v; },
    }, corridor);

    assert.equal(trafficPath, '/api/spatial/traffic/flow?lat=-7.25&lng=112.75');
    assert.equal(trafficState.status, 'FAILED');
    assert.match(trafficState.message, /HTTP 404 HTML/);
  });

  test('Case 8: TRAFFIC_EMPTY_PAYLOAD_IS_LIVE - Empty payload produces UNAVAILABLE without invented zero speeds', async () => {
    const corridor = { id: 'fixture-a', center: [112.75, -7.25] };
    let trafficState;

    await runTraffic({
      apiClient: {
        get: async () => ({ success: true, data: {} }),
      },
      setTomtomProbeResult: (v) => { trafficState = v; },
    }, corridor);

    assert.equal(trafficState.status, 'UNAVAILABLE');
    assert.notEqual(trafficState.status, 'LIVE');
  });

  test('Case 9: TRAFFIC_OLD_REQUEST_OVERWRITES_NEW_SELECTION - Stale response does not overwrite active selection', async () => {
    const corridorA = { id: 'fixture-a', center: [112.75, -7.25] };
    const corridorB = { id: 'fixture-b', center: [106.8, -6.2] };
    let trafficState;
    let releaseA;

    const older = runTraffic({
      apiClient: { get: () => new Promise((r) => { releaseA = r; }) },
      setTomtomProbeResult: (v) => { trafficState = v; },
    }, corridorA);

    await runTraffic({
      apiClient: { get: async () => ({ success: true, data: { currentSpeedKmh: 50, freeFlowSpeedKmh: 60 } }) },
      setTomtomProbeResult: (v) => { trafficState = v; },
    }, corridorB);

    releaseA({ success: true, data: { currentSpeedKmh: 10, freeFlowSpeedKmh: 30 } });
    await older;

    assert.equal(trafficState.corridorId, 'fixture-b');
    assert.equal(trafficState.currentSpeedKmh, 50);
  });

  test('Case 10: API_READ_AFTER_WRITE_JOINS_OLD_FLIGHT - New read after mutation bypasses old in-flight flight', async () => {
    apiClient.clearCache();
    let releaseOld;
    let gets = 0;

    globalThis.fetch = (url, opts) =>
      opts.method === 'POST'
        ? Promise.resolve(json({ version: 2 }))
        : ++gets === 1
        ? new Promise((resolve) => { releaseOld = () => resolve(json({ version: 1 })); })
        : Promise.resolve(json({ version: 2 }));

    const beforeWrite = apiClient.get('/fixture/stage3/mutation');
    await apiClient.post('/fixture/stage3/mutation', { version: 2 });
    const afterWrite = apiClient.get('/fixture/stage3/mutation');

    releaseOld();
    await beforeWrite;
    const afterWriteResult = await afterWrite;

    assert.equal(afterWriteResult.version, 2);
    assert.equal(gets, 2);
  });

  test('Case 11: API_REPRESENTATION_HEADERS_IGNORED - Representation headers differentiate cached entries', async () => {
    apiClient.clearCache();
    let gets = 0;

    globalThis.fetch = async (url, opts) => {
      gets++;
      const headers = opts.headers || {};
      const lang = typeof headers.get === 'function' ? headers.get('Accept-Language') : headers['Accept-Language'];
      return json({ language: lang });
    };

    const id = await apiClient.get('/fixture/stage3/locale', { headers: { 'Accept-Language': 'id-ID' } });
    const en = await apiClient.get('/fixture/stage3/locale', { headers: { 'Accept-Language': 'en-US' } });

    assert.equal(id.language, 'id-ID');
    assert.equal(en.language, 'en-US');
    assert.equal(gets, 2);
  });
});
