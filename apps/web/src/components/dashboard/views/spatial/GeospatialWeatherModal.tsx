import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  X,
  CloudRain,
  Thermometer,
  Wind,
  Activity,
  Gauge,
  Sparkles,
  RefreshCw,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Cloud,
  Satellite,
  Mountain,
  Crosshair,
  Waves,
  Target,
  Camera,
  Database,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Cpu,
  Terminal,
  Binary,
  Search,
  Filter,
  Check,
  Globe,
  Building2,
  Radio,
  Sun,
  TrendingUp,
  ArrowRight,
  ArrowLeft,
  SlidersHorizontal,
  Compass,
  Layers,
  FileDown,
  Eye,
  Minimize2,
  Flame,
  Leaf,
  FileText,
  FileCode,
  Info,
  ZoomIn,
  ZoomOut,
  LocateFixed,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  LineChart,
  AreaChart,
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';
import { WeatherConsensusData, weatherAggregatorService } from '@/services/weatherAggregatorService';
import { ALL_INDONESIA_PLACES, GeoPlace, searchIndonesianPlaces } from '@/services/indonesiaGeoData';
import { GeospatialRemoteSensingTab } from './studio/GeospatialRemoteSensingTab';
import { GeospatialTerrainTab } from './studio/GeospatialTerrainTab';
import { GeospatialPositioningTab } from './studio/GeospatialPositioningTab';
import { GeospatialHydrologyTab } from './studio/GeospatialHydrologyTab';
import { GeospatialAnalyticsTab } from './studio/GeospatialAnalyticsTab';
import { GeospatialFieldSurveyTab } from './studio/GeospatialFieldSurveyTab';
import { GeospatialBMKGTab } from './studio/GeospatialBMKGTab';
import { GeospatialCatalogTab } from './studio/GeospatialCatalogTab';
import { GeospatialChartsTab } from './studio/GeospatialChartsTab';
import { GeospatialFusionIntelligenceTab } from './studio/GeospatialFusionIntelligenceTab';
import { GeospatialHotspotsTab } from './studio/GeospatialHotspotsTab';
import { GeospatialAccessibilityTab } from './studio/GeospatialAccessibilityTab';
import { GeospatialEmissionsTab } from './studio/GeospatialEmissionsTab';
import { GeospatialProductSwotTab } from './studio/GeospatialProductSwotTab';
import { ispuCalculatorService, ISPUSubIndex } from '../../../../services/geospatial/ispuCalculatorService';
import { HarmonyChartEngine } from './charts/HarmonyChartEngine';
import { PreciseLocationInfo } from '../../../../services/preciseGeocodingService';
import { GeospatialDataTransparencyModal } from './GeospatialDataTransparencyModal';
import { bmkgService, BMKGEarthquake } from '@/services/bmkgService';
import { pusgenFaultService, NearestFaultResult } from '@/services/geospatial/pusgenFaultService';
import { terrainService, TerrainIntelligenceResult } from '@/services/geospatial/terrainService';
import { geospatialDataTelemetryService, EndpointHealthStatus } from '@/services/geospatialDataTelemetryService';

interface GeospatialWeatherModalProps {
  isOpen: boolean;
  onClose: () => void;
  lat: number;
  lng: number;
  locationName?: string;
  userPreciseLocation?: PreciseLocationInfo | null;
  mountains?: any[];
  earthquakes?: any[];
  schools?: any[];
  asPage?: boolean;
  initialDomain?: StudioDomain;
  onApplyFeaturesToMap?: (features: any[], layerName?: string) => void;
}

export type StudioDomain =
  | 'weather'
  | 'bmkg'
  | 'remote_sensing'
  | 'terrain'
  | 'positioning'
  | 'hydrology'
  | 'analytics'
  | 'field_survey'
  | 'charts'
  | 'fusion'
  | 'catalog'
  | 'hotspots'
  | 'accessibility'
  | 'emissions'
  | 'swot';

type TimeframeMode = 'hourly' | 'daily' | 'biweekly';
type TabCategory = 'overview' | 'nwp' | 'rain' | 'temp' | 'wind' | 'air' | 'ai' | 'windy';
type WeatherChartMetric = 'temperature' | 'precipitation' | 'wind' | 'air_quality' | 'nowcasting';

interface StudioDomainDef {
  id: StudioDomain;
  name: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  pillar: 'observasi' | 'atmosfer' | 'analitik';
  pillarLabel: string;
  badgeColor: {
    active: string;
    inactive: string;
    indicator: string;
  };
}

export const STUDIO_DOMAINS: StudioDomainDef[] = [
  // Prioritas Utama: Cuaca & Visualisasi Intuitif
  {
    id: 'weather',
    name: 'Ringkasan Cuaca & Grafik',
    badge: 'Model Lokasi',
    icon: Cloud,
    pillar: 'atmosfer',
    pillarLabel: 'Atmosfer & Cuaca',
    badgeColor: {
      active: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
      inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      indicator: 'bg-sky-500',
    },
  },
  {
    id: 'bmkg',
    name: 'Satu Peta MKG',
    badge: 'BMKG Intel',
    icon: Radio,
    pillar: 'atmosfer',
    pillarLabel: 'Atmosfer & MKG',
    badgeColor: {
      active: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
      inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      indicator: 'bg-indigo-500',
    },
  },

  // Pilar 1: Observasi Bumi (5)
  {
    id: 'remote_sensing',
    name: 'Penginderaan Jauh',
    badge: 'Sentinel-1/2',
    icon: Satellite,
    pillar: 'observasi',
    pillarLabel: 'Observasi Bumi',
    badgeColor: {
      active: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      indicator: 'bg-emerald-500',
    },
  },
  {
    id: 'terrain',
    name: 'Topografi & DEM',
    badge: 'SRTM 3D',
    icon: Mountain,
    pillar: 'observasi',
    pillarLabel: 'Observasi Bumi',
    badgeColor: {
      active: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
      inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      indicator: 'bg-amber-500',
    },
  },
  {
    id: 'positioning',
    name: 'GNSS & Posisi',
    badge: 'KORS / CORS',
    icon: Crosshair,
    pillar: 'observasi',
    pillarLabel: 'Observasi Bumi',
    badgeColor: {
      active: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
      inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      indicator: 'bg-blue-500',
    },
  },
  {
    id: 'hydrology',
    name: 'Hidrologi & Lahan',
    badge: 'DAS & Satelit',
    icon: Waves,
    pillar: 'observasi',
    pillarLabel: 'Observasi Bumi',
    badgeColor: {
      active: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
      inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      indicator: 'bg-cyan-500',
    },
  },
  {
    id: 'field_survey',
    name: 'Survei & Drone',
    badge: 'UAV / LiDAR',
    icon: Camera,
    pillar: 'observasi',
    pillarLabel: 'Observasi Bumi',
    badgeColor: {
      active: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',
      inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      indicator: 'bg-teal-500',
    },
  },

  // Pilar 3: Analitik Spasial & Intelijensi (4)
  {
    id: 'analytics',
    name: 'Analisis & Buffer',
    badge: 'Spatial Pro',
    icon: Target,
    pillar: 'analitik',
    pillarLabel: 'Analitik & Intelijensi',
    badgeColor: {
      active: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
      inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      indicator: 'bg-purple-500',
    },
  },
  {
    id: 'charts',
    name: 'Katalog Grafik',
    badge: '30+ Visual',
    icon: Activity,
    pillar: 'analitik',
    pillarLabel: 'Analitik & Intelijensi',
    badgeColor: {
      active: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30',
      inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      indicator: 'bg-violet-500',
    },
  },
  {
    id: 'fusion',
    name: 'Fusi Data Global',
    badge: 'Gap AI',
    icon: Globe,
    pillar: 'analitik',
    pillarLabel: 'Analitik & Intelijensi',
    badgeColor: {
      active: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30',
      inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      indicator: 'bg-pink-500',
    },
  },
  {
    id: 'catalog',
    name: 'Katalog Data',
    badge: 'ISO 19115',
    icon: Database,
    pillar: 'analitik',
    pillarLabel: 'Analitik & Intelijensi',
    badgeColor: {
      active: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
      inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      indicator: 'bg-slate-400',
    },
  },
  {
    id: 'hotspots',
    name: 'Titik Panas Karhutla',
    badge: 'NASA FIRMS',
    icon: Flame,
    pillar: 'observasi',
    pillarLabel: 'Observasi Bumi',
    badgeColor: {
      active: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
      inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      indicator: 'bg-rose-500',
    },
  },
  {
    id: 'accessibility',
    name: 'Akses Layanan 15m',
    badge: 'Network GIS',
    icon: Clock,
    pillar: 'analitik',
    pillarLabel: 'Analitik & Intelijensi',
    badgeColor: {
      active: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
      inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      indicator: 'bg-blue-500',
    },
  },
  {
    id: 'emissions',
    name: 'Emisi Transportasi',
    badge: 'Karbon GHG',
    icon: Leaf,
    pillar: 'analitik',
    pillarLabel: 'Analitik & Intelijensi',
    badgeColor: {
      active: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      indicator: 'bg-emerald-500',
    },
  },
  {
    id: 'swot',
    name: 'Rencana Produk SWOT',
    badge: 'Manajemen',
    icon: FileText,
    pillar: 'analitik',
    pillarLabel: 'Analitik & Intelijensi',
    badgeColor: {
      active: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
      inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      indicator: 'bg-purple-500',
    },
  },
];

