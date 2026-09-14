import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef, useState, useMemo } from "react";
import {
  Navigation,
  Waves,
  Mountain,
  Trees,
  Flame,
  Shield,
  Route,
  Home,
  Sparkles,
  MapPin,
  DoorOpen,
  FlaskConical,
  BookMarked,
  Play,
  RotateCcw,
  CheckCircle2,
  Box,
  Plus,
  Save,
  Trash2,
  Move,
  FileText,
  ArrowRight,
  HelpCircle,
  Info,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { useSchool } from "@/hooks/useSchool";
import { useAuth } from "@/hooks/useAuth";
import { type School } from "@/data/schools";
import { apiClient } from "@/services/apiClient";
import { useToast } from "@/hooks/useToast";
import { useI18n } from "@/hooks/useI18n";
import { fetchSchoolRisk } from "@/services/schoolService";

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
    label: "Earthquake Risk",
    level: "Low–Moderate",
    detail:
      "Moderate distance from active fault lines. Ground shaking possible but infrequent.",
    color: "text-brand-600",
    bg: "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400",
    percent: 42,
  },
  {
    icon: Waves,
    label: "Flood Risk",
    level: "Moderate",
    detail:
      "Bengawan Solo tributaries nearby. Seasonal monsoon raises inundation risk.",
    color: "text-brand-600",
    bg: "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400",
    percent: 68,
  },
  {
    icon: Trees,
    label: "Landslide Risk",
    level: "Moderate",
    detail:
      "Sloped terrain in southern Ngoro. Heavy rainfall increases slope instability.",
    color: "text-brand-600",
    bg: "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400",
    percent: 55,
  },
  {
    icon: Flame,
    label: "Volcanic Risk",
    level: "Moderate",
    detail:
      "Mt. Penanggungan & Arjuno complex ~25km away. Ashfall possible during major activity.",
    color: "text-brand-600",
    bg: "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400",
    percent: 60,
  },
  {
    icon: Waves,
    label: "Tsunami Risk",
    level: "Low",
    detail:
      "Inland location — tsunami risk minimal but coastal awareness still recommended.",
    color: "text-brand-600",
    bg: "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400",
    percent: 25,
  },
];

const emergencyRoutes = [
  {
    icon: Route,
    label: "Primary evacuation route",
    detail: "Jl. Raya Ngoro → Ngoro Sports Field",
    distance: "1.2 km",
    time: "8 min",
  },
  {
    icon: Home,
    label: "Nearest shelter",
    detail: "Ngoro Community Hall (Balai Desa)",
    distance: "0.8 km",
    time: "5 min",
  },
  {
    icon: Shield,
    label: "Secondary shelter",
    detail: "SMA Negeri 1 Ngoro assembly hall",
    distance: "On-site",
    time: "Immediate",
  },
];

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`glass rounded-2xl p-5 transition-all hover:shadow-glass dark:bg-slate-900/60 ${className}`}
    >
      {children}
    </div>
  );
}

