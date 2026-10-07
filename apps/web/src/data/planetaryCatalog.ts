/**
 * Verified Planetary & Solar System Scientific Catalog
 * Ground-truth astrophysical data compiled from NASA Planetary Fact Sheets,
 * NASA Jet Propulsion Laboratory (JPL) Solar System Dynamics, and peer-reviewed journals.
 */

export interface NotableMission {
  mission: string;
  agency: string;
  year: string;
  discovery: string;
  paperCitation?: string;
}

export interface InteriorLayer {
  name: string;
  depth: string;
  thickness: string;
  temperature: string;
  composition: string;
  state: 'padat' | 'cair' | 'gas' | 'plasma' | 'fluida_superkritis';
  color: string;
  description: string;
}

export interface CelestialBodyData {
  id: string;
  name: string;
  englishName: string;
  type: 'star' | 'terrestrial' | 'gas_giant' | 'ice_giant' | 'moon';
  typeLabel: string;
  distanceFromSunKm: string;
  distanceFromSunAU: number;
  diameterKm: number;
  diameterRelative: string;
  massKg: string;
  massRelative: string;
  gravity: string;
  orbitalPeriod: string;
  orbitalVelocity: string;
  rotationPeriod: string;
  axialTilt: string;
  surfaceTemp: { min?: string; avg: string; max?: string };
  atmosphere: string[];
  moonsCount: number;
  scientificFact: string;
  missionsAndResearch: NotableMission[];
  interiorLayers: InteriorLayer[];
  visual: {
    color: string;
    orbitRadius: number; // 3D Scene units
    bodyRadius: number;  // 3D Scene size
    orbitSpeed: number;  // Animated angular speed
    rotationSpeed: number;
    hasRings?: boolean;
    ringInner?: number;
    ringOuter?: number;
    accentColor: string;
    glowColor?: string;
  };
}

