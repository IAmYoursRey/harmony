export const isFiniteWeatherNumber = value => typeof value === 'number' && Number.isFinite(value);

export function validateProviderCurrent(current) {
  const keys = ['temperature_2m', 'apparent_temperature', 'relative_humidity_2m', 'surface_pressure', 'wind_speed_10m', 'wind_direction_10m', 'precipitation', 'weather_code'];
  if (!current || !keys.every(key => isFiniteWeatherNumber(current[key])) || !isFiniteWeatherNumber(current.time) || !isFiniteWeatherNumber(current.interval) || current.interval <= 0) return false;
  if (!Number.isFinite(new Date(current.time * 1000).getTime()) || Math.abs(Date.now() / 1000 - current.time) > 10800) return false;
  const validCodes = [0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99];
  return current.temperature_2m >= -100 && current.temperature_2m <= 70 && current.apparent_temperature >= -100 && current.apparent_temperature <= 100 &&
    validCodes.includes(current.weather_code) && current.relative_humidity_2m >= 0 && current.relative_humidity_2m <= 100 && current.surface_pressure > 0 && current.surface_pressure <= 1200 && current.wind_speed_10m >= 0 && current.wind_speed_10m <= 540 && current.precipitation >= 0 && current.wind_direction_10m >= 0 && current.wind_direction_10m <= 360;
}

export function buildAtmosphericDiagnostic(lat, current) {
  if (!isFiniteWeatherNumber(lat) || Math.abs(lat) > 90) {
    throw new Error('Lintang tidak valid.');
  }
  if (!current || typeof current !== 'object') {
    throw new Error('Blok cuaca saat ini tidak tersedia.');
  }
  const consensusTemp = current.consensusTemperature;
  if (!isFiniteWeatherNumber(consensusTemp) || consensusTemp <= -273.15 || consensusTemp > 70) {
    throw new Error('Suhu konsensus tidak valid.');
  }

  const coriolis = 2 * 7.2921e-5 * Math.sin(lat * Math.PI / 180) * 1e5;
  const hasPressure = isFiniteWeatherNumber(current.pressure) && current.pressure > 0 && current.pressure <= 1200;
  const airDensity = hasPressure
    ? current.pressure * 100 / (287.058 * (consensusTemp + 273.15))
    : null;

  const equationsStatus = [
    {
      id: 'coriolis',
      name: 'Parameter Coriolis',
      formula: 'f = 2 Ω sin(φ)',
      evaluatedValue: `${coriolis.toFixed(4)} × 10⁻⁵ s⁻¹`,
      status: 'VALID',
      note: 'Besaran turunan dari lintang; bukan penyelesaian medan angin 3D.',
    },
  ];

  if (airDensity !== null) {
    equationsStatus.push({
      id: 'ideal_gas',
      name: 'Estimasi kerapatan udara',
      formula: 'ρ = p / (R T)',
      evaluatedValue: `${airDensity.toFixed(3)} kg/m³`,
      status: 'VALID',
      note: 'Pendekatan gas ideal (gas kering) dari masukan model, bukan sensor lapangan.',
    });
  } else {
    equationsStatus.push({
      id: 'ideal_gas',
      name: 'Estimasi kerapatan udara',
      formula: 'ρ = p / (R T)',
      evaluatedValue: 'Belum dapat dihitung',
      status: 'WARNING',
      note: 'Tekanan permukaan tidak tersedia untuk menghitung kerapatan udara.',
    });
  }

  equationsStatus.push({
    id: 'nwp_unavailable',
    name: 'Simulasi NWP dan CAPE',
    formula: 'Memerlukan medan atmosfer 3D dan profil vertikal',
    evaluatedValue: 'Belum dihitung',
    status: 'WARNING',
    note: 'Tidak ada solver NWP 3D atau pengujian akurasi terhadap pengamatan di jalur ini.',
  });

  return {
    isAiVerified: false,
    verifiedTemperature: consensusTemp,
    apparentTemperature: isFiniteWeatherNumber(current.apparentTemperature) ? current.apparentTemperature : consensusTemp,
    calibratedRainProb: isFiniteWeatherNumber(current.precipitationProb) && current.precipitationProb >= 0 && current.precipitationProb <= 100 ? current.precipitationProb : null,
    rainIntensityMmH: isFiniteWeatherNumber(current.precipitation) && current.precipitation >= 0 ? current.precipitation : 0,
    airDensityKgM3: airDensity !== null ? Number(airDensity.toFixed(3)) : null,
    coriolisParamF: Number(coriolis.toFixed(4)),
    convectiveStability: 'Belum dinilai',
    equationsStatus,
    scientificBriefing: airDensity !== null
      ? 'Perhitungan lokal hanya memberikan parameter Coriolis dan estimasi kerapatan udara. AI eksternal belum digunakan. Nilai prakiraan asli dipertahankan; akurasi belum diukur.'
      : 'Perhitungan parsial lokal: parameter Coriolis dihitung; estimasi kerapatan udara memerlukan tekanan permukaan. AI eksternal belum digunakan. Nilai prakiraan asli dipertahankan; akurasi belum diukur.',
    modelName: 'Diagnostik atmosfer lokal (bukan solver NWP)',
    verifiedAt: new Date().toISOString(),
  };
}
