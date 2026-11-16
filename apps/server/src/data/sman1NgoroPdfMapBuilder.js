/**
 * Deterministic Digital Twin map and scenario builder derived from the official
 * SMAN 1 Ngoro floor plan PDF ("DENAH LOKASI DAN RUANG PAS GASAL 2023/2024",
 * Jl. Candi Jolotundo, Kutogirang, Ngoro, Mojokerto 61385).
 * Orientation: North = Top (y = 0).
 */

export const SMAN1_NGORO_SCHOOL_ID = "ffdcdf34-fc99-4209-913e-5a6042e957ad";
export const SMAN1_NGORO_MAP_ID = "map-sman1-denah";
export const SMAN1_NGORO_FLOOR_ID = "floor-sman1-1";
export const MAP_WIDTH = 102;
export const MAP_HEIGHT = 58;

export const SCENARIO_IDS = {
  GEMPA: "scenario-sman1-gempa",
  KEBAKARAN: "scenario-sman1-kebakaran",
  BANJIR: "scenario-sman1-banjir",
  ANGIN: "scenario-sman1-angin",
  KIMIA: "scenario-sman1-kimia",
  PETIR: "scenario-sman1-petir",
  LONGSOR: "scenario-sman1-longsor",
  PAS_DRILL: "scenario-sman1-pas",
};

function createGrid(width, height, defaultTile = "PAVING") {
  return Array.from({ length: height }, () => Array(width).fill(defaultTile));
}

function fillRect(grid, x1, y1, x2, y2, tileType) {
  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
        grid[y][x] = tileType;
      }
    }
  }
}

/**
 * Stamps a walled room rectangle onto the tile grid and returns a room descriptor
 * matching the digital_twin_rooms schema.
 */
function placeWalledRoom(grid, rooms, config) {
  const {
    id,
    name,
    shortName,
    type = "classroom",
    x1,
    y1,
    x2,
    y2,
    floorType = "FLOOR",
    doors = [],
    capacity = 32,
    color = "#fef08a",
    category = "academic",
  } = config;

  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      const isPerimeter = x === x1 || x === x2 || y === y1 || y === y2;
      grid[y][x] = isPerimeter ? "WALL" : floorType;
    }
  }

  for (const [dx, dy] of doors) {
    grid[dy][dx] = "DOOR";
  }

  rooms.push({
    id,
    map_id: SMAN1_NGORO_MAP_ID,
    floor_id: SMAN1_NGORO_FLOOR_ID,
    name,
    type,
    x: x1,
    y: y1,
    width: x2 - x1 + 1,
    height: y2 - y1 + 1,
    capacity,
    metadata: {
      shortName: shortName || name,
      color,
      category,
      doors: doors.map(([x, y]) => ({ x, y })),
    },
  });
}

