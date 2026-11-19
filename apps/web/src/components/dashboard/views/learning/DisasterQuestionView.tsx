import { useState } from "react";
import {
  BookOpen,
  Zap,
  Waves,
  Flame,
  Wind,
  AlertTriangle,
  Trophy,
  ChevronRight,
  RotateCcw,
  CheckCircle,
  XCircle,
  PenLine,
  Mountain,
  CloudRain,
  Trees,
  AlertCircle,
  Compass,
  Heart,
  Shield,
  MapPin,
  Sparkles,
  Check,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  recordQuizSession,
} from "@/data/userProfiles";
import {
  generateQuizQuestions,
  evaluateQuizAnswers,
  type QuizQuestion,
  type QuizEvaluation,
  type QuizDifficulty,
} from "@/services/geminiService";
import { apiClient } from "@/services/apiClient";
import { LogoSpinner } from "@/components/ui/LogoSpinner";
import { useI18n } from "@/hooks/useI18n";

function parseMcqOption(rawOption: string, index: number): { letter: string; label: string } {
  const trimmed = rawOption.trim();
  const match = trimmed.match(/^([A-E])[.):\-\s]+(.+)$/i);
  if (match) {
    return { letter: match[1].toUpperCase(), label: match[2].trim() };
  }
  return { letter: String.fromCharCode(65 + index), label: trimmed };
}

const TOPICS = [
  {
    id: "gempa",
    label: "Gempa Bumi",
    icon: Mountain,
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    border: "border-amber-200 dark:border-amber-500/20",
  },
  {
    id: "tsunami",
    label: "Tsunami",
    icon: Waves,
    color: "text-cyan-600",
    bg: "bg-cyan-50 dark:bg-cyan-500/10",
    border: "border-cyan-200 dark:border-cyan-500/20",
  },
  {
    id: "erupsi",
    label: "Gunung Meletus",
    icon: Flame,
    color: "text-red-600",
    bg: "bg-red-50 dark:bg-red-500/10",
    border: "border-red-200 dark:border-red-500/20",
  },
  {
    id: "banjir",
    label: "Banjir",
    icon: CloudRain,
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-500/10",
    border: "border-blue-200 dark:border-blue-500/20",
  },
  {
    id: "longsor",
    label: "Tanah Longsor",
    icon: Trees,
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    border: "border-emerald-200 dark:border-emerald-500/20",
  },
  {
    id: "kekeringan",
    label: "Kekeringan",
    icon: Zap,
    color: "text-yellow-600",
    bg: "bg-yellow-50 dark:bg-yellow-500/10",
    border: "border-yellow-200 dark:border-yellow-500/20",
  },
  {
    id: "angin",
    label: "Angin Puting Beliung",
    icon: Wind,
    color: "text-indigo-600",
    bg: "bg-indigo-50 dark:bg-indigo-500/10",
    border: "border-indigo-200 dark:border-indigo-500/20",
  },
  {
    id: "abrasi",
    label: "Gelombang Pasang",
    icon: Waves,
    color: "text-teal-600",
    bg: "bg-teal-50 dark:bg-teal-500/10",
    border: "border-teal-200 dark:border-teal-500/20",
  },
  {
    id: "kebakaran",
    label: "Kebakaran Hutan dan Lahan",
    icon: Flame,
    color: "text-orange-600",
    bg: "bg-orange-50 dark:bg-orange-500/10",
    border: "border-orange-200 dark:border-orange-500/20",
  },
];

const LEVEL_COLORS: Record<QuizDifficulty, string> = {
  pemula:
    "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200",
  menengah: "text-amber-600 bg-amber-50 dark:bg-amber-500/10 border-amber-200",
  mahir: "text-red-600 bg-red-50 dark:bg-red-500/10 border-red-200",
};

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  loading?: boolean;
}

type QuizPhase =
  "topic-select" | "loading" | "answering" | "evaluating" | "results";

type DisasterType =
  | "earthquake"
  | "tsunami"
  | "volcano"
  | "flood"
  | "landslide"
  | "drought"
  | "typhoon"
  | "tidal_wave"
  | "forest_fire";

interface DisasterOption {
  id: DisasterType;
  label: string;
  icon: LucideIcon;
  accent: string;
  difficulty: string;
  desc: string;
}

const disasterOptions: DisasterOption[] = [
  {
    id: "earthquake",
    label: "Gempa Bumi",
    icon: Mountain,
    accent: "from-amber-500 to-orange-600",
    difficulty: "Level 4 · Tinggi",
    desc: "Simulasikan aksi berlindung dan rute evakuasi gempa tektonik.",
  },
  {
    id: "tsunami",
    label: "Tsunami",
    icon: Waves,
    accent: "from-cyan-500 to-blue-800",
    difficulty: "Level 5 · Ekstrim",
    desc: "Latihan mendeteksi tanda pasang surut air laut dan lari ke dataran tinggi.",
  },
  {
    id: "volcano",
    label: "Gunung Meletus",
    icon: Flame,
    accent: "from-red-600 to-amber-800",
    difficulty: "Level 4 · Tinggi",
    desc: "Simulasi menghadapi hujan abu vulkanik dan gas beracun.",
  },
  {
    id: "flood",
    label: "Banjir",
    icon: CloudRain,
    accent: "from-blue-400 to-indigo-600",
    difficulty: "Level 3 · Sedang",
    desc: "Simulasi kesiapsiagaan menghadapi luapan air sungai.",
  },
  {
    id: "landslide",
    label: "Tanah Longsor",
    icon: Trees,
    accent: "from-emerald-600 to-teal-800",
    difficulty: "Level 3 · Sedang",
    desc: "Deteksi retakan tanah di lereng bukit dan rute evakuasi aman.",
  },
  {
    id: "drought",
    label: "Kekeringan",
    icon: Zap,
    accent: "from-yellow-500 to-amber-700",
    difficulty: "Level 2 · Ringan",
    desc: "Manajemen dan konservasi air di musim kemarau panjang.",
  },
  {
    id: "typhoon",
    label: "Angin Puting Beliung",
    icon: Wind,
    accent: "from-indigo-500 to-purple-700",
    difficulty: "Level 3 · Sedang",
    desc: "Prosedur keselamatan saat terjadi pusaran angin kencang.",
  },
  {
    id: "tidal_wave",
    label: "Gelombang Pasang",
    icon: Waves,
    accent: "from-teal-500 to-cyan-700",
    difficulty: "Level 3 · Sedang",
    desc: "Kesiapsiagaan di wilayah pesisir dari ancaman gelombang laut.",
  },
  {
    id: "forest_fire",
    label: "Kebakaran Hutan dan Lahan",
    icon: Flame,
    accent: "from-orange-500 to-red-700",
    difficulty: "Level 4 · Tinggi",
    desc: "Pencegahan dan evakuasi di area rawan kebakaran lahan/hutan.",
  },
];

