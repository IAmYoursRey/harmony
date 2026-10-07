import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';

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
export { weatherAggregatorService as weather } from './apps/web/src/services/weatherAggregatorService.ts';
export { metNorwayService as met } from './apps/web/src/services/metNorwayService.ts';
export { geospatialDataTelemetryService as telemetry } from './apps/web/src/services/geospatialDataTelemetryService.ts';
export { validateOpenMeteoModelPayload as modelValidator, validateMetNorwayPayload as metValidator, isValidIsoDateTime as validIso } from './apps/web/src/services/weatherDataIntegrity.ts';
const useMemo = f => f(), useCallback = f => f;
export const getPointKey = (${variable(modalPath, 'getPointKey')});
export const selectedPoint = (data, selectedPointKey, selectedHour) => (${variable(modalPath, 'currentHourPoint')});
export const insights = data => (${variable(modalPath, 'weatherInsights')});
export const radarStatus = ctx => {
  const { weatherMapOverlay = 'radar', weatherRenderMode = 'native', radarMetadataStale = false, radarFrameTime = Date.now() / 1000, radarTileCounts, gibsMetadataStale = false, gibsFrameTime = Date.now() / 1000 } = ctx;
  return (${variable(mapPath, 'weatherStatusText')});
};
export const tileEffect = ctx => {
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
  define: { 'import.meta.env': '{}' }
});

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const m = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString('base64')}`);
const originalFetch = globalThis.fetch;

const now = Date.now();
const epoch = Math.floor(now / 1000);
const hour = epoch - (epoch % 3600);

const report = {
  checkedAt: new Date().toISOString(),
  scope: 'Stage 12 end-to-end data integrity remediation verification',
  cases: []
};

const add = (id, actual, expected, passed) => {
  report.cases.push({ id, actual, expected, passed });
};

const point = (offset = 0) => ({
  time: new Date(now + offset).toISOString(),
  data: { instant: { details: { air_temperature: 17, relative_humidity: 81, wind_speed: 4, wind_from_direction: 140, cloud_area_fraction: 93, air_pressure_at_sea_level: 1005 } } }
});

const body = (lat, lng) => ({
  geometry: { type: 'Point', coordinates: [lng, lat, 0] },
  properties: {
    meta: {
      updated_at: new Date(now).toISOString(),
      units: { air_temperature: 'celsius', relative_humidity: '%', wind_speed: 'm/s', wind_from_direction: 'degrees', cloud_area_fraction: '%', air_pressure_at_sea_level: 'hPa' }
    },
    timeseries: [point()]
  }
});

// Case 1: MET omitted optional values
const optional = body(-7.41, 110.35);
const optDetails = optional.properties.timeseries[0].data.instant.details;
for (const key of ['wind_speed', 'wind_from_direction', 'cloud_area_fraction', 'air_pressure_at_sea_level']) {
  delete optDetails[key];
}
globalThis.fetch = async url => new URL(url).hostname === 'api.met.no'
  ? new Response(JSON.stringify(optional))
  : new Response('{"error":"outage fixture"}', { status: 503 });

const optWeather = await m.weather.fetchConsensusWeather(-7.41, 110.35, 'Missing optional fixture', true);
const c1 = {
  current: optWeather.current,
  firstHour: optWeather.hourly[0],
  metAttempt: optWeather.sourceFetches.find(a => a.id === 'met_norway_fallback'),
  endpoint: m.telemetry.getEndpoints().find(e => e.id === 'met_norway_fallback')?.status
};
const c1Pass = c1.current?.windSpeed === null && c1.current?.windDirection === null && c1.current?.cloudCover === null && c1.firstHour?.seaLevelPressure === null;
add('MET-omitted-values-defaulted', c1, 'Missing wind/cloud/pressure stay null with explicit coverage; never synthetic 0 or 1013', c1Pass);

// Case 2: MET manual partial preserved
const partial = body(-7.42, 110.35);
const bad = point(3600000);
bad.data.instant.details.relative_humidity = 999;
partial.properties.timeseries.push(bad);
globalThis.fetch = async () => new Response(JSON.stringify(partial));
const partialAudit = await m.telemetry.pingEndpoint('met_norway_fallback', -7.42, 110.35);
const partialProduct = await m.met.fetchForecast(-7.42, 110.35);
const c2 = {
  validator: m.metValidator(partial, -7.42, 110.35),
  auditStatus: partialAudit.status,
  productAttempt: partialProduct.attempt
};
const c2Pass = c2.auditStatus === 'DEGRADED' && c2.productAttempt?.status === 'PARTIAL';
add('MET-manual-partial-lost', c2, 'Shared validator PARTIAL propagates through manual audit and ingestion', c2Pass);

// Case 3: Invalid issue offset
const offsetBad = body(-7.43, 110.35);
offsetBad.properties.meta.updated_at = '2026-10-04T08:00:00+99:99';
globalThis.fetch = async () => new Response(JSON.stringify(offsetBad));
const offsetAudit = await m.telemetry.pingEndpoint('met_norway_fallback', -7.43, 110.35);
const offsetProduct = await m.met.fetchForecast(-7.43, 110.35);
const c3 = {
  isoValidator: m.validIso(offsetBad.properties.meta.updated_at),
  dateParseFinite: Number.isFinite(Date.parse(offsetBad.properties.meta.updated_at)),
  auditStatus: offsetAudit.status,
  productSuccess: offsetProduct.success,
  updatedAt: offsetProduct.updatedAt
};
const c3Pass = c3.isoValidator === false && c3.auditStatus === 'OFFLINE' && c3.productSuccess === false;
add('MET-invalid-issue-offset', c3, 'An invalid UTC offset never becomes a valid issue timestamp', c3Pass);

// Cases 4-7: Model validator invalid inputs
const modelBase = { latitude: -7.44, longitude: 112.75, hourly_units: { temperature_2m: '°C' }, hourly: { time: [hour, hour + 3600], temperature_2m: [28, 29] } };
for (const [id, change, expStatus] of [
  ['model-mixed-out-of-range', d => d.hourly.temperature_2m = [28, 999], 'DEGRADED'],
  ['model-unknown-unit', d => d.hourly_units.temperature_2m = 'bananas', 'OFFLINE'],
  ['model-epoch-outside-date-range', d => d.hourly.time = [1e20, 1e20 + 3600], 'OFFLINE'],
  ['model-invalid-offset', d => d.hourly.time = ['2026-10-04T08:00:00+99:99', '2026-10-04T09:00:00+99:99'], 'OFFLINE'],
]) {
  const d = structuredClone(modelBase);
  change(d);
  globalThis.fetch = async () => new Response(JSON.stringify(d));
  const r = await m.telemetry.pingEndpoint('open_meteo_model_cma', -7.44, 112.75);
  const actual = { validator: m.modelValidator(d, -7.44, 112.75, 'cma_grapes_global'), auditStatus: r.status, auditError: r.errorMessage };
  const pass = r.status === expStatus;
  add(id, actual, 'Validate every paired sample and declared unit; invalid values do not receive ONLINE', pass);
}

// Case 8: Aggregator 999 model sanitization
const current = { time: epoch, interval: 900, temperature_2m: 17, relative_humidity_2m: 81, apparent_temperature: 17, precipitation: 0, weather_code: 3, cloud_cover: 93, surface_pressure: 1005, wind_speed_10m: 14.4, wind_direction_10m: 140, wind_gusts_10m: 20 };
const hourlyArr = { time: [hour] };
for (const [k, v] of Object.entries(current)) if (!['time', 'interval'].includes(k)) hourlyArr[k] = [v];
hourlyArr.precipitation_probability = [0];
hourlyArr.uv_index = [0];

globalThis.fetch = async url => {
  const u = new URL(url);
  if (u.hostname.includes('air-quality')) return new Response(JSON.stringify({ latitude: -7.45, longitude: 112.75, current: { time: epoch, pm2_5: 15, pm10: 20, ozone: 30 } }));
  const models = u.searchParams.get('models');
  if (models) {
    const hObj = { time: [hour] };
    for (const mid of models.split(',')) hObj[`temperature_2m_${mid}`] = [999];
    return new Response(JSON.stringify({ latitude: -7.45, longitude: 112.75, hourly: hObj, hourly_units: Object.fromEntries(models.split(',').map(mid => [`temperature_2m_${mid}`, '°C'])) }));
  }
  return new Response(JSON.stringify({ latitude: -7.45, longitude: 112.75, timezone: 'UTC', current, hourly: hourlyArr, daily: { time: [] } }));
};
const aggregate = await m.weather.fetchConsensusWeather(-7.45, 112.75, 'Model physical range fixture', true);
const c8 = { modelTemperatures: aggregate.modelComparison.map(x => x.temperature), modelAttempt: aggregate.sourceFetches.find(a => a.id === 'open_meteo_models'), currentMin: aggregate.current?.tempMin, currentMax: aggregate.current?.tempMax };
const c8Pass = c8.modelTemperatures.length === 0 && c8.currentMin === 17 && c8.currentMax === 17;
add('aggregator-invalid-model-temperature', c8, 'Shared model validation governs actual forecast ingestion, not only audit tests', c8Pass);

// Cases 9-12: Rain windows and interval coverage
const h = (offset, values = {}) => ({ time: new Date(now + offset).toISOString(), hour: new Date(now + offset).getUTCHours(), label: new Date(now + offset).toISOString().slice(11, 16), temperature: 17, precipitation: null, precipitationProb: null, cloudCover: null, ...values });
for (const [id, points, checker] of [
  ['rain-sparse-two-zero-points', [h(0, { precipitation: 0 }), h(23 * 3600000, { precipitation: 0 })], res => !res.rainWindowText.includes('Cenderung kering sepanjang periode prakiraan')],
  ['rain-75percent-zero-rest-missing', Array.from({ length: 24 }, (_, i) => h(i * 3600000, { precipitation: i < 18 ? 0 : null })), res => res.rainWindowText.includes('6 interval belum lengkap')],
  ['rain-positive-and-probability-only', [h(0, { precipitation: 10 }), h(3600000, { precipitationProb: 70 })], res => res.rainWindowText.includes('Hujan lebat (~10 mm)') && res.rainWindowText.includes('indikasi potensi hujan (peluang 70%)')],
  ['rain-adjacent-index-24hour-gap', [h(0, { precipitation: 1 }), h(24 * 3600000, { precipitation: 1 })], res => res.rainWindowText.includes('4 Okt') && res.rainWindowText.includes('5 Okt')],
]) {
  const res = m.insights({ timezone: 'UTC', hourly: points });
  add(id, res, 'Coverage and rain windows use elapsed intervals; missing amounts cannot inherit measured intensity', checker(res));
}

// Case 13: Positive day selector
const repeated = [h(0, { temperature: 17 }), h(24 * 3600000, { temperature: 30 })];
const selected = m.selectedPoint({ hourly: repeated }, m.getPointKey(repeated[1], 1), repeated[1].hour);
const c13 = { selectedTime: selected.time, selectedTemperature: selected.temperature };
add('selector-next-day-positive', c13, 'Selecting a full timestamp chooses the correct second-day temperature', c13.selectedTemperature === 30);

// Cases 14-15: OpenLayers radar coverage and active tile tracking
let source;
const counts = [];
const events = {};
const queriedZooms = [];
const tiles = [{ state: 2 }, { state: 1 }, { state: 3 }].map((t, i) => ({ ...t, getKey: () => `tile-${i}`, getState() { return this.state; } }));
class XYZ {
  constructor() { this.handlers = {}; source = this; }
  on(k, v) { this.handlers[k] = v; }
  un(k) { delete this.handlers[k]; }
  emit(k, tile) { this.handlers[k]?.({ tile }); }
  getTileGridForProjection() { return { forEachTileCoord: (extent, zoom, cb) => { queriedZooms.push(zoom); tiles.forEach((_, i) => cb([zoom, i, 0])); } }; }
  getTile(z, x) { return tiles[x]; }
}
class TileLayer { constructor(opts) { this.source = opts.source; } dispose() {} }
const map = { render() {}, addLayer() {}, removeLayer() {}, on(k, v) { events[k] = v; }, un(k) { delete events[k]; }, getSize: () => [500, 300], getView: () => ({ calculateExtent: () => [0, 0, 1, 1], getZoom: () => 13, getProjection: () => ({}) }) };
const cleanup = m.tileEffect({ mapRef: { current: map }, mapReady: true, weatherTileLayerRef: { current: null }, weatherMapOverlay: 'radar', weatherRenderMode: 'native', rainviewerPath: '/fixture', rainviewerHost: 'https://fixture.invalid', gibsAvailableTime: null, rainviewerSatellitePath: '', weatherOverlayOpacity: 0.7, setRadarTileLoadError() {}, setRadarTileCounts: v => counts.push(v), XYZ, TileLayer });

source.emit('tileloadstart', tiles[1]);
events.moveend();
const c14 = { counts: counts.at(-1), status: m.radarStatus({ radarTileCounts: counts.at(-1) }), queriedZooms };
const c14Pass = c14.status === 'PARSIAL' && queriedZooms.includes(7) && !queriedZooms.includes(13);
add('radar-partial-cache-reset', c14, 'Retain loaded/pending/failed coverage and use provider effective zoom rather than map zoom 13', c14Pass);

tiles[1].state = 2;
source.emit('tileloadend', tiles[1]);
const c15 = { counts: counts.at(-1), status: m.radarStatus({ radarTileCounts: counts.at(-1) }) };
const c15Pass = c15.counts.activeLoaded === 2 && c15.status === 'PARSIAL';
add('radar-still-needed-inflight-ignored', c15, 'A tile still needed in the final viewport can finish after moveend and update coverage', c15Pass);
cleanup();

// Cases 16-18: Multiplexed cancellation and unhandled rejection
const unhandled = [];
const onUnhandled = e => unhandled.push({ name: e?.name, message: e?.message });
process.on('unhandledRejection', onUnhandled);

for (const [id, lat, abortFirst] of [['MET-later-caller-abort', -7.46, false], ['MET-first-caller-abort', -7.47, true]]) {
  let resolveNetwork, fetchCalls = 0;
  const a = new AbortController(), b = new AbortController();
  globalThis.fetch = async (url, options) => {
    fetchCalls++;
    return new Promise((resolve, reject) => {
      resolveNetwork = resolve;
      options.signal.addEventListener('abort', () => reject(new DOMException('Aborted shared request', 'AbortError')), { once: true });
    });
  };
  const pa = m.met.fetchForecast(lat, 112.75, a.signal);
  const pb = m.met.fetchForecast(lat, 112.75, b.signal);
  const results = {};
  pa.then(v => results.first = { resolved: true, success: v.success }, e => results.first = { resolved: false, name: e.name });
  pb.then(v => results.second = { resolved: true, success: v.success }, e => results.second = { resolved: false, name: e.name });
  (abortFirst ? a : b).abort();
  await new Promise(r => setTimeout(r, 10));
  const afterAbort = structuredClone(results);
  if (!abortFirst) {
    resolveNetwork(new Response(JSON.stringify(body(lat, 112.75))));
  }
  await Promise.allSettled([pa, pb]);
  await new Promise(r => setTimeout(r, 10));
  const pass = abortFirst ? afterAbort.first?.name === 'AbortError' && afterAbort.second === undefined : afterAbort.second?.name === 'AbortError' && results.first?.success === true;
  add(id, { fetchCalls, afterAbort, final: results }, 'Each caller cancellation affects only that consumer while needed shared network work continues', pass);
}

const c18Pass = unhandled.length === 0;
add('MET-unhandled-finally-rejection', { unhandled }, 'Cleanup promise rejection is handled and does not generate unhandledRejection', c18Pass);
process.removeListener('unhandledRejection', onUnhandled);

globalThis.fetch = originalFetch;

writeFileSync(`${repo}/tests/evidence-stage12-verified.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

const allPassed = report.cases.every(c => c.passed);
console.log(`\nStage 12 verification result: ${report.cases.filter(c => c.passed).length}/${report.cases.length} cases passed.`);
if (!allPassed) {
  console.error('Failed cases:', report.cases.filter(c => !c.passed).map(c => c.id));
  process.exit(1);
}
