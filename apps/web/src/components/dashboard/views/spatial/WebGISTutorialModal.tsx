import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  School,
  AlertTriangle,
  CloudRain,
  Navigation,
  Globe2,
  CheckCircle2,
  ShieldCheck,
  Compass,
  Layers,
  Video,
  Mountain,
  Activity,
  Bot,
  Sparkles,
  Flame,
  ArrowRight,
  MapPin,
  Eye,
  ListOrdered,
  Sparkle,
} from 'lucide-react';

export interface WebGISTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDisasterCenter?: () => void;
  onOpenWeather?: () => void;
  onOpenRouteNavigator?: () => void;
  onOpenCctv?: () => void;
  onLocateUser?: () => void;
  onOpenGeospatialStudio?: () => void;
  onOpenCopilot?: () => void;
}

interface FeaturePriorityItem {
  rank: number;
  title: string;
  categoryBadge: string;
  badgeColor: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  importanceReason: string;
  practicalUtilities: string[];
  actionLabel?: string;
  actionKey?: 'disaster' | 'evacuation' | 'weather' | 'cctv' | 'elevation' | 'studio' | 'copilot';
}

interface TutorialStep {
  stepNumber: number;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  description: string;
  keyPoints: { title: string; desc: string; icon: React.ComponentType<{ className?: string }> }[];
  actionHint: string;
}

/**
 * Hierarki Fitur WebGIS Berdasarkan Urutan Kepentingan & Kegunaan
 * Diurutkan dari yang paling penting (penyelamatan jiwa / early warning) hingga pendukung
 */
