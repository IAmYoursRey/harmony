import { DataProvenance } from './types';

export type SupportedSpectralIndex =
  | 'NDVI'
  | 'NDWI'
  | 'MNDWI'
  | 'NDBI'
  | 'BSI'
  | 'EVI'
  | 'SAVI'
  | 'NBR'
  | 'SAR_VV'
  | 'SAR_VH'
  | 'SAR_RATIO'
  | 'LST';


export interface SpectralIndexDefinition {
  id: SupportedSpectralIndex;
  name: string;
  fullName: string;
  satellite: 'Sentinel-2' | 'Sentinel-1 SAR' | 'Landsat 8/9';
  formula: string;
  requiredBands: string[];
  wavelengths: string;
  physicalInterpretation: string;
  citation: string;
  validRange: [number, number];
  badgeColor: string;
  classify: (val: number) => { label: string; severity: 'optimal' | 'moderate' | 'warning' | 'critical' };
}

export interface SpectralEvaluationResult {
  indexId: SupportedSpectralIndex;
  definition: SpectralIndexDefinition;
  meanValue: number | null;
  classification: string;
  status: 'PROCESSED' | 'UNAVAILABLE' | 'NOT_FETCHED' | 'NO_VALID_SCENE';
  provenance: DataProvenance;
  evaluatedAt: string;
  formula: string;
  bandsUsed: string[];
}