export const PLANETARY_CATALOG: Record<string, CelestialBodyData> = {
  sun: {
    id: 'sun',
    name: 'Matahari',
    englishName: 'Sun (Sol)',
    type: 'star',
    typeLabel: 'Bintang Deret Utama (Tipe Spektrum G2V)',
    distanceFromSunKm: '0 km (Pusat Tata Surya)',
    distanceFromSunAU: 0,
    diameterKm: 1392700,
    diameterRelative: '109.3× Bumi',
    massKg: '1.989 × 10³⁰ kg',
    massRelative: '333,000× Bumi (99.86% massa total Tata Surya)',
    gravity: '274 m/s² (27.9 g)',
    orbitalPeriod: '230 juta tahun (Orbit Galaksi Bima Sakti)',
    orbitalVelocity: '220 km/s (Kecepatan Galaktik)',
    rotationPeriod: '25 hari (Ekuator) - 35 hari (Kutub)',
    axialTilt: '7.25° terhadap bidang ekliptika',
    surfaceTemp: { min: '5,500°C (Fotosfer)', avg: '5,505°C', max: '15,000,000°C (Inti Fusi)' },
    atmosphere: ['Hidrogen 73.46%', 'Helium 24.85%', 'Oksigen 0.77%', 'Karbon 0.29%', 'Besi 0.16%'],
    moonsCount: 0,
    scientificFact: 'Setiap detik, reaksi fusi termonuklir di inti Matahari mengubah sekitar 600 juta ton hidrogen menjadi helium, melepaskan energi radiasi setara 3.8 × 10²⁶ Watt.',
    missionsAndResearch: [
      {
        mission: 'Parker Solar Probe',
        agency: 'NASA',
        year: '2018 - sekarang',
        discovery: 'Menjadi wahana pertama yang "menyentuh" korona Matahari dan mengukur pembalikan medan magnetik plasma (switchbacks).',
        paperCitation: 'Bale et al., Nature 576, 237–242 (2019)'
      },
      {
        mission: 'SOHO (Solar and Heliospheric Observatory)',
        agency: 'ESA / NASA',
        year: '1995 - sekarang',
        discovery: 'Pemetaan badai korona (CME), dinamika angin matahari, dan pemantauan siklus bintik matahari 11 tahunan.',
        paperCitation: 'Domingo et al., Solar Physics 162, 1–37 (1995)'
      }
    ],
    interiorLayers: [
      {
        name: 'Inti Termonuklir (Core)',
        depth: '0 - 175.000 km (0 - 0.25 R☉)',
        thickness: '~175.000 km radius',
        temperature: '15.000.000°C',
        composition: 'Plasma Hidrogen (Fusi Proton-Proton ke Helium)',
        state: 'plasma',
        color: '#ffffff',
        description: 'Tungku termonuklir yang menghasilkan seluruh energi radiasi Matahari di bawah tekanan gravitasi 250 miliar atmosfer.'
      },
      {
        name: 'Zona Radiasi (Radiative Zone)',
        depth: '175.000 - 490.000 km (0.25 - 0.70 R☉)',
        thickness: '~315.000 km',
        temperature: '7.000.000°C - 2.000.000°C',
        composition: 'Plasma Hidrogen & Helium terionisasi padat',
        state: 'plasma',
        color: '#fbbf24',
        description: 'Foton gamma berpindah secara acak (random walk) melewati plasma super padat, membutuhkan lebih dari 100.000 tahun untuk mencapai zona berikutnya.'
      },
      {
        name: 'Zona Konveksi (Convective Zone)',
        depth: '490.000 - 696.000 km (0.70 - 1.00 R☉)',
        thickness: '~206.000 km',
        temperature: '2.000.000°C - 5.500°C',
        composition: 'Sel arus konveksi plasma mendidih',
        state: 'plasma',
        color: '#f97316',
        description: 'Kolom plasma panas naik ke permukaan lalu mendingin dan tenggelam kembali, menciptakan granulasi sel dan membangkitkan dinamo medan magnet surya.'
      },
      {
        name: 'Fotosfer (Photosphere)',
        depth: '0 - 500 km (Permukaan Optik)',
        thickness: '~500 km',
        temperature: '5.500°C',
        composition: 'Gas terionisasi tipis (H⁻ ions)',
        state: 'plasma',
        color: '#ea580c',
        description: 'Lapisan permukaan bercahaya yang tampak dari Bumi, tempat bintik matahari, granulasi plasma, dan flare magnetik dilepaskan.'
      }
    ],
    visual: {
      color: '#ffaa00',
      orbitRadius: 0,
      bodyRadius: 28.0,
      orbitSpeed: 0,
      rotationSpeed: 0.002,
      accentColor: '#fbbf24',
      glowColor: '#f59e0b'
    }
  },

  mercury: {
    id: 'mercury',
    name: 'Merkurius',
    englishName: 'Mercury',
    type: 'terrestrial',
    typeLabel: 'Planet Terestrial / Kebumian',
    distanceFromSunKm: '57.9 juta km',
    distanceFromSunAU: 0.387,
    diameterKm: 4879,
    diameterRelative: '0.383× Bumi',
    massKg: '3.301 × 10²³ kg',
    massRelative: '0.055× Bumi',
    gravity: '3.7 m/s² (0.38 g)',
    orbitalPeriod: '87.97 hari Bumi',
    orbitalVelocity: '47.36 km/s',
    rotationPeriod: '58.6 hari Bumi (Resonansi spin-orbit 3:2)',
    axialTilt: '0.034° (Hampir tegak lurus)',
    surfaceTemp: { min: '-180°C (Malam)', avg: '167°C', max: '430°C (Siang)' },
    atmosphere: ['Eksosfer Tipis: Oksigen 42%', 'Natrium 29%', 'Hidrogen 22%', 'Helium 6%'],
    moonsCount: 0,
    scientificFact: 'Merkurius memiliki inti besi cair yang sangat masif, mencakup sekitar 85% dari jari-jari total planetnya, serta deposit es air beku permanen di kawah kutub yang selalu teduh.',
    missionsAndResearch: [
      {
        mission: 'MESSENGER',
        agency: 'NASA',
        year: '2004 - 2015',
        discovery: 'Menemukan bukti es air di kawah kutub permanen dan memetakan kandungan kalium serta belerang yang tak terduga di kerak Merkurius.',
        paperCitation: 'Solomon et al., Science 336, 421–422 (2012)'
      },
      {
        mission: 'BepiColombo',
        agency: 'ESA / JAXA',
        year: '2018 - sekarang',
        discovery: 'Meneliti struktur magnetosfer ganda dan komposisi batuan permukaan terdalam Merkurius.',
        paperCitation: 'Benkhoff et al., Planetary and Space Science 58, 2–20 (2010)'
      }
    ],
    interiorLayers: [
      {
        name: 'Inti Besi Raksasa (Metallic Core)',
        depth: '400 - 2.440 km (85% radius)',
        thickness: '~2.074 km radius',
        temperature: '1.200°C - 1.500°C',
        composition: 'Besi murni cair & padat, nikel, belerang',
        state: 'cair',
        color: '#ef4444',
        description: 'Inti logam terbesar secara proporsional di Tata Surya, menghasilkan dinamo magnetosfer aktif.'
      },
      {
        name: 'Mantel Silikat Padat (Mantle)',
        depth: '35 - 400 km',
        thickness: '~365 km',
        temperature: '600°C - 1.000°C',
        composition: 'Mineral olivin, piroksen, dan silikat besi-magnesium',
        state: 'padat',
        color: '#b45309',
        description: 'Lapisan mantel berbatu yang tipis akibat tumbukan katastrofik di era awal Tata Surya.'
      },
      {
        name: 'Kerak Kawah Silikat (Crust)',
        depth: '0 - 35 km',
        thickness: '~35 km',
        temperature: '-180°C s/d 430°C',
        composition: 'Batuan beku anortosit, regolit tertumbuk meteorit',
        state: 'padat',
        color: '#64748b',
        description: 'Kerak tua dipenuhi tebing sesar sungkup (lobate scarps) yang terbentuk akibat planet mendingin dan menyusut.'
      }
    ],
    visual: {
      color: '#94a3b8',
      orbitRadius: 75.0,
      bodyRadius: 0.58,
      orbitSpeed: 0.024,
      rotationSpeed: 0.005,
      accentColor: '#94a3b8',
      glowColor: '#cbd5e1'
    }
  },

  venus: {
    id: 'venus',
    name: 'Venus',
    englishName: 'Venus',
    type: 'terrestrial',
    typeLabel: 'Planet Terestrial (Efek Rumah Kaca Ekstrem)',
    distanceFromSunKm: '108.2 juta km',
    distanceFromSunAU: 0.723,
    diameterKm: 12104,
    diameterRelative: '0.949× Bumi (Kembaran Bumi)',
    massKg: '4.867 × 10²⁴ kg',
    massRelative: '0.815× Bumi',
    gravity: '8.87 m/s² (0.904 g)',
    orbitalPeriod: '224.7 hari Bumi',
    orbitalVelocity: '35.02 km/s',
    rotationPeriod: '243 hari Bumi (Rotasi retrograd / searah jarum jam)',
    axialTilt: '177.36° (Terbalik)',
    surfaceTemp: { min: '438°C', avg: '464°C (Terpanas di Tata Surya)', max: '482°C' },
    atmosphere: ['Karbon Dioksida 96.5%', 'Nitrogen 3.5%', 'Awan Asam Sulfat tebal (Tekanan 93 bar)'],
    moonsCount: 0,
    scientificFact: 'Meskipun bukan yang terdekat dari Matahari, efek rumah kaca tak terkendali (runaway greenhouse effect) dari atmosfer CO₂ padat membuat permukaan Venus mampu melelehkan timbal.',
    missionsAndResearch: [
      {
        mission: 'Magellan',
        agency: 'NASA',
        year: '1989 - 1994',
        discovery: 'Pemetaan radar resolusi tinggi yang mengungkap 85% permukaan Venus tertutup aliran lahar vulkanik segar dan formasi kubah pancake.',
        paperCitation: 'Saunders et al., J. Geophys. Res. 97, 13063–13090 (1992)'
      },
      {
        mission: 'Venus Express',
        agency: 'ESA',
        year: '2005 - 2014',
        discovery: 'Mendeteksi bukti aktivitas vulkanik aktif baru serta dinamika super-rotasi atmosfer yang berputar 60 kali lebih cepat daripada rotasi planet.',
        paperCitation: 'Svedhem et al., Nature 450, 629–632 (2007)'
      }
    ],
    interiorLayers: [
      {
        name: 'Inti Besi-Nikel (Metallic Core)',
        depth: '3.000 - 6.052 km',
        thickness: '~3.000 km radius',
        temperature: '3.500°C - 4.500°C',
        composition: 'Paduan besi dan nikel padat-cair',
        state: 'padat',
        color: '#dc2626',
        description: 'Inti logam berukuran mirip Bumi tetapi tanpa medan dinamo kuat akibat rotasi planet yang lambat.'
      },
      {
        name: 'Mantel Batuan Silikat (Rock Mantle)',
        depth: '50 - 3.000 km',
        thickness: '~2.950 km',
        temperature: '1.000°C - 3.000°C',
        composition: 'Silikat magnesium dan besi',
        state: 'padat',
        color: '#d97706',
        description: 'Mantel konvektif yang menyuplai magma ke gunung api perisai dan ribuan formasi vulkanik coronae.'
      },
      {
        name: 'Kerak Basaltik Vulkanik (Crust)',
        depth: '0 - 50 km',
        thickness: '~50 km',
        temperature: '465°C',
        composition: 'Batuan beku basaltik dan lelehan lava silikat',
        state: 'padat',
        color: '#ca8a04',
        description: 'Permukaan padat dengan daratan tinggi Ishtar Terra, pegunungan Maxwell Montes, dan ngarai retakan.'
      },
      {
        name: 'Atmosfer Tebal Superkritis & Awan Asam Sulfat',
        depth: '0 - 250 km ke atas',
        thickness: '~250 km',
        temperature: '465°C di darat s/d -40°C di puncak awan',
        composition: 'CO₂ 96.5%, N₂ 3.5%, kabut asam sulfat (H₂SO₄)',
        state: 'gas',
        color: '#fef08a',
        description: 'Atmosfer masif bertekanan 93 bar (9.3 MPa) dengan angin super-rotasi berkecepatan 360 km/jam.'
      }
    ],
    visual: {
      color: '#eab308',
      orbitRadius: 115.0,
      bodyRadius: 0.97,
      orbitSpeed: 0.016,
      rotationSpeed: -0.003,
      accentColor: '#facc15',
      glowColor: '#eab308'
    }
  },

  earth: {
    id: 'earth',
    name: 'Bumi',
    englishName: 'Earth (Terra)',
    type: 'terrestrial',
    typeLabel: 'Planet Terestrial (Biosfer Berpenghuni)',
    distanceFromSunKm: '149.6 juta km (1 Satuan Astronomi)',
    distanceFromSunAU: 1.0,
    diameterKm: 12742,
    diameterRelative: '1.0× (Standar Acuan)',
    massKg: '5.972 × 10²⁴ kg',
    massRelative: '1.0× (Standar Acuan)',
    gravity: '9.807 m/s² (1.0 g)',
    orbitalPeriod: '365.256 hari (1 Tahun Tropis)',
    orbitalVelocity: '29.78 km/s',
    rotationPeriod: '23 jam 56 menit 4 detik (Hari Sideris)',
    axialTilt: '23.44° (Menghasilkan 4 Musim & Siklus Iklim)',
    surfaceTemp: { min: '-89.2°C (Vostok, Antartika)', avg: '14.9°C', max: '56.7°C (Death Valley, AS)' },
    atmosphere: ['Nitrogen 78.08%', 'Oksigen 20.95%', 'Argon 0.93%', 'Uap Air & CO₂ ~0.04%'],
    moonsCount: 1,
    scientificFact: 'Satu-satunya planet di alam semesta yang terbukti menampung kehidupan dan air cair stabil di permukaannya, dilindungi oleh medan magnetosfer dinamis hasil dinamo inti besi cair.',
    missionsAndResearch: [
      {
        mission: 'Earth Observing System (Terra, Aqua, Landsat)',
        agency: 'NASA / USGS / ESA',
        year: '1972 - sekarang',
        discovery: 'Pemantauan komprehensif sistem iklim terestrial, dinamika siklon tropis, deforestasi, dan penginderaan jauh permukaan bumi.',
        paperCitation: 'Wulder et al., Remote Sensing of Environment 225, 127–147 (2019)'
      },
      {
        mission: 'InSAR & GNSS Geodesy',
        agency: 'Konsorsium Geodesi Global',
        year: '1990 - sekarang',
        discovery: 'Pengukuran pergeseran lempeng tektonik global secara presisi milimeter dan akumulasi regangan gempa bumi.',
        paperCitation: 'Bürgmann et al., Annual Review of Earth and Planetary Sciences 28, 169–209 (2000)'
      }
    ],
    interiorLayers: [
      {
        name: 'Inti Dalam Padat (Inner Core)',
        depth: '5.150 - 6.371 km',
        thickness: '~1.220 km radius',
        temperature: '5.400°C (Sepanas permukaan fotosfer Matahari)',
        composition: 'Paduan kristalin besi dan nikel padat (Fe-Ni)',
        state: 'padat',
        color: '#fef08a',
        description: 'Logam padat di bawah tekanan raksasa 3.6 juta atmosfer yang berputar sedikit lebih cepat dari mantel Bumi.'
      },
      {
        name: 'Inti Luar Cair (Outer Core)',
        depth: '2.890 - 5.150 km',
        thickness: '~2.260 km',
        temperature: '4.000°C - 5.000°C',
        composition: 'Besi-nikel cair dan unsur ringan (S, O, Si)',
        state: 'cair',
        color: '#f97316',
        description: 'Arus konveksi logam cair menghasilkan medan magnet geomagnetik pelindung dari radiasi mematikan angin surya.'
      },
      {
        name: 'Mantel Bawah & Astenosfer (Mantle)',
        depth: '35 - 2.890 km',
        thickness: '~2.855 km',
        temperature: '1.000°C - 3.700°C',
        composition: 'Batuan peridotit dan silikat magnesium-besi semi-plastis',
        state: 'padat',
        color: '#b45309',
        description: 'Arus konveksi mantel menggerakkan lempeng-lempeng tektonik litosfer, memicu gempa bumi dan jalur gunung berapi.'
      },
      {
        name: 'Kerak Benua & Samudra (Crust)',
        depth: '0 - 70 km',
        thickness: '5 - 70 km (Tipis di samudra, tebal di benua)',
        temperature: '0°C - 500°C',
        composition: 'Granit (benua), basalt (samudra), dan biosfer tanah',
        state: 'padat',
        color: '#15803d',
        description: 'Tempat bertumpunya daratan, pegunungan, samudra 71% luas permukaan, dan habitat biosfer kehidupan.'
      }
    ],
    visual: {
      color: '#38bdf8',
      orbitRadius: 150.0,
      bodyRadius: 1.0,
      orbitSpeed: 0.012,
      rotationSpeed: 0.015,
      accentColor: '#0ea5e9',
      glowColor: '#38bdf8'
    }
  },

  moon: {
    id: 'moon',
    name: 'Bulan',
    englishName: 'Moon (Luna)',
    type: 'moon',
    typeLabel: 'Satelit Alami Terestrial',
    distanceFromSunKm: '149.6 juta km (Mengorbit Bumi pada jarak 384,400 km)',
    distanceFromSunAU: 1.0,
    diameterKm: 3474,
    diameterRelative: '0.272× Bumi',
    massKg: '7.342 × 10²² kg',
    massRelative: '0.0123× Bumi',
    gravity: '1.62 m/s² (0.166 g)',
    orbitalPeriod: '27.32 hari Bumi (Kala Revolusi Mengelilingi Bumi)',
    orbitalVelocity: '1.022 km/s (Mengelilingi Bumi)',
    rotationPeriod: '27.32 hari (Terkunci Pasang Surut / Tidally Locked)',
    axialTilt: '1.54° terhadap ekliptika',
    surfaceTemp: { min: '-130°C (Malam)', avg: '-20°C', max: '120°C (Siang)' },
    atmosphere: ['Hampir Vakum (Eksosfer sangat tipis: Helium, Neon, Hidrogen)'],
    moonsCount: 0,
    scientificFact: 'Bulan terbentuk sekitar 4.5 miliar tahun lalu dari puing-puing tabrakan raksasa antara Bumi muda dan protoplanet seukuran Mars bernama Theia (Giant Impact Hypothesis).',
    missionsAndResearch: [
      {
        mission: 'Apollo 11 - 17',
        agency: 'NASA',
        year: '1969 - 1972',
        discovery: 'Membawa pulang 382 kg sampel batuan anortosit dan basalt bulan yang mengungkap sejarah geologis awal pembentukan sistem Bumi-Bulan.',
        paperCitation: 'Wood et al., Science 167, 602–604 (1970)'
      },
      {
        mission: 'Lunar Reconnaissance Orbiter (LRO)',
        agency: 'NASA',
        year: '2009 - sekarang',
        discovery: 'Pemetaan topografi laser global dan identifikasi kantong es air di kawah gelap kutub selatan bulan.',
        paperCitation: 'Mitrofanov et al., Science 330, 483–486 (2010)'
      }
    ],
    interiorLayers: [
      {
        name: 'Inti Logam Kecil (Lunar Core)',
        depth: '1.400 - 1.737 km',
        thickness: '~330 km radius',
        temperature: '1.300°C - 1.400°C',
        composition: 'Paduan besi kaya belerang (Fe-S)',
        state: 'cair',
        color: '#ef4444',
        description: 'Inti logam kecil yang kini telah mendingin dan kehilangan dinamo magnetik aktif.'
      },
      {
        name: 'Mantel Kaku & Litosfer Bulan (Mantle)',
        depth: '60 - 1.400 km',
        thickness: '~1.340 km',
        temperature: '800°C - 1.200°C',
        composition: 'Piroksen, olivin kaya magnesium, dan ilmenit (titanium)',
        state: 'padat',
        color: '#78716c',
        description: 'Mantel padat kaku tempat terdeteksinya gempa bulan dalam (deep moonquakes) oleh instrumen seismometer Apollo.'
      },
      {
        name: 'Kerak Anortositik Kuno & Basalt Mare (Crust)',
        depth: '0 - 60 km',
        thickness: '~60 km (lebih tebal di sisi jauh Bulan)',
        temperature: '-130°C s/d 120°C',
        composition: 'Batuan beku anortosit kaya plagioklas feldspar dan basal mare',
        state: 'padat',
        color: '#cbd5e1',
        description: 'Kerak tua berumur 4.4 miliar tahun yang dipenuhi cekungan mare lava gelap dan kawah benturan bertingkat.'
      }
    ],
    visual: {
      color: '#e2e8f0',
      orbitRadius: 8.5, // Relative to Earth in 3D scene
      bodyRadius: 0.46,
      orbitSpeed: 0.05,
      rotationSpeed: 0.01,
      accentColor: '#cbd5e1',
      glowColor: '#f1f5f9'
    }
  },

  mars: {
    id: 'mars',
    name: 'Mars',
    englishName: 'Mars',
    type: 'terrestrial',
    typeLabel: 'Planet Terestrial (Planet Merah)',
    distanceFromSunKm: '227.9 juta km',
    distanceFromSunAU: 1.524,
    diameterKm: 6779,
    diameterRelative: '0.532× Bumi',
    massKg: '6.417 × 10²³ kg',
    massRelative: '0.107× Bumi',
    gravity: '3.72 m/s² (0.38 g)',
    orbitalPeriod: '686.98 hari Bumi (1.88 Tahun Bumi)',
    orbitalVelocity: '24.07 km/s',
    rotationPeriod: '24 jam 37 menit 22 detik (1 Sol Mars)',
    axialTilt: '25.19° (Mirip kemiringan sumbu Bumi)',
    surfaceTemp: { min: '-140°C (Kutub Musim Dingin)', avg: '-63°C', max: '20°C (Ekuator Musim Panas)' },
    atmosphere: ['Karbon Dioksida 95.3%', 'Nitrogen 2.6%', 'Argon 1.9%', 'Oksigen 0.16%'],
    moonsCount: 2,
    scientificFact: 'Rumah bagi gunung berapi perisai terbesar di Tata Surya (Olympus Mons setinggi 21.9 km) dan ngarai raksasa Valles Marineris yang membentang lebih dari 4,000 km.',
    missionsAndResearch: [
      {
        mission: 'Perseverance Rover & Ingenuity',
        agency: 'NASA',
        year: '2020 - sekarang',
        discovery: 'Mengonfirmasi endapan delta danau purba di Kawah Jezero yang kaya akan mineral lempung dan potensi biosignature purba.',
        paperCitation: 'Mangold et al., Science 374, 711–717 (2021)'
      },
      {
        mission: 'Curiosity Rover (MSL)',
        agency: 'NASA',
        year: '2012 - sekarang',
        discovery: 'Menemukan molekul organik kompleks di sedimen Kawah Gale dan mendeteksi pelepasan gas metana musiman.',
        paperCitation: 'Eigenbrode et al., Science 360, 1096–1101 (2018)'
      }
    ],
    interiorLayers: [
      {
        name: 'Inti Logam Cair (Liquid Iron Core)',
        depth: '1.830 - 3.390 km',
        thickness: '~1.830 km radius',
        temperature: '1.800°C - 2.000°C',
        composition: 'Paduan besi, nikel cair, dengan konsentrasi tinggi belerang & fosfor',
        state: 'cair',
        color: '#dc2626',
        description: 'Dikonfirmasi oleh misi seismik NASA InSight, inti Mars berdensitas lebih rendah dan sepenuhnya cair.'
      },
      {
        name: 'Mantel Silikat Statis (Mantle)',
        depth: '50 - 1.830 km',
        thickness: '~1.780 km',
        temperature: '1.000°C - 1.500°C',
        composition: 'Mineral olivin, wadleyit, dan piroksen kaya besi',
        state: 'padat',
        color: '#9a3412',
        description: 'Litosfer tunggal tebal tanpa lempeng tektonik yang memungkinkan magma memusat dan membentuk Olympus Mons.'
      },
      {
        name: 'Kerak Basaltik Berkarat (Crust)',
        depth: '0 - 50 km',
        thickness: '25 - 80 km',
        temperature: '-140°C s/d 20°C',
        composition: 'Batuan vulkanik basaltik terlapisi debu nano-hematit (Fe₂O₃)',
        state: 'padat',
        color: '#ea580c',
        description: 'Kerak yang kaya mineral besi teroksidasi menghasilkan rona merah khas, terbelah oleh ngarai Valles Marineris.'
      }
    ],
    visual: {
      color: '#ef4444',
      orbitRadius: 200.0,
      bodyRadius: 0.70,
      orbitSpeed: 0.009,
      rotationSpeed: 0.014,
      accentColor: '#f87171',
      glowColor: '#ef4444'
    }
  },

  jupiter: {
    id: 'jupiter',
    name: 'Yupiter',
    englishName: 'Jupiter',
    type: 'gas_giant',
    typeLabel: 'Raksasa Gas (Planet Terbesar)',
    distanceFromSunKm: '778.5 juta km',
    distanceFromSunAU: 5.204,
    diameterKm: 139820,
    diameterRelative: '10.97× Bumi',
    massKg: '1.898 × 10²⁷ kg',
    massRelative: '317.8× Bumi (2.5× gabungan semua planet lain)',
    gravity: '24.79 m/s² (2.53 g)',
    orbitalPeriod: '11.86 tahun Bumi',
    orbitalVelocity: '13.07 km/s',
    rotationPeriod: '9 jam 55 menit (Rotasi tercepat di Tata Surya)',
    axialTilt: '3.13°',
    surfaceTemp: { min: '-145°C (Puncak awan)', avg: '-110°C', max: '24,000°C (Inti Metalik)' },
    atmosphere: ['Hidrogen 89.8%', 'Helium 10.2%', 'Metana, Amonia, Uap Air ~0.1%'],
    moonsCount: 95,
    scientificFact: 'Pusaran badai antisiklonik raksasa Great Red Spot telah bergolak selama lebih dari 350 tahun dengan diameter lebih besar dari bola Bumi secara utuh.',
    missionsAndResearch: [
      {
        mission: 'Juno',
        agency: 'NASA',
        year: '2016 - sekarang',
        discovery: 'Menyibak interior dalam Yupiter dan mengungkap inti difus tanpa batas tegas serta medan magnetik asimetris yang kuat.',
        paperCitation: 'Bolton et al., Science 356, 821–825 (2017)'
      },
      {
        mission: 'Galileo',
        agency: 'NASA',
        year: '1989 - 2003',
        discovery: 'Menemukan bukti kuat lautan air asin bawah permukaan di bulan Europa, Ganymede, dan Callisto.',
        paperCitation: 'Kivelson et al., Science 290, 1340–1343 (2000)'
      }
    ],
    interiorLayers: [
      {
        name: 'Inti Difus Campuran Batuan-Es (Dilute Core)',
        depth: '50.000 - 69.911 km',
        thickness: '~20.000 km radius',
        temperature: '24.000°C - 30.000°C',
        composition: 'Batuan silikat, es padat terkompresi, hidrogen logam',
        state: 'fluida_superkritis',
        color: '#fef08a',
        description: 'Temuan wahana Juno membuktikan inti tidak berupa bola padat kaku melainkan inti "encer/difus" yang larut dengan hidrogen.'
      },
      {
        name: 'Mantel Hidrogen Logam Cair (Metallic Hydrogen)',
        depth: '10.000 - 50.000 km',
        thickness: '~40.000 km',
        temperature: '10.000°C - 20.000°C',
        composition: 'Hidrogen cair terionisasi konduktif superpadat',
        state: 'fluida_superkritis',
        color: '#f97316',
        description: 'Tekanan jutaan atmosfer mengubah hidrogen menjadi cairan konduktif listrik, membangkitkan magnetosfer raksasa.'
      },
      {
        name: 'Lapisan Hidrogen Molekuler (Molecular Hydrogen)',
        depth: '1.000 - 10.000 km',
        thickness: '~9.000 km',
        temperature: '1.000°C - 10.000°C',
        composition: 'Hidrogen dan helium fluida superkritis',
        state: 'gas',
        color: '#fed7aa',
        description: 'Zona transisi fluida gas-ke-cair tanpa adanya permukaan padat berbatas tegas.'
      },
      {
        name: 'Troposfer Sabuk Awan (Weather Layer)',
        depth: '0 - 1.000 km',
        thickness: '~1.000 km',
        temperature: '-145°C s/d 20°C',
        composition: 'Es amonia (NH₃), amonium hidrosulfida, dan uap air',
        state: 'gas',
        color: '#ea580c',
        description: 'Sabuk awan berwarna berputar berlawanan arah dengan pusaran badai Great Red Spot dan gelombang Kelvin-Helmholtz.'
      }
    ],
    visual: {
      color: '#f97316',
      orbitRadius: 460.0,
      bodyRadius: 3.8,
      orbitSpeed: 0.005,
      rotationSpeed: 0.025,
      accentColor: '#fb923c',
      glowColor: '#ea580c'
    }
  },

  saturn: {
    id: 'saturn',
    name: 'Saturnus',
    englishName: 'Saturn',
    type: 'gas_giant',
    typeLabel: 'Raksasa Gas (Sistem Cincin Termegah)',
    distanceFromSunKm: '1.434 miliar km',
    distanceFromSunAU: 9.582,
    diameterKm: 116460,
    diameterRelative: '9.14× Bumi',
    massKg: '5.683 × 10²⁶ kg',
    massRelative: '95.2× Bumi',
    gravity: '10.44 m/s² (1.06 g)',
    orbitalPeriod: '29.45 tahun Bumi',
    orbitalVelocity: '9.68 km/s',
    rotationPeriod: '10 jam 33 menit',
    axialTilt: '26.73°',
    surfaceTemp: { min: '-178°C (Puncak Awan)', avg: '-140°C', max: '11,700°C (Inti)' },
    atmosphere: ['Hidrogen 96.3%', 'Helium 3.25%', 'Metana 0.45%', 'Amonia 0.02%'],
    moonsCount: 146,
    scientificFact: 'Kepadatan rata-rata Saturnus hanya 0.687 g/cm³, menjadikannya satu-satunya planet di Tata Surya yang memiliki kerapatan lebih ringan daripada air (dapat mengapung di air raksasa).',
    missionsAndResearch: [
      {
        mission: 'Cassini-Huygens',
        agency: 'NASA / ESA / ASI',
        year: '1997 - 2017',
        discovery: 'Menemukan geyser air asin aktif di bulan Enceladus dan mendaratkan probe Huygens di danau metana cair bulan Titan.',
        paperCitation: 'Porco et al., Science 311, 1393–1401 (2006)'
      },
      {
        mission: 'Voyager 1 & 2',
        agency: 'NASA',
        year: '1980 - 1981',
        discovery: 'Menyingkap struktur mikro cincin Saturnus yang terdiri dari ribuan cincin halus berisi miliaran partikel es air beku.',
        paperCitation: 'Smith et al., Science 212, 163–191 (1981)'
      }
    ],
    interiorLayers: [
      {
        name: 'Inti Padat-Difusi Logam & Es (Dense Core)',
        depth: '38.000 - 58.232 km',
        thickness: '~20.000 km radius',
        temperature: '11.700°C',
        composition: 'Silikat batuan, besi-nikel, dan es air padat',
        state: 'padat',
        color: '#fef08a',
        description: 'Massa inti diperkirakan 9 - 22 kali massa Bumi, dianalisis dari data seismologi getaran cincin oleh wahana Cassini.'
      },
      {
        name: 'Mantel Hidrogen Logam Cair (Metallic Hydrogen)',
        depth: '18.000 - 38.000 km',
        thickness: '~20.000 km',
        temperature: '6.000°C - 10.000°C',
        composition: 'Hidrogen cair terionisasi konduktif',
        state: 'fluida_superkritis',
        color: '#f59e0b',
        description: 'Menghasilkan medan magnet Saturnus yang unik karena simetris sempurna terhadap sumbu rotasinya.'
      },
      {
        name: 'Mantel Hidrogen Molekuler & Hujan Helium',
        depth: '1.000 - 18.000 km',
        thickness: '~17.000 km',
        temperature: '500°C - 6.000°C',
        composition: 'Fluida hidrogen cair dengan tetesan hujan helium',
        state: 'cair',
        color: '#fde047',
        description: 'Helium mengembun menjadi tetesan cairan dan jatuh ke kedalaman planet, melepaskan energi panas internal.'
      },
      {
        name: 'Atmosfer Karamel & Heksagon Kutub',
        depth: '0 - 1.000 km',
        thickness: '~1.000 km',
        temperature: '-178°C',
        composition: 'Amonia, amonium hidrosulfida, uap air',
        state: 'gas',
        color: '#ca8a04',
        description: 'Awan berkabut emas karamel dengan badai jet-stream heksagonal selebar 30.000 km di kutub utara.'
      }
    ],
    visual: {
      color: '#eab308',
      orbitRadius: 680.0,
      bodyRadius: 3.4,
      orbitSpeed: 0.0035,
      rotationSpeed: 0.022,
      hasRings: true,
      ringInner: 4.4,
      ringOuter: 8.6,
      accentColor: '#fde047',
      glowColor: '#ca8a04'
    }
  },

  uranus: {
    id: 'uranus',
    name: 'Uranus',
    englishName: 'Uranus',
    type: 'ice_giant',
    typeLabel: 'Raksasa Es (Sumbu Rotasi Terbalik/Miring)',
    distanceFromSunKm: '2.871 miliar km',
    distanceFromSunAU: 19.22,
    diameterKm: 50724,
    diameterRelative: '3.98× Bumi',
    massKg: '8.681 × 10²⁵ kg',
    massRelative: '14.5× Bumi',
    gravity: '8.69 m/s² (0.89 g)',
    orbitalPeriod: '84.01 tahun Bumi',
    orbitalVelocity: '6.80 km/s',
    rotationPeriod: '17 jam 14 menit (Rotasi Retrograd)',
    axialTilt: '97.77° (Berputar miring di bidang orbit)',
    surfaceTemp: { min: '-224°C (Suhu terdingin atmosfer)', avg: '-195°C', max: '-153°C' },
    atmosphere: ['Hidrogen 82.5%', 'Helium 15.2%', 'Metana 2.3% (Penyebab rona biru kehijauan)'],
    moonsCount: 28,
    scientificFact: 'Uranus berotasi miring hampir 98 derajat ("menggelinding" di bidang orbitnya), kemungkinan akibat benturan kosmik dahsyat dengan protoplanet seukuran Bumi di masa awal Tata Surya.',
    missionsAndResearch: [
      {
        mission: 'Voyager 2',
        agency: 'NASA',
        year: '1986',
        discovery: 'Mendeteksi 10 satelit baru, 2 cincin tambahan, dan mengukur medan magnetik anomali yang miring 59 derajat dari sumbu rotasi.',
        paperCitation: 'Stone & Miner, Science 233, 39–43 (1986)'
      },
      {
        mission: 'James Webb Space Telescope (JWST)',
        agency: 'NASA / ESA / CSA',
        year: '2023 - sekarang',
        discovery: 'Citra inframerah resolusi tinggi menampakkan cincin debu redup dan tudung awan kutub badai musiman secara detail luar biasa.',
        paperCitation: 'Akeson et al., JWST Early Release Science (2023)'
      }
    ],
    interiorLayers: [
      {
        name: 'Inti Batuan Silikat-Besi (Rocky Core)',
        depth: '20.000 - 25.362 km',
        thickness: '~5.000 km radius',
        temperature: '5.000°C',
        composition: 'Silikat magnesium-besi dan logam padat',
        state: 'padat',
        color: '#67e8f9',
        description: 'Inti padat seukuran massa Bumi yang dikelilingi oleh mantel es superkritis bertekanan jutaan bar.'
      },
      {
        name: 'Mantel Fluida Es Superkritis (Icy Mantle)',
        depth: '4.000 - 20.000 km',
        thickness: '~16.000 km',
        temperature: '2.000°C - 5.000°C',
        composition: 'Fluida pekat air (H₂O), amonia (NH₃), dan metana (CH₄)',
        state: 'fluida_superkritis',
        color: '#06b6d4',
        description: 'Lautan fluida superkritis ionik penghantar listrik yang membangkitkan medan magnet miring 59° dari sumbu rotasi.'
      },
      {
        name: 'Atmosfer Gas Hidrogen-Helium Dalam',
        depth: '500 - 4.000 km',
        thickness: '~3.500 km',
        temperature: '-150°C s/d 2.000°C',
        composition: 'Gas terkompresi H₂ 83%, He 15%, CH₄ 2%',
        state: 'gas',
        color: '#22d3ee',
        description: 'Lapisan amplop gas atmosfer tebal pembungkus mantel es dalam.'
      },
      {
        name: 'Atmosfer Methane Haze Atas',
        depth: '0 - 500 km',
        thickness: '~500 km',
        temperature: '-224°C (Terdingin di Tata Surya)',
        composition: 'Gas metana penyerap cahaya merah dengan kabut fotokimia',
        state: 'gas',
        color: '#a5f3fc',
        description: 'Menghasilkan rona biru kehijauan (aquamarine) yang menawan dengan tudung es kutub musiman.'
      }
    ],
    visual: {
      color: '#06b6d4',
      orbitRadius: 980.0,
      bodyRadius: 2.2,
      orbitSpeed: 0.0022,
      rotationSpeed: -0.012,
      hasRings: true,
      ringInner: 2.8,
      ringOuter: 3.8,
      accentColor: '#22d3ee',
      glowColor: '#0891b2'
    }
  },

  neptune: {
    id: 'neptune',
    name: 'Neptunus',
    englishName: 'Neptune',
    type: 'ice_giant',
    typeLabel: 'Raksasa Es (Planet Angin Tercepat)',
    distanceFromSunKm: '4.495 miliar km',
    distanceFromSunAU: 30.05,
    diameterKm: 49244,
    diameterRelative: '3.86× Bumi',
    massKg: '1.024 × 10²⁶ kg',
    massRelative: '17.1× Bumi',
    gravity: '11.15 m/s² (1.14 g)',
    orbitalPeriod: '164.79 tahun Bumi',
    orbitalVelocity: '5.43 km/s',
    rotationPeriod: '16 jam 6 menit',
    axialTilt: '28.32°',
    surfaceTemp: { min: '-218°C', avg: '-201°C', max: '-180°C' },
    atmosphere: ['Hidrogen 80%', 'Helium 19%', 'Metana 1.5% (Warna biru kobalt pekat)'],
    moonsCount: 16,
    scientificFact: 'Atmosfer Neptunus memiliki kecepatan angin badai supersonik paling dahsyat di seluruh Tata Surya, tercatat mencapai lebih dari 2,100 km/jam.',
    missionsAndResearch: [
      {
        mission: 'Voyager 2',
        agency: 'NASA',
        year: '1989',
        discovery: 'Menemukan Great Dark Spot dan memverifikasi geyser nitrogen aktif di satelit es terbesar Triton yang bersuhu -235°C.',
        paperCitation: 'Smith et al., Science 246, 1422–1449 (1989)'
      },
      {
        mission: 'Hubble Space Telescope Outer Planet Program',
        agency: 'NASA / ESA',
        year: '1994 - sekarang',
        discovery: 'Pemantauan jangka panjang siklus kelahiran dan kepunahan badai vortex gelap di atmosfer dalam Neptunus.',
        paperCitation: 'Wong et al., Astronomical Journal 162, 280 (2021)'
      }
    ],
    interiorLayers: [
      {
        name: 'Inti Batuan Silikat & Logam (Rocky Core)',
        depth: '20.000 - 24.622 km',
        thickness: '~4.600 km radius',
        temperature: '7.000°C',
        composition: 'Besi, nikel, dan batuan silikat padat',
        state: 'padat',
        color: '#3b82f6',
        description: 'Inti padat bermassa ~1.2 kali massa Bumi di bawah tekanan gravitasi 7 juta atmosfer.'
      },
      {
        name: 'Mantel Fluida Es Ionik & Hujan Intan (Diamond Rain Mantle)',
        depth: '3.000 - 20.000 km',
        thickness: '~17.000 km',
        temperature: '2.000°C - 5.000°C',
        composition: 'Fluida air superkritis, amonia, dan karbon terdisosiasi',
        state: 'fluida_superkritis',
        color: '#1d4ed8',
        description: 'Suhu dan tekanan ekstrem memecah hidrokarbon menjadi kristal intan (berlian) yang turun menghujani inti.'
      },
      {
        name: 'Atmosfer Gas Dalam',
        depth: '500 - 3.000 km',
        thickness: '~2.500 km',
        temperature: '-150°C s/d 2.000°C',
        composition: 'Hidrogen 80%, Helium 19%, Metana 1.5%',
        state: 'gas',
        color: '#2563eb',
        description: 'Zona termodinamika konvektif yang menggerakkan angin supersonik tercepat di Tata Surya (2.160 km/jam).'
      },
      {
        name: 'Troposfer Biru Kobalt & Badai Great Dark Spot',
        depth: '0 - 500 km',
        thickness: '~500 km',
        temperature: '-218°C',
        composition: 'Metana penyerap spektrum merah, awan cirrus es metana',
        state: 'gas',
        color: '#1e40af',
        description: 'Warna biru kobalt pekat dengan pusaran badai Great Dark Spot dan awan putih cepat Scooter.'
      }
    ],
    visual: {
      color: '#2563eb',
      orbitRadius: 1320.0,
      bodyRadius: 2.15,
      orbitSpeed: 0.0016,
      rotationSpeed: 0.013,
      accentColor: '#3b82f6',
      glowColor: '#1d4ed8'
    }
  }
};

export const CELESTIAL_ORDER: string[] = [
  'sun',
  'mercury',
  'venus',
  'earth',
  'moon',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune'
];
