export interface GeoPlace {
  id: string;
  name: string;
  type: 'island' | 'province' | 'city' | 'regency' | 'remote';
  category?: 'provinsi' | 'kota' | 'kabupaten' | 'pelosok' | 'pulau';
  lat: number;
  lng: number;
  province?: string;
  island?: string;
  regency?: string;
  description?: string;
}

export const INDONESIA_ISLANDS: GeoPlace[] = [
  { id: 'isl_sumatera', name: 'Sumatera', type: 'island', category: 'pulau', lat: -0.5, lng: 101.5 },
  { id: 'isl_jawa', name: 'Jawa', type: 'island', category: 'pulau', lat: -7.5, lng: 110.0 },
  { id: 'isl_kalimantan', name: 'Kalimantan', type: 'island', category: 'pulau', lat: -0.5, lng: 114.0 },
  { id: 'isl_sulawesi', name: 'Sulawesi', type: 'island', category: 'pulau', lat: -2.0, lng: 121.0 },
  { id: 'isl_papua', name: 'Papua', type: 'island', category: 'pulau', lat: -4.5, lng: 138.5 },
  { id: 'isl_bali', name: 'Bali', type: 'island', category: 'pulau', lat: -8.35, lng: 115.15 },
  { id: 'isl_ntb', name: 'Nusa Tenggara Barat', type: 'island', category: 'pulau', lat: -8.6, lng: 117.5 },
  { id: 'isl_ntt', name: 'Nusa Tenggara Timur', type: 'island', category: 'pulau', lat: -9.5, lng: 122.5 },
  { id: 'isl_maluku', name: 'Kepulauan Maluku', type: 'island', category: 'pulau', lat: -3.2, lng: 128.5 },
];

export const INDONESIA_PROVINCES: GeoPlace[] = [
  // Sumatera (10 Provinsi)
  { id: 'prov_aceh', name: 'Aceh', type: 'province', category: 'provinsi', lat: 4.3, lng: 96.9, island: 'Sumatera', description: 'Ibu Kota: Banda Aceh' },
  { id: 'prov_sumut', name: 'Sumatera Utara', type: 'province', category: 'provinsi', lat: 2.1, lng: 99.1, island: 'Sumatera', description: 'Ibu Kota: Medan' },
  { id: 'prov_sumbar', name: 'Sumatera Barat', type: 'province', category: 'provinsi', lat: -0.8, lng: 100.8, island: 'Sumatera', description: 'Ibu Kota: Padang' },
  { id: 'prov_riau', name: 'Riau', type: 'province', category: 'provinsi', lat: 0.5, lng: 101.8, island: 'Sumatera', description: 'Ibu Kota: Pekanbaru' },
  { id: 'prov_kepri', name: 'Kepulauan Riau', type: 'province', category: 'provinsi', lat: 3.9, lng: 108.1, island: 'Sumatera', description: 'Ibu Kota: Tanjungpinang' },
  { id: 'prov_jambi', name: 'Jambi', type: 'province', category: 'provinsi', lat: -1.6, lng: 102.8, island: 'Sumatera', description: 'Ibu Kota: Jambi' },
  { id: 'prov_sumsel', name: 'Sumatera Selatan', type: 'province', category: 'provinsi', lat: -3.3, lng: 104.2, island: 'Sumatera', description: 'Ibu Kota: Palembang' },
  { id: 'prov_bengkulu', name: 'Bengkulu', type: 'province', category: 'provinsi', lat: -3.8, lng: 102.3, island: 'Sumatera', description: 'Ibu Kota: Bengkulu' },
  { id: 'prov_lampung', name: 'Lampung', type: 'province', category: 'provinsi', lat: -4.9, lng: 105.1, island: 'Sumatera', description: 'Ibu Kota: Bandar Lampung' },
  { id: 'prov_babel', name: 'Bangka Belitung', type: 'province', category: 'provinsi', lat: -2.7, lng: 106.4, island: 'Sumatera', description: 'Ibu Kota: Pangkalpinang' },

  // Jawa (6 Provinsi)
  { id: 'prov_banten', name: 'Banten', type: 'province', category: 'provinsi', lat: -6.4, lng: 106.1, island: 'Jawa', description: 'Ibu Kota: Serang' },
  { id: 'prov_dki', name: 'DKI Jakarta', type: 'province', category: 'provinsi', lat: -6.2, lng: 106.85, island: 'Jawa', description: 'Ibu Kota Negara / Daerah Khusus Jakarta' },
  { id: 'prov_jabar', name: 'Jawa Barat', type: 'province', category: 'provinsi', lat: -6.9, lng: 107.6, island: 'Jawa', description: 'Ibu Kota: Bandung' },
  { id: 'prov_jateng', name: 'Jawa Tengah', type: 'province', category: 'provinsi', lat: -7.2, lng: 110.2, island: 'Jawa', description: 'Ibu Kota: Semarang' },
  { id: 'prov_diy', name: 'DI Yogyakarta', type: 'province', category: 'provinsi', lat: -7.9, lng: 110.4, island: 'Jawa', description: 'Ibu Kota: Yogyakarta' },
  { id: 'prov_jatim', name: 'Jawa Timur', type: 'province', category: 'provinsi', lat: -7.7, lng: 112.5, island: 'Jawa', description: 'Ibu Kota: Surabaya' },

  // Bali & Nusa Tenggara (3 Provinsi)
  { id: 'prov_bali', name: 'Bali', type: 'province', category: 'provinsi', lat: -8.4, lng: 115.2, island: 'Bali', description: 'Ibu Kota: Denpasar' },
  { id: 'prov_ntb', name: 'Nusa Tenggara Barat', type: 'province', category: 'provinsi', lat: -8.6, lng: 117.4, island: 'Nusa Tenggara', description: 'Ibu Kota: Mataram' },
  { id: 'prov_ntt', name: 'Nusa Tenggara Timur', type: 'province', category: 'provinsi', lat: -8.8, lng: 121.2, island: 'Nusa Tenggara', description: 'Ibu Kota: Kupang' },

  // Kalimantan (5 Provinsi)
  { id: 'prov_kalbar', name: 'Kalimantan Barat', type: 'province', category: 'provinsi', lat: -0.1, lng: 111.1, island: 'Kalimantan', description: 'Ibu Kota: Pontianak' },
  { id: 'prov_kalteng', name: 'Kalimantan Tengah', type: 'province', category: 'provinsi', lat: -1.5, lng: 113.4, island: 'Kalimantan', description: 'Ibu Kota: Palangkaraya' },
  { id: 'prov_kalsel', name: 'Kalimantan Selatan', type: 'province', category: 'provinsi', lat: -2.9, lng: 115.4, island: 'Kalimantan', description: 'Ibu Kota: Banjarbaru' },
  { id: 'prov_kaltim', name: 'Kalimantan Timur', type: 'province', category: 'provinsi', lat: 0.5, lng: 116.5, island: 'Kalimantan', description: 'Ibu Kota: Samarinda / IKN Nusantara' },
  { id: 'prov_kaltara', name: 'Kalimantan Utara', type: 'province', category: 'provinsi', lat: 3.0, lng: 116.1, island: 'Kalimantan', description: 'Ibu Kota: Tanjung Selor' },

  // Sulawesi (6 Provinsi)
  { id: 'prov_sulut', name: 'Sulawesi Utara', type: 'province', category: 'provinsi', lat: 1.0, lng: 124.5, island: 'Sulawesi', description: 'Ibu Kota: Manado' },
  { id: 'prov_gorontalo', name: 'Gorontalo', type: 'province', category: 'provinsi', lat: 0.7, lng: 122.4, island: 'Sulawesi', description: 'Ibu Kota: Gorontalo' },
  { id: 'prov_sulteng', name: 'Sulawesi Tengah', type: 'province', category: 'provinsi', lat: -1.4, lng: 121.4, island: 'Sulawesi', description: 'Ibu Kota: Palu' },
  { id: 'prov_sulbar', name: 'Sulawesi Barat', type: 'province', category: 'provinsi', lat: -2.8, lng: 119.2, island: 'Sulawesi', description: 'Ibu Kota: Mamuju' },
  { id: 'prov_sulsel', name: 'Sulawesi Selatan', type: 'province', category: 'provinsi', lat: -4.1, lng: 119.9, island: 'Sulawesi', description: 'Ibu Kota: Makassar' },
  { id: 'prov_sultra', name: 'Sulawesi Tenggara', type: 'province', category: 'provinsi', lat: -4.1, lng: 122.1, island: 'Sulawesi', description: 'Ibu Kota: Kendari' },

  // Maluku & Papua (8 Provinsi)
  { id: 'prov_maluku', name: 'Maluku', type: 'province', category: 'provinsi', lat: -3.2, lng: 129.5, island: 'Maluku', description: 'Ibu Kota: Ambon' },
  { id: 'prov_malut', name: 'Maluku Utara', type: 'province', category: 'provinsi', lat: 0.8, lng: 127.8, island: 'Maluku', description: 'Ibu Kota: Sofifi' },
  { id: 'prov_papua', name: 'Papua', type: 'province', category: 'provinsi', lat: -2.5, lng: 140.0, island: 'Papua', description: 'Ibu Kota: Jayapura' },
  { id: 'prov_pabar', name: 'Papua Barat', type: 'province', category: 'provinsi', lat: -1.3, lng: 133.2, island: 'Papua', description: 'Ibu Kota: Manokwari' },
  { id: 'prov_pasel', name: 'Papua Selatan', type: 'province', category: 'provinsi', lat: -7.5, lng: 139.5, island: 'Papua', description: 'Ibu Kota: Merauke (DOB Baru)' },
  { id: 'prov_pateng', name: 'Papua Tengah', type: 'province', category: 'provinsi', lat: -3.8, lng: 136.5, island: 'Papua', description: 'Ibu Kota: Nabire (DOB Baru)' },
  { id: 'prov_papeg', name: 'Papua Pegunungan', type: 'province', category: 'provinsi', lat: -4.3, lng: 139.1, island: 'Papua', description: 'Ibu Kota: Jayawijaya / Wamena (DOB Baru)' },
  { id: 'prov_pabd', name: 'Papua Barat Daya', type: 'province', category: 'provinsi', lat: -1.0, lng: 131.5, island: 'Papua', description: 'Ibu Kota: Sorong (DOB Baru)' },
];

