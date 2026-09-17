export type DataCategory =
  | 'ALL'
  | 'SEISMIC_TSUNAMI'
  | 'VOLCANO'
  | 'WEATHER_ATMOSPHERE'
  | 'GEOSPATIAL_TERRAIN'
  | 'DISASTER_RISK'
  | 'EDUCATION_SPAB'
  | 'SATELLITE_REMOTE_SENSING'
  | 'BASEMAP_INFRASTRUCTURE'
  | 'AI_INTELLIGENCE';

export type InstitutionStatus =
  | 'GOVERNMENT_OFFICIAL_RI' // Lembaga Pemerintah RI Resmi (LPNK / Kementerian)
  | 'INTERNATIONAL_OFFICIAL_AGENCY' // Badan Ilmiah Resmi Internasional Antar-Pemerintah
  | 'OPEN_DATA_CONSORTIUM' // Konsorsium Data Terbuka Terverifikasi Standar Industri
  | 'ENTERPRISE_AI_OFFICIAL'; // Penyedia Kecerdasan Buatan Resmi

export interface DataSourceItem {
  id: string;
  name: string;
  category: DataCategory;
  categoryLabel: string;
  agencyName: string;
  agencyShort: string;
  institutionType: InstitutionStatus;
  institutionStatusLabel: string;
  officialLegalityBasis: string; // Dasar hukum/mandat kelembagaan resmi
  description: string;
  dataPoints: string[];
  integrationMethod: string;
  updateFrequency: string;
  spatialResolution: string;
  dataStandard: string;
  portalUrl: string;
  directApiEndpoint?: string;
  badgeColor: string;
  isLiveConnected: boolean;
}

export const DATA_CATEGORIES: { id: DataCategory; label: string; icon: string }[] = [
  { id: 'ALL', label: 'Semua Sumber', icon: 'Layers' },
  { id: 'SEISMIC_TSUNAMI', label: 'Gempa & Tsunami', icon: 'Activity' },
  { id: 'VOLCANO', label: 'Gunung Api & Magma', icon: 'Flame' },
  { id: 'WEATHER_ATMOSPHERE', label: 'Cuaca & Radar', icon: 'CloudRain' },
  { id: 'GEOSPATIAL_TERRAIN', label: 'Batas & Topografi (DEM)', icon: 'Mountain' },
  { id: 'DISASTER_RISK', label: 'Risiko & Mitigasi', icon: 'ShieldAlert' },
  { id: 'EDUCATION_SPAB', label: 'Sekolah Nasional SPAB', icon: 'GraduationCap' },
  { id: 'SATELLITE_REMOTE_SENSING', label: 'Citra Satelit', icon: 'Satellite' },
  { id: 'BASEMAP_INFRASTRUCTURE', label: 'Peta Dasar & Jalan', icon: 'Map' },
  { id: 'AI_INTELLIGENCE', label: 'Kecerdasan Buatan AI', icon: 'Brain' },
];

export const INSTITUTION_STATUS_CONFIG: Record<
  InstitutionStatus,
  { label: string; color: string; bg: string; border: string; icon: string }
> = {
  GOVERNMENT_OFFICIAL_RI: {
    label: 'Lembaga Resmi Pemerintah RI',
    color: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-950/50',
    border: 'border-emerald-500/30',
    icon: 'Landmark',
  },
  INTERNATIONAL_OFFICIAL_AGENCY: {
    label: 'Badan Ilmiah Resmi Internasional',
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-50 dark:bg-blue-950/50',
    border: 'border-blue-500/30',
    icon: 'Globe',
  },
  OPEN_DATA_CONSORTIUM: {
    label: 'Konsorsium Data Terbuka Terverifikasi',
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-950/50',
    border: 'border-amber-500/30',
    icon: 'Compass',
  },
  ENTERPRISE_AI_OFFICIAL: {
    label: 'Teknologi AI Terverifikasi Google',
    color: 'text-purple-700 dark:text-purple-300',
    bg: 'bg-purple-50 dark:bg-purple-950/50',
    border: 'border-purple-500/30',
    icon: 'Sparkles',
  },
};

