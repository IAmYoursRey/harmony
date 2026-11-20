import { normalizeFirmsQuery, fetchFirmsSnapshot } from '../services/firmsIntegrity.js';
import { validateProviderCurrent } from '../services/weatherIntegrity.js';
import { synthesizeSchoolRisk } from '../services/spatialRiskEngine.js';
import { cctvService } from '../services/cctvService.js';
import { trafficSignalsService as trafficSignalsBackendService } from '../services/trafficSignalsService.js';
import {
  getSpatialCache,
  setSpatialCache,
  pool,
  identifyNearPoint,
  querySpatialFeaturesInAOI,
  readDB,
  saveSpatialJob,
  getSpatialJobById,
  deleteSpatialJobById,
} from "../repositories/repository.js";
import {
  saveHotspotSnapshot,
  getLatestHotspotSnapshot,
  getHotspotSnapshotById,
  listTimelineSnapshots,
  getTimelineSummary,
} from "../repositories/hotspotRepository.js";
import osmtogeojson from "osmtogeojson";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const getOverpassData = async (req, res) => {
  const { bbox, layer } = req.query;

  if (!bbox || !layer) {
    return res.status(400).json({ error: "Missing bbox or layer parameter" });
  }

  const cacheId = `geojson_overpass_${layer}_${bbox}`;

  try {
    const cachedData = await getSpatialCache(cacheId);
    if (cachedData) {
      return res.json(cachedData);
    }

    let queryBody = "";
    if (layer === "Villages") {
      queryBody = `relation["boundary"="administrative"]["admin_level"~"7|8"](${bbox});`;
    } else if (layer === "Forest") {
      queryBody = `way["landuse"="forest"](${bbox});relation["landuse"="forest"](${bbox});way["natural"="wood"](${bbox});relation["natural"="wood"](${bbox});way["leisure"="nature_reserve"](${bbox});relation["leisure"="nature_reserve"](${bbox});way["boundary"="national_park"](${bbox});relation["boundary"="national_park"](${bbox});way["boundary"="protected_area"](${bbox});relation["boundary"="protected_area"](${bbox});`;
    } else if (layer === "Cities") {
      queryBody = `relation["boundary"="administrative"]["admin_level"~"4|5"](${bbox});`;
    } else if (layer === "Rivers" || layer === "Hydrology") {
      queryBody = `way["waterway"~"river|stream|canal"](${bbox});relation["waterway"~"river|stream|canal"](${bbox});`;
    } else {
      return res.status(400).json({ error: "Unknown layer" });
    }

    const query = `[out:json][timeout:25];(${queryBody});out body;>;out skel qt;`;

    let data = null;
    let lastError = null;

    for (let i = 0; i < OVERPASS_ENDPOINTS.length; i++) {
      try {
        const response = await fetch(OVERPASS_ENDPOINTS[i], {
          method: "POST",
          body: "data=" + encodeURIComponent(query),
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json, */*",
            "User-Agent": "Harmony-Spatial-Engine/1.0",
          },
        });

        if (response.status === 429) {
          console.warn(`Overpass 429 at ${OVERPASS_ENDPOINTS[i]}, retrying...`);
          await delay(1000);
          continue;
        }

        if (!response.ok) {
          throw new Error(`HTTP Error ${response.status}`);
        }

        data = await response.json();
        data = osmtogeojson(data);
        break;
      } catch (err) {
        lastError = err;
        console.warn(`Overpass fetch failed at ${OVERPASS_ENDPOINTS[i]}: ${err.message}`);
      }
    }

    if (!data) {
      throw new Error(lastError ? lastError.message : "All Overpass endpoints failed (Rate limited)");
    }

    await setSpatialCache(cacheId, data);
    return res.json(data);
  } catch (error) {
    console.error("Spatial Controller Overpass Error:", error.message);
    return res.status(500).json({ error: "Overpass API Error: " + error.message });
  }
};

/**
 * Unified Spatial Coordinate Identify Service
 * GET /api/spatial/identify?lat=...&lng=...&radius=...
 */
export const identifyPoint = async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radius = parseFloat(req.query.radius || "5000"); // in meters

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({ error: "Invalid coordinate parameters. Latitude [-90..90], Longitude [-180..180]." });
  }

  try {
    const db = await readDB();

    const postgisResults = await identifyNearPoint(lat, lng, radius);

    const schools = db.schools || [];
    const nearestSchools = schools
      .map((s) => {
        const sLat = s.lat ?? s.latitude;
        const sLng = s.lng ?? s.longitude;
        if (sLat === undefined || sLng === undefined) return null;
        const distKm = haversineDistanceKm(lat, lng, sLat, sLng);
        return {
          id: s.id,
          name: s.name,
          npsn: s.npsn,
          city: s.city,
          province: s.province,
          lat: sLat,
          lng: sLng,
          distanceKm: Math.round(distKm * 100) / 100,
        };
      })
      .filter((s) => s !== null && s.distanceKm <= radius / 1000)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 10);

    return res.json({
      success: true,
      query: { lat, lng, radiusMeters: radius },
      timestamp: new Date().toISOString(),
      nearestSchools,
      hazards: postgisResults.hazards,
      sensors: postgisResults.sensors,
      features: postgisResults.features,
      provenance: {
        sourceType: "DERIVED_COMPUTATION",
        provider: "Harmony PostGIS Spatial Query Engine",
        dataStatus: "LIVE",
        crs: "EPSG:4326",
        attribution: "Kueri Geospasial Terpadu PostGIS 3.6 & Satu Peta",
      },
    });
  } catch (err) {
    console.error("identifyPoint error:", err.message);
    return res.status(500).json({ error: "Spatial Identify Error: " + err.message });
  }
};

export function validatePolygon(geometry) {
  if (!geometry || geometry.type !== "Polygon" || !Array.isArray(geometry.coordinates)) {
    return { valid: false, reason: "INVALID_TYPE" };
  }
  const outerRing = geometry.coordinates[0];
  if (!outerRing || outerRing.length < 4) {
    return { valid: false, reason: "INSUFFICIENT_VERTICES" };
  }
  const first = outerRing[0];
  const last = outerRing[outerRing.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return { valid: false, reason: "UNCLOSED_RING" };
  }
  return { valid: true, ringsCount: geometry.coordinates.length };
}

/**
 * Area of Interest (AOI) Unified Analysis Engine
 * POST /api/spatial/aoi/analyze
 */
export const analyzeAOI = async (req, res) => {
  const { aoi, datasetId } = req.body;

  const polyValidation = validatePolygon(aoi?.geometry || aoi);
  if (!polyValidation.valid) {
    return res.status(400).json({ error: `Geometri AOI tidak valid: ${polyValidation.reason}. Diperlukan poligon GeoJSON dengan cincin tertutup.` });
  }

  const geometry = aoi.geometry || aoi;

  try {
    const features = await querySpatialFeaturesInAOI(geometry, datasetId);

    const db = await readDB();
    const schools = db.schools || [];

    const isPointInPolygon = (pt, polyCoords) => {
      const ring = polyCoords[0] || [];
      let inside = false;
      const x = pt[0];
      const y = pt[1];
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0];
        const yi = ring[i][1];
        const xj = ring[j][0];
        const yj = ring[j][1];
        const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
      }
      return inside;
    };

    const schoolsInAOI = schools.filter((s) => {
      const sLat = s.lat ?? s.latitude;
      const sLng = s.lng ?? s.longitude;
      if (sLat === undefined || sLng === undefined) return false;
      return isPointInPolygon([sLng, sLat], geometry.coordinates);
    });

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      aoiMetrics: {
        totalFeaturesFound: features.length,
        schoolsCount: schoolsInAOI.length,
        schoolsSample: schoolsInAOI.slice(0, 10),
      },
      intersectedFeatures: features,
      provenance: {
        sourceType: "DERIVED_COMPUTATION",
        provider: "Harmony PostGIS AOI Engine",
        dataStatus: "LIVE",
        crs: "EPSG:4326",
        attribution: "Analisis Spasial Poligon PostGIS",
      },
    });
  } catch (err) {
    console.error("analyzeAOI error:", err.message);
    return res.status(500).json({ error: "AOI Analysis Error: " + err.message });
  }
};

/**
 * Backend STAC Proxy
 * POST /api/spatial/stac/search
 */
export const searchSTACProxy = async (req, res) => {
  const query = req.body;
  const endpoint = "https://earth-search.aws.element84.com/v1/search";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/geo+json, application/json",
      },
      body: JSON.stringify(query),
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `STAC provider returned HTTP ${response.status}` });
    }

    const data = await response.json();
    data.provenance = {
      sourceType: "SATELLITE_CATALOG",
      provider: "AWS Earth Search (Element84) / Copernicus Open Access",
      dataset: query.collections ? query.collections.join(", ") : "Sentinel-2 / Landsat",
      dataStatus: "SEARCH_RESULT",
      acquisitionTime: null,
      processingTime: new Date().toISOString(),
      attribution: "Copernicus Sentinel data processed by ESA / AWS Open Data",
    };
    return res.json(data);
  } catch (err) {
    return res.status(502).json({ error: "STAC upstream error: " + err.message });
  }
};

/**
 * Spatial Core Health & PostGIS Status
 * GET /api/spatial/health
 */
export const getSpatialHealth = async (_req, res) => {
  const hasPool = !!pool;
  let postgisStatus = "NOT_CONFIGURED";
  let postgisVersion = null;
  let latencyMs = 0;

  if (hasPool) {
    const start = Date.now();
    try {
      const qRes = await pool.query("SELECT PostGIS_Version();");
      latencyMs = Date.now() - start;
      postgisStatus = "ONLINE";
      postgisVersion = qRes.rows[0].postgis_version;
    } catch (err) {
      postgisStatus = "DEGRADED";
      postgisVersion = err.message;
    }
  }

  return res.json({
    status: postgisStatus === "ONLINE" ? "OK" : "WARNING",
    timestamp: new Date().toISOString(),
    postgis: {
      status: postgisStatus,
      version: postgisVersion,
      latencyMs,
    },
    capabilities: [
      "Overpass OSM Ingestion",
      "PostGIS ST_Intersects & ST_DWithin",
      "STAC Satellite Search Proxy",
      "Unified Spatial Identify",
      "AOI Analysis",
      "Cached Live Weather Proxy",
    ],
  });
};

const weatherCache = new Map();
const WEATHER_CACHE_TTL_MS = 120 * 1000; // 2 minutes server-side TTL with dedup and 429 cooldown
const weatherInFlight = new Map();
let weatherRateLimitUntil = 0;

const geocodeReverseCache = new Map();
const geocodeSearchCache = new Map();
const GEOCODE_REVERSE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours for administrative lookup
const GEOCODE_SEARCH_TTL_MS = 30 * 60 * 1000; // 30 minutes for search autocomplete
const geocodeReverseInFlight = new Map();
const geocodeSearchInFlight = new Map();
let nominatimLastRequestAt = 0;
let nominatimRateLimitUntil = 0;

/**
 * Cached Weather Proxy for Harmony Maps
 * GET /api/spatial/weather/current?lat=...&lng=...
 */
