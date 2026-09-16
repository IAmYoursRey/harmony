import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'src', 'database', 'data', 'database.json');
const excelPath = 'D:/vscode/Harmony/ABSENSI SISWA KELAS X GASAL 2026-2027.xlsx';

async function run() {
  console.log("Loading DB from", dbPath);
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  const sman1 = db.schools.find(s => s.name && s.name.toLowerCase().includes("sman 1 ngoro"));
  if (!sman1) {
    console.error("SMAN 1 Ngoro not found in DB!");
    return;
  }
  const schoolId = sman1.id || sman1.school_id;
  console.log("Found SMAN 1 Ngoro with ID:", schoolId);

  console.log("Loading Excel file...");
  const workbook = xlsx.readFile(excelPath);
  const sheet = workbook.Sheets['INDUK'];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  let added = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 5) continue;
    
    const nis = String(row[1] || "").trim();
    const nama = String(row[2] || "").trim();
    const genderRaw = String(row[3] || "").trim();
    const kelas = String(row[4] || "").trim();

    if (nis && nama && /^\d+$/.test(nis) && kelas.startsWith("X-")) {
      const email = `student${nis}@sman1ngoro.sch.id`;
      
      if (db.accounts.find(a => a.email === email)) {
        continue;
      }

      const id = `usr-${nis}-${Date.now()}-${Math.floor(Math.random()*1000)}`;
      const passwordHash = await bcrypt.hash("123456", 10);
      
      db.accounts.push({
        id,
        email,
        passwordHash,
        name: nama,
        role: "student",
        createdAt: new Date().toISOString()
      });

      db.profiles.push({
        userId: id,
        schoolId: schoolId,
        grade: "X",
        classSection: kelas,
        gender: genderRaw.toUpperCase() === "L" ? "male" : (genderRaw.toUpperCase() === "P" ? "female" : "other"),
        topicScores: {},
        totalPoints: 0,
        lastUpdated: new Date().toISOString()
      });

      added++;
    }
  }

  console.log(`Added ${added} students.`);
  
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  console.log("Database updated successfully.");
}

run().catch(console.error);
