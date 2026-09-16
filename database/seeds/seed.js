import fs from "fs";
import path from "path";

const dbPath = path.resolve("apps", "server", "src", "database", "data", "database.json");
const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));

const TEACHER_ID = "seed-raihanansari6678";
const SCHOOL_ID = "sch-20502725";
const PASSWORD_HASH = db.accounts.find(
  (a) => a.email === "alvira.nizha@harmony.edu",
).passwordHash;

const classA = {
  id: "cls-1001",
  name: "XI IPA 1",
  grade: "XI",
  section: "IPA 1",
  academicYear: "2025/2026",
  schoolId: SCHOOL_ID,
  teacherId: TEACHER_ID,
  createdAt: new Date().toISOString(),
};

const classB = {
  id: "cls-1002",
  name: "X IPS 2",
  grade: "X",
  section: "IPS 2",
  academicYear: "2025/2026",
  schoolId: SCHOOL_ID,
  teacherId: TEACHER_ID,
  createdAt: new Date().toISOString(),
};

db.classes = [classA, classB];

const studentsData = [
  {
    id: "usr-s1",
    name: "Budi Santoso",
    email: "budi@student.harmony.edu",
    classId: classA.id,
  },
  {
    id: "usr-s2",
    name: "Siti Aminah",
    email: "siti@student.harmony.edu",
    classId: classA.id,
  },
  {
    id: "usr-s3",
    name: "Ahmad Fauzi",
    email: "ahmad@student.harmony.edu",
    classId: classA.id,
  },
  {
    id: "usr-s4",
    name: "Rina Wijaya",
    email: "rina@student.harmony.edu",
    classId: classB.id,
  },
];

db.accounts = db.accounts.filter((a) => a.role !== "student");
db.profiles = db.profiles.filter((p) => !p.userId.startsWith("usr-s"));

for (const s of studentsData) {
  db.accounts.push({
    id: s.id,
    email: s.email,
    passwordHash: PASSWORD_HASH,
    name: s.name,
    role: "student",
    createdAt: new Date().toISOString(),
  });

  db.profiles.push({
    userId: s.id,
    gender: "unknown",
    grade: s.classId === classA.id ? "XI" : "X",
    classSection: s.classId === classA.id ? "IPA 1" : "IPS 2",
    classId: s.classId,
    schoolId: SCHOOL_ID,
    topicScores: {},
    totalPoints: 120,
    badges: [],
    lastUpdated: new Date().toISOString(),
  });
}

const s1 = studentsData[0].id;
const s2 = studentsData[1].id;
const s3 = studentsData[2].id;
const studentCycle = [s1, s2, s3];

if (db.dtResults) {
  db.dtResults.forEach((result, i) => {
    result.userId = studentCycle[i % studentCycle.length];
    result.schoolId = SCHOOL_ID;
  });
}

db.surveys = [];
const preQuestions = [
  { id: "q1", type: "rating", question: "How confident are you?", value: 2 },
  { id: "q2", type: "rating", question: "Do you like geography?", value: 3 },
];
const postQuestions = [
  { id: "q1", type: "rating", question: "How confident are you?", value: 4 },
  { id: "q2", type: "rating", question: "Do you like geography?", value: 5 },
];

studentsData.forEach((s) => {
  db.surveys.push({
    id: `srv-pre-${s.id}`,
    userId: s.id,
    type: "pre-test",
    schoolId: SCHOOL_ID,
    responses: preQuestions,
    submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
  db.surveys.push({
    id: `srv-post-${s.id}`,
    userId: s.id,
    type: "post-test",
    schoolId: SCHOOL_ID,
    responses: postQuestions,
    submittedAt: new Date().toISOString(),
  });
});

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
console.log("Database seeded successfully.");
