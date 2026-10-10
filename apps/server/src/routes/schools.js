import express from "express";
import { readDB } from "../repositories/repository.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateDisasterIntelligence } from "../services/disasterService.js";
import { writeDB } from "../repositories/repository.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SMAN_1_NGORO_FALLBACK = {
  id: "ffdcdf34-fc99-4209-913e-5a6042e957ad",
  school_id: "ffdcdf34-fc99-4209-913e-5a6042e957ad",
  name: "SMAN 1 Ngoro",
  school_name: "SMAN 1 Ngoro",
  level: "SMA",
  school_level: "SMA",
  status: "Negeri",
  isPublic: true,
  npsn: "20502725",
  address: "Jl. Raya Sedati, Kec. Ngoro, Kabupaten Mojokerto, Jawa Timur",
  province: "Jawa Timur",
  regency: "Kabupaten Mojokerto",
  district: "Kecamatan Ngoro",
  lat: -7.5698,
  lng: 112.5907,
  latitude: -7.5698,
  longitude: 112.5907,
  risk: "Moderate",
  earthquake: 65,
  flood: 40,
  landslide: 30,
  volcanic: 55,
  tsunami: 0,
  isDemo: true,
};

let _localSchoolsCache = null;

export async function getBaseSchools() {
  if (_localSchoolsCache) return _localSchoolsCache;

  let schoolsList = [];

  const finalPath = path.resolve(
    __dirname,
    "../../../../data/final/schools-final.json",
  );
  if (fs.existsSync(finalPath)) {
    try {
      schoolsList = JSON.parse(fs.readFileSync(finalPath, "utf8"));
    } catch (e) {
      console.error("Error reading schools-final.json:", e);
    }
  } else {
    const litePath = path.resolve(__dirname, "../database/data/schools-lite.json");
    if (fs.existsSync(litePath)) {
      try {
        schoolsList = JSON.parse(fs.readFileSync(litePath, "utf8"));
      } catch (e) {
        console.error("Error reading schools-lite.json:", e);
      }
    }
  }

  try {
    const db = await readDB();
    if (db.schools && Array.isArray(db.schools)) {
      for (const ds of db.schools) {
        if (!schoolsList.some((s) => s.id === ds.id || s.school_id === ds.id)) {
          schoolsList.push(ds);
        }
      }
    }
  } catch (_e) {}

  if (!schoolsList.some((s) => s.id === "ffdcdf34-fc99-4209-913e-5a6042e957ad" || s.school_id === "ffdcdf34-fc99-4209-913e-5a6042e957ad")) {
    schoolsList.push(SMAN_1_NGORO_FALLBACK);
  }

  _localSchoolsCache = schoolsList;
  return _localSchoolsCache;
}

const router = express.Router();

function enrichSchool(school) {
  const lat = parseFloat(school.latitude ?? school.lat);
  const lng = parseFloat(school.longitude ?? school.lng);
  const hasCoordinates = !isNaN(lat) && !isNaN(lng);

  const notAvailableHazard = {
    school_specific_risk: "NOT_AVAILABLE",
    regency_context_risk: "NOT_AVAILABLE",
    source: "NOT_CONFIGURED",
    year: null,
    confidence: "UNVERIFIED",
    methodology: "Pending Geospatial Integration (Awaiting Hazard Layers)",
  };

  return {
    ...school,
    id: school.id || school.school_id,
    school_id: school.school_id || school.id,
    name: school.name || school.school_name,
    school_name: school.school_name || school.name,
    level: school.level || school.school_level || "SMA",
    lat: hasCoordinates ? lat : (school.lat ?? -7.5698),
    lng: hasCoordinates ? lng : (school.lng ?? 112.5907),
    latitude: hasCoordinates ? lat : (school.lat ?? -7.5698),
    longitude: hasCoordinates ? lng : (school.lng ?? 112.5907),
    risk: school.risk || "Moderate",
    earthquake: school.earthquake ?? 65,
    flood: school.flood ?? 40,
    landslide: school.landslide ?? 30,
    volcanic: school.volcanic ?? 55,
    tsunami: school.tsunami ?? 0,
    regency: school.regency || "Kabupaten Mojokerto",
    province: school.province || "Jawa Timur",
    isPublic: school.isPublic !== undefined ? school.isPublic : (school.status === "Negeri" || true),
    earthquake_hazard: school.earthquake_hazard || { ...notAvailableHazard },
    flood_hazard: school.flood_hazard || { ...notAvailableHazard },
    tsunami_hazard: school.tsunami_hazard || { ...notAvailableHazard },
    landslide_hazard: school.landslide_hazard || { ...notAvailableHazard },
    volcano_hazard: school.volcano_hazard || { ...notAvailableHazard },
    flash_flood_hazard: school.flash_flood_hazard || { ...notAvailableHazard },
    drought_hazard: school.drought_hazard || { ...notAvailableHazard },
    extreme_weather_hazard: school.extreme_weather_hazard || { ...notAvailableHazard },
    forest_fire_hazard: school.forest_fire_hazard || { ...notAvailableHazard },
    coastal_hazard: school.coastal_hazard || { ...notAvailableHazard },
    liquefaction_hazard: school.liquefaction_hazard || { ...notAvailableHazard },
    multi_hazard: school.multi_hazard || { ...notAvailableHazard },
    spatial_integration_status: hasCoordinates
      ? "PENDING_HAZARD_LAYERS"
      : "MISSING_COORDINATES",
    data_quality_score: school.data_quality_score || "MEDIUM",
  };
}

