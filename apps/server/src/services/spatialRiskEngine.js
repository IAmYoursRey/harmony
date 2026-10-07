/**
 * Harmony Spatial Risk Reasoning & Synthesis Engine
 * 
 * Mengubah data spasial mentah (BMKG, PVMBG, DEM, Cuaca) menjadi analisis
 * sintesis risiko deterministik terpadu untuk tapak sekolah.
 */

// Kecepatan gelombang seismik rata-rata di kerak bumi Indonesia (km/s)
const VP_KM_S = 6.0;  // Gelombang Primer (P-Wave)
const VS_KM_S = 3.5;  // Gelombang Sekunder / Geser Destruktif (S-Wave)
const TELEMETRY_LATENCY_SEC = 2.5; // Latensi transmisi sensor BMKG InaTEWS

/**
 * Menghitung jarak hiposentral dan episentral menggunakan rumus Haversine
 */
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Menghitung Ground Motion Prediction Equations (GMPE)
 * Menghasilkan Peak Ground Acceleration (PGA) dalam satuan g dan estimasi skala MMI
 */
export function calculateGroundMotion(magnitude, depthKm, distanceKm, vs30 = 280) {
  const m = Math.max(1, Number(magnitude) || 5.0);
  const h = Math.max(2, Number(depthKm) || 10);
  const rEpi = Math.max(0.5, Number(distanceKm) || 10);
  const rHyp = Math.sqrt(rEpi * rEpi + h * h);

  // Model Attenuasi Empiris Gempa Kerak Dangkal Indonesia
  const pgaBedrock = (Math.pow(10, 0.24 * m - 1.36)) / Math.pow(rHyp + 17, 0.88);
  
  // Amplifikasi tapak tanah lokal (Vs30 terhadap batuan standar 760 m/s)
  const soilAmplification = Math.pow(760 / Math.max(120, vs30), 0.35);
  const pgaSite = Math.min(2.5, Math.max(0.001, pgaBedrock * soilAmplification));

  // Konversi PGA ke Skala Intensitas MMI (Wald / Worden relation)
  // PGA dalam cm/s^2 (gal): 1g ~ 980.665 cm/s^2
  const pgaGal = pgaSite * 980.665;
  let mmi = 1.0;
  if (pgaGal <= 1.0) {
    mmi = 1.0;
  } else if (pgaGal <= 3.0) {
    mmi = 2.0;
  } else if (pgaGal <= 8.0) {
    mmi = 3.0;
  } else if (pgaGal <= 25.0) {
    mmi = 4.0;
  } else if (pgaGal <= 60.0) {
    mmi = 5.0;
  } else if (pgaGal <= 150.0) {
    mmi = 6.0;
  } else if (pgaGal <= 300.0) {
    mmi = 7.0;
  } else if (pgaGal <= 650.0) {
    mmi = 8.0;
  } else if (pgaGal <= 1200.0) {
    mmi = 9.0;
  } else {
    mmi = 10.0;
  }

  // Kalkulasi Waktu Tiba Gelombang dan Peringatan Dini (Lead Time)
  const pWaveArrivalSec = rHyp / VP_KM_S;
  const sWaveArrivalSec = rHyp / VS_KM_S;
  // Lead time dihitung dari kedatangan P di sensor terdekat hingga tibanya S di sekolah
  const leadTimeSec = Math.max(0, Math.round(sWaveArrivalSec - TELEMETRY_LATENCY_SEC));

  // Deskripsi bahasa manusiawi untuk pengguna awam
  let humanIntensity = "Guncangan Lemah / Nyaris Tak Terasa";
  let physicalImpact = "Tidak ada bahaya kerusakan struktural. Aktivitas belajar mengajar normal.";
  let actionCommand = "Tetap tenang dan perhatikan informasi resmi.";
  let safetyLevel = "SAFE";

  if (mmi >= 7) {
    humanIntensity = "Guncangan Sangat Kuat & Merusak (MMI VII+)";
    physicalImpact = "Barang-barang jatuh dari dinding/rak, plester dinding retak, perabot berat bergeser. Berbahaya jika berada di bawah kaca/lampu gantung.";
    actionCommand = "JANGAN lari berebut ke tangga saat gempa berlangsung! Lakukan DROP-COVER-HOLD ON di bawah meja beton kelas sampai guncangan mereda.";
    safetyLevel = "DANGER";
  } else if (mmi >= 5) {
    humanIntensity = "Guncangan Sedang (MMI V - VI)";
    physicalImpact = "Pintu berderak, cairan dalam wadah tumpah, orang berjalan terhuyung. Benda ringan dapat bergeser.";
    actionCommand = "Lindungi kepala dengan tas sekolah atau tangan, jauhi jendela kaca, bersiap menuju titik kumpul jika guru memberi aba-aba.";
    safetyLevel = "WARNING";
  } else if (mmi >= 3) {
    humanIntensity = "Guncangan Ringan (MMI III - IV)";
    physicalImpact = "Getaran dirasakan seperti truk berat melintas. Lampu gantung bergoyang perlahan.";
    actionCommand = "Tetap waspada, hentikan sementara eksperimen lab atau aktivitas bertangga.";
    safetyLevel = "NOTICE";
  }

  return {
    hypocentralDistanceKm: Math.round(rHyp * 10) / 10,
    pgaG: parseFloat(pgaSite.toFixed(3)),
    mmiEstimate: mmi,
    pWaveArrivalSec: parseFloat(pWaveArrivalSec.toFixed(1)),
    sWaveArrivalSec: parseFloat(sWaveArrivalSec.toFixed(1)),
    leadTimeSec,
    humanDescription: {
      intensity: humanIntensity,
      impact: physicalImpact,
      actionRule: actionCommand,
      safetyLevel,
    },
  };
}

