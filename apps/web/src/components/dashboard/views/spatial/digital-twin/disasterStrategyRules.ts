export type DisasterStrategyKey =
  | "EARTHQUAKE"
  | "TSUNAMI_FLOOD"
  | "FIRE_CHEM"
  | "STORM_WIND"
  | "LANDSLIDE"
  | "MULTI_CRISIS";

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
}

const STRATEGIES: Record<DisasterStrategyKey, DisasterStrategyProfile> = {
  EARTHQUAKE: {
    key: "EARTHQUAKE",
    label: "Gempa Bumi Tektonik",
    headlineTarget: "Ke Lapangan Upacara (Area Terbuka Jauh Dari Bangunan)",
    briefingWarning:
      "Di dalam kelas rawan tertimpa plafon/lemari & pintu bisa macet; jalan raya depan gerbang rawan kabel putus dan tembok pagar roboh. Pilih koridor terbuka menuju tengah Lapangan Upacara!",
    indoorDangerWarning:
      "BAHAYA DI DALAM RUANGAN! Plafon & kaca jendela rawan jatuh saat gempa — segera keluar lewat pintu terdekat!",
    wrongExitWarning:
      "JALAN LUAR TIDAK AMAN SAAT GEMPA! Tiang listrik & pagar jalan rawan roboh — menuju tengah Lapangan Upacara!",
    winTitle: "SELAMAT DI TITIK KUMPUL TERBUKA",
    winTakeaway:
      "Tepat! Saat gempa, area terbuka yang jauh dari bangunan dan tiang listrik jauh lebih aman daripada tetap di dalam kelas atau keluar ke jalan sempit.",
    indoorDpsPerSec: 6.5,
    allowIndoorDoorJam: true,
    goalTypes: ["SAFE_ASSEMBLY_GOAL"],
  },
  TSUNAMI_FLOOD: {
    key: "TSUNAMI_FLOOD",
    label: "Tsunami & Banjir Bandang",
    headlineTarget: "Naik ke Titik Tinggi / Tangga Lantai 2 (Jangan Keluar Gerbang Rendah!)",
    briefingWarning:
      "Air bah & gelombang tinggi menggenangi ruangan lantai bawah dan jalan raya depan sekolah! Hindari ruang tertutup yang tergenang listrik dan segera naik ke Titik Evakuasi Tinggi / Lantai 2.",
    indoorDangerWarning:
      "AWAS TERJEBAK AIR & LISTRIK! Ruangan lantai bawah cepat terendam — segera keluar dan naik ke tempat tinggi!",
    wrongExitWarning:
      "GERBANG JALAN TERENDAM ARUS DERAS! Jangan keluar ke jalan rendah — segera menuju Tangga Naik Lantai 2 / Titik Tinggi!",
    winTitle: "SELAMAT DI DATARAN / LANTAI TINGGI",
    winTakeaway:
      "Benar! Menghadapi tsunami atau banjir bandang, menyelamatkan diri secara vertikal ke tempat tinggi lebih aman daripada menerobos jalan rendah.",
    indoorDpsPerSec: 7.5,
    allowIndoorDoorJam: true,
    goalTypes: ["HIGH_GROUND"],
  },
  FIRE_CHEM: {
    key: "FIRE_CHEM",
    label: "Kebakaran / Kebocoran Gas Kimia",
    headlineTarget: "Keluar Kampus via Gerbang Utama / Pintu Darurat Bebas Asap",
    briefingWarning:
      "Asap & uap beracun cepat memenuhi ruangan tertutup. Jangan memotong jalan lewat dalam ruang kelas — ikuti jalur darurat terbuka menuju Gerbang Aman berlawanan arah asap!",
    indoorDangerWarning:
      "AWAS ASAP PEKAT DI DALAM RUANGAN! Oksigen menipis — jangan lewat dalam kelas, pakai koridor luar menuju pintu darurat!",
    wrongExitWarning:
      "Jalur keluar ini tertutup panas/gas! Putar lewat koridor berlawanan menuju Gerbang Darurat lain!",
    winTitle: "BERHASIL KELUAR DARI ZONA ASAP",
    winTakeaway:
      "Tepat! Saat kebakaran atau kebocoran kimia, keluar menjauh dari bangunan lewat rute darurat bebas asap menyelamatkan pernapasan Anda.",
    indoorDpsPerSec: 8.5,
    allowIndoorDoorJam: true,
    goalTypes: ["EXIT"],
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
  },
};

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
