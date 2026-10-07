import { buildAtmosphericDiagnostic, isFiniteWeatherNumber } from '../services/weatherIntegrity.js';
import express from "express";
import { verifyToken, verifyOptionalToken } from "../middleware/authMiddleware.js";
import { GoogleGenAI } from "@google/genai";
import { saveWeatherInterval, getWeatherIntervals, readDB } from "../repositories/repository.js";
import { synthesizeSchoolRisk } from "../services/spatialRiskEngine.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../../.env.local") });
dotenv.config({ path: path.join(__dirname, "../../../.env") });
dotenv.config({ path: path.join(__dirname, "../../.env.local") });
dotenv.config({ path: path.join(__dirname, "../../.env") });

const router = express.Router();

// Cooldown tracker for Gemini free-tier quota limits (Prevents console error flood)
let geminiQuotaCooldownUntil = 0;

function isValidKey(k) {
  return typeof k === 'string' && k.trim().length > 15 && !k.startsWith('your_gemini');
}

function getGeminiKeys() {
  const quiz = isValidKey(process.env.GEMINI_QUIZ_KEY) ? process.env.GEMINI_QUIZ_KEY.trim() : null;
  const chat = isValidKey(process.env.GEMINI_CHAT_KEY) ? process.env.GEMINI_CHAT_KEY.trim() : null;
  const chatbot = isValidKey(process.env.GEMINI_CHATBOT_KEY) ? process.env.GEMINI_CHATBOT_KEY.trim() : null;
  const weather = isValidKey(process.env.GEMINI_WEATHER_KEY)
    ? process.env.GEMINI_WEATHER_KEY.trim()
    : (chatbot || chat);
  return { quiz, chat, chatbot, weather };
}

function getAiInstance(purpose = 'weather') {
  const keys = getGeminiKeys();
  const key = keys[purpose] || keys.weather || keys.chatbot || keys.chat;
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key });
}

const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
  "gemini-2.5-flash",
].filter(Boolean);

const MODEL_NAME = CANDIDATE_MODELS[0] || "gemini-flash-lite-latest";

router.get("/health", (req, res) => {
  const keys = getGeminiKeys();
  const isAnyConfigured = !!(keys.quiz || keys.chat || keys.chatbot || keys.weather);
  res.json({
    configured: isAnyConfigured,
    weatherConfigured: !!keys.weather,
    quiz: !!keys.quiz,
    chat: !!keys.chat,
    chatbot: !!keys.chatbot,
    weather: !!keys.weather,
    model: MODEL_NAME,
  });
});

/**
 * Route: Verifikasi & Komputasi Cuaca AI Berdasarkan 7 Persamaan Dasar Atmosfer (NWP)
 * Menggunakan Vilhelm Bjerknes & Lewis Fry Richardson Mathematical Framework
 */
