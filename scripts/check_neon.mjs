import { pool } from "../repository.js";

async function check() {
  if (!pool) {
    console.log("No pool configured!");
    return;
  }

  try {
    const profiles = await pool.query("SELECT COUNT(*) FROM profiles");
    const classes = await pool.query("SELECT COUNT(*) FROM classes");
    const accounts = await pool.query("SELECT COUNT(*) FROM accounts");

    console.log("NEON PROFILES:", profiles.rows[0].count);
    console.log("NEON CLASSES:", classes.rows[0].count);
    console.log("NEON ACCOUNTS:", accounts.rows[0].count);
  } catch (e) {
    console.error("Query failed", e);
  } finally {
    process.exit(0);
  }
}
check();
