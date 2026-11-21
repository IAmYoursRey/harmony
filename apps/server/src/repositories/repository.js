import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import dotenv from "dotenv";
import { put } from "@vercel/blob";

dotenv.config({ path: [".env.local", ".env"] });
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProductionRuntime = () =>
  process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
const sourceDbPath = path.join(__dirname, "..", "database", "data", "database.json");

function createEmptyDb() {
  return {
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
    quizHistories: [],
    spatialCache: {},
    events: [],
    weatherIntervals: [],
    spatialJobs: {},
  };
}

let inMemoryCache = null;

import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

export const pool = dbUrl
  ? new pg.Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 15000,
      connectionTimeoutMillis: 15000,
      queryTimeout: 25000,
      allowExitOnIdle: true,
    })
  : null;

let activePool = pool;
const PG_DEGRADED_COOLDOWN_MS = 5 * 60 * 1000;
let pgDegradedUntil = 0;
let pgDegradedCode = null;
let pgDegradedReason = null;
let pgDegradedLoggedAt = 0;

export function isPgQuotaOrUnavailableError(err) {
  if (!err) return false;
  const code = String(err.code || err.errno || "").toUpperCase();
  if (/^(53\d{3}|08\d{3}|57P0[1-3])$/.test(code)) return true;
  if (["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "EHOSTUNREACH", "ECONNRESET", "ENETUNREACH"].includes(code)) {
    return true;
  }
  const msg = String(err.message || err);
  return /exceeded the quota|quota exceeded|compute time|too many connections|PostgreSQL timeout|Connection terminated|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(
    msg,
  );
}

export function isPgDegraded() {
  if (pgDegradedUntil > 0 && Date.now() >= pgDegradedUntil) {
    pgDegradedUntil = 0;
    pgDegradedCode = null;
    pgDegradedReason = null;
  }
  return Date.now() < pgDegradedUntil;
}

export function getPgHealthStatus() {
  const degraded = isPgDegraded();
  return {
    configured: Boolean(activePool),
    degraded,
    code: degraded ? pgDegradedCode : null,
    reason: degraded ? pgDegradedReason : null,
    retryAfterMs: degraded ? Math.max(0, pgDegradedUntil - Date.now()) : 0,
  };
}

function markPgDegraded(err) {
  const now = Date.now();
  const code = String(err?.code || err?.errno || "PG_UNAVAILABLE");
  const reason = err?.message || "PostgreSQL unavailable";
  pgDegradedUntil = now + PG_DEGRADED_COOLDOWN_MS;
  pgDegradedCode = code;
  pgDegradedReason = reason;
  if (now - pgDegradedLoggedAt > 30000) {
    pgDegradedLoggedAt = now;
    console.warn(
      `[DB CIRCUIT BREAKER] PostgreSQL unavailable (${code}: ${reason}). Activating 5m fallback mode.`,
    );
  }
}

export function loadLocalFallbackDB() {
  if (inMemoryCache) return inMemoryCache;
  if (fs.existsSync(sourceDbPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(sourceDbPath, "utf-8"));
      inMemoryCache = { ...createEmptyDb(), ...parsed };
      return inMemoryCache;
    } catch (e) {
      console.warn("[DB] Failed to parse bundled database.json fallback:", e?.message || e);
    }
  }
  inMemoryCache = createEmptyDb();
  return inMemoryCache;
}

