import test from "node:test";
import assert from "node:assert/strict";
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  SMAN1_NGORO_MAP_ID,
  SMAN1_NGORO_SCHOOL_ID,
  buildSman1NgoroPdfDigitalTwin,
} from "../apps/server/src/data/sman1NgoroPdfMapBuilder.js";

const BLOCKING_TILES = new Set(["WALL", "BORDER", "DOOR_LOCKED"]);
const BLOCKING_SCENARIO_OBJECTS = new Set([
  "BLOCKED_AREA",
  "FIRE",
  "DAMAGE_ZONE",
]);

function expandRect(obj) {
  const pts = [];
  const w = Math.max(1, obj.width || 1);
  const h = Math.max(1, obj.height || 1);
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      pts.push(`${obj.x + dx},${obj.y + dy}`);
    }
  }
  return pts;
}

function bfsReachable(grid, blockedKeys, startX, startY, targetKeys) {
  const visited = new Set([`${startX},${startY}`]);
  const queue = [{ x: startX, y: startY }];
  const DIRS = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];

  while (queue.length > 0) {
    const { x, y } = queue.shift();
    const key = `${x},${y}`;
    if (targetKeys.has(key)) return true;

    for (const [dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_WIDTH || ny >= MAP_HEIGHT) continue;
      const nKey = `${nx},${ny}`;
      if (visited.has(nKey)) continue;
      if (BLOCKING_TILES.has(grid[ny][nx])) continue;
      if (blockedKeys.has(nKey)) continue;
      visited.add(nKey);
      queue.push({ x: nx, y: ny });
    }
  }
  return false;
}

test("SMAN 1 Ngoro PDF Digital Twin includes all 26 PAS rooms and core campus facilities", () => {
  const dataset = buildSman1NgoroPdfDigitalTwin();

  assert.equal(dataset.map.id, SMAN1_NGORO_MAP_ID);
  assert.equal(dataset.map.school_id, SMAN1_NGORO_SCHOOL_ID);
  assert.equal(dataset.map.width, MAP_WIDTH);
  assert.equal(dataset.map.height, MAP_HEIGHT);
  assert.equal(dataset.map.status, "published");
  assert.equal(dataset.tiles.length, MAP_WIDTH * MAP_HEIGHT);

  const roomNames = new Set(dataset.rooms.map((r) => r.name));
  for (let n = 1; n <= 26; n++) {
    assert.ok(
      roomNames.has(`Ruang ${n}`),
      `Missing classroom Ruang ${n} from PDF layout`,
    );
  }

  const requiredFacilities = [
    "GOR",
    "Lab. Fisika",
    "Lapangan Upacara",
    "Masjid Sabilunnajah",
    "Ruang Guru",
    "Lobi",
    "R. Kasek",
    "R. Meeting",
    "Ruang Sekretariat",
    "Ruang BK",
    "Gudang",
    "Ruang Operator",
    "UKS",
    "R. OSIS",
    "Perpustakaan",
    "KOP (Koperasi Siswa)",
    "Kantin Sekolah",
    "Tandon",
    "Tempat Parkir Guru",
    "Tempat Parkir (Timur)",
    "Gerbang Utama (Jl. Candi Jolotundo)",
  ];
  for (const facility of requiredFacilities) {
    assert.ok(roomNames.has(facility), `Missing campus facility: ${facility}`);
  }
});

test("PDF spatial orientation matches North gate, SW Ruang 26, SE Kantin, East 7-18 wings", () => {
  const { rooms } = buildSman1NgoroPdfDigitalTwin();
  const byName = new Map(rooms.map((r) => [r.name, r]));

  const gate = byName.get("Gerbang Utama (Jl. Candi Jolotundo)");
  const kantin = byName.get("Kantin Sekolah");
  const gor = byName.get("GOR");
  const r26 = byName.get("Ruang 26");
  const r12 = byName.get("Ruang 12");
  const r7 = byName.get("Ruang 7");
  const r13 = byName.get("Ruang 13");
  const r18 = byName.get("Ruang 18");
  const lapangan = byName.get("Lapangan Upacara");
  const rOp = byName.get("Ruang Operator");

  assert.ok(gate.y < lapangan.y, "Gerbang Utama must sit North of Lapangan Upacara");
  assert.ok(gor.x < r12.x, "GOR must sit West of Ruang 12");
  assert.ok(r26.x < lapangan.x && r26.y > lapangan.y, "Ruang 26 must sit SW of Lapangan Upacara");
  assert.ok(kantin.x > r26.x && kantin.y >= 41, "Kantin Sekolah must sit in SE corner");
  assert.ok(r12.x < r7.x && r12.y < r13.y && r7.y < r18.y, "East dual wings 12..7 sit north of 13..18");
  assert.ok(
    rOp.x >= lapangan.x + lapangan.width && rOp.x < r12.x,
    "Ruang Operator must border the East edge of Lapangan Upacara West of Ruang 12",
  );
});

