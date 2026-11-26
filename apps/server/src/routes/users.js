import express from "express";
import bcrypt from "bcryptjs";
import { readDB, writeDB } from "../repositories/repository.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { getBaseSchools } from "./schools.js";
import { HARMONY_EMPIRICAL_VALIDATION_SUMMARY } from "../data/learningGainData.js";

const SMAN1_NGORO_SCHOOL_ID = "ffdcdf34-fc99-4209-913e-5a6042e957ad";
const router = express.Router();

function normalizeProfile(p) {
  if (!p) return p;
  return {
    ...p,
    classSection: p.classSection ?? p.section ?? "",
    section: p.section ?? p.classSection ?? "",
    totalPoints: p.totalPoints ?? p.xp ?? 0,
    badges: p.badges ?? p.achievements ?? [],
    topicScores: p.topicScores ?? {},
    masteredConcepts: p.masteredConcepts ?? [],
    activities: p.activities ?? [],
    pointsHistory: p.pointsHistory ?? [],
  };
}

function getCallerSchoolId(db, userId, reqUser = null) {
  const profile = db.profiles.find((p) => p.userId === userId);
  if (profile?.schoolId) return profile.schoolId;
  if (reqUser?.schoolId) return reqUser.schoolId;
  const email = String(reqUser?.email || "").toLowerCase();
  if (reqUser?.isDemo || email.endsWith("@sman1ngoro.sch.id")) {
    return SMAN1_NGORO_SCHOOL_ID;
  }
  return null;
}

function buildEmpiricalNgoroFallbackCohort() {
  const users = [];
  const profiles = [];
  for (const st of HARMONY_EMPIRICAL_VALIDATION_SUMMARY.students || []) {
    users.push({
      id: st.id,
      email: st.email,
      name: st.name,
      role: "student",
      schoolId: SMAN1_NGORO_SCHOOL_ID,
      grade: st.grade || "XI",
      createdAt: "2026-10-01T00:00:00.000Z",
    });
    profiles.push(
      normalizeProfile({
        userId: st.id,
        schoolId: SMAN1_NGORO_SCHOOL_ID,
        schoolName: "SMAN 1 Ngoro",
        grade: st.grade || "XI",
        classId: st.classId,
        classSection: st.section,
        section: st.section,
        gender: "other",
        xp: Math.round((st.postTestScore || 80) * 15),
        totalPoints: Math.round((st.postTestScore || 80) * 15),
        topicScores: {
          gempa: Math.round(st.postTestScore || 85),
          banjir: Math.round(st.decisionAccuracy || 85),
          longsor: Math.round(st.learningConsistency || 85),
          tsunami: Math.round(st.transferScore || 83),
          kebakaran: Math.round((st.postTestScore || 85) * 0.95),
        },
        lastUpdated: "2026-11-18T00:00:00.000Z",
      }),
    );
  }
  return { users, profiles };
}