export const getCurrentWeatherProxy = async (req, res) => {
  const isStrictNum = (val) => typeof val === "string" && /^[-+]?\d+(\.\d+)?$/.test(val.trim());
  const latRaw = req.query.lat;
  const lngRaw = req.query.lng;

  if (!isStrictNum(latRaw) || !isStrictNum(lngRaw)) {
    return res.status(400).json({ error: "Invalid latitude (-90..90) or longitude (-180..180)" });
  }

  const lat = parseFloat(latRaw.trim());
  const lng = parseFloat(lngRaw.trim());

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({ error: "Invalid latitude (-90..90) or longitude (-180..180)" });
  }

  const queryLat = lat.toFixed(2);
  const queryLng = lng.toFixed(2);
  const cacheKey = `provider=open-meteo:model=best-match:vars=standard:lat=${queryLat}:lng=${queryLng}`;
  const now = Date.now();

  const cached = weatherCache.get(cacheKey);
  if (cached && now - cached.timestamp < WEATHER_CACHE_TTL_MS) {
    return res.json({
      success: true,
      source: "server_cache",
      data: cached.data,
    });
  }

  if (now < weatherRateLimitUntil) {
    if (cached) {
      return res.json({
        success: true,
        source: "stale_cooldown_cache",
        providerHealth: "COOLING_DOWN",
        data: cached.data,
      });
    }
    return res.status(503).json({
      success: false,
      error: "Layanan cuaca sedang jeda sementara setelah pembatasan rate upstream.",
    });
  }

  try {
    let weatherPromise = weatherInFlight.get(cacheKey);
    if (!weatherPromise) {
      weatherPromise = (async () => {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${queryLat}&longitude=${queryLng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m&timeformat=unixtime&timezone=auto`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        let json;

        try {
          const upstream = await fetch(url, { signal: controller.signal });
          if (upstream.status === 429) {
            weatherRateLimitUntil = Date.now() + 60 * 1000;
            throw new Error("Upstream weather service returned HTTP 429");
          }
          if (!upstream.ok) {
            throw new Error(`Upstream weather service returned HTTP ${upstream.status}`);
          }
          json = await upstream.json();
        } finally {
          clearTimeout(timeout);
        }

        const current = json.current;
        if (!validateProviderCurrent(current)) {
          throw new Error("Current weather payload is incomplete or invalid");
        }

        if (![json.latitude, json.longitude].every(Number.isFinite) || Math.abs(json.latitude) > 90 || Math.abs(json.longitude) > 180 || Math.abs(json.latitude - queryLat) > 1 || Math.abs(json.longitude - queryLng) > 1) throw new Error('Weather response coordinates do not match requested location');
        const expectedUnits = { temperature_2m: ['°c', 'celsius'], apparent_temperature: ['°c', 'celsius'], relative_humidity_2m: ['%'], surface_pressure: ['hpa'], wind_speed_10m: ['km/h'], wind_direction_10m: ['°', 'degrees'], precipitation: ['mm'], time: ['unixtime'] };
        if (Object.entries(expectedUnits).some(([field, allowed]) => json.current_units?.[field] !== undefined && !allowed.includes(String(json.current_units[field]).trim().toLowerCase()))) throw new Error('Weather response units do not match query contract');
        try { new Intl.DateTimeFormat('en', { timeZone: json.timezone || 'UTC' }); } catch { throw new Error('Invalid provider timezone'); }
        let dataTimeUtc = null;
        if (typeof current.time === "number" && !isNaN(current.time)) {
          dataTimeUtc = new Date(current.time * 1000).toISOString();
        } else if (typeof current.time === "string" && current.time.trim().length > 0) {
          const parsed = new Date(current.time);
          if (!isNaN(parsed.getTime())) {
            dataTimeUtc = parsed.toISOString();
          }
        }

        const fetchedAt = new Date().toISOString();
        const dataIntervalSeconds = typeof current.interval === "number" ? current.interval : 900;
        const providerTimezone = json.timezone || "Asia/Jakarta";

        const weatherData = {
          temperature: current.temperature_2m,
          apparentTemp: current.apparent_temperature,
          humidity: current.relative_humidity_2m,
          pressure: current.surface_pressure,
          windSpeedKmh: current.wind_speed_10m,
          windDirectionDeg: current.wind_direction_10m,
          precipitationMm: current.precipitation,
          weatherCode: current.weather_code,
          provider: "Open-Meteo", providerModel: "Open-Meteo Best Match (model selection by provider)",
          dataTime: dataTimeUtc, observationTime: dataTimeUtc, fetchedAt, lastCheckedAt: fetchedAt,
          dataIntervalSeconds, dataStepMinutes: Math.round(dataIntervalSeconds / 60), providerTimezone,
        };

        weatherCache.set(cacheKey, { data: weatherData, timestamp: Date.now() });
        return weatherData;
      })().finally(() => {
        weatherInFlight.delete(cacheKey);
      });
      weatherInFlight.set(cacheKey, weatherPromise);
    }

    const weatherData = await weatherPromise;
    return res.json({
      success: true,
      source: "live_upstream",
      data: weatherData,
    });
  } catch (err) {
    if (cached) {
      return res.json({
        success: false,
        source: "stale_server_cache",
        providerHealth: "DEGRADED",
        error: "Pengambilan terbaru gagal: " + err.message,
        data: cached.data,
      });
    }
    return res.status(502).json({ success: false, error: "Upstream weather error: " + err.message });
  }
};

function toTitleCaseId(str = "") {
  return String(str)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function normalizeNominatimReversePayload(data, lat, lng) {
  const addr = data?.address || {};
  const rawVillage =
    addr.village ||
    addr.suburb ||
    addr.neighbourhood ||
    addr.hamlet ||
    addr.quarter ||
    addr.residential;
  const village = rawVillage
    ? toTitleCaseId(rawVillage.replace(/^(desa|kelurahan)\s+/i, ""))
    : "Wilayah Lokal";

  const rawSubDistrict =
    addr.municipality ||
    addr.city_district ||
    addr.subdistrict ||
    addr.town ||
    addr.district;
  const subDistrict = rawSubDistrict
    ? toTitleCaseId(rawSubDistrict.replace(/^kecamatan\s+/i, ""))
    : "Kecamatan";

  const rawCity =
    addr.city ||
    addr.county ||
    addr.regency ||
    addr.state_district;
  let city = rawCity ? toTitleCaseId(rawCity) : "Indonesia";
  if (rawCity && !city.startsWith("Kabupaten") && !city.startsWith("Kota")) {
    city = `Kabupaten ${city}`;
  }

  const province = addr.state ? toTitleCaseId(addr.state) : "Jawa Timur";
  const road = addr.road || addr.industrial || addr.commercial || addr.highway || undefined;
  const postcode = addr.postcode || undefined;
  const parts = [road, village !== "Wilayah Lokal" ? `Desa ${village}` : null, subDistrict !== "Kecamatan" ? `Kec. ${subDistrict}` : null, city, province].filter(Boolean);

  return {
    village,
    subDistrict,
    city,
    province,
    road,
    postcode,
    formattedAddress: data?.display_name || parts.join(", "),
    shortDisplay: `${village}, Kec. ${subDistrict}, ${city}`,
    lat,
    lng,
    source: "nominatim_proxy",
    isError: false,
  };
}

function normalizeBigDataCloudReversePayload(data, lat, lng) {
  const admin = Array.isArray(data?.localityInfo?.administrative)
    ? data.localityInfo.administrative
    : [];
  const byLevel = (lvl) => admin.find((a) => a.adminLevel === lvl)?.name;
  const village = toTitleCaseId(data?.locality || byLevel(10) || byLevel(8) || "Wilayah Lokal");
  const subDistrict = toTitleCaseId(byLevel(7) || byLevel(6) || "Kecamatan");
  const rawCity = data?.city || byLevel(5) || "Indonesia";
  let city = toTitleCaseId(rawCity);
  if (rawCity !== "Indonesia" && !city.startsWith("Kabupaten") && !city.startsWith("Kota")) {
    city = `Kabupaten ${city}`;
  }
  const province = toTitleCaseId(data?.principalSubdivision || byLevel(4) || "Jawa Timur");
  const parts = [`Desa ${village}`, `Kec. ${subDistrict}`, city, province].filter(Boolean);
  return {
    village,
    subDistrict,
    city,
    province,
    road: undefined,
    postcode: data?.postcode || undefined,
    formattedAddress: parts.join(", "),
    shortDisplay: `${village}, Kec. ${subDistrict}, ${city}`,
    lat,
    lng,
    source: "bigdatacloud_proxy",
    isError: false,
  };
}

export const reverseGeocodeProxy = async (req, res) => {
  const isStrictNum = (val) => typeof val === "string" && /^[-+]?\d+(\.\d+)?$/.test(val.trim());
  if (!isStrictNum(req.query.lat) || !isStrictNum(req.query.lng)) {
    return res.status(400).json({ success: false, error: "Invalid lat or lng parameter" });
  }
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({ success: false, error: "Coordinates out of range" });
  }

  const cacheKey = `rev:${lat.toFixed(3)}:${lng.toFixed(3)}`;
  const now = Date.now();
  const cached = geocodeReverseCache.get(cacheKey);
  if (cached && now - cached.timestamp < GEOCODE_REVERSE_TTL_MS) {
    return res.json({ success: true, source: "server_cache", data: cached.data });
  }

  try {
    let pending = geocodeReverseInFlight.get(cacheKey);
    if (!pending) {
      pending = (async () => {
        let resolved = null;

        if (Date.now() >= nominatimRateLimitUntil) {
          const elapsedSinceNom = Date.now() - nominatimLastRequestAt;
          if (elapsedSinceNom < 1100) {
            await delay(1100 - elapsedSinceNom);
          }
          nominatimLastRequestAt = Date.now();
          const nomCtrl = new AbortController();
          const nomTimer = setTimeout(() => nomCtrl.abort(), 5000);
          try {
            const nomRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
              {
                headers: {
                  "User-Agent": "HarmonySpace/1.0 (https://harmony-web.vercel.app)",
                  "Accept-Language": "id,en;q=0.8",
                },
                signal: nomCtrl.signal,
              }
            );
            if (nomRes.status === 429) {
              nominatimRateLimitUntil = Date.now() + 60 * 1000;
            } else if (nomRes.ok) {
              const nomJson = await nomRes.json();
              if (nomJson && nomJson.address) {
                resolved = normalizeNominatimReversePayload(nomJson, lat, lng);
              }
            }
          } catch {
            // Fall through to secondary geocoding provider.
          } finally {
            clearTimeout(nomTimer);
          }
        }

        if (!resolved) {
          const bdcCtrl = new AbortController();
          const bdcTimer = setTimeout(() => bdcCtrl.abort(), 4500);
          try {
            const bdcRes = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=id`,
              { signal: bdcCtrl.signal }
            );
            if (bdcRes.ok) {
              const bdcJson = await bdcRes.json();
              if (bdcJson && (bdcJson.locality || bdcJson.city || bdcJson.principalSubdivision)) {
                resolved = normalizeBigDataCloudReversePayload(bdcJson, lat, lng);
              }
            }
          } finally {
            clearTimeout(bdcTimer);
          }
        }

        if (!resolved) {
          throw new Error("All upstream reverse geocoding providers failed");
        }

        geocodeReverseCache.set(cacheKey, { data: resolved, timestamp: Date.now() });
        return resolved;
      })().finally(() => {
        geocodeReverseInFlight.delete(cacheKey);
      });
      geocodeReverseInFlight.set(cacheKey, pending);
    }

    const data = await pending;
    return res.json({ success: true, source: data.source, data });
  } catch (err) {
    if (cached) {
      return res.json({
        success: true,
        source: "stale_server_cache",
        data: cached.data,
      });
    }
    return res.status(502).json({ success: false, error: "Upstream reverse geocode error: " + err.message });
  }
};

export const searchGeocodeProxy = async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (q.length < 2) {
    return res.json({ success: true, source: "empty", results: [] });
  }

  const cacheKey = `search:${q.toLowerCase()}`;
  const now = Date.now();
  const cached = geocodeSearchCache.get(cacheKey);
  if (cached && now - cached.timestamp < GEOCODE_SEARCH_TTL_MS) {
    return res.json({ success: true, source: "server_cache", results: cached.results });
  }

  try {
    let pending = geocodeSearchInFlight.get(cacheKey);
    if (!pending) {
      pending = (async () => {
        const collected = [];
        let anyUpstreamSucceeded = false;

        // Photon (OSM search with generous rate tolerance) prioritized first.
        const photonCtrl = new AbortController();
        const photonTimer = setTimeout(() => photonCtrl.abort(), 4500);
        try {
          const photonRes = await fetch(
            `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8`,
            { signal: photonCtrl.signal }
          );
          if (photonRes.ok) {
            anyUpstreamSucceeded = true;
            const photonJson = await photonRes.json();
            const features = Array.isArray(photonJson?.features) ? photonJson.features : [];
            features.forEach((f, idx) => {
              const coords = f?.geometry?.coordinates;
              const props = f?.properties || {};
              if (Array.isArray(coords) && coords.length >= 2) {
                const lng = Number(coords[0]);
                const lat = Number(coords[1]);
                if (Number.isFinite(lat) && Number.isFinite(lng)) {
                  const label = props.name || props.city || props.county || props.state || q;
                  const shortParts = [props.name, props.district || props.city || props.county, props.state, props.country]
                    .filter(Boolean)
                    .slice(0, 3)
                    .join(", ");
                  const osmVal = String(props.osm_value || "").toLowerCase();
                  const type =
                    osmVal === "city" || osmVal === "town"
                      ? "city"
                      : osmVal === "district" || osmVal === "suburb"
                      ? "district"
                      : "place";
                  collected.push({
                    id: `photon-${props.osm_id || idx}-${lat.toFixed(4)}`,
                    label,
                    shortDisplay: shortParts || label,
                    lat,
                    lng,
                    type,
                  });
                }
              }
            });
          }
        } catch {
          // Fall back to Nominatim below when Photon fails or times out.
        } finally {
          clearTimeout(photonTimer);
        }

        if (collected.length === 0 && Date.now() >= nominatimRateLimitUntil) {
          const elapsedSinceNom = Date.now() - nominatimLastRequestAt;
          if (elapsedSinceNom < 1100) {
            await delay(1100 - elapsedSinceNom);
          }
          nominatimLastRequestAt = Date.now();
          const nomCtrl = new AbortController();
          const nomTimer = setTimeout(() => nomCtrl.abort(), 4500);
          try {
            const nomRes = await fetch(
              `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&countrycodes=id&limit=8&addressdetails=1`,
              {
                headers: {
                  "User-Agent": "HarmonySpace/1.0 (https://harmony-web.vercel.app)",
                  "Accept-Language": "id,en;q=0.8",
                },
                signal: nomCtrl.signal,
              }
            );
            if (nomRes.status === 429) {
              nominatimRateLimitUntil = Date.now() + 60 * 1000;
            } else if (nomRes.ok) {
              anyUpstreamSucceeded = true;
              const nomData = await nomRes.json();
              if (Array.isArray(nomData)) {
                nomData.forEach((item) => {
                  const lat = parseFloat(item.lat);
                  const lng = parseFloat(item.lon);
                  if (Number.isFinite(lat) && Number.isFinite(lng)) {
                    const label = item.name || String(item.display_name || "").split(",")[0] || q;
                    const shortDisplay = String(item.display_name || label).split(",").slice(0, 3).join(",");
                    const type =
                      item.type === "city" || item.type === "town"
                        ? "city"
                        : item.type === "district" || item.type === "suburb"
                        ? "district"
                        : "place";
                    collected.push({
                      id: `osm-${item.place_id}`,
                      label,
                      shortDisplay,
                      lat,
                      lng,
                      type,
                    });
                  }
                });
              }
            }
          } finally {
            clearTimeout(nomTimer);
          }
        }

        if (!anyUpstreamSucceeded && collected.length === 0) {
          throw new Error("All upstream search geocoding providers failed");
        }

        geocodeSearchCache.set(cacheKey, { results: collected, timestamp: Date.now() });
        return collected;
      })().finally(() => {
        geocodeSearchInFlight.delete(cacheKey);
      });
      geocodeSearchInFlight.set(cacheKey, pending);
    }

    const results = await pending;
    return res.json({ success: true, source: "live_upstream", results });
  } catch (err) {
    if (cached) {
      return res.json({ success: true, source: "stale_server_cache", results: cached.results });
    }
    return res.status(502).json({ success: false, error: "Upstream search error: " + err.message, results: [] });
  }
};

/**
 * Create Geospatial Analysis Job
 * POST /api/spatial/analysis/jobs
 */
