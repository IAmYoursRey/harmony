import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import GeoJSON from "ol/format/GeoJSON";
import { fromLonLat, transformExtent } from "ol/proj";
import OSMXML from "ol/format/OSMXML";
import { bbox as bboxStrategy } from "ol/loadingstrategy";
import Overlay from "ol/Overlay";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { Style, RegularShape, Fill, Stroke, Circle as CircleStyle } from "ol/style";
import TopoJSON from "ol/format/TopoJSON";
import { useEffect, useRef, useState, useMemo } from "react";
import { apiClient } from "@/services/apiClient";
import { Map as MapIcon, Mountain, GraduationCap, X, Menu, Building2, Settings, Search, MapPin, Activity, CloudRain, Thermometer, Wind, Cloud, Sun, Globe, TreePine, Map as MapIcon2, Newspaper, Palette, Paintbrush, Box, Compass, RotateCcw, RotateCw } from "lucide-react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSchool } from "@/hooks/useSchool";
import { motion, AnimatePresence } from "framer-motion";




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

// Map Layer Settings Definition & Defaults (All OFF by default for optimal performance)
export interface MapLayerSettings {
  showActive: boolean;
  showInactive: boolean;
  showPeaks: boolean;
  showSD: boolean;
  showSMP: boolean;
  showSMA: boolean;
  showTectonic: boolean;
  showEarthquakes: boolean;
  showForests: boolean;
  showKota: boolean;
  showKabupaten: boolean;
  showDesa: boolean;
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
  showForests: false,
  showKota: false,
  showKabupaten: false,
  showDesa: false,
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
if (typeof window !== 'undefined' && !window.localStorage.getItem('hm_migrated_v2')) {
  try {
    ['hm_showActive', 'hm_showInactive', 'hm_showPeaks', 'hm_showSD', 'hm_showSMP', 'hm_showSMA', 'hm_showTectonic', 'hm_showEarthquakes', 'hm_showForests', 'hm_showKota', 'hm_showKabupaten', 'hm_showDesa'].forEach(k => window.localStorage.removeItem(k));
    window.localStorage.setItem('hm_migrated_v2', 'true');
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
const Toggle = ({ checked, onChange, activeClass = "bg-brand-500" }: { checked: boolean, onChange: (v: boolean) => void, activeClass?: string }) => (
  <div className="relative inline-flex items-center cursor-pointer" onClick={() => onChange(!checked)}>
    <div className={`w-9 h-5 rounded-full transition-colors ${checked ? activeClass : 'bg-slate-200 dark:bg-slate-700'}`}>
      <div className={`absolute top-0.5 left-0.5 bg-white border border-slate-200 rounded-full h-4 w-4 transition-transform ${checked ? 'translate-x-4 border-transparent shadow-sm' : ''}`}></div>
    </div>
  </div>
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
  const { setSelection } = useSchool();
  
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

  const userSchoolId = currentProfile?.schoolId;

  const [mountains, setMountains] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [mapReady, setMapReady] = useState(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mapMode, setMapMode] = useState<'spatial' | 'news' | 'art'>('spatial');
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  
  const [showPanel, setShowPanel] = useState(false);

  // Per-User Settings: defaults to all OFF for new accounts/users
  const activeUserId = currentProfile?.userId || currentUser?.id || getSynchronousUserId() || 'guest';
  const profileMapSettings = (currentProfile as any)?.mapSettings;
  const { settings, updateSetting } = useUserMapSettings(activeUserId, profileMapSettings);

  // 3D Perspective & Globe Mode State (Persisted per user)
  const [is3D, setIs3D] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(`hm_is3d_${activeUserId}`) === 'true';
    } catch (e) {
      return false;
    }
  });

  const [globeType, setGlobeType] = useState<'sphere' | 'perspective'>(() => {
    try {
      const stored = window.localStorage.getItem(`hm_globetype_${activeUserId}`);
      return stored === 'perspective' ? 'perspective' : 'sphere';
    } catch (e) {
      return 'sphere';
    }
  });

