import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { build } = require('esbuild');

// Bundle client services using esbuild to test real application modules
const bundle = await build({
  stdin: {
    contents: `
      export { weatherAggregatorService, WEATHER_MODELS } from './apps/web/src/services/weatherAggregatorService.ts';
      export { geospatialDataTelemetryService } from './apps/web/src/services/geospatialDataTelemetryService.ts';
      export { atmosphericNwpAiService } from './apps/web/src/services/atmosphericNwpAiService.ts';
      export { validateAirQuality, weatherValue } from './apps/web/src/services/weatherValueValidation.ts';
      export { validateOpenMeteoModelPayload, validateMetNorwayPayload } from './apps/web/src/services/weatherDataIntegrity.ts';
    `,
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  define: { 'import.meta.env': '{}' },
});

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const clientModules = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString('base64')}`);
const { weatherAggregatorService, geospatialDataTelemetryService, atmosphericNwpAiService, validateAirQuality, validateOpenMeteoModelPayload } = clientModules;

// Import server services
const { buildAtmosphericDiagnostic } = await import('../apps/server/src/services/weatherIntegrity.js');
const { saveWeatherInterval, getWeatherIntervals, pool } = await import('../apps/server/src/repositories/repository.js');

test('R1: MET Norway fallback preserves raw payload, matrix rows, separates sea-level pressure, and passes temperature to AI', async () => {
  const lat = -7.251;
  const lng = 112.751;
  const nowIso = new Date().toISOString();

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const u = new URL(url, 'http://localhost');
    if (u.hostname === 'api.met.no') {
      return new Response(JSON.stringify({
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {
          meta: {
            updated_at: nowIso,
            units: {
              air_temperature: 'celsius',
              relative_humidity: '%',
              air_pressure_at_sea_level: 'hPa',
              wind_speed: 'm/s',
            },
          },
          timeseries: [
            {
              time: nowIso,
              data: {
                instant: {
                  details: {
                    air_temperature: 23.5,
                    relative_humidity: 78,
                    air_pressure_at_sea_level: 1011.2,
                    wind_speed: 3.2,
                    wind_from_direction: 180,
                  },
                },
              },
            },
          ],
        },
      }), { status: 200 });
    }
    return new Response(JSON.stringify({ success: false, error: 'Open-Meteo Primary Offline' }), { status: 503 });
  };

  try {
    const weather = await weatherAggregatorService.fetchConsensusWeather(lat, lng, 'Surabaya Fallback Test', true);
    assert.equal(weather.current?.consensusTemperature, 23.5, 'Displayed consensus temperature must match MET Norway temperature');
    assert.equal(weather.current?.pressure, null, 'Surface pressure must remain null (distinct from sea level pressure)');

    const snapshot = geospatialDataTelemetryService.getLatestSnapshot();
    assert.ok(snapshot, 'Telemetry snapshot must be created');
    assert.equal(snapshot.rawParameters.rawTemperature, 23.5, 'rawParameters.rawTemperature must contain MET temperature');
    assert.equal(snapshot.rawParameters.rawSurfacePressure, null, 'rawParameters.rawSurfacePressure must stay null for MET Norway');
    assert.equal(snapshot.rawParameters.rawSeaLevelPressure, 1011.2, 'rawParameters.rawSeaLevelPressure must contain sea-level pressure');
    assert.ok(snapshot.regionalModelEntries.length >= 1, 'regionalModelEntries matrix must have at least 1 entry');
    assert.ok(Array.isArray(snapshot.rawWeatherResponse?.properties?.timeseries), 'snapshot must preserve original MET timeseries');

    let aiBody = null;
    globalThis.fetch = async (_url, options) => {
      aiBody = JSON.parse(options.body);
      return new Response(JSON.stringify({ success: false, reason: { code: 'TEST_ONLY' } }));
    };

    await geospatialDataTelemetryService.pingEndpoint('ai_nwp', lat, lng);
    assert.ok(aiBody, 'AI endpoint must receive audit payload');
    assert.equal(aiBody.current.consensusTemperature, 23.5, 'AI request must receive the valid MET temperature');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('R2: Partial diagnostic runs Coriolis without throwing when surface pressure is null', () => {
  const payload = {
    lat: -7.25,
    lng: 112.75,
    locationName: 'No Pressure Fixture',
    elevation: 10,
    current: {
      consensusTemperature: 25.0,
      apparentTemperature: 26.0,
      humidity: 80,
      pressure: null,
      windSpeed: 5,
      windDirection: 90,
      precipitation: 0,
      precipitationProb: null,
    },
    modelComparison: [],
  };

  // Client diagnostic
  const clientDiag = atmosphericNwpAiService.computeDeterministicNwp(payload);
  assert.equal(clientDiag.verifiedTemperature, 25.0);
  assert.equal(clientDiag.airDensityKgM3, null, 'Air density must be null when pressure is missing');
  assert.ok(Number.isFinite(clientDiag.coriolisParamF), 'Coriolis must be calculated');
  const idealGasStatus = clientDiag.equationsStatus.find(e => e.id === 'ideal_gas');
  assert.equal(idealGasStatus?.status, 'WARNING', 'Ideal gas equation must report WARNING when pressure is missing');

  // Server diagnostic
  const serverDiag = buildAtmosphericDiagnostic(payload.lat, payload.current);
  assert.equal(serverDiag.verifiedTemperature, 25.0);
  assert.equal(serverDiag.airDensityKgM3, null, 'Server air density must be null when pressure is missing');
  assert.ok(Number.isFinite(serverDiag.coriolisParamF), 'Server Coriolis must be calculated');
});

test('R3: AI response with calibratedRainProb: null is accepted, while invalid probabilities are rejected', async () => {
  const payload = {
    lat: -7.25,
    lng: 112.75,
    locationName: 'Probability Fixture',
    elevation: 10,
    current: {
      consensusTemperature: 24.0,
      apparentTemperature: 24.0,
      humidity: 75,
      pressure: 1010,
      windSpeed: 4,
      windDirection: 120,
      precipitation: 0,
      precipitationProb: null,
    },
    modelComparison: [],
  };

  const originalFetch = globalThis.fetch;
  const diag = atmosphericNwpAiService.computeDeterministicNwp(payload);

  try {
    // 1. Valid response with null calibratedRainProb
    globalThis.fetch = async () => new Response(JSON.stringify({
      success: true,
      data: {
        ...diag,
        isAiVerified: true,
        calibratedRainProb: null,
        scientificBriefing: 'Briefing valid dengan probabilitas null',
        modelName: 'gemini-test',
      },
    }));

    const validResult = await atmosphericNwpAiService.verifyForecastWithNwpAi(payload);
    assert.equal(validResult.isAiVerified, true, 'AI response with null calibratedRainProb must be accepted');
    assert.equal(validResult.calibratedRainProb, null);
    assert.equal(validResult.modelName, 'gemini-test');

    // 2. Invalid response with probability out of bounds (> 100)
    globalThis.fetch = async () => new Response(JSON.stringify({
      success: true,
      data: {
        ...diag,
        isAiVerified: true,
        calibratedRainProb: 150,
        scientificBriefing: 'Briefing invalid probabilitas',
      },
    }));

    // Fresh payload to bypass cache
    const freshPayload = { ...payload, lat: -7.2599 };
    const invalidResult = await atmosphericNwpAiService.verifyForecastWithNwpAi(freshPayload);
    assert.equal(invalidResult.isAiVerified, false, 'Out-of-bounds probability must be rejected by client validator');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('R4: Snapshot model comparison is fully transmitted to AI endpoint audit', async () => {
  const lat = -7.252;
  const lng = 112.752;
  const epoch = Math.floor(Date.now() / 3600000) * 3600;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const u = new URL(url, 'http://localhost');
    if (u.hostname.includes('air-quality')) {
      return new Response(JSON.stringify({
        latitude: lat, longitude: lng,
        current: { time: epoch, pm2_5: 12, pm10: 22, ozone: 32 },
        hourly: { time: [epoch], pm2_5: [12], pm10: [22], ozone: [32] },
      }));
    }
    if (u.searchParams.has('models')) {
      return new Response(JSON.stringify({
        latitude: lat, longitude: lng,
        hourly: {
          time: [epoch],
          ...Object.fromEntries(clientModules.WEATHER_MODELS.map(m => [`temperature_2m_${m.id}`, [26.5]])),
        },
      }));
    }
    return new Response(JSON.stringify({
      latitude: lat, longitude: lng, timezone: 'UTC',
      current: {
        time: epoch, interval: 900,
        temperature_2m: 26.5, apparent_temperature: 27.0,
        relative_humidity_2m: 75, precipitation: 0, weather_code: 1,
        cloud_cover: 30, surface_pressure: 1012, wind_speed_10m: 10,
        wind_direction_10m: 180, wind_gusts_10m: 12,
      },
      hourly: {
        time: [epoch],
        temperature_2m: [26.5], relative_humidity_2m: [75],
        precipitation: [0], weather_code: [1], cloud_cover: [30],
        surface_pressure: [1012], wind_speed_10m: [10], wind_direction_10m: [180],
      },
      daily: { time: [] },
    }));
  };

  try {
    const primary = await weatherAggregatorService.fetchConsensusWeather(lat, lng, 'Primary Test', true);
    assert.ok(primary.modelComparison.length >= 7, 'Primary should have parsed multi-model comparisons');

    let sentBody = null;
    globalThis.fetch = async (_url, options) => {
      sentBody = JSON.parse(options.body);
      return new Response(JSON.stringify({ success: false, reason: { code: 'TEST_ONLY' } }));
    };

    await geospatialDataTelemetryService.pingEndpoint('ai_nwp', lat, lng);
    assert.ok(sentBody, 'AI NWP ping must generate body');
    assert.equal(sentBody.modelComparison.length, primary.modelComparison.length, 'Audit must transmit all available models from snapshot');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('R5: Air quality audit URL includes hourly parameters matching validator contract', () => {
  const endpoints = geospatialDataTelemetryService.getEndpoints();
  const airEp = endpoints.find(e => e.id === 'open_meteo_air');
  assert.ok(airEp, 'open_meteo_air endpoint must exist');
  assert.ok(airEp.url.includes('hourly=pm10,pm2_5,ozone'), 'Air quality audit URL must include hourly parameters');

  const bomEp = endpoints.find(e => e.id === 'open_meteo_model_bom');
  assert.ok(bomEp?.url.includes('forecast_days=14'), 'BoM audit URL must include forecast_days=14');
  assert.ok(bomEp?.url.includes('timeformat=unixtime'), 'BoM audit URL must specify timeformat=unixtime');
});

test('R6: Server repository filters by locationKey before LIMIT', async () => {
  const targetKey = '-7.990,112.990';
  const prefixKey = '-7.99,112.99';

  if (pool) {
    try {
      await pool.query("DELETE FROM weather_training_intervals WHERE (data->>'locationKey') LIKE '-7.99%' OR id LIKE 'test-%'");
    } catch (e) {
      console.warn('Could not clean test records from pool:', e.message);
    }
  }

  try {
    // Populate in-memory repository with multiple locations
    for (let i = 0; i < 60; i++) {
      await saveWeatherInterval({
        id: `test-other-${i}`,
        locationKey: '-6.200,106.816',
        locationName: 'Jakarta Record',
        timestamp: Date.now() - i * 1000,
      });
    }

    await saveWeatherInterval({
      id: 'test-target-isolated',
      locationKey: targetKey,
      locationName: 'Surabaya Target Record',
      timestamp: Date.now(),
    });

    // Query specifically for targetKey with limit 10
    const results = await getWeatherIntervals(targetKey, 10);
    assert.equal(results.length, 1, 'Target location must be returned even if other locations exceed the limit');
    assert.equal(results[0].locationName, 'Surabaya Target Record');

    // Prefix matching test (3 decimal vs 2 decimal)
    const prefixResults = await getWeatherIntervals(prefixKey, 10);
    assert.equal(prefixResults.length, 1, 'Prefix matching must resolve 2-decimal queries to 3-decimal keys');
  } finally {
    if (pool) {
      try {
        await pool.query("DELETE FROM weather_training_intervals WHERE (data->>'locationKey') LIKE '-7.99%' OR id LIKE 'test-%'");
      } catch (e) {}
    }
  }
});
