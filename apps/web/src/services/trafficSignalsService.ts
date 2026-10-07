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
}

const BASE_SIGNALS: Omit<TrafficSignalIntersection, 'currentPhase' | 'remainingSec' | 'phaseColor' | 'queueVehicles' | 'pedestrianActive' | 'lastSync' | 'location'>[] = [
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
