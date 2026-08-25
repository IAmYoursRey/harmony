// Generates a comprehensive Indonesian school dataset covering all 38 provinces.
// Each province has multiple regencies/cities, each with multiple schools of various types.
// Risk levels and hazard percentages are derived from geographic risk profiles.

import type { Province, School, RiskCategory, SchoolLevel } from './schoolsTypes';
import { realSchoolsMojokerto } from './realSchoolsMojokerto';

// Deterministic pseudo-random generator for stable data
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// Geographic risk profiles by province (approximate center coordinates + risk multipliers)
const provinceProfiles: Record<string, {
  lat: number; lng: number;
  earthquake: number; flood: number; landslide: number; volcanic: number; tsunami: number;
}> = {
  'aceh': { lat: 5.5483, lng: 95.3238, earthquake: 72, flood: 55, landslide: 40, volcanic: 30, tsunami: 88 },
  'sumut': { lat: 2.1153, lng: 99.5451, earthquake: 58, flood: 65, landslide: 45, volcanic: 40, tsunami: 72 },
  'sumbar': { lat: -0.7399, lng: 100.8000, earthquake: 62, flood: 58, landslide: 68, volcanic: 75, tsunami: 55 },
  'riau': { lat: 0.2933, lng: 101.7068, earthquake: 42, flood: 72, landslide: 25, volcanic: 20, tsunami: 48 },
  'jambi': { lat: -1.6101, lng: 103.6131, earthquake: 45, flood: 78, landslide: 35, volcanic: 50, tsunami: 52 },
  'sumsel': { lat: -3.3194, lng: 104.9147, earthquake: 40, flood: 70, landslide: 30, volcanic: 35, tsunami: 42 },
  'bengkulu': { lat: -3.7928, lng: 102.2601, earthquake: 68, flood: 55, landslide: 72, volcanic: 80, tsunami: 65 },
  'lampung': { lat: -5.4500, lng: 105.2667, earthquake: 55, flood: 62, landslide: 58, volcanic: 85, tsunami: 58 },
  'kepri': { lat: 3.9457, lng: 108.1429, earthquake: 35, flood: 50, landslide: 20, volcanic: 15, tsunami: 38 },
  'bangka-belitung': { lat: -2.7411, lng: 106.4406, earthquake: 30, flood: 48, landslide: 18, volcanic: 10, tsunami: 35 },
  'jakarta': { lat: -6.2088, lng: 106.8456, earthquake: 48, flood: 82, landslide: 15, volcanic: 35, tsunami: 45 },
  'jabar': { lat: -6.9147, lng: 107.6098, earthquake: 58, flood: 65, landslide: 55, volcanic: 72, tsunami: 50 },
  'jateng': { lat: -7.1510, lng: 110.1403, earthquake: 55, flood: 68, landslide: 48, volcanic: 60, tsunami: 52 },
  'diy': { lat: -7.7956, lng: 110.3695, earthquake: 62, flood: 55, landslide: 65, volcanic: 88, tsunami: 65 },
  'jatim': { lat: -7.5360, lng: 112.2384, earthquake: 52, flood: 68, landslide: 58, volcanic: 75, tsunami: 55 },
  'banten': { lat: -6.4058, lng: 106.0640, earthquake: 55, flood: 70, landslide: 40, volcanic: 78, tsunami: 68 },
  'bali': { lat: -8.4095, lng: 115.1889, earthquake: 58, flood: 40, landslide: 35, volcanic: 85, tsunami: 72 },
  'ntb': { lat: -8.6528, lng: 117.3616, earthquake: 65, flood: 45, landslide: 62, volcanic: 82, tsunami: 75 },
  'ntt': { lat: -8.6574, lng: 121.0794, earthquake: 60, flood: 38, landslide: 55, volcanic: 70, tsunami: 68 },
  'kalbar': { lat: -0.2787, lng: 111.4753, earthquake: 42, flood: 75, landslide: 45, volcanic: 30, tsunami: 40 },
  'kalteng': { lat: -1.6814, lng: 113.3823, earthquake: 38, flood: 78, landslide: 30, volcanic: 25, tsunami: 32 },
  'kalsel': { lat: -3.0926, lng: 115.2838, earthquake: 35, flood: 72, landslide: 28, volcanic: 20, tsunami: 35 },
  'kaltim': { lat: 0.5387, lng: 116.4194, earthquake: 40, flood: 65, landslide: 35, volcanic: 25, tsunami: 38 },
  'kaltara': { lat: 3.0731, lng: 116.0414, earthquake: 38, flood: 60, landslide: 30, volcanic: 18, tsunami: 42 },
  'sulut': { lat: 0.6246, lng: 123.9750, earthquake: 62, flood: 48, landslide: 68, volcanic: 78, tsunami: 65 },
  'sulteng': { lat: -1.4300, lng: 121.4456, earthquake: 68, flood: 52, landslide: 65, volcanic: 60, tsunami: 72 },
  'sulsel': { lat: -3.6687, lng: 119.9741, earthquake: 55, flood: 58, landslide: 62, volcanic: 55, tsunami: 55 },
  'sulbar': { lat: -2.8441, lng: 119.2321, earthquake: 52, flood: 55, landslide: 58, volcanic: 45, tsunami: 48 },
  'sultra': { lat: -4.1477, lng: 122.1746, earthquake: 60, flood: 50, landslide: 60, volcanic: 65, tsunami: 62 },
  'gorontalo': { lat: 0.6999, lng: 122.4467, earthquake: 58, flood: 52, landslide: 55, volcanic: 50, tsunami: 58 },
  'maluku': { lat: -3.2385, lng: 130.1453, earthquake: 72, flood: 45, landslide: 58, volcanic: 88, tsunami: 78 },
  'malut': { lat: 1.5709, lng: 127.8088, earthquake: 68, flood: 42, landslide: 55, volcanic: 75, tsunami: 72 },
  'pabar': { lat: -1.3361, lng: 132.1747, earthquake: 65, flood: 48, landslide: 52, volcanic: 70, tsunami: 68 },
  'papua': { lat: -4.2699, lng: 138.0804, earthquake: 62, flood: 50, landslide: 58, volcanic: 55, tsunami: 65 },
  'papua-selatan': { lat: -6.8596, lng: 140.3384, earthquake: 58, flood: 48, landslide: 55, volcanic: 50, tsunami: 62 },
  'papua-tengah': { lat: -3.7879, lng: 136.2044, earthquake: 60, flood: 45, landslide: 52, volcanic: 58, tsunami: 60 },
  'papua-pegunungan': { lat: -4.5357, lng: 138.9814, earthquake: 55, flood: 40, landslide: 78, volcanic: 48, tsunami: 50 },
  'papua-barat': { lat: -1.8461, lng: 132.6369, earthquake: 62, flood: 52, landslide: 60, volcanic: 68, tsunami: 65 },
};

