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

type FallbackTemplate = Omit<QuizQuestion, "id">;

const CURATED_TOPIC_BANK: Record<string, FallbackTemplate[]> = {
  gempa: [
    {
      type: "mcq",
      subTopic: "perlindungan_diri_gempa",
      question: "Saat guncangan gempa bumi kuat terjadi ketika Anda berada di dalam ruang kelas lantai dua, tindakan pertama yang paling aman sesuai standar SPAB adalah...",
      options: [
        "A. Merunduk, berlindung di bawah meja kokoh, dan berpegangan pada kaki meja menjauhi kaca",
        "B. Segera berlari menuruni tangga sambil membawa seluruh tas buku",
        "C. Berdiri di dekat jendela kaca untuk memantau kondisi halaman sekolah",
        "D. Menggunakan lift gedung bila tersedia agar lebih cepat sampai halaman",
        "E. Tetap duduk di kursi tanpa melindungi kepala",
      ],
      correctOption: "A",
    },
    {
      type: "mcq",
      subTopic: "evakuasi_pascagempa",
      question: "Setelah guncangan gempa utama mereda, langkah evakuasi keluar gedung sekolah yang tepat adalah...",
      options: [
        "A. Berlari saling mendahului di koridor sempit agar cepat keluar",
        "B. Berjalan tertib mengikuti rambu jalur evakuasi sambil melindungi kepala menuju titik kumpul terbuka",
        "C. Menunggu di bawah balok kusen pintu sampai bel sekolah berbunyi",
        "D. Kembali ke ruang kelas lain untuk mencari teman yang tertinggal tanpa melapor guru",
        "E. Berkumpul tepat di samping tembok pagar beton tinggi",
      ],
      correctOption: "B",
    },
    {
      type: "mcq",
      subTopic: "kesiapsiagaan_nonstruktural",
      question: "Contoh mitigasi non-struktural di ruang laboratorium atau kelas untuk mengurangi korban akibat benda jatuh saat gempa adalah...",
      options: [
        "A. Memasang lemari berat menempel dinding dengan pengait pengaman serta menjauhkan bahan mudah pecah dari rak atas",
        "B. Memindahkan seluruh kursi siswa ke dekat panel kaca jendela",
        "C. Menutup jalur pintu darurat dengan rak buku agar kelas lebih rapi",
        "D. Mengunci seluruh pintu penghubung antar koridor saat pelajaran berlangsung",
        "E. Mengganti lantai keramik dengan marmer licin",
      ],
      correctOption: "A",
    },
    {
      type: "essay",
      subTopic: "protokol_titik_kumpul",
      question: "Jelaskan tiga langkah utama yang harus dilakukan guru dan siswa setelah berhasil tiba di titik kumpul evakuasi gempa bumi!",
      keyPoints: ["absensi siswa", "periksa cedera P3K", "waspada gempa susulan menjauhi bangunan"],
    },
    {
      type: "essay",
      subTopic: "analisis_bahaya_kelas",
      question: "Sebutkan potensi bahaya sekunder yang dapat muncul di gedung sekolah pascagempa dan cara mengantisipasinya!",
      keyPoints: ["korsleting listrik", "kebocoran gas laboratorium", "reruntuhan kaca atau plafon"],
    },
  ],
  tsunami: [
    {
      type: "mcq",
      subTopic: "tanda_alami_tsunami",
      question: "Ketika sekolah di pesisir diguncang gempa kuat selama lebih dari 30 detik diikuti air laut yang surut cepat secara tidak biasa, keputusan terbaik adalah...",
      options: [
        "A. Menunggu sirine resmi selama 30 menit di pinggir pantai sebelum bergerak",
        "B. Segera mengevakuasi diri menuju tempat tinggi atau bukit evakuasi menjauhi garis pantai",
        "C. Mendekati pantai untuk mengambil foto fenomena air surut",
        "D. Memarkir kendaraan di dermaga untuk memblokir air",
        "E. Berlindung di lantai dasar gedung tepat di tepi laut",
      ],
      correctOption: "B",
    },
    {
      type: "mcq",
      subTopic: "golden_time_evakuasi",
      question: "Mengapa jalur evakuasi tsunami tidak disarankan menyeberangi jembatan panjang di atas muara sungai jika tersedia rute ke dataran tinggi lain?",
      options: [
        "A. Gelombang tsunami dapat merambat lebih cepat masuk melalui alur sungai dan merusak struktur jembatan",
        "B. Jembatan tidak memiliki papan informasi wisata",
        "C. Air sungai selalu menjadi lebih dingin saat gempa terjadi",
        "D. Angin laut hanya bertiup di atas muara",
        "E. Jalur sungai lebih jauh dari garis pantai secara geometris",
      ],
      correctOption: "A",
    },
    {
      type: "mcq",
      subTopic: "evakuasi_vertikal",
      question: "Jika waktu tempuh menuju perbukitan sangat terbatas dan tidak memungkinkan evakuasi horizontal, pilihan evakuasi vertikal yang aman adalah...",
      options: [
        "A. Naik ke lantai 3 atau lebih pada bangunan beton bertulang khusus tempat evakuasi sementara",
        "B. Memanjat pohon kelapa tunggal di pinggir pantai",
        "C. Bersembunyi di ruang bawah tanah gedung agar tidak tersapu ombak",
        "D. Masuk ke dalam kendaraan tertutup di jalan raya pesisir",
        "E. Bertahan di rumah kayu satu lantai",
      ],
      correctOption: "A",
    },
    {
      type: "essay",
      subTopic: "sosialisasi_sirine_bmkg",
      question: "Jelaskan peran sistem peringatan dini tsunami (InaTEWS) dan pentingnya prinsip 'gempa kuat adalah sirine alami'!",
      keyPoints: ["gempa kuat sebagai peringatan langsung", "waktu emas evakuasi terbatas", "koordinasi sirine dan jalur daratan tinggi"],
    },
    {
      type: "essay",
      subTopic: "gelombang_susulan_tsunami",
      question: "Mengapa warga sekolah dilarang langsung kembali ke area pesisir setelah gelombang tsunami pertama surut?",
      keyPoints: ["gelombang datang bertahap", "gelombang kedua atau ketiga bisa lebih besar", "menunggu status aman resmi otoritas"],
    },
  ],
  erupsi: [
    {
      type: "mcq",
      subTopic: "perlindungan_abu_vulkanik",
      question: "Saat terjadi hujan abu vulkanik akibat erupsi gunung api, alat pelindung diri wajib yang harus dikenakan siswa di luar ruangan adalah...",
      options: [
        "A. Masker pernapasan (N95 atau kain lembap), kacamata pelindung, dan pakaian lengan panjang",
        "B. Payung pantai tanpa penutup mulut maupun hidung",
        "C. Lensa kontak terbuka agar penglihatan lebih jelas",
        "D. Sandal jepit tanpa penutup saluran napas",
        "E. Kipas angin genggam untuk meniup abu",
      ],
      correctOption: "A",
    },
    {
      type: "mcq",
      subTopic: "status_level_gunungapi",
      question: "Tingkatan status aktivitas gunung api tertinggi menurut PVMBG yang mewajibkan pengosongan wilayah zona bahaya (KRB) adalah...",
      options: [
        "A. Normal (Level I)",
        "B. Waspada (Level II)",
        "C. Siaga (Level III)",
        "D. Awas (Level IV)",
        "E. Siaga Darurat Lokal",
      ],
      correctOption: "D",
    },
    {
      type: "mcq",
      subTopic: "bahaya_lahar_hujan",
      question: "Bahaya sekunder pascaerupsi yang mengancam sekolah di dekat aliran sungai berhulu gunung api saat turun hujan lebat adalah...",
      options: [
        "A. Banjir lahar dingin yang membawa material batuan dan lumpur panas/dingin",
        "B. Kekeringan air tanah secara seketika",
        "C. Gelombang pasang samudra dalam",
        "D. Badai salju tropis",
        "E. Kabut ozon stratosfer",
      ],
      correctOption: "A",
    },
    {
      type: "essay",
      subTopic: "rencana_evakuasi_erupsi",
      question: "Jelaskan langkah kesiapsiagaan sekolah saat status gunung api di kabupaten sekitar naik dari Siaga menjadi Awas!",
      keyPoints: ["tas siaga masker kacamata", "tutup ventilasi sumber air bersih", "evakuasi ke luar radius KRB sesuai peta PVMBG"],
    },
  ],
  banjir: [
    {
      type: "mcq",
      subTopic: "keselamatan_kelistrikan_banjir",
      question: "Ketika air banjir mulai menggenangi koridor lantai dasar sekolah setinggi 20 cm, tindakan keamanan bangunan yang wajib segera dilakukan adalah...",
      options: [
        "A. Memutus aliran listrik melalui panel MCB utama sebelum air menyentuh stopkontak",
        "B. Tetap menyalakan komputer laboratorium dan kipas angin lantai dasar",
        "C. Membiarkan siswa bermain air di dekat tiang listrik taman sekolah",
        "D. Menumpuk berkas penting di bawah meja lantai dasar",
        "E. Mengalirkan genangan ke ruang genset aktif",
      ],
      correctOption: "A",
    },
    {
      type: "mcq",
      subTopic: "mitigasi_hidrologi_sekolah",
      question: "Upaya mitigasi struktural jangka panjang yang efektif mengurangi genangan banjir di halaman sekolah adalah...",
      options: [
        "A. Membangun lubang resapan biopori, sumur resapan, dan membersihkan saluran drainase secara berkala",
        "B. Menutup seluruh halaman tanah sekolah dengan aspal kedap air tanpa saluran",
        "C. Membuang sampah daun ke selokan utama",
        "D. Mempersempit gorong-gorong pembuangan air hujan",
        "E. Menghilangkan seluruh ruang terbuka hijau sekolah",
      ],
      correctOption: "A",
    },
    {
      type: "mcq",
      subTopic: "evakuasi_arus_banjir",
      question: "Mengapa pejalan kaki atau siswa tidak boleh menerobos genangan air banjir berarus deras di jalan raya meski terlihat dangkal?",
      options: [
        "A. Arus deras dan lubang jalan tersembunyi berisiko menghanyutkan serta menyebabkan cedera serius",
        "B. Air hujan dapat membuat warna seragam luntur",
        "C. Genangan memperlambat sinyal seluler sementara",
        "D. Sepatu basah dilarang masuk ruang kelas",
        "E. Kedalaman genangan selalu konstan sepanjang hari",
      ],
      correctOption: "A",
    },
    {
      type: "essay",
      subTopic: "kesehatan_pascabanjir",
      question: "Jelaskan prosedur pembersihan ruang kelas dan pencegahan penyakit menular (seperti leptospirosis dan diare) setelah banjir surut!",
      keyPoints: ["sarung tangan dan sepatu bot", "disinfeksi lantai lumpur", "air bersih higienis dan cuci tangan"],
    },
  ],
  longsor: [
    {
      type: "mcq",
      subTopic: "gejala_awal_longsor",
      question: "Tanda awal potensi tanah longsor di lereng belakang bangunan sekolah saat hujan deras berkepanjangan adalah...",
      options: [
        "A. Muncul retakan tanah baru di lereng, pohon miring tiba-tiba, dan air mata air berubah keruh",
        "B. Tanah halaman mengeras dan berwarna putih",
        "C. Suhu udara turun 1 derajat pada siang hari",
        "D. Burung-burung terbang lebih tinggi dari biasanya",
        "E. Arah angin berhembus tetap dari barat ke timur",
      ],
      correctOption: "A",
    },
    {
      type: "mcq",
      subTopic: "arah_evakuasi_longsor",
      question: "Jika terdengar suara gemuruh keras dari lereng bukit di belakang sekolah saat hujan lebat, arah evakuasi yang benar adalah...",
      options: [
        "A. Bergerak menjauhi arah lintasan luncuran lereng menuju area terbuka datar dan stabil",
        "B. Berlari searah turunnya aliran material di lembah",
        "C. Bertahan di ruangan yang dindingnya menempel langsung ke tebing",
        "D. Mendekati tebing untuk memastikan sumber suara",
        "E. Berdiri di bawah tiang listrik kaki lereng",
      ],
      correctOption: "A",
    },
    {
      type: "essay",
      subTopic: "mitigasi_lereng_vegetatif",
      question: "Bandingkan fungsi bronjong/dinding penahan tanah dengan penanaman vegetasi berakar dalam dalam mencegah tanah longsor di sekitar sekolah!",
      keyPoints: ["dinding penahan menahan beban lereng secara mekanik", "akar tanaman mengikat partikel tanah dan menyerap air", "sistem drainase lereng mencegah kejenuhan pori tanah"],
    },
  ],
  kekeringan: [
    {
      type: "mcq",
      subTopic: "konservasi_air_sekolah",
      question: "Strategi paling efektif untuk menjaga ketersediaan air bersih sanitasi sekolah saat musim kemarau panjang El Nino adalah...",
      options: [
        "A. Pemanenan air hujan (rainwater harvesting), sumur resapan, dan efisiensi kran air otomatis",
        "B. Menguras tandon cadangan setiap hari agar air terlihat jernih",
        "C. Menyiram lapangan beton pada siang hari terik",
        "D. Membiarkan pipa bocor tanpa perbaikan",
        "E. Menghentikan fasilitas cuci tangan sepenuhnya",
      ],
      correctOption: "A",
    },
    {
      type: "mcq",
      subTopic: "dampak_kesehatan_kekeringan",
      question: "Dampak langsung krisis air bersih berkepanjangan di lingkungan sekolah adalah...",
      options: [
        "A. Menurunnya higienitas sanitasi toilet dan meningkatnya risiko dehidrasi serta penyakit pencernaan",
        "B. Meningkatnya debit sungai di hilir",
        "C. Berkurangnya indeks radiasi ultraviolet matahari",
        "D. Naiknya kelembapan relatif hingga 95%",
        "E. Menguatnya daya dukung lahan gambut basah",
      ],
      correctOption: "A",
    },
    {
      type: "essay",
      subTopic: "mitigasi_kekeringan_dini",
      question: "Jelaskan keterkaitan indeks curah hujan dasarian BMKG dengan rencana penampungan air bersih di tingkat sekolah!",
      keyPoints: ["hari tanpa hujan berturut-turut", "kapasitas cadangan air tandon", "penghematan pemakaian air"],
    },
  ],
  angin: [
    {
      type: "mcq",
      subTopic: "perlindungan_puting_beliung",
      question: "Ketika awan cumulonimbus gelap pekat disertai angin puting beliung mendekati kompleks sekolah, tindakan keselamatan terbaik adalah...",
      options: [
        "A. Masuk ke ruangan dalam gedung yang kokoh jauh dari jendela kaca, pohon tinggi, dan atap seng rapuh",
        "B. Berteduh di bawah pohon besar di tengah lapangan upacara",
        "C. Berdiri di koridor terbuka lantai teratas untuk merekam pusaran angin",
        "D. Memegang tiang bendera logam saat petir menyambar",
        "E. Membuka seluruh jendela menghadap arah angin kencang secara mendadak di dekat kaca",
      ],
      correctOption: "A",
    },
    {
      type: "mcq",
      subTopic: "pencegahan_kerusakan_angin",
      question: "Langkah preventif sebelum musim peralihan (pancaroba) untuk mencegah korban akibat angin kencang di halaman sekolah adalah...",
      options: [
        "A. Memangkas dahan pohon tua yang rimbun dan memeriksa pengikat baut rangka atap secara berkala",
        "B. Memasang papan reklame tinggi tanpa jangkar beton",
        "C. Menumpuk seng bekas di atas atap kelas",
        "D. Menanam pohon berakar dangkal tepat di depan pintu keluar",
        "E. Mengunci seluruh ventilasi kelas permanen",
      ],
      correctOption: "A",
    },
    {
      type: "essay",
      subTopic: "ciri_awan_cumulonimbus",
      question: "Sebutkan ciri-ciri atmosfer sebelum terjadinya angin puting beliung dan langkah cepat evakuasi siswa yang sedang berolahraga di lapangan!",
      keyPoints: ["udara gerah dan awan gelap tinggi", "segera masuk ruang kelas kokoh", "jauhi pohon tiang listrik dan kaca"],
    },
  ],
  abrasi: [
    {
      type: "mcq",
      subTopic: "sabuk_hijau_pesisir",
      question: "Fungsi utama penanaman sabuk hijau mangrove di garis pantai sekitar sekolah pesisir dalam mitigasi abrasi dan gelombang pasang adalah...",
      options: [
        "A. Meredam energi gelombang air laut dan memerangkap sedimen pantai agar garis pantai stabil",
        "B. Mempercepat arus balik gelombang ke tengah samudra",
        "C. Menghilangkan kadar garam air laut menjadi tawar secara langsung",
        "D. Menghentikan seluruh pasang surut bulan",
        "E. Meningkatkan erosi tebing batu",
      ],
      correctOption: "A",
    },
    {
      type: "mcq",
      subTopic: "prediksi_banjir_rob",
      question: "Mengapa fenomena fase bulan purnama atau supermoon perlu diwaspadai oleh sekolah yang berada di kawasan pantai landai?",
      options: [
        "A. Gaya tarik gravitasi memicu pasang air laut maksimum (rob) terutama bila bersamaan dengan angin kencang",
        "B. Menyebabkan penurunan permukaan air laut secara permanen",
        "C. Menghambat pertumbuhan tanaman mangrove",
        "D. Mengubah komposisi udara di ruang kelas",
        "E. Memicu letusan gunung berapi di tengah benua",
      ],
      correctOption: "A",
    },
    {
      type: "essay",
      subTopic: "adaptasi_gelombang_pasang",
      question: "Jelaskan kombinasi pendekatan struktural dan ekosistem yang efektif melindungi fasilitas pendidikan di wilayah pesisir rawan abrasi!",
      keyPoints: ["tanggul atau pemecah gelombang", "rehabilitasi mangrove dan cemara laut", "penataan jarak aman sempadan pantai"],
    },
  ],
  kebakaran: [
    {
      type: "mcq",
      subTopic: "evakuasi_asap_kebakaran",
      question: "Jika terjadi kebakaran di gedung sekolah dan koridor mulai dipenuhi asap tebal, posisi tubuh paling aman saat mengevakuasi diri keluar adalah...",
      options: [
        "A. Merangkak rendah di dekat lantai karena udara bersih berada di bawah lapisan asap serta menutup hidung dengan kain basah",
        "B. Berlari tegak lurus ke lantai tertinggi sambil membuka setiap pintu kelas",
        "C. Bersembunyi di dalam lemari atau kamar mandi tanpa jalur keluar",
        "D. Menggunakan lift gedung untuk menghemat tenaga",
        "E. Menyiram minyak jika sumber api berasal dari laboratorium kimia",
      ],
      correctOption: "A",
    },
    {
      type: "mcq",
      subTopic: "penggunaan_apar_pass",
      question: "Urutan penggunaan Alat Pemadam Api Ringan (APAR) metode PASS untuk api awal berukuran kecil adalah...",
      options: [
        "A. Pull pin, Aim ke pangkal api, Squeeze tuas, Sweep menyapu ke kiri dan kanan",
        "B. Push tuas ke bawah, Aim ke puncak asap, Spray vertikal ke langit-langit",
        "C. Siram air terlebih dahulu ke panel listrik lalu tekan pin APAR",
        "D. Kocok tabung di tempat tertutup tanpa mengarah ke sumber api",
        "E. Lempar tabung ke tengah api dari jarak jauh",
      ],
      correctOption: "A",
    },
    {
      type: "mcq",
      subTopic: "kebakaran_hutan_kabut_asap",
      question: "Saat wilayah sekitar sekolah terdampak kabut asap kebakaran hutan dan lahan (karhutla) dengan indeks ISPU kategori Sangat Tidak Sehat, langkah yang tepat adalah...",
      options: [
        "A. Meniadakan aktivitas olahraga luar ruang, menutup rapat celah ruang kelas, dan memakai masker respirator partikulat",
        "B. Mengadakan lomba lari marathon siang hari di lapangan terbuka",
        "C. Membakar sampah daun kering di halaman sekolah",
        "D. Membuka seluruh jendela menghadap lahan gambut yang terbakar",
        "E. Mengabaikan keluhan sesak napas siswa rentan",
      ],
      correctOption: "A",
    },
    {
      type: "essay",
      subTopic: "peta_titik_kumpul_karhutla",
      question: "Jelaskan bagaimana sistem deteksi hotspot termal dan arah angin membantu sekolah mengantisipasi paparan asap kebakaran lahan serta kebakaran gedung!",
      keyPoints: ["pantau hotspot angin dominan", "evakuasi menjauhi sumber api dan asap", "persiapkan APAR titik kumpul dan masker"],
    },
  ],
};

