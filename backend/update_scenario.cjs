require("dotenv").config();
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  await pool.query(
    "UPDATE digital_twin_scenarios SET status = 'published' WHERE id = 'scen_qa1'",
  );
  console.log("Updated");
  process.exit(0);
}
run();
