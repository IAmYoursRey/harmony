import express from 'express';
import { readDB, writeDB } from '../repository.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Get caller's schoolId from their profile */
function getCallerSchoolId(db, userId) {
  const profile = db.profiles.find(p => p.userId === userId);
  return profile?.schoolId || null;
}

/** Enforce teacher/dev role */
function requireTeacher(req, res) {
  if (req.user.role !== 'teacher' && req.user.role !== 'dev') {
    res.status(403).json({ error: 'Teacher or dev role required' });
    return false;
  }
  return true;
}

/** Enforce school ownership: caller must own the schoolId OR be dev */
function requireSchoolOwnership(req, res, callerSchoolId, targetSchoolId) {
  if (req.user.role === 'dev') return true;
  if (callerSchoolId !== targetSchoolId) {
    res.status(403).json({ error: 'Access denied: different school' });
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────
// LEGACY: SVG-based Digital Twin (preserved exactly)
// ─────────────────────────────────────────────────────────────

// GET digital twin by schoolId (legacy image+nodes+edges)
router.get('/legacy/:schoolId', (req, res) => {
  const { schoolId } = req.params;
  const db = readDB();
  const twin = db.digitalTwins?.[schoolId] || null;
  res.json({ data: twin });
});

// POST save digital twin (legacy)
router.post('/legacy/:schoolId', verifyToken, (req, res) => {
  if (!requireTeacher(req, res)) return;
  const { schoolId } = req.params;
  const { mapImage, nodes, edges } = req.body;
  const db = readDB();
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, schoolId)) return;

  if (!db.digitalTwins) db.digitalTwins = {};
  db.digitalTwins[schoolId] = { mapImage, nodes, edges, lastUpdated: new Date().toISOString() };
  const success = writeDB(db);
  if (success) res.json({ success: true });
  else res.status(500).json({ error: 'Failed to save digital twin' });
});

// Legacy routes without prefix (backward-compat for existing frontend)
router.get('/:schoolId', (req, res, next) => {
  // Skip if the schoolId looks like a sub-route
  const id = req.params.schoolId;
  if (['maps', 'simulations', 'rooms'].includes(id)) return next();
  const db = readDB();
  const twin = db.digitalTwins?.[id] || null;
  res.json({ data: twin });
});

router.post('/:schoolId', verifyToken, (req, res, next) => {
  const id = req.params.schoolId;
  if (['maps', 'simulations', 'rooms'].includes(id)) return next();
  if (!requireTeacher(req, res)) return;
  const { mapImage, nodes, edges } = req.body;
  const db = readDB();
  if (!db.digitalTwins) db.digitalTwins = {};
  db.digitalTwins[id] = { mapImage, nodes, edges, lastUpdated: new Date().toISOString() };
  const success = writeDB(db);
  if (success) res.json({ success: true });
  else res.status(500).json({ error: 'Failed to save digital twin' });
});

// ─────────────────────────────────────────────────────────────
// GRID MAPS
// ─────────────────────────────────────────────────────────────

// GET all maps for a school
router.get('/maps', verifyToken, (req, res) => {
  const { schoolId } = req.query;
  if (!schoolId) return res.status(400).json({ error: 'schoolId query param required' });
  const db = readDB();
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, schoolId)) return;

  const maps = Object.values(db.gridMaps || {}).filter(m => m.schoolId === schoolId);
  res.json({ data: maps });
});

// POST create new map
router.post('/maps', verifyToken, (req, res) => {
  if (!requireTeacher(req, res)) return;
  const db = readDB();
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  const { schoolId, name, description, gridWidth, gridHeight, cellScale, cellScaleUnit } = req.body;

  if (!schoolId || !name) return res.status(400).json({ error: 'schoolId and name required' });
  if (!requireSchoolOwnership(req, res, callerSchoolId, schoolId)) return;

  const w = Math.min(Math.max(parseInt(gridWidth) || 20, 5), 60);
  const h = Math.min(Math.max(parseInt(gridHeight) || 20, 5), 60);

  const newMap = {
    id: generateId('map'),
    schoolId,
    name: name.trim(),
    description: description?.trim() || '',
    gridWidth: w,
    gridHeight: h,
    cellScale: parseFloat(cellScale) || 1,
    cellScaleUnit: cellScaleUnit || 'meter',
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
  if (writeDB(db)) res.status(201).json({ data: newMap });
  else res.status(500).json({ error: 'Failed to create map' });
});

// GET single map
router.get('/maps/:mapId', verifyToken, (req, res) => {
  const db = readDB();
  const map = db.gridMaps?.[req.params.mapId];
  if (!map) return res.status(404).json({ error: 'Map not found' });
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, map.schoolId)) return;
  res.json({ data: map });
});

