import express from "express";
import { readDB } from "../repositories/repository.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { getBaseSchools } from "./schools.js";

const router = express.Router();

function getCallerSchoolId(db, userId) {
  const profile = db.profiles.find((p) => p.userId === userId);
  return profile?.schoolId || null;
}

router.get("/system", verifyToken, async (req, res) => {
  console.log("[DEBUG] /system route hit. req.user:", req.user);
  if (req.user.role !== "dev" && req.user.role !== "developer") {
    return res.status(403).json({ error: "Access denied" });
  }

  const db = await readDB();

  const totalUsers = db.accounts?.length || 0;
  const teachers = db.accounts?.filter((a) => a.role === "teacher").length || 0;
  const students = db.accounts?.filter((a) => a.role === "student").length || 0;

  const schoolsList = await getBaseSchools();
  const schools = schoolsList?.length || 0;

  const totalSimulations = Object.keys(db.simulations || {}).length;
  const totalRooms = Object.keys(db.dtRooms || {}).length;
  const totalAttempts = db.dtResults?.length || 0;

  res.json({
    success: true,
    data: {
      totalUsers,
      teachers,
      students,
      schools,
      totalSimulations,
      totalRooms,
      totalAttempts,
    },
  });
});

router.get("/class", verifyToken, async (req, res) => {
  if (req.user.role !== "teacher" && req.user.role !== "dev" && req.user.role !== "developer") {
    return res.status(403).json({ error: "Access denied" });
  }

  const db = await readDB();
  const callerSchoolId = getCallerSchoolId(db, req.user.id);

  if (!callerSchoolId) {
    return res.status(403).json({ error: "Not assigned to a school" });
  }

  const classId = req.query.classId || "";
  const classSection = req.query.classSection || "";
  const grade = req.query.grade || "";

  const classProfiles = db.profiles.filter(
    (p) =>
      p.schoolId === callerSchoolId &&
      (classId ? p.classId === classId : grade ? p.grade === grade : true) &&
      (classSection ? p.classSection === classSection : true),
  );

  const studentIds = classProfiles.map((p) => p.userId);

  const studentAccounts = db.accounts
    .filter((a) => studentIds.includes(a.id))
    .map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
    }));

  const results = (db.dtResults || []).filter((r) =>
    studentIds.includes(r.userId),
  );

  let completed = 0;
  let failed = 0;
  let totalScore = 0;
  let totalTime = 0;
  let attemptsWithTime = 0;

  const studentStats = {};

  studentAccounts.forEach((sa) => {
    studentStats[sa.id] = {
      id: sa.id,
      name: sa.name,
      attempts: 0,
      completed: 0,
      failed: 0,
      averageScore: 0,
      averageTime: 0,
      totalHazards: 0,
    };
  });

  results.forEach((r) => {
    if (!studentStats[r.userId]) return; // Should not happen but just in case

    const stats = studentStats[r.userId];
    stats.attempts++;

    const score = r.hpRemaining || 0;

    if (r.outcome === "success") {
      completed++;
      stats.completed++;
    } else {
      failed++;
      stats.failed++;
    }

    totalScore += score;
    stats.averageScore += score;

    if (r.completionTimeSeconds) {
      totalTime += r.completionTimeSeconds;
      attemptsWithTime++;
      stats.averageTime += r.completionTimeSeconds;
    }

    stats.totalHazards += r.hazardsEncountered?.length || 0;

    if (r.hazardsEncountered) {
      r.hazardsEncountered.forEach((hz) => {
        if (!stats.hazardScores) stats.hazardScores = {};
        if (!stats.hazardScores[hz])
          stats.hazardScores[hz] = { score: 0, count: 0 };

        stats.hazardScores[hz].score += score;
        stats.hazardScores[hz].count += 1;
      });
    }
  });

  Object.values(studentStats).forEach((s) => {
    if (s.attempts > 0) {
      s.averageScore = Math.round(s.averageScore / s.attempts);
      s.averageTime = Math.round(s.averageTime / s.attempts);
    }
  });

  const averageScore =
    results.length > 0 ? Math.round(totalScore / results.length) : 0;
  const averageTime =
    attemptsWithTime > 0 ? Math.round(totalTime / attemptsWithTime) : 0;

  const classHazardScores = {};
  Object.values(studentStats).forEach((s) => {
    if (s.hazardScores) {
      Object.keys(s.hazardScores).forEach((hz) => {
        if (!classHazardScores[hz])
          classHazardScores[hz] = { score: 0, count: 0 };
        classHazardScores[hz].score += s.hazardScores[hz].score;
        classHazardScores[hz].count += s.hazardScores[hz].count;
      });
    }
  });

  const radarData = Object.keys(classHazardScores).map((hz) => ({
    subjectKey: `disaster.${hz.toLowerCase()}`,
    class: Math.round(
      classHazardScores[hz].score / classHazardScores[hz].count,
    ),
  }));
  const barData = radarData.map((r) => ({
    nameKey: r.subjectKey,
    score: r.class,
  }));

  res.json({
    success: true,
    data: {
      overview: {
        totalStudents: studentIds.length,
        totalAttempts: results.length,
        completed,
        failed,
        averageScore,
        averageTime,
      },
      students: Object.values(studentStats),
      radarData: radarData.length > 0 ? radarData : null,
      barData: barData.length > 0 ? barData : null,
    },
  });
});

