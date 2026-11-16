import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const { BuildingRubbleEngine } = await import(
  "../apps/web/src/components/dashboard/views/spatial/digital-twin/buildingRubbleEngine.ts"
);

function buildMockSchoolMap() {
  const tiles = [];
  const width = 20;
  const height = 14;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let tile_type = "PAVING";
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        tile_type = "BORDER";
      } else if (x >= 2 && x <= 7 && y >= 2 && y <= 5) {
        const isWall = x === 2 || x === 7 || y === 2 || y === 5;
        tile_type = isWall ? (x === 4 && y === 5 ? "DOOR" : "WALL") : "FLOOR";
      } else if (x >= 2 && x <= 7 && y >= 7 && y <= 10) {
        const isWall = x === 2 || x === 7 || y === 7 || y === 10;
        tile_type = isWall ? (x === 4 && y === 7 ? "DOOR" : "WALL") : "FLOOR";
      }
      tiles.push({ id: `t-${x}-${y}`, x, y, tile_type });
    }
  }

  return {
    id: "mock-school",
    width,
    height,
    floors: [{ id: "f1", name: "Lantai 1", floor_number: 1, tiles, objects: [] }],
    stairs: [],
    rooms: [
      {
        id: "r-lab",
        floor_id: "f1",
        name: "Lab Fisika",
        type: "lab",
        x: 2,
        y: 2,
        width: 6,
        height: 4,
        metadata: { category: "lab", shortName: "LAB FISIKA" },
      },
      {
        id: "r-kelas",
        floor_id: "f1",
        name: "Kelas X",
        type: "classroom",
        x: 2,
        y: 7,
        width: 6,
        height: 4,
        metadata: { category: "classroom", shortName: "KELAS X" },
      },
      {
        id: "r-lapangan",
        floor_id: "f1",
        name: "Lapangan Upacara",
        type: "assembly",
        x: 11,
        y: 3,
        width: 6,
        height: 6,
        metadata: { category: "assembly", shortName: "LAPANGAN" },
      },
    ],
  };
}

test("BuildingRubbleEngine indexes real building structures, exempts safe zones, and grows along buildings", () => {
  const map = buildMockSchoolMap();
  const scenarioObjects = [
    { id: "sp", floor_id: "f1", object_type: "SPAWN", x: 1, y: 6, width: 1, height: 1 },
    { id: "ex", floor_id: "f1", object_type: "EXIT", x: 18, y: 6, width: 1, height: 1 },
    { id: "sz", floor_id: "f1", object_type: "SAFE_ZONE", x: 11, y: 3, width: 6, height: 6 },
    { id: "f1", floor_id: "f1", object_type: "FIRE", x: 3, y: 3, width: 1, height: 1 },
  ];

  const engine = new BuildingRubbleEngine(map, scenarioObjects, "Gempa");
  assert.equal(engine.getBuildingZoneCount("f1"), 2);

  // Step simulation across multiple ticks + aftershock pulses (~24 seconds total)
  for (let tick = 0; tick < 120; tick++) {
    engine.update("f1", {
      dt: 0.2,
      aftershockPulse: tick === 20 || tick === 60 || tick === 95,
      difficultyMultiplier: 1.15,
      hazardObjects: scenarioObjects,
      playerTile: { x: 1, y: 6 },
    });
  }

  const cells = engine.getCellsForFloor("f1");
  assert.ok(cells.length > 4, `Expected dynamic building rubble growth (>4), got ${cells.length}`);
  assert.ok(
    cells.some((c) => c.phase === "collapsed"),
    "Expected cracked cells to finish collapsing into solid/edge rubble",
  );
  assert.ok(
    cells.some((c) => c.generation >= 1),
    "Expected rubble to autonomously propagate to adjacent building/corridor cells (generation >= 1)",
  );

  // SAFE_ZONE & EXIT cells stay immune from rubble
  for (const c of cells) {
    const insideSafeZone = c.x >= 11 && c.x <= 16 && c.y >= 3 && c.y <= 8;
    assert.equal(insideSafeZone, false, `Safe zone tile (${c.x},${c.y}) must not grow rubble`);
  }

  // Evacuation path between SPAWN and EXIT remains guaranteed navigable
  assert.equal(engine.hasSafeRouteIfBlocked("f1", "__none__"), true);
});