/**
 * Evaluasi Risiko Topografi & Kejenuhan Hujan (Slope vs Rain Matrix)
 */
export function evaluateSlopeRainHazard(elevationM = 20, slopeDegrees = 5, rain24hMm = 10) {
  let slopeCategory = "Datar (< 8°)";
  let landslideRisk = "RENDAH";
  let humanWarning = "Topografi tapak stabil. Tidak ada risiko pergerakan tanah di sekitar sekolah.";

  if (slopeDegrees > 30) {
    slopeCategory = "Sangat Curam (> 30°)";
    if (rain24hMm > 70) {
      landslideRisk = "TINGGI";
      humanWarning = "Lereng curam di dekat sekolah telah jenuh air hujan. Risiko longsor tinggi pada jalur tebing!";
    } else {
      landslideRisk = "SEDANG";
      humanWarning = "Lereng curam alami. Waspadai longsoran batu lepas jika terjadi getaran gempa.";
    }
  } else if (slopeDegrees > 15) {
    slopeCategory = "Agak Curam (15° - 30°)";
    if (rain24hMm > 100) {
      landslideRisk = "SEDANG";
      humanWarning = "Akumulasi hujan lebat meningkatkan kejenuhan tanah pada lereng pembatas sekolah.";
    }
  }

  return {
    elevationM,
    slopeDegrees,
    slopeCategory,
    landslideRisk,
    humanWarning,
  };
}

/**
 * Sintesis Risiko Multi-Hazard Terpadu untuk Sekolah
 */