interface SimStep {
  title: string;
  instruction: string;
  options: { text: string; correct: boolean; feedback: string }[];
}

const simSteps: Record<DisasterType, SimStep[]> = {
  earthquake: [
    {
      title: "Langkah 1 · Getaran Awal",
      instruction:
        "Anda merasakan getaran yang sangat kuat di dalam kelas. Apa tindakan pertama Anda?",
      options: [
        {
          text: "Lari keluar gedung secepatnya",
          correct: false,
          feedback:
            "Salah. Berlari saat guncangan aktif berisiko tertimpa reruntuhan eternit atau kaca.",
        },
        {
          text: "Merunduk, Berlindung, dan Bertahan di bawah meja yang kokoh",
          correct: true,
          feedback:
            "Benar! Ambil posisi Drop, Cover, dan Hold On untuk melindungi kepala Anda.",
        },
        {
          text: "Berdiri tegak di dekat jendela kaca",
          correct: false,
          feedback:
            "Sangat berbahaya! Jendela kaca rentan pecah dan melukai Anda.",
        },
      ],
    },
    {
      title: "Langkah 2 · Setelah Getaran Mereda",
      instruction:
        "Guncangan gempa utama telah berhenti. Apa langkah Anda selanjutnya?",
      options: [
        {
          text: "Segera evakuasi secara tenang melalui tangga darurat",
          correct: true,
          feedback:
            "Benar! Gunakan jalur evakuasi hijau dan tangga darurat, jangan gunakan lift.",
        },
        {
          text: "Tetap berada di dalam kelas dan bermain ponsel",
          correct: false,
          feedback:
            "Kurang tepat. Gempa susulan berpotensi merobohkan struktur bangunan yang sudah retak.",
        },
        {
          text: "Menggunakan lift agar cepat sampai di bawah",
          correct: false,
          feedback:
            "Sangat dilarang! Lift berisiko macet total jika listrik padam akibat gempa.",
        },
      ],
    },
    {
      title: "Langkah 3 · Di Titik Kumpul",
      instruction:
        "Anda telah sampai di lapangan olahraga sekolah (Titik Kumpul). Apa yang harus dilakukan?",
      options: [
        {
          text: "Melapor ke guru kelas untuk absensi dan tetap di lokasi aman",
          correct: true,
          feedback:
            "Benar! Melapor penting agar petugas tahu seluruh siswa telah selamat.",
        },
        {
          text: "Kembali masuk ke kelas untuk mengambil tas sekolah yang tertinggal",
          correct: false,
          feedback:
            "Sangat berbahaya! Jangan kembali masuk sebelum dinyatakan aman.",
        },
        {
          text: "Pulang ke rumah masing-masing tanpa memberi tahu siapapun",
          correct: false,
          feedback:
            "Hindari ini! Guru dan regu penyelamat akan panik mencari keberadaan Anda.",
        },
      ],
    },
  ],
  flood: [
    {
      title: "Langkah 1 · Luapan Air Mulai Masuk",
      instruction:
        "Air banjir mulai merembes masuk ke halaman sekolah. Ketinggian air terus naik. Apa tindakan pertama?",
      options: [
        {
          text: "Segera pindah ke lantai dua gedung sekolah",
          correct: true,
          feedback:
            "Benar! Amankan diri ke tempat yang lebih tinggi jika evakuasi luar tidak memungkinkan.",
        },
        {
          text: "Bermain air banjir bersama teman di halaman",
          correct: false,
          feedback:
            "Bahaya. Air banjir membawa kotoran, penyakit, dan risiko hanyut.",
        },
        {
          text: "Mencoba berjalan menerjang banjir untuk pulang",
          correct: false,
          feedback:
            "Bahaya. Arus banjir yang tidak terlihat bisa sangat deras dan menyeret Anda.",
        },
      ],
    },
    {
      title: "Langkah 2 · Evakuasi Peralatan Penting",
      instruction:
        "Sebelum mengungsi ke lantai atas, tindakan pengamanan apa yang wajib dilakukan?",
      options: [
        {
          text: "Mematikan stop kontak listrik utama sekolah",
          correct: true,
          feedback:
            "Benar! Listrik dalam air banjir bisa menyengat dan berakibat fatal.",
        },
        {
          text: "Membiarkan semua colokan listrik tetap terhubung",
          correct: false,
          feedback: "Sangat berbahaya! Korsleting listrik bisa terjadi.",
        },
        {
          text: "Menyembunyikan buku pelajaran di lantai dasar",
          correct: false,
          feedback: "Barang di lantai dasar akan terendam air dan rusak.",
        },
      ],
    },
    {
      title: "Langkah 3 · Pasca Banjir",
      instruction:
        "Air banjir mulai surut dari ruangan sekolah. Apa yang harus diwaspadai?",
      options: [
        {
          text: "Kabel listrik yang terkelupas dan genangan air kotor",
          correct: true,
          feedback:
            "Benar! Sengatan listrik sisa dan bakteri leptospirosis sangat berbahaya.",
        },
        {
          text: "Segera menyalakan AC dan komputer sekolah",
          correct: false,
          feedback:
            "Peralatan elektronik yang basah wajib dikeringkan dan dicek teknisi terlebih dahulu.",
        },
        {
          text: "Mengonsumsi air banjir yang sudah mengendap",
          correct: false,
          feedback: "Air banjir sangat tercemar, jangan dikonsumsi.",
        },
      ],
    },
  ],
  tsunami: [
    {
      title: "Langkah 1 · Tanda Bahaya Tsunami",
      instruction:
        "Setelah gempa besar di pesisir pantai, air laut mendadak surut secara drastis hingga ikan-ikan terdampar. Apa tindakan Anda?",
      options: [
        {
          text: "Segera berlari ke arah perbukitan atau tempat dengan ketinggian > 30 meter",
          correct: true,
          feedback:
            "Benar! Air laut surut drastis adalah tanda mutlak tsunami segera datang.",
        },
        {
          text: "Pergi ke pantai untuk mengambil ikan yang terdampar",
          correct: false,
          feedback:
            "Sangat berbahaya! Gelombang tsunami akan datang dalam hitungan menit.",
        },
        {
          text: "Menunggu pengumuman resmi di televisi terlebih dahulu",
          correct: false,
          feedback:
            "Waktu sangat berharga. Evakuasi mandiri harus segera dilakukan.",
        },
      ],
    },
    {
      title: "Langkah 2 · Memilih Tempat Evakuasi",
      instruction:
        "Jalur evakuasi sangat padat kendaraan. Bagaimana cara terbaik untuk menyelamatkan diri?",
      options: [
        {
          text: "Berlari kaki menuju dataran tinggi melalui rute evakuasi khusus",
          correct: true,
          feedback:
            "Benar! Berjalan kaki mencegah Anda terjebak macet total di jalan.",
        },
        {
          text: "Tetap berada di dalam mobil di jalan raya",
          correct: false,
          feedback:
            "Mobil rentan terjebak macet dan tersapu gelombang tsunami.",
        },
        {
          text: "Berlindung di dalam rumah kayu dekat pantai",
          correct: false,
          feedback:
            "Rumah di dekat pantai akan hancur diterjang kekuatan air tsunami.",
        },
      ],
    },
    {
      title: "Langkah 3 · Gelombang Pertama Surut",
      instruction:
        "Gelombang tsunami pertama telah menghantam dan air mulai surut kembali ke laut. Apakah aman untuk turun?",
      options: [
        {
          text: "Tidak, gelombang tsunami susulan biasanya lebih besar dan terus menerjang beberapa jam",
          correct: true,
          feedback:
            "Benar! Gelombang tsunami selalu datang berkali-kali. Tetap di atas.",
        },
        {
          text: "Ya, segera turun untuk mencari korban selamat",
          correct: false,
          feedback:
            "Sangat berbahaya! Gelombang kedua bisa datang tanpa peringatan.",
        },
        {
          text: "Ya, karena air sudah kembali ke laut",
          correct: false,
          feedback:
            "Air yang kembali ke laut justru mengumpulkan energi untuk gelombang berikutnya.",
        },
      ],
    },
  ],
  landslide: [
    {
      title: "Langkah 1 · Mendeteksi Gejala Longsor",
      instruction:
        "Saat hujan deras di dekat tebing sekolah, terdengar suara gemuruh dan pohon-pohon mulai miring. Tindakan cepat Anda?",
      options: [
        {
          text: "Segera evakuasi menjauhi lereng bukit/tebing",
          correct: true,
          feedback:
            "Benar! Jauhi area tebing dan aliran lembah karena tanah longsor bergerak cepat.",
        },
        {
          text: "Mendekati tebing untuk memeriksa sumber suara gemuruh",
          correct: false,
          feedback: "Bahaya! Anda bisa langsung tertimbun material longsor.",
        },
        {
          text: "Berlindung di bawah pohon rindang dekat tebing",
          correct: false,
          feedback: "Pohon yang miring justru akan tumbang dan menimpa Anda.",
        },
      ],
    },
    {
      title: "Langkah 2 · Saat Tertjebak Aliran Longsor",
      instruction:
        "Lumpur dan batu meluncur deras ke arah Anda. Bagaimana cara menghindarinya?",
      options: [
        {
          text: "Lari tegak lurus (menyamping) dari arah aliran longsor",
          correct: true,
          feedback: "Benar! Lari menyamping menjauhi jalur luncuran lumpur.",
        },
        {
          text: "Lari searah dengan luncuran longsor",
          correct: false,
          feedback:
            "Kecepatan longsor tanah jauh lebih cepat daripada lari manusia.",
        },
        {
          text: "Merapatkan diri di dinding luar bangunan",
          correct: false,
          feedback:
            "Dinding bangunan rentan runtuh jika dihantam batu longsor.",
        },
      ],
    },
    {
      title: "Langkah 3 · Pasca Longsor",
      instruction:
        "Material longsor telah berhenti bergerak. Apa langkah pengamanan selanjutnya?",
      options: [
        {
          text: "Tetap berada di tempat aman karena berpotensi terjadi longsor susulan",
          correct: true,
          feedback:
            "Benar! Tanah longsor sering terjadi berulang, terutama jika hujan masih turun.",
        },
        {
          text: "Mengeksplorasi gundukan tanah longsor untuk mencari barang berharga",
          correct: false,
          feedback:
            "Gundukan tanah tersebut masih labil dan berisiko longsor susulan.",
        },
        {
          text: "Langsung mendirikan tenda darurat di bawah tebing",
          correct: false,
          feedback:
            "Area tebing pasca-longsor sangat berbahaya dan tidak boleh ditempati.",
        },
      ],
    },
  ],
  volcano: [
    {
      title: "Langkah 1 · Status Awas Gunung Api",
      instruction:
        "Gunung berapi di dekat sekolah naik status menjadi AWAS dan mulai mengeluarkan asap tebal. Apa prioritas Anda?",
      options: [
        {
          text: "Mengikuti instruksi evakuasi menuju pos pengungsian di luar zona bahaya",
          correct: true,
          feedback:
            "Benar! Segera kosongkan area dalam radius bahaya gunung api.",
        },
        {
          text: "Mengunci diri di dalam kamar kelas dan tidur",
          correct: false,
          feedback:
            "Gas beracun dan awan panas bisa merembes masuk ke celah bangunan.",
        },
        {
          text: "Naik ke puncak gunung untuk mengambil foto dokumentasi",
          correct: false,
          feedback:
            "Tindakan bunuh diri! Suhu di puncak gunung sangat panas dan beracun.",
        },
      ],
    },
    {
      title: "Langkah 2 · Melindungi Diri dari Abu Vulkanik",
      instruction:
        "Hujan abu vulkanik mulai turun lebat menyelimuti sekolah. Bagaimana cara melindungi diri Anda?",
      options: [
        {
          text: "Memakai masker kain/N95, kacamata pelindung, dan pakaian tertutup",
          correct: true,
          feedback:
            "Benar! Abu vulkanik tajam (silika) dapat merusak paru-paru dan kornea mata.",
        },
        {
          text: "Membasuh muka dengan air hujan yang sedang turun",
          correct: false,
          feedback:
            "Air hujan di sekitar letusan gunung biasanya bersifat asam dan berbahaya.",
        },
        {
          text: "Keluar kelas untuk membersihkan genteng tanpa pengaman",
          correct: false,
          feedback:
            "Udara luar dipenuhi partikel debu tajam yang berbahaya untuk dihirup.",
        },
      ],
    },
    {
      title: "Langkah 3 · Ancaman Lahar Dingin",
      instruction:
        "Hujan lebat terjadi di puncak gunung setelah erupsi selesai. Apa bahaya sekunder yang wajib dihindari?",
      options: [
        {
          text: "Aliran sungai yang berhulu di gunung",
          correct: true,
          feedback:
            "Benar! Lahar dingin berupa banjir lumpur batu bersuhu dingin meluncur di sepanjang sungai.",
        },
        {
          text: "Bermain layang-layang di lapangan terbuka",
          correct: false,
          feedback:
            "Bahaya utama adalah banjir lahar dingin yang menerjang jembatan/bantaran sungai.",
        },
        {
          text: "Mancing di sungai terdekat",
          correct: false,
          feedback:
            "Sangat berbahaya! Sungai bisa meluap akibat lahar dingin secara tiba-tiba.",
        },
      ],
    },
  ],
  forest_fire: [
    {
      title: "Langkah 1 · Bunyi Alarm Kebakaran",
      instruction:
        "Alarm kebakaran berbunyi keras di gedung sekolah. Tercium bau asap menyengat. Apa tindakan pertama?",
      options: [
        {
          text: "Keluar kelas secara tertib mengikuti jalur evakuasi menuju lapangan",
          correct: true,
          feedback:
            "Benar! Evakuasi cepat adalah kunci utama keselamatan saat terjadi kebakaran.",
        },
        {
          text: "Membereskan semua buku pelajaran ke dalam tas terlebih dahulu",
          correct: false,
          feedback:
            "Menyia-nyiakan waktu! Api menyebar sangat cepat dalam hitungan detik.",
        },
        {
          text: "Mencari ruang toilet untuk bersembunyi",
          correct: false,
          feedback:
            "Ruang tertutup tanpa sirkulasi akan menjebak Anda dalam asap beracun.",
        },
      ],
    },
    {
      title: "Langkah 2 · Menembus Asap Tebal",
      instruction:
        "Lorong sekolah dipenuhi oleh asap hitam pekat yang menghalangi pandangan. Bagaimana cara Anda melewatinya?",
      options: [
        {
          text: "Merangkak/menunduk serendah mungkin sambil menutup hidung dengan kain basah",
          correct: true,
          feedback:
            "Benar! Udara bersih berada di bagian bawah. Kain basah menyaring racun.",
        },
        {
          text: "Berlari tegak secepat mungkin sambil bernapas dalam-dalam",
          correct: false,
          feedback:
            "Menghirup asap beracun dapat menyebabkan pingsan seketika.",
        },
        {
          text: "Berteriak meminta tolong dengan mulut terbuka lebar",
          correct: false,
          feedback:
            "Berteriak di tengah asap pekat justru memasukkan asap beracun ke paru-paru Anda.",
        },
      ],
    },
    {
      title: "Langkah 3 · Pintu Terasa Panas",
      instruction:
        "Anda hendak membuka pintu keluar, namun gagang pintu terasa sangat panas saat disentuh. Apa artinya?",
      options: [
        {
          text: "Jangan buka pintu tersebut karena api besar berkobar di baliknya",
          correct: true,
          feedback:
            "Benar! Pintu panas menandakan api berada di balik pintu. Cari jendela atau pintu lain.",
        },
        {
          text: "Segera buka pintu lebar-lebar untuk melihat kondisi api",
          correct: false,
          feedback:
            'Membuka pintu akan memicu "backdraft".',
        },
        {
          text: "Menyiram pintu dengan seember air lalu membukanya",
          correct: false,
          feedback:
            "Air tidak cukup mendinginkan kobaran api besar di balik pintu.",
        },
      ],
    },
  ],
  drought: [
    {
      title: "Langkah 1 · Manajemen Air",
      instruction: "Sumber air bersih mulai mengering. Tindakan mitigasi yang tepat adalah?",
      options: [
        {
          text: "Membatasi penggunaan air bersih hanya untuk kebutuhan krusial",
          correct: true,
          feedback: "Benar! Konservasi air adalah langkah paling penting saat kekeringan."
        },
        {
          text: "Tetap menyiram jalanan agar tidak berdebu",
          correct: false,
          feedback: "Pemborosan air bersih di saat kekeringan sangat tidak dianjurkan."
        },
        {
          text: "Meminum genangan air sisa hujan",
          correct: false,
          feedback: "Air yang tidak diolah rentan membawa penyakit pencernaan."
        }
      ]
    }
  ],
  typhoon: [
    {
      title: "Langkah 1 · Ancaman Angin Puting Beliung",
      instruction: "Angin kencang berputar terlihat mendekati sekolah. Apa yang harus Anda lakukan?",
      options: [
        {
          text: "Masuk ke ruangan kokoh dan jauhi jendela atau pintu kaca",
          correct: true,
          feedback: "Benar! Berlindung dari puing berterbangan yang memecahkan kaca."
        },
        {
          text: "Lari ke tengah lapangan terbuka",
          correct: false,
          feedback: "Sangat berbahaya. Anda bisa tersambar benda terbang atau kilat."
        },
        {
          text: "Berlindung di bawah pohon besar yang rimbun",
          correct: false,
          feedback: "Pohon besar berisiko tinggi tumbang diterjang angin kencang."
        }
      ]
    }
  ],
  tidal_wave: [
    {
      title: "Langkah 1 · Gelombang Pasang",
      instruction: "Peringatan gelombang laut tinggi dikeluarkan oleh BMKG. Apa tindakan kesiapsiagaan Anda di pesisir?",
      options: [
        {
          text: "Menjauhi bibir pantai dan berlindung di dataran yang lebih tinggi/jauh dari pesisir",
          correct: true,
          feedback: "Benar! Menghindar adalah cara terbaik sebelum hantaman abrasi merusak bangunan pesisir."
        },
        {
          text: "Pergi ke pantai untuk menonton gelombang pasang",
          correct: false,
          feedback: "Sangat berbahaya! Gelombang pasang bisa menyeret Anda ke laut dalam sekejap."
        },
        {
          text: "Melaut dengan kapal kecil karena ikan akan banyak bermunculan",
          correct: false,
          feedback: "Kapal kecil rentan terbalik diterjang gelombang tinggi."
        }
      ]
    }
  ],
};

