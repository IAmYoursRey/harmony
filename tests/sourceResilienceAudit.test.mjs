import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { build } from 'esbuild';
import bmkgRouter, { __resetBmkgNoaaCacheForTest } from '../apps/server/src/routes/bmkgRoutes.js';
import {
  getOverpassData,
  getLatestGibsMetadata,
  getElevationProxy,
  getLiveVolcanoUpdates,
  reverseGeocodeProxy,
  searchGeocodeProxy,
  __resetSpatialControllerCachesForTest,
} from '../apps/server/src/controllers/spatialController.js';
import { cctvService } from '../apps/server/src/services/cctvService.js';

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

const routingBundle = await build({
  stdin: {
    contents: `
      export { routingService } from './apps/web/src/services/routingService.ts';
      export { snapCorridorToActualRoad } from './apps/web/src/services/trafficTelemetryService.ts';
    `,
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  alias: { '@': `${process.cwd()}/apps/web/src` },
  define: { 'import.meta.env': '{}' },
});

const { routingService, snapCorridorToActualRoad } = await import(
  `data:text/javascript;base64,${Buffer.from(routingBundle.outputFiles[0].contents).toString('base64')}`
);

test('GIBS Latest Tile Probe endpoint returns verified live date without large XML Capabilities download', async () => {
  __resetSpatialControllerCachesForTest();
  const originalFetch = globalThis.fetch;
  const requestedUrls = [];

  globalThis.fetch = async (url) => {
    const href = String(url);
    requestedUrls.push(href);
    if (href.includes('Himawari_AHI_Band13_Clean_Infrared') && href.endsWith('.png')) {
      return new Response(new Uint8Array([137, 80, 78, 71]), {
        status: 200,
        headers: { 'content-type': 'image/png' },
      });
    }
    return new Response('Not Found', { status: 404 });
  };

  try {
    const res = createMockRes();
    await getLatestGibsMetadata({ query: {} }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.dataStatus, 'LIVE');
    assert.match(res.body.availableTime, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(requestedUrls.some((u) => u.includes('WMTSCapabilities.xml')), false);

    // Subsequent call uses cache without network traffic
    const resCached = createMockRes();
    await getLatestGibsMetadata({ query: {} }, resCached);
    assert.equal(resCached.statusCode, 200);
    assert.equal(resCached.body.cached, true);
    assert.equal(requestedUrls.length, 1);

    // Total outage returns explicit 502 error
    __resetSpatialControllerCachesForTest();
    globalThis.fetch = async () => new Response('Unavailable', { status: 503 });
    const resErr = createMockRes();
    await getLatestGibsMetadata({ query: { force: 'true' } }, resErr);
    assert.equal(resErr.statusCode, 502);
    assert.equal(resErr.body.dataStatus, 'ERROR');
  } finally {
    globalThis.fetch = originalFetch;
    __resetSpatialControllerCachesForTest();
  }
});

test('Elevation Proxy serves Open-Meteo primary, Open-Elevation failover, and explicit 502 outage', async () => {
  __resetSpatialControllerCachesForTest();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url) => {
    const href = String(url);
    if (href.includes('api.open-meteo.com/v1/elevation')) {
      return new Response('Rate Limit', { status: 429 });
    }
    if (href.includes('api.open-elevation.com/api/v1/lookup')) {
      return new Response(JSON.stringify({ results: [{ latitude: -7.55, longitude: 112.6, elevation: 42.3 }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response('Error', { status: 500 });
  };

  try {
    const resBad = createMockRes();
    await getElevationProxy({ query: { lat: 'abc', lng: '112.6' } }, resBad);
    assert.equal(resBad.statusCode, 400);

    const resFailover = createMockRes();
    await getElevationProxy({ query: { lat: '-7.55', lng: '112.60' } }, resFailover);
    assert.equal(resFailover.statusCode, 200);
    assert.equal(resFailover.body.success, true);
    assert.equal(resFailover.body.source, 'open_elevation');
    assert.equal(resFailover.body.results[0].elevation, 42.3);
    assert.equal(resFailover.body.elevation[0], 42.3);

    __resetSpatialControllerCachesForTest();
    globalThis.fetch = async () => new Response('Unavailable', { status: 503 });
    const resOutage = createMockRes();
    await getElevationProxy({ query: { lat: '-7.80', lng: '112.90' } }, resOutage);
    assert.equal(resOutage.statusCode, 502);
    assert.equal(resOutage.body.dataStatus, 'ERROR');
  } finally {
    globalThis.fetch = originalFetch;
    __resetSpatialControllerCachesForTest();
  }
});

test('Live Volcano Updates fails over from Smithsonian GVP RSS to NASA EONET v3 and returns 502 on total failure', async () => {
  __resetSpatialControllerCachesForTest();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url) => {
    const href = String(url);
    if (href.includes('volcano.si.edu')) {
      return new Response('Gateway Timeout', { status: 504 });
    }
    if (href.includes('eonet.gsfc.nasa.gov/api/v3/events')) {
      return new Response(
        JSON.stringify({
          events: [
            {
              id: 'EONET_VOL_1',
              title: 'Ibu Volcano, Indonesia',
              link: 'https://eonet.gsfc.nasa.gov/api/v3/events/EONET_VOL_1',
              sources: [{ id: 'SI_GVP', url: 'https://volcano.si.edu/' }],
              geometry: [{ date: '2026-11-20T00:00:00Z', coordinates: [127.63, 1.488] }],
            },
            {
              id: 'EONET_VOL_2',
              title: 'Etna Volcano, Italy',
              link: 'https://eonet.gsfc.nasa.gov/api/v3/events/EONET_VOL_2',
              sources: [{ id: 'SI_GVP', url: 'https://volcano.si.edu/' }],
              geometry: [{ date: '2026-11-20T00:00:00Z', coordinates: [14.99, 37.75] }],
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }
    return new Response('Error', { status: 500 });
  };

  try {
    const res = createMockRes();
    await getLiveVolcanoUpdates({ query: { country: 'indonesia', force: 'true' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.dataStatus, 'LIVE');
    assert.match(res.body.liveFeedSource, /NASA EONET/);
    assert.equal(res.body.count, 1);
    assert.equal(res.body.totalGlobalCount, 2);
    assert.equal(res.body.data[0].isIndonesia, true);

    __resetSpatialControllerCachesForTest();
    globalThis.fetch = async () => new Response('Down', { status: 502 });
    const resErr = createMockRes();
    await getLiveVolcanoUpdates({ query: { force: 'true' } }, resErr);
    assert.equal(resErr.statusCode, 502);
    assert.equal(resErr.body.dataStatus, 'ERROR');
  } finally {
    globalThis.fetch = originalFetch;
    __resetSpatialControllerCachesForTest();
  }
});

test('Reverse & Search Geocode Proxies prioritize ArcGIS/Photon before rate-limited Nominatim', async () => {
  __resetSpatialControllerCachesForTest();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url) => {
    const href = String(url);
    if (href.includes('geocode.arcgis.com') && href.includes('reverseGeocode')) {
      return new Response(
        JSON.stringify({
          address: {
            Neighborhood: 'Lolawang',
            District: 'Ngoro',
            City: 'Ngoro',
            Subregion: 'Mojokerto',
            Region: 'Jawa Timur',
            Postal: '61385',
            LongLabel: 'Lolawang, Ngoro, Mojokerto, Jawa Timur, 61385, IDN',
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }
    if (href.includes('geocode.arcgis.com') && href.includes('findAddressCandidates')) {
      return new Response(
        JSON.stringify({
          candidates: [
            {
              address: 'SMAN 1 Ngoro, Mojokerto, Jawa Timur',
              location: { x: 112.6029, y: -7.5561 },
              attributes: { PlaceName: 'SMAN 1 Ngoro', Place_addr: 'Ngoro, Mojokerto, Jawa Timur', Type: 'School' },
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }
    return new Response('Rate Limited', { status: 429 });
  };

  try {
    const revRes = createMockRes();
    await reverseGeocodeProxy({ query: { lat: '-7.5561', lng: '112.6029' } }, revRes);
    assert.equal(revRes.statusCode, 200);
    assert.equal(revRes.body.data.source, 'arcgis_proxy');
    assert.equal(revRes.body.data.village, 'Lolawang');

    const searchRes = createMockRes();
    await searchGeocodeProxy({ query: { q: 'SMAN 1 Ngoro' } }, searchRes);
    assert.equal(searchRes.statusCode, 200);
    assert.equal(searchRes.body.results.length, 1);
    assert.equal(searchRes.body.results[0].label, 'SMAN 1 Ngoro');
  } finally {
    globalThis.fetch = originalFetch;
    __resetSpatialControllerCachesForTest();
  }
});

test('Overpass proxy uses overpass.osm.ch mirror and aborts gracefully on timeout', async () => {
  const originalFetch = globalThis.fetch;
  const hitHosts = [];

  globalThis.fetch = async (url) => {
    const u = new URL(url);
    hitHosts.push(u.hostname);
    if (u.hostname === 'overpass.osm.ch') {
      return new Response(JSON.stringify({ version: 0.6, elements: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response('Bad Gateway', { status: 502 });
  };

  try {
    const res = createMockRes();
    await getOverpassData({ query: { bbox: '-7.56,112.59,-7.55,112.61', layer: 'Villages', fresh: 'true' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(hitHosts[0], 'overpass.osm.ch');
    assert.equal(res.body.type, 'FeatureCollection');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('BMKG Public Forecast (/prakiraan-cuaca) and Nowcast RSS (/peringatan-dini) parse live feeds cleanly', async () => {
  __resetBmkgNoaaCacheForTest();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url) => {
    const href = String(url);
    if (href.includes('api.bmkg.go.id/publik/prakiraan-cuaca')) {
      return new Response(
        JSON.stringify({
          lokasi: { desa: 'Manduro Manggunggajah', kecamatan: 'Ngoro', kotkab: 'Mojokerto', provinsi: 'Jawa Timur' },
          data: [
            {
              cuaca: [
                [
                  {
                    local_datetime: '2026-11-20 18:00:00',
                    utc_datetime: '2026-11-20 11:00:00',
                    t: 27,
                    hu: 82,
                    weather_desc: 'Berawan',
                    weather: 3,
                    ws: 12,
                    wd: 'SE',
                    tcc: 75,
                    vs_text: '> 10 km',
                  },
                ],
              ],
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }
    if (href.includes('bmkg.go.id/alerts/nowcast/id')) {
      return new Response(
        `<rss><channel><item><title>Peringatan Dini Cuaca Provinsi Jawa Timur</title><link>https://www.bmkg.go.id/alerts/nowcast/id/1</link><description><![CDATA[Potensi hujan sedang hingga lebat di Mojokerto.]]></description><pubDate>Fri, 20 Nov 2026 11:00:00 GMT</pubDate></item></channel></rss>`,
        { status: 200, headers: { 'content-type': 'application/xml' } }
      );
    }
    return new Response('Not Found', { status: 404 });
  };

  const app = express();
  app.use('/api/bmkg', bmkgRouter);
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const rBad = await originalFetch(`${baseUrl}/api/bmkg/prakiraan-cuaca?adm4=invalid`);
    assert.equal(rBad.status, 400);

    const rPrakiraan = await originalFetch(`${baseUrl}/api/bmkg/prakiraan-cuaca?adm4=35.16.05.2008`);
    assert.equal(rPrakiraan.status, 200);
    const prakJson = await rPrakiraan.json();
    assert.equal(prakJson.dataStatus, 'LIVE');
    assert.equal(prakJson.slots[0].temperatureC, 27);

    const rNowcast = await originalFetch(`${baseUrl}/api/bmkg/peringatan-dini`);
    assert.equal(rNowcast.status, 200);
    const nowJson = await rNowcast.json();
    assert.equal(nowJson.dataStatus, 'LIVE');
    assert.equal(nowJson.count, 1);
    assert.equal(nowJson.items[0].province, 'Jawa Timur');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    globalThis.fetch = originalFetch;
    __resetBmkgNoaaCacheForTest();
  }
});

test('CCTV resolveAlias and rewriteHlsPlaylist rewrite /api/stream?t= and #EXT-X-KEY URIs via proxy', () => {
  assert.equal(
    cctvService.resolveAlias('pelindung-05d5d4bd-05d6-4816-9cbf-e186c41ac638'),
    'pelindung-e5acec7b-fdde-428b-bb13-014a41fc52c1'
  );
  assert.equal(cctvService.resolveAlias('jogja-991'), 'pantausemar-8393');

  const rawM3u8 = [
    '#EXTM3U',
    '#EXT-X-KEY:METHOD=AES-128,URI="/key/secret.key"',
    '#EXTINF:2.0,',
    '/api/stream?t=token123',
    'chunk_001.ts',
  ].join('\n');

  const rewritten = cctvService.rewriteHlsPlaylist(rawM3u8, 'https://cctvnusantara.com/api/stream?id=pantausemar-310');
  assert.ok(rewritten.includes('/api/spatial/traffic/cctv-proxy?url=https%3A%2F%2Fcctvnusantara.com%2Fkey%2Fsecret.key'));
  assert.ok(rewritten.includes('/api/spatial/traffic/cctv-proxy?url=https%3A%2F%2Fcctvnusantara.com%2Fapi%2Fstream%3Ft%3Dtoken123'));
  assert.ok(rewritten.includes('/api/spatial/traffic/cctv-proxy?url=https%3A%2F%2Fcctvnusantara.com%2Fapi%2Fchunk_001.ts'));
});

test('OSRM routingService & snapCorridorToActualRoad fail over to routing.openstreetmap.de/routed-car', async () => {
  const originalFetch = globalThis.fetch;
  const hitUrls = [];

  globalThis.fetch = async (url) => {
    const href = String(url);
    hitUrls.push(href);
    if (href.includes('router.project-osrm.org')) {
      return new Response('Gateway Timeout', { status: 504 });
    }
    if (href.includes('routing.openstreetmap.de/routed-car')) {
      return new Response(
        JSON.stringify({
          code: 'Ok',
          routes: [
            {
              distance: 5200,
              duration: 420,
              geometry: {
                coordinates: [
                  [112.602, -7.556],
                  [112.608, -7.559],
                  [112.615, -7.562],
                ],
              },
              legs: [{ steps: [{ maneuver: { type: 'depart' }, name: 'Jl. Raya Ngoro', distance: 5200, duration: 420 }] }],
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }
    return new Response('Not Found', { status: 404 });
  };

  try {
    const routeRes = await routingService.calculateRoute(
      { lat: -7.556, lng: 112.602, name: 'A' },
      { lat: -7.562, lng: 112.615, name: 'B' },
      'emergency'
    );
    assert.equal(routeRes.routeMode, 'ROAD_NETWORK');
    assert.notEqual(routeRes.isError, true);
    assert.equal(routeRes.distanceKm, 5.2);
    assert.ok(hitUrls.some((u) => u.includes('routing.openstreetmap.de/routed-car')));

    const snapped = await snapCorridorToActualRoad({
      id: 'c1',
      name: 'Ruas Uji',
      path: [
        [112.602, -7.556],
        [112.615, -7.562],
      ],
      segments: [
        {
          id: 's1',
          roadName: 'Jl. Raya Ngoro',
          path: [
            [112.602, -7.556],
            [112.615, -7.562],
          ],
          status: 'Lancar',
          color: '#22c55e',
          speedKmh: 50,
          freeFlowKmh: 60,
          delaySeconds: 0,
        },
      ],
    });
    assert.equal(snapped.segments[0].path.length, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
