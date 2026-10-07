import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const repo = 'D:/vscode/Harmony';
const review7Dir = 'D:/Blender/test 1/harmony-web-check/2026-10-03-seventh-remediation-review';
const review6Dir = 'D:/Blender/test 1/harmony-web-check/2026-10-03-sixth-remediation-review';
const review5Dir = 'D:/Blender/test 1/harmony-web-check/2026-10-03-fifth-remediation-review';
const outFile = `${repo}/tests/evidence-stage7-verified.json`;

const require = createRequire(`${repo}/package.json`);
const { build } = require('esbuild');
const ts = require('typescript');

const files = [
  'apps/web/src/services/geospatialDataTelemetryService.ts',
  'apps/web/src/services/weatherDataIntegrity.ts',
  'apps/web/src/data/dataSourceRegistry.ts',
  'apps/web/src/services/geospatial/rasterReaderService.ts',
  'apps/web/src/services/geospatial/lstService.ts',
  'apps/web/src/components/dashboard/views/spatial/MapsView.tsx',
  'apps/web/src/services/geospatial/stacService.ts',
  'apps/web/src/services/metNorwayService.ts',
  'apps/web/src/services/weatherAggregatorService.ts',
];

const hashes = () => Object.fromEntries(files.map(p => [p, createHash('sha256').update(readFileSync(`${repo}/${p}`)).digest('hex')]));

