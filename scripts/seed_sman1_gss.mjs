import { readDB, writeDB } from "../repository.js";
import crypto from "crypto";

const SMAN1_SCHOOL_ID = "ffdcdf34-fc99-4209-913e-5a6042e957ad";

async function seed() {
  console.log("Seeding GSS simulation results for SMAN 1 Ngoro...");

  const db = await readDB();

  const studentProfiles = db.profiles.filter(
    (p) =>
      p.schoolId === SMAN1_SCHOOL_ID &&
      db.accounts.find((a) => a.id === p.userId)?.role === "student",
  );

  console.log(`Found ${studentProfiles.length} students at SMAN 1 Ngoro.`);

  if (studentProfiles.length === 0) {
    console.log("No students found. Exiting.");
    return;
  }

  if (!db.dtResults) db.dtResults = [];

  const studentIds = studentProfiles.map((p) => p.userId);
  db.dtResults = db.dtResults.filter((r) => !studentIds.includes(r.userId));

  for (const student of studentProfiles) {
    const numSimulations = Math.floor(Math.random() * 5) + 3; // 3 to 7 simulations

    for (let i = 0; i < numSimulations; i++) {
      const daysAgo = 14 - i * 2;
      const timestamp = new Date(
        Date.now() - daysAgo * 24 * 60 * 60 * 1000,
      ).toISOString();

      const isSuccess = Math.random() > 0.3; // 70% success
      const hpRemaining = isSuccess
        ? Math.floor(Math.random() * 40) + 60
        : Math.floor(Math.random() * 20); // 60-100 or 0-20
      const completionTimeSeconds = isSuccess
        ? Math.floor(Math.random() * 60) + 20
        : 120; // 20-80s or 120s

      db.dtResults.push({
        id: crypto.randomUUID(),
        userId: student.userId,
        mapId: "sandbox_map", // generic
        timestamp,
        isSuccess,
        hpRemaining,
        completionTimeSeconds,
        objectivesCompleted: isSuccess ? 2 : 0,
        totalObjectives: 2,
        damageTaken: 100 - hpRemaining,
      });
    }
  }

  await writeDB(db);
  console.log("Seeding complete. DB updated.");
}

seed().catch(console.error);
