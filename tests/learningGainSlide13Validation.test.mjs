import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("Slide 13 PPT Parameter Keberhasilan & Learning Gain (0.7+) data integrity", async () => {
  const learningGainSrc = fs.readFileSync(
    path.resolve(process.cwd(), "apps/web/src/data/learningGainData.ts"),
    "utf8"
  );

  assert.match(learningGainSrc, /HARMONY_SLIDE_13_PARAMETERS/);
  assert.match(learningGainSrc, /learning_gain/);
  assert.match(learningGainSrc, /decision_accuracy/);
  assert.match(learningGainSrc, /response_efficiency/);
  assert.match(learningGainSrc, /learning_consistency/);
  assert.match(learningGainSrc, /transfer_of_learning/);

  // Check N-Gain = 0.74 (Target Slide 13: di atas / minimal 0,7)
  assert.match(learningGainSrc, /achievedValue:\s*0\.74/);
  assert.match(learningGainSrc, /achievedValue:\s*85/);
  assert.match(learningGainSrc, /achievedValue:\s*87/);
  assert.match(learningGainSrc, /achievedValue:\s*89/);
  assert.match(learningGainSrc, /achievedValue:\s*83/);
  assert.match(learningGainSrc, /Kategori Tinggi/);
  assert.match(learningGainSrc, /Richard R\. Hake \(1998\)/);
  assert.match(learningGainSrc, /HARMONY_OFFICIAL_TRIAL_NARRATIVE/);
  assert.match(learningGainSrc, /isCrucialBenchmark:\s*true/);

  // Check server endpoint and GeoBot AI instruction
  const serverAnalyticsSrc = fs.readFileSync(
    path.resolve(process.cwd(), "apps/server/src/routes/analytics.js"),
    "utf8"
  );
  assert.match(serverAnalyticsSrc, /\/learning-gain/);

  const geoAiPromptSrc = fs.readFileSync(
    path.resolve(process.cwd(), "apps/server/src/services/geoAiContextService.js"),
    "utf8"
  );
  assert.match(geoAiPromptSrc, /DATA VALIDASI EMPIRIS & LEARNING GAIN SLIDE 13 PPT HARMONY/);
  assert.match(geoAiPromptSrc, /0,74/);
  assert.match(geoAiPromptSrc, /85 persen/);
  assert.match(geoAiPromptSrc, /87 persen/);
  assert.match(geoAiPromptSrc, /89 persen/);
  assert.match(geoAiPromptSrc, /83 persen/);
  assert.match(geoAiPromptSrc, /Richard R\. Hake/);
});

test("TeacherDashboardView and SurveyAnalyticsView include Learning Gain navigation", () => {
  const teacherSrc = fs.readFileSync(
    path.resolve(process.cwd(), "apps/web/src/components/dashboard/views/roles/TeacherDashboardView.tsx"),
    "utf8"
  );
  assert.match(teacherSrc, /learning-gain/);
  assert.match(teacherSrc, /LearningGainEvaluationView/);
  assert.match(teacherSrc, /Learning Gain \(0,7\+\)/);

  const surveySrc = fs.readFileSync(
    path.resolve(process.cwd(), "apps/web/src/components/dashboard/views/analytics/SurveyAnalyticsView.tsx"),
    "utf8"
  );
  assert.match(surveySrc, /Evaluasi Empiris SPAB/);
  assert.match(surveySrc, /N-Gain = 0,74/);
  assert.match(surveySrc, /learning-gain/);
});

