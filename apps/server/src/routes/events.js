import express from "express";
import { readDB, saveEvent, removeEvent, saveProfile } from "../repositories/repository.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

function requireTeacherOrDev(req, res) {
  const role = req.user?.role;
  if (role !== "teacher" && role !== "developer" && role !== "dev") {
    res.status(403).json({ error: "Only teachers and developers can modify events" });
    return false;
  }
  return true;
}

const DEFAULT_EVENTS = [
  {
    id: "evt-global-earthquake-2026",
    title: "International Disaster Resilience Sprint",
    description:
      "Global inter-school evacuation simulation & decision-making challenge. Evacuate safely under critical seismic shaking with maximum remaining health!",
    type: "game",
    scenarioOrTopic: "Earthquake Evacuation Simulator",
    pointsReward: 250,
    startDate: "2026-09-01T00:00:00.000Z",
    endDate: "2026-10-31T23:59:59.000Z",
    status: "active",
    createdBy: {
      id: "usr-dev-admin",
      name: "Harmony Global Council",
      role: "developer",
      schoolName: "Harmony Research & Development",
    },
    participants: [
      {
        userId: "usr-demo-student-1",
        name: "Siti Rahmawati",
        role: "student",
        schoolName: "SMA Negeri 1 Ngoro",
        score: 96,
        pointsEarned: 240,
        completedAt: "2026-09-12T10:15:00.000Z",
        isTeacher: false,
      },
      {
        userId: "usr-demo-student-2",
        name: "Ahmad Farhan",
        role: "student",
        schoolName: "SMA Negeri 2 Mojokerto",
        score: 92,
        pointsEarned: 230,
        completedAt: "2026-09-13T14:20:00.000Z",
        isTeacher: false,
      },
      {
        userId: "usr-demo-teacher-1",
        name: "Budi Santoso, S.Pd",
        role: "teacher",
        schoolName: "SMA Negeri 1 Ngoro",
        score: 100,
        pointsEarned: 0,
        completedAt: "2026-09-10T08:00:00.000Z",
        isTeacher: true,
        title: "Certified Safety Coach",
      },
    ],
    createdAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "evt-coastal-tsunami-quiz",
    title: "Pacific Ring of Fire: Disaster IQ Challenge",
    description:
      "Comprehensive multi-disaster hazard identification question tournament open to all schools worldwide. Test rapid safety decision skills.",
    type: "quiz",
    scenarioOrTopic: "Tsunami Early Warning & Evacuation Drill",
    pointsReward: 150,
    startDate: "2026-09-10T00:00:00.000Z",
    endDate: "2026-10-15T23:59:59.000Z",
    status: "active",
    createdBy: {
      id: "usr-dev-admin",
      name: "Disaster Risk Committee",
      role: "developer",
      schoolName: "SMA Negeri 1 Ngoro",
    },
    participants: [
      {
        userId: "usr-demo-student-3",
        name: "Jessica Putri",
        role: "student",
        schoolName: "SMA Negeri 1 Surabaya",
        score: 90,
        pointsEarned: 135,
        completedAt: "2026-09-14T09:30:00.000Z",
        isTeacher: false,
      },
    ],
    createdAt: "2026-09-10T00:00:00.000Z",
  },
];

// GET /api/events - List all events
router.get("/", verifyToken, async (req, res) => {
  try {
    const db = await readDB();
    let events = db.events || [];
    if (events.length === 0) {
      events = [...DEFAULT_EVENTS];
      for (const evt of events) {
        await saveEvent(evt);
      }
    }
    res.json({ data: events });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// GET /api/events/:id - Get event by ID
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const db = await readDB();
    const event = (db.events || []).find((e) => e.id === req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json({ data: event });
  } catch (error) {
    console.error("Error fetching event:", error);
    res.status(500).json({ error: "Failed to fetch event" });
  }
});

// POST /api/events - Create new event (Teacher & Dev only)
router.post("/", verifyToken, async (req, res) => {
  try {
    if (!requireTeacherOrDev(req, res)) return;

    const {
      title,
      description,
      type = "game",
      scenarioOrTopic,
      pointsReward = 200,
      startDate,
      endDate,
      status = "active",
      mapId,
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Event title is required" });
    }

    const db = await readDB();
    const profile = (db.profiles || []).find((p) => p.userId === req.user.id);

    const newEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: title.trim(),
      description: description?.trim() || "",
      type: type === "quiz" ? "quiz" : "game",
      scenarioOrTopic: scenarioOrTopic?.trim() || (type === "quiz" ? "Disaster Questions" : "Harmony Twin Simulator"),
      pointsReward: Number(pointsReward) || 200,
      startDate: startDate || new Date().toISOString(),
      endDate: endDate || new Date(Date.now() + 30 * 86400000).toISOString(),
      status: status || "active",
      mapId: mapId || null,
      createdBy: {
        id: req.user.id,
        name: profile?.name || req.user.name || "Teacher",
        role: req.user.role,
        schoolName: profile?.schoolName || "School",
      },
      participants: [],
      createdAt: new Date().toISOString(),
    };

    await saveEvent(newEvent);
    res.status(201).json({ data: newEvent, message: "Event created successfully" });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ error: "Failed to create event" });
  }
});

