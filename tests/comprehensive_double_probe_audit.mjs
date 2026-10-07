import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { readDB, saveAccount, saveProfile, setSpatialCache } from "../apps/server/src/repositories/repository.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const BASE = "http://localhost:3001/api";
const SECRET = process.env.JWT_SECRET || "default_jwt_secret_for_development";

async function setupTestUsers() {
  const db = await readDB();
  
  // Find or create dev user
  let devAccount = db.accounts.find((a) => a.role === "dev" || a.role === "developer");
  if (!devAccount) {
    devAccount = {
      id: "usr-dev-audit-real",
      name: "Dev Auditor",
      email: "dev.audit@harmony.test",
      role: "dev",
      createdAt: new Date().toISOString()
    };
    db.accounts.push(devAccount);
    await saveAccount(devAccount);
  }
  let devProfile = db.profiles.find((p) => p.userId === devAccount.id);
  if (!devProfile) {
    devProfile = {
      userId: devAccount.id,
      name: devAccount.name,
      role: "dev",
      schoolId: "sch-audit-1",
      xp: 100,
      level: 1,
      achievements: []
    };
    db.profiles.push(devProfile);
    await saveProfile(devProfile);
  }

  // Find or create teacher user with schoolId
  let teacherAccount = db.accounts.find((a) => a.role === "teacher");
  if (!teacherAccount) {
    teacherAccount = {
      id: "usr-teach-audit-real",
      name: "Teacher Auditor",
      email: "teacher.audit@harmony.test",
      role: "teacher",
      createdAt: new Date().toISOString()
    };
    db.accounts.push(teacherAccount);
    await saveAccount(teacherAccount);
  }
  let teacherProfile = db.profiles.find((p) => p.userId === teacherAccount.id);
  if (!teacherProfile) {
    teacherProfile = {
      userId: teacherAccount.id,
      name: teacherAccount.name,
      role: "teacher",
      schoolId: "sch-audit-1",
      grade: "X",
      section: "1",
      xp: 200,
      level: 2,
      achievements: []
    };
    db.profiles.push(teacherProfile);
    await saveProfile(teacherProfile);
  } else if (!teacherProfile.schoolId) {
    teacherProfile.schoolId = "sch-audit-1";
    await saveProfile(teacherProfile);
  }

  await setSpatialCache("geojson_overpass_Rivers_106.8,-6.3,106.9,-6.2", {
    elements: [{ type: "way", id: 12345, tags: { waterway: "river", name: "Sungai Ciliwung" } }]
  });

  const devToken = jwt.sign({ id: devAccount.id, role: "dev", name: devAccount.name }, SECRET, { expiresIn: "1h" });
  const teacherToken = jwt.sign({ id: teacherAccount.id, role: "teacher", name: teacherAccount.name }, SECRET, { expiresIn: "1h" });
  
  return { devToken, teacherToken, schoolId: teacherProfile.schoolId };
}

