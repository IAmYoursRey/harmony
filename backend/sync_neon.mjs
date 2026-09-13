import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const sourceDbPath = path.join(__dirname, "database.json");
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("DATABASE_URL is missing");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

async function syncDatabase() {
  console.log("Syncing database.json to Neon PostgreSQL...");

  const rawData = fs.readFileSync(sourceDbPath, "utf8");
  const localDb = JSON.parse(rawData);

  console.log(
    `Found ${localDb.accounts.length} accounts, ${localDb.profiles.length} profiles in database.json`,
  );

  try {
    await pool.query(`
            CREATE TABLE IF NOT EXISTS accounts ( id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL );
            CREATE TABLE IF NOT EXISTS profiles ( user_id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL );
        `);

    let accCount = 0;
    for (const acc of localDb.accounts) {
      await pool.query(
        `INSERT INTO accounts (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
        [acc.id, JSON.stringify(acc)],
      );
      accCount++;
    }
    console.log(`Synced ${accCount} accounts.`);

    let profCount = 0;
    for (const prof of localDb.profiles) {
      await pool.query(
        `INSERT INTO profiles (user_id, data) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data`,
        [prof.userId, JSON.stringify(prof)],
      );
      profCount++;
    }
    console.log(`Synced ${profCount} profiles.`);

    console.log("Sync complete.");
  } catch (e) {
    console.error("Error syncing:", e);
  } finally {
    pool.end();
  }
}

syncDatabase();
