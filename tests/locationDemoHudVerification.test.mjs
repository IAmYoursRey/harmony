import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import {
  getCurrentWeatherProxy,
  reverseGeocodeProxy,
  searchGeocodeProxy,
  __resetSpatialControllerCachesForTest,
} from '../apps/server/src/controllers/spatialController.js';

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

const bundle = await build({
  stdin: {
    contents: `
      export { preciseGeocodingService } from './apps/web/src/services/preciseGeocodingService.ts';
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

const { preciseGeocodingService } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString('base64')}`
);

test('getCurrentWeatherProxy deduplicates concurrent requests, quantizes cache to 2 decimals, and enforces 429 cooldown', async () => {
  __resetSpatialControllerCachesForTest();
  const originalFetch = globalThis.fetch;
  let fetchCount = 0;

  globalThis.fetch = async (url) => {
    fetchCount += 1;
    await new Promise((r) => setTimeout(r, 15));
    const u = new URL(url);
    const lat = Number(u.searchParams.get('latitude'));
    const lng = Number(u.searchParams.get('longitude'));
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          latitude: lat,
          longitude: lng,
          timezone: 'Asia/Jakarta',
          current_units: {
            temperature_2m: '°C',
            apparent_temperature: '°C',
            relative_humidity_2m: '%',
            surface_pressure: 'hPa',
            wind_speed_10m: 'km/h',
            wind_direction_10m: '°',
            precipitation: 'mm',
            time: 'unixtime',
          },
          current: {
            time: Math.floor(Date.now() / 1000),
            interval: 900,
            temperature_2m: 29.4,
            apparent_temperature: 32.1,
            relative_humidity_2m: 74,
            surface_pressure: 1009.5,
            wind_speed_10m: 11.2,
            wind_direction_10m: 145,
            precipitation: 0,
            weather_code: 2,
          },
        };
      },
    };
  };

  try {
    const res1 = createMockRes();
    const res2 = createMockRes();
    const res3 = createMockRes();
    await Promise.all([
      getCurrentWeatherProxy({ query: { lat: '-7.551', lng: '112.601' } }, res1),
      getCurrentWeatherProxy({ query: { lat: '-7.552', lng: '112.602' } }, res2),
      getCurrentWeatherProxy({ query: { lat: '-7.553', lng: '112.603' } }, res3),
    ]);

    assert.equal(fetchCount, 1);
    assert.equal(res1.statusCode, 200);
    assert.equal(res2.statusCode, 200);
    assert.equal(res3.statusCode, 200);
    assert.equal(res1.body.success, true);
    assert.equal(res1.body.data.temperature, 29.4);

    const resCached = createMockRes();
    await getCurrentWeatherProxy({ query: { lat: '-7.554', lng: '112.604' } }, resCached);
    assert.equal(fetchCount, 1);
    assert.equal(resCached.body.source, 'server_cache');

    __resetSpatialControllerCachesForTest();
    globalThis.fetch = async () => {
      fetchCount += 1;
      return { ok: false, status: 429 };
    };

    const res429 = createMockRes();
    await getCurrentWeatherProxy({ query: { lat: '-7.60', lng: '112.65' } }, res429);
    assert.equal(res429.statusCode, 502);

    const countBeforeCooldown = fetchCount;
    const resCooldown = createMockRes();
    await getCurrentWeatherProxy({ query: { lat: '-7.62', lng: '112.67' } }, resCooldown);
    assert.equal(resCooldown.statusCode, 503);
    assert.equal(fetchCount, countBeforeCooldown);
  } finally {
    globalThis.fetch = originalFetch;
    __resetSpatialControllerCachesForTest();
  }
});

