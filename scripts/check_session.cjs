require("dotenv").config();
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res = await pool.query(
      "SELECT id, map_id, scenario_id, status FROM simulation_sessions ORDER BY created_at DESC LIMIT 1",
    );
    console.log("Latest Session:", res.rows[0]);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
