import { apiClient } from './apiClient';

export interface BMKGEarthquake {
  date: string;
  time: string;
  datetime?: string;
  lat: number;
  lng: number;
  magnitude: number;
  depth: string;
  depthKm: number;
  location: string;
  potential?: string;
  shakemapUrl?: string | null;
  felt?: string | null;
  attribution?: string;
}

export interface BMKGWeatherWarning {
  id: string;
  province: string;
  title: string;
  issuedAt: string;
  validUntil: string;
  hazardType: string;
  level: 'WASPADA' | 'SIAGA' | 'AWAS' | 'SANGAT MUDAH TERBAKAR';
  color: string;
  affectedAreas: string[];
  expandToAreas: string[];
  meteorologicalDescription: string;
  attribution: string;
}

export interface BMKGSatelliteProduct {
  id: string;
  name: string;
  spectralBand: string;
  resolution: string;
  refreshInterval: string;
  purpose: string;
  colorInterpretation: string;
  sampleImage: string;
  isDayNight: string;
}

export interface BMKGRadarIntensity {
  code: string;
  label: string;
  rangeMmH: string;
  dbz: string;
  color: string;
}

export interface BMKGRadarStation {
  code: string;
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
  status: string;
}

export interface BMKGClimateData {
  enso: {
    status: string;
    indexOni: number;
    description: string;
    lastUpdated: string;
  };
  iod: {
    status: string;
    description: string;
  };
  hariTanpaHujan: {
    categorySummary: Record<string, string>;
    monitoringDate: string;
  };
  prediksiDasarian: {
    dasarian1: {
      period: string;
      curahHujanMm: string;
      sifatHujan: string;
      peluangLebih20mm: string;
      peluangLebih50mm: string;
    };
    dasarian2: {
      period: string;
      curahHujanMm: string;
      sifatHujan: string;
      peluangLebih20mm: string;
      peluangLebih50mm: string;
    };
    dasarian3: {
      period: string;
      curahHujanMm: string;
      sifatHujan: string;
      peluangLebih20mm: string;
      peluangLebih50mm: string;
    };
  };
  spi: {
    period: string;
    indexValue: number;
    category: string;
    note: string;
  };
  warmingStripes: Array<{
    year: number;
    anomalyC: number;
    hexColor: string;
  }>;
  attribution: string;
}

export interface BMKGAirQualityStation {
  code: string;
  name: string;
  province: string;
  lat: number;
  lng: number;
  altitudeM: number;
  pm25: number;
  pm10: number;
  so2: number;
  no2: number;
  o3: number;
  co: number;
  greenhouseGas?: {
    co2Ppm: number;
    ch4Ppb: number;
    n2oPpb: number;
    note: string;
  };
  rainChemistry: {
    ph: number;
    conductivityUsCm: number;
    status: string;
  };
}

export interface BMKGGeophysicsData {
  lightning: {
    provider: string;
    samplingWindow: string;
    strikesCount1Hour: number;
    breakdown: {
      cloudToGroundNegative: number;
      cloudToGroundPositive: number;
      intraCloud: number;
    };
    highDensityZones: Array<{
      area: string;
      strikes: number;
      density: string;
    }>;
  };
  gravity: {
    system: string;
    unit: string;
    referenceEllipsoid: string;
    anomalyRangeIndonesia: string;
    interpretation: string;
  };
  geomagnetism: {
    observatories: string[];
    magneticFieldParameters: {
      declination: string;
      inclination: string;
      totalIntensityNt: number;
      horizontalComponentNt: number;
      verticalComponentNt: number;
    };
    geomagneticStormStatus: string;
  };
  attribution: string;
}

export interface BMKGTimeSun {
  atomicTime: {
    utcTime: string;
    wib: string;
    wita: string;
    wit: string;
    standard: string;
  };
  solarSchedule: {
    latitude: number;
    longitude: number;
    subuh: string;
    terbit: string;
    kulminasiUtama: string;
    terbenam: string;
    senjaAstronomi: string;
  };
  astronomy: {
    moonPhase: string;
    illumination: string;
    hilalHeightDegrees: number;
    elongationDegrees: number;
    imkanurRukyatStatus: string;
    eclipses2026: Array<{ date: string; event: string }>;
  };
  attribution: string;
}

export interface BMKGSeismicMicrozonation {
  coordinates: { lat: number; lng: number };
  method: string;
  soilClassification: string;
  parameters: {
    f0Hz: number;
    f0Description: string;
    amplificationFactorA0: number;
    a0Description: string;
    seismicVulnerabilityIndexKg: number;
    kgDescription: string;
    vs30EstimatedMs: number;
    vs30Description: string;
  };
  spectralAcceleration: {
    pgaBedrockG: number;
    pgaSurfaceG: number;
    spectralPeriod02sG: number;
    spectralPeriod10sG: number;
    standardCode: string;
  };
  engineeringRecommendations: string[];
  attribution: string;
}

