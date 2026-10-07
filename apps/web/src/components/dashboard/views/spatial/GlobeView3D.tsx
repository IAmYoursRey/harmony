import { 
  isValidUsgsFeed, 
  earthquakeRetrievalState, 
  earthquakeSnapshotService, 
  EarthquakeSnapshot, 
  EarthquakeRecord 
} from '@/services/geospatial/earthquakeSnapshotService';
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { 
  Globe, 
  Pause, 
  Play, 
  ZoomIn, 
  ZoomOut, 
  Compass, 
  Flame, 
  Activity, 
  Mountain, 
  X, 
  ExternalLink,
  Layers,
  Wind,
  CloudRain,
  Cloud, 
  Thermometer, 
  Navigation, 
  ShieldAlert, 
  MapPin, 
  RotateCcw, 
  RotateCw, 
  Radio,
  Car,
  Eye,
  Crosshair,
  Sparkles,
  Sun,
  Info,
  RefreshCw,
  Orbit,
  Maximize2,
  Volume2,
  VolumeX
} from 'lucide-react';
import { CosmicSolarSystemEngine } from './celestial/CosmicSolarSystemEngine';
import { CelestialInfoPanel } from './celestial/CelestialInfoPanel';
import { cosmicAudio } from './celestial/cosmicAudioSynth';
import { PLANETARY_CATALOG } from '@/data/planetaryCatalog';
import { 
  GLOBAL_EARTH_SENSOR_NETWORK, 
  EarthSensorNode, 
  SENSOR_FAMILY_META 
} from '@/services/earthSensorRegistry';
import { ActiveFireHotspot, hotspotFireService, HotspotSnapshot } from '@/services/hotspotFireService';
import { INITIAL_TRAFFIC_CORRIDORS, TrafficCorridor } from '@/services/trafficTelemetryService';
import { bmkgService } from '@/services/bmkgService';
import { hardwarePerformanceService } from '@/services/hardwarePerformanceService';

export interface GlobeMarker {
  id?: string | number;
  lat: number;
  lng: number;
  source?: 'USGS' | 'BMKG' | 'FIRMS' | 'SIMULATION' | 'OSM' | 'OPEN_METEO';
  type: 
    | 'earthquake' 
    | 'volcano_active' 
    | 'volcano_inactive' 
    | 'peak' 
    | 'school' 
    | 'route_pin' 
    | 'city' 
    | 'province' 
    | 'island' 
    | 'earth_sensor'
    | 'fire_hotspot'
    | 'traffic_corridor'
    | 'weather_station';
  name?: string;
  mag?: number;
  depth?: number;
  elevation?: string | number;
  time?: string | number;
  place?: string;
  alertLevel?: string;
  alertLevelCode?: number;
  dangerRadiusKm?: number;
  visualSummary?: string;
  seismicitySummary?: string;
  monitoringSource?: string;
  sensorData?: EarthSensorNode;
  fireData?: ActiveFireHotspot;
  trafficData?: TrafficCorridor;
  weatherData?: { tempC: number; humidity: number; windKmh: number; condition: string };
}

export type SensorOpticsMode = 'normal' | 'thermal' | 'nvg' | 'cyber';
export type BasemapMode = 'esri_satellite' | 'osm' | 'dark';

interface GlobeView3DProps {
  mountains?: any[];
  showActiveVolcanoes?: boolean;
  showInactiveVolcanoes?: boolean;
  showPeaks?: boolean;
  showTectonicPlates?: boolean;
  showEarthquakes?: boolean;
  showEarthSensors?: boolean;
  onSelectSensor?: (sensor: EarthSensorNode) => void;
  activeRouteCoords?: [number, number][]; // [lng, lat][]
  initialCenter?: { lat: number; lng: number };
  onSwitchTo2D?: (lat: number, lng: number, targetZoom?: number) => void;
  userCoords?: { lat: number; lng: number; accuracy?: number } | null;
}

// Convert lat/lng (degrees) to 3D point on unit sphere with NaN guard
function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return new THREE.Vector3(0, 0, 0);
  }
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// ---------------------------------------------------------------------------
// High-Resolution Billboard Textures & Sprites
// ---------------------------------------------------------------------------
let cachedVolcanoActiveTex: THREE.CanvasTexture | null = null;
let cachedVolcanoInactiveTex: THREE.CanvasTexture | null = null;
let cachedPeakTex: THREE.CanvasTexture | null = null;
let cachedQuakeRedCoreTex: THREE.CanvasTexture | null = null;
let cachedQuakeOrangeCoreTex: THREE.CanvasTexture | null = null;
let cachedQuakeRedPulseTex: THREE.CanvasTexture | null = null;
let cachedQuakeOrangePulseTex: THREE.CanvasTexture | null = null;
let cachedStartPinTex: THREE.CanvasTexture | null = null;
let cachedEndPinTex: THREE.CanvasTexture | null = null;
let cachedFireCoreTex: THREE.CanvasTexture | null = null;
let cachedFireBloomTex: THREE.CanvasTexture | null = null;
let cachedTrafficBeaconTex: THREE.CanvasTexture | null = null;
const cachedWeatherTexMap: Record<string, THREE.CanvasTexture> = {};

function getFireCoreTexture(): THREE.CanvasTexture {
  if (cachedFireCoreTex) return cachedFireCoreTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const radGrd = ctx.createRadialGradient(64, 64, 6, 64, 64, 56);
  radGrd.addColorStop(0.0, '#ffffff'); // White-hot core (FLIR thermal peak)
  radGrd.addColorStop(0.2, '#fef08a'); // Radiant yellow
  radGrd.addColorStop(0.5, '#f97316'); // Bright orange
  radGrd.addColorStop(0.85, '#dc2626'); // Outer crimson fire
  radGrd.addColorStop(1.0, 'rgba(220, 38, 38, 0)');

  ctx.fillStyle = radGrd;
  ctx.beginPath();
  ctx.arc(64, 64, 56, 0, Math.PI * 2);
  ctx.fill();

  // Diamond flare crosshair inside
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(64, 28);
  ctx.lineTo(67, 61);
  ctx.lineTo(100, 64);
  ctx.lineTo(67, 67);
  ctx.lineTo(64, 100);
  ctx.lineTo(61, 67);
  ctx.lineTo(28, 64);
  ctx.lineTo(61, 61);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedFireCoreTex = tex;
  return tex;
}

function getFireBloomTexture(): THREE.CanvasTexture {
  if (cachedFireBloomTex) return cachedFireBloomTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const radGrd = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
  radGrd.addColorStop(0.0, 'rgba(255, 235, 59, 0.7)');
  radGrd.addColorStop(0.35, 'rgba(255, 87, 34, 0.45)');
  radGrd.addColorStop(0.7, 'rgba(244, 67, 54, 0.2)');
  radGrd.addColorStop(1.0, 'rgba(244, 67, 54, 0)');

  ctx.fillStyle = radGrd;
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedFireBloomTex = tex;
  return tex;
}

