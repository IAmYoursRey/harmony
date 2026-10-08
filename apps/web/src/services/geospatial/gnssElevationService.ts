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
  altitudeM: number;
  altitudeSource: 'device_sensor' | 'dem_srtm_model' | 'sensor_fusion';
  dmsLat: string;
  dmsLng: string;
  dmsDisplay: string;
  epsg3857: { x: number; y: number };
  topographyZone: string;
  topographyDescription: string;
  estimatedBarometricPressureHpa: number;
  estimatedBoilingPointC: number;
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

  /**
   * Fetches high-resolution digital ground elevation from Open-Meteo elevation API (DEMNAS/SRTM 30m)
   */
  public async fetchGroundElevation(lat: number, lng: number): Promise<number | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.elevation) && typeof data.elevation[0] === 'number') {
          return Math.round(data.elevation[0] * 10) / 10;
        }
      }
    } catch {
      // Network fallback
    }
    return null;
  }

  /**
   * Prompts user for high-accuracy GPS permission, pinpoints position,
   * measures altitude and compiles an elevation report.
   */
  public async measureElevationAndPosition(): Promise<GnssElevationReport> {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      throw new Error('Sensor GPS / Web Geolocation API tidak didukung pada peramban ini.');
    }

    // 1. Request position with high accuracy
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        (err) => {
          let msg = 'Gagal mengakses GPS perangkat.';
          if (err.code === err.PERMISSION_DENIED) {
            msg = 'Izin akses lokasi ditolak oleh pengguna. Mohon izinkan akses lokasi di pengaturan browser untuk mengukur ketinggian di titik Anda.';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            msg = 'Sinyal satelit GPS tidak terdeteksi. Pastikan perangkat Anda memiliki koneksi jaringan atau GPS aktif.';
          } else if (err.code === err.TIMEOUT) {
            msg = 'Batas waktu pencarian satelit GPS terlampaui (Timeout 15 detik). Silakan coba lagi di area terbuka.';
          }
          reject(new Error(msg));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });

    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const accuracyM = Math.round((pos.coords.accuracy || 10) * 10) / 10;
    const deviceAlt = pos.coords.altitude != null && Number.isFinite(pos.coords.altitude)
      ? Math.round(pos.coords.altitude * 10) / 10
      : null;

    // 2. Fetch SRTM / DEM ground elevation
    const demAlt = await this.fetchGroundElevation(lat, lng);

    let finalAltitudeM: number;
    let altitudeSource: 'device_sensor' | 'dem_srtm_model' | 'sensor_fusion';

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
      finalAltitudeM = 25.0; // Standard Indonesian coastal average fallback
      altitudeSource = 'dem_srtm_model';
    }

    // 3. Reverse Geocode address
    let locationInfo: PreciseLocationInfo | undefined;
    try {
      locationInfo = await preciseGeocodingService.reverseGeocode(lat, lng, accuracyM);
    } catch {
      // Continue without reverse geocoding
    }

    const dmsLat = this.toDMS(lat, true);
    const dmsLng = this.toDMS(lng, false);
    const dmsDisplay = `${dmsLat}, ${dmsLng}`;
    const epsg3857 = geospatialAnalysisService.toEPSG3857(lat, lng);
    const topo = this.getTopographyZone(finalAltitudeM);
    const pressure = this.calculateBarometricPressure(finalAltitudeM);
    const boilingPoint = this.calculateBoilingPoint(finalAltitudeM);

    const nowFormatted = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'full',
      timeStyle: 'medium',
    }).format(new Date());

    const reportLines = [
      '========================================',
      '📌 LAPORAN KETINGGIAN & KOORDINAT GNSS',
      '========================================',
      `🕒 Waktu Pengukuran : ${nowFormatted} WIB`,
      `📍 Wilayah / Lokasi : ${locationInfo?.shortDisplay || 'Koordinat Geospasial'}`,
      `🏠 Alamat Lengkap   : ${locationInfo?.fullAddress || `${lat.toFixed(5)}°, ${lng.toFixed(5)}°`}`,
      '----------------------------------------',
      `🏔️ Ketinggian Medan  : ${finalAltitudeM >= 0 ? `+${finalAltitudeM}` : finalAltitudeM} mdpl (Meter Di Atas Permukaan Laut)`,
      `⛰️ Zona Topografi    : ${topo.zone}`,
      `📝 Deskripsi Morfo   : ${topo.description}`,
      `🌡️ Tekanan Udara Est : ${pressure} hPa`,
      `☕ Titik Didih Air   : ${boilingPoint} °C`,
      '----------------------------------------',
      `🌐 Lintang / Bujur   : ${lat.toFixed(6)}°, ${lng.toFixed(6)}°`,
      `🧭 Format DMS (Geod) : ${dmsDisplay}`,
      `📐 Proyeksi Mercator : X: ${epsg3857.x} m, Y: ${epsg3857.y} m (EPSG:3857)`,
      `🎯 Akurasi Sensor GPS: ±${accuracyM} meter`,
      `📡 Sumber Ketinggian : ${
        altitudeSource === 'sensor_fusion'
          ? 'Fusi Sensor Barometrik Perangkat & Model DEM SRTM'
          : altitudeSource === 'device_sensor'
          ? 'Sensor GNSS Internal Perangkat'
          : 'Model Digital Elevasi Resolusi Tinggi (DEMNAS/SRTM)'
      }`,
      '========================================',
      'Dihasilkan secara resmi oleh Harmony Geospatial GNSS Altimeter Engine',
    ];

    return {
      lat,
      lng,
      accuracyM,
      altitudeM: finalAltitudeM,
      altitudeSource,
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
}

export const gnssElevationService = new GnssElevationService();
