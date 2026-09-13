require("dotenv").config({ path: [".env.local", ".env"] });
const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  try {
    const res = await pool.query("SELECT COUNT(*) FROM simulation_sessions");
    console.log("Count:", res.rows[0].count);

    const res2 = await pool.query(
      "SELECT id, status FROM simulation_sessions ORDER BY created_at DESC LIMIT 5",
    );
    console.log("Latest:", res2.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
main();
