import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const repo = 'D:/vscode/Harmony';
const require = createRequire(`${repo}/package.json`);
const { build } = require('esbuild');
const ts = require('typescript');

const paths = [
  'apps/web/src/services/geospatialDataTelemetryService.ts',
  'apps/web/src/services/weatherDataIntegrity.ts',
  'apps/web/src/services/geospatial/stacService.ts',
  'apps/web/src/services/geospatial/rasterReaderService.ts',
  'apps/web/src/services/geospatial/lstService.ts',
  'apps/web/src/services/metNorwayService.ts',
  'apps/web/src/services/weatherAggregatorService.ts',
  'apps/web/src/data/dataSourceRegistry.ts',
  'apps/web/src/components/common/DataSourceProvenanceModal.tsx',
  'apps/web/src/components/dashboard/views/spatial/MapsView.tsx',
  'apps/web/src/components/dashboard/views/spatial/studio/GeospatialRemoteSensingTab.tsx',
];

function arrow(p, name) {
  const source = readFileSync(`${repo}/${p}`, 'utf8');
  const ast = ts.createSourceFile('in.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found;
  function visit(n) {
    if (ts.isVariableDeclaration(n) && n.name.getText(ast) === name) {
      found = n.initializer.getText(ast);
    }
    ts.forEachChild(n, visit);
  }
  visit(ast);
  if (!found) throw Error(`Missing ${name}`);
  return found;
}

const bundle = await build({
  stdin: {
    contents: `
import { lstService } from './apps/web/src/services/geospatial/lstService.ts';
import { aoiService } from './apps/web/src/services/geospatial/aoiService.ts';
import { stacService } from './apps/web/src/services/geospatial/stacService.ts';
export { stacService, lstService };
export { geospatialDataTelemetryService as telemetry } from './apps/web/src/services/geospatialDataTelemetryService.ts';
export { metNorwayService } from './apps/web/src/services/metNorwayService.ts';
export { weatherAggregatorService } from './apps/web/src/services/weatherAggregatorService.ts';
export { DATA_SOURCES_REGISTRY as registry } from './apps/web/src/data/dataSourceRegistry.ts';
export const runLST = ctx => {
  const { lat, lng, activeAOI, selectedPreset, selectedStacScene, setIsProcessingLST, setLstEnvelope } = ctx;
  return (${arrow(paths[10], 'handleRunLSTAnalysis')})();
};
export const radarStatus = ctx => {
  const { weatherMapOverlay, weatherRenderMode, radarMetadataStale, radarFrameTime, radarTileCounts } = ctx;
  return (${arrow(paths[9], 'weatherStatusText')});
};
    `,
    resolveDir: repo,
    loader: 'ts',
    sourcefile: 'audit-stage8.ts',
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
  scope: 'Independent actual-source fault injection verification for Stage 8',
  cases: [],
};

const add = (id, actual, required, passed) => {
  report.cases.push({ id, actual, required, passed });
};

// 1. Missing metadata checks
for (const [id, endpoint, payload] of [
  ['air-without-location', 'open_meteo_air', { current: { time: Math.floor(Date.now() / 1000), pm2_5: 15, pm10: 20, ozone: 30 } }],
  ['elevation-without-location', 'elevation_dem', { results: [{ elevation: 400 }] }],
  ['BMKG-impossible-calendar', 'bmkg_tews', { Infogempa: { gempa: { DateTime: '2026-02-30T00:00:00Z' } } }],
  ['BMKG-date-without-parameters', 'bmkg_tews', { Infogempa: { gempa: { DateTime: new Date().toISOString() } } }],
  ['FIRMS-without-acquisition-time', 'nasa_firms', { success: true, data: [{ latitude: -7, longitude: 112, frp: 5 }] }],
]) {
  globalThis.fetch = async () => new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json' } });
  const r = await m.telemetry.pingEndpoint(endpoint, -7, 112);
  const passed = r.status !== 'ONLINE';
  add(id, { status: r.status, error: r.errorMessage ?? null }, 'Reject unusable/missing product metadata; do not claim data ONLINE', passed);
}
globalThis.fetch = originalFetch;

// 2. Radar tile active status checks
for (const [id, counts, required, expectedStatus] of [
  ['radar-old2-success-new3-all-fail', { requested: 5, loaded: 2, error: 3 }, 'UNAVAILABLE for active viewport with all three needed tiles failed', 'UNAVAILABLE'],
  ['radar-active10-good10-failed', { requested: 20, loaded: 10, error: 10 }, 'PARSIAL when ten needed active tiles are usable and ten fail', 'PARSIAL'],
  ['radar-active15-good15-failed', { requested: 30, loaded: 15, error: 15 }, 'PARSIAL when fifteen needed active tiles are usable and fifteen fail', 'PARSIAL'],
]) {
  const actual = m.radarStatus({
    weatherMapOverlay: 'radar',
    weatherRenderMode: 'native',
    radarMetadataStale: false,
    radarFrameTime: Date.now() / 1000,
    radarTileCounts: counts,
  });
  add(id, actual, required, actual === expectedStatus);
}

// 3. Actual LST handler calling resolver for S3 path
let resolverCalls = 0;
const savedResolver = m.stacService.resolveSceneAssetUrl;
m.stacService.resolveSceneAssetUrl = async (...args) => {
  resolverCalls++;
  return { href: 'https://fixture.invalid/resolved.tif', isSigned: true, resolvedProvider: 'independent spy' };
};
const fetched = [], states = [];
globalThis.fetch = async url => {
  fetched.push(String(url));
  throw Error('Independent network fixture: S3 is not browser HTTP');
};
m.lstService.resetRequestContext();
try {
  await m.runLST({
    lat: -7.25,
    lng: 112.75,
    activeAOI: null,
    selectedPreset: 'EMPTY',
    selectedStacScene: {
      id: 'LC09_L2SP_118065_20260926_02_T1',
      collection: 'landsat-c2-l2',
      platform: 'landsat-9',
      datetime: '2026-09-26T02:35:49Z',
      assets: {
        lwir11: { href: 's3://usgs-landsat/collection02/thermal.tif' },
        qa_pixel: { href: 's3://usgs-landsat/collection02/qa.tif' },
      },
    },
    setIsProcessingLST: () => {},
    setLstEnvelope: v => states.push(v),
  });
  const schemes = fetched.map(u => u.split(':')[0]);
  const passed = resolverCalls > 0 && schemes.length === 2 && schemes.every(s => s === 'https') && states.at(-1)?.dataStatus === 'UNAVAILABLE';
  add(
    'actual-LST-handler-S3-path',
    { resolverCalls, fetchedSchemes: schemes, status: states.at(-1)?.dataStatus, reason: states.at(-1)?.reason?.code },
    'UI must call resolver and fetch resolved HTTP asset URLs; helper-only success is insufficient',
    passed
  );
} catch (e) {
  add('actual-LST-handler-S3-path', { error: e.message, resolverCalls }, 'LST resolver wired into actual handler', false);
}
m.stacService.resolveSceneAssetUrl = savedResolver;
globalThis.fetch = originalFetch;

// 4. MET Norway physical and temporal validation
const validPoint = (time, overrides = {}) => ({
  time,
  data: {
    instant: {
      details: {
        air_temperature: 29.5,
        relative_humidity: 65,
        wind_speed: 5.5,
        wind_from_direction: 110,
        cloud_area_fraction: 50,
        air_pressure_at_sea_level: 1010,
        ...overrides,
      },
    },
    next_1_hours: {
      details: { precipitation_amount: 0.1 },
      summary: { symbol_code: 'partlycloudy_day' },
    },
  },
});

for (const [id, lat, body] of [
  ['MET-only-obsolete-point', -7.01, { properties: { meta: { updated_at: '2020-01-01T00:00:00Z' }, timeseries: [validPoint('2020-01-01T00:00:00Z')] } }],
  [
    'MET-physically-invalid',
    -7.02,
    {
      geometry: { type: 'Point', coordinates: [112.75, -7.02, 0] },
      properties: {
        meta: { updated_at: new Date().toISOString() },
        timeseries: [validPoint(new Date().toISOString(), { relative_humidity: 999, wind_speed: -5, wind_from_direction: 999, cloud_area_fraction: 300, air_pressure_at_sea_level: -10 })],
      },
    },
  ],
  ['MET-wrong-location-missing-updatedAt', -7.03, { geometry: { type: 'Point', coordinates: [0, 0, 0] }, properties: { timeseries: [validPoint(new Date().toISOString())] } }],
]) {
  globalThis.fetch = async () => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
  const r = await m.metNorwayService.fetchForecast(lat, 112.75);
  const passed = r.success === false || r.current === null;
  add(
    id,
    {
      success: r.success,
      updatedAt: r.updatedAt,
      current: r.current && {
        time: r.current.time,
        humidity: r.current.relativeHumidityPct,
        windSpeedKmh: r.current.windSpeedKmh,
        cloud: r.current.cloudAreaFractionPct,
        pressure: r.current.airPressureSeaLevelHpa,
      },
      error: r.error ?? null,
    },
    'Reject invalid/mismatched data, or classify historical data without using as current; do not invent updatedAt',
    passed
  );
}

// 5. Weather fallback integration
let metCalls = 0;
const savedMet = m.metNorwayService.fetchForecast;
m.metNorwayService.fetchForecast = async () => {
  metCalls++;
  return { success: true, points: [], current: null };
};
globalThis.fetch = async () => {
  throw Error('Independent primary weather outage');
};
try {
  await m.weatherAggregatorService.fetchConsensusWeather(-7.044, 112.755, 'independent fallback outage test', true);
  add('actual-weather-fallback', { metCalls, returned: true }, 'Invoke configured suitable fallback when primary fails', metCalls > 0);
} catch (e) {
  add('actual-weather-fallback', { metCalls, error: e.message }, 'Configured weather fallback must be connected to the real consumer; preserve source failure records', metCalls > 0);
}
m.metNorwayService.fetchForecast = savedMet;
globalThis.fetch = originalFetch;

// 6. One model breaks combined request -> model split recovery
const calls = [];
const now = Math.floor(Date.now() / 1000);
const hour = now - (now % 3600);
const current = {
  time: now,
  interval: 900,
  temperature_2m: 29,
  relative_humidity_2m: 60,
  apparent_temperature: 31,
  precipitation: 0,
  weather_code: 1,
  cloud_cover: 50,
  surface_pressure: 1010,
  wind_speed_10m: 10,
  wind_direction_10m: 90,
  wind_gusts_10m: 15,
};
globalThis.fetch = async url => {
  const u = new URL(url);
  const models = u.searchParams.get('models');
  calls.push({ modelQuery: models, kind: u.hostname.includes('air-quality') ? 'air' : 'forecast' });
  if (models) {
    if (models.split(',').includes('bom_access_global')) {
      return new Response(JSON.stringify({ error: true, reason: 'Fixture: BoM unavailable' }), { status: 400 });
    }
    const h = { time: [hour] };
    for (const id of models.split(',')) h[`temperature_2m_${id}`] = [28];
    return new Response(JSON.stringify({ latitude: -7.055, longitude: 112.755, hourly: h }));
  }
  if (u.hostname.includes('air-quality')) {
    return new Response(JSON.stringify({ latitude: -7.055, longitude: 112.755, current: { time: now, pm2_5: 15, pm10: 20, ozone: 30 } }));
  }
  const hourly = { time: [hour] };
  for (const [key, val] of Object.entries(current)) {
    if (!['time', 'interval'].includes(key)) hourly[key] = [val];
  }
  return new Response(JSON.stringify({ latitude: -7.055, longitude: 112.755, timezone: 'UTC', current, hourly, daily: { time: [] } }));
};
try {
  const w = await m.weatherAggregatorService.fetchConsensusWeather(-7.055, 112.755, 'independent model isolation test', true);
  const passed = w.modelComparison.length === 8 && calls.filter(c => c.modelQuery).length >= 2;
  add(
    'one-model-breaks-combined-request',
    {
      modelCount: w.modelComparison.length,
      modelRequests: calls.filter(c => c.modelQuery),
      attempts: w.sourceFetches.map(a => ({ id: a.id, status: a.status, error: a.error })),
    },
    'Retain eight usable models by bounded retry/splitting; a combined request failing on BoM must not silently abandon all other models',
    passed
  );
} catch (e) {
  add('one-model-breaks-combined-request', { error: e.message, calls }, 'Recover valid model sources while keeping failed attempt visible', false);
}
globalThis.fetch = originalFetch;

report.registry = {
  fixedOperationalCount: m.registry.filter(s => s.isLiveConnected).length,
  markedConfigured: m.registry.filter(s => s.apiKeyRequired).map(s => ({ id: s.id, apiKeyStatus: s.apiKeyStatus })),
};

writeFileSync(`${repo}/tests/evidence-stage8-verified.json`, JSON.stringify(report, null, 2));

console.log('=== STAGE 8 VERIFICATION RESULTS ===');
let passCount = 0;
for (const c of report.cases) {
  const mark = c.passed ? 'PASS' : 'FAIL';
  if (c.passed) passCount++;
  console.log(`[${mark}] ${c.id}`);
  if (!c.passed) {
    console.log('   Actual:', JSON.stringify(c.actual));
    console.log('   Required:', c.required);
  }
}
console.log(`Total: ${passCount} / ${report.cases.length} passed.`);
if (passCount !== report.cases.length) {
  process.exit(1);
}