export const SPECTRAL_INDEX_DEFINITIONS: Record<SupportedSpectralIndex, SpectralIndexDefinition> = {
  NDVI: {
    id: 'NDVI',
    name: 'NDVI',
    fullName: 'Normalized Difference Vegetation Index',
    satellite: 'Sentinel-2',
    formula: '(B08 - B04) / (B08 + B04)',
    requiredBands: ['B08 (NIR)', 'B04 (Red)'],
    wavelengths: 'NIR ~842nm, Red ~665nm',
    physicalInterpretation: 'Mendeteksi biomassa vegetasi aktif dari penyerapan klorofil pada panjang gelombang merah dan hamburan sel daun pada inframerah dekat.',
    citation: 'Rouse et al., 1974 (NASA SP-351)',
    validRange: [-1.0, 1.0],
    badgeColor: '#10b981',
    classify: (val) => {
      if (val >= 0.6) return { label: 'Vegetasi Sangat Rapat / Hutan Lebat', severity: 'optimal' };
      if (val >= 0.4) return { label: 'Vegetasi Kerapatan Sedang', severity: 'optimal' };
      if (val >= 0.2) return { label: 'Semak Belukar / Vegetasi Jarang', severity: 'moderate' };
      if (val >= 0.0) return { label: 'Lahan Terbuka / Non-Vegetasi', severity: 'warning' };
      return { label: 'Badan Air / Awan / Salju', severity: 'moderate' };
    },
  },
  NDWI: {
    id: 'NDWI',
    name: 'NDWI',
    fullName: 'Normalized Difference Water Index (McFeeters)',
    satellite: 'Sentinel-2',
    formula: '(B03 - B08) / (B03 + B08)',
    requiredBands: ['B03 (Green)', 'B08 (NIR)'],
    wavelengths: 'Green ~560nm, NIR ~842nm',
    physicalInterpretation: 'Memaksimalkan pantulan badan air terbuka pada kanal hijau dan meminimalkan pantulan pada inframerah dekat.',
    citation: 'McFeeters, S.K., 1996 (Int. J. Remote Sens.)',
    validRange: [-1.0, 1.0],
    badgeColor: '#0ea5e9',
    classify: (val) => {
      if (val > 0.2) return { label: 'Badan Air Terbuka / Genangan Tinggi', severity: 'optimal' };
      if (val > 0.0) return { label: 'Kawasan Lembab / Rawa Basah', severity: 'moderate' };
      return { label: 'Bukan Permukaan Air (Daratan Kering)', severity: 'critical' };
    },
  },
  MNDWI: {
    id: 'MNDWI',
    name: 'MNDWI',
    fullName: 'Modified Normalized Difference Water Index (Xu)',
    satellite: 'Sentinel-2',
    formula: '(B03 - B11) / (B03 + B11)',
    requiredBands: ['B03 (Green)', 'B11 (SWIR)'],
    wavelengths: 'Green ~560nm, SWIR ~1610nm',
    physicalInterpretation: 'Memisahkan air dari kawasan terbangun perkotaan secara lebih tajam dibanding NDWI klasik.',
    citation: 'Xu, H., 2006 (Int. J. Remote Sens.)',
    validRange: [-1.0, 1.0],
    badgeColor: '#0284c7',
    classify: (val) => {
      if (val > 0.1) return { label: 'Genangan Air Terverifikasi', severity: 'optimal' };
      return { label: 'Bukan Perairan Terbuka', severity: 'moderate' };
    },
  },
  NDBI: {
    id: 'NDBI',
    name: 'NDBI',
    fullName: 'Normalized Difference Built-up Index',
    satellite: 'Sentinel-2',
    formula: '(B11 - B08) / (B11 + B08)',
    requiredBands: ['B11 (SWIR)', 'B08 (NIR)'],
    wavelengths: 'SWIR ~1610nm, NIR ~842nm',
    physicalInterpretation: 'Mendeteksi kawasan kedap air, beton, dan kerapatan atap pemukiman perkotaan dari rasio pantulan SWIR terhadap NIR.',
    citation: 'Zha, Y. et al., 2003 (Int. J. Remote Sens.)',
    validRange: [-1.0, 1.0],
    badgeColor: '#f97316',
    classify: (val) => {
      if (val > 0.1) return { label: 'Kerapatan Kawasan Terbangun Tinggi', severity: 'warning' };
      if (val > -0.1) return { label: 'Kerapatan Bangunan Campuran', severity: 'moderate' };
      return { label: 'Area Alami / Ruang Terbuka Hijau', severity: 'optimal' };
    },
  },
  BSI: {
    id: 'BSI',
    name: 'BSI',
    fullName: 'Bare Soil Index',
    satellite: 'Sentinel-2',
    formula: '((B11 + B04) - (B08 + B02)) / ((B11 + B04) + (B08 + B02))',
    requiredBands: ['B11 (SWIR)', 'B04 (Red)', 'B08 (NIR)', 'B02 (Blue)'],
    wavelengths: 'SWIR, Red, NIR, Blue kombinasi 4-band',
    physicalInterpretation: 'Mengisolasi permukaan tanah gundul terbuka, lahan kritis terdegradasi, atau bekas kebakaran hutan.',
    citation: 'Rikimaru, A. et al., 2002 (ISPRS)',
    validRange: [-1.0, 1.0],
    badgeColor: '#ef4444',
    classify: (val) => {
      if (val > 0.15) return { label: 'Tanah Terbuka / Lahan Gundul Kritis', severity: 'critical' };
      if (val > 0.0) return { label: 'Tanah Terbuka Sebagian', severity: 'warning' };
      return { label: 'Tertutup Vegetasi / Bangunan Stabil', severity: 'optimal' };
    },
  },
  EVI: {
    id: 'EVI',
    name: 'EVI',
    fullName: 'Enhanced Vegetation Index',
    satellite: 'Sentinel-2',
    formula: '2.5 * ((B08 - B04) / (B08 + 6 * B04 - 7.5 * B02 + 1))',
    requiredBands: ['B08 (NIR)', 'B04 (Red)', 'B02 (Blue)'],
    wavelengths: 'NIR, Red, Blue (dengan koreksi hamburan Rayleigh)',
    physicalInterpretation: 'Indeks vegetasi lanjutan terkoreksi kanopi padat dan pengaruh atmosfer aerosol.',
    citation: 'Huete, A. et al., 2002 (Remote Sens. Environ.)',
    validRange: [-1.0, 1.0],
    badgeColor: '#059669',
    classify: (val) => {
      if (val >= 0.5) return { label: 'Biomassa Kanopi Tropis Sangat Tinggi', severity: 'optimal' };
      if (val >= 0.25) return { label: 'Biomassa Sedang', severity: 'optimal' };
      return { label: 'Biomassa Rendah / Lahan Terbuka', severity: 'moderate' };
    },
  },
  SAVI: {
    id: 'SAVI',
    name: 'SAVI',
    fullName: 'Soil-Adjusted Vegetation Index (L=0.5)',
    satellite: 'Sentinel-2',
    formula: '1.5 * ((B08 - B04) / (B08 + B04 + 0.5))',
    requiredBands: ['B08 (NIR)', 'B04 (Red)'],
    wavelengths: 'NIR, Red (dengan faktor koreksi latar belakang tanah L=0.5)',
    physicalInterpretation: 'Mereduksi efek kecerahan tanah pada vegetasi dengan tajuk jarang.',
    citation: 'Huete, A.R., 1988 (Remote Sens. Environ.)',
    validRange: [-1.0, 1.0],
    badgeColor: '#16a34a',
    classify: (val) => {
      if (val >= 0.4) return { label: 'Vegetasi Sehat', severity: 'optimal' };
      return { label: 'Vegetasi Terbatas / Efek Tanah Dominan', severity: 'moderate' };
    },
  },
  NBR: {
    id: 'NBR',
    name: 'NBR',
    fullName: 'Normalized Burn Ratio',
    satellite: 'Sentinel-2',
    formula: '(B08 - B12) / (B08 + B12)',
    requiredBands: ['B08 (NIR)', 'B12 (SWIR-2)'],
    wavelengths: 'NIR ~842nm, SWIR-2 ~2190nm',
    physicalInterpretation: 'Mendeteksi bekas kebakaran hutan dan tingkat keparahan terbakar (burn severity).',
    citation: 'Key, C. & Benson, N., 2006 (USGS)',
    validRange: [-1.0, 1.0],
    badgeColor: '#b91c1c',
    classify: (val) => {
      if (val < -0.1) return { label: 'Tingkat Keparahan Terbakar Tinggi (Burn Scar)', severity: 'critical' };
      if (val < 0.1) return { label: 'Keparahan Terbakar Ringan', severity: 'warning' };
      return { label: 'Vegetasi Sehat Tak Terbakar', severity: 'optimal' };
    },
  },
  SAR_VV: {
    id: 'SAR_VV',
    name: 'SAR VV',
    fullName: 'Sentinel-1 C-SAR VV Backscatter (dB)',
    satellite: 'Sentinel-1 SAR',
    formula: '10 * log10(DN^2) - K_cal (Sigma-0 in dB)',
    requiredBands: ['C-Band VV Polarization'],
    wavelengths: 'Frekuensi 5.405 GHz (Panjang gelombang ~5.6 cm)',
    physicalInterpretation: 'Hamburan balik radar ko-polarisasi vertikal. Permukaan air yang tenang memantulkan gelombang menjauhi sensor (backscatter sangat rendah < -15 dB).',
    citation: 'ESA Sentinel-1 SAR User Handbook',
    validRange: [-35, 5],
    badgeColor: '#8b5cf6',
    classify: (val) => {
      if (val < -16) return { label: 'Permukaan Air Tenang / Genangan Banjir Radar', severity: 'critical' };
      if (val < -10) return { label: 'Lahan Basah / Pertanian Sawah Terendam', severity: 'warning' };
      return { label: 'Permukaan Daratan / Kasar', severity: 'optimal' };
    },
  },
  SAR_VH: {
    id: 'SAR_VH',
    name: 'SAR VH',
    fullName: 'Sentinel-1 C-SAR VH Cross-Polarization (dB)',
    satellite: 'Sentinel-1 SAR',
    formula: '10 * log10(DN^2) - K_cal (Sigma-0 in dB)',
    requiredBands: ['C-Band VH Polarization'],
    wavelengths: 'Cross-polarisasi V transmit, H receive',
    physicalInterpretation: 'Sensitif terhadap hamburan volume kanopi hutan dan vegetasi padat.',
    citation: 'ESA Sentinel-1 Mission Standards',
    validRange: [-40, 0],
    badgeColor: '#6366f1',
    classify: (val) => {
      if (val > -14) return { label: 'Hamburan Volume Tinggi (Hutan Lebat)', severity: 'optimal' };
      return { label: 'Hamburan Volume Rendah (Lahan Terbuka / Air)', severity: 'moderate' };
    },
  },
  SAR_RATIO: {
    id: 'SAR_RATIO',
    name: 'SAR VV/VH',
    fullName: 'Sentinel-1 Dual-Pol Ratio',
    satellite: 'Sentinel-1 SAR',
    formula: 'Sigma0_VV_lin / Sigma0_VH_lin',
    requiredBands: ['VV Linear', 'VH Linear'],
    wavelengths: 'Rasio polarimetrik ganda',
    physicalInterpretation: 'Membantu membedakan struktur vegetasi dari kekasaran permukaan tanah.',
    citation: 'ESA / DLR SAR Polarimetry Guidelines',
    validRange: [0, 30],
    badgeColor: '#a855f7',
    classify: (val) => {
      return { label: `Rasio Polarisasi: ${val.toFixed(2)}`, severity: 'optimal' };
    },
  },
  LST: {
    id: 'LST',
    name: 'LST (Suhu Permukaan Daratan)',
    fullName: 'Land Surface Temperature',
    satellite: 'Landsat 8/9',
    formula: 'ST_B10 * 0.00341802 + 149.0 - 273.15 (°C)',
    requiredBands: ['ST_B10 (Thermal)', 'QA_PIXEL'],
    wavelengths: 'TIR 10.60 - 11.19 µm',
    physicalInterpretation: 'Mengukur suhu kinetik radiometrik permukaan daratan (vegetasi, tanah, atap/bangunan) bebas hamburan atmosfer.',
    citation: 'USGS Landsat Collection 2 Level-2 Surface Temperature (Cook et al., 2014)',
    validRange: [-10, 60],
    badgeColor: '#f43f5e',
    classify: (val) => {
      if (val >= 38.0) return { label: 'Suhu Sangat Tinggi / Urban Heat Island (> 38°C)', severity: 'critical' };
      if (val >= 32.0) return { label: 'Suhu Tinggi Terpapar (32 - 38°C)', severity: 'warning' };
      if (val >= 24.0) return { label: 'Suhu Permukaan Moderat (24 - 32°C)', severity: 'optimal' };
      return { label: 'Suhu Sejuk / Dataran Tinggi (< 24°C)', severity: 'optimal' };
    },
  },
};

