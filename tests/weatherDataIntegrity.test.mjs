import assert from 'node:assert/strict';
import { build } from 'esbuild';
import express from 'express';
import bmkgRouter from '../apps/server/src/routes/bmkgRoutes.js';
import { getCurrentWeatherProxy, getHotspots } from '../apps/server/src/controllers/spatialController.js';
import { buildAtmosphericDiagnostic } from '../apps/server/src/services/weatherIntegrity.js';

const bundled = await build({ stdin: { contents: `
  export { weatherAggregatorService } from './apps/web/src/services/weatherAggregatorService.ts';
  export { geospatialDataTelemetryService } from './apps/web/src/services/geospatialDataTelemetryService.ts';
  export { fetchCheckedJson } from './apps/web/src/services/weatherDataIntegrity.ts';
  export { atmosphericNwpAiService } from './apps/web/src/services/atmosphericNwpAiService.ts';
  export { mapWeatherLiveService } from './apps/web/src/services/geospatial/mapWeatherLiveService.ts';
  export { seasonalIntelligenceService } from './apps/web/src/services/seasonalIntelligenceService.ts';
  export { hotspotFireService } from './apps/web/src/services/hotspotFireService.ts';
  export { stacService } from './apps/web/src/services/geospatial/stacService.ts';
  export { bmkgService } from './apps/web/src/services/bmkgService.ts';
`, resolveDir: process.cwd(), loader: 'ts' }, tsconfig: 'apps/web/tsconfig.app.json', bundle: true, format: 'esm', platform: 'node', write: false, define: { 'import.meta.env': '{}' } });
globalThis.localStorage = { getItem: () => null };
const { weatherAggregatorService: weather, geospatialDataTelemetryService: telemetry, fetchCheckedJson, atmosphericNwpAiService: ai, mapWeatherLiveService: live, seasonalIntelligenceService: seasonal, bmkgService: bmkg, hotspotFireService: fires, stacService: stac } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const originalFetch = globalThis.fetch;
let checks = 0;
const pass = message => { checks++; console.log(`PASS ${message}`); };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const epoch = Math.floor(Date.now() / 3600000) * 3600;
const times = Array.from({ length: 48 }, (_, i) => epoch + (i - 8) * 3600);
const filled = value => times.map(() => value);
const base = () => ({ latitude: -7.25, longitude: 112.75, elevation: 12, timezone: 'Asia/Jakarta', current: { time: epoch + 900, interval: 900, temperature_2m: 0, apparent_temperature: 0, relative_humidity_2m: 80, precipitation: 0, weather_code: 51, cloud_cover: 70, surface_pressure: 1010, wind_speed_10m: 0, wind_direction_10m: 0, wind_gusts_10m: 0 },
  hourly: { time: times, temperature_2m: filled(0), apparent_temperature: filled(0), relative_humidity_2m: filled(80), precipitation: filled(0), precipitation_probability: filled(0), weather_code: filled(51), cloud_cover: filled(70), surface_pressure: filled(1010), wind_speed_10m: filled(0), wind_direction_10m: filled(0), uv_index: filled(0) },
  daily: { time: [epoch], weather_code: [51], temperature_2m_max: [2], temperature_2m_min: [-2], precipitation_sum: [0], precipitation_probability_max: [0], wind_speed_10m_max: [0], uv_index_max: [0] } });
