import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import express from "express";

// Use local isolated database without connecting to remote Postgres during unit tests
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";

const { default: surveysRouter } = await import(
  "../apps/server/src/routes/surveys.js"
);

test("GET /api/surveys returns non-empty surveys populated with registered XI students", async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/surveys", surveysRouter);

  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();

  try {
    // 1. Default SMAN 1 Ngoro request without auth (Demo / guest accessible)
    const res = await fetch(
      `http://127.0.0.1:${port}/api/surveys?schoolId=ffdcdf34-fc99-4209-913e-5a6042e957ad`,
    );
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.ok(Array.isArray(data.surveys), "surveys must be an array");
    assert.equal(data.surveys.length, 320, "All 320 registered students should have survey entries");
    assert.equal(data.stats.totalRespondents, 320);
    assert.ok(data.stats.averageScore >= 70 && data.stats.averageScore <= 95);
    assert.equal(data.stats.completionRate, 100);
    assert.ok(data.stats.vulnerabilityCategories.length >= 3);

    for (const s of data.surveys) {
      assert.ok(s.studentName && s.studentName.length > 2);
      assert.match(s.className, /^XI - [1-9]$/);
    }

    // 2. Arbitrary school fallback never leaves surveys empty
    const resOther = await fetch(
      `http://127.0.0.1:${port}/api/surveys?schoolId=arbitrary-other-school-id`,
    );
    assert.equal(resOther.status, 200);
    const otherData = await resOther.json();
    assert.ok(otherData.surveys.length > 0, "Survey endpoint must never return empty cohort");
    assert.ok(otherData.stats.totalRespondents > 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("SurveyAnalyticsView removes empty-state dead end and renders registered respondent list", () => {
  const surveySrc = fs.readFileSync(
    path.resolve(
      process.cwd(),
      "apps/web/src/components/dashboard/views/analytics/SurveyAnalyticsView.tsx",
    ),
    "utf8",
  );

  assert.doesNotMatch(surveySrc, /Belum Ada Data Survei/);
  assert.match(surveySrc, /Daftar Responden Survei/);
  assert.match(surveySrc, /buildLocalRegisteredFallback/);
});

