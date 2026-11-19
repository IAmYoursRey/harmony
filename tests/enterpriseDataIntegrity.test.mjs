import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const require = createRequire(new URL('../apps/server/package.json', import.meta.url));
const express = require('express');

globalThis.localStorage = {
  _map: new Map(),
  getItem(k) { return this._map.has(k) ? this._map.get(k) : null; },
  setItem(k, v) { this._map.set(k, String(v)); },
  removeItem(k) { this._map.delete(k); },
};

const bundle = await build({
  stdin: {
    contents: `
      export { terrainService } from './apps/web/src/services/geospatial/terrainService.ts';
      export { geospatialAnalysisService } from './apps/web/src/services/geospatialAnalysisService.ts';
      export { gnssElevationService } from './apps/web/src/services/geospatial/gnssElevationService.ts';
      export { preciseGeocodingService } from './apps/web/src/services/preciseGeocodingService.ts';
      export { routingService } from './apps/web/src/services/routingService.ts';
      export { liveTrafficFlowService } from './apps/web/src/services/liveTrafficFlowService.ts';
      export { trafficGpsDensityService } from './apps/web/src/services/trafficGpsDensityService.ts';
      export { dataFusionAndUncertaintyEngine } from './apps/web/src/services/dataFusionAndUncertaintyEngine.ts';
      export { spatialDataEngine, CORE_SENSOR_NETWORK, TSUNAMI_EARTH_SENSOR_NETWORK } from './apps/web/src/services/spatialDataEngine.ts';
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

const client = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString('base64')}`);

const {
  getPublicHotspotsFeed,
  getLiveEarthquakesList,
  getLiveVolcanoUpdates,
  getLiveTrafficNetwork,
  submitGpsProbe,
  getFaultsMetadata,
  getTrafficCctvList,
  __resetSpatialControllerCachesForTest,
} = await import('../apps/server/src/controllers/spatialController.js');

const bmkgRouterMod = await import('../apps/server/src/routes/bmkgRoutes.js');
const bmkgRouter = bmkgRouterMod.default;
const { __resetBmkgNoaaCacheForTest } = bmkgRouterMod;

const { cctvService } = await import('../apps/server/src/services/cctvService.js');
const { pool } = await import('../apps/server/src/repositories/repository.js');

const originalFetch = globalThis.fetch;

test.after(async () => {
  globalThis.fetch = originalFetch;
  if (pool) {
    await pool.end().catch(() => {});
  }
});

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(k, v) {
      this.headers[k] = v;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

async function withMockServer(router, fn) {
  const app = express();
  app.use(express.json());
  app.use('/api/bmkg', router);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    await fn(baseUrl);
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
}

test('Server getPublicHotspotsFeed returns HTTP 502 ERROR when all NASA FIRMS CSV feeds fail', async () => {
  __resetSpatialControllerCachesForTest();
  globalThis.fetch = async () => new Response('Service Unavailable', { status: 503 });
  try {
    const req = { query: { scope: 'aoi', bbox: '112.4,-7.7,112.8,-7.3', dayRange: '2', source: 'ALL', force: 'true' } };
    const res = createMockRes();
    await getPublicHotspotsFeed(req, res);
    assert.equal(res.statusCode, 502);
    assert.equal(res.body.success, false);
    assert.equal(res.body.provenance?.dataStatus, 'ERROR');
    assert.ok(Array.isArray(res.body.sourceAttempts) && res.body.sourceAttempts.length >= 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Server getPublicHotspotsFeed reports PARTIAL when subset of satellite feeds succeeds', async () => {
  __resetSpatialControllerCachesForTest();
  const csvValid = [
    'latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight',
    '-7.5000,112.6000,335.2,0.4,0.4,2026-11-19,0530,N20,VIIRS,h,2.0NRT,298.1,14.5,D',
  ].join('\n');

  globalThis.fetch = async (url) => {
    if (String(url).includes('noaa-20-viirs')) {
      return new Response(csvValid, { status: 200 });
    }
    return new Response('Upstream error', { status: 502 });
  };
  try {
    const req = { query: { scope: 'aoi', bbox: '112.4,-7.7,112.8,-7.3', dayRange: '2', source: 'ALL', force: 'true' } };
    const res = createMockRes();
    await getPublicHotspotsFeed(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.partial, true);
    assert.equal(res.body.provenance?.dataStatus, 'PARTIAL');
    assert.equal(res.body.count, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Server getLiveEarthquakesList returns 502 ERROR when all seismic upstreams fail', async () => {
  __resetSpatialControllerCachesForTest();
  globalThis.fetch = async () => new Response('Down', { status: 503 });
  try {
    const req = { query: { force: 'true' } };
    const res = createMockRes();
    await getLiveEarthquakesList(req, res);
    assert.equal(res.statusCode, 502);
    assert.equal(res.body.success, false);
    assert.equal(res.body.dataStatus, 'ERROR');
    assert.equal(res.body.count, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Server getLiveVolcanoUpdates parses Smithsonian GVP RSS and returns 502 ERROR on upstream failure', async () => {
  __resetSpatialControllerCachesForTest();
  const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0"><channel>
    <title>Smithsonian / USGS Weekly Volcanic Activity Report</title>
    <lastBuildDate>Wed, 18 Nov 2026 12:00:00 +0000</lastBuildDate>
    <item>
      <title>Semeru (Indonesia) - Continuing Activity for 12 November-18 November 2026</title>
      <link>https://volcano.si.edu/volcano.cfm?vn=263300</link>
      <description><![CDATA[PVMBG reported ash plumes rising 800 m above summit on 17 November 2026. Level II Waspada remains in place.]]></description>
      <pubDate>Wed, 18 Nov 2026 12:00:00 +0000</pubDate>
    </item>
  </channel></rss>`;

  globalThis.fetch = async () => new Response(sampleXml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
  try {
    const resOk = createMockRes();
    await getLiveVolcanoUpdates({ query: { force: 'true', country: 'indonesia' } }, resOk);
    assert.equal(resOk.statusCode, 200);
    assert.equal(resOk.body.dataStatus, 'LIVE');
    assert.equal(resOk.body.pvmbgStatus, 'UNAVAILABLE_NO_PUBLIC_JSON_API');
    assert.equal(resOk.body.count, 1);
    assert.match(resOk.body.data[0].name, /Semeru/i);

    __resetSpatialControllerCachesForTest();
    globalThis.fetch = async () => new Response('Bad Gateway', { status: 502 });
    const resErr = createMockRes();
    await getLiveVolcanoUpdates({ query: { force: 'true', country: 'indonesia' } }, resErr);
    assert.equal(resErr.statusCode, 502);
    assert.equal(resErr.body.success, false);
    assert.equal(resErr.body.dataStatus, 'ERROR');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Server traffic, GPS probe null preservation, faults metadata & CCTV provenance never fabricate metrics', async () => {
  __resetSpatialControllerCachesForTest();
  const prevKey = process.env.TOMTOM_API_KEY;
  delete process.env.TOMTOM_API_KEY;

  try {
    const trafficEmpty = createMockRes();
    await getLiveTrafficNetwork({ query: {} }, trafficEmpty);
    assert.equal(trafficEmpty.statusCode, 200);
    assert.equal(trafficEmpty.body.data.dataStatus, 'UNAVAILABLE');
    assert.equal(trafficEmpty.body.data.nationalFlowIndex, null);
    assert.equal(trafficEmpty.body.data.averageSpeedKmh, null);
    assert.deepEqual(trafficEmpty.body.data.severeBottlenecks, []);

    const probeRes = createMockRes();
    await submitGpsProbe({ body: { lat: -7.55, lng: 112.58, speedKmh: null, headingDeg: 90 } }, probeRes);
    assert.equal(probeRes.statusCode, 201);

    const trafficAfterProbe = createMockRes();
    await getLiveTrafficNetwork({ query: {} }, trafficAfterProbe);
    assert.equal(trafficAfterProbe.body.data.activeGpsProbeCount, 1);
    assert.equal(trafficAfterProbe.body.data.averageSpeedKmh, null);

    const faultsRes = createMockRes();
    await getFaultsMetadata({ query: {} }, faultsRes);
    assert.equal(faultsRes.statusCode, 200);
    assert.equal(faultsRes.body.dataStatus, 'STATIC_CATALOG');
    assert.equal(faultsRes.body.isLiveFeed, false);
    assert.equal(faultsRes.body.segmentCount, 26);

    const cctvRes = createMockRes();
    await getTrafficCctvList({ query: { limit: '5' } }, cctvRes);
    assert.equal(cctvRes.statusCode, 200);
    const expectedProvStatus = cctvService.getHealthStatus().status === 'ONLINE'
      ? 'LIVE'
      : cctvService.getHealthStatus().status;
    assert.equal(cctvRes.body.provenance.status, expectedProvStatus);
  } finally {
    if (prevKey !== undefined) process.env.TOMTOM_API_KEY = prevKey;
    __resetSpatialControllerCachesForTest();
  }
});

test('Server bmkgRoutes NOAA METAR, Kp-Index, and ENSO ONI return real parsed payloads and 502 ERROR on upstream failure', async () => {
  await withMockServer(bmkgRouter, async (baseUrl) => {
    __resetBmkgNoaaCacheForTest();
    globalThis.fetch = async (url) => {
      const u = String(url);
      if (u.startsWith(baseUrl)) {
        return originalFetch(url);
      }
      if (u.includes('aviationweather.gov')) {
        return new Response(JSON.stringify([
          { icaoId: 'WARR', name: 'Juanda', rawOb: 'WARR 191200Z 11008KT 9999 FEW020 30/24 Q1009', temp: 30, dewp: 24, wdir: 110, wspd: 8, altim: 1009, fltCat: 'VFR', obsTime: 1763553600 },
        ]), { status: 200 });
      }
      if (u.includes('noaa-planetary-k-index')) {
        return new Response(JSON.stringify([
          { time_tag: '2026-11-19T12:00:00', Kp: 2.33, estimated_kp: 2.33 },
        ]), { status: 200 });
      }
      if (u.includes('oni.ascii.txt')) {
        return new Response('SEAS  YR   TOTAL   ANOM\nASO 2026   26.10  -0.70\n', { status: 200 });
      }
      return new Response('Not Found', { status: 404 });
    };

    try {
      const fetchClosed = (u) => originalFetch(u, { headers: { Connection: 'close' } });
      const metarRes = await fetchClosed(`${baseUrl}/api/bmkg/aviation/metar?ids=WARR`).then((r) => r.json());
      assert.equal(metarRes.success, true);
      assert.equal(metarRes.dataStatus, 'LIVE');
      assert.equal(metarRes.data[0].icaoId, 'WARR');

      const kpRes = await fetchClosed(`${baseUrl}/api/bmkg/geophysics/kp-index`).then((r) => r.json());
      assert.equal(kpRes.success, true);
      assert.equal(kpRes.dataStatus, 'LIVE');
      assert.equal(kpRes.data.kpIndex, 2.33);

      const oniRes = await fetchClosed(`${baseUrl}/api/bmkg/climate/enso-oni`).then((r) => r.json());
      assert.equal(oniRes.success, true);
      assert.equal(oniRes.dataStatus, 'LIVE');
      assert.equal(oniRes.data.anomalyOni, -0.7);

      __resetBmkgNoaaCacheForTest();
      globalThis.fetch = async (url) => {
        if (String(url).startsWith(baseUrl)) return originalFetch(url);
        return new Response('Gateway Timeout', { status: 504 });
      };

      for (const path of ['/api/bmkg/aviation/metar?ids=WARR', '/api/bmkg/geophysics/kp-index', '/api/bmkg/climate/enso-oni']) {
        const failResp = await fetchClosed(`${baseUrl}${path}`);
        const failJson = await failResp.json();
        assert.equal(failResp.status, 502, `${path} must return 502 on upstream failure`);
        assert.equal(failJson.dataStatus, 'ERROR');
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

test('Frontend geospatial services surface ERROR/UNAVAILABLE instead of fabricated values', async () => {
  globalThis.fetch = async () => new Response('Network Failure', { status: 503 });
  try {
    const terrainErr = await client.terrainService.getTerrainIntelligence(-7.5512, 112.5512);
    assert.equal(terrainErr.status, 'ERROR');
    assert.equal(terrainErr.elevationM, null);
    assert.equal(terrainErr.slopeDeg, null);
    assert.equal(terrainErr.landslideRiskLevel, 'Tidak Tersedia');

    const hydro = client.geospatialAnalysisService.calculateHydrologyAndLandCover(-7.55, 112.55, null);
    assert.equal(hydro.landCoverClasses.length, 0);
    assert.equal(hydro.floodExposureScore, null);
    assert.equal(hydro.floodRiskLevel, 'Tidak Tersedia');

    const gnssErr = client.gnssElevationService.buildElevationReport({
      lat: -7.55,
      lng: 112.55,
      accuracyM: 12,
      deviceAlt: null,
      demAlt: null,
    });
    assert.equal(gnssErr.altitudeM, null);
    assert.equal(gnssErr.altitudeSource, 'unavailable');
    assert.equal(gnssErr.estimatedBarometricPressureHpa, null);

    const geoErr = await client.preciseGeocodingService.reverseGeocode(-7.57, 112.59);
    assert.equal(geoErr.source, 'unavailable');
    assert.equal(geoErr.isError, true);
    assert.equal(geoErr.village, 'Tidak Tersedia');
    assert.notEqual(geoErr.village, 'Desa Sedati');

    const routeRes = await client.routingService.createDirectFallbackRoute(
      { lat: -7.57, lng: 112.59, label: 'A' },
      { lat: -7.51, lng: 112.56, label: 'B' }
    ).catch(async () => null);
    const routeFallback = routeRes ?? await client.routingService.calculateRoute(
      { lat: -7.57, lng: 112.59 },
      { lat: -7.51, lng: 112.56 }
    );
    assert.match(routeFallback.weatherRiskSummary, /tidak tersedia|gagal|memadai|normal/i);

    const initialTraffic = client.liveTrafficFlowService.getStatus();
    assert.equal(initialTraffic.dataStatus, 'UNAVAILABLE');
    assert.equal(initialTraffic.nationalFlowIndex, null);
    assert.equal(initialTraffic.averageSpeedKmh, null);
    assert.equal(initialTraffic.severeBottlenecks.length, 0);

    const failedTraffic = await client.liveTrafficFlowService.fetchLiveNetwork();
    assert.equal(failedTraffic.dataStatus, 'ERROR');
    assert.ok(failedTraffic.errorMessage);

    const crowdSummary = client.trafficGpsDensityService.getSummary();
    assert.equal(crowdSummary.averageNetworkSpeedKmh, null);

    const fusionNull = client.dataFusionAndUncertaintyEngine.computeHarmonizedFusedState(
      null,
      -7.57,
      112.59,
      'Ngoro',
      null,
      true
    );
    assert.equal(fusionNull.isLiveConnected, false);
    assert.equal(fusionNull.dataStatus, 'UNAVAILABLE');
    assert.equal(fusionNull.bestEstimate.temperatureC, null);
    assert.equal(fusionNull.impacts, null);

    for (const node of client.CORE_SENSOR_NETWORK) {
      assert.equal(node.status, 'UNCHECKED');
    }
    for (const node of client.TSUNAMI_EARTH_SENSOR_NETWORK) {
      assert.equal(node.status, 'UNCHECKED');
    }
    const inspected = client.spatialDataEngine.inspectFeatureAt(-7.57, 112.59, 'Ngoro', null);
    assert.equal(inspected.attributes['Elevasi Medan (DEM)'], 'Tidak Tersedia');
    assert.notEqual(inspected.attributes['Jarak ke Garis Pantai Terdekat'], '18.5 km');
    assert.notEqual(inspected.provenance.qualityRating, 'A (Terverifikasi)');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
