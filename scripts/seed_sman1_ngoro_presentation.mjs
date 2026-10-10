import { readDB, writeDB, pool, timeoutQuery } from "../apps/server/src/repositories/repository.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const SCHOOL_ID = "ffdcdf34-fc99-4209-913e-5a6042e957ad";
const SCHOOL_NAME = "SMAN 1 Ngoro";
const REGENCY = "Mojokerto";
const PROVINCE = "Jawa Timur";
const LAT = -7.5698;
const LNG = 112.5907;

// Seeded pseudorandom generator for deterministic, natural distributions
function createSeededRNG(seedStr) {
  let h = 0x811c9dc5;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 0x01000193);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

const FIRST_NAMES_MALE = [
  "Aditya", "Ahmad", "Bagas", "Bayu", "Budi", "Danang", "Dimas", "Eka",
  "Fadhil", "Fajar", "Galih", "Hadi", "Hanif", "Hendra", "Indra", "Joko",
  "Kevin", "Maulana", "Muhammad", "Naufal", "Oka", "Panji", "Putra", "Rendy",
  "Reza", "Rian", "Rizky", "Satria", "Taufiq", "Teguh", "Wahyu", "Wildan",
  "Yoga", "Yudha", "Zahid"
];

const FIRST_NAMES_FEMALE = [
  "Anisa", "Ayu", "Bunga", "Citra", "Dewi", "Dian", "Elsa", "Gita",
  "Indah", "Intan", "Kartika", "Larasati", "Lestari", "Linda", "Maya", "Mega",
  "Nabila", "Nadya", "Putri", "Qonita", "Rina", "Salma", "Salsabila", "Sari",
  "Siti", "Tiara", "Ulfa", "Utami", "Vina", "Wulan", "Zahra", "Zaskia"
];

const LAST_NAMES = [
  "Pratama", "Saputra", "Wijaya", "Kusuma", "Hidayat", "Setiawan", "Santoso",
  "Wibowo", "Nugroho", "Suryono", "Hartono", "Lestari", "Rahayu", "Putri",
  "Sari", "Permana", "Firmansyah", "Ramadhan", "Mahendra", "Wahyudi",
  "Siddiq", "Pangestu", "Perkasa", "Al-Ghifari", "Hidayatullah", "Nuraini",
  "Maharani", "Khairunnisa", "Aulia", "Fitriani", "Wulandari", "Panduwinata"
];

const TEACHERS = [
  {
    id: "seed-suhartono",
    name: "Drs. H. Suhartono, M.Pd.",
    nip: "196805121994031005",
    email: "suhartono@sman1ngoro.sch.id",
    subject: "Kepala Sekolah & Pembina Satuan Pendidikan Aman Bencana (SPAB)",
    grade: "XI",
    section: "4",
  },
  {
    id: "seed-siti.nurhaliza",
    name: "Siti Nurhaliza, S.Pd.",
    nip: "198402152008012011",
    email: "siti.nurhaliza@sman1ngoro.sch.id",
    subject: "Guru Geografi & Mitigasi Risiko Spasial",
    grade: "X",
    section: "1",
  },
  {
    id: "seed-bambang.prasetyo",
    name: "Bambang Prasetyo, S.Pd., M.Si.",
    nip: "197911042005011008",
    email: "bambang.prasetyo@sman1ngoro.sch.id",
    subject: "Guru Fisika & Analisis Gelombang Seismik",
    grade: "X",
    section: "2",
  },
  {
    id: "seed-endang.wahyuni",
    name: "Endang Wahyuni, S.Pd.",
    nip: "198603222010012015",
    email: "endang.wahyuni@sman1ngoro.sch.id",
    subject: "Guru Biologi & Restorasi Lingkungan Hidup",
    grade: "X",
    section: "3",
  },
  {
    id: "seed-ahmad.ridwan",
    name: "Ahmad Ridwan, S.Kom.",
    nip: "199008192015031002",
    email: "ahmad.ridwan@sman1ngoro.sch.id",
    subject: "Guru TIK & Laboratorium Digital Twin GIS",
    grade: "X",
    section: "4",
  },
  {
    id: "seed-tri.wahyudi",
    name: "Tri Wahyudi, S.Pd.",
    nip: "198207142009021004",
    email: "tri.wahyudi@sman1ngoro.sch.id",
    subject: "Guru PJOK & Koordinator Lapangan Evakuasi Bencana",
    grade: "XI",
    section: "1",
  },
  {
    id: "seed-dwi.handayani",
    name: "Dwi Handayani, S.Pd.",
    nip: "198812102011012018",
    email: "dwi.handayani@sman1ngoro.sch.id",
    subject: "Guru Kimia & Protokol Bencana Industri / B3",
    grade: "XI",
    section: "2",
  },
  {
    id: "seed-nurul.hidayati",
    name: "Nurul Hidayati, S.Pd.",
    nip: "199204052019032014",
    email: "nurul.hidayati@sman1ngoro.sch.id",
    subject: "Guru Bimbingan Konseling & Trauma Healing Pasca-Bencana",
    grade: "XI",
    section: "3",
  },
];

