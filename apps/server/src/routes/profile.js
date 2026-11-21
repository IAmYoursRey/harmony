import express from "express";
import {
  readDB,
  writeDB,
  uploadBase64,
  getAccountById,
  getProfileByUserId,
  saveProfile,
  isPgQuotaOrUnavailableError,
} from "../repositories/repository.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { getBaseSchools } from "./schools.js";

const router = express.Router();
const SMAN1_NGORO_SCHOOL_ID = "ffdcdf34-fc99-4209-913e-5a6042e957ad";

function isFixedDemoUser(user, account) {
  const email = (account?.email || user?.email || "").toLowerCase();
  return Boolean(
    user?.isDemo ||
      account?.isDemo ||
      user?.role === "developer" ||
      email === "raihanansari3345@gmail.com" ||
      email.endsWith("@sman1ngoro.sch.id") ||
      user?.id?.includes("sman1ngoro") ||
      String(user?.id || "").startsWith("usr-demo-") ||
      String(user?.id || "").startsWith("demo-")
  );
}

router.get("/", verifyToken, async (req, res) => {
  try {
    const [existingProfile, account] = await Promise.all([
      getProfileByUserId(req.user.id),
      getAccountById(req.user.id),
    ]);
    const isNgoroUser = isFixedDemoUser(req.user, account);
    let profile = existingProfile;

    if (!profile) {
      const normalizedRole =
        account?.role || (req.user.role === "dev" ? "developer" : req.user.role) || "student";
      profile = {
        userId: req.user.id,
        name: account?.name || req.user.name || "Pengguna SMAN 1 Ngoro",
        role: normalizedRole,
        gender: "other",
        grade: normalizedRole === "teacher" || normalizedRole === "developer" ? "-" : "X",
        section: "1",
        classSection: "1",
        schoolId: isNgoroUser ? SMAN1_NGORO_SCHOOL_ID : null,
        schoolName: isNgoroUser ? "SMAN 1 Ngoro" : null,
        province: isNgoroUser ? "Jawa Timur" : null,
        regency: isNgoroUser ? "Kabupaten Mojokerto" : null,
        xp: 1200,
        level: 2,
        achievements: [],
        joinedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };
      await saveProfile(profile);
    } else if (isNgoroUser && profile.schoolId !== SMAN1_NGORO_SCHOOL_ID) {
      profile.schoolId = SMAN1_NGORO_SCHOOL_ID;
      profile.schoolName = "SMAN 1 Ngoro";
      profile.province = "Jawa Timur";
      profile.regency = "Kabupaten Mojokerto";
      await saveProfile(profile);
    }
    res.json({ profile });
  } catch (err) {
    console.error("[PROFILE ERROR] GET /:", err);
    if (isPgQuotaOrUnavailableError(err)) {
      return res.status(503).json({
        error: "Database utama sedang melampaui kuota (kode 53000).",
        code: "DB_QUOTA_EXCEEDED",
      });
    }
    res.status(500).json({ error: "Failed to load profile" });
  }
});

router.post("/", verifyToken, async (req, res) => {
  try {
    const [existing, account] = await Promise.all([
      getProfileByUserId(req.user.id),
      getAccountById(req.user.id),
    ]);

    const { schoolId, ...safeBody } = req.body || {};

    if (safeBody.avatar && safeBody.avatar.startsWith("data:image")) {
      safeBody.avatar = await uploadBase64(safeBody.avatar, `avatar_${req.user.id}_${Date.now()}`);
    }

    const lockedMeta = isFixedDemoUser(req.user, account)
      ? {
          schoolId: SMAN1_NGORO_SCHOOL_ID,
          schoolName: "SMAN 1 Ngoro",
          province: "Jawa Timur",
          regency: "Kabupaten Mojokerto",
        }
      : {};

    const updated = {
      ...(existing || {}),
      ...safeBody,
      ...lockedMeta,
      userId: req.user.id,
      lastUpdated: new Date().toISOString(),
    };
    await saveProfile(updated);
    return res.json({ profile: updated });
  } catch (err) {
    console.error("[PROFILE ERROR] POST /:", err);
    if (isPgQuotaOrUnavailableError(err)) {
      return res.status(503).json({
        error: "Database utama sedang melampaui kuota (kode 53000).",
        code: "DB_QUOTA_EXCEEDED",
      });
    }
    res.status(500).json({ error: "Failed to update profile" });
  }
});

router.get("/all", verifyToken, async (req, res) => {
  const db = await readDB();
  const schools = await getBaseSchools();

  const enrichedProfiles = db.profiles.map((p) => {
    const dbSchool = (db.schools || []).find((s) => s.id === p.schoolId);
    const school =
      p.schoolId && p.schoolId !== "unknown"
        ? dbSchool || schools.find((s) => s.id === p.schoolId || s.school_id === p.schoolId)
        : null;

    return {
      ...p,
      schoolName: p.schoolName || (school ? school.name || school.school_name : p.schoolId),
      province: p.province || (school ? school.province : "Jawa Timur"),
      regency: p.regency || (school ? school.regency : "Mojokerto"),
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

  const requesterAccount = db.accounts.find((a) => a.id === req.user.id);
  const isTeacher = requesterAccount && requesterAccount.role === "teacher";

  if (!isTeacher) {
    // For non-teachers, only show profiles that are public (isPublic is true or undefined/default true)
    filteredProfiles = filteredProfiles.filter((p) => p.isPublic !== false);
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

  // If no profiles found, the logic below will safely calculate 0 for all metrics

  const dtResults = (db.dtResults || []).filter((r) =>
    userIds.includes(r.userId),
  );

  dtResults.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  let knowledge = 82;
  let decisionAccuracy = 85;
  let responseTime = 87;
  let consistency = 89;
  let improvement = 74;

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

    improvement = Math.max(74, Math.min(100, Math.round(decisionAccuracy * 1.1)));
  }

  const overall = Math.round((knowledge + decisionAccuracy + responseTime) / 3);

  // Real historical progression from actual simulation attempts and points history
  let history = [];
  if (dtResults.length > 1) {
    history = dtResults.map((_, idx) => {
      const slice = dtResults.slice(0, idx + 1);
      const avgHp = Math.round(slice.reduce((sum, x) => sum + (x.hpRemaining || 0), 0) / slice.length);
      return Math.min(100, Math.max(0, avgHp));
    });
  } else if (targetProfiles[0]?.pointsHistory?.length > 1) {
    history = targetProfiles[0].pointsHistory.map((ph) => Math.min(100, Math.round(ph.points / 50)));
  } else if (overall > 0) {
    history = [overall];
  } else {
    history = [0];
  }

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
    gss: {
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
