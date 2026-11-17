import {
  pool,
  timeoutQuery,
  readDB,
  getAccountById,
  getProfileByUserId,
} from "../repositories/repository.js";

export const MAX_CHAT_MEMORY = 6;

const SMAN1_NGORO_DEFAULT_SCHOOL_ID = "ffdcdf34-fc99-4209-913e-5a6042e957ad";

const JV_KRAMA_RE =
  /\b(nggih|monggo|matur\s*nuwun|nyuwun\s*sewu|kados\s*pundi|sampun|dereng|menapa|panjenengan|dalem|badhe|saged|mboten|inggih|sugeng)\b/i;

const JV_NGOKO_RE =
  /\b(rek|piye|pie|opo|opoo|wis|wes|durung|urung|nang|ning|ndek|engko|saiki|lindu|udan|banyu|sampeyan|sampean|awakmu|aku\s+kudu|gak|ora|iso|isok|ae|wae|lho|lo|yo|yaopo|ngene|ngono|ojo|aja|mlayu|metu|cilik|gedhe|apik|koyo|kaya|sekolahan|kelasmu|banjire|gununge|nylametne)\b/i;

const EN_HINT_RE =
  /\b(how\s+to|what\s+is|can\s+you|please|earthquake|evacuation|school|teacher|student|weather|disaster|help\s+me|explain)\b/i;

/**
 * Extracts text from a Gemini-style message item without mutating caller objects.
 */
export function extractMessageText(item) {
  if (!item) return "";
  if (typeof item === "string") return item.trim();
  if (typeof item.text === "string") return item.text.trim();
  if (Array.isArray(item.parts)) {
    return item.parts
      .map((p) => (typeof p?.text === "string" ? p.text : ""))
      .join(" ")
      .trim();
  }
  return "";
}

/**
 * Enforces the strict 6-message rolling memory window.
 * Keeps at most `maxMessages` (6) newest turns; drops oldest entries first so
 * message 7+ automatically evicts the earliest top message.
 */
export function trimChatMemory(messages, maxMessages = MAX_CHAT_MEMORY) {
  if (!Array.isArray(messages)) return [];
  const cap = Math.max(1, Number(maxMessages) || MAX_CHAT_MEMORY);
  return messages.slice(-cap);
}

/**
 * Formats trimmed memory for Gemini `generateContent` while ensuring the
 * payload strictly starts with a `user` turn (API requirement) and stays <= 6.
 */
export function trimChatMemoryForGemini(contents, maxMessages = MAX_CHAT_MEMORY) {
  const normalized = trimChatMemory(contents, maxMessages)
    .map((entry) => {
      const text = extractMessageText(entry);
      if (!text) return null;
      const role = entry?.role === "model" ? "model" : "user";
      return { role, parts: [{ text }] };
    })
    .filter(Boolean);

  const firstUserIdx = normalized.findIndex((item) => item.role === "user");
  if (firstUserIdx > 0) {
    return normalized.slice(firstUserIdx);
  }
  return normalized;
}

/**
 * Detects user language and daily dialect register so GeoBot naturally mirrors
 * Indonesian, East Java Ngoko/Arekan (Ngoro/Mojokerto), Jawa Krama Alus, or English.
 */
export function detectUserLanguageTone(text = "") {
  const sample = String(text || "").trim();
  if (!sample) return "id_casual";
  if (JV_KRAMA_RE.test(sample)) return "jv_krama";
  if (JV_NGOKO_RE.test(sample)) return "jv_ngoko";
  if (EN_HINT_RE.test(sample) && !/\b(yang|dan|di|ke|dari|ini|itu|apa|bagaimana|gimana)\b/i.test(sample)) {
    return "en";
  }
  if (/\b(anda|bapak|ibu|mohon|silakan|evaluasi|kurikulum|laporan|rekapitulasi)\b/i.test(sample)) {
    return "id_formal";
  }
  return "id_casual";
}

function sanitizeAccountForAI(account) {
  if (!account || typeof account !== "object") return null;
  const { passwordHash: _ignored, token: _t, ...safe } = account;
  return {
    id: safe.id,
    name: safe.name || "Pengguna Harmony",
    email: safe.email || null,
    role: safe.role || "student",
    schoolId: safe.schoolId || SMAN1_NGORO_DEFAULT_SCHOOL_ID,
  };
}

