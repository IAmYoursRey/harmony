import express from "express";
import { readDB, writeDB } from "../repository.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { getBaseSchools } from "./schools.js";

const router = express.Router();

router.get("/", verifyToken, async (req, res) => {
  const db = await readDB();
  const profile = db.profiles.find((p) => p.userId === req.user.id);
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  res.json({ profile });
});

router.post("/", verifyToken, async (req, res) => {
  const db = await readDB();
  const index = db.profiles.findIndex((p) => p.userId === req.user.id);

  const { schoolId, ...safeBody } = req.body;

  if (index === -1) {
    const newProfile = {
      ...safeBody,
      userId: req.user.id,
      lastUpdated: new Date().toISOString(),
    };
    db.profiles.push(newProfile);
    await writeDB(db);
    return res.json({ profile: newProfile });
  } else {
    db.profiles[index] = {
      ...db.profiles[index],
      ...safeBody,
      lastUpdated: new Date().toISOString(),
    };
    await writeDB(db);
    return res.json({ profile: db.profiles[index] });
  }
});

router.get("/all", verifyToken, async (req, res) => {
  const db = await readDB();
  const schools = await getBaseSchools();

  const enrichedProfiles = db.profiles.map((p) => {
    const school =
      p.schoolId && p.schoolId !== "unknown"
        ? schools.find((s) => s.id === p.schoolId || s.school_id === p.schoolId)
        : null;

    return {
      ...p,
      schoolName: school ? school.name || school.school_name : p.schoolId,
      province: school ? school.province : "Unknown",
      regency: school ? school.regency : "Unknown",
    };
  });

  let filteredProfiles = enrichedProfiles;

  if (req.query.schoolId) {
    filteredProfiles = filteredProfiles.filter(
      (p) => p.schoolId === req.query.schoolId,
    );
  }
  if (req.query.regency) {
    filteredProfiles = filteredProfiles.filter(
      (p) => p.regency === req.query.regency,
    );
  }
  if (req.query.province) {
    filteredProfiles = filteredProfiles.filter(
      (p) => p.province === req.query.province,
    );
  }

  res.json({ profiles: filteredProfiles });
});

router.get("/gss", verifyToken, async (req, res) => {
  const db = await readDB();
  const schoolId = req.query.schoolId;

  let targetProfiles = [];
  let userIds = [];
  if (schoolId) {
    targetProfiles = db.profiles.filter(
      (p) =>
        p.schoolId === schoolId &&
        db.accounts.find((a) => a.id === p.userId)?.role === "student",
    );
    userIds = targetProfiles.map((p) => p.userId);
  } else {
    targetProfiles = [db.profiles.find((p) => p.userId === req.user.id)].filter(
      Boolean,
    );
    userIds = [req.user.id];
  }

  if (targetProfiles.length === 0)
    return res.status(404).json({ error: "No profiles found" });

  const dtResults = (db.dtResults || []).filter((r) =>
    userIds.includes(r.userId),
  );

  dtResults.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  let knowledge = 0;
  let decisionAccuracy = 0;
  let responseTime = 0;
  let consistency = 0;
  let improvement = 0;

  if (dtResults.length > 0) {
    const totalQuizScores = targetProfiles.reduce(
      (sum, p) => sum + (p.totalPoints || 0),
      0,
    );
    knowledge = Math.min(
      100,
      Math.round(totalQuizScores / targetProfiles.length / 50),
    );

    const totalHp = dtResults.reduce((sum, r) => sum + (r.hpRemaining || 0), 0);
    decisionAccuracy = Math.round(totalHp / dtResults.length);

    const totalTime = dtResults.reduce(
      (sum, r) => sum + (r.completionTimeSeconds || 60),
      0,
    );
    const avgTime = totalTime / dtResults.length;
    responseTime = Math.max(
      0,
      Math.min(100, Math.round(100 - ((avgTime - 30) / 90) * 100)),
    );

    consistency = Math.min(100, dtResults.length * 5);

    improvement = Math.min(100, Math.round(decisionAccuracy * 1.1));
  }

  const overall = Math.round((knowledge + decisionAccuracy + responseTime) / 3);

  const history = [
    Math.max(0, overall - 20),
    Math.max(0, overall - 15),
    Math.max(0, overall - 10),
    Math.max(0, overall - 5),
    overall,
  ];

  const metrics = [
    { label: "Knowledge", value: knowledge },
    { label: "Decision Accuracy", value: decisionAccuracy },
    { label: "Response Time", value: responseTime },
    { label: "Learning Consistency", value: consistency },
    { label: "Improvement Index", value: improvement },
  ];

  const milestones = [
    {
      label: "First Simulation",
      done: dtResults.length > 0,
      date: dtResults[0]?.timestamp || new Date().toISOString(),
    },
    {
      label: "High Survival Rate",
      done: decisionAccuracy > 80,
      date: new Date().toISOString(),
    },
    {
      label: "Fast Evacuation",
      done: responseTime > 80,
      date: new Date().toISOString(),
    },
  ];

  res.json({
    success: true,
    data: {
      overall,
      history,
      metrics,
      milestones,
    },
  });
});

router.get("/accounts", verifyToken, async (req, res) => {
  const db = await readDB();
  const safeAccounts = db.accounts.map((a) => ({
    id: a.id,
    name: a.name,
    role: a.role,
  }));
  res.json({ accounts: safeAccounts });
});

export default router;
