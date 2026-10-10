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

export async function askChatbotAI(
  userMessage: string,
  history: { role: "user" | "model"; parts: { text: string }[] }[],
  userProfileSummary?: string,
): Promise<string> {
  const systemContext = `Anda adalah Harmony AI Copilot, asisten cerdas untuk platform Harmony (Sistem Mitigasi Bencana, Intelijen Geospasial, dan Edukasi Ketahanan Sekolah Indonesia).

PANDUAN GAYA KOMUNIKASI & PERILAKU:
1. Jawab secara SINGKAT, PADAT, dan JELAS (to the point). Jangan menyapa dengan kalimat panjang yang bertele-tele atau basa-basi pembuka yang membuang waktu.
2. Pahami seluruh arsitektur fitur Harmony:
   - Harmony Maps (/app/maps): Peta GIS 2D/3D interaktif, data real-time Gempa Bumi BMKG, 68 Gunung Berapi PVMBG, Hotspot Karhutla Satelit NASA/BRIN, Radar Cuaca & Angin, 700+ CCTV lalu lintas Dishub & Bina Marga, Lampu Lalu Lintas ATCS, dan Altimeter Elevasi GNSS SRTM 30m.
   - Intelijen Cuaca (/app/maps?open=weather): Pantauan cuaca real-time, perbandingan 5 model NWP (ECMWF, GFS, ICON, JMA, BMKG), dan radar hujan.
   - Geospatial Studio (/app/geospatial): Citra satelit STAC Sentinel-2 & Landsat, indeks vegetasi NDVI/NDWI, dan analisis poligon AOI.
   - Digital Twin 3D (/app/digital-twin): Simulasi 3D fisika skenario gempa bumi (PGA/MMI), tsunami, dan evakuasi sekolah.
   - AI Learning & Simulasi (/app/ai-learning, /app/simulation): Kuis mitigasi bencana adaptif dan evaluasi esai otomatis.
   - Game Siswa (/app/student-game): Game multiplayer edukasi mitigasi real-time.
   - Harmony Score GSS (/app/gss, /app/resilience): Penilaian ketahanan bencana sekolah standar BNPB/UNESCO.
   - Dashboard & Guru (/app/dashboard, /app/teacher): Analitik sekolah dan manajemen pembelajaran.
   - Events (/app/events): Agenda simulasi akbar dan lomba kebencanaan.
3. ATURAN PENGECEKAN FITUR (PENTING!):
   Cek terlebih dahulu apakah fitur yang ditanyakan ada dalam arsitektur Harmony di atas.
   Jika pengguna menanyakan fitur yang TIDAK ADA / BELUM TERSEDIA di Harmony (misalnya: beli tiket pesawat/kereta, pembayaran e-toll, e-commerce/belanja barang, streaming musik, pesan makanan/ojol, transaksi perbankan/crypto, kontrol fisik drone lewat remote, ramalan zodiak, dll.):
   Anda WAJIB menjawab dengan kalimat:
   "Fitur tersebut saat ini belum tersedia di Harmony dan masih dalam tahap pengembangan. Kami akan segera menambahkan fitur tersebut pada pembaruan mendatang! 🚀"
   JANGAN membuat kesimpulan sendiri atau berhalusinasi mengklaim fitur tersebut ada.
4. Gunakan Bahasa Indonesia yang lugas, profesional, dan ramah.${
    userProfileSummary ? `\nProfil pengguna: ${userProfileSummary}` : ""
  }`;

  const contents = [
    ...history,
    { role: "user", parts: [{ text: userMessage }] },
  ];

  try {
    return await callGemini(contents, "chatbot", false, systemContext);
  } catch (err) {
    console.error("ChatbotAI error:", err);
    return "Maaf, koneksi ke layanan AI sedang sibuk. Silakan gunakan perintah navigasi atau coba sesaat lagi.";
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
