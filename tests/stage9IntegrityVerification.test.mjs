import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
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

test('Radar viewport status evaluates active tiles without error > loaded bias', () => {
  assert.equal(
    m.radarStatus({ requested: 120, loaded: 100, error: 20, activeRequested: 20, activeLoaded: 0, activeError: 20 }),
    'UNAVAILABLE'
  );
  assert.equal(
    m.radarStatus({ requested: 3, loaded: 1, error: 2 }),
    'PARSIAL'
  );
  assert.equal(
    m.radarStatus({ requested: 23, loaded: 3, error: 20, activeRequested: 3, activeLoaded: 3, activeError: 0 }),
    'LIVE RADAR'
  );
});

test('MET Norway rejects missing geometry, incompatible units, and malformed updatedAt', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ properties: metBody(-7.111, 112.71).properties }));
  const r1 = await m.met.fetchForecast(-7.111, 112.71);
  assert.equal(r1.success, false);
  assert.equal(r1.current, null);

  const badUnits = metBody(-7.112, 112.72);
  badUnits.properties.meta.units.air_temperature = 'fahrenheit';
  badUnits.properties.meta.units.wind_speed = 'km/h';
  globalThis.fetch = async () => new Response(JSON.stringify(badUnits));
  const r2 = await m.met.fetchForecast(-7.112, 112.72);
  assert.equal(r2.success, false);
  assert.equal(r2.current, null);

  const badDate = metBody(-7.113, 112.73);
  badDate.properties.meta.updated_at = 'not-a-date';
  globalThis.fetch = async () => new Response(JSON.stringify(badDate));
  const r3 = await m.met.fetchForecast(-7.113, 112.73);
  assert.equal(r3.success, false);
  assert.equal(r3.current, null);
});

test('MET Norway fallback produces null current on future-only forecasts and retains null for missing fields', async () => {
  globalThis.fetch = async url => {
    if (String(url).startsWith('https://api.met.no/')) return new Response(JSON.stringify(metBody(-7.121, 112.75, 86400000)), { headers: { 'Content-Type': 'application/json' } });
    throw Error('Independent primary outage fixture');
  };
  const w1 = await m.weather.fetchConsensusWeather(-7.121, 112.75, 'test-no-current', true);
  assert.equal(w1.current, null);

  globalThis.fetch = async url => {
    if (String(url).startsWith('https://api.met.no/')) return new Response(JSON.stringify(metBody(-7.122, 112.75, 0)), { headers: { 'Content-Type': 'application/json' } });
    throw Error('Independent primary outage fixture');
  };
  const w2 = await m.weather.fetchConsensusWeather(-7.122, 112.75, 'test-missing-rain', true);
  assert.notEqual(w2.current, null);
  assert.equal(w2.current.precipitation, null);
  assert.equal(w2.current.windGusts, null);
  assert.equal(w2.current.pressure, null);
});

test('Fallback preserves successful models and CAMS air quality when primary weather fails', async () => {
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
  assert.ok(w.modelComparison.length > 0);
  assert.equal(w.current?.pm25, 15);
  assert.ok(w.sources.some(s => s.id === 'cams'));
});

test('BMKG and FIRMS validators parse actual values and handle offsets and mixed records', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ Infogempa: { gempa: { DateTime: new Date(now).toISOString(), Coordinates: '999,999', Magnitude: 'abc', Kedalaman: 'nonsense' } } }));
  const rBmkgBad = await m.telemetry.pingEndpoint('bmkg_tews', -7, 112);
  assert.equal(rBmkgBad.status, 'OFFLINE');

  globalThis.fetch = async () => new Response(JSON.stringify({ Infogempa: { gempa: { DateTime: new Date(Date.UTC(2026, 9, 3, 23, 30)).toISOString().replace('2026-10-03T23:30:00.000Z', '2026-10-04T06:30:00+07:00'), Coordinates: '-7.2,112.7', Magnitude: '2.1', Kedalaman: '10 km' } } }));
  const rBmkgGood = await m.telemetry.pingEndpoint('bmkg_tews', -7, 112);
  assert.equal(rBmkgGood.status, 'ONLINE');

  globalThis.fetch = async () => new Response(JSON.stringify({ success: true, data: [{ latitude: -7, longitude: 112, frp: 5, acq_date: 'not-a-date', acq_time: '9999' }] }));
  const rFirmsGarbage = await m.telemetry.pingEndpoint('nasa_firms', -7, 112);
  assert.equal(rFirmsGarbage.status, 'OFFLINE');

  globalThis.fetch = async () => new Response(JSON.stringify({ success: true, data: [{ latitude: -7, longitude: 112, frp: 5, acq_date: new Date(now).toISOString().slice(0, 10), acq_time: '1200' }, { latitude: 999, longitude: 112, frp: 5, acq_date: new Date(now).toISOString().slice(0, 10), acq_time: '1200' }] }));
  const rFirmsMixed = await m.telemetry.pingEndpoint('nasa_firms', -7, 112);
  assert.equal(rFirmsMixed.status, 'DEGRADED');
});

