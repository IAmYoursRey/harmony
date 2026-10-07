/**
 * Satellite Land Surface Temperature (LST) Service
 * USGS Landsat Collection 2 Level-2 Science Product (ST_B10) Engine
 * Reference: Cook et al., 2014 & USGS Landsat Surface Temperature Science Product Guide
 */

import { AnalysisEnvelope, DataStatus, DataProvenance } from './types';
import { aoiService, AreaOfInterest } from './aoiService';
import {
  findThermalAsset,
  findQaAsset,
  sanitizeAssetUrl,
  GeoTiffParser,
  GeoTiffMetadata,
  DecodedRasterPixel,
} from './rasterReaderService';

export {
  findThermalAsset,
  findQaAsset,
  sanitizeAssetUrl,
  GeoTiffParser,
};
export type { GeoTiffMetadata, DecodedRasterPixel };

export interface LSTPixelSample {
  lat: number;
  lng: number;
  rawDN: number;
  kelvin: number | null;
  celsius: number | null;
  qualityValid: boolean;
  cloudMasked: boolean;
}

export interface LSTAnalysisResult {
  sceneId: string;
  satellite: 'Landsat 8' | 'Landsat 9' | 'Landsat 7 ETM+' | 'Landsat 5 TM' | 'MODIS Terra/Aqua' | string;
  sensor: string;
  acquisitionDate: string;
  meanCelsius: number | null;
  minCelsius: number | null;
  maxCelsius: number | null;
  stdDevCelsius: number | null;
  validPixelCount: number;
  totalPixelCount: number;
  coverageFraction: number;
  urbanHeatIslandScore: number; // 0 - 100
  heatIslandNote?: string;
  classification: {
    extremeHeatPct: number; // >= 38 C
    highHeatPct: number;    // 32 - 38 C
    moderatePct: number;    // 24 - 32 C
    coolPct: number;        // < 24 C
  };
  histogram: { bin: string; count: number; minC: number; maxC: number }[];
  samples: LSTPixelSample[];
}

function isPointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function isPointInAoi(lat: number, lng: number, aoi: AreaOfInterest | null): boolean {
  if (!aoi || !aoi.geometry) return true;
  const geom = aoi.geometry;
  if (geom.type === 'Polygon') {
    const rings = geom.coordinates as number[][][];
    if (!rings || rings.length === 0) return true;
    if (!isPointInRing(lng, lat, rings[0])) return false;
    for (let k = 1; k < rings.length; k++) {
      if (isPointInRing(lng, lat, rings[k])) return false;
    }
    return true;
  }
  if (geom.type === 'MultiPolygon') {
    const polys = geom.coordinates as number[][][][];
    for (const poly of polys) {
      if (poly.length > 0 && isPointInRing(lng, lat, poly[0])) {
        let inHole = false;
        for (let k = 1; k < poly.length; k++) {
          if (isPointInRing(lng, lat, poly[k])) {
            inHole = true;
            break;
          }
        }
        if (!inHole) return true;
      }
    }
    return false;
  }
  if (aoi.bbox && aoi.bbox.length === 4) {
    const [minLng, minLat, maxLng, maxLat] = aoi.bbox;
    return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
  }
  return true;
}

export class LSTService {
  /**
   * USGS Landsat Collection 2 Level-2 Calibration Constants
   * Multiplicative Scale: 0.00341802
   * Additive Offset: 149.0
   * Resulting in degrees Kelvin. Subtract 273.15 to obtain Celsius.
   */
  public static readonly SCALE_FACTOR = 0.00341802;
  public static readonly ADDITIVE_OFFSET = 149.0;
  public static readonly KELVIN_TO_CELSIUS = 273.15;

  /**
   * Converts a single raw DN value to degrees Celsius depending on satellite sensor
   */
  public convertDNToCelsius(rawDN: number, satellite: string = 'Landsat 8'): number | null {
    if (rawDN === undefined || rawDN === null || isNaN(rawDN) || rawDN <= 0) {
      return null;
    }
    if (satellite === 'MODIS Terra/Aqua') {
      // MODIS LST (MOD11A1 / MYD11A1) scale factor: 0.02 (Kelvin)
      const kelvin = rawDN * 0.02;
      if (kelvin < 180 || kelvin > 373.15) return null;
      return parseFloat((kelvin - LSTService.KELVIN_TO_CELSIUS).toFixed(2));
    }
    // Landsat Collection 2 Level-2
    if (rawDN > 65535) return null;
    const kelvin = rawDN * LSTService.SCALE_FACTOR + LSTService.ADDITIVE_OFFSET;
    if (kelvin < 180 || kelvin > 373.15) return null;
    return parseFloat((kelvin - LSTService.KELVIN_TO_CELSIUS).toFixed(2));
  }

