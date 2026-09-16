import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

let _mountainsCache = null;

function getMountains() {
  if (_mountainsCache) return _mountainsCache;

  const dataPath = path.resolve(__dirname, "../database/data/mountains.json");
  if (fs.existsSync(dataPath)) {
    try {
      _mountainsCache = JSON.parse(fs.readFileSync(dataPath, "utf8"));
      return _mountainsCache;
    } catch (e) {
      console.error("Error reading mountains.json:", e);
    }
  }
  return [];
}

router.get("/", (req, res) => {
  try {
    const mountains = getMountains();
    res.json({ success: true, mountains });
  } catch (error) {
    console.error("Error serving mountains:", error);
    res.status(500).json({ success: false, error: "Failed to load mountains data" });
  }
});

export default router;
