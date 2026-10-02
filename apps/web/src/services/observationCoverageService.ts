// Layanan Cakupan Sensor Observasi Cuaca & Blank Spot Data BMKG
// Memetakan 45 jaringan Radar Cuaca Doppler BMKG & Titik Kesenjangan Observasi (Blank Spot)

export interface DopplerRadarStation {
  id: string;
  name: string;
  code: string;
  city: string;
  province: string;
  island: 'Sumatera' | 'Jawa' | 'Bali' | 'Nusa Tenggara' | 'Kalimantan' | 'Sulawesi' | 'Maluku' | 'Papua';
  lat: number;
  lng: number;
  type: 'C-Band Doppler' | 'X-Band Polarimetric' | 'S-Band Dual-Pol';
  rangeKm: number;
  status: 'Aktif 24/7' | 'Kalibrasi Berkala' | 'Optimal';
  elevationM: number;
  operator: string;
}

export interface BlankSpotZone {
  id: string;
  name: string;
  region: string;
  island: string;
  center: [number, number]; // [lng, lat]
  coordinates?: [number, number][]; // Polygon boundary if applicable
  radiusKm: number;
  severity: 'Kritis' | 'Tinggi' | 'Sedang';
  nearestRadarKm: number;
  nearestRadarName: string;
  impactNote: string;
  recommendation: string;
}

