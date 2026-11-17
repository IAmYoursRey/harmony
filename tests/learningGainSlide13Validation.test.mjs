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
  assert.match(surveySrc, /tab=learning-gain/);
});