  public findThermalAsset(assets?: Record<string, any>) {
    return findThermalAsset(assets);
  }

  public findQaAsset(assets?: Record<string, any>) {
    return findQaAsset(assets);
  }

  public sanitizeAssetUrl(url: string) {
    return sanitizeAssetUrl(url);
  }

  public parseGeoTiffMetadata(buffer: ArrayBuffer) {
    return GeoTiffParser.parseMetadata(buffer);
  }

  public sampleGeoTiff(
    tBuffer: ArrayBuffer,
    tMeta: GeoTiffMetadata,
    qBuffer: ArrayBuffer | null,
    qMeta: GeoTiffMetadata | null,
    bounds: [number, number, number, number],
    gridSteps = 6
  ) {
    return GeoTiffParser.sampleWindow(tBuffer, tMeta, qBuffer, qMeta, bounds, gridSteps);
  }

  public createTestGeoTiffBuffer(params: {
    width: number;
    height: number;
    bbox: [number, number, number, number];
    data: Uint16Array;
  }) {
    return GeoTiffParser.createTestGeoTiffBuffer(params);
  }

  private activeRequestId: number = 0;
  private activeAbortController: AbortController | null = null;
  private activeContextKey: string = '';

  /**
   * Creates a new request context with cancellation of any pending prior context
   */
  public createRequestContext(contextKey: string, externalSignal?: AbortSignal) {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
    }
    this.activeRequestId++;
    const reqId = this.activeRequestId;
    this.activeAbortController = new AbortController();
    this.activeContextKey = contextKey;

    if (externalSignal) {
      if (externalSignal.aborted) {
        this.activeAbortController.abort();
      } else {
        externalSignal.addEventListener('abort', () => {
          if (this.activeRequestId === reqId) {
            this.activeAbortController?.abort();
          }
        });
      }
    }