test("Room interiors do not unintentionally collide and doors open cleanly", () => {
  const { grid, rooms } = buildSman1NgoroPdfDigitalTwin();

  // Check every room fits grid and has at least one walkable interior tile
  const ownership = new Map();
  for (const room of rooms) {
    assert.ok(room.x >= 0 && room.x + room.width <= MAP_WIDTH, `${room.name} out of X bounds`);
    assert.ok(room.y >= 0 && room.y + room.height <= MAP_HEIGHT, `${room.name} out of Y bounds`);

    let walkableCount = 0;
    const isNestedToilet = room.id === "room-sman1-wc-kasek";
    const inset = room.type === "parking" || room.type === "gate" || room.type === "assembly" || room.type === "garden" ? 0 : 1;

    for (let y = room.y + inset; y <= room.y + room.height - 1 - inset; y++) {
      for (let x = room.x + inset; x <= room.x + room.width - 1 - inset; x++) {
        if (!BLOCKING_TILES.has(grid[y][x])) {
          walkableCount++;
        }
        if (inset === 1 && !isNestedToilet) {
          const key = `${x},${y}`;
          const prev = ownership.get(key);
          assert.equal(prev, undefined, `Interior overlap at ${key} between ${prev} and ${room.name}`);
          ownership.set(key, room.name);
        }
      }
    }
    assert.ok(walkableCount > 0, `Room ${room.name} has zero walkable interior tiles`);
  }
});

test("All scenario SPAWNs have valid obstacle-free evacuation paths to SAFE_ZONE and EXIT", () => {
  const { grid, scenarios } = buildSman1NgoroPdfDigitalTwin();
  assert.ok(scenarios.length >= 3);

  for (const scenario of scenarios) {
    assert.equal(scenario.status, "published");
    const spawns = scenario.objects.filter((o) => o.object_type === "SPAWN");
    const safeZones = scenario.objects.filter((o) => o.object_type === "SAFE_ZONE");
    const exits = scenario.objects.filter((o) => o.object_type === "EXIT");

    assert.ok(spawns.length > 0, `${scenario.id} must have SPAWN objects`);
    assert.ok(safeZones.length > 0, `${scenario.id} must have SAFE_ZONE objects`);
    assert.ok(exits.length > 0, `${scenario.id} must have EXIT objects`);

    const blockedKeys = new Set();
    for (const obj of scenario.objects) {
      if (BLOCKING_SCENARIO_OBJECTS.has(obj.object_type)) {
        for (const k of expandRect(obj)) blockedKeys.add(k);
      }
    }

    const safeKeys = new Set();
    for (const sz of safeZones) {
      for (const k of expandRect(sz)) safeKeys.add(k);
    }
    const exitKeys = new Set();
    for (const ex of exits) {
      for (const k of expandRect(ex)) exitKeys.add(k);
    }

    for (const spawn of spawns) {
      assert.ok(
        !BLOCKING_TILES.has(grid[spawn.y][spawn.x]),
        `SPAWN (${spawn.x},${spawn.y}) in ${scenario.id} placed on blocking tile ${grid[spawn.y][spawn.x]}`,
      );
      assert.ok(
        !blockedKeys.has(`${spawn.x},${spawn.y}`),
        `SPAWN (${spawn.x},${spawn.y}) in ${scenario.id} placed on hazard`,
      );

      const reachesSafe = bfsReachable(grid, blockedKeys, spawn.x, spawn.y, safeKeys);
      assert.ok(
        reachesSafe,
        `SPAWN ${spawn.properties?.label || spawn.id} (${spawn.x},${spawn.y}) in ${scenario.id} cannot reach SAFE_ZONE`,
      );

      const reachesExit = bfsReachable(grid, blockedKeys, spawn.x, spawn.y, exitKeys);
      assert.ok(
        reachesExit,
        `SPAWN ${spawn.properties?.label || spawn.id} (${spawn.x},${spawn.y}) in ${scenario.id} cannot reach EXIT`,
      );
    }
  }
});

test("Legacy GridMap and DisasterSimulation structures are populated consistently", () => {
  const { legacyGridMap, legacySimulations } = buildSman1NgoroPdfDigitalTwin();
  assert.equal(legacyGridMap.id, SMAN1_NGORO_MAP_ID);
  assert.equal(legacyGridMap.schoolId, SMAN1_NGORO_SCHOOL_ID);
  assert.equal(legacyGridMap.gridWidth, MAP_WIDTH);
  assert.equal(legacyGridMap.gridHeight, MAP_HEIGHT);
  assert.ok(legacyGridMap.doors.length > 30);
  assert.ok(legacyGridMap.safePoints.length >= 3);
  assert.ok(legacyGridMap.spawnPoints.length >= 3);
  assert.equal(legacySimulations.length, 3);
});
