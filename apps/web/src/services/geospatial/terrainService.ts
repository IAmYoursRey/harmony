import { DataProvenance } from './types';

export interface TerrainIntelligenceResult {
  elevationM: number;
  slopeDeg: number;
  slopePercent: number;
  aspect: string;
  aspectDeg: number;
  hillshade: number; // 0 - 255
  morphologyClass: 'Datar (0-2°)' | 'Landai (2-7°)' | 'Agak Curam (7-15°)' | 'Curam (15-30°)' | 'Sangat Terjal (>30°)';
  landslideExposureScore: number;
  landslideRiskLevel: 'Rendah' | 'Sedang' | 'Tinggi' | 'Ekstrem';
  contributingFactors: { factor: string; impact: string; weight: number }[];
  provenance: DataProvenance;
  status: 'LIVE' | 'AVAILABLE' | 'UNAVAILABLE';
}

export interface ElevationProfilePoint {
  distanceKm: number;
  elevationM: number;
  lat: number;
  lng: number;
}

export interface ElevationProfileResult {
  points: ElevationProfilePoint[];
  minElevationM: number;
  maxElevationM: number;
  meanElevationM: number;
  totalDistanceKm: number;
  totalAscentM: number;
  totalDescentM: number;
  provenance: DataProvenance;
  status: 'LIVE' | 'AVAILABLE' | 'UNAVAILABLE';
}

class TerrainService {
  private cache = new Map<string, { data: TerrainIntelligenceResult; expiresAt: number }>();

  /**
   * Fetch authoritative elevation and calculate standard GIS slope & aspect
   * Uses Horn's finite-difference 3x3 neighborhood algorithm
   */
  public async getTerrainIntelligence(
    lat: number,
    lng: number
  ): Promise<TerrainIntelligenceResult> {
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 89.9 || Math.abs(lng) > 180) {
      throw new Error('Koordinat di luar batas fisik terdefinisi (-89.9..89.9 lat, -180..180 lng).');
    }

    const cacheKey = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const deltaDeg = 0.001; // ~111m spatial step
    const latN = Math.min(89.99, lat + deltaDeg);
    const latS = Math.max(-89.99, lat - deltaDeg);
    const normLng = (val: number) => ((((val + 180) % 360) + 360) % 360) - 180;
    const lngW = normLng(lng - deltaDeg);
    const lngE = normLng(lng + deltaDeg);

