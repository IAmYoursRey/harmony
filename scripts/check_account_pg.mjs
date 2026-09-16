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
  `SELECT id, data->>'email' as email, data->>'password' as password, data->>'passwordHash' as password_hash FROM accounts WHERE data->>'email' = 'student10a01@harmony.edu'`,
);
console.log("Account in postgres:", JSON.stringify(res.rows, null, 2));

await pool.end();