function resolveBankTopicKey(topicLabel: string): string {
  const lower = topicLabel.toLowerCase();
  if (lower.includes("tsunami")) return "tsunami";
  if (lower.includes("meletus") || lower.includes("erupsi") || lower.includes("gunung")) return "erupsi";
  if (lower.includes("banjir")) return "banjir";
  if (lower.includes("longsor")) return "longsor";
  if (lower.includes("kering")) return "kekeringan";
  if (lower.includes("angin") || lower.includes("beliung")) return "angin";
  if (lower.includes("abrasi") || lower.includes("pasang")) return "abrasi";
  if (lower.includes("bakar") || lower.includes("api") || lower.includes("karhutla")) return "kebakaran";
  return "gempa";
}

function buildCuratedFallbackQuiz(
  topic: string,
  difficulty: QuizDifficulty,
  count: number,
  mcqOnly = false,
): QuizQuestion[] {
  const key = resolveBankTopicKey(topic);
  const primaryPool = CURATED_TOPIC_BANK[key] || CURATED_TOPIC_BANK.gempa;
  const secondaryPool = Object.entries(CURATED_TOPIC_BANK)
    .filter(([k]) => k !== key)
    .flatMap(([, list]) => list);

  const combined = [...primaryPool, ...secondaryPool].filter((item) =>
    mcqOnly ? item.type === "mcq" : true,
  );
  const total = Math.max(1, count);
  const output: QuizQuestion[] = [];

  for (let i = 0; i < total; i++) {
    const item = combined[i % combined.length];
    output.push({
      id: `q${i + 1}`,
      type: item.type,
      question:
        difficulty === "mahir" && i === 0
          ? `[Studi Kasus] ${item.question}`
          : item.question,
      options: item.options ? [...item.options] : undefined,
      correctOption: item.correctOption,
      keyPoints: item.keyPoints ? [...item.keyPoints] : undefined,
      subTopic: item.subTopic,
    });
  }
  return output;
}

