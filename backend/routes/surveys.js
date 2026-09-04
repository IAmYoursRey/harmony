import express from 'express';
import { readDB, writeDB } from '../repository.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * GET /api/surveys
 * Returns aggregated survey statistics for the authenticated user's school.
 * Requires auth.
 */
router.get('/', verifyToken, (req, res) => {
  const db = readDB();
  const surveys = db.surveys || [];
  const schoolId = req.query.schoolId;

  const filtered = schoolId
    ? surveys.filter(s => s.schoolId === schoolId)
    : surveys;

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
  const totalScore = filtered.reduce((sum, s) => sum + (s.score ?? 0), 0);
  const averageScore = Math.round(totalScore / totalRespondents);
  const completed = filtered.filter(s => s.completed).length;
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
router.post('/', verifyToken, (req, res) => {
  const { schoolId, answers, score } = req.body;

  if (!schoolId || !answers || typeof answers !== 'object') {
    return res.status(400).json({ error: 'Missing required fields: schoolId, answers' });
  }

  const db = readDB();
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
  writeDB(db);

  res.json({ success: true, survey: entry });
});

export default router;