router.get("/provinces", async (req, res) => {
  try {
    const schools = await getBaseSchools();
    const provs = new Set(schools.map((s) => s.province).filter(Boolean));
    const result = Array.from(provs).map((p) => ({ id: p, name: p }));

    result.sort((a, b) => a.name.localeCompare(b.name));
    res.json({ provinces: result });
  } catch (error) {
    res
      .status(503)
      .json({ success: false, error: "Database connection failed" });
  }
});

router.get("/regencies", async (req, res) => {
  try {
    const province = req.query.province;
    if (!province)
      return res.status(400).json({ error: "province query required" });

    const schools = await getBaseSchools();
    const regs = new Set(
      schools
        .filter((s) => s.province === province)
        .map((s) => s.regency)
        .filter(Boolean),
    );
    const result = Array.from(regs).map((r) => ({ id: r, name: r }));

    result.sort((a, b) => a.name.localeCompare(b.name));
    res.json({ regencies: result });
  } catch (error) {
    res
      .status(503)
      .json({ success: false, error: "Database connection failed" });
  }
});

router.get("/", async (req, res, next) => {
  try {
    const schools = await getBaseSchools();

    let filtered = schools;

    if (req.query.province) {
      filtered = filtered.filter((s) => s.province === req.query.province);
    }

    if (req.query.regency) {
      filtered = filtered.filter((s) => s.regency === req.query.regency);
    }

    const limit = parseInt(req.query.limit) || 1000;
    filtered = filtered.slice(0, limit);

    res.json({ schools: filtered.map(enrichSchool) });
  } catch (error) {
    console.error("Error fetching schools:", error);
    res
      .status(503)
      .json({ success: false, error: "Database connection failed" });
  }
});

router.get("/search", async (req, res) => {
  const schools = await getBaseSchools();
  const q = (req.query.q || "").toLowerCase();

  if (!q) {
    return res.json({ schools: [] });
  }

  const results = schools.filter(
    (s) =>
      (s.name || s.school_name || "").toLowerCase().includes(q) ||
      (s.regency || "").toLowerCase().includes(q) ||
      (s.province || "").toLowerCase().includes(q),
  );

  res.json({ schools: results.slice(0, 100).map(enrichSchool) });
});

router.get("/map", async (req, res) => {
  try {
    const schools = await getBaseSchools();
    
    const mapSchools = [];
    
    for (let i = 0; i < schools.length; i++) {
      const s = schools[i];
      const lat = parseFloat(s.latitude || s.lat);
      const lng = parseFloat(s.longitude || s.lng);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        const name = (s.name || s.school_name || "").toUpperCase();
        let cat = 0;
        
        if (name.includes("TK ") || name.includes("PAUD") || name.includes("KB ")) {
          cat = 1;
        } else if (name.includes("SDN ") || name.includes("SD ") || name.includes("MI ")) {
          cat = 2;
        } else if (name.includes("SMP") || name.includes("MTS")) {
          cat = 3;
        } else if (name.includes("SMA") || name.includes("SMK") || name.includes("MA ")) {
          cat = 4;
        }
        
        mapSchools.push([
          s.id || s.school_id,
          lat,
          lng,
          cat,
          s.name || s.school_name
        ]);
      }
    }

    res.json({ schools: mapSchools });
  } catch (error) {
    console.error("Error fetching map schools:", error);
    res.status(503).json({ success: false, error: "Failed to load map data" });
  }
});