const models = () => ({ latitude: -7.25, longitude: 112.75, hourly: { time: times, temperature_2m_ecmwf_ifs025: filled(0), temperature_2m_gfs_seamless: filled(2) } });
const air = () => ({ latitude: -7.25, longitude: 112.75, current: { time: epoch, pm2_5: 0, pm10: 0, ozone: 0 }, hourly: { time: times, pm2_5: filled(0), ozone: filled(0) } });
let mode = 'partial-models';
let requests = [];
globalThis.fetch = async (url, options) => {
  url = String(url); requests.push(url);
  if (mode === 'offline') throw new Error('NETWORK_TEST_FAILURE');
  if (url.includes('/api/ai/')) return json({ success: false, source: 'local-diagnostic', data: { isAiVerified: false }, reason: { code: 'AI_NOT_CONFIGURED' } });
  if (url.includes('/api/bmkg/gempa/autogempa')) return json({ success: true, data: { lat: -7, lng: 112, magnitude: 3, location: 'Test quake' } });
  if (url.includes('/api/spatial/weather/current')) return json({ success: true, data: { temperature: null } });
  if (url.includes('air-quality')) return mode === 'air-failure' ? json({ error: true }, 503) : json(air());
  if (url.includes('models=')) return json(models());
  if (mode === 'empty') return json({});
  if (mode === 'null-current') { const d = base(); d.current.temperature_2m = null; return json(d); }
  if (mode === 'nepal') {
    const d = base(); d.timezone = 'Asia/Kathmandu'; d.current.time = epoch + 1200; d.hourly.time = times.map(t => t + 900);
    return json(d);
  }
  return json(base());
};

