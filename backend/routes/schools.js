import express from 'express';
import { readDB } from '../repository.js';

const router = express.Router();

// GET all schools (optionally filtered by province or regency)
router.get('/', async (req, res, next) => {
  try {
    const db = await readDB();
    const schools = db.schools || [];
    
    let filtered = schools;
    
    if (req.query.province) {
      filtered = filtered.filter(s => s.province === req.query.province);
    }
    
    if (req.query.regency) {
      filtered = filtered.filter(s => s.regency === req.query.regency);
    }
    
    res.json({ schools: filtered });
  } catch (error) {
    console.error('Error fetching schools:', error);
    res.status(503).json({ success: false, error: 'Database connection failed' });
  }
});

// GET /api/schools/search?q=...
router.get('/search', async (req, res) => {
  const db = await readDB();
  const schools = db.schools || [];
  const q = (req.query.q || '').toLowerCase();
  
  if (!q) {
    return res.json({ schools: [] }); // return empty or all depending on requirement, let's return all for empty query
  }
  
  const results = schools.filter(s => 
    s.name.toLowerCase().includes(q) || 
    s.regency?.toLowerCase().includes(q) ||
    s.province?.toLowerCase().includes(q)
  );
  
  res.json({ schools: results });
});

// GET a specific school by ID
router.get('/:id', async (req, res) => {
  const db = await readDB();
  const schools = db.schools || [];
  const school = schools.find(s => s.id === req.params.id);
  
  if (!school) {
    return res.status(404).json({
      success: false,
      error: { code: 'SCHOOL_NOT_FOUND', message: 'School not found' }
    });
  }
  
  res.json({ school });
});

export default router;
