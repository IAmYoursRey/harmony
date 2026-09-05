import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isVercel = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
const sourceDbPath = path.join(__dirname, 'database.json');

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
  classes: []
};

import dns from 'node:dns';

// Fix for Node 18+ IPv6 preference which causes timeouts on Vercel with databases like Supabase
dns.setDefaultResultOrder('ipv4first');

// PostgreSQL configuration optimized for Serverless
const pool = process.env.DATABASE_URL ? new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3, // Prevent connection exhaustion across multiple serverless instances
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 5000,
  queryTimeout: 5000,
  allowExitOnIdle: true
}) : null;

// Helper for timeouts
const timeoutQuery = (queryPromise, ms = 4500) => {
  return Promise.race([
    queryPromise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`[CRITICAL] PostgreSQL timeout after ${ms}ms`)), ms))
  ]);
};

// Ensure table exists on startup if using Postgres
let pgInitialized = false;
async function initPg() {
  if (!pool || pgInitialized) return;
  try {
    await timeoutQuery(pool.query(`
      CREATE TABLE IF NOT EXISTS geosense_data (
        id INT PRIMARY KEY,
        data JSONB NOT NULL
      );
    `));
    
    // Check if initial row exists
    const res = await timeoutQuery(pool.query('SELECT 1 FROM geosense_data WHERE id = 1'));
    if (res.rowCount === 0) {
      // Seed from local JSON if available
      let seedData = DEFAULT_DB;
      if (fs.existsSync(sourceDbPath)) {
        seedData = { ...DEFAULT_DB, ...JSON.parse(fs.readFileSync(sourceDbPath, 'utf-8')) };
      }
      await timeoutQuery(pool.query('INSERT INTO geosense_data (id, data) VALUES (1, $1)', [JSON.stringify(seedData)]));
    }
    pgInitialized = true;
  } catch (err) {
    console.error('Failed to initialize PostgreSQL:', err);
    throw err;
  }
}

export async function readDB() {
  if (isVercel) {
    if (!pool) {
      throw new Error('[CRITICAL] DATABASE_URL is not configured for production persistence.');
    }
    await initPg();
    try {
      const res = await timeoutQuery(pool.query('SELECT data FROM geosense_data WHERE id = 1'));
      if (res.rowCount > 0) {
        return { ...DEFAULT_DB, ...res.rows[0].data };
      }
      return DEFAULT_DB;
    } catch (err) {
      console.error('Failed to read from PostgreSQL:', err);
      throw err;
    }
  } else {
    // Local development fallback
    try {
      if (!fs.existsSync(sourceDbPath)) {
        return DEFAULT_DB;
      }
      const data = fs.readFileSync(sourceDbPath, 'utf-8');
      const parsed = JSON.parse(data);
      return { ...DEFAULT_DB, ...parsed };
    } catch (err) {
      console.error('Failed to read local database:', err);
      return DEFAULT_DB;
    }
  }
}

export async function writeDB(db) {
  const fullDb = { ...DEFAULT_DB, ...db };
  
  if (isVercel) {
    if (!pool) {
      throw new Error('[CRITICAL] DATABASE_URL is not configured for production persistence.');
    }
    await initPg();
    try {
      await timeoutQuery(pool.query('UPDATE geosense_data SET data = $1 WHERE id = 1', [JSON.stringify(fullDb)]));
      return true;
    } catch (err) {
      console.error('Failed to write to PostgreSQL:', err);
      return false;
    }
  } else {
    // Local development fallback
    try {
      fs.writeFileSync(sourceDbPath, JSON.stringify(fullDb, null, 2));
      return true;
    } catch (err) {
      console.error('Failed to write local database:', err);
      return false;
    }
  }
}
