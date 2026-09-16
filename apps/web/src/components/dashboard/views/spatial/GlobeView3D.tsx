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
  Layers
} from 'lucide-react';

export interface GlobeMarker {
  id?: string | number;
  lat: number;
  lng: number;
  type: 'earthquake' | 'volcano_active' | 'volcano_inactive' | 'peak' | 'school';
  name?: string;
  mag?: number;
  depth?: number;
  elevation?: string | number;
  time?: string | number;
  place?: string;
}

interface GlobeView3DProps {
  mountains?: any[];
  showActiveVolcanoes?: boolean;
  showInactiveVolcanoes?: boolean;
  showPeaks?: boolean;
  showTectonicPlates?: boolean;
  showEarthquakes?: boolean;
  onSwitchTo2D?: (lat: number, lng: number) => void;
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
  onSwitchTo2D,
}: GlobeView3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const globeRef = useRef<THREE.Mesh | null>(null);
  const markersGroupRef = useRef<THREE.Group | null>(null);
  const tectonicGroupRef = useRef<THREE.Group | null>(null);
  const frameRef = useRef<number>(0);

  // Interaction refs
  const isDragging = useRef(false);
  const previousMouse = useRef({ x: 0, y: 0 });
  const rotationVelocity = useRef({ x: 0, y: 0 });
  const isInteracting = useRef(false);

  // Raycaster & clickable marker objects
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseCoordsRef = useRef(new THREE.Vector2());
  const clickableObjectsRef = useRef<THREE.Object3D[]>([]);

  // State
  const [autoRotate, setAutoRotate] = useState(false);
  const [zoom, setZoom] = useState(2.3);
  const [activeLayerPanel, setActiveLayerPanel] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<GlobeMarker | null>(null);
  const [quakes, setQuakes] = useState<GlobeMarker[]>([]);
  const [isTextureLoaded, setIsTextureLoaded] = useState(false);

  // Local layer visibility toggles for instant UI control on the 3D globe
  const [layerActiveVolcano, setLayerActiveVolcano] = useState(showActiveVolcanoes);
  const [layerInactiveVolcano, setLayerInactiveVolcano] = useState(showInactiveVolcanoes);
  const [layerPeaks, setLayerPeaks] = useState(showPeaks);
  const [layerTectonic, setLayerTectonic] = useState(showTectonicPlates);
  const [layerQuakes, setLayerQuakes] = useState(showEarthquakes);

  const autoRotateRef = useRef(autoRotate);
  useEffect(() => { autoRotateRef.current = autoRotate; }, [autoRotate]);

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

  // Smooth Zoom Handler
  const handleZoom = useCallback((direction: 'in' | 'out') => {
    setZoom((prev) => {
      const next = direction === 'in' ? Math.max(1.35, prev - 0.22) : Math.min(4.2, prev + 0.22);
      if (cameraRef.current) {
        cameraRef.current.position.z = next;
        cameraRef.current.updateProjectionMatrix();
      }
      return next;
    });
  }, []);

  // Smooth Focus on Indonesia
  const focusIndonesia = useCallback(() => {
    const globe = globeRef.current;
    if (!globe) return;
    rotationVelocity.current = { x: 0, y: 0 };
    setAutoRotate(false);

    const startX = globe.rotation.x;
    const startY = globe.rotation.y;
    const targetX = INDO_ROT_X;
    // Normalize target Y relative to current
    const currentRotY = globe.rotation.y;
    const twoPi = Math.PI * 2;
    let targetY = INDO_ROT_Y;
    while (targetY - currentRotY > Math.PI) targetY -= twoPi;
    while (targetY - currentRotY < -Math.PI) targetY += twoPi;

    const startTime = performance.now();
    const duration = 900;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Smooth easeInOutCubic
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
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);
    const sunLight = new THREE.DirectionalLight(0xfff8ee, 2.2);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.7);
    rimLight.position.set(-5, -2, -4);
    scene.add(rimLight);

    // Globe Sphere geometry
    const radius = 1;
    const geometry = new THREE.SphereGeometry(radius, 64, 64);

    // Load Earth Texture locally from /earth-blue-marble.jpg (instant, 0ms latency, no 404)
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load(
      '/earth-blue-marble.jpg',
      () => {
        setIsTextureLoaded(true);
      },
      undefined,
      () => {
        // Fallback to day map if blue marble has any local issue
        const fallbackTexture = textureLoader.load('/earth-day.jpg');
        fallbackTexture.colorSpace = THREE.SRGBColorSpace;
        if (globeRef.current) {
          (globeRef.current.material as THREE.MeshPhongMaterial).map = fallbackTexture;
          (globeRef.current.material as THREE.MeshPhongMaterial).needsUpdate = true;
        }
      }
    );
    earthTexture.colorSpace = THREE.SRGBColorSpace;

    const globeMaterial = new THREE.MeshPhongMaterial({
      map: earthTexture,
      specular: new THREE.Color(0x1e3a5f),
      shininess: 12,
    });

    const globe = new THREE.Mesh(geometry, globeMaterial);
    // Initial orientation facing Indonesia
    globe.rotation.y = INDO_ROT_Y;
    globe.rotation.x = INDO_ROT_X;
    scene.add(globe);
    globeRef.current = globe;

    // Groups attached directly to the globe so all markers rotate WITH the sphere automatically
    const markersGroup = new THREE.Group();
    globe.add(markersGroup);
    markersGroupRef.current = markersGroup;

    const tectonicGroup = new THREE.Group();
    globe.add(tectonicGroup);
    tectonicGroupRef.current = tectonicGroup;

    // Atmospheric Glow Outer Shell
    const atmGeo = new THREE.SphereGeometry(radius * 1.018, 48, 48);
    const atmMat = new THREE.MeshPhongMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.12,
      side: THREE.FrontSide,
      depthWrite: false,
    });
    const atmosphere = new THREE.Mesh(atmGeo, atmMat);
    scene.add(atmosphere);

    // Starfield Backdrop (1,200 points in 1 single draw call)
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1200;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const dist = 300 + Math.random() * 250;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i] = dist * Math.sin(phi) * Math.cos(theta);
      starPositions[i + 1] = dist * Math.sin(phi) * Math.sin(theta);
      starPositions[i + 2] = dist * Math.cos(phi);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, transparent: true, opacity: 0.75 });
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
        segments.name = 'tectonic_lines';
        tectonicGroupRef.current.add(segments);
      })
      .catch((err) => {
        console.warn('Globe3D: Failed to load tectonic plates', err);
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

    // Animation Loop (60 FPS)
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);

      if (autoRotateRef.current && !isInteracting.current) {
        globe.rotation.y += 0.0018;
      } else if (!isInteracting.current) {
        // Inertia damping
        rotationVelocity.current.x *= 0.90;
        rotationVelocity.current.y *= 0.90;
        globe.rotation.x += rotationVelocity.current.x;
        globe.rotation.y += rotationVelocity.current.y;
      }

      // Clamp vertical tilt to prevent upside-down flipping
      globe.rotation.x = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, globe.rotation.x));

      // Sync atmosphere
      atmosphere.rotation.copy(globe.rotation);

      renderer.render(scene, camera);
    };
    animate();

    // Pointer Drag Interaction
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.button !== 2) return;
      isDragging.current = true;
      isInteracting.current = true;
      previousMouse.current = { x: e.clientX, y: e.clientY };
      rotationVelocity.current = { x: 0, y: 0 };
      renderer.domElement.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - previousMouse.current.x;
      const dy = e.clientY - previousMouse.current.y;
      const speed = 0.005;
      globe.rotation.y += dx * speed;
      globe.rotation.x += dy * speed;
      rotationVelocity.current.x = dy * speed;
      rotationVelocity.current.y = dx * speed;
      previousMouse.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      if (isDragging.current) {
        isDragging.current = false;
        isInteracting.current = false;
        try { renderer.domElement.releasePointerCapture(e.pointerId); } catch (_) {}
      }
    };

    // Wheel Zoom
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.15 : -0.15;
      setZoom((prev) => {
        const next = Math.max(1.35, Math.min(4.2, prev + delta));
        if (cameraRef.current) {
          cameraRef.current.position.z = next;
          cameraRef.current.updateProjectionMatrix();
        }
        return next;
      });
    };

    // Click Detection for Interactive Popups
    const onClick = (e: MouseEvent) => {
      if (!mount || !cameraRef.current || clickableObjectsRef.current.length === 0) return;
      const rect = mount.getBoundingClientRect();
      mouseCoordsRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseCoordsRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseCoordsRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(clickableObjectsRef.current, false);

      if (intersects.length > 0) {
        const topHit = intersects[0].object;
        if (topHit.userData?.marker) {
          setSelectedMarker(topHit.userData.marker);
        }
      }
    };

    const dom = renderer.domElement;
    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('pointercancel', onPointerUp);
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('click', onClick);

    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('pointercancel', onPointerUp);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('click', onClick);
      renderer.dispose();
      geometry.dispose();
      globeMaterial.dispose();
      atmGeo.dispose();
      atmMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      if (mount.contains(dom)) {
        mount.removeChild(dom);
      }
    };
  }, []);

  // ================= TECTONIC VISIBILITY UPDATE ================= //
  useEffect(() => {
    if (tectonicGroupRef.current) {
      tectonicGroupRef.current.visible = layerTectonic;
    }
  }, [layerTectonic]);

  // ================= LIGHTWEIGHT MARKER UPDATES (NO RE-CREATING RENDERER) ================= //
  useEffect(() => {
    const group = markersGroupRef.current;
    if (!group) return;

    // Clear existing marker meshes
    while (group.children.length > 0) {
      const child = group.children[0] as THREE.Mesh;
      group.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else (child.material as THREE.Material).dispose();
      }
    }
    clickableObjectsRef.current = [];

    // Shared Geometries & Materials for maximum performance
    const activeVolcanoGeo = new THREE.ConeGeometry(0.018, 0.038, 8);
    activeVolcanoGeo.rotateX(Math.PI / 2);
    const activeVolcanoMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    const inactiveVolcanoGeo = new THREE.ConeGeometry(0.014, 0.028, 8);
    inactiveVolcanoGeo.rotateX(Math.PI / 2);
    const inactiveVolcanoMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

    const peakGeo = new THREE.OctahedronGeometry(0.010, 0);
    const peakMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });

    const quakeDotGeo = new THREE.SphereGeometry(0.012, 8, 8);
    const quakeRedMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const quakeOrangeMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });

    // 1. Add Volcanoes (Active & Inactive)
    if (layerActiveVolcano || layerInactiveVolcano) {
      const volcanoes = mountains.filter((m) => m.type === 'volcano');
      volcanoes.forEach((m) => {
        if (isNaN(m.lat) || isNaN(m.lng)) return;
        const isActive = m.status === 'Active';
        if (isActive && !layerActiveVolcano) return;
        if (!isActive && !layerInactiveVolcano) return;

        const mesh = new THREE.Mesh(
          isActive ? activeVolcanoGeo : inactiveVolcanoGeo,
          isActive ? activeVolcanoMat : inactiveVolcanoMat
        );
        const pos = latLngToVec3(m.lat, m.lng, 1.008);
        mesh.position.copy(pos);
        mesh.lookAt(pos.clone().multiplyScalar(2));
        mesh.userData = {
          marker: {
            id: m.id,
            lat: m.lat,
            lng: m.lng,
            type: isActive ? 'volcano_active' : 'volcano_inactive',
            name: m.name,
            elevation: m.elevation,
          },
        };
        group.add(mesh);
        clickableObjectsRef.current.push(mesh);
      });
    }

    // 2. Add High Peaks (Elevation >= 2500m to keep view clean and fast)
    if (layerPeaks) {
      const highPeaks = mountains.filter((m) => m.type === 'peak' && parseFloat(m.elevation || '0') >= 2500);
      highPeaks.forEach((m) => {
        if (isNaN(m.lat) || isNaN(m.lng)) return;
        const mesh = new THREE.Mesh(peakGeo, peakMat);
        const pos = latLngToVec3(m.lat, m.lng, 1.006);
        mesh.position.copy(pos);
        mesh.userData = {
          marker: {
            id: m.id,
            lat: m.lat,
            lng: m.lng,
            type: 'peak',
            name: m.name,
            elevation: m.elevation,
          },
        };
        group.add(mesh);
        clickableObjectsRef.current.push(mesh);
      });
    }

    // 3. Add Real-time Earthquakes
    if (layerQuakes && quakes.length > 0) {
      quakes.forEach((q) => {
        if (isNaN(q.lat) || isNaN(q.lng)) return;
        const mag = q.mag ?? 3.5;
        const isMajor = mag >= 5.0;
        const scale = Math.max(0.7, mag / 4.0);

        const mesh = new THREE.Mesh(quakeDotGeo, isMajor ? quakeRedMat : quakeOrangeMat);
        mesh.scale.set(scale, scale, scale);
        const pos = latLngToVec3(q.lat, q.lng, 1.007);
        mesh.position.copy(pos);
        mesh.userData = { marker: q };
        group.add(mesh);
        clickableObjectsRef.current.push(mesh);

        // Pulse ring for major earthquakes
        if (isMajor) {
          const ringGeo = new THREE.RingGeometry(0.018 * scale, 0.026 * scale, 12);
          const ringMat = new THREE.MeshBasicMaterial({
            color: 0xef4444,
            transparent: true,
            opacity: 0.65,
            side: THREE.DoubleSide,
          });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.position.copy(pos);
          ring.lookAt(new THREE.Vector3(0, 0, 0));
          group.add(ring);
        }
      });
    }
  }, [mountains, quakes, layerActiveVolcano, layerInactiveVolcano, layerPeaks, layerQuakes]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-[radial-gradient(ellipse_at_50%_50%,_#091322_0%,_#020617_60%,_#000000_100%)] overflow-hidden select-none">
      {/* Three.js canvas mount */}
      <div 
        ref={mountRef} 
        className="w-full h-full" 
        style={{ cursor: isDragging.current ? 'grabbing' : 'grab' }} 
      />

      {/* Top HUD Pill */}
      <div className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-xl border border-sky-500/40 text-[11px] font-bold text-sky-200 shadow-2xl animate-in fade-in duration-300">
        <Globe className={`w-3.5 h-3.5 text-sky-400 ${autoRotate ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
        <span>Bola Dunia 3D</span>
        <span className="text-[10px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded-md font-mono">
          {isTextureLoaded ? '60 FPS' : 'Memuat Tekstur...'}
        </span>
      </div>

      {/* Interactive Marker Details Floating Card */}
      {selectedMarker && (
        <div className="absolute top-20 right-6 z-30 w-72 p-4 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-sky-500/30 text-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <button 
            onClick={() => setSelectedMarker(null)}
            className="absolute top-3 right-3 p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            {selectedMarker.type.startsWith('volcano') && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                selectedMarker.type === 'volcano_active' 
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40' 
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                <Flame className="w-3 h-3" />
                {selectedMarker.type === 'volcano_active' ? 'Gunung Api Aktif' : 'Gunung Waspada'}
              </span>
            )}
            {selectedMarker.type === 'earthquake' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40">
                <Activity className="w-3 h-3" />
                Gempa Bumi M {selectedMarker.mag?.toFixed(1) ?? '2.5+'}
              </span>
            )}
            {selectedMarker.type === 'peak' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-slate-500/20 text-slate-300 border border-slate-500/40">
                <Mountain className="w-3 h-3" />
                Puncak Gunung
              </span>
            )}
          </div>

          <h3 className="text-sm font-black text-slate-100 mb-1 leading-snug">
            {selectedMarker.name || selectedMarker.place || 'Titik Spasial'}
          </h3>

          <div className="space-y-1 text-xs text-slate-300 mt-2.5 pb-2 border-b border-slate-800">
            {selectedMarker.elevation && (
              <div className="flex justify-between">
                <span className="text-slate-400">Ketinggian:</span>
                <span className="font-semibold text-slate-200">{selectedMarker.elevation} mdpl</span>
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
          </div>

          {onSwitchTo2D && (
            <button
              onClick={() => onSwitchTo2D(selectedMarker.lat, selectedMarker.lng)}
              className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-md shadow-sky-500/25"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Lihat di Peta Datar (2D)</span>
            </button>
          )}
        </div>
      )}

      {/* Layer Quick-Toggle Drawer (When Opened) */}
      {activeLayerPanel && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 p-3 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-white/10 text-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 min-w-[280px]">
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
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/85 backdrop-blur-2xl border border-white/15 shadow-2xl">
        {/* Zoom Out */}
        <button
          type="button"
          onClick={() => handleZoom('out')}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 hover:bg-white/15 text-white transition-all active:scale-95"
          title="Perkecil (Zoom Out)"
        >
          <ZoomOut className="h-4 w-4" />
        </button>

        {/* Zoom In */}
        <button
          type="button"
          onClick={() => handleZoom('in')}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 hover:bg-white/15 text-white transition-all active:scale-95"
          title="Perbesar (Zoom In)"
        >
          <ZoomIn className="h-4 w-4" />
        </button>

        <div className="w-[1px] h-5 bg-white/15 mx-0.5" />

        {/* Focus Indonesia Button */}
        <button
          type="button"
          onClick={focusIndonesia}
          className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-gradient-to-r from-sky-500/20 to-indigo-500/20 hover:from-sky-500/30 hover:to-indigo-500/30 text-sky-200 border border-sky-500/30 font-bold text-xs transition-all active:scale-95"
          title="Pusatkan Bola Dunia ke Indonesia"
        >
          <Compass className="h-3.5 w-3.5 text-sky-400" />
          <span>Fokus Indonesia</span>
        </button>

        {/* Auto Rotate Toggle */}
        <button
          type="button"
          onClick={() => setAutoRotate((p) => !p)}
          className={`flex items-center gap-1.5 px-3 h-9 rounded-xl font-bold text-xs transition-all active:scale-95 ${
            autoRotate
              ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/30'
              : 'bg-white/5 text-slate-300 hover:bg-white/15'
          }`}
          title={autoRotate ? 'Hentikan Putaran' : 'Putar 360° Otomatis'}
        >
          {autoRotate ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          <span>{autoRotate ? 'Berhenti' : 'Putar'}</span>
        </button>

        <div className="w-[1px] h-5 bg-white/15 mx-0.5" />

        {/* Toggle Layers Panel Button */}
        <button
          type="button"
          onClick={() => setActiveLayerPanel((p) => !p)}
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
