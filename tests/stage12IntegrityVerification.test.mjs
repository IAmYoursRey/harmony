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
let tileEffect;
const walk = n => {
  if (ts.isCallExpression(n) && n.expression.getText(mapAst) === 'useEffect' && n.arguments[0]?.getText(mapAst).includes('const tileSource = new XYZ')) {
    tileEffect = n.arguments[0].getText(mapAst);
  }
  ts.forEachChild(n, walk);
};
walk(mapAst);

const bundle = await build({
  stdin: {
    contents: `
import { readWeatherTileCoverage } from './apps/web/src/services/geospatial/weatherTileCoverage.ts';
export {
  isValidCalendarDate,
  isValidIsoDateTime,
  buildEndpointAuditUrl,
  validateMetNorwayPayload as metValidator,
  validateOpenMeteoModelPayload as modelValidator,
  isValidIsoDateTime as validIso
} from './apps/web/src/services/weatherDataIntegrity.ts';
export { weatherAggregatorService as weather } from './apps/web/src/services/weatherAggregatorService.ts';
export { metNorwayService as met } from './apps/web/src/services/metNorwayService.ts';
export { geospatialDataTelemetryService as telemetry } from './apps/web/src/services/geospatialDataTelemetryService.ts';

const useMemo = f => f();
const useCallback = f => f;

export const radarStatus = (ctx) => {
  const { weatherMapOverlay = 'radar', weatherRenderMode = 'native', radarMetadataStale = false, radarFrameTime = Date.now() / 1000, radarTileCounts, gibsMetadataStale = false, gibsFrameTime = Date.now() / 1000 } = ctx;
  return (${variable(mapPath, 'weatherStatusText')});
};

export const getPointKey = (${variable(modalPath, 'getPointKey')});
export const selectedPoint = (data, selectedPointKey, selectedHour) => (${variable(modalPath, 'currentHourPoint')});
export const computeInsights = (data) => (${variable(modalPath, 'weatherInsights')});
export const tileEffect = (ctx) => {
  const { mapRef, mapReady, weatherTileLayerRef, weatherMapOverlay, weatherRenderMode, rainviewerPath, rainviewerHost, gibsAvailableTime, rainviewerSatellitePath, weatherOverlayOpacity, setRadarTileLoadError, setRadarTileCounts, XYZ, TileLayer } = ctx;
  return (${tileEffect})();
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

test('T1: MET Norway omitted optional values remain null with no manufactured defaults', async () => {
  const now = Date.now();
  const payload = {
    geometry: { type: 'Point', coordinates: [110.35, -7.41, 0] },
    properties: {
      meta: {
        updated_at: new Date(now).toISOString(),
        units: { air_temperature: 'celsius', relative_humidity: '%' }
      },
      timeseries: [
        {
          time: new Date(now).toISOString(),
          data: {
            instant: {
              details: {
                air_temperature: 17,
                relative_humidity: 81
              }
            }
          }
        }
      ]
    }
  };

  globalThis.fetch = async (url) => {
    if (new URL(url).hostname === 'api.met.no') {
      return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ error: 'outage fixture' }), { status: 503 });
  };

  const weather = await m.weather.fetchConsensusWeather(-7.41, 110.35, 'Missing optional test', true);
  assert.equal(weather.current?.consensusTemperature, 17);
  assert.equal(weather.current?.humidity, 81);
  assert.equal(weather.current?.windSpeed, null, 'windSpeed must be null');
  assert.equal(weather.current?.windDirection, null, 'windDirection must be null');
  assert.equal(weather.current?.cloudCover, null, 'cloudCover must be null');

  const h0 = weather.hourly[0];
  assert.equal(h0.windSpeed, null, 'hourly windSpeed must be null');
  assert.equal(h0.windDirection, null, 'hourly windDirection must be null');
  assert.equal(h0.cloudCover, null, 'hourly cloudCover must be null');
  assert.equal(h0.seaLevelPressure, null, 'hourly seaLevelPressure must be null');

  const metAttempt = weather.sourceFetches.find(a => a.id === 'met_norway_fallback');
  assert.ok(metAttempt, 'MET fallback attempt exists');
  assert.equal(metAttempt.acceptedCount, 1);
  assert.equal(metAttempt.rejectedCount, 0);

  const endpoint = m.telemetry.getEndpoints().find(e => e.id === 'met_norway_fallback');
  assert.equal(endpoint?.status, 'ONLINE');
});

test('T2: Shared model validator sanitizes 999 values from aggregator consensus and hourly comparison', async () => {
  const now = Date.now();
  const epoch = Math.floor(now / 1000);
  const hour = epoch - (epoch % 3600);

  const current = {
    time: epoch, interval: 900, temperature_2m: 17, relative_humidity_2m: 81,
    apparent_temperature: 17, precipitation: 0, weather_code: 3, cloud_cover: 93,
    surface_pressure: 1005, wind_speed_10m: 14.4, wind_direction_10m: 140, wind_gusts_10m: 20
  };
  const hourly = { time: [hour] };
  for (const [k, v] of Object.entries(current)) {
    if (!['time', 'interval'].includes(k)) hourly[k] = [v];
  }
  hourly.precipitation_probability = [0];
  hourly.uv_index = [0];

  globalThis.fetch = async (url) => {
    const u = new URL(url);
    if (u.hostname.includes('air-quality')) {
      return new Response(JSON.stringify({ latitude: -7.45, longitude: 112.75, current: { time: epoch, pm2_5: 15, pm10: 20, ozone: 30 } }));
    }
    const models = u.searchParams.get('models');
    if (models) {
      const h = { time: [hour] };
      for (const id of models.split(',')) h[`temperature_2m_${id}`] = [999];
      return new Response(JSON.stringify({
        latitude: -7.45, longitude: 112.75, hourly: h,
        hourly_units: Object.fromEntries(models.split(',').map(id => [`temperature_2m_${id}`, '°C']))
      }));
    }
    return new Response(JSON.stringify({ latitude: -7.45, longitude: 112.75, timezone: 'UTC', current, hourly, daily: { time: [] } }));
  };

  const aggregate = await m.weather.fetchConsensusWeather(-7.45, 112.75, 'Model physical range test', true);
  assert.equal(aggregate.modelComparison.length, 0, 'Out-of-range 999 models must not enter modelComparison');
  assert.equal(aggregate.current?.tempMin, 17, 'tempMin must fallback to valid current temperature, not 999');
  assert.equal(aggregate.current?.tempMax, 17, 'tempMax must fallback to valid current temperature, not 999');

  const modelAttempt = aggregate.sourceFetches.find(a => a.id === 'open_meteo_models');
  assert.ok(modelAttempt);
  assert.equal(modelAttempt.status, 'FAILED');
});

test('T3: Model validator rejects invalid offsets, unparseable epochs, and unknown units', () => {
  const epoch = Math.floor(Date.now() / 1000);
  const hour = epoch - (epoch % 3600);

  // Offset +99:99
  const resOffset = m.modelValidator({
    latitude: -7.44, longitude: 112.75,
    hourly_units: { temperature_2m: '°C' },
    hourly: { time: ['2026-10-04T08:00:00+99:99', '2026-10-04T09:00:00+99:99'], temperature_2m: [28, 29] }
  }, -7.44, 112.75, 'cma_grapes_global');
  assert.equal(resOffset.valid, false);
  assert.equal(resOffset.status, 'OFFLINE');

  // Epoch 1e20
  const resEpoch = m.modelValidator({
    latitude: -7.44, longitude: 112.75,
    hourly_units: { temperature_2m: '°C' },
    hourly: { time: [1e20, 1e20 + 3600], temperature_2m: [28, 29] }
  }, -7.44, 112.75, 'cma_grapes_global');
  assert.equal(resEpoch.valid, false);
  assert.equal(resEpoch.status, 'OFFLINE');

  // Unknown unit 'bananas'
  const resUnit = m.modelValidator({
    latitude: -7.44, longitude: 112.75,
    hourly_units: { temperature_2m: 'bananas' },
    hourly: { time: [hour, hour + 3600], temperature_2m: [28, 29] }
  }, -7.44, 112.75, 'cma_grapes_global');
  assert.equal(resUnit.valid, false);
  assert.equal(resUnit.status, 'OFFLINE');

  // Mixed range [28, 999] -> PARTIAL
  const resMixed = m.modelValidator({
    latitude: -7.44, longitude: 112.75,
    hourly_units: { temperature_2m: '°C' },
    hourly: { time: [hour, hour + 3600], temperature_2m: [28, 999] }
  }, -7.44, 112.75, 'cma_grapes_global');
  assert.equal(resMixed.valid, true);
  assert.equal(resMixed.status, 'PARTIAL');
  assert.equal(resMixed.acceptedCount, 1);
  assert.equal(resMixed.rejectedCount, 1);
});

test('T4: Manual endpoint audit preserves PARTIAL status on mixed valid/invalid points', async () => {
  const now = Date.now();
  const partial = {
    geometry: { type: 'Point', coordinates: [110.35, -7.42, 0] },
    properties: {
      meta: {
        updated_at: new Date(now).toISOString(),
        units: { air_temperature: 'celsius', relative_humidity: '%' }
      },
      timeseries: [
        { time: new Date(now).toISOString(), data: { instant: { details: { air_temperature: 17, relative_humidity: 81 } } } },
        { time: new Date(now + 3600000).toISOString(), data: { instant: { details: { air_temperature: 17, relative_humidity: 999 } } } }
      ]
    }
  };

  globalThis.fetch = async () => new Response(JSON.stringify(partial), { status: 200, headers: { 'Content-Type': 'application/json' } });
  const audit = await m.telemetry.pingEndpoint('met_norway_fallback', -7.42, 110.35);
  assert.equal(audit.status, 'DEGRADED', 'Manual ping must mark partial payload as DEGRADED, not ONLINE');

  const product = await m.met.fetchForecast(-7.42, 110.35);
  assert.equal(product.attempt?.status, 'PARTIAL');
  assert.equal(product.attempt?.acceptedCount, 1);
  assert.equal(product.attempt?.rejectedCount, 1);
});

test('T5: Multiplexed in-flight request lifecycle supports per-subscriber cancellation', async () => {
  let resolveNetwork;
  const a = new AbortController();
  const b = new AbortController();

  globalThis.fetch = async (url, options) => {
    return new Promise((resolve, reject) => {
      resolveNetwork = resolve;
      options.signal.addEventListener('abort', () => reject(new DOMException('Aborted shared request', 'AbortError')), { once: true });
    });
  };

  const pa = m.met.fetchForecast(-7.46, 112.75, a.signal);
  const pb = m.met.fetchForecast(-7.46, 112.75, b.signal);
  const results = {};
  pa.then(v => results.first = { resolved: true, success: v.success }, e => results.first = { resolved: false, name: e.name });
  pb.then(v => results.second = { resolved: true, success: v.success }, e => results.second = { resolved: false, name: e.name });

  // Caller B aborts
  b.abort();
  await new Promise(r => setTimeout(r, 10));
  assert.equal(results.second?.name, 'AbortError');
  assert.equal(results.first, undefined, 'Caller A should still be pending');

  // Now resolve shared network
  resolveNetwork(new Response(JSON.stringify({
    geometry: { type: 'Point', coordinates: [112.75, -7.46, 0] },
    properties: {
      meta: { updated_at: new Date().toISOString(), units: { air_temperature: 'celsius', relative_humidity: '%' } },
      timeseries: [{ time: new Date().toISOString(), data: { instant: { details: { air_temperature: 20, relative_humidity: 70 } } } }]
    }
  }), { status: 200 }));

  await Promise.allSettled([pa, pb]);
  assert.equal(results.first?.resolved, true);
  assert.equal(results.first?.success, true, 'Caller A receives successful response even after caller B cancelled');
});

test('T6: Weather insights compute elapsed intervals, separate probability from amounts, and group by time', () => {
  const now = Date.now();
  const h = (offset, values = {}) => ({
    time: new Date(now + offset).toISOString(),
    hour: new Date(now + offset).getUTCHours(),
    label: new Date(now + offset).toISOString().slice(11, 16),
    temperature: 17,
    precipitation: null,
    precipitationProb: null,
    cloudCover: null,
    ...values
  });

  // 1. Two zero points 23 hours apart -> must note incomplete gap
  const sparse = m.computeInsights({
    timezone: 'UTC',
    hourly: [h(0, { precipitation: 0 }), h(23 * 3600000, { precipitation: 0 })]
  });
  assert.match(sparse.rainWindowText, /belum lengkap|tidak tercatat hujan/i);
  assert.doesNotMatch(sparse.rainWindowText, /Cenderung kering sepanjang periode prakiraan/);

  // 2. 18 zeros + 6 nulls in 24 hours -> notes missing intervals
  const partialDry = m.computeInsights({
    timezone: 'UTC',
    hourly: Array.from({ length: 24 }, (_, i) => h(i * 3600000, { precipitation: i < 18 ? 0 : null }))
  });
  assert.match(partialDry.rainWindowText, /6 interval belum lengkap/);

  // 3. Positive amount (10mm) and prob-only (70%) -> separate windows, no inherited heavy rain
  const posAndProb = m.computeInsights({
    timezone: 'UTC',
    hourly: [h(0, { precipitation: 10 }), h(3600000, { precipitationProb: 70 })]
  });
  assert.match(posAndProb.rainWindowText, /Hujan lebat \(~10 mm\)/);
  assert.match(posAndProb.rainWindowText, /indikasi potensi hujan \(peluang 70%\)/);

  // 4. Two rain points 24h apart -> separated by time, including date prefix
  const gap24 = m.computeInsights({
    timezone: 'UTC',
    hourly: [h(0, { precipitation: 1 }), h(24 * 3600000, { precipitation: 1 })]
  });
  assert.match(gap24.rainWindowText, /, /);
  assert.match(gap24.intervalLabel, /–/);
});

test('T7: Radar inspects real OpenLayers renderer cache and ignores offscreen completion', async () => {
  const [{ default: RealXYZ }, { default: RealLayer }, { get: getProjection }] = await Promise.all([
    import('ol/source/XYZ.js'), import('ol/layer/Tile.js'), import('ol/proj.js'),
  ]);
  const previousImage = globalThis.Image;
  globalThis.Image = class { constructor() { this.width = this.height = 256; } };
  const counts = [], events = {}, tiles = [];
  let source, layer;
  class XYZ extends RealXYZ { constructor(opts) { super(opts); source = this; } }
  class TileLayer extends RealLayer { constructor(opts) { super(opts); layer = this; } }
  const projection = getProjection('EPSG:3857');
  const referenceGrid = new RealXYZ({ maxZoom: 7 }).getTileGridForProjection(projection);
  const first = referenceGrid.getTileCoordExtent([7, 0, 0]);
  const last = referenceGrid.getTileCoordExtent([7, 2, 0]);
  let extent = [first[0], first[1], last[2], last[3]];
  const map = {
    render() {}, removeLayer() {},
    addLayer(l) {
      const renderer = l.getRenderer();
      for (let x = 0; x < 3; x++) {
        const tile = renderer.getOrCreateTile(7, x, 0, { viewState: { projection }, pixelRatio: 1 });
        tile.setState([2, 1, 3][x]); tiles.push(tile);
      }
    },
    on(k, v) { events[k] = v; }, un(k) { delete events[k]; },
    getSize: () => [500, 300],
    getView: () => ({ calculateExtent: () => extent, getProjection: () => projection, getRotation: () => 0, getCenter: () => [0, 0],
      getResolution: () => referenceGrid.getResolution(7) / 64 }),
  };
  try {
    const cleanup = m.tileEffect({ mapRef: { current: map }, mapReady: true,
      weatherTileLayerRef: { current: null }, weatherMapOverlay: 'radar', weatherRenderMode: 'native',
      rainviewerPath: '/fixture', rainviewerHost: 'https://fixture.invalid', gibsAvailableTime: null,
      rainviewerSatellitePath: '', weatherOverlayOpacity: 0.7, setRadarTileLoadError() {},
      setRadarTileCounts: v => counts.push(v), XYZ, TileLayer });
    source.dispatchEvent({ type: 'tileloadstart', tile: tiles[1] });
    events.moveend();
    assert.deepEqual([counts.at(-1).activeRequested, counts.at(-1).activeLoaded, counts.at(-1).activeError], [3, 1, 1]);
    assert.equal(m.radarStatus({ radarTileCounts: counts.at(-1) }), 'PARSIAL');
    const sizeBefore = layer.getRenderer().getTileCache().getCount();
    events.postrender();
    assert.equal(layer.getRenderer().getTileCache().getCount(), sizeBefore, 'Inspection creates no tiles');
    tiles[1].setState(2); source.dispatchEvent({ type: 'tileloadend', tile: tiles[1] });
    assert.equal(counts.at(-1).activeLoaded, 2);
    extent = referenceGrid.getTileCoordExtent([7, 10, 0]); events.moveend();
    source.dispatchEvent({ type: 'tileloadend', tile: tiles[0] });
    assert.equal(counts.at(-1).activeLoaded, 0, 'Old viewport completion cannot make new viewport live');
    assert.equal(m.radarStatus({ radarTileCounts: counts.at(-1) }), 'MEMUAT');
    cleanup();
  } finally { globalThis.Image = previousImage; }
});

test('T8: Spatial routes on 404 HTML remain documented as unavailable without speculation', async () => {
  globalThis.fetch = async () => new Response('<!DOCTYPE html><html><body>404 Not Found</body></html>', {
    status: 404,
    headers: { 'Content-Type': 'text/html' }
  });

  const auditHotspots = await m.telemetry.pingEndpoint('nasa_firms', -6.2, 106.8);
  assert.equal(auditHotspots.status, 'OFFLINE');
  assert.match(auditHotspots.errorMessage || '', /404|Respons FIRMS tidak valid/i);

  const auditTraffic = await m.telemetry.pingEndpoint('tomtom_traffic', -6.2, 106.8);
  assert.equal(auditTraffic.status, 'OFFLINE');
  assert.match(auditTraffic.errorMessage || '', /404|Respons TomTom Traffic tidak valid/i);
});

test.after(() => {
  globalThis.fetch = originalFetch;
});
