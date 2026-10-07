/**
 * NASA FIRMS & SiPongi Fire Hotspot Service
 * Processes Near Real-Time (NRT) satellite thermal anomalies from VIIRS (375m) and MODIS (1km)
 * Adheres strictly to NASA EOSDIS API contracts & KLHK SiPongi references.
 */

import { AnalysisEnvelope, DataStatus, DataProvenance } from './types';
import { aoiService, AreaOfInterest } from './aoiService';

export interface HotspotRecord {
  id: string;
  latitude: number;
  longitude: number;
  brightnessKelvin: number | null;
  scanKm: number | null;
  trackKm: number | null;
  acqDate: string;
  acqTimeUtc: string;
  satellite: 'Suomi-NPP' | 'NOAA-20' | 'NOAA-21' | 'Terra' | 'Aqua' | string;
  instrument: 'VIIRS' | 'MODIS' | string;
  confidenceRaw: string | number;
  confidenceLevel: 'low' | 'nominal' | 'high' | 'unknown';
  confidenceNumeric?: number; // Only for MODIS (0-100%)
  frpMw: number | null; // Fire Radiative Power in MegaWatts
  dayNight: 'D' | 'N' | 'unknown';
  systemSource: 'NASA_FIRMS' | 'SIPONGI_KLHK_IMPORT' | 'USER_CSV_IMPORT' | 'DEMO';
}

export interface HotspotAnalysisResult {
  totalDetections: number;
  filteredInAoi: number;
  highConfidenceCount: number;
  nominalConfidenceCount: number;
  lowConfidenceCount: number;
  maxFrpMw: number | null;
  meanFrpMw: number | null;
  totalFrpMw: number | null;
  sensorBreakdown: Record<string, number>;
  hotspots: HotspotRecord[];
  queryBBox: [number, number, number, number];
  daysRange: number;
  sipongiNote: string;
}

