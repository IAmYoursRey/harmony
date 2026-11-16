import { apiClient } from "./apiClient";

export function normalizeAIResponse(rawResponse: any): string {
  if (rawResponse === null || rawResponse === undefined) return "";

  let text = "";

  if (typeof rawResponse === "object") {
    if (typeof rawResponse.text === "function") {
      try {
        text = rawResponse.text();
      } catch (e) {
        /* ignore */
      }
    } else {
      text =
        rawResponse.response || rawResponse.text || JSON.stringify(rawResponse);
    }
  } else if (typeof rawResponse === "string") {
    text = rawResponse;
  } else {
    text = String(rawResponse);
  }

  const trimmed = text.trim();

  let possibleJson = trimmed;
  if (trimmed.startsWith("```json") || trimmed.startsWith("```")) {
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      possibleJson = match[1].trim();
    }
  }

  if (possibleJson.startsWith("{") && possibleJson.endsWith("}")) {
    try {
      const parsed = JSON.parse(possibleJson);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        if (typeof parsed.response === "string") return parsed.response;
        if (typeof parsed.text === "string") return parsed.text;
      }
    } catch (e) {}
  }

  return trimmed;
}

async function callGemini(
  contents: object[],
  type: "quiz" | "chat" | "chatbot",
  jsonMode = false,
  systemInstruction?: string,
): Promise<string> {
  try {
    const payload: any = { contents, type, jsonMode };
    if (systemInstruction) {
      payload.systemInstruction = systemInstruction;
    }
    const response = await apiClient.post("/api/ai/generate", payload);
    let rawText = "";
    if (response && response.success && response.data) {
      rawText = response.data.text ?? "";
    } else {
      rawText = response?.text ?? "";
    }
    return normalizeAIResponse(rawText);
  } catch (err: any) {
    throw new Error(err.message || "Error communicating with AI");
  }
}

export type QuizDifficulty = "pemula" | "menengah" | "mahir";

export interface QuizQuestion {
  id: string;
  type: "mcq" | "essay";
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
    throw new Error("Gagal parse JSON dari AI");
  }
}

export async function generateQuizQuestions(
  topic: string,
  difficulty: QuizDifficulty,
  count: number,
  isFirstAttempt: boolean,
  weakSubTopics: string[] = [],
  strongSubTopics: string[] = [],
): Promise<QuizQuestion[]> {
  const difficultyDesc = {
    pemula: "pertanyaan dasar dan faktual",
    menengah: "pertanyaan analitis dan konseptual",
    mahir: "pertanyaan studi kasus dan evaluasi komprehensif",
  }[difficulty];

  const focusHint = isFirstAttempt
    ? "Buat soal diagnostik umum yang mencakup berbagai aspek topik ini."
    : `${weakSubTopics.length > 0 ? `Fokuskan lebih banyak soal pada sub-topik yang lemah: ${weakSubTopics.join(", ")}.` : ""} ${strongSubTopics.length > 0 ? `Hindari sub-topik yang sudah dikuasai: ${strongSubTopics.join(", ")}.` : ""}`.trim();

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
      [{ role: "user", parts: [{ text: prompt }] }],
      "quiz",
      true,
    );
    const parsed = parseJSONFromText(text);
    if (!Array.isArray(parsed))
      throw new Error("Format balasan AI tidak sesuai ekspektasi");
    return parsed;
  } catch (err) {
    console.error("QuizAI generation error:", err);
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
  weakConcepts?: string[];
  mode: "learning" | "test";
  count: number;
}

