import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'src', 'database', 'data', 'database.json');

async function run() {
  console.log("Loading DB from", dbPath);
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  let updatedProfiles = 0;
  for (const profile of db.profiles) {
    if (profile.grade === "10") {
      profile.grade = "X";
      updatedProfiles++;
    } else if (profile.grade === "11") {
      profile.grade = "XI";
      updatedProfiles++;
    } else if (profile.grade === "12") {
      profile.grade = "XII";
      updatedProfiles++;
    }
  }

  let updatedClasses = 0;
  for (const cls of db.classes) {
    if (cls.grade === "10") {
      cls.grade = "X";
      cls.name = `X - ${cls.section}`;
      updatedClasses++;
    } else if (cls.grade === "11") {
      cls.grade = "XI";
      cls.name = `XI - ${cls.section}`;
      updatedClasses++;
    } else if (cls.grade === "12") {
      cls.grade = "XII";
      cls.name = `XII - ${cls.section}`;
      updatedClasses++;
    }
  }

  console.log(`Updated ${updatedProfiles} profiles and ${updatedClasses} classes.`);
  
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  console.log("Database reverted successfully.");
}

run().catch(console.error);
