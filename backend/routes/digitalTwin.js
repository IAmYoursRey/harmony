import express from "express";
import { readDB, writeDB, pool, timeoutQuery } from "../repository.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { initGameSession, endGameSession } from "../gameManager.js";

const router = express.Router();
function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Get caller's schoolId from their profile */
function getCallerSchoolId(db, userId) {
  const profile = db.profiles.find((p) => p.userId === userId);
  return profile?.schoolId || null;
}

/** Enforce teacher/dev role */
function requireTeacher(req, res) {
  if (req.user.role !== "teacher" && req.user.role !== "dev") {
    res.status(403).json({ error: "Teacher or dev role required" });
    return false;
  }
  return true;
}

/** Enforce school ownership: caller must own the schoolId OR be dev */
function requireSchoolOwnership(req, res, callerSchoolId, targetSchoolId) {
  if (req.user.role === "dev") return true;
  if (callerSchoolId !== targetSchoolId) {
    res.status(403).json({ error: "Access denied: different school" });
    return false;
  }
  return true;
}

router.get("/legacy/:schoolId", async (req, res) => {
  const { schoolId } = req.params;
  const db = await readDB();
  const twin = db.digitalTwins?.[schoolId] || null;
  res.json({ data: twin });
});

router.post("/legacy/:schoolId", verifyToken, async (req, res) => {
  const { schoolId } = req.params;
  const { mapImage, nodes, edges, disasterType } = req.body;
  const db = await readDB();
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, schoolId)) return;

  if (!db.digitalTwins) db.digitalTwins = {};
  db.digitalTwins[schoolId] = {
    mapImage,
    nodes,
    edges,
    disasterType,
    lastUpdated: new Date().toISOString(),
  };
  const success = await writeDB(db);
  if (success) res.json({ success: true });
  else res.status(500).json({ error: "Failed to save digital twin" });
});

router.get("/:schoolId", async (req, res, next) => {
  const id = req.params.schoolId;
  if (["maps", "simulations", "rooms"].includes(id)) return next();
  const db = await readDB();
  const twin = db.digitalTwins?.[id] || null;
  res.json({ data: twin });
});

router.post("/:schoolId", verifyToken, async (req, res, next) => {
  const id = req.params.schoolId;
  if (["maps", "simulations", "rooms"].includes(id)) return next();
  const db = await readDB();
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, id)) return;

  const { mapImage, nodes, edges, disasterType } = req.body;
  if (!db.digitalTwins) db.digitalTwins = {};
  db.digitalTwins[id] = {
    mapImage,
    nodes,
    edges,
    disasterType,
    lastUpdated: new Date().toISOString(),
  };
  const success = await writeDB(db);
  if (success) res.json({ success: true });
  else res.status(500).json({ error: "Failed to save digital twin" });
});

router.get("/maps", verifyToken, async (req, res) => {
  const { schoolId } = req.query;
  if (!schoolId)
    return res.status(400).json({ error: "schoolId query param required" });
  const db = await readDB();
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, schoolId)) return;
  if (pool) {
    try {
      const result = await timeoutQuery(
        pool.query("SELECT * FROM digital_twin_maps WHERE school_id = $1", [
          schoolId,
        ]),
      );
      const mapped = [];
      for (const row of result.rows) {
        mapped.push({
          id: row.id,
          schoolId: row.school_id,
          name: row.name,
          description: row.description || "",
          gridWidth: row.width,
          gridHeight: row.height,
          cellScale: 1,
          cellScaleUnit: "meter",
          cells: {},
          rooms: [],
          doors: [],
          safePoints: [],
          spawnPoints: [],
          createdBy: "system",
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        });
      }
      return res.json({ data: mapped });
    } catch (err) {
      console.error("Error fetching legacy maps from postgres:", err);
    }
  }

  const maps = Object.values(db.gridMaps || {}).filter(
    (m) => m.schoolId === schoolId,
  );
  res.json({ data: maps });
});