// PUT /api/events/:id - Update event (Teacher & Dev only)
router.put("/:id", verifyToken, async (req, res) => {
  try {
    if (!requireTeacherOrDev(req, res)) return;

    const db = await readDB();
    const event = (db.events || []).find((e) => e.id === req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });

    const {
      title,
      description,
      type,
      scenarioOrTopic,
      pointsReward,
      startDate,
      endDate,
      status,
      mapId,
    } = req.body;

    if (title !== undefined) event.title = title.trim();
    if (description !== undefined) event.description = description.trim();
    if (type !== undefined) event.type = type;
    if (scenarioOrTopic !== undefined) event.scenarioOrTopic = scenarioOrTopic.trim();
    if (pointsReward !== undefined) event.pointsReward = Number(pointsReward);
    if (startDate !== undefined) event.startDate = startDate;
    if (endDate !== undefined) event.endDate = endDate;
    if (status !== undefined) event.status = status;
    if (mapId !== undefined) event.mapId = mapId;
    event.updatedAt = new Date().toISOString();

    await saveEvent(event);
    res.json({ data: event, message: "Event updated successfully" });
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ error: "Failed to update event" });
  }
});

// DELETE /api/events/:id - Delete event (Teacher & Dev only)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    if (!requireTeacherOrDev(req, res)) return;

    const { id } = req.params;
    await removeEvent(id);
    res.json({ success: true, message: "Event deleted successfully" });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ error: "Failed to delete event" });
  }
});

// POST /api/events/:id/participate - Join / Complete event challenge
router.post("/:id/participate", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { score = 100 } = req.body;
    const db = await readDB();

    const event = (db.events || []).find((e) => e.id === id);
    if (!event) return res.status(404).json({ error: "Event not found" });

    const profile = (db.profiles || []).find((p) => p.userId === req.user.id);
    const role = req.user.role || "student";
    const isTeacher = role === "teacher";

    if (!event.participants) event.participants = [];

    const existingIndex = event.participants.findIndex((p) => p.userId === req.user.id);

    let pointsEarned = 0;
    if (!isTeacher) {
      const normalizedScore = Math.max(0, Math.min(100, Number(score) || 0));
      pointsEarned = Math.round((event.pointsReward || 200) * (normalizedScore / 100));

      if (profile) {
        profile.totalPoints = (profile.totalPoints || 0) + pointsEarned;
        profile.xp = (profile.xp || 0) + pointsEarned;
        await saveProfile(profile);
      }
    }

    const participantEntry = {
      userId: req.user.id,
      name: profile?.name || req.user.name || (isTeacher ? "Teacher" : "Student"),
      role,
      schoolName: profile?.schoolName || "School",
      score: Number(score) || 100,
      pointsEarned,
      completedAt: new Date().toISOString(),
      isTeacher,
      title: isTeacher ? "Teacher Participant" : undefined,
    };

    if (existingIndex >= 0) {
      event.participants[existingIndex] = participantEntry;
    } else {
      event.participants.push(participantEntry);
    }

    await saveEvent(event);

    res.json({
      success: true,
      message: isTeacher
        ? "Teacher participation recorded in showcase (excluded from student leaderboard)."
        : `Challenge completed! You earned ${pointsEarned} points.`,
      participant: participantEntry,
      newTotalPoints: profile?.totalPoints,
    });
  } catch (error) {
    console.error("Error participating in event:", error);
    res.status(500).json({ error: "Failed to submit event participation" });
  }
});

export default router;
