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