router.post("/maps", verifyToken, async (req, res) => {
  if (!requireTeacher(req, res)) return;
  const db = await readDB();
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  const {
    schoolId,
    name,
    description,
    gridWidth,
    gridHeight,
    cellScale,
    cellScaleUnit,
  } = req.body;

  if (!schoolId || !name)
    return res.status(400).json({ error: "schoolId and name required" });
  if (!requireSchoolOwnership(req, res, callerSchoolId, schoolId)) return;

  const w = Math.min(Math.max(parseInt(gridWidth) || 20, 5), 60);
  const h = Math.min(Math.max(parseInt(gridHeight) || 20, 5), 60);

  const newMap = {
    id: generateId("map"),
    schoolId,
    name: name.trim(),
    description: description?.trim() || "",
    gridWidth: w,
    gridHeight: h,
    cellScale: parseFloat(cellScale) || 1,
    cellScaleUnit: cellScaleUnit || "meter",
    cells: {},
    rooms: [],
    doors: [],
    safePoints: [],
    spawnPoints: [],
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!db.gridMaps) db.gridMaps = {};
  db.gridMaps[newMap.id] = newMap;
  if (await writeDB(db)) res.status(201).json({ data: newMap });
  else res.status(500).json({ error: "Failed to create map" });
});

router.get("/maps/:mapId", verifyToken, async (req, res) => {
  const db = await readDB();

  if (pool) {
    try {
      const result = await timeoutQuery(
        pool.query("SELECT * FROM digital_twin_maps WHERE id = $1", [
          req.params.mapId,
        ]),
      );
      if (result.rows.length > 0) {
        const row = result.rows[0];
        const callerSchoolId = getCallerSchoolId(db, req.user.id);
        if (!requireSchoolOwnership(req, res, callerSchoolId, row.school_id))
          return;

        const map = {
          id: row.id,
          schoolId: row.school_id,
          name: row.name,
          description: row.description || "",
          gridWidth: row.width,
          gridHeight: row.height,
          cellScale: 1,
          cellScaleUnit: "meter",
          cells: {},
          rooms: [],
          doors: [],
          safePoints: [],
          spawnPoints: [],
          createdBy: "system",
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };

        const floorsRes = await timeoutQuery(
          pool.query(
            "SELECT * FROM digital_twin_floors WHERE map_id = $1 ORDER BY floor_number ASC",
            [row.id],
          ),
        );
        if (floorsRes.rows.length > 0) {
          const floor = floorsRes.rows[0];
          const tilesRes = await timeoutQuery(
            pool.query("SELECT * FROM digital_twin_tiles WHERE floor_id = $1", [
              floor.id,
            ]),
          );

          for (const tile of tilesRes.rows) {
            let type = "EMPTY";
            if (tile.tile_type === "WALL") type = "WALL";
            else if (tile.tile_type === "FLOOR") type = "ROOM";
            else if (tile.tile_type === "DOOR") type = "DOOR";

            if (type !== "EMPTY") {
              map.cells[`${tile.x},${tile.y}`] = {
                x: tile.x,
                y: tile.y,
                type,
                walkable: type !== "WALL",
              };
            }
          }
        }
        return res.json({ data: map });
      }
    } catch (err) {
      console.error("Error fetching legacy map from postgres:", err);
    }
  }

  const map = db.gridMaps?.[req.params.mapId];
  if (!map) return res.status(404).json({ error: "Map not found" });

  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, map.schoolId)) return;

  res.json({ data: map });
});

router.put("/maps/:mapId", verifyToken, async (req, res) => {
  if (!requireTeacher(req, res)) return;
  const db = await readDB();
  const map = db.gridMaps?.[req.params.mapId];
  if (!map) return res.status(404).json({ error: "Map not found" });
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, map.schoolId)) return;

  const {
    name,
    description,
    cells,
    rooms,
    doors,
    safePoints,
    spawnPoints,
    cellScale,
    cellScaleUnit,
  } = req.body;
  if (name !== undefined) map.name = name.trim();
  if (description !== undefined) map.description = description.trim();
  if (cells !== undefined) map.cells = cells;
  if (rooms !== undefined) map.rooms = rooms;
  if (doors !== undefined) map.doors = doors;
  if (safePoints !== undefined) map.safePoints = safePoints;
  if (spawnPoints !== undefined) map.spawnPoints = spawnPoints;
  if (cellScale !== undefined) map.cellScale = parseFloat(cellScale);
  if (cellScaleUnit !== undefined) map.cellScaleUnit = cellScaleUnit;
  map.updatedAt = new Date().toISOString();

  db.gridMaps[req.params.mapId] = map;
  if (await writeDB(db)) res.json({ data: map });
  else res.status(500).json({ error: "Failed to update map" });
});

