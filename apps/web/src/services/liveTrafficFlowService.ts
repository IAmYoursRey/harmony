export interface LiveTrafficNetworkStatus {
  monitoredCorridors: number;
  totalRoadLengthKm: number;
  nationalFlowIndex: number; // 0 - 100%
  averageSpeedKmh: number;
  activeSimulatedVehicles: number;
  onlineCctvCount: number;
  onlineSignalsCount: number;
  severeBottlenecks: {
    corridorId: string;
    segment: string;
    name?: string;
    location?: string;
    delayMin: number;
    delayMinutes?: number;
    speedKmh: number;
    currentSpeedKmh: number;
    status: 'Lancar' | 'Ramai Lancar' | 'Padat Merayap' | 'Macet Total';
  }[];
  dataStatus: 'LIVE' | 'SIMULATED' | 'OFFLINE';
  refreshedAt: string;
}

export type LiveTrafficNetworkSummary = LiveTrafficNetworkStatus;

export interface TomTomFlowSegment {
  currentSpeedKmh: number;
  freeFlowSpeedKmh: number;
  currentTravelTimeSec: number;
  freeFlowTravelTimeSec: number;
  confidence: number;
  roadClosure: boolean;
  coordinates: [number, number][];
}

type TrafficUpdateListener = (status: LiveTrafficNetworkStatus) => void;

class LiveTrafficFlowService {
  private listeners: Set<TrafficUpdateListener> = new Set();
  private pollIntervalMs = 15000; // 15s realtime refresh loop
  private timer: any = null;
  private currentStatus: LiveTrafficNetworkStatus = {
    monitoredCorridors: 35,
    totalRoadLengthKm: 2840.5,
    nationalFlowIndex: 78,
    averageSpeedKmh: 62.4,
    activeSimulatedVehicles: 220,
    onlineCctvCount: 16,
    onlineSignalsCount: 9,
    severeBottlenecks: [
      { corridorId: "tol_dalkot_jakarta", segment: "Slipi - Semanggi", name: "Slipi - Semanggi", location: "Tol Dalkot Jakarta", delayMin: 18, delayMinutes: 18, speedKmh: 24, currentSpeedKmh: 24, status: "Padat Merayap" },
      { corridorId: "arteri_pasteur_bandung", segment: "Gerbang Tol - Pasirkaliki", name: "Gerbang Tol - Pasirkaliki", location: "Arteri Pasteur Bandung", delayMin: 14, delayMinutes: 14, speedKmh: 18, currentSpeedKmh: 18, status: "Padat Merayap" },
      { corridorId: "arteri_wonokromo_surabaya", segment: "Joyoboyo - Diponegoro", name: "Joyoboyo - Diponegoro", location: "Arteri Wonokromo Surabaya", delayMin: 11, delayMinutes: 11, speedKmh: 22, currentSpeedKmh: 22, status: "Padat Merayap" },
    ],
    dataStatus: 'LIVE',
    refreshedAt: new Date().toISOString(),
  };

  constructor() {
    this.startPolling();
  }

  public subscribe(listener: TrafficUpdateListener): () => void {
    this.listeners.add(listener);
    listener(this.currentStatus);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getStatus(): LiveTrafficNetworkStatus {
    return this.currentStatus;
  }

  public getCustomApiKey(): string {
    try {
      return localStorage.getItem('harmony_tomtom_api_key') || '';
    } catch {
      return '';
    }
  }

  public getCustomTomTomApiKey(): string {
    return this.getCustomApiKey();
  }

  public setCustomApiKey(key: string): void {
    try {
      if (key) {
        localStorage.setItem('harmony_tomtom_api_key', key.trim());
      } else {
        localStorage.removeItem('harmony_tomtom_api_key');
      }
    } catch {
      // Ignored
    }
  }

  public setCustomTomTomApiKey(key: string | null): void {
    this.setCustomApiKey(key || '');
  }

  public async pollOnce(): Promise<LiveTrafficNetworkStatus> {
    return this.fetchLiveNetwork();
  }

  public startPolling(intervalMs?: number): void {
    if (intervalMs) this.pollIntervalMs = intervalMs;
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      void this.fetchLiveNetwork();
    }, this.pollIntervalMs);
  }

  public stopPolling(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public async fetchLiveNetwork(): Promise<LiveTrafficNetworkStatus> {
    try {
      const res = await fetch('/api/spatial/traffic/live-network');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          this.currentStatus = {
            ...this.currentStatus,
            ...json.data,
            refreshedAt: new Date().toISOString(),
          };
          this.notify();
          return this.currentStatus;
        }
      }
    } catch {
      // Keep existing data
    }
    this.currentStatus = {
      ...this.currentStatus,
      refreshedAt: new Date().toISOString(),
    };
    this.notify();
    return this.currentStatus;
  }

  public async fetchSegmentFlow(lat: number, lng: number): Promise<TomTomFlowSegment | null> {
    try {
      const customKey = this.getCustomApiKey();
      let url = `/api/spatial/traffic/flow?lat=${lat}&lng=${lng}`;
      if (customKey) {
        // Direct upstream if client provided custom key
        url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/relative0/10/json?point=${lat},${lng}&unit=KMPH&key=${customKey}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (customKey) {
          const flow = json?.flowSegmentData;
          if (flow) {
            return {
              currentSpeedKmh: flow.currentSpeed,
              freeFlowSpeedKmh: flow.freeFlowSpeed,
              currentTravelTimeSec: flow.currentTravelTime,
              freeFlowTravelTimeSec: flow.freeFlowTravelTime,
              confidence: flow.confidence,
              roadClosure: Boolean(flow.roadClosure),
              coordinates: flow.coordinates?.coordinate?.map((c: any) => [c.longitude, c.latitude]) || [],
            };
          }
        } else if (json.success && json.data) {
          return json.data;
        }
      }
    } catch {
      // Silently fall back
    }
    return null;
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentStatus);
      } catch (err) {
        console.error(err);
      }
    }
  }
}

export const liveTrafficFlowService = new LiveTrafficFlowService();
