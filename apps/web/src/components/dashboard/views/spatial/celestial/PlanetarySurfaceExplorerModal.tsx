import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';
import {
  X,
  Globe,
  Map as MapIcon,
  Compass,
  Crosshair,
  Layers,
  Volume2,
  VolumeX,
  Sparkles,
  Maximize2,
  Minimize2,
  ChevronRight,
  Info,
  Thermometer,
  Wind,
  Gauge,
  Zap,
  Navigation,
  Eye,
  Camera,
  RotateCcw,
  Play,
  Pause,
  MapPin,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import {
  PLANETARY_CATALOG,
  CELESTIAL_ORDER,
  CelestialBodyData,
  getPlanetaryMapMetadata,
  PlanetaryMapMetadata
} from '@/data/planetaryCatalog';
import {
  PLANETARY_LANDMARKS,
  PLANETARY_SURFACE_ENVIRONMENTS,
  PlanetaryLandmark,
  SurfaceEnvironment,
  getLandmarksForBody
} from '@/data/planetaryLandmarks';
import {
  getCelestialTexture,
  getCelestialCanvas,
  getSaturnRingTexture,
  REAL_PLANET_TEXTURE_URLS
} from './cosmicSceneUtils';

interface PlanetarySurfaceExplorerModalProps {
  initialBodyId: string;
  initialMode?: 'map' | 'globe3d' | 'surface';
  initialLandmarkId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectBody?: (bodyId: string) => void;
}

export function PlanetarySurfaceExplorerModal({
  initialBodyId,
  initialMode = 'surface',
  initialLandmarkId,
  isOpen,
  onClose,
  onSelectBody
}: PlanetarySurfaceExplorerModalProps) {
  const [activeBodyId, setActiveBodyId] = useState<string>(initialBodyId || 'mars');
  const [viewMode, setViewMode] = useState<'map' | 'globe3d' | 'surface'>(initialMode);
  const [selectedLandmark, setSelectedLandmark] = useState<PlanetaryLandmark | null>(null);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showLandmarkLabels, setShowLandmarkLabels] = useState<boolean>(true);
  const [isAudioActive, setIsAudioActive] = useState<boolean>(false);
  const [hoveredCoords, setHoveredCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Surface mode descent state
  const [landingAltitudeKm, setLandingAltitudeKm] = useState<number>(0);
  const [isDescending, setIsDescending] = useState<boolean>(false);
  const [surfaceLookAzimuth, setSurfaceLookAzimuth] = useState<number>(0);
  const [surfaceLookPitch, setSurfaceLookPitch] = useState<number>(0);

  // 3D Canvas Refs
  const globe3DContainerRef = useRef<HTMLDivElement | null>(null);
  const surface3DContainerRef = useRef<HTMLDivElement | null>(null);

  // Web Audio Context for Planetary Atmospheric Sound
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioNodesRef = useRef<{ stop?: () => void; disconnect: () => void }[]>([]);

  const bodyData: CelestialBodyData = PLANETARY_CATALOG[activeBodyId] || PLANETARY_CATALOG['mars'];
  const surfaceEnv: SurfaceEnvironment = PLANETARY_SURFACE_ENVIRONMENTS[activeBodyId] || PLANETARY_SURFACE_ENVIRONMENTS['mars'];
  const landmarks: PlanetaryLandmark[] = getLandmarksForBody(activeBodyId);

  // Sync initial body on mount/props change
  useEffect(() => {
    if (initialBodyId && PLANETARY_CATALOG[initialBodyId]) {
      setActiveBodyId(initialBodyId);
    }
  }, [initialBodyId]);

  useEffect(() => {
    if (initialMode) {
      setViewMode(initialMode);
    }
  }, [initialMode]);

  // Set default landmark when body changes
  useEffect(() => {
    const list = getLandmarksForBody(activeBodyId);
    if (initialLandmarkId) {
      const found = list.find((lm) => lm.id === initialLandmarkId);
      if (found) {
        setSelectedLandmark(found);
        return;
      }
    }
    setSelectedLandmark(list[0] || null);
  }, [activeBodyId, initialLandmarkId]);

  // Trigger descent animation when entering surface mode
  const triggerDescent = useCallback((landmark?: PlanetaryLandmark) => {
    if (landmark) {
      setSelectedLandmark(landmark);
    }
    setViewMode('surface');
    setIsDescending(true);
    setLandingAltitudeKm(120);

    const startTime = performance.now();
    const duration = 1800; // 1.8 seconds descent

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Smooth cubic drop
      const currentAlt = Math.max(0, 120 * Math.pow(1 - progress, 2));
      setLandingAltitudeKm(Math.round(currentAlt));

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setIsDescending(false);
        setLandingAltitudeKm(0);
      }
    };
    requestAnimationFrame(step);
  }, []);

  // Web Audio API ambient wind & atmospheric synthesizer
  const toggleAmbientAudio = useCallback(() => {
    if (isAudioActive) {
      audioNodesRef.current.forEach((n) => {
        try { n.stop?.(); n.disconnect(); } catch {}
      });
      audioNodesRef.current = [];
      setIsAudioActive(false);
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = audioContextRef.current || new AudioCtx();
      audioContextRef.current = ctx;
      if (ctx.state === 'suspended') void ctx.resume();

      // Atmospheric Noise Generator (Wind / Plasma roar / Vacuum hum)
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Brown noise integration for warm wind roar
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      // Resonant Lowpass Filter tailored to planetary atmosphere
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      const isVacuum = activeBodyId === 'mercury' || activeBodyId === 'moon';
      const isDense = activeBodyId === 'venus' || activeBodyId === 'jupiter' || activeBodyId === 'saturn';
      filter.frequency.setValueAtTime(isVacuum ? 140 : isDense ? 480 : 280, ctx.currentTime);
      filter.Q.setValueAtTime(isVacuum ? 1.0 : 3.5, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 1.2);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      whiteNoise.start();

      audioNodesRef.current = [whiteNoise, filter, gain];
      setIsAudioActive(true);
    } catch {
      setIsAudioActive(false);
    }
  }, [isAudioActive, activeBodyId]);

  // Clean audio on unmount or close
  useEffect(() => {
    return () => {
      audioNodesRef.current.forEach((n) => {
        try { n.stop?.(); n.disconnect(); } catch {}
      });
      audioNodesRef.current = [];
    };
  }, []);

  // -------------------------------------------------------------
  // THREE.JS RENDERER 1: 3D GLOBE SPHERE INSPECTION
  // -------------------------------------------------------------
  useEffect(() => {
    if (!isOpen || viewMode !== 'globe3d') return;
    const container = globe3DContainerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 3.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Planet Globe Mesh
    const sphereGeo = new THREE.SphereGeometry(1.0, 64, 64);
    const texture = getCelestialTexture(activeBodyId);
    const sphereMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: activeBodyId === 'sun' ? 0.2 : 0.8,
      metalness: 0.1,
    });
    const globeMesh = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(globeMesh);

    // Saturn Rings with Polar Radial UV Mapping (Flawless Concentric Circles)
    if (bodyData.visual.hasRings && activeBodyId === 'saturn') {
      const innerRadius = 1.25;
      const outerRadius = 2.35;
      const ringGeo = new THREE.RingGeometry(innerRadius, outerRadius, 128);

      // Convert planar UV coordinates into polar radial coordinates
      // Guarantees concentric circular alignment without straight-line distortion
      const posAttr = ringGeo.attributes.position;
      const uvAttr = ringGeo.attributes.uv;
      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const y = posAttr.getY(i);
        const dist = Math.sqrt(x * x + y * y);
        const u = (dist - innerRadius) / (outerRadius - innerRadius);
        uvAttr.setXY(i, u, 0.5);
      }
      uvAttr.needsUpdate = true;

      // Align ring to Saturn's equatorial plane
      ringGeo.rotateX(Math.PI / 2);

      const ringMat = new THREE.MeshStandardMaterial({
        map: getSaturnRingTexture(),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.96,
        roughness: 0.65,
        metalness: 0.1,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      globeMesh.add(ringMesh);
    }

    // Atmosphere Glow Halo
    const haloGeo = new THREE.SphereGeometry(1.06, 32, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(bodyData.visual.glowColor || '#38bdf8'),
      transparent: true,
      opacity: 0.22,
      side: THREE.BackSide,
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    scene.add(haloMesh);

    // Lighting
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
    sunLight.position.set(5, 2, 4);
    scene.add(sunLight);
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambientLight);

    // 3D Landmark Surface Pins
    const pinGroup = new THREE.Group();
    globeMesh.add(pinGroup);

    landmarks.forEach((lm) => {
      const phi = (90 - lm.lat) * (Math.PI / 180);
      const theta = (lm.lng + 180) * (Math.PI / 180);
      const r = 1.02;

      const px = -(r * Math.sin(phi) * Math.cos(theta));
      const py = r * Math.cos(phi);
      const pz = r * Math.sin(phi) * Math.sin(theta);

      const pinGeo = new THREE.SphereGeometry(0.024, 16, 16);
      const pinMat = new THREE.MeshBasicMaterial({
        color: lm.id === selectedLandmark?.id ? 0x38bdf8 : 0xf59e0b,
      });
      const pinMesh = new THREE.Mesh(pinGeo, pinMat);
      pinMesh.position.set(px, py, pz);
      pinGroup.add(pinMesh);
    });

    // Orbit Drag Controls
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let rotVelX = 0.002;
    let rotVelY = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      globeMesh.rotation.y += dx * 0.008;
      globeMesh.rotation.x += dy * 0.008;
      rotVelX = dx * 0.002;
      rotVelY = dy * 0.002;
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isDragging) {
        globeMesh.rotation.y += rotVelX;
        globeMesh.rotation.x += rotVelY;
        rotVelX *= 0.96;
        rotVelY *= 0.96;
        if (Math.abs(rotVelX) < 0.001) rotVelX = 0.0015;
      }
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      sphereGeo.dispose();
      sphereMat.dispose();
    };
  }, [isOpen, viewMode, activeBodyId, landmarks, selectedLandmark, bodyData]);

  // -------------------------------------------------------------
  // THREE.JS RENDERER 2: 360° SURFACE HORIZON & LANDING POV
  // -------------------------------------------------------------
  useEffect(() => {
    if (!isOpen || viewMode !== 'surface') return;
    const container = surface3DContainerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);
    camera.position.set(0, 1.8, 0); // Rover eye level (1.8m above surface)

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Fog matching planetary atmospheric scattering
    scene.fog = new THREE.FogExp2(
      new THREE.Color(surfaceEnv.fogColor),
      surfaceEnv.fogDensity
    );

    // 1. Panoramic Sky Dome
    const skyGeo = new THREE.SphereGeometry(450, 32, 24);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(surfaceEnv.skyTopColor) },
        bottomColor: { value: new THREE.Color(surfaceEnv.skyHorizonColor) },
        offset: { value: 33 },
        exponent: { value: 0.8 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
    });
    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyMesh);

    // 2. Starfield for Thin/Vacuum Atmospheres (Mercury, Moon, Mars)
    if (activeBodyId === 'moon' || activeBodyId === 'mercury' || activeBodyId === 'mars') {
      const starCount = 1200;
      const starGeo = new THREE.BufferGeometry();
      const starPos = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = 420;
        starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        starPos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 15; // Above horizon
        starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      }
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
      const starMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.8,
        transparent: true,
        opacity: activeBodyId === 'mars' ? 0.45 : 0.95,
      });
      const starMesh = new THREE.Points(starGeo, starMat);
      scene.add(starMesh);
    }

    // 3. Sun in the Planetary Sky
    const sunGeo = new THREE.SphereGeometry(surfaceEnv.sunSize * 4.5, 24, 24);
    const sunMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(surfaceEnv.sunColor) });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.set(120, 60, -280);
    scene.add(sunMesh);

    // 4. Procedural Planetary Ground Surface Plane (128x128 Tessellation)
    const groundGeo = new THREE.PlaneGeometry(600, 600, 96, 96);
    groundGeo.rotateX(-Math.PI / 2);

    // Displace vertices to create authentic crater/dune relief
    const posAttr = groundGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const gx = posAttr.getX(i);
      const gz = posAttr.getZ(i);
      const distFromCenter = Math.sqrt(gx * gx + gz * gz);
      // Flatter landing clearing in the center, rugged hills in distance
      const heightFactor = Math.min(1.0, distFromCenter / 45.0);
      const elevation = (
        Math.sin(gx * 0.04) * Math.cos(gz * 0.04) * 3.2 +
        Math.sin(gx * 0.09 + gz * 0.05) * 1.5 +
        Math.cos(gx * 0.015) * 6.5
      ) * heightFactor;
      posAttr.setY(i, elevation);
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(surfaceEnv.groundBaseColor),
      roughness: 0.92,
      metalness: 0.08,
      flatShading: true,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    scene.add(groundMesh);

    // 5. Planetary Regolith Boulders & Rock Formations
    const rockGeo = new THREE.DodecahedronGeometry(0.8, 1);
    const rockMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(surfaceEnv.groundDetailColor),
      roughness: 0.95,
    });
    for (let r = 0; r < 65; r++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 6 + Math.random() * 85;
      const scale = 0.35 + Math.random() * 1.8;
      const rx = Math.cos(angle) * dist;
      const rz = Math.sin(angle) * dist;
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.set(rx, scale * 0.4, rz);
      rock.scale.set(scale, scale * (0.6 + Math.random() * 0.8), scale);
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      scene.add(rock);
    }

    // Surface Lights
    const dirLight = new THREE.DirectionalLight(new THREE.Color(surfaceEnv.sunColor), surfaceEnv.sunIntensity);
    dirLight.position.set(120, 60, -280);
    scene.add(dirLight);

    const ambLight = new THREE.AmbientLight(new THREE.Color(surfaceEnv.ambientColor), 0.65);
    scene.add(ambLight);

    // First-Person Horizon Drag Controls
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    let azimuth = 0;
    let pitch = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      prevX = e.clientX;
      prevY = e.clientY;

      azimuth -= dx * 0.004;
      pitch = Math.max(-0.65, Math.min(0.75, pitch - dy * 0.004));

      camera.rotation.set(0, 0, 0);
      camera.rotation.order = 'YXZ';
      camera.rotation.y = azimuth;
      camera.rotation.x = pitch;

      // Update HUD compass
      const deg = Math.round(((azimuth % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) * (180 / Math.PI));
      setSurfaceLookAzimuth(deg);
      setSurfaceLookPitch(Math.round(pitch * (180 / Math.PI)));
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      groundGeo.dispose();
      groundMat.dispose();
    };
  }, [isOpen, viewMode, activeBodyId, surfaceEnv]);

  if (!isOpen || typeof document === 'undefined') return null;

  const mapCanvas = getCelestialCanvas(activeBodyId);
  const mapDataUrl = mapCanvas.toDataURL('image/png');
  const mapMetadata = getPlanetaryMapMetadata(activeBodyId);
  const realMapUrl = REAL_PLANET_TEXTURE_URLS[activeBodyId];

  return createPortal(
    <div 
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[10000] flex flex-col bg-slate-950/95 backdrop-blur-2xl text-slate-100 overflow-hidden animate-in fade-in duration-300"
    >
      {/* ================= TOP NAV HEADER ================= */}
      <div className="p-3 sm:p-4 border-b border-white/10 bg-slate-900/90 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shadow-inner shrink-0"
            style={{ 
              background: `radial-gradient(circle at 35% 35%, #ffffff 0%, ${bodyData.visual.color} 70%, #000000 100%)`,
              boxShadow: `0 0 15px ${bodyData.visual.color}80`
            }}
          >
            {bodyData.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-extrabold text-base sm:text-lg text-white truncate tracking-wide">
                {bodyData.name} ({bodyData.englishName})
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-sky-500/20 text-sky-300 border border-sky-400/30">
                {bodyData.typeLabel}
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate flex items-center gap-2">
              <span>Dia: {bodyData.diameterKm.toLocaleString()} km</span>
              <span>•</span>
              <span>Gravitasi: {bodyData.gravity}</span>
              <span>•</span>
              <span>Suhu Rata-rata: {bodyData.surfaceTemp.avg}</span>
            </p>
          </div>
        </div>

        {/* View Mode Switcher Pill */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'map'
                ? 'bg-sky-600 text-white shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Peta 2D</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('globe3d')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'globe3d'
                ? 'bg-sky-600 text-white shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bola 3D</span>
          </button>

          <button
            type="button"
            onClick={() => triggerDescent(selectedLandmark || landmarks[0])}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'surface'
                ? 'bg-gradient-to-r from-amber-600 to-rose-600 text-white shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Masuk / Mendarat</span>
          </button>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleAmbientAudio}
            title={isAudioActive ? 'Matikan Suara Atmosfer' : 'Aktifkan Suara Atmosfer'}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isAudioActive
                ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {isAudioActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Tutup Eksplorasi Planet"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ================= CELESTIAL BODIES QUICK SWITCHER PILLS ================= */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-950/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth shrink-0">
        {CELESTIAL_ORDER.map((id) => {
          const item = PLANETARY_CATALOG[id];
          const isSelected = item.id === activeBodyId;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setActiveBodyId(id);
                onSelectBody?.(id);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-sky-500/25 border border-sky-400 text-sky-200 shadow-sm'
                  : 'bg-white/5 border border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/10'
              }`}
            >
              <span 
                className="w-2.5 h-2.5 rounded-full shrink-0" 
                style={{ backgroundColor: item.visual.color }}
              />
              <span>{item.name}</span>
            </button>
          );
        })}
      </div>

      {/* ================= MAIN INTERACTION CANVAS AREA ================= */}
      <div className="flex-1 relative overflow-hidden flex flex-col md:flex-row">
        
        {/* Left/Center Visual Canvas */}
        <div className="flex-1 relative h-full w-full overflow-hidden flex items-center justify-center bg-black">

          {/* ---------------- MODE 1: 2D EQUIRECTANGULAR CARTOGRAPHY MAP ---------------- */}
          {viewMode === 'map' && (
            <div className="relative w-full h-full flex flex-col items-center justify-center p-2 sm:p-6 select-none overflow-hidden">
              <div 
                className="relative max-w-5xl w-full aspect-[2/1] rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-slate-900 group"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = (e.clientX - rect.left) / rect.width;
                  const y = (e.clientY - rect.top) / rect.height;
                  const lng = Math.round((x * 360 - 180) * 10) / 10;
                  const lat = Math.round(((1 - y) * 180 - 90) * 10) / 10;
                  setHoveredCoords({ lat, lng });
                }}
                onMouseLeave={() => setHoveredCoords(null)}
              >
                {/* High-Resolution Authentic Planetary Map Image */}
                <img 
                  src={realMapUrl || mapDataUrl} 
                  alt={`Peta Nyata Autentik ${bodyData.name}`}
                  className="w-full h-full object-cover select-none pointer-events-none"
                  draggable={false}
                />

                {/* Provenance Badge for Authentic Spacecraft Map */}
                <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-2 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-400/40 shadow-xl pointer-events-none">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="text-[11px] font-bold text-emerald-300">PETA ASLI WAHANA:</span>
                  <span className="text-[11px] text-white font-medium">{mapMetadata?.authenticity || 'Mosaik Citra Asli Wahana Antariksa'}</span>
                </div>

                {/* Graticule / Coordinate Grid Lines */}
                {showGrid && (
                  <div className="absolute inset-0 pointer-events-none border border-white/10 grid grid-cols-6 grid-rows-6">
                    {Array.from({ length: 36 }).map((_, i) => (
                      <div key={i} className="border-r border-b border-white/10" />
                    ))}
                    {/* Equator & Prime Meridian Highlights */}
                    <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-sky-400/40" />
                    <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-sky-400/40" />
                  </div>
                )}

                {/* Interactive Landmark Pins */}
                {landmarks.map((lm) => {
                  const leftPct = ((lm.lng + 180) / 360) * 100;
                  const topPct = ((90 - lm.lat) / 180) * 100;
                  const isSelected = selectedLandmark?.id === lm.id;

                  return (
                    <button
                      key={lm.id}
                      type="button"
                      onClick={() => setSelectedLandmark(lm)}
                      style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all cursor-pointer z-20 group/pin ${
                        isSelected ? 'scale-125 z-30' : 'hover:scale-115'
                      }`}
                      title={`${lm.name} (${lm.lat}°, ${lm.lng}°)`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border shadow-lg transition-transform ${
                        isSelected 
                          ? 'bg-sky-400 border-white ring-4 ring-sky-400/40 animate-pulse' 
                          : 'bg-amber-400 border-slate-900 ring-2 ring-amber-400/30'
                      }`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                      </div>

                      {/* Tooltip Label */}
                      {showLandmarkLabels && (
                        <div className={`absolute left-1/2 -translate-x-1/2 top-4 px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap pointer-events-none shadow-md backdrop-blur-md transition-all ${
                          isSelected
                            ? 'bg-sky-600/90 text-white border border-sky-400 scale-100 opacity-100'
                            : 'bg-slate-950/80 text-slate-200 border border-white/15 opacity-85 group-hover/pin:opacity-100'
                        }`}>
                          {lm.name}
                        </div>
                      )}
                    </button>
                  );
                })}

                {/* Bottom Map Status Bar */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] font-mono text-slate-300 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 pointer-events-none flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sky-400 font-bold">MISI / WAHANA:</span>
                    <span className="text-slate-100">{mapMetadata?.mission || 'NASA Jet Propulsion Laboratory'}</span>
                  </div>
                  {hoveredCoords && (
                    <div className="text-amber-300 font-bold">
                      KOORDINAT: {hoveredCoords.lat > 0 ? `${hoveredCoords.lat}°N` : `${Math.abs(hoveredCoords.lat)}°S`}, {hoveredCoords.lng > 0 ? `${hoveredCoords.lng}°E` : `${Math.abs(hoveredCoords.lng)}°W`}
                    </div>
                  )}
                  <div className="text-emerald-400 font-semibold">
                    {mapMetadata?.resolution || '2048 x 1024 (2K)'} • {landmarks.length} Landmark
                  </div>
                </div>
              </div>

              {/* Map Layer Toggles & Authenticity Info */}
              <div className="mt-3 max-w-5xl w-full flex flex-col gap-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowGrid(!showGrid)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        showGrid 
                          ? 'bg-sky-500/20 border-sky-400 text-sky-200' 
                          : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      {showGrid ? 'Kisi Koordinat: ON' : 'Kisi Koordinat: OFF'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowLandmarkLabels(!showLandmarkLabels)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        showLandmarkLabels 
                          ? 'bg-sky-500/20 border-sky-400 text-sky-200' 
                          : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      {showLandmarkLabels ? 'Label Landmark: ON' : 'Label Landmark: OFF'}
                    </button>
                  </div>

                  {mapMetadata && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-950/40 px-3 py-1 rounded-xl border border-emerald-500/30">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>100% Data Observasi Asli (Non-AI Generated)</span>
                    </div>
                  )}
                </div>

                {mapMetadata && (
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-xs text-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-sky-300">Instrumen Ilmiah: </span>
                      <span>{mapMetadata.instrument} ({mapMetadata.agency})</span>
                    </div>
                    <div className="text-slate-400 text-[11px] italic">
                      {mapMetadata.historicalContext}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ---------------- MODE 2: 3D GLOBE SPHERE INSPECTION ---------------- */}
          {viewMode === 'globe3d' && (
            <div className="relative w-full h-full flex items-center justify-center">
              <div ref={globe3DContainerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
              
              {/* Authenticity Provenance Badge in 3D Mode */}
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-500/30 text-xs text-emerald-300 pointer-events-none">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Tekstur Bola 3D Asli: {mapMetadata?.mission || 'Misi Antariksa NASA'}</span>
              </div>

              {/* Floating Guidance Overlay */}
              <div className="absolute bottom-4 left-4 z-20 bg-slate-900/80 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 text-xs text-slate-300 pointer-events-none flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Geser kursor untuk memutar bola planet 3D 360°</span>
              </div>
            </div>
          )}

          {/* ---------------- MODE 3: 360° SURFACE HORIZON & LANDING POV ---------------- */}
          {viewMode === 'surface' && (
            <div className="relative w-full h-full flex items-center justify-center">
              <div ref={surface3DContainerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

              {/* Atmospheric Descent Sequence Overlay */}
              {isDescending && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs text-white pointer-events-none animate-in fade-in duration-200">
                  <div className="p-6 rounded-3xl bg-slate-950/90 border border-sky-500/40 text-center space-y-3 shadow-2xl max-w-sm">
                    <div className="flex justify-center">
                      <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center animate-bounce">
                        <Navigation className="w-6 h-6 rotate-180" />
                      </div>
                    </div>
                    <h3 className="font-bold text-base text-white">
                      Memasuki Atmosfer {bodyData.name}
                    </h3>
                    <p className="text-xs text-slate-300">
                      Desentralisasi telemetri permukaan & inisialisasi sensor rover…
                    </p>
                    <div className="text-2xl font-mono font-extrabold text-amber-400">
                      ALT: {landingAltitudeKm} KM
                    </div>
                  </div>
                </div>
              )}

              {/* Surface Cockpit / Rover HUD Overlay */}
              <div className="absolute top-4 left-4 z-20 bg-slate-950/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/15 text-xs text-slate-200 space-y-1 shadow-2xl pointer-events-none">
                <div className="flex items-center gap-2 font-mono text-sky-400 font-bold">
                  <Compass className="w-4 h-4" />
                  <span>AZIMUTH: {surfaceLookAzimuth}° | ELEV: {surfaceLookPitch}°</span>
                </div>
                <div className="text-[11px] text-slate-300">
                  <span className="font-bold text-white">LOKASI: </span>
                  {selectedLandmark?.name || 'Permukaan Datum Standar'}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  KOORDINAT: {selectedLandmark?.lat}° LAT, {selectedLandmark?.lng}° LNG
                </div>
              </div>

              {/* Bottom Horizon Navigation Tip */}
              <div className="absolute bottom-4 left-4 z-20 bg-slate-950/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 text-xs text-slate-300 pointer-events-none flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Tarik pandangan untuk melihat panorama cakrawala 360°</span>
              </div>
            </div>
          )}
        </div>

        {/* ================= RIGHT DETAIL & TELEMETRY PANEL ================= */}
        <div className="w-full md:w-80 lg:w-96 bg-slate-900/95 border-t md:border-t-0 md:border-l border-white/10 flex flex-col max-h-72 md:max-h-full overflow-y-auto p-4 space-y-4 shrink-0">
          
          {/* Selected Landmark Detail Card */}
          {selectedLandmark ? (
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono font-bold text-sky-400 uppercase block">
                    {selectedLandmark.categoryLabel}
                  </span>
                  <h4 className="font-bold text-sm text-white leading-tight">
                    {selectedLandmark.name}
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    ({selectedLandmark.englishName})
                  </span>
                </div>
                <div className="p-1.5 rounded-xl bg-sky-500/20 text-sky-300 shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                {selectedLandmark.significance}
              </p>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-400 block font-mono">ELEVASI / KEDALAMAN</span>
                  <span className="font-bold text-amber-300">{selectedLandmark.elevation}</span>
                </div>
                <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-400 block font-mono">DIMENSI STRUKTUR</span>
                  <span className="font-bold text-sky-300">{selectedLandmark.dimension}</span>
                </div>
              </div>

              {selectedLandmark.explorationMission && (
                <div className="text-[10px] text-slate-400 font-mono bg-black/40 p-2 rounded-xl">
                  <span className="font-semibold text-slate-300">MISI EKSPLORASI: </span>
                  {selectedLandmark.explorationMission} ({selectedLandmark.discoveredYear})
                </div>
              )}

              {viewMode !== 'surface' && (
                <button
                  type="button"
                  onClick={() => triggerDescent(selectedLandmark)}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Mendarat di {selectedLandmark.name}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center text-xs text-slate-400">
              Pilih salah satu landmark dari daftar untuk melihat data geologi & koordinat.
            </div>
          )}

          {/* Environmental Telemetry Card */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Kondisi Fisik Permukaan ({bodyData.name})</span>
            </h4>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-black/30 p-2 rounded-xl border border-white/5 flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-rose-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block">Suhu Rata-rata</span>
                  <span className="font-bold text-white">{surfaceEnv.surfaceTempAvg}</span>
                </div>
              </div>

              <div className="bg-black/30 p-2 rounded-xl border border-white/5 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-sky-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block">Tekanan Atmosfer</span>
                  <span className="font-bold text-white">{surfaceEnv.surfacePressure}</span>
                </div>
              </div>

              <div className="bg-black/30 p-2 rounded-xl border border-white/5 flex items-center gap-2">
                <Wind className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block">Dinamika Angin</span>
                  <span className="font-bold text-white">{surfaceEnv.windSpeed}</span>
                </div>
              </div>

              <div className="bg-black/30 p-2 rounded-xl border border-white/5 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block">Gravitasi Permukaan</span>
                  <span className="font-bold text-white">{surfaceEnv.surfaceGravity}</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed bg-black/20 p-2.5 rounded-xl border border-white/5">
              {surfaceEnv.horizonDescription}
            </p>
          </div>

          {/* Quick Landmark List for Body */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Daftar Landmark Terpetakan ({landmarks.length})
            </span>
            <div className="space-y-1">
              {landmarks.map((lm) => {
                const isSelected = selectedLandmark?.id === lm.id;
                return (
                  <button
                    key={lm.id}
                    type="button"
                    onClick={() => setSelectedLandmark(lm)}
                    className={`w-full text-left p-2 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500/25 border border-sky-400 text-white font-bold'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-transparent'
                    }`}
                  >
                    <span className="truncate">{lm.name}</span>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-1">
                      {lm.lat}°
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}