router.delete("/maps/:mapId", verifyToken, async (req, res) => {
  if (!requireTeacher(req, res)) return;
  const db = await readDB();
  const map = db.gridMaps?.[req.params.mapId];
  if (!map) return res.status(404).json({ error: "Map not found" });
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, map.schoolId)) return;

  delete db.gridMaps[req.params.mapId];
  if (await writeDB(db)) res.json({ success: true });
  else res.status(500).json({ error: "Failed to delete map" });
});

router.get("/simulations", verifyToken, async (req, res) => {
  const { schoolId } = req.query;
  if (!schoolId)
    return res.status(400).json({ error: "schoolId query param required" });
  const db = await readDB();
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, schoolId)) return;

  const sims = Object.values(db.simulations || {}).filter(
    (s) => s.schoolId === schoolId,
  );
  res.json({ data: sims });
});

router.post("/simulations", verifyToken, async (req, res) => {
  if (!requireTeacher(req, res)) return;
  const db = await readDB();
  const {
    schoolId,
    mapId,
    disasterType,
    name,
    description,
    durationSeconds,
    spawnPointId,
    safePointIds,
    hazards,
    events,
    loseConditions,
  } = req.body;

  if (!schoolId || !mapId || !name || !disasterType) {
    return res
      .status(400)
      .json({ error: "schoolId, mapId, name, disasterType required" });
  }
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, schoolId)) return;

  const map = db.gridMaps?.[mapId];
  if (!map || map.schoolId !== schoolId) {
    return res
      .status(404)
      .json({ error: "Map not found or not in this school" });
  }

  const sim = {
    id: generateId("sim"),
    schoolId,
    mapId,
    disasterType,
    name: name.trim(),
    description: description?.trim() || "",
    durationSeconds: parseInt(durationSeconds) || 120,
    spawnPointId: spawnPointId || "",
    safePointIds: safePointIds || [],
    hazards: hazards || [],
    events: events || [],
    winCondition: "REACH_SAFE_POINT",
    loseConditions: loseConditions || ["HP_ZERO", "TIMER_ZERO"],
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!db.simulations) db.simulations = {};
  db.simulations[sim.id] = sim;
  if (await writeDB(db)) res.status(201).json({ data: sim });
  else res.status(500).json({ error: "Failed to create simulation" });
});

router.get("/simulations/:simId", verifyToken, async (req, res) => {
  const db = await readDB();
  const sim = db.simulations?.[req.params.simId];
  if (!sim) return res.status(404).json({ error: "Simulation not found" });
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, sim.schoolId)) return;
  res.json({ data: sim });
});

router.put("/simulations/:simId", verifyToken, async (req, res) => {
  if (!requireTeacher(req, res)) return;
  const db = await readDB();
  const sim = db.simulations?.[req.params.simId];
  if (!sim) return res.status(404).json({ error: "Simulation not found" });
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, sim.schoolId)) return;

  const allowed = [
    "name",
    "description",
    "durationSeconds",
    "spawnPointId",
    "safePointIds",
    "hazards",
    "events",
    "loseConditions",
  ];
  for (const key of allowed) {
    if (req.body[key] !== undefined) sim[key] = req.body[key];
  }
  sim.updatedAt = new Date().toISOString();
  db.simulations[req.params.simId] = sim;
  if (await writeDB(db)) res.json({ data: sim });
  else res.status(500).json({ error: "Failed to update simulation" });
});

router.delete("/simulations/:simId", verifyToken, async (req, res) => {
  if (!requireTeacher(req, res)) return;
  const db = await readDB();
  const sim = db.simulations?.[req.params.simId];
  if (!sim) return res.status(404).json({ error: "Simulation not found" });
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, sim.schoolId)) return;

  delete db.simulations[req.params.simId];
  if (await writeDB(db)) res.json({ success: true });
  else res.status(500).json({ error: "Failed to delete simulation" });
});

router.get("/rooms", verifyToken, async (req, res) => {
  const { schoolId } = req.query;
  if (!schoolId) return res.status(400).json({ error: "schoolId required" });
  const db = await readDB();
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, schoolId)) return;

  let rooms = Object.values(db.dtRooms || {}).filter(
    (r) => r.schoolId === schoolId,
  );

  if (req.user.role === "student") {
    const profile = db.profiles.find((p) => p.userId === req.user.id);
    const studentClass = profile?.classSection;
    rooms = rooms.filter(
      (r) =>
        r.status !== "CANCELLED" &&
        r.status !== "FINISHED" &&
        r.targetClass === studentClass,
    );
  }

  res.json({ data: rooms });
});

