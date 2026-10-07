import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  AlertTriangle, 
  ExternalLink, 
  Globe, 
  Orbit, 
  Pause, 
  Play, 
  Info, 
  RotateCcw,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Layers,
  Flame,
  Car,
  Activity,
  Compass,
  Search,
  Rocket,
  X,
  Navigation,
  Volume2,
  VolumeX
} from 'lucide-react';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { cosmicAudio } from './celestial/cosmicAudioSynth';
import type { Viewer, CustomDataSource } from 'cesium';
import { hardwarePerformanceService } from '@/services/hardwarePerformanceService';

import type { EarthquakeSnapshot } from '@/services/geospatial/earthquakeSnapshotService';
import type { HotspotSnapshot } from '@/services/hotspotFireService';
import { 
  GLOBAL_EARTH_SENSOR_NETWORK, 
  EarthSensorNode, 
  SENSOR_FAMILY_META,
  SensorFamily
} from '@/services/earthSensorRegistry';
import {
  BMKG_DOPPLER_RADAR_NETWORK,
  BMKG_BLANK_SPOT_ZONES
} from '@/services/observationCoverageService';
import { EQUATOR_MONUMENTS } from '@/services/seasonalIntelligenceService';
import { 
  PLANETARY_CATALOG, 
  CELESTIAL_ORDER, 
  CelestialBodyData 
} from '@/data/planetaryCatalog';
import { 
  CesiumCosmicEngine 
} from './celestial/CesiumCosmicEngine';
import { CelestialInfoPanel } from './celestial/CelestialInfoPanel';
import type { TrafficCorridor } from '@/services/trafficTelemetryService';

const EMPTY_DATA: never[] = [];
type CesiumModule = typeof import('cesium');

export type MapBasemapType = 'osm' | 'satellite' | 'elevation' | 'thermal' | 'traffic' | 'dark';

export interface CesiumGlobe3DProps {
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  userCoords?: { lat: number; lng: number; accuracy?: number } | null;
  activeRouteCoords?: [number, number][];
  earthquakes?: ReadonlyArray<{ id?: string | number; lat: number; lng: number; mag?: number; depth?: number; place?: string; source?: string; time?: string | number }>;
  hotspots?: ReadonlyArray<{ id?: string | number; lat: number; lng: number; frpMw?: number | null; satellite?: string; brightnessCelsius?: number | null }>;
  mountains?: ReadonlyArray<{ id?: string | number; lat: number; lng: number; name?: string; height?: number; type?: string; status?: string }>;
  showActiveVolcanoes?: boolean;
  showInactiveVolcanoes?: boolean;
  showPeaks?: boolean;
  showTectonicPlates?: boolean;
  showEarthquakes?: boolean;
  showEarthSensors?: boolean;
  sensorFamilyFilter?: SensorFamily | 'ALL';
  showObservationCoverage?: boolean;
  showEquatorZones?: boolean;
  schools?: [number, number, number, number, string][];
  userSchoolId?: string | number | null;
  showSD?: boolean;
  showSMP?: boolean;
  showSMA?: boolean;
  weatherMapOverlay?: string;
  rainviewerPath?: string;
  rainviewerHost?: string;
  rainviewerSatellitePath?: string;
  globeType?: 'globe' | 'perspective' | 'cesium';
  onSelectSensor?: (sensor: EarthSensorNode) => void;
  quakeSnapshot?: EarthquakeSnapshot | null;
  hotspotSnapshot?: HotspotSnapshot | null;
  onSwitchTo2D?: (lat: number, lng: number, targetZoom?: number) => void;
  // Dynamic Map Basemap & Traffic/Disaster/Heatmap Layers
  basemap?: MapBasemapType;
  onBasemapChange?: (basemap: MapBasemapType) => void;
  showTrafficCorridors?: boolean;
  trafficDataList?: TrafficCorridor[];
  onToggleTraffic?: () => void;
  showHeatmapLayer?: boolean;
}

const validPosition = (lat: unknown, lng: unknown) => 
  typeof lat === 'number' && Number.isFinite(lat) && Math.abs(lat) <= 90 && 
  typeof lng === 'number' && Number.isFinite(lng) && Math.abs(lng) <= 180;