  const [currentRotation, setCurrentRotation] = useState<number>(0);
  const [isOrbiting, setIsOrbiting] = useState<boolean>(false);
  const orbitFrameRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(`hm_is3d_${activeUserId}`);
      if (stored !== null) {
        setIs3D(stored === 'true');
      }
      const storedType = window.localStorage.getItem(`hm_globetype_${activeUserId}`);
      if (storedType === 'perspective' || storedType === 'sphere') {
        setGlobeType(storedType);
      }
    } catch (e) {}
  }, [activeUserId]);

  const handleToggle3D = (val: boolean) => {
    setIs3D(val);
    if (!val) {
      setIsOrbiting(false);
      resetRotationNorth();
    }
    try {
      window.localStorage.setItem(`hm_is3d_${activeUserId}`, String(val));
    } catch (e) {}
    // Update map canvas sizing smoothly after CSS perspective transition
    setTimeout(() => {
      mapRef.current?.updateSize();
    }, 750);
  };

  const handleSetGlobeType = (type: 'sphere' | 'perspective') => {
    setGlobeType(type);
    try {
      window.localStorage.setItem(`hm_globetype_${activeUserId}`, type);
    } catch (e) {}
    setTimeout(() => {
      mapRef.current?.updateSize();
    }, 750);
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

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPointerRotating.current && mapRef.current) {
      const deltaX = e.clientX - pointerStartX.current;
      const deltaRot = (deltaX / 300) * (2 * Math.PI);
      const newRot = pointerStartRot.current + deltaRot;
      mapRef.current.getView().setRotation(newRot);
      const deg = Math.round((((newRot % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) * 180) / Math.PI);
      setCurrentRotation(deg);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
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

  // Geological & Atmospheric States
  const showTectonic = settings.showTectonic;
  const setShowTectonic = (v: boolean | ((prev: boolean) => boolean)) => updateSetting('showTectonic', v);
  const showEarthquakes = settings.showEarthquakes;
  const setShowEarthquakes = (v: boolean | ((prev: boolean) => boolean)) => updateSetting('showEarthquakes', v);
  const [showWindyModal, setShowWindyModal] = useState(false);
  const [windyOverlay, setWindyOverlay] = useState<string>('rain');

  // Layer Refs for new features
  const tectonicLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const earthquakeLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const eqAnimIdRef = useRef<number | null>(null);
  const showForests = settings.showForests;
  const setShowForests = (v: boolean | ((prev: boolean) => boolean)) => updateSetting('showForests', v);
  const showKota = settings.showKota;
  const setShowKota = (v: boolean | ((prev: boolean) => boolean)) => updateSetting('showKota', v);
  const showKabupaten = settings.showKabupaten;
  const setShowKabupaten = (v: boolean | ((prev: boolean) => boolean)) => updateSetting('showKabupaten', v);
  const showDesa = settings.showDesa;
  const setShowDesa = (v: boolean | ((prev: boolean) => boolean)) => updateSetting('showDesa', v);

  const forestLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const kotaLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const kabupatenLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const desaLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const sharedBoundarySourceRef = useRef<VectorSource | null>(null);

  const [activeLayerLoads, setActiveLayerLoads] = useState(0);

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

  // Fetch Data
  useEffect(() => {
    let mounted = true;
    
    // Fetch mountains
    setActiveLayerLoads(prev => prev + 1);
    fetch('/data/mountains.json')
      .then((res) => res.json())
      .then((data) => {
        if (mounted && data) {
          setMountains(data);
        }
      })
      .catch((err) => console.error("Failed to load mountains", err))
      .finally(() => {
        setActiveLayerLoads(prev => Math.max(0, prev - 1));
      });

    // Fetch lightweight schools directly from static JSON for speed
    setActiveLayerLoads(prev => prev + 1);
    fetch('/data/schools-lite.json')
      .then((res) => res.json())
      .then((data) => {
        if (mounted && data && Array.isArray(data)) {
          // Map to optimized tuple format [id, lat, lng, cat, name]
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
          }).filter((s) => !isNaN(s[1]) && !isNaN(s[2])); // Only valid coords
          setSchools(mappedSchools);
        }
      })
      .catch((err) => console.error("Failed to load schools", err))
      .finally(() => {
        setActiveLayerLoads(prev => Math.max(0, prev - 1));
      });

    return () => { mounted = false; };
  }, []);

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
    const forestLayer = new VectorLayer({
      source: forestSource,
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
      zIndex: 2,
      visible: false,
      style: (feature) => {
        return new Style({
          stroke: new Stroke({ color: '#eab308', width: 1.5, lineDash: [4, 4] }),
          fill: new Fill({ color: 'rgba(234, 179, 8, 0.2)' })
        });
      }
    });
    desaLayerRef.current = desaLayer;

    const map = new Map({
      target: containerRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
          zIndex: 1
        }),
        forestLayer,
        kabupatenLayer,
        kotaLayer,
        desaLayer
      ],
      view: new View({
        center: fromLonLat([113.9213, -0.7893]), // Center of Indonesia
        zoom: 5,
      }),
    });

    // 2. Tectonic Layer
    const tectonicSource = new VectorSource();
    const tectonicLayer = new VectorLayer({
      source: tectonicSource,
      style: new Style({ stroke: new Stroke({ color: '#f97316', width: 2 }) }),
      zIndex: 2,
      visible: false
    });
    tectonicLayerRef.current = tectonicLayer;
    map.addLayer(tectonicLayer);

    // 3. Earthquakes Layer
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
      zIndex: 3,
      visible: false
    });
    earthquakeLayerRef.current = eqLayer;
    map.addLayer(eqLayer);

    const popupOverlay = new Overlay({
      element: popupRef.current!,
      positioning: 'bottom-center',
      stopEvent: false,
      offset: [0, -10]
    });
    map.addOverlay(popupOverlay);
    popupOverlayRef.current = popupOverlay;

    // 4. Mountains Layer
    const mountainSource = new VectorSource();
    const mountainLayer = new VectorLayer({
      source: mountainSource,
      zIndex: 3,
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

    // 5. Schools Layer
    const schoolsSource = new VectorSource();
    const schoolsLayer = new VectorLayer({
      source: schoolsSource,
      zIndex: 3,
      style: (feature, resolution) => {
        const cat = feature.get('cat');
        if (cat === 2) return styleSD;
        if (cat === 3) return styleSMP;
        return styleSMA;
      }
    });
    schoolsLayerRef.current = schoolsLayer;
    map.addLayer(schoolsLayer);

    // 6. Active School Layer
    const activeSchoolSource = new VectorSource();
    const activeSchoolLayer = new VectorLayer({
      source: activeSchoolSource,
      style: styleActiveSchool,
      zIndex: 4
    });
    activeSchoolLayerRef.current = activeSchoolLayer;
    map.addLayer(activeSchoolLayer);

    mapRef.current = map;
    setMapReady(true);

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
      setMapReady(false);
      vectorLayerRef.current = null;
      schoolsLayerRef.current = null;
      activeSchoolLayerRef.current = null;
      tectonicLayerRef.current = null;
      earthquakeLayerRef.current = null;
    };
  }, []);

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
        isMountain: true
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
        fetch('https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json')
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

    // Earthquakes USGS Real-time (Animated Pulsing)
    if (earthquakeLayerRef.current) {
      const source = earthquakeLayerRef.current.getSource();
      if (showEarthquakes && source && source.getFeatures().length === 0) {
        setActiveLayerLoads(prev => prev + 1);
        fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson')
          .then(r => r.json())
          .then(data => {
            const features = new GeoJSON().readFeatures(data, { featureProjection: 'EPSG:3857' });
            source.addFeatures(features);
          })
          .catch(console.error)
          .finally(() => setActiveLayerLoads(prev => Math.max(0, prev - 1)));
      }

      earthquakeLayerRef.current.setVisible(showEarthquakes);

      // Animation Loop
      if (showEarthquakes) {
        let lastRender = 0;
        const animateEq = (timestamp: number) => {
          if (earthquakeLayerRef.current?.getVisible()) {
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

  }, [showTectonic, showEarthquakes]);

  
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
      const feature = map.forEachFeatureAtPixel(
        e.pixel,
        (f) => f,
        { 
          hitTolerance: 5, 
          layerFilter: (layer) => 
            layer === vectorLayerRef.current || 
            layer === schoolsLayerRef.current || 
            layer === activeSchoolLayerRef.current 
        }
      );
      if (feature) {
        const coords = (feature.getGeometry() as Point).getCoordinates();
        
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

          } else if (feature.get('isMountain')) {
            popupRef.current.innerHTML = `
                <div style="min-width: 140px; font-family: Inter, sans-serif;" class="p-1 relative">
                    <button id="close-popup-btn" style="position: absolute; top: -2px; right: -2px; background: #f1f5f9; border-radius: 50%; padding: 2px; border: none; cursor: pointer; color: #94a3b8;">✖</button>
                    <strong style="font-size: 13px; color: #1e293b; display: block; margin-bottom: 2px; padding-right: 16px;">${feature.get('name')}</strong>
                    <span style="font-size: 11px; color: #64748b; display: block;">${feature.get('type') === 'volcano' ? feature.get('status') + ' Volcano' : 'Mountain Peak'}</span>
                    <span style="font-size: 10px; color: #94a3b8; display: block; margin-top: 2px;">Elev: ${feature.get('elevation')}m</span>
                </div>
            `;
            
            // Add close event
            const closeBtn = popupRef.current.querySelector('#close-popup-btn');
            if (closeBtn) {
              closeBtn.addEventListener('click', () => {
                if (popupRef.current) popupRef.current.style.display = 'none';
              });
            }
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

  return (
    <div 
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={(e) => { if (is3D) e.preventDefault(); }}
      className="relative h-full w-full bg-slate-950 overflow-hidden select-none"
    >
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

      {/* 3D Active Status Pill */}
      {is3D && mapMode === 'spatial' && (
        <div className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-indigo-500/50 text-[11px] font-bold text-indigo-200 shadow-xl animate-in fade-in duration-300">
          <Globe className={`w-3.5 h-3.5 text-sky-400 ${isOrbiting ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
          <span>{globeType === 'sphere' ? 'Bola Dunia 3D (360°)' : 'Perspektif 3D (360°)'}</span>
          <span className="text-[10px] bg-indigo-500/30 text-indigo-300 px-1.5 py-0.2 rounded-md font-mono">
            {currentRotation}°
          </span>
        </div>
      )}

      {/* Map Viewport & 3D Container */}
      <div 
        className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ${
          is3D 
            ? globeType === 'sphere' 
              ? 'map-globe-sphere-wrapper' 
              : 'map-viewport-3d' 
            : 'map-viewport-2d'
        }`}
        style={{
          perspective: is3D ? (globeType === 'sphere' ? '1600px' : '1200px') : 'none',
          perspectiveOrigin: '50% 50%'
        }}
      >
        <div 
          className={`transition-all duration-700 ${
            is3D 
              ? globeType === 'sphere'
                ? 'map-globe-sphere'
                : 'w-full h-full map-tilt-3d'
              : 'w-full h-full map-tilt-2d'
          }`}
        >
          <div 
            ref={containerRef} 
            className="w-full h-full" 
            style={{ opacity: mapMode === 'spatial' ? 1 : 0, pointerEvents: mapMode === 'spatial' ? 'auto' : 'none' }}
          />

          {/* Spherical atmospheric specular shading overlay */}
          {is3D && globeType === 'sphere' && (
            <div className="pointer-events-none absolute inset-0 rounded-full globe-lens-overlay" />
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

      {/* Map Mode Switcher (Top Right) */}
      <div className="absolute top-4 right-4 z-20">
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
      </div>

      {/* Custom OpenLayers & 3D Tilt Styles */}
      <style>{`
        .map-globe-sphere-wrapper {
          overflow: hidden;
          background: radial-gradient(circle at 50% 50%, rgba(15, 23, 42, 0.3) 0%, rgba(2, 6, 23, 0.98) 100%);
        }
        .map-globe-sphere {
          width: min(84vw, 84vh);
          height: min(84vw, 84vh);
          max-width: 820px;
          max-height: 820px;
          border-radius: 50%;
          overflow: hidden;
          position: relative;
          box-shadow: 
            0 0 50px 10px rgba(56, 189, 248, 0.35),
            0 0 110px 30px rgba(99, 102, 241, 0.22),
            inset 0 0 60px 15px rgba(2, 6, 23, 0.85);
          border: 2.5px solid rgba(125, 211, 252, 0.45);
          transform: rotateX(15deg) scale(1.02);
          transform-origin: 50% 50%;
          transition: all 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .globe-lens-overlay {
          box-shadow: 
            inset -35px -35px 80px rgba(2, 6, 23, 0.85),
            inset 25px 25px 50px rgba(255, 255, 255, 0.22),
            inset 0 0 35px rgba(56, 189, 248, 0.35);
        }
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
          top: auto !important;
          bottom: 1.5rem !important;
          left: 1.5rem !important;
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

      {/* 2D / 3D & 360° Quick Floating Widget (Elevated safely above zoom buttons) */}
      {mapMode === 'spatial' && (
        <div className="absolute bottom-36 left-6 z-20 flex flex-col gap-2 items-start">
          {/* 360° Orbit & Compass Controls (Smoothly visible when 3D is active) */}
          <AnimatePresence>
            {is3D && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl border border-slate-200/80 dark:border-slate-800"
              >
                {/* Compass / Reset to North Button */}
                <button
                  type="button"
                  onClick={resetRotationNorth}
                  className="group relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all text-slate-700 dark:text-slate-200"
                  title={`Arah: ${currentRotation}°. Klik untuk reset ke Utara (0°)`}
                  aria-label="Reset arah ke Utara"
                >
                  <div 
                    className="transition-transform duration-300 flex items-center justify-center"
                    style={{ transform: `rotate(${-currentRotation}deg)` }}
                  >
                    <Compass className="h-5 w-5 text-indigo-500 group-hover:text-indigo-600 dark:text-indigo-400" />
                  </div>
                </button>

                {/* Rotate -45 deg */}
                <button
                  type="button"
                  onClick={() => rotateMapBy(-45)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all text-slate-700 dark:text-slate-200"
                  title="Putar 360° ke Kiri (-45°)"
                  aria-label="Putar kiri"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>

                {/* Auto Orbit 360 Toggle */}
                <button
                  type="button"
                  onClick={toggleOrbit}
                  className={`flex items-center gap-1.5 px-3 h-9 rounded-xl font-bold text-xs transition-all ${
                    isOrbiting
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400/40'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                  title={isOrbiting ? "Hentikan rotasi 360°" : "Mulai putaran otomatis 360°"}
                >
                  <Globe className={`h-3.5 w-3.5 ${isOrbiting ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
                  <span>{isOrbiting ? "Orbit On" : "360°"}</span>
                </button>

                {/* Rotate +45 deg */}
                <button
                  type="button"
                  onClick={() => rotateMapBy(45)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all text-slate-700 dark:text-slate-200"
                  title="Putar 360° ke Kanan (+45°)"
                  aria-label="Putar kanan"
                >
                  <RotateCw className="h-4 w-4" />
                </button>

                {/* Toggle Shape (Sphere Globe / Perspective) */}
                <button
                  type="button"
                  onClick={() => handleSetGlobeType(globeType === 'sphere' ? 'perspective' : 'sphere')}
                  className="flex items-center gap-1 px-2.5 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 font-bold text-xs transition-all"
                  title="Ganti Tipe 3D (Bola Lingkaran / Miring)"
                >
                  {globeType === 'sphere' ? (
                    <>
                      <Globe className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Bola</span>
                    </>
                  ) : (
                    <>
                      <Box className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Miring</span>
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main 2D / 3D Mode Toggle Button */}
          <button
            type="button"
            onClick={() => handleToggle3D(!is3D)}
            className={`group flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl backdrop-blur-xl shadow-glass border transition-all duration-300 hover:scale-105 active:scale-95 ${
              is3D
                ? 'bg-gradient-to-r from-indigo-600 via-brand-600 to-purple-600 text-white border-indigo-400/60 shadow-xl shadow-indigo-500/30 ring-2 ring-indigo-400/40'
                : 'bg-white/95 dark:bg-slate-900/95 border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:bg-white dark:hover:bg-slate-800'
            }`}
            title={is3D ? "Kembali ke Mode 2D (Datar)" : "Beralih ke Mode 3D (Bola Dunia 360°)"}
            aria-label="Toggle Mode 2D/3D"
          >
            <div className={`flex h-6 w-6 items-center justify-center rounded-lg transition-transform group-hover:rotate-12 ${
              is3D ? 'bg-white/20 text-white' : 'bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400'
            }`}>
              {is3D ? <Globe className="h-4 w-4" /> : <Box className="h-4 w-4" />}
            </div>
            
            <div className="flex flex-col items-start text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black tracking-wide">
                  {is3D ? "Mode 3D" : "Mode 2D"}
                </span>
                <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md ${
                  is3D 
                    ? 'bg-white/25 text-white' 
                    : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                }`}>
                  {is3D ? (globeType === 'sphere' ? "Bola 360°" : "Miring") : "Flat"}
                </span>
              </div>
              <span className={`text-[10px] font-medium leading-none ${is3D ? 'text-indigo-100' : 'text-slate-400'}`}>
                {is3D ? "Rotasi 360° Aktif" : "Ketuk untuk 3D"}
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Floating Panel Toggle Button */}
      <button 
        onClick={() => setShowPanel(true)}
        style={{ display: showPanel ? 'none' : 'flex' }}
        className="absolute bottom-6 right-6 z-10 items-center gap-2 rounded-xl bg-white p-2.5 sm:px-4 sm:py-2.5 shadow-glass backdrop-blur-md hover:bg-slate-50 dark:bg-slate-900/90 dark:border dark:border-slate-800 text-ink-700 dark:text-slate-300 transition-colors group"
      >
        <Settings className="h-5 w-5 sm:h-5 sm:w-5 text-brand-500 group-hover:rotate-90 transition-transform duration-300" />
        <span className="hidden sm:inline font-display font-bold text-sm">Harmony Maps</span>
      </button>

      {/* Floating Control Panel */}
      <div 
        style={{ display: showPanel ? 'block' : 'none' }}
        className="absolute bottom-6 left-6 right-6 sm:left-auto sm:right-6 z-10 sm:w-80 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-2xl bg-white/95 p-4 sm:p-5 shadow-glass backdrop-blur-md dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 origin-bottom-right"
      >
          <button 
            onClick={() => setShowPanel(false)} 
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full p-1 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          
          <div className="mb-4 pr-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
                <MapIcon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-base font-bold text-ink-900 dark:text-white leading-tight">
                  Harmony Maps
                </h2>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {schools.length} Schools • {mountains.length} Mountains
                </p>
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
                  handleSetGlobeType('sphere');
                }}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  is3D && globeType === 'sphere'
                    ? 'bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-sm shadow-indigo-500/30' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Bola 360°</span>
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
              >
                <Box className="w-3.5 h-3.5" />
                <span>3D Miring</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
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
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Atmosfer & Cuaca Realtime</h3>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setWindyOverlay('rain'); setShowWindyModal(true); }} className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors text-xs font-medium text-slate-700 dark:text-slate-300">
                  <CloudRain className="h-5 w-5 text-blue-500" /> Hujan & Petir
                </button>
                <button onClick={() => { setWindyOverlay('temp'); setShowWindyModal(true); }} className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors text-xs font-medium text-slate-700 dark:text-slate-300">
                  <Thermometer className="h-5 w-5 text-rose-500" /> Suhu
                </button>
                <button onClick={() => { setWindyOverlay('wind'); setShowWindyModal(true); }} className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors text-xs font-medium text-slate-700 dark:text-slate-300">
                  <Wind className="h-5 w-5 text-teal-500" /> Angin
                </button>
                <button onClick={() => { setWindyOverlay('clouds'); setShowWindyModal(true); }} className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors text-xs font-medium text-slate-700 dark:text-slate-300">
                  <Cloud className="h-5 w-5 text-slate-400" /> Awan
                </button>
                <button onClick={() => { setWindyOverlay('pm2p5'); setShowWindyModal(true); }} className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors text-xs font-medium text-slate-700 dark:text-slate-300">
                  <Activity className="h-5 w-5 text-purple-500" /> Kualitas Udara
                </button>
                <button onClick={() => { setWindyOverlay('ozone'); setShowWindyModal(true); }} className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors text-xs font-medium text-slate-700 dark:text-slate-300">
                  <Globe className="h-5 w-5 text-indigo-500" /> Lapisan Ozon
                </button>
              </div>
            </div>

            
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Batas Wilayah & Tata Ruang</h3>
              <div className="space-y-3">
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
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Education Data</h3>
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
            
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Disaster Profile</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 select-none text-sm text-ink-700 dark:text-slate-300">
                    <Mountain className="h-4 w-4 text-red-500" /> Active Volcano
                  </label>
                  <Toggle checked={showActive} onChange={setShowActive} activeClass="bg-red-500" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 select-none text-sm text-ink-700 dark:text-slate-300">
                    <Mountain className="h-4 w-4 text-orange-500" /> Inactive Volcano
                  </label>
                  <Toggle checked={showInactive} onChange={setShowInactive} activeClass="bg-orange-500" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 select-none text-sm text-ink-700 dark:text-slate-300">
                    <Mountain className="h-4 w-4 text-slate-400" /> Mountain Peak
                  </label>
                  <Toggle checked={showPeaks} onChange={setShowPeaks} activeClass="bg-slate-400" />
                </div>
              </div>
            </div>
          </div>
      </div>
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

      {/* Fullscreen Weather Mode */}
      {showWindyModal && (
        <div className="absolute inset-0 z-[9999] flex flex-col md:flex-row bg-slate-900 animate-in fade-in duration-300 overflow-hidden overscroll-none">
          {/* Iframe takes up remaining space */}
          <div 
            className="flex-1 w-full h-full relative order-1 md:order-none min-h-[50vh]"
            style={{ WebkitOverflowScrolling: 'touch', overflow: 'hidden' }}
          >

            <iframe 
              width="100%" 
              height="100%" 
              src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=%C2%B0C&metricWind=km/h&zoom=5&overlay=${windyOverlay}&product=ecmwf&level=surface&lat=-2.5&lon=118.0`} 
              frameBorder="0"
              title="Windy Weather Map"
              className="w-full h-full block"
              style={{ pointerEvents: 'auto', touchAction: 'none' }}
            ></iframe>
          </div>

          {/* Responsive Panel: Bottom on Mobile, Right Sidebar on Desktop */}
          <div className="w-full md:w-72 h-auto max-h-[45vh] md:max-h-full md:h-full bg-white dark:bg-slate-900 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-10 order-2 md:order-none shrink-0">
            <div className="p-3 md:p-5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between md:block">
              <div>
                <h2 className="text-sm md:text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <CloudRain className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
                  Mode Cuaca
                </h2>
                <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1 hidden md:block">Pilih parameter atmosfer realtime</p>
              </div>
              
              {/* Mobile Close Button (Top right of the bottom drawer) */}
              <button 
                onClick={() => setShowWindyModal(false)}
                className="md:hidden p-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 md:p-4 grid grid-cols-2 md:grid-cols-1 gap-2 md:gap-3 content-start">
              <button onClick={() => setWindyOverlay('rain')} className={`w-full flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl border transition-colors ${windyOverlay === 'rain' ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800'}`}>
                <CloudRain className={`h-4 w-4 md:h-5 md:w-5 ${windyOverlay === 'rain' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                <span className={`text-xs md:text-sm font-medium ${windyOverlay === 'rain' ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400'}`}>Hujan & Petir</span>
              </button>

              <button onClick={() => setWindyOverlay('temp')} className={`w-full flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl border transition-colors ${windyOverlay === 'temp' ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800' : 'bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800'}`}>
                <Thermometer className={`h-4 w-4 md:h-5 md:w-5 ${windyOverlay === 'temp' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`} />
                <span className={`text-xs md:text-sm font-medium ${windyOverlay === 'temp' ? 'text-rose-700 dark:text-rose-300' : 'text-slate-600 dark:text-slate-400'}`}>Suhu</span>
              </button>

              <button onClick={() => setWindyOverlay('wind')} className={`w-full flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl border transition-colors ${windyOverlay === 'wind' ? 'bg-teal-50 border-teal-200 dark:bg-teal-900/20 dark:border-teal-800' : 'bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800'}`}>
                <Wind className={`h-4 w-4 md:h-5 md:w-5 ${windyOverlay === 'wind' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} />
                <span className={`text-xs md:text-sm font-medium ${windyOverlay === 'wind' ? 'text-teal-700 dark:text-teal-300' : 'text-slate-600 dark:text-slate-400'}`}>Angin</span>
              </button>

              <button onClick={() => setWindyOverlay('clouds')} className={`w-full flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl border transition-colors ${windyOverlay === 'clouds' ? 'bg-slate-100 border-slate-300 dark:bg-slate-700/50 dark:border-slate-600' : 'bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800'}`}>
                <Cloud className={`h-4 w-4 md:h-5 md:w-5 ${windyOverlay === 'clouds' ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400'}`} />
                <span className={`text-xs md:text-sm font-medium ${windyOverlay === 'clouds' ? 'text-slate-700 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>Awan</span>
              </button>

              <button onClick={() => setWindyOverlay('pm2p5')} className={`w-full flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl border transition-colors ${windyOverlay === 'pm2p5' ? 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800' : 'bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800'}`}>
                <Activity className={`h-4 w-4 md:h-5 md:w-5 ${windyOverlay === 'pm2p5' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`} />
                <span className={`text-xs md:text-sm font-medium ${windyOverlay === 'pm2p5' ? 'text-purple-700 dark:text-purple-300' : 'text-slate-600 dark:text-slate-400'}`}>Polusi Udara</span>
              </button>

              <button onClick={() => setWindyOverlay('ozone')} className={`w-full flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl border transition-colors ${windyOverlay === 'ozone' ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800'}`}>
                <Globe className={`h-4 w-4 md:h-5 md:w-5 ${windyOverlay === 'ozone' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                <span className={`text-xs md:text-sm font-medium ${windyOverlay === 'ozone' ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}>Ozon</span>
              </button>
            </div>
            
            <div className="hidden md:block p-4 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={() => setShowWindyModal(false)}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-colors font-bold text-sm shadow-lg"
              >
                <MapIcon className="h-4 w-4" />
                Kembali ke Street Map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MapsView;