test('reverseGeocodeProxy & searchGeocodeProxy fall back across providers, deduplicate concurrent calls, and return 502 on total upstream outage', async () => {
  __resetSpatialControllerCachesForTest();
  const originalFetch = globalThis.fetch;
  let bdcCalls = 0;

  globalThis.fetch = async (url) => {
    const href = String(url);
    if (href.includes('nominatim.openstreetmap.org/reverse')) {
      return { ok: false, status: 429 };
    }
    if (href.includes('bigdatacloud.net')) {
      bdcCalls += 1;
      await new Promise((r) => setTimeout(r, 15));
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            locality: 'Ngoro',
            city: 'Mojokerto',
            principalSubdivision: 'Jawa Timur',
            localityInfo: {
              administrative: [
                { adminLevel: 4, name: 'Jawa Timur' },
                { adminLevel: 5, name: 'Mojokerto' },
                { adminLevel: 7, name: 'Ngoro' },
              ],
            },
          };
        },
      };
    }
    return { ok: false, status: 500 };
  };

  try {
    const r1 = createMockRes();
    const r2 = createMockRes();
    await Promise.all([
      reverseGeocodeProxy({ query: { lat: '-7.5561', lng: '112.6028' } }, r1),
      reverseGeocodeProxy({ query: { lat: '-7.5562', lng: '112.6029' } }, r2),
    ]);
    assert.equal(bdcCalls, 1);
    assert.equal(r1.statusCode, 200);
    assert.equal(r1.body.data.village, 'Ngoro');

    const rCached = createMockRes();
    await reverseGeocodeProxy({ query: { lat: '-7.5564', lng: '112.6031' } }, rCached);
    assert.equal(bdcCalls, 1);
    assert.equal(rCached.body.source, 'server_cache');

    // Clear 429 cooldown before verifying Photon -> Nominatim fallback in searchGeocodeProxy
    __resetSpatialControllerCachesForTest();
    globalThis.fetch = async (url) => {
      const href = String(url);
      if (href.includes('photon.komoot.io')) {
        return { ok: false, status: 503 };
      }
      if (href.includes('nominatim.openstreetmap.org/search')) {
        return {
          ok: true,
          status: 200,
          async json() {
            return [
              {
                place_id: 9911,
                lat: '-7.556',
                lon: '112.603',
                name: 'SMAN 1 Ngoro',
                display_name: 'SMAN 1 Ngoro, Mojokerto, Jawa Timur',
                type: 'school',
              },
            ];
          },
        };
      }
      return { ok: false, status: 500 };
    };

    const s1 = createMockRes();
    await searchGeocodeProxy({ query: { q: 'SMAN 1 Ngoro' } }, s1);
    assert.equal(s1.statusCode, 200);
    assert.equal(s1.body.results.length, 1);
    assert.equal(s1.body.results[0].label, 'SMAN 1 Ngoro');

    globalThis.fetch = async () => ({ ok: false, status: 502 });
    const sFail = createMockRes();
    await searchGeocodeProxy({ query: { q: 'LokasiGagalTotal' } }, sFail);
    assert.equal(sFail.statusCode, 502);
    assert.equal(sFail.body.success, false);
  } finally {
    globalThis.fetch = originalFetch;
    __resetSpatialControllerCachesForTest();
  }
});