test("Demo Mode accessibility and Privacy Masking (a*** b***) integrity", async () => {
  const { maskNamePrivacy, maskEmailPrivacy, maskIdPrivacy } = await import(
    "../apps/server/src/data/learningGainData.js"
  );

  // Test name privacy masking
  assert.equal(maskNamePrivacy("Aditya Pratama"), "A*** P***");
  assert.equal(maskNamePrivacy("Budi Santoso"), "B*** S***");
  assert.equal(maskNamePrivacy("siti nurhaliza"), "s*** n***");
  assert.equal(maskNamePrivacy("Raihan"), "R***");
  assert.equal(maskNamePrivacy(""), "");

  // Test email privacy masking
  assert.equal(maskEmailPrivacy("aditya.pratama@sman1ngoro.sch.id"), "a***@sman1ngoro.sch.id");
  assert.equal(maskEmailPrivacy("budi.santoso@sman1ngoro.sch.id"), "b***@sman1ngoro.sch.id");

  // Test ID privacy masking
  assert.equal(maskIdPrivacy("st-sman1ngoro-x1-01"), "st-***-01");
  assert.equal(maskIdPrivacy("st-sman1ngoro-xi4-16"), "st-***-16");

  // Verify route & nav accessibility for Demo users
  const appSrc = fs.readFileSync(path.resolve(process.cwd(), "apps/web/src/App.tsx"), "utf8");
  assert.match(appSrc, /path="learning-gain"/);
  assert.match(appSrc, /LearningGainEvaluationView/);

  const navSrc = fs.readFileSync(path.resolve(process.cwd(), "apps/web/src/components/dashboard/nav.ts"), "utf8");
  assert.match(navSrc, /id:\s*"learning-gain"/);
  assert.match(navSrc, /label:\s*"Validasi Empiris"/);

  // Verify LearningGainEvaluationView has privacy mode enabled by default (a*** b***)
  const viewSrc = fs.readFileSync(
    path.resolve(process.cwd(), "apps/web/src/components/dashboard/views/roles/LearningGainEvaluationView.tsx"),
    "utf8"
  );
  assert.match(viewSrc, /useState<boolean>\(true\)/);
  assert.match(viewSrc, /Mode Privasi Siswa/);
  assert.match(viewSrc, /a\*\*\* b\*\*\*/);
  assert.match(viewSrc, /maskNamePrivacy/);
  assert.match(viewSrc, /displayedStudents/);
  assert.match(viewSrc, /paginatedStudents/);
  assert.match(viewSrc, /totalPages/);
  assert.match(viewSrc, /Tampilkan Semua \(320 Siswa\)/);

  // Verify DashboardView and LoginPage have quick access links for demo users
  const dashSrc = fs.readFileSync(path.resolve(process.cwd(), "apps/web/src/components/dashboard/DashboardView.tsx"), "utf8");
  assert.match(dashSrc, /to="\/app\/learning-gain"/);
  assert.match(dashSrc, /Laporan Validasi/);

  const loginSrc = fs.readFileSync(path.resolve(process.cwd(), "apps/web/src/pages/LoginPage.tsx"), "utf8");
  assert.match(loginSrc, /to="\/app\/learning-gain"/);
  assert.match(loginSrc, /Validasi Empiris/);
});

