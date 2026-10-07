import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = resolve('.');
const require = createRequire(resolve(repo, 'package.json'));
const { build } = require('esbuild');
const ts = require('typescript');

const modal = readFileSync(resolve(repo, 'apps/web/src/components/common/DataSourceProvenanceModal.tsx'), 'utf8');
const ast = ts.createSourceFile('modal.tsx', modal, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function initializer(name) {
  let result;
  function visit(n) {
    if (ts.isVariableDeclaration(n) && n.name.getText(ast) === name) result = n.initializer.getText(ast);
    ts.forEachChild(n, visit);
  }
  visit(ast);
  if (!result) throw Error('Missing ' + name);
  return result;
}

const mapAst = ts.createSourceFile('maps.tsx', readFileSync(resolve(repo, 'apps/web/src/components/dashboard/views/spatial/MapsView.tsx'), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let radar;
function mapVisit(n) {
  if (ts.isVariableDeclaration(n) && n.name.getText(mapAst) === 'weatherStatusText') radar = n.initializer.getText(mapAst);
  ts.forEachChild(n, mapVisit);
}
mapVisit(mapAst);

const bundle = await build({
  stdin: {
    contents: `
      export { metNorwayService as met } from './apps/web/src/services/metNorwayService.ts';
      export { weatherAggregatorService as weather } from './apps/web/src/services/weatherAggregatorService.ts';
      export { geospatialDataTelemetryService as telemetry } from './apps/web/src/services/geospatialDataTelemetryService.ts';
      export { stacService as stac } from './apps/web/src/services/geospatial/stacService.ts';
      import { DATA_SOURCES_REGISTRY } from './apps/web/src/data/dataSourceRegistry.ts';
      export const modalState = (endpoints) => {
        const getEndpointForItem = ${initializer('getEndpointForItem')};
        const verifiedOnlineCount = ${initializer('verifiedOnlineCount')};
        const liveConnectedCount = ${initializer('liveConnectedCount')};
        return {
          verifiedOnlineCount,
          liveConnectedCount,
          mapped: DATA_SOURCES_REGISTRY.map(s => ({
            id: s.id,
            endpoint: getEndpointForItem(s.id)?.id,
            status: getEndpointForItem(s.id)?.status,
            credentialDescriptor: s.apiKeyStatus
          }))
        };
      };
      export const radarStatus = (radarTileCounts) => {
        const weatherMapOverlay = 'radar', weatherRenderMode = 'native', radarMetadataStale = false, radarFrameTime = Date.now() / 1000;
        return (${radar});
      };
    `,
    resolveDir: repo,
    loader: 'ts'
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
  define: { 'import.meta.env': '{}' }
});

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const m = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].contents).toString('base64'));
const originalFetch = globalThis.fetch;

const result = {
  checkedAt: new Date().toISOString(),
  scope: 'Independent actual-source Stage 9 verification; synthetic responses are test fixtures, not earth observations',
  cases: []
};
const add = (id, actual, expected, pass) => result.cases.push({ id, actual, expected, pass });

const now = Date.now(), epoch = Math.floor(now / 1000), hour = epoch - epoch % 3600;
const point = (offset = 0) => ({
  time: new Date(now + offset).toISOString(),
  data: {
    instant: {
      details: {
        air_temperature: 17,
        relative_humidity: 81,
        wind_speed: 4,
        wind_from_direction: 140,
        cloud_area_fraction: 93,
        air_pressure_at_sea_level: 1005
      }
    }
  }
});
const metBody = (lat, lng, offset = 0) => ({
  geometry: { type: 'Point', coordinates: [lng, lat, 0] },
  properties: {
    meta: {
      updated_at: new Date(now).toISOString(),
      units: {
        air_temperature: 'celsius',
        relative_humidity: '%',
        wind_speed: 'm/s',
        wind_from_direction: 'degrees',
        cloud_area_fraction: '%',
        air_pressure_at_sea_level: 'hPa'
      }
    },
    timeseries: [point(offset)]
  }
});

const weatherBody = (lat, lng) => ({
  latitude: lat,
  longitude: lng,
  timezone: 'UTC',
  current: {
    time: epoch,
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
    wind_gusts_10m: 15
  },
  hourly: { time: [hour] },
  daily: { time: [] }
});

// 1. Radar Viewport Tile Evaluation
for (const [id, counts, expected, targetStatus] of [
  ['radar-old100-good-new20-all-fail', { requested: 120, loaded: 100, error: 20, activeRequested: 20, activeLoaded: 0, activeError: 20 }, 'UNAVAILABLE for current viewport; historical successes cannot make it PARTIAL', 'UNAVAILABLE'],
  ['radar-active1-good2-failed', { requested: 3, loaded: 1, error: 2 }, 'PARTIAL, since one active tile is usable', 'PARSIAL'],
  ['radar-old20-fail-new3-all-good', { requested: 23, loaded: 3, error: 20, activeRequested: 3, activeLoaded: 3, activeError: 0 }, 'LIVE for three usable active tiles; historical errors cannot make current viewport unavailable', 'LIVE RADAR'],
]) {
  const status = m.radarStatus(counts);
  add(id, { counts, status }, expected, status === targetStatus);
}

// 2. MET Norway Strict Contract Validation
for (const [id, lat, lng, body] of [
  ['MET-missing-geometry', -7.111, 112.71, { properties: metBody(-7.111, 112.71).properties }],
  ['MET-incompatible-units', -7.112, 112.72, (() => { const b = metBody(-7.112, 112.72); b.properties.meta.units.air_temperature = 'fahrenheit'; b.properties.meta.units.wind_speed = 'km/h'; return b; })()],
  ['MET-malformed-updatedAt', -7.113, 112.73, (() => { const b = metBody(-7.113, 112.73); b.properties.meta.updated_at = 'not-a-date'; return b; })()],
]) {
  globalThis.fetch = async () => new Response(JSON.stringify(body));
  const r = await m.met.fetchForecast(lat, lng);
  const pass = r.success === false && r.current === null;
  add(id, { success: r.success, updatedAt: r.updatedAt, current: r.current, error: r.error }, 'Reject missing location / invalid provenance / incompatible units; do not silently relabel them', pass);
}

// 3. Fallback Without Fabricated Data
for (const [id, lat, offset, testCase] of [
  ['fallback-no-current', -7.121, 86400000, 'no-current'],
  ['fallback-valid-current-missing-precipitation', -7.122, 0, 'missing-rain']
]) {
  globalThis.fetch = async url => {
    if (String(url).startsWith('https://api.met.no/')) return new Response(JSON.stringify(metBody(lat, 112.75, offset)), { headers: { 'Content-Type': 'application/json' } });
    throw Error('Independent primary outage fixture');
  };
  try {
    const w = await m.weather.fetchConsensusWeather(lat, 112.75, id, true);
    let pass = false;
    if (testCase === 'no-current') {
      pass = w.current === null;
    } else {
      pass = w.current !== null && w.current.precipitation === null && w.current.windGusts === null && w.current.pressure === null;
    }
    add(id, {
      dataStatus: w.dataStatus,
      dataTime: w.dataTime,
      elevation: w.elevation,
      current: w.current,
      hourly: w.hourly,
      sources: w.sources,
      attempts: w.sourceFetches
    }, 'No manufactured current, feels-like/min/max, clear sky, precipitation, gusts, pressure substitution or fixed latency/bytes/status', pass);
  } catch (e) {
    add(id, { error: e.message }, 'Reject unavailable current without invented measurements', testCase === 'no-current');
  }
}

// 4. Preserving Successful Models & Air Quality
{
  const lat = -7.123, lng = 112.75;
  globalThis.fetch = async url => {
    const u = new URL(url);
    if (u.hostname === 'api.met.no') return new Response(JSON.stringify(metBody(lat, lng)));
    if (u.hostname.includes('air-quality')) return new Response(JSON.stringify({ latitude: lat, longitude: lng, current: { time: epoch, pm2_5: 15, pm10: 20, ozone: 30 } }));
    const models = u.searchParams.get('models');
    if (models) {
      const h = { time: [hour] };
      for (const id of models.split(',')) h[`temperature_2m_${id}`] = [28];
      return new Response(JSON.stringify({ latitude: lat, longitude: lng, hourly: h }));
    }
    throw Error('Only primary weather unavailable in independent fixture');
  };
  const w = await m.weather.fetchConsensusWeather(lat, lng, 'fallback-preserve-other-successful-sources', true);
  const pass = w.modelComparison.length > 0 && w.current?.pm25 === 15;
  add('fallback-preserve-other-successful-sources', {
    modelCount: w.modelComparison.length,
    pm25: w.current?.pm25,
    attempts: w.sourceFetches,
    sources: w.sources
  }, 'Retain successful, aligned model and CAMS inputs when only primary weather fails', pass);
}

// 5. BMKG & FIRMS Telemetry Validation
for (const [id, payload, expectedTarget] of [
  ['BMKG-invalid-coordinates-magnitude-depth', { Infogempa: { gempa: { DateTime: new Date(now).toISOString(), Coordinates: '999,999', Magnitude: 'abc', Kedalaman: 'nonsense' } } }, 'OFFLINE'],
  ['BMKG-valid-nonzero-offset', { Infogempa: { gempa: { DateTime: new Date(Date.UTC(2026, 9, 3, 23, 30)).toISOString().replace('2026-10-03T23:30:00.000Z', '2026-10-04T06:30:00+07:00'), Coordinates: '-7.2,112.7', Magnitude: '2.1', Kedalaman: '10 km' } } }, 'ONLINE'],
  ['FIRMS-garbage-acquisition', { success: true, data: [{ latitude: -7, longitude: 112, frp: 5, acq_date: 'not-a-date', acq_time: '9999' }] }, 'OFFLINE'],
  ['FIRMS-date-only-no-time', { success: true, data: [{ latitude: -7, longitude: 112, frp: 5, acq_date: new Date(now).toISOString().slice(0, 10) }] }, 'OFFLINE'],
  ['FIRMS-mixed-valid-invalid', { success: true, data: [{ latitude: -7, longitude: 112, frp: 5, acq_date: new Date(now).toISOString().slice(0, 10), acq_time: '1200' }, { latitude: 999, longitude: 112, frp: 5, acq_date: new Date(now).toISOString().slice(0, 10), acq_time: '1200' }] }, 'PARTIAL'],
]) {
  globalThis.fetch = async () => new Response(JSON.stringify(payload));
  const r = await m.telemetry.pingEndpoint(id.startsWith('BMKG') ? 'bmkg_tews' : 'nasa_firms', -7, 112);
  const pass = r.status === expectedTarget || (expectedTarget === 'PARTIAL' && r.status === 'DEGRADED');
  add(id, { status: r.status, error: r.errorMessage }, id === 'BMKG-valid-nonzero-offset' ? 'Accept legitimate local date +07:00 after strict calendar validation' : id === 'FIRMS-mixed-valid-invalid' ? 'Preserve valid records and show PARTIAL with rejected count' : 'Reject invalid product without ONLINE', pass);
}

// 6. Model Isolation & Strict Location Enforcement on Retry
for (const [id, broken, wrongLocation, targetSuccess] of [
  ['model-breaker-is-CMA', 'cma_grapes_global', false, true],
  ['model-split-wrong-location', 'bom_access_global', true, false],
]) {
  const lat = id === 'model-breaker-is-CMA' ? -7.131 : -7.132, lng = 112.75, requests = [];
  globalThis.fetch = async url => {
    const u = new URL(url), models = u.searchParams.get('models');
    if (models) {
      requests.push(models);
      if (models.split(',').includes(broken)) return new Response(JSON.stringify({ error: true, reason: `Fixture: ${broken} unavailable` }), { status: 400 });
      const h = { time: [hour] };
      for (const name of models.split(',')) h[`temperature_2m_${name}`] = [28];
      return new Response(JSON.stringify({ latitude: wrongLocation ? 51.5 : lat, longitude: wrongLocation ? -0.1 : lng, hourly: h }));
    }
    if (u.hostname.includes('air-quality')) return new Response(JSON.stringify({ latitude: lat, longitude: lng, current: { time: epoch, pm2_5: 15, pm10: 20, ozone: 30 } }));
    return new Response(JSON.stringify(weatherBody(lat, lng)));
  };
  try {
    const w = await m.weather.fetchConsensusWeather(lat, lng, id, true);
    const pass = targetSuccess ? (w.modelComparison.length > 0) : (w.modelComparison.length === 0);
    add(id, { modelCount: w.modelComparison.length, requests, attempts: w.sourceFetches }, wrongLocation ? 'Reject London model grid for Indonesian query' : 'Recover other valid models when ANY model fails; do not always drop BoM', pass);
  } catch (e) {
    add(id, { error: e.message, requests }, 'Preserve usable models without substituting unrelated locations', !targetSuccess);
  }
}

// 7. Modal State & Stream Count Provenance
const eps = m.telemetry.getEndpoints().map(e => ({ ...e, status: 'UNCHECKED' }));
const initialModal = m.modalState(eps);
add('modal-initial-state', initialModal, 'Zero verified streams when no endpoint has been checked; credentials UNKNOWN until backend reports', initialModal.verifiedOnlineCount === 0 && initialModal.liveConnectedCount === 0);

const offlineModal = m.modalState(eps.map(e => ({ ...e, status: 'OFFLINE' })));
add('modal-all-endpoints-offline', offlineModal, 'Zero verified streams when every endpoint is offline', offlineModal.verifiedOnlineCount === 0 && offlineModal.liveConnectedCount === 0);

const sharedModelModal = m.modalState(eps.map(e => ({ ...e, status: e.id === 'open_meteo_models' ? 'ONLINE' : 'UNCHECKED' })));
const modelMappings = sharedModelModal.mapped.filter(i => ['bom-access-maritime', 'cma-grapes-asia', 'jma-seamless-japan'].includes(i.id));
const passModelSeparation = modelMappings.every(m => m.status === 'UNCHECKED' || m.endpoint !== 'open_meteo_models');
add('modal-shared-model-success', sharedModelModal, 'A combined request success must not assert individual BoM/CMA/JMA online without each product validation', passModelSeparation);

// 8. STAC Resolver Identity Verification
globalThis.fetch = async () => new Response(JSON.stringify({
  id: 'DIFFERENT_SCENE',
  collection: 'landsat-c2-l2',
  properties: { datetime: '2000-01-01T00:00:00Z' },
  assets: { lwir11: { href: 'https://fixture.invalid/wrong-scene.tif' } }
}));
try {
  const res = await m.stac.resolveSceneAssetUrl('EXPECTED_SCENE', 'lwir11', 's3://bucket/thermal.tif');
  add('resolver-wrong-scene', res, 'Reject returned item ID/time mismatch before selecting an asset', false);
} catch (e) {
  add('resolver-wrong-scene', { error: e.message }, 'Reject returned item ID/time mismatch', true);
}

globalThis.fetch = originalFetch;

const passedCount = result.cases.filter(c => c.pass).length;
const totalCount = result.cases.length;

writeFileSync(resolve(repo, 'tests/evidence-stage9-verified.json'), JSON.stringify(result, null, 2));

console.log(JSON.stringify({
  summary: `${passedCount}/${totalCount} cases PASSED`,
  allPassed: passedCount === totalCount,
  cases: result.cases.map(c => ({ id: c.id, pass: c.pass }))
}, null, 2));

if (passedCount !== totalCount) {
  process.exit(1);
}
