import express from "express";
import { v4 as uuidv4 } from "uuid";
import { pool, timeoutQuery } from "../repositories/repository.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { initGameSession, endGameSession } from "../game/gameManager.js";

const router = express.Router();

function generateJoinCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

router.post("/", verifyToken, async (req, res) => {
  if (req.user.role !== "teacher" && req.user.role !== "dev" && req.user.role !== "developer") {
    return res.status(403).json({ error: "Only teachers can create sessions" });
  }
  const { schoolId, classId, mapId, scenarioId, settings } = req.body;
  if (!classId || !mapId || !scenarioId)
    return res.status(400).json({ error: "Missing required fields" });

  const finalSchoolId = schoolId || "unknown";
  const id = uuidv4();
  let code;
  let codeUnique = false;

  for (let i = 0; i < 5; i++) {
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
  if (!codeUnique)
    return res
      .status(500)
      .json({ error: "Failed to generate unique join code" });

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
          JSON.stringify(settings || {}),
        ],
      ),
    );

    res.json({ id, code, status: "LOBBY", mapId, scenarioId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.get("/:idOrCode", verifyToken, async (req, res) => {
  try {
    const { idOrCode } = req.params;
    let query = "SELECT * FROM simulation_sessions WHERE id = $1";
    if (/^\d{6}$/.test(idOrCode)) {
      query =
        "SELECT * FROM simulation_sessions WHERE code = $1 AND status != 'ENDED' ORDER BY created_at DESC LIMIT 1";
    }

    const sessionRes = await timeoutQuery(pool.query(query, [idOrCode]));
    if (sessionRes.rows.length === 0)
      return res.status(404).json({ error: "Session not found" });

    const session = sessionRes.rows[0];
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
      settings: session.settings,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.post("/:id/join", verifyToken, async (req, res) => {
  const { id } = req.params;
  const studentId = req.user.id;
  const displayName = req.body.displayName || req.user.name || "Student";

  try {
    const sessionRes = await timeoutQuery(
      pool.query("SELECT * FROM simulation_sessions WHERE id = $1", [id]),
    );
    if (sessionRes.rows.length === 0)
      return res.status(404).json({ error: "Session not found" });
    const session = sessionRes.rows[0];

    if (session.status !== "LOBBY") {
      return res.status(403).json({
        error: "SESSION CLOSED",
        message: "This simulation is no longer accepting participants.",
      });
    }

    const capacity = session.settings?.capacity || 35;
    const participantsRes = await timeoutQuery(
      pool.query(
        "SELECT COUNT(*) as count FROM simulation_participants WHERE session_id = $1",
        [id],
      ),
    );
    const currentCount = parseInt(participantsRes.rows[0].count);

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
          .json({ error: "SESSION FULL", message: "This simulation is full." });
      }
      const participantId = uuidv4();
      await timeoutQuery(
        pool.query(
          `
        INSERT INTO simulation_participants (id, session_id, student_id, display_name, status, ready_state)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
          [participantId, id, studentId, displayName, "WAITING", false],
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
  const { id } = req.params;
  const studentId = req.user.id;
  const { ready } = req.body;

  try {
    await timeoutQuery(
      pool.query(
        "UPDATE simulation_participants SET ready_state = $1 WHERE session_id = $2 AND student_id = $3",
        [ready, id, studentId],
      ),
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

router.post("/:id/start", verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const sessionRes = await timeoutQuery(
      pool.query("SELECT created_by FROM simulation_sessions WHERE id = $1", [
        id,
      ]),
    );
    if (sessionRes.rows.length === 0)
      return res.status(404).json({ error: "Session not found" });
    if (
      sessionRes.rows[0].created_by !== req.user.id &&
      req.user.role !== "dev"
    ) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await timeoutQuery(
      pool.query(
        "UPDATE simulation_sessions SET status = 'RUNNING', started_at = CURRENT_TIMESTAMP WHERE id = $1",
        [id],
      ),
    );
    await timeoutQuery(
      pool.query(
        "UPDATE simulation_participants SET status = 'RUNNING' WHERE session_id = $1",
        [id],
      ),
    );

    await initGameSession(id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

router.post("/:id/leave", verifyToken, async (req, res) => {
  const { id } = req.params;
  const studentId = req.user.id;

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
  try {
    const sessionRes = await timeoutQuery(
      pool.query("SELECT created_by FROM simulation_sessions WHERE id = $1", [
        id,
      ]),
    );
    if (sessionRes.rows.length === 0)
      return res.status(404).json({ error: "Session not found" });
    if (
      sessionRes.rows[0].created_by !== req.user.id &&
      req.user.role !== "dev"
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
  const { id } = req.params;
  try {
    const participants = await timeoutQuery(
      pool.query(
        `
      SELECT id, student_id as "studentId", display_name as "displayName", status, ready_state as "readyState", joined_at as "joinedAt"
      FROM simulation_participants WHERE session_id = $1 ORDER BY joined_at ASC
    `,
        [id],
      ),
    );

    const session = await timeoutQuery(
      pool.query(
        'SELECT status, started_at as "startedAt" FROM simulation_sessions WHERE id = $1',
        [id],
      ),
    );

    res.json({
      participants: participants.rows,
      sessionStatus:
        session.rows.length > 0 ? session.rows[0].status : "UNKNOWN",
      startedAt: session.rows.length > 0 ? session.rows[0].startedAt : null,
    });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