function buildSman1NgoroTileAndRoomLayout() {
  const grid = createGrid(MAP_WIDTH, MAP_HEIGHT, "PAVING");
  const rooms = [];
  const floorObjects = [];

  // North road (Jl. Candi Jolotundo) and campus outer fence perimeter
  fillRect(grid, 0, 0, MAP_WIDTH - 1, 0, "ROAD");
  fillRect(grid, 0, 1, 50, 1, "BORDER");
  fillRect(grid, 62, 1, MAP_WIDTH - 1, 1, "BORDER");
  grid[1][50] = "WALL";
  grid[1][62] = "WALL";

  for (let y = 1; y < MAP_HEIGHT; y++) {
    grid[y][0] = "BORDER";
    grid[y][MAP_WIDTH - 1] = "BORDER";
  }
  fillRect(grid, 0, MAP_HEIGHT - 1, MAP_WIDTH - 1, MAP_HEIGHT - 1, "BORDER");

  // Front green strips, parking bays, courtyard lawn, and south garden belt
  fillRect(grid, 1, 2, 49, 2, "GRASS");
  fillRect(grid, 14, 3, 49, 5, "PARKING");
  fillRect(grid, 63, 2, 93, 2, "GRASS");
  fillRect(grid, 63, 3, 89, 5, "PARKING");
  fillRect(grid, 11, 22, 53, 37, "GRASS");
  fillRect(grid, 48, 15, 52, 18, "GRASS");
  fillRect(grid, 17, 50, 94, 56, "GRASS");

  // Main Gate & Outdoor Zone metadata records
  rooms.push(
    {
      id: "room-sman1-gerbang-utama",
      map_id: SMAN1_NGORO_MAP_ID,
      floor_id: SMAN1_NGORO_FLOOR_ID,
      name: "Gerbang Utama (Jl. Candi Jolotundo)",
      type: "gate",
      x: 51,
      y: 0,
      width: 11,
      height: 3,
      capacity: 120,
      metadata: {
        shortName: "GERBANG",
        color: "#fed7aa",
        category: "access",
      },
    },
    {
      id: "room-sman1-parkir-guru",
      map_id: SMAN1_NGORO_MAP_ID,
      floor_id: SMAN1_NGORO_FLOOR_ID,
      name: "Tempat Parkir Guru",
      type: "parking",
      x: 63,
      y: 3,
      width: 27,
      height: 4,
      capacity: 80,
      metadata: {
        shortName: "TEMPAT PARKIR GURU",
        color: "#bbf7d0",
        category: "outdoor",
      },
    },
    {
      id: "room-sman1-lapangan-upacara",
      map_id: SMAN1_NGORO_MAP_ID,
      floor_id: SMAN1_NGORO_FLOOR_ID,
      name: "Lapangan Upacara",
      type: "assembly",
      x: 11,
      y: 22,
      width: 43,
      height: 16,
      capacity: 650,
      metadata: {
        shortName: "LAPANGAN UPACARA",
        color: "#d9f99d",
        category: "assembly",
        flagpole: { x: 35, y: 22, width: 3, height: 1 },
      },
    },
    {
      id: "room-sman1-taman-selatan",
      map_id: SMAN1_NGORO_MAP_ID,
      floor_id: SMAN1_NGORO_FLOOR_ID,
      name: "Taman Selatan",
      type: "garden",
      x: 17,
      y: 50,
      width: 78,
      height: 7,
      capacity: 150,
      metadata: {
        shortName: "TAMAN",
        color: "#86efac",
        category: "outdoor",
      },
    },
  );

  // Far-West Sports & Utility Column
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-gor",
    name: "GOR",
    shortName: "GOR",
    type: "sports",
    x1: 0,
    y1: 7,
    x2: 7,
    y2: 19,
    floorType: "COURT_VOLI",
    doors: [
      [3, 7],
      [4, 7],
      [3, 19],
      [4, 19],
    ],
    capacity: 120,
    color: "#fdba74",
    category: "sports",
  });
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-wc-gor-1",
    name: "WC (GOR Utara)",
    shortName: "WC",
    type: "restroom",
    x1: 7,
    y1: 7,
    x2: 11,
    y2: 10,
    doors: [[9, 7]],
    capacity: 4,
    color: "#f8fafc",
    category: "utility",
  });
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-wc-gor-2",
    name: "WC (GOR Tengah)",
    shortName: "WC",
    type: "restroom",
    x1: 7,
    y1: 10,
    x2: 11,
    y2: 13,
    doors: [[7, 11]],
    capacity: 4,
    color: "#f8fafc",
    category: "utility",
  });
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-ms",
    name: "MS (Musholla / Gudang Olahraga)",
    shortName: "MS",
    type: "utility",
    x1: 7,
    y1: 13,
    x2: 11,
    y2: 16,
    doors: [[7, 14]],
    capacity: 6,
    color: "#f8fafc",
    category: "utility",
  });
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-g",
    name: "G (Gudang Barat)",
    shortName: "G",
    type: "storage",
    x1: 7,
    y1: 16,
    x2: 11,
    y2: 19,
    doors: [[9, 19]],
    capacity: 6,
    color: "#f8fafc",
    category: "utility",
  });

  // West Perimeter Wing (South of GOR corridor)
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-lab-fisika",
    name: "Lab. Fisika",
    shortName: "LAB. FISIKA",
    type: "lab",
    x1: 0,
    y1: 22,
    x2: 8,
    y2: 32,
    doors: [
      [8, 26],
      [8, 27],
    ],
    capacity: 36,
    color: "#d9f99d",
    category: "academic",
  });
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-wc-barat",
    name: "WC (Barat)",
    shortName: "WC",
    type: "restroom",
    x1: 0,
    y1: 35,
    x2: 7,
    y2: 39,
    doors: [[7, 37]],
    capacity: 8,
    color: "#f8fafc",
    category: "utility",
  });
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-ruang-26",
    name: "Ruang 26",
    shortName: "26",
    type: "classroom",
    x1: 0,
    y1: 41,
    x2: 8,
    y2: 49,
    doors: [
      [4, 41],
      [8, 45],
    ],
    capacity: 34,
    color: "#fef08a",
    category: "classroom",
  });
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-penunjang-26a",
    name: "Ruang Penunjang Barat A",
    shortName: "R. BARAT A",
    type: "utility",
    x1: 0,
    y1: 49,
    x2: 4,
    y2: 57,
    doors: [
      [2, 49],
      [4, 53],
    ],
    capacity: 12,
    color: "#fef08a",
    category: "classroom",
  });
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-penunjang-26b",
    name: "Ruang Penunjang Barat B",
    shortName: "R. BARAT B",
    type: "utility",
    x1: 4,
    y1: 49,
    x2: 8,
    y2: 57,
    doors: [
      [4, 53],
      [8, 53],
    ],
    capacity: 12,
    color: "#fef08a",
    category: "classroom",
  });

  // North Building Wing (West -> East)
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-ruang-1",
    name: "Ruang 1",
    shortName: "1",
    type: "classroom",
    x1: 11,
    y1: 7,
    x2: 17,
    y2: 15,
    doors: [
      [14, 7],
      [13, 15],
      [14, 15],
    ],
    capacity: 34,
    color: "#fef08a",
    category: "classroom",
  });
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-ruang-2",
    name: "Ruang 2",
    shortName: "2",
    type: "classroom",
    x1: 17,
    y1: 7,
    x2: 23,
    y2: 15,
    doors: [
      [20, 7],
      [19, 15],
      [20, 15],
    ],
    capacity: 34,
    color: "#fef08a",
    category: "classroom",
  });
  // Porch planters beneath Ruang 1 & 2 (matching PDF terrace blocks while keeping wide paths)
  for (const px of [12, 16, 18, 22]) {
    grid[17][px] = "GRASS";
  }

  placeWalledRoom(grid, rooms, {
    id: "room-sman1-ruang-guru",
    name: "Ruang Guru",
    shortName: "RUANG GURU",
    type: "office",
    x1: 23,
    y1: 7,
    x2: 29,
    y2: 18,
    doors: [
      [26, 7],
      [25, 18],
      [26, 18],
    ],
    capacity: 45,
    color: "#f8fafc",
    category: "admin",
  });
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-lobi",
    name: "Lobi",
    shortName: "LOBI",
    type: "lobby",
    x1: 29,
    y1: 7,
    x2: 35,
    y2: 18,
    doors: [
      [32, 7],
      [32, 18],
      [35, 12],
    ],
    capacity: 25,
    color: "#fed7aa",
    category: "admin",
  });

  // Center-North Administration, Secretariat, BK & Masjid
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-kasek",
    name: "R. Kasek",
    shortName: "R.KASEK",
    type: "office",
    x1: 39,
    y1: 7,
    x2: 46,
    y2: 13,
    doors: [
      [39, 10],
      [41, 7],
    ],
    capacity: 8,
    color: "#f8fafc",
    category: "admin",
  });
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-wc-kasek",
    name: "WC (R. Kasek)",
    shortName: "WC",
    type: "restroom",
    x1: 42,
    y1: 7,
    x2: 46,
    y2: 10,
    doors: [[42, 8]],
    capacity: 2,
    color: "#f8fafc",
    category: "utility",
  });
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-ruang-3",
    name: "Ruang 3",
    shortName: "3",
    type: "classroom",
    x1: 46,
    y1: 7,
    x2: 53,
    y2: 13,
    doors: [
      [49, 7],
      [50, 13],
    ],
    capacity: 34,
    color: "#fef08a",
    category: "classroom",
  });
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-meeting",
    name: "R. Meeting",
    shortName: "R. MEETING",
    type: "meeting",
    x1: 39,
    y1: 13,
    x2: 47,
    y2: 18,
    doors: [
      [39, 15],
      [43, 18],
    ],
    capacity: 20,
    color: "#f8fafc",
    category: "admin",
  });
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-sekretariat",
    name: "Ruang Sekretariat",
    shortName: "R. SEKRETARIAT",
    type: "office",
    x1: 53,
    y1: 7,
    x2: 57,
    y2: 18,
    doors: [
      [55, 7],
      [55, 18],
    ],
    capacity: 15,
    color: "#38bdf8",
    category: "admin",
  });
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-bk",
    name: "Ruang BK",
    shortName: "RUANG BK",
    type: "office",
    x1: 57,
    y1: 7,
    x2: 62,
    y2: 18,
    doors: [
      [59, 7],
      [59, 18],
    ],
    capacity: 14,
    color: "#f8fafc",
    category: "admin",
  });
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-masjid",
    name: "Masjid Sabilunnajah",
    shortName: "MASJID SABILUNNAJAH",
    type: "worship",
    x1: 62,
    y1: 7,
    x2: 73,
    y2: 18,
    floorType: "MOSQUE",
    doors: [
      [67, 7],
      [68, 7],
      [67, 18],
      [68, 18],
      [73, 12],
    ],
    capacity: 140,
    color: "#15803d",
    category: "worship",
  });

  // North-East Classrooms 4, 5, 6 + NE WC & East Parking
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-ruang-4",
    name: "Ruang 4",
    shortName: "4",
    type: "classroom",
    x1: 76,
    y1: 9,
    x2: 82,
    y2: 17,
    doors: [
      [79, 9],
      [79, 17],
    ],
    capacity: 34,
    color: "#fef08a",
    category: "classroom",
  });
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-ruang-5",
    name: "Ruang 5",
    shortName: "5",
    type: "classroom",
    x1: 82,
    y1: 9,
    x2: 88,
    y2: 17,
    doors: [
      [85, 9],
      [85, 17],
    ],
    capacity: 34,
    color: "#fef08a",
    category: "classroom",
  });
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-ruang-6",
    name: "Ruang 6",
    shortName: "6",
    type: "classroom",
    x1: 88,
    y1: 9,
    x2: 94,
    y2: 17,
    doors: [
      [91, 9],
      [91, 17],
    ],
    capacity: 34,
    color: "#fef08a",
    category: "classroom",
  });

  placeWalledRoom(grid, rooms, {
    id: "room-sman1-wc-utara-1",
    name: "WC (Timur Laut Atas)",
    shortName: "WC",
    type: "restroom",
    x1: 94,
    y1: 1,
    x2: 101,
    y2: 4,
    doors: [[94, 2]],
    capacity: 4,
    color: "#f8fafc",
    category: "utility",
  });
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-wc-utara-2",
    name: "WC (Timur Laut Bawah)",
    shortName: "WC",
    type: "restroom",
    x1: 94,
    y1: 4,
    x2: 101,
    y2: 7,
    doors: [[94, 5]],
    capacity: 4,
    color: "#f8fafc",
    category: "utility",
  });

  // East Tempat Parkir bay (open West onto corridor x=95)
  fillRect(grid, 96, 8, 101, 8, "WALL");
  fillRect(grid, 96, 19, 101, 19, "WALL");
  fillRect(grid, 101, 8, 101, 19, "WALL");
  grid[9][96] = "WALL";
  grid[17][96] = "WALL";
  grid[18][96] = "WALL";
  fillRect(grid, 97, 9, 100, 18, "PARKING");
  rooms.push({
    id: "room-sman1-parkir-timur",
    map_id: SMAN1_NGORO_MAP_ID,
    floor_id: SMAN1_NGORO_FLOOR_ID,
    name: "Tempat Parkir (Timur)",
    type: "parking",
    x: 96,
    y: 8,
    width: 6,
    height: 12,
    capacity: 40,
    metadata: {
      shortName: "TEMPAT PARKIR",
      color: "#e2e8f0",
      category: "outdoor",
    },
  });

  // Central Service Strip immediately East of Lapangan Upacara
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-gudang",
    name: "Gudang",
    shortName: "GUDANG",
    type: "storage",
    x1: 54,
    y1: 22,
    x2: 59,
    y2: 26,
    doors: [[59, 24]],
    capacity: 6,
    color: "#fed7aa",
    category: "utility",
  });
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-operator",
    name: "Ruang Operator",
    shortName: "R. OPERATOR",
    type: "office",
    x1: 54,
    y1: 26,
    x2: 59,
    y2: 34,
    doors: [
      [59, 30],
      [54, 30],
    ],
    capacity: 10,
    color: "#0ea5e9",
    category: "admin",
  });
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-uks",
    name: "UKS",
    shortName: "UKS",
    type: "medical",
    x1: 54,
    y1: 34,
    x2: 59,
    y2: 38,
    doors: [
      [59, 36],
      [56, 38],
    ],
    capacity: 10,
    color: "#bef264",
    category: "medical",
  });

  // East-Center Dual Classroom Wings: 12..7 (Upper) & 13..18 (Lower)
  const eastColumns = [
    [62, 68, 12, 13],
    [68, 74, 11, 14],
    [74, 81, 10, 15],
    [81, 87, 9, 16],
    [87, 94, 8, 17],
    [94, 101, 7, 18],
  ];

  for (const [x1, x2, upperNum, lowerNum] of eastColumns) {
    const midX = Math.floor((x1 + x2) / 2);
    placeWalledRoom(grid, rooms, {
      id: `room-sman1-ruang-${upperNum}`,
      name: `Ruang ${upperNum}`,
      shortName: `${upperNum}`,
      type: "classroom",
      x1,
      y1: 22,
      x2,
      y2: 27,
      doors: [
        [midX, 22],
        [midX, 27],
      ],
      capacity: 34,
      color: "#fef08a",
      category: "classroom",
    });
    placeWalledRoom(grid, rooms, {
      id: `room-sman1-ruang-${lowerNum}`,
      name: `Ruang ${lowerNum}`,
      shortName: `${lowerNum}`,
      type: "classroom",
      x1,
      y1: 32,
      x2,
      y2: 37,
      doors: [
        [midX, 32],
        [midX, 37],
      ],
      capacity: 34,
      color: "#fef08a",
      category: "classroom",
    });
  }

  // South Building Wing (West -> East)
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-ruang-25",
    name: "Ruang 25",
    shortName: "25",
    type: "classroom",
    x1: 11,
    y1: 41,
    x2: 17,
    y2: 49,
    doors: [[14, 41]],
    capacity: 34,
    color: "#fef08a",
    category: "classroom",
  });
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-tandon",
    name: "Tandon",
    shortName: "TANDON",
    type: "utility",
    x1: 11,
    y1: 49,
    x2: 16,
    y2: 57,
    doors: [[11, 53]],
    capacity: 4,
    color: "#f8fafc",
    category: "utility",
  });
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-ruang-24",
    name: "Ruang 24",
    shortName: "24",
    type: "classroom",
    x1: 17,
    y1: 41,
    x2: 23,
    y2: 49,
    doors: [[20, 41]],
    capacity: 34,
    color: "#fef08a",
    category: "classroom",
  });
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-osis",
    name: "R. OSIS",
    shortName: "R. OSIS",
    type: "office",
    x1: 23,
    y1: 41,
    x2: 30,
    y2: 49,
    doors: [[26, 41]],
    capacity: 18,
    color: "#f8fafc",
    category: "student_org",
  });
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-perpustakaan",
    name: "Perpustakaan",
    shortName: "PERPUSTAKAAN",
    type: "library",
    x1: 30,
    y1: 41,
    x2: 48,
    y2: 49,
    doors: [
      [36, 41],
      [42, 41],
      [39, 49],
    ],
    capacity: 75,
    color: "#f8fafc",
    category: "academic",
  });

  // Note: x=49, y=41..49 remains an open paving walkway seam to Taman Selatan
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-wc-selatan-1",
    name: "WC (Selatan 1)",
    shortName: "WC",
    type: "restroom",
    x1: 50,
    y1: 41,
    x2: 53,
    y2: 49,
    doors: [[51, 41]],
    capacity: 4,
    color: "#f8fafc",
    category: "utility",
  });
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-wc-selatan-2",
    name: "WC (Selatan 2)",
    shortName: "WC",
    type: "restroom",
    x1: 53,
    y1: 41,
    x2: 56,
    y2: 49,
    doors: [[54, 41]],
    capacity: 4,
    color: "#f8fafc",
    category: "utility",
  });
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-wc-selatan-3",
    name: "WC (Selatan 3)",
    shortName: "WC",
    type: "restroom",
    x1: 56,
    y1: 41,
    x2: 59,
    y2: 49,
    doors: [[57, 41]],
    capacity: 4,
    color: "#f8fafc",
    category: "utility",
  });
  placeWalledRoom(grid, rooms, {
    id: "room-sman1-kop",
    name: "KOP (Koperasi Siswa)",
    shortName: "KOP",
    type: "commercial",
    x1: 59,
    y1: 41,
    x2: 64,
    y2: 49,
    doors: [[61, 41]],
    capacity: 15,
    color: "#f8fafc",
    category: "utility",
  });

  const southRooms = [
    [64, 70, 23],
    [70, 76, 22],
    [76, 82, 21],
    [82, 88, 20],
    [88, 95, 19],
  ];
  for (const [x1, x2, num] of southRooms) {
    const midX = Math.floor((x1 + x2) / 2);
    placeWalledRoom(grid, rooms, {
      id: `room-sman1-ruang-${num}`,
      name: `Ruang ${num}`,
      shortName: `${num}`,
      type: "classroom",
      x1,
      y1: 41,
      x2,
      y2: 49,
      doors: [[midX, 41]],
      capacity: 34,
      color: "#fef08a",
      category: "classroom",
    });
  }

  placeWalledRoom(grid, rooms, {
    id: "room-sman1-kantin",
    name: "Kantin Sekolah",
    shortName: "KANTIN SEKOLAH",
    type: "canteen",
    x1: 95,
    y1: 41,
    x2: 101,
    y2: 57,
    doors: [
      [97, 41],
      [98, 41],
      [95, 52],
    ],
    capacity: 60,
    color: "#f8fafc",
    category: "utility",
  });

  const tiles = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      tiles.push({
        id: `tile-${x}-${y}`,
        floor_id: SMAN1_NGORO_FLOOR_ID,
        x,
        y,
        tile_type: grid[y][x],
        rotation: 0,
        variant: 0,
        metadata: null,
      });
    }
  }

  return { grid, tiles, rooms, floorObjects };
}

