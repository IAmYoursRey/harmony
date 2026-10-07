// Layanan pemantauan aktivitas gunung api dan katalog geologi Indonesia
// Merujuk data Pusat Vulkanologi dan Mitigasi Bencana Geologi (PVMBG / MAGMA Indonesia) & Smithsonian GVP

export type VolcanoAlertLevel = 'Level IV (Awas)' | 'Level III (Siaga)' | 'Level II (Waspada)' | 'Level I (Normal)';

export interface VolcanoLiveStatus {
  id: string | number;
  name: string;
  lat: number;
  lng: number;
  elevation: number;
  level: VolcanoAlertLevel;
  levelCode: 1 | 2 | 3 | 4;
  province?: string;
  lastUpdate: string;
  visualSummary?: string;
  seismicitySummary?: string;
  dangerRadiusKm: number;
  source: string;
  operationalStatus: 'VERIFIED_LIVE_FEED' | 'UNVERIFIED_CATALOG_BASELINE';
  isGeologicallyActive: boolean;
}

// Data pemantauan status aktivitas gunung api aktif strategis di Indonesia
// Diselaraskan dengan data katalog MAGMA Indonesia / PVMBG
const ACTIVE_MONITORING_BASELINE: VolcanoLiveStatus[] = [
  {
    id: 'merapi',
    name: 'Gunung Merapi',
    lat: -7.5407,
    lng: 110.4457,
    elevation: 2968,
    level: 'Level III (Siaga)',
    levelCode: 3,
    province: 'DI Yogyakarta & Jawa Tengah',
    lastUpdate: 'Katalog Referensi Terdaftar (Perlu verifikasi buletin MAGMA/PVMBG)',
    visualSummary: 'Kubah lava aktif di barat daya dan tengah kawah. Teramati guguran lava pijar mengarah ke Kali Bebeng & Kali Krasak.',
    seismicitySummary: 'Gempa guguran harian tinggi, vulkanik dangkal terdeteksi.',
    dangerRadiusKm: 7.0,
    source: 'MAGMA Indonesia / PVMBG',
    operationalStatus: 'UNVERIFIED_CATALOG_BASELINE',
    isGeologicallyActive: true,
  },
  {
    id: 'semeru',
    name: 'Gunung Semeru',
    lat: -8.108,
    lng: 112.922,
    elevation: 3676,
    level: 'Level III (Siaga)',
    levelCode: 3,
    province: 'Jawa Timur',
    lastUpdate: 'Katalog Referensi Terdaftar (Perlu verifikasi buletin MAGMA/PVMBG)',
    visualSummary: 'Erupsi letusan abu berkala setinggi 500-1000m di atas puncak kawah Jonggring Saloko.',
    seismicitySummary: 'Gempa letusan dominan disertai gempa hembusan.',
    dangerRadiusKm: 13.0,
    source: 'MAGMA Indonesia / PVMBG',
    operationalStatus: 'UNVERIFIED_CATALOG_BASELINE',
    isGeologicallyActive: true,
  },
  {
    id: 'lewotobi',
    name: 'Gunung Lewotobi Laki-laki',
    lat: -8.538,
    lng: 122.768,
    elevation: 1584,
    level: 'Level IV (Awas)',
    levelCode: 4,
    province: 'Nusa Tenggara Timur',
    lastUpdate: 'Katalog Referensi Terdaftar (Perlu verifikasi buletin MAGMA/PVMBG)',
    visualSummary: 'Erupsi eksplosif dengan lontaran material pijar dan kolom abu tebal. Sektor bahaya diperluas.',
    seismicitySummary: 'Tremor menerus beramplitudo tinggi dan vulkanik dalam meningkat tajam.',
    dangerRadiusKm: 8.0,
    source: 'MAGMA Indonesia / PVMBG',
    operationalStatus: 'UNVERIFIED_CATALOG_BASELINE',
    isGeologicallyActive: true,
  },
  {
    id: 'marapi',
    name: 'Gunung Marapi',
    lat: -0.381,
    lng: 100.473,
    elevation: 2891,
    level: 'Level III (Siaga)',
    levelCode: 3,
    province: 'Sumatera Barat',
    lastUpdate: 'Katalog Referensi Terdaftar (Perlu verifikasi buletin MAGMA/PVMBG)',
    visualSummary: 'Kolom abu teramati kelabu tebal condong ke arah timur laut. Suara gemuruh sesekali terdengar.',
    seismicitySummary: 'Gempa letusan dan hembusan berfluktuasi.',
    dangerRadiusKm: 4.5,
    source: 'MAGMA Indonesia / PVMBG',
    operationalStatus: 'UNVERIFIED_CATALOG_BASELINE',
    isGeologicallyActive: true,
  },
  {
    id: 'ibu',
    name: 'Gunung Ibu',
    lat: 1.488,
    lng: 127.63,
    elevation: 1325,
    level: 'Level III (Siaga)',
    levelCode: 3,
    province: 'Maluku Utara',
    lastUpdate: 'Katalog Referensi Terdaftar (Perlu verifikasi buletin MAGMA/PVMBG)',
    visualSummary: 'Erupsi abu vulkanik berkala 1.000 - 3.000 m dari dasar kawah.',
    seismicitySummary: 'Aktivitas vulkanik tinggi dengan gempa letusan harian puluhan kali.',
    dangerRadiusKm: 5.0,
    source: 'MAGMA Indonesia / PVMBG',
    operationalStatus: 'UNVERIFIED_CATALOG_BASELINE',
    isGeologicallyActive: true,
  },
  {
    id: 'anak_krakatau',
    name: 'Gunung Anak Krakatau',
    lat: -6.102,
    lng: 105.423,
    elevation: 157,
    level: 'Level III (Siaga)',
    levelCode: 3,
    province: 'Lampung (Selat Sunda)',
    lastUpdate: 'Katalog Referensi Terdaftar (Perlu verifikasi buletin MAGMA/PVMBG)',
    visualSummary: 'Asap kawah bertekanan lemah hingga sedang teramati putih tipis. Pemantauan seismik dan visual aktif.',
    seismicitySummary: 'Gempa tremor mikro dan hembusan tercatat pada seismograf Sertung.',
    dangerRadiusKm: 5.0,
    source: 'MAGMA Indonesia / PVMBG',
    operationalStatus: 'UNVERIFIED_CATALOG_BASELINE',
    isGeologicallyActive: true,
  },
  {
    id: 'ruang',
    name: 'Gunung Ruang',
    lat: 2.304,
    lng: 125.367,
    elevation: 725,
    level: 'Level II (Waspada)',
    levelCode: 2,
    province: 'Sulawesi Utara',
    lastUpdate: 'Katalog Referensi Terdaftar (Perlu verifikasi buletin MAGMA/PVMBG)',
    visualSummary: 'Kondisi pasca erupsi paroksismal membaik secara signifikan. Asap putih tipis dari rekahan kawah.',
    seismicitySummary: 'Penurunan drastis energi seismik, kegempaan relatif tenang.',
    dangerRadiusKm: 2.0,
    source: 'MAGMA Indonesia / PVMBG',
    operationalStatus: 'UNVERIFIED_CATALOG_BASELINE',
    isGeologicallyActive: true,
  },
  {
    id: 'sinabung',
    name: 'Gunung Sinabung',
    lat: 3.17,
    lng: 98.392,
    elevation: 2460,
    level: 'Level II (Waspada)',
    levelCode: 2,
    province: 'Sumatera Utara',
    lastUpdate: 'Katalog Referensi Terdaftar (Perlu verifikasi buletin MAGMA/PVMBG)',
    visualSummary: 'Asap kawah bertekanan lemah berwarna putih teramati dengan intensitas tipis hingga sedang.',
    seismicitySummary: 'Didominasi gempa hembusan dan tektonik jauh.',
    dangerRadiusKm: 3.0,
    source: 'MAGMA Indonesia / PVMBG',
    operationalStatus: 'UNVERIFIED_CATALOG_BASELINE',
    isGeologicallyActive: true,
  },
  {
    id: 'kerinci',
    name: 'Gunung Kerinci',
    lat: -1.697,
    lng: 101.264,
    elevation: 3805,
    level: 'Level II (Waspada)',
    levelCode: 2,
    province: 'Jambi & Sumatera Barat',
    lastUpdate: 'Katalog Referensi Terdaftar (Perlu verifikasi buletin MAGMA/PVMBG)',
    visualSummary: 'Asap kawah bertekanan sedang warna putih-kelabu membumbung 200m di atas puncak.',
    seismicitySummary: 'Gempa hembusan dan tremor menerus amplitudo rendah.',
    dangerRadiusKm: 3.0,
    source: 'MAGMA Indonesia / PVMBG',
    operationalStatus: 'UNVERIFIED_CATALOG_BASELINE',
    isGeologicallyActive: true,
  },
  {
    id: 'bromo',
    name: 'Gunung Bromo',
    lat: -7.942,
    lng: 112.953,
    elevation: 2329,
    level: 'Level II (Waspada)',
    levelCode: 2,
    province: 'Jawa Timur',
    lastUpdate: 'Katalog Referensi Terdaftar (Perlu verifikasi buletin MAGMA/PVMBG)',
    visualSummary: 'Hembusan asap kawah putih tebal disertai bau belerang terasa di bibir kawah.',
    seismicitySummary: 'Tremor menerus konstan mencirikan fluida gas aktif.',
    dangerRadiusKm: 1.0,
    source: 'MAGMA Indonesia / PVMBG',
    operationalStatus: 'UNVERIFIED_CATALOG_BASELINE',
    isGeologicallyActive: true,
  },
  {
    id: 'ijen',
    name: 'Gunung Ijen',
    lat: -8.058,
    lng: 114.242,
    elevation: 2769,
    level: 'Level I (Normal)',
    levelCode: 1,
    province: 'Jawa Timur',
    lastUpdate: 'Katalog Referensi Terdaftar (Perlu verifikasi buletin MAGMA/PVMBG)',
    visualSummary: 'Warna air danau kawah hijau toska. Blue fire aktif dalam kondisi normal.',
    seismicitySummary: 'Kegempaan vulkanik dalam batas normal.',
    dangerRadiusKm: 0.5,
    source: 'MAGMA Indonesia / PVMBG',
    operationalStatus: 'UNVERIFIED_CATALOG_BASELINE',
    isGeologicallyActive: true,
  },
  {
    id: 'agung',
    name: 'Gunung Agung',
    lat: -8.343,
    lng: 115.508,
    elevation: 3142,
    level: 'Level I (Normal)',
    levelCode: 1,
    province: 'Bali',
    lastUpdate: 'Katalog Referensi Terdaftar (Perlu verifikasi buletin MAGMA/PVMBG)',
    visualSummary: 'Kawah tenang, tidak ada hembusan asap solfatara signifikan.',
    seismicitySummary: 'Aktivitas seismik stabil pada level dasar.',
    dangerRadiusKm: 0.5,
    source: 'MAGMA Indonesia / PVMBG',
    operationalStatus: 'UNVERIFIED_CATALOG_BASELINE',
    isGeologicallyActive: true,
  },
  {
    id: 'rinjani',
    name: 'Gunung Rinjani',
    lat: -8.411,
    lng: 116.457,
    elevation: 3726,
    level: 'Level II (Waspada)',
    levelCode: 2,
    province: 'Nusa Tenggara Barat',
    lastUpdate: 'Katalog Referensi Terdaftar (Perlu verifikasi buletin MAGMA/PVMBG)',
    visualSummary: 'Anak gunung api Barujari di kaldera Segara Anak dalam kondisi stabil waspada.',
    seismicitySummary: 'Fluktuasi gempa hembusan minor.',
    dangerRadiusKm: 1.5,
    source: 'MAGMA Indonesia / PVMBG',
    operationalStatus: 'UNVERIFIED_CATALOG_BASELINE',
    isGeologicallyActive: true,
  }
];

