import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import dotenv from "dotenv";
import { put } from "@vercel/blob";

dotenv.config({ path: [".env.local", ".env"] });
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isVercel =
  process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
const sourceDbPath = path.join(__dirname, "database.json");

const DEFAULT_DB = {
  accounts: [],
  profiles: [],
  digitalTwins: {},
  surveys: [],
  gridMaps: {},
  simulations: {},
  dtRooms: {},
  dtResults: [],
  schools: [],
  classes: [],
  schoolDisasterAnalysis: {},
};

let inMemoryCache = null;

import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

export const pool = dbUrl
  ? new pg.Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 5000,
      queryTimeout: 15000,
      allowExitOnIdle: true,
    })
  : null;

export const timeoutQuery = (queryPromise, ms = 15000) => {
  return Promise.race([
    queryPromise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`[CRITICAL] PostgreSQL timeout after ${ms}ms`)),
        ms,
      ),
    ),
  ]);
};

let pgInitialized = false;
async function initPg() {
  if (!pool || pgInitialized) return;
  try {
    await timeoutQuery(
      pool.query(`
      CREATE TABLE IF NOT EXISTS accounts ( id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL );
      CREATE TABLE IF NOT EXISTS profiles ( user_id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL );
      CREATE TABLE IF NOT EXISTS schools ( id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL );
      CREATE TABLE IF NOT EXISTS classes ( id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL );
      CREATE TABLE IF NOT EXISTS digital_twins ( school_id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL );
      CREATE TABLE IF NOT EXISTS grid_maps ( id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL );
      CREATE TABLE IF NOT EXISTS simulations ( id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL );
      CREATE TABLE IF NOT EXISTS dt_rooms ( id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL );
      CREATE TABLE IF NOT EXISTS dt_results ( id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL );
      CREATE TABLE IF NOT EXISTS surveys ( id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL );
      CREATE TABLE IF NOT EXISTS school_disaster_analysis ( school_id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL );
      
      -- Phase 1 Digital Twin Relational Tables
      CREATE TABLE IF NOT EXISTS digital_twin_maps (
        id VARCHAR(255) PRIMARY KEY,
        school_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        width INTEGER NOT NULL DEFAULT 64,
        height INTEGER NOT NULL DEFAULT 64,
        active_floor_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'draft',
        version INTEGER DEFAULT 1,
        border JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_dt_maps_school ON digital_twin_maps(school_id);

      CREATE TABLE IF NOT EXISTS digital_twin_floors (
        id VARCHAR(255) PRIMARY KEY,
        map_id VARCHAR(255) NOT NULL,
        floor_number INTEGER NOT NULL,
        name VARCHAR(255),
        width INTEGER,
        height INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_floor_map FOREIGN KEY (map_id) REFERENCES digital_twin_maps(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_dt_floors_map ON digital_twin_floors(map_id);

      CREATE TABLE IF NOT EXISTS digital_twin_tiles (
        id VARCHAR(255) PRIMARY KEY,
        floor_id VARCHAR(255) NOT NULL,
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        tile_type VARCHAR(100) NOT NULL,
        rotation INTEGER DEFAULT 0,
        variant INTEGER DEFAULT 0,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_tile_floor FOREIGN KEY (floor_id) REFERENCES digital_twin_floors(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_dt_tiles_floor ON digital_twin_tiles(floor_id);

      -- Safe migration for existing tiles table
      DO $$
      BEGIN
        BEGIN
          ALTER TABLE digital_twin_tiles ADD COLUMN variant INTEGER DEFAULT 0;
        EXCEPTION
          WHEN duplicate_column THEN RAISE NOTICE 'column variant already exists in digital_twin_tiles.';
        END;
      END $$;

      CREATE TABLE IF NOT EXISTS digital_twin_objects (
        id VARCHAR(255) PRIMARY KEY,
        floor_id VARCHAR(255) NOT NULL,
        object_type VARCHAR(100) NOT NULL,
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        width INTEGER DEFAULT 1,
        height INTEGER DEFAULT 1,
        rotation INTEGER DEFAULT 0,
        properties JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_object_floor FOREIGN KEY (floor_id) REFERENCES digital_twin_floors(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_dt_objects_floor ON digital_twin_objects(floor_id);

      CREATE TABLE IF NOT EXISTS digital_twin_boundaries (
        id VARCHAR(255) PRIMARY KEY,
        map_id VARCHAR(255) NOT NULL,
        floor_id VARCHAR(255) NOT NULL,
        geometry JSONB NOT NULL,
        closed BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_boundary_map FOREIGN KEY (map_id) REFERENCES digital_twin_maps(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS digital_twin_stairs (
        id VARCHAR(255) PRIMARY KEY,
        map_id VARCHAR(255) NOT NULL,
        from_floor_id VARCHAR(255) NOT NULL,
        to_floor_id VARCHAR(255),
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        direction VARCHAR(10) DEFAULT 'N',
        type VARCHAR(50) DEFAULT 'UP',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_stair_map FOREIGN KEY (map_id) REFERENCES digital_twin_maps(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS digital_twin_rooms (
        id VARCHAR(255) PRIMARY KEY,
        map_id VARCHAR(255) NOT NULL,
        floor_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        capacity INTEGER,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_room_map FOREIGN KEY (map_id) REFERENCES digital_twin_maps(id) ON DELETE CASCADE,
        CONSTRAINT fk_room_floor FOREIGN KEY (floor_id) REFERENCES digital_twin_floors(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_dt_rooms_floor ON digital_twin_rooms(floor_id);

      CREATE TABLE IF NOT EXISTS digital_twin_scenarios (
        id VARCHAR(255) PRIMARY KEY,
        map_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        disaster_type VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'draft',
        version INTEGER DEFAULT 1,
        config JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_scenario_map FOREIGN KEY (map_id) REFERENCES digital_twin_maps(id) ON DELETE CASCADE
      );
      
      CREATE TABLE IF NOT EXISTS digital_twin_scenario_objects (
        id VARCHAR(255) PRIMARY KEY,
        scenario_id VARCHAR(255) NOT NULL,
        floor_id VARCHAR(255) NOT NULL,
        object_type VARCHAR(100) NOT NULL,
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        width INTEGER DEFAULT 1,
        height INTEGER DEFAULT 1,
        rotation INTEGER DEFAULT 0,
        properties JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_scenario_obj_scenario FOREIGN KEY (scenario_id) REFERENCES digital_twin_scenarios(id) ON DELETE CASCADE,
        CONSTRAINT fk_scenario_obj_floor FOREIGN KEY (floor_id) REFERENCES digital_twin_floors(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_dt_scen_objs_scenario ON digital_twin_scenario_objects(scenario_id);

      -- Phase 4: Simulation Sessions (Kahoot-style)
      CREATE TABLE IF NOT EXISTS simulation_sessions (
        id VARCHAR(255) PRIMARY KEY,
        code VARCHAR(20) UNIQUE NOT NULL,
        school_id VARCHAR(255) NOT NULL,
        class_id VARCHAR(255) NOT NULL,
        map_id VARCHAR(255) NOT NULL,
        scenario_id VARCHAR(255) NOT NULL,
        created_by VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'LOBBY',
        settings JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP,
        ended_at TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_sim_sessions_code ON simulation_sessions(code);

      CREATE TABLE IF NOT EXISTS simulation_participants (
        id VARCHAR(255) PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL,
        student_id VARCHAR(255) NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'WAITING',
        ready_state BOOLEAN DEFAULT false,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_participant_session FOREIGN KEY (session_id) REFERENCES simulation_sessions(id) ON DELETE CASCADE,
        UNIQUE(session_id, student_id)
      );
      CREATE INDEX IF NOT EXISTS idx_sim_participants_session ON simulation_participants(session_id);
    `),
    );
    pgInitialized = true;
  } catch (err) {
    console.error("Failed to initialize PostgreSQL tables:", err);
    throw err;
  }
}

