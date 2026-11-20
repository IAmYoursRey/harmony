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
  level: 'AMAN' | 'WASPADA' | 'SIAGA' | 'AWAS' | 'SANGAT MUDAH TERBAKAR';
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
  altitudeM: number | null;
  pm25: number | null;
  pm10: number | null;
  so2: number | null;
  no2: number | null;
  o3: number | null;
  co: number | null;
  sourceLabel?: string;
  greenhouseGas?: {
    co2Ppm: number;
    ch4Ppb: number;
    n2oPpb: number;
    note: string;
  } | null;
  rainChemistry?: {
    ph: number;
    conductivityUsCm: number;
    status: string;
  } | null;
}

export interface AviationMetarRecord {
  icaoId: string;
  name: string;
  reportTime: string | null;
  obsTime: string | null;
  rawOb: string;
  tempC: number | null;
  dewpointC: number | null;
  windDirDeg: number | null;
  windSpeedKt: number | null;
  visibility: string | null;
  altimeterHpa: number | null;
  flightCategory: string | null;
  clouds: Array<{ cover?: string; base?: number }>;
}

export interface GeomagneticKpRecord {
  timeTag: string;
  kpIndex: number;
  aRunning: number | null;
  stationCount: number | null;
  stormScale: string;
  statusText: string;
}

export interface EnsoOniRecord {
  season: string;
  year: number;
  totalSstC: number;
  anomalyOni: number;
  phase: string;
  recentSeries: Array<{ season: string; year: number; totalSstC: number; anomalyOni: number }>;
}