const learningMaterials = [
  {
    topic: "Gempa Bumi",
    chapters: [
      {
        title: "Sains Gempa & Sesar Aktif",
        content:
          "Gempa bumi disebabkan oleh pelepasan energi akibat pergeseran lempeng tektonik. Indonesia berada di pertemuan tiga lempeng aktif: Indo-Australia, Eurasia, dan Pasifik. Sesar aktif seperti Sesar Semangko di Sumatra atau Sesar Cimandiri di Jawa Barat sering memicu gempa darat dangkal.",
      },
      {
        title: "Tindakan Mitigasi Pra-Gempa",
        content:
          "Kenali struktur bangunan sekolah Anda. Pastikan lemari, rak buku, dan benda berat lainnya telah dipaku kuat ke dinding agar tidak roboh saat guncangan. Buat peta evakuasi dan latih seluruh penghuni sekolah secara berkala.",
      },
      {
        title: "Langkah Penyelamatan Diri Saat Gempa",
        content:
          "Jika di dalam ruangan: Lakukan Drop, Cover, Hold On. Lindungi kepala dengan tangan atau helm. Jika guncangan reda, keluar dengan tertib. Jika di luar ruangan: Jauhi tiang listrik, pohon, reklame, dan bangunan kaca. Cari lapangan terbuka luas.",
      },
    ],
  },
  {
    topic: "Banjir",
    chapters: [
      {
        title: "Mengenal Penyebab Banjir",
        content:
          "Banjir dapat dipicu curah hujan tinggi, penyumbatan saluran air, penggundulan hutan di hulu, dan pasang air laut (banjir rob). Pengendalian membutuhkan kolaborasi menjaga kebersihan selokan dan pelestarian resapan air.",
      },
      {
        title: "Kesiapsiagaan Sekolah Menghadapi Banjir",
        content:
          "Simpan dokumen penting sekolah, alat elektronik, dan inventaris buku di lantai atas. Ketahui jalur evakuasi menuju tempat pengungsian yang lebih tinggi.",
      },
      {
        title: "Bahaya Sengatan Listrik & Sanitasi",
        content:
          "Air banjir menghantarkan listrik. Segera matikan sekring utama. Bersihkan tangan dengan sabun setelah menyentuh air banjir karena air tersebut rentan tercemar bakteri leptospirosis dan kolera.",
      },
    ],
  },
  {
    topic: "Tsunami",
    chapters: [
      {
        title: "Bagaimana Tsunami Terjadi?",
        content:
          "Tsunami adalah gelombang raksasa yang dipicu oleh gempa bumi tektonik bawah laut, longsor bawah laut, atau letusan gunung berapi bawah laut.",
      },
      {
        title: "Membaca Tanda Alam",
        content:
          "Jika pantai mendadak surut secara drastis setelah gempa bumi, jangan dekati pantai. Itu adalah isyarat bahwa gelombang tsunami raksasa sedang mengumpulkan energi untuk menerjang daratan.",
      },
      {
        title: "Evakuasi Mandiri Rambu Hijau",
        content:
          "Gunakan prinsip evakuasi mandiri tanpa menunggu instruksi resmi jika gempa dirasakan kuat dan lama (> 20 detik). Ikuti rambu penunjuk evakuasi tsunami menuju tempat aman di atas 30 meter dpl.",
      },
    ],
  },
];