async function uploadBase64(base64Str, filename) {
  if (
    !base64Str ||
    !base64Str.startsWith("data:image") ||
    !process.env.BLOB_READ_WRITE_TOKEN
  )
    return base64Str;
  try {
    const match = base64Str.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    if (!match) return base64Str;
    const extension = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, "base64");

    const { url } = await put(filename + "." + extension, buffer, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return url;
  } catch (e) {
    console.error(`Failed to upload ${filename}:`, e.message);
    return base64Str;
  }
}

export async function readDB() {
  if (pool) {
    try {
      await initPg();
      const db = { ...DEFAULT_DB };

      const accountsRes = await timeoutQuery(
        pool.query("SELECT data FROM accounts"),
      );
      const profilesRes = await timeoutQuery(
        pool.query("SELECT data FROM profiles"),
      );
      const schoolsRes = await timeoutQuery(
        pool.query("SELECT data FROM schools"),
      );
      const classesRes = await timeoutQuery(
        pool.query("SELECT data FROM classes"),
      );
      const twinsRes = await timeoutQuery(
        pool.query("SELECT data, school_id FROM digital_twins"),
      );
      const gridsRes = await timeoutQuery(
        pool.query("SELECT data, id FROM grid_maps"),
      );
      const simsRes = await timeoutQuery(
        pool.query("SELECT data, id FROM simulations"),
      );
      const roomsRes = await timeoutQuery(
        pool.query("SELECT data, id FROM dt_rooms"),
      );
      const resultsRes = await timeoutQuery(
        pool.query("SELECT data FROM dt_results"),
      );
      const surveysRes = await timeoutQuery(
        pool.query("SELECT data FROM surveys"),
      );
      const analysisRes = await timeoutQuery(
        pool.query("SELECT data, school_id FROM school_disaster_analysis"),
      );

      db.accounts = accountsRes.rows.map((r) => r.data);
      db.profiles = profilesRes.rows.map((r) => r.data);
      db.schools = schoolsRes.rows.map((r) => r.data);
      db.classes = classesRes.rows.map((r) => r.data);
      db.dtResults = resultsRes.rows.map((r) => r.data);
      db.surveys = surveysRes.rows.map((r) => r.data);

      twinsRes.rows.forEach((r) => (db.digitalTwins[r.school_id] = r.data));
      gridsRes.rows.forEach((r) => (db.gridMaps[r.id] = r.data));
      simsRes.rows.forEach((r) => (db.simulations[r.id] = r.data));
      roomsRes.rows.forEach((r) => (db.dtRooms[r.id] = r.data));
      analysisRes.rows.forEach(
        (r) => (db.schoolDisasterAnalysis[r.school_id] = r.data),
      );

      return db;
    } catch (e) {
      console.error("Vercel DB Read Error (falling back to memory/local):", e);
      if (isVercel) throw new Error("Database connection failed in production");
    }
  } else if (isVercel) {
    throw new Error(
      "CRITICAL: DATABASE_URL is missing. database.json fallback is disabled in production.",
    );
  }

  if (inMemoryCache) return inMemoryCache;

  if (fs.existsSync(sourceDbPath)) {
    try {
      return {
        ...DEFAULT_DB,
        ...JSON.parse(fs.readFileSync(sourceDbPath, "utf-8")),
      };
    } catch (e) {
      return DEFAULT_DB;
    }
  }
  return DEFAULT_DB;
}