const FEATURE_PRIORITIES: FeaturePriorityItem[] = [
  {
    rank: 1,
    title: 'Pusat Deteksi Dini & Zona Bencana Real-Time',
    categoryBadge: 'PRIORITAS 1 • KRUSIAL (PENYELAMATAN JIWA)',
    badgeColor: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
    icon: Activity,
    iconBg: 'from-rose-600 to-red-600',
    importanceReason:
      'Paling penting dan krusial karena saat gempa bumi kuat, erupsi gunung api, atau tsunami terjadi, detik-detik awal peringatan dini adalah penentu keselamatan nyawa ribuan siswa dan warga sebelum dampak destruktif tiba.',
    practicalUtilities: [
      'Pemantauan Gempa BMKG InaTEWS: Informasi real-time gempa M5.0+ dan dirasakan beserta estimasi percepatan tanah (PGA) dan intensitas MMI.',
      '68 Gunung Berapi Aktif PVMBG: Zonasi Kawasan Rawan Bencana (KRB III, II, I), status level aktivitas, dan arah aliran lahar/awan panas.',
      'Sesar Aktif & Patahan Darat: Memetakan jalur patahan geologi PuSGeN yang melintasi pemukiman dan kompleks sekolah.',
      'Deteksi Hotspot Karhutla: Pantauan anomali radiasi termal satelit NASA FIRMS MODIS/VIIRS untuk pencegahan kebakaran hutan dan lahan.',
    ],
    actionLabel: 'Buka Pusat Bahaya Bencana 🚨',
    actionKey: 'disaster',
  },
  {
    rank: 2,
    title: 'Rute Evakuasi Cerdas & Keterjangkauan Isochrone',
    categoryBadge: 'PRIORITAS 2 • SANGAT PENTING (MOBILITAS SURVIVAL)',
    badgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    icon: ShieldCheck,
    iconBg: 'from-emerald-600 to-teal-600',
    importanceReason:
      'Setelah ancaman bahaya diketahui, warga dan rombongan sekolah membutuhkan panduan jalur penyelamatan tercepat menuju Tempat Evakuasi Sementara (TES). Tanpa rute yang teruji, kepanikan dapat menyebabkan korban terperangkap di jalan buntu.',
    practicalUtilities: [
      'Navigasi Evakuasi Rombongan: Menghitung lintasan jalan kaki tercepat menuju lapangan terbuka aman gempa atau bukit tinggi aman tsunami.',
      'Uji Keterjangkauan 15 Menit: Analisis isochrone untuk memastikan warga mampu mencapai titik aman sebelum gelombang tsunami tiba.',
      'Penghindaran Koridor Runtuhan: Menghindari jembatan rawan retak, bibir tebing longsor, dan jalan sempit yang berpotensi macet total.',
    ],
    actionLabel: 'Simulasi Rute Evakuasi 🛡️',
    actionKey: 'evacuation',
  },
  {
    rank: 3,
    title: 'Intelijen Cuaca Ekstrem, Radar Doppler & Konsensus NWP',
    categoryBadge: 'PRIORITAS 3 • PENTING (PEMICU BENCANA SEKUNDER)',
    badgeColor: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
    icon: CloudRain,
    iconBg: 'from-sky-500 to-blue-600',
    importanceReason:
      'Lebih dari 70% bencana alam di Indonesia adalah hidrometeorologi. Hujan lebat berdurasi lama adalah pemicu utama longsor pada lereng kritis, banjir bandang hulu, dan luapan lahar dingin vulkanik.',
    practicalUtilities: [
      'Radar Cuaca Doppler Real-Time: Melacak pergerakan awan konvektif kumulonimbus dan intensitas curah hujan di atas wilayah sekolah.',
      'Ambang Batas Kejenuhan Lereng: Peringatan otomatis saat akumulasi hujan melebihi ambang batas fisis pemicu longsor (>50 mm).',
      'Konsensus 5 Model NWP: Sintesis prakiraan dari ECMWF IFS Eropa, GFS NOAA Amerika, ICON DWD Jerman, JMA Jepang, dan BMKG Indonesia.',
    ],
    actionLabel: 'Buka Panel Cuaca & Radar ⛅',
    actionKey: 'weather',
  },
  {
    rank: 4,
    title: 'Pengawasan Lapangan Visual: 700+ CCTV Jalan/Tol & Lampu ATCS',
    categoryBadge: 'PRIORITAS 4 • VALIDASI LAPANGAN REAL-TIME',
    badgeColor: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
    icon: Video,
    iconBg: 'from-purple-600 to-indigo-600',
    importanceReason:
      'Data sensor spasial perlu divalidasi dengan kondisi visual nyata di lapangan. Kamera siaran langsung membuktikan apakah jalur logistik bantuan darurat benar-benar terbuka, tertutup banjir, atau terhambat longsor jalanan.',
    practicalUtilities: [
      '700+ Kamera CCTV Publik: Akses siaran video langsung jalan arteri Dishub ATCS dan seluruh ruas jalan tol Bina Marga Kementerian PUPR.',
      'Validasi Kondisi Riil Lapangan: Memeriksa genangan banjir jalanan, pohon tumbang, atau antrean kendaraan secara visual 24 jam.',
      'Sinkronisasi Lampu Lalu Lintas ATCS: Memantau titik persimpangan lampu pengatur lalu lintas untuk kelancaran konvoi tanggap darurat.',
    ],
    actionLabel: 'Buka Pantauan CCTV Jalan/Tol 📹',
    actionKey: 'cctv',
  },
  {
    rank: 5,
    title: 'Altimeter Elevasi GNSS & Pemodelan Topografi (SRTM 30m)',
    categoryBadge: 'PRIORITAS 5 • ANALISIS MORFOLOGI LOKAL',
    badgeColor: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
    icon: Mountain,
    iconBg: 'from-indigo-600 to-blue-700',
    importanceReason:
      'Ketinggian (mdpl) adalah parameter fisik kunci dalam menentukan kerentanan: daerah di bawah 10 mdpl rawan tsunami pesisir & rob, sedangkan daerah perbukitan terjal di atas 500 mdpl rentan luncuran longsor.',
    practicalUtilities: [
      'Pengukuran Ketinggian Presisi: Mengukur elevasi tanah tempat tinggal/sekolah secara akurat (mdpl) menggunakan data satelit SRTM NASA.',
      'Klasifikasi Zona Topografi: Memetakan apakah wilayah tergolong Dataran Rendah Pesisir, Perbukitan Terjal, atau Lereng Pegunungan.',
      'Kalkulasi Tekanan Atmosfer: Menghitung estimasi tekanan barometer (hPa) dan titik didih air untuk kesiapsiagaan dataran tinggi.',
    ],
    actionLabel: 'Ukur Elevasi & Posisi GPS 📍',
    actionKey: 'elevation',
  },
  {
    rank: 6,
    title: 'Studio Geospasial & Analisis Citra Satelit Spektral',
    categoryBadge: 'PRIORITAS 6 • ANALISIS SPASIAL LANJUTAN',
    badgeColor: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30',
    icon: Globe2,
    iconBg: 'from-teal-600 to-emerald-700',
    importanceReason:
      'Penting untuk perencanaan mitigasi jangka menengah dan evaluasi dampak kerusakan lahan pascabencana menggunakan citra satelit penginderaan jauh resolusi tinggi.',
    practicalUtilities: [
      'Katalog STAC Satelit Sentinel-2 & Landsat: Akses citra optik multispektral bebas awan dari sensor satelit luar angkasa.',
      'Indeks Vegetasi NDVI: Mendeteksi deforestasi lereng bukit yang dapat mempercepat laju erosi dan tanah longsor.',
      'Indeks Kebasahan Air (NDWI) & Bekas Api (NBR): Memetakan luas genangan banjir dan sebaran area bekas kebakaran hutan.',
    ],
    actionLabel: 'Buka Studio Geospasial 🛰️',
    actionKey: 'studio',
  },
  {
    rank: 7,
    title: 'Harmony AI Copilot & Navigasi Suara/Teks Otomatis',
    categoryBadge: 'PRIORITAS 7 • PENDUKUNG OPERASIONAL & KONSULTASI',
    badgeColor: 'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/30',
    icon: Bot,
    iconBg: 'from-fuchsia-600 to-pink-600',
    importanceReason:
      'Berperan sebagai asisten interaktif yang memudahkan pengguna awam, siswa, dan guru untuk bertanya dan mengoperasikan seluruh sistem tanpa harus mencari tombol teknis satu per satu.',
    practicalUtilities: [
      'Konsultasi Cuaca & Bencana: Menanyakan kondisi cuaca saat ini, daerah mana yang sedang hujan, dan panduan mitigasi gempa.',
      'Otomatisasi Navigasi: Mengetik perintah singkat seperti "buka cuaca", "buka peta", atau "lokasi saya" untuk navigasi langsung.',
      'Edukasi Interaktif Siswa: Menjelaskan konsep kebencanaan secara simpel dan mudah dipahami dengan bahasa santun.',
    ],
    actionLabel: 'Buka Harmony AI Copilot 🤖',
    actionKey: 'copilot',
  },
];

