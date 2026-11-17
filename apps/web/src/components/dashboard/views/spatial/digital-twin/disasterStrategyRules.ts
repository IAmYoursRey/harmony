export type DisasterStrategyKey =
  | "EARTHQUAKE"
  | "TSUNAMI_FLOOD"
  | "FIRE_CHEM"
  | "STORM_WIND"
  | "LANDSLIDE"
  | "MULTI_CRISIS";

export interface DisasterPhaseDefinition {
  phaseId: string;
  name: string;
  durationSec: number; // Duration of this phase in seconds (0 = runs until completion)
  warningText: string;
  instructionText: string;
  isSevereShaking?: boolean;
  requiresCover?: boolean;
  isTsunamiWaveArrival?: boolean;
  inundatesGroundFloor?: boolean;
  ambientShakeIntensity?: number;
  ambientDarkness?: number;
}

export interface ActiveDisasterPhaseState {
  phaseId: string;
  name: string;
  phaseIndex: number;
  totalPhases: number;
  elapsedInPhaseSec: number;
  remainingInPhaseSec: number;
  warningText: string;
  instructionText: string;
  isSevereShaking: boolean;
  requiresCover: boolean;
  isTsunamiWaveArrival: boolean;
  inundatesGroundFloor: boolean;
  waveEtaSec: number;
  ambientShakeIntensity: number;
  ambientDarkness: number;
}

export interface DisasterStrategyProfile {
  key: DisasterStrategyKey;
  label: string;
  headlineTarget: string;
  briefingWarning: string;
  indoorDangerWarning: string;
  wrongExitWarning: string;
  winTitle: string;
  winTakeaway: string;
  indoorDpsPerSec: number;
  allowIndoorDoorJam: boolean;
  goalTypes: Array<"EXIT" | "HIGH_GROUND" | "SHELTER_SAFE" | "SAFE_ASSEMBLY_GOAL">;
  phases: DisasterPhaseDefinition[];
}