export async function writeDB(db) {
  const fullDb = { ...DEFAULT_DB, ...db };
  inMemoryCache = fullDb;

  if (pool) {
    try {
      await initPg();

      if (fullDb.digitalTwins) {
        for (const [key, value] of Object.entries(fullDb.digitalTwins)) {
          if (value.mapImage && value.mapImage.startsWith("data:image")) {
            value.mapImage = await uploadBase64(
              value.mapImage,
              `digitaltwins/${key}_${Date.now()}`,
            );
          }
        }
      }
      if (fullDb.gridMaps) {
        for (const [key, value] of Object.entries(fullDb.gridMaps)) {
          if (
            value.floorplanImage &&
            value.floorplanImage.startsWith("data:image")
          ) {
            value.floorplanImage = await uploadBase64(
              value.floorplanImage,
              `gridmaps/${key}_${Date.now()}`,
            );
          }
        }
      }

      const queries = [];

      const insertArray = (tableName, array, idField = "id") => {
        if (!array || !array.length) return;
        for (const item of array) {
          queries.push(
            pool.query(
              `INSERT INTO ${tableName} (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
              [item[idField], JSON.stringify(item)],
            ),
          );
        }
      };

      const insertProfileArray = (array) => {
        if (!array || !array.length) return;
        for (const item of array) {
          queries.push(
            pool.query(
              `INSERT INTO profiles (user_id, data) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data`,
              [item.userId, JSON.stringify(item)],
            ),
          );
        }
      };

      const insertObject = (tableName, obj) => {
        if (!obj) return;
        for (const [key, value] of Object.entries(obj)) {
          queries.push(
            pool.query(
              `INSERT INTO ${tableName} (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
              [key, JSON.stringify(value)],
            ),
          );
        }
      };

      const insertTwins = (obj) => {
        if (!obj) return;
        for (const [key, value] of Object.entries(obj)) {
          queries.push(
            pool.query(
              `INSERT INTO digital_twins (school_id, data) VALUES ($1, $2) ON CONFLICT (school_id) DO UPDATE SET data = EXCLUDED.data`,
              [key, JSON.stringify(value)],
            ),
          );
        }
      };

      const insertAnalysis = (obj) => {
        if (!obj) return;
        for (const [key, value] of Object.entries(obj)) {
          queries.push(
            pool.query(
              `INSERT INTO school_disaster_analysis (school_id, data) VALUES ($1, $2) ON CONFLICT (school_id) DO UPDATE SET data = EXCLUDED.data`,
              [key, JSON.stringify(value)],
            ),
          );
        }
      };

      insertArray("accounts", fullDb.accounts);
      insertProfileArray(fullDb.profiles);
      insertArray("schools", fullDb.schools);
      insertArray("classes", fullDb.classes);
      insertArray("dt_results", fullDb.dtResults);
      insertArray("surveys", fullDb.surveys);

      insertTwins(fullDb.digitalTwins);
      insertObject("grid_maps", fullDb.gridMaps);
      insertObject("simulations", fullDb.simulations);
      insertObject("dt_rooms", fullDb.dtRooms);
      insertAnalysis(fullDb.schoolDisasterAnalysis);

      await Promise.all(queries);
      return true;
    } catch (e) {
      console.error("Vercel DB Write Error (falling back to memory/local):", e);
      if (isVercel) throw new Error("Database write failed in production");
    }
  } else if (isVercel) {
    throw new Error(
      "CRITICAL: DATABASE_URL is missing. database.json fallback is disabled in production.",
    );
  }

  try {
    fs.writeFileSync(sourceDbPath, JSON.stringify(fullDb, null, 2));
    return true;
  } catch (err) {
    console.error("Failed to write local database:", err);
    return false;
  }
}
