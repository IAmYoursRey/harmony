/**
 * GNSS Elevation & Precision Geodetic Altimeter Service
 * Handles user geolocation permission requests, pinpoints real device coordinates,
 * measures physical altitude (device barometer/GPS + SRTM DEM fallback),
 * and generates detailed coordinate and topography elevation reports.
 */

import { preciseGeocodingService, PreciseLocationInfo } from '../preciseGeocodingService';
import { geospatialAnalysisService } from '../geospatialAnalysisService';

export interface GnssElevationReport {
  lat: number;
  lng: number;
  accuracyM: number;
  altitudeM: number | null;
  altitudeSource: 'device_sensor' | 'dem_srtm_model' | 'sensor_fusion' | 'unavailable';
  elevationError?: string;
  dmsLat: string;
  dmsLng: string;
  dmsDisplay: string;
  epsg3857: { x: number; y: number };
  topographyZone: string;
  topographyDescription: string;
  estimatedBarometricPressureHpa: number | null;
  estimatedBoilingPointC: number | null;
  locationInfo?: PreciseLocationInfo;
  timestamp: string;
  formattedReportText: string;
}

export class GnssElevationService {
  /**
   * Converts decimal degrees into Degrees, Minutes, Seconds (DMS) format
   */
  public toDMS(coordinate: number, isLatitude: boolean): string {
    const absolute = Math.abs(coordinate);
    const degrees = Math.floor(absolute);
    const minutesNotTruncated = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesNotTruncated);
    const seconds = Math.round((minutesNotTruncated - minutes) * 60 * 10) / 10;

    let direction = '';
    if (isLatitude) {
      direction = coordinate >= 0 ? 'LU' : 'LS';
    } else {
      direction = coordinate >= 0 ? 'BT' : 'BB';
    }