export const BMKG_DOPPLER_RADAR_NETWORK: DopplerRadarStation[] = [
  // Sumatera (12 Radar)
  { id: 'radar_btj', name: 'Radar Sultan Iskandar Muda', code: 'BTJ', city: 'Banda Aceh', province: 'Aceh', island: 'Sumatera', lat: 5.524, lng: 95.418, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 20, operator: 'Stasiun Meteorologi SIM Aceh' },
  { id: 'radar_kno', name: 'Radar Kualanamu Deli Serdang', code: 'KNO', city: 'Medan', province: 'Sumatera Utara', island: 'Sumatera', lat: 3.642, lng: 98.885, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 22, operator: 'Stasiun Meteorologi Kualanamu' },
  { id: 'radar_gns', name: 'Radar Binaka Nias', code: 'GNS', city: 'Gunungsitoli', province: 'Sumatera Utara', island: 'Sumatera', lat: 1.167, lng: 97.705, type: 'X-Band Polarimetric', rangeKm: 120, status: 'Aktif 24/7', elevationM: 15, operator: 'Stasiun Meteorologi Binaka' },
  { id: 'radar_pku', name: 'Radar Sultan Syarif Kasim II', code: 'PKU', city: 'Pekanbaru', province: 'Riau', island: 'Sumatera', lat: 0.461, lng: 101.444, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 31, operator: 'Stasiun Meteorologi SSK II' },
  { id: 'radar_bth', name: 'Radar Hang Nadim Batam', code: 'BTH', city: 'Batam', province: 'Kepulauan Riau', island: 'Sumatera', lat: 1.121, lng: 104.119, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 38, operator: 'Stasiun Meteorologi Hang Nadim' },
  { id: 'radar_ntx', name: 'Radar Raden Sadjad Natuna', code: 'NTX', city: 'Ranai', province: 'Kepulauan Riau', island: 'Sumatera', lat: 3.907, lng: 108.388, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 10, operator: 'Stasiun Meteorologi Ranai' },
  { id: 'radar_pdg', name: 'Radar Minangkabau Padang', code: 'PDG', city: 'Padang Pariaman', province: 'Sumatera Barat', island: 'Sumatera', lat: -0.788, lng: 100.280, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 12, operator: 'Stasiun Meteorologi Minangkabau' },
  { id: 'radar_djb', name: 'Radar Sultan Thaha Jambi', code: 'DJB', city: 'Jambi', province: 'Jambi', island: 'Sumatera', lat: -1.638, lng: 103.644, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 25, operator: 'Stasiun Meteorologi Sultan Thaha' },
  { id: 'radar_bks', name: 'Radar Fatmawati Soekarno', code: 'BKS', city: 'Bengkulu', province: 'Bengkulu', island: 'Sumatera', lat: -3.864, lng: 102.341, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 16, operator: 'Stasiun Meteorologi Fatmawati' },
  { id: 'radar_plm', name: 'Radar Sultan Mahmud Badaruddin II', code: 'PLM', city: 'Palembang', province: 'Sumatera Selatan', island: 'Sumatera', lat: -2.898, lng: 104.701, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 15, operator: 'Stasiun Meteorologi SMB II' },
  { id: 'radar_pgk', name: 'Radar Depati Amir Pangkalpinang', code: 'PGK', city: 'Pangkalpinang', province: 'Bangka Belitung', island: 'Sumatera', lat: -2.163, lng: 106.139, type: 'X-Band Polarimetric', rangeKm: 120, status: 'Aktif 24/7', elevationM: 33, operator: 'Stasiun Meteorologi Depati Amir' },
  { id: 'radar_tkg', name: 'Radar Radin Inten II Lampung', code: 'TKG', city: 'Bandar Lampung', province: 'Lampung', island: 'Sumatera', lat: -5.242, lng: 105.179, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 86, operator: 'Stasiun Meteorologi Radin Inten II' },

  // Jawa & Banten (11 Radar)
  { id: 'radar_cgk', name: 'Radar Utama Soekarno-Hatta', code: 'CGK', city: 'Tangerang', province: 'Banten', island: 'Jawa', lat: -6.125, lng: 106.655, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 10, operator: 'Pusat Meteorologi Penerbangan BMKG' },
  { id: 'radar_hlp', name: 'Radar Halim Perdanakusuma', code: 'HLP', city: 'Jakarta Timur', province: 'DKI Jakarta', island: 'Jawa', lat: -6.267, lng: 106.891, type: 'X-Band Polarimetric', rangeKm: 100, status: 'Aktif 24/7', elevationM: 25, operator: 'Stasiun Klimatologi DKI Jakarta' },
  { id: 'radar_bdo', name: 'Radar Geofisika Bandung', code: 'BDO', city: 'Bandung', province: 'Jawa Barat', island: 'Jawa', lat: -6.884, lng: 107.598, type: 'X-Band Polarimetric', rangeKm: 120, status: 'Aktif 24/7', elevationM: 791, operator: 'Stasiun Geofisika Bandung' },
  { id: 'radar_cbn', name: 'Radar Cirebon / Jatiwangi', code: 'CBN', city: 'Majalengka', province: 'Jawa Barat', island: 'Jawa', lat: -6.745, lng: 108.261, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 45, operator: 'Stasiun Meteorologi Kertajati' },
  { id: 'radar_cxp', name: 'Radar Tunggul Wulung Cilacap', code: 'CXP', city: 'Cilacap', province: 'Jawa Tengah', island: 'Jawa', lat: -7.644, lng: 109.012, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 8, operator: 'Stasiun Meteorologi Tunggul Wulung' },
  { id: 'radar_srg', name: 'Radar Ahmad Yani Semarang', code: 'SRG', city: 'Semarang', province: 'Jawa Tengah', island: 'Jawa', lat: -6.973, lng: 110.375, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 5, operator: 'Stasiun Meteorologi Ahmad Yani' },
  { id: 'radar_yia', name: 'Radar Yogyakarta International Airport', code: 'YIA', city: 'Kulon Progo', province: 'D.I. Yogyakarta', island: 'Jawa', lat: -7.906, lng: 110.054, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 12, operator: 'Stasiun Meteorologi YIA' },
  { id: 'radar_soc', name: 'Radar Adi Soemarmo Solo', code: 'SOC', city: 'Boyolali', province: 'Jawa Tengah', island: 'Jawa', lat: -7.516, lng: 110.757, type: 'X-Band Polarimetric', rangeKm: 120, status: 'Aktif 24/7', elevationM: 128, operator: 'Stasiun Meteorologi Adi Soemarmo' },
  { id: 'radar_sub', name: 'Radar Juanda Surabaya', code: 'SUB', city: 'Sidoarjo', province: 'Jawa Timur', island: 'Jawa', lat: -7.379, lng: 112.787, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 3, operator: 'Stasiun Meteorologi Juanda' },
  { id: 'radar_mlg', name: 'Radar Karangploso Malang', code: 'MLG', city: 'Malang', province: 'Jawa Timur', island: 'Jawa', lat: -7.902, lng: 112.597, type: 'X-Band Polarimetric', rangeKm: 120, status: 'Aktif 24/7', elevationM: 580, operator: 'Stasiun Klimatologi Jawa Timur' },
  { id: 'radar_bwx', name: 'Radar Banyuwangi Blimbingsari', code: 'BWX', city: 'Banyuwangi', province: 'Jawa Timur', island: 'Jawa', lat: -8.311, lng: 114.339, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 14, operator: 'Stasiun Meteorologi Banyuwangi' },

  // Bali & Nusa Tenggara (5 Radar)
  { id: 'radar_dps', name: 'Radar Ngurah Rai Bali', code: 'DPS', city: 'Denpasar', province: 'Bali', island: 'Bali', lat: -8.748, lng: 115.167, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 5, operator: 'Balai Besar MKG Wilayah III Denpasar' },
  { id: 'radar_lop', name: 'Radar Zainuddin Abdul Madjid Lombok', code: 'LOP', city: 'Praya', province: 'Nusa Tenggara Barat', island: 'Nusa Tenggara', lat: -8.758, lng: 116.276, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 98, operator: 'Stasiun Meteorologi ZAM Lombok' },
  { id: 'radar_bmu', name: 'Radar Sultan Muhammad Salahuddin Bima', code: 'BMU', city: 'Bima', province: 'Nusa Tenggara Barat', island: 'Nusa Tenggara', lat: -8.541, lng: 118.691, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 6, operator: 'Stasiun Meteorologi Bima' },
  { id: 'radar_lbj', name: 'Radar Komodo Labuan Bajo', code: 'LBJ', city: 'Manggarai Barat', province: 'Nusa Tenggara Timur', island: 'Nusa Tenggara', lat: -8.490, lng: 119.888, type: 'X-Band Polarimetric', rangeKm: 120, status: 'Aktif 24/7', elevationM: 20, operator: 'Stasiun Meteorologi Komodo' },
  { id: 'radar_koe', name: 'Radar El Tari Kupang', code: 'KOE', city: 'Kupang', province: 'Nusa Tenggara Timur', island: 'Nusa Tenggara', lat: -10.171, lng: 123.670, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 102, operator: 'Stasiun Meteorologi El Tari' },

  // Kalimantan (6 Radar)
  { id: 'radar_pnk', name: 'Radar Supadio Pontianak', code: 'PNK', city: 'Kubu Raya', province: 'Kalimantan Barat', island: 'Kalimantan', lat: -0.150, lng: 109.403, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 3, operator: 'Stasiun Meteorologi Supadio' },
  { id: 'radar_pky', name: 'Radar Tjilik Riwut Palangka Raya', code: 'PKY', city: 'Palangka Raya', province: 'Kalimantan Tengah', island: 'Kalimantan', lat: -2.226, lng: 113.943, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 25, operator: 'Stasiun Meteorologi Tjilik Riwut' },
  { id: 'radar_bdj', name: 'Radar Syamsudin Noor Banjarmasin', code: 'BDJ', city: 'Banjarbaru', province: 'Kalimantan Selatan', island: 'Kalimantan', lat: -3.442, lng: 114.757, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 20, operator: 'Stasiun Meteorologi Syamsudin Noor' },
  { id: 'radar_bpn', name: 'Radar SAMS Sepinggan Balikpapan', code: 'BPN', city: 'Balikpapan', province: 'Kalimantan Timur', island: 'Kalimantan', lat: -1.268, lng: 116.895, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 4, operator: 'Stasiun Meteorologi SAMS Sepinggan' },
  { id: 'radar_aap', name: 'Radar APT Pranoto Samarinda', code: 'AAP', city: 'Samarinda', province: 'Kalimantan Timur', island: 'Kalimantan', lat: -0.375, lng: 117.251, type: 'X-Band Polarimetric', rangeKm: 120, status: 'Aktif 24/7', elevationM: 30, operator: 'Stasiun Meteorologi APT Pranoto' },
  { id: 'radar_trk', name: 'Radar Juwata Tarakan', code: 'TRK', city: 'Tarakan', province: 'Kalimantan Utara', island: 'Kalimantan', lat: 3.327, lng: 117.568, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 6, operator: 'Stasiun Meteorologi Juwata Tarakan' },

  // Sulawesi (5 Radar)
  { id: 'radar_upg', name: 'Radar Sultan Hasanuddin Makassar', code: 'UPG', city: 'Maros', province: 'Sulawesi Selatan', island: 'Sulawesi', lat: -5.061, lng: 119.554, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 14, operator: 'Balai Besar MKG Wilayah IV Makassar' },
  { id: 'radar_plw', name: 'Radar Mutiara SIS Al-Jufri Palu', code: 'PLW', city: 'Palu', province: 'Sulawesi Tengah', island: 'Sulawesi', lat: -0.918, lng: 119.907, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 86, operator: 'Stasiun Meteorologi Mutiara Palu' },
  { id: 'radar_kdi', name: 'Radar Haluoleo Kendari', code: 'KDI', city: 'Konawe Selatan', province: 'Sulawesi Tenggara', island: 'Sulawesi', lat: -4.083, lng: 122.417, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 52, operator: 'Stasiun Meteorologi Haluoleo' },
  { id: 'radar_gto', name: 'Radar Djalaluddin Gorontalo', code: 'GTO', city: 'Gorontalo', province: 'Gorontalo', island: 'Sulawesi', lat: 0.637, lng: 122.851, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 24, operator: 'Stasiun Meteorologi Djalaluddin' },
  { id: 'radar_mdc', name: 'Radar Sam Ratulangi Manado', code: 'MDC', city: 'Manado', province: 'Sulawesi Utara', island: 'Sulawesi', lat: 1.549, lng: 124.926, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 80, operator: 'Stasiun Meteorologi Sam Ratulangi' },

  // Maluku & Papua (6 Radar)
  { id: 'radar_tte', name: 'Radar Sultan Babullah Ternate', code: 'TTE', city: 'Ternate', province: 'Maluku Utara', island: 'Maluku', lat: 0.832, lng: 127.381, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 15, operator: 'Stasiun Meteorologi Sultan Babullah' },
  { id: 'radar_amq', name: 'Radar Pattimura Ambon', code: 'AMQ', city: 'Ambon', province: 'Maluku', island: 'Maluku', lat: -3.710, lng: 128.089, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 10, operator: 'Stasiun Meteorologi Pattimura' },
  { id: 'radar_soq', name: 'Radar Domine Eduard Osok Sorong', code: 'SOQ', city: 'Sorong', province: 'Papua Barat Daya', island: 'Papua', lat: -0.898, lng: 131.288, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 3, operator: 'Stasiun Meteorologi DEO Sorong' },
  { id: 'radar_bik', name: 'Radar Frans Kaisiepo Biak', code: 'BIK', city: 'Biak Numfor', province: 'Papua', island: 'Papua', lat: -1.190, lng: 136.108, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 14, operator: 'Stasiun Meteorologi Frans Kaisiepo' },
  { id: 'radar_djj', name: 'Radar Sentani Jayapura', code: 'DJJ', city: 'Jayapura', province: 'Papua', island: 'Papua', lat: -2.576, lng: 140.516, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 88, operator: 'Balai Besar MKG Wilayah V Jayapura' },
  { id: 'radar_mkq', name: 'Radar Mopah Merauke', code: 'MKQ', city: 'Merauke', province: 'Papua Selatan', island: 'Papua', lat: -8.520, lng: 140.418, type: 'C-Band Doppler', rangeKm: 150, status: 'Aktif 24/7', elevationM: 3, operator: 'Stasiun Meteorologi Mopah' },
];