function createIcon(color: string, emoji: string) {
  return L.divIcon({
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:14px;">${emoji}</div>`,
    className: "",
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
    if (!currentProfile?.schoolId || currentProfile.schoolId === "unknown")
      return null;
    return selection?.school || null;
  }, [currentProfile?.schoolId, selection]);

  const schoolLat = Number(school?.lat ?? school?.latitude ?? -7.5669);
  const schoolLng = Number(school?.lng ?? school?.longitude ?? 112.4084);
  const schoolName = school?.name ?? "School";

  const [riskData, setRiskData] = useState<any>(null);
  const [loadingRisk, setLoadingRisk] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (school?.id || school?.school_id) {
      setLoadingRisk(true);
      fetchSchoolRisk((school.id || school.school_id)!).then((data) => {
        if (mounted) {
          setRiskData(data);
          setLoadingRisk(false);
        }
      });
    }
    return () => {
      mounted = false;
    };
  }, [school?.id, school?.school_id]);

  const integrationStatus =
    riskData?.spatial_integration_status ||
    school?.spatial_integration_status ||
    "NOT_CONFIGURED";

  const isPending =
    integrationStatus === "PENDING_HAZARD_LAYERS" ||
    integrationStatus === "MISSING_COORDINATES" ||
    integrationStatus === "NOT_CONFIGURED";

  const getHazard = (key: string) => {
    if (loadingRisk)
      return {
        level: "Memuat...",
        detail: "Fetching disaster intelligence...",
        source: "...",
      };
    if (riskData?.hazards && riskData.hazards[key]) {
      return {
        level: riskData.hazards[key].level || "Data tidak tersedia",
        detail: riskData.hazards[key].detail || "Menunggu analisis",
        source: riskData.hazards[key].source || "AI Analysis",
      };
    }
    return {
      level: "Data tidak tersedia",
      detail: "No data source available for this hazard.",
      source: "Unverified",
    };
  };

  const hazards = [
    {
      icon: Mountain,
      label: "Earthquake Risk",
      level: getHazard("earthquake").level,
      detail: getHazard("earthquake").detail,
      source: getHazard("earthquake").source,
      bg: "bg-brand-100 text-brand-700 dark:bg-slate-800 dark:text-slate-400",
    },
    {
      icon: Waves,
      label: "Flood Risk",
      level: getHazard("flood").level,
      detail: getHazard("flood").detail,
      source: getHazard("flood").source,
      bg: "bg-sky-100 text-sky-700 dark:bg-slate-800 dark:text-slate-400",
    },
    {
      icon: Trees,
      label: "Landslide Risk",
      level: getHazard("landslide").level,
      detail: getHazard("landslide").detail,
      source: getHazard("landslide").source,
      bg: "bg-green-100 text-green-700 dark:bg-slate-800 dark:text-slate-400",
    },
    {
      icon: Flame,
      label: "Volcanic Risk",
      level: getHazard("volcano").level,
      detail: getHazard("volcano").detail,
      source: getHazard("volcano").source,
      bg: "bg-red-100 text-red-700 dark:bg-slate-800 dark:text-slate-400",
    },
    {
      icon: Waves,
      label: "Tsunami Risk",
      level: getHazard("tsunami").level,
      detail: getHazard("tsunami").detail,
      source: getHazard("tsunami").source,
      bg: "bg-blue-100 text-blue-700 dark:bg-slate-800 dark:text-slate-400",
    },
  ];

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const mapDiv = document.createElement("div");
    mapDiv.style.width = "100%";
    mapDiv.style.height = "100%";
    containerRef.current.appendChild(mapDiv);

    const map = L.map(mapDiv, {
      center: [schoolLat, schoolLng],
      zoom: 14,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      if (containerRef.current && mapDiv.parentNode === containerRef.current) {
        containerRef.current.removeChild(mapDiv);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.setView([schoolLat, schoolLng], 14);

    map.eachLayer((layer) => {
      if (
        layer instanceof L.Marker ||
        layer instanceof L.Circle ||
        layer instanceof L.Polyline
      ) {
        map.removeLayer(layer);
      }
    });

    L.marker([schoolLat, schoolLng], {
      icon: createIcon("hsl(var(--brand-500))", "\uf19d"),
    })
      .addTo(map)
      .bindPopup(
        `<div style="font-family:Inter,sans-serif;min-width:180px;">
          <strong style="font-size:13px;color:#1e293b;">${schoolName}</strong><br/>
          <span style="font-size:11px;color:#64748b;">${school?.regency ?? "Wilayah"}, ${school?.province ?? "Provinsi"}</span><br/>
          <span style="font-size:10px;color:#94a3b8;">${schoolLat.toFixed(4)}°, ${schoolLng.toFixed(4)}°</span>
        </div>`,
      )
      .openPopup();

    return () => {};
  }, [
    schoolLat,
    schoolLng,
    schoolName,
    integrationStatus,
    school?.regency,
    school?.province,
  ]);

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
            Interactive hazard map for {schoolName}, powered by regional
            satellite and GIS data.
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
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-brand-600" />{" "}
                  High
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-brand-400" />{" "}
                  Moderate
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-brand-200" /> Low
                </span>
              </div>
            </div>
            <div
              ref={containerRef}
              className="h-[400px] w-full overflow-hidden rounded-xl border border-brand-100 dark:border-slate-700"
              style={{ background: "#0f172a" }}
            />
            <div className="mt-4 flex flex-wrap gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-ink-600 dark:text-slate-300">
                <span className="text-base">🏫</span> School
              </span>
              <span className="flex items-center gap-1.5 text-ink-600 dark:text-slate-300">
                <span className="text-base">🌊</span> Flood Zone
              </span>
              <span className="flex items-center gap-1.5 text-ink-600 dark:text-slate-300">
                <span className="text-base">⛰️</span> Earthquake Zone
              </span>
              <span className="flex items-center gap-1.5 text-ink-600 dark:text-slate-300">
                <span className="text-base">🌳</span> Landslide Zone
              </span>
              <span className="flex items-center gap-1.5 text-ink-600 dark:text-slate-300">
                <span className="text-base">🌋</span> Volcanic Zone
              </span>
              <span className="flex items-center gap-1.5 text-ink-600 dark:text-slate-300">
                <span className="text-base">🌊</span> Tsunami Zone
              </span>
              <span className="flex items-center gap-1.5 text-ink-600 dark:text-slate-300">
                <span className="text-base">🚩</span> Assembly Point
              </span>
              <span className="flex items-center gap-1.5 text-ink-600 dark:text-slate-300">
                <span className="text-base">🏠</span> Shelter
              </span>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-brand-600" />
              <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">
                Your School
              </h3>
            </div>
            <div className="rounded-xl bg-brand-50/60 p-4 dark:bg-slate-800/60">
              <p className="font-display text-sm font-bold text-ink-900 dark:text-white">
                {schoolName}
              </p>
              <p className="mt-0.5 text-xs text-ink-500 dark:text-slate-400">
                {school?.regency ?? "Unknown"}, {school?.province ?? "Unknown"}
              </p>

              {riskData?.ai_summary && (
                <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50 p-4 dark:border-brand-900/30 dark:bg-brand-900/10">
                  <p className="text-xs leading-relaxed text-ink-600 dark:text-slate-300">
                    <strong className="text-brand-700 dark:text-brand-400">
                      Analisis AI:{" "}
                    </strong>
                    {riskData.ai_summary}
                  </p>
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${loadingRisk ? "bg-slate-100 text-slate-700" : "bg-brand-100 text-brand-700"} dark:bg-slate-700 dark:text-slate-300`}
                >
                  {loadingRisk
                    ? "Generating Disasater Intelligence..."
                    : "AI Normalized Intelligence"}
                </span>
                <span className="text-xs text-ink-500 dark:text-slate-400">
                  {schoolLat.toFixed(4)}°, {schoolLng.toFixed(4)}°
                </span>
              </div>
            </div>
            <div className="mt-4 space-y-2.5">
              {hazards.map((h) => (
                <div
                  key={h.label}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex items-center gap-2 text-ink-600 dark:text-slate-300">
                    <h.icon className="h-4 w-4 text-brand-500" />
                    {h.label}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${h.bg}`}
                  >
                    {h.level}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <Route className="h-5 w-5 text-brand-600" />
              <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">
                Emergency Routes
              </h3>
            </div>
            <div className="space-y-3">
              {emergencyRoutes.map((r) => (
                <div
                  key={r.label}
                  className="flex items-start gap-3 rounded-lg border border-brand-50 p-3 dark:border-slate-800"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-slate-800 dark:text-brand-400">
                    <r.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-ink-900 dark:text-white">
                      {r.label}
                    </p>
                    <p className="truncate text-[11px] text-ink-500 dark:text-slate-400">
                      {r.detail}
                    </p>
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
        <h3 className="mb-4 font-display text-lg font-bold text-ink-900 dark:text-white">
          Real-Time BNPB InaRISK Profile
        </h3>

        {loadingRisk ? (
          <Card className="flex flex-col items-center justify-center py-12 text-center bg-slate-50 dark:bg-slate-800/50">
            <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/40 mb-3">
              <MapPin className="h-6 w-6 text-brand-500" />
            </div>
            <h4 className="font-display text-base font-bold text-ink-900 dark:text-white">
              Connecting to BNPB Server...
            </h4>
            <p className="mt-1 max-w-md text-sm text-ink-500 dark:text-slate-400">
              Querying InaRISK ArcGIS ImageServer endpoints for real-time risk
              assessment.
            </p>
          </Card>
        ) : isPending ? (
          <Card className="flex flex-col items-center justify-center py-12 text-center bg-slate-50 dark:bg-slate-800/50">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700 mb-3">
              <MapPin className="h-6 w-6 text-slate-400" />
            </div>
            <h4 className="font-display text-base font-bold text-ink-900 dark:text-white">
              Spatial Data Pending / Unreachable
            </h4>
            <p className="mt-1 max-w-md text-sm text-ink-500 dark:text-slate-400">
              Hazard intersection requires an official GIS integration layer
              (e.g. InaRISK Web Services) to be reachable.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {hazards.map((h) => (
              <Card key={h.label}>
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${h.bg}`}
                  >
                    <h.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-ink-900 dark:text-white">
                      {h.label}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${h.bg}`}
                    >
                      {h.level}
                    </span>
                  </div>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-ink-500 dark:text-slate-400">
                  {h.detail}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* AI recommendations */}
      <Card className="relative overflow-hidden">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-100/50 blur-2xl" />
        <div className="relative">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-600" />
            <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">
              AI Risk Recommendations
            </h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: Flame,
                title: "Volcanic ash preparedness drill",
                reason:
                  "Review shelter-in-place and evacuation protocols for ashfall.",
                accent: "from-brand-600 to-brand-800",
              },
              {
                icon: Trees,
                title: "Landslide early warning review",
                reason:
                  "Slopes are vulnerable during monsoon — review evacuation routes.",
                accent: "from-brand-500 to-brand-600",
              },
              {
                icon: Waves,
                title: "Flood evacuation route mapping",
                reason:
                  "Tributaries can inundate low-lying zones — map safe routes now.",
                accent: "from-brand-400 to-brand-500",
              },
            ].map((r) => (
              <div
                key={r.title}
                className="group flex items-start gap-3 rounded-xl border border-brand-50 p-4 transition-colors hover:bg-brand-50/60 dark:border-slate-800 dark:hover:bg-slate-800/60"
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${r.accent} text-white`}
                >
                  <r.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink-900 dark:text-white">
                    {r.title}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-500 dark:text-slate-400">
                    {r.reason}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