test("BuildingRubbleEngine never soft-locks a single-lane evacuation corridor", () => {
  // Construct 9x5 narrow choke tunnel flanked by walls/rooms
  const tiles = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 9; x++) {
      let tile_type = y === 2 ? "PAVING" : "WALL";
      if (x === 0 || x === 8 || y === 0 || y === 4) tile_type = "BORDER";
      if ((x === 1 || x === 7) && y === 2) tile_type = "PAVING";
      tiles.push({ id: `n-${x}-${y}`, x, y, tile_type });
    }
  }
  const chokeMap = {
    id: "choke",
    width: 9,
    height: 5,
    floors: [{ id: "f1", name: "L1", floor_number: 1, tiles, objects: [] }],
    stairs: [],
    rooms: [
      { id: "r1", floor_id: "f1", name: "Koridor Sempit", type: "classroom", x: 2, y: 1, width: 5, height: 3 },
    ],
  };
  const objs = [
    { id: "sp", floor_id: "f1", object_type: "SPAWN", x: 1, y: 2, width: 1, height: 1 },
    { id: "ex", floor_id: "f1", object_type: "EXIT", x: 7, y: 2, width: 1, height: 1 },
  ];

  const engine = new BuildingRubbleEngine(chokeMap, objs, "Gempa");
  for (let tick = 0; tick < 80; tick++) {
    engine.update("f1", { dt: 0.2, aftershockPulse: tick % 15 === 0, difficultyMultiplier: 1.2 });
  }

  for (let x = 2; x <= 6; x++) {
    assert.equal(
      engine.isHeavyBlockingTile("f1", x, 2),
      false,
      `Chokepoint (${x}, 2) must downgrade to passable edge debris instead of sealing exit`,
    );
  }
  assert.equal(engine.hasSafeRouteIfBlocked("f1", "__none__"), true);
});

test("Digital Twin renderers enforce crisp 16x16 micro-pixel architecture, wall AO, and dynamic rubble rendering", () => {
  const rendererSrc = fs.readFileSync(
    path.resolve("apps/web/src/components/dashboard/views/spatial/digital-twin/microPixelArtRenderer.ts"),
    "utf8",
  );
  const assetSrc = fs.readFileSync(
    path.resolve("apps/web/src/components/dashboard/views/spatial/digital-twin/Phase1AssetRenderer.ts"),
    "utf8",
  );
  const sandboxSrc = fs.readFileSync(
    path.resolve("apps/web/src/components/dashboard/views/spatial/digital-twin/GameGridSandbox.tsx"),
    "utf8",
  );
  const engineSrc = fs.readFileSync(
    path.resolve("apps/web/src/components/dashboard/views/spatial/digital-twin/Phase3Engine.ts"),
    "utf8",
  );

  assert.match(rendererSrc, /const VOXEL_RES = 16/);
  assert.match(rendererSrc, /drawWallNeighborAO/);
  assert.match(rendererSrc, /drawScatteredRubblePieces/);
  assert.match(rendererSrc, /drawDynamicPixelRubbleCell/);
  assert.match(assetSrc, /getMicroPixelTileCanvas/);
  assert.match(sandboxSrc, /imageSmoothingEnabled\s*=\s*false/);
  assert.match(sandboxSrc, /drawWallNeighborAO/);
  assert.match(engineSrc, /BuildingRubbleEngine/);
  assert.match(engineSrc, /drawDynamicPixelRubbleCell/);
  assert.match(engineSrc, /isHeavyBlockingTile/);
});

