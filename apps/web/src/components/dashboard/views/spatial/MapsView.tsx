import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import { fromLonLat, toLonLat, transformExtent } from "ol/proj";
import GeoJSON from "ol/format/GeoJSON";
import OSMXML from "ol/format/OSMXML";
import { bbox as bboxStrategy } from "ol/loadingstrategy";
import Overlay from "ol/Overlay";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import LineString from "ol/geom/LineString";
import CircleGeom from "ol/geom/Circle";
import { Style, RegularShape, Fill, Stroke, Circle as CircleStyle, Text } from "ol/style";
import TopoJSON from "ol/format/TopoJSON";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { apiClient } from "@/services/apiClient";
import { 
  Map as MapIcon, Mountain, GraduationCap, X, Menu, Building2, Settings, Search, MapPin, 
  Activity, CloudRain, Thermometer, Wind, Cloud, Sun, Globe, TreePine, Map as MapIcon2, 
  Newspaper, Palette, Paintbrush, Box, Compass, RotateCcw, RotateCw, LocateFixed, CloudSun,
  Waves, Gauge, Flame, AlertCircle, Navigation, Satellite, Layers, Car, Info, ShieldCheck,
  ArrowUp, ArrowUpRight, Check, Eye, Radio, BookOpen, ExternalLink, Calendar, Sparkles, Droplets,
  ChevronUp, ChevronDown, Database
} from "lucide-react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { seasonalIntelligenceService, type SeasonalInfo, EQUATOR_MONUMENTS } from "@/services/seasonalIntelligenceService";
import { useAuth } from "@/hooks/useAuth";
import { useSchool } from "@/hooks/useSchool";
import { motion, AnimatePresence } from "framer-motion";
import { GlobeView3D } from "./GlobeView3D";
import { volcanoService } from "@/services/volcanoService";
import { GeospatialWeatherModal } from "./GeospatialWeatherModal";
import { RouteNavigatorModal } from "./RouteNavigatorModal";
import { RouteResult } from "@/services/routingService";
import { preciseGeocodingService, PreciseLocationInfo } from "@/services/preciseGeocodingService";
import { geospatialAnalysisService } from "@/services/geospatialAnalysisService";
import { weatherAggregatorService } from "@/services/weatherAggregatorService";
import { bmkgService } from "@/services/bmkgService";
import { TSUNAMI_EARTH_SENSOR_NETWORK, TsunamiSensorNode } from "@/services/spatialDataEngine";
import { 
  GLOBAL_EARTH_SENSOR_NETWORK, 
  EarthSensorNode, 
  SensorFamily, 
  SENSOR_FAMILY_META, 
  getSensorRegistryStats 
} from "@/services/earthSensorRegistry";
import { SensorInspectorModal } from "./SensorInspectorModal";
import { MasterSensorTaxonomyModal } from "./MasterSensorTaxonomyModal";
import { DataSourceProvenanceModal } from "@/components/common/DataSourceProvenanceModal";

// Basemap Types & Provenance Metadata (>2020 High-Accuracy Datasets)
export type MapBasemapType = 'osm' | 'satellite' | 'elevation' | 'thermal' | 'traffic' | 'dark';

export interface BasemapMetadata {
  id: MapBasemapType;
  name: string;
  category: string;
  year: string;
  provider: string;
  resolution: string;
  accuracy: string;
  description: string;
  color: string;
  badge: string;
}

export const BASEMAP_METADATA: Record<MapBasemapType, BasemapMetadata> = {
  osm: {
    id: 'osm',
    name: 'Peta Vektor Standar',
    category: 'Rupa Bumi & Jalan Nasional',
    year: '2025 - 2026 (Live Terverifikasi)',
    provider: 'OpenStreetMap & Komunitas SIG Indonesia',
    resolution: 'Vektor Skala 1:5.000 s.d. 1:50.000',
    accuracy: 'Akurasi Topologi Standar BIG',
    description: 'Jaringan jalan nasional, batas administrasi, toponimi wilayah resmi, dan fasilitas publik.',
    color: '#3b82f6',
    badge: 'Realtime 2026',
  },
  satellite: {
    id: 'satellite',
    name: 'Citra Satelit Optik',
    category: 'Penginderaan Jauh Optik',
    year: '2023 - 2025 (Pasca-2020 Terverifikasi)',
    provider: 'ESRI World Imagery & Sentinel-2',
    resolution: '0.3m s.d. 10m Ground Sampling Distance',
    accuracy: 'Ortorektifikasi CE90 < 2.5m',
    description: 'Citra optik multispektral resolusi ultra-tinggi bebas tutupan awan untuk analisis bentang alam.',
    color: '#10b981',
    badge: '2023 - 2025',
  },
  elevation: {
    id: 'elevation',
    name: 'Topografi & Elevasi',
    category: 'Morfologi & Digital Elevation Model (DEM)',
    year: '2022 - 2025 (Pasca-2020)',
    provider: 'ESRI Shaded Relief & DEMNAS BIG',
    resolution: 'SRTM 30m / DEMNAS 8.1m Gridded Relief',
    accuracy: 'Akurasi Vertikal LE90 < 2.5 meter',
    description: 'Relief bayangan ketinggian, garis kontur elevasi akurat, kemiringan lereng, dan profil pegunungan.',
    color: '#d97706',
    badge: '2022 - 2025',
  },
  thermal: {
    id: 'thermal',
    name: 'Peta Termal & LST',
    category: 'Sensor Termal Inframerah & Fisik Bumi',
    year: '2024 - 2026 (Near Real-Time Pasca-2020)',
    provider: 'ESRI Physical Relief & Copernicus Sentinel-3',
    resolution: '1 km Spatial Thermal Grid & Inframerah',
    accuracy: 'Sensitivitas Radiometrik ±0.5°C',
    description: 'Peta fisik termal bumi, gradien temperatur permukaan, pulau panas perkotaan (UHI), dan batas bioklimat.',
    color: '#ef4444',
    badge: 'Realtime 2026',
  },
  traffic: {
    id: 'traffic',
    name: 'Lintasan Jalan & Trafik',
    category: 'Infrastruktur Transportasi & Logistik Nasional',
    year: '2024 - 2026 (Pasca-2020 Terkini)',
    provider: 'OpenStreetMap, Bina Marga & GPS Trajectories',
    resolution: 'Tingkat Lajur & Titik GPS Presisi Geodesi',
    accuracy: 'Kecepatan Koridor Arteri Realtime',
    description: 'Lintasan jalan tol trans-pulau, jalan arteri nasional, jembatan, dan jalur perintis pelosok pedalaman.',
    color: '#8b5cf6',
    badge: '2024 - 2026',
  },
  dark: {
    id: 'dark',
    name: 'Citra Satelit Malam',
    category: 'Radiansi Malam Hari & Elektrifikasi',
    year: '2023 - 2025 (Pasca-2020)',
    provider: 'ESRI Dark Gray Canvas & NASA VIIRS Day/Night',
    resolution: '500m s.d. 1 km Spatial Resolution',
    accuracy: 'Kalibrasi Fotometrik Satelit',
    description: 'Pemantauan elektrifikasi wilayah nusantara, emisi lampu kota, dan aktivitas maritim malam hari.',
    color: '#6366f1',
    badge: '2023 - 2025',
  },
};

export interface TrafficCorridor {
  id: string;
  name: string;
  island: string;
  routeType: 'Tol' | 'Arteri Nasional' | 'Arteri Perkotaan' | 'Kolektor' | 'Jalur Lokal & Wisata' | 'Jalur Logistik';
  tier: 'expressway' | 'arterial' | 'collector' | 'local';
  status: 'Lancar' | 'Ramai Lancar' | 'Padat Merayap';
  speedKmh: number;
  condition: string;
  lengthKm: number;
  center: [number, number]; // [lng, lat]
  path: [number, number][]; // Line coordinates along the highway / street
}

export const INDONESIA_TRAFFIC_CORRIDORS: TrafficCorridor[] = [
  // 1. JALAN BEBAS HAMBATAN / TOL TRANS-PULAU (EXPRESSWAY)
  {
    id: 'tol_trans_jawa_1',
    name: 'Tol Trans-Jawa 1 (Merak - Jakarta - Cikampek - Cipali)',
    island: 'Jawa',
    routeType: 'Tol',
    tier: 'expressway',
    status: 'Ramai Lancar',
    speedKmh: 82,
    condition: 'Perkerasan Beton & Aspal Hotmix Baik, VMS Aktif',
    lengthKm: 204,
    center: [107.5, -6.4],
    path: [
      [105.998, -5.932], [106.075, -6.040], [106.155, -6.120], [106.400, -6.190],
      [106.650, -6.220], [106.827, -6.215], [107.000, -6.250], [107.250, -6.350],
      [107.450, -6.400], [107.750, -6.500], [108.050, -6.600], [108.350, -6.700],
      [108.550, -6.750], [108.950, -6.880]
    ],
  },
  {
    id: 'tol_trans_jawa_2',
    name: 'Tol Trans-Jawa 2 (Semarang - Solo - Kertosono - Surabaya - Probolinggo)',
    island: 'Jawa',
    routeType: 'Tol',
    tier: 'expressway',
    status: 'Lancar',
    speedKmh: 96,
    condition: 'Arus Bebas Hambatan Prima, Rest Area KM 519 Terpantau',
    lengthKm: 348,
    center: [111.5, -7.5],
    path: [
      [108.950, -6.880], [109.380, -6.910], [109.730, -6.950], [110.420, -7.000],
      [110.500, -7.320], [110.820, -7.560], [111.020, -7.420], [111.450, -7.410],
      [111.900, -7.580], [112.250, -7.460], [112.430, -7.470], [112.720, -7.320],
      [112.790, -7.450], [112.900, -7.650], [113.200, -7.750]
    ],
  },
  {
    id: 'tol_cipularang',
    name: 'Tol Cipularang - Purbaleunyi (Jakarta - Purwakarta - Bandung)',
    island: 'Jawa',
    routeType: 'Tol',
    tier: 'expressway',
    status: 'Ramai Lancar',
    speedKmh: 75,
    condition: 'Kontur Berbukit KM 90-100, Rambu Kecepatan Siaga',
    lengthKm: 142,
    center: [107.4, -6.6],
    path: [
      [106.827, -6.215], [106.860, -6.270], [106.870, -6.450], [106.850, -6.550],
      [107.000, -6.600], [107.380, -6.610], [107.450, -6.650], [107.500, -6.800],
      [107.570, -6.880], [107.610, -6.915], [107.720, -6.945]
    ],
  },
  {
    id: 'tol_cisumdawu',
    name: 'Tol Cisumdawu (Cileunyi - Jatinangor - Sumedang - Dawuan)',
    island: 'Jawa',
    routeType: 'Tol',
    tier: 'expressway',
    status: 'Lancar',
    speedKmh: 90,
    condition: 'Terowongan Kembar & Akses Bandara Kertajati Lancar',
    lengthKm: 62,
    center: [107.95, -6.85],
    path: [
      [107.720, -6.945], [107.780, -6.910], [107.850, -6.880], [107.920, -6.860],
      [108.050, -6.780], [108.150, -6.690], [108.200, -6.640]
    ],
  },
  {
    id: 'tol_dalam_kota_jkt',
    name: 'Tol Dalam Kota Jakarta (Cawang - Semanggi - Tomang - Grogol - Pluit)',
    island: 'Jawa',
    routeType: 'Tol',
    tier: 'expressway',
    status: 'Padat Merayap',
    speedKmh: 42,
    condition: 'Kepadatan Jam Sibuk Segmen Semanggi & Kuningan',
    lengthKm: 23.5,
    center: [106.825, -6.225],
    path: [
      [106.785, -6.120], [106.790, -6.155], [106.795, -6.175], [106.812, -6.205],
      [106.825, -6.225], [106.848, -6.240], [106.872, -6.245]
    ],
  },
  {
    id: 'tol_jorr_jkt',
    name: 'Tol Lingkar Luar Jakarta (JORR W2 - S - E Cikunir - TB Simatupang - Puri)',
    island: 'Jawa',
    routeType: 'Tol',
    tier: 'expressway',
    status: 'Ramai Lancar',
    speedKmh: 58,
    condition: 'Integrasi Gerbang Tol Cikunir & Pondok Pinang Lancar',
    lengthKm: 45,
    center: [106.810, -6.295],
    path: [
      [106.735, -6.175], [106.745, -6.225], [106.762, -6.275], [106.795, -6.295],
      [106.840, -6.305], [106.885, -6.310], [106.945, -6.265], [106.958, -6.215]
    ],
  },
  {
    id: 'tol_surabaya_gempol',
    name: 'Tol Surabaya - Waru - Porong - Gempol',
    island: 'Jawa',
    routeType: 'Tol',
    tier: 'expressway',
    status: 'Lancar',
    speedKmh: 88,
    condition: 'Konektivitas Kawasan Industri Rungkut & Pasuruan Terkendali',
    lengthKm: 48,
    center: [112.72, -7.42],
    path: [
      [112.725, -7.320], [112.720, -7.370], [112.715, -7.450], [112.710, -7.520],
      [112.700, -7.580]
    ],
  },
  {
    id: 'tol_semarang_abc',
    name: 'Tol Semarang Seksi ABC (Krapyak - Jatingaleh - Banyumanik - Kaligawe)',
    island: 'Jawa',
    routeType: 'Tol',
    tier: 'expressway',
    status: 'Ramai Lancar',
    speedKmh: 65,
    condition: 'Elevasi Gombel & Tanjakan Jatingaleh Terpantau CCTV',
    lengthKm: 24.7,
    center: [110.43, -7.02],
    path: [
      [110.355, -6.985], [110.385, -7.015], [110.415, -7.042], [110.448, -7.015],
      [110.450, -6.965]
    ],
  },
  {
    id: 'tol_bali_mandara',
    name: 'Tol Bali Mandara (Nusa Dua - Ngurah Rai - Benoa Tol Atas Laut)',
    island: 'Bali',
    routeType: 'Tol',
    tier: 'expressway',
    status: 'Lancar',
    speedKmh: 75,
    condition: 'Anemometer Angin Pesisir 12 knot, Aman untuk Roda Dua & Empat',
    lengthKm: 12.7,
    center: [115.21, -8.75],
    path: [
      [115.210, -8.720], [115.205, -8.735], [115.195, -8.745], [115.208, -8.765],
      [115.220, -8.790]
    ],
  },
  {
    id: 'tol_trans_sumatera',
    name: 'Tol Trans-Sumatera (Bakauheni - Terbanggi Besar - Kayu Agung - Palembang)',
    island: 'Sumatera',
    routeType: 'Tol',
    tier: 'expressway',
    status: 'Lancar',
    speedKmh: 100,
    condition: 'Arus Logistik Pelabuhan Bakauheni Lancar Terkendali',
    lengthKm: 330,
    center: [105.0, -4.5],
    path: [
      [105.750, -5.870], [105.600, -5.730], [105.350, -5.400], [105.200, -4.850],
      [105.100, -4.500], [105.000, -4.200], [104.900, -3.800], [104.850, -3.500],
      [104.750, -3.000]
    ],
  },
  {
    id: 'tol_medan_tebing',
    name: 'Tol Trans-Sumatera Utara (Medan - Kualanamu - Tebing Tinggi - Parapat)',
    island: 'Sumatera',
    routeType: 'Tol',
    tier: 'expressway',
    status: 'Lancar',
    speedKmh: 88,
    condition: 'Akses Wisata Danau Toba & Bandara Kualanamu Bebas Hambatan',
    lengthKm: 143,
    center: [99.0, 3.3],
    path: [
      [98.670, 3.590], [98.780, 3.530], [98.880, 3.550], [99.020, 3.450],
      [99.160, 3.320], [99.100, 3.000], [99.060, 2.660]
    ],
  },
  {
    id: 'tol_pekanbaru_dumai',
    name: 'Tol Trans-Sumatera Riau (Pekanbaru - Minas - Kandis - Duri - Dumai)',
    island: 'Sumatera',
    routeType: 'Tol',
    tier: 'expressway',
    status: 'Lancar',
    speedKmh: 94,
    condition: 'Underpass Terowongan Gajah Aktif, Jalur Logistik Minyak Lancar',
    lengthKm: 131,
    center: [101.40, 1.15],
    path: [
      [101.440, 0.580], [101.400, 0.850], [101.320, 1.250], [101.420, 1.670]
    ],
  },
  {
    id: 'tol_balikpapan_samarinda',
    name: 'Jalan Tol Balikpapan - Samboja - Palaran Samarinda',
    island: 'Kalimantan',
    routeType: 'Tol',
    tier: 'expressway',
    status: 'Lancar',
    speedKmh: 92,
    condition: 'Konektivitas Poros Utama IKN Nusantara & Palaran Lancar',
    lengthKm: 99,
    center: [116.95, -0.95],
    path: [
      [116.890, -1.250], [116.960, -1.150], [117.000, -1.050], [117.050, -0.800],
      [117.150, -0.500]
    ],
  },
  {
    id: 'tol_layang_pettarani',
    name: 'Tol Layang A.P. Pettarani & Tol Reformasi Makassar',
    island: 'Sulawesi',
    routeType: 'Tol',
    tier: 'expressway',
    status: 'Lancar',
    speedKmh: 68,
    condition: 'Akses Pelabuhan Soekarno-Hatta & Bandara Sultan Hasanuddin',
    lengthKm: 10.4,
    center: [119.435, -5.145],
    path: [
      [119.412, -5.115], [119.428, -5.132], [119.435, -5.155], [119.438, -5.180]
    ],
  },

  // 2. JALUR ARTERI PRIMER & ARTERI PERKOTAAN (ARTERIAL)
  {
    id: 'jalur_pantura',
    name: 'Jalur Arteri Pantura (Cirebon - Semarang - Rembang - Tuban - Gresik)',
    island: 'Jawa',
    routeType: 'Arteri Nasional',
    tier: 'arterial',
    status: 'Ramai Lancar',
    speedKmh: 54,
    condition: 'Truk Logistik & Muatan Berat Nasional Aktif Terkendali',
    lengthKm: 420,
    center: [110.8, -6.8],
    path: [
      [108.55, -6.72], [108.85, -6.79], [109.13, -6.87], [109.67, -6.89],
      [110.15, -6.95], [110.42, -6.97], [110.64, -6.89], [110.84, -6.81],
      [111.04, -6.75], [111.34, -6.71], [111.70, -6.75], [112.05, -6.90],
      [112.40, -7.12], [112.65, -7.16]
    ],
  },
  {
    id: 'jalur_lintas_selatan',
    name: 'Jalur Lintas Selatan Jawa (JLS Pelabuhan Ratu - Pangandaran - Kebumen - Jogja - Pacitan)',
    island: 'Jawa',
    routeType: 'Arteri Nasional',
    tier: 'arterial',
    status: 'Lancar',
    speedKmh: 62,
    condition: 'Panorama Pesisir Samudera Hindia & Perkerasan Prima',
    lengthKm: 580,
    center: [109.5, -7.8],
    path: [
      [106.55, -6.98], [107.50, -7.45], [108.65, -7.70], [109.65, -7.78],
      [110.35, -7.98], [111.10, -8.20], [111.85, -8.15], [112.55, -8.30]
    ],
  },
  {
    id: 'arteri_sudirman_thamrin',
    name: 'Koridor Arteri Utama Sudirman - M.H. Thamrin Jakarta',
    island: 'Jawa',
    routeType: 'Arteri Perkotaan',
    tier: 'arterial',
    status: 'Ramai Lancar',
    speedKmh: 35,
    condition: 'Ganjil-Genap & Lajur Busway Terintegrasi MRT Jakarta',
    lengthKm: 7.2,
    center: [106.822, -6.205],
    path: [
      [106.801, -6.228], [106.812, -6.218], [106.822, -6.200], [106.823, -6.188],
      [106.824, -6.175]
    ],
  },
  {
    id: 'arteri_gatot_subroto_jkt',
    name: 'Koridor Arteri Gatot Subroto - M.T. Haryono - Cawang Jakarta',
    island: 'Jawa',
    routeType: 'Arteri Perkotaan',
    tier: 'arterial',
    status: 'Padat Merayap',
    speedKmh: 28,
    condition: 'Simpang Susun Semanggi & Kuningan Padat Arus Perkantoran',
    lengthKm: 8.6,
    center: [106.830, -6.235],
    path: [
      [106.805, -6.222], [106.820, -6.230], [106.835, -6.236], [106.855, -6.242],
      [106.875, -6.248]
    ],
  },
  {
    id: 'arteri_pasupati_pasteur',
    name: 'Flyover Pasupati (Mochtar Kusumaatmadja) & Koridor Pasteur Bandung',
    island: 'Jawa',
    routeType: 'Arteri Perkotaan',
    tier: 'arterial',
    status: 'Ramai Lancar',
    speedKmh: 42,
    condition: 'Akses Masuk Gerbang Tol Pasteur ke Jantung Kota Bandung',
    lengthKm: 6.8,
    center: [107.595, -6.898],
    path: [
      [107.565, -6.890], [107.585, -6.895], [107.600, -6.898], [107.615, -6.900],
      [107.632, -6.902]
    ],
  },
  {
    id: 'arteri_soekarno_hatta_bdg',
    name: 'Koridor Arteri Primer Soekarno-Hatta (By Pass Bandung Raya)',
    island: 'Jawa',
    routeType: 'Arteri Perkotaan',
    tier: 'arterial',
    status: 'Ramai Lancar',
    speedKmh: 48,
    condition: 'Arus Lingkar Selatan Bandung Menuju Kawasan Industri Cibiru',
    lengthKm: 18.5,
    center: [107.63, -6.94],
    path: [
      [107.550, -6.930], [107.585, -6.935], [107.630, -6.940], [107.680, -6.945],
      [107.720, -6.935]
    ],
  },
  {
    id: 'arteri_ahmad_yani_sby',
    name: 'Koridor Arteri Utama Ahmad Yani - Wonokromo - Raya Darmo Surabaya',
    island: 'Jawa',
    routeType: 'Arteri Perkotaan',
    tier: 'arterial',
    status: 'Ramai Lancar',
    speedKmh: 38,
    condition: 'Bundaran Waru & Frontage Road Terpantau SITS Surabaya',
    lengthKm: 12.3,
    center: [112.735, -7.310],
    path: [
      [112.728, -7.355], [112.732, -7.325], [112.736, -7.295], [112.739, -7.275],
      [112.742, -7.260]
    ],
  },
  {
    id: 'arteri_suramadu',
    name: 'Koridor Jembatan Nasional Suramadu & Akses Bangkalan Madura',
    island: 'Jawa',
    routeType: 'Arteri Nasional',
    tier: 'arterial',
    status: 'Lancar',
    speedKmh: 75,
    condition: 'Arus Lintas Selat Madura Lancar, Roda Dua Beroperasi Aman',
    lengthKm: 14.5,
    center: [112.775, -7.185],
    path: [
      [112.760, -7.230], [112.770, -7.200], [112.780, -7.180], [112.790, -7.150]
    ],
  },
  {
    id: 'arteri_ringroad_jogja',
    name: 'Ring Road D.I. Yogyakarta (Utara - Gejayan - Monjali - Jombor)',
    island: 'Jawa',
    routeType: 'Arteri Perkotaan',
    tier: 'arterial',
    status: 'Ramai Lancar',
    speedKmh: 46,
    condition: 'Simpang Empat Kentungan & Monjali Terpantau ATCS DIY',
    lengthKm: 16.8,
    center: [110.395, -7.760],
    path: [
      [110.355, -7.755], [110.375, -7.758], [110.400, -7.762], [110.420, -7.770],
      [110.415, -7.795]
    ],
  },
  {
    id: 'arteri_bypass_ngurah_rai',
    name: 'Koridor Bypass Ngurah Rai & Simpang Dewa Ruci Bali',
    island: 'Bali',
    routeType: 'Arteri Perkotaan',
    tier: 'arterial',
    status: 'Ramai Lancar',
    speedKmh: 40,
    condition: 'Underpass Dewa Ruci Terkendali, Arus Wisatawan Bandara',
    lengthKm: 18.2,
    center: [115.185, -8.710],
    path: [
      [115.250, -8.670], [115.210, -8.700], [115.182, -8.715], [115.170, -8.740],
      [115.168, -8.780]
    ],
  },
  {
    id: 'arteri_kipp_ikn',
    name: 'Koridor Poros Sumbu Kebangsaan KIPP IKN Nusantara - Sepaku',
    island: 'Kalimantan',
    routeType: 'Arteri Perkotaan',
    tier: 'arterial',
    status: 'Lancar',
    speedKmh: 65,
    condition: 'Kawasan Inti Pusat Pemerintahan (KIPP) Beroperasi Hijau & Rapi',
    lengthKm: 28,
    center: [116.71, -0.96],
    path: [
      [116.820, -1.050], [116.760, -0.995], [116.715, -0.960], [116.680, -0.920]
    ],
  },
  {
    id: 'trans_sulawesi',
    name: 'Jalur Arteri Trans-Sulawesi (Makassar - Maros - Barru - Parepare)',
    island: 'Sulawesi',
    routeType: 'Arteri Nasional',
    tier: 'arterial',
    status: 'Lancar',
    speedKmh: 68,
    condition: 'Jalur Pesisir Barat Sulawesi Siaga Cuaca Maritim',
    lengthKm: 155,
    center: [119.6, -4.5],
    path: [
      [119.420, -5.140], [119.500, -5.080], [119.570, -5.000], [119.550, -4.820],
      [119.620, -4.420], [119.630, -4.010]
    ],
  },
  {
    id: 'trans_papua',
    name: 'Koridor Trans-Papua (Jayapura - Elelim - Wamena Lembah Baliem)',
    island: 'Papua',
    routeType: 'Jalur Logistik',
    tier: 'arterial',
    status: 'Ramai Lancar',
    speedKmh: 42,
    condition: 'Elevasi Pegunungan Curam, Jembatan Bailey Siaga Kabut',
    lengthKm: 575,
    center: [139.5, -3.8],
    path: [
      [140.700, -2.540], [140.500, -2.570], [140.150, -2.600], [139.750, -3.200],
      [139.380, -3.750], [138.950, -4.080]
    ],
  },

  // 3. JALUR KOLEKTOR PERKOTAAN & PENGHUBUNG KAWASAN (COLLECTOR)
  {
    id: 'kolektor_tb_simatupang',
    name: 'Koridor Kolektor TB Simatupang - Cilandak - Fatmawati Jakarta',
    island: 'Jawa',
    routeType: 'Kolektor',
    tier: 'collector',
    status: 'Ramai Lancar',
    speedKmh: 36,
    condition: 'Arus Koridor Perkantoran Citos & Stasiun MRT Fatmawati',
    lengthKm: 9.4,
    center: [106.798, -6.295],
    path: [
      [106.775, -6.290], [106.792, -6.292], [106.805, -6.295], [106.825, -6.300],
      [106.850, -6.308]
    ],
  },
  {
    id: 'kolektor_merr_sby',
    name: 'Middle East Ring Road (MERR) Jl. Dr. Ir. H. Soekarno Surabaya',
    island: 'Jawa',
    routeType: 'Kolektor',
    tier: 'collector',
    status: 'Ramai Lancar',
    speedKmh: 52,
    condition: 'Konektivitas Surabaya Timur, Kampus ITS & Rungkut Industri',
    lengthKm: 14.2,
    center: [112.785, -7.300],
    path: [
      [112.795, -7.250], [112.790, -7.280], [112.785, -7.310], [112.780, -7.340],
      [112.775, -7.360]
    ],
  },
  {
    id: 'kolektor_sunset_road',
    name: 'Koridor Kolektor Sunset Road - Seminyak - Kerobokan Bali',
    island: 'Bali',
    routeType: 'Kolektor',
    tier: 'collector',
    status: 'Ramai Lancar',
    speedKmh: 32,
    condition: 'Arus Kawasan Pusat Restoran, Perhotelan & Butik Wisata',
    lengthKm: 6.8,
    center: [115.175, -8.700],
    path: [
      [115.185, -8.720], [115.180, -8.705], [115.170, -8.690], [115.160, -8.675]
    ],
  },
  {
    id: 'kolektor_ringroad_medan',
    name: 'Koridor Kolektor Ring Road Gagak Hitam & Setia Budi Medan',
    island: 'Sumatera',
    routeType: 'Kolektor',
    tier: 'collector',
    status: 'Ramai Lancar',
    speedKmh: 38,
    condition: 'Jalur Penghubung Medan Sunggal & Kawasan Kuliner Ring Road',
    lengthKm: 8.5,
    center: [98.635, 3.575],
    path: [
      [98.625, 3.560], [98.632, 3.575], [98.645, 3.585], [98.665, 3.585]
    ],
  },

  // 4. JALUR LOKAL, PEMUKIMAN, & PUSAT WISATA (LOCAL)
  {
    id: 'lokal_kemang_jkt',
    name: 'Koridor Lokal Kemang Raya - Bangka - Senopati Jakarta Selatan',
    island: 'Jawa',
    routeType: 'Jalur Lokal & Wisata',
    tier: 'local',
    status: 'Padat Merayap',
    speedKmh: 22,
    condition: 'Jalur Pemukiman & Sentra Kuliner Kafe, Parkir Tepi Jalan Tertib',
    lengthKm: 4.8,
    center: [106.815, -6.265],
    path: [
      [106.810, -6.242], [106.812, -6.255], [106.815, -6.268], [106.818, -6.280],
      [106.820, -6.290]
    ],
  },
  {
    id: 'lokal_dago_bdg',
    name: 'Koridor Wisata & Pendidikan Dago (Jl. Ir. H. Djuanda) Bandung',
    island: 'Jawa',
    routeType: 'Jalur Lokal & Wisata',
    tier: 'local',
    status: 'Ramai Lancar',
    speedKmh: 28,
    condition: 'Kawasan Kampus ITB, Cikapayang, Factory Outlet & Dago Tea House',
    lengthKm: 6.2,
    center: [107.615, -6.885],
    path: [
      [107.610, -6.910], [107.612, -6.898], [107.615, -6.885], [107.618, -6.870],
      [107.622, -6.852]
    ],
  },
  {
    id: 'lokal_malioboro_jogja',
    name: 'Koridor Sumbu Filosofi Malioboro - Mangkubumi - Titik Nol Km Jogja',
    island: 'Jawa',
    routeType: 'Jalur Lokal & Wisata',
    tier: 'local',
    status: 'Padat Merayap',
    speedKmh: 18,
    condition: 'Kawasan Wisata Pejalan Kaki & Andong, Kecepatan Terbatas',
    lengthKm: 3.5,
    center: [110.366, -7.792],
    path: [
      [110.367, -7.780], [110.366, -7.788], [110.365, -7.794], [110.365, -7.802]
    ],
  },
];