function buildScenarioObjects() {
  const safeZonesAndExits = [
    {
      object_type: "SAFE_ZONE",
      x: 24,
      y: 26,
      width: 14,
      height: 8,
      properties: {
        name: "Titik Kumpul Utama (Lapangan Upacara)",
        capacity: 600,
      },
    },
    {
      object_type: "SAFE_ZONE",
      x: 68,
      y: 3,
      width: 12,
      height: 3,
      properties: {
        name: "Titik Kumpul Utara (Tempat Parkir Guru)",
        capacity: 150,
      },
    },
    {
      object_type: "SAFE_ZONE",
      x: 26,
      y: 51,
      width: 12,
      height: 4,
      properties: {
        name: "Titik Kumpul Taman Selatan",
        capacity: 120,
      },
    },
    {
      object_type: "EXIT",
      x: 54,
      y: 1,
      width: 4,
      height: 2,
      properties: {
        name: "Gerbang Utama (Jl. Candi Jolotundo)",
        destination: "Jl. Candi Jolotundo",
      },
    },
  ];

  // Key spawns centered inside walkable interiors of real PDF classrooms & buildings
  const classroomSpawns = [
    { x: 14, y: 11, label: "Ruang 1" },
    { x: 20, y: 11, label: "Ruang 2" },
    { x: 49, y: 10, label: "Ruang 3" },
    { x: 79, y: 13, label: "Ruang 4" },
    { x: 85, y: 13, label: "Ruang 5" },
    { x: 91, y: 13, label: "Ruang 6" },
    { x: 97, y: 24, label: "Ruang 7" },
    { x: 90, y: 24, label: "Ruang 8" },
    { x: 84, y: 24, label: "Ruang 9" },
    { x: 77, y: 24, label: "Ruang 10" },
    { x: 71, y: 24, label: "Ruang 11" },
    { x: 65, y: 24, label: "Ruang 12" },
    { x: 65, y: 34, label: "Ruang 13" },
    { x: 71, y: 34, label: "Ruang 14" },
    { x: 77, y: 34, label: "Ruang 15" },
    { x: 84, y: 34, label: "Ruang 16" },
    { x: 90, y: 34, label: "Ruang 17" },
    { x: 97, y: 34, label: "Ruang 18" },
    { x: 91, y: 45, label: "Ruang 19" },
    { x: 85, y: 45, label: "Ruang 20" },
    { x: 79, y: 45, label: "Ruang 21" },
    { x: 73, y: 45, label: "Ruang 22" },
    { x: 67, y: 45, label: "Ruang 23" },
    { x: 20, y: 45, label: "Ruang 24" },
    { x: 14, y: 45, label: "Ruang 25" },
    { x: 4, y: 45, label: "Ruang 26" },
    { x: 26, y: 12, label: "Ruang Guru" },
    { x: 4, y: 27, label: "Lab. Fisika" },
    { x: 39, y: 45, label: "Perpustakaan" },
    { x: 3, y: 13, label: "GOR" },
  ];

  const buildObjects = (scenarioId, rawList) =>
    rawList.map((obj, idx) => ({
      id: `${scenarioId}-obj-${idx + 1}`,
      scenario_id: scenarioId,
      floor_id: SMAN1_NGORO_FLOOR_ID,
      object_type: obj.object_type,
      x: obj.x,
      y: obj.y,
      width: obj.width || 1,
      height: obj.height || 1,
      rotation: 0,
      properties: obj.properties || {},
    }));

  const gempaSpawns = [
    // Mulai dari pojok terjauh (Ruang 26 Barat Daya) agar jarak evakuasi ke P3K -> Lobi -> Gerbang Utara lebih panjang
    {
      object_type: "SPAWN",
      x: 4,
      y: 45,
      properties: { label: "Ruang 26 (Pojok Barat Daya — Utama)" },
    },
    ...classroomSpawns
      .filter((s) => s.label !== "Ruang 26")
      .map((s) => ({
        object_type: "SPAWN",
        x: s.x,
        y: s.y,
        properties: { label: s.label },
      })),
  ];

  const gempaHazards = [
    {
      object_type: "BLOCKED_AREA",
      x: 24,
      y: 19,
      width: 3,
      height: 2,
      properties: { reason: "Runtuhan kanopi beton teras Ruang Guru" },
    },
    {
      object_type: "BLOCKED_AREA",
      x: 69,
      y: 28,
      width: 3,
      height: 2,
      properties: { reason: "Tembok koridor sayap tengah ambruk total" },
    },
    {
      object_type: "BLOCKED_AREA",
      x: 39,
      y: 19,
      width: 4,
      height: 2,
      properties: { reason: "Atap lobi dan selasar tengah runtuh" },
    },
    {
      object_type: "BLOCKED_AREA",
      x: 54,
      y: 19,
      width: 3,
      height: 1,
      properties: { reason: "Puing pilar Sekretariat menyumbat jalur utara" },
    },
    {
      object_type: "BLOCKED_AREA",
      x: 11,
      y: 38,
      width: 4,
      height: 1,
      properties: { reason: "Reruntuhan balok koridor Ruang 25" },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 75,
      y: 28,
      width: 4,
      height: 2,
      properties: {
        reason: "Retakan atap koridor timur",
        damagePerSec: 26,
        hazardKind: "COLLAPSE",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 20,
      y: 38,
      width: 4,
      height: 1,
      properties: {
        reason: "Runtuhan genteng & pecahan beton selatan",
        damagePerSec: 25,
        hazardKind: "SHARD",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 50,
      y: 3,
      width: 2,
      height: 3,
      properties: {
        reason: "Tiang gerbang miring berisiko runtuh",
        damagePerSec: 28,
        hazardKind: "COLLAPSE",
      },
    },
    // Bahaya tersembunyi (baru terlihat tipis saat mendekat atau aktif jika terinjak)
    {
      object_type: "DAMAGE_ZONE",
      x: 10,
      y: 34,
      width: 1,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "ELECTRICAL",
        burstDamage: 32,
        damagePerSec: 20,
        revealRadius: 1.85,
        reason: "Kabel listrik utama putus tersembunyi di koridor barat",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 34,
      y: 39,
      width: 1,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "SHARD",
        burstDamage: 24,
        damagePerSec: 18,
        revealRadius: 1.8,
        reason: "Pecahan kaca Perpustakaan tersamar di selasar",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 51,
      y: 25,
      width: 2,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "COLLAPSE",
        burstDamage: 30,
        damagePerSec: 22,
        revealRadius: 1.85,
        reason: "Amblesan konblok tepi timur Lapangan Upacara",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 61,
      y: 21,
      width: 1,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "ELECTRICAL",
        burstDamage: 34,
        damagePerSec: 22,
        revealRadius: 1.8,
        reason: "Kabel korsleting sudut Gudang-Masjid",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 47,
      y: 5,
      width: 2,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "COLLAPSE",
        burstDamage: 28,
        damagePerSec: 20,
        revealRadius: 1.8,
        reason: "Retakan saluran gorong-gorong halaman depan",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 37,
      y: 11,
      width: 1,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "SHARD",
        burstDamage: 26,
        damagePerSec: 18,
        revealRadius: 1.75,
        reason: "Pecahan partisi kaca lorong Lobi–R.Kasek",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 60,
      y: 35,
      width: 1,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "ELECTRICAL",
        burstDamage: 32,
        damagePerSec: 20,
        revealRadius: 1.8,
        reason: "Panel listrik rusak dekat UKS",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 66,
      y: 19,
      width: 2,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "COLLAPSE",
        burstDamage: 30,
        damagePerSec: 22,
        revealRadius: 1.8,
        reason: "Langit-langit rapuh serambi Masjid",
      },
    },
  ];

  const kebakaranSpawns = [
    {
      object_type: "SPAWN",
      x: 91,
      y: 45,
      properties: { label: "Ruang 19 (Tenggara — Dekat Api Kantin)" },
    },
    {
      object_type: "SPAWN",
      x: 85,
      y: 45,
      properties: { label: "Ruang 20" },
    },
    {
      object_type: "SPAWN",
      x: 97,
      y: 34,
      properties: { label: "Ruang 18" },
    },
    {
      object_type: "SPAWN",
      x: 65,
      y: 34,
      properties: { label: "Ruang 13" },
    },
    {
      object_type: "SPAWN",
      x: 39,
      y: 45,
      properties: { label: "Perpustakaan" },
    },
    {
      object_type: "SPAWN",
      x: 26,
      y: 12,
      properties: { label: "Ruang Guru" },
    },
    {
      object_type: "SPAWN",
      x: 14,
      y: 11,
      properties: { label: "Ruang 1" },
    },
    {
      object_type: "SPAWN",
      x: 4,
      y: 27,
      properties: { label: "Lab. Fisika" },
    },
  ];

  const kebakaranHazards = [
    {
      object_type: "FIRE",
      x: 96,
      y: 46,
      width: 4,
      height: 4,
      properties: { source: "Ledakan tabung gas Dapur Kantin", damagePerSec: 36 },
    },
    {
      object_type: "SMOKE",
      x: 92,
      y: 38,
      width: 6,
      height: 3,
      properties: {
        source: "Asap beracun Kantin–Ruang 19",
        damagePerSec: 15,
        slowFactor: 0.72,
      },
    },
    {
      object_type: "BLOCKED_AREA",
      x: 82,
      y: 39,
      width: 3,
      height: 2,
      properties: { reason: "Rak & material terbakar menutup koridor selatan" },
    },
    {
      object_type: "FIRE",
      x: 61,
      y: 21,
      width: 2,
      height: 2,
      properties: { source: "Percikan api gardu dekat Gudang", damagePerSec: 34 },
    },
    {
      object_type: "SMOKE",
      x: 62,
      y: 28,
      width: 10,
      height: 3,
      properties: {
        source: "Kabut asap pekat lorong 11–14",
        damagePerSec: 14,
        slowFactor: 0.74,
      },
    },
    {
      object_type: "FIRE",
      x: 11,
      y: 19,
      width: 2,
      height: 2,
      properties: { source: "Api kabel listrik koridor Barat Laut", damagePerSec: 32 },
    },
    {
      object_type: "SMOKE",
      x: 36,
      y: 19,
      width: 10,
      height: 3,
      properties: {
        source: "Asap tebal selasar Lobi & R. Meeting",
        damagePerSec: 14,
        slowFactor: 0.75,
      },
    },
    // Bara tersembunyi & korsleting di dalam/dekat jalur asap
    {
      object_type: "DAMAGE_ZONE",
      x: 78,
      y: 39,
      width: 1,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "HOT_EMBER",
        burstDamage: 32,
        damagePerSec: 24,
        revealRadius: 1.85,
        reason: "Bara api tersembunyi di selasar Ruang 20",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 60,
      y: 35,
      width: 1,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "ELECTRICAL",
        burstDamage: 35,
        damagePerSec: 22,
        revealRadius: 1.8,
        reason: "Kabel terbakar bertegangan di belokan UKS",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 64,
      y: 19,
      width: 1,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "HOT_EMBER",
        burstDamage: 30,
        damagePerSec: 22,
        revealRadius: 1.8,
        reason: "Runtuhan bara plafon serambi Masjid",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 45,
      y: 19,
      width: 2,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "TOXIC_SPILL",
        burstDamage: 28,
        damagePerSec: 20,
        revealRadius: 1.85,
        reason: "Lelehan plastik beracun tertutup asap",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 51,
      y: 4,
      width: 2,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "ELECTRICAL",
        burstDamage: 34,
        damagePerSec: 20,
        revealRadius: 1.8,
        reason: "Tiang lampu gerbang korsleting akibat panas",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 94,
      y: 28,
      width: 1,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "HOT_EMBER",
        burstDamage: 28,
        damagePerSec: 22,
        revealRadius: 1.8,
        reason: "Percikan api tersembunyi sayap timur Ruang 7/18",
      },
    },
  ];

  const banjirSpawns = [
    {
      object_type: "SPAWN",
      x: 39,
      y: 45,
      properties: { label: "Perpustakaan (Selatan — Utama)" },
    },
    ...classroomSpawns
      .filter((s) => s.label !== "Perpustakaan")
      .map((s) => ({
        object_type: "SPAWN",
        x: s.x,
        y: s.y,
        properties: { label: s.label },
      })),
  ];

  const banjirHazards = [
    {
      object_type: "DANGER_ZONE",
      x: 17,
      y: 50,
      width: 76,
      height: 6,
      properties: {
        hazardKind: "FLOOD",
        damagePerSec: 16,
        slowFactor: 0.52,
        reason: "Luapan arus banjir Taman Selatan",
      },
    },
    {
      object_type: "DANGER_ZONE",
      x: 12,
      y: 23,
      width: 39,
      height: 14,
      properties: {
        hazardKind: "FLOOD",
        damagePerSec: 15,
        slowFactor: 0.56,
        reason: "Genangan banjir Lapangan Upacara (arus deras)",
      },
    },
    {
      object_type: "DANGER_ZONE",
      x: 62,
      y: 38,
      width: 34,
      height: 3,
      properties: {
        hazardKind: "FLOOD",
        damagePerSec: 15,
        slowFactor: 0.58,
        reason: "Banjir merendam selasar selatan 19–23",
      },
    },
    {
      object_type: "BLOCKED_AREA",
      x: 50,
      y: 20,
      width: 2,
      height: 1,
      properties: { reason: "Tumpukan sampah & lumpur menyumbat koridor tengah" },
    },
    {
      object_type: "BLOCKED_AREA",
      x: 24,
      y: 39,
      width: 3,
      height: 1,
      properties: { reason: "Drainase jebol membentuk jurang aliran deras" },
    },
    // Lubang selokan & korsleting tersembunyi di bawah air banjir
    {
      object_type: "DAMAGE_ZONE",
      x: 10,
      y: 38,
      width: 1,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "FLOOD_PIT",
        burstDamage: 28,
        damagePerSec: 22,
        revealRadius: 1.85,
        reason: "Lubang drainase terbuka terendam di barat",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 49,
      y: 39,
      width: 1,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "ELECTRICAL",
        burstDamage: 36,
        damagePerSec: 24,
        revealRadius: 1.9,
        reason: "Stopkontak terendam mengalirkan listrik di dekat WC Selatan",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 60,
      y: 28,
      width: 1,
      height: 2,
      properties: {
        hidden: true,
        hazardKind: "FLOOD_PIT",
        burstDamage: 28,
        damagePerSec: 20,
        revealRadius: 1.8,
        reason: "Bak kontrol terendam di samping R. Operator",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 37,
      y: 20,
      width: 1,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "ELECTRICAL",
        burstDamage: 34,
        damagePerSec: 22,
        revealRadius: 1.85,
        reason: "Kabel lampu taman terendam dekat Lobi",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 56,
      y: 5,
      width: 1,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "FLOOD_PIT",
        burstDamage: 30,
        damagePerSec: 22,
        revealRadius: 1.8,
        reason: "Gorong-gorong meluap tepat sebelum Gerbang Utama",
      },
    },
  ];

  const anginSpawns = [
    {
      object_type: "SPAWN",
      x: 3,
      y: 13,
      properties: { label: "GOR (Barat Laut — Utama)" },
    },
    ...classroomSpawns
      .filter((s) => s.label !== "GOR")
      .map((s) => ({
        object_type: "SPAWN",
        x: s.x,
        y: s.y,
        properties: { label: s.label },
      })),
  ];

  const anginHazards = [
    {
      object_type: "DANGER_ZONE",
      x: 15,
      y: 23,
      width: 34,
      height: 13,
      properties: {
        hazardKind: "WIND_SHEAR",
        damagePerSec: 26,
        slowFactor: 0.55,
        reason: "Pusaran angin kencang & seng beterbangan di Lapangan Upacara",
      },
    },
    {
      object_type: "BLOCKED_AREA",
      x: 32,
      y: 2,
      width: 4,
      height: 3,
      properties: { reason: "Pohon besar tumbang menghalangi jalur parkir utara" },
    },
    {
      object_type: "BLOCKED_AREA",
      x: 10,
      y: 18,
      width: 1,
      height: 2,
      properties: { reason: "Rangka tenda & kanopi GOR terbang menyumbat jalan" },
    },
    {
      object_type: "BLOCKED_AREA",
      x: 60,
      y: 21,
      width: 2,
      height: 2,
      properties: { reason: "Runtuhan kanopi seng sayap tengah" },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 42,
      y: 20,
      width: 4,
      height: 1,
      properties: {
        hazardKind: "SHARD",
        damagePerSec: 28,
        reason: "Pecahan kaca & rangka atap di selasar R. Meeting",
      },
    },
    // Bahaya tersembunyi akibat badai
    {
      object_type: "DAMAGE_ZONE",
      x: 52,
      y: 25,
      width: 1,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "ELECTRICAL",
        burstDamage: 35,
        damagePerSec: 22,
        revealRadius: 1.8,
        reason: "Kabel tiang listrik putus tertiup angin di sisi timur lapangan",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 52,
      y: 39,
      width: 2,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "SHARD",
        burstDamage: 26,
        damagePerSec: 20,
        revealRadius: 1.85,
        reason: "Lembaran seng tajam tersamar di selasar selatan",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 74,
      y: 19,
      width: 1,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "COLLAPSE",
        burstDamage: 30,
        damagePerSec: 22,
        revealRadius: 1.8,
        reason: "Atap genteng jatuh di sebelah Masjid",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 62,
      y: 4,
      width: 2,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "ELECTRICAL",
        burstDamage: 34,
        damagePerSec: 22,
        revealRadius: 1.85,
        reason: "Kabel putus menimpa pagar utara near Gerbang",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 11,
      y: 39,
      width: 2,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "SHARD",
        burstDamage: 25,
        damagePerSec: 18,
        revealRadius: 1.8,
        reason: "Pecahan kaca Ruang 25 tersapu angin",
      },
    },
  ];

  const kimiaSpawns = [
    {
      object_type: "SPAWN",
      x: 4,
      y: 27,
      properties: { label: "Lab. Fisika (Pusat Kebocoran — Utama)" },
    },
    ...classroomSpawns
      .filter((s) => s.label !== "Lab. Fisika")
      .map((s) => ({
        object_type: "SPAWN",
        x: s.x,
        y: s.y,
        properties: { label: s.label },
      })),
  ];

  const kimiaHazards = [
    {
      object_type: "DANGER_ZONE",
      x: 9,
      y: 23,
      width: 5,
      height: 9,
      properties: {
        hazardKind: "GAS_CLOUD",
        damagePerSec: 28,
        slowFactor: 0.65,
        reason: "Awan uap asam pekat keluar dari Lab. Fisika",
      },
    },
    {
      object_type: "DANGER_ZONE",
      x: 34,
      y: 20,
      width: 6,
      height: 3,
      properties: {
        hazardKind: "GAS_CLOUD",
        damagePerSec: 26,
        slowFactor: 0.68,
        reason: "Kantong gas beracun tertiup ke selatan Lobi",
      },
    },
    {
      object_type: "BLOCKED_AREA",
      x: 9,
      y: 19,
      width: 2,
      height: 1,
      properties: { reason: "Karantina kebocoran bahan kimia koridor GOR" },
    },
    {
      object_type: "BLOCKED_AREA",
      x: 48,
      y: 20,
      width: 3,
      height: 1,
      properties: { reason: "Barikade darurat kontaminasi tengah" },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 28,
      y: 39,
      width: 3,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "TOXIC_SPILL",
        burstDamage: 30,
        damagePerSec: 24,
        revealRadius: 1.85,
        reason: "Ceceran bahan kimia korosif dekat R. OSIS",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 52,
      y: 30,
      width: 1,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "TOXIC_SPILL",
        burstDamage: 28,
        damagePerSec: 22,
        revealRadius: 1.8,
        reason: "Tumpahan reagen tersamar depan R. Operator",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 21,
      y: 19,
      width: 1,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "ELECTRICAL",
        burstDamage: 34,
        damagePerSec: 22,
        revealRadius: 1.8,
        reason: "Korsleting AC dekat teras Ruang Guru",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 60,
      y: 19,
      width: 1,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "TOXIC_SPILL",
        burstDamage: 30,
        damagePerSec: 22,
        revealRadius: 1.8,
        reason: "Gas & embun asam mengendap depan Ruang BK",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 56,
      y: 4,
      width: 1,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "TOXIC_SPILL",
        burstDamage: 28,
        damagePerSec: 22,
        revealRadius: 1.85,
        reason: "Genangan limbah tercemar sebelum Gerbang Utama",
      },
    },
  ];

  const pasSpawns = [
    {
      object_type: "SPAWN",
      x: 97,
      y: 34,
      properties: { label: "Ruang 18 (Timur Jauh — Pemadaman Total)" },
    },
    ...classroomSpawns
      .filter((s) => s.label.startsWith("Ruang ") && s.label !== "Ruang 18")
      .map((s) => ({
        object_type: "SPAWN",
        x: s.x,
        y: s.y,
        properties: { label: s.label },
      })),
  ];

  const pasHazards = [
    {
      object_type: "FIRE",
      x: 95,
      y: 23,
      width: 2,
      height: 2,
      properties: { source: "Panel listrik sayap timur terbakar", damagePerSec: 34 },
    },
    {
      object_type: "SMOKE",
      x: 68,
      y: 19,
      width: 14,
      height: 2,
      properties: {
        source: "Asap tebal koridor Ruang 4–12",
        damagePerSec: 15,
        slowFactor: 0.72,
      },
    },
    {
      object_type: "DANGER_ZONE",
      x: 64,
      y: 38,
      width: 26,
      height: 2,
      properties: {
        hazardKind: "FLOOD",
        damagePerSec: 16,
        slowFactor: 0.56,
        reason: "Genangan pipa pecah koridor selatan",
      },
    },
    {
      object_type: "BLOCKED_AREA",
      x: 36,
      y: 18,
      width: 2,
      height: 2,
      properties: { reason: "Reruntuhan lorong Lobi–Kasek" },
    },
    {
      object_type: "BLOCKED_AREA",
      x: 69,
      y: 28,
      width: 3,
      height: 2,
      properties: { reason: "Puing koridor antara Ruang 11 dan 14" },
    },
    {
      object_type: "BLOCKED_AREA",
      x: 60,
      y: 26,
      width: 2,
      height: 3,
      properties: { reason: "Lemari arsip tumbang menyumbat lorong R. Operator" },
    },
    // Multi-jebakan tersembunyi dalam kondisi pemadaman gelap
    {
      object_type: "DAMAGE_ZONE",
      x: 84,
      y: 29,
      width: 1,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "ELECTRICAL",
        burstDamage: 35,
        damagePerSec: 24,
        revealRadius: 1.8,
        reason: "Kabel bertegangan putus di antara Ruang 9 & 16",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 75,
      y: 39,
      width: 1,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "SHARD",
        burstDamage: 26,
        damagePerSec: 20,
        revealRadius: 1.8,
        reason: "Pecahan kaca Ruang 21 dalam gelap",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 52,
      y: 33,
      width: 1,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "COLLAPSE",
        burstDamage: 30,
        damagePerSec: 22,
        revealRadius: 1.8,
        reason: "Lubang ubin runtuh tepi Lapangan Upacara",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 37,
      y: 20,
      width: 1,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "SHARD",
        burstDamage: 26,
        damagePerSec: 20,
        revealRadius: 1.8,
        reason: "Pecahan kaca Lobi",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 60,
      y: 19,
      width: 1,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "ELECTRICAL",
        burstDamage: 35,
        damagePerSec: 24,
        revealRadius: 1.85,
        reason: "Korsleting gardu depan Ruang BK",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 50,
      y: 5,
      width: 1,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "HOT_EMBER",
        burstDamage: 30,
        damagePerSec: 22,
        revealRadius: 1.8,
        reason: "Percikan kabel tiang listrik utara sebelum gerbang",
      },
    },
  ];

  // Skenario 7: Badai Petir & Korsleting Massal
  const petirSpawns = [
    {
      object_type: "SPAWN",
      x: 14,
      y: 45,
      properties: { label: "Ruang 25 (Selatan Barat — Utama)" },
    },
    ...classroomSpawns
      .filter((s) => s.label !== "Ruang 25")
      .map((s) => ({
        object_type: "SPAWN",
        x: s.x,
        y: s.y,
        properties: { label: s.label },
      })),
  ];

  const petirHazards = [
    {
      object_type: "DANGER_ZONE",
      x: 18,
      y: 25,
      width: 28,
      height: 10,
      properties: {
        hazardKind: "WIND_SHEAR",
        damagePerSec: 20,
        slowFactor: 0.72,
        reason: "Area Lapangan Terbuka Rawan Sambaran Petir & Hujan Deras",
      },
    },
    {
      object_type: "BLOCKED_AREA",
      x: 64,
      y: 38,
      width: 3,
      height: 1,
      properties: { reason: "Tiang listrik roboh bertegangan tinggi dekat KOP" },
    },
    {
      object_type: "BLOCKED_AREA",
      x: 28,
      y: 19,
      width: 3,
      height: 2,
      properties: { reason: "Kabel jaringan putus terbakar depan Lobi" },
    },
    {
      object_type: "FIRE",
      x: 96,
      y: 20,
      width: 2,
      height: 2,
      properties: { source: "Panel listrik tersambar petir sayap timur", damagePerSec: 34 },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 10,
      y: 35,
      width: 1,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "ELECTRICAL",
        burstDamage: 35,
        damagePerSec: 24,
        revealRadius: 1.85,
        reason: "Genangan beraliran listrik dari lampu taman barat",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 52,
      y: 24,
      width: 1,
      height: 2,
      properties: {
        hidden: true,
        hazardKind: "ELECTRICAL",
        burstDamage: 34,
        damagePerSec: 22,
        revealRadius: 1.85,
        reason: "Kabel penangkal petir terkelupas tepi lapangan",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 73,
      y: 20,
      width: 1,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "ELECTRICAL",
        burstDamage: 36,
        damagePerSec: 24,
        revealRadius: 1.8,
        reason: "Percikan MCB luar Masjid-Ruang 4",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 37,
      y: 12,
      width: 1,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "SHARD",
        burstDamage: 26,
        damagePerSec: 20,
        revealRadius: 1.8,
        reason: "Kaca jendela Lobi pecah terkena ledakan petir",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 58,
      y: 5,
      width: 2,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "ELECTRICAL",
        burstDamage: 35,
        damagePerSec: 24,
        revealRadius: 1.85,
        reason: "Kabel gerbang putus akibat sambaran petir",
      },
    },
  ];

  // Skenario 8: Tanah Longsor Tebing Selatan & Timur
  const longsorSpawns = [
    {
      object_type: "SPAWN",
      x: 73,
      y: 45,
      properties: { label: "Ruang 22 (Selatan Timur — Utama)" },
    },
    ...classroomSpawns
      .filter((s) => s.label !== "Ruang 22")
      .map((s) => ({
        object_type: "SPAWN",
        x: s.x,
        y: s.y,
        properties: { label: s.label },
      })),
  ];

  const longsorHazards = [
    {
      object_type: "BLOCKED_AREA",
      x: 84,
      y: 49,
      width: 12,
      height: 6,
      properties: { reason: "Longsoran tebing tanah menutup pojok taman tenggara" },
    },
    {
      object_type: "DANGER_ZONE",
      x: 62,
      y: 38,
      width: 30,
      height: 3,
      properties: {
        hazardKind: "MUD_SLIDE",
        damagePerSec: 22,
        slowFactor: 0.48,
        reason: "Lumpur longsor tebal menghambat langkah di sayap selatan",
      },
    },
    {
      object_type: "DANGER_ZONE",
      x: 18,
      y: 51,
      width: 48,
      height: 4,
      properties: {
        hazardKind: "MUD_SLIDE",
        damagePerSec: 20,
        slowFactor: 0.5,
        reason: "Aliran lumpur longsor di Taman Selatan",
      },
    },
    {
      object_type: "BLOCKED_AREA",
      x: 49,
      y: 42,
      width: 1,
      height: 4,
      properties: { reason: "Tembok pembatas selatan runtuh" },
    },
    {
      object_type: "BLOCKED_AREA",
      x: 60,
      y: 29,
      width: 2,
      height: 2,
      properties: { reason: "Batu dan tanah timbun menyumbat lorong Operator–13" },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 91,
      y: 28,
      width: 1,
      height: 2,
      properties: {
        hidden: true,
        hazardKind: "COLLAPSE",
        burstDamage: 32,
        damagePerSec: 24,
        revealRadius: 1.85,
        reason: "Amblesan fondasi sayap timur antara Ruang 8 & 17",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 52,
      y: 36,
      width: 1,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "SHARD",
        burstDamage: 26,
        damagePerSec: 20,
        revealRadius: 1.8,
        reason: "Batu tajam & serpihan beton depan UKS",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 10,
      y: 32,
      width: 1,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "COLLAPSE",
        burstDamage: 30,
        damagePerSec: 22,
        revealRadius: 1.85,
        reason: "Retakan tanah mendadak jalur barat Lapangan",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 37,
      y: 16,
      width: 1,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "ELECTRICAL",
        burstDamage: 34,
        damagePerSec: 22,
        revealRadius: 1.8,
        reason: "Pipa & kabel panel putus dekat Lobi–R. Meeting",
      },
    },
    {
      object_type: "DAMAGE_ZONE",
      x: 50,
      y: 4,
      width: 2,
      height: 1,
      properties: {
        hidden: true,
        hazardKind: "COLLAPSE",
        burstDamage: 28,
        damagePerSec: 20,
        revealRadius: 1.8,
        reason: "Paving terangkat retak di jalur keluar gerbang utara",
      },
    },
  ];

  return [
    {
      id: SCENARIO_IDS.GEMPA,
      map_id: SMAN1_NGORO_MAP_ID,
      name: "Gempa Bumi Tektonik & Runtuhan Susulan (SMAN 1 Ngoro)",
      disaster_type: "Gempa",
      status: "published",
      version: 5,
      config: {
        sourceDocument: "DENAH LOKASI DAN RUANG PAS GASAL 2023/2024 SMAN 1 NGORO",
        address: "Jl. Candi Jolotundo, Kutogirang, Ngoro, Mojokerto 61385",
        difficulty: "Sulit",
        summary: "Selamatkan diri secepat mungkin dari pojok barat daya menuju Gerbang Utama dengan menghindari reruntuhan, gempa susulan, dan jebakan kaca/kabel tersembunyi.",
        hazardSpeed: 1.35,
        aftershockIntervalMs: 11000,
        ambientDarkness: 0.22,
        evacuationTarget: "Hindari Bahaya → Gerbang Utama (EXIT)",
      },
      objects: buildObjects(SCENARIO_IDS.GEMPA, [
        ...safeZonesAndExits,
        ...gempaSpawns,
        ...gempaHazards,
      ]),
    },
    {
      id: SCENARIO_IDS.KEBAKARAN,
      map_id: SMAN1_NGORO_MAP_ID,
      name: "Kebakaran Hebat Kantin, Gudang & Asap Tebal",
      disaster_type: "Kebakaran",
      status: "published",
      version: 5,
      config: {
        sourceDocument: "DENAH LOKASI DAN RUANG PAS GASAL 2023/2024 SMAN 1 NGORO",
        address: "Jl. Candi Jolotundo, Kutogirang, Ngoro, Mojokerto 61385",
        difficulty: "Ekstrem",
        summary: "Api menjalar dinamis disertai asap pekat dan bara tersembunyi — tembus koridor teraman menuju Gerbang Utama secepat mungkin.",
        hazardSpeed: 1.4,
        fireSpreadIntervalMs: 14000,
        ambientDarkness: 0.42,
        evacuationTarget: "Hindari Api & Asap → Gerbang Utama (EXIT)",
      },
      objects: buildObjects(SCENARIO_IDS.KEBAKARAN, [
        ...safeZonesAndExits,
        ...kebakaranSpawns,
        ...kebakaranHazards,
      ]),
    },
    {
      id: SCENARIO_IDS.BANJIR,
      map_id: SMAN1_NGORO_MAP_ID,
      name: "Banjir Bandang & Bahaya Listrik Terendam",
      disaster_type: "Banjir",
      status: "published",
      version: 5,
      config: {
        sourceDocument: "DENAH LOKASI DAN RUANG PAS GASAL 2023/2024 SMAN 1 NGORO",
        address: "Jl. Candi Jolotundo, Kutogirang, Ngoro, Mojokerto 61385",
        difficulty: "Sulit",
        summary: "Air banjir perlahan meluas dan memperlambat lari serta menyembunyikan arus listrik bawah air — evakuasi segera ke Gerbang Utama.",
        hazardSpeed: 1.25,
        floodRiseIntervalMs: 15000,
        ambientDarkness: 0.25,
        evacuationTarget: "Hindari Banjir & Sengatan Listrik → Gerbang Utama (EXIT)",
      },
      objects: buildObjects(SCENARIO_IDS.BANJIR, [
        ...safeZonesAndExits,
        ...banjirSpawns,
        ...banjirHazards,
      ]),
    },
    {
      id: SCENARIO_IDS.ANGIN,
      map_id: SMAN1_NGORO_MAP_ID,
      name: "Angin Puting Beliung & Puing Atap Terbang",
      disaster_type: "Angin Puting Beliung",
      status: "published",
      version: 5,
      config: {
        sourceDocument: "DENAH LOKASI DAN RUANG PAS GASAL 2023/2024 SMAN 1 NGORO",
        address: "Jl. Candi Jolotundo, Kutogirang, Ngoro, Mojokerto 61385",
        difficulty: "Ekstrem",
        summary: "Pusaran angin di lapangan terbuka, puing atap tajam, dan sambaran petir mengancam rute utara — cari celah aman tercepat menuju Gerbang Utama.",
        hazardSpeed: 1.45,
        lightningIntervalMs: 13000,
        ambientDarkness: 0.3,
        evacuationTarget: "Hindari Angin & Petir → Gerbang Utama (EXIT)",
      },
      objects: buildObjects(SCENARIO_IDS.ANGIN, [
        ...safeZonesAndExits,
        ...anginSpawns,
        ...anginHazards,
      ]),
    },
    {
      id: SCENARIO_IDS.KIMIA,
      map_id: SMAN1_NGORO_MAP_ID,
      name: "Kebocoran Gas Kimia Lab. Fisika & Cairan Korosif",
      disaster_type: "Bahaya Kimia",
      status: "published",
      version: 5,
      config: {
        sourceDocument: "DENAH LOKASI DAN RUANG PAS GASAL 2023/2024 SMAN 1 NGORO",
        address: "Jl. Candi Jolotundo, Kutogirang, Ngoro, Mojokerto 61385",
        difficulty: "Ekstrem",
        summary: "Awan gas beracun mengisolasi sayap barat disertai tumpahan asam korosif tersembunyi — larilah keluar menuju Gerbang Utama secepat mungkin.",
        hazardSpeed: 1.35,
        ambientDarkness: 0.34,
        evacuationTarget: "Hindari Gas Beracun & Asam → Gerbang Utama (EXIT)",
      },
      objects: buildObjects(SCENARIO_IDS.KIMIA, [
        ...safeZonesAndExits,
        ...kimiaSpawns,
        ...kimiaHazards,
      ]),
    },
    {
      id: SCENARIO_IDS.PETIR,
      map_id: SMAN1_NGORO_MAP_ID,
      name: "Badai Petir Ekstrem & Korsleting Panel Massal",
      disaster_type: "Badai Petir",
      status: "published",
      version: 5,
      config: {
        sourceDocument: "DENAH LOKASI DAN RUANG PAS GASAL 2023/2024 SMAN 1 NGORO",
        address: "Jl. Candi Jolotundo, Kutogirang, Ngoro, Mojokerto 61385",
        difficulty: "Ekstrem",
        summary: "Sambaran petir berkala di area terbuka disertai kobaran panel listrik dan genangan beraliran tinggi — hindari zona kilat & capai Gerbang Utama.",
        hazardSpeed: 1.45,
        lightningIntervalMs: 8500,
        ambientDarkness: 0.44,
        evacuationTarget: "Hindari Petir & Arus Listrik → Gerbang Utama (EXIT)",
      },
      objects: buildObjects(SCENARIO_IDS.PETIR, [
        ...safeZonesAndExits,
        ...petirSpawns,
        ...petirHazards,
      ]),
    },
    {
      id: SCENARIO_IDS.LONGSOR,
      map_id: SMAN1_NGORO_MAP_ID,
      name: "Tanah Longsor Tebing Selatan & Aliran Lumpur",
      disaster_type: "Tanah Longsor",
      status: "published",
      version: 5,
      config: {
        sourceDocument: "DENAH LOKASI DAN RUANG PAS GASAL 2023/2024 SMAN 1 NGORO",
        address: "Jl. Candi Jolotundo, Kutogirang, Ngoro, Mojokerto 61385",
        difficulty: "Sulit",
        summary: "Longsoran tebing menimbun koridor tenggara dengan lumpur meluas yang memperlambat gerak — hindari timbunan & keluar melalui Gerbang Utama.",
        hazardSpeed: 1.3,
        floodRiseIntervalMs: 16000,
        aftershockIntervalMs: 14000,
        ambientDarkness: 0.28,
        evacuationTarget: "Hindari Longsor & Lumpur → Gerbang Utama (EXIT)",
      },
      objects: buildObjects(SCENARIO_IDS.LONGSOR, [
        ...safeZonesAndExits,
        ...longsorSpawns,
        ...longsorHazards,
      ]),
    },
    {
      id: SCENARIO_IDS.PAS_DRILL,
      map_id: SMAN1_NGORO_MAP_ID,
      name: "Krisis Ganda Ujian PAS (Pemadaman Total 1–26)",
      disaster_type: "Multi-Bencana",
      status: "published",
      version: 5,
      config: {
        sourceDocument: "DENAH LOKASI DAN RUANG PAS GASAL 2023/2024 SMAN 1 NGORO",
        address: "Jl. Candi Jolotundo, Kutogirang, Ngoro, Mojokerto 61385",
        difficulty: "Ekstrem",
        summary: "Mode bertahan hidup tersulit: pemadaman gelap, api menjalar, genangan meluas, gempa susulan, dan jebakan tersembunyi — selamatkan diri ke Gerbang Utama secepatnya.",
        hazardSpeed: 1.5,
        aftershockIntervalMs: 12000,
        fireSpreadIntervalMs: 15000,
        ambientDarkness: 0.54,
        evacuationTarget: "Bertahan & Capai Gerbang Utama (EXIT) Secepatnya",
      },
      objects: buildObjects(SCENARIO_IDS.PAS_DRILL, [
        ...safeZonesAndExits,
        ...pasSpawns,
        ...pasHazards,
      ]),
    },
  ];
}

