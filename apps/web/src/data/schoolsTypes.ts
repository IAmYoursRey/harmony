export type RiskCategory = 'Low' | 'Moderate' | 'High' | 'Very High';

export type SchoolLevel = 'SMA' | 'SMK' | 'MA' | 'SMP' | 'MTs' | 'SD' | 'MI';

export interface School {
  id: string;
  school_id?: string;
  name: string;
  lat: number;
  latitude?: number;
  lng: number;
  longitude?: number;
  risk: RiskCategory;
  earthquake: number;
  flood: number;
  landslide: number;
  volcanic: number;
  tsunami: number;
  level: SchoolLevel;
  isPublic: boolean;
  regency?: string;
  province?: string;
  spatial_integration_status?: string;
}

export interface Regency {
  id: string;
  name: string;
  schools: School[];
}

export interface Province {
  id: string;
  name: string;
  regencies: Regency[];
}

export interface HazardInfo {
  earthquake: number;
  flood: number;
  landslide: number;
  volcanic: number;
  tsunami: number;
}

export const riskStyles: Record<RiskCategory, { bg: string; text: string; label: string }> = {
  Low: { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-400', label: 'Low' },
  Moderate: { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-400', label: 'Moderate' },
  High: { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-400', label: 'High' },
  'Very High': { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-400', label: 'Very High' },
};

export const recommendedModules: Record<RiskCategory, string[]> = {
  Low: ['Basic Disaster Awareness', 'Introduction to Emergency Response', 'Family Preparedness Planning'],
  Moderate: ['Earthquake Preparedness', 'Flood Response Training', 'Evacuation Route Planning', 'Basic First Aid'],
  High: ['Advanced Earthquake Simulation', 'Flood & Landslide Response', 'Volcanic Ash Preparedness', 'Emergency Shelter Management'],
  'Very High': ['Multi-Hazard Simulation', 'Tsunami Evacuation Drill', 'Volcanic Eruption Response', 'Community Resilience Planning', 'Advanced First Aid & Rescue'],
};

export const evacuationInfo: Record<RiskCategory, { assemblyPoint: string; shelter: string; route: string; estimatedTime: string }> = {
  Low: { assemblyPoint: 'School courtyard', shelter: 'Nearby community center', route: 'Direct exit through main gate', estimatedTime: '5 min' },
  Moderate: { assemblyPoint: 'School sports field', shelter: 'Community hall (500m)', route: 'Main gate → sports field → shelter', estimatedTime: '8 min' },
  High: { assemblyPoint: 'Designated assembly area', shelter: 'Government building (1km)', route: 'Emergency exit → assembly area → shelter', estimatedTime: '12 min' },
  'Very High': { assemblyPoint: 'Elevated assembly point', shelter: 'Evacuation shelter (2km)', route: 'Multi-route evacuation to elevated ground', estimatedTime: '15 min' },
};
