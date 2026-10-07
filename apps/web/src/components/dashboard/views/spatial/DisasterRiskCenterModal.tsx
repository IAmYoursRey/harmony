import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  AlertTriangle,
  Flame,
  Waves,
  Mountain,
  Layers,
  School,
  ShieldCheck,
  Compass,
  Navigation,
  CheckCircle2,
  Info,
  ExternalLink,
  ChevronRight,
  Eye,
  EyeOff,
} from 'lucide-react';

export interface LandslideSusceptibilityZone {
  id: string;
  name: string;
  province: string;
  lat: number;
  lng: number;
  radiusKm: number;
  riskLevel: 'SANGAT_TINGGI' | 'TINGGI' | 'MENENGAH';
  slope: string;
  triggerFactor: string;
  pvmbgCriteria: string;
  affectedSchoolsSample: string[];
}

export interface TsunamiHazardZone {
  id: string;
  name: string;
  province: string;
  lat: number;
  lng: number;
  bufferKm: number;
  megathrustSegment: string;
  estimatedArrivalTimeMin: number;
  maxRunupM: number;
  evacuationOrder: string;
  affectedSchoolsSample: string[];
}

export const LANDSLIDE_SUSCEPTIBILITY_ZONES: LandslideSusceptibilityZone[] = [
  {
    id: 'ls_cianjur_puncak',
    name: 'Zona Kerentanan Puncak - Cianjur - Sukabumi',
    province: 'Jawa Barat',
    lat: -6.745,
    lng: 106.985,
    radiusKm: 18,
    riskLevel: 'SANGAT_TINGGI',
    slope: '> 35° (Lereng Terjal Batuan Vulkanik Kuarter)',
    triggerFactor: 'Hujan lebat akumulasi > 80 mm/24 jam melampaui ambang batas Caine & perlapisan tanah lapuk tebal',
    pvmbgCriteria: 'Zona kerentanan gerakan tanah sangat tinggi: sering terjadi longsoran lama dan baru aktif kembali saat musim hujan.',
    affectedSchoolsSample: ['SMK Negeri 1 Cianjur', 'SMP Negeri 2 Pacet', 'SD Negeri Cugenang 1'],
  },
  {
    id: 'ls_banjarnegara_karangkobar',
    name: 'Zona Kerentanan Karangkobar - Banjarnegara',
    province: 'Jawa Tengah',
    lat: -7.285,
    lng: 109.715,
    radiusKm: 15,
    riskLevel: 'SANGAT_TINGGI',
    slope: '30° - 45° (Formasi Breksi Vulkanik & Lempung Napal)',
    triggerFactor: 'Saturasi air pori tinggi dan bidang gelincir lempung kedap air',
    pvmbgCriteria: 'Zona kerentanan tinggi dengan riwayat rayapan dan longsor rotasional masif.',
    affectedSchoolsSample: ['SMP Negeri 1 Karangkobar', 'SD Negeri Tieng 1', 'SMK Negeri 1 Batur'],
  },
  {
    id: 'ls_majalengka_ciremai',
    name: 'Zona Lereng Barat Gunung Ciremai - Majalengka',
    province: 'Jawa Barat',
    lat: -6.895,
    lng: 108.345,
    radiusKm: 14,
    riskLevel: 'TINGGI',
    slope: '25° - 35° (Endapan Rombakan Vulkanik Muda)',
    triggerFactor: 'Alih fungsi lahan tebing dan curah hujan orografis tinggi',
    pvmbgCriteria: 'Zona kerentanan menengah-tinggi berpotensi timbul aliran bahan rombakan (debris flow).',
    affectedSchoolsSample: ['SMP Negeri 2 Argapura', 'SD Negeri Sukasari Kaler'],
  },
  {
    id: 'ls_tanah_datar_singgalang',
    name: 'Zona Batipuh - Tanah Datar - Lereng Marapi/Singgalang',
    province: 'Sumatera Barat',
    lat: -0.485,
    lng: 100.465,
    radiusKm: 20,
    riskLevel: 'SANGAT_TINGGI',
    slope: '30° - 50° (Hulu Sungai Lembah Anai & Lereng Abu)',
    triggerFactor: 'Kombinasi endapan abu vulkanik lepas terpicu hujan ekstrem hulu menghasilkan galodo / lahar dingin',
    pvmbgCriteria: 'Zona rawan longsor dan banjir bandang aliran lahar hujan primer.',
    affectedSchoolsSample: ['SMP Negeri 1 Batipuh', 'SMA Negeri 1 X Koto', 'SD Negeri 03 Lembah Anai'],
  },
];

