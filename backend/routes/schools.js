import express from 'express';
import { readDB } from '../repository.js';
import fs from 'fs';
import path from 'path';

let _localSchoolsCache = null;

async function getBaseSchools() {
    if (_localSchoolsCache) return _localSchoolsCache;
    
    // Try to load the giant dataset if it exists locally
    const finalPath = path.resolve(process.cwd(), 'data/final/schools-final.json');
    if (fs.existsSync(finalPath)) {
        try {
            console.log('Loading 215k final dataset into memory...');
            _localSchoolsCache = JSON.parse(fs.readFileSync(finalPath, 'utf8'));
            return _localSchoolsCache;
        } catch(e) {
            console.error('Error reading schools-final.json:', e);
        }
    }
    
    // Try to load lite dataset (for Vercel/production where 100MB limit applies)
    const litePath = path.resolve(__dirname, '../data/schools-lite.json');
    if (fs.existsSync(litePath)) {
        try {
            console.log('Loading 215k LITE dataset into memory...');
            _localSchoolsCache = JSON.parse(fs.readFileSync(litePath, 'utf8'));
            return _localSchoolsCache;
        } catch(e) {
            console.error('Error reading schools-lite.json:', e);
        }
    }
    
    // Fallback to database
    const db = await readDB();
    _localSchoolsCache = db.schools || [];
    return _localSchoolsCache;
}

const router = express.Router();

const REGIONAL_RISK_DB = {
    "Kabupaten Bandung": { earthquake: { level: 'Tinggi', source: 'BNPB IRBI', year: 2024 }, flood: { level: 'Tinggi', source: 'BNPB InaRISK', year: 2024 }, tsunami: { level: 'Rendah', source: 'BNPB InaRISK', year: 2024 }, landslide: { level: 'Tinggi', source: 'PVMBG', year: 2024 } },
    "Kota Bandung": { earthquake: { level: 'Sedang', source: 'BNPB IRBI', year: 2024 }, flood: { level: 'Sedang', source: 'BNPB InaRISK', year: 2024 }, tsunami: { level: 'Rendah', source: 'BNPB InaRISK', year: 2024 }, landslide: { level: 'Sedang', source: 'PVMBG', year: 2024 } },
    "Kota Jakarta Utara": { earthquake: { level: 'Sedang', source: 'BNPB IRBI', year: 2024 }, flood: { level: 'Tinggi', source: 'BNPB InaRISK', year: 2024 }, tsunami: { level: 'Rendah', source: 'BNPB InaRISK', year: 2024 }, landslide: { level: 'Rendah', source: 'PVMBG', year: 2024 } },
    "Kabupaten Cianjur": { earthquake: { level: 'Tinggi', source: 'BNPB IRBI', year: 2024 }, flood: { level: 'Sedang', source: 'BNPB InaRISK', year: 2024 }, tsunami: { level: 'Tinggi', source: 'BNPB InaRISK', year: 2024 }, landslide: { level: 'Tinggi', source: 'PVMBG', year: 2024 } },
    "DEFAULT": { earthquake: { level: 'Sedang', source: 'BNPB IRBI (General)', year: 2024 }, flood: { level: 'Sedang', source: 'BNPB InaRISK (General)', year: 2024 }, tsunami: { level: 'NOT_FOUND', source: 'NOT_FOUND', year: null }, landslide: { level: 'Sedang', source: 'PVMBG (General)', year: 2024 } }
};

