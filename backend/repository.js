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

let inMemoryCache = null;

import dns from 'node:dns';

// Fix for Node 18+ IPv6 preference which causes timeouts on Vercel with databases like Supabase
dns.setDefaultResultOrder('ipv4first');

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

// PostgreSQL configuration optimized for Serverless
const pool = dbUrl ? new pg.Pool({
  connectionString: dbUrl,
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
  if (isVercel && pool) {
    await initPg();
    try {
      const res = await timeoutQuery(pool.query('SELECT data FROM geosense_data WHERE id = 1'));
      if (res.rows.length > 0) return { ...DEFAULT_DB, ...res.rows[0].data };
    } catch (e) {
      console.error('Vercel DB Read Error:', e);
    }
  }
  
  // Memory Cache
  if (inMemoryCache) return inMemoryCache;
  
  // Fallback to local or memory if no DB
  if (fs.existsSync(sourceDbPath)) {
    try {
      return { ...DEFAULT_DB, ...JSON.parse(fs.readFileSync(sourceDbPath, 'utf-8')) };
    } catch (e) {
      return DEFAULT_DB;
    }
  }
  return DEFAULT_DB;
}

export async function writeDB(db) {
  const fullDb = { ...DEFAULT_DB, ...db };
  inMemoryCache = fullDb;
  
  if (isVercel && pool) {
    await initPg();
    try {
      await timeoutQuery(pool.query('UPDATE geosense_data SET data = $1 WHERE id = 1', [JSON.stringify(fullDb)]));
      return true;
    } catch (e) {
      console.error('Vercel DB Write Error:', e);
    }
  }

  // Fallback to local or memory if no DB
  try {
    fs.writeFileSync(sourceDbPath, JSON.stringify(fullDb, null, 2));
    return true;
  } catch (err) {
    console.error('Failed to write local database:', err);
    return false;
  }
}