// PUT update map
router.put('/maps/:mapId', verifyToken, (req, res) => {
  if (!requireTeacher(req, res)) return;
  const db = readDB();
  const map = db.gridMaps?.[req.params.mapId];
  if (!map) return res.status(404).json({ error: 'Map not found' });
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, map.schoolId)) return;

  const { name, description, cells, rooms, doors, safePoints, spawnPoints, cellScale, cellScaleUnit } = req.body;
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
  if (writeDB(db)) res.json({ data: map });
  else res.status(500).json({ error: 'Failed to update map' });
});

// DELETE map
router.delete('/maps/:mapId', verifyToken, (req, res) => {
  if (!requireTeacher(req, res)) return;
  const db = readDB();
  const map = db.gridMaps?.[req.params.mapId];
  if (!map) return res.status(404).json({ error: 'Map not found' });
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, map.schoolId)) return;

  delete db.gridMaps[req.params.mapId];
  if (writeDB(db)) res.json({ success: true });
  else res.status(500).json({ error: 'Failed to delete map' });
});

// ─────────────────────────────────────────────────────────────
// DISASTER SIMULATIONS
// ─────────────────────────────────────────────────────────────

// GET all simulations for a school
router.get('/simulations', verifyToken, (req, res) => {
  const { schoolId } = req.query;
  if (!schoolId) return res.status(400).json({ error: 'schoolId query param required' });
  const db = readDB();
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, schoolId)) return;

  const sims = Object.values(db.simulations || {}).filter(s => s.schoolId === schoolId);
  res.json({ data: sims });
});

// POST create simulation
router.post('/simulations', verifyToken, (req, res) => {
  if (!requireTeacher(req, res)) return;
  const db = readDB();
  const { schoolId, mapId, disasterType, name, description, durationSeconds,
    spawnPointId, safePointIds, hazards, events, loseConditions } = req.body;

  if (!schoolId || !mapId || !name || !disasterType) {
    return res.status(400).json({ error: 'schoolId, mapId, name, disasterType required' });
  }
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, schoolId)) return;

  const map = db.gridMaps?.[mapId];
  if (!map || map.schoolId !== schoolId) {
    return res.status(404).json({ error: 'Map not found or not in this school' });
  }

  const sim = {
    id: generateId('sim'),
    schoolId,
    mapId,
    disasterType,
    name: name.trim(),
    description: description?.trim() || '',
    durationSeconds: parseInt(durationSeconds) || 120,
    spawnPointId: spawnPointId || '',
    safePointIds: safePointIds || [],
    hazards: hazards || [],
    events: events || [],
    winCondition: 'REACH_SAFE_POINT',
    loseConditions: loseConditions || ['HP_ZERO', 'TIMER_ZERO'],
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!db.simulations) db.simulations = {};
  db.simulations[sim.id] = sim;
  if (writeDB(db)) res.status(201).json({ data: sim });
  else res.status(500).json({ error: 'Failed to create simulation' });
});

// GET single simulation
router.get('/simulations/:simId', verifyToken, (req, res) => {
  const db = readDB();
  const sim = db.simulations?.[req.params.simId];
  if (!sim) return res.status(404).json({ error: 'Simulation not found' });
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, sim.schoolId)) return;
  res.json({ data: sim });
});

// PUT update simulation
router.put('/simulations/:simId', verifyToken, (req, res) => {
  if (!requireTeacher(req, res)) return;
  const db = readDB();
  const sim = db.simulations?.[req.params.simId];
  if (!sim) return res.status(404).json({ error: 'Simulation not found' });
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, sim.schoolId)) return;

  const allowed = ['name','description','durationSeconds','spawnPointId','safePointIds','hazards','events','loseConditions'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) sim[key] = req.body[key];
  }
  sim.updatedAt = new Date().toISOString();
  db.simulations[req.params.simId] = sim;
  if (writeDB(db)) res.json({ data: sim });
  else res.status(500).json({ error: 'Failed to update simulation' });
});

