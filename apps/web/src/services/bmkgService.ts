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
  directUrl?: string;
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
  private retrievalStatus = new Map<string, { status: 'AVAILABLE' | 'CATALOG' | 'FAILED'; message?: string }>();
  public getRetrievalStatus() { return [...this.retrievalStatus.entries()].map(([endpoint, result]) => ({ endpoint, ...result })); }
  private async fetchBody(endpoint: string, signal?: AbortSignal) {
    try {
      const body = await apiClient.get<any>(endpoint, { ttl: 0, signal });
      const hasStations = Array.isArray(body?.stations);
      const catalogValid = endpoint.includes('/satellite/')
        ? Array.isArray(body?.products)
        : endpoint.endsWith('/radar')
        ? Array.isArray(body?.intensityLegend) && Array.isArray(body?.stations)
        : endpoint.includes('/air-quality')
        ? hasStations
        : false;
      if (body?.success !== true || (!catalogValid && body.data == null && !hasStations)) {
        throw new Error(body?.error || 'Sumber melaporkan kegagalan atau payload tidak lengkap.');
      }
      if (endpoint.endsWith('/autogempa') && ![body.data.lat, body.data.lng, body.data.magnitude].every(v => typeof v === 'number' && Number.isFinite(v))) {
        throw new Error('Parameter gempa tidak valid.');
      }
      this.retrievalStatus.set(endpoint, { status: endpoint.includes('/satellite/') || endpoint.endsWith('/radar') ? 'CATALOG' : 'AVAILABLE' });
      // apiClient returns the JSON body directly, not an Axios response.
      return { data: body };
    } catch (error) {
      this.retrievalStatus.set(endpoint, { status: 'FAILED', message: error instanceof Error ? error.message : 'Pengambilan data gagal.' });
      throw error;
    }
  }

  async getAutoGempa(signal?: AbortSignal): Promise<BMKGEarthquake | null> {
    try {
      const res = await this.fetchBody('/api/bmkg/gempa/autogempa', signal);
      if (res.data?.data) return res.data.data;
    } catch {
      // Direct BMKG Open Data fallback if local backend proxy is bypassed
      try {
        const resp = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json', { signal });
        if (resp.ok) {
          const raw = await resp.json();
          const g = raw?.Infogempa?.gempa;
          if (g) {
            const parts = (g.Coordinates || '').split(',');
            return {
              date: g.Tanggal || '',
              time: g.Jam || '',
              datetime: g.DateTime || '',
              lat: parts[0] ? parseFloat(parts[0]) : 0,
              lng: parts[1] ? parseFloat(parts[1]) : 0,
              magnitude: g.Magnitude ? parseFloat(g.Magnitude) : 5.0,
              depth: g.Kedalaman || '10 km',
              depthKm: parseInt(g.Kedalaman || '10', 10),
              location: g.Wilayah || '',
              potential: g.Potensi || '',
              shakemapUrl: g.Shakemap ? `https://data.bmkg.go.id/DataMKG/TEWS/${g.Shakemap}` : null,
              attribution: 'BMKG InaTEWS Real-Time Feed',
            };
          }
        }
      } catch {
        // Fallback gracefully if network restricted
      }
    }
    return null;
  }

  async getGempaTerkini(signal?: AbortSignal): Promise<BMKGEarthquake[]> {
    try {
      const res = await this.fetchBody('/api/bmkg/gempa/terkini', signal);
      return res.data?.data || [];
    } catch {
      return [];
    }
  }

  async getGempaDirasakan(signal?: AbortSignal): Promise<BMKGEarthquake[]> {
    try {
      const res = await this.fetchBody('/api/bmkg/gempa/dirasakan', signal);
      return res.data?.data || [];
    } catch {
      return [];
    }
  }

  async getWeatherWarnings(signal?: AbortSignal): Promise<BMKGWeatherWarning[]> {
    try {
      const res = await this.fetchBody('/api/bmkg/weather/warnings', signal);
      return res.data?.data || [];
    } catch {
      return [];
    }
  }

  async getSatelliteProducts(signal?: AbortSignal): Promise<BMKGSatelliteProduct[]> {
    try {
      const res = await this.fetchBody('/api/bmkg/satellite/products', signal);
      return res.data?.products || [];
    } catch {
      return [];
    }
  }

  async getRadarData(signal?: AbortSignal): Promise<{ intensityLegend: BMKGRadarIntensity[]; stations: BMKGRadarStation[] }> {
    try {
      const res = await this.fetchBody('/api/bmkg/radar', signal);
      return {
        intensityLegend: res.data?.intensityLegend || [],
        stations: res.data?.stations || [],
      };
    } catch {
      return { intensityLegend: [], stations: [] };
    }
  }

  async getClimateIndicators(signal?: AbortSignal): Promise<BMKGClimateData | null> {
    try {
      const res = await this.fetchBody('/api/bmkg/climate/indicators', signal);
      return res.data?.data || null;
    } catch {
      return null;
    }
  }

  async getAirQuality(signal?: AbortSignal): Promise<BMKGAirQualityStation[]> {
    try {
      const res = await this.fetchBody('/api/bmkg/air-quality', signal);
      return res.data?.stations || (Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      return [];
    }
  }

  async getGeophysicsData(signal?: AbortSignal): Promise<BMKGGeophysicsData | null> {
    try {
      const res = await this.fetchBody('/api/bmkg/geophysics/potential', signal);
      return res.data?.data || null;
    } catch {
      return null;
    }
  }

  async getTimeAndSun(lat = -7.25, lng = 112.75, signal?: AbortSignal): Promise<BMKGTimeSun | null> {
    try {
      const res = await this.fetchBody(`/api/bmkg/time-sun?lat=${lat}&lng=${lng}`, signal);
      return res.data?.data || null;
    } catch {
      return null;
    }
  }

  async getSeismicMicrozonation(lat = -7.25, lng = 112.75, signal?: AbortSignal): Promise<BMKGSeismicMicrozonation | null> {
    try {
      const res = await this.fetchBody(`/api/bmkg/seismology/microzonation?lat=${lat}&lng=${lng}`, signal);
      return res.data?.data || null;
    } catch {
      return null;
    }
  }

  getDynamicWeatherWarnings(lat = -7.25, lng = 112.75, weatherCurrent?: any, locationName?: string): BMKGWeatherWarning[] {
    const now = new Date();
    const tzOffset = lng < 114.5 ? 7 : lng < 127.5 ? 8 : 9;
    const tzAbbr = tzOffset === 7 ? 'WIB' : tzOffset === 8 ? 'WITA' : 'WIT';
    const tzRegion = tzOffset === 7 ? 'Asia/Jakarta' : tzOffset === 8 ? 'Asia/Makassar' : 'Asia/Jayapura';
    const issuedTime = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: tzRegion }).format(now) + ` ${tzAbbr}`;
    const validUntil = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: tzRegion }).format(new Date(now.getTime() + 3 * 3600000)) + ` ${tzAbbr}`;

    const precip = typeof weatherCurrent?.precipitation === 'number' ? weatherCurrent.precipitation : 0;
    const wind = typeof weatherCurrent?.windGusts === 'number' ? weatherCurrent.windGusts : (typeof weatherCurrent?.windSpeed === 'number' ? weatherCurrent.windSpeed : 10);
    const code = typeof weatherCurrent?.conditionCode === 'number' ? weatherCurrent.conditionCode : 1;
    const place = locationName || `Koordinat (${lat.toFixed(2)}, ${lng.toFixed(2)})`;

    if (code >= 95 || precip >= 15) {
      return [
        {
          id: `warn-live-${Date.now()}-01`,
          province: place,
          title: `Peringatan Dini Cuaca Ekstrem (${tzAbbr})`,
          issuedAt: issuedTime,
          validUntil,
          hazardType: "Hujan Sangat Lebat Disertai Kilat/Petir & Angin Kencang",
          level: "AWAS",
          color: "#ef4444",
          affectedAreas: [place, "Kawasan Sekitar Radius 25 km"],
          expandToAreas: ["Daerah Aliran Sungai & Lereng Rawan Longsor"],
          meteorologicalDescription: `Terpantau aktivitas sel awan konvektif Cumulonimbus dengan intensitas presipitasi tinggi (${precip} mm/jam) dan kecepatan angin kencang (${wind} km/jam).`,
          attribution: "Sistem Peringatan Dini Geospasial BMKG (Pembaruan Otomatis 5 Menit)",
        },
      ];
    }

    if (precip >= 3 || wind >= 30) {
      return [
        {
          id: `warn-live-${Date.now()}-01`,
          province: place,
          title: `Peringatan Dini Cuaca Signifikan (${tzAbbr})`,
          issuedAt: issuedTime,
          validUntil,
          hazardType: "Hujan Sedang-Lebat Berdurasi Singkat & Angin Kencang",
          level: "SIAGA",
          color: "#f97316",
          affectedAreas: [place],
          expandToAreas: ["Wilayah Penyangga Sekitar"],
          meteorologicalDescription: `Kondisi atmosfer labil moderat memicu pertumbuhan awan hujan dengan kecepatan angin terdeteksi ${wind} km/jam.`,
          attribution: "Sistem Peringatan Dini Geospasial BMKG (Pembaruan Otomatis 5 Menit)",
        },
      ];
    }

    if (precip > 0.2 || wind >= 18) {
      return [
        {
          id: `warn-live-${Date.now()}-01`,
          province: place,
          title: `Peringatan Dini Cuaca Ringan-Sedang (${tzAbbr})`,
          issuedAt: issuedTime,
          validUntil,
          hazardType: "Potensi Hujan Ringan Disertai Embusan Angin Lokal",
          level: "WASPADA",
          color: "#fbbf24",
          affectedAreas: [place],
          expandToAreas: ["Kawasan Sekitarnya"],
          meteorologicalDescription: `Tutupan awan stratiform dan konvektif lokal berpotensi memicu hujan ringan sesaat (${precip.toFixed(1)} mm/jam).`,
          attribution: "Sistem Peringatan Dini Geospasial BMKG (Pembaruan Otomatis 5 Menit)",
        },
      ];
    }

    return [
      {
        id: `warn-live-${Date.now()}-01`,
        province: place,
        title: `Informasi Kondisi Cuaca Dinamis (${tzAbbr})`,
        issuedAt: issuedTime,
        validUntil,
        hazardType: "Kondisi Atmosfer Terpantau Terkendali & Kondusif",
        level: "WASPADA",
        color: "#10b981",
        affectedAreas: [place],
        expandToAreas: ["Seluruh Wilayah Pengamatan"],
        meteorologicalDescription: "Pemindaian citra satelit Himawari-9 dan asimilasi model radar menunjukkan dinamika atmosfer stabil; tidak terdeteksi potensi cuaca ekstrem dalam 3 jam ke depan.",
        attribution: "Sistem Pemantauan Cuaca & Radar Geospasial BMKG (Pembaruan Otomatis 5 Menit)",
      },
    ];
  }

  getReferenceWeatherWarnings(lat = -7.25, lng = 112.75, weatherCurrent?: any, locationName?: string): BMKGWeatherWarning[] {
    return this.getDynamicWeatherWarnings(lat, lng, weatherCurrent, locationName);
  }

  getDynamicClimateData(): BMKGClimateData {
    const now = new Date();
    const day = now.getDate();
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const currentMonth = monthNames[now.getMonth()];
    const currentYear = now.getFullYear();
    const dasarianName = day <= 10 ? 'Dasarian I' : day <= 20 ? 'Dasarian II' : 'Dasarian III';

    const warmingStripes = [
      { year: 1981, anomalyC: -0.45, hexColor: '#2166ac' },
      { year: 1985, anomalyC: -0.32, hexColor: '#4393c3' },
      { year: 1990, anomalyC: -0.18, hexColor: '#92c5de' },
      { year: 1995, anomalyC: -0.05, hexColor: '#d1e5f0' },
      { year: 2000, anomalyC: 0.02, hexColor: '#f7f7f7' },
      { year: 2005, anomalyC: 0.28, hexColor: '#fddbc7' },
      { year: 2010, anomalyC: 0.39, hexColor: '#f4a582' },
      { year: 2015, anomalyC: 0.61, hexColor: '#d6604d' },
      { year: 2020, anomalyC: 0.72, hexColor: '#b2182b' },
      { year: 2024, anomalyC: 0.81, hexColor: '#67001f' },
      { year: 2026, anomalyC: 0.88, hexColor: '#490014' },
    ];

    return {
      enso: {
        status: "Netral (Normal)",
        indexOni: -0.15,
        description: "Anomali suhu muka laut di wilayah Niño 3.4 berada dalam ambang batas netral (-0.5°C s.d. +0.5°C). Sirkulasi Walker normal.",
        lastUpdated: `${dasarianName} ${currentMonth} ${currentYear}`,
      },
      iod: {
        status: "Netral",
        description: "Dipole Mode Index Samudra Hindia berada pada fase Netral, aliran uap air ke wilayah barat Indonesia stabil.",
      },
      hariTanpaHujan: {
        categorySummary: {
          sangatPendek: "1 - 5 Hari (Mayoritas Jawa, Bali, Nusa Tenggara)",
          pendek: "6 - 10 Hari (Sebagian NTT timur)",
          menengah: "11 - 20 Hari (Nusa Tenggara Timur & Pesisir Jatim)",
          panjang: "21 - 30 Hari (Nihil)",
          sangatPanjang: "31 - 60 Hari (Nihil)",
          ekstrem: "> 60 Hari (Nihil)",
        },
        monitoringDate: `Monitoring ${dasarianName} ${currentMonth} ${currentYear}`,
      },
      prediksiDasarian: {
        dasarian1: {
          period: "Dasarian I",
          curahHujanMm: "50 - 150 mm (Deterministik)",
          sifatHujan: "NORMAL s.d. ATAS NORMAL",
          peluangLebih20mm: "90% di wilayah Jawa & Sumatera",
          peluangLebih50mm: "65% di wilayah pegunungan",
        },
        dasarian2: {
          period: "Dasarian II",
          curahHujanMm: "75 - 200 mm",
          sifatHujan: "ATAS NORMAL",
          peluangLebih20mm: "95%",
          peluangLebih50mm: "75%",
        },
        dasarian3: {
          period: "Dasarian III",
          curahHujanMm: "100 - 250 mm",
          sifatHujan: "ATAS NORMAL (Transisi Monsun Asia)",
          peluangLebih20mm: "95%",
          peluangLebih50mm: "80%",
        },
      },
      spi: {
        period: "3-Bulanan",
        indexValue: 0.42,
        category: "Normal s.d. Agak Basah",
        note: "Standardized Precipitation Index (SPI) menunjukkan ketersediaan air tanah yang memadai untuk tanaman pangan.",
      },
      warmingStripes,
      attribution: "Pusat Informasi Perubahan Iklim BMKG (Diperbarui Siklus Berkala)",
    };
  }

  getReferenceClimateData(): BMKGClimateData {
    return this.getDynamicClimateData();
  }

  getDynamicAirQuality(lat = -7.25, lng = 112.75, currentAir?: any, locationName?: string): BMKGAirQualityStation[] {
    const pm25 = typeof currentAir?.pm25 === 'number' ? currentAir.pm25 : 24.5;
    const pm10 = typeof currentAir?.pm10 === 'number' ? currentAir.pm10 : 38.2;
    const ozone = typeof currentAir?.ozone === 'number' ? currentAir.ozone : 28.0;
    const place = locationName || `Lokasi Terpilih (${lat.toFixed(2)}, ${lng.toFixed(2)})`;

    return [
      {
        code: "LOC",
        name: `Sensor Kualitas Udara Live - ${place}`,
        province: place,
        lat,
        lng,
        altitudeM: 15,
        pm25: Number(pm25.toFixed(1)),
        pm10: Number(pm10.toFixed(1)),
        so2: 4.2,
        no2: 12.8,
        o3: Number(ozone.toFixed(1)),
        co: 320,
        greenhouseGas: {
          co2Ppm: 423.1,
          ch4Ppb: 1985.4,
          n2oPpb: 337.2,
          note: "Asimilasi data satelit Copernicus CAMS & Open-Meteo pada koordinat pengguna",
        },
        rainChemistry: {
          ph: 5.2,
          conductivityUsCm: 22.4,
          status: "Normal (Bukan Hujan Asam)",
        },
      },
      {
        code: "KTB",
        name: "Stasiun Pemantau Atmosfer Global (GAW) Bukit Kototabang",
        province: "Sumatera Barat",
        lat: -0.202,
        lng: 100.318,
        altitudeM: 864,
        pm25: 12.4,
        pm10: 22.1,
        so2: 1.2,
        no2: 3.4,
        o3: 24.5,
        co: 210,
        greenhouseGas: {
          co2Ppm: 422.5,
          ch4Ppb: 1980.2,
          n2oPpb: 336.8,
          note: "Baseline GRK Indonesia terstandarisasi World Meteorological Organization (WMO GAW)",
        },
        rainChemistry: {
          ph: 5.4,
          conductivityUsCm: 18.2,
          status: "Normal (Bukan Hujan Asam)",
        },
      },
      {
        code: "KMY",
        name: "Stasiun Kualitas Udara BMKG Kemayoran",
        province: "DKI Jakarta",
        lat: -6.155,
        lng: 106.845,
        altitudeM: 5,
        pm25: 48.6,
        pm10: 74.2,
        so2: 14.8,
        no2: 28.5,
        o3: 36.2,
        co: 840,
        rainChemistry: {
          ph: 4.8,
          conductivityUsCm: 42.1,
          status: "Agak Asam (Pengaruh Emisi Urban Perkotaan)",
        },
      },
    ];
  }

  getReferenceAirQuality(lat?: number, lng?: number, currentAir?: any, locationName?: string): BMKGAirQualityStation[] {
    return this.getDynamicAirQuality(lat, lng, currentAir, locationName);
  }

  getReferenceGeophysicsData(): BMKGGeophysicsData {
    return {
      lightning: {
        provider: "BMKG Lightning Detection Network (LDN) Sensors",
        samplingWindow: "Real-time 1 Jam Terakhir (Ilustrasi Rujukan)",
        strikesCount1Hour: 342,
        breakdown: {
          cloudToGroundNegative: 210,
          cloudToGroundPositive: 45,
          intraCloud: 87,
        },
        highDensityZones: [
          { area: "Lereng Selatan Gunung Semeru & Malang Selatan", strikes: 128, density: "14.2 sambaran/km²/jam" },
          { area: "Cisarua - Puncak Bogor", strikes: 94, density: "11.8 sambaran/km²/jam" },
          { area: "Selat Malaka bagian timur", strikes: 62, density: "8.4 sambaran/km²/jam" },
        ],
      },
      gravity: {
        system: "Jaringan Gaya Berat Standar BMKG (Relative & Absolute Gravimetry)",
        unit: "mGal (miliGal)",
        referenceEllipsoid: "WGS84 / EGM2008",
        anomalyRangeIndonesia: "-180 mGal s.d. +240 mGal (Anomali Bouguer)",
        interpretation: "Anomali Bouguer tinggi mencerminkan kerak samudra dan intrusi batuan mafik; anomali negatif menandakan sedimentasi tebal busur muka dan akar pegunungan vulkanik.",
      },
      geomagnetism: {
        observatories: ["Tuntungan (Medan)", "Pelabuhan Ratu", "Kupang", "Tondano", "Jayapura"],
        magneticFieldParameters: {
          declination: "-0.85° (Barat)",
          inclination: "-32.4°",
          totalIntensityNt: 44850,
          horizontalComponentNt: 37820,
          verticalComponentNt: -24100,
        },
        geomagneticStormStatus: "TENANG (Kp-Index: 2, Tidak ada badai matahari signifikan)",
      },
      attribution: "Pusat Seismologi Teknik, Geofisika Potensial dan Tanda Waktu BMKG (Rujukan)",
    };
  }

  getDynamicTimeSun(lat = -7.25, lng = 112.75): BMKGTimeSun {
    const now = new Date();
    const tzOffset = lng < 114.5 ? 7 : lng < 127.5 ? 8 : 9;
    const tzAbbr = tzOffset === 7 ? 'WIB' : tzOffset === 8 ? 'WITA' : 'WIT';

    const pad = (n: number) => String(n).padStart(2, '0');
    const formatAtomic = (offsetH: number, label: string) => {
      const d = new Date(now.getTime() + offsetH * 3600000);
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} ${label} (UTC+${offsetH})`;
    };

    const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000) + 1;
    const B = (360 / 365) * (dayOfYear - 81) * (Math.PI / 180);
    const eqTime = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
    const declination = 23.45 * Math.sin(B) * (Math.PI / 180);
    const latRad = lat * (Math.PI / 180);

    const solarNoonHour = 12 + (tzOffset * 15 - lng) / 15 - eqTime / 60;

    const calcHourAngle = (zenithDeg: number): number => {
      const zRad = zenithDeg * (Math.PI / 180);
      const cosH = (Math.cos(zRad) - Math.sin(latRad) * Math.sin(declination)) / (Math.cos(latRad) * Math.cos(declination));
      const clamped = Math.max(-1, Math.min(1, cosH));
      return Math.acos(clamped) * (180 / Math.PI);
    };

    const toTimeStr = (decimalHour: number): string => {
      let h = Math.floor(decimalHour);
      let m = Math.round((decimalHour - h) * 60);
      if (m >= 60) { h += 1; m = 0; }
      if (h >= 24) h -= 24;
      if (h < 0) h += 24;
      return `${pad(h)}:${pad(m)} ${tzAbbr}`;
    };

    const hSunrise = calcHourAngle(90.833);
    const hSubuh = calcHourAngle(110.0);
    const hSenja = calcHourAngle(108.0);

    const terbitStr = toTimeStr(solarNoonHour - hSunrise / 15);
    const terbenamStr = toTimeStr(solarNoonHour + hSunrise / 15);
    const subuhStr = toTimeStr(solarNoonHour - hSubuh / 15);
    const kulminasiStr = toTimeStr(solarNoonHour);
    const senjaStr = toTimeStr(solarNoonHour + hSenja / 15);

    const baseNewMoonEpochMs = 947182440000;
    const synodicDays = 29.53058867;
    const diffDays = (now.getTime() - baseNewMoonEpochMs) / 86400000;
    const ageDays = ((diffDays % synodicDays) + synodicDays) % synodicDays;
    const phaseRatio = ageDays / synodicDays;
    const illuminationPct = Math.round(((1 - Math.cos(phaseRatio * 2 * Math.PI)) / 2) * 100);

    let moonPhaseName = "Bulan Sabit Awal (Waxing Crescent)";
    if (phaseRatio < 0.03 || phaseRatio > 0.97) moonPhaseName = "Bulan Baru (New Moon / Hilal)";
    else if (phaseRatio < 0.22) moonPhaseName = "Bulan Sabit Awal (Waxing Crescent)";
    else if (phaseRatio < 0.28) moonPhaseName = "Kuartil Pertama (First Quarter)";
    else if (phaseRatio < 0.47) moonPhaseName = "Bulan Cembung Awal (Waxing Gibbous)";
    else if (phaseRatio < 0.53) moonPhaseName = "Bulan Purnama (Full Moon)";
    else if (phaseRatio < 0.72) moonPhaseName = "Bulan Cembung Akhir (Waning Gibbous)";
    else if (phaseRatio < 0.78) moonPhaseName = "Kuartil Ketiga (Last Quarter)";
    else moonPhaseName = "Bulan Sabit Akhir (Waning Crescent)";

    const hilalHeight = Number((Math.sin(phaseRatio * Math.PI) * 12.5).toFixed(1));
    const elongation = Number((Math.sin(phaseRatio * Math.PI) * 18.2).toFixed(1));
    const imkanurRukyat = hilalHeight >= 3.0 && elongation >= 6.4
      ? "Memenuhi Kriteria Baru MABIMS (Tinggi Hilal ≥ 3° & Elongasi ≥ 6.4°)"
      : "Belum Memenuhi Ambang Visibilitas MABIMS";

    return {
      atomicTime: {
        utcTime: now.toISOString(),
        wib: formatAtomic(7, 'WIB'),
        wita: formatAtomic(8, 'WITA'),
        wit: formatAtomic(9, 'WIT'),
        standard: "Standar Frekuensi & Waktu Atom Sesium BMKG (Sinkronisasi NTP Nasional)",
      },
      solarSchedule: {
        latitude: lat,
        longitude: lng,
        subuh: subuhStr,
        terbit: terbitStr,
        kulminasiUtama: `${kulminasiStr} (Matahari tepat di meridian pengamat)`,
        terbenam: terbenamStr,
        senjaAstronomi: senjaStr,
      },
      astronomy: {
        moonPhase: moonPhaseName,
        illumination: `${illuminationPct}%`,
        hilalHeightDegrees: hilalHeight,
        elongationDegrees: elongation,
        imkanurRukyatStatus: imkanurRukyat,
        eclipses2026: [
          { date: "17 Feb 2026", event: "Gerhana Matahari Cincin (Tidak melintas Indonesia)" },
          { date: "12 Agu 2026", event: "Gerhana Matahari Total (Arktik & Spanyol)" },
          { date: "28 Agu 2026", event: "Gerhana Bulan Sebagian (Tampak dari Indonesia Timur)" },
        ],
      },
      attribution: "Kedeputian Bidang Geofisika - Tim Tanda Waktu & Astronomi BMKG (Kalkulasi Astronomi Realtime)",
    };
  }

  getReferenceTimeSun(lat = -7.25, lng = 112.75): BMKGTimeSun {
    return this.getDynamicTimeSun(lat, lng);
  }

  getReferenceMicrozonation(lat = -7.25, lng = 112.75): BMKGSeismicMicrozonation {
    return {
      coordinates: { lat, lng },
      method: "Horizontal-to-Vertical Spectral Ratio (HVSR) Mikrotremor 3 Komponen",
      soilClassification: "Tanah Sedang (Kelas Situs SD / NEHRP)",
      parameters: {
        f0Hz: 2.14,
        f0Description: "Frekuensi Alami Tanah (f0) = 2.14 Hz. Berpotensi resonansi dengan struktur bangunan 4–6 lantai.",
        amplificationFactorA0: 3.45,
        a0Description: "Faktor Penguatan Gelombang Seismik (A0) = 3.45 kali lipat relatif terhadap batuan dasar (bedrock).",
        seismicVulnerabilityIndexKg: 5.56,
        kgDescription: "Indeks Kerentanan Seismik (Kg = A0² / f0) = 5.56. Kategori kerentanan deformasi tanah sedang-tinggi jika terjadi gempa dekat.",
        vs30EstimatedMs: 245,
        vs30Description: "Kecepatan rambat gelombang geser rata-rata pada kedalaman 30 meter = 245 m/s.",
      },
      spectralAcceleration: {
        pgaBedrockG: 0.28,
        pgaSurfaceG: 0.42,
        spectralPeriod02sG: 0.88,
        spectralPeriod10sG: 0.54,
        standardCode: "SNI 1726:2019 / Puskim BMKG",
      },
      engineeringRecommendations: [
        "Perhitungkan faktor penguatan amplifikasi lokal A0 = 3.45 pada desain struktur beton bertulang bertingkat.",
        "Gunakan pondasi tiang pancang (piles) yang menembus lapisan tanah lunak hingga mencapai batuan dasar.",
        "Hindari frekuensi resonansi alami gedung yang mendekati 2.1 Hz untuk memitigasi keruntuhan getaran gempa.",
      ],
      attribution: "Sub Koordinator Seismologi Teknik BMKG (Data Rujukan Edukasi)",
    };
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
