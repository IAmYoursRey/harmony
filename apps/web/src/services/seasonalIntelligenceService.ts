/**
 * Seasonal Intelligence & Global Climate Zones Service
 * Deteksi cerdas musim global, perhitungan astronomis matahari, batas garis khatulistiwa,
 * garis balik tropis (Cancer & Capricorn), serta API cuaca konsensus global untuk seluruh negara di dunia.
 */

export interface SeasonalInfo {
  seasonName: string;
  seasonKey: 'hujan' | 'kemarau' | 'pancaroba' | 'spring' | 'summer' | 'autumn' | 'winter' | 'polar_day' | 'polar_night';
  zoneCategory: 'Tropis Ekuatorial' | 'Subtropis Belahan Utara' | 'Subtropis Belahan Selatan' | 'Zona Sedang' | 'Zona Kutub';
  seasonIcon: string;
  avgTempRange: string;
  typicalRainMmMonth: string;
  precipitationCharacteristic: string;
  monsoonWind: string;
  solarPositionInfo: string;
  distanceToEquatorKm: number;
  hemisphere: 'Utara' | 'Selatan' | 'Ekuator';
  dayLengthHours: number;
}

export interface EquatorMonument {
  name: string;
  location: string;
  country: string;
  lat: number;
  lng: number;
  description: string;
}

export const EQUATOR_MONUMENTS: EquatorMonument[] = [
  {
    name: 'Tugu Khatulistiwa Pontianak',
    location: 'Siantan, Kota Pontianak, Kalimantan Barat',
    country: 'Indonesia',
    lat: 0.0000,
    lng: 109.3214,
    description: 'Monumen bersejarah garis khatulistiwa didirikan tahun 1928, titik kulminasi matahari tanpa bayangan (21-23 Maret & September).',
  },
  {
    name: 'Tugu Equator Bonjol',
    location: 'Bonjol, Pasaman, Sumatera Barat',
    country: 'Indonesia',
    lat: 0.0000,
    lng: 100.2211,
    description: 'Tugu garis tengah bumi yang melintasi jalan lintas Sumatera tepat di perbukitan Bonjol.',
  },
  {
    name: 'Tugu Khatulistiwa Koto Kampar',
    location: 'Kampar, Riau',
    country: 'Indonesia',
    lat: 0.0000,
    lng: 100.7302,
    description: 'Tugu penanda garis lintang nol derajat di pulau Sumatera bagian timur.',
  },
  {
    name: 'Tugu Khatulistiwa Santigi',
    location: 'Parigi Moutong, Sulawesi Tengah',
    country: 'Indonesia',
    lat: 0.0000,
    lng: 120.0825,
    description: 'Titik persilangan garis khatulistiwa di semenanjung Sulawesi.',
  },
  {
    name: 'Tugu Khatulistiwa Payahe',
    location: 'Oba, Tidore Kepulauan, Maluku Utara',
    country: 'Indonesia',
    lat: 0.0000,
    lng: 127.8540,
    description: 'Garis khatulistiwa melintasi pulau Halmahera sebelum menuju Samudra Pasifik.',
  },
  {
    name: 'Mitad del Mundo',
    location: 'Quito, Pichincha',
    country: 'Ecuador',
    lat: 0.0000,
    lng: -78.4558,
    description: 'Monumen "Tengah Dunia" terkenal di kaki pegunungan Andes, Ekuador.',
  },
  {
    name: 'Nanyuki Equator Marker',
    location: 'Mount Kenya, Laikipia',
    country: 'Kenya',
    lat: 0.0000,
    lng: 37.0700,
    description: 'Penanda khatulistiwa di lereng Gunung Kenya Afrika Timur tempat demonstrasi efek Coriolis putaran air.',
  },
  {
    name: 'Equateur Marker Gabon',
    location: 'Lambaréné / Libreville',
    country: 'Gabon',
    lat: 0.0000,
    lng: 10.2500,
    description: 'Titik khatulistiwa di pesisir barat Afrika barat tengah.',
  },
];

