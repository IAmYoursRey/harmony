import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { readDB, writeDB } from '../repository.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const SECRET = process.env.JWT_SECRET || 'fallback_secret';

router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'Missing fields' });

  const db = readDB();
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
  writeDB(db);

  const token = jwt.sign({ id: account.id, role: account.role }, SECRET, { expiresIn: '7d' });
  const { passwordHash: _, ...safeAccount } = account;
  res.json({ success: true, token, account: safeAccount });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  const db = readDB();
  const account = db.accounts.find(a => a.email.toLowerCase() === email.toLowerCase());
  if (!account) return res.status(400).json({ error: 'Invalid email or password' });

  const isMatch = await bcrypt.compare(password, account.passwordHash);
  if (!isMatch) return res.status(400).json({ error: 'Invalid email or password' });

  const token = jwt.sign({ id: account.id, role: account.role }, SECRET, { expiresIn: '7d' });
  const { passwordHash: _, ...safeAccount } = account;
  res.json({ success: true, token, account: safeAccount });
});

router.get('/me', verifyToken, (req, res) => {
  const db = readDB();
  const account = db.accounts.find(a => a.id === req.user.id);
  if (!account) return res.status(404).json({ error: 'User not found' });
  const { passwordHash: _, ...safeAccount } = account;
  res.json({ account: safeAccount });
});

export default router;