const STRATEGIES: Record<DisasterStrategyKey, DisasterStrategyProfile> = {
  EARTHQUAKE: {
    key: "EARTHQUAKE",
    label: "Gempa Bumi Tektonik",
    headlineTarget: "Ke Lapangan Upacara (Area Terbuka Jauh Dari Bangunan)",
    briefingWarning:
      "Di dalam kelas rawan tertimpa plafon/lemari & pintu bisa macet; jalan raya depan gerbang rawan kabel putus dan tembok pagar roboh. Saat guncangan hebat: tunduk di bawah meja (Drop, Cover, Hold On). Saat guncangan reda: segera keluar ke tengah Lapangan Upacara!",
    indoorDangerWarning:
      "BAHAYA DI DALAM RUANGAN! Plafon & kaca jendela rawan jatuh saat gempa — lindungi kepala dan segera keluar saat guncangan mereda!",
    wrongExitWarning:
      "JALAN LUAR TIDAK AMAN SAAT GEMPA! Tiang listrik & pagar jalan rawan roboh — menuju tengah Lapangan Upacara!",
    winTitle: "SELAMAT DI TITIK KUMPUL TERBUKA",
    winTakeaway:
      "Tepat! Saat gempa, lindungi kepala di bawah meja selama guncangan utama, lalu manfaatkan waktu emas untuk evakuasi ke area terbuka yang jauh dari gedung.",
    indoorDpsPerSec: 6.5,
    allowIndoorDoorJam: true,
    goalTypes: ["SAFE_ASSEMBLY_GOAL"],
    phases: [
      {
        phaseId: "EARTHQUAKE_P_WAVE",
        name: "Peringatan Dini (P-Wave)",
        durationSec: 6,
        warningText: "GEMPA BUMI TERDETEKSI! Sirene peringatan dini berbunyi — bersiap mencari perlindungan!",
        instructionText: "Jauhi jendela kaca dan bersiap Drop, Cover & Hold On di bawah meja.",
        ambientShakeIntensity: 0.22,
      },
      {
        phaseId: "EARTHQUAKE_SEVERE_SHAKING",
        name: "Guncangan Utama (S-Wave)",
        durationSec: 20,
        warningText: "GUNCANGAN HEBAT BERLANGSUNG! Dilarang lari di koridor/tangga — Rawan tertimpa plafon & reruntuhan!",
        instructionText: "DROP, COVER, HOLD ON! Tekan tombol LINDUNGI / C untuk menunduk di bawah meja!",
        isSevereShaking: true,
        requiresCover: true,
        ambientShakeIntensity: 0.85,
      },
      {
        phaseId: "EARTHQUAKE_GOLDEN_WINDOW",
        name: "Waktu Emas Evakuasi",
        durationSec: 60,
        warningText: "Guncangan utama telah reda! Struktur dinding telah retak — segera keluar sebelum gempa susulan.",
        instructionText: "WAKTU EMAS EVAKUASI! Berjalan cepat lindungi kepala menuju Lapangan Upacara!",
        ambientShakeIntensity: 0.05,
      },
      {
        phaseId: "EARTHQUAKE_AFTERSHOCKS",
        name: "Gempa Susulan & Keruntuhan",
        durationSec: 0,
        warningText: "GEMPA SUSULAN TIBA! Struktur rapuh mulai roboh beruntun — tetap di tengah Lapangan Upacara!",
        instructionText: "Tetap di area terbuka Lapangan Upacara yang jauh dari dinding & tiang listrik!",
        ambientShakeIntensity: 0.45,
      },
    ],
  },
  TSUNAMI_FLOOD: {
    key: "TSUNAMI_FLOOD",
    label: "Tsunami & Banjir Bandang",
    headlineTarget: "Naik ke Titik Tinggi / Tangga Lantai 2 (Jangan Keluar Gerbang Rendah!)",
    briefingWarning:
      "Air laut surut cepat disusul gelombang pasang dahsyat yang menyapu lantai dasar & jalan raya! Evakuasi horizontal di jalan rendah MEMATIKAN. Lakukan Evakuasi Vertikal: segera naik ke Lantai 2 / Titik Tinggi sebelum gelombang tiba!",
    indoorDangerWarning:
      "AWAS AIR PASANG TSUNAMI! Ruangan lantai bawah cepat terendam air bah — segera naik ke Lantai 2!",
    wrongExitWarning:
      "GERBANG JALAN TERENDAM ARUS MEMATIKAN! Dilarang keluar ke jalan rendah — segera naik Tangga ke Lantai 2!",
    winTitle: "SELAMAT DI DATARAN / LANTAI TINGGI",
    winTakeaway:
      "Benar! Menghadapi tsunami atau banjir bandang, evakuasi vertikal ke Lantai 2 menyelamatkan Anda dari hempasan air bah yang menyapu lantai dasar.",
    indoorDpsPerSec: 7.5,
    allowIndoorDoorJam: true,
    goalTypes: ["HIGH_GROUND"],
    phases: [
      {
        phaseId: "TSUNAMI_EARLY_WARNING",
        name: "Peringatan Dini Tsunami (ETA)",
        durationSec: 55,
        warningText: "PERINGATAN DINI TSUNAMI! Air laut surut drastis — Gelombang tsunami akan menghempas daratan!",
        instructionText: "EVAKUASI VERTIKAL! Naik ke Tangga Lantai 2 sekarang sebelum gelombang tiba!",
      },
      {
        phaseId: "TSUNAMI_WAVE_INUNDATION",
        name: "Gelombang Tsunami Menerjang Lantai Dasar",
        durationSec: 0,
        warningText: "GELOMBANG TSUNAMI MENERJANG LANTAI 1 & HALAMAN! Lantai dasar tenggelam arus deras!",
        instructionText: "BERTAHAN DI LANTAI 2 / TITIK TINGGI! Siapa pun di lantai dasar akan tersapu air bah.",
        isTsunamiWaveArrival: true,
        inundatesGroundFloor: true,
      },
    ],
  },
  FIRE_CHEM: {
    key: "FIRE_CHEM",
    label: "Kebakaran / Kebocoran Gas Kimia",
    headlineTarget: "Keluar Kampus via Gerbang Utama / Pintu Darurat Bebas Asap",
    briefingWarning:
      "Asap & uap beracun cepat memenuhi ruangan tertutup. Jangan memotong jalan lewat dalam ruang kelas — merangkak rendah di bawah lapisan asap dan gunakan rute darurat terbuka menuju Gerbang Aman!",
    indoorDangerWarning:
      "AWAS ASAP PEKAT DI DALAM RUANGAN! Oksigen menipis — jangan lewat dalam kelas, pakai koridor luar menuju pintu darurat!",
    wrongExitWarning:
      "Jalur keluar ini tertutup panas/gas! Putar lewat koridor berlawanan menuju Gerbang Darurat lain!",
    winTitle: "BERHASIL KELUAR DARI ZONA ASAP",
    winTakeaway:
      "Tepat! Saat kebakaran atau kebocoran kimia, bergerak rendah di bawah asap dan keluar menjauh dari bangunan ke arah yang aman.",
    indoorDpsPerSec: 8.5,
    allowIndoorDoorJam: true,
    goalTypes: ["EXIT"],
    phases: [
      {
        phaseId: "FIRE_INITIAL_SMOKE",
        name: "Penyebaran Asap Awal",
        durationSec: 15,
        warningText: "Asap panas mulai menyebar dari titik api ke koridor.",
        instructionText: "Kenali arah asap, keluar menuju pintu darurat / gerbang berlawanan arah asap!",
      },
      {
        phaseId: "FIRE_FLASHOVER_TOXIC",
        name: "Flashover & Asap Beracun Pekat",
        durationSec: 0,
        warningText: "ASAP BERACUN PEKAT MEMENUHI PLAFON! Oksigen ruangan menipis drastis!",
        instructionText: "Merangkak / tunduk rendah di bawah lapisan asap menuju pintu keluar bebas api!",
        ambientDarkness: 0.35,
      },
    ],
  },
  STORM_WIND: {
    key: "STORM_WIND",
    label: "Angin Puting Beliung & Badai",
    headlineTarget: "Masuk Shelter Beton Kokoh Tanpa Kaca (Hindari Pohon & Atap Seng!)",
    briefingWarning:
      "Berbeda dari gempa: area terbuka dan bawah pohon besar justru berbahaya karena dahan tumbang dan seng terbang! Cari Shelter Beton kokoh bebas kaca jendela besar.",
    indoorDangerWarning:
      "Waspada kaca jendela & atap seng luas (GOR)! Segera pindah ke Shelter Beton Aman tanpa kaca besar.",
    wrongExitWarning:
      "AREA LUAR BERBAHAYA SAAT PUTING BELIUNG! Dahan pohon & puing terbang mengancam — masuk ke Shelter Beton Aman!",
    winTitle: "TERLINDUNG DI SHELTER BETON AMAN",
    winTakeaway:
      "Adaptasi cerdas! Saat angin kencang/puting beliung, berlindung di struktur beton kokoh jauh dari pohon tinggi dan jendela kaca jauh lebih aman daripada lapangan terbuka.",
    indoorDpsPerSec: 2.2,
    allowIndoorDoorJam: false,
    goalTypes: ["SHELTER_SAFE"],
    phases: [
      {
        phaseId: "STORM_GALE_WARNING",
        name: "Peringatan Angin Kencang",
        durationSec: 10,
        warningText: "Kecepatan angin badai meningkat tajam — dahan pohon mulai bergoyang kencang.",
        instructionText: "Tinggalkan lapangan terbuka dan pepohonan, dekati Shelter Beton Aman.",
      },
      {
        phaseId: "STORM_VORTEX_TOUCHDOWN",
        name: "Badai Puting Beliung Menerjang",
        durationSec: 0,
        warningText: "BADAI PUTING BELIUNG MENERJANG! Puing seng dan ranting melayang kencang di luar!",
        instructionText: "BERLINDUNG DI DALAM SHELTER BETON! Dilarang berada di area lapangan terbuka.",
      },
    ],
  },
  LANDSLIDE: {
    key: "LANDSLIDE",
    label: "Tanah Longsor Tebing",
    headlineTarget: "Menjauh ke Zona Aman Sisi Utara / Gerbang Utara",
    briefingWarning:
      "Bangunan dan jalan di sisi tebing selatan/timur rawan tertimbun longsoran tanah. Segera tinggalkan ruangan dan lari menjauh ke zona terbuka stabil di sisi utara!",
    indoorDangerWarning:
      "DINDING RUANGAN RAWAN RETAK TERDORONG LONGSOR! Segera keluar menuju halaman utara terbuka!",
    wrongExitWarning:
      "Arah ini dekat lereng rawan longsor! Menjauh ke sisi utara kampus yang lebih stabil!",
    winTitle: "SELAMAT DI ZONA STABIL UTARA",
    winTakeaway:
      "Tepat! Menghindari bangunan di kaki lereng dan bergerak ke arah berlawanan menuju lapangan stabil utara mencegah tertimbun material longsor.",
    indoorDpsPerSec: 6.0,
    allowIndoorDoorJam: true,
    goalTypes: ["EXIT", "SAFE_ASSEMBLY_GOAL"],
    phases: [
      {
        phaseId: "LANDSLIDE_SLOPE_CRACK",
        name: "Pergeseran Tanah Lereng",
        durationSec: 10,
        warningText: "Gemuruh dari tebing selatan — retakan tanah mulai melebar.",
        instructionText: "Jauhi dinding dan lereng sisi selatan, bersiap lari ke sisi utara!",
      },
      {
        phaseId: "LANDSLIDE_MASS_MOVEMENT",
        name: "Material Longsor Menerjang Sisi Selatan",
        durationSec: 0,
        warningText: "LONGSORAN BATU & TANAH MEROBOHKAN BANGUNAN SELATAN!",
        instructionText: "Lari menjauh ke titik kumpul aman di halaman utara terbuka!",
      },
    ],
  },
  MULTI_CRISIS: {
    key: "MULTI_CRISIS",
    label: "Krisis Ganda / Evakuasi Darurat",
    headlineTarget: "Hindari Ruangan Tertutup → Capai Gerbang Aman / Titik Evakuasi",
    briefingWarning:
      "Guncangan susulan, asap api, dan kegelapan terjadi bersamaan. Ruangan kelas sangat berbahaya — gunakan koridor terbuka dan rambu jalur darurat untuk mencapai Gerbang Aman!",
    indoorDangerWarning:
      "BAHAYA GANDA DI DALAM RUANG! Plafon retak & asap — keluar ke koridor luar secepat mungkin!",
    wrongExitWarning:
      "Jalur keluar terhambat! Cek rambu jalur darurat terdekat untuk rute alternatif aman.",
    winTitle: "BERHASIL MELEWATI KRISIS DARURAT",
    winTakeaway:
      "Mantap! Anda mampu menghindari ruang tertutup yang berisiko menjebak serta memilih rute darurat yang aman.",
    indoorDpsPerSec: 7.0,
    allowIndoorDoorJam: true,
    goalTypes: ["EXIT", "SAFE_ASSEMBLY_GOAL"],
    phases: [
      {
        phaseId: "MULTI_INITIAL_ALERT",
        name: "Alarm Krisis Ganda",
        durationSec: 10,
        warningText: "Gempa dan asap api terdeteksi secara simultan!",
        instructionText: "Segera tinggalkan ruangan kelas menuju koridor terbuka terdekat.",
      },
      {
        phaseId: "MULTI_COMPOUND_SHOCK",
        name: "Krisis Kompleks Sedang Berlangsung",
        durationSec: 0,
        warningText: "GUNCANGAN SUSULAN & ASAP TEBAL! Reruntuhan dan panas menghambat rute!",
        instructionText: "Ikuti jalur rambu darurat terbuka menuju Gerbang Aman!",
      },
    ],
  },
};