// DELETE simulation
router.delete('/simulations/:simId', verifyToken, (req, res) => {
  if (!requireTeacher(req, res)) return;
  const db = readDB();
  const sim = db.simulations?.[req.params.simId];
  if (!sim) return res.status(404).json({ error: 'Simulation not found' });
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, sim.schoolId)) return;

  delete db.simulations[req.params.simId];
  if (writeDB(db)) res.json({ success: true });
  else res.status(500).json({ error: 'Failed to delete simulation' });
});

// ─────────────────────────────────────────────────────────────
// SIMULATION ROOMS (sessions)
// ─────────────────────────────────────────────────────────────

// GET rooms for a school (students see only their class rooms, teachers see all for their school)
router.get('/rooms', verifyToken, (req, res) => {
  const { schoolId } = req.query;
  if (!schoolId) return res.status(400).json({ error: 'schoolId required' });
  const db = readDB();
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, schoolId)) return;

  let rooms = Object.values(db.dtRooms || {}).filter(r => r.schoolId === schoolId);

  // Students only see rooms matching their class
  if (req.user.role === 'student') {
    const profile = db.profiles.find(p => p.userId === req.user.id);
    const studentClass = profile?.classSection;
    rooms = rooms.filter(r =>
      r.status !== 'CANCELLED' &&
      r.status !== 'FINISHED' &&
      r.targetClass === studentClass
    );
  }

  res.json({ data: rooms });
});

// POST create room
router.post('/rooms', verifyToken, (req, res) => {
  if (!requireTeacher(req, res)) return;
  const db = readDB();
  const { schoolId, name, mapId, simulationId, targetGrade, targetClass } = req.body;
  if (!schoolId || !name || !mapId || !simulationId || !targetClass) {
    return res.status(400).json({ error: 'schoolId, name, mapId, simulationId, targetClass required' });
  }
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, schoolId)) return;

  // Validate map and simulation belong to this school
  const map = db.gridMaps?.[mapId];
  const sim = db.simulations?.[simulationId];
  if (!map || map.schoolId !== schoolId) return res.status(404).json({ error: 'Map not found' });
  if (!sim || sim.schoolId !== schoolId) return res.status(404).json({ error: 'Simulation not found' });

  const room = {
    id: generateId('room'),
    schoolId,
    name: name.trim(),
    mapId,
    simulationId,
    targetGrade: targetGrade || '',
    targetClass,
    createdBy: req.user.id,
    status: 'WAITING',
    createdAt: new Date().toISOString(),
    startedAt: null,
    endedAt: null,
    joinedStudents: [],
  };

  if (!db.dtRooms) db.dtRooms = {};
  db.dtRooms[room.id] = room;
  if (writeDB(db)) res.status(201).json({ data: room });
  else res.status(500).json({ error: 'Failed to create room' });
});

// GET single room
router.get('/rooms/:roomId', verifyToken, (req, res) => {
  const db = readDB();
  const room = db.dtRooms?.[req.params.roomId];
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, room.schoolId)) return;

  // Students only see their class rooms
  if (req.user.role === 'student') {
    const profile = db.profiles.find(p => p.userId === req.user.id);
    if (profile?.classSection !== room.targetClass) {
      return res.status(403).json({ error: 'Not your class room' });
    }
  }
  res.json({ data: room });
});

// POST join room
router.post('/rooms/:roomId/join', verifyToken, (req, res) => {
  const db = readDB();
  const room = db.dtRooms?.[req.params.roomId];
  if (!room) return res.status(404).json({ error: 'Room not found' });

  // School isolation
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, room.schoolId)) return;

  // Class isolation — server-enforced
  if (req.user.role === 'student') {
    const profile = db.profiles.find(p => p.userId === req.user.id);
    if (profile?.classSection !== room.targetClass) {
      return res.status(403).json({ error: 'Access denied: not your class' });
    }
  }

  if (room.status === 'FINISHED' || room.status === 'CANCELLED') {
    return res.status(409).json({ error: 'Room is no longer active' });
  }

  if (!room.joinedStudents.includes(req.user.id)) {
    room.joinedStudents.push(req.user.id);
  }
  db.dtRooms[req.params.roomId] = room;
  if (writeDB(db)) res.json({ data: room });
  else res.status(500).json({ error: 'Failed to join room' });
});

