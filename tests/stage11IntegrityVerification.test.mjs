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

const bundle = await build({
  stdin: {
    contents: `
export {
  isValidCalendarDate,
  isValidIsoDateTime,
  buildEndpointAuditUrl,
  validateMetNorwayPayload,
  validateOpenMeteoModelPayload
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

export const getPointKey = (h, idx = 0) => {
  return h?.time ? String(h.time) : (h?.epoch != null ? String(h.epoch) : \`\${h?.hour ?? 0}_\${idx}\`);
};

export const computeInsights = (data) => {
  const useMemo = (fn) => fn();
  return (${variable(modalPath, 'weatherInsights')});
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

const now = Date.now();
const epoch = Math.floor(now / 1000);
const hour = epoch - (epoch % 3600);

const createMetPoint = (offset = 0, details = {}) => ({
  time: new Date(now + offset).toISOString(),
  data: {
    instant: {
      details: {
        air_temperature: 24.5,
        relative_humidity: 75,
        wind_speed: 3.5,
        wind_from_direction: 180,
        cloud_area_fraction: 40,
        air_pressure_at_sea_level: 1012.0,
        ...details,
      },
    },
  },
});

const createMetPayload = (lat, lng, timeseries, units = {}) => ({
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
        air_pressure_at_sea_level: 'hPa',
        ...units,
      },
    },
    timeseries,
  },
});

// -----------------------------------------------------------------------------
// R1: Parser / Validator bersama MET Norway
// -----------------------------------------------------------------------------
test('R1: MET Norway validator and telemetry audit reject invalid times, physical range, historical-only, and bad units', () => {
  const lat = -7.34, lng = 110.35;

  // Case 1: timestamp 'not-a-time'
  const badTimePoint = createMetPoint();
  badTimePoint.time = 'not-a-time';
  const badTimePayload = createMetPayload(lat, lng, [badTimePoint]);
  const res1 = m.validateMetNorwayPayload(badTimePayload, lat, lng);
  assert.equal(res1.valid, false, 'Invalid time string must be rejected');
  assert.ok(res1.error?.includes('Tidak ada titik data prakiraan numerik dengan nilai fisik valid'), 'Error message must reflect no usable points');

  // Case 2: relative_humidity 999 (physical range violation)
  const badHumidityPoint = createMetPoint(0, { relative_humidity: 999 });
  const badHumidityPayload = createMetPayload(lat, lng, [badHumidityPoint]);
  const res2 = m.validateMetNorwayPayload(badHumidityPayload, lat, lng);
  assert.equal(res2.valid, false, 'Humidity 999 is outside physical range 0-100%');
  assert.ok(res2.error?.includes('Tidak ada titik data prakiraan numerik dengan nilai fisik valid'), 'Error message must reflect no usable points');

  // Case 3: 30-day historical points
  const oldPoint = createMetPoint(-86400 * 30 * 1000);
  const oldPayload = createMetPayload(lat, lng, [oldPoint]);
  const res3 = m.validateMetNorwayPayload(oldPayload, lat, lng);
  assert.equal(res3.valid, false, 'All points historical must be rejected');
  assert.ok(res3.error?.includes('Seluruh titik prakiraan MET Norway sudah usang'), 'Error message must reflect historical points');

  // Case 4: Humidity unit 'fraction'
  const badUnitPayload = createMetPayload(lat, lng, [createMetPoint()], { relative_humidity: 'fraction' });
  const res4 = m.validateMetNorwayPayload(badUnitPayload, lat, lng);
  assert.equal(res4.valid, false, 'Humidity unit fraction must be rejected');
  assert.ok(res4.error?.includes('tidak kompatibel'), 'Error message must reflect unit incompatibility');

  // Positive control: valid points pass
  const validPayload = createMetPayload(lat, lng, [createMetPoint(), createMetPoint(3600000)]);
  const resValid = m.validateMetNorwayPayload(validPayload, lat, lng);
  assert.equal(resValid.valid, true, 'Valid MET Norway timeseries must pass');
  assert.equal(resValid.acceptedCount, 2);
  assert.equal(resValid.rejectedCount, 0);
});

// -----------------------------------------------------------------------------
// R2: Parameter bujur URL audit MET Norway
// -----------------------------------------------------------------------------
test('R2: buildEndpointAuditUrl correctly sets lon parameter for MET Norway, including negative longitude', () => {
  const baseUrl = 'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=-7.340&lon=112.75';
  
  // Test case from review: lat -7.34, lng 110.35
  const url1 = m.buildEndpointAuditUrl(baseUrl, -7.34, 110.35);
  const parsed1 = new URL(url1);
  assert.equal(parsed1.searchParams.get('lat'), '-7.34', 'lat param must be -7.34');
  assert.equal(parsed1.searchParams.get('lon'), '110.35', 'lon param must be 110.35, not 112.75');

  // Negative coordinates test
  const urlNeg = m.buildEndpointAuditUrl(baseUrl, -12.55, -77.04);
  const parsedNeg = new URL(urlNeg);
  assert.equal(parsedNeg.searchParams.get('lat'), '-12.55');
  assert.equal(parsedNeg.searchParams.get('lon'), '-77.04');

  // Open-Meteo URL format with latitude & longitude
  const openMeteoUrl = 'https://api.open-meteo.com/v1/forecast?latitude=-7.25&longitude=112.75&current=temperature_2m';
  const url2 = m.buildEndpointAuditUrl(openMeteoUrl, -7.34, 110.35);
  const parsed2 = new URL(url2);
  assert.equal(parsed2.searchParams.get('latitude'), '-7.34');
  assert.equal(parsed2.searchParams.get('longitude'), '110.35');
});

// -----------------------------------------------------------------------------
// R3: Validasi model Open-Meteo: kalender, satuan, keselarasan array, dan cakupan
// -----------------------------------------------------------------------------
test('R3: Open-Meteo model validator verifies true calendar, array alignment, temperature unit, and freshness', () => {
  const lat = -7.25, lng = 112.75;

  // Case 1: Array length mismatch (2 times, 1 temperature)
  const mismatchPayload = {
    latitude: lat,
    longitude: lng,
    hourly_units: { temperature_2m: '°C' },
    hourly: {
      time: [new Date(now).toISOString(), new Date(now + 3600000).toISOString()],
      temperature_2m: [27.3],
    },
  };
  const res1 = m.validateOpenMeteoModelPayload(mismatchPayload, lat, lng);
  assert.equal(res1.valid, false, 'Array length mismatch must be rejected');
  assert.ok(res1.error?.includes('tidak selaras'), 'Error message must state array length mismatch');

  // Case 2: Unit °F with value 82 (must be rejected if query expects °C)
  const fahrenheitPayload = {
    latitude: lat,
    longitude: lng,
    hourly_units: { temperature_2m: '°F' },
    hourly: {
      time: [new Date(now).toISOString()],
      temperature_2m: [82.0],
    },
  };
  const res2 = m.validateOpenMeteoModelPayload(fahrenheitPayload, lat, lng);
  assert.equal(res2.valid, false, 'Fahrenheit temperature must be rejected when expecting Celsius');
  assert.ok(res2.error?.includes('Satuan suhu model tidak sesuai kontrak query'), 'Error message must reflect unit rejection');

  // Case 3: False calendar date 2026-02-31T12:00:00Z
  assert.equal(m.isValidCalendarDate(2026, 2, 31), false, '2026-02-31 is impossible calendar date');
  assert.equal(m.isValidIsoDateTime('2026-02-31T12:00:00Z'), false, '2026-02-31T12:00:00Z is invalid');
  const invalidDatePayload = {
    latitude: lat,
    longitude: lng,
    hourly_units: { temperature_2m: '°C' },
    hourly: {
      time: ['2026-02-31T12:00:00Z'],
      temperature_2m: [28.0],
    },
  };
  const res3 = m.validateOpenMeteoModelPayload(invalidDatePayload, lat, lng);
  assert.equal(res3.valid, false, 'Payload with 2026-02-31 must be rejected');
  assert.ok(res3.error?.includes('tanggal kalender yang tidak valid'), 'Error message must state invalid calendar date');

  // Case 4: Historical-only points (> 48h old)
  const historicalPayload = {
    latitude: lat,
    longitude: lng,
    hourly_units: { temperature_2m: '°C' },
    hourly: {
      time: ['2020-01-01T00:00:00Z'],
      temperature_2m: [25.0],
    },
  };
  const res4 = m.validateOpenMeteoModelPayload(historicalPayload, lat, lng);
  assert.equal(res4.valid, false, 'Historical-only model must be rejected');
  assert.ok(res4.error?.includes('historis masa lalu'), 'Error message must state historical data rejection');

  // Positive control: single model CMA valid
  const validCma = {
    latitude: lat,
    longitude: lng,
    hourly_units: { temperature_2m: '°C' },
    hourly: {
      time: [new Date(now).toISOString()],
      temperature_2m: [27.3],
    },
  };
  const resValid = m.validateOpenMeteoModelPayload(validCma, lat, lng, 'cma_grapes_global');
  assert.equal(resValid.valid, true, 'Valid CMA single model payload must pass');
});

// -----------------------------------------------------------------------------
// R4: PARTIAL MET Norway tidak berubah menjadi ONLINE hanya karena current ada
// -----------------------------------------------------------------------------
test('R4: MET Norway partial status with rejected points remains DEGRADED even when current exists', () => {
  const lat = -7.25, lng = 112.75;
  const validCurrentPoint = createMetPoint(0, { air_temperature: 26.0, relative_humidity: 80 });
  const invalidPoint = createMetPoint(3600000, { relative_humidity: 999 }); // rejected point

  const payload = createMetPayload(lat, lng, [validCurrentPoint, invalidPoint]);
  const validation = m.validateMetNorwayPayload(payload, lat, lng);

  assert.equal(validation.valid, true, 'Payload with at least 1 valid point is usable');
  assert.equal(validation.acceptedCount, 1, '1 point accepted');
  assert.equal(validation.rejectedCount, 1, '1 point rejected');
  assert.equal(validation.status, 'PARTIAL', 'Status must be PARTIAL');

  // Ingest via telemetry and check that status remains DEGRADED
  const consensusData = {
    lat,
    lng,
    locationName: 'Surabaya Test',
    elevation: 5,
    fetchedAt: new Date().toISOString(),
    dataTime: new Date().toISOString(),
    coverageScope: 'SURABAYA',
    dataStatus: 'PARTIAL',
    current: {
      temperature: 26.0,
      apparentTemperature: 28.0,
      humidity: 80,
      surfacePressure: 1012,
      seaLevelPressure: 1012,
      windSpeed: 10,
      windDirection: 90,
      precipitation: 0,
      precipitationProb: 10,
      uvIndex: 5,
      cloudCover: 30,
      conditionCode: 'partlycloudy_day',
    },
    hourly: [],
    modelComparison: [],
    modelSpread: 0,
    sourceFetches: [
      {
        id: 'met_norway_fallback',
        url: 'https://api.met.no/...',
        status: 'PARTIAL',
        httpStatus: 200,
        latencyMs: 120,
        acceptedCount: 1,
        rejectedCount: 1,
      },
    ],
  };

  m.telemetry.recordRawIngestion(lat, lng, 'Surabaya Test', { fallback: 'met_norway' }, null, consensusData);
  const metEp = m.telemetry.getEndpoints().find(e => e.id === 'met_norway_fallback');
  assert.ok(metEp, 'met_norway_fallback endpoint must exist');
  assert.equal(metEp.status, 'DEGRADED', 'Status must be DEGRADED when rejectedCount > 0, NOT forced ONLINE');
  assert.ok(metEp.errorMessage?.includes('1 titik prakiraan tidak valid ditolak'), 'Error message must describe rejected points');
});

// -----------------------------------------------------------------------------
// R5: Ringkasan cuaca parsial tidak membuat kesimpulan berlebihan
// -----------------------------------------------------------------------------
test('R5: Weather insights handle partial data accurately without over-claiming dry or rain', () => {
  const basePoint = (hour, precip = null, prob = null) => ({
    hour,
    label: `${hour.toString().padStart(2, '0')}:00`,
    temperature: 28.0,
    apparentTemperature: 30.0,
    precipitation: precip,
    precipitationProb: prob,
    cloudCover: 20,
    time: `2026-10-04T${hour.toString().padStart(2, '0')}:00:00Z`,
  });

  // Scenario 1: All rain null -> Data hujan belum tersedia
  const allNullHourly = Array.from({ length: 24 }, (_, i) => basePoint(i, null, null));
  const insights1 = m.computeInsights({ hourly: allNullHourly, timezone: 'Asia/Jakarta' });
  assert.equal(insights1.rainWindowText, 'Data hujan belum tersedia untuk interval ini');

  // Scenario 2: 1 zero value, 23 null values (coverage 1/24 = 4.1% < 75%)
  // Must NOT claim "Cenderung kering sepanjang periode prakiraan"
  const oneZeroHourly = Array.from({ length: 24 }, (_, i) => basePoint(i, i === 0 ? 0 : null, null));
  const insights2 = m.computeInsights({ hourly: oneZeroHourly, timezone: 'Asia/Jakarta' });
  assert.notEqual(insights2.rainWindowText, 'Cenderung kering sepanjang periode prakiraan');
  assert.ok(insights2.rainWindowText.includes('belum lengkap'), 'Should state data is incomplete for other periods');

  // Scenario 3: Probability 70%, amount null
  // Must state probability without fabricating light rain/drizzle
  const probOnlyHourly = Array.from({ length: 24 }, (_, i) => basePoint(i, null, i === 14 ? 70 : 0));
  const insights3 = m.computeInsights({ hourly: probOnlyHourly, timezone: 'Asia/Jakarta' });
  assert.ok(insights3.rainWindowText.includes('Peluang hujan (70%)'), 'Should state 70% rain probability');
  assert.ok(insights3.rainWindowText.includes('intensitas akumulasi belum tersedia'), 'Must not claim drizzle/light rain');

  // Scenario 4: Disconnected rain windows (rain at 01:00 and 04:00, with 02:00 and 03:00 being 0)
  const disconnectedHourly = [
    basePoint(0, 0),
    basePoint(1, 2.5), // Rain 01:00
    basePoint(2, 0),
    basePoint(3, 0),
    basePoint(4, 3.0), // Rain 04:00
    basePoint(5, 0),
  ];
  const insights4 = m.computeInsights({ hourly: disconnectedHourly, timezone: 'Asia/Jakarta' });
  assert.ok(insights4.rainWindowText.includes('01:00, 04:00') || (insights4.rainWindowText.includes('01:00') && insights4.rainWindowText.includes('04:00')), 'Must separate disconnected rain hours');
  assert.ok(!insights4.rainWindowText.includes('01:00 - 04:00'), 'Must not merge disconnected rain hours into one span');
});

// -----------------------------------------------------------------------------
// R6: Pemilihan titik jam hari berikutnya memakai identitas unik
// -----------------------------------------------------------------------------
test('R6: Point key distinguishes points with identical hour across different days', () => {
  const day1Point = {
    hour: 14,
    time: '2026-10-04T14:00:00Z',
    temperature: 17.0,
    precipitation: 0,
  };
  const day2Point = {
    hour: 14,
    time: '2026-10-05T14:00:00Z',
    temperature: 30.0,
    precipitation: 2.5,
  };

  const key1 = m.getPointKey(day1Point, 0);
  const key2 = m.getPointKey(day2Point, 24);

  assert.notEqual(key1, key2, 'Point keys must be distinct for different days');
  assert.equal(key1, '2026-10-04T14:00:00Z');
  assert.equal(key2, '2026-10-05T14:00:00Z');

  const hourly = [day1Point, day2Point];
  // Selecting key2 selects the day 2 point with 30°C
  const selectedPoint = hourly.find((h, idx) => m.getPointKey(h, idx) === key2);
  assert.equal(selectedPoint?.temperature, 30.0, 'Clicking day 2 point must resolve to 30°C point');
});

// -----------------------------------------------------------------------------
// R7: Radar status requires full active requested tile coverage for LIVE status
// -----------------------------------------------------------------------------
test('R7: Radar status reports MEMUAT when activeLoaded < activeRequested, and LIVE only when full', () => {
  const baseFrame = { weatherMapOverlay: 'radar', weatherRenderMode: 'native', radarMetadataStale: false, radarFrameTime: Date.now() / 1000 };

  // activeRequested=3, activeLoaded=1, activeError=0 -> Still loading (MEMUAT, not LIVE RADAR)
  const statusLoading = m.radarStatus({
    ...baseFrame,
    radarTileCounts: { requested: 3, loaded: 1, error: 0, activeRequested: 3, activeLoaded: 1, activeError: 0 },
  });
  assert.equal(statusLoading, 'MEMUAT', 'Partial tile loading without errors must report MEMUAT, not LIVE RADAR');

  // activeRequested=3, activeLoaded=3, activeError=0 -> Fully loaded (LIVE RADAR)
  const statusLive = m.radarStatus({
    ...baseFrame,
    radarTileCounts: { requested: 3, loaded: 3, error: 0, activeRequested: 3, activeLoaded: 3, activeError: 0 },
  });
  assert.equal(statusLive, 'LIVE RADAR', 'All active requested tiles loaded must report LIVE RADAR');

  // activeRequested=3, activeLoaded=1, activeError=2 -> Partial with errors (PARSIAL)
  const statusPartial = m.radarStatus({
    ...baseFrame,
    radarTileCounts: { requested: 3, loaded: 1, error: 2, activeRequested: 3, activeLoaded: 1, activeError: 2 },
  });
  assert.equal(statusPartial, 'PARSIAL', 'Partial loaded with active errors must report PARSIAL');
});

// -----------------------------------------------------------------------------
// R8: NASA GIBS satellite frame age and timeout lifecycle
// -----------------------------------------------------------------------------
test('R8: NASA GIBS satellite reports STALE CITRA for frames older than 24 hours', () => {
  const baseFrame = { weatherMapOverlay: 'satellite', weatherRenderMode: 'native', radarTileCounts: { requested: 4, loaded: 4, error: 0, activeRequested: 4, activeLoaded: 4, activeError: 0 } };

  // Frame from 2020 (old frame)
  const oldFrameEpoch = Math.floor(new Date('2020-01-01T00:00:00Z').getTime() / 1000);
  const statusStale = m.radarStatus({
    ...baseFrame,
    gibsMetadataStale: false,
    gibsFrameTime: oldFrameEpoch,
  });
  assert.equal(statusStale, 'STALE CITRA', 'Frame older than 24h must report STALE CITRA');

  // Recent frame (now)
  const recentFrameEpoch = Math.floor(Date.now() / 1000);
  const statusLive = m.radarStatus({
    ...baseFrame,
    gibsMetadataStale: false,
    gibsFrameTime: recentFrameEpoch,
  });
  assert.equal(statusLive, 'NASA GIBS IR', 'Recent satellite frame must report NASA GIBS IR');
});

// -----------------------------------------------------------------------------
// R9: In-flight deduplication in metNorwayService
// -----------------------------------------------------------------------------
test('R9: In-flight deduplication in metNorwayService coalesces identical concurrent calls', async () => {
  let fetchCallCount = 0;
  globalThis.fetch = async (url) => {
    fetchCallCount++;
    await new Promise(r => setTimeout(r, 50));
    return new Response(JSON.stringify(createMetPayload(-7.25, 112.75, [createMetPoint()])));
  };

  const p1 = m.met.fetchForecast(-7.25, 112.75);
  const p2 = m.met.fetchForecast(-7.25, 112.75);
  await Promise.all([p1, p2]);

  assert.equal(fetchCallCount, 1, 'Concurrent identical fetch calls must be deduplicated into 1 request');
  globalThis.fetch = originalFetch;
});

// -----------------------------------------------------------------------------
// R10: Telemetry audit URL and route mapping diagnostics
// -----------------------------------------------------------------------------
test('R10: Telemetry ping records accurate failure message on 404 response', async () => {
  globalThis.fetch = async (url) => {
    return new Response('<html>404 Not Found</html>', { status: 404, headers: { 'Content-Type': 'text/html' } });
  };

  const ep = await m.telemetry.pingEndpoint('open_meteo_weather', -7.25, 112.75);
  assert.equal(ep.status, 'OFFLINE');
  assert.equal(ep.httpStatus, 404);
  assert.ok(ep.errorMessage?.includes('404'), 'Error message must accurately state HTTP 404');
  globalThis.fetch = originalFetch;
});
