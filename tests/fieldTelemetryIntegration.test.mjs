import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import express from "express";

process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.VERCEL = "";
process.env.STASIUN_TOKEN = "";

const ROOT_DIR = path.resolve(import.meta.dirname, "..");

const {
  __resetTelemetryStorageForTest,
  hitungInfoWaktuLokal,
  hitungPengirimanEfektif,
} = await import("../apps/server/src/services/telemetry/storage.js");

const {
  ADM4_BAKU,
  hitungFFMC,
  hitungStatusKebakaran,
  hitungWaktuTanam,
  normalisasiDataBMKG,
} = await import("../apps/server/src/services/telemetry/weatherEngine.js");

const {
  __setRegionFetcherForTest,
  __clearRegionCacheForTest,
  hitungJarakKm,
  hitungAzimutDanArah,
  cariAdm4DariKoordinat,
} = await import("../apps/server/src/services/telemetry/regionResolver.js");

const {
  default: telemetryRoutes,
} = await import("../apps/server/src/routes/telemetryRoutes.js");

const {
  handleTelemetryData,
  handleTelemetryCommand,
  handleTelemetrySync,
  handleTelemetryWeather,
  __setBmkgFetcherForTest,
  __clearTelemetryControllerCachesForTest,
} = await import("../apps/server/src/controllers/telemetryController.js");

function createSampleBmkgPayload(adm4 = "35.16.05.2010", desa = "Ngoro") {
  const nowJakarta = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const slots = [];
  for (let dayOffset = 0; dayOffset < 3; dayOffset += 1) {
    const dt = new Date(Date.parse(`${nowJakarta}T00:00:00+07:00`) + dayOffset * 86400000);
    const tgl = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(dt);
    slots.push([
      {
        local_datetime: `${tgl} 12:00:00`,
        utc_datetime: `${tgl} 05:00:00`,
        t: 33,
        hu: 54,
        ws: 14,
        wd: "E",
        wd_deg: 90,
        wd_to: "W",
        tp: 0,
        tcc: 25,
        weather: 1,
        weather_desc: "Cerah Berawan",
        image: "",
      },
      {
        local_datetime: `${tgl} 15:00:00`,
        utc_datetime: `${tgl} 08:00:00`,
        t: 31,
        hu: 60,
        ws: 11,
        wd: "SE",
        wd_deg: 135,
        wd_to: "NW",
        tp: dayOffset === 1 ? 3.2 : 0,
        tcc: 45,
        weather: 3,
        weather_desc: dayOffset === 1 ? "Hujan Ringan" : "Berawan",
        image: "",
      },
    ]);
  }

  return {
    lokasi: {
      adm4,
      desa,
      kecamatan: "Ngoro",
      kotkab: "Mojokerto",
      provinsi: "Jawa Timur",
      lat: -7.541,
      lon: 112.607,
    },
    data: [
      {
        lokasi: {
          adm4,
          desa,
          kecamatan: "Ngoro",
          kotkab: "Mojokerto",
          provinsi: "Jawa Timur",
          lat: -7.541,
          lon: 112.607,
        },
        cuaca: slots,
      },
    ],
  };
}

function createSampleOpenMeteoPayload() {
  const nowJakarta = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const time = [];
  const temperature_2m = [];
  const relative_humidity_2m = [];
  const wind_speed_10m = [];
  const wind_direction_10m = [];
  const precipitation = [];
  const cloud_cover = [];
  const weather_code = [];

  for (let dayOffset = 0; dayOffset < 3; dayOffset += 1) {
    const dt = new Date(Date.parse(`${nowJakarta}T00:00:00+07:00`) + dayOffset * 86400000);
    const tgl = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(dt);
    for (let hour = 0; hour < 24; hour += 1) {
      const hh = String(hour).padStart(2, "0");
      time.push(`${tgl}T${hh}:00`);
      temperature_2m.push(hour >= 10 && hour <= 15 ? 32.5 : 26.2);
      relative_humidity_2m.push(hour >= 10 && hour <= 15 ? 55 : 82);
      wind_speed_10m.push(12.4);
      wind_direction_10m.push(135);
      precipitation.push(dayOffset === 1 && hour === 15 ? 1.5 : 0);
      cloud_cover.push(35);
      weather_code.push(dayOffset === 1 && hour === 15 ? 61 : 2);
    }
  }

  return {
    latitude: -6.25,
    longitude: 107.0,
    timezone: "Asia/Jakarta",
    utc_offset_seconds: 25200,
    hourly: {
      time,
      temperature_2m,
      relative_humidity_2m,
      wind_speed_10m,
      wind_direction_10m,
      precipitation,
      cloud_cover,
      weather_code,
    },
  };
}

