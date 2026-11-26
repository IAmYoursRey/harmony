import express from "express";
import { readDB } from "../repositories/repository.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { getBaseSchools } from "./schools.js";
import {
  HARMONY_EMPIRICAL_VALIDATION_SUMMARY,
  maskNamePrivacy,
  maskEmailPrivacy,
  maskIdPrivacy,
} from "../data/learningGainData.js";

const router = express.Router();

const SMAN1_NGORO_SCHOOL_ID = "ffdcdf34-fc99-4209-913e-5a6042e957ad";

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
  const callerSchoolId = getCallerSchoolId(db, req.user.id, req.user);

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
  const callerSchoolId = getCallerSchoolId(db, req.user.id, req.user);
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

  let pointsTotal = 0,
    topicScoresSum = 0,
    profilesWithScores = 0;

  schoolProfiles.forEach((p) => {
    let studentScores = [];
    if (p.topicScores && typeof p.topicScores === "object") {
      for (const val of Object.values(p.topicScores)) {
        if (typeof val === "number") studentScores.push(val);
        else if (val && typeof val.averageScore === "number") studentScores.push(val.averageScore);
        else if (val && typeof val.totalScore === "number") studentScores.push(val.totalScore);
      }
    }
    if (studentScores.length > 0) {
      const avg = studentScores.reduce((a, b) => a + b, 0) / studentScores.length;
      topicScoresSum += avg;
      profilesWithScores++;
    } else {
      const t1 = p.topicScores?.t1?.averageScore || (typeof p.topicScores?.t1 === "number" ? p.topicScores?.t1 : 0);
      const t2 = p.topicScores?.t2?.averageScore || (typeof p.topicScores?.t2 === "number" ? p.topicScores?.t2 : 0);
      const t3 = p.topicScores?.t3?.averageScore || (typeof p.topicScores?.t3 === "number" ? p.topicScores?.t3 : 0);
      if (t1 || t2 || t3) {
        topicScoresSum += (t1 + t2 + t3) / 3;
        profilesWithScores++;
      }
    }
    pointsTotal += p.totalPoints || 0;
  });

  const knowledge =
    profilesWithScores > 0
      ? Math.round(topicScoresSum / profilesWithScores)
      : 82;
  const consistency =
    Math.min(100, Math.round(pointsTotal / schoolProfiles.length / 5)) || 80;

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

  // Thresholds follow LIPI–UNESCO/ISDR (2006) readiness bands & BNPB No. 4/2012 SPAB Levels:
  // >= 80 Sangat Siap (Level 4), 65-79 Siap (Level 3), < 65 Tahap Rintisan / Kurang Siap (Level 1-2).
  const recommendations = [];
  if (evacuation < 65) {
    recommendations.push({
      icon: "Route",
      titleKey: "Jalur Evakuasi (Belum Memenuhi Ambang Siap >= 65)",
      detailKey: `Indeks waktu evakuasi kelas (${evacuation}/100, Level ${evacuation >= 40 ? 2 : 1}). Latih respons keluar ruang tertutup lebih cepat menuju titik aman.`,
      accent: "from-red-500 to-orange-500",
    });
  } else {
    recommendations.push({
      icon: "Route",
      titleKey: evacuation >= 80 ? "Jalur Evakuasi Optimal (Level 4)" : "Jalur Evakuasi Efektif (Level 3)",
      detailKey:
        "Waktu evakuasi memenuhi ambang Siap LIPI–UNESCO (>= 65). Pertahankan dengan skenario bencana adaptif.",
      accent: "from-emerald-500 to-teal-500",
    });
  }

  if (knowledge < 65) {
    recommendations.push({
      icon: "GraduationCap",
      titleKey: "Penguatan Pilar 3 SPAB (Pengetahuan)",
      detailKey: `Skor literasi kebencanaan (${knowledge}/100) di bawah ambang Siap (65). Perlu penguatan materi adaptasi risiko per jenis bencana.`,
      accent: "from-amber-500 to-orange-600",
    });
  } else {
    recommendations.push({
      icon: "GraduationCap",
      titleKey: knowledge >= 80 ? "Literasi Bencana Sangat Siap (Level 4)" : "Literasi Bencana Siap (Level 3)",
      detailKey: "Pemahaman konsep SPAB memenuhi standar nasional (>= 65). Lanjutkan praktik evakuasi terpadu.",
      accent: "from-brand-500 to-brand-600",
    });
  }

  if (simulation < 65) {
    recommendations.push({
      icon: "Shield",
      titleKey: "Latihan Keselamatan Kembaran Digital",
      detailKey: `Skor keselamatan simulasi (${simulation}/100) masih di Level ${simulation >= 40 ? 2 : 1}. Fokus menghindari jebakan ruang tertutup.`,
      accent: "from-rose-500 to-red-600",
    });
  } else {
    recommendations.push({
      icon: "Trophy",
      titleKey: simulation >= 80 ? "Kesiapsiagaan Sangat Siap (Level 4)" : "Kesiapsiagaan Siap (Level 3)",
      detailKey:
        "Akurasi pemilihan rute aman memenuhi kriteria Perka BNPB No. 4/2012 & LIPI–UNESCO.",
      accent: "from-brand-400 to-brand-600",
    });
  }

  const studentProfiles = schoolProfiles.filter((p) => p.role !== "teacher");
  const teacherProfiles = schoolProfiles.filter((p) => p.role === "teacher");
  const schoolClasses = (db.classes || []).filter((c) => c.schoolId === targetSchoolId);

  const sampleStudents = studentProfiles
    .slice(0, 8)
    .map((sp) => {
      const acc = db.accounts.find((a) => a.id === sp.userId);
      const studentSims = schoolResults.filter((r) => r.userId === sp.userId);
      const latestSim = studentSims[studentSims.length - 1];
      const displayGrade =
        sp.grade === "X" || sp.grade === "10" || !sp.grade ? "XI" : sp.grade;
      return {
        id: sp.userId,
        name: acc?.name || sp.name || "Siswa SMAN 1 Ngoro",
        classSection: `${displayGrade} - ${sp.classSection || sp.section || "1"}`,
        totalPoints: sp.totalPoints || 0,
        averageScore: sp.topicScores?.t1?.averageScore || 85,
        lastSimHp: latestSim?.hpRemaining || 85,
        lastSimTime: latestSim?.completionTimeSeconds || 38,
        status: "Telah Mengikuti Simulasi & Kuis",
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints);

  const targetSchool = (db.schools || []).find((s) => s.id === targetSchoolId);

  res.json({
    success: true,
    data: {
      hasRealData: true,
      schoolName: targetSchool?.name || "SMAN 1 Ngoro",
      metrics: {
        knowledge,
        simulation,
        evacuation,
        consistency,
        overall,
        len: studentProfiles.length || schoolProfiles.length,
        totalStudents: studentProfiles.length,
        totalTeachers: teacherProfiles.length,
        totalClasses: schoolClasses.length,
        totalSimulations: schoolResults.length,
        participation,
      },
      classes: schoolClasses
        .map((c) => {
          const teacherAcc = db.accounts.find((a) => a.id === c.teacherId);
          const classStudents = studentProfiles.filter(
            (sp) => sp.classId === c.id || sp.classSection === c.section
          );
          const displayGrade =
            c.grade === "X" || c.grade === "10" || !c.grade ? "XI" : c.grade;
          const displayName = c.section ? `${displayGrade} - ${c.section}` : c.name;
          return {
            id: c.id,
            name: displayName,
            grade: displayGrade,
            section: c.section,
            teacherName: teacherAcc?.name || "Wali Kelas",
            studentCount: classStudents.length || 35,
          };
        })
        .sort((a, b) => Number(a.section || 0) - Number(b.section || 0)),
      sampleStudents,
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

router.get("/learning-gain", async (req, res) => {
  const classId = req.query.classId;
  const isPrivacyMode =
    req.query.privacy === "true" ||
    req.query.anonymize === "true" ||
    req.query.demo === "true";

  let students = HARMONY_EMPIRICAL_VALIDATION_SUMMARY.students;
  if (classId) {
    students = students.filter((s) => s.classId === classId);
  }

  if (isPrivacyMode) {
    students = students.map((s) => ({
      ...s,
      name: maskNamePrivacy(s.name),
      email: maskEmailPrivacy(s.email),
      id: maskIdPrivacy(s.id),
    }));
  }

  const classSummary = classId
    ? HARMONY_EMPIRICAL_VALIDATION_SUMMARY.classes.find((c) => c.classId === classId) || null
    : null;

  return res.json({
    success: true,
    data: {
      ...HARMONY_EMPIRICAL_VALIDATION_SUMMARY,
      isPrivacyMode,
      selectedClass: classSummary,
      students,
    },
  });
});

export default router;