test('preciseGeocodingService omits forbidden browser User-Agent, deduplicates in-flight calls, and preserves unavailable contract', async () => {
  const originalFetch = globalThis.fetch;
  const seenHeaders = [];
  let nomCalls = 0;

  globalThis.fetch = async (url, init) => {
    const href = String(url);
    if (init?.headers) seenHeaders.push(init.headers);
    if (href.startsWith('/api/')) {
      throw new Error('no relative backend in unit test');
    }
    if (href.includes('nominatim.openstreetmap.org/reverse')) {
      nomCalls += 1;
      await new Promise((r) => setTimeout(r, 15));
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            display_name: 'Ngoro, Mojokerto, Jawa Timur',
            address: {
              village: 'Ngoro',
              district: 'Ngoro',
              county: 'Mojokerto',
              state: 'Jawa Timur',
            },
          };
        },
      };
    }
    throw new Error('unexpected url ' + href);
  };

  try {
    const [a, b] = await Promise.all([
      preciseGeocodingService.reverseGeocode(-7.5561, 112.6028, 12),
      preciseGeocodingService.reverseGeocode(-7.5562, 112.6029, 18),
    ]);
    assert.equal(nomCalls, 1);
    assert.equal(a.village, 'Desa Ngoro');
    assert.equal(b.accuracyM, 18);

    for (const hdr of seenHeaders) {
      const keys = Object.keys(hdr).map((k) => k.toLowerCase());
      assert.equal(keys.includes('user-agent'), false);
    }

    globalThis.fetch = async () => {
      throw new Error('network outage');
    };
    const unavailable = await preciseGeocodingService.reverseGeocode(-8.91, 114.91);
    assert.equal(unavailable.source, 'unavailable');
    assert.equal(unavailable.isError, true);
    assert.equal(unavailable.village, 'Tidak Tersedia');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Demo account routing, cold-start JWT persistence, badges, MapsView HUD, Cesium 3D focus, and performance optimizations exist', async () => {
  const read = (rel) => fs.readFile(path.join(process.cwd(), rel), 'utf8');
  const [
    authJs,
    profileJs,
    dashboardLayout,
    authContext,
    topbar,
    sidebar,
    hero,
    cta,
    useDemoHook,
    mapsView,
    cesiumGlobe,
    copilot,
    viteConfig,
    vercelJson,
  ] = await Promise.all([
    read('apps/server/src/routes/auth.js'),
    read('apps/server/src/routes/profile.js'),
    read('apps/web/src/components/dashboard/DashboardLayout.tsx'),
    read('apps/web/src/context/AuthContext.tsx'),
    read('apps/web/src/components/dashboard/Topbar.tsx'),
    read('apps/web/src/components/dashboard/Sidebar.tsx'),
    read('apps/web/src/components/Hero.tsx'),
    read('apps/web/src/components/CTA.tsx'),
    read('apps/web/src/hooks/useDemoStudentLogin.ts'),
    read('apps/web/src/components/dashboard/views/spatial/MapsView.tsx'),
    read('apps/web/src/components/dashboard/views/spatial/CesiumGlobe3D.tsx'),
    read('apps/web/src/components/dashboard/FloatingAICopilot.tsx'),
    read('apps/web/vite.config.ts'),
    read('vercel.json'),
  ]);

  assert.match(authJs, /isDemo:\s*Boolean\(/);
  assert.match(authJs, /grade:\s*account\.role\s*===\s*"teacher"\s*\|\|\s*account\.role\s*===\s*"developer"\s*\?\s*"-"\s*:\s*"X"/);
  assert.match(authJs, /req\.user\?\.isDemo/);
  assert.match(profileJs, /user\?\.isDemo/);

  assert.match(dashboardLayout, /!isDemoNgoroUser\(currentUser\)/);
  assert.match(authContext, /buildFallbackDemoProfile/);
  assert.match(authContext, /setCurrentProfile\(resolvedProfile\);\s*setCurrentUser\(account\);/);
  assert.match(topbar, /Demo Account/);
  assert.match(sidebar, /Demo Account/);
  assert.match(useDemoHook, /navigate\("\/app\/dashboard", \{ replace: true \}\)/);
  assert.match(hero, /useDemoStudentLogin/);
  assert.match(cta, /useDemoStudentLogin/);

  assert.equal(mapsView.includes('fetchGlobalWeatherAndSeason'), false);
  assert.equal(mapsView.includes('fetchConsensusWeather'), false);
  assert.match(mapsView, /mapWeatherLiveService\.subscribe/);
  assert.match(mapsView, /acquireBestGpsPosition/);
  assert.match(mapsView, /handleFindUserLocationRef/);
  assert.match(mapsView, /cameraFocusRequestId/);
  assert.match(mapsView, /Cari lokasi atau sekolah\.\.\./);
  assert.match(mapsView, /Pusatkan ke SMAN 1 Ngoro/);
  assert.match(mapsView, /harmony:map-overlay-state/);
  assert.match(mapsView, /max-w-\[calc\(100vw-5\.5rem\)\]/);

  assert.match(cesiumGlobe, /cameraFocusRequestId/);
  assert.match(cesiumGlobe, /harmony:map-overlay-state/);
  assert.match(cesiumGlobe, /sm:left-6/);
  assert.match(copilot, /hasMapOverlayOpen/);

  assert.match(viteConfig, /manualChunks/);
  assert.match(vercelJson, /Cache-Control/);
});