router.post("/weather-nwp-verify", verifyOptionalToken, async (req, res) => {
  const { lat, lng, locationName = 'Lokasi pilihan', current, modelComparison = [] } = req.body || {};
  let diagnostic;
  try {
    if (!isFiniteWeatherNumber(lng) || Math.abs(lng) > 180) throw new Error('Bujur tidak valid.');
    diagnostic = buildAtmosphericDiagnostic(lat, current);
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
  const ai = getAiInstance('weather');
  if (!ai || Date.now() < geminiQuotaCooldownUntil) {
    return res.json({ success: false, data: diagnostic, source: 'local-diagnostic', reason: { code: ai ? 'AI_COOLDOWN' : 'AI_NOT_CONFIGURED', message: 'AI eksternal belum tersedia; hanya diagnostik lokal.' } });
  }
  try {
    let responseText = '';
    let resolvedModel = MODEL_NAME;
    let lastErr = null;

    for (const m of CANDIDATE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: m,
          contents: [{ role: 'user', parts: [{ text: JSON.stringify({ locationName, lat, lng, current, modelComparison, diagnostic }) }] }],
          config: {
            temperature: 0.2, responseMimeType: 'application/json',
            systemInstruction: 'Jelaskan data prakiraan dan konsensus model cuaca yang diberikan dalam Bahasa Indonesia. Analisis data mentah masukan dan nilai fisika atmosfer yang telah dihitung (parameter Coriolis, kerapatan udara, ensemble spread). Buat kesimpulan saintifik apakah kondisi atmosfer konsisten dan masuk akal secara meteorologi. Kembalikan JSON dengan format { "scientificBriefing": "kesimpulan AI...", "confidence": "TINGGI" | "SEDANG" | "RENDAH" }.',
          },
        });
        if (response?.text) {
          responseText = response.text;
          resolvedModel = m;
          break;
        }
      } catch (mErr) {
        lastErr = mErr;
      }
    }

    if (!responseText) {
      throw lastErr || new Error('Tidak ada model Gemini yang merespons.');
    }

    const parsed = JSON.parse(responseText.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, ''));
    if (typeof parsed.scientificBriefing !== 'string' || !parsed.scientificBriefing.trim()) throw new Error('Penjelasan AI kosong/tidak valid.');
    const data = { ...diagnostic, isAiVerified: true, scientificBriefing: parsed.scientificBriefing + ' Penjelasan AI menyintesis konsensus model dan dinamika atmosfer.', modelName: resolvedModel };
    let persistenceStatus = 'NOT_ATTEMPTED';
    try {
      await saveWeatherInterval({ locationKey: `${Number(lat).toFixed(3)},${Number(lng).toFixed(3)}`, locationName, coordinates: { lat, lng }, timestamp: Date.now(), models: modelComparison, nwpConsensus: data, source: 'ai-explanation' });
      persistenceStatus = 'PERSISTED';
    } catch {
      persistenceStatus = 'FAILED';
    }
    return res.json({ success: true, data, source: 'ai-explanation', accuracyValidated: false, persistenceStatus });
  } catch (error) {
    const message = String(error?.message || 'Layanan AI gagal.');
    if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) geminiQuotaCooldownUntil = Date.now() + 5 * 60 * 1000;
    return res.json({ success: false, data: diagnostic, source: 'local-diagnostic', reason: { code: 'AI_UNAVAILABLE', message: 'Permintaan AI tidak berhasil; hanya diagnostik lokal.' } });
  }
});

/**
 * Route: Riwayat Pelatihan Interval Cuaca & Verifikasi Akurasi Konsensus (1 Hari, 7 Hari, 14 Hari)
 */
router.get("/weather-history", verifyOptionalToken, async (req, res) => {
  try {
    const { locationKey, limit = 50 } = req.query;
    const records = await getWeatherIntervals(locationKey, Number(limit));
    res.json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (err) {
    console.error("[AI Weather NWP] Error fetching weather history:", err);
    res.status(500).json({ success: false, error: "Failed to fetch weather intervals" });
  }
});

/**
 * Route: Perbandingan Model Cuaca Multi-Platform (ECMWF, GFS, ICON, BMKG vs AI NWP)
 */
router.get("/weather-models-comparison", verifyOptionalToken, async (req, res) => {
  try {
    const { lat = -7.25, lng = 112.75 } = req.query;
    const latNum = Number(lat);
    const lngNum = Number(lng);
    const key3 = `${latNum.toFixed(3)},${lngNum.toFixed(3)}`;
    const key2 = `${latNum.toFixed(2)},${lngNum.toFixed(2)}`;
    let history = await getWeatherIntervals(key3, 20);
    if (!history || history.length === 0) {
      history = await getWeatherIntervals(key2, 20);
    }

    const models = (history[0]?.models || []).filter(model => typeof model?.modelName === 'string' && Number.isFinite(model.temperature));

    res.json({
      success: true,
      locationKey: key3,
      models,
      dataStatus: models.length ? "CACHED" : "UNAVAILABLE",
      accuracyValidated: false,
      note: "Hanya riwayat masukan yang tersimpan; bukan pengambilan model terbaru atau validasi akurasi.",
      historicalCount: history.length,
      recentHistory: history.slice(0, 10),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to compute model comparisons" });
  }
});


router.post("/generate", verifyOptionalToken, async (req, res) => {
  const { contents, jsonMode, type, systemInstruction } = req.body;

  if (!type || !["quiz", "chat", "chatbot"].includes(type)) {
    return res.status(400).json({
      success: false,
      error:
        "Missing or invalid required field: type (must be quiz, chat, or chatbot)",
    });
  }

  const ai = getAiInstance(type);

  if (!ai) {
    return res.status(503).json({
      success: false,
      error: `AI service is temporarily unavailable (Missing Configuration for ${type})`,
    });
  }

  if (!contents || !Array.isArray(contents) || contents.length === 0) {
    return res.status(400).json({
      success: false,
      error:
        "Missing or invalid required field: contents (must be a non-empty array)",
    });
  }

  try {
    const config = {
      temperature: 0.7,
    };
    if (jsonMode) {
      config.responseMimeType = "application/json";
    }
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }

    console.log(`[AI] feature=${type} keyConfigured=true`);

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents,
      config,
    });

    res.json({ success: true, data: { text: response.text ?? "" } });
  } catch (err) {
    console.error(`[AI] Error (${type}):`, err.message);
    if (err.name === "AbortError") {
      return res.status(504).json({
        success: false,
        error: "Koneksi ke layanan AI terputus. Silakan coba lagi.",
      });
    }

    if (err.status === 429) {
      return res.status(429).json({
        success: false,
        error:
          "Sistem AI kami saat ini sedang sangat sibuk (Kuota Tercapai). Harap coba beberapa saat lagi.",
      });
    }

    const statusCode = err.status || 500;
    res.status(statusCode).json({
      success: false,
      error: "Terjadi kesalahan internal pada layanan AI.",
    });
  }
});

