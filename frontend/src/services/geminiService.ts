// src/services/geminiService.ts
// API keys dibaca dari file .env (AMAN - tidak pernah ditampilkan di web)
// Set VITE_GEMINI_QUIZ_KEY dan VITE_GEMINI_CHAT_KEY di file .env

import { apiClient } from './apiClient';

export function normalizeAIResponse(rawResponse: any): string {
  if (rawResponse === null || rawResponse === undefined) return '';

  let text = '';

  if (typeof rawResponse === 'object') {
    if (typeof rawResponse.text === 'function') {
      try { text = rawResponse.text(); } catch (e) { /* ignore */ }
    } else {
      text = rawResponse.response || rawResponse.text || JSON.stringify(rawResponse);
    }
  } else if (typeof rawResponse === 'string') {
    text = rawResponse;
  } else {
    text = String(rawResponse);
  }

  const trimmed = text.trim();
  
  let possibleJson = trimmed;
  if (trimmed.startsWith('```json') || trimmed.startsWith('```')) {
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      possibleJson = match[1].trim();
    }
  }

  if (possibleJson.startsWith('{') && possibleJson.endsWith('}')) {
    try {
      const parsed = JSON.parse(possibleJson);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        if (typeof parsed.response === 'string') return parsed.response;
        if (typeof parsed.text === 'string') return parsed.text;
      }
    } catch (e) {
      // Not a valid JSON object wrapper, ignore
    }
  }

  return trimmed;
}

async function callGemini(
  contents: object[],
  type: 'quiz' | 'chat' | 'chatbot',
  jsonMode = false
): Promise<string> {
  try {
    const response = await apiClient.post('/api/ai/generate', { contents, type, jsonMode });
    let rawText = '';
    if (response && response.success && response.data) {
      rawText = response.data.text ?? '';
    } else {
      rawText = response?.text ?? '';
    }
    return normalizeAIResponse(rawText);
  } catch (err: any) {
    throw new Error(err.message || 'Error communicating with AI');
  }
}

// -----------------------------------------------------------------------------
// QUIZ AI � Essay Question Generation & Evaluation
// Menggunakan: VITE_GEMINI_QUIZ_KEY dari file .env
// -----------------------------------------------------------------------------

export type QuizDifficulty = 'pemula' | 'menengah' | 'mahir';

export interface QuizQuestion {
  id: string;
  type: 'mcq' | 'essay';
  question: string;
  options?: string[]; // For MCQs (A, B, C, D, E)
  correctOption?: string; // e.g., 'A'
  keyPoints?: string[]; // For Essays
  subTopic: string;
}

export interface QuizEvaluation {
  questionId: string;
  score: number;
  feedback: string;
  isCorrect: boolean;
}

export function isQuizAIConfigured(): boolean {
  return true;
}

export function isChatAIConfigured(): boolean {
  return true;
}

function parseJSONFromText(text: string) {
  try {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    return JSON.parse(match ? match[1] : text);
  } catch (e) {
    throw new Error('Gagal parse JSON dari AI');
  }
}

