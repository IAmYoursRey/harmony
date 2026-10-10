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
  getPublicHotspotsFeed,
  getHotspotsTimeline,
  getHotspotsSnapshotByIdEndpoint,
  saveHotspotSnapshotEndpoint,
  getIsochrones,
  getFacilityAccessibility,
  calculateTransportEmissions,
  getTrafficFlowProxy,
  getTrafficCctvList,
  getTrafficCctvHealth,
  triggerTrafficCctvRefresh,
  streamTrafficCctv,
  proxyCctvStream,
  getTrafficCctvThumbnail,
  getTrafficSignalsList,
  getLiveTrafficNetwork,
  submitGpsProbe,
  getGpsProbes,
  getSchoolRiskSynthesis,
  getVolcanoesList,
  getLiveVolcanoUpdates,
  getLiveEarthquakesList,
  handleDirectCctvStream,
} from "../controllers/spatialController.js";

const router = Router();

router.get("/overpass", getOverpassData);
router.get("/identify", identifyPoint);
router.post("/aoi/analyze", analyzeAOI);
router.post("/stac/search", searchSTACProxy);
router.get("/health", getSpatialHealth);
router.get("/weather/current", getCurrentWeatherProxy);

// Volcano & Earthquake Geological Endpoints
router.get("/volcanoes", getVolcanoesList);
router.get("/volcanoes/live", getLiveVolcanoUpdates);
router.get("/earthquakes/live", getLiveEarthquakesList);

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
router.get("/hotspots/public-feed", getPublicHotspotsFeed);
router.get("/hotspots/timeline", getHotspotsTimeline);
router.get("/hotspots/timeline/:id", getHotspotsSnapshotByIdEndpoint);
router.post("/hotspots/snapshot", saveHotspotSnapshotEndpoint);
router.get("/traffic/flow", getTrafficFlowProxy);
router.get("/traffic/cctv", getTrafficCctvList);
router.get("/traffic/cctv-health", getTrafficCctvHealth);
router.post("/traffic/cctv-refresh", triggerTrafficCctvRefresh);
router.get("/traffic/cctv-stream", streamTrafficCctv);
router.get("/traffic/cctv-proxy", proxyCctvStream);
router.all("/stream", handleDirectCctvStream);
router.get("/traffic/cctv-thumbnail", getTrafficCctvThumbnail);
router.get("/traffic/signals", getTrafficSignalsList);
router.get("/traffic/live-network", getLiveTrafficNetwork);
router.post("/traffic/gps-probe", submitGpsProbe);
router.get("/traffic/probes", getGpsProbes);
router.post("/network/isochrones", getIsochrones);
router.post("/network/accessibility", getFacilityAccessibility);
router.post("/transport/emissions", calculateTransportEmissions);

export default router;

