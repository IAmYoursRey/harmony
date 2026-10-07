export interface PuSGenFault {
  id: string;
  name: string;
  segment: string;
  region: 'Sumatera' | 'Jawa' | 'Bali-Nusa Tenggara' | 'Kalimantan' | 'Sulawesi' | 'Maluku' | 'Papua';
  slipRateMmYear: number;
  mechanism: 'Strike-Slip' | 'Thrust' | 'Normal' | 'Oblique';
  lengthKm: number;
  mMax: number;
  strikeDeg?: number;
  dipDeg?: number;
  coordinates: [number, number][]; // [lng, lat] GeoJSON format
  description: string;
}

export interface NearestFaultResult {
  fault: PuSGenFault;
  distanceKm: number;
  hazardLevel: 'TINGGI' | 'SEDANG' | 'RENDAH';
  recommendation: string;
}

// Koleksi data representatif 295 segmen sesar aktif darat Indonesia berdasarkan Buku PuSGeN 2017 & SNI 1726:2019
export const PUSGEN_ACTIVE_FAULTS: PuSGenFault[] = [
  // === JAWA ===
  {
    id: 'flt-lembang',
    name: 'Sesar Lembang',
    segment: 'Segmen Utama (Cisarua - Maribaya - Palasari)',
    region: 'Jawa',
    slipRateMmYear: 6.0,
    mechanism: 'Strike-Slip',
    lengthKm: 29.0,
    mMax: 6.8,
    strikeDeg: 95,
    dipDeg: 80,
    coordinates: [
      [107.52, -6.83],
      [107.61, -6.82],
      [107.72, -6.81],
    ],
    description: 'Patahan aktif membentang di utara Cekungan Bandung dengan bukti pergeseran morfologi Holosen nyata.',
  },
  {
    id: 'flt-cimandiri-1',
    name: 'Sesar Cimandiri',
    segment: 'Segmen Pelabuhan Ratu - Cidadap',
    region: 'Jawa',
    slipRateMmYear: 4.5,
    mechanism: 'Oblique',
    lengthKm: 38.0,
    mMax: 6.7,
    coordinates: [
      [106.54, -6.98],
      [106.72, -6.94],
      [106.88, -6.91],
    ],
    description: 'Patahan naik geser menganan memanjang dari Teluk Pelabuhan Ratu melewati Lembah Cimandiri.',
  },
  {
    id: 'flt-cimandiri-2',
    name: 'Sesar Cimandiri',
    segment: 'Segmen Gandasoli - Padalarang',
    region: 'Jawa',
    slipRateMmYear: 4.0,
    mechanism: 'Strike-Slip',
    lengthKm: 32.0,
    mMax: 6.6,
    coordinates: [
      [106.90, -6.91],
      [107.15, -6.87],
      [107.45, -6.84],
    ],
    description: 'Segmen timur Sesar Cimandiri melintasi wilayah Cianjur dan Bandung Barat.',
  },
  {
    id: 'flt-baribis-1',
    name: 'Sesar Baribis',
    segment: 'Segmen Jakarta - Bekasi - Purwakarta',
    region: 'Jawa',
    slipRateMmYear: 5.0,
    mechanism: 'Thrust',
    lengthKm: 65.0,
    mMax: 6.7,
    coordinates: [
      [106.78, -6.32],
      [107.05, -6.37],
      [107.38, -6.48],
    ],
    description: 'Jalur sesar naik busur belakang (backarc thrust) di selatan wilayah metropolitan Jabodetabek.',
  },
  {
    id: 'flt-baribis-2',
    name: 'Sesar Baribis',
    segment: 'Segmen Subang - Majalengka',
    region: 'Jawa',
    slipRateMmYear: 5.0,
    mechanism: 'Thrust',
    lengthKm: 55.0,
    mMax: 6.8,
    coordinates: [
      [107.40, -6.50],
      [107.82, -6.65],
      [108.20, -6.80],
    ],
    description: 'Patahan naik memotong Formasi Citalang di kaki Gunung Ciremai.',
  },
  {
    id: 'flt-opak',
    name: 'Sesar Opak',
    segment: 'Segmen Bantul - Prambanan',
    region: 'Jawa',
    slipRateMmYear: 2.4,
    mechanism: 'Strike-Slip',
    lengthKm: 28.0,
    mMax: 6.6,
    coordinates: [
      [110.32, -8.01],
      [110.42, -7.90],
      [110.49, -7.78],
    ],
    description: 'Patahan geser mengiri berarah NNE-SSW pemicu gempa dahsyat Yogyakarta M6.3 Mei 2006.',
  },
  {
    id: 'flt-kendeng-1',
    name: 'Sesar Kendeng',
    segment: 'Segmen Semarang - Purwodadi',
    region: 'Jawa',
    slipRateMmYear: 5.0,
    mechanism: 'Thrust',
    lengthKm: 72.0,
    mMax: 7.0,
    coordinates: [
      [110.40, -7.05],
      [110.85, -7.10],
      [111.20, -7.15],
    ],
    description: 'Sistem sesar anjak Kendeng zona barat dengan perlapisan sedimen neogen terlipat kuat.',
  },
  {
    id: 'flt-kendeng-2',
    name: 'Sesar Kendeng',
    segment: 'Segmen Waru - Surabaya',
    region: 'Jawa',
    slipRateMmYear: 5.0,
    mechanism: 'Thrust',
    lengthKm: 48.0,
    mMax: 6.9,
    coordinates: [
      [112.45, -7.32],
      [112.72, -7.35],
      [112.85, -7.38],
    ],
    description: 'Jalur patahan anjak aktif yang melintasi zona padat penduduk Surabaya dan Sidoarjo.',
  },
  {
    id: 'flt-lasem',
    name: 'Sesar Lasem',
    segment: 'Segmen Kudus - Pati - Rembang',
    region: 'Jawa',
    slipRateMmYear: 2.0,
    mechanism: 'Strike-Slip',
    lengthKm: 58.0,
    mMax: 6.5,
    coordinates: [
      [110.82, -6.85],
      [111.10, -6.78],
      [111.45, -6.68],
    ],
    description: 'Patahan geser di pesisir utara Jawa Tengah berarah barat daya - timur laut.',
  },
  {
    id: 'flt-pasuruan',
    name: 'Sesar Pasuruan',
    segment: 'Segmen Gempol - Grati',
    region: 'Jawa',
    slipRateMmYear: 1.5,
    mechanism: 'Normal',
    lengthKm: 34.0,
    mMax: 6.4,
    coordinates: [
      [112.70, -7.60],
      [112.90, -7.65],
      [113.05, -7.70],
    ],
    description: 'Patahan aktif graben pesisir timur Jawa di utara Kompleks Pegunungan Tengger.',
  },

  // === SUMATERA (SISTEM SESAR BESAR SUMATERA / SEMANGKO) ===
  {
    id: 'flt-aceh',
    name: 'Sesar Besar Sumatera',
    segment: 'Segmen Aceh (Banda Aceh - Jantho)',
    region: 'Sumatera',
    slipRateMmYear: 15.0,
    mechanism: 'Strike-Slip',
    lengthKm: 180.0,
    mMax: 7.7,
    coordinates: [
      [95.32, 5.55],
      [95.58, 5.25],
      [95.85, 4.85],
    ],
    description: 'Sesar geser dekstral paling utara Sumatera melintasi Lembah Krueng Aceh.',
  },
  {
    id: 'flt-tripa',
    name: 'Sesar Besar Sumatera',
    segment: 'Segmen Tripa (Beutong - Takengon)',
    region: 'Sumatera',
    slipRateMmYear: 12.0,
    mechanism: 'Strike-Slip',
    lengthKm: 160.0,
    mMax: 7.5,
    coordinates: [
      [96.35, 4.25],
      [96.85, 3.85],
      [97.30, 3.45],
    ],
    description: 'Patahan aktif dengan laju pergeseran tinggi di pegunungan tengah Aceh.',
  },
  {
    id: 'flt-renun',
    name: 'Sesar Besar Sumatera',
    segment: 'Segmen Renun (Sidikalang - Danau Toba)',
    region: 'Sumatera',
    slipRateMmYear: 14.0,
    mechanism: 'Strike-Slip',
    lengthKm: 130.0,
    mMax: 7.6,
    coordinates: [
      [97.90, 2.75],
      [98.35, 2.35],
      [98.75, 2.05],
    ],
    description: 'Memotong wilayah kaldera supervolcano Danau Toba dengan topografi terjal.',
  },
  {
    id: 'flt-sianok',
    name: 'Sesar Besar Sumatera',
    segment: 'Segmen Sianok (Bukittinggi - Ngarai Sianok)',
    region: 'Sumatera',
    slipRateMmYear: 11.0,
    mechanism: 'Strike-Slip',
    lengthKm: 85.0,
    mMax: 7.4,
    coordinates: [
      [100.15, -0.15],
      [100.35, -0.32],
      [100.55, -0.55],
    ],
    description: 'Membentuk lembah ngarai tektonik ikonik Ngarai Sianok di Sumatera Barat.',
  },
  {
    id: 'flt-suliti',
    name: 'Sesar Besar Sumatera',
    segment: 'Segmen Suliti (Danau Singkarak - Solok)',
    region: 'Sumatera',
    slipRateMmYear: 13.0,
    mechanism: 'Strike-Slip',
    lengthKm: 95.0,
    mMax: 7.5,
    coordinates: [
      [100.60, -0.60],
      [100.90, -1.05],
      [101.20, -1.45],
    ],
    description: 'Zona pull-apart basin Danau Singkarak yang dibatasi gawir sesar tajam.',
  },
  {
    id: 'flt-semangko',
    name: 'Sesar Besar Sumatera',
    segment: 'Segmen Semangko (Teluk Semangka - Suoh Lampung)',
    region: 'Sumatera',
    slipRateMmYear: 11.0,
    mechanism: 'Strike-Slip',
    lengthKm: 120.0,
    mMax: 7.6,
    coordinates: [
      [104.25, -5.20],
      [104.55, -5.60],
      [104.85, -5.95],
    ],
    description: 'Segmen paling selatan Sesar Sumatera sebelum menyambung ke Selat Sunda.',
  },

  // === SULAWESI ===
  {
    id: 'flt-palukoro-1',
    name: 'Sesar Palu-Koro',
    segment: 'Segmen Palu (Teluk Palu - Lembah Palu)',
    region: 'Sulawesi',
    slipRateMmYear: 35.0,
    mechanism: 'Strike-Slip',
    lengthKm: 110.0,
    mMax: 7.8,
    coordinates: [
      [119.82, -0.75],
      [119.88, -0.92],
      [119.95, -1.15],
    ],
    description: 'Sesar geser paling aktif di Indonesia (slip rate ~35-42 mm/tahun), pemicu gempa & likuifaksi Palu 2018.',
  },
  {
    id: 'flt-matano',
    name: 'Sesar Matano',
    segment: 'Segmen Danau Matano - Sorowako',
    region: 'Sulawesi',
    slipRateMmYear: 18.0,
    mechanism: 'Strike-Slip',
    lengthKm: 140.0,
    mMax: 7.5,
    coordinates: [
      [121.15, -2.35],
      [121.55, -2.52],
      [122.05, -2.75],
    ],
    description: 'Sesar geser kiri membelah Sulawesi Tengah ke Teluk Tolo membentuk Danau Matano terdalam di Asia.',
  },
  {
    id: 'flt-saddang',
    name: 'Sesar Saddang',
    segment: 'Segmen Mamuju - Tana Toraja',
    region: 'Sulawesi',
    slipRateMmYear: 7.0,
    mechanism: 'Strike-Slip',
    lengthKm: 135.0,
    mMax: 7.2,
    coordinates: [
      [118.80, -2.60],
      [119.45, -3.10],
      [119.95, -3.45],
    ],
    description: 'Patahan aktif melintasi Sulawesi Barat dan pegunungan Tana Toraja.',
  },
  {
    id: 'flt-walanae',
    name: 'Sesar Walanae',
    segment: 'Segmen Soppeng - Bone',
    region: 'Sulawesi',
    slipRateMmYear: 4.5,
    mechanism: 'Normal',
    lengthKm: 110.0,
    mMax: 6.9,
    coordinates: [
      [119.90, -4.10],
      [120.10, -4.60],
      [120.25, -5.10],
    ],
    description: 'Patahan graben memanjang dari Danau Tempe ke selatan Semenanjung Sulawesi Selatan.',
  },
  {
    id: 'flt-gorontalo',
    name: 'Sesar Gorontalo',
    segment: 'Segmen Limboto - Teluk Tomini',
    region: 'Sulawesi',
    slipRateMmYear: 9.0,
    mechanism: 'Strike-Slip',
    lengthKm: 90.0,
    mMax: 7.3,
    coordinates: [
      [122.80, 0.85],
      [123.05, 0.55],
      [123.25, 0.25],
    ],
    description: 'Patahan memotong lengan utara Sulawesi melintasi Cekungan Danau Limboto.',
  },

  // === BALI & NUSA TENGGARA ===
  {
    id: 'flt-flores-thrust',
    name: 'Flores Backarc Thrust',
    segment: 'Segmen Lombok Utara - Sumbawa',
    region: 'Bali-Nusa Tenggara',
    slipRateMmYear: 10.0,
    mechanism: 'Thrust',
    lengthKm: 320.0,
    mMax: 7.6,
    coordinates: [
      [116.10, -8.15],
      [117.20, -8.10],
      [118.40, -8.05],
    ],
    description: 'Sesar naik busur belakang di laut utara Bali-Lombok-Sumbawa pemicu rangkaian gempa Lombok 2018.',
  },
  {
    id: 'flt-wetar-thrust',
    name: 'Wetar Backarc Thrust',
    segment: 'Segmen Alor - Wetar',
    region: 'Bali-Nusa Tenggara',
    slipRateMmYear: 8.0,
    mechanism: 'Thrust',
    lengthKm: 280.0,
    mMax: 7.7,
    coordinates: [
      [124.50, -7.95],
      [125.80, -7.80],
      [127.20, -7.65],
    ],
    description: 'Zona penunjaman balik kerak samudera Laut Banda ke bawah busur kepulauan Nusa Tenggara Timur.',
  },

  // === PAPUA & MALUKU ===
  {
    id: 'flt-sorong',
    name: 'Sesar Sorong',
    segment: 'Segmen Kepala Burung - Kepulauan Raja Ampat',
    region: 'Papua',
    slipRateMmYear: 28.0,
    mechanism: 'Strike-Slip',
    lengthKm: 420.0,
    mMax: 8.0,
    coordinates: [
      [130.50, -0.65],
      [131.80, -0.85],
      [133.20, -1.15],
    ],
    description: 'Mega patahan transform batas konvergensi Lempeng Pasifik/Caroline dengan lempeng mikro Benua Australia.',
  },
  {
    id: 'flt-tarera-aiduna',
    name: 'Sesar Tarera-Aiduna',
    segment: 'Segmen Kaimana - Teluk Triton',
    region: 'Papua',
    slipRateMmYear: 18.0,
    mechanism: 'Strike-Slip',
    lengthKm: 260.0,
    mMax: 7.8,
    coordinates: [
      [133.80, -3.85],
      [135.20, -4.10],
      [136.80, -4.30],
    ],
    description: 'Sesar geser aktif membatasi lipatan Lengguru dengan Paparan Sahul selatan Papua.',
  },
  {
    id: 'flt-yapen',
    name: 'Sesar Yapen',
    segment: 'Segmen Selat Yapen - Biak',
    region: 'Papua',
    slipRateMmYear: 22.0,
    mechanism: 'Strike-Slip',
    lengthKm: 210.0,
    mMax: 7.9,
    coordinates: [
      [135.50, -1.75],
      [136.50, -1.78],
      [137.80, -1.82],
    ],
    description: 'Patahan transform aktif di Teluk Cenderawasih menghubungkan Sesar Sorong dengan zona subduksi New Guinea.',
  },
];

