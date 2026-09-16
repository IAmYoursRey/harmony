import { getSpatialCache, setSpatialCache } from "../repositories/repository.js";
import osmtogeojson from "osmtogeojson";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"
];

// Helper to wait
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const getOverpassData = async (req, res) => {
  const { bbox, layer } = req.query;

  if (!bbox || !layer) {
    return res.status(400).json({ error: "Missing bbox or layer parameter" });
  }

  // Generate a unique cache ID for this specific tile request
  const cacheId = `geojson_overpass_${layer}_${bbox}`;

  try {
    // 1. Check our database cache first
    const cachedData = await getSpatialCache(cacheId);
    if (cachedData) {
      return res.json(cachedData);
    }

    // 2. Not in cache, we must fetch from Overpass API
    let queryBody = "";
    if (layer === "Villages") {
      queryBody = `relation["boundary"="administrative"]["admin_level"~"7|8"](${bbox});`;
    } else if (layer === "Forest") {
      queryBody = `way["landuse"="forest"](${bbox});relation["landuse"="forest"](${bbox});way["natural"="wood"](${bbox});relation["natural"="wood"](${bbox});way["leisure"="nature_reserve"](${bbox});relation["leisure"="nature_reserve"](${bbox});way["boundary"="national_park"](${bbox});relation["boundary"="national_park"](${bbox});way["boundary"="protected_area"](${bbox});relation["boundary"="protected_area"](${bbox});`;
    } else if (layer === "Cities") {
      queryBody = `relation["boundary"="administrative"]["admin_level"~"4|5"](${bbox});`;
    } else {
      return res.status(400).json({ error: "Unknown layer" });
    }

    const query = `[out:json][timeout:25];(${queryBody});out body;>;out skel qt;`;

    let data = null;
    let lastError = null;

    // Try multiple endpoints if one fails (Rate limit handling)
    for (let i = 0; i < OVERPASS_ENDPOINTS.length; i++) {
      try {
        const response = await fetch(OVERPASS_ENDPOINTS[i], {
          method: "POST",
          body: "data=" + encodeURIComponent(query),
          headers: { 
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json, */*",
            "User-Agent": "Harmony-Spatial-Cache/1.0"
          },
        });

        if (response.status === 429) {
          // Too many requests, try next endpoint
          console.warn(`Overpass 429 at ${OVERPASS_ENDPOINTS[i]}, trying next...`);
          await delay(1000); // Wait 1 sec before trying next
          continue; 
        }

        if (!response.ok) {
          throw new Error(`HTTP Error ${response.status}`);
        }

        data = await response.json();
        
        // Convert to GeoJSON on the backend to avoid freezing the frontend UI!
        try {
          data = osmtogeojson(data);
        } catch (convertErr) {
          console.error("osmtogeojson failed:", convertErr);
          throw new Error("Failed to convert Overpass JSON to GeoJSON");
        }
        
        break; // Success, exit loop
      } catch (err) {
        lastError = err;
        console.warn(`Overpass fetch failed at ${OVERPASS_ENDPOINTS[i]}: ${err.message}`);
      }
    }

    if (!data) {
      // All endpoints failed
      throw new Error(lastError ? lastError.message : "All Overpass endpoints failed (Rate limited)");
    }

    // 3. Save to database cache
    await setSpatialCache(cacheId, data);

    // 4. Return to frontend
    return res.json(data);
  } catch (error) {
    console.error("Spatial Controller Error:", error);
    return res.status(500).json({ error: "Backend Error: " + error.message, details: error.stack });
  }
};
