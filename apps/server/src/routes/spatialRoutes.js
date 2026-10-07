import { Router } from "express";
import {
  getOverpassData,
  identifyPoint,
  analyzeAOI,
  searchSTACProxy,
  getSpatialHealth,
  getCurrentWeatherProxy,
  createAnalysisJob,
  getAnalysisJob,
  deleteAnalysisJob,
  exportAnalysis,
  getHotspots,
  getIsochrones,
  getFacilityAccessibility,
  calculateTransportEmissions,
  getTrafficFlowProxy,
  getSchoolRiskSynthesis,
} from "../controllers/spatialController.js";

const router = Router();

router.get("/overpass", getOverpassData);
router.get("/identify", identifyPoint);
router.post("/aoi/analyze", analyzeAOI);
router.post("/stac/search", searchSTACProxy);
router.get("/health", getSpatialHealth);
router.get("/weather/current", getCurrentWeatherProxy);

// Spatial Risk Synthesis & Reasoning Engine (GMPE, Seismic Lead Time & Terrain Hazard)
router.get("/school-risk-synthesis", getSchoolRiskSynthesis);
router.post("/school-risk-synthesis", getSchoolRiskSynthesis);

// Advanced Geospatial Analysis Job & Pipeline Routes
router.post("/analysis/jobs", createAnalysisJob);
router.get("/analysis/jobs/:id", getAnalysisJob);
router.delete("/analysis/jobs/:id", deleteAnalysisJob);
router.get("/analysis/:id/export", exportAnalysis);

// Environmental, Mobility & Accessibility Endpoints
router.get("/hotspots", getHotspots);
router.get("/traffic/flow", getTrafficFlowProxy);
router.post("/network/isochrones", getIsochrones);
router.post("/network/accessibility", getFacilityAccessibility);
router.post("/transport/emissions", calculateTransportEmissions);

export default router;

