import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "../../apps/server/src/database/data/database.json");
const SCHOOL_ID = "ffdcdf34-fc99-4209-913e-5a6042e957ad";

function seed() {
  if (!existsSync(DB_PATH)) {
    console.warn(`[Seed] Skipped: ${DB_PATH} not found.`);
    return;
  }

  const db = JSON.parse(readFileSync(DB_PATH, "utf8"));
  db.schools = Array.isArray(db.schools) ? db.schools : [];

  const hasSchool = db.schools.some((s) => s.id === SCHOOL_ID || s.npsn === "20502725");
  if (!hasSchool) {
    db.schools.push({
      id: SCHOOL_ID,
      npsn: "20502725",
      name: "SMAN 1 NGORO",
      province: "Jawa Timur",
      regency: "Kabupaten Mojokerto",
      district: "Kecamatan Ngoro",
      studentCount: 320,
      latitude: -7.5608,
      longitude: 112.6203,
    });
  }

  writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
  console.log("Seed check completed safely for SMAN 1 NGORO (320 students, 9 classes).");
}

seed();
