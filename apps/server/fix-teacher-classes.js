import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'src', 'database', 'data', 'database.json');

async function run() {
  console.log("Loading DB from", dbPath);
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  const sman1 = db.schools.find(s => s.name && s.name.toLowerCase().includes("sman 1 ngoro"));
  if (!sman1) {
    console.error("SMAN 1 Ngoro not found in DB!");
    return;
  }
  const schoolId = sman1.id || sman1.school_id;
  
  const teacherProfile = db.profiles.find(p => p.schoolId === schoolId && db.accounts.find(a => a.id === p.userId)?.role === "teacher");
  const teacherId = teacherProfile ? teacherProfile.userId : "seed-aretha.kirana";

  const oldClasses = db.classes.filter(c => c.schoolId === schoolId && /[a-zA-Z]/.test(c.section || ""));
  console.log(`Removing ${oldClasses.length} old alphabetical classes.`);
  db.classes = db.classes.filter(c => !(c.schoolId === schoolId && /[a-zA-Z]/.test(c.section || "")));

  const sections = new Set();
  const students = db.profiles.filter(p => p.schoolId === schoolId && p.grade === "10");
  for (const s of students) {
    if (s.classSection) sections.add(s.classSection);
  } 

  console.log(`Creating classes for sections:`, Array.from(sections));
  const classMap = {}; 
  for (const section of sections) {
    const classId = `class_${schoolId}_10_${section}`;
    db.classes.push({
      id: classId,
      name: `10-${section}`,
      grade: "10",
      section: section,
      schoolId: schoolId,
      teacherId: teacherId,
      academicYear: "2026/2027"
    });
    classMap[section] = classId;
  }

  let updated = 0;
  for (const s of students) {
    if (s.classSection && classMap[s.classSection]) {
      s.classId = classMap[s.classSection];
      updated++;
    }
  }

  console.log(`Updated classId for ${updated} students.`);
  
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  console.log("Database updated successfully.");
}

run().catch(console.error);
