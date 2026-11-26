import React from 'react';
import {
  Cloud,
  Radio,
  Satellite,
  Mountain,
  Crosshair,
  Waves,
  Camera,
  Target,
  Activity,
  Globe,
  Database,
  Flame,
  Clock,
  Leaf,
  FileText,
} from 'lucide-react';

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

export interface StudioDomainDef {
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
  {
    id: 'weather',
    name: 'Cuaca',
    badge: 'Model Lokasi',
    icon: Cloud,
    pillar: 'atmosfer',
    pillarLabel: 'Atmosfer',
    badgeColor: {
      active: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
      inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      indicator: 'bg-sky-500',
    },
  },
  {
    id: 'bmkg',
    name: 'Info BMKG',
    badge: 'BMKG Intel',
    icon: Radio,
    pillar: 'atmosfer',
    pillarLabel: 'Atmosfer',
    badgeColor: {
      active: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
      inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      indicator: 'bg-indigo-500',
    },
  },
  {
    id: 'remote_sensing',
    name: 'Citra Satelit',
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
    name: 'Topografi DEM',
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
    name: 'GNSS Presisi',
    badge: 'CORS',
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
    name: 'Hidrologi',
    badge: 'DAS',
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
    name: 'Survei Drone',
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
  {
    id: 'analytics',
    name: 'Analisis Spasial',
    badge: 'Buffer GIS',
    icon: Target,
    pillar: 'analitik',
    pillarLabel: 'Analitik',
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
    pillarLabel: 'Analitik',
    badgeColor: {
      active: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30',
      inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      indicator: 'bg-violet-500',
    },
  },
  {
    id: 'fusion',
    name: 'Fusi Data',
    badge: 'Gap AI',
    icon: Globe,
    pillar: 'analitik',
    pillarLabel: 'Analitik',
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
    pillarLabel: 'Analitik',
    badgeColor: {
      active: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
      inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      indicator: 'bg-slate-400',
    },
  },
  {
    id: 'hotspots',
    name: 'Titik Panas',
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
    name: 'Akses Layanan',
    badge: '15 Menit',
    icon: Clock,
    pillar: 'analitik',
    pillarLabel: 'Analitik',
    badgeColor: {
      active: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
      inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      indicator: 'bg-blue-500',
    },
  },
  {
    id: 'emissions',
    name: 'Emisi Karbon',
    badge: 'GHG',
    icon: Leaf,
    pillar: 'analitik',
    pillarLabel: 'Analitik',
    badgeColor: {
      active: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      indicator: 'bg-emerald-500',
    },
  },
  {
    id: 'swot',
    name: 'Analisis SWOT',
    badge: 'Strategi',
    icon: FileText,
    pillar: 'analitik',
    pillarLabel: 'Analitik',
    badgeColor: {
      active: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
      inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      indicator: 'bg-purple-500',
    },
  },
];