export const INDONESIA_CITIES: GeoPlace[] = [
  // Jabodetabek & Jawa Barat
  { id: 'city_jkt', name: 'Jakarta Pusat', type: 'city', category: 'kota', lat: -6.2088, lng: 106.8456, province: 'DKI Jakarta', island: 'Jawa', description: 'Pusat Pemerintahan & Finansial' },
  { id: 'city_jkt_utara', name: 'Jakarta Utara (Tanjung Priok)', type: 'city', category: 'kota', lat: -6.1214, lng: 106.8926, province: 'DKI Jakarta', island: 'Jawa' },
  { id: 'city_jkt_selatan', name: 'Jakarta Selatan', type: 'city', category: 'kota', lat: -6.2615, lng: 106.8106, province: 'DKI Jakarta', island: 'Jawa' },
  { id: 'city_bgr', name: 'Kota Bogor', type: 'city', category: 'kota', lat: -6.5971, lng: 106.8060, province: 'Jawa Barat', island: 'Jawa' },
  { id: 'city_kab_bgr', name: 'Kabupaten Bogor (Cibinong)', type: 'regency', category: 'kabupaten', lat: -6.4816, lng: 106.8536, province: 'Jawa Barat', island: 'Jawa' },
  { id: 'city_depok', name: 'Kota Depok', type: 'city', category: 'kota', lat: -6.4025, lng: 106.7942, province: 'Jawa Barat', island: 'Jawa' },
  { id: 'city_tgr', name: 'Kota Tangerang', type: 'city', category: 'kota', lat: -6.1783, lng: 106.6319, province: 'Banten', island: 'Jawa' },
  { id: 'city_tangsel', name: 'Kota Tangerang Selatan', type: 'city', category: 'kota', lat: -6.2888, lng: 106.7179, province: 'Banten', island: 'Jawa' },
  { id: 'city_bks', name: 'Kota Bekasi', type: 'city', category: 'kota', lat: -6.2383, lng: 106.9756, province: 'Jawa Barat', island: 'Jawa' },
  { id: 'city_kab_bks', name: 'Kabupaten Bekasi (Cikarang)', type: 'regency', category: 'kabupaten', lat: -6.3267, lng: 107.1525, province: 'Jawa Barat', island: 'Jawa' },
  { id: 'city_serang', name: 'Kota Serang', type: 'city', category: 'kota', lat: -6.1104, lng: 106.1640, province: 'Banten', island: 'Jawa' },
  { id: 'city_clg', name: 'Kota Cilegon', type: 'city', category: 'kota', lat: -5.9937, lng: 106.0175, province: 'Banten', island: 'Jawa' },
  { id: 'city_lebak', name: 'Kabupaten Lebak (Rangkasbitung)', type: 'regency', category: 'kabupaten', lat: -6.3639, lng: 106.2508, province: 'Banten', island: 'Jawa' },
  { id: 'city_pandeglang', name: 'Kabupaten Pandeglang', type: 'regency', category: 'kabupaten', lat: -6.3088, lng: 106.1065, province: 'Banten', island: 'Jawa' },
  { id: 'city_bdg', name: 'Kota Bandung', type: 'city', category: 'kota', lat: -6.9175, lng: 107.6191, province: 'Jawa Barat', island: 'Jawa' },
  { id: 'city_cmh', name: 'Kota Cimahi', type: 'city', category: 'kota', lat: -6.8723, lng: 107.5420, province: 'Jawa Barat', island: 'Jawa' },
  { id: 'city_kab_bdg', name: 'Kabupaten Bandung (Soreang)', type: 'regency', category: 'kabupaten', lat: -7.0253, lng: 107.5197, province: 'Jawa Barat', island: 'Jawa' },
  { id: 'city_kbb', name: 'Bandung Barat (Ngamprah)', type: 'regency', category: 'kabupaten', lat: -6.8643, lng: 107.4984, province: 'Jawa Barat', island: 'Jawa' },
  { id: 'city_crb', name: 'Kota Cirebon', type: 'city', category: 'kota', lat: -6.7320, lng: 108.5523, province: 'Jawa Barat', island: 'Jawa' },
  { id: 'city_skb', name: 'Kota Sukabumi', type: 'city', category: 'kota', lat: -6.9277, lng: 106.9299, province: 'Jawa Barat', island: 'Jawa' },
  { id: 'city_tsk', name: 'Kota Tasikmalaya', type: 'city', category: 'kota', lat: -7.3274, lng: 108.2207, province: 'Jawa Barat', island: 'Jawa' },
  { id: 'city_grt', name: 'Kabupaten Garut', type: 'regency', category: 'kabupaten', lat: -7.2279, lng: 107.9087, province: 'Jawa Barat', island: 'Jawa' },
  { id: 'city_pwk', name: 'Kabupaten Purwakarta', type: 'regency', category: 'kabupaten', lat: -6.5569, lng: 107.4433, province: 'Jawa Barat', island: 'Jawa' },
  { id: 'city_krw', name: 'Kabupaten Karawang', type: 'regency', category: 'kabupaten', lat: -6.3052, lng: 107.3023, province: 'Jawa Barat', island: 'Jawa' },
  { id: 'city_subang', name: 'Kabupaten Subang', type: 'regency', category: 'kabupaten', lat: -6.5585, lng: 107.7597, province: 'Jawa Barat', island: 'Jawa' },
  { id: 'city_idm', name: 'Kabupaten Indramayu', type: 'regency', category: 'kabupaten', lat: -6.3264, lng: 108.3200, province: 'Jawa Barat', island: 'Jawa' },
  { id: 'city_mjl', name: 'Kabupaten Majalengka', type: 'regency', category: 'kabupaten', lat: -6.8361, lng: 108.2277, province: 'Jawa Barat', island: 'Jawa' },
  { id: 'city_kng', name: 'Kabupaten Kuningan', type: 'regency', category: 'kabupaten', lat: -6.9765, lng: 108.4831, province: 'Jawa Barat', island: 'Jawa' },
  { id: 'city_cms', name: 'Kabupaten Ciamis', type: 'regency', category: 'kabupaten', lat: -7.3262, lng: 108.3533, province: 'Jawa Barat', island: 'Jawa' },
  { id: 'city_bnr', name: 'Kota Banjar', type: 'city', category: 'kota', lat: -7.3686, lng: 108.5332, province: 'Jawa Barat', island: 'Jawa' },

  // Jawa Tengah & DIY
  { id: 'city_smg', name: 'Kota Semarang', type: 'city', category: 'kota', lat: -6.9667, lng: 110.4167, province: 'Jawa Tengah', island: 'Jawa' },
  { id: 'city_kab_smg', name: 'Kabupaten Semarang (Ungaran)', type: 'regency', category: 'kabupaten', lat: -7.1399, lng: 110.4042, province: 'Jawa Tengah', island: 'Jawa' },
  { id: 'city_solo', name: 'Kota Surakarta (Solo)', type: 'city', category: 'kota', lat: -7.5755, lng: 110.8243, province: 'Jawa Tengah', island: 'Jawa' },
  { id: 'city_jogja', name: 'Kota Yogyakarta', type: 'city', category: 'kota', lat: -7.7956, lng: 110.3695, province: 'DI Yogyakarta', island: 'Jawa' },
  { id: 'city_sleman', name: 'Kabupaten Sleman', type: 'regency', category: 'kabupaten', lat: -7.7156, lng: 110.3556, province: 'DI Yogyakarta', island: 'Jawa' },
  { id: 'city_bantul', name: 'Kabupaten Bantul', type: 'regency', category: 'kabupaten', lat: -7.8920, lng: 110.3283, province: 'DI Yogyakarta', island: 'Jawa' },
  { id: 'city_gunungkidul', name: 'Gunungkidul (Wonosari)', type: 'regency', category: 'kabupaten', lat: -7.9620, lng: 110.6033, province: 'DI Yogyakarta', island: 'Jawa' },
  { id: 'city_kulonprogo', name: 'Kulon Progo (Wates / YIA)', type: 'regency', category: 'kabupaten', lat: -7.8583, lng: 110.1583, province: 'DI Yogyakarta', island: 'Jawa' },
  { id: 'city_mgl', name: 'Kota Magelang', type: 'city', category: 'kota', lat: -7.4706, lng: 110.2178, province: 'Jawa Tengah', island: 'Jawa' },
  { id: 'city_tgl', name: 'Kota Tegal', type: 'city', category: 'kota', lat: -6.8694, lng: 109.1402, province: 'Jawa Tengah', island: 'Jawa' },
  { id: 'city_pkl', name: 'Kota Pekalongan', type: 'city', category: 'kota', lat: -6.8886, lng: 109.6753, province: 'Jawa Tengah', island: 'Jawa' },
  { id: 'city_clp', name: 'Kabupaten Cilacap', type: 'regency', category: 'kabupaten', lat: -7.7031, lng: 109.0159, province: 'Jawa Tengah', island: 'Jawa' },
  { id: 'city_bms', name: 'Banyumas (Purwokerto)', type: 'regency', category: 'kabupaten', lat: -7.4243, lng: 109.2302, province: 'Jawa Tengah', island: 'Jawa' },
  { id: 'city_kudus', name: 'Kabupaten Kudus', type: 'regency', category: 'kabupaten', lat: -6.8048, lng: 110.8405, province: 'Jawa Tengah', island: 'Jawa' },
  { id: 'city_pati', name: 'Kabupaten Pati', type: 'regency', category: 'kabupaten', lat: -6.7562, lng: 111.0378, province: 'Jawa Tengah', island: 'Jawa' },
  { id: 'city_jepara', name: 'Kabupaten Jepara', type: 'regency', category: 'kabupaten', lat: -6.5925, lng: 110.6783, province: 'Jawa Tengah', island: 'Jawa' },
  { id: 'city_salatiga', name: 'Kota Salatiga', type: 'city', category: 'kota', lat: -7.3305, lng: 110.5084, province: 'Jawa Tengah', island: 'Jawa' },
  { id: 'city_boyolali', name: 'Kabupaten Boyolali', type: 'regency', category: 'kabupaten', lat: -7.5342, lng: 110.5960, province: 'Jawa Tengah', island: 'Jawa' },
  { id: 'city_klaten', name: 'Kabupaten Klaten', type: 'regency', category: 'kabupaten', lat: -7.7058, lng: 110.6033, province: 'Jawa Tengah', island: 'Jawa' },
  { id: 'city_sukoharjo', name: 'Kabupaten Sukoharjo', type: 'regency', category: 'kabupaten', lat: -7.6833, lng: 110.8333, province: 'Jawa Tengah', island: 'Jawa' },
  { id: 'city_wonogiri', name: 'Kabupaten Wonogiri', type: 'regency', category: 'kabupaten', lat: -7.8167, lng: 110.9250, province: 'Jawa Tengah', island: 'Jawa' },
  { id: 'city_karanganyar', name: 'Kabupaten Karanganyar', type: 'regency', category: 'kabupaten', lat: -7.5965, lng: 110.9515, province: 'Jawa Tengah', island: 'Jawa' },
  { id: 'city_sragen', name: 'Kabupaten Sragen', type: 'regency', category: 'kabupaten', lat: -7.4269, lng: 111.0225, province: 'Jawa Tengah', island: 'Jawa' },
  { id: 'city_blora', name: 'Kabupaten Blora', type: 'regency', category: 'kabupaten', lat: -6.9700, lng: 111.4172, province: 'Jawa Tengah', island: 'Jawa' },
  { id: 'city_rembang', name: 'Kabupaten Rembang', type: 'regency', category: 'kabupaten', lat: -6.7117, lng: 111.3444, province: 'Jawa Tengah', island: 'Jawa' },
  { id: 'city_kbm', name: 'Kabupaten Kebumen', type: 'regency', category: 'kabupaten', lat: -7.6698, lng: 109.6525, province: 'Jawa Tengah', island: 'Jawa' },
  { id: 'city_pwr', name: 'Kabupaten Purworejo', type: 'regency', category: 'kabupaten', lat: -7.7144, lng: 110.0078, province: 'Jawa Tengah', island: 'Jawa' },
  { id: 'city_wosobo', name: 'Kabupaten Wonosobo', type: 'regency', category: 'kabupaten', lat: -7.3639, lng: 109.9000, province: 'Jawa Tengah', island: 'Jawa' },
  { id: 'city_temanggung', name: 'Kabupaten Temanggung', type: 'regency', category: 'kabupaten', lat: -7.3167, lng: 110.1750, province: 'Jawa Tengah', island: 'Jawa' },
  { id: 'city_kendal', name: 'Kabupaten Kendal', type: 'regency', category: 'kabupaten', lat: -6.9242, lng: 110.2033, province: 'Jawa Tengah', island: 'Jawa' },
  { id: 'city_batang', name: 'Kabupaten Batang', type: 'regency', category: 'kabupaten', lat: -6.9083, lng: 109.7306, province: 'Jawa Tengah', island: 'Jawa' },
  { id: 'city_pemalang', name: 'Kabupaten Pemalang', type: 'regency', category: 'kabupaten', lat: -6.8911, lng: 109.3806, province: 'Jawa Tengah', island: 'Jawa' },
  { id: 'city_brebes', name: 'Kabupaten Brebes', type: 'regency', category: 'kabupaten', lat: -6.8708, lng: 109.0417, province: 'Jawa Tengah', island: 'Jawa' },

  // Jawa Timur
  { id: 'city_sby', name: 'Kota Surabaya', type: 'city', category: 'kota', lat: -7.2575, lng: 112.7521, province: 'Jawa Timur', island: 'Jawa', description: 'Metropolitan & Pelabuhan Tanjung Perak' },
  { id: 'city_sda', name: 'Kabupaten Sidoarjo', type: 'regency', category: 'kabupaten', lat: -7.4478, lng: 112.7183, province: 'Jawa Timur', island: 'Jawa' },
  { id: 'city_gresik', name: 'Kabupaten Gresik', type: 'regency', category: 'kabupaten', lat: -7.1567, lng: 112.6556, province: 'Jawa Timur', island: 'Jawa' },
  { id: 'city_mlg', name: 'Kota Malang', type: 'city', category: 'kota', lat: -7.9666, lng: 112.6326, province: 'Jawa Timur', island: 'Jawa' },
  { id: 'city_kab_mlg', name: 'Kabupaten Malang (Kepanjen)', type: 'regency', category: 'kabupaten', lat: -8.1306, lng: 112.5714, province: 'Jawa Timur', island: 'Jawa' },
  { id: 'city_batu', name: 'Kota Batu', type: 'city', category: 'kota', lat: -7.8712, lng: 112.5273, province: 'Jawa Timur', island: 'Jawa' },
  { id: 'city_mojokerto_kota', name: 'Kota Mojokerto', type: 'city', category: 'kota', lat: -7.4726, lng: 112.4385, province: 'Jawa Timur', island: 'Jawa' },
  { id: 'city_mojokerto_kab', name: 'Kabupaten Mojokerto', type: 'regency', category: 'kabupaten', lat: -7.5500, lng: 112.4500, province: 'Jawa Timur', island: 'Jawa' },
  { id: 'city_psr', name: 'Kota Pasuruan', type: 'city', category: 'kota', lat: -7.6453, lng: 112.9075, province: 'Jawa Timur', island: 'Jawa' },
  { id: 'city_kab_psr', name: 'Kabupaten Pasuruan (Bangil)', type: 'regency', category: 'kabupaten', lat: -7.5997, lng: 112.7933, province: 'Jawa Timur', island: 'Jawa' },
  { id: 'city_probolinggo', name: 'Kota Probolinggo', type: 'city', category: 'kota', lat: -7.7543, lng: 113.2159, province: 'Jawa Timur', island: 'Jawa' },
  { id: 'city_kab_probolinggo', name: 'Kabupaten Probolinggo (Kraksaan)', type: 'regency', category: 'kabupaten', lat: -7.7583, lng: 113.4333, province: 'Jawa Timur', island: 'Jawa' },
  { id: 'city_kdr', name: 'Kota Kediri', type: 'city', category: 'kota', lat: -7.8480, lng: 112.0178, province: 'Jawa Timur', island: 'Jawa' },
  { id: 'city_kab_kdr', name: 'Kabupaten Kediri (Pare/Ngasem)', type: 'regency', category: 'kabupaten', lat: -7.7700, lng: 112.1800, province: 'Jawa Timur', island: 'Jawa' },
  { id: 'city_blitar', name: 'Kota Blitar', type: 'city', category: 'kota', lat: -8.0983, lng: 112.1681, province: 'Jawa Timur', island: 'Jawa' },
  { id: 'city_mdn', name: 'Kota Madiun', type: 'city', category: 'kota', lat: -7.6298, lng: 111.5239, province: 'Jawa Timur', island: 'Jawa' },
  { id: 'city_jember', name: 'Kabupaten Jember', type: 'regency', category: 'kabupaten', lat: -8.1845, lng: 113.6681, province: 'Jawa Timur', island: 'Jawa' },
  { id: 'city_bwi', name: 'Kabupaten Banyuwangi', type: 'regency', category: 'kabupaten', lat: -8.2192, lng: 114.3691, province: 'Jawa Timur', island: 'Jawa' },
  { id: 'city_lumajang', name: 'Kabupaten Lumajang', type: 'regency', category: 'kabupaten', lat: -8.1333, lng: 113.2167, province: 'Jawa Timur', island: 'Jawa' },
  { id: 'city_bondowoso', name: 'Kabupaten Bondowoso', type: 'regency', category: 'kabupaten', lat: -7.9136, lng: 113.8214, province: 'Jawa Timur', island: 'Jawa' },
  { id: 'city_situbondo', name: 'Kabupaten Situbondo', type: 'regency', category: 'kabupaten', lat: -7.7064, lng: 114.0047, province: 'Jawa Timur', island: 'Jawa' },
  { id: 'city_tuban', name: 'Kabupaten Tuban', type: 'regency', category: 'kabupaten', lat: -6.8978, lng: 112.0644, province: 'Jawa Timur', island: 'Jawa' },
  { id: 'city_lamongan', name: 'Kabupaten Lamongan', type: 'regency', category: 'kabupaten', lat: -7.1197, lng: 112.4144, province: 'Jawa Timur', island: 'Jawa' },
  { id: 'city_bojonegoro', name: 'Kabupaten Bojonegoro', type: 'regency', category: 'kabupaten', lat: -7.1500, lng: 111.8817, province: 'Jawa Timur', island: 'Jawa' },
  { id: 'city_nganjuk', name: 'Kabupaten Nganjuk', type: 'regency', category: 'kabupaten', lat: -7.6053, lng: 111.9036, province: 'Jawa Timur', island: 'Jawa' },
  { id: 'city_jombang', name: 'Kabupaten Jombang', type: 'regency', category: 'kabupaten', lat: -7.5458, lng: 112.2331, province: 'Jawa Timur', island: 'Jawa' },
  { id: 'city_tulungagung', name: 'Kabupaten Tulungagung', type: 'regency', category: 'kabupaten', lat: -8.0667, lng: 111.9000, province: 'Jawa Timur', island: 'Jawa' },
  { id: 'city_trenggalek', name: 'Kabupaten Trenggalek', type: 'regency', category: 'kabupaten', lat: -8.0500, lng: 111.7167, province: 'Jawa Timur', island: 'Jawa' },
  { id: 'city_ponorogo', name: 'Kabupaten Ponorogo', type: 'regency', category: 'kabupaten', lat: -7.8692, lng: 111.4625, province: 'Jawa Timur', island: 'Jawa' },
  { id: 'city_pacitan', name: 'Kabupaten Pacitan', type: 'regency', category: 'kabupaten', lat: -8.2044, lng: 111.0928, province: 'Jawa Timur', island: 'Jawa' },
  { id: 'city_magetan', name: 'Kabupaten Magetan', type: 'regency', category: 'kabupaten', lat: -7.6492, lng: 111.3283, province: 'Jawa Timur', island: 'Jawa' },
  { id: 'city_ngawi', name: 'Kabupaten Ngawi', type: 'regency', category: 'kabupaten', lat: -7.4039, lng: 111.4456, province: 'Jawa Timur', island: 'Jawa' },
  { id: 'city_bangkalan', name: 'Bangkalan (Madura)', type: 'regency', category: 'kabupaten', lat: -7.0306, lng: 112.7483, province: 'Jawa Timur', island: 'Jawa' },
  { id: 'city_sampang', name: 'Sampang (Madura)', type: 'regency', category: 'kabupaten', lat: -7.1878, lng: 113.2394, province: 'Jawa Timur', island: 'Jawa' },
  { id: 'city_pamekasan', name: 'Pamekasan (Madura)', type: 'regency', category: 'kabupaten', lat: -7.1583, lng: 113.4739, province: 'Jawa Timur', island: 'Jawa' },
  { id: 'city_sumenep', name: 'Sumenep (Madura)', type: 'regency', category: 'kabupaten', lat: -7.0167, lng: 113.8667, province: 'Jawa Timur', island: 'Jawa' },

  // Bali & Nusa Tenggara
  { id: 'city_dps', name: 'Kota Denpasar', type: 'city', category: 'kota', lat: -8.6705, lng: 115.2126, province: 'Bali', island: 'Bali' },
  { id: 'city_badung', name: 'Badung (Kuta / Canggu)', type: 'regency', category: 'kabupaten', lat: -8.5833, lng: 115.1833, province: 'Bali', island: 'Bali' },
  { id: 'city_gianyar', name: 'Gianyar (Ubud)', type: 'regency', category: 'kabupaten', lat: -8.5414, lng: 115.3253, province: 'Bali', island: 'Bali' },
  { id: 'city_singaraja', name: 'Buleleng (Singaraja)', type: 'city', category: 'kota', lat: -8.1120, lng: 115.0882, province: 'Bali', island: 'Bali' },
  { id: 'city_tabanan', name: 'Kabupaten Tabanan', type: 'regency', category: 'kabupaten', lat: -8.5411, lng: 115.1253, province: 'Bali', island: 'Bali' },
  { id: 'city_karangasem', name: 'Karangasem (Amlapura)', type: 'regency', category: 'kabupaten', lat: -8.4500, lng: 115.6167, province: 'Bali', island: 'Bali' },
  { id: 'city_mataram', name: 'Kota Mataram', type: 'city', category: 'kota', lat: -8.5833, lng: 116.1167, province: 'Nusa Tenggara Barat', island: 'Nusa Tenggara' },
  { id: 'city_lobar', name: 'Lombok Barat (Gerung)', type: 'regency', category: 'kabupaten', lat: -8.6833, lng: 116.1167, province: 'Nusa Tenggara Barat', island: 'Nusa Tenggara' },
  { id: 'city_loteng', name: 'Lombok Tengah (Praya / Mandalika)', type: 'regency', category: 'kabupaten', lat: -8.7050, lng: 116.2750, province: 'Nusa Tenggara Barat', island: 'Nusa Tenggara' },
  { id: 'city_lotim', name: 'Lombok Timur (Selong)', type: 'regency', category: 'kabupaten', lat: -8.6500, lng: 116.5333, province: 'Nusa Tenggara Barat', island: 'Nusa Tenggara' },
  { id: 'city_sumbawa', name: 'Sumbawa (Sumbawa Besar)', type: 'regency', category: 'kabupaten', lat: -8.5000, lng: 117.4333, province: 'Nusa Tenggara Barat', island: 'Nusa Tenggara' },
  { id: 'city_dompu', name: 'Kabupaten Dompu', type: 'regency', category: 'kabupaten', lat: -8.5333, lng: 118.4500, province: 'Nusa Tenggara Barat', island: 'Nusa Tenggara' },
  { id: 'city_bima', name: 'Kota Bima', type: 'city', category: 'kota', lat: -8.4609, lng: 118.7275, province: 'Nusa Tenggara Barat', island: 'Nusa Tenggara' },
  { id: 'city_kpg', name: 'Kota Kupang', type: 'city', category: 'kota', lat: -10.1772, lng: 123.6070, province: 'Nusa Tenggara Timur', island: 'Nusa Tenggara' },
  { id: 'city_lbj', name: 'Manggarai Barat (Labuan Bajo)', type: 'city', category: 'kota', lat: -8.4964, lng: 119.8877, province: 'Nusa Tenggara Timur', island: 'Nusa Tenggara', description: 'Gerbang Taman Nasional Komodo' },
  { id: 'city_ruteng', name: 'Manggarai (Ruteng)', type: 'regency', category: 'kabupaten', lat: -8.6133, lng: 120.4722, province: 'Nusa Tenggara Timur', island: 'Nusa Tenggara' },
  { id: 'city_ende', name: 'Kabupaten Ende (Kelimutu)', type: 'city', category: 'kota', lat: -8.8432, lng: 121.6623, province: 'Nusa Tenggara Timur', island: 'Nusa Tenggara' },
  { id: 'city_maumere', name: 'Sikka (Maumere)', type: 'city', category: 'kota', lat: -8.6199, lng: 122.2111, province: 'Nusa Tenggara Timur', island: 'Nusa Tenggara' },
  { id: 'city_larantuka', name: 'Flores Timur (Larantuka)', type: 'regency', category: 'kabupaten', lat: -8.3417, lng: 122.9833, province: 'Nusa Tenggara Timur', island: 'Nusa Tenggara' },
  { id: 'city_waingapu', name: 'Sumba Timur (Waingapu)', type: 'regency', category: 'kabupaten', lat: -9.6500, lng: 120.2667, province: 'Nusa Tenggara Timur', island: 'Nusa Tenggara' },
  { id: 'city_waikabubak', name: 'Sumba Barat (Waikabubak)', type: 'regency', category: 'kabupaten', lat: -9.6333, lng: 119.3000, province: 'Nusa Tenggara Timur', island: 'Nusa Tenggara' },
  { id: 'city_alor_kab', name: 'Alor (Kalabahi)', type: 'regency', category: 'kabupaten', lat: -8.2197, lng: 124.5194, province: 'Nusa Tenggara Timur', island: 'Nusa Tenggara' },

  // Sumatera
  { id: 'city_btj', name: 'Kota Banda Aceh', type: 'city', category: 'kota', lat: 5.5483, lng: 95.3238, province: 'Aceh', island: 'Sumatera' },
  { id: 'city_lhokseumawe', name: 'Kota Lhokseumawe', type: 'city', category: 'kota', lat: 5.1804, lng: 97.1399, province: 'Aceh', island: 'Sumatera' },
  { id: 'city_langsa', name: 'Kota Langsa', type: 'city', category: 'kota', lat: 4.4756, lng: 97.9683, province: 'Aceh', island: 'Sumatera' },
  { id: 'city_meulaboh', name: 'Aceh Barat (Meulaboh)', type: 'regency', category: 'kabupaten', lat: 4.1444, lng: 96.1286, province: 'Aceh', island: 'Sumatera' },
  { id: 'city_mdn_sumut', name: 'Kota Medan', type: 'city', category: 'kota', lat: 3.5952, lng: 98.6722, province: 'Sumatera Utara', island: 'Sumatera' },
  { id: 'city_binjai', name: 'Kota Binjai', type: 'city', category: 'kota', lat: 3.6006, lng: 98.4854, province: 'Sumatera Utara', island: 'Sumatera' },
  { id: 'city_siantar', name: 'Kota Pematangsiantar', type: 'city', category: 'kota', lat: 2.9593, lng: 99.0687, province: 'Sumatera Utara', island: 'Sumatera' },
  { id: 'city_tebingtinggi', name: 'Kota Tebing Tinggi', type: 'city', category: 'kota', lat: 3.3285, lng: 99.1625, province: 'Sumatera Utara', island: 'Sumatera' },
  { id: 'city_toba', name: 'Toba (Balige / Danau Toba)', type: 'regency', category: 'kabupaten', lat: 2.3333, lng: 99.0667, province: 'Sumatera Utara', island: 'Sumatera' },
  { id: 'city_karo', name: 'Karo (Berastagi / Kabanjahe)', type: 'regency', category: 'kabupaten', lat: 3.1833, lng: 98.5000, province: 'Sumatera Utara', island: 'Sumatera' },
  { id: 'city_sibolga', name: 'Kota Sibolga', type: 'city', category: 'kota', lat: 1.7428, lng: 98.7792, province: 'Sumatera Utara', island: 'Sumatera' },
  { id: 'city_padangsidimpuan', name: 'Kota Padangsidimpuan', type: 'city', category: 'kota', lat: 1.3736, lng: 99.2731, province: 'Sumatera Utara', island: 'Sumatera' },
  { id: 'city_pdg', name: 'Kota Padang', type: 'city', category: 'kota', lat: -0.9471, lng: 100.4172, province: 'Sumatera Barat', island: 'Sumatera' },
  { id: 'city_bkt', name: 'Kota Bukittinggi', type: 'city', category: 'kota', lat: -0.3055, lng: 100.3692, province: 'Sumatera Barat', island: 'Sumatera' },
  { id: 'city_payakumbuh', name: 'Kota Payakumbuh', type: 'city', category: 'kota', lat: -0.2244, lng: 100.6308, province: 'Sumatera Barat', island: 'Sumatera' },
  { id: 'city_solok', name: 'Kota Solok', type: 'city', category: 'kota', lat: -0.7989, lng: 100.6558, province: 'Sumatera Barat', island: 'Sumatera' },
  { id: 'city_pariaman', name: 'Kota Pariaman', type: 'city', category: 'kota', lat: -0.6264, lng: 100.1206, province: 'Sumatera Barat', island: 'Sumatera' },
  { id: 'city_pbr', name: 'Kota Pekanbaru', type: 'city', category: 'kota', lat: 0.5071, lng: 101.4478, province: 'Riau', island: 'Sumatera' },
  { id: 'city_dumai', name: 'Kota Dumai', type: 'city', category: 'kota', lat: 1.6815, lng: 101.4456, province: 'Riau', island: 'Sumatera' },
  { id: 'city_duri', name: 'Bengkalis (Duri)', type: 'city', category: 'kota', lat: 1.2747, lng: 101.2153, province: 'Riau', island: 'Sumatera' },
  { id: 'city_batam', name: 'Kota Batam', type: 'city', category: 'kota', lat: 1.1301, lng: 104.0529, province: 'Kepulauan Riau', island: 'Sumatera', description: 'Kawasan Perdagangan Bebas Internasional' },
  { id: 'city_tnj', name: 'Kota Tanjungpinang', type: 'city', category: 'kota', lat: 0.9167, lng: 104.4500, province: 'Kepulauan Riau', island: 'Sumatera' },
  { id: 'city_bintan', name: 'Kabupaten Bintan', type: 'regency', category: 'kabupaten', lat: 1.0500, lng: 104.5333, province: 'Kepulauan Riau', island: 'Sumatera' },
  { id: 'city_karimun', name: 'Kabupaten Karimun (Tanjung Balai)', type: 'regency', category: 'kabupaten', lat: 1.0000, lng: 103.4333, province: 'Kepulauan Riau', island: 'Sumatera' },
  { id: 'city_jambi', name: 'Kota Jambi', type: 'city', category: 'kota', lat: -1.6101, lng: 103.6131, province: 'Jambi', island: 'Sumatera' },
  { id: 'city_sungaipenuh', name: 'Kota Sungai Penuh', type: 'city', category: 'kota', lat: -2.0622, lng: 101.3936, province: 'Jambi', island: 'Sumatera' },
  { id: 'city_muarojambi', name: 'Kabupaten Muaro Jambi', type: 'regency', category: 'kabupaten', lat: -1.5500, lng: 103.7500, province: 'Jambi', island: 'Sumatera' },
  { id: 'city_plm', name: 'Kota Palembang', type: 'city', category: 'kota', lat: -2.9761, lng: 104.7754, province: 'Sumatera Selatan', island: 'Sumatera' },
  { id: 'city_prabumulih', name: 'Kota Prabumulih', type: 'city', category: 'kota', lat: -3.4314, lng: 104.2344, province: 'Sumatera Selatan', island: 'Sumatera' },
  { id: 'city_lubuklinggau', name: 'Kota Lubuklinggau', type: 'city', category: 'kota', lat: -3.2944, lng: 102.8617, province: 'Sumatera Selatan', island: 'Sumatera' },
  { id: 'city_pagaralam', name: 'Kota Pagar Alam (Gn. Dempo)', type: 'city', category: 'kota', lat: -4.0167, lng: 103.2667, province: 'Sumatera Selatan', island: 'Sumatera' },
  { id: 'city_bkl', name: 'Kota Bengkulu', type: 'city', category: 'kota', lat: -3.8004, lng: 102.2655, province: 'Bengkulu', island: 'Sumatera' },
  { id: 'city_curup', name: 'Rejang Lebong (Curup)', type: 'regency', category: 'kabupaten', lat: -3.4667, lng: 102.5333, province: 'Bengkulu', island: 'Sumatera' },
  { id: 'city_bdl', name: 'Kota Bandar Lampung', type: 'city', category: 'kota', lat: -5.4292, lng: 105.2625, province: 'Lampung', island: 'Sumatera' },
  { id: 'city_metro', name: 'Kota Metro', type: 'city', category: 'kota', lat: -5.1136, lng: 105.3067, province: 'Lampung', island: 'Sumatera' },
  { id: 'city_lamsel', name: 'Lampung Selatan (Kalianda/Bakauheni)', type: 'regency', category: 'kabupaten', lat: -5.7333, lng: 105.5833, province: 'Lampung', island: 'Sumatera' },
  { id: 'city_pkp', name: 'Kota Pangkalpinang', type: 'city', category: 'kota', lat: -2.1316, lng: 106.1169, province: 'Bangka Belitung', island: 'Sumatera' },
  { id: 'city_tanjungpandan', name: 'Belitung (Tanjung Pandan)', type: 'regency', category: 'kabupaten', lat: -2.7333, lng: 107.6333, province: 'Bangka Belitung', island: 'Sumatera' },

  // Kalimantan
  { id: 'city_pnk', name: 'Kota Pontianak', type: 'city', category: 'kota', lat: -0.0263, lng: 109.3425, province: 'Kalimantan Barat', island: 'Kalimantan', description: 'Tugu Khatulistiwa 0°' },
  { id: 'city_skw', name: 'Kota Singkawang', type: 'city', category: 'kota', lat: 0.9069, lng: 108.9868, province: 'Kalimantan Barat', island: 'Kalimantan' },
  { id: 'city_ketapang', name: 'Kabupaten Ketapang', type: 'regency', category: 'kabupaten', lat: -1.8500, lng: 109.9833, province: 'Kalimantan Barat', island: 'Kalimantan' },
  { id: 'city_sintang', name: 'Kabupaten Sintang', type: 'regency', category: 'kabupaten', lat: 0.0667, lng: 111.5000, province: 'Kalimantan Barat', island: 'Kalimantan' },
  { id: 'city_pky', name: 'Kota Palangkaraya', type: 'city', category: 'kota', lat: -2.2161, lng: 113.9140, province: 'Kalimantan Tengah', island: 'Kalimantan' },
  { id: 'city_sampit', name: 'Kotawaringin Timur (Sampit)', type: 'regency', category: 'kabupaten', lat: -2.5333, lng: 112.9500, province: 'Kalimantan Tengah', island: 'Kalimantan' },
  { id: 'city_pangkalanbun', name: 'Kotawaringin Barat (Pangkalan Bun)', type: 'regency', category: 'kabupaten', lat: -2.6833, lng: 111.6167, province: 'Kalimantan Tengah', island: 'Kalimantan' },
  { id: 'city_bjm', name: 'Kota Banjarmasin', type: 'city', category: 'kota', lat: -3.3194, lng: 114.5908, province: 'Kalimantan Selatan', island: 'Kalimantan' },
  { id: 'city_bjb', name: 'Kota Banjarbaru', type: 'city', category: 'kota', lat: -3.4402, lng: 114.8306, province: 'Kalimantan Selatan', island: 'Kalimantan' },
  { id: 'city_martapura', name: 'Kabupaten Banjar (Martapura)', type: 'regency', category: 'kabupaten', lat: -3.4167, lng: 114.8500, province: 'Kalimantan Selatan', island: 'Kalimantan' },
  { id: 'city_bpn', name: 'Kota Balikpapan', type: 'city', category: 'kota', lat: -1.2379, lng: 116.8529, province: 'Kalimantan Timur', island: 'Kalimantan' },
  { id: 'city_smd', name: 'Kota Samarinda', type: 'city', category: 'kota', lat: -0.5022, lng: 117.1536, province: 'Kalimantan Timur', island: 'Kalimantan' },
  { id: 'city_bontang', name: 'Kota Bontang', type: 'city', category: 'kota', lat: 0.1333, lng: 117.5000, province: 'Kalimantan Timur', island: 'Kalimantan' },
  { id: 'city_ikn', name: 'IKN Nusantara (KIPP Sepaku)', type: 'city', category: 'kota', lat: -0.9739, lng: 116.7088, province: 'Kalimantan Timur', island: 'Kalimantan', description: 'Ibu Kota Nusantara Indonesia' },
  { id: 'city_tenggarong', name: 'Kutai Kartanegara (Tenggarong)', type: 'regency', category: 'kabupaten', lat: -0.4167, lng: 116.9833, province: 'Kalimantan Timur', island: 'Kalimantan' },
  { id: 'city_sangatta', name: 'Kutai Timur (Sangatta)', type: 'regency', category: 'kabupaten', lat: 0.5000, lng: 117.5500, province: 'Kalimantan Timur', island: 'Kalimantan' },
  { id: 'city_tarakan', name: 'Kota Tarakan', type: 'city', category: 'kota', lat: 3.3272, lng: 117.5786, province: 'Kalimantan Utara', island: 'Kalimantan' },
  { id: 'city_tanjungselor', name: 'Bulungan (Tanjung Selor)', type: 'city', category: 'kota', lat: 2.8333, lng: 117.3667, province: 'Kalimantan Utara', island: 'Kalimantan' },

  // Sulawesi
  { id: 'city_mks', name: 'Kota Makassar', type: 'city', category: 'kota', lat: -5.1477, lng: 119.4327, province: 'Sulawesi Selatan', island: 'Sulawesi', description: 'Hub Maritim & Gerbang Indonesia Timur' },
  { id: 'city_gowa', name: 'Kabupaten Gowa (Sungguminasa)', type: 'regency', category: 'kabupaten', lat: -5.2000, lng: 119.4500, province: 'Sulawesi Selatan', island: 'Sulawesi' },
  { id: 'city_maros', name: 'Kabupaten Maros (Rammang-Rammang)', type: 'regency', category: 'kabupaten', lat: -5.0000, lng: 119.5667, province: 'Sulawesi Selatan', island: 'Sulawesi' },
  { id: 'city_pare', name: 'Kota Parepare', type: 'city', category: 'kota', lat: -4.0134, lng: 119.6247, province: 'Sulawesi Selatan', island: 'Sulawesi' },
  { id: 'city_palopo', name: 'Kota Palopo', type: 'city', category: 'kota', lat: -2.9944, lng: 120.1969, province: 'Sulawesi Selatan', island: 'Sulawesi' },
  { id: 'city_bone', name: 'Bone (Watampone)', type: 'regency', category: 'kabupaten', lat: -4.5386, lng: 120.3278, province: 'Sulawesi Selatan', island: 'Sulawesi' },
  { id: 'city_mdo', name: 'Kota Manado', type: 'city', category: 'kota', lat: 1.4748, lng: 124.8421, province: 'Sulawesi Utara', island: 'Sulawesi' },
  { id: 'city_bitung', name: 'Kota Bitung (Pelabuhan Samudera)', type: 'city', category: 'kota', lat: 1.4404, lng: 125.1217, province: 'Sulawesi Utara', island: 'Sulawesi' },
  { id: 'city_tomohon', name: 'Kota Tomohon (Kota Bunga & Vulkan)', type: 'city', category: 'kota', lat: 1.3283, lng: 124.8406, province: 'Sulawesi Utara', island: 'Sulawesi' },
  { id: 'city_kotamobagu', name: 'Kota Kotamobagu', type: 'city', category: 'kota', lat: 0.7303, lng: 124.3139, province: 'Sulawesi Utara', island: 'Sulawesi' },
  { id: 'city_palu', name: 'Kota Palu', type: 'city', category: 'kota', lat: -0.9003, lng: 119.8779, province: 'Sulawesi Tengah', island: 'Sulawesi' },
  { id: 'city_luwuk', name: 'Banggai (Luwuk)', type: 'regency', category: 'kabupaten', lat: -0.9500, lng: 122.7833, province: 'Sulawesi Tengah', island: 'Sulawesi' },
  { id: 'city_tolitoli', name: 'Kabupaten Toli-Toli', type: 'regency', category: 'kabupaten', lat: 1.0333, lng: 120.8167, province: 'Sulawesi Tengah', island: 'Sulawesi' },
  { id: 'city_poso', name: 'Kabupaten Poso (Danau Poso)', type: 'regency', category: 'kabupaten', lat: -1.3958, lng: 120.7528, province: 'Sulawesi Tengah', island: 'Sulawesi' },
  { id: 'city_kdi', name: 'Kota Kendari', type: 'city', category: 'kota', lat: -3.9985, lng: 122.5126, province: 'Sulawesi Tenggara', island: 'Sulawesi' },
  { id: 'city_baubau', name: 'Kota Baubau (Buton)', type: 'city', category: 'kota', lat: -5.4667, lng: 122.6000, province: 'Sulawesi Tenggara', island: 'Sulawesi' },
  { id: 'city_gtlo', name: 'Kota Gorontalo', type: 'city', category: 'kota', lat: 0.5435, lng: 123.0568, province: 'Gorontalo', island: 'Sulawesi' },
  { id: 'city_mamuju', name: 'Mamuju', type: 'city', category: 'kota', lat: -2.6748, lng: 118.8885, province: 'Sulawesi Barat', island: 'Sulawesi' },
  { id: 'city_polewali', name: 'Polewali Mandar (Polman)', type: 'regency', category: 'kabupaten', lat: -3.4333, lng: 119.3333, province: 'Sulawesi Barat', island: 'Sulawesi' },

  // Maluku & Papua
  { id: 'city_ambon', name: 'Kota Ambon', type: 'city', category: 'kota', lat: -3.6547, lng: 128.1906, province: 'Maluku', island: 'Maluku' },
  { id: 'city_tual', name: 'Kota Tual', type: 'city', category: 'kota', lat: -5.6293, lng: 132.7486, province: 'Maluku', island: 'Maluku' },
  { id: 'city_ternate', name: 'Kota Ternate', type: 'city', category: 'kota', lat: 0.7893, lng: 127.3786, province: 'Maluku Utara', island: 'Maluku' },
  { id: 'city_tidore', name: 'Kota Tidore Kepulauan', type: 'city', category: 'kota', lat: 0.6900, lng: 127.4400, province: 'Maluku Utara', island: 'Maluku' },
  { id: 'city_sofifi', name: 'Sofifi (Pusat Pemprov Malut)', type: 'city', category: 'kota', lat: 0.7167, lng: 127.5667, province: 'Maluku Utara', island: 'Maluku' },
  { id: 'city_jpr', name: 'Kota Jayapura', type: 'city', category: 'kota', lat: -2.5489, lng: 140.7181, province: 'Papua', island: 'Papua' },
  { id: 'city_kab_jpr', name: 'Kabupaten Jayapura (Sentani)', type: 'regency', category: 'kabupaten', lat: -2.5667, lng: 140.5167, province: 'Papua', island: 'Papua' },
  { id: 'city_biak', name: 'Biak Numfor', type: 'regency', category: 'kabupaten', lat: -1.1833, lng: 136.0833, province: 'Papua', island: 'Papua' },
  { id: 'city_sorong', name: 'Kota Sorong', type: 'city', category: 'kota', lat: -0.8762, lng: 131.2558, province: 'Papua Barat Daya', island: 'Papua' },
  { id: 'city_mkw', name: 'Manokwari', type: 'city', category: 'kota', lat: -0.8615, lng: 134.0620, province: 'Papua Barat', island: 'Papua' },
  { id: 'city_fakfak', name: 'Kabupaten Fakfak', type: 'regency', category: 'kabupaten', lat: -2.9333, lng: 132.3000, province: 'Papua Barat', island: 'Papua' },
  { id: 'city_kaimana', name: 'Kabupaten Kaimana', type: 'regency', category: 'kabupaten', lat: -3.6667, lng: 133.7667, province: 'Papua Barat', island: 'Papua' },
  { id: 'city_mrk', name: 'Merauke', type: 'city', category: 'kota', lat: -8.4991, lng: 140.4049, province: 'Papua Selatan', island: 'Papua', description: 'Ujung Timur NKRI' },
  { id: 'city_timika', name: 'Mimika (Timika)', type: 'city', category: 'kota', lat: -4.5467, lng: 136.8837, province: 'Papua Tengah', island: 'Papua' },
  { id: 'city_nabire', name: 'Nabire', type: 'city', category: 'kota', lat: -3.3667, lng: 135.5000, province: 'Papua Tengah', island: 'Papua' },
  { id: 'city_wamena', name: 'Jayawijaya (Wamena)', type: 'city', category: 'kota', lat: -4.0988, lng: 138.9442, province: 'Papua Pegunungan', island: 'Papua', description: 'Lembah Baliem Pegunungan Tengah' },
];

