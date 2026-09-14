import express from "express";
import { readDB, writeDB } from "../repositories/repository.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

function getCallerSchoolId(db, userId) {
  const profile = db.profiles.find((p) => p.userId === userId);
  return profile?.schoolId || null;
}

router.get("/", verifyToken, async (req, res) => {
  const db = await readDB();
  const callerRole = req.user.role;
  const classes = db.classes || [];

  if (callerRole === "dev") {
    return res.json({ classes });
  }

  if (callerRole === "teacher") {
    const schoolId = getCallerSchoolId(db, req.user.id);
    const schoolClasses = classes.filter((c) => c.schoolId === schoolId);
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

  const schoolId = getCallerSchoolId(db, req.user.id);
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