export function synthesizeSchoolRisk({ school, earthquakes = [], volcanoes = [], weather = {} }) {
  const sLat = school.lat ?? school.latitude ?? -6.2;
  const sLng = school.lng ?? school.longitude ?? 106.8;

  // 1. Analisis Gempa Terdekat
  let dominantEarthquake = null;
  let minQuakeDist = Infinity;
  let worstGroundMotion = null;

  earthquakes.forEach((eq) => {
    const qLat = eq.lat ?? eq.latitude;
    const qLng = eq.lng ?? eq.longitude;
    if (qLat !== undefined && qLng !== undefined) {
      const dist = haversineDistanceKm(sLat, sLng, qLat, qLng);
      const mag = parseFloat(eq.magnitude ?? eq.mag ?? 5.0);
      const depth = parseFloat(eq.depth ?? eq.depthKm ?? 10.0);
      const gm = calculateGroundMotion(mag, depth, dist);

      if (dist < minQuakeDist || (worstGroundMotion && gm.pgaG > worstGroundMotion.pgaG)) {
        minQuakeDist = dist;
        dominantEarthquake = {
          ...eq,
          distanceKm: Math.round(dist * 10) / 10,
        };
        worstGroundMotion = gm;
      }
    }
  });

  // 2. Analisis Gunung Api Terdekat
  let nearestVolcano = null;
  let minVolcanoDist = Infinity;

  volcanoes.forEach((v) => {
    const vLat = v.lat ?? v.latitude;
    const vLng = v.lng ?? v.longitude;
    if (vLat !== undefined && vLng !== undefined) {
      const dist = haversineDistanceKm(sLat, sLng, vLat, vLng);
      if (dist < minVolcanoDist) {
        minVolcanoDist = dist;
        nearestVolcano = {
          ...v,
          distanceKm: Math.round(dist * 10) / 10,
        };
      }
    }
  });

  // 3. Analisis Cuaca & Hujan
  const rain24h = weather.precipitation ?? weather.rain ?? 0;
  const topoSlope = school.slopeDegrees ?? 6;
  const elevation = school.elevationM ?? 25;
  const slopeHazard = evaluateSlopeRainHazard(elevation, topoSlope, rain24h);

  // 4. Penentuan Status Keseluruhan
  let overallStatus = "AMAN";
  let overallColor = "emerald";
  let immediateAction = "Lakukan kegiatan belajar rutin. Jadwalkan simulasi mandiri 1x sebulan.";

  if (worstGroundMotion && worstGroundMotion.humanDescription.safetyLevel === "DANGER") {
    overallStatus = "BAHAYA GEMPA";
    overallColor = "rose";
    immediateAction = worstGroundMotion.humanDescription.actionRule;
  } else if (nearestVolcano && minVolcanoDist < 15 && nearestVolcano.status && nearestVolcano.status !== "Normal") {
    overallStatus = "WASPADA GUNUNG API";
    overallColor = "amber";
    immediateAction = `Gunung ${nearestVolcano.name} berjarak ${minVolcanoDist} km (${nearestVolcano.status}). Siapkan masker dan pelindung mata dari abu vulkanik.`;
  } else if (slopeHazard.landslideRisk === "TINGGI") {
    overallStatus = "WASPADA LONGSOR";
    overallColor = "amber";
    immediateAction = slopeHazard.humanWarning;
  }

  return {
    schoolId: school.id,
    schoolName: school.name,
    coordinates: { lat: sLat, lng: sLng },
    overallStatus,
    overallColor,
    immediateAction,
    seismicSynthesis: worstGroundMotion ? {
      sourceQuake: dominantEarthquake,
      ...worstGroundMotion,
    } : null,
    volcanicSynthesis: nearestVolcano ? {
      volcanoName: nearestVolcano.name,
      distanceKm: minVolcanoDist,
      status: nearestVolcano.status || "Normal",
      elevationM: nearestVolcano.height || 0,
      radiusKawasanRawanBencanaKm: minVolcanoDist < 10 ? "KRB III (Sangat Rawan)" : minVolcanoDist < 20 ? "KRB II (Rawan Aliran Lahar)" : "KRB I (Abu Vulkanik Ringan)",
    } : null,
    terrainSynthesis: slopeHazard,
    generatedAt: new Date().toISOString(),
  };
}
