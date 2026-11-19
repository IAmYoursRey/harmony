export interface LiveTrafficNetworkStatus {
  monitoredCorridors: number;
  totalRoadLengthKm: number;
  nationalFlowIndex: number | null; // 0 - 100%
  averageSpeedKmh: number | null;
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
  dataStatus: 'LIVE' | 'PARTIAL' | 'UNAVAILABLE' | 'ERROR' | 'SIMULATED' | 'OFFLINE';
  errorMessage?: string;
  tomtomConfigured?: boolean;
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
    monitoredCorridors: 0,
    totalRoadLengthKm: 0,
    nationalFlowIndex: null,
    averageSpeedKmh: null,
    activeSimulatedVehicles: 0,
    onlineCctvCount: 0,
    onlineSignalsCount: 0,
    severeBottlenecks: [],
    dataStatus: 'UNAVAILABLE',
    refreshedAt: new Date().toISOString(),
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.startPolling();
    }
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
    if (typeof this.timer?.unref === 'function') this.timer.unref();
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
      if (!res.ok) {
        this.currentStatus = {
          monitoredCorridors: 0,
          totalRoadLengthKm: 0,
          nationalFlowIndex: null,
          averageSpeedKmh: null,
          activeSimulatedVehicles: 0,
          onlineCctvCount: 0,
          onlineSignalsCount: 0,
          severeBottlenecks: [],
          dataStatus: 'ERROR',
          errorMessage: `Traffic API HTTP ${res.status}`,
          refreshedAt: new Date().toISOString(),
        };
        this.notify();
        return this.currentStatus;
      }

      const json = await res.json();
      if (json.success && json.data) {
        this.currentStatus = {
          ...json.data,
          errorMessage: json.data.errorMessage,
          refreshedAt: new Date().toISOString(),
        };
        this.notify();
        return this.currentStatus;
      }

      this.currentStatus = {
        monitoredCorridors: 0,
        totalRoadLengthKm: 0,
        nationalFlowIndex: null,
        averageSpeedKmh: null,
        activeSimulatedVehicles: 0,
        onlineCctvCount: 0,
        onlineSignalsCount: 0,
        severeBottlenecks: [],
        dataStatus: 'ERROR',
        errorMessage: json?.error || json?.message || 'Payload jaringan lalu lintas tidak valid.',
        refreshedAt: new Date().toISOString(),
      };
      this.notify();
      return this.currentStatus;
    } catch (err: any) {
      this.currentStatus = {
        monitoredCorridors: 0,
        totalRoadLengthKm: 0,
        nationalFlowIndex: null,
        averageSpeedKmh: null,
        activeSimulatedVehicles: 0,
        onlineCctvCount: 0,
        onlineSignalsCount: 0,
        severeBottlenecks: [],
        dataStatus: 'ERROR',
        errorMessage: err instanceof Error ? err.message : 'Gagal menghubungi layanan lalu lintas.',
        refreshedAt: new Date().toISOString(),
      };
      this.notify();
      return this.currentStatus;
    }
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