const provinceNames: Record<string, string> = {
  'aceh': 'Aceh',
  'sumut': 'Sumatera Utara',
  'sumbar': 'Sumatera Barat',
  'riau': 'Riau',
  'jambi': 'Jambi',
  'sumsel': 'Sumatera Selatan',
  'bengkulu': 'Bengkulu',
  'lampung': 'Lampung',
  'kepri': 'Kepulauan Riau',
  'bangka-belitung': 'Kepulauan Bangka Belitung',
  'jakarta': 'DKI Jakarta',
  'jabar': 'Jawa Barat',
  'jateng': 'Jawa Tengah',
  'diy': 'DI Yogyakarta',
  'jatim': 'Jawa Timur',
  'banten': 'Banten',
  'bali': 'Bali',
  'ntb': 'Nusa Tenggara Barat',
  'ntt': 'Nusa Tenggara Timur',
  'kalbar': 'Kalimantan Barat',
  'kalteng': 'Kalimantan Tengah',
  'kalsel': 'Kalimantan Selatan',
  'kaltim': 'Kalimantan Timur',
  'kaltara': 'Kalimantan Utara',
  'sulut': 'Sulawesi Utara',
  'sulteng': 'Sulawesi Tengah',
  'sulsel': 'Sulawesi Selatan',
  'sulbar': 'Sulawesi Barat',
  'sultra': 'Sulawesi Tenggara',
  'gorontalo': 'Gorontalo',
  'maluku': 'Maluku',
  'malut': 'Maluku Utara',
  'pabar': 'Papua Barat',
  'papua': 'Papua',
  'papua-selatan': 'Papua Selatan',
  'papua-tengah': 'Papua Tengah',
  'papua-pegunungan': 'Papua Pegunungan',
  'papua-barat': 'Papua Barat Daya',
};

