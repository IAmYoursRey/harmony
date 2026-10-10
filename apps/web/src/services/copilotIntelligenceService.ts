import { gnssElevationService, GnssElevationReport } from './geospatial/gnssElevationService';

export interface CopilotNavigationAction {
  label: string;
  path: string;
  event?: { name: string; detail?: any };
  icon: string;
}

export interface CopilotDirectAnswer {
  handled: boolean;
  text: string;
  action?: CopilotNavigationAction;
}

export const INDONESIAN_MONITORED_CITIES = [
  { name: 'Jakarta', lat: -6.2088, lng: 106.8456, province: 'DKI Jakarta' },
  { name: 'Bogor', lat: -6.5971, lng: 106.8060, province: 'Jawa Barat' },
  { name: 'Bandung', lat: -6.9175, lng: 107.6191, province: 'Jawa Barat' },
  { name: 'Semarang', lat: -6.9667, lng: 110.4167, province: 'Jawa Tengah' },
  { name: 'Yogyakarta', lat: -7.7956, lng: 110.3695, province: 'D.I. Yogyakarta' },
  { name: 'Surabaya', lat: -7.2575, lng: 112.7521, province: 'Jawa Timur' },
  { name: 'Denpasar', lat: -8.6705, lng: 115.2126, province: 'Bali' },
  { name: 'Medan', lat: 3.5952, lng: 98.6722, province: 'Sumatra Utara' },
  { name: 'Padang', lat: -0.9471, lng: 100.4172, province: 'Sumatra Barat' },
  { name: 'Palembang', lat: -2.9761, lng: 104.7754, province: 'Sumatra Selatan' },
  { name: 'Pontianak', lat: -0.0263, lng: 109.3425, province: 'Kalimantan Barat' },
  { name: 'Balikpapan', lat: -1.2379, lng: 116.8289, province: 'Kalimantan Timur' },
  { name: 'Makassar', lat: -5.1477, lng: 119.4327, province: 'Sulawesi Selatan' },
  { name: 'Manado', lat: 1.4748, lng: 124.8421, province: 'Sulawesi Utara' },
  { name: 'Jayapura', lat: -2.5337, lng: 140.7181, province: 'Papua' },
];

export function decodeWmoWeather(code: number): string {
  if (code === 0) return 'Cerah';
  if (code === 1 || code === 2) return 'Cerah Berawan';
  if (code === 3) return 'Berawan Tebal';
  if (code === 45 || code === 48) return 'Berkabut';
  if (code >= 51 && code <= 55) return 'Gerimis Ringan';
  if (code === 61) return 'Hujan Ringan';
  if (code === 63) return 'Hujan Sedang';
  if (code === 65) return 'Hujan Lebat';
  if (code >= 80 && code <= 82) return 'Hujan Lokal';
  if (code >= 95) return 'Hujan Disertai Petir';
  return 'Berawan';
}

function isRainCondition(code: number, precip: number | null): boolean {
  if (precip != null && precip > 0.05) return true;
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 99);
}

/**
 * Registry Arsitektur Resmi Seluruh Fitur Platform Harmony
 */