export const DATA_SOURCES_REGISTRY: DataSourceItem[] = [
  {
    id: 'bmkg-gempa-tews',
    name: 'InaTEWS Realtime Earthquake & Shakemap Stream',
    category: 'SEISMIC_TSUNAMI',
    categoryLabel: 'Gempa & Tsunami',
    agencyName: 'Badan Meteorologi, Klimatologi, dan Geofisika (BMKG)',
    agencyShort: 'BMKG RI',
    institutionType: 'GOVERNMENT_OFFICIAL_RI',
    institutionStatusLabel: 'Lembaga Pemerintah Nonkementerian (LPNK) RI',
    officialLegalityBasis: 'UU RI No. 31 Tahun 2009 tentang Meteorologi, Klimatologi, dan Geofisika serta Perpres No. 93 Tahun 2019 tentang Penguatan dan Pengembangan Sistem Peringatan Dini Gempa Bumi dan Tsunami.',
    description: 'Data real-time parameter gempa bumi tektonik Indonesia: AutoGempa M>5.0, Gempaterkini 15 event terakhir, gempa dirasakan dengan intensitas Modified Mercalli Intensity (MMI), koordinat episenter, kedalaman hiposenter, dan estimasi potensi tsunami.',
    dataPoints: [
      'Magnitudo (M) dan Kedalaman Hiposenter (km)',
      'Koordinat Lintang & Bujur Episenter',
      'Peta Guncangan Shakemap resmi BMKG',
      'Klasifikasi Skala Intensitas Dirasakan (MMI)',
      'Status Peringatan Dini Potensi Tsunami'
    ],
    integrationMethod: 'Live HTTP REST Stream dengan Caching Cerdas Cepat di Backend Server Harmony',
    updateFrequency: 'Real-time (Detik pasca sensor seismik BMKG merekam gelombang P/S)',
    spatialResolution: 'Presisi koordinat desimal lintang/bujur hingga titik episenter kawah/laut',
    dataStandard: 'WMO No. 49 & Standar Seismik InaTEWS / UNESCO-IOC',
    portalUrl: 'https://data.bmkg.go.id/',
    directApiEndpoint: 'https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json',
    badgeColor: '#ef4444',
    isLiveConnected: true,
  },
  {
    id: 'pvmbg-magma-vona',
    name: 'MAGMA Indonesia & VONA Volcano Hazard Catalog',
    category: 'VOLCANO',
    categoryLabel: 'Gunung Api & Magma',
    agencyName: 'Pusat Vulkanologi dan Mitigasi Bencana Geologi (PVMBG) - Badan Geologi',
    agencyShort: 'PVMBG Badan Geologi ESDM',
    institutionType: 'GOVERNMENT_OFFICIAL_RI',
    institutionStatusLabel: 'Lembaga Kementerian Energi dan Sumber Daya Mineral (ESDM) RI',
    officialLegalityBasis: 'Permen ESDM No. 13 Tahun 2016 tentang Organisasi dan Tata Kerja Kementerian ESDM serta UU No. 24 Tahun 2007 tentang Penanggulangan Bencana Geologi.',
    description: 'Aplikasi resmi mitigasi bencana geologi Indonesia: pemantauan 127 gunung api aktif, status tingkat aktivitas resmi (Level I Normal, Level II Waspada, Level III Siaga, Level IV Awas), laporan VONA (Volcano Observatory Notice for Aviation), serta batas perimeter Kawasan Rawan Bencana (KRB I, KRB II, KRB III).',
    dataPoints: [
      '127 Gunung Api Aktif Se-Indonesia (Posisi & Elevasi Kawah)',
      'Tingkat Aktivitas Magmatik Terkini (Level I - IV)',
      'Radius Bahaya Sektoral & Lingkar Kawah (KRB I, II, III)',
      'Frekuensi Gempa Vulkanik Dalam (VA), Dangkal (VB), & Emisi Hembusan',
      'Tinggi Kolom Abu Letusan & Arah Sebaran VONA'
    ],
    integrationMethod: 'Katalog Spasial Terindeks Geometrik + Sinkronisasi Event Seismik Vulkanik',
    updateFrequency: 'Real-time saat terdeteksi anomali seismisitas / harian periodik',
    spatialResolution: 'Tingkat kawah puncak s.d. zona KRB radius 1-12 km',
    dataStandard: 'Standar Internasional IAVCEI / WOVO & Badan Geologi RI',
    portalUrl: 'https://magma.esdm.go.id/',
    directApiEndpoint: 'https://magma.esdm.go.id/v1/gunung-api/laporan',
    badgeColor: '#f97316',
    isLiveConnected: true,
  },
  {
    id: 'big-demnas-inageoportal',
    name: 'DEMNAS (Digital Elevation Model Nasional) & Peta RBI',
    category: 'GEOSPATIAL_TERRAIN',
    categoryLabel: 'Batas & Topografi (DEM)',
    agencyName: 'Badan Informasi Geospasial (BIG)',
    agencyShort: 'BIG RI (Ina-Geoportal)',
    institutionType: 'GOVERNMENT_OFFICIAL_RI',
    institutionStatusLabel: 'Lembaga Pemerintah Nonkementerian (LPNK) RI Pemegang Mandat Satu Peta',
    officialLegalityBasis: 'UU RI No. 4 Tahun 2011 tentang Informasi Geospasial, Perpres No. 9 Tahun 2016 jo. Perpres No. 23 Tahun 2021 tentang Percepatan Pelaksanaan Kebijakan Satu Peta (One Map Policy).',
    description: 'Data elevasi digital nasional dengan resolusi spasial tinggi 0.27 arc-second (~8.1 meter) hasil integrasi mulus sensor IFSAR, TerrSAR-X, dan ALOS PALSAR. Digunakan Harmony untuk menghitung profil kelerengan (slope), aspek lereng, analisis geomorfologi, batas administratif, dan kerentanan tanah longsor di sekitar sekolah.',
    dataPoints: [
      'Model Elevasi Digital Nasional (DEMNAS) Resolusi ~8 Meter',
      'Peta Rupa Bumi Indonesia (RBI) Skala 1:25.000 & 1:50.000',
      'Garis Batas Administrasi Wilayah Provinsi, Kabupaten/Kota, & Kecamatan',
      'Kontur Topografi & Kemiringan Lereng (Derajat & Persentase Slope)',
      'Geoid EGM2008 & Referensi Vertikal Nasional'
    ],
    integrationMethod: 'ISO 19115 Spatial Engine Geodesi & Perhitungan Kelerengan Digital',
    updateFrequency: 'Periodik Kuartalan (Pemutakhiran Resmi BIG)',
    spatialResolution: '0.27 arc-second (~8.1 meter sel spasial DEMNAS)',
    dataStandard: 'SNI ISO 19115:2012 Geospasial & Kebijakan Satu Peta',
    portalUrl: 'https://tanahair.indonesia.go.id/demnas/#/',
    badgeColor: '#10b981',
    isLiveConnected: true,
  },
  {
    id: 'bnpb-inarisk-irbi',
    name: 'InaRISK & Indeks Risiko Bencana Indonesia (IRBI)',
    category: 'DISASTER_RISK',
    categoryLabel: 'Risiko & Mitigasi',
    agencyName: 'Badan Nasional Penanggulangan Bencana (BNPB)',
    agencyShort: 'BNPB RI',
    institutionType: 'GOVERNMENT_OFFICIAL_RI',
    institutionStatusLabel: 'Lembaga Pemerintah Nonkementerian (LPNK) Penanggulangan Bencana RI',
    officialLegalityBasis: 'UU RI No. 24 Tahun 2007 tentang Penanggulangan Bencana & Peraturan BNPB No. 2 Tahun 2012 tentang Pedoman Umum Pengkajian Risiko Bencana.',
    description: 'Portal spasial resmi risiko bencana Indonesia: memetakan tingkat kerentanan, ancaman bahaya, dan kapasitas daerah terhadap multi-bencana (banjir, banjir bandang, gempa bumi, tsunami, tanah longsor, cuaca ekstrem, kekeringan, dan kebakaran hutan). Harmony memperkaya profil setiap sekolah dengan data IRBI wilayah.',
    dataPoints: [
      'Indeks Kerentanan Multi-Bencana (Tinggi, Sedang, Rendah)',
      'Zona Bahaya Banjir & Banjir Bandang Aliran Sungai',
      'Peta Paparan Risiko Gempa Sesar Aktif & Tanah Longsor',
      'Data Historis Kejadian & Dampak Bencana (DIBI BNPB)',
      'Kapasitas Kesiapsiagaan Daerah & Rekomendasi Evakuasi'
    ],
    integrationMethod: 'Enrichment Runtime Engine Berbasis Wilayah Administratif & Buffer Radius Geospasial',
    updateFrequency: 'Tahunan & Pembaruan Peta Bahaya Regional',
    spatialResolution: 'Tingkat Kabupaten/Kota hingga Grid Resolusi 100-250 meter',
    dataStandard: 'Pedoman Pengkajian Risiko Bencana BNPB & Sendai Framework for Disaster Risk Reduction',
    portalUrl: 'https://inarisk.bnpb.go.id/',
    badgeColor: '#d97706',
    isLiveConnected: true,
  },
  {
    id: 'kemendikbud-dapodik',
    name: 'Dapodik & Data Referensi Satuan Pendidikan Nasional',
    category: 'EDUCATION_SPAB',
    categoryLabel: 'Sekolah Nasional SPAB',
    agencyName: 'Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi (Kemendikbudristek)',
    agencyShort: 'Kemendikbudristek RI',
    institutionType: 'GOVERNMENT_OFFICIAL_RI',
    institutionStatusLabel: 'Kementerian Pemerintah Republik Indonesia',
    officialLegalityBasis: 'Permendikbud No. 33 Tahun 2019 tentang Penyelenggaraan Program Satuan Pendidikan Aman Bencana (SPAB) dan UU No. 20 Tahun 2003 tentang Sisdiknas.',
    description: 'Dataset terverifikasi 215.000+ satuan pendidikan (SD, SMP, SMA, SMK, SLB) di 38 provinsi dan 514 kabupaten/kota se-Indonesia. Memuat identitas resmi Nomor Pokok Sekolah Nasional (NPSN), nama sekolah, jenjang, akreditasi, serta titik koordinat lintang & bujur akurat untuk pemetaan geospasial risiko SPAB.',
    dataPoints: [
      '215.000+ Sekolah Terverifikasi Lengkap Nasional',
      'Nomor Pokok Sekolah Nasional (NPSN) Unik',
      'Geolokasi Koordinat Lintang & Bujur Titik Gerbang Sekolah',
      'Alamat Administratif Lengkap (Desa/Kelurahan, Kecamatan, Kab/Kota, Provinsi)',
      'Jenjang Pendidikan (SD, SMP, SMA, SMK, SLB) & Status Sekolah'
    ],
    integrationMethod: 'Fast In-Memory Indexed Database (Backend / Data Pipeline Harmony)',
    updateFrequency: 'Berkala tiap Semester Akademik',
    spatialResolution: 'Koordinat titik akurat gedung sekolah (Akurasi GPS < 10 meter)',
    dataStandard: 'Standar Data Pokok Pendidikan (Dapodik) & Pusdatin Kemendikbudristek',
    portalUrl: 'https://referensi.data.kemdikbud.go.id/',
    badgeColor: '#2563eb',
    isLiveConnected: true,
  },
  {
    id: 'bmkg-weather-radar-sat',
    name: 'BMKG Doppler Weather Radar & Nowcasting Early Warning',
    category: 'WEATHER_ATMOSPHERE',
    categoryLabel: 'Cuaca & Radar',
    agencyName: 'Badan Meteorologi, Klimatologi, dan Geofisika (Kedeputian Bidang Meteorologi)',
    agencyShort: 'BMKG Meteorologi',
    institutionType: 'GOVERNMENT_OFFICIAL_RI',
    institutionStatusLabel: 'Lembaga Pemerintah Nonkementerian (LPNK) RI',
    officialLegalityBasis: 'UU RI No. 31 Tahun 2009 Pasal 21 tentang Pelayanan Informasi Cuaca Ekstrem dan Peringatan Dini Meteorologi Penerbangan/Publik.',
    description: 'Peringatan dini cuaca ekstrem jangka pendek (nowcasting 0-6 jam), jaringan radar cuaca Doppler pita C-Band dan X-Band di seluruh stasiun meteorologi bandara dan maritim Indonesia, serta produk citra satelit geostasioner Himawari-9 (Infrared Enhanced, Water Vapor, dan sebaran abu vulkanik).',
    dataPoints: [
      'Peringatan Dini Hujan Sangat Lebat Disertai Petir & Angin Kencang',
      'Wilayah Terdampak & Wilayah Potensi Perluasan Cuaca Ekstrem',
      'Reflektivitas Radar Doppler (dBZ) & Tingkat Intensitas Curah Hujan',
      'Suhu Puncak Awan Konvektif Cumulonimbus (Cb) dari Satelit Himawari-9',
      'Indeks Kemudahan Terbakar Lapisan Permukaan Tanah (FFMC) Karhutla'
    ],
    integrationMethod: 'API Stream BMKG Stasiun Meteorologi Juanda & Kedeputian Meteorologi Pusat',
    updateFrequency: 'Setiap 10 menit (Radar) & Real-time Update Peringatan Dini',
    spatialResolution: 'Radius pengamatan radar hingga 240 km per stasiun',
    dataStandard: 'World Meteorological Organization (WMO) Technical Regulations',
    portalUrl: 'https://satelit.bmkg.go.id/',
    badgeColor: '#0ea5e9',
    isLiveConnected: true,
  },
  {
    id: 'esa-copernicus-sentinel',
    name: 'Copernicus Sentinel-2 & Sentinel-1 SAR Earth Observation',
    category: 'SATELLITE_REMOTE_SENSING',
    categoryLabel: 'Citra Satelit',
    agencyName: 'European Space Agency (ESA) & European Union Copernicus Programme',
    agencyShort: 'ESA Copernicus (Uni Eropa)',
    institutionType: 'INTERNATIONAL_OFFICIAL_AGENCY',
    institutionStatusLabel: 'Program Observasi Bumi Resmi Uni Eropa & Badan Antariksa Eropa',
    officialLegalityBasis: 'Peraturan Uni Eropa (EU) No 377/2014 tentang Pembentukan Program Copernicus dan Kebijakan Akses Penuh Data Terbuka (Full, Free and Open Access).',
    description: 'Data citra satelit observasi bumi optik multispektral (Sentinel-2 13 kanal optik) dan Synthetic Aperture Radar (Sentinel-1 C-SAR pita gelombang mikro tembus awan). Digunakan Harmony untuk menghitung indeks kesehatan vegetasi (NDVI), kebasahan air/banjir (NDWI), kerapatan bangunan (NDBI), dan deteksi genangan.',
    dataPoints: [
      'Normalized Difference Vegetation Index (NDVI) Biofisik Lingkungan',
      'Normalized Difference Water Index (NDWI) & Deteksi Genangan Air',
      'Bare Soil Index (BSI) Indeks Lahan Terbuka & Erosi',
      'Radar Tembus Awan SAR Level-1 Ground Range Detected (GRD)',
      'Resolusi Spasial 10 meter (Band Red, Green, Blue, NIR)'
    ],
    integrationMethod: 'CEOS CARD4L (Analysis Ready Data) Spectral Computation Engine',
    updateFrequency: 'Revisit time 5 hari (Konstelasi Sentinel-2A & Sentinel-2B)',
    spatialResolution: '10 meter hingga 20 meter piksel permukaan bumi',
    dataStandard: 'CEOS CARD4L & Open Geospatial Consortium (OGC)',
    portalUrl: 'https://browser.dataspace.copernicus.eu/',
    badgeColor: '#059669',
    isLiveConnected: true,
  },
  {
    id: 'usgs-earthquake-hazards',
    name: 'USGS Real-time Worldwide Earthquake Catalog',
    category: 'SEISMIC_TSUNAMI',
    categoryLabel: 'Gempa & Tsunami',
    agencyName: 'United States Geological Survey (USGS)',
    agencyShort: 'USGS (Pemerintah AS)',
    institutionType: 'INTERNATIONAL_OFFICIAL_AGENCY',
    institutionStatusLabel: 'Badan Ilmiah Resmi Pemerintah Federal Amerika Serikat',
    officialLegalityBasis: 'US Earthquake Hazards Reduction Act of 1977 (Public Law 95-124) dan USGS Organic Act.',
    description: 'Layanan feed GeoJSON real-time katalog gempa global USGS untuk memvalidasi dan membandingkan magnitudo momen (Mw), estimasi guncangan, dan parameter sesar tektonik internasional dengan data seismisitas lokal BMKG.',
    dataPoints: [
      'Gempa Global Real-time (M ≥ 4.5 & Seismisitas Wilayah Indonesia)',
      'Moment Magnitude (Mw), Body Wave (Mb), & Surface Wave (Ms)',
      'Estimasi Hiposenter & Waktu Terjadinya Gempa (UTC)',
      'Katalog Historis Patahan Lempeng Indo-Australia, Eurasia, & Pasifik'
    ],
    integrationMethod: 'GeoJSON REST Feed Query dengan Buffer Jarak Haversine',
    updateFrequency: 'Real-time (Tiap menit pembaruan global feed)',
    spatialResolution: 'Akurasi geolokasi global sensor seismograf broadband GSN',
    dataStandard: 'USGS FDSN Web Services Standard',
    portalUrl: 'https://earthquake.usgs.gov/fdsnws/event/1/',
    directApiEndpoint: 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson',
    badgeColor: '#dc2626',
    isLiveConnected: true,
  },
  {
    id: 'open-meteo-ecmwf',
    name: 'Open-Meteo & ECMWF Atmospheric Numerical Weather Prediction',
    category: 'WEATHER_ATMOSPHERE',
    categoryLabel: 'Cuaca & Radar',
    agencyName: 'European Centre for Medium-Range Weather Forecasts (ECMWF) & Open-Meteo',
    agencyShort: 'ECMWF / Open-Meteo',
    institutionType: 'INTERNATIONAL_OFFICIAL_AGENCY',
    institutionStatusLabel: 'Organisasi Antar-Pemerintah Meteorologi 35 Negara Eropa',
    officialLegalityBasis: 'Konvensi Pendirian ECMWF tahun 1975 & WMO Resolution 40 tentang Pertukaran Data Meteorologi Internasional.',
    description: 'Model prediksi numerik cuaca resolusi tinggi (Integrated Forecasting System / IFS), data kecepatan dan arah hembusan angin 360°, suhu permukaan, kelembapan relatif, tekanan udara, serta API elevasi topografi presisi berbasis koordinat lintang & bujur.',
    dataPoints: [
      'Vektor Arah Angin Derajat (0-360°) & Kecepatan Hembusan (km/jam)',
      'Skala Kekuatan Angin Beaufort (0-12)',
      'Suhu Udara Permukaan (°C) & Titik Embun',
      'Tekanan Barometrik Udara (hPa / mb)',
      'Elevasi Topografi Presisi Titik Koordinat Pengguna'
    ],
    integrationMethod: 'Direct REST API Atmospheric Query Berbasis Koordinat Lat/Lng',
    updateFrequency: 'Setiap Jam (Model Output Forecast) & Real-time Interpolasi',
    spatialResolution: 'Resolusi grid atmosferik 0.1° (~11 km) hingga model lokal',
    dataStandard: 'WMO Standard GRIB2 & NetCDF Data Models',
    portalUrl: 'https://open-meteo.com/',
    directApiEndpoint: 'https://api.open-meteo.com/v1/forecast',
    badgeColor: '#06b6d4',
    isLiveConnected: true,
  },
  {
    id: 'nasa-firms-noaa',
    name: 'NASA FIRMS & NOAA Thermal Anomaly Hotspot Detection',
    category: 'DISASTER_RISK',
    categoryLabel: 'Risiko & Mitigasi',
    agencyName: 'National Aeronautics and Space Administration (NASA) & NOAA',
    agencyShort: 'NASA / NOAA',
    institutionType: 'INTERNATIONAL_OFFICIAL_AGENCY',
    institutionStatusLabel: 'Badan Penerbangan dan Antariksa Resmi Pemerintah Amerika Serikat',
    officialLegalityBasis: 'US National Aeronautics and Space Act of 1958 & Earth Science Data and Information System (ESDIS) Project.',
    description: 'Sistem deteksi titik api/panas permukaan bumi secara Near Real-Time (NRT) menggunakan sensor VIIRS (Visible Infrared Imaging Radiometer Suite resolusi 375m pada satelit Suomi NPP / NOAA-20) dan MODIS (satelit Terra/Aqua). Mendeteksi titik rawan Karhutla dan aktivitas termal kubah lava gunung api.',
    dataPoints: [
      'Deteksi Titik Panas (Hotspot) Kebakaran Hutan & Lahan (Karhutla)',
      'Fire Radiative Power (FRP dalam Megawatt)',
      'Tingkat Kepercayaan Deteksi Termal (Confidence Score %)',
      'Waktu Pelintasan Satelit (Day/Night Acquisition)'
    ],
    integrationMethod: 'NRT Spatial Thermal Anomaly Query',
    updateFrequency: 'Setiap 3 jam pasca satelit melintas di atas wilayah Indonesia',
    spatialResolution: '375 meter (VIIRS I-Band) & 1 km (MODIS)',
    dataStandard: 'NASA EOSDIS Open Science Data Policy',
    portalUrl: 'https://firms.modaps.eosdis.nasa.gov/',
    badgeColor: '#b91c1c',
    isLiveConnected: true,
  },
  {
    id: 'openstreetmap-odbl',
    name: 'OpenStreetMap (OSM) & ODbL Open Geospatial Basemap',
    category: 'BASEMAP_INFRASTRUCTURE',
    categoryLabel: 'Peta Dasar & Jalan',
    agencyName: 'OpenStreetMap Foundation (OSMF) & Komunitas SIG Terbuka',
    agencyShort: 'OpenStreetMap (OSM)',
    institutionType: 'OPEN_DATA_CONSORTIUM',
    institutionStatusLabel: 'Konsorsium Data Geospasial Terbuka Global Terverifikasi',
    officialLegalityBasis: 'Open Data Commons Open Database License (ODbL) 1.0 & Standar Pemetaan Kolaboratif Global.',
    description: 'Lapisan peta vektor dasar (basemap) mencakup jaringan jalan raya nasional, jalan tol, rel kereta api, jalur evakuasi, gedung perkantoran dan fasilitas publik, jaringan sungai, serta toponimi desa dan kecamatan di seluruh pelosok Indonesia.',
    dataPoints: [
      'Peta Jalan Raya Nasional, Provinsi, Kabupaten, & Lingkungan',
      'Jaringan Transportasi, Jembatan, & Jalur Alternatif Evakuasi',
      'Gedung, Titik Kumpul Aman, & Fasilitas Kesehatan / RS Terdekat',
      'Jaringan Hidrologi Sungai & Drainase Permukaan'
    ],
    integrationMethod: 'Web Mercator Tile Layer XYZ & Overpass OpenLayers Vector Source',
    updateFrequency: 'Kontinu Harian (Diperbarui komunitas pemeta setiap saat)',
    spatialResolution: 'Vektor skala dinamis 1:1.000 hingga 1:500.000',
    dataStandard: 'OpenStreetMap XML / PBF & OGC Slippy Map Tilename Specification',
    portalUrl: 'https://www.openstreetmap.org/',
    badgeColor: '#475569',
    isLiveConnected: true,
  },
  {
    id: 'google-gemini-ai',
    name: 'Google DeepMind Gemini Multimodal Disaster Intelligence Engine',
    category: 'AI_INTELLIGENCE',
    categoryLabel: 'Kecerdasan Buatan AI',
    agencyName: 'Google DeepMind / Google Cloud AI',
    agencyShort: 'Google Gemini AI',
    institutionType: 'ENTERPRISE_AI_OFFICIAL',
    institutionStatusLabel: 'Platform Kecerdasan Buatan Enterprise Terverifikasi Google',
    officialLegalityBasis: 'Google AI Principles, ISO/IEC 27001 Security Standard, & Google Cloud Data Governance Framework.',
    description: 'Mesin kecerdasan buatan tingkat lanjut yang digunakan Harmony untuk menyintesis peringatan dini BMKG dan data PVMBG secara instan ke dalam bahasa yang mudah dipahami warga sekolah, menyusun rekomendasi mitigasi struktural dan non-struktural SPAB, serta memandu simulasi evakuasi interaktif.',
    dataPoints: [
      'Sintesis Rekomendasi Evakuasi Berbasis Kondisi Sekolah & Multi-Hazard',
      'Analisis Risiko Spasial Berbasis Jarak ke Kawah & Sesar Aktif',
      'Generator Soal Kuis Kesiapsiagaan Cerdas Sesuai Karakteristik Ancaman Lokal',
      'Panduan Pertolongan Pertama & Mitigasi Kerusakan Satuan Pendidikan'
    ],
    integrationMethod: 'Google GenAI SDK (@google/genai) dengan Enkripsi API Key Terproteksi',
    updateFrequency: 'Real-time On-demand Processing',
    spatialResolution: 'Analisis kontekstual per koordinat lokasi sekolah',
    dataStandard: 'Enterprise Responsible AI & Zero Data Logging for Training',
    portalUrl: 'https://ai.google.dev/',
    badgeColor: '#7c3aed',
    isLiveConnected: true,
  },
];