function evaluateEssayLocally(payload: EssayEvaluationPayload): QuizEvaluation {
  const normalized = (payload.studentAnswer || "").trim().toLowerCase();
  if (!normalized) {
    return {
      questionId: payload.id,
      score: 0,
      feedback: "Jawaban masih kosong. Sertakan langkah atau kata kunci mitigasi yang relevan.",
      isCorrect: false,
    };
  }
  const keyPoints = payload.keyPoints || [];
  const matched = keyPoints.filter((kp) => {
    const tokens = kp.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    return tokens.some((tok) => normalized.includes(tok));
  });
  const ratio = keyPoints.length > 0 ? matched.length / keyPoints.length : 0.6;
  const lengthBonus = normalized.length >= 45 ? 0.25 : 0.1;
  const score = Math.min(95, Math.max(35, Math.round((ratio * 0.75 + lengthBonus) * 100)));
  const missing = keyPoints.filter((kp) => !matched.includes(kp));
  const feedback =
    missing.length === 0
      ? `Jawaban sangat baik dan mencakup seluruh poin kunci (${keyPoints.join(", ")}).`
      : `Poin tepat yang terdeteksi: ${matched.length > 0 ? matched.join(", ") : "konsep dasar"}. Lengkapi juga aspek: ${missing.join(", ")}.`;

  return {
    questionId: payload.id,
    score,
    feedback,
    isCorrect: score >= 70,
  };
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
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("Format balasan AI tidak sesuai ekspektasi");
    }
    return parsed;
  } catch (err) {
    console.warn("QuizAI fallback activated:", err);
    return buildCuratedFallbackQuiz(topic, difficulty, count, false);
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
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("Format balasan AI tidak sesuai ekspektasi");
    }
    return parsed;
  } catch (err) {
    console.warn("SmartSim AI fallback activated:", err);
    const topHazard = Object.entries(params.schoolRisk).sort((a, b) => b[1] - a[1])[0]?.[0] || "gempa";
    return buildCuratedFallbackQuiz(
      topHazard,
      params.mode === "test" ? "mahir" : "menengah",
      params.count,
      true,
    );
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
    console.warn("QuizAI local essay evaluator fallback activated:", err);
    essayQuestions.forEach((q) => evals.push(evaluateEssayLocally(q)));
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
