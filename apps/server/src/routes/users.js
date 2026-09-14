import express from "express";
import bcrypt from "bcryptjs";
import { readDB, writeDB } from "../repositories/repository.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { getBaseSchools } from "./schools.js";

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

function getCallerSchoolId(db, userId) {
  const profile = db.profiles.find((p) => p.userId === userId);
  return profile?.schoolId || null;
}

router.get("/", verifyToken, async (req, res) => {
  const db = await readDB();
  const callerRole = req.user.role;

  if (callerRole === "dev") {
    const safeAccounts = db.accounts.map((a) => {
      const { passwordHash: _, ...safe } = a;
      return safe;
    });
    return res.json({
      users: safeAccounts,
      profiles: db.profiles.map(normalizeProfile),
    });
  }

  if (callerRole === "teacher") {
    const callerSchoolId = getCallerSchoolId(db, req.user.id);
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
  const callerSchoolId = getCallerSchoolId(db, req.user.id);

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

  if (schoolId !== undefined && callerRole === "dev") {
    targetProfile.schoolId = schoolId;
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

router.post("/me/school", verifyToken, async (req, res) => {
  const db = await readDB();
  const userId = req.user.id;
  const { schoolId } = req.body;

  if (!schoolId) {
    return res.status(400).json({ error: "schoolId is required" });
  }

  const profileIndex = db.profiles.findIndex((p) => p.userId === userId);
  if (profileIndex === -1) {
    return res.status(404).json({ error: "Profile not found" });
  }

  const profile = db.profiles[profileIndex];

  if (
    profile.schoolId &&
    profile.schoolId !== "unknown" &&
    req.user.role !== "dev"
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

export default router;
