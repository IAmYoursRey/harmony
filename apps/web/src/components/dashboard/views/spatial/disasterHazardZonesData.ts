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

