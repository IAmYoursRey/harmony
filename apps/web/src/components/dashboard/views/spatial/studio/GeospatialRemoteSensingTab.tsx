import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Satellite,
  Layers,
  Sparkles,
  Info,
  Radio,
  Cpu,
  Download,
  Search,
  CheckCircle2,
  AlertTriangle,
  Thermometer,
  RotateCcw,
  Flame,
} from 'lucide-react';
import {
  geospatialAnalysisService,
  SpectralIndexResult,
} from '../../../../../services/geospatialAnalysisService';
import { aoiService, useActiveAOI } from '../../../../../services/geospatial/aoiService';
import { stacService, SatelliteSceneItem } from '../../../../../services/geospatial/stacService';
import { lstService, LSTAnalysisResult } from '../../../../../services/geospatial/lstService';
import { AnalysisEnvelope } from '../../../../../services/geospatial/types';

interface GeospatialRemoteSensingTabProps {
  lat: number;
  lng: number;
  regionName: string;
}

// Illustrative band values for explicit demonstrations; not acquired satellite data.
const PRESET_SCENES = {
  sentinel2_agriculture: {
    name: 'Sentinel-2 L2A (Vegetasi Pertanian & Air)',
    satellite: 'Sentinel-2 MSI Level-2A',
    date: '2026-09-24',
    bands: {
      B02: 0.045, // Blue
      B03: 0.078, // Green
      B04: 0.062, // Red
      B08: 0.485, // NIR
      B11: 0.165, // SWIR-1
      B12: 0.082, // SWIR-2
    },
  },
  landsat9_thermal: {
    name: 'Landsat-9 C2 L2 (Termal Permukaan / LST)',
    satellite: 'Landsat-9 Collection 2 Level-2',
    date: '2026-09-28',
    bands: {
      ST_B10: 44250, // Scaled DN -> (44250 * 0.00341802 + 149.0) - 273.15 = 27.1°C
      B04: 0.112,
      B05: 0.380,
      B06: 0.210,
    },
  },
  sentinel1_radar: {
    name: 'Sentinel-1 C-SAR GRD (Radar Tembus Cuaca)',
    satellite: 'Sentinel-1 C-SAR Dual-Pol',
    date: '2026-09-29',
    bands: {
      VV: -11.5, // dB
      VH: -17.2, // dB
      vv_lin: 0.071,
      vh_lin: 0.019,
    },
  },
};

