import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const repo = 'D:/vscode/Harmony';
const require = createRequire(`${repo}/package.json`);
const { build } = require('esbuild');
const ts = require('typescript');

const mapPath = 'apps/web/src/components/dashboard/views/spatial/MapsView.tsx';
const modalPath = 'apps/web/src/components/dashboard/views/spatial/GeospatialWeatherModal.tsx';

function sourceAst(p) {
  return ts.createSourceFile('source.tsx', readFileSync(`${repo}/${p}`, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function variable(p, name) {
  const ast = sourceAst(p);
  let result;
  function visit(n) {
    if (ts.isVariableDeclaration(n) && n.name.getText(ast) === name) {
      result = n.initializer.getText(ast);
    }
    ts.forEachChild(n, visit);
  }
  visit(ast);
  if (!result) throw Error(`Missing ${name}`);
  return result;
}

const mapAst = sourceAst(mapPath);
let effect;
function visitEffect(n) {
  if (ts.isCallExpression(n) && n.expression.getText(mapAst) === 'useEffect' && n.arguments[0]?.getText(mapAst).includes('const tileSource = new XYZ')) {
    effect = n.arguments[0].getText(mapAst);
  }
  ts.forEachChild(n, visitEffect);
}
visitEffect(mapAst);
if (!effect) throw Error('Missing real tile effect');

const bundle = await build({
  stdin: {
    contents: `
export { weatherAggregatorService as weather } from './apps/web/src/services/weatherAggregatorService.ts';
export { metNorwayService as met } from './apps/web/src/services/metNorwayService.ts';
export { geospatialDataTelemetryService as telemetry } from './apps/web/src/services/geospatialDataTelemetryService.ts';
const useMemo = f => f();
const useCallback = f => f;
export const chartSummary = (chartData, timeframe = 'hourly') => (${variable(modalPath, 'chartSummary')});
export const radarStatus = (radarTileCounts) => {
  const weatherMapOverlay = 'radar', weatherRenderMode = 'native', radarMetadataStale = false, radarFrameTime = Date.now() / 1000;
  return (${variable(mapPath, 'weatherStatusText')});
};
export const runTileEffect = ctx => {
  const { mapRef, mapReady, weatherTileLayerRef, weatherMapOverlay, weatherRenderMode, rainviewerPath, rainviewerHost, gibsAvailableTime, rainviewerSatellitePath, weatherOverlayOpacity, setRadarTileLoadError, setRadarTileCounts, XYZ, TileLayer } = ctx;
  return (${effect})();
};
export const gibsCallback = ctx => {
  const { gibsController, setGibsAvailableTime, setGibsFrameTime, setGibsMetadataStale } = ctx;
  return (${variable(mapPath, 'fetchGibsMetadata')});
};
`,
    resolveDir: repo,
    loader: 'ts',
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
  define: { 'import.meta.env': '{}' },
});

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const m = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString('base64')}`);
const originalFetch = globalThis.fetch;

const report = {
  checkedAt: new Date().toISOString(),
  scope: 'Stage 10 independent verification script reproducing all 15 scenarios on updated Harmony source code',
  cases: [],
};
const add = (id, actual, expected, passed) => {
  report.cases.push({ id, actual, expected, passed });
};

const now = Date.now(), epoch = Math.floor(now / 1000), hour = epoch - epoch % 3600;
const point = (offset = 0) => ({
  time: new Date(now + offset).toISOString(),
  data: { instant: { details: { air_temperature: 17, relative_humidity: 81, wind_speed: 4, wind_from_direction: 140, cloud_area_fraction: 93, air_pressure_at_sea_level: 1005 } } },
});
const metBody = (lat, lng) => ({
  geometry: { type: 'Point', coordinates: [lng, lat, 0] },
  properties: {
    meta: {
      updated_at: new Date(now).toISOString(),
      units: { air_temperature: 'celsius', relative_humidity: '%', wind_speed: 'm/s', wind_from_direction: 'degrees', cloud_area_fraction: '%', air_pressure_at_sea_level: 'hPa' },
    },
    timeseries: [point()],
  },
});

console.log('Running Stage 10 Verification Suite...');

// 1. Fallback scenarios
for (const [id, lat, airEpoch, partialModel] of [
  ['fallback-hourly-null-consumer', -7.201, epoch, false],
  ['fallback-old-air', -7.202, epoch - 86400 * 30, false],
  ['fallback-missing-models-status', -7.203, epoch, true],
]) {
  globalThis.fetch = async url => {
    const u = new URL(url), models = u.searchParams.get('models');
    if (u.hostname === 'api.met.no') return new Response(JSON.stringify(metBody(lat, 112.75)));
    if (u.hostname.includes('air-quality')) return new Response(JSON.stringify({ latitude: lat, longitude: 112.75, current: { time: airEpoch, pm2_5: 15, pm10: 20, ozone: 30 } }));
    if (models) {
      const h = { time: [hour] };
      for (const mid of models.split(',')) if (!partialModel || mid === 'ecmwf_ifs025') h[`temperature_2m_${mid}`] = [28];
      return new Response(JSON.stringify({ latitude: lat, longitude: 112.75, hourly: h }));
    }
    throw Error('Independent primary outage fixture');
  };

  const w = await m.weather.fetchConsensusWeather(lat, 112.75, id, true);
  const summary = m.chartSummary(w.hourly);
  const perModel = m.telemetry.getEndpoints().filter(e => e.id.startsWith('open_meteo_model_')).map(e => ({ id: e.id, status: e.status }));

  let passed = false;
  if (id === 'fallback-hourly-null-consumer') {
    // hourly[0].conditionCode must be null, pressure must be null, totalRain must be 'Tidak tersedia'
    passed = w.hourly[0]?.conditionCode === null && w.hourly[0]?.pressure === null && summary.totalRain === 'Tidak tersedia';
  } else if (id === 'fallback-old-air') {
    // 30-day air must be rejected from current and air attempt status failed
    const airAttempt = w.sourceFetches.find(a => a.id === 'open_meteo_air');
    passed = w.current?.pm25 === null && airAttempt?.status === 'FAILED';
  } else if (id === 'fallback-missing-models-status') {
    // missing models BoM, CMA, JMA must be OFFLINE, and models attempt PARTIAL
    const modelsAttempt = w.sourceFetches.find(a => a.id === 'open_meteo_models');
    const bomEp = perModel.find(e => e.id === 'open_meteo_model_bom');
    const cmaEp = perModel.find(e => e.id === 'open_meteo_model_cma');
    const jmaEp = perModel.find(e => e.id === 'open_meteo_model_jma');
    passed = modelsAttempt?.status === 'PARTIAL' && bomEp?.status === 'OFFLINE' && cmaEp?.status === 'OFFLINE' && jmaEp?.status === 'OFFLINE';
  }

  add(id, {
    current: w.current,
    firstHour: w.hourly[0],
    summary,
    modelsCount: w.modelComparison.length,
    attempts: w.sourceFetches.map(a => ({ id: a.id, status: a.status, error: a.error })),
    perModel,
  }, id === 'fallback-hourly-null-consumer' ? 'Unknown condition/pressure/rain remain unknown in series and summaries' : id === 'fallback-old-air' ? 'Reject stale air from combined current and mark its attempt failed' : 'Missing eight models must be PARTIAL and per-model statuses reflect validated results', passed);
}

// 2. MET Norway contract scenarios
for (const [id, lat, change, status] of [
  ['MET-old-issue-new-points', -7.211, b => { b.properties.meta.updated_at = '2020-01-01T00:00:00Z'; }, 200],
  ['MET-one-invalid-one-valid', -7.212, b => { const p = point(3600000); p.data.instant.details.relative_humidity = 999; b.properties.timeseries.push(p); }, 200],
  ['MET-HTTP203-unicode', -7.213, b => { b.providerNote = 'é漢字'; }, 203],
]) {
  const b = metBody(lat, 112.75);
  change(b);
  const text = JSON.stringify(b);
  globalThis.fetch = async () => new Response(text, { status, headers: { expires: new Date(now + 3600000).toUTCString() } });
  const r = await m.met.fetchForecast(lat, 112.75);
  const expectedBytes = new TextEncoder().encode(text).length;

  let passed = false;
  if (id === 'MET-old-issue-new-points') {
    passed = r.success === false && r.attempt?.status === 'FAILED';
  } else if (id === 'MET-one-invalid-one-valid') {
    passed = r.success === true && r.points.length === 1 && r.attempt?.status === 'PARTIAL' && r.attempt?.rejectedCount === 1;
  } else if (id === 'MET-HTTP203-unicode') {
    passed = r.attempt?.httpStatus === 203 && r.attempt?.payloadBytes === expectedBytes;
  }

  add(id, {
    success: r.success,
    updatedAt: r.updatedAt,
    pointCount: r.points.length,
    attempt: r.attempt,
    expectedUtf8Bytes: expectedBytes,
    actualHttpStatus: status,
  }, id === 'MET-old-issue-new-points' ? 'Reject or stale-classify old model issue, not SUCCESS' : id === 'MET-one-invalid-one-valid' ? 'Retain valid point and expose rejected count with PARTIAL' : 'Preserve HTTP 203 and measure UTF-8 payload bytes', passed);

  if (id === 'MET-HTTP203-unicode') {
    globalThis.fetch = async () => { throw Error('Cache should avoid network'); };
    const again = await m.met.fetchForecast(lat, 112.75);
    const cachePassed = again.servedFromCache === true && again.attempt?.checkedAt === r.attempt?.checkedAt;
    add('MET-cache-provenance', {
      servedFromCache: again.servedFromCache,
      attempt: again.attempt,
      updatedAt: again.updatedAt,
    }, 'Explicit cache origin, no new successful retrieval timestamp', cachePassed);
  }
}

// 3. Manual endpoint validation scenarios
for (const [id, payload, lat] of [
  ['model-manual-wrong-time', { latitude: -7.22, longitude: 112.75, hourly: { time: ['not-a-time'], temperature_2m_cma_grapes_global: [28] } }, -7.22],
  ['model-manual-valid-single-response', { latitude: -7.221, longitude: 112.75, hourly: { time: [new Date(now).toISOString()], temperature_2m: [28] } }, -7.221],
  ['MET-manual-nonproduct', { hello: 'not-a-forecast' }, -7.222],
  ['MET-manual-unusable-timeseries', (() => { const b = metBody(-7.223, 112.75); b.properties.timeseries = [{}]; return b; })(), -7.223],
  ['BMKG-numeric-junk', { Infogempa: { gempa: { DateTime: new Date(now).toISOString(), Coordinates: '-7junk,112junk', Magnitude: 'foo2.1bar', Kedalaman: 'foo10bar' } } }, -7],
]) {
  globalThis.fetch = async () => new Response(JSON.stringify(payload));
  const r = await m.telemetry.pingEndpoint(id.startsWith('model') ? 'open_meteo_model_cma' : id.startsWith('MET') ? 'met_norway_fallback' : 'bmkg_tews', lat, 112.75);

  let passed = false;
  if (id === 'model-manual-valid-single-response') {
    passed = r.status === 'ONLINE';
  } else {
    passed = r.status === 'OFFLINE';
  }

  add(id, { status: r.status, error: r.errorMessage }, id === 'model-manual-valid-single-response' ? 'Valid provider single-model schema accepted with honest forecast coverage' : 'Reject invalid product, not ONLINE', passed);
}

// 4. Radar active viewport & generation scenarios
let source;
const counts = [], mapHandlers = {};
class XYZ {
  constructor() { this.handlers = {}; source = this; }
  on(k, v) { this.handlers[k] = v; }
  un(k) { delete this.handlers[k]; }
  emit(k, event = {}) { this.handlers[k]?.(event); }
}
class TileLayer {
  constructor(opts) { this.source = opts.source; }
  dispose() {}
}
const map = { render() {}, addLayer() {}, removeLayer() {}, on(k, v) { mapHandlers[k] = v; }, un(k) { delete mapHandlers[k]; } };
const cleanup = m.runTileEffect({
  mapRef: { current: map },
  mapReady: true,
  weatherTileLayerRef: { current: null },
  weatherMapOverlay: 'radar',
  weatherRenderMode: 'native',
  rainviewerPath: '/fixture',
  rainviewerHost: 'https://fixture.invalid',
  gibsAvailableTime: null,
  rainviewerSatellitePath: '',
  weatherOverlayOpacity: 0.7,
  setRadarTileLoadError() {},
  setRadarTileCounts: v => counts.push(v),
  XYZ,
  TileLayer,
});

const tileObj = { getKey: () => 'tile-1' };
source.emit('tileloadstart', { tile: tileObj });
source.emit('tileloadend', { tile: tileObj });
mapHandlers.moveend();
const statusAfterMoveend = m.radarStatus(counts.at(-1));
const passedMoveend = statusAfterMoveend === 'MEMUAT'; // Not falsely 'LIVE RADAR' from historical loaded
add('radar-moveend-then-cached-viewport', { counts: counts.at(-1), status: statusAfterMoveend }, 'Recompute active cache coverage; do not fall back to historical loaded/error counts', passedMoveend);

source.emit('tileloaderror', { tile: tileObj });
const statusAfterLateError = m.radarStatus(counts.at(-1));
const passedLateError = counts.at(-1)?.activeError === 0 && statusAfterLateError === 'MEMUAT'; // Old generation error ignored
add('radar-late-old-error-after-moveend', { counts: counts.at(-1), status: statusAfterLateError }, 'Old-generation event cannot affect active viewport', passedLateError);
cleanup();

// 5. GIBS race condition scenario
const gibsUpdates = [], pending = [];
const ctx = {
  gibsController: { current: null },
  setGibsAvailableTime: v => gibsUpdates.push(v),
  setGibsFrameTime() {},
  setGibsMetadataStale() {},
};
globalThis.fetch = async (url, options) => new Promise(resolve => pending.push({ resolve, signal: options.signal }));
const callback = m.gibsCallback(ctx);
callback();
const oldCtrl = ctx.gibsController.current;
callback();

const xml = time => `<Capabilities><Layer><ows:Identifier>Himawari_AHI_Band13_Clean_Infrared</ows:Identifier><Dimension><Default>${time}</Default></Dimension></Layer></Capabilities>`;
pending[1].resolve(new Response(xml('2026-10-04T01:00:00Z')));
await new Promise(r => setTimeout(r, 0));
pending[0].resolve(new Response(xml('2026-10-03T23:00:00Z')));
await new Promise(r => setTimeout(r, 0));

const gibsPassed = oldCtrl.signal.aborted && pending[0].signal.aborted && gibsUpdates.length === 1 && gibsUpdates[0] === '2026-10-04T01:00:00Z';
add('gibs-old-response-overwrites-new', {
  oldOwnedControllerAborted: oldCtrl.signal.aborted,
  oldFetchSignalAborted: pending[0].signal.aborted,
  updates: gibsUpdates,
  finalFrame: gibsUpdates.at(-1),
}, 'Abort signal and generation must belong to request; old response must not replace newer frame', gibsPassed);

globalThis.fetch = originalFetch;

// Save verified results to tests/evidence-stage10-verified.json
writeFileSync(`${repo}/tests/evidence-stage10-verified.json`, JSON.stringify(report, null, 2));

console.log('\n===== STAGE 10 VERIFICATION SUMMARY =====');
let passCount = 0;
for (const c of report.cases) {
  const icon = c.passed ? '✅ PASS' : '❌ FAIL';
  if (c.passed) passCount++;
  console.log(`${icon} [${c.id}]`);
}
console.log(`\nTotal Passed: ${passCount} / ${report.cases.length}`);

if (passCount !== report.cases.length) {
  process.exit(1);
} else {
  console.log('All 15 Stage 10 cases passed cleanly!');
  process.exit(0);
}
