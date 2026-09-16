import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'src', 'database', 'data', 'database.json');

async function run() {
  console.log("Loading DB from", dbPath);
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  let updated = 0;

  for (const profile of db.profiles) {
    if (profile.grade) {
      if (profile.grade === "X") {
        profile.grade = "10";
        updated++;
      } else if (profile.grade === "XI") {
        profile.grade = "11";
        updated++;
      } else if (profile.grade === "XII") {
        profile.grade = "12";
        updated++;
      }
    }
  }

  console.log(`Updated ${updated} profile grades.`);
  
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  console.log("Database updated successfully.");
}

run().catch(console.error);