/**
 * DAERAH PELOSOK, WILAYAH 3T (TERDEPAN, TERLUAR, TERTINGGAL),
 * KEPULAUAN TERPENCIL, DAN KAWASAN PERBATASAN NKRI
 */
export const INDONESIA_REMOTE_AREAS: GeoPlace[] = [
  // Titik Ujung & Perbatasan Utama NKRI
  { id: 'rem_sabang', name: 'Sabang (Pulau Weh)', type: 'remote', category: 'pelosok', lat: 5.8929, lng: 95.3164, province: 'Aceh', island: 'Sumatera', description: 'Titik 0 Km Paling Barat Indonesia' },
  { id: 'rem_miangas', name: 'Pulau Miangas', type: 'remote', category: 'pelosok', lat: 5.5667, lng: 126.5833, province: 'Sulawesi Utara', island: 'Sulawesi', description: 'Pulau Terluar Paling Utara NKRI (Perbatasan Filipina)' },
  { id: 'rem_rote', name: 'Rote Ndao (Pulau Rote)', type: 'remote', category: 'pelosok', lat: -10.7333, lng: 123.1333, province: 'Nusa Tenggara Timur', island: 'Nusa Tenggara', description: 'Titik Paling Selatan NKRI' },
  { id: 'rem_sota', name: 'Sota (Merauke - PNG Border)', type: 'remote', category: 'pelosok', lat: -8.4312, lng: 141.0205, province: 'Papua Selatan', island: 'Papua', description: 'Perbatasan Darat Indonesia - Papua Nugini' },
  { id: 'rem_sebatik', name: 'Pulau Sebatik (Perbatasan RI-Malaysia)', type: 'remote', category: 'pelosok', lat: 4.1667, lng: 117.7500, province: 'Kalimantan Utara', island: 'Kalimantan', description: 'Pulau Terbagi Dua Negara (RI-Malaysia)' },
  { id: 'rem_nunukan', name: 'Kabupaten Nunukan', type: 'remote', category: 'pelosok', lat: 4.1333, lng: 117.6667, province: 'Kalimantan Utara', island: 'Kalimantan', description: 'Kawasan Perbatasan & Lintas Batas Kaltara' },
  { id: 'rem_entikong', name: 'Entikong (PLBN Sanggau)', type: 'remote', category: 'pelosok', lat: 1.0167, lng: 110.3333, province: 'Kalimantan Barat', island: 'Kalimantan', description: 'Pos Lintas Batas Negara RI - Sarawak Malaysia' },
  { id: 'rem_aruk', name: 'Aruk (PLBN Sambas)', type: 'remote', category: 'pelosok', lat: 1.6333, lng: 109.6167, province: 'Kalimantan Barat', island: 'Kalimantan', description: 'Pos Lintas Batas Negara Terdepan Sambas' },
  { id: 'rem_badau', name: 'Badau (PLBN Kapuas Hulu)', type: 'remote', category: 'pelosok', lat: 0.9833, lng: 111.9000, province: 'Kalimantan Barat', island: 'Kalimantan', description: 'Perbatasan Pedalaman Jantung Kalimantan' },
  { id: 'rem_motaain', name: 'Motaain (PLBN Belu)', type: 'remote', category: 'pelosok', lat: -9.0500, lng: 124.9000, province: 'Nusa Tenggara Timur', island: 'Nusa Tenggara', description: 'Pos Lintas Batas Negara RI - Timor Leste' },
  { id: 'rem_skouwt', name: 'Skouw (PLBN Jayapura)', type: 'remote', category: 'pelosok', lat: -2.6167, lng: 140.8667, province: 'Papua', island: 'Papua', description: 'Gerbang Perbatasan Darat Muara Tami - Vanimo PNG' },

  // Kepulauan Terluar & Maritim 3T
  { id: 'rem_natuna', name: 'Kepulauan Natuna (Ranai)', type: 'remote', category: 'pelosok', lat: 3.9500, lng: 108.3833, province: 'Kepulauan Riau', island: 'Sumatera', description: 'Laut Natuna Utara / Kepulauan Terdepan' },
  { id: 'rem_anambas', name: 'Kepulauan Anambas (Tarempa)', type: 'remote', category: 'pelosok', lat: 3.2167, lng: 106.2167, province: 'Kepulauan Riau', island: 'Sumatera', description: 'Kepulauan Karang Eksotis Terluar di Laut Cina Selatan' },
  { id: 'rem_mentawai', name: 'Kepulauan Mentawai (Tuapejat / Siberut)', type: 'remote', category: 'pelosok', lat: -2.0167, lng: 99.5833, province: 'Sumatera Barat', island: 'Sumatera', description: 'Kepulauan Samudera Hindia Terpencil' },
  { id: 'rem_nias', name: 'Kepulauan Nias (Gunungsitoli)', type: 'remote', category: 'pelosok', lat: 1.2833, lng: 97.6167, province: 'Sumatera Utara', island: 'Sumatera', description: 'Kepulauan Pesisir Barat Sumatera' },
  { id: 'rem_simeulue', name: 'Kabupaten Simeulue (Sinabang)', type: 'remote', category: 'pelosok', lat: 2.6167, lng: 96.0833, province: 'Aceh', island: 'Sumatera', description: 'Pulau Terluar Pesisir Samudera Hindia Barat Aceh' },
  { id: 'rem_enggano', name: 'Pulau Enggano', type: 'remote', category: 'pelosok', lat: -5.3833, lng: 102.2667, province: 'Bengkulu', island: 'Sumatera', description: 'Pulau Samudera Terluar Paling Selatan Bengkulu' },
  { id: 'rem_bawean', name: 'Pulau Bawean (Sangkapura)', type: 'remote', category: 'pelosok', lat: -5.8500, lng: 112.6500, province: 'Jawa Timur', island: 'Jawa', description: 'Pulau Terpencil di Tengah Laut Jawa' },
  { id: 'rem_karimunjawa', name: 'Kepulauan Karimunjawa', type: 'remote', category: 'pelosok', lat: -5.8500, lng: 110.4333, province: 'Jawa Tengah', island: 'Jawa', description: 'Taman Nasional Laut Karimunjawa' },
  { id: 'rem_kangean', name: 'Kepulauan Kangean (Arjasa)', type: 'remote', category: 'pelosok', lat: -6.8667, lng: 115.3167, province: 'Jawa Timur', island: 'Jawa', description: 'Kepulauan Pelosok Timur Madura' },
  { id: 'rem_masalembu', name: 'Kepulauan Masalembu', type: 'remote', category: 'pelosok', lat: -5.5500, lng: 114.4333, province: 'Jawa Timur', island: 'Jawa', description: 'Kepulauan Segitiga Masalembu di Laut Jawa' },
  { id: 'rem_sabu', name: 'Kabupaten Sabu Raijua (Sebat)', type: 'remote', category: 'pelosok', lat: -10.5000, lng: 121.8333, province: 'Nusa Tenggara Timur', island: 'Nusa Tenggara', description: 'Pulau Terpencil di Laut Sawu' },
  { id: 'rem_lembata', name: 'Kabupaten Lembata (Lewoleba)', type: 'remote', category: 'pelosok', lat: -8.3833, lng: 123.5167, province: 'Nusa Tenggara Timur', island: 'Nusa Tenggara', description: 'Kawasan Vulkanik Ile Lewotolok' },
  { id: 'rem_alor_pantai', name: 'Kepulauan Alor (Pantai Pantar)', type: 'remote', category: 'pelosok', lat: -8.3500, lng: 124.2833, province: 'Nusa Tenggara Timur', island: 'Nusa Tenggara', description: 'Gugusan Selat Pantar & Terumbu Karang Pelosok' },
  { id: 'rem_selayar', name: 'Kepulauan Selayar (Benteng)', type: 'remote', category: 'pelosok', lat: -6.1167, lng: 120.4500, province: 'Sulawesi Selatan', island: 'Sulawesi', description: 'Taman Nasional Taka Bonerate (Atol Terbesar Ketiga Dunia)' },
  { id: 'rem_wakatobi', name: 'Wakatobi (Wangi-Wangi & Tomia)', type: 'remote', category: 'pelosok', lat: -5.3167, lng: 123.6000, province: 'Sulawesi Tenggara', island: 'Sulawesi', description: 'Taman Nasional Biosfer Laut Wakatobi' },
  { id: 'rem_togean', name: 'Kepulauan Togean (Wakai)', type: 'remote', category: 'pelosok', lat: -0.4167, lng: 121.8667, province: 'Sulawesi Tengah', island: 'Sulawesi', description: 'Kepulauan Karang Terpencil di Teluk Tomini' },
  { id: 'rem_banggai_kep', name: 'Banggai Kepulauan (Salakan)', type: 'remote', category: 'pelosok', lat: -1.3333, lng: 123.2500, province: 'Sulawesi Tengah', island: 'Sulawesi', description: 'Gugusan Pulau Karst & Danau Paisupok' },
  { id: 'rem_sangihe', name: 'Kepulauan Sangihe (Tahuna)', type: 'remote', category: 'pelosok', lat: 3.6167, lng: 125.4833, province: 'Sulawesi Utara', island: 'Sulawesi', description: 'Kepulauan Vulkanik Terluar Laut Sulawesi' },
  { id: 'rem_talaud', name: 'Kepulauan Talaud (Melonguane)', type: 'remote', category: 'pelosok', lat: 4.0000, lng: 126.6833, province: 'Sulawesi Utara', island: 'Sulawesi', description: 'Kabupaten Terluar Paling Utara Timur Indonesia' },
  { id: 'rem_sitaro', name: 'Sitaro (Ondong Siau / Karangetang)', type: 'remote', category: 'pelosok', lat: 2.7500, lng: 125.3833, province: 'Sulawesi Utara', island: 'Sulawesi', description: 'Pulau Vulkanik Aktif Karangetang' },
  { id: 'rem_morotai', name: 'Pulau Morotai (Daruba)', type: 'remote', category: 'pelosok', lat: 2.3333, lng: 128.4167, province: 'Maluku Utara', island: 'Maluku', description: 'Pulau Terdepan Pintu Masifik Samudera Pasifik' },
  { id: 'rem_sula', name: 'Kepulauan Sula (Sanana)', type: 'remote', category: 'pelosok', lat: -2.0667, lng: 125.9833, province: 'Maluku Utara', island: 'Maluku', description: 'Gugusan Kepulauan Rempah Sula' },
  { id: 'rem_taliabu', name: 'Pulau Taliabu (Bobong)', type: 'remote', category: 'pelosok', lat: -1.8333, lng: 124.8000, province: 'Maluku Utara', island: 'Maluku', description: 'Pulau Terpencil di Ujung Barat Maluku Utara' },
  { id: 'rem_banda', name: 'Kepulauan Banda (Banda Neira)', type: 'remote', category: 'pelosok', lat: -4.5244, lng: 129.9044, province: 'Maluku', island: 'Maluku', description: 'Kepulauan Bersejarah Pala & Cekungan Laut Banda' },
  { id: 'rem_aru', name: 'Kepulauan Aru (Dobo)', type: 'remote', category: 'pelosok', lat: -5.7667, lng: 134.2167, province: 'Maluku', island: 'Maluku', description: 'Gugusan Ratusan Pulau Terpencil di Laut Arafura' },
  { id: 'rem_tanimbar', name: 'Kepulauan Tanimbar (Saumlaki)', type: 'remote', category: 'pelosok', lat: -7.9833, lng: 131.3000, province: 'Maluku', island: 'Maluku', description: 'Wilayah Terluar Dekat Perairan Australia' },
  { id: 'rem_mbd', name: 'Maluku Barat Daya (Tiakur / Moa)', type: 'remote', category: 'pelosok', lat: -8.1833, lng: 127.9500, province: 'Maluku', island: 'Maluku', description: 'Gugusan Pulau Terdepan Perbatasan Timor Leste' },
  { id: 'rem_wetar', name: 'Pulau Wetar', type: 'remote', category: 'pelosok', lat: -7.8000, lng: 126.3000, province: 'Maluku', island: 'Maluku', description: 'Pulau Terpencil Berbukit di Perairan Banda' },
  { id: 'rem_raja_ampat', name: 'Raja Ampat (Waisai / Wayag)', type: 'remote', category: 'pelosok', lat: -0.4333, lng: 130.8167, province: 'Papua Barat Daya', island: 'Papua', description: 'Jantung Segitiga Terumbu Karang Dunia' },
  { id: 'rem_misool', name: 'Kepulauan Misool (Raja Ampat Selatan)', type: 'remote', category: 'pelosok', lat: -1.9000, lng: 130.2000, province: 'Papua Barat Daya', island: 'Papua', description: 'Laguna Karst Terpencil Misool' },

  // Daerah Pedalaman, Pegunungan Terpencil & Pelosok Dataran Tinggi
  { id: 'rem_dieng', name: 'Dataran Tinggi Dieng', type: 'remote', category: 'pelosok', lat: -7.2042, lng: 109.9042, province: 'Jawa Tengah', island: 'Jawa', description: 'Dataran Tinggi Dingin (Fenomena Embun Upas / Frost)' },
  { id: 'rem_bromo', name: 'Kaldera Bromo Tengger Semeru', type: 'remote', category: 'pelosok', lat: -7.9425, lng: 112.9530, province: 'Jawa Timur', island: 'Jawa', description: 'Lautan Pasir & Kawasan Vulkanik Bromo' },
  { id: 'rem_gayo', name: 'Dataran Tinggi Gayo (Takengon)', type: 'remote', category: 'pelosok', lat: 4.6333, lng: 96.8500, province: 'Aceh', island: 'Sumatera', description: 'Dataran Tinggi Danau Laut Tawar & Kopi Gayo' },
  { id: 'rem_kerinci', name: 'Kawasan Vulkanik Kerinci', type: 'remote', category: 'pelosok', lat: -1.6967, lng: 101.2642, province: 'Jambi', island: 'Sumatera', description: 'Puncak Tertinggi Sumatera (3.805 mdpl)' },
  { id: 'rem_toraja', name: 'Tana Toraja (Rantepao & Makale)', type: 'remote', category: 'pelosok', lat: -3.0000, lng: 119.8667, province: 'Sulawesi Selatan', island: 'Sulawesi', description: 'Lembah Pegunungan Budaya Megalitikum Toraja' },
  { id: 'rem_mamasa', name: 'Kabupaten Mamasa', type: 'remote', category: 'pelosok', lat: -2.9333, lng: 119.3833, province: 'Sulawesi Barat', island: 'Sulawesi', description: 'Kawasan Pegunungan Tinggi Terpencil Kondo Sapata' },
  { id: 'rem_bada', name: 'Lembah Bada (Taman Nasional Lore Lindu)', type: 'remote', category: 'pelosok', lat: -1.8667, lng: 120.2500, province: 'Sulawesi Tengah', island: 'Sulawesi', description: 'Situs Patung Megalitik Pedalaman Lembah Bada' },
  { id: 'rem_krayan', name: 'Dataran Tinggi Krayan (Perbatasan)', type: 'remote', category: 'pelosok', lat: 3.9167, lng: 115.7000, province: 'Kalimantan Utara', island: 'Kalimantan', description: 'Lembah Terisolasi Penghasil Beras Adan & Garam Gunung' },
  { id: 'rem_malinau_pedalaman', name: 'Malinau Hulu (Apo Kayan)', type: 'remote', category: 'pelosok', lat: 2.2500, lng: 115.1500, province: 'Kalimantan Utara', island: 'Kalimantan', description: 'Hutan Belantara Terpencil Jantung Borneo' },
  { id: 'rem_mahulu', name: 'Mahakam Ulu (Ujoh Bilang)', type: 'remote', category: 'pelosok', lat: 0.6000, lng: 115.3000, province: 'Kalimantan Timur', island: 'Kalimantan', description: 'Hulu Sungai Mahakam & Jeram Riam Halo' },
  { id: 'rem_kapuas_hulu', name: 'Kapuas Hulu (Putussibau / Danau Sentarum)', type: 'remote', category: 'pelosok', lat: 0.8667, lng: 112.9333, province: 'Kalimantan Barat', island: 'Kalimantan', description: 'Kawasan Konservasi Hutan Hujan Betung Kerihun' },
  { id: 'rem_murung_raya', name: 'Murung Raya (Puruk Cahu)', type: 'remote', category: 'pelosok', lat: -0.6167, lng: 114.5667, province: 'Kalimantan Tengah', island: 'Kalimantan', description: 'Ujung Utara Terpencil Kalimantan Tengah' },

  // Wilayah Pedalaman Papua Pegunungan & Rawa (3T)
  { id: 'rem_asmat', name: 'Asmat (Agats)', type: 'remote', category: 'pelosok', lat: -5.5417, lng: 138.1389, province: 'Papua Selatan', island: 'Papua', description: 'Kota di Atas Papan Rawa Bakau Laut Arafura' },
  { id: 'rem_bovendigoel', name: 'Boven Digoel (Tanah Merah)', type: 'remote', category: 'pelosok', lat: -6.0833, lng: 140.3000, province: 'Papua Selatan', island: 'Papua', description: 'Pedalaman Hutan Belantara Sungai Digoel' },
  { id: 'rem_mappi', name: 'Kabupaten Mappi (Kepi)', type: 'remote', category: 'pelosok', lat: -6.5167, lng: 139.3167, province: 'Papua Selatan', island: 'Papua', description: 'Daerah Aliran Sungai & Rawa Liar Pedalaman Papua' },
  { id: 'rem_puncak_jaya', name: 'Puncak Jaya (Kotamulia)', type: 'remote', category: 'pelosok', lat: -3.7333, lng: 137.9500, province: 'Papua Tengah', island: 'Papua', description: 'Lembah Pegunungan Tertinggi di Bawah Gletser Cartenz' },
  { id: 'rem_ilaga', name: 'Kabupaten Puncak (Ilaga)', type: 'remote', category: 'pelosok', lat: -3.9500, lng: 137.6667, province: 'Papua Tengah', island: 'Papua', description: 'Wilayah Terpencil Pegunungan Tengah Papua' },
  { id: 'rem_intanjaya', name: 'Intan Jaya (Sugapa)', type: 'remote', category: 'pelosok', lat: -3.7333, lng: 136.9833, province: 'Papua Tengah', island: 'Papua', description: 'Lembah Curam Pegunungan Terisolasi' },
  { id: 'rem_paniai', name: 'Paniai (Enarotali / Danau Paniai)', type: 'remote', category: 'pelosok', lat: -3.8833, lng: 136.3667, province: 'Papua Tengah', island: 'Papua', description: 'Danau Purba di Dataran Tinggi Papua' },
  { id: 'rem_pegbintang', name: 'Pegunungan Bintang (Oksibil)', type: 'remote', category: 'pelosok', lat: -4.9000, lng: 140.6333, province: 'Papua Pegunungan', island: 'Papua', description: 'Perbatasan Dataran Tinggi Timur PNG' },
  { id: 'rem_yahukimo', name: 'Yahukimo (Dekai)', type: 'remote', category: 'pelosok', lat: -4.8500, lng: 139.4833, province: 'Papua Pegunungan', island: 'Papua', description: 'Lembah Curam Ratusan Distrik Pedalaman' },
  { id: 'rem_tolikara', name: 'Tolikara (Karubaga)', type: 'remote', category: 'pelosok', lat: -3.5833, lng: 138.6167, province: 'Papua Pegunungan', island: 'Papua', description: 'Lereng Bukit Pegunungan Tengah' },
  { id: 'rem_lannyjaya', name: 'Lanny Jaya (Tiom)', type: 'remote', category: 'pelosok', lat: -3.8833, lng: 138.4833, province: 'Papua Pegunungan', island: 'Papua', description: 'Lembah Sejuk Pertanian Tradisional Papua' },
  { id: 'rem_nduga', name: 'Kabupaten Nduga (Kenyam)', type: 'remote', category: 'pelosok', lat: -4.4333, lng: 138.3167, province: 'Papua Pegunungan', island: 'Papua', description: 'Kawasan Pegunungan Terjal & Terisolasi' },
  { id: 'rem_yalimo', name: 'Kabupaten Yalimo (Elelim)', type: 'remote', category: 'pelosok', lat: -3.7500, lng: 139.3833, province: 'Papua Pegunungan', island: 'Papua', description: 'Lembah Lembah Hijau Suku Yali' },
];