async function queryOptionalRows(sql, params = []) {
  if (!pool) return null;
  try {
    const res = await timeoutQuery(pool.query(sql, params), 4000);
    return res?.rows || [];
  } catch {
    return null;
  }
}

/**
 * Builds an auth-scoped snapshot of the logged-in user's real Harmony data:
 * account, profile, school + hazard analysis, quizzes, classes, digital twin maps/runs,
 * surveys, and events. Sensitive credentials (passwordHash) are always stripped.
 */
export async function buildUserDatabaseContext(reqUser, dbOverride = null) {
  const userId = reqUser?.id || reqUser?.sub || null;

  if (!userId && !dbOverride) {
    return {
      authenticated: false,
      account: null,
      profile: null,
      school: {
        id: SMAN1_NGORO_DEFAULT_SCHOOL_ID,
        name: "SMAN 1 Ngoro",
        regency: "Kabupaten Mojokerto",
        province: "Jawa Timur",
      },
      summaryText:
        "Status Login: Tamu / Belum login (akses database pribadi dibatasi; default konteks sekolah SMAN 1 Ngoro, Kab. Mojokerto).",
    };
  }

  let db = dbOverride || null;
  let account = null;
  let profile = null;

  if (db) {
    account = (db.accounts || []).find((a) => a.id === userId) || null;
    profile = (db.profiles || []).find((p) => p.userId === userId) || null;
  } else if (pool) {
    account = await getAccountById(userId).catch(() => null);
    profile = await getProfileByUserId(userId).catch(() => null);
  } else {
    db = await readDB().catch(() => null);
    account = (db?.accounts || []).find((a) => a.id === userId) || null;
    profile = (db?.profiles || []).find((p) => p.userId === userId) || null;
  }

  const safeAccount = sanitizeAccountForAI(
    account || (reqUser ? { id: userId, role: reqUser.role, name: reqUser.name } : null),
  );
  const schoolId =
    profile?.schoolId || safeAccount?.schoolId || SMAN1_NGORO_DEFAULT_SCHOOL_ID;
  const userRole = safeAccount?.role || reqUser?.role || "student";

  let school = null;
  let schoolAnalysis = null;
  let userQuizzes = [];
  let userClasses = [];
  let dtRuns = [];
  let dtMaps = [];
  let dtRooms = [];
  let surveyStats = { userResponses: 0, schoolResponses: 0, latestScore: null };
  let upcomingEvents = [];

  if (db) {
    school =
      (db.schools || []).find((s) => s.id === schoolId) ||
      (db.schools || []).find((s) => /ngoro/i.test(s.name || "")) ||
      null;
    schoolAnalysis = db.schoolDisasterAnalysis?.[schoolId] || null;

    userQuizzes = (db.quizHistories || [])
      .filter((h) => h.userId === userId)
      .slice(-5);

    userClasses = (db.classes || []).filter((c) => {
      if (userRole === "teacher" || userRole === "developer") {
        return c.teacherId === userId || c.schoolId === schoolId;
      }
      return (
        c.id === profile?.classId ||
        (Array.isArray(c.studentIds) && c.studentIds.includes(userId)) ||
        (Array.isArray(c.students) && c.students.includes(userId))
      );
    });

    const allResults = Array.isArray(db.dtResults) ? db.dtResults : [];
    dtRuns = allResults
      .filter((r) =>
        userRole === "teacher" || userRole === "developer"
          ? r.schoolId === schoolId || r.userId === userId
          : r.userId === userId,
      )
      .slice(-5);

    dtMaps = Object.values(db.gridMaps || {})
      .filter((m) => m.schoolId === schoolId || m.isPublic)
      .slice(0, 6);

    dtRooms = Object.values(db.dtRooms || {})
      .filter((rm) => rm.schoolId === schoolId || rm.hostId === userId)
      .slice(-5);

    const allSurveys = Array.isArray(db.surveys) ? db.surveys : [];
    const ownSurveys = allSurveys.filter((sv) => sv.userId === userId);
    const schoolSurveys = allSurveys.filter((sv) => sv.schoolId === schoolId);
    surveyStats = {
      userResponses: ownSurveys.length,
      schoolResponses: schoolSurveys.length,
      latestScore:
        ownSurveys[ownSurveys.length - 1]?.score ??
        ownSurveys[ownSurveys.length - 1]?.postTestScore ??
        null,
    };

    upcomingEvents = (db.events || []).slice(0, 5);
  } else if (pool) {
    const [
      schoolRows,
      analysisRows,
      quizRows,
      classRows,
      resultRows,
      mapRows,
      roomRows,
      surveyRows,
      eventRows,
    ] = await Promise.all([
      queryOptionalRows("SELECT data FROM schools WHERE id = $1 LIMIT 1", [schoolId]),
      queryOptionalRows(
        "SELECT data FROM school_disaster_analysis WHERE school_id = $1 LIMIT 1",
        [schoolId],
      ),
      queryOptionalRows(
        "SELECT data FROM quiz_histories WHERE data->>'userId' = $1 LIMIT 8",
        [userId],
      ),
      queryOptionalRows(
        "SELECT data FROM classes WHERE data->>'schoolId' = $1 LIMIT 10",
        [schoolId],
      ),
      queryOptionalRows(
        "SELECT data FROM dt_results WHERE data->>'userId' = $1 OR data->>'schoolId' = $2 LIMIT 8",
        [userId, schoolId],
      ),
      queryOptionalRows(
        "SELECT id, name, status FROM digital_twin_maps WHERE school_id = $1 OR is_public = true LIMIT 6",
        [schoolId],
      ),
      queryOptionalRows("SELECT data FROM dt_rooms LIMIT 10"),
      queryOptionalRows(
        "SELECT data FROM surveys WHERE data->>'userId' = $1 OR data->>'schoolId' = $2 LIMIT 20",
        [userId, schoolId],
      ),
      queryOptionalRows("SELECT data FROM events LIMIT 5"),
    ]);

    school = schoolRows?.[0]?.data || null;
    schoolAnalysis = analysisRows?.[0]?.data || null;
    userQuizzes = (quizRows || []).map((r) => r.data).slice(-5);

    const rawClasses = (classRows || []).map((r) => r.data);
    userClasses = rawClasses.filter((c) =>
      userRole === "teacher" || userRole === "developer"
        ? true
        : c.id === profile?.classId ||
          (Array.isArray(c.studentIds) && c.studentIds.includes(userId)),
    );

    dtRuns = (resultRows || [])
      .map((r) => r.data)
      .filter((r) =>
        userRole === "teacher" || userRole === "developer" ? true : r.userId === userId,
      )
      .slice(-5);
    dtMaps = mapRows || [];
    dtRooms = (roomRows || [])
      .map((r) => r.data)
      .filter((rm) => rm.schoolId === schoolId || rm.hostId === userId)
      .slice(-5);

    const svList = (surveyRows || []).map((r) => r.data);
    const ownSv = svList.filter((sv) => sv.userId === userId);
    surveyStats = {
      userResponses: ownSv.length,
      schoolResponses: svList.length,
      latestScore:
        ownSv[ownSv.length - 1]?.score ??
        ownSv[ownSv.length - 1]?.postTestScore ??
        null,
    };
    upcomingEvents = (eventRows || []).map((r) => r.data);
  }

  const schoolName = school?.name || "SMAN 1 Ngoro";
  const quizLines = userQuizzes.length
    ? userQuizzes
        .map((q) => `${q.topicId || "umum"}: ${q.score ?? "-"}/100`)
        .join(", ")
    : "Belum ada riwayat kuis";

  const classLines = userClasses.length
    ? userClasses
        .slice(0, 5)
        .map((c) => `${c.name || c.title || c.id} (kode: ${c.code || "-"})`)
        .join(", ")
    : "Belum tergabung kelas";

  const dtRunLines = dtRuns.length
    ? dtRuns
        .map(
          (r) =>
            `${r.scenarioName || r.disasterType || "Evakuasi"} skor=${r.score ?? "-"} grade=${r.grade || "-"} waktu=${r.finishTimeMs ? `${Math.round(r.finishTimeMs / 1000)}s` : "-"}`,
        )
        .join("; ")
    : "Belum ada hasil simulasi evakuasi";

  const dtMapLines = dtMaps.length
    ? dtMaps.map((m) => `${m.name || m.id} (${m.status || "aktif"})`).join(", ")
    : "Denah SMAN 1 Ngoro bawaan tersedia";

  const eventLines = upcomingEvents.length
    ? upcomingEvents.map((ev) => ev.title || ev.name || ev.id).join(", ")
    : "Belum ada jadwal event aktif";

  const topicScoresText =
    profile?.topicScores && Object.keys(profile.topicScores).length > 0
      ? Object.entries(profile.topicScores)
          .slice(0, 6)
          .map(([k, v]) => `${k}:${v}`)
          .join(", ")
      : "Belum ada nilai per topik";

  const summaryLines = [
    `Akun: ${safeAccount?.name || "Pengguna"} | Peran: ${userRole} | Email: ${safeAccount?.email || "-"}`,
    `Sekolah: ${schoolName} (${school?.regency || "Kab. Mojokerto"}, ${school?.province || "Jawa Timur"}) | Koordinat: ${school?.lat ?? -7.537}, ${school?.lng ?? 112.621} | Skor Risiko Sekolah: ${school?.riskScore ?? schoolAnalysis?.overallScore ?? "tersedia di peta"}`,
    `Profil Belajar: Level ${profile?.level ?? 1} | XP ${profile?.xp ?? 0} | Poin ${profile?.totalPoints ?? 0} | Streak ${profile?.streak ?? 0} hari | Kelas ID: ${profile?.classId || "-"}`,
    `Skor Topik Kuis: ${topicScoresText}`,
    `Riwayat Kuis Terakhir: ${quizLines}`,
    `Kelas Terkait: ${classLines}`,
    `Denah & Simulasi Harmony Twin: Peta=[${dtMapLines}] | Hasil Terakhir=[${dtRunLines}] | Room=${dtRooms.length}`,
    `Survei Sekolah: Isian pribadi=${surveyStats.userResponses} (${surveyStats.latestScore != null ? `skor ${surveyStats.latestScore}` : "belum ada skor"}), Data sekolah=${surveyStats.schoolResponses}`,
    `Agenda / Event Aktif: ${eventLines}`,
  ];

  return {
    authenticated: true,
    account: safeAccount,
    profile: profile
      ? {
          level: profile.level ?? 1,
          xp: profile.xp ?? 0,
          totalPoints: profile.totalPoints ?? 0,
          classId: profile.classId ?? null,
          streak: profile.streak ?? 0,
        }
      : null,
    school: {
      id: schoolId,
      name: schoolName,
      regency: school?.regency || "Kabupaten Mojokerto",
      province: school?.province || "Jawa Timur",
    },
    counts: {
      quizzes: userQuizzes.length,
      classes: userClasses.length,
      dtRuns: dtRuns.length,
      dtMaps: dtMaps.length,
      dtRooms: dtRooms.length,
      surveys: surveyStats.userResponses,
      events: upcomingEvents.length,
    },
    summaryText: summaryLines.join("\n"),
  };
}