/**
 * Converts the Phase 1–3 tile grid + scenario objects into a legacy GridMap
 * & DisasterSimulation dataset so Teacher/Student legacy views stay synchronized.
 */
function buildLegacyGridAndSimulations(grid, rooms, scenarios) {
  const cells = {};
  const doors = [];

  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      const tile = grid[y][x];
      const key = `${x},${y}`;
      let type = "CORRIDOR";
      let walkable = true;

      if (tile === "WALL" || tile === "BORDER") {
        type = "WALL";
        walkable = false;
      } else if (tile === "DOOR") {
        type = "DOOR";
        walkable = true;
        doors.push({ id: `door_${x}_${y}`, x, y, state: "open", breakable: true });
      } else if (tile === "FLOOR" || tile === "COURT_VOLI" || tile === "MOSQUE") {
        type = "ROOM";
        walkable = true;
      } else {
        type = "CORRIDOR";
        walkable = true;
      }

      cells[key] = { x, y, type, walkable };
    }
  }

  // Mark Lapangan Upacara assembly center & Gerbang Utama in legacy safePoints
  const safePoints = [
    {
      id: "sp_sman1_lapangan",
      name: "Lapangan Upacara (Titik Aman Utama)",
      x: 31,
      y: 29,
      capacity: 600,
      enabled: true,
      priority: 1,
    },
    {
      id: "sp_sman1_parkir_guru",
      name: "Tempat Parkir Guru",
      x: 74,
      y: 4,
      capacity: 150,
      enabled: true,
      priority: 2,
    },
    {
      id: "sp_sman1_gerbang",
      name: "Gerbang Utama (Jl. Candi Jolotundo)",
      x: 56,
      y: 1,
      capacity: 200,
      enabled: true,
      priority: 3,
    },
  ];

  for (const sp of safePoints) {
    cells[`${sp.x},${sp.y}`] = { x: sp.x, y: sp.y, type: "SAFE_POINT", walkable: true };
  }

  const spawnPoints = [
    { id: "spawn_sman1_r11", name: "Ruang 11", x: 71, y: 24 },
    { id: "spawn_sman1_r1", name: "Ruang 1", x: 14, y: 11 },
    { id: "spawn_sman1_r26", name: "Ruang 26", x: 4, y: 45 },
  ];

  const now = new Date().toISOString();
  const legacyGridMap = {
    id: SMAN1_NGORO_MAP_ID,
    schoolId: SMAN1_NGORO_SCHOOL_ID,
    name: "Denah SMAN 1 Ngoro (Resmi PAS 2023/2024)",
    gridWidth: MAP_WIDTH,
    gridHeight: MAP_HEIGHT,
    cellScale: 2,
    cells,
    rooms: rooms.map((r) => ({
      id: r.id,
      name: r.name,
      x: r.x,
      y: r.y,
      w: r.width,
      h: r.height,
    })),
    safePoints,
    spawnPoints,
    doors,
    createdAt: now,
    updatedAt: now,
  };

  const legacySimulations = scenarios.map((sc) => ({
    id: sc.id,
    mapId: SMAN1_NGORO_MAP_ID,
    schoolId: SMAN1_NGORO_SCHOOL_ID,
    name: sc.name,
    disasterType: sc.disaster_type.toUpperCase().includes("KEBAKARAN") ? "FIRE" : "EARTHQUAKE",
    hazards: sc.objects
      .filter((o) => ["FIRE", "SMOKE", "BLOCKED_AREA", "DAMAGE_ZONE"].includes(o.object_type))
      .map((o) => ({
        id: o.id,
        type: o.object_type,
        x: o.x,
        y: o.y,
        radius: Math.max(o.width, o.height),
        active: true,
        spreadRate: sc.disaster_type === "Kebakaran" ? 0.5 : 0.2,
      })),
    createdAt: now,
    updatedAt: now,
  }));

  return { legacyGridMap, legacySimulations };
}