export function CesiumGlobe3D({
  initialCenter = { lat: -2.5, lng: 118 },
  initialZoom = 5,
  userCoords,
  activeRouteCoords,
  earthquakes = EMPTY_DATA,
  hotspots = EMPTY_DATA,
  mountains = EMPTY_DATA,
  showActiveVolcanoes = true,
  showInactiveVolcanoes = true,
  showPeaks = true,
  showTectonicPlates = false,
  showEarthquakes = true,
  showEarthSensors = true,
  sensorFamilyFilter = 'ALL',
  showObservationCoverage = false,
  showEquatorZones = false,
  schools = EMPTY_DATA,
  userSchoolId = null,
  showSD = false,
  showSMP = false,
  showSMA = false,
  weatherMapOverlay = 'none',
  rainviewerPath = '',
  rainviewerHost = 'https://tilecache.rainviewer.com',
  rainviewerSatellitePath = '',
  globeType = 'globe',
  onSelectSensor,
  quakeSnapshot,
  hotspotSnapshot,
  onSwitchTo2D,
  basemap = 'osm',
  onBasemapChange,
  showTrafficCorridors = false,
  trafficDataList = EMPTY_DATA,
  onToggleTraffic,
  showHeatmapLayer = false,
}: CesiumGlobe3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const creditRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const moduleRef = useRef<CesiumModule | null>(null);
  const dataRef = useRef<CustomDataSource | null>(null);
  const tectonicDataSourceRef = useRef<any>(null);
  const weatherRadarLayerRef = useRef<any>(null);
  const cosmicEngineRef = useRef<CesiumCosmicEngine | null>(null);
  const onSelectSensorRef = useRef(onSelectSensor);
  onSelectSensorRef.current = onSelectSensor;

  const focusRef = useRef(initialCenter);
  focusRef.current = initialCenter;

  const [status, setStatus] = useState<'LOADING' | 'READY' | 'FAILED'>('LOADING');
  const [terrainStatus, setTerrainStatus] = useState('Bola bumi WGS84 1:1; citra fotorealistik aktif.');
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<{ name: string; detail: string } | null>(null);

  // Basemap & Layer States
  const [activeBasemap, setActiveBasemap] = useState<MapBasemapType>(basemap);
  const [isTrafficActive, setIsTrafficActive] = useState<boolean>(showTrafficCorridors);
  const [isHeatmapActive, setIsHeatmapActive] = useState<boolean>(showHeatmapLayer);
  const [showBasemapMenu, setShowBasemapMenu] = useState<boolean>(false);

  // Cosmic Universe & Solar System States
  const [activeCelestialId, setActiveCelestialId] = useState<string>('earth');
  const [showCelestialPanel, setShowCelestialPanel] = useState<boolean>(false);
  const [isOrbitPaused, setIsOrbitPaused] = useState<boolean>(false);
  const [orbitSpeedMultiplier, setOrbitSpeedMultiplier] = useState<number>(1);
  const [isCosmicPanelOpen, setIsCosmicPanelOpen] = useState<boolean>(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      cosmicAudio.stop();
    };
  }, []);

  // Planet Directory & Tour States
  const [isPlanetDrawerOpen, setIsPlanetDrawerOpen] = useState<boolean>(false);
  const [planetCategoryFilter, setPlanetCategoryFilter] = useState<'all' | 'star' | 'terrestrial' | 'giant' | 'moon'>('all');
  const [planetSearchTerm, setPlanetSearchTerm] = useState<string>('');
  const [isTourActive, setIsTourActive] = useState<boolean>(false);

  // Sync props changes to local state
  useEffect(() => {
    setActiveBasemap(basemap);
  }, [basemap]);

  useEffect(() => {
    setIsTrafficActive(showTrafficCorridors);
  }, [showTrafficCorridors]);

  useEffect(() => {
    setIsHeatmapActive(showHeatmapLayer);
  }, [showHeatmapLayer]);

  // Sync speed and pause to cosmic engine
  useEffect(() => {
    if (cosmicEngineRef.current) {
      cosmicEngineRef.current.setPaused(isOrbitPaused);
    }
  }, [isOrbitPaused]);

  useEffect(() => {
    if (cosmicEngineRef.current) {
      cosmicEngineRef.current.setSpeedMultiplier(orbitSpeedMultiplier);
    }
  }, [orbitSpeedMultiplier]);

  // Automated Space Tour Timer
  useEffect(() => {
    if (!isTourActive) return;

    const tourSequence = ['earth', 'moon', 'mars', 'jupiter', 'saturn', 'sun', 'venus', 'mercury', 'neptune'];
    let currentIndex = 0;

    const tourInterval = setInterval(() => {
      currentIndex = (currentIndex + 1) % tourSequence.length;
      const targetId = tourSequence[currentIndex];
      setActiveCelestialId(targetId);
      cosmicEngineRef.current?.focusCelestialBody(targetId);
    }, 7000);

    return () => clearInterval(tourInterval);
  }, [isTourActive]);

  // Initialize Cesium Viewer
  useEffect(() => {
    let cancelled = false;
    let disposeSelection: (() => void) | undefined;
    let disposeCamera: (() => void) | undefined;
    let disposePerfSubscription: (() => void) | undefined;

    const initialize = async () => {
      try {
        (window as Window & { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = `${import.meta.env.BASE_URL}cesium/`;
        const C = await import('cesium');
        if (cancelled || !containerRef.current || !creditRef.current) return;
        moduleRef.current = C;
        const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
        C.Ion.defaultAccessToken = ionToken || '';

        const perfProfile = hardwarePerformanceService.getProfile();

        if (!hardwarePerformanceService.hasWebGL()) {
          throw new Error('Akselerasi WebGL tidak didukung pada browser/perangkat ini');
        }

        const viewer = new C.Viewer(containerRef.current, {
          animation: false,
          timeline: false,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          fullscreenButton: false,
          selectionIndicator: true,
          infoBox: false,
          baseLayer: false,
          terrainProvider: new C.EllipsoidTerrainProvider(),
          creditContainer: creditRef.current,
          requestRenderMode: true,
          maximumRenderTimeChange: 0.1,
          contextOptions: {
            webgl: {
              failIfMajorPerformanceCaveat: false,
              powerPreference: 'low-power',
              preserveDrawingBuffer: false,
            },
          },
        });

        viewerRef.current = viewer;
        viewer.useBrowserRecommendedResolution = false;
        viewer.resolutionScale = perfProfile.cesiumResolutionScale;
        if (viewer.canvas) {
          viewer.canvas.style.imageRendering = 'auto';
          viewer.canvas.style.touchAction = 'none';
          viewer.canvas.style.userSelect = 'none';
        }
        if (viewer.scene.postProcessStages?.fxaa) {
          viewer.scene.postProcessStages.fxaa.enabled = perfProfile.effectiveMode === 'high';
        }

        disposePerfSubscription = hardwarePerformanceService.subscribe((profile) => {
          if (cancelled || viewer.isDestroyed()) return;
          viewer.resolutionScale = profile.cesiumResolutionScale;
          viewer.scene.globe.maximumScreenSpaceError = profile.cesiumScreenSpaceError;
          if (viewer.scene.postProcessStages?.fxaa) {
            viewer.scene.postProcessStages.fxaa.enabled = profile.effectiveMode === 'high';
          }
          viewer.scene.requestRender();
        });

        // Configure camera zoom distance and disable collision detection
        viewer.scene.screenSpaceCameraController.minimumZoomDistance = 10;
        viewer.scene.screenSpaceCameraController.maximumZoomDistance = 5e14;
        viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;

        // Safeguard picking to prevent unhandled WebGL culling exceptions
        const originalPick = viewer.scene.pick.bind(viewer.scene);
        viewer.scene.pick = (windowPosition: any) => {
          try {
            return originalPick(windowPosition);
          } catch (err) {
            return undefined;
          }
        };

        // Synchronize Cesium clock with real-world local time
        viewer.clock.currentTime = C.JulianDate.fromDate(new Date());
        viewer.clock.clockRange = C.ClockRange.UNBOUNDED;
        viewer.clock.clockStep = C.ClockStep.SYSTEM_CLOCK_MULTIPLIER;
        viewer.clock.multiplier = 1.0;
        viewer.clock.shouldAnimate = true;

        // Realistic solar lighting & atmospheric scattering (Dynamic based on camera zoom)
        viewer.scene.fog.enabled = false;
        viewer.scene.highDynamicRange = false;
        viewer.scene.backgroundColor = C.Color.BLACK;
        viewer.scene.globe.baseColor = new C.Color(0.04, 0.12, 0.28, 1.0);
        viewer.scene.globe.enableLighting = false; // Initialized false for crystal-clear map reading
        viewer.scene.globe.depthTestAgainstTerrain = true;
        viewer.scene.globe.showGroundAtmosphere = false;
        viewer.scene.globe.atmosphereLightIntensity = 1.0;
        viewer.scene.globe.maximumScreenSpaceError = perfProfile.cesiumScreenSpaceError;
        if (viewer.scene.skyAtmosphere) {
          viewer.scene.skyAtmosphere.show = false;
        }

        // Apply initial imagery layer
        applyImageryProvider(viewer, C, activeBasemap);

        // GIS Data source for Earthpins, Disasters, Traffic, and Sensors
        const data = new C.CustomDataSource('Harmony — data spasial');
        data.clustering.enabled = true;
        data.clustering.pixelRange = 35;
        data.clustering.minimumClusterSize = 3;
        await viewer.dataSources.add(data);

        if (cancelled || viewer.isDestroyed()) return;
        dataRef.current = data;

        // Initialize Cesium Cosmic Engine (Milky Way Galaxy, Asteroid Belt, Solar System Planets, Solar Corona, Sunlight)
        const cosmicEngine = new CesiumCosmicEngine(viewer, C);
        cosmicEngineRef.current = cosmicEngine;
        (window as any).__cesiumViewer = viewer;
        (window as any).__cosmicEngine = cosmicEngine;

        // Dynamically toggle GIS data source visibility and lighting (hide ground pins in deep space, eliminate glare on close zoom)
        disposeCamera = viewer.camera.changed.addEventListener(() => {
          if (cancelled || viewer.isDestroyed() || !dataRef.current) return;
          const height = viewer.camera.positionCartographic?.height ?? 1e7;
          const isViewingEarthSurface = height < 25_000_000 && (!cosmicEngine.lockedTargetId || cosmicEngine.lockedTargetId === 'earth');
          if (dataRef.current.show !== isViewingEarthSurface) {
            dataRef.current.show = isViewingEarthSurface;
          }

          const isCloseMapZoom = height < 8_500_000 && (!cosmicEngine.lockedTargetId || cosmicEngine.lockedTargetId === 'earth');
          if (isCloseMapZoom) {
            if (viewer.scene.globe.enableLighting) viewer.scene.globe.enableLighting = false;
            if (viewer.scene.globe.showGroundAtmosphere) viewer.scene.globe.showGroundAtmosphere = false;
            if (viewer.scene.postProcessStages?.bloom?.enabled) viewer.scene.postProcessStages.bloom.enabled = false;
            if (viewer.scene.skyAtmosphere?.show) viewer.scene.skyAtmosphere.show = false;
            viewer.scene.globe.atmosphereLightIntensity = 0.0;
          } else {
            if (!viewer.scene.globe.enableLighting) viewer.scene.globe.enableLighting = true;
            // Keep ground atmosphere OFF to avoid washing out oceans and continents in white fog
            if (viewer.scene.globe.showGroundAtmosphere) viewer.scene.globe.showGroundAtmosphere = false;
            // Keep bloom OFF to prevent blinding overexposure glare on Earth's day side
            if (viewer.scene.postProcessStages?.bloom?.enabled) viewer.scene.postProcessStages.bloom.enabled = false;
            if (viewer.scene.skyAtmosphere && !viewer.scene.skyAtmosphere.show) {
              viewer.scene.skyAtmosphere.show = true;
              try {
                viewer.scene.skyAtmosphere.brightnessShift = -0.10;
                viewer.scene.skyAtmosphere.saturationShift = 0.15;
              } catch {}
            }
            viewer.scene.globe.atmosphereLightIntensity = 0.25;
          }
        });

        // Handle entity selection (celestial bodies or GIS objects)
        disposeSelection = viewer.selectedEntityChanged.addEventListener((entity) => {
          if (cancelled) return;
          if (entity && entity.properties?.celestialId) {
            const cid = entity.properties.celestialId.getValue();
            setActiveCelestialId(cid);
            setShowCelestialPanel(true);
            cosmicEngine.focusCelestialBody(cid);
            return;
          }
          if (entity && entity.properties?.sensorData && onSelectSensorRef.current) {
            onSelectSensorRef.current(entity.properties.sensorData.getValue());
          }
          setSelected(
            entity
              ? {
                  name: entity.name || 'Objek spasial',
                  detail: String(entity.properties?.detail?.getValue(viewer.clock.currentTime) || ''),
                }
              : null
          );
        });

        setStatus('READY');

        if (ionToken) {
          try {
            const terrain = await C.createWorldTerrainAsync();
            if (!cancelled && !viewer.isDestroyed()) {
              viewer.terrainProvider = terrain;
              setTerrainStatus('Relief Cesium World Terrain aktif; skala 1:1 photoreal.');
              viewer.scene.requestRender();
            }
          } catch {
            if (!cancelled) setTerrainStatus('Relief bola bumi WGS84 standar.');
          }
        }
      } catch (err: any) {
        if (cancelled) return;
        const viewer = viewerRef.current;
        if (viewer && !viewer.isDestroyed()) {
          try { viewer.destroy(); } catch (_) {}
        }
        viewerRef.current = null;
        setStatus('FAILED');
        const reason = err?.message || 'GPU atau driver tidak mendukung akselerasi 3D Cesium';
        setError(`Mode 3D tidak kompatibel (${reason}). Mengalihkan ke Peta 2D Cepat...`);
        if (onSwitchTo2D) {
          setTimeout(() => {
            if (!cancelled) {
              onSwitchTo2D(initialCenter.lat, initialCenter.lng, initialZoom);
            }
          }, 1200);
        }
      }
    };

    void initialize();

    return () => {
      cancelled = true;
      disposePerfSubscription?.();
      disposeSelection?.();
      disposeCamera?.();
      cosmicEngineRef.current?.destroy();
      cosmicEngineRef.current = null;
      const viewer = viewerRef.current;
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
      viewerRef.current = null;
      dataRef.current = null;
    };
  }, []);

  // Imagery Provider Switcher for Basemap Changes
  const applyImageryProvider = (viewer: Viewer, C: CesiumModule, type: MapBasemapType) => {
    try {
      const layers = viewer.imageryLayers;
      layers.removeAll();

      let provider: any;
      switch (type) {
        case 'satellite':
          provider = new C.UrlTemplateImageryProvider({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            maximumLevel: 19,
            credit: 'Esri World Imagery',
          });
          break;
        case 'dark':
          provider = new C.UrlTemplateImageryProvider({
            url: 'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
            maximumLevel: 19,
            credit: 'Esri World Dark Gray Canvas',
          });
          break;
        case 'elevation':
          provider = new C.UrlTemplateImageryProvider({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
            maximumLevel: 19,
            credit: 'Esri World Topo Map',
          });
          break;
        case 'thermal':
          provider = new C.UrlTemplateImageryProvider({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}',
            maximumLevel: 19,
            credit: 'Esri World Physical Map',
          });
          break;
        case 'traffic':
          provider = new C.UrlTemplateImageryProvider({
            url: 'https://mt{s}.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}',
            subdomains: ['0', '1', '2', '3'],
            maximumLevel: 20,
            credit: 'Google Traffic Maps',
          });
          break;
        case 'osm':
        default:
          provider = new C.OpenStreetMapImageryProvider({
            url: 'https://tile.openstreetmap.org/',
            credit: 'OpenStreetMap',
          });
          break;
      }

      provider.errorEvent?.addEventListener(() => {});
      layers.addImageryProvider(provider);
      viewer.scene.requestRender();
    } catch (err) {
      console.warn('Failed to switch Cesium imagery layer:', err);
    }
  };

  // Re-apply imagery provider when activeBasemap changes
  useEffect(() => {
    const viewer = viewerRef.current;
    const C = moduleRef.current;
    if (status !== 'READY' || !viewer || viewer.isDestroyed() || !C) return;

    applyImageryProvider(viewer, C, activeBasemap);
  }, [status, activeBasemap]);

  // Synchronize Tectonic Plates GeoJSON Layer
  useEffect(() => {
    const viewer = viewerRef.current;
    const C = moduleRef.current;
    if (status !== 'READY' || !viewer || viewer.isDestroyed() || !C) return;

    if (showTectonicPlates) {
      if (!tectonicDataSourceRef.current) {
        C.GeoJsonDataSource.load('/data/tectonic-plates.json', {
          stroke: C.Color.fromCssColorString('#f97316'),
          strokeWidth: 2.5,
          clampToGround: true,
        }).then((ds) => {
          if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
          tectonicDataSourceRef.current = ds;
          const entities = ds.entities.values;
          for (let i = 0; i < entities.length; i++) {
            const ent = entities[i];
            if (ent.polyline) {
              ent.polyline.material = new C.ColorMaterialProperty(
                C.Color.fromCssColorString('#f97316').withAlpha(0.85)
              );
              ent.polyline.width = new C.ConstantProperty(2.5);
              ent.polyline.clampToGround = new C.ConstantProperty(true);
            }
          }
          viewerRef.current.dataSources.add(ds);
          viewerRef.current.scene.requestRender();
        }).catch((err) => {
          console.warn('Gagal memuat lempeng tektonik 3D:', err);
        });
      } else {
        tectonicDataSourceRef.current.show = true;
        viewer.scene.requestRender();
      }
    } else if (tectonicDataSourceRef.current) {
      tectonicDataSourceRef.current.show = false;
      viewer.scene.requestRender();
    }
  }, [status, showTectonicPlates]);

  // Synchronize Weather Radar / Satellite Overlay Layer
  useEffect(() => {
    const viewer = viewerRef.current;
    const C = moduleRef.current;
    if (status !== 'READY' || !viewer || viewer.isDestroyed() || !C) return;

    if (weatherRadarLayerRef.current) {
      viewer.imageryLayers.remove(weatherRadarLayerRef.current, true);
      weatherRadarLayerRef.current = null;
    }

    const isSat = weatherMapOverlay === 'satellite';
    const hasPath = Boolean(rainviewerPath || (isSat && rainviewerSatellitePath));

    if (weatherMapOverlay !== 'none' && hasPath) {
      try {
        const activePath = isSat && rainviewerSatellitePath ? rainviewerSatellitePath : rainviewerPath;
        const host = rainviewerHost || 'https://tilecache.rainviewer.com';
        const colorScheme = isSat ? '0' : '2';
        const radarProvider = new C.UrlTemplateImageryProvider({
          url: `${host}${activePath}/256/{z}/{x}/{y}/${colorScheme}/1_1.png`,
          maximumLevel: 7,
          credit: 'RainViewer Realtime Weather Radar',
        });
        radarProvider.errorEvent?.addEventListener(() => {});
        const layer = viewer.imageryLayers.addImageryProvider(radarProvider);
        layer.alpha = 0.85;
        weatherRadarLayerRef.current = layer;
        viewer.scene.requestRender();
      } catch (err) {
        console.warn('Gagal memuat layer radar cuaca di Cesium 3D:', err);
      }
    }
  }, [status, weatherMapOverlay, rainviewerPath, rainviewerHost, rainviewerSatellitePath]);

  // Initial Camera Fly-to
  useEffect(() => {
    const viewer = viewerRef.current;
    const C = moduleRef.current;
    if (status !== 'READY' || !viewer || viewer.isDestroyed() || !C || !validPosition(initialCenter.lat, initialCenter.lng)) return;

    const targetAltitude = initialZoom
      ? Math.max(1500, Math.min(20000000, 36000000 / Math.pow(2, Math.max(1, initialZoom - 1))))
      : 3500000;

    viewer.camera.flyTo({
      destination: C.Cartesian3.fromDegrees(initialCenter.lng, initialCenter.lat, targetAltitude),
      orientation: {
        heading: 0,
        pitch: C.Math.toRadians(-89.5),
        roll: 0,
      },
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1.2,
    });
  }, [status, initialCenter.lat, initialCenter.lng, initialZoom]);

  // Populate GIS Layer Entities (Earthquakes, Hotspots, Volcanoes, Sensors, Blank Spots, Equator, Schools, Routes, Traffic, Heatmap)
  useEffect(() => {
    const viewer = viewerRef.current;
    const C = moduleRef.current;
    const data = dataRef.current;
    if (status !== 'READY' || !viewer || viewer.isDestroyed() || !C || !data) return;

    data.entities.removeAll();
    setSelected(null);

    // 1. Earthquakes with Impact Wave Rings
    if (showEarthquakes !== false && earthquakes && earthquakes.length > 0) {
      earthquakes.forEach((eq, index) => {
        if (!validPosition(eq.lat, eq.lng)) return;
        const mag = typeof eq.mag === 'number' && Number.isFinite(eq.mag) ? eq.mag : 4.0;
        const depth = typeof eq.depth === 'number' && Number.isFinite(eq.depth) ? eq.depth : null;

        const markerColor = mag >= 6.0 
          ? C.Color.fromCssColorString('#ef4444') 
          : mag >= 5.0 
          ? C.Color.fromCssColorString('#f97316') 
          : C.Color.fromCssColorString('#eab308');

        // Core epicenter pin
        data.entities.add({
          id: `quake-${eq.source || 'source'}-${eq.id ?? index}`,
          name: `Gempa ${mag ? `M${mag.toFixed(1)}` : ''}`,
          position: C.Cartesian3.fromDegrees(eq.lng, eq.lat),
          point: {
            pixelSize: Math.max(7, Math.min(16, mag * 2.5)),
            color: markerColor,
            outlineColor: C.Color.WHITE,
            outlineWidth: 1.5,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          properties: {
            detail: `${eq.place || 'Lokasi n/a'} • Kedalaman: ${depth === null ? 'n/a' : `${depth} km`} • Waktu: ${eq.time || 'Terkini'} • Sumber: ${eq.source || 'InaTEWS / BMKG / USGS'}`,
          },
        });

        // Semi-transparent seismic impact wave ring (visible on macro/regional view, disappears on close zoom so map is readable)
        const waveRadius = Math.max(15000, mag * 28000);
        data.entities.add({
          id: `quake-wave-${eq.id ?? index}`,
          name: `Zona Guncangan Gempa M${mag.toFixed(1)}`,
          position: C.Cartesian3.fromDegrees(eq.lng, eq.lat),
          ellipse: {
            semiMinorAxis: waveRadius,
            semiMajorAxis: waveRadius,
            height: 0,
            material: new C.ColorMaterialProperty(markerColor.withAlpha(0.12)),
            outline: true,
            outlineColor: markerColor.withAlpha(0.55),
            outlineWidth: 1.5,
            distanceDisplayCondition: new C.DistanceDisplayCondition(2000000, 25000000),
          },
        });
      });
    }

    // 2. Hotspots (Thermal Fire Anomalies)
    hotspots.forEach((h, index) => {
      if (!validPosition(h.lat, h.lng)) return;
      data.entities.add({
        id: `hotspot-${h.id ?? index}`,
        name: 'Titik Api Satelit (Hotspot)',
        position: C.Cartesian3.fromDegrees(h.lng, h.lat),
        point: {
          pixelSize: 9,
          color: C.Color.fromCssColorString('#f43f5e'),
          outlineColor: C.Color.WHITE,
          outlineWidth: 1.5,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        properties: {
          detail: `FRP: ${h.frpMw ?? 'n/a'} MW • Kecerahan: ${h.brightnessCelsius ?? 'n/a'} °C • ${h.satellite || 'Satelit VIIRS / MODIS'}.`,
        },
      });
    });

    // 3. Mountains & Volcanoes with Alert Beacons
    mountains.forEach((m, index) => {
      if (!validPosition(m.lat, m.lng)) return;
      const isVolcano = m.type === 'volcano';
      const isActive = isVolcano && m.status === 'Active';
      const isInactive = isVolcano && m.status !== 'Active';
      const isPeak = m.type === 'peak' || !isVolcano;

      if (isActive && !showActiveVolcanoes) return;
      if (isInactive && !showInactiveVolcanoes) return;
      if (isPeak && !showPeaks) return;

      const pinColor = isActive ? '#ef4444' : isInactive ? '#ea580c' : '#10b981';
      const pinSize = isActive ? 12 : isInactive ? 9 : 8;

      data.entities.add({
        id: `mountain-${m.id ?? index}`,
        name: m.name ? `Gunung ${m.name}` : 'Gunung Api',
        position: C.Cartesian3.fromDegrees(m.lng, m.lat),
        point: {
          pixelSize: pinSize,
          color: C.Color.fromCssColorString(pinColor),
          outlineColor: C.Color.WHITE,
          outlineWidth: isActive ? 2.5 : 1.5,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: `${isActive ? '🌋' : isInactive ? '🌋' : '⛰️'} ${m.name || 'Gunung'}`,
          font: 'bold 11px Inter, sans-serif',
          fillColor: C.Color.WHITE,
          outlineColor: C.Color.BLACK,
          outlineWidth: 2,
          style: C.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new C.Cartesian2(0, -18),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          distanceDisplayCondition: new C.DistanceDisplayCondition(0, 3000000),
        },
        properties: {
          detail: `${m.name || 'Gunung'} • Ketinggian: ${m.height ? `${m.height} mdpl` : 'N/A'} • Status: ${m.type || 'Vulkanik'} (${m.status || 'Normal'})`,
        },
      });
    });

    // 4. Global Earth Sensor Network (Filtered by Sensor Family)
    if (showEarthSensors) {
      GLOBAL_EARTH_SENSOR_NETWORK.forEach((sensor) => {
        if (!validPosition(sensor.lat, sensor.lng)) return;
        if (sensorFamilyFilter && sensorFamilyFilter !== 'ALL' && sensor.family !== sensorFamilyFilter) {
          return;
        }
        const meta = SENSOR_FAMILY_META[sensor.family];
        data.entities.add({
          id: `sensor-${sensor.id}`,
          name: `Sensor: ${sensor.name}`,
          position: C.Cartesian3.fromDegrees(sensor.lng, sensor.lat),
          point: {
            pixelSize: 8,
            color: C.Color.fromCssColorString(meta?.colorHex || '#06b6d4'),
            outlineColor: C.Color.WHITE,
            outlineWidth: 1.5,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          properties: {
            detail: `ID: ${sensor.id} • Wilayah: ${sensor.country} (${sensor.coverage}) • Tipe: ${meta?.name || sensor.family} • Status: ${sensor.status}`,
            sensorData: sensor,
          },
        });
      });
    }

    // 5. Doppler Radar Coverage & Blank Spot Zones
    if (showObservationCoverage) {
      BMKG_DOPPLER_RADAR_NETWORK.forEach((radar) => {
        if (!validPosition(radar.lat, radar.lng)) return;
        data.entities.add({
          id: `radar-station-${radar.code}`,
          name: `Radar Doppler: ${radar.name}`,
          position: C.Cartesian3.fromDegrees(radar.lng, radar.lat),
          point: {
            pixelSize: 9,
            color: C.Color.fromCssColorString('#06b6d4'),
            outlineColor: C.Color.WHITE,
            outlineWidth: 2,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: `📡 ${radar.name}`,
            font: 'bold 10px Inter, sans-serif',
            fillColor: C.Color.WHITE,
            outlineColor: C.Color.BLACK,
            outlineWidth: 2,
            style: C.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new C.Cartesian2(0, -16),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            distanceDisplayCondition: new C.DistanceDisplayCondition(0, 1800000),
          },
          properties: {
            detail: `${radar.name} (${radar.code}) • Kota: ${radar.city}, ${radar.province} • Jangkauan: ${radar.rangeKm} km • Tipe: ${radar.type} • Status: ${radar.status} • Operator: ${radar.operator}`,
          },
        });

        // High coverage ellipse (< 20 km)
        data.entities.add({
          id: `radar-high-${radar.code}`,
          name: `Cakupan Tinggi (<20km) ${radar.name}`,
          position: C.Cartesian3.fromDegrees(radar.lng, radar.lat),
          ellipse: {
            semiMinorAxis: 20000,
            semiMajorAxis: 20000,
            height: 0,
            material: new C.ColorMaterialProperty(C.Color.fromCssColorString('#10b981').withAlpha(0.2)),
          },
        });

        // Max sweep range ellipse
        data.entities.add({
          id: `radar-max-${radar.code}`,
          name: `Jangkauan Maksimal (${radar.rangeKm}km) ${radar.name}`,
          position: C.Cartesian3.fromDegrees(radar.lng, radar.lat),
          ellipse: {
            semiMinorAxis: radar.rangeKm * 1000,
            semiMajorAxis: radar.rangeKm * 1000,
            height: 0,
            material: new C.ColorMaterialProperty(C.Color.fromCssColorString('#06b6d4').withAlpha(0.04)),
            outline: true,
            outlineColor: C.Color.fromCssColorString('#06b6d4').withAlpha(0.35),
            outlineWidth: 1.2,
            distanceDisplayCondition: new C.DistanceDisplayCondition(1500000, 25000000),
          },
        });
      });

      BMKG_BLANK_SPOT_ZONES.forEach((spot) => {
        const [sLng, sLat] = spot.center;
        if (!validPosition(sLat, sLng)) return;
        data.entities.add({
          id: `blankspot-${spot.id}`,
          name: spot.name,
          position: C.Cartesian3.fromDegrees(sLng, sLat),
          point: {
            pixelSize: 11,
            color: C.Color.fromCssColorString('#e11d48'),
            outlineColor: C.Color.WHITE,
            outlineWidth: 2,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: `⚠️ ${spot.name}`,
            font: 'bold 10px Inter, sans-serif',
            fillColor: C.Color.fromCssColorString('#fca5a5'),
            outlineColor: C.Color.BLACK,
            outlineWidth: 2,
            style: C.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new C.Cartesian2(0, -18),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            distanceDisplayCondition: new C.DistanceDisplayCondition(0, 3500000),
          },
          ellipse: {
            semiMinorAxis: spot.radiusKm * 1000,
            semiMajorAxis: spot.radiusKm * 1000,
            height: 0,
            material: new C.ColorMaterialProperty(C.Color.fromCssColorString('#e11d48').withAlpha(0.25)),
            outline: true,
            outlineColor: C.Color.fromCssColorString('#e11d48').withAlpha(0.8),
            outlineWidth: 2,
          },
          properties: {
            detail: `Zona Kesenjangan (Blank Spot): ${spot.name} • Wilayah: ${spot.region} • Tingkat Risiko: ${spot.severity} • Jarak Radar Terdekat: ${spot.nearestRadarKm} km (${spot.nearestRadarName}) • Catatan: ${spot.impactNote}`,
          },
        });
      });
    }

    // 6. Equator & Climate Zones (Garis Khatulistiwa, Garis Balik & Monumen)
    if (showEquatorZones) {
      const eqCoords: any[] = [];
      for (let lng = -180; lng <= 180; lng += 2) {
        eqCoords.push(C.Cartesian3.fromDegrees(lng, 0.0, 50));
      }
      data.entities.add({
        id: 'equator-0-deg',
        name: "Garis Khatulistiwa (Equator 0°00'00\")",
        polyline: {
          positions: eqCoords,
          width: 2.5,
          clampToGround: true,
          material: new C.PolylineDashMaterialProperty({
            color: C.Color.fromCssColorString('#f59e0b'),
            dashLength: 16,
          }),
        },
        properties: {
          detail: 'Garis Lintang 0°00\'00" yang membagi belahan bumi Utara dan Selatan. Titik kulminasi matahari tanpa bayangan.',
        },
      });

      const cancerCoords: any[] = [];
      for (let lng = -180; lng <= 180; lng += 2) {
        cancerCoords.push(C.Cartesian3.fromDegrees(lng, 23.4366, 50));
      }
      data.entities.add({
        id: 'tropic-cancer-line',
        name: 'Garis Balik Utara (Tropic of Cancer +23.44°)',
        polyline: {
          positions: cancerCoords,
          width: 1.8,
          clampToGround: true,
          material: new C.PolylineDashMaterialProperty({
            color: C.Color.fromCssColorString('#10b981'),
            dashLength: 12,
          }),
        },
        properties: {
          detail: 'Batas paling utara bumi di mana matahari dapat terlihat tepat di atas kepala (21 Juni).',
        },
      });

      const capricornCoords: any[] = [];
      for (let lng = -180; lng <= 180; lng += 2) {
        capricornCoords.push(C.Cartesian3.fromDegrees(lng, -23.4366, 50));
      }
      data.entities.add({
        id: 'tropic-capricorn-line',
        name: 'Garis Balik Selatan (Tropic of Capricorn -23.44°)',
        polyline: {
          positions: capricornCoords,
          width: 1.8,
          clampToGround: true,
          material: new C.PolylineDashMaterialProperty({
            color: C.Color.fromCssColorString('#06b6d4'),
            dashLength: 12,
          }),
        },
        properties: {
          detail: 'Batas paling selatan bumi di mana matahari dapat terlihat tepat di atas kepala (21-22 Desember).',
        },
      });

      EQUATOR_MONUMENTS.forEach((mon, mIdx) => {
        data.entities.add({
          id: `monument-${mIdx}`,
          name: mon.name,
          position: C.Cartesian3.fromDegrees(mon.lng, mon.lat),
          point: {
            pixelSize: 10,
            color: C.Color.fromCssColorString('#f59e0b'),
            outlineColor: C.Color.WHITE,
            outlineWidth: 2,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: `🏛️ ${mon.name}`,
            font: 'bold 11px Inter, sans-serif',
            fillColor: C.Color.fromCssColorString('#fef08a'),
            outlineColor: C.Color.BLACK,
            outlineWidth: 2.5,
            style: C.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new C.Cartesian2(0, -18),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            distanceDisplayCondition: new C.DistanceDisplayCondition(0, 3500000),
          },
          properties: {
            detail: `${mon.name} • ${mon.location} • ${mon.description}`,
          },
        });
      });
    }

    // 7. Education & School Layers (SD, SMP, SMA, and User School)
    if ((showSD || showSMP || showSMA) && schools && schools.length > 0) {
      const visibleSchools: typeof schools = [];
      let userSchoolFound: (typeof schools)[0] | null = null;

      for (let i = 0; i < schools.length; i++) {
        const s = schools[i];
        if (userSchoolId != null && (s[0] === userSchoolId || String(s[0]) === String(userSchoolId))) {
          userSchoolFound = s;
          continue;
        }
        const cat = s[3];
        if (cat === 2 && showSD) visibleSchools.push(s);
        else if (cat === 3 && showSMP) visibleSchools.push(s);
        else if ((cat === 4 || cat === 0) && showSMA) visibleSchools.push(s);
      }

      if (userSchoolFound) {
        const [uId, uLat, uLng, uCat, uName] = userSchoolFound;
        data.entities.add({
          id: `school-user-${uId}`,
          name: `⭐ ${uName} (Sekolah Anda)`,
          position: C.Cartesian3.fromDegrees(uLng, uLat),
          point: {
            pixelSize: 14,
            color: C.Color.fromCssColorString('#f59e0b'),
            outlineColor: C.Color.WHITE,
            outlineWidth: 3,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: `⭐ ${uName}`,
            font: 'bold 12px Inter, sans-serif',
            fillColor: C.Color.fromCssColorString('#fbbf24'),
            outlineColor: C.Color.BLACK,
            outlineWidth: 2.5,
            style: C.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new C.Cartesian2(0, -20),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          properties: {
            detail: `Sekolah Anda: ${uName} • Jenjang: ${uCat === 2 ? 'SD / MI' : uCat === 3 ? 'SMP / MTs' : 'SMA / SMK'} • NPSN/ID: ${uId}`,
          },
        });
      }

      const maxDisplay = 1500;
      const step = Math.max(1, Math.floor(visibleSchools.length / maxDisplay));
      for (let i = 0; i < visibleSchools.length; i += step) {
        const [sId, sLat, sLng, sCat, sName] = visibleSchools[i];
        if (!validPosition(sLat, sLng)) continue;

        const colorHex = sCat === 2 ? '#06b6d4' : sCat === 3 ? '#3b82f6' : '#6366f1';
        data.entities.add({
          id: `school-${sId}`,
          name: sName,
          position: C.Cartesian3.fromDegrees(sLng, sLat),
          point: {
            pixelSize: 7.5,
            color: C.Color.fromCssColorString(colorHex),
            outlineColor: C.Color.WHITE,
            outlineWidth: 1.5,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: sName,
            font: '10px Inter, sans-serif',
            fillColor: C.Color.WHITE,
            outlineColor: C.Color.BLACK,
            outlineWidth: 2,
            style: C.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new C.Cartesian2(0, -14),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            distanceDisplayCondition: new C.DistanceDisplayCondition(0, 350000),
          },
          properties: {
            detail: `${sName} • Jenjang: ${sCat === 2 ? 'SD / MI' : sCat === 3 ? 'SMP / MTs' : 'SMA / SMK'} • NPSN/ID: ${sId}`,
          },
        });
      }
    }

    // 8. User Position GPS Pin
    if (userCoords && validPosition(userCoords.lat, userCoords.lng)) {
      data.entities.add({
        id: 'user-position',
        name: 'Lokasi Anda',
        position: C.Cartesian3.fromDegrees(userCoords.lng, userCoords.lat),
        point: {
          pixelSize: 12,
          color: C.Color.CYAN,
          outlineColor: C.Color.WHITE,
          outlineWidth: 2.5,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
    }

    // 9. Active Navigation Route
    const route = (activeRouteCoords || []).filter(([lng, lat]) => validPosition(lat, lng));
    if (route.length >= 2) {
      data.entities.add({
        id: 'active-route',
        name: 'Rute Navigasi Aktif',
        polyline: {
          positions: route.map(([lng, lat]) => C.Cartesian3.fromDegrees(lng, lat)),
          width: 5,
          material: C.Color.CYAN,
          clampToGround: true,
        },
      });
    }

    // 10. 3D Traffic Corridors & Congestion Polylines
    if (isTrafficActive && trafficDataList && trafficDataList.length > 0) {
      trafficDataList.forEach((corridor) => {
        corridor.segments.forEach((seg, sIdx) => {
          if (!seg.path || seg.path.length < 2) return;

          const coordsFlat: number[] = [];
          seg.path.forEach(([lng, lat]) => {
            if (validPosition(lat, lng)) {
              coordsFlat.push(lng, lat);
            }
          });

          if (coordsFlat.length < 4) return;

          let colorHex = '#10b981'; // Lancar (green)
          let width = 6;
          if (seg.status === 'Ramai Lancar') {
            colorHex = '#f59e0b'; // amber
            width = 7;
          } else if (seg.status === 'Padat Merayap') {
            colorHex = '#ef4444'; // red
            width = 8;
          } else if (seg.status === 'Macet Total') {
            colorHex = '#991b1b'; // dark crimson
            width = 9;
          }

          data.entities.add({
            id: `traffic-${corridor.id}-seg-${seg.id || sIdx}`,
            name: `${corridor.name} (${seg.name})`,
            polyline: {
              positions: C.Cartesian3.fromDegreesArray(coordsFlat),
              width,
              clampToGround: true,
              material: new C.ColorMaterialProperty(
                C.Color.fromCssColorString(colorHex).withAlpha(0.9)
              ),
            },
            properties: {
              detail: `Koridor: ${corridor.name} • Ruas: ${seg.name} • Kecepatan: ${seg.speedKmh} km/jam • Status: ${seg.status} • Tundaan: ${seg.delayMin || 0} mnt`,
            },
          });
        });

        // Milestone checkpoints
        if (corridor.milestones) {
          corridor.milestones.forEach((ms, mIdx) => {
            if (!validPosition(ms.coord[1], ms.coord[0])) return;
            data.entities.add({
              id: `traffic-${corridor.id}-ms-${ms.id || mIdx}`,
              name: ms.name,
              position: C.Cartesian3.fromDegrees(ms.coord[0], ms.coord[1]),
              point: {
                pixelSize: 8,
                color: C.Color.fromCssColorString('#facc15'),
                outlineColor: C.Color.BLACK,
                outlineWidth: 1.5,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
              },
              label: {
                text: ms.name,
                font: 'bold 10px Inter, sans-serif',
                fillColor: C.Color.WHITE,
                outlineColor: C.Color.BLACK,
                outlineWidth: 2,
                style: C.LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new C.Cartesian2(0, -16),
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                distanceDisplayCondition: new C.DistanceDisplayCondition(0, 1200000),
              },
              properties: {
                detail: `Titik Pantau: ${ms.name} • Status: ${ms.status} • Kecepatan: ${ms.speedKmh} km/jam • Koridor: ${corridor.name}`,
              },
            });
          });
        }
      });
    }

    // 11. 3D Heatmap Overlay
    if (isHeatmapActive) {
      hotspots.slice(0, 60).forEach((h, hIdx) => {
        if (!validPosition(h.lat, h.lng)) return;
        const frp = h.frpMw || 25;
        const heatR = Math.max(15000, Math.min(90000, frp * 900));
        data.entities.add({
          id: `heatmap-hotspot-${hIdx}`,
          name: 'Zona Heatmap Anomali Termal',
          position: C.Cartesian3.fromDegrees(h.lng, h.lat),
          ellipse: {
            semiMinorAxis: heatR,
            semiMajorAxis: heatR,
            height: 0,
            material: new C.ColorMaterialProperty(
              C.Color.fromCssColorString('#f43f5e').withAlpha(0.18)
            ),
            distanceDisplayCondition: new C.DistanceDisplayCondition(2000000, 25000000),
          },
        });
      });

      earthquakes.slice(0, 30).forEach((eq, eqIdx) => {
        if (!validPosition(eq.lat, eq.lng)) return;
        const mag = eq.mag || 4.5;
        const heatR = mag * 30000;
        data.entities.add({
          id: `heatmap-seismic-${eqIdx}`,
          name: 'Zona Heatmap Seismik',
          position: C.Cartesian3.fromDegrees(eq.lng, eq.lat),
          ellipse: {
            semiMinorAxis: heatR,
            semiMajorAxis: heatR,
            height: 0,
            material: new C.ColorMaterialProperty(
              C.Color.fromCssColorString('#ea580c').withAlpha(0.16)
            ),
            distanceDisplayCondition: new C.DistanceDisplayCondition(2000000, 25000000),
          },
        });
      });
    }

    viewer.scene.requestRender();
  }, [
    status, 
    earthquakes, 
    hotspots, 
    mountains, 
    showActiveVolcanoes, 
    showInactiveVolcanoes, 
    showPeaks, 
    showEarthquakes,
    showEarthSensors, 
    sensorFamilyFilter,
    showObservationCoverage,
    showEquatorZones,
    schools,
    userSchoolId,
    showSD,
    showSMP,
    showSMA,
    activeRouteCoords, 
    userCoords,
    isTrafficActive,
    trafficDataList,
    isHeatmapActive
  ]);

  // Synchronized return to 2D
  const returnTo2D = useCallback(() => {
    const viewer = viewerRef.current;
    const C = moduleRef.current;
    if (viewer && !viewer.isDestroyed() && C) {
      const centerRay = viewer.camera.getPickRay(
        new C.Cartesian2(viewer.canvas.clientWidth / 2, viewer.canvas.clientHeight / 2)
      );
      let targetCartesian = centerRay ? viewer.scene.globe.pick(centerRay, viewer.scene) : null;
      if (!targetCartesian) {
        targetCartesian = viewer.camera.pickEllipsoid(
          new C.Cartesian2(viewer.canvas.clientWidth / 2, viewer.canvas.clientHeight / 2),
          viewer.scene.globe.ellipsoid
        );
      }

      let targetLat = focusRef.current.lat;
      let targetLng = focusRef.current.lng;
      let altitudeMeters = 3500000;

      if (targetCartesian) {
        const carto = C.Cartographic.fromCartesian(targetCartesian);
        targetLat = C.Math.toDegrees(carto.latitude);
        targetLng = C.Math.toDegrees(carto.longitude);
        altitudeMeters = C.Cartesian3.distance(viewer.camera.positionWC, targetCartesian);
      } else {
        const cameraCarto = C.Cartographic.fromCartesian(viewer.camera.positionWC);
        targetLat = C.Math.toDegrees(cameraCarto.latitude);
        targetLng = C.Math.toDegrees(cameraCarto.longitude);
        altitudeMeters = cameraCarto.height;
      }

      let targetZoom = Math.round(1 + Math.log2(36000000 / Math.max(100, altitudeMeters)));
      targetZoom = Math.max(3, Math.min(18, targetZoom));

      onSwitchTo2D?.(targetLat, targetLng, targetZoom);
      return;
    }
    onSwitchTo2D?.(focusRef.current.lat, focusRef.current.lng, 6);
  }, [onSwitchTo2D]);

  // Camera Target Actions
  const handleFlyToCelestial = (id: string) => {
    setIsTourActive(false);
    setActiveCelestialId(id);
    cosmicEngineRef.current?.focusCelestialBody(id);
    setIsPlanetDrawerOpen(false);
  };

  const handleReturnToEarth = () => {
    setIsTourActive(false);
    setActiveCelestialId('earth');
    cosmicEngineRef.current?.returnToEarth(initialCenter);
  };

  const handleZoomIn = () => {
    cosmicEngineRef.current?.zoomIn(0.5);
  };

  const handleZoomOut = () => {
    cosmicEngineRef.current?.zoomOut(2.0);
  };

  const handleSelectBasemap = (type: MapBasemapType) => {
    setActiveBasemap(type);
    onBasemapChange?.(type);
    setShowBasemapMenu(false);
  };

  // Filtered planet list for exploration drawer
  const filteredPlanets = CELESTIAL_ORDER.filter((id) => {
    const p = PLANETARY_CATALOG[id];
    if (!p) return false;

    // Search query filter
    if (planetSearchTerm.trim()) {
      const term = planetSearchTerm.toLowerCase();
      const matchName = p.name.toLowerCase().includes(term) || p.englishName.toLowerCase().includes(term);
      if (!matchName) return false;
    }

    // Category filter
    if (planetCategoryFilter === 'star') return p.type === 'star';
    if (planetCategoryFilter === 'terrestrial') return p.type === 'terrestrial';
    if (planetCategoryFilter === 'giant') return p.type === 'gas_giant' || p.type === 'ice_giant';
    if (planetCategoryFilter === 'moon') return p.type === 'moon';

    return true;
  });

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950">
      <div ref={containerRef} className="h-full w-full" aria-label="Peta Kosmik Cesium 3D" />
      <div ref={creditRef} className="absolute bottom-2 left-2 z-20 max-w-[90%] bg-slate-950/80 p-1 text-xs text-white" />

      {status === 'LOADING' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-xs text-white pointer-events-none">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 px-5 py-3 shadow-2xl">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
            <span className="text-xs font-semibold text-slate-200">Menyiapkan Mesin Spasial 3D…</span>
          </div>
        </div>
      )}

      {status === 'FAILED' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center text-white">
          <div className="max-w-md rounded-3xl border border-amber-500/30 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h3 className="font-display text-lg font-bold text-white mb-2">
              Akselerasi 3D Dibatasi
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-5">
              Perangkat ini (Smart TV / GPU terintegrasi) tidak mendukung komputasi WebGL 3D secara penuh. Sistem secara otomatis mengalihkan ke mode Peta 2D Cepat yang kompatibel dengan seluruh perangkat.
            </p>
            <button
              type="button"
              onClick={() => onSwitchTo2D?.(initialCenter.lat, initialCenter.lng, initialZoom)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg transition-all cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Buka Peta 2D Sekarang</span>
            </button>
          </div>
        </div>
      )}

      <style>{`
        .cesium-widget,
        .cesium-widget canvas {
          image-rendering: auto !important;
          touch-action: none !important;
          -webkit-touch-callout: none !important;
          -webkit-user-select: none !important;
          user-select: none !important;
        }
      `}</style>

      {/* ================= FLOATING TRIGGER BUTTON (ABOVE HARMONY MAPS SETTINGS) ================= */}
      {!isCosmicPanelOpen && (
        <button
          type="button"
          onClick={() => setIsCosmicPanelOpen(true)}
          className="pointer-events-auto absolute bottom-[5.75rem] right-6 z-20 flex items-center gap-3 rounded-2xl bg-white/95 dark:bg-slate-900/95 px-4 py-2.5 sm:py-3 shadow-2xl backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/90 transition-all hover:scale-[1.02] active:scale-95 group cursor-pointer shadow-brand-500/10"
          title="Klik untuk membuka Kontrol Tata Surya & Semesta Kosmik 3D"
        >
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 shadow-xs">
            <Orbit className="h-4 w-4 group-hover:rotate-180 transition-transform duration-700 text-sky-500" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
            </span>
          </div>
          <div className="flex flex-col items-start text-left pr-0.5">
            <div className="flex items-center gap-1.5">
              <span className="font-display font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
                Harmony Kosmik
              </span>
              <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-black bg-indigo-600 text-white shadow-xs">
                3D SEMESTA
              </span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              {activeCelestialId === 'earth' 
                ? 'Fokus: Bumi' 
                : activeCelestialId === 'overview'
                ? 'Ikhtisar Tata Surya'
                : `Fokus: ${PLANETARY_CATALOG[activeCelestialId]?.name || activeCelestialId}`}
            </span>
          </div>
        </button>
      )}

      {/* ================= HARMONY KOSMIK 3D SETTINGS DRAWER MODAL ================= */}
      {isCosmicPanelOpen && typeof document !== 'undefined' && createPortal(
        <>
          {/* Mobile Backdrop */}
          <div 
            onClick={() => setIsCosmicPanelOpen(false)}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[9998] sm:hidden pointer-events-auto"
          />

          <div 
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="fixed top-auto bottom-0 sm:top-4 sm:bottom-4 right-0 sm:right-4 left-0 sm:left-auto z-[9999] w-full sm:w-96 max-h-[88vh] sm:max-h-[calc(100vh-2rem)] rounded-t-3xl sm:rounded-3xl bg-white/95 dark:bg-slate-900/95 shadow-2xl backdrop-blur-2xl border-t sm:border border-slate-200/80 dark:border-slate-800 flex flex-col overflow-hidden text-slate-800 dark:text-slate-100 animate-in slide-in-from-right duration-300 pointer-events-auto"
            role="dialog"
            aria-label="Pengaturan Harmony Kosmik 3D"
          >
          {/* Mobile Drag Indicator */}
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

          {/* Panel Header */}
          <div className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800/80 shrink-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400 shadow-sm">
                  <Orbit className="h-5 w-5 animate-pulse text-indigo-500" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-base font-bold text-ink-900 dark:text-white leading-tight">
                      Harmony Kosmik
                    </h2>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white">
                      NASA JPL Ephemeris
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Semesta &amp; Tata Surya 3D Cesium
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={async () => {
                    const isPlaying = await cosmicAudio.toggle();
                    setIsAudioPlaying(isPlaying);
                  }}
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${
                    isAudioPlaying
                      ? 'text-purple-400 bg-purple-500/20'
                      : 'text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-slate-800'
                  }`}
                  title={isAudioPlaying ? 'Matikan Audio Kosmik Ambient' : 'Putar Musik Kosmik Ambient (Sci-Fi)'}
                >
                  {isAudioPlaying ? <Volume2 className="w-4 h-4 text-purple-400" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleReturnToEarth}
                  className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Pusatkan Kamera ke Bumi"
                >
                  <Globe className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsCosmicPanelOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Tutup Pengaturan Kosmik"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>

          {/* Panel Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Active Focus Target Banner */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-sky-500/15 via-indigo-500/15 to-purple-500/15 border border-sky-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                  {activeCelestialId === 'overview' ? '★' : PLANETARY_CATALOG[activeCelestialId]?.name?.charAt(0) || 'B'}
                </div>
                <div>
                  <span className="text-[10px] text-sky-400 font-mono block uppercase">Fokus Aktif</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">
                    {activeCelestialId === 'earth' 
                      ? 'Bumi (HD Kosmik)' 
                      : activeCelestialId === 'overview'
                      ? 'Ikhtisar Tata Surya'
                      : PLANETARY_CATALOG[activeCelestialId]?.name || activeCelestialId}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsTourActive(false);
                    cosmicEngineRef.current?.viewSolarSystemOverview();
                  }}
                  className="px-2.5 py-1 rounded-xl bg-amber-600/90 hover:bg-amber-500 text-white text-[10px] font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                  title="Lihat Semua Planet & Orbit Sekaligus"
                >
                  <Orbit className="w-3 h-3" />
                  <span>Semua Planet</span>
                </button>
                <button
                  type="button"
                  onClick={handleReturnToEarth}
                  className="px-2.5 py-1 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                  title="Kembali ke Peta Permukaan Bumi Indonesia (GIS)"
                >
                  <Globe className="w-3 h-3" />
                  <span>Peta GIS</span>
                </button>
              </div>
            </div>

            {/* Section 1: Navigasi Objek Antariksa */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Navigasi Objek Antariksa
                </h3>
                <span className="text-[10px] text-slate-500 font-mono">10 Objek Tata Surya</span>
              </div>

              {/* Grid of planet buttons */}
              <div className="grid grid-cols-5 gap-1.5 text-xs font-medium">
                {[
                  { id: 'earth', label: '🌍 Bumi' },
                  { id: 'sun', label: '☀️ Surya' },
                  { id: 'moon', label: '🌕 Bulan' },
                  { id: 'mars', label: '🔴 Mars' },
                  { id: 'jupiter', label: '🟠 Yupiter' },
                  { id: 'saturn', label: '🪐 Saturnus' },
                  { id: 'neptune', label: '🔵 Neptunus' },
                  { id: 'mercury', label: '🌑 Merkurius' },
                  { id: 'venus', label: '🟡 Venus' },
                  { id: 'uranus', label: '🟢 Uranus' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleFlyToCelestial(item.id)}
                    className={`py-2 px-1 rounded-xl border text-center transition-all truncate text-[10px] cursor-pointer ${
                      activeCelestialId === item.id
                        ? 'bg-sky-500 text-white font-bold border-sky-400 shadow-md shadow-sky-500/20'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/70 dark:hover:bg-slate-800 border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Action Buttons: Planet Directory & NASA Data */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsPlanetDrawerOpen(true)}
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Rocket size={14} className="text-amber-300" />
                  <span>Direktori Planet</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCelestialPanel(true)}
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
                >
                  <Info size={14} className="text-sky-500" />
                  <span>Data Sains NASA</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsTourActive(false);
                  setActiveCelestialId('overview');
                  cosmicEngineRef.current?.viewSolarSystemOverview();
                }}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all cursor-pointer"
              >
                <Sparkles size={14} className="text-amber-300" />
                <span>Lihat Ikhtisar Tata Surya (Top-Down)</span>
              </button>
            </section>

            {/* Section 2: Simulasi Waktu & Kecepatan Orbit */}
            <section className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Waktu &amp; Putaran Orbit
              </h3>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Status Simulasi
                </span>
                <button
                  type="button"
                  onClick={() => setIsOrbitPaused(!isOrbitPaused)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isOrbitPaused
                      ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40'
                  }`}
                >
                  {isOrbitPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  <span>{isOrbitPaused ? 'Orbit Dijeda' : 'Orbit Berjalan'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Kecepatan Orbit
                </span>
                <div className="flex items-center gap-1">
                  {[1, 5, 20, 100].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => {
                        setOrbitSpeedMultiplier(spd);
                        setIsOrbitPaused(false);
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold font-mono transition-colors cursor-pointer ${
                        orbitSpeedMultiplier === spd && !isOrbitPaused
                          ? 'bg-sky-500 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Section 3: Basemap Bumi 3D */}
            <section className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Gaya Peta Bumi 3D (Basemap)
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'satellite', label: 'Citra Satelit', icon: '🛰️', badge: 'Optik Hybrid' },
                  { id: 'osm', label: 'Peta Vektor', icon: '🗺️', badge: 'Standar OSM' },
                  { id: 'dark', label: 'Kanvas Gelap', icon: '🌌', badge: 'Night Mode' },
                  { id: 'elevation', label: 'Topografi', icon: '⛰️', badge: 'Relief DEM' },
                  { id: 'thermal', label: 'Fisik Bumi', icon: '🌡️', badge: 'Bioklimat' },
                  { id: 'traffic', label: 'Jalan & Trafik', icon: '🛣️', badge: 'Lalu Lintas' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectBasemap(item.id as MapBasemapType)}
                    className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      activeBasemap === item.id
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-transparent text-slate-700 dark:text-slate-300 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 w-full">
                      <span>{item.icon}</span>
                      <span className="text-xs font-semibold truncate">{item.label}</span>
                    </div>
                    <span className="text-[9px] font-mono opacity-75 mt-0.5">{item.badge}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Section 4: Lapisan Lanjut (Traffic & Heatmap) */}
            <section className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Lapisan Lanjut
              </h3>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <Car className="h-4 w-4 text-purple-500" />
                  <span>Lintasan Jalan &amp; Koridor Trafik</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsTrafficActive(!isTrafficActive);
                    onToggleTraffic?.();
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isTrafficActive ? 'bg-purple-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {isTrafficActive ? 'Aktif' : 'Nonaktif'}
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <Flame className="h-4 w-4 text-rose-500" />
                  <span>Heatmap Anomali Bencana</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsHeatmapActive(!isHeatmapActive)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isHeatmapActive ? 'bg-rose-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {isHeatmapActive ? 'Aktif' : 'Nonaktif'}
                </button>
              </div>
            </section>
          </div>

          {/* Panel Footer */}
          <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800/80 shrink-0 bg-slate-50/80 dark:bg-slate-900/80 flex items-center gap-2">
            {onSwitchTo2D && (
              <button
                type="button"
                onClick={returnTo2D}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shrink-0 cursor-pointer"
                title="Kembali ke tampilan peta 2D"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                <span>2D Datar</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsCosmicPanelOpen(false)}
              className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm active:scale-[0.99] cursor-pointer text-center"
            >
              Tutup Pengaturan
            </button>
          </div>
        </div>
        </>,
        document.body
      )}

      {/* ================= CELESTIAL INFO HUD PANEL (LEFT SIDE) ================= */}
      {showCelestialPanel && (
        <CelestialInfoPanel
          selectedBodyId={activeCelestialId}
          onSelectBody={(id) => {
            setActiveCelestialId(id);
            cosmicEngineRef.current?.focusCelestialBody(id);
          }}
          onFocusTarget={handleFlyToCelestial}
          onReturnToEarth={handleReturnToEarth}
          onClose={() => setShowCelestialPanel(false)}
        />
      )}

      {/* ================= PLANET DIRECTORY DRAWER MODAL ================= */}
      {isPlanetDrawerOpen && typeof document !== 'undefined' && createPortal(
        <div 
          onPointerDown={(e) => e.stopPropagation()}
          className="fixed inset-y-0 left-0 z-[10000] w-full sm:w-[26rem] md:w-[28rem] bg-slate-950/95 backdrop-blur-2xl border-r border-white/15 p-5 shadow-2xl flex flex-col text-slate-100 animate-in slide-in-from-left duration-300 pointer-events-auto overflow-hidden"
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Rocket size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white tracking-wide">
                  Direktori Tata Surya
                </h3>
                <p className="text-[11px] text-sky-400">
                  Kunjungi berbagai planet & bintang secara sinematik
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPlanetDrawerOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Actions & Auto Tour Button */}
          <div className="pt-3 pb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setIsTourActive(!isTourActive)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold text-xs shadow-lg transition-all cursor-pointer ${
                isTourActive 
                  ? 'bg-rose-600 text-white animate-pulse' 
                  : 'bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white'
              }`}
            >
              <Sparkles size={14} className="text-amber-300" />
              <span>{isTourActive ? 'Hentikan Tur Otomatis' : '🚀 Mulai Tur Sinematik Tata Surya'}</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative my-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="cesium-planet-search-input"
              name="planetSearch"
              type="text"
              placeholder="Cari nama planet (misal: Mars, Yupiter)..."
              value={planetSearchTerm}
              onChange={(e) => setPlanetSearchTerm(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none text-[11px]">
            {[
              { id: 'all', label: 'Semua' },
              { id: 'star', label: '☀️ Bintang' },
              { id: 'terrestrial', label: '🌍 Terestrial' },
              { id: 'giant', label: '🪐 Gas & Es' },
              { id: 'moon', label: '🌕 Satelit' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setPlanetCategoryFilter(cat.id as any)}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  planetCategoryFilter === cat.id 
                    ? 'bg-sky-500 text-white font-bold shadow-sm' 
                    : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Planet Cards List */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 mt-2 pb-32">
            {filteredPlanets.map((id) => {
              const body = PLANETARY_CATALOG[id];
              if (!body) return null;
              const isSelected = activeCelestialId === id;

              return (
                <div
                  key={id}
                  className={`p-3 rounded-2xl border transition-all ${
                    isSelected 
                      ? 'bg-sky-950/40 border-sky-500/60 shadow-lg shadow-sky-500/10' 
                      : 'bg-slate-900/70 border-white/10 hover:border-white/20 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shadow-inner shrink-0"
                        style={{ 
                          background: `radial-gradient(circle at 35% 35%, #ffffff 0%, ${body.visual.color} 70%, #000000 100%)`,
                          boxShadow: `0 0 12px ${body.visual.color}60`
                        }}
                      >
                        {body.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-sm text-white">
                            {body.name}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-400">
                            ({body.englishName})
                          </span>
                        </div>
                        <span className="text-[10px] text-sky-400 block font-medium">
                          {body.typeLabel}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">
                      {body.distanceFromSunAU === 0 ? 'Pusat' : `${body.distanceFromSunAU} AU`}
                    </span>
                  </div>

                  {/* Planet Quick Specs */}
                  <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2 border-t border-white/5 text-[11px] text-slate-300 font-mono">
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">Diameter</span>
                      <span>{body.diameterKm.toLocaleString()} km</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">Suhu Rata-rata</span>
                      <span>{body.surfaceTemp.avg}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => handleFlyToCelestial(id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                    >
                      <Navigation size={13} />
                      <span>Kunjungi Planet</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCelestialId(id);
                        setShowCelestialPanel(true);
                        setIsPlanetDrawerOpen(false);
                      }}
                      className="p-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Lihat Data Sains NASA Lengkap"
                    >
                      <Info size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>,
        document.body
      )}


      {/* ================= FLOATING ZOOM IN & ZOOM OUT CONTROLS (RIGHT SIDE) ================= */}
      <div 
        onPointerDown={(e) => e.stopPropagation()}
        className="pointer-events-auto absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1.5 rounded-2xl bg-slate-900/90 p-1.5 border border-slate-700/80 shadow-2xl backdrop-blur-xl"
      >
        <button
          type="button"
          onClick={handleZoomIn}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-sky-500/20 active:scale-90 transition-all cursor-pointer"
          title="Perbesar Tampilan (Zoom In)"
        >
          <ZoomIn size={18} />
        </button>
        <div className="w-4 h-px bg-white/15" />
        <button
          type="button"
          onClick={handleZoomOut}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-sky-500/20 active:scale-90 transition-all cursor-pointer"
          title="Perkecil Tampilan (Zoom Out)"
        >
          <ZoomOut size={18} />
        </button>
        <div className="w-4 h-px bg-white/15" />
        <button
          type="button"
          onClick={() => {
            setIsTourActive(false);
            setActiveCelestialId('overview');
            cosmicEngineRef.current?.viewSolarSystemOverview();
          }}
          className="p-2 rounded-xl text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 active:scale-90 transition-all cursor-pointer"
          title="Ikhtisar Seluruh Tata Surya (Tampilkan Semua Planet & Orbit)"
        >
          <Orbit size={18} />
        </button>
        <div className="w-4 h-px bg-white/15" />
        <button
          type="button"
          onClick={handleReturnToEarth}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-sky-500/20 active:scale-90 transition-all cursor-pointer"
          title="Fokus ke Bumi"
        >
          <Globe size={18} />
        </button>
        <div className="w-4 h-px bg-white/15" />
        <button
          type="button"
          onClick={async () => {
            const isPlaying = await cosmicAudio.toggle();
            setIsAudioPlaying(isPlaying);
          }}
          className={`p-2 rounded-xl active:scale-90 transition-all cursor-pointer ${
            isAudioPlaying
              ? 'text-purple-300 bg-purple-500/20 shadow-xs'
              : 'text-slate-300 hover:text-white hover:bg-purple-500/20'
          }`}
          title={isAudioPlaying ? 'Matikan Musik Kosmik Ambient' : 'Putar Musik Kosmik Ambient (Sci-Fi Interstellar)'}
        >
          {isAudioPlaying ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </div>

      {/* Floating Info Cards & Errors */}
      <div className="absolute bottom-6 right-4 z-20 max-w-sm pointer-events-none space-y-2 text-xs">
        {selected && (
          <div className="pointer-events-auto rounded-2xl bg-slate-900/95 border border-slate-700/80 p-3.5 text-white shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
            <strong className="text-sm text-sky-300 block">{selected.name}</strong>
            <p className="mt-1 text-slate-300 text-[11px] leading-relaxed">{selected.detail}</p>
          </div>
        )}

        {error && (
          <p role="alert" className="pointer-events-auto flex items-center gap-2 rounded-xl bg-amber-950/95 border border-amber-500/50 px-3 py-2 text-amber-200 text-xs shadow-xl">
            <AlertTriangle size={16} className="text-amber-400 shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    </div>
  );
}