async function startTestServer() {
  const app = express();
  app.use(express.json());
  app.use("/api/telemetry", telemetryRoutes);
  app.all("/api/data", handleTelemetryData);
  app.all("/api/perintah", handleTelemetryCommand);
  app.all("/api/sinkron", handleTelemetrySync);
  app.all("/api/cuaca", handleTelemetryWeather);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  return { server, baseUrl };
}

test("Van Wagner FFMC, fire status escalation (BAHAYA/SIAGA/OFFLINE), and planting readiness calculations", () => {
  // Dry weather increases FFMC while rain drops it cleanly
  const dryFfmc = hitungFFMC(85.0, 34, 48, 16, 0);
  const wetFfmc = hitungFFMC(85.0, 26, 88, 6, 18);
  assert.ok(dryFfmc > 85.0);
  assert.ok(wetFfmc < 65.0);
  assert.equal(hitungFFMC(85.0, null, 60, 10, 0), null);

  // Dual M1 + M2 hardware confirmation escalates immediately to BAHAYA even without BMKG
  const bahaya = hitungStatusKebakaran({
    ffmc: null,
    apiTerdeteksi: true,
    lonjakanSuhuTanah: true,
    modulM1Aktif: true,
    modulM2Aktif: true,
  });
  assert.equal(bahaya.status, "BAHAYA");

  // Unreachable BMKG without fire triggers stays honestly OFFLINE
  const offline = hitungStatusKebakaran({ ffmc: null });
  assert.equal(offline.status, "OFFLINE");

  // Planting readiness evaluates to INDIKASI SIAP TANAM when all criteria align
  const siap = hitungWaktuTanam({
    berjalan: "tinggi",
    berikutnya: "tinggi",
    riwayatHujan: [{ waktu: new Date().toISOString(), curah_mm: 14 }],
    lembapTanah: 52,
    batasCukup: 40,
  });
  assert.equal(siap.indikasi, "INDIKASI SIAP TANAM");

  const belum = hitungWaktuTanam({
    berjalan: "rendah",
    berikutnya: "sedang",
    riwayatHujan: [],
    lembapTanah: 22,
    batasCukup: 40,
  });
  assert.equal(belum.indikasi, "BELUM SIAP");
});

test("Night power-saving schedule and geodesic bearing calculations match expected math", () => {
  const malam = hitungInfoWaktuLokal(Date.parse("2026-06-01T15:00:00Z"), 420); // 22:00 WIB
  assert.equal(malam.siang, false);
  assert.equal(malam.periode, "malam");

  const eff = hitungPengirimanEfektif(
    { mode: "terus", interval_detik: 1, hemat_malam: true, interval_malam_detik: 45 },
    malam
  );
  assert.equal(eff.aktif_malam, true);
  assert.equal(eff.mode_efektif, "jadwal");
  assert.equal(eff.interval_efektif, 45);

  const dist = hitungJarakKm(-7.541, 112.607, -7.55, 112.607);
  assert.ok(dist > 0.9 && dist < 1.1);
  const az = hitungAzimutDanArah(-7.541, 112.607, -7.531, 112.607);
  assert.equal(az.kode_id, "U");
});

