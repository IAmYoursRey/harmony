import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../apps/server/.env") });

const sourceDbPath = path.join(__dirname, "../apps/server/src/database/data/database.json");
const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  console.log("Syncing database.json to PostgreSQL...");
  const localDb = JSON.parse(fs.readFileSync(sourceDbPath, "utf8"));
  
  await pool.query(`
    DROP TABLE IF EXISTS accounts CASCADE;
    DROP TABLE IF EXISTS profiles CASCADE;
    DROP TABLE IF EXISTS schools CASCADE;
    DROP TABLE IF EXISTS classes CASCADE;
    DROP TABLE IF EXISTS digital_twins CASCADE;
    DROP TABLE IF EXISTS grid_maps CASCADE;
    DROP TABLE IF EXISTS simulations CASCADE;
    DROP TABLE IF EXISTS dt_rooms CASCADE;
    DROP TABLE IF EXISTS dt_results CASCADE;
    DROP TABLE IF EXISTS surveys CASCADE;
    DROP TABLE IF EXISTS school_disaster_analysis CASCADE;
    DROP TABLE IF EXISTS quiz_histories CASCADE;
    DROP TABLE IF EXISTS spatial_cache CASCADE;
    DROP TABLE IF EXISTS digital_twin_maps CASCADE;
  `);

  await pool.query(`
    CREATE TABLE accounts ( id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL );
    CREATE TABLE profiles ( user_id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL );
    CREATE TABLE schools ( id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL );
    CREATE TABLE classes ( id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL );
    CREATE TABLE digital_twins ( school_id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL );
    CREATE TABLE grid_maps ( id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL );
    CREATE TABLE simulations ( id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL );
    CREATE TABLE dt_rooms ( id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL );
    CREATE TABLE dt_results ( id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL );
    CREATE TABLE surveys ( id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL );
    CREATE TABLE school_disaster_analysis ( school_id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL );
    CREATE TABLE quiz_histories ( id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL );
    CREATE TABLE spatial_cache ( id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP );
  `);

  const BATCH_SIZE = 100;

  async function syncArray(tableName, arrayData, keyField, dbKeyField) {
    if (!arrayData) return 0;
    let count = 0;
    for (let i = 0; i < arrayData.length; i += BATCH_SIZE) {
      const batch = arrayData.slice(i, i + BATCH_SIZE);
      const values = [];
      const placeholders = [];
      let paramIndex = 1;
      
      for (const item of batch) {
        if (item[keyField]) {
          placeholders.push(`($${paramIndex++}, $${paramIndex++})`);
          values.push(item[keyField], JSON.stringify(item));
          count++;
        }
      }
      
      if (placeholders.length > 0) {
        await pool.query(
          `INSERT INTO ${tableName} (${dbKeyField}, data) VALUES ${placeholders.join(', ')} ON CONFLICT (${dbKeyField}) DO UPDATE SET data = EXCLUDED.data`,
          values
        );
      }
    }
    return count;
  }

  async function syncMap(tableName, mapData, dbKeyField = "id") {
    if (!mapData) return 0;
    let count = 0;
    const entries = Object.entries(mapData);
    
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      const values = [];
      const placeholders = [];
      let paramIndex = 1;
      
      for (const [key, value] of batch) {
        placeholders.push(`($${paramIndex++}, $${paramIndex++})`);
        values.push(key, JSON.stringify(value));
        count++;
      }
      
      if (placeholders.length > 0) {
        await pool.query(
          `INSERT INTO ${tableName} (${dbKeyField}, data) VALUES ${placeholders.join(', ')} ON CONFLICT (${dbKeyField}) DO UPDATE SET data = EXCLUDED.data`,
          values
        );
      }
    }
    return count;
  }

  console.log("Accounts:", await syncArray("accounts", localDb.accounts, "id", "id"));
  console.log("Profiles:", await syncArray("profiles", localDb.profiles, "userId", "user_id"));
  console.log("Schools:", await syncArray("schools", localDb.schools, "id", "id"));
  console.log("Classes:", await syncArray("classes", localDb.classes, "id", "id"));
  console.log("DT Results:", await syncArray("dt_results", localDb.dtResults, "id", "id"));
  console.log("Surveys:", await syncArray("surveys", localDb.surveys, "id", "id"));
  console.log("Digital Twins:", await syncMap("digital_twins", localDb.digitalTwins, "school_id"));
  console.log("Grid Maps:", await syncMap("grid_maps", localDb.gridMaps, "id"));
  console.log("Simulations:", await syncMap("simulations", localDb.simulations, "id"));
  console.log("DT Rooms:", await syncMap("dt_rooms", localDb.dtRooms, "id"));
  console.log("School Analysis:", await syncMap("school_disaster_analysis", localDb.schoolDisasterAnalysis, "school_id"));
  console.log("Spatial Cache:", await syncMap("spatial_cache", localDb.spatialCache));
  console.log("Quiz Histories:", await syncArray("quiz_histories", localDb.quizHistories, "id", "id"));

  console.log("Sync complete.");
  pool.end();
}

run();