export const getCardinalDirection = (deg: number): { name: string; short: string; compassDeg: number } => {
  const normalized = ((deg % 360) + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return { name: 'Utara', short: 'U', compassDeg: 0 };
  if (normalized >= 22.5 && normalized < 67.5) return { name: 'Timur Laut', short: 'TL', compassDeg: 45 };
  if (normalized >= 67.5 && normalized < 112.5) return { name: 'Timur', short: 'T', compassDeg: 90 };
  if (normalized >= 112.5 && normalized < 157.5) return { name: 'Tenggara', short: 'TG', compassDeg: 135 };
  if (normalized >= 157.5 && normalized < 202.5) return { name: 'Selatan', short: 'S', compassDeg: 180 };
  if (normalized >= 202.5 && normalized < 247.5) return { name: 'Barat Daya', short: 'BD', compassDeg: 225 };
  if (normalized >= 247.5 && normalized < 292.5) return { name: 'Barat', short: 'B', compassDeg: 270 };
  return { name: 'Barat Laut', short: 'BL', compassDeg: 315 };
};

export const getSourceForBasemap = (type: MapBasemapType) => {
  switch (type) {
    case 'satellite':
      return new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
        crossOrigin: 'anonymous',
      });
    case 'elevation':
      return new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 17,
        crossOrigin: 'anonymous',
      });
    case 'thermal':
      return new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
        crossOrigin: 'anonymous',
      });
    case 'traffic':
      return new XYZ({
        urls: [
          'https://mt0.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}',
          'https://mt1.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}',
          'https://mt2.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}',
          'https://mt3.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}',
        ],
        maxZoom: 20,
      });
    case 'dark':
      return new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
        crossOrigin: 'anonymous',
      });
    case 'osm':
    default:
      return new OSM();
  }
};




const createEmptyLayer = (layerName: string, minZoomLevel: number, styleResolver: (feature: any) => Style) => {
  return new VectorLayer({
    source: new VectorSource(),
    style: styleResolver,
    minZoom: minZoomLevel,
    visible: false,
    zIndex: 2,
    properties: { name: layerName }
  });
};

// Map Layer Settings Definition & Defaults (All OFF by default for optimal performance, Tsunami Sensors ON)
export interface MapLayerSettings {
  showActive: boolean;
  showInactive: boolean;
  showPeaks: boolean;
  showSD: boolean;
  showSMP: boolean;
  showSMA: boolean;
  showTectonic: boolean;
  showEarthquakes: boolean;
  showTsunamiSensors: boolean;
  showForests: boolean;
  showKota: boolean;
  showKabupaten: boolean;
  showDesa: boolean;
}

const DEFAULT_MAP_SETTINGS: MapLayerSettings = {
  showActive: false,
  showInactive: false,
  showPeaks: false,
  showSD: false,
  showSMP: false,
  showSMA: false,
  showTectonic: false,
  showEarthquakes: false,
  showTsunamiSensors: false,
  showForests: false,
  showKota: false,
  showKabupaten: false,
  showDesa: false,
};

function getSynchronousUserId(): string {
  try {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('harmony_token') : null;
    if (token) {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload?.id) return String(payload.id);
      }
    }
  } catch (e) {}
  return '';
}

// Clean up legacy global keys so previous versions do not force 'true'
if (typeof window !== 'undefined' && !window.localStorage.getItem('hm_migrated_v3')) {
  try {
    ['hm_showActive', 'hm_showInactive', 'hm_showPeaks', 'hm_showSD', 'hm_showSMP', 'hm_showSMA', 'hm_showTectonic', 'hm_showEarthquakes', 'hm_showForests', 'hm_showKota', 'hm_showKabupaten', 'hm_showDesa', 'hm_equator_zones'].forEach(k => window.localStorage.removeItem(k));
    Object.keys(window.localStorage).forEach((k) => {
      if (k.startsWith('hm_user_layers_')) {
        try {
          const parsed = JSON.parse(window.localStorage.getItem(k) || '{}');
          parsed.showTsunamiSensors = false;
          window.localStorage.setItem(k, JSON.stringify(parsed));
        } catch (e) {}
      }
    });
    window.localStorage.setItem('hm_migrated_v3', 'true');
  } catch (e) {}
}

function useUserMapSettings(userId: string, profileMapSettings?: Partial<MapLayerSettings>) {
  const getStoredSettings = (uid: string): MapLayerSettings => {
    try {
      const key = `hm_user_layers_${uid}`;
      const stored = window.localStorage.getItem(key);
      if (stored !== null) {
        return { ...DEFAULT_MAP_SETTINGS, ...JSON.parse(stored) };
      }
      if (profileMapSettings) {
        return { ...DEFAULT_MAP_SETTINGS, ...profileMapSettings };
      }
    } catch (e) {}
    return DEFAULT_MAP_SETTINGS;
  };

  const [settings, setSettings] = useState<MapLayerSettings>(() => getStoredSettings(userId));

  useEffect(() => {
    setSettings(getStoredSettings(userId));
  }, [userId, profileMapSettings]);

  const updateSetting = <K extends keyof MapLayerSettings>(
    key: K,
    value: boolean | ((prev: boolean) => boolean)
  ) => {
    setSettings((prev) => {
      const nextVal = typeof value === 'function' ? (value as any)(prev[key]) : value;
      const nextSettings = { ...prev, [key]: nextVal };
      try {
        window.localStorage.setItem(`hm_user_layers_${userId}`, JSON.stringify(nextSettings));
      } catch (e) {}

      // Persist to server profile if user is authenticated
      if (userId && userId !== 'guest') {
        apiClient.post('/api/profile', { mapSettings: nextSettings }).catch(() => {});
      }

      return nextSettings;
    });
  };

  return { settings, updateSetting };
}

// Reusable Toggle Component
const Toggle = ({ checked, onChange, activeClass = "bg-brand-500" }: { checked: boolean, onChange: (v: boolean) => void, activeClass?: string }) => (
  <div className="relative inline-flex items-center cursor-pointer" onClick={() => onChange(!checked)}>
    <div className={`w-9 h-5 rounded-full transition-colors ${checked ? activeClass : 'bg-slate-200 dark:bg-slate-700'}`}>
      <div className={`absolute top-0.5 left-0.5 bg-white border border-slate-200 rounded-full h-4 w-4 transition-transform ${checked ? 'translate-x-4 border-transparent shadow-sm' : ''}`}></div>
    </div>
  </div>
);

// SD (Cyan/Light Blue)
const styleSD = new Style({ image: new CircleStyle({ radius: 2, fill: new Fill({ color: '#06b6d4' }) }), zIndex: 4 });

// SMP (Standard Blue)
const styleSMP = new Style({ image: new CircleStyle({ radius: 2, fill: new Fill({ color: '#3b82f6' }) }), zIndex: 4 });

// SMA/Other (Dark Navy)
const styleSMA = new Style({ image: new CircleStyle({ radius: 2, fill: new Fill({ color: '#1e3a8a' }) }), zIndex: 4 });

// Active User School (Larger solid dot, no hollow ring)
const styleActiveSchool = new Style({
  image: new CircleStyle({ radius: 5, fill: new Fill({ color: '#10b981' }) }), // Emerald green so it completely stands out
  zIndex: 10
});

