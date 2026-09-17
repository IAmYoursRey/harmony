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
const sourceDbPath = path.join(__dirname, "..", "database", "data", "database.json");

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
  quizHistories: [],
  spatialCache: {},
  events: [],
  weatherIntervals: [],
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
      CREATE TABLE IF NOT EXISTS quiz_histories ( id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL );
      CREATE TABLE IF NOT EXISTS spatial_cache ( id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP );
      CREATE TABLE IF NOT EXISTS events ( id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL );
      CREATE TABLE IF NOT EXISTS weather_training_intervals ( id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP );
      
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
    `),
    );
    pgInitialized = true;
  } catch (err) {
    console.error("Failed to initialize PostgreSQL tables:", err);
    throw err;
  }
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
      const spatialRes = await timeoutQuery(
        pool.query("SELECT id, data FROM spatial_cache"),
      );

      try {
        const eventsRes = await timeoutQuery(pool.query("SELECT data FROM events"));
        db.events = eventsRes.rows.map((r) => r.data);
      } catch (_e) {
        db.events = [];
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

export async function saveAccount(account) {
  if (inMemoryCache) {
    if (!inMemoryCache.accounts) inMemoryCache.accounts = [];
    const idx = inMemoryCache.accounts.findIndex((a) => a.id === account.id);
    if (idx >= 0) inMemoryCache.accounts[idx] = account;
    else inMemoryCache.accounts.push(account);
  }
  if (pool) {
    await initPg();
    await timeoutQuery(
      pool.query(
        `INSERT INTO accounts (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
        [account.id, JSON.stringify(account)],
      ),
    );
    return true;
  }
  return true;
}

export async function saveProfile(profile) {
  if (inMemoryCache) {
    if (!inMemoryCache.profiles) inMemoryCache.profiles = [];
    const idx = inMemoryCache.profiles.findIndex((p) => p.userId === profile.userId);
    if (idx >= 0) inMemoryCache.profiles[idx] = profile;
    else inMemoryCache.profiles.push(profile);
  }
  if (pool) {
    await initPg();
    await timeoutQuery(
      pool.query(
        `INSERT INTO profiles (user_id, data) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data`,
        [profile.userId, JSON.stringify(profile)],
      ),
    );
    return true;
  }
  return true;
}

export async function saveEvent(event) {
  if (inMemoryCache) {
    if (!inMemoryCache.events) inMemoryCache.events = [];
    const idx = inMemoryCache.events.findIndex((e) => e.id === event.id);
    if (idx >= 0) inMemoryCache.events[idx] = event;
    else inMemoryCache.events.push(event);
  }
  if (pool) {
    await initPg();
    await timeoutQuery(
      pool.query(
        `INSERT INTO events (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
        [event.id, JSON.stringify(event)],
      ),
    );
    return true;
  }
  return true;
}

export async function removeEvent(id) {
  if (inMemoryCache && inMemoryCache.events) {
    inMemoryCache.events = inMemoryCache.events.filter((e) => e.id !== id);
  }
  if (pool) {
    await initPg();
    await timeoutQuery(pool.query(`DELETE FROM events WHERE id = $1`, [id]));
    return true;
  }
  return true;
}

export async function saveWeatherInterval(record) {
  if (!record.id) {
    record.id = `wt-${record.locationKey || 'loc'}-${record.timeframe || '1d'}-${Date.now()}`;
  }
  if (inMemoryCache) {
    if (!inMemoryCache.weatherIntervals) inMemoryCache.weatherIntervals = [];
    inMemoryCache.weatherIntervals.unshift(record);
    if (inMemoryCache.weatherIntervals.length > 500) {
      inMemoryCache.weatherIntervals = inMemoryCache.weatherIntervals.slice(0, 500);
    }
  }
  if (pool) {
    await initPg();
    await timeoutQuery(
      pool.query(
        `INSERT INTO weather_training_intervals (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
        [record.id, JSON.stringify(record)],
      ),
    );
    return true;
  }
  return true;
}

export async function getWeatherIntervals(locationKey, limit = 50) {
  if (pool) {
    await initPg();
    try {
      const res = await timeoutQuery(
        pool.query(
          `SELECT data FROM weather_training_intervals ORDER BY created_at DESC LIMIT $1`,
          [limit],
        ),
      );
      if (res && res.rows) {
        return res.rows.map((r) => r.data).filter((d) => !locationKey || d.locationKey === locationKey);
      }
    } catch (e) {
      console.warn("Could not query weather_training_intervals from pool:", e);
    }
  }
  if (inMemoryCache && inMemoryCache.weatherIntervals) {
    return inMemoryCache.weatherIntervals
      .filter((d) => !locationKey || d.locationKey === locationKey)
      .slice(0, limit);
  }
  return [];
}

export async function writeDB(db, tablesToUpdate = null) {
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

      const tasks = [];

      const insertArray = (tableName, keyName, array, idField = "id") => {
        if (!array || !array.length || !shouldUpdate(tableName, keyName)) return;
        for (const item of array) {
          tasks.push(() =>
            pool.query(
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
            pool.query(
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
            pool.query(
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
            pool.query(
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
            pool.query(
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

export async function getSpatialCache(id) {
  if (pool) {
    try {
      const res = await timeoutQuery(
        pool.query("SELECT data FROM spatial_cache WHERE id = $1", [id])
      );
      if (res.rows.length > 0) return res.rows[0].data;
      return null;
    } catch (e) {
      console.error("PG getSpatialCache error:", e);
      return null;
    }
  }
  
  if (!inMemoryCache) {
    await readDB();
  }
  return inMemoryCache?.spatialCache?.[id] || null;
}

export async function setSpatialCache(id, data) {
  if (pool) {
    try {
      await timeoutQuery(
        pool.query(
          "INSERT INTO spatial_cache (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data",
          [id, JSON.stringify(data)]
        )
      );
      return true;
    } catch (e) {
      console.error("PG setSpatialCache error:", e);
      return false;
    }
  }

  if (!inMemoryCache) await readDB();
  if (inMemoryCache) {
    if (!inMemoryCache.spatialCache) inMemoryCache.spatialCache = {};
    inMemoryCache.spatialCache[id] = data;
    await writeDB({});
  }
  return true;
}