/**
 * Mathematically calculate a spectral index from band reflectance values
 */
export function calculateMathematicalIndex(
  indexId: SupportedSpectralIndex,
  bands: Record<string, number>
): number | null {
  const def = SPECTRAL_INDEX_DEFINITIONS[indexId];
  if (!def) return null;

  switch (indexId) {
    case 'NDVI': {
      const nir = bands.B08 ?? bands.nir;
      const red = bands.B04 ?? bands.red;
      if (nir === undefined || red === undefined || nir + red === 0) return null;
      return (nir - red) / (nir + red);
    }
    case 'NDWI': {
      const green = bands.B03 ?? bands.green;
      const nir = bands.B08 ?? bands.nir;
      if (green === undefined || nir === undefined || green + nir === 0) return null;
      return (green - nir) / (green + nir);
    }
    case 'MNDWI': {
      const green = bands.B03 ?? bands.green;
      const swir = bands.B11 ?? bands.swir;
      if (green === undefined || swir === undefined || green + swir === 0) return null;
      return (green - swir) / (green + swir);
    }
    case 'NDBI': {
      const swir = bands.B11 ?? bands.swir;
      const nir = bands.B08 ?? bands.nir;
      if (swir === undefined || nir === undefined || swir + nir === 0) return null;
      return (swir - nir) / (swir + nir);
    }
    case 'BSI': {
      const swir = bands.B11 ?? bands.swir;
      const red = bands.B04 ?? bands.red;
      const nir = bands.B08 ?? bands.nir;
      const blue = bands.B02 ?? bands.blue;
      if (swir === undefined || red === undefined || nir === undefined || blue === undefined) return null;
      const num = (swir + red) - (nir + blue);
      const den = (swir + red) + (nir + blue);
      if (den === 0) return null;
      return num / den;
    }
    case 'EVI': {
      const nir = bands.B08 ?? bands.nir;
      const red = bands.B04 ?? bands.red;
      const blue = bands.B02 ?? bands.blue;
      if (nir === undefined || red === undefined || blue === undefined) return null;
      const den = nir + 6 * red - 7.5 * blue + 1;
      if (den === 0) return null;
      return 2.5 * ((nir - red) / den);
    }
    case 'SAVI': {
      const nir = bands.B08 ?? bands.nir;
      const red = bands.B04 ?? bands.red;
      if (nir === undefined || red === undefined || nir + red + 0.5 === 0) return null;
      return 1.5 * ((nir - red) / (nir + red + 0.5));
    }
    case 'NBR': {
      const nir = bands.B08 ?? bands.nir;
      const swir2 = bands.B12 ?? bands.swir2;
      if (nir === undefined || swir2 === undefined || nir + swir2 === 0) return null;
      return (nir - swir2) / (nir + swir2);
    }
    case 'SAR_VV': {
      if (bands.VV !== undefined) return bands.VV;
      if (bands.vv !== undefined) return bands.vv;
      if (bands.vv_lin !== undefined && bands.vv_lin > 0) return 10 * Math.log10(bands.vv_lin);
      return null;
    }
    case 'SAR_VH': {
      if (bands.VH !== undefined) return bands.VH;
      if (bands.vh !== undefined) return bands.vh;
      if (bands.vh_lin !== undefined && bands.vh_lin > 0) return 10 * Math.log10(bands.vh_lin);
      return null;
    }
    case 'SAR_RATIO': {
      // Linear power ratio: P_VV / P_VH
      if (bands.vv_lin !== undefined && bands.vh_lin !== undefined && bands.vh_lin > 0) {
        return bands.vv_lin / bands.vh_lin;
      }
      // If decibels are provided: VV_dB - VH_dB represents 10 * log10(P_VV / P_VH)
      const vv_db = bands.VV ?? bands.vv;
      const vh_db = bands.VH ?? bands.vh;
      if (vv_db !== undefined && vh_db !== undefined) {
        return vv_db - vh_db;
      }
      return null;
    }
    case 'LST': {
      // USGS Landsat Collection 2 Level-2 Surface Temperature (ST_B10)
      // Kelvin = DN * 0.00341802 + 149.0
      // Celsius = Kelvin - 273.15
      const rawDN = bands.ST_B10 ?? bands.st_b10 ?? bands.thermal;
      if (rawDN !== undefined && rawDN > 0) {
        const kelvin = rawDN * 0.00341802 + 149.0;
        return kelvin - 273.15;
      }
      if (bands.celsius !== undefined) return bands.celsius;
      if (bands.kelvin !== undefined) return bands.kelvin - 273.15;
      return null;
    }
    default:
      return null;
  }
}

