import { pool } from "../apps/server/src/repositories/repository.js";
import { readDB, writeDB } from "../apps/server/src/repositories/repository.js";
import crypto from "crypto";

const SMAN1_SCHOOL_ID = "ffdcdf34-fc99-4209-913e-5a6042e957ad";
const MAP_WIDTH = 84;
const MAP_HEIGHT = 52;

async function seedDenahGameMap() {
  if (!pool) {
    console.error("Pool not available. Ensure DATABASE_URL is set.");
    return;
  }

  console.log("Seeding Denah Architectural Game Map for SMAN 1 Ngoro...");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Clean existing maps for SMAN 1 Ngoro
    const existingMaps = await client.query(
      "SELECT id FROM digital_twin_maps WHERE school_id = $1",
      [SMAN1_SCHOOL_ID]
    );

    for (const row of existingMaps.rows) {
      await client.query("DELETE FROM digital_twin_scenario_objects WHERE scenario_id IN (SELECT id FROM digital_twin_scenarios WHERE map_id = $1)", [row.id]);
      await client.query("DELETE FROM digital_twin_scenarios WHERE map_id = $1", [row.id]);
      await client.query("DELETE FROM digital_twin_tiles WHERE floor_id IN (SELECT id FROM digital_twin_floors WHERE map_id = $1)", [row.id]);
      await client.query("DELETE FROM digital_twin_objects WHERE floor_id IN (SELECT id FROM digital_twin_floors WHERE map_id = $1)", [row.id]);
      await client.query("DELETE FROM digital_twin_rooms WHERE map_id = $1", [row.id]);
      await client.query("DELETE FROM digital_twin_stairs WHERE map_id = $1", [row.id]);
      await client.query("DELETE FROM digital_twin_boundaries WHERE map_id = $1", [row.id]);
      await client.query("DELETE FROM digital_twin_floors WHERE map_id = $1", [row.id]);
      await client.query("DELETE FROM digital_twin_maps WHERE id = $1", [row.id]);
    }

    const mapId = "map-sman1-denah";
    const floorId = "floor-sman1-1";

    const mapBorder = {
      minX: 0,
      minY: 0,
      maxX: MAP_WIDTH - 1,
      maxY: MAP_HEIGHT - 1,
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
    };

    // Insert Map
    await client.query(
      `INSERT INTO digital_twin_maps (id, school_id, name, description, width, height, active_floor_id, status, version, border, is_public, author_name, school_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        mapId,
        SMAN1_SCHOOL_ID,
        "Denah Kampus Terpadu (SMAN 1 Ngoro)",
        "Tata letak struktural digital twin interaktif berbasis denah arsitektur sekolah. Memuat Lapangan Upacara, Lapangan Olahraga/Basket/Voli, Gerbang Jl. Salak, koridor evakuasi, dan titik aman.",
        MAP_WIDTH,
        MAP_HEIGHT,
        floorId,
        "published",
        1,
        JSON.stringify(mapBorder),
        true,
        "Tim Tanggap Bencana",
        "SMAN 1 Ngoro",
      ]
    );

    // Insert Floor 1
    await client.query(
      `INSERT INTO digital_twin_floors (id, map_id, floor_number, name, width, height)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [floorId, mapId, 1, "Lantai 1", MAP_WIDTH, MAP_HEIGHT]
    );

    // Grid Matrix: [x][y]
    // Default: 'EMPTY'
    const grid = Array.from({ length: MAP_WIDTH }, () =>
      Array.from({ length: MAP_HEIGHT }, () => "EMPTY")
    );

    // Helper: Fill Rect
    const fillRect = (x1, y1, w, h, tileType) => {
      for (let x = x1; x < x1 + w && x < MAP_WIDTH; x++) {
        for (let y = y1; y < y1 + h && y < MAP_HEIGHT; y++) {
          if (x >= 0 && y >= 0) {
            grid[x][y] = tileType;
          }
        }
      }
    };

    // Helper: Add Building Room (Wall perimeter, Floor inside, Door openings)
    const addBuilding = (x, y, w, h, doors = [], floorType = "FLOOR") => {
      // Interior floor
      for (let tx = x; tx < x + w && tx < MAP_WIDTH; tx++) {
        for (let ty = y; ty < y + h && ty < MAP_HEIGHT; ty++) {
          const isEdge = tx === x || tx === x + w - 1 || ty === y || ty === y + h - 1;
          if (isEdge) {
            grid[tx][ty] = "WALL";
          } else {
            grid[tx][ty] = floorType;
          }
        }
      }
      // Doors
      doors.forEach((d) => {
        const dx = x + d.x;
        const dy = y + d.y;
        if (dx >= 0 && dx < MAP_WIDTH && dy >= 0 && dy < MAP_HEIGHT) {
          grid[dx][dy] = "DOOR";
        }
      });
    };

    // 1. Road on West side: Jl. Salak No. 126 Tanggul (x: 0..4)
    fillRect(0, 0, 5, MAP_HEIGHT, "ROAD");

    // 2. Sidewalk / Tree barrier between Road & School (x: 5)
    fillRect(5, 0, 1, MAP_HEIGHT, "PAVING");

    // 3. School Outer Perimeter Wall (x: 6) with 2 Gates
    fillRect(6, 0, 1, MAP_HEIGHT, "WALL");
    // Gate 1 (Upper Gate - "MASUK"): x = 6, y = 9..12
    for (let y = 9; y <= 12; y++) grid[6][y] = "PAVING";
    // Gate 2 (Lower Gate - "MASUK"): x = 6, y = 35..38
    for (let y = 35; y <= 38; y++) grid[6][y] = "PAVING";

    // 4. North Outer Boundary Wall
    // Diagonal wall from (13, 5) to (21, 2)
    for (let i = 0; i <= 8; i++) {
      const wx = 13 + i;
      const wy = Math.round(5 - (i * 3) / 8);
      grid[wx][wy] = "WALL";
    }
    // Top boundary from (22, 2) to (82, 2)
    fillRect(22, 2, 61, 1, "WALL");

    // 5. East Outer Boundary Wall (x: 82)
    fillRect(82, 2, 1, 49, "WALL");

    // 6. South Outer Boundary Wall (y: 50)
    fillRect(6, 50, 77, 1, "WALL");

    // 7. Base Open Courtyards and Walkways
    // All open area inside the campus defaults to PAVING
    fillRect(7, 5, 75, 45, "PAVING");

    // ==========================================
    // WEST WING BUILDINGS
    // ==========================================
    // Upper entrance corridor from Gate 1 to Lapangan Upacara: (x: 7..21, y: 7..8) is PAVING

    // Front Classrooms (x: 7..13)
    addBuilding(7, 9, 7, 6, [{ x: 6, y: 2 }], "FLOOR"); // Kelas XI-B
    addBuilding(7, 15, 7, 6, [{ x: 6, y: 3 }], "FLOOR"); // Kelas XI-C
    addBuilding(7, 21, 7, 6, [{ x: 6, y: 2 }], "FLOOR"); // Kelas XI-D
    addBuilding(7, 27, 7, 6, [{ x: 6, y: 3 }], "FLOOR"); // Kelas XI-E
    addBuilding(7, 33, 7, 6, [{ x: 6, y: 2 }], "FLOOR"); // Kelas XI-F

    // Back Administration & Halls (x: 14..21)
    addBuilding(14, 9, 8, 12, [{ x: 7, y: 4 }, { x: 7, y: 8 }], "FLOOR"); // Ruang Guru
    addBuilding(14, 21, 8, 6, [{ x: 7, y: 2 }], "FLOOR"); // Ruang Tamu / Lobi
    addBuilding(14, 27, 8, 8, [{ x: 7, y: 3 }], "FLOOR"); // Ruang TU, Kepsek, TP2MS
    addBuilding(14, 35, 8, 4, [{ x: 7, y: 1 }], "FLOOR"); // Koperasi Siswa

    // South-West Section: Pos Satpam & Smadata Water
    addBuilding(7, 40, 5, 6, [{ x: 4, y: 1 }, { x: 2, y: 0 }], "FLOOR"); // Pos Satpam
    fillRect(7, 46, 5, 4, "PAVING"); // Smadata water / plaza

    // Masjid & Tempat Wudhu (x: 13..22, y: 40..49)
    addBuilding(13, 40, 10, 9, [{ x: 0, y: 4 }, { x: 9, y: 4 }], "MOSQUE");
    fillRect(12, 40, 1, 9, "PAVING"); // Tempat wudhu walkway

    // ==========================================
    // NORTH-WEST WING BUILDINGS
    // ==========================================
    // Upper row (y: 3..7, x: 22..34)
    addBuilding(22, 3, 5, 5, [{ x: 2, y: 4 }], "FLOOR"); // Kelas XI-A
    addBuilding(27, 3, 4, 5, [{ x: 2, y: 4 }], "FLOOR"); // Kelas XI-J
    addBuilding(31, 3, 4, 5, [{ x: 2, y: 4 }], "FLOOR"); // Kelas XI-I
    // Lower row (y: 8..13, x: 22..34)
    addBuilding(22, 8, 6, 6, [{ x: 3, y: 5 }], "FLOOR"); // Ruang BK
    addBuilding(28, 8, 7, 6, [{ x: 3, y: 5 }], "FLOOR"); // Ruang UKS

    // ==========================================
    // NORTH WING (HORIZONTAL CLASSROOM STRIP)
    // ==========================================
    // Blue Classrooms (XII-G, XII-H, XII-I, XII-J): x: 36..55, y: 6..12
    addBuilding(36, 6, 5, 7, [{ x: 2, y: 6 }], "FLOOR"); // XII-G
    addBuilding(41, 6, 5, 7, [{ x: 2, y: 6 }], "FLOOR"); // XII-H
    addBuilding(46, 6, 5, 7, [{ x: 2, y: 6 }], "FLOOR"); // XII-I
    addBuilding(51, 6, 5, 7, [{ x: 2, y: 6 }], "FLOOR"); // XII-J

    // Green Classrooms (X-J, X-I, X-H, X-G): x: 56..75, y: 6..12
    addBuilding(56, 6, 5, 7, [{ x: 2, y: 6 }], "FLOOR"); // X-J
    addBuilding(61, 6, 5, 7, [{ x: 2, y: 6 }], "FLOOR"); // X-I
    addBuilding(66, 6, 5, 7, [{ x: 2, y: 6 }], "FLOOR"); // X-H
    addBuilding(71, 6, 5, 7, [{ x: 2, y: 6 }], "FLOOR"); // X-G

    // Corridor along North wing front: y = 13 is PAVING

    // ==========================================
    // EAST WING
    // ==========================================
    addBuilding(76, 6, 6, 7, [{ x: 0, y: 3 }], "FLOOR"); // East corner block
    addBuilding(76, 13, 6, 6, [{ x: 0, y: 3 }], "FLOOR"); // Kelas X-F
    addBuilding(76, 19, 6, 6, [{ x: 0, y: 3 }], "FLOOR"); // Kelas X-E
    addBuilding(76, 25, 6, 4, [{ x: 0, y: 2 }], "FLOOR"); // Toilet Siswa 1
    addBuilding(76, 29, 6, 4, [{ x: 0, y: 2 }], "FLOOR"); // Toilet Siswa 2

    // Area RKB (Ruang Kelas Baru / Crane zone): x: 76..81, y: 33..41
    addBuilding(76, 33, 6, 8, [{ x: 0, y: 4 }], "PAVING");

    // ==========================================
    // LAPANGAN UPACARA (CENTRAL OPEN ASSEMBLY FIELD)
    // ==========================================
    // Expansive tiled courtyard between North wing and Center building
    fillRect(22, 14, 33, 9, "PAVING");
    // Flagpole monument in center of Lapangan Upacara
    grid[38][18] = "WALL"; // Flagpole base

    // Kantin (x: 56..64, y: 14..22)
    addBuilding(56, 14, 9, 9, [{ x: 0, y: 4 }, { x: 4, y: 8 }], "FLOOR");

    // Parkir Siswa (x: 65..75, y: 14..22)
    fillRect(65, 14, 11, 9, "PARKING");

    // ==========================================
    // CENTRAL HORIZONTAL BUILDING (XII-A..F, GUDANG, OSIS)
    // ==========================================
    // x: 29..67, y: 23..29
    addBuilding(29, 23, 5, 6, [{ x: 2, y: 0 }], "FLOOR"); // XII-A
    addBuilding(34, 23, 5, 6, [{ x: 2, y: 0 }], "FLOOR"); // XII-B
    addBuilding(39, 23, 5, 6, [{ x: 2, y: 0 }], "FLOOR"); // XII-C
    addBuilding(44, 23, 5, 6, [{ x: 2, y: 0 }], "FLOOR"); // XII-D
    addBuilding(49, 23, 5, 6, [{ x: 2, y: 0 }], "FLOOR"); // XII-E
    addBuilding(54, 23, 5, 6, [{ x: 2, y: 0 }], "FLOOR"); // XII-F
    addBuilding(59, 23, 5, 6, [{ x: 2, y: 0 }], "FLOOR"); // Gudang Sarpras
    addBuilding(64, 23, 4, 6, [{ x: 1, y: 0 }], "FLOOR"); // Ruang OSIS

    // Parkir Guru & Karyawan (x: 29..48, y: 29..32)
    fillRect(29, 29, 20, 4, "PARKING");

    // ==========================================
    // SPORTS FIELDS (MAIN EVACUATION SAFE ZONE 2)
    // ==========================================
    // Lapangan Olahraga (General field): x: 22..48, y: 33..39
    fillRect(22, 33, 27, 7, "PAVING");

    // Lapangan Voli: x: 49..56, y: 29..39
    fillRect(49, 29, 8, 11, "COURT_VOLI");

    // Lapangan Basket: x: 57..73, y: 29..39
    fillRect(57, 29, 17, 11, "COURT_BASKET");

    // ==========================================
    // SOUTH WING BUILDINGS
    // ==========================================
    // Upper South row (y: 40..44, x: 24..75)
    addBuilding(24, 40, 5, 5, [{ x: 2, y: 0 }], "FLOOR"); // Kelas XI-G
    addBuilding(29, 40, 5, 5, [{ x: 2, y: 0 }], "FLOOR"); // Kelas XI-H
    addBuilding(34, 40, 5, 5, [{ x: 2, y: 0 }], "FLOOR"); // Kelas X-B
    addBuilding(39, 40, 3, 5, [{ x: 1, y: 0 }], "FLOOR"); // Toilet Siswa
    addBuilding(42, 40, 8, 5, [{ x: 4, y: 0 }], "FLOOR"); // Perpustakaan
    addBuilding(50, 40, 6, 5, [{ x: 3, y: 0 }], "FLOOR"); // Kelas X-C
    addBuilding(56, 40, 6, 5, [{ x: 3, y: 0 }], "FLOOR"); // Kelas X-D
    addBuilding(62, 40, 3, 5, [{ x: 1, y: 0 }], "FLOOR"); // Toilet Siswa
    addBuilding(65, 40, 10, 5, [{ x: 5, y: 0 }], "FLOOR"); // Ruang Musik & Karawitan

    // Lower South row (y: 45..49, x: 24..75)
    addBuilding(24, 45, 5, 5, [{ x: 2, y: 0 }], "FLOOR"); // Kelas X-A
    addBuilding(29, 45, 3, 5, [{ x: 1, y: 0 }], "FLOOR"); // Lab Biologi Kantor
    addBuilding(32, 45, 8, 5, [{ x: 4, y: 0 }], "FLOOR"); // Lab Kimia
    addBuilding(40, 45, 8, 5, [{ x: 4, y: 0 }], "FLOOR"); // Lab Fisika
    addBuilding(48, 45, 8, 5, [{ x: 4, y: 0 }], "FLOOR"); // Lab Komputer 1
    addBuilding(56, 45, 8, 5, [{ x: 4, y: 0 }], "FLOOR"); // Lab Komputer 2
    addBuilding(64, 45, 3, 5, [{ x: 1, y: 0 }], "FLOOR"); // Toilet Siswa
    addBuilding(67, 45, 8, 5, [{ x: 4, y: 0 }], "FLOOR"); // Lab Komputer 3

    // Garden & Green Landscaping strips from denah
    fillRect(22, 13, 13, 1, "GRASS");
    fillRect(56, 13, 19, 1, "GRASS");
    fillRect(29, 22, 38, 1, "GRASS");
    fillRect(24, 39, 51, 1, "GRASS");

    // Convert Grid to Tiles Array
    const tiles = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      for (let y = 0; y < MAP_HEIGHT; y++) {
        const type = grid[x][y];
        if (type !== "EMPTY") {
          tiles.push({
            id: crypto.randomUUID(),
            floor_id: floorId,
            x,
            y,
            tile_type: type,
            variant: 0,
            rotation: 0,
          });
        }
      }
    }

    console.log(`Generated ${tiles.length} map tiles.`);

    // Batch insert tiles
    const chunkSize = 500;
    for (let i = 0; i < tiles.length; i += chunkSize) {
      const chunk = tiles.slice(i, i + chunkSize);
      let values = [];
      let queryStr =
        "INSERT INTO digital_twin_tiles (id, floor_id, x, y, tile_type, variant, rotation) VALUES ";

      chunk.forEach((t, idx) => {
        const offset = idx * 7;
        queryStr += `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})${idx === chunk.length - 1 ? "" : ","}`;
        values.push(
          t.id,
          t.floor_id,
          t.x,
          t.y,
          t.tile_type,
          t.variant || 0,
          t.rotation || 0
        );
      });

      await client.query(queryStr, values);
    }

    // ==========================================
    // DISASTER SCENARIOS & GAME OBJECTS
    // ==========================================
    const scenario1Id = "scenario-sman1-gempa";
    const scenario2Id = "scenario-sman1-kebakaran";

    // Scenario 1: Simulasi Gempa Bumi
    await client.query(
      `INSERT INTO digital_twin_scenarios (id, map_id, name, disaster_type, status, version, config)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        scenario1Id,
        mapId,
        "Simulasi Evakuasi Gempa Bumi (SMAN 1 Ngoro)",
        "Gempa",
        "published",
        1,
        JSON.stringify({
          magnitude: 6.8,
          depth_km: 12,
          shaking_duration_sec: 45,
          warning_time_sec: 10,
          weather: "Clear",
          difficulty: "Normal",
          pga_g: 0.38,
        }),
      ]
    );

    // Scenario 2: Simulasi Kebakaran
    await client.query(
      `INSERT INTO digital_twin_scenarios (id, map_id, name, disaster_type, status, version, config)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        scenario2Id,
        mapId,
        "Simulasi Tanggap Darurat & Kebakaran",
        "Kebakaran",
        "published",
        1,
        JSON.stringify({
          spread_speed: 1.2,
          smoke_density: 0.85,
          evacuation_time_limit_sec: 180,
          difficulty: "Hard",
        }),
      ]
    );

    // Scenario Objects for Scenario 1 (Earthquake)
    // IMPORTANT: No room names! Only structural safety, exits, and student spawns.
    const scenarioObjects = [
      // 1. PRIMARY SAFE ASSEMBLY ZONES
      // Safe Zone 1: Lapangan Upacara (Central ceremonial field)
      {
        id: crypto.randomUUID(),
        scenario_id: scenario1Id,
        floor_id: floorId,
        object_type: "SAFE_ZONE",
        x: 25,
        y: 15,
        width: 28,
        height: 7,
        rotation: 0,
        properties: {
          name: "Titik Kumpul Utama (Lapangan Upacara)",
          capacity: 800,
          isPrimary: true,
        },
      },
      // Safe Zone 2: Lapangan Olahraga (Central-South sports field)
      {
        id: crypto.randomUUID(),
        scenario_id: scenario1Id,
        floor_id: floorId,
        object_type: "SAFE_ZONE",
        x: 25,
        y: 33,
        width: 23,
        height: 6,
        rotation: 0,
        properties: {
          name: "Titik Kumpul Lapangan Olahraga",
          capacity: 450,
          isPrimary: true,
        },
      },
      // Safe Zone 3: Lapangan Basket & Voli (Open sports court)
      {
        id: crypto.randomUUID(),
        scenario_id: scenario1Id,
        floor_id: floorId,
        object_type: "SAFE_ZONE",
        x: 50,
        y: 30,
        width: 23,
        height: 9,
        rotation: 0,
        properties: {
          name: "Titik Kumpul Lapangan Basket & Voli",
          capacity: 400,
          isPrimary: false,
        },
      },

      // 2. EXITS / ENTRY GATES (West border along Jl. Salak)
      // Exit 1: Gerbang Masuk/Keluar Utara (Gate 1)
      {
        id: crypto.randomUUID(),
        scenario_id: scenario1Id,
        floor_id: floorId,
        object_type: "EXIT",
        x: 6,
        y: 9,
        width: 2,
        height: 4,
        rotation: 0,
        properties: {
          name: "Gerbang Utara (Jl. Salak)",
          gate_type: "Main Gate",
        },
      },
      // Exit 2: Gerbang Masuk/Keluar Selatan (Gate 2)
      {
        id: crypto.randomUUID(),
        scenario_id: scenario1Id,
        floor_id: floorId,
        object_type: "EXIT",
        x: 6,
        y: 35,
        width: 2,
        height: 4,
        rotation: 0,
        properties: {
          name: "Gerbang Selatan (Jl. Salak Pos Satpam)",
          gate_type: "South Gate",
        },
      },

      // 3. STUDENT & PLAYER SPAWN POINTS
      // Player primary starting spawn in Class XII-A
      {
        id: crypto.randomUUID(),
        scenario_id: scenario1Id,
        floor_id: floorId,
        object_type: "SPAWN",
        x: 31,
        y: 25,
        width: 1,
        height: 1,
        rotation: 0,
        properties: {
          isPlayerStart: true,
          label: "Player Start",
        },
      },
      // Spawns in West classrooms
      { id: crypto.randomUUID(), scenario_id: scenario1Id, floor_id: floorId, object_type: "SPAWN", x: 10, y: 11, width: 1, height: 1, rotation: 0, properties: {} },
      { id: crypto.randomUUID(), scenario_id: scenario1Id, floor_id: floorId, object_type: "SPAWN", x: 10, y: 17, width: 1, height: 1, rotation: 0, properties: {} },
      { id: crypto.randomUUID(), scenario_id: scenario1Id, floor_id: floorId, object_type: "SPAWN", x: 10, y: 23, width: 1, height: 1, rotation: 0, properties: {} },
      { id: crypto.randomUUID(), scenario_id: scenario1Id, floor_id: floorId, object_type: "SPAWN", x: 10, y: 29, width: 1, height: 1, rotation: 0, properties: {} },
      { id: crypto.randomUUID(), scenario_id: scenario1Id, floor_id: floorId, object_type: "SPAWN", x: 10, y: 35, width: 1, height: 1, rotation: 0, properties: {} },
      { id: crypto.randomUUID(), scenario_id: scenario1Id, floor_id: floorId, object_type: "SPAWN", x: 17, y: 14, width: 1, height: 1, rotation: 0, properties: {} },

      // Spawns in North-West wing
      { id: crypto.randomUUID(), scenario_id: scenario1Id, floor_id: floorId, object_type: "SPAWN", x: 24, y: 5, width: 1, height: 1, rotation: 0, properties: {} },
      { id: crypto.randomUUID(), scenario_id: scenario1Id, floor_id: floorId, object_type: "SPAWN", x: 29, y: 5, width: 1, height: 1, rotation: 0, properties: {} },
      { id: crypto.randomUUID(), scenario_id: scenario1Id, floor_id: floorId, object_type: "SPAWN", x: 33, y: 5, width: 1, height: 1, rotation: 0, properties: {} },

      // Spawns in North wing classrooms
      { id: crypto.randomUUID(), scenario_id: scenario1Id, floor_id: floorId, object_type: "SPAWN", x: 38, y: 9, width: 1, height: 1, rotation: 0, properties: {} },
      { id: crypto.randomUUID(), scenario_id: scenario1Id, floor_id: floorId, object_type: "SPAWN", x: 43, y: 9, width: 1, height: 1, rotation: 0, properties: {} },
      { id: crypto.randomUUID(), scenario_id: scenario1Id, floor_id: floorId, object_type: "SPAWN", x: 48, y: 9, width: 1, height: 1, rotation: 0, properties: {} },
      { id: crypto.randomUUID(), scenario_id: scenario1Id, floor_id: floorId, object_type: "SPAWN", x: 53, y: 9, width: 1, height: 1, rotation: 0, properties: {} },
      { id: crypto.randomUUID(), scenario_id: scenario1Id, floor_id: floorId, object_type: "SPAWN", x: 58, y: 9, width: 1, height: 1, rotation: 0, properties: {} },
      { id: crypto.randomUUID(), scenario_id: scenario1Id, floor_id: floorId, object_type: "SPAWN", x: 63, y: 9, width: 1, height: 1, rotation: 0, properties: {} },
      { id: crypto.randomUUID(), scenario_id: scenario1Id, floor_id: floorId, object_type: "SPAWN", x: 68, y: 9, width: 1, height: 1, rotation: 0, properties: {} },
      { id: crypto.randomUUID(), scenario_id: scenario1Id, floor_id: floorId, object_type: "SPAWN", x: 73, y: 9, width: 1, height: 1, rotation: 0, properties: {} },

      // Spawns in Central wing
      { id: crypto.randomUUID(), scenario_id: scenario1Id, floor_id: floorId, object_type: "SPAWN", x: 41, y: 25, width: 1, height: 1, rotation: 0, properties: {} },
      { id: crypto.randomUUID(), scenario_id: scenario1Id, floor_id: floorId, object_type: "SPAWN", x: 51, y: 25, width: 1, height: 1, rotation: 0, properties: {} },

      // Spawns in East wing
      { id: crypto.randomUUID(), scenario_id: scenario1Id, floor_id: floorId, object_type: "SPAWN", x: 78, y: 16, width: 1, height: 1, rotation: 0, properties: {} },
      { id: crypto.randomUUID(), scenario_id: scenario1Id, floor_id: floorId, object_type: "SPAWN", x: 78, y: 21, width: 1, height: 1, rotation: 0, properties: {} },

      // Spawns in South wing & labs
      { id: crypto.randomUUID(), scenario_id: scenario1Id, floor_id: floorId, object_type: "SPAWN", x: 26, y: 42, width: 1, height: 1, rotation: 0, properties: {} },
      { id: crypto.randomUUID(), scenario_id: scenario1Id, floor_id: floorId, object_type: "SPAWN", x: 36, y: 42, width: 1, height: 1, rotation: 0, properties: {} },
      { id: crypto.randomUUID(), scenario_id: scenario1Id, floor_id: floorId, object_type: "SPAWN", x: 46, y: 42, width: 1, height: 1, rotation: 0, properties: {} },
      { id: crypto.randomUUID(), scenario_id: scenario1Id, floor_id: floorId, object_type: "SPAWN", x: 53, y: 42, width: 1, height: 1, rotation: 0, properties: {} },
      { id: crypto.randomUUID(), scenario_id: scenario1Id, floor_id: floorId, object_type: "SPAWN", x: 35, y: 47, width: 1, height: 1, rotation: 0, properties: {} },
      { id: crypto.randomUUID(), scenario_id: scenario1Id, floor_id: floorId, object_type: "SPAWN", x: 44, y: 47, width: 1, height: 1, rotation: 0, properties: {} },
      { id: crypto.randomUUID(), scenario_id: scenario1Id, floor_id: floorId, object_type: "SPAWN", x: 52, y: 47, width: 1, height: 1, rotation: 0, properties: {} },
      { id: crypto.randomUUID(), scenario_id: scenario1Id, floor_id: floorId, object_type: "SPAWN", x: 71, y: 47, width: 1, height: 1, rotation: 0, properties: {} },

      // 4. EARTHQUAKE DEBRIS / BLOCKED AREAS
      {
        id: crypto.randomUUID(),
        scenario_id: scenario1Id,
        floor_id: floorId,
        object_type: "BLOCKED_AREA",
        x: 76,
        y: 33,
        width: 6,
        height: 8,
        rotation: 0,
        properties: {
          hazard: "Runtuhan Konstruksi RKB",
        },
      },
      {
        id: crypto.randomUUID(),
        scenario_id: scenario1Id,
        floor_id: floorId,
        object_type: "DAMAGE_ZONE",
        x: 72,
        y: 34,
        width: 4,
        height: 4,
        rotation: 0,
        properties: {
          hazard: "Puing Berserakan",
        },
      },
    ];

    // Insert scenario objects
    for (const obj of scenarioObjects) {
      await client.query(
        `INSERT INTO digital_twin_scenario_objects (id, scenario_id, floor_id, object_type, x, y, width, height, rotation, properties)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          obj.id,
          obj.scenario_id,
          obj.floor_id,
          obj.object_type,
          obj.x,
          obj.y,
          obj.width,
          obj.height,
          obj.rotation,
          JSON.stringify(obj.properties || {}),
        ]
      );
    }

    // Also populate Scenario 2 (Kebakaran) objects
    const fireScenarioObjects = [
      // Same safe zones and exits
      { id: crypto.randomUUID(), scenario_id: scenario2Id, floor_id: floorId, object_type: "SAFE_ZONE", x: 25, y: 15, width: 28, height: 7, rotation: 0, properties: { name: "Titik Kumpul Lapangan Upacara" } },
      { id: crypto.randomUUID(), scenario_id: scenario2Id, floor_id: floorId, object_type: "SAFE_ZONE", x: 25, y: 33, width: 23, height: 6, rotation: 0, properties: { name: "Titik Kumpul Lapangan Olahraga" } },
      { id: crypto.randomUUID(), scenario_id: scenario2Id, floor_id: floorId, object_type: "EXIT", x: 6, y: 9, width: 2, height: 4, rotation: 0, properties: {} },
      { id: crypto.randomUUID(), scenario_id: scenario2Id, floor_id: floorId, object_type: "EXIT", x: 6, y: 35, width: 2, height: 4, rotation: 0, properties: {} },
      { id: crypto.randomUUID(), scenario_id: scenario2Id, floor_id: floorId, object_type: "SPAWN", x: 31, y: 25, width: 1, height: 1, rotation: 0, properties: { isPlayerStart: true } },
      // Fire hazards in Chemistry lab
      { id: crypto.randomUUID(), scenario_id: scenario2Id, floor_id: floorId, object_type: "FIRE", x: 34, y: 46, width: 4, height: 3, rotation: 0, properties: {} },
      { id: crypto.randomUUID(), scenario_id: scenario2Id, floor_id: floorId, object_type: "SMOKE", x: 32, y: 44, width: 8, height: 5, rotation: 0, properties: {} },
    ];

    for (const obj of fireScenarioObjects) {
      await client.query(
        `INSERT INTO digital_twin_scenario_objects (id, scenario_id, floor_id, object_type, x, y, width, height, rotation, properties)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          obj.id,
          obj.scenario_id,
          obj.floor_id,
          obj.object_type,
          obj.x,
          obj.y,
          obj.width,
          obj.height,
          obj.rotation,
          JSON.stringify(obj.properties || {}),
        ]
      );
    }

    await client.query("COMMIT");
    console.log("PostgreSQL seed complete! Map ID:", mapId);

    // Also sync to JSON db for legacy / fallback compatibility
    try {
      const db = await readDB();
      if (!db.gridMaps) db.gridMaps = {};

      const cellMap = {};
      tiles.forEach((t) => {
        cellMap[`${t.x},${t.y}`] = {
          x: t.x,
          y: t.y,
          type: t.tile_type,
          walkable: t.tile_type !== "WALL",
        };
      });

      db.gridMaps[mapId] = {
        id: mapId,
        schoolId: SMAN1_SCHOOL_ID,
        name: "Denah Kampus Terpadu (SMAN 1 Ngoro)",
        description: "Official Architectural Grid Map",
        gridWidth: MAP_WIDTH,
        gridHeight: MAP_HEIGHT,
        cellScale: 1,
        cellScaleUnit: "meter",
        cells: cellMap,
        rooms: [], // Kept empty of name labels per strict user requirement
        doors: tiles.filter((t) => t.tile_type === "DOOR").map((d, i) => ({ id: `d_${i}`, x: d.x, y: d.y, state: "open", breakable: false })),
        safePoints: [
          { id: "sp_upacara", name: "Titik Kumpul Lapangan Upacara", x: 38, y: 18, capacity: 800, enabled: true, priority: 1 },
          { id: "sp_olahraga", name: "Titik Kumpul Lapangan Olahraga", x: 36, y: 36, capacity: 450, enabled: true, priority: 1 },
          { id: "sp_basket", name: "Titik Kumpul Lapangan Basket", x: 65, y: 34, capacity: 400, enabled: true, priority: 2 },
        ],
        spawnPoints: [
          { id: "sp_player", name: "Player Spawn", x: 31, y: 25 },
        ],
        isPublic: true,
        authorName: "Tim Tanggap Bencana",
        schoolName: "SMAN 1 Ngoro",
        createdBy: "system",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await writeDB(db);
      console.log("Synchronized to JSON db.gridMaps.");
    } catch (dbErr) {
      console.warn("Failed to sync to db.json (non-fatal):", dbErr.message);
    }

    console.log("Seeding finished successfully!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error seeding map:", err);
  } finally {
    client.release();
    process.exit(0);
  }
}

seedDenahGameMap().catch(console.error);