export const TSUNAMI_HAZARD_ZONES: TsunamiHazardZone[] = [
  {
    id: 'tsu_pangandaran_cilacap',
    name: 'Zona Pesisir Pangandaran - Cilacap (Megathrust Jawa Selatan)',
    province: 'Jawa Barat / Jawa Tengah',
    lat: -7.702,
    lng: 108.665,
    bufferKm: 12,
    megathrustSegment: 'Megathrust Jawa Barat - Tengah (M8.7)',
    estimatedArrivalTimeMin: 20,
    maxRunupM: 14.5,
    evacuationOrder: 'Sirine InaTEWS bunyi -> Segera lari menjauhi pantai menuju TES vertical shelter atau bukit elevasi > 20 mdpl',
    affectedSchoolsSample: ['SMK Negeri 1 Pangandaran', 'SMP Negeri 1 Pangandaran', 'SD Negeri Pananjung 2'],
  },
  {
    id: 'tsu_kulonprogo_bantul',
    name: 'Zona Pesisir Glagah - Kulon Progo - Parangtritis',
    province: 'D.I. Yogyakarta',
    lat: -7.915,
    lng: 110.155,
    bufferKm: 15,
    megathrustSegment: 'Megathrust Jawa Tengah - Timur (M8.8)',
    estimatedArrivalTimeMin: 22,
    maxRunupM: 12.0,
    evacuationOrder: 'Gunakan Jalur Jalan Lintas Selatan (JJLS) dan titik kumpul TES bandara YIA & gedung bertingkat tahan gempa',
    affectedSchoolsSample: ['SD Negeri Glagah', 'SMP Negeri 2 Temon', 'SMA Negeri 1 Temon'],
  },
  {
    id: 'tsu_pacitan_trenggalek',
    name: 'Zona Teluk Pacitan & Pesisir Selatan Jawa Timur',
    province: 'Jawa Timur',
    lat: -8.235,
    lng: 111.085,
    bufferKm: 10,
    megathrustSegment: 'Megathrust Jawa Timur (M8.7)',
    estimatedArrivalTimeMin: 18,
    maxRunupM: 15.2,
    evacuationOrder: 'Morfologi teluk dapat mengamplifikasi runup tsunami; evakuasi wajib dalam 15 menit ke perbukitan karst sekitar',
    affectedSchoolsSample: ['SMP Negeri 1 Pacitan', 'SD Negeri Baleharjo 1', 'SMK Negeri 1 Pacitan'],
  },
  {
    id: 'tsu_padang_pesisir_barat',
    name: 'Zona Pesisir Kota Padang - Pantai Barat Sumatera',
    province: 'Sumatera Barat',
    lat: -0.945,
    lng: 100.355,
    bufferKm: 16,
    megathrustSegment: 'Megathrust Mentawai - Siberut (M8.9)',
    estimatedArrivalTimeMin: 25,
    maxRunupM: 10.5,
    evacuationOrder: 'Evakuasi horizontal menuju By Pass Padang atau vertikal ke 45 shelter tsunami yang telah diaudit BNPB',
    affectedSchoolsSample: ['SD Negeri 01 Sawahan Padang', 'SMP Negeri 2 Padang', 'SMA Negeri 1 Padang'],
  },
];

