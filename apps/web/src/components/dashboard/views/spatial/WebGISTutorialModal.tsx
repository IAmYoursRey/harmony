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
} from 'lucide-react';

interface WebGISTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDisasterCenter?: () => void;
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

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    stepNumber: 1,
    title: 'Selamat Datang di WebGIS Harmony',
    subtitle: 'Platform Edukasi Kebencanaan & Sekolah Tangguh Bencana Indonesia',
    badge: 'Panduan Awal Pengguna',
    badgeColor: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
    icon: School,
    iconBg: 'from-blue-600 to-indigo-600',
    description:
      'WebGIS Harmony dirancang untuk membantu guru, siswa, dan masyarakat memahami risiko bencana alam di sekitar sekolah secara visual dan ilmiah. Platform ini mengintegrasikan data 213.513 sekolah di Indonesia dengan kondisi geologi, topografi, dan cuaca ekstrem.',
    keyPoints: [
      {
        title: '213.513 Titik Sekolah Nasional',
        desc: 'Mencakup jenjang SD, SMP, SMA, dan SMK di seluruh 38 provinsi di Indonesia.',
        icon: School,
      },
      {
        title: 'Prinsip Sekolah Tangguh Bencana',
        desc: 'Membantu identifikasi ancaman bahaya dan perencanaan kesiapsiagaan sejak dini.',
        icon: ShieldCheck,
      },
      {
        title: 'Mudah Diakses untuk Orang Awam',
        desc: 'Tampilan disederhanakan agar mudah dipahami tanpa perlu latar belakang ilmu kebumian.',
        icon: Compass,
      },
    ],
    actionHint: 'Klik tombol "Lanjut" untuk melihat cara menggunakan peta dan fitur daerah rawan.',
  },
  {
    stepNumber: 2,
    title: 'Navigasi Peta & Pencarian Sekolah',
    subtitle: 'Jelajahi Lokasi Sekolah dan Lingkungan Sekitar',
    badge: 'Dasar Navigasi',
    badgeColor: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
    icon: Navigation,
    iconBg: 'from-sky-500 to-blue-600',
    description:
      'Anda dapat mencari sekolah atau kota Anda secara langsung menggunakan bilah pencarian di bagian atas, atau menjelajahi peta secara bebas dengan menggeser dan memperbesar.',
    keyPoints: [
      {
        title: 'Pencarian Cepat',
        desc: 'Ketik nama sekolah atau kabupaten/kota pada kotak "Cari sekolah..." di kiri atas.',
        icon: Compass,
      },
      {
        title: 'Zoom & Geser Peta',
        desc: 'Gunakan roda mouse atau cubit layar sentuh untuk melihat detail jalan di sekitar sekolah.',
        icon: Navigation,
      },
      {
        title: 'Klik Titik Sekolah',
        desc: 'Klik ikon sekolah mana saja untuk membuka kartu profil sekolah dan status kerawanannya.',
        icon: School,
      },
    ],
    actionHint: 'Peta mendukung basemap Peta Vektor Komunitas, Citra Satelit Optik, dan Topografi.',
  },
  {
    stepNumber: 3,
    title: 'Melihat Daerah Rawan Bencana',
    subtitle: 'Kenali Ancaman Gempa, Longsor, Gunung Api & Tsunami',
    badge: 'Fitur Utama Mitigasi',
    badgeColor: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
    icon: AlertTriangle,
    iconBg: 'from-rose-500 to-amber-600',
    description:
      'WebGIS Harmony menyediakan layer daerah rawan bencana resmi yang dapat diaktifkan dengan satu klik. Mengetahui apakah sekolah Anda berada di zona rawan adalah langkah pertama mitigasi mandiri.',
    keyPoints: [
      {
        title: 'Zona Rawan Longsor (Gerakan Tanah)',
        desc: 'Menampilkan zona kerentanan gerakan tanah PVMBG (Sangat Tinggi, Tinggi, Menengah, Rendah).',
        icon: AlertTriangle,
      },
      {
        title: 'Sesar Aktif & Zona Gempa',
        desc: 'Garis patahan tektonik aktif nasional (PuSGeN) dan kejadian gempa terkini BMKG InaTEWS.',
        icon: Layers,
      },
      {
        title: 'Kawasan Rawan Bencana (KRB) Gunung Api',
        desc: 'Zonasi bahaya letusan dan arah aliran awan panas/lahar (KRB III, II, I PVMBG).',
        icon: AlertTriangle,
      },
      {
        title: 'Zona Bahaya Tsunami Pesisir',
        desc: 'Garis pantai rawan genangan tsunami untuk sekolah pesisir di selatan Jawa & barat Sumatera.',
        icon: ShieldCheck,
      },
    ],
    actionHint: 'Gunakan tombol "⚠️ Zona Rawan Bencana" di bilah atas untuk mengaktifkan layer ini secara sederhana.',
  },
  {
    stepNumber: 4,
    title: 'Fusi Cuaca Ekstrem Pemicu Bencana',
    subtitle: 'Pantau Curah Hujan Tinggi Pemicu Banjir & Longsor',
    badge: 'Pemicu Bencana Sekunder',
    badgeColor: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
    icon: CloudRain,
    iconBg: 'from-blue-500 to-cyan-600',
    description:
      'Bencana longsor dan banjir bandang sering dipicu oleh hujan lebat berdurasi lama. WebGIS ini menggabungkan data radar cuaca BMKG dan satelit untuk memperkirakan kapan hujan melewati ambang batas bahaya geologis.',
    keyPoints: [
      {
        title: 'Ambang Batas Hujan Pemicu Longsor',
        desc: 'Memberikan peringatan saat akumulasi hujan melebihi ambang batas kejenuhan lereng (>50 mm).',
        icon: CloudRain,
      },
      {
        title: 'Radar Cuaca Doppler Real-Time',
        desc: 'Melihat pergerakan awan konvektif hujan lebat di atas wilayah sekolah Anda.',
        icon: Layers,
      },
      {
        title: 'Waspada Banjir Bandang & Lahar Hujan',
        desc: 'Peringatan otomatis untuk sekolah di sekitar lembah hulu dan alur sungai vulkanik.',
        icon: AlertTriangle,
      },
    ],
    actionHint: 'Buka menu "Studio Geospasial -> Fusi Data" untuk melihat grafik ambang batas fisis hujan.',
  },
  {
    stepNumber: 5,
    title: 'Rute Evakuasi Darurat Sekolah',
    subtitle: 'Rencana Jalur Penyelamatan Cepat Menuju Titik Aman',
    badge: 'Kesiapsiagaan Darurat',
    badgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    icon: ShieldCheck,
    iconBg: 'from-emerald-500 to-teal-600',
    description:
      'Saat terjadi bencana geologi masif (seperti gempa bumi kuat atau peringatan dini tsunami), siswa dan guru membutuhkan jalur evakuasi yang jelas menuju Tempat Evakuasi Sementara (TES) atau dataran tinggi.',
    keyPoints: [
      {
        title: 'Penentuan Titik Kumpul Aman (TES/TEA)',
        desc: 'Mengarahkan siswa ke lapangan terbuka aman gempa atau bukit tinggi aman tsunami.',
        icon: ShieldCheck,
      },
      {
        title: 'Estimasi Waktu Evakuasi (Jalan Kaki)',
        desc: 'Menghitung waktu tempuh jalan kaki cepat rombongan sekolah untuk memastikan tiba sebelum tsunami datang.',
        icon: Navigation,
      },
      {
        title: 'Integrasi Koridor Jalan Nasional',
        desc: 'Menghubungkan jalur lokal dengan jalan arteri untuk akses bantuan tim tanggap darurat BPBD.',
        icon: Layers,
      },
    ],
    actionHint: 'Klik tombol "Rute Evakuasi Darurat" pada kartu sekolah untuk melihat simulasi rute jalan.',
  },
];

