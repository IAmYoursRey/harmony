// src/services/geminiService.ts
// API keys dibaca dari file .env (AMAN - tidak pernah ditampilkan di web)
// Set VITE_GEMINI_QUIZ_KEY dan VITE_GEMINI_CHAT_KEY di file .env

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent';

// Baca key dari .env � hanya tersedia saat build, tidak bisa diubah dari browser
function getQuizKey(): string {
  return import.meta.env.VITE_GEMINI_QUIZ_KEY || import.meta.env.VITE_GEMINI_API_KEY || '';
}

function getChatKey(): string {
  return import.meta.env.VITE_GEMINI_CHAT_KEY || import.meta.env.VITE_GEMINI_API_KEY || '';
}

// -- Generic fetch wrapper -----------------------------------------------------

async function callGemini(
  apiKey: string,
  contents: object[],
  jsonMode = false
): Promise<string> {
  if (!apiKey) throw new Error('API key tidak tersedia. Isi VITE_GEMINI_QUIZ_KEY atau VITE_GEMINI_CHAT_KEY di file .env');

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: 0.7,
    },
  };

  const response = await fetch(`${GEMINI_BASE}`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-goog-api-key': apiKey
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
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
  return Boolean(getQuizKey());
}

export function isChatAIConfigured(): boolean {
  return Boolean(getChatKey());
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
  const apiKey = getQuizKey();

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

  if (!apiKey) return getMockQuizQuestions(topic, count);

  try {
    const text = await callGemini(
      apiKey,
      [{ role: 'user', parts: [{ text: prompt }] }],
      false
    );
    const parsed = parseJSONFromText(text);
    return Array.isArray(parsed) ? parsed : getMockQuizQuestions(topic, count);
  } catch (err) {
    console.error('QuizAI generation error:', err);
    return getMockQuizQuestions(topic, count);
  }
}

export async function evaluateQuizAnswers(
  questions: QuizQuestion[],
  answers: Record<string, string>
): Promise<QuizEvaluation[]> {
  const apiKey = getQuizKey();
  
  // Pisahkan evaluasi MCQ dan Esai
  const evals: QuizEvaluation[] = [];
  const essayQuestions: any[] = [];

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

  if (!apiKey) {
    essayQuestions.forEach(q => evals.push({ questionId: q.id, score: 0, feedback: 'API key belum dikonfigurasi.', isCorrect: false }));
    return evals;
  }

  try {
    const text = await callGemini(
      apiKey,
      [{ role: 'user', parts: [{ text: prompt }] }],
      false
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
  const apiKey = getChatKey();

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

  if (!apiKey) return 'Kunci API GeoBot belum dikonfigurasi. Silakan isi VITE_GEMINI_CHAT_KEY di file .env lalu restart aplikasi.';

  try {
    return await callGemini(apiKey, contents);
  } catch (err) {
    console.error('ChatbotAI error:', err);
    return 'Maaf, ada kendala koneksi dengan GeoBot. Silakan coba sesaat lagi.';
  }
}

// -- Legacy compat -------------------------------------------------------------

export async function generateQuiz(topic: string, _level: string, count = 3) {
  return getMockQuizQuestions(topic, count);
}

export async function askGemini(
  prompt: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[] = []
) {
  return askChatbotAI(prompt, history);
}

function getMockQuizQuestions(topic: string, count: number): QuizQuestion[] {
  return Array.from({ length: count }, (_, i) => (
    i % 2 === 0 ? {
      id: `q${i + 1}`,
      type: 'mcq',
      question: `[Demo] Apa langkah pertama saat terjadi ${topic}? (Soal ${i + 1})`,
      options: ['A. Panik', 'B. Berdoa saja', 'C. Lindungi kepala dan menjauh dari kaca', 'D. Berlari ke dalam gedung', 'E. Menunggu di tempat'],
      correctOption: 'C',
      subTopic: 'Evakuasi',
    } : {
      id: `q${i + 1}`,
      type: 'essay',
      question: `[Demo] Jelaskan langkah-langkah mitigasi bencana ${topic} yang harus dilakukan sebelum bencana terjadi. (Soal ${i + 1})`,
      keyPoints: ['kesiapsiagaan', 'evakuasi', 'koordinasi'],
      subTopic: 'Kesiapsiagaan Umum',
    }
  ));
}
