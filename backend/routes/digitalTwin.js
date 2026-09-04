import express from 'express';
import { readDB, writeDB } from '../repository.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET digital twin by schoolId
router.get('/:schoolId', (req, res) => {
  const { schoolId } = req.params;
  const db = readDB();
  const twin = db.digitalTwins?.[schoolId] || null;
  res.json({ data: twin });
});

// POST save digital twin (requires auth, potentially role check in future)
router.post('/:schoolId', verifyToken, (req, res) => {
  if (req.user.role !== 'dev' && req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Permission denied' });
  }
  const { schoolId } = req.params;
  const { mapImage, nodes, edges } = req.body;
  
  const db = readDB();
  if (!db.digitalTwins) db.digitalTwins = {};
  
  db.digitalTwins[schoolId] = { mapImage, nodes, edges, lastUpdated: new Date().toISOString() };
  
  const success = writeDB(db);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to save digital twin' });
  }
});

export default router;