export const WebGISTutorialModal: React.FC<WebGISTutorialModalProps> = ({
  isOpen,
  onClose,
  onOpenDisasterCenter,
}) => {
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

  const StepIcon = currentStep.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleFinish}
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-md dark:bg-black/85"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative flex flex-col w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 dark:border-slate-800 dark:bg-slate-950/95 shadow-2xl backdrop-blur-2xl text-slate-900 dark:text-white z-10 my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 px-5 sm:px-6 py-4 bg-slate-50/80 dark:bg-slate-900/80">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${currentStep.iconBg} text-white shadow-md`}>
                <StepIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Panduan Penggunaan ({currentStepIndex + 1} dari {TUTORIAL_STEPS.length})
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${currentStep.badgeColor}`}>
                    {currentStep.badge}
                  </span>
                </div>
                <h3 className="font-display text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                  {currentStep.title}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFinish}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              aria-label="Tutup panduan"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="h-1 w-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / TUTORIAL_STEPS.length) * 100}%` }}
            />
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-6 space-y-4 max-h-[68vh] overflow-y-auto">
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

            {isLast && onOpenDisasterCenter && (
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
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between border-t border-slate-200/80 dark:border-slate-800 px-5 sm:px-6 py-3.5 bg-slate-50/90 dark:bg-slate-900/90">
            <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Jangan tampilkan lagi secara otomatis</span>
            </label>

            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Sebelumnya
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/25 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>{isLast ? 'Mulai Eksplorasi' : 'Lanjut'}</span>
                {isLast ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