export const createAnalysisJob = async (req, res) => {
  const { type, parameters } = req.body || {};
  const ownerId = req.user?.id || req.headers?.["x-user-id"] || "public";

  if (!type || typeof type !== "string" || !parameters || typeof parameters !== "object") {
    return res.status(400).json({ error: "Parameter type dan parameters berupa objek valid diperlukan" });
  }

  const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const fetchedAt = new Date().toISOString();

  let resultData = null;
  let status = "succeeded";
  let reason = undefined;

  if (type === "spectral") {
    const { bands } = parameters;
    if (!bands || typeof bands !== "object") {
      return res.status(400).json({ error: "Parameter bands diperlukan untuk analisis spektral" });
    }
    const { nir, red, swir } = bands;
    if (typeof nir !== "number" || isNaN(nir) || typeof red !== "number" || isNaN(red)) {
      return res.status(400).json({ error: "Parameter bands.nir dan bands.red harus berupa angka numerik valid" });
    }
    const denomNDVI = nir + red;
    if (Math.abs(denomNDVI) < 1e-7) {
      resultData = { ndvi: null, ndbi: null };
      reason = { code: "ZERO_DENOMINATOR", message: "Denominator (NIR + Red) bernilai nol", retryable: false };
    } else {
      const ndvi = (nir - red) / denomNDVI;
      let ndbi = null;
      if (typeof swir === "number" && !isNaN(swir)) {
        const denomNDBI = swir + nir;
        if (Math.abs(denomNDBI) >= 1e-7) {
          ndbi = (swir - nir) / denomNDBI;
        }
      }
      resultData = {
        ndvi: parseFloat(ndvi.toFixed(4)),
        ndbi: ndbi !== null ? parseFloat(ndbi.toFixed(4)) : null,
      };
    }
  } else if (type === "lst") {
    const { dnThermal } = parameters;
    if (dnThermal === undefined || dnThermal === null) {
      return res.status(400).json({ error: "Parameter dnThermal diperlukan untuk analisis suhu permukaan daratan (LST)" });
    }
    if (typeof dnThermal !== "number" || isNaN(dnThermal) || dnThermal <= 0) {
      return res.status(400).json({
        error: "Parameter dnThermal harus berupa angka positif (>0). Nilai 0 merupakan fill/nodata dan tidak dapat dikonversi menjadi suhu.",
      });
    }
    // Official USGS Landsat Collection 2 Level-2 Surface Temperature
    const kelvin = dnThermal * 0.00341802 + 149.0;
    const celsius = kelvin - 273.15;
    resultData = {
      dnThermal,
      kelvin: parseFloat(kelvin.toFixed(2)),
      celsius: parseFloat(celsius.toFixed(2)),
      unit: "°C",
      formula: "Landsat Collection 2 Level-2 Surface Temperature (USGS standard: DN * 0.00341802 + 149.0 - 273.15)",
    };
  } else if (type === "landcover") {
    const { aoi, classes } = parameters;
    if (!aoi || (!aoi.coordinates && (!aoi.geometry || !aoi.geometry.coordinates))) {
      return res.status(400).json({ error: "Parameter aoi poligon GeoJSON diperlukan untuk analisis tutupan lahan" });
    }
    if (Array.isArray(classes) && classes.length > 0) {
      const totalPixels = classes.reduce((sum, c) => sum + (c.pixelCount || 0), 0);
      resultData = {
        product: "ESA WorldCover 2021 v200",
        totalValidPixels: totalPixels,
        classes: classes.map((c) => ({
          code: c.code,
          label: c.label || "Kelas Lahan",
          pixelCount: c.pixelCount,
          fraction: totalPixels > 0 ? parseFloat((c.pixelCount / totalPixels).toFixed(4)) : 0,
        })),
      };
    } else {
      const geometry = aoi.geometry || aoi;
      const featuresInAOI = await querySpatialFeaturesInAOI(geometry, "landcover_worldcover");
      if (featuresInAOI.length === 0) {
        status = "failed";
        reason = {
          code: "NO_RASTER_DATA",
          message: "Tile raster tutupan lahan ESA WorldCover belum diunduh / tersedia untuk AOI ini",
          retryable: false,
        };
      } else {
        resultData = {
          product: "ESA WorldCover 2021 v200",
          featuresCount: featuresInAOI.length,
          classes: featuresInAOI.slice(0, 10),
        };
      }
    }
  } else if (type === "accessibility") {
    const { originPoint, facilities, profile = "foot-walking" } = parameters;
    if (!originPoint || !Array.isArray(originPoint) || originPoint.length < 2) {
      return res.status(400).json({ error: "Parameter originPoint [lng, lat] diperlukan untuk analisis aksesibilitas" });
    }
    if (!Array.isArray(facilities) || facilities.length === 0) {
      return res.status(400).json({ error: "Parameter facilities berupa daftar fasilitas diperlukan untuk analisis aksesibilitas" });
    }
    const [origLng, origLat] = originPoint;
    const speedKmh = profile === "foot-walking" ? 4.5 : profile === "cycling-regular" ? 14.0 : 28.0;
    const matrix = facilities.map((fac) => {
      const fLat = fac.lat ?? fac.latitude;
      const fLng = fac.lng ?? fac.longitude;
      const distKm = haversineDistanceKm(origLat, origLng, fLat, fLng);
      const networkDistKm = distKm * 1.35;
      const travelTimeMinutes = parseFloat(((networkDistKm / speedKmh) * 60).toFixed(1));
      const reachableWithin15Min = travelTimeMinutes <= 15;
      return {
        facilityId: fac.id,
        facilityName: fac.name,
        category: fac.category,
        distanceMeters: Math.round(networkDistKm * 1000),
        travelTimeMinutes,
        reachableWithin15Min,
      };
    });
    const reachableCount = matrix.filter((m) => m.reachableWithin15Min).length;
    const coveragePct = parseFloat(((reachableCount / Math.max(1, matrix.length)) * 100).toFixed(1));
    resultData = {
      profile,
      evaluatedFacilitiesCount: matrix.length,
      reachableWithin15MinCount: reachableCount,
      facilityCoveragePct: coveragePct,
      is15MinCompliant: matrix.length > 0 && matrix.every((m) => m.reachableWithin15Min),
      note: "Metrik facilityCoveragePct mencerminkan persentase objek fasilitas yang terjangkau, bukan cakupan luas area geografis.",
      matrix: matrix.slice(0, 50),
    };
  } else if (type === "coverage") {
    const { sensorLocation, aoi, rangeKm = 240 } = parameters;
    if (!sensorLocation || !Array.isArray(sensorLocation) || sensorLocation.length < 2) {
      return res.status(400).json({ error: "Parameter sensorLocation [lng, lat] diperlukan untuk analisis cakupan radar" });
    }
    if (!aoi || (!aoi.coordinates && (!aoi.geometry || !aoi.geometry.coordinates))) {
      return res.status(400).json({ error: "Parameter aoi poligon GeoJSON diperlukan untuk analisis cakupan radar" });
    }
    const [sLng, sLat] = sensorLocation;
    const geometry = aoi.geometry || aoi;
    const ring = geometry.coordinates?.[0] || [];
    let insideCount = 0;
    ring.forEach((pt) => {
      const dist = haversineDistanceKm(sLat, sLng, pt[1], pt[0]);
      if (dist <= rangeKm) insideCount++;
    });
    const fraction = ring.length > 0 ? parseFloat((insideCount / ring.length).toFixed(2)) : 0;
    resultData = {
      sensorType: "BMKG_C_BAND_RADAR",
      sensorLocation: [sLng, sLat],
      nominalRadiusKm: rangeKm,
      verticesTested: ring.length,
      verticesCovered: insideCount,
      coverageFraction: fraction,
    };
  } else {
    return res.status(400).json({ error: `Unsupported job type: ${type}` });
  }

  const jobRecord = {
    id,
    type,
    status,
    ownerId,
    parameters,
    data: resultData,
    reason,
    createdAt: fetchedAt,
    provenance: {
      sourceType: "DERIVED_COMPUTATION",
      provider: "Harmony Geospatial Analysis Engine",
      dataStatus: status === "succeeded" ? "DERIVED" : "UNAVAILABLE",
      algorithmVersion: "2.4.0",
      fetchedAt,
    },
  };

  await saveSpatialJob(jobRecord);
  return res.status(201).json(jobRecord);
};

/**
 * Get Analysis Job Status & Result
 * GET /api/spatial/analysis/jobs/:id
 */
export const getAnalysisJob = async (req, res) => {
  const { id } = req.params;
  const callerId = req.user?.id || req.headers?.["x-user-id"] || "public";
  const job = await getSpatialJobById(id);
  if (!job) {
    return res.status(404).json({ error: "Job analysis tidak ditemukan" });
  }
  if (job.ownerId && job.ownerId !== "public" && job.ownerId !== callerId && req.user?.role !== "developer") {
    return res.status(403).json({ error: "Akses ke job ini dibatasi oleh pemilik" });
  }
  return res.json(job);
};

/**
 * Cancel Analysis Job
 * DELETE /api/spatial/analysis/jobs/:id
 */
export const deleteAnalysisJob = async (req, res) => {
  const { id } = req.params;
  const callerId = req.user?.id || req.headers?.["x-user-id"] || "public";
  const job = await getSpatialJobById(id);
  if (!job) {
    return res.status(404).json({ error: "Job analysis tidak ditemukan" });
  }
  if (job.ownerId && job.ownerId !== "public" && job.ownerId !== callerId && req.user?.role !== "developer") {
    return res.status(403).json({ error: "Akses membatalkan job ini dibatasi oleh pemilik" });
  }
  job.status = "cancelled";
  await saveSpatialJob(job);
  return res.json({ success: true, message: "Job cancelled", job });
};

/**
 * Export Analysis Results as GeoJSON, CSV, or JSON
 * GET /api/spatial/analysis/:id/export?format=geojson|csv|json
 */
export const exportAnalysis = async (req, res) => {
  const { id } = req.params;
  const format = (req.query.format || "json").toLowerCase();
  const callerId = req.user?.id || req.headers?.["x-user-id"] || "public";
  const job = await getSpatialJobById(id);
  if (!job) {
    return res.status(404).json({ error: "Job analysis tidak ditemukan" });
  }
  if (job.ownerId && job.ownerId !== "public" && job.ownerId !== callerId && req.user?.role !== "developer") {
    return res.status(403).json({ error: "Akses ekspor job ini dibatasi oleh pemilik" });
  }

  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="analysis_${id}.csv"`);
    const escapeCsv = (str) => `"${String(str ?? "").replace(/"/g, '""')}"`;
    const rows = [
      [escapeCsv("job_id"), escapeCsv("type"), escapeCsv("status"), escapeCsv("created_at")].join(","),
      [escapeCsv(job.id), escapeCsv(job.type), escapeCsv(job.status), escapeCsv(job.createdAt)].join(","),
      "",
      [escapeCsv("metric"), escapeCsv("value")].join(","),
    ];
    if (job.data && typeof job.data === "object") {
      Object.entries(job.data).forEach(([k, v]) => {
        rows.push([escapeCsv(k), escapeCsv(typeof v === "object" ? JSON.stringify(v) : v)].join(","));
      });
    }
    return res.send(rows.join("\n"));
  } else if (format === "geojson") {
    res.setHeader("Content-Type", "application/geo+json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="analysis_${id}.geojson"`);

    const extractedGeometry =
      job.parameters?.aoi?.geometry ||
      (job.parameters?.aoi?.coordinates ? job.parameters.aoi : null) ||
      (typeof job.parameters?.lng === "number" && typeof job.parameters?.lat === "number"
        ? { type: "Point", coordinates: [job.parameters.lng, job.parameters.lat] }
        : null);

    const geojson = {
      type: "FeatureCollection",
      jobId: job.id,
      provenance: job.provenance,
      features: extractedGeometry
        ? [
            {
              type: "Feature",
              geometry: extractedGeometry,
              properties: {
                jobType: job.type,
                status: job.status,
                results: job.data,
              },
            },
          ]
        : [],
    };
    return res.json(geojson);
  } else {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="analysis_${id}.json"`);
    return res.json(job);
  }
};

/**
 * NASA FIRMS Hotspot Proxy with SiPongi Reference
 * GET /api/spatial/hotspots?bbox=west,south,east,north&source=VIIRS_SNPP_NRT&dayRange=1
 */
export const getHotspots = async (req, res) => {
  const { bbox, source = "VIIRS_SNPP_NRT", dayRange = "1", firmsKey: queryFirmsKey } = req.query;
  const clientKey = typeof queryFirmsKey === 'string' ? queryFirmsKey.trim() : '';
  const firmsKey = clientKey || process.env.FIRMS_MAP_KEY?.trim() || process.env.MAP_KEY?.trim();
  const fetchedAt = new Date().toISOString();

  if (!firmsKey) {
    return res.status(200).json({
      success: false,
      data: [],
      reason: {
        code: "NOT_CONFIGURED",
        message: "Kunci FIRMS belum dikonfigurasi pada server (FIRMS_MAP_KEY atau MAP_KEY). Daftarkan kunci API resmi di https://firms.modaps.eosdis.nasa.gov/api/map_key/",
        retryable: false,
      },
      sipongiReference: {
        name: "SiPongi+ Karhutla KLHK",
        url: "https://sipongi.menlhk.go.id/",
        note: "Rujukan resmi Kementerian Lingkungan Hidup dan Kehutanan RI. Akses langsung memerlukan kredensial resmi.",
      },
      provenance: {
        sourceType: "SATELLITE_HOTSPOT",
        provider: "NASA FIRMS (Fire Information for Resource Management System)",
        dataStatus: "UNAVAILABLE",
        fetchedAt,
        attribution: "NASA LANCE / FIRMS MODIS & VIIRS Fire Detection",
      },
    });
  }

  if (/@/.test(firmsKey)) {
    return res.status(200).json({
      success: false,
      data: [],
      error: "Kunci API NASA FIRMS tidak valid: Nilai yang dimasukkan adalah alamat email, bukan MAP_KEY.",
      reason: {
        code: "INVALID_KEY_FORMAT",
        message: "Anda memasukkan alamat email. NASA FIRMS mengirimkan kunci rahasia 32-karakter heksadesimal ke email tersebut. Silakan salin kunci 32-karakter dari email konfirmasi NASA dan masukkan ke konfigurasi kunci API (https://firms.modaps.eosdis.nasa.gov/api/map_key/).",
        retryable: false,
      },
      sipongiReference: {
        name: "SiPongi+ Karhutla KLHK",
        url: "https://sipongi.menlhk.go.id/",
        note: "Rujukan resmi Kementerian Lingkungan Hidup dan Kehutanan RI. Akses langsung memerlukan kredensial resmi.",
      },
      provenance: {
        sourceType: "SATELLITE_HOTSPOT",
        provider: "NASA FIRMS (Fire Information for Resource Management System)",
        dataStatus: "UNAVAILABLE",
        fetchedAt,
        attribution: "NASA LANCE / FIRMS MODIS & VIIRS Fire Detection",
      },
    });
  }

  let normalizedQuery;
  try { normalizedQuery = normalizeFirmsQuery({ bbox, source, dayRange }); }
  catch (error) { return res.status(400).json({ success: false, data: [], reason: { code: error.message }, error: 'Parameter wilayah, sumber, atau rentang hari FIRMS tidak valid.' }); }
  try {
    const snapshot = await fetchFirmsSnapshot(normalizedQuery, firmsKey);
    const hasAuthError = snapshot.sourceAttempts?.some(a => a.httpStatus === 403 || a.error === 'HTTP_403' || a.httpStatus === 401);
    if (!snapshot.success && hasAuthError) {
      return res.status(200).json({
        ...snapshot,
        success: false,
        reason: {
          code: "INVALID_MAP_KEY",
          message: "Kunci NASA FIRMS ditolak oleh server NASA (HTTP 403 Forbidden). Pastikan MAP_KEY 32-karakter valid dan aktif.",
          retryable: false,
        },
      });
    }
    return res.status(snapshot.success ? 200 : 502).json(snapshot);
  } catch {
    return res.status(502).json({ success: false, data: [], error: 'Pengambilan FIRMS gagal. Tidak ada jumlah deteksi pengganti.' });
  }
};

// Cache for public NASA FIRMS open feeds and geological live feeds
const publicFirmsCache = new Map();
const PUBLIC_FIRMS_CACHE_TTL_MS = 5 * 60 * 1000;
let liveVolcanoCache = { timestamp: 0, payload: null };
const LIVE_VOLCANO_CACHE_TTL_MS = 15 * 60 * 1000;
let liveEarthquakesCache = { timestamp: 0, payload: null };
const LIVE_EARTHQUAKES_CACHE_TTL_MS = 60 * 1000;

function decodeXmlEntities(str) {
  return String(str || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseBmkgCoordsStrict(coordsStr) {
  if (typeof coordsStr !== 'string') return null;
  const parts = coordsStr.split(',').map((s) => s.trim());
  if (parts.length !== 2) return null;
  const strictNum = /^[-+]?\d+(?:\.\d+)?$/;
  if (!strictNum.test(parts[0]) || !strictNum.test(parts[1])) return null;
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

function parseBmkgMagnitudeStrict(val) {
  if (typeof val === 'number') return Number.isFinite(val) && val >= 0 && val <= 10 ? val : null;
  if (typeof val === 'string' && /^[-+]?\d+(?:\.\d+)?$/.test(val.trim())) {
    const num = parseFloat(val.trim());
    return Number.isFinite(num) && num >= 0 && num <= 10 ? num : null;
  }
  return null;
}

function parseBmkgDepthStrict(val) {
  if (typeof val === 'number') return Number.isFinite(val) && val >= 0 && val <= 1000 ? val : null;
  if (typeof val === 'string') {
    const cleaned = val.replace(/km/i, '').trim();
    if (/^\d+(?:\.\d+)?$/.test(cleaned)) {
      const num = parseFloat(cleaned);
      return Number.isFinite(num) && num >= 0 && num <= 1000 ? num : null;
    }
  }
  return null;
}

async function fetchLiveEarthquakesFromUpstreams() {
  const sourceAttempts = [];
  const merged = [];

  const bmkgHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Harmony-Earth-Intelligence/2.0',
    'Referer': 'https://www.bmkg.go.id/',
    'Accept': 'application/json, text/plain, */*',
  };

  const targets = [
    { id: 'bmkg_autogempa', url: 'https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json', kind: 'bmkg_single' },
    { id: 'bmkg_gempaterkini', url: 'https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json', kind: 'bmkg_list' },
    { id: 'bmkg_gempadirasakan', url: 'https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json', kind: 'bmkg_list' },
    { id: 'usgs_2.5_day', url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson', kind: 'usgs' },
  ];

  await Promise.all(
    targets.map(async (target) => {
      try {
        const res = await fetch(target.url, {
          headers: target.kind === 'usgs' ? { 'Accept': 'application/json' } : bmkgHeaders,
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) {
          sourceAttempts.push({ source: target.id, status: 'ERROR', httpStatus: res.status, count: 0, error: `HTTP_${res.status}` });
          return;
        }
        const json = await res.json();
        let added = 0;

        if (target.kind === 'bmkg_single' || target.kind === 'bmkg_list') {
          const rawGempa = json?.Infogempa?.gempa;
          const items = target.kind === 'bmkg_single' ? (rawGempa ? [rawGempa] : []) : (Array.isArray(rawGempa) ? rawGempa : []);
          for (const g of items) {
            const coords = parseBmkgCoordsStrict(g?.Coordinates);
            const mag = parseBmkgMagnitudeStrict(g?.Magnitude);
            const depthKm = parseBmkgDepthStrict(g?.Kedalaman);
            const parsedTime = g?.DateTime ? Date.parse(g.DateTime) : NaN;
            if (!coords || mag === null || !Number.isFinite(parsedTime)) continue;
            merged.push({
              id: `bmkg_${g.DateTime}_${coords.lat.toFixed(2)}_${coords.lng.toFixed(2)}`,
              lat: coords.lat,
              lng: coords.lng,
              magnitude: mag,
              depthKm,
              place: g.Wilayah || 'Indonesia (BMKG)',
              time: new Date(parsedTime).toISOString(),
              mmiScale: g.Dirasakan || null,
              tsunamiPotential: g.Potensi || null,
              shakemapUrl: g.Shakemap ? `https://data.bmkg.go.id/DataMKG/TEWS/${g.Shakemap}` : null,
              source: 'BMKG InaTEWS',
            });
            added++;
          }
          if (added === 0) {
            sourceAttempts.push({ source: target.id, status: 'ERROR', httpStatus: res.status, count: 0, error: 'INVALID_BMKG_PAYLOAD' });
            return;
          }
        } else if (target.kind === 'usgs') {
          const features = Array.isArray(json?.features) ? json.features : null;
          if (!features) {
            sourceAttempts.push({ source: target.id, status: 'ERROR', httpStatus: res.status, count: 0, error: 'INVALID_USGS_GEOJSON' });
            return;
          }
          for (const f of features) {
            const c = f?.geometry?.coordinates;
            const p = f?.properties;
            if (!Array.isArray(c) || c.length < 2) continue;
            const lng = Number(c[0]);
            const lat = Number(c[1]);
            const depthKm = typeof c[2] === 'number' && Number.isFinite(c[2]) && c[2] >= 0 ? c[2] : null;
            const mag = typeof p?.mag === 'number' && Number.isFinite(p.mag) && p.mag >= 0 && p.mag <= 10 ? p.mag : null;
            const tMs = typeof p?.time === 'number' && Number.isFinite(p.time) ? p.time : NaN;
            if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || mag === null || !Number.isFinite(tMs)) continue;
            merged.push({
              id: f.id || `usgs_${tMs}_${lat.toFixed(2)}`,
              lat,
              lng,
              magnitude: mag,
              depthKm,
              place: p?.place || p?.title || 'Global Seismic Event',
              time: new Date(tMs).toISOString(),
              mmiScale: typeof p?.mmi === 'number' ? `MMI ${p.mmi}` : null,
              tsunamiPotential: p?.tsunami === 1 ? 'Peringatan Tsunami USGS Aktif' : 'Tidak Ada Peringatan Tsunami USGS',
              shakemapUrl: p?.url || null,
              source: 'USGS',
            });
            added++;
          }
        }

        sourceAttempts.push({ source: target.id, status: 'OK', httpStatus: res.status, count: added, error: null });
      } catch (err) {
        sourceAttempts.push({
          source: target.id,
          status: 'ERROR',
          httpStatus: null,
          count: 0,
          error: err?.name === 'TimeoutError' || err?.name === 'AbortError' ? 'TIMEOUT' : (err?.message || 'FETCH_FAILED'),
        });
      }
    })
  );

  // Deduplicate keeping BMKG records ahead of close USGS matches
  merged.sort((a, b) => {
    if (a.source.includes('BMKG') !== b.source.includes('BMKG')) {
      return a.source.includes('BMKG') ? -1 : 1;
    }
    return Date.parse(b.time) - Date.parse(a.time);
  });

  const deduplicated = [];
  for (const eq of merged) {
    const eqTime = Date.parse(eq.time);
    const isDuplicate = deduplicated.some((kept) => {
      const dtMin = Math.abs(eqTime - Date.parse(kept.time)) / 60000;
      const dLat = Math.abs(eq.lat - kept.lat);
      const dLng = Math.abs(eq.lng - kept.lng);
      return dtMin <= 5 && dLat <= 0.8 && dLng <= 0.8 && Math.abs(eq.magnitude - kept.magnitude) <= 0.6;
    });
    if (!isDuplicate) {
      deduplicated.push(eq);
    }
  }
  deduplicated.sort((a, b) => Date.parse(b.time) - Date.parse(a.time));

  return { earthquakes: deduplicated, sourceAttempts };
}