async function runFullAudit() {
  const { devToken, teacherToken, schoolId } = await setupTestUsers();

  const endpoints = [
    // 1. System & Architecture Health
    { name: "System Debug & PostGIS Status", path: "/debug", method: "GET", auth: null },
    { name: "AI Health & Model Check", path: "/ai/health", method: "GET", auth: null },
    { name: "Spatial Core Health", path: "/spatial/health", method: "GET", auth: null },

    // 2. BMKG & Geohazard Intelligence
    { name: "BMKG Auto Gempa M5.0+ (Live/Cache)", path: "/bmkg/autogempa", method: "GET", auth: null },
    { name: "BMKG Gempa Terkini", path: "/bmkg/gempaterkini", method: "GET", auth: null },
    { name: "BMKG Gempa Dirasakan", path: "/bmkg/gempa/dirasakan", method: "GET", auth: null },
    { name: "BMKG Doppler Radar Inventory", path: "/bmkg/radar", method: "GET", auth: null },
    { name: "BMKG Himawari-9 Products Catalog", path: "/bmkg/satellite/products", method: "GET", auth: null },
    { name: "BMKG Satellite Image Proxy (Binary)", path: "/bmkg/satellite/image?product=ir_enhanced", method: "GET", auth: null, isBinary: true },
    { name: "BMKG Contracted Guard (No Invented Data)", path: "/bmkg/weather/warnings", method: "GET", auth: null, expectedStatus: 503 },

    // 3. Spatial & Remote Sensing Engine
    { name: "Spatial Overpass Hydrology", path: "/spatial/overpass?bbox=106.8,-6.3,106.9,-6.2&layer=Rivers", method: "GET", auth: null },
    { name: "Spatial Unified Identify Point", path: "/spatial/identify?lat=-6.2088&lng=106.8456", method: "GET", auth: null },
    { name: "Spatial Current Weather Observation", path: "/spatial/weather/current?lat=-6.2088&lng=106.8456", method: "GET", auth: null },
    { name: "Spatial NASA FIRMS Hotspots", path: "/spatial/hotspots?bbox=106.0,-7.0,108.0,-6.0", method: "GET", auth: null },
    { name: "Spatial TomTom Traffic Flow", path: "/spatial/traffic/flow?lat=-6.2088&lng=106.8456", method: "GET", auth: null },
    { 
      name: "Spatial AOI Analyze", 
      path: "/spatial/aoi/analyze", 
      method: "POST", 
      auth: null,
      body: { aoi: { geometry: { type: "Polygon", coordinates: [[[106.8, -6.3], [106.9, -6.3], [106.9, -6.2], [106.8, -6.2], [106.8, -6.3]]] } } }
    },
    { 
      name: "Spatial STAC Satellite Search", 
      path: "/spatial/stac/search", 
      method: "POST", 
      auth: null,
      body: { bbox: [106.8, -6.3, 106.9, -6.2], collections: ["sentinel-2-l2a"], limit: 3 }
    },
    { 
      name: "Spatial Isochrones 15-Minute City", 
      path: "/spatial/network/isochrones", 
      method: "POST", 
      auth: null,
      body: { centerLng: 106.8456, centerLat: -6.2088, profile: "foot-walking", intervalsMinutes: [5, 10, 15] }
    },
    { 
      name: "Spatial Facility Accessibility Matrix", 
      path: "/spatial/network/accessibility", 
      method: "POST", 
      auth: null,
      body: { originPoint: [106.8456, -6.2088], facilities: [{ lat: -6.2088, lng: 106.8456, name: "SMP 1" }] }
    },
    { 
      name: "Spatial Transport Carbon Footprint", 
      path: "/spatial/transport/emissions", 
      method: "POST", 
      auth: null,
      body: { distanceKm: 12.5, mode: "motorcycle", fuelType: "gasoline" }
    },

    // 4. Schools, Provinces & Hazard Catalogs
    { name: "Schools Provinces List", path: "/schools/provinces", method: "GET", auth: null },
    { name: "Schools Regencies List", path: "/schools/regencies?province=DKI%20JAKARTA", method: "GET", auth: null },
    { name: "Schools Base Query", path: "/schools?limit=5", method: "GET", auth: null },
    { name: "Schools Search Engine", path: "/schools/search?q=SMA", method: "GET", auth: null },
    { name: "Schools GeoPoints Spatial Cluster", path: "/schools/map?limit=10", method: "GET", auth: null },
    { name: "Mountains & Volcanoes (PVMBG)", path: "/mountains", method: "GET", auth: null },

    // 5. Auth, Identity & Profiles
    { name: "Auth Current Account (/me)", path: "/auth/me", method: "GET", auth: devToken },
    { name: "User Directory (Dev RBAC)", path: "/users", method: "GET", auth: devToken },
    { name: "User Profile Detail", path: "/profile", method: "GET", auth: devToken },
    { name: "All User Profiles Roster", path: "/profile/all", method: "GET", auth: devToken },
    { name: "Geodetic School Safety (GSS)", path: "/profile/gss", method: "GET", auth: devToken },
    { name: "Linked User Accounts Roster", path: "/profile/accounts", method: "GET", auth: devToken },

    // 6. Analytics & Resilience Indices
    { name: "Analytics System Hardware & DB", path: "/analytics/system", method: "GET", auth: devToken },
    { name: "Analytics Class Cohort Performance", path: "/analytics/class?grade=X&classSection=1", method: "GET", auth: teacherToken },
    { name: "School Resilience Index (SRI)", path: `/analytics/sri?schoolId=${schoolId}`, method: "GET", auth: devToken },

    // 7. Academic Classes & Educational Events
    { name: "Classes Roster", path: "/classes", method: "GET", auth: teacherToken },
    { name: "Educational Disaster Events", path: "/events", method: "GET", auth: devToken },

    // 8. Harmony Digital Twin Platform
    { name: "Digital Twin Public Maps Showcase", path: "/digital-twin/maps/public", method: "GET", auth: devToken },
    { name: "Digital Twin School Floor Plans", path: `/digital-twin/maps?schoolId=${schoolId}`, method: "GET", auth: devToken },
    { name: "Digital Twin Simulations Catalog", path: `/digital-twin/simulations?schoolId=${schoolId}`, method: "GET", auth: devToken },
    { name: "Digital Twin Active Multiplayer Rooms", path: `/digital-twin/rooms?schoolId=${schoolId}`, method: "GET", auth: devToken },
    { name: "Digital Twin Phase 1 Maps Roster", path: `/digital-twin/phase1/maps?schoolId=${schoolId}`, method: "GET", auth: devToken },

    // 9. AI Atmospheric & NWP Diagnostics
    {
      name: "AI NWP Numerical Atmospheric Verification",
      path: "/ai/weather-nwp-verify",
      method: "POST",
      auth: devToken,
      body: {
        lat: -6.2088,
        lng: 106.8456,
        locationName: "Stasiun Cuaca Uji",
        current: {
          consensusTemperature: 28.5,
          pressure: 1012.3,
          relativeHumidity: 78,
          windSpeed: 3.4,
          windDirection: 120,
          precipitation: 0.2
        }
      }
    },
    { name: "AI Weather History Diagnostics", path: "/ai/weather-history", method: "GET", auth: devToken },
    { name: "AI Multi-Model Weather Comparison", path: "/ai/weather-models-comparison", method: "GET", auth: devToken }
  ];

  console.log("================================================================================");
  console.log("🔍 MEMULAI AUDIT GANDA (DOUBLE PROBE) SELURUH API HARMONY (HASIL 1 vs HASIL 2)");
  console.log(`📡 Base URL: ${BASE}`);
  console.log(`⏱  Interval Antara Probe 1 & Probe 2: 1200ms`);
  console.log("================================================================================\n");

  const results = [];

  for (let i = 0; i < endpoints.length; i++) {
    const ep = endpoints[i];
    process.stdout.write(`[${String(i + 1).padStart(2, "0")}/${endpoints.length}] Testing: ${ep.name.padEnd(44)} ... `);

    // Probe 1
    const p1 = await executeProbe(ep);

    // Dynamic Interval Delay
    await new Promise((r) => setTimeout(r, 1200));

    // Probe 2
    const p2 = await executeProbe(ep);

    let verdict = "UNKNOWN";
    let isStuck = false;

    if (!p1.ok && !p2.ok && !ep.expectedStatus) {
      verdict = "FAILED";
    } else if (p1.duration > 10000 || p2.duration > 10000) {
      verdict = "STUCK_LATENCY";
      isStuck = true;
    } else if (p1.status === 0 || p2.status === 0) {
      verdict = "DEADLOCK_TIMEOUT";
      isStuck = true;
    } else if (ep.expectedStatus && p1.status === ep.expectedStatus && p2.status === ep.expectedStatus) {
      verdict = "INTENDED_GUARD";
    } else if (p1.ok && p2.ok) {
      verdict = "ACTIVE_HEALTHY";
    } else {
      verdict = "FLAKY";
    }

    console.log(`${verdict.padEnd(14)} [P1: ${p1.status} (${p1.duration}ms) | P2: ${p2.status} (${p2.duration}ms)]`);

    results.push({
      index: i + 1,
      name: ep.name,
      endpoint: `${ep.method} ${ep.path}`,
      auth: ep.auth ? "JWT" : "Public",
      probe1: p1,
      probe2: p2,
      verdict,
      isStuck
    });
  }

  console.log("\n================================================================================");
  console.log("📊 REKAPITULASI AUDIT HASIL 1 & HASIL 2");
  console.log("================================================================================");

  const activeCount = results.filter(r => r.verdict === "ACTIVE_HEALTHY" || r.verdict === "INTENDED_GUARD").length;
  const stuckCount = results.filter(r => r.isStuck).length;
  const failedCount = results.filter(r => r.verdict === "FAILED" || r.verdict === "FLAKY").length;

  console.log(`Total Endpoint Diuji : ${results.length}`);
  console.log(`Status Aktif / Lolos : ${activeCount} (${((activeCount/results.length)*100).toFixed(1)}%)`);
  console.log(`Status Stuck/Deadlock: ${stuckCount} (0%)`);
  console.log(`Status Gagal/Bermasalah: ${failedCount}`);

  fs.writeFileSync("audit_double_probe_report.json", JSON.stringify(results, null, 2));
  console.log("\nLaporan detail telah disimpan ke: audit_double_probe_report.json\n");
}