/**
 * Endpoint Skenario Bencana Berbasis Sintesis Fisika Spasial Nyata
 * POST /api/ai/grounded-scenario
 */
router.post("/grounded-scenario", verifyOptionalToken, async (req, res) => {
  try {
    const { schoolId, lat, lng, floorLevel = 2 } = req.body || {};
    const db = await readDB();

    let targetSchool = (db.schools || []).find((s) => s.id === schoolId);
    if (!targetSchool) {
      const pLat = parseFloat(lat);
      const pLng = parseFloat(lng);
      targetSchool = {
        id: schoolId || "sch-custom",
        name: req.body.schoolName || "Sekolah Pilihan",
        lat: Number.isFinite(pLat) ? pLat : -6.2088,
        lng: Number.isFinite(pLng) ? pLng : 106.8456,
        slopeDegrees: 8,
      };
    }

    const earthquakes = (db.spatialCache?.["bmkg_earthquakes"] || [
      { lat: -6.85, lng: 107.12, magnitude: 5.6, depthKm: 10, place: "Sesar Darat Aktif" },
    ]);

    const synthesis = synthesizeSchoolRisk({
      school: targetSchool,
      earthquakes,
      volcanoes: [],
      weather: { precipitation: 15.0 },
    });

    const gm = synthesis.seismicSynthesis;
    const pgaG = gm ? gm.pgaG : 0.25;
    const mmi = gm ? gm.mmiEstimate : 6.0;
    const leadTime = gm ? gm.leadTimeSec : 12;
    const intensity = gm ? gm.humanDescription.intensity : "Guncangan Kuat";

    const ai = getAiInstance("quiz");
    if (!ai || Date.now() < geminiQuotaCooldownUntil) {
      // Deterministic scientific fallback (No hallucination!)
      return res.json({
        success: true,
        source: "deterministic-spatial-engine",
        scenario: {
          title: `Skenario Guncangan Nyata: ${targetSchool.name}`,
          schoolName: targetSchool.name,
          pgaG,
          mmi,
          leadTimeSeconds: leadTime,
          hazardSummary: `${intensity} akibat sesar terdekat. Waktu jeda gelombang sekunder: ${leadTime} detik.`,
          situation: `Anda dan 32 siswa sedang berada di ruang kelas Lantai ${floorLevel}. Sensor peringatan dini berbunyi: guncangan gelombang S diprediksi tiba dalam ${leadTime} detik dengan PGA ${pgaG}g. Tangga keluar utama memiliki lebar 1.2 meter dan padat.`,
          question: "Apa instruksi terbaik yang harus diberikan guru dalam 10 detik pertama?",
          options: [
            `Instruksikan seluruh siswa berhamburan lari menuruni tangga lantai ${floorLevel} secepatnya.`,
            "Perintahkan 'DROP, COVER, HOLD ON' di bawah meja kokoh; lindungi kepala dan jauhi kaca jendela.",
            "Buka seluruh pintu dan jendela lalu berdiri tegak di tengah ruangan.",
            "Segera naik ke atap gedung sekolah untuk melihat pusat guncangan gempa."
          ],
          correctIndex: 1,
          scientificRationale: `Dengan lead time hanya ${leadTime} detik dan PGA ${pgaG}g (${intensity}), mengevakuasi puluhan siswa menuruni tangga sempit (1.2m) dalam waktu singkat memicu kepanikan mematikan (stampede) dan risiko tertimpa puing saat guncangan tiba di tangga. Bertahan di bawah meja kokoh (Drop-Cover-Hold On) adalah mitigasi fase pertama paling aman.`,
        },
      });
    }

    const promptText = `Anda adalah ahli keselamatan kebencanaan sekolah. 
Berdasarkan data fisika nyata:
- Sekolah: ${targetSchool.name}
- Estimasi PGA: ${pgaG}g (Skala ${intensity}, MMI ${mmi})
- Waktu Jeda Peringatan Dini (Lead Time Gelombang S): ${leadTime} detik
- Posisi: Lantai ${floorLevel} gedung sekolah
Buatlah skenario dilema keputusan evakuasi pilihan ganda (4 opsi) dalam format JSON murni:
{
  "title": string,
  "schoolName": string,
  "pgaG": number,
  "mmi": number,
  "leadTimeSeconds": number,
  "hazardSummary": string,
  "situation": string,
  "question": string,
  "options": [string, string, string, string],
  "correctIndex": number,
  "scientificRationale": string
}
Gunakan Bahasa Indonesia ilmiah yang mendidik dan mudah dipahami siswa.`;

    let scenarioData = null;
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        config: { temperature: 0.3, responseMimeType: "application/json" },
      });
      scenarioData = JSON.parse((response.text || "").trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, ""));
      return res.json({
        success: true,
        source: "gemini-grounded-spatial",
        scenario: scenarioData,
      });
    } catch (aiErr) {
      console.warn("[AI] Gemini key unavailable/invalid, using deterministic spatial fallback:", aiErr.message);
      return res.json({
        success: true,
        source: "deterministic-spatial-engine",
        scenario: {
          title: `Skenario Guncangan Nyata: ${targetSchool.name}`,
          schoolName: targetSchool.name,
          pgaG,
          mmi,
          leadTimeSeconds: leadTime,
          hazardSummary: `${intensity} akibat sesar terdekat. Waktu jeda gelombang sekunder: ${leadTime} detik.`,
          situation: `Anda dan 32 siswa sedang berada di ruang kelas Lantai ${floorLevel}. Sensor peringatan dini berbunyi: guncangan gelombang S diprediksi tiba dalam ${leadTime} detik dengan PGA ${pgaG}g. Tangga keluar utama memiliki lebar 1.2 meter dan padat.`,
          question: "Apa instruksi terbaik yang harus diberikan guru dalam 10 detik pertama?",
          options: [
            `Instruksikan seluruh siswa berhamburan lari menuruni tangga lantai ${floorLevel} secepatnya.`,
            "Perintahkan 'DROP, COVER, HOLD ON' di bawah meja kokoh; lindungi kepala dan jauhi kaca jendela.",
            "Buka seluruh pintu dan jendela lalu berdiri tegak di tengah ruangan.",
            "Segera naik ke atap gedung sekolah untuk melihat pusat guncangan gempa."
          ],
          correctIndex: 1,
          scientificRationale: `Dengan lead time hanya ${leadTime} detik dan PGA ${pgaG}g (${intensity}), mengevakuasi puluhan siswa menuruni tangga sempit (1.2m) dalam waktu singkat memicu kepanikan mematikan (stampede) dan risiko tertimpa puing saat guncangan tiba di tangga. Bertahan di bawah meja kokoh (Drop-Cover-Hold On) adalah mitigasi fase pertama paling aman.`,
        },
      });
    }
  } catch (error) {
    console.error("Error in grounded-scenario:", error);
    return res.status(500).json({
      success: false,
      error: "Gagal membuat skenario analitis: " + error.message,
    });
  }
});