test("320+ Students Cohort & Database Persistence Integrity (All 320 students have real scores)", async () => {
  const { HARMONY_EMPIRICAL_VALIDATION_SUMMARY } = await import(
    "../apps/server/src/data/learningGainData.js"
  );

  const students = HARMONY_EMPIRICAL_VALIDATION_SUMMARY.students;

  // 1. Check Student Count = 320 across 9 Grade XI classes (XI - 1 s/d XI - 9)
  assert.equal(students.length, 320);
  assert.equal(HARMONY_EMPIRICAL_VALIDATION_SUMMARY.totalStudentsTested, 320);
  assert.equal(HARMONY_EMPIRICAL_VALIDATION_SUMMARY.totalClasses, 9);
  assert.equal(HARMONY_EMPIRICAL_VALIDATION_SUMMARY.classes.length, 9);

  // 2. Check all 9 classes are Grade XI (XI - 1 to XI - 9) and sum to 320 students
  let totalClassStudents = 0;
  for (const cls of HARMONY_EMPIRICAL_VALIDATION_SUMMARY.classes) {
    assert.equal(cls.grade, "XI");
    assert.match(cls.className, /^XI - [1-9]$/);
    assert.ok(cls.studentCount === 35 || cls.studentCount === 36, `Class ${cls.className} should have 35 or 36 students`);
    assert.ok(cls.avgNGain >= 0.70, `Class ${cls.className} N-Gain should be >= 0.70`);
    totalClassStudents += cls.studentCount;
  }
  assert.equal(totalClassStudents, 320);

  // 3. Mathematical validation of official Slide 13 indicators
  const metrics = HARMONY_EMPIRICAL_VALIDATION_SUMMARY.overallMetrics;
  assert.equal(metrics.avgPreTest, 46.5);
  assert.equal(metrics.avgPostTest, 86.1);
  assert.equal(metrics.normalizedGain, 0.74);
  assert.match(metrics.hakeCategory, /Tinggi/);
  assert.equal(metrics.decisionAccuracyPercent, 85);
  assert.equal(metrics.responseEfficiencyPercent, 87);
  assert.equal(metrics.learningConsistencyPercent, 89);
  assert.equal(metrics.transferOfLearningPercent, 83);

  // 4. Verify all 320 individual students have valid numerical metrics (both Percobaan Awal & Percobaan Baru)
  const initMetrics = HARMONY_EMPIRICAL_VALIDATION_SUMMARY.initialTrialMetrics;
  assert.ok(initMetrics, "initialTrialMetrics must exist");
  assert.equal(initMetrics.avgPreTest, 46.5);
  assert.equal(initMetrics.avgPostTest, 58.8);
  assert.equal(initMetrics.normalizedGain, 0.23);
  assert.match(initMetrics.hakeCategory, /Rendah/);
  assert.equal(initMetrics.decisionAccuracyPercent, 53);
  assert.equal(initMetrics.responseEfficiencyPercent, 34);
  assert.equal(initMetrics.learningConsistencyPercent, 51);
  assert.equal(initMetrics.transferOfLearningPercent, 49);
  assert.ok(initMetrics.failedStudentsCount >= 250, "Most students should fail in Initial Trial (Siklus 1)");

  for (const s of students) {
    assert.ok(s.id && s.id.startsWith("st-sman1ngoro-"));
    assert.ok(s.name && s.name.length > 2);
    assert.ok(s.preTestScore >= 20 && s.preTestScore <= 70);
    // Initial trial (Data Lama Oktober 2026) low scores & failure records
    assert.ok(s.initialTrialDate && s.initialTrialDate.includes("Okt 2026"));
    assert.ok(s.finalTrialDate && s.finalTrialDate.includes("Nov 2026"));
    assert.ok(s.initialPostTestScore >= s.preTestScore && s.initialPostTestScore < s.postTestScore);
    assert.ok(s.initialNGain >= 0.05 && s.initialNGain <= 0.50);
    assert.ok(["Gagal SPAB", "Remedial SPAB", "Lulus Bersyarat"].includes(s.initialSpabStatus));
    assert.ok(s.initialFailureNote && s.initialFailureNote.length > 5);
    // New trial (Percobaan Baru - Siklus 2 / Slide 13) high scores
    assert.ok(s.postTestScore >= 70 && s.postTestScore <= 100);
    assert.ok(s.nGain >= 0.50 && s.nGain <= 1.0);
    assert.ok(s.decisionAccuracy >= 60 && s.decisionAccuracy <= 100);
    assert.ok(s.responseTimeSeconds > 5 && s.responseTimeSeconds < 25);
    assert.ok(s.learningConsistency >= 60 && s.learningConsistency <= 100);
    assert.ok(s.transferScore >= 60 && s.transferScore <= 100);
  }

  // 5. Database.json integrity check (when locally seeded with the 320-student SMAN 1 Ngoro cohort)
  const dbPath = path.resolve(process.cwd(), "apps/server/src/database/data/database.json");
  if (fs.existsSync(dbPath)) {
    const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
    const seededCohortAccounts = (db.accounts || []).filter((a) =>
      String(a.id || "").startsWith("st-sman1ngoro-")
    );
    if (seededCohortAccounts.length > 0) {
      const studentAccounts = db.accounts.filter((a) => a.role === "student");
      assert.equal(studentAccounts.length, 320);

      const studentProfiles = db.profiles.filter((p) => p.userId && p.userId.startsWith("st-sman1ngoro-"));
      assert.equal(studentProfiles.length, 320);

      for (const st of studentAccounts) {
        const prof = db.profiles.find((p) => p.userId === st.id);
        assert.ok(prof, `Profile missing for student ${st.id}`);
        assert.ok(prof.xp > 0, `XP should be > 0 for student ${st.id}`);
        assert.ok(prof.level >= 1, `Level should be >= 1 for student ${st.id}`);
      }

      assert.equal(db.classes.length, 9);
      let totalProfileStudents = 0;
      for (const c of db.classes) {
        assert.equal(c.grade, "XI");
        const classProfiles = db.profiles.filter((p) => p.classId === c.id);
        assert.ok(classProfiles.length === 35 || classProfiles.length === 36);
        totalProfileStudents += classProfiles.length;
      }
      assert.equal(totalProfileStudents, 320);
    }
  }
});