/**
 * Public Open NASA FIRMS NRT Satellite Hotspots Feed (VIIRS 375m & MODIS 1km)
 * Direct access to NASA EOSDIS LANCE open data feeds without requiring private MAP_KEY.
 * GET /api/spatial/hotspots/public-feed?bbox=west,south,east,north&dayRange=1&source=ALL&scope=aoi
 */
export const getPublicHotspotsFeed = async (req, res) => {
  const {
    bbox,
    source = "ALL",
    dayRange = "1",
    scope = "aoi",
    minConfidence = "all",
  } = req.query;

  const fetchedAt = new Date().toISOString();
  const rangeSuffix = dayRange === "7" ? "7d" : dayRange === "2" ? "48h" : "24h";

  let bounds = null;
  if (bbox && typeof bbox === 'string') {
    const parts = bbox.split(',').map(Number);
    if (parts.length === 4 && parts.every(n => !isNaN(n))) {
      bounds = parts;
    }
  }

  // Official NASA LANCE FIRMS Open NRT active fire feeds for Southeast Asia
  const feedUrls = [];
  if (source === 'VIIRS' || source === 'ALL') {
    feedUrls.push({
      instrument: 'VIIRS',
      satellite: 'Suomi-NPP',
      url: `https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_SouthEast_Asia_${rangeSuffix}.csv`,
    });
    feedUrls.push({
      instrument: 'VIIRS',
      satellite: 'NOAA-20',
      url: `https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_SouthEast_Asia_${rangeSuffix}.csv`,
    });
    feedUrls.push({
      instrument: 'VIIRS',
      satellite: 'NOAA-21',
      url: `https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-21-viirs-c2/csv/J2_VIIRS_C2_SouthEast_Asia_${rangeSuffix}.csv`,
    });
  }
  if (source === 'MODIS' || source === 'MODIS_NRT' || source === 'ALL') {
    feedUrls.push({
      instrument: 'MODIS',
      satellite: 'Terra/Aqua',
      url: `https://firms.modaps.eosdis.nasa.gov/data/active_fire/modis-c6.1/csv/MODIS_C6_1_SouthEast_Asia_${rangeSuffix}.csv`,
    });
  }

  const forceRefresh = req.query.force === 'true' || req.query.fresh === 'true';

  try {
    const allRecords = [];
    const sourceAttempts = [];
    let receivedCount = 0;
    let fulfilledCount = 0;
    let allCached = true;
    let cacheOldestMs = Date.now();

    const feedResults = await Promise.allSettled(
      feedUrls.map(async (feed) => {
        const cacheKey = feed.url;
        const cached = !forceRefresh ? publicFirmsCache.get(cacheKey) : null;
        if (cached && cached.data && cached.data.trim().length > 100 && (Date.now() - cached.timestamp < PUBLIC_FIRMS_CACHE_TTL_MS)) {
          if (cached.timestamp < cacheOldestMs) cacheOldestMs = cached.timestamp;
          return { feed, text: cached.data, isCached: true, httpStatus: 200, lastModified: cached.lastModified || null };
        }
        allCached = false;
        const resp = await fetch(feed.url, {
          headers: {
            'User-Agent': 'HarmonyGeospatial/1.0 (NASA FIRMS Fire Anomaly Consumer)',
            'Accept': 'text/csv,text/plain,*/*',
          },
          signal: AbortSignal.timeout(25000),
        });
        if (!resp.ok) {
          const err = new Error(`HTTP ${resp.status} fetching ${feed.satellite} (${feed.instrument})`);
          err.httpStatus = resp.status;
          throw err;
        }
        const lastModified = resp.headers.get('last-modified') || null;
        const text = await resp.text();
        if (!text || text.trim().length < 20 || !/^latitude,longitude/im.test(text.trim().split('\n')[0] || '')) {
          throw new Error(`Invalid CSV format from ${feed.satellite}`);
        }
        publicFirmsCache.set(cacheKey, { timestamp: Date.now(), data: text, lastModified });
        return { feed, text, isCached: false, httpStatus: resp.status, lastModified };
      })
    );

    for (let idx = 0; idx < feedResults.length; idx++) {
      const result = feedResults[idx];
      const feedMeta = feedUrls[idx];
      if (result.status !== 'fulfilled' || !result.value?.text) {
        const errMsg = result.status === 'rejected' ? (result.reason?.message || String(result.reason)) : 'EMPTY_PAYLOAD';
        sourceAttempts.push({
          source: `${feedMeta.satellite} (${feedMeta.instrument})`,
          status: 'ERROR',
          httpStatus: result.status === 'rejected' ? (result.reason?.httpStatus ?? null) : null,
          lastModified: null,
          matchedCount: 0,
          error: errMsg,
        });
        continue;
      }

      const { feed, text, httpStatus, lastModified } = result.value;
      const lines = text.trim().split('\n');
      const header = lines[0].split(',').map(h => h.trim().toLowerCase());
      const latIdx = header.indexOf('latitude');
      const lngIdx = header.indexOf('longitude');
      if (latIdx === -1 || lngIdx === -1) {
        sourceAttempts.push({
          source: `${feed.satellite} (${feed.instrument})`,
          status: 'ERROR',
          httpStatus,
          lastModified,
          matchedCount: 0,
          error: 'MISSING_COORDINATE_COLUMNS',
        });
        continue;
      }

      fulfilledCount++;
      let feedMatched = 0;

      if (lines.length > 1) {
        const brightIdx = header.indexOf('bright_ti4') !== -1 ? header.indexOf('bright_ti4') : header.indexOf('brightness');
        const scanIdx = header.indexOf('scan');
        const trackIdx = header.indexOf('track');
        const confIdx = header.indexOf('confidence');
        const frpIdx = header.indexOf('frp');
        const dateIdx = header.indexOf('acq_date');
        const timeIdx = header.indexOf('acq_time');
        const satIdx = header.indexOf('satellite');
        const dnIdx = header.indexOf('daynight');

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          receivedCount++;
          const cols = line.split(',');
          const lat = parseFloat(cols[latIdx]);
          const lng = parseFloat(cols[lngIdx]);
          if (isNaN(lat) || isNaN(lng)) continue;

          if (scope === 'aoi' && bounds) {
            const [west, south, east, north] = bounds;
            if (lat < south || lat > north || lng < west || lng > east) {
              continue;
            }
          } else if (scope === 'java') {
            if (lat < -8.8 || lat > -5.5 || lng < 105.0 || lng > 114.6) {
              continue;
            }
          } else if (scope === 'indonesia' || !bounds) {
            if (lat < -11.5 || lat > 6.5 || lng < 95.0 || lng > 141.0) {
              continue;
            }
          }

          const rawConf = confIdx !== -1 ? cols[confIdx]?.trim() : 'nominal';
          let confLevel = 'nominal';
          let confidenceNumeric = null;
          if (/^\d+$/.test(rawConf)) {
            confidenceNumeric = parseInt(rawConf, 10);
            confLevel = confidenceNumeric >= 80 ? 'high' : confidenceNumeric >= 30 ? 'nominal' : 'low';
          } else {
            confLevel = rawConf.toLowerCase() === 'h' || rawConf.toLowerCase() === 'high' ? 'high' :
                        rawConf.toLowerCase() === 'l' || rawConf.toLowerCase() === 'low' ? 'low' : 'nominal';
          }

          if (minConfidence === 'high_only' && confLevel !== 'high') continue;
          if (minConfidence === 'nominal_high' && confLevel === 'low') continue;

          const frp = frpIdx !== -1 && cols[frpIdx] ? parseFloat(cols[frpIdx]) : null;
          const bright = brightIdx !== -1 && cols[brightIdx] ? parseFloat(cols[brightIdx]) : null;
          const rawScan = scanIdx !== -1 && cols[scanIdx] ? parseFloat(cols[scanIdx]) : NaN;
          const scanKm = !isNaN(rawScan) && isFinite(rawScan) && rawScan > 0 ? rawScan : (feed.instrument === 'VIIRS' ? 0.375 : 1.0);
          const rawTrack = trackIdx !== -1 && cols[trackIdx] ? parseFloat(cols[trackIdx]) : NaN;
          const trackKm = !isNaN(rawTrack) && isFinite(rawTrack) && rawTrack > 0 ? rawTrack : (feed.instrument === 'VIIRS' ? 0.375 : 1.0);
          const dateStr = dateIdx !== -1 ? cols[dateIdx]?.trim() : '';
          const timeStr = timeIdx !== -1 ? cols[timeIdx]?.trim() : '';
          let acqTimeUtc = timeStr;
          if (timeStr && timeStr.length <= 4) {
            const padded = timeStr.padStart(4, '0');
            acqTimeUtc = `${padded.slice(0, 2)}:${padded.slice(2, 4)} UTC`;
          }

          allRecords.push({
            id: `nasa-firms-${feed.instrument.toLowerCase()}-${lat.toFixed(4)}-${lng.toFixed(4)}-${dateStr}-${timeStr}-${i}`,
            latitude: lat,
            longitude: lng,
            satellite: cols[satIdx] || feed.satellite,
            instrument: feed.instrument,
            confidenceLevel: confLevel,
            confidenceRaw: rawConf,
            confidenceNumeric,
            brightnessKelvin: bright,
            scanKm,
            trackKm,
            frpMw: frp,
            acqDate: dateStr,
            acqTimeUtc,
            dayNight: dnIdx !== -1 ? cols[dnIdx]?.trim() : 'D',
            systemSource: 'NASA_FIRMS_OPEN_NRT',
          });
          feedMatched++;
        }
      }

      sourceAttempts.push({
        source: `${feed.satellite} (${feed.instrument})`,
        status: 'OK',
        httpStatus,
        lastModified,
        matchedCount: feedMatched,
        error: null,
      });
    }

    if (fulfilledCount === 0) {
      if (req.query.allowCacheFallback === 'true') {
        const fallback = await getLatestHotspotSnapshot({ scope, dayRange: parseInt(dayRange, 10) }).catch(() => null);
        if (fallback && fallback.isBaseline === false) {
          return res.status(200).json({
            success: true,
            count: fallback.recordCount,
            totalMatched: fallback.recordCount,
            receivedCount: fallback.recordCount,
            data: fallback.data || [],
            rawCsv: fallback.rawCsv,
            csvFormat: 'HARMONY_NORMALIZED_FIRMS_V1',
            source: fallback.source,
            dayRange: fallback.dayRange,
            scope: fallback.scope,
            windowEnd: fallback.fetchedAt,
            isFallback: true,
            snapshotId: fallback.id,
            snapshotDate: fallback.snapshotDate,
            snapshotFetchedAt: fallback.fetchedAt,
            sourceAttempts,
            provenance: {
              sourceType: 'SATELLITE_HOTSPOT',
              provider: 'NASA EOSDIS LANCE FIRMS (Arsip Snapshot Tersimpan / Offline Fallback)',
              dataStatus: 'CACHED',
              fetchedAt: fallback.fetchedAt,
              attribution: 'NASA LANCE / FIRMS MODIS & VIIRS — Arsip Snapshot Tersimpan',
              cached: true,
              isFallback: true,
            },
            reason: {
              code: 'FALLBACK_TO_HISTORICAL_SNAPSHOT',
              message: `Koneksi satelit NASA LANCE tidak dapat dihubungi. Menampilkan data arsip tersimpan (${fallback.snapshotDate}, diambil ${new Date(fallback.fetchedAt).toLocaleString('id-ID')}).`,
            },
          });
        }
      }

      return res.status(502).json({
        success: false,
        dataStatus: 'ERROR',
        count: 0,
        totalMatched: 0,
        receivedCount: 0,
        data: [],
        rawCsv: '',
        source,
        dayRange: parseInt(dayRange, 10),
        scope,
        sourceAttempts,
        error: 'Seluruh feed satelit NASA FIRMS LANCE gagal merespons atau mengembalikan data tidak valid.',
        reason: {
          code: 'ALL_UPSTREAMS_FAILED',
          message: 'Seluruh stream satelit NASA FIRMS LANCE gagal dihubungi.',
        },
        provenance: {
          sourceType: 'SATELLITE_HOTSPOT',
          provider: 'NASA EOSDIS LANCE FIRMS (Open NRT Satellite Feed)',
          dataStatus: 'ERROR',
          fetchedAt,
          attribution: 'NASA LANCE / FIRMS MODIS & VIIRS Fire Detection — Open Public Stream',
        },
      });
    }

    allRecords.sort((a, b) => (b.frpMw ?? 0) - (a.frpMw ?? 0));
    const returnedRecords = allRecords.slice(0, 1500);

    const csvHeader = 'latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,frp,daynight';
    const csvRows = returnedRecords.map(r =>
      `${r.latitude},${r.longitude},${r.brightnessKelvin ?? ''},${r.scanKm ?? ''},${r.trackKm ?? ''},${r.acqDate},${(r.acqTimeUtc || '').replace(/[^0-9]/g, '').slice(0, 4)},${r.satellite},${r.instrument},${r.confidenceLevel},${r.frpMw ?? ''},${r.dayNight || 'D'}`
    );
    const rawCsv = [csvHeader, ...csvRows].join('\n');

    if (returnedRecords.length > 0 && !process.env.NODE_TEST_CONTEXT) {
      saveHotspotSnapshot({
        scope,
        bbox: bounds,
        dayRange: parseInt(dayRange, 10),
        rawCsv,
        data: returnedRecords,
        source: 'NASA_FIRMS_OPEN_NRT',
        snapshotDate: fetchedAt.slice(0, 10),
        fetchedAt,
        sensors: source === 'VIIRS' ? 'VIIRS' : source === 'MODIS' ? 'MODIS' : 'VIIRS & MODIS',
        notes: `Observasi Satelit Operasional NASA LANCE NRT (${returnedRecords.length} titik)`,
      }).catch((err) => console.warn('Could not auto-save hotspot snapshot:', err.message));
    }

    const failedFeeds = sourceAttempts.filter((s) => s.status === 'ERROR').map((s) => s.source);
    const isPartial = failedFeeds.length > 0;

    return res.status(200).json({
      success: true,
      count: returnedRecords.length,
      totalMatched: allRecords.length,
      receivedCount,
      partial: isPartial,
      sourceAttempts,
      warning: isPartial
        ? `Sebagian feed satelit gagal merespons (${failedFeeds.join(', ')}). Menampilkan data dari ${fulfilledCount}/${feedUrls.length} feed aktif.`
        : undefined,
      data: returnedRecords,
      rawCsv,
      csvFormat: 'HARMONY_NORMALIZED_FIRMS_V1',
      source,
      dayRange: parseInt(dayRange, 10),
      scope,
      windowEnd: fetchedAt,
      provenance: {
        sourceType: 'SATELLITE_HOTSPOT',
        provider: 'NASA EOSDIS LANCE FIRMS (Open NRT Satellite Feed)',
        dataStatus: isPartial ? 'PARTIAL' : 'LIVE',
        fetchedAt: allCached && receivedCount > 0 ? new Date(cacheOldestMs).toISOString() : fetchedAt,
        attribution: 'NASA LANCE / FIRMS MODIS & VIIRS Fire Detection — Open Public Stream',
        cached: allCached && receivedCount > 0,
      },
    });
  } catch (error) {
    if (req.query.allowCacheFallback === 'true') {
      try {
        const fallback = await getLatestHotspotSnapshot({ scope, dayRange: parseInt(dayRange, 10) });
        if (fallback && fallback.isBaseline === false) {
          return res.status(200).json({
            success: true,
            count: fallback.recordCount,
            totalMatched: fallback.recordCount,
            receivedCount: fallback.recordCount,
            data: fallback.data || [],
            rawCsv: fallback.rawCsv,
            csvFormat: 'HARMONY_NORMALIZED_FIRMS_V1',
            source: fallback.source,
            dayRange: fallback.dayRange,
            scope: fallback.scope,
            windowEnd: fallback.fetchedAt,
            isFallback: true,
            snapshotId: fallback.id,
            snapshotDate: fallback.snapshotDate,
            snapshotFetchedAt: fallback.fetchedAt,
            provenance: {
              sourceType: 'SATELLITE_HOTSPOT',
              provider: 'NASA EOSDIS LANCE FIRMS (Arsip Snapshot Tersimpan / Offline Fallback)',
              dataStatus: 'CACHED',
              fetchedAt: fallback.fetchedAt,
              attribution: 'NASA LANCE / FIRMS MODIS & VIIRS — Arsip Snapshot Tersimpan',
              cached: true,
              isFallback: true,
            },
            reason: {
              code: 'FALLBACK_TO_HISTORICAL_SNAPSHOT',
              message: `Koneksi satelit NASA LANCE mengalami kendala. Menampilkan data arsip tersimpan (${fallback.snapshotDate}, diambil ${new Date(fallback.fetchedAt).toLocaleString('id-ID')}).`,
            },
          });
        }
      } catch {}
    }

    return res.status(502).json({
      success: false,
      dataStatus: 'ERROR',
      count: 0,
      data: [],
      error: error instanceof Error ? error.message : 'Gagal mengambil data publik NASA FIRMS',
      provenance: {
        sourceType: 'SATELLITE_HOTSPOT',
        provider: 'NASA EOSDIS LANCE FIRMS (Open NRT Satellite Feed)',
        dataStatus: 'ERROR',
        fetchedAt,
        attribution: 'NASA LANCE / FIRMS MODIS & VIIRS Fire Detection — Open Public Stream',
      },
    });
  }
};