export const HARMONY_ARCHITECTURE_REGISTRY = {
  maps: {
    name: 'Harmony Maps',
    path: '/app/maps',
    keywords: [
      'peta', 'map', 'gis', 'gempa', 'gunung', 'hotspot', 'karhutla', 'cctv',
      'lampu lalu lintas', 'traffic signals', 'elevasi', 'altimeter', 'rute evakuasi',
      'isochrone', 'tsunami', 'banjir', 'pantau'
    ],
    description: 'Peta GIS interaktif 2D/3D (Gempa BMKG, 68 Gunung Berapi PVMBG, Karhutla NASA/BRIN, Radar Cuaca, 700+ CCTV jalan/tol, Lampu Lalu Lintas ATCS, dan Altimeter GNSS SRTM).'
  },
  weather: {
    name: 'Intelijen Cuaca & NWP',
    path: '/app/maps?open=weather',
    keywords: [
      'cuaca', 'weather', 'hujan', 'angin', 'suhu', 'iklim', 'radar cuaca',
      'nwp', 'kelembapan', 'awannya', 'pancaroba', 'atmosfer'
    ],
    description: 'Pemantauan cuaca real-time, perbandingan 5 model NWP (ECMWF, GFS, ICON, JMA, BMKG), radar hujan, angin, dan kualitas udara.'
  },
  geospatial: {
    name: 'Geospatial Studio',
    path: '/app/geospatial',
    keywords: ['geospatial', 'studio', 'satelit', 'sentinel', 'landsat', 'ndvi', 'ndwi', 'citra satelit', 'spektral', 'aoi'],
    description: 'Eksplorasi citra satelit STAC Sentinel-2 & Landsat, kalkulasi indeks vegetasi (NDVI, NDWI), dan analisis poligon spasial.'
  },
  digitalTwin: {
    name: 'Harmony Digital Twin',
    path: '/app/digital-twin',
    keywords: ['digital twin', 'twin', '3d gedung', 'simulasi gempa 3d', 'pga', 'guncangan gempa', 'skenario 3d'],
    description: 'Simulasi 3D physics-based skenario gempa bumi (PGA/MMI), perambatan tsunami, dan visualisasi evakuasi sekolah.'
  },
  aiLearning: {
    name: 'AI Learning',
    path: '/app/ai-learning',
    keywords: ['ai learning', 'belajar ai', 'pembelajaran ai', 'materi bencana', 'edukasi ai'],
    description: 'Modul pembelajaran mitigasi bencana bertenaga AI dengan penyesuaian kurikulum dan materi interaktif.'
  },
  simulation: {
    name: 'Simulasi Soal Kebencanaan',
    path: '/app/simulation',
    keywords: ['simulasi', 'soal', 'kuis', 'quiz', 'ujian', 'evaluasi esai', 'pertanyaan bencana'],
    description: 'Generator kuis kebencanaan adaptif AI dan sistem penilaian esai otomatis berdasarkan profil risiko sekolah.'
  },
  studentGame: {
    name: 'Game Edukasi Siswa',
    path: '/app/student-game',
    keywords: ['game', 'game edukasi', 'multiplayer', 'room game', 'main bareng', 'permainan'],
    description: 'Game kuis mitigasi bencana interaktif multiplayer real-time berbasis Socket.IO untuk siswa.'
  },
  gss: {
    name: 'Harmony Score (GSS) & Ketahanan Sekolah',
    path: '/app/gss',
    keywords: ['gss', 'harmony score', 'skor ketahanan', 'resilience', 'ketahanan sekolah', 'indikator risiko'],
    description: 'Instrumen penilaian ketahanan bencana sekolah terstandar BNPB dan UNESCO.'
  },
  dashboard: {
    name: 'Dashboard Utama & Guru',
    path: '/app/dashboard',
    keywords: ['dashboard', 'beranda', 'guru', 'teacher', 'analitik', 'kelas', 'manajemen sesi'],
    description: 'Pusat pemantauan analitik kesiapsiagaan sekolah, partisipasi kuis, dan ringkasan risiko.'
  },
  events: {
    name: 'Events & Lomba Mitigasi',
    path: '/app/events',
    keywords: ['event', 'events', 'lomba', 'acara', 'webinar', 'simulasi akbar', 'kompetisi'],
    description: 'Kalender agenda simulasi kebencanaan, workshop mitigasi, dan kompetisi ketahanan sekolah.'
  },
  survey: {
    name: 'Survey Analytics',
    path: '/app/survey',
    keywords: ['survei', 'survey', 'kuesioner', 'angket'],
    description: 'Pengumpulan data survei kesiapsiagaan warga sekolah dan visualisasi analitik respons.'
  },
};

/**
 * Daftar fitur yang secara eksplisit BELUM ADA di platform Harmony
 */
const UNAVAILABLE_FEATURE_TRIGGERS = [
  'tiket', 'beli tiket', 'pesawat', 'kereta', 'hotel', 'booking',
  'e-toll', 'bayar tol', 'top up', 'isi saldo', 'pulsa',
  'belanja', 'e-commerce', 'toko', 'jual beli', 'marketplace',
  'spotify', 'musik', 'lagu', 'mp3', 'audio streaming', 'video musik',
  'ojol', 'ojek online', 'gofood', 'grab', 'pesan makanan',
  'transfer bank', 'rekening', 'pinjaman', 'crypto', 'bitcoin',
  'drone fisik', 'remote drone', 'terbangkan drone', 'kamera drone pribadi',
  'ramalan', 'zodiak', 'hantu', 'horoskop', 'tarot',
  'prediksi 1 tahun', 'prediksi 5 tahun', 'prediksi 10 tahun'
];