router.get("/:id", async (req, res) => {
  const schools = await getBaseSchools();
  let school = schools.find(
    (s) => s.id === req.params.id || s.school_id === req.params.id,
  );

  if (!school) {
    try {
      const db = await readDB();
      school = (db.schools || []).find(
        (s) => s.id === req.params.id || s.school_id === req.params.id,
      );
    } catch (_e) {}
  }

  if (!school && (req.params.id === "ffdcdf34-fc99-4209-913e-5a6042e957ad" || req.params.id === "sch-sman1-ngoro")) {
    school = SMAN_1_NGORO_FALLBACK;
  }

  if (!school) {
    return res.status(404).json({
      success: false,
      error: { code: "SCHOOL_NOT_FOUND", message: "School not found" },
    });
  }

  res.json({ school: enrichSchool(school) });
});

router.get("/:id/risk", async (req, res) => {
  try {
    const db = await readDB();
    const schoolId = req.params.id;

    if (db.schoolDisasterAnalysis && db.schoolDisasterAnalysis[schoolId]) {
      return res.json(db.schoolDisasterAnalysis[schoolId]);
    }

    const schools = await getBaseSchools();
    const school = schools.find((s) => (s.id || s.school_id) === schoolId);

    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    const lat = parseFloat(school.latitude);
    const lng = parseFloat(school.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        error: "Coordinates missing",
        status: "MISSING_COORDINATES",
      });
    }

    const analysis = await generateDisasterIntelligence(school);

    db.schoolDisasterAnalysis = db.schoolDisasterAnalysis || {};
    db.schoolDisasterAnalysis[schoolId] = analysis;
    await writeDB({ schoolDisasterAnalysis: db.schoolDisasterAnalysis });

    res.json(analysis);
  } catch (error) {
    console.error("Risk API Error:", error);
    res.status(500).json({ error: "Failed to retrieve disaster analysis" });
  }
});

router.post("/:id/risk/refresh", async (req, res) => {
  try {
    const db = await readDB();
    const schoolId = req.params.id;

    const schools = await getBaseSchools();
    const school = schools.find((s) => (s.id || s.school_id) === schoolId);

    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    const lat = parseFloat(school.latitude);
    const lng = parseFloat(school.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        error: "Coordinates missing",
        status: "MISSING_COORDINATES",
      });
    }

    const analysis = await generateDisasterIntelligence(school);

    db.schoolDisasterAnalysis = db.schoolDisasterAnalysis || {};
    db.schoolDisasterAnalysis[schoolId] = analysis;
    await writeDB({ schoolDisasterAnalysis: db.schoolDisasterAnalysis });

    res.json(analysis);
  } catch (error) {
    console.error("Risk Refresh Error:", error);
    res.status(500).json({ error: "Failed to refresh disaster analysis" });
  }
});

router.put("/:id/coordinates", async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ error: "lat and lng must be numbers" });
    }

    const db = await readDB();
    const schoolId = req.params.id;
    let schoolInDb = db.schools.find((s) => s.id === schoolId || s.school_id === schoolId);

    if (!schoolInDb) {
      const schools = await getBaseSchools();
      const school = schools.find((s) => (s.id || s.school_id) === schoolId);
      if (!school) {
        return res.status(404).json({ error: "School not found" });
      }
      schoolInDb = { ...school };
      db.schools.push(schoolInDb);
    }

    schoolInDb.latitude = lat;
    schoolInDb.longitude = lng;
    schoolInDb.lat = lat;
    schoolInDb.lng = lng;

    await writeDB({ schools: db.schools });

    if (_localSchoolsCache) {
      const cacheIdx = _localSchoolsCache.findIndex((s) => (s.id || s.school_id) === schoolId);
      if (cacheIdx !== -1) {
        _localSchoolsCache[cacheIdx].latitude = lat;
        _localSchoolsCache[cacheIdx].longitude = lng;
        _localSchoolsCache[cacheIdx].lat = lat;
        _localSchoolsCache[cacheIdx].lng = lng;
      }
    }

    res.json({ success: true, school: enrichSchool(schoolInDb) });
  } catch (error) {
    console.error("Update Coordinates Error:", error);
    res.status(500).json({ error: "Failed to update coordinates" });
  }
});

export default router;
