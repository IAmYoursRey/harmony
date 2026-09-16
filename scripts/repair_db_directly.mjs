import { pool, timeoutQuery } from "../repository.js";
import bcrypt from "bcryptjs";

const NUM_CLASSES_PER_GRADE = 9;
const GRADES = ["10", "11"];
const CLASS_SECTIONS = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
const TARGET_SCHOOL_NAME = "SMAN 1 Ngoro";

function createSeededRNG(seedStr) {
  let h = 0xdeadbeef;
  for (let i = 0; i < seedStr.length; i++)
    h = Math.imul(h ^ seedStr.charCodeAt(i), 2654435761);
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

const INDONESIAN_NAMES = [
  "Ahmad",
  "Budi",
  "Citra",
  "Dian",
  "Eka",
  "Fajar",
  "Gita",
  "Hadi",
  "Intan",
  "Joko",
  "Kartika",
  "Lestari",
  "Muhammad",
  "Nadia",
  "Oka",
  "Putra",
  "Putri",
  "Qori",
  "Reza",
  "Sari",
  "Tari",
  "Utami",
  "Vina",
  "Wira",
  "Yudi",
  "Zahra",
  "Agus",
  "Rina",
  "Andi",
  "Maya",
  "Bagas",
  "Dewi",
  "Gilang",
  "Indra",
  "Kurniawan",
  "Laras",
  "Mega",
  "Naufal",
  "Pratama",
  "Rizky",
  "Salsabila",
  "Tegar",
  "Wulan",
  "Yoga",
];

const LAST_NAMES = [
  "Saputra",
  "Wijaya",
  "Kusuma",
  "Pratama",
  "Sari",
  "Lestari",
  "Nugroho",
  "Susanti",
  "Hidayat",
  "Setiawan",
  "Siregar",
  "Simanjuntak",
  "Wibowo",
  "Suryono",
  "Santoso",
  "Hartono",
];

function generateName(rng) {
  const first = INDONESIAN_NAMES[rng() % INDONESIAN_NAMES.length];
  const last = LAST_NAMES[rng() % LAST_NAMES.length];
  return `${first} ${last}`;
}

async function chunkedUpsert(tableName, array, idField = "id") {
  if (!array || array.length === 0) return;
  const chunkSize = 20; // safe chunk size
  let successCount = 0;
  for (let i = 0; i < array.length; i += chunkSize) {
    const chunk = array.slice(i, i + chunkSize);
    const promises = chunk.map((item) => {
      const dbId = idField === "user_id" ? item.userId : item.id;
      return pool.query(
        `INSERT INTO ${tableName} (${idField === "user_id" ? "user_id" : "id"}, data) VALUES ($1, $2) ON CONFLICT (${idField === "user_id" ? "user_id" : "id"}) DO UPDATE SET data = EXCLUDED.data`,
        [dbId, JSON.stringify(item)],
      );
    });
    await Promise.all(promises);
    successCount += chunk.length;
  }
  console.log(`Upserted ${successCount} rows into ${tableName}.`);
}

async function run() {
  if (!pool) {
    console.error("Pool not configured. Cannot repair database.");
    process.exit(1);
  }

  try {
    console.log("Checking target school...");
    const schoolsRes = await timeoutQuery(
      pool.query("SELECT data FROM schools"),
    );
    let school = schoolsRes.rows.find((r) =>
      r.data.name.includes(TARGET_SCHOOL_NAME),
    )?.data;
    if (!school) {
      console.log("Target school not found, creating it...");
      school = {
        id: "school_" + Date.now(),
        name: TARGET_SCHOOL_NAME,
        province: "Jawa Timur",
        regency: "Mojokerto",
        location: { lat: -7.5683, lng: 112.6373 },
      };
      await chunkedUpsert("schools", [school]);
    }

    const schoolId = school.id;

    const accRes = await timeoutQuery(
      pool.query("SELECT data FROM accounts WHERE data->>'role' = 'teacher'"),
    );
    let teacher = accRes.rows.find((r) => {
      return true; // We'll just assign to the first teacher for now
    })?.data;

    if (!teacher) {
      teacher = { id: "dev-dev-dev-dev", name: "Developer" }; // Fallback
    }

    const classesToUpsert = [];
    const accountsToUpsert = [];
    const profilesToUpsert = [];
    const dtResultsToUpsert = [];
    const surveysToUpsert = [];

    console.log("Generating 18 classes...");
    for (const grade of GRADES) {
      for (const section of CLASS_SECTIONS) {
        const classId = `class_${schoolId}_${grade}_${section}`;
        classesToUpsert.push({
          id: classId,
          schoolId: schoolId,
          teacherId: teacher.id,
          name: `${grade}${section}`,
          grade: grade,
          section: section,
          academicYear: "2026/2027",
        });
      }
    }

    console.log("Generating students and analytics...");
    for (const cls of classesToUpsert) {
      const rng = createSeededRNG(`student_gen_${cls.id}`);
      const studentCount = 34 + (rng() % 3); // 34, 35, or 36

      for (let i = 1; i <= studentCount; i++) {
        const studentId = `st_${cls.grade}${cls.section}_${i}`;
        const email = `student${cls.grade.toLowerCase()}${cls.section.toLowerCase()}${String(i).padStart(2, "0")}@harmony.edu`;
        const name = generateName(rng);

        const passwordHash = await bcrypt.hash(email, 10);

        accountsToUpsert.push({
          id: studentId,
          email: email,
          password: passwordHash,
          name: name,
          role: "student",
          createdAt: new Date().toISOString(),
        });

        const perfRoll = rng() % 100;
        let perfType = "MEDIUM";
        let baseKnowledge = 50;
        let baseHP = 50;
        let baseTime = 180;

        if (perfRoll < 25) {
          perfType = "LOW";
          baseKnowledge = 20 + (rng() % 20); // 20-40
          baseHP = 10 + (rng() % 30); // 10-40
          baseTime = 240 + (rng() % 60); // 240-300
        } else if (perfRoll > 75) {
          perfType = "HIGH";
          baseKnowledge = 75 + (rng() % 25); // 75-100
          baseHP = 75 + (rng() % 25); // 75-100
          baseTime = 60 + (rng() % 60); // 60-120
        } else {
          baseKnowledge = 45 + (rng() % 25); // 45-70
          baseHP = 45 + (rng() % 25); // 45-70
          baseTime = 120 + (rng() % 90); // 120-210
        }

        const profile = {
          userId: studentId,
          schoolId: schoolId,
          classId: cls.id,
          classSection: `${cls.grade}${cls.section}`,
          grade: cls.grade,
          totalPoints: baseKnowledge * 10,
          pointsHistory: [
            {
              timestamp: new Date(Date.now() - 30 * 86400000).toISOString(),
              points: baseKnowledge * 5,
              source: "quiz",
            },
            {
              timestamp: new Date(Date.now() - 15 * 86400000).toISOString(),
              points: baseKnowledge * 8,
              source: "simulation",
            },
            {
              timestamp: new Date().toISOString(),
              points: baseKnowledge * 10,
              source: "quiz",
            },
          ],
          topicScores: {
            "gempa-bumi": baseKnowledge,
            tsunami: Math.min(100, baseKnowledge + 10),
            kebakaran: Math.max(0, baseKnowledge - 10),
          },
          activities: [
            {
              id: `act_${studentId}_1`,
              type: "simulation",
              score: baseHP,
              timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
              name: "Simulasi Gempa Bumi",
            },
          ],
          completedSimulations: 1,
          sriScore: Math.floor((baseKnowledge + baseHP) / 2),
        };
        profilesToUpsert.push(profile);

        dtResultsToUpsert.push({
          id: `res_${studentId}_1`,
          studentId: studentId,
          schoolId: schoolId,
          classId: cls.id,
          scenarioId: "scen_gempa_1",
          disasterType: "Gempa Bumi",
          hpRemaining: baseHP,
          completionTimeSeconds: baseTime,
          damageTaken: 100 - baseHP,
          outcome: baseHP > 0 ? "Success" : "Failed",
          timestamp: new Date().toISOString(),
        });
      }
    }

    console.log(`Prepared ${classesToUpsert.length} classes.`);
    console.log(`Prepared ${accountsToUpsert.length} students.`);

    await chunkedUpsert("classes", classesToUpsert);
    await chunkedUpsert("accounts", accountsToUpsert);
    await chunkedUpsert("profiles", profilesToUpsert, "user_id");
    await chunkedUpsert("dt_results", dtResultsToUpsert);

    console.log("Database repair complete.");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