const CLASSES = [
  { id: "class_sman1ngoro_X_1", name: "X - 1", grade: "X", section: "1", teacherId: "seed-siti.nurhaliza" },
  { id: "class_sman1ngoro_X_2", name: "X - 2", grade: "X", section: "2", teacherId: "seed-bambang.prasetyo" },
  { id: "class_sman1ngoro_X_3", name: "X - 3", grade: "X", section: "3", teacherId: "seed-endang.wahyuni" },
  { id: "class_sman1ngoro_X_4", name: "X - 4", grade: "X", section: "4", teacherId: "seed-ahmad.ridwan" },
  { id: "class_sman1ngoro_XI_1", name: "XI - 1", grade: "XI", section: "1", teacherId: "seed-tri.wahyudi" },
  { id: "class_sman1ngoro_XI_2", name: "XI - 2", grade: "XI", section: "2", teacherId: "seed-dwi.handayani" },
  { id: "class_sman1ngoro_XI_3", name: "XI - 3", grade: "XI", section: "3", teacherId: "seed-nurul.hidayati" },
  { id: "class_sman1ngoro_XI_4", name: "XI - 4", grade: "XI", section: "4", teacherId: "seed-suhartono" },
];

const QUESTIONS_SAMPLE = [
  {
    id: "q-gempa-1",
    text: "Apa tindakan pertama yang wajib dilakukan saat terjadi guncangan gempa bumi di ruang kelas?",
    category: "Gempa Bumi",
  },
  {
    id: "q-gempa-2",
    text: "Mengapa dilarang menggunakan elevator atau lift saat proses evakuasi darurat gedung?",
    category: "Prosedur Evakuasi",
  },
  {
    id: "q-gempa-3",
    text: "Di manakah lokasi Titik Kumpul (Assembly Point) teraman saat evakuasi di lingkungan SMAN 1 Ngoro?",
    category: "Evakuasi Lapangan",
  },
  {
    id: "q-gempa-4",
    text: "Bagaimana cara melindungi kepala dan leher saat berada di koridor terbuka ketika gempa susulan?",
    category: "Penyelamatan Mandiri",
  },
];

const STUDENT_ANSWERS_CORRECT = [
  "Melakukan teknik Drop, Cover, and Hold On di bawah meja yang kokoh dan melindungi kepala dari benda jatuh.",
  "Karena risiko korsleting listrik, kabel putus, dan lift macet di antara lantai yang menjebak korban.",
  "Lapangan Utama / Lapangan Basket tengah SMAN 1 Ngoro yang jauh dari tiang listrik, kaca gedung, dan pohon besar.",
  "Merapat ke dinding struktural bagian dalam, menunduk, dan melindungi kepala serta tengkuk menggunakan tas atau kedua lengan.",
];