    // 3x3 Grid:
    // [0] NW, [1] N, [2] NE
    // [3] W,  [4] C, [5] E
    // [6] SW, [7] S, [8] SE
    const lats = [
      latN, latN, latN,
      lat,  lat,  lat,
      latS, latS, latS,
    ];
    const lngs = [
      lngW, lng,  lngE,
      lngW, lng,  lngE,
      lngW, lng,  lngE,
    ];

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats.join(',')}&longitude=${lngs.join(',')}`;
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`Elevation API returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const z: number[] = data.elevation;

      if (!Array.isArray(z) || z.length < 9 || z.some((val) => typeof val !== 'number' || !Number.isFinite(val))) {
        throw new Error('Incomplete elevation grid received');
      }

      const centerElev = Math.round(z[4]);

      // Cell size in meters:
      // 1 deg lat ~ 111,320m
      // 1 deg lng ~ 111,320m * cos(lat)
      const latDist = deltaDeg * 111320;
      const cosLat = Math.max(0.001, Math.cos((lat * Math.PI) / 180));
      const lngDist = deltaDeg * 111320 * cosLat;

      // Horn's method (1981) for weighted finite difference:
      // dz/dx = ((z[2] + 2*z[5] + z[8]) - (z[0] + 2*z[3] + z[6])) / (8 * lngDist)
      // dz/dy = ((z[0] + 2*z[1] + z[2]) - (z[6] + 2*z[7] + z[8])) / (8 * latDist)
      const dz_dx = ((z[2] + 2 * z[5] + z[8]) - (z[0] + 2 * z[3] + z[6])) / (8 * lngDist);
      const dz_dy = ((z[0] + 2 * z[1] + z[2]) - (z[6] + 2 * z[7] + z[8])) / (8 * latDist);

      const slopeRad = Math.atan(Math.sqrt(dz_dx * dz_dx + dz_dy * dz_dy));
      const slopeDeg = Math.round((slopeRad * 180) / Math.PI * 10) / 10;
      const slopePercent = Math.round(Math.tan(slopeRad) * 100);

      // Aspect calculation
      let aspectDeg = 0;
      if (dz_dx !== 0 || dz_dy !== 0) {
        let aspectRad = Math.atan2(dz_dy, -dz_dx);
        aspectDeg = Math.round((450 - (aspectRad * 180) / Math.PI) % 360);
      }

      const aspectDirections = [
        'Utara (N)',
        'Timur Laut (NE)',
        'Timur (E)',
        'Tenggara (SE)',
        'Selatan (S)',
        'Barat Daya (SW)',
        'Barat (W)',
        'Barat Laut (NW)',
      ];
      const dirIdx = Math.round(aspectDeg / 45) % 8;
      const aspect = aspectDirections[dirIdx];

      // Hillshade (Sun altitude 45°, azimuth 315°)
      const zenithRad = (90 - 45) * (Math.PI / 180);
      const sunAzimuthRad = (360 - 315 + 90) * (Math.PI / 180);
      const aspectAngleRad = (aspectDeg * Math.PI) / 180;
      const hillshadeVal = Math.max(
        0,
        Math.min(
          255,
          Math.round(
            255 *
              (Math.cos(zenithRad) * Math.cos(slopeRad) +
                Math.sin(zenithRad) * Math.sin(slopeRad) * Math.cos(sunAzimuthRad - aspectAngleRad))
          )
        )
      );

      // Morphology classification (Van Zuidam, 1985 / BIG standard)
      let morphologyClass: TerrainIntelligenceResult['morphologyClass'] = 'Landai (2-7°)';
      if (slopeDeg <= 2) morphologyClass = 'Datar (0-2°)';
      else if (slopeDeg <= 7) morphologyClass = 'Landai (2-7°)';
      else if (slopeDeg <= 15) morphologyClass = 'Agak Curam (7-15°)';
      else if (slopeDeg <= 30) morphologyClass = 'Curam (15-30°)';
      else morphologyClass = 'Sangat Terjal (>30°)';

      // Landslide exposure model (Heuristic multi-criteria estimate based on slope & elevation)
      const slopeFactor = Math.min(100, (slopeDeg / 35) * 100);
      const elevFactor = Math.min(100, (centerElev / 1500) * 100);
      const exposureScore = Math.round(slopeFactor * 0.55 + elevFactor * 0.45);

      let landslideRiskLevel: TerrainIntelligenceResult['landslideRiskLevel'] = 'Rendah';
      if (exposureScore >= 70) landslideRiskLevel = 'Ekstrem';
      else if (exposureScore >= 50) landslideRiskLevel = 'Tinggi';
      else if (exposureScore >= 30) landslideRiskLevel = 'Sedang';

      const provenance: DataProvenance = {
        sourceType: 'DEM_ELEVATION',
        provider: 'Open-Meteo Elevation API',
        agency: 'Open-Meteo & ESA Copernicus',
        dataset: 'Copernicus DEM 2021 (GLO-90)',
        endpointOrAsset: 'https://api.open-meteo.com/v1/elevation',
        acquisitionTime: 'Copernicus DEM 2021 GLO-90 Global Release',
        processingTime: new Date().toISOString(),
        dataStatus: 'STATIC',
        license: 'Open Access / Copernicus Open Data',
        crs: 'EPSG:4326',
        spatialResolution: '90 meter Ground Sampling Distance',
        uncertainty: 'Akurasi Vertikal Relatif LE90 < 2.0m (turunan DEM statis, bukan observasi langsung)',
        attribution: 'Data elevasi bersumber dari Copernicus DEM 2021 GLO-90 via Open-Meteo Elevation API. Slope dan aspect dihitung dengan metode Horn 3x3; estimasi kerentanan lereng adalah model heuristik.',
      };

      const result: TerrainIntelligenceResult = {
        elevationM: centerElev,
        slopeDeg,
        slopePercent,
        aspect,
        aspectDeg,
        hillshade: hillshadeVal,
        morphologyClass,
        landslideExposureScore: exposureScore,
        landslideRiskLevel,
        contributingFactors: [
          { factor: 'Kemiringan Lereng (Slope Horn)', impact: `${slopeDeg}° (${morphologyClass})`, weight: 55 },
          { factor: 'Elevasi Absolut (Relief)', impact: `${centerElev} mdpl`, weight: 45 },
        ],
        provenance,
        status: 'AVAILABLE',
      };

      this.cache.set(cacheKey, { data: result, expiresAt: Date.now() + 10 * 60 * 1000 });
      return result;
    } catch (err: any) {
      // Return truthful UNAVAILABLE state rather than generating artificial data
      const unavailableProvenance: DataProvenance = {
        sourceType: 'DEM_ELEVATION',
        provider: 'Open-Meteo Elevation API',
        dataset: 'Copernicus DEM 2021 (GLO-90)',
        dataStatus: 'UNAVAILABLE',
        crs: 'EPSG:4326',
        attribution: 'Layanan Open-Meteo DEM API tidak dapat dijangkau saat ini.',
      };

      return {
        elevationM: 0,
        slopeDeg: 0,
        slopePercent: 0,
        aspect: 'Tidak Diketahui',
        aspectDeg: 0,
        hillshade: 128,
        morphologyClass: 'Datar (0-2°)',
        landslideExposureScore: 0,
        landslideRiskLevel: 'Rendah',
        contributingFactors: [],
        provenance: unavailableProvenance,
        status: 'UNAVAILABLE',
      };
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  /**
   * Calculate elevation profile along an array of coordinates
   */
  public async getElevationProfile(
    coordinates: [number, number][]
  ): Promise<ElevationProfileResult> {
    if (!coordinates || coordinates.length === 0) {
      return {
        points: [],
        minElevationM: 0,
        maxElevationM: 0,
        meanElevationM: 0,
        totalDistanceKm: 0,
        totalAscentM: 0,
        totalDescentM: 0,
        provenance: {
          sourceType: 'DEM_ELEVATION',
          provider: 'Open-Meteo Elevation API',
          dataset: 'Copernicus DEM 2021 (GLO-90)',
          dataStatus: 'UNAVAILABLE',
          crs: 'EPSG:4326',
          attribution: 'Tidak ada koordinat profil yang diberikan.',
        },
        status: 'UNAVAILABLE',
      };
    }

    // Sample up to 30 points to stay within URL limits
    const step = Math.max(1, Math.floor(coordinates.length / 30));
    const sampled = coordinates.filter((_, i) => i % step === 0 || i === coordinates.length - 1);

    const lats = sampled.map((c) => c[1].toFixed(5)).join(',');
    const lngs = sampled.map((c) => c[0].toFixed(5)).join(',');

    let profileTimeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      const controller = new AbortController();
      profileTimeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error('Failed to query elevation profile');

      const data = await res.json();
      const elevations: number[] = data.elevation;
      if (!Array.isArray(elevations) || elevations.length !== sampled.length || elevations.some((e) => typeof e !== 'number' || !Number.isFinite(e))) {
        throw new Error('Invalid elevation profile data received');
      }

      const points: ElevationProfilePoint[] = [];
      let totalDistance = 0;
      let totalAscent = 0;
      let totalDescent = 0;

      for (let i = 0; i < sampled.length; i++) {
        const currentCoord = sampled[i];
        const elev = elevations[i] ?? 0;

        if (i > 0) {
          const prevCoord = sampled[i - 1];
          const dLat = ((currentCoord[1] - prevCoord[1]) * Math.PI) / 180;
          const dLon = ((currentCoord[0] - prevCoord[0]) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos((prevCoord[1] * Math.PI) / 180) *
              Math.cos((currentCoord[1] * Math.PI) / 180) *
              Math.sin(dLon / 2) ** 2;
          const distSegment = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          totalDistance += distSegment;

          const deltaElev = elev - (elevations[i - 1] ?? 0);
          if (deltaElev > 0) totalAscent += deltaElev;
          else totalDescent += Math.abs(deltaElev);
        }

        points.push({
          distanceKm: Math.round(totalDistance * 100) / 100,
          elevationM: Math.round(elev),
          lat: currentCoord[1],
          lng: currentCoord[0],
        });
      }

      const elevValues = points.map((p) => p.elevationM);
      const minElev = Math.min(...elevValues);
      const maxElev = Math.max(...elevValues);
      const meanElev = Math.round(elevValues.reduce((a, b) => a + b, 0) / elevValues.length);

      return {
        points,
        minElevationM: minElev,
        maxElevationM: maxElev,
        meanElevationM: meanElev,
        totalDistanceKm: Math.round(totalDistance * 100) / 100,
        totalAscentM: Math.round(totalAscent),
        totalDescentM: Math.round(totalDescent),
        provenance: {
          sourceType: 'DEM_ELEVATION',
          provider: 'Open-Meteo Elevation API',
          dataset: 'Copernicus DEM 2021 (GLO-90)',
          dataStatus: 'STATIC',
          crs: 'EPSG:4326',
          attribution: 'Profil elevasi bersumber dari Copernicus DEM 2021 GLO-90 via Open-Meteo Elevation API.',
        },
        status: 'AVAILABLE',
      };
    } catch {
      return {
        points: [],
        minElevationM: 0,
        maxElevationM: 0,
        meanElevationM: 0,
        totalDistanceKm: 0,
        totalAscentM: 0,
        totalDescentM: 0,
        provenance: {
          sourceType: 'DEM_ELEVATION',
          provider: 'Open-Meteo Elevation API',
          dataset: 'Copernicus DEM 2021 (GLO-90)',
          dataStatus: 'UNAVAILABLE',
          crs: 'EPSG:4326',
          attribution: 'Layanan profil DEM Open-Meteo tidak tersedia saat ini.',
        },
        status: 'UNAVAILABLE',
      };
    } finally {
      if (profileTimeoutId) clearTimeout(profileTimeoutId);
    }
  }
}

export const terrainService = new TerrainService();
