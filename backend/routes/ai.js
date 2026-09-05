import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

const GEMINI_KEYS = {
  quiz: process.env.GEMINI_QUIZ_KEY,
  chat: process.env.GEMINI_CHAT_KEY,
  chatbot: process.env.GEMINI_CHATBOT_KEY,
};

const aiInstances = {
  quiz: GEMINI_KEYS.quiz ? new GoogleGenAI({ apiKey: GEMINI_KEYS.quiz }) : null,
  chat: GEMINI_KEYS.chat ? new GoogleGenAI({ apiKey: GEMINI_KEYS.chat }) : null,
  chatbot: GEMINI_KEYS.chatbot ? new GoogleGenAI({ apiKey: GEMINI_KEYS.chatbot }) : null,
};

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

// Health Check
router.get('/health', (req, res) => {
  res.json({
    configured: true,
    quiz: !!GEMINI_KEYS.quiz,
    chat: !!GEMINI_KEYS.chat,
    chatbot: !!GEMINI_KEYS.chatbot,
    model: MODEL_NAME
  });
});

router.post('/generate', verifyToken, async (req, res) => {
  const { contents, jsonMode, type, systemInstruction } = req.body;
  
  if (!type || !['quiz', 'chat', 'chatbot'].includes(type)) {
    return res.status(400).json({ success: false, error: 'Missing or invalid required field: type (must be quiz, chat, or chatbot)' });
  }

  const ai = aiInstances[type];

  if (!ai) {
    return res.status(503).json({ success: false, error: `AI service is temporarily unavailable (Missing Configuration for ${type})` });
  }

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
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }

    console.log(`[AI] feature=${type} keyConfigured=true`);
    
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents,
      config
    });
    
    res.json({ success: true, data: { text: response.text ?? '' } });
  } catch (err) {
    console.error(`[AI] Error (${type}):`, err.message);
    if (err.name === 'AbortError') {
      return res.status(504).json({ success: false, error: 'AI provider request timed out.' });
    }
    
    const statusCode = err.status === 400 || err.status === 429 ? 502 : (err.status || 500);
    res.status(statusCode).json({ success: false, error: err.message || 'AI service temporarily unavailable.' });
  }
});

export default router;
