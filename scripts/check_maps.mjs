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
  `SELECT id, name, status FROM digital_twin_maps WHERE school_id = 'ffdcdf34-fc99-4209-913e-5a6042e957ad'`,
);
console.log("Maps:", JSON.stringify(res.rows, null, 2));

const mapId = res.rows[0].id;
const scenId = "scn_1789097933436_afo6g";
await pool.query(
  `UPDATE digital_twin_scenarios SET map_id = $1, status = 'PUBLISHED' WHERE id = $2`,
  [mapId, scenId],
);
console.log(`Updated scenario ${scenId} to map ${mapId}`);

await pool.end();