const mapText = readFileSync(`${repo}/apps/web/src/components/dashboard/views/spatial/MapsView.tsx`, 'utf8');
const mapAst = ts.createSourceFile('input.tsx', mapText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let weatherStatusExpr;
function walk(n) {
  if (ts.isVariableDeclaration(n) && n.name.getText(mapAst) === 'weatherStatusText') {
    weatherStatusExpr = n.initializer.getText(mapAst);
  }
  ts.forEachChild(n, walk);
}
walk(mapAst);

const bundle = await build({
  stdin: {
    contents: `
export { geospatialDataTelemetryService as telemetry } from './apps/web/src/services/geospatialDataTelemetryService.ts';
export { validateCurrentWeather } from './apps/web/src/services/weatherDataIntegrity.ts';
export { GeoTiffParser } from './apps/web/src/services/geospatial/rasterReaderService.ts';
export { lstService } from './apps/web/src/services/geospatial/lstService.ts';
export { DATA_SOURCES_REGISTRY as registry } from './apps/web/src/data/dataSourceRegistry.ts';
export { stacService } from './apps/web/src/services/geospatial/stacService.ts';
export { metNorwayService } from './apps/web/src/services/metNorwayService.ts';
export const radarStatus = ctx => {
  const { weatherMapOverlay, weatherRenderMode, radarMetadataStale, radarFrameTime, radarTileCounts } = ctx;
  return (${weatherStatusExpr});
};
`,
    resolveDir: repo,
    sourcefile: 'audit7.ts',
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  logLevel: 'silent',
});

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString('base64')}`);

const results = {
  checkedAt: new Date().toISOString(),
  stage: 'Stage 7 Remediation Verification',
  scope: 'Independent source-driven fault injection and domain validation',
  cases: [],
  registrySummary: {},
  hashes: hashes(),
};

const add = (id, actual, expected, passed) => {
  results.cases.push({ id, actual, expected, passed });
};

const originalFetch = globalThis.fetch;

// 1. Audit ping endpoint fault injection tests
console.log('--- Testing Telemetry Ping Validators ---');
for (const [id, body, endpoint, lat, lng] of [
  ['traffic-no-geometry', { success: true, data: { currentSpeedKmh: 20, freeFlowSpeedKmh: 40, currentTravelTimeSec: 100, freeFlowTravelTimeSec: 50, confidence: 0.9 } }, 'tomtom_traffic', -7, 112],
  ['firms-invalid-record', { success: true, data: [{ latitude: 999, longitude: 999, frp: -10 }] }, 'nasa_firms', -7, 112],
  ['bmkg-invalid-date-only', { Infogempa: { gempa: { DateTime: 'not-a-date' } } }, 'bmkg_tews', -7, 112],
  ['elevation-wrong-location', { results: [{ latitude: 0, longitude: 0, elevation: 400 }] }, 'elevation_dem', -7, 112],
  ['air-wrong-location', { latitude: 50, longitude: 20, current: { time: Math.floor(Date.now() / 1000), pm2_5: 15, pm10: 20, ozone: 30 } }, 'open_meteo_air', -7, 112],
  ['HTTP200-provider-failure', { success: false, data: null, reason: { message: 'Upstream failed' } }, 'nasa_firms', -7, 112],
  ['HTTP200-HTML', '<html>Login page</html>', 'nasa_firms', -7, 112],
  ['valid-empty-firms', { success: true, data: [] }, 'nasa_firms', -7, 112],
]) {
  globalThis.fetch = async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': typeof body === 'string' ? 'text/html' : 'application/json' },
  });
  const result = await mod.telemetry.pingEndpoint(endpoint, lat, lng);
  const isOnline = result.status === 'ONLINE';
  if (id === 'valid-empty-firms') {
    add(id, { status: result.status, error: result.errorMessage ?? null }, 'ONLINE (valid empty collection)', isOnline && !result.errorMessage);
  } else {
    add(id, { status: result.status, error: result.errorMessage ?? null }, 'OFFLINE / not ONLINE', !isOnline);
  }
}
globalThis.fetch = originalFetch;

// 2. Radar viewport status
console.log('--- Testing Radar Viewport Active Failure ---');
const rStatus = mod.radarStatus({
  weatherMapOverlay: 'radar',
  weatherRenderMode: 'native',
  radarMetadataStale: false,
  radarFrameTime: Date.now() / 1000,
  radarTileCounts: { requested: 20, loaded: 10, error: 10 },
});
add('radar-current-view-all-failed', rStatus, 'UNAVAILABLE', rStatus === 'UNAVAILABLE');

// 3. Predictor 2 positive check
console.log('--- Testing Predictor 2 Reading ---');
const f = readFileSync(`${review6Dir}/thermal-deflate-predictor2.tif`);
const buf = f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
const meta = mod.GeoTiffParser.parseMetadata(buf);
const predVal = mod.GeoTiffParser.readPixelAt(buf, meta, 1, 0);
add('predictor-positive', predVal, 45100, predVal === 45100);

// 4. Missing CRS sampling rejection
console.log('--- Testing Missing CRS Rejection ---');
const no = readFileSync(`${review6Dir}/thermal-georef-no-crs.tif`);
const nb = no.buffer.slice(no.byteOffset, no.byteOffset + no.byteLength);
const nm = mod.GeoTiffParser.parseMetadata(nb);
const qa = readFileSync(`${review5Dir}/qa-clear.tif`);
const qb = qa.buffer.slice(qa.byteOffset, qa.byteOffset + qa.byteLength);
const qm = mod.GeoTiffParser.parseMetadata(qb);

try {
  mod.GeoTiffParser.sampleWindow(nb, nm, qb, qm, [112.002, -7.008, 112.008, -7.002]);
  add('missing-crs-sampling', 'Did not throw error', 'Throws MISSING_CRS', false);
} catch (e) {
  add('missing-crs-sampling', { error: e.message }, 'Throws MISSING_CRS', e.message.includes('MISSING_CRS'));
}

// 5. Incomplete QA strip rejection (no zero padding as clear)
console.log('--- Testing Incomplete QA Strip Rejection ---');
const malformed = qb.slice(0);
const v = new DataView(malformed);
const le = v.getUint16(0, false) === 0x4949;
const ifd = v.getUint32(4, le);
const entries = v.getUint16(ifd, le);
let changed = false;
for (let i = 0; i < entries; i++) {
  const at = ifd + 2 + i * 12;
  if (v.getUint16(at, le) === 279 && v.getUint32(at + 4, le) === 1) {
    const type = v.getUint16(at + 2, le);
    if (type === 3) v.setUint16(at + 8, 2, le);
    else if (type === 4) v.setUint32(at + 8, 2, le);
    changed = true;
  }
}
if (!changed) throw new Error('QA fixture must declare one strip');

try {
  const shortMeta = mod.GeoTiffParser.parseMetadata(malformed);
  mod.GeoTiffParser.readPixelAt(malformed, shortMeta, 5, 5);
  add('QA-incomplete-block-padded-as-clear', 'Did not throw error', 'Throws MALFORMED_TIFF_STRIP', false);
} catch (e) {
  add('QA-incomplete-block-padded-as-clear', { error: e.message }, 'Throws MALFORMED_TIFF_STRIP', e.message.includes('MALFORMED_TIFF_STRIP'));
}

// 6. Weather units validation
console.log('--- Testing Weather Units Validation ---');
const wrongUnits = {
  latitude: -7,
  longitude: 112,
  timezone: 'UTC',
  current: {
    time: Math.floor(Date.now() / 1000),
    interval: 900,
    temperature_2m: 28,
    relative_humidity_2m: 60,
    apparent_temperature: 30,
    precipitation: 0,
    weather_code: 1,
    cloud_cover: 30,
    surface_pressure: 1010,
    wind_speed_10m: 8,
    wind_direction_10m: 120,
    wind_gusts_10m: 10,
  },
  current_units: {
    temperature_2m: '°F',
    surface_pressure: 'Pa',
    wind_speed_10m: 'm/s',
  },
};
const weatherErr = mod.validateCurrentWeather(wrongUnits, -7, 112);
add('weather-wrong-units', weatherErr, 'Error message string rejecting incompatible units', typeof weatherErr === 'string' && weatherErr.length > 0);

// 7. Actual latitude geodesic footprint area
console.log('--- Testing Geodesic Footprint at Latitude 60° ---');
const scene60 = {
  id: 'LC09_LAT60_FIXTURE',
  satellite: 'Landsat 9',
  acquisitionDate: '2026-10-01T00:00:00Z',
  crs: 'EPSG:4326',
  pixelScale: { dx: 0.001, dy: 0.001, dz: 0 },
};
const prov60 = mod.lstService.createProvenance(scene60, 'DERIVED', 1, 1, { bbox: [112, 59.99, 112.1, 60.01] });
const approxExpected60 = 0.001 * 111.32 * Math.cos(Math.PI / 3) * 0.001 * 110.57;
const areaDiff = Math.abs(prov60.validAreaKm2 - approxExpected60);
add('area-uses-fixed-latitude-minus7', {
  actualAreaKm2: prov60.validAreaKm2,
  approxExpectedAt60Km2: approxExpected60,
  difference: areaDiff,
}, '~0.00615 km² based on actual latitude 60°', areaDiff < 0.0001);

// 8. Data Source Registry integrity
console.log('--- Testing Data Source Registry Integrity ---');
const liveCount = mod.registry.filter(r => r.isLiveConnected).length;
const catalogCount = mod.registry.filter(r => !r.isLiveConnected).length;
const firmsItem = mod.registry.find(r => r.id === 'nasa-firms-noaa');
const geminiItem = mod.registry.find(r => r.id === 'google-gemini-ai');

add('registry-not-all-live', {
  total: mod.registry.length,
  liveConnectedCount: liveCount,
  catalogCount,
}, 'Live streams must not be uniformly true (16/16)', liveCount > 0 && liveCount < mod.registry.length);

add('registry-firms-key-configured', {
  apiKeyRequired: firmsItem.apiKeyRequired,
  apiKeyStatus: firmsItem.apiKeyStatus,
}, 'apiKeyRequired: true, apiKeyStatus: CONFIGURED', firmsItem.apiKeyRequired === true && firmsItem.apiKeyStatus === 'CONFIGURED');

add('registry-gemini-key-configured', {
  apiKeyRequired: geminiItem.apiKeyRequired,
  apiKeyStatus: geminiItem.apiKeyStatus,
}, 'apiKeyStatus: CONFIGURED', geminiItem.apiKeyStatus === 'CONFIGURED');

results.registrySummary = {
  total: mod.registry.length,
  liveConnected: liveCount,
  catalogs: catalogCount,
  entries: mod.registry.map(r => ({
    id: r.id,
    name: r.name,
    isLiveConnected: r.isLiveConnected,
    apiKeyRequired: r.apiKeyRequired,
    apiKeyStatus: r.apiKeyStatus,
  })),
};

// 9. STAC S3 Asset preservation & resolution check
console.log('--- Testing STAC S3 Asset Preservation & Resolver ---');
const mockFeatureS3 = {
  type: 'Feature',
  id: 'LC09_L2SP_118065_20260926_02_T1',
  collection: 'landsat-c2-l2',
  bbox: [112.0, -7.5, 113.5, -6.5],
  properties: { datetime: '2026-09-26T02:45:00Z', 'eo:cloud_cover': 12.5 },
  assets: {
    lwir11: {
      href: 's3://usgs-landsat/collection02/level-2/standard/oli-tirs/2026/118/065/LC09_L2SP_118065_20260926_02_T1_SR_B10.TIF',
      type: 'image/tiff; application=geotiff; profile=cloud-optimized',
      title: 'Thermal Infrared Band 10',
      roles: ['thermal', 'data'],
    },
    qa_pixel: {
      href: 's3://usgs-landsat/collection02/level-2/standard/oli-tirs/2026/118/065/LC09_L2SP_118065_20260926_02_T1_QA_PIXEL.TIF',
      type: 'image/tiff; application=geotiff; profile=cloud-optimized',
      title: 'Pixel Quality Assurance Band',
      roles: ['qa'],
    },
  },
};

globalThis.fetch = async (url) => {
  if (typeof url === 'string' && url.includes('earth-search')) {
    return new Response(JSON.stringify({ type: 'FeatureCollection', features: [mockFeatureS3], numberMatched: 1 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (typeof url === 'string' && url.includes('planetarycomputer.microsoft.com/api/stac/v1/collections/landsat-c2-l2/items/LC09_L2SP_118065_20260926_02_T1')) {
    return new Response(JSON.stringify({
      id: 'LC09_L2SP_118065_20260926_02_T1',
      assets: {
        lwir11: { href: 'https://landsateuwest.blob.core.windows.net/landsat-c2/level-2/standard/oli-tirs/2026/118/065/LC09_L2SP_118065_20260926_02_T1_SR_B10.TIF' },
        qa_pixel: { href: 'https://landsateuwest.blob.core.windows.net/landsat-c2/level-2/standard/oli-tirs/2026/118/065/LC09_L2SP_118065_20260926_02_T1_QA_PIXEL.TIF' },
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (typeof url === 'string' && url.includes('/sas/v1/sign')) {
    const rawHref = new URL(url).searchParams.get('href');
    return new Response(JSON.stringify({ href: `${rawHref}?st=2026-10-03&se=2026-10-04&sp=r&sig=mockSig123` }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  return new Response('Not found', { status: 404 });
};

const stacSearchRes = await mod.stacService.searchSatelliteScenes({
  collections: ['landsat-c2-l2'],
  bbox: [112.5, -7.5, 113.0, -7.0],
});

const foundScene = stacSearchRes.scenes[0];
const hasThermalAsset = Boolean(foundScene?.assets?.lwir11);
const hasQaAsset = Boolean(foundScene?.assets?.qa_pixel);
add('stac-s3-asset-preservation', {
  totalFound: stacSearchRes.totalFound,
  hasThermalAsset,
  hasQaAsset,
  thermalHref: foundScene?.assets?.lwir11?.href,
}, 'S3 assets preserved in scene metadata', hasThermalAsset && hasQaAsset && foundScene?.assets?.lwir11?.href?.startsWith('s3://'));

const resolvedAsset = await mod.stacService.resolveSceneAssetUrl(
  foundScene.id,
  'lwir11',
  foundScene.assets.lwir11.href
);

add('stac-s3-asset-resolver-pc', {
  sceneId: foundScene.id,
  resolvedProvider: resolvedAsset.resolvedProvider,
  isSigned: resolvedAsset.isSigned,
  resolvedUrlPrefix: resolvedAsset.href.slice(0, 50),
}, 'Hydrates HTTPS signed URL from Planetary Computer for browser streaming', resolvedAsset.isSigned && resolvedAsset.href.includes('mockSig123'));

globalThis.fetch = originalFetch;

// 10. MET Norway Locationforecast adapter check
console.log('--- Testing MET Norway Adapter ---');
const sampleMetNoPayload = {
  properties: {
    meta: { updated_at: '2026-10-03T11:18:24Z' },
    timeseries: [
      {
        time: '2026-10-03T11:00:00Z',
        data: {
          instant: {
            details: {
              air_temperature: 29.5,
              relative_humidity: 62.6,
              wind_speed: 5.5,
              wind_from_direction: 107.1,
              cloud_area_fraction: 50.0,
              air_pressure_at_sea_level: 1012.6,
            },
          },
          next_1_hours: {
            summary: { symbol_code: 'partlycloudy_night' },
            details: { precipitation_amount: 0.2 },
          },
        },
      },
    ],
  },
};

globalThis.fetch = async () => new Response(JSON.stringify(sampleMetNoPayload), {
  status: 200,
  headers: { 'Content-Type': 'application/json', 'Expires': new Date(Date.now() + 600000).toUTCString() },
});

const metRes = await mod.metNorwayService.fetchForecast(-7.25, 112.75);
const expectedWindKmh = parseFloat((5.5 * 3.6).toFixed(1)); // 19.8 km/h
add('met-norway-unit-conversion', {
  tempC: metRes.current?.temperatureC,
  windSpeedKmh: metRes.current?.windSpeedKmh,
  expectedWindKmh,
  symbolCode: metRes.current?.symbolCode,
}, 'Converts m/s to km/h (5.5 m/s -> 19.8 km/h) and parses points', metRes.current?.windSpeedKmh === expectedWindKmh && metRes.current?.temperatureC === 29.5);

globalThis.fetch = originalFetch;

writeFileSync(outFile, JSON.stringify(results, null, 2));

console.log('\n================ VERIFICATION SUMMARY ================');
console.log(`Total test cases evaluated: ${results.cases.length}`);
const passedCount = results.cases.filter(c => c.passed).length;
const failedCount = results.cases.length - passedCount;
console.log(`Passed: ${passedCount}`);
console.log(`Failed: ${failedCount}`);
console.log(`Results saved to: ${outFile}\n`);
for (const c of results.cases) {
  console.log(`[${c.passed ? 'PASS' : 'FAIL'}] ${c.id}`);
  if (!c.passed) {
    console.log(`   Actual:   ${JSON.stringify(c.actual)}`);
    console.log(`   Expected: ${c.expected}`);
  }
}

if (failedCount > 0) {
  process.exit(1);
}