/**
 * Langkah-Langkah Tutorial Interaktif Adaptif
 */
const TUTORIAL_STEPS: TutorialStep[] = [
  {
    stepNumber: 1,
    title: 'Selamat Datang di WebGIS Harmony',
    subtitle: 'Platform Edukasi Kebencanaan & Sekolah Tangguh Bencana Indonesia',
    badge: 'Langkah 1 • Pengenalan',
    badgeColor: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
    icon: School,
    iconBg: 'from-blue-600 to-indigo-600',
    description:
      'WebGIS Harmony dirancang untuk membantu guru, siswa, dan masyarakat luas memahami risiko bencana alam di lingkungan sekolah dan sekitarnya secara visual, ilmiah, dan mudah diakses. Platform ini mengintegrasikan data 213.513 sekolah di Indonesia dengan pantauan geologi, cuaca ekstrem, dan kamera lalu lintas langsung.',
    keyPoints: [
      {
        title: '213.513 Titik Sekolah Nasional',
        desc: 'Mencakup jenjang SD, SMP, SMA, dan SMK di seluruh 38 provinsi di Indonesia.',
        icon: School,
      },
      {
        title: 'Prinsip Sekolah Tangguh Bencana',
        desc: 'Identifikasi ancaman bahaya, zonasi kerentanan, dan panduan evakuasi dini.',
        icon: ShieldCheck,
      },
      {
        title: 'Visualisasi Sains untuk Awam',
        desc: 'Disajikan interaktif tanpa memerlukan keahlian teknis pemetaan yang rumit.',
        icon: Compass,
      },
    ],
    actionHint: 'Klik tombol "Lanjut" untuk mempelajari cara bernavigasi dan mencari sekolah Anda.',
  },
  {
    stepNumber: 2,
    title: 'Navigasi Peta, Pencarian & Mode 2D/3D Globe',
    subtitle: 'Jelajahi Lokasi Sekolah dengan Basemap Satelit dan Topografi',
    badge: 'Langkah 2 • Navigasi',
    badgeColor: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
    icon: Navigation,
    iconBg: 'from-sky-500 to-blue-600',
    description:
      'Anda dapat mencari sekolah Anda menggunakan bilah pencarian di bagian atas, menggeser peta secara bebas, atau beralih antara peta datar 2D dan bola bumi 3D Cesium yang realistis.',
    keyPoints: [
      {
        title: 'Bilah Pencarian Cepat',
        desc: 'Ketik nama sekolah, jalan, atau kabupaten/kota pada kotak pencarian di kiri atas.',
        icon: Compass,
      },
      {
        title: 'Pilihan Lapisan Basemap',
        desc: 'Beralih antara Peta Komunitas, Citra Satelit Optik Resolusi Tinggi, dan Topografi Berbayang.',
        icon: Layers,
      },
      {
        title: 'Mode Bola Bumi 3D (Cesium)',
        desc: 'Tekan tombol 3D untuk melihat kelengkungan bumi dan pemodelan terrain pegunungan nyata.',
        icon: Globe2,
      },
    ],
    actionHint: 'Klik titik sekolah mana saja di peta untuk membuka profil risiko kebencanaan sekolah tersebut.',
  },
  {
    stepNumber: 3,
    title: 'Pusat Pemantauan Bencana Real-Time',
    subtitle: 'Pantau Gempa Bumi BMKG, 68 Gunung Berapi PVMBG & Hotspot Karhutla',
    badge: 'Langkah 3 • Pantauan Bencana',
    badgeColor: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
    icon: AlertTriangle,
    iconBg: 'from-rose-500 to-amber-600',
    description:
      'Harmony menyajikan data bencana real-time resmi dari BMKG dan Badan Geologi PVMBG. Mengetahui ancaman di sekitar sekolah adalah pilar utama mitigasi mandiri warga sekolah.',
    keyPoints: [
      {
        title: 'Gempa Bumi BMKG InaTEWS',
        desc: 'Lingkaran gempa interaktif dengan magnitudo, kedalaman, dan radius guncangan dirasakan.',
        icon: Activity,
      },
      {
        title: '68 Gunung Berapi Aktif PVMBG',
        desc: 'Indikator status gunung api (Normal, Waspada, Siaga, Awas) beserta Kawasan Rawan Bencana.',
        icon: AlertTriangle,
      },
      {
        title: 'Titik Panas Karhutla Satelit',
        desc: 'Deteksi anomali suhu termal dari sensor satelit NASA VIIRS & MODIS di seluruh hutan Indonesia.',
        icon: Flame,
      },
    ],
    actionHint: 'Gunakan tombol "⚠️ Zona Rawan Bencana" di bilah atas untuk menyaring lapisan bencana dengan cepat.',
  },
  {
    stepNumber: 4,
    title: 'Simulasi Rute Evakuasi & Jalur Aman Sekolah',
    subtitle: 'Rencana Jalur Penyelamatan Menuju Tempat Evakuasi Sementara (TES)',
    badge: 'Langkah 4 • Jalur Penyelamatan',
    badgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    icon: ShieldCheck,
    iconBg: 'from-emerald-500 to-teal-600',
    description:
      'Saat gempa bumi kuat atau peringatan tsunami berbunyi, sekolah memerlukan jalur evakuasi yang jelas menuju tempat aman terdekat. WebGIS ini secara otomatis menghitung rute penyelamatan terbaik.',
    keyPoints: [
      {
        title: 'Penentuan Titik Kumpul Aman (TES/TEA)',
        desc: 'Mengarahkan rombongan siswa ke lapangan luas aman gempa atau bukit tinggi aman tsunami.',
        icon: ShieldCheck,
      },
      {
        title: 'Estimasi Waktu Tempuh Jalan Kaki',
        desc: 'Memastikan rombongan sekolah tiba di dataran tinggi sebelum estimasi gelombang tsunami datang.',
        icon: Navigation,
      },
      {
        title: 'Analisis Isochrone Keterjangkauan',
        desc: 'Memetakan zona jangkauan darurat 15 menit berjalan kaki di sekitar kompleks sekolah.',
        icon: Layers,
      },
    ],
    actionHint: 'Klik tombol "Rute Evakuasi Darurat" pada popup sekolah untuk mengaktifkan navigator evakuasi.',
  },
  {
    stepNumber: 5,
    title: 'Radar Cuaca Doppler & 700+ CCTV Jalan/Tol',
    subtitle: 'Validasi Cuaca Ekstrem dan Siaran Langsung Lalu Lintas di Lapangan',
    badge: 'Langkah 5 • Validasi Lapangan',
    badgeColor: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
    icon: Video,
    iconBg: 'from-purple-500 to-indigo-600',
    description:
      'Hujan lebat sering memicu longsor dan banjir jalanan. Harmony menggabungkan radar awan hujan satelit dengan siaran visual langsung dari 700+ kamera CCTV jalan tol dan persimpangan arteri di seluruh Indonesia.',
    keyPoints: [
      {
        title: 'Radar Hujan Doppler Real-Time',
        desc: 'Memantau intensitas curah hujan pemicu banjir bandang dan longsor lereng.',
        icon: CloudRain,
      },
      {
        title: '700+ Kamera CCTV Jalan & Tol',
        desc: 'Siaran langsung ATCS Dishub dan jalan tol Bina Marga PUPR untuk verifikasi kondisi fisik jalan.',
        icon: Video,
      },
      {
        title: 'Lampu Lalu Lintas & Persimpangan ATCS',
        desc: 'Memantau siklus lampu pengatur lalu lintas untuk kelancaran jalur bantuan logistik.',
        icon: Eye,
      },
    ],
    actionHint: 'Klik tombol "CCTV Tol & Jalan" pada menu lapisan untuk menampilkan ikon kamera di sepanjang jalan nasional.',
  },
  {
    stepNumber: 6,
    title: 'Altimeter Elevasi GNSS & Harmony AI Copilot',
    subtitle: 'Ukur Ketinggian Lokasi Anda dan Gunakan Asisten Cerdas Otomatis',
    badge: 'Langkah 6 • Fitur Cerdas',
    badgeColor: 'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/30',
    icon: Bot,
    iconBg: 'from-fuchsia-500 to-pink-600',
    description:
      'Ketahui ketinggian (mdpl) lokasi Anda secara presisi untuk mengukur kerentanan tsunami/banjir, serta manfaatkan Harmony AI Copilot untuk bertanya tentang cuaca dan navigasi fitur secara otomatis.',
    keyPoints: [
      {
        title: 'Altimeter Elevasi Digital (SRTM 30m)',
        desc: 'Mengukur koordinat GPS dan ketinggian tempat Anda (mdpl) menggunakan sensor GPS dan satelit radar SRTM.',
        icon: Mountain,
      },
      {
        title: 'Harmony AI Copilot Asisten Pintar',
        desc: 'Tanya cuaca hari ini, cek daerah mana yang hujan, atau minta navigasi menu tanpa repot mencari tombol.',
        icon: Bot,
      },
      {
        title: 'Penyesuaian Responsif Multi-Perangkat',
        desc: 'Dapat diakses lancar di laptop guru, komputer lab sekolah, maupun ponsel pintar siswa.',
        icon: Sparkles,
      },
    ],
    actionHint: 'Klik tombol robot di pojok kanan bawah untuk membuka Harmony AI Copilot kapan saja!',
  },
];