class VolcanoService {
  private cache: Map<string, VolcanoLiveStatus> = new Map();

  constructor() {
    ACTIVE_MONITORING_BASELINE.forEach(v => {
      this.cache.set(this.normalizeName(v.name), v);
    });
  }

  private normalizeName(name: string): string {
    return name.toLowerCase().replace(/^(gunung|gn\.?|g\.)\s*/i, '').trim();
  }

  public getVolcanoStatus(name: string): VolcanoLiveStatus | null {
    const key = this.normalizeName(name);
    return this.cache.get(key) || null;
  }

  public async fetchEnrichedVolcanoes(rawMountains: any[]): Promise<any[]> {
    return rawMountains.map((m) => {
      if (m.type !== 'volcano') return m;
      const matched = this.getVolcanoStatus(m.name);
      if (matched) {
        return {
          ...m,
          status: matched.levelCode >= 2 ? 'Active (Peringatan)' : 'Normal (Geologis Aktif)',
          isGeologicallyActive: true,
          alertLevel: matched.level,
          alertLevelCode: matched.levelCode,
          dangerRadiusKm: matched.dangerRadiusKm,
          visualSummary: matched.visualSummary,
          seismicitySummary: matched.seismicitySummary,
          lastMonitorUpdate: matched.lastUpdate,
          monitoringSource: `${matched.source} (Katalog terdaftar; belum tersambung telemetri buletin daring)`,
          operationalStatus: 'UNVERIFIED_CATALOG_BASELINE',
        };
      }
      return m;
    });
  }

  public getAllMonitoredVolcanoes(): VolcanoLiveStatus[] {
    return Array.from(this.cache.values());
  }
}

export const volcanoService = new VolcanoService();
