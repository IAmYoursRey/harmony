import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const readText = (relPath) => fs.readFileSync(path.join(ROOT, relPath), 'utf8');

describe('4-Persona Navigation & Progressive Disclosure', () => {
  it('defines separated persona navigation groups in nav.ts', () => {
    const navSrc = readText('apps/web/src/components/dashboard/nav.ts');
    assert.match(navSrc, /export interface PersonaNavGroup/);
    assert.match(navSrc, /export function getPersonaNavGroups/);
    assert.match(navSrc, /role === "student"/);
    assert.match(navSrc, /role === "teacher"/);
    assert.match(navSrc, /Layanan Siaga Publik/);
    assert.match(navSrc, /Alur Belajar & Simulasi/);
    assert.match(navSrc, /Ruang Mengajar/);
    assert.match(navSrc, /Analitik Geospasial & Riset/);
  });

  it('collapses locked school modules behind a single portal CTA for guests in Sidebar.tsx', () => {
    const sidebarSrc = readText('apps/web/src/components/dashboard/Sidebar.tsx');
    assert.match(sidebarSrc, /getPersonaNavGroups\(currentUser\?\.role\)/);
    assert.match(sidebarSrc, /Portal Edukasi Sekolah/);
    assert.match(sidebarSrc, /to="\/app\/field-telemetry"/);
    assert.match(sidebarSrc, />Beta</);
  });

  it('provides clean persona entry points on Hero.tsx and LoginPage.tsx', () => {
    const heroSrc = readText('apps/web/src/components/Hero.tsx');
    const loginSrc = readText('apps/web/src/pages/LoginPage.tsx');
    assert.match(heroSrc, /Warga & Publik/);
    assert.match(heroSrc, /Murid/);
    assert.match(heroSrc, /Guru & Sekolah/);
    assert.match(heroSrc, /Ahli & Peneliti/);
    assert.match(loginSrc, /Lanjut Tanpa Masuk sebagai Warga Publik/);
    assert.match(loginSrc, /to="\/app\/learning-gain"/);
  });
});

describe('Bundle & Traffic Corridor Lazy Loading Optimization', () => {
  it('keeps trafficTelemetryService.ts compact (< 150 KB) with static data moved to JSON', () => {
    const svcPath = path.join(ROOT, 'apps/web/src/services/trafficTelemetryService.ts');
    const stat = fs.statSync(svcPath);
    assert.ok(stat.size < 150 * 1024, `Expected trafficTelemetryService.ts < 150 KB, got ${stat.size} bytes`);

    const svcSrc = fs.readFileSync(svcPath, 'utf8');
    assert.match(svcSrc, /export async function loadFullTrafficCorridors/);
    assert.match(svcSrc, /\/data\/traffic-corridors\.json/);
  });

  it('serves valid static traffic-corridors.json dataset from public/data', () => {
    const jsonRaw = readText('apps/web/public/data/traffic-corridors.json');
    const parsed = JSON.parse(jsonRaw);
    assert.ok(Array.isArray(parsed), 'traffic-corridors.json must be an array');
    assert.ok(parsed.length >= 100, `Expected at least 100 corridors, got ${parsed.length}`);
    assert.ok(parsed[0]?.id && Array.isArray(parsed[0]?.path), 'Corridor entry must contain id and path');
  });

  it('lazy-loads Geospatial Studio tabs inside GeospatialWeatherModal.tsx', () => {
    const modalSrc = readText('apps/web/src/components/dashboard/views/spatial/GeospatialWeatherModal.tsx');
    assert.match(modalSrc, /lazy\(\(\) => import\('\.\/studio\/GeospatialBMKGTab'\)/);
    assert.match(modalSrc, /<Suspense[\s\S]*?fallback=/);
  });
});

describe('2D Relief & 3D Shader Upgrades', () => {
  it('adds hillshade relief layer, wires GlobeView3D, and keeps guest map unobstructed in MapsView.tsx', () => {
    const mapsSrc = readText('apps/web/src/components/dashboard/views/spatial/MapsView.tsx');
    assert.match(mapsSrc, /World_Hillshade/);
    assert.match(mapsSrc, /ol-hillshade-relief/);
    assert.match(mapsSrc, /Analitik GIS/);
    assert.match(mapsSrc, /Ringkas/);
    assert.match(mapsSrc, /globeType === 'globe'/);
    assert.match(mapsSrc, /<GlobeView3D/);
  });

  it('prevents rocky boulders on gas giants and fixes Saturn ring tilt in PlanetarySurfaceExplorerModal.tsx', () => {
    const explorerSrc = readText('apps/web/src/components/dashboard/views/spatial/celestial/PlanetarySurfaceExplorerModal.tsx');
    assert.match(explorerSrc, /isGasGiant \|\| isSunBody/);
    assert.match(explorerSrc, /if \(!isGaseousOrStar\)/);
    assert.match(explorerSrc, /createSolarSurfaceMaterial/);
  });

  it('exports GLSL atmosphere and solar shader helpers in cosmicSceneUtils.ts', () => {
    const utilsSrc = readText('apps/web/src/components/dashboard/views/spatial/celestial/cosmicSceneUtils.ts');
    assert.match(utilsSrc, /export function createAtmosphericRimMaterial/);
    assert.match(utilsSrc, /export function createSolarSurfaceMaterial/);
    assert.match(utilsSrc, /export function createSolarCoronaMaterial/);
  });
});

