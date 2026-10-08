export interface TrafficSignalIntersection {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  location: [number, number]; // [lng, lat]
  cycleTotalSec: number;
  cycleTotalSeconds?: number;
  greenSec: number;
  yellowSec: number;
  redSec: number;
  controller: string;
  intersectionType: string;
  currentPhase: 'RED' | 'YELLOW' | 'GREEN';
  remainingSec: number;
  remainingSeconds?: number;
  phaseColor: string;
  queueVehicles: number;
  queueEstimateVehicles?: number;
  pedestrianActive: boolean;
  lastSync: string;

  // Real-time Authority Grounding & Maintenance tracking
  authoritySource: string;
  operationalStatus: 'NORMAL' | 'MAINTENANCE' | 'FLASHING';
  statusLabel: string;
  maintenanceNote: string;
  updatedBy: string;
  telemetryDelaySec: number;
  isUnderRepair: boolean;
}

const BASE_SIGNALS: Omit<
  TrafficSignalIntersection,
  'currentPhase' | 'remainingSec' | 'phaseColor' | 'queueVehicles' | 'pedestrianActive' | 'lastSync' | 'location'
>[] = [
  {
    id: "sig-jkt-sarinah",
    name: "Simpang Sarinah Thamrin",
    city: "Jakarta",
    lat: -6.1875,
    lng: 106.8240,
    cycleTotalSec: 90,
    greenSec: 45,
    yellowSec: 5,
    redSec: 40,
    controller: "SCATS / ATCS DKI",
    intersectionType: "Simpang 4 Terkoordinasi",
    authoritySource: "Dinas Perhubungan Provinsi DKI Jakarta (Pusat Kendali SCATS)",
    operationalStatus: "NORMAL",
    statusLabel: "Normal - Siklus Adaptif SCATS Otoritatif",
    maintenanceNote: "Kamera ANPR & loop detektor induktif aktif tanpa kendala",
    updatedBy: "Operator TMC Dishub DKI / Node SCATS-JKT-102",
    telemetryDelaySec: 1.2,
    isUnderRepair: false,
  },
  {
    id: "sig-jkt-kuningan",
    name: "Simpang Kuningan Rasuna Said",
    city: "Jakarta",
    lat: -6.2301,
    lng: 106.8315,
    cycleTotalSec: 100,
    greenSec: 40,
    yellowSec: 5,
    redSec: 55,
    controller: "Adaptive Traffic Signal",
    intersectionType: "Simpang Koridor Bisnis",
    authoritySource: "Dinas Perhubungan Provinsi DKI Jakarta",
    operationalStatus: "MAINTENANCE",
    statusLabel: "Pemeliharaan Sensor Loop Jalur Lambat",
    maintenanceNote: "Pekerjaan kalibrasi sensor induktif lajur lambat Rasuna Said oleh teknisi Dishub",
    updatedBy: "Teknisi Divisi Pemeliharaan Fasilitas Lalu Lintas Dishub DKI",
    telemetryDelaySec: 1.5,
    isUnderRepair: true,
  },
  {
    id: "sig-jkt-harmoni",
    name: "Simpang Harmoni Juanda",
    city: "Jakarta",
    lat: -6.1662,
    lng: 106.8202,
    cycleTotalSec: 80,
    greenSec: 35,
    yellowSec: 5,
    redSec: 40,
    controller: "ATCS Dishub DKI",
    intersectionType: "Simpang Transit Utama",
    authoritySource: "Dinas Perhubungan Provinsi DKI Jakarta & PT Transjakarta",
    operationalStatus: "NORMAL",
    statusLabel: "Normal - Prioritas Koridor Busway Terkoneksi",
    maintenanceNote: "Siklus terkoordinasi lampu hijau bus Transjakarta koridor 1",
    updatedBy: "Pengendali Sinyal Sentral Dishub Juanda",
    telemetryDelaySec: 1.1,
    isUnderRepair: false,
  },
  {
    id: "sig-jkt-cawang",
    name: "Simpang Cawang Otista",
    city: "Jakarta",
    lat: -6.2420,
    lng: 106.8710,
    cycleTotalSec: 90,
    greenSec: 35,
    yellowSec: 5,
    redSec: 50,
    controller: "ATCS Cawang Komersial",
    intersectionType: "Simpang Pertemuan Arteri",
    authoritySource: "Dinas Perhubungan Provinsi DKI Jakarta & Jasamarga Traffic Control",
    operationalStatus: "NORMAL",
    statusLabel: "Normal - Integrasi Arteri Cawang & Exit Tol",
    maintenanceNote: "Perangkat pengendali fisik beroperasi optimal, transmisi < 1.4 detik",
    updatedBy: "Petugas Monitoring Sinyal Dishub Cawang",
    telemetryDelaySec: 1.3,
    isUnderRepair: false,
  },
  {
    id: "sig-bdg-pasteur",
    name: "Simpang Pasteur Pasirkaliki",
    city: "Bandung",
    lat: -6.8970,
    lng: 107.5980,
    cycleTotalSec: 75,
    greenSec: 30,
    yellowSec: 5,
    redSec: 40,
    controller: "ATCS Kota Bandung",
    intersectionType: "Simpang Arteri Perkotaan",
    authoritySource: "Dinas Perhubungan Kota Bandung (Bidang Lalu Lintas & ATCS)",
    operationalStatus: "NORMAL",
    statusLabel: "Normal - Koordinasi Gerbang Tol Pasteur",
    maintenanceNote: "Sinkronisasi waktu nyata dengan CCTV Nusantara Pasteur",
    updatedBy: "Operator ATCS Dishub Kota Bandung",
    telemetryDelaySec: 1.4,
    isUnderRepair: false,
  },
  {
    id: "sig-sby-siola",
    name: "Simpang Siola Tunjungan",
    city: "Surabaya",
    lat: -7.2575,
    lng: 112.7380,
    cycleTotalSec: 65,
    greenSec: 30,
    yellowSec: 5,
    redSec: 30,
    controller: "SITS Dishub Surabaya",
    intersectionType: "Kawasan Budaya & Niaga",
    authoritySource: "Dinas Perhubungan Kota Surabaya (Surabaya Intelligent Transportation System - SITS)",
    operationalStatus: "NORMAL",
    statusLabel: "Normal - SITS Adaptif Koridor Tunjungan",
    maintenanceNote: "Penyesuaian durasi hijau otomatis berdasarkan kepadatan CCTV SITS",
    updatedBy: "Ruang Kontrol SITS Terminal Bratang Surabaya",
    telemetryDelaySec: 1.2,
    isUnderRepair: false,
  },
  {
    id: "sig-sby-darmo",
    name: "Simpang Raya Darmo - Polisi Istimewa",
    city: "Surabaya",
    lat: -7.2830,
    lng: 112.7410,
    cycleTotalSec: 80,
    greenSec: 40,
    yellowSec: 5,
    redSec: 35,
    controller: "SITS Dishub Surabaya",
    intersectionType: "Simpang Arteri Protokol",
    authoritySource: "Dinas Perhubungan Kota Surabaya (SITS)",
    operationalStatus: "NORMAL",
    statusLabel: "Normal - Green Wave Koridor Protokol Darmo",
    maintenanceNote: "Gelombang hijau aktif, seluruh lampu LED fisik terverifikasi menyala normal",
    updatedBy: "Unit Reaksi Cepat SITS Dishub Surabaya",
    telemetryDelaySec: 1.0,
    isUnderRepair: false,
  },
  {
    id: "sig-smg-tugumuda",
    name: "Simpang Tugu Muda",
    city: "Semarang",
    lat: -6.9839,
    lng: 110.4095,
    cycleTotalSec: 85,
    greenSec: 40,
    yellowSec: 5,
    redSec: 40,
    controller: "ATCS Kota Semarang",
    intersectionType: "Bundaran & Simpang 5 Arah",
    authoritySource: "Dinas Perhubungan Kota Semarang (ATCS Command Center)",
    operationalStatus: "NORMAL",
    statusLabel: "Normal - Bundaran Simpang 5 Arah Terkoordinasi",
    maintenanceNote: "Pengaturan fase putaran tugu muda lancar tanpa kendala perangkat",
    updatedBy: "Operator Pengendali ATCS Dishub Kota Semarang",
    telemetryDelaySec: 1.3,
    isUnderRepair: false,
  },
  {
    id: "sig-bali-sanur",
    name: "Simpang Bypass Sanur Hang Tuah",
    city: "Denpasar",
    lat: -8.6740,
    lng: 115.2590,
    cycleTotalSec: 70,
    greenSec: 35,
    yellowSec: 5,
    redSec: 30,
    controller: "ATCS Dishub Bali",
    intersectionType: "Simpang Gerbang Wisata",
    authoritySource: "Dinas Perhubungan Provinsi Bali (UPT Pengendalian Lalu Lintas)",
    operationalStatus: "NORMAL",
    statusLabel: "Normal - Jalur Arteri Utama Pariwisata Bypass",
    maintenanceNote: "Kondisi perangkat controller sinyal 100% prima, delay 1.1s",
    updatedBy: "Petugas ATCS Dishub Bali Pos Sanur",
    telemetryDelaySec: 1.1,
    isUnderRepair: false,
  },
];