router.get("/", verifyToken, async (req, res) => {
  const db = await readDB();
  const callerRole = req.user.role;

  if (callerRole === "dev" || callerRole === "developer") {
    const safeAccounts = db.accounts.map((a) => {
      const { passwordHash: _, ...safe } = a;
      return safe;
    });
    const hasCohortStudents = safeAccounts.some((a) => a.role === "student" && !String(a.id || "").startsWith("usr-demo-"));
    if (!hasCohortStudents) {
      const fallback = buildEmpiricalNgoroFallbackCohort();
      return res.json({
        users: [...safeAccounts, ...fallback.users],
        profiles: [...db.profiles.map(normalizeProfile), ...fallback.profiles],
      });
    }
    return res.json({
      users: safeAccounts,
      profiles: db.profiles.map(normalizeProfile),
    });
  }

  if (callerRole === "teacher") {
    const callerSchoolId = getCallerSchoolId(db, req.user.id, req.user);
    if (!callerSchoolId) {
      return res
        .status(403)
        .json({ error: "Teacher not assigned to a school" });
    }

    const studentProfiles = db.profiles.filter(
      (p) => p.schoolId === callerSchoolId,
    );
    const studentUserIds = studentProfiles.map((p) => p.userId);
    const safeAccounts = db.accounts
      .filter((a) => studentUserIds.includes(a.id) && a.role === "student")
      .map((a) => {
        const { passwordHash: _, ...safe } = a;
        return safe;
      });

    if (
      callerSchoolId === SMAN1_NGORO_SCHOOL_ID &&
      !safeAccounts.some((a) => !String(a.id || "").startsWith("usr-demo-"))
    ) {
      const fallback = buildEmpiricalNgoroFallbackCohort();
      return res.json({
        users: [...safeAccounts, ...fallback.users],
        profiles: [
          ...studentProfiles.filter((p) => safeAccounts.some((a) => a.id === p.userId)).map(normalizeProfile),
          ...fallback.profiles,
        ],
      });
    }

    return res.json({
      users: safeAccounts,
      profiles: studentProfiles.map(normalizeProfile),
    });
  }

  return res.status(403).json({ error: "Access denied" });
});

router.post("/", verifyToken, async (req, res) => {
  const callerRole = req.user.role;
  const db = await readDB();
  const callerSchoolId = getCallerSchoolId(db, req.user.id, req.user);

  const {
    name,
    email,
    password,
    role,
    gender,
    grade,
    classSection,
    schoolId,
    dob,
    classId,
  } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "Missing basic fields" });
  }

  if (callerRole === "student") {
    return res.status(403).json({ error: "Students cannot create users" });
  }

  if (callerRole === "teacher") {
    if (role !== "student") {
      return res
        .status(403)
        .json({ error: "Teachers can only create students" });
    }
    if (schoolId && schoolId !== callerSchoolId) {
      return res
        .status(403)
        .json({ error: "Cannot create students outside your school" });
    }
  }

  const exists = db.accounts.find(
    (a) => a.email.toLowerCase() === email.toLowerCase(),
  );
  if (exists) return res.status(400).json({ error: "Email already exists" });

  try {
    const id = `usr-${Date.now()}`;
    const passwordHash = await bcrypt.hash(password, 10);

    const account = {
      id,
      email,
      passwordHash,
      name,
      role,
      createdAt: new Date().toISOString(),
    };
    db.accounts.push(account);

    const targetSchoolId =
      callerRole === "teacher" ? callerSchoolId : schoolId || "unknown";

    const profile = {
      userId: id,
      schoolId: targetSchoolId,
      grade: grade || "X",
      classSection: role === "student" ? classSection || "" : "",
      ...(role === "student" && classId ? { classId } : {}),
      gender: gender || "other",
      dob: dob || null,
      topicScores: {},
      totalPoints: 0,
      lastUpdated: new Date().toISOString(),
    };
    db.profiles.push(profile);

    await writeDB(db);

    const { passwordHash: _, ...safeAccount } = account;
    res.status(201).json({ success: true, account: safeAccount, profile });
  } catch (error) {
    console.error("[USERS API ERROR]", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", verifyToken, async (req, res) => {
  const targetUserId = req.params.id;
  const callerRole = req.user.role;
  const db = await readDB();

  const accountIndex = db.accounts.findIndex((a) => a.id === targetUserId);
  const profileIndex = db.profiles.findIndex((p) => p.userId === targetUserId);

  if (accountIndex === -1 || profileIndex === -1) {
    return res.status(404).json({ error: "User not found" });
  }

  const targetAccount = db.accounts[accountIndex];
  const targetProfile = db.profiles[profileIndex];

  if (callerRole === "student" && req.user.id !== targetUserId) {
    return res.status(403).json({ error: "Access denied" });
  }

  if (callerRole === "teacher") {
    const callerSchoolId = getCallerSchoolId(db, req.user.id);
    if (
      targetProfile.schoolId !== callerSchoolId ||
      targetAccount.role !== "student"
    ) {
      return res
        .status(403)
        .json({ error: "Teachers can only edit their own students" });
    }
  }

  const { name, password, schoolId, grade, classSection, classId } = req.body;

  if (name !== undefined) targetAccount.name = name;
  if (password && password.length >= 6) {
    targetAccount.passwordHash = await bcrypt.hash(password, 10);
  }

  if (
    schoolId !== undefined &&
    (callerRole === "dev" || callerRole === "developer") &&
    !isDemoNgoroAccount(targetAccount)
  ) {
    targetProfile.schoolId = schoolId;
  } else if (isDemoNgoroAccount(targetAccount)) {
    targetProfile.schoolId = SMAN1_NGORO_SCHOOL_ID;
  }

  if (grade !== undefined) targetProfile.grade = grade;
  if (classSection !== undefined) targetProfile.classSection = classSection;
  if (classId !== undefined) targetProfile.classId = classId;

  targetProfile.lastUpdated = new Date().toISOString();

  db.accounts[accountIndex] = targetAccount;
  db.profiles[profileIndex] = targetProfile;
  await writeDB(db);

  const { passwordHash: _, ...safeAccount } = targetAccount;
  res.json({ success: true, account: safeAccount, profile: targetProfile });
});

