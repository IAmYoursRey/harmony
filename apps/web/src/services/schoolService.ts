import type { School, SearchSchoolResult } from "@/data/schools";
import { apiClient } from "./apiClient";

// In-memory caches for static lookups
let _provincesCache: { id: string; name: string }[] | null = null;
let _regenciesCache: Record<string, { id: string; name: string }[]> | null = null;
let _slugMapCache: Record<string, string> | null = null;

async function getProvinceSlugMap(): Promise<Record<string, string>> {
  if (_slugMapCache) return _slugMapCache;
  try {
    const res = await fetch('/data/province-slugs.json');
    _slugMapCache = await res.json();
  } catch {
    _slugMapCache = {};
  }
  return _slugMapCache!;
}

export async function fetchProvinces(): Promise<{ id: string; name: string }[]> {
  if (_provincesCache) return _provincesCache;
  try {
    const res = await fetch('/data/provinces.json');
    if (res.ok) {
      _provincesCache = await res.json();
      return _provincesCache!;
    }
  } catch {
    // fall through to API
  }
  // Fallback to API
  try {
    const data = await apiClient.get("/api/schools/provinces");
    _provincesCache = data.provinces || [];
    return _provincesCache!;
  } catch {
    return [];
  }
}

export async function fetchRegencies(province: string): Promise<{ id: string; name: string }[]> {
  if (!province) return [];

  if (!_regenciesCache) {
    try {
      const res = await fetch('/data/regencies.json');
      if (res.ok) {
        _regenciesCache = await res.json();
      }
    } catch {
      // fall through to API
    }
  }

  if (_regenciesCache && _regenciesCache[province]) {
    return _regenciesCache[province];
  }

  // Fallback to API
  try {
    const data = await apiClient.get(
      `/api/schools/regencies?province=${encodeURIComponent(province)}`,
    );
    return data.regencies || [];
  } catch {
    return [];
  }
}

export async function fetchSchools(province?: string, regency?: string): Promise<School[]> {
  // If province specified, try static per-province file first
  if (province) {
    try {
      const slugMap = await getProvinceSlugMap();
      const slug = slugMap[province] || province.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const res = await fetch(`/data/schools-by-province/${slug}.json`);
      if (res.ok) {
        let schools: School[] = await res.json();
        if (regency) {
          schools = schools.filter((s) => s.regency === regency);
        }
        return schools;
      }
    } catch {
      // fall through to API
    }
  }

  // Fallback to API
  let url = `/api/schools`;
  const params = new URLSearchParams();
  if (province) params.append("province", province);
  if (regency) params.append("regency", regency);
  if (params.toString()) url += `?${params.toString()}`;

  try {
    const data = await apiClient.get(url);
    return data.schools || [];
  } catch {
    return [];
  }
}

export async function searchSchools(query: string): Promise<SearchSchoolResult[]> {
  const url = `/api/schools/search?q=${encodeURIComponent(query)}`;
  const data = await apiClient.get(url);
  const schools: School[] = data.schools || [];
  return schools.map((s) => ({
    school: s,
    provinceName: s.province || "",
    regencyName: s.regency || "",
  }));
}

export async function getSchoolById(id: string): Promise<School | undefined> {
  if (!id || id.startsWith("sch-") || id === "unknown") return undefined;
  try {
    const data = await apiClient.get(`/api/schools/${id}`);
    return data.school;
  } catch {
    return undefined;
  }
}

export async function fetchSchoolRisk(id: string): Promise<any> {
  if (!id || id.startsWith("sch-") || id === "unknown") return undefined;
  try {
    const data = await apiClient.get(`/api/schools/${id}/risk`);
    return data;
  } catch (err) {
    console.error("Failed to fetch school risk:", err);
    return undefined;
  }
}

export function extractProvinces(schools: School[]): { id: string; name: string }[] {
  const provs = new Set(schools.map((s) => s.province).filter(Boolean));
  return Array.from(provs).map((p) => ({ id: p as string, name: p as string }));
}

export function extractRegencies(schools: School[], province: string): { id: string; name: string }[] {
  const regs = new Set(
    schools.filter((s) => s.province === province).map((s) => s.regency).filter(Boolean),
  );
  return Array.from(regs).map((r) => ({ id: r as string, name: r as string }));
}

let _schoolsCache: School[] | null = null;
export async function getAllSchools(): Promise<School[]> {
  if (_schoolsCache) return _schoolsCache;
  _schoolsCache = await fetchSchools();
  return _schoolsCache;
}