test('Model recovery dynamically isolates broken models and rejects wrong location on retry', async () => {
  const lat = -7.131, lng = 112.75;
  globalThis.fetch = async url => {
    const u = new URL(url), models = u.searchParams.get('models');
    if (models) {
      if (models.split(',').includes('cma_grapes_global')) {
        return new Response(JSON.stringify({ error: true, reason: 'Fixture: cma_grapes_global unavailable' }), { status: 400 });
      }
      const h = { time: [hour] };
      for (const name of models.split(',')) h[`temperature_2m_${name}`] = [28];
      return new Response(JSON.stringify({ latitude: lat, longitude: lng, hourly: h }));
    }
    if (u.hostname.includes('air-quality')) return new Response(JSON.stringify({ latitude: lat, longitude: lng, current: { time: epoch, pm2_5: 15, pm10: 20, ozone: 30 } }));
    return new Response(JSON.stringify(weatherBody(lat, lng)));
  };
  const w = await m.weather.fetchConsensusWeather(lat, lng, 'test-cma-isolate', true);
  assert.equal(w.modelComparison.length, 8);
  assert.ok(!w.modelComparison.some(m => m.modelId === 'cma_grapes_global'));
  assert.ok(w.modelComparison.some(m => m.modelId === 'bom_access_global'));

  globalThis.fetch = async url => {
    const u = new URL(url), models = u.searchParams.get('models');
    if (models) {
      if (models.split(',').includes('bom_access_global')) {
        return new Response(JSON.stringify({ error: true, reason: 'Fixture: bom_access_global unavailable' }), { status: 400 });
      }
      const h = { time: [hour] };
      for (const name of models.split(',')) h[`temperature_2m_${name}`] = [28];
      return new Response(JSON.stringify({ latitude: 51.5, longitude: -0.1, hourly: h }));
    }
    if (u.hostname.includes('air-quality')) return new Response(JSON.stringify({ latitude: lat, longitude: lng, current: { time: epoch, pm2_5: 15, pm10: 20, ozone: 30 } }));
    return new Response(JSON.stringify(weatherBody(lat, lng)));
  };
  const wLondon = await m.weather.fetchConsensusWeather(lat, lng, 'test-wrong-location', true);
  assert.equal(wLondon.modelComparison.length, 0);
});

test('Modal provenance shows 0 verified streams on initial/offline state and separates model endpoints', () => {
  const eps = m.telemetry.getEndpoints().map(e => ({ ...e, status: 'UNCHECKED' }));
  const initialModal = m.modalState(eps);
  assert.equal(initialModal.verifiedOnlineCount, 0);
  assert.equal(initialModal.liveConnectedCount, 0);

  const offlineModal = m.modalState(eps.map(e => ({ ...e, status: 'OFFLINE' })));
  assert.equal(offlineModal.verifiedOnlineCount, 0);
  assert.equal(offlineModal.liveConnectedCount, 0);

  const sharedModelModal = m.modalState(eps.map(e => ({ ...e, status: e.id === 'open_meteo_models' ? 'ONLINE' : 'UNCHECKED' })));
  const modelMappings = sharedModelModal.mapped.filter(i => ['bom-access-maritime', 'cma-grapes-asia', 'jma-seamless-japan'].includes(i.id));
  assert.ok(modelMappings.every(m => m.status === 'UNCHECKED' || m.endpoint !== 'open_meteo_models'));
});

test('STAC asset resolver rejects mismatching returned item ID', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({
    id: 'DIFFERENT_SCENE',
    collection: 'landsat-c2-l2',
    properties: { datetime: '2000-01-01T00:00:00Z' },
    assets: { lwir11: { href: 'https://fixture.invalid/wrong-scene.tif' } }
  }));
  await assert.rejects(
    async () => m.stac.resolveSceneAssetUrl('EXPECTED_SCENE', 'lwir11', 's3://bucket/thermal.tif'),
    /DIFFERENT_SCENE/
  );
  globalThis.fetch = originalFetch;
});
