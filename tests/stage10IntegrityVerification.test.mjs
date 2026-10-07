import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = resolve('.');
const require = createRequire(resolve(repo, 'package.json'));
const { build } = require('esbuild');
const ts = require('typescript');

const mapPath = 'apps/web/src/components/dashboard/views/spatial/MapsView.tsx';
const modalPath = 'apps/web/src/components/dashboard/views/spatial/GeospatialWeatherModal.tsx';

function sourceAst(p) {
  return ts.createSourceFile('source.tsx', readFileSync(resolve(repo, p), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
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

const bundle = await build({
  stdin: {
    contents: `
import { readWeatherTileCoverage } from './apps/web/src/services/geospatial/weatherTileCoverage.ts';
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

test('Stage 10 - fallback hourly null consumer: conditionCode, pressure, and totalRain remain null/unavailable', async () => {
  const lat = -7.201;
  globalThis.fetch = async url => {
    const u = new URL(url), models = u.searchParams.get('models');
    if (u.hostname === 'api.met.no') return new Response(JSON.stringify(metBody(lat, 112.75)));
    if (u.hostname.includes('air-quality')) return new Response(JSON.stringify({ latitude: lat, longitude: 112.75, current: { time: epoch, pm2_5: 15, pm10: 20, ozone: 30 } }));
    if (models) {
      const h = { time: [hour] };
      for (const mid of models.split(',')) h[`temperature_2m_${mid}`] = [28];
      return new Response(JSON.stringify({ latitude: lat, longitude: 112.75, hourly: h }));
    }
    throw Error('Independent primary outage fixture');
  };

  const w = await m.weather.fetchConsensusWeather(lat, 112.75, 'fallback-hourly-null-consumer', true);
  assert.equal(w.hourly[0]?.conditionCode, null, 'hourly[0].conditionCode must be null when symbol is missing');
  assert.equal(w.hourly[0]?.pressure, null, 'hourly[0].pressure must be null when surface pressure is not measured');
  const summary = m.chartSummary(w.hourly);
  assert.equal(summary.totalRain, 'Tidak tersedia', 'totalRain must be Tidak tersedia when all rain is null');
});

test('Stage 10 - fallback old air: stale air quality (>24h) is rejected from current and attempt marked FAILED', async () => {
  const lat = -7.202;
  const oldAirEpoch = epoch - 86400 * 30; // 30 days old
  globalThis.fetch = async url => {
    const u = new URL(url), models = u.searchParams.get('models');
    if (u.hostname === 'api.met.no') return new Response(JSON.stringify(metBody(lat, 112.75)));
    if (u.hostname.includes('air-quality')) return new Response(JSON.stringify({ latitude: lat, longitude: 112.75, current: { time: oldAirEpoch, pm2_5: 15, pm10: 20, ozone: 30 } }));
    if (models) {
      const h = { time: [hour] };
      for (const mid of models.split(',')) h[`temperature_2m_${mid}`] = [28];
      return new Response(JSON.stringify({ latitude: lat, longitude: 112.75, hourly: h }));
    }
    throw Error('Independent primary outage fixture');
  };

  const w = await m.weather.fetchConsensusWeather(lat, 112.75, 'fallback-old-air', true);
  assert.equal(w.current?.pm25, null, 'Stale PM2.5 must not be attached to current weather');
  const airAttempt = w.sourceFetches.find(a => a.id === 'open_meteo_air');
  assert.equal(airAttempt?.status, 'FAILED', 'Stale air fetch attempt must be marked FAILED');
});

test('Stage 10 - fallback missing models: query status is PARTIAL and missing model endpoints are OFFLINE', async () => {
  const lat = -7.203;
  globalThis.fetch = async url => {
    const u = new URL(url), models = u.searchParams.get('models');
    if (u.hostname === 'api.met.no') return new Response(JSON.stringify(metBody(lat, 112.75)));
    if (u.hostname.includes('air-quality')) return new Response(JSON.stringify({ latitude: lat, longitude: 112.75, current: { time: epoch, pm2_5: 15, pm10: 20, ozone: 30 } }));
    if (models) {
      // Only return 1 model (ecmwf_ifs025)
      const h = { time: [hour], temperature_2m_ecmwf_ifs025: [28] };
      return new Response(JSON.stringify({ latitude: lat, longitude: 112.75, hourly: h }));
    }
    throw Error('Independent primary outage fixture');
  };

  const w = await m.weather.fetchConsensusWeather(lat, 112.75, 'fallback-missing-models-status', true);
  const modelsAttempt = w.sourceFetches.find(a => a.id === 'open_meteo_models');
  assert.equal(modelsAttempt?.status, 'PARTIAL', 'Models attempt must be PARTIAL when 8 models are missing');
  const perModel = m.telemetry.getEndpoints().filter(e => e.id.startsWith('open_meteo_model_'));
  const bomEp = perModel.find(e => e.id === 'open_meteo_model_bom');
  const cmaEp = perModel.find(e => e.id === 'open_meteo_model_cma');
  const jmaEp = perModel.find(e => e.id === 'open_meteo_model_jma');
  assert.equal(bomEp?.status, 'OFFLINE', 'Missing BoM model must be OFFLINE');
  assert.equal(cmaEp?.status, 'OFFLINE', 'Missing CMA model must be OFFLINE');
  assert.equal(jmaEp?.status, 'OFFLINE', 'Missing JMA model must be OFFLINE');
});

test('Stage 10 - MET contract: old issue time (>48h) is rejected', async () => {
  const lat = -7.211;
  const b = metBody(lat, 112.75);
  b.properties.meta.updated_at = '2020-01-01T00:00:00Z';
  const text = JSON.stringify(b);
  globalThis.fetch = async () => new Response(text, { status: 200 });
  const r = await m.met.fetchForecast(lat, 112.75);
  assert.equal(r.success, false, 'Old issue time must fail MET forecast response');
  assert.equal(r.attempt?.status, 'FAILED', 'Old issue time attempt must be FAILED');
});

test('Stage 10 - MET contract: mixed valid and invalid points records rejectedCount and PARTIAL status', async () => {
  const lat = -7.212;
  const b = metBody(lat, 112.75);
  const p = point(3600000);
  p.data.instant.details.relative_humidity = 999;
  b.properties.timeseries.push(p);
  const text = JSON.stringify(b);
  globalThis.fetch = async () => new Response(text, { status: 200 });
  const r = await m.met.fetchForecast(lat, 112.75);
  assert.equal(r.success, true);
  assert.equal(r.points.length, 1, 'Only 1 valid point must be retained');
  assert.equal(r.attempt?.status, 'PARTIAL', 'Attempt status must be PARTIAL when points are rejected');
  assert.equal(r.attempt?.rejectedCount, 1, 'rejectedCount must be 1');
});

test('Stage 10 - MET contract: preserves HTTP 203 status and measures UTF-8 payload bytes', async () => {
  const lat = -7.213;
  const b = metBody(lat, 112.75);
  b.providerNote = 'é漢字';
  const text = JSON.stringify(b);
  const expectedBytes = new TextEncoder().encode(text).length;
  globalThis.fetch = async () => new Response(text, { status: 203, headers: { expires: new Date(now + 3600000).toUTCString() } });
  const r = await m.met.fetchForecast(lat, 112.75);
  assert.equal(r.attempt?.httpStatus, 203, 'Must preserve HTTP 203');
  assert.equal(r.attempt?.payloadBytes, expectedBytes, 'Must measure exact UTF-8 byte length');

  // Cache provenance check
  globalThis.fetch = async () => { throw Error('Cache should avoid network'); };
  const again = await m.met.fetchForecast(lat, 112.75);
  assert.equal(again.servedFromCache, true, 'Cache hit must set servedFromCache: true');
  assert.equal(again.attempt?.checkedAt, r.attempt?.checkedAt, 'Cache hit must preserve original network checkedAt');
});

test('Stage 10 - telemetry: accepts single-model Open-Meteo response with temperature_2m key', async () => {
  const lat = -7.221;
  const payload = { latitude: lat, longitude: 112.75, hourly: { time: [new Date(now).toISOString()], temperature_2m: [28] } };
  globalThis.fetch = async () => new Response(JSON.stringify(payload));
  const r = await m.telemetry.pingEndpoint('open_meteo_model_cma', lat, 112.75);
  assert.equal(r.status, 'ONLINE', 'Valid single-model CMA response must be ONLINE');
});

test('Stage 10 - telemetry: rejects invalid time array in model response', async () => {
  const lat = -7.22;
  const payload = { latitude: lat, longitude: 112.75, hourly: { time: ['not-a-time'], temperature_2m_cma_grapes_global: [28] } };
  globalThis.fetch = async () => new Response(JSON.stringify(payload));
  const r = await m.telemetry.pingEndpoint('open_meteo_model_cma', lat, 112.75);
  assert.equal(r.status, 'OFFLINE', 'Model response with invalid time must be OFFLINE');
});

test('Stage 10 - telemetry: rejects MET Norway unusable timeseries [{}]', async () => {
  const lat = -7.223;
  const b = metBody(lat, 112.75);
  b.properties.timeseries = [{}];
  globalThis.fetch = async () => new Response(JSON.stringify(b));
  const r = await m.telemetry.pingEndpoint('met_norway_fallback', lat, 112.75);
  assert.equal(r.status, 'OFFLINE', 'Empty timeseries object must be rejected');
});

test('Stage 10 - telemetry: rejects BMKG corrupted numeric junk strings', async () => {
  const payload = {
    Infogempa: {
      gempa: {
        DateTime: new Date(now).toISOString(),
        Coordinates: '-7junk,112junk',
        Magnitude: 'foo2.1bar',
        Kedalaman: 'foo10bar',
      },
    },
  };
  globalThis.fetch = async () => new Response(JSON.stringify(payload));
  const r = await m.telemetry.pingEndpoint('bmkg_tews', -7, 112.75);
  assert.equal(r.status, 'OFFLINE', 'Corrupted BMKG coordinates, magnitude, and depth must be OFFLINE');
});

test('Stage 10 - radar: moveend resets active viewport without falling back to historical loaded count', () => {
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
  const map = { getSize: () => undefined, render() {}, addLayer() {}, removeLayer() {}, on(k, v) { mapHandlers[k] = v; }, un(k) { delete mapHandlers[k]; } };
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
  assert.equal(statusAfterMoveend, 'MEMUAT', 'Must not falsely report LIVE RADAR from historical loaded count after moveend');

  source.emit('tileloaderror', { tile: tileObj });
  const statusAfterLateError = m.radarStatus(counts.at(-1));
  assert.equal(counts.at(-1)?.activeError, 0, 'Late error from old generation must not increment activeError');
  assert.equal(statusAfterLateError, 'MEMUAT', 'Late error must not degrade active viewport to PARSIAL');
  cleanup();
});

test('Stage 10 - GIBS: AbortSignal and generation guard prevent older response from overwriting newer frame', async () => {
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

  assert.equal(oldCtrl.signal.aborted, true, 'Old controller must be aborted');
  assert.equal(pending[0].signal.aborted, true, 'Old fetch signal must be aborted');
  assert.equal(gibsUpdates.length, 1, 'Older response must be ignored and not committed');
  assert.equal(gibsUpdates[0], '2026-10-04T01:00:00Z', 'Final committed frame must be the newest response');
});

test.after(() => {
  globalThis.fetch = originalFetch;
});
