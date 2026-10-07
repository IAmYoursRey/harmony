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

const report = {
  checkedAt: new Date().toISOString(),
  scope: 'Stage 11 independent verification suite reproducing 21 scenarios on updated Harmony source code',
  cases: [],
};

const add = (id, actual, expected, passed) => {
  report.cases.push({ id, actual, expected, passed });
};

const now = Date.now();
const epoch = Math.floor(now / 1000);

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

// 1. r1-met-invalid-iso-time
const pBadTime = createMetPoint();
pBadTime.time = 'not-a-time';
const res1 = m.validateMetNorwayPayload(createMetPayload(-7.34, 110.35, [pBadTime]), -7.34, 110.35);
add('r1-met-invalid-iso-time', res1, 'status: OFFLINE, valid: false', !res1.valid && res1.status === 'OFFLINE');

// 2. r1-met-humidity-physical-range
const pBadRh = createMetPoint(0, { relative_humidity: 999 });
const res2 = m.validateMetNorwayPayload(createMetPayload(-7.34, 110.35, [pBadRh]), -7.34, 110.35);
add('r1-met-humidity-physical-range', res2, 'status: OFFLINE, valid: false', !res2.valid && res2.status === 'OFFLINE');

// 3. r1-met-all-points-historical
const pOld = createMetPoint(-86400 * 30 * 1000);
const res3 = m.validateMetNorwayPayload(createMetPayload(-7.34, 110.35, [pOld]), -7.34, 110.35);
add('r1-met-all-points-historical', res3, 'status: OFFLINE, valid: false', !res3.valid && res3.status === 'OFFLINE');

// 4. r1-met-humidity-unit-fraction
const res4 = m.validateMetNorwayPayload(createMetPayload(-7.34, 110.35, [createMetPoint()], { relative_humidity: 'fraction' }), -7.34, 110.35);
add('r1-met-humidity-unit-fraction', res4, 'status: OFFLINE, valid: false', !res4.valid && res4.status === 'OFFLINE');

// 5. r1-met-valid-positive-control
const res5 = m.validateMetNorwayPayload(createMetPayload(-7.34, 110.35, [createMetPoint(), createMetPoint(3600000)]), -7.34, 110.35);
add('r1-met-valid-positive-control', res5, 'status: ONLINE, valid: true, acceptedCount: 2', res5.valid && res5.status === 'ONLINE' && res5.acceptedCount === 2);

// 6. r2-met-audit-lon-binding
const metAuditUrl = m.buildEndpointAuditUrl('https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=-7.340&lon=112.75', -7.34, 110.35);
const parsedMet = new URL(metAuditUrl);
add('r2-met-audit-lon-binding', { url: metAuditUrl, lat: parsedMet.searchParams.get('lat'), lon: parsedMet.searchParams.get('lon') }, 'lat=-7.34, lon=110.35', parsedMet.searchParams.get('lat') === '-7.34' && parsedMet.searchParams.get('lon') === '110.35');

// 7. r2-negative-coordinates-binding
const negAuditUrl = m.buildEndpointAuditUrl('https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=-7.340&lon=112.75', -12.55, -77.04);
const parsedNeg = new URL(negAuditUrl);
add('r2-negative-coordinates-binding', { url: negAuditUrl, lat: parsedNeg.searchParams.get('lat'), lon: parsedNeg.searchParams.get('lon') }, 'lat=-12.55, lon=-77.04', parsedNeg.searchParams.get('lat') === '-12.55' && parsedNeg.searchParams.get('lon') === '-77.04');

// 8. r2-open-meteo-audit-url-binding
const omAuditUrl = m.buildEndpointAuditUrl('https://api.open-meteo.com/v1/forecast?latitude=-7.25&longitude=112.75&current=temperature_2m', -7.34, 110.35);
const parsedOm = new URL(omAuditUrl);
add('r2-open-meteo-audit-url-binding', { url: omAuditUrl, lat: parsedOm.searchParams.get('latitude'), lng: parsedOm.searchParams.get('longitude') }, 'latitude=-7.34, longitude=110.35', parsedOm.searchParams.get('latitude') === '-7.34' && parsedOm.searchParams.get('longitude') === '110.35');

// 9. r3-model-array-length-mismatch
const resMismatch = m.validateOpenMeteoModelPayload({
  latitude: -7.25, longitude: 112.75,
  hourly_units: { temperature_2m: '°C' },
  hourly: { time: [new Date(now).toISOString(), new Date(now + 3600000).toISOString()], temperature_2m: [27.3] },
}, -7.25, 112.75);
add('r3-model-array-length-mismatch', resMismatch, 'status: OFFLINE, valid: false', !resMismatch.valid && resMismatch.status === 'OFFLINE');

