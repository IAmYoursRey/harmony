import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const {
  classifySpabReadiness,
  evaluateSimulationRubric,
  OFFICIAL_PREPAREDNESS_REFERENCES,
} = await import("../apps/web/src/data/disasterPreparednessRubric.ts");

test("classifySpabReadiness enforces LIPI-UNESCO (2006) index bands & BNPB No. 4/2012 Levels 1-4", () => {
  assert.equal(classifySpabReadiness(15).level, 1);
  assert.equal(classifySpabReadiness(39).lipiCategory, "Belum Siap");

  assert.equal(classifySpabReadiness(40).level, 2);
  assert.equal(classifySpabReadiness(54).lipiCategory, "Kurang Siap");

  assert.equal(classifySpabReadiness(55).level, 2);
  assert.equal(classifySpabReadiness(64).lipiCategory, "Hampir Siap");

  assert.equal(classifySpabReadiness(65).level, 3);
  assert.equal(classifySpabReadiness(79).lipiCategory, "Siap");

  assert.equal(classifySpabReadiness(80).level, 4);
  assert.equal(classifySpabReadiness(100).lipiCategory, "Sangat Siap");

  assert.ok(OFFICIAL_PREPAREDNESS_REFERENCES.length >= 3);
  assert.ok(OFFICIAL_PREPAREDNESS_REFERENCES.some((r) => r.code.includes("LIPI")));
  assert.ok(OFFICIAL_PREPAREDNESS_REFERENCES.some((r) => r.code.includes("BNPB")));
  assert.ok(OFFICIAL_PREPAREDNESS_REFERENCES.some((r) => r.code.includes("Permendikbud")));
});

test("evaluateSimulationRubric uses 100%-weighted criteria, penalizes indoor lingering, and caps failed runs below Level 3", () => {
  const optimal = evaluateSimulationRubric({
    succeeded: true,
    timeMs: 38000,
    healthRemaining: 96,
    maxHealth: 100,
    trapsTriggered: 0,
    totalTraps: 4,
    indoorsTimeSec: 5,
    difficulty: "sedang",
  });
  const totalWeight = optimal.criteria.reduce((sum, c) => sum + c.weightPercent, 0);
  assert.equal(totalWeight, 100);
  assert.equal(optimal.criteria.length, 4);
  assert.equal(optimal.classification.level, 4);
  assert.ok(optimal.score >= 90);

  const lingeringIndoors = evaluateSimulationRubric({
    succeeded: true,
    timeMs: 85000,
    healthRemaining: 80,
    maxHealth: 100,
    trapsTriggered: 1,
    totalTraps: 4,
    indoorsTimeSec: 34,
    difficulty: "sedang",
  });
  const optIndoor = optimal.criteria.find((c) => c.id === "indoor_discipline").score;
  const badIndoor = lingeringIndoors.criteria.find((c) => c.id === "indoor_discipline").score;
  assert.ok(badIndoor < optIndoor, "Staying indoors too long should sharply reduce indoor_discipline score");

  const failedRun = evaluateSimulationRubric({
    succeeded: false,
    timeMs: 42000,
    healthRemaining: 50,
    maxHealth: 100,
    trapsTriggered: 0,
    totalTraps: 4,
    indoorsTimeSec: 4,
    difficulty: "mudah",
  });
  assert.ok(failedRun.classification.level <= 2, "Failed evacuations must stay below Level 3 (Siap)");
  assert.ok(failedRun.score < 65);
});

test("SmartReadinessIndex and Analytics API replace arbitrary thresholds with LIPI-UNESCO & SPAB citations", () => {
  const sriSrc = fs.readFileSync(
    path.resolve("apps/web/src/components/SmartReadinessIndex.tsx"),
    "utf8",
  );
  assert.ok(sriSrc.includes("classifySpabReadiness"));
  assert.ok(sriSrc.includes("OFFICIAL_PREPAREDNESS_REFERENCES"));
  assert.equal(sriSrc.includes("score >= 85"), false, "Arbitrary >= 85 cutoff must be removed");
  assert.ok(sriSrc.includes("80–100") && sriSrc.includes("65–79"));

  const apiSrc = fs.readFileSync(
    path.resolve("apps/server/src/routes/analytics.js"),
    "utf8",
  );
  assert.ok(apiSrc.includes("LIPI–UNESCO"));
  assert.ok(apiSrc.includes("evacuation < 65") && apiSrc.includes("knowledge < 65"));
});

test("Phase3Runtime supports cross-device pointer capture controls and unobstructed central playfield", () => {
  const rtSrc = fs.readFileSync(
    path.resolve("apps/web/src/components/dashboard/views/spatial/digital-twin/Phase3Runtime.tsx"),
    "utf8",
  );
  assert.ok(rtSrc.includes("setPointerCapture"), "Joystick/action controls must capture pointer across slide-off");
  assert.ok(rtSrc.includes("showTouchControls"), "Touch controls must support phones and tablets + manual toggle");
  assert.ok(rtSrc.includes("isRunToggled"), "Run button must toggle for one-thumb usability");
  assert.equal(rtSrc.includes("sm:hidden\">\n            {/* Virtual Joystick"), false);
  assert.equal(rtSrc.includes("top-1/4 left-1/2"), false, "Center-covering toast must not sit over top-1/4 playfield");
  assert.equal(rtSrc.includes("bottom-16 left-1/2"), false, "Prompt must not bounce over bottom-16 gameplay zone");
  assert.ok(rtSrc.includes("BNPB SMAB") && rtSrc.includes("OFFICIAL_PREPAREDNESS_REFERENCES"));
});

test("MapsView, MapGISToolbar & GeospatialWeatherModal resolve narrow phone & tablet UI collisions", () => {
  const mapsSrc = fs.readFileSync(
    path.resolve("apps/web/src/components/dashboard/views/spatial/MapsView.tsx"),
    "utf8",
  );
  assert.ok(mapsSrc.includes("top-[calc(4.75rem+env(safe-area-inset-top))]"));
  assert.ok(mapsSrc.includes(".ol-attribution"));
  assert.ok(mapsSrc.includes("w-[calc(100%-8.75rem)]"));

  const gisSrc = fs.readFileSync(
    path.resolve("apps/web/src/components/dashboard/views/spatial/map/MapGISToolbar.tsx"),
    "utf8",
  );
  assert.ok(gisSrc.includes("w-[min(18rem,calc(100vw-2rem))]"));

  const geoSrc = fs.readFileSync(
    path.resolve("apps/web/src/components/dashboard/views/spatial/GeospatialWeatherModal.tsx"),
    "utf8",
  );
  assert.ok(geoSrc.includes("pb-24 sm:pb-8"));
  assert.ok(geoSrc.includes("grid grid-cols-3 sm:inline-flex"));
});