// Regency/city names per province (representative set covering major regencies)
const regencyNames: Record<string, string[]> = {
  'aceh': ['Kabupaten Aceh Besar', 'Kabupaten Banda Aceh', 'Kota Banda Aceh', 'Kabupaten Aceh Utara', 'Kota Lhokseumawe', 'Kabupaten Aceh Tenggara'],
  'sumut': ['Kota Medan', 'Kabupaten Deli Serdang', 'Kabupaten Karo', 'Kota Pematangsiantar', 'Kabupaten Tapanuli Utara', 'Kabupaten Nias'],
  'sumbar': ['Kota Padang', 'Kabupaten Padang Pariaman', 'Kabupaten Agam', 'Kabupaten Tanah Datar', 'Kota Bukittinggi', 'Kabupaten Solok'],
  'riau': ['Kota Pekanbaru', 'Kabupaten Bengkalis', 'Kabupaten Siak', 'Kabupaten Kampar', 'Kabupaten Indragiri Hulu'],
  'jambi': ['Kota Jambi', 'Kabupaten Muaro Jambi', 'Kabupaten Batanghari', 'Kabupaten Kerinci', 'Kabupaten Sarolangun'],
  'sumsel': ['Kota Palembang', 'Kabupaten Banyuasin', 'Kabupaten Musi Banyuasin', 'Kabupaten Ogan Ilir', 'Kota Prabumulih'],
  'bengkulu': ['Kota Bengkulu', 'Kabupaten Bengkulu Utara', 'Kabupaten Rejang Lebong', 'Kabupaten Kaur', 'Kabupaten Mukomuko'],
  'lampung': ['Kota Bandar Lampung', 'Kabupaten Lampung Selatan', 'Kabupaten Lampung Tengah', 'Kabupaten Tanggamus', 'Kabupaten Liwa'],
  'kepri': ['Kota Batam', 'Kota Tanjungpinang', 'Kabupaten Karimun', 'Kabupaten Bintan', 'Kabupaten Lingga'],
  'bangka-belitung': ['Kota Pangkalpinang', 'Kabupaten Bangka', 'Kabupaten Belitung', 'Kabupaten Bangka Barat', 'Kabupaten Bangka Selatan'],
  'jakarta': ['Jakarta Pusat', 'Jakarta Selatan', 'Jakarta Timur', 'Jakarta Barat', 'Jakarta Utara', 'Kepulauan Seribu'],
  'jabar': ['Kota Bandung', 'Kabupaten Bandung', 'Kabupaten Bogor', 'Kota Bogor', 'Kabupaten Garut', 'Kabupaten Cianjur', 'Kota Bekasi', 'Kabupaten Sukabumi'],
  'jateng': ['Kota Semarang', 'Kabupaten Semarang', 'Kabupaten Boyolali', 'Kota Surakarta', 'Kabupaten Klaten', 'Kabupaten Magelang', 'Kabupaten Cilacap', 'Kabupaten Tegal'],
  'diy': ['Kota Yogyakarta', 'Kabupaten Sleman', 'Kabupaten Bantul', 'Kabupaten Kulon Progo', 'Kabupaten Gunungkidul'],
  'jatim': [
    'Kota Surabaya', 'Kota Malang', 'Kota Madiun', 'Kota Kediri', 'Kota Mojokerto', 'Kota Blitar', 'Kota Pasuruan', 'Kota Probolinggo', 'Kota Batu',
    'Kabupaten Bangkalan', 'Kabupaten Banyuwangi', 'Kabupaten Blitar', 'Kabupaten Bojonegoro', 'Kabupaten Bondowoso', 'Kabupaten Gresik', 'Kabupaten Jember', 'Kabupaten Jombang', 'Kabupaten Kediri', 'Kabupaten Lamongan', 'Kabupaten Lumajang', 'Kabupaten Madiun', 'Kabupaten Magetan', 'Kabupaten Malang', 'Kabupaten Mojokerto', 'Kabupaten Nganjuk', 'Kabupaten Ngawi', 'Kabupaten Pacitan', 'Kabupaten Pamekasan', 'Kabupaten Pasuruan', 'Kabupaten Ponorogo', 'Kabupaten Probolinggo', 'Kabupaten Sampang', 'Kabupaten Sidoarjo', 'Kabupaten Situbondo', 'Kabupaten Sumenep', 'Kabupaten Trenggalek', 'Kabupaten Tuban', 'Kabupaten Tulungagung'
  ],
  'banten': ['Kota Serang', 'Kabupaten Serang', 'Kota Tangerang', 'Kabupaten Tangerang', 'Kota Cilegon', 'Kabupaten Lebak', 'Kabupaten Pandeglang'],
  'bali': ['Kota Denpasar', 'Kabupaten Badung', 'Kabupaten Gianyar', 'Kabupaten Karangasem', 'Kabupaten Buleleng', 'Kabupaten Tabanan'],
  'ntb': ['Kota Mataram', 'Kabupaten Lombok Barat', 'Kabupaten Lombok Tengah', 'Kabupaten Lombok Timur', 'Kabupaten Sumbawa', 'Kabupaten Bima'],
  'ntt': ['Kota Kupang', 'Kabupaten Kupang', 'Kabupaten Ende', 'Kabupaten Sikka', 'Kabupaten Manggarai', 'Kabupaten Flores Timur'],
  'kalbar': ['Kota Pontianak', 'Kabupaten Pontianak', 'Kabupaten Sambas', 'Kabupaten Landak', 'Kabupaten Sanggau'],
  'kalteng': ['Kota Palangka Raya', 'Kabupaten Kapuas', 'Kabupaten Barito Selatan', 'Kabupaten Kotawaringin Timur', 'Kabupaten Katingan'],
  'kalsel': ['Kota Banjarmasin', 'Kabupaten Banjar', 'Kabupaten Tanah Laut', 'Kabupaten Hulu Sungai Selatan', 'Kabupaten Tabalong'],
  'kaltim': ['Kota Samarinda', 'Kota Balikpapan', 'Kabupaten Kutai Kartanegara', 'Kabupaten Paser', 'Kabupaten Berau'],
  'kaltara': ['Kota Tarakan', 'Kabupaten Bulungan', 'Kabupaten Nunukan', 'Kabupaten Malinau'],
  'sulut': ['Kota Manado', 'Kabupaten Minahasa', 'Kabupaten Bolaang Mongondow', 'Kabupaten Sangihe', 'Kabupaten Talaud'],
  'sulteng': ['Kota Palu', 'Kabupaten Donggala', 'Kabupaten Sigi', 'Kabupaten Banggai', 'Kabupaten Poso'],
  'sulsel': ['Kota Makassar', 'Kabupaten Gowa', 'Kabupaten Maros', 'Kabupaten Bone', 'Kabupaten Wajo', 'Kabupaten Bulukumba'],
  'sulbar': ['Kota Mamuju', 'Kabupaten Mamuju', 'Kabupaten Polewali Mandar', 'Kabupaten Majene', 'Kabupaten Mamasa'],
  'sultra': ['Kota Kendari', 'Kabupaten Konawe', 'Kabupaten Kolaka', 'Kabupaten Buton', 'Kabupaten Muna'],
  'gorontalo': ['Kota Gorontalo', 'Kabupaten Gorontalo', 'Kabupaten Bone Bolango', 'Kabupaten Boalemo', 'Kabupaten Pohuwato'],
  'maluku': ['Kota Ambon', 'Kabupaten Maluku Tengah', 'Kabupaten Seram Bagian Barat', 'Kabupaten Buru', 'Kabupaten Maluku Barat Daya'],
  'malut': ['Kota Ternate', 'Kota Tidore', 'Kabupaten Halmahera Barat', 'Kabupaten Halmahera Selatan', 'Kabupaten Sula'],
  'pabar': ['Kota Sorong', 'Kabupaten Sorong', 'Kabupaten Raja Ampat', 'Kabupaten Maybrat', 'Kabupaten Tambrauw'],
  'papua': ['Kota Jayapura', 'Kabupaten Jayapura', 'Kabupaten Nabire', 'Kabupaten Paniai', 'Kabupaten Mimika'],
  'papua-selatan': ['Kabupaten Merauke', 'Kabupaten Asmat', 'Kabupaten Boven Digoel', 'Kabupaten Mappi'],
  'papua-tengah': ['Kabupaten Puncak Jaya', 'Kabupaten Paniai', 'Kabupaten Dogiyai', 'Kabupaten Deiyai'],
  'papua-pegunungan': ['Kabupaten Jayawijaya', 'Kabupaten Lanny Jaya', 'Kabupaten Yalimo', 'Kabupaten Tolikara'],
  'papua-barat': ['Kabupaten Fakfak', 'Kabupaten Kaimana', 'Kabupaten Teluk Bintuni', 'Kabupaten Teluk Wondama'],
};

