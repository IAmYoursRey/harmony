import express from "express";
import { v4 as uuidv4 } from "uuid";
import { pool, timeoutQuery } from "../repositories/repository.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { initGameSession, endGameSession } from "../game/gameManager.js";
import { getIO } from "../sockets/socket.js";
import { buildSman1NgoroPdfDigitalTwin } from "../data/sman1NgoroPdfMapBuilder.js";

const router = express.Router();

let schemaPromise = null;
async function ensureMultiplayerSchema() {
  if (!pool) return;
  if (!schemaPromise) {
    schemaPromise = (async () => {
      try {
        await timeoutQuery(
          pool.query(`
            ALTER TABLE simulation_participants ADD COLUMN IF NOT EXISTS avatar_style VARCHAR(20) DEFAULT 'girl';
            ALTER TABLE simulation_participants ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(20) DEFAULT '#3b82f6';
            ALTER TABLE simulation_participants ADD COLUMN IF NOT EXISTS live_state JSONB DEFAULT '{}'::jsonb;
            ALTER TABLE simulation_participants ADD COLUMN IF NOT EXISTS finish_time_ms INTEGER;
            ALTER TABLE simulation_participants ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;
            ALTER TABLE simulation_participants ADD COLUMN IF NOT EXISTS grade VARCHAR(8);
            ALTER TABLE simulation_participants ADD COLUMN IF NOT EXISTS finished_at TIMESTAMP;
            ALTER TABLE simulation_participants ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
          `),
        );
      } catch (err) {
        schemaPromise = null;
        throw err;
      }
    })();
  }
  await schemaPromise;
}

const scenarioMetaCache = new Map();
function getScenarioTitle(scenarioId) {
  if (scenarioMetaCache.size === 0) {
    const twin = buildSman1NgoroPdfDigitalTwin();
    for (const sc of twin.scenarios || []) {
      scenarioMetaCache.set(sc.id, {
        name: sc.name,
        disasterType: sc.disaster_type,
      });
    }
  }
  return scenarioMetaCache.get(scenarioId) || null;
}

// In-memory fallback store when PostgreSQL pool is unavailable
const memorySessions = new Map();

function generateJoinCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function sortCompetitiveLeaderboard(participants) {
  return [...participants].sort((a, b) => {
    const aDone = Boolean(a.finishedAt || a.finishTimeMs != null);
    const bDone = Boolean(b.finishedAt || b.finishTimeMs != null);
    if (aDone !== bDone) return aDone ? -1 : 1;
    if (aDone && bDone) {
      const aTime = a.finishTimeMs ?? Number.MAX_SAFE_INTEGER;
      const bTime = b.finishTimeMs ?? Number.MAX_SAFE_INTEGER;
      if (aTime !== bTime) return aTime - bTime;
      return (b.score ?? 0) - (a.score ?? 0);
    }

    const aAlive = a.liveState?.alive !== false;
    const bAlive = b.liveState?.alive !== false;
    if (aAlive !== bAlive) return aAlive ? -1 : 1;

    const aHp = a.liveState?.hp ?? 100;
    const bHp = b.liveState?.hp ?? 100;
    if (aHp !== bHp) return bHp - aHp;

    return new Date(a.joinedAt || 0).getTime() - new Date(b.joinedAt || 0).getTime();
  });
}

function serializeParticipantRow(row) {
  const live =
    typeof row.live_state === "string"
      ? JSON.parse(row.live_state || "{}")
      : row.live_state || {};
  return {
    id: row.id,
    studentId: row.student_id,
    displayName: row.display_name,
    status: row.status,
    readyState: Boolean(row.ready_state),
    avatarStyle: row.avatar_style === "boy" ? "boy" : "girl",
    avatarColor: row.avatar_color || "#3b82f6",
    joinedAt: row.joined_at,
    finishedAt: row.finished_at,
    finishTimeMs: row.finish_time_ms,
    score: row.score ?? 0,
    grade: row.grade || null,
    lastSyncAt: row.last_sync_at,
    liveState: live,
  };
}

