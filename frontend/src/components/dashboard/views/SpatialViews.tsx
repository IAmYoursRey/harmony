import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef, useState, useMemo } from 'react';
import { Navigation, Waves, Mountain, Trees, Flame, Shield, Route, Home, Sparkles, MapPin, DoorOpen, FlaskConical, BookMarked, Play, RotateCcw, CheckCircle2, Box, Plus, Save, Trash2, Move, FileText, ArrowRight, HelpCircle, Info, Upload, type LucideIcon } from 'lucide-react';
import { useSchool } from '@/context/SchoolContext';
import { useAuth } from '@/context/AuthContext';
import { type School } from '@/data/schools';
import { getToken } from '@/data/accounts';
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
import { useToast } from '@/context/ToastContext';
import { useI18n } from '@/context/I18nContext';


// --- Merged from GeoRiskMapView.tsx ---

interface HazardProfile {
  icon: LucideIcon;
  label: string;
  level: string;
  detail: string;
  color: string;
  bg: string;
  percent: number;
}

const defaultHazards: HazardProfile[] = [
  {
    icon: Mountain,
    label: 'Earthquake Risk',
    level: 'Low–Moderate',
    detail: 'Moderate distance from active fault lines. Ground shaking possible but infrequent.',
    color: 'text-brand-600',
    bg: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400',
    percent: 42,
  },
  {
    icon: Waves,
    label: 'Flood Risk',
    level: 'Moderate',
    detail: 'Bengawan Solo tributaries nearby. Seasonal monsoon raises inundation risk.',
    color: 'text-brand-600',
    bg: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400',
    percent: 68,
  },
  {
    icon: Trees,
    label: 'Landslide Risk',
    level: 'Moderate',
    detail: 'Sloped terrain in southern Ngoro. Heavy rainfall increases slope instability.',
    color: 'text-brand-600',
    bg: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400',
    percent: 55,
  },
  {
    icon: Flame,
    label: 'Volcanic Risk',
    level: 'Moderate',
    detail: 'Mt. Penanggungan & Arjuno complex ~25km away. Ashfall possible during major activity.',
    color: 'text-brand-600',
    bg: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400',
    percent: 60,
  },
  {
    icon: Waves,
    label: 'Tsunami Risk',
    level: 'Low',
    detail: 'Inland location — tsunami risk minimal but coastal awareness still recommended.',
    color: 'text-brand-600',
    bg: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400',
    percent: 25,
  },
];

const emergencyRoutes = [
  { icon: Route, label: 'Primary evacuation route', detail: 'Jl. Raya Ngoro → Ngoro Sports Field', distance: '1.2 km', time: '8 min' },
  { icon: Home, label: 'Nearest shelter', detail: 'Ngoro Community Hall (Balai Desa)', distance: '0.8 km', time: '5 min' },
  { icon: Shield, label: 'Secondary shelter', detail: 'SMA Negeri 1 Ngoro assembly hall', distance: 'On-site', time: 'Immediate' },
];

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`glass rounded-2xl p-5 transition-all hover:shadow-glass dark:bg-slate-900/60 ${className}`}>{children}</div>;
}