export async function runSeed() {
  console.log("=== SEEDING PRESENTATION DATA UNTUK SMAN 1 NGORO ===");
  const db = await readDB();

  // 1. Pastikan Sekolah SMAN 1 Ngoro ada
  if (!db.schools) db.schools = [];
  let school = db.schools.find((s) => s.id === SCHOOL_ID || s.name.includes("Ngoro"));
  if (!school) {
    school = {
      id: SCHOOL_ID,
      name: SCHOOL_NAME,
      lat: LAT,
      lng: LNG,
      regency: REGENCY,
      province: PROVINCE,
      isDemo: true,
      address: "Jl. Raya Sedati, Kec. Ngoro, Kabupaten Mojokerto, Jawa Timur",
    };
    db.schools.push(school);
  } else {
    school.id = SCHOOL_ID;
    school.name = SCHOOL_NAME;
    school.lat = LAT;
    school.lng = LNG;
    school.regency = REGENCY;
    school.province = PROVINCE;
  }

  // 2. Setup Guru SMAN 1 Ngoro
  const defaultPasswordHash = await bcrypt.hash("ngoro123", 10);
  for (const t of TEACHERS) {
    let acc = db.accounts.find((a) => a.id === t.id);
    if (!acc) {
      acc = {
        id: t.id,
        name: t.name,
        email: t.email,
        role: "teacher",
        createdAt: "2026-08-01T08:00:00.000Z",
        passwordHash: defaultPasswordHash,
      };
      db.accounts.push(acc);
    } else {
      acc.name = t.name;
      acc.role = "teacher";
    }

    let prof = db.profiles.find((p) => p.userId === t.id);
    if (!prof) {
      prof = {
        userId: t.id,
        name: t.name,
        role: "teacher",
        schoolId: SCHOOL_ID,
        schoolName: SCHOOL_NAME,
        province: PROVINCE,
        regency: REGENCY,
        grade: t.grade,
        classSection: t.section,
        totalPoints: 1250,
        xp: 1250,
        badges: ["certified_safety_coach", "spab_evaluator", "drill_coordinator"],
        activities: [
          {
            type: "evaluation",
            title: "Verifikasi Latihan Evakuasi SMAN 1 Ngoro",
            status: "Selesai",
            timestamp: "2026-09-28T09:30:00.000Z",
          },
        ],
        lastUpdated: new Date().toISOString(),
      };
      db.profiles.push(prof);
    } else {
      prof.schoolId = SCHOOL_ID;
      prof.role = "teacher";
    }
  }

  // Juga tautkan developer Raihan Ansari ke SMAN 1 Ngoro agar Teacher Dashboard dan SRI bisa langsung diakses
  const devAcc = db.accounts.find((a) => a.email === "raihanansari3345@gmail.com");
  if (devAcc) {
    let devProf = db.profiles.find((p) => p.userId === devAcc.id);
    if (devProf) {
      devProf.schoolId = SCHOOL_ID;
      devProf.schoolName = SCHOOL_NAME;
      devProf.regency = REGENCY;
      devProf.province = PROVINCE;
    }
  }

  // 3. Setup Kelas-kelas SMAN 1 Ngoro
  if (!db.classes) db.classes = [];
  // Hapus kelas placeholder jika ada, ganti dengan 8 kelas resmi
  db.classes = db.classes.filter((c) => c.schoolId !== SCHOOL_ID);
  for (const c of CLASSES) {
    db.classes.push({
      id: c.id,
      schoolId: SCHOOL_ID,
      teacherId: c.teacherId,
      name: c.name,
      grade: c.grade,
      section: c.section,
      academicYear: "2026/2027",
    });
  }

  // 4. Generate 128 Siswa Terdaftar SMAN 1 Ngoro (16 siswa per kelas)
  const studentsToKeep = [];
  const generatedAccounts = [];
  const generatedProfiles = [];
  const generatedDtResults = [];
  const generatedSurveys = [];
  const generatedQuizHistories = [];

  let studentGlobalIndex = 1;

  for (const cls of CLASSES) {
    const rng = createSeededRNG(`class_${cls.id}`);
    const studentCountInClass = 16; // 8 kelas * 16 siswa = 128 siswa

    for (let i = 1; i <= studentCountInClass; i++) {
      const isMale = rng() % 2 === 0;
      const firstName = isMale
        ? FIRST_NAMES_MALE[rng() % FIRST_NAMES_MALE.length]
        : FIRST_NAMES_FEMALE[rng() % FIRST_NAMES_FEMALE.length];
      const lastName = LAST_NAMES[rng() % LAST_NAMES.length];
      const studentName = `${firstName} ${lastName}`;

      const studentId = `st-sman1ngoro-${cls.grade.toLowerCase()}${cls.section}-${String(i).padStart(2, "0")}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${String(i).padStart(2, "0")}@sman1ngoro.sch.id`;

      // Akun Siswa
      generatedAccounts.push({
        id: studentId,
        name: studentName,
        email: email,
        role: "student",
        createdAt: "2026-08-10T07:30:00.000Z",
        passwordHash: defaultPasswordHash,
      });

      // Variasi Performa Siswa (Acak Alami: 70% Tinggi, 20% Sedang, 10% Butuh Peningkatan)
      const roll = rng() % 100;
      let scoreBaseline = 88;
      let hpBaseline = 86;
      let timeBaseline = 40;

      if (roll < 12) {
        // Kelompok yang sedang belajar / butuh adaptasi
        scoreBaseline = 68 + (rng() % 8);
        hpBaseline = 55 + (rng() % 15);
        timeBaseline = 65 + (rng() % 15);
      } else if (roll < 35) {
        // Kelompok menengah
        scoreBaseline = 78 + (rng() % 8);
        hpBaseline = 75 + (rng() % 10);
        timeBaseline = 48 + (rng() % 10);
      } else {
        // Kelompok mahir / sangat siap
        scoreBaseline = 88 + (rng() % 10);
        hpBaseline = 88 + (rng() % 10);
        timeBaseline = 32 + (rng() % 12);
      }

      const t1Score = Math.min(100, Math.max(60, scoreBaseline + ((rng() % 11) - 5)));
      const t2Score = Math.min(100, Math.max(60, scoreBaseline + ((rng() % 9) - 4)));
      const t3Score = Math.min(100, Math.max(60, scoreBaseline + ((rng() % 11) - 5)));
      const totalPoints = 480 + (rng() % 500);

      const dates = [
        "2026-08-18T08:15:00.000Z",
        "2026-08-25T09:40:00.000Z",
        "2026-09-08T10:20:00.000Z",
        "2026-09-22T08:45:00.000Z",
        "2026-10-06T11:10:00.000Z",
      ];

      // Profil Siswa
      generatedProfiles.push({
        userId: studentId,
        name: studentName,
        gender: isMale ? "male" : "female",
        grade: cls.grade,
        classSection: cls.section,
        classId: cls.id,
        schoolId: SCHOOL_ID,
        schoolName: SCHOOL_NAME,
        province: PROVINCE,
        regency: REGENCY,
        totalPoints: totalPoints,
        xp: totalPoints,
        topicScores: {
          t1: {
            averageScore: t1Score,
            totalScore: t1Score * 2,
            totalAttempts: 2,
            lastAttempt: dates[3],
            weakTopics: t1Score < 75 ? ["Gelombang S", "Patahan Aktif"] : [],
            strongTopics: ["Drop, Cover, Hold On", "Rute Aman"],
          },
          t2: {
            averageScore: t2Score,
            totalScore: t2Score * 2,
            totalAttempts: 2,
            lastAttempt: dates[4],
            weakTopics: t2Score < 75 ? ["Titik Kumpul Drainase"] : [],
            strongTopics: ["Mitigasi Banjir Luapan", "Peralatan Siaga"],
          },
          t3: {
            averageScore: t3Score,
            totalScore: t3Score * 2,
            totalAttempts: 2,
            lastAttempt: dates[4],
            weakTopics: [],
            strongTopics: ["Pemadaman Awal APAR", "Titik Evakuasi"],
          },
          "Gempa Bumi": {
            averageScore: t1Score,
            totalScore: t1Score * 2,
            totalAttempts: 2,
            lastAttempt: dates[3],
            weakTopics: ["Struktur Bangunan Bertingkat"],
            strongTopics: ["Penyelamatan Mandiri"],
          },
          "Banjir & Longsor": {
            averageScore: t2Score,
            totalScore: t2Score * 2,
            totalAttempts: 2,
            lastAttempt: dates[4],
            weakTopics: [],
            strongTopics: ["Kesiapsiagaan Dokumen"],
          },
          "Evakuasi Mandiri": {
            averageScore: Math.round((t1Score + t2Score + t3Score) / 3),
            totalScore: Math.round((t1Score + t2Score + t3Score) / 3) * 2,
            totalAttempts: 2,
            lastAttempt: dates[4],
            weakTopics: [],
            strongTopics: ["Akurasi Jalur Titik Kumpul"],
          },
        },
        masteredConcepts: [
          "Drop, Cover, Hold On",
          "Titik Kumpul Lapangan Utama SMAN 1 Ngoro",
          "Rute Evakuasi Koridor Bebas Hambatan",
          "Pertolongan Pertama P3K",
        ],
        badges: [
          "first_quiz",
          t1Score >= 85 ? "drill_master" : "drill_apprentice",
          totalPoints > 700 ? "resilience_hero" : "safety_scout",
          "map_explorer",
        ],
        activities: [
          {
            type: "survey",
            title: "Survei Kesiapsiagaan Bencana (Pre-Test)",
            status: "Selesai (68/100)",
            timestamp: dates[0],
          },
          {
            type: "quiz",
            title: "Kuis: Mitigasi Gempa Bumi & Koridor Sekolah",
            status: `${t1Score}/100`,
            timestamp: dates[1],
          },
          {
            type: "simulation",
            title: "Simulasi Digital Twin Gedung SMAN 1 Ngoro",
            status: hpBaseline > 60 ? `Berhasil (HP ${hpBaseline}%)` : `Perlu Evaluasi (HP ${hpBaseline}%)`,
            timestamp: dates[2],
          },
          {
            type: "learning",
            title: "Modul Pembelajaran AI Mitigasi Cerdas",
            status: "Tuntas",
            timestamp: dates[3],
          },
          {
            type: "survey",
            title: "Survei Peningkatan Resiliensi (Post-Test)",
            status: "Selesai (92/100)",
            timestamp: dates[4],
          },
        ],
        pointsHistory: [
          { date: "2026-08-18", points: Math.round(totalPoints * 0.25) },
          { date: "2026-08-25", points: Math.round(totalPoints * 0.45) },
          { date: "2026-09-08", points: Math.round(totalPoints * 0.65) },
          { date: "2026-09-22", points: Math.round(totalPoints * 0.85) },
          { date: "2026-10-06", points: totalPoints },
        ],
        lastUpdated: dates[4],
      });

      // 5. Digital Twin Results untuk Siswa Ini (2 kali latihan evakuasi per siswa)
      generatedDtResults.push({
        id: `sim-${studentId}-drill1`,
        userId: studentId,
        schoolId: SCHOOL_ID,
        mapId: "map-sman1-ngoro",
        hpRemaining: Math.max(30, hpBaseline - (rng() % 8)),
        completionTimeSeconds: timeBaseline + (rng() % 10),
        outcome: hpBaseline > 45 ? "success" : "failure",
        hazardsEncountered: ["Reruntuhan Plafon", "Puing Gempa Koridor"],
        objectivesCompleted: 2,
        totalObjectives: 2,
        damageTaken: Math.max(2, 100 - hpBaseline),
        isSuccess: hpBaseline > 45,
        submittedAt: dates[1],
        timestamp: dates[1],
      });

      generatedDtResults.push({
        id: `sim-${studentId}-drill2`,
        userId: studentId,
        schoolId: SCHOOL_ID,
        mapId: "map-sman1-ngoro",
        hpRemaining: Math.min(100, hpBaseline + (rng() % 8)),
        completionTimeSeconds: Math.max(25, timeBaseline - (rng() % 8)),
        outcome: "success",
        hazardsEncountered: ["Pintu Koridor Terhambat"],
        objectivesCompleted: 2,
        totalObjectives: 2,
        damageTaken: Math.max(0, 100 - (hpBaseline + 5)),
        isSuccess: true,
        submittedAt: dates[4],
        timestamp: dates[4],
      });

      // 6. Survey Pre-Test dan Post-Test
      generatedSurveys.push({
        id: `survey-pre-${studentId}`,
        userId: studentId,
        schoolId: SCHOOL_ID,
        classId: cls.id,
        score: Math.max(45, Math.min(75, scoreBaseline - 20 + (rng() % 6))),
        responses: [
          { questionId: "spab_1", value: 3 },
          { questionId: "spab_2", value: 3 },
          { questionId: "spab_3", value: 2 },
          { questionId: "spab_4", value: 3 },
        ],
        completed: true,
        submittedAt: dates[0],
      });

      generatedSurveys.push({
        id: `survey-post-${studentId}`,
        userId: studentId,
        schoolId: SCHOOL_ID,
        classId: cls.id,
        score: Math.min(100, Math.max(80, scoreBaseline + (rng() % 6))),
        responses: [
          { questionId: "spab_1", value: 5 },
          { questionId: "spab_2", value: 4 },
          { questionId: "spab_3", value: 5 },
          { questionId: "spab_4", value: 5 },
        ],
        completed: true,
        submittedAt: dates[4],
      });

      // 7. Quiz Histories (Riwayat Jawaban & Evaluasi AI untuk Modal Detail Siswa)
      generatedQuizHistories.push({
        id: `qh-${studentId}-gempa`,
        userId: studentId,
        topicId: "gempa-bumi",
        score: t1Score,
        createdAt: dates[1],
        questions: QUESTIONS_SAMPLE,
        answers: {
          "q-gempa-1": STUDENT_ANSWERS_CORRECT[0],
          "q-gempa-2": STUDENT_ANSWERS_CORRECT[1],
          "q-gempa-3": STUDENT_ANSWERS_CORRECT[2],
          "q-gempa-4": STUDENT_ANSWERS_CORRECT[3],
        },
        evaluations: [
          {
            questionId: "q-gempa-1",
            isCorrect: true,
            feedback: "Jawaban sangat tepat. Prinsip Drop, Cover, and Hold On adalah respon keselamatan global standar.",
          },
          {
            questionId: "q-gempa-2",
            isCorrect: true,
            feedback: "Tepat sekali. Bahaya kegagalan mekanis lift saat guncangan gempa sangat fatal.",
          },
          {
            questionId: "q-gempa-3",
            isCorrect: true,
            feedback: "Luar biasa. Lapangan Utama SMAN 1 Ngoro telah terverifikasi aman sebagai Assembly Point utama.",
          },
          {
            questionId: "q-gempa-4",
            isCorrect: t1Score >= 75,
            feedback: t1Score >= 75
              ? "Tepat, memanfaatkan tas atau siku untuk melindungi kepala dari reruntuhan genteng/plafon."
              : "Cukup baik, namun perhatikan agar posisi kepala tetap berada di bawah level pinggang.",
          },
        ],
      });

      studentGlobalIndex++;
    }
  }

  console.log(`Menyiapkan ${generatedAccounts.length} akun siswa baru...`);
  console.log(`Menyiapkan ${generatedProfiles.length} profil siswa baru...`);
  console.log(`Menyiapkan ${generatedDtResults.length} hasil simulasi Digital Twin...`);
  console.log(`Menyiapkan ${generatedSurveys.length} survei pre/post test...`);
  console.log(`Menyiapkan ${generatedQuizHistories.length} riwayat kuis...`);

  // Bersihkan data lama sekolah ini di DB dan ganti dengan dataset terpadu yang bersih
  db.accounts = db.accounts.filter(
    (a) => !a.email?.endsWith("@sman1ngoro.sch.id") || a.role === "teacher"
  );
  db.accounts.push(...generatedAccounts);

  db.profiles = db.profiles.filter(
    (p) => p.schoolId !== SCHOOL_ID || p.role === "teacher"
  );
  db.profiles.push(...generatedProfiles);

  db.dtResults = (db.dtResults || []).filter((r) => r.schoolId !== SCHOOL_ID);
  db.dtResults.push(...generatedDtResults);

  db.surveys = (db.surveys || []).filter((s) => s.schoolId !== SCHOOL_ID);
  db.surveys.push(...generatedSurveys);

  db.quizHistories = (db.quizHistories || []).filter(
    (qh) => !qh.id?.includes("st-sman1ngoro-")
  );
  db.quizHistories.push(...generatedQuizHistories);

  console.log("Menyimpan ke database (PostgreSQL & local fallback)...");
  await writeDB(db);

  console.log("✅ SEEDING BERHASIL!");
  console.log(`Total Pengguna Terdaftar SMAN 1 Ngoro: ${generatedProfiles.length + TEACHERS.length}`);
  console.log(`Total Siswa: ${generatedProfiles.length}`);
  console.log(`Total Guru: ${TEACHERS.length}`);
  console.log(`Total Kelas: ${CLASSES.length}`);
  console.log(`Total Hasil Simulasi Evakuasi: ${generatedDtResults.length}`);
  console.log(`Total Survei: ${generatedSurveys.length}`);
  console.log(`Total Kuis: ${generatedQuizHistories.length}`);
}

runSeed().catch((err) => {
  console.error("Gagal melakukan seeding:", err);
  process.exit(1);
});