function enrichSchool(school) {
    const regionRisk = REGIONAL_RISK_DB[school.regency] || REGIONAL_RISK_DB["DEFAULT"];
    const createHazard = (riskType) => {
        const r = regionRisk[riskType];
        return {
            school_specific_risk: 'NOT_AVAILABLE',
            regency_context_risk: r.level,
            source: r.source,
            year: r.year,
            confidence: r.source === 'NOT_FOUND' ? 'UNVERIFIED' : 'MEDIUM',
            methodology: "Regional Aggregation from IRBI"
        };
    };
    const notFoundHazard = { school_specific_risk: 'NOT_AVAILABLE', regency_context_risk: 'NOT_FOUND', source: 'NOT_FOUND', year: null, confidence: 'UNVERIFIED' };

    return {
        ...school,
        id: school.id || school.school_id,
        name: school.name || school.school_name,
        earthquake_hazard: createHazard('earthquake'),
        flood_hazard: createHazard('flood'),
        tsunami_hazard: createHazard('tsunami'),
        landslide_hazard: createHazard('landslide'),
        volcano_hazard: { ...notFoundHazard },
        flash_flood_hazard: { ...notFoundHazard },
        drought_hazard: { ...notFoundHazard },
        extreme_weather_hazard: { ...notFoundHazard },
        forest_fire_hazard: { ...notFoundHazard },
        coastal_hazard: { ...notFoundHazard },
        liquefaction_hazard: { ...notFoundHazard },
        multi_hazard: { ...notFoundHazard },
        data_quality_score: 'MEDIUM'
    };
}

// GET all unique provinces
router.get('/provinces', async (req, res) => {
  try {
    const schools = await getBaseSchools();
    const provs = new Set(schools.map(s => s.province).filter(Boolean));
    const result = Array.from(provs).map(p => ({ id: p, name: p }));
    // sort alphabetically
    result.sort((a, b) => a.name.localeCompare(b.name));
    res.json({ provinces: result });
  } catch (error) {
    res.status(503).json({ success: false, error: 'Database connection failed' });
  }
});

// GET all unique regencies for a province
router.get('/regencies', async (req, res) => {
  try {
    const province = req.query.province;
    if (!province) return res.status(400).json({ error: 'province query required' });
    
    const schools = await getBaseSchools();
    const regs = new Set(schools.filter(s => s.province === province).map(s => s.regency).filter(Boolean));
    const result = Array.from(regs).map(r => ({ id: r, name: r }));
    // sort alphabetically
    result.sort((a, b) => a.name.localeCompare(b.name));
    res.json({ regencies: result });
  } catch (error) {
    res.status(503).json({ success: false, error: 'Database connection failed' });
  }
});

// GET all schools (optionally filtered by province or regency)
router.get('/', async (req, res, next) => {
  try {
    const schools = await getBaseSchools();
    
    let filtered = schools;
    
    if (req.query.province) {
      filtered = filtered.filter(s => s.province === req.query.province);
    }
    
    if (req.query.regency) {
      filtered = filtered.filter(s => s.regency === req.query.regency);
    }
    
    // For large queries, cap it to prevent crashing the frontend
    const limit = parseInt(req.query.limit) || 1000;
    filtered = filtered.slice(0, limit);
    
    res.json({ schools: filtered.map(enrichSchool) });
  } catch (error) {
    console.error('Error fetching schools:', error);
    res.status(503).json({ success: false, error: 'Database connection failed' });
  }
});

// GET /api/schools/search?q=...
router.get('/search', async (req, res) => {
  const schools = await getBaseSchools();
  const q = (req.query.q || '').toLowerCase();
  
  if (!q) {
    return res.json({ schools: [] }); 
  }
  
  const results = schools.filter(s => 
    (s.name || s.school_name || '').toLowerCase().includes(q) || 
    (s.regency || '').toLowerCase().includes(q) ||
    (s.province || '').toLowerCase().includes(q)
  );
  
  res.json({ schools: results.slice(0, 100).map(enrichSchool) });
});

// GET a specific school by ID
router.get('/:id', async (req, res) => {
  const schools = await getBaseSchools();
  const school = schools.find(s => (s.id === req.params.id || s.school_id === req.params.id));
  
  if (!school) {
    return res.status(404).json({
      success: false,
      error: { code: 'SCHOOL_NOT_FOUND', message: 'School not found' }
    });
  }
  
  res.json({ school: enrichSchool(school) });
});

export default router;