router.post("/rooms", verifyToken, async (req, res) => {
  if (!requireTeacher(req, res)) return;
  const db = await readDB();
  const { schoolId, name, mapId, simulationId, targetGrade, targetClass } =
    req.body;
  if (!schoolId || !name || !mapId || !simulationId || !targetClass) {
    return res.status(400).json({
      error: "schoolId, name, mapId, simulationId, targetClass required",
    });
  }
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, schoolId)) return;

  const map = db.gridMaps?.[mapId];
  const sim = db.simulations?.[simulationId];
  if (!map || map.schoolId !== schoolId)
    return res.status(404).json({ error: "Map not found" });
  if (!sim || sim.schoolId !== schoolId)
    return res.status(404).json({ error: "Simulation not found" });

  const room = {
    id: generateId("room"),
    schoolId,
    name: name.trim(),
    mapId,
    simulationId,
    targetGrade: targetGrade || "",
    targetClass,
    createdBy: req.user.id,
    status: "WAITING",
    createdAt: new Date().toISOString(),
    startedAt: null,
    endedAt: null,
    joinedStudents: [],
  };

  if (!db.dtRooms) db.dtRooms = {};
  db.dtRooms[room.id] = room;
  if (await writeDB(db)) res.status(201).json({ data: room });
  else res.status(500).json({ error: "Failed to create room" });
});

router.get("/rooms/:roomId", verifyToken, async (req, res) => {
  const db = await readDB();
  const room = db.dtRooms?.[req.params.roomId];
  if (!room) return res.status(404).json({ error: "Room not found" });
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, room.schoolId)) return;

  if (req.user.role === "student") {
    const profile = db.profiles.find((p) => p.userId === req.user.id);
    if (profile?.classSection !== room.targetClass) {
      return res.status(403).json({ error: "Not your class room" });
    }
  }
  res.json({ data: room });
});

router.post("/rooms/:roomId/join", verifyToken, async (req, res) => {
  const db = await readDB();
  const room = db.dtRooms?.[req.params.roomId];
  if (!room) return res.status(404).json({ error: "Room not found" });

  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, room.schoolId)) return;

  if (req.user.role === "student") {
    const profile = db.profiles.find((p) => p.userId === req.user.id);
    if (profile?.classSection !== room.targetClass) {
      return res.status(403).json({ error: "Access denied: not your class" });
    }
  }

  if (room.status === "FINISHED" || room.status === "CANCELLED") {
    return res.status(409).json({ error: "Room is no longer active" });
  }

  if (!room.joinedStudents.includes(req.user.id)) {
    room.joinedStudents.push(req.user.id);
  }
  db.dtRooms[req.params.roomId] = room;
  if (await writeDB(db)) res.json({ data: room });
  else res.status(500).json({ error: "Failed to join room" });
});

router.post("/rooms/:roomId/start", verifyToken, async (req, res) => {
  if (!requireTeacher(req, res)) return;
  const db = await readDB();
  const room = db.dtRooms?.[req.params.roomId];
  if (!room) return res.status(404).json({ error: "Room not found" });
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, room.schoolId)) return;

  if (room.status !== "WAITING") {
    return res.status(409).json({ error: `Room is already ${room.status}` });
  }
  room.status = "RUNNING";
  room.startedAt = new Date().toISOString();
  db.dtRooms[req.params.roomId] = room;
  await initGameSession(req.params.roomId);
  if (await writeDB(db)) res.json({ data: room });
  else res.status(500).json({ error: "Failed to start room" });
});

router.post("/rooms/:roomId/end", verifyToken, async (req, res) => {
  if (!requireTeacher(req, res)) return;
  const db = await readDB();
  const room = db.dtRooms?.[req.params.roomId];
  if (!room) return res.status(404).json({ error: "Room not found" });
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, room.schoolId)) return;

  room.status = "FINISHED";
  room.endedAt = new Date().toISOString();
  db.dtRooms[req.params.roomId] = room;
  endGameSession(req.params.roomId);
  if (await writeDB(db)) res.json({ data: room });
  else res.status(500).json({ error: "Failed to end room" });
});