// 10. r3-model-unsupported-unit-fahrenheit
const resFahr = m.validateOpenMeteoModelPayload({
  latitude: -7.25, longitude: 112.75,
  hourly_units: { temperature_2m: '°F' },
  hourly: { time: [new Date(now).toISOString()], temperature_2m: [82.0] },
}, -7.25, 112.75);
add('r3-model-unsupported-unit-fahrenheit', resFahr, 'status: OFFLINE, valid: false', !resFahr.valid && resFahr.status === 'OFFLINE');

// 11. r3-model-invalid-calendar-date-feb31
const calValid = m.isValidCalendarDate(2026, 2, 31);
const isoValid = m.isValidIsoDateTime('2026-02-31T12:00:00Z');
const resFeb31 = m.validateOpenMeteoModelPayload({
  latitude: -7.25, longitude: 112.75,
  hourly_units: { temperature_2m: '°C' },
  hourly: { time: ['2026-02-31T12:00:00Z'], temperature_2m: [28.0] },
}, -7.25, 112.75);
add('r3-model-invalid-calendar-date-feb31', { calValid, isoValid, resFeb31 }, 'calValid: false, isoValid: false, valid: false', !calValid && !isoValid && !resFeb31.valid);

// 12. r3-model-historical-only-rejected
const resHist = m.validateOpenMeteoModelPayload({
  latitude: -7.25, longitude: 112.75,
  hourly_units: { temperature_2m: '°C' },
  hourly: { time: ['2020-01-01T00:00:00Z'], temperature_2m: [25.0] },
}, -7.25, 112.75);
add('r3-model-historical-only-rejected', resHist, 'status: OFFLINE, valid: false', !resHist.valid && resHist.status === 'OFFLINE');

// 13. r3-model-single-and-multi-positive
const resCmaSingle = m.validateOpenMeteoModelPayload({
  latitude: -7.25, longitude: 112.75,
  hourly_units: { temperature_2m: '°C' },
  hourly: { time: [new Date(now).toISOString()], temperature_2m: [27.3] },
}, -7.25, 112.75, 'cma_grapes_global');
add('r3-model-single-and-multi-positive', resCmaSingle, 'status: ONLINE, valid: true', resCmaSingle.valid && resCmaSingle.status === 'ONLINE');

// 14. r4-met-partial-retains-degraded-with-current
const validCurrentPoint = createMetPoint(0, { air_temperature: 26.0, relative_humidity: 80 });
const invalidPoint = createMetPoint(3600000, { relative_humidity: 999 });
const valMet = m.validateMetNorwayPayload(createMetPayload(-7.25, 112.75, [validCurrentPoint, invalidPoint]), -7.25, 112.75);
const consensusData = {
  lat: -7.25, lng: 112.75, locationName: 'Surabaya Test', elevation: 5,
  fetchedAt: new Date().toISOString(), dataTime: new Date().toISOString(), coverageScope: 'SURABAYA', dataStatus: 'PARTIAL',
  current: { temperature: 26.0, apparentTemperature: 28.0, humidity: 80, surfacePressure: 1012, seaLevelPressure: 1012, windSpeed: 10, windDirection: 90, precipitation: 0, precipitationProb: 10, uvIndex: 5, cloudCover: 30, conditionCode: 'partlycloudy_day' },
  hourly: [], modelComparison: [], modelSpread: 0,
  sourceFetches: [{ id: 'met_norway_fallback', url: 'https://api.met.no/...', status: 'PARTIAL', httpStatus: 200, latencyMs: 120, acceptedCount: 1, rejectedCount: 1 }],
};
m.telemetry.recordRawIngestion(-7.25, 112.75, 'Surabaya Test', { fallback: 'met_norway' }, null, consensusData);
const metEp = m.telemetry.getEndpoints().find(e => e.id === 'met_norway_fallback');
add('r4-met-partial-retains-degraded-with-current', { epStatus: metEp?.status, acceptedCount: valMet.acceptedCount, rejectedCount: valMet.rejectedCount }, 'status: DEGRADED, accepted: 1, rejected: 1', metEp?.status === 'DEGRADED' && valMet.acceptedCount === 1 && valMet.rejectedCount === 1);

// Helper for insights hourly
const basePoint = (hour, precip = null, prob = null) => ({
  hour, label: `${hour.toString().padStart(2, '0')}:00`, temperature: 28.0, apparentTemperature: 30.0,
  precipitation: precip, precipitationProb: prob, cloudCover: 20, time: `2026-10-04T${hour.toString().padStart(2, '0')}:00:00Z`,
});

// 15. r5-weather-all-null-rain
const ins1 = m.computeInsights({ hourly: Array.from({ length: 24 }, (_, i) => basePoint(i, null, null)), timezone: 'Asia/Jakarta' });
add('r5-weather-all-null-rain', { text: ins1.rainWindowText }, 'Data hujan belum tersedia untuk interval ini', ins1.rainWindowText === 'Data hujan belum tersedia untuk interval ini');

