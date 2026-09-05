import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize GoogleGenAI ONLY if the key exists, otherwise we will handle it at the request level.
const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

// Health Check
router.get('/health', (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(503).json({ success: false, error: 'AI service API key is missing' });
  }
  return res.json({ success: true, status: 'AI service configured', model: MODEL_NAME });
});

router.post('/generate', verifyToken, async (req, res) => {
  if (!GEMINI_API_KEY || !ai) {
    return res.status(503).json({ success: false, error: 'AI service is temporarily unavailable (Missing Configuration)' });
  }

  const { contents, jsonMode } = req.body;
  
  if (!contents || !Array.isArray(contents) || contents.length === 0) {
    return res.status(400).json({ success: false, error: 'Missing or invalid required field: contents (must be a non-empty array)' });
  }

  try {
    const config = {
      temperature: 0.7,
    };
    if (jsonMode) {
      config.responseMimeType = 'application/json';
    }

    console.log(`[AI] Request received - Model: ${MODEL_NAME}`);
    
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents,
      config
    });
    
    console.log(`[AI] Generation successful`);
    res.json({ success: true, data: { text: response.text ?? '' } });
  } catch (err) {
    console.error(`[AI] Error:`, err.message);
    if (err.name === 'AbortError') {
      return res.status(504).json({ success: false, error: 'AI provider request timed out.' });
    }
    
    const statusCode = err.status === 400 || err.status === 429 ? 502 : (err.status || 500);
    res.status(statusCode).json({ success: false, error: err.message || 'AI service temporarily unavailable.' });
  }
});

export default router;
