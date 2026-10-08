import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Traffic Signals Service - Real-world Authority & Maintenance Metadata', async () => {
  const serviceFile = path.resolve(process.cwd(), 'apps/web/src/services/trafficSignalsService.ts');
  const content = fs.readFileSync(serviceFile, 'utf-8');

  // Verify interface contains authority, maintenance, and delay metadata
  assert.ok(content.includes('authoritySource: string'), 'Must include authoritySource in interface');
  assert.ok(content.includes('statusLabel: string'), 'Must include statusLabel in interface');
  assert.ok(content.includes('maintenanceNote: string'), 'Must include maintenanceNote in interface');
  assert.ok(content.includes('updatedBy: string'), 'Must include updatedBy in interface');
  assert.ok(content.includes('telemetryDelaySec: number'), 'Must include telemetryDelaySec in interface');
  assert.ok(content.includes('isUnderRepair: boolean'), 'Must include isUnderRepair in interface');

  // Verify Dishub authorities exist
  assert.ok(content.includes('Dinas Perhubungan Provinsi DKI Jakarta'), 'Must include Dishub DKI Jakarta');
  assert.ok(content.includes('Dinas Perhubungan Kota Surabaya'), 'Must include Dishub Surabaya');
  assert.ok(content.includes('Dinas Perhubungan Kota Bandung'), 'Must include Dishub Bandung');
});

test('MapsView - Positioning & Vehicle Particle Removal Integrity', () => {
  const mapsViewFile = path.resolve(process.cwd(), 'apps/web/src/components/dashboard/views/spatial/MapsView.tsx');
  const content = fs.readFileSync(mapsViewFile, 'utf-8');

  // 1. Synthetic vehicle particle engine and layer must be completely removed
  assert.ok(!content.includes('import { trafficVehicleEngine }'), 'Must not import trafficVehicleEngine');
  assert.ok(!content.includes('trafficVehiclesLayerRef'), 'Must not declare trafficVehiclesLayerRef');
  assert.ok(!content.includes("feature.get('isVehicle')"), 'Must not handle isVehicle in popup');
  assert.ok(!content.includes('Kendaraan ON'), 'Must not have fake Kendaraan ON/OFF toggle');

  // 2. Traffic controls are docked in unified bottom navigation center
  assert.ok(
    content.includes('setShowTrafficControlBar'),
    'Must handle traffic control bar visibility'
  );
  assert.ok(
    content.includes('key="google-maps-traffic-bar"'),
    'Must render Google Maps style traffic control bar'
  );

  // 3. Active floating traffic control panel is sized cleanly (w-[92vw] sm:w-[460px])
  assert.ok(
    content.includes('w-[92vw] sm:w-[460px] max-w-[460px]'),
    'Active traffic panel must have clean responsive max-width'
  );
});