class SeasonalIntelligenceService {
  /**
   * Menghitung status musim secara dinamis untuk koordinat mana pun di Bumi
   */
  public calculateSeason(lat: number, _lng: number, date: Date = new Date()): SeasonalInfo {
    const month = date.getMonth(); // 0 = Jan, 11 = Dec
    const day = date.getDate();
    const dayOfYear = this.getDayOfYear(date);

    // Hitung jarak ke khatulistiwa (1 derajat lintang ≈ 111.13 km)
    const distanceToEquatorKm = Math.round(Math.abs(lat) * 111.132);
    const hemisphere = Math.abs(lat) < 0.2 ? 'Ekuator' : lat > 0 ? 'Utara' : 'Selatan';

    // Estimasi panjang hari (Solar day length)
    const phi = (lat * Math.PI) / 180;
    const declination = 23.45 * Math.sin(((284 + dayOfYear) / 365) * 2 * Math.PI) * (Math.PI / 180);
    let hourAngle = -Math.tan(phi) * Math.tan(declination);
    hourAngle = Math.min(1, Math.max(-1, hourAngle));
    const dayLengthHours = parseFloat(( (2 / 15) * (Math.acos(hourAngle) * (180 / Math.PI)) ).toFixed(1));

    // Lintang Tropis: antara -23.4365° dan +23.4365°
    if (Math.abs(lat) <= 23.4365) {
      return this.calculateTropicalSeason(lat, month, distanceToEquatorKm, hemisphere, dayLengthHours);
    }

    // Lintang Subtropis & Sedang Belahan Bumi Utara (> +23.44° sampai +66.5°)
    if (lat > 23.4365 && lat <= 66.5) {
      return this.calculateNorthernTemperateSeason(distanceToEquatorKm, month, day, dayLengthHours);
    }

    // Lintang Subtropis & Sedang Belahan Bumi Selatan (< -23.44° sampai -66.5°)
    if (lat < -23.4365 && lat >= -66.5) {
      return this.calculateSouthernTemperateSeason(distanceToEquatorKm, month, day, dayLengthHours);
    }

    // Lintang Kutub (> 66.5° atau < -66.5°)
    return this.calculatePolarSeason(lat, month, distanceToEquatorKm, hemisphere, dayLengthHours);
  }