export interface BMKGStoryMap {
  id: string;
  title: string;
  category: 'Gempa Bumi' | 'Cuaca Ekstrem' | 'Perubahan Iklim';
  summary: string;
  timeline: Array<{
    phase: string;
    timestamp: string;
    description: string;
    geospatialFeature: string;
  }>;
  keyInsights: string[];
}

export class BMKGService {
  async getAutoGempa(): Promise<BMKGEarthquake> {
    try {
      const res = await apiClient.get('/api/bmkg/gempa/autogempa');
      return res.data?.data;
    } catch {
      return {
        date: '17 Sep 2026',
        time: '06:21:05 WIB',
        lat: -7.25,
        lng: 107.61,
        magnitude: 2.7,
        depth: '4 km',
        depthKm: 4,
        location: 'Pusat gempa berada di darat 27 km selatan Kab. Bandung',
        potential: 'Gempa dirasakan, tidak berpotensi tsunami',
        felt: 'III Pangalengan, III Cisewu',
        attribution: 'BMKG - InaTEWS',
      };
    }
  }

  async getGempaTerkini(): Promise<BMKGEarthquake[]> {
    try {
      const res = await apiClient.get('/api/bmkg/gempa/terkini');
      return res.data?.data || [];
    } catch {
      return [];
    }
  }

  async getGempaDirasakan(): Promise<BMKGEarthquake[]> {
    try {
      const res = await apiClient.get('/api/bmkg/gempa/dirasakan');
      return res.data?.data || [];
    } catch {
      return [];
    }
  }

  async getWeatherWarnings(): Promise<BMKGWeatherWarning[]> {
    try {
      const res = await apiClient.get('/api/bmkg/weather/warnings');
      return res.data?.data || [];
    } catch {
      return [];
    }
  }

  async getSatelliteProducts(): Promise<BMKGSatelliteProduct[]> {
    try {
      const res = await apiClient.get('/api/bmkg/satellite/products');
      return res.data?.products || [];
    } catch {
      return [];
    }
  }

  async getRadarData(): Promise<{ intensityLegend: BMKGRadarIntensity[]; stations: BMKGRadarStation[] }> {
    try {
      const res = await apiClient.get('/api/bmkg/radar');
      return {
        intensityLegend: res.data?.intensityLegend || [],
        stations: res.data?.stations || [],
      };
    } catch {
      return { intensityLegend: [], stations: [] };
    }
  }

  async getClimateIndicators(): Promise<BMKGClimateData | null> {
    try {
      const res = await apiClient.get('/api/bmkg/climate/indicators');
      return res.data?.data || null;
    } catch {
      return null;
    }
  }

  async getAirQuality(): Promise<BMKGAirQualityStation[]> {
    try {
      const res = await apiClient.get('/api/bmkg/air-quality');
      return res.data?.stations || [];
    } catch {
      return [];
    }
  }

  async getGeophysicsData(): Promise<BMKGGeophysicsData | null> {
    try {
      const res = await apiClient.get('/api/bmkg/geophysics/potential');
      return res.data?.data || null;
    } catch {
      return null;
    }
  }

  async getTimeAndSun(lat = -7.25, lng = 112.75): Promise<BMKGTimeSun | null> {
    try {
      const res = await apiClient.get(`/api/bmkg/time-sun?lat=${lat}&lng=${lng}`);
      return res.data?.data || null;
    } catch {
      return null;
    }
  }

  async getSeismicMicrozonation(lat = -7.25, lng = 112.75): Promise<BMKGSeismicMicrozonation | null> {
    try {
      const res = await apiClient.get(`/api/bmkg/seismology/microzonation?lat=${lat}&lng=${lng}`);
      return res.data?.data || null;
    } catch {
      return null;
    }
  }

