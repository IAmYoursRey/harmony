require("dotenv").config();
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res = await pool.query(
      "SELECT * FROM digital_twin_floors WHERE id LIKE 'floor_dtmap%'",
    );
    console.log("Seeded Floors:", res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