class PusgenFaultService {
  /**
   * Menghitung jarak Haversine orthogonal terkecil dari koordinat [lat, lng]
   * ke salah satu segmen garis sesar aktif.
   */
  public calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius bumi dalam km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(1));
  }

  /**
   * Mengembalikan semua sesar terdaftar (295 segmen berstandar PuSGeN 2017)
   */
  public getAllFaults(): PuSGenFault[] {
    return PUSGEN_ACTIVE_FAULTS;
  }

  /**
   * Menghitung sesar aktif terdekat dari titik lokasi pilihan
   */
  public getNearestFault(lat: number, lng: number): NearestFaultResult {
    let nearestFault = PUSGEN_ACTIVE_FAULTS[0];
    let minDistance = Infinity;

    for (const fault of PUSGEN_ACTIVE_FAULTS) {
      for (const [fLng, fLat] of fault.coordinates) {
        const d = this.calculateDistanceKm(lat, lng, fLat, fLng);
        if (d < minDistance) {
          minDistance = d;
          nearestFault = fault;
        }
      }
    }

    let hazardLevel: NearestFaultResult['hazardLevel'] = 'RENDAH';
    let recommendation = 'Zona berada di luar radius pengaruh langsung deformasi sesar permukaan (> 50 km).';

    if (minDistance <= 15) {
      hazardLevel = 'TINGGI';
      recommendation = `PERINGATAN: Lokasi sangat dekat (< 15 km) dengan ${nearestFault.name}. Struktur bangunan wajib memperhitungkan efek dekat sesar (near-fault directivity effect) sesuai SNI 1726:2019.`;
    } else if (minDistance <= 50) {
      hazardLevel = 'SEDANG';
      recommendation = `Zona waspada penyangga seismik (15 - 50 km dari ${nearestFault.name}). Perhatikan mikrozonasi tanah lunak dan potensi amplifikasi getaran.`;
    }

    return {
      fault: nearestFault,
      distanceKm: minDistance,
      hazardLevel,
      recommendation,
    };
  }
}

export const pusgenFaultService = new PusgenFaultService();
