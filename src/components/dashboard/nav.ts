import {
  ShieldAlert,
  LayoutDashboard,
  Brain,
  Map,
  Boxes,
  CloudLightning,
  Gauge,
  BarChart3,
  User,
  Info,
  GraduationCap,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  roles?: ('student' | 'teacher' | 'dev')[];
}

export const navItems: NavItem[] = [
  { id: 'dev-dashboard', label: 'Dev Panel', icon: ShieldAlert, roles: ['dev'] },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'ai-learning', label: 'AI Learning', icon: Brain },
  { id: 'geo-risk-map', label: 'Geo Risk Map', icon: Map },
  { id: 'digital-twin', label: 'Digital Twin School', icon: Boxes },
  { id: 'simulation', label: 'Disaster Simulation', icon: CloudLightning },
  { id: 'gss', label: 'GeoSense Score', icon: Gauge },
  { id: 'resilience', label: 'School Resilience', icon: ShieldCheck },
  { id: 'survey', label: 'Survey Analytics', icon: BarChart3 },
  { id: 'teacher', label: 'Teacher Dashboard', icon: GraduationCap, roles: ['teacher', 'dev'] },
  { id: 'profile', label: 'Profile', icon: User },
];
