import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, SendHorizonal, BookOpen, Zap, Waves, Flame, Wind, AlertTriangle, Trophy, Star, BarChart3, ChevronRight, RotateCcw, CheckCircle, XCircle, Loader2, PenLine, MessageSquare, Award, TrendingUp, Lock, Mountain, CloudRain, Trees, Play, CheckCircle2, ArrowRight, ArrowLeft, Clock, AlertCircle, Compass, CornerDownRight, HelpCircle, FileText, Heart, Shield, MapPin, Sparkles, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getProfile, buildAISummary, recordQuizSession, createInitialTopicScore } from '@/data/userProfiles';
import { askChatbotAI, generateQuizQuestions, evaluateQuizAnswers, type QuizQuestion, type QuizEvaluation, type QuizDifficulty } from '@/services/geminiService';
import { LogoSpinner } from '@/components/ui/LogoSpinner';
import { Link } from 'react-router-dom';
import { Donut } from '@/components/dashboard/Charts';
import { useI18n } from '@/hooks/useI18n';

import { generateSmartSimulationQuestions } from '@/services/geminiService';
import { useSchool } from '@/hooks/useSchool';


// --- Merged from AILearningView.tsx ---

// ── Topic definitions ─────────────────────────────────────────────────────────

const TOPICS = [
  { id: 'gempa', label: 'Gempa Bumi', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/20' },
  { id: 'banjir', label: 'Banjir', icon: Waves, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-200 dark:border-blue-500/20' },
  { id: 'tsunami', label: 'Tsunami', icon: Waves, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-500/10', border: 'border-cyan-200 dark:border-cyan-500/20' },
  { id: 'kebakaran', label: 'Kebakaran', icon: Flame, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-500/10', border: 'border-red-200 dark:border-red-500/20' },
  { id: 'angin', label: 'Angin Puting Beliung', icon: Wind, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-500/10', border: 'border-indigo-200 dark:border-indigo-500/20' },
  { id: 'longsor', label: 'Tanah Longsor', icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-500/10', border: 'border-orange-200 dark:border-orange-500/20' },
];

const LEVEL_COLORS: Record<QuizDifficulty, string> = {
  pemula: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200',
  menengah: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 border-amber-200',
  mahir: 'text-red-600 bg-red-50 dark:bg-red-500/10 border-red-200',
};

// ── Chat types ────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  loading?: boolean;
}

// ── Quiz session state ────────────────────────────────────────────────────────

type QuizPhase = 'topic-select' | 'loading' | 'answering' | 'evaluating' | 'results';


// --- Merged from DisasterQuestionView.tsx ---

type DisasterType = 'earthquake' | 'flood' | 'tsunami' | 'landslide' | 'volcano' | 'fire';

interface DisasterOption {
  id: DisasterType;
  label: string;
  icon: LucideIcon;
  accent: string;
  difficulty: string;
  desc: string;
}

const disasterOptions: DisasterOption[] = [
  { id: 'earthquake', label: 'Gempa Bumi', icon: Mountain, accent: 'from-orange-500 to-red-600', difficulty: 'Level 4 · Tinggi', desc: 'Simulasikan aksi berlindung dan rute evakuasi gempa tektonik.' },
  { id: 'flood', label: 'Banjir', icon: CloudRain, accent: 'from-blue-400 to-indigo-600', difficulty: 'Level 3 · Sedang', desc: 'Simulasi kesiapsiagaan menghadapi luapan air sungai.' },
  { id: 'tsunami', label: 'Tsunami', icon: Waves, accent: 'from-cyan-500 to-blue-800', difficulty: 'Level 5 · Ekstrim', desc: 'Latihan mendeteksi tanda pasang surut air laut dan lari ke dataran tinggi.' },
  { id: 'landslide', label: 'Tanah Longsor', icon: Trees, accent: 'from-emerald-600 to-teal-800', difficulty: 'Level 3 · Sedang', desc: 'Deteksi retakan tanah di lereng bukit.' },
  { id: 'volcano', label: 'Gunung Meletus', icon: Flame, accent: 'from-red-600 to-amber-800', difficulty: 'Level 4 · Tinggi', desc: 'Simulasi menghadapi hujan abu vulkanik dan gas beracun.' },
  { id: 'fire', label: 'Kebakaran Gedung', icon: Flame, accent: 'from-red-500 to-orange-600', difficulty: 'Level 3 · Sedang', desc: 'Evakuasi mandiri melalui lorong penuh asap tebal.' },
];

interface SimStep {
  title: string;
  instruction: string;
  options: { text: string; correct: boolean; feedback: string }[];
}

const simSteps: Record<DisasterType, SimStep[]> = {
  earthquake: [
    {
      title: 'Langkah 1 · Getaran Awal',
      instruction: 'Anda merasakan getaran yang sangat kuat di dalam kelas. Apa tindakan pertama Anda?',
      options: [
        { text: 'Lari keluar gedung secepatnya', correct: false, feedback: 'Salah. Berlari saat guncangan aktif berisiko tertimpa reruntuhan eternit atau kaca.' },
        { text: 'Merunduk, Berlindung, dan Bertahan di bawah meja yang kokoh', correct: true, feedback: 'Benar! Ambil posisi Drop, Cover, dan Hold On untuk melindungi kepala Anda.' },
        { text: 'Berdiri tegak di dekat jendela kaca', correct: false, feedback: 'Sangat berbahaya! Jendela kaca rentan pecah dan melukai Anda.' },
      ],
    },
    {
      title: 'Langkah 2 · Setelah Getaran Mereda',
      instruction: 'Guncangan gempa utama telah berhenti. Apa langkah Anda selanjutnya?',
      options: [
        { text: 'Segera evakuasi secara tenang melalui tangga darurat', correct: true, feedback: 'Benar! Gunakan jalur evakuasi hijau dan tangga darurat, jangan gunakan lift.' },
        { text: 'Tetap berada di dalam kelas dan bermain ponsel', correct: false, feedback: 'Kurang tepat. Gempa susulan berpotensi merobohkan struktur bangunan yang sudah retak.' },
        { text: 'Menggunakan lift agar cepat sampai di bawah', correct: false, feedback: 'Sangat dilarang! Lift berisiko macet total jika listrik padam akibat gempa.' },
      ],
    },
    {
      title: 'Langkah 3 · Di Titik Kumpul',
      instruction: 'Anda telah sampai di lapangan olahraga sekolah (Titik Kumpul). Apa yang harus dilakukan?',
      options: [
        { text: 'Melapor ke guru kelas untuk absensi dan tetap di lokasi aman', correct: true, feedback: 'Benar! Melapor penting agar petugas tahu seluruh siswa telah selamat.' },
        { text: 'Kembali masuk ke kelas untuk mengambil tas sekolah yang tertinggal', correct: false, feedback: 'Sangat berbahaya! Jangan kembali masuk sebelum dinyatakan aman.' },
        { text: 'Pulang ke rumah masing-masing tanpa memberi tahu siapapun', correct: false, feedback: 'Hindari ini! Guru dan regu penyelamat akan panik mencari keberadaan Anda.' },
      ],
    },
  ],
  flood: [
    {
      title: 'Langkah 1 · Luapan Air Mulai Masuk',
      instruction: 'Air banjir mulai merembes masuk ke halaman sekolah. Ketinggian air terus naik. Apa tindakan pertama?',
      options: [
        { text: 'Segera pindah ke lantai dua gedung sekolah', correct: true, feedback: 'Benar! Amankan diri ke tempat yang lebih tinggi jika evakuasi luar tidak memungkinkan.' },
        { text: 'Bermain air banjir bersama teman di halaman', correct: false, feedback: 'Bahaya. Air banjir membawa kotoran, penyakit, dan risiko hanyut.' },
        { text: 'Mencoba berjalan menerjang banjir untuk pulang', correct: false, feedback: 'Bahaya. Arus banjir yang tidak terlihat bisa sangat deras dan menyeret Anda.' },
      ],
    },
    {
      title: 'Langkah 2 · Evakuasi Peralatan Penting',
      instruction: 'Sebelum mengungsi ke lantai atas, tindakan pengamanan apa yang wajib dilakukan?',
      options: [
        { text: 'Mematikan stop kontak listrik utama sekolah', correct: true, feedback: 'Benar! Listrik dalam air banjir bisa menyengat dan berakibat fatal.' },
        { text: 'Membiarkan semua colokan listrik tetap terhubung', correct: false, feedback: 'Sangat berbahaya! Korsleting listrik bisa terjadi.' },
        { text: 'Menyembunyikan buku pelajaran di lantai dasar', correct: false, feedback: 'Barang di lantai dasar akan terendam air dan rusak.' },
      ],
    },
    {
      title: 'Langkah 3 · Pasca Banjir',
      instruction: 'Air banjir mulai surut dari ruangan sekolah. Apa yang harus diwaspadai?',
      options: [
        { text: 'Kabel listrik yang terkelupas dan genangan air kotor', correct: true, feedback: 'Benar! Sengatan listrik sisa dan bakteri leptospirosis sangat berbahaya.' },
        { text: 'Segera menyalakan AC dan komputer sekolah', correct: false, feedback: 'Peralatan elektronik yang basah wajib dikeringkan dan dicek teknisi terlebih dahulu.' },
        { text: 'Mengonsumsi air banjir yang sudah mengendap', correct: false, feedback: 'Air banjir sangat tercemar, jangan dikonsumsi.' },
      ],
    },
  ],
  tsunami: [
    {
      title: 'Langkah 1 · Tanda Bahaya Tsunami',
      instruction: 'Setelah gempa besar di pesisir pantai, air laut mendadak surut secara drastis hingga ikan-ikan terdampar. Apa tindakan Anda?',
      options: [
        { text: 'Segera berlari ke arah perbukitan atau tempat dengan ketinggian > 30 meter', correct: true, feedback: 'Benar! Air laut surut drastis adalah tanda mutlak tsunami segera datang.' },
        { text: 'Pergi ke pantai untuk mengambil ikan yang terdampar', correct: false, feedback: 'Sangat berbahaya! Gelombang tsunami akan datang dalam hitungan menit.' },
        { text: 'Menunggu pengumuman resmi di televisi terlebih dahulu', correct: false, feedback: 'Waktu sangat berharga. Evakuasi mandiri harus segera dilakukan.' },
      ],
    },
    {
      title: 'Langkah 2 · Memilih Tempat Evakuasi',
      instruction: 'Jalur evakuasi sangat padat kendaraan. Bagaimana cara terbaik untuk menyelamatkan diri?',
      options: [
        { text: 'Berlari kaki menuju dataran tinggi melalui rute evakuasi khusus', correct: true, feedback: 'Benar! Berjalan kaki mencegah Anda terjebak macet total di jalan.' },
        { text: 'Tetap berada di dalam mobil di jalan raya', correct: false, feedback: 'Mobil rentan terjebak macet dan tersapu gelombang tsunami.' },
        { text: 'Berlindung di dalam rumah kayu dekat pantai', correct: false, feedback: 'Rumah di dekat pantai akan hancur diterjang kekuatan air tsunami.' },
      ],
    },
    {
      title: 'Langkah 3 · Gelombang Pertama Surut',
      instruction: 'Gelombang tsunami pertama telah menghantam dan air mulai surut kembali ke laut. Apakah aman untuk turun?',
      options: [
        { text: 'Tidak, gelombang tsunami susulan biasanya lebih besar dan terus menerjang beberapa jam', correct: true, feedback: 'Benar! Gelombang tsunami selalu datang berkali-kali. Tetap di atas.' },
        { text: 'Ya, segera turun untuk mencari korban selamat', correct: false, feedback: 'Sangat berbahaya! Gelombang kedua bisa datang tanpa peringatan.' },
        { text: 'Ya, karena air sudah kembali ke laut', correct: false, feedback: 'Air yang kembali ke laut justru mengumpulkan energi untuk gelombang berikutnya.' },
      ],
    },
  ],
  landslide: [
    {
      title: 'Langkah 1 · Mendeteksi Gejala Longsor',
      instruction: 'Saat hujan deras di dekat tebing sekolah, terdengar suara gemuruh dan pohon-pohon mulai miring. Tindakan cepat Anda?',
      options: [
        { text: 'Segera evakuasi menjauhi lereng bukit/tebing', correct: true, feedback: 'Benar! Jauhi area tebing dan aliran lembah karena tanah longsor bergerak cepat.' },
        { text: 'Mendekati tebing untuk memeriksa sumber suara gemuruh', correct: false, feedback: 'Bahaya! Anda bisa langsung tertimbun material longsor.' },
        { text: 'Berlindung di bawah pohon rindang dekat tebing', correct: false, feedback: 'Pohon yang miring justru akan tumbang dan menimpa Anda.' },
      ],
    },
    {
      title: 'Langkah 2 · Saat Tertjebak Aliran Longsor',
      instruction: 'Lumpur dan batu meluncur deras ke arah Anda. Bagaimana cara menghindarinya?',
      options: [
        { text: 'Lari tegak lurus (menyamping) dari arah aliran longsor', correct: true, feedback: 'Benar! Lari menyamping menjauhi jalur luncuran lumpur.' },
        { text: 'Lari searah dengan luncuran longsor', correct: false, feedback: 'Kecepatan longsor tanah jauh lebih cepat daripada lari manusia.' },
        { text: 'Merapatkan diri di dinding luar bangunan', correct: false, feedback: 'Dinding bangunan rentan runtuh jika dihantam batu longsor.' },
      ],
    },
    {
      title: 'Langkah 3 · Pasca Longsor',
      instruction: 'Material longsor telah berhenti bergerak. Apa langkah pengamanan selanjutnya?',
      options: [
        { text: 'Tetap berada di tempat aman karena berpotensi terjadi longsor susulan', correct: true, feedback: 'Benar! Tanah longsor sering terjadi berulang, terutama jika hujan masih turun.' },
        { text: 'Mengeksplorasi gundukan tanah longsor untuk mencari barang berharga', correct: false, feedback: 'Gundukan tanah tersebut masih labil dan berisiko longsor susulan.' },
        { text: 'Langsung mendirikan tenda darurat di bawah tebing', correct: false, feedback: 'Area tebing pasca-longsor sangat berbahaya dan tidak boleh ditempati.' },
      ],
    },
  ],
  volcano: [
    {
      title: 'Langkah 1 · Status Awas Gunung Api',
      instruction: 'Gunung berapi di dekat sekolah naik status menjadi AWAS dan mulai mengeluarkan asap tebal. Apa prioritas Anda?',
      options: [
        { text: 'Mengikuti instruksi evakuasi menuju pos pengungsian di luar zona bahaya', correct: true, feedback: 'Benar! Segera kosongkan area dalam radius bahaya gunung api.' },
        { text: 'Mengunci diri di dalam kamar kelas dan tidur', correct: false, feedback: 'Gas beracun dan awan panas bisa merembes masuk ke celah bangunan.' },
        { text: 'Naik ke puncak gunung untuk mengambil foto dokumentasi', correct: false, feedback: 'Tindakan bunuh diri! Suhu di puncak gunung sangat panas dan beracun.' },
      ],
    },
    {
      title: 'Langkah 2 · Melindungi Diri dari Abu Vulkanik',
      instruction: 'Hujan abu vulkanik mulai turun lebat menyelimuti sekolah. Bagaimana cara melindungi diri Anda?',
      options: [
        { text: 'Memakai masker kain/N95, kacamata pelindung, dan pakaian tertutup', correct: true, feedback: 'Benar! Abu vulkanik tajam (silika) dapat merusak paru-paru dan kornea mata.' },
        { text: 'Membasuh muka dengan air hujan yang sedang turun', correct: false, feedback: 'Air hujan di sekitar letusan gunung biasanya bersifat asam dan berbahaya.' },
        { text: 'Keluar kelas untuk membersihkan genteng tanpa pengaman', correct: false, feedback: 'Udara luar dipenuhi partikel debu tajam yang berbahaya untuk dihirup.' },
      ],
    },
    {
      title: 'Langkah 3 · Ancaman Lahar Dingin',
      instruction: 'Hujan lebat terjadi di puncak gunung setelah erupsi selesai. Apa bahaya sekunder yang wajib dihindari?',
      options: [
        { text: 'Aliran sungai yang berhulu di gunung (potensi lahar dingin)', correct: true, feedback: 'Benar! Lahar dingin berupa banjir lumpur batu bersuhu dingin meluncur di sepanjang sungai.' },
        { text: 'Bermain layang-layang di lapangan terbuka', correct: false, feedback: 'Bahaya utama adalah banjir lahar dingin yang menerjang jembatan/bantaran sungai.' },
        { text: 'Mancing di sungai terdekat', correct: false, feedback: 'Sangat berbahaya! Sungai bisa meluap akibat lahar dingin secara tiba-tiba.' },
      ],
    },
  ],
  fire: [
    {
      title: 'Langkah 1 · Bunyi Alarm Kebakaran',
      instruction: 'Alarm kebakaran berbunyi keras di gedung sekolah. Tercium bau asap menyengat. Apa tindakan pertama?',
      options: [
        { text: 'Keluar kelas secara tertib mengikuti jalur evakuasi menuju lapangan', correct: true, feedback: 'Benar! Evakuasi cepat adalah kunci utama keselamatan saat terjadi kebakaran.' },
        { text: 'Membereskan semua buku pelajaran ke dalam tas terlebih dahulu', correct: false, feedback: 'Menyia-nyiakan waktu! Api menyebar sangat cepat dalam hitungan detik.' },
        { text: 'Mencari ruang toilet untuk bersembunyi', correct: false, feedback: 'Ruang tertutup tanpa sirkulasi akan menjebak Anda dalam asap beracun.' },
      ],
    },
    {
      title: 'Langkah 2 · Menembus Asap Tebal',
      instruction: 'Lorong sekolah dipenuhi oleh asap hitam pekat yang menghalangi pandangan. Bagaimana cara Anda melewatinya?',
      options: [
        { text: 'Merangkak/menunduk serendah mungkin sambil menutup hidung dengan kain basah', correct: true, feedback: 'Benar! Udara bersih berada di bagian bawah (dekat lantai). Kain basah menyaring racun.' },
        { text: 'Berlari tegak secepat mungkin sambil bernapas dalam-dalam', correct: false, feedback: 'Menghirup asap beracun (karbon monoksida) dapat menyebabkan pingsan seketika.' },
        { text: 'Berteriak meminta tolong dengan mulut terbuka lebar', correct: false, feedback: 'Berteriak di tengah asap pekat justru memasukkan asap beracun ke paru-paru Anda.' },
      ],
    },
    {
      title: 'Langkah 3 · Pintu Terasa Panas',
      instruction: 'Anda hendak membuka pintu keluar, namun gagang pintu terasa sangat panas saat disentuh. Apa artinya?',
      options: [
        { text: 'Jangan buka pintu tersebut karena api besar berkobar di baliknya', correct: true, feedback: 'Benar! Pintu panas menandakan api berada di balik pintu. Cari jendela atau pintu lain.' },
        { text: 'Segera buka pintu lebar-lebar untuk melihat kondisi api', correct: false, feedback: 'Membuka pintu akan memicu "backdraft" (ledakan api akibat suplai oksigen mendadak).' },
        { text: 'Menyiram pintu dengan seember air lalu membukanya', correct: false, feedback: 'Air tidak cukup mendinginkan kobaran api besar di balik pintu.' },
      ],
    },
  ],
};

// Continuous learning materials data structure
const learningMaterials = [
  {
    topic: 'Gempa Bumi',
    chapters: [
      { title: 'Sains Gempa & Sesar Aktif', content: 'Gempa bumi disebabkan oleh pelepasan energi akibat pergeseran lempeng tektonik. Indonesia berada di pertemuan tiga lempeng aktif: Indo-Australia, Eurasia, dan Pasifik. Sesar aktif seperti Sesar Semangko di Sumatra atau Sesar Cimandiri di Jawa Barat sering memicu gempa darat dangkal.' },
      { title: 'Tindakan Mitigasi Pra-Gempa', content: 'Kenali struktur bangunan sekolah Anda. Pastikan lemari, rak buku, dan benda berat lainnya telah dipaku kuat ke dinding agar tidak roboh saat guncangan. Buat peta evakuasi dan latih seluruh penghuni sekolah secara berkala.' },
      { title: 'Langkah Penyelamatan Diri Saat Gempa', content: 'Jika di dalam ruangan: Lakukan Drop, Cover, Hold On. Lindungi kepala dengan tangan atau helm. Jika guncangan reda, keluar dengan tertib. Jika di luar ruangan: Jauhi tiang listrik, pohon, reklame, dan bangunan kaca. Cari lapangan terbuka luas.' },
    ]
  },
  {
    topic: 'Banjir',
    chapters: [
      { title: 'Mengenal Penyebab Banjir', content: 'Banjir dapat dipicu curah hujan tinggi, penyumbatan saluran air, penggundulan hutan di hulu, dan pasang air laut (banjir rob). Pengendalian membutuhkan kolaborasi menjaga kebersihan selokan dan pelestarian resapan air.' },
      { title: 'Kesiapsiagaan Sekolah Menghadapi Banjir', content: 'Simpan dokumen penting sekolah, alat elektronik, dan inventaris buku di lantai atas. Ketahui jalur evakuasi menuju tempat pengungsian yang lebih tinggi.' },
      { title: 'Bahaya Sengatan Listrik & Sanitasi', content: 'Air banjir menghantarkan listrik. Segera matikan sekring utama. Bersihkan tangan dengan sabun setelah menyentuh air banjir karena air tersebut rentan tercemar bakteri leptospirosis dan kolera.' },
    ]
  },
  {
    topic: 'Tsunami',
    chapters: [
      { title: 'Bagaimana Tsunami Terjadi?', content: 'Tsunami adalah gelombang raksasa yang dipicu oleh gempa bumi tektonik bawah laut (kedalaman < 70 km, kekuatan > 7.0 SR, dengan patahan vertikal), longsor bawah laut, atau letusan gunung berapi bawah laut.' },
      { title: 'Membaca Tanda Alam (Water Retreat)', content: 'Jika pantai mendadak surut secara drastis setelah gempa bumi, jangan dekati pantai. Itu adalah isyarat bahwa gelombang tsunami raksasa sedang mengumpulkan energi untuk menerjang daratan.' },
      { title: 'Evakuasi Mandiri Rambu Hijau', content: 'Gunakan prinsip evakuasi mandiri tanpa menunggu instruksi resmi jika gempa dirasakan kuat dan lama (> 20 detik). Ikuti rambu penunjuk evakuasi tsunami menuju tempat aman di atas 30 meter dpl.' },
    ]
  }
];

export function DisasterQuestionView() {
  const { t, locale } = useI18n();
  const [activeTab, setActiveTab] = useState<'sim' | 'materi' | 'panduan'>('sim');
  const { currentProfile, refreshProfile, updateUserProfile } = useAuth();
  const { selection } = useSchool();
  const activeSchool = selection?.school;

  // Simulation execution state
  const [phase, setPhase] = useState<'select' | 'sim' | 'result' | 'loading_smart'>('select');
  const [selectedType, setSelectedType] = useState<DisasterType | 'smart' | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [smartSteps, setSmartSteps] = useState<SimStep[]>([]);
  const [smartMastered, setSmartMastered] = useState<string[]>([]);

  // Materials state
  const [selectedMaterialIdx, setSelectedMaterialIdx] = useState(0);

  const startSim = (type: DisasterType | 'smart') => {
    setSelectedType(type);
    setStepIdx(0);
    setAnswers([]);
    setFeedback(null);
    setPicked(null);
    setSmartSteps([]);
    setSmartMastered([]);
    
    if (type === 'smart') {
      startSmartSim();
    } else {
      setPhase('sim');
    }
  };

  const startSmartSim = async () => {
    setPhase('loading_smart');
    const schoolRisk = activeSchool ? {
      earthquake: activeSchool.earthquake,
      flood: activeSchool.flood,
      tsunami: activeSchool.tsunami,
      landslide: activeSchool.landslide,
      volcano: activeSchool.volcanic,
      fire: 30, // Default static probability
    } : { earthquake: 20, flood: 20, tsunami: 20, landslide: 20, volcano: 20, fire: 20 };
    
    const qs = await generateSmartSimulationQuestions({
      schoolRisk,
      masteredConcepts: currentProfile?.masteredConcepts || [],
      mode: 'learning',
      count: 10
    });

    const mappedSteps: SimStep[] = qs.map((q, idx) => {
      // Shuffle options and attach correct boolean
      const options = (q.options || []).map(opt => ({
        text: opt,
        correct: opt.startsWith(q.correctOption || 'A'),
        feedback: opt.startsWith(q.correctOption || 'A') ? 'Benar!' : `Salah. Jawaban tepat adalah ${q.correctOption}.`,
        subTopic: q.subTopic
      })).sort(() => Math.random() - 0.5);

      return {
        title: `Skenario Cerdas ${idx + 1} · ${q.subTopic}`,
        instruction: q.question,
        options
      };
    });

    setSmartSteps(mappedSteps);
    setPhase('sim');
  };

  const reset = () => {
    setPhase('select');
    setSelectedType(null);
    setStepIdx(0);
    setAnswers([]);
    setFeedback(null);
    setPicked(null);
    setSmartSteps([]);
    setSmartMastered([]);
  };

  const pickOption = (correct: boolean, feedbackText: string, idx: number, subTopic?: string) => {
    if (feedback !== null) return;
    setPicked(idx);
    setFeedback(feedbackText);
    setAnswers((a) => [...a, correct]);
    if (correct && subTopic && selectedType === 'smart') {
      setSmartMastered((prev) => [...prev, subTopic]);
    }
  };

  const nextStep = () => {
    const steps = selectedType === 'smart' ? smartSteps : (selectedType ? simSteps[selectedType] : []);
    if (stepIdx + 1 < steps.length) {
      setStepIdx(stepIdx + 1);
      setFeedback(null);
      setPicked(null);
    } else {
      setPhase('result');
      if (selectedType === 'smart' && currentProfile) {
        const scoreEarned = Math.round((answers.filter(Boolean).length / answers.length) * 100) || 0;
        const pointsEarned = Math.round(scoreEarned * 0.5);
        const newTotal = (currentProfile.totalPoints || 0) + pointsEarned;
        const newTopicScores = { ...currentProfile.topicScores };
        smartMastered.forEach(t => { 
          if (!newTopicScores[t]) newTopicScores[t] = createInitialTopicScore();
          newTopicScores[t].averageScore = 100; 
        });
        updateUserProfile({ totalPoints: newTotal, topicScores: newTopicScores });
      }
    }
  };

  const score = Math.round((answers.filter(Boolean).length / answers.length) * 100) || 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-6 text-white shadow-glass-lg sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:36px_36px] opacity-15" />
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            <Shield className="h-3.5 w-3.5" strokeWidth={2.5} /> {locale === 'id' ? 'Pertanyaan Bencana' : 'Disaster Question'}
          </div>
          <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            {locale === 'id' ? 'Pusat Pertanyaan Bencana' : 'Disaster Question Center'}
          </h2>
          <p className="mt-1.5 max-w-md text-sm text-brand-100">
            {locale === 'id'
              ? 'Ikuti pertanyaan bencana interaktif, pelajari materi bencana berkelanjutan, dan ikuti panduan penyelamatan diri.'
              : 'Take interactive disaster questions and read continuous safety guides.'}
          </p>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-brand-100 dark:border-slate-800">
        <button
          onClick={() => { setActiveTab('sim'); reset(); }}
          className={`flex-1 pb-3 text-center text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'sim'
              ? 'border-brand-600 text-brand-600 dark:border-brand-50 dark:text-brand-400'
              : 'border-transparent text-ink-500 hover:text-ink-800 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          🎮 {locale === 'id' ? 'Simulasi Interaktif' : 'Interactive Sim'}
        </button>
        <button
          onClick={() => setActiveTab('materi')}
          className={`flex-1 pb-3 text-center text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'materi'
              ? 'border-brand-600 text-brand-600 dark:border-brand-50 dark:text-brand-400'
              : 'border-transparent text-ink-500 hover:text-ink-800 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          📚 {locale === 'id' ? 'Materi Berkelanjutan' : 'Continuous Materials'}
        </button>
        <button
          onClick={() => setActiveTab('panduan')}
          className={`flex-1 pb-3 text-center text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'panduan'
              ? 'border-brand-600 text-brand-600 dark:border-brand-50 dark:text-brand-400'
              : 'border-transparent text-ink-500 hover:text-ink-800 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          📋 {locale === 'id' ? 'Panduan Evakuasi Diri' : 'Evacuation Guide'}
        </button>
      </div>

      {/* 1. SIMULASI TAB */}
      {activeTab === 'sim' && (
        <div className="space-y-6">
          {phase === 'select' && (
            <>
              <div 
                onClick={() => startSim('smart')}
                className="glass relative cursor-pointer overflow-hidden rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50 to-white p-6 shadow-glow transition-all hover:-translate-y-1 hover:shadow-glass-lg dark:border-brand-500/20 dark:from-brand-900/40 dark:to-slate-900"
              >
                <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-brand-500/20 blur-3xl" />
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md">
                    <Sparkles className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-ink-900 dark:text-white">Smart Mix AI Simulation</h3>
                    <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-500 dark:text-slate-400">
                      AI akan menyusun 10 skenario bencana cerdas secara spesifik khusus untuk sekolah Anda. Topik yang sudah Anda kuasai tidak akan diulang!
                    </p>
                  </div>
                  <ChevronRight className="ml-auto h-6 w-6 text-brand-500" />
                </div>
              </div>

              <h4 className="font-display text-base font-bold text-ink-900 dark:text-white">Atau Pilih Skenario Manual:</h4>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {disasterOptions.map((d) => (
                  <div key={d.id} className="glass rounded-2xl p-5 hover:shadow-glass transition-all group flex flex-col justify-between">
                    <div>
                      <span
                        className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${d.accent} text-white shadow-md transition-transform group-hover:scale-105`}
                      >
                        <d.icon className="h-6 w-6" strokeWidth={2} />
                      </span>
                      <h3 className="mt-4 font-display text-lg font-bold text-ink-900 dark:text-white">{d.label}</h3>
                      <p className="text-[10px] font-semibold text-brand-600 dark:text-brand-400">{d.difficulty}</p>
                      <p className="mt-2 text-xs text-ink-500 dark:text-slate-400 leading-relaxed">{d.desc}</p>
                    </div>
                    <button
                      onClick={() => startSim(d.id)}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-xs font-bold text-white hover:bg-brand-700 transition-colors shadow-glow"
                    >
                      <Play className="h-3 w-3 fill-white" />
                      Mulai Manual
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {phase === 'loading_smart' && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <LogoSpinner size="lg" />
              <div className="text-center">
                <p className="font-display font-bold text-ink-900 dark:text-white">Menyusun Skenario AI Spesifik...</p>
                <p className="text-sm text-ink-500 dark:text-slate-400 mt-1">Mengukur risiko sekolah dan riwayat belajar Anda</p>
              </div>
            </div>
          )}

          {phase === 'sim' && selectedType && (
            <div className="space-y-6">
              {/* Progress bar */}
              <div className="glass rounded-2xl p-5 dark:bg-slate-900/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white ${selectedType === 'smart' ? 'from-indigo-500 to-purple-600' : 'from-brand-500 to-brand-600'}`}>
                      {selectedType === 'smart' && <Sparkles className="h-5 w-5" />}
                      {selectedType === 'earthquake' && <Mountain className="h-5 w-5" />}
                      {selectedType === 'flood' && <CloudRain className="h-5 w-5" />}
                      {selectedType === 'tsunami' && <Waves className="h-5 w-5" />}
                      {selectedType === 'landslide' && <Trees className="h-5 w-5" />}
                      {selectedType === 'volcano' && <Flame className="h-5 w-5" />}
                      {selectedType === 'fire' && <Flame className="h-5 w-5" />}
                    </span>
                    <div>
                      <h3 className="font-display text-sm font-bold text-ink-900 dark:text-white">
                        {selectedType === 'smart' ? 'Smart Mix AI Simulation' : `Simulasi ${disasterOptions.find(d => d.id === selectedType)?.label}`}
                      </h3>
                      <p className="text-[10px] text-ink-500">Langkah {stepIdx + 1} dari {(selectedType === 'smart' ? smartSteps : simSteps[selectedType]).length}</p>
                    </div>
                  </div>
                  <button
                    onClick={reset}
                    className="text-xs border border-brand-100 hover:bg-brand-50 px-3 py-1.5 rounded-full text-ink-600 font-bold dark:border-slate-800 dark:hover:bg-slate-800"
                  >
                    <RotateCcw className="h-3 w-3 inline mr-1" /> Restart
                  </button>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  {(selectedType === 'smart' ? smartSteps : simSteps[selectedType]).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-all ${
                        i < stepIdx ? (selectedType === 'smart' ? 'bg-indigo-500' : 'bg-brand-500') : i === stepIdx ? (selectedType === 'smart' ? 'bg-indigo-600' : 'bg-brand-600') : 'bg-brand-100 dark:bg-slate-800'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Step detail */}
              {(() => {
                const step = selectedType === 'smart' ? smartSteps[stepIdx] : simSteps[selectedType][stepIdx];
                if (!step) return null;
                return (
                  <div className="glass rounded-2xl p-6 space-y-4">
                    <h4 className="font-display text-base font-bold text-brand-600">
                      {step.title}
                    </h4>
                    <p className="text-sm font-bold text-ink-900 dark:text-white leading-relaxed">
                      {step.instruction}
                    </p>

                    <div className="grid gap-3 pt-2">
                      {step.options.map((opt, i) => {
                        const isPicked = picked === i;
                        const showResult = feedback !== null;
                        const st = (opt as { subTopic?: string }).subTopic;
                        return (
                          <button
                            key={i}
                            disabled={showResult}
                            onClick={() => pickOption(opt.correct, opt.feedback, i, st)}
                            className={`flex items-center gap-3 w-full p-4 rounded-xl border text-left text-xs font-semibold transition-all ${
                              showResult
                                ? isPicked
                                  ? opt.correct
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400'
                                    : 'border-red-500 bg-red-50 text-red-800 dark:bg-red-950/20 dark:text-red-400'
                                  : opt.correct
                                    ? 'border-emerald-300 bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/10'
                                    : 'border-brand-50 bg-white/40 text-ink-400 dark:border-slate-800 dark:bg-slate-900/40'
                                : 'border-brand-100 bg-white hover:border-brand-300 hover:bg-brand-50/60 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'
                            }`}
                          >
                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold ${
                              showResult && isPicked
                                ? opt.correct
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-red-500 text-white'
                                : 'bg-brand-100 text-brand-700 dark:bg-slate-700 dark:text-brand-400'
                            }`}>
                              {String.fromCharCode(65 + i)}
                            </span>
                            {opt.text}
                          </button>
                        );
                      })}
                    </div>

                    {/* Feedback Panel */}
                    {feedback && (
                      <div className="p-4 rounded-xl border border-brand-100 bg-brand-50/40 dark:border-slate-800 dark:bg-slate-900/40 mt-4">
                        <p className="text-xs text-ink-700 dark:text-slate-300 leading-relaxed font-semibold">
                          {feedback}
                        </p>
                        <button
                          onClick={nextStep}
                          className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-brand-700 shadow-glow transition-all"
                        >
                          {stepIdx + 1 < (selectedType === 'smart' ? smartSteps : simSteps[selectedType]).length ? 'Langkah Selanjutnya' : 'Lihat Hasil'} &rarr;
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

            </div>
          )}

          {phase === 'result' && (
            <div className="glass rounded-2xl p-6 text-center max-w-xl mx-auto space-y-6">
              <div className="flex flex-col items-center">
                <Donut value={score} size={150} stroke={12} label={`${score}%`} sublabel="Nilai Akhir" />
                <h3 className="mt-4 font-display text-lg font-bold text-ink-900 dark:text-white">
                  {score >= 70 ? '🎉 Selamat! Anda Lulus Simulasi' : '💪 Terus Berlatih & Coba Lagi'}
                </h3>
                <p className="mt-2 text-xs text-ink-500 dark:text-slate-400">
                  Anda berhasil mengambil keputusan benar sebanyak **${answers.filter(Boolean).length}** dari **${answers.length}** langkah evakuasi.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:justify-center">
                <button
                  onClick={reset}
                  className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-brand-700 shadow-glow"
                >
                  <RotateCcw className="h-4 w-4" /> Coba Simulasi Lain
                </button>
                <Link
                  to="/app"
                  className="flex items-center justify-center gap-2 rounded-xl border border-brand-100 hover:bg-brand-50 px-5 py-2.5 text-xs font-bold text-ink-600 dark:border-slate-800 dark:hover:bg-slate-800"
                >
                  <ArrowLeft className="h-4 w-4" /> Kembali ke Dasbor
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. MATERI PEMBELAJARAN BERKELANJUTAN TAB */}
      {activeTab === 'materi' && (
        <div className="grid gap-6 lg:grid-cols-4 min-h-[400px]">
          {/* Menu materi */}
          <div className="lg:col-span-1 glass rounded-2xl p-4 space-y-4 dark:bg-slate-900/60">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-600">Topik Bencana</h3>
            <div className="space-y-1">
              {learningMaterials.map((mat, idx) => (
                <button
                  key={mat.topic}
                  onClick={() => setSelectedMaterialIdx(idx)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                    selectedMaterialIdx === idx
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/20 dark:text-brand-400 border-l-4 border-brand-500'
                      : 'hover:bg-brand-50/40 text-ink-700 dark:text-slate-300'
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
                Kurikulum Berkelanjutan: Mitigasi {learningMaterials[selectedMaterialIdx].topic}
              </h3>
            </div>

            <div className="space-y-6">
              {learningMaterials[selectedMaterialIdx].chapters.map((ch, cIdx) => (
                <div key={cIdx} className="space-y-2 border-l-2 border-brand-100 pl-4 py-1 dark:border-slate-800 relative">
                  <div className="absolute -left-1.5 top-2 w-3 h-3 rounded-full bg-brand-500" />
                  <h4 className="text-sm font-bold text-brand-700 dark:text-brand-400">
                    Bab {cIdx + 1}: {ch.title}
                  </h4>
                  <p className="text-xs text-ink-600 dark:text-slate-300 leading-relaxed">
                    {ch.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. PANDUAN EVAKUASI DIRI TAB */}
      {activeTab === 'panduan' && (
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
                <h4 className="text-xs font-bold text-ink-900 dark:text-white">1. Pra-Evakuasi (Siaga)</h4>
                <p className="mt-1.5 text-[11px] text-ink-500 dark:text-slate-400 leading-relaxed">
                  Siapkan Tas Siaga Bencana (P3K, senter, air minum, dokumen penting) di dekat pintu keluar.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-brand-50 bg-white/40 dark:bg-slate-800 dark:border-slate-700 flex flex-col justify-between">
              <div>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-650 dark:bg-brand-950/20 dark:text-brand-400 mb-3">
                  <Heart className="h-5 w-5" />
                </span>
                <h4 className="text-xs font-bold text-ink-900 dark:text-white">2. Amankan Diri Pertama</h4>
                <p className="mt-1.5 text-[11px] text-ink-500 dark:text-slate-400 leading-relaxed">
                  Matikan sekring utama listrik dan kompor gas segera. Lindungi kepala memakai tangan, tas, atau helm.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-brand-50 bg-white/40 dark:bg-slate-800 dark:border-slate-700 flex flex-col justify-between">
              <div>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 mb-3">
                  <MapPin className="h-5 w-5" />
                </span>
                <h4 className="text-xs font-bold text-ink-900 dark:text-white">3. Rute Evakuasi Hijau</h4>
                <p className="mt-1.5 text-[11px] text-ink-500 dark:text-slate-400 leading-relaxed">
                  Ikuti papan rambu evakuasi berwarna hijau. Gunakan tangga darurat, dilarang memakai lift atau eskalator.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-brand-50 bg-white/40 dark:bg-slate-800 dark:border-slate-700 flex flex-col justify-between">
              <div>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 mb-3">
                  <Shield className="h-5 w-5" />
                </span>
                <h4 className="text-xs font-bold text-ink-900 dark:text-white">4. Berkumpul & Laporkan</h4>
                <p className="mt-1.5 text-[11px] text-ink-500 dark:text-slate-400 leading-relaxed">
                  Menuju titik kumpul terbuka (lapangan). Laporkan jumlah anggota keluarga/kelas ke koordinator evakuasi.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


