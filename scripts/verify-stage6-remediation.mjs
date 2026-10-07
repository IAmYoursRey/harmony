import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';

const repo = 'D:/vscode/Harmony';
const reviewDir = 'D:/Blender/test 1/harmony-web-check/2026-10-03-sixth-remediation-review';
const prevDir = 'D:/Blender/test 1/harmony-web-check/2026-10-03-fifth-remediation-review';
const outFile = `${repo}/tests/evidence-stage6-verified.json`;

const require = createRequire(`${repo}/package.json`);
const { build } = require('esbuild');
const ts = require('typescript');

const remote = await readFile(`${repo}/apps/web/src/components/dashboard/views/spatial/studio/GeospatialRemoteSensingTab.tsx`, 'utf8');
const maps = await readFile(`${repo}/apps/web/src/components/dashboard/views/spatial/MapsView.tsx`, 'utf8');
const standalone = await readFile(`${repo}/apps/web/src/components/dashboard/views/spatial/GeospatialStudioView.tsx`, 'utf8');

function initializer(source, name) {
  const ast = ts.createSourceFile('input.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found;
  function visit(n) {
    if (ts.isVariableDeclaration(n) && n.name.getText(ast) === name) found = n.initializer.getText(ast);
    ts.forEachChild(n, visit);
  }
  visit(ast);
  if (!found) throw new Error(`Missing ${name}`);
  return found;
}

const ast = ts.createSourceFile('input.tsx', remote, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let resetEffect;
function effectVisit(n) {
  if (ts.isCallExpression(n) && n.expression.getText(ast) === 'useEffect' && n.arguments[0]?.getText(ast).includes('setLstEnvelope(null)')) {
    resetEffect = n.arguments[0].getText(ast);
  }
  ts.forEachChild(n, effectVisit);
}
effectVisit(ast);

const standaloneAst = ts.createSourceFile('standalone.tsx', standalone, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let quakeSeed, standaloneBoot;
function standaloneVisit(n) {
  if (ts.isVariableDeclaration(n) && ts.isArrayBindingPattern(n.name) && n.name.elements[0]?.getText(standaloneAst) === 'earthquakes') {
    quakeSeed = n.initializer.arguments[0].getText(standaloneAst);
  }
  if (ts.isCallExpression(n) && n.expression.getText(standaloneAst) === 'useEffect' && n.arguments[0]?.getText(standaloneAst).includes('const loadData')) {
    standaloneBoot = n.arguments[0].getText(standaloneAst);
  }
  ts.forEachChild(n, standaloneVisit);
}
standaloneVisit(standaloneAst);

const bundle = await build({
  stdin: {
    contents: `
import { lstService } from './apps/web/src/services/geospatial/lstService.ts';
import { aoiService } from './apps/web/src/services/geospatial/aoiService.ts';
import { stacService } from './apps/web/src/services/geospatial/stacService.ts';
export { lstService } from './apps/web/src/services/geospatial/lstService.ts';
export { GeoTiffParser, findThermalAsset, findQaAsset } from './apps/web/src/services/geospatial/rasterReaderService.ts';
export { geospatialAnalysisService } from './apps/web/src/services/geospatialAnalysisService.ts';
export const quakeSeed = ${quakeSeed};
export const runStandaloneBoot = (ctx) => {
  const { bmkgService, fetchSchools, setEarthquakes, setSchools } = ctx;
  return (${standaloneBoot})();
};
export const runLST = (ctx) => {
  const { lat, lng, activeAOI, selectedPreset, selectedStacScene, setIsProcessingLST, setLstEnvelope } = ctx;
  return (${initializer(remote, 'handleRunLSTAnalysis')})();
};
export const resetEffect = (ctx) => {
  const { searchGeneration, searchController, setStacScenes, setSelectedStacScene, setStacStatusMessage, setIsSearchingSTAC, setLstEnvelope } = ctx;
  return (${resetEffect})();
};
export const runTraffic = (ctx, corridor) => {
  const { apiClient, setTomtomProbeResult } = ctx;
  return (${initializer(maps, 'handleCheckTomTomLive')})(corridor);
};
export const radarStatus = (ctx) => {
  const { weatherMapOverlay, weatherRenderMode, radarMetadataStale, radarFrameTime, radarTileCounts } = ctx;
  return (${initializer(maps, 'weatherStatusText')});
};
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

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const {
  lstService: lst,
  GeoTiffParser: parser,
  findThermalAsset,
  findQaAsset,
  runLST,
  resetEffect: runReset,
  runTraffic,
  radarStatus,
  geospatialAnalysisService: spatial,
  quakeSeed: quakeFixtures,
  runStandaloneBoot,
} = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

const { fromArrayBuffer } = await import(pathToFileURL(require.resolve('geotiff')).href);

const report = {
  verifiedAt: new Date().toISOString(),
  runner: 'scripts/verify-stage6-remediation.mjs',
  description: 'Stage 6 Post-Remediation Verification Output',
  checks: [],
};

const add = (id, details) => report.checks.push({ id, ...details });

async function bytes(name, dir = reviewDir) {
  const b = await readFile(`${dir}/${name}`);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

const thermal = await bytes('thermal-little.tif', prevDir);
const qa = await bytes('qa-clear.tif', prevDir);
const tm = parser.parseMetadata(thermal);
const qm = parser.parseMetadata(qa);
const bounds = [112, -7.016, 112.016, -7];
const sceneMeta = { id: 'LC09_FIXTURE', satellite: 'Landsat 9', acquisitionDate: '2026-10-01T01:00:00Z' };

// 1. Previous fixed formats verification
for (const name of ['thermal-little.tif', 'thermal-big.tif', 'thermal-deflate.tif']) {
  const b = await bytes(name, prevDir);
  const m = parser.parseMetadata(b);
  const p = parser.sampleWindow(b, m, qa, qm, bounds, 6);
  const r = lst.processThermalRaster(null, sceneMeta, p);
  add(`FIXED_${name}`, {
    dn: parser.readPixelAt(b, m, 0, 0),
    status: r.dataStatus,
    meanCelsius: r.data?.meanCelsius,
    passed: parser.readPixelAt(b, m, 0, 0) === 45000 && r.dataStatus === 'DERIVED' && r.data?.meanCelsius === 29.66,
  });
}

// 2. Stage 6 raster tests
for (const name of ['thermal-deflate-predictor2.tif', 'thermal-tiled.tif', 'thermal-geographic-4269.tif', 'thermal-georef-no-crs.tif']) {
  const b = await bytes(name);
  const image = await (await fromArrayBuffer(b)).getImage();
  const raster = await image.readRasters();
  const m = parser.parseMetadata(b);
  let actualDN, error;
  try {
    actualDN = parser.readPixelAt(b, m, 1, 0);
  } catch (e) {
    error = e.message;
  }
  let outcome;
  try {
    const p = parser.sampleWindow(b, m, qa, qm, bounds, 6);
    const r = lst.processThermalRaster(null, { ...sceneMeta, crs: m.crs }, p);
    outcome = {
      status: r.dataStatus,
      meanCelsius: r.data?.meanCelsius,
      validPixels: r.data?.validPixelCount,
    };
  } catch (e) {
    outcome = { error: e.message };
  }
  add(`RASTER_${name}`, {
    referenceDN: raster[0][1],
    actualDN,
    error,
    actualCRS: m.crs,
    outcome,
    passed: actualDN === raster[0][1] && (name === 'thermal-geographic-4269.tif' ? m.crs === 'EPSG:4269' : true) && (name === 'thermal-georef-no-crs.tif' ? m.crs === null : true),
  });
}

// 3. PixelIsArea affine mapping
const locationSamples = parser.sampleWindow(thermal, tm, qa, qm, [112.0008, -7.0008, 112.0008, -7.0008], 1);
add('PIXEL_IS_AREA_ROUNDING_SELECTS_NEIGHBOUR', {
  actualRow: locationSamples[0].sourceRow,
  actualCol: locationSamples[0].sourceCol,
  expectedRow: 0,
  expectedCol: 0,
  passed: locationSamples[0].sourceRow === 0 && locationSamples[0].sourceCol === 0,
});

// 4. Duplicate samples coverage denominator & area
const tiny = lst.processThermalRaster(null, sceneMeta, parser.sampleWindow(thermal, tm, qa, qm, [112, -7.0002, 112.0002, -7], 6));
add('DUPLICATE_SAMPLES_COVERAGE_DENOMINATOR', {
  validUniquePixels: tiny.data?.validPixelCount,
  totalPixelCount: tiny.data?.totalPixelCount,
  coverageFraction: tiny.data?.coverageFraction,
  validAreaKm2: tiny.provenance?.validAreaKm2,
  passed: tiny.data?.coverageFraction === 1.0 && tiny.data?.totalPixelCount === 1,
});

// 5. Semantic asset discovery
const rawB10 = findThermalAsset({ b10: { href: 'https://fixture.invalid/raw-b10.tif', roles: ['data'] } });
const onlyStQa = findThermalAsset({ st_qa: { href: 'https://fixture.invalid/st-qa.tif', roles: ['data'] } });
const genericQa = findQaAsset({ qa: { href: 'https://fixture.invalid/arbitrary-qa.tif' } });
add('NON_ST_ASSET_STILL_ACCEPTED', {
  rawB10,
  onlyStQa,
  genericQa,
  passed: rawB10 === null && onlyStQa === null && genericQa === null,
});

// 6. UI Lifecycle & Abort checks
const originalFetch = globalThis.fetch;
const tick = () => new Promise(r => setTimeout(r, 5));
function ctx(scene) {
  const states = [];
  const loading = [];
  return {
    states,
    loading,
    context: {
      lat: -7.001,
      lng: 112.001,
      activeAOI: null,
      selectedPreset: 'EMPTY',
      selectedStacScene: scene,
      setIsProcessingLST: v => loading.push(v),
      setLstEnvelope: v => states.push(v),
    },
  };
}

const scene = {
  id: 'LC09_OLD_PENDING_FIXTURE',
  collection: 'landsat-c2-l2',
  datetime: '2026-10-01T01:00:00Z',
  assets: {
    lwir11: { href: 'https://fixture.invalid/thermal.tif' },
    qa_pixel: { href: 'https://fixture.invalid/qa.tif' },
  },
};

function gate() {
  const requests = [];
  globalThis.fetch = (url, options) =>
    new Promise(resolve =>
      requests.push({
        url: String(url),
        signal: options?.signal,
        release: () => resolve(new Response(String(url).includes('/qa.tif') ? qa : thermal, { headers: { 'content-type': 'image/tiff' } })),
      })
    );
  return requests;
}

async function waitRequests(requests) {
  for (let i = 0; i < 20 && requests.length < 2; i++) await tick();
  if (requests.length !== 2) throw new Error(`Expected two pending asset fetches, got ${requests.length}`);
}

// Check 6a: Reset effect aborts in-flight request
lst.resetRequestContext();
let gates = gate();
let state = ctx(scene);
let pending = runLST(state.context);
await waitRequests(gates);

const cleanup = runReset({
  searchGeneration: { current: 0 },
  searchController: { current: null },
  setStacScenes: () => {},
  setSelectedStacScene: () => {},
  setStacStatusMessage: () => {},
  setIsSearchingSTAC: () => {},
  setLstEnvelope: v => state.states.push(v),
});

const abortedAfterReset = gates.map(r => r.signal?.aborted);
gates.forEach(r => r.release());
await pending;

add('ACTUAL_LOCATION_AOI_RESET_EFFECT_ALLOWS_OLD_RESULT', {
  abortedAfterReset,
  stateAfterReset: state.states.at(-1),
  finalStatus: state.states.at(-1)?.dataStatus ?? null,
  passed: abortedAfterReset.every(Boolean) && state.states.at(-1) === null,
});

// Check 6b: Unmount cleanup aborts in-flight request
lst.resetRequestContext();
gates = gate();
state = ctx(scene);
pending = runLST(state.context);
await waitRequests(gates);

const unmountCleanup = runReset({
  searchGeneration: { current: 0 },
  searchController: { current: null },
  setStacScenes: () => {},
  setSelectedStacScene: () => {},
  setStacStatusMessage: () => {},
  setIsSearchingSTAC: () => {},
  setLstEnvelope: () => {},
});
unmountCleanup();
const abortedAfterUnmount = gates.map(r => r.signal?.aborted);
gates.forEach(r => r.release());
await pending;

add('UNMOUNT_CLEANUP_DOES_NOT_CANCEL_LST', {
  abortedAfterUnmount,
  finalStatus: state.states.at(-1)?.dataStatus,
  passed: abortedAfterUnmount.every(Boolean),
});

// Check 6c: DEMO selection cancels operational request
lst.resetRequestContext();
gates = gate();
state = ctx(scene);
pending = runLST(state.context);
await waitRequests(gates);
runLST({ ...state.context, selectedStacScene: null, selectedPreset: 'landsat9_thermal' });
const demoState = state.states.at(-1)?.dataStatus;
gates.forEach(r => r.release());
await pending;

add('DEMO_DOES_NOT_INVALIDATE_OPERATIONAL_REQUEST', {
  demoStateBeforeOldCompletes: demoState,
  finalStatus: state.states.at(-1)?.dataStatus,
  passed: state.states.at(-1)?.dataStatus === 'DEMO',
});

// Check 6d: SAS signing failure
lst.resetRequestContext();
const calls = [];
globalThis.fetch = async url => {
  const path = new URL(String(url)).pathname;
  calls.push(path.includes('/sas/') ? 'signer' : path.includes('/qa.tif') ? 'qa' : 'thermal');
  return path.includes('/sas/')
    ? new Response(JSON.stringify({ error: 'fixture signer unavailable' }), { status: 503, headers: { 'content-type': 'application/json' } })
    : new Response(path.includes('/qa.tif') ? qa : thermal, { headers: { 'content-type': 'image/tiff' } });
};
state = ctx({
  ...scene,
  assets: {
    lwir11: { href: 'https://fixture.blob.core.windows.net/data/thermal.tif' },
    qa_pixel: { href: 'https://fixture.blob.core.windows.net/data/qa.tif' },
  },
});
await runLST(state.context);

add('SIGNING_ERROR_SWALLOWED_THEN_UNSIGNED_ACCESS', {
  calls,
  finalStatus: state.states.at(-1)?.dataStatus,
  reason: state.states.at(-1)?.reason?.code ?? null,
  passed: state.states.at(-1)?.dataStatus === 'UNAVAILABLE' && state.states.at(-1)?.reason?.code === 'SIGNING_FAILED',
});

// Check 6e: Landsat Level-1 rejected
lst.resetRequestContext();
globalThis.fetch = async url => new Response(String(url).includes('/qa.tif') ? qa : thermal, { headers: { 'content-type': 'image/tiff' } });
state = ctx({
  ...scene,
  id: 'LC09_L1TP_NON_ST_FIXTURE',
  collection: 'landsat-c2-l1',
  assets: {
    b10: { href: 'https://fixture.invalid/raw-b10.tif' },
    qa_pixel: { href: 'https://fixture.invalid/qa.tif' },
  },
});
await runLST(state.context);

add('LEVEL1_B10_CALIBRATED_AS_LEVEL2_ST', {
  status: state.states.at(-1)?.dataStatus,
  meanCelsius: state.states.at(-1)?.data?.meanCelsius,
  reasonCode: state.states.at(-1)?.reason?.code,
  passed: state.states.at(-1)?.dataStatus === 'UNAVAILABLE' && state.states.at(-1)?.reason?.code === 'LEVEL1_NOT_SUPPORTED_AS_L2ST',
});

// Check 7: Traffic contract geometry
for (const [id, coordinates] of [['missing', undefined], ['outside-range', [[999, -777]]]]) {
  let actual;
  await runTraffic(
    {
      apiClient: {
        get: async () => ({
          success: true,
          data: {
            currentSpeedKmh: 45,
            freeFlowSpeedKmh: 60,
            confidence: 0.9,
            roadClosure: false,
            ...(coordinates === undefined ? {} : { coordinates }),
          },
        }),
      },
      setTomtomProbeResult: v => { actual = v; },
    },
    { id: 'fixture', center: [112, -7] }
  );
  add(`TRAFFIC_GEOMETRY_${id}`, {
    status: actual.status,
    roadClosure: actual.roadClosure,
    passed: actual.status === 'UNAVAILABLE',
  });
}

// Check 8: Radar status
const frame = { weatherMapOverlay: 'radar', weatherRenderMode: 'native', radarFrameTime: Date.now() / 1000 };
for (const [id, counts, stale, expectedStatus] of [
  ['pending', { requested: 10, loaded: 0, error: 0 }, false, 'MEMUAT'],
  ['all-failed', { requested: 10, loaded: 0, error: 10 }, false, 'UNAVAILABLE'],
  ['partial', { requested: 10, loaded: 5, error: 5 }, false, 'PARSIAL'],
  ['no-data-stale', { requested: 0, loaded: 0, error: 0 }, true, 'UNAVAILABLE'],
  ['new-view-all-failed-after-old-view-success', { requested: 20, loaded: 10, error: 10 }, false, 'PARSIAL'],
]) {
  const actualStatus = radarStatus({ ...frame, radarMetadataStale: stale, radarTileCounts: counts });
  add(`RADAR_${id}`, {
    actualStatus,
    expectedStatus,
    passed: actualStatus === expectedStatus,
  });
}

// Check 9: Standalone studio earthquakes seed
let quakeState = quakeFixtures;
runStandaloneBoot({
  bmkgService: {
    getAutoGempa: async () => { throw new Error('fixture no earthquake observation'); },
    getGempaTerkini: async () => { throw new Error('fixture no earthquake observation'); },
  },
  fetchSchools: async () => [],
  setEarthquakes: v => { quakeState = v; },
  setSchools: () => {},
});
await tick();
await tick();

add('STANDALONE_QUAKE_FAILURE_RETAINS_SEEDED_EVENTS', {
  seedCount: quakeFixtures.length,
  eventsAfterFailedRefresh: quakeState.length,
  nearestEarthquake: spatial.generateSpatialBuffer(-7.2575, 112.7521, 5, [], quakeState, []).nearestEarthquake,
  passed: quakeFixtures.length === 0 && quakeState.length === 0,
});

// Check 10: Buffer analysis defaults
const buf1 = spatial.generateSpatialBuffer(-7, 112, 5, [], [{ lat: -7.001, lng: 112.001, place: 'fixture with missing magnitude and depth' }], []);
add('BUFFER_INVENTS_MISSING_MAGNITUDE_DEPTH', {
  actual: buf1.nearestEarthquake,
  passed: buf1.nearestEarthquake?.mag === null && buf1.nearestEarthquake?.depthKm === null,
});

const buf2 = spatial.generateSpatialBuffer(0, 112, 5, [], [{ lat: 0, lng: 112, mag: 0, depth: 0 }], []);
add('BUFFER_IGNORES_VALID_ZERO_COORDINATES', {
  actualCount: buf2.earthquakesCount,
  passed: buf2.earthquakesCount === 1,
});

globalThis.fetch = originalFetch;

await writeFile(outFile, JSON.stringify(report, null, 2));
console.log(`Saved Stage 6 verification evidence to ${outFile}`);
console.log(`Total checks: ${report.checks.length}`);
console.log(`All checks passed: ${report.checks.every(c => c.passed)}`);