/**
 * Generates the complete SMAN 1 Ngoro PDF Digital Twin dataset including Phase 1-3
 * database records, disaster scenarios, and legacy grid_maps compatibility records.
 */
export function buildSman1NgoroPdfDigitalTwin() {
  const { grid, tiles, rooms, floorObjects } = buildSman1NgoroTileAndRoomLayout();
  const scenarios = buildScenarioObjects();
  const { legacyGridMap, legacySimulations } = buildLegacyGridAndSimulations(
    grid,
    rooms,
    scenarios,
  );

  const map = {
    id: SMAN1_NGORO_MAP_ID,
    school_id: SMAN1_NGORO_SCHOOL_ID,
    name: "Denah SMAN 1 Ngoro (Jl. Candi Jolotundo — PAS 2023/2024)",
    description:
      "Digital Twin berbasis denah resmi SMAN 1 Ngoro (Jl. Candi Jolotundo, Kutogirang, Ngoro, Mojokerto 61385). Memuat Ruang 1–26, Lapangan Upacara, Masjid Sabilunnajah, GOR, Lab. Fisika, Perpustakaan, Ruang Guru/Kasek/Sekretariat/BK/Operator/UKS/OSIS, Kantin Sekolah, Koperasi, Tandon, Parkir Guru/Timur, dan Gerbang Utama di Utara.",
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    active_floor_id: SMAN1_NGORO_FLOOR_ID,
    status: "published",
    version: 5,
    border: {
      minX: 0,
      minY: 0,
      maxX: MAP_WIDTH - 1,
      maxY: MAP_HEIGHT - 1,
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
    },
    is_public: true,
    author_name: "Tim Tanggap Darurat SMAN 1 Ngoro",
    school_name: "SMAN 1 Ngoro",
  };

  const floors = [
    {
      id: SMAN1_NGORO_FLOOR_ID,
      map_id: SMAN1_NGORO_MAP_ID,
      floor_number: 1,
      name: "Lantai 1 (Kampus Utama SMAN 1 Ngoro)",
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
    },
  ];

  const boundaries = [
    {
      id: "boundary-sman1-perimeter",
      map_id: SMAN1_NGORO_MAP_ID,
      floor_id: SMAN1_NGORO_FLOOR_ID,
      geometry: [
        { x: 0, y: 1 },
        { x: MAP_WIDTH - 1, y: 1 },
        { x: MAP_WIDTH - 1, y: MAP_HEIGHT - 1 },
        { x: 0, y: MAP_HEIGHT - 1 },
      ],
      closed: true,
    },
  ];

  return {
    map,
    floors,
    grid,
    tiles,
    rooms,
    boundaries,
    objects: floorObjects,
    scenarios,
    legacyGridMap,
    legacySimulations,
  };
}