export const timeoutQuery = (queryPromise, ms = 25000) => {
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
let pgInitPromise = null;

export function __setPgPoolForTest(mockPool) {
  activePool = mockPool ?? pool;
}

export function __resetPgStateForTest({ keepPool = false } = {}) {
  if (!keepPool) activePool = pool;
  pgInitialized = false;
  pgInitPromise = null;
  pgDegradedUntil = 0;
  pgDegradedCode = null;
  pgDegradedReason = null;
  pgDegradedLoggedAt = 0;
  inMemoryCache = null;
  memoryJobCache.clear();
}

async function initPg() {
  if (!activePool || pgInitialized || isPgDegraded()) return;
  if (pgInitPromise) return pgInitPromise;
  pgInitPromise = (async () => {
    try {
    await timeoutQuery(
      activePool.query(`
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
      CREATE TABLE IF NOT EXISTS quiz_histories ( id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL );
      CREATE TABLE IF NOT EXISTS spatial_cache ( id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP );
      CREATE TABLE IF NOT EXISTS events ( id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL );
      CREATE TABLE IF NOT EXISTS weather_training_intervals ( id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP );
      CREATE TABLE IF NOT EXISTS spatial_jobs ( id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP );
      
      -- Safe migration for digital_twin_maps public sharing
      DO $$
      BEGIN
        BEGIN
          ALTER TABLE digital_twin_maps ADD COLUMN is_public BOOLEAN DEFAULT false;
        EXCEPTION
          WHEN duplicate_column THEN RAISE NOTICE 'column is_public already exists in digital_twin_maps.';
          WHEN undefined_table THEN NULL;
        END;
        BEGIN
          ALTER TABLE digital_twin_maps ADD COLUMN author_name VARCHAR(255);
        EXCEPTION
          WHEN duplicate_column THEN RAISE NOTICE 'column author_name already exists in digital_twin_maps.';
          WHEN undefined_table THEN NULL;
        END;
        BEGIN
          ALTER TABLE digital_twin_maps ADD COLUMN school_name VARCHAR(255);
        EXCEPTION
          WHEN duplicate_column THEN RAISE NOTICE 'column school_name already exists in digital_twin_maps.';
          WHEN undefined_table THEN NULL;
        END;
      END $$;
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

      ALTER TABLE simulation_participants ADD COLUMN IF NOT EXISTS avatar_style VARCHAR(20) DEFAULT 'girl';
      ALTER TABLE simulation_participants ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(20) DEFAULT '#3b82f6';
      ALTER TABLE simulation_participants ADD COLUMN IF NOT EXISTS live_state JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE simulation_participants ADD COLUMN IF NOT EXISTS finish_time_ms INTEGER;
      ALTER TABLE simulation_participants ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;
      ALTER TABLE simulation_participants ADD COLUMN IF NOT EXISTS grade VARCHAR(8);
      ALTER TABLE simulation_participants ADD COLUMN IF NOT EXISTS finished_at TIMESTAMP;
      ALTER TABLE simulation_participants ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

      -- PostGIS Geospatial Core Architecture
      DO $$
      BEGIN
        BEGIN
          CREATE EXTENSION IF NOT EXISTS postgis;
        EXCEPTION
          WHEN OTHERS THEN RAISE NOTICE 'PostGIS extension could not be enabled: %', SQLERRM;
        END;
      END $$;

      CREATE TABLE IF NOT EXISTS spatial_datasets (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        crs VARCHAR(50) DEFAULT 'EPSG:4326',
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS spatial_features (
        id VARCHAR(255) PRIMARY KEY,
        dataset_id VARCHAR(255) REFERENCES spatial_datasets(id) ON DELETE CASCADE,
        properties JSONB NOT NULL DEFAULT '{}'::jsonb,
        geom geometry(Geometry, 4326),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_spatial_features_geom ON spatial_features USING GIST (geom);
      CREATE INDEX IF NOT EXISTS idx_spatial_features_dataset ON spatial_features(dataset_id);

      CREATE TABLE IF NOT EXISTS sensor_stations (
        id VARCHAR(255) PRIMARY KEY,
        code VARCHAR(100),
        name VARCHAR(255) NOT NULL,
        family VARCHAR(100) NOT NULL,
        platform VARCHAR(100),
        provider VARCHAR(255),
        geom geometry(Point, 4326) NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_sensor_stations_geom ON sensor_stations USING GIST (geom);

      CREATE TABLE IF NOT EXISTS sensor_observations (
        id VARCHAR(255) PRIMARY KEY,
        station_id VARCHAR(255) REFERENCES sensor_stations(id) ON DELETE CASCADE,
        parameter VARCHAR(100) NOT NULL,
        value NUMERIC,
        unit VARCHAR(50),
        quality VARCHAR(50) DEFAULT 'VALID',
        uncertainty NUMERIC,
        observed_at TIMESTAMP NOT NULL,
        geom geometry(Point, 4326),
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_sensor_observations_geom ON sensor_observations USING GIST (geom);
      CREATE INDEX IF NOT EXISTS idx_sensor_observations_station ON sensor_observations(station_id);
      CREATE INDEX IF NOT EXISTS idx_sensor_observations_time ON sensor_observations(observed_at);

      CREATE TABLE IF NOT EXISTS hazard_zones (
        id VARCHAR(255) PRIMARY KEY,
        hazard_type VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        risk_level VARCHAR(50) NOT NULL,
        source_agency VARCHAR(100),
        geom geometry(MultiPolygon, 4326) NOT NULL,
        properties JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_hazard_zones_geom ON hazard_zones USING GIST (geom);

      CREATE TABLE IF NOT EXISTS field_surveys (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255),
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        geom geometry(Geometry, 4326) NOT NULL,
        properties JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_field_surveys_geom ON field_surveys USING GIST (geom);

      CREATE TABLE IF NOT EXISTS spatial_jobs (
        id VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_spatial_jobs_created ON spatial_jobs(created_at);
    `),
    );
    pgInitialized = true;
    } catch (err) {
      if (isPgQuotaOrUnavailableError(err)) {
        markPgDegraded(err);
      } else {
        console.error("Failed to initialize PostgreSQL tables:", err);
      }
      throw err;
    } finally {
      pgInitPromise = null;
    }
  })();
  return pgInitPromise;
}

export async function uploadBase64(base64Str, filename) {
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
  if (activePool && !isPgDegraded()) {
    try {
      await initPg();
      const db = createEmptyDb();

      const accountsRes = await timeoutQuery(
        activePool.query("SELECT data FROM accounts"),
      );
      const profilesRes = await timeoutQuery(
        activePool.query("SELECT data FROM profiles"),
      );
      const schoolsRes = await timeoutQuery(
        activePool.query("SELECT data FROM schools"),
      );
      const classesRes = await timeoutQuery(
        activePool.query("SELECT data FROM classes"),
      );
      const twinsRes = await timeoutQuery(
        activePool.query("SELECT data, school_id FROM digital_twins"),
      );
      const gridsRes = await timeoutQuery(
        activePool.query("SELECT data, id FROM grid_maps"),
      );
      const simsRes = await timeoutQuery(
        activePool.query("SELECT data, id FROM simulations"),
      );
      const roomsRes = await timeoutQuery(
        activePool.query("SELECT data, id FROM dt_rooms"),
      );
      const resultsRes = await timeoutQuery(
        activePool.query("SELECT data FROM dt_results"),
      );
      const surveysRes = await timeoutQuery(
        activePool.query("SELECT data FROM surveys"),
      );
      const analysisRes = await timeoutQuery(
        activePool.query("SELECT data, school_id FROM school_disaster_analysis"),
      );
      const spatialRes = await timeoutQuery(
        activePool.query("SELECT id, data FROM spatial_cache"),
      );

      try {
        const eventsRes = await timeoutQuery(activePool.query("SELECT data FROM events"));
        db.events = eventsRes.rows.map((r) => r.data);
      } catch (_e) {
        db.events = [];
      }

      try {
        const qhRes = await timeoutQuery(activePool.query("SELECT data FROM quiz_histories"));
        db.quizHistories = qhRes.rows.map((r) => r.data);
      } catch (_e) {
        db.quizHistories = [];
      }

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
      spatialRes.rows.forEach((r) => (db.spatialCache[r.id] = r.data));

      return db;
    } catch (e) {
      if (isPgQuotaOrUnavailableError(e)) {
        markPgDegraded(e);
      } else {
        console.error("Vercel DB Read Error:", e);
        if (isProductionRuntime() && !fs.existsSync(sourceDbPath)) {
          throw new Error("Database connection failed in production");
        }
      }
    }
  } else if (!activePool && isProductionRuntime() && !fs.existsSync(sourceDbPath)) {
    throw new Error(
      "CRITICAL: DATABASE_URL is missing. database.json fallback is disabled in production.",
    );
  }

  return loadLocalFallbackDB();
}

export async function getAccountById(id) {
  if (!id) return null;
  if (activePool && !isPgDegraded()) {
    try {
      await initPg();
      const res = await timeoutQuery(
        activePool.query("SELECT data FROM accounts WHERE id = $1 LIMIT 1", [id]),
      );
      return res.rows[0]?.data || null;
    } catch (e) {
      if (isPgQuotaOrUnavailableError(e)) {
        markPgDegraded(e);
      } else if (isProductionRuntime()) {
        throw e;
      }
    }
  }
  const db = loadLocalFallbackDB();
  return (db.accounts || []).find((a) => a.id === id) || null;
}

export async function getAccountByEmail(email) {
  if (!email) return null;
  const target = String(email).toLowerCase();
  if (activePool && !isPgDegraded()) {
    try {
      await initPg();
      const res = await timeoutQuery(
        activePool.query(
          "SELECT data FROM accounts WHERE lower(data->>'email') = $1 LIMIT 1",
          [target],
        ),
      );
      return res.rows[0]?.data || null;
    } catch (e) {
      if (isPgQuotaOrUnavailableError(e)) {
        markPgDegraded(e);
      } else if (isProductionRuntime()) {
        throw e;
      }
    }
  }
  const db = loadLocalFallbackDB();
  return (
    (db.accounts || []).find((a) => a.email?.toLowerCase() === target) || null
  );
}

export async function getProfileByUserId(userId) {
  if (!userId) return null;
  if (activePool && !isPgDegraded()) {
    try {
      await initPg();
      const res = await timeoutQuery(
        activePool.query("SELECT data FROM profiles WHERE user_id = $1 LIMIT 1", [
          userId,
        ]),
      );
      return res.rows[0]?.data || null;
    } catch (e) {
      if (isPgQuotaOrUnavailableError(e)) {
        markPgDegraded(e);
      } else if (isProductionRuntime()) {
        throw e;
      }
    }
  }
  const db = loadLocalFallbackDB();
  return (db.profiles || []).find((p) => p.userId === userId) || null;
}

export async function saveAccount(account) {
  const mem = loadLocalFallbackDB();
  if (!mem.accounts) mem.accounts = [];
  const idx = mem.accounts.findIndex((a) => a.id === account.id);
  if (idx >= 0) mem.accounts[idx] = account;
  else mem.accounts.push(account);

  if (activePool && !isPgDegraded()) {
    try {
      await initPg();
      await timeoutQuery(
        activePool.query(
          `INSERT INTO accounts (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
          [account.id, JSON.stringify(account)],
        ),
      );
      return true;
    } catch (e) {
      if (isPgQuotaOrUnavailableError(e)) {
        markPgDegraded(e);
        return true;
      }
      if (isProductionRuntime()) throw e;
    }
  }
  return true;
}

export async function saveProfile(profile) {
  const mem = loadLocalFallbackDB();
  if (!mem.profiles) mem.profiles = [];
  const idx = mem.profiles.findIndex((p) => p.userId === profile.userId);
  if (idx >= 0) mem.profiles[idx] = profile;
  else mem.profiles.push(profile);

  if (activePool && !isPgDegraded()) {
    try {
      await initPg();
      await timeoutQuery(
        activePool.query(
          `INSERT INTO profiles (user_id, data) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data`,
          [profile.userId, JSON.stringify(profile)],
        ),
      );
      return true;
    } catch (e) {
      if (isPgQuotaOrUnavailableError(e)) {
        markPgDegraded(e);
        return true;
      }
      if (isProductionRuntime()) throw e;
    }
  }
  return true;
}

export async function saveEvent(event) {
  const mem = loadLocalFallbackDB();
  if (!mem.events) mem.events = [];
  const idx = mem.events.findIndex((e) => e.id === event.id);
  if (idx >= 0) mem.events[idx] = event;
  else mem.events.push(event);

  if (activePool && !isPgDegraded()) {
    try {
      await initPg();
      await timeoutQuery(
        activePool.query(
          `INSERT INTO events (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
          [event.id, JSON.stringify(event)],
        ),
      );
      return true;
    } catch (e) {
      if (isPgQuotaOrUnavailableError(e)) {
        markPgDegraded(e);
        return true;
      }
      if (isProductionRuntime()) throw e;
    }
  }
  return true;
}

export async function removeEvent(id) {
  const mem = loadLocalFallbackDB();
  if (mem.events) {
    mem.events = mem.events.filter((e) => e.id !== id);
  }
  if (activePool && !isPgDegraded()) {
    try {
      await initPg();
      await timeoutQuery(activePool.query(`DELETE FROM events WHERE id = $1`, [id]));
      return true;
    } catch (e) {
      if (isPgQuotaOrUnavailableError(e)) {
        markPgDegraded(e);
        return true;
      }
      if (isProductionRuntime()) throw e;
    }
  }
  return true;
}

export async function saveWeatherInterval(record) {
  if (!record.id) {
    record.id = `wt-${record.locationKey || 'loc'}-${record.timeframe || '1d'}-${Date.now()}`;
  }
  const mem = loadLocalFallbackDB();
  if (!mem.weatherIntervals) mem.weatherIntervals = [];
  mem.weatherIntervals.unshift(record);
  if (mem.weatherIntervals.length > 500) {
    mem.weatherIntervals = mem.weatherIntervals.slice(0, 500);
  }
  if (activePool && !isPgDegraded()) {
    try {
      await initPg();
      await timeoutQuery(
        activePool.query(
          `INSERT INTO weather_training_intervals (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
          [record.id, JSON.stringify(record)],
        ),
      );
      return true;
    } catch (e) {
      if (isPgQuotaOrUnavailableError(e)) {
        markPgDegraded(e);
        return true;
      }
      if (isProductionRuntime()) throw e;
    }
  }
  return true;
}

function normalizeKeyVariants(key) {
  if (!key || typeof key !== 'string') return [key];
  const parts = key.split(',').map(s => parseFloat(s.trim()));
  if (parts.length === 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
    const [lat, lng] = parts;
    const v3 = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    const v2 = `${lat.toFixed(2)},${lng.toFixed(2)}`;
    return Array.from(new Set([key, v3, v2]));
  }
  return [key];
}

export async function getWeatherIntervals(locationKey, limit = 50) {
  const variants = normalizeKeyVariants(locationKey);
  if (activePool && !isPgDegraded()) {
    try {
      await initPg();
      let queryText = `SELECT data FROM weather_training_intervals ORDER BY created_at DESC LIMIT $1`;
      let queryParams = [limit];
      if (locationKey) {
        queryText = `SELECT data FROM weather_training_intervals WHERE (data->>'locationKey') = ANY($1) ORDER BY created_at DESC LIMIT $2`;
        queryParams = [variants, limit];
      }
      const res = await timeoutQuery(activePool.query(queryText, queryParams));
      if (res && res.rows) {
        return res.rows.map((r) => r.data);
      }
    } catch (e) {
      if (isPgQuotaOrUnavailableError(e)) markPgDegraded(e);
      console.warn("Could not query weather_training_intervals from pool:", e);
    }
  }
  const mem = loadLocalFallbackDB();
  if (mem.weatherIntervals) {
    return mem.weatherIntervals
      .filter((d) => {
        if (!locationKey) return true;
        if (variants.includes(d.locationKey)) return true;
        return false;
      })
      .slice(0, limit);
  }
  return [];
}

export async function writeDB(db, tablesToUpdate = null) {
  const fullDb = { ...createEmptyDb(), ...db };
  inMemoryCache = fullDb;

  if (activePool && !isPgDegraded()) {
    try {
      await initPg();
      const providedKeys = Object.keys(db);
      const isSelective = tablesToUpdate || (providedKeys.length > 0 && providedKeys.length <= 6);

      const shouldUpdate = (tableName, keyName) => {
        if (tablesToUpdate && Array.isArray(tablesToUpdate)) {
          return tablesToUpdate.includes(tableName) || tablesToUpdate.includes(keyName);
        }
        if (isSelective) {
          return providedKeys.includes(keyName) || providedKeys.includes(tableName);
        }
        // By default on full DB write, never re-sync huge static tables like schools
        if (tableName === "schools") return false;
        return true;
      };

      if (fullDb.digitalTwins && shouldUpdate("digital_twins", "digitalTwins")) {
        for (const [key, value] of Object.entries(fullDb.digitalTwins)) {
          if (value.mapImage && value.mapImage.startsWith("data:image")) {
            value.mapImage = await uploadBase64(
              value.mapImage,
              `digitaltwins/${key}_${Date.now()}`,
            );
          }
        }
      }
      if (fullDb.gridMaps && shouldUpdate("grid_maps", "gridMaps")) {
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

      const tasks = [];

      const insertArray = (tableName, keyName, array, idField = "id") => {
        if (!array || !array.length || !shouldUpdate(tableName, keyName)) return;
        for (const item of array) {
          tasks.push(() =>
            activePool.query(
              `INSERT INTO ${tableName} (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
              [item[idField], JSON.stringify(item)],
            )
          );
        }
      };

      const insertProfileArray = (array) => {
        if (!array || !array.length || !shouldUpdate("profiles", "profiles")) return;
        for (const item of array) {
          tasks.push(() =>
            activePool.query(
              `INSERT INTO profiles (user_id, data) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data`,
              [item.userId, JSON.stringify(item)],
            )
          );
        }
      };

      const insertObject = (tableName, keyName, obj) => {
        if (!obj || !shouldUpdate(tableName, keyName)) return;
        for (const [key, value] of Object.entries(obj)) {
          tasks.push(() =>
            activePool.query(
              `INSERT INTO ${tableName} (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
              [key, JSON.stringify(value)],
            )
          );
        }
      };

      const insertTwins = (obj) => {
        if (!obj || !shouldUpdate("digital_twins", "digitalTwins")) return;
        for (const [key, value] of Object.entries(obj)) {
          tasks.push(() =>
            activePool.query(
              `INSERT INTO digital_twins (school_id, data) VALUES ($1, $2) ON CONFLICT (school_id) DO UPDATE SET data = EXCLUDED.data`,
              [key, JSON.stringify(value)],
            )
          );
        }
      };

      const insertAnalysis = (obj) => {
        if (!obj || !shouldUpdate("school_disaster_analysis", "schoolDisasterAnalysis")) return;
        for (const [key, value] of Object.entries(obj)) {
          tasks.push(() =>
            activePool.query(
              `INSERT INTO school_disaster_analysis (school_id, data) VALUES ($1, $2) ON CONFLICT (school_id) DO UPDATE SET data = EXCLUDED.data`,
              [key, JSON.stringify(value)],
            )
          );
        }
      };

      insertArray("accounts", "accounts", fullDb.accounts);
      insertProfileArray(fullDb.profiles);
      insertArray("schools", "schools", fullDb.schools);
      insertArray("classes", "classes", fullDb.classes);
      insertArray("dt_results", "dtResults", fullDb.dtResults);
      insertArray("surveys", "surveys", fullDb.surveys);
      insertArray("events", "events", fullDb.events);
      insertArray("quiz_histories", "quizHistories", fullDb.quizHistories);

      insertTwins(fullDb.digitalTwins);
      insertObject("grid_maps", "gridMaps", fullDb.gridMaps);
      insertObject("simulations", "simulations", fullDb.simulations);
      insertObject("dt_rooms", "dtRooms", fullDb.dtRooms);
      insertAnalysis(fullDb.schoolDisasterAnalysis);

      // Execute queries in small concurrent batches to prevent connection pool exhaustion
      const batchSize = 10;
      for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize).map((fn) => timeoutQuery(fn()));
        await Promise.all(batch);
      }

      return true;
    } catch (e) {
      if (isPgQuotaOrUnavailableError(e)) {
        markPgDegraded(e);
      } else {
        console.error("Vercel DB Write Error:", e);
        if (isProductionRuntime()) throw new Error("Database write failed in production");
      }
    }
  } else if (!activePool && isProductionRuntime() && !fs.existsSync(sourceDbPath)) {
    throw new Error(
      "CRITICAL: DATABASE_URL is missing. database.json fallback is disabled in production.",
    );
  }

  if (isProductionRuntime()) {
    return true;
  }

  try {
    fs.writeFileSync(sourceDbPath, JSON.stringify(fullDb, null, 2));
    return true;
  } catch (err) {
    console.error("Failed to write local database:", err);
    return false;
  }
}

export async function getSpatialCache(id) {
  if (activePool && !isPgDegraded()) {
    try {
      const res = await timeoutQuery(
        activePool.query("SELECT data FROM spatial_cache WHERE id = $1", [id])
      );
      if (res.rows.length > 0) return res.rows[0].data;
      return null;
    } catch (e) {
      if (isPgQuotaOrUnavailableError(e)) markPgDegraded(e);
      else console.error("PG getSpatialCache error:", e);
    }
  }

  const mem = loadLocalFallbackDB();
  return mem?.spatialCache?.[id] || null;
}

export async function setSpatialCache(id, data) {
  const mem = loadLocalFallbackDB();
  if (!mem.spatialCache) mem.spatialCache = {};
  mem.spatialCache[id] = data;

  if (activePool && !isPgDegraded()) {
    try {
      await timeoutQuery(
        activePool.query(
          "INSERT INTO spatial_cache (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data",
          [id, JSON.stringify(data)]
        )
      );
      return true;
    } catch (e) {
      if (isPgQuotaOrUnavailableError(e)) {
        markPgDegraded(e);
        return true;
      }
      console.error("PG setSpatialCache error:", e);
      return false;
    }
  }

  if (!isProductionRuntime()) {
    try {
      fs.writeFileSync(sourceDbPath, JSON.stringify(mem, null, 2));
    } catch {
      // Non-fatal in test/readonly sandboxes
    }
  }
  return true;
}

// Spatial PostGIS Queries
export async function querySpatialFeaturesInAOI(aoiPolygonGeoJSON, datasetId = null) {
  if (!activePool || isPgDegraded()) return [];

  const geomParam = JSON.stringify(aoiPolygonGeoJSON);
  let query = `
    SELECT 
      f.id,
      f.dataset_id,
      f.properties,
      ST_AsGeoJSON(f.geom)::json AS geometry,
      ST_Area(f.geom::geography) / 1000000.0 AS area_km2
    FROM spatial_features f
    WHERE ST_Intersects(f.geom, ST_SetSRID(ST_GeomFromGeoJSON($1), 4326))
  `;
  const params = [geomParam];

  if (datasetId) {
    query += " AND f.dataset_id = $2";
    params.push(datasetId);
  }

  query += " LIMIT 500";

  try {
    await initPg();
    const res = await timeoutQuery(activePool.query(query, params));
    return res.rows;
  } catch (err) {
    if (isPgQuotaOrUnavailableError(err)) markPgDegraded(err);
    else console.error("querySpatialFeaturesInAOI error:", err.message);
    return [];
  }
}

export async function identifyNearPoint(lat, lng, radiusMeters = 5000) {
  if (!activePool || isPgDegraded()) return { features: [], sensors: [], hazards: [] };

  try {
    await initPg();
    const pointQuery = "ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography";

    // 1. Intersecting Hazard Zones
    const hazardRes = await timeoutQuery(
      activePool.query(
        `SELECT id, hazard_type, name, risk_level, source_agency,
                ST_AsGeoJSON(geom)::json AS geometry
         FROM hazard_zones
         WHERE ST_Intersects(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))`,
        [lng, lat]
      )
    );

    // 2. Nearest Sensors
    const sensorRes = await timeoutQuery(
      activePool.query(
        `SELECT id, code, name, family, platform, provider, status,
                ST_Distance(geom::geography, ${pointQuery}) / 1000.0 AS distance_km,
                ST_AsGeoJSON(geom)::json AS geometry
         FROM sensor_stations
         WHERE ST_DWithin(geom::geography, ${pointQuery}, $3)
         ORDER BY distance_km ASC
         LIMIT 20`,
        [lng, lat, radiusMeters]
      )
    );

    // 3. Spatial Features
    const featRes = await timeoutQuery(
      activePool.query(
        `SELECT id, dataset_id, properties,
                ST_Distance(geom::geography, ${pointQuery}) / 1000.0 AS distance_km,
                ST_AsGeoJSON(geom)::json AS geometry
         FROM spatial_features
         WHERE ST_DWithin(geom::geography, ${pointQuery}, $3)
         ORDER BY distance_km ASC
         LIMIT 50`,
        [lng, lat, radiusMeters]
      )
    );

    return {
      hazards: hazardRes.rows,
      sensors: sensorRes.rows,
      features: featRes.rows,
    };
  } catch (err) {
    if (isPgQuotaOrUnavailableError(err)) markPgDegraded(err);
    else console.error("identifyNearPoint error:", err.message);
    return { features: [], sensors: [], hazards: [] };
  }
}

export async function saveSpatialFeature(datasetId, properties, geojsonGeometry) {
  if (!activePool || isPgDegraded()) return null;

  const id = properties.id || `feat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const geomJson = JSON.stringify(geojsonGeometry);

  try {
    await initPg();
    await timeoutQuery(
      activePool.query(
        `INSERT INTO spatial_features (id, dataset_id, properties, geom)
         VALUES ($1, $2, $3, ST_SetSRID(ST_GeomFromGeoJSON($4), 4326))
         ON CONFLICT (id) DO UPDATE SET properties = EXCLUDED.properties, geom = EXCLUDED.geom`,
        [id, datasetId, JSON.stringify(properties), geomJson]
      )
    );
    return id;
  } catch (err) {
    if (isPgQuotaOrUnavailableError(err)) markPgDegraded(err);
    else console.error("saveSpatialFeature error:", err.message);
    return null;
  }
}

const memoryJobCache = new Map();

export async function saveSpatialJob(job) {
  memoryJobCache.set(job.id, job);
  if (activePool && !isPgDegraded()) {
    try {
      await timeoutQuery(
        activePool.query(
          `CREATE TABLE IF NOT EXISTS spatial_jobs (
             id VARCHAR(255) PRIMARY KEY,
             data JSONB NOT NULL,
             created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
           )`
        )
      );
      await timeoutQuery(
        activePool.query(
          `INSERT INTO spatial_jobs (id, data, created_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (id) DO UPDATE SET data = $2`,
          [job.id, JSON.stringify(job)]
        )
      );
    } catch (e) {
      if (isPgQuotaOrUnavailableError(e)) markPgDegraded(e);
      else console.warn("Could not save spatial job to PostgreSQL:", e.message);
    }
  }
  const mem = loadLocalFallbackDB();
  mem.spatialJobs = mem.spatialJobs || {};
  mem.spatialJobs[job.id] = job;
  if (!isProductionRuntime()) {
    try {
      fs.writeFileSync(sourceDbPath, JSON.stringify(mem, null, 2));
    } catch {
      // Non-fatal in test/readonly sandboxes
    }
  }
  return job;
}

export async function getSpatialJobById(id) {
  if (memoryJobCache.has(id)) {
    return memoryJobCache.get(id);
  }
  if (activePool && !isPgDegraded()) {
    try {
      await initPg();
      const res = await timeoutQuery(
        activePool.query("SELECT data FROM spatial_jobs WHERE id = $1", [id])
      );
      if (res.rows.length > 0) {
        memoryJobCache.set(id, res.rows[0].data);
        return res.rows[0].data;
      }
    } catch (e) {
      if (isPgQuotaOrUnavailableError(e)) markPgDegraded(e);
    }
  }
  try {
    const mem = loadLocalFallbackDB();
    const found = mem.spatialJobs?.[id] || null;
    if (found) memoryJobCache.set(id, found);
    return found;
  } catch {
    return null;
  }
}

export async function deleteSpatialJobById(id) {
  memoryJobCache.delete(id);
  if (activePool && !isPgDegraded()) {
    try {
      await initPg();
      await timeoutQuery(
        activePool.query("DELETE FROM spatial_jobs WHERE id = $1", [id])
      );
    } catch (e) {
      if (isPgQuotaOrUnavailableError(e)) markPgDegraded(e);
    }
  }
  try {
    const mem = loadLocalFallbackDB();
    if (mem.spatialJobs && mem.spatialJobs[id]) {
      delete mem.spatialJobs[id];
      if (!isProductionRuntime()) {
        fs.writeFileSync(sourceDbPath, JSON.stringify(mem, null, 2));
      }
    }
  } catch {
    // Ignore cleanup errors
  }
  return true;
}