/**
 * GET /api/spatial/hotspots/timeline?scope=indonesia&year=2026
 * Lists available historical snapshots for timeline browsing
 */
export const getHotspotsTimeline = async (req, res) => {
  try {
    const { scope, year, limit = 50 } = req.query;
    const result = await listTimelineSnapshots({
      scope: scope || null,
      year: year ? parseInt(year, 10) : null,
      limit: parseInt(limit, 10) || 50,
    });
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Gagal memuat garis waktu arsip hotspot',
    });
  }
};

/**
 * GET /api/spatial/hotspots/timeline/:id
 * Retrieve a specific hotspot snapshot by its ID
 */
export const getHotspotsSnapshotByIdEndpoint = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Parameter id wajib diisi' });
    }
    const snapshot = await getHotspotSnapshotById(id);
    if (!snapshot) {
      return res.status(404).json({ success: false, error: 'Snapshot hotspot tidak ditemukan' });
    }
    return res.status(200).json({
      success: true,
      snapshot,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Gagal mengambil detail snapshot hotspot',
    });
  }
};

/**
 * POST /api/spatial/hotspots/snapshot
 * Save or import a snapshot to the repository
 */
export const saveHotspotSnapshotEndpoint = async (req, res) => {
  try {
    const { rawCsv, scope, bbox, dayRange, snapshotDate, notes, source } = req.body;
    if (!rawCsv || typeof rawCsv !== 'string') {
      return res.status(400).json({ success: false, error: 'Parameter rawCsv wajib diisi' });
    }
    const snapshot = await saveHotspotSnapshot({
      rawCsv,
      scope,
      bbox,
      dayRange,
      snapshotDate,
      notes,
      source: source || 'USER_SAVED_SNAPSHOT',
    });
    return res.status(201).json({
      success: true,
      snapshot,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Gagal menyimpan snapshot hotspot',
    });
  }
};

/**
 * OpenRouteService / Local Network Isochrones
 * POST /api/spatial/network/isochrones
 */