  private calculateTropicalSeason(
    lat: number,
    month: number,
    distanceToEquatorKm: number,
    hemisphere: 'Utara' | 'Selatan' | 'Ekuator',
    dayLengthHours: number
  ): SeasonalInfo {
    // Zona Ekuator Murni (±1.5° dari 0°)
    if (Math.abs(lat) <= 1.5) {
      const isPeakRain = month === 2 || month === 3 || month === 9 || month === 10; // Mar-Apr & Okt-Nov (Equinox Peaks)
      return {
        seasonName: isPeakRain ? 'Musim Hujan Ekuatorial (Puncak Ekuinoks)' : 'Musim Tropis Lembap Sepanjang Tahun',
        seasonKey: isPeakRain ? 'hujan' : 'pancaroba',
        zoneCategory: 'Tropis Ekuatorial',
        seasonIcon: isPeakRain ? '🌧️' : '⛅',
        avgTempRange: '25°C - 32°C',
        typicalRainMmMonth: isPeakRain ? '280 - 450 mm' : '150 - 240 mm',
        precipitationCharacteristic: 'Hujan konvektif lokal harian (zenithal) akibat pemanasan matahari tegak lurus.',
        monsoonWind: 'Zona Konvergensi Antar-Tropis (ITCZ) tepat di atas wilayah.',
        solarPositionInfo: `Tepat di sabuk khatulistiwa (${distanceToEquatorKm} km dari Garis Khatulistiwa 0°).`,
        distanceToEquatorKm,
        hemisphere,
        dayLengthHours: 12.0,
      };
    }

    // Tropis Belahan Bumi Selatan (Indonesia bagian Jawa, Bali, NTB, NTT, Papua Selatan, dll.)
    if (lat < -1.5) {
      // Nov - Mar: Musim Hujan (Monsun Barat Asia)
      if (month >= 10 || month <= 2) {
        return {
          seasonName: 'Musim Hujan (Monsun Asia Barat)',
          seasonKey: 'hujan',
          zoneCategory: 'Tropis Ekuatorial',
          seasonIcon: '🌧️',
          avgTempRange: '24°C - 31°C',
          typicalRainMmMonth: '250 - 500 mm',
          precipitationCharacteristic: 'Curah hujan tinggi disertai awan kumulonimbus tebal akibat massa udara basah dari Laut Cina Selatan.',
          monsoonWind: 'Angin Monsun Barat Laut (Monsun Basah Asia)',
          solarPositionInfo: `Matahari condong ke selatan (${distanceToEquatorKm} km selatan khatulistiwa).`,
          distanceToEquatorKm,
          hemisphere,
          dayLengthHours,
        };
      }
      // Apr - Mei: Pancaroba peralihan
      if (month === 3 || month === 4) {
        return {
          seasonName: 'Masa Pancaroba (Peralihan Hujan ke Kemarau)',
          seasonKey: 'pancaroba',
          zoneCategory: 'Tropis Ekuatorial',
          seasonIcon: '🌦️',
          avgTempRange: '26°C - 33°C',
          typicalRainMmMonth: '100 - 180 mm',
          precipitationCharacteristic: 'Cuaca terik di siang hari, potensi hujan lebat lokal berdurasi singkat disertai petir dan angin kencang di sore hari.',
          monsoonWind: 'Arah angin bervariasi / fluktuatif',
          solarPositionInfo: `Matahari melintas ke utara (${distanceToEquatorKm} km selatan khatulistiwa).`,
          distanceToEquatorKm,
          hemisphere,
          dayLengthHours,
        };
      }
      // Jun - Sep: Musim Kemarau (Monsun Australia)
      if (month >= 5 && month <= 8) {
        return {
          seasonName: 'Musim Kemarau (Monsun Australia Timur)',
          seasonKey: 'kemarau',
          zoneCategory: 'Tropis Ekuatorial',
          seasonIcon: '☀️',
          avgTempRange: '22°C - 33°C (Malam Dingin Bediding)',
          typicalRainMmMonth: '20 - 70 mm',
          precipitationCharacteristic: 'Tutupan awan minimal, kelembapan rendah, curah hujan jarang, fenomena bediding di malam-dini hari.',
          monsoonWind: 'Angin Monsun Tenggara Australia (Massa Udara Kering & Dingin)',
          solarPositionInfo: `Matahari berada di belahan bumi utara (${distanceToEquatorKm} km selatan khatulistiwa).`,
          distanceToEquatorKm,
          hemisphere,
          dayLengthHours,
        };
      }
      // Okt: Pancaroba peralihan ke hujan
      return {
        seasonName: 'Masa Pancaroba (Peralihan Kemarau ke Hujan)',
        seasonKey: 'pancaroba',
        zoneCategory: 'Tropis Ekuatorial',
        seasonIcon: '⛅',
        avgTempRange: '25°C - 34°C',
        typicalRainMmMonth: '120 - 200 mm',
        precipitationCharacteristic: 'Suhu maksimum tahunan meningkat, kelembapan mulai naik menandai datangnya musim basah.',
        monsoonWind: 'Mulai terbentuk tekanan rendah di selatan khatulistiwa.',
        solarPositionInfo: `Matahari kembali melintas ke selatan (${distanceToEquatorKm} km selatan khatulistiwa).`,
        distanceToEquatorKm,
        hemisphere,
        dayLengthHours,
      };
    }

    // Tropis Belahan Bumi Utara (Indonesia bagian Aceh, Malaysia, Filipina, Thailand, dll.)
    // Mei - Okt: Musim Hujan Tropis Utara
    if (month >= 4 && month <= 9) {
      return {
        seasonName: 'Musim Hujan Tropis Utara (Monsun Barat Daya)',
        seasonKey: 'hujan',
        zoneCategory: 'Tropis Ekuatorial',
        seasonIcon: '🌧️',
        avgTempRange: '25°C - 32°C',
        typicalRainMmMonth: '220 - 450 mm',
        precipitationCharacteristic: 'Hujan lebat disertai siklon tropis aktif di wilayah Pasifik Barat / Samudra Hindia Utara.',
        monsoonWind: 'Angin Monsun Barat Daya',
        solarPositionInfo: `${distanceToEquatorKm} km utara khatulistiwa.`,
        distanceToEquatorKm,
        hemisphere,
        dayLengthHours,
      };
    }

    // Nov - Apr: Musim Kering Tropis Utara
    return {
      seasonName: 'Musim Kemarau Tropis Utara (Monsun Timur Laut)',
      seasonKey: 'kemarau',
      zoneCategory: 'Tropis Ekuatorial',
      seasonIcon: '☀️',
      avgTempRange: '22°C - 31°C',
      typicalRainMmMonth: '30 - 90 mm',
      precipitationCharacteristic: 'Curah hujan relatif rendah, angin kering bertiup dari daratan benua Asia utara.',
      monsoonWind: 'Angin Monsun Timur Laut',
      solarPositionInfo: `${distanceToEquatorKm} km utara khatulistiwa.`,
      distanceToEquatorKm,
      hemisphere,
      dayLengthHours,
    };
  }