const schoolTypes: { prefix: string; level: SchoolLevel; public: boolean }[] = [
  { prefix: 'SMA Negeri', level: 'SMA', public: true },
  { prefix: 'SMK Negeri', level: 'SMK', public: true },
  { prefix: 'MA Negeri', level: 'MA', public: true },
  { prefix: 'SMP Negeri', level: 'SMP', public: true },
  { prefix: 'MTs Negeri', level: 'MTs', public: true },
  { prefix: 'SD Negeri', level: 'SD', public: true },
  { prefix: 'MI Negeri', level: 'MI', public: true },
  { prefix: 'SMA', level: 'SMA', public: false },
  { prefix: 'SMK', level: 'SMK', public: false },
  { prefix: 'MA', level: 'MA', public: false },
];

function computeRiskCategory(avg: number): RiskCategory {
  if (avg >= 75) return 'Very High';
  if (avg >= 60) return 'High';
  if (avg >= 40) return 'Moderate';
  return 'Low';
}

function jitter(base: number, rng: () => number, range: number): number {
  return Math.max(5, Math.min(98, Math.round(base + (rng() - 0.5) * range)));
}


// Dictionary of specific coordinates for regencies/cities to prevent overlapping around the province center
const regencyCenters: Record<string, { lat: number; lng: number }> = {
  // Jawa Timur
  'kota-surabaya': { lat: -7.2575, lng: 112.7521 },
  'kota-malang': { lat: -7.9666, lng: 112.6326 },
  'kota-madiun': { lat: -7.6298, lng: 111.5239 },
  'kota-kediri': { lat: -7.8170, lng: 112.0118 },
  'kota-mojokerto': { lat: -7.4726, lng: 112.4381 },
  'kota-blitar': { lat: -8.0983, lng: 112.1681 },
  'kota-pasuruan': { lat: -7.6453, lng: 112.9075 },
  'kota-probolinggo': { lat: -7.7569, lng: 113.2115 },
  'kota-batu': { lat: -7.8708, lng: 112.5271 },
  'kabupaten-bangkalan': { lat: -7.0315, lng: 112.7507 },
  'kabupaten-banyuwangi': { lat: -8.2192, lng: 114.3691 },
  'kabupaten-blitar': { lat: -8.1311, lng: 112.2198 },
  'kabupaten-bojonegoro': { lat: -7.1513, lng: 111.8818 },
  'kabupaten-bondowoso': { lat: -7.9135, lng: 113.8217 },
  'kabupaten-gresik': { lat: -7.1614, lng: 112.6570 },
  'kabupaten-jember': { lat: -8.1845, lng: 113.6681 },
  'kabupaten-jombang': { lat: -7.5460, lng: 112.2331 },
  'kabupaten-kediri': { lat: -7.8290, lng: 112.0620 },
  'kabupaten-lamongan': { lat: -7.1190, lng: 112.4150 },
  'kabupaten-lumajang': { lat: -8.1331, lng: 113.2241 },
  'kabupaten-madiun': { lat: -7.6166, lng: 111.6500 },
  'kabupaten-magetan': { lat: -7.6536, lng: 111.3283 },
  'kabupaten-malang': { lat: -8.1333, lng: 112.5667 },
  'kabupaten-mojokerto': { lat: -7.5360, lng: 112.5000 },
  'kabupaten-nganjuk': { lat: -7.6024, lng: 111.9022 },
  'kabupaten-ngawi': { lat: -7.4042, lng: 111.4447 },
  'kabupaten-pacitan': { lat: -8.2047, lng: 111.1167 },
  'kabupaten-pamekasan': { lat: -7.1603, lng: 113.4831 },
  'kabupaten-pasuruan': { lat: -7.7289, lng: 112.8441 },
  'kabupaten-ponorogo': { lat: -7.8711, lng: 111.4633 },
  'kabupaten-probolinggo': { lat: -7.8447, lng: 113.2981 },
  'kabupaten-sampang': { lat: -7.1399, lng: 113.2500 },
  'kabupaten-sidoarjo': { lat: -7.4478, lng: 112.7183 },
  'kabupaten-situbondo': { lat: -7.7238, lng: 113.9961 },
  'kabupaten-sumenep': { lat: -7.0167, lng: 113.8667 },
  'kabupaten-trenggalek': { lat: -8.1000, lng: 111.6667 },
  'kabupaten-tuban': { lat: -6.9015, lng: 112.0601 },
  'kabupaten-tulungagung': { lat: -8.0667, lng: 111.9000 },
  // Jawa Barat
  'kota-bandung': { lat: -6.9175, lng: 107.6191 },
  'kabupaten-bandung': { lat: -7.0253, lng: 107.5197 },
  'kabupaten-bogor': { lat: -6.5976, lng: 106.7996 },
  'kota-bogor': { lat: -6.5971, lng: 106.8060 },
  // Jawa Tengah & DIY
  'kota-semarang': { lat: -6.9667, lng: 110.4167 },
  'kota-yogyakarta': { lat: -7.7956, lng: 110.3695 },
  'kabupaten-sleman': { lat: -7.7212, lng: 110.3644 },
  'kabupaten-bantul': { lat: -7.8876, lng: 110.3274 },
};