router.post("/rooms/:roomId/result", verifyToken, async (req, res) => {
  const db = await readDB();
  const room = db.dtRooms?.[req.params.roomId];
  if (!room) return res.status(404).json({ error: "Room not found" });

  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, room.schoolId)) return;
  if (req.user.role === "student") {
    const profile = db.profiles.find((p) => p.userId === req.user.id);
    if (profile?.classSection !== room.targetClass) {
      return res.status(403).json({ error: "Access denied: not your class" });
    }
  }
  if (room.status !== "RUNNING") {
    return res.status(409).json({ error: "Room is not running" });
  }

  const {
    outcome,
    completionTimeSeconds,
    hpRemaining,
    damageTaken,
    distanceTravelled,
    hazardsEncountered,
  } = req.body;
  if (!outcome) return res.status(400).json({ error: "outcome required" });

  const result = {
    id: generateId("result"),
    roomId: req.params.roomId,
    simulationId: room.simulationId,
    mapId: room.mapId,
    schoolId: room.schoolId,
    userId: req.user.id,
    outcome,
    completionTimeSeconds: completionTimeSeconds || null,
    hpRemaining: hpRemaining ?? null,
    damageTaken: damageTaken || 0,
    distanceTravelled: distanceTravelled || 0,
    hazardsEncountered: hazardsEncountered || [],
    submittedAt: new Date().toISOString(),
  };

  if (!db.dtResults) db.dtResults = [];
  db.dtResults.push(result);
  if (await writeDB(db)) res.status(201).json({ data: result });
  else res.status(500).json({ error: "Failed to save result" });
});

router.get("/rooms/:roomId/results", verifyToken, async (req, res) => {
  if (!requireTeacher(req, res)) return;
  const db = await readDB();
  const room = db.dtRooms?.[req.params.roomId];
  if (!room) return res.status(404).json({ error: "Room not found" });
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, room.schoolId)) return;

  const results = (db.dtResults || []).filter(
    (r) => r.roomId === req.params.roomId,
  );
  res.json({ data: results });
});

router.post("/rooms/:roomId/sync", verifyToken, async (req, res) => {
  const db = await readDB();
  const room = db.dtRooms?.[req.params.roomId];
  if (!room) return res.status(404).json({ error: "Room not found" });

  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, room.schoolId)) return;

  if (req.user.role === "student") {
    const profile = db.profiles.find((p) => p.userId === req.user.id);
    if (profile?.classSection !== room.targetClass) {
      return res.status(403).json({ error: "Access denied: not your class" });
    }
  }

  const { x, y, hp, status } = req.body;
  if (!room.activePlayers) room.activePlayers = {};

  if (
    req.user.role === "student" &&
    typeof x === "number" &&
    typeof y === "number"
  ) {
    room.activePlayers[req.user.id] = {
      id: req.user.id,
      name: db.accounts.find((a) => a.id === req.user.id)?.name || "Unknown",
      x,
      y,
      hp: hp || 0,
      status: status || "alive",
      lastSeen: Date.now(),
    };
    db.dtRooms[req.params.roomId] = room;
    await writeDB(db);
  }

  const now = Date.now();
  const activePlayers = Object.values(room.activePlayers || {}).filter(
    (p) => now - p.lastSeen < 10000,
  );

  res.json({
    data: {
      roomStatus: room.status,
      players: activePlayers,
    },
  });
});

export default router;