export async function generateQuizQuestions(
  topic: string,
  difficulty: QuizDifficulty,
  count: number,
  isFirstAttempt: boolean,
  weakSubTopics: string[] = [],
  strongSubTopics: string[] = []
): Promise<QuizQuestion[]> {
  // API Key managed by backend
  const difficultyDesc = {
    pemula: 'pertanyaan dasar dan faktual',
    menengah: 'pertanyaan analitis dan konseptual',
    mahir: 'pertanyaan studi kasus dan evaluasi komprehensif',
  }[difficulty];

  const focusHint = isFirstAttempt
    ? 'Buat soal diagnostik umum yang mencakup berbagai aspek topik ini.'
    : `${weakSubTopics.length > 0 ? `Fokuskan lebih banyak soal pada sub-topik yang lemah: ${weakSubTopics.join(', ')}.` : ''} ${strongSubTopics.length > 0 ? `Hindari sub-topik yang sudah dikuasai: ${strongSubTopics.join(', ')}.` : ''}`.trim();

  const prompt = `Buatkan ${count} soal campuran (Pilihan Ganda A-E dan Esai) tentang mitigasi bencana "${topic}" untuk level ${difficulty}.
Kriteria soal: ${difficultyDesc}. ${focusHint}
Campur tipe soal (misal 3 MCQ, 2 Esai).

Format output HARUS berupa JSON array valid (boleh dibungkus markdown \`\`\`json), dengan skema persis seperti ini:
[
  {
    "id": "q1",
    "type": "mcq",
    "question": "Pertanyaan pilihan ganda di sini",
    "options": ["A. Opsi pertama", "B. Opsi kedua", "C. Opsi ketiga", "D. Opsi keempat", "E. Opsi kelima"],
    "correctOption": "A",
    "subTopic": "nama sub-topik"
  },
  {
    "id": "q2",
    "type": "essay",
    "question": "Pertanyaan esai di sini",
    "keyPoints": ["kata kunci 1", "kata kunci 2", "kata kunci 3"],
    "subTopic": "nama sub-topik"
  }
]`;

  try {
    const text = await callGemini(
      [{ role: 'user', parts: [{ text: prompt }] }],
      'quiz',
      true
    );
    const parsed = parseJSONFromText(text);
    if (!Array.isArray(parsed)) throw new Error('Format balasan AI tidak sesuai ekspektasi');
    return parsed;
  } catch (err) {
    console.error('QuizAI generation error:', err);
    throw err;
  }
}

export interface SmartSimParams {
  schoolRisk: {
    earthquake: number;
    flood: number;
    tsunami: number;
    landslide: number;
    volcano: number;
    fire: number;
  };
  masteredConcepts: string[];
  mode: 'learning' | 'test';
  count: number;
}

export async function generateSmartSimulationQuestions(
  params: SmartSimParams
): Promise<QuizQuestion[]> {
  const riskContext = Object.entries(params.schoolRisk)
    .sort((a, b) => b[1] - a[1])
    .map(([key, val]) => `${key}: ${val}%`)
    .join(', ');

  const masteryContext = params.masteredConcepts.length > 0 
    ? `Konsep yang sudah dikuasai murid (HINDARI menanyakan ini lagi jika mode learning): ${params.masteredConcepts.join(', ')}`
    : 'Murid belum menguasai konsep apapun.';
    
  const modeContext = params.mode === 'learning' 
    ? 'Mode: LEARNING. Jangan gunakan konsep yang sudah dikuasai.'
    : 'Mode: TEST. Buatkan soal yang SANGAT SULIT (HOTS). Anda boleh menggunakan konsep yang sudah dikuasai tapi buat narasinya berbeda dan lebih rumit.';

  const prompt = `Buatkan ${params.count} soal pilihan ganda (MCQ A-E) Simulasi Bencana Alam.
  
Konteks Risiko Sekolah (Porsi soal HARUS mencerminkan bobot risiko ini, paling banyak soal untuk risiko terbesar):
${riskContext}

${masteryContext}
${modeContext}

Format output HARUS berupa JSON array valid (boleh dibungkus markdown \`\`\`json), dengan skema:
[
  {
    "id": "q1",
    "type": "mcq",
    "question": "Skenario cerita pertanyaan di sini",
    "options": ["A. Opsi", "B. Opsi", "C. Opsi", "D. Opsi", "E. Opsi"],
    "correctOption": "A",
    "subTopic": "konsep spesifik (cth: evakuasi_tsunami_gempa_susulan)"
  }
]`;

  try {
    const text = await callGemini(
      [{ role: 'user', parts: [{ text: prompt }] }],
      'quiz',
      true
    );
    const parsed = parseJSONFromText(text);
    if (!Array.isArray(parsed)) throw new Error('Format balasan AI tidak sesuai ekspektasi');
    return parsed;
  } catch (err) {
    console.error('SmartSim AI generation error:', err);
    throw err;
  }
}

interface EssayEvaluationPayload {
  id: string;
  question: string;
  keyPoints?: string[];
  studentAnswer: string;
}