  private calculateNorthernTemperateSeason(
    distanceToEquatorKm: number,
    month: number,
    day: number,
    dayLengthHours: number
  ): SeasonalInfo {
    // Musim Semi (Spring): 21 Mar - 20 Jun
    if ((month === 2 && day >= 21) || month === 3 || month === 4 || (month === 5 && day <= 20)) {
      return {
        seasonName: 'Musim Semi (Spring / Haru)',
        seasonKey: 'spring',
        zoneCategory: 'Subtropis Belahan Utara',
        seasonIcon: '🌸',
        avgTempRange: '8°C - 19°C',
        typicalRainMmMonth: '70 - 130 mm',
        precipitationCharacteristic: 'Salju mencair, suhu mulai menghangat, bunga mekar dan vegetasi bertunas.',
        monsoonWind: 'Siklon ekstratropis berfrekuensi sedang.',
        solarPositionInfo: `Matahari melintas ke utara ekuator (${distanceToEquatorKm} km dari Khatulistiwa).`,
        distanceToEquatorKm,
        hemisphere: 'Utara',
        dayLengthHours,
      };
    }

    // Musim Panas (Summer): 21 Jun - 22 Sep
    if ((month === 5 && day >= 21) || month === 6 || month === 7 || (month === 8 && day <= 22)) {
      return {
        seasonName: 'Musim Panas (Summer / Natsu)',
        seasonKey: 'summer',
        zoneCategory: 'Subtropis Belahan Utara',
        seasonIcon: '☀️',
        avgTempRange: '22°C - 35°C',
        typicalRainMmMonth: '80 - 180 mm',
        precipitationCharacteristic: 'Hari siang panjang (hingga 15 jam), suhu panas dengan gelombang panas sesekali.',
        monsoonWind: 'Massa udara maritim tropis.',
        solarPositionInfo: `Titik balik matahari musim panas (Summer Solstice) (${distanceToEquatorKm} km dari Khatulistiwa).`,
        distanceToEquatorKm,
        hemisphere: 'Utara',
        dayLengthHours,
      };
    }

    // Musim Gugur (Autumn/Fall): 23 Sep - 20 Des
    if ((month === 8 && day >= 23) || month === 9 || month === 10 || (month === 11 && day <= 20)) {
      return {
        seasonName: 'Musim Gugur (Autumn / Aki)',
        seasonKey: 'autumn',
        zoneCategory: 'Subtropis Belahan Utara',
        seasonIcon: '🍁',
        avgTempRange: '7°C - 18°C',
        typicalRainMmMonth: '60 - 110 mm',
        precipitationCharacteristic: 'Daun berubah warna merah/kuning dan gugur, udara mulai sejuk dan kering.',
        monsoonWind: 'Massa udara kutub mulai mendorong ke selatan.',
        solarPositionInfo: `Matahari kembali melintas ke selatan ekuator (${distanceToEquatorKm} km dari Khatulistiwa).`,
        distanceToEquatorKm,
        hemisphere: 'Utara',
        dayLengthHours,
      };
    }

    // Musim Dingin (Winter): 21 Des - 20 Mar
    return {
      seasonName: 'Musim Dingin (Winter / Fuyu)',
      seasonKey: 'winter',
      zoneCategory: 'Subtropis Belahan Utara',
      seasonIcon: '❄️',
      avgTempRange: '-10°C - 6°C',
      typicalRainMmMonth: '40 - 90 mm (Presipitasi Salju)',
      precipitationCharacteristic: 'Suhu beku di bawah nol, presipitasi salju padat, hari siang pendek (hanya ~9 jam).',
      monsoonWind: 'Angin dingin kutub Arktik (Polar Vortex).',
      solarPositionInfo: `Titik balik matahari musim dingin (Winter Solstice) (${distanceToEquatorKm} km dari Khatulistiwa).`,
      distanceToEquatorKm,
      hemisphere: 'Utara',
      dayLengthHours,
    };
  }

