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
    "SELECT id, data->>'email' as email, data->>'role' as role FROM accounts",
  );
  console.log(result.rows);
  pool.end();
}
main().catch(console.error);
