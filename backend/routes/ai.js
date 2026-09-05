import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

router.post('/generate', verifyToken, async (req, res) => {
  const { contents, jsonMode } = req.body;
  if (!GEMINI_API_KEY) return res.status(500).json({ error: 'Gemini API Key not configured on server' });
  if (!contents || !Array.isArray(contents) || contents.length === 0) {
    return res.status(400).json({ error: 'Missing required field: contents (must be a non-empty array)' });
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
        }
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      // Don't proxy Gemini's 400/429 as our own 400 — use 502 (Bad Gateway) to distinguish upstream errors
      const status = response.status === 400 || response.status === 429 ? 502 : response.status;
      return res.status(status).json({ error: err?.error?.message ?? 'Gemini API Error' });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