test("Telemetry Express endpoints support gateway auth, 4-stage ambil_sampel, multi-station isolation, and honest offline BMKG", async () => {
  __resetTelemetryStorageForTest({ useMemory: true });
  __clearTelemetryControllerCachesForTest();
  __clearRegionCacheForTest();

  // Force BMKG fetch offline to verify zero fake 32C/85 FFMC values
  __setBmkgFetcherForTest(async () => {
    throw new Error("Simulated BMKG outage");
  });

  const { server, baseUrl } = await startTestServer();
  try {
    // 1. Offline BMKG produces honest nulls and OFFLINE fire status
    const offlineWeatherRes = await fetch(`${baseUrl}/api/telemetry/cuaca`);
    assert.equal(offlineWeatherRes.status, 200);
    const offlineWeather = await offlineWeatherRes.json();
    assert.equal(offlineWeather.bmkg.sumber_ok, false);
    assert.equal(offlineWeather.bmkg.saat_ini.suhu, null);
    assert.equal(offlineWeather.ffmc.nilai, null);
    assert.equal(offlineWeather.ffmc.status_kebakaran.status, "OFFLINE");

    // 2. Unauthorized hardware sync must fail 401; valid token succeeds 200
    const unauthSync = await fetch(`${baseUrl}/api/sinkron`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stasiun: "RUMAH-01", data: [] }),
    });
    assert.equal(unauthSync.status, 401);

    const routineSync = await fetch(`${baseUrl}/api/sinkron`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer uji",
      },
      body: JSON.stringify({
        stasiun: "RUMAH-01",
        status_rumah: { wifi_rssi: -58, lora_ok: true, uptime_detik: 120 },
        data: [
          { node: 1, seq: 10, jenis: "rutin", lembap: 48.5, suhu: 29.4, baterai: 4.02, rssi: -68, snr: 9.0, umur_detik: 2 },
        ],
      }),
    });
    assert.equal(routineSync.status, 200);
    const routineJson = await routineSync.json();
    assert.equal(routineJson.tersimpan, 1);

    // 3. 4-stage ambil_sampel flow
    const createCmdRes = await fetch(`${baseUrl}/api/telemetry/perintah`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ node: 1, aksi: "ambil_sampel" }),
    });
    assert.equal(createCmdRes.status, 201);
    const { perintah: cmdCreated } = await createCmdRes.json();
    assert.equal(cmdCreated.status, "menunggu");

    // Stage 2: gateway picks up waiting command
    const pollCmdSync = await fetch(`${baseUrl}/api/sinkron`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer uji" },
      body: JSON.stringify({ stasiun: "RUMAH-01", data: [] }),
    });
    const pollCmdJson = await pollCmdSync.json();
    assert.equal(pollCmdJson.perintah.length, 1);
    assert.equal(pollCmdJson.perintah[0].id, cmdCreated.id);

    const afterDiambil = await (await fetch(`${baseUrl}/api/perintah?id=${cmdCreated.id}`)).json();
    assert.equal(afterDiambil.perintah.status, "diambil");

    // Stage 3: gateway reports forwarded over LoRa
    await fetch(`${baseUrl}/api/sinkron`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer uji" },
      body: JSON.stringify({ stasiun: "RUMAH-01", laporan: [{ id: cmdCreated.id, status: "diteruskan" }], data: [] }),
    });
    const afterForward = await (await fetch(`${baseUrl}/api/perintah?id=${cmdCreated.id}`)).json();
    assert.equal(afterForward.perintah.status, "diteruskan");

    // Stage 4: sample payload closes command with telemetry attached
    const sampleToken = cmdCreated.id % 65536;
    await fetch(`${baseUrl}/api/sinkron`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer uji" },
      body: JSON.stringify({
        stasiun: "RUMAH-01",
        data: [
          { node: 1, seq: 11, jenis: "sampel", token: sampleToken, lembap: 51.2, suhu: 28.9, baterai: 4.01, rssi: -64, snr: 10.5 },
        ],
      }),
    });
    const afterSelesai = await (await fetch(`${baseUrl}/api/perintah?id=${cmdCreated.id}`)).json();
    assert.equal(afterSelesai.perintah.status, "selesai");
    assert.equal(Math.round(afterSelesai.perintah.lembap * 10) / 10, 51.2);

    // 4. Online BMKG flow + rain report + region normalization
    __setBmkgFetcherForTest(async (url) => {
      assert.ok(String(url).includes("api.bmkg.go.id"));
      const m = /adm4=([^&]+)/.exec(String(url));
      const code = m ? decodeURIComponent(m[1]) : ADM4_BAKU;
      return new Response(JSON.stringify(createSampleBmkgPayload(code, "Ngoro")), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const onlineRes = await fetch(`${baseUrl}/api/telemetry/cuaca?segar=1`);
    const onlineJson = await onlineRes.json();
    assert.equal(onlineJson.bmkg.sumber_ok, true);
    assert.equal(typeof onlineJson.ffmc.nilai, "number");
    assert.equal(onlineJson.ffmc.proyeksi.length, 3);

    const rainPost = await fetch(`${baseUrl}/api/telemetry/cuaca`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aksi: "lapor_hujan", curah_mm: 16.5, catatan: "Hujan sore deras" }),
    });
    assert.equal(rainPost.status, 201);
    const rainJson = await rainPost.json();
    assert.equal(rainJson.hujan.total_24jam_mm, 16.5);

    // Verify coordinate reverse geocode resolution using mocked Nominatim + wilayah.id responses
    __setRegionFetcherForTest(async (url) => {
      const s = String(url);
      if (s.includes("nominatim")) {
        return new Response(
          JSON.stringify({
            address: {
              country_code: "id",
              state: "Jawa Timur",
              county: "Kabupaten Mojokerto",
              municipality: "Kecamatan Ngoro",
              village: "Ngoro",
            },
          }),
          { status: 200 }
        );
      }
      if (s.includes("provinces.json")) {
        return new Response(JSON.stringify({ data: [{ code: "35", name: "Jawa Timur" }] }), { status: 200 });
      }
      if (s.includes("regencies/35.json")) {
        return new Response(JSON.stringify({ data: [{ code: "35.16", name: "Kabupaten Mojokerto" }] }), { status: 200 });
      }
      if (s.includes("districts/35.16.json")) {
        return new Response(JSON.stringify({ data: [{ code: "35.16.05", name: "Ngoro" }] }), { status: 200 });
      }
      if (s.includes("villages/35.16.05.json")) {
        return new Response(JSON.stringify({ data: [{ code: "35.16.05.2010", name: "Ngoro" }] }), { status: 200 });
      }
      return new Response("{}", { status: 404 });
    });

    const gpsResolved = await cariAdm4DariKoordinat(-7.537, 112.607, { segar: true });
    assert.equal(gpsResolved.adm4, "35.16.05.2010");
  } finally {
    __setBmkgFetcherForTest(null);
    __setRegionFetcherForTest(null);
    await new Promise((resolve) => server.close(resolve));
  }
});

