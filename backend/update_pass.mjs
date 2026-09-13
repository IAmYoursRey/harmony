import pg from "pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config({ path: "../backend/.env" });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL is missing.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  console.log("Connecting to Neon...");
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash("aretha.kirana@geosense.edu", salt);

  const arethaAccount = {
    id: "usr-" + Date.now(),
    email: "aretha.kirana@geosense.edu",
    passwordHash: hash,
    name: "Aretha Kirana Putri Junaidi",
    role: "teacher",
    createdAt: new Date().toISOString(),
  };

  const arethaProfile = {
    userId: arethaAccount.id,
    name: "Aretha Kirana Putri Junaidi",
    schoolId: "69977465",
    badges: [],
    activities: [],
    totalPoints: 0,
    lastUpdated: new Date().toISOString(),
  };

  console.log("Inserting Aretha...");
  await pool.query("INSERT INTO accounts (id, data) VALUES ($1, $2)", [
    arethaAccount.id,
    JSON.stringify(arethaAccount),
  ]);
  await pool.query("INSERT INTO profiles (user_id, data) VALUES ($1, $2)", [
    arethaAccount.id,
    JSON.stringify(arethaProfile),
  ]);
  console.log("Aretha inserted successfully.");

  console.log("Done.");
  pool.end();
}
main().catch(console.error);