/**
 * GABUNGAN SELURUH TITIK GEOSPASIAL INDONESIA
 * (Provinsi, Kota, Kabupaten, Pelosok 3T, Kepulauan Terluar)
 */
export const ALL_INDONESIA_PLACES: GeoPlace[] = [
  ...INDONESIA_PROVINCES,
  ...INDONESIA_CITIES,
  ...INDONESIA_REMOTE_AREAS,
];

/**
 * Pencarian Cepat & Komprehensif Titik Lokasi Indonesia
 * Mendukung filter nama, provinsi, kabupaten, pulau, dan tipe (provinsi/kota/kabupaten/pelosok)
 */
export function searchIndonesianPlaces(
  query = '',
  categoryFilter?: 'semua' | 'provinsi' | 'kota' | 'kabupaten' | 'pelosok' | 'pulau',
  islandFilter?: string
): GeoPlace[] {
  const cleanQ = query.trim().toLowerCase();

  return ALL_INDONESIA_PLACES.filter((place) => {
    // 1. Filter Kategori
    if (categoryFilter && categoryFilter !== 'semua') {
      if (categoryFilter === 'provinsi' && place.category !== 'provinsi') return false;
      if (categoryFilter === 'kota' && place.category !== 'kota') return false;
      if (categoryFilter === 'kabupaten' && place.category !== 'kabupaten') return false;
      if (categoryFilter === 'pelosok' && place.category !== 'pelosok') return false;
    }

    // 2. Filter Pulau
    if (islandFilter && islandFilter !== 'semua') {
      if (place.island?.toLowerCase() !== islandFilter.toLowerCase()) return false;
    }

    // 3. Filter Teks Query
    if (!cleanQ) return true;

    const nameMatch = place.name.toLowerCase().includes(cleanQ);
    const provMatch = place.province?.toLowerCase().includes(cleanQ) ?? false;
    const islandMatch = place.island?.toLowerCase().includes(cleanQ) ?? false;
    const descMatch = place.description?.toLowerCase().includes(cleanQ) ?? false;
    const regencyMatch = place.regency?.toLowerCase().includes(cleanQ) ?? false;

    return nameMatch || provMatch || islandMatch || descMatch || regencyMatch;
  });
}