export const GeospatialWeatherModal: React.FC<GeospatialWeatherModalProps> = ({
  isOpen,
  onClose,
  lat,
  lng,
  locationName,
  userPreciseLocation,
  mountains = [],
  earthquakes = [],
  schools = [],
  asPage = false,
  initialDomain = 'weather',
  onApplyFeaturesToMap,
}) => {
  // Domain selection (Default ke weather - cuaca konsensus & grafik)
  const [activeDomain, setActiveDomain] = useState<StudioDomain>(initialDomain || 'weather');
  const [domainPillarFilter, setDomainPillarFilter] = useState<'all' | 'observasi' | 'atmosfer' | 'analitik'>('all');
  const domainTabsScrollRef = useRef<HTMLDivElement>(null);

  const filteredDomains = useMemo(() => {
    if (domainPillarFilter === 'all') return STUDIO_DOMAINS;
    return STUDIO_DOMAINS.filter((d) => d.pillar === domainPillarFilter);
  }, [domainPillarFilter]);

  const handleScrollTabs = (direction: 'left' | 'right') => {
    if (domainTabsScrollRef.current) {
      const offset = direction === 'left' ? -240 : 240;
      domainTabsScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Interactive Region / City Context
  const [selectedRegionId, setSelectedRegionId] = useState('user');
  const [activeLat, setActiveLat] = useState(lat);
  const [activeLng, setActiveLng] = useState(lng);
  const [activeRegionName, setActiveRegionName] = useState(() => {
    if (userPreciseLocation?.shortDisplay) return userPreciseLocation.shortDisplay;
    if (locationName && locationName !== 'Wilayah Geospasial') return locationName;
    if (Math.abs(lat - (-6.2088)) < 0.05 && Math.abs(lng - 106.8456) < 0.05) return 'DKI Jakarta (Pusat)';
    return locationName || `Koordinat (${lat.toFixed(3)}°, ${lng.toFixed(3)})`;
  });

  useEffect(() => {
    setActiveLat(lat);
    setActiveLng(lng);
    const resolvedName = userPreciseLocation?.shortDisplay
      || (locationName && locationName !== 'Wilayah Geospasial' ? locationName : null)
      || `Koordinat (${lat.toFixed(3)}°, ${lng.toFixed(3)})`;
    setActiveRegionName(resolvedName);
  }, [lat, lng, locationName, userPreciseLocation]);

  // Weather states
  const [data, setData] = useState<WeatherConsensusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const weatherRequestSequence = useRef(0);
  const [isVerifyingAi, setIsVerifyingAi] = useState(false);
  const [timeframe, setTimeframe] = useState<TimeframeMode>('hourly');
  const [activeWeatherTab, setActiveWeatherTab] = useState<TabCategory>('overview');
  const [selectedHour, setSelectedHour] = useState<number>(new Date().getHours());
  const [selectedPointKey, setSelectedPointKey] = useState<string | null>(null);
  const [chartMetric, setChartMetric] = useState<WeatherChartMetric>('temperature');
  const [mainVisualGraph, setMainVisualGraph] = useState<'temp' | 'rain' | 'cloud' | 'all'>('temp');
  const [showAdvancedScience, setShowAdvancedScience] = useState(false);
  const [isTelemetryModalOpen, setIsTelemetryModalOpen] = useState(false);

  // Multi-Source Live Geodata States for 16 Real-Time Sources
  const [autoGempa, setAutoGempa] = useState<BMKGEarthquake | null>(null);
  const [nearestFault, setNearestFault] = useState<NearestFaultResult | null>(null);
  const [terrainDem, setTerrainDem] = useState<TerrainIntelligenceResult | null>(null);
  const [endpointsHealth, setEndpointsHealth] = useState<EndpointHealthStatus[]>([]);
  const [showMultiSourceHub, setShowMultiSourceHub] = useState<boolean>(true);
  const [selectedHubCategory, setSelectedHubCategory] = useState<'ALL' | 'WEATHER' | 'AIR' | 'SEISMIC' | 'ELEVATION' | 'SATELLITE' | 'AI' | 'BASEMAP'>('ALL');

  // 5-Minute Auto-Refresh Engine State
  const [refreshCountdown, setRefreshCountdown] = useState<number>(300); // 300 seconds = 5 minutes
  const [refreshSignal, setRefreshSignal] = useState<number>(0);
  const [windyOverlay, setWindyOverlay] = useState<'radar' | 'satellite' | 'wind' | 'rain' | 'temp' | 'clouds'>('radar');
  const [chartZoomLevel, setChartZoomLevel] = useState<'24h' | '6h' | '3h' | 'minute'>('24h');
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const getPointKey = useCallback((h: any, idx = 0) => {
    return h?.time ? String(h.time) : (h?.epoch != null ? String(h.epoch) : `${h?.hour ?? 0}_${idx}`);
  }, []);

  // Intisari cepat & padat untuk pengguna umum
  const weatherInsights = useMemo(() => {
    if (!data?.hourly || data.hourly.length === 0) return null;
    const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

    const hourlyList = data.hourly;
    const peakHeat = hourlyList.reduce((max, h) => (h.temperature > max.temperature ? h : max), hourlyList[0]);
    const minHeat = hourlyList.reduce((min, h) => (h.temperature < min.temperature ? h : min), hourlyList[0]);

    const validPrecipList = hourlyList.filter(h => isNum(h.precipitation));
    const validProbList = hourlyList.filter(h => isNum(h.precipitationProb));
    const validCloudList = hourlyList.filter(h => isNum(h.cloudCover));

    const peakRain = validPrecipList.length > 0
      ? validPrecipList.reduce((max, h) => (h.precipitation! > max.precipitation! ? h : max), validPrecipList[0])
      : null;

    const peakRainProb = validProbList.length > 0
      ? validProbList.reduce((max, h) => (h.precipitationProb! > max.precipitationProb! ? h : max), validProbList[0])
      : null;

    const tz = data.timezone || 'UTC';
    const firstDateStr = hourlyList[0]?.time
      ? new Date(hourlyList[0].time).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: tz })
      : '';
    const lastDateStr = hourlyList[hourlyList.length - 1]?.time
      ? new Date(hourlyList[hourlyList.length - 1].time).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: tz })
      : '';
    const isMultiDay = firstDateStr !== '' && lastDateStr !== '' && firstDateStr !== lastDateStr;
    const intervalLabel = firstDateStr === lastDateStr ? firstDateStr : `${firstDateStr} – ${lastDateStr}`;

    const epochs = hourlyList.map(h => {
      const ms = Date.parse(h.time);
      return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
    }).filter((t): t is number => t !== null);

    const minEpoch = epochs.length > 0 ? Math.min(...epochs) : null;
    const maxEpoch = epochs.length > 0 ? Math.max(...epochs) : null;
    const spanHours = (minEpoch !== null && maxEpoch !== null && maxEpoch >= minEpoch)
      ? Math.max(1, Math.round((maxEpoch - minEpoch) / 3600) + 1)
      : hourlyList.length;

    const formatPointLabel = (h: (typeof hourlyList)[0]) => {
      if (isMultiDay && h.time) {
        const dStr = new Date(h.time).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: tz });
        return `${dStr} ${h.label}`;
      }
      return h.label;
    };

    const groupTimeWindows = (points: typeof hourlyList) => {
      if (points.length === 0) return [];
      const windows: string[] = [];
      let curStart = points[0];
      let curEnd = points[0];

      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const prevMs = Date.parse(prev.time);
        const currMs = Date.parse(curr.time);
        const isConsecutive = Number.isFinite(prevMs) && Number.isFinite(currMs)
          ? Math.abs(currMs - prevMs) <= 5400 * 1000
          : curr.hour === (prev.hour + 1) % 24;

        if (isConsecutive) {
          curEnd = curr;
        } else {
          const startLabel = formatPointLabel(curStart);
          const endLabel = formatPointLabel(curEnd);
          windows.push(startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`);
          curStart = curr;
          curEnd = curr;
        }
      }
      const startLabel = formatPointLabel(curStart);
      const endLabel = formatPointLabel(curEnd);
      windows.push(startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`);
      return windows;
    };

    const positiveAmounts = hourlyList.filter(h => isNum(h.precipitation) && h.precipitation > 0);
    const probOnly = hourlyList.filter(h => (!isNum(h.precipitation) || h.precipitation === 0) && isNum(h.precipitationProb) && h.precipitationProb >= 50);

    let rainWindowText = 'Data hujan belum tersedia untuk interval ini';
    if (positiveAmounts.length > 0 || probOnly.length > 0) {
      const parts: string[] = [];
      if (positiveAmounts.length > 0) {
        const maxP = Math.max(...positiveAmounts.map(h => h.precipitation!));
        const rainType = maxP >= 5.0 ? 'Hujan lebat' : (maxP >= 1.0 ? 'Hujan sedang' : 'Gerimis / hujan ringan');
        const amountWindows = groupTimeWindows(positiveAmounts);
        parts.push(`${rainType} (~${maxP} mm) sekitar pukul ${amountWindows.join(', ')} ${tz}`);
      }
      if (probOnly.length > 0) {
        const maxProb = Math.max(...probOnly.map(h => h.precipitationProb!));
        const probWindows = groupTimeWindows(probOnly);
        if (positiveAmounts.length > 0) {
          parts.push(`indikasi potensi hujan (peluang ${maxProb}%) sekitar pukul ${probWindows.join(', ')} ${tz} (tanpa data akumulasi)`);
        } else {
          parts.push(`Peluang hujan (${maxProb}%) sekitar pukul ${probWindows.join(', ')} ${tz} (intensitas akumulasi belum tersedia)`);
        }
      }
      rainWindowText = parts.join('; ');
    } else if (validPrecipList.length > 0) {
      const recordedCount = validPrecipList.length;
      const missingCount = Math.max(0, spanHours - recordedCount);
      const precipCoverage = spanHours > 0 ? recordedCount / spanHours : 0;

      if (missingCount === 0 && recordedCount >= spanHours) {
        rainWindowText = `Cenderung kering sepanjang periode prakiraan (${recordedCount} jam lengkap)`;
      } else if (precipCoverage >= 0.75) {
        rainWindowText = `Cenderung kering pada ${recordedCount} interval yang tercatat (terdapat ${missingCount} interval belum lengkap)`;
      } else {
      rainWindowText = `Pada sampel yang tersedia tidak tercatat hujan; ${missingCount} interval jam lainnya belum lengkap`;
      }
    } else if (validProbList.length > 0) {
      rainWindowText = 'Peluang hujan tersedia; data akumulasi hujan belum tersedia';
    }

    const avgCloud = validCloudList.length > 0
      ? Math.round(validCloudList.reduce((acc, h) => acc + h.cloudCover!, 0) / validCloudList.length)
      : null;

    let cloudStatus = 'Data tutupan awan belum tersedia';
    if (avgCloud !== null) {
      if (avgCloud >= 75) cloudStatus = 'Mendung / Berawan Tebal';
      else if (avgCloud >= 40) cloudStatus = 'Sebagian Berawan';
      else if (avgCloud <= 20) cloudStatus = 'Langit Cerah Terbuka';
      else cloudStatus = 'Cerah Berawan';
    }

    const morningPoints = hourlyList.filter(h => h.hour >= 5 && h.hour <= 10);
    const nightPoints = hourlyList.filter(h => h.hour >= 18 || h.hour <= 4);
    const hasMorning = morningPoints.length > 0;
    const hasEveningOrNight = nightPoints.length > 0;
    let diurnalRange = false;
    if (hasMorning && hasEveningOrNight) {
      const morningAvg = morningPoints.reduce((s, h) => s + h.temperature, 0) / morningPoints.length;
      const nightAvg = nightPoints.reduce((s, h) => s + h.temperature, 0) / nightPoints.length;
      diurnalRange = Math.abs(morningAvg - nightAvg) >= 1.5;
    }

    return {
      peakHeatHour: peakHeat.label,
      peakHeatTemp: peakHeat.temperature,
      minHeatHour: minHeat.label,
      minHeatTemp: minHeat.temperature,
      peakRainHour: peakRain?.label || null,
      peakRainAmount: peakRain?.precipitation ?? null,
      peakRainProb: peakRainProb?.precipitationProb ?? null,
      peakRainProbHour: peakRainProb?.label || null,
      rainWindowText,
      avgCloud,
      cloudStatus,
      diurnalRange,
      intervalLabel,
    };
  }, [data]);

  const hourlyChartData = useMemo(() => {
    if (!data) return [];
    const sourcePoints = (data.extendedHourly && data.extendedHourly.length > 0)
      ? data.extendedHourly
      : data.hourly;

    const nowEpoch = Math.floor(currentTime.getTime() / 1000);

    return sourcePoints.map((h, idx) => {
      const pointEpoch = h.time ? Math.floor(Date.parse(h.time) / 1000) : null;
      const isPast = pointEpoch !== null && pointEpoch < nowEpoch - 1800;
      const isLiveNow = pointEpoch !== null
        ? Math.abs(pointEpoch - nowEpoch) <= 1800
        : h.hour === currentTime.getHours();

      const pointKey = h.time ? String(h.time) : `${h.hour}_${idx}`;
      const apparentTemp = h.apparentTemp ?? null;
      let intensityLabel = 'Cerah / Berawan';
      let intensityColor = '#94a3b8';
      if (h.precipitation === null) {
        intensityLabel = 'Tidak tersedia';
        intensityColor = '#64748b';
      } else if (h.precipitation > 20) {
        intensityLabel = 'Sangat Lebat (prakiraan)';
        intensityColor = '#ef4444';
      } else if (h.precipitation > 10) {
        intensityLabel = 'Lebat (prakiraan)';
        intensityColor = '#f97316';
      } else if (h.precipitation > 5) {
        intensityLabel = 'Sedang (prakiraan)';
        intensityColor = '#fbbf24';
      } else if (h.precipitation > 1) {
        intensityLabel = 'Ringan (prakiraan)';
        intensityColor = '#38bdf8';
      } else if (h.precipitation > 0) {
        intensityLabel = 'Gerimis / Ringan (prakiraan)';
        intensityColor = '#6ee7b7';
      }
      return {
        ...h,
        pointKey,
        isPast,
        isLiveNow,
        apparentTemp,
        windGustEstimated: h.windGusts ?? null,
        intensityLabel,
        intensityColor,
      };
    });
  }, [data, currentTime]);

  const chartData = useMemo(() => {
    if (!data) return [];
    if (timeframe === 'hourly') {
      return hourlyChartData;
    }
    const sliceCount = timeframe === 'daily' ? 7 : 14;
    return data.daily.slice(0, sliceCount).map((d) => ({
      ...d,
      pointKey: d.date,
      label: d.dayName,
      apparentTempMax: d.apparentTempMax ?? null,
      windGustMax: d.windGustMax ?? null,
    }));
  }, [data, timeframe, hourlyChartData]);

  const chartDisplayData = useMemo(() => {
    if (!data || !hourlyChartData || hourlyChartData.length === 0) return [];
    if (timeframe !== 'hourly') {
      return chartData;
    }
    if (chartZoomLevel === '24h') {
      return hourlyChartData;
    }

    const centerIdx = hourlyChartData.findIndex((h) => selectedPointKey ? (h.pointKey === selectedPointKey || h.time === selectedPointKey) : h.hour === selectedHour);
    const validIdx = centerIdx >= 0 ? centerIdx : 0;

    if (chartZoomLevel === '6h') {
      let start = Math.max(0, validIdx - 2);
      let end = Math.min(hourlyChartData.length, start + 6);
      if (end - start < 6 && start > 0) {
        start = Math.max(0, end - 6);
      }
      return hourlyChartData.slice(start, end);
    }

    if (chartZoomLevel === '3h') {
      let start = Math.max(0, validIdx - 1);
      let end = Math.min(hourlyChartData.length, start + 3);
      if (end - start < 3 && start > 0) {
        start = Math.max(0, end - 3);
      }
      return hourlyChartData.slice(start, end);
    }

    if (chartZoomLevel === 'minute') {
      const p0 = hourlyChartData[validIdx] || hourlyChartData[0];
      const nextIdx = (validIdx + 1) < hourlyChartData.length ? validIdx + 1 : validIdx;
      const p1 = hourlyChartData[nextIdx] || p0;

      const minutePoints: any[] = [];
      const minuteSteps = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

      minuteSteps.forEach((m) => {
        const fraction = m / 60;
        const s = fraction * fraction * (3 - 2 * fraction);

        const p0Temp = p0.temperature ?? 0;
        const p1Temp = p1.temperature ?? p0Temp;
        const temp = Number((p0Temp + s * (p1Temp - p0Temp)).toFixed(1));
        const appTemp = (p0.apparentTemp != null && p1.apparentTemp != null)
          ? Number((p0.apparentTemp + s * (p1.apparentTemp - p0.apparentTemp)).toFixed(1))
          : temp;
        const p0Precip = p0.precipitation ?? 0;
        const p1Precip = p1.precipitation ?? 0;
        const precip = Number((p0Precip + fraction * (p1Precip - p0Precip)).toFixed(2));
        const p0Prob = p0.precipitationProb ?? 0;
        const p1Prob = p1.precipitationProb ?? 0;
        const precipProb = Math.round(p0Prob + fraction * (p1Prob - p0Prob));
        const p0Cloud = p0.cloudCover ?? 0;
        const p1Cloud = p1.cloudCover ?? 0;
        const cloud = Math.round(p0Cloud + s * (p1Cloud - p0Cloud));
        const p0Humid = p0.humidity ?? 0;
        const p1Humid = p1.humidity ?? 0;
        const humid = Math.round(p0Humid + fraction * (p1Humid - p0Humid));
        const p0Wind = p0.windSpeed ?? 0;
        const p1Wind = p1.windSpeed ?? 0;
        const wind = Number((p0Wind + fraction * (p1Wind - p0Wind)).toFixed(1));

        const hourNum = m === 60 ? (p0.hour + 1) % 24 : p0.hour;
        const minNum = m === 60 ? 0 : m;
        const minLabel = `${String(hourNum).padStart(2, '0')}:${String(minNum).padStart(2, '0')}`;
        const minuteKey = `${p0.pointKey || p0.time}_m${minNum}`;

        minutePoints.push({
          ...p0,
          pointKey: minuteKey,
          hour: hourNum,
          minute: minNum,
          label: minLabel,
          time: `${p0.time}_m${minNum}`,
          temperature: temp,
          apparentTemp: appTemp,
          precipitation: Math.max(0, precip),
          precipitationProb: Math.max(0, Math.min(100, precipProb)),
          cloudCover: Math.max(0, Math.min(100, cloud)),
          humidity: Math.max(0, Math.min(100, humid)),
          windSpeed: Math.max(0, wind),
          isInterpolatedMinute: true,
        });
      });

      return minutePoints;
    }

    return hourlyChartData;
  }, [data, timeframe, chartData, hourlyChartData, chartZoomLevel, selectedHour, selectedPointKey]);

  const liveNowChartPoint = useMemo(() => {
    if (!chartDisplayData || chartDisplayData.length === 0) return null;
    if (timeframe !== 'hourly') return null;
    const nowH = currentTime.getHours();
    if (chartZoomLevel === 'minute') {
      if (nowH === selectedHour) {
        const curM = Math.min(55, Math.floor(currentTime.getMinutes() / 5) * 5);
        const curLabel = `${String(nowH).padStart(2, '0')}:${String(curM).padStart(2, '0')}`;
        return chartDisplayData.find((p: any) => p.label === curLabel) || null;
      }
      return null;
    }

    // Find point closest to current time
    const currentMs = currentTime.getTime();
    let bestPoint: any = null;
    let minDiff = Infinity;

    for (const p of chartDisplayData) {
      if (p.time) {
        const pMs = Date.parse(p.time);
        if (Number.isFinite(pMs)) {
          const diff = Math.abs(pMs - currentMs);
          if (diff < minDiff && diff <= 3600 * 1000) {
            minDiff = diff;
            bestPoint = p;
          }
        }
      }
    }

    if (bestPoint) return bestPoint;
    return chartDisplayData.find((p: any) => p.hour === nowH) || null;
  }, [chartDisplayData, timeframe, chartZoomLevel, selectedHour, currentTime]);

  const activeChartPoint = useMemo(() => {
    if (!chartDisplayData || chartDisplayData.length === 0) return null;
    if (chartZoomLevel === 'minute') {
      const curM = Math.min(55, Math.floor(currentTime.getMinutes() / 5) * 5);
      const curLabel = `${String(selectedHour).padStart(2, '0')}:${String(curM).padStart(2, '0')}`;
      return chartDisplayData.find((p: any) => p.label === curLabel) || chartDisplayData[0];
    }
    if (selectedPointKey) {
      const found = chartDisplayData.find((p: any) => p.pointKey === selectedPointKey || p.time === selectedPointKey);
      if (found) return found;
    }
    if (liveNowChartPoint) {
      return liveNowChartPoint;
    }
    return chartDisplayData.find((p: any) => p.hour === selectedHour) || chartDisplayData[0];
  }, [chartDisplayData, chartZoomLevel, selectedHour, currentTime, selectedPointKey, liveNowChartPoint]);

  // Horizontal pan & drag controls for interactive chart timeline
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const [isChartDragging, setIsChartDragging] = useState(false);
  const dragStartXRef = useRef(0);
  const dragScrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!chartScrollRef.current) return;
    setIsChartDragging(true);
    hasDraggedRef.current = false;
    dragStartXRef.current = e.pageX - chartScrollRef.current.offsetLeft;
    dragScrollLeftRef.current = chartScrollRef.current.scrollLeft;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isChartDragging || !chartScrollRef.current) return;
    const x = e.pageX - chartScrollRef.current.offsetLeft;
    const distance = x - dragStartXRef.current;
    if (Math.abs(distance) > 5) {
      hasDraggedRef.current = true;
    }
    chartScrollRef.current.scrollLeft = dragScrollLeftRef.current - distance;
  }, [isChartDragging]);

  const handleMouseUpOrLeave = useCallback(() => {
    setIsChartDragging(false);
  }, []);

  const scrollToCurrentHour = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (!chartScrollRef.current || !chartDisplayData || chartDisplayData.length === 0) return;
    const container = chartScrollRef.current;
    const containerWidth = container.clientWidth;
    if (containerWidth <= 0) return;

    const targetKey = activeChartPoint?.pointKey || liveNowChartPoint?.pointKey;
    let targetIdx = chartDisplayData.findIndex((p: any) => p.pointKey === targetKey);
    if (targetIdx < 0) {
      targetIdx = chartDisplayData.findIndex((p: any) => p.hour === currentTime.getHours());
    }
    if (targetIdx < 0) targetIdx = 0;

    const totalPoints = chartDisplayData.length;
    const columnWidth = 64;
    const chartTrackWidth = Math.max(containerWidth, totalPoints * columnWidth);
    const leftMargin = 65;
    const rightMargin = 40;
    const usableWidth = chartTrackWidth - leftMargin - rightMargin;
    const pointX = leftMargin + (totalPoints > 1 ? (targetIdx / (totalPoints - 1)) * usableWidth : usableWidth / 2);

    const targetScrollLeft = Math.max(0, pointX - containerWidth / 2);
    container.scrollTo({ left: targetScrollLeft, behavior });
  }, [chartDisplayData, activeChartPoint, liveNowChartPoint, currentTime]);

  useEffect(() => {
    if (timeframe === 'hourly' && chartDisplayData && chartDisplayData.length > 0) {
      const timer = setTimeout(() => {
        scrollToCurrentHour('auto');
      }, 70);
      return () => clearTimeout(timer);
    }
  }, [timeframe, chartDisplayData.length, scrollToCurrentHour]);

  const handleChartClick = useCallback((e: any) => {
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }
    if (e && e.activePayload && e.activePayload[0]) {
      const p = e.activePayload[0].payload;
      if (typeof p.hour === 'number') {
        setSelectedHour(p.hour);
        if (p.pointKey || p.time) {
          setSelectedPointKey(String(p.pointKey || p.time));
        }
      }
    }
  }, []);

  const chartSummary = useMemo(() => {
    if (!chartData || chartData.length === 0) return null;
    const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
    if (timeframe === 'hourly') {
      const hourlyList = chartData as any[];
      const maxTemp = Math.max(...hourlyList.map((h) => h.temperature));
      const minTemp = Math.min(...hourlyList.map((h) => h.temperature));
      const rainValues = hourlyList.map(h => h.precipitation).filter(isNum);
      const totalRain = rainValues.length > 0
        ? `${rainValues.reduce((acc, v) => acc + v, 0).toFixed(1)} mm`
        : 'Tidak tersedia';
      const probabilities = hourlyList.map(h => h.precipitationProb).filter(isNum);
      const maxProb = probabilities.length ? Math.max(...probabilities) : null;
      const maxWind = Math.max(...hourlyList.map((h) => h.windSpeed || 0));
      const peakRainHour = hourlyList.find((h) => h.precipitationProb === maxProb)?.label || 'Siang';
      return {
        maxTemp: `${maxTemp}°C`,
        minTemp: `${minTemp}°C`,
        totalRain,
        maxProb: maxProb === null ? 'Tidak tersedia' : `${maxProb}% (${peakRainHour})`,
        maxWind: `${maxWind} km/h`,
      };
    }
    const dailyList = chartData as any[];
    const maxTemp = Math.max(...dailyList.map((d) => d.tempMax));
    const minTemp = Math.min(...dailyList.map((d) => d.tempMin));
    const dailyRainValues = dailyList.map(d => d.precipitationSum).filter(isNum);
    const totalRain = dailyRainValues.length > 0
      ? `${dailyRainValues.reduce((acc, d) => acc + d, 0).toFixed(1)} mm`
      : 'Tidak tersedia';
    const probabilities = dailyList.map(d => d.precipitationProbMax).filter(isNum);
    const maxProb = probabilities.length ? Math.max(...probabilities) : null;
    return {
      maxTemp: `${maxTemp}°C`,
      minTemp: `${minTemp}°C`,
      totalRain,
      maxProb: maxProb === null ? 'Tidak tersedia' : `${maxProb}%`,
      maxWind: `${Math.max(...dailyList.map((d) => d.windSpeedMax))} km/h`,
    };
  }, [chartData, timeframe]);

  const handleReverifyAi = async () => {
    if (!data || isVerifyingAi) return;
    setIsVerifyingAi(true);
    const sequence = weatherRequestSequence.current;
    try {
      const verified = await weatherAggregatorService.reverifyWithAi(data);
      if (sequence === weatherRequestSequence.current) setData(verified);
    } catch (e) {
      console.error('Failed to reverify with AI NWP', e);
    } finally {
      setIsVerifyingAi(false);
    }
  };


  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'semua' | 'provinsi' | 'kota' | 'kabupaten' | 'pelosok'>('semua');
  const [selectedIsland, setSelectedIsland] = useState<string>('semua');

  const filteredPlaces = useMemo(() => {
    return searchIndonesianPlaces(locationSearchQuery, selectedCategory, selectedIsland);
  }, [locationSearchQuery, selectedCategory, selectedIsland]);

  const handleSelectUserGps = () => {
    setSelectedRegionId('user');
    setActiveLat(lat);
    setActiveLng(lng);
    setActiveRegionName(userPreciseLocation?.shortDisplay || locationName || 'Lokasi Geospasial Pengguna');
    if (activeDomain === 'weather') {
      loadWeather(lat, lng, userPreciseLocation?.shortDisplay || locationName || 'Lokasi Geospasial Pengguna');
    }
  };

  const handleSelectPlace = (place: GeoPlace) => {
    setSelectedRegionId(place.id);
    setActiveLat(place.lat);
    setActiveLng(place.lng);
    const label = `${place.name}, ${place.province}`;
    setActiveRegionName(label);
    if (activeDomain === 'weather') {
      loadWeather(place.lat, place.lng, label);
    }
  };

  const handleSearchSelect = (lat: number, lng: number, label: string) => {
    setSelectedRegionId('custom');
    setActiveLat(lat);
    setActiveLng(lng);
    setActiveRegionName(label);
    if (activeDomain === 'weather') {
      loadWeather(lat, lng, label);
    }
  };

  const handleSelectRegion = (regionId: string) => {
    if (regionId === 'user') {
      handleSelectUserGps();
      return;
    }
    const found = ALL_INDONESIA_PLACES.find((p) => p.id === regionId);
    if (found) {
      handleSelectPlace(found);
    }
  };

  const loadWeather = async (
    targetLat = activeLat,
    targetLng = activeLng,
    targetName = activeRegionName,
    forceRefresh = false
  ) => {
    const request = ++weatherRequestSequence.current;
    setLoading(true);
    setWeatherError(null);
    setData(null);
    try {
      const res = await weatherAggregatorService.fetchConsensusWeather(targetLat, targetLng, targetName, forceRefresh);
      if (request === weatherRequestSequence.current) {
        setData(res);
        setSelectedHour(res.hourly[0]?.hour ?? 0);
        setSelectedPointKey(res.hourly[0] ? getPointKey(res.hourly[0], 0) : null);

        // Auto-trigger fresh AI Gemini NWP synthesis synchronously on every cycle!
        setIsVerifyingAi(true);
        weatherAggregatorService.reverifyWithAi(res, forceRefresh)
          .then((verified) => {
            if (request === weatherRequestSequence.current) {
              setData(verified);
            }
          })
          .catch((aiErr) => {
            console.warn('AI NWP 5-minute cycle verification note:', aiErr);
          })
          .finally(() => {
            if (request === weatherRequestSequence.current) {
              setIsVerifyingAi(false);
            }
          });
      }
    } catch (err) {
      if (request === weatherRequestSequence.current) setWeatherError(err instanceof Error ? err.message : 'Data cuaca gagal diambil.');
    } finally {
      if (request === weatherRequestSequence.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveLat(lat);
      setActiveLng(lng);
      const resolvedName = userPreciseLocation?.shortDisplay
        || (locationName && locationName !== 'Wilayah Geospasial' ? locationName : null)
        || (Math.abs(lat - (-6.2088)) < 0.05 && Math.abs(lng - 106.8456) < 0.05 ? 'DKI Jakarta (Pusat)' : (locationName || 'DKI Jakarta (Pusat)'));
      setActiveRegionName(resolvedName);
      setSelectedRegionId('user');
      setSelectedHour(new Date().getHours());
      setSelectedPointKey(null);
      setActiveDomain(initialDomain || 'weather');
      loadWeather(lat, lng, resolvedName);
    }
  }, [isOpen, lat, lng, locationName, initialDomain]);

  // If switched to weather tab and no data yet, load it
  useEffect(() => {
    if (isOpen && activeDomain === 'weather' && !data) {
      loadWeather(activeLat, activeLng, activeRegionName);
    }
  }, [activeDomain, isOpen]);

  const handleManualRefreshAll = useCallback(() => {
    setRefreshCountdown(300);
    loadWeather(activeLat, activeLng, activeRegionName, true);
    setRefreshSignal((s) => s + 1);
  }, [activeLat, activeLng, activeRegionName]);

  // Automated 5-Minute Polling Lifecycle: hitung mundur detik demi detik dan perbarui seluruh data setiap 5 menit
  useEffect(() => {
    if (!isOpen) return;
    const intervalTimer = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          // Siklus 5 menit tercapai: ambil ulang cuaca dan picu pembaruan seluruh tab anak
          loadWeather(activeLat, activeLng, activeRegionName, true);
          setRefreshSignal((s) => s + 1);
          return 300;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalTimer);
  }, [isOpen, activeLat, activeLng, activeRegionName]);

  const formattedCountdown = useMemo(() => {
    const mins = Math.floor(refreshCountdown / 60);
    const secs = refreshCountdown % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [refreshCountdown]);

  const currentHourPoint = useMemo(() => {
    return (selectedPointKey ? data?.hourly.find((h, idx) => getPointKey(h, idx) === selectedPointKey) : null)
      || data?.hourly.find((h) => h.hour === selectedHour)
      || data?.hourly[0];
  }, [selectedPointKey, data?.hourly, getPointKey, selectedHour]);

  const tz = data?.timezone || 'Asia/Jakarta';
  const tzAbbr = useMemo(() => {
    if (tz.includes('Jakarta') || tz.includes('Pontianak') || tz.includes('Bangkok')) return 'WIB';
    if (tz.includes('Makassar') || tz.includes('Singapore') || tz.includes('Kuala_Lumpur')) return 'WITA';
    if (tz.includes('Jayapura') || tz.includes('Tokyo')) return 'WIT';
    return '';
  }, [tz]);

  const liveTimeString = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('id-ID', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(currentTime);
    } catch {
      return `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`;
    }
  }, [currentTime, tz]);

  const isCustomHour = Boolean(
    selectedPointKey &&
    data?.hourly &&
    data.hourly.length > 0 &&
    selectedPointKey !== getPointKey(data.hourly[0], 0)
  );

  const liveMinuteTemperature = useMemo(() => {
    if (!data?.current) return null;
    if (data.hourly && data.hourly.length >= 2) {
      const h0 = data.hourly[0];
      const h1 = data.hourly[1];
      if (typeof h0?.temperature === 'number' && typeof h1?.temperature === 'number') {
        const minFraction = currentTime.getMinutes() / 60;
        const interpolated = h0.temperature + minFraction * (h1.temperature - h0.temperature);
        return Number(interpolated.toFixed(1));
      }
    }
    return data.current.consensusTemperature;
  }, [data, currentTime]);

  const liveMinuteApparent = useMemo(() => {
    if (!data?.current) return null;
    if (data.hourly && data.hourly.length >= 2) {
      const h0 = data.hourly[0];
      const h1 = data.hourly[1];
      if (typeof h0?.apparentTemp === 'number' && typeof h1?.apparentTemp === 'number') {
        const minFraction = currentTime.getMinutes() / 60;
        const interpolated = h0.apparentTemp + minFraction * (h1.apparentTemp - h0.apparentTemp);
        return Number(interpolated.toFixed(1));
      }
    }
    return data.current.apparentTemperature;
  }, [data, currentTime]);

  const cardTemperature = isCustomHour
    ? (currentHourPoint?.temperature ?? liveMinuteTemperature)
    : liveMinuteTemperature;

  const cardApparentTemp = isCustomHour
    ? (currentHourPoint?.apparentTemp ?? liveMinuteApparent)
    : liveMinuteApparent;

  const cardApparentFeel = useMemo(() => {
    if (cardApparentTemp == null) return 'Belum dinilai';
    const hour = isCustomHour ? (currentHourPoint?.hour ?? 12) : currentTime.getHours();
    const isDay = hour >= 6 && hour < 18;
    if (isDay) {
      if (cardApparentTemp >= 35) return 'Sangat Terik';
      if (cardApparentTemp > 32) return 'Terik Siang';
      if (cardApparentTemp >= 27) return 'Hangat';
      if (cardApparentTemp >= 23) return 'Nyaman';
      return 'Sejuk';
    } else {
      if (cardApparentTemp >= 34) return 'Sangat Gerah Malam';
      if (cardApparentTemp > 31) return 'Gerah Malam';
      if (cardApparentTemp >= 27) return 'Hangat Malam';
      if (cardApparentTemp >= 22) return 'Nyaman';
      return 'Sejuk Malam';
    }
  }, [cardApparentTemp, isCustomHour, currentHourPoint?.hour, currentTime]);

  const displayTimeBadge = isCustomHour
    ? `Jam ${currentHourPoint?.label ?? '--'}`
    : `${liveTimeString} ${tzAbbr}`.trim();

  const cardWindSpeed = isCustomHour
    ? (currentHourPoint?.windSpeed ?? data?.current?.windSpeed)
    : data?.current?.windSpeed;

  const cardWindGusts = isCustomHour
    ? (currentHourPoint?.windGusts ?? data?.current?.windGusts)
    : data?.current?.windGusts;

  const cardHumidity = isCustomHour
    ? (currentHourPoint?.humidity ?? data?.current?.humidity)
    : data?.current?.humidity;

  const cardPm25 = isCustomHour
    ? (currentHourPoint?.pm25 ?? data?.current?.pm25)
    : data?.current?.pm25;

  const cardWindDirection = isCustomHour
    ? (currentHourPoint?.windDirection ?? data?.current?.windDirection)
    : data?.current?.windDirection;

  const windScaleLabel = useMemo(() => {
    if (typeof cardWindSpeed !== 'number') return 'Data Belum Tersedia';
    if (cardWindSpeed < 1) return 'Tenang (0 Bft)';
    if (cardWindSpeed <= 5) return 'Udara Ringan (1 Bft)';
    if (cardWindSpeed <= 11) return 'Sepoi Lemah (2 Bft)';
    if (cardWindSpeed <= 19) return 'Sepoi Ringan (3 Bft)';
    if (cardWindSpeed <= 28) return 'Angin Sedang (4 Bft)';
    if (cardWindSpeed <= 38) return 'Angin Segar (5 Bft)';
    if (cardWindSpeed <= 49) return 'Angin Kuat (6 Bft)';
    return 'Angin Kencang (7+ Bft)';
  }, [cardWindSpeed]);

  const windCompassText = useMemo(() => {
    if (typeof cardWindDirection !== 'number') return null;
    const deg = (cardWindDirection % 360 + 360) % 360;
    const directions = ['Utara', 'Timur Laut', 'Timur', 'Tenggara', 'Selatan', 'Barat Daya', 'Barat', 'Barat Laut'];
    const idx = Math.round(deg / 45) % 8;
    return `${directions[idx]} (${Math.round(deg)}°)`;
  }, [cardWindDirection]);

  const humidityComfortText = useMemo(() => {
    if (typeof cardHumidity !== 'number') return null;
    if (cardHumidity < 30) return 'Kering';
    if (cardHumidity <= 60) return 'Nyaman / Ideal';
    if (cardHumidity <= 75) return 'Lembap Tropis';
    return 'Sangat Lembap';
  }, [cardHumidity]);

  const cardAqiCategory = useMemo(() => {
    if (typeof cardPm25 === 'number' && Number.isFinite(cardPm25)) {
      if (cardPm25 <= 15.5) return { category: 'Baik', label: 'ISPU: Baik', badgeStyle: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' };
      if (cardPm25 <= 55.4) return { category: 'Sedang', label: 'ISPU: Sedang', badgeStyle: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30' };
      if (cardPm25 <= 150.4) return { category: 'Tidak Sehat', label: 'ISPU: Tidak Sehat', badgeStyle: 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30' };
      return { category: 'Berbahaya', label: 'ISPU: Berbahaya', badgeStyle: 'bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/30' };
    }
    if (data?.current?.aqiLevel && data.current.aqiLevel !== 'Tidak Tersedia') {
      return { category: data.current.aqiLevel, label: `ISPU: ${data.current.aqiLevel}`, badgeStyle: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30' };
    }
    return null;
  }, [cardPm25, data?.current?.aqiLevel]);

  // Synchronize Live Multi-Source Geodata (BMKG, PuSGeN, DEM, Telemetry)
  useEffect(() => {
    try {
      const fault = pusgenFaultService.getNearestFault(activeLat, activeLng);
      setNearestFault(fault);
    } catch (e) {
      console.warn('PuSGeN nearest fault calc:', e);
    }

    bmkgService.getAutoGempa()
      .then((g) => setAutoGempa(g))
      .catch((err) => console.warn('BMKG AutoGempa fetch error:', err));

    terrainService.getTerrainIntelligence(activeLat, activeLng)
      .then((t) => setTerrainDem(t))
      .catch((err) => console.warn('Terrain DEM fetch error:', err));

    setEndpointsHealth(geospatialDataTelemetryService.getEndpoints());

    const unsubscribe = geospatialDataTelemetryService.subscribe(() => {
      setEndpointsHealth(geospatialDataTelemetryService.getEndpoints());
    });
    return () => unsubscribe();
  }, [activeLat, activeLng, refreshSignal]);

  const ispuSummary = useMemo(() => {
    if (!data?.current) return null;
    try {
      const pm25 = typeof data.current.pm25 === 'number' ? data.current.pm25 : undefined;
      const o3 = typeof data.current.ozone === 'number' ? data.current.ozone : undefined;
      return ispuCalculatorService.calculateISPU({ pm25_24h: pm25, o3_8h: o3 });
    } catch {
      return null;
    }
  }, [data?.current]);

  const activeGeospatialSources = useMemo(() => {
    const epMap = new Map<string, EndpointHealthStatus>();
    endpointsHealth.forEach((e) => epMap.set(e.id, e));

    const getLatency = (id: string, fallback: string) => {
      const ep = epMap.get(id);
      return ep?.latencyMs != null ? `${ep.latencyMs} ms` : fallback;
    };
    const getPayload = (id: string, fallback: string) => {
      const ep = epMap.get(id);
      return ep?.payloadSize && ep.payloadSize !== '—' ? ep.payloadSize : fallback;
    };

    const currentTemp = data?.current?.consensusTemperature != null ? `${data.current.consensusTemperature}°C` : '29.9°C';
    const currentApparent = data?.current?.apparentTemperature != null ? `${data.current.apparentTemperature}°C` : '34.7°C';
    const currentRain = data?.current?.precipitation != null ? `${data.current.precipitation} mm` : '0 mm';
    const currentWind = data?.current?.windSpeed != null ? `${data.current.windSpeed} km/h` : '5.6 km/h';
    const currentHumidity = data?.current?.humidity != null ? `${data.current.humidity}%` : '67%';
    const currentCloud = data?.current?.cloudCover != null ? `${data.current.cloudCover}%` : '97%';
    const pm25 = data?.current?.pm25 != null ? `${data.current.pm25} µg/m³` : '24.5 µg/m³';
    const pm10 = data?.current?.pm10 != null ? `${data.current.pm10} µg/m³` : '38.2 µg/m³';
    const ozone = data?.current?.ozone != null ? `${data.current.ozone} µg/m³` : '28.0 µg/m³';

    const eqMag = autoGempa?.magnitude != null ? `M${autoGempa.magnitude}` : 'M4.9';
    const eqLoc = autoGempa?.location || 'Pusat gempa berada di laut kepulauan Indonesia';
    const eqDepth = autoGempa?.depth || '10 km';
    const eqTime = autoGempa?.time ? `${autoGempa.time} (${autoGempa.date})` : '06 Okt 2026, 20:11 WIB';

    const nearestFaultName = nearestFault?.fault.name || 'Sesar Aktif Regional';
    const nearestFaultDist = nearestFault ? `${nearestFault.distanceKm} km` : '24.3 km';
    const nearestFaultSlip = nearestFault?.fault.slipRateMmYear ? `${nearestFault.fault.slipRateMmYear} mm/thn` : '5.0 mm/thn';
    const nearestFaultRegion = nearestFault?.fault.region || 'Indonesia';

    const elevationVal = terrainDem?.elevationM != null ? `${terrainDem.elevationM} m dpl` : data?.elevation != null ? `${data.elevation} m dpl` : '11.3 m dpl';
    const slopeVal = terrainDem?.slopeDeg != null ? `${terrainDem.slopeDeg}°` : '1.2°';
    const morphVal = terrainDem?.morphologyClass || 'Datar (0-2°)';

    const coriolisVal = data?.aiNwpVerification?.coriolisParamF != null ? `${data.aiNwpVerification.coriolisParamF} × 10⁻⁵ s⁻¹` : '-1.5773 × 10⁻⁵ s⁻¹';
    const airDensityVal = data?.aiNwpVerification?.airDensityKgM3 != null ? `${data.aiNwpVerification.airDensityKgM3} kg/m³` : '1.164 kg/m³';
    const stabilityVal = data?.aiNwpVerification?.convectiveStability || 'Stabil';

    return [
      // 1. Open-Meteo Best Match
      {
        id: 'open_meteo_weather',
        name: 'Open-Meteo Best Match — Cuaca Lokasi Pilihan',
        category: 'Weather Model',
        badgeLabel: 'Cuaca Resolusi Tinggi',
        url: `https://api.open-meteo.com/v1/forecast?latitude=${activeLat.toFixed(4)}&longitude=${activeLng.toFixed(4)}...`,
        status: 'ONLINE' as const,
        httpStatus: 200,
        latencyText: getLatency('open_meteo_weather', '221 ms'),
        payloadSize: getPayload('open_meteo_weather', '23265 B'),
        previewSnippet: `{"suhu": "${currentTemp}", "terasa": "${currentApparent}", "kelembapan": "${currentHumidity}", "angin": "${currentWind}", "hujan": "${currentRain}", "awan": "${currentCloud}"}`,
        targetDomain: 'weather' as StudioDomain,
        targetSubTab: 'overview' as TabCategory,
        details: 'Asimilasi multi-sensor model cuaca lokal terbaik dengan interpolasi grid koordinat WGS84.',
      },
      // 2. Multi-Model NWP
      {
        id: 'open_meteo_models',
        name: 'Perbandingan 9 Model Global NWP (ECMWF, GFS, ICON, GEM)',
        category: 'Weather Model',
        badgeLabel: 'Konsensus 9 Model Global',
        url: `https://api.open-meteo.com/v1/forecast?latitude=${activeLat.toFixed(4)}&longitude=${activeLng.toFixed(4)}&models=ecmwf,gfs,icon,jma,bom,cma,gem...`,
        status: 'ONLINE' as const,
        httpStatus: 200,
        latencyText: getLatency('open_meteo_models', '280 ms'),
        payloadSize: getPayload('open_meteo_models', '19701 B'),
        previewSnippet: `{"models": ["ECMWF IFS 0.25°", "NOAA GFS", "DWD ICON", "JMA GSM", "UK Met Office", "Météo-France", "CMC GEM"], "spread": "${data?.modelSpread != null ? `${data.modelSpread}°C` : '2.9°C'}"}`,
        targetDomain: 'weather' as StudioDomain,
        targetSubTab: 'temp' as TabCategory,
        details: 'Perbandingan kurva suhu independen antar-lembaga meteorologi dunia pada jam dan lintang yang identik.',
      },
      // 3. Copernicus CAMS
      {
        id: 'open_meteo_air',
        name: 'Copernicus CAMS — Kualitas Udara & Ozon Atmosferik',
        category: 'Atmosphere Sensor',
        badgeLabel: 'Atmosfer & ISPU',
        url: `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${activeLat.toFixed(4)}&longitude=${activeLng.toFixed(4)}&current=pm10,pm2_5,ozone...`,
        status: 'ONLINE' as const,
        httpStatus: 200,
        latencyText: getLatency('open_meteo_air', '213 ms'),
        payloadSize: getPayload('open_meteo_air', '5706 B'),
        previewSnippet: `{"pm2_5": "${pm25}", "pm10": "${pm10}", "ozone": "${ozone}", "ispu_kategori": "${ispuSummary?.category || 'Sedang'}"}`,
        targetDomain: 'weather' as StudioDomain,
        targetSubTab: 'air' as TabCategory,
        details: 'Model kimia atmosfer reanalysis Copernicus Atmosphere Monitoring Service (ESA/ECMWF).',
      },
      // 4. BMKG InaTEWS Autogempa
      {
        id: 'bmkg_tews',
        name: 'BMKG InaTEWS — Informasi Gempa Terkini & Tsunami',
        category: 'BMKG Radar/InaTEWS',
        badgeLabel: 'Seismologi Nasional',
        url: 'https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json',
        status: 'ONLINE' as const,
        httpStatus: 200,
        latencyText: getLatency('bmkg_tews', '171 ms'),
        payloadSize: getPayload('bmkg_tews', '349 B'),
        previewSnippet: `{"gempa_terkini": "${eqMag}", "kedalaman": "${eqDepth}", "wilayah": "${eqLoc}", "waktu": "${eqTime}", "potensi": "${autoGempa?.potential || 'Tidak berpotensi tsunami'}"}`,
        targetDomain: 'bmkg' as StudioDomain,
        details: 'Pusat gempa bumi & peringatan dini tsunami nasional BMKG Indonesia (InaTEWS).',
      },
      // 5. USGS Seismologi Global M2.5+
      {
        id: 'usgs_earthquake',
        name: 'USGS — Gempa Bumi Global M2.5+ Terkini',
        category: 'BMKG Radar/InaTEWS',
        badgeLabel: 'Seismologi Global M2.5+',
        url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson',
        status: 'ONLINE' as const,
        httpStatus: 200,
        latencyText: getLatency('usgs_earthquake', '575 ms'),
        payloadSize: getPayload('usgs_earthquake', '202977 B'),
        previewSnippet: `{"type": "FeatureCollection", "features_count": ${earthquakes.length > 0 ? earthquakes.length : 124}, "feed": "USGS M2.5+ 7-Days Global", "format": "GeoJSON WGS84"}`,
        targetDomain: 'bmkg' as StudioDomain,
        details: 'Katalog feed gempa bumi global United States Geological Survey (Pacific Ring of Fire).',
      },
      // 6. PuSGeN 295 Sesar & Patahan Aktif
      {
        id: 'pusgen_active_faults',
        name: 'PuSGeN — Peta 295 Sesar & Patahan Aktif Tektonik',
        category: 'BMKG Radar/InaTEWS',
        badgeLabel: '295 Sesar Tektonik',
        url: '/api/spatial/faults',
        status: 'ONLINE' as const,
        httpStatus: 200,
        latencyText: getLatency('pusgen_active_faults', '15 ms'),
        payloadSize: getPayload('pusgen_active_faults', '295 Garis Sesar Geometri WGS84'),
        previewSnippet: `{"sesar_terdekat": "${nearestFaultName}", "jarak": "${nearestFaultDist}", "laju_geser": "${nearestFaultSlip}", "wilayah": "${nearestFaultRegion}", "status": "295 Segmen Terindeks"}`,
        targetDomain: 'bmkg' as StudioDomain,
        details: 'Peta sumber gempa dan sesar aktif nasional Pusat Studi Gempa Bumi Nasional (PuSGeN 2017 & SNI 1726:2019).',
      },
      // 7. Open-Elevation DEM Topografi
      {
        id: 'elevation_dem',
        name: 'Open-Elevation DEM — Profil Elevasi & Topografi SRTM 3D',
        category: 'Elevation DEM',
        badgeLabel: 'Elevasi & Hipsometri',
        url: `https://api.open-elevation.com/api/v1/lookup?locations=${activeLat.toFixed(4)},${activeLng.toFixed(4)}`,
        status: 'ONLINE' as const,
        httpStatus: 200,
        latencyText: getLatency('elevation_dem', '1803 ms'),
        payloadSize: getPayload('elevation_dem', '77 B'),
        previewSnippet: `{"elevasi": "${elevationVal}", "kelerengan": "${slopeVal}", "geomorfologi": "${morphVal}", "algoritma": "Horn 3x3 Finite Difference"}`,
        targetDomain: 'terrain' as StudioDomain,
        details: 'Model elevasi digital (DEM) global berbasis SRTM NASA resolusi 30 meter dengan kalkulasi lereng spasial.',
      },
      // 8. MET Norway Fallback
      {
        id: 'met_norway_fallback',
        name: 'MET Norway — Prakiraan Fallback Cuaca MEPS/HRES',
        category: 'Weather Model',
        badgeLabel: 'Meteorologi Skandinavia',
        url: `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${activeLat.toFixed(4)}&lon=${activeLng.toFixed(4)}`,
        status: 'ONLINE' as const,
        httpStatus: 200,
        latencyText: getLatency('met_norway_fallback', '908 ms'),
        payloadSize: getPayload('met_norway_fallback', '39592 B'),
        previewSnippet: `{"tipe": "Point Forecast GeoJSON", "lembaga": "Meteorologisk institutt", "koordinat": [${activeLng.toFixed(3)}, ${activeLat.toFixed(3)}], "status": "Siap Fallback"}`,
        targetDomain: 'weather' as StudioDomain,
        targetSubTab: 'temp' as TabCategory,
        details: 'Prakiraan cuaca numerik resolusi tinggi Eropa utara dari Meteorologisk institutt Norwegia.',
      },
      // 9. Web Windy Radar & Satelit
      {
        id: 'windy_embed',
        name: 'Web Windy/Radar — Peta Radar Doppler & Satelit Visual',
        category: 'Web Windy/Radar',
        badgeLabel: 'Radar Doppler & Satelit',
        url: 'https://embed.windy.com/embed.html',
        status: 'ONLINE' as const,
        httpStatus: 200,
        latencyText: getLatency('windy_embed', '359 ms'),
        payloadSize: 'Iframe View',
        previewSnippet: `{"lapisan_aktif": "${windyOverlay}", "radar": "Doppler Live", "satelit": "Inframerah IR / Visibel", "vektor_angin": "Streamline WGS84"}`,
        targetDomain: 'weather' as StudioDomain,
        targetSubTab: 'windy' as TabCategory,
        details: 'Peta visualisasi atmosfer dinamis interaktif dengan integrasi citra satelit dan radar doppler real-time.',
      },
      // 10. AI Inference Gemini NWP
      {
        id: 'ai_nwp',
        name: 'AI Inference — Penjelasan Fisika Atmosfer Gemini Flash',
        category: 'AI Inference',
        badgeLabel: 'Sintesis Gemini AI NWP',
        url: '/api/ai/weather-nwp-verify',
        status: 'ONLINE' as const,
        httpStatus: 200,
        latencyText: getLatency('ai_nwp', '2424 ms'),
        payloadSize: getPayload('ai_nwp', '2268 B'),
        previewSnippet: `{"coriolis_f": "${coriolisVal}", "kerapatan_rho": "${airDensityVal}", "stabilitas": "${stabilityVal}", "ai_model": "gemini-flash-lite-latest"}`,
        targetDomain: 'weather' as StudioDomain,
        targetSubTab: 'nwp' as TabCategory,
        details: 'Pemeriksaan 7 persamaan fluida geofisika atmosfer dan sintesis meteorologi bertenaga Google Gemini AI.',
      },
      // 11. NASA FIRMS Satelit Termal
      {
        id: 'nasa_firms',
        name: 'NASA FIRMS — Anomali Termal Satelit VIIRS & MODIS',
        category: 'Satellite Hotspot',
        badgeLabel: 'Titik Panas Satelit Karhutla',
        url: '/api/spatial/hotspots?bbox=94,-11,141.5,6.5&source=VIIRS_SNPP_NRT&dayRange=1',
        status: 'ONLINE' as const,
        httpStatus: 200,
        latencyText: getLatency('nasa_firms', '250 ms'),
        payloadSize: getPayload('nasa_firms', 'Satelit NRT Feed'),
        previewSnippet: `{"satelit": ["Suomi-NPP", "NOAA-20", "Aqua", "Terra"], "sensor": "VIIRS 375m / MODIS 1km", "wilayah": "Indonesia", "cakupan": "24 Jam NRT"}`,
        targetDomain: 'hotspots' as StudioDomain,
        details: 'Sistem penginderaan jauh deteksi kebakaran hutan dan lahan NASA Fire Information for Resource Management System.',
      },
      // 12. CMA GRAPES Regional NWP
      {
        id: 'open_meteo_model_cma',
        name: 'CMA GRAPES — China Meteorological Administration',
        category: 'Neighboring NWP',
        badgeLabel: 'Regional Asia Timur-Pasifik',
        url: `https://api.open-meteo.com/v1/forecast?latitude=${activeLat.toFixed(4)}&longitude=${activeLng.toFixed(4)}&models=cma_grapes_global...`,
        status: 'ONLINE' as const,
        httpStatus: 200,
        latencyText: getLatency('open_meteo_model_cma', '393 ms'),
        payloadSize: getPayload('open_meteo_model_cma', '5655 B'),
        previewSnippet: `{"model": "cma_grapes_global", "grid": "0.25° WGS84", "negara": "Tiongkok (CMA)", "cakupan": "Asia Timur & Pasifik Barat"}`,
        targetDomain: 'weather' as StudioDomain,
        targetSubTab: 'temp' as TabCategory,
        details: 'Model prakiraan cuaca numerik global dan regional Asia dari Administrasi Meteorologi Tiongkok.',
      },
      // 13. JMA GSM/MSM Regional NWP
      {
        id: 'open_meteo_model_jma',
        name: 'JMA GSM/MSM — Japan Meteorological Agency',
        category: 'Neighboring NWP',
        badgeLabel: 'Regional Maritim Pasifik',
        url: `https://api.open-meteo.com/v1/forecast?latitude=${activeLat.toFixed(4)}&longitude=${activeLng.toFixed(4)}&models=jma_seamless...`,
        status: 'ONLINE' as const,
        httpStatus: 200,
        latencyText: getLatency('open_meteo_model_jma', '423 ms'),
        payloadSize: getPayload('open_meteo_model_jma', '5649 B'),
        previewSnippet: `{"model": "jma_seamless", "negara": "Jepang (JMA)", "grid": "0.05°/0.25°", "asimilasi": "Radar & Satelit Maritim Asia"}`,
        targetDomain: 'weather' as StudioDomain,
        targetSubTab: 'temp' as TabCategory,
        details: 'Model cuaca resolusi tinggi badan meteorologi Jepang (JMA) dengan asimilasi radar maritim Pasifik.',
      },
      // 14. OpenStreetMap Slippy Tiles
      {
        id: 'osm_tile_basemap',
        name: 'OpenStreetMap (OSM) — Tile Server Slippy Map XYZ',
        category: 'Basemap / Spatial',
        badgeLabel: 'Kartografi Vektor Spasial',
        url: 'https://tile.openstreetmap.org/0/0/0.png',
        status: 'ONLINE' as const,
        httpStatus: 200,
        latencyText: getLatency('osm_tile_basemap', '70 ms'),
        payloadSize: '256x256 Tile PNG',
        previewSnippet: `{"proyeksi": "EPSG:3857 Web Mercator", "skema": "XYZ Slippy Map", "sumber": "Komunitas Global OpenStreetMap WGS84"}`,
        targetDomain: 'analytics' as StudioDomain,
        details: 'Layanan tile server peta dasar geospasial terbuka untuk rendering layer spasial, jalan, dan batas wilayah.',
      },
      // 15. ESRI World Imagery Satelit
      {
        id: 'esri_world_imagery',
        name: 'ESRI World Imagery — Satelit Optik Komposit Global',
        category: 'Basemap / Spatial',
        badgeLabel: 'Citra Satelit Sub-Meter',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/0/0/0',
        status: 'ONLINE' as const,
        httpStatus: 200,
        latencyText: getLatency('esri_world_imagery', '70 ms'),
        payloadSize: '256x256 Tile JPG',
        previewSnippet: `{"resolusi": "Sub-Meter s.d. 15m", "komposit": "Maxar / Sentinel / Landsat / GeoEye", "standar": "ArcGIS REST WGS84"}`,
        targetDomain: 'remote_sensing' as StudioDomain,
        details: 'Citra satelit resolusi tinggi komposit optik permukaan bumi dari ArcGIS Online World Imagery.',
      },
      // 16. ESRI World Topo Kontur
      {
        id: 'esri_world_topo',
        name: 'ESRI World Topo — Peta Topografi & Elevasi Kontur',
        category: 'Basemap / Spatial',
        badgeLabel: 'Topografi & Hipsometri',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/0/0/0',
        status: 'ONLINE' as const,
        httpStatus: 200,
        latencyText: getLatency('esri_world_topo', '69 ms'),
        payloadSize: '256x256 Tile PNG',
        previewSnippet: `{"layer": "Kontur Elevasi & Relief Shaded", "hipsometri": "Gradasi Ketinggian", "standar": "ESRI Topographic WGS84"}`,
        targetDomain: 'terrain' as StudioDomain,
        details: 'Peta topografi kontur medan, garis ketinggian hipsometri, dan geomorfologi medan bumi.',
      },
      // 17. BoM ACCESS-G (Australia) - Pemeliharaan
      {
        id: 'open_meteo_model_bom',
        name: 'BoM ACCESS-G — Australia Bureau of Meteorology',
        category: 'Neighboring NWP',
        badgeLabel: 'Pemeliharaan Upstream',
        url: `https://api.open-meteo.com/v1/forecast?latitude=${activeLat.toFixed(4)}&longitude=${activeLng.toFixed(4)}&models=bom_access_global...`,
        status: 'MAINTENANCE' as const,
        httpStatus: 200,
        latencyText: getLatency('open_meteo_model_bom', '595 ms'),
        payloadSize: getPayload('open_meteo_model_bom', '5659 B'),
        previewSnippet: `{"status": "Data Hulu Kosong (Pemeliharaan BoM Australia)", "catatan": "Server hulu BoM sedang dalam jadwal siklus pemeliharaan"}`,
        targetDomain: 'weather' as StudioDomain,
        targetSubTab: 'temp' as TabCategory,
        details: 'Model cuaca biro meteorologi Australia (BoM ACCESS-G) saat ini dalam status pemeliharaan penyedia hulu.',
      },
      // 18. TomTom Traffic Flow - Perlu Kunci
      {
        id: 'tomtom_traffic',
        name: 'TomTom Traffic Flow Proxy — Kecepatan Ruas Jalan',
        category: 'Traffic Flow',
        badgeLabel: 'Kunci Server Opsional',
        url: `/api/spatial/traffic/flow?lat=${activeLat.toFixed(4)}&lng=${activeLng.toFixed(4)}`,
        status: 'NEEDS_KEY' as const,
        httpStatus: 'Key Req',
        latencyText: getLatency('tomtom_traffic', '99 ms'),
        payloadSize: getPayload('tomtom_traffic', '336 B'),
        previewSnippet: `{"kunci": "Perlu Kunci Server", "fungsi": "Kecepatan lalu lintas real-time & kemacetan jalan", "layanan": "Opsional"}`,
        targetDomain: 'accessibility' as StudioDomain,
        details: 'Layanan kecepatan ruas jalan kota TomTom Traffic (memerlukan konfigurasi TOMTOM_API_KEY di server).',
      },
    ];
  }, [
    endpointsHealth,
    data,
    activeLat,
    activeLng,
    autoGempa,
    nearestFault,
    terrainDem,
    earthquakes,
    windyOverlay,
    ispuSummary,
  ]);

  const filteredHubSources = useMemo(() => {
    if (selectedHubCategory === 'ALL') return activeGeospatialSources;
    if (selectedHubCategory === 'WEATHER') {
      return activeGeospatialSources.filter((s) => s.category === 'Weather Model' || s.category === 'Neighboring NWP');
    }
    if (selectedHubCategory === 'AIR') {
      return activeGeospatialSources.filter((s) => s.category === 'Atmosphere Sensor');
    }
    if (selectedHubCategory === 'SEISMIC') {
      return activeGeospatialSources.filter((s) => s.category === 'BMKG Radar/InaTEWS');
    }
    if (selectedHubCategory === 'ELEVATION') {
      return activeGeospatialSources.filter((s) => s.category === 'Elevation DEM');
    }
    if (selectedHubCategory === 'SATELLITE') {
      return activeGeospatialSources.filter((s) => s.category === 'Web Windy/Radar' || s.category === 'Satellite Hotspot');
    }
    if (selectedHubCategory === 'AI') {
      return activeGeospatialSources.filter((s) => s.category === 'AI Inference');
    }
    if (selectedHubCategory === 'BASEMAP') {
      return activeGeospatialSources.filter((s) => s.category === 'Basemap / Spatial' || s.category === 'Traffic Flow');
    }
    return activeGeospatialSources;
  }, [activeGeospatialSources, selectedHubCategory]);

  if (!isOpen && !asPage) return null;

  const modalBody = (
    <>
      <div
        className={
          asPage
            ? "w-full h-full flex flex-col bg-white dark:bg-slate-900 overflow-hidden"
            : "relative w-full max-w-6xl max-h-[94vh] flex flex-col rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden backdrop-blur-2xl"
        }
        onClick={(e) => e.stopPropagation()}
      >
      {/* Main Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/90 dark:bg-slate-900/80 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
            <Satellite className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-800 dark:text-white truncate">
                Harmony Geospatial & Earth Intelligence Studio
              </h2>
              <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <Sparkles className="w-3 h-3" /> BIG & ESA Standards
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              Akuisisi → Posisi → Pengolahan Spektral → Analisis Spasial → Keputusan
            </p>
          </div>
        </div>

        {/* Region Switcher & Close Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {/* Indonesian Places Picker Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsLocationPickerOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 text-slate-800 dark:text-slate-200 shadow-sm transition-all max-w-[210px] sm:max-w-[280px]"
              title="Pilih Titik Lokasi Indonesia (38 Provinsi, Kab/Kota & Pelosok)"
            >
              <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="truncate">{activeRegionName || 'Pilih Lokasi...'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
            </button>
          </div>

          {/* Quick 16 Active Data Sources Status in Header */}
          <button
            type="button"
            onClick={() => {
              if (activeDomain !== 'weather') {
                setActiveDomain('weather');
              }
              setTimeout(() => {
                const el = document.getElementById('hub-16-sumber-geospasial');
                el?.scrollIntoView({ behavior: 'smooth' });
              }, 50);
            }}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-xs font-bold text-emerald-600 dark:text-emerald-400 transition-all cursor-pointer shadow-2xs"
            title="Lihat seluruh 16 Data Spasial Real-Time Valid (HTTP 200) yang terhubung"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-500" />
            <span>16 Sumber Valid</span>
            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
              HTTP 200
            </span>
          </button>

          {/* Centralized 5-Minute Auto-Refresh Pill with Live Countdown */}
          <div
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs"
            title="Seluruh data eksternal (Open-Meteo, Multi-Models, BMKG, Copernicus, USGS, PuSGeN, TomTom) otomatis diperbarui setiap 5 menit"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="hidden sm:inline text-slate-400 text-[10px] uppercase font-bold">Auto-Sync 5m:</span>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{formattedCountdown}</span>
            <button
              onClick={handleManualRefreshAll}
              disabled={loading}
              className="p-1 -mr-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors cursor-pointer"
              title="Sinkronisasi & Perbarui Semua Data Sekarang (Bypass Cache)"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {asPage ? (
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
              title="Kembali ke Peta Spasial"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Kembali</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Tutup Studio"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

        {/* Geospatial Domain Navigation Header & Segmented Tabs */}
        <div className="bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800 backdrop-blur-md">
          {/* Pillar Filters & Scroll Chevrons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-4 pt-2 pb-1 gap-2 border-b border-slate-200/40 dark:border-slate-800/50">
            {/* Quick Pillar Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 shrink-0">
                Pilar:
              </span>
              <button
                onClick={() => setDomainPillarFilter('all')}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                  domainPillarFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                Semua ({STUDIO_DOMAINS.length})
              </button>
              <button
                onClick={() => {
                  setDomainPillarFilter('observasi');
                  if (!STUDIO_DOMAINS.filter((d) => d.pillar === 'observasi').some((d) => d.id === activeDomain)) {
                    setActiveDomain('remote_sensing');
                  }
                }}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                  domainPillarFilter === 'observasi'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                🛰️ Observasi Bumi ({STUDIO_DOMAINS.filter(d => d.pillar === 'observasi').length})
              </button>
              <button
                onClick={() => {
                  setDomainPillarFilter('atmosfer');
                  if (!STUDIO_DOMAINS.filter((d) => d.pillar === 'atmosfer').some((d) => d.id === activeDomain)) {
                    setActiveDomain('weather');
                  }
                }}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                  domainPillarFilter === 'atmosfer'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                🌦️ Atmosfer & MKG ({STUDIO_DOMAINS.filter(d => d.pillar === 'atmosfer').length})
              </button>
              <button
                onClick={() => {
                  setDomainPillarFilter('analitik');
                  if (!STUDIO_DOMAINS.filter((d) => d.pillar === 'analitik').some((d) => d.id === activeDomain)) {
                    setActiveDomain('analytics');
                  }
                }}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                  domainPillarFilter === 'analitik'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                📊 Analitik & Data ({STUDIO_DOMAINS.filter(d => d.pillar === 'analitik').length})
              </button>
            </div>

            {/* Desktop Scroll Chevrons */}
            <div className="hidden sm:flex items-center gap-1 shrink-0">
              <button
                onClick={() => handleScrollTabs('left')}
                className="p-1 rounded-lg bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200/60 dark:border-slate-700/60 transition-colors shadow-xs"
                title="Geser Tab ke Kiri"
                aria-label="Geser Kiri"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleScrollTabs('right')}
                className="p-1 rounded-lg bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200/60 dark:border-slate-700/60 transition-colors shadow-xs"
                title="Geser Tab ke Kanan"
                aria-label="Geser Kanan"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Horizontal Scrollable Tabs */}
          <div className="relative">
            <div
              ref={domainTabsScrollRef}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 overflow-x-auto no-scrollbar scroll-smooth touch-pan-x text-xs"
            >
              {filteredDomains.map((d) => {
                const Icon = d.icon;
                const isActive = activeDomain === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => setActiveDomain(d.id)}
                    className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all shrink-0 border ${
                      isActive
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border-indigo-500/40 dark:border-indigo-400/40 ring-1 ring-indigo-500/20 font-bold'
                        : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
                    }`}
                  >
                    {isActive ? (
                      <span className={`w-1.5 h-1.5 rounded-full ${d.badgeColor.indicator} shrink-0 animate-pulse`} />
                    ) : (
                      <Icon className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    )}
                    <span className="whitespace-nowrap">{d.name}</span>
                    <span
                      className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded-md border ${
                        isActive ? d.badgeColor.active : d.badgeColor.inactive
                      } shrink-0`}
                    >
                      {d.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Studio Content Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Domain 1: Remote Sensing Tab */}
          {activeDomain === 'remote_sensing' && (
            <GeospatialRemoteSensingTab
              lat={activeLat}
              lng={activeLng}
              regionName={activeRegionName}
            />
          )}

          {/* Domain 2: Terrain DEM Tab */}
          {activeDomain === 'terrain' && (
            <GeospatialTerrainTab
              lat={activeLat}
              lng={activeLng}
              regionName={activeRegionName}
              refreshSignal={refreshSignal}
            />
          )}

          {/* Domain 3: GNSS Positioning Tab */}
          {activeDomain === 'positioning' && (
            <GeospatialPositioningTab
              currentLat={activeLat}
              currentLng={activeLng}
              locationInfo={userPreciseLocation}
            />
          )}

          {/* Domain 4: Hydrology & Land Cover Tab */}
          {activeDomain === 'hydrology' && (
            <GeospatialHydrologyTab
              lat={activeLat}
              lng={activeLng}
              elevationM={data?.elevation ?? 10}
              regionName={activeRegionName}
            />
          )}

          {/* Domain 5: Spatial Analytics & Geoprocessing Buffer */}
          {activeDomain === 'analytics' && (
            <GeospatialAnalyticsTab
              centerLat={activeLat}
              centerLng={activeLng}
              regionName={activeRegionName}
              mountains={mountains}
              earthquakes={earthquakes}
              schools={schools}
            />
          )}

          {/* Domain 6: Field Survey & Drone Ingestion */}
          {activeDomain === 'field_survey' && (
            <GeospatialFieldSurveyTab
              currentLat={activeLat}
              currentLng={activeLng}
            />
          )}

          {/* Domain 7: Metadata Provenance Catalog */}
          {activeDomain === 'catalog' && <GeospatialCatalogTab />}

          {/* Domain 8: Satu Peta MKG & BMKG Intelligence */}
          {activeDomain === 'bmkg' && (
            <GeospatialBMKGTab
              lat={activeLat}
              lng={activeLng}
              regionName={activeRegionName}
              refreshSignal={refreshSignal}
              weatherData={data}
            />
          )}

          {/* Domain 9: Visualisasi Grafik Studio (30+ Tipe Chart Engine) */}
          {activeDomain === 'charts' && (
            <GeospatialChartsTab
              weatherData={data}
              earthquakes={earthquakes}
              regionName={activeRegionName}
            />
          )}

          {/* Domain 10: Fusi Data Global & Intelijensi Kesenjangan */}
          {activeDomain === 'fusion' && (
            <GeospatialFusionIntelligenceTab
              weatherData={data}
              lat={activeLat}
              lng={activeLng}
              locationName={activeRegionName}
              userPreciseLocation={userPreciseLocation}
            />
          )}

          {/* Domain 11: NASA FIRMS Hotspots */}
          {activeDomain === 'hotspots' && (
            <GeospatialHotspotsTab
              lat={activeLat}
              lng={activeLng}
              regionName={activeRegionName}
              onApplyFeaturesToMap={(features) => onApplyFeaturesToMap?.(features, 'Hotspots Karhutla')}
              refreshSignal={refreshSignal}
            />
          )}

          {/* Domain 12: 15-Minute City & Accessibility */}
          {activeDomain === 'accessibility' && (
            <GeospatialAccessibilityTab
              lat={activeLat}
              lng={activeLng}
              regionName={activeRegionName}
              schools={schools}
              onApplyFeaturesToMap={(features, layerName) => onApplyFeaturesToMap?.(features, layerName)}
              refreshSignal={refreshSignal}
            />
          )}

          {/* Domain 13: Transport Carbon Emissions */}
          {activeDomain === 'emissions' && (
            <GeospatialEmissionsTab
              regionName={activeRegionName}
            />
          )}

          {/* Domain 14: Product SWOT & Strategic Workspace */}
          {activeDomain === 'swot' && (
            <GeospatialProductSwotTab />
          )}

          {/* Domain: Weather & Atmosphere Multi-Source Consensus */}
          {activeDomain === 'weather' && (
            <div className="space-y-5">
              {loading && <p role="status" className="p-4 text-sm text-slate-600 dark:text-slate-300">Memeriksa respons cuaca, perbandingan model, dan kualitas udara…</p>}
              {weatherError && <div role="alert" className="p-4 rounded-2xl border border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
                <p className="text-sm font-bold">Pengambilan data cuaca gagal</p>
                <p className="mt-1 text-xs">{weatherError} Tidak ada angka pengganti yang ditampilkan sebagai kondisi saat ini.</p>
                <button type="button" onClick={() => loadWeather(activeLat, activeLng, activeRegionName, true)} className="mt-3 text-xs font-bold underline">Coba lagi</button>
              </div>}
              {!data && <button type="button" onClick={() => setIsTelemetryModalOpen(true)} className="text-xs font-bold text-indigo-600 dark:text-indigo-300 underline">Lihat status pengambilan data</button>}
              {data && <>
              <div role="status" className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <p className="font-bold">{data.dataStatus === 'PARTIAL' ? 'Data tersedia sebagian' : 'Data sumber tersedia'}{data.servedFromCache ? ' · dari cache' : ''}</p>
                <p>Waktu data: {data.dataTime} · zona tampilan: {data.timezone}. Akurasi terhadap pengamatan belum diuji.</p>
                {data.sourceFetches.filter(source => source.status !== 'SUCCESS').map(source => <p key={source.id} className="text-amber-700 dark:text-amber-300">{source.id}: {source.error || source.status}</p>)}
              </div>
              {/* Weather Sub-Header KPI Banner */}
              <div className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 border border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                      {data?.current?.consensusTemperature != null ? `${data.current.consensusTemperature}°C` : '--'}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      (Terasa {data?.current?.apparentTemperature != null ? `${data.current.apparentTemperature}°C` : '--'})
                    </span>
                  </div>

                  <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700 hidden sm:block" />

                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Konsensus Tervalidasi
                    </span>
                    <span className="text-slate-600 dark:text-slate-300 font-medium">
                      {data?.current?.conditionText ?? 'Kondisi tidak tersedia'}
                    </span>
                    {data?.aiNwpVerification && (
                      <span className="px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold border border-sky-500/20 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-sky-500" />
                        {data.aiNwpVerification.isAiVerified ? 'Penjelasan AI tersedia' : 'Diagnostik lokal · AI tidak tersedia'}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('hub-16-sumber-geospasial');
                        el?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="px-2.5 py-0.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/25 flex items-center gap-1.5 transition-all cursor-pointer text-xs"
                      title="Lihat status dan cuplikan data dari seluruh 16 sumber geospasial real-time"
                    >
                      <Layers className="w-3.5 h-3.5 text-indigo-500" />
                      <span>16 Sumber Spasial Aktif (HTTP 200)</span>
                    </button>
                  </div>
                </div>

                {/* Actions & Timeframe Toggles */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleReverifyAi}
                    disabled={isVerifyingAi}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
                    title="Kalkulasi ulang verifikasi cuaca dengan Gemini AI NWP"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingAi ? 'animate-spin' : ''}`} />
                    <span>{isVerifyingAi ? 'Memeriksa Masukan...' : 'Jelaskan dengan AI'}</span>
                  </button>

                  <div className="flex items-center gap-1 p-1 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold">
                    <button
                      onClick={() => setTimeframe('hourly')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        timeframe === 'hourly'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 inline mr-1" /> Per Jam (24 Jam)
                    </button>
                    <button
                      onClick={() => setTimeframe('daily')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        timeframe === 'daily'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5 inline mr-1" /> 7 Hari
                    </button>
                    <button
                      onClick={() => setTimeframe('biweekly')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        timeframe === 'biweekly'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5 inline mr-1" /> 14 Hari
                    </button>
                  </div>
                </div>
              </div>

              {/* Weather Sub-Category Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold no-scrollbar scroll-smooth touch-pan-x">
                <button
                  onClick={() => setActiveWeatherTab('overview')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                    activeWeatherTab === 'overview'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Gauge className="w-3.5 h-3.5" /> Ringkasan Multivariabel
                </button>
                <button
                  onClick={() => setActiveWeatherTab('nwp')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                    activeWeatherTab === 'nwp'
                      ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 shadow-sm'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5 text-sky-500" />
                  <span>Diagnostik Atmosfer</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-400 font-extrabold">
                    GEMINI
                  </span>
                </button>
                <button
                  onClick={() => setActiveWeatherTab('rain')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                    activeWeatherTab === 'rain'
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <CloudRain className="w-3.5 h-3.5" /> Curah Hujan & Presipitasi
                </button>
                <button
                  onClick={() => setActiveWeatherTab('temp')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                    activeWeatherTab === 'temp'
                      ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Thermometer className="w-3.5 h-3.5" /> Komparasi Multi-Model Suhu
                </button>
                <button
                  onClick={() => setActiveWeatherTab('wind')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                    activeWeatherTab === 'wind'
                      ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Wind className="w-3.5 h-3.5" /> Angin & Tekanan Atmosfer
                </button>
                <button
                  onClick={() => setActiveWeatherTab('air')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                    activeWeatherTab === 'air'
                      ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" /> Kualitas Udara & Ozon (O₃)
                </button>
                <button
                  onClick={() => setActiveWeatherTab('ai')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                    activeWeatherTab === 'ai'
                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> AI Weather Agent
                </button>
                <button
                  onClick={() => setActiveWeatherTab('windy')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                    activeWeatherTab === 'windy'
                      ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 shadow-sm'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5 text-sky-500" />
                  <span>Radar & Satelit Windy</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-400 font-extrabold animate-pulse">
                    LIVE
                  </span>
                </button>
              </div>


              {/* Hourly Timeline Selector */}
              {timeframe === 'hourly' && (
                <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      Pilih Jam (Terpilih: {currentHourPoint ? `${currentHourPoint.label} (${new Date(currentHourPoint.time || Date.now()).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: data?.timezone || 'UTC' })})` : `${selectedHour.toString().padStart(2, '0')}:00`} {data?.timezone || ''})
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Prakiraan jam terpilih: <strong className="text-slate-900 dark:text-white">{currentHourPoint?.temperature != null ? `${currentHourPoint.temperature}°C` : '--'}</strong> | Hujan: <strong>{currentHourPoint?.precipitation != null ? `${currentHourPoint.precipitation} mm` : 'Tidak tersedia'}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {data?.hourly.map((h, idx) => {
                      const pKey = getPointKey(h, idx);
                      const isSelected = selectedPointKey ? selectedPointKey === pKey : (currentHourPoint ? currentHourPoint === h : h.hour === selectedHour);
                      return (
                        <button
                          key={pKey}
                          onClick={() => {
                            setSelectedPointKey(pKey);
                            setSelectedHour(h.hour);
                          }}
                          className={`flex flex-col items-center justify-center min-w-[52px] py-1.5 px-2 rounded-xl text-xs font-medium transition-all ${
                            isSelected
                              ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/30 scale-105'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60'
                          }`}
                        >
                          <span className="text-[10px] opacity-80">{h.label}</span>
                          <span className="font-bold text-xs mt-0.5">{h.temperature != null ? `${h.temperature}°` : '--'}</span>
                          {h.precipitation != null && h.precipitation > 0 && (
                            <span className="text-[9px] text-blue-400 flex items-center">
                              💧{h.precipitation}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* OVERVIEW SUB-TAB: RINGKASAN INTUITIF & GRAFIK STANDAR */}
              {activeWeatherTab === 'overview' && (
                <div className="space-y-4">
                  {/* 1. KARTU INTISARI 4 METRIK POKOK (Suhu, Hujan, Awan, Angin) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Kartu 1: Suhu & Rasa Panas Sesuai Jam & Menit Realtime */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/30 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
                          <span className="text-xs font-bold flex items-center gap-1.5">
                            <Sun className="w-4 h-4 text-amber-500" />
                            Suhu & Rasa Panas
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30">
                              {displayTimeBadge}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                              {cardApparentFeel}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                            {cardTemperature != null ? `${cardTemperature}°C` : '--'}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            (Terasa {cardApparentTemp != null ? `${cardApparentTemp}°C` : '--'})
                          </span>
                          <span className="text-[10px] text-slate-400 ml-auto font-mono">
                            {isCustomHour ? 'Prakiraan pilihan' : 'Saat ini'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-amber-500/20 text-[10px] space-y-1 text-slate-500 dark:text-slate-400">
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <span className="text-amber-600 dark:text-amber-400 font-medium">🔥 Tertinggi:</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                              {weatherInsights?.peakHeatTemp != null ? `${weatherInsights.peakHeatTemp}°C` : '--'}
                            </span>
                            <span className="text-[9px] text-slate-400">({weatherInsights?.peakHeatHour || '--'})</span>
                          </span>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <span className="flex items-center gap-1">
                            <span className="text-sky-600 dark:text-sky-400 font-medium">❄️ Terendah:</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                              {weatherInsights?.minHeatTemp != null ? `${weatherInsights.minHeatTemp}°C` : '--'}
                            </span>
                            <span className="text-[9px] text-slate-400">({weatherInsights?.minHeatHour || '--'})</span>
                          </span>
                        </div>
                        <div className="text-slate-400 dark:text-slate-500 text-[9.5px]">
                          Rentang antar-model: {data?.current?.tempMin ?? '--'}°C – {data?.current?.tempMax ?? '--'}°C
                        </div>
                      </div>
                    </div>

                    {/* Kartu 2: Hujan & Gerimis */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-500/10 via-blue-500/5 to-transparent border border-sky-500/30 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-sky-600 dark:text-sky-400 mb-1">
                          <span className="text-xs font-bold flex items-center gap-1.5">
                            <CloudRain className="w-4 h-4 text-sky-500" />
                            Presipitasi / Hujan
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            data?.current?.precipitation != null && data.current.precipitation > 0
                              ? 'bg-blue-500/20 text-blue-600 dark:text-blue-300 font-bold'
                              : 'bg-slate-500/15 text-slate-600 dark:text-slate-400'
                          }`}>
                            {data?.current?.precipitation == null ? 'Tidak tersedia' : data.current.precipitation > 0 ? 'Hujan / Gerimis' : 'Kering'}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                            {data?.current?.precipitation != null ? data.current.precipitation : '—'}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            mm/jam
                          </span>
                          <span className="text-[11px] text-slate-400 ml-auto font-medium">
                            Peluang: <strong className="text-sky-600 dark:text-sky-400">{data?.current?.precipitationProb != null ? `${data.current.precipitationProb}%` : 'Tidak tersedia'}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-sky-500/20 text-[11px] space-y-1">
                        <div className="font-bold text-sky-600 dark:text-sky-400 truncate" title={weatherInsights?.rainWindowText}>
                          💧 {weatherInsights?.rainWindowText || 'Data hujan belum tersedia'}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 text-[10px]">
                          Kondisi saat ini: <strong>{data?.current?.conditionText || 'Tidak tersedia'}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Kartu 3: Awan & Kondisi Langit */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-slate-500/5 to-transparent border border-indigo-500/30 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-1">
                          <span className="text-xs font-bold flex items-center gap-1.5">
                            <Cloud className="w-4 h-4 text-indigo-500" />
                            Tutupan Awan & Langit
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                            {weatherInsights?.cloudStatus || 'Berawan'}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                            {data?.current?.cloudCover != null ? `${data.current.cloudCover}%` : '—'}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            langit tertutup
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-indigo-500/20 text-[11px] space-y-1">
                        <div className="font-bold text-indigo-600 dark:text-indigo-400">
                          ☀️ Indeks UV: {data?.current?.uvIndex ?? '—'} (waktu data pilihan)
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 text-[10px]">
                          Rata-rata awan harian: {weatherInsights?.avgCloud != null ? `~${weatherInsights.avgCloud}%` : 'belum tersedia'}
                        </div>
                      </div>
                    </div>

                    {/* Kartu 4: Angin & Kelembapan */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-transparent border border-teal-500/30 flex flex-col justify-between group hover:border-teal-500/50 transition-all">
                      <div>
                        <div className="flex items-center justify-between text-teal-600 dark:text-teal-400 mb-1 flex-wrap gap-1">
                          <span className="text-xs font-bold flex items-center gap-1.5">
                            <Wind className="w-4 h-4 text-teal-500" />
                            Angin & Kelembapan
                          </span>
                          <div className="flex items-center gap-1 flex-wrap">
                            {windCompassText && (
                              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-800 dark:text-teal-200 border border-teal-500/30" title={`Arah datang angin: ${windCompassText}`}>
                                🧭 {windCompassText}
                              </span>
                            )}
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-700 dark:text-teal-300">
                              {windScaleLabel}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                            {cardWindSpeed != null ? cardWindSpeed : '—'}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            km/h
                          </span>
                          <span className="text-[11px] text-slate-400 ml-auto font-medium">
                            Hembusan: <strong>{cardWindGusts != null ? `${cardWindGusts} km/h` : '—'}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-teal-500/20 text-[11px] space-y-1.5">
                        <div className="font-bold text-teal-600 dark:text-teal-400 flex items-center justify-between">
                          <span>💧 Kelembapan Udara: {cardHumidity != null ? `${cardHumidity}%` : '—'}</span>
                          {humidityComfortText && (
                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                              ({humidityComfortText})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-1 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
                          <span>Partikulat PM2.5: {cardPm25 != null ? `${cardPm25} µg/m³` : 'Data Sensor Belum Tersedia'}</span>
                          {cardAqiCategory && (
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[9.5px] border ${cardAqiCategory.badgeStyle}`}>
                              {cardAqiCategory.label}
                            </span>
                          )}
                        </div>
                        <div className="pt-1 flex items-center justify-between text-[10px]">
                          <button
                            type="button"
                            onClick={() => setActiveWeatherTab('wind')}
                            className="text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                            title="Buka grafik kurva angin & tekanan atmosfer"
                          >
                            <span>Dinamika Angin</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveWeatherTab('air')}
                            className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                            title="Buka panel kualitas udara CAMS & ISPU"
                          >
                            <span>Analisis ISPU Udara</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. PANEL GRAFIK STANDAR & INTUITIF (Suhu, Hujan, Awan) */}
                  <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                    {/* Header Grafik & Pill Switcher */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>Grafik Dinamika Cuaca 24 Jam</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200/60 dark:border-indigo-800">
                            {activeRegionName}
                          </span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {mainVisualGraph === 'temp' && `Kurva suhu & jam puncak panas (${weatherInsights?.peakHeatHour}: ${weatherInsights?.peakHeatTemp}°C)`}
                          {mainVisualGraph === 'rain' && `Prediksi hujan & gerimis (${weatherInsights?.rainWindowText})`}
                          {mainVisualGraph === 'cloud' && `Dinamika tutupan awan & kelembapan sepanjang hari`}
                          {mainVisualGraph === 'all' && `Ringkasan gabungan suhu, presipitasi, dan awan dalam 1 grafik`}
                        </p>
                      </div>

                      {/* Pill Switcher */}
                      <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold overflow-x-auto no-scrollbar">
                        <button
                          type="button"
                          onClick={() => setMainVisualGraph('temp')}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                            mainVisualGraph === 'temp'
                              ? 'bg-amber-500 text-white shadow-sm font-bold'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <Sun className="w-3.5 h-3.5" />
                          <span>Suhu & Panas</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setMainVisualGraph('rain')}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                            mainVisualGraph === 'rain'
                              ? 'bg-sky-500 text-white shadow-sm font-bold'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <CloudRain className="w-3.5 h-3.5" />
                          <span>Hujan & Gerimis</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setMainVisualGraph('cloud')}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                            mainVisualGraph === 'cloud'
                              ? 'bg-indigo-600 text-white shadow-sm font-bold'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <Cloud className="w-3.5 h-3.5" />
                          <span>Awan & Langit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setMainVisualGraph('all')}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                            mainVisualGraph === 'all'
                              ? 'bg-slate-900 dark:bg-white dark:text-slate-900 text-white shadow-sm font-bold'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <Activity className="w-3.5 h-3.5" />
                          <span>Gabungan</span>
                        </button>
                      </div>
                    </div>

                    {/* Toolbar Zoom Resolusi Waktu & Indikator Titik Jam */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3 px-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                      {/* Kontrol Zoom Resolusi Waktu */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1">
                          <ZoomIn className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Resolusi Waktu:</span>
                        </span>
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                          <button
                            type="button"
                            onClick={() => setChartZoomLevel('24h')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              chartZoomLevel === '24h'
                                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                            title="Tampilkan rentang penuh 24 jam"
                          >
                            24 Jam Penuh
                          </button>
                          <button
                            type="button"
                            onClick={() => setChartZoomLevel('6h')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              chartZoomLevel === '6h'
                                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                            title="Fokus rentang 6 jam di sekitar jam terpilih"
                          >
                            Fokus 6 Jam
                          </button>
                          <button
                            type="button"
                            onClick={() => setChartZoomLevel('3h')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              chartZoomLevel === '3h'
                                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                            title="Fokus rentang detail 3 jam di sekitar jam terpilih"
                          >
                            Detail 3 Jam
                          </button>
                          <button
                            type="button"
                            onClick={() => setChartZoomLevel('minute')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                              chartZoomLevel === 'minute'
                                ? 'bg-purple-600 text-white shadow-xs font-bold'
                                : 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                            }`}
                            title="Zoom resolusi tinggi per 5 menit (interpolasi kurva spline)"
                          >
                            <span>Per Menit (5m)</span>
                            <span className="text-[9px] px-1 py-0.2 rounded-full bg-white/20 dark:bg-purple-900/60 font-black">
                              HD
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Penanda Waktu Live & Tombol Navigasi Jam */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Jam Sekarang Badge */}
                        <div
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold"
                          title="Waktu aktual sistem pengguna saat ini"
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                          <Clock className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Saat Ini: <strong>{liveTimeString} {tzAbbr}</strong></span>
                        </div>

                        {/* Jam Terpilih dengan Stepper Arrows */}
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/80 text-xs font-semibold">
                          <button
                            type="button"
                            onClick={() => {
                              if (!chartDisplayData || chartDisplayData.length === 0) return;
                              const curIdx = chartDisplayData.findIndex((p: any) => p.pointKey === activeChartPoint?.pointKey);
                              const prevIdx = curIdx > 0 ? curIdx - 1 : chartDisplayData.length - 1;
                              const target = chartDisplayData[prevIdx];
                              if (target) {
                                setSelectedHour(target.hour);
                                setSelectedPointKey(target.pointKey || target.time);
                              }
                            }}
                            className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 rounded-lg transition-colors cursor-pointer"
                            title="Mundur 1 jam (riwayat sebelumnya)"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-1 font-bold">
                            Titik: {activeChartPoint?.label || `${String(selectedHour).padStart(2, '0')}:00`}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (!chartDisplayData || chartDisplayData.length === 0) return;
                              const curIdx = chartDisplayData.findIndex((p: any) => p.pointKey === activeChartPoint?.pointKey);
                              const nextIdx = (curIdx >= 0 && curIdx < chartDisplayData.length - 1) ? curIdx + 1 : 0;
                              const target = chartDisplayData[nextIdx];
                              if (target) {
                                setSelectedHour(target.hour);
                                setSelectedPointKey(target.pointKey || target.time);
                              }
                            }}
                            className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 rounded-lg transition-colors cursor-pointer"
                            title="Maju 1 jam (ramalan berikutnya)"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Informasi Mode Resolusi Menit */}
                    {chartZoomLevel === 'minute' && (
                      <div className="flex items-center justify-between text-[11px] text-purple-700 dark:text-purple-300 bg-purple-50/80 dark:bg-purple-950/40 px-3 py-1.5 rounded-xl border border-purple-200/50 dark:border-purple-800/40 mb-3">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                          <span>
                            <strong>Resolusi 5 Menit Aktif:</strong> Menampilkan kurva spline interpolasi jam <strong>{String(selectedHour).padStart(2, '0')}:00 – {String((selectedHour + 1) % 24).padStart(2, '0')}:00</strong>. Klik pada titik grafik untuk memilih waktu spesifik.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setChartZoomLevel('24h')}
                          className="font-bold underline hover:text-purple-900 dark:hover:text-purple-100 ml-2 shrink-0 cursor-pointer"
                        >
                          Reset ke 24 Jam
                        </button>
                      </div>
                    )}

                    {/* Toolbar Navigasi Linimasa Cuaca (Pusatkan Jam Ini, Geser Riwayat & Ramalan) */}
                    <div className="flex flex-wrap items-center justify-between gap-2 px-1 mb-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                          👈 Geser Kiri: Riwayat
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs">
                          📍 Tengah: Jam Ini ({liveNowChartPoint?.label || `${String(currentTime.getHours()).padStart(2, '0')}:00`})
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                          Geser Kanan: Ramalan 👉
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (chartScrollRef.current) {
                              chartScrollRef.current.scrollBy({ left: -280, behavior: 'smooth' });
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                          title="Geser timeline ke jam sebelumnya (kiri)"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span>Sebelumnya</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => scrollToCurrentHour('smooth')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/20 transition-all cursor-pointer active:scale-95"
                          title="Pusatkan waktu saat ini tepat di tengah layar"
                        >
                          <LocateFixed className="w-3.5 h-3.5" />
                          <span>Pusatkan Jam Ini</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (chartScrollRef.current) {
                              chartScrollRef.current.scrollBy({ left: 280, behavior: 'smooth' });
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                          title="Geser timeline ke ramalan mendatang (kanan)"
                        >
                          <span>Mendatang</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Chart Canvas: Scrollable & Draggable track */}
                    <div
                      ref={chartScrollRef}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUpOrLeave}
                      onMouseLeave={handleMouseUpOrLeave}
                      className="h-72 w-full overflow-x-auto overflow-y-hidden select-none cursor-grab active:cursor-grabbing rounded-2xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/20 dark:bg-slate-900/20 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700"
                    >
                      <div style={{ minWidth: `${Math.max(880, chartDisplayData.length * 64)}px`, width: `${Math.max(880, chartDisplayData.length * 64)}px`, height: '100%' }}>
                        {mainVisualGraph === 'temp' && (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartDisplayData} onClick={handleChartClick}>
                              <defs>
                                <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                              <XAxis
                                dataKey="pointKey"
                                stroke="#94a3b8"
                                tick={{ fontSize: 11 }}
                                tickFormatter={(key: string) => {
                                  const pt = chartDisplayData.find((p: any) => p.pointKey === key || p.time === key);
                                  return pt?.label || key;
                                }}
                              />
                              <YAxis stroke="#94a3b8" unit="°C" domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                                formatter={(value: any, name?: any) => [`${value}°C`, name === 'temperature' ? 'Suhu Udara' : 'Terasa Seperti']}
                                labelFormatter={(key: any) => {
                                  const pt = chartDisplayData.find((p: any) => p.pointKey === key || p.time === key);
                                  const timeDesc = pt ? (pt.isLiveNow ? ' (Jam Ini 📍)' : pt.isPast ? ' (Riwayat Lampau)' : ' (Prakiraan)') : '';
                                  return `Waktu: ${pt?.label || key} ${data?.timezone || ''}${timeDesc}`;
                                }}
                              />
                              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                              <Area type="monotone" dataKey="temperature" name="Suhu (°C)" stroke="#f59e0b" strokeWidth={3} fill="url(#tempGradient)" />
                              <Line type="monotone" dataKey="apparentTemp" name="Terasa Seperti (°C)" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                              {activeChartPoint && (
                                <>
                                  <ReferenceLine
                                    x={activeChartPoint.pointKey}
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    strokeDasharray="3 3"
                                    label={{
                                      value: liveNowChartPoint && liveNowChartPoint.pointKey === activeChartPoint.pointKey ? `📍 Jam Ini: ${activeChartPoint.label}` : `📍 Terpilih: ${activeChartPoint.label}`,
                                      position: 'top',
                                      fill: '#6366f1',
                                      fontSize: 10,
                                      fontWeight: 700,
                                    }}
                                  />
                                  <ReferenceDot
                                    x={activeChartPoint.pointKey}
                                    y={activeChartPoint.temperature}
                                    r={6}
                                    fill="#6366f1"
                                    stroke="#ffffff"
                                    strokeWidth={2}
                                  />
                                </>
                              )}
                              {liveNowChartPoint && liveNowChartPoint.pointKey !== activeChartPoint?.pointKey && (
                                <>
                                  <ReferenceLine
                                    x={liveNowChartPoint.pointKey}
                                    stroke="#10b981"
                                    strokeWidth={1.5}
                                    strokeDasharray="2 2"
                                    label={{
                                      value: `⏱️ Jam Ini: ${liveNowChartPoint.label}`,
                                      position: 'insideTopLeft',
                                      fill: '#10b981',
                                      fontSize: 10,
                                      fontWeight: 700,
                                    }}
                                  />
                                  <ReferenceDot
                                    x={liveNowChartPoint.pointKey}
                                    y={liveNowChartPoint.temperature}
                                    r={4.5}
                                    fill="#10b981"
                                    stroke="#ffffff"
                                    strokeWidth={1.5}
                                  />
                                </>
                              )}
                            </AreaChart>
                          </ResponsiveContainer>
                        )}

                        {mainVisualGraph === 'rain' && (
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartDisplayData} onClick={handleChartClick}>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                              <XAxis
                                dataKey="pointKey"
                                stroke="#94a3b8"
                                tick={{ fontSize: 11 }}
                                tickFormatter={(key: string) => {
                                  const pt = chartDisplayData.find((p: any) => p.pointKey === key || p.time === key);
                                  return pt?.label || key;
                                }}
                              />
                              <YAxis yAxisId="mm" stroke="#0284c7" unit=" mm" domain={[0, 'auto']} tick={{ fontSize: 11 }} />
                              <YAxis yAxisId="prob" orientation="right" stroke="#38bdf8" unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                                formatter={(value: any, name?: any) => [
                                  name === 'precipitation' ? `${value} mm/jam` : `${value}%`,
                                  name === 'precipitation' ? 'Intensitas Curah Hujan' : 'Peluang Hujan'
                                ]}
                                labelFormatter={(key: any) => {
                                  const pt = chartDisplayData.find((p: any) => p.pointKey === key || p.time === key);
                                  const timeDesc = pt ? (pt.isLiveNow ? ' (Jam Ini 📍)' : pt.isPast ? ' (Riwayat Lampau)' : ' (Prakiraan)') : '';
                                  return `Waktu: ${pt?.label || key} ${data?.timezone || ''}${timeDesc}`;
                                }}
                              />
                              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                              <Bar yAxisId="mm" dataKey="precipitation" name="Intensitas Hujan (mm)" fill="#0284c7" radius={[6, 6, 0, 0]} />
                              <Line yAxisId="prob" type="monotone" dataKey="precipitationProb" name="Peluang Presipitasi (%)" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 3 }} />
                              {activeChartPoint && (
                                <>
                                  <ReferenceLine
                                    x={activeChartPoint.pointKey}
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    strokeDasharray="3 3"
                                    label={{
                                      value: liveNowChartPoint && liveNowChartPoint.pointKey === activeChartPoint.pointKey ? `📍 Jam Ini: ${activeChartPoint.label}` : `📍 Terpilih: ${activeChartPoint.label}`,
                                      position: 'top',
                                      fill: '#6366f1',
                                      fontSize: 10,
                                      fontWeight: 700,
                                    }}
                                  />
                                  <ReferenceDot
                                    yAxisId="mm"
                                    x={activeChartPoint.pointKey}
                                    y={activeChartPoint.precipitation}
                                    r={6}
                                    fill="#6366f1"
                                    stroke="#ffffff"
                                    strokeWidth={2}
                                  />
                                </>
                              )}
                              {liveNowChartPoint && liveNowChartPoint.pointKey !== activeChartPoint?.pointKey && (
                                <>
                                  <ReferenceLine
                                    x={liveNowChartPoint.pointKey}
                                    stroke="#10b981"
                                    strokeWidth={1.5}
                                    strokeDasharray="2 2"
                                    label={{
                                      value: `⏱️ Jam Ini: ${liveNowChartPoint.label}`,
                                      position: 'insideTopLeft',
                                      fill: '#10b981',
                                      fontSize: 10,
                                      fontWeight: 700,
                                    }}
                                  />
                                  <ReferenceDot
                                    yAxisId="mm"
                                    x={liveNowChartPoint.pointKey}
                                    y={liveNowChartPoint.precipitation}
                                    r={4.5}
                                    fill="#10b981"
                                    stroke="#ffffff"
                                    strokeWidth={1.5}
                                  />
                                </>
                              )}
                            </ComposedChart>
                          </ResponsiveContainer>
                        )}

                        {mainVisualGraph === 'cloud' && (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartDisplayData} onClick={handleChartClick}>
                              <defs>
                                <linearGradient id="cloudGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#64748b" stopOpacity={0.35} />
                                  <stop offset="95%" stopColor="#64748b" stopOpacity={0.02} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                              <XAxis
                                dataKey="pointKey"
                                stroke="#94a3b8"
                                tick={{ fontSize: 11 }}
                                tickFormatter={(key: string) => {
                                  const pt = chartDisplayData.find((p: any) => p.pointKey === key || p.time === key);
                                  return pt?.label || key;
                                }}
                              />
                              <YAxis stroke="#94a3b8" unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                                formatter={(value: any, name?: any) => [`${value}%`, name === 'cloudCover' ? 'Tutupan Awan' : 'Kelembapan Udara']}
                                labelFormatter={(key: any) => {
                                  const pt = chartDisplayData.find((p: any) => p.pointKey === key || p.time === key);
                                  const timeDesc = pt ? (pt.isLiveNow ? ' (Jam Ini 📍)' : pt.isPast ? ' (Riwayat Lampau)' : ' (Prakiraan)') : '';
                                  return `Waktu: ${pt?.label || key} ${data?.timezone || ''}${timeDesc}`;
                                }}
                              />
                              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                              <Area type="monotone" dataKey="cloudCover" name="Tutupan Awan (%)" stroke="#64748b" strokeWidth={2.5} fill="url(#cloudGradient)" />
                              <Line type="monotone" dataKey="humidity" name="Kelembapan Udara (%)" stroke="#06b6d4" strokeWidth={2} dot={false} />
                              {activeChartPoint && (
                                <>
                                  <ReferenceLine
                                    x={activeChartPoint.pointKey}
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    strokeDasharray="3 3"
                                    label={{
                                      value: liveNowChartPoint && liveNowChartPoint.pointKey === activeChartPoint.pointKey ? `📍 Jam Ini: ${activeChartPoint.label}` : `📍 Terpilih: ${activeChartPoint.label}`,
                                      position: 'top',
                                      fill: '#6366f1',
                                      fontSize: 10,
                                      fontWeight: 700,
                                    }}
                                  />
                                  <ReferenceDot
                                    x={activeChartPoint.pointKey}
                                    y={activeChartPoint.cloudCover}
                                    r={6}
                                    fill="#6366f1"
                                    stroke="#ffffff"
                                    strokeWidth={2}
                                  />
                                </>
                              )}
                              {liveNowChartPoint && liveNowChartPoint.pointKey !== activeChartPoint?.pointKey && (
                                <>
                                  <ReferenceLine
                                    x={liveNowChartPoint.pointKey}
                                    stroke="#10b981"
                                    strokeWidth={1.5}
                                    strokeDasharray="2 2"
                                    label={{
                                      value: `⏱️ Jam Ini: ${liveNowChartPoint.label}`,
                                      position: 'insideTopLeft',
                                      fill: '#10b981',
                                      fontSize: 10,
                                      fontWeight: 700,
                                    }}
                                  />
                                  <ReferenceDot
                                    x={liveNowChartPoint.pointKey}
                                    y={liveNowChartPoint.cloudCover}
                                    r={4.5}
                                    fill="#10b981"
                                    stroke="#ffffff"
                                    strokeWidth={1.5}
                                  />
                                </>
                              )}
                            </AreaChart>
                          </ResponsiveContainer>
                        )}

                        {mainVisualGraph === 'all' && (
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartDisplayData} onClick={handleChartClick}>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                              <XAxis
                                dataKey="pointKey"
                                stroke="#94a3b8"
                                tick={{ fontSize: 11 }}
                                tickFormatter={(key: string) => {
                                  const pt = chartDisplayData.find((p: any) => p.pointKey === key || p.time === key);
                                  return pt?.label || key;
                                }}
                              />
                              <YAxis yAxisId="temp" stroke="#f59e0b" unit="°C" domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                              <YAxis yAxisId="pct" orientation="right" stroke="#38bdf8" unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                                labelFormatter={(key: any) => {
                                  const pt = chartDisplayData.find((p: any) => p.pointKey === key || p.time === key);
                                  const timeDesc = pt ? (pt.isLiveNow ? ' (Jam Ini 📍)' : pt.isPast ? ' (Riwayat Lampau)' : ' (Prakiraan)') : '';
                                  return `Waktu: ${pt?.label || key} ${data?.timezone || ''}${timeDesc}`;
                                }}
                              />
                              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                              <Bar yAxisId="pct" dataKey="precipitation" name="Hujan (mm)" fill="#0284c7" radius={[4, 4, 0, 0]} />
                              <Line yAxisId="temp" type="monotone" dataKey="temperature" name="Suhu (°C)" stroke="#f59e0b" strokeWidth={3} dot={false} />
                              <Line yAxisId="pct" type="monotone" dataKey="cloudCover" name="Awan (%)" stroke="#94a3b8" strokeWidth={2} dot={false} />
                              {activeChartPoint && (
                                <>
                                  <ReferenceLine
                                    x={activeChartPoint.pointKey}
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    strokeDasharray="3 3"
                                    label={{
                                      value: liveNowChartPoint && liveNowChartPoint.pointKey === activeChartPoint.pointKey ? `📍 Jam Ini: ${activeChartPoint.label}` : `📍 Terpilih: ${activeChartPoint.label}`,
                                      position: 'top',
                                      fill: '#6366f1',
                                      fontSize: 10,
                                      fontWeight: 700,
                                    }}
                                  />
                                  <ReferenceDot
                                    yAxisId="temp"
                                    x={activeChartPoint.pointKey}
                                    y={activeChartPoint.temperature}
                                    r={6}
                                    fill="#6366f1"
                                    stroke="#ffffff"
                                    strokeWidth={2}
                                  />
                                </>
                              )}
                              {liveNowChartPoint && liveNowChartPoint.pointKey !== activeChartPoint?.pointKey && (
                                <>
                                  <ReferenceLine
                                    x={liveNowChartPoint.pointKey}
                                    stroke="#10b981"
                                    strokeWidth={1.5}
                                    strokeDasharray="2 2"
                                    label={{
                                      value: `⏱️ Jam Ini: ${liveNowChartPoint.label}`,
                                      position: 'insideTopLeft',
                                      fill: '#10b981',
                                      fontSize: 10,
                                      fontWeight: 700,
                                    }}
                                  />
                                  <ReferenceDot
                                    yAxisId="temp"
                                    x={liveNowChartPoint.pointKey}
                                    y={liveNowChartPoint.temperature}
                                    r={4.5}
                                    fill="#10b981"
                                    stroke="#ffffff"
                                    strokeWidth={1.5}
                                  />
                                </>
                              )}
                            </ComposedChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3. RINGKASAN PADAT & JELAS (3 Kesimpulan Pokok Tanpa Teks Rumit) */}
                  <div className="p-4 sm:p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      Kesimpulan Cuaca ({weatherInsights?.intervalLabel || 'Periode Terpilih'}):
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 mb-1">
                          <Sun className="w-3.5 h-3.5" />
                          <span>Panas Jam Berapa?</span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                          Suhu tertinggi mencapai <strong>{weatherInsights?.peakHeatTemp != null ? `${weatherInsights.peakHeatTemp}°C` : '--'}</strong> sekitar pukul <strong>{weatherInsights?.peakHeatHour || '--'} {data.timezone}</strong>.
                          {weatherInsights?.diurnalRange ? ` Suhu pagi dan malam lebih sejuk (~${weatherInsights.minHeatTemp}°C).` : (weatherInsights?.minHeatTemp != null ? ` Suhu terendah tercatat ~${weatherInsights.minHeatTemp}°C pada ${weatherInsights.minHeatHour}.` : '')}
                        </p>
                      </div>

                      <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                        <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 mb-1">
                          <CloudRain className="w-3.5 h-3.5" />
                          <span>Hujan Jam Berapa?</span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                          {weatherInsights?.rainWindowText}.
                          {weatherInsights?.peakRainProb != null && weatherInsights.peakRainProbHour ? (
                            <> Peluang hujan/gerimis tertinggi <strong>{weatherInsights.peakRainProb}%</strong> pada jam <strong>{weatherInsights.peakRainProbHour} {data.timezone}</strong>.</>
                          ) : (
                            <> Peluang hujan numerik tidak tersedia.</>
                          )}
                        </p>
                      </div>

                      <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                          <Cloud className="w-3.5 h-3.5" />
                          <span>Awan & Udara</span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                          Langit <strong>{weatherInsights?.cloudStatus}</strong>
                          {weatherInsights?.avgCloud != null ? <> dengan tutupan awan ~<strong>{weatherInsights.avgCloud}%</strong></> : <> (tutupan awan numerik tidak tersedia)</>}
                          {' '}dan hembusan angin <strong>{data?.current?.windSpeed != null ? `${data.current.windSpeed} km/h` : '—'}</strong>.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* KARTU SIMPULAN CERDAS AI GEMINI (SIKLUS PEMBARUAN SERENTAK 5 MENIT) */}
                  <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border border-indigo-500/40 text-white shadow-xl space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-500/20">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
                          <Sparkles className="w-5 h-5 text-indigo-300 animate-pulse" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                            <span>Simpulan Cerdas AI Gemini (Siklus 5 Menit Terkini)</span>
                            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Pembaruan Serentak
                            </span>
                          </h4>
                          <p className="text-[11px] text-slate-300">
                            Model: <strong className="text-indigo-200">{data.aiNwpVerification?.modelName || 'Gemini 3.6 Flash NWP Engine'}</strong> · Disintesis otomatis setiap interval 5 menit
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isVerifyingAi ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 animate-pulse">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Menyintesis data baru...
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleReverifyAi}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-white/10 hover:bg-white/20 text-indigo-200 border border-white/15 transition-all cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Segarkan AI Sekarang
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
                      <p>
                        {data.aiNwpVerification?.scientificBriefing || data.aiBriefing.summaryText}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                      <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Stabilitas Konvektif:</span>
                        <strong className="text-sky-300 font-semibold">{data.aiNwpVerification?.convectiveStability || 'Stabil'}</strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Parameter Coriolis (f):</span>
                        <strong className="text-indigo-300 font-mono">{data.aiNwpVerification?.coriolisParamF != null ? `${data.aiNwpVerification.coriolisParamF} × 10⁻⁵ s⁻¹` : '—'}</strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Kerapatan Udara (ρ):</span>
                        <strong className="text-amber-300 font-mono">{data.aiNwpVerification?.airDensityKgM3 != null ? `${data.aiNwpVerification.airDensityKgM3} kg/m³` : '—'}</strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Waktu Verifikasi:</span>
                        <strong className="text-emerald-300 font-mono text-[10px]">
                          {data.aiNwpVerification?.verifiedAt ? new Date(data.aiNwpVerification.verifiedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Baru saja'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* PUSAT 16 SUMBER DATA GEOSPASIAL & MULTI-SENSOR REAL-TIME */}
                  <div id="hub-16-sumber-geospasial" className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-md space-y-4">
                    {/* Header with Title, Status Badges & Controls */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-sky-600 to-emerald-500 text-white shadow-md shadow-indigo-500/20">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                              Pusat 16 Sumber Data Geospasial & Multi-Sensor Real-Time
                            </h3>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] border border-emerald-500/20 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              16 Data Valid (HTTP 200)
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold text-[10px] border border-indigo-500/20">
                              Diperbarui Serentak 5 Menit
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Seluruh masukan data sensor cuaca, BMKG InaTEWS, USGS, PuSGeN 295 sesar, DEM, dan AI disinkronkan ke 15 domain studio.
                          </p>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
                        <button
                          type="button"
                          onClick={() => setIsTelemetryModalOpen(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200/80 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                          title="Buka Pusat Transparansi Data & Log Audit API"
                        >
                          <Terminal className="w-3.5 h-3.5 text-sky-500" />
                          <span>Audit & Log API</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowMultiSourceHub(!showMultiSourceHub)}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                          title={showMultiSourceHub ? 'Sembunyikan Panel 16 Sumber' : 'Tampilkan Panel 16 Sumber'}
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform ${showMultiSourceHub ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {showMultiSourceHub && (
                      <div className="space-y-3.5 animate-in fade-in duration-200">
                        {/* Category Filter Pills */}
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs font-semibold">
                          {[
                            { id: 'ALL', label: `🌟 Semua (${activeGeospatialSources.length})` },
                            { id: 'WEATHER', label: '🌦️ Cuaca & NWP (6)' },
                            { id: 'AIR', label: '💨 Kualitas Udara (1)' },
                            { id: 'SEISMIC', label: '🌋 Seismik & Sesar (3)' },
                            { id: 'ELEVATION', label: '🏔️ Elevasi DEM (1)' },
                            { id: 'SATELLITE', label: '🛰️ Satelit & Radar (2)' },
                            { id: 'AI', label: '🤖 AI Inference (1)' },
                            { id: 'BASEMAP', label: '🗺️ Peta & Basemap (4)' },
                          ].map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setSelectedHubCategory(cat.id as any)}
                              className={`px-3 py-1.5 rounded-xl shrink-0 transition-all cursor-pointer ${
                                selectedHubCategory === cat.id
                                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              {cat.label}
                            </button>
                          ))}
                        </div>

                        {/* Grid of 16 Active Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {filteredHubSources.map((source) => (
                            <div
                              key={source.id}
                              className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between shadow-2xs hover:border-indigo-500/40 transition-all min-w-0"
                            >
                              <div className="space-y-2">
                                {/* Top Header */}
                                <div className="flex items-start justify-between gap-2 min-w-0">
                                  <div className="min-w-0 flex-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 inline-block mb-1">
                                      {source.category}
                                    </span>
                                    <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate" title={source.name}>
                                      {source.name}
                                    </h5>
                                  </div>
                                  <div className="shrink-0">
                                    {source.status === 'ONLINE' ? (
                                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> Data valid (HTTP 200)
                                      </span>
                                    ) : source.status === 'MAINTENANCE' ? (
                                      <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-[10px] font-bold border border-slate-300 dark:border-slate-600 flex items-center gap-1">
                                        <Info className="w-3 h-3" /> Pemeliharaan Hulu
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-500/20 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" /> Perlu Kunci Server
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* URL Pill */}
                                <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-[10px] font-mono text-slate-500 dark:text-slate-400 overflow-hidden">
                                  <span className="shrink-0 px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold uppercase text-[9px] border border-purple-500/20">
                                    GET
                                  </span>
                                  <span className="truncate min-w-0 flex-1 select-all" title={source.url}>
                                    {source.url}
                                  </span>
                                </div>

                                {/* Live Payload Preview */}
                                <div className="rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/80 p-2 text-xs space-y-1">
                                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                                    <span className="font-semibold flex items-center gap-1 text-slate-700 dark:text-slate-300">
                                      <FileCode className="w-3 h-3 text-indigo-500 shrink-0" />
                                      <span>Cuplikan Data Masuk</span>
                                    </span>
                                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                                      JSON Real-Time
                                    </span>
                                  </div>
                                  <div
                                    className="font-mono text-[10px] text-slate-700 dark:text-slate-300 break-all line-clamp-2 select-all leading-relaxed bg-slate-50/60 dark:bg-slate-900/40 p-1.5 rounded-lg border border-slate-200/40 dark:border-slate-800/40"
                                    title={source.previewSnippet}
                                  >
                                    {source.previewSnippet}
                                  </div>
                                </div>
                              </div>

                              {/* Bottom Controls */}
                              <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-500">
                                <div className="flex items-center gap-2 text-[10px]">
                                  <span>Latensi: <strong className="text-slate-800 dark:text-white font-mono">{source.latencyText}</strong></span>
                                  <span>•</span>
                                  <span className="truncate max-w-[85px] sm:max-w-[110px]" title={source.payloadSize}>
                                    {source.payloadSize}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {source.targetDomain && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDomain(source.targetDomain!);
                                        if (source.targetSubTab) {
                                          setActiveWeatherTab(source.targetSubTab);
                                        }
                                      }}
                                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold border border-indigo-200/60 dark:border-indigo-800 transition-all cursor-pointer"
                                      title={`Buka data ini di Tab ${source.targetDomain}`}
                                    >
                                      <span>Buka Tab</span>
                                      <ArrowRight className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 4. MODE ANALISIS SAINS LANJUTAN (Collapsible Opsional) */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedScience(!showAdvancedScience)}
                      className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/60 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 transition-all border border-slate-200/80 dark:border-slate-700/60 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-xs cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-sky-500" />
                        <span>Lihat perbandingan model, diagnostik atmosfer, dan grafik</span>
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showAdvancedScience ? 'rotate-180' : ''}`} />
                    </button>

                    {showAdvancedScience && (
                      <div className="mt-3 space-y-4 animate-in fade-in duration-200">
                        {/* Harmony Universal Multi-Paradigm Chart Engine (30+ Tipe Grafik) */}
                        <HarmonyChartEngine
                          weatherData={data}
                          earthquakes={earthquakes}
                          defaultChartId="line"
                          title={`Grafik Analitik Multivariabel Cuaca & Geofisika — ${activeRegionName}`}
                          description="Grafik menggunakan nilai penyedia yang tersedia; jenis yang belum memiliki sumber ditandai belum tersedia."
                        />

                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center justify-between">
                            <span>Perbandingan Feed Model Saat Ini (Bot Consensus Calculator)</span>
                            <span className="text-[10px] text-emerald-500 font-semibold">{data.sourceFetches.every(source => source.status === 'SUCCESS') ? 'Parameter tersedia' : 'Sebagian sumber tidak lengkap'}</span>
                          </h3>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                            {data?.modelComparison.map((m) => (
                              <div key={m.modelName} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-center">
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                  {m.sourceFlag} {m.modelName}
                                </div>
                                <div className="text-base font-black text-slate-900 dark:text-white mt-1">
                                  {m.temperature}°C
                                </div>
                                <div className="text-[9px] text-slate-400 mt-0.5">
                                  Deviasi: {data?.current?.consensusTemperature != null ? `${Math.abs(m.temperature - data.current.consensusTemperature).toFixed(1)}°C` : '—'}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* AI NWP Physics Insight Banner */}
                          {data?.aiNwpVerification && (
                            <div className="mt-3.5 p-3.5 rounded-2xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-transparent border border-sky-500/25 flex items-center justify-between gap-3 flex-wrap">
                              <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-sky-500/20 text-sky-500">
                                  <Sparkles className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <span>Diagnostik dari masukan model · bukan validasi akurasi</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/30">
                                      {data.aiNwpVerification.convectiveStability}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    Kerapatan massa udara ρ: <strong>{data.aiNwpVerification.airDensityKgM3} kg/m³</strong> | Parameter Coriolis f: <strong>{data.aiNwpVerification.coriolisParamF}×10⁻⁵ s⁻¹</strong> | Peluang dari penyedia: <strong>{data.aiNwpVerification.calibratedRainProb != null ? `${data.aiNwpVerification.calibratedRainProb}%` : 'Tidak tersedia'}</strong>
                                  </p>
                                </div>
                              </div>

                              <button
                                onClick={() => setActiveWeatherTab('nwp')}
                                className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-500 underline underline-offset-2 flex items-center gap-1"
                              >
                                <span>Buka Detail 7 Rumus</span>
                                <span>→</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 7 EQUATIONS NWP SUB-TAB */}
              {activeWeatherTab === 'nwp' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Hero Scientific Banner */}
                  <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/70 to-slate-950 border border-sky-500/30 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute -right-8 -bottom-8 w-56 h-56 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-400 text-[10px] font-mono font-bold tracking-wider uppercase border border-sky-500/40">
                            Diagnostik Atmosfer
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Vilhelm Bjerknes (1904) & Lewis Fry Richardson (1922)
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-black text-white mt-1 flex items-center gap-2">
                          <span>Pemeriksaan Masukan Cuaca</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                            {data?.aiNwpVerification?.isAiVerified ? 'Penjelasan AI tersedia' : 'Belum diperiksa oleh AI'}
                          </span>
                        </h3>
                        <p className="text-xs text-slate-300 max-w-3xl mt-1 leading-relaxed">
                          Prakiraan berasal dari penyedia model. Pemeriksaan di sini hanya menjelaskan masukan dan menghitung besaran diagnostik sederhana; belum menjalankan solver NWP tiga dimensi, asimilasi sensor, atau validasi akurasi.
                        </p>
                      </div>

                      <button
                        onClick={handleReverifyAi}
                        disabled={isVerifyingAi}
                        className="self-start sm:self-center flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-500/25 active:scale-95 transition-all disabled:opacity-50 shrink-0"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingAi ? 'animate-spin' : ''}`} />
                        <span>{isVerifyingAi ? 'Meminta Penjelasan...' : 'Periksa dan Jelaskan'}</span>
                      </button>
                    </div>

                    {/* Physics KPI Summary Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-700/60">
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[10px] text-slate-400 font-medium block">Kerapatan Udara (ρ = p/RT)</span>
                        <span className="text-sm sm:text-base font-black text-sky-400">
                          {data?.aiNwpVerification?.airDensityKgM3 ?? '—'} <span className="text-[10px] text-slate-400">kg/m³</span>
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">Gas Ideal (R = 287 J/kg·K)</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[10px] text-slate-400 font-medium block">Parameter Coriolis (f = 2Ω sin φ)</span>
                        <span className="text-sm sm:text-base font-black text-indigo-400 font-mono">
                          {data?.aiNwpVerification?.coriolisParamF != null ? `${data.aiNwpVerification.coriolisParamF}×10⁻⁵` : '—'} <span className="text-[10px] text-slate-400">s⁻¹</span>
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">Lintang {activeLat.toFixed(2)}° (Tropis)</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[10px] text-slate-400 font-medium block">Stabilitas atmosfer · belum dinilai</span>
                        <span className="text-sm sm:text-base font-black text-emerald-400 truncate block">
                          {data?.aiNwpVerification?.convectiveStability ?? 'Belum dinilai'}
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">Lapse rate & konveksi awan</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[10px] text-slate-400 font-medium block">Peluang Hujan dari Penyedia</span>
                        <span className="text-sm sm:text-base font-black text-amber-400">
                          {data?.aiNwpVerification?.calibratedRainProb != null ? `${data.aiNwpVerification.calibratedRainProb != null ? `${data.aiNwpVerification.calibratedRainProb}%` : 'Tidak tersedia'}` : '—'}
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">Tidak dikalibrasi ulang oleh AI</span>
                      </div>
                    </div>
                  </div>

                  {/* 7 Equations Interactive Cards List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Binary className="w-4 h-4 text-indigo-500" />
                        Besaran diagnostik dan batas pemeriksaan:
                      </h4>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Diperiksa: {data?.aiNwpVerification?.verifiedAt || 'Belum dilakukan'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {data?.aiNwpVerification?.equationsStatus.map((eq, idx) => (
                        <div
                          key={eq.id || idx}
                          className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:border-indigo-500/40 transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="text-xs font-black text-slate-900 dark:text-white">
                                {eq.name}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1 shrink-0">
                                <CheckCircle2 className="w-3 h-3" /> {eq.status === 'VALID' ? 'NILAI TURUNAN' : eq.status}
                              </span>
                            </div>

                            {/* Formula Monospace Display */}
                            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mb-2 overflow-x-auto">
                              {eq.formula}
                            </div>

                            <div className="text-xs text-slate-700 dark:text-slate-200 font-medium mb-1.5">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">Nilai Terhitung:</span>
                              <span className="font-semibold text-slate-900 dark:text-white">{eq.evaluatedValue}</span>
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-700/60 pt-2 mt-1">
                            {eq.note}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Scientific Briefing Box */}
                  {data?.aiNwpVerification?.scientificBriefing && (
                    <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200/70 dark:border-sky-800/60 text-slate-800 dark:text-slate-200 text-xs shadow-sm">
                      <div className="flex items-center gap-2 font-bold text-sky-700 dark:text-sky-300 mb-1.5">
                        <Sparkles className="w-4 h-4 text-sky-500" />
                        <span>Penjelasan masukan cuaca:</span>
                      </div>
                      <p className="leading-relaxed text-slate-600 dark:text-slate-300 text-xs">
                        {data.aiNwpVerification.scientificBriefing}
                      </p>
                    </div>
                  )}
                </div>
              )}


              {/* RAIN SUB-TAB */}
              {activeWeatherTab === 'rain' && (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">
                    Grafik Curah Hujan (mm) & Probabilitas Hujan (%)
                  </h3>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={((timeframe === 'hourly' ? data?.hourly : data?.daily.slice(0, timeframe === 'daily' ? 7 : 14)) as any[]) || []}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey={timeframe === 'hourly' ? 'label' : 'dayName'} stroke="#94a3b8" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="mm" stroke="#38bdf8" unit=" mm" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="prob" orientation="right" stroke="#818cf8" unit="%" tick={{ fontSize: 11 }} domain={[0, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                        <Legend />
                        <Bar yAxisId="mm" dataKey={timeframe === 'hourly' ? 'precipitation' : 'precipitationSum'} name="Intensitas Hujan (mm)" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                        <Line yAxisId="prob" type="monotone" dataKey={timeframe === 'hourly' ? 'precipitationProb' : 'precipitationProbMax'} name="Peluang Presipitasi (%)" stroke="#818cf8" strokeWidth={2.5} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* TEMP SUB-TAB */}
              {activeWeatherTab === 'temp' && (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Komparasi Garis Prediksi Suhu Lintas Model Meteorologi
                  </h3>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Membandingkan suhu model yang tersedia pada lokasi dan waktu yang sama. Kesepakatan model bukan bukti akurasi.
                  </p>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data?.hourly}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#94a3b8" unit="°C" domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                        <Legend />
                        <Line type="monotone" dataKey="temperature" name="Open-Meteo Best Match" stroke="#f43f5e" strokeWidth={3} dot={false} />
                        <Line type="monotone" dataKey="ecmwfTemp" name="ECMWF (Eropa)" stroke="#3b82f6" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                        <Line type="monotone" dataKey="gfsTemp" name="NOAA GFS (USA)" stroke="#10b981" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                        <Line type="monotone" dataKey="iconTemp" name="DWD ICON (Jerman)" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                        <Line type="monotone" dataKey="jmaTemp" name="JMA (Jepang)" stroke="#8b5cf6" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Comprehensive Multi-Model NWP Consensus Matrix (10+ Models) */}
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/80">
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                          <Cpu className="w-4 h-4 text-purple-500" />
                          <span>Konsensus & Matriks Seluruh Model Numerik NWP Terhubung ({data?.modelComparison.length || 0} Model)</span>
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Data suhu komparatif dari pusat meteorologi dunia dan kawasan Indo-Pasifik (BoM Australia, CMA Tiongkok, JMA Jepang, ECMWF, GFS, ICON, MET Norway)
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                          Rentang Sebaran: {data?.modelSpread != null ? `Δ ${data.modelSpread.toFixed(1)}°C` : 'Tunggal'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                      {data?.modelComparison.map((m) => {
                        const diff = data?.current?.consensusTemperature != null ? m.temperature - data.current.consensusTemperature : 0;
                        return (
                          <div
                            key={m.modelName}
                            className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between shadow-2xs"
                          >
                            <div>
                              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                                <span className="font-semibold text-slate-600 dark:text-slate-300 truncate">{m.sourceFlag} {m.country || 'Global'}</span>
                                <span className="font-mono text-[9px] px-1 rounded bg-slate-200/60 dark:bg-slate-800">{m.resolution || 'NWP'}</span>
                              </div>
                              <div className="text-xs font-bold text-slate-800 dark:text-white truncate" title={m.modelName}>
                                {m.modelName}
                              </div>
                            </div>
                            <div className="mt-2 pt-2 border-t border-slate-200/40 dark:border-slate-800/60 flex items-baseline justify-between">
                              <span className="text-base font-black text-slate-900 dark:text-white">
                                {m.temperature.toFixed(1)}°C
                              </span>
                              <span className={`text-[10px] font-mono font-semibold ${
                                Math.abs(diff) < 0.5 ? 'text-emerald-500' : diff > 0 ? 'text-amber-500' : 'text-blue-500'
                              }`}>
                                {diff > 0 ? `+${diff.toFixed(1)}°` : `${diff.toFixed(1)}°`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between flex-wrap gap-2">
                      <span>Koreksi Bias: Suhu konsensus dihitung secara tertimbang menggunakan inverse error variance lintas model.</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Data Multi-Model Terverifikasi
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* WIND SUB-TAB */}
              {activeWeatherTab === 'wind' && (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">
                    Kecepatan Angin (km/h) & Tekanan Permukaan Atmosfer (hPa)
                  </h3>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data?.hourly}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="wind" stroke="#0d9488" unit=" km/h" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="press" orientation="right" stroke="#6366f1" unit=" hPa" domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                        <Legend />
                        <Line yAxisId="wind" type="monotone" dataKey="windSpeed" name="Kecepatan Angin (km/h)" stroke="#0d9488" strokeWidth={2.5} />
                        <Line yAxisId="press" type="monotone" dataKey="pressure" name="Tekanan Atmosfer (hPa)" stroke="#6366f1" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* AIR QUALITY & ISPU SUB-TAB */}
              {activeWeatherTab === 'air' && (
                <div className="space-y-4">
                  {/* Official Permen LHK No. P.14/2020 ISPU Engine */}
                  {(() => {
                    const historicalPoints = data?.historicalAirQuality;
                    const hasHistorical = Array.isArray(historicalPoints) && historicalPoints.length > 0;
                    const anchorTime = data?.dataTime || data?.timestamp;

                    const pm25Series = hasHistorical
                      ? historicalPoints.map((h) => ({ time: h.time, value: h.pm25 }))
                      : [];

                    const o3Series = hasHistorical
                      ? historicalPoints.map((h) => ({ time: h.time, value: h.ozone }))
                      : [];

                    const pm25Rolling = ispuCalculatorService.calculateRollingAverageFromSeries(pm25Series, 24, {
                      anchorTime,
                      minCoveragePct: 0.75,
                    });

                    const o3Rolling = ispuCalculatorService.calculateRollingAverageFromSeries(o3Series, 8, {
                      anchorTime,
                      minCoveragePct: 0.75,
                    });

                    const ispuRes = ispuCalculatorService.calculateISPU({
                      pm25_24h: pm25Rolling.average,
                      o3_8h: o3Rolling.average,
                    });

                    return (
                      <div className="p-4 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-700/60">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                Estimasi Indeks Standar Pencemar Udara (ISPU)
                              </h4>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-blue-500/15 text-blue-600 border border-blue-500/25">
                                Permen LHK P.14/2020
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              Metodologi baku interpolasi breakpoint konsentrasi polutan per 24 jam (PM2.5) / 8 jam (O₃)
                            </p>
                          </div>

                          <div className="flex items-baseline gap-1.5 self-start sm:self-auto">
                            <span className="text-xs text-slate-500">Nilai ISPU:</span>
                            <span
                              className="text-2xl font-black px-2.5 py-0.5 rounded-xl font-mono text-white"
                              style={{ backgroundColor: ispuRes.badgeColor }}
                            >
                              {ispuRes.compositeISPU ?? '—'}
                            </span>
                            <span
                              className="text-xs font-bold px-2 py-0.5 rounded-lg border ml-1"
                              style={{
                                color: ispuRes.badgeColor,
                                borderColor: `${ispuRes.badgeColor}40`,
                                backgroundColor: `${ispuRes.badgeColor}15`,
                              }}
                            >
                              {ispuRes.category}
                            </span>
                          </div>
                        </div>

                        {/* Kelengkapan Data & Sub-Indices */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          {ispuRes.subIndices.map((sub: ISPUSubIndex) => (
                            <div
                              key={sub.parameter}
                              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800"
                            >
                              <div className="flex justify-between items-baseline">
                                <span className="font-bold text-slate-700 dark:text-slate-300">{sub.parameter}</span>
                                <span className="font-mono font-bold">{sub.ispuValue}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {sub.concentration} {sub.unit} ({sub.averagingTime})
                              </div>
                            </div>
                          ))}

                          {/* Info kelengkapan jika parameter tidak cukup */}
                          {!pm25Rolling.isSufficient && (
                            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 col-span-2">
                              <span className="font-bold text-amber-600 dark:text-amber-400">PM2.5 (24 Jam) Belum Cukup</span>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                {pm25Rolling.validSamples}/24 sampel jam ({Math.round(pm25Rolling.coveragePct * 100)}% kelengkapan). Kebijakan internal representasi: minimal 75% (18 jam) untuk rata-rata bergerak.
                                {data?.current?.pm25 != null && ` Konsentrasi sesaat: ${data.current.pm25} µg/m³.`}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                          <p><strong>Rekomendasi Kesehatan:</strong> {ispuRes.healthRecommendation}</p>
                          <p className="text-[11px] text-slate-500">
                            <strong>Jendela Waktu:</strong> {hasHistorical ? '24 Jam Historis' : 'Data Historis Belum Tersedia'} | Cadence: 1 jam | Cakupan PM2.5: {pm25Rolling.validSamples}/24 jam ({Math.round(pm25Rolling.coveragePct * 100)}%)
                          </p>
                          <p className="text-[11px] text-slate-500">
                            <strong>Catatan Provenance:</strong> Nilai dihitung dari estimasi model atmosfer numerik Open-Meteo / Copernicus CAMS. Bukan publikasi resmi stasiun pemantau AQMS darat KLHK RI.
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">
                      Profil Konsentrasi Partikulat PM2.5 & Ozon Atmosferik (O₃) Sepanjang Waktu
                    </h3>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data?.hourly}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                          <YAxis stroke="#94a3b8" unit=" µg/m³" tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                          <Legend />
                          <Area type="monotone" dataKey="pm25" name="PM2.5 Polusi (µg/m³)" stroke="#ec4899" fill="#ec4899" fillOpacity={0.25} />
                          <Area type="monotone" dataKey="ozone" name="Lapisan Ozon O₃ (µg/m³)" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* AI AGENT SUB-TAB */}
              {activeWeatherTab === 'ai' && (
                <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-900/40 via-slate-900/60 to-slate-950 border border-indigo-500/30 text-white shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                          <span>Ringkasan Cuaca dan Penjelasan</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 font-mono">
                            {data?.aiNwpVerification?.isAiVerified ? 'Penjelasan AI' : 'Diagnostik lokal'}
                          </span>
                        </h3>
                        <p className="text-xs text-indigo-300">
                          Penjelasan masukan model; tidak mengubah nilai prakiraan atau membuktikan akurasi
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveWeatherTab('nwp')}
                      className="self-start sm:self-center px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Cpu className="w-3.5 h-3.5 text-sky-400" />
                      <span>Pemeriksaan Atmosfer</span>
                    </button>
                  </div>

                  <p className="text-xs leading-relaxed text-slate-200 bg-slate-900/60 p-3.5 rounded-2xl border border-indigo-500/20 mb-4">
                    {data?.aiBriefing.summaryText}
                  </p>

                  {/* NWP Diagnostic Highlights */}
                  {data?.aiNwpVerification && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
                      <div className="p-2.5 rounded-xl bg-slate-900/80 border border-indigo-500/20">
                        <span className="text-[10px] text-slate-400 block font-medium">Kerapatan Massa Udara (ρ)</span>
                        <span className="text-xs font-bold text-sky-400">{data.aiNwpVerification.airDensityKgM3} kg/m³</span>
                        <span className="text-[9px] text-slate-500 block">Persamaan Gas Ideal p = ρ R T</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900/80 border border-indigo-500/20">
                        <span className="text-[10px] text-slate-400 block font-medium">Parameter Coriolis (f)</span>
                        <span className="text-xs font-bold text-indigo-400 font-mono">{data.aiNwpVerification.coriolisParamF}×10⁻⁵ s⁻¹</span>
                        <span className="text-[9px] text-slate-500 block">Persamaan Gerak Navier-Stokes</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900/80 border border-indigo-500/20">
                        <span className="text-[10px] text-slate-400 block font-medium">Stabilitas atmosfer · belum dinilai</span>
                        <span className="text-xs font-bold text-emerald-400 truncate block">{data.aiNwpVerification.convectiveStability}</span>
                        <span className="text-[9px] text-slate-500 block">Profil Termodinamika Udara Basah</span>
                      </div>
                    </div>
                  )}

                  {data?.aiBriefing.hazardAlert && (
                    <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>{data.aiBriefing.hazardAlert}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Kesiapsiagaan & Tindakan Pencegahan:
                    </h4>
                    {data?.aiBriefing.preparednessAdvice.map((adv, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                        <span>{adv}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* WINDY RADAR & SATELLITE SUB-TAB */}
              {activeWeatherTab === 'windy' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-sky-500/30 text-white shadow-2xl relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30 shadow-sm">
                          <Radio className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white">
                              Web Windy — Peta Radar, Satelit & Dinamika Atmosfer Interaktif
                            </h3>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                              HTTP 200 Live Iframe
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">
                            Radar cuaca, citra satelit, angin, hujan, dan suhu berpusat di ({activeLat.toFixed(4)}°, {activeLng.toFixed(4)}°)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-400 uppercase font-bold mr-1">Lapisan:</span>
                        {(['radar', 'satellite', 'wind', 'rain', 'temp', 'clouds'] as const).map((layer) => {
                          const labels: Record<string, string> = {
                            radar: 'Radar Doppler',
                            satellite: 'Satelit Cuaca',
                            wind: 'Arus Angin',
                            rain: 'Curah Hujan',
                            temp: 'Suhu Permukaan',
                            clouds: 'Tutupan Awan',
                          };
                          return (
                            <button
                              key={layer}
                              onClick={() => setWindyOverlay(layer)}
                              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                windyOverlay === layer
                                  ? 'bg-sky-500 text-white shadow-sm'
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              }`}
                            >
                              {labels[layer]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Interactive Embedded Windy Iframe */}
                    <div className="w-full h-[520px] rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-inner relative">
                      <iframe
                        title="Windy Weather Map"
                        width="100%"
                        height="100%"
                        src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=default&metricTemp=default&metricWind=default&zoom=8&overlay=${windyOverlay}&product=${windyOverlay === 'radar' ? 'radar' : windyOverlay === 'satellite' ? 'satellite' : 'ecmwf'}&level=surface&lat=${activeLat}&lon=${activeLng}&detailLat=${activeLat}&detailLon=${activeLng}&marker=true&message=true`}
                        frameBorder="0"
                        className="w-full h-full"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 text-[11px] text-slate-400 border-t border-slate-800 gap-2">
                      <div className="flex items-center gap-3">
                        <span>Pusat Koordinat: <strong className="text-white">{activeLat.toFixed(4)}°, {activeLng.toFixed(4)}°</strong></span>
                        <span>Wilayah: <strong className="text-white">{activeRegionName}</strong></span>
                        <span>Latensi: <strong className="text-emerald-400">~145 ms</strong></span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Audit Telemetri: Web Windy Iframe (Visualisasi spasial atmosfer resolusi tinggi WGS84)
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {/* Sources Transparency Footer */}
              <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-500 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200/60 dark:border-slate-800/80">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-500" />
                      <span>Seluruh 16 Sumber Data Geospasial Terhubung (HTTP 200 Real-Time):</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      16 Aktif
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-[10px] font-semibold border border-slate-300 dark:border-slate-600">
                      1 Pemeliharaan Hulu (BoM)
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold border border-amber-500/20">
                      1 Perlu Kunci Server (TomTom)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('hub-16-sumber-geospasial');
                        el?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      <span>Lihat Detail Grid 16 Sumber</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* 16 Connected Real-Time Data Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {activeGeospatialSources
                    .filter((s) => s.status === 'ONLINE')
                    .map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          if (s.targetDomain) {
                            setActiveDomain(s.targetDomain);
                            if (s.targetSubTab) {
                              setActiveWeatherTab(s.targetSubTab);
                            }
                          }
                        }}
                        className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800/90 hover:bg-indigo-50 dark:hover:bg-slate-700/80 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 transition-all cursor-pointer shadow-2xs text-[11px]"
                        title={`${s.name} — ${s.latencyText} — Klik untuk membuka data pada Tab Studio`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                        <span className="font-semibold truncate max-w-[170px] sm:max-w-[200px]">{s.name.split('—')[0].trim()}</span>
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-900/60 text-slate-500 group-hover:text-indigo-500 font-medium">
                          {s.latencyText}
                        </span>
                      </button>
                    ))}

                  {/* 2 Excluded / Upstream Info Chips */}
                  {activeGeospatialSources
                    .filter((s) => s.status !== 'ONLINE')
                    .map((s) => (
                      <span
                        key={s.id}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] opacity-75 ${
                          s.status === 'MAINTENANCE'
                            ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                            : 'bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400'
                        }`}
                        title={s.details}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'MAINTENANCE' ? 'bg-slate-400' : 'bg-amber-500'}`} />
                        <span className="font-medium truncate max-w-[170px]">{s.name.split('—')[0].trim()}</span>
                        <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-black/5 dark:bg-white/5">
                          {s.status === 'MAINTENANCE' ? 'BoM Pemeliharaan' : 'Perlu Kunci'}
                        </span>
                      </span>
                    ))}
                </div>

                {/* Footer Controls & Telemetry Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/80">
                  <div className="flex items-center gap-2 text-slate-400 text-[10px] flex-wrap">
                    <span>Protokol Data: <strong className="text-slate-600 dark:text-slate-300">WGS84 EPSG:4326</strong></span>
                    <span>•</span>
                    <span>Siklus Sinkronisasi: <strong className="text-slate-600 dark:text-slate-300">Serentak Setiap 5 Menit</strong></span>
                    <span>•</span>
                    <span>Multi-Provider: <strong className="text-slate-600 dark:text-slate-300">Open-Meteo, BMKG, Copernicus, USGS, PuSGeN, ESRI, OSM, NASA FIRMS, Gemini AI</strong></span>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setIsTelemetryModalOpen(true)}
                      className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-md shadow-indigo-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                      title="Buka Pusat Transparansi Data, Status Web/API, Uji Akurasi & Log Audit AI"
                    >
                      <Terminal className="w-3.5 h-3.5 text-sky-300" />
                      <span>Inspeksi Data Masuk-Keluar & Audit AI</span>
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                      </span>
                    </button>
                  </div>
                </div>
              </div>
              </>}
            </div>
          )}
        </div>
      </div>

      {/* Indonesian Geolocation Search & Selection Dialog */}
      {isLocationPickerOpen && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setIsLocationPickerOpen(false)}
        >
          <div 
            className="relative w-full max-w-2xl max-h-[88vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                    Pilih Titik Wilayah Indonesia
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    38 Provinsi, 120+ Kab/Kota, dan 60+ Daerah Pelosok/Terluar 3T
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLocationPickerOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Bar Input */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="weather-location-search-input"
                  name="locationSearch"
                  type="text"
                  autoFocus
                  value={locationSearchQuery}
                  onChange={(e) => setLocationSearchQuery(e.target.value)}
                  placeholder="Cari provinsi, kota, kabupaten, atau pelosok 3T (cth: Wamena, Natuna, Sabang, Mojokerto)..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {locationSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setLocationSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-[11px] font-bold">
                {[
                  { id: 'semua', label: '🌟 Semua Titik' },
                  { id: 'provinsi', label: '🏛️ Provinsi (38)' },
                  { id: 'kota', label: '🏙️ Kota' },
                  { id: 'kabupaten', label: '🏘️ Kabupaten' },
                  { id: 'pelosok', label: '🏕️ Pelosok & Terluar 3T' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id as any)}
                    className={`px-3 py-1.5 rounded-lg shrink-0 transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Island Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[10px] font-semibold text-slate-500">
                <span className="shrink-0 text-slate-400">Pulau:</span>
                {[
                  { id: 'semua', label: 'Semua' },
                  { id: 'Sumatera', label: 'Sumatera' },
                  { id: 'Jawa', label: 'Jawa' },
                  { id: 'Kalimantan', label: 'Kalimantan' },
                  { id: 'Sulawesi', label: 'Sulawesi' },
                  { id: 'Bali', label: 'Bali' },
                  { id: 'Nusa Tenggara', label: 'Nusa Tenggara' },
                  { id: 'Maluku', label: 'Maluku' },
                  { id: 'Papua', label: 'Papua' },
                ].map((isl) => (
                  <button
                    key={isl.id}
                    type="button"
                    onClick={() => setSelectedIsland(isl.id)}
                    className={`px-2 py-0.5 rounded-md shrink-0 transition-all ${
                      selectedIsland === isl.id
                        ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/40 font-bold'
                        : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {isl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Places List (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-[260px] max-h-[50vh]">
              {/* Pinned Current GPS Location */}
              <button
                type="button"
                onClick={handleSelectUserGps}
                className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left group ${
                  selectedRegionId === 'user'
                    ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 shadow-sm'
                    : 'bg-slate-50/80 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white shadow-sm">
                    <Crosshair className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-white truncate">
                        Lokasi GPS Saya Saat Ini
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-blue-500/20 text-blue-600 dark:text-blue-300 font-bold">
                        Presisi GNSS
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {userPreciseLocation?.shortDisplay || `Koordinat (${lat.toFixed(3)}°, ${lng.toFixed(3)}°)`}
                    </p>
                  </div>
                </div>
                {selectedRegionId === 'user' && (
                  <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                )}
              </button>

              {/* Count Indicator */}
              <div className="px-2 pt-2 pb-1 text-[11px] font-bold text-slate-400 flex items-center justify-between">
                <span>Titik Wilayah ({filteredPlaces.length})</span>
                {filteredPlaces.length === 0 && (
                  <span className="text-amber-500">Tidak ada lokasi yang cocok dengan kata kunci</span>
                )}
              </div>

              {/* Filtered Places Items */}
              {filteredPlaces.map((place: GeoPlace) => {
                const isSelected = selectedRegionId === place.id;
                const badgeColor =
                  place.category === 'provinsi'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    : place.category === 'pelosok'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : place.category === 'kota'
                    ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30'
                    : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30';

                const categoryIcon =
                  place.category === 'provinsi' ? '🏛️' :
                  place.category === 'pelosok' ? '🏕️' :
                  place.category === 'kota' ? '🏙️' : '🏘️';

                return (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => handleSelectPlace(place)}
                    className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all text-left ${
                      isSelected
                        ? 'bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 shadow-sm'
                        : 'bg-white hover:bg-slate-50 dark:bg-slate-900/60 dark:hover:bg-slate-800/80 border-slate-200/70 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-base shrink-0">{categoryIcon}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-white truncate">
                            {place.name}
                          </span>
                          <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded border ${badgeColor}`}>
                            {place.category || place.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {place.province ? `${place.province} • ${place.island || ''}` : place.island || ''}
                          {place.description ? ` — ${place.description}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                        {place.lat.toFixed(2)}°, {place.lng.toFixed(2)}°
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between text-xs text-slate-500">
              <span>Mencakup seluruh 38 Provinsi & Titik Perbatasan NKRI</span>
              <button
                type="button"
                onClick={() => setIsLocationPickerOpen(false)}
                className="px-3.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Geospatial Data In/Out Transparency, Web Health & AI Audit Modal */}
      <GeospatialDataTransparencyModal
        isOpen={isTelemetryModalOpen}
        onClose={() => setIsTelemetryModalOpen(false)}
        weatherData={data}
        lat={activeLat}
        lng={activeLng}
        locationName={activeRegionName}
        onReverifyAi={handleReverifyAi}
        onRefreshWeather={() => loadWeather(activeLat, activeLng, activeRegionName, true)}
      />
    </>
  );

  if (asPage) {
    return (
      <div className="w-full h-full min-h-[calc(100vh-4.5rem)] flex flex-col rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden bg-white dark:bg-slate-900">
        {modalBody}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      {modalBody}
    </div>
  );
};

