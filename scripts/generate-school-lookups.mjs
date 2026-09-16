/**
 * Generate pre-extracted lookup tables from schools-lite.json
 * Output: apps/web/public/data/provinces.json, regencies.json, schools-by-province/*.json
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const dataDir = 'apps/web/public/data';
const schools = JSON.parse(readFileSync(join(dataDir, 'schools-lite.json'), 'utf8'));

console.log(`Loaded ${schools.length} schools.`);

// Build province list
const provinceSet = new Set();
const regenciesByProvince = {};
const schoolsByProvince = {};

for (const s of schools) {
  const prov = s.province;
  const reg = s.regency;
  if (!prov) continue;

  provinceSet.add(prov);

  if (!regenciesByProvince[prov]) regenciesByProvince[prov] = new Set();
  if (reg) regenciesByProvince[prov].add(reg);

  if (!schoolsByProvince[prov]) schoolsByProvince[prov] = [];
  schoolsByProvince[prov].push({
    id: s.id || s.school_id,
    npsn: s.npsn,
    name: s.name || s.school_name,
    level: s.school_level,
    status: s.status,
    province: s.province,
    regency: s.regency,
    district: s.district,
    latitude: s.latitude,
    longitude: s.longitude,
  });
}

// 1. provinces.json
const provinces = Array.from(provinceSet)
  .sort()
  .map((p) => ({ id: p, name: p }));
writeFileSync(join(dataDir, 'provinces.json'), JSON.stringify(provinces), 'utf8');
console.log(`✓ provinces.json — ${provinces.length} provinces`);

// 2. regencies.json — flat lookup: { "Aceh": [{ id, name }], ... }
const regencies = {};
for (const [prov, regSet] of Object.entries(regenciesByProvince)) {
  regencies[prov] = Array.from(regSet)
    .sort()
    .map((r) => ({ id: r, name: r }));
}
writeFileSync(join(dataDir, 'regencies.json'), JSON.stringify(regencies), 'utf8');
console.log(`✓ regencies.json — ${Object.keys(regencies).length} provinces`);

// 3. Per-province school files: schools-by-province/<province-slug>.json
const byProvDir = join(dataDir, 'schools-by-province');
if (!existsSync(byProvDir)) mkdirSync(byProvDir);

for (const [prov, list] of Object.entries(schoolsByProvince)) {
  const slug = prov.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  writeFileSync(join(byProvDir, `${slug}.json`), JSON.stringify(list), 'utf8');
}
console.log(`✓ schools-by-province/ — ${Object.keys(schoolsByProvince).length} files`);

// 4. province-slugs.json — maps province name to slug
const slugMap = {};
for (const prov of Object.keys(schoolsByProvince)) {
  slugMap[prov] = prov.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}
writeFileSync(join(dataDir, 'province-slugs.json'), JSON.stringify(slugMap), 'utf8');
console.log(`✓ province-slugs.json`);

console.log('\nDone! All lookup tables generated.');