export async function generateSmartSimulationQuestions(
  params: SmartSimParams,
): Promise<QuizQuestion[]> {
  const riskContext = Object.entries(params.schoolRisk)
    .sort((a, b) => b[1] - a[1])
    .map(([key, val]) => `${key}: ${val}%`)
    .join(", ");

  const masteryContext =
    params.masteredConcepts.length > 0
      ? `Konsep yang sudah dikuasai murid (HINDARI menanyakan ini lagi jika mode learning): ${params.masteredConcepts.join(", ")}`
      : "Murid belum menguasai konsep apapun.";

  const weakContext =
    params.weakConcepts && params.weakConcepts.length > 0
      ? `Topik lemah murid (FOKUSKAN sebagian besar soal pada topik/konsep ini untuk membantu mereka belajar): ${params.weakConcepts.join(", ")}`
      : "";

  const modeContext =
    params.mode === "learning"
      ? "Mode: LEARNING. Jangan gunakan konsep yang sudah dikuasai. Utamakan topik lemah jika ada."
      : "Mode: TEST. Buatkan soal yang SANGAT SULIT (HOTS). Anda boleh menggunakan konsep yang sudah dikuasai tapi buat narasinya berbeda dan lebih rumit.";

  const prompt = `Buatkan ${params.count} soal pilihan ganda (MCQ A-E) Pertanyaan Bencana Alam.
  
Konteks Risiko Sekolah (Porsi soal HARUS mencerminkan bobot risiko ini, paling banyak soal untuk risiko terbesar):
${riskContext}

${masteryContext}
${weakContext}
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
      [{ role: "user", parts: [{ text: prompt }] }],
      "quiz",
      true,
    );
    const parsed = parseJSONFromText(text);
    if (!Array.isArray(parsed))
      throw new Error("Format balasan AI tidak sesuai ekspektasi");
    return parsed;
  } catch (err) {
    console.error("SmartSim AI generation error:", err);
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
  answers: Record<string, string>,
): Promise<QuizEvaluation[]> {
  const evals: QuizEvaluation[] = [];
  const essayQuestions: EssayEvaluationPayload[] = [];

  for (const q of questions) {
    const studentAns = answers[q.id] || "";
    if (q.type === "mcq") {
      const isCorrect = studentAns === q.correctOption;
      evals.push({
        questionId: q.id,
        score: isCorrect ? 100 : 0,
        feedback: isCorrect
          ? "Jawaban Anda Tepat!"
          : `Salah. Jawaban yang benar adalah ${q.correctOption}.`,
        isCorrect,
      });
    } else {
      essayQuestions.push({
        id: q.id,
        question: q.question,
        keyPoints: q.keyPoints,
        studentAnswer: studentAns,
      });
    }
  }

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
      [{ role: "user", parts: [{ text: prompt }] }],
      "quiz",
      true,
    );
    const parsed = parseJSONFromText(text);
    if (Array.isArray(parsed)) {
      evals.push(...parsed);
    }
  } catch (err) {
    console.error("QuizAI evaluation error:", err);
    essayQuestions.forEach((q) =>
      evals.push({
        questionId: q.id,
        score: 0,
        feedback: "Gagal menghubungi AI evaluator.",
        isCorrect: false,
      }),
    );
  }

  return evals.sort((a, b) => {
    const idxA = questions.findIndex((q) => q.id === a.questionId);
    const idxB = questions.findIndex((q) => q.id === b.questionId);
    return idxA - idxB;
  });
}

export const MAX_CHAT_MEMORY = 6;

/**
 * Enforces the strict 6-message rolling FIFO memory cap on chat arrays.
 * When a 7th+ message is added, the earliest top entries are evicted cleanly.
 */
export function trimRollingChatMemory<T>(
  items: T[],
  maxMessages = MAX_CHAT_MEMORY,
): T[] {
  if (!Array.isArray(items)) return [];
  const cap = Math.max(1, maxMessages);
  return items.length > cap ? items.slice(-cap) : items;
}

export async function askChatbotAI(
  userMessage: string,
  history: { role: "user" | "model"; parts: { text: string }[] }[],
  userProfileSummary?: string,
): Promise<string> {
  const cleanUserMessage = userMessage.trim();
  const systemContext = `Kamu adalah GeoBot, asisten AI kebencanaan platform HARMONY (Edukasi & Kesiapsiagaan Bencana SPAB berbasis Peta Spasial WebGIS, AI Learning, dan Simulasi Denah 2D SMAN 1 Ngoro).
Jawab hangat dan natural layaknya teman/mentor manusia dalam ragam Bahasa Indonesia sehari-hari, Bahasa Jawa padinan/krama sesuai bahasa pengguna, atau Bahasa Inggris jika ditanya dalam Bahasa Inggris.
Jika pengguna menanyakan fitur di luar platform Harmony atau data yang belum tersedia di akunnya, sampaikan terus terang tanpa mengarang dan ajukan 1-2 pertanyaan klarifikasi singkat bila maksudnya masih umum.${
    userProfileSummary ? `\nRingkasan Profil Lokal: ${userProfileSummary}` : ""
  }`;

  const lastEntry = history[history.length - 1];
  const lastText = lastEntry?.parts?.[0]?.text?.trim();
  const rawContents =
    lastEntry?.role === "user" && lastText === cleanUserMessage
      ? history
      : [...history, { role: "user" as const, parts: [{ text: cleanUserMessage }] }];

  const trimmed = trimRollingChatMemory(rawContents, MAX_CHAT_MEMORY);
  const firstUserIdx = trimmed.findIndex((item) => item.role === "user");
  const contents = firstUserIdx > 0 ? trimmed.slice(firstUserIdx) : trimmed;

  try {
    return await callGemini(contents, "chatbot", false, systemContext);
  } catch (err) {
    console.error("ChatbotAI error:", err);
    return "Maaf, koneksi ke GeoBot sedang sibuk. Coba kirim ulang sebentar lagi ya.";
  }
}

export async function generateQuiz(topic: string, _level: string, count = 3) {
  throw new Error("generateQuiz is deprecated. Use generateQuizQuestions.");
}

export async function askGemini(
  prompt: string,
  history: { role: "user" | "model"; parts: { text: string }[] }[] = [],
) {
  return askChatbotAI(prompt, history);
}

export interface RouteCopilotPayload {
  route: any;
  userQuery?: string;
  chatHistory?: Array<{ role: 'user' | 'ai'; text: string }>;
}

export async function askRouteCopilotAI(payload: RouteCopilotPayload): Promise<string> {
  try {
    const route = payload.route || {};
    const res = await apiClient.post('/api/ai/route-copilot', {
      origin: route.origin,
      destination: route.destination,
      distanceKm: route.distanceKm,
      durationText: route.durationText,
      durationMin: route.durationMin,
      departureTimeText: route.departureTimeText,
      arrivalTimeText: route.arrivalTimeText,
      timelineStages: route.timelineStages,
      safetyScore: route.safetyScore,
      safetyLevel: route.safetyLevel,
      weatherRiskSummary: route.weatherRiskSummary,
      volcanoHazardSummary: route.volcanoHazardSummary,
      userQuery: payload.userQuery,
      chatHistory: payload.chatHistory,
    });

    if (res && res.success && res.text) {
      return res.text;
    }
    return res?.text || 'Analisis rute selesai.';
  } catch (err: any) {
    console.error('Route Copilot AI error:', err);
    throw err;
  }
}
