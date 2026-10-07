import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { validateProviderCurrent } from '../apps/server/src/services/weatherIntegrity.js';

const bundle = await build({ stdin: { contents: `
  export { weatherAggregatorService as weather, WEATHER_MODELS } from './apps/web/src/services/weatherAggregatorService.ts';
  export { metNorwayService as met } from './apps/web/src/services/metNorwayService.ts';
  export { geospatialDataTelemetryService as telemetry } from './apps/web/src/services/geospatialDataTelemetryService.ts';
  export { mapWeatherLiveService as live } from './apps/web/src/services/geospatial/mapWeatherLiveService.ts';
  export { validateCurrentWeather, validateOpenMeteoModelPayload, validateMetNorwayPayload, isValidIsoDateTime, fetchCheckedJson } from './apps/web/src/services/weatherDataIntegrity.ts';
`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, format: 'esm', platform: 'node', define: { 'import.meta.env': '{}' } });
globalThis.localStorage = { getItem: () => null, setItem() {} };
const m = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString('base64')}`);
const originalFetch = globalThis.fetch;
const epoch = Math.floor(Date.now() / 3600000) * 3600;
const times = Array.from({ length: 48 }, (_, i) => epoch + i * 3600);
const filled = v => times.map(() => v);
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
const weatherBody = (lat, lng) => ({ latitude: lat, longitude: lng, timezone: 'UTC',
  current: { time: epoch, interval: 900, temperature_2m: 20, apparent_temperature: -2,
    relative_humidity_2m: 80, precipitation: 0, weather_code: 3, cloud_cover: 60,
    surface_pressure: 1000, wind_speed_10m: 0, wind_direction_10m: 0, wind_gusts_10m: 0 },
  hourly: { time: times, temperature_2m: filled(20), apparent_temperature: filled(-2),
    relative_humidity_2m: filled(80), precipitation: filled(0), precipitation_probability: filled(0),
    weather_code: filled(3), cloud_cover: filled(60), surface_pressure: filled(1000),
    wind_speed_10m: filled(0), wind_direction_10m: filled(0), wind_gusts_10m: filled(0), uv_index: filled(0) },
  daily: { time: [epoch], temperature_2m_max: [25], temperature_2m_min: [15], apparent_temperature_max: [-1],
    precipitation_sum: [0], precipitation_probability_max: [0], wind_speed_10m_max: [0], weather_code: [3], uv_index_max: [0] },
});
const modelBody = (lat, lng) => ({ latitude: lat, longitude: lng, hourly: { time: times,
  ...Object.fromEntries(m.WEATHER_MODELS.map(model => [`temperature_2m_${model.id}`, filled(20)])),
} });
const airBody = (lat, lng) => ({ latitude: lat, longitude: lng, current: { time: epoch, pm2_5: 10, pm10: 20, ozone: 30 },
  hourly: { time: times, pm2_5: filled(10), pm10: filled(20), ozone: filled(30) } });
const metBody = (lat, lng) => ({ geometry: { type: 'Point', coordinates: [lng, lat] }, properties: {
  meta: { updated_at: new Date().toISOString(), units: { air_temperature: 'celsius', relative_humidity: '%' } },
  timeseries: [{ time: new Date().toISOString(), data: { instant: { details: { air_temperature: 22, relative_humidity: 80 } } } }],
} });

test('Current validation rejects absurd temperature, invalid WMO codes and wrong units in both client and server', () => {
  const b = weatherBody(-7, 110);
  assert.equal(m.validateCurrentWeather(b, -7, 110), null);
  assert.equal(validateProviderCurrent(b.current), true);
  for (const [field, value] of [['temperature_2m', 999], ['weather_code', 999], ['surface_pressure', 9999], ['wind_speed_10m', 999]]) {
    const current = { ...b.current, [field]: value };
    assert.ok(m.validateCurrentWeather({ ...b, current }, -7, 110));
    assert.equal(validateProviderCurrent(current), false);
  }
  assert.ok(m.validateCurrentWeather({ ...b, hourly_units: { precipitation: 'inch' } }, -7, 110));
  assert.equal(m.isValidIsoDateTime('2026-10-04T12:00:00+14:59'), false);
});

test('Bad primary current data uses real fallback instead of publishing 999 degrees as SUCCESS', async () => {
  const lat = -7.601, lng = 110;
  globalThis.fetch = async url => {
    const u = new URL(url);
    if (u.hostname === 'api.met.no') return json(metBody(lat, lng));
    if (u.hostname.includes('air-quality')) return json(airBody(lat, lng));
    if (u.searchParams.has('models')) return json(modelBody(lat, lng));
    const b = weatherBody(lat, lng); b.current.temperature_2m = 999; return json(b);
  };
  const result = await m.weather.fetchConsensusWeather(lat, lng, 'bad-current', true);
  assert.equal(result.current.consensusTemperature, 22);
  assert.equal(result.sourceFetches.find(a => a.id === 'open_meteo_weather').status, 'FAILED');
  assert.equal(result.sources[0].id, 'met_norway');
});

test('Hourly invalid humidity/temperature and negative air measurements are excluded, signed temperatures and valid zero stay intact', async () => {
  const lat = -7.602, lng = 110;
  globalThis.fetch = async url => {
    const u = new URL(url);
    if (u.hostname.includes('air-quality')) { const b = airBody(lat, lng); b.hourly.pm2_5[0] = -10; b.current.pm10 = -20; return json(b); }
    if (u.searchParams.has('models')) return json(modelBody(lat, lng));
    const b = weatherBody(lat, lng); b.hourly.temperature_2m[1] = 999; b.hourly.relative_humidity_2m[2] = 999;
    b.hourly.precipitation_probability[0] = 999; b.daily.temperature_2m_min[0] = 50; return json(b);
  };
  const result = await m.weather.fetchConsensusWeather(lat, lng, 'mixed-values', true);
  assert.equal(result.hourly.length, 22);
  assert.equal(result.hourly[0].temperature, 20);
  assert.equal(result.hourly[0].apparentTemp, -2);
  assert.equal(result.hourly[0].precipitation, 0);
  assert.equal(result.hourly[0].precipitationProb, null);
  assert.equal(result.hourly[0].pm25, null);
  assert.equal(result.current.pm10, null);
  assert.equal(result.daily.length, 0);
  assert.equal(result.sourceFetches.find(a => a.id === 'open_meteo_air').status, 'PARTIAL');
  assert.equal(result.sourceFetches.find(a => a.id === 'open_meteo_weather').status, 'PARTIAL');
});

test('Failed combined model request retries every registered model independently and joins by time without inventing fetch success', async () => {
  const lat = -7.603, lng = 110, called = [];
  let active = 0, peak = 0;
  globalThis.fetch = async url => {
    const u = new URL(url), models = u.searchParams.get('models');
    if (u.hostname.includes('air-quality')) return json(airBody(lat, lng));
    if (models?.includes(',')) return json({ error: true, reason: 'One model unavailable' }, 503);
    if (models) { called.push(models); active++; peak = Math.max(peak, active); await new Promise(r => setTimeout(r, 5)); active--; return json({ latitude: lat, longitude: lng, hourly: { time: times.map(t => t * 1000), temperature_2m: filled(21) } }); }
    return json(weatherBody(lat, lng));
  };
  const result = await m.weather.fetchConsensusWeather(lat, lng, 'isolated-model-retries', true);
  assert.deepEqual(called.sort(), m.WEATHER_MODELS.map(v => v.id).sort());
  assert.equal(result.modelComparison.length, 9);
  assert.equal(result.sourceFetches.find(a => a.id === 'open_meteo_models').status, 'FAILED');
  assert.equal(result.sourceFetches.filter(a => a.id.startsWith('open_meteo_model_')).length, 9);
  assert.equal(result.hourly[0].ecmwfTemp, 21);
  assert.ok(peak <= 3, 'Model recovery must not flood the provider with nine concurrent requests');
});

test('MET point duplicates and invalid gust/precipitation have identical rejection counts in audit and consumed points', async () => {
  const lat = -7.604, lng = 110, b = metBody(lat, lng), point = b.properties.timeseries[0];
  b.properties.timeseries.push(structuredClone(point));
  const bad = structuredClone(point); bad.time = new Date(Date.now() + 3600000).toISOString(); bad.data.instant.details.wind_speed_of_gust = 999;
  b.properties.timeseries.push(bad);
  const v = m.validateMetNorwayPayload(b, lat, lng);
  assert.equal(v.status, 'PARTIAL'); assert.equal(v.acceptedCount, 1); assert.equal(v.rejectedCount, 2);
  globalThis.fetch = async () => json(b);
  const result = await m.met.fetchForecast(lat, lng);
  assert.equal(result.points.length, 1); assert.equal(result.attempt.rejectedCount, 2);
  b.properties.meta.updated_at = new Date(Date.now() + 86400000).toISOString();
  assert.equal(m.validateMetNorwayPayload(b, lat, lng).valid, false);
});

test('Expired air is OFFLINE in manual audit; failed map fetches are throttled and never acquire a current badge', async () => {
  const lat = -7.605, lng = 110, old = airBody(lat, lng); old.current.time -= 86400;
  globalThis.fetch = async () => json(old);
  const audit = await m.telemetry.pingEndpoint('open_meteo_air', lat, lng);
  assert.equal(audit.status, 'OFFLINE');
  const partial = airBody(lat, lng); partial.current.pm10 = null;
  globalThis.fetch = async () => json(partial);
  assert.equal((await m.telemetry.pingEndpoint('open_meteo_air', lat, lng)).status, 'DEGRADED');
  let calls = 0;
  globalThis.fetch = async () => { calls++; return json({ success: false, error: 'Outage fixture' }, 503); };
  const first = await m.live.fetchWeather(lat, lng, true);
  assert.equal(first.data, null); assert.equal(first.providerHealth, 'OFFLINE');
  assert.equal(first.freshness.status, 'UNAVAILABLE');
  const before = calls;
  await m.live.fetchWeather(lat, lng, false);
  assert.equal(calls, before, 'Failure renders must not hammer upstream APIs');
});

test('A delayed response for a previous map location cannot overwrite the latest location', async () => {
  const oldLat = -7.606, latestLat = -7.607, lng = 110;
  let releaseOld;
  globalThis.fetch = async url => {
    const u = new URL(url, 'http://localhost'), lat = Number(u.searchParams.get('lat') || u.searchParams.get('latitude'));
    if (u.pathname.startsWith('/api/') && lat === oldLat) return new Promise(resolve => { releaseOld = resolve; });
    if (u.pathname.startsWith('/api/')) return json({ success: false }, 503);
    const b = weatherBody(lat, lng); b.current.temperature_2m = lat === latestLat ? 24 : 18; return json(b);
  };
  const old = m.live.fetchWeather(oldLat, lng, true);
  await new Promise(r => setTimeout(r, 0));
  const latest = await m.live.fetchWeather(latestLat, lng, true);
  assert.equal(latest.data.temperature, 24);
  releaseOld(json({ success: false }, 503));
  await old;
  assert.equal(m.live.getState().data.temperature, 24, 'Old request must not replace latest map state');
});

test.after(() => { globalThis.fetch = originalFetch; });