router.post("/", verifyToken, async (req, res) => {
  await ensureMultiplayerSchema();

  const {
    schoolId,
    classId = "mabar",
    mapId,
    scenarioId,
    settings = {},
    displayName,
    avatarStyle = "girl",
    avatarColor = "#3b82f6",
  } = req.body || {};

  if (!mapId || !scenarioId) {
    return res.status(400).json({ error: "mapId dan scenarioId diperlukan" });
  }

  const finalSchoolId = schoolId || "unknown";
  const hostName = displayName || req.user.name || "Host";
  const normalizedSettings = {
    capacity: 35,
    mode: settings.mode === "race" ? "race" : "mabar",
    difficulty: ["mudah", "sedang", "sulit"].includes(settings.difficulty)
      ? settings.difficulty
      : "sulit",
    isPublic: settings.isPublic !== false,
    allowLateJoin: settings.allowLateJoin !== false,
    roomName:
      typeof settings.roomName === "string" && settings.roomName.trim()
        ? settings.roomName.trim().slice(0, 60)
        : `Room ${hostName}`,
    hostName,
    openDoors: [],
  };

  const id = uuidv4();
  const safeStyle = avatarStyle === "boy" ? "boy" : "girl";
  const safeColor = typeof avatarColor === "string" ? avatarColor : "#3b82f6";

  if (!pool) {
    const code = generateJoinCode();
    const record = {
      id,
      code,
      schoolId: finalSchoolId,
      classId,
      mapId,
      scenarioId,
      createdBy: req.user.id,
      status: "LOBBY",
      settings: normalizedSettings,
      createdAt: new Date().toISOString(),
      startedAt: null,
      endedAt: null,
      participants: new Map([
        [
          req.user.id,
          {
            id: uuidv4(),
            studentId: req.user.id,
            displayName: hostName,
            status: "WAITING",
            readyState: true,
            avatarStyle: safeStyle,
            avatarColor: safeColor,
            joinedAt: new Date().toISOString(),
            finishedAt: null,
            finishTimeMs: null,
            score: 0,
            grade: null,
            lastSyncAt: new Date().toISOString(),
            liveState: {},
          },
        ],
      ]),
    };
    memorySessions.set(id, record);
    return res.json({
      id,
      code,
      status: "LOBBY",
      mapId,
      scenarioId,
      createdBy: req.user.id,
      settings: normalizedSettings,
    });
  }

  let code;
  let codeUnique = false;
  for (let i = 0; i < 6; i++) {
    code = generateJoinCode();
    const existing = await timeoutQuery(
      pool.query(
        "SELECT id FROM simulation_sessions WHERE code = $1 AND status != 'ENDED'",
        [code],
      ),
    );
    if (existing.rows.length === 0) {
      codeUnique = true;
      break;
    }
  }
  if (!codeUnique) {
    return res.status(500).json({ error: "Gagal membuat kode room unik" });
  }

  try {
    await timeoutQuery(
      pool.query(
        `
        INSERT INTO simulation_sessions (id, code, school_id, class_id, map_id, scenario_id, created_by, status, settings)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
        [
          id,
          code,
          finalSchoolId,
          classId,
          mapId,
          scenarioId,
          req.user.id,
          "LOBBY",
          JSON.stringify(normalizedSettings),
        ],
      ),
    );

    await timeoutQuery(
      pool.query(
        `
        INSERT INTO simulation_participants (id, session_id, student_id, display_name, status, ready_state, avatar_style, avatar_color)
        VALUES ($1, $2, $3, $4, 'WAITING', true, $5, $6)
        ON CONFLICT (session_id, student_id)
        DO UPDATE SET display_name = EXCLUDED.display_name, ready_state = true, avatar_style = EXCLUDED.avatar_style, avatar_color = EXCLUDED.avatar_color
      `,
        [uuidv4(), id, req.user.id, hostName, safeStyle, safeColor],
      ),
    );

    res.json({
      id,
      code,
      status: "LOBBY",
      mapId,
      scenarioId,
      createdBy: req.user.id,
      settings: normalizedSettings,
    });
  } catch (err) {
    console.error("Create session error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

router.get("/public", verifyToken, async (req, res) => {
  await ensureMultiplayerSchema();
  const { mapId } = req.query;

  if (!pool) {
    const rooms = [...memorySessions.values()]
      .filter(
        (s) =>
          s.status !== "ENDED" &&
          s.settings?.isPublic !== false &&
          (!mapId || s.mapId === mapId),
      )
      .map((s) => ({
        id: s.id,
        code: s.code,
        mapId: s.mapId,
        scenarioId: s.scenarioId,
        scenarioName: getScenarioTitle(s.scenarioId)?.name || s.scenarioId,
        disasterType: getScenarioTitle(s.scenarioId)?.disasterType || "Bencana",
        status: s.status,
        settings: s.settings,
        participantCount: s.participants.size,
        createdAt: s.createdAt,
      }));
    return res.json({ data: rooms });
  }

  try {
    const rowsRes = await timeoutQuery(
      pool.query(
        `
        SELECT
          s.id,
          s.code,
          s.map_id,
          s.scenario_id,
          s.status,
          s.settings,
          s.created_at,
          s.created_by,
          COUNT(p.id)::int AS participant_count
        FROM simulation_sessions s
        LEFT JOIN simulation_participants p ON p.session_id = s.id
        WHERE s.status IN ('LOBBY', 'RUNNING')
          AND s.created_at > NOW() - INTERVAL '6 hours'
          AND ($1::text IS NULL OR s.map_id = $1)
        GROUP BY s.id
        ORDER BY s.created_at DESC
        LIMIT 25
      `,
        [mapId || null],
      ),
    );

    const rooms = rowsRes.rows
      .map((r) => {
        const settings =
          typeof r.settings === "string"
            ? JSON.parse(r.settings || "{}")
            : r.settings || {};
        const meta = getScenarioTitle(r.scenario_id);
        return {
          id: r.id,
          code: r.code,
          mapId: r.map_id,
          scenarioId: r.scenario_id,
          scenarioName: meta?.name || r.scenario_id,
          disasterType: meta?.disasterType || "Simulasi",
          status: r.status,
          settings,
          createdBy: r.created_by,
          participantCount: r.participant_count,
          createdAt: r.created_at,
        };
      })
      .filter((r) => r.settings?.isPublic !== false);

    res.json({ data: rooms });
  } catch (err) {
    console.error("List public sessions error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

router.get("/:idOrCode", verifyToken, async (req, res) => {
  await ensureMultiplayerSchema();
  const { idOrCode } = req.params;

  if (!pool) {
    const found =
      memorySessions.get(idOrCode) ||
      [...memorySessions.values()].find(
        (s) => s.code === idOrCode && s.status !== "ENDED",
      );
    if (!found) return res.status(404).json({ error: "Room tidak ditemukan" });
    return res.json({
      id: found.id,
      code: found.code,
      schoolId: found.schoolId,
      classId: found.classId,
      mapId: found.mapId,
      scenarioId: found.scenarioId,
      createdBy: found.createdBy,
      status: found.status,
      startedAt: found.startedAt,
      settings: found.settings,
    });
  }

  try {
    let query = "SELECT * FROM simulation_sessions WHERE id = $1";
    if (/^\d{6}$/.test(idOrCode)) {
      query =
        "SELECT * FROM simulation_sessions WHERE code = $1 AND status != 'ENDED' ORDER BY created_at DESC LIMIT 1";
    }

    const sessionRes = await timeoutQuery(pool.query(query, [idOrCode]));
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: "Room tidak ditemukan" });
    }

    const session = sessionRes.rows[0];
    const settings =
      typeof session.settings === "string"
        ? JSON.parse(session.settings || "{}")
        : session.settings || {};

    res.json({
      id: session.id,
      code: session.code,
      schoolId: session.school_id,
      classId: session.class_id,
      mapId: session.map_id,
      scenarioId: session.scenario_id,
      createdBy: session.created_by,
      status: session.status,
      startedAt: session.started_at,
      settings,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.post("/:id/join", verifyToken, async (req, res) => {
  await ensureMultiplayerSchema();
  const { id } = req.params;
  const studentId = req.user.id;
  const displayName = req.body?.displayName || req.user.name || "Pemain";
  const avatarStyle = req.body?.avatarStyle === "boy" ? "boy" : "girl";
  const avatarColor =
    typeof req.body?.avatarColor === "string"
      ? req.body.avatarColor
      : "#3b82f6";

  if (!pool) {
    const s = memorySessions.get(id);
    if (!s) return res.status(404).json({ error: "Room tidak ditemukan" });
    if (s.status === "ENDED") {
      return res.status(403).json({ error: "Room sudah berakhir" });
    }
    if (!s.participants.has(studentId)) {
      s.participants.set(studentId, {
        id: uuidv4(),
        studentId,
        displayName,
        status: s.status === "RUNNING" ? "RUNNING" : "WAITING",
        readyState: s.createdBy === studentId,
        avatarStyle,
        avatarColor,
        joinedAt: new Date().toISOString(),
        finishedAt: null,
        finishTimeMs: null,
        score: 0,
        grade: null,
        lastSyncAt: new Date().toISOString(),
        liveState: {},
      });
    }
    return res.json({ success: true, sessionId: id });
  }

  try {
    const sessionRes = await timeoutQuery(
      pool.query("SELECT * FROM simulation_sessions WHERE id = $1", [id]),
    );
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: "Room tidak ditemukan" });
    }
    const session = sessionRes.rows[0];
    const settings =
      typeof session.settings === "string"
        ? JSON.parse(session.settings || "{}")
        : session.settings || {};

    if (session.status === "ENDED") {
      return res.status(403).json({
        error: "SESSION CLOSED",
        message: "Sesi simulasi ini sudah selesai.",
      });
    }

    if (session.status !== "LOBBY" && settings.allowLateJoin === false) {
      return res.status(403).json({
        error: "SESSION CLOSED",
        message: "Simulasi sudah berjalan dan tidak menerima pemain baru.",
      });
    }

    const capacity = settings?.capacity || 35;
    const participantsRes = await timeoutQuery(
      pool.query(
        "SELECT COUNT(*) as count FROM simulation_participants WHERE session_id = $1",
        [id],
      ),
    );
    const currentCount = parseInt(participantsRes.rows[0].count, 10);

    const existing = await timeoutQuery(
      pool.query(
        "SELECT id FROM simulation_participants WHERE session_id = $1 AND student_id = $2",
        [id, studentId],
      ),
    );

    if (existing.rows.length === 0) {
      if (currentCount >= capacity) {
        return res
          .status(403)
          .json({ error: "SESSION FULL", message: "Room sudah penuh." });
      }
      await timeoutQuery(
        pool.query(
          `
          INSERT INTO simulation_participants (id, session_id, student_id, display_name, status, ready_state, avatar_style, avatar_color)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
          [
            uuidv4(),
            id,
            studentId,
            displayName,
            session.status === "RUNNING" ? "RUNNING" : "WAITING",
            false,
            avatarStyle,
            avatarColor,
          ],
        ),
      );
    }

    res.json({ success: true, sessionId: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.post("/:id/ready", verifyToken, async (req, res) => {
  await ensureMultiplayerSchema();
  const { id } = req.params;
  const studentId = req.user.id;
  const { ready, avatarStyle, avatarColor, displayName } = req.body || {};

  if (!pool) {
    const s = memorySessions.get(id);
    const p = s?.participants.get(studentId);
    if (p) {
      if (typeof ready === "boolean") p.readyState = ready;
      if (avatarStyle === "boy" || avatarStyle === "girl") p.avatarStyle = avatarStyle;
      if (typeof avatarColor === "string") p.avatarColor = avatarColor;
      if (typeof displayName === "string" && displayName.trim()) p.displayName = displayName.trim();
    }
    return res.json({ success: true });
  }

  try {
    await timeoutQuery(
      pool.query(
        `
        UPDATE simulation_participants
        SET
          ready_state = COALESCE($1, ready_state),
          avatar_style = COALESCE($2, avatar_style),
          avatar_color = COALESCE($3, avatar_color),
          display_name = COALESCE($4, display_name),
          last_sync_at = CURRENT_TIMESTAMP
        WHERE session_id = $5 AND student_id = $6
      `,
        [
          typeof ready === "boolean" ? ready : null,
          avatarStyle === "boy" || avatarStyle === "girl" ? avatarStyle : null,
          typeof avatarColor === "string" ? avatarColor : null,
          typeof displayName === "string" && displayName.trim()
            ? displayName.trim()
            : null,
          id,
          studentId,
        ],
      ),
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

router.post("/:id/start", verifyToken, async (req, res) => {
  await ensureMultiplayerSchema();
  const { id } = req.params;

  if (!pool) {
    const s = memorySessions.get(id);
    if (!s) return res.status(404).json({ error: "Room tidak ditemukan" });
    if (s.createdBy !== req.user.id && !["teacher", "dev", "developer"].includes(req.user.role)) {
      return res.status(403).json({ error: "Hanya host yang dapat memulai room" });
    }
    s.status = "RUNNING";
    s.startedAt = new Date().toISOString();
    for (const p of s.participants.values()) p.status = "RUNNING";
    return res.json({ success: true, startedAt: s.startedAt });
  }

  try {
    const sessionRes = await timeoutQuery(
      pool.query("SELECT created_by FROM simulation_sessions WHERE id = $1", [
        id,
      ]),
    );
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: "Room tidak ditemukan" });
    }
    if (
      sessionRes.rows[0].created_by !== req.user.id &&
      !["teacher", "dev", "developer"].includes(req.user.role)
    ) {
      return res.status(403).json({ error: "Hanya host yang dapat memulai room" });
    }

    const startRes = await timeoutQuery(
      pool.query(
        "UPDATE simulation_sessions SET status = 'RUNNING', started_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING started_at",
        [id],
      ),
    );
    await timeoutQuery(
      pool.query(
        `
        UPDATE simulation_participants
        SET status = 'RUNNING', finished_at = NULL, finish_time_ms = NULL, score = 0, grade = NULL, live_state = '{}'::jsonb
        WHERE session_id = $1
      `,
        [id],
      ),
    );

    try {
      getIO();
      await initGameSession(id);
    } catch {
      // Serverless / HTTP-only sync runs cleanly without local Socket.IO
    }

    res.json({ success: true, startedAt: startRes.rows[0]?.started_at });
  } catch (err) {
    console.error("Start session error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

router.post("/:id/restart", verifyToken, async (req, res) => {
  await ensureMultiplayerSchema();
  const { id } = req.params;

  if (!pool) {
    const s = memorySessions.get(id);
    if (!s) return res.status(404).json({ error: "Room tidak ditemukan" });
    s.status = "LOBBY";
    s.startedAt = null;
    for (const p of s.participants.values()) {
      p.status = "WAITING";
      p.finishedAt = null;
      p.finishTimeMs = null;
      p.score = 0;
      p.grade = null;
      p.liveState = {};
    }
    return res.json({ success: true });
  }

  try {
    const sessionRes = await timeoutQuery(
      pool.query("SELECT created_by, settings FROM simulation_sessions WHERE id = $1", [id]),
    );
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: "Room tidak ditemukan" });
    }
    if (
      sessionRes.rows[0].created_by !== req.user.id &&
      !["teacher", "dev", "developer"].includes(req.user.role)
    ) {
      return res.status(403).json({ error: "Hanya host yang dapat mereset room" });
    }

    const prevSettings =
      typeof sessionRes.rows[0].settings === "string"
        ? JSON.parse(sessionRes.rows[0].settings || "{}")
        : sessionRes.rows[0].settings || {};
    prevSettings.openDoors = [];

    await timeoutQuery(
      pool.query(
        "UPDATE simulation_sessions SET status = 'LOBBY', started_at = NULL, settings = $2 WHERE id = $1",
        [id, JSON.stringify(prevSettings)],
      ),
    );
    await timeoutQuery(
      pool.query(
        `
        UPDATE simulation_participants
        SET status = 'WAITING', finished_at = NULL, finish_time_ms = NULL, score = 0, grade = NULL, live_state = '{}'::jsonb
        WHERE session_id = $1
      `,
        [id],
      ),
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

router.post("/:id/leave", verifyToken, async (req, res) => {
  const { id } = req.params;
  const studentId = req.user.id;

  if (!pool) {
    memorySessions.get(id)?.participants.delete(studentId);
    return res.json({ success: true });
  }

  try {
    await timeoutQuery(
      pool.query(
        "DELETE FROM simulation_participants WHERE session_id = $1 AND student_id = $2",
        [id, studentId],
      ),
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

router.post("/:id/end", verifyToken, async (req, res) => {
  const { id } = req.params;

  if (!pool) {
    const s = memorySessions.get(id);
    if (!s) return res.status(404).json({ error: "Room tidak ditemukan" });
    s.status = "ENDED";
    return res.json({ success: true });
  }

  try {
    const sessionRes = await timeoutQuery(
      pool.query("SELECT created_by FROM simulation_sessions WHERE id = $1", [
        id,
      ]),
    );
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: "Room tidak ditemukan" });
    }
    if (
      sessionRes.rows[0].created_by !== req.user.id &&
      !["teacher", "dev", "developer"].includes(req.user.role)
    ) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await timeoutQuery(
      pool.query(
        "UPDATE simulation_sessions SET status = 'ENDED', ended_at = CURRENT_TIMESTAMP WHERE id = $1",
        [id],
      ),
    );

    endGameSession(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

router.get("/:id/participants", verifyToken, async (req, res) => {
  await ensureMultiplayerSchema();
  const { id } = req.params;

  if (!pool) {
    const s = memorySessions.get(id);
    if (!s) return res.status(404).json({ error: "Room tidak ditemukan" });
    const list = [...s.participants.values()];
    return res.json({
      participants: list,
      leaderboard: sortCompetitiveLeaderboard(list),
      sessionStatus: s.status,
      startedAt: s.startedAt,
      settings: s.settings,
      createdBy: s.createdBy,
      code: s.code,
    });
  }

  try {
    const participants = await timeoutQuery(
      pool.query(
        `
        SELECT id, student_id, display_name, status, ready_state, avatar_style, avatar_color,
               joined_at, finished_at, finish_time_ms, score, grade, last_sync_at, live_state
        FROM simulation_participants
        WHERE session_id = $1
        ORDER BY joined_at ASC
      `,
        [id],
      ),
    );

    const session = await timeoutQuery(
      pool.query(
        "SELECT status, started_at, settings, created_by, code FROM simulation_sessions WHERE id = $1",
        [id],
      ),
    );

    if (session.rows.length === 0) {
      return res.status(404).json({ error: "Room tidak ditemukan" });
    }

    const row = session.rows[0];
    const parsedSettings =
      typeof row.settings === "string"
        ? JSON.parse(row.settings || "{}")
        : row.settings || {};
    const list = participants.rows.map(serializeParticipantRow);

    res.json({
      participants: list,
      leaderboard: sortCompetitiveLeaderboard(list),
      sessionStatus: row.status,
      startedAt: row.started_at,
      settings: parsedSettings,
      createdBy: row.created_by,
      code: row.code,
    });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

// High-frequency live multiplayer state sync (compatible with serverless polling & local hybrid)
router.post("/:id/sync", verifyToken, async (req, res) => {
  await ensureMultiplayerSchema();
  const { id } = req.params;
  const studentId = req.user.id;
  const {
    x,
    y,
    floorId,
    direction,
    hp,
    alive,
    moving,
    sprinting,
    displayName,
    avatarStyle,
    avatarColor,
    finished,
    finishTimeMs,
    score,
    grade,
    openedDoorIds,
  } = req.body || {};

  const safeLive = {
    x: typeof x === "number" && isFinite(x) ? Math.round(x * 10) / 10 : undefined,
    y: typeof y === "number" && isFinite(y) ? Math.round(y * 10) / 10 : undefined,
    floorId: typeof floorId === "string" ? floorId : undefined,
    direction: ["up", "down", "left", "right"].includes(direction)
      ? direction
      : "down",
    hp: typeof hp === "number" && isFinite(hp) ? Math.max(0, Math.round(hp)) : 100,
    alive: typeof alive === "boolean" ? alive : true,
    moving: Boolean(moving),
    sprinting: Boolean(sprinting),
  };

  if (!pool) {
    const s = memorySessions.get(id);
    if (!s) return res.status(404).json({ error: "Room tidak ditemukan" });
    let p = s.participants.get(studentId);
    if (!p) {
      p = {
        id: uuidv4(),
        studentId,
        displayName: displayName || req.user.name || "Pemain",
        status: s.status === "RUNNING" ? "RUNNING" : "WAITING",
        readyState: true,
        avatarStyle: avatarStyle === "boy" ? "boy" : "girl",
        avatarColor: typeof avatarColor === "string" ? avatarColor : "#3b82f6",
        joinedAt: new Date().toISOString(),
        finishedAt: null,
        finishTimeMs: null,
        score: 0,
        grade: null,
        lastSyncAt: new Date().toISOString(),
        liveState: {},
      };
      s.participants.set(studentId, p);
    }
    p.liveState = { ...p.liveState, ...safeLive };
    p.lastSyncAt = new Date().toISOString();
    if (finished && !p.finishedAt) {
      p.finishedAt = p.lastSyncAt;
      p.finishTimeMs = typeof finishTimeMs === "number" ? Math.round(finishTimeMs) : null;
      p.score = typeof score === "number" ? Math.round(score) : 0;
      p.grade = typeof grade === "string" ? grade : "C";
      p.status = "FINISHED";
    }
    const list = [...s.participants.values()];
    return res.json({
      sessionStatus: s.status,
      serverNowMs: Date.now(),
      startedAt: s.startedAt,
      settings: s.settings,
      players: list,
      leaderboard: sortCompetitiveLeaderboard(list),
    });
  }

  try {
    const sessionRes = await timeoutQuery(
      pool.query(
        "SELECT id, status, started_at, settings, created_by FROM simulation_sessions WHERE id = $1",
        [id],
      ),
    );
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: "Room tidak ditemukan" });
    }
    const session = sessionRes.rows[0];
    const settings =
      typeof session.settings === "string"
        ? JSON.parse(session.settings || "{}")
        : session.settings || {};

    if (Array.isArray(openedDoorIds) && openedDoorIds.length > 0) {
      const merged = new Set([...(settings.openDoors || []), ...openedDoorIds]);
      if (merged.size > (settings.openDoors || []).length) {
        settings.openDoors = [...merged];
        await timeoutQuery(
          pool.query("UPDATE simulation_sessions SET settings = $2 WHERE id = $1", [
            id,
            JSON.stringify(settings),
          ]),
        );
      }
    }

    const safeName =
      typeof displayName === "string" && displayName.trim()
        ? displayName.trim().slice(0, 60)
        : req.user.name || "Pemain";
    const safeStyle = avatarStyle === "boy" ? "boy" : "girl";
    const safeColor =
      typeof avatarColor === "string" ? avatarColor : "#3b82f6";

    await timeoutQuery(
      pool.query(
        `
        INSERT INTO simulation_participants (
          id, session_id, student_id, display_name, status, ready_state,
          avatar_style, avatar_color, live_state, last_sync_at
        )
        VALUES ($1, $2, $3, $4, 'RUNNING', true, $5, $6, $7, CURRENT_TIMESTAMP)
        ON CONFLICT (session_id, student_id)
        DO UPDATE SET
          display_name = COALESCE(NULLIF($4, ''), simulation_participants.display_name),
          avatar_style = COALESCE($5, simulation_participants.avatar_style),
          avatar_color = COALESCE($6, simulation_participants.avatar_color),
          live_state = COALESCE(simulation_participants.live_state, '{}'::jsonb) || $7::jsonb,
          last_sync_at = CURRENT_TIMESTAMP,
          status = CASE WHEN $8 THEN 'FINISHED' ELSE simulation_participants.status END,
          finished_at = CASE WHEN $8 AND simulation_participants.finished_at IS NULL THEN CURRENT_TIMESTAMP ELSE simulation_participants.finished_at END,
          finish_time_ms = CASE WHEN $8 AND simulation_participants.finish_time_ms IS NULL THEN $9 ELSE simulation_participants.finish_time_ms END,
          score = CASE WHEN $8 THEN GREATEST(COALESCE(simulation_participants.score, 0), $10) ELSE simulation_participants.score END,
          grade = COALESCE(simulation_participants.grade, $11)
      `,
        [
          uuidv4(),
          id,
          studentId,
          safeName,
          safeStyle,
          safeColor,
          JSON.stringify(safeLive),
          Boolean(finished),
          typeof finishTimeMs === "number" ? Math.round(finishTimeMs) : null,
          typeof score === "number" ? Math.round(score) : 0,
          finished && typeof grade === "string" ? grade : null,
        ],
      ),
    );

    const allRes = await timeoutQuery(
      pool.query(
        `
        SELECT id, student_id, display_name, status, ready_state, avatar_style, avatar_color,
               joined_at, finished_at, finish_time_ms, score, grade, last_sync_at, live_state
        FROM simulation_participants
        WHERE session_id = $1
        ORDER BY joined_at ASC
      `,
        [id],
      ),
    );

    const list = allRes.rows.map(serializeParticipantRow);
    res.json({
      sessionStatus: session.status,
      serverNowMs: Date.now(),
      startedAt: session.started_at,
      settings,
      players: list,
      leaderboard: sortCompetitiveLeaderboard(list),
    });
  } catch (err) {
    console.error("Sync session error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
