import { readDB, writeDB, pool, timeoutQuery } from "../repositories/repository.js";
import { getIO } from "../sockets/socket.js";

const activeSessions = new Map();

const TICK_RATE = 1000 / 15; // 15 FPS simulation tick
const DAMAGE_PER_SECOND = 10;

function rectCircleCollide(rx, ry, rw, rh, cx, cy, cr) {
  const distX = Math.abs(cx - rx - rw / 2);
  const distY = Math.abs(cy - ry - rh / 2);

  if (distX > rw / 2 + cr) {
    return false;
  }
  if (distY > rh / 2 + cr) {
    return false;
  }

  if (distX <= rw / 2) {
    return true;
  }
  if (distY <= rh / 2) {
    return true;
  }

  const dx = distX - rw / 2;
  const dy = distY - rh / 2;
  return dx * dx + dy * dy <= cr * cr;
}

export async function initGameSession(roomId) {
  if (activeSessions.has(roomId)) return;

  const db = await readDB();
  const room = db.dtRooms?.[roomId];
  let simId, mapId, durationSeconds;

  if (room) {
    simId = room.simulationId;
    mapId = room.mapId;
  } else if (pool) {
    try {
      const pRes = await timeoutQuery(
        pool.query(
          "SELECT scenario_id, map_id, settings FROM simulation_sessions WHERE id = $1",
          [roomId],
        ),
      );
      if (pRes.rows.length > 0) {
        simId = pRes.rows[0].scenario_id;
        mapId = pRes.rows[0].map_id;
      }
    } catch (e) {
      console.error("DB Error fetching session:", e);
    }
  }

  let sim = db.simulations?.[simId];
  let map = db.gridMaps?.[mapId];

  if ((!sim || !map) && pool) {
    try {
      if (!sim) {
        const simRes = await timeoutQuery(
          pool.query("SELECT * FROM digital_twin_scenarios WHERE id = $1", [
            simId,
          ]),
        );
        if (simRes.rows.length > 0) {
          sim = simRes.rows[0];

          if (typeof sim.hazards === "string")
            sim.hazards = JSON.parse(sim.hazards);
          if (typeof sim.objects === "string")
            sim.objects = JSON.parse(sim.objects);
          if (typeof sim.config === "string")
            sim.config = JSON.parse(sim.config);
          sim.durationSeconds = sim.config?.durationSeconds || 120;
        }
      }
      if (!map) {
        const mapRes = await timeoutQuery(
          pool.query("SELECT * FROM digital_twin_maps WHERE id = $1", [mapId]),
        );
        if (mapRes.rows.length > 0) {
          map = mapRes.rows[0];
          if (typeof map.floors === "string")
            map.floors = JSON.parse(map.floors);
          if (typeof map.cells === "string") map.cells = JSON.parse(map.cells);
        }
      }
    } catch (e) {
      console.error("DB Error fetching map/scenario:", e);
    }
  }

  if (!sim || !map) return;

  activeSessions.set(roomId, {
    roomId,
    startedAt: Date.now(),
    durationSeconds: sim.durationSeconds,
    map,
    sim,
    players: new Map(), // participantId -> playerState
    interval: setInterval(() => tickSession(roomId), TICK_RATE),
    lastTickTime: Date.now(),
    completed: false,
  });

  console.log(`[GameManager] Initialized session ${roomId}`);
}

export function endGameSession(roomId) {
  const session = activeSessions.get(roomId);
  if (session && !session.completed) {
    handleSessionEnd(session, roomId);
  }
}

export function updatePlayerMovement(
  roomId,
  participantId,
  studentId,
  displayName,
  data,
) {
  const session = activeSessions.get(roomId);
  if (!session) return;

  let player = session.players.get(participantId);
  if (!player) {
    player = {
      participantId,
      studentId,
      displayName,
      x: data.x,
      y: data.y,
      floorId: data.floorId,
      direction: data.direction,
      hp: 100,
      alive: true,
      completedObjectives: new Set(),
      status: "playing", // playing, success, failed
      damageTaken: 0,
      distanceTravelled: 0, // Simplification for now
    };
    session.players.set(participantId, player);
  }

  if (player.alive && player.status === "playing") {
    player.x = data.x;
    player.y = data.y;
    player.floorId = data.floorId;
    player.direction = data.direction;
  }
}

export function removePlayer(roomId, participantId) {
  const session = activeSessions.get(roomId);
  if (session) {
    session.players.delete(participantId);
  }
}

