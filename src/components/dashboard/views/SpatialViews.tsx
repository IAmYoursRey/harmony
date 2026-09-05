import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef, useState, useMemo } from 'react';
import { Navigation, Waves, Mountain, Trees, Flame, Shield, Route, Home, Sparkles, MapPin, DoorOpen, FlaskConical, BookMarked, Play, RotateCcw, CheckCircle2, Box, Plus, Save, Trash2, Move, FileText, ArrowRight, HelpCircle, Info, type LucideIcon } from 'lucide-react';
import { useSchool } from '@/context/SchoolContext';
import { useAuth } from '@/context/AuthContext';
import { findSchool, type School } from '@/data/schools';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import { realSchoolsMojokerto } from '@/data/realSchoolsMojokerto';
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

  const school = useMemo(() => {
    if (!currentProfile?.schoolId || currentProfile.schoolId === 'unknown') return null;
    return realSchoolsMojokerto.find(s => s.id === currentProfile.schoolId) || null;
  }, [currentProfile?.schoolId]);

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


export function DigitalTwinView() {
  const { selection } = useSchool();
  const { currentProfile } = useAuth();
  const { show } = useToast();
  const { t } = useI18n();
  
  const activeSchool = useMemo(() => {
    if (selection?.school) return selection.school;
    if (currentProfile?.schoolId && currentProfile.schoolId !== 'unknown') {
      return findSchool(currentProfile.schoolId);
    }
    return null;
  }, [selection, currentProfile]);

  const role = currentProfile?.role === 'student' ? 'student' : 'teacher';
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selected, setSelected] = useState<Room | null>(null);
  const [simRunning, setSimRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        if (isSupabaseConfigured) {
          const { data, error } = await supabase
            .from('floor_plans')
            .select('data')
            .eq('school_id', activeSchool.id)
            .single();

          if (data && data.data && data.data.elements) {
            setRooms(data.data.elements);
            setLoading(false);
            return;
          }
        }
        
        // Fallback or if not configured
        const localData = localStorage.getItem(`floorplan_${activeSchool.id}`);
        if (localData) {
          setRooms(JSON.parse(localData));
        } else {
          setRooms([]);
        }
      } catch (err) {
        console.error('Error fetching floor plan:', err);
        const localData = localStorage.getItem(`floorplan_${activeSchool.id}`);
        if (localData) {
          setRooms(JSON.parse(localData));
        } else {
          setRooms([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchFloorPlan();
  }, [activeSchool]);

  useEffect(() => {
    if (!activeSchool) return;
    localStorage.setItem(`floorplan_${activeSchool.id}`, JSON.stringify(rooms));
  }, [rooms, activeSchool]);

  const saveFloorPlan = async () => {
    if (!activeSchool) return;
    setSaving(true);
    
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('floor_plans')
          .upsert({ 
            school_id: activeSchool.id, 
            data: { elements: rooms }
          }, { onConflict: 'school_id' });

        if (error) throw error;
        show('Denah sekolah berhasil disimpan ke database', 'success');
      } else {
        show('Denah sekolah disimpan secara lokal (mode offline)', 'success');
      }
    } catch (err) {
      console.error('Error saving to Supabase, fallback to localStorage', err);
      show('Denah sekolah disimpan secara lokal (mode offline)', 'success');
    } finally {
      setSaving(false);
    }
  };

  const addElement = (type: RoomType) => {
    const newId = `el_${Date.now()}`;
    const count = rooms.filter(r => r.type === type).length + 1;
    
    let defaultLabel = '';
    if (type === 'classroom') defaultLabel = `Kelas ${count}`;
    else if (type === 'exit') defaultLabel = `Pintu Darurat ${count}`;
    else if (type === 'assembly') defaultLabel = `Titik Kumpul ${count}`;
    else if (type === 'lab') defaultLabel = `Laboratorium ${count}`;
    else if (type === 'library') defaultLabel = 'Perpustakaan';

    const newRoom: Room = {
      id: newId,
      label: defaultLabel,
      type,
      x: 50 + (count * 15) % 150,
      y: 50 + (count * 15) % 150,
      w: type === 'exit' || type === 'assembly' ? 30 : 70,
      h: type === 'exit' || type === 'assembly' ? 30 : 50,
    };
    setRooms([...rooms, newRoom]);
    setSelected(newRoom);
  };

  const updateSelected = (updates: Partial<Room>) => {
    if (!selected) return;
    const updated = { ...selected, ...updates };
    setSelected(updated);
    setRooms(rooms.map(r => r.id === selected.id ? updated : r));
  };

  const deleteSelected = () => {
    if (!selected) return;
    setRooms(rooms.filter(r => r.id !== selected.id));
    setSelected(null);
  };

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    if (role !== 'teacher') return;
    e.target.setPointerCapture(e.pointerId);
    setDraggingId(id);
    setSelected(rooms.find(r => r.id === id) || null);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId || !svgRef.current) return;
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return;
    
    const dx = e.movementX / CTM.a;
    const dy = e.movementY / CTM.d;

    setRooms(rooms.map(r => {
      if (r.id === draggingId) {
        const updated = { ...r, x: Math.max(0, Math.min(460, r.x + dx)), y: Math.max(0, Math.min(310, r.y + dy)) };
        if (selected?.id === draggingId) setSelected(updated);
        return updated;
      }
      return r;
    }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setDraggingId(null);
    e.target.releasePointerCapture(e.pointerId);
  };

  const evacuationGuidelines = useMemo(() => {
    const classrooms = rooms.filter(r => ['classroom', 'lab', 'library'].includes(r.type));
    const exits = rooms.filter(r => r.type === 'exit');
    const assemblies = rooms.filter(r => r.type === 'assembly');

    if (exits.length === 0 || assemblies.length === 0) {
      return {
        ready: false,
        message: 'Lengkapi denah dengan minimal 1 Pintu Darurat dan 1 Titik Kumpul untuk menghasilkan panduan rute evakuasi.'
      };
    }

    const routes = classrooms.map(room => {
      let closestExit = exits[0];
      let minExitDist = Infinity;
      exits.forEach(ex => {
        const dist = Math.hypot((room.x + room.w/2) - (ex.x + ex.w/2), (room.y + room.h/2) - (ex.y + ex.h/2));
        if (dist < minExitDist) {
          minExitDist = dist;
          closestExit = ex;
        }
      });

      let closestAssembly = assemblies[0];
      let minAsmDist = Infinity;
      assemblies.forEach(asm => {
        const dist = Math.hypot((closestExit.x + closestExit.w/2) - (asm.x + asm.w/2), (closestExit.y + closestExit.h/2) - (asm.y + asm.h/2));
        if (dist < minAsmDist) {
          minAsmDist = dist;
          closestAssembly = asm;
        }
      });

      return {
        room: room.label,
        exit: closestExit.label,
        assembly: closestAssembly.label,
        distanceEst: Math.round((minExitDist + minAsmDist) * 0.15)
      };
    });

    return {
      ready: true,
      routes
    };
  }, [rooms]);

  if (loading) {
    return <div className="p-8 text-center text-ink-500">Memuat denah sekolah...</div>;
  }

  if (!activeSchool) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center">
          <Box className="mx-auto h-12 w-12 text-ink-300 dark:text-slate-600 mb-4" />
          <h2 className="text-lg font-bold text-ink-900 dark:text-white mb-2">{t('school.unknown', 'Belum Memilih Sekolah')}</h2>
          <p className="text-sm text-ink-500 dark:text-slate-400 max-w-sm mx-auto">
            {t('spatial.digital_twin_requires_school', 'Fitur Kembaran Digital membutuhkan data sekolah Anda. Silakan hubungi Dev untuk mengatur sekolah Anda.')}
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
                ? 'Rancang denah sekolah Anda dengan menyeret elemen. Panduan evakuasi akan dihitung secara otomatis.' 
                : 'Pelajari rute evakuasi darurat hasil kalkulasi sensor Kembar Digital.'}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setSimRunning((s) => !s)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-bold text-brand-700 shadow-glass transition-all hover:-translate-y-0.5 hover:shadow-glow"
            >
              {simRunning ? <RotateCcw className="h-4.5 w-4.5" /> : <Play className="h-4.5 w-4.5 fill-brand-600 text-brand-600" />}
              {simRunning ? 'Reset Alur' : 'Simulasi Evakuasi'}
            </button>
          </div>
        </div>
      </div>

      {rooms.length === 0 && role === 'student' ? (
        <Card className="text-center py-12">
          <Box className="mx-auto h-12 w-12 text-ink-300 dark:text-slate-600 mb-4" />
          <h3 className="font-display text-lg font-bold text-ink-900 dark:text-white">{t('spatial.floorplan_unavailable', 'Denah Belum Tersedia')}</h3>
          <p className="text-sm text-ink-500 dark:text-slate-400">{t('spatial.contact_admin_floorplan', 'Silakan hubungi admin sekolah untuk mengunggah atau mengatur denah.')}</p>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-sm font-bold text-ink-900 dark:text-white">
                  Kanvas Pembuat Rencana Gedung
                </h3>
                {role === 'teacher' && (
                  <button onClick={saveFloorPlan} disabled={saving} className="flex items-center gap-2 text-xs font-bold bg-brand-600 text-white px-4 py-2 rounded-full hover:bg-brand-700">
                    <Save className="h-4 w-4" /> {saving ? 'Menyimpan...' : 'Simpan Denah'}
                  </button>
                )}
              </div>

              {role === 'teacher' && (
                <div className="mb-4 flex flex-wrap gap-2">
                  <button onClick={() => addElement('classroom')} className="text-[11px] bg-brand-50 text-brand-700 px-3 py-1.5 rounded-lg font-bold hover:bg-brand-100">
                    + Ruang Kelas
                  </button>
                  <button onClick={() => addElement('lab')} className="text-[11px] bg-brand-50 text-brand-700 px-3 py-1.5 rounded-lg font-bold hover:bg-brand-100">
                    + Laboratorium
                  </button>
                  <button onClick={() => addElement('library')} className="text-[11px] bg-brand-50 text-brand-700 px-3 py-1.5 rounded-lg font-bold hover:bg-brand-100">
                    + Perpustakaan
                  </button>
                  <button onClick={() => addElement('exit')} className="text-[11px] bg-red-50 text-red-700 px-3 py-1.5 rounded-lg font-bold hover:bg-red-100">
                    + Pintu Darurat
                  </button>
                  <button onClick={() => addElement('assembly')} className="text-[11px] bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-100">
                    + Titik Kumpul
                  </button>
                </div>
              )}

              <div className="overflow-hidden rounded-xl border border-brand-100 bg-gradient-to-b from-slate-50 to-brand-50 dark:from-slate-900 dark:to-slate-800 touch-none">
                <svg 
                  ref={svgRef}
                  viewBox="0 0 500 350" 
                  className="w-full h-[380px]"
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                >
                  <defs>
                    <pattern id="floorP" width="20" height="20" patternUnits="userSpaceOnUse">
                      <rect width="20" height="20" fill="transparent" />
                      <line x1="0" y1="20" x2="20" y2="20" stroke="#cbd5e1" strokeWidth="0.5" strokeOpacity={0.5} />
                      <line x1="20" y1="0" x2="20" y2="20" stroke="#cbd5e1" strokeWidth="0.5" strokeOpacity={0.5} />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#floorP)" onClick={() => setSelected(null)} />

                  {simRunning && evacuationGuidelines.ready && evacuationGuidelines.routes && (
                    <g opacity="0.6">
                      {rooms.filter(r => ['classroom', 'lab', 'library'].includes(r.type)).map(room => {
                        const route = evacuationGuidelines.routes.find(rt => rt.room === room.label);
                        if (!route) return null;
                        const exitObj = rooms.find(ex => ex.label === route.exit);
                        const asmObj = rooms.find(asm => asm.label === route.assembly);
                        if (!exitObj || !asmObj) return null;

                        return (
                          <g key={`path_${room.id}`}>
                            <path
                              d={`M ${room.x + room.w/2} ${room.y + room.h/2} L ${exitObj.x + exitObj.w/2} ${exitObj.y + exitObj.h/2} L ${asmObj.x + asmObj.w/2} ${asmObj.y + asmObj.h/2}`}
                              fill="none"
                              stroke="hsl(var(--brand-600))"
                              strokeWidth="3"
                              strokeDasharray="5,5"
                              className="animate-pulse"
                            />
                          </g>
                        );
                      })}
                    </g>
                  )}

                  {rooms.map((room) => {
                    const isSelected = selected?.id === room.id;
                    const color = getColor(room.type);
                    return (
                      <g
                        key={room.id}
                        onPointerDown={(e) => handlePointerDown(e, room.id)}
                        className={role === 'teacher' ? 'cursor-move' : 'cursor-pointer'}
                        onClick={(e) => { e.stopPropagation(); setSelected(room); }}
                      >
                        {room.type === 'exit' || room.type === 'assembly' ? (
                          <circle
                            cx={(room.x || 0) + (room.w || 0)/2}
                            cy={(room.y || 0) + (room.h || 0)/2}
                            r={(room.w || 0)/2}
                            fill={color}
                            fillOpacity={isSelected ? 0.4 : 0.2}
                            stroke={color}
                            strokeWidth={isSelected ? 3 : 2}
                          />
                        ) : (
                          <rect
                            x={room.x || 0}
                            y={room.y || 0}
                            width={room.w || 0}
                            height={room.h || 0}
                            rx="6"
                            fill={color}
                            fillOpacity={isSelected ? 0.35 : 0.15}
                            stroke={color}
                            strokeWidth={isSelected ? 3 : 1.5}
                          />
                        )}
                        <text
                          x={room.x + room.w / 2}
                          y={room.y + room.h / 2 + 4}
                          textAnchor="middle"
                          fontFamily="Inter, sans-serif"
                          fontSize="9"
                          fontWeight="800"
                          fill={color}
                          pointerEvents="none"
                        >
                          {room.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="flex flex-wrap gap-4 text-xs font-semibold mt-3 text-ink-600 justify-center">
                {legend.map(l => (
                  <div key={l.type} className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-full inline-block" style={{ backgroundColor: l.color }} />
                    <span>{l.label}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-2 border-b border-brand-50 pb-3 dark:border-slate-800">
                <Route className="h-5 w-5 text-brand-600" />
                <h3 className="font-display text-sm font-bold text-ink-900 dark:text-white">
                  📋 Panduan Rute Evakuasi Hasil Rekomendasi Sensor Kembar Digital
                </h3>
              </div>

              {evacuationGuidelines.ready && evacuationGuidelines.routes ? (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-ink-500 leading-relaxed">
                    Panduan evakuasi berikut dianalisis secara dinamis berdasarkan kalkulasi posisi spasial tiap ruangan terhadap Pintu Darurat dan Titik Kumpul terdekat:
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {evacuationGuidelines.routes.map((route, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-brand-50 bg-white/40 dark:bg-slate-800/40 dark:border-slate-800 text-xs">
                        <div className="flex items-center justify-between font-bold text-brand-700 dark:text-brand-400">
                          <span>Dari: {route.room}</span>
                          <span className="text-[10px] text-ink-400">Estimasi {route.distanceEst} meter</span>
                        </div>
                        <div className="mt-2 flex flex-col gap-1 text-ink-600 dark:text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            <span>Gunakan pintu evakuasi: <strong>{route.exit}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Berkumpul di area terbuka: <strong>{route.assembly}</strong></span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex items-start gap-2 text-xs text-ink-500 leading-relaxed border border-dashed border-brand-100 p-4 rounded-xl">
                  <Info className="h-4 w-4 shrink-0 text-brand-500 mt-0.5" />
                  <span>{evacuationGuidelines.message}</span>
                </div>
              )}
            </Card>
          </div>

          {/* Details / Editor panel */}
          <div>
            <Card className="h-full">
              {role === 'teacher' && selected ? (
                <div className="space-y-4">
                  <h3 className="font-display text-sm font-bold text-ink-900 dark:text-white flex items-center gap-2 border-b border-brand-50 pb-2 dark:border-slate-800">
                    <span className="h-3.5 w-3.5 rounded-full" style={{backgroundColor: getColor(selected.type)}} />
                    Ubah Properti Elemen
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="font-bold text-ink-500">Nama/Label Ruangan</label>
                      <input 
                        type="text" 
                        value={selected.label}
                        onChange={(e) => updateSelected({ label: e.target.value })}
                        className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-950 border border-brand-100 dark:border-slate-800 rounded-lg text-xs font-semibold"
                      />
                    </div>
                    {(selected.type === 'classroom' || selected.type === 'lab' || selected.type === 'library') && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-ink-500">Lebar (W)</label>
                          <input type="number" value={selected.w} onChange={(e) => updateSelected({ w: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-950 border border-brand-100 dark:border-slate-800 rounded-lg text-xs" />
                        </div>
                        <div>
                          <label className="font-bold text-ink-500">Tinggi (H)</label>
                          <input type="number" value={selected.h} onChange={(e) => updateSelected({ h: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-950 border border-brand-100 dark:border-slate-800 rounded-lg text-xs" />
                        </div>
                      </div>
                    )}
                    <button onClick={deleteSelected} className="w-full flex justify-center items-center gap-1.5 mt-4 bg-red-50 text-red-650 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors">
                      <Trash2 className="h-4 w-4" /> Hapus Elemen
                    </button>
                  </div>
                </div>
              ) : selected ? (
                <div className="space-y-4">
                  <h3 className="font-display text-sm font-bold text-ink-900 dark:text-white flex items-center gap-2 border-b border-brand-50 pb-2 dark:border-slate-800">
                    <span className="h-3.5 w-3.5 rounded-full" style={{backgroundColor: getColor(selected.type)}} />
                    {selected.label}
                  </h3>
                  <div className="space-y-2 text-xs text-ink-600 dark:text-slate-300 leading-relaxed">
                    <p>
                      {selected.type === 'exit' && 'Ini adalah Pintu Darurat yang dirancang untuk jalur evakuasi aman menuju lapangan.'}
                      {selected.type === 'assembly' && 'Ini adalah Titik Kumpul luar ruangan aman untuk mengevakuasi seluruh warga sekolah.'}
                      {['classroom', 'lab', 'library'].includes(selected.type) && 'Ruangan sekolah. Sensor Kembar Digital akan merekomendasikan rute menuju Pintu Darurat terdekat secara real-time.'}
                    </p>
                    <div className="pt-2 border-t border-brand-50/50 mt-2">
                      <p><strong>Posisi X:</strong> {Math.round(selected.x)} px</p>
                      <p><strong>Posisi Y:</strong> {Math.round(selected.y)} px</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center py-12">
                  <Box className="mb-3 h-8 w-8 text-ink-300 dark:text-slate-650 animate-pulse" />
                  <p className="text-xs font-semibold text-ink-500 dark:text-slate-400 leading-relaxed max-w-[200px]">
                    {role === 'teacher' ? 'Seret elemen di kanvas atau pilih elemen untuk mulai mengedit properti.' : 'Pilih salah satu ruangan pada kanvas denah di samping untuk melihat rincian jalur evakuasinya.'}
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}