router.get("/sri", verifyToken, async (req, res) => {
  const db = await readDB();
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  const targetSchoolId = req.query.schoolId || callerSchoolId;

  if (!targetSchoolId || targetSchoolId === "unknown") {
    return res
      .status(400)
      .json({ error: "School ID required or not assigned to a school" });
  }

  const schoolProfiles = db.profiles.filter(
    (p) => p.schoolId === targetSchoolId,
  );
  if (schoolProfiles.length === 0) {
    return res.json({
      success: true,
      data: {
        hasRealData: false,
        metrics: null,
        radarData: null,
      },
    });
  }

  const studentIds = schoolProfiles.map((p) => p.userId);
  const schoolResults = (db.dtResults || []).filter((r) =>
    studentIds.includes(r.userId),
  );

  let t1Total = 0,
    t2Total = 0,
    t3Total = 0,
    pointsTotal = 0;
  schoolProfiles.forEach((p) => {
    t1Total +=
      p.topicScores?.t1?.averageScore ||
      (typeof p.topicScores?.t1 === "number" ? p.topicScores?.t1 : 0);
    t2Total +=
      p.topicScores?.t2?.averageScore ||
      (typeof p.topicScores?.t2 === "number" ? p.topicScores?.t2 : 0);
    t3Total +=
      p.topicScores?.t3?.averageScore ||
      (typeof p.topicScores?.t3 === "number" ? p.topicScores?.t3 : 0);
    pointsTotal += p.totalPoints || 0;
  });

  const knowledge =
    Math.round((t1Total + t2Total + t3Total) / (3 * schoolProfiles.length)) ||
    0;
  const consistency =
    Math.min(100, Math.round(pointsTotal / schoolProfiles.length / 5)) || 0; // average points / 500 * 100

  let simulation = 0;
  let evacuation = 0;

  if (schoolResults.length > 0) {
    let totalHp = 0;
    let totalTime = 0;

    schoolResults.forEach((r) => {
      totalHp += r.hpRemaining || 0;
      totalTime += r.completionTimeSeconds || 60;
    });

    simulation = Math.round(totalHp / schoolResults.length) || 0;
    let avgTime = totalTime / schoolResults.length;
    evacuation =
      Math.max(
        0,
        Math.min(100, Math.round(100 - ((avgTime - 30) / 90) * 100)),
      ) || 0;
  }

  const overall =
    Math.round((knowledge + simulation + evacuation + consistency) / 4) || 0;

  const uniqueStudentsWithResults = new Set(schoolResults.map((r) => r.userId))
    .size;
  const participation =
    Math.round((uniqueStudentsWithResults / schoolProfiles.length) * 100) || 0;

  const recommendations = [];
  if (evacuation < 60) {
    recommendations.push({
      icon: "Route",
      titleKey: "Jalur Evakuasi",
      detailKey: `Waktu rata-rata evakuasi kelas lambat (${evacuation}%). Banyak siswa kesulitan merespons tepat waktu.`,
      accent: "from-red-500 to-orange-500",
    });
  } else {
    recommendations.push({
      icon: "Route",
      titleKey: "Jalur Evakuasi Cepat",
      detailKey:
        "Evakuasi berjalan efisien. Pertahankan atau tingkatkan dengan skenario bencana ganda.",
      accent: "from-emerald-500 to-teal-500",
    });
  }

  if (knowledge < 70) {
    recommendations.push({
      icon: "GraduationCap",
      titleKey: "Peningkatan Pengetahuan",
      detailKey: `Skor pemahaman kuis (${knowledge}%) di bawah target. Perlu intervensi materi gempa.`,
      accent: "from-amber-500 to-orange-600",
    });
  } else {
    recommendations.push({
      icon: "GraduationCap",
      titleKey: "Pemahaman Kuat",
      detailKey: "Siswa memahami teori dengan baik. Fokuskan ke simulasi.",
      accent: "from-brand-500 to-brand-600",
    });
  }

  if (simulation < 75) {
    recommendations.push({
      icon: "Shield",
      titleKey: "Latihan Kembaran Digital",
      detailKey: "Banyak kesalahan (HP rendah) saat mengambil rute darurat.",
      accent: "from-rose-500 to-red-600",
    });
  } else {
    recommendations.push({
      icon: "Trophy",
      titleKey: "Kesiapsiagaan Sangat Baik",
      detailKey:
        "Akurasi simulasi tinggi, siswa dapat mengambil keputusan yang aman.",
      accent: "from-brand-400 to-brand-600",
    });
  }

  res.json({
    success: true,
    data: {
      hasRealData: true,
      metrics: {
        knowledge,
        simulation,
        evacuation,
        consistency,
        overall,
        len: schoolProfiles.length,
        participation,
      },
      radarData: [
        { subject: "Pengetahuan Bencana", A: knowledge, fullMark: 100 },
        { subject: "Akurasi Keputusan (Sim)", A: simulation, fullMark: 100 },
        { subject: "Waktu Evakuasi", A: evacuation, fullMark: 100 },
        { subject: "Konsistensi Belajar", A: consistency, fullMark: 100 },
        { subject: "Tingkat Partisipasi", A: participation, fullMark: 100 },
      ],
      recommendations,
    },
  });
});

export default router;