export function MapsView() {
  const mapRef = useRef<Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const popupOverlayRef = useRef<Overlay | null>(null);
  const vectorLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const schoolsLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const activeSchoolLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const navigate = useNavigate();
  const { setMobileOpen } = useOutletContext<{ setMobileOpen: (v: boolean) => void }>();
  const { currentProfile, currentUser } = useAuth();
  const { setSelection } = useSchool();
  
  // Custom Event Listener for popup buttons
  useEffect(() => {
    const handleViewProfile = (e: any) => {
      if (e.detail?.id) {
        setSelection({ id: e.detail.id, name: e.detail.name } as any);
        navigate('/app/resilience');
      }
    };
    window.addEventListener('view-school-profile', handleViewProfile);
    return () => window.removeEventListener('view-school-profile', handleViewProfile);
  }, [navigate, setSelection]);

  const userSchoolId = currentProfile?.schoolId;

  const [mountains, setMountains] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [earthquakes, setEarthquakes] = useState<any[]>([
    { place: 'Selatan Jawa Timur (Samudra Hindia)', lat: -8.82, lng: 112.54, mag: 4.8, depth: 24 },
    { place: 'Selat Sunda (Banten)', lat: -6.42, lng: 105.18, mag: 5.1, depth: 10 },
    { place: 'Palu - Sigi Sulawesi Tengah', lat: -1.02, lng: 119.88, mag: 4.4, depth: 15 },
    { place: 'Barat Daya Malang Jawa Timur', lat: -8.95, lng: 112.48, mag: 4.2, depth: 32 },
  ]);

  useEffect(() => {
    let isMounted = true;
    const fetchLiveBMKGQuakes = async () => {
      try {
        const [autoGempa, terkini] = await Promise.all([
          bmkgService.getAutoGempa(),
          bmkgService.getGempaTerkini(),
        ]);
        if (!isMounted) return;
        const list: any[] = [];
        if (autoGempa && autoGempa.lat && autoGempa.lng) {
          list.push({
            place: `[BMKG InaTEWS Terkini] ${autoGempa.location}`,
            lat: autoGempa.lat,
            lng: autoGempa.lng,
            mag: autoGempa.magnitude,
            depth: autoGempa.depthKm,
            felt: autoGempa.felt,
            shakemapUrl: autoGempa.shakemapUrl,
            time: `${autoGempa.date} ${autoGempa.time}`,
          });
        }
        if (Array.isArray(terkini)) {
          terkini.forEach((g) => {
            if (g.lat && g.lng) {
              list.push({
                place: g.location,
                lat: g.lat,
                lng: g.lng,
                mag: g.magnitude,
                depth: g.depthKm,
                time: `${g.date} ${g.time}`,
              });
            }
          });
        }
        if (list.length > 0) {
          setEarthquakes(list);
        }
      } catch (err) {
        console.warn('Could not fetch live BMKG quakes in MapsView:', err);
      }
    };
    fetchLiveBMKGQuakes();
    return () => { isMounted = false; };
  }, []);
  const [mapReady, setMapReady] = useState(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mapMode, setMapMode] = useState<'spatial' | 'news' | 'art'>('spatial');
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  
  const [showPanel, setShowPanel] = useState(false);
  const [panelTab, setPanelTab] = useState<'all' | 'basemap' | 'disaster' | 'weather' | 'places'>('all');

  // Basemap & Provenance State (>2020 High Accuracy Standards)
  const [activeMapBasemap, setActiveMapBasemap] = useState<MapBasemapType>('osm');
  const [showBasemapMenu, setShowBasemapMenu] = useState<boolean>(false);
  const [showMetadataModal, setShowMetadataModal] = useState<boolean>(false);
  const [showDataProvenanceModal, setShowDataProvenanceModal] = useState<boolean>(false);
  const [showTrafficCorridors, setShowTrafficCorridors] = useState<boolean>(false);
  const [showObservationCoverage, setShowObservationCoverage] = useState<boolean>(false);
  const [selectedCorridor, setSelectedCorridor] = useState<TrafficCorridor | null>(null);
  const [trafficTierFilter, setTrafficTierFilter] = useState<'all' | 'expressway' | 'arterial' | 'collector' | 'local'>('all');
  const [trafficSearchQuery, setTrafficSearchQuery] = useState<string>('');

  // Compass Rose & Wind Direction State (Fitur Arah Mata Angin)
  const [windDirectionDeg, setWindDirectionDeg] = useState<number>(135);
  const [windSpeedKmh, setWindSpeedKmh] = useState<number>(14);
  const [showWindDetail, setShowWindDetail] = useState<boolean>(false);

  // Layer references for dynamic updates
  const baseTileLayerRef = useRef<TileLayer<any> | null>(null);
  const trafficOverlayLayerRef = useRef<TileLayer<any> | null>(null);

  // Per-User Settings: defaults to all OFF for new accounts/users
  const activeUserId = currentProfile?.userId || currentUser?.id || getSynchronousUserId() || 'guest';
  const profileMapSettings = (currentProfile as any)?.mapSettings;
  const { settings, updateSetting } = useUserMapSettings(activeUserId, profileMapSettings);

  // 3D Perspective & Globe Mode State (Persisted per user)
  const [is3D, setIs3D] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(`hm_is3d_${activeUserId}`) === 'true';
    } catch (e) {
      return false;
    }
  });

  const [globeType, setGlobeType] = useState<'globe' | 'perspective'>(() => {
    try {
      const stored = window.localStorage.getItem(`hm_globetype_${activeUserId}`);
      return stored === 'perspective' ? 'perspective' : 'globe';
    } catch (e) {
      return 'globe';
    }
  });

  const [currentRotation, setCurrentRotation] = useState<number>(0);
  const [isOrbiting, setIsOrbiting] = useState<boolean>(false);
  const orbitFrameRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(`hm_is3d_${activeUserId}`);
      if (stored !== null) {
        setIs3D(stored === 'true');
      }
      const storedType = window.localStorage.getItem(`hm_globetype_${activeUserId}`);
      if (storedType === 'perspective' || storedType === 'globe') {
        setGlobeType(storedType as 'globe' | 'perspective');
      }
    } catch (e) {}
  }, [activeUserId]);

  const handleSetGlobeType = (type: 'globe' | 'perspective') => {
    setGlobeType(type);
    try {
      window.localStorage.setItem(`hm_globetype_${activeUserId}`, type);
    } catch (e) {}
    if (type !== 'globe') {
      setTimeout(() => { mapRef.current?.updateSize(); }, 750);
    }
  };

  const handleToggle3D = (val: boolean) => {
    setIs3D(val);
    if (!val) {
      setIsOrbiting(false);
      resetRotationNorth();
    } else {
      const view = mapRef.current?.getView();
      const center = view?.getCenter();
      if (center) {
        const [lng, lat] = toLonLat(center);
        setGlobeInitialCenter({ lat, lng });
      }
    }
    try {
      window.localStorage.setItem(`hm_is3d_${activeUserId}`, String(val));
    } catch (e) {}
    if (globeType !== 'globe') {
      setTimeout(() => { mapRef.current?.updateSize(); }, 750);
    }
  };

  const rotateMapBy = (deltaDeg: number) => {
    const view = mapRef.current?.getView();
    if (!view) return;
    const currentRot = view.getRotation() || 0;
    const targetRot = currentRot + (deltaDeg * Math.PI) / 180;
    view.animate({
      rotation: targetRot,
      duration: 350,
      easing: (t) => t * (2 - t),
    });
  };

  const resetRotationNorth = () => {
    const view = mapRef.current?.getView();
    if (!view) return;
    view.animate({
      rotation: 0,
      duration: 400,
      easing: (t) => t * (2 - t),
    });
  };

  const toggleOrbit = () => {
    setIsOrbiting((prev) => !prev);
  };

  // 360 Auto-Orbit Animation Loop
  useEffect(() => {
    if (!isOrbiting || !is3D) {
      if (orbitFrameRef.current) {
        cancelAnimationFrame(orbitFrameRef.current);
        orbitFrameRef.current = null;
      }
      return;
    }

    let lastTime = performance.now();
    const animateOrbit = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      const view = mapRef.current?.getView();
      if (view) {
        const rotSpeed = 0.22; // ~12.5 deg/sec
        const nextRot = (view.getRotation() || 0) + rotSpeed * dt;
        view.setRotation(nextRot);
        const deg = Math.round((((nextRot % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) * 180) / Math.PI);
        setCurrentRotation(deg);
      }
      orbitFrameRef.current = requestAnimationFrame(animateOrbit);
    };

    orbitFrameRef.current = requestAnimationFrame(animateOrbit);

    return () => {
      if (orbitFrameRef.current) {
        cancelAnimationFrame(orbitFrameRef.current);
        orbitFrameRef.current = null;
      }
    };
  }, [isOrbiting, is3D]);

  // Sync rotation on manual gesture or view changes
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const view = mapRef.current.getView();
    const key = view.on('change:rotation', () => {
      const rot = view.getRotation() || 0;
      const deg = Math.round((((rot % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) * 180) / Math.PI);
      setCurrentRotation(deg);
    });
    return () => {
      if (key) view.un('change:rotation', (key as any).listener);
    };
  }, [mapReady]);

  // Pointer drag to rotate 360° on Right Click or Shift + Drag
  const isPointerRotating = useRef(false);
  const pointerStartX = useRef(0);
  const pointerStartRot = useRef(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!is3D) return;
    if (e.button === 2 || (e.button === 0 && e.shiftKey)) {
      e.preventDefault();
      isPointerRotating.current = true;
      pointerStartX.current = e.clientX;
      pointerStartRot.current = mapRef.current?.getView()?.getRotation() || 0;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPointerRotating.current && mapRef.current) {
      const deltaX = e.clientX - pointerStartX.current;
      const deltaRot = (deltaX / 300) * (2 * Math.PI);
      const newRot = pointerStartRot.current + deltaRot;
      mapRef.current.getView().setRotation(newRot);
      const deg = Math.round((((newRot % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) * 180) / Math.PI);
      setCurrentRotation(deg);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPointerRotating.current) {
      isPointerRotating.current = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
  };



  const showActive = settings.showActive;
  const setShowActive = (v: boolean | ((prev: boolean) => boolean)) => updateSetting('showActive', v);
  const showInactive = settings.showInactive;
  const setShowInactive = (v: boolean | ((prev: boolean) => boolean)) => updateSetting('showInactive', v);
  const showPeaks = settings.showPeaks;
  const setShowPeaks = (v: boolean | ((prev: boolean) => boolean)) => updateSetting('showPeaks', v);
  const showSD = settings.showSD;
  const setShowSD = (v: boolean | ((prev: boolean) => boolean)) => updateSetting('showSD', v);
  const showSMP = settings.showSMP;
  const setShowSMP = (v: boolean | ((prev: boolean) => boolean)) => updateSetting('showSMP', v);
  const showSMA = settings.showSMA;
  const setShowSMA = (v: boolean | ((prev: boolean) => boolean)) => updateSetting('showSMA', v);

  // Geological & Atmospheric States
  const showTectonic = settings.showTectonic;
  const setShowTectonic = (v: boolean | ((prev: boolean) => boolean)) => updateSetting('showTectonic', v);
  const showEarthquakes = settings.showEarthquakes;
  const setShowEarthquakes = (v: boolean | ((prev: boolean) => boolean)) => updateSetting('showEarthquakes', v);
  const showTsunamiSensors = settings.showTsunamiSensors ?? false;
  const setShowTsunamiSensors = (v: boolean | ((prev: boolean) => boolean)) => updateSetting('showTsunamiSensors', v);

  // Weather Map Layer Integration (Native OpenLayers Doppler Radar & Windy ECMWF Studio)
  const [weatherMapOverlay, setWeatherMapOverlay] = useState<string>('none');
  const [weatherRenderMode, setWeatherRenderMode] = useState<'native' | 'windy'>('native');
  const [rainviewerPath, setRainviewerPath] = useState<string>('/v2/radar/nowcast_5');
  const [rainviewerSatellitePath, setRainviewerSatellitePath] = useState<string>('');
  const weatherTileLayerRef = useRef<TileLayer<any> | null>(null);
  const tsunamiSensorsLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const [showWindyModal, setShowWindyModal] = useState(false);
  const [windyOverlay, setWindyOverlay] = useState<string>('rain');
  const [weatherOverlayOpacity, setWeatherOverlayOpacity] = useState<number>(0.85);
  const [weatherInteractionTarget, setWeatherInteractionTarget] = useState<'weather' | 'disaster'>('weather');
  const [windyCoords, setWindyCoords] = useState<{ lat: number; lng: number; zoom: number }>({ lat: -2.5, lng: 118.0, zoom: 5 });

  const updateWindyLocation = useCallback(() => {
    const center = mapRef.current?.getView()?.getCenter();
    if (center) {
      const [lng, lat] = toLonLat(center);
      const z = Math.min(Math.max(Math.round(mapRef.current?.getView()?.getZoom() || 5), 3), 11);
      setWindyCoords({
        lat: Number(lat.toFixed(4)),
        lng: Number(lng.toFixed(4)),
        zoom: z,
      });
    }
  }, []);

  const handleSelectWeatherOverlay = useCallback((overlayKey: string) => {
    if (is3D && globeType === 'globe') {
      handleToggle3D(false);
    }
    updateWindyLocation();
    if (weatherMapOverlay === overlayKey) {
      setWeatherMapOverlay('none');
    } else {
      setWeatherMapOverlay(overlayKey);
      const windyKey = overlayKey === 'bmkg_radar' ? 'radar' : overlayKey === 'bmkg_sat' ? 'satellite' : overlayKey;
      setWindyOverlay(windyKey);
    }
  }, [weatherMapOverlay, updateWindyLocation, is3D, globeType]);

  // Earth Sensor Registry & Multi-Hazard Observatories State
  const [selectedSensorForInspection, setSelectedSensorForInspection] = useState<EarthSensorNode | null>(null);
  const [showMasterTaxonomyModal, setShowMasterTaxonomyModal] = useState(false);
  const [sensorFamilyFilter, setSensorFamilyFilter] = useState<SensorFamily | 'ALL'>('ALL');
  const sensorRegistryStats = useMemo(() => getSensorRegistryStats(), []);

  // Geospatial Studio Modal State (Cloud Button)
  const [showGeospatialModal, setShowGeospatialModal] = useState(false);

  // GPS Location & Realtime Tracking State
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [userAccuracy, setUserAccuracy] = useState<number | null>(null);
  const [userPreciseLocation, setUserPreciseLocation] = useState<PreciseLocationInfo | null>(null);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [isTrackingLive, setIsTrackingLive] = useState(false);
  const [locationStatusToast, setLocationStatusToast] = useState<{
    type: 'success' | 'error';
    title?: string;
    message: string;
    accuracy?: number;
    village?: string;
    subDistrict?: string;
    city?: string;
    province?: string;
    road?: string;
    fullAddress?: string;
  } | null>(null);
  const [globeInitialCenter, setGlobeInitialCenter] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const routeLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const userMarkerLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Garis Khatulistiwa, Garis Balik Tropis & Batas Zona Iklim State (Default OFF)
  const [showEquatorZones, setShowEquatorZones] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem('hm_equator_zones') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [showEquatorGuide, setShowEquatorGuide] = useState<boolean>(false);
  const [activeLayerLoads, setActiveLayerLoads] = useState(0);
  const equatorLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const trafficVectorLayerRef = useRef<VectorLayer<VectorSource> | null>(null);

  // Safety Watchdog: Auto-clear layer loading spinner if stalled
  useEffect(() => {
    if (activeLayerLoads > 0) {
      const timer = setTimeout(() => {
        setActiveLayerLoads(0);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [activeLayerLoads]);

  // Seasonal Intelligence & Global Climate State (38 Provinsi & Seluruh Dunia)
  const [seasonalInfo, setSeasonalInfo] = useState<SeasonalInfo>(() => {
    return seasonalIntelligenceService.calculateSeasonalIntelligence(-7.2575, 112.7521);
  });
  const [globalWeatherSummary, setGlobalWeatherSummary] = useState<{
    temperature?: number;
    weatherDesc?: string;
    weatherCode?: number;
  } | null>(null);
  const [showSeasonalModal, setShowSeasonalModal] = useState<boolean>(false);

  // Update Seasonal Intelligence when user location changes
  useEffect(() => {
    const lat = userCoords?.lat ?? -7.2575;
    const lng = userCoords?.lng ?? 112.7521;
    const info = seasonalIntelligenceService.calculateSeasonalIntelligence(lat, lng);
    setSeasonalInfo(info);

    let isCancelled = false;
    seasonalIntelligenceService.fetchGlobalWeatherAndSeason(lat, lng)
      .then((res: any) => {
        if (!isCancelled && res) {
          setGlobalWeatherSummary({
            temperature: res.currentTemp,
            weatherDesc: res.weatherDesc,
            weatherCode: res.weatherCode,
          });
          setSeasonalInfo(res.seasonalInfo);
        }
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [userCoords?.lat, userCoords?.lng]);

  // Sync Equator Layer visibility
  useEffect(() => {
    if (equatorLayerRef.current) {
      equatorLayerRef.current.setVisible(showEquatorZones);
    }
  }, [showEquatorZones]);

  // Clean up geolocation watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Fetch real-time wind data for current location
  useEffect(() => {
    let isMounted = true;
    const fetchWind = async () => {
      try {
        const targetLat = userCoords?.lat ?? -7.2575;
        const targetLng = userCoords?.lng ?? 112.7521;
        const res = await weatherAggregatorService.fetchConsensusWeather(targetLat, targetLng);
        if (isMounted && res?.current) {
          if (res.current.windDirection !== undefined) {
            setWindDirectionDeg(res.current.windDirection);
          }
          if (res.current.windSpeed !== undefined) {
            setWindSpeedKmh(res.current.windSpeed);
          }
        }
      } catch (e) {}
    };
    fetchWind();
    return () => { isMounted = false; };
  }, [userCoords]);

  const handleFindUserLocation = () => {
    // If already tracking and we have user coords, re-center camera on current user location
    if (isTrackingLive && userCoords) {
      if (mapRef.current) {
        mapRef.current.getView().animate({
          center: fromLonLat([userCoords.lng, userCoords.lat]),
          zoom: Math.max(16, mapRef.current.getView().getZoom() || 16),
          duration: 700,
        });
      }
      setGlobeInitialCenter({ lat: userCoords.lat, lng: userCoords.lng });
      setLocationStatusToast({
        type: 'success',
        title: userPreciseLocation?.village ? `${userPreciseLocation.village}, ${userPreciseLocation.subDistrict || ''}` : 'Lokasi GPS Presisi Terverifikasi',
        message: userPreciseLocation?.shortDisplay || 'Kamera dipusatkan kembali ke koordinat GPS Anda.',
        accuracy: userAccuracy || undefined,
        village: userPreciseLocation?.village,
        subDistrict: userPreciseLocation?.subDistrict,
        city: userPreciseLocation?.city,
        province: userPreciseLocation?.province,
        road: userPreciseLocation?.road,
        fullAddress: userPreciseLocation?.fullAddress,
      });
      return;
    }

    if (!navigator.geolocation) {
      setLocationStatusToast({
        type: 'error',
        title: 'Sensor GPS Tidak Ditemukan',
        message: 'Peramban ini tidak mendukung Geolocation API untuk mendeteksi GPS.',
      });
      return;
    }

    setIsLocatingUser(true);
    setLocationStatusToast(null);

    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocatingUser(false);
        setIsTrackingLive(true);
        const { latitude, longitude, accuracy } = pos.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        setUserAccuracy(accuracy);
        setGlobeInitialCenter({ lat: latitude, lng: longitude });

        // Smooth camera fly in 2D with zoom into street / village level
        if (mapRef.current) {
          const targetZoom = accuracy < 50 ? 17 : accuracy < 200 ? 16 : 15;
          mapRef.current.getView().animate({
            center: fromLonLat([longitude, latitude]),
            zoom: targetZoom,
            duration: 1000,
          });
        }

        const accRounded = Math.round(accuracy);
        setLocationStatusToast({
          type: 'success',
          title: 'Memverifikasi Alamat Geodesi...',
          message: `Koordinat ${latitude.toFixed(5)}°, ${longitude.toFixed(5)}° (Akurasi ±${accRounded}m). Mencari data desa & kecamatan...`,
          accuracy: accRounded,
        });

        // Resolve exact Desa, Kecamatan, Kabupaten, and Road
        try {
          const locInfo = await preciseGeocodingService.reverseGeocode(latitude, longitude, accuracy);
          setUserPreciseLocation(locInfo);
          setLocationStatusToast({
            type: 'success',
            title: locInfo.village ? `${locInfo.village}, ${locInfo.subDistrict || ''}` : 'Lokasi GPS Presisi Terverifikasi',
            message: locInfo.shortDisplay,
            accuracy: accRounded,
            village: locInfo.village,
            subDistrict: locInfo.subDistrict,
            city: locInfo.city,
            province: locInfo.province,
            road: locInfo.road,
            fullAddress: locInfo.fullAddress,
          });
        } catch (err) {
          console.warn('Failed to reverse geocode user position:', err);
        }

        // Start continuous background watch for realtime tracking
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
        let lastGeocodedLat = latitude;
        let lastGeocodedLng = longitude;

        watchIdRef.current = navigator.geolocation.watchPosition(
          async (watchPos) => {
            const lat = watchPos.coords.latitude;
            const lng = watchPos.coords.longitude;
            const acc = watchPos.coords.accuracy;
            setUserCoords({ lat, lng });
            setUserAccuracy(acc);

            // Re-resolve geocode if moved more than 50 meters
            const distMovedKm = geospatialAnalysisService.calculateDistanceKm(lastGeocodedLat, lastGeocodedLng, lat, lng);
            if (distMovedKm > 0.05) {
              lastGeocodedLat = lat;
              lastGeocodedLng = lng;
              const newLocInfo = await preciseGeocodingService.reverseGeocode(lat, lng, acc);
              setUserPreciseLocation(newLocInfo);
            }
          },
          (watchErr) => {
            console.warn('Realtime GPS watch error:', watchErr);
          },
          geoOptions
        );
      },
      (err) => {
        setIsLocatingUser(false);
        setIsTrackingLive(false);
        console.warn('Geolocation error:', err);

        let errMsg = 'Gagal mendeteksi lokasi GPS asli.';
        if (err.code === 1) {
          errMsg = 'Izin lokasi ditolak. Harap klik ikon gembok/izin di bilah browser dan izinkan "Location" agar koordinat dan nama desa Anda terdeteksi akurat.';
        } else if (err.code === 2) {
          errMsg = 'Sinyal satelit GPS tidak dapat ditemukan. Pastikan layanan lokasi pada perangkat aktif.';
        } else if (err.code === 3) {
          errMsg = 'Pencarian lokasi GPS waktu habis (timeout). Silakan periksa jaringan dan coba lagi.';
        }

        setLocationStatusToast({
          type: 'error',
          title: 'Akses GPS Belum Diizinkan',
          message: errMsg,
        });
      },
      geoOptions
    );
  };


  // Layer Refs for new features
  const tectonicLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const earthquakeLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const eqAnimIdRef = useRef<number | null>(null);
  const showForests = settings.showForests;
  const setShowForests = (v: boolean | ((prev: boolean) => boolean)) => updateSetting('showForests', v);
  const showKota = settings.showKota;
  const setShowKota = (v: boolean | ((prev: boolean) => boolean)) => updateSetting('showKota', v);
  const showKabupaten = settings.showKabupaten;
  const setShowKabupaten = (v: boolean | ((prev: boolean) => boolean)) => updateSetting('showKabupaten', v);
  const showDesa = settings.showDesa;
  const setShowDesa = (v: boolean | ((prev: boolean) => boolean)) => updateSetting('showDesa', v);

  const activeLayersCount = useMemo(() => {
    let count = 0;
    if (showActive) count++;
    if (showInactive) count++;
    if (showPeaks) count++;
    if (showSD) count++;
    if (showSMP) count++;
    if (showSMA) count++;
    if (showTectonic) count++;
    if (showEarthquakes) count++;
    if (showTsunamiSensors) count++;
    if (showForests) count++;
    if (showKota) count++;
    if (showKabupaten) count++;
    if (showDesa) count++;
    if (weatherMapOverlay !== 'none') count++;
    if (showTrafficCorridors) count++;
    if (activeMapBasemap !== 'osm') count++;
    return count;
  }, [
    showActive, showInactive, showPeaks, showSD, showSMP, showSMA,
    showTectonic, showEarthquakes, showTsunamiSensors, showForests, showKota, showKabupaten,
    showDesa, weatherMapOverlay, showTrafficCorridors, activeMapBasemap
  ]);

  const handleResetLayerSettings = () => {
    Object.keys(DEFAULT_MAP_SETTINGS).forEach((key) => {
      updateSetting(key as keyof MapLayerSettings, false);
    });
    setWeatherMapOverlay('none');
    setShowTrafficCorridors(false);
    setActiveMapBasemap('osm');
  };

  const forestLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const kotaLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const kabupatenLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const desaLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const sharedBoundarySourceRef = useRef<VectorSource | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  // Client-side search through 200k+ schools (using useMemo for performance)
  const searchResults = useMemo(() => {
    if (searchQuery.trim().length < 3) return [];
    const query = searchQuery.toLowerCase();
    // Return max 10 results to keep it fast and UI clean
    return schools.filter(s => s[4].toLowerCase().includes(query)).slice(0, 10);
  }, [searchQuery, schools]);

  const handleSelectSchool = (school: any) => {
    const lat = school[1];
    const lng = school[2];
    const name = school[4];
    const map = mapRef.current;
    
    if (map) {
      // Animate map view to the school
      map.getView().animate({
        center: fromLonLat([lng, lat]),
        zoom: 17,
        duration: 1500
      });

      // Show popup manually
      if (popupOverlayRef.current && popupRef.current) {
        popupRef.current.innerHTML = `
          <div style="min-width: 160px; font-family: Inter, sans-serif;" class="p-1 relative">
              <button id="close-popup-btn" style="position: absolute; top: -2px; right: -2px; background: #f1f5f9; border-radius: 50%; padding: 2px; border: none; cursor: pointer; color: #94a3b8;">✖</button>
              <strong style="font-size: 13px; color: #1e293b; display: block; margin-bottom: 4px; padding-right: 16px;">${name}</strong>
              <span style="font-size: 11px; color: #64748b; display: block;">Searched Location</span>
          </div>
        `;
        const closeBtn = popupRef.current.querySelector('#close-popup-btn');
        if (closeBtn) {
          closeBtn.addEventListener('click', () => {
            if (popupRef.current) popupRef.current.style.display = 'none';
          });
        }
        popupOverlayRef.current.setPosition(fromLonLat([lng, lat]));
        popupRef.current.style.display = 'block';
      }
    }
    
    setSearchQuery('');
    setIsSearchFocused(false);
  };

  // Fetch Data
  useEffect(() => {
    let mounted = true;
    
    // Fetch mountains
    setActiveLayerLoads(prev => prev + 1);
    fetch('/data/mountains.json')
      .then((res) => res.json())
      .then(async (data) => {
        if (mounted && data) {
          const enriched = await volcanoService.fetchEnrichedVolcanoes(data);
          setMountains(enriched);
        }
      })
      .catch((err) => console.error("Failed to load mountains", err))
      .finally(() => {
        setActiveLayerLoads(prev => Math.max(0, prev - 1));
      });

    // Fetch lightweight schools directly from static JSON for speed
    setActiveLayerLoads(prev => prev + 1);
    fetch('/data/schools-lite.json')
      .then((res) => res.json())
      .then((data) => {
        if (mounted && data && Array.isArray(data)) {
          // Map to optimized tuple format [id, lat, lng, cat, name]
          const mappedSchools = data.map((s: any) => {
             const name = (s.name || s.school_name || "").toUpperCase();
             let cat = 0;
             if (name.includes("TK ") || name.includes("PAUD") || name.includes("KB ")) {
               cat = 1;
             } else if (name.includes("SDN ") || name.includes("SD ") || name.includes("MI ")) {
               cat = 2;
             } else if (name.includes("SMP") || name.includes("MTS")) {
               cat = 3;
             } else if (name.includes("SMA") || name.includes("SMK") || name.includes("MA ")) {
               cat = 4;
             }
             return [
               s.id || s.school_id,
               parseFloat(s.latitude || s.lat),
               parseFloat(s.longitude || s.lng),
               cat,
               s.name || s.school_name
             ];
          }).filter((s) => !isNaN(s[1]) && !isNaN(s[2])); // Only valid coords
          setSchools(mappedSchools);
        }
      })
      .catch((err) => console.error("Failed to load schools", err))
      .finally(() => {
        setActiveLayerLoads(prev => Math.max(0, prev - 1));
      });

    return () => { mounted = false; };
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // 1. Create Shared Source & Boundary Layers IMMEDIATELY
    const sharedSource = new VectorSource();
    sharedBoundarySourceRef.current = sharedSource;

    // Load optimized TopoJSON (Forests + Cagar Alam)
    const forestSource = new VectorSource({
      url: '/indonesia-hutan.topojson',
      format: new TopoJSON()
    });
    const forestLayer = new VectorLayer({
      source: forestSource,
      zIndex: 2,
      visible: false,
      style: (feature) => {
        const geom = feature.getGeometry();
        if (geom) {
          const type = geom.getType();
          let isBox = false;
          if (type === 'Polygon') {
            const coords = (geom as any).getCoordinates();
            if (coords.length === 1 && coords[0].length <= 5) {
              isBox = true;
            }
          } else if (type === 'MultiPolygon') {
            const coords = (geom as any).getCoordinates();
            if (coords.length === 1 && coords[0].length === 1 && coords[0][0].length <= 5) {
              isBox = true;
            }
          }
          if (isBox || feature.get('name') === 'BATAS DESA') {
            return new Style(); // hide it
          }
        }
        return new Style({
          stroke: new Stroke({ color: '#16a34a', width: 1.5 }), // Green-600
          fill: new Fill({ color: 'rgba(22, 163, 74, 0.5)' })
        });
      }
    });
    forestLayerRef.current = forestLayer;

    const kotaSource = new VectorSource({
      url: '/indonesia-kab.topojson',
      format: new TopoJSON()
    });
    const kotaLayer = new VectorLayer({
      source: kotaSource,
      zIndex: 2,
      visible: false,
      style: (feature) => {
        const name = (feature.get('district') || '').toUpperCase();
        if (!name.startsWith('KOTA ')) return new Style();
        return new Style({
          stroke: new Stroke({ color: '#ef4444', width: 2, lineDash: [4, 4] }),
          fill: new Fill({ color: 'rgba(239, 68, 68, 0.15)' })
        });
      }
    });
    kotaLayerRef.current = kotaLayer;

    const kabupatenSource = new VectorSource({
      url: '/indonesia-kab.topojson',
      format: new TopoJSON()
    });
    const kabupatenLayer = new VectorLayer({
      source: kabupatenSource,
      zIndex: 2,
      visible: false,
      style: (feature) => {
        const name = (feature.get('district') || '').toUpperCase();
        if (name.startsWith('KOTA ')) return new Style();
        return new Style({
          stroke: new Stroke({ color: '#f97316', width: 2, lineDash: [4, 4] }),
          fill: new Fill({ color: 'rgba(249, 115, 22, 0.15)' })
        });
      }
    });
    kabupatenLayerRef.current = kabupatenLayer;

    const desaSource = new VectorSource({
      url: '/indonesia-desa.topojson',
      format: new TopoJSON()
    });
    const desaLayer = new VectorLayer({
      source: desaSource,
      zIndex: 2,
      minZoom: 12,
      visible: false,
      style: (feature) => {
        return new Style({
          stroke: new Stroke({ color: '#eab308', width: 1.5, lineDash: [4, 4] }),
          fill: new Fill({ color: 'rgba(234, 179, 8, 0.2)' })
        });
      }
    });
    desaLayerRef.current = desaLayer;

    const baseTile = new TileLayer({
      source: getSourceForBasemap(activeMapBasemap),
      zIndex: 1
    });
    baseTileLayerRef.current = baseTile;

    // Traffic Vector Layer: Real road geometry polylines styled like Google Maps Live Traffic
    const trafficSource = new VectorSource();
    INDONESIA_TRAFFIC_CORRIDORS.forEach((corridor) => {
      if (corridor.path && corridor.path.length > 1) {
        const lineCoords = corridor.path.map(([lng, lat]) => fromLonLat([lng, lat]));
        const lineFeat = new Feature({
          geometry: new LineString(lineCoords),
          isTrafficLine: true,
          corridorData: corridor,
          name: corridor.name,
          status: corridor.status,
          speedKmh: corridor.speedKmh,
          routeType: corridor.routeType,
          tier: corridor.tier,
        });
        trafficSource.addFeature(lineFeat);
      }

      const pointFeat = new Feature({
        geometry: new Point(fromLonLat(corridor.center)),
        isTrafficPoint: true,
        corridorData: corridor,
        name: corridor.name,
        status: corridor.status,
        speedKmh: corridor.speedKmh,
        routeType: corridor.routeType,
        tier: corridor.tier,
      });
      trafficSource.addFeature(pointFeat);
    });

    const trafficVectorLayer = new VectorLayer({
      source: trafficSource,
      zIndex: 22,
      visible: activeMapBasemap === 'traffic' || showTrafficCorridors,
      style: (feature, resolution) => {
        const isLine = feature.get('isTrafficLine');
        const status = feature.get('status') as string;
        const speed = feature.get('speedKmh') as number;
        const name = feature.get('name') as string;
        const tier = (feature.get('tier') as string) || 'arterial';

        const color =
          status === 'Lancar'
            ? '#22c55e'
            : status === 'Ramai Lancar'
            ? '#f59e0b'
            : '#ef4444';

        const isLocal = tier === 'local';
        const isCollector = tier === 'collector';

        // Zoom Level of Detail: Hide local & collector streets when zoomed far out
        if (resolution > 1200 && (isLocal || isCollector)) {
          return [];
        }

        const isZoomedIn = resolution < 120;
        const casingWidth = isZoomedIn ? (isLocal ? 4.5 : isCollector ? 6.0 : 8.0) : (isLocal ? 2.5 : isCollector ? 3.5 : 5.0);
        const innerWidth = isZoomedIn ? (isLocal ? 2.5 : isCollector ? 3.5 : 4.8) : (isLocal ? 1.5 : isCollector ? 2.0 : 3.0);

        if (isLine) {
          return [
            new Style({
              stroke: new Stroke({
                color: '#0f172a',
                width: casingWidth,
                lineCap: 'round',
                lineJoin: 'round',
              }),
            }),
            new Style({
              stroke: new Stroke({
                color: color,
                width: innerWidth,
                lineCap: 'round',
                lineJoin: 'round',
              }),
              text: new Text({
                text: `${name} • ${speed} km/h`,
                font: isZoomedIn ? 'bold 10px system-ui, sans-serif' : 'bold 8.5px system-ui, sans-serif',
                placement: 'line',
                repeat: isZoomedIn ? 400 : 750,
                offsetY: -9,
                fill: new Fill({ color: '#ffffff' }),
                stroke: new Stroke({ color: '#0f172a', width: 3 }),
              }),
            }),
          ];
        }

        if (resolution > 400 && (isLocal || isCollector)) {
          return [];
        }

        return new Style({
          image: new CircleStyle({
            radius: isLocal ? 4 : 5.5,
            fill: new Fill({ color: color }),
            stroke: new Stroke({ color: '#ffffff', width: 1.5 }),
          }),
          text: new Text({
            text: `🚗 ${speed} km/h`,
            font: 'bold 9px system-ui, sans-serif',
            offsetY: 13,
            fill: new Fill({ color: '#ffffff' }),
            stroke: new Stroke({ color: '#0f172a', width: 3 }),
            backgroundFill: new Fill({ color: 'rgba(15, 23, 42, 0.85)' }),
            padding: [2, 4, 2, 4],
          }),
        });
      },
    });
    trafficVectorLayerRef.current = trafficVectorLayer;

    // Google Maps Hybrid Transparent Traffic Overlay (Menampilkan seluruh jalan besar hingga gang kecil)
    const trafficOverlay = new TileLayer({
      source: new XYZ({
        urls: [
          'https://mt0.google.com/vt/lyrs=h,traffic&x={x}&y={y}&z={z}',
          'https://mt1.google.com/vt/lyrs=h,traffic&x={x}&y={y}&z={z}',
          'https://mt2.google.com/vt/lyrs=h,traffic&x={x}&y={y}&z={z}',
          'https://mt3.google.com/vt/lyrs=h,traffic&x={x}&y={y}&z={z}',
        ],
        maxZoom: 20,
      }),
      zIndex: 15,
      opacity: 0.95,
      visible: showTrafficCorridors && activeMapBasemap !== 'traffic',
    });
    trafficOverlayLayerRef.current = trafficOverlay;

    const map = new Map({
      target: containerRef.current,
      layers: [
        baseTile,
        trafficOverlay,
        forestLayer,
        kabupatenLayer,
        kotaLayer,
        desaLayer,
        trafficVectorLayer
      ],
      view: new View({
        center: fromLonLat([113.9213, -0.7893]), // Center of Indonesia
        zoom: 5,
      }),
    });

    // 2. Tectonic Layer (zIndex: 19 - diatas Windy)
    const tectonicSource = new VectorSource();
    const tectonicLayer = new VectorLayer({
      source: tectonicSource,
      style: new Style({ stroke: new Stroke({ color: '#f97316', width: 2 }) }),
      zIndex: 19,
      visible: false
    });
    tectonicLayerRef.current = tectonicLayer;
    map.addLayer(tectonicLayer);

    // 2b. Garis Khatulistiwa (Equator 0°), Garis Balik (Tropics ±23.44°), & Monumen Geodetik (zIndex: 18)
    const equatorSource = new VectorSource();
    const equatorGeoJson = seasonalIntelligenceService.getEquatorLineGeoJson();
    const tropicsGeoJson = seasonalIntelligenceService.getTropicsLinesGeoJson();
    const formatGeoJson = new GeoJSON();
    
    const equatorFeatures = formatGeoJson.readFeatures(equatorGeoJson, {
      featureProjection: 'EPSG:3857'
    });
    const tropicsFeatures = formatGeoJson.readFeatures(tropicsGeoJson, {
      featureProjection: 'EPSG:3857'
    });
    equatorSource.addFeatures([...equatorFeatures, ...tropicsFeatures]);

    // Tambahkan titik monumen Tugu Khatulistiwa bersejarah
    EQUATOR_MONUMENTS.forEach((mon) => {
      const feat = new Feature({
        geometry: new Point(fromLonLat([mon.lng, mon.lat])),
        name: mon.name,
        type: 'monument',
        location: mon.location,
        country: mon.country,
        description: mon.description,
      });
      equatorSource.addFeature(feat);
    });

    const equatorLayer = new VectorLayer({
      source: equatorSource,
      zIndex: 18,
      visible: showEquatorZones,
      style: (feature) => {
        const type = feature.get('type') || '';
        const name = feature.get('name') || '';

        if (type === 'monument') {
          return new Style({
            image: new CircleStyle({
              radius: 5.5,
              fill: new Fill({ color: '#f59e0b' }),
              stroke: new Stroke({ color: '#ffffff', width: 2 })
            }),
            text: new Text({
              text: name,
              font: 'bold 10px system-ui, sans-serif',
              offsetY: -14,
              fill: new Fill({ color: '#fbbf24' }),
              stroke: new Stroke({ color: '#0f172a', width: 3 }),
              padding: [2, 4, 2, 4]
            })
          });
        }

        if (type === 'tropic_cancer') {
          return new Style({
            stroke: new Stroke({
              color: '#10b981', // Emerald Hijau untuk Garis Balik Utara
              width: 1.3, // Lebih tipis
              lineDash: [6, 4],
            }),
            text: new Text({
              text: "GARIS BALIK UTARA (TROPIC OF CANCER +23.44°)",
              font: 'bold 9px system-ui, sans-serif',
              offsetY: -8,
              placement: 'line',
              repeat: 750,
              fill: new Fill({ color: '#34d399' }),
              stroke: new Stroke({ color: '#022c22', width: 2.5 }),
            })
          });
        }

        if (type === 'tropic_capricorn') {
          return new Style({
            stroke: new Stroke({
              color: '#06b6d4', // Cyan Biru untuk Garis Balik Selatan
              width: 1.3, // Lebih tipis
              lineDash: [6, 4],
            }),
            text: new Text({
              text: "GARIS BALIK SELATAN (TROPIC OF CAPRICORN -23.44°)",
              font: 'bold 9px system-ui, sans-serif',
              offsetY: 9,
              placement: 'line',
              repeat: 750,
              fill: new Fill({ color: '#22d3ee' }),
              stroke: new Stroke({ color: '#083344', width: 2.5 }),
            })
          });
        }

        // Garis Khatulistiwa (Equator 0.0000°)
        return new Style({
          stroke: new Stroke({
            color: '#f59e0b', // Emas Kuning Hangat
            width: 1.8, // Lebih tipis (sebelumnya 3.2)
            lineDash: [8, 5],
          }),
          text: new Text({
            text: "GARIS KHATULISTIWA (EQUATOR 0°00'00\")",
            font: 'bold 10px system-ui, sans-serif',
            offsetY: -10,
            placement: 'line',
            repeat: 600,
            fill: new Fill({ color: '#fef08a' }),
            stroke: new Stroke({ color: '#451a03', width: 2.5 }),
          })
        });
      }
    });
    equatorLayerRef.current = equatorLayer;
    map.addLayer(equatorLayer);

    // Native Weather Tile Layer (Rendered directly in OpenLayers for 100% synchronized panning/zooming)
    const weatherTile = new TileLayer({
      zIndex: 16,
      opacity: 0.85,
      visible: false,
    });
    weatherTileLayerRef.current = weatherTile;
    map.addLayer(weatherTile);

    // Earth Sensor Registry & Multi-Hazard Network (10 Families, Global & Indonesia)
    const tsunamiSensorsSource = new VectorSource();
    GLOBAL_EARTH_SENSOR_NETWORK.forEach((sensor) => {
      const feat = new Feature({
        geometry: new Point(fromLonLat([sensor.lng, sensor.lat])),
        isEarthSensor: true,
        isTsunamiSensor: sensor.family === 'OCEAN_HYDROLOGY',
        sensorData: sensor,
        id: sensor.id,
        name: sensor.name,
        code: sensor.code,
        family: sensor.family,
        subCategory: sensor.subCategory,
        platform: sensor.platform,
        provider: sensor.provider,
        country: sensor.country,
        flag: sensor.flag,
        status: sensor.status,
        samplingRate: sensor.samplingRate,
        primaryMeasurement: sensor.primaryMeasurement,
        unit: sensor.unit,
        currentValue: sensor.currentValue,
        accuracy: sensor.accuracy,
        coverage: sensor.coverage,
        disasterRelevance: sensor.disasterRelevance,
        description: sensor.description,
        lastPing: sensor.lastPing,
        telemetryType: sensor.telemetryType,
      });
      tsunamiSensorsSource.addFeature(feat);
    });

    const tsunamiSensorsLayer = new VectorLayer({
      source: tsunamiSensorsSource,
      zIndex: 28,
      visible: showTsunamiSensors,
      style: (feature) => {
        const family = (feature.get('family') as SensorFamily) || 'OCEAN_HYDROLOGY';
        const meta = SENSOR_FAMILY_META[family];
        const baseColor = meta?.colorHex || '#0284c7';
        const isAlert = feature.get('status') === 'ALERT';

        return [
          new Style({
            image: new CircleStyle({
              radius: isAlert ? 14 : 11,
              fill: new Fill({ color: `${baseColor}33` }),
              stroke: new Stroke({ color: baseColor, width: isAlert ? 2 : 1.5 }),
            }),
            zIndex: 1,
          }),
          new Style({
            image: new CircleStyle({
              radius: isAlert ? 5.5 : 4.5,
              fill: new Fill({ color: isAlert ? '#ef4444' : baseColor }),
              stroke: new Stroke({ color: '#ffffff', width: 1.5 }),
            }),
            zIndex: 2,
          }),
        ];
      },
    });
    tsunamiSensorsLayerRef.current = tsunamiSensorsLayer;
    map.addLayer(tsunamiSensorsLayer);

    // Route Polyline Layer (zIndex: 35)
    const routeSource = new VectorSource();
    const routeLayer = new VectorLayer({
      source: routeSource,
      zIndex: 35,
      style: new Style({
        stroke: new Stroke({
          color: '#06b6d4',
          width: 5,
        }),
      }),
    });
    routeLayerRef.current = routeLayer;
    map.addLayer(routeLayer);

    // User GPS Marker Layer with precision accuracy ring & glowing beacon (zIndex: 45)
    const userMarkerSource = new VectorSource();
    const userMarkerLayer = new VectorLayer({
      source: userMarkerSource,
      zIndex: 45,
      style: (feature) => {
        if (feature.get('isAccuracyCircle')) {
          return new Style({
            fill: new Fill({ color: 'rgba(59, 130, 246, 0.12)' }),
            stroke: new Stroke({ color: 'rgba(59, 130, 246, 0.55)', width: 1.5, lineDash: [5, 5] })
          });
        }
        return [
          new Style({
            image: new CircleStyle({
              radius: 14,
              fill: new Fill({ color: 'rgba(37, 99, 235, 0.25)' }),
            }),
            zIndex: 1,
          }),
          new Style({
            image: new CircleStyle({
              radius: 7,
              fill: new Fill({ color: '#2563eb' }),
              stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
            }),
            zIndex: 2,
          }),
        ];
      },
    });
    userMarkerLayerRef.current = userMarkerLayer;
    map.addLayer(userMarkerLayer);

    // 3. Earthquakes Layer (zIndex: 25)
    const eqSource = new VectorSource();
    const eqLayer = new VectorLayer({
      source: eqSource,
      style: (feature) => {
        const mag = feature.get('mag') || 0;
        const baseRadius = Math.max(3, mag * 1.5);
        
        const time = Date.now();
        const cycle = (time % 2000) / 2000;
        const pulseRadius = baseRadius + (cycle * 15);
        const opacity = 1 - cycle;

        return [
           new Style({
             image: new CircleStyle({
               radius: baseRadius,
               fill: new Fill({ color: 'rgba(239, 68, 68, 0.8)' }),
               stroke: new Stroke({ color: '#ef4444', width: 1 })
             })
           }),
           new Style({
             image: new CircleStyle({
               radius: pulseRadius,
               fill: new Fill({ color: `rgba(239, 68, 68, ${opacity * 0.4})` }),
               stroke: new Stroke({ color: `rgba(239, 68, 68, ${opacity})`, width: 1.5 })
             })
           })
        ];
      },
      zIndex: 25,
      visible: false
    });
    earthquakeLayerRef.current = eqLayer;
    map.addLayer(eqLayer);

    const popupOverlay = new Overlay({
      element: popupRef.current!,
      positioning: 'bottom-center',
      stopEvent: false,
      offset: [0, -10]
    });
    map.addOverlay(popupOverlay);
    popupOverlayRef.current = popupOverlay;

    // 4. Mountains Layer (zIndex: 22)
    const mountainSource = new VectorSource();
    const mountainLayer = new VectorLayer({
      source: mountainSource,
      zIndex: 22,
      style: (feature) => {
        const type = feature.get('type');
        const status = feature.get('status');
        let color = '#94a3b8';
        let zIndex = 1;
        if (type === 'volcano') {
          if (status === 'Active') {
            color = '#ef4444';
            zIndex = 3;
          } else {
            color = '#f97316';
            zIndex = 2;
          }
        }
        return new Style({
          image: new RegularShape({
            fill: new Fill({ color }),
            stroke: new Stroke({ color: 'white', width: 1 }),
            points: 3,
            radius: type === 'volcano' && status === 'Active' ? 8 : 6,
            angle: 0,
          }),
          zIndex
        });
      }
    });
    vectorLayerRef.current = mountainLayer;
    map.addLayer(mountainLayer);

    // 5. Schools Layer (zIndex: 30)
    const schoolsSource = new VectorSource();
    const schoolsLayer = new VectorLayer({
      source: schoolsSource,
      zIndex: 30,
      style: (feature, resolution) => {
        const cat = feature.get('cat');
        if (cat === 2) return styleSD;
        if (cat === 3) return styleSMP;
        return styleSMA;
      }
    });
    schoolsLayerRef.current = schoolsLayer;
    map.addLayer(schoolsLayer);

    // 6. Active School Layer (zIndex: 32)
    const activeSchoolSource = new VectorSource();
    const activeSchoolLayer = new VectorLayer({
      source: activeSchoolSource,
      style: styleActiveSchool,
      zIndex: 32
    });
    activeSchoolLayerRef.current = activeSchoolLayer;
    map.addLayer(activeSchoolLayer);

    mapRef.current = map;
    setMapReady(true);

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
      setMapReady(false);
      vectorLayerRef.current = null;
      schoolsLayerRef.current = null;
      activeSchoolLayerRef.current = null;
      tectonicLayerRef.current = null;
      earthquakeLayerRef.current = null;
      weatherTileLayerRef.current = null;
      tsunamiSensorsLayerRef.current = null;
      equatorLayerRef.current = null;
    };
  }, []);

  // Auto switch back to 3D Globe when zooming out in 2D below country level (zoom <= 3.8)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const view = map.getView();

    let switchingTo3D = false;
    const handleResolutionChange = () => {
      if (is3D || switchingTo3D || mapMode !== 'spatial') return;
      const curZoom = view.getZoom();
      if (curZoom !== undefined && curZoom <= 3.8) {
        switchingTo3D = true;
        const center = view.getCenter();
        if (center) {
          const [lng, lat] = toLonLat(center);
          setGlobeInitialCenter({ lat, lng });
        }
        // Set 2D zoom to 5 for clean state when returned
        view.setZoom(5);
        handleToggle3D(true);
        handleSetGlobeType('globe');
        setTimeout(() => {
          switchingTo3D = false;
        }, 1000);
      }
    };

    view.on('change:resolution', handleResolutionChange);
    return () => {
      view.un('change:resolution', handleResolutionChange);
    };
  }, [mapReady, is3D, mapMode]);

  // Render Mountains Layer
  useEffect(() => {
    if (!mapReady || mountains.length === 0 || !vectorLayerRef.current) return;

    const source = vectorLayerRef.current.getSource();
    if (!source) return;

    source.clear();
    const features: Feature[] = [];
    
    for (const m of mountains) {
      if (m.type === 'volcano' && m.status === 'Active' && !showActive) continue;
      if (m.type === 'volcano' && m.status !== 'Active' && !showInactive) continue;
      if (m.type === 'peak' && !showPeaks) continue;
      
      const feature = new Feature({
        geometry: new Point(fromLonLat([m.lng, m.lat])),
        name: m.name,
        type: m.type,
        status: m.status,
        elevation: m.elevation,
        isMountain: true
      });
      features.push(feature);
    }
    source.addFeatures(features);
  }, [mapReady, mountains, showActive, showInactive, showPeaks]);

  // Render Schools Layer (Dynamic BBox Filtering)
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || schools.length === 0 || !schoolsLayerRef.current || !activeSchoolLayerRef.current) return;

    const vectorSource = schoolsLayerRef.current.getSource();
    const activeSource = activeSchoolLayerRef.current.getSource();
    if (!vectorSource || !activeSource) return;

    // Function to only render schools inside the camera view
      const updateVisibleSchools = () => {
        const view = map.getView();
        const zoom = view.getZoom() || 0;
        
        // Don't render schools if zoomed out too far (to save performance)
        if (zoom < 8) {
          vectorSource.clear();
          return;
        }

        // If no school layer is activated, clear immediately and skip 200k array processing
        if (!showSD && !showSMP && !showSMA) {
          vectorSource.clear();
          return;
        }

        const extent = view.calculateExtent(map.getSize());
        const lonLatExtent = transformExtent(extent, 'EPSG:3857', 'EPSG:4326');
        const [minLng, minLat, maxLng, maxLat] = lonLatExtent;

        const features: Feature[] = [];
        const activeFeatures: Feature[] = [];
        
        // Fast math filter loop (only generate OpenLayers Features for visible schools)
        for (const s of schools) {
          const id = s[0];
          const lat = s[1];
          const lng = s[2];
          const cat = s[3]; // 1=TK, 2=SD, 3=SMP, 4=SMA, 0=Other
          
          if (cat === 1) continue; // Skip TK entirely
          
          const isActiveSchool = (id === userSchoolId);
          if (!isActiveSchool) {
            if (cat === 2 && !showSD) continue;
            if (cat === 3 && !showSMP) continue;
            if ((cat === 4 || cat === 0) && !showSMA) continue;
          }
          
          // BBox check
          if (lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat) {
            const feature = new Feature({
              geometry: new Point(fromLonLat([lng, lat])),
              name: s[4],
              id: id,
              cat: cat,
              isActiveSchool,
              isSchool: true
            });
            
            if (isActiveSchool) {
              activeFeatures.push(feature);
            } else {
              features.push(feature);
            }
          }
        }
        
        vectorSource.clear();
        vectorSource.addFeatures(features);
        
        activeSource.clear();
        activeSource.addFeatures(activeFeatures);
      };

      // Call once initially
      updateVisibleSchools();
      
      // Call every time the map moves
      map.on('moveend', updateVisibleSchools);

      return () => {
        map.un('moveend', updateVisibleSchools);
      };
  }, [mapReady, schools, userSchoolId, showSD, showSMP, showSMA]);

  // Update Schools Style dynamically (Fast Toggle without object recreation)
  useEffect(() => {
    if (!schoolsLayerRef.current) return;
    
    schoolsLayerRef.current.setStyle((feature, resolution) => {
      const cat = feature.get('cat');
      
      // Fast Filtering
      if (cat === 2 && !showSD) return [];
      if (cat === 3 && !showSMP) return [];
      if ((cat === 4 || cat === 0) && !showSMA) return [];

      if (cat === 2) return styleSD;
      if (cat === 3) return styleSMP;
      return styleSMA;
    });
  }, [showSD, showSMP, showSMA, schools]);

  // ================= LAYER UPDATES (TECTONIC & ATMOSPHERE) ================= //
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    
    // Auto-zoom out if user activates global layers while zoomed in too close
    if (showTectonic || showEarthquakes) {
      const currentZoom = map.getView().getZoom() || 0;
      if (currentZoom > 7) {
        map.getView().animate({ zoom: 5, duration: 1000 });
      }
    }

    // Tectonic Plates
    if (tectonicLayerRef.current) {
      const source = tectonicLayerRef.current.getSource();
      if (showTectonic && source && source.getFeatures().length === 0) {
        setActiveLayerLoads(prev => prev + 1);
        fetch('/data/tectonic-plates.json')
          .then(r => r.json())
          .then(data => {
            const features = new GeoJSON().readFeatures(data, { featureProjection: 'EPSG:3857' });
            source.addFeatures(features);
          })
          .catch(console.error)
          .finally(() => setActiveLayerLoads(prev => Math.max(0, prev - 1)));
      }
      tectonicLayerRef.current.setVisible(showTectonic);
    }

    // Earthquakes USGS Real-time (Animated Pulsing)
    if (earthquakeLayerRef.current) {
      const source = earthquakeLayerRef.current.getSource();
      if (showEarthquakes && source && source.getFeatures().length === 0) {
        setActiveLayerLoads(prev => prev + 1);
        fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson')
          .then(r => r.json())
          .then(data => {
            const features = new GeoJSON().readFeatures(data, { featureProjection: 'EPSG:3857' });
            source.addFeatures(features);
            if (data.features && data.features.length > 0) {
              const parsed = data.features.slice(0, 50).map((f: any) => ({
                place: f.properties?.place || 'Gempa Lepas Pantai',
                lat: f.geometry?.coordinates[1],
                lng: f.geometry?.coordinates[0],
                mag: f.properties?.mag || 4.5,
                depth: f.geometry?.coordinates[2] || 10,
              }));
              setEarthquakes(parsed);
            }
          })
          .catch(console.error)
          .finally(() => setActiveLayerLoads(prev => Math.max(0, prev - 1)));
      }

      earthquakeLayerRef.current.setVisible(showEarthquakes);

      // Animation Loop (paused when 3D globe is active to prevent lag)
      if (showEarthquakes && !(is3D && globeType === 'globe')) {
        let lastRender = 0;
        const animateEq = (timestamp: number) => {
          if (earthquakeLayerRef.current?.getVisible() && !(is3D && globeType === 'globe')) {
            if (timestamp - lastRender >= 100) {
              earthquakeLayerRef.current.changed();
              lastRender = timestamp;
            }
            eqAnimIdRef.current = requestAnimationFrame(animateEq);
          }
        };
        if (eqAnimIdRef.current) cancelAnimationFrame(eqAnimIdRef.current);
        eqAnimIdRef.current = requestAnimationFrame(animateEq);
      } else {
        if (eqAnimIdRef.current) cancelAnimationFrame(eqAnimIdRef.current);
      }
    }

  }, [showTectonic, showEarthquakes, is3D, globeType]);

  
  // ================= LAYER UPDATES (ADMIN & LANDUSE BOUNDARIES) ================= //
  
  // The SVG is fully static and already loaded via ImageStatic!
  // No dynamic overpass querying is needed for Forests anymore, saving massive bandwidth and RAM.

  // Toggle Visibility for Admin & Landuse Boundaries
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    
    // Update Visibility immediately
    if (forestLayerRef.current) forestLayerRef.current.setVisible(showForests);
    if (kotaLayerRef.current) kotaLayerRef.current.setVisible(showKota);
    if (kabupatenLayerRef.current) kabupatenLayerRef.current.setVisible(showKabupaten);
    if (desaLayerRef.current) desaLayerRef.current.setVisible(showDesa);
  }, [showForests, showKota, showKabupaten, showDesa]);


  // Handle Interactions (Hover & Click)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // We removed pointermove (hover) because hit-testing 200,000 points 60 times a second
    // completely freezes the browser thread. Clicks will still work.

    const handleClick = (e: any) => {
      const feature = map.forEachFeatureAtPixel(
        e.pixel,
        (f) => f,
        { 
          hitTolerance: 5, 
          layerFilter: (layer) => 
            layer === vectorLayerRef.current || 
            layer === schoolsLayerRef.current || 
            layer === activeSchoolLayerRef.current ||
            layer === userMarkerLayerRef.current ||
            layer === tsunamiSensorsLayerRef.current ||
            layer === trafficVectorLayerRef.current ||
            layer === equatorLayerRef.current
        }
      );
      if (feature) {
        const geom = feature.getGeometry();
        const coords =
          geom && geom.getType() === 'Point'
            ? (geom as Point).getCoordinates()
            : (e.coordinate || fromLonLat([113.9213, -0.7893]));
        
        if (popupOverlayRef.current && popupRef.current) {
          if (feature.get('isSchool')) {
            popupRef.current.innerHTML = `
              <div style="min-width: 160px; font-family: Inter, sans-serif;" class="p-1 relative">
                  <button id="close-popup-btn" style="position: absolute; top: -2px; right: -2px; background: #f1f5f9; border-radius: 50%; padding: 2px; border: none; cursor: pointer; color: #94a3b8;">✖</button>
                  <strong style="font-size: 13px; color: #1e293b; display: block; margin-bottom: 4px; padding-right: 16px;">${feature.get('name')}</strong>
                  <span style="font-size: 11px; color: #64748b; display: block;">${feature.get('isActiveSchool') ? '🌟 Your School' : 'School'}</span>
              </div>
            `;
            // Add a button dynamically
            const btn = document.createElement('button');
            btn.className = "mt-2 w-full bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-bold py-1.5 px-3 rounded transition-colors";
            btn.innerText = "View Disaster Profile";
            btn.onclick = () => {
               // Must dispatch custom event since this is inside a raw DOM element attached by OpenLayers
               window.dispatchEvent(new CustomEvent('view-school-profile', { 
                 detail: { id: feature.get('id'), name: feature.get('name') } 
               }));
            };
            popupRef.current.querySelector('div')?.appendChild(btn);

            // Add close event
            const closeBtn = popupRef.current.querySelector('#close-popup-btn');
            if (closeBtn) {
              closeBtn.addEventListener('click', () => {
                if (popupRef.current) popupRef.current.style.display = 'none';
              });
            }

          } else if (feature.get('isEarthSensor') || feature.get('isTsunamiSensor')) {
            const sensorData = feature.get('sensorData') as EarthSensorNode | undefined;
            const name = feature.get('name') || 'Earth Sensor Station';
            const code = feature.get('code') || 'SEN-01';
            const family = (feature.get('family') as SensorFamily) || 'OCEAN_HYDROLOGY';
            const meta = SENSOR_FAMILY_META[family];
            const flag = feature.get('flag') || '📡';
            const platform = feature.get('platform') || 'GROUND_STATION';
            const status = feature.get('status') || 'ONLINE';
            const currentValue = feature.get('currentValue') || (feature.get('waterPressureMpa') ? `${feature.get('waterPressureMpa')} MPa` : 'Aktif (Normal)');
            const accuracy = feature.get('accuracy') || 'High Precision';
            const provider = feature.get('provider') || feature.get('network') || 'National Network';
            const coverage = feature.get('coverage') || feature.get('seaArea') || 'Indonesia & Sekitarnya';
            const badgeBg = meta?.colorHex ? `${meta.colorHex}20` : '#e0f2fe';
            const textColor = meta?.colorHex || '#0284c7';

            popupRef.current.innerHTML = `
                <div style="min-width: 250px; max-width: 300px; font-family: Inter, sans-serif;" class="p-1 relative">
                    <button id="close-popup-btn" style="position: absolute; top: -2px; right: -2px; background: #f1f5f9; border-radius: 50%; padding: 2px 6px; border: none; cursor: pointer; color: #94a3b8; font-size: 12px; font-weight: bold;">✖</button>
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 5px;">
                      <span style="font-size: 15px;">${flag}</span>
                      <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: ${textColor}; background: ${badgeBg}; padding: 1.5px 6px; border-radius: 4px; letter-spacing: 0.3px;">${meta?.name || 'Sensor Bumi'}</span>
                      <span style="font-size: 9px; font-weight: 700; color: #10b981; background: #ecfdf5; padding: 1px 5px; border-radius: 4px; margin-left: auto;">● ${status}</span>
                    </div>
                    <strong style="font-size: 12.5px; color: #0f172a; display: block; margin-bottom: 2px; padding-right: 18px; line-height: 1.25;">${name}</strong>
                    <span style="font-size: 10px; color: #64748b; display: block; margin-bottom: 6px;">ID: <strong style="color: #334155;">${code}</strong> • Platform: ${platform}</span>

                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 8px; margin-bottom: 6px; font-size: 10px; line-height: 1.45;">
                      <div style="margin-bottom: 2px;">
                        <span style="color: #64748b; display: block; font-size: 9px;">Observasi Terkini:</span>
                        <strong style="color: #0f172a; font-size: 10.5px;">${currentValue}</strong>
                      </div>
                      <div style="display: flex; justify-content: space-between; margin-top: 4px; border-top: 1px dashed #e2e8f0; padding-top: 3px;">
                        <span style="color: #64748b;">Akurasi:</span>
                        <strong style="color: #0284c7;">${accuracy}</strong>
                      </div>
                      <div style="display: flex; justify-content: space-between;">
                        <span style="color: #64748b;">Cakupan / Lokasi:</span>
                        <span style="color: #475569; font-weight: 600;">${coverage}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between;">
                        <span style="color: #64748b;">Pengelola:</span>
                        <span style="color: #475569; font-weight: 600;">${provider}</span>
                      </div>
                    </div>

                    <div style="display: flex; gap: 4px; margin-top: 6px;">
                      <button id="inspect-sensor-btn" style="flex: 1; background: #0284c7; color: white; border: none; border-radius: 6px; padding: 6px 8px; font-size: 10px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
                        🔍 Inspeksi Detail
                      </button>
                      <button id="center-sensor-btn" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; font-size: 10px; font-weight: 600; cursor: pointer;">
                        🎯 Pusatkan
                      </button>
                    </div>
                </div>
            `;

            const inspectBtn = popupRef.current.querySelector('#inspect-sensor-btn');
            if (inspectBtn) {
              inspectBtn.addEventListener('click', () => {
                if (sensorData) {
                  setSelectedSensorForInspection(sensorData);
                } else {
                  const constructed: EarthSensorNode = {
                    id: feature.get('id') || 'sensor_auto',
                    name: feature.get('name') || 'Earth Sensor Station',
                    code: feature.get('code') || 'SEN',
                    family: (feature.get('family') as SensorFamily) || 'OCEAN_HYDROLOGY',
                    subCategory: feature.get('subCategory') || 'Deep Ocean Sensor',
                    platform: feature.get('platform') || 'SEAFLOOR_CABLE',
                    provider: feature.get('provider') || feature.get('network') || 'National Observatory',
                    country: feature.get('country') || 'Indonesia',
                    flag: feature.get('flag') || '📡',
                    lat: toLonLat(coords)[1],
                    lng: toLonLat(coords)[0],
                    status: feature.get('status') || 'ONLINE',
                    samplingRate: feature.get('samplingRate') || '10 Hz',
                    primaryMeasurement: feature.get('primaryMeasurement') || 'Tekanan Dasar Laut / Getaran Seismik',
                    unit: feature.get('unit') || 'MPa / gal',
                    currentValue: feature.get('currentValue') || `${feature.get('waterPressureMpa') || 0} MPa`,
                    accuracy: feature.get('accuracy') || 'High Precision Standard',
                    coverage: feature.get('coverage') || feature.get('seaArea') || 'Kawasan Pengamatan',
                    disasterRelevance: feature.get('disasterRelevance') || ['TSUNAMI', 'GEMPA'],
                    description: feature.get('description') || feature.get('significance') || 'Stasiun observasi sensor Bumi terpadu.',
                    lastPing: feature.get('lastPing') || 'Realtime Live',
                    telemetryType: feature.get('telemetryType') || 'Optical Cable Telemetry',
                  };
                  setSelectedSensorForInspection(constructed);
                }
              });
            }

            const centerBtn = popupRef.current.querySelector('#center-sensor-btn');
            if (centerBtn) {
              centerBtn.addEventListener('click', () => {
                map.getView().animate({
                  center: coords,
                  zoom: 8.5,
                  duration: 600,
                });
              });
            }

            const closeBtn = popupRef.current.querySelector('#close-popup-btn');
            if (closeBtn) {
              closeBtn.addEventListener('click', () => {
                if (popupRef.current) popupRef.current.style.display = 'none';
              });
            }
          } else if (feature.get('isMountain')) {
            popupRef.current.innerHTML = `
                <div style="min-width: 140px; font-family: Inter, sans-serif;" class="p-1 relative">
                    <button id="close-popup-btn" style="position: absolute; top: -2px; right: -2px; background: #f1f5f9; border-radius: 50%; padding: 2px; border: none; cursor: pointer; color: #94a3b8;">✖</button>
                    <strong style="font-size: 13px; color: #1e293b; display: block; margin-bottom: 2px; padding-right: 16px;">${feature.get('name')}</strong>
                    <span style="font-size: 11px; color: #64748b; display: block;">${feature.get('type') === 'volcano' ? feature.get('status') + ' Volcano' : 'Mountain Peak'}</span>
                    <span style="font-size: 10px; color: #94a3b8; display: block; margin-top: 2px;">Elev: ${feature.get('elevation')}m</span>
                </div>
            `;
            
            // Add close event
            const closeBtn = popupRef.current.querySelector('#close-popup-btn');
            if (closeBtn) {
              closeBtn.addEventListener('click', () => {
                if (popupRef.current) popupRef.current.style.display = 'none';
              });
            }
          } else if (feature.get('isUserLocation')) {
            const acc = feature.get('accuracy');
            popupRef.current.innerHTML = `
                <div style="min-width: 155px; font-family: Inter, sans-serif;" class="p-1 relative">
                    <button id="close-popup-btn" style="position: absolute; top: -2px; right: -2px; background: #f1f5f9; border-radius: 50%; padding: 2px; border: none; cursor: pointer; color: #94a3b8;">✖</button>
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                      <span style="width: 8px; height: 8px; border-radius: 50%; background: #2563eb; display: inline-block;"></span>
                      <strong style="font-size: 13px; color: #1e293b;">Posisi GPS Anda</strong>
                    </div>
                    <span style="font-size: 11px; color: #64748b; display: block;">Pelacakan Realtime Aktif</span>
                    ${acc ? `<span style="font-size: 10px; color: #0284c7; display: block; margin-top: 2px; font-weight: 600;">Presisi: ±${Math.round(acc)} meter</span>` : ''}
                </div>
            `;
            
            // Add close event
            const closeBtn = popupRef.current.querySelector('#close-popup-btn');
            if (closeBtn) {
              closeBtn.addEventListener('click', () => {
                if (popupRef.current) popupRef.current.style.display = 'none';
              });
            }
          } else if (feature.get('isTrafficLine') || feature.get('isTrafficPoint')) {
            const corridor = feature.get('corridorData') as TrafficCorridor | undefined;
            const name = feature.get('name') || 'Lintasan Jalan & Koridor Trafik';
            const status = feature.get('status') || 'Lancar';
            const speed = feature.get('speedKmh') || 80;
            const routeType = feature.get('routeType') || 'Jalan Tol';
            const condition = corridor?.condition || 'Kondisi Perkerasan Jalan Baik';
            const lengthKm = corridor?.lengthKm || 100;
            const island = corridor?.island || 'Indonesia';
            const statusColor = status === 'Lancar' ? '#22c55e' : status === 'Ramai Lancar' ? '#f59e0b' : '#ef4444';
            const statusBg = status === 'Lancar' ? '#f0fdf4' : status === 'Ramai Lancar' ? '#fffbeb' : '#fef2f2';

            popupRef.current.innerHTML = `
                <div style="min-width: 230px; max-width: 280px; font-family: Inter, sans-serif;" class="p-1 relative">
                    <button id="close-popup-btn" style="position: absolute; top: -2px; right: -2px; background: #f1f5f9; border-radius: 50%; padding: 2px 6px; border: none; cursor: pointer; color: #94a3b8; font-size: 12px; font-weight: bold;">✖</button>
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 5px;">
                      <span style="font-size: 15px;">🛣️</span>
                      <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #8b5cf6; background: #f3e8ff; padding: 1.5px 6px; border-radius: 4px;">${routeType}</span>
                      <span style="font-size: 9px; font-weight: 700; color: ${statusColor}; background: ${statusBg}; padding: 1px 5px; border-radius: 4px; margin-left: auto;">● ${status}</span>
                    </div>
                    <strong style="font-size: 12.5px; color: #0f172a; display: block; margin-bottom: 4px; padding-right: 18px; line-height: 1.25;">${name}</strong>
                    
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 8px; margin-bottom: 4px; font-size: 10px; line-height: 1.45;">
                      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                        <span style="color: #64748b;">Kecepatan Rerata:</span>
                        <strong style="color: ${statusColor}; font-size: 11px;">${speed} km/jam</strong>
                      </div>
                      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                        <span style="color: #64748b;">Panjang Koridor:</span>
                        <span style="color: #334155; font-weight: 600;">${lengthKm} km</span>
                      </div>
                      <div style="display: flex; justify-content: space-between;">
                        <span style="color: #64748b;">Wilayah:</span>
                        <span style="color: #334155; font-weight: 600;">Pulau ${island}</span>
                      </div>
                      <div style="margin-top: 4px; border-top: 1px dashed #e2e8f0; padding-top: 3px; color: #64748b; font-size: 9px;">
                        ${condition}
                      </div>
                    </div>
                </div>
            `;
            const closeBtn = popupRef.current.querySelector('#close-popup-btn');
            if (closeBtn) {
              closeBtn.addEventListener('click', () => {
                if (popupRef.current) popupRef.current.style.display = 'none';
              });
            }
          } else if (feature.get('type') === 'monument') {
            const name = feature.get('name') || 'Monumen Khatulistiwa';
            const location = feature.get('location') || '';
            const description = feature.get('description') || '';
            const country = feature.get('country') || 'Indonesia';

            popupRef.current.innerHTML = `
                <div style="min-width: 220px; max-width: 280px; font-family: Inter, sans-serif;" class="p-1 relative">
                    <button id="close-popup-btn" style="position: absolute; top: -2px; right: -2px; background: #f1f5f9; border-radius: 50%; padding: 2px 6px; border: none; cursor: pointer; color: #94a3b8; font-size: 12px; font-weight: bold;">✖</button>
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                      <span style="font-size: 15px;">🌐</span>
                      <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #f59e0b; background: #fef3c7; padding: 1.5px 6px; border-radius: 4px;">0°00'00" EQUATOR</span>
                    </div>
                    <strong style="font-size: 12.5px; color: #0f172a; display: block; margin-bottom: 2px; padding-right: 18px;">${name}</strong>
                    <span style="font-size: 10px; color: #64748b; display: block; margin-bottom: 6px;">📍 ${location} (${country})</span>
                    <p style="font-size: 10px; color: #334155; line-height: 1.4; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 8px;">
                      ${description}
                    </p>
                </div>
            `;
            const closeBtn = popupRef.current.querySelector('#close-popup-btn');
            if (closeBtn) {
              closeBtn.addEventListener('click', () => {
                if (popupRef.current) popupRef.current.style.display = 'none';
              });
            }
          }
          
          popupOverlayRef.current.setPosition(coords);
          popupRef.current.style.display = 'block';
        }
      } else {
        if (popupRef.current) popupRef.current.style.display = 'none';
      }
    };

    map.on('click', handleClick);

    return () => {
      map.un('click', handleClick);
    };
  }, []);

  // Sync User GPS Marker & Precision Circle on Map
  useEffect(() => {
    if (!userCoords || !userMarkerLayerRef.current) return;
    const source = userMarkerLayerRef.current.getSource();
    if (!source) return;
    source.clear();

    const center = fromLonLat([userCoords.lng, userCoords.lat]);
    const features: Feature[] = [];

    // Accuracy Circle
    if (userAccuracy && userAccuracy > 0) {
      features.push(
        new Feature({
          geometry: new CircleGeom(center, Math.min(3000, Math.max(10, userAccuracy))),
          isAccuracyCircle: true,
        })
      );
    }

    // High Accuracy Point
    features.push(
      new Feature({
        geometry: new Point(center),
        isUserLocation: true,
        name: 'Lokasi Anda Saat Ini',
        accuracy: userAccuracy,
      })
    );

    source.addFeatures(features);
  }, [userCoords, userAccuracy]);

  // Sync Navigation Route Polyline on Map
  useEffect(() => {
    if (!routeLayerRef.current) return;
    const source = routeLayerRef.current.getSource();
    if (!source) return;
    source.clear();
    if (activeRoute && activeRoute.coordinates.length > 1) {
      const coords = activeRoute.coordinates.map(([lng, lat]) => fromLonLat([lng, lat]));
      const feat = new Feature({
        geometry: new LineString(coords),
      });
      source.addFeature(feat);
      const ext = source.getExtent();
      if (ext && !ext.some(isNaN)) {
        mapRef.current?.getView().fit(ext, { padding: [80, 80, 80, 80], duration: 900 });
      }
    }
  }, [activeRoute]);

  // Dynamically switch basemap source and toggle traffic layer
  useEffect(() => {
    if (!baseTileLayerRef.current) return;
    const newSource = getSourceForBasemap(activeMapBasemap);
    baseTileLayerRef.current.setSource(newSource);

    const isTrafficActive = activeMapBasemap === 'traffic' || showTrafficCorridors;
    if (trafficOverlayLayerRef.current) {
      trafficOverlayLayerRef.current.setVisible(showTrafficCorridors && activeMapBasemap !== 'traffic');
    }
    if (trafficVectorLayerRef.current) {
      trafficVectorLayerRef.current.setVisible(isTrafficActive);
    }
  }, [activeMapBasemap, showTrafficCorridors]);

  // Fetch latest RainViewer radar and satellite timestamp paths on mount
  useEffect(() => {
    let mounted = true;
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then((res) => res.json())
      .then((data) => {
        if (!mounted || !data) return;
        const radarList = data.radar?.past || [];
        if (radarList.length > 0) {
          const latest = radarList[radarList.length - 1];
          setRainviewerPath(latest.path);
        }
        const satList = data.satellite?.infrared || [];
        if (satList.length > 0) {
          const latestSat = satList[satList.length - 1];
          setRainviewerSatellitePath(latestSat.path);
        }
      })
      .catch((err) => {
        console.warn('RainViewer API fetch failed, using fallback nowcast path:', err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Auto-sync Windy overlay coordinates on OpenLayers map move (debounced)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    let syncTimer: any = null;
    const handleSyncWindy = () => {
      if (syncTimer) clearTimeout(syncTimer);
      syncTimer = setTimeout(() => {
        const center = map.getView().getCenter();
        if (!center) return;
        const [lng, lat] = toLonLat(center);
        const z = Math.min(Math.max(Math.round(map.getView().getZoom() || 5), 3), 11);
        setWindyCoords((prev) => {
          if (Math.abs(prev.lat - lat) > 0.15 || Math.abs(prev.lng - lng) > 0.15 || prev.zoom !== z) {
            return { lat: Number(lat.toFixed(4)), lng: Number(lng.toFixed(4)), zoom: z };
          }
          return prev;
        });
      }, 400);
    };

    map.on('moveend', handleSyncWindy);
    return () => {
      if (syncTimer) clearTimeout(syncTimer);
      map.un('moveend', handleSyncWindy);
    };
  }, [mapReady]);

  // Keep OpenLayers weather tile layer off because Windy directly powers the active weather map
  useEffect(() => {
    const weatherLayer = weatherTileLayerRef.current;
    if (weatherLayer) {
      weatherLayer.setVisible(false);
    }
  }, [weatherMapOverlay]);

  // Sync Earth Sensors layer visibility & family filter
  useEffect(() => {
    if (!tsunamiSensorsLayerRef.current) return;
    tsunamiSensorsLayerRef.current.setVisible(showTsunamiSensors);
    
    const source = tsunamiSensorsLayerRef.current.getSource();
    if (!source) return;
    
    source.getFeatures().forEach((feat) => {
      const family = feat.get('family') as SensorFamily;
      if (sensorFamilyFilter === 'ALL' || family === sensorFamilyFilter) {
        feat.setStyle(undefined);
      } else {
        feat.setStyle(new Style({}));
      }
    });
  }, [showTsunamiSensors, sensorFamilyFilter]);

  return (
    <div 
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={(e) => { if (is3D) e.preventDefault(); }}
      className="relative h-full w-full bg-slate-950 overflow-hidden select-none"
    >
      {/* 3D Deep Cosmos Stars Backdrop when in 3D Mode */}
      {is3D && mapMode === 'spatial' && (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-slate-950 transition-opacity duration-700">
          <div 
            className="absolute inset-0 opacity-45"
            style={{
              backgroundImage: 'radial-gradient(1.5px 1.5px at 25px 35px, #ffffff, rgba(0,0,0,0)), radial-gradient(1px 1px at 90px 145px, #93c5fd, rgba(0,0,0,0)), radial-gradient(1.5px 1.5px at 160px 75px, #e2e8f0, rgba(0,0,0,0)), radial-gradient(2px 2px at 250px 195px, #60a5fa, rgba(0,0,0,0)), radial-gradient(1px 1px at 330px 55px, #ffffff, rgba(0,0,0,0)), radial-gradient(1.5px 1.5px at 410px 230px, #cbd5e1, rgba(0,0,0,0))',
              backgroundSize: '450px 300px'
            }}
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-sky-500/10 blur-[130px] pointer-events-none" />
        </div>
      )}

      {/* 3D Atmospheric Depth & Horizon Glow for Perspective mode */}
      {is3D && mapMode === 'spatial' && globeType === 'perspective' && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-slate-950 via-slate-950/60 to-transparent z-10 transition-opacity duration-700" />
      )}

      {/* 3D Active Status Pill */}
      {is3D && mapMode === 'spatial' && globeType !== 'globe' && (
        <div className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-indigo-500/50 text-[11px] font-bold text-indigo-200 shadow-xl animate-in fade-in duration-300">
          <Globe className={`w-3.5 h-3.5 text-sky-400 ${isOrbiting ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
          <span>Perspektif 3D (360°)</span>
          <span className="text-[10px] bg-indigo-500/30 text-indigo-300 px-1.5 py-0.2 rounded-md font-mono">
            {currentRotation}°
          </span>
        </div>
      )}

      {/* Real 3D Globe (Three.js WebGL) */}
      {is3D && mapMode === 'spatial' && globeType === 'globe' && (
        <div className="absolute inset-0 z-10 animate-in fade-in duration-500">
          <GlobeView3D 
            mountains={mountains}
            showActiveVolcanoes={showActive}
            showInactiveVolcanoes={showInactive}
            showPeaks={showPeaks}
            showTectonicPlates={showTectonic}
            showEarthquakes={showEarthquakes}
            showEarthSensors={showTsunamiSensors}
            onSelectSensor={(sensor) => setSelectedSensorForInspection(sensor)}
            activeRouteCoords={activeRoute?.coordinates}
            initialCenter={globeInitialCenter}
            userCoords={userCoords}
            onSwitchTo2D={(lat, lng, targetZoom = 7.5) => {
              handleToggle3D(false);
              mapRef.current?.getView().animate({
                center: fromLonLat([lng, lat]),
                zoom: targetZoom,
                duration: 600,
              });
            }}
          />
        </div>
      )}

      {/* 2D OpenLayers Map - Always rendered, hidden when true 3D globe is shown */}
      <div 
        className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ${
          is3D && globeType !== 'globe'
            ? 'map-viewport-3d' 
            : 'map-viewport-2d'
        }`}
        style={{
          perspective: (is3D && globeType !== 'globe') ? '1200px' : 'none',
          perspectiveOrigin: '50% 50%',
          opacity: (is3D && globeType === 'globe') ? 0 : 1,
          pointerEvents: (is3D && globeType === 'globe') ? 'none' : 'auto',
        }}
      >
        <div 
          className={`w-full h-full transition-transform duration-700 ${
            is3D && globeType !== 'globe' ? 'map-tilt-3d' : 'map-tilt-2d'
          }`}
        >
          {/* OpenLayers Map Canvas (Active when weather overlay is off) */}
          <div 
            ref={containerRef} 
            className="w-full h-full" 
            style={{ 
              opacity: (mapMode === 'spatial' && weatherMapOverlay === 'none') ? 1 : 0, 
              pointerEvents: (mapMode === 'spatial' && weatherMapOverlay === 'none') ? 'auto' : 'none' 
            }}
          />

          {/* Full Windy Map Canvas (Directly replaces OpenLayers when weather is active to prevent tile zoom errors) */}
          {weatherMapOverlay !== 'none' && mapMode === 'spatial' && (
            <div className="absolute inset-0 w-full h-full z-10 bg-slate-950 animate-in fade-in duration-300">
              <iframe 
                key={`windy-direct-${windyOverlay}-${Math.round(windyCoords.lat * 5) / 5}-${Math.round(windyCoords.lng * 5) / 5}-${windyCoords.zoom}`}
                width="100%" 
                height="100%" 
                src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=%C2%B0C&metricWind=km/h&zoom=${windyCoords.zoom}&overlay=${windyOverlay}&product=ecmwf&level=surface&lat=${windyCoords.lat}&lon=${windyCoords.lng}`} 
                frameBorder="0"
                title="Peta Cuaca Windy Realtime"
                className="w-full h-full block"
                style={{ border: 'none', pointerEvents: 'auto' }}
                allow="fullscreen; geolocation"
              />
            </div>
          )}
        </div>
      </div>

      {/* Floating Weather Overlay Control Pill Bar (Superimposed Controls) */}
      {weatherMapOverlay !== 'none' && mapMode === 'spatial' && (
        <div className="absolute top-16 left-4 sm:left-16 z-30 max-w-[calc(100%-2rem)] md:max-w-5xl flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-white/15 text-white shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 overflow-x-auto no-scrollbar">
          {/* Active Mode Pill Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
            </span>
            <span className="text-xs font-bold whitespace-nowrap">Peta Cuaca Windy Live</span>
          </div>

          <div className="h-4 w-[1px] bg-slate-700 shrink-0 mx-0.5" />

          {/* Quick parameter switcher pills */}
          <div className="flex items-center gap-1 shrink-0">
            <button 
              onClick={() => handleSelectWeatherOverlay('rain')}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                windyOverlay === 'rain' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
              title="Radar Hujan Presisi Tinggi (Doppler)"
            >
              🌧️ Hujan
            </button>
            <button 
              onClick={() => handleSelectWeatherOverlay('radar')}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                windyOverlay === 'radar' ? 'bg-sky-600 text-white shadow-md' : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
              title="Doppler Weather Radar"
            >
              📡 Radar
            </button>
            <button 
              onClick={() => handleSelectWeatherOverlay('clouds')}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                windyOverlay === 'clouds' ? 'bg-slate-600 text-white shadow-md' : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
              title="Citra Satelit & Tutupan Awan Inframerah"
            >
              ☁️ Satelit &amp; Awan
            </button>
            <button 
              onClick={() => handleSelectWeatherOverlay('temp')}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                windyOverlay === 'temp' ? 'bg-rose-600 text-white shadow-md' : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
              title="Suhu Permukaan & Inframerah Termal"
            >
              🌡️ Suhu
            </button>
            <button 
              onClick={() => handleSelectWeatherOverlay('wind')}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                windyOverlay === 'wind' ? 'bg-teal-600 text-white shadow-md' : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
              title="Vektor & Pola Aliran Angin"
            >
              💨 Angin
            </button>
            <button 
              onClick={() => handleSelectWeatherOverlay('waves')}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                windyOverlay === 'waves' ? 'bg-cyan-600 text-white shadow-md' : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
              title="Gelombang Laut & Oseanografi"
            >
              🌊 Gelombang
            </button>
            <button 
              onClick={() => handleSelectWeatherOverlay('pressure')}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                windyOverlay === 'pressure' ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
              title="Tekanan Udara Permukaan"
            >
              ⏱️ Tekanan
            </button>
            <button 
              onClick={() => handleSelectWeatherOverlay('pm2p5')}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                windyOverlay === 'pm2p5' ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
              title="Konsentrasi Partikulat PM2.5 & Kualitas Udara"
            >
              🍃 Kualitas Udara
            </button>
          </div>

          <div className="h-4 w-[1px] bg-slate-700 shrink-0 mx-0.5" />

          {/* Close Weather & Return to OpenLayers Map */}
          <button
            onClick={() => setWeatherMapOverlay('none')}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold shrink-0 transition-colors shadow-sm cursor-pointer ml-auto"
            title="Tutup Peta Cuaca & Kembali ke Peta Geospasial Utama"
          >
            <X className="w-3.5 h-3.5 text-red-400" />
            <span>Kembali ke Peta Utama</span>
          </button>
        </div>
      )}

      {/* News Map Placeholder */}
      {mapMode === 'news' && (
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900">
          <Newspaper className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" />
          <h2 className="text-2xl font-bold text-slate-500 dark:text-slate-400">Peta Berita</h2>
          <p className="text-slate-400 dark:text-slate-500 mt-2">Tampilan peta berita terpisah. Segera hadir.</p>
        </div>
      )}

      {/* Art Map Placeholder */}
      {mapMode === 'art' && (
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900">
          <Palette className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" />
          <h2 className="text-2xl font-bold text-slate-500 dark:text-slate-400">Harmony Art</h2>
          <p className="text-slate-400 dark:text-slate-500 mt-2">Kanvas kreasi interaktif terpisah. Segera hadir.</p>
        </div>
      )}

      {/* Top Left Menu Button */}
      <button 
        onClick={() => setMobileOpen(true)}
        className="absolute top-4 left-4 z-20 flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-glass backdrop-blur-md hover:bg-slate-50 dark:bg-slate-900/90 dark:border dark:border-slate-800 text-ink-700 dark:text-slate-300 transition-colors"
        aria-label="Buka Menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Map Mode Switcher (Top Right) */}
      <div className={`absolute top-4 z-20 flex flex-col items-end gap-2.5 transition-all duration-300 ${
        showPanel 
          ? 'right-4 opacity-0 pointer-events-none sm:opacity-100 sm:pointer-events-auto sm:right-[26rem]' 
          : 'right-4 opacity-100'
      }`}>
        {/* Desktop View: Full Segmented Tabs */}
        <div className="hidden md:flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-glass border border-slate-200/50 dark:border-slate-800/50 p-1.5">
          <button 
            onClick={() => setMapMode('spatial')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${mapMode === 'spatial' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <MapIcon2 className="w-4 h-4" /> Data
          </button>
          <button 
            onClick={() => setMapMode('news')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${mapMode === 'news' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <Newspaper className="w-4 h-4" /> Berita
          </button>
          <button 
            onClick={() => setMapMode('art')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${mapMode === 'art' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <Paintbrush className="w-4 h-4" /> Art
          </button>
        </div>

        {/* Mobile View: Compact Square Button + Slide Down Dropdown */}
        <div className="relative md:hidden">
          <button
            onClick={() => setIsModeDropdownOpen((prev) => !prev)}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-glass backdrop-blur-md hover:bg-slate-50 dark:bg-slate-900/90 dark:border dark:border-slate-800 text-slate-700 dark:text-slate-200 transition-all active:scale-95"
            aria-label="Pilih Mode Peta"
            title="Pilih Mode Peta"
          >
            {mapMode === 'spatial' && <MapIcon2 className="h-5 w-5 text-indigo-500" />}
            {mapMode === 'news' && <Newspaper className="h-5 w-5 text-indigo-500" />}
            {mapMode === 'art' && <Paintbrush className="h-5 w-5 text-indigo-500" />}
          </button>

          {/* Backdrop to close dropdown on tap outside */}
          {isModeDropdownOpen && (
            <div 
              className="fixed inset-0 z-30" 
              onClick={() => setIsModeDropdownOpen(false)} 
            />
          )}

          {/* Slide-Down Menu */}
          <AnimatePresence>
            {isModeDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="absolute top-full mt-2 right-0 z-40 w-56 rounded-2xl bg-white/95 p-2 shadow-2xl backdrop-blur-md border border-slate-200/80 dark:bg-slate-900/95 dark:border-slate-800 origin-top-right flex flex-col gap-1"
              >
                <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800/80">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Mode Peta
                  </p>
                </div>

                {/* Option 1: Peta Bencana */}
                <button
                  onClick={() => {
                    setMapMode('spatial');
                    setIsModeDropdownOpen(false);
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    mapMode === 'spatial'
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 font-medium'
                  }`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    mapMode === 'spatial'
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    <MapIcon2 className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold leading-tight">Peta Bencana</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Data spasial & gempa</p>
                  </div>
                </button>

                {/* Option 2: Peta Berita */}
                <button
                  onClick={() => {
                    setMapMode('news');
                    setIsModeDropdownOpen(false);
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    mapMode === 'news'
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 font-medium'
                  }`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    mapMode === 'news'
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    <Newspaper className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold leading-tight">Peta Berita</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Kabar berita terkini</p>
                  </div>
                </button>

                {/* Option 3: Harmony Art */}
                <button
                  onClick={() => {
                    setMapMode('art');
                    setIsModeDropdownOpen(false);
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    mapMode === 'art'
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 font-medium'
                  }`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    mapMode === 'art'
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    <Paintbrush className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold leading-tight">Harmony Art</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Kanvas kreasi interaktif</p>
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Geospatial Earth Intelligence Studio Button (Below Mode Switcher) */}
        <button
          onClick={() => setShowGeospatialModal(true)}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/95 dark:bg-slate-900/95 shadow-glass backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 text-sky-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800 transition-all active:scale-95 group shadow-lg"
          title="Studio Geospasial & Observasi Bumi (SIG, Sentinel-1/2, GNSS, DEM, Cuaca)"
          aria-label="Studio Geospasial & Observasi Bumi"
        >
          <CloudSun className="h-5 w-5 transition-transform group-hover:scale-110" />
        </button>

        {/* Earth Sensor Taxonomy Catalog Button */}
        <button
          onClick={() => setShowMasterTaxonomyModal(true)}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/95 dark:bg-slate-900/95 shadow-glass backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 text-sky-600 dark:text-sky-400 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-slate-800 transition-all active:scale-95 group shadow-lg"
          title="Katalog Master Sensor Pengamatan Bumi (10 Keluarga Inti & 40 Kategori Observasi)"
          aria-label="Katalog Master Sensor Bumi"
        >
          <Radio className="h-5 w-5 transition-transform group-hover:scale-110" />
        </button>

        {/* Quick Windy Weather Map Button */}
        <button
          onClick={() => {
            if (weatherMapOverlay === 'none') {
              handleSelectWeatherOverlay('rain');
            } else {
              setWeatherMapOverlay('none');
            }
          }}
          className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-glass backdrop-blur-xl border transition-all active:scale-95 group shadow-lg ${
            weatherMapOverlay !== 'none'
              ? 'bg-blue-600 text-white border-blue-400 shadow-blue-500/30 ring-2 ring-blue-400/40'
              : 'bg-white/95 dark:bg-slate-900/95 border-slate-200/80 dark:border-slate-800 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800'
          }`}
          title={weatherMapOverlay !== 'none' ? `Lapisan Cuaca Aktif (${windyOverlay.toUpperCase()}). Klik untuk mematikan.` : "Aktifkan Peta Cuaca Windy (Hujan, Suhu, Angin, Awan, Radar)"}
          aria-label="Lapisan Cuaca Windy"
        >
          <CloudRain className="h-5 w-5 transition-transform group-hover:scale-110" />
        </button>

        {/* Quick Basemap Switcher Button */}
        <div className="relative">
          <button
            onClick={() => setShowBasemapMenu((prev) => !prev)}
            className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-glass backdrop-blur-xl border transition-all active:scale-95 group shadow-lg ${
              showBasemapMenu
                ? 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-500/30 ring-2 ring-indigo-400/40'
                : 'bg-white/95 dark:bg-slate-900/95 border-slate-200/80 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800'
            }`}
            title={`Ganti Mode Peta (Aktif: ${BASEMAP_METADATA[activeMapBasemap].name})`}
            aria-label="Mode Peta"
          >
            <Layers className="h-5 w-5 transition-transform group-hover:scale-110" />
          </button>

          {/* Popover Menu for Quick Basemap Switching */}
          <AnimatePresence>
            {showBasemapMenu && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.18 }}
                className="absolute top-full mt-2 right-0 z-40 w-72 sm:w-80 rounded-2xl bg-white/95 dark:bg-slate-900/95 p-2 shadow-2xl backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 flex flex-col gap-1"
              >
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Mode Peta & Lapisan Spasial
                  </p>
                  <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    Data &gt;2020 Terverifikasi
                  </span>
                </div>

                {(Object.keys(BASEMAP_METADATA) as MapBasemapType[]).map((type) => {
                  const meta = BASEMAP_METADATA[type];
                  const isSelected = activeMapBasemap === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setActiveMapBasemap(type);
                        setShowBasemapMenu(false);
                      }}
                      className={`flex items-start gap-2.5 p-2 rounded-xl text-left transition-all ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-500/40 text-indigo-700 dark:text-indigo-300'
                          : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white font-bold text-sm shadow-sm mt-0.5"
                        style={{ backgroundColor: meta.color }}
                      >
                        {type === 'osm' && '🗺️'}
                        {type === 'satellite' && '🛰️'}
                        {type === 'elevation' && '⛰️'}
                        {type === 'thermal' && '🌡️'}
                        {type === 'traffic' && '🛣️'}
                        {type === 'dark' && '🌌'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold truncate">{meta.name}</p>
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            {meta.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                          {meta.description}
                        </p>
                        <p className="text-[9px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                          {meta.year} • {meta.provider.split(',')[0]}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Traffic Structure Quick Toggle */}
        <button
          onClick={() => setShowTrafficCorridors((prev) => !prev)}
          className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-glass backdrop-blur-xl border transition-all active:scale-95 group shadow-lg ${
            showTrafficCorridors || activeMapBasemap === 'traffic'
              ? 'bg-purple-600 text-white border-purple-400 shadow-purple-500/30 ring-2 ring-purple-400/40'
              : 'bg-white/95 dark:bg-slate-900/95 border-slate-200/80 dark:border-slate-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-slate-800'
          }`}
          title="Struktur Lintasan Jalan & Koridor Lalu Lintas Indonesia"
          aria-label="Struktur Lalu Lintas"
        >
          <Car className="h-5 w-5 transition-transform group-hover:scale-110" />
        </button>

        {/* Interactive 360 Compass & Wind Direction Rose (Fitur Arah Mata Angin) */}
        <div className="relative flex flex-col items-center gap-1 mt-1 p-1.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 shadow-glass backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-lg">
          {/* Compass Dial Face */}
          <button
            type="button"
            onClick={resetRotationNorth}
            className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 transition-transform active:scale-95 group cursor-pointer"
            title={`Orientasi Kompas: ${currentRotation}° (${getCardinalDirection(currentRotation).name}). Klik untuk reset ke arah Utara (0°).`}
          >
            {/* Rotating Ring with Cardinal Marks */}
            <div
              className="absolute inset-0.5 rounded-lg flex items-center justify-center transition-transform duration-300 pointer-events-none"
              style={{ transform: `rotate(${-currentRotation}deg)` }}
            >
              <span className="absolute top-0.5 text-[9px] font-black text-red-500">U</span>
              <span className="absolute right-1 text-[7px] font-bold text-slate-400">T</span>
              <span className="absolute bottom-0.5 text-[7px] font-bold text-slate-400">S</span>
              <span className="absolute left-1 text-[7px] font-bold text-slate-400">B</span>

              {/* North / South Needle */}
              <div className="relative w-1.5 h-6 flex flex-col items-center">
                <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[12px] border-b-red-500" />
                <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[12px] border-t-slate-400 dark:border-t-slate-500" />
              </div>

              {/* Wind Direction Arrow (Cyan) */}
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ transform: `rotate(${windDirectionDeg}deg)` }}
              >
                <div className="w-0.5 h-5 bg-cyan-400 opacity-60" />
                <div className="absolute -top-0.5 w-0 h-0 border-l-[2.5px] border-l-transparent border-r-[2.5px] border-r-transparent border-b-[5px] border-b-cyan-400" />
              </div>
            </div>

            {/* Pivot */}
            <div className="w-2 h-2 rounded-full bg-slate-800 dark:bg-white z-10 shadow-sm" />
          </button>

          {/* Heading Reading */}
          <div className="flex items-center gap-0.5 text-[9px] font-mono font-bold text-slate-700 dark:text-slate-300">
            <span className="text-red-500">{getCardinalDirection(currentRotation).short}</span>
            <span>{currentRotation}°</span>
          </div>

          {/* Rotation Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => rotateMapBy(-15)}
              className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              title="Putar -15° (Kiri)"
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
            <button
              type="button"
              onClick={() => rotateMapBy(15)}
              className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              title="Putar +15° (Kanan)"
            >
              <RotateCw className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* Wind Speed Pill (Arah Hembusan Angin) */}
          <button
            type="button"
            onClick={() => setShowWindDetail((prev) => !prev)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 text-[9px] font-bold transition-all"
            title={`Arah Angin: ${getCardinalDirection(windDirectionDeg).name} (${windDirectionDeg}°) @ ${windSpeedKmh} km/jam`}
          >
            <Wind className="w-2.5 h-2.5" />
            <span>{windSpeedKmh} km/j</span>
          </button>
        </div>
      </div>

      {/* Custom OpenLayers & 3D Tilt Styles */}
      <style>{`
        .map-viewport-3d {
          overflow: hidden;
        }
        .map-tilt-3d {
          transform: rotateX(46deg) scale(1.36) translateY(-8%);
          transform-origin: 50% 70%;
          transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .map-tilt-2d {
          transform: rotateX(0deg) scale(1) translateY(0);
          transform-origin: 50% 50%;
          transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .ol-zoom {
          ${weatherMapOverlay !== 'none' ? 'display: none !important;' : `
          top: auto !important;
          bottom: 5.5rem !important;
          left: 1.25rem !important;
          z-index: 25 !important;
          `}
        }
        .ol-zoom button {
          background-color: rgba(255, 255, 255, 0.9) !important;
          color: #334155 !important;
          border-radius: 0.5rem !important;
          margin-top: 0.25rem !important;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) !important;
          width: 2rem !important;
          height: 2rem !important;
          font-size: 1.25rem !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
        }
        .ol-zoom button:hover {
          background-color: white !important;
        }
        html.dark .ol-zoom button {
          background-color: rgba(15, 23, 42, 0.9) !important;
          color: #cbd5e1 !important;
          border: 1px solid #1e293b !important;
        }
        html.dark .ol-zoom button:hover {
          background-color: rgba(30, 41, 59, 0.9) !important;
        }
        .ol-zoom .ol-zoom-out {
          margin-top: 0.5rem !important;
        }
        .ol-control {
          background-color: transparent !important;
          padding: 0 !important;
        }
      `}</style>

      {mapMode === 'spatial' && (
        <>
      {/* Loading Indicator for Map Layers */}
      {activeLayerLoads > 0 && (
        <div className="absolute top-16 right-4 sm:top-20 z-30 flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-glass backdrop-blur-md dark:bg-slate-900/90 dark:border dark:border-slate-800 animate-in fade-in slide-in-from-top-4 duration-300">
           <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
           <span className="text-xs font-bold text-ink-900 dark:text-white">Memuat Data Peta...</span>
        </div>
      )}

      {/* Top Search Bar (Beside Menu Button, leaving room for right-side switcher on mobile) */}
      <div className="absolute top-4 left-16 z-10 w-[calc(100%-8.5rem)] md:w-80 lg:w-96 transition-all duration-300">
        <div className="relative">
          <div className="flex h-11 w-full items-center overflow-hidden rounded-full bg-white px-4 shadow-glass backdrop-blur-md dark:bg-slate-900/90 dark:border dark:border-slate-800 focus-within:ring-2 focus-within:ring-brand-500 transition-shadow">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari sekolah..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              className="h-full w-full bg-transparent px-3 text-sm text-ink-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {isSearchFocused && searchQuery.trim().length >= 3 && (
            <div className="absolute top-full left-0 mt-2 w-full rounded-2xl bg-white py-2 shadow-xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800 overflow-hidden max-h-64 overflow-y-auto">
              {searchResults.length > 0 ? (
                searchResults.map((s) => (
                  <button
                    key={s[0]}
                    onClick={() => handleSelectSchool(s)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink-900 dark:text-white">{s[4]}</p>
                      <p className="text-[10px] text-slate-500">Sekolah</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-center text-sm text-slate-500">
                  Tidak ada sekolah yang cocok.
                </div>
              )}
            </div>
          )}
        </div>
      </div>


      {/* Realtime GPS Status Toast / Card */}
      {locationStatusToast && (
        <div className={`absolute z-30 max-w-xs sm:max-w-md rounded-3xl bg-white/95 dark:bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-3 duration-300 ${
          showPanel ? 'bottom-20 left-6 sm:left-24' : 'bottom-36 right-6'
        }`}>
          <div className="flex items-start gap-3">
            {locationStatusToast.type === 'success' ? (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 mt-0.5">
                <LocateFixed className="h-5 w-5 animate-pulse" />
              </div>
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 mt-0.5">
                <AlertCircle className="h-5 w-5" />
              </div>
            )}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {locationStatusToast.title || (locationStatusToast.type === 'success' ? 'Lokasi GPS Terdeteksi' : 'Akses Lokasi Terkendala')}
                </p>
                {locationStatusToast.accuracy && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-bold">
                    ±{locationStatusToast.accuracy}m
                  </span>
                )}
              </div>

              {locationStatusToast.village && (
                <div className="mt-1.5 p-2.5 rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 space-y-0.5 text-xs">
                  <div className="font-bold text-indigo-600 dark:text-indigo-400 truncate flex items-center gap-1">
                    <span>{locationStatusToast.village}</span>
                    {locationStatusToast.subDistrict && (
                      <span className="text-slate-400 font-normal">• {locationStatusToast.subDistrict}</span>
                    )}
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 text-[11px] truncate">
                    {locationStatusToast.city}, {locationStatusToast.province}
                  </div>
                  {locationStatusToast.road && (
                    <div className="text-slate-500 text-[10px] truncate pt-0.5 border-t border-slate-200/50 dark:border-slate-700/50">
                      📍 {locationStatusToast.road}
                    </div>
                  )}
                </div>
              )}

              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {locationStatusToast.message}
              </p>

              {locationStatusToast.type === 'success' && userCoords && (
                <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                  <button
                    type="button"
                    onClick={() => navigate('/app/geospatial')}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-bold transition-all active:scale-95 shadow-sm"
                  >
                    <Satellite className="h-3 w-3" />
                    <span>Studio Geospasial</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRouteModal(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold transition-all active:scale-95 shadow-sm"
                  >
                    <Navigation className="h-3 w-3" />
                    <span>Panduan Rute AI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (watchIdRef.current !== null) {
                        navigator.geolocation.clearWatch(watchIdRef.current);
                        watchIdRef.current = null;
                      }
                      setIsTrackingLive(false);
                      setLocationStatusToast(null);
                    }}
                    className="text-[10px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium ml-auto"
                  >
                    Tutup
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setLocationStatusToast(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Wind & Atmospheric Vector Detail Modal / Card */}
      <AnimatePresence>
        {showWindDetail && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={`absolute top-44 z-30 w-72 rounded-2xl bg-white/95 dark:bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-2 transition-all duration-300 ${
              showPanel ? 'right-4 sm:right-[27rem]' : 'right-20'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-white">
                <Wind className="w-4 h-4 text-cyan-500" />
                <span>Fitur Arah Mata Angin</span>
              </div>
              <button
                type="button"
                onClick={() => setShowWindDetail(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Arah Hembusan:</span>
                <span className="font-bold text-cyan-600 dark:text-cyan-400">
                  {getCardinalDirection(windDirectionDeg).name} ({windDirectionDeg}°)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Kecepatan Angin:</span>
                <span className="font-bold">{windSpeedKmh} km/jam</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Skala Beaufort:</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {windSpeedKmh < 12 ? '2 (Angin Sepoi-sepoi)' : windSpeedKmh < 20 ? '3 (Angin Lembut)' : '4 (Angin Sedang)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Orientasi Peta:</span>
                <span className="font-mono font-bold">{currentRotation}° ({getCardinalDirection(currentRotation).name})</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
              Data hembusan atmosfer diintegrasikan dari sensor meteorologi dan konsensus ECMWF/GFS.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Traffic Structure & Road Trajectory Floating Panel */}
      <AnimatePresence>
        {(showTrafficCorridors || activeMapBasemap === 'traffic') && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="absolute top-20 left-4 sm:left-16 z-20 w-80 sm:w-[420px] max-h-[75vh] flex flex-col rounded-2xl bg-white/95 dark:bg-slate-900/95 shadow-2xl backdrop-blur-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4" />
                <div>
                  <span className="text-xs font-bold block leading-tight">Lintasan Jalan &amp; Trafik Live</span>
                  <span className="text-[9.5px] opacity-85 block leading-tight">Google Maps Live Traffic Engine</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTrafficCorridors(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                title="Tutup Panel Trafik"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Google Maps Road Coverage Notice */}
            <div className="p-2 border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-300 bg-purple-50/70 dark:bg-purple-950/30 flex items-center gap-1.5">
              <span className="text-purple-600 dark:text-purple-400 font-bold shrink-0">🌐 Visual Google Maps:</span>
              <span className="truncate">Menampilkan jalan tol, arteri, kolektor hingga jalan pemukiman &amp; gang kecil.</span>
            </div>

            {/* Search Input & Tier Filters */}
            <div className="p-2 border-b border-slate-100 dark:border-slate-800 space-y-1.5 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={trafficSearchQuery}
                  onChange={(e) => setTrafficSearchQuery(e.target.value)}
                  placeholder="Cari jalan, tol, kota (cth: Sudirman, Dago, Tol, Bali)..."
                  className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                {trafficSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setTrafficSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Tier Filter Tabs */}
              <div className="flex flex-wrap gap-1">
                {[
                  { key: 'all', label: 'Semua Ruas' },
                  { key: 'expressway', label: 'Tol Trans-Pulau' },
                  { key: 'arterial', label: 'Arteri Kota' },
                  { key: 'collector', label: 'Kolektor' },
                  { key: 'local', label: 'Jalur Lokal/Wisata' },
                ].map((tab) => {
                  const isActive = trafficTierFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setTrafficTierFilter(tab.key as any)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all ${
                        isActive
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Corridors List */}
            <div className="p-2 overflow-y-auto space-y-1.5 max-h-[46vh]">
              {INDONESIA_TRAFFIC_CORRIDORS.filter((corridor) => {
                const matchTier = trafficTierFilter === 'all' || corridor.tier === trafficTierFilter;
                const q = trafficSearchQuery.trim().toLowerCase();
                const matchSearch =
                  !q ||
                  corridor.name.toLowerCase().includes(q) ||
                  corridor.island.toLowerCase().includes(q) ||
                  corridor.routeType.toLowerCase().includes(q) ||
                  corridor.condition.toLowerCase().includes(q);
                return matchTier && matchSearch;
              }).map((corridor) => {
                const statusColor =
                  corridor.status === 'Lancar'
                    ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30'
                    : corridor.status === 'Ramai Lancar'
                    ? 'text-amber-500 bg-amber-500/10 border-amber-500/30'
                    : 'text-rose-500 bg-rose-500/10 border-rose-500/30';

                const tierBadgeColor =
                  corridor.tier === 'expressway'
                    ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                    : corridor.tier === 'arterial'
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    : corridor.tier === 'collector'
                    ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';

                return (
                  <div
                    key={corridor.id}
                    className="p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-all text-xs"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${tierBadgeColor}`}>
                            {corridor.routeType}
                          </span>
                          <span className="font-bold text-slate-800 dark:text-white leading-tight">
                            {corridor.name}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {corridor.island} • {corridor.lengthKm} km • Kecepatan: <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{corridor.speedKmh} km/h</span>
                        </p>
                      </div>
                      <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border shrink-0 ${statusColor}`}>
                        {corridor.status}
                      </span>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 dark:text-slate-400 truncate max-w-[240px]">
                        {corridor.condition}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const targetZoom =
                            corridor.tier === 'local'
                              ? 15
                              : corridor.tier === 'collector'
                              ? 13.5
                              : corridor.tier === 'arterial'
                              ? 12
                              : 9.5;

                          mapRef.current?.getView().animate({
                            center: fromLonLat(corridor.center),
                            zoom: targetZoom,
                            duration: 750,
                          });
                        }}
                        className="px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-700 text-white font-bold shrink-0 ml-2 shadow-xs transition-all flex items-center gap-1"
                        title="Pusatkan dan tampilkan jalan detail"
                      >
                        <span>Pusatkan</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Basemap Quick Switch Footer if on other basemap */}
            {activeMapBasemap !== 'traffic' && (
              <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900 flex items-center justify-between text-[10px]">
                <span className="text-slate-500 dark:text-slate-400">Ingin melihat kanvas Google Maps penuh?</span>
                <button
                  type="button"
                  onClick={() => setActiveMapBasemap('traffic')}
                  className="font-bold text-purple-600 dark:text-purple-400 hover:underline"
                >
                  Aktifkan Basemap Trafik HD &rarr;
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Observation Coverage & Data Gap Floating Panel */}
      <AnimatePresence>
        {showObservationCoverage && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="absolute top-20 left-4 sm:left-16 z-20 w-80 sm:w-96 rounded-2xl bg-white/95 dark:bg-slate-900/95 shadow-2xl backdrop-blur-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
          >
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4" />
                <span className="text-xs font-bold">Cakupan Sensor &amp; Blank Spot Observasi</span>
              </div>
              <button
                type="button"
                onClick={() => setShowObservationCoverage(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-3 space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Peta analisis kesenjangan data pemantauan cuaca dan kebencanaan di seluruh wilayah Indonesia (berdasarkan 45 radar Doppler BMKG &amp; AWS).
              </p>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="font-bold text-emerald-800 dark:text-emerald-300">Tinggi (High Coverage)</span>
                  </div>
                  <span className="text-emerald-700 dark:text-emerald-400 font-mono font-bold">&lt; 20 km</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="font-bold text-amber-800 dark:text-amber-300">Sedang (Asimilasi Satelit)</span>
                  </div>
                  <span className="text-amber-700 dark:text-amber-400 font-mono font-bold">20 - 60 km</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/60">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="font-bold text-rose-800 dark:text-rose-300">Blank Spot (Kesenjangan Data)</span>
                  </div>
                  <span className="text-rose-700 dark:text-rose-400 font-mono font-bold">&gt; 60 km</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => navigate('/app/geospatial')}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Buka Studio Fusi &amp; Prioritas Sensor</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tombol Bulat Pojok Kiri Bawah: Transparansi Sumber Data Resmi (BMKG, PVMBG, BIG, BNPB, Kemendikbud) */}
      {weatherMapOverlay === 'none' && (
        <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 z-30 pointer-events-auto">
          <div className="relative group">
            <button
              type="button"
              onClick={() => setShowDataProvenanceModal(true)}
              aria-haspopup="dialog"
              aria-expanded={showDataProvenanceModal}
              className="relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-gradient-to-tr from-slate-900 via-indigo-950 to-brand-900 text-white shadow-xl shadow-indigo-950/40 border border-indigo-400/50 hover:border-indigo-300 hover:scale-110 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 cursor-pointer"
              title="Transparansi Lengkap Sumber Data Resmi (BMKG, PVMBG, BIG, BNPB, Kemendikbud, ESA, USGS)"
              aria-label="Buka Sumber Data Resmi Kebencanaan"
            >
              {/* Glowing outer pulse */}
              <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-brand-500 opacity-40 blur-sm group-hover:opacity-85 group-hover:blur-md transition duration-300 animate-pulse" />

              {/* Inner circle */}
              <span className="relative flex items-center justify-center h-full w-full rounded-full bg-slate-900/90 backdrop-blur-md">
                <Database className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-300 group-hover:text-white transition-colors" />

                {/* Verified Shield Badge Overlay */}
                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-white ring-1.5 ring-slate-900 shadow-sm" title="Terverifikasi Otoritatif">
                  <ShieldCheck className="h-2 w-2" />
                </span>
              </span>
            </button>

            {/* Floating Tooltip Label (Desktop Hover) */}
            <div className="pointer-events-none absolute left-full ml-2.5 top-1/2 -translate-y-1/2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 whitespace-nowrap z-50 hidden sm:block">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/95 backdrop-blur-md text-white text-xs font-semibold shadow-xl border border-slate-700/80">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Sumber Data Resmi</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  (BMKG, BIG, PVMBG, BNPB, Dapodik)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom-Left Unified Status & Intelligence Bar (Digeser ke kanan agar bebas tabrakan) */}
      {weatherMapOverlay === 'none' && (
        <div className="absolute bottom-3 sm:bottom-4 left-15 sm:left-17 z-20 flex flex-wrap items-center gap-2 max-w-[calc(100vw-12rem)] pointer-events-auto">
          {/* 1. Basemap Provenance Pill */}
          <button
            type="button"
            onClick={() => setShowMetadataModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-900 backdrop-blur-md border border-white/15 text-white text-[11px] font-medium shadow-md transition-all hover:scale-105 cursor-pointer"
            title="Klik untuk melihat informasi validitas & tahun data geospasial"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-slate-200">
              {BASEMAP_METADATA[activeMapBasemap].name.split(' ')[0]}:
            </span>
            <span className="text-emerald-300 font-semibold">
              {BASEMAP_METADATA[activeMapBasemap].year}
            </span>
            <Info className="w-3 h-3 text-slate-400 ml-0.5" />
          </button>

          {/* 2. Seasonal Intelligence & Equator Distance Pill */}
          {seasonalInfo && (
            <button
              type="button"
              onClick={() => setShowSeasonalModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-900 backdrop-blur-md border border-amber-500/30 text-white text-[11px] font-medium shadow-lg transition-all hover:scale-105 cursor-pointer group"
              title="Klik untuk melihat Detail Konsensus Musim & Iklim Global"
            >
              <span className="text-sm leading-none">{seasonalInfo.seasonIcon}</span>
              <div className="flex items-center gap-1.5 text-left">
                <span className="font-bold text-amber-300">
                  {seasonalInfo.seasonName}
                </span>
                {globalWeatherSummary?.temperature !== undefined && (
                  <span className="text-slate-300 font-mono font-bold">
                    {globalWeatherSummary.temperature}°C
                  </span>
                )}
              </div>
              <span className="hidden md:inline-flex items-center text-[10px] text-slate-400 font-mono pl-1 border-l border-slate-700">
                {Math.round(seasonalInfo.distanceToEquatorKm)} km ke Khatulistiwa
              </span>
            </button>
          )}

          {/* 3. Petunjuk & Menu Garis Khatulistiwa 0° */}
          <button
            type="button"
            onClick={() => setShowEquatorGuide((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl backdrop-blur-md border text-[11px] font-medium shadow-md transition-all hover:scale-105 cursor-pointer ${
              showEquatorZones
                ? 'bg-slate-900/85 hover:bg-slate-900 border-amber-400/40 text-amber-300'
                : 'bg-slate-900/60 hover:bg-slate-900/80 border-white/10 text-slate-400'
            }`}
            title="Petunjuk Garis Khatulistiwa 0° & Garis Balik Tropis"
          >
            <span className="w-2.5 h-0.5 rounded-full bg-amber-400" />
            <span className="font-bold">Khatulistiwa 0°</span>
            <ChevronUp className={`w-3 h-3 transition-transform ${showEquatorGuide ? 'rotate-180' : ''}`} />
          </button>
        </div>
      )}

      {/* Floating Equator & Climate Zones Guide Card (Pojok Kiri Bawah) */}
      <AnimatePresence>
        {showEquatorGuide && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            className="absolute bottom-16 left-4 sm:left-6 z-30 w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 p-3.5 shadow-2xl text-white"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-base">🌐</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Petunjuk Garis Khatulistiwa &amp; Iklim</h4>
                  <p className="text-[10px] text-slate-400">Garis batas lintang astronomis bumi</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEquatorGuide(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Legend Items */}
            <div className="py-2.5 space-y-2 text-xs">
              <div className="flex items-start gap-2 p-1.5 rounded-lg bg-slate-800/50">
                <span className="w-3.5 h-1 rounded-full bg-amber-400 mt-1 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300 text-[11px]">Garis Khatulistiwa (0°00'00")</span>
                    <span className="text-[9px] font-mono text-amber-400/80">Ekuator</span>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-tight">
                    Garis tengah bumi pembagi belahan utara & selatan, beriklim tropis ekuatorial sepanjang tahun.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 p-1.5 rounded-lg bg-slate-800/50">
                <span className="w-3.5 h-1 rounded-full bg-emerald-400 mt-1 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-300 text-[11px]">Garis Balik Utara (+23.44°)</span>
                    <span className="text-[9px] font-mono text-emerald-400/80">Cancer</span>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-tight">
                    Batas utara zona iklim tropis, perbatasan zona subtropis utara.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 p-1.5 rounded-lg bg-slate-800/50">
                <span className="w-3.5 h-1 rounded-full bg-cyan-400 mt-1 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-300 text-[11px]">Garis Balik Selatan (-23.44°)</span>
                    <span className="text-[9px] font-mono text-cyan-400/80">Capricorn</span>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-tight">
                    Batas selatan zona iklim tropis, perbatasan zona subtropis selatan.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowEquatorZones((prev) => {
                    const next = !prev;
                    try { window.localStorage.setItem('hm_equator_zones', String(next)); } catch (e) {}
                    if (equatorLayerRef.current) {
                      equatorLayerRef.current.setVisible(next);
                    }
                    return next;
                  });
                }}
                className={`flex-1 py-1.5 px-2 rounded-xl text-[10px] font-bold transition-colors ${
                  showEquatorZones
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {showEquatorZones ? '✓ Garis Aktif' : 'Tampilkan Garis'}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (mapRef.current) {
                    mapRef.current.getView().animate({
                      center: fromLonLat([109.3214, 0.0000]),
                      zoom: 13,
                      duration: 900,
                    });
                  }
                  setShowEquatorGuide(false);
                }}
                className="py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold transition-colors"
                title="Pusatkan ke Tugu Khatulistiwa Pontianak"
              >
                📍 Pontianak
              </button>

              <button
                type="button"
                onClick={() => {
                  if (mapRef.current) {
                    mapRef.current.getView().animate({
                      center: fromLonLat([100.2211, 0.0000]),
                      zoom: 13,
                      duration: 900,
                    });
                  }
                  setShowEquatorGuide(false);
                }}
                className="py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold transition-colors"
                title="Pusatkan ke Tugu Equator Bonjol"
              >
                📍 Bonjol
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Geospatial Metadata Provenance Modal (>2020 High-Accuracy Standards) */}
      <AnimatePresence>
        {showMetadataModal && (
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
            onClick={() => setShowMetadataModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                      Validitas & Metadata Spasial
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Standar SNI ISO 19115 &amp; Kebijakan Satu Peta (One Map Policy)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMetadataModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-4 space-y-3">
                <div className="p-3 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/70 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-indigo-900 dark:text-indigo-300">
                      {BASEMAP_METADATA[activeMapBasemap].name}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      {BASEMAP_METADATA[activeMapBasemap].badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    {BASEMAP_METADATA[activeMapBasemap].description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Tahun Akuisisi Data</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{BASEMAP_METADATA[activeMapBasemap].year}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Lembaga / Provider</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200 truncate block">{BASEMAP_METADATA[activeMapBasemap].provider}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Resolusi Spasial</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{BASEMAP_METADATA[activeMapBasemap].resolution}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Spesifikasi Akurasi</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{BASEMAP_METADATA[activeMapBasemap].accuracy}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                <span>Data di atas terverifikasi pasca-2020 dengan batas toleransi 2015.</span>
                <button
                  type="button"
                  onClick={() => setShowMetadataModal(false)}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-sm"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Seasonal Intelligence & Global Climate Consensus Modal */}
      <AnimatePresence>
        {showSeasonalModal && seasonalInfo && (
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
            onClick={() => setShowSeasonalModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/20 text-lg">
                    {seasonalInfo.seasonIcon}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <span>Konsensus Musim &amp; Iklim Global</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold border border-amber-500/20">
                        {seasonalInfo.zoneCategory}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Deteksi otomatis belahan bumi, peredaran matahari, dan jarak ke Garis Khatulistiwa WGS84
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSeasonalModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-3.5 space-y-4 no-scrollbar">
                {/* Hero Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-sky-500/10 border border-amber-500/20 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-600 dark:text-amber-400 block mb-1">
                      Status Musim Saat Ini ({new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })})
                    </span>
                    <h4 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{seasonalInfo.seasonIcon}</span>
                      <span>{seasonalInfo.seasonName}</span>
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      {seasonalInfo.precipitationCharacteristic}
                    </p>
                  </div>
                  {globalWeatherSummary?.temperature !== undefined && (
                    <div className="text-right shrink-0">
                      <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                        {globalWeatherSummary.temperature}°C
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                        {globalWeatherSummary.weatherDesc || 'Konsensus Global'}
                      </span>
                    </div>
                  )}
                </div>

                {/* 4 Feature Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-amber-500" /> Posisi Khatulistiwa
                    </span>
                    <p className="font-bold text-slate-800 dark:text-slate-100">
                      {Math.round(seasonalInfo.distanceToEquatorKm)} km ke Khatulistiwa (0°00'00")
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Belahan Bumi: <span className="font-semibold text-slate-700 dark:text-slate-300">{seasonalInfo.hemisphere}</span>
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-orange-500" /> Peredaran Astronomis Matahari
                    </span>
                    <p className="font-bold text-slate-800 dark:text-slate-100">
                      {seasonalInfo.solarPositionInfo}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Panjang Siang Hari: <span className="font-semibold text-slate-700 dark:text-slate-300">~{seasonalInfo.dayLengthHours.toFixed(1)} jam</span>
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                      <Wind className="w-3.5 h-3.5 text-cyan-500" /> Sirkulasi Monsun &amp; Angin
                    </span>
                    <p className="font-bold text-slate-800 dark:text-slate-100">
                      {seasonalInfo.monsoonWind}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Kecepatan saat ini: <span className="font-semibold text-slate-700 dark:text-slate-300">{windSpeedKmh} km/jam ({windDirectionDeg}°)</span>
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                      <Thermometer className="w-3.5 h-3.5 text-rose-500" /> Klimatologi Suhu &amp; Hujan
                    </span>
                    <p className="font-bold text-slate-800 dark:text-slate-100">
                      Rentang Suhu: {seasonalInfo.avgTempRange}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Curah Hujan Tipikal: <span className="font-semibold text-slate-700 dark:text-slate-300">{seasonalInfo.typicalRainMmMonth}</span>
                    </p>
                  </div>
                </div>

                {/* Monumen Geodetik Khatulistiwa */}
                <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                      Titik &amp; Monumen Khatulistiwa di Peta
                    </h5>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-2">
                    Lapisan emas pada peta menandai lintang 0° bumi yang melintasi Indonesia (Pontianak, Bonjol, Santan Ulu, Payahe) serta garis balik Cancer (23.44°N) &amp; Capricorn (23.44°S).
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {['Tugu Khatulistiwa Pontianak (0.000°)', 'Bonjol Pasaman Sumbar', 'Santan Ulu Kaltim', 'Mitad del Mundo (Ecuador)', 'Nanyuki (Kenya)'].map((loc) => (
                      <span key={loc} className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                        📍 {loc}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSeasonalModal(false);
                    navigate('/app/geospatial');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                >
                  <Satellite className="w-3.5 h-3.5" />
                  <span>Buka Studio Geospasial Lengkap</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSeasonalModal(false)}
                  className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GPS Location Finder & Realtime Accuracy Tracking Button */}
      <button
        type="button"
        onClick={handleFindUserLocation}
        disabled={isLocatingUser}
        className={`absolute z-20 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl shadow-glass backdrop-blur-xl border transition-all active:scale-95 group shadow-lg ${
          showPanel
            ? 'hidden sm:flex bottom-6 right-6 sm:right-[26rem]'
            : 'bottom-[6.25rem] sm:bottom-28 right-6'
        } ${
          isTrackingLive
            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400/50 shadow-blue-500/30 ring-2 ring-blue-400/40'
            : 'bg-white/95 dark:bg-slate-900/95 border-slate-200/80 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800'
        }`}
        title={isTrackingLive ? "Pelacakan GPS Realtime Aktif (Klik untuk pusatkan kembali)" : "Temukan Lokasi Presisi GPS Realtime"}
        aria-label="Temukan Lokasi Saya"
      >
        {isLocatingUser ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent" />
        ) : (
          <div className="relative flex items-center justify-center">
            {isTrackingLive && (
              <span className="absolute inline-flex h-8 w-8 animate-ping rounded-full bg-blue-400 opacity-40" />
            )}
            <LocateFixed className={`h-5 w-5 sm:h-6 sm:w-6 group-hover:scale-110 transition-transform ${isTrackingLive ? 'text-white' : ''}`} />
          </div>
        )}
      </button>

      {/* Floating Panel Trigger Button (Ketika Tertutup) */}
      <AnimatePresence>
        {!showPanel && (
          <motion.button 
            type="button"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowPanel(true)}
            className="absolute bottom-6 right-6 z-20 flex items-center gap-3 rounded-2xl bg-white/95 dark:bg-slate-900/95 px-4 py-2.5 sm:py-3 shadow-2xl backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/90 transition-all hover:scale-[1.02] active:scale-95 group cursor-pointer shadow-brand-500/10"
            title="Klik untuk membuka Pengaturan Lapisan Peta (Harmony Maps)"
          >
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200/60 dark:border-brand-800/60 text-brand-600 dark:text-brand-400 shadow-xs">
              <Settings className="h-4 w-4 group-hover:rotate-90 transition-transform duration-500" />
              {activeLayersCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-500"></span>
                </span>
              )}
            </div>
            <div className="flex flex-col items-start text-left pr-0.5">
              <div className="flex items-center gap-1.5">
                <span className="font-display font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
                  Harmony Maps
                </span>
                {activeLayersCount > 0 ? (
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-black bg-brand-500 text-white shadow-xs">
                    {activeLayersCount}
                  </span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                {activeLayersCount > 0 ? `${activeLayersCount} layer aktif` : 'Lapisan & Mode Peta'}
              </span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Floating Control Panel & Slide-Over Drawer (Ketika Terbuka) */}
      <AnimatePresence>
        {showPanel && (
          <>
            {/* Mobile Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPanel(false)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 sm:hidden"
            />

            {/* Panel Card */}
            <motion.div
              initial={{ opacity: 0, x: 28, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 28, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="fixed sm:absolute top-auto bottom-0 sm:top-4 sm:bottom-4 right-0 sm:right-4 left-0 sm:left-auto z-50 w-full sm:w-96 max-h-[88vh] sm:max-h-[calc(100vh-2rem)] rounded-t-3xl sm:rounded-3xl bg-white/95 dark:bg-slate-900/95 shadow-2xl backdrop-blur-2xl border-t sm:border border-slate-200/80 dark:border-slate-800 flex flex-col overflow-hidden"
            >
              {/* Mobile Drag Handle Bar */}
              <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

              {/* Fixed Header Section */}
              <div className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800/80 shrink-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400 shadow-sm">
                      <MapIcon className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-display text-base font-bold text-ink-900 dark:text-white leading-tight">
                          Harmony Maps
                        </h2>
                        {activeLayersCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-brand-500 text-white">
                            {activeLayersCount} Aktif
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {schools.length} Sekolah • {mountains.length} Gunung
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Header GPS Locate shortcut */}
                    <button
                      type="button"
                      onClick={handleFindUserLocation}
                      className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors"
                      title="Pusatkan ke Lokasi Saya"
                    >
                      <LocateFixed className="w-4 h-4" />
                    </button>

                    {/* Close Button */}
                    <button
                      type="button"
                      onClick={() => setShowPanel(false)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Tutup Pengaturan"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 2D / 3D Mode Selector */}
                <div className="mt-3 flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => handleToggle3D(false)}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      !is3D 
                        ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <MapIcon className="w-3.5 h-3.5" />
                    <span>2D Datar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleToggle3D(true);
                      handleSetGlobeType('globe');
                    }}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      is3D && globeType === 'globe'
                        ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-sm shadow-sky-500/30' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Globe 3D</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleToggle3D(true);
                      handleSetGlobeType('perspective');
                    }}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      is3D && globeType === 'perspective'
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm shadow-indigo-500/30' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>3D Miring</span>
                  </button>
                </div>

                {/* Categorized Filter Tabs */}
                <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar touch-pan-x scroll-smooth snap-x">
                  {[
                    { id: 'all', label: '🌟 Semua' },
                    { id: 'basemap', label: '🗺️ Mode Peta' },
                    { id: 'disaster', label: '🌋 Bencana' },
                    { id: 'weather', label: '🌤️ Cuaca' },
                    { id: 'places', label: '🏫 Wilayah' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPanelTab(tab.id as any)}
                      className={`snap-start px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                        panelTab === tab.id
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {/* 1. Mode & Lapisan Peta Geospasial (>2020 Data) */}
                {(panelTab === 'all' || panelTab === 'basemap') && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Mode &amp; Lapisan Peta
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowMetadataModal(true)}
                        className="text-[10px] text-indigo-500 hover:underline font-bold flex items-center gap-0.5"
                      >
                        <Info className="w-3 h-3" /> Info Data
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(BASEMAP_METADATA) as MapBasemapType[]).map((type) => {
                        const meta = BASEMAP_METADATA[type];
                        const isSelected = activeMapBasemap === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setActiveMapBasemap(type)}
                            className={`flex flex-col items-start p-2 rounded-xl border text-left transition-all ${
                              isSelected
                                ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold shadow-sm'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-transparent text-slate-700 dark:text-slate-300 font-medium'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 w-full">
                              <span>
                                {type === 'osm' && '🗺️'}
                                {type === 'satellite' && '🛰️'}
                                {type === 'elevation' && '⛰️'}
                                {type === 'thermal' && '🌡️'}
                                {type === 'traffic' && '🛣️'}
                                {type === 'dark' && '🌌'}
                              </span>
                              <span className="text-xs font-semibold truncate">{meta.name}</span>
                            </div>
                            <span className="text-[9px] font-mono opacity-75 mt-0.5">{meta.badge}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Traffic Flow Overlay Switch */}
                    <div className="mt-3 flex items-center justify-between p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50">
                      <label className="flex items-center gap-2 select-none text-xs text-ink-700 dark:text-slate-300 font-semibold cursor-pointer">
                        <Car className="h-4 w-4 text-purple-500" />
                        <span>Lintasan Jalan & Koridor Trafik</span>
                      </label>
                      <Toggle 
                        checked={showTrafficCorridors || activeMapBasemap === 'traffic'} 
                        onChange={(val) => setShowTrafficCorridors(val)} 
                        activeClass="bg-purple-600" 
                      />
                    </div>

                    {/* Observation Coverage & Data Gap Switch */}
                    <div className="mt-2.5 flex items-center justify-between p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50">
                      <label className="flex items-center gap-2 select-none text-xs text-ink-700 dark:text-slate-300 font-semibold cursor-pointer">
                        <Radio className="h-4 w-4 text-emerald-500" />
                        <span>Cakupan Sensor &amp; Blank Spot Observasi</span>
                      </label>
                      <Toggle 
                        checked={showObservationCoverage} 
                        onChange={(val) => setShowObservationCoverage(val)} 
                        activeClass="bg-emerald-600" 
                      />
                    </div>
                  </div>
                )}

                {/* 2. Geologi & Bencana Alam */}
                {(panelTab === 'all' || panelTab === 'disaster') && (
                  <>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Geologi & Tektonik</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 select-none text-sm text-ink-700 dark:text-slate-300">
                            <Activity className="h-4 w-4 text-orange-500" /> Lempeng Tektonik
                          </label>
                          <Toggle checked={showTectonic} onChange={setShowTectonic} activeClass="bg-orange-500" />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 select-none text-sm text-ink-700 dark:text-slate-300">
                            <Activity className="h-4 w-4 text-red-500" /> Gempa Bumi Realtime
                          </label>
                          <Toggle checked={showEarthquakes} onChange={setShowEarthquakes} activeClass="bg-red-500" />
                        </div>
                        <div className="space-y-2.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-1.5 select-none text-sm font-semibold text-ink-800 dark:text-slate-200">
                              <Radio className="h-4 w-4 text-sky-500 animate-pulse" /> Earth Sensor Registry
                              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-full ml-1">
                                {sensorRegistryStats.total} Stasiun
                              </span>
                            </label>
                            <Toggle checked={showTsunamiSensors} onChange={setShowTsunamiSensors} activeClass="bg-sky-500" />
                          </div>

                          {showTsunamiSensors && (
                            <div className="pl-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Filter Keluarga Sensor:</span>
                                <button
                                  type="button"
                                  onClick={() => setShowMasterTaxonomyModal(true)}
                                  className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                                >
                                  <BookOpen className="h-3 w-3" /> Katalog Master
                                </button>
                              </div>

                              <div className="flex flex-wrap gap-1">
                                <button
                                  type="button"
                                  onClick={() => setSensorFamilyFilter('ALL')}
                                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
                                    sensorFamilyFilter === 'ALL'
                                      ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  Semua ({sensorRegistryStats.total})
                                </button>
                                {Object.entries(SENSOR_FAMILY_META).map(([famKey, meta]) => {
                                  const count = sensorRegistryStats.countByFamily[famKey as SensorFamily] || 0;
                                  if (count === 0) return null;
                                  const isSelected = sensorFamilyFilter === famKey;
                                  return (
                                    <button
                                      key={famKey}
                                      type="button"
                                      onClick={() => setSensorFamilyFilter(famKey as SensorFamily)}
                                      className={`text-[10px] font-medium px-2 py-0.5 rounded-lg border flex items-center gap-1 transition-all ${
                                        isSelected
                                          ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-950 font-bold shadow-sm'
                                          : 'bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                                      }`}
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.colorHex }} />
                                      {meta.code}. {meta.name.split(' ')[0]} ({count})
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                        <span>Profil Gunung Api & Bencana</span>
                        <span className="text-[10px] text-red-500 font-semibold flex items-center gap-1">
                          <Flame className="w-3 h-3" /> PVMBG Magma
                        </span>
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 select-none text-sm text-ink-700 dark:text-slate-300">
                            <Mountain className="h-4 w-4 text-red-500" /> Gunung Api Aktif
                          </label>
                          <Toggle checked={showActive} onChange={setShowActive} activeClass="bg-red-500" />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 select-none text-sm text-ink-700 dark:text-slate-300">
                            <Mountain className="h-4 w-4 text-orange-500" /> Gunung Api Waspada
                          </label>
                          <Toggle checked={showInactive} onChange={setShowInactive} activeClass="bg-orange-500" />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 select-none text-sm text-ink-700 dark:text-slate-300">
                            <Mountain className="h-4 w-4 text-slate-400" /> Puncak Gunung
                          </label>
                          <Toggle checked={showPeaks} onChange={setShowPeaks} activeClass="bg-slate-400" />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* 3. Lapisan Cuaca Realtime */}
                {(panelTab === 'all' || panelTab === 'weather') && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Lapisan Cuaca Realtime
                      </h3>
                      {weatherMapOverlay !== 'none' && (
                        <button
                          onClick={() => setWeatherMapOverlay('none')}
                          className="text-[10px] text-blue-500 hover:underline font-semibold"
                        >
                          Reset Cuaca
                        </button>
                      )}
                    </div>

                    {/* Windy Status & Launcher Card */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-blue-600/10 via-sky-600/10 to-indigo-600/10 border border-sky-500/30 dark:border-sky-400/20 mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-sky-500 text-white shadow-sm">
                          <Wind className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                            Peta Cuaca Windy
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              Live
                            </span>
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            {weatherMapOverlay !== 'none' ? `Aktif: ${weatherMapOverlay.toUpperCase()} (Sinkron 60 FPS di Peta)` : 'Pilih parameter di bawah'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (weatherMapOverlay === 'none') {
                            handleSelectWeatherOverlay('rain');
                          }
                          setShowWindyModal(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-bold transition-all shadow-sm flex items-center gap-1"
                        title="Buka Peta Cuaca Windy Layar Penuh"
                      >
                        <ExternalLink className="w-3 h-3" /> Layar Penuh
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => handleSelectWeatherOverlay('rain')} 
                        className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-all text-xs font-medium ${weatherMapOverlay === 'rain' ? 'bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400 font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-transparent text-slate-700 dark:text-slate-300'}`}
                      >
                        <CloudRain className="h-4 w-4 text-blue-500" /> Hujan &amp; Petir
                      </button>
                      <button 
                        onClick={() => handleSelectWeatherOverlay('temp')} 
                        className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-all text-xs font-medium ${weatherMapOverlay === 'temp' ? 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400 font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-transparent text-slate-700 dark:text-slate-300'}`}
                      >
                        <Thermometer className="h-4 w-4 text-rose-500" /> Suhu
                      </button>
                      <button 
                        onClick={() => handleSelectWeatherOverlay('wind')} 
                        className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-all text-xs font-medium ${weatherMapOverlay === 'wind' ? 'bg-teal-500/15 border-teal-500/40 text-teal-600 dark:text-teal-400 font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-transparent text-slate-700 dark:text-slate-300'}`}
                      >
                        <Wind className="h-4 w-4 text-teal-500" /> Angin
                      </button>
                      <button 
                        onClick={() => handleSelectWeatherOverlay('clouds')} 
                        className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-all text-xs font-medium ${weatherMapOverlay === 'clouds' ? 'bg-slate-500/15 border-slate-500/40 text-slate-700 dark:text-slate-200 font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-transparent text-slate-700 dark:text-slate-300'}`}
                      >
                        <Cloud className="h-4 w-4 text-slate-400" /> Awan
                      </button>
                      <button 
                        onClick={() => handleSelectWeatherOverlay('pm2p5')} 
                        className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-all text-xs font-medium ${weatherMapOverlay === 'pm2p5' ? 'bg-purple-500/15 border-purple-500/40 text-purple-600 dark:text-purple-400 font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-transparent text-slate-700 dark:text-slate-300'}`}
                      >
                        <Activity className="h-4 w-4 text-purple-500" /> Kualitas Udara
                      </button>
                      <button 
                        onClick={() => handleSelectWeatherOverlay('ozone')} 
                        className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-all text-xs font-medium ${weatherMapOverlay === 'ozone' ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-transparent text-slate-700 dark:text-slate-300'}`}
                      >
                        <Globe className="h-4 w-4 text-indigo-500" /> Lapisan Ozon
                      </button>
                      <button 
                        onClick={() => handleSelectWeatherOverlay('waves')} 
                        className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-all text-xs font-medium ${weatherMapOverlay === 'waves' ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-600 dark:text-cyan-400 font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-transparent text-slate-700 dark:text-slate-300'}`}
                      >
                        <Waves className="h-4 w-4 text-cyan-500" /> Gelombang Laut
                      </button>
                      <button 
                        onClick={() => handleSelectWeatherOverlay('pressure')} 
                        className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-all text-xs font-medium ${weatherMapOverlay === 'pressure' ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-transparent text-slate-700 dark:text-slate-300'}`}
                      >
                        <Gauge className="h-4 w-4 text-amber-500" /> Tekanan Udara
                      </button>
                      <button 
                        onClick={() => handleSelectWeatherOverlay('radar')} 
                        className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-all text-xs font-medium ${weatherMapOverlay === 'radar' ? 'bg-sky-500/15 border-sky-500/40 text-sky-600 dark:text-sky-400 font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-transparent text-slate-700 dark:text-slate-300'}`}
                      >
                        <Radio className="h-4 w-4 text-sky-500" /> Radar Cuaca
                      </button>
                      <button 
                        onClick={() => handleSelectWeatherOverlay('satellite')} 
                        className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-all text-xs font-medium ${weatherMapOverlay === 'satellite' ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-transparent text-slate-700 dark:text-slate-300'}`}
                      >
                        <Satellite className="h-4 w-4 text-indigo-500" /> Satelit Cuaca
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. Batas Wilayah & Tata Ruang + Sekolah */}
                {(panelTab === 'all' || panelTab === 'places') && (
                  <>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Batas Wilayah & Tata Ruang</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 select-none text-sm text-ink-700 dark:text-slate-300" title="Garis Lintang 0° Khatulistiwa & Batas Garis Balik Tropis (±23.44°)">
                            <Compass className="h-4 w-4 text-amber-500" /> Garis Khatulistiwa & Iklim
                          </label>
                          <Toggle 
                            checked={showEquatorZones} 
                            onChange={(val) => {
                              setShowEquatorZones(val);
                              try { window.localStorage.setItem('hm_equator_zones', String(val)); } catch (e) {}
                              if (equatorLayerRef.current) {
                                equatorLayerRef.current.setVisible(val);
                              }
                            }} 
                            activeClass="bg-amber-500" 
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 select-none text-sm text-ink-700 dark:text-slate-300" title="Terlihat saat zoom-in (Level 10+)">
                            <TreePine className="h-4 w-4 text-green-500" /> Hutan & Cagar Alam
                          </label>
                          <Toggle checked={showForests} onChange={setShowForests} activeClass="bg-green-500" />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 select-none text-sm text-ink-700 dark:text-slate-300">
                            <MapIcon2 className="h-4 w-4 text-indigo-500" /> Kota
                          </label>
                          <Toggle checked={showKota} onChange={setShowKota} activeClass="bg-indigo-500" />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 select-none text-sm text-ink-700 dark:text-slate-300">
                            <MapIcon2 className="h-4 w-4 text-orange-500" /> Kabupaten
                          </label>
                          <Toggle checked={showKabupaten} onChange={setShowKabupaten} activeClass="bg-orange-500" />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 select-none text-sm text-ink-700 dark:text-slate-300" title="Terlihat saat zoom-in (Level 11+)">
                            <MapPin className="h-4 w-4 text-amber-500" /> Desa
                          </label>
                          <Toggle checked={showDesa} onChange={setShowDesa} activeClass="bg-amber-500" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Data Pendidikan & Sekolah</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 select-none text-sm text-ink-700 dark:text-slate-300">
                            <Building2 className="h-4 w-4 text-cyan-500" /> SD / MI
                          </label>
                          <Toggle checked={showSD} onChange={setShowSD} activeClass="bg-cyan-500" />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 select-none text-sm text-ink-700 dark:text-slate-300">
                            <Building2 className="h-4 w-4 text-blue-500" /> SMP / MTs
                          </label>
                          <Toggle checked={showSMP} onChange={setShowSMP} activeClass="bg-blue-500" />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 select-none text-sm text-ink-700 dark:text-slate-300">
                            <Building2 className="h-4 w-4 text-indigo-900 dark:text-indigo-400" /> SMA / SMK
                          </label>
                          <Toggle checked={showSMA} onChange={setShowSMA} activeClass="bg-indigo-900 dark:bg-indigo-500" />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Fixed Footer Section */}
              <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800/80 shrink-0 bg-slate-50/80 dark:bg-slate-900/80 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetLayerSettings}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shrink-0 cursor-pointer"
                  title="Nonaktifkan semua layer kembali ke default"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Reset</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPanel(false)}
                  className="flex-1 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-sm active:scale-[0.99] cursor-pointer text-center"
                >
                  Tutup Pengaturan
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
        </>
      )}


      {/* Popup Overlay Container */}
      <div style={{ display: 'none' }}>
        {/* Kept completely empty so React doesn't crash when innerHTML replaces its contents */}
        <div
          ref={popupRef}
          className="bg-white rounded-lg shadow-xl pointer-events-auto"
          style={{
            display: 'none',
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            padding: '4px'
          }}
        />
      </div>

      {/* Geospatial Earth Intelligence Studio Modal (Cloud Button) */}
      <GeospatialWeatherModal
        isOpen={showGeospatialModal}
        onClose={() => setShowGeospatialModal(false)}
        lat={userCoords?.lat ?? -7.2575}
        lng={userCoords?.lng ?? 112.7521}
        locationName={userPreciseLocation?.shortDisplay || (userCoords ? 'Lokasi Pengguna Terverifikasi' : 'Surabaya (Pusat Geospasial)')}
        userPreciseLocation={userPreciseLocation}
        mountains={mountains}
        earthquakes={earthquakes}
        schools={schools}
      />

      {/* AI Route & Weather Copilot Modal (Find Button) */}
      <RouteNavigatorModal
        isOpen={showRouteModal}
        onClose={() => setShowRouteModal(false)}
        userCoords={userCoords}
        onApplyRoute={(route) => setActiveRoute(route)}
        onClearRoute={() => setActiveRoute(null)}
        activeRoute={activeRoute}
        schools={schools}
      />

      {/* Earth Sensor Detailed Inspector Modal */}
      <SensorInspectorModal
        sensor={selectedSensorForInspection}
        onClose={() => setSelectedSensorForInspection(null)}
        onCenterMap={(lng, lat) => {
          if (mapRef.current) {
            mapRef.current.getView().animate({
              center: fromLonLat([lng, lat]),
              zoom: 8.5,
              duration: 700,
            });
          }
        }}
      />

      {/* Earth Sensor Master Taxonomy Modal */}
      <MasterSensorTaxonomyModal
        isOpen={showMasterTaxonomyModal}
        onClose={() => setShowMasterTaxonomyModal(false)}
      />

      {/* Full Transparency Data Provenance Modal */}
      <DataSourceProvenanceModal
        isOpen={showDataProvenanceModal}
        onClose={() => setShowDataProvenanceModal(false)}
      />

      {/* Fullscreen Weather Mode */}
      {showWindyModal && (
        <div className="absolute inset-0 z-[9999] flex flex-col md:flex-row bg-slate-900 animate-in fade-in duration-300 overflow-hidden overscroll-none">
          {/* Iframe takes up remaining space */}
          <div 
            className="flex-1 w-full h-full relative order-1 md:order-none min-h-[50vh]"
            style={{ WebkitOverflowScrolling: 'touch', overflow: 'hidden' }}
          >

            <iframe 
              key={`windy-modal-${windyOverlay}`}
              width="100%" 
              height="100%" 
              src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=%C2%B0C&metricWind=km/h&zoom=${windyCoords.zoom}&overlay=${windyOverlay}&product=ecmwf&level=surface&lat=${windyCoords.lat}&lon=${windyCoords.lng}`} 
              frameBorder="0"
              title="Windy Weather Map"
              className="w-full h-full block"
              style={{ pointerEvents: 'auto', touchAction: 'none', border: 'none' }}
              allow="fullscreen; geolocation"
            ></iframe>
          </div>

          {/* Responsive Panel: Bottom on Mobile, Right Sidebar on Desktop */}
          <div className="w-full md:w-72 h-auto max-h-[45vh] md:max-h-full md:h-full bg-white dark:bg-slate-900 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-10 order-2 md:order-none shrink-0">
            <div className="p-3 md:p-5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between md:block">
              <div>
                <h2 className="text-sm md:text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <CloudRain className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
                  Mode Cuaca Windy
                </h2>
                <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1 hidden md:block">Pilih parameter atmosfer realtime ECMWF</p>
              </div>
              
              {/* Mobile Close Button (Top right of the bottom drawer) */}
              <button 
                onClick={() => setShowWindyModal(false)}
                className="md:hidden p-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 md:p-4 grid grid-cols-2 md:grid-cols-1 gap-2 md:gap-3 content-start">
              <button onClick={() => setWindyOverlay('rain')} className={`w-full flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl border transition-colors ${windyOverlay === 'rain' ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800'}`}>
                <CloudRain className={`h-4 w-4 md:h-5 md:w-5 ${windyOverlay === 'rain' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                <span className={`text-xs md:text-sm font-medium ${windyOverlay === 'rain' ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400'}`}>Hujan & Petir</span>
              </button>

              <button onClick={() => setWindyOverlay('temp')} className={`w-full flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl border transition-colors ${windyOverlay === 'temp' ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800' : 'bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800'}`}>
                <Thermometer className={`h-4 w-4 md:h-5 md:w-5 ${windyOverlay === 'temp' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`} />
                <span className={`text-xs md:text-sm font-medium ${windyOverlay === 'temp' ? 'text-rose-700 dark:text-rose-300' : 'text-slate-600 dark:text-slate-400'}`}>Suhu</span>
              </button>

              <button onClick={() => setWindyOverlay('wind')} className={`w-full flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl border transition-colors ${windyOverlay === 'wind' ? 'bg-teal-50 border-teal-200 dark:bg-teal-900/20 dark:border-teal-800' : 'bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800'}`}>
                <Wind className={`h-4 w-4 md:h-5 md:w-5 ${windyOverlay === 'wind' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} />
                <span className={`text-xs md:text-sm font-medium ${windyOverlay === 'wind' ? 'text-teal-700 dark:text-teal-300' : 'text-slate-600 dark:text-slate-400'}`}>Angin</span>
              </button>

              <button onClick={() => setWindyOverlay('clouds')} className={`w-full flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl border transition-colors ${windyOverlay === 'clouds' ? 'bg-slate-100 border-slate-300 dark:bg-slate-700/50 dark:border-slate-600' : 'bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800'}`}>
                <Cloud className={`h-4 w-4 md:h-5 md:w-5 ${windyOverlay === 'clouds' ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400'}`} />
                <span className={`text-xs md:text-sm font-medium ${windyOverlay === 'clouds' ? 'text-slate-700 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>Awan</span>
              </button>

              <button onClick={() => setWindyOverlay('pm2p5')} className={`w-full flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl border transition-colors ${windyOverlay === 'pm2p5' ? 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800' : 'bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800'}`}>
                <Activity className={`h-4 w-4 md:h-5 md:w-5 ${windyOverlay === 'pm2p5' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`} />
                <span className={`text-xs md:text-sm font-medium ${windyOverlay === 'pm2p5' ? 'text-purple-700 dark:text-purple-300' : 'text-slate-600 dark:text-slate-400'}`}>Polusi Udara</span>
              </button>

              <button onClick={() => setWindyOverlay('ozone')} className={`w-full flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl border transition-colors ${windyOverlay === 'ozone' ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800'}`}>
                <Globe className={`h-4 w-4 md:h-5 md:w-5 ${windyOverlay === 'ozone' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                <span className={`text-xs md:text-sm font-medium ${windyOverlay === 'ozone' ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}>Ozon</span>
              </button>

              <button onClick={() => setWindyOverlay('waves')} className={`w-full flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl border transition-colors ${windyOverlay === 'waves' ? 'bg-cyan-50 border-cyan-200 dark:bg-cyan-900/20 dark:border-cyan-800' : 'bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800'}`}>
                <Waves className={`h-4 w-4 md:h-5 md:w-5 ${windyOverlay === 'waves' ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400'}`} />
                <span className={`text-xs md:text-sm font-medium ${windyOverlay === 'waves' ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-600 dark:text-slate-400'}`}>Gelombang Laut</span>
              </button>

              <button onClick={() => setWindyOverlay('pressure')} className={`w-full flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl border transition-colors ${windyOverlay === 'pressure' ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' : 'bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800'}`}>
                <Gauge className={`h-4 w-4 md:h-5 md:w-5 ${windyOverlay === 'pressure' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
                <span className={`text-xs md:text-sm font-medium ${windyOverlay === 'pressure' ? 'text-amber-700 dark:text-amber-300' : 'text-slate-600 dark:text-slate-400'}`}>Tekanan Udara</span>
              </button>

              <button onClick={() => setWindyOverlay('radar')} className={`w-full flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl border transition-colors ${windyOverlay === 'radar' ? 'bg-sky-50 border-sky-200 dark:bg-sky-900/20 dark:border-sky-800' : 'bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800'}`}>
                <Radio className={`h-4 w-4 md:h-5 md:w-5 ${windyOverlay === 'radar' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}`} />
                <span className={`text-xs md:text-sm font-medium ${windyOverlay === 'radar' ? 'text-sky-700 dark:text-sky-300' : 'text-slate-600 dark:text-slate-400'}`}>Radar Cuaca</span>
              </button>

              <button onClick={() => setWindyOverlay('satellite')} className={`w-full flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl border transition-colors ${windyOverlay === 'satellite' ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800'}`}>
                <Satellite className={`h-4 w-4 md:h-5 md:w-5 ${windyOverlay === 'satellite' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                <span className={`text-xs md:text-sm font-medium ${windyOverlay === 'satellite' ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}>Satelit Cuaca</span>
              </button>
            </div>
            
            <div className="hidden md:block p-4 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={() => setShowWindyModal(false)}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-colors font-bold text-sm shadow-lg"
              >
                <MapIcon className="h-4 w-4" />
                Kembali ke Street Map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MapsView;
