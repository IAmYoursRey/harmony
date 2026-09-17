import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  Radio
} from 'lucide-react';
import { 
  GLOBAL_EARTH_SENSOR_NETWORK, 
  EarthSensorNode, 
  SENSOR_FAMILY_META 
} from '@/services/earthSensorRegistry';

export interface GlobeMarker {
  id?: string | number;
  lat: number;
  lng: number;
  type: 'earthquake' | 'volcano_active' | 'volcano_inactive' | 'peak' | 'school' | 'route_pin' | 'city' | 'province' | 'island' | 'earth_sensor';
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
}

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

// Convert lat/lng (degrees) to 3D point on unit sphere
function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// ---------------------------------------------------------------------------
// High-Resolution Billboard Textures matching 2D OpenLayers disaster symbols
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

// Upward Triangle for Active Volcano (Identical to 2D RegularShape points:3 with white border)
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

  // White inner crater accent
  ctx.beginPath();
  ctx.moveTo(64, 48);
  ctx.lineTo(76, 76);
  ctx.lineTo(52, 76);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedVolcanoActiveTex = tex;
  return tex;
}

// Upward Triangle for Inactive/Waspada Volcano
function getVolcanoInactiveTexture(): THREE.CanvasTexture {
  if (cachedVolcanoInactiveTex) return cachedVolcanoInactiveTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;

  ctx.beginPath();
  ctx.moveTo(64, 20);
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

// Upward Triangle for High Mountain Peaks
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

// Solid Core Circle for Earthquakes (Identical to 2D CircleStyle)
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

// Expanding Pulsing Radar Ring for Earthquakes (Identical to 2D OpenLayers shockwave animation)
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

// Route Origin and Destination Pins
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

// User Realtime GPS Pin Texture
let cachedUserPinTex: THREE.CanvasTexture | null = null;
function getUserPinTexture(): THREE.CanvasTexture {
  if (cachedUserPinTex) return cachedUserPinTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.beginPath();
  ctx.arc(64, 64, 52, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(59, 130, 246, 0.28)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(64, 64, 34, 0, Math.PI * 2);
  ctx.fillStyle = '#2563eb';
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(64, 64, 12, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedUserPinTex = tex;
  return tex;
}

// Earth Sensor Marker Texture Generator (Color-coded by family)
const cachedSensorTextures: Record<string, THREE.CanvasTexture> = {};
function getSensorTexture(colorHex: string): THREE.CanvasTexture {
  if (cachedSensorTextures[colorHex]) return cachedSensorTextures[colorHex];
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.beginPath();
  ctx.arc(64, 64, 50, 0, Math.PI * 2);
  ctx.fillStyle = `${colorHex}40`;
  ctx.fill();
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(64, 64, 22, 0, Math.PI * 2);
  ctx.fillStyle = colorHex;
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedSensorTextures[colorHex] = tex;
  return tex;
}

// Initial center on Indonesia (lat: -2.5, lng: 118)
const INDO_ROT_Y = (152 * Math.PI) / 180;
const INDO_ROT_X = (-2.5 * Math.PI) / 180;

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
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const globeRef = useRef<THREE.Mesh | null>(null);
  const atmosphereRef = useRef<THREE.Mesh | null>(null);
  const cloudsRef = useRef<THREE.Mesh | null>(null);
  const markersGroupRef = useRef<THREE.Group | null>(null);
  const tectonicGroupRef = useRef<THREE.Group | null>(null);
  const routeGroupRef = useRef<THREE.Group | null>(null);
  const userGroupRef = useRef<THREE.Group | null>(null);
  const windParticlesRef = useRef<THREE.Points | null>(null);
  const windParticlesData = useRef<{ velocities: Float32Array; lats: Float32Array; lngs: Float32Array } | null>(null);
  const frameRef = useRef<number>(0);

  // OSM tile canvas texture refs
  const osmCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const osmTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const lastOsmZoomLevelRef = useRef<number>(-1);
  const drawOsmTilesRef = useRef<((z: number) => void) | null>(null);
  const cameraZToOsmZoomRef = useRef<((camZ: number) => number) | null>(null);

  // Interaction refs (Universal Touch & Mouse)
  const isDragging = useRef(false);
  const isInteracting = useRef(false);
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const previousCenter = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const previousPinchDist = useRef<number | null>(null);
  const rotationVelocity = useRef({ x: 0, y: 0 });
  const totalDragDist = useRef<number>(0);

  // Raycaster & clickable marker objects
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseCoordsRef = useRef(new THREE.Vector2());
  const clickableObjectsRef = useRef<THREE.Object3D[]>([]);

  // Shared pulse material refs for smooth 60fps earthquake ripple animations
  const quakeRedPulseMatRef = useRef<THREE.SpriteMaterial | null>(null);
  const quakeOrangePulseMatRef = useRef<THREE.SpriteMaterial | null>(null);

  // Groups & materials for dynamic provincial boundaries and hierarchical place labels
  const boundariesGroupRef = useRef<THREE.Group | null>(null);
  const boundariesMatRef = useRef<THREE.LineBasicMaterial | null>(null);
  const frameCounterRef = useRef<number>(0);
  const osmFrameCounterRef = useRef<number>(0);



  // State
  const [autoRotate, setAutoRotate] = useState(false);
  const [zoom, setZoom] = useState(initialCenter ? 1.45 : 2.3);
  const [activeLayerPanel, setActiveLayerPanel] = useState(false);
  const [weatherOverlay3D, setWeatherOverlay3D] = useState<'satellite' | 'wind' | 'rain' | 'clouds' | 'temp'>('satellite');
  const [selectedMarker, setSelectedMarker] = useState<GlobeMarker | null>(null);
  const [quakes, setQuakes] = useState<GlobeMarker[]>([]);
  const [isTextureLoaded, setIsTextureLoaded] = useState(false);
  // True while the zoom-in-to-2D transition overlay is playing
  const [switchingTo2D, setSwitchingTo2D] = useState(false);

  // Local layer visibility toggles
  const [layerActiveVolcano, setLayerActiveVolcano] = useState(showActiveVolcanoes);
  const [layerInactiveVolcano, setLayerInactiveVolcano] = useState(showInactiveVolcanoes);
  const [layerPeaks, setLayerPeaks] = useState(showPeaks);
  const [layerTectonic, setLayerTectonic] = useState(showTectonicPlates);
  const [layerQuakes, setLayerQuakes] = useState(showEarthquakes);
  const [layerEarthSensors, setLayerEarthSensors] = useState(showEarthSensors);
  const [layerBoundaries, setLayerBoundaries] = useState(true);

  useEffect(() => { setLayerEarthSensors(showEarthSensors); }, [showEarthSensors]);

  // Prevent firing the 2D switch more than once per mount
  const switchTriggeredRef = useRef(false);
  // Keep onSwitchTo2D stable inside the closure-heavy animation loop
  const onSwitchTo2DRef = useRef(onSwitchTo2D);
  useEffect(() => { onSwitchTo2DRef.current = onSwitchTo2D; }, [onSwitchTo2D]);

  const autoRotateRef = useRef(autoRotate);
  useEffect(() => { autoRotateRef.current = autoRotate; }, [autoRotate]);

  const weatherOverlayRef = useRef(weatherOverlay3D);
  useEffect(() => { 
    weatherOverlayRef.current = weatherOverlay3D;
    if (windParticlesRef.current) {
      windParticlesRef.current.visible = weatherOverlay3D === 'wind';
    }
    if (cloudsRef.current) {
      cloudsRef.current.visible = weatherOverlay3D === 'clouds' || weatherOverlay3D === 'rain';
    }
  }, [weatherOverlay3D]);

  // Fetch real-time USGS earthquakes once
  useEffect(() => {
    let active = true;
    fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson')
      .then((res) => res.json())
      .then((data) => {
        if (!active || !data?.features) return;
        const mapped: GlobeMarker[] = data.features.map((f: any) => ({
          id: f.id,
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
          depth: f.geometry.coordinates[2],
          mag: f.properties.mag,
          place: f.properties.place,
          time: f.properties.time,
          type: 'earthquake' as const,
        }));
        setQuakes(mapped);
      })
      .catch((err) => {
        console.warn('Globe3D: Earthquake feed fallback', err);
      });
    return () => { active = false; };
  }, []);

  // Read the lat/lng at the centre of the current globe view
  const getCenterCoords = useCallback((): { lat: number; lng: number } => {
    const globe = globeRef.current;
    if (!globe) return { lat: -2.5, lng: 118.0 };
    const v = new THREE.Vector3(0, 0, 1).applyEuler(
      new THREE.Euler(-globe.rotation.x, -globe.rotation.y, 0, 'YXZ')
    );
    const lat = (Math.asin(Math.max(-1, Math.min(1, v.y))) * 180) / Math.PI;
    const theta = Math.atan2(v.z, -v.x);
    let lng = (theta * 180) / Math.PI - 180;
    while (lng < -180) lng += 360;
    while (lng > 180) lng -= 360;
    return { lat, lng };
  }, []);

  // Fire the 3D → 2D hand-off exactly once, with a brief visual transition
  const triggerSwitch2D = useCallback(() => {
    if (switchTriggeredRef.current || !onSwitchTo2DRef.current) return;
    switchTriggeredRef.current = true;
    setSwitchingTo2D(true);
    const { lat, lng } = getCenterCoords();
    // Short delay so the fade-in overlay is visible before the component unmounts
    setTimeout(() => {
      onSwitchTo2DRef.current?.(lat, lng, 7.5);
    }, 420);
  }, [getCenterCoords]);

  // Ref so the one-shot useEffect event handlers always call the latest version
  const triggerSwitch2DRef = useRef(triggerSwitch2D);
  useEffect(() => { triggerSwitch2DRef.current = triggerSwitch2D; }, [triggerSwitch2D]);

  // Smooth Zoom Handler — at the inner limit, trigger 2D switch instead of clamping
  const handleZoom = useCallback((direction: 'in' | 'out') => {
    if (direction === 'in' && switchTriggeredRef.current) return;
    setZoom((prev) => {
      if (direction === 'in') {
        const next = prev - 0.25;
        if (next < 1.18) {
          triggerSwitch2D();
          return 1.18;
        }
        if (cameraRef.current) {
          cameraRef.current.position.z = next;
          cameraRef.current.updateProjectionMatrix();
        }
        return next;
      } else {
        const next = Math.min(4.2, prev + 0.25);
        if (cameraRef.current) {
          cameraRef.current.position.z = next;
          cameraRef.current.updateProjectionMatrix();
        }
        return next;
      }
    });
  }, [triggerSwitch2D]);

  // Smooth Focus on Indonesia
  const focusIndonesia = useCallback(() => {
    const globe = globeRef.current;
    if (!globe) return;
    rotationVelocity.current = { x: 0, y: 0 };
    setAutoRotate(false);

    const startX = globe.rotation.x;
    const startY = globe.rotation.y;
    const targetX = INDO_ROT_X;
    const currentRotY = globe.rotation.y;
    const twoPi = Math.PI * 2;
    let targetY = INDO_ROT_Y;
    while (targetY - currentRotY > Math.PI) targetY -= twoPi;
    while (targetY - currentRotY < -Math.PI) targetY += twoPi;

    const startTime = performance.now();
    const duration = 800;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = progress < 0.5 
        ? 4 * progress * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      globe.rotation.x = startX + (targetX - startX) * ease;
      globe.rotation.y = startY + (targetY - startY) * ease;

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, []);

  // Step rotation by angle (+45° or -45°)
  const rotateGlobeBy = useCallback((deltaDeg: number) => {
    const globe = globeRef.current;
    if (!globe) return;
    rotationVelocity.current = { x: 0, y: 0 };
    setAutoRotate(false);

    const startY = globe.rotation.y;
    const targetY = startY + (deltaDeg * Math.PI) / 180;
    const startTime = performance.now();
    const duration = 350;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      globe.rotation.y = startY + (targetY - startY) * ease;

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, []);

  // Smoothly rotate globe to face specific latitude and longitude
  const focusLocation = useCallback((lat: number, lng: number) => {
    const globe = globeRef.current;
    if (!globe) return;
    rotationVelocity.current = { x: 0, y: 0 };
    setAutoRotate(false);

    const targetX = (-lat * Math.PI) / 180;
    let targetY = ((270 - lng) * Math.PI) / 180;
    const currentRotY = globe.rotation.y;
    const twoPi = Math.PI * 2;
    while (targetY - currentRotY > Math.PI) targetY -= twoPi;
    while (targetY - currentRotY < -Math.PI) targetY += twoPi;

    const startX = globe.rotation.x;
    const startY = globe.rotation.y;
    const startTime = performance.now();
    const duration = 800;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = progress < 0.5 
        ? 4 * progress * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      globe.rotation.x = startX + (targetX - startX) * ease;
      globe.rotation.y = startY + (targetY - startY) * ease;

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, []);

  // ================= SCENE INITIALIZATION (RUNS ONCE) ================= //
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.z = zoom;
    cameraRef.current = camera;

    // WebGL Renderer - High Performance Settings
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true, 
      powerPreference: 'high-performance' 
    });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambientLight);
    const sunLight = new THREE.DirectionalLight(0xfff8ee, 2.2);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
    rimLight.position.set(-5, -2, -4);
    scene.add(rimLight);

    // Globe Sphere geometry
    const radius = 1;
    const geometry = new THREE.SphereGeometry(radius, 64, 64);

    // ---------------------------------------------------------------------------
    // OSM Tile Canvas Texture — projects OpenStreetMap tiles onto the sphere
    // Resolution 4096×2048 gives sharp detail. No API key needed.
    // ---------------------------------------------------------------------------
    const CANVAS_W = 4096;
    const CANVAS_H = 2048;
    const osmCanvas = document.createElement('canvas');
    osmCanvas.width = CANVAS_W;
    osmCanvas.height = CANVAS_H;
    osmCanvasRef.current = osmCanvas;

    const osmCtx = osmCanvas.getContext('2d')!;

    // Paint deep ocean gradient immediately so the globe is never empty
    const paintOcean = () => {
      const g = osmCtx.createLinearGradient(0, 0, 0, CANVAS_H);
      g.addColorStop(0.0,  '#0b1f4a');
      g.addColorStop(0.3,  '#0a3570');
      g.addColorStop(0.5,  '#0f4d8f');
      g.addColorStop(0.7,  '#0a3570');
      g.addColorStop(1.0,  '#0b1f4a');
      osmCtx.fillStyle = g;
      osmCtx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    };
    paintOcean();

    const osmTexture = new THREE.CanvasTexture(osmCanvas);
    osmTexture.colorSpace = THREE.SRGBColorSpace;
    osmTexture.minFilter = THREE.LinearFilter;
    osmTexture.magFilter = THREE.LinearFilter;
    osmTexture.anisotropy = 8;
    osmTextureRef.current = osmTexture;

    // Convert OSM tile row y → north-edge latitude (Mercator inverse)
    const tileYToLat = (y: number, z: number) => {
      const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
      return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
    };

    // Convert lat → OSM tile row y
    const latToTileY = (lat: number, z: number) => {
      const latRad = (lat * Math.PI) / 180;
      return Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, z));
    };

    // Camera distance → OSM tile zoom (capped at 4 for full-world to limit tile count)
    const cameraZToOsmZoom = (camZ: number) => {
      if (camZ > 3.0) return 2; //  4× 4 = 16 tiles
      if (camZ > 2.3) return 3; //  8× 8 = 64 tiles
      return 4;                  // 16×16 = 256 tiles — max for full-world pass
    };

    // Fetches a tile as blob URL to bypass browser CORS/User-Agent restrictions on OSM
    const fetchTileAsBlob = (url: string): Promise<string> => {
      return fetch(url, {
        headers: { 'User-Agent': 'HarmonyApp/1.0 (educational project)' },
      })
        .then((r) => r.blob())
        .then((b) => URL.createObjectURL(b))
        .catch(() => '');
    };

    // Track blob URLs to revoke them on next redraw (memory cleanup)
    let activeBlobUrls: string[] = [];

    // Draws OSM tiles for the whole world at a given zoom level
    const drawOsmTiles = (osmZoom: number) => {
      // Revoke previous object URLs
      activeBlobUrls.forEach((u) => URL.revokeObjectURL(u));
      activeBlobUrls = [];

      lastOsmZoomLevelRef.current = osmZoom;

      const n = Math.pow(2, osmZoom);

      paintOcean();
      osmTexture.needsUpdate = true;

      // Build list of all tile coords
      const jobs: Array<{ tx: number; ty: number; pxLeft: number; pyTop: number; drawW: number; drawH: number }> = [];

      for (let tx = 0; tx < n; tx++) {
        for (let ty = 0; ty < n; ty++) {
          const latNorth = tileYToLat(ty, osmZoom);
          const latSouth = tileYToLat(ty + 1, osmZoom);

          // Skip polar extremes (> 85.05°) — Mercator doesn't cover poles
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

      // Load tiles in batches of 8 to avoid browser connection limits
      const BATCH = 8;
      let jobIdx = 0;

      const runBatch = () => {
        const batch = jobs.slice(jobIdx, jobIdx + BATCH);
        jobIdx += BATCH;
        if (batch.length === 0) return;

        let done = 0;
        batch.forEach(({ tx, ty, pxLeft, pyTop, drawW, drawH }) => {
          // Use OSM standard tile URL — free, no API key required
          const tileUrl = `https://tile.openstreetmap.org/${osmZoom}/${tx}/${ty}.png`;

          fetchTileAsBlob(tileUrl).then((blobUrl) => {
            done++;
            if (!blobUrl) {
              if (done === batch.length) runBatch();
              return;
            }

            if (lastOsmZoomLevelRef.current !== osmZoom) {
              URL.revokeObjectURL(blobUrl);
              return;
            }

            activeBlobUrls.push(blobUrl);
            const img = new Image();
            img.onload = () => {
              if (lastOsmZoomLevelRef.current !== osmZoom) return;
              osmCtx.drawImage(img, pxLeft, pyTop, drawW, drawH);
              osmTexture.needsUpdate = true;
              if (done === batch.length) runBatch();
            };
            img.onerror = () => {
              if (done === batch.length) runBatch();
            };
            img.src = blobUrl;
          });
        });
      };

      runBatch();
    };

    // Initial tile load — deferred to after globe is created below
    // cameraZToOsmZoom and drawOsmTiles stored in refs for animate loop access
    cameraZToOsmZoomRef.current = cameraZToOsmZoom;
    drawOsmTilesRef.current = drawOsmTiles;

    const globeMaterial = new THREE.MeshPhongMaterial({
      map: osmTexture,
      specular: new THREE.Color(0x1e3a5f),
      shininess: 6,
    });

    const globe = new THREE.Mesh(geometry, globeMaterial);
    const initRotX = initialCenter ? (-initialCenter.lat * Math.PI) / 180 : INDO_ROT_X;
    const initRotY = initialCenter ? ((270 - initialCenter.lng) * Math.PI) / 180 : INDO_ROT_Y;
    globe.rotation.y = initRotY;
    globe.rotation.x = initRotX;
    scene.add(globe);
    globeRef.current = globe;

    // Smooth pullback animation if transitioning from 2D street level
    if (initialCenter && camera) {
      const startTime = performance.now();
      const startZ = 1.45;
      const targetZ = 2.3;
      const duration = 750;
      const pullBackStep = (now: number) => {
        const elapsed = now - startTime;
        const p = Math.min(1, elapsed / duration);
        const ease = p * (2 - p);
        const curZ = startZ + (targetZ - startZ) * ease;
        if (cameraRef.current) {
          cameraRef.current.position.z = curZ;
          cameraRef.current.updateProjectionMatrix();
        }
        setZoom(curZ);
        if (p < 1) {
          requestAnimationFrame(pullBackStep);
        }
      };
      requestAnimationFrame(pullBackStep);
    }

    // Kick off initial tile fetch now that everything is wired up
    const initialOsmZoom = cameraZToOsmZoom(zoom);
    drawOsmTiles(initialOsmZoom);
    setIsTextureLoaded(true);

    // Groups attached directly to the globe so all markers rotate WITH the sphere automatically
    const markersGroup = new THREE.Group();
    globe.add(markersGroup);
    markersGroupRef.current = markersGroup;

    const tectonicGroup = new THREE.Group();
    globe.add(tectonicGroup);
    tectonicGroupRef.current = tectonicGroup;

    const routeGroup = new THREE.Group();
    globe.add(routeGroup);
    routeGroupRef.current = routeGroup;

    const userGroup = new THREE.Group();
    globe.add(userGroup);
    userGroupRef.current = userGroup;

    // Provincial Boundaries and Hierarchical Place Labels attached directly to globe
    const boundariesGroup = new THREE.Group();
    globe.add(boundariesGroup);
    boundariesGroupRef.current = boundariesGroup;

    // Atmospheric Glow Outer Shell
    const atmGeo = new THREE.SphereGeometry(radius * 1.018, 36, 36);
    const atmMat = new THREE.MeshPhongMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.15,
      side: THREE.FrontSide,
      depthWrite: false,
    });
    const atmosphere = new THREE.Mesh(atmGeo, atmMat);
    scene.add(atmosphere);
    atmosphereRef.current = atmosphere;

    // Live Atmospheric Clouds Layer (3D Weather in Harmony)
    const cloudsGeo = new THREE.SphereGeometry(radius * 1.008, 36, 36);
    const cloudsMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const clouds = new THREE.Mesh(cloudsGeo, cloudsMat);
    clouds.visible = false;
    globe.add(clouds);
    cloudsRef.current = clouds;

    // 3D Wind Flow Vector Field (Particle simulation around equator & jet streams)
    const windCount = 350;
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
    windPoints.visible = false;
    globe.add(windPoints);
    windParticlesRef.current = windPoints;
    windParticlesData.current = { velocities: windVelocities, lats: windLats, lngs: windLngs };

    // Starfield Backdrop (800 points in 1 single draw call for fast rendering)
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

    // Load Tectonic Plates fault lines once
    fetch('/data/tectonic-plates.json')
      .then((res) => res.json())
      .then((data) => {
        if (!data?.features || !tectonicGroupRef.current) return;
        const linePoints: THREE.Vector3[] = [];

        data.features.forEach((feat: any) => {
          const coords = feat.geometry?.coordinates;
          if (!coords) return;
          if (feat.geometry.type === 'LineString') {
            for (let i = 0; i < coords.length - 1; i++) {
              const p1 = latLngToVec3(coords[i][1], coords[i][0], 1.002);
              const p2 = latLngToVec3(coords[i + 1][1], coords[i + 1][0], 1.002);
              linePoints.push(p1, p2);
            }
          } else if (feat.geometry.type === 'MultiLineString') {
            coords.forEach((line: any[]) => {
              for (let i = 0; i < line.length - 1; i++) {
                const p1 = latLngToVec3(line[i][1], line[i][0], 1.002);
                const p2 = latLngToVec3(line[i + 1][1], line[i + 1][0], 1.002);
                linePoints.push(p1, p2);
              }
            });
          }
        });

        const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
        const lineMat = new THREE.LineBasicMaterial({
          color: 0xf97316,
          transparent: true,
          opacity: 0.85,
        });
        const segments = new THREE.LineSegments(lineGeo, lineMat);
        tectonicGroupRef.current.add(segments);
      })
      .catch((err) => {
        console.warn('Globe3D: Failed to load tectonic plates', err);
      });

    // ---------------------------------------------------------------------------
    // Load Indonesian Province Boundaries (/indonesia-kab.geojson)
    // ---------------------------------------------------------------------------
    fetch('/indonesia-kab.geojson')
      .then((res) => res.json())
      .then((data) => {
        if (!data?.features || !boundariesGroupRef.current) return;
        const linePoints: THREE.Vector3[] = [];

        data.features.forEach((feat: any) => {
          const geom = feat.geometry;
          if (!geom?.coordinates) return;

          const addRing = (ring: number[][]) => {
            for (let i = 0; i < ring.length - 1; i++) {
              const p1 = latLngToVec3(ring[i][1], ring[i][0], 1.003);
              const p2 = latLngToVec3(ring[i + 1][1], ring[i + 1][0], 1.003);
              linePoints.push(p1, p2);
            }
          };

          if (geom.type === 'Polygon') {
            geom.coordinates.forEach(addRing);
          } else if (geom.type === 'MultiPolygon') {
            geom.coordinates.forEach((poly: any[]) => poly.forEach(addRing));
          }
        });

        const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
        const lineMat = new THREE.LineBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.75,
        });
        boundariesMatRef.current = lineMat;
        const segments = new THREE.LineSegments(lineGeo, lineMat);
        boundariesGroupRef.current.add(segments);
      })
      .catch((err) => {
        console.warn('Globe3D: Failed to load province boundaries', err);
      });



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

    // Animation Loop with Smart Throttling
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);

      // 1. Globe Rotation & Inertia
      if (autoRotateRef.current && !isInteracting.current) {
        globe.rotation.y += 0.0018;
      } else if (!isInteracting.current) {
        rotationVelocity.current.x *= 0.90;
        rotationVelocity.current.y *= 0.90;
        globe.rotation.x += rotationVelocity.current.x;
        globe.rotation.y += rotationVelocity.current.y;
      }

      // Clamp vertical tilt
      globe.rotation.x = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, globe.rotation.x));
      atmosphere.rotation.copy(globe.rotation);

      // 2. Weather Dynamics in 3D
      if (cloudsRef.current && cloudsRef.current.visible) {
        cloudsRef.current.rotation.y += 0.0006;
      }

      if (windParticlesRef.current && windParticlesRef.current.visible && windParticlesData.current) {
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

      // 3. OSM Tile Map Update on Zoom (checked every 30 frames)
      osmFrameCounterRef.current++;
      if (osmFrameCounterRef.current % 30 === 0 && cameraZToOsmZoomRef.current && drawOsmTilesRef.current) {
        const neededOsmZoom = cameraZToOsmZoomRef.current(camera.position.z);
        if (neededOsmZoom !== lastOsmZoomLevelRef.current) {
          drawOsmTilesRef.current(neededOsmZoom);
        }
      }

      // 4. Dynamic Disaster Marker Scaling & Pulse Animation (Identical to 2D)
      if (markersGroupRef.current && camera) {
        const camPos = camera.position;
        const now = Date.now();
        const pulseCycle = (now % 2000) / 2000;
        const pulseOpacity = (1 - pulseCycle) * 0.85;

        if (quakeRedPulseMatRef.current) {
          quakeRedPulseMatRef.current.opacity = pulseOpacity;
        }
        if (quakeOrangePulseMatRef.current) {
          quakeOrangePulseMatRef.current.opacity = pulseOpacity;
        }

        const tempWorldPos = new THREE.Vector3();

        markersGroupRef.current.children.forEach((child) => {
          const sprite = child as THREE.Sprite;
          if (!(sprite as any).isSprite) return;

          sprite.getWorldPosition(tempWorldPos);

          // Horizon Culling: If marker is on the back hemisphere of the globe, hide it
          const dot = tempWorldPos.dot(camPos);
          if (dot < 0.12) {
            sprite.visible = false;
            return;
          }
          sprite.visible = true;

          const dist = camPos.distanceTo(tempWorldPos);
          const baseScale = sprite.userData?.baseScale || 1.0;
          const isPulseRing = sprite.userData?.isPulseRing;

          // Adaptive Zoom Scaling: Keeps apparent screen size (~22px - 34px)
          // across entire zoom range (z = 1.35 to 4.2)
          const baseZoomScale = Math.pow(dist, 0.82) * 0.038 * baseScale;

          if (isPulseRing) {
            const ringScale = baseZoomScale * (1.0 + pulseCycle * 1.8);
            sprite.scale.set(ringScale, ringScale, 1);
          } else {
            sprite.scale.set(baseZoomScale, baseZoomScale, 1);
          }
        });
      }

      // 4. Route Pins Zoom Adaptation
      if (routeGroupRef.current && camera) {
        const camPos = camera.position;
        const tempPos = new THREE.Vector3();
        routeGroupRef.current.children.forEach((child) => {
          const sprite = child as THREE.Sprite;
          if (!(sprite as any).isSprite) return;
          sprite.getWorldPosition(tempPos);
          if (tempPos.dot(camPos) < 0.12) {
            sprite.visible = false;
            return;
          }
          sprite.visible = true;
          const dist = camPos.distanceTo(tempPos);
          const s = Math.pow(dist, 0.82) * 0.038 * (sprite.userData?.baseScale || 1.0);
          sprite.scale.set(s, s, 1);
        });
      }



      // Boundary lines opacity adjusts with zoom
      if (boundariesMatRef.current && camera) {
        const camPos = camera.position;
        const currentZ = camPos.z;
        const isGlobal = currentZ > 2.7;
        const isRegional = currentZ > 1.95 && currentZ <= 2.7;
        boundariesMatRef.current.opacity = isGlobal ? 0.35 : (isRegional ? 0.65 : 0.85);
      }

      renderer.render(scene, camera);
    };
    animate();

    // ================= UNIVERSAL TOUCH & MOUSE GESTURE CONTROLS ================= //
    const dom = renderer.domElement;
    dom.style.touchAction = 'none';
    dom.style.userSelect = 'none';
    (dom.style as any).WebkitUserSelect = 'none';

    const getPointersCenter = () => {
      let sumX = 0;
      let sumY = 0;
      activePointers.current.forEach((p) => {
        sumX += p.x;
        sumY += p.y;
      });
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

      try {
        dom.setPointerCapture(e.pointerId);
      } catch (_) {}
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!activePointers.current.has(e.pointerId)) return;
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      const center = getPointersCenter();
      const dx = center.x - previousCenter.current.x;
      const dy = center.y - previousCenter.current.y;
      totalDragDist.current += Math.hypot(dx, dy);

      // Two-finger Pinch-to-Zoom (Mobile & Tablet)
      if (activePointers.current.size >= 2) {
        const currentPinch = getPinchDistance();
        if (currentPinch !== null && previousPinchDist.current !== null) {
          const deltaPinch = currentPinch - previousPinchDist.current;
          const zoomSpeed = 0.004;
          setZoom((prev) => {
            const next = prev - deltaPinch * zoomSpeed;
            if (next < 1.18 && deltaPinch > 0) {
              // Pinching to zoom in past the 3D limit — switch to 2D
              triggerSwitch2DRef.current();
              return 1.18;
            }
            const clamped = Math.max(1.18, Math.min(4.2, next));
            if (cameraRef.current) {
              cameraRef.current.position.z = clamped;
              cameraRef.current.updateProjectionMatrix();
            }
            return clamped;
          });
        }
        previousPinchDist.current = currentPinch;
      } else {
        // Single finger / mouse drag: Rotate globe smoothly
        const speed = 0.005;
        globe.rotation.y += dx * speed;
        globe.rotation.x += dy * speed;
        rotationVelocity.current.x = dy * speed;
        rotationVelocity.current.y = dx * speed;
      }

      previousCenter.current = center;
    };

    const onPointerUp = (e: PointerEvent) => {
      activePointers.current.delete(e.pointerId);
      try {
        dom.releasePointerCapture(e.pointerId);
      } catch (_) {}

      if (activePointers.current.size === 0) {
        isDragging.current = false;
        isInteracting.current = false;
        previousPinchDist.current = null;

        // If drag was very small, treat as a tap/click on marker
        if (totalDragDist.current < 8) {
          handleMarkerClick(e.clientX, e.clientY);
        }
      } else {
        previousCenter.current = getPointersCenter();
        previousPinchDist.current = getPinchDistance();
      }
    };

    const handleMarkerClick = (clientX: number, clientY: number) => {
      if (!mount || !cameraRef.current || clickableObjectsRef.current.length === 0) return;
      const rect = mount.getBoundingClientRect();
      mouseCoordsRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouseCoordsRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseCoordsRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(clickableObjectsRef.current, false);

      if (intersects.length > 0) {
        const topHit = intersects[0].object;
        if (topHit.userData?.marker) {
          setSelectedMarker(topHit.userData.marker);
        }
      }
    };

    // Wheel Zoom — scrolling inward past the minimum triggers 3D→2D transition
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.14 : -0.14;
      setZoom((prev) => {
        const next = prev + delta;
        if (next < 1.18 && delta < 0) {
          // User is zooming in — hand off to 2D map
          triggerSwitch2DRef.current();
          return 1.18;
        }
        const clamped = Math.max(1.18, Math.min(4.2, next));
        if (cameraRef.current) {
          cameraRef.current.position.z = clamped;
          cameraRef.current.updateProjectionMatrix();
        }
        return clamped;
      });
    };

    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('pointercancel', onPointerUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('pointercancel', onPointerUp);
      dom.removeEventListener('wheel', onWheel);
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

  // Tectonic & Boundary Layer Visibility Updates
  useEffect(() => {
    if (tectonicGroupRef.current) {
      tectonicGroupRef.current.visible = layerTectonic;
    }
  }, [layerTectonic]);

  useEffect(() => {
    if (boundariesGroupRef.current) {
      boundariesGroupRef.current.visible = layerBoundaries;
    }
  }, [layerBoundaries]);



  // ================= 3D NAVIGATION ROUTE LINE VISUALIZATION ================= //
  useEffect(() => {
    const routeGroup = routeGroupRef.current;
    if (!routeGroup) return;

    // Clear previous route
    while (routeGroup.children.length > 0) {
      const child = routeGroup.children[0] as THREE.Mesh;
      routeGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else (child.material as THREE.Material).dispose();
      }
    }

    if (!activeRouteCoords || activeRouteCoords.length < 2) return;

    // Draw glowing 3D polyline along the globe's surface
    const points: THREE.Vector3[] = [];
    activeRouteCoords.forEach(([lng, lat]) => {
      points.push(latLngToVec3(lat, lng, 1.005));
    });

    const routeGeo = new THREE.BufferGeometry().setFromPoints(points);
    const routeMat = new THREE.LineBasicMaterial({
      color: 0x06b6d4, // Neon cyan
      linewidth: 3,
      transparent: true,
      opacity: 0.95,
    });
    const routeLine = new THREE.Line(routeGeo, routeMat);
    routeGroup.add(routeLine);

    // Add origin and destination pins using camera-facing billboard sprites
    const startPt = points[0];
    const endPt = points[points.length - 1];

    const startMat = new THREE.SpriteMaterial({
      map: getRoutePinTexture('start'),
      depthTest: true,
      depthWrite: false,
      transparent: true,
    });
    const endMat = new THREE.SpriteMaterial({
      map: getRoutePinTexture('end'),
      depthTest: true,
      depthWrite: false,
      transparent: true,
    });

    const startPin = new THREE.Sprite(startMat);
    startPin.position.copy(startPt);
    startPin.userData = { isRoutePin: true, baseScale: 1.1 };
    routeGroup.add(startPin);

    const endPin = new THREE.Sprite(endMat);
    endPin.position.copy(endPt);
    endPin.userData = { isRoutePin: true, baseScale: 1.1 };
    routeGroup.add(endPin);
  }, [activeRouteCoords]);

  // ================= 3D USER REALTIME GPS PIN VISUALIZATION ================= //
  useEffect(() => {
    const userGroup = userGroupRef.current;
    if (!userGroup) return;

    while (userGroup.children.length > 0) {
      const child = userGroup.children[0] as THREE.Sprite;
      userGroup.remove(child);
      if (child.material) (child.material as THREE.Material).dispose();
    }

    if (!userCoords) return;

    const pinTex = getUserPinTexture();
    const pinMat = new THREE.SpriteMaterial({
      map: pinTex,
      depthTest: true,
      depthWrite: false,
      transparent: true,
    });
    const userSprite = new THREE.Sprite(pinMat);
    const pos = latLngToVec3(userCoords.lat, userCoords.lng, 1.008);
    userSprite.position.copy(pos);
    userSprite.scale.set(0.08, 0.08, 1);
    userGroup.add(userSprite);

    focusLocation(userCoords.lat, userCoords.lng);
  }, [userCoords?.lat, userCoords?.lng, focusLocation]);

  // ================= MARKER UPDATES (VOLCANOES, EARTHQUAKES, PEAKS) ================= //
  useEffect(() => {
    const group = markersGroupRef.current;
    if (!group) return;

    // Clear existing marker meshes & sprites
    while (group.children.length > 0) {
      const child = group.children[0] as THREE.Sprite;
      group.remove(child);
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else (child.material as THREE.Material).dispose();
      }
    }
    clickableObjectsRef.current = [];

    // Shared Sprite Materials for Performance (Clean memory & fast rendering)
    const activeVolcanoMat = new THREE.SpriteMaterial({
      map: getVolcanoActiveTexture(),
      depthTest: true,
      depthWrite: false,
      transparent: true,
    });

    const inactiveVolcanoMat = new THREE.SpriteMaterial({
      map: getVolcanoInactiveTexture(),
      depthTest: true,
      depthWrite: false,
      transparent: true,
    });

    const peakSpriteMat = new THREE.SpriteMaterial({
      map: getPeakTexture(),
      depthTest: true,
      depthWrite: false,
      transparent: true,
    });

    const quakeRedCoreMat = new THREE.SpriteMaterial({
      map: getQuakeCoreTexture(true),
      depthTest: true,
      depthWrite: false,
      transparent: true,
    });

    const quakeOrangeCoreMat = new THREE.SpriteMaterial({
      map: getQuakeCoreTexture(false),
      depthTest: true,
      depthWrite: false,
      transparent: true,
    });

    const quakeRedPulseMat = new THREE.SpriteMaterial({
      map: getQuakePulseTexture(true),
      depthTest: true,
      depthWrite: false,
      transparent: true,
      opacity: 0.8,
    });
    quakeRedPulseMatRef.current = quakeRedPulseMat;

    const quakeOrangePulseMat = new THREE.SpriteMaterial({
      map: getQuakePulseTexture(false),
      depthTest: true,
      depthWrite: false,
      transparent: true,
      opacity: 0.8,
    });
    quakeOrangePulseMatRef.current = quakeOrangePulseMat;

    // 1. Add Volcanoes (Upward triangles matching 2D RegularShape points:3, with white stroke)
    if (layerActiveVolcano || layerInactiveVolcano) {
      const volcanoes = mountains.filter((m) => m.type === 'volcano');
      volcanoes.forEach((m) => {
        if (isNaN(m.lat) || isNaN(m.lng)) return;
        const isActive = m.status === 'Active';
        if (isActive && !layerActiveVolcano) return;
        if (!isActive && !layerInactiveVolcano) return;

        const sprite = new THREE.Sprite(isActive ? activeVolcanoMat : inactiveVolcanoMat);
        const pos = latLngToVec3(m.lat, m.lng, 1.012);
        sprite.position.copy(pos);
        sprite.renderOrder = 10;
        sprite.userData = {
          baseScale: isActive ? 1.0 : 0.85,
          marker: {
            id: m.id,
            lat: m.lat,
            lng: m.lng,
            type: isActive ? 'volcano_active' : 'volcano_inactive',
            name: m.name,
            elevation: m.elevation,
            alertLevel: m.alertLevel || (isActive ? 'Level III (Siaga)' : 'Level II (Waspada)'),
            alertLevelCode: m.alertLevelCode || (isActive ? 3 : 2),
            dangerRadiusKm: m.dangerRadiusKm || 5.0,
            visualSummary: m.visualSummary,
            seismicitySummary: m.seismicitySummary,
            monitoringSource: m.monitoringSource || 'PVMBG Magma Indonesia',
          },
        };
        group.add(sprite);
        clickableObjectsRef.current.push(sprite);
      });
    }

    // 2. Add High Peaks (>2500m) (Slate upward triangles matching 2D)
    if (layerPeaks) {
      const highPeaks = mountains.filter((m) => m.type === 'peak' && parseFloat(m.elevation || '0') >= 2500);
      highPeaks.forEach((m) => {
        if (isNaN(m.lat) || isNaN(m.lng)) return;
        const sprite = new THREE.Sprite(peakSpriteMat);
        const pos = latLngToVec3(m.lat, m.lng, 1.011);
        sprite.position.copy(pos);
        sprite.renderOrder = 8;
        sprite.userData = {
          baseScale: 0.75,
          marker: {
            id: m.id,
            lat: m.lat,
            lng: m.lng,
            type: 'peak',
            name: m.name,
            elevation: m.elevation,
          },
        };
        group.add(sprite);
        clickableObjectsRef.current.push(sprite);
      });
    }

    // 3. Add Real-time Earthquakes (Center solid circle + animated concentric radar shockwave matching 2D)
    if (layerQuakes && quakes.length > 0) {
      quakes.forEach((q) => {
        if (isNaN(q.lat) || isNaN(q.lng)) return;
        const mag = q.mag ?? 3.5;
        const isMajor = mag >= 5.0;
        const magScale = Math.max(0.75, Math.min(1.4, mag / 4.2));

        const pos = latLngToVec3(q.lat, q.lng, 1.012);

        // Core Solid Marker
        const coreSprite = new THREE.Sprite(isMajor ? quakeRedCoreMat : quakeOrangeCoreMat);
        coreSprite.position.copy(pos);
        coreSprite.renderOrder = 10;
        coreSprite.userData = {
          baseScale: magScale,
          marker: q,
        };
        group.add(coreSprite);
        clickableObjectsRef.current.push(coreSprite);

        // Expanding Pulsing Radar Shockwave Ring (Animates smoothly in animate() loop)
        const pulseSprite = new THREE.Sprite(isMajor ? quakeRedPulseMat : quakeOrangePulseMat);
        pulseSprite.position.copy(pos);
        pulseSprite.renderOrder = 9;
        pulseSprite.userData = {
          isPulseRing: true,
          baseScale: magScale,
        };
        group.add(pulseSprite);
      });
    }

    // 4. Add Earth Sensor Registry Nodes (Global & Indonesia)
    if (layerEarthSensors) {
      GLOBAL_EARTH_SENSOR_NETWORK.forEach((sensor) => {
        const meta = SENSOR_FAMILY_META[sensor.family];
        const color = meta?.colorHex || '#0284c7';
        const mat = new THREE.SpriteMaterial({
          map: getSensorTexture(color),
          depthTest: true,
          depthWrite: false,
          transparent: true,
        });

        const sprite = new THREE.Sprite(mat);
        const pos = latLngToVec3(sensor.lat, sensor.lng, 1.012);
        sprite.position.copy(pos);
        sprite.renderOrder = 11;
        sprite.userData = {
          baseScale: 0.72,
          marker: {
            id: sensor.id,
            lat: sensor.lat,
            lng: sensor.lng,
            type: 'earth_sensor' as const,
            name: sensor.name,
            sensorData: sensor,
          },
        };
        group.add(sprite);
        clickableObjectsRef.current.push(sprite);
      });
    }
  }, [mountains, quakes, layerActiveVolcano, layerInactiveVolcano, layerPeaks, layerQuakes, layerEarthSensors]);

  return (
    <div 
      className="relative w-full h-full flex items-center justify-center bg-[radial-gradient(ellipse_at_50%_50%,_#091322_0%,_#020617_60%,_#000000_100%)] overflow-hidden select-none"
      style={{ touchAction: 'none' }}
    >
      {/* Three.js canvas mount */}
      <div 
        ref={mountRef} 
        className="w-full h-full" 
        style={{ 
          cursor: isDragging.current ? 'grabbing' : 'grab',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none'
        }} 
      />

      {/* 3D → 2D transition overlay — fades in when user zooms into the globe */}
      {switchingTo2D && (
        <div
          className="absolute inset-0 z-50 pointer-events-auto flex flex-col items-center justify-center animate-in fade-in duration-300"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, #0ea5e9 0%, #0369a1 40%, #020617 100%)' }}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="relative flex h-14 w-14 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-40" />
              <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-sky-500 shadow-xl shadow-sky-500/50">
                <Navigation className="h-7 w-7 text-white" style={{ transform: 'rotate(45deg)' }} />
              </span>
            </div>
            <p className="text-base font-bold text-white tracking-wide">Beralih ke Peta 2D…</p>
            <p className="text-xs text-sky-200/80">Membuka Street Map terinci</p>
          </div>
        </div>
      )}



      {/* Top HUD Center Pill */}
      <div className="pointer-events-none absolute top-16 right-4 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 z-20 hidden md:flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-xl border border-sky-500/40 text-[11px] font-bold text-sky-200 shadow-2xl animate-in fade-in duration-300">
        <Globe className={`w-3.5 h-3.5 text-sky-400 ${autoRotate ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
        <span>Bola Dunia 3D</span>
        <span className="text-[10px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded-md font-mono">
          {isTextureLoaded ? '60 FPS' : 'Memuat Tekstur...'}
        </span>
      </div>

      {/* 2D-Matched Disaster & Map Detail Legend */}
      <div className="pointer-events-none absolute bottom-4 left-6 z-20 hidden md:flex items-center gap-3 px-3.5 py-1.5 rounded-2xl bg-slate-900/85 backdrop-blur-xl border border-sky-500/30 text-[10px] text-slate-300 font-medium shadow-xl">
        <span className="flex items-center gap-1.5">
          <span className="w-0 h-0 border-l-[4.5px] border-l-transparent border-r-[4.5px] border-r-transparent border-b-[9px] border-b-red-500 inline-block drop-shadow-sm" />
          <span className="text-slate-200 font-bold">Gunung Api</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 border border-white"></span>
          </span>
          <span className="text-rose-300 font-semibold">Gempa Bumi</span>
        </span>
        <span className="flex items-center gap-1.5 text-sky-300">
          <span className="w-2.5 h-0.5 bg-sky-400 inline-block" />
          <span>Batas Provinsi</span>
        </span>
      </div>

      {/* Interactive Marker Details Floating Card */}
      {selectedMarker && (
        <div className="absolute top-20 right-6 z-30 w-80 p-4 rounded-3xl bg-slate-900/95 backdrop-blur-2xl border border-sky-500/30 text-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <button 
            onClick={() => setSelectedMarker(null)}
            className="absolute top-3 right-3 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            {selectedMarker.type.startsWith('volcano') && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-lg ${
                selectedMarker.alertLevel?.includes('Awas')
                  ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse'
                  : selectedMarker.alertLevel?.includes('Siaga')
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                <Flame className="w-3 h-3" />
                {selectedMarker.alertLevel || (selectedMarker.type === 'volcano_active' ? 'Gunung Api Aktif' : 'Gunung Waspada')}
              </span>
            )}
            {selectedMarker.type === 'earthquake' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40">
                <Activity className="w-3 h-3" />
                Gempa Bumi M {selectedMarker.mag?.toFixed(1) ?? '2.5+'}
              </span>
            )}
            {selectedMarker.type === 'peak' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-lg bg-slate-500/20 text-slate-300 border border-slate-500/40">
                <Mountain className="w-3 h-3" />
                Puncak Gunung
              </span>
            )}
            {selectedMarker.type === 'city' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/40">
                <MapPin className="w-3 h-3" />
                Kota & Kabupaten
              </span>
            )}
            {selectedMarker.type === 'province' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                <Globe className="w-3 h-3" />
                Provinsi Indonesia
              </span>
            )}
            {selectedMarker.type === 'island' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <Globe className="w-3 h-3" />
                Pulau / Wilayah
              </span>
            )}
            {selectedMarker.type === 'earth_sensor' && selectedMarker.sensorData && (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/40">
                <Radio className="w-3 h-3" />
                {SENSOR_FAMILY_META[selectedMarker.sensorData.family]?.name || 'Sensor Bumi'}
              </span>
            )}
          </div>

          <h3 className="text-base font-black text-slate-100 mb-1 leading-snug">
            {selectedMarker.name || selectedMarker.place || 'Titik Spasial'}
          </h3>

          {selectedMarker.type === 'earth_sensor' && selectedMarker.sensorData && (
            <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800 text-xs space-y-1.5 my-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Kode Stasiun:</span>
                <span className="font-mono font-bold text-white">{selectedMarker.sensorData.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Platform:</span>
                <span className="text-slate-300 font-semibold">{selectedMarker.sensorData.platform}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pengukuran Terkini:</span>
                <span className="text-sky-300 font-semibold">{selectedMarker.sensorData.currentValue}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Akurasi:</span>
                <span className="text-emerald-300 font-semibold">{selectedMarker.sensorData.accuracy}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pengelola:</span>
                <span className="text-slate-300">{selectedMarker.sensorData.provider}</span>
              </div>
              {onSelectSensor && (
                <button
                  onClick={() => onSelectSensor(selectedMarker.sensorData!)}
                  className="mt-2 w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-lg"
                >
                  🔍 Inspeksi Detail Sensor Lengkap
                </button>
              )}
            </div>
          )}

          {selectedMarker.visualSummary && (
            <p className="text-[11px] text-slate-300 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 mt-2 mb-2 leading-relaxed">
              {selectedMarker.visualSummary}
            </p>
          )}

          <div className="space-y-1.5 text-xs text-slate-300 mt-2 pb-2 border-b border-slate-800">
            {selectedMarker.elevation && (
              <div className="flex justify-between">
                <span className="text-slate-400">Ketinggian:</span>
                <span className="font-semibold text-slate-200">{selectedMarker.elevation} mdpl</span>
              </div>
            )}
            {selectedMarker.dangerRadiusKm && (
              <div className="flex justify-between text-rose-300 font-semibold">
                <span className="text-slate-400">Radius Bahaya:</span>
                <span>{selectedMarker.dangerRadiusKm} km</span>
              </div>
            )}
            {selectedMarker.depth !== undefined && (
              <div className="flex justify-between">
                <span className="text-slate-400">Kedalaman:</span>
                <span className="font-semibold text-slate-200">{selectedMarker.depth} km</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">Koordinat:</span>
              <span className="font-mono text-[11px] text-slate-300">
                {selectedMarker.lat.toFixed(3)}°, {selectedMarker.lng.toFixed(3)}°
              </span>
            </div>
            {selectedMarker.place && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Wilayah:</span>
                <span className="font-semibold text-slate-200">{selectedMarker.place}</span>
              </div>
            )}
            {selectedMarker.monitoringSource && (
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Sumber Pemantauan:</span>
                <span className="text-sky-300">{selectedMarker.monitoringSource}</span>
              </div>
            )}
          </div>

          {onSwitchTo2D && (
            <button
              onClick={() => onSwitchTo2D(selectedMarker.lat, selectedMarker.lng, 10)}
              className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-md shadow-sky-500/25"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Lihat di Peta Datar (2D)</span>
            </button>
          )}
        </div>
      )}

      {/* Layer Quick-Toggle Drawer */}
      {activeLayerPanel && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 p-3.5 rounded-3xl bg-slate-900/95 backdrop-blur-2xl border border-white/10 text-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 min-w-[280px]">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              Lapisan 3D Globe
            </span>
            <button 
              onClick={() => setActiveLayerPanel(false)}
              className="p-1 text-slate-400 hover:text-white rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 text-xs">
            <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                Gunung Api Aktif
              </span>
              <input 
                type="checkbox" 
                checked={layerActiveVolcano} 
                onChange={(e) => setLayerActiveVolcano(e.target.checked)} 
                className="rounded accent-sky-500"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Gunung Api Waspada
              </span>
              <input 
                type="checkbox" 
                checked={layerInactiveVolcano} 
                onChange={(e) => setLayerInactiveVolcano(e.target.checked)} 
                className="rounded accent-sky-500"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                Gempa Bumi USGS
              </span>
              <input 
                type="checkbox" 
                checked={layerQuakes} 
                onChange={(e) => setLayerQuakes(e.target.checked)} 
                className="rounded accent-sky-500"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                Earth Sensor Registry
              </span>
              <input 
                type="checkbox" 
                checked={layerEarthSensors} 
                onChange={(e) => setLayerEarthSensors(e.target.checked)} 
                className="rounded accent-sky-500"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                Lempeng Tektonik (Fault Lines)
              </span>
              <input 
                type="checkbox" 
                checked={layerTectonic} 
                onChange={(e) => setLayerTectonic(e.target.checked)} 
                className="rounded accent-sky-500"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                Puncak Utama (&gt;2500m)
              </span>
              <input 
                type="checkbox" 
                checked={layerPeaks} 
                onChange={(e) => setLayerPeaks(e.target.checked)} 
                className="rounded accent-sky-500"
              />
            </label>
          </div>
        </div>
      )}

      {/* Primary Floating Controls Dock */}
      <div 
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/85 backdrop-blur-2xl border border-white/15 shadow-2xl"
      >
        {/* Zoom Out */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleZoom('out'); }}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 hover:bg-white/15 text-white transition-all active:scale-95"
          title="Perkecil Bola Dunia (Zoom Out)"
        >
          <ZoomOut className="h-4 w-4" />
        </button>

        {/* Zoom In */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleZoom('in'); }}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 hover:bg-white/15 text-white transition-all active:scale-95"
          title="Perbesar / Beralih ke 2D (Zoom In)"
        >
          <ZoomIn className="h-4 w-4" />
        </button>

        <div className="w-[1px] h-5 bg-white/15 mx-0.5 shrink-0" />

        {/* Rotate Left (-45°) */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); rotateGlobeBy(-45); }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 hover:bg-white/15 text-white transition-all active:scale-95"
          title="Putar ke Kiri (-45°)"
          aria-label="Putar kiri"
        >
          <RotateCcw className="h-3.5 w-3.5 text-slate-300" />
        </button>

        {/* Focus Indonesia Button */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); focusIndonesia(); }}
          className="flex items-center gap-1.5 px-3 h-9 shrink-0 rounded-xl bg-gradient-to-r from-sky-500/20 to-indigo-500/20 hover:from-sky-500/30 hover:to-indigo-500/30 text-sky-200 border border-sky-500/30 font-bold text-xs transition-all active:scale-95"
          title="Pusatkan Bola Dunia ke Indonesia"
        >
          <Compass className="h-3.5 w-3.5 text-sky-400" />
          <span className="hidden sm:inline">Indonesia</span>
        </button>

        {/* Rotate Right (+45°) */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); rotateGlobeBy(45); }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 hover:bg-white/15 text-white transition-all active:scale-95"
          title="Putar ke Kanan (+45°)"
          aria-label="Putar kanan"
        >
          <RotateCw className="h-3.5 w-3.5 text-slate-300" />
        </button>

        {/* Auto Rotate Toggle */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setAutoRotate((p) => !p); }}
          className={`flex items-center gap-1.5 px-3 h-9 shrink-0 rounded-xl font-bold text-xs transition-all active:scale-95 ${
            autoRotate
              ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/30'
              : 'bg-white/5 text-slate-300 hover:bg-white/15'
          }`}
          title={autoRotate ? 'Hentikan Putaran 360°' : 'Putar 360° Otomatis'}
        >
          {autoRotate ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          <span>{autoRotate ? 'Berhenti' : '360°'}</span>
        </button>

        <div className="w-[1px] h-5 bg-white/15 mx-0.5 shrink-0" />

        {/* 3D Weather Overlay Selector (Windy in 3D) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const modes: ('satellite' | 'wind' | 'clouds' | 'rain')[] = ['satellite', 'wind', 'clouds', 'rain'];
            const nextIdx = (modes.indexOf(weatherOverlay3D as any) + 1) % modes.length;
            setWeatherOverlay3D(modes[nextIdx]);
          }}
          className={`flex items-center gap-1.5 px-2.5 h-9 rounded-xl font-bold text-xs transition-all active:scale-95 ${
            weatherOverlay3D !== 'satellite'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
              : 'bg-white/5 text-slate-300 hover:bg-white/15'
          }`}
          title="Ganti Mode Visual Cuaca 3D"
        >
          {weatherOverlay3D === 'wind' && <Wind className="h-3.5 w-3.5 text-teal-400" />}
          {weatherOverlay3D === 'clouds' && <Cloud className="h-3.5 w-3.5 text-sky-400" />}
          {weatherOverlay3D === 'rain' && <CloudRain className="h-3.5 w-3.5 text-blue-400" />}
          {weatherOverlay3D === 'satellite' && <Globe className="h-3.5 w-3.5 text-slate-400" />}
          <span className="hidden sm:inline capitalize">{weatherOverlay3D === 'satellite' ? 'Cuaca 3D' : weatherOverlay3D}</span>
        </button>

        {/* Toggle Layers Panel Button */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setActiveLayerPanel((p) => !p); }}
          className={`flex items-center gap-1.5 px-2.5 h-9 rounded-xl font-bold text-xs transition-all active:scale-95 ${
            activeLayerPanel
              ? 'bg-white text-slate-900'
              : 'bg-white/5 text-slate-300 hover:bg-white/15'
          }`}
          title="Buka Menu Lapisan Peta"
        >
          <Layers className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Lapisan</span>
        </button>
      </div>
    </div>
  );
}
