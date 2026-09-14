import fs from "fs";
import pg from "pg";
import { put } from "@vercel/blob";
import dotenv from "dotenv";
dotenv.config();

const dbPath = "database.json";
const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!dbUrl) {
  console.error("DATABASE_URL is missing. Please set it in .env");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  console.log("Starting migration...");
  const dbData = JSON.parse(fs.readFileSync(dbPath, "utf8"));

  await pool.query(`
    CREATE TABLE IF NOT EXISTS accounts (
      id VARCHAR(255) PRIMARY KEY,
      data JSONB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS profiles (
      user_id VARCHAR(255) PRIMARY KEY,
      data JSONB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS schools (
      id VARCHAR(255) PRIMARY KEY,
      data JSONB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS classes (
      id VARCHAR(255) PRIMARY KEY,
      data JSONB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS digital_twins (
      school_id VARCHAR(255) PRIMARY KEY,
      data JSONB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS grid_maps (
      id VARCHAR(255) PRIMARY KEY,
      data JSONB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS simulations (
      id VARCHAR(255) PRIMARY KEY,
      data JSONB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS dt_rooms (
      id VARCHAR(255) PRIMARY KEY,
      data JSONB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS dt_results (
      id VARCHAR(255) PRIMARY KEY,
      data JSONB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS surveys (
      id VARCHAR(255) PRIMARY KEY,
      data JSONB NOT NULL
    );
  `);
  console.log("Tables created successfully.");

  async function insertArray(tableName, array, idField = "id") {
    if (!array || !array.length) return;
    for (const item of array) {
      await pool.query(
        `INSERT INTO ${tableName} (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
        [item[idField], JSON.stringify(item)],
      );
    }
  }

  async function insertObject(tableName, obj) {
    if (!obj) return;
    for (const [key, value] of Object.entries(obj)) {
      await pool.query(
        `INSERT INTO ${tableName} (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
        [key, JSON.stringify(value)],
      );
    }
  }

  async function uploadBase64(base64Str, filename) {
    if (!base64Str || !base64Str.startsWith("data:image")) return base64Str;
    console.log(`Uploading ${filename} to Vercel Blob...`);
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
      console.log(`Uploaded to ${url}`);
      return url;
    } catch (e) {
      console.error(`Failed to upload ${filename}:`, e.message);
      return base64Str; // fallback to base64
    }
  }

  console.log("Migrating accounts...");
  await insertArray("accounts", dbData.accounts);

  console.log("Migrating profiles...");
  await pool.query("DELETE FROM profiles"); // reset to handle user_id -> id mapping
  if (dbData.profiles) {
    for (const p of dbData.profiles) {
      await pool.query(
        `INSERT INTO profiles (user_id, data) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data`,
        [p.userId, JSON.stringify(p)],
      );
    }
  }

  console.log("Migrating schools...");
  await insertArray("schools", dbData.schools);

  console.log("Migrating classes...");
  await insertArray("classes", dbData.classes);

  console.log("Migrating grid_maps...");
  if (dbData.gridMaps) {
    for (const [key, value] of Object.entries(dbData.gridMaps)) {
      if (
        value.floorplanImage &&
        value.floorplanImage.startsWith("data:image")
      ) {
        value.floorplanImage = await uploadBase64(
          value.floorplanImage,
          `gridmaps/${key}`,
        );
      }
      await pool.query(
        `INSERT INTO grid_maps (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
        [key, JSON.stringify(value)],
      );
    }
  }

  console.log("Migrating simulations...");
  await insertObject("simulations", dbData.simulations);

  console.log("Migrating dt_rooms...");
  await insertObject("dt_rooms", dbData.dtRooms);

  console.log("Migrating dt_results...");
  await insertArray("dt_results", dbData.dtResults);

  console.log("Migrating surveys...");
  await insertArray("surveys", dbData.surveys);

  console.log("Migrating digital_twins...");
  if (dbData.digitalTwins) {
    for (const [key, value] of Object.entries(dbData.digitalTwins)) {
      if (value.mapImage && value.mapImage.startsWith("data:image")) {
        value.mapImage = await uploadBase64(
          value.mapImage,
          `digitaltwins/${key}`,
        );
      }
      await pool.query(
        `INSERT INTO digital_twins (school_id, data) VALUES ($1, $2) ON CONFLICT (school_id) DO UPDATE SET data = EXCLUDED.data`,
        [key, JSON.stringify(value)],
      );
    }
  }

  console.log("Migration Complete!");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
