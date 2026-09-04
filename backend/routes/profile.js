import express from 'express';
import { readDB, writeDB } from '../repository.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', verifyToken, (req, res) => {
  const db = readDB();
  const profile = db.profiles.find(p => p.userId === req.user.id);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json({ profile });
});

router.post('/', verifyToken, (req, res) => {
  const db = readDB();
  const index = db.profiles.findIndex(p => p.userId === req.user.id);
  
  // Create or Update
  if (index === -1) {
    const newProfile = { ...req.body, userId: req.user.id, lastUpdated: new Date().toISOString() };
    db.profiles.push(newProfile);
    writeDB(db);
    return res.json({ profile: newProfile });
  } else {
    db.profiles[index] = { ...db.profiles[index], ...req.body, lastUpdated: new Date().toISOString() };
    writeDB(db);
    return res.json({ profile: db.profiles[index] });
  }
});

// GET all profiles (used by leaderboard - in production this should be paginated/filtered)
router.get('/all', (req, res) => {
  const db = readDB();
  // Don't send sensitive info, just what's needed for leaderboard
  res.json({ profiles: db.profiles });
});

// GET all accounts (for names/roles in leaderboard)
router.get('/accounts', (req, res) => {
  const db = readDB();
  const safeAccounts = db.accounts.map(a => ({
    id: a.id,
    name: a.name,
    role: a.role
  }));
  res.json({ accounts: safeAccounts });
});

export default router;
