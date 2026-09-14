const { Pool } = require("pg");
const pool = new Pool({
  connectionString: "postgresql://postgres:postgres@localhost:5432/harmony",
});

async function run() {
  await pool.query(
    "UPDATE digital_twin_scenarios SET status = 'published' WHERE id = 'scen_qa1'",
  );
  console.log("Updated");
  process.exit(0);
}
run();
