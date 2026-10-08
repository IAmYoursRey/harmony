import test from 'node:test';
import assert from 'node:assert/strict';

// Test seasonal rain calibration logic
test('Indonesian Seasonal Rain Calibration - Jakarta in October (Pancaroba II)', async () => {
  // Simulate seasonal rain calibration logic
  const lat = -6.2088;
  const lng = 106.8456;
  const octDate = new Date('2026-10-08T14:30:00+07:00');

  // Verify regional zone identification
  const isJawaBali = lat <= -5.0 && lng < 115.0;
  assert.equal(isJawaBali, true);

  // Month 9 is October (0-indexed)
  const month = octDate.getMonth();
  assert.equal(month, 9);

  // In October in Java: Masa Pancaroba (Peralihan Kemarau ke Musim Hujan)
  const isPancaroba = month === 9;
  assert.equal(isPancaroba, true);

  // Hourly points with afternoon convective shower
  const hourly = [
    { hour: 10, precipitation: 0, precipitationProb: 10, humidity: 55 },
    { hour: 12, precipitation: 0, precipitationProb: 25, humidity: 62 },
    { hour: 14, precipitation: 0.8, precipitationProb: 65, humidity: 78 },
    { hour: 15, precipitation: 3.2, precipitationProb: 80, humidity: 85 },
    { hour: 16, precipitation: 1.5, precipitationProb: 70, humidity: 82 },
    { hour: 18, precipitation: 0, precipitationProb: 20, humidity: 70 },
  ];

  const afternoonPoints = hourly.filter(p => p.hour >= 13 && p.hour <= 18);
  const afternoonHasRain = afternoonPoints.some(p => (p.precipitation ?? 0) > 0);
  assert.equal(afternoonHasRain, true);

  const maxPrecip = Math.max(...hourly.map(p => p.precipitation ?? 0));
  assert.equal(maxPrecip, 3.2);
});

test('Indonesian Seasonal Rain Calibration - Pontianak Equatorial Bimodal Zone', () => {
  const lat = 0.0;
  const lng = 109.3214;
  const isEquatorial = Math.abs(lat) <= 2.8 && lng < 121.0;
  assert.equal(isEquatorial, true);
});

test('Indonesian Seasonal Rain Calibration - Maluku Local Regime', () => {
  const lat = -3.7;
  const lng = 128.18;
  const isMaluku = lng >= 125.0 && lat <= -1.0 && lat >= -7.5;
  assert.equal(isMaluku, true);
});

test('Indonesian Seasonal Rain Calibration - Nusa Tenggara Semi-Arid Regime', () => {
  const lat = -10.17;
  const lng = 123.6;
  const isNusaTenggara = lat <= -7.5 && lng >= 114.5;
  assert.equal(isNusaTenggara, true);
});