export class FirmsService {
  /**
   * Parse raw NASA FIRMS CSV text into normalized HotspotRecord[]
   */
  public parseFirmsCsv(csvText: string, systemSource: 'NASA_FIRMS' | 'SIPONGI_KLHK_IMPORT' | 'USER_CSV_IMPORT' | 'DEMO' = 'NASA_FIRMS'): HotspotRecord[] {
    if (!csvText || typeof csvText !== 'string' || csvText.trim().length === 0) {
      return [];
    }

    const lines = csvText.trim().replace(/^\uFEFF/, '').split(/\r?\n/);
    if (lines.length < 2) return [];

    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const latIdx = header.indexOf('latitude');
    const lonIdx = header.indexOf('longitude');
    const brightIdx = header.indexOf('bright_ti4') !== -1 ? header.indexOf('bright_ti4') : header.indexOf('brightness');
    const scanIdx = header.indexOf('scan');
    const trackIdx = header.indexOf('track');
    const dateIdx = header.indexOf('acq_date');
    const timeIdx = header.indexOf('acq_time');
    const satIdx = header.indexOf('satellite');
    const instIdx = header.indexOf('instrument');
    const confIdx = header.indexOf('confidence');
    const frpIdx = header.indexOf('frp');
    const dnIdx = header.indexOf('daynight');

    if (latIdx === -1 || lonIdx === -1 || dateIdx === -1 || timeIdx === -1) {
      return [];
    }

    const records: HotspotRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(',');
      if (cols.length !== header.length || !cols[latIdx]?.trim() || !cols[lonIdx]?.trim()) continue;
      const lat = Number(cols[latIdx]);
      const lon = Number(cols[lonIdx]);

      if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;

      const rawConf = confIdx !== -1 && cols[confIdx] !== undefined ? cols[confIdx].trim() : '';
      let confidenceLevel: 'low' | 'nominal' | 'high' | 'unknown' = 'unknown';
      let confidenceNumeric: number | undefined = undefined;

      const numConf = parseFloat(rawConf);
      if (!isNaN(numConf) && isFinite(numConf) && numConf >= 0 && numConf <= 100) {
        confidenceNumeric = numConf;
        if (numConf >= 80) confidenceLevel = 'high';
        else if (numConf >= 30) confidenceLevel = 'nominal';
        else if (numConf >= 0) confidenceLevel = 'low';
      } else if (rawConf) {
        const lower = rawConf.toLowerCase();
        if (lower === 'h' || lower === 'high') confidenceLevel = 'high';
        else if (lower === 'n' || lower === 'nominal') confidenceLevel = 'nominal';
        else if (lower === 'l' || lower === 'low') confidenceLevel = 'low';
        else confidenceLevel = 'unknown';
      }

      const rawFrp = frpIdx !== -1 && cols[frpIdx] !== undefined ? parseFloat(cols[frpIdx]) : null;
      const frpMw = rawFrp !== null && !isNaN(rawFrp) && isFinite(rawFrp) && rawFrp >= 0 ? rawFrp : null;

      const satelliteCode = satIdx !== -1 ? cols[satIdx]?.trim() || 'Unknown' : 'Unknown';
      const satelliteName =
        satelliteCode === 'N' || satelliteCode === 'SNPP'
          ? 'Suomi-NPP'
          : satelliteCode === '20' || satelliteCode === 'NOAA-20'
          ? 'NOAA-20'
          : satelliteCode === '21' || satelliteCode === 'NOAA-21'
          ? 'NOAA-21'
          : satelliteCode === 'T'
          ? 'Terra'
          : satelliteCode === 'A'
          ? 'Aqua'
          : satelliteCode;

      const instrument = instIdx !== -1 && cols[instIdx] ? cols[instIdx].trim() : 'UNKNOWN';
      const acqTime = timeIdx !== -1 && cols[timeIdx] ? cols[timeIdx].trim() : '';
      const normalizedTime = /^\d{1,4}$/.test(acqTime) ? acqTime.padStart(4, '0') : '';
      const formattedTime = normalizedTime && Number(normalizedTime.slice(0, 2)) < 24 && Number(normalizedTime.slice(2)) < 60 ? `${normalizedTime.slice(0, 2)}:${normalizedTime.slice(2)} UTC` : 'Unknown';

      const rawBright = brightIdx !== -1 && cols[brightIdx] ? parseFloat(cols[brightIdx]) : NaN;
      const brightnessKelvin = !isNaN(rawBright) && isFinite(rawBright) && rawBright > 0 ? rawBright : null;

      const rawScan = scanIdx !== -1 && cols[scanIdx] ? parseFloat(cols[scanIdx]) : NaN;
      const scanKm = !isNaN(rawScan) && isFinite(rawScan) && rawScan > 0 ? rawScan : null;

      const rawTrack = trackIdx !== -1 && cols[trackIdx] ? parseFloat(cols[trackIdx]) : NaN;
      const trackKm = !isNaN(rawTrack) && isFinite(rawTrack) && rawTrack > 0 ? rawTrack : null;

      const acqDate = dateIdx !== -1 && cols[dateIdx] && cols[dateIdx].trim().length > 0 ? cols[dateIdx].trim() : 'Unknown';

      const stamp = Date.parse(`${acqDate}T${normalizedTime.slice(0,2)}:${normalizedTime.slice(2)}:00.000Z`);
      if (formattedTime === 'Unknown' || !Number.isFinite(stamp) || new Date(stamp).toISOString().slice(0,10) !== acqDate) continue;

      const rawDn = dnIdx !== -1 && cols[dnIdx] ? cols[dnIdx].trim().toUpperCase() : '';
      const dayNight: 'D' | 'N' | 'unknown' = rawDn === 'D' ? 'D' : rawDn === 'N' ? 'N' : 'unknown';

      records.push({
        id: `${instrument}:${satelliteCode}:${acqDate}:${normalizedTime}:${lat}:${lon}`,
        latitude: lat,
        longitude: lon,
        brightnessKelvin,
        scanKm: scanKm ?? (instrument === 'VIIRS' ? 0.375 : 1.0),
        trackKm: trackKm ?? (instrument === 'VIIRS' ? 0.375 : 1.0),
        acqDate,
        acqTimeUtc: formattedTime,
        satellite: satelliteName,
        instrument,
        confidenceRaw: rawConf || 'unknown',
        confidenceLevel,
        confidenceNumeric,
        frpMw,
        dayNight,
        systemSource,
      });
    }