export function resolveActiveDisasterPhase(
  strategy: DisasterStrategyProfile,
  simTimeMs: number,
): ActiveDisasterPhaseState {
  const simTimeSec = Math.max(0, simTimeMs / 1000);
  const phases = strategy.phases || [];
  if (phases.length === 0) {
    return {
      phaseId: "DEFAULT",
      name: strategy.label,
      phaseIndex: 1,
      totalPhases: 1,
      elapsedInPhaseSec: simTimeSec,
      remainingInPhaseSec: 0,
      warningText: strategy.briefingWarning,
      instructionText: strategy.headlineTarget,
      isSevereShaking: false,
      requiresCover: false,
      isTsunamiWaveArrival: false,
      inundatesGroundFloor: false,
      waveEtaSec: 0,
      ambientShakeIntensity: 0,
      ambientDarkness: 0,
    };
  }

  let accumulatedSec = 0;
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    const isLast = i === phases.length - 1;
    const phaseDuration = phase.durationSec;

    if (isLast || phaseDuration <= 0 || simTimeSec < accumulatedSec + phaseDuration) {
      const elapsedInPhaseSec = Math.max(0, simTimeSec - accumulatedSec);
      const remainingInPhaseSec =
        phaseDuration > 0 ? Math.max(0, phaseDuration - elapsedInPhaseSec) : 0;

      const waveEtaSec =
        strategy.key === "TSUNAMI_FLOOD"
          ? Math.max(0, Math.ceil(55 - simTimeSec))
          : 0;

      const isWaveArrival = Boolean(
        phase.isTsunamiWaveArrival ||
          (strategy.key === "TSUNAMI_FLOOD" && simTimeSec >= 55),
      );

      return {
        phaseId: phase.phaseId,
        name: phase.name,
        phaseIndex: i + 1,
        totalPhases: phases.length,
        elapsedInPhaseSec,
        remainingInPhaseSec,
        warningText: phase.warningText,
        instructionText: phase.instructionText,
        isSevereShaking: Boolean(phase.isSevereShaking),
        requiresCover: Boolean(phase.requiresCover),
        isTsunamiWaveArrival: isWaveArrival,
        inundatesGroundFloor: Boolean(phase.inundatesGroundFloor || isWaveArrival),
        waveEtaSec,
        ambientShakeIntensity: phase.ambientShakeIntensity ?? 0,
        ambientDarkness: phase.ambientDarkness ?? 0,
      };
    }
    accumulatedSec += phaseDuration;
  }

  const lastPhase = phases[phases.length - 1];
  const waveEtaSec =
    strategy.key === "TSUNAMI_FLOOD" ? Math.max(0, Math.ceil(55 - simTimeSec)) : 0;
  const isWaveArrival = Boolean(
    lastPhase.isTsunamiWaveArrival ||
      (strategy.key === "TSUNAMI_FLOOD" && simTimeSec >= 55),
  );

  return {
    phaseId: lastPhase.phaseId,
    name: lastPhase.name,
    phaseIndex: phases.length,
    totalPhases: phases.length,
    elapsedInPhaseSec: Math.max(0, simTimeSec - accumulatedSec),
    remainingInPhaseSec: 0,
    warningText: lastPhase.warningText,
    instructionText: lastPhase.instructionText,
    isSevereShaking: Boolean(lastPhase.isSevereShaking),
    requiresCover: Boolean(lastPhase.requiresCover),
    isTsunamiWaveArrival: isWaveArrival,
    inundatesGroundFloor: Boolean(lastPhase.inundatesGroundFloor || isWaveArrival),
    waveEtaSec,
    ambientShakeIntensity: lastPhase.ambientShakeIntensity ?? 0,
    ambientDarkness: lastPhase.ambientDarkness ?? 0,
  };
}

export function resolveDisasterStrategy(
  disasterType = "",
  scenarioName = "",
): DisasterStrategyProfile {
  const combined = `${disasterType} ${scenarioName}`.toLowerCase();
  if (combined.includes("tsunami") || combined.includes("banjir")) {
    return STRATEGIES.TSUNAMI_FLOOD;
  }
  if (combined.includes("puting") || combined.includes("angin")) {
    return STRATEGIES.STORM_WIND;
  }
  if (combined.includes("longsor")) {
    return STRATEGIES.LANDSLIDE;
  }
  if (
    combined.includes("kebakaran") ||
    combined.includes("api") ||
    combined.includes("kimia") ||
    combined.includes("gas")
  ) {
    return STRATEGIES.FIRE_CHEM;
  }
  if (combined.includes("multi") || combined.includes("krisis") || combined.includes("petir")) {
    return STRATEGIES.MULTI_CRISIS;
  }
  return STRATEGIES.EARTHQUAKE;
}