try {
  assert.ok(telemetry.getEndpoints().every(ep => ep.status === 'UNCHECKED' && ep.httpStatus === null));
  assert.equal(telemetry.getLatestSnapshot(), null);
  pass('no fabricated ONLINE status or initial raw snapshot');
  const data = await weather.fetchConsensusWeather(-7.25, 112.75, 'Fixture', true);
  assert.equal(requests.filter(url => url.includes('/api/ai/')).length, 0); // Model retries do not trigger automatic AI verification.
  assert.equal(requests.filter(url => !url.includes('models=')).length, 2); // Weather and air quality only.
  assert.equal(data.current.consensusTemperature, 0);
  assert.equal(data.current.windSpeed, 0);
  assert.equal(data.current.precipitation, 0);
  assert.equal(data.current.precipitationProb, 0);
  assert.equal(data.current.pm25, 0);
  assert.equal(data.hourly[0].time, new Date(epoch * 1000).toISOString());
  assert.equal(data.hourly.length, 24);
  assert.equal(data.modelComparison.length, 2);
  assert.equal(data.modelComparison.some(m => /BMKG|MSS|PAGASA|Malaysia|TMD|IMD/.test(m.modelName)), false);
  assert.equal(data.modelSpread, 2);
  assert.equal(data.current.confidenceScore, null);
  assert.equal(data.accuracyValidated, false);
  assert.equal(data.dataStatus, 'PARTIAL');
  assert.equal(data.sourceFetches.find(s => s.id === 'open_meteo_models').status, 'PARTIAL');
  pass('only returned models used; zeros preserved; no synthetic rain or accuracy');
  await telemetry.pingEndpoint('open_meteo_models', -7.25, 112.75);
  assert.equal(telemetry.getEndpoints().find(ep => ep.id === 'open_meteo_models').status, 'DEGRADED');
  pass('manual endpoint check cannot overwrite partial model ingestion as ONLINE');
  const requestCount = requests.length;
  const cached = await weather.fetchConsensusWeather(-7.25, 112.75);
  assert.equal(requests.length, requestCount);
  assert.equal(cached.servedFromCache, true);
  assert.equal(cached.fetchedAt, data.fetchedAt);
  pass('cache retains original data time and records no new retrieval');
  mode = 'air-failure';
  const partial = await weather.fetchConsensusWeather(-7.25, 112.75, 'Fixture', true);
  assert.equal(partial.current.pm25, null);
  assert.ok(partial.hourly.every(point => point.pm25 === null && point.ozone === null));
  assert.equal(partial.sources.some(source => source.id === 'cams'), false);
  assert.equal(telemetry.getEndpoints().find(ep => ep.id === 'open_meteo_air').status, 'OFFLINE');
  pass('air failure does not become zero pollution or an online CAMS source');
  for (const failure of ['offline', 'empty', 'null-current']) {
    mode = failure;
    await assert.rejects(weather.fetchConsensusWeather(-7.25, 112.75, 'Fixture', true));
    assert.equal(telemetry.getLatestSnapshot(), null);
    assert.equal(telemetry.getEndpoints().find(ep => ep.id === 'open_meteo_weather').status, 'OFFLINE');
  }
  pass('network failure, HTTP 200 empty JSON, and null temperature all fail without synthetic fallback');
  mode = 'nepal';
  const nepal = await weather.fetchConsensusWeather(-7.25, 112.75, 'Time alignment fixture', true);
  assert.equal(nepal.hourly[0].time, new Date((epoch + 900) * 1000).toISOString());
  assert.equal(nepal.modelComparison.length, 0); // Returned model timestamps do not match.
  pass('hour alignment uses provider timestamps, including non-integer timezone offsets');
  mode = 'offline';
  const noSeasonWeather = await seasonal.fetchGlobalWeatherAndSeason(-7.25, 112.75);
  assert.equal(noSeasonWeather.currentTemp, null);
  assert.equal(noSeasonWeather.raw, null);
  assert.equal(noSeasonWeather.dataStatus, 'UNAVAILABLE');
  pass('season estimates cannot manufacture live weather on failure');
  mode = 'partial-models';
  const local = ai.computeDeterministicNwp({ lat: 0, lng: 0, locationName: 'Test', elevation: 0, current: { consensusTemperature: 0, apparentTemperature: 0, humidity: 80, pressure: 1010, windSpeed: 0, windDirection: 0, precipitation: 0, precipitationProb: 0 }, modelComparison: [] });
  assert.equal(local.isAiVerified, false);
  assert.equal(local.verifiedTemperature, 0);
  assert.equal(local.calibratedRainProb, 0);
  assert.equal(local.equationsStatus.some(e => e.id === 'nwp_unavailable' && e.status === 'WARNING'), true);
  const reverified = await weather.reverifyWithAi(data);
  assert.equal(reverified.aiNwpVerification.isAiVerified, false);
  assert.deepEqual(reverified.current, data.current);
  pass('failed AI remains local diagnostic and cannot overwrite provider forecast');
  const liveData = await live.fetchWeather(-7.25, 112.75, true);
  assert.equal(liveData.data.temperature, 0); // Incomplete proxy is rejected, direct data validates.
  mode = 'offline';
  const stale = await live.fetchWeather(-7.25, 112.75, true);
  assert.equal(stale.providerHealth, 'DEGRADED');
  assert.ok(stale.error);
  assert.equal(stale.lastSuccessfulFetch, liveData.lastSuccessfulFetch);
  const otherLocation = await live.fetchWeather(20, 30, true);
  assert.equal(otherLocation.data, null);
  assert.equal(otherLocation.providerHealth, 'OFFLINE');
  pass('live map rejects malformed proxy and cannot reuse another location cache');
  mode = 'partial-models';
  const quake = await bmkg.getAutoGempa();
  assert.equal(quake.magnitude, 3); // Regression: apiClient response is not Axios.
  mode = 'offline';
  assert.equal(await bmkg.getAutoGempa(), null);
  pass('BMKG response shape corrected; failure produces no invented earthquake');
  globalThis.fetch = async () => new Response('<html>not JSON</html>', { status: 200 });
  const html = await fetchCheckedJson('test', 'http://fixture', () => null);
  assert.equal(html.attempt.status, 'FAILED');
  globalThis.fetch = async (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))));
  const timedOut = await fetchCheckedJson('test', 'http://fixture', () => null, {}, 5);
  assert.equal(timedOut.attempt.status, 'FAILED');
  assert.equal(timedOut.data, null);
  pass('HTML 200 and timeout cannot pass JSON ingestion');
  const diagnostic = buildAtmosphericDiagnostic(0, { consensusTemperature: 0, apparentTemperature: 0, humidity: 80, pressure: 1010, windSpeed: 0, windDirection: 0, precipitation: 0, precipitationProb: null });
  assert.equal(diagnostic.calibratedRainProb, null);
  assert.equal(diagnostic.isAiVerified, false);
  assert.throws(() => buildAtmosphericDiagnostic(0, { consensusTemperature: null }));
  pass('backend diagnostics preserve missing probability and reject incomplete input');

  // Real Express route execution with controlled upstream responses.
  const app = express(); app.use('/bmkg', bmkgRouter); app.get('/weather', getCurrentWeatherProxy); app.get('/fires', getHotspots);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let upstreamMode = 'invalid';
  globalThis.fetch = async () => upstreamMode === 'good' ? json(base()) : upstreamMode === 'empty-quake' ? json({}) : Promise.reject(new Error('UPSTREAM_FAILED_TEST'));
  try {
    const initial = await originalFetch(`${origin}/weather?lat=-7.25&lng=112.75`);
    assert.equal(initial.status, 502); assert.equal((await initial.json()).success, false);
    upstreamMode = 'good';
    const realWeather = await originalFetch(`${origin}/weather?lat=-7.25&lng=112.75`);
    assert.equal((await realWeather.json()).data.temperature, 0);
    const originalNow = Date.now;
    upstreamMode = 'invalid';
    try {
      Date.now = () => originalNow() + 121000;
      const staleWeather = await originalFetch(`${origin}/weather?lat=-7.25&lng=112.75`);
      const staleBody = await staleWeather.json();
      assert.equal(staleBody.success, false); assert.equal(staleBody.source, 'stale_server_cache');
      assert.equal(staleBody.data.temperature, 0);
    } finally { Date.now = originalNow; }
    pass('failed backend refresh marks stale cache as failed retrieval');
    upstreamMode = 'empty-quake';
    const badQuake = await originalFetch(`${origin}/bmkg/gempa/terkini`);
    assert.equal(badQuake.status, 502); assert.equal((await badQuake.json()).success, false);
    for (const path of ['/weather/warnings', '/air-quality', '/climate/indicators', '/geophysics/potential', '/time-sun', '/seismology/microzonation']) {
      const r = await originalFetch(origin + '/bmkg' + path); const body = await r.json();
      assert.equal(r.status, 503); assert.equal(body.success, false); assert.equal(body.data, null);
    }
    const originalKey = process.env.FIRMS_MAP_KEY;
    try {
      process.env.FIRMS_MAP_KEY = 'TEST_ONLY_KEY';
      globalThis.fetch = async () => new Response('<html>error</html>', { status: 200 });
      const badFires = await originalFetch(`${origin}/fires?bbox=94,-11,141.5,6.5`);
      assert.equal(badFires.status, 502); assert.equal((await badFires.json()).success, false);
      globalThis.fetch = async () => json({ success: false, data: [], reason: { message: 'TEST_NOT_CONFIGURED' } });
      assert.deepEqual(await fires.getActiveHotspots(), []);
      assert.equal(fires.getRetrievalStatus().status, 'FAILED');
      globalThis.fetch = async () => json({});
      const badCatalog = await stac.searchSatelliteScenes({ bbox: [112,-8,113,-7] });
      assert.equal(badCatalog.success, false);
      pass('HTML 200 FIRMS, unavailable hotspots, and empty STAC cannot appear successful');
    } finally { if (originalKey === undefined) delete process.env.FIRMS_MAP_KEY; else process.env.FIRMS_MAP_KEY = originalKey; }
    pass('real backend routes reject invalid upstream and all unconnected numeric BMKG menus');
  } finally { await new Promise(resolve => server.close(resolve)); }
  console.log(`Weather integrity: ${checks} groups passed.`);
} finally { globalThis.fetch = originalFetch; }
