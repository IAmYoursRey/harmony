import express from 'express';
import { readDB, writeDB } from '../repository.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { getBaseSchools } from './schools.js';

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  const db = await readDB();
  const profile = db.profiles.find(p => p.userId === req.user.id);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json({ profile });
});

router.post('/', verifyToken, async (req, res) => {
  const db = await readDB();
  const index = db.profiles.findIndex(p => p.userId === req.user.id);
  
  // Extract schoolId to prevent arbitrary modification
  const { schoolId, ...safeBody } = req.body;
  
  // Create or Update
  if (index === -1) {
    const newProfile = { ...safeBody, userId: req.user.id, lastUpdated: new Date().toISOString() };
    db.profiles.push(newProfile);
    await writeDB(db);
    return res.json({ profile: newProfile });
  } else {
    db.profiles[index] = { ...db.profiles[index], ...safeBody, lastUpdated: new Date().toISOString() };
    await writeDB(db);
    return res.json({ profile: db.profiles[index] });
  }
});

// GET all profiles (used by leaderboard — requires auth to prevent unauthenticated data scraping)
router.get('/all', verifyToken, async (req, res) => {
  const db = await readDB();
  const schools = await getBaseSchools();
  
  const enrichedProfiles = db.profiles.map(p => {
    const school = p.schoolId && p.schoolId !== 'unknown' 
      ? schools.find(s => s.id === p.schoolId || s.school_id === p.schoolId)
      : null;
      
    return {
      ...p,
      schoolName: school ? (school.name || school.school_name) : p.schoolId,
      province: school ? school.province : 'Unknown',
      regency: school ? school.regency : 'Unknown'
    };
  });
  
  // Don't send sensitive info, just what's needed for leaderboard
  res.json({ profiles: enrichedProfiles });
});

// GET all accounts (for names/roles in leaderboard — requires auth)
router.get('/accounts', verifyToken, async (req, res) => {
  const db = await readDB();
  const safeAccounts = db.accounts.map(a => ({
    id: a.id,
    name: a.name,
    role: a.role
  }));
  res.json({ accounts: safeAccounts });
});

export default router;
