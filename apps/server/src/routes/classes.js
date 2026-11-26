import express from "express";
import { readDB, writeDB } from "../repositories/repository.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { HARMONY_EMPIRICAL_VALIDATION_SUMMARY } from "../data/learningGainData.js";

const SMAN1_NGORO_SCHOOL_ID = "ffdcdf34-fc99-4209-913e-5a6042e957ad";
const router = express.Router();

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

const normalizeClassRecord = (c) => {
  const grade =
    c.grade === "X" || c.grade === "10" || !c.grade ? "XI" : c.grade;
  const name = c.section ? `${grade} - ${c.section}` : c.name;
  return { ...c, grade, name };
};

function buildEmpiricalNgoroClasses() {
  return (HARMONY_EMPIRICAL_VALIDATION_SUMMARY.classes || []).map((cls) => ({
    id: cls.classId,
    name: cls.className,
    grade: cls.grade || "XI",
    section: cls.section,
    academicYear: "2026/2027",
    schoolId: SMAN1_NGORO_SCHOOL_ID,
  }));
}

router.get("/", verifyToken, async (req, res) => {
  const db = await readDB();
  const callerRole = req.user.role;
  const classes = (db.classes || [])
    .map(normalizeClassRecord)
    .sort((a, b) => Number(a.section || 0) - Number(b.section || 0));

  if (callerRole === "dev" || callerRole === "developer") {
    return res.json({ classes: classes.length > 0 ? classes : buildEmpiricalNgoroClasses() });
  }

  if (callerRole === "teacher") {
    const schoolId = getCallerSchoolId(db, req.user.id, req.user);
    const schoolClasses = classes.filter((c) => c.schoolId === schoolId);
    if (schoolClasses.length === 0 && schoolId === SMAN1_NGORO_SCHOOL_ID) {
      return res.json({ classes: buildEmpiricalNgoroClasses() });
    }
    return res.json({ classes: schoolClasses });
  }

  if (callerRole === "student") {
    const profile = db.profiles.find((p) => p.userId === req.user.id);
    if (!profile || !profile.classId) {
      return res.json({ classes: [] });
    }
    const myClass = classes.filter((c) => c.id === profile.classId);
    return res.json({ classes: myClass });
  }

  return res.status(403).json({ error: "Access denied" });
});

router.post("/", verifyToken, async (req, res) => {
  const callerRole = req.user.role;
  const db = await readDB();

  if (callerRole !== "teacher") {
    return res.status(403).json({ error: "Only teachers can create classes" });
  }

  const { name, grade, section, academicYear } = req.body;

  if (!name || !grade || !academicYear) {
    return res.status(400).json({ error: "Missing basic fields" });
  }

  const schoolId = getCallerSchoolId(db, req.user.id, req.user);
  if (!schoolId) {
    return res.status(400).json({ error: "Teacher must belong to a school" });
  }

  if (!db.classes) db.classes = [];

  const newClass = {
    id: `cls-${Date.now()}`,
    name,
    grade,
    section: section || "",
    academicYear,
    schoolId,
    teacherId: req.user.id,
    createdAt: new Date().toISOString(),
  };

  db.classes.push(newClass);
  await writeDB(db);

  return res.status(201).json({ success: true, class: newClass });
});

export default router;