async function handleSessionEnd(session, roomId) {
  session.completed = true;
  clearInterval(session.interval);

  const io = getIO();
  if (io) {
    const playersObj = {};
    for (const [pId, pState] of session.players.entries()) {
      playersObj[pId] = pState;
    }
    io.to(`session_${roomId}`).emit("game_state_update", {
      timeRemaining: Math.max(
        0,
        session.durationSeconds -
          Math.floor((Date.now() - session.startedAt) / 1000),
      ),
      elapsedTime: Math.floor((Date.now() - session.startedAt) / 1000),
      players: playersObj,
      sessionStatus: "FINISHED",
    });
  }

  const db = await readDB();
  if (!db.dtResults) db.dtResults = [];

  const room = db.dtRooms?.[roomId];
  if (room) {
    room.status = "FINISHED";
    room.endedAt = new Date().toISOString();
  }

  for (const [participantId, player] of session.players.entries()) {
    const isSuccess = player.status === "success";
    const result = {
      id: `res_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      roomId: roomId,
      simulationId: session.sim.id,
      mapId: session.map.id,
      schoolId: session.sim.schoolId || session.sim.school_id,
      userId: player.studentId,
      outcome: isSuccess ? "success" : "failed",
      completionTimeSeconds: isSuccess
        ? Math.floor((Date.now() - session.startedAt) / 1000)
        : null,
      hpRemaining: Math.round(player.hp),
      damageTaken: Math.round(player.damageTaken),
      distanceTravelled: 0,
      hazardsEncountered: [],
      submittedAt: new Date().toISOString(),
    };
    db.dtResults.push(result);
  }

  await writeDB(db);
  activeSessions.delete(roomId);
  console.log(`[GameManager] Session ${roomId} finished and results saved.`);
}

function tickSession(roomId) {
  const session = activeSessions.get(roomId);
  if (!session || session.completed) return;

  const now = Date.now();
  const dt = (now - session.lastTickTime) / 1000;
  session.lastTickTime = now;

  const elapsedTime = Math.floor((now - session.startedAt) / 1000);
  const timeRemaining = Math.max(0, session.durationSeconds - elapsedTime);
  const isTimeUp = timeRemaining === 0;

  let anyPlayerUpdated = false;

  for (const [participantId, player] of session.players.entries()) {
    if (!player.alive || player.status !== "playing") continue;

    if (isTimeUp) {
      player.hp = 0;
      player.alive = false;
      player.status = "failed";
      player.objectiveProgress = "Time is up! You failed.";
      anyPlayerUpdated = true;
      continue;
    }

    const floor = session.map.floors?.find((f) => f.id === player.floorId);
    if (!floor) continue;

    let inDamageZone = false;
    let inSafeZone = false;
    let onExit = false;
    let onObjective = false;
    const TILE_SIZE = 40;
    const PLAYER_RADIUS = 12;

    const objects = session.sim.objects || session.sim.hazards || [];

    for (const obj of objects) {
      if (obj.floor_id !== floor.id) continue;

      const isIntersecting = rectCircleCollide(
        obj.x * TILE_SIZE,
        obj.y * TILE_SIZE,
        (obj.width || 1) * TILE_SIZE,
        (obj.height || 1) * TILE_SIZE,
        player.x,
        player.y,
        PLAYER_RADIUS,
      );

      if (isIntersecting) {
        if (obj.object_type === "FIRE" || obj.object_type === "DAMAGE_ZONE") {
          inDamageZone = true;
        }
        if (obj.object_type === "SAFE_ZONE") {
          inSafeZone = true;
        }
        if (obj.object_type === "EXIT") {
          onExit = true;
        }
        if (obj.object_type === "OBJECTIVE") {
          onObjective = true;
          if (obj.id && !player.completedObjectives.has(obj.id)) {
            player.completedObjectives.add(obj.id);
            anyPlayerUpdated = true;
          }
        }
      }
    }

    const totalObjectives = objects.filter(
      (o) => o.object_type === "OBJECTIVE",
    ).length;

    if (inDamageZone && !inSafeZone) {
      const damage = DAMAGE_PER_SECOND * dt;
      player.hp -= damage;
      player.damageTaken += damage;
      anyPlayerUpdated = true;

      if (player.hp <= 0) {
        player.hp = 0;
        player.alive = false;
        player.status = "failed";
        player.objectiveProgress = "You succumbed to the hazards.";
      }
    }

    if (inSafeZone) {
    }

    if (player.alive && onExit) {
      player.status = "success";
      player.objectiveProgress = "Evacuated Successfully!";
      anyPlayerUpdated = true;
    }

    if (player.status === "playing") {
      if (
        totalObjectives > 0 &&
        player.completedObjectives.size < totalObjectives
      ) {
        player.objectiveProgress = `Complete Objectives (${player.completedObjectives.size}/${totalObjectives})`;
      } else {
        player.objectiveProgress = "Evacuate to Safe Zone / Exit";
      }
    }
  }

  const allFinished =
    session.players.size > 0 &&
    Array.from(session.players.values()).every((p) => p.status !== "playing");
  if (allFinished || isTimeUp) {
    handleSessionEnd(session, roomId);
  }

  const io = getIO();
  if (io) {
    const playersObj = {};
    for (const [pId, pState] of session.players.entries()) {
      playersObj[pId] = pState;
    }
    io.to(`session_${roomId}`).emit("game_state_update", {
      timeRemaining,
      elapsedTime,
      players: playersObj,
      sessionStatus: session.completed ? "FINISHED" : "RUNNING",
    });
  }
}
