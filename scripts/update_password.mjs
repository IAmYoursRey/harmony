import { pool } from "./repository.js";
import bcrypt from "bcryptjs";

(async () => {
  try {
    const passwordHash = await bcrypt.hash("teacher123", 10);
    const res = await pool.query(
      "SELECT * FROM accounts WHERE data->>'email' = 'aretha.kirana@harmony.edu'",
    );
    if (res.rows.length > 0) {
      const data = res.rows[0].data;
      data.passwordHash = passwordHash;
      await pool.query("UPDATE accounts SET data = $1 WHERE id = $2", [
        JSON.stringify(data),
        res.rows[0].id,
      ]);
      console.log("Password updated successfully.");
    } else {
      console.log("Teacher not found.");
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
