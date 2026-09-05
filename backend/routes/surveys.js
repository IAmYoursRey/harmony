import express from 'express';
import { readDB, writeDB } from '../repository.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * GET /api/surveys
 * Returns aggregated survey statistics for the authenticated user's school.
 * Requires auth.
 */
router.get('/', verifyToken, async (req, res) => {
  const db = await readDB();
  const surveys = db.surveys || [];
  const schoolId = req.query.schoolId;
  const classId = req.query.classId;

  let filtered = surveys;

  if (classId) {
    const classProfiles = db.profiles.filter(p => p.classId === classId);
    const studentIds = classProfiles.map(p => p.userId);
    filtered = filtered.filter(s => studentIds.includes(s.userId));
  } else if (schoolId) {
    filtered = filtered.filter(s => s.schoolId === schoolId);
  }

  if (filtered.length === 0) {
    return res.json({
      surveys: [],
      stats: {
        totalRespondents: 0,
        averageScore: 0,
        completionRate: 0,
        totalSurveys: 0,
      },
    });
  }

  const totalRespondents = filtered.length;
  // Compute score from responses[] if explicit score field is absent (seeded/legacy surveys).
  // For 5-point rating scale: average value × 20 = 0–100 scale.
  const totalScore = filtered.reduce((sum, s) => {
    if (s.score != null) return sum + s.score;
    if (Array.isArray(s.responses) && s.responses.length > 0) {
      const avg = s.responses.reduce((a, r) => a + (r.value || 0), 0) / s.responses.length;
      return sum + Math.round(avg * 20);
    }
    return sum;
  }, 0);
  const averageScore = Math.round(totalScore / totalRespondents);
  // Treat submittedAt as completion indicator for surveys without explicit `completed` field.
  const completed = filtered.filter(s => s.completed || s.submittedAt).length;
  const completionRate = Math.round((completed / totalRespondents) * 100);

  res.json({
    surveys: filtered,
    stats: {
      totalRespondents,
      averageScore,
      completionRate,
      totalSurveys: filtered.length,
    },
  });
});

/**
 * POST /api/surveys
 * Submit a new survey response. Requires auth.
 * Body: { schoolId, answers: Record<string, number>, score?: number }
 */
router.post('/', verifyToken, async (req, res) => {
  const { schoolId, answers, score } = req.body;

  if (!schoolId || !answers || typeof answers !== 'object') {
    return res.status(400).json({ error: 'Missing required fields: schoolId, answers' });
  }

  const db = await readDB();
  if (!db.surveys) db.surveys = [];

  // Prevent duplicate submission per user per school
  const existing = db.surveys.find(s => s.userId === req.user.id && s.schoolId === schoolId);
  if (existing) {
    return res.status(409).json({ error: 'Survey already submitted for this school' });
  }

  const entry = {
    id: `survey-${Date.now()}`,
    userId: req.user.id,
    schoolId,
    answers,
    score: score ?? null,
    completed: true,
    submittedAt: new Date().toISOString(),
  };

  db.surveys.push(entry);
  await writeDB(db);

  res.json({ success: true, survey: entry });
});

export default router;
