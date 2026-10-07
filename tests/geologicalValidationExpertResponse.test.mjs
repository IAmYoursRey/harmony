import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import path from 'node:path';
import fs from 'node:fs';

const tmpOut = path.resolve('tests/.tmp_geo_test.mjs');

await build({
  stdin: {
    contents: `
      export { MASTER_SENSOR_TAXONOMY, GLOBAL_EARTH_SENSOR_NETWORK } from '@/services/earthSensorRegistry.ts';
      export { dataFusionAndUncertaintyEngine } from '@/services/dataFusionAndUncertaintyEngine.ts';
      export { routingService } from '@/services/routingService.ts';
      export { LANDSLIDE_SUSCEPTIBILITY_ZONES, TSUNAMI_HAZARD_ZONES } from '@/components/dashboard/views/spatial/DisasterRiskCenterModal.tsx';
    `,
    resolveDir: process.cwd(),
    loader: 'ts'
  },
  bundle: true,
  outfile: tmpOut,
  format: 'esm',
  platform: 'node',
  define: { 'import.meta.env': '{}' },
  alias: { '@': './apps/web/src' },
  external: ['react', 'react-dom', 'framer-motion', 'lucide-react', 'ol', 'ol/*']
});

const m = await import(`./.tmp_geo_test.mjs?t=${Date.now()}`);

test.after(() => {
  try {
    if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
  } catch (e) {}
});

test('Validator Ahli Item A2: GNSS Geodetik Physical Variables & Tectonic Deformation', () => {
  const gnssTaxonomy = m.MASTER_SENSOR_TAXONOMY.find((t) => t.id === 12);
  assert.ok(gnssTaxonomy, 'GNSS Geodetik taxonomy category (id: 12) must exist');

  const variablesStr = gnssTaxonomy.measuredPhysicalVariables.join(' ');

  // Indicator A2 requirements:
  // - Vektor pergeseran tektonik (3D displacement vector [dN, dE, dU])
  // - Laju deformasi lempeng (plate deformation rate mm/yr)
  // - Akumulasi regangan (strain accumulation tensor)
  assert.match(variablesStr, /Vektor Pergeseran Tektonik/i, 'Must contain Vektor Pergeseran Tektonik');
  assert.match(variablesStr, /Laju Deformasi Lempeng/i, 'Must contain Laju Deformasi Lempeng');
  assert.match(variablesStr, /Akumulasi Regangan Tektonik/i, 'Must contain Akumulasi Regangan Tektonik');

  // Verify GNSS stations have tectonic telemetry
  const csby = m.GLOBAL_EARTH_SENSOR_NETWORK.find((s) => s.id === 'gnss_csby_surabaya');
  assert.ok(csby, 'GNSS CSBY Surabaya station must exist');
  assert.match(csby.primaryMeasurement, /Vektor Pergeseran Tektonik/i, 'Primary measurement must measure tectonic vector');
  assert.match(csby.description, /deformasi lempeng/i, 'Description must detail plate deformation');
  assert.equal(csby.unit, 'mm/tahun', 'GNSS plate deformation unit must be mm/tahun');
});

test('Validator Ahli Item A3: Gravimetri Bumi & Subsurface Magma Dynamics', () => {
  const gravTaxonomy = m.MASTER_SENSOR_TAXONOMY.find((t) => t.id === 13);
  assert.ok(gravTaxonomy, 'Gravimetri Bumi taxonomy category (id: 13) must exist');

  const variablesStr = gravTaxonomy.measuredPhysicalVariables.join(' ');

  // Indicator A3 requirements:
  // - Anomali massa (Bouguer / Free-air gravity anomaly)
  // - Redistribusi massa air tanah (groundwater mass redistribution)
  // - Dinamika magma subsurface (subsurface magma intrusion dynamics & chamber volume)
  assert.match(variablesStr, /Anomali Gaya Berat Bouguer/i, 'Must contain Anomali Gaya Berat Bouguer');
  assert.match(variablesStr, /Redistribusi Massa Air Tanah/i, 'Must contain Redistribusi Massa Air Tanah');
  assert.match(variablesStr, /Dinamika Intrusi Magma Bawah Permukaan/i, 'Must contain Dinamika Magma Subsurface');

  // Verify ground microgravity monitoring station (Merapi BPPTKG)
  const merapi = m.GLOBAL_EARTH_SENSOR_NETWORK.find((s) => s.id === 'grav_merapi_bpptkg');
  assert.ok(merapi, 'Ground microgravimetry station at Merapi BPPTKG must exist');
  assert.equal(merapi.family, 'GEODESY_GNSS_GRAVITY');
  assert.match(merapi.name, /Gunung Merapi/i, 'Must monitor Mount Merapi');
  assert.match(merapi.primaryMeasurement, /Mikrogravimetri|Magma/i, 'Must measure microgravity or magma dynamics');
});

