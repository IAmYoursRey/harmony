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
  assert.match(teacherSrc, /Efektivitas &amp; Learning Gain \(0,7\+\)/);

  const surveySrc = fs.readFileSync(
    path.resolve(process.cwd(), "apps/web/src/components/dashboard/views/analytics/SurveyAnalyticsView.tsx"),
    "utf8"
  );
  assert.match(surveySrc, /Validasi Empiris Slide 13 PPT/);
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

  // Verify DashboardView and LoginPage have quick access links for demo users
  const dashSrc = fs.readFileSync(path.resolve(process.cwd(), "apps/web/src/components/dashboard/DashboardView.tsx"), "utf8");
  assert.match(dashSrc, /to="\/app\/learning-gain"/);
  assert.match(dashSrc, /Buka Laporan Validasi \(Mode Demo\)/);

  const loginSrc = fs.readFileSync(path.resolve(process.cwd(), "apps/web/src/pages/LoginPage.tsx"), "utf8");
  assert.match(loginSrc, /to="\/app\/learning-gain"/);
  assert.match(loginSrc, /Mode Demo Privasi/);
});
