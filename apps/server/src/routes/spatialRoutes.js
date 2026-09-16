import { Router } from "express";
import { getOverpassData } from "../controllers/spatialController.js";

const router = Router();

router.get("/overpass", getOverpassData);

export default router;