/**
 * Mencari Titik Lokasi Terdekat Berdasarkan Koordinat GPS
 */
export function findNearestIndonesianPlace(lat: number, lng: number): {
  nearestCity?: GeoPlace;
  nearestProvince?: GeoPlace;
  nearestIsland?: GeoPlace;
  nearestRemote?: GeoPlace;
  summaryText: string;
} {
  const isIndonesia = lat >= -11.5 && lat <= 6.5 && lng >= 94.5 && lng <= 141.5;

  let nearestCity: GeoPlace | undefined;
  let minCityDist = Infinity;
  for (const c of INDONESIA_CITIES) {
    const d = Math.hypot(lat - c.lat, lng - c.lng);
    if (d < minCityDist) {
      minCityDist = d;
      nearestCity = c;
    }
  }

  let nearestProvince: GeoPlace | undefined;
  let minProvDist = Infinity;
  for (const p of INDONESIA_PROVINCES) {
    const d = Math.hypot(lat - p.lat, lng - p.lng);
    if (d < minProvDist) {
      minProvDist = d;
      nearestProvince = p;
    }
  }

  let nearestIsland: GeoPlace | undefined;
  let minIslandDist = Infinity;
  for (const isl of INDONESIA_ISLANDS) {
    const d = Math.hypot(lat - isl.lat, lng - isl.lng);
    if (d < minIslandDist) {
      minIslandDist = d;
      nearestIsland = isl;
    }
  }

  let nearestRemote: GeoPlace | undefined;
  let minRemoteDist = Infinity;
  for (const rem of INDONESIA_REMOTE_AREAS) {
    const d = Math.hypot(lat - rem.lat, lng - rem.lng);
    if (d < minRemoteDist) {
      minRemoteDist = d;
      nearestRemote = rem;
    }
  }

  if (!isIndonesia) {
    return {
      nearestCity,
      nearestProvince,
      nearestIsland,
      nearestRemote,
      summaryText: `Koordinat Global (${lat.toFixed(2)}°, ${lng.toFixed(2)}°)`,
    };
  }

  const cityName = nearestCity ? nearestCity.name : '';
  const provName = nearestProvince ? nearestProvince.name : '';
  const islandName = nearestIsland ? nearestIsland.name : '';

  let summaryText = provName ? `${provName}` : islandName;
  if (cityName && minCityDist * 111 < 120) {
    summaryText += ` • Sekitar ${cityName}`;
  }

  return {
    nearestCity,
    nearestProvince,
    nearestIsland,
    nearestRemote,
    summaryText,
  };
}
