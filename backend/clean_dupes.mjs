import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const dbUrl = process.env.DATABASE_URL;
const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  try {
    console.log("Deleting duplicate manual accounts...");
    const dupes = ["usr-1789032057027", "usr-1789039168201"]; // Alvira and Aretha manual duplicates
    for (const id of dupes) {
      await pool.query("DELETE FROM accounts WHERE id = $1", [id]);
      await pool.query("DELETE FROM profiles WHERE user_id = $1", [id]);
      console.log(`Deleted ${id}`);
    }
    console.log("Cleanup complete!");
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
main();