function isDemoNgoroAccount(account) {
  const email = String(account?.email || "").toLowerCase();
  return (
    email === "raihanansari3345@gmail.com" ||
    email.endsWith("@sman1ngoro.sch.id") ||
    String(account?.id || "").startsWith("usr-demo-")
  );
}

router.post("/me/school", verifyToken, async (req, res) => {
  const db = await readDB();
  const userId = req.user.id;
  const { schoolId } = req.body;

  if (!schoolId) {
    return res.status(400).json({ error: "schoolId is required" });
  }

  const account = db.accounts.find((a) => a.id === userId);
  if (isDemoNgoroAccount(account) && schoolId !== SMAN1_NGORO_SCHOOL_ID) {
    return res.status(403).json({
      error: "Akun demo hanya terhubung ke SMAN 1 Ngoro.",
    });
  }

  const profileIndex = db.profiles.findIndex((p) => p.userId === userId);
  if (profileIndex === -1) {
    return res.status(404).json({ error: "Profile not found" });
  }

  const profile = db.profiles[profileIndex];

  if (
    profile.schoolId &&
    profile.schoolId !== "unknown" &&
    req.user.role !== "dev" && req.user.role !== "developer"
  ) {
    return res.status(403).json({
      error: "School already assigned. Only a DEV can change your school.",
    });
  }

  const schools = await getBaseSchools();
  const schoolExists = schools.find(
    (s) => s.id === schoolId || s.school_id === schoolId,
  );
  if (!schoolExists) {
    return res.status(400).json({ error: "Invalid school ID" });
  }

  db.profiles[profileIndex].schoolId = schoolId;
  db.profiles[profileIndex].lastUpdated = new Date().toISOString();

  await writeDB(db);

  return res.json({ success: true, profile: db.profiles[profileIndex] });
});

router.delete("/:id", verifyToken, async (req, res) => {
  const targetUserId = req.params.id;
  const callerRole = req.user.role;
  
  if (callerRole !== "developer" && callerRole !== "dev") {
    return res.status(403).json({ error: "Only developers can delete accounts" });
  }

  const db = await readDB();
  const accountIndex = db.accounts.findIndex((a) => a.id === targetUserId);
  if (accountIndex === -1) {
    return res.status(404).json({ error: "User not found" });
  }

  // Remove from accounts
  db.accounts.splice(accountIndex, 1);
  
  // Remove from profiles
  const profileIndex = db.profiles.findIndex((p) => p.userId === targetUserId);
  if (profileIndex !== -1) {
    db.profiles.splice(profileIndex, 1);
  }

  await writeDB(db);
  res.json({ success: true, message: "Account deleted successfully" });
});

export default router;