export const BMKG_BLANK_SPOT_ZONES: BlankSpotZone[] = [
  {
    id: 'blank_papua_highland',
    name: 'Zona Kesenjangan Pegunungan Tengah Papua',
    region: 'Lanny Jaya, Nduga, Puncak Jaya & Yahukimo',
    island: 'Papua',
    center: [138.45, -4.35],
    radiusKm: 95,
    severity: 'Kritis',
    nearestRadarKm: 165,
    nearestRadarName: 'Radar Sentani Jayapura (DJJ)',
    impactNote: 'Kawasan lembah pegunungan curam tanpa stasiun radar permukaan; sangat rentan cuaca ekstrem pegunungan & turbulensi penerbangan perintis.',
    recommendation: 'Pemasangan Micro-Radar X-Band Mobile di Lembah Baliem & AWS Tenaga Surya di Dataran Tinggi.',
  },
  {
    id: 'blank_natuna_north',
    name: 'Kawasan Blank Spot Laut Natuna Utara & Anambas Luar',
    region: 'Perairan ZEE Laut Cina Selatan & Kepulauan Anambas',
    island: 'Sumatera',
    center: [107.50, 4.25],
    radiusKm: 120,
    severity: 'Tinggi',
    nearestRadarKm: 135,
    nearestRadarName: 'Radar Ranai Natuna (NTX)',
    impactNote: 'Jalur pelayaran internasional & nelayan nusantara terpapar badai tropis monsun tanpa cakupan AWS maritim real-time.',
    recommendation: 'Penambahan Buoy Cuaca Maritim Pintar & Radar Pantai Pengawas Gelombang Laut.',
  },
  {
    id: 'blank_halmahera_east',
    name: 'Zona Kesenjangan Halmahera Timur & Laut Halmahera',
    region: 'Maba, Wasile, Teluk Buli & Pulau Gebe',
    island: 'Maluku',
    center: [128.95, 1.15],
    radiusKm: 80,
    severity: 'Sedang',
    nearestRadarKm: 110,
    nearestRadarName: 'Radar Sultan Babullah Ternate (TTE)',
    impactNote: 'Terhalang topografi vulkanik Gunung Gamalama; wilayah pertambangan nikel pesisir rentan genangan konvektif mendadak.',
    recommendation: 'Penyebaran Automatic Weather Station (AWS) Industri & Sensor Hujan Optik Terdistribusi.',
  },
  {
    id: 'blank_kalimantan_muller',
    name: 'Zona Blank Spot Pegunungan Schwaner & Muller',
    region: 'Perbatasan Kalteng - Kalbar - Kaltim (Hutan Lindung Heart of Borneo)',
    island: 'Kalimantan',
    center: [113.25, -0.85],
    radiusKm: 110,
    severity: 'Tinggi',
    nearestRadarKm: 155,
    nearestRadarName: 'Radar Tjilik Riwut Palangka Raya (PKY)',
    impactNote: 'Daerah tangkapan air hulu Sungai Kapuas & Barito; kesenjangan data menyulitkan peringatan dini banjir bandang hilir.',
    recommendation: 'Stasiun AWS Otomatis Satelit LoRa / Starlink di Hulu DAS Sungai Utama.',
  },
  {
    id: 'blank_indian_ocean_java',
    name: 'Kawasan Maritim Megathrust Samudra Hindia Selatan Jawa',
    region: 'Zona Palung Jawa (Banten - Jabar - Jateng Selatan)',
    island: 'Jawa',
    center: [108.20, -9.60],
    radiusKm: 130,
    severity: 'Kritis',
    nearestRadarKm: 145,
    nearestRadarName: 'Radar Tunggul Wulung Cilacap (CXP)',
    impactNote: 'Zona gempa bumi subduksi megathrust aktif & pembentukan siklon tropis Samudra Hindia tanpa pelampung AWS laut permanen.',
    recommendation: 'Deployment Buoy Tsunami Terintegrasi AWS Maritim & Sensor Barometrik Akurasi Tinggi.',
  },
  {
    id: 'blank_arafura_sea',
    name: 'Zona Kesenjangan Laut Arafura & Kepulauan Aru',
    region: 'Perairan Aru Selatan & Laut Arafura Dangkal',
    island: 'Maluku',
    center: [134.80, -6.60],
    radiusKm: 105,
    severity: 'Sedang',
    nearestRadarKm: 170,
    nearestRadarName: 'Radar Mopah Merauke (MKQ)',
    impactNote: 'Wilayah perikanan tangkap terbesar di Indonesia timur sering mengalami lonjakan gelombang pasang tanpa radar nowcasting.',
    recommendation: 'Pemasangan Radar Pantai HF Maritim & Pelampung Cuaca Cerdas Nelayan.',
  },
];
