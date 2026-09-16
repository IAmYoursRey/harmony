require("dotenv").config({ path: [".env.local", ".env"] });
const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  try {
    const res = await pool.query(
      "SELECT id, map_id, status FROM digital_twin_scenarios WHERE status = 'published' LIMIT 1",
    );
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
main();