function getTrafficBeaconTexture(): THREE.CanvasTexture {
  if (cachedTrafficBeaconTex) return cachedTrafficBeaconTex;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const rad = ctx.createRadialGradient(32, 32, 2, 32, 32, 28);
  rad.addColorStop(0.0, '#ffffff');
  rad.addColorStop(0.4, '#38bdf8');
  rad.addColorStop(0.8, '#0284c7');
  rad.addColorStop(1.0, 'rgba(2, 132, 199, 0)');

  ctx.fillStyle = rad;
  ctx.beginPath();
  ctx.arc(32, 32, 28, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedTrafficBeaconTex = tex;
  return tex;
}

function getWeatherStationTexture(tempC: number, condition: string): THREE.CanvasTexture {
  const key = `${tempC}_${condition}`;
  if (cachedWeatherTexMap[key]) return cachedWeatherTexMap[key];

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  // Badge capsule
  ctx.fillStyle = tempC >= 32 ? 'rgba(239, 68, 68, 0.85)' : tempC >= 28 ? 'rgba(245, 158, 11, 0.85)' : 'rgba(14, 165, 233, 0.85)';
  ctx.beginPath();
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(8, 12, 112, 40, 20);
  } else {
    ctx.rect(8, 12, 112, 40);
  }
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${tempC}°C`, 64, 32);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedWeatherTexMap[key] = tex;
  return tex;
}

function getVolcanoActiveTexture(): THREE.CanvasTexture {
  if (cachedVolcanoActiveTex) return cachedVolcanoActiveTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;

  ctx.beginPath();
  ctx.moveTo(64, 16);
  ctx.lineTo(116, 110);
  ctx.lineTo(12, 110);
  ctx.closePath();

  ctx.fillStyle = '#ef4444';
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 9;
  ctx.lineJoin = 'round';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(64, 52, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedVolcanoActiveTex = tex;
  return tex;
}

function getVolcanoInactiveTexture(): THREE.CanvasTexture {
  if (cachedVolcanoInactiveTex) return cachedVolcanoInactiveTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;

  ctx.beginPath();
  ctx.moveTo(64, 18);
  ctx.lineTo(114, 110);
  ctx.lineTo(14, 110);
  ctx.closePath();

  ctx.fillStyle = '#f97316';
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 9;
  ctx.lineJoin = 'round';
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedVolcanoInactiveTex = tex;
  return tex;
}

function getPeakTexture(): THREE.CanvasTexture {
  if (cachedPeakTex) return cachedPeakTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;

  ctx.beginPath();
  ctx.moveTo(64, 22);
  ctx.lineTo(112, 110);
  ctx.lineTo(16, 110);
  ctx.closePath();

  ctx.fillStyle = '#94a3b8';
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.lineJoin = 'round';
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedPeakTex = tex;
  return tex;
}

function getQuakeCoreTexture(isMajor: boolean): THREE.CanvasTexture {
  if (isMajor && cachedQuakeRedCoreTex) return cachedQuakeRedCoreTex;
  if (!isMajor && cachedQuakeOrangeCoreTex) return cachedQuakeOrangeCoreTex;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;

  ctx.beginPath();
  ctx.arc(64, 64, 40, 0, Math.PI * 2);
  ctx.fillStyle = isMajor ? '#ef4444' : '#f97316';
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (isMajor) cachedQuakeRedCoreTex = tex;
  else cachedQuakeOrangeCoreTex = tex;
  return tex;
}

function getQuakePulseTexture(isMajor: boolean): THREE.CanvasTexture {
  if (isMajor && cachedQuakeRedPulseTex) return cachedQuakeRedPulseTex;
  if (!isMajor && cachedQuakeOrangePulseTex) return cachedQuakeOrangePulseTex;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.beginPath();
  ctx.arc(64, 64, 52, 0, Math.PI * 2);
  ctx.fillStyle = isMajor ? 'rgba(239, 68, 68, 0.30)' : 'rgba(249, 115, 22, 0.30)';
  ctx.fill();

  ctx.strokeStyle = isMajor ? '#ef4444' : '#f97316';
  ctx.lineWidth = 6;
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (isMajor) cachedQuakeRedPulseTex = tex;
  else cachedQuakeOrangePulseTex = tex;
  return tex;
}

function getRoutePinTexture(type: 'start' | 'end'): THREE.CanvasTexture {
  if (type === 'start' && cachedStartPinTex) return cachedStartPinTex;
  if (type === 'end' && cachedEndPinTex) return cachedEndPinTex;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;

  ctx.beginPath();
  ctx.arc(64, 64, 40, 0, Math.PI * 2);
  ctx.fillStyle = type === 'start' ? '#10b981' : '#ef4444';
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(64, 64, 16, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (type === 'start') cachedStartPinTex = tex;
  else cachedEndPinTex = tex;
  return tex;
}

let cachedUserPinTex: THREE.CanvasTexture | null = null;
function getUserPinTexture(): THREE.CanvasTexture {
  if (cachedUserPinTex) return cachedUserPinTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.shadowColor = 'rgba(14, 165, 233, 0.8)';
  ctx.shadowBlur = 12;

  ctx.beginPath();
  ctx.arc(64, 64, 38, 0, Math.PI * 2);
  ctx.fillStyle = '#0284c7';
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(64, 64, 16, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedUserPinTex = tex;
  return tex;
}

const cachedSensorTexMap: Record<string, THREE.CanvasTexture> = {};
function getSensorTexture(color: string): THREE.CanvasTexture {
  if (cachedSensorTexMap[color]) return cachedSensorTexMap[color];
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;

  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;

  ctx.beginPath();
  ctx.arc(48, 48, 30, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(48, 48, 12, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedSensorTexMap[color] = tex;
  return tex;
}

// Explicit illustrative weather values; these are not provider observations.
const DEMO_WEATHER_EXAMPLES: Array<{
  name: string;
  lat: number;
  lng: number;
  tempC: number;
  humidity: number;
  windKmh: number;
  condition: string;
}> = [
  { name: 'DKI Jakarta', lat: -6.2088, lng: 106.8456, tempC: 32, humidity: 74, windKmh: 14, condition: 'Cerah Berawan' },
  { name: 'Surabaya', lat: -7.2575, lng: 112.7521, tempC: 34, humidity: 68, windKmh: 18, condition: 'Cerah Terik' },
  { name: 'Bandung', lat: -6.9175, lng: 107.6191, tempC: 25, humidity: 82, windKmh: 9, condition: 'Hujan Ringan' },
  { name: 'Medan', lat: 3.5952, lng: 98.6722, tempC: 31, humidity: 76, windKmh: 11, condition: 'Berawan' },
  { name: 'Balikpapan (IKN)', lat: -1.2379, lng: 116.8529, tempC: 30, humidity: 79, windKmh: 12, condition: 'Berawan Lembap' },
  { name: 'Makassar', lat: -5.1477, lng: 119.4327, tempC: 33, humidity: 71, windKmh: 16, condition: 'Cerah' },
  { name: 'Denpasar Bali', lat: -8.6705, lng: 115.2126, tempC: 31, humidity: 75, windKmh: 15, condition: 'Cerah Bahari' },
  { name: 'Jayapura', lat: -2.5916, lng: 140.6690, tempC: 30, humidity: 84, windKmh: 8, condition: 'Hujan Tropis' },
];

const INDO_ROT_X = (0.5 * Math.PI) / 180;
const INDO_ROT_Y = ((270 - 117.5) * Math.PI) / 180;

export function GlobeView3D({
  mountains = [],
  showActiveVolcanoes = true,
  showInactiveVolcanoes = true,
  showPeaks = true,
  showTectonicPlates = true,
  showEarthquakes = true,
  showEarthSensors = true,
  onSelectSensor,
  activeRouteCoords,
  initialCenter,
  onSwitchTo2D,
  userCoords,
}: GlobeView3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const globeRef = useRef<THREE.Mesh | null>(null);
  const atmosphereRef = useRef<THREE.Mesh | null>(null);
  const cloudsRef = useRef<THREE.Mesh | null>(null);
  const markersGroupRef = useRef<THREE.Group | null>(null);
  const firesGroupRef = useRef<THREE.Group | null>(null);
  const trafficGroupRef = useRef<THREE.Group | null>(null);
  const weatherGroupRef = useRef<THREE.Group | null>(null);
  const volcanoesGroupRef = useRef<THREE.Group | null>(null);
  const sensorsGroupRef = useRef<THREE.Group | null>(null);
  const tectonicGroupRef = useRef<THREE.Group | null>(null);
  const routeGroupRef = useRef<THREE.Group | null>(null);
  const userGroupRef = useRef<THREE.Group | null>(null);
  const onSelectSensorRef = useRef(onSelectSensor);
  useEffect(() => { onSelectSensorRef.current = onSelectSensor; }, [onSelectSensor]);
  const windParticlesRef = useRef<THREE.Points | null>(null);
  const windParticlesData = useRef<{ velocities: Float32Array; lats: Float32Array; lngs: Float32Array } | null>(null);
  const trafficBeaconsRef = useRef<Array<{ mesh: THREE.Sprite; points: THREE.Vector3[]; progress: number; speed: number }>>([]);
  const frameRef = useRef<number>(0);

  // Basemap & Tile texture refs
  const globeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const globeTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const lastTileZoomRef = useRef<number>(-1);
  const drawTilesRef = useRef<((z: number, currentBasemap?: BasemapMode) => void) | null>(null);

  // Interaction refs
  const isDragging = useRef(false);
  const isInteracting = useRef(false);
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const previousCenter = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const previousPinchDist = useRef<number | null>(null);
  const rotationVelocity = useRef({ x: 0, y: 0 });
  const totalDragDist = useRef<number>(0);
  const lastCenterUpdate = useRef<number>(0);

  // Raycaster & clickable marker objects
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseCoordsRef = useRef(new THREE.Vector2());
  const clickableObjectsRef = useRef<THREE.Object3D[]>([]);

  // Pulse material refs
  const quakeRedPulseMatRef = useRef<THREE.SpriteMaterial | null>(null);
  const quakeOrangePulseMatRef = useRef<THREE.SpriteMaterial | null>(null);
  const fireBloomPulseMatRef = useRef<THREE.SpriteMaterial | null>(null);

  // Boundaries
  const boundariesGroupRef = useRef<THREE.Group | null>(null);
  const boundariesMatRef = useRef<THREE.LineBasicMaterial | null>(null);
  const osmFrameCounterRef = useRef<number>(0);

  // ================= STATE ================= //
  const [autoRotate, setAutoRotate] = useState(false);
  const autoRotateRef = useRef(autoRotate);
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);
  const activeAnimRef = useRef<number | null>(null);

  const [zoom, setZoom] = useState(initialCenter ? 1.45 : 2.3);
  const [activeLayerPanel, setActiveLayerPanel] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<GlobeMarker | null>(null);

  // Cosmic Solar System & Celestial State
  const cosmicEngineRef = useRef<CosmicSolarSystemEngine | null>(null);
  const [activeCelestialId, setActiveCelestialId] = useState<string>('earth');
  const activeCelestialIdRef = useRef<string>('earth');
  useEffect(() => { activeCelestialIdRef.current = activeCelestialId; }, [activeCelestialId]);

  const [showCelestialPanel, setShowCelestialPanel] = useState<boolean>(false);
  const [hoveredCelestial, setHoveredCelestial] = useState<{ id: string; name: string; x: number; y: number } | null>(null);
  const [orbitSpeedMultiplier, setOrbitSpeedMultiplier] = useState<number>(1.0);
  const orbitSpeedRef = useRef<number>(1.0);
  useEffect(() => { orbitSpeedRef.current = orbitSpeedMultiplier; }, [orbitSpeedMultiplier]);

  const [isOrbitPaused, setIsOrbitPaused] = useState<boolean>(false);
  const isOrbitPausedRef = useRef<boolean>(false);
  useEffect(() => { isOrbitPausedRef.current = isOrbitPaused; }, [isOrbitPaused]);

  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  useEffect(() => {
    return () => {
      cosmicAudio.stop();
    };
  }, []);

  // Camera Tracking & Cosmic Perspective
  const cameraTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const orbitPitchRef = useRef<number>(0);
  const orbitYawRef = useRef<number>(0);
  const zoomRef = useRef<number>(initialCenter ? 1.45 : 2.3);

  const [quakeSnapshot, setQuakeSnapshot] = useState<EarthquakeSnapshot | null>(() => earthquakeSnapshotService.getLatestSnapshot('2.5_day'));
  const [hotspotSnapshot, setHotspotSnapshot] = useState<HotspotSnapshot | null>(() => hotspotFireService.getLatestSnapshot({ bbox: [-180, -90, 180, 90], source: 'ALL' }));
  const [quakeFeed, setQuakeFeed] = useState<'2.5_day' | '2.5_week' | 'all_day' | '4.5_month'>('2.5_day');
  const [quakeFreshness, setQuakeFreshness] = useState<'LIVE' | 'PARTIAL' | 'STALE' | 'EMPTY' | 'UNAVAILABLE' | 'UPDATING'>('UPDATING');
  const [fireFreshness, setFireFreshness] = useState<'LIVE' | 'PARTIAL' | 'STALE' | 'EMPTY' | 'UNAVAILABLE' | 'UPDATING'>('UPDATING');

  const quakes = useMemo<GlobeMarker[]>(() => {
    const list = quakeSnapshot?.renderedRecords || [];
    return list.map((q) => ({
      id: q.id,
      lat: q.lat,
      lng: q.lng,
      depth: q.depth,
      mag: q.mag,
      place: q.place,
      time: q.time,
      type: 'earthquake' as const,
      source: q.source,
      monitoringSource: q.monitoringSource,
      name: q.name,
      visualSummary: q.visualSummary,
    }));
  }, [quakeSnapshot]);

  const hotspots = useMemo<ActiveFireHotspot[]>(() => {
    return (hotspotSnapshot?.renderedRecords || hotspotSnapshot?.records || []) as ActiveFireHotspot[];
  }, [hotspotSnapshot]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('');
  const [isTextureLoaded, setIsTextureLoaded] = useState(false);
  const [switchingTo2D, setSwitchingTo2D] = useState(false);

  // God's Eye View Tactical Optics & Basemaps
  const [sensorMode, setSensorMode] = useState<SensorOpticsMode>('normal');
  const [basemapMode, setBasemapMode] = useState<BasemapMode>('esri_satellite');
  const [centerCoords, setCenterCoords] = useState<{ lat: number; lng: number }>({ lat: -2.5, lng: 118.0 });
  const [utcTime, setUtcTime] = useState<string>('');

  // Layer Visibility
  const [layerFires, setLayerFires] = useState(true);
  const [layerTraffic, setLayerTraffic] = useState(true);
  const [layerWeather, setLayerWeather] = useState(false);
  const [layerQuakes, setLayerQuakes] = useState(showEarthquakes);
  const [layerActiveVolcano, setLayerActiveVolcano] = useState(showActiveVolcanoes);
  const [layerInactiveVolcano, setLayerInactiveVolcano] = useState(showInactiveVolcanoes);
  const [layerPeaks, setLayerPeaks] = useState(showPeaks);
  const [layerTectonic, setLayerTectonic] = useState(showTectonicPlates);
  const [layerEarthSensors, setLayerEarthSensors] = useState(showEarthSensors);
  const [layerBoundaries, setLayerBoundaries] = useState(true);

  // UTC Master Clock
  useEffect(() => {
    const updateUtc = () => {
      const d = new Date();
      setUtcTime(d.toUTCString().slice(17, 25) + ' UTC');
    };
    updateUtc();
    const interval = setInterval(updateUtc, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update center coordinate readout on globe rotation
  const getCenterCoords = useCallback((): { lat: number; lng: number } => {
    const globe = globeRef.current;
    if (!globe) return { lat: 0, lng: 0 };
    const lat = (-globe.rotation.x * 180) / Math.PI;
    const theta = (270 * Math.PI) / 180 - globe.rotation.y;
    let lng = (theta * 180) / Math.PI - 180;
    while (lng < -180) lng += 360;
    while (lng > 180) lng -= 360;
    return { lat, lng };
  }, []);

  const switchTriggeredRef = useRef(false);
  const onSwitchTo2DRef = useRef(onSwitchTo2D);
  useEffect(() => { onSwitchTo2DRef.current = onSwitchTo2D; }, [onSwitchTo2D]);

  const triggerSwitch2D = useCallback(() => {
    if (switchTriggeredRef.current || !onSwitchTo2DRef.current) return;
    switchTriggeredRef.current = true;
    setSwitchingTo2D(true);
    const { lat, lng } = getCenterCoords();
    setTimeout(() => {
      onSwitchTo2DRef.current?.(lat, lng, 7.5);
    }, 420);
  }, [getCenterCoords]);

  const triggerSwitch2DRef = useRef(triggerSwitch2D);
  useEffect(() => { triggerSwitch2DRef.current = triggerSwitch2D; }, [triggerSwitch2D]);

  // Cosmic Fly-To & Targeting Callbacks
  const flyToCelestialBody = useCallback((bodyId: string) => {
    setActiveCelestialId(bodyId);
    activeCelestialIdRef.current = bodyId;
    setShowCelestialPanel(true);

    const bodyData = PLANETARY_CATALOG[bodyId];
    if (!bodyData) return;

    // Reset camera orbit angles gently
    orbitPitchRef.current = 0.12;
    orbitYawRef.current = 0.0;

    const framingRadius = bodyData.visual.ringOuter || bodyData.visual.bodyRadius;
    const targetDistance = bodyId === 'earth' 
      ? 2.3 
      : bodyId === 'sun' 
      ? 75.0 
      : bodyId === 'moon' 
      ? 1.2 
      : Math.max(2.0, framingRadius * 3.0);

    const startZoom = zoomRef.current;
    const startTime = performance.now();
    const duration = 850;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = progress < 0.5 
        ? 4 * progress * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      const curZoom = startZoom + (targetDistance - startZoom) * ease;
      zoomRef.current = curZoom;
      setZoom(curZoom);

      if (progress < 1) {
        activeAnimRef.current = requestAnimationFrame(step);
      } else {
        activeAnimRef.current = null;
      }
    };

    if (activeAnimRef.current) cancelAnimationFrame(activeAnimRef.current);
    activeAnimRef.current = requestAnimationFrame(step);
  }, []);

  const returnToEarth = useCallback(() => {
    flyToCelestialBody('earth');
  }, [flyToCelestialBody]);

  // Zoom Handler (Smoothly spans from Earth close-up to deep Cosmic Solar System)
  const handleZoom = useCallback((direction: 'in' | 'out') => {
    setZoom((prev) => {
      const deltaFactor = prev > 80 ? prev * 0.15 : prev > 15 ? 4.0 : prev > 5 ? 1.5 : 0.25;
      const delta = direction === 'in' ? -deltaFactor : deltaFactor;
      if (direction === 'in' && activeCelestialIdRef.current === 'earth' && prev <= 1.22) {
        triggerSwitch2D();
        return prev;
      }
      const activeBody = PLANETARY_CATALOG[activeCelestialIdRef.current];
      const minSafeDist = activeBody ? Math.max(1.18, (activeBody.visual.ringOuter || activeBody.visual.bodyRadius) * 1.25) : 1.18;
      const next = Math.max(minSafeDist, Math.min(2500.0, prev + delta));
      zoomRef.current = next;
      return next;
    });
  }, [triggerSwitch2D]);

  // Smooth Focus on Indonesia
  const focusIndonesia = useCallback(() => {
    const globe = globeRef.current;
    if (!globe) return;
    if (activeAnimRef.current) {
      cancelAnimationFrame(activeAnimRef.current);
      activeAnimRef.current = null;
    }
    rotationVelocity.current = { x: 0, y: 0 };
    setAutoRotate(false);
    autoRotateRef.current = false;

    const startX = globe.rotation.x;
    const startY = globe.rotation.y;
    const targetX = INDO_ROT_X;
    const currentRotY = globe.rotation.y;
    const twoPi = Math.PI * 2;
    let targetY = INDO_ROT_Y;
    while (targetY - currentRotY > Math.PI) targetY -= twoPi;
    while (targetY - currentRotY < -Math.PI) targetY += twoPi;

    const startZoom = cameraRef.current ? cameraRef.current.position.z : zoom;
    const targetZoom = 1.45;

    const startTime = performance.now();
    const duration = 750;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = progress < 0.5 
        ? 4 * progress * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      globe.rotation.x = startX + (targetX - startX) * ease;
      globe.rotation.y = startY + (targetY - startY) * ease;
      if (atmosphereRef.current) {
        atmosphereRef.current.rotation.copy(globe.rotation);
      }

      if (cameraRef.current) {
        const curZ = startZoom + (targetZoom - startZoom) * ease;
        cameraRef.current.position.z = curZ;
        cameraRef.current.updateProjectionMatrix();
        setZoom(curZ);
      }

      setCenterCoords(getCenterCoords());

      if (progress < 1) {
        activeAnimRef.current = requestAnimationFrame(step);
      } else {
        activeAnimRef.current = null;
      }
    };
    activeAnimRef.current = requestAnimationFrame(step);
  }, [getCenterCoords, zoom]);

  const rotateGlobeBy = useCallback((deltaDeg: number) => {
    const globe = globeRef.current;
    if (!globe) return;
    if (activeAnimRef.current) {
      cancelAnimationFrame(activeAnimRef.current);
      activeAnimRef.current = null;
    }
    rotationVelocity.current = { x: 0, y: 0 };
    setAutoRotate(false);
    autoRotateRef.current = false;

    const startY = globe.rotation.y;
    const targetY = startY + (deltaDeg * Math.PI) / 180;
    const startTime = performance.now();
    const duration = 350;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      globe.rotation.y = startY + (targetY - startY) * ease;
      if (atmosphereRef.current) {
        atmosphereRef.current.rotation.copy(globe.rotation);
      }
      setCenterCoords(getCenterCoords());
      if (progress < 1) {
        activeAnimRef.current = requestAnimationFrame(step);
      } else {
        activeAnimRef.current = null;
      }
    };
    activeAnimRef.current = requestAnimationFrame(step);
  }, [getCenterCoords]);

  // ================= 3D EARTHQUAKE & HOTSPOT SHARED SUBSCRIPTIONS ================= //
  useEffect(() => {
    setQuakeFreshness((prev) => (prev === 'LIVE' ? 'UPDATING' : prev));
    return earthquakeSnapshotService.subscribeEarthquakes({ feed: quakeFeed }, (snap) => {
      setQuakeSnapshot(snap);
      setQuakeFreshness(snap.status);
    });
  }, [quakeFeed]);

  useEffect(() => {
    setFireFreshness((prev) => (prev === 'LIVE' ? 'UPDATING' : prev));
    return hotspotFireService.subscribeHotspots({ bbox: [-180, -90, 180, 90], source: 'ALL' }, (snap) => {
      setHotspotSnapshot(snap);
      setFireFreshness(snap.status);
    });
  }, []);

  // Unified manual refresh action
  const refreshAllFeeds = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.allSettled([
      earthquakeSnapshotService.fetchEarthquakeSnapshot({ feed: quakeFeed, force: true }),
      hotspotFireService.fetchHotspotSnapshot({ bbox: [-180, -90, 180, 90], source: 'ALL', force: true }),
    ]);
    const d = new Date();
    setLastRefreshedAt(d.toUTCString().slice(17, 25) + ' UTC');
    setIsRefreshing(false);
  }, [quakeFeed]);

  // ================= SCENE INITIALIZATION (RUNS ONCE) ================= //
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.z = zoom;
    cameraRef.current = camera;

    const perfProfile = hardwarePerformanceService.getProfile();

    const renderer = new THREE.WebGLRenderer({ 
      antialias: perfProfile.effectiveMode === 'high', 
      alpha: true, 
      powerPreference: 'high-performance' 
    });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(perfProfile.threePixelRatio);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const unsubPerf = hardwarePerformanceService.subscribe((profile) => {
      if (rendererRef.current) {
        rendererRef.current.setPixelRatio(profile.threePixelRatio);
      }
    });

    // Lighting (Realistic Sun & Atmosphere Rim)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);
    const sunLight = new THREE.DirectionalLight(0xfff8ee, 2.4);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.9);
    rimLight.position.set(-5, -2, -4);
    scene.add(rimLight);

    const radius = 1;
    const geometry = new THREE.SphereGeometry(
      radius,
      perfProfile.effectiveMode === 'high' ? 64 : 48,
      perfProfile.effectiveMode === 'high' ? 64 : 48
    );

    // Dynamic Tile Canvas Texture
    const CANVAS_W = perfProfile.threeCanvasResolution.width;
    const CANVAS_H = perfProfile.threeCanvasResolution.height;
    const globeCanvas = document.createElement('canvas');
    globeCanvas.width = CANVAS_W;
    globeCanvas.height = CANVAS_H;
    globeCanvasRef.current = globeCanvas;

    const globeCtx = globeCanvas.getContext('2d')!;

    const paintBasemapBase = (currentBasemap: BasemapMode) => {
      // 1. Ocean gradient according to basemap mode
      const g = globeCtx.createLinearGradient(0, 0, 0, CANVAS_H);
      if (currentBasemap === 'dark') {
        g.addColorStop(0.0, '#020617');
        g.addColorStop(0.5, '#090d1a');
        g.addColorStop(1.0, '#020617');
      } else if (currentBasemap === 'osm') {
        g.addColorStop(0.0, '#7dd3fc');
        g.addColorStop(0.5, '#bae6fd');
        g.addColorStop(1.0, '#7dd3fc');
      } else {
        // esri_satellite / default realistic oceanic blue
        g.addColorStop(0.0, '#040d1e');
        g.addColorStop(0.2, '#071838');
        g.addColorStop(0.5, '#0b2452');
        g.addColorStop(0.8, '#071838');
        g.addColorStop(1.0, '#040d1e');
      }
      globeCtx.fillStyle = g;
      globeCtx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // 2. Polar Caps: Arctic (North) & Antarctica (South) to eliminate polar void
      const northCapH = Math.round((CANVAS_H / 2048) * 80);
      const northIce = globeCtx.createLinearGradient(0, 0, 0, northCapH);
      northIce.addColorStop(0.0, '#ffffff');
      northIce.addColorStop(0.6, '#f1f5f9');
      northIce.addColorStop(1.0, currentBasemap === 'dark' ? 'rgba(255,255,255,0)' : 'rgba(241,245,249,0)');
      globeCtx.fillStyle = northIce;
      globeCtx.fillRect(0, 0, CANVAS_W, northCapH);

      // Antarctica South Polar Continent
      const southCapH = Math.round((CANVAS_H / 2048) * 240);
      const southIceTop = CANVAS_H - southCapH;
      const southIce = globeCtx.createLinearGradient(0, southIceTop, 0, CANVAS_H);
      if (currentBasemap === 'dark') {
        southIce.addColorStop(0.0, 'rgba(148,163,184,0)');
        southIce.addColorStop(0.25, '#1e293b');
        southIce.addColorStop(1.0, '#0f172a');
      } else {
        southIce.addColorStop(0.0, 'rgba(255,255,255,0)');
        southIce.addColorStop(0.2, '#e0f2fe');
        southIce.addColorStop(0.5, '#f8fafc');
        southIce.addColorStop(1.0, '#ffffff');
      }
      globeCtx.fillStyle = southIce;
      globeCtx.fillRect(0, southIceTop, CANVAS_W, southCapH);
    };

    paintBasemapBase(basemapMode);

    const globeTexture = new THREE.CanvasTexture(globeCanvas);
    globeTexture.colorSpace = THREE.SRGBColorSpace;
    globeTexture.minFilter = THREE.LinearFilter;
    globeTexture.magFilter = THREE.LinearFilter;
    globeTexture.anisotropy = 8;
    globeTextureRef.current = globeTexture;

    const tileYToLat = (y: number, z: number) => {
      const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
      return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
    };

    let activeBatchId = 0;

    const drawTiles = (osmZoom: number, currentBasemap = basemapMode) => {
      activeBatchId++;
      const thisBatchId = activeBatchId;
      lastTileZoomRef.current = osmZoom;

      paintBasemapBase(currentBasemap);
      globeTexture.needsUpdate = true;

      const n = Math.pow(2, osmZoom);
      const jobs: Array<{ tx: number; ty: number; pxLeft: number; pyTop: number; drawW: number; drawH: number }> = [];

      for (let tx = 0; tx < n; tx++) {
        for (let ty = 0; ty < n; ty++) {
          const latNorth = tileYToLat(ty, osmZoom);
          const latSouth = tileYToLat(ty + 1, osmZoom);
          if (latNorth > 85.06 || latSouth < -85.06) continue;

          const pxLeft  = (tx / n) * CANVAS_W;
          const pxRight = ((tx + 1) / n) * CANVAS_W;
          const pyTop    = Math.max(0, ((90 - latNorth) / 180) * CANVAS_H);
          const pyBottom = Math.min(CANVAS_H, ((90 - latSouth) / 180) * CANVAS_H);

          const drawW = pxRight - pxLeft;
          const drawH = pyBottom - pyTop;
          if (drawW <= 0 || drawH <= 0) continue;

          jobs.push({ tx, ty, pxLeft, pyTop, drawW, drawH });
        }
      }

      const BATCH = 8;
      let jobIdx = 0;

      const runBatch = () => {
        if (thisBatchId !== activeBatchId) return;
        const batch = jobs.slice(jobIdx, jobIdx + BATCH);
        jobIdx += BATCH;
        if (batch.length === 0) {
          globeTexture.needsUpdate = true;
          return;
        }

        let done = 0;
        let batchHasDrawn = false;

        const checkBatchDone = () => {
          done++;
          if (done === batch.length) {
            if (thisBatchId === activeBatchId) {
              if (batchHasDrawn) {
                globeTexture.needsUpdate = true;
              }
              runBatch();
            }
          }
        };

        batch.forEach(({ tx, ty, pxLeft, pyTop, drawW, drawH }) => {
          let tileUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${osmZoom}/${ty}/${tx}.jpg`;
          if (currentBasemap === 'osm') {
            tileUrl = `https://tile.openstreetmap.org/${osmZoom}/${tx}/${ty}.png`;
          } else if (currentBasemap === 'dark') {
            tileUrl = `https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/${osmZoom}/${ty}/${tx}.png`;
          }

          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            if (thisBatchId !== activeBatchId) return;
            try {
              globeCtx.drawImage(img, pxLeft, pyTop, drawW, drawH);
              batchHasDrawn = true;
            } catch (_) {}
            checkBatchDone();
          };
          img.onerror = () => {
            checkBatchDone();
          };
          img.src = tileUrl;
        });
      };

      runBatch();
    };

    drawTilesRef.current = drawTiles;

    const globeMaterial = new THREE.MeshPhongMaterial({
      map: globeTexture,
      specular: new THREE.Color(0x224477),
      shininess: 8,
    });

    const globe = new THREE.Mesh(geometry, globeMaterial);
    const initRotX = initialCenter ? (-initialCenter.lat * Math.PI) / 180 : INDO_ROT_X;
    const initRotY = initialCenter ? ((270 - initialCenter.lng) * Math.PI) / 180 : INDO_ROT_Y;
    globe.rotation.y = initRotY;
    globe.rotation.x = initRotX;

    // Initialize Cosmic Solar System Engine (Milky Way galaxy, Sun, and planetary orbits)
    const cosmicEngine = new CosmicSolarSystemEngine();
    cosmicEngineRef.current = cosmicEngine;
    scene.add(cosmicEngine.rootGroup);

    cosmicEngine.attachEarthGlobe(globe);
    globeRef.current = globe;

    // Anchor camera target and position to Earth world coordinates immediately from frame 0
    cosmicEngine.update(0);
    const initialEarthWorldPos = cosmicEngine.getCelestialWorldPosition('earth');
    cameraTargetRef.current.copy(initialEarthWorldPos);
    camera.position.set(
      initialEarthWorldPos.x,
      initialEarthWorldPos.y,
      initialEarthWorldPos.z + zoom
    );
    camera.lookAt(cameraTargetRef.current);

    // Groups
    const markersGroup = new THREE.Group();
    globe.add(markersGroup);
    markersGroupRef.current = markersGroup;

    const firesGroup = new THREE.Group();
    globe.add(firesGroup);
    firesGroupRef.current = firesGroup;

    const trafficGroup = new THREE.Group();
    globe.add(trafficGroup);
    trafficGroupRef.current = trafficGroup;

    const weatherGroup = new THREE.Group();
    globe.add(weatherGroup);
    weatherGroupRef.current = weatherGroup;

    const volcanoesGroup = new THREE.Group();
    globe.add(volcanoesGroup);
    volcanoesGroupRef.current = volcanoesGroup;

    const sensorsGroup = new THREE.Group();
    globe.add(sensorsGroup);
    sensorsGroupRef.current = sensorsGroup;

    const tectonicGroup = new THREE.Group();
    globe.add(tectonicGroup);
    tectonicGroupRef.current = tectonicGroup;

    const routeGroup = new THREE.Group();
    globe.add(routeGroup);
    routeGroupRef.current = routeGroup;

    const userGroup = new THREE.Group();
    globe.add(userGroup);
    userGroupRef.current = userGroup;

    const boundariesGroup = new THREE.Group();
    globe.add(boundariesGroup);
    boundariesGroupRef.current = boundariesGroup;

    // Atmospheric Glow Outer Shell
    const atmGeo = new THREE.SphereGeometry(radius * 1.018, 36, 36);
    const atmMat = new THREE.MeshPhongMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.16,
      side: THREE.FrontSide,
      depthWrite: false,
    });
    const atmosphere = new THREE.Mesh(atmGeo, atmMat);
    cosmicEngine.earthSystemGroup.add(atmosphere);
    atmosphereRef.current = atmosphere;

    // Clouds Layer
    const cloudsGeo = new THREE.SphereGeometry(radius * 1.008, 36, 36);
    const cloudsMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const clouds = new THREE.Mesh(cloudsGeo, cloudsMat);
    globe.add(clouds);
    cloudsRef.current = clouds;

    // 3D Wind Vector Particles
    const windCount = perfProfile.windParticleCount;
    const windPositions = new Float32Array(windCount * 3);
    const windVelocities = new Float32Array(windCount);
    const windLats = new Float32Array(windCount);
    const windLngs = new Float32Array(windCount);

    for (let i = 0; i < windCount; i++) {
      const lat = (Math.random() - 0.5) * 80;
      const lng = (Math.random() - 0.5) * 360;
      windLats[i] = lat;
      windLngs[i] = lng;
      windVelocities[i] = 0.25 + Math.random() * 0.45;
      const pos = latLngToVec3(lat, lng, 1.012);
      windPositions[i * 3] = pos.x;
      windPositions[i * 3 + 1] = pos.y;
      windPositions[i * 3 + 2] = pos.z;
    }

    const windGeo = new THREE.BufferGeometry();
    windGeo.setAttribute('position', new THREE.BufferAttribute(windPositions, 3));
    const windMat = new THREE.PointsMaterial({
      color: 0x2dd4bf,
      size: 0.016,
      transparent: true,
      opacity: 0.85,
    });
    const windPoints = new THREE.Points(windGeo, windMat);
    globe.add(windPoints);
    windParticlesRef.current = windPoints;
    windParticlesData.current = { velocities: windVelocities, lats: windLats, lngs: windLngs };

    // Starfield Backdrop
    const starGeo = new THREE.BufferGeometry();
    const starCount = 800;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const dist = 280 + Math.random() * 200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i] = dist * Math.sin(phi) * Math.cos(theta);
      starPositions[i + 1] = dist * Math.sin(phi) * Math.sin(theta);
      starPositions[i + 2] = dist * Math.cos(phi);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, transparent: true, opacity: 0.7 });
    scene.add(new THREE.Points(starGeo, starMat));

    // Load initial tiles
    drawTiles(2, basemapMode);
    setIsTextureLoaded(true);

    // Resize Observer
    const ro = new ResizeObserver(() => {
      if (!mount || !renderer || !camera) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(mount);

    // ================= ANIMATION LOOP ================= //
    const animate = () => {
      if (renderer.getContext()?.isContextLost()) {
        return;
      }
      frameRef.current = requestAnimationFrame(animate);

      // 1. Update Cosmic Solar System (Milky Way galaxy, planets, Sun, and orbits)
      if (cosmicEngineRef.current) {
        cosmicEngineRef.current.isPaused = isOrbitPausedRef.current;
        cosmicEngineRef.current.speedMultiplier = orbitSpeedRef.current;
        cosmicEngineRef.current.update(0.016);
      }

      // 2. Smooth Camera Tracking of Active Celestial Body
      const targetPos = cosmicEngineRef.current
        ? cosmicEngineRef.current.getCelestialWorldPosition(activeCelestialIdRef.current)
        : new THREE.Vector3(0, 0, 0);

      cameraTargetRef.current.lerp(targetPos, 0.08);

      const pitch = orbitPitchRef.current;
      const yaw = orbitYawRef.current;
      const currentDist = zoomRef.current;

      const offsetX = currentDist * Math.sin(yaw) * Math.cos(pitch);
      const offsetY = currentDist * Math.sin(pitch);
      const offsetZ = currentDist * Math.cos(yaw) * Math.cos(pitch);

      const desiredCamPos = cameraTargetRef.current.clone().add(new THREE.Vector3(offsetX, offsetY, offsetZ));
      camera.position.lerp(desiredCamPos, 0.12);
      camera.lookAt(cameraTargetRef.current);

      // Globe Axial Rotation
      if (autoRotateRef.current && !isInteracting.current && activeCelestialIdRef.current === 'earth') {
        globe.rotation.y += 0.0018;
        const nowMs = Date.now();
        if (nowMs - lastCenterUpdate.current > 250) {
          lastCenterUpdate.current = nowMs;
          setCenterCoords(getCenterCoords());
        }
      } else if (!isInteracting.current && activeCelestialIdRef.current === 'earth') {
        rotationVelocity.current.x *= 0.90;
        rotationVelocity.current.y *= 0.90;
        globe.rotation.x += rotationVelocity.current.x;
        globe.rotation.y += rotationVelocity.current.y;
      }

      globe.rotation.x = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, globe.rotation.x));
      atmosphere.rotation.copy(globe.rotation);

      if (cloudsRef.current) {
        cloudsRef.current.rotation.y += 0.0006;
      }

      // Wind Flow Vectors
      if (windParticlesRef.current && windParticlesData.current) {
        const { velocities, lats, lngs } = windParticlesData.current;
        const posAttr = windParticlesRef.current.geometry.attributes.position as THREE.BufferAttribute;
        const array = posAttr.array as Float32Array;
        for (let i = 0; i < windCount; i++) {
          lngs[i] += velocities[i];
          if (lngs[i] > 180) lngs[i] = -180;
          const p = latLngToVec3(lats[i], lngs[i], 1.012);
          array[i * 3] = p.x;
          array[i * 3 + 1] = p.y;
          array[i * 3 + 2] = p.z;
        }
        posAttr.needsUpdate = true;
      }

      // Traffic Particle Flow Beacons
      trafficBeaconsRef.current.forEach((beacon) => {
        beacon.progress += beacon.speed;
        if (beacon.progress >= 1.0) beacon.progress = 0;
        const idx = Math.floor(beacon.progress * (beacon.points.length - 1));
        const pt = beacon.points[idx];
        if (pt) beacon.mesh.position.copy(pt);
      });

      // Pulse Animations
      const now = Date.now();
      const pulseCycle = (now % 2000) / 2000;
      const pulseOpacity = (1 - pulseCycle) * 0.85;

      if (quakeRedPulseMatRef.current) quakeRedPulseMatRef.current.opacity = pulseOpacity;
      if (quakeOrangePulseMatRef.current) quakeOrangePulseMatRef.current.opacity = pulseOpacity;
      if (fireBloomPulseMatRef.current) fireBloomPulseMatRef.current.opacity = 0.4 + Math.sin(now * 0.006) * 0.35;

      // Dynamic Marker Scaling & Horizon Culling
      if (camera) {
        const camPos = camera.position;
        const tempWorldPos = new THREE.Vector3();

        const cullAndScale = (group: THREE.Group | null) => {
          if (!group) return;
          group.children.forEach((child) => {
            const sprite = child as THREE.Sprite;
            if (!(sprite as any).isSprite) return;
            sprite.getWorldPosition(tempWorldPos);

            if (tempWorldPos.dot(camPos) < 0.12) {
              sprite.visible = false;
              return;
            }
            sprite.visible = true;

            const dist = camPos.distanceTo(tempWorldPos);
            if (!Number.isFinite(dist) || dist < 0.05) return;

            const baseScale = Number.isFinite(sprite.userData?.baseScale) ? sprite.userData.baseScale : 1.0;
            const isPulseRing = sprite.userData?.isPulseRing;
            const isFireBloom = sprite.userData?.isFireBloom;

            const baseZoomScale = Math.max(0.005, Math.min(0.2, Math.pow(dist, 0.82) * 0.038 * baseScale));
            if (isPulseRing) {
              const ringScale = baseZoomScale * (1.0 + pulseCycle * 1.8);
              sprite.scale.set(ringScale, ringScale, 1);
            } else if (isFireBloom) {
              const bScale = baseZoomScale * (1.2 + Math.sin(now * 0.008) * 0.3);
              sprite.scale.set(bScale, bScale, 1);
            } else {
              sprite.scale.set(baseZoomScale, baseZoomScale, 1);
            }
          });
        };

        cullAndScale(markersGroupRef.current);
        cullAndScale(firesGroupRef.current);
        cullAndScale(weatherGroupRef.current);
        cullAndScale(volcanoesGroupRef.current);
        cullAndScale(sensorsGroupRef.current);
        cullAndScale(userGroupRef.current);
        cullAndScale(routeGroupRef.current);
      }

      renderer.render(scene, camera);
    };
    animate();

    // Gestures
    const dom = renderer.domElement;
    dom.style.touchAction = 'none';

    // WebGL Context resilience handlers
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };

    const handleContextRestored = () => {
      if (drawTilesRef.current) {
        drawTilesRef.current(2, basemapMode);
      }
      frameRef.current = requestAnimationFrame(animate);
    };

    dom.addEventListener('webglcontextlost', handleContextLost, false);
    dom.addEventListener('webglcontextrestored', handleContextRestored, false);

    const getPointersCenter = () => {
      let sumX = 0, sumY = 0;
      activePointers.current.forEach((p) => { sumX += p.x; sumY += p.y; });
      const count = Math.max(1, activePointers.current.size);
      return { x: sumX / count, y: sumY / count };
    };

    const getPinchDistance = () => {
      const pts = Array.from(activePointers.current.values());
      if (pts.length < 2) return null;
      return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    };

    const onPointerDown = (e: PointerEvent) => {
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      isDragging.current = true;
      isInteracting.current = true;
      totalDragDist.current = 0;
      rotationVelocity.current = { x: 0, y: 0 };
      previousCenter.current = getPointersCenter();
      previousPinchDist.current = getPinchDistance();
      try { dom.setPointerCapture(e.pointerId); } catch (_) {}
    };

    const onPointerMove = (e: PointerEvent) => {
      // Celestial hover inspection when not dragging
      if (activePointers.current.size === 0 && mount && cameraRef.current && cosmicEngineRef.current) {
        const rect = mount.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        const ray = new THREE.Raycaster();
        ray.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);
        const hits = ray.intersectObjects(cosmicEngineRef.current.clickableMeshes, true);
        if (hits.length > 0) {
          let topObj: THREE.Object3D | null = hits[0].object;
          while (topObj && !topObj.userData?.celestialId && topObj.parent) {
            topObj = topObj.parent;
          }
          if (topObj?.userData?.celestialId) {
            const bodyId = topObj.userData.celestialId as string;
            const bodyData = PLANETARY_CATALOG[bodyId];
            if (bodyData) {
              dom.style.cursor = 'pointer';
              setHoveredCelestial({
                id: bodyId,
                name: bodyData.name,
                x: e.clientX,
                y: e.clientY
              });
              return;
            }
          }
        }
        dom.style.cursor = isDragging.current ? 'grabbing' : 'grab';
        setHoveredCelestial(null);
      }

      if (!activePointers.current.has(e.pointerId)) return;
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      const center = getPointersCenter();
      const dx = center.x - previousCenter.current.x;
      const dy = center.y - previousCenter.current.y;
      totalDragDist.current += Math.hypot(dx, dy);

      if (activePointers.current.size >= 2) {
        const currentPinch = getPinchDistance();
        if (currentPinch !== null && previousPinchDist.current !== null) {
          const deltaPinch = currentPinch - previousPinchDist.current;
          const current = zoomRef.current;
          const factor = current > 50 ? 0.2 : current > 15 ? 0.04 : 0.005;
          const next = current - deltaPinch * factor;
          if (activeCelestialIdRef.current === 'earth' && next < 1.18 && deltaPinch > 0) {
            triggerSwitch2DRef.current();
            return;
          }
          const activeBody = PLANETARY_CATALOG[activeCelestialIdRef.current];
          const minSafeDist = activeBody ? Math.max(1.18, (activeBody.visual.ringOuter || activeBody.visual.bodyRadius) * 1.25) : 1.18;
          const clamped = Math.max(minSafeDist, Math.min(2500.0, next));
          zoomRef.current = clamped;
          setZoom(clamped);
        }
        previousPinchDist.current = currentPinch;
      } else {
        const speed = 0.005;
        if (activeCelestialIdRef.current === 'earth' && zoomRef.current < 5.0) {
          globe.rotation.y += dx * speed;
          globe.rotation.x += dy * speed;
          rotationVelocity.current.x = dy * speed;
          rotationVelocity.current.y = dx * speed;
          const nowMs = Date.now();
          if (nowMs - lastCenterUpdate.current > 120) {
            lastCenterUpdate.current = nowMs;
            setCenterCoords(getCenterCoords());
          }
        } else {
          orbitYawRef.current -= dx * speed;
          orbitPitchRef.current = Math.max(
            -Math.PI * 0.46,
            Math.min(Math.PI * 0.46, orbitPitchRef.current + dy * speed)
          );
        }
      }
      previousCenter.current = center;
    };

    const handleMarkerClick = (clientX: number, clientY: number) => {
      if (!mount || !cameraRef.current) return;
      const rect = mount.getBoundingClientRect();
      mouseCoordsRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouseCoordsRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseCoordsRef.current, cameraRef.current);

      // 1. If focused on Earth and close, prioritize Earth GIS markers
      if (activeCelestialIdRef.current === 'earth' && zoomRef.current < 6.0) {
        const activeGroups = [
          markersGroupRef.current,
          firesGroupRef.current,
          trafficGroupRef.current,
          weatherGroupRef.current,
          volcanoesGroupRef.current,
          sensorsGroupRef.current,
          userGroupRef.current,
          routeGroupRef.current,
        ].filter(Boolean) as THREE.Group[];

        const candidates: THREE.Object3D[] = [];
        activeGroups.forEach((grp) => {
          grp.traverse((child) => {
            if (child.visible && child.userData?.marker) {
              candidates.push(child);
            }
          });
        });

        if (candidates.length > 0) {
          const intersects = raycasterRef.current.intersectObjects(candidates, false);
          if (intersects.length > 0) {
            const topHit = intersects[0].object;
            if (topHit.userData?.marker) {
              const marker = topHit.userData.marker as GlobeMarker;
              setSelectedMarker(marker);
              if (marker.type === 'earth_sensor' && marker.sensorData && onSelectSensorRef.current) {
                onSelectSensorRef.current(marker.sensorData);
              }
              return;
            }
          }
        }
      }

      // 2. Check for Celestial Body Intersections (Planets, Moon, Sun)
      if (cosmicEngineRef.current) {
        const hits = raycasterRef.current.intersectObjects(cosmicEngineRef.current.clickableMeshes, true);
        if (hits.length > 0) {
          let topObj: THREE.Object3D | null = hits[0].object;
          while (topObj && !topObj.userData?.celestialId && topObj.parent) {
            topObj = topObj.parent;
          }
          if (topObj?.userData?.celestialId) {
            const clickedId = topObj.userData.celestialId as string;
            flyToCelestialBody(clickedId);
          }
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      activePointers.current.delete(e.pointerId);
      try { dom.releasePointerCapture(e.pointerId); } catch (_) {}
      if (activePointers.current.size === 0) {
        isDragging.current = false;
        isInteracting.current = false;
        previousPinchDist.current = null;
        setCenterCoords(getCenterCoords());
        if (totalDragDist.current < 8) {
          handleMarkerClick(e.clientX, e.clientY);
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const current = zoomRef.current;
      const deltaFactor = current > 80 ? current * 0.15 : current > 15 ? 3.2 : current > 5 ? 1.2 : 0.18;
      const delta = e.deltaY > 0 ? deltaFactor : -deltaFactor;
      const next = current + delta;
      if (activeCelestialIdRef.current === 'earth' && next < 1.18 && delta < 0) {
        triggerSwitch2DRef.current();
        return;
      }
      const activeBody = PLANETARY_CATALOG[activeCelestialIdRef.current];
      const minSafeDist = activeBody ? Math.max(1.18, (activeBody.visual.ringOuter || activeBody.visual.bodyRadius) * 1.25) : 1.18;
      const clamped = Math.max(minSafeDist, Math.min(2500.0, next));
      zoomRef.current = clamped;
      setZoom(clamped);
    };

    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('pointercancel', onPointerUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      unsubPerf();
      if (activeAnimRef.current) cancelAnimationFrame(activeAnimRef.current);
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
      dom.removeEventListener('webglcontextlost', handleContextLost);
      dom.removeEventListener('webglcontextrestored', handleContextRestored);
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('pointercancel', onPointerUp);
      dom.removeEventListener('wheel', onWheel);
      cosmicEngine.dispose();
      globeTexture.dispose();
      renderer.dispose();
      geometry.dispose();
      globeMaterial.dispose();
      atmGeo.dispose();
      atmMat.dispose();
      cloudsGeo.dispose();
      cloudsMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      windGeo.dispose();
      windMat.dispose();
      if (mount.contains(dom)) {
        mount.removeChild(dom);
      }
    };
  }, []);

  // Update Basemap Tiles
  useEffect(() => {
    if (drawTilesRef.current) {
      drawTilesRef.current(2, basemapMode);
    }
  }, [basemapMode]);

  // ================= 3D WILDFIRES & THERMAL HOTSPOTS ================= //
  useEffect(() => {
    const firesGroup = firesGroupRef.current;
    if (!firesGroup) return;

    while (firesGroup.children.length > 0) {
      firesGroup.remove(firesGroup.children[0]);
    }

    if (!layerFires || hotspots.length === 0) return;

    const fireCoreMat = new THREE.SpriteMaterial({
      map: getFireCoreTexture(),
      depthTest: true,
      depthWrite: false,
      transparent: true,
    });

    const fireBloomMat = new THREE.SpriteMaterial({
      map: getFireBloomTexture(),
      depthTest: true,
      depthWrite: false,
      transparent: true,
      opacity: 0.65,
    });
    fireBloomPulseMatRef.current = fireBloomMat;

    hotspots.forEach((h: ActiveFireHotspot) => {
      const pos = latLngToVec3(h.lat, h.lng, 1.012);
      const frp = typeof h.frpMw === 'number' && Number.isFinite(h.frpMw) ? h.frpMw : 25;
      const scaleMult = Math.max(0.8, Math.min(1.6, frp / 30));

      const coreSprite = new THREE.Sprite(fireCoreMat);
      coreSprite.position.copy(pos);
      coreSprite.renderOrder = 14;
      coreSprite.userData = {
        baseScale: scaleMult,
        marker: {
          id: h.id,
          lat: h.lat,
          lng: h.lng,
          type: 'fire_hotspot',
          name: `🔥 Karhutla: ${h.locationName}`,
          visualSummary: `Titik panas satelit ${h.instrument} (${h.satellite}) dengan suhu kecerahan ${h.brightnessKelvin ?? '—'} K (${h.brightnessCelsius ?? '—'}°C) dan daya radiasi api (FRP) ${h.frpMw ?? '—'} MW. Kategori vegetasi: ${h.vegetationType || 'Belum tersedia'}.`,
          monitoringSource: `NASA FIRMS (deteksi termal, bukan konfirmasi kebakaran)`,
          fireData: h,
        } as GlobeMarker,
      };
      firesGroup.add(coreSprite);

      const bloomSprite = new THREE.Sprite(fireBloomMat);
      bloomSprite.position.copy(pos);
      bloomSprite.renderOrder = 13;
      bloomSprite.userData = {
        baseScale: scaleMult * 1.8,
        isFireBloom: true,
      };
      firesGroup.add(bloomSprite);
    });
  }, [layerFires, hotspots]);

  // ================= 3D TRAFFIC CORRIDORS ================= //
  useEffect(() => {
    const trafficGroup = trafficGroupRef.current;
    if (!trafficGroup) return;

    while (trafficGroup.children.length > 0) {
      trafficGroup.remove(trafficGroup.children[0]);
    }
    trafficBeaconsRef.current = [];

    if (!layerTraffic) return;

    INITIAL_TRAFFIC_CORRIDORS.slice(0, 12).forEach((corr) => {
      if (!corr.path || corr.path.length < 2) return;

      const points: THREE.Vector3[] = [];
      corr.path.forEach(([lng, lat]) => {
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          points.push(latLngToVec3(lat, lng, 1.0035));
        }
      });

      if (points.length < 2) return;

      let strokeColor = 0x10b981; // Lancar
      if (corr.status === 'Ramai Lancar') strokeColor = 0xf59e0b;
      else if (corr.status === 'Padat Merayap') strokeColor = 0xf97316;
      else if (corr.status === 'Macet Total') strokeColor = 0xef4444;

      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: strokeColor,
        linewidth: 4,
        transparent: true,
        opacity: 0.9,
      });

      const lineMesh = new THREE.Line(lineGeo, lineMat);
      lineMesh.userData = {
        marker: {
          id: corr.id,
          lat: corr.center[1],
          lng: corr.center[0],
          source: 'SIMULATION',
          type: 'traffic_corridor',
          name: `🚗 ${corr.name}`,
          visualSummary: `[SIMULASI KORIDOR] Status: ${corr.status.toUpperCase()} (${corr.speedKmh} km/jam). ${corr.condition}. Panjang rute: ${corr.lengthKm} km. Posisi beacon merupakan simulasi visual kecepatan rata-rata, bukan posisi GPS fisik kendaraan.`,
          monitoringSource: 'Simulasi Koridor Lalu Lintas (Model Geometri Jalan & Estimasi OSRM)',
          trafficData: corr,
        } as GlobeMarker,
      };
      trafficGroup.add(lineMesh);

      // Add 1 animated traffic beacon along this corridor
      const beaconMat = new THREE.SpriteMaterial({
        map: getTrafficBeaconTexture(),
        transparent: true,
        depthTest: true,
      });
      const beaconSprite = new THREE.Sprite(beaconMat);
      beaconSprite.renderOrder = 11;
      beaconSprite.scale.set(0.015, 0.015, 1);
      beaconSprite.position.copy(points[0]);
      trafficGroup.add(beaconSprite);

      trafficBeaconsRef.current.push({
        mesh: beaconSprite,
        points,
        progress: Math.random(),
        speed: 0.003 + Math.random() * 0.004,
      });
    });
  }, [layerTraffic]);

  // ================= 3D WEATHER & TEMPERATURE STATIONS ================= //
  useEffect(() => {
    const weatherGroup = weatherGroupRef.current;
    if (!weatherGroup) return;

    while (weatherGroup.children.length > 0) {
      weatherGroup.remove(weatherGroup.children[0]);
    }

    if (!layerWeather) return;

    DEMO_WEATHER_EXAMPLES.forEach((obs) => {
      const pos = latLngToVec3(obs.lat, obs.lng, 1.011);
      const mat = new THREE.SpriteMaterial({
        map: getWeatherStationTexture(obs.tempC, obs.condition),
        depthTest: true,
        transparent: true,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.copy(pos);
      sprite.renderOrder = 12;
      sprite.userData = {
        baseScale: 0.9,
        marker: {
          lat: obs.lat,
          lng: obs.lng,
          type: 'weather_station',
          name: `Demo cuaca: ${obs.name}`,
          visualSummary: `DEMO — angka ilustrasi, bukan pengamatan saat ini. Suhu udara contoh: ${obs.tempC}°C | Kelembapan Udara: ${obs.humidity}% | Kecepatan Angin: ${obs.windKmh} km/jam. Kondisi Atmosfer: ${obs.condition}.`,
          monitoringSource: 'Harmony — contoh statis, tidak mengambil data stasiun',
          weatherData: { tempC: obs.tempC, humidity: obs.humidity, windKmh: obs.windKmh, condition: obs.condition },
        } as GlobeMarker,
      };
      weatherGroup.add(sprite);
    });
  }, [layerWeather]);

  // ================= 3D EARTHQUAKES ================= //
  useEffect(() => {
    const markersGroup = markersGroupRef.current;
    if (!markersGroup) return;

    while (markersGroup.children.length > 0) {
      markersGroup.remove(markersGroup.children[0]);
    }

    if (!layerQuakes || quakes.length === 0) return;

    const quakeRedCoreMat = new THREE.SpriteMaterial({
      map: getQuakeCoreTexture(true),
      depthTest: true,
      transparent: true,
    });
    const quakeOrangeCoreMat = new THREE.SpriteMaterial({
      map: getQuakeCoreTexture(false),
      depthTest: true,
      transparent: true,
    });
    const quakeRedPulseMat = new THREE.SpriteMaterial({
      map: getQuakePulseTexture(true),
      depthTest: true,
      transparent: true,
    });
    quakeRedPulseMatRef.current = quakeRedPulseMat;

    const quakeOrangePulseMat = new THREE.SpriteMaterial({
      map: getQuakePulseTexture(false),
      depthTest: true,
      transparent: true,
    });
    quakeOrangePulseMatRef.current = quakeOrangePulseMat;

    quakes.forEach((q: GlobeMarker) => {
      const mag = q.mag;
      const displayMag = mag == null ? '?' : mag.toFixed(1);
      const isMajor = mag != null && mag >= 5.0;
      const magScale = mag == null ? 0.75 : Math.max(0.75, Math.min(1.4, mag / 4.2));
      const pos = latLngToVec3(q.lat, q.lng, 1.012);

      const coreSprite = new THREE.Sprite(isMajor ? quakeRedCoreMat : quakeOrangeCoreMat);
      coreSprite.position.copy(pos);
      coreSprite.renderOrder = 10;
      coreSprite.userData = {
        baseScale: magScale,
        marker: {
          ...q,
          visualSummary: q.visualSummary || `Episenter ${q.place || 'Laut/Daratan'}. Magnitudo M${displayMag} pada kedalaman ${q.depth ?? 'belum tersedia'} km.`,
          monitoringSource: q.monitoringSource || (q.source === 'BMKG' ? 'InaTEWS BMKG' : 'USGS Earthquake Hazards Program'),
        },
      };
      markersGroup.add(coreSprite);

      const pulseSprite = new THREE.Sprite(isMajor ? quakeRedPulseMat : quakeOrangePulseMat);
      pulseSprite.position.copy(pos);
      pulseSprite.renderOrder = 9;
      pulseSprite.userData = {
        isPulseRing: true,
        baseScale: magScale,
      };
      markersGroup.add(pulseSprite);
    });
  }, [layerQuakes, quakes]);

  // ================= 3D VOLCANOES & PEAKS ================= //
  useEffect(() => {
    const volcanoesGroup = volcanoesGroupRef.current;
    if (!volcanoesGroup) return;

    while (volcanoesGroup.children.length > 0) {
      volcanoesGroup.remove(volcanoesGroup.children[0]);
    }

    if ((!layerActiveVolcano && !layerInactiveVolcano && !layerPeaks) || !mountains || mountains.length === 0) {
      return;
    }

    const activeMat = new THREE.SpriteMaterial({ map: getVolcanoActiveTexture(), depthTest: true, transparent: true });
    const inactiveMat = new THREE.SpriteMaterial({ map: getVolcanoInactiveTexture(), depthTest: true, transparent: true });
    const peakMat = new THREE.SpriteMaterial({ map: getPeakTexture(), depthTest: true, transparent: true });

    mountains.forEach((m: any) => {
      if (!Number.isFinite(m.lat) || !Number.isFinite(m.lng)) return;
      const isVolcano = m.type === 'volcano';
      const isActive = isVolcano && (m.status === 'Active' || m.status === 'Waspada' || m.status === 'Siaga' || m.status === 'Awas');
      const isInactive = isVolcano && !isActive;
      const isPeak = m.type === 'peak';

      if (isActive && !layerActiveVolcano) return;
      if (isInactive && !layerInactiveVolcano) return;
      if (isPeak && !layerPeaks) return;

      const mat = isActive ? activeMat : isInactive ? inactiveMat : peakMat;
      const pos = latLngToVec3(m.lat, m.lng, 1.011);
      const sprite = new THREE.Sprite(mat);
      sprite.position.copy(pos);
      sprite.renderOrder = 11;
      sprite.userData = {
        baseScale: isActive ? 1.0 : 0.8,
        marker: {
          id: m.id || `${m.name}-${m.lat}-${m.lng}`,
          lat: m.lat,
          lng: m.lng,
          elevation: m.elevation,
          name: m.name,
          type: isActive ? 'volcano_active' : isInactive ? 'volcano_inactive' : 'peak',
          visualSummary: `${m.name} (${m.type === 'volcano' ? 'Gunung Api' : 'Puncak'}). Elevasi: ${m.elevation || '—'} mdpl. Status: ${m.status || 'Normal'}. Wilayah: ${m.region || m.province || 'Indonesia'}.`,
          monitoringSource: 'PVMBG (Pusat Vulkanologi dan Mitigasi Bencana Geologi)',
        } as GlobeMarker,
      };
      volcanoesGroup.add(sprite);
    });
  }, [mountains, layerActiveVolcano, layerInactiveVolcano, layerPeaks]);

  // ================= 3D TECTONIC PLATES ================= //
  useEffect(() => {
    const tectonicGroup = tectonicGroupRef.current;
    if (!tectonicGroup) return;

    while (tectonicGroup.children.length > 0) {
      tectonicGroup.remove(tectonicGroup.children[0]);
    }

    if (!layerTectonic) return;

    fetch('/data/tectonic-plates.json')
      .then((r) => r.json())
      .then((geoJson) => {
        if (!tectonicGroupRef.current || !layerTectonic) return;
        const features = geoJson?.features || [];
        const lineMat = new THREE.LineBasicMaterial({
          color: 0xf59e0b,
          linewidth: 2,
          transparent: true,
          opacity: 0.65,
        });

        features.forEach((feat: any) => {
          const geom = feat.geometry;
          if (!geom) return;
          const coordsList = geom.type === 'MultiLineString' ? geom.coordinates : geom.type === 'LineString' ? [geom.coordinates] : [];
          coordsList.forEach((lineCoords: number[][]) => {
            const pts: THREE.Vector3[] = [];
            lineCoords.forEach(([lng, lat]) => {
              if (Number.isFinite(lat) && Number.isFinite(lng)) {
                pts.push(latLngToVec3(lat, lng, 1.0025));
              }
            });
            if (pts.length >= 2) {
              const geo = new THREE.BufferGeometry().setFromPoints(pts);
              const line = new THREE.Line(geo, lineMat);
              tectonicGroup.add(line);
            }
          });
        });
      })
      .catch(() => {});
  }, [layerTectonic]);

  // ================= 3D EARTH SENSOR NETWORK ================= //
  useEffect(() => {
    const sensorsGroup = sensorsGroupRef.current;
    if (!sensorsGroup) return;

    while (sensorsGroup.children.length > 0) {
      sensorsGroup.remove(sensorsGroup.children[0]);
    }

    if (!layerEarthSensors) return;

    GLOBAL_EARTH_SENSOR_NETWORK.forEach((node) => {
      if (!Number.isFinite(node.lat) || !Number.isFinite(node.lng)) return;
      const family = SENSOR_FAMILY_META[node.family];
      const color = family?.colorHex || '#38bdf8';
      const mat = new THREE.SpriteMaterial({
        map: getSensorTexture(color),
        depthTest: true,
        transparent: true,
      });
      const pos = latLngToVec3(node.lat, node.lng, 1.011);
      const sprite = new THREE.Sprite(mat);
      sprite.position.copy(pos);
      sprite.renderOrder = 12;
      sprite.userData = {
        baseScale: 0.85,
        marker: {
          id: node.id,
          lat: node.lat,
          lng: node.lng,
          type: 'earth_sensor',
          name: `📡 ${node.name}`,
          visualSummary: `[Katalog Stasiun Sensor] Kode: ${node.code}. Kategori: ${family?.name || node.family} (${node.subCategory}). Platform: ${node.platform}. Status: ${node.status}. Pengukuran: ${node.primaryMeasurement} (${node.unit}). Nilai Terkini: ${node.currentValue}. Telemetri: ${node.telemetryType}.`,
          monitoringSource: `${node.provider} (${node.country || 'Global'})`,
          sensorData: node,
        } as GlobeMarker,
      };
      sensorsGroup.add(sprite);
    });
  }, [layerEarthSensors]);

  // ================= 3D ACTIVE ROUTE ================= //
  useEffect(() => {
    const routeGroup = routeGroupRef.current;
    if (!routeGroup) return;

    while (routeGroup.children.length > 0) {
      routeGroup.remove(routeGroup.children[0]);
    }

    if (!activeRouteCoords || activeRouteCoords.length < 2) return;

    const points: THREE.Vector3[] = [];
    activeRouteCoords.forEach(([lng, lat]) => {
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        points.push(latLngToVec3(lat, lng, 1.004));
      }
    });

    if (points.length < 2) return;

    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      linewidth: 3,
      transparent: true,
      opacity: 0.95,
    });
    const line = new THREE.Line(lineGeo, lineMat);
    routeGroup.add(line);

    // Start Pin
    const startPinMat = new THREE.SpriteMaterial({ map: getRoutePinTexture('start'), depthTest: true, transparent: true });
    const startPin = new THREE.Sprite(startPinMat);
    startPin.position.copy(points[0]);
    startPin.renderOrder = 15;
    startPin.userData = {
      baseScale: 1.0,
      marker: {
        lat: activeRouteCoords[0][1],
        lng: activeRouteCoords[0][0],
        type: 'route_pin',
        name: 'Titik Awal Rute',
        visualSummary: `Titik keberangkatan navigasi rute aktif.`,
        monitoringSource: 'Perencana Rute Navigasi',
      } as GlobeMarker,
    };
    routeGroup.add(startPin);

    // End Pin
    const endPinMat = new THREE.SpriteMaterial({ map: getRoutePinTexture('end'), depthTest: true, transparent: true });
    const endPin = new THREE.Sprite(endPinMat);
    endPin.position.copy(points[points.length - 1]);
    endPin.renderOrder = 15;
    endPin.userData = {
      baseScale: 1.0,
      marker: {
        lat: activeRouteCoords[activeRouteCoords.length - 1][1],
        lng: activeRouteCoords[activeRouteCoords.length - 1][0],
        type: 'route_pin',
        name: 'Tujuan Akhir Rute',
        visualSummary: `Titik tujuan navigasi rute aktif.`,
        monitoringSource: 'Perencana Rute Navigasi',
      } as GlobeMarker,
    };
    routeGroup.add(endPin);
  }, [activeRouteCoords]);

  // ================= 3D USER LOCATION BEACON ================= //
  useEffect(() => {
    const userGroup = userGroupRef.current;
    if (!userGroup) return;

    while (userGroup.children.length > 0) {
      userGroup.remove(userGroup.children[0]);
    }

    if (!userCoords || !Number.isFinite(userCoords.lat) || !Number.isFinite(userCoords.lng)) return;

    const pinMat = new THREE.SpriteMaterial({
      map: getUserPinTexture(),
      depthTest: true,
      transparent: true,
    });
    const pos = latLngToVec3(userCoords.lat, userCoords.lng, 1.015);
    const sprite = new THREE.Sprite(pinMat);
    sprite.position.copy(pos);
    sprite.renderOrder = 20;
    sprite.userData = {
      baseScale: 1.1,
      marker: {
        lat: userCoords.lat,
        lng: userCoords.lng,
        type: 'route_pin',
        name: '📍 Lokasi Pengguna',
        visualSummary: `Posisi perangkat: ${userCoords.lat.toFixed(4)}°, ${userCoords.lng.toFixed(4)}° (akurasi ±${Math.round(userCoords.accuracy || 10)}m).`,
        monitoringSource: 'GPS / Geolocation Browser',
      } as GlobeMarker,
    };
    userGroup.add(sprite);
  }, [userCoords]);

  // CSS Filter Mapping for Sensor Modes (FLIR, NVG, Cyber)
  const getViewportFilter = () => {
    switch (sensorMode) {
      case 'thermal':
        return 'contrast(175%) saturate(220%) hue-rotate(240deg) brightness(110%)';
      case 'nvg':
        return 'brightness(135%) contrast(200%) saturate(300%) sepia(100%) hue-rotate(75deg)';
      case 'cyber':
        return 'contrast(140%) brightness(115%) saturate(160%) hue-rotate(170deg)';
      default:
        return 'none';
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 select-none">
      {/* SVG Filters for God's Eye View HUD Optics */}
      <svg className="absolute w-0 h-0 pointer-events-none">
        <defs>
          <filter id="gev-scanlines">
            <feTurbulence type="fractalNoise" baseFrequency="0.04 0.95" numOctaves="1" result="noise" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.15 0" />
          </filter>
        </defs>
      </svg>

      {/* 3D WebGL Canvas Mount with Sensor Optics Filter */}
      <div 
        ref={mountRef} 
        className="w-full h-full cursor-grab active:cursor-grabbing transition-all duration-300"
        style={{ filter: getViewportFilter() }}
      />

      {/* God's Eye View NVG Vignette & Scanline Overlay */}
      {sensorMode === 'nvg' && (
        <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,20,0,0.85)_100%)]">
          <div className="w-full h-full opacity-20 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(34,197,94,0.3)_3px)]" />
        </div>
      )}

      {/* God's Eye View FLIR Thermal Crosshair & Reticle */}
      {sensorMode === 'thermal' && (
        <div className="pointer-events-none absolute inset-0 z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(30,0,50,0.6)_100%)]" />
          <div className="absolute bottom-24 left-4 rounded-xl bg-slate-950/90 px-3 py-2 text-xs text-amber-200">Efek warna termal — bukan pengukuran suhu</div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
            <div className="w-16 h-16 border border-white/40 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-yellow-300 rounded-full animate-ping" />
            </div>
            <div className="absolute w-32 h-[1px] bg-white/30" />
            <div className="absolute h-32 w-[1px] bg-white/30" />
          </div>
        </div>
      )}

      {/* God's Eye View Cyber CRT Scanline Overlay */}
      {sensorMode === 'cyber' && (
        <div className="pointer-events-none absolute inset-0 z-10 bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(6,182,212,0.12)_4px)]" />
      )}

      {/* ================= SPY-SATELLITE HUD TOP BAR ================= */}
      <div className="pointer-events-none absolute top-4 left-4 right-4 z-20 flex items-center justify-between gap-3">
        {/* Left Telemetry Box (offset on desktop to sit gracefully beside the Search Bar, leaving space for Alat GIS below) */}
        <div className="pointer-events-auto flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-white/10 shadow-2xl md:ml-[25rem] lg:ml-[29rem] shrink-0">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400">
            <Globe className={`w-4 h-4 ${autoRotate ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider text-white uppercase font-mono">
                HARMONY 3D // {sensorMode.toUpperCase()}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                VISUALISASI
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono tracking-tight flex items-center gap-2">
              <span>LAT: {centerCoords.lat.toFixed(2)}°</span>
              <span>LNG: {centerCoords.lng.toFixed(2)}°</span>
              <span>ALT: {Math.round(zoom * 180)} KM</span>
            </div>
          </div>
        </div>

        {/* Center Emergency Alert Ticker */}
        <div className="pointer-events-auto hidden 2xl:flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-xl border border-rose-500/30 text-[11px] font-mono shadow-xl text-slate-200 shrink-0">
          <Flame className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
          <span>KARHUTLA: <strong className="text-rose-400">
            {hotspotSnapshot?.status === 'UNAVAILABLE'
              ? 'Data gagal diambil'
              : hotspotSnapshot?.status === 'EMPTY'
              ? 'Tidak ada anomali terdeteksi'
              : `${hotspotSnapshot?.counts?.validRecords ?? 0} deteksi`}
          </strong> <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${
            fireFreshness === 'LIVE' ? 'bg-emerald-500/20 text-emerald-300'
            : fireFreshness === 'EMPTY' ? 'bg-sky-500/20 text-sky-300'
            : fireFreshness === 'PARTIAL' || fireFreshness === 'UPDATING' ? 'bg-amber-500/20 text-amber-300'
            : fireFreshness === 'STALE' ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
            : 'bg-rose-500/20 text-rose-300'
          }`}>{fireFreshness === 'EMPTY' ? 'NIHIL' : fireFreshness === 'STALE' ? 'DATA LAMA' : fireFreshness}</span></span>
          <span className="text-slate-600">|</span>
          <Activity className="w-3.5 h-3.5 text-amber-400" />
          <span>GEMPA: <strong className="text-amber-300">
            {quakeSnapshot?.status === 'EMPTY'
              ? 'Tidak ada gempa pada kriteria'
              : quakeSnapshot?.counts
              ? quakeSnapshot.counts.validRecords > 40
                ? `${quakeSnapshot.counts.renderedMarkers} dari ${quakeSnapshot.counts.validRecords} Peristiwa (LOD adaptif)`
                : `${quakeSnapshot.counts.validRecords} Peristiwa`
              : '0 Peristiwa'}
          </strong> <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${
            quakeFreshness === 'LIVE' ? 'bg-emerald-500/20 text-emerald-300'
            : quakeFreshness === 'EMPTY' ? 'bg-sky-500/20 text-sky-300'
            : quakeFreshness === 'PARTIAL' || quakeFreshness === 'UPDATING' ? 'bg-amber-500/20 text-amber-300'
            : quakeFreshness === 'STALE' ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
            : 'bg-rose-500/20 text-rose-300'
          }`}>{quakeFreshness === 'EMPTY' ? 'NIHIL' : quakeFreshness === 'STALE' ? 'DATA LAMA' : quakeFreshness}</span></span>
          <span className="text-slate-600">|</span>
          <Car className="w-3.5 h-3.5 text-teal-400" />
          <span>LALU LINTAS: <strong className="text-teal-300">12 dari {INITIAL_TRAFFIC_CORRIDORS.length} Koridor (SIMULASI)</strong></span>
        </div>

        {/* Right Section: Refresh & Master UTC Clock (offset on md/lg to preserve room for GPS & Compass dock) */}
        <div className="pointer-events-auto hidden sm:flex items-center gap-2 mr-0 md:mr-36 lg:mr-40 shrink-0">
          <button
            onClick={refreshAllFeeds}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 shadow-2xl text-xs font-mono transition-all active:scale-95 disabled:opacity-50"
            title="Sinkronisasi manual feed USGS, BMKG, dan NASA FIRMS"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isRefreshing ? 'Memuat...' : 'Sync'}</span>
          </button>

          <div className="px-3.5 py-2 rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-white/10 shadow-2xl text-right">
            <div className="text-xs font-black text-sky-300 font-mono tracking-wider">
              {utcTime || '00:00:00 UTC'}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {lastRefreshedAt ? `SYNC: ${lastRefreshedAt}` : `BASEMAP: ${basemapMode === 'esri_satellite' ? 'ESRI SAT 4K' : basemapMode === 'dark' ? 'NASA NIGHT' : 'OSM TOPO'}`}
            </div>
          </div>
        </div>
      </div>

      {/* ================= CELESTIAL INFO HUD PANEL (LEFT SIDE) ================= */}
      {showCelestialPanel && (
        <CelestialInfoPanel
          selectedBodyId={activeCelestialId}
          onSelectBody={(id) => {
            setActiveCelestialId(id);
            activeCelestialIdRef.current = id;
          }}
          onFocusTarget={(id) => flyToCelestialBody(id)}
          onReturnToEarth={returnToEarth}
          onClose={() => setShowCelestialPanel(false)}
        />
      )}

      {/* ================= COSMIC & SOLAR SYSTEM QUICK BAR ================= */}
      <div 
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="pointer-events-auto absolute top-16 left-4 md:left-[25rem] lg:left-[29rem] z-20 flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-white/10 shadow-2xl text-xs font-mono"
      >
        <div className="flex items-center gap-1.5 text-sky-300 font-bold">
          <Orbit className="w-3.5 h-3.5 text-sky-400" />
          <span className="uppercase text-[11px]">
            {activeCelestialId === 'earth' 
              ? 'Fokus: Bumi' 
              : `Fokus: ${PLANETARY_CATALOG[activeCelestialId]?.name || activeCelestialId}`}
          </span>
        </div>

        <span className="text-slate-600">|</span>

        {/* Speed Multipliers */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsOrbitPaused(!isOrbitPaused)}
            className={`p-1 rounded-lg transition-colors ${
              isOrbitPaused 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title={isOrbitPaused ? 'Lanjutkan Orbit' : 'Jeda Orbit'}
          >
            {isOrbitPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          </button>
          {[1, 5, 20].map((spd) => (
            <button
              key={spd}
              type="button"
              onClick={() => {
                setOrbitSpeedMultiplier(spd);
                setIsOrbitPaused(false);
              }}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-colors ${
                orbitSpeedMultiplier === spd && !isOrbitPaused
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>

        <span className="text-slate-600">|</span>

        {/* Toggle Info HUD */}
        <button
          type="button"
          onClick={() => setShowCelestialPanel(!showCelestialPanel)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
            showCelestialPanel 
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' 
              : 'text-slate-400 hover:text-white hover:bg-white/10'
          }`}
          title="Buka Panel Data Sains NASA"
        >
          <Info className="w-3 h-3" />
          <span>Data NASA</span>
        </button>

        {/* Ambient Sci-Fi Music Toggle */}
        <button
          type="button"
          onClick={async () => {
            const isPlaying = await cosmicAudio.toggle();
            setIsAudioPlaying(isPlaying);
          }}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
            isAudioPlaying
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-white/10'
          }`}
          title={isAudioPlaying ? 'Matikan Musik Kosmik Ambient' : 'Putar Musik Kosmik Ambient (Sci-Fi)'}
        >
          {isAudioPlaying ? <Volume2 className="w-3 h-3 text-purple-400" /> : <VolumeX className="w-3 h-3" />}
          <span className="hidden sm:inline">Audio Kosmik</span>
        </button>

        {/* Quick Return to Earth button */}
        {activeCelestialId !== 'earth' && (
          <button
            type="button"
            onClick={returnToEarth}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold transition-all"
            title="Kembali ke tampilan Bumi"
          >
            <Globe className="w-3 h-3" />
            <span>Kembali ke Bumi</span>
          </button>
        )}
      </div>

      {/* Hover Tooltip for Celestial Bodies */}
      {hoveredCelestial && (
        <div 
          className="pointer-events-none fixed z-50 px-3 py-1.5 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-sky-400/50 text-xs font-bold text-sky-200 shadow-2xl -translate-x-1/2 -translate-y-12 flex items-center gap-2 animate-in fade-in duration-150"
          style={{ left: hoveredCelestial.x, top: hoveredCelestial.y }}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
          <span>{hoveredCelestial.name}</span>
          <span className="text-[10px] text-slate-400 font-normal">Klik untuk data NASA</span>
        </div>
      )}

      {/* ================= OPTICS & SENSOR CONTROLS (BOTTOM LEFT) ================= */}
      <div 
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-32 sm:bottom-36 left-4 z-20 flex flex-col gap-1.5 p-2 rounded-2xl bg-slate-900/90 backdrop-blur-2xl border border-white/15 shadow-2xl"
      >
        <span className="text-[10px] font-mono font-bold text-slate-400 px-2 uppercase tracking-wider">
          Optik Sensor 3D
        </span>
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={() => setSensorMode('normal')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 transition-all ${
              sensorMode === 'normal' 
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30' 
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Satelit</span>
          </button>

          <button
            onClick={() => setSensorMode('thermal')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 transition-all ${
              sensorMode === 'thermal' 
                ? 'bg-gradient-to-r from-purple-600 to-rose-600 text-white shadow-lg shadow-rose-500/30 ring-1 ring-rose-400' 
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
            title="Ironbow FLIR (Simulasi Kontras Luminansi / Shader Efek Visual, bukan sensor suhu fisik)"
          >
            <Flame className="w-3.5 h-3.5 text-yellow-300" />
            <span>FLIR*</span>
          </button>

          <button
            onClick={() => setSensorMode('nvg')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 transition-all ${
              sensorMode === 'nvg' 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 ring-1 ring-emerald-400' 
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
            title="Night Vision Goggles (Phosphor Green)"
          >
            <Crosshair className="w-3.5 h-3.5 text-emerald-300" />
            <span>NVG</span>
          </button>

          <button
            onClick={() => setSensorMode('cyber')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 transition-all ${
              sensorMode === 'cyber' 
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/30 ring-1 ring-cyan-400' 
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
            title="Tactical Cyber CRT Radar"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>Cyber</span>
          </button>
        </div>

        {/* Basemap Switcher */}
        <div className="pt-1.5 border-t border-white/10 flex items-center justify-between gap-1 text-[11px] font-mono">
          <button
            onClick={() => setBasemapMode('esri_satellite')}
            className={`px-2 py-1 rounded-lg ${basemapMode === 'esri_satellite' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-white'}`}
          >
            Esri 4K
          </button>
          <button
            onClick={() => setBasemapMode('osm')}
            className={`px-2 py-1 rounded-lg ${basemapMode === 'osm' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-white'}`}
          >
            OSM
          </button>
          <button
            onClick={() => setBasemapMode('dark')}
            className={`px-2 py-1 rounded-lg ${basemapMode === 'dark' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-white'}`}
          >
            Night
          </button>
        </div>
      </div>

      {/* ================= RICH TARGET INSPECTION MODAL ================= */}
      {selectedMarker && (
        <div 
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-24 sm:top-28 right-4 md:right-36 lg:right-40 z-30 w-80 max-w-[calc(100vw-2.5rem)] p-4 rounded-3xl bg-slate-900/95 backdrop-blur-2xl border border-white/15 text-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[calc(100vh-14rem)] overflow-y-auto"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="text-[10px] font-mono font-bold tracking-wider text-sky-400 uppercase flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5" />
              Target Telemetry Lock
            </span>
            <button
              onClick={() => setSelectedMarker(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-base font-black text-white leading-snug mb-1">
            {selectedMarker.name || selectedMarker.place || 'Target Spasial'}
          </h3>

          {/* Special Card for Wildfires / Karhutla */}
          {selectedMarker.type === 'fire_hotspot' && selectedMarker.fireData && (
            <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-3 my-2 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Suhu Kecerahan:</span>
                <span className="font-mono font-bold text-rose-300">
                  {selectedMarker.fireData.brightnessKelvin ?? '—'} K ({selectedMarker.fireData.brightnessCelsius ?? '—'}°C)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Radiasi Api (FRP):</span>
                <span className="font-mono font-bold text-yellow-300">{selectedMarker.fireData.frpMw} MW</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Satelit Sensor:</span>
                <span className="text-slate-200">{selectedMarker.fireData.satellite} ({selectedMarker.fireData.instrument})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Status Bahaya:</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/30 text-rose-200 border border-rose-500/40">
                  {selectedMarker.fireData.fireRiskLevel}
                </span>
              </div>
            </div>
          )}

          {/* Special Card for Traffic Corridors */}
          {selectedMarker.type === 'traffic_corridor' && selectedMarker.trafficData && (
            <div className="bg-teal-950/40 border border-teal-500/30 rounded-2xl p-3 my-2 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Status Kepadatan:</span>
                <span className="font-bold text-teal-300">{selectedMarker.trafficData.status}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Kecepatan Rata-Rata:</span>
                <span className="font-mono font-bold text-white">{selectedMarker.trafficData.speedKmh} km/jam</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Panjang Koridor:</span>
                <span className="text-slate-200">{selectedMarker.trafficData.lengthKm} km</span>
              </div>
            </div>
          )}

          {/* Special Card for Earthquakes */}
          {selectedMarker.type === 'earthquake' && (
            <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-3 my-2 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Magnitudo:</span>
                <span className="font-mono font-bold text-amber-300 text-sm">
                  {selectedMarker.mag != null ? `M${selectedMarker.mag.toFixed(1)}` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Kedalaman Episenter:</span>
                <span className="font-mono font-bold text-slate-200">{selectedMarker.depth ?? '—'} km</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Penyedia Data:</span>
                <span className="font-bold text-sky-300">{selectedMarker.source || 'USGS'}</span>
              </div>
              {selectedMarker.time && (
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-400">Waktu Gempa:</span>
                  <span className="text-slate-300 font-mono">
                    {typeof selectedMarker.time === 'number' ? new Date(selectedMarker.time).toUTCString() : String(selectedMarker.time)}
                  </span>
                </div>
              )}
              <div className="mt-2 pt-1.5 border-t border-amber-500/20 text-[10px] text-amber-200/80 leading-tight">
                ⚠️ Catatan: Tidak ada prediksi waktu kejadian gempa bumi atau jaminan ketiadaan risiko dari nihilnya marker feed.
              </div>
            </div>
          )}

          {/* Special Card for Weather Stations */}
          {selectedMarker.type === 'weather_station' && selectedMarker.weatherData && (
            <div className="bg-sky-950/40 border border-sky-500/30 rounded-2xl p-3 my-2 space-y-1.5 text-xs">
              <p className="text-amber-300 font-bold">DEMO — angka contoh, bukan cuaca saat ini</p>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Suhu Udara:</span>
                <span className="font-mono font-bold text-sky-300 text-sm">{selectedMarker.weatherData.tempC}°C</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Kelembapan:</span>
                <span className="text-slate-200">{selectedMarker.weatherData.humidity}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Kecepatan Angin:</span>
                <span className="text-slate-200">{selectedMarker.weatherData.windKmh} km/jam</span>
              </div>
            </div>
          )}

          {selectedMarker.visualSummary && (
            <p className="text-[11px] text-slate-300 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 my-2 leading-relaxed">
              {selectedMarker.visualSummary}
            </p>
          )}

          <div className="space-y-1 text-xs text-slate-300 pt-2 border-t border-slate-800 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">KOORDINAT:</span>
              <span className="text-slate-200">{selectedMarker.lat.toFixed(3)}°, {selectedMarker.lng.toFixed(3)}°</span>
            </div>
            {selectedMarker.monitoringSource && (
              <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                <span>SUMBER:</span>
                <span className="text-sky-300 truncate max-w-[160px]">{selectedMarker.monitoringSource}</span>
              </div>
            )}
          </div>

          {onSwitchTo2D && (
            <button
              onClick={() => onSwitchTo2D(selectedMarker.lat, selectedMarker.lng, 10)}
              className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-md shadow-sky-500/25"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka di Peta Datar (2D)</span>
            </button>
          )}
        </div>
      )}

      {/* ================= LAYER QUICK-TOGGLE DRAWER ================= */}
      {activeLayerPanel && (
        <div 
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute bottom-24 right-4 z-30 p-3.5 rounded-3xl bg-slate-900/95 backdrop-blur-2xl border border-white/10 text-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 min-w-[260px]"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-mono">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              Lapisan Pengawasan 3D
            </span>
            <button 
              onClick={() => setActiveLayerPanel(false)}
              className="p-1 text-slate-400 hover:text-white rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 text-xs font-mono">
            <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
                Karhutla (NASA FIRMS)
              </span>
              <input 
                id="globe-layer-fires"
                name="layerFires"
                type="checkbox" 
                checked={layerFires} 
                onChange={(e) => setLayerFires(e.target.checked)} 
                className="rounded accent-rose-500"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-sm shadow-teal-400/50" />
                Lalu Lintas Koridor Tol
              </span>
              <input 
                id="globe-layer-traffic"
                name="layerTraffic"
                type="checkbox" 
                checked={layerTraffic} 
                onChange={(e) => setLayerTraffic(e.target.checked)} 
                className="rounded accent-teal-500"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                Contoh Cuaca (DEMO)
              </span>
              <input 
                id="globe-layer-weather"
                name="layerWeather"
                type="checkbox" 
                checked={layerWeather} 
                onChange={(e) => setLayerWeather(e.target.checked)} 
                className="rounded accent-sky-500"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                Gempa Bumi USGS / BMKG
              </span>
              <input 
                id="globe-layer-quakes"
                name="layerQuakes"
                type="checkbox" 
                checked={layerQuakes} 
                onChange={(e) => setLayerQuakes(e.target.checked)} 
                className="rounded accent-amber-500"
              />
            </label>

            {layerQuakes && (
              <div className="pl-3 pr-1 py-1.5 bg-white/5 rounded-lg space-y-1">
                <span className="text-[10px] text-slate-400 block font-bold">Feed USGS & BMKG:</span>
                <div className="grid grid-cols-2 gap-1 text-[9px]">
                  <button
                    onClick={() => setQuakeFeed('2.5_day')}
                    className={`px-1.5 py-1 rounded text-left transition-colors ${quakeFeed === '2.5_day' ? 'bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                  >
                    M2.5+ (24 Jam)
                  </button>
                  <button
                    onClick={() => setQuakeFeed('2.5_week')}
                    className={`px-1.5 py-1 rounded text-left transition-colors ${quakeFeed === '2.5_week' ? 'bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                  >
                    M2.5+ (7 Hari)
                  </button>
                  <button
                    onClick={() => setQuakeFeed('all_day')}
                    className={`px-1.5 py-1 rounded text-left transition-colors ${quakeFeed === 'all_day' ? 'bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                  >
                    Semua (24 Jam)
                  </button>
                  <button
                    onClick={() => setQuakeFeed('4.5_month')}
                    className={`px-1.5 py-1 rounded text-left transition-colors ${quakeFeed === '4.5_month' ? 'bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                  >
                    M4.5+ (30 Hari)
                  </button>
                </div>
              </div>
            )}

            <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                Gunung Api Aktif PVMBG
              </span>
              <input 
                id="globe-layer-active-volcano"
                name="layerActiveVolcano"
                type="checkbox" 
                checked={layerActiveVolcano} 
                onChange={(e) => setLayerActiveVolcano(e.target.checked)} 
                className="rounded accent-red-500"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                Sensor Jaringan Bumi
              </span>
              <input 
                id="globe-layer-earth-sensors"
                name="layerEarthSensors"
                type="checkbox" 
                checked={layerEarthSensors} 
                onChange={(e) => setLayerEarthSensors(e.target.checked)} 
                className="rounded accent-indigo-500"
              />
            </label>
          </div>
        </div>
      )}

      {/* ================= PRIMARY FLOATING DOCK (BOTTOM CENTER) ================= */}
      <div 
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/85 backdrop-blur-2xl border border-white/15 shadow-2xl"
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleZoom('out'); }}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 hover:bg-white/15 text-white transition-all active:scale-95"
          title="Perkecil Bola Dunia"
        >
          <ZoomOut className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleZoom('in'); }}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 hover:bg-white/15 text-white transition-all active:scale-95"
          title="Perbesar / Beralih ke 2D"
        >
          <ZoomIn className="h-4 w-4" />
        </button>

        <div className="w-[1px] h-5 bg-white/15 mx-0.5 shrink-0" />

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); rotateGlobeBy(-45); }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 hover:bg-white/15 text-white transition-all active:scale-95"
          title="Putar Kiri (-45°)"
        >
          <RotateCcw className="h-3.5 w-3.5 text-slate-300" />
        </button>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); focusIndonesia(); }}
          className="flex items-center gap-1.5 px-3 h-9 shrink-0 rounded-xl bg-gradient-to-r from-sky-500/20 to-indigo-500/20 hover:from-sky-500/30 text-sky-200 border border-sky-500/30 font-bold text-xs transition-all active:scale-95"
          title="Fokus Indonesia"
        >
          <Compass className="h-3.5 w-3.5 text-sky-400" />
          <span className="hidden sm:inline">Nusantara</span>
        </button>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); rotateGlobeBy(45); }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 hover:bg-white/15 text-white transition-all active:scale-95"
          title="Putar Kanan (+45°)"
        >
          <RotateCw className="h-3.5 w-3.5 text-slate-300" />
        </button>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setAutoRotate((p) => !p); }}
          className={`flex items-center gap-1.5 px-3 h-9 shrink-0 rounded-xl font-bold text-xs transition-all active:scale-95 ${
            autoRotate
              ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/30'
              : 'bg-white/5 text-slate-300 hover:bg-white/15'
          }`}
          title="Rotasi Orbit 360°"
        >
          {autoRotate ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          <span>{autoRotate ? 'Berhenti' : 'Orbit'}</span>
        </button>

        <div className="w-[1px] h-5 bg-white/15 mx-0.5 shrink-0" />

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setActiveLayerPanel((p) => !p); }}
          className={`flex items-center gap-1.5 px-2.5 h-9 rounded-xl font-bold text-xs transition-all active:scale-95 ${
            activeLayerPanel
              ? 'bg-white text-slate-900'
              : 'bg-white/5 text-slate-300 hover:bg-white/15'
          }`}
          title="Buka Lapisan Pengawasan"
        >
          <Layers className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Lapisan</span>
        </button>
      </div>
    </div>
  );
}