// POST start room
router.post('/rooms/:roomId/start', verifyToken, (req, res) => {
  if (!requireTeacher(req, res)) return;
  const db = readDB();
  const room = db.dtRooms?.[req.params.roomId];
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, room.schoolId)) return;

  if (room.status !== 'WAITING') {
    return res.status(409).json({ error: `Room is already ${room.status}` });
  }
  room.status = 'RUNNING';
  room.startedAt = new Date().toISOString();
  db.dtRooms[req.params.roomId] = room;
  if (writeDB(db)) res.json({ data: room });
  else res.status(500).json({ error: 'Failed to start room' });
});

// POST end room
router.post('/rooms/:roomId/end', verifyToken, (req, res) => {
  if (!requireTeacher(req, res)) return;
  const db = readDB();
  const room = db.dtRooms?.[req.params.roomId];
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, room.schoolId)) return;

  room.status = 'FINISHED';
  room.endedAt = new Date().toISOString();
  db.dtRooms[req.params.roomId] = room;
  if (writeDB(db)) res.json({ data: room });
  else res.status(500).json({ error: 'Failed to end room' });
});

// POST submit game result
router.post('/rooms/:roomId/result', verifyToken, (req, res) => {
  const db = readDB();
  const room = db.dtRooms?.[req.params.roomId];
  if (!room) return res.status(404).json({ error: 'Room not found' });

  // School + class isolation
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, room.schoolId)) return;
  if (req.user.role === 'student') {
    const profile = db.profiles.find(p => p.userId === req.user.id);
    if (profile?.classSection !== room.targetClass) {
      return res.status(403).json({ error: 'Access denied: not your class' });
    }
  }
  if (room.status !== 'RUNNING') {
    return res.status(409).json({ error: 'Room is not running' });
  }

  const { outcome, completionTimeSeconds, hpRemaining, damageTaken, distanceTravelled, hazardsEncountered } = req.body;
  if (!outcome) return res.status(400).json({ error: 'outcome required' });

  const result = {
    id: generateId('result'),
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
  if (writeDB(db)) res.status(201).json({ data: result });
  else res.status(500).json({ error: 'Failed to save result' });
});

// GET results for a room (teacher only)
router.get('/rooms/:roomId/results', verifyToken, (req, res) => {
  if (!requireTeacher(req, res)) return;
  const db = readDB();
  const room = db.dtRooms?.[req.params.roomId];
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, room.schoolId)) return;

  const results = (db.dtResults || []).filter(r => r.roomId === req.params.roomId);
  res.json({ data: results });
});

// POST sync player state (Real-time telemetry)
router.post('/rooms/:roomId/sync', verifyToken, (req, res) => {
  const db = readDB();
  const room = db.dtRooms?.[req.params.roomId];
  if (!room) return res.status(404).json({ error: 'Room not found' });

  // School isolation
  const callerSchoolId = getCallerSchoolId(db, req.user.id);
  if (!requireSchoolOwnership(req, res, callerSchoolId, room.schoolId)) return;

  // Student class isolation
  if (req.user.role === 'student') {
    const profile = db.profiles.find(p => p.userId === req.user.id);
    if (profile?.classSection !== room.targetClass) {
      return res.status(403).json({ error: 'Access denied: not your class' });
    }
  }

  // Update telemetry
  const { x, y, hp, status } = req.body;
  if (!room.activePlayers) room.activePlayers = {};
  
  if (req.user.role === 'student' && typeof x === 'number' && typeof y === 'number') {
    room.activePlayers[req.user.id] = {
      id: req.user.id,
      name: db.accounts.find(a => a.id === req.user.id)?.name || 'Unknown',
      x,
      y,
      hp: hp || 0,
      status: status || 'alive',
      lastSeen: Date.now()
    };
    db.dtRooms[req.params.roomId] = room;
    writeDB(db);
  }

  // Clean up stale players (older than 10 seconds)
  const now = Date.now();
  const activePlayers = Object.values(room.activePlayers || {}).filter(p => now - p.lastSeen < 10000);

  res.json({
    data: {
      roomStatus: room.status,
      players: activePlayers
    }
  });
});

export default router;