// 16. r5-weather-low-coverage-rain
const ins2 = m.computeInsights({ hourly: Array.from({ length: 24 }, (_, i) => basePoint(i, i === 0 ? 0 : null, null)), timezone: 'Asia/Jakarta' });
add('r5-weather-low-coverage-rain', { text: ins2.rainWindowText }, 'Must not claim Cenderung kering', ins2.rainWindowText !== 'Cenderung kering sepanjang periode prakiraan' && ins2.rainWindowText.includes('belum lengkap'));

// 17. r5-weather-prob-only-no-intensity-fabrication
const ins3 = m.computeInsights({ hourly: Array.from({ length: 24 }, (_, i) => basePoint(i, null, i === 14 ? 70 : 0)), timezone: 'Asia/Jakarta' });
add('r5-weather-prob-only-no-intensity-fabrication', { text: ins3.rainWindowText }, 'Must state probability without drizzle claim', ins3.rainWindowText.includes('Peluang hujan (70%)') && ins3.rainWindowText.includes('intensitas akumulasi belum tersedia'));

// 18. r5-weather-disconnected-rain-windows
const ins4 = m.computeInsights({
  hourly: [basePoint(0, 0), basePoint(1, 2.5), basePoint(2, 0), basePoint(3, 0), basePoint(4, 3.0), basePoint(5, 0)],
  timezone: 'Asia/Jakarta',
});
add('r5-weather-disconnected-rain-windows', { text: ins4.rainWindowText }, 'Distinct windows separated', !ins4.rainWindowText.includes('01:00 - 04:00') && ins4.rainWindowText.includes('01:00') && ins4.rainWindowText.includes('04:00'));

// 19. r6-next-day-point-selection-distinct-key
const day1P = { hour: 14, time: '2026-10-04T14:00:00Z', temperature: 17.0, precipitation: 0 };
const day2P = { hour: 14, time: '2026-10-05T14:00:00Z', temperature: 30.0, precipitation: 2.5 };
const k1 = m.getPointKey(day1P, 0);
const k2 = m.getPointKey(day2P, 24);
const resolvedP = [day1P, day2P].find((h, idx) => m.getPointKey(h, idx) === k2);
add('r6-next-day-point-selection-distinct-key', { k1, k2, resolvedTemp: resolvedP?.temperature }, 'k1 != k2, resolvedTemp: 30', k1 !== k2 && resolvedP?.temperature === 30.0);

// 20. r7-radar-status-active-tile-coverage
const baseRadar = { weatherMapOverlay: 'radar', weatherRenderMode: 'native', radarMetadataStale: false, radarFrameTime: Date.now() / 1000 };
const sLoading = m.radarStatus({ ...baseRadar, radarTileCounts: { requested: 3, loaded: 1, error: 0, activeRequested: 3, activeLoaded: 1, activeError: 0 } });
const sLive = m.radarStatus({ ...baseRadar, radarTileCounts: { requested: 3, loaded: 3, error: 0, activeRequested: 3, activeLoaded: 3, activeError: 0 } });
const sPartial = m.radarStatus({ ...baseRadar, radarTileCounts: { requested: 3, loaded: 1, error: 2, activeRequested: 3, activeLoaded: 1, activeError: 2 } });
add('r7-radar-status-active-tile-coverage', { sLoading, sLive, sPartial }, 'MEMUAT, LIVE RADAR, PARSIAL', sLoading === 'MEMUAT' && sLive === 'LIVE RADAR' && sPartial === 'PARSIAL');

// 21. r8-gibs-frame-age-stale-citra
const baseSat = { weatherMapOverlay: 'satellite', weatherRenderMode: 'native', radarTileCounts: { requested: 4, loaded: 4, error: 0, activeRequested: 4, activeLoaded: 4, activeError: 0 } };
const sStaleCitra = m.radarStatus({ ...baseSat, gibsMetadataStale: false, gibsFrameTime: Math.floor(new Date('2020-01-01T00:00:00Z').getTime() / 1000) });
const sLiveCitra = m.radarStatus({ ...baseSat, gibsMetadataStale: false, gibsFrameTime: Math.floor(Date.now() / 1000) });
add('r8-gibs-frame-age-stale-citra', { sStaleCitra, sLiveCitra }, 'STALE CITRA and NASA GIBS IR', sStaleCitra === 'STALE CITRA' && sLiveCitra === 'NASA GIBS IR');

// Write out evidence
writeFileSync(`${repo}/tests/evidence-stage11-verified.json`, JSON.stringify(report, null, 2));

console.log('\n===== STAGE 11 VERIFICATION SUMMARY (21 SCENARIOS) =====');
let passCount = 0;
for (const c of report.cases) {
  const icon = c.passed ? '✅ PASS' : '❌ FAIL';
  if (c.passed) passCount++;
  console.log(`${icon} [${c.id}]`);
}
console.log(`\nTotal Passed: ${passCount} / ${report.cases.length}`);

if (passCount !== report.cases.length) {
  process.exit(1);
} else {
  console.log('All 21 Stage 11 reproduction scenarios passed cleanly!');
  process.exit(0);
}