function createIcon(color: string, emoji: string) {
  return L.divIcon({
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:14px;">${emoji}</div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

export function GeoRiskMapView() {
  const { currentProfile } = useAuth();
  const { t } = useI18n();
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { selection } = useSchool();

  const school = useMemo(() => {
    if (!currentProfile?.schoolId || currentProfile.schoolId === 'unknown') return null;
    return selection?.school || null;
  }, [currentProfile?.schoolId, selection]);

  const schoolLat = school?.lat ?? -7.5669;
  const schoolLng = school?.lng ?? 112.4084;
  const schoolName = school?.name ?? 'SMA Negeri 1 Ngoro';
  const schoolRisk = school?.risk ?? 'Moderate';

  const hazards = school
    ? [
        { ...defaultHazards[0], percent: school.earthquake },
        { ...defaultHazards[1], percent: school.flood },
        { ...defaultHazards[2], percent: school.landslide },
        { ...defaultHazards[3], percent: school.volcanic },
        { 
          ...defaultHazards[4], 
          percent: school.tsunami,
          level: school.tsunami > 60 ? 'High' : school.tsunami > 30 ? 'Moderate' : 'Low',
          detail: school.tsunami > 30 
            ? 'Coastal proximity increases vulnerability. High-risk zones mapped.' 
            : 'Inland location — tsunami risk minimal but coastal awareness still recommended.'
        },
      ]
    : defaultHazards;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [schoolLat, schoolLng],
      zoom: 14,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-zoom when school changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.setView([schoolLat, schoolLng], 14);

    // Clear existing layers except tile layer
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Circle || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    // School marker
    L.marker([schoolLat, schoolLng], { icon: createIcon('hsl(var(--brand-500))', '\uf19d') })
      .addTo(map)
      .bindPopup(
        `<div style="font-family:Inter,sans-serif;min-width:180px;">
          <strong style="font-size:13px;color:#1e293b;">${schoolName}</strong><br/>
          <span style="font-size:11px;color:#64748b;">${school?.regency ?? 'Mojokerto'}, ${school?.province ?? 'Jawa Timur'}</span><br/>
          <span style="font-size:11px;font-weight:600;color:hsl(var(--brand-500));">Risk: ${schoolRisk}</span><br/>
          <span style="font-size:10px;color:#94a3b8;">${schoolLat.toFixed(4)}°, ${schoolLng.toFixed(4)}°</span>
        </div>`
      )
      .openPopup();

    // Flood zone (circle)
    L.circle([schoolLat + 0.008, schoolLng + 0.006], {
      radius: 800,
      color: 'hsl(var(--brand-500))',
      fillColor: 'hsl(var(--brand-500))',
      fillOpacity: 0.15,
      dashArray: '5 5',
    })
      .addTo(map)
      .bindPopup(
        `<div style="font-family:Inter,sans-serif;"><strong style="color:hsl(var(--brand-500));">🌊 Flood Zone</strong><br/><span style="font-size:11px;color:#64748b;">Seasonal inundation risk area</span></div>`
      );

    // Earthquake zone
    L.circle([schoolLat - 0.006, schoolLng - 0.004], {
      radius: 1000,
      color: 'hsl(var(--brand-400))',
      fillColor: 'hsl(var(--brand-400))',
      fillOpacity: 0.1,
      dashArray: '5 5',
    })
      .addTo(map)
      .bindPopup(
        `<div style="font-family:Inter,sans-serif;"><strong style="color:hsl(var(--brand-500));">⛰️ Earthquake Zone</strong><br/><span style="font-size:11px;color:#64748b;">Active fault proximity area</span></div>`
      );

    // Landslide zone
    L.circle([schoolLat + 0.005, schoolLng - 0.008], {
      radius: 600,
      color: 'hsl(var(--brand-300))',
      fillColor: 'hsl(var(--brand-300))',
      fillOpacity: 0.15,
      dashArray: '5 5',
    })
      .addTo(map)
      .bindPopup(
        `<div style="font-family:Inter,sans-serif;"><strong style="color:hsl(var(--brand-400));">🌳 Landslide Zone</strong><br/><span style="font-size:11px;color:#64748b;">Sloped terrain — unstable in heavy rain</span></div>`
      );

    // Volcanic zone
    L.circle([schoolLat - 0.01, schoolLng + 0.012], {
      radius: 1200,
      color: 'hsl(var(--brand-600))',
      fillColor: 'hsl(var(--brand-600))',
      fillOpacity: 0.1,
      dashArray: '5 5',
    })
      .addTo(map)
      .bindPopup(
        `<div style="font-family:Inter,sans-serif;"><strong style="color:hsl(var(--brand-600));">🌋 Volcanic Zone</strong><br/><span style="font-size:11px;color:#64748b;">Volcanic ashfall and eruption risk area</span></div>`
      );

    // Tsunami zone
    L.circle([schoolLat + 0.012, schoolLng - 0.012], {
      radius: 900,
      color: 'hsl(var(--brand-200))',
      fillColor: 'hsl(var(--brand-200))',
      fillOpacity: 0.12,
      dashArray: '5 5',
    })
      .addTo(map)
      .bindPopup(
        `<div style="font-family:Inter,sans-serif;"><strong style="color:hsl(var(--brand-300));">🌊 Tsunami Zone</strong><br/><span style="font-size:11px;color:#64748b;">Coastal tsunami inundation risk area</span></div>`
      );

    // Evacuation route (polyline)
    L.polyline(
      [
        [schoolLat, schoolLng],
        [schoolLat + 0.003, schoolLng + 0.002],
        [schoolLat + 0.006, schoolLng + 0.005],
        [schoolLat + 0.008, schoolLng + 0.008],
      ],
      { color: 'hsl(var(--brand-500))', weight: 3, dashArray: '8 6' }
    )
      .addTo(map)
      .bindPopup(
        `<div style="font-family:Inter,sans-serif;"><strong style="color:hsl(var(--brand-200));">🟡 Evacuation Route</strong><br/><span style="font-size:11px;color:#64748b;">Primary path to assembly point</span></div>`
      );

    // Assembly point
    L.marker([schoolLat + 0.006, schoolLng + 0.005], { icon: createIcon('hsl(var(--brand-600))', '🚩') })
      .addTo(map)
      .bindPopup(
        `<div style="font-family:Inter,sans-serif;"><strong style="color:hsl(var(--brand-600));">🚩 Assembly Point</strong><br/><span style="font-size:11px;color:#64748b;">Ngoro Sports Field</span></div>`
      );

    // Shelter
    L.marker([schoolLat + 0.008, schoolLng + 0.008], { icon: createIcon('hsl(var(--brand-400))', '\uf015') })
      .addTo(map)
      .bindPopup(
        `<div style="font-family:Inter,sans-serif;"><strong style="color:hsl(var(--brand-400));">🏠 Shelter</strong><br/><span style="font-size:11px;color:#64748b;">Ngoro Community Hall (Balai Desa)</span></div>`
      );
  }, [schoolLat, schoolLng, schoolName, schoolRisk, school?.regency, school?.province]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-6 text-white shadow-glass-lg sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:36px_36px] opacity-15" />
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            <Navigation className="h-3.5 w-3.5" /> Live Geospatial Intelligence
          </div>
          <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Disaster Risk Map
          </h2>
          <p className="mt-1.5 max-w-md text-sm text-brand-100">
            Interactive hazard map for {schoolName}, powered by regional satellite and GIS data.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Leaflet Map */}
        <div className="lg:col-span-2">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">
                Interactive Risk Map
              </h3>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-brand-600" /> High</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-brand-400" /> Moderate</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-brand-200" /> Low</span>
              </div>
            </div>
            <div
              ref={containerRef}
              className="h-[400px] w-full overflow-hidden rounded-xl border border-brand-100 dark:border-slate-700"
              style={{ background: '#0f172a' }}
            />
            <div className="mt-4 flex flex-wrap gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-ink-600 dark:text-slate-300"><span className="text-base">🏫</span> School</span>
              <span className="flex items-center gap-1.5 text-ink-600 dark:text-slate-300"><span className="text-base">🌊</span> Flood Zone</span>
              <span className="flex items-center gap-1.5 text-ink-600 dark:text-slate-300"><span className="text-base">⛰️</span> Earthquake Zone</span>
              <span className="flex items-center gap-1.5 text-ink-600 dark:text-slate-300"><span className="text-base">🌳</span> Landslide Zone</span>
              <span className="flex items-center gap-1.5 text-ink-600 dark:text-slate-300"><span className="text-base">🌋</span> Volcanic Zone</span>
              <span className="flex items-center gap-1.5 text-ink-600 dark:text-slate-300"><span className="text-base">🌊</span> Tsunami Zone</span>
              <span className="flex items-center gap-1.5 text-ink-600 dark:text-slate-300"><span className="text-base">🚩</span> Assembly Point</span>
              <span className="flex items-center gap-1.5 text-ink-600 dark:text-slate-300"><span className="text-base">🏠</span> Shelter</span>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-brand-600" />
              <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">Your School</h3>
            </div>
            <div className="rounded-xl bg-brand-50/60 p-4 dark:bg-slate-800/60">
              <p className="font-display text-sm font-bold text-ink-900 dark:text-white">{schoolName}</p>
              <p className="mt-0.5 text-xs text-ink-500 dark:text-slate-400">
                {school?.regency ?? 'Mojokerto'}, {school?.province ?? 'Jawa Timur'}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                  schoolRisk === 'Low' ? 'bg-brand-50 text-brand-600' :
                  schoolRisk === 'Moderate' ? 'bg-brand-100 text-brand-700' :
                  schoolRisk === 'High' ? 'bg-brand-200 text-brand-800' :
                  'bg-brand-300 text-brand-900'
                }`}>
                  {schoolRisk} Risk
                </span>
                <span className="text-xs text-ink-500 dark:text-slate-400">
                  {schoolLat.toFixed(4)}°, {schoolLng.toFixed(4)}°
                </span>
              </div>
            </div>
            <div className="mt-4 space-y-2.5">
              {hazards.map((h) => (
                <div key={h.label} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-ink-600 dark:text-slate-300">
                    <h.icon className="h-4 w-4 text-brand-500" />
                    {h.label}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${h.bg}`}>
                    {h.percent}%
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <Route className="h-5 w-5 text-brand-600" />
              <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">Emergency Routes</h3>
            </div>
            <div className="space-y-3">
              {emergencyRoutes.map((r) => (
                <div key={r.label} className="flex items-start gap-3 rounded-lg border border-brand-50 p-3 dark:border-slate-800">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-slate-800 dark:text-brand-400">
                    <r.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-ink-900 dark:text-white">{r.label}</p>
                    <p className="truncate text-[11px] text-ink-500 dark:text-slate-400">{r.detail}</p>
                    <div className="mt-1 flex items-center gap-3 text-[10px] text-brand-600">
                      <span>{r.distance}</span>
                      <span>· {r.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Hazard detail cards */}
      <div>
        <h3 className="mb-4 font-display text-lg font-bold text-ink-900 dark:text-white">Hazard Profile</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {hazards.map((h) => (
            <Card key={h.label}>
              <div className="flex items-center gap-3">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${h.bg}`}>
                  <h.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink-900 dark:text-white">{h.label}</p>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${h.bg}`}>{h.level}</span>
                </div>
              </div>
              <div className="mt-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-brand-50 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${
                      h.percent > 60 ? 'from-brand-600 to-brand-800' : h.percent > 45 ? 'from-brand-400 to-brand-600' : 'from-brand-300 to-brand-500'
                    }`}
                    style={{ width: `${h.percent}%` }}
                  />
                </div>
                <p className="mt-1 text-right text-[10px] font-semibold text-ink-500 dark:text-slate-400">{h.percent}% risk index</p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink-500 dark:text-slate-400">{h.detail}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* AI recommendations */}
      <Card className="relative overflow-hidden">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-100/50 blur-2xl" />
        <div className="relative">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-600" />
            <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">AI Risk Recommendations</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: Flame, title: 'Volcanic ash preparedness drill', reason: 'Mt. Penanggungan sector is active — rehearse ashfall response and shelter-in-place.', accent: 'from-brand-600 to-brand-800' },
              { icon: Trees, title: 'Landslide early warning review', reason: 'Southern slopes are vulnerable during monsoon — review evacuation routes.', accent: 'from-brand-500 to-brand-600' },
              { icon: Waves, title: 'Flood evacuation route mapping', reason: 'Bengawan Solo tributaries can inundate low-lying zones — map safe routes now.', accent: 'from-brand-400 to-brand-500' },
            ].map((r) => (
              <div key={r.title} className="group flex items-start gap-3 rounded-xl border border-brand-50 p-4 transition-colors hover:bg-brand-50/60 dark:border-slate-800 dark:hover:bg-slate-800/60">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${r.accent} text-white`}>
                  <r.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink-900 dark:text-white">{r.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-500 dark:text-slate-400">{r.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}



// --- Merged from DigitalTwinView.tsx ---

type RoomType = 'classroom' | 'lab' | 'library' | 'exit' | 'assembly';

interface Room {
  id: string;
  label: string;
  type: RoomType;
  x: number;
  y: number;
  w: number;
  h: number;
}

const legend: { type: RoomType; label: string; color: string }[] = [
  { type: 'classroom', label: 'Ruang Kelas', color: 'hsl(var(--brand-500))' },
  { type: 'lab', label: 'Laboratorium', color: '#8b5cf6' },
  { type: 'library', label: 'Perpustakaan', color: '#0ea5e9' },
  { type: 'exit', label: 'Pintu Darurat', color: '#ef4444' },
  { type: 'assembly', label: 'Titik Kumpul', color: '#10b981' },
];

function getColor(type: RoomType) {
  return legend.find((l) => l.type === type)?.color || '#94a3b8';
}



type ToolMode = 'select' | 'waypoint' | 'exit' | 'path' | 'delete';

interface GraphNode {
  id: string;
  x: number;
  y: number;
  type: 'waypoint' | 'exit';
}

interface GraphEdge {
  id: string;
  from: string;
  to: string;
}

export function DigitalTwinView() {
  const { selection } = useSchool();
  const { currentUser, currentProfile } = useAuth();
  const { show } = useToast();
  const { t } = useI18n();
  
  const activeSchool = useMemo(() => {
    return selection?.school || null;
  }, [selection]);

  const role = currentUser?.role === 'student' ? 'student' : 'teacher';
  
  const [mapImage, setMapImage] = useState<string | null>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [simRunning, setSimRunning] = useState(false);
  const [selectedSim, setSelectedSim] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [pathStart, setPathStart] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeSchool) {
      setLoading(false);
      return;
    }
    
    const fetchFloorPlan = async () => {
      setLoading(true);
      try {
        const token = getToken();
        const res = await fetch(`${API_URL}/api/digital-twin/${activeSchool.id}`, {
          headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
        });
        if (res.ok) {
          const { data } = await res.json();
          if (data) {
            setMapImage(data.mapImage || null);
            setNodes(data.nodes || []);
            setEdges(data.edges || []);
            setLoading(false);
            return;
          }
        } else {
          setMapImage(null);
          setNodes([]);
          setEdges([]);
        }
      } catch (err) {
        console.error('Error fetching digital twin data:', err);
        setMapImage(null);
        setNodes([]);
        setEdges([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFloorPlan();
  }, [activeSchool]);

  const nextHopMap = useMemo(() => {
    if (!simRunning || nodes.length === 0) return {};
    
    // Build adjacency list
    const adj: Record<string, { to: string, weight: number }[]> = {};
    nodes.forEach(n => adj[n.id] = []);
    edges.forEach(e => {
      const n1 = nodes.find(n => n.id === e.from);
      const n2 = nodes.find(n => n.id === e.to);
      if (n1 && n2) {
        const dist = Math.hypot(n1.x - n2.x, n1.y - n2.y);
        adj[e.from].push({ to: e.to, weight: dist });
        adj[e.to].push({ to: e.from, weight: dist });
      }
    });

    // Multi-source Dijkstra from all exits
    const dist: Record<string, number> = {};
    const nextHop: Record<string, string> = {}; 
    
    const exits = nodes.filter(n => n.type === 'exit');
    if (exits.length === 0) return {};

    nodes.forEach(n => dist[n.id] = Infinity);
    const q: { id: string, d: number }[] = [];
    
    exits.forEach(e => {
      dist[e.id] = 0;
      q.push({ id: e.id, d: 0 });
    });

    while(q.length > 0) {
      q.sort((a, b) => a.d - b.d);
      const u = q.shift()!;
      
      if (u.d > dist[u.id]) continue;

      for (const neighbor of adj[u.id]) {
        const alt = dist[u.id] + neighbor.weight;
        if (alt < dist[neighbor.to]) {
          dist[neighbor.to] = alt;
          nextHop[neighbor.to] = u.id; 
          q.push({ id: neighbor.to, d: alt });
        }
      }
    }
    return nextHop;
  }, [simRunning, nodes, edges]);

  // Removed localStorage sync

  const saveFloorPlan = async () => {
    if (!activeSchool) return;
    setSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/digital-twin/${activeSchool.id}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ mapImage, nodes, edges })
      });
      
      if (!res.ok) throw new Error('Failed to save to server');
      
      show('Data Digital Twin disimpan ke server', 'success');
      setIsEditing(false);
    } catch (err) {
      show('Gagal menyimpan data ke server', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setMapImage(event.target?.result as string);
      setNodes([]); 
      setEdges([]);
      setIsEditing(true);
      setActiveTool('waypoint');
    };
    reader.readAsDataURL(file);
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (role !== 'teacher' || draggingId || simRunning || !isEditing) return;
    const svg = svgRef.current;
    if (!svg) return;
    const CTM = svg.getScreenCTM();
    if (!CTM) return;
    
    if (activeTool === 'select' || activeTool === 'path') {
      if (activeTool === 'path') {
        setPathStart(null); // Clicked on empty space, cancel path drawing
      }
      return;
    }

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(CTM.inverse());
    
    setNodes([...nodes, { 
      id: `node_${Date.now()}`, 
      x: svgP.x, 
      y: svgP.y, 
      type: activeTool === 'exit' ? 'exit' : 'waypoint' 
    }]);
  };

  const handleNodeClick = (e: React.MouseEvent, id: string) => {
    if (role !== 'teacher' || simRunning || !isEditing) return;
    e.stopPropagation();

    if (activeTool === 'path') {
      if (!pathStart) {
        setPathStart(id);
      } else {
        if (pathStart !== id) {
          // Check if edge already exists
          const exists = edges.some(edge => 
            (edge.from === pathStart && edge.to === id) || 
            (edge.from === id && edge.to === pathStart)
          );
          if (!exists) {
            setEdges([...edges, { id: `edge_${Date.now()}`, from: pathStart, to: id }]);
          }
        }
        setPathStart(null);
      }
    } else if (activeTool === 'delete') {
      removeNode(e, id);
    } else if (activeTool === 'select') {
      // Just handled by pointer down
    }
  };

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    if (role !== 'teacher' || simRunning || !isEditing) return;
    if (activeTool !== 'select') return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDraggingId(id);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId || !svgRef.current || simRunning || !isEditing || activeTool !== 'select') return;
    e.stopPropagation();
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return;
    
    const dx = e.movementX / CTM.a;
    const dy = e.movementY / CTM.d;

    setNodes(nodes.map(n => {
      if (n.id === draggingId) {
        return { ...n, x: n.x + dx, y: n.y + dy };
      }
      return n;
    }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingId) {
      e.stopPropagation();
      setDraggingId(null);
      (e.target as Element).releasePointerCapture(e.pointerId);
    }
  };
  
  const removeNode = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNodes(nodes.filter(n => n.id !== id));
    setEdges(edges.filter(edge => edge.from !== id && edge.to !== id));
    if (pathStart === id) setPathStart(null);
  };

  const removeEdge = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setEdges(edges.filter(edge => edge.id !== id));
  };

  const clearData = () => {
    if(confirm('Hapus gambar peta dan jalur?')) {
      setMapImage(null);
      setNodes([]);
      setEdges([]);
      setSimRunning(false);
      setPathStart(null);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-ink-500">Memuat denah sekolah...</div>;
  }

  if (!activeSchool) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center">
          <Box className="mx-auto h-12 w-12 text-ink-300 dark:text-slate-600 mb-4" />
          <h2 className="text-lg font-bold text-ink-900 dark:text-white mb-2">{t('school.unknown')}</h2>
          <p className="text-sm text-ink-500 dark:text-slate-400 max-w-sm mx-auto">
            {t('spatial.digital_twin_requires_school')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-6 text-white shadow-glass-lg sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:36px_36px] opacity-15" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              <Box className="h-3.5 w-3.5 animate-pulse" /> Kembar Digital 3D / Digital Twin Plan
            </div>
            <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              {activeSchool.name}
            </h2>
            <p className="mt-1.5 max-w-md text-sm text-brand-100">
              {role === 'teacher' 
                ? 'Unggah foto peta/denah sekolah, lalu rancang jaringan jalur evakuasi menggunakan alat desain di sebelah kiri.' 
                : 'Pelajari rute evakuasi darurat pada peta sekolah Anda.'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Kanvas Utama */}
        <div className="lg:col-span-8 space-y-6">
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <h3 className="font-display text-sm font-bold text-ink-900 dark:text-white">
                Kanvas Peta Sekolah
              </h3>
              
              <div className="flex flex-wrap gap-2">
                {role === 'teacher' && (
                  <>
                    <label className="whitespace-nowrap cursor-pointer flex items-center gap-2 text-xs font-bold bg-brand-50 text-brand-700 px-4 py-2 rounded-lg hover:bg-brand-100">
                      <Upload className="h-4 w-4 shrink-0" /> Unggah Peta
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                    {mapImage && (
                      <button onClick={clearData} className="whitespace-nowrap flex items-center gap-2 text-xs font-bold bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100">
                        <Trash2 className="h-4 w-4 shrink-0" /> Bersihkan
                      </button>
                    )}
                    {isEditing ? (
                      <button onClick={saveFloorPlan} disabled={saving || !mapImage} className="whitespace-nowrap flex items-center gap-2 text-xs font-bold bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 shadow-glow">
                        <Save className="h-4 w-4 shrink-0" /> {saving ? 'Menyimpan...' : 'Simpan Pembaruan'}
                      </button>
                    ) : (
                      mapImage && (
                        <button onClick={() => setIsEditing(true)} className="whitespace-nowrap flex items-center gap-2 text-xs font-bold bg-brand-50 text-brand-700 px-4 py-2 rounded-lg hover:bg-brand-100">
                          <Move className="h-4 w-4 shrink-0" /> Edit Peta
                        </button>
                      )
                    )}
                  </>
                )}
              </div>
            </div>

            {mapImage ? (
              <div className={`relative overflow-hidden rounded-xl border-2 ${isEditing ? 'border-brand-300' : 'border-brand-100'} bg-slate-50 dark:bg-slate-900 touch-none flex justify-center items-center`}>
                <svg 
                  ref={svgRef}
                  viewBox="0 0 800 500" 
                  className="w-full h-[450px]"
                  onClick={handleSvgClick}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                >
                  <image href={mapImage} x="0" y="0" width="800" height="500" preserveAspectRatio="xMidYMid slice" />
                  
                  {/* Render Edges */}
                  {edges.map(edge => {
                    const nodeA = nodes.find(n => n.id === edge.from);
                    const nodeB = nodes.find(n => n.id === edge.to);
                    if (!nodeA || !nodeB) return null;
                    
                    let animateDirection: 'AtoB' | 'BtoA' | null = null;
                    if (simRunning) {
                      if (nextHopMap[nodeA.id] === nodeB.id) animateDirection = 'AtoB';
                      else if (nextHopMap[nodeB.id] === nodeA.id) animateDirection = 'BtoA';
                    }

                    return (
                      <g key={edge.id}>
                        <line 
                          x1={nodeA.x} y1={nodeA.y} 
                          x2={nodeB.x} y2={nodeB.y} 
                          stroke={animateDirection ? "hsl(var(--brand-400))" : "hsl(var(--brand-600))"} 
                          strokeWidth={animateDirection ? "5" : "4"} 
                          strokeDasharray="8,6"
                          className={animateDirection ? "animate-pulse" : ""}
                        />
                        {/* Interactive path to delete */}
                        {isEditing && (activeTool === 'select' || activeTool === 'delete') && (
                          <line
                            x1={nodeA.x} y1={nodeA.y} 
                            x2={nodeB.x} y2={nodeB.y} 
                            stroke="transparent"
                            strokeWidth="15"
                            className="cursor-pointer hover:stroke-red-500/30"
                            onClick={(e) => removeEdge(e, edge.id)}
                          />
                        )}
                        {/* Simulation flowing animation ONLY towards exit */}
                        {animateDirection === 'AtoB' && (
                           <circle r="5" fill="hsl(var(--brand-200))">
                             <animateMotion 
                               dur="1s" 
                               repeatCount="indefinite"
                               path={`M ${nodeA.x},${nodeA.y} L ${nodeB.x},${nodeB.y}`}
                             />
                           </circle>
                        )}
                        {animateDirection === 'BtoA' && (
                           <circle r="5" fill="hsl(var(--brand-200))">
                             <animateMotion 
                               dur="1s" 
                               repeatCount="indefinite"
                               path={`M ${nodeB.x},${nodeB.y} L ${nodeA.x},${nodeA.y}`}
                             />
                           </circle>
                        )}
                      </g>
                    );
                  })}
                  
                  {/* Render Nodes */}
                  {nodes.map((node, idx) => {
                    const isExit = node.type === 'exit';
                    const isActive = pathStart === node.id;
                    const fill = isExit ? '#ef4444' : '#ffffff';
                    const stroke = isExit ? '#ffffff' : 'hsl(var(--brand-600))';

                    return (
                      <g key={node.id} 
                         onClick={(e) => handleNodeClick(e, node.id)}
                         onPointerDown={(e) => handlePointerDown(e, node.id)}
                         className={
                           activeTool === 'select' ? 'cursor-move' : 
                           activeTool === 'path' ? 'cursor-pointer hover:opacity-80' : 
                           'cursor-default'
                         }
                      >
                        {isActive && (
                          <circle cx={node.x} cy={node.y} r="14" fill="none" stroke="hsl(var(--brand-400))" strokeWidth="3" className="animate-pulse" />
                        )}
                        <circle cx={node.x} cy={node.y} r="8" fill={fill} stroke={stroke} strokeWidth="3" />
                        
                        {role === 'teacher' && !simRunning && isEditing && activeTool === 'select' && (
                          <circle 
                            cx={node.x + 15} 
                            cy={node.y - 15} 
                            r="6" 
                            fill="hsl(var(--destructive, 0 100% 50%))" 
                            className="cursor-pointer"
                            onClick={(e) => removeNode(e, node.id)}
                          />
                        )}
                        
                        {!isEditing && isExit && (
                           <text x={node.x} y={node.y - 12} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#ef4444" stroke="white" strokeWidth="3" paintOrder="stroke">
                            Pintu Keluar
                          </text>
                        )}
                        {simRunning && isExit && (
                          <circle cx={node.x} cy={node.y} r="12" fill="none" stroke="#ef4444" strokeWidth="2">
                            <animate attributeName="r" values="12;20;12" dur="1s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />
                          </circle>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[450px] border-2 border-dashed border-brand-200 dark:border-slate-700 rounded-xl bg-brand-50/30 dark:bg-slate-800/30">
                <MapPin className="h-12 w-12 text-brand-300 dark:text-slate-500 mb-3" />
                <p className="text-sm font-semibold text-ink-600 dark:text-slate-300 mb-4">Belum ada peta/denah sekolah.</p>
                {role === 'teacher' && (
                  <label className="cursor-pointer bg-brand-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow hover:bg-brand-700">
                    Unggah Peta Sekarang
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Panel Kanan (Simulasi Bencana) */}
        {/* Panel Kanan (Alat & Simulasi) */}
        <div className="lg:col-span-4 space-y-6">
          {role === 'teacher' && isEditing && (
            <Card className="h-auto">
              <h3 className="font-display text-sm font-bold text-ink-900 dark:text-white mb-4 border-b border-brand-50 pb-2 dark:border-slate-800">
                Alat Desain
              </h3>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => { setActiveTool('select'); setPathStart(null); }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTool === 'select' ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400' : 'text-ink-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                >
                  <Move className="h-4 w-4" /> Geser
                </button>
                <button 
                  onClick={() => { setActiveTool('waypoint'); setPathStart(null); }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTool === 'waypoint' ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400' : 'text-ink-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                >
                  <MapPin className="h-4 w-4" /> Titik Jalan
                </button>
                <button 
                  onClick={() => { setActiveTool('exit'); setPathStart(null); }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTool === 'exit' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'text-ink-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                >
                  <DoorOpen className="h-4 w-4" /> Titik Keluar
                </button>
                <button 
                  onClick={() => { setActiveTool('path'); setPathStart(null); }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTool === 'path' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-ink-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                >
                  <Route className="h-4 w-4" /> Hubungkan
                </button>
                <button 
                  onClick={() => { setActiveTool('delete'); setPathStart(null); }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTool === 'delete' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'text-ink-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                >
                  <Trash2 className="h-4 w-4" /> Hapus
                </button>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-ink-500 leading-relaxed">
                {activeTool === 'select' && "Klik dan tahan titik untuk memindahkannya."}
                {activeTool === 'waypoint' && "Klik pada area peta untuk menambah titik kumpul/jalan."}
                {activeTool === 'exit' && "Klik pada peta untuk menentukan area aman/luar sekolah."}
                {activeTool === 'path' && "Klik Titik A lalu klik Titik B untuk membuat garis jalur evakuasi."}
                {activeTool === 'delete' && "Klik pada titik atau garis untuk menghapusnya."}
              </div>
            </Card>
          )}

          <Card className="h-full">
            <div className="space-y-4">
              {isEditing ? (
                <>
                  <h3 className="font-display text-sm font-bold text-ink-900 dark:text-white flex items-center gap-2 border-b border-brand-50 pb-2 dark:border-slate-800">
                    <Shield className="h-4 w-4 text-brand-500" /> Tahap Validasi
                  </h3>
                  <div className="text-xs text-ink-500 bg-brand-50 p-4 rounded-lg leading-relaxed">
                    <p className="mb-2"><strong>Pastikan Peta Anda:</strong></p>
                    <ul className="list-disc pl-4 space-y-1 text-ink-600">
                      <li>Memiliki minimal 1 Titik Keluar.</li>
                      <li>Titik Jalan terhubung membentuk jalur.</li>
                      <li>Posisi titik sudah sesuai ruangan.</li>
                    </ul>
                    <p className="mt-4 text-brand-600 font-bold">Tekan tombol <span className="px-2 py-1 bg-brand-600 text-white rounded">Simpan Pembaruan</span> untuk mematikan mode edit dan mencoba Simulasi.</p>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="font-display text-sm font-bold text-ink-900 dark:text-white flex items-center gap-2 border-b border-brand-50 pb-2 dark:border-slate-800">
                    <Flame className="h-4 w-4 text-orange-500" /> Menu Simulasi Bencana
                  </h3>
                  
                  {!mapImage ? (
                    <div className="text-xs text-ink-500 bg-brand-50 p-3 rounded-lg">
                      Peta belum diunggah. Silakan hubungi admin sekolah.
                    </div>
                  ) : nodes.length < 2 ? (
                    <div className="text-xs text-ink-500 bg-brand-50 p-3 rounded-lg">
                      Jalur simulasi belum dirancang. Buka mode edit untuk membuat rute.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-xs text-ink-600">Pilih skenario darurat. Sistem akan menyimulasikan evakuasi secara otomatis menyusuri jalur (kabel) menuju titik keluar terdekat.</p>
                  
                      <div className="flex flex-col gap-3">
                        <label className="text-xs font-bold text-ink-700">Jenis Bencana:</label>
                        <select 
                          value={selectedSim || ''} 
                          onChange={(e) => setSelectedSim(e.target.value)}
                          disabled={simRunning}
                          className="px-3 py-2 text-sm rounded-lg border border-brand-100 dark:border-slate-800 bg-white dark:bg-slate-900"
                        >
                          <option value="">-- Pilih Skenario --</option>
                          <option value="gempa">Gempa Bumi</option>
                          <option value="kebakaran">Kebakaran Sayap Barat</option>
                          <option value="banjir">Banjir Bandang</option>
                        </select>
                      </div>

                      <button 
                        onClick={() => setSimRunning(!simRunning)}
                        disabled={!selectedSim}
                        className={`w-full flex justify-center items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          simRunning ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-brand-600 text-white hover:bg-brand-700 hover:-translate-y-0.5 shadow hover:shadow-glow'
                        }`}
                      >
                        {simRunning ? (
                          <>Hentikan Simulasi</>
                        ) : (
                          <><Play className="h-4 w-4" /> Mulai Simulasi</>
                        )}
                      </button>

                      {simRunning && (
                        <div className="mt-4 p-4 rounded-xl border border-brand-100 bg-brand-50 dark:bg-slate-800 dark:border-slate-700">
                          <h4 className="text-xs font-bold text-brand-700 dark:text-brand-400 mb-1 flex items-center gap-2">
                            <div className="h-2 w-2 bg-red-500 rounded-full animate-ping" />
                            Evakuasi Aktif
                          </h4>
                          <p className="text-[11px] text-ink-600 dark:text-slate-300">
                            Semua titik menyimulasikan pergerakan massa menuju Titik Keluar mengikuti garis jalur terhubung.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
