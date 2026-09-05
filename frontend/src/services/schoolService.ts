import type { School, SearchSchoolResult } from '@/data/schools';
import { apiClient } from './apiClient';

export async function fetchSchools(province?: string, regency?: string): Promise<School[]> {
  let url = `/api/schools`;
  
  const params = new URLSearchParams();
  if (province) params.append('province', province);
  if (regency) params.append('regency', regency);
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  const data = await apiClient.get(url);
  return data.schools || [];
}

export async function searchSchools(query: string): Promise<SearchSchoolResult[]> {
  const url = `/api/schools/search?q=${encodeURIComponent(query)}`;
  
  const data = await apiClient.get(url);
  const schools: School[] = data.schools || [];
  
  return schools.map(s => ({
    school: s,
    provinceName: s.province || '',
    regencyName: s.regency || ''
  }));
}

export async function getSchoolById(id: string): Promise<School | undefined> {
  // Legacy mock IDs start with 'sch-', they don't exist in the real 215k dataset.
  // We return undefined immediately to prevent 404 errors polluting the console.
  if (!id || id.startsWith('sch-') || id === 'unknown') return undefined;
  
  try {
    const data = await apiClient.get(`/api/schools/${id}`);
    return data.school;
  } catch {
    return undefined;
  }
}

export async function fetchProvinces(): Promise<{id: string, name: string}[]> {
  const data = await apiClient.get('/api/schools/provinces');
  return data.provinces || [];
}

export async function fetchRegencies(province: string): Promise<{id: string, name: string}[]> {
  if (!province) return [];
  const data = await apiClient.get(`/api/schools/regencies?province=${encodeURIComponent(province)}`);
  return data.regencies || [];
}

export function extractProvinces(schools: School[]): { id: string, name: string }[] {
  // Deprecated for large datasets, used by fallback
  const provs = new Set(schools.map(s => s.province).filter(Boolean));
  return Array.from(provs).map(p => ({ id: p as string, name: p as string }));
}

export function extractRegencies(schools: School[], province: string): { id: string, name: string }[] {
  // Deprecated for large datasets, used by fallback
  const regs = new Set(schools.filter(s => s.province === province).map(s => s.regency).filter(Boolean));
  return Array.from(regs).map(r => ({ id: r as string, name: r as string }));
}

let _schoolsCache: School[] | null = null;
export async function getAllSchools(): Promise<School[]> {
  // Deprecated: returns max 1000 items. Legacy views only.
  if (_schoolsCache) return _schoolsCache;
  _schoolsCache = await fetchSchools();
  return _schoolsCache;
}

