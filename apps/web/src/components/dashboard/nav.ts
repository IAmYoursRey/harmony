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
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  roles?: ("student" | "teacher" | "developer")[];
  labelOverrides?: Partial<Record<"student" | "teacher" | "developer", string>>;
}

export const navItems: NavItem[] = [
  {
    id: "dev-dashboard",
    label: "User Account",
    icon: ShieldAlert,
    roles: ["developer"],
  },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "ai-learning", label: "AI Learning", icon: Brain },
  { id: "maps", label: "Maps", icon: Map },
  {
    id: "digital-twin",
    label: "Harmony Twin",
    icon: Boxes,
    roles: ["teacher", "developer", "student"],
  },
  {
    id: "student-game",
    label: "Join Room / Game",
    icon: Swords,
    roles: ["student"],
  },
  { id: "simulation", label: "Disaster Question", icon: CloudLightning },
  { id: "gss", label: "Harmony Score", icon: Gauge },
  { id: "resilience", label: "School Resilience", icon: ShieldCheck },
  { id: "survey", label: "Survey Analytics", icon: BarChart3 },
  {
    id: "teacher",
    label: "Teacher Dashboard",
    icon: GraduationCap,
    roles: ["teacher", "developer"],
  },
  { id: "profile", label: "Profile", icon: User },
];
