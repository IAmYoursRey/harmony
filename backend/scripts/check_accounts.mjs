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

const mapId = "dtmap_1789051657106_vvye0";
await pool.query(
  `UPDATE digital_twin_maps SET status = 'published' WHERE id = $1`,
  [mapId],
);
console.log("Map published:", mapId);

const scenId = "scn_1789097933436_afo6g";
await pool.query(
  `UPDATE digital_twin_scenarios SET status = 'PUBLISHED' WHERE id = $1`,
  [scenId],
);
console.log("Scenario published:", scenId);

const mapRes = await pool.query(
  `SELECT id, name, status FROM digital_twin_maps WHERE id = $1`,
  [mapId],
);
console.log("Map status:", mapRes.rows[0]);

const scenRes = await pool.query(
  `SELECT id, name, status FROM digital_twin_scenarios WHERE id = $1`,
  [scenId],
);
console.log("Scenario status:", scenRes.rows[0]);

await pool.end();