export const getIsochrones = async (req, res) => {
  const { centerLng, centerLat, profile = "foot-walking", intervalsMinutes = [5, 10, 15] } = req.body;
  if (centerLng === undefined || centerLat === undefined) {
    return res.status(400).json({ error: "Missing centerLng or centerLat" });
  }

  const orsKey = process.env.ORS_API_KEY;
  const fetchedAt = new Date().toISOString();

  let orsAttempt = null;
  if (orsKey) {
    try {
      const url = `https://api.openrouteservice.org/v2/isochrones/${profile}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: orsKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locations: [[centerLng, centerLat]],
          range: intervalsMinutes.map((m) => m * 60),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return res.json({
          success: true,
          profile,
          isochrones: data.features.map((f, idx) => ({
            intervalMinutes: intervalsMinutes[idx] || (f.properties?.value ? f.properties.value / 60 : 15),
            geometry: f.geometry,
            areaKm2: f.properties?.area ? f.properties.area / 1e6 : null,
          })),
          provenance: {
            sourceType: "NETWORK_ISOCHRONE",
            provider: "OpenRouteService v2",
            dataStatus: "LIVE",
            fetchedAt,
            attribution: "OpenRouteService.org contributors / OSM",
          },
        });
      } else {
        orsAttempt = {
          status: "FAILED",
          statusCode: response.status,
          error: `OpenRouteService mengembalikan status HTTP ${response.status} ${response.statusText}`,
        };
      }
    } catch (err) {
      orsAttempt = {
        status: "FAILED",
        error: `Koneksi OpenRouteService gagal: ${err.message}`,
      };
    }
  } else {
    orsAttempt = {
      status: "NOT_CONFIGURED",
      error: "ORS_API_KEY tidak dikonfigurasi pada environment server.",
    };
  }

  const speedKmh = profile === "foot-walking" ? 4.5 : profile === "cycling-regular" ? 14.0 : 28.0;
  const earthRadiusKm = 6371;

  const isochrones = intervalsMinutes.map((minutes) => {
    const nominalDistKm = speedKmh * (minutes / 60) * 0.72; // 0.72 winding factor
    const numPoints = 24;
    const coordinates = [];
    for (let i = 0; i <= numPoints; i++) {
      const angle = (i / numPoints) * 2 * Math.PI;
      const radialDist = nominalDistKm * (0.85 + 0.15 * Math.sin(angle * 3) + 0.1 * Math.cos(angle * 2));
      const latOffset = (radialDist / earthRadiusKm) * (180 / Math.PI);
      const lngOffset = (radialDist / (earthRadiusKm * Math.cos((centerLat * Math.PI) / 180))) * (180 / Math.PI);
      coordinates.push([centerLng + lngOffset * Math.cos(angle), centerLat + latOffset * Math.sin(angle)]);
    }
    const areaKm2 = parseFloat((Math.PI * Math.pow(nominalDistKm, 2)).toFixed(2));
    return {
      intervalMinutes: minutes,
      intervalSeconds: minutes * 60,
      geometry: {
        type: "Polygon",
        coordinates: [coordinates],
      },
      areaKm2,
      profile,
    };
  });

  const assumptions = [
    orsKey
      ? `Upstream ORS gagal (${orsAttempt?.error || "Error tidak diketahui"}). Menggunakan estimasi topologi fallback.`
      : "ORS_API_KEY tidak dikonfigurasi pada server. Menggunakan estimasi topologi radial heuristik.",
    "Isokron diperkirakan dari kecepatan rata-rata moda dengan faktor belitan jalan perkotaan (0.72); bukan representasi graf jalan sebenarnya.",
  ];

  return res.json({
    success: true,
    profile,
    isochrones,
    provenance: {
      sourceType: "DERIVED_COMPUTATION",
      provider: "Harmony Local Network Topology Engine",
      dataStatus: "ESTIMATED",
      algorithmVersion: "2.1.0",
      upstreamAttempt: orsAttempt,
      assumptions,
      fetchedAt,
      attribution: "Perkiraan Isokron Topologi Harmony",
    },
  });
};

/**
 * 15-Minute City Facility Accessibility Evaluator
 * POST /api/spatial/network/accessibility
 */
export const getFacilityAccessibility = async (req, res) => {
  const { originPoint, originName = "Titik Evaluasi", profile = "foot-walking", facilities = [] } = req.body;
  if (!originPoint || originPoint.length < 2) {
    return res.status(400).json({ error: "Missing or invalid originPoint [lng, lat]" });
  }

  const [origLng, origLat] = originPoint;
  const speedKmh = profile === "foot-walking" ? 4.5 : profile === "cycling-regular" ? 14.0 : 28.0;

  const matrix = facilities.map((fac) => {
    const fLat = fac.lat ?? fac.latitude;
    const fLng = fac.lng ?? fac.longitude;
    const distKm = haversineDistanceKm(origLat, origLng, fLat, fLng);
    const networkDistKm = distKm * 1.35; // network circuity factor
    const travelTimeMinutes = parseFloat(((networkDistKm / speedKmh) * 60).toFixed(1));
    const reachableWithin15Min = travelTimeMinutes <= 15;

    return {
      facilityId: fac.id,
      facilityName: fac.name,
      category: fac.category,
      distanceMeters: Math.round(networkDistKm * 1000),
      travelTimeMinutes,
      reachableWithin15Min,
      status: reachableWithin15Min ? "REACHABLE" : "UNREACHABLE",
    };
  });

  const categories = ["sekolah", "kesehatan", "evakuasi", "pasar", "transportasi"];
  const insufficientDataCategories = [];
  const unservedCategories = [];

  const categoryReachability = categories.map((cat) => {
    const facsInCat = matrix.filter((m) => m.category === cat);
    if (facsInCat.length === 0) {
      insufficientDataCategories.push(cat);
      return {
        category: cat,
        label: cat.toUpperCase(),
        evaluatedCount: 0,
        evaluationStatus: "INSUFFICIENT_DATA",
        hasAccess15Min: null,
        nearestTravelTimeMin: null,
        nearestFacilityName: "Data Fasilitas Tidak Tersedia",
      };
    }
    const sorted = facsInCat.sort((a, b) => a.travelTimeMinutes - b.travelTimeMinutes);
    const nearest = sorted[0];
    if (!nearest.reachableWithin15Min) {
      unservedCategories.push(cat);
    }
    return {
      category: cat,
      label: cat.toUpperCase(),
      evaluatedCount: facsInCat.length,
      evaluationStatus: nearest.reachableWithin15Min ? "EVALUATED_REACHABLE" : "EVALUATED_UNREACHABLE",
      hasAccess15Min: nearest.reachableWithin15Min,
      nearestTravelTimeMin: nearest.travelTimeMinutes,
      nearestFacilityName: nearest.facilityName,
    };
  });

  const is15MinCityCompliant = insufficientDataCategories.length > 0 ? null : unservedCategories.length === 0;
  const complianceStatus = insufficientDataCategories.length > 0
    ? "NOT_EVALUABLE"
    : (unservedCategories.length === 0 ? "COMPLIANT" : "NON_COMPLIANT");

  return res.json({
    success: true,
    originPoint: [origLng, origLat],
    originName,
    profile,
    categoryReachability,
    matrix,
    is15MinCityCompliant,
    complianceStatus,
    unservedCategories,
    insufficientDataCategories,
    provenance: {
      sourceType: "DERIVED_COMPUTATION",
      provider: "Harmony 15-Minute City Network Accessibility Engine",
      dataStatus: "DERIVED",
      algorithmVersion: "2.1.0",
      fetchedAt: new Date().toISOString(),
      attribution: "Analisis Kesenjangan Layanan Fasilitas Harmony (Jarak sirkuit jaringan terestimasi)",
    },
  });
};

export const EMISSION_FACTORS = {
  car_petrol_avg: { factor: 164.5, basis: "vehicle-km", unit: "g CO2e/km", source: "UK DESNZ 2026 (Passenger Cars Petrol, Average)" },
  car_gasoline_medium: { factor: 170.5, basis: "vehicle-km", unit: "g CO2e/km", source: "UK DESNZ 2026 (Passenger Cars Petrol, 1.4-2.0L)" },
  car_diesel_avg: { factor: 168.2, basis: "vehicle-km", unit: "g CO2e/km", source: "UK DESNZ 2026 (Passenger Cars Diesel, Average)" },
  car_diesel_medium: { factor: 168.2, basis: "vehicle-km", unit: "g CO2e/km", source: "UK DESNZ 2026 (Passenger Cars Diesel, 1.7-2.0L)" },
  car_hybrid_avg: { factor: 112.4, basis: "vehicle-km", unit: "g CO2e/km", source: "UK DESNZ 2026 (Hybrid Petrol, Average)" },
  car_electric_bev: { factor: 117.0, basis: "vehicle-km", unit: "g CO2e/km", source: "ESDM RI 2025 / Grid Jamali 0.78 kg CO2/kWh x 0.15 kWh/km" },
  car_electric_beve: { factor: 117.0, basis: "vehicle-km", unit: "g CO2e/km", source: "ESDM RI 2025 / Grid Jamali 0.78 kg CO2/kWh x 0.15 kWh/km" },
  car_bev_id: { factor: 117.0, basis: "vehicle-km", unit: "g CO2e/km", source: "ESDM RI 2025 / Grid Jamali 0.78 kg CO2/kWh x 0.15 kWh/km" },
  car_bev_id_mini: { factor: 78.6, basis: "vehicle-km", unit: "g CO2e/km", source: "ESDM RI 2025 / Grid Jamali 0.785 kg CO2/kWh x 0.10 kWh/km (Mini EV)" },
  motorcycle_small: { factor: 82.8, basis: "vehicle-km", unit: "g CO2e/km", source: "UK DESNZ 2026 (Motorcycle <125cc)" },
  motorcycle_avg: { factor: 103.1, basis: "vehicle-km", unit: "g CO2e/km", source: "UK DESNZ 2026 (Motorcycle Average)" },
  motorcycle_gasoline: { factor: 103.1, basis: "vehicle-km", unit: "g CO2e/km", source: "UK DESNZ 2026 (Motorcycle Average)" },
  bus_city_passenger: { factor: 96.5, basis: "passenger-km", unit: "g CO2e/pkm", source: "UK DESNZ 2026 (Local bus, average)" },
  bus_brt_passenger: { factor: 28.4, basis: "passenger-km", unit: "g CO2e/pkm", source: "UK DESNZ 2026 (Coach / BRT TransJakarta)" },
  bus_transit_urban: { factor: 28.4, basis: "passenger-km", unit: "g CO2e/pkm", source: "UK DESNZ 2026 (Coach / BRT TransJakarta)" },
  train_commuter_passenger: { factor: 35.1, basis: "passenger-km", unit: "g CO2e/pkm", source: "KRL Commuterline / UK DESNZ 2026 (National rail)" },
  train_electric_krl: { factor: 35.1, basis: "passenger-km", unit: "g CO2e/pkm", source: "KRL Commuterline / UK DESNZ 2026 (National rail)" },
  train_light_rail: { factor: 28.6, basis: "passenger-km", unit: "g CO2e/pkm", source: "UK DESNZ 2026 (Light rail & tram)" },
  walking: { factor: 0.0, basis: "vehicle-km", unit: "g CO2e/km", source: "Zero Direct Tailpipe" },
  bicycle: { factor: 0.0, basis: "vehicle-km", unit: "g CO2e/km", source: "Zero Direct Tailpipe" },
  active_walk_bike: { factor: 0.0, basis: "vehicle-km", unit: "g CO2e/km", source: "Zero Direct Tailpipe" },
};

export const IDLE_RATES_KG_PER_MIN = {
  car_petrol_avg: 0.020, // 1.2 kg CO2e / hour tailpipe idle
  car_gasoline_medium: 0.020,
  car_diesel_avg: 0.020,
  car_diesel_medium: 0.020,
  car_hybrid_avg: 0.010, // hybrid idling with engine off ~50%
  motorcycle_small: 0.005, // 0.3 kg CO2e / hour
  motorcycle_avg: 0.005,
  motorcycle_gasoline: 0.005,
  // EV, bus, train, walk, bike = 0 kg tailpipe idle per passenger
};

/**
 * Transport Emissions Estimator with Verified Factors (UK DESNZ 2026 & ESDM RI)
 * POST /api/spatial/transport/emissions
 */
export const calculateTransportEmissions = async (req, res) => {
  const {
    distanceKm,
    vehicleCategory = "car_petrol_avg",
    occupancy = 1,
    roundTrip = false,
    tripsPerWeek = 1,
    weeks = 1,
    idleMinutes = 0,
  } = req.body;

  if (distanceKm === undefined || isNaN(distanceKm) || distanceKm <= 0) {
    return res.status(400).json({ error: "distanceKm harus berupa angka positif" });
  }

  const factorInfo = EMISSION_FACTORS[vehicleCategory];
  if (!factorInfo) {
    return res.status(400).json({
      error: `Kategori kendaraan '${vehicleCategory}' tidak dikenal pada registry faktor emisi resmi. Kategori valid: ${Object.keys(EMISSION_FACTORS).join(", ")}`,
    });
  }

  const tripsMultiplier = (roundTrip ? 2 : 1) * Math.max(1, tripsPerWeek) * Math.max(1, weeks);
  const totalDistanceKm = parseFloat((distanceKm * tripsMultiplier).toFixed(2));
  const validOccupancy = Math.max(1, occupancy || 1);

  const idleRate = IDLE_RATES_KG_PER_MIN[vehicleCategory] || 0;
  const idleEmissionsKg = idleMinutes > 0 ? parseFloat((idleMinutes * idleRate * tripsMultiplier).toFixed(4)) : 0;

  let totalEmissionsKg = 0;
  let perPassengerKg = 0;

  if (factorInfo.basis === "vehicle-km") {
    totalEmissionsKg = (totalDistanceKm * factorInfo.factor) / 1000 + idleEmissionsKg;
    perPassengerKg = totalEmissionsKg / validOccupancy;
  } else {
    // passenger-km: individual passenger rate
    perPassengerKg = (totalDistanceKm * factorInfo.factor) / 1000 + (validOccupancy > 1 ? idleEmissionsKg / validOccupancy : idleEmissionsKg);
    totalEmissionsKg = perPassengerKg * validOccupancy;
  }

  totalEmissionsKg = parseFloat(totalEmissionsKg.toFixed(3));
  perPassengerKg = parseFloat(perPassengerKg.toFixed(3));
  const treesEquivalentYear = parseFloat((totalEmissionsKg / 21.77).toFixed(2));

  return res.json({
    success: true,
    tripDistanceKm: distanceKm,
    totalDistanceKm,
    tripsCount: tripsMultiplier,
    occupancy: validOccupancy,
    vehicleCategory,
    factorUsed: {
      factorValue: factorInfo.factor,
      basis: factorInfo.basis,
      unit: factorInfo.unit,
      source: factorInfo.source,
    },
    totalEmissionsKgCO2e: totalEmissionsKg,
    perPassengerEmissionsKgCO2e: perPassengerKg,
    idleEmissionsKgCO2e: parseFloat(idleEmissionsKg.toFixed(3)),
    treesEquivalentYear,
    provenance: {
      sourceType: "DERIVED_COMPUTATION",
      provider: "Harmony Transport Emission Calculator",
      dataStatus: "DERIVED",
      algorithmVersion: "2.1.0",
      fetchedAt: new Date().toISOString(),
      attribution: "Faktor Emisi UK DESNZ 2026 & ESDM RI",
    },
  });
};

/**
 * TomTom Traffic Flow Proxy with strict payload validation and bounded requests
 * GET /api/spatial/traffic/flow?lat=-6.2&lng=106.8
 */
export const getTrafficFlowProxy = async (req, res) => {
  const strictCoordinate = (value) => typeof value === 'string' && /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim()) ? Number(value) : NaN;
  const pLat = strictCoordinate(req.query.lat), pLng = strictCoordinate(req.query.lng);
  if (!Number.isFinite(pLat) || !Number.isFinite(pLng) || Math.abs(pLat) > 90 || Math.abs(pLng) > 180) {
    return res.status(400).json({ success: false, data: null, error: 'Missing or invalid lat/lng parameter' });
  }
  // Server-managed authority: API credentials are strictly read from environment variables to prevent client-side tampering
  const tomtomKey = process.env.TOMTOM_API_KEY?.trim();
  if (!tomtomKey) return res.status(200).json({ success: false, data: null,
    reason: { code: 'NOT_CONFIGURED', message: 'Kunci TomTom Traffic belum dikonfigurasi pada server.', retryable: false },
    provenance: { sourceType: 'TRAFFIC_FLOW_PROXY', provider: 'TomTom Traffic Flow API', dataStatus: 'UNAVAILABLE', attribution: 'TomTom API belum terhubung; simulasi ditampilkan terpisah.' },
  });

  try {
    const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/relative0/10/json?point=${pLat.toFixed(5)},${pLng.toFixed(5)}&unit=KMPH&key=${tomtomKey}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let response, json;
    try {
      response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      json = await response.json();
    } finally { clearTimeout(timeout); }

    const flowData = json?.flowSegmentData;
    const nonnegative = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
    const coordinates = flowData?.coordinates?.coordinate;
    if (!flowData || !['currentSpeed', 'freeFlowSpeed', 'currentTravelTime', 'freeFlowTravelTime'].every(field => nonnegative(flowData[field]))
      || !nonnegative(flowData.confidence) || flowData.confidence > 1 || typeof flowData.roadClosure !== 'boolean'
      || !Array.isArray(coordinates) || coordinates.length < 2 || !coordinates.every(c => typeof c?.latitude === 'number' && Number.isFinite(c.latitude) && Math.abs(c.latitude) <= 90 && typeof c?.longitude === 'number' && Number.isFinite(c.longitude) && Math.abs(c.longitude) <= 180)) {
      return res.status(502).json({ success: false, data: null, reason: { code: 'INVALID_UPSTREAM_PAYLOAD', message: 'Respons traffic tidak memiliki parameter dan geometri valid.' }, provenance: { provider: 'TomTom Traffic Flow API', dataStatus: 'UNAVAILABLE' } });
    }
    const fetchedAt = new Date().toISOString();

    return res.json({
      success: true,
      data: {
        currentSpeedKmh: flowData.currentSpeed ?? null,
        freeFlowSpeedKmh: flowData.freeFlowSpeed ?? null,
        currentTravelTimeSec: flowData.currentTravelTime ?? null,
        freeFlowTravelTimeSec: flowData.freeFlowTravelTime ?? null,
        confidence: flowData.confidence ?? null,
        roadClosure: Boolean(flowData.roadClosure),
        coordinates: flowData.coordinates?.coordinate?.map((c) => [c.longitude, c.latitude]) || [],
      },
      provenance: {
        sourceType: "TRAFFIC_FLOW_PROXY",
        provider: "TomTom Traffic Flow API",
        dataStatus: "LIVE",
        fetchedAt,
        attribution: "TomTom NV (Traffic Flow Segment)",
      },
    });
  } catch (err) {
    return res.status(502).json({
      success: false,
      error: 'Pengambilan TomTom Traffic gagal.',
      reason: { code: err?.name === 'AbortError' ? 'TIMEOUT' : /^HTTP_\d+$/.test(err?.message || '') ? err.message : 'UPSTREAM_FETCH_FAILED' },
      provenance: { provider: 'TomTom Traffic Flow API', dataStatus: 'UNAVAILABLE' },
      data: null,
    });
  }
};

/**
 * Unified School Risk Synthesis Endpoint
 * GET /api/spatial/school-risk-synthesis?schoolId=...&lat=...&lng=...
 * POST /api/spatial/school-risk-synthesis
 */
export const getSchoolRiskSynthesis = async (req, res) => {
  try {
    const db = await readDB();
    const query = req.method === "POST" ? req.body : req.query;
    const { schoolId, lat, lng, name, slopeDegrees } = query || {};

    let targetSchool = null;
    if (schoolId) {
      targetSchool = (db.schools || []).find((s) => s.id === schoolId);
    }

    if (!targetSchool) {
      const pLat = parseFloat(lat);
      const pLng = parseFloat(lng);
      if (Number.isFinite(pLat) && Number.isFinite(pLng)) {
        targetSchool = {
          id: schoolId || `custom-${Date.now()}`,
          name: name || "Titik Sekolah Dipilih",
          lat: pLat,
          lng: pLng,
          slopeDegrees: parseFloat(slopeDegrees) || 6,
        };
      } else if (db.schools && db.schools.length > 0) {
        targetSchool = db.schools[0];
      } else {
        targetSchool = {
          id: "sch-default",
          name: "Sekolah Standar",
          lat: -6.2088,
          lng: 106.8456,
          slopeDegrees: 6,
        };
      }
    }

    // Ambil data gunung api
    let volcanoes = [];
    try {
      const fs = await import("fs");
      const path = await import("path");
      const { fileURLToPath } = await import("url");
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const mPath = path.resolve(__dirname, "../database/data/mountains.json");
      if (fs.existsSync(mPath)) {
        volcanoes = JSON.parse(fs.readFileSync(mPath, "utf8"));
      }
    } catch (e) {
      console.warn("Could not read mountains.json:", e.message);
    }

    let earthquakes = Array.isArray(db.spatialCache?.["bmkg_earthquakes"]) && db.spatialCache["bmkg_earthquakes"].length > 0
      ? db.spatialCache["bmkg_earthquakes"]
      : null;
    let seismicDataStatus = earthquakes ? "CACHED" : "UNAVAILABLE";

    if (!earthquakes) {
      const liveQuakeRes = await fetchLiveEarthquakesFromUpstreams().catch(() => ({ earthquakes: [], sourceAttempts: [] }));
      if (liveQuakeRes.earthquakes.length > 0) {
        earthquakes = liveQuakeRes.earthquakes;
        seismicDataStatus = "LIVE";
      } else {
        earthquakes = [];
      }
    }

    let precipitation = null;
    let weatherDataStatus = "UNAVAILABLE";
    try {
      const wRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${targetSchool.lat}&longitude=${targetSchool.lng}&current=precipitation`,
        { signal: AbortSignal.timeout(3500) }
      );
      if (wRes.ok) {
        const wJson = await wRes.json();
        if (typeof wJson?.current?.precipitation === "number" && Number.isFinite(wJson.current.precipitation)) {
          precipitation = Math.max(0, wJson.current.precipitation);
          weatherDataStatus = "LIVE";
        }
      }
    } catch {
      weatherDataStatus = "ERROR";
    }

    const synthesis = synthesizeSchoolRisk({
      school: targetSchool,
      earthquakes,
      volcanoes,
      weather: { precipitation: precipitation ?? 0 },
    });

    return res.json({
      success: true,
      data: {
        ...synthesis,
        seismicDataStatus,
        weatherDataStatus,
        precipitationMm: precipitation,
      },
    });
  } catch (error) {
    console.error("Error in getSchoolRiskSynthesis:", error);
    return res.status(500).json({
      success: false,
      error: "Gagal memproses sintesis risiko spasial: " + error.message,
    });
  }
};

