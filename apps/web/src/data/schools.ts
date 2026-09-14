import type { Province, Regency, School, RiskCategory } from './schoolsTypes';
import { haversineDistance } from '../utils/geoUtils';

export type { Province, Regency, School, RiskCategory };
export { riskStyles, recommendedModules, evacuationInfo } from './schoolsTypes';

export interface SearchSchoolResult {
  school: School;
  provinceName: string;
  regencyName: string;
}

export interface NearbySchoolResult extends SearchSchoolResult {
  distanceKm: number;
}

/**
 * Helper to sort schools by distance.
 * Since schools are now fetched via API, we pass the fetched schools to this.
 */
export function sortByNearest(
  schools: School[],
  userLat: number,
  userLng: number,
  limit = 20,
  levelFilter?: School['level'][],
  radiusKm?: number
): NearbySchoolResult[] {
  const results: NearbySchoolResult[] = [];

  for (const school of schools) {
    if (levelFilter && levelFilter.length > 0 && !levelFilter.includes(school.level)) continue;
    const distanceKm = haversineDistance(userLat, userLng, school.lat, school.lng);
    if (radiusKm !== undefined && distanceKm > radiusKm) continue;
    results.push({
      school,
      provinceName: school.province || '',
      regencyName: school.regency || '',
      distanceKm,
    });
  }

  results.sort((a, b) => a.distanceKm - b.distanceKm);
  return results.slice(0, limit);
}

export function getAverageRisk(school: School): number {
  return Math.round((school.earthquake + school.flood + school.landslide + school.volcanic + school.tsunami) / 5);
}