router.get("/phase1/maps", verifyToken, async (req, res) => {
  const { schoolId } = req.query;
  if (!schoolId) return res.status(400).json({ error: "schoolId required" });

  if (!pool)
    return res.status(500).json({ error: "PostgreSQL not configured" });
  try {
    const result = await timeoutQuery(
      pool.query(
        "SELECT * FROM digital_twin_maps WHERE school_id = $1 ORDER BY updated_at DESC",
        [schoolId],
      ),
    );
    const maps = result.rows;
    for (const map of maps) {
      const scenariosRes = await timeoutQuery(
        pool.query(
          "SELECT id, name, disaster_type, status, version FROM digital_twin_scenarios WHERE map_id = $1",
          [map.id],
        ),
      );
      map.scenarios = scenariosRes.rows;
    }
    res.json({ data: maps });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/phase1/maps", verifyToken, async (req, res) => {
  if (!requireTeacher(req, res)) return;
  const { schoolId, name, description, width, height } = req.body;
  if (!schoolId || !name)
    return res.status(400).json({ error: "schoolId and name required" });

  if (!pool)
    return res.status(500).json({ error: "PostgreSQL not configured" });

  const id = generateId("dtmap");
  try {
    await timeoutQuery(
      pool.query(
        "INSERT INTO digital_twin_maps (id, school_id, name, description, width, height) VALUES ($1, $2, $3, $4, $5, $6)",
        [id, schoolId, name, description || "", width || 64, height || 64],
      ),
    );
    res.status(201).json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/phase1/maps/:mapId", verifyToken, async (req, res) => {
  const { mapId } = req.params;
  if (!pool)
    return res.status(500).json({ error: "PostgreSQL not configured" });

  try {
    const mapRes = await timeoutQuery(
      pool.query("SELECT * FROM digital_twin_maps WHERE id = $1", [mapId]),
    );
    if (mapRes.rows.length === 0)
      return res.status(404).json({ error: "Map not found" });

    const map = mapRes.rows[0];
    const floorsRes = await timeoutQuery(
      pool.query(
        "SELECT * FROM digital_twin_floors WHERE map_id = $1 ORDER BY floor_number ASC",
        [mapId],
      ),
    );
    const boundariesRes = await timeoutQuery(
      pool.query("SELECT * FROM digital_twin_boundaries WHERE map_id = $1", [
        mapId,
      ]),
    );
    const stairsRes = await timeoutQuery(
      pool.query("SELECT * FROM digital_twin_stairs WHERE map_id = $1", [
        mapId,
      ]),
    );

    const roomsRes = await pool.query(
      "SELECT * FROM digital_twin_rooms WHERE map_id=$1",
      [mapId],
    );
    map.rooms = roomsRes.rows;

    const scenariosRes = await timeoutQuery(
      pool.query("SELECT * FROM digital_twin_scenarios WHERE map_id = $1", [
        mapId,
      ]),
    );

    const floors = floorsRes.rows;
    for (const floor of floors) {
      const tilesRes = await timeoutQuery(
        pool.query("SELECT * FROM digital_twin_tiles WHERE floor_id = $1", [
          floor.id,
        ]),
      );
      const objsRes = await timeoutQuery(
        pool.query("SELECT * FROM digital_twin_objects WHERE floor_id = $1", [
          floor.id,
        ]),
      );
      floor.tiles = tilesRes.rows;
      floor.objects = objsRes.rows;
    }

    map.floors = floors;
    map.boundaries = boundariesRes.rows;
    map.stairs = stairsRes.rows;
    map.scenarios = scenariosRes.rows;

    res.json({ data: map });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/phase1/maps/:mapId", verifyToken, async (req, res) => {
  if (!requireTeacher(req, res)) return;
  const { mapId } = req.params;
  if (!pool)
    return res.status(500).json({ error: "PostgreSQL not configured" });

  const {
    name,
    description,
    width,
    height,
    floors,
    boundaries,
    stairs,
    rooms,
    active_floor_id,
    border,
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      "UPDATE digital_twin_maps SET name=$1, description=$2, width=$3, height=$4, active_floor_id=$5, border=$6, updated_at=CURRENT_TIMESTAMP WHERE id=$7",
      [
        name,
        description,
        width,
        height,
        active_floor_id,
        border ? JSON.stringify(border) : null,
        mapId,
      ],
    );

    const currentFloorsRes = await client.query(
      "SELECT id FROM digital_twin_floors WHERE map_id=$1",
      [mapId],
    );
    const currentFloorIds = new Set(currentFloorsRes.rows.map((r) => r.id));
    const newFloorIds = new Set((floors || []).map((f) => f.id));

    for (const fid of currentFloorIds) {
      if (!newFloorIds.has(fid)) {
        await client.query("DELETE FROM digital_twin_floors WHERE id=$1", [
          fid,
        ]);
      }
    }

    for (const floor of floors || []) {
      await client.query(
        "INSERT INTO digital_twin_floors (id, map_id, floor_number, name) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET floor_number=EXCLUDED.floor_number, name=EXCLUDED.name, updated_at=CURRENT_TIMESTAMP",
        [floor.id, mapId, floor.floor_number, floor.name],
      );

      await client.query("DELETE FROM digital_twin_tiles WHERE floor_id=$1", [
        floor.id,
      ]);

      const tiles = floor.tiles || [];
      const chunkSize = 200;
      for (let i = 0; i < tiles.length; i += chunkSize) {
        const chunk = tiles.slice(i, i + chunkSize);
        let values = [];
        let params = [];
        chunk.forEach((t, idx) => {
          const offset = idx * 8;
          values.push(
            `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`,
          );
          params.push(
            t.id || generateId("tile"),
            floor.id,
            t.x,
            t.y,
            t.tile_type,
            t.variant || 0,
            t.rotation || 0,
            t.metadata || {},
          );
        });
        if (values.length > 0) {
          await client.query(
            `INSERT INTO digital_twin_tiles (id, floor_id, x, y, tile_type, variant, rotation, metadata) VALUES ${values.join(", ")}`,
            params,
          );
        }
      }

      await client.query("DELETE FROM digital_twin_objects WHERE floor_id=$1", [
        floor.id,
      ]);
      for (const obj of floor.objects || []) {
        await client.query(
          "INSERT INTO digital_twin_objects (id, floor_id, object_type, x, y, width, height, rotation, properties) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
          [
            obj.id || generateId("obj"),
            floor.id,
            obj.object_type,
            obj.x,
            obj.y,
            obj.width || 1,
            obj.height || 1,
            obj.rotation || 0,
            obj.properties || {},
          ],
        );
      }
    }

    await client.query("DELETE FROM digital_twin_boundaries WHERE map_id=$1", [
      mapId,
    ]);
    for (const b of boundaries || []) {
      await client.query(
        "INSERT INTO digital_twin_boundaries (id, map_id, floor_id, geometry, closed) VALUES ($1, $2, $3, $4, $5)",
        [
          b.id || generateId("bnd"),
          mapId,
          b.floor_id,
          b.geometry || {},
          b.closed ?? true,
        ],
      );
    }

    await client.query("DELETE FROM digital_twin_stairs WHERE map_id=$1", [
      mapId,
    ]);
    for (const s of stairs || []) {
      await client.query(
        "INSERT INTO digital_twin_stairs (id, map_id, from_floor_id, to_floor_id, x, y, direction, type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [
          s.id || generateId("str"),
          mapId,
          s.from_floor_id,
          s.to_floor_id || null,
          s.x,
          s.y,
          s.direction || "N",
          s.type || "UP_DOWN",
        ],
      );
    }

    await client.query("DELETE FROM digital_twin_rooms WHERE map_id=$1", [
      mapId,
    ]);
    for (const room of rooms || []) {
      await client.query(
        "INSERT INTO digital_twin_rooms (id, map_id, floor_id, name, type, x, y, width, height, capacity, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
        [
          room.id || generateId("room"),
          mapId,
          room.floor_id,
          room.name,
          room.type,
          room.x,
          room.y,
          room.width,
          room.height,
          room.capacity || null,
          room.metadata || {},
        ],
      );
    }

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.delete("/phase1/maps/:mapId", verifyToken, async (req, res) => {
  if (!requireTeacher(req, res)) return;
  const { mapId } = req.params;
  if (!pool)
    return res.status(500).json({ error: "PostgreSQL not configured" });
  try {
    await timeoutQuery(
      pool.query("DELETE FROM digital_twin_maps WHERE id = $1", [mapId]),
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/phase1/maps/:mapId/scenarios", verifyToken, async (req, res) => {
  const { mapId } = req.params;
  if (!pool)
    return res.status(500).json({ error: "PostgreSQL not configured" });

  try {
    const result = await timeoutQuery(
      pool.query(
        "SELECT * FROM digital_twin_scenarios WHERE map_id = $1 ORDER BY updated_at DESC",
        [mapId],
      ),
    );
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/phase1/maps/:mapId/scenarios", verifyToken, async (req, res) => {
  if (!requireTeacher(req, res)) return;
  const { mapId } = req.params;
  const { name, disaster_type } = req.body;
  if (!pool)
    return res.status(500).json({ error: "PostgreSQL not configured" });

  const id = generateId("scn");
  try {
    await timeoutQuery(
      pool.query(
        "INSERT INTO digital_twin_scenarios (id, map_id, name, disaster_type, status, config) VALUES ($1, $2, $3, $4, $5, $6)",
        [id, mapId, name, disaster_type, "draft", {}],
      ),
    );
    res.status(201).json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/phase1/scenarios/:scenarioId", verifyToken, async (req, res) => {
  const { scenarioId } = req.params;
  if (!pool)
    return res.status(500).json({ error: "PostgreSQL not configured" });

  try {
    const scnRes = await timeoutQuery(
      pool.query("SELECT * FROM digital_twin_scenarios WHERE id = $1", [
        scenarioId,
      ]),
    );
    if (scnRes.rows.length === 0)
      return res.status(404).json({ error: "Scenario not found" });

    const scenario = scnRes.rows[0];
    const objsRes = await timeoutQuery(
      pool.query(
        "SELECT * FROM digital_twin_scenario_objects WHERE scenario_id = $1",
        [scenarioId],
      ),
    );

    scenario.objects = objsRes.rows;
    res.json({ data: scenario });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/phase1/scenarios/:scenarioId", verifyToken, async (req, res) => {
  if (!requireTeacher(req, res)) return;
  const { scenarioId } = req.params;
  const { name, disaster_type, status, config, objects } = req.body;
  if (!pool)
    return res.status(500).json({ error: "PostgreSQL not configured" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const exRes = await client.query(
      "SELECT * FROM digital_twin_scenarios WHERE id=$1",
      [scenarioId],
    );
    if (exRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Scenario not found" });
    }
    const existing = exRes.rows[0];

    const finalName = name !== undefined ? name : existing.name;
    const finalDisasterType =
      disaster_type !== undefined ? disaster_type : existing.disaster_type;
    const finalStatus = status !== undefined ? status : existing.status;
    const finalConfig = config !== undefined ? config : existing.config;

    if (finalStatus === "published") {
      console.log("Publish Validation:", { finalName, finalDisasterType });
      if (
        !finalName ||
        (typeof finalName === "string" && finalName.trim() === "")
      ) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Name is required to publish." });
      }
      if (!finalDisasterType) {
        await client.query("ROLLBACK");
        return res
          .status(400)
          .json({ error: "Disaster type is required to publish." });
      }
    }

    await client.query(
      "UPDATE digital_twin_scenarios SET name=$1, disaster_type=$2, status=$3, config=$4, updated_at=CURRENT_TIMESTAMP WHERE id=$5",
      [
        finalName,
        finalDisasterType,
        finalStatus,
        finalConfig || {},
        scenarioId,
      ],
    );

    if (objects) {
      await client.query(
        "DELETE FROM digital_twin_scenario_objects WHERE scenario_id=$1",
        [scenarioId],
      );
      for (const obj of objects) {
        await client.query(
          "INSERT INTO digital_twin_scenario_objects (id, scenario_id, floor_id, object_type, x, y, width, height, rotation, properties) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
          [
            obj.id || generateId("sobj"),
            scenarioId,
            obj.floor_id,
            obj.object_type,
            obj.x,
            obj.y,
            obj.width || 1,
            obj.height || 1,
            obj.rotation || 0,
            obj.properties || {},
          ],
        );
      }
    }

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.post(
  "/phase1/scenarios/:scenarioId/duplicate",
  verifyToken,
  async (req, res) => {
    if (!requireTeacher(req, res)) return;
    const { scenarioId } = req.params;
    if (!pool)
      return res.status(500).json({ error: "PostgreSQL not configured" });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const scnRes = await client.query(
        "SELECT * FROM digital_twin_scenarios WHERE id = $1",
        [scenarioId],
      );
      if (scnRes.rows.length === 0) throw new Error("Scenario not found");
      const scn = scnRes.rows[0];

      const newId = generateId("scn");
      await client.query(
        "INSERT INTO digital_twin_scenarios (id, map_id, name, disaster_type, status, config) VALUES ($1, $2, $3, $4, $5, $6)",
        [
          newId,
          scn.map_id,
          `${scn.name} (Copy)`,
          scn.disaster_type,
          "draft",
          scn.config,
        ],
      );

      const objsRes = await client.query(
        "SELECT * FROM digital_twin_scenario_objects WHERE scenario_id = $1",
        [scenarioId],
      );
      for (const obj of objsRes.rows) {
        await client.query(
          "INSERT INTO digital_twin_scenario_objects (id, scenario_id, floor_id, object_type, x, y, width, height, rotation, properties) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
          [
            generateId("sobj"),
            newId,
            obj.floor_id,
            obj.object_type,
            obj.x,
            obj.y,
            obj.width,
            obj.height,
            obj.rotation,
            obj.properties,
          ],
        );
      }

      await client.query("COMMIT");
      res.status(201).json({ success: true, id: newId });
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  },
);

router.delete(
  "/phase1/scenarios/:scenarioId",
  verifyToken,
  async (req, res) => {
    if (!requireTeacher(req, res)) return;
    const { scenarioId } = req.params;
    if (!pool)
      return res.status(500).json({ error: "PostgreSQL not configured" });
    try {
      await timeoutQuery(
        pool.query("DELETE FROM digital_twin_scenarios WHERE id=$1", [
          scenarioId,
        ]),
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);
