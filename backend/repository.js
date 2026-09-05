import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'database.json');

const DEFAULT_DB = {
  accounts: [],
  profiles: [],
  digitalTwins: {},
  surveys: [],
  // Digital Twin Grid Game (added Phase C)
  gridMaps: {},      // keyed by mapId
  simulations: {},   // keyed by simulationId
  dtRooms: {},       // keyed by roomId
  dtResults: [],     // array of SimulationResult
};

// Helper to safely read db
export function readDB() {
  try {
    if (!fs.existsSync(dbPath)) {
      return DEFAULT_DB;
    }
    const data = fs.readFileSync(dbPath, 'utf-8');
    const parsed = JSON.parse(data);
    return { ...DEFAULT_DB, ...parsed };
  } catch (err) {
    console.error('Failed to read database:', err);
    return DEFAULT_DB;
  }
}

// Helper to safely write db
export function writeDB(db) {
  try {
    // Ensure all base structures exist
    const fullDb = { ...DEFAULT_DB, ...db };
    fs.writeFileSync(dbPath, JSON.stringify(fullDb, null, 2));
    return true;
  } catch (err) {
    console.error('Failed to write database:', err);
    return false;
  }
}