export function DisasterQuestionView() {
  const { locale } = useI18n();
  const [activeTab, setActiveTab] = useState<"sim" | "materi" | "panduan">("sim");
  const { currentUser, currentProfile, refreshProfile } = useAuth();

  const [selectedMaterialIdx, setSelectedMaterialIdx] = useState(0);

  const [quizPhase, setQuizPhase] = useState<QuizPhase>("topic-select");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizEvaluations, setQuizEvaluations] = useState<QuizEvaluation[]>([]);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [selectedDifficultyOverride, setSelectedDifficultyOverride] = useState<"auto" | QuizDifficulty>("auto");
  const [checkedGuideSteps, setCheckedGuideSteps] = useState<Record<string, boolean>>(() => {
    try {
      const saved = window.localStorage.getItem("harmony_evacuation_checklist");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleGuideStep = (stepKey: string) => {
    setCheckedGuideSteps((prev) => {
      const next = { ...prev, [stepKey]: !prev[stepKey] };
      try {
        window.localStorage.setItem("harmony_evacuation_checklist", JSON.stringify(next));
      } catch {
        // Ignore storage quota issues in private browsing.
      }
      return next;
    });
  };

  const startQuiz = async (topicId: string) => {
    setSelectedTopic(topicId);
    setQuizError(null);
    setQuizPhase("loading");
    setQuizAnswers({});
    setQuizEvaluations([]);
    const topicLabel = TOPICS.find((tp) => tp.id === topicId)?.label ?? topicId;
    const topicScore = currentProfile?.topicScores?.[topicLabel];
    const isFirst = !topicScore || topicScore.isFirstAttempt;
    const difficulty =
      selectedDifficultyOverride === "auto"
        ? (topicScore?.currentLevel ?? "pemula")
        : selectedDifficultyOverride;
    const count = isFirst
      ? 5
      : difficulty === "pemula"
        ? 3
        : difficulty === "menengah"
          ? 4
          : 5;

    try {
      const qs = await generateQuizQuestions(
        topicLabel,
        difficulty,
        count,
        isFirst,
        topicScore?.weakTopics ?? [],
        topicScore?.strongTopics ?? [],
      );
      if (!Array.isArray(qs) || qs.length === 0) {
        throw new Error("AI belum mengembalikan daftar pertanyaan yang valid.");
      }
      setQuizQuestions(qs);
      setQuizPhase("answering");
    } catch (err) {
      setQuizError(
        err instanceof Error
          ? err.message
          : "Gagal memuat soal dari server AI. Silakan coba lagi.",
      );
      setQuizPhase("topic-select");
    }
  };

  const submitQuiz = async () => {
    if (quizQuestions.length === 0) return;
    setQuizError(null);
    setQuizPhase("evaluating");

    try {
      const evals = await evaluateQuizAnswers(quizQuestions, quizAnswers);
      setQuizEvaluations(evals);

      if (currentUser) {
        const topicLabel =
          TOPICS.find((tp) => tp.id === selectedTopic)?.label ?? selectedTopic;
        const totalScore =
          evals.length > 0
            ? Math.round(evals.reduce((s, e) => s + e.score, 0) / evals.length)
            : 0;
        const weak = evals
          .filter((e) => e.score < 60)
          .map(
            (e) =>
              quizQuestions.find((q) => q.id === e.questionId)?.subTopic ?? "",
          )
          .filter(Boolean);
        const strong = evals
          .filter((e) => e.score >= 80)
          .map(
            (e) =>
              quizQuestions.find((q) => q.id === e.questionId)?.subTopic ?? "",
          )
          .filter(Boolean);

        await recordQuizSession(
          currentUser.id,
          topicLabel,
          totalScore,
          weak,
          strong,
        );

        try {
          await apiClient.post("/api/quiz-history", {
            userId: currentUser.id,
            topicId: selectedTopic,
            questions: quizQuestions,
            answers: quizAnswers,
            evaluations: evals,
            score: totalScore,
          });
        } catch (e) {
          console.error("Failed to save quiz history", e);
        }

        refreshProfile();
      }
      setQuizPhase("results");
    } catch (err) {
      setQuizError(
        err instanceof Error
          ? err.message
          : "Penilaian jawaban gagal diproses. Jawaban Anda tetap tersimpan.",
      );
      setQuizPhase("answering");
    }
  };

  const resetQuiz = () => {
    setQuizPhase("topic-select");
    setSelectedTopic("");
    setQuizQuestions([]);
    setQuizAnswers({});
    setQuizEvaluations([]);
    setQuizError(null);
  };

  const quizAvgScore =
    quizEvaluations.length > 0
      ? Math.round(
          quizEvaluations.reduce((s, e) => s + e.score, 0) /
            quizEvaluations.length,
        )
      : 0;
  const quizTopicMeta = TOPICS.find((tp) => tp.id === selectedTopic);
  const answeredCount = quizQuestions.filter(
    (q) => (quizAnswers[q.id] ?? "").trim().length > 0,
  ).length;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-6 text-white shadow-glass-lg sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:36px_36px] opacity-15" />
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            <Shield className="h-3.5 w-3.5" strokeWidth={2.5} />{" "}
            {locale === "id" ? "Pusat Evaluasi & Pembelajaran" : "Learning & Assessment Center"}
          </div>
          <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            {locale === "id"
              ? "Latihan Soal"
              : "Question Center"}
          </h2>
          <p className="mt-1.5 max-w-xl text-sm text-brand-100">
            {locale === "id"
              ? "Uji pemahaman mitigasi adaptif berbasis AI, pelajari kurikulum terstruktur, dan verifikasi daftar kesiapsiagaan evakuasi mandiri."
              : "Take adaptive disaster questions, study structured mitigation modules, and verify evacuation readiness."}
          </p>
        </div>
      </div>

      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab("sim")}
          className={`flex-1 pb-3 flex items-center justify-center gap-2 text-sm font-semibold transition-all border-b-2 ${
            activeTab === "sim"
              ? "border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>{locale === "id" ? "Latihan Soal" : "Interactive Quiz"}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("materi")}
          className={`flex-1 pb-3 flex items-center justify-center gap-2 text-sm font-semibold transition-all border-b-2 ${
            activeTab === "materi"
              ? "border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>{locale === "id" ? "Materi Mitigasi" : "Study Modules"}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("panduan")}
          className={`flex-1 pb-3 flex items-center justify-center gap-2 text-sm font-semibold transition-all border-b-2 ${
            activeTab === "panduan"
              ? "border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <Compass className="h-4 w-4" />
          <span>{locale === "id" ? "Panduan Evakuasi" : "Evacuation Guide"}</span>
        </button>
      </div>

      {quizError && activeTab === "sim" && (
        <div role="alert" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-rose-300 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-800/70 p-4 text-xs text-rose-800 dark:text-rose-200">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <div>
              <p className="font-bold">Kendala Pemrosesan Evaluasi</p>
              <p className="mt-0.5 opacity-90">{quizError}</p>
            </div>
          </div>
          {selectedTopic && (
            <button
              type="button"
              onClick={() => (quizPhase === "answering" ? submitQuiz() : startQuiz(selectedTopic))}
              className="shrink-0 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition-colors"
            >
              Coba Lagi
            </button>
          )}
        </div>
      )}

      {activeTab === "sim" && (
        <div className="space-y-5">
          {quizPhase === "topic-select" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                    Pilih Topik Bencana
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Soal pilihan ganda dan esai disusun adaptif sesuai riwayat penguasaan konsep Anda.
                  </p>
                </div>
                <div className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 text-xs font-semibold">
                  {(["auto", "pemula", "menengah", "mahir"] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSelectedDifficultyOverride(lvl)}
                      className={`px-2.5 py-1 rounded-lg capitalize transition-colors ${
                        selectedDifficultyOverride === lvl
                          ? "bg-brand-600 text-white shadow-sm"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {lvl === "auto" ? "Adaptif" : lvl}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {TOPICS.map((topicItem) => {
                  const Icon = topicItem.icon;
                  const topicScore =
                    currentProfile?.topicScores?.[topicItem.label];
                  const level = topicScore?.currentLevel;
                  const avg = topicScore?.averageScore;
                  return (
                    <button
                      key={topicItem.id}
                      type="button"
                      onClick={() => startQuiz(topicItem.id)}
                      className={`group flex flex-col items-start gap-2.5 rounded-2xl border ${topicItem.border} ${topicItem.bg} p-4 text-left transition-all hover:shadow-glass hover:-translate-y-0.5`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 dark:bg-slate-900/70 shadow-xs">
                          <Icon className={`h-5 w-5 ${topicItem.color}`} />
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <p className="font-display text-sm font-bold text-slate-900 dark:text-white leading-tight">
                        {topicItem.label}
                      </p>
                      {level ? (
                        <div className="flex flex-col gap-1.5 w-full">
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${LEVEL_COLORS[level as keyof typeof LEVEL_COLORS] || ""}`}
                            >
                              {level}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              Rata-rata {avg ?? 0}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200/80 dark:bg-slate-700/80 rounded-full overflow-hidden">
                            <div
                              className="h-1.5 rounded-full bg-brand-500 transition-all"
                              style={{ width: `${Math.min(100, Math.max(0, avg ?? 0))}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          Belum pernah diuji · Mulai diagnostik
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {quizPhase === "loading" && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <LogoSpinner size="lg" />
              <div className="text-center">
                <p className="font-display font-bold text-slate-900 dark:text-white">
                  Menyiapkan evaluasi adaptif...
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Topik {quizTopicMeta?.label} disesuaikan dengan riwayat belajar Anda
                </p>
              </div>
            </div>
          )}

          {quizPhase === "answering" && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                      {quizTopicMeta?.label}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {answeredCount} dari {quizQuestions.length} soal terjawab · Level:{" "}
                      <strong className="capitalize">
                        {selectedDifficultyOverride === "auto"
                          ? (currentProfile?.topicScores?.[quizTopicMeta?.label ?? ""]?.currentLevel ?? "Pemula")
                          : selectedDifficultyOverride}
                      </strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetQuiz}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Ganti Topik
                  </button>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-600 transition-all duration-300"
                    style={{
                      width: `${quizQuestions.length > 0 ? Math.round((answeredCount / quizQuestions.length) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>

              {quizQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 flex-1">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                        {q.question}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                      {q.type === "mcq" ? "Pilihan Ganda" : "Esai"}
                    </span>
                  </div>
                  {q.type === "mcq" && q.options ? (
                    <div className="space-y-2 mt-3">
                      {q.options.map((opt, optIdx) => {
                        const { letter, label } = parseMcqOption(opt, optIdx);
                        const isSelected = quizAnswers[q.id] === letter;
                        return (
                          <button
                            key={`${q.id}-${letter}-${optIdx}`}
                            type="button"
                            onClick={() =>
                              setQuizAnswers((prev) => ({
                                ...prev,
                                [q.id]: letter,
                              }))
                            }
                            className={`w-full flex items-center gap-3 p-3 text-left rounded-xl border text-sm transition-all ${
                              isSelected
                                ? "bg-brand-50 border-brand-500 text-brand-800 dark:bg-brand-500/20 dark:border-brand-500/60 dark:text-brand-200 shadow-xs"
                                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 dark:bg-slate-800/70 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            }`}
                          >
                            <span
                              className={`flex shrink-0 h-6 w-6 items-center justify-center rounded-full border text-[11px] font-bold ${
                                isSelected
                                  ? "bg-brand-600 border-brand-600 text-white"
                                  : "border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400"
                              }`}
                            >
                              {letter}
                            </span>
                            <span className="flex-1 leading-snug">{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-3 space-y-1">
                      <textarea
                        name={`quizEssay-${q.id}`}
                        id={`quiz-essay-${q.id}`}
                        rows={3}
                        value={quizAnswers[q.id] ?? ""}
                        onChange={(e) =>
                          setQuizAnswers((prev) => ({
                            ...prev,
                            [q.id]: e.target.value,
                          }))
                        }
                        placeholder="Tuliskan penjelasan langkah mitigasi atau alasan Anda secara ringkas dan jelas..."
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/60 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 resize-y"
                      />
                      <p className="text-right text-[11px] text-slate-400">
                        {(quizAnswers[q.id] ?? "").trim().length} karakter
                      </p>
                    </div>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={submitQuiz}
                disabled={
                  quizQuestions.length === 0 ||
                  quizQuestions.some((q) => !(quizAnswers[q.id] ?? "").trim())
                }
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-sm font-bold text-white shadow-glass hover:bg-brand-700 disabled:opacity-50 transition-all"
              >
                <ChevronRight className="h-4 w-4" />
                {answeredCount === quizQuestions.length
                  ? "Kumpulkan & Nilai Jawaban"
                  : `Lengkapi Semua Soal (${answeredCount}/${quizQuestions.length})`}
              </button>
            </div>
          )}

          {quizPhase === "evaluating" && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <LogoSpinner size="lg" />
              <div className="text-center">
                <p className="font-display font-bold text-slate-900 dark:text-white">
                  Menilai jawaban &amp; menyusun umpan balik...
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Setiap butir jawaban sedang dianalisis terhadap kunci mitigasi
                </p>
              </div>
            </div>
          )}

          {quizPhase === "results" && (
            <div className="space-y-5">
              <div
                className={`rounded-2xl p-6 text-white shadow-glass-lg ${quizAvgScore >= 80 ? "bg-gradient-to-br from-emerald-500 to-emerald-700" : quizAvgScore >= 60 ? "bg-gradient-to-br from-amber-500 to-amber-700" : "bg-gradient-to-br from-rose-500 to-rose-700"}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider opacity-85">
                      Hasil Evaluasi · {quizTopicMeta?.label}
                    </p>
                    <p className="font-display text-5xl font-extrabold mt-1">
                      {quizAvgScore}
                      <span className="text-2xl opacity-80">/100</span>
                    </p>
                    <p className="text-xs mt-2 opacity-90">
                      {quizAvgScore >= 80
                        ? "Pemahaman sangat baik. Siap naik ke skenario tingkat lanjut."
                        : quizAvgScore >= 60
                          ? "Pemahaman cukup baik. Tinjau kembali poin koreksi di bawah."
                          : "Disarankan membaca Materi Berkelanjutan sebelum mengulang topik ini."}
                    </p>
                  </div>
                  <Trophy className="h-14 w-14 opacity-30 shrink-0" />
                </div>
              </div>
              <div className="space-y-3">
                {quizQuestions.map((q, idx) => {
                  const evalItem = quizEvaluations.find(
                    (e) => e.questionId === q.id,
                  );
                  if (!evalItem) return null;
                  const studentAns = quizAnswers[q.id];
                  return (
                    <div
                      key={q.id}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed flex-1">
                          {idx + 1}. {q.question}
                        </p>
                        <div
                          className={`flex h-9 min-w-[2.5rem] px-2 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${evalItem.score >= 80 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : evalItem.score >= 60 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" : "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"}`}
                        >
                          {evalItem.score}
                        </div>
                      </div>
                      {studentAns && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Jawaban Anda: <strong className="text-slate-700 dark:text-slate-200">{studentAns}</strong>
                        </p>
                      )}
                      <div
                        className={`flex items-start gap-2 rounded-xl p-3 text-xs leading-relaxed ${evalItem.isCorrect ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-200" : "bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-200"}`}
                      >
                        {evalItem.isCorrect ? (
                          <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        )}
                        <p className="flex-1">{evalItem.feedback}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={resetQuiz}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 py-3 text-sm font-bold text-brand-600 dark:text-brand-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <RotateCcw className="h-4 w-4" /> Topik Lain
                </button>
                <button
                  type="button"
                  onClick={() => startQuiz(selectedTopic)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-bold text-white hover:bg-brand-700 transition-colors"
                >
                  <PenLine className="h-4 w-4" /> Ulangi Topik Ini
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "materi" && (
        <div className="grid gap-6 lg:grid-cols-4 min-h-[400px]">
          <div className="lg:col-span-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 h-fit">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              Kurikulum Bencana
            </h3>
            <div className="space-y-1">
              {learningMaterials.map((mat, idx) => (
                <button
                  key={mat.topic}
                  type="button"
                  onClick={() => setSelectedMaterialIdx(idx)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between gap-2 ${
                    selectedMaterialIdx === idx
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-300 border-l-4 border-brand-500"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 shrink-0" />
                    {mat.topic}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">
                    {mat.chapters.length} bab
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
                  <BookOpen className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    Mitigasi {learningMaterials[selectedMaterialIdx].topic}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {learningMaterials[selectedMaterialIdx].chapters.length} modul ringkas kesiapsiagaan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const topicName = learningMaterials[selectedMaterialIdx].topic.toLowerCase();
                  const matched = TOPICS.find((tp) => tp.label.toLowerCase().includes(topicName));
                  setActiveTab("sim");
                  if (matched) void startQuiz(matched.id);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-brand-700 transition-colors self-start sm:self-center"
              >
                <Sparkles className="h-3.5 w-3.5" /> Uji Pemahaman
              </button>
            </div>

            <div className="space-y-6">
              {learningMaterials[selectedMaterialIdx].chapters.map(
                (ch, cIdx) => (
                  <div
                    key={cIdx}
                    className="space-y-2 border-l-2 border-brand-200 pl-4 py-1 dark:border-brand-800 relative"
                  >
                    <div className="absolute -left-[7px] top-2 w-3 h-3 rounded-full bg-brand-500 ring-4 ring-white dark:ring-slate-900" />
                    <h4 className="text-sm font-bold text-brand-700 dark:text-brand-300">
                      Bab {cIdx + 1}: {ch.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {ch.content}
                    </p>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "panduan" && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
                <Compass className="h-4 w-4" />
              </span>
              <div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Panduan Evakuasi
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Klik setiap langkah untuk menandai pemahaman kesiapsiagaan Anda
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {["step1", "step2", "step3", "step4"].filter((k) => checkedGuideSteps[k]).length}/4 langkah dipahami
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                key: "step1",
                title: "1. Pra-Evakuasi (Siaga)",
                desc: "Siapkan Tas Siaga Bencana (P3K, senter, air minum, dokumen penting) di dekat pintu keluar.",
                icon: AlertTriangle,
                iconBg: "bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400",
              },
              {
                key: "step2",
                title: "2. Amankan Diri Pertama",
                desc: "Matikan sekring utama listrik dan kompor gas segera. Lindungi kepala memakai tangan, tas, atau helm.",
                icon: Heart,
                iconBg: "bg-brand-100 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400",
              },
              {
                key: "step3",
                title: "3. Rute Evakuasi Hijau",
                desc: "Ikuti papan rambu evakuasi berwarna hijau. Gunakan tangga darurat, dilarang memakai lift atau eskalator.",
                icon: MapPin,
                iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
              },
              {
                key: "step4",
                title: "4. Berkumpul & Laporkan",
                desc: "Menuju titik kumpul terbuka (lapangan). Laporkan jumlah anggota kelas ke koordinator evakuasi.",
                icon: Shield,
                iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
              },
            ].map((step) => {
              const StepIcon = step.icon;
              const isChecked = Boolean(checkedGuideSteps[step.key]);
              return (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => toggleGuideStep(step.key)}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 ${
                    isChecked
                      ? "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-700"
                      : "border-slate-200 bg-slate-50/40 hover:border-slate-300 dark:bg-slate-800/60 dark:border-slate-700"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${step.iconBg}`}>
                        <StepIcon className="h-5 w-5" />
                      </span>
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
                          isChecked
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-slate-300 dark:border-slate-600 text-transparent"
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {step.title}
                    </h4>
                    <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {isChecked ? "Sudah dipahami" : "Tandai selesai dipahami"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