export const WebGISTutorialModal: React.FC<WebGISTutorialModalProps> = ({
  isOpen,
  onClose,
  onOpenDisasterCenter,
  onOpenWeather,
  onOpenRouteNavigator,
  onOpenCctv,
  onLocateUser,
  onOpenGeospatialStudio,
  onOpenCopilot,
}) => {
  const [activeTab, setActiveTab] = useState<'priorities' | 'tutorial'>('priorities');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const currentStep = TUTORIAL_STEPS[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === TUTORIAL_STEPS.length - 1;

  const handleFinish = () => {
    if (typeof window !== 'undefined' && dontShowAgain) {
      try {
        localStorage.setItem('hm_webgis_tutorial_seen', 'true');
      } catch {}
    }
    onClose();
  };

  const handleNext = () => {
    if (isLast) {
      handleFinish();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const executeFeatureAction = (actionKey?: string) => {
    handleFinish();
    switch (actionKey) {
      case 'disaster':
        onOpenDisasterCenter?.();
        break;
      case 'weather':
        onOpenWeather?.();
        break;
      case 'evacuation':
        onOpenRouteNavigator?.();
        break;
      case 'cctv':
        onOpenCctv?.();
        break;
      case 'elevation':
        onLocateUser?.();
        break;
      case 'studio':
        onOpenGeospatialStudio?.();
        break;
      case 'copilot':
        onOpenCopilot?.();
        break;
      default:
        break;
    }
  };

  const StepIcon = currentStep.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100030] flex items-center justify-center p-2 sm:p-4 overflow-hidden pointer-events-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleFinish}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md dark:bg-black/85"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative flex flex-col w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 dark:border-slate-800 dark:bg-slate-950/95 shadow-2xl backdrop-blur-2xl text-slate-900 dark:text-white z-10 max-h-[92vh] sm:max-h-[88vh]"
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 px-5 sm:px-6 py-4 bg-slate-50/90 dark:bg-slate-900/90 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-md">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                    Panduan &amp; Tata Kelola WebGIS
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                    Edisi Lengkap 2026
                  </span>
                </div>
                <h3 className="font-display text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight truncate">
                  Panduan Penggunaan &amp; Urutan Prioritas Fitur
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFinish}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer shrink-0"
              aria-label="Tutup panduan"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-2.5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/40 shrink-0">
            <div className="flex items-center p-1 bg-slate-200/80 dark:bg-slate-800/80 rounded-2xl border border-slate-300/60 dark:border-slate-700/60 gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('priorities')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'priorities'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-300 shadow-sm border border-slate-200/60 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5" />
                <span>Urutan Fitur Berdasarkan Kegunaan (#1 - #7)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('tutorial')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'tutorial'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-300 shadow-sm border border-slate-200/60 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Panduan Langkah per Langkah ({currentStepIndex + 1}/{TUTORIAL_STEPS.length})</span>
              </button>
            </div>

            <span className="hidden sm:inline-block text-[11px] text-slate-500 dark:text-slate-400">
              {activeTab === 'priorities' ? 'Diurutkan dari yang paling penting' : 'Tutorial interaktif ramah awam'}
            </span>
          </div>

          {/* TAB 1: FEATURE HIERARCHY BY UTILITY & IMPORTANCE (#1 to #7) */}
          {activeTab === 'priorities' && (
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* Rationale Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-sky-500/10 to-emerald-500/10 border border-indigo-500/20 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                      Mengapa Urutan Ini Paling Penting Menurut Logika Mitigasi Bencana?
                    </h4>
                    <p className="mt-1 text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Dalam penanganan bencana kebencanaan, <strong>penyelamatan nyawa manusia (Early Warning &amp; Evakuasi)</strong> selalu menjadi prioritas mutlak di atas segalanya (#1 dan #2). Setelah deteksi dini dan jalur evakuasi aman, barulah dibutuhkan intelijen cuaca ekstrem pemicu bencana susulan (#3), validasi visual kamera CCTV di lapangan (#4), pemodelan elevasi tanah (#5), analisis satelit citra lanjutan (#6), dan dipermudah oleh bantuan interaktif AI Copilot (#7).
                    </p>
                  </div>
                </div>
              </div>

              {/* Priority Cards List */}
              <div className="space-y-3.5 pt-1">
                {FEATURE_PRIORITIES.map((feat) => {
                  const FeatIcon = feat.icon;
                  return (
                    <div
                      key={feat.rank}
                      className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 transition-all hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200/60 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${feat.iconBg} text-white shadow-sm`}>
                            <FeatIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-black px-1.5 py-0.5 rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                                #{feat.rank}
                              </span>
                              <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${feat.badgeColor}`}>
                                {feat.categoryBadge}
                              </span>
                            </div>
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white mt-0.5">
                              {feat.title}
                            </h4>
                          </div>
                        </div>

                        {feat.actionLabel && (
                          <button
                            type="button"
                            onClick={() => executeFeatureAction(feat.actionKey)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
                          >
                            <span>{feat.actionLabel}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Importance Reason */}
                      <div className="mt-2.5 p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/20 text-[11px] text-amber-900 dark:text-amber-300 leading-relaxed">
                        <strong>Alasan Urutan:</strong> {feat.importanceReason}
                      </div>

                      {/* Practical Utilities List */}
                      <div className="mt-2.5 space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                          Kegunaan Praktis di Lapangan:
                        </span>
                        <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                          {feat.practicalUtilities.map((util, uIdx) => (
                            <li key={uIdx} className="flex items-start gap-2 leading-relaxed">
                              <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                              <span>{util}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: STEP-BY-STEP INTERACTIVE TUTORIAL */}
          {activeTab === 'tutorial' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Step Header Banner */}
              <div className="px-5 sm:px-6 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${currentStep.iconBg} text-white shadow-xs`}>
                    <StepIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${currentStep.badgeColor}`}>
                      {currentStep.badge}
                    </span>
                    <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight mt-0.5">
                      {currentStep.title}
                    </h4>
                  </div>
                </div>

                {/* Progress Indicators */}
                <div className="flex items-center gap-1">
                  {TUTORIAL_STEPS.map((_, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => setCurrentStepIndex(sIdx)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        sIdx === currentStepIndex
                          ? 'w-6 bg-indigo-600 dark:bg-indigo-400'
                          : sIdx < currentStepIndex
                          ? 'w-2 bg-indigo-300 dark:bg-indigo-800'
                          : 'w-2 bg-slate-200 dark:bg-slate-700'
                      }`}
                      title={`Langkah ${sIdx + 1}`}
                    />
                  ))}
                </div>
              </div>

              {/* Step Body */}
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {currentStep.description}
                </p>

                {/* Key Points Grid */}
                <div className="space-y-2.5 pt-1">
                  {currentStep.keyPoints.map((point, idx) => {
                    const PointIcon = point.icon;
                    return (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80"
                      >
                        <div className="h-7 w-7 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                          <PointIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {point.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                            {point.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Practical Action Tip */}
                <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span className="text-[11px] leading-snug">
                    <strong>Tips Praktis:</strong> {currentStep.actionHint}
                  </span>
                </div>

                {/* Shortcut Button on Specific Steps */}
                {currentStep.stepNumber === 3 && onOpenDisasterCenter && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-500/10 to-amber-500/10 border border-rose-500/30 flex items-center justify-between gap-3">
                    <div className="text-xs">
                      <span className="font-bold text-rose-800 dark:text-rose-300 block">
                        Ingin Langsung Cek Daerah Rawan Bencana?
                      </span>
                      <span className="text-[11px] text-slate-600 dark:text-slate-400">
                        Buka panel pusat bahaya gempa, longsor, dan gunung api sekarang.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleFinish();
                        onOpenDisasterCenter();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-colors shrink-0 cursor-pointer"
                    >
                      Buka Zona Bahaya
                    </button>
                  </div>
                )}

                {currentStep.stepNumber === 4 && onOpenRouteNavigator && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
                    <div className="text-xs">
                      <span className="font-bold text-emerald-800 dark:text-emerald-300 block">
                        Coba Navigator Rute Evakuasi Sekolah
                      </span>
                      <span className="text-[11px] text-slate-600 dark:text-slate-400">
                        Hitung estimasi waktu tempuh dan titik kumpul aman sekarang.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleFinish();
                        onOpenRouteNavigator();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors shrink-0 cursor-pointer"
                    >
                      Buka Rute Evakuasi
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="flex items-center justify-between border-t border-slate-200/80 dark:border-slate-800 px-5 sm:px-6 py-3.5 bg-slate-50/90 dark:bg-slate-900/90 shrink-0">
            <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-[11px]">Jangan tampilkan otomatis saat membuka peta</span>
            </label>

            <div className="flex items-center gap-2">
              {activeTab === 'tutorial' && !isFirst && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Sebelumnya
                </button>
              )}

              {activeTab === 'tutorial' ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/25 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{isLast ? 'Mulai Eksplorasi' : 'Lanjut'}</span>
                  {isLast ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinish}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/25 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Mulai Eksplorasi Peta</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