test('Validator Ahli Item B1: Data Fusion Engine for Secondary Geological Disaster Triggers', () => {
  // Signature: calculateTerrainImpacts(rainfallMm, elevationM, windKmh, tempC, humidity)
  // Test with heavy rainfall (95 mm/24h) on mountain slope (600 mdpl): should exceed Caine threshold (50 mm)
  const extremeImpact = m.dataFusionAndUncertaintyEngine.calculateTerrainImpacts(
    95, // 95 mm/24h heavy tropical rainfall
    600, // 600 mdpl mountain elevation
    25, // wind
    26, // temp
    85 // humidity
  );

  assert.ok(extremeImpact.secondaryGeologicalDisaster, 'Must contain secondaryGeologicalDisaster metrics');
  const sec = extremeImpact.secondaryGeologicalDisaster;
  assert.ok(sec.rainfallIntensityRatio > 1.0, 'Rainfall intensity ratio must be > 1.0');
  assert.equal(sec.landslideTriggerStatus, 'TERLAMPAUI_AWAS', 'Must flag trigger threshold exceeded');
  assert.ok(sec.laharFlowHazardIndex > 50, 'Lahar or flash flood hazard index must be elevated');
  assert.ok(sec.geologicalScientificBasis.includes('Caine'), 'Must cite scientific threshold basis');

  // Test with light rainfall (10 mm) on flat terrain (15 mdpl): should remain safe
  const mildImpact = m.dataFusionAndUncertaintyEngine.calculateTerrainImpacts(
    10, // 10 mm rainfall
    15, // 15 mdpl flat
    10,
    30,
    60
  );
  assert.equal(mildImpact.secondaryGeologicalDisaster.landslideTriggerStatus, 'AMAN');
});

test('Validator Ahli Item B3: Infrastructure Integration & Mass Geological Emergency Evacuation', async () => {
  // Test Tsunami Megathrust Evacuation Scenario
  const originSchool = { lat: -7.698, lng: 108.652, label: 'SMK Negeri 1 Pangandaran (Pesisir)' };
  const tsunamiEvac = await m.routingService.calculateEmergencyEvacuationRoute(originSchool, 'TSUNAMI_MEGATHRUST');

  assert.ok(tsunamiEvac.evacuationPlan, 'Must generate an EmergencyEvacuationPlan');
  const plan = tsunamiEvac.evacuationPlan;
  assert.equal(plan.disasterScenario, 'TSUNAMI_MEGATHRUST');
  assert.ok(plan.walkDurationMin > 0, 'Walk duration must be calculated');
  assert.ok(plan.vehicleDurationMin > 0, 'Vehicle duration must be calculated');
  assert.ok(plan.safeAssemblyPoint.elevationM >= 25, 'Tsunami safe point must be on high ground >= 25 mdpl');
  assert.ok(plan.hazardAvoidanceRecommendations.length >= 2, 'Must have hazard avoidance recommendations');

  // Test Gempa Masif Evacuation Scenario
  const quakeSchool = { lat: -6.821, lng: 107.142, label: 'SMP Negeri 1 Cianjur' };
  const quakeEvac = await m.routingService.calculateEmergencyEvacuationRoute(quakeSchool, 'GEMPA_MASIF');
  assert.equal(quakeEvac.evacuationPlan.disasterScenario, 'GEMPA_MASIF');
  assert.ok(quakeEvac.evacuationPlan.safeAssemblyPoint.name.includes('Lapangan Terbuka') || quakeEvac.evacuationPlan.safeAssemblyPoint.name.includes('Stadion'));
});

test('Validator Ahli Item D: Hazard Susceptibility Zones & School Resilience Catalog', () => {
  // Verify Landslide Susceptibility Zones
  assert.ok(m.LANDSLIDE_SUSCEPTIBILITY_ZONES.length >= 4, 'Must have at least 4 representative high-risk landslide zones');
  const cianjur = m.LANDSLIDE_SUSCEPTIBILITY_ZONES.find((z) => z.id === 'ls_cianjur_puncak');
  assert.ok(cianjur, 'Cianjur-Puncak landslide zone must exist');
  assert.equal(cianjur.riskLevel, 'SANGAT_TINGGI');
  assert.ok(cianjur.affectedSchoolsSample.length > 0, 'Must identify sample affected schools for Sekolah Tangguh Bencana');

  // Verify Tsunami Hazard Zones
  assert.ok(m.TSUNAMI_HAZARD_ZONES.length >= 4, 'Must have at least 4 tsunami coastal inundation zones');
  const pangandaran = m.TSUNAMI_HAZARD_ZONES.find((z) => z.id === 'tsu_pangandaran_cilacap');
  assert.ok(pangandaran, 'Pangandaran-Cilacap tsunami zone must exist');
  assert.ok(pangandaran.estimatedArrivalTimeMin <= 25, 'Pangandaran golden time must be <= 25 min');
});