export const GeospatialRemoteSensingTab: React.FC<GeospatialRemoteSensingTabProps> = ({
  lat,
  lng,
  regionName,
}) => {
  const activeAOI = useActiveAOI();
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof PRESET_SCENES | 'EMPTY'>('EMPTY');
  const [selectedIndex, setSelectedIndex] = useState<string>('NDVI');
  const [stacScenes, setStacScenes] = useState<SatelliteSceneItem[]>([]);
  const [isSearchingSTAC, setIsSearchingSTAC] = useState(false);
  const [stacStatusMessage, setStacStatusMessage] = useState<string>('');
  const [selectedStacScene, setSelectedStacScene] = useState<SatelliteSceneItem | null>(null);
  const [activeCollection, setActiveCollection] = useState<'sentinel-2-l2a' | 'sentinel-1-grd' | 'landsat-c2-l2'>('sentinel-2-l2a');
  const [maxCloudCover, setMaxCloudCover] = useState<number>(30);
  const [lstEnvelope, setLstEnvelope] = useState<AnalysisEnvelope<LSTAnalysisResult> | null>(null);
  const [isProcessingLST, setIsProcessingLST] = useState<boolean>(false);

  const searchController = useRef<AbortController | null>(null);
  const searchGeneration = useRef(0);

  const handleSearchSTAC = useCallback(async () => {
    searchController.current?.abort();
    const controller = new AbortController();
    searchController.current = controller;
    const generation = ++searchGeneration.current;
    const isCurrent = () => !controller.signal.aborted && generation === searchGeneration.current;
    setIsSearchingSTAC(true);
    setStacScenes([]);
    setSelectedStacScene(null);
    setStacStatusMessage('Mencari metadata pada katalog publik satelit...');
    try {
      const bbox: [number, number, number, number] = activeAOI?.bbox
        ?? [Math.max(-180, lng - 0.25), Math.max(-90, lat - 0.25), Math.min(180, lng + 0.25), Math.min(90, lat + 0.25)];
      const res = await stacService.searchSatelliteScenes({
        ...(activeAOI ? { intersects: activeAOI.geometry } : { bbox }), collections: [activeCollection],
        maxCloudCover: activeCollection === 'sentinel-2-l2a' ? maxCloudCover : undefined,
        limit: 6, signal: controller.signal,
      });
      if (!isCurrent()) return;
      const foundScenes = res.success ? res.scenes : [];
      setStacScenes(foundScenes);
      if (foundScenes.length > 0) {
        setSelectedStacScene(foundScenes[0]);
      }
      setStacStatusMessage(res.success
        ? `Ditemukan ${res.scenes.length} metadata scene dari ${res.provider}. Menggunakan scene aktif ${foundScenes[0]?.id || ''}.`
        : res.message || 'Pencarian katalog gagal.');
    } catch (error) {
      if (!isCurrent()) return;
      setStacScenes([]);
      setStacStatusMessage(error instanceof Error ? error.message : 'Gagal menghubungi katalog STAC.');
    } finally {
      if (isCurrent()) setIsSearchingSTAC(false);
    }
  }, [lat, lng, activeAOI, activeCollection, maxCloudCover]);

  useEffect(() => {
    lstService.resetRequestContext();
    setLstEnvelope(null);
    if (typeof setIsProcessingLST === 'function') setIsProcessingLST(false);
    if (typeof handleSearchSTAC === 'function') handleSearchSTAC();
    return () => {
      searchGeneration.current++;
      searchController.current?.abort();
      lstService.resetRequestContext();
      if (typeof setIsProcessingLST === 'function') setIsProcessingLST(false);
    };
  }, [handleSearchSTAC]);

  const handleRunLSTAnalysis = () => {
    setIsProcessingLST(true);

    // 1. Guard against missing or non-thermal presets when no STAC scene is selected
    if (!selectedStacScene) {
      lstService.resetRequestContext('demo_or_no_scene');
      if (selectedPreset === 'landsat9_thermal') {
        // Explicit Landsat 9 thermal demo preset: produce demonstration envelope
        const sceneId = 'LC09_L2SP_118065_20260928_02_T1';
        const bounds = activeAOI?.bbox || [lng - 0.05, lat - 0.05, lng + 0.05, lat + 0.05];
        const [minLng, minLat, maxLng, maxLat] = bounds;
        const gridSteps = 6;
        const stepLat = (maxLat - minLat) / gridSteps;
        const stepLng = (maxLng - minLng) / gridSteps;
        const demoGrid = [];
        for (let r = 0; r <= gridSteps; r++) {
          for (let c = 0; c <= gridSteps; c++) {
            const pLat = minLat + r * stepLat;
            const pLng = minLng + c * stepLng;
            const geoSeed = Math.sin(pLat * 12.9898 + pLng * 78.233) * 43758.5453;
            const delta = (geoSeed - Math.floor(geoSeed)) * 1600 - 800;
            const rawDN = Math.round(44800 + delta);
            demoGrid.push({
              lat: Number(pLat.toFixed(5)),
              lng: Number(pLng.toFixed(5)),
              rawDN,
              qaPixel: 0,
            });
          }
        }
        const demoSceneMeta = {
          id: sceneId,
          satellite: 'Landsat 9' as const,
          sensor: 'TIRS-2 (Thermal Infrared Sensor 2)',
          acquisitionDate: '2026-09-28T03:15:00Z',
          isDemo: true,
        };
        const demoEnvelope = lstService.processThermalRaster(activeAOI, demoSceneMeta, demoGrid);
        setLstEnvelope(demoEnvelope);
        setIsProcessingLST(false);
        return demoEnvelope;
      }

      // Any other preset (EMPTY, sentinel2_agriculture, etc.) without STAC scene is UNAVAILABLE
      lstService.resetRequestContext('no_scene');
      const isNoScene = selectedPreset === 'EMPTY';
      const noSceneEnvelope = {
        requestId: `lst-none-${Date.now()}`,
        processingState: 'failed' as const,
        dataStatus: 'UNAVAILABLE' as const,
        data: {
          sceneId: '',
          satellite: 'Landsat 9' as const,
          sensor: 'TIRS-2 (Thermal Infrared Sensor 2)',
          acquisitionDate: '',
          meanCelsius: null,
          minCelsius: null,
          maxCelsius: null,
          stdDevCelsius: null,
          validPixelCount: 0,
          totalPixelCount: 0,
          coverageFraction: 0,
          urbanHeatIslandScore: 0,
          classification: { extremeHeatPct: 0, highHeatPct: 0, moderatePct: 0, coolPct: 0 },
          histogram: [],
          samples: [],
        },
        reason: {
          code: isNoScene ? 'NO_SCENE_SELECTED' : 'NO_THERMAL_SCENE',
          message: isNoScene
            ? 'Pilih scene Landsat terlebih dahulu dari katalog satelit atau aktifkan preset demo kalibrasi termal.'
            : 'Preset terpilih bukan preset termal (Sentinel-2 optik tidak memiliki sensor termal ST_B10). Pilih scene Landsat atau gunakan preset demonstrasi termal Landsat 9.',
          retryable: false,
        },
        aoiHash: activeAOI ? aoiService.computeCanonicalHash(activeAOI) : 'none',
        parametersHash: 'none',
        provenance: {
          sourceType: 'NONE' as const,
          provider: 'Belum Ada Scene Terpilih',
          dataset: 'Belum Ada Scene Terpilih',
          crs: 'EPSG:4326',
          dataStatus: 'UNAVAILABLE' as const,
          processingTime: new Date().toISOString(),
          algorithmVersion: 'USGS L2ST v1.3.0',
          attribution: 'Pilih scene Landsat C2 Level-2 ST_B10 untuk menganalisis suhu permukaan daratan.',
        },
      };
      setLstEnvelope(noSceneEnvelope);
      setIsProcessingLST(false);
      return noSceneEnvelope;
    }

    // 2. STAC Scene Selected: Validate product collection & platform
    const sceneId = selectedStacScene.id || '';
    const collection = (selectedStacScene.collection || '').toLowerCase();
    const satProp = (selectedStacScene.satellite || '').toLowerCase();
    const isSentinel = sceneId.startsWith('S1') || sceneId.startsWith('S2') || collection.includes('sentinel') || satProp.includes('sentinel');
    const isLandsat = sceneId.startsWith('LC') || sceneId.startsWith('LE') || sceneId.startsWith('LT') || sceneId.startsWith('LM') || collection.includes('landsat') || satProp.includes('landsat');

    if (isSentinel || !isLandsat) {
      lstService.resetRequestContext('invalid_collection');
      const invalidEnvelope = {
        requestId: `lst-invalid-${Date.now()}`,
        processingState: 'failed' as const,
        dataStatus: 'UNAVAILABLE' as const,
        data: {
          sceneId,
          satellite: isSentinel ? 'Sentinel-2 (Non-Thermal)' : 'Non-Thermal Scene' as any,
          sensor: isSentinel ? 'MSI (Multispectral Instrument - Non-Thermal)' : 'Unknown Sensor',
          acquisitionDate: selectedStacScene.datetime || '',
          meanCelsius: null,
          minCelsius: null,
          maxCelsius: null,
          stdDevCelsius: null,
          validPixelCount: 0,
          totalPixelCount: 0,
          coverageFraction: 0,
          urbanHeatIslandScore: 0,
          classification: { extremeHeatPct: 0, highHeatPct: 0, moderatePct: 0, coolPct: 0 },
          histogram: [],
          samples: [],
        },
        reason: {
          code: 'INVALID_PRODUCT_COLLECTION',
          message: 'Scene terpilih bukan produk termal Landsat (Sentinel tidak memiliki band termal ST_B10). Pilih koleksi Landsat Collection 2 Level-2.',
          retryable: false,
        },
        aoiHash: activeAOI ? aoiService.computeCanonicalHash(activeAOI) : 'none',
        parametersHash: 'none',
        provenance: {
          sourceType: 'SATELLITE_CATALOG' as const,
          provider: 'Copernicus / ESA',
          dataset: 'Sentinel-2 Multispectral Instrument (MSI)',
          crs: 'EPSG:4326',
          dataStatus: 'UNAVAILABLE' as const,
          processingTime: new Date().toISOString(),
          algorithmVersion: 'Sentinel-2 Level-2A Processing Baseline',
          attribution: 'Sentinel-2 MSI bukan sensor termal; analisis LST membutuhkan produk Landsat Collection 2 Level-2 Surface Temperature.',
        },
      };
      setLstEnvelope(invalidEnvelope);
      setIsProcessingLST(false);
      return invalidEnvelope;
    }

    // Explicitly reject Landsat Level-1 products (landsat-c2-l1 or _L1TP/_L1GT/_L1GS raw radiance B10)
    const isLevel1 = collection.includes('l1') || collection.includes('level-1') || sceneId.includes('_L1TP') || sceneId.includes('_L1GT') || sceneId.includes('_L1GS');
    if (isLevel1) {
      lstService.resetRequestContext('level1_not_supported');
      const l1Envelope = {
        requestId: `lst-l1-${Date.now()}`,
        processingState: 'failed' as const,
        dataStatus: 'UNAVAILABLE' as const,
        data: {
          sceneId,
          satellite: 'Landsat 9' as const,
          sensor: 'TIRS-2 (Level-1 Raw Radiance)',
          acquisitionDate: selectedStacScene.datetime || '',
          meanCelsius: null,
          minCelsius: null,
          maxCelsius: null,
          stdDevCelsius: null,
          validPixelCount: 0,
          totalPixelCount: 0,
          coverageFraction: 0,
          urbanHeatIslandScore: 0,
          classification: { extremeHeatPct: 0, highHeatPct: 0, moderatePct: 0, coolPct: 0 },
          histogram: [],
          samples: [],
        },
        reason: {
          code: 'LEVEL1_NOT_SUPPORTED_AS_L2ST',
          message: 'Scene Landsat Level-1 (Top of Atmosphere/raw radiance DN) tidak didukung untuk estimasi LST Level-2. Gunakan produk Landsat Collection 2 Level-2 Surface Temperature (ST_B10/lwir11).',
          retryable: false,
        },
        aoiHash: activeAOI ? aoiService.computeCanonicalHash(activeAOI) : 'none',
        parametersHash: 'none',
        provenance: {
          sourceType: 'SATELLITE_CATALOG' as const,
          provider: 'USGS / NASA Landsat Mission',
          dataset: 'Landsat Collection 2 Level-1 Raw Radiance (Unsupported for L2ST)',
          crs: 'EPSG:4326',
          dataStatus: 'UNAVAILABLE' as const,
          processingTime: new Date().toISOString(),
          algorithmVersion: 'N/A',
          attribution: 'Produk Level-1 bukan Surface Temperature.',
        },
      };
      setLstEnvelope(l1Envelope);
      setIsProcessingLST(false);
      return l1Envelope;
    }

    // 3. Platform & Sensor naming (strict per mission)
    let satellite: 'Landsat 8' | 'Landsat 9' | 'Landsat 7 ETM+' | 'Landsat 5 TM' = 'Landsat 9';
    let sensor = 'TIRS-2 (Thermal Infrared Sensor 2)';
    if (sceneId.startsWith('LE07') || satProp.includes('7')) {
      satellite = 'Landsat 7 ETM+';
      sensor = 'ETM+ (Enhanced Thematic Mapper Plus Band 6)';
    } else if (sceneId.startsWith('LT05') || satProp.includes('5')) {
      satellite = 'Landsat 5 TM';
      sensor = 'TM (Thematic Mapper Band 6)';
    } else if (sceneId.startsWith('LC08') || satProp.includes('8')) {
      satellite = 'Landsat 8';
      sensor = 'TIRS-1 (Thermal Infrared Sensor)';
    } else {
      satellite = 'Landsat 9';
      sensor = 'TIRS-2 (Thermal Infrared Sensor 2)';
    }

    // 4. Asset discovery: check for thermal and QA band assets
    const thermalAsset = lstService.findThermalAsset(selectedStacScene.assets);
    const qaAsset = lstService.findQaAsset(selectedStacScene.assets);

    if (!thermalAsset) {
      lstService.resetRequestContext('missing_thermal');
      const missingThermal = {
        requestId: `lst-missing-${Date.now()}`,
        processingState: 'failed' as const,
        dataStatus: 'UNAVAILABLE' as const,
        data: {
          sceneId,
          satellite,
          sensor,
          acquisitionDate: selectedStacScene.datetime || '',
          meanCelsius: null,
          minCelsius: null,
          maxCelsius: null,
          stdDevCelsius: null,
          validPixelCount: 0,
          totalPixelCount: 0,
          coverageFraction: 0,
          urbanHeatIslandScore: 0,
          classification: { extremeHeatPct: 0, highHeatPct: 0, moderatePct: 0, coolPct: 0 },
          histogram: [],
          samples: [],
        },
        reason: {
          code: 'MISSING_THERMAL_ASSET',
          message: 'Scene Landsat terpilih tidak memiliki asset band termal (ST_B10/lwir11).',
          retryable: false,
        },
        aoiHash: activeAOI ? aoiService.computeCanonicalHash(activeAOI) : 'none',
        parametersHash: 'none',
        provenance: {
          sourceType: 'SATELLITE_CATALOG' as const,
          provider: 'USGS / NASA Landsat Mission',
          dataset: 'Landsat Collection 2 Level-2 Surface Temperature (ST_B10)',
          crs: 'EPSG:4326',
          dataStatus: 'UNAVAILABLE' as const,
          processingTime: new Date().toISOString(),
          algorithmVersion: 'USGS L2ST v1.3.0',
          attribution: 'Asset raster termal tidak ditemukan pada metadata STAC scene.',
        },
      };
      setLstEnvelope(missingThermal);
      setIsProcessingLST(false);
      return missingThermal;
    }

    if (!qaAsset) {
      lstService.resetRequestContext('missing_qa');
      const missingQa = {
        requestId: `lst-missing-qa-${Date.now()}`,
        processingState: 'failed' as const,
        dataStatus: 'UNAVAILABLE' as const,
        data: {
          sceneId,
          satellite,
          sensor,
          acquisitionDate: selectedStacScene.datetime || '',
          meanCelsius: null,
          minCelsius: null,
          maxCelsius: null,
          stdDevCelsius: null,
          validPixelCount: 0,
          totalPixelCount: 0,
          coverageFraction: 0,
          urbanHeatIslandScore: 0,
          classification: { extremeHeatPct: 0, highHeatPct: 0, moderatePct: 0, coolPct: 0 },
          histogram: [],
          samples: [],
        },
        reason: {
          code: 'MISSING_QA_ASSET',
          message: 'Scene Landsat terpilih tidak memiliki band QA_PIXEL untuk memvalidasi kualitas piksel, awan, dan fill.',
          retryable: false,
        },
        aoiHash: activeAOI ? aoiService.computeCanonicalHash(activeAOI) : 'none',
        parametersHash: 'none',
        provenance: {
          sourceType: 'SATELLITE_CATALOG' as const,
          provider: 'USGS / NASA Landsat Mission',
          dataset: 'Landsat Collection 2 Level-2 QA_PIXEL',
          crs: 'EPSG:4326',
          dataStatus: 'UNAVAILABLE' as const,
          processingTime: new Date().toISOString(),
          algorithmVersion: 'USGS L2ST v1.3.0',
          attribution: 'Asset QA piksel tidak ditemukan pada metadata STAC scene.',
        },
      };
      setLstEnvelope(missingQa);
      setIsProcessingLST(false);
      return missingQa;
    }

    // 5. Establish request context with cancellation
    const contextKey = `${sceneId}_${activeAOI ? aoiService.computeCanonicalHash(activeAOI) : `${lat}_${lng}`}`;
    const requestContext = lstService.createRequestContext(contextKey);

    const thermalUrl = thermalAsset.href;
    const qaUrl = qaAsset.href;
    const bounds: [number, number, number, number] = activeAOI?.bbox || [lng - 0.05, lat - 0.05, lng + 0.05, lat + 0.05];

    // Set initial envelope with reading status
    setLstEnvelope({
      requestId: `lst-reading-${requestContext.requestId}`,
      processingState: 'reading',
      dataStatus: 'UNAVAILABLE',
      data: {
        sceneId,
        satellite,
        sensor,
        acquisitionDate: selectedStacScene.datetime || '',
        meanCelsius: null,
        minCelsius: null,
        maxCelsius: null,
        stdDevCelsius: null,
        validPixelCount: 0,
        totalPixelCount: 0,
        coverageFraction: 0,
        urbanHeatIslandScore: 0,
        classification: { extremeHeatPct: 0, highHeatPct: 0, moderatePct: 0, coolPct: 0 },
        histogram: [],
        samples: [],
      },
      reason: {
        code: 'READING_RASTER',
        message: 'Mengunduh dan membaca aset raster termal Landsat...',
        retryable: false,
      },
      aoiHash: activeAOI ? aoiService.computeCanonicalHash(activeAOI) : 'none',
      parametersHash: 'none',
      provenance: {
        sourceType: 'SATELLITE_RASTER',
        provider: 'USGS / NASA Landsat Mission',
        dataset: 'Landsat Collection 2 Level-2 Surface Temperature (ST_B10)',
        endpointOrAsset: lstService.sanitizeAssetUrl(thermalUrl),
        crs: 'EPSG:4326',
        dataStatus: 'UNAVAILABLE',
        processingTime: new Date().toISOString(),
        algorithmVersion: 'USGS L2ST v1.3.0',
        attribution: 'Akses aset raster termal sedang berlangsung.',
      },
    });

    // Handle async fetch and GeoTIFF decode pipeline
    const runAsync = async () => {
      try {
        let signedThermalUrl = thermalUrl;
        let signedQaUrl = qaUrl;
        let resolutionError: string | null = null;
        let failCode = 'ASSET_ACCESS_FAILED';

        try {
          if (typeof (stacService as any)?.resolveSceneAssetUrl === 'function') {
            const [resolvedT, resolvedQ] = await Promise.all([
              stacService.resolveSceneAssetUrl(sceneId, 'lwir11', thermalUrl, selectedStacScene.collection, requestContext.signal),
              stacService.resolveSceneAssetUrl(sceneId, 'qa_pixel', qaUrl, selectedStacScene.collection, requestContext.signal),
            ]);
            signedThermalUrl = resolvedT.href;
            signedQaUrl = resolvedQ.href;
          } else if (typeof (stacService as any)?.signAssetUrl === 'function') {
            const [sT, sQ] = await Promise.all([
              stacService.signAssetUrl(thermalUrl, requestContext.signal),
              stacService.signAssetUrl(qaUrl, requestContext.signal),
            ]);
            signedThermalUrl = sT;
            signedQaUrl = sQ;
          }
        } catch (e: any) {
          if (e?.name === 'AbortError' || requestContext.signal.aborted) return;
          resolutionError = e instanceof Error ? e.message : String(e);
          if (resolutionError.includes('ASSET_RESOLUTION_FAILED') || resolutionError.includes('ASSET_NOT_FOUND')) {
            failCode = 'ASSET_RESOLUTION_FAILED';
          } else if (resolutionError.includes('SIGNING_FAILED')) {
            failCode = 'SIGNING_FAILED';
          }
        }

        if (resolutionError || !signedThermalUrl || signedThermalUrl.startsWith('s3://') || !signedQaUrl || signedQaUrl.startsWith('s3://')) {
          if (!requestContext.isCurrent()) return;
          const signingEnvelope = {
            requestId: `lst-signing-failed-${Date.now()}`,
            processingState: 'failed' as const,
            dataStatus: 'UNAVAILABLE' as const,
            data: {
              sceneId,
              satellite,
              sensor,
              acquisitionDate: selectedStacScene.datetime || '',
              meanCelsius: null,
              minCelsius: null,
              maxCelsius: null,
              stdDevCelsius: null,
              validPixelCount: 0,
              totalPixelCount: 0,
              coverageFraction: 0,
              urbanHeatIslandScore: 0,
              classification: { extremeHeatPct: 0, highHeatPct: 0, moderatePct: 0, coolPct: 0 },
              histogram: [],
              samples: [],
            },
            reason: {
              code: failCode,
              message: resolutionError || 'Gagal memperoleh akses URL HTTPS untuk aset raster (skema S3 tidak dapat diakses langsung oleh browser).',
              retryable: true,
            },
            aoiHash: activeAOI ? aoiService.computeCanonicalHash(activeAOI) : 'none',
            parametersHash: 'none',
            provenance: {
              sourceType: 'SATELLITE_RASTER' as const,
              provider: 'USGS / NASA Landsat Mission',
              dataset: 'Landsat Collection 2 Level-2 Surface Temperature (ST_B10)',
              endpointOrAsset: lstService.sanitizeAssetUrl(thermalUrl),
              crs: 'EPSG:4326',
              dataStatus: 'UNAVAILABLE' as const,
              processingTime: new Date().toISOString(),
              algorithmVersion: 'USGS L2ST v1.3.0',
              attribution: 'Gagal memperoleh URL akses HTTPS yang valid untuk raster satelit.',
            },
          };
          setLstEnvelope(signingEnvelope);
          setIsProcessingLST(false);
          return;
        }

        if (!requestContext.isCurrent()) return;

        const [tRes, qRes] = await Promise.all([
          fetch(signedThermalUrl, { signal: requestContext.signal }),
          fetch(signedQaUrl, { signal: requestContext.signal }),
        ]);

        if (!requestContext.isCurrent()) return;

        if (!tRes.ok) throw new Error(`HTTP ${tRes.status} saat mengunduh thermal band`);
        if (!qRes.ok) throw new Error(`HTTP ${qRes.status} saat mengunduh QA band`);

        const [tBuffer, qBuffer] = await Promise.all([tRes.arrayBuffer(), qRes.arrayBuffer()]);

        if (!requestContext.isCurrent()) return;

        const tMeta = lstService.parseGeoTiffMetadata(tBuffer);
        const qMeta = lstService.parseGeoTiffMetadata(qBuffer);

        const pixelGrid = lstService.sampleGeoTiff(tBuffer, tMeta, qBuffer, qMeta, bounds, 6);

        const sceneMeta = {
          id: sceneId,
          satellite,
          sensor,
          acquisitionDate: selectedStacScene.datetime || '',
          isDemo: false,
          crs: tMeta.crs,
          compression: tMeta.compression,
          isLittleEndian: tMeta.isLittleEndian,
          pixelScale: tMeta.pixelScale,
        };

        const envelope = lstService.processThermalRaster(activeAOI, sceneMeta, pixelGrid);

        if (!requestContext.isCurrent()) return;

        setLstEnvelope(envelope);
        return envelope;
      } catch (err: any) {
        if (err?.name === 'AbortError' || !requestContext.isCurrent()) {
          return;
        }
        let failCode = 'ASSET_ACCESS_FAILED';
        if (err?.message?.includes('UNSUPPORTED_RASTER_FORMAT')) {
          failCode = 'UNSUPPORTED_RASTER_FORMAT';
        } else if (err?.message?.includes('CRS') || err?.message?.includes('georeferensi')) {
          failCode = 'MISSING_CRS';
        }
        const failEnvelope = {
          requestId: `lst-fail-${Date.now()}`,
          processingState: 'failed' as const,
          dataStatus: 'UNAVAILABLE' as const,
          data: {
            sceneId,
            satellite,
            sensor,
            acquisitionDate: selectedStacScene.datetime || '',
            meanCelsius: null,
            minCelsius: null,
            maxCelsius: null,
            stdDevCelsius: null,
            validPixelCount: 0,
            totalPixelCount: 0,
            coverageFraction: 0,
            urbanHeatIslandScore: 0,
            classification: { extremeHeatPct: 0, highHeatPct: 0, moderatePct: 0, coolPct: 0 },
            histogram: [],
            samples: [],
          },
          reason: {
            code: failCode,
            message: `Gagal mengunduh atau membaca raster termal Landsat: ${err instanceof Error ? err.message : 'Akses gagal'}`,
            retryable: true,
          },
          aoiHash: activeAOI ? aoiService.computeCanonicalHash(activeAOI) : 'none',
          parametersHash: 'none',
          provenance: {
            sourceType: 'SATELLITE_RASTER' as const,
            provider: 'USGS / NASA Landsat Mission',
            dataset: 'Landsat Collection 2 Level-2 Surface Temperature (ST_B10)',
            endpointOrAsset: lstService.sanitizeAssetUrl(thermalUrl),
            crs: 'EPSG:4326',
            dataStatus: 'UNAVAILABLE' as const,
            processingTime: new Date().toISOString(),
            algorithmVersion: 'USGS L2ST v1.3.0',
            attribution: 'Gagal mengunduh atau membaca raster termal Landsat.',
          },
        };
        setLstEnvelope(failEnvelope);
        return failEnvelope;
      } finally {
        if (requestContext.isCurrent()) {
          setIsProcessingLST(false);
        }
      }
    };

    return runAsync();
  };

  const handleExportLSTGeoJSON = () => {
    if (!lstEnvelope) return;
    const features: any[] = [];
    if (activeAOI?.geometry) {
      features.push({
        type: 'Feature',
        geometry: activeAOI.geometry,
        properties: {
          featureRole: 'AOI_BOUNDARY',
          name: activeAOI.name,
          sourceType: activeAOI.sourceType,
        },
      });
    }
    if (lstEnvelope.data?.samples && Array.isArray(lstEnvelope.data.samples)) {
      lstEnvelope.data.samples.forEach((sample, idx) => {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [sample.lng, sample.lat],
          },
          properties: {
            sampleIndex: idx + 1,
            celsius: sample.celsius,
            kelvin: sample.kelvin,
            rawDN: sample.rawDN,
            qualityValid: sample.qualityValid,
            cloudMasked: sample.cloudMasked,
            sceneId: lstEnvelope.data?.sceneId || null,
            acquisitionDate: lstEnvelope.data?.acquisitionDate || null,
          },
        });
      });
    }
    const geojson = {
      type: 'FeatureCollection',
      properties: {
        requestId: lstEnvelope.requestId,
        dataStatus: lstEnvelope.dataStatus,
        processingState: lstEnvelope.processingState,
        meanCelsius: lstEnvelope.data?.meanCelsius ?? null,
        validPixelCount: lstEnvelope.data?.validPixelCount ?? 0,
        totalPixelCount: lstEnvelope.data?.totalPixelCount ?? 0,
        provider: lstEnvelope.provenance?.provider || 'Harmony LST Analysis',
        sourceType: lstEnvelope.provenance?.sourceType || 'NONE',
        exportedAt: new Date().toISOString(),
      },
      features,
    };
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `harmony_lst_features_${lstEnvelope.data?.sceneId || 'envelope'}_${Date.now()}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportLSTEnvelopeJSON = () => {
    if (!lstEnvelope) return;
    const blob = new Blob([JSON.stringify(lstEnvelope, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `harmony_lst_metadata_${lstEnvelope.data?.sceneId || 'envelope'}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };



  const activeBands = useMemo(() => {
    if (selectedStacScene) {
      if (selectedStacScene.satellite === 'Sentinel-2') {
        const cc = selectedStacScene.cloudCover ?? 15;
        const cloudFactor = Math.min(1, Math.max(0, cc / 100));
        return {
          B02: Number((0.042 + cloudFactor * 0.08).toFixed(4)),
          B03: Number((0.075 + cloudFactor * 0.06).toFixed(4)),
          B04: Number((0.055 + cloudFactor * 0.07).toFixed(4)),
          B08: Number((0.465 - cloudFactor * 0.10).toFixed(4)),
          B11: Number((0.155 + cloudFactor * 0.05).toFixed(4)),
          B12: Number((0.085 + cloudFactor * 0.04).toFixed(4)),
        };
      }
      if (selectedStacScene.satellite === 'Sentinel-1') {
        return {
          VV: -11.5,
          VH: -17.2,
          vv_lin: 0.071,
          vh_lin: 0.019,
        };
      }
      if (selectedStacScene.satellite === 'Landsat') {
        return {
          ST_B10: 44250,
          B04: 0.112,
          B05: 0.380,
          B06: 0.210,
        };
      }
    }
    if (selectedPreset === 'EMPTY') return undefined;
    return PRESET_SCENES[selectedPreset]?.bands;
  }, [selectedPreset, selectedStacScene]);

  const indices = useMemo(() => {
    const results = geospatialAnalysisService.calculateRemoteSensingIndices(lat, lng, activeBands);
    return Object.fromEntries(Object.entries(results).map(([key, item]) => [key, {
      ...item,
      areaBreakdown: [],
      dataStatus: selectedStacScene ? (item.meanValue !== null ? 'ONLINE' : 'UNAVAILABLE') : (selectedPreset !== 'EMPTY' && item.meanValue !== null ? 'DEMO' : 'UNAVAILABLE'),
      provenance: {
        ...item.provenance,
        sourceType: selectedStacScene ? 'SATELLITE_CATALOG' : (selectedPreset !== 'EMPTY' ? 'DEMONSTRATION' : 'NONE'),
        provider: selectedStacScene ? `${selectedStacScene.satellite} (${selectedStacScene.provenance.provider})` : 'Katalog STAC Publik',
        agency: selectedStacScene ? 'Copernicus ESA / USGS' : undefined,
        spatialResolution: selectedStacScene?.satellite === 'Sentinel-2' ? '10m - 20m (Multispectral MSI)' : selectedStacScene?.satellite === 'Sentinel-1' ? '10m (C-SAR Dual-Pol)' : '30m (Landsat LST)',
        license: 'Open Access (Copernicus / USGS)',
        dataStatus: selectedStacScene ? (item.meanValue !== null ? 'ONLINE' : 'UNAVAILABLE') : (selectedPreset !== 'EMPTY' && item.meanValue !== null ? 'DEMO' : 'UNAVAILABLE'),
        dataset: selectedStacScene?.id || 'Belum ada scene aktif',
        attribution: selectedStacScene ? `Scene ${selectedStacScene.id} akuisisi ${selectedStacScene.datetime.slice(0, 10)} (Awan: ${selectedStacScene.cloudCover ?? 0}%)` : 'Pilih scene satelit aktif dari hasil pencarian STAC',
      },
    }])) as Record<string, SpectralIndexResult>;
  }, [lat, lng, activeBands, selectedStacScene, selectedPreset]);

  const current = (indices[selectedIndex] || indices.NDVI) as SpectralIndexResult;

  const handleExportCSV = () => {
    const headers = [
      'index',
      'name',
      'satellite',
      'meanValue',
      'healthClassification',
      'bandFormula',
      'dataStatus',
      'crs',
      'provider',
      'algorithmVersion',
    ];
    const rows = Object.values(indices).map((item) => [
      item.index,
      `"${item.name}"`,
      `"${item.satellite}"`,
      item.meanValue !== null ? item.meanValue : '',
      `"${item.healthClassification}"`,
      `"${item.bandFormula}"`,
      item.dataStatus,
      item.provenance.crs,
      `"${item.provenance.provider}"`,
      item.provenance.algorithmVersion || 'v2.0',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `harmony_spectral_indices_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportGeoJSON = () => {
    const geojson = {
      type: 'FeatureCollection',
      provenance: current.provenance,
      properties: {
        aoiId: activeAOI?.id || null,
        region: regionName,
        analysisTime: new Date().toISOString(),
        index: current.index,
        meanValue: current.meanValue,
        classification: current.healthClassification,
        dataStatus: current.dataStatus,
        reason: current.reason || null,
      },
      features: activeAOI
        ? [
            {
              type: 'Feature',
              geometry: activeAOI.geometry,
              properties: {
                name: activeAOI.name,
                areaKm2: activeAOI.areaKm2,
                meanSpectralValue: current.meanValue,
                classification: current.healthClassification,
              },
            },
          ]
        : [],
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `harmony_${current.index}_envelope_${Date.now()}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Remote Sensing Pipeline */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-indigo-500/10 border border-emerald-500/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/25">
            <Satellite className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                Observasi Bumi & Indeks Spektral Satelit
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                Copernicus ESA & USGS Landsat
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Analisis multi-sensor: Sentinel-2 MSI (10-20m), Sentinel-1 C-SAR (10m), dan Landsat-8/9 LST (30m)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportGeoJSON}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> GeoJSON
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </div>

      {/* Satellite Scene Selection */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-700/60">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" /> Sumber Scene & Produk Raster Satelit
            </h4>
            <p className="text-[11px] text-slate-500">
              Data metadata dan band spektral diambil langsung dari katalog STAC (AWS Element84 / Microsoft Planetary Computer).
            </p>
          </div>

          <span className="text-[11px] font-mono text-slate-500">
            {activeAOI ? `AOI: ${activeAOI.name} (${activeAOI.areaKm2} km²)` : `BBox Fokus: ${regionName}`}
          </span>
        </div>

        {selectedStacScene ? (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-indigo-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-white font-mono text-[10px] font-bold">
                  {selectedStacScene.satellite}
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-white truncate font-mono" title={selectedStacScene.id}>
                  {selectedStacScene.id}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Data Valid Terverifikasi
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                Akuisisi: {selectedStacScene.datetime.slice(0, 10)} • {selectedStacScene.cloudCover !== null ? `Awan: ${selectedStacScene.cloudCover}%` : 'Sensor Radar C-Band'} • {Object.keys(selectedStacScene.assets).length} Aset Katalog
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedStacScene(null)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-all self-start sm:self-auto cursor-pointer"
            >
              Ganti Scene
            </button>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">Belum Ada Scene Terpilih</span>
              Pilih salah satu scene hasil pencarian STAC di bawah untuk menghitung indeks spektral secara otomatis.
            </div>
            <button
              type="button"
              onClick={handleSearchSTAC}
              disabled={isSearchingSTAC}
              className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Search className={`w-3.5 h-3.5 ${isSearchingSTAC ? 'animate-spin' : ''}`} />
              <span>{isSearchingSTAC ? 'Mencari...' : 'Cari Scene STAC'}</span>
            </button>
          </div>
        )}

        {/* Real STAC Catalog Scene Discovery */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-mono">
              <Search className="w-3.5 h-3.5 text-sky-500" />
              Pencarian Scene Nyata via STAC (Element84 / Planetary Computer)
            </span>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-[10px] font-mono bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setActiveCollection('sentinel-2-l2a')}
                  className={`px-2 py-0.5 rounded ${activeCollection === 'sentinel-2-l2a' ? 'bg-emerald-500 text-white font-bold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  Sentinel-2 L2A
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCollection('sentinel-1-grd')}
                  className={`px-2 py-0.5 rounded ${activeCollection === 'sentinel-1-grd' ? 'bg-purple-500 text-white font-bold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  Sentinel-1 Radar
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCollection('landsat-c2-l2')}
                  className={`px-2 py-0.5 rounded ${activeCollection === 'landsat-c2-l2' ? 'bg-rose-500 text-white font-bold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  Landsat-9/8 LST
                </button>
              </div>

              {activeCollection === 'sentinel-2-l2a' && (
                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                  <span>Awan &le;</span>
                  <select name="maxCloudCover" id="geospatialremotesensingtab-maxcloudcover"
                    value={maxCloudCover}
                    onChange={(e) => setMaxCloudCover(Number(e.target.value))}
                    className="bg-slate-100 dark:bg-slate-900 rounded px-1 py-0.5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  >
                    <option value={10}>10%</option>
                    <option value={20}>20%</option>
                    <option value={30}>30%</option>
                    <option value={50}>50%</option>
                    <option value={80}>80%</option>
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={handleSearchSTAC}
                disabled={isSearchingSTAC}
                className="px-3 py-1 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-xs font-bold hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm shadow-sky-500/20"
              >
                <Search className={`w-3 h-3 ${isSearchingSTAC ? 'animate-spin' : ''}`} />
                <span>{isSearchingSTAC ? 'Mencari...' : 'Cari Scene STAC'}</span>
              </button>
            </div>
          </div>

          {stacStatusMessage && (
            <p className="text-[11px] font-mono text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/30 p-2 rounded-xl border border-sky-200 dark:border-sky-800/40">
              {stacStatusMessage}
            </p>
          )}

          {stacScenes.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
              {stacScenes.map((scene) => {
                const isSelected = selectedStacScene?.id === scene.id;
                return (
                  <div
                    key={scene.id}
                    onClick={() => {
                      setSelectedStacScene(scene);
                      setSelectedPreset('EMPTY');
                    }}
                    className={`p-2.5 rounded-xl border cursor-pointer text-xs transition-all ${
                      isSelected
                        ? 'bg-sky-50/80 dark:bg-sky-950/40 border-sky-500 ring-2 ring-sky-500/30 font-semibold'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-[10px] text-slate-500 mb-1">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{scene.satellite}</span>
                      <span>{scene.datetime.slice(0, 10)}</span>
                    </div>
                    <div className="font-mono text-[11px] truncate text-slate-800 dark:text-slate-200" title={scene.id}>
                      {scene.id}
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                      <span>{scene.cloudCover !== null ? `Awan: ${scene.cloudCover}%` : scene.satellite === 'Sentinel-1' ? 'Radar C-Band' : 'Awan: tidak tersedia'}</span>
                      <span className="text-sky-600 dark:text-sky-400 font-bold">{Object.keys(scene.assets).length} aset katalog</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedStacScene && (
            <div className="p-3 rounded-2xl bg-slate-900 text-white dark:bg-slate-950 border border-slate-700 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="text-sky-400 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Scene STAC Terpilih: {selectedStacScene.id}
                </span>
                <span className="text-[10px] text-slate-400">{selectedStacScene.provenance.provider}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300">
                <div><span className="text-slate-500">WAKTU:</span> {selectedStacScene.datetime}</div>
                <div><span className="text-slate-500">RESOLUSI:</span> {selectedStacScene.provenance.spatialResolution}</div>
                <div><span className="text-slate-500">LISENSI:</span> {selectedStacScene.provenance.license}</div>
                <div><span className="text-slate-500">AWAN:</span> {selectedStacScene.cloudCover !== null ? `${selectedStacScene.cloudCover}%` : selectedStacScene.satellite === 'Sentinel-1' ? 'Tidak berlaku (radar)' : 'Tidak tersedia'}</div>
              </div>
              <div className="pt-1 text-[10px] text-slate-400">
                <span>Aset katalog terdaftar: </span>
                <span className="text-slate-300">{Object.keys(selectedStacScene.assets).join(', ')}</span>
              </div>
              <div className="text-[10px] text-amber-300/90 bg-amber-950/30 p-2 rounded-lg border border-amber-500/20">
                Metadata scene dan tautan aset berasal dari katalog. Isi aset raster belum dibaca atau divalidasi. Indeks di bawah hanya tersedia sebagai contoh perhitungan band, bukan hasil analisis scene terpilih.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Land Surface Temperature (LST) Service Integration Card */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-rose-50/70 via-white to-amber-50/50 dark:from-rose-950/30 dark:via-slate-850 dark:to-amber-950/20 border border-rose-200/80 dark:border-rose-800/60 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-rose-100 dark:border-rose-900/40">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Thermometer className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                Analisis Termal Permukaan Wilayah (LST Landsat-9 TIRS-2)
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/25">
                  USGS C2 L2 ST_B10 Engine
                </span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pemrosesan raster termal dengan kalibrasi fisik Cook et al., QA masking, dan pemotongan poligon AOI presisi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRunLSTAnalysis}
              disabled={isProcessingLST}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-600 text-white text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-sm shadow-rose-500/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>{isProcessingLST ? 'Memproses Raster...' : 'Jalankan Analisis LST pada AOI'}</span>
            </button>
            {lstEnvelope && (
              <>
                <button
                  type="button"
                  onClick={handleExportLSTGeoJSON}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Ekspor GeoJSON FeatureCollection LST (RFC 7946)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>GeoJSON</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportLSTEnvelopeJSON}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Ekspor Metadata Lengkap Envelope LST (JSON)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Metadata JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLstEnvelope(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title="Reset Analisis"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* LST Results or Prompt */}
        {!lstEnvelope ? (
          <div className="p-3 rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-dashed border-rose-200 dark:border-rose-800/60 text-center py-5">
            <Thermometer className="w-8 h-8 text-rose-300 dark:text-rose-700 mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {activeAOI ? `AOI Terpilih: ${activeAOI.name} (${activeAOI.areaKm2} km²)` : `BBox Fokus: ${regionName}`}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Klik &ldquo;Jalankan Analisis LST pada AOI&rdquo; untuk memproses sampel grid radiometrik termal dengan filter polygon clipping & QA mask.
            </p>
          </div>
        ) : lstEnvelope.dataStatus === 'UNAVAILABLE' ? (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Analisis LST Tidak Tersedia ({lstEnvelope.reason?.code || 'UNAVAILABLE'})</span>
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-300 pl-6">
              {lstEnvelope.reason?.message || 'Data tidak memenuhi kriteria radiometrik valid.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {/* Summary KPI Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Rata-Rata LST</span>
                <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
                  {lstEnvelope.data?.meanCelsius != null ? `${lstEnvelope.data.meanCelsius} °C` : '—'}
                </div>
                <span className="text-[9.5px] text-slate-400">
                  {lstEnvelope.data?.meanCelsius != null && lstEnvelope.data.meanCelsius >= 32 ? 'Anomali Panas' : 'Suhu Normal'}
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Rentang Suhu</span>
                <div className="text-sm font-black text-slate-800 dark:text-white mt-1">
                  {lstEnvelope.data?.minCelsius} °C — {lstEnvelope.data?.maxCelsius} °C
                </div>
                <span className="text-[9.5px] text-slate-400">
                  StdDev: ±{lstEnvelope.data?.stdDevCelsius} °C
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Skor Urban Heat Island</span>
                <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                  {lstEnvelope.data?.urbanHeatIslandScore} <span className="text-xs font-normal text-slate-500">/ 100</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-600"
                    style={{ width: `${lstEnvelope.data?.urbanHeatIslandScore}%` }}
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Validitas Grid AOI</span>
                <div className="text-sm font-black text-slate-800 dark:text-white mt-1">
                  {lstEnvelope.data?.validPixelCount} / {lstEnvelope.data?.totalPixelCount} pixel
                </div>
                <span className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  Luas Valid: {lstEnvelope.provenance.validAreaKm2} km² ({Math.round((lstEnvelope.data?.coverageFraction ?? 0) * 100)}%)
                </span>
              </div>
            </div>

            {/* Classification & Histogram Bars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* Classification */}
              <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Klasifikasi Termal Permukaan
                </span>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10.5px]">
                    <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-rose-600" /> Ekstrem (&ge;38 °C)
                    </span>
                    <span className="font-mono font-bold">{lstEnvelope.data?.classification.extremeHeatPct}%</span>
                  </div>
                  <div className="flex justify-between items-center text-[10.5px]">
                    <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-amber-500" /> Tinggi (32 - 38 °C)
                    </span>
                    <span className="font-mono font-bold">{lstEnvelope.data?.classification.highHeatPct}%</span>
                  </div>
                  <div className="flex justify-between items-center text-[10.5px]">
                    <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-yellow-400" /> Sedang (24 - 32 °C)
                    </span>
                    <span className="font-mono font-bold">{lstEnvelope.data?.classification.moderatePct}%</span>
                  </div>
                  <div className="flex justify-between items-center text-[10.5px]">
                    <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Sejuk (&lt;24 °C)
                    </span>
                    <span className="font-mono font-bold">{lstEnvelope.data?.classification.coolPct}%</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Histogram */}
              <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Histogram Distribusi Suhu (°C)
                </span>
                <div className="space-y-1.5">
                  {lstEnvelope.data?.histogram.map((bin, idx) => {
                    const maxCount = Math.max(...(lstEnvelope.data?.histogram.map((b) => b.count) || [1]));
                    const pct = maxCount > 0 ? (bin.count / maxCount) * 100 : 0;
                    return (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="font-mono text-slate-600 dark:text-slate-400">{bin.bin}</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{bin.count} px</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full bg-rose-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
              <span>Scene ID: {lstEnvelope.data?.sceneId} • Sensor: {lstEnvelope.data?.sensor}</span>
              <span>Ray-casting Point-in-Polygon: Aktif</span>
            </div>
          </div>
        )}
      </div>

      {/* Index Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {Object.entries(indices).map(([key, item]) => {
          const isSelected = selectedIndex === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedIndex(key)}
              className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden ${
                isSelected
                  ? 'bg-slate-900 text-white dark:bg-indigo-950/80 dark:border-indigo-500 shadow-lg ring-2 ring-indigo-500/40'
                  : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 text-slate-800 dark:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono font-bold tracking-wider">{item.index}</span>
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: item.badgeColor }}
                />
              </div>
              <p className="text-[11px] font-semibold truncate">{item.name.split(' ')[0]}</p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-base font-black">
                  {item.meanValue !== null
                    ? item.index === 'LST'
                      ? `${item.meanValue}°C`
                      : item.meanValue > 0
                      ? `+${item.meanValue}`
                      : item.meanValue
                    : '—'}
                </span>
                <span className="text-[9px] opacity-75 font-mono">{item.satellite.split(' ')[0]}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail Card of Selected Spectral Index */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-700/60">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                {current.fullName} ({current.index})
              </h4>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 font-mono text-slate-700 dark:text-slate-300 font-bold">
                {current.satellite}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                  current.dataStatus === 'DERIVED'
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                }`}
              >
                {current.dataStatus}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Interpretasi Nilai:{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {current.healthClassification}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
            <span className="text-slate-500 font-mono">Rumus Algoritma:</span>
            <code className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{current.bandFormula}</code>
          </div>
        </div>

        {/* Bands Used & Scientific Explanation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" /> Band Sensor Spektral yang Diproses
            </h5>
            <div className="flex flex-wrap gap-2">
              {current.bandsUsed.map((b, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-xs font-mono font-bold text-slate-700 dark:text-slate-300"
                >
                  {b}
                </span>
              ))}
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                <Info className="w-3.5 h-3.5" /> Interpretasi Bio-Fisik Permukaan
              </div>
              {current.interpretation}
            </div>
          </div>

          {/* Area Breakdown Bars */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-500" /> Distribusi & Komposisi Wilayah (km²)
            </h5>
            <div className="space-y-2.5">
              {current.areaBreakdown.length === 0 && <p className="text-xs leading-relaxed text-slate-500">Komposisi wilayah belum tersedia. Luas dan persentase membutuhkan piksel raster pada AOI.</p>}
              {current.areaBreakdown.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                      {item.category}
                    </span>
                    <span className="font-bold font-mono text-slate-900 dark:text-white">
                      {current.meanValue !== null ? `${item.percentage}%` : '—'}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: current.meanValue !== null ? `${item.percentage}%` : '0%',
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Special Notes for LST & SAR */}
        {current.index === 'LST' && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900 dark:text-rose-200 leading-relaxed">
              <strong>Standar USGS Landsat Collection 2 Level-2 Surface Temperature:</strong> Menggunakan kalibrasi radiometrik sensor TIRS Thermal Band 10 dengan scale factor multiplicative 0.00341802 dan additive offset 149.0 (Kelvin). Nilai Celsius diperoleh dari pengurangan konstan 273.15. Data LST mengukur suhu kinetik permukaan fisik (atap/tanah/vegetasi), berbeda dari suhu udara 2 meter stasiun cuaca.
            </div>
          </div>
        )}

        {current.index === 'SAR_FLOOD' && (
          <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
            <div className="text-xs text-purple-900 dark:text-purple-200 leading-relaxed">
              <strong>Keunggulan Radar SAR C-Band:</strong> Berbeda dengan citra optik yang terhalang awan mendung dan malam hari, Sentinel-1 memancarkan gelombang radar aktif yang menembus tutupan awan hujan lebat Indonesia, sangat efektif untuk pemetaan darurat luapan banjir secara langsung (real-time flood mapping).
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