  private calculateSouthernTemperateSeason(
    distanceToEquatorKm: number,
    month: number,
    day: number,
    dayLengthHours: number
  ): SeasonalInfo {
    // Belahan bumi selatan mengalami musim berkebalikan persis dengan belahan bumi utara
    if ((month === 2 && day >= 21) || month === 3 || month === 4 || (month === 5 && day <= 20)) {
      return {
        seasonName: 'Musim Gugur Selatan (Autumn)',
        seasonKey: 'autumn',
        zoneCategory: 'Subtropis Belahan Selatan',
        seasonIcon: '🍁',
        avgTempRange: '9°C - 20°C',
        typicalRainMmMonth: '50 - 100 mm',
        precipitationCharacteristic: 'Suhu menurun stabil, dedaunan berguguran.',
        monsoonWind: 'Angin barat lintang selatan (Roaring Forties).',
        solarPositionInfo: `${distanceToEquatorKm} km selatan Khatulistiwa.`,
        distanceToEquatorKm,
        hemisphere: 'Selatan',
        dayLengthHours,
      };
    }

    if ((month === 5 && day >= 21) || month === 6 || month === 7 || (month === 8 && day <= 22)) {
      return {
        seasonName: 'Musim Dingin Selatan (Winter)',
        seasonKey: 'winter',
        zoneCategory: 'Subtropis Belahan Selatan',
        seasonIcon: '❄️',
        avgTempRange: '2°C - 14°C',
        typicalRainMmMonth: '40 - 80 mm',
        precipitationCharacteristic: 'Suhu terendah tahunan di Australia/Selandia Baru/Argentina, salju di dataran tinggi.',
        monsoonWind: 'Massa udara dingin Antarktika.',
        solarPositionInfo: `${distanceToEquatorKm} km selatan Khatulistiwa.`,
        distanceToEquatorKm,
        hemisphere: 'Selatan',
        dayLengthHours,
      };
    }

    if ((month === 8 && day >= 23) || month === 9 || month === 10 || (month === 11 && day <= 20)) {
      return {
        seasonName: 'Musim Semi Selatan (Spring)',
        seasonKey: 'spring',
        zoneCategory: 'Subtropis Belahan Selatan',
        seasonIcon: '🌸',
        avgTempRange: '12°C - 22°C',
        typicalRainMmMonth: '40 - 90 mm',
        precipitationCharacteristic: 'Suhu menghangat cepat, hari siang memanjang.',
        monsoonWind: 'Angin pasat subtropis.',
        solarPositionInfo: `${distanceToEquatorKm} km selatan Khatulistiwa.`,
        distanceToEquatorKm,
        hemisphere: 'Selatan',
        dayLengthHours,
      };
    }

    return {
      seasonName: 'Musim Panas Selatan (Summer)',
      seasonKey: 'summer',
      zoneCategory: 'Subtropis Belahan Selatan',
      seasonIcon: '☀️',
      avgTempRange: '20°C - 34°C',
      typicalRainMmMonth: '30 - 70 mm',
      precipitationCharacteristic: 'Suhu terpanas belahan bumi selatan, siang hari panjang hingga 14.5 jam.',
      monsoonWind: 'Pusat tekanan rendah benua Australia/Amerika Selatan.',
      solarPositionInfo: `${distanceToEquatorKm} km selatan Khatulistiwa (Summer Solstice Selatan).`,
      distanceToEquatorKm,
      hemisphere: 'Selatan',
      dayLengthHours,
    };
  }

