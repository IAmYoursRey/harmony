import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { readDB, writeDB } from '../repository.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  console.error('[CRITICAL] JWT_SECRET is not defined in environment variables.');
}
router.post('/register', async (req, res) => {
  try {
    const body = req.body || {};
    const { name, email, password, role } = body;
    
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string' || typeof role !== 'string') {
      return res.status(400).json({ error: 'Invalid field format' });
    }

    const db = await readDB();
    const exists = db.accounts.find(a => a.email.toLowerCase() === email.toLowerCase());
    if (exists) return res.status(400).json({ error: 'Email already exists' });

    const id = `usr-${Date.now()}`;
    const passwordHash = await bcrypt.hash(password, 10);

    const account = {
      id,
      email,
      passwordHash,
      name,
      role,
      createdAt: new Date().toISOString()
    };

    db.accounts.push(account);
    await writeDB(db);

    const token = jwt.sign({ id: account.id, role: account.role }, SECRET, { expiresIn: '7d' });
    const { passwordHash: _, ...safeAccount } = account;
    res.json({ success: true, token, account: safeAccount });
  } catch (error) {
    console.error('[AUTH ERROR] /register:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const body = req.body || {};
    const { email, password } = body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid email or password format' });
    }

    const db = await readDB();
    const account = db.accounts.find(a => a.email.toLowerCase() === email.toLowerCase());
    if (!account) return res.status(401).json({ error: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, account.passwordHash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: account.id, role: account.role }, SECRET, { expiresIn: '7d' });
    const { passwordHash: _, ...safeAccount } = account;
    res.json({ success: true, token, account: safeAccount });
  } catch (error) {
    console.error('[AUTH ERROR] /login:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    const db = await readDB();
    const account = db.accounts.find(a => a.id === req.user.id);
    if (!account) return res.status(404).json({ error: 'User not found' });
    const { passwordHash: _, ...safeAccount } = account;
    res.json({ account: safeAccount });
  } catch (error) {
    console.error('[AUTH ERROR] /me:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
