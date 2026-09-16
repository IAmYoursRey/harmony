import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { Pool } = require("pg");
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const res = await pool.query(
  `SELECT id, map_id, name, status FROM digital_twin_scenarios`,
);
console.log("Scenarios:", JSON.stringify(res.rows, null, 2));

await pool.end();