export class CopilotIntelligenceService {
  private rainCache: { data: any; timestamp: number } | null = null;
  private weatherCache = new Map<string, { data: any; timestamp: number }>();

  /**
   * Cek apakah pertanyaan pengguna menanyakan fitur yang BELUM ADA di Harmony
   */
  public checkUnavailableFeature(query: string): boolean {
    const q = query.toLowerCase();
    return UNAVAILABLE_FEATURE_TRIGGERS.some(trigger => q.includes(trigger));
  }

  /**
   * Cek apakah pertanyaan pengguna menanyakan daftar atau seluruh fitur Harmony
   */
  public isAskingAllFeatures(query: string): boolean {
    const q = query.toLowerCase();
    return (
      q.includes('apa saja fiturnya') ||
      q.includes('fitur apa saja') ||
      q.includes('fitur apa aja') ||
      q.includes('menu apa saja') ||
      q.includes('menu apa aja') ||
      q.includes('ada fitur apa') ||
      q.includes('jelaskan semua fitur') ||
      q.includes('panduan fitur') ||
      q.includes('arsitektur fitur') ||
      q === 'fitur' ||
      q === 'menu'
    );
  }

  /**
   * Cek apakah pertanyaan mengenai daerah yang hujan
   */
  public isRainRegionsQuery(query: string): boolean {
    const q = query.toLowerCase();
    return (
      (q.includes('daerah') && q.includes('hujan')) ||
      (q.includes('wilayah') && q.includes('hujan')) ||
      (q.includes('kota') && q.includes('hujan')) ||
      (q.includes('mana') && q.includes('hujan')) ||
      q.includes('hujan di mana') ||
      q.includes('hujan dimana') ||
      q.includes('ada yang hujan') ||
      q.includes('lagi hujan di')
    );
  }

  /**
   * Cek apakah pertanyaan menanyakan kondisi cuaca saat ini / hari ini
   */
  public isCurrentWeatherQuery(query: string): boolean {
    const q = query.toLowerCase();
    return (
      q.includes('cuaca hari ini') ||
      q.includes('cuaca sekarang') ||
      q.includes('cuaca saat ini') ||
      q.includes('gimana cuaca') ||
      q.includes('bagaimana cuaca') ||
      q.includes('kondisi cuaca') ||
      q.includes('suhu hari ini') ||
      q.includes('suhu sekarang') ||
      q.includes('apakah hari ini hujan') ||
      q.includes('prediksi cuaca hari ini') ||
      (q.startsWith('cuaca') && q.length < 25)
    );
  }

  /**
   * Cek apakah pertanyaan menanyakan lokasi dan elevasi/ketinggian
   */
  public isLocationElevationQuery(query: string): boolean {
    const q = query.toLowerCase();
    return (
      (q.includes('lokasi') && q.includes('ketinggian')) ||
      (q.includes('lokasi') && q.includes('elevasi')) ||
      (q.includes('posisi') && q.includes('ketinggian')) ||
      (q.includes('posisi') && q.includes('elevasi')) ||
      q.includes('dimana lokasi saya') ||
      q.includes('dimana posisi saya') ||
      q.includes('berapa ketinggian saya') ||
      q.includes('ketinggian lokasi saya') ||
      q.includes('elevasi saya') ||
      q.includes('altitude saya')
    );
  }