// In-memory buffer for anonymous crowdsourced GPS probe pings
const gpsProbesBuffer = [];

/**
 * Submit Anonymous Crowdsourced GPS Probe Ping
 * POST /api/spatial/traffic/gps-probe
 */
export const submitGpsProbe = async (req, res) => {
  try {
    const { lat, lng, speedKmh, headingDeg, deviceType = "mobile_gps", clientTimestamp } = req.body || {};
    const pLat = Number(lat);
    const pLng = Number(lng);
    const hasValidSpeed = speedKmh !== null && speedKmh !== undefined && speedKmh !== '' && Number.isFinite(Number(speedKmh));
    const pSpeed = hasValidSpeed ? Number(speedKmh) : null;
    const pHeading = Number(headingDeg) || 0;

    if (!Number.isFinite(pLat) || !Number.isFinite(pLng) || Math.abs(pLat) > 90 || Math.abs(pLng) > 180) {
      return res.status(400).json({ success: false, error: "Koordinat GPS tidak valid" });
    }

    const probe = {
      id: `usr-probe-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      lat: Number(pLat.toFixed(6)),
      lng: Number(pLng.toFixed(6)),
      speedKmh: pSpeed !== null ? Math.max(0, Math.min(180, Math.round(pSpeed))) : null,
      headingDeg: Math.round(((pHeading % 360) + 360) % 360),
      deviceType: String(deviceType).slice(0, 32),
      receivedAt: Date.now(),
      clientTimestamp: Number(clientTimestamp) || Date.now(),
    };

    gpsProbesBuffer.push(probe);
    if (gpsProbesBuffer.length > 500) {
      gpsProbesBuffer.shift();
    }

    return res.status(201).json({
      success: true,
      message: "Probe GPS berhasil diagregasikan ke jaringan telemetri kemacetan.",
      data: {
        probeId: probe.id,
        activeProbesCount: gpsProbesBuffer.length,
        receivedAt: new Date(probe.receivedAt).toISOString(),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get Active Crowdsourced GPS Probes & Hotspots
 * GET /api/spatial/traffic/probes
 */
export const getGpsProbes = async (req, res) => {
  try {
    const now = Date.now();
    const recentProbes = gpsProbesBuffer.filter((p) => now - p.receivedAt < 15 * 60 * 1000);

    return res.json({
      success: true,
      count: recentProbes.length,
      data: recentProbes,
      provenance: {
        provider: "Harmony Crowdsourced GPS Probe Network",
        dataStatus: "LIVE",
        refreshedAt: new Date(now).toISOString(),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Safe CORS/CORB Proxy for Public ATCS CCTV Snapshots & HLS Video Chunks
 * GET /api/spatial/traffic/cctv-proxy?url=<encoded_url>
 */
export const proxyCctvStream = async (req, res) => {
  try {
    const targetUrl = req.query.url;
    if (!targetUrl || typeof targetUrl !== 'string') {
      return sendFallbackCctvPattern(res, "ATCS STANDBY", "Parameter URL tidak valid");
    }

    const decoded = decodeURIComponent(targetUrl);
    if (!decoded.startsWith('http://') && !decoded.startsWith('https://')) {
      return sendFallbackCctvPattern(res, "PROTOKOL TIDAK VALID", decoded);
    }

    const result = await cctvService.proxyStreamChunk(decoded);
    if (!result.ok) {
      if (decoded.includes('.ts') || decoded.includes('stream?t=')) {
        return res.status(result.status || 504).send(result.error);
      }
      return sendFallbackCctvPattern(res, "FEED OFFLINE", result.error || decoded);
    }

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (result.contentType.includes('mpegurl') || decoded.includes('.m3u8')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=60');
    }
    return res.send(result.buffer);
  } catch (err) {
    return sendFallbackCctvPattern(res, "ERROR PROXY ATCS", err.message);
  }
};

/**
 * Live HLS Stream Playlist Rewriter & Proxy
 * GET /api/spatial/traffic/cctv-stream?id=<camera_id>
 */
export const streamTrafficCctv = async (req, res) => {
  try {
    const cameraId = req.query.id;
    if (!cameraId || typeof cameraId !== 'string') {
      return res.status(400).json({ success: false, error: 'Parameter id kamera tidak valid' });
    }

    const result = await cctvService.fetchHlsPlaylist(cameraId);
    if (!result.ok) {
      return res.status(result.status || 502).json({ success: false, error: result.error });
    }

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.send(result.playlist);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Direct Live CCTV Stream Handler for /api/stream
 * Proxies both HLS playlists (?id=<cameraId>) and fMP4 / TS video segments (?t=<token>)
 * GET /api/stream?t=<token>
 * GET /api/stream?id=<cameraId>
 */
export const handleDirectCctvStream = async (req, res) => {
  try {
    const { t, id, url } = req.query;

    if (t && typeof t === 'string') {
      const targetUrl = `${cctvService.getBaseUrl()}/api/stream?t=${encodeURIComponent(t)}`;
      const result = await cctvService.proxyStreamChunk(targetUrl);
      if (!result.ok) {
        return res.status(result.status || 502).send(result.error);
      }

      res.setHeader('Content-Type', result.contentType || 'video/mp4');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');

      if (result.isPlaylist || result.contentType.includes('mpegurl')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      }
      return res.send(result.buffer);
    }

    if (id && typeof id === 'string') {
      const result = await cctvService.fetchHlsPlaylist(id);
      if (!result.ok) {
        return res.status(result.status || 502).json({ success: false, error: result.error });
      }

      res.setHeader('Content-Type', result.contentType || 'application/vnd.apple.mpegurl; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.send(result.playlist);
    }

    if (url && typeof url === 'string') {
      const decoded = decodeURIComponent(url);
      const result = await cctvService.proxyStreamChunk(decoded);
      if (!result.ok) {
        return res.status(result.status || 502).send(result.error);
      }
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
      if (result.isPlaylist || result.contentType.includes('mpegurl')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      }
      return res.send(result.buffer);
    }

    return res.status(400).json({ success: false, error: 'Parameter t atau id diperlukan' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Direct Live CCTV Thumbnail Endpoint
 * GET /api/spatial/traffic/cctv-thumbnail?id=<camera_id>
 */
export const getTrafficCctvThumbnail = async (req, res) => {
  try {
    const cameraId = req.query.id;
    if (!cameraId || typeof cameraId !== 'string') {
      return sendFallbackCctvPattern(res, "CCTV", "ID Kamera tidak valid");
    }

    const resolvedId = cctvService.resolveAlias(cameraId);
    const targetUrl = `https://cctvnusantara.com/api/thumbnail?id=${encodeURIComponent(resolvedId)}`;
    const result = await cctvService.proxyStreamChunk(targetUrl);

    if (!result.ok) {
      return sendFallbackCctvPattern(res, "STANDBY", "Snapshot sedang memperbarui");
    }

    res.setHeader('Content-Type', result.contentType || 'image/jpeg');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.send(result.buffer);
  } catch (err) {
    return sendFallbackCctvPattern(res, "ERROR", err.message);
  }
};

function sendFallbackCctvPattern(res, title, subtitle) {
  const timeStr = new Date().toLocaleTimeString('id-ID');
  const dateStr = new Date().toISOString().split('T')[0];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
    <rect width="640" height="360" fill="#090d16"/>
    <defs>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="640" height="360" fill="url(#grid)"/>
    <circle cx="320" cy="180" r="120" fill="none" stroke="rgba(14,165,233,0.15)" stroke-width="2"/>
    <circle cx="320" cy="180" r="60" fill="none" stroke="rgba(239,68,68,0.25)" stroke-width="2"/>
    <line x1="320" y1="40" x2="320" y2="320" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
    <line x1="160" y1="180" x2="480" y2="180" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
    
    <rect x="20" y="20" width="140" height="26" rx="6" fill="rgba(239,68,68,0.25)" stroke="#ef4444" stroke-width="1.5"/>
    <circle cx="34" cy="33" r="5" fill="#ef4444"/>
    <text x="46" y="37" fill="#fecaca" font-family="monospace" font-size="11" font-weight="bold">STANDBY ATCS</text>

    <text x="620" y="37" text-anchor="end" fill="#38bdf8" font-family="monospace" font-size="12" font-weight="bold">${dateStr} ${timeStr} WIB</text>

    <text x="320" y="165" text-anchor="middle" fill="#f8fafc" font-family="sans-serif" font-size="16" font-weight="bold">${title}</text>
    <text x="320" y="195" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="11">Mencoba menghubungkan ulang ke sensor kamera daerah...</text>
    <text x="320" y="220" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="9">${subtitle ? String(subtitle).slice(0, 70) : ''}</text>

    <rect x="0" y="335" width="640" height="25" fill="rgba(0,0,0,0.7)"/>
    <text x="15" y="352" fill="#64748b" font-family="sans-serif" font-size="10">HARMONY SMART MOBILITY • CCTV NUSANTARA &amp; ATCS DISHUB</text>
  </svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  return res.send(svg);
}

/**
 * Real-time Traffic CCTV Feeds Catalog
 * GET /api/spatial/traffic/cctv
 */
export const getTrafficCctvList = async (req, res) => {
  try {
    const { region, city, category, search, q, limit, page } = req.query;
    const filterCity = city || region;
    const filterSearch = search || q;

    const result = cctvService.getCameras({
      city: filterCity,
      category,
      search: filterSearch,
      limit: limit ? Number(limit) : 250,
      page: page ? Number(page) : 1,
    });
    const health = cctvService.getHealthStatus();
    const provStatus = health.status === "ONLINE" ? "LIVE" : health.status;

    return res.json({
      success: true,
      total: result.total,
      count: result.count,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      cities: result.cities,
      categories: result.categories,
      data: result.data,
      provenance: {
        provider: "CCTV Nusantara & Jaringan ATCS Terbuka Nasional",
        status: provStatus,
        timestamp: new Date().toISOString(),
        lastRefreshedAt: cctvService.lastRefreshedAt ? new Date(cctvService.lastRefreshedAt).toISOString() : null,
        syncIntervalMinutes: 5,
        autoUpdateActive: health.status !== "OFFLINE",
        health,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Real-time CCTV Health & Auto-Sync Telemetry
 * GET /api/spatial/traffic/cctv-health
 */
export const getTrafficCctvHealth = async (req, res) => {
  try {
    const health = cctvService.getHealthStatus();
    return res.json({
      success: true,
      health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Trigger immediate manual refresh of CCTV catalog and background probe
 * POST /api/spatial/traffic/cctv-refresh
 */
export const triggerTrafficCctvRefresh = async (req, res) => {
  try {
    await cctvService.periodicUpdateTask();
    return res.json({
      success: true,
      message: "Sinkronisasi data CCTV dan health probe berhasil dijalankan.",
      health: cctvService.getHealthStatus(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Real-time Traffic Signal & ATCS Intersections Catalog
 * GET /api/spatial/traffic/signals
 */
export const getTrafficSignalsList = async (req, res) => {
  try {
    const now = Date.now();
    const signals = trafficSignalsBackendService.getSignals(now);
    const provenance = trafficSignalsBackendService.getProvenance();

    return res.json({
      success: true,
      count: signals.length,
      data: signals,
      provenance,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Live Integrated Traffic Network Telemetry
 * GET /api/spatial/traffic/live-network
 */
export const getLiveTrafficNetwork = async (req, res) => {
  try {
    const nowMs = Date.now();
    const recentProbes = gpsProbesBuffer.filter((p) => nowMs - p.receivedAt < 15 * 60 * 1000);
    const speedProbes = recentProbes.filter((p) => typeof p.speedKmh === 'number' && Number.isFinite(p.speedKmh));
    const averageSpeedKmh = speedProbes.length > 0
      ? Number((speedProbes.reduce((sum, p) => sum + p.speedKmh, 0) / speedProbes.length).toFixed(1))
      : null;

    const tomtomConfigured = Boolean(process.env.TOMTOM_API_KEY?.trim());
    const cctvList = cctvService.getCameras({ limit: 1 });
    const cctvHealth = cctvService.getHealthStatus();
    const onlineCctvCount = Math.max(0, (cctvHealth.totalCameras || cctvList.total || 0) - (cctvHealth.degradedCameras || 0));

    let dataStatus = 'UNAVAILABLE';
    let reason = 'TomTom Traffic API belum dikonfigurasi pada server dan belum ada GPS probe aktif dalam 15 menit terakhir.';
    if (speedProbes.length > 0 && !tomtomConfigured) {
      dataStatus = 'PARTIAL';
      reason = `Menampilkan ${speedProbes.length} probe GPS crowdsourced aktif. Kunci TomTom Traffic API belum dikonfigurasi untuk indeks arus nasional.`;
    } else if (tomtomConfigured && speedProbes.length === 0) {
      dataStatus = 'PARTIAL';
      reason = 'Gunakan endpoint /api/spatial/traffic/flow?lat=...&lng=... untuk segmen arus lalu lintas TomTom real-time.';
    } else if (tomtomConfigured && speedProbes.length > 0) {
      dataStatus = 'PARTIAL';
      reason = 'Telemetri segmen TomTom tersedia per koordinat dan digabung dengan probe GPS aktif.';
    }

    return res.json({
      success: true,
      data: {
        monitoredCorridors: tomtomConfigured ? null : 0,
        totalRoadLengthKm: null,
        nationalFlowIndex: null,
        averageSpeedKmh,
        activeGpsProbeCount: recentProbes.length,
        activeCctvCount: onlineCctvCount,
        onlineCctvCount,
        onlineSignalsCount: trafficSignalsBackendService.getSignals(nowMs).length,
        severeBottlenecks: [],
        tomtomConfigured,
        dataStatus,
        reason,
        refreshedAt: new Date(nowMs).toISOString(),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, dataStatus: 'ERROR', error: error.message });
  }
};

export const getFaultsMetadata = async (req, res) => {
  try {
    return res.json({
      success: true,
      dataStatus: 'STATIC_CATALOG',
      isLiveFeed: false,
      source: 'PuSGeN 2017 (Kementerian PUPR) — Subset 26 Segmen Utama',
      segmentCount: 26,
      referenceCatalogTotal: 295,
      note: 'Dataset vektor segmen sesar aktif bersifat statis ilmiah (ISBN 978-602-5489-01-3), bukan stream telemetri waktu nyata.',
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ success: false, dataStatus: 'ERROR', error: error.message });
  }
};

export const getVolcanoesList = async (req, res) => {
  try {
    const { status, type } = req.query;
    const fs = await import("fs");
    const path = await import("path");
    const { fileURLToPath } = await import("url");
    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    let mountains = [];
    const mPath = path.resolve(__dirname, "../database/data/mountains.json");
    if (fs.existsSync(mPath)) {
      mountains = JSON.parse(fs.readFileSync(mPath, "utf8"));
    }

    if (status) {
      const s = String(status).toLowerCase();
      if (s === 'active') mountains = mountains.filter(m => m.status === 'Active');
      else if (s === 'inactive') mountains = mountains.filter(m => m.status !== 'Active');
    }

    if (type) {
      const t = String(type).toLowerCase();
      mountains = mountains.filter(m => (m.type || '').toLowerCase() === t);
    }

    return res.json({
      success: true,
      dataStatus: 'STATIC_CATALOG',
      count: mountains.length,
      data: mountains,
      provenance: {
        source: "Katalog Statis Gunung Api Indonesia (PVMBG / Smithsonian GVP)",
        isLiveFeed: false,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

function parseGvpWeeklyRss(xmlText) {
  const channelPubDate = xmlText.match(/<channel>[\s\S]*?<pubDate>(.*?)<\/pubDate>/i)?.[1]?.trim() || null;
  const itemMatches = [...xmlText.matchAll(/<item>([\s\S]*?)<\/item>/g)];
  const records = [];

  for (const match of itemMatches) {
    const block = match[1];
    const titleRaw = block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '';
    const link = block.match(/<link>([\s\S]*?)<\/link>/i)?.[1]?.trim() || 'https://volcano.si.edu/reports_weekly.cfm';
    const guid = block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i)?.[1]?.trim() || link;
    const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() || channelPubDate;
    const pointStr = block.match(/<georss:point>([\s\S]*?)<\/georss:point>/i)?.[1]?.trim() || '';
    const descRaw = block.match(/<description>([\s\S]*?)<\/description>/i)?.[1] || '';

    const title = decodeXmlEntities(titleRaw);
    const description = decodeXmlEntities(descRaw);
    if (!title) continue;

    // GVP Weekly RSS title format: "<Volcano> (<Country/Region>) - Report for <Dates> - <ActivityType>"
    const titleParts = title.split(' - ');
    const nameCountryMatch = titleParts[0]?.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    const volcanoName = nameCountryMatch ? nameCountryMatch[1].trim() : titleParts[0]?.trim() || title;
    const regionCountry = nameCountryMatch ? nameCountryMatch[2].trim() : '';
    const reportPeriod = titleParts[1]?.replace(/^Report for\s+/i, '').trim() || '';
    const activityCategory = titleParts.slice(2).join(' - ').trim() || 'Reported Activity';

    const ptParts = pointStr.split(/\s+/).map(Number);
    const lat = ptParts.length === 2 && Number.isFinite(ptParts[0]) ? ptParts[0] : null;
    const lng = ptParts.length === 2 && Number.isFinite(ptParts[1]) ? ptParts[1] : null;

    let detectedLevelCode = null;
    let detectedLevelLabel = null;
    const levelMatch = description.match(/Alert Level(?:\s+(?:to|at|remained at|was))?\s+(\d)/i);
    if (levelMatch) {
      const code = parseInt(levelMatch[1], 10);
      if (code >= 1 && code <= 4) {
        detectedLevelCode = code;
        const map = { 1: 'Level I (Normal)', 2: 'Level II (Waspada)', 3: 'Level III (Siaga)', 4: 'Level IV (Awas)' };
        detectedLevelLabel = map[code];
      }
    }

    let parsedPubIso = null;
    if (pubDate) {
      const t = Date.parse(pubDate);
      if (Number.isFinite(t)) parsedPubIso = new Date(t).toISOString();
    }

    records.push({
      id: guid.split('#vn_')[1] ? `gvp-${guid.split('#vn_')[1]}` : volcanoName.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      name: volcanoName,
      country: regionCountry,
      isIndonesia: /indonesia/i.test(regionCountry),
      reportPeriod,
      activityCategory,
      levelCode: detectedLevelCode,
      level: detectedLevelLabel,
      lat,
      lng,
      summary: description,
      link: guid || link,
      pubDate: parsedPubIso || pubDate,
      source: 'Smithsonian Institution / USGS GVP Weekly Volcanic Activity Report',
    });
  }

  return { feedPublishedAt: channelPubDate ? (Number.isFinite(Date.parse(channelPubDate)) ? new Date(Date.parse(channelPubDate)).toISOString() : channelPubDate) : null, records };
}

export const getLiveVolcanoUpdates = async (req, res) => {
  const forceRefresh = req.query.force === 'true' || req.query.fresh === 'true';
  const regionFilter = String(req.query.country || 'indonesia').toLowerCase();
  const nowMs = Date.now();

  if (!forceRefresh && liveVolcanoCache.payload && nowMs - liveVolcanoCache.timestamp < LIVE_VOLCANO_CACHE_TTL_MS) {
    const cachedRecords = regionFilter === 'all'
      ? liveVolcanoCache.payload.allRecords
      : liveVolcanoCache.payload.indonesiaRecords;
    return res.json({
      success: true,
      dataStatus: 'LIVE',
      cached: true,
      liveFeedSource: 'Smithsonian Institution / USGS GVP Weekly Volcanic Activity RSS',
      pvmbgStatus: 'UNAVAILABLE_NO_PUBLIC_JSON_API',
      pvmbgNote: 'Portal MAGMA ESDM menyajikan antarmuka web HTML tanpa endpoint JSON publik terbuka; laporan resmi PVMBG disinkronkan melalui buletin mingguan Smithsonian GVP/USGS.',
      feedPublishedAt: liveVolcanoCache.payload.feedPublishedAt,
      fetchedAt: liveVolcanoCache.payload.fetchedAt,
      count: cachedRecords.length,
      totalGlobalCount: liveVolcanoCache.payload.allRecords.length,
      sourceAttempts: liveVolcanoCache.payload.sourceAttempts,
      data: cachedRecords,
    });
  }

  const gvpUrl = 'https://volcano.si.edu/news/WeeklyVolcanoRSS.xml';
  try {
    const response = await fetch(gvpUrl, {
      headers: {
        'User-Agent': 'HarmonyGeospatialApp/2.0 (Educational)',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`HTTP_${response.status}`);
    }

    const xml = await response.text();
    if (!xml || (!xml.includes('<rss') && !xml.includes('<channel>'))) {
      throw new Error('INVALID_RSS_XML');
    }

    const parsed = parseGvpWeeklyRss(xml);
    if (!Array.isArray(parsed.records) || parsed.records.length === 0) {
      throw new Error('EMPTY_RSS_ITEMS');
    }

    const indonesiaRecords = parsed.records.filter((r) => r.isIndonesia);
    const fetchedAt = new Date().toISOString();
    const lastModHeader = response.headers.get('last-modified');
    const feedPublishedAt = parsed.feedPublishedAt
      || (lastModHeader && Number.isFinite(Date.parse(lastModHeader)) ? new Date(Date.parse(lastModHeader)).toISOString() : null);

    const payload = {
      feedPublishedAt,
      fetchedAt,
      allRecords: parsed.records,
      indonesiaRecords,
      sourceAttempts: [
        { source: 'Smithsonian GVP Weekly RSS', url: gvpUrl, status: 'OK', httpStatus: response.status, count: parsed.records.length, error: null },
        { source: 'PVMBG MAGMA ESDM JSON', url: 'https://magma.esdm.go.id/v1/gunung-api/laporan', status: 'UNAVAILABLE', httpStatus: null, count: 0, error: 'HTML portal only (no public JSON API)' },
      ],
    };

    liveVolcanoCache = { timestamp: Date.now(), payload };

    const outData = regionFilter === 'all' ? parsed.records : indonesiaRecords;
    return res.json({
      success: true,
      dataStatus: 'LIVE',
      cached: false,
      liveFeedSource: 'Smithsonian Institution / USGS GVP Weekly Volcanic Activity RSS',
      pvmbgStatus: 'UNAVAILABLE_NO_PUBLIC_JSON_API',
      pvmbgNote: 'Portal MAGMA ESDM menyajikan antarmuka web HTML tanpa endpoint JSON publik terbuka; laporan resmi PVMBG disinkronkan melalui buletin mingguan Smithsonian GVP/USGS.',
      feedPublishedAt,
      fetchedAt,
      count: outData.length,
      totalGlobalCount: parsed.records.length,
      sourceAttempts: payload.sourceAttempts,
      data: outData,
    });
  } catch (error) {
    return res.status(502).json({
      success: false,
      dataStatus: 'ERROR',
      liveFeedSource: 'Smithsonian Institution / USGS GVP Weekly Volcanic Activity RSS',
      pvmbgStatus: 'UNAVAILABLE_NO_PUBLIC_JSON_API',
      feedPublishedAt: null,
      fetchedAt: new Date().toISOString(),
      count: 0,
      data: [],
      sourceAttempts: [
        {
          source: 'Smithsonian GVP Weekly RSS',
          url: gvpUrl,
          status: 'ERROR',
          httpStatus: null,
          count: 0,
          error: error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 'TIMEOUT' : (error?.message || 'FETCH_FAILED'),
        },
      ],
      error: `Gagal mengambil laporan aktivitas gunung api live dari Smithsonian GVP/USGS (${error?.message || 'Fetch error'}).`,
    });
  }
};

export const getLiveEarthquakesList = async (req, res) => {
  const forceRefresh = req.query.force === 'true' || req.query.fresh === 'true';
  const nowMs = Date.now();

  if (!forceRefresh && liveEarthquakesCache.payload && nowMs - liveEarthquakesCache.timestamp < LIVE_EARTHQUAKES_CACHE_TTL_MS) {
    return res.json({
      ...liveEarthquakesCache.payload,
      cached: true,
    });
  }

  try {
    const { earthquakes, sourceAttempts } = await fetchLiveEarthquakesFromUpstreams();
    const okCount = sourceAttempts.filter((a) => a.status === 'OK').length;
    const fetchedAt = new Date().toISOString();

    if (okCount === 0) {
      return res.status(502).json({
        success: false,
        dataStatus: 'ERROR',
        count: 0,
        data: [],
        sourceAttempts,
        error: 'Seluruh sumber gempa live (BMKG InaTEWS & USGS) gagal merespons.',
        provenance: {
          source: 'InaTEWS BMKG & USGS Global Seismic Catalog',
          dataStatus: 'ERROR',
          refreshedAt: fetchedAt,
        },
      });
    }

    const dataStatus = okCount === sourceAttempts.length ? 'LIVE' : 'PARTIAL';
    const payload = {
      success: true,
      dataStatus,
      cached: false,
      count: earthquakes.length,
      sourceAttempts,
      data: earthquakes,
      provenance: {
        source: 'InaTEWS BMKG & USGS Global Seismic Catalog',
        dataStatus,
        refreshedAt: fetchedAt,
      },
    };

    liveEarthquakesCache = { timestamp: Date.now(), payload };
    return res.json(payload);
  } catch (error) {
    return res.status(502).json({
      success: false,
      dataStatus: 'ERROR',
      count: 0,
      data: [],
      error: error?.message || 'Gagal mengambil data gempa live.',
    });
  }
};

export function __resetSpatialControllerCachesForTest() {
  publicFirmsCache.clear();
  liveVolcanoCache = { timestamp: 0, payload: null };
  liveEarthquakesCache = { timestamp: 0, payload: null };
  gpsProbesBuffer.length = 0;
  weatherCache.clear();
  weatherInFlight.clear();
  weatherRateLimitUntil = 0;
  geocodeReverseCache.clear();
  geocodeSearchCache.clear();
  geocodeReverseInFlight.clear();
  geocodeSearchInFlight.clear();
  nominatimLastRequestAt = 0;
  nominatimRateLimitUntil = 0;
}