  getStoryMaps(): BMKGStoryMap[] {
    return [
      {
        id: 'story-cianjur',
        title: 'Rekonstruksi Kronologi Gempa Cianjur & Sesar Cugenang',
        category: 'Gempa Bumi',
        summary: 'Analisis multi-disiplin seismologi, deformasi geodetik InSAR, dan amplifikasi tanah lokal terhadap gempa bumi dangkal berkekuatan M5.6 pada kedalaman 10 km.',
        timeline: [
          { phase: 'Inisiasi P-Wave', timestamp: '13:21:10 WIB', description: 'Sensor akselerometer InaTEWS mendeteksi gelombang primer dari patahan geser menganan mengiri (strike-slip).', geospatialFeature: 'Episenter Desa Cibulakan, Kec. Cugenang' },
          { phase: 'Guncangan Utama (S-Wave & MMI VIII)', timestamp: '13:21:14 WIB', description: 'Kecepatan gelombang geser melintasi formasi vulkanik muda Gunung Gede Pangrango menghasilkan amplifikasi guncangan tanah (A0 > 4.5).', geospatialFeature: 'Zona Isoseismal Kerusakan Parah Radius 8 km' },
          { phase: 'Patahan Permukaan & Longsoran', timestamp: '13:22:00 WIB', description: 'Deformasi ground rupture sepanjang 9 km teridentifikasi bersama longsoran masif di jalur Cugenang-Puncak.', geospatialFeature: 'Buffer Sempadan Bahaya Patahan Aktif 200m' },
        ],
        keyInsights: [
          'Kedalaman dangkal (<10 km) memperbesar energi getaran permukaan meski magnitudo tergolong sedang.',
          'Pemetaan mikrozonasi tanah sangat krusial dalam relokasi pemukiman warga dari jalur patahan aktif.',
        ],
      },
      {
        id: 'story-cyclone-seroja',
        title: 'Kronologi Siklon Tropis Seroja di Laut Sawu NTT',
        category: 'Cuaca Ekstrem',
        summary: 'Fenomena langka lahirnya siklon tropis dekat daratan khatulistiwa (10° LS) yang memicu curah hujan ekstrem > 300 mm/hari, angin kencang 110 km/jam, dan banjir bandang lahar hujan.',
        timeline: [
          { phase: 'Bibit Siklon 99S', timestamp: '2 April 2026', description: 'Suhu muka laut (SST) hangat > 30°C di Laut Sawu memicu pembentukan sirkulasi siklonik tertutup.', geospatialFeature: 'Area Tekanan Rendah Laut Sawu' },
          { phase: 'Peningkatan Status Siklon Tropis', timestamp: '4 April 2026', description: 'Siklon Tropis Seroja resmi dinamai oleh TCWC BMKG Jakarta dengan kecepatan angin maksimum 85 km/jam.', geospatialFeature: 'Pusat Siklon 9.9 LS, 120.1 BT' },
          { phase: 'Curah Hujan Ekstrem & Angin Kencang', timestamp: '5 April 2026', description: 'Banjir bandang dan longsor menerjang Flores Timur, Adonara, Alor, Lembata, dan Kota Kupang.', geospatialFeature: 'Koridor Presipitasi Harian > 350 mm' },
        ],
        keyInsights: [
          'Peningkatan suhu permukaan laut akibat perubahan iklim meningkatkan peluang terbentuknya siklon tropis di dekat garis lintang rendah.',
          'Sistem peringatan dini nowcasting BMKG dan koordinasi BNPB menjadi benteng penyelamatan evakuasi dini.',
        ],
      },
      {
        id: 'story-climate-trends',
        title: 'Dinamika Warming Stripes & Perubahan Iklim Nusantara',
        category: 'Perubahan Iklim',
        summary: 'Tren kenaikan suhu udara rata-rata Indonesia selama kurun waktu 1981–2026 berdasarkan analisis stasiun klimatologi dan asimilasi satelit.',
        timeline: [
          { phase: 'Baseline 1981–2000', timestamp: '1981-2000', description: 'Anomali suhu berada pada rentang netral hingga dingin (-0.35°C s.d. -0.10°C).', geospatialFeature: 'Dominasi Garis Biru Pendinginan' },
          { phase: 'Titik Balik Pemanasan', timestamp: '2001-2015', description: 'Perubahan tren anomali positif didorong oleh peningkatan konsentrasi CO2 global dan urbanisasi perkotaan.', geospatialFeature: 'Garis Kuning & Oranye' },
          { phase: 'Dekade Terpanas', timestamp: '2016-2026', description: 'Rentetan rekor suhu terpanas terjadi di berbagai stasiun, rata-rata anomali mencapai +0.65°C s.d. +0.88°C.', geospatialFeature: 'Dominasi Garis Merah Marun Menyeluruh' },
        ],
        keyInsights: [
          'Laju kenaikan suhu udara di Indonesia diperkirakan berkisar 0.03°C per dekade di kawasan maritim hingga 0.05°C di daratan perkotaan.',
          'Adaptasi ketahanan iklim, konservasi hutan hujan, dan energi terbarukan menjadi keharusan mendesak.',
        ],
      },
    ];
  }
}

export const bmkgService = new BMKGService();