export const LEGAL_TRANSPARENCY_NOTES = {
  title: 'Landasan Hukum & Integritas Transparansi Data Harmony',
  subtitle: 'Komitmen Keterbukaan Data, Keaslian Sumber, dan Kepatuhan Regulasi Nasional',
  paragraphs: [
    'Platform Harmony dikembangkan sebagai Sistem Informasi Geospasial & Manajemen Risiko Bencana Satuan Pendidikan Aman Bencana (SPAB) yang mematuhi prinsip integritas data, transparansi publik, dan tidak memanipulasi data mentah kebencanaan yang dirilis oleh institusi resmi negara.',
    'Sesuai dengan amanat UU RI No. 14 Tahun 2008 tentang Keterbukaan Informasi Publik (KIP) serta Perpres No. 9 Tahun 2016 jo. Perpres No. 23 Tahun 2021 tentang Percepatan Pelaksanaan Kebijakan Satu Peta (One Map Policy), seluruh data geospasial dasar, kegempaan, vulkanologi, cuaca, dan data sekolah bersumber langsung dari portal data resmi pemerintah dan organisasi ilmiah internasional yang terakreditasi.',
    'Harmony bertindak sebagai sistem integrasi, visualisasi, dan analitik kecerdasan buatan (intelligence layer) yang menghubungkan data otoritatif tersebut dengan koordinat lebih dari 215.000 sekolah guna menyelamatkan nyawa peserta didik dan tenaga kependidikan di seluruh Indonesia.',
  ],
  regulations: [
    {
      code: 'UU No. 31 Tahun 2009',
      topic: 'Meteorologi, Klimatologi, dan Geofisika',
      agency: 'BMKG RI',
      summary: 'Menetapkan BMKG sebagai satu-satunya instansi pemerintah yang berwenang mengeluarkan informasi resmi gempa bumi, peringatan dini tsunami, dan peringatan cuaca ekstrem di Indonesia.',
    },
    {
      code: 'UU No. 24 Tahun 2007',
      topic: 'Penanggulangan Bencana',
      agency: 'BNPB RI',
      summary: 'Memberikan mandat penanggulangan bencana terpadu, pemetaan kawasan rawan bencana, dan sistem penanganan darurat kepada BNPB dan BPBD.',
    },
    {
      code: 'UU No. 4 Tahun 2011',
      topic: 'Informasi Geospasial',
      agency: 'BIG RI',
      summary: 'Menugaskan Badan Informasi Geospasial (BIG) sebagai wali data tunggal Informasi Geospasial Dasar (IGD) dan model elevasi nasional di Indonesia.',
    },
    {
      code: 'Permendikbud No. 33 Tahun 2019',
      topic: 'Penyelenggaraan Program SPAB',
      agency: 'Kemendikbudristek RI',
      summary: 'Mewajibkan satuan pendidikan di seluruh Indonesia untuk menyelenggarakan mitigasi risiko, edukasi kebencanaan, dan kesiapsiagaan keselamatan di sekolah.',
    },
    {
      code: 'Perpres No. 9 Tahun 2016',
      topic: 'Kebijakan Satu Peta (One Map Policy)',
      agency: 'Kemenko Perekonomian & BIG',
      summary: 'Mengintegrasikan seluruh peta tematik nasional dalam satu standar referensi geospasial, satu basis data geospasial, dan satu geoportal terpadu.',
    },
  ],
};