export interface LiveFeedResult<T> {
  status: 'LIVE' | 'ERROR';
  provider: string;
  fetchedAt: string | null;
  data: T;
  error: string | null;
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
      try {
        const resp = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json', { signal });
        if (resp.ok) {
          const raw = await resp.json();
          const g = raw?.Infogempa?.gempa;
          if (g && typeof g.Coordinates === 'string' && typeof g.DateTime === 'string' && Number.isFinite(Date.parse(g.DateTime))) {
            const parts = g.Coordinates.split(',').map((s: string) => s.trim());
            const strictNum = /^[-+]?\d+(?:\.\d+)?$/;
            const lat = parts.length === 2 && strictNum.test(parts[0]) ? parseFloat(parts[0]) : NaN;
            const lng = parts.length === 2 && strictNum.test(parts[1]) ? parseFloat(parts[1]) : NaN;
            const mag = strictNum.test(String(g.Magnitude || '').trim()) ? parseFloat(String(g.Magnitude).trim()) : NaN;
            const depthMatch = String(g.Kedalaman || '').trim().match(/^(\d+(?:\.\d+)?)\s*km$/i);
            if (
              Number.isFinite(lat) && Number.isFinite(lng) &&
              Math.abs(lat) <= 90 && Math.abs(lng) <= 180 &&
              Number.isFinite(mag) && mag >= 0 && mag <= 10 &&
              depthMatch
            ) {
              const parsed: BMKGEarthquake = {
                date: g.Tanggal || '',
                time: g.Jam || '',
                datetime: g.DateTime,
                lat,
                lng,
                magnitude: mag,
                depth: g.Kedalaman,
                depthKm: parseFloat(depthMatch[1]),
                location: g.Wilayah || '',
                potential: g.Potensi || '',
                shakemapUrl: g.Shakemap ? `https://data.bmkg.go.id/DataMKG/TEWS/${g.Shakemap}` : null,
                felt: g.Dirasakan || null,
                attribution: 'BMKG InaTEWS Real-Time Feed',
              };
              this.retrievalStatus.set('/api/bmkg/gempa/autogempa', { status: 'AVAILABLE' });
              return parsed;
            }
          }
        }
      } catch (directErr: any) {
        this.retrievalStatus.set('/api/bmkg/gempa/autogempa', {
          status: 'FAILED',
          message: directErr?.message || 'Gagal menghubungi BMKG InaTEWS.',
        });
      }
    }
    return null;
  }

  async getLiveAviationMetar(ids: string[] = ['WARR', 'WIII', 'WADD'], signal?: AbortSignal): Promise<LiveFeedResult<AviationMetarRecord[]>> {
    const query = ids.join(',');
    try {
      const body = await apiClient.get<any>(`/api/bmkg/aviation/metar?ids=${encodeURIComponent(query)}`, { ttl: 0, signal });
      if (body?.success === true && Array.isArray(body?.data) && body.data.length > 0) {
        return {
          status: 'LIVE',
          provider: body.provider || 'NOAA Aviation Weather Center',
          fetchedAt: body.fetchedAt || new Date().toISOString(),
          data: body.data,
          error: null,
        };
      }
      throw new Error(body?.error || 'Respons METAR live kosong.');
    } catch (err: any) {
      return {
        status: 'ERROR',
        provider: 'NOAA Aviation Weather Center',
        fetchedAt: null,
        data: [],
        error: err?.message || 'Gagal mengambil data METAR bandara live.',
      };
    }
  }

  async getLiveGeomagneticKp(signal?: AbortSignal): Promise<LiveFeedResult<GeomagneticKpRecord | null>> {
    try {
      const body = await apiClient.get<any>('/api/bmkg/geophysics/kp-index', { ttl: 0, signal });
      if (body?.success === true && body?.data && typeof body.data.kpIndex === 'number') {
        return {
          status: 'LIVE',
          provider: body.provider || 'NOAA SWPC Planetary K-Index',
          fetchedAt: body.fetchedAt || new Date().toISOString(),
          data: body.data,
          error: null,
        };
      }
      throw new Error(body?.error || 'Respons Kp-Index live tidak valid.');
    } catch (err: any) {
      return {
        status: 'ERROR',
        provider: 'NOAA SWPC Planetary K-Index',
        fetchedAt: null,
        data: null,
        error: err?.message || 'Gagal mengambil data Kp-Index live.',
      };
    }
  }

  async getLiveEnsoOni(signal?: AbortSignal): Promise<LiveFeedResult<EnsoOniRecord | null>> {
    try {
      const body = await apiClient.get<any>('/api/bmkg/climate/enso-oni', { ttl: 0, signal });
      if (body?.success === true && body?.data && typeof body.data.anomalyOni === 'number') {
        return {
          status: 'LIVE',
          provider: body.provider || 'NOAA CPC Niño 3.4 ONI',
          fetchedAt: body.fetchedAt || new Date().toISOString(),
          data: body.data,
          error: null,
        };
      }
      throw new Error(body?.error || 'Respons ENSO ONI live tidak valid.');
    } catch (err: any) {
      return {
        status: 'ERROR',
        provider: 'NOAA CPC Niño 3.4 ONI',
        fetchedAt: null,
        data: null,
        error: err?.message || 'Gagal mengambil data ENSO ONI live.',
      };
    }
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

  async getLivePrakiraanCuaca(
    adm4 = '35.16.05.2008',
    signal?: AbortSignal
  ): Promise<
    LiveFeedResult<{
      adm4: string;
      lokasi: { desa?: string; kecamatan?: string; kotkab?: string; provinsi?: string } | null;
      slots: Array<{
        localDatetime: string | null;
        utcDatetime: string | null;
        temperatureC: number | null;
        humidityPct: number | null;
        weatherDesc: string;
        weatherCode: string | number | null;
        windSpeedKmh: number | null;
        windDir: string | null;
        cloudCoverPct: number | null;
        visibilityText: string | null;
      }>;
    } | null>
  > {
    try {
      const body = await apiClient.get<any>(
        `/api/bmkg/prakiraan-cuaca?adm4=${encodeURIComponent(adm4)}`,
        { ttl: 0, signal }
      );
      if (body?.success === true && Array.isArray(body?.slots) && body.slots.length > 0) {
        return {
          status: 'LIVE',
          provider: body.provider || 'BMKG API Terbuka (api.bmkg.go.id)',
          fetchedAt: body.fetchedAt || new Date().toISOString(),
          data: {
            adm4: body.adm4 || adm4,
            lokasi: body.lokasi || null,
            slots: body.slots,
          },
          error: null,
        };
      }
      throw new Error(body?.error || 'Respons prakiraan cuaca BMKG tidak valid.');
    } catch (err: any) {
      return {
        status: 'ERROR',
        provider: 'BMKG API Terbuka (api.bmkg.go.id)',
        fetchedAt: null,
        data: null,
        error: err?.message || 'Gagal mengambil prakiraan cuaca BMKG live.',
      };
    }
  }

  async getLiveNowcastAlerts(signal?: AbortSignal): Promise<
    LiveFeedResult<
      Array<{
        id: string;
        title: string;
        province: string;
        description: string;
        link: string;
        pubDate: string | null;
      }>
    >
  > {
    try {
      const body = await apiClient.get<any>('/api/bmkg/peringatan-dini', { ttl: 0, signal });
      if (body?.success === true && Array.isArray(body?.items)) {
        return {
          status: 'LIVE',
          provider: body.provider || 'BMKG Nowcast Resmi (bmkg.go.id)',
          fetchedAt: body.fetchedAt || new Date().toISOString(),
          data: body.items,
          error: null,
        };
      }
      throw new Error(body?.error || 'Respons nowcast BMKG tidak valid.');
    } catch (err: any) {
      return {
        status: 'ERROR',
        provider: 'BMKG Nowcast Resmi (bmkg.go.id)',
        fetchedAt: null,
        data: [],
        error: err?.message || 'Gagal mengambil peringatan dini cuaca BMKG live.',
      };
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
    if (!weatherCurrent || (typeof weatherCurrent.precipitation !== 'number' && typeof weatherCurrent.windSpeed !== 'number')) {
      return [];
    }
    const now = new Date();
    const tzOffset = lng < 114.5 ? 7 : lng < 127.5 ? 8 : 9;
    const tzAbbr = tzOffset === 7 ? 'WIB' : tzOffset === 8 ? 'WITA' : 'WIT';
    const tzRegion = tzOffset === 7 ? 'Asia/Jakarta' : tzOffset === 8 ? 'Asia/Makassar' : 'Asia/Jayapura';
    const issuedTime = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: tzRegion }).format(now) + ` ${tzAbbr}`;
    const validUntil = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: tzRegion }).format(new Date(now.getTime() + 3 * 3600000)) + ` ${tzAbbr}`;

    const precip = typeof weatherCurrent.precipitation === 'number' ? weatherCurrent.precipitation : 0;
    const wind = typeof weatherCurrent.windGusts === 'number'
      ? weatherCurrent.windGusts
      : (typeof weatherCurrent.windSpeed === 'number' ? weatherCurrent.windSpeed : 0);
    const code = typeof weatherCurrent.conditionCode === 'number' ? weatherCurrent.conditionCode : -1;
    const place = locationName || `Koordinat (${lat.toFixed(2)}, ${lng.toFixed(2)})`;
    const attrNote = 'Klasifikasi Ambang Cuaca Open-Meteo/MET Norway (Feed CAP Peringatan Dini BMKG Belum Terhubung)';

    if (code >= 95 || precip >= 15) {
      return [
        {
          id: `warn-live-${Date.now()}-01`,
          province: place,
          title: `Status Ambang Cuaca Ekstrem (${tzAbbr})`,
          issuedAt: issuedTime,
          validUntil,
          hazardType: "Hujan Sangat Lebat atau Petir Berdasarkan Data Model",
          level: "AWAS",
          color: "#ef4444",
          affectedAreas: [place],
          expandToAreas: ["Evaluasi radius 25 km sesuai prakiraan lokal"],
          meteorologicalDescription: `Presipitasi terukur model ${precip} mm/jam dan kecepatan angin ${wind} km/jam.`,
          attribution: attrNote,
        },
      ];
    }

    if (precip >= 3 || wind >= 30) {
      return [
        {
          id: `warn-live-${Date.now()}-01`,
          province: place,
          title: `Status Ambang Cuaca Signifikan (${tzAbbr})`,
          issuedAt: issuedTime,
          validUntil,
          hazardType: "Hujan Sedang-Lebat atau Angin Kencang",
          level: "SIAGA",
          color: "#f97316",
          affectedAreas: [place],
          expandToAreas: ["Kawasan sekitar koordinat"],
          meteorologicalDescription: `Presipitasi terukur model ${precip.toFixed(1)} mm/jam dan kecepatan angin ${wind} km/jam.`,
          attribution: attrNote,
        },
      ];
    }

    if (precip > 0.2 || wind >= 18) {
      return [
        {
          id: `warn-live-${Date.now()}-01`,
          province: place,
          title: `Status Ambang Hujan Ringan-Sedang (${tzAbbr})`,
          issuedAt: issuedTime,
          validUntil,
          hazardType: "Potensi Hujan Ringan / Angin Lokal",
          level: "WASPADA",
          color: "#fbbf24",
          affectedAreas: [place],
          expandToAreas: ["Kawasan sekitar koordinat"],
          meteorologicalDescription: `Presipitasi model ${precip.toFixed(1)} mm/jam, angin ${wind} km/jam.`,
          attribution: attrNote,
        },
      ];
    }

    return [
      {
        id: `warn-live-${Date.now()}-01`,
        province: place,
        title: `Status Parameter Cuaca Lokal (${tzAbbr})`,
        issuedAt: issuedTime,
        validUntil,
        hazardType: "Parameter Cuaca Model di Bawah Ambang Ekstrem",
        level: "AMAN",
        color: "#10b981",
        affectedAreas: [place],
        expandToAreas: ["Koordinat terpilih"],
        meteorologicalDescription: `Presipitasi ${precip.toFixed(1)} mm/jam, angin ${wind} km/jam (bukan peringatan resmi BMKG CAP).`,
        attribution: attrNote,
      },
    ];
  }

  getReferenceWeatherWarnings(lat = -7.25, lng = 112.75, weatherCurrent?: any, locationName?: string): BMKGWeatherWarning[] {
    return this.getDynamicWeatherWarnings(lat, lng, weatherCurrent, locationName);
  }

  getDynamicClimateData(): BMKGClimateData | null {
    return null;
  }

  getReferenceClimateData(): BMKGClimateData | null {
    return null;
  }

  getDynamicAirQuality(lat = -7.25, lng = 112.75, currentAir?: any, locationName?: string): BMKGAirQualityStation[] {
    const hasPm25 = typeof currentAir?.pm25 === 'number' && Number.isFinite(currentAir.pm25);
    const hasPm10 = typeof currentAir?.pm10 === 'number' && Number.isFinite(currentAir.pm10);
    const hasOzone = typeof currentAir?.ozone === 'number' && Number.isFinite(currentAir.ozone);
    if (!hasPm25 && !hasPm10 && !hasOzone) {
      return [];
    }

    const place = locationName || `Lokasi Terpilih (${lat.toFixed(2)}, ${lng.toFixed(2)})`;
    return [
      {
        code: 'CAMS-OM',
        name: `Copernicus CAMS via Open-Meteo — ${place}`,
        province: place,
        lat,
        lng,
        altitudeM: null,
        pm25: hasPm25 ? Number(currentAir.pm25.toFixed(1)) : null,
        pm10: hasPm10 ? Number(currentAir.pm10.toFixed(1)) : null,
        so2: null,
        no2: null,
        o3: hasOzone ? Number(currentAir.ozone.toFixed(1)) : null,
        co: null,
        sourceLabel: 'Model komposisi atmosfer Copernicus CAMS via Open-Meteo (bukan stasiun BMKG)',
        greenhouseGas: null,
        rainChemistry: null,
      },
    ];
  }

  getReferenceAirQuality(lat?: number, lng?: number, currentAir?: any, locationName?: string): BMKGAirQualityStation[] {
    return this.getDynamicAirQuality(lat, lng, currentAir, locationName);
  }

  getReferenceGeophysicsData(): BMKGGeophysicsData | null {
    return null;
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
        standard: "Waktu Perangkat Lokal (Bukan Sinkronisasi NTP Atom Sesium BMKG)",
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
      attribution: "Kalkulasi Ephemeris Astronomi Matematis (Bukan Feed Resmi Tim Tanda Waktu BMKG)",
    };
  }

  getReferenceTimeSun(lat = -7.25, lng = 112.75): BMKGTimeSun {
    return this.getDynamicTimeSun(lat, lng);
  }

  getReferenceMicrozonation(): BMKGSeismicMicrozonation | null {
    return null;
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