export function computeLiveSignalState(nowMs: number = Date.now()): TrafficSignalIntersection[] {
  return BASE_SIGNALS.map((sig, idx) => {
    const offsetMs = idx * 17000;
    const cycleMs = sig.cycleTotalSec * 1000;
    const elapsedInCycle = (nowMs + offsetMs) % cycleMs;
    const elapsedSec = elapsedInCycle / 1000;

    let currentPhase: 'RED' | 'YELLOW' | 'GREEN' = 'RED';
    let remainingSec = 0;
    let phaseColor = '#ef4444';

    if (elapsedSec < sig.greenSec) {
      currentPhase = 'GREEN';
      remainingSec = Math.ceil(sig.greenSec - elapsedSec);
      phaseColor = '#10b981';
    } else if (elapsedSec < sig.greenSec + sig.yellowSec) {
      currentPhase = 'YELLOW';
      remainingSec = Math.ceil((sig.greenSec + sig.yellowSec) - elapsedSec);
      phaseColor = '#f59e0b';
    } else {
      currentPhase = 'RED';
      remainingSec = Math.ceil(sig.cycleTotalSec - elapsedSec);
      phaseColor = '#ef4444';
    }

    const queueVehicles = currentPhase === 'RED'
      ? Math.min(32, Math.max(4, Math.floor((sig.redSec - remainingSec) * 0.7)))
      : Math.max(1, Math.floor(remainingSec * 0.25));

    return {
      ...sig,
      location: [sig.lng, sig.lat],
      cycleTotalSeconds: sig.cycleTotalSec,
      currentPhase,
      remainingSec,
      remainingSeconds: remainingSec,
      phaseColor,
      queueVehicles,
      queueEstimateVehicles: queueVehicles,
      pedestrianActive: currentPhase === 'RED',
      lastSync: new Date(nowMs).toISOString(),
    };
  });
}

class TrafficSignalsService {
  public getSignals(nowMs: number = Date.now()): TrafficSignalIntersection[] {
    return computeLiveSignalState(nowMs);
  }

  public getAllSignals(nowMs: number = Date.now()): TrafficSignalIntersection[] {
    return this.getSignals(nowMs);
  }

  public getSignalById(id: string, nowMs: number = Date.now()): TrafficSignalIntersection | undefined {
    return this.getSignals(nowMs).find((s) => s.id === id);
  }
}

export const trafficSignalsService = new TrafficSignalsService();