test("Empty BMKG slots automatically fall back to Open-Meteo with resolved region metadata, and remain honest offline if both fail", async () => {
  __resetTelemetryStorageForTest({ useMemory: true });
  __clearTelemetryControllerCachesForTest();
  __clearRegionCacheForTest();

  const emptyBmkgMargajaya = {
    lokasi: {
      adm4: "32.75.04.1002",
      desa: "Margajaya",
      kecamatan: "Bekasi Selatan",
      kotkab: "Kota Bekasi",
      provinsi: "Jawa Barat",
      lat: -6.2445,
      lon: 106.9959,
    },
    data: [
      {
        lokasi: {
          adm4: "32.75.04.1002",
          desa: "Margajaya",
          kecamatan: "Bekasi Selatan",
          kotkab: "Kota Bekasi",
          provinsi: "Jawa Barat",
          lat: -6.2445,
          lon: 106.9959,
        },
        cuaca: [],
      },
    ],
  };

  const { server, baseUrl } = await startTestServer();
  try {
    // 1. BMKG returns empty cuaca: [] -> automatically uses Open-Meteo while preserving Margajaya metadata
    __setBmkgFetcherForTest(async (url) => {
      const s = String(url);
      if (s.includes("api.bmkg.go.id")) {
        return new Response(JSON.stringify(emptyBmkgMargajaya), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (s.includes("api.open-meteo.com")) {
        return new Response(JSON.stringify(createSampleOpenMeteoPayload()), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("{}", { status: 404 });
    });

    const fallbackRes = await fetch(`${baseUrl}/api/telemetry/cuaca?adm4=32.75.04.1002&segar=1`);
    assert.equal(fallbackRes.status, 200);
    const fallbackJson = await fallbackRes.json();
    assert.equal(fallbackJson.bmkg.sumber_ok, true);
    assert.equal(fallbackJson.bmkg.cadangan, true);
    assert.match(fallbackJson.bmkg.sumber, /Open-Meteo/);
    assert.equal(fallbackJson.bmkg.lokasi.desa, "Margajaya");
    assert.equal(fallbackJson.bmkg.lokasi.kecamatan, "Bekasi Selatan");
    assert.equal(typeof fallbackJson.ffmc.nilai, "number");
    assert.equal(fallbackJson.ffmc.proyeksi.length, 3);
    assert.equal(fallbackJson.kompas_dan_angin.titik_label, "Desa Margajaya, Kec. Bekasi Selatan");

    // 2. Both BMKG empty slots and Open-Meteo down -> stays honestly OFFLINE but still keeps resolved desa & kecamatan
    __resetTelemetryStorageForTest({ useMemory: true });
    __setBmkgFetcherForTest(async (url) => {
      const s = String(url);
      if (s.includes("api.bmkg.go.id")) {
        return new Response(JSON.stringify(emptyBmkgMargajaya), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("Service Unavailable", { status: 503 });
    });

    const bothDownRes = await fetch(`${baseUrl}/api/telemetry/cuaca?adm4=32.75.04.1002&segar=1`);
    assert.equal(bothDownRes.status, 200);
    const bothDownJson = await bothDownRes.json();
    assert.equal(bothDownJson.bmkg.sumber_ok, false);
    assert.equal(bothDownJson.bmkg.saat_ini.suhu, null);
    assert.equal(bothDownJson.ffmc.nilai, null);
    assert.equal(bothDownJson.ffmc.status_kebakaran.status, "OFFLINE");
    assert.equal(bothDownJson.bmkg.lokasi.desa, "Margajaya");
    assert.equal(bothDownJson.bmkg.lokasi.kecamatan, "Bekasi Selatan");
    assert.equal(bothDownJson.kompas_dan_angin.titik_label, "Desa Margajaya, Kec. Bekasi Selatan");
  } finally {
    __setBmkgFetcherForTest(null);
    await new Promise((resolve) => server.close(resolve));
  }
});

test("Harmony Sidebar, Router, Auth Guard, I18n, and Copilot wiring include Telemetri Lahan (Beta) and NASA FIRMS Hotspots with zero TERRA brand leakage", () => {
  const readUtf8 = (rel) => fs.readFileSync(path.join(ROOT_DIR, rel), "utf8");

  const navSrc = readUtf8("apps/web/src/components/dashboard/nav.ts");
  const sidebarSrc = readUtf8("apps/web/src/components/dashboard/Sidebar.tsx");
  const appSrc = readUtf8("apps/web/src/App.tsx");
  const layoutSrc = readUtf8("apps/web/src/components/dashboard/DashboardLayout.tsx");
  const topbarSrc = readUtf8("apps/web/src/components/dashboard/Topbar.tsx");
  const i18nSrc = readUtf8("apps/web/src/context/I18nContext.tsx");
  const copilotSrc = readUtf8("apps/web/src/components/dashboard/FloatingAICopilot.tsx");
  const fieldTelemetrySrc = readUtf8("apps/web/src/components/dashboard/views/telemetry/FieldTelemetryView.tsx");

  assert.match(navSrc, /id:\s*"field-telemetry"/);
  assert.match(sidebarSrc, /to="\/app\/field-telemetry"/);
  assert.match(sidebarSrc, />\s*Beta\s*</);
  assert.match(appSrc, /path="field-telemetry"/);
  assert.match(layoutSrc, /activeId !== "field-telemetry"/);
  assert.match(topbarSrc, /"field-telemetry"/);
  assert.match(i18nSrc, /"nav\.field-telemetry":\s*"Telemetri Lahan"/);
  assert.match(i18nSrc, /"nav\.field-telemetry":\s*"Field Telemetry"/);
  assert.match(copilotSrc, /\/app\/field-telemetry/);
  assert.match(fieldTelemetrySrc, /GeospatialHotspotsTab/);
  assert.match(fieldTelemetrySrc, /id:\s*"hotspots"/);
  assert.match(fieldTelemetrySrc, /Titik Panas Satelit/);

  // Enforce zero residual external branding in newly created telemetry UI/server files
  const newFiles = [
    "apps/server/src/services/telemetry/storage.js",
    "apps/server/src/services/telemetry/weatherEngine.js",
    "apps/server/src/services/telemetry/regionResolver.js",
    "apps/server/src/controllers/telemetryController.js",
    "apps/server/src/routes/telemetryRoutes.js",
    "apps/web/src/services/fieldTelemetryService.ts",
    "apps/web/src/components/dashboard/views/telemetry/FieldCompassCard.tsx",
    "apps/web/src/components/dashboard/views/telemetry/FfmcGaugeChart.tsx",
    "apps/web/src/components/dashboard/views/telemetry/ExpansionArchitecturePanel.tsx",
    "apps/web/src/components/dashboard/views/telemetry/FieldTelemetryView.tsx",
  ];
  for (const rel of newFiles) {
    const content = readUtf8(rel);
    assert.equal(/\bterra\b/i.test(content), false, `Found residual external brand reference in ${rel}`);
  }
});