/**
 * Endpoint AI Route & Weather Copilot Geospasial
 * POST /api/ai/route-copilot
 * Menelusuri seluruh lintasan jalan, memprediksi kondisi per pukul/tahapan waktu,
 * dan memberikan rekomendasi serta kesimpulan final bagi pengguna.
 */
router.post("/route-copilot", verifyOptionalToken, async (req, res) => {
  try {
    const {
      origin,
      destination,
      distanceKm,
      durationText,
      durationMin,
      departureTimeText,
      arrivalTimeText,
      timelineStages = [],
      safetyScore,
      safetyLevel,
      weatherRiskSummary,
      volcanoHazardSummary,
      userQuery,
      chatHistory = [],
    } = req.body || {};

    const originName = origin?.label || "Titik Asal";
    const destName = destination?.label || "Titik Tujuan";
    const dist = distanceKm || 0;
    const dur = durationText || `${durationMin || 0} menit`;

    const generateDeterministicCopilot = () => {
      const qLower = (userQuery || "").toLowerCase();
      let responseText = "";

      const timelineText = timelineStages.length > 0
        ? timelineStages.map((s) => `• Pukul ${s.estimatedHour} (${s.milestoneKm} km): ${s.title} — ${s.weatherSummary}. ${s.safetyNote}`).join("\n")
        : `• Pukul ${departureTimeText || "Sekarang"}: Berangkat dari ${originName}\n• Pukul ${arrivalTimeText || "Estimasi"}: Tiba di ${destName}`;

      const recSpeed = safetyScore && safetyScore < 70 ? "40 - 50 km/jam" : "50 - 65 km/jam";

      if (qLower.includes("cuaca") || qLower.includes("hujan") || qLower.includes("panas")) {
        responseText = `🌦️ Analisis Cuaca Koridor Perjalanan (${originName} ➔ ${destName})\n\n` +
          `Berdasarkan data observasi dan model meteorologi sepanjang ${dist} km:\n` +
          `${weatherRiskSummary || "Kondisi cuaca terpantau normal dan kondusif di sepanjang koridor."}\n\n` +
          `⏱️ Prediksi Kondisi per Pukul:\n${timelineText}\n\n` +
          `💡 Rekomendasi Antisipasi: Kecepatan aman yang dianjurkan ${recSpeed}. Pastikan wiper dan lampu utama berfungsi prima jika melintasi area berawan tebal.`;
      } else if (qLower.includes("aman") || qLower.includes("bahaya") || qLower.includes("gunung") || qLower.includes("bencana")) {
        const hazardInfo = volcanoHazardSummary || "Tidak terdeteksi ancaman vulkanik atau bencana geologis aktif dalam radius terdekat rute.";
        responseText = `🛡️ Evaluasi Keamanan Jalur (${safetyLevel || "Cukup Aman"} - Skor: ${safetyScore || 90}/100)\n\n` +
          `• Status Geologis & Alam: ${hazardInfo}\n` +
          `• Kondisi Jalan & Lingkungan: ${weatherRiskSummary || "Jalur jalan raya terpantau kondusif."}\n\n` +
          `⏱️ Estimasi Timeline Perjalanan:\n${timelineText}\n\n` +
          `🚦 Kesimpulan: Rute dinilai aman untuk dilalui dengan tetap mematuhi batas kecepatan dan memperhatikan rambu lalu lintas setempat.`;
      } else if (qLower.includes("kapan") || qLower.includes("jam berapa") || qLower.includes("waktu") || qLower.includes("berangkat")) {
        responseText = `⏰ Rekomendasi Waktu Keberangkatan & Estimasi Perjalanan\n\n` +
          `• Jarak Tempuh: ${dist} km (~${dur})\n` +
          `• Rekomendasi Waktu Berangkat: Pukul ${departureTimeText || "sekarang"} adalah jendela waktu yang ideal karena kondisi cuaca terpantau kondusif.\n` +
          `• Estimasi Tiba di Tujuan: Pukul ${arrivalTimeText || "sesuai estimasi"}.\n\n` +
          `🛣️ Tahapan Lintasan yang Dilewati:\n${timelineText}\n\n` +
          `💡 Antisipasi Perjalanan: Luangkan waktu istirahat sekitar 10-15 menit pada titik pertengahan perjalanan untuk menjaga konsentrasi berkendara.`;
      } else {
        responseText = `🧭 Panduan Rute & Navigasi Perjalanan (${originName} ➔ ${destName})\n\n` +
          `Hasil penelusuran koridor jalan sepanjang ${dist} km (estimasi waktu tempuh ${dur}):\n\n` +
          `⏱️ Prediksi Waktu & Rangkaian Lintasan:\n${timelineText}\n\n` +
          `🌤️ Kondisi Cuaca & Jalan: ${weatherRiskSummary || "Kondisi jalan normal dan cuaca bersahabat."}\n` +
          `🛡️ Status Keamanan: ${safetyLevel || "Sangat Aman"} (Skor: ${safetyScore || 92}/100).\n\n` +
          `✅ Kesimpulan Final: Kondisi jalan dan atmosfer mendukung untuk melakukan perjalanan sekarang. Kecepatan jelajah disarankan ${recSpeed}. Selamat berkendara dengan aman!`;
      }

      return responseText;
    };

    const ai = getAiInstance("chat");
    if (!ai || Date.now() < geminiQuotaCooldownUntil) {
      return res.json({
        success: true,
        source: "deterministic-route-engine",
        text: generateDeterministicCopilot(),
      });
    }

    const promptLines = [
      `Anda adalah AI Route & Weather Copilot Geospasial Harmony tingkat lanjut.`,
      `Tugas Anda adalah menelusuri seluruh jalan yang akan dilalui, memprediksi pukul berapanya perjalanan melewati tiap segmen, mengevaluasi cuaca & keselamatan, membuat kesimpulan yang jelas, dan memberikan jawaban final yang membantu pengguna mengantisipasi waktu perjalanannya.`,
      ``,
      `DATA RUTE LENGKAP:`,
      `- Titik Asal: ${originName} (${origin?.lat ? Number(origin.lat).toFixed(4) : "—"}°, ${origin?.lng ? Number(origin.lng).toFixed(4) : "—"}°)`,
      `- Titik Tujuan: ${destName} (${destination?.lat ? Number(destination.lat).toFixed(4) : "—"}°, ${destination?.lng ? Number(destination.lng).toFixed(4) : "—"}°)`,
      `- Total Jarak: ${dist} km`,
      `- Estimasi Durasi Mengemudi: ${dur}`,
      `- Waktu Keberangkatan Terhitung: ${departureTimeText || "Sekarang"}`,
      `- Estimasi Waktu Tiba: ${arrivalTimeText || "Sesuai durasi"}`,
      `- Tingkat Keamanan: ${safetyLevel || "Aman"} (Skor: ${safetyScore || 90}/100)`,
      `- Ringkasan Cuaca Koridor: ${weatherRiskSummary || "Normal"}`,
      `- Bahaya Geologis / Vulkanik: ${volcanoHazardSummary || "Nihil"}`,
      ``,
      `TAHAPAN MILESTONE & ESTIMASI PUKUL SEPANJANG JALAN:`,
      ...(timelineStages.map(
        (s) => `• Pukul ${s.estimatedHour} (KM ${s.milestoneKm}): ${s.title} | Cuaca: ${s.weatherSummary} | Jalan: ${s.roadCondition} | Catatan: ${s.safetyNote}`
      )),
      ``,
      `PERTANYAAN / PESAN DARI PENGGUNA:`,
      userQuery ? `"${userQuery}"` : `Berikan briefing menyeluruh tentang kelayakan rute, prediksi jam perjalanan, dan saran antisipasi.`,
      ``,
      `INSTRUKSI JAWABAN:`,
      `1. Jawab pertanyaan pengguna secara lugas, solutif, ramah, dan berbasis data di atas.`,
      `2. Uraikan penelusuran waktu (sebutkan estimasi pukul keberangkatan, titik tengah perjalanan, dan jam tiba di tujuan) agar pengguna dapat mengira-ngira dan mengantisipasi waktu perjalanan mereka.`,
      `3. Sertakan evaluasi cuaca dan kondisi jalan (misal jalan kering, basah, berangin, atau kecepatan aman yang dianjurkan).`,
      `4. Berikan kesimpulan final apakah saat ini baik untuk berangkat beserta tips antisipasi praktis.`,
      `5. Gunakan bahasa Indonesia yang baik dan profesional.`,
    ];

    const historyMessages = (chatHistory || []).slice(-4).map((m) => ({
      role: m.role === "ai" ? "model" : "user",
      parts: [{ text: m.text }],
    }));

    try {
      const contents = [
        ...historyMessages,
        { role: "user", parts: [{ text: promptLines.join("\n") }] },
      ];

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents,
        config: {
          temperature: 0.4,
        },
      });

      const responseText = response?.text?.trim();
      if (responseText) {
        return res.json({
          success: true,
          source: "gemini-route-copilot",
          text: responseText,
        });
      }
      throw new Error("Empty AI response");
    } catch (aiErr) {
      console.warn("[AI] Gemini route copilot error, falling back to deterministic synthesis:", aiErr.message);
      return res.json({
        success: true,
        source: "deterministic-route-engine",
        text: generateDeterministicCopilot(),
      });
    }
  } catch (err) {
    console.error("Error in route-copilot endpoint:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