    return {
      requestId: reqId,
      signal: this.activeAbortController.signal,
      isCurrent: () => this.activeRequestId === reqId && this.activeContextKey === contextKey,
    };
  }

  /**
   * Resets active request context, aborting any pending operations
   */
  public resetRequestContext(newContextKey: string = '') {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
    this.activeRequestId++;
    this.activeContextKey = newContextKey;
  }

  /**
   * Checks whether a request ID and context key represent the currently active execution
   */
  public isCurrentRequest(reqId: number, contextKey: string): boolean {
    return this.activeRequestId === reqId && this.activeContextKey === contextKey;
  }

  /**
   * Processes a grid/raster of thermal pixels within an AOI
   */
  public processThermalRaster(
    aoi: AreaOfInterest | null,
    sceneMetadata: {
      id: string;
      satellite: 'Landsat 8' | 'Landsat 9' | 'Landsat 7 ETM+' | 'Landsat 5 TM' | 'MODIS Terra/Aqua' | string;
      sensor?: string;
      acquisitionDate: string;
      cloudCoverPct?: number;
      isDemo?: boolean;
      crs?: string | null;
      compression?: number;
      isLittleEndian?: boolean;
    },
    rawPixelGrid: DecodedRasterPixel[]
  ): AnalysisEnvelope<LSTAnalysisResult> {
    const requestId = `lst-${Date.now()}`;
    const aoiHash = aoiService.computeCanonicalHash(aoi, { scene: sceneMetadata.id });

    if (!rawPixelGrid || rawPixelGrid.length === 0) {
      return {
        requestId,
        processingState: 'failed',
        dataStatus: 'UNAVAILABLE',
        data: null,
        reason: {
          code: 'NO_VALID_PIXELS',
          message: 'Tidak ada pixel raster termal yang tersedia pada AOI atau scene tersebut.',
          retryable: true,
        },
        aoiId: aoi?.id,
        aoiHash,
        parametersHash: aoiHash,
        provenance: this.createProvenance(sceneMetadata, 'UNAVAILABLE'),
      };
    }

    const samples: LSTPixelSample[] = [];
    const validPixelsMap = new Map<string, { celsius: number; rawDN: number }>();
    const allSampledPixelsMap = new Map<string, DecodedRasterPixel>();
    let hasOutsideAoi = false;
    let hasMissingQa = false;
    let hasCloudOrShadowCount = 0;
    let hasCalibrationOutOfRange = 0;

    rawPixelGrid.forEach((p) => {
      const insideAoi = isPointInAoi(p.lat, p.lng, aoi);
      if (!insideAoi) hasOutsideAoi = true;

      // QA must be explicitly valid and present (out of bounds or NoData is unverified)
      const hasQa = p.qaPixel !== undefined && p.qaPixel !== null && p.isQaValid !== false;
      if (!hasQa) hasMissingQa = true;

      let isCloudOrShadow = false;
      if (hasQa) {
        if (sceneMetadata.satellite === 'MODIS Terra/Aqua') {
          // MOD11A1 / MYD11A1 QC Bit Flags:
          const mandatoryQa = (p.qaPixel! & 0b11);
          if (mandatoryQa >= 2) {
            isCloudOrShadow = true;
          }
        } else {
          // Landsat Collection 2 Level-2 QA_PIXEL:
          // Bit 0: Fill, Bit 1: Dilated Cloud, Bit 2: Cirrus (high confidence), Bit 3: Cloud, Bit 4: Cloud Shadow
          const fill = (p.qaPixel! & 1) !== 0;
          const dilatedCloud = (p.qaPixel! & (1 << 1)) !== 0;
          const cirrus = (p.qaPixel! & (1 << 2)) !== 0;
          const cloud = (p.qaPixel! & (1 << 3)) !== 0;
          const shadow = (p.qaPixel! & (1 << 4)) !== 0;
          if (fill || dilatedCloud || cirrus || cloud || shadow) {
            isCloudOrShadow = true;
          }
        }
      }

      if (isCloudOrShadow) hasCloudOrShadowCount++;

      const isRawValid = p.isRawDnValid !== false && p.rawDN > 0;
      const c = isRawValid ? this.convertDNToCelsius(p.rawDN, sceneMetadata.satellite) : null;
      const isTempInRange = c !== null && c >= -70 && c <= 80;
      if (c !== null && !isTempInRange) hasCalibrationOutOfRange++;

      // Strict validity: inside AOI, QA verified present & clear, valid radiometric temperature
      const isValid = insideAoi && hasQa && !isCloudOrShadow && isTempInRange && isRawValid;

      const key = p.pixelKey || `${p.sourceCol ?? p.lng}_${p.sourceRow ?? p.lat}`;
      if (!allSampledPixelsMap.has(key)) {
        allSampledPixelsMap.set(key, p);
      }

      if (isValid && c !== null) {
        if (!validPixelsMap.has(key)) {
          validPixelsMap.set(key, { celsius: c, rawDN: p.rawDN });
        }
      }

      samples.push({
        lat: p.lat,
        lng: p.lng,
        rawDN: p.rawDN,
        kelvin: c !== null ? parseFloat((c + LSTService.KELVIN_TO_CELSIUS).toFixed(2)) : null,
        celsius: c !== null ? c : null,
        qualityValid: isValid,
        cloudMasked: isCloudOrShadow,
      });
    });

    const uniqueValidCount = validPixelsMap.size;
    const uniqueSampledCount = allSampledPixelsMap.size;
    const coverageFraction = uniqueSampledCount > 0
      ? parseFloat((uniqueValidCount / uniqueSampledCount).toFixed(3))
      : 0;

    if (uniqueValidCount === 0) {
      let reasonCode = 'NO_VALID_PIXELS';
      let reasonMsg = 'Seluruh pixel pada AOI tidak memenuhi kriteria validitas radiometrik atau geospasial.';

      if (hasMissingQa) {
        reasonCode = 'QA_UNVERIFIED';
        reasonMsg = 'Pixel raster termal tidak memiliki band QA valid (kualitas awan/fill belum diverifikasi atau berada di luar cakupan).';
      } else if (hasOutsideAoi && rawPixelGrid.every((p) => !isPointInAoi(p.lat, p.lng, aoi))) {
        reasonCode = 'OUTSIDE_AOI';
        reasonMsg = 'Seluruh pixel raster berada di luar batas poligon AOI.';
      } else if (hasCalibrationOutOfRange > 0 && uniqueValidCount === 0 && hasCloudOrShadowCount === 0) {
        reasonCode = 'CALIBRATION_OUT_OF_RANGE';
        reasonMsg = 'Nilai radiometrik raster berada di luar rentang kalibrasi fisik sensor.';
      } else if (hasCloudOrShadowCount > 0) {
        reasonCode = 'CLOUD_OR_SHADOW';
        reasonMsg = 'Seluruh pixel pada AOI tertutup awan, bayangan, atau berupa nilai fill/nodata.';
      }

      const emptyResult: LSTAnalysisResult = {
        sceneId: sceneMetadata.id,
        satellite: sceneMetadata.satellite,
        sensor: sceneMetadata.sensor || (sceneMetadata.satellite === 'MODIS Terra/Aqua' ? 'MODIS' : 'TIRS-2'),
        acquisitionDate: sceneMetadata.acquisitionDate,
        meanCelsius: null,
        minCelsius: null,
        maxCelsius: null,
        stdDevCelsius: null,
        validPixelCount: 0,
        totalPixelCount: uniqueSampledCount,
        coverageFraction: 0,
        urbanHeatIslandScore: 0,
        classification: { extremeHeatPct: 0, highHeatPct: 0, moderatePct: 0, coolPct: 0 },
        histogram: [],
        samples: samples.slice(0, 100),
      };

      return {
        requestId,
        processingState: 'succeeded',
        dataStatus: 'UNAVAILABLE',
        data: emptyResult,
        reason: {
          code: reasonCode,
          message: reasonMsg,
          retryable: false,
        },
        aoiId: aoi?.id,
        aoiHash,
        parametersHash: aoiHash,
        provenance: this.createProvenance(sceneMetadata, 'UNAVAILABLE', 0, uniqueSampledCount, aoi),
      };
    }

    const validCelsiusValues = Array.from(validPixelsMap.values()).map(v => v.celsius);
    const minCelsius = Math.min(...validCelsiusValues);
    const maxCelsius = Math.max(...validCelsiusValues);
    const sum = validCelsiusValues.reduce((a, b) => a + b, 0);
    const meanCelsius = parseFloat((sum / validCelsiusValues.length).toFixed(2));

    const variance =
      validCelsiusValues.reduce((acc, v) => acc + Math.pow(v - meanCelsius, 2), 0) /
      validCelsiusValues.length;
    const stdDevCelsius = parseFloat(Math.sqrt(variance).toFixed(2));

    // Classification breakdown
    const extreme = validCelsiusValues.filter((v) => v >= 38.0).length;
    const high = validCelsiusValues.filter((v) => v >= 32.0 && v < 38.0).length;
    const moderate = validCelsiusValues.filter((v) => v >= 24.0 && v < 32.0).length;
    const cool = validCelsiusValues.filter((v) => v < 24.0).length;

    const totalValid = validCelsiusValues.length;
    const extremeHeatPct = parseFloat(((extreme / totalValid) * 100).toFixed(1));
    const highHeatPct = parseFloat(((high / totalValid) * 100).toFixed(1));
    const moderatePct = parseFloat(((moderate / totalValid) * 100).toFixed(1));
    const coolPct = parseFloat(((cool / totalValid) * 100).toFixed(1));

    // Urban Heat Island Score: weighted percentage of high and extreme heat
    const uhiScore = Math.min(100, Math.round(extremeHeatPct * 1.0 + highHeatPct * 0.6));

    // Dynamic Histogram (5 bins) — exact bucketing ensures every pixel counted once
    const histogram: { bin: string; count: number; minC: number; maxC: number }[] = [];
    const range = maxCelsius - minCelsius;
    if (range <= 1e-6) {
      histogram.push({
        bin: `${minCelsius.toFixed(1)}°C`,
        count: totalValid,
        minC: minCelsius,
        maxC: maxCelsius,
      });
    } else {
      const counts = [0, 0, 0, 0, 0];
      const step = range / 5;
      for (const v of validCelsiusValues) {
        let binIdx = Math.floor((v - minCelsius) / step);
        if (binIdx >= 5) binIdx = 4;
        if (binIdx < 0) binIdx = 0;
        counts[binIdx]++;
      }
      for (let i = 0; i < 5; i++) {
        const rawMin = minCelsius + i * step;
        const rawMax = minCelsius + (i + 1) * step;
        histogram.push({
          bin: `${rawMin.toFixed(1)}° - ${rawMax.toFixed(1)}°C`,
          count: counts[i],
          minC: parseFloat(rawMin.toFixed(2)),
          maxC: parseFloat(rawMax.toFixed(2)),
        });
      }
    }

    const result: LSTAnalysisResult = {
      sceneId: sceneMetadata.id,
      satellite: sceneMetadata.satellite,
      sensor: sceneMetadata.sensor || (sceneMetadata.satellite === 'MODIS Terra/Aqua' ? 'MODIS' : 'TIRS-2'),
      acquisitionDate: sceneMetadata.acquisitionDate,
      meanCelsius,
      minCelsius,
      maxCelsius,
      stdDevCelsius,
      validPixelCount: uniqueValidCount,
      totalPixelCount: uniqueSampledCount,
      coverageFraction,
      urbanHeatIslandScore: uhiScore,
      heatIslandNote: 'Skor indeks konsentrasi panas permukaan ilustratif berbasis proporsi area bersuhu tinggi, belum memperhitungkan baseline termal rural non-urban secara diferensial.',
      classification: {
        extremeHeatPct,
        highHeatPct,
        moderatePct,
        coolPct,
      },
      histogram,
      samples: samples.slice(0, 100),
    };

    const isDemo = Boolean(sceneMetadata.isDemo);
    const finalDataStatus: DataStatus = isDemo ? 'DEMO' : 'DERIVED';

    return {
      requestId,
      processingState: 'succeeded',
      dataStatus: finalDataStatus,
      data: result,
      aoiId: aoi?.id,
      aoiHash,
      parametersHash: aoiHash,
      provenance: this.createProvenance(sceneMetadata, finalDataStatus, uniqueValidCount, uniqueSampledCount, aoi),
    };
  }

  private createProvenance(
    scene: { id: string; satellite: string; acquisitionDate: string; isDemo?: boolean; crs?: string | null; pixelScale?: { dx: number; dy: number; dz: number } | null },
    dataStatus: DataStatus,
    validPixelCount = 0,
    totalPixelCount = 0,
    aoi: AreaOfInterest | null = null
  ): AnalysisEnvelope<any>['provenance'] {
    const isDemo = Boolean(scene.isDemo) || dataStatus === 'DEMO';
    const isModis = scene.satellite === 'MODIS Terra/Aqua';
    let pixelAreaKm2 = isModis ? 1.0 : 0.0009; // default 30m = 0.0009 km2
    if (scene.pixelScale && scene.pixelScale.dx > 0 && scene.pixelScale.dy > 0) {
      const isProjectedMeters = scene.crs?.startsWith('EPSG:326') || scene.crs?.startsWith('EPSG:327') || scene.crs === 'EPSG:3857';
      if (isProjectedMeters) {
        const dxKm = scene.pixelScale.dx / 1000;
        const dyKm = scene.pixelScale.dy / 1000;
        pixelAreaKm2 = dxKm * dyKm;
      } else {
        let centerLat = -7;
        if (aoi && aoi.bbox && aoi.bbox.length === 4) {
          centerLat = (aoi.bbox[1] + aoi.bbox[3]) / 2;
        } else if (typeof (scene as any).centerLat === 'number') {
          centerLat = (scene as any).centerLat;
        } else if (typeof (scene as any).lat === 'number') {
          centerLat = (scene as any).lat;
        }
        const latRad = centerLat * (Math.PI / 180);
        const dxKm = scene.pixelScale.dx * 111.32 * Math.cos(latRad);
        const dyKm = scene.pixelScale.dy * 110.57;
        pixelAreaKm2 = dxKm * dyKm;
      }
    }
    let validAreaKm2 = parseFloat((validPixelCount * pixelAreaKm2).toFixed(4));

    // If an AOI with smaller bounds than the pixel coverage is provided, clip area to actual AOI size
    if (aoi && aoi.bbox && aoi.bbox.length === 4) {
      const [minLng, minLat, maxLng, maxLat] = aoi.bbox;
      const avgLatRad = ((minLat + maxLat) / 2) * (Math.PI / 180);
      const widthKm = Math.abs(maxLng - minLng) * 111.32 * Math.cos(avgLatRad);
      const heightKm = Math.abs(maxLat - minLat) * 110.57;
      const aoiArea = widthKm * heightKm;
      if (aoiArea > 0 && aoiArea < validAreaKm2) {
        validAreaKm2 = parseFloat(aoiArea.toFixed(4));
      }
    }

    const crs = scene.crs || (isDemo ? 'EPSG:4326' : null);

    if (isDemo) {
      return {
        sourceType: 'DEMONSTRATION',
        provider: 'Simulasi Ilustratif / Harmony Demo',
        dataset: 'Harmony — Contoh Kalibrasi Termal Band Ilustratif',
        endpointOrAsset: scene.id,
        acquisitionTime: scene.acquisitionDate,
        processingTime: new Date().toISOString(),
        dataStatus: 'DEMO',
        crs,
        spatialResolution: '30m piksel simulasi (kisi ilustrasi)',
        license: 'Demonstration Only',
        attribution: 'Data simulasi ilustratif untuk demonstrasi kalibrasi Landsat 9 TIRS-2; bukan observasi operasional.',
        algorithmVersion: 'Harmony Thermal Calibration Demo v1.0',
        sourceItemIds: [scene.id],
        validPixelCount,
        validAreaKm2,
        coverageFraction: totalPixelCount > 0 ? parseFloat((validPixelCount / totalPixelCount).toFixed(3)) : 0,
        assumptions: [
          'PERINGATAN DEMO: Nilai piksel dihasilkan sebagai simulasi edukasi kalibrasi DN ke Celsius.',
          'Data ini BUKAN observasi satelit operasional dan tidak boleh digunakan untuk analisis iklim/lingkungan nyata.',
        ],
      };
    }

    return {
      sourceType: 'SATELLITE_RASTER',
      provider: isModis ? 'NASA LP DAAC / USGS EROS' : 'USGS / NASA Landsat Mission',
      agency: isModis ? 'NASA EOSDIS / USGS' : 'U.S. Geological Survey (USGS)',
      dataset: isModis
        ? 'MODIS Terra/Aqua Land Surface Temperature (MOD11A1 / MYD11A1 Collection 6.1)'
        : 'Landsat Collection 2 Level-2 Surface Temperature (ST_B10)',
      endpointOrAsset: scene.id,
      acquisitionTime: scene.acquisitionDate,
      processingTime: new Date().toISOString(),
      dataStatus,
      crs,
      spatialResolution: isModis ? '1000m GSD (Sinusoidal grid)' : '100m resampled to 30m GSD',
      license: isModis ? 'NASA Open Data Policy' : 'USGS Public Domain / Open Data',
      attribution: isModis
        ? 'NASA LP DAAC MOD11A1 / MYD11A1 Collection 6.1 LST courtesy of NASA EOSDIS'
        : 'USGS Landsat Collection 2 Level-2 Surface Temperature courtesy of the U.S. Geological Survey',
      algorithmVersion: isModis ? 'MODIS Collection 6.1 Split-Window (Wan et al.)' : 'USGS L2ST v1.3.0',
      sourceItemIds: [scene.id],
      validPixelCount,
      validAreaKm2,
      coverageFraction: totalPixelCount > 0 ? parseFloat((validPixelCount / totalPixelCount).toFixed(3)) : 0,
      assumptions: isModis
        ? [
            'Produk adalah Suhu Permukaan Daratan (LST) radiometrik sensor MODIS Terra/Aqua 1000m, BUKAN suhu udara 2 meter atau model cuaca NWP.',
            'Koreksi emisivitas menggunakan algoritma split-window Wan et al. berbasis band 31 & 32.',
            'QC bitmask MODIS (QC_Day/QC_Night) dievaluasi: bit 0-1 bernilai 0 (good quality) atau 1 (other quality) diproses, sedangkan bit 2/3 (awan/tidak terproduksi) dieksklusi.',
          ]
        : [
            'Produk adalah Suhu Permukaan Daratan (LST) radiometrik satelit, BUKAN suhu udara 2 meter atau model cuaca NWP.',
            'Koreksi atmosfer menggunakan model MODTRAN & profil atmosfer Reanalysis NCEP/MERRA-2 oleh USGS.',
            'Pixel dengan mask awan/bayangan (QA_PIXEL) dieksklusi dari perhitungan statistik.',
          ],
    };
  }
}

export const lstService = new LSTService();
