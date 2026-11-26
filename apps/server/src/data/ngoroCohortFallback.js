import { HARMONY_EMPIRICAL_VALIDATION_SUMMARY } from "./learningGainData.js";

export const SMAN1_NGORO_SCHOOL_ID = "ffdcdf34-fc99-4209-913e-5a6042e957ad";

export function isEphemeralDemoId(id) {
  const s = String(id || "");
  return s.startsWith("usr-demo-") || s.startsWith("demo-");
}

let cachedFallback = null;

/**
 * Memoized SMAN 1 Ngoro cohort derived from the validated empirical dataset
 * so fallback analytics/profiles/surveys remain populated when external DB is degraded.
 */
export function buildNgoroFallbackData() {
  if (cachedFallback) return cachedFallback;

  const classes = (HARMONY_EMPIRICAL_VALIDATION_SUMMARY.classes || []).map(
    (cls, index) => {
      const section = String(cls.section || index + 1);
      return {
        id: cls.classId,
        name: cls.className || `XI - ${section}`,
        grade: cls.grade || "XI",
        section,
        academicYear: "2026/2027",
        schoolId: SMAN1_NGORO_SCHOOL_ID,
        teacherId: `teacher_sman1ngoro_${section}`,
      };
    },
  );

  const teacherAccounts = classes.map((cls) => ({
    id: cls.teacherId,
    email: `wali.xi${cls.section}@sman1ngoro.sch.id`,
    name: `Wali Kelas ${cls.name}`,
    role: "teacher",
    schoolId: SMAN1_NGORO_SCHOOL_ID,
    grade: "-",
    createdAt: "2026-10-01T00:00:00.000Z",
  }));

  const teacherProfiles = classes.map((cls) => ({
    userId: cls.teacherId,
    name: `Wali Kelas ${cls.name}`,
    role: "teacher",
    schoolId: SMAN1_NGORO_SCHOOL_ID,
    schoolName: "SMAN 1 Ngoro",
    province: "Jawa Timur",
    regency: "Kabupaten Mojokerto",
    grade: "-",
    classId: cls.id,
    classSection: cls.section,
    section: cls.section,
    xp: 2500,
    totalPoints: 2500,
    isPublic: true,
    lastUpdated: "2026-11-18T00:00:00.000Z",
  }));

  const studentAccounts = [];
  const studentProfiles = [];
  const dtResults = [];

  for (const st of HARMONY_EMPIRICAL_VALIDATION_SUMMARY.students || []) {
    const postScore = Math.round(st.postTestScore || 85);
    const accScore = Math.round(st.decisionAccuracy || 85);
    const respSec = Math.round(30 + (st.responseTimeSeconds || 12) * 1.4);
    const xp = Math.round((st.postTestScore || 82) * 15);
    const section = String(st.section || "1");

    studentAccounts.push({
      id: st.id,
      email: st.email,
      name: st.name,
      role: "student",
      schoolId: SMAN1_NGORO_SCHOOL_ID,
      grade: st.grade || "XI",
      createdAt: "2026-10-01T00:00:00.000Z",
    });

    studentProfiles.push({
      userId: st.id,
      name: st.name,
      role: "student",
      schoolId: SMAN1_NGORO_SCHOOL_ID,
      schoolName: "SMAN 1 Ngoro",
      province: "Jawa Timur",
      regency: "Kabupaten Mojokerto",
      grade: st.grade || "XI",
      classId: st.classId,
      classSection: section,
      section,
      gender: "other",
      xp,
      totalPoints: xp,
      topicScores: {
        gempa: postScore,
        banjir: accScore,
        longsor: Math.round(st.learningConsistency || 87),
        tsunami: Math.round(st.transferScore || 83),
        kebakaran: Math.round(postScore * 0.95),
      },
      masteredConcepts: [],
      activities: [],
      pointsHistory: [{ points: xp, timestamp: "2026-11-10T08:00:00.000Z" }],
      isPublic: true,
      lastUpdated: "2026-11-18T00:00:00.000Z",
    });

    dtResults.push({
      id: `dt_ngoro_${st.id}`,
      userId: st.id,
      schoolId: SMAN1_NGORO_SCHOOL_ID,
      outcome: accScore >= 60 ? "success" : "failed",
      hpRemaining: accScore,
      completionTimeSeconds: respSec,
      hazardsEncountered: ["Gempa", "Banjir", "Kebakaran"],
      timestamp: "2026-11-10T08:00:00.000Z",
    });
  }

  cachedFallback = {
    classes,
    teacherAccounts,
    teacherProfiles,
    studentAccounts,
    studentProfiles,
    dtResults,
  };
  return cachedFallback;
}