    return `${degrees}° ${minutes}' ${seconds.toFixed(1)}" ${direction}`;
  }

  /**
   * Evaluates terrain topography classification based on meters above sea level (mdpl)
   */
  public getTopographyZone(elevationM: number): { zone: string; description: string } {
    if (elevationM < 50) {
      return {
        zone: 'Dataran Rendah Pesisir / Aluvial',
        description: 'Medan datar relatif dekat permukaan laut, umum untuk kawasan pesisir, muara, dan perkotaan aluvium.',
      };
    }
    if (elevationM < 200) {
      return {
        zone: 'Dataran Rendah Bergelombang',
        description: 'Wilayah daratan landai dengan drainase stabil dan kemiringan lereng minor.',
      };
    }
    if (elevationM < 500) {
      return {
        zone: 'Perbukitan Rendah',
        description: 'Kawasan transisi perbukitan dengan elevasi sedang dan variasi kelerengan menengah.',
      };
    }
    if (elevationM < 1000) {
      return {
        zone: 'Dataran Tinggi / Perbukitan Terjal',
        description: 'Zona elevasi tinggi dengan udara sejuk, potensi kabut orografis, dan kemiringan lereng aktif.',
      };
    }
    if (elevationM < 2000) {
      return {
        zone: 'Kawasan Lereng Pegunungan',
        description: 'Morfologi lereng gunung api atau punggung bukit dengan tekanan udara lebih rendah dan suhu dingin.',
      };
    }
    return {
      zone: 'Puncak / Kawasan Pegunungan Tinggi',
      description: 'Elevasi ekstrem pegunungan tinggi dengan tekanan atmosfer tipis dan pembentukan awan konvektif kuat.',
    };
  }

  /**
   * Calculates theoretical standard barometric pressure (hPa) at a given altitude
   */
  public calculateBarometricPressure(elevationM: number): number {
    const safeH = Math.max(0, elevationM);
    // International Standard Atmosphere barometric formula
    const p = 1013.25 * Math.pow(1 - 2.25577e-5 * safeH, 5.25588);
    return Math.round(p * 10) / 10;
  }

  /**
   * Calculates boiling point of water (°C) at a given altitude
   */
  public calculateBoilingPoint(elevationM: number): number {
    const safeH = Math.max(0, elevationM);
    const tb = 100 - safeH / 300;
    return Math.round(tb * 10) / 10;
  }

  private elevationCache = new Map<string, { elevation: number; expiresAt: number }>();
  private inFlightElevation = new Map<string, Promise<number | null>>();
  private rateLimitCooldownUntil = 0;
  private elevationCacheHydrated = false;
  private readonly ELEV_STORAGE_KEY = 'hm_dem_elev_v1';

  private hydrateElevationCache(): void {
    if (this.elevationCacheHydrated) return;
    this.elevationCacheHydrated = true;
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const raw = window.localStorage.getItem(this.ELEV_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const now = Date.now();
      for (const entry of parsed) {
        if (
          entry &&
          typeof entry.key === 'string' &&
          typeof entry.elevation === 'number' &&
          typeof entry.expiresAt === 'number' &&
          entry.expiresAt > now
        ) {
          this.elevationCache.set(entry.key, {
            elevation: entry.elevation,
            expiresAt: entry.expiresAt,
          });
        }
      }
    } catch {
      // Ignore storage access failures.
    }
  }

  private persistElevationEntry(key: string, elevation: number, expiresAt: number): void {
    this.elevationCache.set(key, { elevation, expiresAt });
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      if (this.elevationCache.size > 40) {
        const oldestKey = this.elevationCache.keys().next().value;
        if (oldestKey) this.elevationCache.delete(oldestKey);
      }
      const serializable = Array.from(this.elevationCache.entries())
        .slice(-40)
        .map(([k, v]) => ({ key: k, elevation: v.elevation, expiresAt: v.expiresAt }));
      window.localStorage.setItem(this.ELEV_STORAGE_KEY, JSON.stringify(serializable));
    } catch {
      // Ignore storage write errors.
    }
  }

  /**
   * Fetches high-resolution digital ground elevation from Open-Meteo elevation API (DEMNAS/SRTM 30m)
   */
  public async fetchGroundElevation(lat: number, lng: number): Promise<number | null> {
    this.hydrateElevationCache();
    const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
    const cached = this.elevationCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.elevation;
    }

    const inFlight = this.inFlightElevation.get(key);
    if (inFlight) return inFlight;

    if (this.rateLimitCooldownUntil > Date.now()) {
      if (cached) return cached.elevation;
      return null;
    }

    const promise = (async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        try {
          const proxyRes = await fetch(`/api/spatial/elevation?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}`, {
            signal: AbortSignal.timeout(5000),
          });
          if (proxyRes.ok) {
            const pJson = await proxyRes.json();
            const rawProxyElev = pJson?.results?.[0]?.elevation ?? pJson?.elevation?.[0];
            if (typeof rawProxyElev === 'number' && Number.isFinite(rawProxyElev)) {
              const val = Math.round(rawProxyElev * 10) / 10;
              this.persistElevationEntry(key, val, Date.now() + 24 * 3600 * 1000);
              return val;
            }
          }
        } catch {
          // Fall back to direct elevation APIs when proxy is unavailable
        }

        const res = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}`, {
          signal: controller.signal,
          if(this.rateLimitCooldownUntil <= Date.now()) {
            const res = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}`, {
              signal: AbortSignal.timeout(5000),
            });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.elevation) && typeof data.elevation[0] === 'number') {
            const val = Math.round(data.elevation[0] * 10) / 10;
            this.persistElevationEntry(key, val, Date.now() + 24 * 3600 * 1000);
            return val;
          }
        } else if (res.status === 429) {
          this.rateLimitCooldownUntil = Date.now() + 60_000;
        }
      }

        const openElevRes = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${lat.toFixed(4)},${lng.toFixed(4)}`, {
        signal: AbortSignal.timeout(6000),
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.elevation) && typeof data.elevation[0] === 'number') {
          const val = Math.round(data.elevation[0] * 10) / 10;
          if (openElevRes.ok) {
            const elevJson = await openElevRes.json();
            const rawElev = elevJson?.results?.[0]?.elevation;
            if (typeof rawElev === 'number' && Number.isFinite(rawElev)) {
              const val = Math.round(rawElev * 10) / 10;
              this.persistElevationEntry(key, val, Date.now() + 24 * 3600 * 1000);
              return val;
            }
          } else if (res.status === 429) {
            this.rateLimitCooldownUntil = Date.now() + 60_000;
            if (cached) return cached.elevation;
          }
        } catch {
          // Network fallback
        } finally {
          this.inFlightElevation.delete(key);
        }
        return cached?.elevation ?? null;
      }) ();

      this.inFlightElevation.set(key, promise);
      return promise;
    }

  /**
   * Prompts user for high-accuracy GPS permission, pinpoints position,
   * measures altitude and compiles an elevation report.
   */
  public buildElevationReport(params: {
      lat: number;
      lng: number;
      accuracyM: number;
      deviceAlt: number | null;
      demAlt: number | null;
      locationInfo?: PreciseLocationInfo;
      elevationError?: string;
    }): GnssElevationReport {
    const { lat, lng, accuracyM, deviceAlt, demAlt, locationInfo, elevationError } = params;
    let finalAltitudeM: number | null;
    let altitudeSource: GnssElevationReport['altitudeSource'];
    let resolvedError = elevationError;

    if (deviceAlt !== null && demAlt !== null) {
      finalAltitudeM = deviceAlt;
      altitudeSource = 'sensor_fusion';
    } else if (deviceAlt !== null) {
      finalAltitudeM = deviceAlt;
      altitudeSource = 'device_sensor';
    } else if (demAlt !== null) {
      finalAltitudeM = demAlt;
      altitudeSource = 'dem_srtm_model';
    } else {
      finalAltitudeM = null;
      altitudeSource = 'unavailable';
      resolvedError = resolvedError || 'Sensor altimeter perangkat tidak tersedia dan API DEM Open-Meteo gagal merespons.';
    }

    const dmsLat = this.toDMS(lat, true);
    const dmsLng = this.toDMS(lng, false);
    const dmsDisplay = `${dmsLat}, ${dmsLng}`;
    const epsg3857 = geospatialAnalysisService.toEPSG3857(lat, lng);
    const topo = finalAltitudeM !== null
      ? this.getTopographyZone(finalAltitudeM)
      : {
        zone: 'Data Elevasi Tidak Tersedia',
        description: resolvedError || 'Elevasi medan tidak dapat dipastikan karena GPS tidak melaporkan ketinggian dan API DEM gagal dihubungi.',
      };
    const pressure = finalAltitudeM !== null ? this.calculateBarometricPressure(finalAltitudeM) : null;
    const boilingPoint = finalAltitudeM !== null ? this.calculateBoilingPoint(finalAltitudeM) : null;

    const nowFormatted = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'full',
      timeStyle: 'medium',
    }).format(new Date());

    const altDisplay = finalAltitudeM !== null
      ? `${finalAltitudeM >= 0 ? `+${finalAltitudeM}` : finalAltitudeM} mdpl`
      : 'Tidak tersedia (ERROR)';

    const sourceDisplay = altitudeSource === 'sensor_fusion'
      ? 'Fusi Sensor Barometrik & Model DEM SRTM'
      : altitudeSource === 'device_sensor'
        ? 'Sensor GNSS Perangkat'
        : altitudeSource === 'dem_srtm_model'
          ? 'Model Digital Elevasi (DEMNAS/SRTM)'
          : 'Tidak tersedia (Sensor & DEM Offline)';

    const reportLines = [
      '========================================',
      'LAPORAN KETINGGIAN & KOORDINAT GNSS',
      '========================================',
      `Waktu Pengukuran  : ${nowFormatted} WIB`,
      `Wilayah / Lokasi  : ${locationInfo?.shortDisplay || 'Koordinat Geospasial'}`,
      `Alamat Lengkap    : ${locationInfo?.fullAddress || `${lat.toFixed(5)}°, ${lng.toFixed(5)}°`}`,
      '----------------------------------------',
      `Ketinggian Medan  : ${altDisplay}`,
      `Zona Topografi    : ${topo.zone}`,
      `Deskripsi Morfo   : ${topo.description}`,
      `Tekanan Udara     : ${pressure !== null ? `${pressure} hPa` : 'Tidak tersedia'}`,
      `Titik Didih Air   : ${boilingPoint !== null ? `${boilingPoint} °C` : 'Tidak tersedia'}`,
      '----------------------------------------',
      `Lintang / Bujur   : ${lat.toFixed(6)}°, ${lng.toFixed(6)}°`,
      `Format DMS        : ${dmsDisplay}`,
      `Proyeksi Mercator : X: ${epsg3857.x} m, Y: ${epsg3857.y} m (EPSG:3857)`,
      `Akurasi GPS       : ±${accuracyM} meter`,
      `Sumber Ketinggian : ${sourceDisplay}`,
      '========================================',
      'Harmony Geospatial GNSS Altimeter Engine',
    ];

    return {
      lat,
      lng,
      accuracyM,
      altitudeM: finalAltitudeM,
      altitudeSource,
      elevationError: resolvedError,
      dmsLat,
      dmsLng,
      dmsDisplay,
      epsg3857,
      topographyZone: topo.zone,
      topographyDescription: topo.description,
      estimatedBarometricPressureHpa: pressure,
      estimatedBoilingPointC: boilingPoint,
      locationInfo,
      timestamp: nowFormatted,
      formattedReportText: reportLines.join('\n'),
    };
  }

  public async measureElevationAndPosition(): Promise<GnssElevationReport> {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      throw new Error('Sensor GPS / Web Geolocation API tidak didukung pada peramban ini.');
    }

    const acquirePosition = (opts: PositionOptions) =>
      new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, opts);
      });

    let pos: GeolocationPosition;
    try {
      pos = await acquirePosition({
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 30000,
      });
    } catch (err: any) {
      if (err?.code === 1) {
        throw new Error(
          'Izin akses lokasi ditolak oleh pengguna. Mohon izinkan akses lokasi di pengaturan browser untuk mengukur ketinggian di titik Anda.'
        );
      }
      // Stage 2: Fast network/Wi-Fi triangulation fallback for indoor Android devices
      try {
        pos = await acquirePosition({
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 120000,
        });
      } catch (fallbackErr: any) {
        let msg = 'Gagal mengakses GPS perangkat.';
        if (fallbackErr?.code === 1) {
          msg =
            'Izin akses lokasi ditolak oleh pengguna. Mohon izinkan akses lokasi di pengaturan browser untuk mengukur ketinggian di titik Anda.';
        } else if (fallbackErr?.code === 2) {
          msg =
            'Sinyal satelit GPS tidak terdeteksi. Pastikan perangkat Anda memiliki koneksi jaringan atau GPS aktif.';
        } else if (fallbackErr?.code === 3) {
          msg =
            'Batas waktu pencarian lokasi GPS terlampaui. Silakan coba lagi atau aktifkan Layanan Lokasi perangkat.';
        }
        throw new Error(msg);
      }
    }

    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const accuracyM = Math.round((pos.coords.accuracy || 10) * 10) / 10;
    const deviceAlt = pos.coords.altitude != null && Number.isFinite(pos.coords.altitude)
      ? Math.round(pos.coords.altitude * 10) / 10
      : null;

    const demAlt = await this.fetchGroundElevation(lat, lng);

    let locationInfo: PreciseLocationInfo | undefined;
    try {
      locationInfo = await preciseGeocodingService.reverseGeocode(lat, lng, accuracyM);
    } catch {
      // Continue without reverse geocoding
    }

    return this.buildElevationReport({
      lat,
      lng,
      accuracyM,
      deviceAlt,
      demAlt,
      locationInfo,
    });
  }
}

export const gnssElevationService = new GnssElevationService();
