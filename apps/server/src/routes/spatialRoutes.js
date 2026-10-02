import { Router } from "express";
import {
  getOverpassData,
  identifyPoint,
  analyzeAOI,
  searchSTACProxy,
  getSpatialHealth,
  getCurrentWeatherProxy,
} from "../controllers/spatialController.js";

const router = Router();

router.get("/overpass", getOverpassData);
router.get("/identify", identifyPoint);
router.post("/aoi/analyze", analyzeAOI);
router.post("/stac/search", searchSTACProxy);
router.get("/health", getSpatialHealth);
router.get("/weather/current", getCurrentWeatherProxy);

export default router;