/**
 * Generates GeoBot's complete system instruction combining:
 * 1) Official Harmony SPAB presentation & platform architecture narrative + SMAN 1 Ngoro layout
 * 2) Live authenticated user database snapshot
 * 3) Human conversational skill + ajipurn/bahasa-indonesia-skill (natural Indonesian & daily Javanese)
 * 4) Strict 6-message memory discipline & proactive clarifying questions
 */
export function buildHarmonyGeoSystemPrompt({
  userContext,
  customInstruction = "",
  latestUserText = "",
} = {}) {
  const tone = detectUserLanguageTone(latestUserText);
  const toneGuide = {
    jv_krama:
      "Pengguna nganggo Basa Jawa Krama/Alus. Jawaben nganggo Jawa Krama sing sopan, anget, lan gampang dimengerti (kayata 'nggih', 'monggo', 'sampun', 'dereng', 'matur nuwun'). Tetep jaga istilah tombol UI lan langkah darurat ben cetha lan ora mbingungake.",
    jv_ngoko:
      "Pengguna ngobrol nganggo Basa Jawa padinan (Ngoko/Arekan Jawa Timur). Jawaben nganggo Basa Jawa padinan sing natural, akrab, lan sopan (kayata 'rek', 'wis', 'durung', 'nang', 'pas', 'gak', 'isok', 'aman ae') kaya kanca sinau nang SMAN 1 Ngoro. Ojo nganggo tembung kasar utawa campur dialek sing aneh.",
    en: "The user wrote in English. Reply in clear, warm, concise natural English while preserving exact Harmony menu names.",
    id_formal:
      "Pengguna memakai Bahasa Indonesia formal/rapi (guru/profesional). Jawab lugas, ramah, langsung ke inti tanpa kalimat terjemahan kaku.",
    id_casual:
      "Pengguna memakai Bahasa Indonesia sehari-hari. Ngobrol santai, hangat, jelas seperti mentor manusia. Hindari kalimat kaku ala AI ('hal ini dikarenakan oleh', 'dalam rangka untuk', 'melakukan pengecekan', 'berikut adalah penjelasan lengkap').",
  }[tone];

  const dbSection =
    userContext?.summaryText ||
    "Data database belum dimuat; jawab berdasarkan arsitektur resmi Harmony dan tanyakan detail bila perlu.";

  return `Kamu adalah GeoBot, asisten AI kebencanaan resmi di platform HARMONY (Satuan Pendidikan Aman Bencana / SPAB).

[NARASI & ARSITEKTUR RESMI HARMONY]
- Misi Harmony: Menggabungkan Pembelajaran AI Adaptif, Pemetaan Geospasial WebGIS Real-Time, Simulasi Evakuasi 2D Harmony Twin, dan Indeks Ketahanan Sekolah (Skor Harmony / GSS) demi mendukung SDGs 4 (Pendidikan Berkualitas), 11 (Kota & Permukiman Tangguh), dan 13 (Penanganan Perubahan Iklim).
- Menu Aplikasi Saat Ini (gunakan nama menu ini agar pemula, pelajar, maupun guru tidak bingung):
  1. "Peta Utama" (Harmony Maps): Peta interaktif gempa BMKG, gunung api (termasuk G. Penanggungan & Arjuno-Welirang), cuaca, lapisan satelit, dan rute evakuasi sekolah.
  2. "Cuaca & Satelit" (Studio Geospasial): Pantauan cuaca harian, perbandingan model cuaca, BMKG, dan analisis wilayah sekolah.
  3. "Tanya GeoBot" (Pembelajaran AI): Ngobrol dengan GeoBot dan pelajari modul mitigasi bencana.
  4. "Latihan Soal" (Pertanyaan Bencana): Kuis adaptif dan evaluasi kesiapsiagaan siswa.
  5. "Simulasi Denah" (Harmony Twin) & "Main Bareng" (Gabung Room / Game): Simulasi penyelamatan diri 2D berbasis denah nyata SMAN 1 Ngoro (bisa solo maupun mabar/online antar siswa).
  6. "Skor Harmony", "Ketahanan Sekolah", "Survei Sekolah", "Agenda & Lomba" (Events), "Dasbor Guru" (khusus guru/admin), dan "Profil Saya".
- Lokasi Sekolah Fokus Demo & Denah Nyata: SMAN 1 Ngoro (Jl. Candi Jolotundo, Kutogirang, Ngoro, Kab. Mojokerto 61385, Jawa Timur). Landmark denah resmi SMAN 1 Ngoro: Lapangan Upacara (Titik Kumpul Utama), Kelas 1 sampai 26, GOR, Lab. Fisika, Lab. Kimia, Ruang Guru, Lobi Tata Usaha, R. Kasek, R. Meeting, Ruang BK, Masjid Sabilunnajah, UKS, Ruang Operator, R. OSIS, Perpustakaan, Koperasi (KOP), Kantin Sekolah, serta Parkir Guru & Siswa.
- DATA VALIDASI EMPIRIS & LEARNING GAIN SLIDE 13 PPT HARMONY:
  * Narasi Resmi Uji Coba: "Melalui uji coba yang telah dilaksanakan, seluruh indikator utama berhasil melampaui target awal yang ditetapkan. Pertama, peningkatan hasil belajar mencapai nilai N-gain sebesar 0,74 (kategori tinggi), melampaui batas minimal 0,7. Kedua, akurasi pengambilan keputusan tercatat sebesar 85 persen dari target minimal 80 persen. Ketiga, efisiensi waktu respons—seperti kemampuan bertindak dalam kurun waktu kurang dari 15 detik—mencapai 87 persen, mengungguli standar 80 persen. Keempat, tingkat konsistensi ketepatan jawaban meskipun skenario diubah menyentuh angka 89 persen, melewati batas minimal 85 persen. Kelima, kemampuan transfer pengetahuan ke dunia nyata berhasil terealisasi sebesar 83 persen dari target 80 persen. Capaian kelima ini menjadi tolok ukur paling krusial karena dievaluasi langsung di luar layar melalui ketepatan tindakan siswa saat simulasi kesiapsiagaan di sekolah. Ke depannya, implementasi program ini akan terus dikembangkan secara bertahap, mulai dari evaluasi uji coba awal dan pelatihan guru, hingga perluasan jangkauan ke berbagai sekolah dengan profil risiko yang beragam."
  * Jika ditanya asal nilai 0,7 (Learning Gain) pada Slide 13: Nilai N-gain sebesar 0,74 (kategori tinggi) didapatkan dari Uji Coba Efektivitas Pembelajaran terhadap 128 siswa terdaftar SMAN 1 Ngoro (8 rombel: Kelas X-1 s/d X-4 dan XI-1 s/d XI-4).
  * Metodologi: Formula Normalized Gain (Richard R. Hake, 1998, American Journal of Physics): g = (%Post-Test - %Pre-Test) / (100 - %Pre-Test).
  * Skor Hasil Uji: Rata-rata Pre-Test = 46,5 (metode ceramah konvensional) meningkat menjadi Post-Test = 86,1 setelah intervensi simulasi 3D Digital Twin, WebGIS, dan GeoBot AI.
  * Hasil Perhitungan: g = (86,1 - 46,5) / (100 - 46,5) = 39,6 / 53,5 = 0,74 (Kategori Tinggi / High Gain, melampaui batas minimal 0,7). Uji t-test t(127) = 24,38, p < 0,0001 (Sangat Signifikan), Cohen's d = 1,84 (Large Effect Size).
  * 5 Parameter Keberhasilan Slide 13:
    1. Peningkatan Hasil Belajar (Learning Gain): 0,74 (Target: minimal 0,7 Kategori Tinggi) -> Melebihi Target
    2. Akurasi Pengambilan Keputusan (Decision Accuracy): 85% (Target: minimal 80%) -> Melebihi Target
    3. Efisiensi Waktu Respons (Response Efficiency): 87% respons < 15 detik (Target: minimal 80%) -> Melebihi Target
    4. Konsistensi Ketepatan Jawaban (Learning Consistency): 89% konsisten saat skenario diubah/blind test (Target: minimal 85%) -> Melebihi Target
    5. Transfer Pengetahuan ke Dunia Nyata (Transfer of Learning): 83% (Target: minimal 80%) -> Melebihi Target (Tolok ukur paling krusial, dievaluasi langsung di luar layar melalui ketepatan tindakan siswa saat simulasi kesiapsiagaan fisik di sekolah).
  * Lokasi di Web: Seluruh bukti data 128 siswa ini dapat dibuka langsung di menu "Dasbor Guru" (Tab "Efektivitas & Learning Gain (0,7+)"), menu "Survei Sekolah", serta via API /api/analytics/learning-gain.

[DATA DATABASE PENGGUNA YANG SEDANG LOGIN]
${dbSection}

[ATURAN OBROLAN MANUSIAWI, KLARIFIKASI & BATAS MEMORI]
1. Gaya Bahasa Saat Ini (${tone}): ${toneGuide}
2. Ngobrol seperti manusia: singkat, padat, hangat, dan langsung jawab intinya dulu (umumnya 2-4 kalimat atau poin ringkas kalau memang langkah prosedural). Jangan bertele-tele dengan pembukaan klise.
3. Sesuaikan jawaban dengan peran pengguna di database (jika pelajar: pakai contoh kelas/latihan soal/simulasi evakuasi; jika guru: fokus ke pemantauan kelas, skor siswa, dan room simulasi; jika tamu/belum login: bantu secara ramah dan arahkan login bila ingin cek progres pribadi).
4. Jujur & Tidak Mengarang: Gunakan angka skor/kuis/simulasi HANYA jika tertulis di [DATA DATABASE PENGGUNA YANG SEDANG LOGIN]. Jika data kosong atau fitur di luar jangkauan aplikasi, katakan terus terang bahwa datanya belum tercatat.
5. Tanya Balik Jika Tidak Tahu / Kurang Jelas: Kalau maksud pengguna masih umum, lokasi ruangan belum disebut, atau datanya di database belum cukup, JANGAN menebak-nebak — langsung ajukan 1-2 pertanyaan klarifikasi singkat dengan bahasa yang sesuai ragam pengguna.
6. Batas Memori 6 Pesan: Server dan antarmuka hanya menyimpan maksimal 6 pesan obrolan terbaru agar ringan (pesan ke-7 ke atas otomatis menggeser pesan paling awal). Tetap konsisten dengan konteks 6 pesan terakhir itu.
${customInstruction ? `\n[CATATAN KONTEKS TAMBAHAN]\n${String(customInstruction).trim()}` : ""}`.trim();
}

