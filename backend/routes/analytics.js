import express from 'express';
import { readDB } from '../repository.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

function getCallerSchoolId(db, userId) {
  const profile = db.profiles.find(p => p.userId === userId);
  return profile?.schoolId || null;
}

// GET /api/analytics/system
// Dev only
router.get('/system', verifyToken, async (req, res) => {
  if (req.user.role !== 'dev') {
    return res.status(403).json({ error: 'Access denied' });
  }

  const db = await readDB();
  
  const totalUsers = db.accounts?.length || 0;
  const teachers = db.accounts?.filter(a => a.role === 'teacher').length || 0;
  const students = db.accounts?.filter(a => a.role === 'student').length || 0;
  const schools = db.schools?.length || 0;
  
  const totalSimulations = Object.keys(db.simulations || {}).length;
  const totalRooms = Object.keys(db.dtRooms || {}).length;
  const totalAttempts = db.dtResults?.length || 0;

  res.json({
    success: true,
    data: {
      totalUsers,
      teachers,
      students,
      schools,
      totalSimulations,
      totalRooms,
      totalAttempts
    }
  });
});

// GET /api/analytics/class
// Teacher only
router.get('/class', verifyToken, async (req, res) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'dev') {
    return res.status(403).json({ error: 'Access denied' });
  }

  const db = await readDB();
  const callerSchoolId = getCallerSchoolId(db, req.user.id);

  if (!callerSchoolId) {
    return res.status(403).json({ error: 'Not assigned to a school' });
  }

  const classId = req.query.classId || '';
  const classSection = req.query.classSection || '';
  const grade = req.query.grade || '';

  // Get all students in the specific class
  const classProfiles = db.profiles.filter(p => 
    p.schoolId === callerSchoolId && 
    (classId ? p.classId === classId : (grade ? p.grade === grade : true)) &&
    (classSection ? p.classSection === classSection : true)
  );

  const studentIds = classProfiles.map(p => p.userId);
  
  // Get their safe accounts for names
  const studentAccounts = db.accounts.filter(a => studentIds.includes(a.id)).map(a => ({
    id: a.id,
    name: a.name,
    email: a.email
  }));

  // Get results strictly for these students
  const results = (db.dtResults || []).filter(r => studentIds.includes(r.userId));

  // Compute Analytics
  let completed = 0;
  let failed = 0;
  let totalScore = 0;
  let totalTime = 0;
  let attemptsWithTime = 0;

  const studentStats = {};

  studentAccounts.forEach(sa => {
    studentStats[sa.id] = {
      id: sa.id,
      name: sa.name,
      attempts: 0,
      completed: 0,
      failed: 0,
      averageScore: 0,
      averageTime: 0,
      totalHazards: 0
    };
  });

  results.forEach(r => {
    if (!studentStats[r.userId]) return; // Should not happen but just in case
    
    const stats = studentStats[r.userId];
    stats.attempts++;

    // Calculate score proxy from HP (temporary logic: score = HP)
    const score = r.hpRemaining || 0;
    
    // Outcome tracking
    if (r.outcome === 'WIN' || r.outcome === 'COMPLETED') {
      completed++;
      stats.completed++;
    } else {
      failed++;
      stats.failed++;
    }

    totalScore += score;
    stats.averageScore += score;
    
    if (r.completionTimeSeconds) {
      totalTime += r.completionTimeSeconds;
      attemptsWithTime++;
      stats.averageTime += r.completionTimeSeconds;
    }

    stats.totalHazards += (r.hazardsEncountered?.length || 0);

    // Hazard type breakdown
    if (r.hazardsEncountered) {
      r.hazardsEncountered.forEach(hz => {
        if (!stats.hazardScores) stats.hazardScores = {};
        if (!stats.hazardScores[hz]) stats.hazardScores[hz] = { score: 0, count: 0 };
        // Assuming 100 points base per hazard minus some penalty, for now proxy via HP
        stats.hazardScores[hz].score += score;
        stats.hazardScores[hz].count += 1;
      });
    }
  });

  // Finalize averages
  Object.values(studentStats).forEach(s => {
    if (s.attempts > 0) {
      s.averageScore = Math.round(s.averageScore / s.attempts);
      s.averageTime = Math.round(s.averageTime / s.attempts);
    }
  });

  const averageScore = results.length > 0 ? Math.round(totalScore / results.length) : 0;
  const averageTime = attemptsWithTime > 0 ? Math.round(totalTime / attemptsWithTime) : 0;

  // Compute Radar and Bar data (class level)
  const classHazardScores = {};
  Object.values(studentStats).forEach(s => {
    if (s.hazardScores) {
      Object.keys(s.hazardScores).forEach(hz => {
        if (!classHazardScores[hz]) classHazardScores[hz] = { score: 0, count: 0 };
        classHazardScores[hz].score += s.hazardScores[hz].score;
        classHazardScores[hz].count += s.hazardScores[hz].count;
      });
    }
  });

  const radarData = Object.keys(classHazardScores).map(hz => ({
    subjectKey: `disaster.${hz.toLowerCase()}`,
    class: Math.round(classHazardScores[hz].score / classHazardScores[hz].count)
  }));
  const barData = radarData.map(r => ({ nameKey: r.subjectKey, score: r.class }));

  res.json({
    success: true,
    data: {
      overview: {
        totalStudents: studentIds.length,
        totalAttempts: results.length,
        completed,
        failed,
        averageScore,
        averageTime
      },
      students: Object.values(studentStats),
      radarData: radarData.length > 0 ? radarData : null,
      barData: barData.length > 0 ? barData : null
    }
  });
});

export default router;