function generateSchools(
  provinceId: string,
  regencyId: string,
  regencyName: string,
  profile: typeof provinceProfiles[string],
  rng: () => number
): School[] {
  const schools: School[] = [];
  // Generate 3-5 schools per regency
  const count = 3 + Math.floor(rng() * 3);

  for (let i = 0; i < count; i++) {
    const typeIdx = Math.floor(rng() * schoolTypes.length);
    const type = schoolTypes[typeIdx];
    
    const districts: Record<string, string[]> = {
      'kabupaten-mojokerto': ['Ngoro', 'Pungging', 'Mojosari', 'Sooko', 'Trowulan', 'Pacet', 'Trawas', 'Gondang', 'Bangsal', 'Kutorejo', 'Dlanggu', 'Puri', 'Mojoanyar', 'Kemlagi', 'Gedeg', 'Dawarblandong', 'Jatirejo'],
      'kota-mojokerto': ['Magersari', 'Prajurit Kulon', 'Kranggan'],
      'kabupaten-malang': ['Kepanjen', 'Singosari', 'Lawang', 'Turen', 'Dampit', 'Bantur', 'Gondanglegi', 'Pakis', 'Bululawang', 'Karangploso', 'Dau', 'Pujon', 'Ngantang'],
      'kota-malang': ['Klojen', 'Blimbing', 'Lowokwaru', 'Sukun', 'Kedungkandang'],
      'kota-surabaya': ['Tegalsari', 'Genteng', 'Gubeng', 'Wonokromo', 'Tambaksari', 'Sukolilo', 'Rungkut', 'Wiyung', 'Benowo', 'Jambangan', 'Gayungan', 'Sawahan'],
      'kabupaten-sidoarjo': ['Sidoarjo', 'Waru', 'Taman', 'Krian', 'Balongbendo', 'Prambon', 'Porong', 'Gedangan', 'Sukodono', 'Tulangan', 'Wonoayu'],
      'kabupaten-gresik': ['Gresik', 'Kebomas', 'Manyar', 'Driyorejo', 'Menganti', 'Cerme', 'Wringinanom', 'Sangkapura', 'Balongpanggang', 'Benjeng'],
      'kabupaten-pasuruan': ['Bangil', 'Pandaan', 'Prigen', 'Gempol', 'Sukorejo', 'Purwosari', 'Grati', 'Lumbang', 'Beji', 'Kraton'],
      'kota-pasuruan': ['Gadingrejo', 'Purworejo', 'Bugul Kidul', 'Panggungrejo'],
      'kabupaten-jombang': ['Jombang', 'Diwek', 'Peterongan', 'Ploso', 'Mojoagung', 'Ngoro', 'Bareng', 'Wonosalam', 'Mbandarkedungmulyo', 'Sumobito'],
      'kabupaten-banyuwangi': ['Banyuwangi', 'Giri', 'Glagah', 'Kabat', 'Rogojampi', 'Genteng', 'Muncar', 'Purwoharjo', 'Tegaldlimo', 'Kalipuro', 'Pesanggaran'],
      'kota-madiun': ['Kartoharjo', 'Manguharjo', 'Taman'],
      'kabupaten-madiun': ['Mejayan', 'Wungu', 'Balerejo', 'Saradan', 'Pilangkenceng', 'Gemarang', 'Dolopo', 'Geger', 'Jiwan', 'Sawahan'],
      'kota-kediri': ['Mojoroto', 'Kota', 'Pesantren'],
      'kabupaten-kediri': ['Ngasem', 'Pare', 'Papar', 'Purwoasri', 'Plosoklaten', 'Gurah', 'Puncu', 'Kepung', 'Kandangan', 'Banyakan', 'Grogol', 'Tarokan', 'Semen', 'Mojo'],
      'kota-blitar': ['Kepanjenkidul', 'Sananwetan', 'Sukorejo'],
      'kabupaten-blitar': ['Kanigoro', 'Talun', 'Wlingi', 'Garum', 'Sanankulon', 'Ponggok', 'Srengat', 'Udanawu', 'Wonodadi', 'Selopuro', 'Kesamben', 'Doko', 'Gandusari', 'Bakung', 'Wonotirto', 'Kademangan'],
      'kota-batu': ['Batu', 'Bumiaji', 'Junrejo'],
      'kota-probolinggo': ['Kademangan', 'Kedopok', 'Wonoasih', 'Mayangan', 'Kanigaran'],
      'kabupaten-probolinggo': ['Kraksaan', 'Paiton', 'Besuk', 'Kotaanyar', 'Gending', 'Banyuanyar', 'Tiris', 'Krucil', 'Tongas', 'Sumberasih', 'Lumbang', 'Sukapura'],
    };

    const genericDistricts = ['Sukamaju', 'Karanganyar', 'Mekar Jaya', 'Harapan', 'Bakti', 'Sido Makmur', 'Sumber', 'Mulya', 'Raya'];
    
    const districtList = districts[regencyId] || genericDistricts;
    const districtIdx = Math.floor(rng() * districtList.length);
    const districtName = districtList[districtIdx];
    
    const foundationNames = ['Muhammadiyah', 'NU', 'PGRI', 'Bakti', 'Bina Bangsa', 'Al-Ikhlas', 'Kristen', 'Katholik'];
    const foundation = foundationNames[Math.floor(rng() * foundationNames.length)];

    const isPublic = type.public;
    // Use short regency if generic, else use district
    const shortRegency = regencyName.replace('Kabupaten ', '').replace('Kota ', '');
    const locationName = districts[regencyId] ? districtName : `${districtName} ${shortRegency}`;

    let schoolName = '';
    if (isPublic) {
      // Random number from 1 to 3
      const num = 1 + Math.floor(rng() * 3);
      schoolName = `${type.prefix} ${num} ${locationName}`;
    } else {
      schoolName = `${type.prefix} ${foundation} ${locationName}`;
    }

    const baseLat = regencyCenters[regencyId]?.lat ?? profile.lat;
    const baseLng = regencyCenters[regencyId]?.lng ?? profile.lng;
    const lat = baseLat + (rng() - 0.5) * 0.15;
    const lng = baseLng + (rng() - 0.5) * 0.15;

    const earthquake = jitter(profile.earthquake, rng, 20);
    const flood = jitter(profile.flood, rng, 25);
    const landslide = jitter(profile.landslide, rng, 25);
    const volcanic = jitter(profile.volcanic, rng, 20);
    
    let tsunami = jitter(profile.tsunami, rng, 20);
    // Realistic correction: Inland regencies should have very low tsunami risk
    const inlandRegencies = ['mojokerto', 'bandung', 'bogor', 'magelang', 'boyolali', 'klaten', 'sleman', 'kediri', 'batu', 'malang', 'solok', 'bukittinggi'];
    const isInland = inlandRegencies.some(r => regencyName.toLowerCase().includes(r));
    if (isInland) {
      tsunami = Math.max(5, Math.floor(tsunami / 5));
    }

    const avg = Math.round((earthquake + flood + landslide + volcanic + tsunami) / 5);
    const risk = computeRiskCategory(avg);

    const schoolId = `${provinceId}-${regencyId}-${type.level.toLowerCase()}-${i + 1}`;

    schools.push({
      id: schoolId,
      name: schoolName,
      lat: Math.round(lat * 10000) / 10000,
      lng: Math.round(lng * 10000) / 10000,
      risk,
      earthquake,
      flood,
      landslide,
      volcanic,
      tsunami,
      level: type.level,
      isPublic: type.public,
    });
  }

  return schools;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function generateSchoolData(): Province[] {
  const provinces: Province[] = [];

  for (const [provinceId, profile] of Object.entries(provinceProfiles)) {
    const regencies = (regencyNames[provinceId] ?? []).map((regencyName) => {
      const regencyId = slugify(regencyName);
      let schools: School[] = [];
      
      if (regencyId === 'kabupaten-mojokerto') {
        schools = realSchoolsMojokerto;
      } else {
        const seed = hashCode(`${provinceId}-${regencyId}`);
        const rng = seededRandom(seed);
        schools = generateSchools(provinceId, regencyId, regencyName, profile, rng);
      }
      
      return { id: regencyId, name: regencyName, schools };
    });

    provinces.push({
      id: provinceId,
      name: provinceNames[provinceId] ?? provinceId,
      regencies,
    });
  }

  // Sort alphabetically by province name
  return provinces.sort((a, b) => a.name.localeCompare(b.name));
}
