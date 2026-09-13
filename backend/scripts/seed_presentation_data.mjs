import { readDB, writeDB } from "../repository.js";
import crypto from "crypto";

const SCHOOL_ID = "ffdcdf34-fc99-4209-913e-5a6042e957ad";
const SCHOOL_NAME = "SMAN 1 Ngoro";

const USERS = [
  {
    id: "seed-alvira.nizha",
    name: "Alvira Fitriatun Nizha",
    role: "dev",
    email: "alvira.nizha@geosense.edu",
    type: "student_proxy",
  },
  {
    id: "seed-sinta.nadhifah",
    name: "Sinta Nadhifah",
    role: "teacher",
    email: "sinta.nadhifah@geosense.edu",
    type: "teacher",
  },
  {
    id: "usr-s1",
    name: "Budi Santoso",
    role: "student",
    email: "budi@student.geosense.edu",
    type: "student",
    level: "high",
  },
  {
    id: "usr-s2",
    name: "Siti Aminah",
    role: "student",
    email: "siti@student.geosense.edu",
    type: "student",
    level: "medium",
  },
  {
    id: "usr-s3",
    name: "Ahmad Fauzi",
    role: "student",
    email: "ahmad@student.geosense.edu",
    type: "student",
    level: "low",
  },
  {
    id: "usr-s4",
    name: "Rina Wijaya",
    role: "student",
    email: "rina@student.geosense.edu",
    type: "student",
    level: "medium",
  },
];

const DEFAULT_HASH =
  "$2b$10$1BaWJ78UiiqrLi7QclFFeeD3rRw/s4VDCA.d9cuJY6d.TiBmIW/cy";

function getDates(daysAgoList) {
  const now = new Date();
  return daysAgoList.map((days) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return d.toISOString();
  });
}

function getPerformanceProfile(level) {
  if (level === "high") {
    return {
      t1: { averageScore: 92 },
      t2: { averageScore: 88 },
      t3: { averageScore: 95 },
      simHp: 90,
      simTime: 35,
      points: 480,
      surveyScore: 90,
    };
  } else if (level === "low") {
    return {
      t1: { averageScore: 65 },
      t2: { averageScore: 60 },
      t3: { averageScore: 55 },
      simHp: 40,
      simTime: 95,
      points: 120,
      surveyScore: 50,
    };
  }

  return {
    t1: { averageScore: 78 },
    t2: { averageScore: 82 },
    t3: { averageScore: 75 },
    simHp: 70,
    simTime: 55,
    points: 320,
    surveyScore: 75,
  };
}

async function seed() {
  console.log("Fetching database...");
  const db = await readDB();

  if (!db.schools) db.schools = [];
  if (!db.accounts) db.accounts = [];
  if (!db.profiles) db.profiles = [];
  if (!db.dtResults) db.dtResults = [];
  if (!db.surveys) db.surveys = [];

  let school = db.schools.find((s) => s.id === SCHOOL_ID);
  if (!school) {
    db.schools.push({
      id: SCHOOL_ID,
      name: SCHOOL_NAME,
      province: "Jawa Timur",
      regency: "Mojokerto",
      isDemo: true,
    });
  }

  db.dtResults = db.dtResults.filter((r) => !r.isDemo);
  db.surveys = db.surveys.filter((s) => !s.isDemo);

  for (const user of USERS) {
    let account = db.accounts.find((a) => a.id === user.id);
    if (!account) {
      account = {
        id: user.id,
        name: user.name,
        role: user.role,
        email: user.email,
        createdAt: new Date().toISOString(),
        passwordHash: DEFAULT_HASH,
      };
      db.accounts.push(account);
    }

    if (user.type === "teacher") continue;

    const perf = getPerformanceProfile(user.level || "high");
    const dates = getDates([7, 5, 4, 2, 1]);

    let profile = db.profiles.find((p) => p.userId === user.id);
    if (!profile) {
      profile = {
        userId: user.id,
        schoolId: SCHOOL_ID,
        grade: "X",
        classSection: "IPA 1",
        badges: [],
        gender: "unknown",
      };
      db.profiles.push(profile);
    }

    profile.topicScores = { t1: perf.t1, t2: perf.t2, t3: perf.t3 };
    profile.totalPoints = perf.points;
    profile.classSection = "IPA 1";

    profile.pointsHistory = [
      { date: dates[0], points: perf.points * 0.2 },
      { date: dates[1], points: perf.points * 0.4 },
      { date: dates[2], points: perf.points * 0.6 },
      { date: dates[3], points: perf.points * 0.8 },
      { date: dates[4], points: perf.points },
    ];

    profile.activities = [
      {
        id: crypto.randomUUID(),
        type: "survey",
        description: "Submitted Pre-test Survey",
        date: dates[0],
      },
      {
        id: crypto.randomUUID(),
        type: "quiz",
        description: "Completed Earthquake Quiz",
        date: dates[1],
      },
      {
        id: crypto.randomUUID(),
        type: "assessment",
        description: "Completed Disaster Assessment",
        date: dates[2],
      },
      {
        id: crypto.randomUUID(),
        type: "learning",
        description: "Completed Learning Session",
        date: dates[3],
      },
      {
        id: crypto.randomUUID(),
        type: "simulation",
        description: "Completed Digital Twin Simulation",
        date: dates[4],
      },
    ];

    profile.lastUpdated = new Date().toISOString();

    db.dtResults.push({
      id: `sim-res-${user.id}-${Date.now()}`,
      userId: user.id,
      schoolId: SCHOOL_ID,
      hpRemaining: perf.simHp,
      completionTimeSeconds: perf.simTime,
      outcome: perf.simHp > 0 ? "success" : "failure",
      hazardsEncountered: ["Fire", "Debris"],
      submittedAt: dates[4],
      isDemo: true,
    });
    db.dtResults.push({
      id: `sim-res-${user.id}-${Date.now()}-2`,
      userId: user.id,
      schoolId: SCHOOL_ID,
      hpRemaining: perf.simHp - 10,
      completionTimeSeconds: perf.simTime + 10,
      outcome: perf.simHp > 10 ? "success" : "failure",
      hazardsEncountered: ["Earthquake"],
      submittedAt: dates[1],
      isDemo: true,
    });

    db.surveys.push({
      id: `survey-pre-${user.id}`,
      userId: user.id,
      schoolId: SCHOOL_ID,
      answers: { q1: perf.surveyScore / 20, q2: perf.surveyScore / 20 - 1 },
      score: perf.surveyScore - 15,
      completed: true,
      submittedAt: dates[0],
      isDemo: true,
    });

    db.surveys.push({
      id: `survey-post-${user.id}`,
      userId: user.id,
      schoolId: SCHOOL_ID,
      answers: { q1: perf.surveyScore / 20, q2: perf.surveyScore / 20 + 0.5 },
      score: perf.surveyScore,
      completed: true,
      submittedAt: dates[4],
      isDemo: true,
    });
  }

  console.log("Writing back to database (Neon)...");
  await writeDB(db);
  console.log("Successfully seeded presentation data!");
}

seed().catch(console.error);