export async function evaluateQuizAnswers(
  questions: QuizQuestion[],
  answers: Record<string, string>
): Promise<QuizEvaluation[]> {
  // Pisahkan evaluasi MCQ dan Esai
  const evals: QuizEvaluation[] = [];
  const essayQuestions: EssayEvaluationPayload[] = [];

  for (const q of questions) {
    const studentAns = answers[q.id] || '';
    if (q.type === 'mcq') {
      const isCorrect = studentAns === q.correctOption;
      evals.push({
        questionId: q.id,
        score: isCorrect ? 100 : 0,
        feedback: isCorrect ? 'Jawaban Anda Tepat!' : `Salah. Jawaban yang benar adalah ${q.correctOption}.`,
        isCorrect
      });
    } else {
      essayQuestions.push({
        id: q.id,
        question: q.question,
        keyPoints: q.keyPoints,
        studentAnswer: studentAns
      });
    }
  }

  // Jika tidak ada esai, langsung return
  if (essayQuestions.length === 0) return evals;

  const prompt = `Anda adalah guru pakar mitigasi bencana. Evaluasi jawaban esai siswa berikut.
Untuk setiap jawaban, berikan skor 0-100 berdasarkan kebenaran dan kelengkapan.
Skor 0 jika kosong atau sama sekali salah, 100 jika sempurna.

Data soal & jawaban:
${JSON.stringify(essayQuestions, null, 2)}

Format output HARUS berupa JSON array valid (boleh dibungkus markdown \`\`\`json):
[
  {
    "questionId": "q1",
    "score": 85,
    "feedback": "Penjelasan umpan balik yang konstruktif dan edukatif di sini",
    "isCorrect": true
  }
]`;

  try {
    const text = await callGemini(
      [{ role: 'user', parts: [{ text: prompt }] }],
      'quiz',
      true
    );
    const parsed = parseJSONFromText(text);
    if (Array.isArray(parsed)) {
      evals.push(...parsed);
    }
  } catch (err) {
    console.error('QuizAI evaluation error:', err);
    essayQuestions.forEach(q => evals.push({ questionId: q.id, score: 0, feedback: 'Gagal menghubungi AI evaluator.', isCorrect: false }));
  }

  // Sort kembali sesuai urutan pertanyaan asli
  return evals.sort((a, b) => {
    const idxA = questions.findIndex(q => q.id === a.questionId);
    const idxB = questions.findIndex(q => q.id === b.questionId);
    return idxA - idxB;
  });
}

// -----------------------------------------------------------------------------
// CHATBOT AI � Interactive chatbot with user profile context
// Menggunakan: VITE_GEMINI_CHAT_KEY dari file .env
// -----------------------------------------------------------------------------

export async function askChatbotAI(
  userMessage: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  userProfileSummary?: string
): Promise<string> {
  // API Key managed by backend
  const systemContext = `Anda adalah Asisten Pembelajaran Mitigasi Bencana bernama "GeoBot". ${
    userProfileSummary
      ? `Berikut adalah profil siswa yang sedang berdialog:\n${userProfileSummary}\nGunakan data ini untuk mempersonalisasi respons, memberikan motivasi, dan mengarahkan siswa ke area yang perlu diperkuat.`
      : ''
  }
Jawab dengan bahasa yang ramah, ringkas, mudah dipahami siswa sekolah, dan edukatif. Jika ditanya di luar topik kebencanaan, arahkan kembali ke topik tersebut.`;

  const contents = [
    ...history,
    { role: 'user', parts: [{ text: `${systemContext}\n\nPesan siswa: ${userMessage}` }] },
  ];

  try {
    return await callGemini(contents, 'chatbot', false);
  } catch (err) {
    console.error('ChatbotAI error:', err);
    return 'Maaf, ada kendala koneksi dengan GeoBot. Silakan coba sesaat lagi.';
  }
}

// -- Legacy compat -------------------------------------------------------------

export async function generateQuiz(topic: string, _level: string, count = 3) {
  throw new Error('generateQuiz is deprecated. Use generateQuizQuestions.');
}

export async function askGemini(
  prompt: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[] = []
) {
  return askChatbotAI(prompt, history);
}