  private calculatePolarSeason(
    lat: number,
    month: number,
    distanceToEquatorKm: number,
    hemisphere: 'Utara' | 'Selatan' | 'Ekuator',
    dayLengthHours: number
  ): SeasonalInfo {
    const isNorth = lat > 0;
    const isSummerHalf = isNorth ? (month >= 3 && month <= 8) : (month >= 9 || month <= 2);

    if (isSummerHalf) {
      return {
        seasonName: 'Musim Siang Kutub (Midnight Sun / Polar Day)',
        seasonKey: 'polar_day',
        zoneCategory: 'Zona Kutub',
        seasonIcon: '☀️',
        avgTempRange: '-5°C - 4°C',
        typicalRainMmMonth: '15 - 35 mm',
        precipitationCharacteristic: 'Matahari tidak terbenam selama 24 jam penuh di puncak musim.',
        monsoonWind: 'Sirkulasi siklonik kutub.',
        solarPositionInfo: `${distanceToEquatorKm} km dari khatulistiwa (Lingkaran Arktik/Antarktika).`,
        distanceToEquatorKm,
        hemisphere,
        dayLengthHours: 24,
      };
    }

    return {
      seasonName: 'Musim Malam Kutub (Polar Night / Beku Total)',
      seasonKey: 'polar_night',
      zoneCategory: 'Zona Kutub',
      seasonIcon: '🌌',
      avgTempRange: '-45°C - -20°C',
      typicalRainMmMonth: '10 - 25 mm',
      precipitationCharacteristic: 'Matahari tidak terbit selama berbulan-bulan, fenomena aurora borealis/australis.',
      monsoonWind: 'Polar vortex kuat bersuhu ekstrem.',
      solarPositionInfo: `${distanceToEquatorKm} km dari khatulistiwa.`,
      distanceToEquatorKm,
      hemisphere,
      dayLengthHours: 0,
    };
  }

  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }

  /**
   * Menghasilkan GeoJSON fitur Garis Khatulistiwa (Equator 0°) untuk OpenLayers
   */
  public getEquatorLineGeoJson(): any {
    const coordinates: [number, number][] = [];
    for (let lng = -180; lng <= 180; lng += 1) {
      coordinates.push([lng, 0.0]);
    }

    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            name: 'Garis Khatulistiwa (Equator Line 0.0000°)',
            type: 'equator',
            description: 'Garis lintang nol derajat bumi pembagi Belahan Utara dan Belahan Selatan.',
          },
          geometry: {
            type: 'LineString',
            coordinates,
          },
        },
      ],
    };
  }

  /**
   * Menghasilkan GeoJSON Garis Balik Tropis (Cancer +23.4365° dan Capricorn -23.4365°)
   */
  public getTropicsLinesGeoJson(): any {
    const cancerCoords: [number, number][] = [];
    const capricornCoords: [number, number][] = [];
    for (let lng = -180; lng <= 180; lng += 1) {
      cancerCoords.push([lng, 23.4365]);
      capricornCoords.push([lng, -23.4365]);
    }

    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            name: 'Garis Balik Utara (Tropic of Cancer +23.4365°)',
            type: 'tropic_cancer',
            description: 'Batas utara zona iklim tropis dunia.',
          },
          geometry: {
            type: 'LineString',
            coordinates: cancerCoords,
          },
        },
        {
          type: 'Feature',
          properties: {
            name: 'Garis Balik Selatan (Tropic of Capricorn -23.4365°)',
            type: 'tropic_capricorn',
            description: 'Batas selatan zona iklim tropis dunia.',
          },
          geometry: {
            type: 'LineString',
            coordinates: capricornCoords,
          },
        },
      ],
    };
  }

  /**
   * Alias untuk kalkulasi musim berbasis koordinat
   */
  public calculateSeasonalIntelligence(lat: number, lng: number, date: Date = new Date()): SeasonalInfo {
    return this.calculateSeason(lat, lng, date);
  }

  /**
   * Ambil data cuaca realtime seluruh negara di dunia melalui Open-Meteo API (0 API Key required)
   */
  public async fetchGlobalWeather(lat: number, lng: number): Promise<any> {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,precipitation_probability,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo HTTP status ${res.status}`);
    return res.json();
  }

  /**
   * Menggabungkan fetch cuaca global Open-Meteo dengan kalkulasi intelijensi musim
   */
  public async fetchGlobalWeatherAndSeason(lat: number, lng: number): Promise<{
    currentTemp: number;
    weatherDesc: string;
    weatherCode: number;
    seasonalInfo: SeasonalInfo;
    raw: any;
  }> {
    const seasonalInfo = this.calculateSeason(lat, lng);
    const raw = await this.fetchGlobalWeather(lat, lng);
    const current = raw?.current || {};
    const weatherCode = current.weather_code ?? 0;
    const currentTemp = current.temperature_2m ?? 28;

    const weatherCodeDescriptions: Record<number, string> = {
      0: 'Cerah Berawan Tipis',
      1: 'Sebagian Berawan',
      2: 'Berawan Sedang',
      3: 'Mendung Tertutup Awan',
      45: 'Kabut Tipis',
      48: 'Kabut Tebal Berembun',
      51: 'Gerimis Ringan',
      53: 'Gerimis Sedang',
      55: 'Gerimis Lebat',
      61: 'Hujan Ringan',
      63: 'Hujan Sedang',
      65: 'Hujan Lebat',
      80: 'Hujan Rintik Mendadak',
      81: 'Hujan Deras Lokal',
      82: 'Hujan Sangat Lebat Ekstrem',
      95: 'Badai Petir Tropis',
      96: 'Badai Petir Disertai Butiran Es',
    };

    const weatherDesc = weatherCodeDescriptions[weatherCode] || 'Kondisi Atmosfer Dinamis';

    return {
      currentTemp,
      weatherDesc,
      weatherCode,
      seasonalInfo,
      raw,
    };
  }
}

export const seasonalIntelligenceService = new SeasonalIntelligenceService();