interface DisasterRiskCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Layer toggle handlers
  showTectonic: boolean;
  onToggleTectonic: (v: boolean) => void;
  showEarthquakes: boolean;
  onToggleEarthquakes: (v: boolean) => void;
  showVolcanoes: boolean;
  onToggleVolcanoes: (v: boolean) => void;
  showLandslideZones: boolean;
  onToggleLandslideZones: (v: boolean) => void;
  showTsunamiZones: boolean;
  onToggleTsunamiZones: (v: boolean) => void;
  // Selected school context
  selectedSchool?: {
    id: string;
    name: string;
    lat: number;
    lng: number;
    regency?: string;
    province?: string;
    elevationM?: number;
  } | null;
  onTriggerEvacuationRoute?: (school: any, scenario: 'GEMPA_MASIF' | 'TSUNAMI_MEGATHRUST' | 'ERUPSI_GUNUNG_API' | 'LONGSOR_TERJAL') => void;
}

export const DisasterRiskCenterModal: React.FC<DisasterRiskCenterModalProps> = ({
  isOpen,
  onClose,
  showTectonic,
  onToggleTectonic,
  showEarthquakes,
  onToggleEarthquakes,
  showVolcanoes,
  onToggleVolcanoes,
  showLandslideZones,
  onToggleLandslideZones,
  showTsunamiZones,
  onToggleTsunamiZones,
  selectedSchool,
  onTriggerEvacuationRoute,
}) => {
  const [activeTab, setActiveTab] = useState<'layers' | 'school_check' | 'educational_guide'>('layers');

  if (!isOpen) return null;

  // Evaluasi kerentanan bahaya sekolah terpilih secara otomatis
  const schoolElevation = selectedSchool?.elevationM ?? 25;
  const isHighSlope = schoolElevation > 350;
  const isCoastal = schoolElevation < 20;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-md dark:bg-black/85"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative flex flex-col w-full max-w-3xl overflow-hidden rounded-3xl border border-rose-200/60 bg-white/95 dark:border-rose-900/40 dark:bg-slate-950/95 shadow-2xl backdrop-blur-2xl text-slate-900 dark:text-white z-10 my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 sm:px-6 py-4 bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-transparent">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-600 to-amber-600 text-white shadow-lg shadow-rose-500/25">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
                    Pusat Daerah Rawan &amp; Risiko Bencana Geologi
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                    Akses Cepat Mitigasi
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Visualisasi daerah rawan gempa, longsor, gunung api, dan tsunami untuk Sekolah Tangguh Bencana
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              aria-label="Tutup panel bencana"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 sm:px-6 bg-slate-50/50 dark:bg-slate-900/50 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('layers')}
              className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'layers'
                  ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Layer Peta Rawan Bencana</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('school_check')}
              className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'school_check'
                  ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <School className="w-4 h-4" />
              <span>Profil Kerawanan Sekolah</span>
              {selectedSchool && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('educational_guide')}
              className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'educational_guide'
                  ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Info className="w-4 h-4" />
              <span>Panduan Istilah Ilmiah</span>
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-6 space-y-4 max-h-[65vh] overflow-y-auto">
            {/* TAB 1: LAYER DAERAH RAWAN BENCANA (1-CLICK TOGGLE) */}
            {activeTab === 'layers' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>
                      Aktifkan atau nonaktifkan layer daerah rawan bencana di bawah ini dengan satu sentuhan:
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onToggleTectonic(true);
                      onToggleEarthquakes(true);
                      onToggleVolcanoes(true);
                      onToggleLandslideZones(true);
                      onToggleTsunamiZones(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shrink-0 cursor-pointer shadow-xs transition-colors"
                  >
                    Nyalakan Semua
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 1. Zona Kerentanan Gerakan Tanah / Longsor */}
                  <div className={`p-4 rounded-2xl border transition-all ${
                    showLandslideZones
                      ? 'bg-amber-500/10 border-amber-500/40 dark:bg-amber-950/20'
                      : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                          <Mountain className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            Zona Kerentanan Gerakan Tanah
                          </h4>
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                            Standar PVMBG (Sangat Tinggi / Menengah)
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleLandslideZones(!showLandslideZones)}
                        className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                          showLandslideZones
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700'
                        }`}
                        title={showLandslideZones ? 'Sembunyikan' : 'Tampilkan'}
                      >
                        {showLandslideZones ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                      Menampilkan perbukitan dan lereng curam rawan longsor saat curah hujan tinggi jenuh.
                    </p>
                  </div>

                  {/* 2. Sesar Aktif & Batas Lempeng Tektonik */}
                  <div className={`p-4 rounded-2xl border transition-all ${
                    showTectonic
                      ? 'bg-violet-500/10 border-violet-500/40 dark:bg-violet-950/20'
                      : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0">
                          <Compass className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            Sesar Aktif &amp; Batas Tektonik
                          </h4>
                          <span className="text-[10px] text-violet-600 dark:text-violet-400 font-semibold">
                            Peta Sesar Nasional PuSGeN 2017
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleTectonic(!showTectonic)}
                        className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                          showTectonic
                            ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700'
                        }`}
                        title={showTectonic ? 'Sembunyikan' : 'Tampilkan'}
                      >
                        {showTectonic ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                      Jalur patahan aktif (Sesar Semangko, Palu-Koro, Cimandiri, Opak) dan subduksi megathrust selatan Jawa.
                    </p>
                  </div>

                  {/* 3. Kawasan Rawan Bencana (KRB) Gunung Api */}
                  <div className={`p-4 rounded-2xl border transition-all ${
                    showVolcanoes
                      ? 'bg-orange-500/10 border-orange-500/40 dark:bg-orange-950/20'
                      : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0">
                          <Flame className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            KRB Gunung Api Aktif (127 Gunung)
                          </h4>
                          <span className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold">
                            Zonasi Bahaya KRB III, II, I PVMBG
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleVolcanoes(!showVolcanoes)}
                        className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                          showVolcanoes
                            ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700'
                        }`}
                        title={showVolcanoes ? 'Sembunyikan' : 'Tampilkan'}
                      >
                        {showVolcanoes ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                      Titik gunung api aktif Indonesia, pos pengamatan PVMBG, dan radius perimeter bahaya letusan &amp; lahar.
                    </p>
                  </div>

                  {/* 4. Zona Bahaya Tsunami Pesisir */}
                  <div className={`p-4 rounded-2xl border transition-all ${
                    showTsunamiZones
                      ? 'bg-cyan-500/10 border-cyan-500/40 dark:bg-cyan-950/20'
                      : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-cyan-600 text-white flex items-center justify-center shrink-0">
                          <Waves className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            Zona Rawan Tsunami Pesisir
                          </h4>
                          <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold">
                            Pantai Terbuka &amp; Garis Inundasi
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleTsunamiZones(!showTsunamiZones)}
                        className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                          showTsunamiZones
                            ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700'
                        }`}
                        title={showTsunamiZones ? 'Sembunyikan' : 'Tampilkan'}
                      >
                        {showTsunamiZones ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                      Buffer pesisir elevasi rendah (&lt;20 mdpl) di sepanjang pantai barat Sumatera, selatan Jawa, Bali, dan NTB.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PROFIL KERAWANAN BENCANA SEKOLAH */}
            {activeTab === 'school_check' && (
              <div className="space-y-4">
                {selectedSchool ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/40">
                      <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-xs mb-1">
                        <School className="w-4 h-4" />
                        <span>Sekolah Sedang Ditinjau:</span>
                      </div>
                      <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                        {selectedSchool.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {selectedSchool.regency || ''}, {selectedSchool.province || ''} • Elevasi: {schoolElevation} mdpl
                      </p>
                    </div>

                    {/* Matriks Kerentanan Sekolah */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Gempa */}
                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700 dark:text-slate-300">Potensi Bahaya Gempa Bumi</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600">Waspada Sesar</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Berada di dalam kawasan tektonik aktif Indonesia. Bangunan sekolah wajib memenuhi standar struktur tahan gempa SNI 1726.
                        </p>
                      </div>

                      {/* Longsor */}
                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700 dark:text-slate-300">Potensi Gerakan Tanah (Longsor)</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isHighSlope
                              ? 'bg-amber-500/15 text-amber-600'
                              : 'bg-emerald-500/15 text-emerald-600'
                          }`}>
                            {isHighSlope ? 'Kerentanan Menengah' : 'Kerentanan Rendah'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          {isHighSlope
                            ? 'Topografi lereng perbukitan (>350 mdpl); waspadai retakan tanah dan kejenuhan air pori saat hujan lebat berdurasi >2 jam.'
                            : 'Topografi relatif datar; risiko gerakan tanah tebing rendah.'}
                        </p>
                      </div>

                      {/* Tsunami */}
                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700 dark:text-slate-300">Potensi Ancaman Tsunami</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isCoastal
                              ? 'bg-cyan-500/15 text-cyan-600'
                              : 'bg-emerald-500/15 text-emerald-600'
                          }`}>
                            {isCoastal ? 'Zona Waspada Pesisir' : 'Aman dari Tsunami'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          {isCoastal
                            ? 'Elevasi <20 mdpl di dekat pantai; kenali jalur evakuasi menuju gedung TES bertingkat atau bukit terdekat.'
                            : 'Elevasi aman jauh di atas jangkauan gelombang tsunami.'}
                        </p>
                      </div>

                      {/* Gunung Api */}
                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700 dark:text-slate-300">Kawasan Bahaya Gunung Api</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            Cek Perimeter
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Ikuti pembaruan status tingkat aktivitas PVMBG MAGMA Indonesia (Level I hingga IV) untuk rekomendasi radius aman.
                        </p>
                      </div>
                    </div>

                    {/* Tombol Rute Evakuasi */}
                    {onTriggerEvacuationRoute && (
                      <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                        <div>
                          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Navigation className="w-4 h-4 text-emerald-400" />
                            <span>Simulasi Rute Evakuasi Sekolah Tangguh Bencana</span>
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Hitung jalur penyelamatan jalan kaki dan armada darurat menuju titik kumpul aman (TES).
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onTriggerEvacuationRoute(
                              selectedSchool,
                              isCoastal ? 'TSUNAMI_MEGATHRUST' : 'GEMPA_MASIF'
                            );
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors shrink-0 cursor-pointer"
                        >
                          Hitung Rute Aman
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 space-y-3">
                    <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                      <School className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                        Belum Ada Sekolah yang Dipilih
                      </h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Klik salah satu ikon sekolah pada peta atau cari nama sekolah pada bilah pencarian di bagian atas untuk melihat profil kerawanan bencananya.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: PANDUAN ISTILAH ILMIAH */}
            {activeTab === 'educational_guide' && (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <h4 className="font-bold text-rose-600 dark:text-rose-400">
                    Kawasan Rawan Bencana (KRB) Gunung Api (PVMBG)
                  </h4>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                    <li><strong>KRB III (Zona Bahaya Utama):</strong> Kawasan yang sering terlanda awan panas, aliran lava, dan lontaran batu pijar. Tidak diperkenankan untuk permukiman atau bangunan sekolah.</li>
                    <li><strong>KRB II (Zona Bahaya Menengah):</strong> Kawasan berpotensi terlanda awan panas, lontaran batu, dan hujan abu lebat saat erupsi berskala besar.</li>
                    <li><strong>KRB I (Zona Bahaya Lahar):</strong> Kawasan di sepanjang lembah sungai yang berpotensi terlanda banjir lahar dingin sekunder saat musim hujan.</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <h4 className="font-bold text-amber-600 dark:text-amber-400">
                    Zona Kerentanan Gerakan Tanah / Longsor (PVMBG)
                  </h4>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                    Klasifikasi ilmiah yang membagi wilayah lereng berdasarkan kemiringan sudut lereng, ketebalan tanah lapuk, jenis batuan dasar, dan intensitas curah hujan akumulatif pemicu kegagalan lereng.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <h4 className="font-bold text-violet-600 dark:text-violet-400">
                    Sesar Aktif (Active Fault) &amp; Megathrust
                  </h4>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                    Patahan pada kerak bumi yang pernah bergerak dalam kurun 10.000 tahun terakhir (Holosen) dan berpotensi menghasilkan gempa dangkal merusak. Pusat Studi Gempa Nasional (PuSGeN) memetakan lebih dari 295 sesar aktif di kepulauan Indonesia.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-5 sm:px-6 py-3 bg-slate-50 dark:bg-slate-900/80 text-xs">
            <span className="text-[11px] text-slate-500">
              Data: PVMBG Kementerian ESDM, BMKG InaTEWS, &amp; PuSGeN
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
