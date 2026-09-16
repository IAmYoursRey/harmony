import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../apps/server/.env") });

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!dbUrl) {
  console.error("DATABASE_URL is missing.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  console.log("Seeding Schools and Mountains into PostgreSQL...");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schools ( id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL );
    CREATE TABLE IF NOT EXISTS mountains ( id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL );
  `);

  const BATCH_SIZE = 500;

  async function syncArray(tableName, arrayData, idField) {
    if (!arrayData || !arrayData.length) return 0;
    let count = 0;
    for (let i = 0; i < arrayData.length; i += BATCH_SIZE) {
      const batch = arrayData.slice(i, i + BATCH_SIZE);
      const values = [];
      const placeholders = [];
      let paramIndex = 1;

      for (const item of batch) {
        let itemId = item[idField];
        if (!itemId) {
          if (tableName === 'mountains') {
            // some mountains might not have id, use name + lat + lng
            itemId = `mt-${item.name}-${item.lat}-${item.lng}`.replace(/[^a-zA-Z0-9-]/g, '');
          } else if (tableName === 'schools') {
            itemId = item.school_id || `sch-${Math.random().toString(36).substr(2, 9)}`;
          }
        }
        
        placeholders.push(`($${paramIndex++}, $${paramIndex++})`);
        values.push(itemId, JSON.stringify(item));
        count++;
      }

      if (placeholders.length > 0) {
        await pool.query(
          `INSERT INTO ${tableName} (id, data) VALUES ${placeholders.join(', ')} ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
          values
        );
      }
      if (count % 5000 === 0) console.log(`Inserted ${count} into ${tableName}...`);
    }
    return count;
  }

  // Load Mountains
  const mountainsPath = path.join(__dirname, "../apps/server/src/database/data/mountains.json");
  if (fs.existsSync(mountainsPath)) {
    console.log("Loading mountains...");
    const mountainsData = JSON.parse(fs.readFileSync(mountainsPath, "utf8"));
    const count = await syncArray("mountains", mountainsData, "id");
    console.log(`✅ Mountains synced: ${count}`);
  } else {
    console.log("❌ mountains.json not found!");
  }

  // Load Schools (lite)
  const schoolsPath = path.join(__dirname, "../apps/server/src/database/data/schools-lite.json");
  if (fs.existsSync(schoolsPath)) {
    console.log("Loading schools-lite...");
    const schoolsData = JSON.parse(fs.readFileSync(schoolsPath, "utf8"));
    const count = await syncArray("schools", schoolsData, "id");
    console.log(`✅ Schools synced: ${count}`);
  } else {
    console.log("❌ schools-lite.json not found!");
  }

  console.log("Seeding complete.");
  pool.end();
}

run().catch(console.error);
