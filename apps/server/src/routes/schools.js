import express from "express";
import { readDB } from "../repositories/repository.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateDisasterIntelligence } from "../services/disasterService.js";
import { writeDB } from "../repositories/repository.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let _localSchoolsCache = null;

export async function getBaseSchools() {
  if (_localSchoolsCache) return _localSchoolsCache;

  const finalPath = path.resolve(
    __dirname,
    "../../data/final/schools-final.json",
  );
  if (fs.existsSync(finalPath)) {
    try {
      console.log("Loading 215k final dataset into memory...");
      _localSchoolsCache = JSON.parse(fs.readFileSync(finalPath, "utf8"));
      return _localSchoolsCache;
    } catch (e) {
      console.error("Error reading schools-final.json:", e);
    }
  }

  const litePath = path.resolve(__dirname, "../data/schools-lite.json");
  if (fs.existsSync(litePath)) {
    try {
      console.log("Loading 215k LITE dataset into memory...");
      _localSchoolsCache = JSON.parse(fs.readFileSync(litePath, "utf8"));
      return _localSchoolsCache;
    } catch (e) {
      console.error("Error reading schools-lite.json:", e);
    }
  }

  const db = await readDB();
  _localSchoolsCache = db.schools || [];
  return _localSchoolsCache;
}

const router = express.Router();

function enrichSchool(school) {
  const lat = parseFloat(school.latitude);
  const lng = parseFloat(school.longitude);
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
    name: school.name || school.school_name,
    earthquake_hazard: { ...notAvailableHazard },
    flood_hazard: { ...notAvailableHazard },
    tsunami_hazard: { ...notAvailableHazard },
    landslide_hazard: { ...notAvailableHazard },
    volcano_hazard: { ...notAvailableHazard },
    flash_flood_hazard: { ...notAvailableHazard },
    drought_hazard: { ...notAvailableHazard },
    extreme_weather_hazard: { ...notAvailableHazard },
    forest_fire_hazard: { ...notAvailableHazard },
    coastal_hazard: { ...notAvailableHazard },
    liquefaction_hazard: { ...notAvailableHazard },
    multi_hazard: { ...notAvailableHazard },
    spatial_integration_status: hasCoordinates
      ? "PENDING_HAZARD_LAYERS"
      : "MISSING_COORDINATES",
    data_quality_score: "LOW",
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

router.get("/:id", async (req, res) => {
  const schools = await getBaseSchools();
  const school = schools.find(
    (s) => s.id === req.params.id || s.school_id === req.params.id,
  );

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

export default router;
