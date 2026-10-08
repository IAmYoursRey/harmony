import { readWeatherTileCoverage } from '../../../../services/geospatial/weatherTileCoverage';
import { 
  isValidUsgsFeed, 
  earthquakeSnapshotService, 
  EarthquakeSnapshot,
  type EarthquakeRecord 
} from '../../../../services/geospatial/earthquakeSnapshotService';
import "ol/ol.css";
import { defaults as defaultInteractions } from "ol/interaction/defaults";
import DragPan from "ol/interaction/DragPan";
import { noModifierKeys, primaryAction } from "ol/events/condition";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import { fromLonLat, toLonLat, transformExtent } from "ol/proj";
import GeoJSON from "ol/format/GeoJSON";
import OSMXML from "ol/format/OSMXML";
import { bbox as bboxStrategy } from "ol/loadingstrategy";
import Overlay from "ol/Overlay";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import LineString from "ol/geom/LineString";
import Polygon, { fromCircle } from "ol/geom/Polygon";
import CircleGeom from "ol/geom/Circle";
import { Style, RegularShape, Fill, Stroke, Circle as CircleStyle, Text } from "ol/style";
import TopoJSON from "ol/format/TopoJSON";
import { useEffect, useRef, useState, useMemo, useCallback, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import { apiClient } from "@/services/apiClient";
import { 
  Map as MapIcon, Mountain, GraduationCap, X, Menu, Building2, Settings, Search, MapPin, 
  Activity, CloudRain, Thermometer, Wind, Cloud, Sun, Globe, TreePine, Map as MapIcon2, 
  Newspaper, Palette, Paintbrush, Box, Compass, RotateCcw, RotateCw, LocateFixed, CloudSun,
  Waves, Gauge, Flame, AlertCircle, Navigation, Satellite, Layers, Car, Info, ShieldCheck,
  ArrowUp, ArrowUpRight, Check, Eye, Radio, BookOpen, ExternalLink, Calendar, Sparkles, Droplets,
  ChevronUp, ChevronDown, Database, Zap, Cpu, Video, Camera, Key, Play, Route, Sliders
} from "lucide-react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { seasonalIntelligenceService, type SeasonalInfo, EQUATOR_MONUMENTS } from "@/services/seasonalIntelligenceService";
import { useAuth } from "@/hooks/useAuth";
import { useSchool } from "@/hooks/useSchool";
import { useHardwarePerformance } from "@/hooks/useHardwarePerformance";
import { hardwarePerformanceService, type PerformanceMode } from "@/services/hardwarePerformanceService";
import { motion, AnimatePresence } from "framer-motion";
const CesiumGlobe3D = lazy(() => import("./CesiumGlobe3D").then(module => ({ default: module.CesiumGlobe3D })));
const GlobeView3D = lazy(() => import("./GlobeView3D").then(module => ({ default: module.GlobeView3D })));
import { volcanoService, type VolcanoLiveStatus } from "@/services/volcanoService";
import { GeospatialWeatherModal, STUDIO_DOMAINS, type StudioDomain } from "./GeospatialWeatherModal";
import { RouteNavigatorModal } from "./RouteNavigatorModal";
import { gnssElevationService, type GnssElevationReport } from "@/services/geospatial/gnssElevationService";
import { RouteResult, routingService } from "@/services/routingService";
import { WebGISTutorialModal } from "./WebGISTutorialModal";
import { DisasterRiskCenterModal, LANDSLIDE_SUSCEPTIBILITY_ZONES, TSUNAMI_HAZARD_ZONES } from "./DisasterRiskCenterModal";
import { preciseGeocodingService, PreciseLocationInfo } from "@/services/preciseGeocodingService";
import { geospatialAnalysisService } from "@/services/geospatialAnalysisService";
import { weatherAggregatorService } from "@/services/weatherAggregatorService";
import { bmkgService } from "@/services/bmkgService";
import { hotspotFireService, ActiveFireHotspot, HotspotSnapshot } from "@/services/hotspotFireService";
import {
  type TrafficCorridor,
  type TrafficSegment,
  type TrafficMilestone,
  INITIAL_TRAFFIC_CORRIDORS,
  simulateRealtimeTraffic,
  snapCorridorToActualRoad,
} from "@/services/trafficTelemetryService";
import { TSUNAMI_EARTH_SENSOR_NETWORK, TsunamiSensorNode } from "@/services/spatialDataEngine";
import { 
  GLOBAL_EARTH_SENSOR_NETWORK, 
  EarthSensorNode, 
  SensorFamily, 
  SENSOR_FAMILY_META, 
  getSensorRegistryStats 
} from "@/services/earthSensorRegistry";
import { SensorInspectorModal } from "./SensorInspectorModal";
import { MasterSensorTaxonomyModal } from "./MasterSensorTaxonomyModal";
import { DataSourceProvenanceModal } from "@/components/common/DataSourceProvenanceModal";
import {
  BMKG_DOPPLER_RADAR_NETWORK,
  BMKG_BLANK_SPOT_ZONES,
  type DopplerRadarStation,
  type BlankSpotZone,
} from "@/services/observationCoverageService";
import { MapGISToolbar } from "./map/MapGISToolbar";
import { MapAttributeTable, AttributeTableLayer } from "./map/MapAttributeTable";
import { MapIdentifyPanel } from "./map/MapIdentifyPanel";
import { MapLayerManager, ManagedLayer } from "./map/MapLayerManager";
import { MapGeoprocessingModal, PointDataset } from "./map/MapGeoprocessingModal";
import { MapWeatherObservationCard } from "./map/MapWeatherObservationCard";
import { SchoolRiskSynthesisCard } from "./SchoolRiskSynthesisCard";
import { GroundedScenarioModal } from "./GroundedScenarioModal";
import { aoiService, AreaOfInterest } from "@/services/geospatial/aoiService";
import { trafficCctvService, type TrafficCctvCamera } from "@/services/trafficCctvService";
import { trafficSignalsService, type TrafficSignalIntersection } from "@/services/trafficSignalsService";
import { liveTrafficFlowService, type LiveTrafficNetworkSummary } from "@/services/liveTrafficFlowService";
import { trafficGpsDensityService, computeTypicalTraffic, type TrafficCrowdsourceSummary } from "@/services/trafficGpsDensityService";
import { LiveCctvModal } from "./map/LiveCctvModal";
import { TrafficSignalModal } from "./map/TrafficSignalModal";
import { VolcanoDetailModal } from "./map/VolcanoDetailModal";
import { EarthquakeDetailModal } from "./map/EarthquakeDetailModal";
import { ThermalAnomalyDetailModal } from "./map/ThermalAnomalyDetailModal";

// Basemap Types & Provenance Metadata (>2020 High-Accuracy Datasets)
export type MapBasemapType = 'osm' | 'satellite' | 'elevation' | 'thermal' | 'traffic' | 'dark';

export interface BasemapMetadata {
  id: MapBasemapType;
  name: string;
  category: string;
  year: string;
  provider: string;
  resolution: string;
  accuracy: string;
  description: string;
  color: string;
  badge: string;
}

export const BASEMAP_METADATA: Record<MapBasemapType, BasemapMetadata> = {
  osm: {
    id: 'osm',
    name: 'Peta Vektor Standar',
    category: 'Rupa Bumi & Jalan (Komunitas)',
    year: 'Pembaruan Kontinu Komunitas',
    provider: 'OpenStreetMap Contributors (ODbL)',
    resolution: 'Vektor Multi-Skala',
    accuracy: 'Bervariasi per kontributor (Bukan sertifikasi resmi BIG)',
    description: 'Jaringan jalan, batas administrasi, dan fasilitas umum berbasis kontribusi komunitas global OpenStreetMap.',
    color: '#3b82f6',
    badge: 'Peta Komunitas',
  },
  satellite: {
    id: 'satellite',
    name: 'Citra Satelit Optik (Hybrid)',
    category: 'Penginderaan Jauh Optik Komposit',
    year: 'Bervariasi per mosaik/wilayah',
    provider: 'ESRI World Imagery, Maxar, Earthstar Geographics',
    resolution: 'Komposit Multi-Resolusi (GSD bervariasi)',
    accuracy: 'Akurasi geolokasi bergantung pada mosaik citra setempat',
    description: 'Mosaik citra satelit komposit optik global dilengkapi overlay toponimi dan jalan.',
    color: '#10b981',
    badge: 'Citra Satelit',
  },
  elevation: {
    id: 'elevation',
    name: 'Topografi & Relief Elevasi',
    category: 'Morfologi & Topografi',
    year: 'Model Elevasi Global (SRTM/USGS)',
    provider: 'ESRI World Topo Map & Relief',
    resolution: 'Kontur Ketinggian & Shaded Relief',
    accuracy: 'Akurasi vertikal bervariasi sesuai resolusi kontur sumber',
    description: 'Peta kontur elevasi, pegunungan, morfologi lereng, dan toponimi rupa bumi.',
    color: '#d97706',
    badge: 'Topografi',
  },
  thermal: {
    id: 'thermal',
    name: 'Peta Fisik & Bioklimat',
    category: 'Fisik Bumi & Iklim Makro',
    year: 'Data Bio-Fisik Global',
    provider: 'ESRI World Physical Map',
    resolution: '1 km Spatial Grid & Vegetasi Makro',
    accuracy: 'Klasifikasi bentang alam makro global',
    description: 'Peta bentang alam fisik, cekungan hidrologi, tutupan vegetasi, dan zona bioklimat global.',
    color: '#ef4444',
    badge: 'Fisik Bumi',
  },
  traffic: {
    id: 'traffic',
    name: 'Lintasan Jalan & Trafik Aliran',
    category: 'Infrastruktur Transportasi & Navigasi',
    year: 'Koridor Geometri OSM (Aliran Live jika Proxy Aktif)',
    provider: 'OpenStreetMap Corridors & Proxy TomTom (Opsional)',
    resolution: 'Segmen Koridor Utama',
    accuracy: 'Simulasi/model kecuali terhubung ke penyedia aliran langsung',
    description: 'Jaringan jalan utama dan arteri. Data kecepatan aktual memerlukan konfigurasi proxy penyedia aliran lalu lintas.',
    color: '#8b5cf6',
    badge: 'Lalu Lintas',
  },
  dark: {
    id: 'dark',
    name: 'Peta Kanvas Gelap (Night Mode)',
    category: 'Geometri Malam & Kontras Tinggi',
    year: 'Kanvas Vektor Standar',
    provider: 'ESRI World Dark Canvas & Geometri',
    resolution: 'Resolusi Vektor Kontras Tinggi',
    accuracy: 'Presisi Spasial Geodesi ESRI',
    description: 'Tampilan malam kontras tinggi untuk pemantauan data sensor dan sebaran titik bencana.',
    color: '#6366f1',
    badge: 'Mode Malam',
  },
};

export interface WindyParamMeta {
  id: string;
  name: string;
  badge: string;
  icon: string;
  desc: string;
}

export const WINDY_PARAM_CONFIG: WindyParamMeta[] = [
  {
    id: 'rain',
    name: 'Radar Hujan',
    badge: 'mm / Doppler',
    icon: '🌧️',
    desc: 'Intensitas presipitasi hujan & sel petir',
  },
  {
    id: 'radar',
    name: 'Doppler Radar',
    badge: 'Mosaik Radar',
    icon: '📡',
    desc: 'Reflektivitas radar cuaca mosaik (RainViewer Doppler / BMKG)',
  },
  {
    id: 'clouds',
    name: 'Satelit & Awan',
    badge: 'Model Awan',
    icon: '☁️',
    desc: 'Model tutupan awan & kelembaban atmosfer (ECMWF)',
  },
  {
    id: 'satellite',
    name: 'Citra Satelit',
    badge: 'Satelit Windy',
    icon: '🛰️',
    desc: 'Citra satelit inframerah interaktif via Penampil Windy',
  },
  {
    id: 'temp',
    name: 'Suhu Permukaan',
    badge: '°C Celcius',
    icon: '🌡️',
    desc: 'Distribusi suhu 2m di atas permukaan',
  },
  {
    id: 'wind',
    name: 'Aliran Angin',
    badge: 'km/j & Barbs',
    icon: '💨',
    desc: 'Vektor kecepatan dan arah hembusan angin',
  },
  {
    id: 'waves',
    name: 'Gelombang Laut',
    badge: 'Tinggi Signifikan',
    icon: '🌊',
    desc: 'Swell oseanografi dan arus perairan',
  },
  {
    id: 'pressure',
    name: 'Tekanan Udara',
    badge: 'hPa Isobar',
    icon: '⏱️',
    desc: 'Garis kontur isobar & gradien tekanan',
  },
  {
    id: 'pm2p5',
    name: 'Kualitas Udara',
    badge: 'PM2.5 µg/m³',
    icon: '🍃',
    desc: 'Konsentrasi partikulat aerosol & polutan',
  },
  {
    id: 'ozone',
    name: 'Lapisan Ozon',
    badge: 'Dobson DU',
    icon: '🌌',
    desc: 'Densitas kolom ozon stratosferik',
  },
];

export type { TrafficCorridor, TrafficSegment, TrafficMilestone };
export const INDONESIA_TRAFFIC_CORRIDORS: TrafficCorridor[] = INITIAL_TRAFFIC_CORRIDORS;

export const getCardinalDirection = (deg: number): { name: string; short: string; compassDeg: number } => {
  const normalized = ((deg % 360) + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return { name: 'Utara', short: 'U', compassDeg: 0 };
  if (normalized >= 22.5 && normalized < 67.5) return { name: 'Timur Laut', short: 'TL', compassDeg: 45 };
  if (normalized >= 67.5 && normalized < 112.5) return { name: 'Timur', short: 'T', compassDeg: 90 };
  if (normalized >= 112.5 && normalized < 157.5) return { name: 'Tenggara', short: 'TG', compassDeg: 135 };
  if (normalized >= 157.5 && normalized < 202.5) return { name: 'Selatan', short: 'S', compassDeg: 180 };
  if (normalized >= 202.5 && normalized < 247.5) return { name: 'Barat Daya', short: 'BD', compassDeg: 225 };
  if (normalized >= 247.5 && normalized < 292.5) return { name: 'Barat', short: 'B', compassDeg: 270 };
  return { name: 'Barat Laut', short: 'BL', compassDeg: 315 };
};

export const getSourceForBasemap = (type: MapBasemapType) => {
  switch (type) {
    case 'satellite':
      return new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
        crossOrigin: 'anonymous',
      });
    case 'elevation':
      return new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
        crossOrigin: 'anonymous',
      });
    case 'thermal':
      return new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
        crossOrigin: 'anonymous',
      });
    case 'traffic':
      return new XYZ({
        urls: [
          'https://mt0.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}',
          'https://mt1.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}',
          'https://mt2.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}',
          'https://mt3.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}',
        ],
        maxZoom: 20,
      });
    case 'dark':
      return new XYZ({
        url: 'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
        crossOrigin: 'anonymous',
      });
    case 'osm':
    default:
      return new OSM();
  }
};




const createEmptyLayer = (layerName: string, minZoomLevel: number, styleResolver: (feature: any) => Style) => {
  return new VectorLayer({
    source: new VectorSource(),
    style: styleResolver,
    minZoom: minZoomLevel,
    visible: false,
    zIndex: 2,
    properties: { name: layerName }
  });
};

// Map Layer Settings Definition & Defaults (All OFF by default for optimal performance, Tsunami Sensors ON)
export interface MapLayerSettings {
  showActive: boolean;
  showInactive: boolean;
  showPeaks: boolean;
  showSD: boolean;
  showSMP: boolean;
  showSMA: boolean;
  showTectonic: boolean;
  showEarthquakes: boolean;
  showTsunamiSensors: boolean;
  showForests: boolean;
  showKota: boolean;
  showKabupaten: boolean;
  showDesa: boolean;
  showLandslideZones?: boolean;
  showTsunamiZones?: boolean;
}

const DEFAULT_MAP_SETTINGS: MapLayerSettings = {
  showActive: false,
  showInactive: false,
  showPeaks: false,
  showSD: false,
  showSMP: false,
  showSMA: false,
  showTectonic: false,
  showEarthquakes: false,
  showTsunamiSensors: false,
  showForests: false,
  showKota: false,
  showKabupaten: false,
  showDesa: false,
  showLandslideZones: false,
  showTsunamiZones: false,
};

function getSynchronousUserId(): string {
  try {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('harmony_token') : null;
    if (token) {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload?.id) return String(payload.id);
      }
    }
  } catch (e) {}
  return '';
}

// Clean up legacy global keys so previous versions do not force 'true'
if (typeof window !== 'undefined' && !window.localStorage.getItem('hm_migrated_v4')) {
  try {
    ['hm_showActive', 'hm_showInactive', 'hm_showPeaks', 'hm_showSD', 'hm_showSMP', 'hm_showSMA', 'hm_showTectonic', 'hm_showEarthquakes', 'hm_showForests', 'hm_showKota', 'hm_showKabupaten', 'hm_showDesa', 'hm_equator_zones', 'hm_show_bottom_dock', 'hm_geospatial_intel_bar', 'hm_traffic_bar', 'hm_weather_card', 'hm_webgis_tutorial_seen'].forEach(k => window.localStorage.removeItem(k));
    Object.keys(window.localStorage).forEach((k) => {
      if (
        k.startsWith('hm_show_bottom_dock_') ||
        k.startsWith('hm_geospatial_intel_bar_') ||
        k.startsWith('hm_traffic_bar_') ||
        k.startsWith('hm_weather_card_')
      ) {
        window.localStorage.removeItem(k);
      }
      if (k.startsWith('hm_user_layers_')) {
        try {
          const parsed = JSON.parse(window.localStorage.getItem(k) || '{}');
          parsed.showTsunamiSensors = false;
          window.localStorage.setItem(k, JSON.stringify(parsed));
        } catch (e) {}
      }
    });
    window.localStorage.setItem('hm_migrated_v4', 'true');
  } catch (e) {}
}

function useUserMapSettings(userId: string, profileMapSettings?: Partial<MapLayerSettings>) {
  const getStoredSettings = (uid: string): MapLayerSettings => {
    try {
      const key = `hm_user_layers_${uid}`;
      const stored = window.localStorage.getItem(key);
      if (stored !== null) {
        return { ...DEFAULT_MAP_SETTINGS, ...JSON.parse(stored) };
      }
      if (profileMapSettings) {
        return { ...DEFAULT_MAP_SETTINGS, ...profileMapSettings };
      }
    } catch (e) {}
    return DEFAULT_MAP_SETTINGS;
  };

  const [settings, setSettings] = useState<MapLayerSettings>(() => getStoredSettings(userId));

  useEffect(() => {
    setSettings(getStoredSettings(userId));
  }, [userId, profileMapSettings]);

  const updateSetting = <K extends keyof MapLayerSettings>(
    key: K,
    value: boolean | ((prev: boolean) => boolean)
  ) => {
    setSettings((prev) => {
      const nextVal = typeof value === 'function' ? (value as any)(prev[key]) : value;
      const nextSettings = { ...prev, [key]: nextVal };
      try {
        window.localStorage.setItem(`hm_user_layers_${userId}`, JSON.stringify(nextSettings));
      } catch (e) {}

      // Persist to server profile if user is authenticated
      if (userId && userId !== 'guest') {
        apiClient.post('/api/profile', { mapSettings: nextSettings }).catch(() => {});
      }

      return nextSettings;
    });
  };

  return { settings, updateSetting };
}

// Reusable Toggle Component
const Toggle = ({ checked, onChange, activeClass = "bg-brand-500", label = "Aktifkan lapisan" }: { checked: boolean, onChange: (v: boolean) => void, activeClass?: string, label?: string }) => (
  <button type="button" role="switch" aria-checked={checked} aria-label={label} className="relative inline-flex shrink-0 items-center cursor-pointer rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500" onClick={() => onChange(!checked)}>
    <div className={`w-9 h-5 rounded-full transition-colors ${checked ? activeClass : 'bg-slate-200 dark:bg-slate-700'}`}>
      <div className={`absolute top-0.5 left-0.5 bg-white border border-slate-200 rounded-full h-4 w-4 transition-transform ${checked ? 'translate-x-4 border-transparent shadow-sm' : ''}`}></div>
    </div>
  </button>
);

// SD (Cyan/Light Blue)
const styleSD = new Style({ image: new CircleStyle({ radius: 2, fill: new Fill({ color: '#06b6d4' }) }), zIndex: 4 });

// SMP (Standard Blue)
const styleSMP = new Style({ image: new CircleStyle({ radius: 2, fill: new Fill({ color: '#3b82f6' }) }), zIndex: 4 });

// SMA/Other (Dark Navy)
const styleSMA = new Style({ image: new CircleStyle({ radius: 2, fill: new Fill({ color: '#1e3a8a' }) }), zIndex: 4 });

// Active User School (Larger solid dot, no hollow ring)
const styleActiveSchool = new Style({
  image: new CircleStyle({ radius: 5, fill: new Fill({ color: '#10b981' }) }), // Emerald green so it completely stands out
  zIndex: 10
});

export function MapsView() {
  const mapRef = useRef<Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const popupOverlayRef = useRef<Overlay | null>(null);
  const vectorLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const schoolsLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const activeSchoolLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const navigate = useNavigate();
  const { setMobileOpen } = useOutletContext<{ setMobileOpen: (v: boolean) => void }>();
  const { currentProfile, currentUser } = useAuth();
  const { selection, setSelection } = useSchool();
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [userAccuracy, setUserAccuracy] = useState<number | null>(null);
  const [userPreciseLocation, setUserPreciseLocation] = useState<PreciseLocationInfo | null>(null);
  
  // Custom Event Listener for popup buttons
  useEffect(() => {
    const handleViewProfile = (e: any) => {
      if (e.detail?.id) {
        setSelection({ id: e.detail.id, name: e.detail.name } as any);
        navigate('/app/resilience');
      }
    };
    window.addEventListener('view-school-profile', handleViewProfile);
    return () => window.removeEventListener('view-school-profile', handleViewProfile);
  }, [navigate, setSelection]);

  const activeUserId = currentProfile?.userId || currentUser?.id || getSynchronousUserId() || 'guest';
  const userSchoolId = currentUser ? currentProfile?.schoolId : null;
  const activeSchoolName = currentUser ? (selection?.school?.name || (currentProfile as any)?.schoolName || '') : '';
  const activeSchoolId = currentUser ? (selection?.school?.id || userSchoolId || null) : null;
  const activeSchoolLat = (currentUser && (selection?.school?.lat ?? (currentProfile as any)?.schoolLat)) ?? userCoords?.lat ?? -6.2088;
  const activeSchoolLng = (currentUser && (selection?.school?.lng ?? (currentProfile as any)?.schoolLng)) ?? userCoords?.lng ?? 106.8456;

  const [mountains, setMountains] = useState<any[]>(() => volcanoService.getAllMonitoredVolcanoes());
  const [schools, setSchools] = useState<any[]>([]);
  const [earthquakes, setEarthquakes] = useState<any[]>([]);
  const [hotspots, setHotspots] = useState<ActiveFireHotspot[]>([]);
  const [quakeSnapshot, setQuakeSnapshot] = useState<EarthquakeSnapshot | null>(() => earthquakeSnapshotService.getLatestSnapshot('2.5_day'));
  const [hotspotSnapshot, setHotspotSnapshot] = useState<HotspotSnapshot | null>(() => hotspotFireService.getLatestSnapshot({ bbox: [-180, -90, 180, 90], source: 'ALL' }));

  useEffect(() => {
    const unsubQuakes = earthquakeSnapshotService.subscribeEarthquakes({ feed: '2.5_day' }, (snap) => {
      setQuakeSnapshot(snap);
      setEarthquakes(snap.records as any[]);
    });
    const unsubHotspots = hotspotFireService.subscribeHotspots({ bbox: [-180, -90, 180, 90], source: 'ALL' }, (snap) => {
      setHotspotSnapshot(snap);
      setHotspots(snap.records as any[]);
    });
    const unsubVolcanoes = volcanoService.subscribe(() => {
      setMountains((prev) => {
        if (!prev || prev.length === 0) return prev;
        return prev.map((m) => {
          if (m.type !== 'volcano') return m;
          const matched = volcanoService.getVolcanoStatus(m.name);
          return matched ? { ...m, volcanoData: matched, alertLevel: matched.level } : m;
        });
      });
    });
    return () => {
      unsubQuakes();
      unsubHotspots();
      unsubVolcanoes();
    };
  }, []);
  const [mapReady, setMapReady] = useState(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mapMode, setMapMode] = useState<'spatial' | 'news' | 'art'>('spatial');
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  
  const [showPanel, setShowPanel] = useState(false);
  const [panelTab, setPanelTab] = useState<'all' | 'tools' | 'basemap' | 'disaster' | 'weather' | 'places'>('all');

  // Basemap & Provenance State (>2020 High Accuracy Standards)
  const [activeMapBasemap, setActiveMapBasemap] = useState<MapBasemapType>(() => {
    try {
      const saved = window.localStorage.getItem('hm_basemap_active');
      if (saved && ['osm', 'satellite', 'elevation', 'thermal', 'traffic', 'dark'].includes(saved)) {
        return saved as MapBasemapType;
      }
    } catch (e) {}
    return 'osm';
  });
  const [showBasemapMenu, setShowBasemapMenu] = useState<boolean>(false);
  const [showMetadataModal, setShowMetadataModal] = useState<boolean>(false);
  const [showDataProvenanceModal, setShowDataProvenanceModal] = useState<boolean>(false);
  // Geospatial Studio Modal State (Cloud Button)
  const [showGeospatialModal, setShowGeospatialModal] = useState<boolean>(false);
  const [showTrafficCorridors, setShowTrafficCorridors] = useState<boolean>(false);
  const [showObservationCoverage, setShowObservationCoverage] = useState<boolean>(false);
  const [selectedCorridor, setSelectedCorridor] = useState<TrafficCorridor | null>(null);
  const [trafficTierFilter, setTrafficTierFilter] = useState<'all' | 'expressway' | 'arterial' | 'collector' | 'local'>('all');
  const [trafficIslandFilter, setTrafficIslandFilter] = useState<string>('all');
  const [trafficSearchQuery, setTrafficSearchQuery] = useState<string>('');
  const [trafficDataList, setTrafficDataList] = useState<TrafficCorridor[]>(INDONESIA_TRAFFIC_CORRIDORS);
  const isLeanDevice = useMemo(() => {
    try {
      const diag = hardwarePerformanceService.getDiagnostics();
      const prof = hardwarePerformanceService.getProfile();
      return prof.effectiveMode === 'lite' || diag.isMobile || diag.isTouch || diag.isLowSpecDetected;
    } catch {
      return false;
    }
  }, []);

  const [isTrafficRefreshing, setIsTrafficRefreshing] = useState<boolean>(false);
  const [lastTrafficSyncTime, setLastTrafficSyncTime] = useState<string>('Baru saja');
  const [isAutoSyncTraffic, setIsAutoSyncTraffic] = useState<boolean>(false);
  const [syncCountdown, setSyncCountdown] = useState<number>(15);
  // Real-time Traffic Layers & Google Maps Traffic Engine States (Lightweight on-demand for mobile)
  const [trafficMode, setTrafficMode] = useState<'live' | 'typical'>('live');
  const [trafficTypicalDay, setTrafficTypicalDay] = useState<number>(() => new Date().getDay()); // 0 = M, 1 = S, 2 = S, 3 = R, 4 = K, 5 = J, 6 = S
  const [trafficTypicalHour, setTrafficTypicalHour] = useState<number>(() => {
    const d = new Date();
    return Math.round((d.getHours() + d.getMinutes() / 60) * 10) / 10;
  });
  const [showBottomDock, setShowBottomDock] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(`hm_show_bottom_dock_${activeUserId}`) === 'true';
    } catch {
      return false;
    }
  });
  const [showTrafficControlBar, setShowTrafficControlBar] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(`hm_traffic_bar_${activeUserId}`) === 'true';
    } catch {
      return false;
    }
  });
  const [showGeospatialIntelBar, setShowGeospatialIntelBar] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(`hm_geospatial_intel_bar_${activeUserId}`) === 'true';
    } catch {
      return false;
    }
  });
  const [showGpsProbes, setShowGpsProbes] = useState<boolean>(false);
  const [isBroadcastingUserGps, setIsBroadcastingUserGps] = useState<boolean>(false);
  const [crowdsourceSummary, setCrowdsourceSummary] = useState<TrafficCrowdsourceSummary>(() => trafficGpsDensityService.getSummary());
  const [showTrafficCctv, setShowTrafficCctv] = useState<boolean>(false);
  const [showTrafficSignals, setShowTrafficSignals] = useState<boolean>(false);
  const [selectedCctvCamera, setSelectedCctvCamera] = useState<TrafficCctvCamera | null>(null);
  const [cctvCameras, setCctvCameras] = useState<TrafficCctvCamera[]>(() => trafficCctvService.getAllCameras());
  const [cctvCityFilter, setCctvCityFilter] = useState<string>('Semua');
  const [cctvCategoryFilter, setCctvCategoryFilter] = useState<string>('Semua');
  const [cctvSearchQuery, setCctvSearchQuery] = useState<string>('');
  const [isCctvLoading, setIsCctvLoading] = useState<boolean>(false);
  const [cctvDisplayLimit, setCctvDisplayLimit] = useState<number>(40);
  const [selectedTrafficSignalId, setSelectedTrafficSignalId] = useState<string | null>(null);
  const [selectedVolcanoForModal, setSelectedVolcanoForModal] = useState<VolcanoLiveStatus | null>(null);
  const [selectedEarthquakeForModal, setSelectedEarthquakeForModal] = useState<EarthquakeRecord | null>(null);
  const [selectedHotspotForModal, setSelectedHotspotForModal] = useState<ActiveFireHotspot | null>(null);
  const [showHotspots, setShowHotspots] = useState<boolean>(false);
  const [liveTrafficSummary, setLiveTrafficSummary] = useState<LiveTrafficNetworkSummary | null>(null);
  const [trafficDrawerTab, setTrafficDrawerTab] = useState<'corridors' | 'probes' | 'cctv' | 'signals' | 'byok'>('corridors');
  const [customTomTomKeyInput, setCustomTomTomKeyInput] = useState<string>(() => liveTrafficFlowService.getCustomTomTomApiKey() || '');
  const [customTomTomKeyStatus, setCustomTomTomKeyStatus] = useState<string>('');
  const [uiExperienceMode, setUiExperienceMode] = useState<'education' | 'expert'>(() => {
    try {
      const saved = window.localStorage.getItem('hm_ui_experience_mode');
      if (saved === 'expert' || saved === 'education') return saved;
    } catch (e) {}
    return 'expert';
  });
  const [showGroundedScenarioModal, setShowGroundedScenarioModal] = useState<boolean>(false);
  const [tomtomProbeResult, setTomtomProbeResult] = useState<{
    corridorId: string;
    loading: boolean;
    status: 'LIVE' | 'NOT_CONFIGURED' | 'FAILED' | 'UNAVAILABLE' | 'LOADING';
    message: string;
    currentSpeedKmh?: number | null;
    freeFlowSpeedKmh?: number | null;
    confidence?: number | null;
    roadClosure?: boolean | null;
  } | null>(null);

  const handleCheckTomTomLive = async (corridor: TrafficCorridor) => {
    const reqCorridorId = corridor.id;
    const reqId = ((globalThis as any).__harmony_traffic_seq = ((globalThis as any).__harmony_traffic_seq || 0) + 1);
    (globalThis as any).__harmony_active_traffic_request_id = reqId;
    (globalThis as any).__harmony_active_traffic_corridor = reqCorridorId;
    setTomtomProbeResult({
      corridorId: corridor.id,
      loading: true,
      status: 'LOADING',
      message: 'Menghubungi proxy TomTom Traffic Flow...',
    });
    try {
      const trafficUrl = `/api/spatial/traffic/flow?lat=${corridor.center[1]}&lng=${corridor.center[0]}`;
      const res = await apiClient.get<any>(trafficUrl);
      if ((globalThis as any).__harmony_active_traffic_request_id !== reqId) return;

      const data = res?.data;
      const hasValidSpeeds = Boolean(
        data &&
        typeof data.currentSpeedKmh === 'number' && Number.isFinite(data.currentSpeedKmh) && data.currentSpeedKmh >= 0 &&
        typeof data.freeFlowSpeedKmh === 'number' && Number.isFinite(data.freeFlowSpeedKmh) && data.freeFlowSpeedKmh >= 0
      );

      const hasValidConfidence = Boolean(
        data &&
        typeof data.confidence === 'number' && Number.isFinite(data.confidence) && data.confidence >= 0 && data.confidence <= 1
      );

      const hasValidRoadClosure = Boolean(
        data &&
        typeof data.roadClosure === 'boolean'
      );

      const isGeometryValid = Boolean(
        data &&
        Array.isArray(data.coordinates) &&
        data.coordinates.length >= 2 &&
        data.coordinates.every((c: any) =>
          Array.isArray(c) &&
          c.length >= 2 &&
          typeof c[0] === 'number' && Number.isFinite(c[0]) && c[0] >= -180 && c[0] <= 180 &&
          typeof c[1] === 'number' && Number.isFinite(c[1]) && c[1] >= -90 && c[1] <= 90
        )
      );

      const isCompleteContractValid = Boolean(hasValidSpeeds && hasValidConfidence && hasValidRoadClosure && isGeometryValid);

      if (res?.success && isCompleteContractValid) {
        setTomtomProbeResult({
          corridorId: corridor.id,
          loading: false,
          status: 'LIVE',
          message: `TomTom Live: ${data.currentSpeedKmh} km/jam (Bebas Hambatan: ${data.freeFlowSpeedKmh} km/jam)`,
          currentSpeedKmh: data.currentSpeedKmh,
          freeFlowSpeedKmh: data.freeFlowSpeedKmh,
          confidence: data.confidence,
          roadClosure: data.roadClosure,
        });

        // Sinkronisasi data koridor dengan telemetri arus langsung TomTom
        const liveStatus = data.currentSpeedKmh >= 70 ? 'Lancar' : data.currentSpeedKmh >= 40 ? 'Ramai Lancar' : data.currentSpeedKmh >= 20 ? 'Padat Merayap' : 'Macet Total';
        if (typeof setTrafficDataList === 'function') {
          setTrafficDataList((prev) =>
            prev.map((c) =>
              c.id === corridor.id
                ? {
                    ...c,
                    speedKmh: data.currentSpeedKmh,
                    status: liveStatus,
                    condition: data.roadClosure ? 'Jalan Ditutup / Hambatan Signifikan (TomTom Live)' : `Arus Nyata TomTom: ${data.currentSpeedKmh} km/jam`,
                  }
                : c
            )
          );
        }
        if (typeof setSelectedCorridor === 'function') {
          setSelectedCorridor((prev) =>
            prev && prev.id === corridor.id
              ? {
                  ...prev,
                  speedKmh: data.currentSpeedKmh,
                  status: liveStatus,
                  condition: data.roadClosure ? 'Jalan Ditutup / Hambatan Signifikan (TomTom Live)' : `Arus Nyata TomTom: ${data.currentSpeedKmh} km/jam`,
                }
              : prev
          );
        }
      } else if (res?.reason?.code === 'NOT_CONFIGURED') {
        setTomtomProbeResult({
          corridorId: corridor.id,
          loading: false,
          status: 'NOT_CONFIGURED',
          message: 'TomTom API: NOT_CONFIGURED. Masukkan TomTom API Key pada menu Transparansi Data untuk mengaktifkan telemetri arus langsung riil.',
        });
      } else if (res?.success && !isCompleteContractValid) {
        setTomtomProbeResult({
          corridorId: corridor.id,
          loading: false,
          status: 'UNAVAILABLE',
          message: 'Data lalu lintas TomTom tidak valid atau tidak memenuhi kontrak lengkap (kecepatan, confidence, status penutupan jalan, atau geometri wajib).',
          currentSpeedKmh: hasValidSpeeds ? data.currentSpeedKmh : null,
          freeFlowSpeedKmh: hasValidSpeeds ? data.freeFlowSpeedKmh : null,
          confidence: hasValidConfidence ? data.confidence : null,
          roadClosure: hasValidRoadClosure ? data.roadClosure : null,
        });
      } else {
        setTomtomProbeResult({
          corridorId: corridor.id,
          loading: false,
          status: 'FAILED',
          message: res?.reason?.message || res?.error || 'Pengambilan TomTom Traffic gagal.',
        });
      }
    } catch (err: any) {
      if ((globalThis as any).__harmony_active_traffic_request_id !== reqId) return;
      const isNotConfigured = err?.data?.reason?.code === 'NOT_CONFIGURED' ||
        (typeof err?.message === 'string' && err.message.includes('NOT_CONFIGURED'));
      if (isNotConfigured) {
        setTomtomProbeResult({
          corridorId: corridor.id,
          loading: false,
          status: 'NOT_CONFIGURED',
          message: 'TomTom API: NOT_CONFIGURED (Kunci API belum diatur pada server). Menampilkan simulasi ilustratif terpisah.',
        });
      } else {
        setTomtomProbeResult({
          corridorId: corridor.id,
          loading: false,
          status: 'FAILED',
          message: `Gagal menghubungi server traffic: ${err?.message || 'HTTP Error'}`,
        });
      }
    }
  };

  // Observation Coverage & Radar Station Drawer States
  const [obsSubTab, setObsSubTab] = useState<'summary' | 'radar' | 'blank'>('summary');
  const [obsSearchQuery, setObsSearchQuery] = useState<string>('');
  const [obsIslandFilter, setObsIslandFilter] = useState<string>('all');

  const filteredRadarStations = useMemo(() => {
    return BMKG_DOPPLER_RADAR_NETWORK.filter((st) => {
      const q = obsSearchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        st.name.toLowerCase().includes(q) ||
        st.city.toLowerCase().includes(q) ||
        st.code.toLowerCase().includes(q) ||
        st.province.toLowerCase().includes(q);
      const matchesIsland =
        obsIslandFilter === 'all' ||
        st.island.toLowerCase().includes(obsIslandFilter.toLowerCase());
      return matchesSearch && matchesIsland;
    });
  }, [obsSearchQuery, obsIslandFilter]);

  const handleFocusRadarStation = useCallback((radar: DopplerRadarStation) => {
    const coords = fromLonLat([radar.lng, radar.lat]);
    mapRef.current?.getView().animate({
      center: coords,
      zoom: 10,
      duration: 800,
    });
    if (popupOverlayRef.current && popupRef.current) {
      popupRef.current.style.display = 'block';
      popupRef.current.innerHTML = `
        <div style="min-width: 250px; max-width: 320px; font-family: Inter, sans-serif;" class="p-1 relative">
            <button id="close-popup-btn" style="position: absolute; top: -2px; right: -2px; background: #f1f5f9; border-radius: 50%; padding: 2px 6px; border: none; cursor: pointer; color: #94a3b8; font-size: 12px; font-weight: bold;">✖</button>
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 5px;">
              <span style="font-size: 15px;">📡</span>
              <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #047857; background: #d1fae5; padding: 1.5px 6px; border-radius: 4px;">RADAR CUACA DOPPLER BMKG</span>
              <span style="font-size: 9px; font-weight: 700; color: #059669; background: #ecfdf5; padding: 1px 5px; border-radius: 4px; margin-left: auto;">${radar.status}</span>
            </div>
            <strong style="font-size: 13px; color: #0f172a; display: block; margin-bottom: 2px; padding-right: 18px; line-height: 1.3;">${radar.name} (${radar.code})</strong>
            <div style="font-size: 10px; color: #64748b; margin-bottom: 6px;">📍 ${radar.city}, ${radar.province} • Alt: ${radar.elevationM}m</div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 8px; margin-bottom: 8px; font-size: 10px; line-height: 1.5;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                <span style="color: #64748b;">Frekuensi Sensor:</span>
                <strong style="color: #0f172a;">${radar.type}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                <span style="color: #64748b;">Radius Observasi:</span>
                <strong style="color: #059669;">~${radar.rangeKm} km Sweep</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Operator:</span>
                <span style="color: #334155; font-size: 9.5px;">${radar.operator}</span>
              </div>
            </div>

            <button id="open-fusion-btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 5px; font-size: 10.5px; font-weight: 700; color: #ffffff; background: linear-gradient(135deg, #059669, #0d9488); border: none; border-radius: 8px; padding: 6px 10px; cursor: pointer; transition: all 0.2s;">
              <span>Buka Fusi Sensor Radar & Satelit ↗</span>
            </button>
        </div>
      `;
      popupOverlayRef.current.setPosition(coords);
      const closeBtn = popupRef.current.querySelector('#close-popup-btn');
      if (closeBtn) closeBtn.addEventListener('click', () => { if (popupRef.current) popupRef.current.style.display = 'none'; });
      const fusionBtn = popupRef.current.querySelector('#open-fusion-btn');
      if (fusionBtn) fusionBtn.addEventListener('click', () => {
        if (popupRef.current) popupRef.current.style.display = 'none';
        setGeospatialModalDomain('fusion');
        setShowGeospatialModal(true);
      });
    }
  }, []);

  const handleFocusBlankSpot = useCallback((spot: BlankSpotZone) => {
    const coords = fromLonLat(spot.center);
    mapRef.current?.getView().animate({
      center: coords,
      zoom: 8,
      duration: 900,
    });
    if (popupOverlayRef.current && popupRef.current) {
      popupRef.current.style.display = 'block';
      popupRef.current.innerHTML = `
        <div style="min-width: 250px; max-width: 320px; font-family: Inter, sans-serif;" class="p-1 relative">
            <button id="close-popup-btn" style="position: absolute; top: -2px; right: -2px; background: #f1f5f9; border-radius: 50%; padding: 2px 6px; border: none; cursor: pointer; color: #94a3b8; font-size: 12px; font-weight: bold;">✖</button>
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 5px;">
              <span style="font-size: 15px;">⚠️</span>
              <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #be123c; background: #ffe4e6; padding: 1.5px 6px; border-radius: 4px;">ZONA KESENJANGAN (BLANK SPOT)</span>
              <span style="font-size: 9px; font-weight: 700; color: #e11d48; background: #fff1f2; padding: 1px 5px; border-radius: 4px; margin-left: auto;">${spot.severity}</span>
            </div>
            <strong style="font-size: 12.5px; color: #0f172a; display: block; margin-bottom: 2px; padding-right: 18px; line-height: 1.3;">${spot.name}</strong>
            <div style="font-size: 10px; color: #64748b; margin-bottom: 6px;">📍 ${spot.region} (Pulau ${spot.island})</div>

            <div style="background: #fff5f5; border: 1px solid #fed7d7; border-radius: 8px; padding: 6px 8px; margin-bottom: 8px; font-size: 10px; line-height: 1.5;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                <span style="color: #742a2a;">Jarak Radar Terdekat:</span>
                <strong style="color: #c53030;">~${spot.nearestRadarKm} km (${spot.nearestRadarName.split(' ')[1] || 'Radar'})</strong>
              </div>
              <div style="margin-top: 3px; color: #4a5568; font-size: 9.5px;">
                <strong>Dampak:</strong> ${spot.impactNote}
              </div>
              <div style="margin-top: 3px; border-top: 1px dashed #fed7d7; padding-top: 3px; color: #2b6cb0; font-size: 9.5px;">
                <strong>Rekomendasi AI:</strong> ${spot.recommendation}
              </div>
            </div>

            <button id="open-fusion-btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 5px; font-size: 10.5px; font-weight: 700; color: #ffffff; background: linear-gradient(135deg, #e11d48, #9333ea); border: none; border-radius: 8px; padding: 6px 10px; cursor: pointer; transition: all 0.2s;">
              <span>Buka Analisis Kesenjangan & Prioritas Sensor ↗</span>
            </button>
        </div>
      `;
      popupOverlayRef.current.setPosition(coords);
      const closeBtn = popupRef.current.querySelector('#close-popup-btn');
      if (closeBtn) closeBtn.addEventListener('click', () => { if (popupRef.current) popupRef.current.style.display = 'none'; });
      const fusionBtn = popupRef.current.querySelector('#open-fusion-btn');
      if (fusionBtn) fusionBtn.addEventListener('click', () => {
        if (popupRef.current) popupRef.current.style.display = 'none';
        setGeospatialModalDomain('fusion');
        setShowGeospatialModal(true);
      });
    }
  }, []);

  const filteredCorridors = useMemo(() => {
    return trafficDataList.filter((corridor) => {
      const matchTier = trafficTierFilter === 'all' || corridor.tier === trafficTierFilter;
      const matchIsland = trafficIslandFilter === 'all' || corridor.island.toLowerCase() === trafficIslandFilter.toLowerCase();
      const q = trafficSearchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        corridor.name.toLowerCase().includes(q) ||
        corridor.island.toLowerCase().includes(q) ||
        corridor.routeType.toLowerCase().includes(q) ||
        corridor.condition.toLowerCase().includes(q);
      return matchTier && matchIsland && matchSearch;
    });
  }, [trafficDataList, trafficTierFilter, trafficIslandFilter, trafficSearchQuery]);

  const handleRefreshTraffic = useCallback(() => {
    setIsTrafficRefreshing(true);
    if (selectedCorridor) {
      handleCheckTomTomLive(selectedCorridor);
    }
    liveTrafficFlowService.pollOnce().catch(() => {});
    setTimeout(() => {
      setTrafficDataList((prev) => {
        const sim = simulateRealtimeTraffic(prev);
        setLastTrafficSyncTime(sim.syncTime);
        return sim.updatedCorridors;
      });
      setSyncCountdown(15);
      setIsTrafficRefreshing(false);
    }, 450);
  }, [selectedCorridor, handleCheckTomTomLive]);

  // Automated Realtime Traffic Telemetry: Sinkronisasi otomatis berkala API setiap 15 detik
  useEffect(() => {
    const isTrafficActive = showTrafficCorridors || activeMapBasemap === 'traffic';
    if (!isTrafficActive) return;

    // Subscribe to continuous live API traffic network
    const unsubscribe = liveTrafficFlowService.subscribe((summary) => {
      setLiveTrafficSummary(summary);
      if (summary) {
        setLastTrafficSyncTime(`Live API ${new Date().toLocaleTimeString('id-ID')}`);
      }
    });

    if (isAutoSyncTraffic && !showGeospatialModal) {
      liveTrafficFlowService.startPolling(15000);
    }

    const timer = setInterval(() => {
      if (!isAutoSyncTraffic || showGeospatialModal) return;
      setSyncCountdown((prev) => {
        if (prev <= 1) {
          if (selectedCorridor) {
            handleCheckTomTomLive(selectedCorridor);
          }
          liveTrafficFlowService.pollOnce().catch(() => {});
          setTrafficDataList((curr) => {
            const sim = simulateRealtimeTraffic(curr);
            setLastTrafficSyncTime(sim.syncTime);
            return sim.updatedCorridors;
          });
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      unsubscribe();
      liveTrafficFlowService.stopPolling();
      clearInterval(timer);
    };
  }, [showTrafficCorridors, activeMapBasemap, isAutoSyncTraffic, selectedCorridor, handleCheckTomTomLive, showGeospatialModal]);

  const handleFocusCorridor = useCallback((corridor: TrafficCorridor) => {
    setSelectedCorridor(corridor);
    const targetZoom =
      corridor.tier === 'local'
        ? 15
        : corridor.tier === 'collector'
        ? 13.5
        : corridor.tier === 'arterial'
        ? 12
        : 9.5;

    mapRef.current?.getView().animate({
      center: fromLonLat(corridor.center),
      zoom: targetZoom,
      duration: 800,
    });

    // Asynchronously refine road coordinates if needed
    snapCorridorToActualRoad(corridor).then((refined) => {
      if (refined && refined.path && refined.path.length > corridor.path.length) {
        setTrafficDataList((prev) =>
          prev.map((c) => (c.id === refined.id ? refined : c))
        );
      }
    }).catch(() => {});
  }, []);

  const handleFocusCctv = useCallback((cam: TrafficCctvCamera) => {
    mapRef.current?.getView().animate({
      center: fromLonLat(cam.location),
      zoom: 16,
      duration: 600,
    });
  }, []);

  const updateCctvLayerFeatures = useCallback((cams: TrafficCctvCamera[]) => {
    if (!trafficCctvLayerRef.current) return;
    const source = trafficCctvLayerRef.current.getSource();
    if (!source) return;
    source.clear();
    const features = cams.map((cam) => {
      return new Feature({
        geometry: new Point(fromLonLat(cam.location)),
        isTrafficCctv: true,
        cctvId: cam.id,
        cctvData: cam,
        name: cam.name,
      });
    });
    source.addFeatures(features);
  }, []);

  const loadCctvFeeds = useCallback(async (city?: string, category?: string, search?: string) => {
    setIsCctvLoading(true);
    try {
      const cams = await trafficCctvService.fetchCameras({
        city: city && city !== 'Semua' ? city : undefined,
        category: category && category !== 'Semua' ? category : undefined,
        search: search || undefined,
        limit: 300,
      });
      setCctvCameras(cams);
      updateCctvLayerFeatures(cams);
    } catch {
      // Fallback preserves existing in-memory catalog
    } finally {
      setIsCctvLoading(false);
    }
  }, [updateCctvLayerFeatures]);

  const handleFocusSignal = useCallback((sig: TrafficSignalIntersection) => {
    mapRef.current?.getView().animate({
      center: fromLonLat(sig.location),
      zoom: 16.5,
      duration: 600,
    });
  }, []);

  const handleSaveCustomTomTomKey = useCallback(() => {
    liveTrafficFlowService.setCustomTomTomApiKey(customTomTomKeyInput.trim() || null);
    setCustomTomTomKeyStatus(
      customTomTomKeyInput.trim()
        ? 'Kunci API TomTom khusus aktif!'
        : 'Kunci khusus dihapus, menggunakan proxy server bawaan.'
    );
    setTimeout(() => setCustomTomTomKeyStatus(''), 4000);
  }, [customTomTomKeyInput]);

  const handleToggleBroadcastGps = useCallback(async () => {
    if (isBroadcastingUserGps) {
      trafficGpsDensityService.stopBroadcastingUserGps();
      setIsBroadcastingUserGps(false);
    } else {
      const started = await trafficGpsDensityService.startBroadcastingUserGps();
      setIsBroadcastingUserGps(started);
      if (!started) {
        alert('Tidak dapat mengaktifkan Geolocation browser. Pastikan izin akses lokasi telah diberikan di peramban Anda.');
      }
    }
  }, [isBroadcastingUserGps]);

  // Compass Rose & Wind Direction State (Fitur Arah Mata Angin)
  const [windDirectionDeg, setWindDirectionDeg] = useState<number>(135);
  const [windSpeedKmh, setWindSpeedKmh] = useState<number>(14);
  const [showWindDetail, setShowWindDetail] = useState<boolean>(false);

  // GIS Attribute Table State & Layer Hookup
  const [showAttributeTable, setShowAttributeTable] = useState<boolean>(false);
  const [showIdentifyPanel, setShowIdentifyPanel] = useState<boolean>(false);
  const [identifiedCoordinate, setIdentifiedCoordinate] = useState<[number, number] | null>(null);
  const [showLayerManager, setShowLayerManager] = useState<boolean>(false);
  const [showGeoprocessModal, setShowGeoprocessModal] = useState<boolean>(false);
  const [activeAOI, setActiveAOI] = useState<AreaOfInterest | null>(null);

  const drawingSourceRef = useRef<VectorSource>(new VectorSource());
  const analysisSourceRef = useRef<VectorSource>(new VectorSource());
  const analysisLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | number | null>(null);
  const [showUserDrawings, setShowUserDrawings] = useState<boolean>(true);
  const [userDrawingsOpacity, setUserDrawingsOpacity] = useState<number>(1);
  const [showAnalysisLayer, setShowAnalysisLayer] = useState<boolean>(true);
  const [analysisLayerOpacity, setAnalysisLayerOpacity] = useState<number>(0.85);
  const [forestOpacity, setForestOpacity] = useState<number>(0.85);
  const [trafficOpacity, setTrafficOpacity] = useState<number>(0.95);
  const [drawingFeaturesCount, setDrawingFeaturesCount] = useState<number>(0);
  const [analysisFeaturesCount, setAnalysisFeaturesCount] = useState<number>(0);

  useEffect(() => {
    const dSrc = drawingSourceRef.current;
    const aSrc = analysisSourceRef.current;
    if (!dSrc || !aSrc) return;

    const updateDrawing = () => setDrawingFeaturesCount(dSrc.getFeatures().length);
    const updateAnalysis = () => setAnalysisFeaturesCount(aSrc.getFeatures().length);

    dSrc.on('addfeature', updateDrawing);
    dSrc.on('removefeature', updateDrawing);
    dSrc.on('clear', updateDrawing);

    aSrc.on('addfeature', updateAnalysis);
    aSrc.on('removefeature', updateAnalysis);
    aSrc.on('clear', updateAnalysis);

    return () => {
      dSrc.un('addfeature', updateDrawing);
      dSrc.un('removefeature', updateDrawing);
      dSrc.un('clear', updateDrawing);

      aSrc.un('addfeature', updateAnalysis);
      aSrc.un('removefeature', updateAnalysis);
      aSrc.un('clear', updateAnalysis);
    };
  }, []);

  useEffect(() => {
    return aoiService.subscribe((aoi) => {
      setActiveAOI(aoi);
    });
  }, []);

  // Layer references for dynamic updates
  const baseTileLayerRef = useRef<TileLayer<any> | null>(null);
  const satelliteReferenceLayerRef = useRef<TileLayer<any> | null>(null);
  const trafficOverlayLayerRef = useRef<TileLayer<any> | null>(null);

  // Per-User Settings: defaults to all OFF for new accounts/users
  const profileMapSettings = (currentProfile as any)?.mapSettings;
  const { settings, updateSetting } = useUserMapSettings(activeUserId, profileMapSettings);

  const {
    profile: perfProfile,
    mode: perfMode,
    effectiveMode: effectivePerfMode,
    isTV,
    hasWebGL,
    canRun3D,
    setMode: setPerfMode,
  } = useHardwarePerformance();

  // 3D Perspective & Globe Mode State (Persisted per user, guarded against TV / unsupported WebGL devices)
  const [is3D, setIs3D] = useState<boolean>(() => {
    try {
      if (hardwarePerformanceService.isTV() || !hardwarePerformanceService.canRun3D()) {
        return false;
      }
      return window.localStorage.getItem(`hm_is3d_${activeUserId}`) === 'true';
    } catch (e) {
      return false;
    }
  });

  const [globeType, setGlobeType] = useState<'globe' | 'perspective' | 'cesium'>(() => {
    try {
      const stored = window.localStorage.getItem(`hm_globetype_${activeUserId}`);
      if (stored === 'perspective' || stored === 'cesium' || stored === 'globe') return stored;
      return 'globe';
    } catch (e) {
      return 'globe';
    }
  });

  const [currentRotation, setCurrentRotation] = useState<number>(0);
  const [isOrbiting, setIsOrbiting] = useState<boolean>(false);
  const orbitFrameRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      if (isTV || !canRun3D) {
        setIs3D(false);
        return;
      }
      const stored = window.localStorage.getItem(`hm_is3d_${activeUserId}`);
      if (stored !== null) {
        setIs3D(stored === 'true');
      }
      const storedType = window.localStorage.getItem(`hm_globetype_${activeUserId}`);
      if (storedType === 'perspective' || storedType === 'cesium' || storedType === 'globe') {
        setGlobeType(storedType as 'globe' | 'perspective' | 'cesium');
      } else {
        setGlobeType('globe');
      }
    } catch (e) {}
  }, [activeUserId, isTV, canRun3D]);

  const handleSetGlobeType = (type: 'globe' | 'perspective' | 'cesium') => {
    setGlobeType(type);
    try {
      window.localStorage.setItem(`hm_globetype_${activeUserId}`, type);
    } catch (e) {}
    if (type === 'perspective') {
      setTimeout(() => { mapRef.current?.updateSize(); }, 750);
    }
  };

  const handleToggle3D = (val: boolean) => {
    if (val && (isTV || !canRun3D)) {
      setLocationStatusToast({
        type: 'error',
        title: 'Akselerasi 3D Dibatasi',
        message: 'Perangkat Smart TV atau browser ini tidak mendukung WebGL 3D. Menampilkan peta 2D berkinerja tinggi.',
      });
      setIs3D(false);
      return;
    }
    setIs3D(val);
    if (!val) {
      setIsOrbiting(false);
      resetRotationNorth();
    } else {
      const view = mapRef.current?.getView();
      const center = view?.getCenter();
      if (center) {
        const [lng, lat] = toLonLat(center);
        setGlobeInitialCenter({ lat, lng });
        setGlobeInitialZoom(Math.round(view?.getZoom() || 6));
      }
    }
    try {
      window.localStorage.setItem(`hm_is3d_${activeUserId}`, String(val));
    } catch (e) {}
    if (globeType === 'perspective') {
      setTimeout(() => { mapRef.current?.updateSize(); }, 750);
    }
  };

  const handleSelectBasemap = (type: MapBasemapType) => {
    setActiveMapBasemap(type);

    try {
      window.localStorage.setItem('hm_basemap_active', type);
    } catch (e) {}

    // Switch from 3D globe to 2D view so the user can immediately see the selected basemap
    if (is3D && (globeType === 'globe' || globeType === 'cesium')) {
      handleToggle3D(false);
    }

    // Reset weather map overlay if active, because Windy iframe covers the OpenLayers canvas
    if (weatherMapOverlay !== 'none') {
      setWeatherMapOverlay('none');
    }

    // Ensure map mode is spatial
    if (mapMode !== 'spatial') {
      setMapMode('spatial');
    }

    setTimeout(() => {
      mapRef.current?.updateSize();
      mapRef.current?.render();
    }, 60);
  };

  const rotateMapBy = (deltaDeg: number) => {
    const view = mapRef.current?.getView();
    if (!view) return;
    const currentRot = view.getRotation() || 0;
    const targetRot = currentRot + (deltaDeg * Math.PI) / 180;
    view.animate({
      rotation: targetRot,
      duration: 350,
      easing: (t) => t * (2 - t),
    });
  };

  const resetRotationNorth = () => {
    const view = mapRef.current?.getView();
    if (!view) return;
    view.animate({
      rotation: 0,
      duration: 400,
      easing: (t) => t * (2 - t),
    });
  };

  const toggleOrbit = () => {
    setIsOrbiting((prev) => !prev);
  };

  // 360 Auto-Orbit Animation Loop
  useEffect(() => {
    if (!isOrbiting || !is3D) {
      if (orbitFrameRef.current) {
        cancelAnimationFrame(orbitFrameRef.current);
        orbitFrameRef.current = null;
      }
      return;
    }

    let lastTime = performance.now();
    const animateOrbit = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      const view = mapRef.current?.getView();
      if (view) {
        const rotSpeed = 0.22; // ~12.5 deg/sec
        const nextRot = (view.getRotation() || 0) + rotSpeed * dt;
        view.setRotation(nextRot);
        const deg = Math.round((((nextRot % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) * 180) / Math.PI);
        setCurrentRotation(deg);
      }
      orbitFrameRef.current = requestAnimationFrame(animateOrbit);
    };

    orbitFrameRef.current = requestAnimationFrame(animateOrbit);

    return () => {
      if (orbitFrameRef.current) {
        cancelAnimationFrame(orbitFrameRef.current);
        orbitFrameRef.current = null;
      }
    };
  }, [isOrbiting, is3D]);

  // Sync rotation on manual gesture or view changes
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const view = mapRef.current.getView();
    const key = view.on('change:rotation', () => {
      const rot = view.getRotation() || 0;
      const deg = Math.round((((rot % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) * 180) / Math.PI);
      setCurrentRotation(deg);
    });
    return () => {
      if (key) view.un('change:rotation', (key as any).listener);
    };
  }, [mapReady]);

  // Pointer drag to rotate 360° on Right Click or Shift + Drag
  const isPointerRotating = useRef(false);
  const pointerStartX = useRef(0);
  const pointerStartRot = useRef(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!is3D) return;
    if (e.button === 2 || (e.button === 0 && e.shiftKey)) {
      e.preventDefault();
      isPointerRotating.current = true;
      pointerStartX.current = e.clientX;
      pointerStartRot.current = mapRef.current?.getView()?.getRotation() || 0;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const pointerAnimFrame = useRef<number | null>(null);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPointerRotating.current && mapRef.current) {
      const clientX = e.clientX;
      if (pointerAnimFrame.current !== null) return;
      pointerAnimFrame.current = requestAnimationFrame(() => {
        pointerAnimFrame.current = null;
        if (!isPointerRotating.current || !mapRef.current) return;
        const deltaX = clientX - pointerStartX.current;
        const deltaRot = (deltaX / 300) * (2 * Math.PI);
        const newRot = pointerStartRot.current + deltaRot;
        mapRef.current.getView().setRotation(newRot);
        const deg = Math.round((((newRot % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) * 180) / Math.PI);
        setCurrentRotation(deg);
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (pointerAnimFrame.current !== null) {
      cancelAnimationFrame(pointerAnimFrame.current);
      pointerAnimFrame.current = null;
    }
    if (isPointerRotating.current) {
      isPointerRotating.current = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
  };



  const showActive = settings.showActive;
  const setShowActive = (v: boolean | ((prev: boolean) => boolean)) => updateSetting('showActive', v);
  const showInactive = settings.showInactive;
  const setShowInactive = (v: boolean | ((prev: boolean) => boolean)) => updateSetting('showInactive', v);
  const showPeaks = settings.showPeaks;
  const setShowPeaks = (v: boolean | ((prev: boolean) => boolean)) => updateSetting('showPeaks', v);
  const showSD = settings.showSD;
  const setShowSD = (v: boolean | ((prev: boolean) => boolean)) => updateSetting('showSD', v);
  const showSMP = settings.showSMP;
  const setShowSMP = (v: boolean | ((prev: boolean) => boolean)) => updateSetting('showSMP', v);
  const showSMA = settings.showSMA;
  const setShowSMA = (v: boolean | ((prev: boolean) => boolean)) => updateSetting('showSMA', v);

  const showTectonic = settings.showTectonic;
  const setShowTectonic = (v: boolean | ((prev: boolean) => boolean)) => updateSetting('showTectonic', v);
  const showEarthquakes = settings.showEarthquakes;
  const setShowEarthquakes = (v: boolean | ((prev: boolean) => boolean)) => updateSetting('showEarthquakes', v);
  const showTsunamiSensors = settings.showTsunamiSensors ?? false;
  const setShowTsunamiSensors = (v: boolean | ((prev: boolean) => boolean)) => updateSetting('showTsunamiSensors', v);
  const showLandslideZones = settings.showLandslideZones ?? false;
  const setShowLandslideZones = (v: boolean | ((prev: boolean) => boolean)) => updateSetting('showLandslideZones', v);
  const showTsunamiZones = settings.showTsunamiZones ?? false;
  const setShowTsunamiZones = (v: boolean | ((prev: boolean) => boolean)) => updateSetting('showTsunamiZones', v);

  // Pusat Risiko Bencana & Edukasi Sekolah Tangguh
  const [showWebGisTutorial, setShowWebGisTutorial] = useState<boolean>(false);
  const [showDisasterRiskCenter, setShowDisasterRiskCenter] = useState<boolean>(false);
  const landslideLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const tsunamiLayerRef = useRef<VectorLayer<VectorSource> | null>(null);

  const selectedSchoolData = useMemo(() => {
    if (!currentUser || schools.length === 0) return null;
    const targetId = userSchoolId;
    const found = targetId ? schools.find(s => s[0] === targetId) : (selection?.school?.id ? schools.find(s => s[0] === selection.school.id) : null);
    if (!found) return null;
    return {
      id: String(found[0]),
      name: String(found[4] || 'Sekolah Terpilih'),
      lat: Number(found[1]),
      lng: Number(found[2]),
      regency: String(found[5] || 'Indonesia'),
      province: String(found[6] || 'Indonesia'),
      elevationM: Number(found[7] || 35),
    };
  }, [currentUser, schools, userSchoolId, selection?.school]);

  // Weather Map Layer Integration (Native OpenLayers Doppler Radar & Windy ECMWF Studio)
  const [weatherMapOverlay, setWeatherMapOverlay] = useState<string>('none');
  const [weatherRenderMode, setWeatherRenderMode] = useState<'native' | 'windy'>('native');
  const [rainviewerPath, setRainviewerPath] = useState<string>('');
  const [rainviewerSatellitePath, setRainviewerSatellitePath] = useState<string>('');
  const [rainviewerHost, setRainviewerHost] = useState<string>('https://tilecache.rainviewer.com');
  const [radarFrameTime, setRadarFrameTime] = useState<number | null>(null);
  const [radarTileLoadError, setRadarTileLoadError] = useState<boolean>(false);
  const [radarMetadataStale, setRadarMetadataStale] = useState<boolean>(false);
  const [radarTileCounts, setRadarTileCounts] = useState<{
    requested: number;
    loaded: number;
    error: number;
    activeRequested?: number;
    activeLoaded?: number;
    activeError?: number;
  }>({
    requested: 0,
    loaded: 0,
    error: 0,
    activeRequested: 0,
    activeLoaded: 0,
    activeError: 0,
  });
  const [gibsAvailableTime, setGibsAvailableTime] = useState<string | null>(null);
  const [gibsMetadataStale, setGibsMetadataStale] = useState<boolean>(false);
  const [gibsFrameTime, setGibsFrameTime] = useState<number | null>(null);
  const gibsController = useRef<AbortController | null>(null);
  const weatherTileLayerRef = useRef<TileLayer<any> | null>(null);
  const tsunamiSensorsLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const [showWindyModal, setShowWindyModal] = useState(false);
  const [windyOverlay, setWindyOverlay] = useState<string>('rain');
  const [showWindyMenu, setShowWindyMenu] = useState<boolean>(false);
  const [weatherOverlayOpacity, setWeatherOverlayOpacity] = useState<number>(0.85);
  const [weatherInteractionTarget, setWeatherInteractionTarget] = useState<'weather' | 'disaster'>('weather');
  const [windyCoords, setWindyCoords] = useState<{ lat: number; lng: number; zoom: number }>({ lat: -2.5, lng: 118.0, zoom: 5 });

  useEffect(() => {
    if (!showWindyModal) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowWindyModal(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showWindyModal]);

  const updateWindyLocation = useCallback(() => {
    const center = mapRef.current?.getView()?.getCenter();
    if (center) {
      const [lng, lat] = toLonLat(center);
      const z = Math.min(Math.max(Math.round(mapRef.current?.getView()?.getZoom() || 5), 3), 11);
      setWindyCoords({
        lat: Number(lat.toFixed(4)),
        lng: Number(lng.toFixed(4)),
        zoom: z,
      });
    }
  }, []);

  const handleApplyWeatherOverlay = useCallback((overlayKey: string) => {
    if (is3D && (globeType === 'globe' || globeType === 'cesium')) {
      handleToggle3D(false);
    }
    updateWindyLocation();
    setWeatherMapOverlay(overlayKey);
    const isNativeSupported = overlayKey === 'radar' || overlayKey === 'bmkg_radar' || overlayKey === 'rain';
    if (!isNativeSupported) {
      setWeatherRenderMode('windy');
    }
    const windyKey = overlayKey === 'bmkg_radar' ? 'radar' : overlayKey === 'bmkg_sat' ? 'satellite' : overlayKey;
    setWindyOverlay(windyKey);
  }, [updateWindyLocation, is3D, globeType]);

  const handleSelectWeatherOverlay = useCallback((overlayKey: string) => {
    if (is3D && (globeType === 'globe' || globeType === 'cesium')) {
      handleToggle3D(false);
    }
    updateWindyLocation();
    if (weatherMapOverlay === overlayKey) {
      setWeatherMapOverlay('none');
      setShowWindyMenu(false);
    } else {
      setWeatherMapOverlay(overlayKey);
      const isNativeSupported = overlayKey === 'radar' || overlayKey === 'bmkg_radar' || overlayKey === 'rain';
      if (!isNativeSupported) {
        setWeatherRenderMode('windy');
      }
      const windyKey = overlayKey === 'bmkg_radar' ? 'radar' : overlayKey === 'bmkg_sat' ? 'satellite' : overlayKey;
      setWindyOverlay(windyKey);
      setShowWindyMenu(true);
      setShowPanel(false);
      setShowBasemapMenu(false);
      setShowLayerManager(false);
    }
  }, [weatherMapOverlay, updateWindyLocation, is3D, globeType]);

  // Earth Sensor Registry & Multi-Hazard Observatories State
  const [selectedSensorForInspection, setSelectedSensorForInspection] = useState<EarthSensorNode | null>(null);
  const [showMasterTaxonomyModal, setShowMasterTaxonomyModal] = useState(false);
  const [sensorFamilyFilter, setSensorFamilyFilter] = useState<SensorFamily | 'ALL'>('ALL');
  const sensorRegistryStats = useMemo(() => getSensorRegistryStats(), []);


  // De-load and re-render map when switching between Map and Geospatial Studio modal
  useEffect(() => {
    if (!showGeospatialModal && mapRef.current) {
      const timer = setTimeout(() => {
        mapRef.current?.updateSize();
        mapRef.current?.render();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showGeospatialModal]);

  // GPS Location & Realtime Tracking State
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [userElevationReport, setUserElevationReport] = useState<GnssElevationReport | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);
  const [isPickingRouteLocation, setIsPickingRouteLocation] = useState(false);
  const [pickedRouteDestination, setPickedRouteDestination] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const isPickingRouteLocationRef = useRef(false);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [isTrackingLive, setIsTrackingLive] = useState(false);
  const [locationStatusToast, setLocationStatusToast] = useState<{
    type: 'success' | 'error';
    title?: string;
    message: string;
    accuracy?: number;
    village?: string;
    subDistrict?: string;
    city?: string;
    province?: string;
    road?: string;
    fullAddress?: string;
    elevationReport?: GnssElevationReport | null;
  } | null>(null);
  const [globeInitialCenter, setGlobeInitialCenter] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [globeInitialZoom, setGlobeInitialZoom] = useState<number>(6);
  const routeLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const userMarkerLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Garis Khatulistiwa, Garis Balik Tropis & Batas Zona Iklim State (Default OFF)
  const [showEquatorZones, setShowEquatorZones] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem('hm_equator_zones') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [showEquatorGuide, setShowEquatorGuide] = useState<boolean>(false);
  const [activeLayerLoads, setActiveLayerLoads] = useState(0);
  const equatorLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const trafficVectorLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const trafficCctvLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const trafficSignalsLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const observationCoverageLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const [geospatialModalDomain, setGeospatialModalDomain] = useState<StudioDomain>('weather');

  const closeMapDrawers = () => {
    setShowPanel(false);
    setShowBasemapMenu(false);
    setShowLayerManager(false);
    setShowWindyMenu(false);
    setShowTrafficCorridors(false);
    setShowObservationCoverage(false);
  };

  const openStudioDomain = (domain: StudioDomain = 'weather') => {
    closeMapDrawers();
    setGeospatialModalDomain(domain);
    setShowGeospatialModal(true);
  };

  const openWindyFullscreen = () => {
    closeMapDrawers();
    updateWindyLocation();
    if (weatherMapOverlay === 'none') {
      setWeatherMapOverlay('rain');
      setWindyOverlay('rain');
    }
    setShowWindyModal(true);
  };

  // Harmony Navigation & AI Copilot Event Listeners (Buka Cuaca, Lapisan Peta, dll)
  useEffect(() => {
    const handleOpenWeather = (e: Event) => {
      const customEvent = e as CustomEvent;
      const domain = (customEvent.detail?.domain as StudioDomain) || 'weather';
      openStudioDomain(domain);
    };

    const handleOpenLayers = () => {
      setShowPanel(true);
    };

    window.addEventListener('harmony:open-weather', handleOpenWeather);
    window.addEventListener('harmony:open-layers', handleOpenLayers);

    // Cek query param jika dibuka via URL: /app/maps?open=weather
    const params = new URLSearchParams(window.location.search);
    if (params.get('open') === 'weather') {
      openStudioDomain('weather');
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

    return () => {
      window.removeEventListener('harmony:open-weather', handleOpenWeather);
      window.removeEventListener('harmony:open-layers', handleOpenLayers);
    };
  }, []);

  // Safety Watchdog: Auto-clear layer loading spinner if stalled
  useEffect(() => {
    if (activeLayerLoads > 0) {
      const timer = setTimeout(() => {
        setActiveLayerLoads(0);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [activeLayerLoads]);

  // Seasonal Intelligence & Global Climate State (38 Provinsi & Seluruh Dunia)
  const [seasonalInfo, setSeasonalInfo] = useState<SeasonalInfo>(() => {
    return seasonalIntelligenceService.calculateSeasonalIntelligence(-7.2575, 112.7521);
  });
  const [globalWeatherSummary, setGlobalWeatherSummary] = useState<{
    temperature?: number;
    weatherDesc?: string;
    weatherCode?: number;
  } | null>(null);
  const [showWeatherCard, setShowWeatherCard] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(`hm_weather_card_${activeUserId}`) === 'true';
    } catch {
      return false;
    }
  });
  const [showSeasonalModal, setShowSeasonalModal] = useState<boolean>(false);

  // Update Seasonal Intelligence when user location or active school changes
  useEffect(() => {
    const lat = userCoords?.lat ?? selection?.school?.lat ?? activeSchoolLat;
    const lng = userCoords?.lng ?? selection?.school?.lng ?? activeSchoolLng;
    const info = seasonalIntelligenceService.calculateSeasonalIntelligence(lat, lng);
    setSeasonalInfo(info);

    let isCancelled = false;
    setGlobalWeatherSummary(null);
    seasonalIntelligenceService.fetchGlobalWeatherAndSeason(lat, lng)
      .then((res: any) => {
        if (!isCancelled && res?.dataStatus === 'AVAILABLE') {
          setGlobalWeatherSummary({
            temperature: res.currentTemp,
            weatherDesc: res.weatherDesc,
            weatherCode: res.weatherCode,
          });
          setSeasonalInfo(res.seasonalInfo);
        }
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [userCoords?.lat, userCoords?.lng, selection?.school?.lat, selection?.school?.lng, activeSchoolLat, activeSchoolLng]);

  // Sync Equator Layer visibility
  useEffect(() => {
    if (equatorLayerRef.current) {
      equatorLayerRef.current.setVisible(showEquatorZones);
    }
  }, [showEquatorZones]);

  // Sync Observation Coverage & Blank Spot Layer visibility
  useEffect(() => {
    if (observationCoverageLayerRef.current) {
      observationCoverageLayerRef.current.setVisible(showObservationCoverage);
    }
  }, [showObservationCoverage]);

  // Clean up geolocation watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Fetch real-time wind & weather data for current location with 5-minute periodic auto-refresh
  useEffect(() => {
    let isMounted = true;
    const fetchWind = async (force = false) => {
      try {
        const targetLat = userCoords?.lat ?? selection?.school?.lat ?? activeSchoolLat;
        const targetLng = userCoords?.lng ?? selection?.school?.lng ?? activeSchoolLng;
        const res = await weatherAggregatorService.fetchConsensusWeather(targetLat, targetLng, undefined, force);
        if (isMounted && res?.current) {
          if (res.current.windDirection !== undefined && res.current.windDirection !== null) {
            setWindDirectionDeg(res.current.windDirection);
          }
          if (res.current.windSpeed !== undefined && res.current.windSpeed !== null) {
            setWindSpeedKmh(res.current.windSpeed);
          }
        }
      } catch (e) {}
    };
    fetchWind();

    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    const intervalTimer = setInterval(() => {
      fetchWind(true);
    }, FIVE_MINUTES_MS);

    return () => {
      isMounted = false;
      clearInterval(intervalTimer);
    };
  }, [userCoords?.lat, userCoords?.lng, selection?.school?.lat, selection?.school?.lng, activeSchoolLat, activeSchoolLng]);

  const handleFindUserLocation = () => {
    // If already tracking and we have user coords, re-center camera on current user location
    if (isTrackingLive && userCoords) {
      if (mapRef.current) {
        mapRef.current.getView().animate({
          center: fromLonLat([userCoords.lng, userCoords.lat]),
          zoom: Math.max(16, mapRef.current.getView().getZoom() || 16),
          duration: 700,
        });
      }
      setGlobeInitialCenter({ lat: userCoords.lat, lng: userCoords.lng });

      // Refresh elevation report if missing
      if (!userElevationReport) {
        gnssElevationService.fetchGroundElevation(userCoords.lat, userCoords.lng).then((demAlt) => {
          const alt = demAlt ?? 25.0;
          const topo = gnssElevationService.getTopographyZone(alt);
          const dmsLat = gnssElevationService.toDMS(userCoords.lat, true);
          const dmsLng = gnssElevationService.toDMS(userCoords.lng, false);
          const dmsDisplay = `${dmsLat}, ${dmsLng}`;
          const pressure = gnssElevationService.calculateBarometricPressure(alt);
          const boilingPoint = gnssElevationService.calculateBoilingPoint(alt);
          const rep: GnssElevationReport = {
            lat: userCoords.lat,
            lng: userCoords.lng,
            accuracyM: userAccuracy ? Math.round(userAccuracy) : 10,
            altitudeM: alt,
            altitudeSource: 'dem_srtm_model',
            dmsLat,
            dmsLng,
            dmsDisplay,
            epsg3857: geospatialAnalysisService.toEPSG3857(userCoords.lat, userCoords.lng),
            topographyZone: topo.zone,
            topographyDescription: topo.description,
            estimatedBarometricPressureHpa: pressure,
            estimatedBoilingPointC: boilingPoint,
            locationInfo: userPreciseLocation || undefined,
            timestamp: new Date().toLocaleTimeString('id-ID'),
            formattedReportText: [
              '========================================',
              '📌 LAPORAN KETINGGIAN & KOORDINAT PENGGUNA',
              '========================================',
              `🕒 Waktu Pengukuran : ${new Date().toLocaleTimeString('id-ID')} WIB`,
              `📍 Wilayah / Lokasi : ${userPreciseLocation?.shortDisplay || 'Koordinat Geospasial'}`,
              `🏠 Alamat Lengkap   : ${userPreciseLocation?.fullAddress || `${userCoords.lat.toFixed(5)}°, ${userCoords.lng.toFixed(5)}°`}`,
              '----------------------------------------',
              `🏔️ Ketinggian Medan  : ${alt >= 0 ? `+${alt}` : alt} mdpl`,
              `⛰️ Zona Topografi    : ${topo.zone}`,
              `📝 Deskripsi Morfo   : ${topo.description}`,
              `🌡️ Tekanan Atmosfer : ${pressure} hPa`,
              `☕ Titik Didih Air   : ${boilingPoint} °C`,
              '----------------------------------------',
              `🌐 Koordinat Desimal : ${userCoords.lat.toFixed(6)}°, ${userCoords.lng.toFixed(6)}°`,
              `🧭 Format DMS (Geod) : ${dmsDisplay}`,
              `🎯 Akurasi Sensor GPS: ±${userAccuracy ? Math.round(userAccuracy) : 10} meter`,
              '========================================',
            ].join('\n'),
          };
          setUserElevationReport(rep);
          setLocationStatusToast({
            type: 'success',
            title: userPreciseLocation?.village ? `${userPreciseLocation.village}, ${userPreciseLocation.subDistrict || ''}` : 'Lokasi GPS Presisi Terverifikasi',
            message: userPreciseLocation?.shortDisplay || 'Kamera dipusatkan kembali ke koordinat GPS Anda.',
            accuracy: userAccuracy || undefined,
            village: userPreciseLocation?.village,
            subDistrict: userPreciseLocation?.subDistrict,
            city: userPreciseLocation?.city,
            province: userPreciseLocation?.province,
            road: userPreciseLocation?.road,
            fullAddress: userPreciseLocation?.fullAddress,
            elevationReport: rep,
          });
        });
      } else {
        setLocationStatusToast({
          type: 'success',
          title: userPreciseLocation?.village ? `${userPreciseLocation.village}, ${userPreciseLocation.subDistrict || ''}` : 'Lokasi GPS Presisi Terverifikasi',
          message: userPreciseLocation?.shortDisplay || 'Kamera dipusatkan kembali ke koordinat GPS Anda.',
          accuracy: userAccuracy || undefined,
          village: userPreciseLocation?.village,
          subDistrict: userPreciseLocation?.subDistrict,
          city: userPreciseLocation?.city,
          province: userPreciseLocation?.province,
          road: userPreciseLocation?.road,
          fullAddress: userPreciseLocation?.fullAddress,
          elevationReport: userElevationReport,
        });
      }
      return;
    }

    if (!navigator.geolocation) {
      setLocationStatusToast({
        type: 'error',
        title: 'Sensor GPS Tidak Ditemukan',
        message: 'Peramban ini tidak mendukung Geolocation API untuk mendeteksi GPS.',
      });
      return;
    }

    setIsLocatingUser(true);
    setLocationStatusToast(null);

    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocatingUser(false);
        setIsTrackingLive(true);
        const { latitude, longitude, accuracy } = pos.coords;
        const deviceAlt = pos.coords.altitude != null && Number.isFinite(pos.coords.altitude)
          ? Math.round(pos.coords.altitude * 10) / 10
          : null;
        setUserCoords({ lat: latitude, lng: longitude });
        setUserAccuracy(accuracy);
        setGlobeInitialCenter({ lat: latitude, lng: longitude });

        // Smooth camera fly in 2D with zoom into street / village level
        if (mapRef.current) {
          const targetZoom = accuracy < 50 ? 17 : accuracy < 200 ? 16 : 15;
          mapRef.current.getView().animate({
            center: fromLonLat([longitude, latitude]),
            zoom: targetZoom,
            duration: 1000,
          });
        }

        const accRounded = Math.round(accuracy);
        setLocationStatusToast({
          type: 'success',
          title: 'Memverifikasi Alamat & Mengukur Elevasi...',
          message: `Koordinat ${latitude.toFixed(5)}°, ${longitude.toFixed(5)}° (Akurasi ±${accRounded}m). Mengukur ketinggian medan...`,
          accuracy: accRounded,
        });

        // Parallel: Resolve exact Desa, Kecamatan, Kabupaten AND Ground Elevation
        try {
          const [locInfo, demAlt] = await Promise.all([
            preciseGeocodingService.reverseGeocode(latitude, longitude, accuracy).catch(() => null),
            gnssElevationService.fetchGroundElevation(latitude, longitude).catch(() => null),
          ]);

          if (locInfo) {
            setUserPreciseLocation(locInfo);
          }

          const finalAlt = deviceAlt ?? demAlt ?? 25.0;
          const topo = gnssElevationService.getTopographyZone(finalAlt);
          const dmsLat = gnssElevationService.toDMS(latitude, true);
          const dmsLng = gnssElevationService.toDMS(longitude, false);
          const dmsDisplay = `${dmsLat}, ${dmsLng}`;
          const pressure = gnssElevationService.calculateBarometricPressure(finalAlt);
          const boilingPoint = gnssElevationService.calculateBoilingPoint(finalAlt);
          const epsg3857 = geospatialAnalysisService.toEPSG3857(latitude, longitude);

          const reportText = [
            '========================================',
            '📌 LAPORAN KETINGGIAN & KOORDINAT PENGGUNA',
            '========================================',
            `🕒 Waktu Pengukuran : ${new Date().toLocaleTimeString('id-ID')} WIB`,
            `📍 Wilayah / Lokasi : ${locInfo?.shortDisplay || 'Koordinat Geospasial'}`,
            `🏠 Alamat Lengkap   : ${locInfo?.fullAddress || `${latitude.toFixed(5)}°, ${longitude.toFixed(5)}°`}`,
            '----------------------------------------',
            `🏔️ Ketinggian Medan  : ${finalAlt >= 0 ? `+${finalAlt}` : finalAlt} mdpl`,
            `⛰️ Zona Topografi    : ${topo.zone}`,
            `📝 Deskripsi Morfo   : ${topo.description}`,
            `🌡️ Tekanan Atmosfer : ${pressure} hPa`,
            `☕ Titik Didih Air   : ${boilingPoint} °C`,
            '----------------------------------------',
            `🌐 Koordinat Desimal : ${latitude.toFixed(6)}°, ${longitude.toFixed(6)}°`,
            `🧭 Format DMS (Geod) : ${dmsDisplay}`,
            `🎯 Akurasi Sensor GPS: ±${accRounded} meter`,
            '========================================',
          ].join('\n');

          const rep: GnssElevationReport = {
            lat: latitude,
            lng: longitude,
            accuracyM: accRounded,
            altitudeM: finalAlt,
            altitudeSource: deviceAlt != null ? 'device_sensor' : 'dem_srtm_model',
            dmsLat,
            dmsLng,
            dmsDisplay,
            epsg3857,
            topographyZone: topo.zone,
            topographyDescription: topo.description,
            estimatedBarometricPressureHpa: pressure,
            estimatedBoilingPointC: boilingPoint,
            locationInfo: locInfo || undefined,
            timestamp: new Date().toLocaleTimeString('id-ID'),
            formattedReportText: reportText,
          };

          setUserElevationReport(rep);

          setLocationStatusToast({
            type: 'success',
            title: locInfo?.village ? `${locInfo.village}, ${locInfo.subDistrict || ''}` : 'Lokasi GPS & Elevasi Terverifikasi',
            message: locInfo?.shortDisplay || `Ketinggian ${finalAlt} mdpl • ${topo.zone}`,
            accuracy: accRounded,
            village: locInfo?.village,
            subDistrict: locInfo?.subDistrict,
            city: locInfo?.city,
            province: locInfo?.province,
            road: locInfo?.road,
            fullAddress: locInfo?.fullAddress,
            elevationReport: rep,
          });
        } catch (err) {
          console.warn('Failed to resolve geocode or elevation:', err);
        }

        // Start continuous background watch for realtime tracking
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
        let lastGeocodedLat = latitude;
        let lastGeocodedLng = longitude;

        watchIdRef.current = navigator.geolocation.watchPosition(
          async (watchPos) => {
            const lat = watchPos.coords.latitude;
            const lng = watchPos.coords.longitude;
            const acc = watchPos.coords.accuracy;
            setUserCoords({ lat, lng });
            setUserAccuracy(acc);

            // Re-resolve geocode if moved more than 50 meters
            const distMovedKm = geospatialAnalysisService.calculateDistanceKm(lastGeocodedLat, lastGeocodedLng, lat, lng);
            if (distMovedKm > 0.05) {
              lastGeocodedLat = lat;
              lastGeocodedLng = lng;
              const newLocInfo = await preciseGeocodingService.reverseGeocode(lat, lng, acc);
              setUserPreciseLocation(newLocInfo);
            }
          },
          (watchErr) => {
            console.warn('Realtime GPS watch error:', watchErr);
          },
          geoOptions
        );
      },
      (err) => {
        setIsLocatingUser(false);
        setIsTrackingLive(false);
        console.warn('Geolocation error:', err);

        let errMsg = 'Gagal mendeteksi lokasi GPS asli.';
        if (err.code === 1) {
          errMsg = 'Izin lokasi ditolak. Harap klik ikon gembok/izin di bilah browser dan izinkan "Location" agar koordinat dan nama desa Anda terdeteksi akurat.';
        } else if (err.code === 2) {
          errMsg = 'Sinyal satelit GPS tidak dapat ditemukan. Pastikan layanan lokasi pada perangkat aktif.';
        } else if (err.code === 3) {
          errMsg = 'Pencarian lokasi GPS waktu habis (timeout). Silakan periksa jaringan dan coba lagi.';
        }

        setLocationStatusToast({
          type: 'error',
          title: 'Akses GPS Belum Diizinkan',
          message: errMsg,
        });
      },
      geoOptions
    );
  };


  // Layer Refs for new features
  const tectonicLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const earthquakeLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const hotspotLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const eqAnimIdRef = useRef<number | null>(null);

  const attributeLayers = useMemo<AttributeTableLayer[]>(() => {
    const list: AttributeTableLayer[] = [];
    if (drawingSourceRef.current) {
      list.push({
        id: 'user_drawings',
        name: 'Digitasi Vektor Pengguna',
        source: drawingSourceRef.current,
        getFeatures: () => drawingSourceRef.current?.getFeatures() || [],
      });
    }
    if (schoolsLayerRef.current) {
      list.push({
        id: 'schools',
        name: 'Sekolah & Satuan Pendidikan',
        source: schoolsLayerRef.current?.getSource() || null,
        getFeatures: () => schoolsLayerRef.current?.getSource()?.getFeatures() || [],
      });
    }
    if (vectorLayerRef.current) {
      list.push({
        id: 'mountains',
        name: 'Gunung Api & Puncak',
        source: vectorLayerRef.current?.getSource() || null,
        getFeatures: () => vectorLayerRef.current?.getSource()?.getFeatures() || [],
      });
    }
    if (earthquakeLayerRef.current) {
      list.push({
        id: 'earthquakes',
        name: 'Gempa Bumi BMKG Terkini',
        source: earthquakeLayerRef.current?.getSource() || null,
        getFeatures: () => earthquakeLayerRef.current?.getSource()?.getFeatures() || [],
      });
    }
    if (hotspotLayerRef.current) {
      list.push({
        id: 'hotspots',
        name: 'Anomali Panas & Titik Api Satelit',
        source: hotspotLayerRef.current?.getSource() || null,
        getFeatures: () => hotspotLayerRef.current?.getSource()?.getFeatures() || [],
      });
    }
    if (tsunamiSensorsLayerRef.current) {
      list.push({
        id: 'sensors',
        name: 'Sensor Geospasial & InaTEWS',
        source: tsunamiSensorsLayerRef.current?.getSource() || null,
        getFeatures: () => tsunamiSensorsLayerRef.current?.getSource()?.getFeatures() || [],
      });
    }
    if (analysisSourceRef.current) {
      list.push({
        id: 'analysis_results',
        name: 'Hasil Analisis & Buffer',
        source: analysisSourceRef.current,
        getFeatures: () => analysisSourceRef.current?.getFeatures() || [],
      });
    }
    return list;
  }, [mapReady, showAttributeTable]);

  const geoprocessPointDatasets = useMemo<PointDataset[]>(() => {
    const datasets: PointDataset[] = [];
    if (schoolsLayerRef.current) {
      const pts: Array<[number, number]> = [];
      schoolsLayerRef.current.getSource()?.getFeatures().forEach((f) => {
        const g = f.getGeometry();
        if (g && g.getType() === 'Point') {
          const c = (g as Point).getCoordinates();
          pts.push(toLonLat(c) as [number, number]);
        }
      });
      if (pts.length > 0) {
        datasets.push({ name: 'Sekolah (Dapodik)', points: pts });
      }
    }
    if (tsunamiSensorsLayerRef.current) {
      const pts: Array<[number, number]> = [];
      tsunamiSensorsLayerRef.current.getSource()?.getFeatures().forEach((f) => {
        const g = f.getGeometry();
        if (g && g.getType() === 'Point') {
          const c = (g as Point).getCoordinates();
          pts.push(toLonLat(c) as [number, number]);
        }
      });
      if (pts.length > 0) {
        datasets.push({ name: 'Sensor Bahaya', points: pts });
      }
    }
    return datasets;
  }, [mapReady, showSD, showSMP, showSMA, showTsunamiSensors]);
  const showForests = settings.showForests;
  const setShowForests = (v: boolean | ((prev: boolean) => boolean)) => updateSetting('showForests', v);
  const showKota = settings.showKota;
  const setShowKota = (v: boolean | ((prev: boolean) => boolean)) => updateSetting('showKota', v);
  const showKabupaten = settings.showKabupaten;
  const setShowKabupaten = (v: boolean | ((prev: boolean) => boolean)) => updateSetting('showKabupaten', v);
  const showDesa = settings.showDesa;
  const setShowDesa = (v: boolean | ((prev: boolean) => boolean)) => updateSetting('showDesa', v);

  const activeLayersCount = useMemo(() => {
    let count = 0;
    if (showActive) count++;
    if (showInactive) count++;
    if (showPeaks) count++;
    if (showSD) count++;
    if (showSMP) count++;
    if (showSMA) count++;
    if (showTectonic) count++;
    if (showEarthquakes) count++;
    if (showTsunamiSensors) count++;
    if (showForests) count++;
    if (showKota) count++;
    if (showKabupaten) count++;
    if (showDesa) count++;
    if (weatherMapOverlay !== 'none') count++;
    if (showTrafficCorridors) count++;
    if (activeMapBasemap !== 'osm') count++;
    return count;
  }, [
    showActive, showInactive, showPeaks, showSD, showSMP, showSMA,
    showTectonic, showEarthquakes, showTsunamiSensors, showForests, showKota, showKabupaten,
    showDesa, weatherMapOverlay, showTrafficCorridors, activeMapBasemap
  ]);

  const handleResetLayerSettings = () => {
    Object.keys(DEFAULT_MAP_SETTINGS).forEach((key) => {
      updateSetting(key as keyof MapLayerSettings, false);
    });
    setWeatherMapOverlay('none');
    setShowTrafficCorridors(false);
    setActiveMapBasemap('osm');
    setShowBottomDock(false);
    setShowTrafficControlBar(false);
    setShowGeospatialIntelBar(false);
    setShowObservationCoverage(false);
    setShowEquatorZones(false);
    setShowWeatherCard(false);
    setShowGpsProbes(false);
    setShowTrafficCctv(false);
    setShowTrafficSignals(false);
    setShowHotspots(false);
    try {
      window.localStorage.setItem(`hm_show_bottom_dock_${activeUserId}`, 'false');
      window.localStorage.setItem(`hm_geospatial_intel_bar_${activeUserId}`, 'false');
      window.localStorage.setItem(`hm_traffic_bar_${activeUserId}`, 'false');
      window.localStorage.setItem(`hm_weather_card_${activeUserId}`, 'false');
      window.localStorage.setItem('hm_equator_zones', 'false');
    } catch (e) {}
  };

  const managedLayers = useMemo<ManagedLayer[]>(() => {
    return [
      {
        id: 'kabupaten',
        name: 'Batas Kabupaten Indonesia',
        category: 'administrative',
        visible: showKabupaten,
        opacity: 0.9,
        sourceStatus: 'STATIC',
        color: '#f97316',
        description: 'Batas wilayah administratif kabupaten resmi',
        onToggle: (v) => setShowKabupaten(v),
      },
      {
        id: 'kota',
        name: 'Batas Kota Otonom',
        category: 'administrative',
        visible: showKota,
        opacity: 0.9,
        sourceStatus: 'STATIC',
        color: '#ef4444',
        description: 'Wilayah administratif perkotaan',
        onToggle: (v) => setShowKota(v),
      },
      {
        id: 'desa',
        name: 'Batas Desa & Kelurahan',
        category: 'administrative',
        visible: showDesa,
        opacity: 0.9,
        sourceStatus: 'STATIC',
        color: '#eab308',
        description: 'Batas mikro desa/kelurahan',
        onToggle: (v) => setShowDesa(v),
      },
      {
        id: 'equator',
        name: 'Garis Khatulistiwa 0° & Tropika',
        category: 'administrative',
        visible: showEquatorZones,
        opacity: 1,
        sourceStatus: 'STATIC',
        color: '#f59e0b',
        description: 'Lintang astronomis bumi & batas tropis',
        onToggle: (v) => setShowEquatorZones(v),
      },
      {
        id: 'traffic',
        name: 'Koridor Jalan & Lalu Lintas Hybrid',
        category: 'infrastructure',
        visible: showTrafficCorridors,
        opacity: trafficOpacity,
        sourceStatus: 'STATIC',
        color: '#06b6d4',
        featureCount: INDONESIA_TRAFFIC_CORRIDORS.length,
        description: `${INDONESIA_TRAFFIC_CORRIDORS.length} koridor jalan raya & estimasi kepadatan lalu lintas hybrid`,
        onToggle: (v) => setShowTrafficCorridors(v),
        onOpacityChange: (op) => setTrafficOpacity(op),
      },
      {
        id: 'observation_coverage',
        name: 'Cakupan Sensor & Blank Spot BMKG',
        category: 'earth_observation',
        visible: showObservationCoverage,
        opacity: 0.9,
        sourceStatus: 'CATALOG',
        color: '#10b981',
        featureCount: BMKG_DOPPLER_RADAR_NETWORK.length + BMKG_BLANK_SPOT_ZONES.length,
        description: `${BMKG_DOPPLER_RADAR_NETWORK.length} radar Doppler & ${BMKG_BLANK_SPOT_ZONES.length} zona kesenjangan data (Katalog inventaris BMKG)`,
        onToggle: (v) => setShowObservationCoverage(v),
      },
      {
        id: 'forest',
        name: 'Kawasan Hutan Indonesia (KLHK)',
        category: 'environment',
        visible: showForests,
        opacity: forestOpacity,
        sourceStatus: 'STATIC',
        color: '#16a34a',
        description: 'Tutupan hutan lindung dan konservasi KLHK',
        onToggle: (v) => setShowForests(v),
        onOpacityChange: (op) => setForestOpacity(op),
      },
      {
        id: 'radar',
        name: 'Radar Cuaca Doppler BMKG',
        category: 'earth_observation',
        visible: weatherMapOverlay === 'radar',
        opacity: weatherOverlayOpacity,
        sourceStatus: 'EXTERNAL',
        color: '#3b82f6',
        description: 'Pita radar cuaca RainViewer / inventaris radar BMKG',
        onToggle: (v) => handleSelectWeatherOverlay(v ? 'radar' : 'none'),
        onOpacityChange: (op) => setWeatherOverlayOpacity(op),
      },
      {
        id: 'earthquakes',
        name: 'Gempa Bumi BMKG InaTEWS Terkini',
        category: 'disaster',
        visible: showEarthquakes,
        opacity: 1,
        sourceStatus: (quakeSnapshot?.status ?? (earthquakes.length > 0 ? 'LIVE' : 'UNAVAILABLE')) as any,
        color: '#ef4444',
        featureCount: earthquakes.length,
        description: `${earthquakes.length} entri gempa dari feed BMKG/USGS; sumber dan waktu mengikuti data masing-masing`,
        onToggle: (v) => setShowEarthquakes(v),
        onZoomToExtent: () => {
          const src = earthquakeLayerRef.current?.getSource();
          if (src && mapRef.current) {
            const ext = src.getExtent();
            if (ext && isFinite(ext[0]) && !isNaN(ext[0])) {
              mapRef.current.getView().fit(ext, { padding: [60, 60, 60, 60], maxZoom: 8, duration: 600 });
            }
          }
        },
      },
      {
        id: 'hotspots',
        name: 'Anomali Panas & Titik Api Satelit (God\'s Eye View)',
        category: 'disaster',
        visible: showHotspots,
        opacity: 1,
        sourceStatus: (hotspotSnapshot?.status ?? (hotspots.length > 0 ? 'LIVE' : 'UNAVAILABLE')) as any,
        color: '#f97316',
        featureCount: hotspots.length,
        description: `${hotspots.length} anomali suhu dan radiasi termal dari sensor satelit VIIRS/MODIS`,
        onToggle: (v) => setShowHotspots(v),
        onZoomToExtent: () => {
          const src = hotspotLayerRef.current?.getSource();
          if (src && mapRef.current) {
            const ext = src.getExtent();
            if (ext && isFinite(ext[0]) && !isNaN(ext[0])) {
              mapRef.current.getView().fit(ext, { padding: [60, 60, 60, 60], maxZoom: 8, duration: 600 });
            }
          }
        },
      },
      {
        id: 'volcanoes',
        name: 'Gunung Api Aktif PVMBG',
        category: 'disaster',
        visible: showActive,
        opacity: 1,
        sourceStatus: 'CATALOG',
        color: '#f97316',
        featureCount: mountains.length,
        description: `${mountains.length} gunung api dan pos pengamatan (Katalog PVMBG / MAGMA)`,
        onToggle: (v) => setShowActive(v),
        onZoomToExtent: () => {
          const src = vectorLayerRef.current?.getSource();
          if (src && mapRef.current) {
            const ext = src.getExtent();
            if (ext && isFinite(ext[0]) && !isNaN(ext[0])) {
              mapRef.current.getView().fit(ext, { padding: [60, 60, 60, 60], maxZoom: 8, duration: 600 });
            }
          }
        },
      },
      {
        id: 'tectonic',
        name: 'Sesar & Batas Lempeng Tektonik',
        category: 'disaster',
        visible: showTectonic,
        opacity: 1,
        sourceStatus: 'STATIC',
        color: '#f97316',
        description: 'Jalur patahan tektonik aktif regional',
        onToggle: (v) => setShowTectonic(v),
      },
      {
        id: 'landslide_zones',
        name: 'Zona Kerentanan Gerakan Tanah & Longsor (PVMBG)',
        category: 'disaster',
        visible: showLandslideZones,
        opacity: 0.85,
        sourceStatus: 'CATALOG',
        color: '#dc2626',
        featureCount: LANDSLIDE_SUSCEPTIBILITY_ZONES.length,
        description: 'Zona kerentanan gerakan tanah PVMBG/Badan Geologi (Tinggi/Menengah/Rendah) dan lereng pemicu longsor',
        onToggle: (v) => setShowLandslideZones(v),
      },
      {
        id: 'tsunami_zones',
        name: 'Zona Inundasi Bahaya Tsunami Pesisir (InaTEWS)',
        category: 'disaster',
        visible: showTsunamiZones,
        opacity: 0.85,
        sourceStatus: 'CATALOG',
        color: '#0284c7',
        featureCount: TSUNAMI_HAZARD_ZONES.length,
        description: 'Zona penyangga rawan inundasi tsunami pesisir pantai selatan Jawa, Sumatera, Bali & Sulawesi (BMKG InaTEWS)',
        onToggle: (v) => setShowTsunamiZones(v),
      },
      {
        id: 'sensors',
        name: 'Sensor Geospasial Multi-Bahaya',
        category: 'sensors',
        visible: showTsunamiSensors,
        opacity: 1,
        sourceStatus: 'CATALOG',
        color: '#0284c7',
        featureCount: tsunamiSensorsLayerRef.current?.getSource()?.getFeatures().length || 18,
        description: 'Jaringan stasiun sensor InaTEWS, DART, & BMKG (Katalog terdaftar)',
        onToggle: (v) => setShowTsunamiSensors(v),
        onZoomToExtent: () => {
          const src = tsunamiSensorsLayerRef.current?.getSource();
          if (src && mapRef.current) {
            const ext = src.getExtent();
            if (ext && isFinite(ext[0]) && !isNaN(ext[0])) {
              mapRef.current.getView().fit(ext, { padding: [60, 60, 60, 60], maxZoom: 8, duration: 600 });
            }
          }
        },
      },
      {
        id: 'schools_sd',
        name: 'Lokasi Sekolah Dasar (SD)',
        category: 'education_infrastructure',
        visible: showSD,
        opacity: 1,
        sourceStatus: 'STATIC',
        color: '#ef4444',
        description: 'Koordinat Dapodik Kemendikbud',
        onToggle: (v) => setShowSD(v),
      },
      {
        id: 'schools_smp',
        name: 'Lokasi Sekolah Menengah Pertama (SMP)',
        category: 'education_infrastructure',
        visible: showSMP,
        opacity: 1,
        sourceStatus: 'STATIC',
        color: '#3b82f6',
        description: 'Koordinat Dapodik Kemendikbud',
        onToggle: (v) => setShowSMP(v),
      },
      {
        id: 'schools_sma',
        name: 'Lokasi Sekolah Menengah Atas (SMA/SMK)',
        category: 'education_infrastructure',
        visible: showSMA,
        opacity: 1,
        sourceStatus: 'STATIC',
        color: '#8b5cf6',
        description: 'Koordinat Dapodik Kemendikbud',
        onToggle: (v) => setShowSMA(v),
      },
      {
        id: 'user_drawings',
        name: 'Digitasi Vektor Pengguna',
        category: 'user_layers',
        visible: showUserDrawings,
        opacity: userDrawingsOpacity,
        sourceStatus: drawingFeaturesCount > 0 ? 'USER_DIGITIZED' : 'STATIC',
        color: '#2563eb',
        featureCount: drawingFeaturesCount,
        description:
          drawingFeaturesCount > 0
            ? `${drawingFeaturesCount} objek geometri hasil digitasi aktif pada peta`
            : 'Belum ada objek gambar (gunakan tombol gambar di bilah Alat GIS kiri)',
        onToggle: (v) => setShowUserDrawings(v),
        onOpacityChange: (op) => setUserDrawingsOpacity(op),
        onZoomToExtent: () => {
          const src = drawingSourceRef.current;
          if (src && mapRef.current) {
            const feats = src.getFeatures();
            if (feats.length > 0) {
              const ext = src.getExtent();
              if (ext && isFinite(ext[0]) && !isNaN(ext[0])) {
                mapRef.current.getView().fit(ext, { padding: [60, 60, 60, 60], maxZoom: 16, duration: 600 });
              }
            }
          }
        },
      },
      {
        id: 'analysis_layer',
        name: 'Hasil Geoprosesing & Buffer',
        category: 'analysis_results',
        visible: showAnalysisLayer,
        opacity: analysisLayerOpacity,
        sourceStatus: 'DERIVED',
        color: '#6366f1',
        featureCount: analysisFeaturesCount,
        description:
          analysisFeaturesCount > 0
            ? `${analysisFeaturesCount} objek hasil analisis; periksa sumber dan status pada data hasil`
            : 'Belum ada hasil analisis (buka Studio Geospasial atau Buffer AOI)',
        onToggle: (v) => setShowAnalysisLayer(v),
        onOpacityChange: (op) => setAnalysisLayerOpacity(op),
        onZoomToExtent: () => {
          const src = analysisSourceRef.current;
          if (src && mapRef.current) {
            const feats = src.getFeatures();
            if (feats.length > 0) {
              const ext = src.getExtent();
              if (ext && isFinite(ext[0]) && !isNaN(ext[0])) {
                mapRef.current.getView().fit(ext, { padding: [60, 60, 60, 60], maxZoom: 16, duration: 600 });
              }
            }
          }
        },
      },
    ];
  }, [
    showKabupaten,
    showKota,
    showDesa,
    showEquatorZones,
    showTrafficCorridors,
    trafficOpacity,
    showForests,
    forestOpacity,
    weatherMapOverlay,
    weatherOverlayOpacity,
    handleSelectWeatherOverlay,
    showEarthquakes,
    earthquakes,
    showActive,
    mountains,
    showTectonic,
    showLandslideZones,
    showTsunamiZones,
    showTsunamiSensors,
    showSD,
    showSMP,
    showSMA,
    showUserDrawings,
    userDrawingsOpacity,
    drawingFeaturesCount,
    showAnalysisLayer,
    analysisLayerOpacity,
    analysisFeaturesCount,
    setShowKabupaten,
    setShowKota,
    setShowDesa,
    setShowForests,
    setShowEarthquakes,
    showHotspots,
    setShowHotspots,
    hotspots,
    hotspotSnapshot,
    setShowActive,
    setShowTectonic,
    setShowTsunamiSensors,
    setShowSD,
    setShowSMP,
    setShowSMA,
  ]);

  const forestLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const kotaLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const kabupatenLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const desaLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const sharedBoundarySourceRef = useRef<VectorSource | null>(null);

  // Sync Analysis, Forest, and Traffic layer properties
  useEffect(() => {
    if (analysisLayerRef.current) {
      analysisLayerRef.current.setVisible(showAnalysisLayer);
      analysisLayerRef.current.setOpacity(analysisLayerOpacity);
    }
  }, [showAnalysisLayer, analysisLayerOpacity]);

  useEffect(() => {
    if (forestLayerRef.current) {
      forestLayerRef.current.setOpacity(forestOpacity);
    }
  }, [forestOpacity]);

  useEffect(() => {
    if (trafficOverlayLayerRef.current) {
      trafficOverlayLayerRef.current.setOpacity(trafficOpacity);
    }
    if (trafficVectorLayerRef.current) {
      trafficVectorLayerRef.current.setOpacity(trafficOpacity);
    }
  }, [trafficOpacity]);

  // Sinkronisasi data telemetri kecepatan kendaraan realtime ke OpenLayers Vector Source
  useEffect(() => {
    if (!trafficVectorLayerRef.current) return;
    const source = trafficVectorLayerRef.current.getSource();
    if (!source) return;

    source.forEachFeature((feat) => {
      const corridorId = feat.get('corridorId');
      const segmentId = feat.get('segmentId');
      const milestoneId = feat.get('milestoneId');
      const corridor = trafficDataList.find((c) => c.id === corridorId);
      if (!corridor) return;

      if (segmentId && corridor.segments) {
        const seg = corridor.segments.find((s) => s.id === segmentId);
        if (seg) {
          feat.set('speedKmh', seg.speedKmh);
          feat.set('status', seg.status);
        }
      } else if (milestoneId && corridor.milestones) {
        const ms = corridor.milestones.find((m) => m.id === milestoneId);
        if (ms) {
          feat.set('speedKmh', ms.speedKmh);
          feat.set('status', ms.status);
        }
      } else {
        feat.set('speedKmh', corridor.speedKmh);
        feat.set('status', corridor.status);
      }
    });

    trafficVectorLayerRef.current.changed();
  }, [trafficDataList]);

  // Synchronize corridors to GPS density service
  useEffect(() => {
    trafficGpsDensityService.setCorridors(trafficDataList);
  }, [trafficDataList]);

  // Subscribe to crowdsourced GPS density telemetry summary
  useEffect(() => {
    const unsub = trafficGpsDensityService.subscribe((summary) => {
      setCrowdsourceSummary(summary);
    });
    return unsub;
  }, []);

  // Real-time Traffic Corridors, GPS Probes, Heatmap & ATCS Signal Animation Loop
  useEffect(() => {
    const isTrafficActive = (activeMapBasemap === 'traffic' || showTrafficCorridors) && !showGeospatialModal;
    if (!isTrafficActive) return;

    let animFrameId: number;
    let lastTime = performance.now();
    let signalTickCounter = 0;
    let densityTickCounter = 0;

    const animate = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // 1. Advance crowdsourced GPS commuter probes along road vectors
      trafficGpsDensityService.advanceProbes(dt);

      // 2. Dynamic Congestion Calculation (Google Maps Live GPS vs Typical Profile)
      densityTickCounter += dt;
      if (densityTickCounter >= 2.5) {
        densityTickCounter = 0;
        if (trafficMode === 'live') {
          trafficGpsDensityService.recomputeDensity();
          setCrowdsourceSummary(trafficGpsDensityService.getSummary());
          if (trafficVectorLayerRef.current) {
            const vecSource = trafficVectorLayerRef.current.getSource();
            if (vecSource) {
              vecSource.getFeatures().forEach((feat) => {
                if (feat.get('isTrafficLine')) {
                  const segId = feat.get('segmentId') || feat.get('corridorId');
                  const metric = trafficGpsDensityService.getSegmentMetric(segId);
                  if (metric) {
                    feat.set('status', metric.congestionLevel, true);
                    feat.set('speedKmh', metric.averageSpeedKmh, true);
                    feat.set('probeCount', metric.probeCount, true);
                    feat.set('densityPerKm', metric.densityPerKm, true);
                    feat.set('delayMinutes', metric.delayMinutes, true);
                  }
                }
              });
              trafficVectorLayerRef.current.changed();
            }
          }
        }
      }

      // 3. Advance ATCS Signals countdown & phase changes every ~1 second
      signalTickCounter += dt;
      if (signalTickCounter >= 1.0) {
        signalTickCounter = 0;
        if (showTrafficSignals && trafficSignalsLayerRef.current) {
          const source = trafficSignalsLayerRef.current.getSource();
          if (source) {
            const signals = trafficSignalsService.getAllSignals();
            source.getFeatures().forEach((feat) => {
              const sigId = feat.get('signalId');
              const sig = signals.find((s) => s.id === sigId);
              if (sig) {
                feat.set('currentPhase', sig.currentPhase, true);
                feat.set('remainingSeconds', sig.remainingSeconds, true);
                feat.set('signalData', sig, true);
              }
            });
            trafficSignalsLayerRef.current.changed();
          }
        }
      }

      animFrameId = requestAnimationFrame(animate);
    };

    animFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [activeMapBasemap, showTrafficCorridors, trafficMode, showTrafficSignals, showGeospatialModal]);

  // Google Maps Typical Traffic Profile Engine: updates roads when day or hour slider moves
  useEffect(() => {
    if (trafficMode !== 'typical' || !trafficVectorLayerRef.current) return;
    const source = trafficVectorLayerRef.current.getSource();
    if (!source) return;

    source.getFeatures().forEach((feat) => {
      if (feat.get('isTrafficLine')) {
        const corridorId = (feat.get('corridorId') || '') as string;
        const tier = (feat.get('tier') || 'arterial') as 'expressway' | 'arterial' | 'collector' | 'local';
        const profile = computeTypicalTraffic(corridorId, tier, trafficTypicalDay, trafficTypicalHour);
        feat.set('status', profile.status, true);
        feat.set('speedKmh', profile.speedKmh, true);
        feat.set('delayMinutes', profile.delayMinutes, true);
      }
    });
    trafficVectorLayerRef.current.changed();
  }, [trafficMode, trafficTypicalDay, trafficTypicalHour]);

  // When switching back to live traffic, immediately restore live density metrics
  useEffect(() => {
    if (trafficMode === 'live' && trafficVectorLayerRef.current) {
      trafficGpsDensityService.recomputeDensity();
      const vecSource = trafficVectorLayerRef.current.getSource();
      if (vecSource) {
        vecSource.getFeatures().forEach((feat) => {
          if (feat.get('isTrafficLine')) {
            const segId = feat.get('segmentId') || feat.get('corridorId');
            const metric = trafficGpsDensityService.getSegmentMetric(segId);
            if (metric) {
              feat.set('status', metric.congestionLevel, true);
              feat.set('speedKmh', metric.averageSpeedKmh, true);
              feat.set('delayMinutes', metric.delayMinutes, true);
            }
          }
        });
        trafficVectorLayerRef.current.changed();
      }
    }
  }, [trafficMode]);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  // Client-side search through 200k+ schools (using useMemo for performance)
  const searchResults = useMemo(() => {
    if (searchQuery.trim().length < 3) return [];
    const query = searchQuery.toLowerCase();
    // Return max 10 results to keep it fast and UI clean
    return schools.filter(s => s[4].toLowerCase().includes(query)).slice(0, 10);
  }, [searchQuery, schools]);

  const handleSelectSchool = (school: any) => {
    const lat = school[1];
    const lng = school[2];
    const name = school[4];
    const map = mapRef.current;
    
    if (map) {
      // Animate map view to the school
      map.getView().animate({
        center: fromLonLat([lng, lat]),
        zoom: 17,
        duration: 1500
      });

      // Show popup manually
      if (popupOverlayRef.current && popupRef.current) {
        popupRef.current.innerHTML = `
          <div style="min-width: 160px; font-family: Inter, sans-serif;" class="p-1 relative">
              <button id="close-popup-btn" style="position: absolute; top: -2px; right: -2px; background: #f1f5f9; border-radius: 50%; padding: 2px; border: none; cursor: pointer; color: #94a3b8;">✖</button>
              <strong style="font-size: 13px; color: #1e293b; display: block; margin-bottom: 4px; padding-right: 16px;">${name}</strong>
              <span style="font-size: 11px; color: #64748b; display: block;">Searched Location</span>
          </div>
        `;
        const closeBtn = popupRef.current.querySelector('#close-popup-btn');
        if (closeBtn) {
          closeBtn.addEventListener('click', () => {
            if (popupRef.current) popupRef.current.style.display = 'none';
          });
        }
        popupOverlayRef.current.setPosition(fromLonLat([lng, lat]));
        popupRef.current.style.display = 'block';
      }
    }
    
    setSearchQuery('');
    setIsSearchFocused(false);
  };

  const isSchoolLayerActive = Boolean(settings?.showSD || settings?.showSMP || settings?.showSMA);
  const isVolcanoLayerActive = Boolean(settings?.showActive || settings?.showInactive || settings?.showPeaks);

  // On-demand fetch for mountains: only loads when volcano layers are activated or non-lean device
  useEffect(() => {
    if (isLeanDevice && !isVolcanoLayerActive) return;
    if (mountains.length > 10) return; // already enriched

    let mounted = true;
    setActiveLayerLoads((prev) => prev + 1);
    fetch('/data/mountains.json')
      .then((res) => res.json())
      .then(async (data) => {
        if (mounted && data) {
          const enriched = await volcanoService.fetchEnrichedVolcanoes(data);
          setMountains(enriched);
        }
      })
      .catch((err) => console.error("Failed to load mountains", err))
      .finally(() => {
        setActiveLayerLoads((prev) => Math.max(0, prev - 1));
      });

    return () => { mounted = false; };
  }, [isVolcanoLayerActive, isLeanDevice, mountains.length]);

  // On-demand fetch for schools: only loads when school layers are activated or non-lean device
  useEffect(() => {
    if (isLeanDevice && !isSchoolLayerActive) return;
    if (schools.length > 0) return; // already loaded

    let mounted = true;
    setActiveLayerLoads((prev) => prev + 1);
    fetch('/data/schools-lite.json')
      .then((res) => res.json())
      .then((data) => {
        if (mounted && data && Array.isArray(data)) {
          const mappedSchools = data.map((s: any) => {
             const name = (s.name || s.school_name || "").toUpperCase();
             let cat = 0;
             if (name.includes("TK ") || name.includes("PAUD") || name.includes("KB ")) {
               cat = 1;
             } else if (name.includes("SDN ") || name.includes("SD ") || name.includes("MI ")) {
               cat = 2;
             } else if (name.includes("SMP") || name.includes("MTS")) {
               cat = 3;
             } else if (name.includes("SMA") || name.includes("SMK") || name.includes("MA ")) {
               cat = 4;
             }
             return [
               s.id || s.school_id,
               parseFloat(s.latitude || s.lat),
               parseFloat(s.longitude || s.lng),
               cat,
               s.name || s.school_name
             ];
          }).filter((s) => !isNaN(s[1]) && !isNaN(s[2]));
          setSchools(mappedSchools);
        }
      })
      .catch((err) => console.error("Failed to load schools", err))
      .finally(() => {
        setActiveLayerLoads((prev) => Math.max(0, prev - 1));
      });

    return () => { mounted = false; };
  }, [isSchoolLayerActive, isLeanDevice, schools.length]);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // 1. Create Shared Source & Boundary Layers IMMEDIATELY
    const sharedSource = new VectorSource();
    sharedBoundarySourceRef.current = sharedSource;

    // Load optimized TopoJSON (Forests + Cagar Alam)
    const forestSource = new VectorSource({
      url: '/indonesia-hutan.topojson',
      format: new TopoJSON()
    });
    const perfProfile = hardwarePerformanceService.getProfile();

    const forestLayer = new VectorLayer({
      source: forestSource,
      renderBuffer: 20,
      zIndex: 2,
      visible: false,
      style: (feature) => {
        const geom = feature.getGeometry();
        if (geom) {
          const type = geom.getType();
          let isBox = false;
          if (type === 'Polygon') {
            const coords = (geom as any).getCoordinates();
            if (coords.length === 1 && coords[0].length <= 5) {
              isBox = true;
            }
          } else if (type === 'MultiPolygon') {
            const coords = (geom as any).getCoordinates();
            if (coords.length === 1 && coords[0].length === 1 && coords[0][0].length <= 5) {
              isBox = true;
            }
          }
          if (isBox || feature.get('name') === 'BATAS DESA') {
            return new Style(); // hide it
          }
        }
        return new Style({
          stroke: new Stroke({ color: '#16a34a', width: 1.5 }), // Green-600
          fill: new Fill({ color: 'rgba(22, 163, 74, 0.5)' })
        });
      }
    });
    forestLayerRef.current = forestLayer;

    const kotaSource = new VectorSource({
      url: '/indonesia-kab.topojson',
      format: new TopoJSON()
    });
    const kotaLayer = new VectorLayer({
      source: kotaSource,
      renderBuffer: 20,
      zIndex: 2,
      visible: false,
      style: (feature) => {
        const name = (feature.get('district') || '').toUpperCase();
        if (!name.startsWith('KOTA ')) return new Style();
        return new Style({
          stroke: new Stroke({ color: '#ef4444', width: 2, lineDash: [4, 4] }),
          fill: new Fill({ color: 'rgba(239, 68, 68, 0.15)' })
        });
      }
    });
    kotaLayerRef.current = kotaLayer;

    const kabupatenSource = new VectorSource({
      url: '/indonesia-kab.topojson',
      format: new TopoJSON()
    });
    const kabupatenLayer = new VectorLayer({
      source: kabupatenSource,
      renderBuffer: 20,
      zIndex: 2,
      visible: false,
      style: (feature) => {
        const name = (feature.get('district') || '').toUpperCase();
        if (name.startsWith('KOTA ')) return new Style();
        return new Style({
          stroke: new Stroke({ color: '#f97316', width: 2, lineDash: [4, 4] }),
          fill: new Fill({ color: 'rgba(249, 115, 22, 0.15)' })
        });
      }
    });
    kabupatenLayerRef.current = kabupatenLayer;

    const desaSource = new VectorSource({
      url: '/indonesia-desa.topojson',
      format: new TopoJSON()
    });
    const desaLayer = new VectorLayer({
      source: desaSource,
      renderBuffer: 20,
      zIndex: 2,
      minZoom: 12,
      visible: false,
      style: (feature) => {
        return new Style({
          stroke: new Stroke({ color: '#eab308', width: 1.5, lineDash: [4, 4] }),
          fill: new Fill({ color: 'rgba(234, 179, 8, 0.2)' })
        });
      }
    });
    desaLayerRef.current = desaLayer;

    const baseTile = new TileLayer({
      source: getSourceForBasemap(activeMapBasemap),
      cacheSize: perfProfile.effectiveMode === 'lite' ? 128 : 256,
      preload: 0,
      zIndex: 1
    });
    baseTileLayerRef.current = baseTile;

    const satelliteRefLayer = new TileLayer({
      source: new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
        crossOrigin: 'anonymous',
      }),
      cacheSize: 128,
      preload: 0,
      zIndex: 4,
      visible: activeMapBasemap === 'satellite',
    });
    satelliteReferenceLayerRef.current = satelliteRefLayer;

    // Traffic Vector Layer: Real road geometry polylines styled like Google Maps Live Traffic
    const trafficSource = new VectorSource();
    INDONESIA_TRAFFIC_CORRIDORS.forEach((corridor) => {
      // If corridor has multi-segment breakdown, add each subsegment as an individual LineString feature
      if (corridor.segments && corridor.segments.length > 0) {
        corridor.segments.forEach((seg) => {
          if (seg.path && seg.path.length > 1) {
            const lineCoords = seg.path.map(([lng, lat]) => fromLonLat([lng, lat]));
            const lineFeat = new Feature({
              geometry: new LineString(lineCoords),
              isTrafficLine: true,
              corridorId: corridor.id,
              segmentId: seg.id,
              name: seg.name,
              segmentName: seg.name,
              corridorName: corridor.name,
              status: seg.status,
              speedKmh: seg.speedKmh,
              routeType: corridor.routeType,
              tier: corridor.tier,
              corridorData: corridor,
            });
            trafficSource.addFeature(lineFeat);
          }
        });
      } else if (corridor.path && corridor.path.length > 1) {
        const lineCoords = corridor.path.map(([lng, lat]) => fromLonLat([lng, lat]));
        const lineFeat = new Feature({
          geometry: new LineString(lineCoords),
          isTrafficLine: true,
          corridorId: corridor.id,
          name: corridor.name,
          corridorName: corridor.name,
          status: corridor.status,
          speedKmh: corridor.speedKmh,
          routeType: corridor.routeType,
          tier: corridor.tier,
          corridorData: corridor,
        });
        trafficSource.addFeature(lineFeat);
      }

      // Add strategic milestone markers (Toll Plazas / Junctions)
      if (corridor.milestones && corridor.milestones.length > 0) {
        corridor.milestones.forEach((ms) => {
          const pointFeat = new Feature({
            geometry: new Point(fromLonLat(ms.coord)),
            isTrafficMilestone: true,
            corridorId: corridor.id,
            milestoneId: ms.id,
            name: ms.name,
            corridorName: corridor.name,
            status: ms.status,
            speedKmh: ms.speedKmh,
            routeType: corridor.routeType,
            tier: corridor.tier,
            corridorData: corridor,
          });
          trafficSource.addFeature(pointFeat);
        });
      } else {
        const pointFeat = new Feature({
          geometry: new Point(fromLonLat(corridor.center)),
          isTrafficMilestone: true,
          corridorId: corridor.id,
          name: corridor.name,
          corridorName: corridor.name,
          status: corridor.status,
          speedKmh: corridor.speedKmh,
          routeType: corridor.routeType,
          tier: corridor.tier,
          corridorData: corridor,
        });
        trafficSource.addFeature(pointFeat);
      }
    });

    const trafficVectorLayer = new VectorLayer({
      source: trafficSource,
      zIndex: 22,
      visible: activeMapBasemap === 'traffic' || showTrafficCorridors,
      style: (feature, resolution) => {
        const isLine = feature.get('isTrafficLine');
        const isMilestone = feature.get('isTrafficMilestone');
        const status = feature.get('status') as string;
        const speed = (feature.get('speedKmh') as number) || 60;
        const name = (feature.get('name') || '') as string;
        const tier = (feature.get('tier') as string) || 'arterial';
        const corridorId = feature.get('corridorId');
        const isSelected = selectedCorridor && selectedCorridor.id === corridorId;

        // Authentic Google Maps Live Traffic color palette
        const color =
          status === 'Lancar'
            ? '#0f9d58' // Authentic Google Maps Emerald / Free-flow
            : status === 'Ramai Lancar'
            ? '#f9ab00' // Authentic Google Maps Amber / Moderate flow
            : status === 'Padat Merayap'
            ? '#ea4335' // Authentic Google Maps Red / Congested
            : '#7f1d1d'; // Authentic Google Maps Dark Burgundy / Standstill

        const isLocal = tier === 'local';
        const isCollector = tier === 'collector';
        const isExpressway = tier === 'expressway';

        if (resolution > 2000 && isLocal) {
          return [];
        }

        if (isLine) {
          // Dynamic width hierarchy matching authentic GPS navigation
          let casingWidth = 5.2;
          let innerWidth = 3.6;

          if (resolution >= 450) {
            // Island / National overview
            casingWidth = isExpressway ? 6.5 : isCollector ? 4.4 : isLocal ? 3.8 : 5.0;
            innerWidth = isExpressway ? 4.4 : isCollector ? 2.8 : isLocal ? 2.4 : 3.4;
          } else if (resolution >= 120) {
            // Province / Regional scale
            casingWidth = isExpressway ? 9.0 : isCollector ? 6.5 : isLocal ? 5.8 : 7.2;
            innerWidth = isExpressway ? 6.2 : isCollector ? 4.5 : isLocal ? 3.8 : 5.0;
          } else if (resolution >= 35) {
            // City / Metropolitan corridor scale
            casingWidth = isExpressway ? 12.0 : isCollector ? 9.0 : isLocal ? 8.2 : 10.0;
            innerWidth = isExpressway ? 8.5 : isCollector ? 6.2 : isLocal ? 5.8 : 7.0;
          } else {
            // Close-up street inspection scale
            casingWidth = isExpressway ? 15.0 : isCollector ? 11.5 : isLocal ? 10.5 : 12.5;
            innerWidth = isExpressway ? 11.0 : isCollector ? 8.5 : isLocal ? 7.8 : 9.0;
          }

          if (isSelected) {
            casingWidth += 3.5;
            innerWidth += 1.5;
          }

          const styles: Style[] = [];

          // Outer selection glow if active corridor
          if (isSelected) {
            styles.push(
              new Style({
                stroke: new Stroke({
                  color: isLocal ? 'rgba(14, 165, 233, 0.55)' : 'rgba(168, 85, 247, 0.45)',
                  width: casingWidth + 7,
                  lineCap: 'round',
                  lineJoin: 'round',
                }),
              })
            );
          }

          // Dark road base foundation casing for high contrast against any basemap
          styles.push(
            new Style({
              stroke: new Stroke({
                color: isSelected ? (isLocal ? '#0284c7' : '#7c3aed') : (isLocal ? 'rgba(30, 41, 59, 0.96)' : 'rgba(15, 23, 42, 0.94)'),
                width: casingWidth,
                lineCap: 'round',
                lineJoin: 'round',
              }),
            })
          );

          // Vivid traffic flow core
          styles.push(
            new Style({
              stroke: new Stroke({
                color: color,
                width: innerWidth,
                lineCap: 'round',
                lineJoin: 'round',
              }),
            })
          );

          // Authentic Navigation Chevrons: subtle directional flow arrows along the corridor
          if (resolution < 220) {
            styles.push(
              new Style({
                text: new Text({
                  text: '›',
                  font: `bold ${resolution < 50 ? '14px' : '12px'} Inter, system-ui, sans-serif`,
                  placement: 'line',
                  repeat: resolution < 60 ? 65 : 110,
                  offsetY: -0.5,
                  fill: new Fill({ color: 'rgba(255, 255, 255, 0.92)' }),
                  stroke: new Stroke({ color: 'rgba(15, 23, 42, 0.85)', width: 2 }),
                }),
              })
            );
          }

          // Road name & live speed label on street zoom
          if (resolution < 90) {
            const labelPrefix = isLocal ? '🛵 ' : '';
            styles.push(
              new Style({
                text: new Text({
                  text: `${labelPrefix}${name} • ${speed} km/j`,
                  font: isLocal ? 'bold 10px Inter, system-ui, sans-serif' : 'bold 9.5px Inter, system-ui, sans-serif',
                  placement: 'line',
                  repeat: 450,
                  offsetY: -11,
                  fill: new Fill({ color: isLocal ? '#38bdf8' : '#ffffff' }),
                  stroke: new Stroke({ color: '#0f172a', width: 3.5 }),
                }),
              })
            );
          }

          return styles;
        }

        if (isMilestone) {
          // Declutter: speed badges appear when zoomed in to city level (resolution < 120) or when corridor is selected
          if (resolution > 120 && !isSelected) {
            return [];
          }

          const vehicleIcon = isLocal ? '🛵' : '🚗';

          return [
            // Anchor pin dot
            new Style({
              image: new CircleStyle({
                radius: isSelected ? 5.5 : 4,
                fill: new Fill({ color: color }),
                stroke: new Stroke({ color: '#ffffff', width: 1.8 }),
              }),
            }),
            // Pill label badge with live telemetry speed
            new Style({
              text: new Text({
                text: `${vehicleIcon} ${speed} km/j`,
                font: 'bold 9.5px Inter, system-ui, sans-serif',
                fill: new Fill({ color: '#ffffff' }),
                stroke: new Stroke({ color: '#0f172a', width: 2.2 }),
                backgroundFill: new Fill({ color: isLocal ? '#1e293b' : '#0f172a' }),
                backgroundStroke: new Stroke({ color: isLocal ? '#38bdf8' : color, width: 1.8 }),
                padding: [2.5, 6, 2.5, 6],
                offsetY: -14,
              }),
            }),
          ];
        }

        return [];
      },
    });
    trafficVectorLayerRef.current = trafficVectorLayer;

    // Initialize crowdsourced GPS density service corridors for probe simulation
    trafficGpsDensityService.setCorridors(INDONESIA_TRAFFIC_CORRIDORS);

    // Realtime Public Traffic CCTV Cameras Layer
    const trafficCctvSource = new VectorSource();
    const cctvCameras = trafficCctvService.getAllCameras();
    cctvCameras.forEach((cam) => {
      const feat = new Feature({
        geometry: new Point(fromLonLat(cam.location)),
        isTrafficCctv: true,
        cctvId: cam.id,
        cctvData: cam,
        name: cam.name,
      });
      trafficCctvSource.addFeature(feat);
    });

    const trafficCctvLayer = new VectorLayer({
      source: trafficCctvSource,
      zIndex: 26,
      visible: (activeMapBasemap === 'traffic' || showTrafficCorridors) && showTrafficCctv,
      style: (feature, resolution) => {
        const isClose = resolution < 120;
        return new Style({
          image: new CircleStyle({
            radius: isClose ? 7.5 : 5.5,
            fill: new Fill({ color: '#06b6d4' }),
            stroke: new Stroke({ color: '#0f172a', width: 2 }),
          }),
          text: isClose
            ? new Text({
                text: '📹 CCTV LIVE',
                font: 'bold 9px Inter, system-ui, sans-serif',
                fill: new Fill({ color: '#ffffff' }),
                stroke: new Stroke({ color: '#083344', width: 2 }),
                backgroundFill: new Fill({ color: '#0e7490' }),
                backgroundStroke: new Stroke({ color: '#38bdf8', width: 1 }),
                padding: [2, 4, 2, 4],
                offsetY: -13,
              })
            : undefined,
        });
      },
    });
    trafficCctvLayerRef.current = trafficCctvLayer;

    // Realtime ATCS Traffic Signals Layer
    const trafficSignalsSource = new VectorSource();
    const allSignals = trafficSignalsService.getAllSignals();
    allSignals.forEach((sig) => {
      const feat = new Feature({
        geometry: new Point(fromLonLat(sig.location)),
        isTrafficSignal: true,
        signalId: sig.id,
        signalData: sig,
        currentPhase: sig.currentPhase,
        remainingSeconds: sig.remainingSeconds,
        name: sig.name,
      });
      trafficSignalsSource.addFeature(feat);
    });

    const trafficSignalsLayer = new VectorLayer({
      source: trafficSignalsSource,
      zIndex: 25,
      visible: (activeMapBasemap === 'traffic' || showTrafficCorridors) && showTrafficSignals,
      style: (feature, resolution) => {
        const phase = (feature.get('currentPhase') as string) || 'red';
        const remaining = (feature.get('remainingSeconds') as number) || 10;
        const isClose = resolution < 120;
        const phaseColor =
          phase === 'green' ? '#10b981' : phase === 'yellow' ? '#f59e0b' : '#ef4444';

        return new Style({
          image: new CircleStyle({
            radius: isClose ? 7.5 : 5.5,
            fill: new Fill({ color: phaseColor }),
            stroke: new Stroke({ color: '#0f172a', width: 2 }),
          }),
          text: isClose
            ? new Text({
                text: `🚦 ${remaining}s`,
                font: 'bold 9px Inter, system-ui, sans-serif',
                fill: new Fill({ color: '#ffffff' }),
                stroke: new Stroke({ color: '#0f172a', width: 2 }),
                backgroundFill: new Fill({ color: '#1e293b' }),
                backgroundStroke: new Stroke({ color: phaseColor, width: 1.2 }),
                padding: [2, 4, 2, 4],
                offsetY: -13,
              })
            : undefined,
        });
      },
    });
    trafficSignalsLayerRef.current = trafficSignalsLayer;

    // Realtime Transparent Road Corridor & Live Traffic Overlay (Covers every road, artery, and street in every corner)
    const trafficOverlay = new TileLayer({
      source: new XYZ({
        urls: [
          'https://mt0.google.com/vt/lyrs=h,traffic&x={x}&y={y}&z={z}',
          'https://mt1.google.com/vt/lyrs=h,traffic&x={x}&y={y}&z={z}',
          'https://mt2.google.com/vt/lyrs=h,traffic&x={x}&y={y}&z={z}',
          'https://mt3.google.com/vt/lyrs=h,traffic&x={x}&y={y}&z={z}',
        ],
        maxZoom: 20,
      }),
      zIndex: 15,
      opacity: 0.95,
      visible: showTrafficCorridors && activeMapBasemap !== 'traffic',
    });
    trafficOverlayLayerRef.current = trafficOverlay;

    const map = new Map({
      target: containerRef.current,
      pixelRatio: perfProfile.openLayersPixelRatio,
      maxTilesLoading: perfProfile.maxTilesLoading,
      interactions: defaultInteractions({
        dragPan: false,
      }).extend([
        new DragPan({
          condition: (event) => {
            const originalEvent = event.originalEvent;
            if (originalEvent && 'pointerType' in originalEvent && originalEvent.pointerType === 'touch') {
              return true;
            }
            if (originalEvent && 'touches' in originalEvent) {
              return true;
            }
            return noModifierKeys(event) && primaryAction(event);
          },
        }),
      ]),
      layers: [
        baseTile,
        satelliteRefLayer,
        trafficOverlay,
        forestLayer,
        kabupatenLayer,
        kotaLayer,
        desaLayer,
        trafficVectorLayer,
        trafficSignalsLayer,
        trafficCctvLayer
      ],
      view: new View({
        center: fromLonLat([113.9213, -0.7893]), // Center of Indonesia
        zoom: 5,
        maxZoom: 20,
        enableRotation: true,
        constrainResolution: true,
      }),
    });

    // 2. Tectonic Layer (zIndex: 19 - diatas Windy)
    const tectonicSource = new VectorSource();
    const tectonicLayer = new VectorLayer({
      source: tectonicSource,
      renderBuffer: 20,
      style: new Style({ stroke: new Stroke({ color: '#f97316', width: 2 }) }),
      zIndex: 19,
      visible: false
    });
    tectonicLayerRef.current = tectonicLayer;
    map.addLayer(tectonicLayer);

    // 2b. Garis Khatulistiwa (Equator 0°), Garis Balik (Tropics ±23.44°), & Monumen Geodetik (zIndex: 18)
    const equatorSource = new VectorSource();
    const equatorGeoJson = seasonalIntelligenceService.getEquatorLineGeoJson();
    const tropicsGeoJson = seasonalIntelligenceService.getTropicsLinesGeoJson();
    const formatGeoJson = new GeoJSON();
    
    const equatorFeatures = formatGeoJson.readFeatures(equatorGeoJson, {
      featureProjection: 'EPSG:3857'
    });
    const tropicsFeatures = formatGeoJson.readFeatures(tropicsGeoJson, {
      featureProjection: 'EPSG:3857'
    });
    equatorSource.addFeatures([...equatorFeatures, ...tropicsFeatures]);

    // Tambahkan titik monumen Tugu Khatulistiwa bersejarah
    EQUATOR_MONUMENTS.forEach((mon) => {
      const feat = new Feature({
        geometry: new Point(fromLonLat([mon.lng, mon.lat])),
        name: mon.name,
        type: 'monument',
        location: mon.location,
        country: mon.country,
        description: mon.description,
      });
      equatorSource.addFeature(feat);
    });

    const equatorLayer = new VectorLayer({
      source: equatorSource,
      renderBuffer: 20,
      zIndex: 18,
      visible: showEquatorZones,
      style: (feature) => {
        const type = feature.get('type') || '';
        const name = feature.get('name') || '';

        if (type === 'monument') {
          return new Style({
            image: new CircleStyle({
              radius: 5.5,
              fill: new Fill({ color: '#f59e0b' }),
              stroke: new Stroke({ color: '#ffffff', width: 2 })
            }),
            text: new Text({
              text: name,
              font: 'bold 10px system-ui, sans-serif',
              offsetY: -14,
              fill: new Fill({ color: '#fbbf24' }),
              stroke: new Stroke({ color: '#0f172a', width: 3 }),
              padding: [2, 4, 2, 4]
            })
          });
        }

        if (type === 'tropic_cancer') {
          return new Style({
            stroke: new Stroke({
              color: '#10b981', // Emerald Hijau untuk Garis Balik Utara
              width: 1.3, // Lebih tipis
              lineDash: [6, 4],
            }),
            text: new Text({
              text: "GARIS BALIK UTARA (TROPIC OF CANCER +23.44°)",
              font: 'bold 9px system-ui, sans-serif',
              offsetY: -8,
              placement: 'line',
              repeat: 750,
              fill: new Fill({ color: '#34d399' }),
              stroke: new Stroke({ color: '#022c22', width: 2.5 }),
            })
          });
        }

        if (type === 'tropic_capricorn') {
          return new Style({
            stroke: new Stroke({
              color: '#06b6d4', // Cyan Biru untuk Garis Balik Selatan
              width: 1.3, // Lebih tipis
              lineDash: [6, 4],
            }),
            text: new Text({
              text: "GARIS BALIK SELATAN (TROPIC OF CAPRICORN -23.44°)",
              font: 'bold 9px system-ui, sans-serif',
              offsetY: 9,
              placement: 'line',
              repeat: 750,
              fill: new Fill({ color: '#22d3ee' }),
              stroke: new Stroke({ color: '#083344', width: 2.5 }),
            })
          });
        }

        // Garis Khatulistiwa (Equator 0.0000°)
        return new Style({
          stroke: new Stroke({
            color: '#f59e0b', // Emas Kuning Hangat
            width: 1.8, // Lebih tipis (sebelumnya 3.2)
            lineDash: [8, 5],
          }),
          text: new Text({
            text: "GARIS KHATULISTIWA (EQUATOR 0°00'00\")",
            font: 'bold 10px system-ui, sans-serif',
            offsetY: -10,
            placement: 'line',
            repeat: 600,
            fill: new Fill({ color: '#fef08a' }),
            stroke: new Stroke({ color: '#451a03', width: 2.5 }),
          })
        });
      }
    });
    equatorLayerRef.current = equatorLayer;
    map.addLayer(equatorLayer);

    // Native Weather Tile Layer (Rendered directly in OpenLayers for 100% synchronized panning/zooming)
    const weatherTile = new TileLayer({
      zIndex: 16,
      opacity: 0.85,
      visible: false,
    });
    weatherTileLayerRef.current = weatherTile;
    map.addLayer(weatherTile);

    // Earth Sensor Registry & Multi-Hazard Network (10 Families, Global & Indonesia)
    const tsunamiSensorsSource = new VectorSource();
    GLOBAL_EARTH_SENSOR_NETWORK.forEach((sensor) => {
      const feat = new Feature({
        geometry: new Point(fromLonLat([sensor.lng, sensor.lat])),
        isEarthSensor: true,
        isTsunamiSensor: sensor.family === 'OCEAN_HYDROLOGY',
        sensorData: sensor,
        id: sensor.id,
        name: sensor.name,
        code: sensor.code,
        family: sensor.family,
        subCategory: sensor.subCategory,
        platform: sensor.platform,
        provider: sensor.provider,
        country: sensor.country,
        flag: sensor.flag,
        status: sensor.status,
        samplingRate: sensor.samplingRate,
        primaryMeasurement: sensor.primaryMeasurement,
        unit: sensor.unit,
        currentValue: sensor.currentValue,
        accuracy: sensor.accuracy,
        coverage: sensor.coverage,
        disasterRelevance: sensor.disasterRelevance,
        description: sensor.description,
        lastPing: sensor.lastPing,
        telemetryType: sensor.telemetryType,
      });
      tsunamiSensorsSource.addFeature(feat);
    });

    const tsunamiSensorsLayer = new VectorLayer({
      source: tsunamiSensorsSource,
      zIndex: 28,
      visible: showTsunamiSensors,
      style: (feature) => {
        const family = (feature.get('family') as SensorFamily) || 'OCEAN_HYDROLOGY';
        const meta = SENSOR_FAMILY_META[family];
        const baseColor = meta?.colorHex || '#0284c7';
        const isAlert = feature.get('status') === 'ALERT';

        return [
          new Style({
            image: new CircleStyle({
              radius: isAlert ? 14 : 11,
              fill: new Fill({ color: `${baseColor}33` }),
              stroke: new Stroke({ color: baseColor, width: isAlert ? 2 : 1.5 }),
            }),
            zIndex: 1,
          }),
          new Style({
            image: new CircleStyle({
              radius: isAlert ? 5.5 : 4.5,
              fill: new Fill({ color: isAlert ? '#ef4444' : baseColor }),
              stroke: new Stroke({ color: '#ffffff', width: 1.5 }),
            }),
            zIndex: 2,
          }),
        ];
      },
    });
    tsunamiSensorsLayerRef.current = tsunamiSensorsLayer;
    map.addLayer(tsunamiSensorsLayer);

    // Observation Coverage & Blank Spot Layer (zIndex: 20)
    const obsCoverageSource = new VectorSource();
    
    // Add 45 BMKG radar stations with High (<20km), Moderate (20-60km), and Max Range (150km) coverage
    BMKG_DOPPLER_RADAR_NETWORK.forEach((radar) => {
      const centerCoord = fromLonLat([radar.lng, radar.lat]);

      // 1. High Coverage (< 20 km) - Emerald fill
      const highCoverageFeat = new Feature({
        geometry: new CircleGeom(centerCoord, 20000),
        isCoverageZone: true,
        zoneType: 'high',
        radarData: radar,
        name: `Cakupan Tinggi (< 20 km): ${radar.name}`,
      });
      obsCoverageSource.addFeature(highCoverageFeat);

      // 2. Moderate Coverage (20 - 60 km) - Amber fill
      const modCoverageFeat = new Feature({
        geometry: new CircleGeom(centerCoord, 60000),
        isCoverageZone: true,
        zoneType: 'moderate',
        radarData: radar,
        name: `Cakupan Sedang (20 - 60 km): ${radar.name}`,
      });
      obsCoverageSource.addFeature(modCoverageFeat);

      // 3. Max Sweep Range (120-150 km) - Cyan dashed border
      const maxRangeFeat = new Feature({
        geometry: new CircleGeom(centerCoord, radar.rangeKm * 1000),
        isCoverageZone: true,
        zoneType: 'max_range',
        radarData: radar,
        name: `Jangkauan Maksimal (${radar.rangeKm} km): ${radar.name}`,
      });
      obsCoverageSource.addFeature(maxRangeFeat);

      // 4. Center Station Point (Doppler Radar Pin)
      const stationFeat = new Feature({
        geometry: new Point(centerCoord),
        isRadarStation: true,
        radarData: radar,
        name: radar.name,
      });
      obsCoverageSource.addFeature(stationFeat);
    });

    // Add Blank Spot Zones
    BMKG_BLANK_SPOT_ZONES.forEach((spot) => {
      const centerCoord = fromLonLat(spot.center);
      const blankSpotFeat = new Feature({
        geometry: new CircleGeom(centerCoord, spot.radiusKm * 1000),
        isBlankSpotZone: true,
        spotData: spot,
        name: spot.name,
      });
      obsCoverageSource.addFeature(blankSpotFeat);

      const markerFeat = new Feature({
        geometry: new Point(centerCoord),
        isBlankSpotMarker: true,
        spotData: spot,
        name: spot.name,
      });
      obsCoverageSource.addFeature(markerFeat);
    });

    const observationCoverageLayer = new VectorLayer({
      source: obsCoverageSource,
      zIndex: 20,
      visible: showObservationCoverage,
      style: (feature, resolution) => {
        const isCoverage = feature.get('isCoverageZone');
        const isRadar = feature.get('isRadarStation');
        const isBlankZone = feature.get('isBlankSpotZone');
        const isBlankMarker = feature.get('isBlankSpotMarker');

        if (isCoverage) {
          const zoneType = feature.get('zoneType');
          if (zoneType === 'high') {
            return new Style({
              fill: new Fill({ color: 'rgba(16, 185, 129, 0.16)' }),
              stroke: new Stroke({ color: 'rgba(16, 185, 129, 0.75)', width: 1.5 }),
            });
          }
          if (zoneType === 'moderate') {
            return new Style({
              fill: new Fill({ color: 'rgba(245, 158, 11, 0.07)' }),
              stroke: new Stroke({ color: 'rgba(245, 158, 11, 0.65)', width: 1.2, lineDash: [6, 4] }),
            });
          }
          if (zoneType === 'max_range') {
            return new Style({
              stroke: new Stroke({ color: 'rgba(6, 182, 212, 0.35)', width: 1, lineDash: [8, 6] }),
            });
          }
        }

        if (isRadar) {
          const radar = feature.get('radarData') as DopplerRadarStation;
          return [
            new Style({
              image: new CircleStyle({
                radius: 6,
                fill: new Fill({ color: '#10b981' }),
                stroke: new Stroke({ color: '#ffffff', width: 2.2 }),
              }),
            }),
            new Style({
              text: new Text({
                text: resolution < 1500 ? `📡 ${radar.code} (${radar.city})` : '📡',
                font: 'bold 10px Inter, system-ui, sans-serif',
                fill: new Fill({ color: '#ffffff' }),
                stroke: new Stroke({ color: '#064e3b', width: 2.5 }),
                offsetY: -13,
                backgroundFill: new Fill({ color: 'rgba(6, 78, 59, 0.85)' }),
                padding: [2, 5, 2, 5],
              }),
            }),
          ];
        }

        if (isBlankZone) {
          return new Style({
            fill: new Fill({ color: 'rgba(244, 63, 94, 0.14)' }),
            stroke: new Stroke({ color: '#f43f5e', width: 2, lineDash: [8, 5] }),
          });
        }

        if (isBlankMarker) {
          const spot = feature.get('spotData') as BlankSpotZone;
          return [
            new Style({
              image: new CircleStyle({
                radius: 6.5,
                fill: new Fill({ color: '#f43f5e' }),
                stroke: new Stroke({ color: '#ffffff', width: 2.2 }),
              }),
            }),
            new Style({
              text: new Text({
                text: `⚠️ Blank Spot: ${spot.name.replace('Zona Kesenjangan ', '').replace('Kawasan Blank Spot ', '')}`,
                font: 'bold 10px Inter, system-ui, sans-serif',
                fill: new Fill({ color: '#ffffff' }),
                stroke: new Stroke({ color: '#881337', width: 2.5 }),
                offsetY: -14,
                backgroundFill: new Fill({ color: 'rgba(136, 19, 55, 0.85)' }),
                padding: [2, 6, 2, 6],
              }),
            }),
          ];
        }

        return [];
      },
    });
    observationCoverageLayerRef.current = observationCoverageLayer;
    map.addLayer(observationCoverageLayer);

    // Route Polyline Layer (zIndex: 35)
    const routeSource = new VectorSource();
    const routeLayer = new VectorLayer({
      source: routeSource,
      zIndex: 35,
      style: (feature) => {
        const geom = feature.getGeometry();
        if (geom && geom.getType() === 'Point') {
          const isEnd = feature.get('isRouteEnd');
          return new Style({
            image: new CircleStyle({
              radius: 9,
              fill: new Fill({ color: isEnd ? '#ef4444' : '#10b981' }),
              stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
            }),
            text: new Text({
              text: isEnd ? '🏁 Tujuan' : '🟢 Asal',
              offsetY: -16,
              font: 'bold 11px Inter, sans-serif',
              fill: new Fill({ color: '#0f172a' }),
              stroke: new Stroke({ color: '#ffffff', width: 3 }),
            }),
            zIndex: 40,
          });
        }
        return new Style({
          stroke: new Stroke({
            color: '#06b6d4',
            width: 5,
          }),
        });
      },
    });
    routeLayerRef.current = routeLayer;
    map.addLayer(routeLayer);

    // User GPS Marker Layer with precision accuracy ring & glowing beacon (zIndex: 45)
    const userMarkerSource = new VectorSource();
    const userMarkerLayer = new VectorLayer({
      source: userMarkerSource,
      zIndex: 45,
      style: (feature) => {
        if (feature.get('isAccuracyCircle')) {
          return new Style({
            fill: new Fill({ color: 'rgba(59, 130, 246, 0.12)' }),
            stroke: new Stroke({ color: 'rgba(59, 130, 246, 0.55)', width: 1.5, lineDash: [5, 5] })
          });
        }
        return [
          new Style({
            image: new CircleStyle({
              radius: 14,
              fill: new Fill({ color: 'rgba(37, 99, 235, 0.25)' }),
            }),
            zIndex: 1,
          }),
          new Style({
            image: new CircleStyle({
              radius: 7,
              fill: new Fill({ color: '#2563eb' }),
              stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
            }),
            zIndex: 2,
          }),
        ];
      },
    });
    userMarkerLayerRef.current = userMarkerLayer;
    map.addLayer(userMarkerLayer);

    // 3. Earthquakes Layer (zIndex: 25)
    const eqSource = new VectorSource();
    const eqLayer = new VectorLayer({
      source: eqSource,
      style: (feature) => {
        const mag = feature.get('mag') || 0;
        const baseRadius = Math.max(3, mag * 1.5);
        
        const time = Date.now();
        const cycle = (time % 2000) / 2000;
        const pulseRadius = baseRadius + (cycle * 15);
        const opacity = 1 - cycle;

        return [
           new Style({
             image: new CircleStyle({
               radius: baseRadius,
               fill: new Fill({ color: 'rgba(239, 68, 68, 0.8)' }),
               stroke: new Stroke({ color: '#ef4444', width: 1 })
             })
           }),
           new Style({
             image: new CircleStyle({
               radius: pulseRadius,
               fill: new Fill({ color: `rgba(239, 68, 68, ${opacity * 0.4})` }),
               stroke: new Stroke({ color: `rgba(239, 68, 68, ${opacity})`, width: 1.5 })
             })
           })
        ];
      },
      zIndex: 25,
      visible: false
    });
    earthquakeLayerRef.current = eqLayer;
    map.addLayer(eqLayer);

    // 3b. Satellite Thermal Anomaly & Fire Hotspots Layer (God's Eye View Thermal Sensor)
    const hotspotSource = new VectorSource();
    const hotspotLayer = new VectorLayer({
      source: hotspotSource,
      zIndex: 26,
      style: (feature) => {
        const tempC = feature.get('brightnessCelsius') ?? (feature.get('brightnessKelvin') ? Math.round(feature.get('brightnessKelvin') - 273.15) : 48);
        const frp = feature.get('frpMw') || 10;
        const isHighIntensity = tempC > 55 || frp > 35;
        const haloColor = isHighIntensity ? 'rgba(239, 68, 68, 0.4)' : 'rgba(249, 115, 22, 0.35)';
        const coreColor = isHighIntensity ? '#ef4444' : '#f97316';
        const baseRadius = Math.min(14, Math.max(7, Math.round(frp / 6) + 6));

        return [
          new Style({
            image: new CircleStyle({
              radius: baseRadius + 6,
              fill: new Fill({ color: haloColor }),
              stroke: new Stroke({ color: coreColor, width: 1.5 }),
            }),
          }),
          new Style({
            image: new CircleStyle({
              radius: baseRadius,
              fill: new Fill({ color: coreColor }),
              stroke: new Stroke({ color: '#ffffff', width: 2 }),
            }),
            text: new Text({
              text: `${tempC}°C`,
              font: 'bold 10px monospace',
              fill: new Fill({ color: '#ffffff' }),
              stroke: new Stroke({ color: '#0f172a', width: 2.5 }),
              offsetY: baseRadius + 10,
            }),
          }),
        ];
      },
      visible: true,
    });
    hotspotLayerRef.current = hotspotLayer;
    map.addLayer(hotspotLayer);

    const popupOverlay = new Overlay({
      element: popupRef.current!,
      positioning: 'bottom-center',
      stopEvent: false,
      offset: [0, -10]
    });
    map.addOverlay(popupOverlay);
    popupOverlayRef.current = popupOverlay;

    // 4. Mountains Layer (zIndex: 22)
    const mountainSource = new VectorSource();
    const mountainLayer = new VectorLayer({
      source: mountainSource,
      zIndex: 22,
      style: (feature) => {
        const type = feature.get('type');
        const status = feature.get('status');
        let color = '#94a3b8';
        let zIndex = 1;
        if (type === 'volcano') {
          if (status === 'Active') {
            color = '#ef4444';
            zIndex = 3;
          } else {
            color = '#f97316';
            zIndex = 2;
          }
        }
        return new Style({
          image: new RegularShape({
            fill: new Fill({ color }),
            stroke: new Stroke({ color: 'white', width: 1 }),
            points: 3,
            radius: type === 'volcano' && status === 'Active' ? 8 : 6,
            angle: 0,
          }),
          zIndex
        });
      }
    });
    vectorLayerRef.current = mountainLayer;
    map.addLayer(mountainLayer);

    // 5. Schools Layer (zIndex: 30)
    const schoolsSource = new VectorSource();
    const schoolsLayer = new VectorLayer({
      source: schoolsSource,
      zIndex: 30,
      style: (feature, resolution) => {
        const cat = feature.get('cat');
        if (cat === 2) return styleSD;
        if (cat === 3) return styleSMP;
        return styleSMA;
      }
    });
    schoolsLayerRef.current = schoolsLayer;
    map.addLayer(schoolsLayer);

    // 6. Active School Layer (zIndex: 32)
    const activeSchoolSource = new VectorSource();
    const activeSchoolLayer = new VectorLayer({
      source: activeSchoolSource,
      style: styleActiveSchool,
      zIndex: 32
    });
    activeSchoolLayerRef.current = activeSchoolLayer;
    map.addLayer(activeSchoolLayer);

    // 7. Spatial Analysis Layer (zIndex: 48)
    const analysisLayer = new VectorLayer({
      source: analysisSourceRef.current,
      zIndex: 48,
      visible: showAnalysisLayer,
      opacity: analysisLayerOpacity,
    });
    analysisLayerRef.current = analysisLayer;
    map.addLayer(analysisLayer);

    // 8. Zona Kerentanan Gerakan Tanah & Longsor (PVMBG) (zIndex: 22)
    const landslideSource = new VectorSource();
    LANDSLIDE_SUSCEPTIBILITY_ZONES.forEach((zone) => {
      const centerMercator = fromLonLat([zone.lng, zone.lat]);
      const radiusMeters = zone.radiusKm * 1000;
      const circleGeom = new CircleGeom(centerMercator, radiusMeters);
      const polygonGeom = fromCircle(circleGeom, 32);

      const feat = new Feature({
        geometry: polygonGeom,
        id: zone.id,
        name: zone.name,
        type: 'landslide_hazard_zone',
        riskLevel: zone.riskLevel,
        slope: zone.slope,
        triggerFactor: zone.triggerFactor,
        pvmbgCriteria: zone.pvmbgCriteria,
        affectedSchoolsSample: zone.affectedSchoolsSample,
      });
      landslideSource.addFeature(feat);
    });

    const landslideLayer = new VectorLayer({
      source: landslideSource,
      renderBuffer: 20,
      zIndex: 22,
      visible: showLandslideZones,
      style: (feature) => {
        const risk = feature.get('riskLevel');
        const color = risk === 'SANGAT_TINGGI' 
          ? 'rgba(225, 29, 72, 0.28)' 
          : risk === 'TINGGI' 
          ? 'rgba(234, 88, 12, 0.28)' 
          : 'rgba(234, 179, 8, 0.25)';
        const strokeColor = risk === 'SANGAT_TINGGI' 
          ? '#e11d48' 
          : risk === 'TINGGI' 
          ? '#ea580c' 
          : '#eab308';
        return new Style({
          fill: new Fill({ color }),
          stroke: new Stroke({ color: strokeColor, width: 2, lineDash: [5, 4] }),
          text: new Text({
            text: `⚠️ ${feature.get('name')}`,
            font: 'bold 10px system-ui, sans-serif',
            fill: new Fill({ color: strokeColor }),
            stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
          })
        });
      }
    });
    landslideLayerRef.current = landslideLayer;
    map.addLayer(landslideLayer);

    // 9. Zona Inundasi Tsunami Pesisir (InaTEWS) (zIndex: 23)
    const tsunamiSource = new VectorSource();
    TSUNAMI_HAZARD_ZONES.forEach((zone) => {
      const centerMercator = fromLonLat([zone.lng, zone.lat]);
      const radiusMeters = zone.bufferKm * 1000;
      const circleGeom = new CircleGeom(centerMercator, radiusMeters);
      const polygonGeom = fromCircle(circleGeom, 32);

      const feat = new Feature({
        geometry: polygonGeom,
        id: zone.id,
        name: zone.name,
        type: 'tsunami_hazard_zone',
        megathrustSegment: zone.megathrustSegment,
        estimatedArrivalTimeMin: zone.estimatedArrivalTimeMin,
        maxRunupM: zone.maxRunupM,
        evacuationOrder: zone.evacuationOrder,
      });
      tsunamiSource.addFeature(feat);
    });

    const tsunamiLayer = new VectorLayer({
      source: tsunamiSource,
      renderBuffer: 20,
      zIndex: 23,
      visible: showTsunamiZones,
      style: (feature) => {
        return new Style({
          fill: new Fill({ color: 'rgba(2, 132, 199, 0.28)' }),
          stroke: new Stroke({ color: '#0284c7', width: 2.2, lineDash: [6, 3] }),
          text: new Text({
            text: `🌊 ${feature.get('name')} (Golden: ${feature.get('estimatedArrivalTimeMin')}m)`,
            font: 'bold 10px system-ui, sans-serif',
            fill: new Fill({ color: '#0369a1' }),
            stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
          })
        });
      }
    });
    tsunamiLayerRef.current = tsunamiLayer;
    map.addLayer(tsunamiLayer);

    mapRef.current = map;
    setMapReady(true);

    const viewport = map.getViewport();
    if (viewport) {
      viewport.style.touchAction = 'none';
      viewport.style.userSelect = 'none';
      viewport.style.webkitUserSelect = 'none';
    }

    const mapEl = containerRef.current;
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && e.cancelable) {
        e.preventDefault();
      }
    };
    if (mapEl) {
      mapEl.addEventListener('touchmove', handleTouchMove, { passive: false });
    }

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.updateSize();
        }
      });
      resizeObserver.observe(containerRef.current);
    }

    const t1 = setTimeout(() => { map.updateSize(); }, 100);
    const t2 = setTimeout(() => { map.updateSize(); }, 400);
    const t3 = setTimeout(() => { map.updateSize(); }, 1000);

    const unsubPerf = hardwarePerformanceService.subscribe(() => {
      if (mapRef.current) {
        mapRef.current.updateSize();
      }
    });

    return () => {
      if (mapEl) {
        mapEl.removeEventListener('touchmove', handleTouchMove);
      }
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      resizeObserver?.disconnect();
      unsubPerf();
      map.setTarget(undefined);
      mapRef.current = null;
      setMapReady(false);
      vectorLayerRef.current = null;
      schoolsLayerRef.current = null;
      activeSchoolLayerRef.current = null;
      analysisLayerRef.current = null;
      tectonicLayerRef.current = null;
      earthquakeLayerRef.current = null;
      hotspotLayerRef.current = null;
      weatherTileLayerRef.current = null;
      tsunamiSensorsLayerRef.current = null;
      equatorLayerRef.current = null;
      observationCoverageLayerRef.current = null;
      landslideLayerRef.current = null;
      tsunamiLayerRef.current = null;
    };
  }, []);

  // Auto switch back to 3D Globe when zooming out in 2D below country level (zoom <= 3.5), strictly guarded on TV & low-power devices
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const view = map.getView();

    let switchingTo3D = false;
    const handleResolutionChange = () => {
      if (is3D || switchingTo3D || mapMode !== 'spatial' || isTV || !canRun3D) return;
      const curZoom = view.getZoom();
      if (curZoom !== undefined && curZoom <= 3.5) {
        switchingTo3D = true;
        const center = view.getCenter();
        if (center) {
          const [lng, lat] = toLonLat(center);
          setGlobeInitialCenter({ lat, lng });
          setGlobeInitialZoom(curZoom);
        }
        // Set 2D zoom to 5 for clean state when returned
        view.setZoom(5);
        handleToggle3D(true);
        handleSetGlobeType('globe');
        setTimeout(() => {
          switchingTo3D = false;
        }, 1000);
      }
    };

    view.on('change:resolution', handleResolutionChange);
    return () => {
      view.un('change:resolution', handleResolutionChange);
    };
  }, [mapReady, is3D, mapMode, isTV, canRun3D]);

  // Android TV & Hardware Remote Control Navigation (D-Pad Arrow Keys, Zoom +/-)
  useEffect(() => {
    if (!mapReady) return;
    const handleTvKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toUpperCase();
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
        return;
      }

      const map = mapRef.current;
      if (!map) return;
      const view = map.getView();
      if (!view) return;

      const currentCenter = view.getCenter();
      if (!currentCenter) return;

      const res = view.getResolution() || 100;
      const panStep = res * 150;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          view.animate({ center: [currentCenter[0], currentCenter[1] + panStep], duration: 180 });
          break;
        case 'ArrowDown':
          e.preventDefault();
          view.animate({ center: [currentCenter[0], currentCenter[1] - panStep], duration: 180 });
          break;
        case 'ArrowLeft':
          e.preventDefault();
          view.animate({ center: [currentCenter[0] - panStep, currentCenter[1]], duration: 180 });
          break;
        case 'ArrowRight':
          e.preventDefault();
          view.animate({ center: [currentCenter[0] + panStep, currentCenter[1]], duration: 180 });
          break;
        case '+':
        case '=':
        case 'PageUp': {
          e.preventDefault();
          const z = view.getZoom() || 5;
          view.animate({ zoom: Math.min(z + 1, 20), duration: 200 });
          break;
        }
        case '-':
        case '_':
        case 'PageDown': {
          e.preventDefault();
          const z = view.getZoom() || 5;
          view.animate({ zoom: Math.max(z - 1, 3), duration: 200 });
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleTvKeyDown);
    return () => {
      window.removeEventListener('keydown', handleTvKeyDown);
    };
  }, [mapReady]);

  // Render Mountains Layer
  useEffect(() => {
    if (!mapReady || mountains.length === 0 || !vectorLayerRef.current) return;

    const source = vectorLayerRef.current.getSource();
    if (!source) return;

    source.clear();
    const features: Feature[] = [];
    
    for (const m of mountains) {
      if (m.type === 'volcano' && m.status === 'Active' && !showActive) continue;
      if (m.type === 'volcano' && m.status !== 'Active' && !showInactive) continue;
      if (m.type === 'peak' && !showPeaks) continue;
      
      const feature = new Feature({
        geometry: new Point(fromLonLat([m.lng, m.lat])),
        name: m.name,
        type: m.type,
        status: m.status,
        elevation: m.elevation,
        isMountain: true,
        mountainData: m,
      });
      features.push(feature);
    }
    source.addFeatures(features);
  }, [mapReady, mountains, showActive, showInactive, showPeaks]);

  // Render Schools Layer (Dynamic BBox Filtering)
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || schools.length === 0 || !schoolsLayerRef.current || !activeSchoolLayerRef.current) return;

    const vectorSource = schoolsLayerRef.current.getSource();
    const activeSource = activeSchoolLayerRef.current.getSource();
    if (!vectorSource || !activeSource) return;

    // Function to only render schools inside the camera view
      const updateVisibleSchools = () => {
        const view = map.getView();
        const zoom = view.getZoom() || 0;
        
        // Don't render schools if zoomed out too far (to save performance)
        if (zoom < 8) {
          vectorSource.clear();
          return;
        }

        // If no school layer is activated, clear immediately and skip 200k array processing
        if (!showSD && !showSMP && !showSMA) {
          vectorSource.clear();
          return;
        }

        const extent = view.calculateExtent(map.getSize());
        const lonLatExtent = transformExtent(extent, 'EPSG:3857', 'EPSG:4326');
        const [minLng, minLat, maxLng, maxLat] = lonLatExtent;

        const features: Feature[] = [];
        const activeFeatures: Feature[] = [];
        
        // Fast math filter loop (only generate OpenLayers Features for visible schools)
        for (const s of schools) {
          const id = s[0];
          const lat = s[1];
          const lng = s[2];
          const cat = s[3]; // 1=TK, 2=SD, 3=SMP, 4=SMA, 0=Other
          
          if (cat === 1) continue; // Skip TK entirely
          
          const isActiveSchool = (id === userSchoolId);
          if (!isActiveSchool) {
            if (cat === 2 && !showSD) continue;
            if (cat === 3 && !showSMP) continue;
            if ((cat === 4 || cat === 0) && !showSMA) continue;
          }
          
          // BBox check
          if (lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat) {
            const feature = new Feature({
              geometry: new Point(fromLonLat([lng, lat])),
              name: s[4],
              id: id,
              cat: cat,
              isActiveSchool,
              isSchool: true
            });
            
            if (isActiveSchool) {
              activeFeatures.push(feature);
            } else {
              features.push(feature);
            }
          }
        }
        
        vectorSource.clear();
        vectorSource.addFeatures(features);
        
        activeSource.clear();
        activeSource.addFeatures(activeFeatures);
      };

      // Call once initially
      updateVisibleSchools();
      
      // Call every time the map moves
      map.on('moveend', updateVisibleSchools);

      return () => {
        map.un('moveend', updateVisibleSchools);
      };
  }, [mapReady, schools, userSchoolId, showSD, showSMP, showSMA]);

  // Update Schools Style dynamically (Fast Toggle without object recreation)
  useEffect(() => {
    if (!schoolsLayerRef.current) return;
    
    schoolsLayerRef.current.setStyle((feature, resolution) => {
      const cat = feature.get('cat');
      
      // Fast Filtering
      if (cat === 2 && !showSD) return [];
      if (cat === 3 && !showSMP) return [];
      if ((cat === 4 || cat === 0) && !showSMA) return [];

      if (cat === 2) return styleSD;
      if (cat === 3) return styleSMP;
      return styleSMA;
    });
  }, [showSD, showSMP, showSMA, schools]);

  // ================= LAYER UPDATES (TECTONIC & ATMOSPHERE) ================= //
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    
    // Auto-zoom out if user activates global layers while zoomed in too close
    if (showTectonic || showEarthquakes) {
      const currentZoom = map.getView().getZoom() || 0;
      if (currentZoom > 7) {
        map.getView().animate({ zoom: 5, duration: 1000 });
      }
    }

    // Tectonic Plates
    if (tectonicLayerRef.current) {
      const source = tectonicLayerRef.current.getSource();
      if (showTectonic && source && source.getFeatures().length === 0) {
        setActiveLayerLoads(prev => prev + 1);
        fetch('/data/tectonic-plates.json')
          .then(r => r.json())
          .then(data => {
            const features = new GeoJSON().readFeatures(data, { featureProjection: 'EPSG:3857' });
            source.addFeatures(features);
          })
          .catch(console.error)
          .finally(() => setActiveLayerLoads(prev => Math.max(0, prev - 1)));
      }
      tectonicLayerRef.current.setVisible(showTectonic);
    }

    // Earthquakes USGS + BMKG Shared Snapshot (Animated Pulsing)
    if (earthquakeLayerRef.current) {
      const source = earthquakeLayerRef.current.getSource();
      if (showEarthquakes && source) {
        source.clear();
        const records = quakeSnapshot?.records || [];
        const features = records.map((q) => {
          return new Feature({
            geometry: new Point(fromLonLat([q.lng, q.lat])),
            id: q.id,
            name: q.name,
            mag: q.mag,
            depth: q.depth,
            place: q.place,
            time: q.time,
            felt: q.felt,
            source: q.source,
            monitoringSource: q.monitoringSource,
            visualSummary: q.visualSummary,
            isEarthquake: true,
            earthquakeData: q,
          });
        });
        source.addFeatures(features);
      }

      earthquakeLayerRef.current.setVisible(showEarthquakes);

      // Animation Loop (paused when 3D globe or Geospatial Studio is active to prevent lag)
      if (showEarthquakes && !(is3D && (globeType === 'globe' || globeType === 'cesium')) && !showGeospatialModal) {
        let lastRender = 0;
        const animateEq = (timestamp: number) => {
          if (earthquakeLayerRef.current?.getVisible() && !(is3D && (globeType === 'globe' || globeType === 'cesium')) && !showGeospatialModal) {
            if (timestamp - lastRender >= 100) {
              earthquakeLayerRef.current.changed();
              lastRender = timestamp;
            }
            eqAnimIdRef.current = requestAnimationFrame(animateEq);
          }
        };
        if (eqAnimIdRef.current) cancelAnimationFrame(eqAnimIdRef.current);
        eqAnimIdRef.current = requestAnimationFrame(animateEq);
      } else {
        if (eqAnimIdRef.current) cancelAnimationFrame(eqAnimIdRef.current);
      }
    }

    if (landslideLayerRef.current) {
      landslideLayerRef.current.setVisible(showLandslideZones);
    }
    if (tsunamiLayerRef.current) {
      tsunamiLayerRef.current.setVisible(showTsunamiZones);
    }

  }, [showTectonic, showEarthquakes, showLandslideZones, showTsunamiZones, is3D, globeType, quakeSnapshot, showGeospatialModal]);

  // Satellite Thermal Anomaly & Fire Hotspots Sync (OpenLayers 2D)
  useEffect(() => {
    if (!hotspotLayerRef.current) return;
    const source = hotspotLayerRef.current.getSource();
    if (source) {
      source.clear();
      if (showHotspots) {
        const records = hotspotSnapshot?.records || hotspots || [];
        const features = records.map((h) => {
          return new Feature({
            geometry: new Point(fromLonLat([h.lng, h.lat])),
            id: h.id,
            latitude: h.lat,
            longitude: h.lng,
            brightnessCelsius: h.brightnessCelsius,
            brightnessKelvin: h.brightnessKelvin,
            frpMw: h.frpMw,
            confidence: h.confidence,
            satellite: h.satellite,
            instrument: h.instrument,
            acqDate: h.acqDate,
            acqTime: h.acqTime,
            dayNight: h.dayNight,
            isHotspot: true,
            hotspotData: h,
          });
        });
        source.addFeatures(features);
      }
    }
    hotspotLayerRef.current.setVisible(showHotspots);
  }, [showHotspots, hotspotSnapshot, hotspots]);

  
  // ================= LAYER UPDATES (ADMIN & LANDUSE BOUNDARIES) ================= //
  
  // The SVG is fully static and already loaded via ImageStatic!
  // No dynamic overpass querying is needed for Forests anymore, saving massive bandwidth and RAM.

  // Toggle Visibility for Admin & Landuse Boundaries
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    
    // Update Visibility immediately
    if (forestLayerRef.current) forestLayerRef.current.setVisible(showForests);
    if (kotaLayerRef.current) kotaLayerRef.current.setVisible(showKota);
    if (kabupatenLayerRef.current) kabupatenLayerRef.current.setVisible(showKabupaten);
    if (desaLayerRef.current) desaLayerRef.current.setVisible(showDesa);
  }, [showForests, showKota, showKabupaten, showDesa]);


  // Handle Interactions (Hover & Click)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // We removed pointermove (hover) because hit-testing 200,000 points 60 times a second
    // completely freezes the browser thread. Clicks will still work.

    const handleClick = (e: any) => {
      if (isPickingRouteLocationRef.current && e.coordinate) {
        const coords = toLonLat(e.coordinate);
        const lng = coords[0];
        const lat = coords[1];
        preciseGeocodingService.reverseGeocode(lat, lng).then((info) => {
          const label = info.shortDisplay || `Titik Koordinat (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`;
          setPickedRouteDestination({ lat, lng, label });
          setIsPickingRouteLocation(false);
          setShowRouteModal(true);
        });
        return;
      }

      const feature = map.forEachFeatureAtPixel(
        e.pixel,
        (f) => f,
        { 
          hitTolerance: 5, 
          layerFilter: (layer) => 
            layer === vectorLayerRef.current || 
            layer === earthquakeLayerRef.current ||
            layer === hotspotLayerRef.current ||
            layer === schoolsLayerRef.current || 
            layer === activeSchoolLayerRef.current ||
            layer === userMarkerLayerRef.current ||
            layer === tsunamiSensorsLayerRef.current ||
            layer === trafficVectorLayerRef.current ||
            layer === trafficCctvLayerRef.current ||
            layer === trafficSignalsLayerRef.current ||
            layer === equatorLayerRef.current ||
            layer === observationCoverageLayerRef.current
        }
      );
      if (feature) {
        const geom = feature.getGeometry();
        const coords =
          geom && geom.getType() === 'Point'
            ? (geom as Point).getCoordinates()
            : (e.coordinate || fromLonLat([113.9213, -0.7893]));
        
        if (popupOverlayRef.current && popupRef.current) {
          if (feature.get('isSchool')) {
            popupRef.current.innerHTML = `
              <div style="min-width: 160px; font-family: Inter, sans-serif;" class="p-1 relative">
                  <button id="close-popup-btn" style="position: absolute; top: -2px; right: -2px; background: #f1f5f9; border-radius: 50%; padding: 2px; border: none; cursor: pointer; color: #94a3b8;">✖</button>
                  <strong style="font-size: 13px; color: #1e293b; display: block; margin-bottom: 4px; padding-right: 16px;">${feature.get('name')}</strong>
                  <span style="font-size: 11px; color: #64748b; display: block;">${feature.get('isActiveSchool') ? '🌟 Your School' : 'School'}</span>
              </div>
            `;
            // Add a button dynamically
            const btn = document.createElement('button');
            btn.className = "mt-2 w-full bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-bold py-1.5 px-3 rounded transition-colors";
            btn.innerText = "View Disaster Profile";
            btn.onclick = () => {
               // Must dispatch custom event since this is inside a raw DOM element attached by OpenLayers
               window.dispatchEvent(new CustomEvent('view-school-profile', { 
                 detail: { id: feature.get('id'), name: feature.get('name') } 
               }));
            };
            popupRef.current.querySelector('div')?.appendChild(btn);

            // Add close event
            const closeBtn = popupRef.current.querySelector('#close-popup-btn');
            if (closeBtn) {
              closeBtn.addEventListener('click', () => {
                if (popupRef.current) popupRef.current.style.display = 'none';
              });
            }

          } else if (feature.get('isEarthSensor') || feature.get('isTsunamiSensor')) {
            const sensorData = feature.get('sensorData') as EarthSensorNode | undefined;
            const name = feature.get('name') || 'Earth Sensor Station';
            const code = feature.get('code') || 'SEN-01';
            const family = (feature.get('family') as SensorFamily) || 'OCEAN_HYDROLOGY';
            const meta = SENSOR_FAMILY_META[family];
            const flag = feature.get('flag') || '📡';
            const platform = feature.get('platform') || 'GROUND_STATION';
            const status = 'KATALOG · BELUM TERHUBUNG';
            const currentValue = 'Data pengukuran belum tersedia';
            const accuracy = feature.get('accuracy') || 'High Precision';
            const provider = feature.get('provider') || feature.get('network') || 'National Network';
            const coverage = feature.get('coverage') || feature.get('seaArea') || 'Indonesia & Sekitarnya';
            const badgeBg = meta?.colorHex ? `${meta.colorHex}20` : '#e0f2fe';
            const textColor = meta?.colorHex || '#0284c7';

            popupRef.current.innerHTML = `
                <div style="min-width: 250px; max-width: 300px; font-family: Inter, sans-serif;" class="p-1 relative">
                    <button id="close-popup-btn" style="position: absolute; top: -2px; right: -2px; background: #f1f5f9; border-radius: 50%; padding: 2px 6px; border: none; cursor: pointer; color: #94a3b8; font-size: 12px; font-weight: bold;">✖</button>
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 5px;">
                      <span style="font-size: 15px;">${flag}</span>
                      <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: ${textColor}; background: ${badgeBg}; padding: 1.5px 6px; border-radius: 4px; letter-spacing: 0.3px;">${meta?.name || 'Sensor Bumi'}</span>
                      <span style="font-size: 9px; font-weight: 700; color: #10b981; background: #ecfdf5; padding: 1px 5px; border-radius: 4px; margin-left: auto;">● ${status}</span>
                    </div>
                    <strong style="font-size: 12.5px; color: #0f172a; display: block; margin-bottom: 2px; padding-right: 18px; line-height: 1.25;">${name}</strong>
                    <span style="font-size: 10px; color: #64748b; display: block; margin-bottom: 6px;">ID: <strong style="color: #334155;">${code}</strong> • Platform: ${platform}</span>

                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 8px; margin-bottom: 6px; font-size: 10px; line-height: 1.45;">
                      <div style="margin-bottom: 2px;">
                        <span style="color: #64748b; display: block; font-size: 9px;">Observasi Terkini:</span>
                        <strong style="color: #0f172a; font-size: 10.5px;">${currentValue}</strong>
                      </div>
                      <div style="display: flex; justify-content: space-between; margin-top: 4px; border-top: 1px dashed #e2e8f0; padding-top: 3px;">
                        <span style="color: #64748b;">Akurasi:</span>
                        <strong style="color: #0284c7;">${accuracy}</strong>
                      </div>
                      <div style="display: flex; justify-content: space-between;">
                        <span style="color: #64748b;">Cakupan / Lokasi:</span>
                        <span style="color: #475569; font-weight: 600;">${coverage}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between;">
                        <span style="color: #64748b;">Pengelola:</span>
                        <span style="color: #475569; font-weight: 600;">${provider}</span>
                      </div>
                    </div>

                    <div style="display: flex; gap: 4px; margin-top: 6px;">
                      <button id="inspect-sensor-btn" style="flex: 1; background: #0284c7; color: white; border: none; border-radius: 6px; padding: 6px 8px; font-size: 10px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
                        🔍 Inspeksi Detail
                      </button>
                      <button id="center-sensor-btn" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; font-size: 10px; font-weight: 600; cursor: pointer;">
                        🎯 Pusatkan
                      </button>
                    </div>
                </div>
            `;

            const inspectBtn = popupRef.current.querySelector('#inspect-sensor-btn');
            if (inspectBtn) {
              inspectBtn.addEventListener('click', () => {
                if (sensorData) {
                  setSelectedSensorForInspection(sensorData);
                } else {
                  const constructed: EarthSensorNode = {
                    id: feature.get('id') || 'sensor_auto',
                    name: feature.get('name') || 'Earth Sensor Station',
                    code: feature.get('code') || 'SEN',
                    family: (feature.get('family') as SensorFamily) || 'OCEAN_HYDROLOGY',
                    subCategory: feature.get('subCategory') || 'Deep Ocean Sensor',
                    platform: feature.get('platform') || 'SEAFLOOR_CABLE',
                    provider: feature.get('provider') || feature.get('network') || 'National Observatory',
                    country: feature.get('country') || 'Indonesia',
                    flag: feature.get('flag') || '📡',
                    lat: toLonLat(coords)[1],
                    lng: toLonLat(coords)[0],
                    status: feature.get('status') || 'UNCHECKED',
                    samplingRate: feature.get('samplingRate') || '10 Hz',
                    primaryMeasurement: feature.get('primaryMeasurement') || 'Tekanan Dasar Laut / Getaran Seismik',
                    unit: feature.get('unit') || 'MPa / gal',
                    currentValue: feature.get('currentValue') ?? 'Belum terhubung',
                    accuracy: feature.get('accuracy') || 'High Precision Standard',
                    coverage: feature.get('coverage') || feature.get('seaArea') || 'Kawasan Pengamatan',
                    disasterRelevance: feature.get('disasterRelevance') || ['TSUNAMI', 'GEMPA'],
                    description: feature.get('description') || feature.get('significance') || 'Stasiun observasi sensor Bumi terpadu.',
                    lastPing: feature.get('lastPing') || 'Realtime Live',
                    telemetryType: feature.get('telemetryType') || 'Optical Cable Telemetry',
                  };
                  setSelectedSensorForInspection(constructed);
                }
              });
            }

            const centerBtn = popupRef.current.querySelector('#center-sensor-btn');
            if (centerBtn) {
              centerBtn.addEventListener('click', () => {
                map.getView().animate({
                  center: coords,
                  zoom: 8.5,
                  duration: 600,
                });
              });
            }

            const closeBtn = popupRef.current.querySelector('#close-popup-btn');
            if (closeBtn) {
              closeBtn.addEventListener('click', () => {
                if (popupRef.current) popupRef.current.style.display = 'none';
              });
            }
          } else if (feature.get('isHotspot')) {
            const hData = feature.get('hotspotData') as ActiveFireHotspot | undefined;
            if (hData) {
              setSelectedHotspotForModal(hData);
              if (popupRef.current) popupRef.current.style.display = 'none';
              return;
            }
          } else if (feature.get('isEarthquake')) {
            const eqData = feature.get('earthquakeData') as EarthquakeRecord | undefined;
            if (eqData) {
              setSelectedEarthquakeForModal(eqData);
              if (popupRef.current) popupRef.current.style.display = 'none';
              return;
            }
          } else if (feature.get('isMountain')) {
            const mData = feature.get('mountainData');
            const volcanoStatus = mData?.volcanoData || volcanoService.getVolcanoStatus(feature.get('name')) || {
              id: feature.get('name'),
              name: feature.get('name'),
              lat: toLonLat(coords)[1],
              lng: toLonLat(coords)[0],
              elevation: Number(feature.get('elevation')) || 2000,
              level: (feature.get('status') === 'Active' ? 'Level II (Waspada)' : 'Tidak Aktif (Padam/Purba)') as any,
              levelCode: (feature.get('status') === 'Active' ? 2 : 0) as any,
              lastUpdate: new Date().toISOString(),
              dangerRadiusKm: feature.get('status') === 'Active' ? 3.0 : 0,
              source: 'PVMBG / Badan Geologi',
              operationalStatus: 'VERIFIED_LIVE_FEED' as any,
              isGeologicallyActive: feature.get('status') === 'Active',
              volcanoClassification: (feature.get('status') === 'Active' ? 'Tipe A (Sangat Aktif)' : 'Gunung Api Purba (Padam / Extinct)') as any,
              formationEra: 'Zaman Kuarter / Pleistosen',
              geologicalAge: '± 200.000 - 500.000 Tahun',
              tectonicSetting: 'Busur Vulkanik Kepulauan Indonesia (Sunda-Banda Arc)',
              geologicalStructure: 'Stratovolcano Komposit',
              latestEruption: feature.get('status') === 'Active' ? 'Dalam pemantauan aktif' : 'Tidak ada letusan dalam sejarah modern',
              eruptionHistory: [],
            };
            setSelectedVolcanoForModal(volcanoStatus);
            if (popupRef.current) popupRef.current.style.display = 'none';
            return;
          } else if (feature.get('isUserLocation')) {
            const acc = feature.get('accuracy');
            popupRef.current.innerHTML = `
                <div style="min-width: 155px; font-family: Inter, sans-serif;" class="p-1 relative">
                    <button id="close-popup-btn" style="position: absolute; top: -2px; right: -2px; background: #f1f5f9; border-radius: 50%; padding: 2px; border: none; cursor: pointer; color: #94a3b8;">✖</button>
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                      <span style="width: 8px; height: 8px; border-radius: 50%; background: #2563eb; display: inline-block;"></span>
                      <strong style="font-size: 13px; color: #1e293b;">Posisi GPS Anda</strong>
                    </div>
                    <span style="font-size: 11px; color: #64748b; display: block;">Pelacakan Realtime Aktif</span>
                    ${acc ? `<span style="font-size: 10px; color: #0284c7; display: block; margin-top: 2px; font-weight: 600;">Presisi: ±${Math.round(acc)} meter</span>` : ''}
                </div>
            `;
            
            // Add close event
            const closeBtn = popupRef.current.querySelector('#close-popup-btn');
            if (closeBtn) {
              closeBtn.addEventListener('click', () => {
                if (popupRef.current) popupRef.current.style.display = 'none';
              });
            }
          } else if (feature.get('isTrafficCctv')) {
            const cctv = feature.get('cctvData') as TrafficCctvCamera;
            if (cctv) {
              setSelectedCctvCamera(cctv);
              if (popupRef.current) popupRef.current.style.display = 'none';
              return;
            }
          } else if (feature.get('isTrafficSignal')) {
            const sigId = feature.get('signalId') as string;
            if (sigId) {
              setSelectedTrafficSignalId(sigId);
              if (popupRef.current) popupRef.current.style.display = 'none';
              return;
            }
          } else if (feature.get('isTrafficLine') || feature.get('isTrafficMilestone') || feature.get('isTrafficPoint')) {
            const corridor = feature.get('corridorData') as TrafficCorridor | undefined;
            const segmentName = feature.get('segmentName') as string | undefined;
            const corridorName = feature.get('corridorName') || corridor?.name || 'Lintasan Jalan';
            const status = feature.get('status') || 'Lancar';
            const speed = feature.get('speedKmh') || 80;
            const probeCount = feature.get('probeCount') as number | undefined;
            const densityPerKm = feature.get('densityPerKm') as number | undefined;
            const delayMinutes = feature.get('delayMinutes') as number | undefined;
            const routeType = feature.get('routeType') || corridor?.routeType || 'Jalan Tol';
            const tier = (feature.get('tier') || corridor?.tier || 'arterial') as string;
            const condition = corridor?.condition || 'Kondisi Perkerasan Jalan Baik, VMS Aktif';
            const lengthKm = corridor?.lengthKm || 100;
            const island = corridor?.island || 'Indonesia';
            const statusColor =
              status === 'Lancar'
                ? '#16a34a'
                : status === 'Ramai Lancar'
                ? '#d97706'
                : status === 'Padat Merayap'
                ? '#dc2626'
                : '#991b1b';
            const statusBg =
              status === 'Lancar'
                ? '#f0fdf4'
                : status === 'Ramai Lancar'
                ? '#fffbeb'
                : status === 'Padat Merayap'
                ? '#fef2f2'
                : '#fdf2f8';

            const isLocalRoad = tier === 'local' || routeType.toLowerCase().includes('tikus') || routeType.toLowerCase().includes('lingkungan') || routeType.toLowerCase().includes('alternatif');
            const iconEmoji = isLocalRoad ? '🛵' : '🛣️';
            const badgeBg = isLocalRoad ? '#ecfdf5' : '#f3e8ff';
            const badgeColor = isLocalRoad ? '#059669' : '#7c3aed';

            popupRef.current.innerHTML = `
                <div style="min-width: 240px; max-width: 300px; font-family: Inter, sans-serif;" class="p-1 relative">
                    <button id="close-popup-btn" style="position: absolute; top: -2px; right: -2px; background: #f1f5f9; border-radius: 50%; padding: 2px 6px; border: none; cursor: pointer; color: #94a3b8; font-size: 12px; font-weight: bold;">✖</button>
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 5px;">
                      <span style="font-size: 14px;">${iconEmoji}</span>
                      <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: ${badgeColor}; background: ${badgeBg}; padding: 1.5px 6px; border-radius: 4px;">${routeType}</span>
                      <span style="font-size: 9px; font-weight: 700; color: ${statusColor}; background: ${statusBg}; padding: 1px 5px; border-radius: 4px; margin-left: auto;">● ${status}</span>
                    </div>
                    <strong style="font-size: 12px; color: #0f172a; display: block; margin-bottom: 2px; padding-right: 18px; line-height: 1.25;">${corridorName}</strong>
                    ${segmentName ? `<div style="font-size: 10px; font-weight: 600; color: #6d28d9; margin-bottom: 4px;">📍 Segmen: ${segmentName}</div>` : ''}
                    ${isLocalRoad ? `<div style="font-size: 9.5px; color: #059669; font-weight: 700; margin-bottom: 4px;">🛵 Akses Jalan Kecil / Jalur Tikus Alternatif</div>` : ''}
                    
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 8px; margin-bottom: 6px; font-size: 10px; line-height: 1.45;">
                      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                        <span style="color: #64748b;">Kecepatan Terkini:</span>
                        <strong style="color: ${statusColor}; font-size: 11.5px;">${speed} km/jam</strong>
                      </div>
                      ${probeCount !== undefined ? `
                      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                        <span style="color: #64748b;">📡 Titik GPS Terdeteksi:</span>
                        <strong style="color: #4f46e5;">${probeCount} sinyal (${densityPerKm ?? 0}/km)</strong>
                      </div>` : ''}
                      ${delayMinutes && delayMinutes > 0 ? `
                      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                        <span style="color: #64748b;">⏱️ Estimasi Kemacetan:</span>
                        <strong style="color: #dc2626; font-weight: 700;">+${delayMinutes} mnt dari normal</strong>
                      </div>` : ''}
                      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                        <span style="color: #64748b;">Panjang Koridor:</span>
                        <span style="color: #334155; font-weight: 600;">${lengthKm} km</span>
                      </div>
                      <div style="display: flex; justify-content: space-between;">
                        <span style="color: #64748b;">Wilayah:</span>
                        <span style="color: #334155; font-weight: 600;">Pulau ${island}</span>
                      </div>
                      <div style="margin-top: 4px; border-top: 1px dashed #e2e8f0; padding-top: 3px; color: #64748b; font-size: 9px;">
                        ${condition}
                      </div>
                    </div>
                    <a href="https://www.google.com/maps/@${corridor?.center ? corridor.center[1] : -6.2},${corridor?.center ? corridor.center[0] : 106.8},14z/data=!5m1!1e1" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: center; gap: 4px; text-align: center; font-size: 10px; font-weight: 700; color: #7c3aed; text-decoration: none; padding: 5px 8px; background: #f3e8ff; border-radius: 8px; border: 1px solid #ddd6fe; transition: all 0.2s;">
                      <span>Google Maps Live Traffic ↗</span>
                    </a>
                </div>
            `;
            const closeBtn = popupRef.current.querySelector('#close-popup-btn');
            if (closeBtn) {
              closeBtn.addEventListener('click', () => {
                if (popupRef.current) popupRef.current.style.display = 'none';
              });
            }
          } else if (feature.get('type') === 'monument') {
            const name = feature.get('name') || 'Monumen Khatulistiwa';
            const location = feature.get('location') || '';
            const description = feature.get('description') || '';
            const country = feature.get('country') || 'Indonesia';

            popupRef.current.innerHTML = `
                <div style="min-width: 220px; max-width: 280px; font-family: Inter, sans-serif;" class="p-1 relative">
                    <button id="close-popup-btn" style="position: absolute; top: -2px; right: -2px; background: #f1f5f9; border-radius: 50%; padding: 2px 6px; border: none; cursor: pointer; color: #94a3b8; font-size: 12px; font-weight: bold;">✖</button>
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                      <span style="font-size: 15px;">🌐</span>
                      <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #f59e0b; background: #fef3c7; padding: 1.5px 6px; border-radius: 4px;">0°00'00" EQUATOR</span>
                    </div>
                    <strong style="font-size: 12.5px; color: #0f172a; display: block; margin-bottom: 2px; padding-right: 18px;">${name}</strong>
                    <span style="font-size: 10px; color: #64748b; display: block; margin-bottom: 6px;">📍 ${location} (${country})</span>
                    <p style="font-size: 10px; color: #334155; line-height: 1.4; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 8px;">
                      ${description}
                    </p>
                </div>
            `;
            const closeBtn = popupRef.current.querySelector('#close-popup-btn');
            if (closeBtn) {
              closeBtn.addEventListener('click', () => {
                if (popupRef.current) popupRef.current.style.display = 'none';
              });
            }
          } else if (feature.get('isRadarStation') || feature.get('isCoverageZone')) {
            const radar = feature.get('radarData') as DopplerRadarStation | undefined;
            const zoneType = feature.get('zoneType') as string | undefined;
            if (radar) {
              popupRef.current.innerHTML = `
                <div style="min-width: 250px; max-width: 320px; font-family: Inter, sans-serif;" class="p-1 relative">
                    <button id="close-popup-btn" style="position: absolute; top: -2px; right: -2px; background: #f1f5f9; border-radius: 50%; padding: 2px 6px; border: none; cursor: pointer; color: #94a3b8; font-size: 12px; font-weight: bold;">✖</button>
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 5px;">
                      <span style="font-size: 15px;">📡</span>
                      <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #047857; background: #d1fae5; padding: 1.5px 6px; border-radius: 4px;">RADAR DOPPLER BMKG</span>
                      <span style="font-size: 9px; font-weight: 700; color: #475569; background: #f1f5f9; padding: 1px 5px; border-radius: 4px; margin-left: auto;">📋 ${radar.operationalStatus === 'ONLINE' ? 'Live Online' : 'Katalog Terdaftar (Live Belum Terverifikasi)'}</span>
                    </div>
                    <strong style="font-size: 12.5px; color: #0f172a; display: block; margin-bottom: 2px; padding-right: 18px; line-height: 1.3;">${radar.name}</strong>
                    <div style="font-size: 10px; color: #64748b; margin-bottom: 6px;">📍 ${radar.city}, ${radar.province} (Elevasi: ${radar.elevationM}m)</div>

                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 8px; margin-bottom: 8px; font-size: 10px; line-height: 1.5;">
                      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                        <span style="color: #64748b;">Frekuensi & Tipe:</span>
                        <strong style="color: #0f172a;">${radar.type}</strong>
                      </div>
                      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                        <span style="color: #64748b;">Radius Jangkauan:</span>
                        <strong style="color: #059669;">${radar.rangeKm} km Maksimal</strong>
                      </div>
                      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                        <span style="color: #64748b;">Zona Terpilih:</span>
                        <span style="color: #6d28d9; font-weight: 700;">${zoneType === 'high' ? '🟢 Cakupan Tinggi (< 20 km)' : zoneType === 'moderate' ? '🟡 Cakupan Sedang (20-60 km)' : '🔵 Sapuan Radar Maksimal'}</span>
                      </div>
                      <div style="margin-top: 4px; border-top: 1px dashed #e2e8f0; padding-top: 3px; color: #64748b; font-size: 9px;">
                        Pengelola: ${radar.operator}
                      </div>
                    </div>

                    <button id="open-fusion-btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 5px; font-size: 10.5px; font-weight: 700; color: #ffffff; background: linear-gradient(135deg, #4f46e5, #7c3aed); border: none; border-radius: 8px; padding: 6px 10px; cursor: pointer; transition: all 0.2s;">
                      <span>Buka Studio Fusi & Prioritas Sensor ↗</span>
                    </button>
                </div>
              `;
              const closeBtn = popupRef.current.querySelector('#close-popup-btn');
              if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                  if (popupRef.current) popupRef.current.style.display = 'none';
                });
              }
              const fusionBtn = popupRef.current.querySelector('#open-fusion-btn');
              if (fusionBtn) {
                fusionBtn.addEventListener('click', () => {
                  if (popupRef.current) popupRef.current.style.display = 'none';
                  setGeospatialModalDomain('fusion');
                  setShowGeospatialModal(true);
                });
              }
            }
          } else if (feature.get('isBlankSpotZone') || feature.get('isBlankSpotMarker')) {
            const spot = feature.get('spotData') as BlankSpotZone | undefined;
            if (spot) {
              popupRef.current.innerHTML = `
                <div style="min-width: 250px; max-width: 320px; font-family: Inter, sans-serif;" class="p-1 relative">
                    <button id="close-popup-btn" style="position: absolute; top: -2px; right: -2px; background: #f1f5f9; border-radius: 50%; padding: 2px 6px; border: none; cursor: pointer; color: #94a3b8; font-size: 12px; font-weight: bold;">✖</button>
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 5px;">
                      <span style="font-size: 15px;">⚠️</span>
                      <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #be123c; background: #ffe4e6; padding: 1.5px 6px; border-radius: 4px;">ZONA KESENJANGAN (BLANK SPOT)</span>
                      <span style="font-size: 9px; font-weight: 700; color: #e11d48; background: #fff1f2; padding: 1px 5px; border-radius: 4px; margin-left: auto;">${spot.severity}</span>
                    </div>
                    <strong style="font-size: 12.5px; color: #0f172a; display: block; margin-bottom: 2px; padding-right: 18px; line-height: 1.3;">${spot.name}</strong>
                    <div style="font-size: 10px; color: #64748b; margin-bottom: 6px;">📍 ${spot.region} (Pulau ${spot.island})</div>

                    <div style="background: #fff5f5; border: 1px solid #fed7d7; border-radius: 8px; padding: 6px 8px; margin-bottom: 8px; font-size: 10px; line-height: 1.5;">
                      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                        <span style="color: #742a2a;">Jarak Radar Terdekat:</span>
                        <strong style="color: #c53030;">~${spot.nearestRadarKm} km (${spot.nearestRadarName.split(' ')[1] || 'Radar'})</strong>
                      </div>
                      <div style="margin-top: 3px; color: #4a5568; font-size: 9.5px;">
                        <strong>Dampak:</strong> ${spot.impactNote}
                      </div>
                      <div style="margin-top: 3px; border-top: 1px dashed #fed7d7; padding-top: 3px; color: #2b6cb0; font-size: 9.5px;">
                        <strong>Rekomendasi AI:</strong> ${spot.recommendation}
                      </div>
                    </div>

                    <button id="open-fusion-btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 5px; font-size: 10.5px; font-weight: 700; color: #ffffff; background: linear-gradient(135deg, #e11d48, #9333ea); border: none; border-radius: 8px; padding: 6px 10px; cursor: pointer; transition: all 0.2s;">
                      <span>Buka Analisis Kesenjangan & Prioritas Sensor ↗</span>
                    </button>
                </div>
              `;
              const closeBtn = popupRef.current.querySelector('#close-popup-btn');
              if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                  if (popupRef.current) popupRef.current.style.display = 'none';
                });
              }
              const fusionBtn = popupRef.current.querySelector('#open-fusion-btn');
              if (fusionBtn) {
                fusionBtn.addEventListener('click', () => {
                  if (popupRef.current) popupRef.current.style.display = 'none';
                  setGeospatialModalDomain('fusion');
                  setShowGeospatialModal(true);
                });
              }
            }
          } else if (feature.get('type') === 'landslide_hazard_zone') {
            const name = feature.get('name');
            const risk = feature.get('riskLevel');
            const slope = feature.get('slope');
            const trigger = feature.get('triggerFactor');
            const pvmbg = feature.get('pvmbgCriteria');
            popupRef.current.innerHTML = `
              <div style="min-width: 250px; max-width: 320px; font-family: Inter, sans-serif;" class="p-1 relative">
                <button id="close-popup-btn" style="position: absolute; top: -2px; right: -2px; background: #f1f5f9; border-radius: 50%; padding: 2px 6px; border: none; cursor: pointer; color: #94a3b8; font-size: 12px; font-weight: bold;">✖</button>
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 5px;">
                  <span style="font-size: 15px;">⛰️</span>
                  <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #be123c; background: #ffe4e6; padding: 1.5px 6px; border-radius: 4px;">ZONA KERENTANAN GERAKAN TANAH</span>
                  <span style="font-size: 9px; font-weight: 700; color: #e11d48; background: #fff1f2; padding: 1px 5px; border-radius: 4px; margin-left: auto;">${risk}</span>
                </div>
                <strong style="font-size: 12.5px; color: #0f172a; display: block; margin-bottom: 2px; padding-right: 18px; line-height: 1.3;">${name}</strong>
                <div style="font-size: 10px; color: #64748b; margin-bottom: 6px;">PVMBG Badan Geologi • Kemiringan Lereng: ${slope}</div>

                <div style="background: #fff5f5; border: 1px solid #fed7d7; border-radius: 8px; padding: 6px 8px; margin-bottom: 8px; font-size: 10px; line-height: 1.5;">
                  <div style="color: #742a2a; margin-bottom: 3px;"><strong>Pemicu Geologis:</strong> ${trigger}</div>
                  <div style="color: #4a5568; font-size: 9.5px;"><strong>Kriteria PVMBG:</strong> ${pvmbg}</div>
                </div>

                <button id="open-risk-center-btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 5px; font-size: 10.5px; font-weight: 700; color: #ffffff; background: linear-gradient(135deg, #e11d48, #ea580c); border: none; border-radius: 8px; padding: 6px 10px; cursor: pointer; transition: all 0.2s;">
                  <span>Buka Profil Risiko Sekolah & Evakuasi ↗</span>
                </button>
              </div>
            `;
            const closeBtn = popupRef.current.querySelector('#close-popup-btn');
            if (closeBtn) closeBtn.addEventListener('click', () => { if (popupRef.current) popupRef.current.style.display = 'none'; });
            const riskBtn = popupRef.current.querySelector('#open-risk-center-btn');
            if (riskBtn) riskBtn.addEventListener('click', () => {
              if (popupRef.current) popupRef.current.style.display = 'none';
              setShowDisasterRiskCenter(true);
            });
          } else if (feature.get('type') === 'tsunami_hazard_zone') {
            const name = feature.get('name');
            const segment = feature.get('megathrustSegment');
            const arrival = feature.get('estimatedArrivalTimeMin');
            const runup = feature.get('maxRunupM');
            const evac = feature.get('evacuationOrder');
            popupRef.current.innerHTML = `
              <div style="min-width: 250px; max-width: 320px; font-family: Inter, sans-serif;" class="p-1 relative">
                <button id="close-popup-btn" style="position: absolute; top: -2px; right: -2px; background: #f1f5f9; border-radius: 50%; padding: 2px 6px; border: none; cursor: pointer; color: #94a3b8; font-size: 12px; font-weight: bold;">✖</button>
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 5px;">
                  <span style="font-size: 15px;">🌊</span>
                  <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #0284c7; background: #e0f2fe; padding: 1.5px 6px; border-radius: 4px;">ZONA INUNDASI TSUNAMI</span>
                  <span style="font-size: 9px; font-weight: 700; color: #0369a1; background: #f0f9ff; padding: 1px 5px; border-radius: 4px; margin-left: auto;">Golden: ${arrival}m</span>
                </div>
                <strong style="font-size: 12.5px; color: #0f172a; display: block; margin-bottom: 2px; padding-right: 18px; line-height: 1.3;">${name}</strong>
                <div style="font-size: 10px; color: #64748b; margin-bottom: 6px;">Segmen: ${segment} • Runup Maks: ~${runup}m</div>

                <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 6px 8px; margin-bottom: 8px; font-size: 10px; line-height: 1.5;">
                  <div style="color: #0369a1; margin-bottom: 2px;"><strong>Protokol BMKG:</strong> ${evac}</div>
                  <div style="color: #4a5568; font-size: 9.5px;">Golden time evakuasi sekolah: segera bergerak ke dataran tinggi aman.</div>
                </div>

                <button id="open-risk-center-btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 5px; font-size: 10.5px; font-weight: 700; color: #ffffff; background: linear-gradient(135deg, #0284c7, #2563eb); border: none; border-radius: 8px; padding: 6px 10px; cursor: pointer; transition: all 0.2s;">
                  <span>Buka Rute Evakuasi Sekolah Tangguh ↗</span>
                </button>
              </div>
            `;
            const closeBtn = popupRef.current.querySelector('#close-popup-btn');
            if (closeBtn) closeBtn.addEventListener('click', () => { if (popupRef.current) popupRef.current.style.display = 'none'; });
            const riskBtn = popupRef.current.querySelector('#open-risk-center-btn');
            if (riskBtn) riskBtn.addEventListener('click', () => {
              if (popupRef.current) popupRef.current.style.display = 'none';
              setShowDisasterRiskCenter(true);
            });
          }
          
          popupOverlayRef.current.setPosition(coords);
          popupRef.current.style.display = 'block';
        }
      } else {
        if (popupRef.current) popupRef.current.style.display = 'none';
      }
    };

    map.on('click', handleClick);

    return () => {
      map.un('click', handleClick);
    };
  }, []);

  // Sync User GPS Marker & Precision Circle on Map
  useEffect(() => {
    if (!userCoords || !userMarkerLayerRef.current) return;
    const source = userMarkerLayerRef.current.getSource();
    if (!source) return;
    source.clear();

    const center = fromLonLat([userCoords.lng, userCoords.lat]);
    const features: Feature[] = [];

    // Accuracy Circle
    if (userAccuracy && userAccuracy > 0) {
      features.push(
        new Feature({
          geometry: new CircleGeom(center, Math.min(3000, Math.max(10, userAccuracy))),
          isAccuracyCircle: true,
        })
      );
    }

    // High Accuracy Point
    features.push(
      new Feature({
        geometry: new Point(center),
        isUserLocation: true,
        name: 'Lokasi Anda Saat Ini',
        accuracy: userAccuracy,
      })
    );

    source.addFeatures(features);
  }, [userCoords, userAccuracy]);

  // Sync Navigation Route Polyline on Map
  useEffect(() => {
    if (!routeLayerRef.current) return;
    const source = routeLayerRef.current.getSource();
    if (!source) return;
    source.clear();
    if (activeRoute && activeRoute.coordinates.length > 1) {
      const coords = activeRoute.coordinates.map(([lng, lat]) => fromLonLat([lng, lat]));
      const feat = new Feature({
        geometry: new LineString(coords),
      });
      source.addFeature(feat);

      const startCoord = coords[0];
      const endCoord = coords[coords.length - 1];
      const startPin = new Feature({
        geometry: new Point(startCoord),
        isRouteStart: true,
        label: activeRoute.origin.label,
      });
      const endPin = new Feature({
        geometry: new Point(endCoord),
        isRouteEnd: true,
        label: activeRoute.destination.label,
      });
      source.addFeatures([startPin, endPin]);

      const ext = source.getExtent();
      if (ext && !ext.some(isNaN)) {
        mapRef.current?.getView().fit(ext, { padding: [80, 80, 80, 80], duration: 900 });
      }
    }
  }, [activeRoute]);

  // Sync cursor when picking route destination on map
  useEffect(() => {
    isPickingRouteLocationRef.current = isPickingRouteLocation;
    const targetEl = mapRef.current?.getTargetElement();
    if (targetEl) {
      targetEl.style.cursor = isPickingRouteLocation ? 'crosshair' : '';
    }
  }, [isPickingRouteLocation]);

  // Dynamically switch basemap source and toggle traffic & satellite reference layers
  useEffect(() => {
    if (!baseTileLayerRef.current) return;
    const newSource = getSourceForBasemap(activeMapBasemap);
    baseTileLayerRef.current.setSource(newSource);

    if (satelliteReferenceLayerRef.current) {
      satelliteReferenceLayerRef.current.setVisible(activeMapBasemap === 'satellite');
    }

    const isTrafficActive = activeMapBasemap === 'traffic' || showTrafficCorridors;
    if (trafficOverlayLayerRef.current) {
      trafficOverlayLayerRef.current.setVisible(showTrafficCorridors && activeMapBasemap !== 'traffic');
    }
    if (trafficVectorLayerRef.current) {
      trafficVectorLayerRef.current.setVisible(isTrafficActive);
    }
    if (trafficCctvLayerRef.current) {
      trafficCctvLayerRef.current.setVisible(isTrafficActive && showTrafficCctv);
    }
    if (trafficSignalsLayerRef.current) {
      trafficSignalsLayerRef.current.setVisible(isTrafficActive && showTrafficSignals);
    }
    mapRef.current?.render();
  }, [activeMapBasemap, showTrafficCorridors, showTrafficCctv, showTrafficSignals]);

  // Load CCTV cameras when CCTV tab is active or filters update
  useEffect(() => {
    if (trafficDrawerTab === 'cctv') {
      loadCctvFeeds(cctvCityFilter, cctvCategoryFilter, cctvSearchQuery);
    }
  }, [trafficDrawerTab, cctvCityFilter, cctvCategoryFilter, cctvSearchQuery, loadCctvFeeds]);

  // Fetch and periodically refresh RainViewer radar and satellite timestamp paths
  const rainViewerFetchGen = useRef(0);
  const rainViewerController = useRef<AbortController | null>(null);

  const fetchRainViewerMetadata = useCallback(() => {
    rainViewerController.current?.abort();
    const controller = new AbortController();
    rainViewerController.current = controller;
    const currentGen = ++rainViewerFetchGen.current;

    fetch('https://api.rainviewer.com/public/weather-maps.json', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`RainViewer HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (currentGen !== rainViewerFetchGen.current) return;
        if (!data || typeof data !== 'object') {
          setRadarMetadataStale(true);
          return;
        }
        const radarList = Array.isArray(data.radar?.past) ? data.radar.past : [];
        const hasValidRadarList = radarList.length > 0;
        const latest = hasValidRadarList ? radarList[radarList.length - 1] : null;
        const isLatestRadarValid = Boolean(
          latest &&
          typeof latest.path === 'string' && latest.path.length > 0 &&
          typeof latest.time === 'number' && Number.isFinite(latest.time) && latest.time > 0
        );

        if (!hasValidRadarList || !isLatestRadarValid) {
          // Empty or invalid radar frames: mark as stale, do not clear stale flag
          setRadarMetadataStale(true);
          return;
        }

        if (typeof data.host === 'string' && data.host) setRainviewerHost(data.host);
        setRainviewerPath(latest!.path);
        setRadarFrameTime(latest!.time);

        const satList = Array.isArray(data.satellite?.infrared) ? data.satellite.infrared : [];
        if (satList.length > 0) {
          const latestSat = satList[satList.length - 1];
          if (typeof latestSat?.path === 'string') setRainviewerSatellitePath(latestSat.path);
        } else {
          setRainviewerSatellitePath('');
        }
        setRadarMetadataStale(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setRadarMetadataStale(true);
        console.warn('RainViewer metadata fetch failed; menandai status sebagai STALE:', err);
      });
  }, []);

  useEffect(() => {
    const isWeatherActive = ['radar', 'satellite', 'bmkg_radar', 'bmkg_sat'].includes(weatherMapOverlay);
    if (!isWeatherActive) return;

    fetchRainViewerMetadata();
    const interval = setInterval(fetchRainViewerMetadata, 300000); // 5 min cadence
    const handleVisChange = () => {
      if (!document.hidden) fetchRainViewerMetadata();
    };
    document.addEventListener('visibilitychange', handleVisChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisChange);
      rainViewerController.current?.abort();
    };
  }, [fetchRainViewerMetadata, weatherMapOverlay]);

  const fetchGibsMetadata = useCallback(() => {
    if (gibsController.current) gibsController.current.abort('superseded');
    const controller = new AbortController();
    gibsController.current = controller;
    const reqGen = ((gibsController as any)._activeGen = ((gibsController as any)._activeGen || 0) + 1);

    const timeoutId = setTimeout(() => controller.abort('timeout'), 10000);

    fetch('https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml', {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (controller.signal.aborted || (gibsController as any)._activeGen !== reqGen) return;
        if (!res.ok) throw new Error(`GIBS HTTP ${res.status}`);
        const xml = await res.text();
        if (controller.signal.aborted || (gibsController as any)._activeGen !== reqGen) return;
        const layerMatch = xml.match(/<Layer[\s>][\s\S]*?<\/Layer>/g) || [];
        const layer = layerMatch.find((x) => x.includes('<ows:Identifier>Himawari_AHI_Band13_Clean_Infrared</ows:Identifier>'));
        if (!layer) throw new Error('Himawari layer not found in GIBS capabilities');
        const defaultTime = layer.match(/<Default>(.*?)<\/Default>/)?.[1];
        if (defaultTime && !isNaN(Date.parse(defaultTime))) {
          if (controller.signal.aborted || (gibsController as any)._activeGen !== reqGen) return;
          const frameMs = new Date(defaultTime).getTime();
          const frameAgeHours = (Date.now() - frameMs) / (3600 * 1000);
          setGibsAvailableTime(defaultTime);
          setGibsFrameTime(frameMs / 1000);
          setGibsMetadataStale(frameAgeHours > 24);
        } else {
          throw new Error('Default time not found in GIBS capabilities');
        }
      })
      .catch((err) => {
        if ((gibsController as any)._activeGen !== reqGen) return;
        const isTimeout = controller.signal.aborted && (controller.signal.reason === 'timeout' || err?.name === 'TimeoutError');
        if (!controller.signal.aborted || isTimeout) {
          setGibsMetadataStale(true);
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
      });
  }, []);

  useEffect(() => {
    if (weatherMapOverlay === 'satellite' || weatherMapOverlay === 'bmkg_sat') {
      fetchGibsMetadata();
      const interval = setInterval(fetchGibsMetadata, 600000);
      return () => {
        clearInterval(interval);
        gibsController.current?.abort();
      };
    }
  }, [weatherMapOverlay, fetchGibsMetadata]);

  // Weather radar/satellite tile layer integration with OpenLayers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (weatherTileLayerRef.current) {
      map.removeLayer(weatherTileLayerRef.current);
      weatherTileLayerRef.current.dispose();
      weatherTileLayerRef.current = null;
    }

    if (weatherMapOverlay === 'none' || weatherRenderMode !== 'native') {
      map.render();
      return;
    }

    let tileUrl = '';
    const isRadar = weatherMapOverlay === 'radar' || weatherMapOverlay === 'bmkg_radar' || weatherMapOverlay === 'rain';
    const isSat = weatherMapOverlay === 'satellite' || weatherMapOverlay === 'bmkg_sat';

    if (isRadar && rainviewerPath) {
      tileUrl = `${rainviewerHost}${rainviewerPath}/256/{z}/{x}/{y}/2/1_1.png`;
    } else if (isSat) {
      if (gibsAvailableTime) {
        tileUrl = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/Himawari_AHI_Band13_Clean_Infrared/default/${gibsAvailableTime}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`;
      } else if (rainviewerSatellitePath) {
        tileUrl = `${rainviewerHost}${rainviewerSatellitePath}/256/{z}/{x}/{y}/0/1_1.png`;
      }
    }

    if (!tileUrl) {
      map.render();
      return;
    }

    const tileSource = new XYZ({
      url: tileUrl,
      attributions: isSat
        ? '© NASA GIBS / JMA Himawari-9 AHI Band 13 Clean Infrared (Visualisasi citra satelit; bukan suhu permukaan / LST numerik)'
        : '© RainViewer Radar Mosaic (Bukan observasi radar BMKG langsung)',
      maxZoom: isSat ? 6 : 7, // GoogleMapsCompatible_Level6 max zoom is 6; RainViewer is 7
      minZoom: 1,
      wrapX: true,
    });

    let requested = 0;
    let loaded = 0;
    let error = 0;
    let disposed = false;
    let previousCounts = '';
    const started = new WeakSet<object>();
    const completed = new WeakSet<object>();
    const failed = new WeakSet<object>();
    const updateCoverage = () => {
      if (disposed || weatherTileLayerRef.current !== newLayer) return;
      const coverage = readWeatherTileCoverage(map, newLayer);
      const next = { requested, loaded, error, ...coverage };
      const signature = JSON.stringify(next);
      if (signature === previousCounts) return;
      previousCounts = signature;
      setRadarTileLoadError(coverage.activeError > 0);
      setRadarTileCounts(next);
    };
    const handleTileLoadStart = (e: any) => {
      if (e?.tile && !started.has(e.tile)) { started.add(e.tile); requested++; }
      updateCoverage();
    };
    const handleTileLoadEnd = (e: any) => {
      if (e?.tile && !completed.has(e.tile)) { completed.add(e.tile); loaded++; }
      updateCoverage();
    };
    const handleTileLoadError = (e: any) => {
      if (e?.tile && !failed.has(e.tile)) { failed.add(e.tile); error++; }
      updateCoverage();
    };
    tileSource.on('tileloadstart', handleTileLoadStart);
    tileSource.on('tileloadend', handleTileLoadEnd);
    tileSource.on('tileloaderror', handleTileLoadError);
    map.on('moveend', updateCoverage);
    map.on('postrender', updateCoverage);
    map.on('change:size', updateCoverage);

    const newLayer = new TileLayer({
      source: tileSource,
      opacity: weatherOverlayOpacity,
      zIndex: 42,
      visible: true,
      properties: { name: `Weather_${weatherMapOverlay}` },
    });

    weatherTileLayerRef.current = newLayer;
    map.addLayer(newLayer);
    updateCoverage();
    map.render();

    return () => {
      tileSource.un('tileloadstart', handleTileLoadStart);
      tileSource.un('tileloadend', handleTileLoadEnd);
      tileSource.un('tileloaderror', handleTileLoadError);
      disposed = true;
      map.un('moveend', updateCoverage);
      map.un('postrender', updateCoverage);
      map.un('change:size', updateCoverage);
      if (weatherTileLayerRef.current && mapRef.current) {
        mapRef.current.removeLayer(weatherTileLayerRef.current);
        weatherTileLayerRef.current.dispose();
        weatherTileLayerRef.current = null;
      }
    };
  }, [mapReady, weatherMapOverlay, weatherRenderMode, rainviewerPath, rainviewerSatellitePath, rainviewerHost, weatherOverlayOpacity, gibsAvailableTime]);

  // Auto-sync Windy overlay coordinates on OpenLayers map move (debounced)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    let syncTimer: any = null;
    const handleSyncWindy = () => {
      if (syncTimer) clearTimeout(syncTimer);
      syncTimer = setTimeout(() => {
        const center = map.getView().getCenter();
        if (!center) return;
        const [lng, lat] = toLonLat(center);
        const z = Math.min(Math.max(Math.round(map.getView().getZoom() || 5), 3), 11);
        setWindyCoords((prev) => {
          if (Math.abs(prev.lat - lat) > 0.15 || Math.abs(prev.lng - lng) > 0.15 || prev.zoom !== z) {
            return { lat: Number(lat.toFixed(4)), lng: Number(lng.toFixed(4)), zoom: z };
          }
          return prev;
        });
      }, 400);
    };

    map.on('moveend', handleSyncWindy);
    return () => {
      if (syncTimer) clearTimeout(syncTimer);
      map.un('moveend', handleSyncWindy);
    };
  }, [mapReady]);

  // Sync Earth Sensors layer visibility & family filter
  useEffect(() => {
    if (!tsunamiSensorsLayerRef.current) return;
    tsunamiSensorsLayerRef.current.setVisible(showTsunamiSensors);
    
    const source = tsunamiSensorsLayerRef.current.getSource();
    if (!source) return;
    
    source.getFeatures().forEach((feat) => {
      const family = feat.get('family') as SensorFamily;
      if (sensorFamilyFilter === 'ALL' || family === sensorFamilyFilter) {
        feat.setStyle(undefined);
      } else {
        feat.setStyle(new Style({}));
      }
    });
  }, [showTsunamiSensors, sensorFamilyFilter]);

  const weatherStatusText = weatherMapOverlay === 'none'
    ? 'SIAP'
    : weatherRenderMode === 'native'
    ? ['radar', 'bmkg_radar', 'rain'].includes(weatherMapOverlay)
      ? radarMetadataStale
        ? (radarTileCounts.loaded > 0 ? 'STALE' : 'UNAVAILABLE')
        : radarFrameTime && Date.now() - radarFrameTime * 1000 > 7200000
        ? (radarTileCounts.loaded > 0 ? 'STALE' : 'UNAVAILABLE')
        : ((radarTileCounts as any).activeRequested !== undefined ? (radarTileCounts as any).activeRequested : radarTileCounts.requested) > 0
        ? ((((radarTileCounts as any).activeLoaded !== undefined ? (radarTileCounts as any).activeLoaded : radarTileCounts.loaded) === 0 && ((radarTileCounts as any).activeError !== undefined ? (radarTileCounts as any).activeError : radarTileCounts.error) > 0)
            ? 'UNAVAILABLE'
            : (((radarTileCounts as any).activeLoaded !== undefined ? (radarTileCounts as any).activeLoaded : radarTileCounts.loaded) > 0 && ((radarTileCounts as any).activeError !== undefined ? (radarTileCounts as any).activeError : radarTileCounts.error) > 0)
            ? 'PARSIAL'
            : (((radarTileCounts as any).activeLoaded !== undefined ? (radarTileCounts as any).activeLoaded : radarTileCounts.loaded) >= ((radarTileCounts as any).activeRequested !== undefined ? (radarTileCounts as any).activeRequested : radarTileCounts.requested))
            ? 'LIVE RADAR'
            : 'MEMUAT')
        : 'MEMUAT'
      : ['satellite', 'bmkg_sat'].includes(weatherMapOverlay)
      ? ((typeof gibsMetadataStale !== 'undefined' && gibsMetadataStale) || (typeof gibsFrameTime !== 'undefined' && gibsFrameTime && Date.now() - Number(gibsFrameTime) * 1000 > 86400000))
        ? ((((radarTileCounts as any).activeLoaded !== undefined ? (radarTileCounts as any).activeLoaded : radarTileCounts.loaded) > 0 || radarTileCounts.loaded > 0) ? 'STALE CITRA' : 'UNAVAILABLE')
        : ((radarTileCounts as any).activeRequested !== undefined ? (radarTileCounts as any).activeRequested : radarTileCounts.requested) > 0
        ? ((((radarTileCounts as any).activeLoaded !== undefined ? (radarTileCounts as any).activeLoaded : radarTileCounts.loaded) === 0 && ((radarTileCounts as any).activeError !== undefined ? (radarTileCounts as any).activeError : radarTileCounts.error) > 0)
            ? 'UNAVAILABLE'
            : (((radarTileCounts as any).activeLoaded !== undefined ? (radarTileCounts as any).activeLoaded : radarTileCounts.loaded) > 0 && ((radarTileCounts as any).activeError !== undefined ? (radarTileCounts as any).activeError : radarTileCounts.error) > 0)
            ? 'PARSIAL CITRA'
            : (((radarTileCounts as any).activeLoaded !== undefined ? (radarTileCounts as any).activeLoaded : radarTileCounts.loaded) >= ((radarTileCounts as any).activeRequested !== undefined ? (radarTileCounts as any).activeRequested : radarTileCounts.requested))
            ? 'NASA GIBS IR'
            : 'MEMUAT CITRA')
        : 'MEMUAT CITRA'
      : 'PERLU WINDY'
    : 'MODEL ECMWF';

  const weatherBadgeColor = weatherMapOverlay === 'none'
    ? 'bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/30'
    : weatherStatusText === 'STALE' || weatherStatusText === 'STALE CITRA'
    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
    : weatherStatusText === 'PARSIAL' || weatherStatusText === 'PARSIAL CITRA'
    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
    : weatherStatusText === 'UNAVAILABLE'
    ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'
    : weatherStatusText === 'PERLU WINDY'
    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
    : weatherStatusText === 'MEMUAT' || weatherStatusText === 'MEMUAT CITRA'
    ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30'
    : weatherRenderMode === 'windy'
    ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/30'
    : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';

  return (
    <div 
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={(e) => { if (is3D) e.preventDefault(); }}
      className="relative h-full w-full bg-slate-950 overflow-hidden select-none touch-none"
      style={{ touchAction: 'none' }}
    >
      <style>{`
        .ol-viewport,
        .ol-viewport canvas,
        .ol-viewport div {
          touch-action: none !important;
          -webkit-touch-callout: none !important;
          -webkit-user-select: none !important;
          user-select: none !important;
        }
      `}</style>
      {/* 3D Deep Cosmos Stars Backdrop when in 3D Mode */}
      {is3D && mapMode === 'spatial' && (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-slate-950 transition-opacity duration-700">
          <div 
            className="absolute inset-0 opacity-45"
            style={{
              backgroundImage: 'radial-gradient(1.5px 1.5px at 25px 35px, #ffffff, rgba(0,0,0,0)), radial-gradient(1px 1px at 90px 145px, #93c5fd, rgba(0,0,0,0)), radial-gradient(1.5px 1.5px at 160px 75px, #e2e8f0, rgba(0,0,0,0)), radial-gradient(2px 2px at 250px 195px, #60a5fa, rgba(0,0,0,0)), radial-gradient(1px 1px at 330px 55px, #ffffff, rgba(0,0,0,0)), radial-gradient(1.5px 1.5px at 410px 230px, #cbd5e1, rgba(0,0,0,0))',
              backgroundSize: '450px 300px'
            }}
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-sky-500/10 blur-[130px] pointer-events-none" />
        </div>
      )}

      {/* 3D Atmospheric Depth & Horizon Glow for Perspective mode */}
      {is3D && mapMode === 'spatial' && globeType === 'perspective' && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-slate-950 via-slate-950/60 to-transparent z-10 transition-opacity duration-700" />
      )}

      {/* 3D Active Status Pill (Perspective mode only) */}
      {is3D && mapMode === 'spatial' && globeType === 'perspective' && (
        <div className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-indigo-500/50 text-[11px] font-bold text-indigo-200 shadow-xl animate-in fade-in duration-300">
          <Globe className={`w-3.5 h-3.5 text-sky-400 ${isOrbiting ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
          <span>Perspektif 3D (360°)</span>
          <span className="text-[10px] bg-indigo-500/30 text-indigo-300 px-1.5 py-0.2 rounded-md font-mono">
            {currentRotation}°
          </span>
        </div>
      )}

      {/* 3D Photorealistic Cosmic Globe (CesiumJS) */}
      {is3D && mapMode === 'spatial' && (globeType === 'globe' || globeType === 'cesium') && (
        <div className="absolute inset-0 z-10 animate-in fade-in duration-500">
          <Suspense fallback={<div role="status" className="p-6 text-white">Memuat semesta tata surya 3D Cesium…</div>}>
            <CesiumGlobe3D 
              initialCenter={globeInitialCenter}
              initialZoom={globeInitialZoom}
              userCoords={userCoords}
              activeRouteCoords={activeRoute?.coordinates}
              earthquakes={quakeSnapshot?.records || earthquakes}
              hotspots={hotspotSnapshot?.records || hotspots}
              mountains={mountains}
              showActiveVolcanoes={showActive}
              showInactiveVolcanoes={showInactive}
              showPeaks={showPeaks}
              showTectonicPlates={showTectonic}
              showEarthquakes={showEarthquakes}
              showEarthSensors={showTsunamiSensors}
              sensorFamilyFilter={sensorFamilyFilter}
              showObservationCoverage={showObservationCoverage}
              showEquatorZones={showEquatorZones}
              schools={schools}
              userSchoolId={userSchoolId}
              showSD={showSD}
              showSMP={showSMP}
              showSMA={showSMA}
              weatherMapOverlay={weatherMapOverlay}
              rainviewerPath={rainviewerPath}
              rainviewerHost={rainviewerHost}
              rainviewerSatellitePath={rainviewerSatellitePath}
              onSelectSensor={setSelectedSensorForInspection}
              quakeSnapshot={quakeSnapshot}
              hotspotSnapshot={hotspotSnapshot}
              basemap={activeMapBasemap}
              onBasemapChange={setActiveMapBasemap}
              showTrafficCorridors={showTrafficCorridors}
              trafficDataList={trafficDataList}
              onToggleTraffic={() => setShowTrafficCorridors(prev => !prev)}
              showHeatmapLayer={activeMapBasemap === 'thermal'}
              globeType={globeType}
              onSelectCctv={(cam) => setSelectedCctvCamera(cam)}
              onSelectSignal={(sig) => setSelectedTrafficSignalId(sig.id)}
              onSelectVolcano={(v) => {
                const volcanoStatus = v?.volcanoData || volcanoService.getVolcanoStatus(v?.name) || v;
                setSelectedVolcanoForModal(volcanoStatus);
              }}
              onSelectEarthquake={(eq) => setSelectedEarthquakeForModal(eq)}
              onSelectHotspot={(h) => setSelectedHotspotForModal(h)}
              onSwitchTo2D={(lat, lng, targetZoom = 7.5) => {
                handleToggle3D(false);
                const view = mapRef.current?.getView();
                if (view) {
                  view.animate({
                    center: fromLonLat([lng, lat]),
                    zoom: targetZoom,
                    duration: 400,
                  });
                }
                setTimeout(() => {
                  mapRef.current?.updateSize();
                }, 50);
                setTimeout(() => {
                  mapRef.current?.updateSize();
                }, 300);
              }}
            />
          </Suspense>
        </div>
      )}

      {/* 2D OpenLayers Map - Always rendered, hidden when true 3D globe is shown */}
      <div 
        className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ${
          is3D && (globeType !== 'globe' && globeType !== 'cesium')
            ? 'map-viewport-3d' 
            : 'map-viewport-2d'
        }`}
        style={{
          display: showGeospatialModal ? 'none' : 'flex',
          perspective: (is3D && (globeType !== 'globe' && globeType !== 'cesium')) ? '1200px' : 'none',
          perspectiveOrigin: '50% 50%',
          opacity: (is3D && (globeType === 'globe' || globeType === 'cesium')) ? 0 : 1,
          pointerEvents: (is3D && (globeType === 'globe' || globeType === 'cesium')) ? 'none' : 'auto',
        }}
      >
        <div 
          className={`w-full h-full transition-transform duration-700 ${
            is3D && (globeType !== 'globe' && globeType !== 'cesium') ? 'map-tilt-3d' : 'map-tilt-2d'
          }`}
        >
          {/* OpenLayers Map Canvas (Active in 2D spatial mode, supports native radar overlay) */}
          <div 
            ref={containerRef} 
            className="w-full h-full touch-none select-none" 
            style={{ 
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              opacity: (mapMode === 'spatial' && (weatherMapOverlay === 'none' || weatherRenderMode === 'native')) ? 1 : 0, 
              pointerEvents: (mapMode === 'spatial' && (weatherMapOverlay === 'none' || weatherRenderMode === 'native')) ? 'auto' : 'none' 
            }}
          />

          {/* Full Windy Map Canvas (Only rendered when user chooses external Windy ECMWF viewer mode) */}
          {weatherMapOverlay !== 'none' && weatherRenderMode === 'windy' && mapMode === 'spatial' && (
            <div className="absolute inset-0 w-full h-full z-10 bg-slate-950 animate-in fade-in duration-300">
              <iframe 
                key={`windy-direct-${windyOverlay}-${Math.round(windyCoords.lat * 5) / 5}-${Math.round(windyCoords.lng * 5) / 5}-${windyCoords.zoom}`}
                width="100%" 
                height="100%" 
                src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=%C2%B0C&metricWind=km/h&zoom=${windyCoords.zoom}&overlay=${windyOverlay}&product=ecmwf&level=surface&lat=${windyCoords.lat}&lon=${windyCoords.lng}`} 
                frameBorder="0"
                title="Peta Cuaca Eksternal Windy ECMWF"
                className="w-full h-full block"
                style={{ border: 'none', pointerEvents: 'auto' }}
                allow="fullscreen; geolocation"
              />
            </div>
          )}
        </div>
      </div>



      {/* News Map Placeholder */}
      {mapMode === 'news' && (
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900">
          <Newspaper className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" />
          <h2 className="text-2xl font-bold text-slate-500 dark:text-slate-400">Peta Berita</h2>
          <p className="text-slate-400 dark:text-slate-500 mt-2">Tampilan peta berita terpisah. Segera hadir.</p>
        </div>
      )}

      {/* Art Map Placeholder */}
      {mapMode === 'art' && (
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900">
          <Palette className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" />
          <h2 className="text-2xl font-bold text-slate-500 dark:text-slate-400">Harmony Art</h2>
          <p className="text-slate-400 dark:text-slate-500 mt-2">Kanvas kreasi interaktif terpisah. Segera hadir.</p>
        </div>
      )}

      {/* Top Left Menu Button */}
      <button 
        onClick={() => setMobileOpen(true)}
        className="absolute top-4 left-4 z-20 flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-glass backdrop-blur-md hover:bg-slate-50 dark:bg-slate-900/90 dark:border dark:border-slate-800 text-ink-700 dark:text-slate-300 transition-colors"
        aria-label="Buka Menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Map Mode Switcher & Tools (Top Right) */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2.5">
        {/* Desktop View: Full Segmented Tabs */}
        <div className="hidden md:flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-glass border border-slate-200/50 dark:border-slate-800/50 p-1.5">
          <button 
            onClick={() => setMapMode('spatial')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${mapMode === 'spatial' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <MapIcon2 className="w-4 h-4" /> Data
          </button>
          <button 
            onClick={() => setMapMode('news')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${mapMode === 'news' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <Newspaper className="w-4 h-4" /> Berita
          </button>
          <button 
            onClick={() => setMapMode('art')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${mapMode === 'art' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <Paintbrush className="w-4 h-4" /> Art
          </button>
        </div>

        {/* Mobile View: Compact Square Button + Slide Down Dropdown */}
        <div className="relative md:hidden">
          <button
            onClick={() => setIsModeDropdownOpen((prev) => !prev)}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-glass backdrop-blur-md hover:bg-slate-50 dark:bg-slate-900/90 dark:border dark:border-slate-800 text-slate-700 dark:text-slate-200 transition-all active:scale-95"
            aria-label="Pilih Mode Peta"
            title="Pilih Mode Peta"
          >
            {mapMode === 'spatial' && <MapIcon2 className="h-5 w-5 text-indigo-500" />}
            {mapMode === 'news' && <Newspaper className="h-5 w-5 text-indigo-500" />}
            {mapMode === 'art' && <Paintbrush className="h-5 w-5 text-indigo-500" />}
          </button>

          {/* Backdrop to close dropdown on tap outside */}
          {isModeDropdownOpen && (
            <div 
              className="fixed inset-0 z-30" 
              onClick={() => setIsModeDropdownOpen(false)} 
            />
          )}

          {/* Slide-Down Menu */}
          <AnimatePresence>
            {isModeDropdownOpen && (
              <motion.div
                key="mode-dropdown-menu"
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="absolute top-full mt-2 right-0 z-40 w-56 rounded-2xl bg-white/95 p-2 shadow-2xl backdrop-blur-md border border-slate-200/80 dark:bg-slate-900/95 dark:border-slate-800 origin-top-right flex flex-col gap-1"
              >
                <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800/80">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Mode Peta
                  </p>
                </div>

                {/* Option 1: Peta Bencana */}
                <button
                  onClick={() => {
                    setMapMode('spatial');
                    setIsModeDropdownOpen(false);
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    mapMode === 'spatial'
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 font-medium'
                  }`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    mapMode === 'spatial'
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    <MapIcon2 className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold leading-tight">Peta Bencana</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Data spasial & gempa</p>
                  </div>
                </button>

                {/* Option 2: Peta Berita */}
                <button
                  onClick={() => {
                    setMapMode('news');
                    setIsModeDropdownOpen(false);
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    mapMode === 'news'
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 font-medium'
                  }`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    mapMode === 'news'
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    <Newspaper className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold leading-tight">Peta Berita</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Kabar berita terkini</p>
                  </div>
                </button>

                {/* Option 3: Harmony Art */}
                <button
                  onClick={() => {
                    setMapMode('art');
                    setIsModeDropdownOpen(false);
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    mapMode === 'art'
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 font-medium'
                  }`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    mapMode === 'art'
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    <Paintbrush className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold leading-tight">Harmony Art</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Kanvas kreasi interaktif</p>
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigasi Geospasial Terpadu: GPS Realtime & Orientasi Kompas 360 */}
        <div className="relative flex items-stretch gap-1.5 mt-1 p-1.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 shadow-glass backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-lg select-none">
          {/* Sisi Kiri: GPS Location Finder & Realtime Accuracy Tracking */}
          <div className="relative flex flex-col items-center justify-between gap-1 w-14">
            {/* Tombol GPS Utama dengan Animasi Deteksi */}
            <button
              type="button"
              onClick={handleFindUserLocation}
              disabled={isLocatingUser}
              className={`relative flex h-12 w-12 items-center justify-center rounded-xl transition-all active:scale-95 group cursor-pointer border ${
                isTrackingLive && userCoords
                  ? 'bg-gradient-to-br from-blue-600 via-indigo-600 to-emerald-600 text-white border-blue-400/60 shadow-lg shadow-indigo-500/30 ring-2 ring-emerald-400/40 animate-[pulse_3s_ease-in-out_infinite]'
                  : isLocatingUser
                  ? 'bg-indigo-50 dark:bg-slate-800 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400'
                  : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/80 dark:hover:bg-slate-700/80'
              }`}
              title={
                isTrackingLive && userCoords
                  ? `GPS Aktif: ${userCoords.lat.toFixed(5)}°, ${userCoords.lng.toFixed(5)}° (±${Math.round(userAccuracy || 0)}m). Klik untuk pusatkan kamera.`
                  : isLocatingUser
                  ? "Sedang Mendeteksi Sinyal GPS Presisi..."
                  : "Temukan Lokasi Presisi GPS Realtime"
              }
              aria-label="Temukan Lokasi Saya"
            >
              {/* Animasi Radar / Ping Ripple Saat Lokasi Terdeteksi */}
              {isTrackingLive && userCoords && (
                <>
                  <span className="absolute -inset-1 rounded-xl bg-emerald-500/35 animate-ping pointer-events-none duration-1000" />
                  <span className="absolute -inset-1.5 rounded-xl border border-emerald-400/50 animate-pulse pointer-events-none" />
                </>
              )}

              {/* Status Badge Pojok Kanan Atas */}
              {isTrackingLive && userCoords && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3 z-10">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-xs" />
                </span>
              )}

              {isLocatingUser ? (
                <div className="relative flex items-center justify-center">
                  <span className="absolute inline-flex h-7 w-7 animate-ping rounded-full bg-indigo-400/30" />
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent" />
                </div>
              ) : (
                <div className="relative flex items-center justify-center">
                  {isTrackingLive && userCoords && (
                    <span className="absolute inline-flex h-7 w-7 animate-ping rounded-full bg-blue-300 opacity-40" />
                  )}
                  <LocateFixed
                    className={`h-5 w-5 transition-transform group-hover:scale-110 ${
                      isTrackingLive && userCoords ? 'text-white drop-shadow-sm' : ''
                    }`}
                  />
                </div>
              )}
            </button>

            {/* Status Akurasi GPS */}
            <div className="flex items-center justify-center gap-0.5 text-[9px] font-mono font-bold leading-tight">
              {isTrackingLive && userCoords ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {userAccuracy ? `±${Math.round(userAccuracy)}m` : 'LIVE'}
                </span>
              ) : isLocatingUser ? (
                <span className="text-indigo-500 dark:text-indigo-400 animate-pulse text-[8px]">
                  Mencari...
                </span>
              ) : (
                <span className="text-slate-400 dark:text-slate-500">
                  GPS
                </span>
              )}
            </div>

            {/* Tombol Sub-Aksi: Pusatkan Kembali / Lacak */}
            <div className="flex items-center justify-center w-full">
              <button
                type="button"
                onClick={handleFindUserLocation}
                disabled={isLocatingUser}
                className={`w-full py-0.5 px-1 rounded-md text-[9px] font-bold transition-all text-center flex items-center justify-center gap-1 ${
                  isTrackingLive && userCoords
                    ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 active:scale-95'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
                title={isTrackingLive ? "Pusatkan Kamera ke Posisi Saya" : "Mulai Deteksi Lokasi"}
              >
                <Navigation className={`w-2.5 h-2.5 ${isTrackingLive && userCoords ? 'fill-current' : ''}`} />
                <span>{isTrackingLive && userCoords ? 'Pusat' : 'Cari'}</span>
              </button>
            </div>

            {/* Pill Info Wilayah / Presisi */}
            <div
              className={`w-full text-center px-1 py-0.5 rounded text-[8px] font-medium truncate ${
                isTrackingLive && userPreciseLocation?.village
                  ? 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold'
                  : 'bg-slate-100/60 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500'
              }`}
              title={userPreciseLocation?.fullAddress || (isTrackingLive ? "Lokasi GPS Terverifikasi" : "Sensor Lokasi Presisi")}
            >
              {isTrackingLive && userPreciseLocation?.village
                ? userPreciseLocation.village
                : 'Presisi'}
            </div>
          </div>

          {/* Divider Vertikal Halus */}
          <div className="w-px self-stretch bg-slate-200/80 dark:bg-slate-800 my-0.5" />

          {/* Sisi Kanan: Interactive 360 Compass & Wind Direction Rose */}
          <div className="relative flex flex-col items-center justify-between gap-1 w-14">
            {/* Compass Dial Face */}
            <button
              type="button"
              onClick={resetRotationNorth}
              className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 transition-transform active:scale-95 group cursor-pointer"
              title={`Orientasi Kompas: ${currentRotation}° (${getCardinalDirection(currentRotation).name}). Klik untuk reset ke arah Utara (0°).`}
            >
              {/* Rotating Ring with Cardinal Marks */}
              <div
                className="absolute inset-0.5 rounded-lg flex items-center justify-center transition-transform duration-300 pointer-events-none"
                style={{ transform: `rotate(${-currentRotation}deg)` }}
              >
                <span className="absolute top-0.5 text-[9px] font-black text-red-500">U</span>
                <span className="absolute right-1 text-[7px] font-bold text-slate-400">T</span>
                <span className="absolute bottom-0.5 text-[7px] font-bold text-slate-400">S</span>
                <span className="absolute left-1 text-[7px] font-bold text-slate-400">B</span>

                {/* North / South Needle */}
                <div className="relative w-1.5 h-6 flex flex-col items-center">
                  <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[12px] border-b-red-500" />
                  <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[12px] border-t-slate-400 dark:border-t-slate-500" />
                </div>

                {/* Wind Direction Arrow (Cyan) */}
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ transform: `rotate(${windDirectionDeg}deg)` }}
                >
                  <div className="w-0.5 h-5 bg-cyan-400 opacity-60" />
                  <div className="absolute -top-0.5 w-0 h-0 border-l-[2.5px] border-l-transparent border-r-[2.5px] border-r-transparent border-b-[5px] border-b-cyan-400" />
                </div>
              </div>

              {/* Pivot */}
              <div className="w-2 h-2 rounded-full bg-slate-800 dark:bg-white z-10 shadow-sm" />
            </button>

            {/* Heading Reading */}
            <div className="flex items-center gap-0.5 text-[9px] font-mono font-bold text-slate-700 dark:text-slate-300">
              <span className="text-red-500">{getCardinalDirection(currentRotation).short}</span>
              <span>{currentRotation}°</span>
            </div>

            {/* Rotation Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => rotateMapBy(-15)}
                className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                title="Putar -15° (Kiri)"
              >
                <RotateCcw className="w-2.5 h-2.5" />
              </button>
              <button
                type="button"
                onClick={() => rotateMapBy(15)}
                className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                title="Putar +15° (Kanan)"
              >
                <RotateCw className="w-2.5 h-2.5" />
              </button>
            </div>

            {/* Wind Speed Pill (Arah Hembusan Angin) */}
            <button
              type="button"
              onClick={() => setShowWindDetail((prev) => !prev)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 text-[9px] font-bold transition-all"
              title={`Arah Angin: ${getCardinalDirection(windDirectionDeg).name} (${windDirectionDeg}°) @ ${windSpeedKmh} km/jam`}
            >
              <Wind className="w-2.5 h-2.5" />
              <span>{windSpeedKmh} km/j</span>
            </button>
          </div>
        </div>

        {/* Tombol Cepat: Cuaca & Navigasi Rute (Tepat di Bawah GPS & Kompas) */}
        <div className="relative flex items-stretch gap-1.5 p-1.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 shadow-glass backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-lg select-none">
          {/* Tombol Cuaca */}
          <button
            type="button"
            onClick={() => openStudioDomain('weather')}
            className="relative flex flex-col items-center justify-between gap-1 w-14 py-2 px-1 rounded-xl bg-gradient-to-b from-sky-500/10 via-indigo-500/5 to-transparent hover:from-sky-500/20 hover:via-indigo-500/15 border border-sky-500/25 hover:border-sky-500/40 text-slate-800 dark:text-slate-100 transition-all hover:scale-[1.03] active:scale-95 group cursor-pointer shadow-xs"
            title="Buka Studio Cuaca, Presipitasi & Radar Doppler 16 Sumber"
            aria-label="Buka Studio Cuaca"
          >
            <div className="relative flex items-center justify-center h-8 w-8 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 group-hover:bg-sky-500 group-hover:text-white transition-all shadow-2xs">
              <CloudSun className="w-4.5 h-4.5 transition-transform group-hover:scale-110" />
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
              </span>
            </div>
            <div className="text-center w-full">
              <span className="text-[10px] font-bold block text-slate-800 dark:text-white leading-tight">Cuaca</span>
              <span className="text-[8px] font-mono font-semibold text-sky-600 dark:text-sky-400 block truncate">16 Sumber</span>
            </div>
          </button>

          {/* Divider Vertikal Halus */}
          <div className="w-px self-stretch bg-slate-200/80 dark:bg-slate-800 my-0.5" />

          {/* Tombol Navigasi Rute / Lintasan & Trafik Jalan */}
          <button
            type="button"
            onClick={() => {
              const willOpen = !showTrafficCorridors;
              closeMapDrawers();
              setShowRouteModal(false);
              setTrafficDrawerTab('corridors');
              setShowTrafficCorridors(willOpen);
            }}
            className="relative flex flex-col items-center justify-between gap-1 w-14 py-2 px-1 rounded-xl bg-gradient-to-b from-emerald-500/10 via-teal-500/5 to-transparent hover:from-emerald-500/20 hover:via-teal-500/15 border border-emerald-500/25 hover:border-emerald-500/40 text-slate-800 dark:text-slate-100 transition-all hover:scale-[1.03] active:scale-95 group cursor-pointer shadow-xs"
            title="Buka Panel Lintasan & Trafik Jalan"
            aria-label="Buka Lintasan & Trafik Jalan"
          >
            <div className="relative flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-2xs">
              <Route className="w-4.5 h-4.5 transition-transform group-hover:scale-110" />
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>
            <div className="text-center w-full">
              <span className="text-[10px] font-bold block text-slate-800 dark:text-white leading-tight">Rute</span>
              <span className="text-[8px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 block truncate">Navigasi</span>
            </div>
          </button>
        </div>
      </div>

      {/* Custom OpenLayers & 3D Tilt Styles */}
      <style>{`
        .map-viewport-3d {
          overflow: hidden;
        }
        .map-tilt-3d {
          transform: rotateX(46deg) scale(1.36) translateY(-8%);
          transform-origin: 50% 70%;
          transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .map-tilt-2d {
          transform: rotateX(0deg) scale(1) translateY(0);
          transform-origin: 50% 50%;
          transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .ol-zoom {
          ${weatherMapOverlay !== 'none' ? 'display: none !important;' : `
          top: auto !important;
          bottom: 8.5rem !important;
          left: 1rem !important;
          z-index: 10 !important;
          `}
        }
        .ol-zoom button {
          background-color: rgba(255, 255, 255, 0.9) !important;
          color: #334155 !important;
          border-radius: 0.5rem !important;
          margin-top: 0.25rem !important;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) !important;
          width: 2rem !important;
          height: 2rem !important;
          font-size: 1.25rem !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
        }
        .ol-zoom button:hover {
          background-color: white !important;
        }
        html.dark .ol-zoom button {
          background-color: rgba(15, 23, 42, 0.9) !important;
          color: #cbd5e1 !important;
          border: 1px solid #1e293b !important;
        }
        html.dark .ol-zoom button:hover {
          background-color: rgba(30, 41, 59, 0.9) !important;
        }
        .ol-zoom .ol-zoom-out {
          margin-top: 0.5rem !important;
        }
        .ol-control {
          background-color: transparent !important;
          padding: 0 !important;
        }
      `}</style>

      {mapMode === 'spatial' && (
        <>
      {/* Loading Indicator for Map Layers */}
      {activeLayerLoads > 0 && (
        <div className="absolute top-16 right-4 sm:top-20 z-30 flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-glass backdrop-blur-md dark:bg-slate-900/90 dark:border dark:border-slate-800 animate-in fade-in slide-in-from-top-4 duration-300">
           <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
           <span className="text-xs font-bold text-ink-900 dark:text-white">Memuat Data Peta...</span>
        </div>
      )}

      {/* Top Search Bar (Beside Menu Button, leaving room for right-side switcher on mobile) */}
      <div className="absolute top-4 left-16 z-10 w-[calc(100%-8.5rem)] md:w-80 lg:w-96 transition-all duration-300">
        <div className="relative">
          <div className="flex h-11 w-full items-center overflow-hidden rounded-full bg-white px-4 shadow-glass backdrop-blur-md dark:bg-slate-900/90 dark:border dark:border-slate-800 focus-within:ring-2 focus-within:ring-brand-500 transition-shadow">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              id="maps-school-search-input"
              name="schoolSearch"
              type="text"
              placeholder="Cari sekolah..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              className="h-full w-full bg-transparent px-3 text-sm text-ink-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {isSearchFocused && searchQuery.trim().length >= 3 && (
            <div className="absolute top-full left-0 mt-2 w-full rounded-2xl bg-white py-2 shadow-xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800 overflow-hidden max-h-64 overflow-y-auto">
              {searchResults.length > 0 ? (
                searchResults.map((s) => (
                  <button
                    key={s[0]}
                    onClick={() => handleSelectSchool(s)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink-900 dark:text-white">{s[4]}</p>
                      <p className="text-[10px] text-slate-500">Sekolah</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-center text-sm text-slate-500">
                  Tidak ada sekolah yang cocok.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Top Quick Actions: Daerah Rawan Bencana, Panduan WebGIS & Experience Mode Switcher */}
      <div className="absolute top-4 left-[calc(4rem+20.5rem)] lg:left-[calc(4rem+24.5rem)] z-20 hidden md:flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowDisasterRiskCenter(true)}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-gradient-to-r from-rose-500/15 to-amber-500/15 hover:from-rose-500/25 hover:to-amber-500/25 border border-rose-400/40 text-rose-700 dark:text-rose-300 text-xs font-bold shadow-glass backdrop-blur-md transition-all active:scale-95 cursor-pointer"
          title="Buka Pusat Edukasi Daerah Rawan Bencana & Profil Risiko Sekolah"
        >
          <span className="text-sm">⚠️</span>
          <span>Zona Rawan Bencana</span>
          <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded-full bg-rose-500 text-white">
            Edukasi
          </span>
        </button>

        <button
          type="button"
          onClick={() => setShowWebGisTutorial(true)}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-white/90 hover:bg-white dark:bg-slate-900/90 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-sky-700 dark:text-sky-300 text-xs font-bold shadow-glass backdrop-blur-md transition-all active:scale-95 cursor-pointer"
          title="Buka Panduan Tutorial Interaktif Penggunaan WebGIS"
        >
          <span className="text-sm">❓</span>
          <span>Panduan WebGIS</span>
        </button>

      </div>

      {/* Harmony Left Top Stack: Conditional Education Risk Card vs Expert GIS Toolbar */}
      <div className="absolute top-20 left-4 z-30 flex flex-col items-start gap-2.5 pointer-events-none transition-all duration-200">
        {uiExperienceMode === 'education' && !is3D ? (
          <div className="pointer-events-auto relative z-30">
            <SchoolRiskSynthesisCard
              schoolId={activeSchoolId}
              schoolName={activeSchoolName}
              lat={activeSchoolLat}
              lng={activeSchoolLng}
              onOpenScenarioModal={() => setShowGroundedScenarioModal(true)}
              onSwitchToExpertMode={() => {
                setUiExperienceMode('expert');
                try { window.localStorage.setItem('hm_ui_experience_mode', 'expert'); } catch (e) {}
              }}
            />
          </div>
        ) : (
          <>
            <div className="pointer-events-auto relative z-30">
              <MapGISToolbar
                className="relative"
                map={mapRef.current}
                drawingSource={drawingSourceRef.current}
                drawingVisible={showUserDrawings}
                drawingOpacity={userDrawingsOpacity}
                selectedFeatureId={selectedFeatureId}
                onSelectFeatureId={setSelectedFeatureId}
                onAOISet={(aoi) => setActiveAOI(aoi)}
                onOpenAttributeTable={() => setShowAttributeTable(true)}
                onIdentifyCoordinate={(coord) => {
                  setIdentifiedCoordinate(coord);
                  setShowIdentifyPanel(true);
                }}
                onOpenGeoprocess={() => setShowGeoprocessModal(true)}
                onOpenLayerManager={() => {
                  setShowPanel(false);
                  setShowLayerManager(true);
                }}
              />
            </div>

            {showWeatherCard && (
              <div className="pointer-events-auto relative z-10 transition-all duration-200">
                <MapWeatherObservationCard
                  lat={userCoords?.lat ?? -7.2575}
                  lng={userCoords?.lng ?? 112.7521}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Spatial Attribute Table */}
      <MapAttributeTable
        isOpen={showAttributeTable}
        onClose={() => setShowAttributeTable(false)}
        map={mapRef.current}
        layers={attributeLayers}
        selectedFeatureId={selectedFeatureId}
        onSelectFeatureId={setSelectedFeatureId}
      />

      {/* Spatial Identify Panel */}
      <MapIdentifyPanel
        isOpen={showIdentifyPanel}
        onClose={() => setShowIdentifyPanel(false)}
        coordinate={identifiedCoordinate}
        onGenerateBuffer={(center, radiusKm) => {
          const buf = aoiService.createBufferAOI(center[1], center[0], radiusKm);
          const ring = buf.geometry.coordinates[0];
          const mercatorRing = ring.map((c: any) => fromLonLat(c));
          const geom = new Polygon([mercatorRing]);
          const feat = new Feature({
            geometry: geom,
            name: `Buffer ${radiusKm}km (${center[1].toFixed(4)}, ${center[0].toFixed(4)})`,
            type: 'buffer',
            radiusKm,
          });
          feat.setStyle(new Style({
            fill: new Fill({ color: 'rgba(99, 102, 241, 0.15)' }),
            stroke: new Stroke({ color: '#6366f1', width: 2, lineDash: [6, 4] })
          }));
          analysisSourceRef.current.addFeature(feat);
        }}
      />

      {/* Hierarchical Map Layer Manager */}
      <MapLayerManager
        isOpen={showLayerManager}
        onClose={() => setShowLayerManager(false)}
        layers={managedLayers}
      />

      {/* Geoprocessing & Spatial Analysis Modal */}
      <MapGeoprocessingModal
        isOpen={showGeoprocessModal}
        onClose={() => setShowGeoprocessModal(false)}
        activeAOI={activeAOI}
        pointDatasets={geoprocessPointDatasets}
        onAddAnalysisFeature={(feature, _label) => {
          analysisSourceRef.current.addFeature(feature);
        }}
      />

      {/* Realtime GPS Status Toast / Card */}
      {locationStatusToast && (
        <div className={`absolute z-30 max-w-xs sm:max-w-md rounded-3xl bg-white/95 dark:bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-3 duration-300 ${
          showPanel || showLayerManager ? 'bottom-20 left-6 sm:left-24' : 'bottom-36 right-6'
        }`}>
          <div className="flex items-start gap-3">
            {locationStatusToast.type === 'success' ? (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 mt-0.5">
                <LocateFixed className="h-5 w-5 animate-pulse" />
              </div>
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 mt-0.5">
                <AlertCircle className="h-5 w-5" />
              </div>
            )}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {locationStatusToast.title || (locationStatusToast.type === 'success' ? 'Lokasi GPS Terdeteksi' : 'Akses Lokasi Terkendala')}
                </p>
                {locationStatusToast.accuracy && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-bold">
                    ±{locationStatusToast.accuracy}m
                  </span>
                )}
              </div>

              {locationStatusToast.village && (
                <div className="mt-1.5 p-2.5 rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 space-y-0.5 text-xs">
                  <div className="font-bold text-indigo-600 dark:text-indigo-400 truncate flex items-center gap-1">
                    <span>{locationStatusToast.village}</span>
                    {locationStatusToast.subDistrict && (
                      <span className="text-slate-400 font-normal">• {locationStatusToast.subDistrict}</span>
                    )}
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 text-[11px] truncate">
                    {locationStatusToast.city}, {locationStatusToast.province}
                  </div>
                  {locationStatusToast.road && (
                    <div className="text-slate-500 text-[10px] truncate pt-0.5 border-t border-slate-200/50 dark:border-slate-700/50">
                      📍 {locationStatusToast.road}
                    </div>
                  )}
                </div>
              )}

              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {locationStatusToast.message}
              </p>

              {/* Laporan Ketinggian & Koordinat GNSS Pengguna */}
              {locationStatusToast.elevationReport && (
                <div className="mt-2 p-2.5 rounded-2xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-transparent border border-sky-500/25 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Mountain className="w-3.5 h-3.5 text-sky-500" />
                      <span className="font-extrabold text-slate-900 dark:text-white font-mono text-xs">
                        {locationStatusToast.elevationReport.altitudeM >= 0
                          ? `+${locationStatusToast.elevationReport.altitudeM}`
                          : locationStatusToast.elevationReport.altitudeM}{' '}
                        mdpl
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        (Elevasi Medan)
                      </span>
                    </div>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 font-bold border border-sky-500/20">
                      {locationStatusToast.elevationReport.topographyZone}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-600 dark:text-slate-300 pt-1 border-t border-sky-500/20">
                    <span>
                      {locationStatusToast.elevationReport.lat.toFixed(5)}°,{' '}
                      {locationStatusToast.elevationReport.lng.toFixed(5)}°
                    </span>
                    <span className="text-slate-400 font-sans">
                      {locationStatusToast.elevationReport.dmsDisplay}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-400 pt-0.5">
                    <span>
                      Tekanan: {locationStatusToast.elevationReport.estimatedBarometricPressureHpa} hPa
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          locationStatusToast.elevationReport!.formattedReportText
                        );
                        alert('Laporan Ketinggian & Koordinat GNSS berhasil disalin ke clipboard!');
                      }}
                      className="text-sky-600 dark:text-sky-400 hover:underline font-bold cursor-pointer"
                    >
                      Salin Laporan
                    </button>
                  </div>
                </div>
              )}

              {locationStatusToast.type === 'success' && userCoords && (
                <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                  <button
                    type="button"
                    onClick={() => navigate('/app/geospatial')}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-bold transition-all active:scale-95 shadow-sm"
                  >
                    <Satellite className="h-3 w-3" />
                    <span>Studio Geospasial</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRouteModal(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold transition-all active:scale-95 shadow-sm"
                  >
                    <Navigation className="h-3 w-3" />
                    <span>Panduan Rute AI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (watchIdRef.current !== null) {
                        navigator.geolocation.clearWatch(watchIdRef.current);
                        watchIdRef.current = null;
                      }
                      setIsTrackingLive(false);
                      setLocationStatusToast(null);
                    }}
                    className="text-[10px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium ml-auto"
                  >
                    Tutup
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setLocationStatusToast(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Wind & Atmospheric Vector Detail Modal / Card */}
      <AnimatePresence>
        {showWindDetail && (
          <motion.div
            key="wind-detail-card"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-44 right-20 z-30 w-72 rounded-2xl bg-white/95 dark:bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-2"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-white">
                <Wind className="w-4 h-4 text-cyan-500" />
                <span>Fitur Arah Mata Angin</span>
              </div>
              <button
                type="button"
                onClick={() => setShowWindDetail(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Arah Hembusan:</span>
                <span className="font-bold text-cyan-600 dark:text-cyan-400">
                  {getCardinalDirection(windDirectionDeg).name} ({windDirectionDeg}°)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Kecepatan Angin:</span>
                <span className="font-bold">{windSpeedKmh} km/jam</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Skala Beaufort:</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {windSpeedKmh < 12 ? '2 (Angin Sepoi-sepoi)' : windSpeedKmh < 20 ? '3 (Angin Lembut)' : '4 (Angin Sedang)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Orientasi Peta:</span>
                <span className="font-mono font-bold">{currentRotation}° ({getCardinalDirection(currentRotation).name})</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
              Data hembusan atmosfer diintegrasikan dari sensor meteorologi dan konsensus ECMWF/GFS.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Side Drawer: Struktur Lintasan Jalan & Koridor Trafik Indonesia (Right-Side Drawer) */}
      <AnimatePresence>
        {showTrafficCorridors && (
          <motion.div
            key="traffic-corridors-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowTrafficCorridors(false)}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 sm:hidden"
          />
        )}
        {showTrafficCorridors && (
          <motion.div
            key="traffic-corridors-panel"
            initial={{ opacity: 0, x: 28, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 28, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="fixed sm:absolute top-auto bottom-0 sm:top-4 sm:bottom-4 right-0 sm:right-4 left-0 sm:left-auto z-50 w-full sm:w-[415px] max-h-[88vh] sm:max-h-[calc(100vh-2rem)] rounded-t-3xl sm:rounded-3xl bg-white/95 dark:bg-slate-900/95 shadow-2xl backdrop-blur-2xl border-t sm:border border-slate-200/80 dark:border-slate-800 flex flex-col overflow-hidden"
          >
              {/* Mobile Drag Handle Bar */}
              <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

              {/* Fixed Header Section */}
              <div className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800/80 shrink-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400 shadow-sm">
                      <Car className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-display text-base font-bold text-ink-900 dark:text-white leading-tight">
                          Lintasan &amp; Trafik Jalan
                        </h2>
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-600 text-white shadow-xs">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                          </span>
                          Live
                        </span>
                      </div>
                      <p className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                        {isAutoSyncTraffic ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            Sinkron otomatis ({syncCountdown}d)
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-bold">
                            Telemetri dijeda
                          </span>
                        )}{' '}
                        • {lastTrafficSyncTime}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Auto-Sync Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setIsAutoSyncTraffic((prev) => !prev)}
                      className={`px-2 py-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                        isAutoSyncTraffic
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                      title={isAutoSyncTraffic ? 'Klik untuk menjeda pembaruan telemetri otomatis' : 'Klik untuk mengaktifkan pembaruan otomatis (8 detik)'}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isAutoSyncTraffic ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                      <span>{isAutoSyncTraffic ? 'Auto 8d' : 'Manual'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRefreshTraffic}
                      className="p-2 rounded-xl text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Perbarui Data &amp; Sinkronkan Kecepatan Terkini"
                    >
                      <RotateCw className={`w-4 h-4 ${isTrafficRefreshing ? 'animate-spin text-purple-600' : ''}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowTrafficCorridors(false)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Tutup Panel Trafik"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick God's Eye Layer Switches */}
              <div className="px-3 py-2 bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800 grid grid-cols-4 gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (activeMapBasemap === 'traffic') {
                      setActiveMapBasemap('osm');
                      setShowTrafficCorridors(false);
                    } else {
                      setShowTrafficCorridors((v) => !v);
                    }
                  }}
                  className={`py-1 px-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    activeMapBasemap === 'traffic' || showTrafficCorridors
                      ? 'bg-purple-600 text-white border-purple-500 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                  title="Tampilkan garis koridor geometri jalan raya & tol OSM"
                >
                  <span>🛣️</span>
                  <span className="truncate">Koridor {activeMapBasemap === 'traffic' || showTrafficCorridors ? 'ON' : 'OFF'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const next = !showTrafficControlBar;
                    setShowTrafficControlBar(next);
                    if (next) {
                      setShowBottomDock(true);
                      try { window.localStorage.setItem(`hm_show_bottom_dock_${activeUserId}`, 'true'); } catch (e) {}
                    }
                    try { window.localStorage.setItem(`hm_traffic_bar_${activeUserId}`, String(next)); } catch (e) {}
                  }}
                  className={`py-1 px-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    showTrafficControlBar
                      ? 'bg-teal-700 text-white border-teal-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                  title="Tampilkan panel kontrol lalu lintas Google Maps di layar bawah"
                >
                  <span>🎛️</span>
                  <span className="truncate">Bar {showTrafficControlBar ? 'ON' : 'OFF'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowTrafficCctv((v) => !v)}
                  className={`py-1 px-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    showTrafficCctv
                      ? 'bg-cyan-600 text-white border-cyan-500 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                  title="Tampilkan titik kamera CCTV jalan raya & pantau live"
                >
                  <span>📹</span>
                  <span className="truncate">CCTV {showTrafficCctv ? 'ON' : 'OFF'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowTrafficSignals((v) => !v)}
                  className={`py-1 px-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    showTrafficSignals
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                  title="Tampilkan lampu merah & siklus hitung mundur ATCS"
                >
                  <span>🚦</span>
                  <span className="truncate">ATCS {showTrafficSignals ? 'ON' : 'OFF'}</span>
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="grid grid-cols-5 p-1.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 text-[10px] font-bold shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => setTrafficDrawerTab('corridors')}
                  className={`py-1.5 px-0.5 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                    trafficDrawerTab === 'corridors'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>🛣️ Koridor</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTrafficDrawerTab('probes')}
                  className={`py-1.5 px-0.5 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                    trafficDrawerTab === 'probes'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>🔥 Densitas</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTrafficDrawerTab('cctv')}
                  className={`py-1.5 px-0.5 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                    trafficDrawerTab === 'cctv'
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>📹 CCTV ({trafficCctvService.getAllCameras().length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTrafficDrawerTab('signals')}
                  className={`py-1.5 px-0.5 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                    trafficDrawerTab === 'signals'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>🚦 ATCS ({trafficSignalsService.getAllSignals().length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTrafficDrawerTab('byok')}
                  className={`py-1.5 px-0.5 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                    trafficDrawerTab === 'byok'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>🔑 API</span>
                </button>
              </div>

              {/* Tab Content: Koridor & Kemacetan */}
              {trafficDrawerTab === 'corridors' && (
                <>
                  {/* Status Banner with Live Telemetry Pulse & Stats */}
                  <div className="p-3 bg-purple-50/70 dark:bg-purple-950/30 border-b border-purple-100/80 dark:border-purple-900/40 text-xs shrink-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 font-bold text-[11px]">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>God&apos;s Eye Realtime Telemetry</span>
                      </div>
                      <span className="text-[9.5px] px-2 py-0.5 rounded-full font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        Sinkron 15s • Aliran Nyata
                      </span>
                    </div>

                    {/* Realtime KPI Pill Strip */}
                    <div className="grid grid-cols-3 gap-1.5 py-1.5 px-2.5 rounded-xl bg-white/80 dark:bg-slate-900/70 border border-purple-100/90 dark:border-purple-900/60 text-[10px]">
                      <div className="text-center">
                        <span className="text-slate-400 block text-[9px]">Laju Rata-Rata</span>
                        <strong className="font-mono text-purple-700 dark:text-purple-300 font-bold text-[11px]">
                          {Math.round(trafficDataList.reduce((acc, c) => acc + c.speedKmh, 0) / (trafficDataList.length || 1))} km/j
                        </strong>
                      </div>
                      <div className="text-center border-x border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400 block text-[9px]">Titik Macet</span>
                        <strong className="font-mono text-rose-600 dark:text-rose-400 font-bold text-[11px]">
                          {trafficDataList.filter((c) => c.status === 'Padat Merayap' || c.status === 'Macet Total').length} Ruas
                        </strong>
                      </div>
                      <div className="text-center">
                        <span className="text-slate-400 block text-[9px]">Total Koridor</span>
                        <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                          {trafficDataList.length} Ruas
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Severe Bottlenecks Alert Widget */}
                  {liveTrafficSummary?.severeBottlenecks && liveTrafficSummary.severeBottlenecks.length > 0 && (
                    <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900 text-xs shrink-0 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5 text-[11px]">
                          <span className="flex h-2 w-2 rounded-full bg-rose-600 animate-ping"></span>
                          Kemacetan Kritis Terkini (Live API)
                        </span>
                        <span className="text-[9.5px] font-mono text-rose-600 dark:text-rose-400 font-bold">
                          {liveTrafficSummary.severeBottlenecks.length} Titik
                        </span>
                      </div>
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                        {liveTrafficSummary.severeBottlenecks.slice(0, 3).map((sb) => (
                          <div key={sb.corridorId} className="flex items-center justify-between p-1.5 rounded-lg bg-white/90 dark:bg-slate-900/80 border border-rose-200/80 dark:border-rose-900/60 text-[10px]">
                            <div className="min-w-0 pr-2">
                              <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">{sb.name}</span>
                              <span className="text-slate-500 dark:text-slate-400 text-[9px]">{sb.location}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold font-mono text-rose-600 dark:text-rose-400 block">{sb.currentSpeedKmh} km/j</span>
                              <span className="text-[9px] text-amber-600 font-medium">+{sb.delayMinutes} mnt tunda</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Search Bar & Filters */}
                  <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 space-y-2 bg-slate-50/60 dark:bg-slate-900/50 shrink-0">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="maps-traffic-search-input"
                        name="trafficSearch"
                        type="text"
                        value={trafficSearchQuery}
                        onChange={(e) => setTrafficSearchQuery(e.target.value)}
                        placeholder="Cari jalan, tikus, alternatif, kota..."
                        className="w-full pl-9 pr-7 py-1.5 text-xs rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-2xs"
                      />
                      {trafficSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setTrafficSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Tier Filter Tabs */}
                    <div className="flex flex-wrap gap-1">
                      {[
                        { key: 'all', label: 'Semua Ruas' },
                        { key: 'local', label: '🛵 Jalan Kecil & Tikus' },
                        { key: 'collector', label: 'Kolektor' },
                        { key: 'arterial', label: 'Arteri Kota' },
                        { key: 'expressway', label: 'Tol Trans-Pulau' },
                      ].map((tab) => {
                        const isActive = trafficTierFilter === tab.key;
                        return (
                          <button
                            key={tab.key}
                            type="button"
                            onClick={() => setTrafficTierFilter(tab.key as any)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                              isActive
                                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                            }`}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Island Filter Chips */}
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-0.5">
                      {[
                        { key: 'all', label: 'Semua Pulau' },
                        { key: 'Jawa', label: 'Jawa' },
                        { key: 'Sumatera', label: 'Sumatera' },
                        { key: 'Bali', label: 'Bali' },
                        { key: 'Kalimantan', label: 'Kalimantan' },
                        { key: 'Sulawesi', label: 'Sulawesi' },
                        { key: 'Papua', label: 'Papua' },
                      ].map((tab) => {
                        const isActive = trafficIslandFilter === tab.key;
                        return (
                          <button
                            key={tab.key}
                            type="button"
                            onClick={() => setTrafficIslandFilter(tab.key)}
                            className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap transition-all cursor-pointer ${
                              isActive
                                ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Scrollable Corridors List */}
                  <div className="p-3 overflow-y-auto space-y-2 flex-1">
                    {filteredCorridors.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        <Car className="w-8 h-8 mx-auto mb-2 opacity-40 text-purple-400" />
                        <p className="font-semibold text-slate-600 dark:text-slate-300">Tidak ada koridor yang sesuai</p>
                        <p className="text-[10.5px] mt-1">Coba ubah kata kunci pencarian atau filter pulau/ruas jalan.</p>
                      </div>
                    ) : (
                      filteredCorridors.map((corridor) => {
                        const isSelected = selectedCorridor?.id === corridor.id;
                        const statusColor =
                          corridor.status === 'Lancar'
                            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                            : corridor.status === 'Ramai Lancar'
                            ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30'
                            : 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30';

                        const statusDot =
                          corridor.status === 'Lancar'
                            ? 'bg-emerald-500'
                            : corridor.status === 'Ramai Lancar'
                            ? 'bg-amber-500'
                            : 'bg-rose-500';

                        const tierBadgeColor =
                          corridor.tier === 'expressway'
                            ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                            : corridor.tier === 'arterial'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            : corridor.tier === 'collector'
                            ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                            : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';

                        return (
                          <div
                            key={corridor.id}
                            className={`p-3 rounded-2xl border transition-all text-xs space-y-2 ${
                              isSelected
                                ? 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-400 dark:border-purple-600 shadow-md ring-1 ring-purple-400/40'
                                : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100/80 dark:hover:bg-slate-800/70'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${tierBadgeColor}`}>
                                    {corridor.routeType}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                    {corridor.island}
                                  </span>
                                </div>
                                <h3 className="font-bold text-slate-800 dark:text-white leading-tight mt-1 text-xs">
                                  {corridor.name}
                                </h3>
                              </div>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 flex items-center gap-1 ${statusColor}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                                {corridor.status}
                              </span>
                            </div>

                            <div className="flex items-center justify-between py-1 px-2.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 text-[10.5px]">
                              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                                <Gauge className="w-3.5 h-3.5 text-purple-500" />
                                <span>Kecepatan:</span>
                                <strong className="font-mono text-slate-900 dark:text-white font-bold">{corridor.speedKmh} km/jam</strong>
                              </div>
                              <div className="h-3 w-[1px] bg-slate-200 dark:bg-slate-700"></div>
                              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                                <span>Panjang:</span>
                                <strong className="font-mono text-slate-900 dark:text-white font-bold">{corridor.lengthKm} km</strong>
                              </div>
                            </div>

                            {/* TomTom Live Flow Probe Result */}
                            {tomtomProbeResult && tomtomProbeResult.corridorId === corridor.id && (
                              <div
                                className={`p-2 rounded-xl text-[10px] space-y-1 ${
                                  tomtomProbeResult.status === 'LIVE'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                                    : tomtomProbeResult.status === 'NOT_CONFIGURED'
                                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700'
                                }`}
                              >
                                <div className="flex items-center justify-between font-bold">
                                  <span>TomTom Proxy: {tomtomProbeResult.status}</span>
                                  {tomtomProbeResult.roadClosure !== undefined && (
                                    <span className={tomtomProbeResult.roadClosure ? 'text-rose-600 font-bold' : 'text-emerald-600'}>
                                      {tomtomProbeResult.roadClosure ? 'Ditutup' : 'Terbuka'}
                                    </span>
                                  )}
                                </div>
                                <p className="leading-snug">{tomtomProbeResult.message}</p>
                              </div>
                            )}

                            {/* Action Row */}
                            <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between gap-1.5 flex-wrap">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleFocusCorridor(corridor)}
                                  className="px-2.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10.5px] transition-all active:scale-95 shadow-2xs flex items-center gap-1 cursor-pointer"
                                  title="Pusatkan peta ke koridor ini"
                                >
                                  <Navigation className="w-3 h-3" />
                                  <span>Pusatkan</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleCheckTomTomLive(corridor)}
                                  disabled={tomtomProbeResult?.corridorId === corridor.id && tomtomProbeResult.loading}
                                  className="px-2 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold text-[10px] transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                  title="Periksa data live TomTom Flow API via proxy backend"
                                >
                                  <Radio className={`w-3 h-3 ${tomtomProbeResult?.corridorId === corridor.id && tomtomProbeResult.loading ? 'animate-pulse' : ''}`} />
                                  <span>{tomtomProbeResult?.corridorId === corridor.id && tomtomProbeResult.loading ? 'Cek...' : 'Uji TomTom'}</span>
                                </button>
                              </div>

                              <div className="flex items-center gap-1">
                                <a
                                  href={`https://www.google.com/maps/@${corridor.center[1]},${corridor.center[0]},14z/data=!5m1!1e1`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white hover:bg-purple-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-purple-600 dark:text-purple-400 font-bold text-[10px] border border-purple-200 dark:border-purple-800 transition-all shadow-2xs"
                                  title="Buka Live Traffic resmi di Google Maps"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Google Live</span>
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}

              {/* Tab Content: GPS Probes & Algoritma Densitas Kemacetan Crowdsource */}
              {trafficDrawerTab === 'probes' && (
                <div className="p-3 overflow-y-auto space-y-3 flex-1">
                  {/* Crowdsource Banner & Overview */}
                  <div className="p-3 bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/40 dark:to-orange-950/30 rounded-2xl border border-rose-200/80 dark:border-rose-900/60 text-xs space-y-2">
                    <div className="flex items-center justify-between font-bold text-rose-800 dark:text-rose-200 text-[11px]">
                      <span className="flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                        Prediksi Kemacetan Crowdsourced GPS
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300 text-[9.5px]">
                        {crowdsourceSummary.totalActiveProbes} Sinyal Terkoneksi
                      </span>
                    </div>
                    <p className="text-[10px] text-rose-700/80 dark:text-rose-300/80 leading-relaxed">
                      Kepadatan jalan diprediksi secara matematis dari konsentrasi titik GPS pengendara. Semakin banyak sinyal GPS melambat pada satu titik jalan, semakin pekat indikasi kemacetan (Segmen Vektor Merah/Burgundy Standar Google Maps).
                    </p>

                    {/* Telemetry Metric Badges */}
                    <div className="grid grid-cols-2 gap-2 pt-1 text-[10px]">
                      <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-rose-100 dark:border-rose-900/50">
                        <span className="text-slate-500 dark:text-slate-400 block text-[9px]">Titik Sinyal GPS Aktif:</span>
                        <strong className="text-slate-800 dark:text-white font-mono text-xs">{crowdsourceSummary.totalActiveProbes} pengendara</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-rose-100 dark:border-rose-900/50">
                        <span className="text-slate-500 dark:text-slate-400 block text-[9px]">Kecepatan Rata-rata:</span>
                        <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-xs">{crowdsourceSummary.averageNetworkSpeedKmh} km/jam</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-rose-100 dark:border-rose-900/50">
                        <span className="text-slate-500 dark:text-slate-400 block text-[9px]">Segmen Padat/Macet:</span>
                        <strong className="text-rose-600 dark:text-rose-400 font-mono text-xs">{crowdsourceSummary.congestedSegmentsCount} titik leher botol</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-rose-100 dark:border-rose-900/50">
                        <span className="text-slate-500 dark:text-slate-400 block text-[9px]">Kontributor Warga:</span>
                        <strong className="text-indigo-600 dark:text-indigo-400 font-mono text-xs">
                          {isBroadcastingUserGps ? '🟢 Aktif Membagikan' : '⚪ Mode Anonim'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Citizen GPS Contributor Card */}
                  <div className="p-3 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/70 to-purple-50/70 dark:from-indigo-950/30 dark:to-purple-950/30 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">📡</span>
                        <div>
                          <h4 className="font-bold text-slate-800 dark:text-white text-xs">
                            Kontributor GPS Realtime (HTML5 Geolocation)
                          </h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            Bagikan sinyal GPS perangkat Anda secara anonim ke backend Harmony
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-600 dark:text-slate-300">
                        Status: <strong className={isBroadcastingUserGps ? 'text-emerald-600' : 'text-slate-500'}>
                          {isBroadcastingUserGps ? '📡 Memancarkan Koordinat Realtime' : 'Mati (Hanya Menonton)'}
                        </strong>
                      </span>

                      <button
                        type="button"
                        onClick={handleToggleBroadcastGps}
                        className={`px-3 py-1.5 rounded-xl font-bold text-[10.5px] flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                          isBroadcastingUserGps
                            ? 'bg-rose-600 hover:bg-rose-700 text-white'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        <Radio className="w-3 h-3" />
                        <span>{isBroadcastingUserGps ? 'Hentikan Berbagi GPS' : 'Mulai Jadi Kontributor'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Detected High-Density Bottlenecks */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                        <span>🔥</span>
                        <span>Titik Kepadatan GPS Tertinggi (Bottlenecks)</span>
                      </h4>
                      <span className="text-[9.5px] text-slate-500 dark:text-slate-400">
                        Top Cluster Hotspots
                      </span>
                    </div>

                    <div className="space-y-2">
                      {[
                        {
                          name: 'Simpang Susun Semanggi',
                          city: 'Jakarta, DKI Jakarta',
                          pings: 142,
                          density: 95,
                          speed: '8 km/jam',
                          delay: '+22 mnt',
                          status: 'Macet Total',
                          coords: [106.816666, -6.219722] as [number, number],
                        },
                        {
                          name: 'Simpang Tomang Intermodal',
                          city: 'Jakarta Barat',
                          pings: 98,
                          density: 76,
                          speed: '14 km/jam',
                          delay: '+16 mnt',
                          status: 'Padat Merayap',
                          coords: [106.7944, -6.1772] as [number, number],
                        },
                        {
                          name: 'Simpang Pasteur Exit Tol',
                          city: 'Bandung, Jawa Barat',
                          pings: 86,
                          density: 68,
                          speed: '12 km/jam',
                          delay: '+14 mnt',
                          status: 'Padat Merayap',
                          coords: [107.5794, -6.8927] as [number, number],
                        },
                        {
                          name: 'Bundaran Waru Sidoarjo-Surabaya',
                          city: 'Surabaya, Jawa Timur',
                          pings: 92,
                          density: 72,
                          speed: '11 km/jam',
                          delay: '+15 mnt',
                          status: 'Padat Merayap',
                          coords: [112.7291, -7.3486] as [number, number],
                        },
                        {
                          name: 'Gerbang Tol Cikampek Utama KM 70',
                          city: 'Karawang, Jawa Barat',
                          pings: 110,
                          density: 55,
                          speed: '38 km/jam',
                          delay: '+5 mnt',
                          status: 'Ramai Lancar',
                          coords: [107.4522, -6.4215] as [number, number],
                        },
                      ].map((hotspot, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all text-xs space-y-1.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h5 className="font-bold text-slate-800 dark:text-white text-xs leading-tight">
                                {hotspot.name}
                              </h5>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                {hotspot.city}
                              </p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              hotspot.status === 'Macet Total'
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                : hotspot.status === 'Padat Merayap'
                                ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            }`}>
                              {hotspot.status}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/50 text-[10px]">
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                              <span>📡 <strong>{hotspot.pings}</strong> pings</span>
                              <span>•</span>
                              <span>Kecepatan: <strong>{hotspot.speed}</strong></span>
                              <span>•</span>
                              <span className="text-rose-600 font-bold">{hotspot.delay}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                mapRef.current?.getView().animate({
                                  center: fromLonLat(hotspot.coords),
                                  zoom: 14.5,
                                  duration: 700,
                                });
                              }}
                              className="px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-[9.5px] flex items-center gap-1 cursor-pointer"
                            >
                              <Navigation className="w-3 h-3" />
                              <span>Pusatkan</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Content: Kamera CCTV Live */}
              {/* Tab Content: Kamera CCTV Live */}
              {trafficDrawerTab === 'cctv' && (
                <div className="p-3 overflow-y-auto space-y-2.5 flex-1">
                  <div className="p-3 bg-cyan-50/90 dark:bg-cyan-950/40 rounded-2xl border border-cyan-200/90 dark:border-cyan-900/70 text-xs space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between font-bold text-cyan-800 dark:text-cyan-200 text-[11px]">
                      <span className="flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                        Jaringan CCTV Publik &amp; Siaran Langsung
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 text-[9.5px] font-bold">
                          {cctvCameras.length} Kamera
                        </span>
                        <button
                          type="button"
                          onClick={() => loadCctvFeeds(cctvCityFilter, cctvCategoryFilter, cctvSearchQuery)}
                          disabled={isCctvLoading}
                          className="p-1 rounded-lg hover:bg-cyan-200/60 dark:hover:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300 transition-colors cursor-pointer"
                          title="Perbarui daftar kamera CCTV dari CCTV Nusantara"
                        >
                          <RotateCcw className={`w-3 h-3 ${isCctvLoading ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-cyan-700/90 dark:text-cyan-300/80 leading-relaxed">
                      Kamera CCTV publik realtime terintegrasi dengan jaringan <strong>CCTV Nusantara</strong> dan portal resmi ATCS pemerintah (Dishub DKI, Bandung, Surabaya, Semarang, Jogja, Bali, Tol Trans-Jawa, &amp; Tol Sumatera).
                    </p>

                    {/* Search & Filter Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-cyan-600/70 dark:text-cyan-400/70" />
                        <input
                          type="text"
                          value={cctvSearchQuery}
                          onChange={(e) => setCctvSearchQuery(e.target.value)}
                          placeholder="Cari simpang, jalan, atau otoritas CCTV..."
                          className="w-full pl-8 pr-7 py-1.5 text-[11px] rounded-xl bg-white/90 dark:bg-slate-900/90 border border-cyan-200 dark:border-cyan-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
                        />
                        {cctvSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setCctvSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <select
                          value={cctvCityFilter}
                          onChange={(e) => {
                            setCctvCityFilter(e.target.value);
                            setCctvDisplayLimit(40);
                          }}
                          className="px-2 py-1 text-[10px] font-semibold rounded-xl bg-white/90 dark:bg-slate-900/90 border border-cyan-200 dark:border-cyan-800 text-slate-700 dark:text-slate-200 focus:outline-hidden"
                        >
                          <option value="Semua">Semua Kota ({trafficCctvService.getAllCameras().length})</option>
                          {trafficCctvService.getCities().slice(0, 30).map((ct) => (
                            <option key={ct.name} value={ct.name}>
                              {ct.name} ({ct.count})
                            </option>
                          ))}
                        </select>

                        <select
                          value={cctvCategoryFilter}
                          onChange={(e) => {
                            setCctvCategoryFilter(e.target.value);
                            setCctvDisplayLimit(40);
                          }}
                          className="px-2 py-1 text-[10px] font-semibold rounded-xl bg-white/90 dark:bg-slate-900/90 border border-cyan-200 dark:border-cyan-800 text-slate-700 dark:text-slate-200 focus:outline-hidden"
                        >
                          <option value="Semua">Semua Kategori</option>
                          <option value="jalan">Jalan Raya</option>
                          <option value="tol">Jalan Tol</option>
                          <option value="publik">Kawasan Publik</option>
                          <option value="wisata">Destinasi Wisata</option>
                          <option value="pengadilan">Layanan Peradilan</option>
                        </select>
                      </div>

                      {/* Quick City Pills */}
                      <div className="flex items-center gap-1 overflow-x-auto pb-0.5 pt-0.5 no-scrollbar">
                        {['Semua', 'DKI Jakarta', 'Kota Bandung', 'D.I. Yogyakarta', 'Surabaya', 'Provinsi Bali', 'Jalan Tol Trans Jawa'].map((cityName) => (
                          <button
                            key={cityName}
                            type="button"
                            onClick={() => {
                              setCctvCityFilter(cityName);
                              setCctvDisplayLimit(40);
                            }}
                            className={`px-2 py-0.5 rounded-lg text-[9px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                              cctvCityFilter === cityName
                                ? 'bg-cyan-600 text-white shadow-2xs'
                                : 'bg-cyan-100/70 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-200 hover:bg-cyan-200 dark:hover:bg-cyan-800'
                            }`}
                          >
                            {cityName}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Camera Cards List */}
                  {cctvCameras.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-xs">
                      <Camera className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
                      <p className="font-semibold">Tidak ada kamera ditemukan untuk filter ini.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setCctvCityFilter('Semua');
                          setCctvCategoryFilter('Semua');
                          setCctvSearchQuery('');
                        }}
                        className="mt-2 px-3 py-1 bg-cyan-600 text-white rounded-xl text-[10px] font-bold"
                      >
                        Reset Filter
                      </button>
                    </div>
                  ) : (
                    cctvCameras.slice(0, cctvDisplayLimit).map((cam) => (
                      <div
                        key={cam.id}
                        className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all text-xs space-y-2 shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                                {cam.authority}
                              </span>
                              {cam.streamType === 'hls' ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                  <Video className="w-2.5 h-2.5" /> HLS 24/7 Live
                                </span>
                              ) : cam.streamType === 'youtube' ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                                  <Video className="w-2.5 h-2.5" /> YouTube Live
                                </span>
                              ) : cam.streamType === 'iframe' ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center gap-1">
                                  <Video className="w-2.5 h-2.5" /> Siaran Langsung
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                                  <Camera className="w-2.5 h-2.5" /> Snapshot ATCS
                                </span>
                              )}
                              <span className="text-[8.5px] font-mono px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                                {cam.city}
                              </span>
                            </div>
                            <h4 className="font-bold text-slate-800 dark:text-white leading-tight mt-1 text-xs">
                              {cam.name}
                            </h4>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {cam.road}
                            </p>
                            <p className="text-[9px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                              📍 {cam.lat.toFixed(4)}°, {cam.lng.toFixed(4)}°
                            </p>
                          </div>

                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[9px] font-bold shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live {cam.fps} FPS
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/50 text-[10px]">
                          <span className="text-slate-500 dark:text-slate-400 truncate max-w-[170px]" title={cam.statusText}>
                            Status: <strong className="text-slate-700 dark:text-slate-300">{cam.statusText}</strong>
                          </span>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {cam.portalUrl && (
                              <a
                                href={cam.portalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 font-bold text-[9.5px] flex items-center gap-1 cursor-pointer"
                                title="Kunjungi portal resmi penyedia CCTV"
                              >
                                <Globe className="w-3 h-3" />
                                <span>Portal</span>
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() => handleFocusCctv(cam)}
                              className="px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                              title="Pusatkan kamera di peta"
                            >
                              <Navigation className="w-3 h-3" />
                              <span>Pusatkan</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedCctvCamera(cam)}
                              className="px-2.5 py-1 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-2xs cursor-pointer"
                              title="Buka siaran live kamera ini"
                            >
                              <Camera className="w-3 h-3" />
                              <span>Buka Live CCTV</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Load More Button if more cameras available */}
                  {cctvCameras.length > cctvDisplayLimit && (
                    <div className="pt-2 text-center pb-2">
                      <button
                        type="button"
                        onClick={() => setCctvDisplayLimit((prev) => prev + 40)}
                        className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10.5px] transition-all cursor-pointer shadow-2xs"
                      >
                        Tampilkan 40 Kamera Berikutnya ({cctvDisplayLimit} dari {cctvCameras.length})
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab Content: Lampu Merah & ATCS */}
              {trafficDrawerTab === 'signals' && (
                <div className="p-3 overflow-y-auto space-y-2 flex-1">
                  <div className="p-2.5 bg-emerald-50/80 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-emerald-800 dark:text-emerald-200 text-[11px]">
                      <span className="flex items-center gap-1.5">
                        <span>🚦</span>
                        Sistem Kendali Lalu Lintas Cerdas (ATCS)
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-[9.5px]">
                        {trafficSignalsService.getAllSignals().length} Simpang Terhubung
                      </span>
                    </div>
                    <p className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 leading-relaxed">
                      Siklus fase lampu lalu lintas realtime dihitung secara deterministik dengan telemetri hitung mundur dan estimasi panjang antrean kendaraan.
                    </p>
                  </div>

                  {trafficSignalsService.getAllSignals().map((sig) => {
                    const phaseColor =
                      sig.currentPhase === 'GREEN'
                        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                        : sig.currentPhase === 'YELLOW'
                        ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30'
                        : 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30';
                    const phaseDot =
                      sig.currentPhase === 'GREEN'
                        ? 'bg-emerald-500'
                        : sig.currentPhase === 'YELLOW'
                        ? 'bg-amber-500'
                        : 'bg-rose-500';

                    return (
                      <div
                        key={sig.id}
                        className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all text-xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                {sig.intersectionType}
                              </span>
                              {sig.isUnderRepair ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                  🔧 Pemeliharaan
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                  ✓ SCATS/SITS Normal
                                </span>
                              )}
                              <span className="text-[8.5px] font-mono text-sky-600 dark:text-sky-400 px-1 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800">
                                ±{sig.telemetryDelaySec}s Delay
                              </span>
                            </div>
                            <h4 className="font-bold text-slate-800 dark:text-white leading-tight mt-1 text-xs">
                              {sig.name}
                            </h4>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {sig.city} • Antrean: ~{sig.queueEstimateVehicles} kend. • Otoritas: {sig.authoritySource}
                            </p>
                            <p className="text-[9.5px] text-slate-600 dark:text-slate-300 mt-1 bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
                              <strong className={sig.isUnderRepair ? 'text-amber-500' : 'text-emerald-500'}>{sig.statusLabel}:</strong>{' '}
                              <span>{sig.maintenanceNote}</span>{' '}
                              <span className="text-slate-400 font-mono">({sig.updatedBy})</span>
                            </p>
                          </div>

                          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[10px] font-bold shrink-0 ${phaseColor}`}>
                            <span className={`w-2 h-2 rounded-full ${phaseDot} animate-pulse`} />
                            {sig.currentPhase.toUpperCase()} ({sig.remainingSeconds}s)
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/50 text-[10px]">
                          <span className="text-slate-500 dark:text-slate-400">
                            Durasi Siklus: <strong className="font-mono text-slate-700 dark:text-slate-300">{sig.cycleTotalSeconds}s</strong>
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleFocusSignal(sig)}
                              className="px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                              title="Pusatkan simpang di peta"
                            >
                              <Navigation className="w-3 h-3" />
                              <span>Pusatkan</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedTrafficSignalId(sig.id)}
                              className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-2xs cursor-pointer"
                              title="Buka panel ATCS simpang ini"
                            >
                              <span>🚦</span>
                              <span>Pantau Simpang</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab Content: Konfigurasi API Kunci (BYOK) */}
              {trafficDrawerTab === 'byok' && (
                <div className="p-4 space-y-4 text-xs overflow-y-auto flex-1">
                  <div className="p-3 bg-indigo-50/80 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-200">
                      <Key className="w-4 h-4 text-indigo-600" />
                      <span>Konfigurasi Kuota API TomTom Realtime (BYOK)</span>
                    </div>
                    <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80 leading-relaxed">
                      Secara default, Harmony menggunakan proxy telemetri server internal. Anda juga dapat memasukkan kunci TomTom API milik pribadi (Bring Your Own Key) untuk kuota mandiri tanpa batasan.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="tomtom-api-key-input" className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      TomTom Traffic Flow API Key:
                    </label>
                    <input
                      id="tomtom-api-key-input"
                      type="password"
                      value={customTomTomKeyInput}
                      onChange={(e) => setCustomTomTomKeyInput(e.target.value)}
                      placeholder="Masukkan kunci API TomTom Anda..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono shadow-2xs"
                    />
                    {customTomTomKeyStatus && (
                      <p className="text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400">
                        {customTomTomKeyStatus}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleSaveCustomTomTomKey}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
                    >
                      Simpan Kunci API
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCustomTomTomKeyInput('');
                        liveTrafficFlowService.setCustomTomTomApiKey(null);
                        setCustomTomTomKeyStatus('Kunci khusus dihapus, kembali ke proxy internal.');
                        setTimeout(() => setCustomTomTomKeyStatus(''), 4000);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer"
                    >
                      Gunakan Proxy Bawaan
                    </button>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-[10.5px] space-y-1.5">
                    <strong className="text-slate-700 dark:text-slate-300 block">Status Layanan:</strong>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Mode Penyedia:</span>
                      <strong className="font-mono text-purple-600 dark:text-purple-400">
                        {customTomTomKeyInput ? 'Kunci Khusus (BYOK)' : 'Proxy Internal Server'}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Siklus Polling:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">Setiap 15 Detik</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Kamera CCTV:</span>
                      <span className="text-emerald-600 font-bold">{trafficCctvService.getAllCameras().length} Kamera Online</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Simpang ATCS:</span>
                      <span className="text-emerald-600 font-bold">{trafficSignalsService.getAllSignals().length} Simpang Aktif</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Basemap Quick Switch Footer */}
              <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 shrink-0 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Basemap Google Live Traffic HD
                    </span>
                    <span className="text-[9.5px] text-slate-400">
                      {activeMapBasemap === 'traffic' ? 'Sedang aktif di kanvas peta' : 'Tampilkan trafik di setiap sudut jalan'}
                    </span>
                  </div>

                  {activeMapBasemap !== 'traffic' ? (
                    <button
                      type="button"
                      onClick={() => handleSelectBasemap('traffic')}
                      className="px-2.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>Aktifkan Basemap</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Aktif
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Side Drawer: Cakupan Sensor & Blank Spot Observasi Indonesia (Right-Side Drawer) */}
      <AnimatePresence>
        {showObservationCoverage && (
          <motion.div
            key="obs-coverage-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowObservationCoverage(false)}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 sm:hidden"
          />
        )}
        {showObservationCoverage && (
          <motion.div
            key="obs-coverage-panel"
            initial={{ opacity: 0, x: 28, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 28, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="fixed sm:absolute top-auto bottom-0 sm:top-4 sm:bottom-4 right-0 sm:right-4 left-0 sm:left-auto z-50 w-full sm:w-[420px] max-h-[88vh] sm:max-h-[calc(100vh-2rem)] rounded-t-3xl sm:rounded-3xl bg-white/95 dark:bg-slate-900/95 shadow-2xl backdrop-blur-2xl border-t sm:border border-slate-200/80 dark:border-slate-800 flex flex-col overflow-hidden"
          >
              {/* Mobile Drag Handle Bar */}
              <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

              {/* Fixed Header Section */}
              <div className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800/80 shrink-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 shadow-sm">
                      <Radio className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-display text-base font-bold text-ink-900 dark:text-white leading-tight">
                          Cakupan Sensor Observasi
                        </h2>
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white shadow-xs">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-300"></span>
                          </span>
                          45 Radar BMKG
                        </span>
                      </div>
                      <p className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                        Jaringan Radar Doppler &amp; 6 Zona Kesenjangan Data
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowObservationCoverage(false)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Tutup Panel Cakupan Sensor"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Sub Tab Switcher */}
                <div className="flex items-center gap-1 mt-3 p-1 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setObsSubTab('summary')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                      obsSubTab === 'summary'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Ringkasan
                  </button>
                  <button
                    type="button"
                    onClick={() => setObsSubTab('radar')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                      obsSubTab === 'radar'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Radar BMKG (45)
                  </button>
                  <button
                    type="button"
                    onClick={() => setObsSubTab('blank')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                      obsSubTab === 'blank'
                        ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Blank Spot (6)
                  </button>
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar text-xs">
                {obsSubTab === 'summary' && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Analisis spasial kesenjangan observasi cuaca ekstrem &amp; hidrometeorologi BMKG di seluruh Indonesia berdasarkan 45 radar Doppler (C/S/X-Band) dan titik blank spot permukaan.
                    </p>

                    {/* Status Metric Badges */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 text-center">
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-semibold">Radar BMKG Terpasang</span>
                        <span className="font-mono text-base font-black text-emerald-600 dark:text-emerald-400">45 Stasiun</span>
                        <span className="text-[9.5px] text-slate-500 dark:text-slate-400 block mt-0.5">Operasional 24 Jam</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/60 text-center">
                        <span className="text-[10px] text-rose-700 dark:text-rose-400 block font-semibold">Zona Blank Spot</span>
                        <span className="font-mono text-base font-black text-rose-600 dark:text-rose-400">6 Kawasan</span>
                        <span className="text-[9.5px] text-slate-500 dark:text-slate-400 block mt-0.5">Prioritas Asimilasi Satelit</span>
                      </div>
                    </div>

                    {/* Skala Jangkauan & Legenda */}
                    <div className="space-y-2">
                      <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Klasifikasi Jangkauan Sensor</h4>
                      <div className="space-y-2">
                        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-xs" />
                              <span className="font-bold text-emerald-900 dark:text-emerald-200 text-xs">Tinggi (High Coverage)</span>
                            </div>
                            <span className="text-emerald-700 dark:text-emerald-300 font-mono font-bold text-xs">&lt; 20 km</span>
                          </div>
                          <p className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 mt-1 leading-snug">
                            Cakupan sangat akurat dengan resolusi tinggi radar doppler darat BMKG (akurasi deteksi awan CB &amp; curah hujan &gt;95%).
                          </p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-amber-500 shadow-xs" />
                              <span className="font-bold text-amber-900 dark:text-amber-200 text-xs">Sedang (Asimilasi Satelit)</span>
                            </div>
                            <span className="text-amber-700 dark:text-amber-300 font-mono font-bold text-xs">20 - 60 km</span>
                          </div>
                          <p className="text-[10px] text-amber-700/80 dark:text-amber-300/80 mt-1 leading-snug">
                            Batas sapuan efektif radar. Dilengkapi asimilasi data citra satelit Himawari-9 &amp; GPM NASA untuk kestabilan estimasi.
                          </p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/60">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-rose-500 shadow-xs" />
                              <span className="font-bold text-rose-900 dark:text-rose-200 text-xs">Blank Spot (Kesenjangan Data)</span>
                            </div>
                            <span className="text-rose-700 dark:text-rose-300 font-mono font-bold text-xs">&gt; 60 km</span>
                          </div>
                          <p className="text-[10px] text-rose-700/80 dark:text-rose-300/80 mt-1 leading-snug">
                            Wilayah di luar jangkauan radar doppler darat. Mengandalkan estimasi satelit multispektral &amp; reanalisis numerik cuaca.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Quick Focus Actions */}
                    <div className="space-y-2 pt-1">
                      <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Arahkan Kamera Langsung (Fly-To)</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const cgk = BMKG_DOPPLER_RADAR_NETWORK.find(r => r.code === 'CGK');
                            if (cgk) handleFocusRadarStation(cgk);
                          }}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 text-[11px] font-bold border border-slate-200/70 dark:border-slate-700/70 hover:border-emerald-500/40 transition-all text-left cursor-pointer flex items-center gap-1.5"
                        >
                          <span>📡</span>
                          <span className="truncate">Radar Cengkareng (CGK)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const sub = BMKG_DOPPLER_RADAR_NETWORK.find(r => r.code === 'SUB');
                            if (sub) handleFocusRadarStation(sub);
                          }}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 text-[11px] font-bold border border-slate-200/70 dark:border-slate-700/70 hover:border-emerald-500/40 transition-all text-left cursor-pointer flex items-center gap-1.5"
                        >
                          <span>📡</span>
                          <span className="truncate">Radar Juanda (SUB)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const papua = BMKG_BLANK_SPOT_ZONES.find(b => b.id === 'blank_papua_highlands');
                            if (papua) handleFocusBlankSpot(papua);
                          }}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 text-[11px] font-bold border border-slate-200/70 dark:border-slate-700/70 hover:border-rose-500/40 transition-all text-left cursor-pointer flex items-center gap-1.5"
                        >
                          <span>⚠️</span>
                          <span className="truncate">Blank Spot Papua</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const natuna = BMKG_BLANK_SPOT_ZONES.find(b => b.id === 'blank_natuna_north');
                            if (natuna) handleFocusBlankSpot(natuna);
                          }}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 text-[11px] font-bold border border-slate-200/70 dark:border-slate-700/70 hover:border-rose-500/40 transition-all text-left cursor-pointer flex items-center gap-1.5"
                        >
                          <span>⚠️</span>
                          <span className="truncate">Blank Spot Natuna</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {obsSubTab === 'radar' && (
                  <div className="space-y-3">
                    {/* Search & Island Filter */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="maps-obs-search-input"
                        name="obsSearch"
                        type="text"
                        placeholder="Cari radar BMKG, kota, provinsi..."
                        value={obsSearchQuery}
                        onChange={(e) => setObsSearchQuery(e.target.value)}
                        className="w-full pl-8.5 pr-8 py-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                      {obsSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setObsSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Filter Pulau */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar text-[10px]">
                      {['all', 'Sumatera', 'Jawa', 'Bali', 'Kalimantan', 'Sulawesi', 'Maluku', 'Papua'].map((isl) => (
                        <button
                          key={isl}
                          type="button"
                          onClick={() => setObsIslandFilter(isl)}
                          className={`px-2.5 py-1 rounded-lg shrink-0 font-bold transition-all cursor-pointer ${
                            obsIslandFilter === isl
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {isl === 'all' ? 'Semua Pulau' : isl}
                        </button>
                      ))}
                    </div>

                    <div className="text-[10.5px] text-slate-400 font-medium">
                      Menampilkan {filteredRadarStations.length} dari 45 Stasiun Radar Doppler
                    </div>

                    {/* List of Radars */}
                    <div className="space-y-2">
                      {filteredRadarStations.map((radar) => (
                        <div
                          key={radar.id}
                          onClick={() => handleFocusRadarStation(radar)}
                          className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-500/60 dark:hover:border-emerald-500/60 transition-all cursor-pointer hover:shadow-md group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-emerald-600 dark:text-emerald-400 font-mono text-xs font-black px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60">
                                {radar.code}
                              </span>
                              <h5 className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                {radar.name}
                              </h5>
                            </div>
                            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full shrink-0">
                              {radar.type.split(' ')[0]}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10.5px] text-slate-500 dark:text-slate-400 mt-1.5">
                            <span>📍 {radar.city}, {radar.province}</span>
                            <span className="font-mono">Alt: {radar.elevationM}m</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                            <span>Sweep: ~{radar.rangeKm} km</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold group-hover:underline">Lihat di Peta →</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {obsSubTab === 'blank' && (
                  <div className="space-y-3">
                    <div className="text-[10.5px] text-slate-400 font-medium">
                      6 Kawasan Kritis Kesenjangan Data Observasi Radar Permukaan
                    </div>

                    <div className="space-y-2.5">
                      {BMKG_BLANK_SPOT_ZONES.map((spot) => (
                        <div
                          key={spot.id}
                          onClick={() => handleFocusBlankSpot(spot)}
                          className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-rose-200/80 dark:border-rose-900/60 hover:border-rose-500 transition-all cursor-pointer hover:shadow-md group"
                        >
                          <div className="flex items-center justify-between">
                            <h5 className="font-bold text-rose-950 dark:text-rose-200 text-xs group-hover:text-rose-600 transition-colors">
                              ⚠️ {spot.name}
                            </h5>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                              spot.severity === 'Kritis'
                                ? 'bg-rose-600 text-white'
                                : 'bg-amber-500 text-white'
                            }`}>
                              {spot.severity}
                            </span>
                          </div>

                          <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1">
                            📍 {spot.region} (Pulau {spot.island})
                          </div>

                          <div className="mt-2 p-2 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/60 text-[10px] space-y-1">
                            <div className="flex justify-between text-rose-800 dark:text-rose-300 font-bold">
                              <span>Jarak Radar Terdekat:</span>
                              <span>&gt; {spot.nearestRadarKm} km ({spot.nearestRadarName})</span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 leading-snug">
                              <strong>Dampak:</strong> {spot.impactNote}
                            </p>
                            <p className="text-indigo-600 dark:text-indigo-300 leading-snug pt-1 border-t border-rose-200/50 dark:border-rose-900/50">
                              <strong>Solusi Sensor:</strong> {spot.recommendation}
                            </p>
                          </div>

                          <div className="mt-2 text-right">
                            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 group-hover:underline">
                              Fokus ke Wilayah Blank Spot →
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Fixed Footer: Studio Fusi & Prioritas Sensor */}
              <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800/80 shrink-0 bg-slate-50/80 dark:bg-slate-900/80 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setGeospatialModalDomain('fusion');
                    setShowGeospatialModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md transition-all active:scale-98 cursor-pointer"
                >
                  <Globe className="w-4 h-4" />
                  <span>Buka Studio Fusi &amp; Prioritas Sensor</span>
                </button>
              </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Tombol Bulat Pojok Kiri: Transparansi Sumber Data Resmi (BMKG, PVMBG, BIG, BNPB, Kemendikbud) */}
      {weatherMapOverlay === 'none' && (
        <div className="absolute bottom-14 sm:bottom-16 left-3 sm:left-4 z-30 pointer-events-auto">
          <div className="relative group">
            <button
              type="button"
              onClick={() => setShowDataProvenanceModal(true)}
              aria-haspopup="dialog"
              aria-expanded={showDataProvenanceModal}
              className="relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-gradient-to-tr from-slate-900 via-indigo-950 to-brand-900 text-white shadow-xl shadow-indigo-950/40 border border-indigo-400/50 hover:border-indigo-300 hover:scale-110 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 cursor-pointer"
              title="Transparansi Lengkap Sumber Data Resmi (BMKG, PVMBG, BIG, BNPB, Kemendikbud, ESA, USGS)"
              aria-label="Buka Sumber Data Resmi Kebencanaan"
            >
              {/* Glowing outer pulse */}
              <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-brand-500 opacity-40 blur-sm group-hover:opacity-85 group-hover:blur-md transition duration-300 animate-pulse" />

              {/* Inner circle */}
              <span className="relative flex items-center justify-center h-full w-full rounded-full bg-slate-900/90 backdrop-blur-md">
                <Database className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-300 group-hover:text-white transition-colors" />

                {/* Verified Shield Badge Overlay */}
                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-white ring-1.5 ring-slate-900 shadow-sm" title="Terverifikasi Otoritatif">
                  <ShieldCheck className="h-2 w-2" />
                </span>
              </span>
            </button>

            {/* Floating Tooltip Label (Desktop Hover) */}
            <div className="pointer-events-none absolute left-full ml-2.5 top-1/2 -translate-y-1/2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 whitespace-nowrap z-50 hidden sm:block">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/95 backdrop-blur-md text-white text-xs font-semibold shadow-xl border border-slate-700/80">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Sumber Data Resmi</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  (BMKG, BIG, PVMBG, BNPB, Dapodik)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Center: Unified Navigation, Geospatial Intel & Traffic Dock */}
      {weatherMapOverlay === 'none' && (showBottomDock || showGeospatialIntelBar || showTrafficControlBar) && (
        <div className="absolute bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 pointer-events-none max-w-[96vw]">
          {/* Top Tier: Geospatial Intel Bar (Lintasan & Iklim) */}
          <AnimatePresence mode="wait">
            {showGeospatialIntelBar ? (
              <motion.div
                key="geospatial-projector-panel"
                initial={{ opacity: 0, y: 45, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 45, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                className="flex flex-wrap items-center justify-center gap-2 max-w-[95vw] sm:max-w-2xl md:max-w-3xl pointer-events-auto"
              >
                {/* 1. Basemap Provenance Pill */}
                <button
                  type="button"
                  onClick={() => setShowMetadataModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-900 backdrop-blur-md border border-white/15 text-white text-[11px] font-medium shadow-md transition-all hover:scale-105 cursor-pointer"
                  title="Klik untuk melihat informasi validitas & tahun data geospasial"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-bold text-slate-200">
                    {BASEMAP_METADATA[activeMapBasemap].name.split(' ')[0]}:
                  </span>
                  <span className="text-emerald-300 font-semibold">
                    {BASEMAP_METADATA[activeMapBasemap].year}
                  </span>
                  <Info className="w-3 h-3 text-slate-400 ml-0.5" />
                </button>

                {/* 2. Seasonal Intelligence & Equator Distance Pill */}
                {seasonalInfo && (
                  <button
                    type="button"
                    onClick={() => setShowSeasonalModal(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-900 backdrop-blur-md border border-amber-500/30 text-white text-[11px] font-medium shadow-lg transition-all hover:scale-105 cursor-pointer group"
                    title="Klik untuk melihat Detail Konsensus Musim & Iklim Global"
                  >
                    <span className="text-sm leading-none">{seasonalInfo.seasonIcon}</span>
                    <div className="flex items-center gap-1.5 text-left">
                      <span className="font-bold text-amber-300">
                        {seasonalInfo.seasonName}
                      </span>
                      {globalWeatherSummary?.temperature !== undefined && (
                        <span className="text-slate-300 font-mono font-bold">
                          {globalWeatherSummary.temperature}°C
                        </span>
                      )}
                    </div>
                    <span className="hidden md:inline-flex items-center text-[10px] text-slate-400 font-mono pl-1 border-l border-slate-700">
                      {Math.round(seasonalInfo.distanceToEquatorKm)} km ke Khatulistiwa
                    </span>
                  </button>
                )}

                {/* 3. Petunjuk & Menu Garis Khatulistiwa 0° */}
                <button
                  type="button"
                  onClick={() => setShowEquatorGuide((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl backdrop-blur-md border text-[11px] font-medium shadow-md transition-all hover:scale-105 cursor-pointer ${
                    showEquatorZones
                      ? 'bg-slate-900/85 hover:bg-slate-900 border-amber-400/40 text-amber-300'
                      : 'bg-slate-900/60 hover:bg-slate-900/80 border-white/10 text-slate-400'
                  }`}
                  title="Petunjuk Garis Khatulistiwa 0° & Garis Balik Tropis"
                >
                  <span className="w-2.5 h-0.5 rounded-full bg-amber-400" />
                  <span className="font-bold">Khatulistiwa 0°</span>
                  <ChevronUp className={`w-3 h-3 transition-transform ${showEquatorGuide ? 'rotate-180' : ''}`} />
                </button>

                {/* 4. Projector Roll-Down Button (Tutup / Tarik ke Bawah) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowGeospatialIntelBar(false);
                    try {
                      window.localStorage.setItem(`hm_geospatial_intel_bar_${activeUserId}`, 'false');
                    } catch (err) {}
                  }}
                  className="flex items-center justify-center p-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-900 backdrop-blur-md border border-white/15 text-slate-400 hover:text-white shadow-md transition-all hover:scale-105 cursor-pointer shrink-0"
                  title="Tutup / Tarik Panel ke Bawah"
                  aria-label="Tutup Panel Intelijen"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ) : showTrafficControlBar ? (
              <motion.div
                key="geospatial-minimized-top-pill"
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                className="pointer-events-auto"
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowGeospatialIntelBar(true);
                    setShowBottomDock(true);
                    try {
                      window.localStorage.setItem(`hm_geospatial_intel_bar_${activeUserId}`, 'true');
                      window.localStorage.setItem(`hm_show_bottom_dock_${activeUserId}`, 'true');
                    } catch (e) {}
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900/90 hover:bg-slate-900 backdrop-blur-xl border border-white/15 text-white text-xs font-semibold shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-indigo-500/10"
                  title="Buka Panel Intelijen Wilayah & Iklim (Tarik ke Atas)"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-bold text-slate-200">Lintasan &amp; Iklim</span>
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Bottom Tier: Traffic Control Bar OR Minimized Buttons */}
          <AnimatePresence mode="wait">
            {showTrafficControlBar ? (
              <motion.div
                key="google-maps-traffic-bar"
                initial={{ opacity: 0, y: 45, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 45, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                className="w-[92vw] sm:w-[460px] max-w-[460px] rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xl p-3 sm:p-3.5 text-slate-800 dark:text-slate-100 select-none pointer-events-auto"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                {/* Top Row: Mode dropdown | Speed Gradient | Switch | Close */}
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="relative">
                    <select
                      value={trafficMode}
                      onChange={(e) => setTrafficMode(e.target.value as 'live' | 'typical')}
                      className="appearance-none bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-900 dark:text-slate-100 font-semibold text-xs sm:text-[13px] py-1 pl-2.5 pr-7 rounded-lg cursor-pointer focus:outline-none transition-colors border border-slate-200 dark:border-slate-700"
                    >
                      <option value="typical" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                        Lalu lintas biasanya
                      </option>
                      <option value="live" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                        Lalu lintas langsung
                      </option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Google Maps Speed Color Bar */}
                    <div className="flex items-center gap-1.5 text-[10.5px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      <span className="italic">Cepat</span>
                      <div className="flex items-center h-2 rounded-full overflow-hidden w-16 sm:w-24 shadow-2xs">
                        <span className="h-full flex-1 bg-[#0f9d58]" title="Lancar (> 45 km/jam)" />
                        <span className="h-full flex-1 bg-[#f9ab00]" title="Ramai Lancar (25 - 45 km/jam)" />
                        <span className="h-full flex-1 bg-[#ea4335]" title="Padat (10 - 25 km/jam)" />
                        <span className="h-full flex-1 bg-[#7f1d1d]" title="Pelan / Macet Total (< 10 km/jam)" />
                      </div>
                      <span className="italic">Pelan</span>
                    </div>

                    {/* Layer Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => {
                        if (activeMapBasemap === 'traffic') {
                          setActiveMapBasemap('osm');
                          setShowTrafficCorridors(false);
                        } else {
                          setShowTrafficCorridors((v) => !v);
                        }
                      }}
                      className={`w-7 h-4 rounded-full transition-colors relative p-0.5 cursor-pointer shrink-0 ${
                        activeMapBasemap === 'traffic' || showTrafficCorridors
                          ? 'bg-teal-600 dark:bg-teal-500'
                          : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                      title="Nyalakan/Matikan Lapisan Lalu Lintas"
                    >
                      <span
                        className={`block w-3 h-3 rounded-full bg-white shadow-xs transition-transform ${
                          activeMapBasemap === 'traffic' || showTrafficCorridors ? 'translate-x-3' : 'translate-x-0'
                        }`}
                      />
                    </button>

                    {/* Close Button: Tarik ke Bawah (Projector Pull-Down) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowTrafficControlBar(false);
                        try {
                          window.localStorage.setItem(`hm_traffic_bar_${activeUserId}`, 'false');
                        } catch (err) {}
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer relative z-10"
                      title="Tutup / Sembunyikan Panel Lalu Lintas"
                      aria-label="Tutup Panel Lalu Lintas"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Bottom Content: Typical vs Live */}
                {trafficMode === 'typical' ? (
                  <div className="pt-2 space-y-2">
                    {/* Day selector: M S S R K J S */}
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      {[
                        { label: 'M', day: 0, name: 'Minggu' },
                        { label: 'S', day: 1, name: 'Senin' },
                        { label: 'S', day: 2, name: 'Selasa' },
                        { label: 'R', day: 3, name: 'Rabu' },
                        { label: 'K', day: 4, name: 'Kamis' },
                        { label: 'J', day: 5, name: 'Jumat' },
                        { label: 'S', day: 6, name: 'Sabtu' },
                      ].map((d) => {
                        const isSelected = trafficTypicalDay === d.day;
                        return (
                          <button
                            key={`day-pill-${d.day}-${d.label}`}
                            type="button"
                            onClick={() => setTrafficTypicalDay(d.day)}
                            className={`w-6 h-6 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                              isSelected
                                ? 'bg-teal-700 text-white font-black shadow-xs ring-2 ring-teal-500/40'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title={d.name}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Current Day and Time Display */}
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][trafficTypicalDay]},{' '}
                      {String(Math.floor(trafficTypicalHour)).padStart(2, '0')}.
                      {String(Math.round((trafficTypicalHour - Math.floor(trafficTypicalHour)) * 60)).padStart(2, '0')}
                    </div>

                    {/* Slider */}
                    <div className="relative pt-0.5 pb-0.5">
                      <input
                        type="range"
                        min={6}
                        max={22}
                        step={0.25}
                        value={trafficTypicalHour}
                        onChange={(e) => setTrafficTypicalHour(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-600 dark:accent-teal-400"
                      />
                      <div className="flex justify-between text-[9px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 px-0.5">
                        <span>08.00</span>
                        <span>12.00</span>
                        <span>16.00</span>
                        <span>20.00</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Real-time GPS Crowdsource</span>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          {crowdsourceSummary.totalActiveProbes} Sinyal
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {crowdsourceSummary.timestamp}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">
                        Titik Terpadat: <span className="font-semibold text-rose-500">{crowdsourceSummary.heaviestBottleneck}</span>
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={handleToggleBroadcastGps}
                          className={`px-2 py-1 rounded-lg text-[9.5px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                            isBroadcastingUserGps
                              ? 'bg-rose-500 text-white border-rose-600'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                          title="Siarkan koordinat GPS perangkat secara anonim untuk kontribusi kepadatan"
                        >
                          <span>📡</span>
                          <span>{isBroadcastingUserGps ? 'Berhenti GPS' : 'Siarkan GPS'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowTrafficCorridors(true)}
                          className="px-2 py-1 rounded-lg text-[9.5px] font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors cursor-pointer flex items-center gap-1"
                          title="Buka panel daftar koridor, kamera CCTV, dan sinyal ATCS"
                        >
                          <span>🚗</span>
                          <span>Koridor &amp; CCTV</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : !showGeospatialIntelBar ? (
              /* When BOTH are minimized: Show both trigger buttons side-by-side in center + close button */
              <motion.div
                key="both-minimized-pills"
                initial={{ opacity: 0, y: 35, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 35, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                className="flex items-center justify-center gap-2 pointer-events-auto"
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowGeospatialIntelBar(true);
                    setShowBottomDock(true);
                    try {
                      window.localStorage.setItem(`hm_geospatial_intel_bar_${activeUserId}`, 'true');
                      window.localStorage.setItem(`hm_show_bottom_dock_${activeUserId}`, 'true');
                    } catch (e) {}
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-900/90 hover:bg-slate-900 backdrop-blur-xl border border-white/15 text-white text-xs font-semibold shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-indigo-500/10"
                  title="Buka Panel Intelijen Wilayah & Iklim (Tarik ke Atas)"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-bold text-slate-200">Lintasan &amp; Iklim</span>
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowTrafficControlBar(true);
                    setShowBottomDock(true);
                    try {
                      window.localStorage.setItem(`hm_traffic_bar_${activeUserId}`, 'true');
                      window.localStorage.setItem(`hm_show_bottom_dock_${activeUserId}`, 'true');
                    } catch (e) {}
                    if (activeMapBasemap !== 'traffic') {
                      setShowTrafficCorridors(true);
                    }
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900/95 hover:bg-slate-900 backdrop-blur-xl border border-teal-500/50 text-white text-xs font-semibold shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-teal-500/10"
                  title="Buka Panel Kontrol Lalu Lintas Google Maps (Tarik ke Atas)"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-bold text-teal-300">Lalu Lintas</span>
                  <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">• Live</span>
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowBottomDock(false);
                    setShowGeospatialIntelBar(false);
                    setShowTrafficControlBar(false);
                    try {
                      window.localStorage.setItem(`hm_show_bottom_dock_${activeUserId}`, 'false');
                      window.localStorage.setItem(`hm_geospatial_intel_bar_${activeUserId}`, 'false');
                      window.localStorage.setItem(`hm_traffic_bar_${activeUserId}`, 'false');
                    } catch (e) {}
                  }}
                  className="flex items-center justify-center p-2 rounded-2xl bg-slate-900/90 hover:bg-slate-900 backdrop-blur-xl border border-white/15 text-slate-400 hover:text-white shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  title="Sembunyikan / Nonaktifkan Dock (Off)"
                  aria-label="Sembunyikan Dock"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ) : (
              /* When Geospatial is open and Traffic is minimized: Show Traffic pill directly underneath */
              <motion.div
                key="traffic-minimized-under-pill"
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                className="pointer-events-auto"
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowTrafficControlBar(true);
                    setShowBottomDock(true);
                    try {
                      window.localStorage.setItem(`hm_traffic_bar_${activeUserId}`, 'true');
                      window.localStorage.setItem(`hm_show_bottom_dock_${activeUserId}`, 'true');
                    } catch (e) {}
                    if (activeMapBasemap !== 'traffic') {
                      setShowTrafficCorridors(true);
                    }
                  }}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-slate-900/95 hover:bg-slate-900 backdrop-blur-xl border border-teal-500/50 text-white text-xs font-semibold shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-teal-500/10"
                  title="Buka Panel Kontrol Lalu Lintas Google Maps (Tarik ke Atas)"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-bold text-teal-300">Lalu Lintas</span>
                  <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">• Live</span>
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Floating Equator & Climate Zones Guide Card (Pusat Bawah) */}
      <AnimatePresence>
        {showEquatorGuide && (
          <motion.div
            key="equator-guide-card"
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            className={`absolute z-40 w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 p-3.5 shadow-2xl text-white left-1/2 -translate-x-1/2 ${
              showTrafficControlBar
                ? 'bottom-52 sm:bottom-56'
                : 'bottom-20 sm:bottom-24'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-base">🌐</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Petunjuk Garis Khatulistiwa &amp; Iklim</h4>
                  <p className="text-[10px] text-slate-400">Garis batas lintang astronomis bumi</p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowEquatorGuide(false);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer relative z-10"
                title="Tutup Petunjuk Khatulistiwa"
                aria-label="Tutup Petunjuk Khatulistiwa"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Legend Items */}
            <div className="py-2.5 space-y-2 text-xs">
              <div className="flex items-start gap-2 p-1.5 rounded-lg bg-slate-800/50">
                <span className="w-3.5 h-1 rounded-full bg-amber-400 mt-1 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300 text-[11px]">Garis Khatulistiwa (0°00'00")</span>
                    <span className="text-[9px] font-mono text-amber-400/80">Ekuator</span>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-tight">
                    Garis tengah bumi pembagi belahan utara & selatan, beriklim tropis ekuatorial sepanjang tahun.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 p-1.5 rounded-lg bg-slate-800/50">
                <span className="w-3.5 h-1 rounded-full bg-emerald-400 mt-1 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-300 text-[11px]">Garis Balik Utara (+23.44°)</span>
                    <span className="text-[9px] font-mono text-emerald-400/80">Cancer</span>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-tight">
                    Batas utara zona iklim tropis, perbatasan zona subtropis utara.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 p-1.5 rounded-lg bg-slate-800/50">
                <span className="w-3.5 h-1 rounded-full bg-cyan-400 mt-1 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-300 text-[11px]">Garis Balik Selatan (-23.44°)</span>
                    <span className="text-[9px] font-mono text-cyan-400/80">Capricorn</span>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-tight">
                    Batas selatan zona iklim tropis, perbatasan zona subtropis selatan.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowEquatorZones((prev) => {
                    const next = !prev;
                    try { window.localStorage.setItem('hm_equator_zones', String(next)); } catch (e) {}
                    if (equatorLayerRef.current) {
                      equatorLayerRef.current.setVisible(next);
                    }
                    return next;
                  });
                }}
                className={`flex-1 py-1.5 px-2 rounded-xl text-[10px] font-bold transition-colors ${
                  showEquatorZones
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {showEquatorZones ? '✓ Garis Aktif' : 'Tampilkan Garis'}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (mapRef.current) {
                    mapRef.current.getView().animate({
                      center: fromLonLat([109.3214, 0.0000]),
                      zoom: 13,
                      duration: 900,
                    });
                  }
                  setShowEquatorGuide(false);
                }}
                className="py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold transition-colors"
                title="Pusatkan ke Tugu Khatulistiwa Pontianak"
              >
                📍 Pontianak
              </button>

              <button
                type="button"
                onClick={() => {
                  if (mapRef.current) {
                    mapRef.current.getView().animate({
                      center: fromLonLat([100.2211, 0.0000]),
                      zoom: 13,
                      duration: 900,
                    });
                  }
                  setShowEquatorGuide(false);
                }}
                className="py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold transition-colors"
                title="Pusatkan ke Tugu Equator Bonjol"
              >
                📍 Bonjol
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Geospatial Metadata Provenance Modal (>2020 High-Accuracy Standards) */}
      <AnimatePresence>
        {showMetadataModal && (
          <motion.div
            key="metadata-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md"
            onClick={() => setShowMetadataModal(false)}
          >
            <motion.div
              key="metadata-modal-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                      Validitas & Metadata Spasial
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Standar SNI ISO 19115 &amp; Kebijakan Satu Peta (One Map Policy)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMetadataModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-4 space-y-3">
                <div className="p-3 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/70 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-indigo-900 dark:text-indigo-300">
                      {BASEMAP_METADATA[activeMapBasemap].name}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      {BASEMAP_METADATA[activeMapBasemap].badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    {BASEMAP_METADATA[activeMapBasemap].description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Tahun Akuisisi Data</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{BASEMAP_METADATA[activeMapBasemap].year}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Lembaga / Provider</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200 truncate block">{BASEMAP_METADATA[activeMapBasemap].provider}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Resolusi Spasial</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{BASEMAP_METADATA[activeMapBasemap].resolution}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Spesifikasi Akurasi</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{BASEMAP_METADATA[activeMapBasemap].accuracy}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                <span>Data di atas terverifikasi pasca-2020 dengan batas toleransi 2015.</span>
                <button
                  type="button"
                  onClick={() => setShowMetadataModal(false)}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-sm"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Seasonal Intelligence & Global Climate Consensus Modal */}
      <AnimatePresence>
        {showSeasonalModal && seasonalInfo && (
          <motion.div
            key="seasonal-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md"
            onClick={() => setShowSeasonalModal(false)}
          >
            <motion.div
              key="seasonal-modal-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/20 text-lg">
                    {seasonalInfo.seasonIcon}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <span>Konsensus Musim &amp; Iklim Global</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold border border-amber-500/20">
                        {seasonalInfo.zoneCategory}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Deteksi otomatis belahan bumi, peredaran matahari, dan jarak ke Garis Khatulistiwa WGS84
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSeasonalModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-3.5 space-y-4 no-scrollbar">
                {/* Hero Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-sky-500/10 border border-amber-500/20 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-600 dark:text-amber-400 block mb-1">
                      Status Musim Saat Ini ({new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })})
                    </span>
                    <h4 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{seasonalInfo.seasonIcon}</span>
                      <span>{seasonalInfo.seasonName}</span>
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      {seasonalInfo.precipitationCharacteristic}
                    </p>
                  </div>
                  {globalWeatherSummary?.temperature !== undefined && (
                    <div className="text-right shrink-0">
                      <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                        {globalWeatherSummary.temperature}°C
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                        {globalWeatherSummary.weatherDesc || 'Konsensus Global'}
                      </span>
                    </div>
                  )}
                </div>

                {/* 4 Feature Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-amber-500" /> Posisi Khatulistiwa
                    </span>
                    <p className="font-bold text-slate-800 dark:text-slate-100">
                      {Math.round(seasonalInfo.distanceToEquatorKm)} km ke Khatulistiwa (0°00'00")
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Belahan Bumi: <span className="font-semibold text-slate-700 dark:text-slate-300">{seasonalInfo.hemisphere}</span>
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-orange-500" /> Peredaran Astronomis Matahari
                    </span>
                    <p className="font-bold text-slate-800 dark:text-slate-100">
                      {seasonalInfo.solarPositionInfo}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Panjang Siang Hari: <span className="font-semibold text-slate-700 dark:text-slate-300">~{seasonalInfo.dayLengthHours.toFixed(1)} jam</span>
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                      <Wind className="w-3.5 h-3.5 text-cyan-500" /> Sirkulasi Monsun &amp; Angin
                    </span>
                    <p className="font-bold text-slate-800 dark:text-slate-100">
                      {seasonalInfo.monsoonWind}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Kecepatan saat ini: <span className="font-semibold text-slate-700 dark:text-slate-300">{windSpeedKmh} km/jam ({windDirectionDeg}°)</span>
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                      <Thermometer className="w-3.5 h-3.5 text-rose-500" /> Klimatologi Suhu &amp; Hujan
                    </span>
                    <p className="font-bold text-slate-800 dark:text-slate-100">
                      Rentang Suhu: {seasonalInfo.avgTempRange}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Curah Hujan Tipikal: <span className="font-semibold text-slate-700 dark:text-slate-300">{seasonalInfo.typicalRainMmMonth}</span>
                    </p>
                  </div>
                </div>

                {/* Monumen Geodetik Khatulistiwa */}
                <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                      Titik &amp; Monumen Khatulistiwa di Peta
                    </h5>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-2">
                    Lapisan emas pada peta menandai lintang 0° bumi yang melintasi Indonesia (Pontianak, Bonjol, Santan Ulu, Payahe) serta garis balik Cancer (23.44°N) &amp; Capricorn (23.44°S).
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {['Tugu Khatulistiwa Pontianak (0.000°)', 'Bonjol Pasaman Sumbar', 'Santan Ulu Kaltim', 'Mitad del Mundo (Ecuador)', 'Nanyuki (Kenya)'].map((loc) => (
                      <span key={loc} className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                        📍 {loc}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSeasonalModal(false);
                    navigate('/app/geospatial');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                >
                  <Satellite className="w-3.5 h-3.5" />
                  <span>Buka Studio Geospasial Lengkap</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSeasonalModal(false)}
                  className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Floating Panel Trigger Button (Ketika Tertutup) */}
      <AnimatePresence>
        {!showPanel && !showLayerManager && !showBasemapMenu && !showTrafficCorridors && !showObservationCoverage && !(weatherMapOverlay !== 'none' && showWindyMenu) && (
          <motion.button 
            key="panel-trigger-button"
            type="button"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              setShowLayerManager(false);
              setShowBasemapMenu(false);
              setShowWindyMenu(false);
              setShowTrafficCorridors(false);
              setShowObservationCoverage(false);
              setShowPanel(true);
            }}
            className="absolute bottom-6 right-6 z-20 flex items-center gap-3 rounded-2xl bg-white/95 dark:bg-slate-900/95 px-4 py-2.5 sm:py-3 shadow-2xl backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/90 transition-all hover:scale-[1.02] active:scale-95 group cursor-pointer shadow-brand-500/10"
            title="Klik untuk membuka Pengaturan Lapisan Peta (Harmony Maps)"
          >
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200/60 dark:border-brand-800/60 text-brand-600 dark:text-brand-400 shadow-xs">
              <Settings className="h-4 w-4 group-hover:rotate-90 transition-transform duration-500" />
              {activeLayersCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-500"></span>
                </span>
              )}
            </div>
            <div className="flex flex-col items-start text-left pr-0.5">
              <div className="flex items-center gap-1.5">
                <span className="font-display font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
                  Harmony Maps
                </span>
                {activeLayersCount > 0 ? (
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-black bg-brand-500 text-white shadow-xs">
                    {activeLayersCount}
                  </span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                {activeLayersCount > 0 ? `${activeLayersCount} layer aktif` : 'Lapisan & Mode Peta'}
              </span>
            </div>
          </motion.button>
        )}


        {/* Windy Quick Pill (Ketika Cuaca Aktif tetapi Menu Diminimalkan) */}
        {weatherMapOverlay !== 'none' && !showWindyMenu && !showPanel && !showLayerManager && !showBasemapMenu && !showTrafficCorridors && !showObservationCoverage && (
          <motion.button
            key="windy-quick-pill-button"
            type="button"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowWindyMenu(true)}
            className="absolute bottom-6 right-6 z-20 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 text-white px-4 py-2.5 sm:py-3 shadow-2xl backdrop-blur-xl border border-sky-400/40 hover:from-sky-500 hover:to-blue-500 transition-all hover:scale-[1.02] active:scale-95 group cursor-pointer shadow-sky-500/20"
            title="Buka Pengaturan Menu Peta Cuaca"
          >
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-white shadow-xs">
              <Wind className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
              </span>
            </div>
            <div className="flex flex-col items-start text-left pr-0.5">
              <div className="flex items-center gap-1.5">
                <span className="font-display font-bold text-xs sm:text-sm leading-tight">
                  Peta Cuaca
                </span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-500 text-white shadow-xs">
                  LIVE
                </span>
              </div>
              <span className="text-[10px] text-sky-100 font-medium">
                Aktif: {windyOverlay.toUpperCase()} • Klik untuk opsi
              </span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Floating Control Panel & Slide-Over Drawer (Ketika Terbuka) */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            key="control-panel-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPanel(false)}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 sm:hidden"
          />
        )}
        {showPanel && (
          <motion.div
            key="control-panel-drawer"
            initial={{ opacity: 0, x: 28, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 28, scale: 0.98, pointerEvents: 'none' }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="fixed sm:absolute top-auto bottom-0 sm:top-4 sm:bottom-4 right-0 sm:right-4 left-0 sm:left-auto z-50 w-full sm:w-96 max-h-[88vh] sm:max-h-[calc(100vh-2rem)] rounded-t-3xl sm:rounded-3xl bg-white/95 dark:bg-slate-900/95 shadow-2xl backdrop-blur-2xl border-t sm:border border-slate-200/80 dark:border-slate-800 flex flex-col overflow-hidden"
              role="dialog"
              aria-label="Pengaturan Harmony Maps"
            >
              {/* Mobile Drag Handle Bar */}
              <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

              {/* Fixed Header Section */}
              <div className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800/80 shrink-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400 shadow-sm">
                      <MapIcon className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-display text-base font-bold text-ink-900 dark:text-white leading-tight">
                          Harmony Maps
                        </h2>
                        {activeLayersCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-brand-500 text-white">
                            {activeLayersCount} Aktif
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {schools.length} Sekolah • {mountains.length} Gunung
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Header GPS Locate shortcut */}
                    <button
                      type="button"
                      onClick={handleFindUserLocation}
                      className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors"
                      title="Pusatkan ke Lokasi Saya"
                    >
                      <LocateFixed className="w-4 h-4" />
                    </button>

                    {/* Close Button */}
                    <button
                      type="button"
                      onClick={() => setShowPanel(false)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Tutup Pengaturan"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 2D / 3D Mode Selector */}
                <div className="mt-3 flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => handleToggle3D(false)}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      !is3D 
                        ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <MapIcon className="w-3.5 h-3.5" />
                    <span>2D Datar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleToggle3D(true);
                      handleSetGlobeType('globe');
                    }}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      is3D && globeType === 'globe'
                        ? 'bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 text-white shadow-sm shadow-sky-500/30' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                    title="Semesta Tata Surya & Bima Sakti 3D (Three.js WebGL)"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Kosmik 3D</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleToggle3D(true);
                      handleSetGlobeType('cesium');
                    }}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      is3D && globeType === 'cesium'
                        ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-sm shadow-sky-500/30' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                    title="Globe 3D Realistis CesiumJS"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Cesium 3D</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleToggle3D(true);
                      handleSetGlobeType('perspective');
                    }}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      is3D && globeType === 'perspective'
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm shadow-indigo-500/30' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                    title="Sudut Pandang Miring 3D"
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>3D Miring</span>
                  </button>
                </div>

                {/* Mode Performa & Kompatibilitas Perangkat */}
                <div className="mt-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Zap className={`w-3.5 h-3.5 ${effectivePerfMode === 'lite' ? 'text-emerald-500' : 'text-indigo-500'}`} />
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                        Mode Performa (Anti-Lag)
                      </span>
                    </div>
                    <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${
                      effectivePerfMode === 'lite'
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                    }`}>
                      {effectivePerfMode === 'lite' ? '🚀 60fps Ringan' : '✨ Grafis Penuh'}
                    </span>
                  </div>

                  <div className="flex items-center p-0.5 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setPerfMode('lite')}
                      className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        perfMode === 'lite'
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title="Mode Ringan: Anti-lag untuk PC/laptop spesifikasi rendah dan HP. Mengoptimalkan DPR dan menonaktifkan filter blur berat."
                    >
                      <Zap className="w-3 h-3" />
                      <span>Ringan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPerfMode('auto')}
                      className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        perfMode === 'auto'
                          ? 'bg-brand-500 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title="Mode Otomatis: Deteksi otomatis kemampuan CPU, RAM, dan GPU perangkat"
                    >
                      <Cpu className="w-3 h-3" />
                      <span>Otomatis</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPerfMode('high')}
                      className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        perfMode === 'high'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title="Mode Grafis Penuh: Detail retina maksimal"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Maksimal</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1 text-[9px] text-slate-500 dark:text-slate-400 px-0.5">
                    <Info className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                    <span className="truncate">
                      {perfProfile.diagnostics.cores} Cores
                      {perfProfile.diagnostics.memoryGB ? ` • ${perfProfile.diagnostics.memoryGB}GB RAM` : ''}
                      {perfProfile.isLowSpecDetected ? ' • Profil hemat aktif otomatis' : ' • Hardware optimal'}
                    </span>
                  </div>
                </div>

                {/* Categorized Filter Tabs */}
                <div className="relative mt-3">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 touch-pan-x scroll-smooth snap-x pr-6">
                    {[
                      { id: 'all', label: '🌟 Semua' },
                      { id: 'tools', label: 'Alat & Analisis' },
                      { id: 'basemap', label: '🗺️ Mode Peta' },
                      { id: 'disaster', label: '🌋 Bencana' },
                      { id: 'weather', label: '🌤️ Cuaca' },
                      { id: 'places', label: '🏫 Wilayah' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setPanelTab(tab.id as any)}
                        className={`shrink-0 snap-start px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                          panelTab === tab.id
                            ? 'bg-brand-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div className="pointer-events-none absolute right-0 top-0 bottom-1.5 w-6 bg-gradient-to-l from-white dark:from-slate-900 to-transparent" />
                </div>
              </div>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {(panelTab === 'all' || panelTab === 'tools') && (
                  <section aria-label="Alat dan analisis peta" className="space-y-3">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Alat & Analisis</h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Buka alat peta dan pilih analisis dalam satu tempat.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Zona Rawan Bencana', description: 'Pusat edukasi risiko sekolah & bahaya alam', icon: AlertCircle, action: () => { closeMapDrawers(); setShowDisasterRiskCenter(true); } },
                        { label: 'Panduan WebGIS', description: 'Tutorial interaktif untuk orang awam', icon: BookOpen, action: () => { closeMapDrawers(); setShowWebGisTutorial(true); } },
                        { label: 'Studio Geospasial', description: 'Cuaca dan observasi bumi', icon: CloudSun, action: () => openStudioDomain() },
                        { label: 'Katalog Sensor Bumi', description: 'Alat dan jenis pengamatan', icon: Radio, action: () => { closeMapDrawers(); setShowMasterTaxonomyModal(true); } },
                        { label: 'Manajer Lapisan', description: 'Visibilitas dan opasitas layer', icon: Layers, action: () => { closeMapDrawers(); setShowLayerManager(true); } },
                        { label: 'Navigasi & Rute', description: 'Cari dan tampilkan perjalanan', icon: Navigation, action: () => { closeMapDrawers(); setShowRouteModal(true); } },
                      ].map(({ label, description, icon: Icon, action }) => (
                        <button key={label} type="button" onClick={action} className="flex items-start gap-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-3 text-left transition-colors hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500">
                          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                          <span className="min-w-0">
                            <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100">{label}</span>
                            <span className="mt-1 block text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{description}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                    <details className="group rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3 text-xs font-semibold text-slate-700 dark:text-slate-200 [&::-webkit-details-marker]:hidden">
                        <span>Pilih menu analisis <span className="ml-1 font-normal text-slate-500">({STUDIO_DOMAINS.length})</span></span>
                        <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="grid grid-cols-2 gap-2 px-3 pb-3">
                        {STUDIO_DOMAINS.map(({ id, name, icon: Icon }) => (
                          <button key={id} type="button" onClick={() => openStudioDomain(id)} data-studio-domain={id} className="flex items-start gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-2.5 py-2.5 text-left text-[11px] font-medium leading-relaxed text-slate-700 dark:text-slate-200 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                            <span>{name}</span>
                          </button>
                        ))}
                      </div>
                    </details>
                  </section>
                )}
                {/* 1. Mode & Lapisan Peta Geospasial (>2020 Data) */}
                {(panelTab === 'all' || panelTab === 'basemap') && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Mode &amp; Lapisan Peta
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowMetadataModal(true)}
                        className="text-[10px] text-indigo-500 hover:underline font-bold flex items-center gap-0.5"
                      >
                        <Info className="w-3 h-3" /> Info Data
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(BASEMAP_METADATA) as MapBasemapType[]).map((type) => {
                        const meta = BASEMAP_METADATA[type];
                        const isSelected = activeMapBasemap === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => handleSelectBasemap(type)}
                            className={`flex flex-col items-start p-2 rounded-xl border text-left transition-all ${
                              isSelected
                                ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold shadow-sm'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-transparent text-slate-700 dark:text-slate-300 font-medium'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 w-full">
                              <span>
                                {type === 'osm' && '🗺️'}
                                {type === 'satellite' && '🛰️'}
                                {type === 'elevation' && '⛰️'}
                                {type === 'thermal' && '🌡️'}
                                {type === 'traffic' && '🛣️'}
                                {type === 'dark' && '🌌'}
                              </span>
                              <span className="text-xs font-semibold truncate">{meta.name}</span>
                            </div>
                            <span className="text-[9px] font-mono opacity-75 mt-0.5">{meta.badge}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Traffic Flow Overlay Switch */}
                    <div className="mt-3 flex items-center justify-between p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50">
                      <label className="flex items-center gap-2 select-none text-xs text-ink-700 dark:text-slate-300 font-semibold cursor-pointer">
                        <Car className="h-4 w-4 text-purple-500" />
                        <span>Lintasan Jalan & Koridor Trafik</span>
                      </label>
                      <Toggle 
                        checked={showTrafficCorridors} 
                        label="Lintasan Jalan & Koridor Trafik"
                        onChange={(val) => { closeMapDrawers(); setShowTrafficCorridors(val); }}
                        activeClass="bg-purple-600" 
                      />
                    </div>

                    {/* Observation Coverage & Data Gap Switch */}
                    <div className="mt-2.5 flex items-center justify-between p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50">
                      <label className="flex items-center gap-2 select-none text-xs text-ink-700 dark:text-slate-300 font-semibold cursor-pointer">
                        <Radio className="h-4 w-4 text-emerald-500" />
                        <span>Cakupan Sensor &amp; Blank Spot Observasi</span>
                      </label>
                      <Toggle 
                        checked={showObservationCoverage} 
                        label="Cakupan Sensor & Blank Spot Observasi"
                        onChange={(val) => { closeMapDrawers(); setShowObservationCoverage(val); }}
                        activeClass="bg-emerald-600" 
                      />
                    </div>

                    {/* Bottom Intelligence & Traffic Dock Switch */}
                    <div className="mt-2.5 flex items-center justify-between p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50">
                      <label className="flex items-center gap-2 select-none text-xs text-ink-700 dark:text-slate-300 font-semibold cursor-pointer">
                        <Sliders className="h-4 w-4 text-teal-500" />
                        <span>Dock Lintasan &amp; Lalu Lintas Bawah</span>
                      </label>
                      <Toggle 
                        checked={showBottomDock || showGeospatialIntelBar || showTrafficControlBar} 
                        label="Dock Lintasan & Lalu Lintas Bawah"
                        onChange={(val) => {
                          setShowBottomDock(val);
                          if (!val) {
                            setShowGeospatialIntelBar(false);
                            setShowTrafficControlBar(false);
                          }
                          try {
                            window.localStorage.setItem(`hm_show_bottom_dock_${activeUserId}`, String(val));
                            if (!val) {
                              window.localStorage.setItem(`hm_geospatial_intel_bar_${activeUserId}`, 'false');
                              window.localStorage.setItem(`hm_traffic_bar_${activeUserId}`, 'false');
                            }
                          } catch (e) {}
                        }} 
                        activeClass="bg-teal-600" 
                      />
                    </div>
                  </div>
                )}

                {/* 2. Geologi & Bencana Alam */}
                {(panelTab === 'all' || panelTab === 'disaster') && (
                  <>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Geologi & Tektonik</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 select-none text-sm text-ink-700 dark:text-slate-300">
                            <Activity className="h-4 w-4 text-orange-500" /> Lempeng Tektonik
                          </label>
                          <Toggle checked={showTectonic} onChange={setShowTectonic} activeClass="bg-orange-500" />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 select-none text-sm text-ink-700 dark:text-slate-300">
                            <Activity className="h-4 w-4 text-red-500" /> Gempa Bumi Realtime
                          </label>
                          <Toggle checked={showEarthquakes} onChange={setShowEarthquakes} activeClass="bg-red-500" />
                        </div>
                        <div className="space-y-2.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-1.5 select-none text-sm font-semibold text-ink-800 dark:text-slate-200">
                              <Radio className="h-4 w-4 text-sky-500 animate-pulse" /> Earth Sensor Registry
                              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-full ml-1">
                                {sensorRegistryStats.total} Stasiun
                              </span>
                            </label>
                            <Toggle checked={showTsunamiSensors} onChange={setShowTsunamiSensors} activeClass="bg-sky-500" />
                          </div>

                          {showTsunamiSensors && (
                            <div className="pl-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Filter Keluarga Sensor:</span>
                              </div>

                              <div className="flex flex-wrap gap-1">
                                <button
                                  type="button"
                                  onClick={() => setSensorFamilyFilter('ALL')}
                                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
                                    sensorFamilyFilter === 'ALL'
                                      ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  Semua ({sensorRegistryStats.total})
                                </button>
                                {Object.entries(SENSOR_FAMILY_META).map(([famKey, meta]) => {
                                  const count = sensorRegistryStats.countByFamily[famKey as SensorFamily] || 0;
                                  if (count === 0) return null;
                                  const isSelected = sensorFamilyFilter === famKey;
                                  return (
                                    <button
                                      key={famKey}
                                      type="button"
                                      onClick={() => setSensorFamilyFilter(famKey as SensorFamily)}
                                      className={`text-[10px] font-medium px-2 py-0.5 rounded-lg border flex items-center gap-1 transition-all ${
                                        isSelected
                                          ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-950 font-bold shadow-sm'
                                          : 'bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                                      }`}
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.colorHex }} />
                                      {meta.code}. {meta.name.split(' ')[0]} ({count})
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                        <span>Profil Gunung Api & Bencana</span>
                        <span className="text-[10px] text-red-500 font-semibold flex items-center gap-1">
                          <Flame className="w-3 h-3" /> PVMBG Magma
                        </span>
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 select-none text-sm text-ink-700 dark:text-slate-300">
                            <Mountain className="h-4 w-4 text-red-500" /> Gunung Api Aktif
                          </label>
                          <Toggle checked={showActive} onChange={setShowActive} activeClass="bg-red-500" />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 select-none text-sm text-ink-700 dark:text-slate-300">
                            <Mountain className="h-4 w-4 text-orange-500" /> Gunung Api Waspada
                          </label>
                          <Toggle checked={showInactive} onChange={setShowInactive} activeClass="bg-orange-500" />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 select-none text-sm text-ink-700 dark:text-slate-300">
                            <Mountain className="h-4 w-4 text-slate-400" /> Puncak Gunung
                          </label>
                          <Toggle checked={showPeaks} onChange={setShowPeaks} activeClass="bg-slate-400" />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* 3. Lapisan Cuaca Realtime */}
                {(panelTab === 'all' || panelTab === 'weather') && (
                  <div>
                    <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 p-3">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                        <Thermometer className="h-4 w-4 text-sky-500" /> Kartu Cuaca di Peta
                      </label>
                      <Toggle 
                        checked={showWeatherCard} 
                        onChange={(val) => {
                          setShowWeatherCard(val);
                          try {
                            window.localStorage.setItem(`hm_weather_card_${activeUserId}`, String(val));
                          } catch (e) {}
                        }} 
                        activeClass="bg-sky-500" 
                        label="Kartu Cuaca di Peta" 
                      />
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Lapisan Cuaca Realtime
                      </h3>
                      {weatherMapOverlay !== 'none' && (
                        <button
                          onClick={() => setWeatherMapOverlay('none')}
                          className="text-[10px] text-blue-500 hover:underline font-semibold"
                        >
                          Reset Cuaca
                        </button>
                      )}
                    </div>

                    {/* Weather Render Mode Selector */}
                    <div className="flex items-center gap-1 mb-2.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setWeatherRenderMode('native')}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all ${
                          weatherRenderMode === 'native'
                            ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        📡 Radar Native (OpenLayers)
                      </button>
                    </div>

                    {weatherRenderMode === 'native' && radarFrameTime && (
                      <div className="mb-2 p-2 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/60 dark:border-sky-800/60 text-[10.5px] text-sky-800 dark:text-sky-300 flex items-center justify-between">
                        <span>Waktu Frame Radar: <strong>{new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(radarFrameTime * 1000))} WIB</strong></span>
                        <span className="text-[9.5px] opacity-75">Max Zoom 7 (Overzoom visual)</span>
                      </div>
                    )}
                    {weatherRenderMode === 'native' && weatherMapOverlay !== 'none' && !['radar', 'bmkg_radar', 'rain'].includes(weatherMapOverlay) && (
                      <div className="mb-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 text-[10.5px] text-amber-800 dark:text-amber-200 space-y-1">
                        <div className="font-semibold flex items-center justify-between">
                          <span>Layer {weatherMapOverlay.toUpperCase()} Membutuhkan Model ECMWF</span>
                          <button
                            type="button"
                            onClick={() => setWeatherRenderMode('windy')}
                            className="px-2 py-0.5 rounded bg-amber-600 text-white text-[9.5px] font-bold hover:bg-amber-700"
                          >
                            Beralih ke Windy
                          </button>
                        </div>
                        <p className="text-[10px] opacity-90">Radar native OpenLayers hanya memuat reflektivitas presipitasi hujan (RainViewer). Parameter angin/suhu/awan dimodelkan melalui kanvas ECMWF Windy.</p>
                      </div>
                    )}
                    {radarTileLoadError && (
                      <div className="mb-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[10.5px] text-amber-800 dark:text-amber-300">
                        Sebagian tile radar cuaca tidak dapat dimuat dari penyedia (coverage terbatas atau rate limit).
                      </div>
                    )}

                    {/* Windy Status & Launcher Card */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-blue-600/10 via-sky-600/10 to-indigo-600/10 border border-sky-500/30 dark:border-sky-400/20 mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-sky-500 text-white shadow-sm">
                          <Wind className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                            Peta Cuaca
                            <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full border flex items-center gap-1 ${weatherBadgeColor}`}>
                              {weatherStatusText === 'LIVE RADAR' || weatherStatusText === 'MODEL ECMWF' ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                              ) : null}
                              {weatherStatusText}
                            </span>
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            {weatherMapOverlay !== 'none'
                              ? `Aktif: ${weatherMapOverlay.toUpperCase()} (${weatherRenderMode === 'native' ? 'Layer OpenLayers Native' : 'Viewer Windy Eksternal'})`
                              : 'Pilih parameter di bawah'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={openWindyFullscreen}
                        className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-bold transition-all shadow-sm flex items-center gap-1"
                        title="Buka Peta Cuaca Layar Penuh"
                      >
                        <ExternalLink className="w-3 h-3" /> Layar Penuh
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => handleSelectWeatherOverlay('rain')} 
                        className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-all text-xs font-medium ${weatherMapOverlay === 'rain' ? 'bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400 font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-transparent text-slate-700 dark:text-slate-300'}`}
                      >
                        <CloudRain className="h-4 w-4 text-blue-500" /> Hujan &amp; Petir
                      </button>
                      <button 
                        onClick={() => handleSelectWeatherOverlay('temp')} 
                        className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-all text-xs font-medium ${weatherMapOverlay === 'temp' ? 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400 font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-transparent text-slate-700 dark:text-slate-300'}`}
                      >
                        <Thermometer className="h-4 w-4 text-rose-500" /> Suhu
                      </button>
                      <button 
                        onClick={() => handleSelectWeatherOverlay('wind')} 
                        className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-all text-xs font-medium ${weatherMapOverlay === 'wind' ? 'bg-teal-500/15 border-teal-500/40 text-teal-600 dark:text-teal-400 font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-transparent text-slate-700 dark:text-slate-300'}`}
                      >
                        <Wind className="h-4 w-4 text-teal-500" /> Angin
                      </button>
                      <button 
                        onClick={() => handleSelectWeatherOverlay('clouds')} 
                        className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-all text-xs font-medium ${weatherMapOverlay === 'clouds' ? 'bg-slate-500/15 border-slate-500/40 text-slate-700 dark:text-slate-200 font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-transparent text-slate-700 dark:text-slate-300'}`}
                      >
                        <Cloud className="h-4 w-4 text-slate-400" /> Awan
                      </button>
                      <button 
                        onClick={() => handleSelectWeatherOverlay('pm2p5')} 
                        className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-all text-xs font-medium ${weatherMapOverlay === 'pm2p5' ? 'bg-purple-500/15 border-purple-500/40 text-purple-600 dark:text-purple-400 font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-transparent text-slate-700 dark:text-slate-300'}`}
                      >
                        <Activity className="h-4 w-4 text-purple-500" /> Kualitas Udara
                      </button>
                      <button 
                        onClick={() => handleSelectWeatherOverlay('ozone')} 
                        className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-all text-xs font-medium ${weatherMapOverlay === 'ozone' ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-transparent text-slate-700 dark:text-slate-300'}`}
                      >
                        <Globe className="h-4 w-4 text-indigo-500" /> Lapisan Ozon
                      </button>
                      <button 
                        onClick={() => handleSelectWeatherOverlay('waves')} 
                        className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-all text-xs font-medium ${weatherMapOverlay === 'waves' ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-600 dark:text-cyan-400 font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-transparent text-slate-700 dark:text-slate-300'}`}
                      >
                        <Waves className="h-4 w-4 text-cyan-500" /> Gelombang Laut
                      </button>
                      <button 
                        onClick={() => handleSelectWeatherOverlay('pressure')} 
                        className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-all text-xs font-medium ${weatherMapOverlay === 'pressure' ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-transparent text-slate-700 dark:text-slate-300'}`}
                      >
                        <Gauge className="h-4 w-4 text-amber-500" /> Tekanan Udara
                      </button>
                      <button 
                        onClick={() => handleSelectWeatherOverlay('radar')} 
                        className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-all text-xs font-medium ${weatherMapOverlay === 'radar' ? 'bg-sky-500/15 border-sky-500/40 text-sky-600 dark:text-sky-400 font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-transparent text-slate-700 dark:text-slate-300'}`}
                      >
                        <Radio className="h-4 w-4 text-sky-500" /> Radar Cuaca
                      </button>
                      <button 
                        onClick={() => handleSelectWeatherOverlay('satellite')} 
                        className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-all text-xs font-medium ${weatherMapOverlay === 'satellite' ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-transparent text-slate-700 dark:text-slate-300'}`}
                      >
                        <Satellite className="h-4 w-4 text-indigo-500" /> Satelit Cuaca
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. Batas Wilayah & Tata Ruang + Sekolah */}
                {(panelTab === 'all' || panelTab === 'places') && (
                  <>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Batas Wilayah & Tata Ruang</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 select-none text-sm text-ink-700 dark:text-slate-300" title="Garis Lintang 0° Khatulistiwa & Batas Garis Balik Tropis (±23.44°)">
                            <Compass className="h-4 w-4 text-amber-500" /> Garis Khatulistiwa & Iklim
                          </label>
                          <Toggle 
                            checked={showEquatorZones} 
                            onChange={(val) => {
                              setShowEquatorZones(val);
                              try { window.localStorage.setItem('hm_equator_zones', String(val)); } catch (e) {}
                              if (equatorLayerRef.current) {
                                equatorLayerRef.current.setVisible(val);
                              }
                            }} 
                            activeClass="bg-amber-500" 
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 select-none text-sm text-ink-700 dark:text-slate-300" title="Terlihat saat zoom-in (Level 10+)">
                            <TreePine className="h-4 w-4 text-green-500" /> Hutan & Cagar Alam
                          </label>
                          <Toggle checked={showForests} onChange={setShowForests} activeClass="bg-green-500" />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 select-none text-sm text-ink-700 dark:text-slate-300">
                            <MapIcon2 className="h-4 w-4 text-indigo-500" /> Kota
                          </label>
                          <Toggle checked={showKota} onChange={setShowKota} activeClass="bg-indigo-500" />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 select-none text-sm text-ink-700 dark:text-slate-300">
                            <MapIcon2 className="h-4 w-4 text-orange-500" /> Kabupaten
                          </label>
                          <Toggle checked={showKabupaten} onChange={setShowKabupaten} activeClass="bg-orange-500" />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 select-none text-sm text-ink-700 dark:text-slate-300" title="Terlihat saat zoom-in (Level 11+)">
                            <MapPin className="h-4 w-4 text-amber-500" /> Desa
                          </label>
                          <Toggle checked={showDesa} onChange={setShowDesa} activeClass="bg-amber-500" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Data Pendidikan & Sekolah</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 select-none text-sm text-ink-700 dark:text-slate-300">
                            <Building2 className="h-4 w-4 text-cyan-500" /> SD / MI
                          </label>
                          <Toggle checked={showSD} onChange={setShowSD} activeClass="bg-cyan-500" />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 select-none text-sm text-ink-700 dark:text-slate-300">
                            <Building2 className="h-4 w-4 text-blue-500" /> SMP / MTs
                          </label>
                          <Toggle checked={showSMP} onChange={setShowSMP} activeClass="bg-blue-500" />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 select-none text-sm text-ink-700 dark:text-slate-300">
                            <Building2 className="h-4 w-4 text-indigo-900 dark:text-indigo-400" /> SMA / SMK
                          </label>
                          <Toggle checked={showSMA} onChange={setShowSMA} activeClass="bg-indigo-900 dark:bg-indigo-500" />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Fixed Footer Section */}
              <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800/80 shrink-0 bg-slate-50/80 dark:bg-slate-900/80 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetLayerSettings}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shrink-0 cursor-pointer"
                  title="Nonaktifkan semua layer kembali ke default"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Reset</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPanel(false)}
                  className="flex-1 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-sm active:scale-[0.99] cursor-pointer text-center"
                >
                  Tutup Pengaturan
                </button>
              </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Side Drawer: Mode Peta & Lapisan Spasial (Full Bagian Kanan) */}
      <AnimatePresence>
        {showBasemapMenu && (
          <motion.div
            key="basemap-menu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowBasemapMenu(false)}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 sm:hidden"
          />
        )}
        {showBasemapMenu && (
          <motion.div
            key="basemap-menu-panel"
            initial={{ opacity: 0, x: 28, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 28, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="fixed sm:absolute top-auto bottom-0 sm:top-4 sm:bottom-4 right-0 sm:right-4 left-0 sm:left-auto z-50 w-full sm:w-96 max-h-[88vh] sm:max-h-[calc(100vh-2rem)] rounded-t-3xl sm:rounded-3xl bg-white/95 dark:bg-slate-900/95 shadow-2xl backdrop-blur-2xl border-t sm:border border-slate-200/80 dark:border-slate-800 flex flex-col overflow-hidden"
            >
              {/* Mobile Drag Handle Bar */}
              <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

              {/* Fixed Header Section */}
              <div className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800/80 shrink-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400 shadow-sm">
                      <Layers className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-display text-base font-bold text-ink-900 dark:text-white leading-tight">
                          Mode Peta &amp; Lapisan Spasial
                        </h2>
                      </div>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        Data &gt;2020 Terverifikasi • 6 Kanvas Basemap
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowBasemapMenu(false)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Tutup Pengaturan"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 2D / 3D Mode Selector */}
                <div className="mt-3 flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => handleToggle3D(false)}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      !is3D
                        ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <MapIcon className="w-3.5 h-3.5" />
                    <span>2D Datar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleToggle3D(true);
                      handleSetGlobeType('globe');
                    }}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      is3D && globeType === 'globe'
                        ? 'bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 text-white shadow-sm shadow-sky-500/30'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                    title="Semesta Tata Surya & Bima Sakti 3D (Three.js WebGL)"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Kosmik 3D</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleToggle3D(true);
                      handleSetGlobeType('cesium');
                    }}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      is3D && globeType === 'cesium'
                        ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-sm shadow-sky-500/30'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                    title="Globe 3D Realistis CesiumJS"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Cesium 3D</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleToggle3D(true);
                      handleSetGlobeType('perspective');
                    }}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      is3D && globeType === 'perspective'
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm shadow-indigo-500/30'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                    title="Sudut Pandang Miring 3D"
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>3D Miring</span>
                  </button>
                </div>

                {/* Mode Performa & Kompatibilitas Perangkat */}
                <div className="mt-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Zap className={`w-3.5 h-3.5 ${effectivePerfMode === 'lite' ? 'text-emerald-500' : 'text-indigo-500'}`} />
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                        Mode Performa (Anti-Lag)
                      </span>
                    </div>
                    <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${
                      effectivePerfMode === 'lite'
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                    }`}>
                      {effectivePerfMode === 'lite' ? '🚀 60fps Ringan' : '✨ Grafis Penuh'}
                    </span>
                  </div>

                  <div className="flex items-center p-0.5 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setPerfMode('lite')}
                      className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        perfMode === 'lite'
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title="Mode Ringan: Anti-lag untuk PC/laptop spesifikasi rendah dan HP. Mengoptimalkan DPR dan menonaktifkan filter blur berat."
                    >
                      <Zap className="w-3 h-3" />
                      <span>Ringan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPerfMode('auto')}
                      className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        perfMode === 'auto'
                          ? 'bg-brand-500 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title="Mode Otomatis: Deteksi otomatis kemampuan CPU, RAM, dan GPU perangkat"
                    >
                      <Cpu className="w-3 h-3" />
                      <span>Otomatis</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPerfMode('high')}
                      className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        perfMode === 'high'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title="Mode Grafis Penuh: Detail retina maksimal"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Maksimal</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Pilihan Basemap Resmi
                    </h3>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      6 Mode Tersedia
                    </span>
                  </div>

                  <div className="space-y-2">
                    {(Object.keys(BASEMAP_METADATA) as MapBasemapType[]).map((type) => {
                      const meta = BASEMAP_METADATA[type];
                      const isSelected = activeMapBasemap === type;

                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleSelectBasemap(type)}
                          className={`w-full flex items-start gap-3 p-3 rounded-2xl text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-500/50 text-indigo-700 dark:text-indigo-300 shadow-sm ring-1 ring-indigo-500/30'
                              : 'bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60 shadow-xs'
                          }`}
                        >
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white font-bold text-base shadow-sm mt-0.5"
                            style={{ backgroundColor: meta.color }}
                          >
                            {type === 'osm' && '🗺️'}
                            {type === 'satellite' && '🛰️'}
                            {type === 'elevation' && '⛰️'}
                            {type === 'thermal' && '🌡️'}
                            {type === 'traffic' && '🛣️'}
                            {type === 'dark' && '🌌'}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold truncate flex items-center gap-1.5">
                                {meta.name}
                                {isSelected && (
                                  <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                )}
                              </p>
                              <span
                                className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                }`}
                              >
                                {isSelected ? '✓ Aktif' : meta.badge}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                              {meta.description}
                            </p>
                            <p className="text-[9px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1">
                              {meta.year} • {meta.provider.split(',')[0]}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Additional Quick Toggles */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Lapisan Tambahan
                  </h3>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50">
                    <label className="flex items-center gap-2 select-none text-xs text-ink-700 dark:text-slate-300 font-semibold cursor-pointer">
                      <Car className="h-4 w-4 text-purple-500" />
                      <span>Lintasan Jalan &amp; Koridor Trafik</span>
                    </label>
                    <Toggle 
                      checked={showTrafficCorridors} 
                      onChange={(val) => setShowTrafficCorridors(val)} 
                      activeClass="bg-purple-600" 
                    />
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50">
                    <label className="flex items-center gap-2 select-none text-xs text-ink-700 dark:text-slate-300 font-semibold cursor-pointer">
                      <Radio className="h-4 w-4 text-emerald-500" />
                      <span>Cakupan Sensor &amp; Blank Spot Observasi</span>
                    </label>
                    <Toggle 
                      checked={showObservationCoverage} 
                      onChange={(val) => setShowObservationCoverage(val)} 
                      activeClass="bg-emerald-600" 
                    />
                  </div>
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800/80 shrink-0 bg-slate-50/80 dark:bg-slate-900/80 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectBasemap('osm')}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shrink-0 cursor-pointer"
                  title="Kembali ke Peta Vektor Standar"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Reset Default</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowBasemapMenu(false)}
                  className="flex-1 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-sm active:scale-[0.99] cursor-pointer text-center"
                >
                  Tutup Pengaturan
                </button>
              </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Side Drawer: Peta Cuaca Live (Bagian Kanan) */}
      <AnimatePresence>
        {weatherMapOverlay !== 'none' && showWindyMenu && mapMode === 'spatial' && (
          <motion.div
            key="windy-menu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowWindyMenu(false)}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 sm:hidden"
            style={{ zIndex: showWindyModal ? 10000 : undefined }}
          />
        )}
        {weatherMapOverlay !== 'none' && showWindyMenu && mapMode === 'spatial' && (
          <motion.div
            key="windy-menu-panel"
            role="dialog"
            aria-label="Peta Cuaca"
            style={{ zIndex: showWindyModal ? 10001 : undefined }}
            initial={{ opacity: 0, x: 28, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 28, scale: 0.98, pointerEvents: 'none' }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="fixed sm:absolute top-auto bottom-0 sm:top-4 sm:bottom-4 right-0 sm:right-4 left-0 sm:left-auto z-50 w-full sm:w-96 max-h-[88vh] sm:max-h-[calc(100vh-2rem)] rounded-t-3xl sm:rounded-3xl bg-white/95 dark:bg-slate-900/95 shadow-2xl backdrop-blur-2xl border-t sm:border border-slate-200/80 dark:border-slate-800 flex flex-col overflow-hidden"
            >
              {/* Mobile Drag Handle Bar */}
              <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

              {/* Fixed Header Section */}
              <div className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800/80 shrink-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400 shadow-sm">
                      <Wind className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-display text-base font-bold text-ink-900 dark:text-white leading-tight">
                          Peta Cuaca
                        </h2>
                        <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full border flex items-center gap-1 ${weatherBadgeColor}`}>
                          {weatherStatusText === 'LIVE RADAR' || weatherStatusText === 'MODEL ECMWF' ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                          ) : null}
                          {weatherStatusText}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        Peta dari penyedia eksternal • tidak menjadi masukan numerik Harmony
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateWindyLocation()}
                      className="p-2 rounded-xl text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Sinkronkan Posisi Peta dengan Koordinat Layar"
                    >
                      <LocateFixed className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowWindyMenu(false)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Tutup Menu Cuaca (Peta Cuaca Tetap Aktif)"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Quick Parameter Info Pill */}
                <div className="mt-3 flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                    <span className="text-sm">
                      {WINDY_PARAM_CONFIG.find(p => p.id === windyOverlay)?.icon || '🌤️'}
                    </span>
                    <span className="truncate">
                      Aktif: <strong className="text-sky-600 dark:text-sky-400">{WINDY_PARAM_CONFIG.find(p => p.id === windyOverlay)?.name || windyOverlay.toUpperCase()}</strong>
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 font-bold text-slate-600 dark:text-slate-300 shadow-2xs">
                    Zoom {windyCoords.zoom}x
                  </span>
                </div>
              </div>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Pilih Parameter Observasi
                    </h3>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {WINDY_PARAM_CONFIG.length} Lapisan
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {WINDY_PARAM_CONFIG.map((param) => {
                      const isSelected = windyOverlay === param.id;
                      return (
                        <button
                          key={param.id}
                          type="button"
                          aria-pressed={isSelected}
                          data-windy-parameter={param.id}
                          onClick={() => {
                            handleApplyWeatherOverlay(param.id);
                          }}
                          className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-sky-50 dark:bg-sky-950/50 border-sky-500 text-sky-700 dark:text-sky-300 font-bold shadow-sm ring-1 ring-sky-500/30'
                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-transparent text-slate-700 dark:text-slate-300 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 w-full">
                            <span className="text-base">{param.icon}</span>
                            <span className="text-xs font-bold truncate">{param.name}</span>
                          </div>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-tight mt-1 line-clamp-1">
                            {param.desc}
                          </p>
                          <span className={`text-[9px] font-mono mt-1 px-1.5 py-0.2 rounded-md ${
                            isSelected ? 'bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 font-bold' : 'bg-slate-200/60 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400'
                          }`}>
                            {param.badge}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Additional Guidance / Info Box */}
                <div className="p-3 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/60 dark:border-sky-800/50 text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-sky-700 dark:text-sky-300">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>Integrasi Peta Cuaca Langsung</span>
                  </div>
                  <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
                    Kanvas Windy ditampilkan realtime dengan sinkronisasi koordinat lintang {windyCoords.lat}°, bujur {windyCoords.lng}°. Anda dapat menggeser langsung peta cuaca atau membuka mode Layar Penuh.
                  </p>
                </div>
              </div>

              {/* Fixed Footer Action Buttons */}
              <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800/80 shrink-0 bg-slate-50/80 dark:bg-slate-900/80 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => showWindyModal ? setShowWindyModal(false) : openWindyFullscreen()}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shrink-0 cursor-pointer"
                  title={showWindyModal ? 'Keluar dari Layar Penuh' : 'Buka Peta Cuaca Layar Penuh'}
                >
                  <ExternalLink className="w-3.5 h-3.5 text-sky-500" />
                  <span>{showWindyModal ? 'Keluar Layar Penuh' : 'Layar Penuh'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWeatherMapOverlay('none');
                    setShowWindyMenu(false);
                    setShowWindyModal(false);
                  }}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-sm active:scale-[0.99] cursor-pointer text-center flex items-center justify-center gap-1.5"
                  title="Nonaktifkan Peta Cuaca dan Kembali ke Peta Geospasial Utama"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Kembali ke Peta Utama</span>
                </button>
              </div>
            </motion.div>
        )}
      </AnimatePresence>
        </>
      )}


      {/* Popup Overlay Container */}
      <div style={{ display: 'none' }}>
        {/* Kept completely empty so React doesn't crash when innerHTML replaces its contents */}
        <div
          ref={popupRef}
          className="bg-white rounded-lg shadow-xl pointer-events-auto"
          style={{
            display: 'none',
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            padding: '4px'
          }}
        />
      </div>

      {/* Geospatial Earth Intelligence Studio Modal (Cloud Button) */}
      <GeospatialWeatherModal
        isOpen={showGeospatialModal}
        onClose={() => setShowGeospatialModal(false)}
        initialDomain={geospatialModalDomain}
        lat={userCoords?.lat ?? selection?.school?.lat ?? activeSchoolLat}
        lng={userCoords?.lng ?? selection?.school?.lng ?? activeSchoolLng}
        locationName={userPreciseLocation?.shortDisplay || (currentUser ? (selection?.school?.name || activeSchoolName) : null) || (userCoords ? `Koordinat (${userCoords.lat.toFixed(3)}°, ${userCoords.lng.toFixed(3)}°)` : 'Wilayah Geospasial')}
        userPreciseLocation={userPreciseLocation}
        mountains={mountains}
        earthquakes={earthquakes}
        schools={schools}
        onApplyFeaturesToMap={(features: any[], _layerName?: string) => {
          if (!analysisSourceRef.current) return;
          try {
            const olGeoJSON = new GeoJSON();
            const olFeatures = olGeoJSON.readFeatures(
              { type: 'FeatureCollection', features },
              { featureProjection: 'EPSG:3857', dataProjection: 'EPSG:4326' }
            );

            const layerType = features[0]?.properties?.layerType;
            const group = ['isochrone', 'facility', 'candidate_facility'].includes(layerType)
              ? 'studio-accessibility'
              : `studio-${layerType || 'analysis'}`;
            // Replacing a result must update its geometry, not retain features with old IDs.
            analysisSourceRef.current.getFeatures()
              .filter(feature => feature.get('studioGroup') === group)
              .forEach(feature => analysisSourceRef.current.removeFeature(feature));

            olFeatures.forEach((feat) => {
              feat.set('studioGroup', group);
              const props = feat.getProperties();
              if (props.layerType === 'isochrone') {
                feat.setStyle(new Style({
                  fill: new Fill({ color: props.color ? `${props.color}35` : 'rgba(59, 130, 246, 0.25)' }),
                  stroke: new Stroke({ color: props.color || '#3b82f6', width: 2.5 }),
                }));
              } else if (props.layerType === 'hotspot') {
                const geomType = feat.getGeometry()?.getType();
                if (geomType === 'Polygon') {
                  feat.setStyle(new Style({
                    fill: new Fill({ color: props.color ? `${props.color}55` : 'rgba(239, 68, 68, 0.45)' }),
                    stroke: new Stroke({ color: props.color || '#ef4444', width: 1.5 }),
                  }));
                } else {
                  feat.setStyle(new Style({
                    image: new CircleStyle({
                      radius: 3.5,
                      fill: new Fill({ color: props.color || '#ef4444' }),
                      stroke: new Stroke({ color: '#ffffff', width: 1 }),
                    }),
                  }));
                }
              } else if (props.layerType === 'facility' || props.layerType === 'candidate_facility') {
                feat.setStyle(new Style({
                  image: new CircleStyle({
                    radius: props.isPlanCandidate ? 8 : 6,
                    fill: new Fill({ color: props.isPlanCandidate ? '#8b5cf6' : '#10b981' }),
                    stroke: new Stroke({ color: '#ffffff', width: 2 }),
                  }),
                }));
              } else if (props.layerType === 'remote_sensing_scene') {
                feat.setStyle(new Style({
                  fill: new Fill({ color: props.color ? `${props.color}25` : 'rgba(2, 132, 199, 0.2)' }),
                  stroke: new Stroke({ color: props.color || '#0284c7', width: 2.5, lineDash: [8, 5] }),
                  text: new Text({
                    text: props.name || 'Scene Satelit STAC',
                    font: 'bold 11px monospace',
                    fill: new Fill({ color: '#ffffff' }),
                    stroke: new Stroke({ color: '#0f172a', width: 3 }),
                  }),
                }));
              }
              analysisSourceRef.current.addFeature(feat);
            });

            setShowAnalysisLayer(true);
            if (analysisLayerRef.current) {
              analysisLayerRef.current.setVisible(true);
            }
            if (olFeatures.length && mapRef.current) {
              const resultSource = new VectorSource({ features: olFeatures });
              const extent = resultSource.getExtent();
              if (extent && extent.every(Number.isFinite)) {
                mapRef.current.getView().fit(extent, {
                  padding: [70, 60, 90, 60], maxZoom: 12, duration: 400,
                });
              }
            }
            setShowGeospatialModal(false);
          } catch (e) {
            console.error('Failed to apply features to OpenLayers map:', e);
          }
        }}
      />

      {/* AI Route & Weather Copilot Modal (Find Button) */}
      <RouteNavigatorModal
        isOpen={showRouteModal}
        onClose={() => {
          setShowRouteModal(false);
          setIsPickingRouteLocation(false);
        }}
        userCoords={userCoords}
        onApplyRoute={(route) => setActiveRoute(route)}
        onClearRoute={() => {
          setActiveRoute(null);
          setPickedRouteDestination(null);
        }}
        activeRoute={activeRoute}
        schools={schools}
        isPickingOnMap={isPickingRouteLocation}
        onTogglePickOnMap={(active) => setIsPickingRouteLocation(active)}
        pickedCoords={pickedRouteDestination}
      />

      {/* Earth Sensor Detailed Inspector Modal */}
      <SensorInspectorModal
        sensor={selectedSensorForInspection}
        onClose={() => setSelectedSensorForInspection(null)}
        onCenterMap={(lng, lat) => {
          if (mapRef.current) {
            mapRef.current.getView().animate({
              center: fromLonLat([lng, lat]),
              zoom: 8.5,
              duration: 700,
            });
          }
        }}
      />

      {/* Earth Sensor Master Taxonomy Modal */}
      <MasterSensorTaxonomyModal
        isOpen={showMasterTaxonomyModal}
        onClose={() => setShowMasterTaxonomyModal(false)}
      />

      {/* Full Transparency Data Provenance Modal */}
      <DataSourceProvenanceModal
        isOpen={showDataProvenanceModal}
        onClose={() => setShowDataProvenanceModal(false)}
      />

      {/* Interactive WebGIS Tutorial Onboarding Modal (Ahli Validasi Masukan UI) */}
      <WebGISTutorialModal
        isOpen={showWebGisTutorial}
        onClose={() => {
          setShowWebGisTutorial(false);
          try {
            window.localStorage.setItem('hm_webgis_tutorial_seen', 'true');
          } catch (e) {}
        }}
        onOpenDisasterCenter={() => {
          setShowWebGisTutorial(false);
          setShowDisasterRiskCenter(true);
        }}
      />

      {/* Disaster Hazard & School Risk Profiler Modal (Sekolah Tangguh Bencana) */}
      <DisasterRiskCenterModal
        isOpen={showDisasterRiskCenter}
        onClose={() => setShowDisasterRiskCenter(false)}
        showTectonic={showTectonic}
        onToggleTectonic={setShowTectonic}
        showEarthquakes={showEarthquakes}
        onToggleEarthquakes={setShowEarthquakes}
        showVolcanoes={showActive}
        onToggleVolcanoes={setShowActive}
        showLandslideZones={showLandslideZones}
        onToggleLandslideZones={setShowLandslideZones}
        showTsunamiZones={showTsunamiZones}
        onToggleTsunamiZones={setShowTsunamiZones}
        selectedSchool={selectedSchoolData}
        onTriggerEvacuationRoute={async (school, scenario) => {
          try {
            const plan = await routingService.calculateEmergencyEvacuationRoute(
              { lat: school.lat, lng: school.lng, label: school.name },
              scenario
            );
            setActiveRoute(plan);
            setShowRouteModal(true);
            if (mapRef.current) {
              mapRef.current.getView().animate({
                center: fromLonLat([school.lng, school.lat]),
                zoom: 13,
                duration: 600,
              });
            }
          } catch (err) {
            console.error('Failed to trigger emergency evacuation route:', err);
          }
        }}
      />

      {/* Grounded Disaster AI Scenario Simulation Modal */}
      <GroundedScenarioModal
        isOpen={showGroundedScenarioModal}
        onClose={() => setShowGroundedScenarioModal(false)}
        schoolId={activeSchoolId}
        schoolName={activeSchoolName}
        lat={activeSchoolLat}
        lng={activeSchoolLng}
      />

      {/* Realtime Live Public CCTV Camera Modal */}
      <LiveCctvModal
        camera={selectedCctvCamera}
        onClose={() => setSelectedCctvCamera(null)}
        onSelectCamera={setSelectedCctvCamera}
      />

      {/* Realtime ATCS Smart Traffic Signal Modal */}
      <TrafficSignalModal
        signalId={selectedTrafficSignalId}
        onClose={() => setSelectedTrafficSignalId(null)}
      />

      {/* Realtime & Geological Volcano Detail Modal */}
      <VolcanoDetailModal
        volcano={selectedVolcanoForModal}
        onClose={() => setSelectedVolcanoForModal(null)}
        onFocusOnMap={(coords, zoom = 12) => {
          mapRef.current?.getView().animate({
            center: fromLonLat(coords),
            zoom,
            duration: 700,
          });
        }}
      />

      {/* Realtime Earthquake & Seismic Impact Detail Modal */}
      <EarthquakeDetailModal
        earthquake={selectedEarthquakeForModal}
        onClose={() => setSelectedEarthquakeForModal(null)}
        onFocusOnMap={(coords, zoom = 10) => {
          mapRef.current?.getView().animate({
            center: fromLonLat(coords),
            zoom,
            duration: 700,
          });
        }}
        onOpenEvacuation={() => setShowDisasterRiskCenter(true)}
      />

      {/* Realtime Satellite Thermal Anomaly & Fire Hotspot Detail Modal (God's Eye View) */}
      <ThermalAnomalyDetailModal
        hotspot={selectedHotspotForModal}
        onClose={() => setSelectedHotspotForModal(null)}
        onCenterOnMap={(lat, lng) => {
          mapRef.current?.getView().animate({
            center: fromLonLat([lng, lat]),
            zoom: 14,
            duration: 700,
          });
        }}
      />

      {/* Fullscreen Weather Mode */}
      {showWindyModal && (
        <div aria-label="Peta Cuaca Layar Penuh" className="absolute inset-0 z-[9999] bg-slate-900 animate-in fade-in duration-300 overflow-hidden overscroll-none">
          {/* Iframe takes up remaining space */}
          <div 
            className="w-full h-full relative"
            style={{ WebkitOverflowScrolling: 'touch', overflow: 'hidden' }}
          >

            <iframe 
              key={`windy-modal-${windyOverlay}`}
              width="100%" 
              height="100%" 
              src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=%C2%B0C&metricWind=km/h&zoom=${windyCoords.zoom}&overlay=${windyOverlay}&product=ecmwf&level=surface&lat=${windyCoords.lat}&lon=${windyCoords.lng}`} 
              frameBorder="0"
              title="Peta Cuaca Layar Penuh"
              className="w-full h-full block"
              style={{ pointerEvents: 'auto', touchAction: 'none', border: 'none' }}
              allow="fullscreen; geolocation"
            ></iframe>
          </div>

          <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
            {!showWindyMenu && (
              <button
                type="button"
                onClick={() => setShowWindyMenu(true)}
                aria-label="Buka Menu Cuaca di Layar Penuh"
                className="flex items-center gap-2 rounded-xl bg-white/95 dark:bg-slate-900/95 px-3 py-2.5 text-xs font-bold text-sky-700 dark:text-sky-300 shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Wind className="h-4 w-4" />
                Menu Cuaca
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowWindyModal(false)}
              aria-label="Keluar dari Layar Penuh"
              className="flex items-center gap-2 rounded-xl bg-white/95 dark:bg-slate-900/95 px-3 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
              Keluar Layar Penuh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MapsView;
