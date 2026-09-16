import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot,
  SendHorizonal,
  BookOpen,
  Zap,
  Waves,
  Flame,
  Wind,
  AlertTriangle,
  Trophy,
  Star,
  BarChart3,
  ChevronRight,
  RotateCcw,
  CheckCircle,
  XCircle,
  Loader2,
  PenLine,
  MessageSquare,
  Award,
  TrendingUp,
  Lock,
  Mountain,
  CloudRain,
  Trees,
  Play,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Clock,
  AlertCircle,
  Compass,
  CornerDownRight,
  HelpCircle,
  FileText,
  Heart,
  Shield,
  MapPin,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  getProfile,
  buildAISummary,
  recordQuizSession,
  createInitialTopicScore,
} from "@/data/userProfiles";
import {
  askChatbotAI,
  generateQuizQuestions,
  evaluateQuizAnswers,
  type QuizQuestion,
  type QuizEvaluation,
  type QuizDifficulty,
} from "@/services/geminiService";
import { LogoSpinner } from "@/components/ui/LogoSpinner";
import { Link } from "react-router-dom";
import { Donut } from "@/components/dashboard/Charts";
import { useI18n } from "@/hooks/useI18n";

import { generateSmartSimulationQuestions } from "@/services/geminiService";
import { useSchool } from "@/hooks/useSchool";

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
  const { t, locale } = useI18n();
  const [activeTab, setActiveTab] = useState<"sim" | "materi" | "panduan">(
    "sim",
  );
  const { currentUser, currentProfile, refreshProfile, updateUserProfile } =
    useAuth();
  const { selection } = useSchool();
  const activeSchool = selection?.school;

  const [phase, setPhase] = useState<
    "select" | "sim" | "result" | "loading_smart"
  >("select");
  const [selectedType, setSelectedType] = useState<
    DisasterType | "smart" | null
  >(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [smartSteps, setSmartSteps] = useState<SimStep[]>([]);
  const [smartMastered, setSmartMastered] = useState<string[]>([]);

  const [selectedMaterialIdx, setSelectedMaterialIdx] = useState(0);

  const [quizPhase, setQuizPhase] = useState<any>("topic-select");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizEvaluations, setQuizEvaluations] = useState<any[]>([]);

  const startQuiz = async (topicId: string) => {
    setSelectedTopic(topicId);
    setQuizPhase("loading");
    setQuizAnswers({});
    setQuizEvaluations([]);
    const topicLabel = TOPICS.find((tp) => tp.id === topicId)?.label ?? topicId;
    const topicScore = currentProfile?.topicScores?.[topicLabel];
    const isFirst = !topicScore || topicScore.isFirstAttempt;
    const difficulty = topicScore?.currentLevel ?? "pemula";
    const count = isFirst
      ? 5
      : difficulty === "pemula"
        ? 3
        : difficulty === "menengah"
          ? 4
          : 5;
    const qs = await generateQuizQuestions(
      topicLabel,
      difficulty,
      count,
      isFirst,
      topicScore?.weakTopics ?? [],
      topicScore?.strongTopics ?? [],
    );
    setQuizQuestions(qs);
    setQuizPhase("answering");
  };

  const submitQuiz = async () => {
    setQuizPhase("evaluating");
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

      // Save history for teacher review
      try {
        await fetch("http://localhost:3001/api/quiz-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            topicId: selectedTopic,
            questions: quizQuestions,
            answers: quizAnswers,
            evaluations: evals,
            score: totalScore
          })
        });
      } catch (e) {
        console.error("Failed to save quiz history", e);
      }

      refreshProfile();
    }
    setQuizPhase("results");
  };

  const resetQuiz = () => {
    setQuizPhase("topic-select");
    setSelectedTopic("");
    setQuizQuestions([]);
    setQuizAnswers({});
    setQuizEvaluations([]);
  };

  const quizAvgScore =
    quizEvaluations.length > 0
      ? Math.round(
          quizEvaluations.reduce((s, e) => s + e.score, 0) /
            quizEvaluations.length,
        )
      : 0;
  const quizTopicMeta = TOPICS.find((tp) => tp.id === selectedTopic);

  const startSim = (type: DisasterType | "smart") => {
    setSelectedType(type);
    setStepIdx(0);
    setAnswers([]);
    setFeedback(null);
    setPicked(null);
    setSmartSteps([]);
    setSmartMastered([]);

    if (type === "smart") {
      startSmartSim();
    } else {
      setPhase("sim");
    }
  };

  const startSmartSim = async () => {
    setPhase("loading_smart");
    const schoolRisk = activeSchool
      ? {
          earthquake: activeSchool.earthquake,
          flood: activeSchool.flood,
          tsunami: activeSchool.tsunami,
          landslide: activeSchool.landslide,
          volcano: activeSchool.volcanic,
          fire: 30, // Default static probability
        }
      : {
          earthquake: 20,
          flood: 20,
          tsunami: 20,
          landslide: 20,
          volcano: 20,
          fire: 20,
        };

    const qs = await generateSmartSimulationQuestions({
      schoolRisk,
      masteredConcepts: currentProfile?.masteredConcepts || [],
      mode: "learning",
      count: 10,
    });

    const mappedSteps: SimStep[] = qs.map((q, idx) => {
      const options = (q.options || [])
        .map((opt) => ({
          text: opt,
          correct: opt.startsWith(q.correctOption || "A"),
          feedback: opt.startsWith(q.correctOption || "A")
            ? "Benar!"
            : `Salah. Jawaban tepat adalah ${q.correctOption}.`,
          subTopic: q.subTopic,
        }))
        .sort(() => Math.random() - 0.5);

      return {
        title: `Skenario Cerdas ${idx + 1} · ${q.subTopic}`,
        instruction: q.question,
        options,
      };
    });

    setSmartSteps(mappedSteps);
    setPhase("sim");
  };

  const reset = () => {
    setPhase("select");
    setSelectedType(null);
    setStepIdx(0);
    setAnswers([]);
    setFeedback(null);
    setPicked(null);
    setSmartSteps([]);
    setSmartMastered([]);
  };

  const pickOption = (
    correct: boolean,
    feedbackText: string,
    idx: number,
    subTopic?: string,
  ) => {
    if (feedback !== null) return;
    setPicked(idx);
    setFeedback(feedbackText);
    setAnswers((a) => [...a, correct]);
    if (correct && subTopic && selectedType === "smart") {
      setSmartMastered((prev) => [...prev, subTopic]);
    }
  };

  const nextStep = () => {
    const steps =
      selectedType === "smart"
        ? smartSteps
        : selectedType
          ? simSteps[selectedType]
          : [];
    if (stepIdx + 1 < steps.length) {
      setStepIdx(stepIdx + 1);
      setFeedback(null);
      setPicked(null);
    } else {
      setPhase("result");
      if (currentProfile) {
        const totalAnswers = answers.length || 1;
        const scoreEarned =
          Math.round((answers.filter(Boolean).length / totalAnswers) * 100) ||
          0;
        const pointsEarned = Math.round(scoreEarned * 0.5) + (scoreEarned >= 80 ? 25 : 10);
        const newTotal = (currentProfile.totalPoints || 0) + pointsEarned;
        const newTopicScores = { ...(currentProfile.topicScores || {}) };

        if (selectedType === "smart") {
          smartMastered.forEach((t) => {
            if (!newTopicScores[t]) newTopicScores[t] = createInitialTopicScore();
            newTopicScores[t].averageScore = 100;
          });
        } else if (selectedType) {
          if (!newTopicScores[selectedType]) newTopicScores[selectedType] = createInitialTopicScore();
          const cur = newTopicScores[selectedType];
          cur.totalAttempts = (cur.totalAttempts || 0) + 1;
          cur.totalScore = (cur.totalScore || 0) + scoreEarned;
          cur.averageScore = Math.round(cur.totalScore / cur.totalAttempts);
          cur.lastAttempt = new Date().toISOString();
        }

        updateUserProfile({
          totalPoints: newTotal,
          topicScores: newTopicScores,
        });
      }
    }
  };

  const score =
    Math.round((answers.filter(Boolean).length / answers.length) * 100) || 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-6 text-white shadow-glass-lg sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:36px_36px] opacity-15" />
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            <Shield className="h-3.5 w-3.5" strokeWidth={2.5} />{" "}
            {locale === "id" ? "Pertanyaan Bencana" : "Disaster Question"}
          </div>
          <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            {locale === "id"
              ? "Pusat Pertanyaan Bencana"
              : "Disaster Question Center"}
          </h2>
          <p className="mt-1.5 max-w-md text-sm text-brand-100">
            {locale === "id"
              ? "Ikuti pertanyaan bencana interaktif, pelajari materi bencana berkelanjutan, dan ikuti panduan penyelamatan diri."
              : "Take interactive disaster questions and read continuous safety guides."}
          </p>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-brand-100 dark:border-slate-800">
        <button
          onClick={() => {
            setActiveTab("sim");
            reset();
          }}
          className={`flex-1 pb-3 text-center text-sm font-semibold transition-all border-b-2 ${
            activeTab === "sim"
              ? "border-brand-600 text-brand-600 dark:border-brand-50 dark:text-brand-400"
              : "border-transparent text-ink-500 hover:text-ink-800 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          🎮 {locale === "id" ? "Interaktif" : "Interactive"}
        </button>
        <button
          onClick={() => setActiveTab("materi")}
          className={`flex-1 pb-3 text-center text-sm font-semibold transition-all border-b-2 ${
            activeTab === "materi"
              ? "border-brand-600 text-brand-600 dark:border-brand-50 dark:text-brand-400"
              : "border-transparent text-ink-500 hover:text-ink-800 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          📚 {locale === "id" ? "Materi Berkelanjutan" : "Continuous Materials"}
        </button>
        <button
          onClick={() => setActiveTab("panduan")}
          className={`flex-1 pb-3 text-center text-sm font-semibold transition-all border-b-2 ${
            activeTab === "panduan"
              ? "border-brand-600 text-brand-600 dark:border-brand-50 dark:text-brand-400"
              : "border-transparent text-ink-500 hover:text-ink-800 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          📋 {locale === "id" ? "Panduan Evakuasi Diri" : "Evacuation Guide"}
        </button>
      </div>

      {/* INTERAKTIF TAB — AI-generated disaster questions */}
      {activeTab === "sim" && (
        <div className="space-y-5">
          {quizPhase === "topic-select" && (
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-lg font-bold text-ink-900 dark:text-white">
                  Pilih Topik Bencana
                </h3>
                <p className="text-sm text-ink-500 dark:text-slate-400 mt-1">
                  AI akan membuat soal interaktif khusus sesuai level dan
                  riwayat belajar Anda.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {TOPICS.map((topicItem) => {
                  const Icon = topicItem.icon;
                  const topicScore =
                    currentProfile?.topicScores?.[topicItem.label];
                  const level = topicScore?.currentLevel;
                  const avg = topicScore?.averageScore;
                  return (
                    <button
                      key={topicItem.id}
                      onClick={() => startQuiz(topicItem.id)}
                      className={`group flex flex-col items-start gap-2 rounded-2xl border ${topicItem.border} ${topicItem.bg} p-4 text-left transition-all hover:shadow-glass hover:-translate-y-0.5`}
                    >
                      <Icon className={`h-6 w-6 ${topicItem.color}`} />
                      <p className="font-display text-sm font-bold text-ink-900 dark:text-white leading-tight">
                        {topicItem.label}
                      </p>
                      {level ? (
                        <div className="flex flex-col gap-1 w-full">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${LEVEL_COLORS[level as keyof typeof LEVEL_COLORS] || ""} w-fit`}
                          >
                            {level}
                          </span>
                          <div className="w-full h-1 bg-black/10 rounded-full">
                            <div
                              className="h-1 rounded-full bg-brand-500"
                              style={{ width: `${avg ?? 0}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-ink-400">
                            Rata-rata: {avg}%
                          </p>
                        </div>
                      ) : (
                        <span className="text-[10px] font-semibold text-ink-400">
                          Belum pernah diuji
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
                <p className="font-display font-bold text-ink-900 dark:text-white">
                  AI sedang menyiapkan soal...
                </p>
                <p className="text-sm text-ink-500 dark:text-slate-400 mt-1">
                  Disesuaikan dengan level &amp; riwayat belajar Anda
                </p>
              </div>
            </div>
          )}

          {quizPhase === "answering" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-ink-900 dark:text-white">
                    {quizTopicMeta?.label}
                  </h3>
                  <p className="text-xs text-ink-500 mt-0.5">
                    {quizQuestions.length} soal · Level:{" "}
                    <strong>
                      {currentProfile?.topicScores?.[quizTopicMeta?.label ?? ""]
                        ?.currentLevel ?? "Pemula"}
                    </strong>
                  </p>
                </div>
                <button
                  onClick={resetQuiz}
                  className="text-xs text-ink-400 hover:text-ink-600 flex items-center gap-1"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Ganti Topik
                </button>
              </div>
              {quizQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  className="rounded-2xl border border-brand-100 dark:border-slate-800 bg-white/80 dark:bg-slate-800/50 p-5 space-y-3"
                >
                  <div className="flex items-start gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-sm font-semibold text-ink-900 dark:text-white leading-relaxed">
                      {q.question}
                    </p>
                  </div>
                  {q.type === "mcq" && q.options ? (
                    <div className="space-y-2 mt-3">
                      {q.options.map((opt: string) => {
                        const optLetter = opt.charAt(0);
                        const isSelected = quizAnswers[q.id] === optLetter;
                        return (
                          <button
                            key={opt}
                            onClick={() =>
                              setQuizAnswers((prev) => ({
                                ...prev,
                                [q.id]: optLetter,
                              }))
                            }
                            className={`w-full flex items-center gap-3 p-3 text-left rounded-xl border text-sm transition-all ${
                              isSelected
                                ? "bg-brand-50 border-brand-400 text-brand-700 dark:bg-brand-500/20 dark:border-brand-500/50 dark:text-brand-300 shadow-sm"
                                : "bg-white border-brand-100 text-ink-700 hover:bg-brand-50/50 hover:border-brand-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <span
                              className={`flex shrink-0 h-6 w-6 items-center justify-center rounded-full border text-[11px] font-bold ${
                                isSelected
                                  ? "bg-brand-600 border-brand-600 text-white"
                                  : "border-ink-300 dark:border-slate-600"
                              }`}
                            >
                              {optLetter}
                            </span>
                            <span className="flex-1">
                              {opt.substring(3).trim()}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <textarea
                      rows={3}
                      value={quizAnswers[q.id] ?? ""}
                      onChange={(e) =>
                        setQuizAnswers((prev) => ({
                          ...prev,
                          [q.id]: e.target.value,
                        }))
                      }
                      placeholder="Tulis jawaban singkat Anda..."
                      className="w-full mt-3 rounded-xl border border-brand-100 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-ink-900 dark:text-white placeholder:text-ink-400 outline-none focus:border-brand-400 resize-none"
                    />
                  )}
                </div>
              ))}
              <button
                onClick={submitQuiz}
                disabled={quizQuestions.some(
                  (q) => !(quizAnswers[q.id] ?? "").trim(),
                )}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-sm font-bold text-white shadow-glass hover:bg-brand-700 disabled:opacity-50 transition-all"
              >
                <ChevronRight className="h-4 w-4" /> Kumpulkan Jawaban
              </button>
            </div>
          )}

          {quizPhase === "evaluating" && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <LogoSpinner size="lg" />
              <div className="text-center">
                <p className="font-display font-bold text-ink-900 dark:text-white">
                  AI sedang menilai jawaban...
                </p>
                <p className="text-sm text-ink-500 dark:text-slate-400 mt-1">
                  Sebentar lagi
                </p>
              </div>
            </div>
          )}

          {quizPhase === "results" && (
            <div className="space-y-5">
              <div
                className={`rounded-2xl p-5 text-white shadow-glass-lg ${quizAvgScore >= 80 ? "bg-gradient-to-br from-emerald-500 to-emerald-700" : quizAvgScore >= 60 ? "bg-gradient-to-br from-amber-500 to-amber-700" : "bg-gradient-to-br from-red-500 to-red-700"}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold opacity-80">
                      Skor Anda
                    </p>
                    <p className="font-display text-5xl font-extrabold mt-1">
                      {quizAvgScore}
                      <span className="text-2xl">/100</span>
                    </p>
                    <p className="text-xs mt-2 opacity-80">
                      {quizAvgScore >= 80
                        ? "🎉 Sangat baik!"
                        : quizAvgScore >= 60
                          ? "👍 Terus berlatih."
                          : "📚 Pelajari materi dulu."}
                    </p>
                  </div>
                  <Trophy className="h-16 w-16 opacity-30" />
                </div>
              </div>
              <div className="space-y-3">
                {quizQuestions.map((q, idx) => {
                  const evalItem = quizEvaluations.find(
                    (e) => e.questionId === q.id,
                  );
                  if (!evalItem) return null;
                  return (
                    <div
                      key={q.id}
                      className="rounded-2xl border border-brand-100 dark:border-slate-800 bg-white/80 dark:bg-slate-800/50 p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-ink-900 dark:text-white leading-relaxed flex-1">
                          {idx + 1}. {q.question}
                        </p>
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${evalItem.score >= 80 ? "bg-emerald-100 text-emerald-700" : evalItem.score >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}
                        >
                          {evalItem.score}
                        </div>
                      </div>
                      <div
                        className={`flex items-start gap-2 mt-2 rounded-lg p-2 text-xs ${evalItem.isCorrect ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300"}`}
                      >
                        {evalItem.isCorrect ? (
                          <CheckCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        )}
                        <p className="line-clamp-2">{evalItem.feedback}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={resetQuiz}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-brand-200 dark:border-slate-700 py-3 text-sm font-bold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-slate-800"
                >
                  <RotateCcw className="h-4 w-4" /> Topik Lain
                </button>
                <button
                  onClick={() => startQuiz(selectedTopic)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-bold text-white hover:bg-brand-700"
                >
                  <PenLine className="h-4 w-4" /> Ulangi
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. MATERI PEMBELAJARAN BERKELANJUTAN TAB */}
      {activeTab === "materi" && (
        <div className="grid gap-6 lg:grid-cols-4 min-h-[400px]">
          {/* Menu materi */}
          <div className="lg:col-span-1 glass rounded-2xl p-4 space-y-4 dark:bg-slate-900/60">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-600">
              Topik Bencana
            </h3>
            <div className="space-y-1">
              {learningMaterials.map((mat, idx) => (
                <button
                  key={mat.topic}
                  onClick={() => setSelectedMaterialIdx(idx)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                    selectedMaterialIdx === idx
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-950/20 dark:text-brand-400 border-l-4 border-brand-500"
                      : "hover:bg-brand-50/40 text-ink-700 dark:text-slate-300"
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                  {mat.topic}
                </button>
              ))}
            </div>
          </div>

          {/* Isi materi */}
          <div className="lg:col-span-3 glass rounded-2xl p-6 dark:bg-slate-900/60 space-y-6">
            <div className="flex items-center gap-2 border-b border-brand-50 pb-3 dark:border-slate-800">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-slate-800 dark:text-brand-400">
                <BookOpen className="h-4 w-4" />
              </span>
              <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">
                Kurikulum Berkelanjutan: Mitigasi{" "}
                {learningMaterials[selectedMaterialIdx].topic}
              </h3>
            </div>

            <div className="space-y-6">
              {learningMaterials[selectedMaterialIdx].chapters.map(
                (ch, cIdx) => (
                  <div
                    key={cIdx}
                    className="space-y-2 border-l-2 border-brand-100 pl-4 py-1 dark:border-slate-800 relative"
                  >
                    <div className="absolute -left-1.5 top-2 w-3 h-3 rounded-full bg-brand-500" />
                    <h4 className="text-sm font-bold text-brand-700 dark:text-brand-400">
                      Bab {cIdx + 1}: {ch.title}
                    </h4>
                    <p className="text-xs text-ink-600 dark:text-slate-300 leading-relaxed">
                      {ch.content}
                    </p>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. PANDUAN EVAKUASI DIRI TAB */}
      {activeTab === "panduan" && (
        <div className="glass rounded-2xl p-6 dark:bg-slate-900/60 space-y-6">
          <div className="flex items-center gap-2 border-b border-brand-50 pb-3 dark:border-slate-800">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-slate-800 dark:text-brand-400">
              <Compass className="h-4 w-4" />
            </span>
            <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">
              Buku Saku Panduan Tata Cara Evakuasi Diri Mandiri
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 rounded-xl border border-brand-50 bg-white/40 dark:bg-slate-800 dark:border-slate-700 flex flex-col justify-between">
              <div>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400 mb-3">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <h4 className="text-xs font-bold text-ink-900 dark:text-white">
                  1. Pra-Evakuasi (Siaga)
                </h4>
                <p className="mt-1.5 text-[11px] text-ink-500 dark:text-slate-400 leading-relaxed">
                  Siapkan Tas Siaga Bencana (P3K, senter, air minum, dokumen
                  penting) di dekat pintu keluar.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-brand-50 bg-white/40 dark:bg-slate-800 dark:border-slate-700 flex flex-col justify-between">
              <div>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-650 dark:bg-brand-950/20 dark:text-brand-400 mb-3">
                  <Heart className="h-5 w-5" />
                </span>
                <h4 className="text-xs font-bold text-ink-900 dark:text-white">
                  2. Amankan Diri Pertama
                </h4>
                <p className="mt-1.5 text-[11px] text-ink-500 dark:text-slate-400 leading-relaxed">
                  Matikan sekring utama listrik dan kompor gas segera. Lindungi
                  kepala memakai tangan, tas, atau helm.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-brand-50 bg-white/40 dark:bg-slate-800 dark:border-slate-700 flex flex-col justify-between">
              <div>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 mb-3">
                  <MapPin className="h-5 w-5" />
                </span>
                <h4 className="text-xs font-bold text-ink-900 dark:text-white">
                  3. Rute Evakuasi Hijau
                </h4>
                <p className="mt-1.5 text-[11px] text-ink-500 dark:text-slate-400 leading-relaxed">
                  Ikuti papan rambu evakuasi berwarna hijau. Gunakan tangga
                  darurat, dilarang memakai lift atau eskalator.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-brand-50 bg-white/40 dark:bg-slate-800 dark:border-slate-700 flex flex-col justify-between">
              <div>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 mb-3">
                  <Shield className="h-5 w-5" />
                </span>
                <h4 className="text-xs font-bold text-ink-900 dark:text-white">
                  4. Berkumpul & Laporkan
                </h4>
                <p className="mt-1.5 text-[11px] text-ink-500 dark:text-slate-400 leading-relaxed">
                  Menuju titik kumpul terbuka (lapangan). Laporkan jumlah
                  anggota keluarga/kelas ke koordinator evakuasi.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