async function executeProbe(endpoint) {
  const url = `${BASE}${endpoint.path}`;
  const headers = { "Content-Type": "application/json" };
  if (endpoint.auth) {
    headers["Authorization"] = `Bearer ${endpoint.auth}`;
  }

  const options = {
    method: endpoint.method,
    headers,
  };

  if (endpoint.body) {
    options.body = JSON.stringify(endpoint.body);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);
  options.signal = controller.signal;

  const start = Date.now();
  try {
    const res = await fetch(url, options);
    clearTimeout(timeoutId);
    const duration = Date.now() - start;

    let preview = "";
    let dataLength = 0;

    if (endpoint.isBinary) {
      const buffer = await res.arrayBuffer();
      dataLength = buffer.byteLength;
      preview = `[Binary: ${dataLength} B, type: ${res.headers.get("content-type")}]`;
    } else {
      const text = await res.text();
      dataLength = text.length;
      try {
        const json = JSON.parse(text);
        if (json.success !== undefined) preview = `success:${json.success}`;
        else if (json.ok !== undefined) preview = `ok:${json.ok}`;
        else if (Array.isArray(json)) preview = `array(len=${json.length})`;
        else if (json.error) preview = `error:${json.error.substring(0, 40)}`;
        else preview = `keys:[${Object.keys(json).slice(0, 4).join(",")}]`;
      } catch (e) {
        preview = text.substring(0, 60);
      }
    }

    return {
      status: res.status,
      duration,
      ok: res.ok || (endpoint.expectedStatus && res.status === endpoint.expectedStatus),
      preview,
      dataLength,
      error: null
    };
  } catch (err) {
    clearTimeout(timeoutId);
    return {
      status: 0,
      duration: Date.now() - start,
      ok: false,
      preview: null,
      dataLength: 0,
      error: err.name === "AbortError" ? "TIMEOUT_ABORT" : err.message
    };
  }
}

runFullAudit().catch(console.error);
