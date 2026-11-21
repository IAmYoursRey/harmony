import express from "express";
import {
  handleTelemetryData,
  handleTelemetryCommand,
  handleTelemetrySync,
  handleTelemetryWeather,
} from "../controllers/telemetryController.js";

const router = express.Router();

router.all("/data", handleTelemetryData);
router.all("/perintah", handleTelemetryCommand);
router.all("/sinkron", handleTelemetrySync);
router.all("/cuaca", handleTelemetryWeather);

export default router;

