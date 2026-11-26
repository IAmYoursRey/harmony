import {
  ShieldAlert,
  LayoutDashboard,
  Brain,
  Map,
  Boxes,
  Swords,
  CloudLightning,
  Gauge,
  BarChart3,
  User,
  Info,
  GraduationCap,
  ShieldCheck,
  Trophy,
  Satellite,
  Sprout,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export type UserNavRole = "student" | "teacher" | "developer";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  roles?: UserNavRole[];
  labelOverrides?: Partial<Record<UserNavRole, string>>;
}

export function filterVisibleNavItems(
  items: NavItem[],
  role?: UserNavRole | string | null,
): NavItem[] {
  return items.filter((item) => {
    if (item.roles && role) {
      return item.roles.includes(role as UserNavRole);
    }
    if (!role && item.roles && !item.roles.includes("student")) {
      return false;
    }
    return true;
  });
}

export function resolveNavLabel(
  item: NavItem,
  role: UserNavRole | string | undefined | null,
  translate: (key: string, fallback?: string) => string,
): string {
  const override = role
    ? item.labelOverrides?.[role as UserNavRole]
    : undefined;
  return override || translate(`nav.${item.id}`, item.label);
}

export const navItems: NavItem[] = [
  { id: "maps", label: "Peta Utama", icon: Map },
  { id: "geospatial", label: "Studio Geospasial", icon: Satellite },
  { id: "field-telemetry", label: "Telemetri Lahan", icon: Sprout },
  {
    id: "dev-dashboard",
    label: "Kelola Akun",
    icon: ShieldAlert,
    roles: ["developer"],
  },
  { id: "dashboard", label: "Beranda", icon: LayoutDashboard },
  { id: "events", label: "Agenda", icon: Trophy },
  { id: "ai-learning", label: "Tanya GeoBot", icon: Brain },
  {
    id: "digital-twin",
    label: "Simulasi Denah",
    icon: Boxes,
    roles: ["teacher", "developer", "student"],
    labelOverrides: {
      student: "Simulasi Evakuasi",
    },
  },
  {
    id: "student-game",
    label: "Ruang Sesi",
    icon: Swords,
    roles: ["student"],
  },
  { id: "simulation", label: "Latihan Soal", icon: CloudLightning },
  { id: "gss", label: "Skor Harmony", icon: Gauge },
  { id: "resilience", label: "Ketahanan Sekolah", icon: ShieldCheck },
  { id: "survey", label: "Survei Sekolah", icon: BarChart3 },
  {
    id: "learning-gain",
    label: "Validasi Empiris",
    icon: TrendingUp,
  },
  {
    id: "teacher",
    label: "Dasbor Guru",
    icon: GraduationCap,
    roles: ["teacher", "developer"],
  },
  { id: "profile", label: "Profil", icon: User },
];

export interface PersonaNavGroup {
  id: string;
  title: string;
  badge?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  items: NavItem[];
}

function pickNavItems(ids: string[]): NavItem[] {
  const byId = new globalThis.Map<string, NavItem>(navItems.map((item) => [item.id, item]));
  return ids.map((id) => byId.get(id)).filter((item): item is NavItem => Boolean(item));
}

// Separate navigation hierarchy into 4 focused workspaces so public, students, teachers, and experts see only relevant workflows first
export function getPersonaNavGroups(role?: UserNavRole | string | null): PersonaNavGroup[] {
  if (!role) {
    return [
      {
        id: "public-siaga",
        title: "Layanan Siaga Publik",
        badge: "Terbuka",
        items: pickNavItems(["maps", "geospatial"]),
      },
      {
        id: "public-advanced",
        title: "Instrumen Pemantauan Lanjut",
        collapsible: true,
        defaultCollapsed: true,
        items: pickNavItems(["field-telemetry"]),
      },
    ];
  }

  if (role === "student") {
    return [
      {
        id: "student-learning",
        title: "Alur Belajar & Simulasi",
        badge: "Murid",
        items: pickNavItems(["dashboard", "student-game", "digital-twin", "simulation", "ai-learning"]),
      },
      {
        id: "student-explore",
        title: "Peta Sekolah & Pencapaian",
        items: pickNavItems(["maps", "gss", "events", "survey", "profile"]),
      },
      {
        id: "student-advanced",
        title: "Eksplorasi Sains Lanjut",
        collapsible: true,
        defaultCollapsed: true,
        items: pickNavItems(["geospatial", "field-telemetry"]),
      },
    ];
  }

  if (role === "teacher") {
    return [
      {
        id: "teacher-core",
        title: "Ruang Mengajar",
        badge: "Guru",
        items: pickNavItems(["teacher", "digital-twin", "events", "ai-learning"]),
      },
      {
        id: "teacher-spab",
        title: "Kesiapsiagaan Sekolah",
        items: pickNavItems(["resilience", "gss", "survey", "dashboard", "maps"]),
      },
      {
        id: "teacher-research",
        title: "Instrumen Riset & Geografi",
        collapsible: true,
        defaultCollapsed: true,
        items: pickNavItems(["geospatial", "field-telemetry", "learning-gain", "profile"]),
      },
    ];
  }

  return [
    {
      id: "expert-analytics",
      title: "Analitik Geospasial & Riset",
      badge: "Ahli",
      items: pickNavItems(["maps", "geospatial", "field-telemetry", "learning-gain"]),
    },
    {
      id: "expert-system",
      title: "Sistem & Manajemen SPAB",
      items: pickNavItems([
        "dev-dashboard",
        "teacher",
        "digital-twin",
        "resilience",
        "gss",
        "dashboard",
        "ai-learning",
        "simulation",
        "survey",
        "events",
        "profile",
      ]),
    },
  ];
}
