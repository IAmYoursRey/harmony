import {
  getSpatialCache,
  setSpatialCache,
  pool,
  identifyNearPoint,
  querySpatialFeaturesInAOI,
  readDB,
} from "../repositories/repository.js";
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

/**
 * Area of Interest (AOI) Unified Analysis Engine
 * POST /api/spatial/aoi/analyze
 */
export const analyzeAOI = async (req, res) => {
  const { aoi, datasetId } = req.body;

  if (!aoi || (!aoi.coordinates && (!aoi.geometry || !aoi.geometry.coordinates))) {
    return res.status(400).json({ error: "Missing or invalid AOI geometry (must be GeoJSON Polygon/MultiPolygon)." });
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
      sourceType: "SATELLITE_RASTER",
      provider: "AWS Earth Search (Element84) / Copernicus Open Access",
      dataset: query.collections ? query.collections.join(", ") : "Sentinel-2 / Landsat",
      dataStatus: "LIVE",
      acquisitionTime: new Date().toISOString(),
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
const WEATHER_CACHE_TTL_MS = 120 * 1000; // 2 minutes server-side TTL

/**
 * Cached Weather Proxy for Harmony Maps
 * GET /api/spatial/weather/current?lat=...&lng=...
 */
export const getCurrentWeatherProxy = async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({ error: "Invalid latitude (-90..90) or longitude (-180..180)" });
  }

  const roundedLat = parseFloat(lat.toFixed(2));
  const roundedLng = parseFloat(lng.toFixed(2));
  const cacheKey = `${roundedLat},${roundedLng}`;
  const now = Date.now();

  const cached = weatherCache.get(cacheKey);
  if (cached && now - cached.timestamp < WEATHER_CACHE_TTL_MS) {
    return res.json({
      success: true,
      source: "server_cache",
      data: cached.data,
    });
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${roundedLat}&longitude=${roundedLng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m&timeformat=unixtime&timezone=auto`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const upstream = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!upstream.ok) {
      throw new Error(`Upstream weather service returned HTTP ${upstream.status}`);
    }

    const json = await upstream.json();
    const current = json.current;
    if (!current) {
      throw new Error("Missing current weather block from upstream");
    }

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
      temperature: typeof current.temperature_2m === "number" ? current.temperature_2m : 28.0,
      apparentTemp: typeof current.apparent_temperature === "number" ? current.apparent_temperature : 30.0,
      humidity: typeof current.relative_humidity_2m === "number" ? current.relative_humidity_2m : 70,
      pressure: typeof current.surface_pressure === "number" ? Math.round(current.surface_pressure) : 1013,
      windSpeedKmh: typeof current.wind_speed_10m === "number" ? current.wind_speed_10m : 10.0,
      windDirectionDeg: typeof current.wind_direction_10m === "number" ? current.wind_direction_10m : 180,
      precipitationMm: typeof current.precipitation === "number" ? current.precipitation : 0.0,
      weatherCode: typeof current.weather_code === "number" ? current.weather_code : 0,
      provider: "Open-Meteo",
      providerModel: "NWP Multi-Model Ensemble (ECMWF, GFS, ICON, JMA)",
      classification: "MODEL",
      dataTime: dataTimeUtc,
      observationTime: dataTimeUtc,
      lastCheckedAt: fetchedAt,
      fetchedAt,
      dataIntervalSeconds,
      dataStepMinutes: Math.round(dataIntervalSeconds / 60),
      providerTimezone,
    };

    weatherCache.set(cacheKey, { data: weatherData, timestamp: now });

    return res.json({
      success: true,
      source: "live_upstream",
      data: weatherData,
    });
  } catch (err) {
    if (cached) {
      return res.json({
        success: true,
        source: "stale_server_cache",
        data: cached.data,
      });
    }
    return res.status(502).json({ error: "Upstream weather error: " + err.message });
  }
};

