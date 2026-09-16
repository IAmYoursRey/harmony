import pg from "pg";
import dotenv from "dotenv";
dotenv.config({ path: "../backend/.env" });

const dbUrl = process.env.DATABASE_URL;
const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const result = await pool.query(
    "SELECT id, data FROM accounts WHERE data->>'email' = 'alvira.nizha@harmony.edu'",
  );
  if (result.rows.length > 0) {
    const alvira = result.rows[0].data;
    const id = result.rows[0].id;
    console.log("Alvira before:", alvira.role);

    alvira.role = "dev";
    await pool.query("UPDATE accounts SET data = $1 WHERE id = $2", [
      JSON.stringify(alvira),
      id,
    ]);
    console.log("Alvira restored to dev in Neon.");
  } else {
    console.log("Alvira not found in Neon.");
  }
  pool.end();
}
main().catch(console.error);