    return records;
  }

  /**
   * Filter hotspots within an AOI (Point-in-Polygon with holes support)
   */
  public filterHotspotsInAOI(hotspots: HotspotRecord[], aoi: AreaOfInterest | null): HotspotRecord[] {
    if (!aoi) return hotspots;
    const polygons = aoi.geometry.type === 'MultiPolygon'
      ? aoi.geometry.coordinates as [number, number][][][]
      : [aoi.geometry.coordinates as [number, number][][]];
    return hotspots.filter(h => polygons.some(rings => rings.length > 0 &&
      aoiService.isPointInPolygonWithHoles([h.longitude, h.latitude], rings)));
  }

  /**
   * Complete Hotspot Analysis Workflow
   */
  public analyzeHotspots(
    rawCsvText: string,
    aoi: AreaOfInterest | null,
    bbox: [number, number, number, number],
    daysRange = 1,
    minConfidence: 'all' | 'nominal_high' | 'high_only' = 'all',
    systemSource: 'NASA_FIRMS' | 'SIPONGI_KLHK_IMPORT' | 'USER_CSV_IMPORT' | 'DEMO' = 'NASA_FIRMS'
  ): AnalysisEnvelope<HotspotAnalysisResult> {
    const requestId = `firms-${Date.now()}`;
    const aoiHash = aoiService.computeCanonicalHash(aoi, { bbox, daysRange, minConfidence, systemSource });

    const allRecords = this.parseFirmsCsv(rawCsvText, systemSource);
    const csvLines = rawCsvText.trim().replace(/^\uFEFF/, '').split(/\r?\n/);
    const headers = csvLines[0].split(',').map(h => h.trim().toLowerCase());
    const invalidImport = rawCsvText.trim() && (!['latitude', 'longitude', 'acq_date', 'acq_time'].every(h => headers.includes(h)) || csvLines.slice(1).some(line => line.trim()) && allRecords.length === 0);
    if (invalidImport) return {
      requestId, processingState: 'failed', dataStatus: 'UNAVAILABLE', data: null,
      parametersHash: aoiHash, aoiId: aoi?.id, aoiHash,
      reason: { code: 'INVALID_CSV', message: 'CSV tidak valid atau semua rekamannya ditolak. Ini bukan hasil nol deteksi.', retryable: false },
      provenance: { sourceType: 'USER_SUPPLIED', provider: 'Harmony CSV validation', dataset: systemSource,
        dataStatus: 'UNAVAILABLE', crs: 'EPSG:4326', algorithmVersion: 'firms-csv-validation-v1', attribution: 'Data CSV belum lolos pemeriksaan.' },
    };

    // Confidence filter
    let candidateRecords = allRecords;
    if (minConfidence === 'nominal_high') {
      candidateRecords = allRecords.filter((r) => r.confidenceLevel === 'nominal' || r.confidenceLevel === 'high');
    } else if (minConfidence === 'high_only') {
      candidateRecords = allRecords.filter((r) => r.confidenceLevel === 'high');
    }

    // Spatial filter
    const [west, south, east, north] = bbox;
    const inBboxRecords = candidateRecords.filter(h => h.latitude >= south && h.latitude <= north &&
      (west <= east ? h.longitude >= west && h.longitude <= east : h.longitude >= west || h.longitude <= east));
    const inAoiRecords = aoi ? this.filterHotspotsInAOI(inBboxRecords, aoi) : inBboxRecords;

    const sensorBreakdown: Record<string, number> = {};
    let highCount = 0;
    let nomCount = 0;
    let lowCount = 0;
    let maxFrp: number | null = null;
    let totalFrpNum = 0;
    let frpCount = 0;

    for (let i = 0; i < inAoiRecords.length; i++) {
      const h = inAoiRecords[i];
      sensorBreakdown[h.instrument] = (sensorBreakdown[h.instrument] || 0) + 1;
      if (h.confidenceLevel === 'high') highCount++;
      else if (h.confidenceLevel === 'nominal') nomCount++;
      else if (h.confidenceLevel === 'low') lowCount++;

      if (h.frpMw !== null) {
        if (maxFrp === null || h.frpMw > maxFrp) maxFrp = h.frpMw;
        totalFrpNum += h.frpMw;
        frpCount++;
      }
    }

    const totalFrp = frpCount > 0 ? parseFloat(totalFrpNum.toFixed(1)) : null;
    const meanFrp = frpCount > 0 ? parseFloat((totalFrpNum / frpCount).toFixed(1)) : null;

    const result: HotspotAnalysisResult = {
      totalDetections: allRecords.length,
      filteredInAoi: inAoiRecords.length,
      highConfidenceCount: highCount,
      nominalConfidenceCount: nomCount,
      lowConfidenceCount: lowCount,
      maxFrpMw: maxFrp,
      meanFrpMw: meanFrp,
      totalFrpMw: totalFrp,
      sensorBreakdown,
      hotspots: inAoiRecords,
      queryBBox: bbox,
      daysRange,
      sipongiNote:
        'Data deteksi bersumber dari NASA FIRMS (VIIRS 375m & MODIS 1km). Sistem SiPongi KLHK merupakan portal nasional terpisah; rujukan portal resmi: https://sipongi.menlhk.go.id',
    };

    const dataStatus: DataStatus =
      systemSource === 'DEMO'
        ? 'DEMO'
        : systemSource === 'USER_CSV_IMPORT' || systemSource === 'SIPONGI_KLHK_IMPORT'
        ? 'IMPORTED'
        : allRecords.length === 0
        ? 'NOT_AVAILABLE'
        : 'LIVE';

    const sourceType =
      systemSource === 'DEMO'
        ? 'DEMONSTRATION'
        : systemSource === 'USER_CSV_IMPORT' || systemSource === 'SIPONGI_KLHK_IMPORT'
        ? 'USER_SUPPLIED'
        : 'SENSOR_OBSERVATION';

    return {
      requestId,
      processingState: 'succeeded',
      dataStatus,
      data: result,
      aoiId: aoi?.id,
      aoiHash,
      parametersHash: aoiHash,
      provenance: {
        sourceType,
        provider:
          systemSource === 'DEMO'
            ? 'Harmony Geospatial Demo Sandbox (Bukan Data Operasional)'
            : systemSource === 'SIPONGI_KLHK_IMPORT'
            ? 'Impor Berkas Resmi SiPongi KLHK'
            : systemSource === 'USER_CSV_IMPORT'
            ? 'Impor Berkas CSV Pengguna (Arsip / Sumber Mandiri)'
            : 'NASA EOSDIS / LANCE FIRMS',
        agency:
          systemSource === 'DEMO'
            ? 'Simulasi'
            : systemSource === 'SIPONGI_KLHK_IMPORT'
            ? 'KLHK RI'
            : systemSource === 'USER_CSV_IMPORT'
            ? 'Unggahan Pengguna'
            : 'NASA & University of Maryland',
        dataset:
          systemSource === 'DEMO'
            ? 'Dataset Contoh Hotspot Demonstrasi'
            : systemSource === 'USER_CSV_IMPORT'
            ? 'Deteksi Titik Panas CSV Pengguna'
            : 'FIRMS Near Real-Time Active Fire / Thermal Anomaly Data',
        acquisitionTime: inAoiRecords[0]?.acqDate || 'Tidak Tersedia',
        processingTime: new Date().toISOString(),
        dataStatus,
        crs: 'EPSG:4326',
        spatialResolution: 'VIIRS 375m I-Band / MODIS 1000m',
        license: systemSource === 'DEMO' ? 'Demonstration Only' : 'NASA Open Data Policy (Earthdata)',
        attribution:
          systemSource === 'DEMO'
            ? 'Contoh demonstrasi untuk pengujian visual UI'
            : systemSource === 'USER_CSV_IMPORT'
            ? 'Berkas CSV yang diunggah pengguna'
            : 'NASA FIRMS data courtesy of LANCE / EOSDIS',
        algorithmVersion: 'VIIRS VNP14IMGTDL_NRT / MODIS MCD14DL',
        validPixelCount: inAoiRecords.length,
        // A share of point detections is not spatial coverage of the AOI.
        coverageFraction: undefined,
        assumptions: [
          'Titik deteksi termal adalah anomali suhu piksel satelit, bukan kebakaran terverifikasi di darat.',
          'Satu deteksi piksel tidak mencerminkan luas area terbakar maupun jumlah titik api riil.',
          'SiPongi KLHK dan NASA FIRMS adalah dua sistem terpisah walaupun menggunakan sensor ruang angkasa serupa.',
        ],
      },
    };
  }
}

export const firmsService = new FirmsService();