  /**
   * Monitor kondisi hujan real-time di seluruh kota strategis Indonesia
   */
  public async fetchIndonesianRainStatus(): Promise<{ text: string; action: CopilotNavigationAction }> {
    if (this.rainCache && Date.now() - this.rainCache.timestamp < 3 * 60 * 1000) {
      return this.rainCache.data;
    }

    try {
      const lats = INDONESIAN_MONITORED_CITIES.map(c => c.lat).join(',');
      const lngs = INDONESIAN_MONITORED_CITIES.map(c => c.lng).join(',');
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&timezone=auto`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const rainingCities: Array<{ name: string; province: string; desc: string; precip: number; temp: number }> = [];
      const dryCities: Array<{ name: string; desc: string; temp: number }> = [];

      if (Array.isArray(data)) {
        data.forEach((item, idx) => {
          const city = INDONESIAN_MONITORED_CITIES[idx];
          const cur = item.current;
          const precip = Number(cur?.precipitation) || 0;
          const code = Number(cur?.weather_code) || 0;
          const temp = Math.round(Number(cur?.temperature_2m) || 28);
          const desc = decodeWmoWeather(code);

          if (isRainCondition(code, precip)) {
            rainingCities.push({ name: city.name, province: city.province, desc, precip, temp });
          } else {
            dryCities.push({ name: city.name, desc, temp });
          }
        });
      }

      let text = '';
      if (rainingCities.length > 0) {
        text = `🌧️ **Wilayah Terpantau Hujan Saat Ini**:\n` +
          rainingCities.map(c => `• **${c.name}** (${c.province}): ${c.desc} ${c.precip > 0 ? `(${c.precip} mm)` : ''}, ${c.temp}°C`).join('\n') +
          `\n\nKota utama lainnya (${dryCities.slice(0, 4).map(d => d.name).join(', ')}) terpantau berawan hingga cerah. Pantau sebaran awan hujan di radar cuaca.`;
      } else {
        text = `⛅ **Kondisi Hujan Terkini di Indonesia**:\nSaat ini sebagian besar kota utama (${dryCities.slice(0, 5).map(d => d.name).join(', ')}) terpantau **cerah hingga berawan** tanpa curah hujan signifikan (0.0 mm). Pantau radar awan hujan selengkapnya di panel cuaca.`;
      }

      const result = {
        text,
        action: {
          label: 'Buka Panel Cuaca & Radar ⛅',
          path: '/app/maps?open=weather',
          event: { name: 'harmony:open-weather', detail: { domain: 'weather' } },
          icon: '⛅',
        },
      };

      this.rainCache = { data: result, timestamp: Date.now() };
      return result;
    } catch {
      return {
        text: '⛅ Pantauan radar cuaca nasional aktif di Harmony Maps. Buka panel cuaca untuk melihat peta sebaran awan dan curah hujan satelit real-time.',
        action: {
          label: 'Buka Panel Cuaca & Radar ⛅',
          path: '/app/maps?open=weather',
          event: { name: 'harmony:open-weather', detail: { domain: 'weather' } },
          icon: '⛅',
        },
      };
    }
  }

  /**
   * Ambil cuaca kota tertentu atau lokasi saat ini
   */
  public async fetchCurrentWeather(query: string): Promise<{ text: string; action: CopilotNavigationAction }> {
    const q = query.toLowerCase();
    let target = INDONESIAN_MONITORED_CITIES.find(c => q.includes(c.name.toLowerCase()));
    if (!target) {
      target = INDONESIAN_MONITORED_CITIES[0]; // Default Jakarta / Metropolitan
    }

    const cacheKey = target.name;
    const cached = this.weatherCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 3 * 60 * 1000) {
      return cached.data;
    }

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${target.lat}&longitude=${target.lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=auto`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const cur = json.current;

      const temp = Math.round(Number(cur?.temperature_2m) || 29);
      const appTemp = Math.round(Number(cur?.apparent_temperature) || temp);
      const humidity = Math.round(Number(cur?.relative_humidity_2m) || 75);
      const wind = Math.round(Number(cur?.wind_speed_10m) || 12);
      const precip = Number(cur?.precipitation) || 0;
      const code = Number(cur?.weather_code) || 1;
      const condition = decodeWmoWeather(code);

      const text = `⛅ **Cuaca Hari Ini (${target.name}, ${target.province})**:\n` +
        `• Suhu: **${temp}°C** (Terasa ${appTemp}°C)\n` +
        `• Kondisi: **${condition}**\n` +
        `• Kelembapan: **${humidity}%** | Angin: **${wind} km/j**\n` +
        `• Curah Hujan: **${precip > 0 ? `${precip} mm` : '0 mm (Kering)'}**\n\n` +
        `Panel cuaca telah disiapkan untuk melihat grafik per jam dan konsensus model NWP.`;

      const result = {
        text,
        action: {
          label: `Buka Panel Cuaca (${target.name}) ⛅`,
          path: '/app/maps?open=weather',
          event: { name: 'harmony:open-weather', detail: { domain: 'weather' } },
          icon: '⛅',
        },
      };

      this.weatherCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch {
      return {
        text: `⛅ **Info Cuaca**: Pantauan cuaca ${target.name} dan sekitarnya dapat dilihat secara visual di Panel Cuaca Harmony Maps lengkap dengan suhu, arah angin, dan radar awan.`,
        action: {
          label: 'Buka Panel Cuaca ⛅',
          path: '/app/maps?open=weather',
          event: { name: 'harmony:open-weather', detail: { domain: 'weather' } },
          icon: '⛅',
        },
      };
    }
  }

  /**
   * Tangani permintaan lokasi dan elevasi pengguna dengan GPS Geolocation + DEM SRTM
   */
  public async handleLocationAndElevation(): Promise<{ text: string; action: CopilotNavigationAction }> {
    try {
      const report: GnssElevationReport = await gnssElevationService.measureElevationAndPosition();
      const latStr = report.lat.toFixed(5);
      const lngStr = report.lng.toFixed(5);
      const altStr = `${report.altitudeM >= 0 ? `+${report.altitudeM}` : report.altitudeM} mdpl`;

      const text = `📍 **Lokasi & Ketinggian Anda**:\n` +
        `• **Koordinat**: ${report.dmsDisplay} (${latStr}°, ${lngStr}°)\n` +
        `• **Ketinggian**: **${altStr}** (${report.topographyZone})\n` +
        `• **Tekanan Udara**: ${report.estimatedBarometricPressureHpa} hPa | Didih Air: ${report.estimatedBoilingPointC}°C\n` +
        `• **Akurasi GPS**: ±${report.accuracyM} meter\n\n` +
        `Titik koordinat dan profil elevasi Anda langsung dipusatkan di Harmony Maps!`;

      return {
        text,
        action: {
          label: 'Pusatkan Lokasi di Peta 📍',
          path: '/app/maps?locate=true',
          event: {
            name: 'harmony:locate-user',
            detail: { lat: report.lat, lng: report.lng, report },
          },
          icon: '📍',
        },
      };
    } catch (err: any) {
      return {
        text: `📍 **Permintaan Akses Lokasi**:\n${err.message || 'Mohon izinkan akses lokasi di peramban Anda agar AI dapat mengukur posisi koordinat dan elevasi (ketinggian mdpl) Anda secara presisi.'}\n\nAnda juga dapat membuka menu Harmony Maps untuk mengaktifkan pelacak GPS.`,
        action: {
          label: 'Buka Harmony Maps & GPS 🗺️',
          path: '/app/maps',
          icon: '🗺️',
        },
      };
    }
  }

  /**
   * Ringkasan seluruh arsitektur fitur Harmony yang simpel dan padat
   */
  public getAllFeaturesSummary(): { text: string; action: CopilotNavigationAction } {
    const text = `🏛️ **Arsitektur Fitur Platform Harmony**:\n` +
      `1. 🗺️ **Harmony Maps**: Pantau gempa BMKG, 68 gunung api PVMBG, karhutla NASA, radar cuaca, 700+ CCTV jalan/tol, lampu lalu lintas ATCS, & elevasi GPS.\n` +
      `2. ⛅ **Intelijen Cuaca**: Radar awan hujan real-time & konsensus 5 model NWP atmosfer.\n` +
      `3. 🛰️ **Geospatial Studio**: Citra satelit Sentinel-2/Landsat & indeks vegetasi NDVI.\n` +
      `4. 📦 **Digital Twin 3D**: Simulasi fisika skenario gempa bumi, tsunami, & evakuasi sekolah.\n` +
      `5. ⚡ **AI Learning & Simulasi**: Kuis mitigasi bencana adaptif & penilaian esai otomatis.\n` +
      `6. 🎮 **Game Edukasi**: Game multiplayer kuis mitigasi real-time untuk siswa.\n` +
      `7. 🛡️ **Harmony Score (GSS)**: Penilaian ketahanan bencana sekolah standar BNPB/UNESCO.\n` +
      `8. 🏆 **Events & Lomba**: Agenda simulasi kebencanaan dan kompetisi sekolah.\n\n` +
      `Ketik 'buka [nama fitur]' untuk langsung berpindah ke menu yang Anda tuju!`;

    return {
      text,
      action: {
        label: 'Jelajahi Harmony Maps 🗺️',
        path: '/app/maps',
        icon: '🗺️',
      },
    };
  }

  /**
   * Pesan standar jika fitur belum tersedia
   */
  public getUnavailableFeatureResponse(): { text: string } {
    return {
      text: 'Fitur tersebut saat ini belum tersedia di Harmony dan masih dalam tahap pengembangan. Kami akan segera menambahkan fitur tersebut pada pembaruan mendatang! 🚀',
    };
  }
}

export const copilotIntelligenceService = new CopilotIntelligenceService();
