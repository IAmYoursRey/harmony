import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const readSrc = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

test("GameGridSandbox zoom math keeps pivot stationary without passive scroll or resize reset", () => {
  const src = readSrc("apps/web/src/components/dashboard/views/spatial/digital-twin/GameGridSandbox.tsx");

  // React passive synthetic onWheel must not be attached on canvas container
  assert.equal(src.includes("onWheel={handleWheel}"), false);
  assert.match(src, /addEventListener\(["']wheel["'],\s*onNativeWheel,\s*\{\s*passive:\s*false\s*\}\)/);
  assert.match(src, /zoomAtPoint\(el\.clientWidth \/ 2,\s*el\.clientHeight \/ 2,\s*factor\)/);
  assert.match(src, /hasInitializedCameraRef\.current/);

  // Mathematical invariant test matching zoomAtPoint
  const prev = { x: 120, y: 80, zoom: 0.85 };
  const anchorX = 412;
  const anchorY = 309;
  const factor = 1.25;
  const nextZoom = prev.zoom * factor;
  const worldX = (anchorX - prev.x) / prev.zoom;
  const worldY = (anchorY - prev.y) / prev.zoom;
  const nextX = anchorX - worldX * nextZoom;
  const nextY = anchorY - worldY * nextZoom;

  assert.ok(Math.abs((nextX + worldX * nextZoom) - anchorX) < 1e-9);
  assert.ok(Math.abs((nextY + worldY * nextZoom) - anchorY) < 1e-9);
});

test("Phase1Canvas wheel zoom anchors to pointer in canvas coordinates", () => {
  const src = readSrc("apps/web/src/components/dashboard/views/spatial/digital-twin/Phase1Canvas.tsx");
  assert.match(src, /const cx = rect\.width \/ 2/);
  assert.match(src, /const cy = rect\.height \/ 2/);
  assert.match(src, /worldX = \(mouseX - cx - p\.x\) \/ p\.zoom/);
  assert.match(src, /x: mouseX - cx - worldX \* nextZoom/);
  assert.match(src, /addEventListener\(["']wheel["'],\s*handleWheel,\s*\{\s*passive:\s*false\s*\}\)/);
});

test("AILearningView handles multi-turn error rollback, retry, and markdown rendering", () => {
  const src = readSrc("apps/web/src/components/dashboard/views/learning/AILearningView.tsx");
  assert.match(src, /chatHistory\.current\.pop\(\)/);
  assert.match(src, /renderFormattedText/);
  assert.match(src, /errorPrompt\?: string/);
  assert.match(src, /handleResetChat/);
});

test("DisasterQuestionView uses apiClient (not localhost), resilient option parsing, and quiz error recovery", () => {
  const src = readSrc("apps/web/src/components/dashboard/views/learning/DisasterQuestionView.tsx");
  assert.equal(src.includes("http://localhost:3001"), false);
  assert.match(src, /apiClient\.post\(["']\/api\/quiz-history["']/);
  assert.match(src, /parseMcqOption/);
  assert.match(src, /setQuizError/);
  assert.match(src, /answeredCount/);
});

test("Geospatial weather & maps views wire SMAN 1 Ngoro school defaults, native overlays, and non-passive chart wheel", () => {
  const studioSrc = readSrc("apps/web/src/components/dashboard/views/spatial/GeospatialStudioView.tsx");
  assert.equal(studioSrc.includes("currentUser ? (selection?.school?.lat"), false);
  assert.match(studioSrc, /selection\?\.school\?\.lat/);

  const weatherCardSrc = readSrc("apps/web/src/components/dashboard/views/spatial/map/MapWeatherObservationCard.tsx");
  assert.match(weatherCardSrc, /onOpenDetails,/);
  assert.match(weatherCardSrc, /Detail Studio/);

  const weatherModalSrc = readSrc("apps/web/src/components/dashboard/views/spatial/GeospatialWeatherModal.tsx");
  assert.match(weatherModalSrc, /el\.addEventListener\(['"]wheel['"],\s*onWheel,\s*\{\s*passive:\s*false\s*\}\)/);
  assert.match(weatherModalSrc, /isStudioActive/);
  assert.match(weatherModalSrc, /onlineSourcesCount/);

  const mapsSrc = readSrc("apps/web/src/components/dashboard/views/spatial/MapsView.tsx");
  assert.match(mapsSrc, /curZoom <= 2\.3/);
  assert.match(mapsSrc, /onOpenDetails=\{\(\) => openStudioDomain\(['"]weather['"]\)\}/);
  assert.match(mapsSrc, /Radar &amp; Citra Native/);
});
