import type { Province, Regency, School, RiskCategory } from './schoolsTypes';
import { generateSchoolData } from './schoolDataGenerator';
import { haversineDistance } from '../utils/geoUtils';

export type { Province, Regency, School, RiskCategory };
export { riskStyles, recommendedModules, evacuationInfo } from './schoolsTypes';

export const schoolData: Province[] = generateSchoolData();

export function findSchoolsByProvince(provinceId: string): Regency[] {
  return schoolData.find((p) => p.id === provinceId)?.regencies ?? [];
}

export function findSchoolsByRegency(provinceId: string, regencyId: string): School[] {
  return findSchoolsByProvince(provinceId).find((r) => r.id === regencyId)?.schools ?? [];
}

export function findSchool(schoolId: string): School | undefined {
  for (const province of schoolData) {
    for (const regency of province.regencies) {
      const school = regency.schools.find((s) => s.id === schoolId);
      if (school) return school;
    }
  }
  return undefined;
}

export function getProvinceName(provinceId: string): string {
  return schoolData.find((p) => p.id === provinceId)?.name ?? '';
}

export function getRegencyName(provinceId: string, regencyId: string): string {
  return findSchoolsByProvince(provinceId).find((r) => r.id === regencyId)?.name ?? '';
}

export function getProvinceById(provinceId: string): Province | undefined {
  return schoolData.find((p) => p.id === provinceId);
}

export function getRegencyById(provinceId: string, regencyId: string): Regency | undefined {
  return findSchoolsByProvince(provinceId).find((r) => r.id === regencyId);
}

export function searchSchools(query: string, limit = 50): { school: School; provinceName: string; regencyName: string; provinceId: string; regencyId: string }[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const results: { school: School; provinceName: string; regencyName: string; provinceId: string; regencyId: string }[] = [];

  for (const province of schoolData) {
    for (const regency of province.regencies) {
      for (const school of regency.schools) {
        if (
          school.name.toLowerCase().includes(q) ||
          regency.name.toLowerCase().includes(q) ||
          province.name.toLowerCase().includes(q)
        ) {
          results.push({
            school,
            provinceName: province.name,
            regencyName: regency.name,
            provinceId: province.id,
            regencyId: regency.id,
          });
          if (results.length >= limit) return results;
        }
      }
    }
  }

  return results;
}

export interface NearbySchoolResult {
  school: School;
  provinceName: string;
  regencyName: string;
  provinceId: string;
  regencyId: string;
  distanceKm: number;
}

/**
 * Find the nearest schools to the given GPS coordinate.
 * @param userLat - User's latitude
 * @param userLng - User's longitude
 * @param limit - Maximum number of results (default 20)
 * @param levelFilter - Optional: filter by school level(s)
 * @param radiusKm - Optional: maximum search radius in km (default unlimited)
 */
export function findNearestSchools(
  userLat: number,
  userLng: number,
  limit = 20,
  levelFilter?: School['level'][],
  radiusKm?: number
): NearbySchoolResult[] {
  const results: NearbySchoolResult[] = [];

  for (const province of schoolData) {
    for (const regency of province.regencies) {
      for (const school of regency.schools) {
        if (levelFilter && levelFilter.length > 0 && !levelFilter.includes(school.level)) continue;
        const distanceKm = haversineDistance(userLat, userLng, school.lat, school.lng);
        if (radiusKm !== undefined && distanceKm > radiusKm) continue;
        results.push({
          school,
          provinceName: province.name,
          regencyName: regency.name,
          provinceId: province.id,
          regencyId: regency.id,
          distanceKm,
        });
      }
    }
  }

  results.sort((a, b) => a.distanceKm - b.distanceKm);
  return results.slice(0, limit);
}

export function getAverageRisk(school: School): number {
  return Math.round((school.earthquake + school.flood + school.landslide + school.volcanic + school.tsunami) / 5);
}

export const provinceCount = schoolData.length;
export const regencyCount = schoolData.reduce((sum, p) => sum + p.regencies.length, 0);
export const schoolCount = schoolData.reduce(
  (sum, p) => sum + p.regencies.reduce((s, r) => s + r.schools.length, 0),
  0
);
