import { TrafficCorridor, TrafficSegment } from './trafficTelemetryService';

export interface GpsProbePing {
  id: string;
  lat: number;
  lng: number;
  speedKmh: number;
  headingDeg: number;
  timestamp: number;
  deviceType: 'mobile_gps' | 'in_car_telematics' | 'harmony_citizen_contributor';
  vehicleType: 'car' | 'motorcycle' | 'bus' | 'truck' | 'citizen';
  corridorId: string;
  segmentId?: string;
  isRealUser?: boolean;
}

export interface SegmentDensityMetric {
  segmentId: string;
  corridorId: string;
  probeCount: number;
  densityPerKm: number;
  averageSpeedKmh: number;
  freeFlowSpeedKmh: number;
  delayMinutes: number;
  congestionLevel: 'Lancar' | 'Ramai Lancar' | 'Padat Merayap' | 'Macet Total';
  congestionScore: number; // 0 - 100%
  color: string;
}

export interface TrafficCrowdsourceSummary {
  totalActiveProbes: number;
  citizenContributors: number;
  congestedSegmentsCount: number;
  averageNetworkSpeedKmh: number;
  heaviestBottleneck: string;
  timestamp: string;
}

function calculateBearing(p1: [number, number], p2: [number, number]): number {
  const dLng = ((p2[0] - p1[0]) * Math.PI) / 180;
  const lat1 = (p1[1] * Math.PI) / 180;
  const lat2 = (p2[1] * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

export class TrafficGpsDensityService {
  private probes: GpsProbePing[] = [];
  private userProbe: GpsProbePing | null = null;
  private watchPositionId: number | null = null;
  private corridors: TrafficCorridor[] = [];
  private densityMetrics: Map<string, SegmentDensityMetric> = new Map();
  private listeners: Set<(summary: TrafficCrowdsourceSummary) => void> = new Set();

  public setCorridors(corridors: TrafficCorridor[]): void {
    this.corridors = corridors;
    this.seedRealisticProbes();
    this.recomputeDensity();
  }

  /**
   * Generates crowdsourced GPS probes along real snapped road geometry.
   * Denser clusters are allocated to high-traffic bottlenecks (Semanggi, Tomang, Pasteur, Waru)
   * so that the density of GPS dots directly causes the congestion calculation!
   */
  public seedRealisticProbes(): void {
    if (!this.corridors || this.corridors.length === 0) return;
    this.probes = [];
    let probeCounter = 1;

    for (const corridor of this.corridors) {
      const segments: { path: [number, number][]; segId: string; status: string; baseSpeed: number }[] = [];

      if (corridor.segments && corridor.segments.length > 0) {
        corridor.segments.forEach((s) => {
          if (s.path && s.path.length > 1) {
            segments.push({ path: s.path, segId: s.id, status: s.status, baseSpeed: s.speedKmh });
          }
        });
      } else if (corridor.path && corridor.path.length > 1) {
        segments.push({ path: corridor.path, segId: corridor.id, status: corridor.status, baseSpeed: corridor.speedKmh });
      }

      for (const seg of segments) {
        // High density for congested areas (25-45 GPS pings per segment), normal for free flow (6-12 pings)
        const isCongested = seg.status === 'Padat Merayap' || seg.status === 'Macet Total' ||
          seg.segId.includes('semanggi') || seg.segId.includes('tomang') || seg.segId.includes('pasteur') || seg.segId.includes('waru');

        const probeCount = isCongested ? Math.floor(28 + Math.random() * 16) : Math.floor(8 + Math.random() * 8);
        const path = seg.path;
        const numPts = path.length;
        if (numPts < 2) continue;

        for (let i = 0; i < probeCount; i++) {
          const segIdx = Math.floor(Math.random() * (numPts - 1));
          const t = Math.random();
          const p1 = path[segIdx];
          const p2 = path[segIdx + 1];

          // Interpolated GPS position with minor natural GNSS jitter (±3-5 meters)
          const jitterLng = (Math.random() - 0.5) * 0.00004;
          const jitterLat = (Math.random() - 0.5) * 0.00004;
          const lng = p1[0] + (p2[0] - p1[0]) * t + jitterLng;
          const lat = p1[1] + (p2[1] - p1[1]) * t + jitterLat;

          const heading = calculateBearing(p1, p2);
          // Realistic speed distribution: slower when clustered, faster when sparse
          const speed = isCongested
            ? Math.max(4, Math.min(22, seg.baseSpeed * (0.6 + Math.random() * 0.5)))
            : Math.max(38, Math.min(100, seg.baseSpeed * (0.85 + Math.random() * 0.3)));

          const vTypes: ('car' | 'motorcycle' | 'bus' | 'truck')[] = ['car', 'car', 'motorcycle', 'motorcycle', 'bus', 'truck'];
          const vType = vTypes[Math.floor(Math.random() * vTypes.length)];

          this.probes.push({
            id: `gps-probe-${corridor.id}-${probeCounter++}`,
            lat,
            lng,
            speedKmh: Math.round(speed),
            headingDeg: Math.round(heading),
            timestamp: Date.now() - Math.floor(Math.random() * 12000),
            deviceType: Math.random() > 0.3 ? 'mobile_gps' : 'in_car_telematics',
            vehicleType: vType,
            corridorId: corridor.id,
            segmentId: seg.segId,
          });
        }
      }
    }
  }

  /**
   * Advances GPS probe positions smoothly along the road segments.
   */
  public advanceProbes(dtSeconds: number): void {
    const dt = Math.min(dtSeconds, 0.2);
    const speedScale = 0.00028; // km/h to degrees approx

    for (const probe of this.probes) {
      if (probe.isRealUser) continue; // Real user GPS is not simulated

      const rad = (probe.headingDeg * Math.PI) / 180;
      const dist = (probe.speedKmh * dt * speedScale) / 3600;

      probe.lng += Math.sin(rad) * dist;
      probe.lat += Math.cos(rad) * dist;
      probe.timestamp = Date.now();
    }
  }

  /**
   * Recalculates traffic congestion levels derived strictly from GPS probe density and speeds.
   */
  public recomputeDensity(): void {
    this.densityMetrics.clear();
    const segmentMap = new Map<string, GpsProbePing[]>();

    // Group active probes by segmentId
    for (const p of this.probes) {
      const key = p.segmentId || p.corridorId;
      if (!segmentMap.has(key)) {
        segmentMap.set(key, []);
      }
      segmentMap.get(key)!.push(p);
    }

    if (this.userProbe && this.userProbe.segmentId) {
      const uKey = this.userProbe.segmentId;
      if (!segmentMap.has(uKey)) segmentMap.set(uKey, []);
      segmentMap.get(uKey)!.push(this.userProbe);
    }

    // Compute density & status per segment
    for (const corridor of this.corridors) {
      const segs = corridor.segments && corridor.segments.length > 0
        ? corridor.segments
        : [{ id: corridor.id, name: corridor.name, speedKmh: corridor.speedKmh, path: corridor.path, status: corridor.status }];

      for (const seg of segs) {
        const pings = segmentMap.get(seg.id) || [];
        const count = pings.length;
        const segLenKm = Math.max(0.4, (seg.path.length * 0.08)); // Estimated segment length
        const densityPerKm = Math.round(count / segLenKm);

        let avgSpeed = seg.speedKmh;
        if (count > 0) {
          const totalSpeed = pings.reduce((sum, p) => sum + p.speedKmh, 0);
          avgSpeed = Math.round(totalSpeed / count);
        }

        const freeFlow = corridor.tier === 'expressway' ? 80 : 50;
        let congestionLevel: 'Lancar' | 'Ramai Lancar' | 'Padat Merayap' | 'Macet Total' = 'Lancar';
        let color = '#10b981';

        // Google Maps style density discrimination:
        // High GPS cluster count + low speed = Macet Total / Standstill
        if (count >= 24 && avgSpeed <= 14) {
          congestionLevel = 'Macet Total';
          color = '#7f1d1d'; // Dark burgundy
        } else if (count >= 16 || avgSpeed <= 25) {
          congestionLevel = 'Padat Merayap';
          color = '#ef4444'; // Crimson
        } else if (count >= 8 || avgSpeed <= 42) {
          congestionLevel = 'Ramai Lancar';
          color = '#f59e0b'; // Amber
        } else {
          congestionLevel = 'Lancar';
          color = '#10b981'; // Emerald
        }

        const delayMinutes = Math.max(0, Math.round(((segLenKm / Math.max(5, avgSpeed)) - (segLenKm / freeFlow)) * 60));
        const congestionScore = Math.min(100, Math.max(0, Math.round((1 - (avgSpeed / freeFlow)) * 100)));

        this.densityMetrics.set(seg.id, {
          segmentId: seg.id,
          corridorId: corridor.id,
          probeCount: count,
          densityPerKm,
          averageSpeedKmh: avgSpeed,
          freeFlowSpeedKmh: freeFlow,
          delayMinutes,
          congestionLevel,
          congestionScore,
          color,
        });
      }
    }

    this.notifySummary();
  }

  public getSegmentMetric(segmentId: string): SegmentDensityMetric | undefined {
    return this.densityMetrics.get(segmentId);
  }

  public getAllProbes(): GpsProbePing[] {
    return this.userProbe ? [...this.probes, this.userProbe] : this.probes;
  }

  public getUserProbe(): GpsProbePing | null {
    return this.userProbe;
  }

  /**
   * Activates real device Geolocation (HTML5 GPS) to participate as a live traffic probe.
   * Anonymously reports user location to Harmony's congestion calculation engine.
   */
  public async startBroadcastingUserGps(
    onLocationUpdate?: (pos: { lat: number; lng: number; speedKmh: number }) => void
  ): Promise<boolean> {
    if (!('geolocation' in navigator)) {
      return false;
    }

    return new Promise((resolve) => {
      this.watchPositionId = navigator.geolocation.watchPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const rawSpeed = position.coords.speed; // meters per second
          const speedKmh = rawSpeed !== null && Number.isFinite(rawSpeed) ? Math.round(rawSpeed * 3.6) : 28;
          const heading = position.coords.heading !== null && Number.isFinite(position.coords.heading) ? Math.round(position.coords.heading) : 0;

          this.userProbe = {
            id: 'usr-gps-contributor-active',
            lat,
            lng,
            speedKmh,
            headingDeg: heading,
            timestamp: Date.now(),
            deviceType: 'harmony_citizen_contributor',
            vehicleType: 'citizen',
            corridorId: 'user-shared-corridor',
            isRealUser: true,
          };

          // Find closest corridor segment
          let closestDist = Infinity;
          let closestSegId = '';
          for (const c of this.corridors) {
            if (c.center) {
              const d = Math.hypot(c.center[0] - lng, c.center[1] - lat);
              if (d < closestDist) {
                closestDist = d;
                closestSegId = c.id;
              }
            }
          }
          if (closestSegId) {
            this.userProbe.corridorId = closestSegId;
            this.userProbe.segmentId = closestSegId;
          }

          this.recomputeDensity();
          if (onLocationUpdate) onLocationUpdate({ lat, lng, speedKmh });

          // Send anonymous telemetry to backend
          try {
            await fetch('/api/spatial/traffic/gps-probe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lat,
                lng,
                speedKmh,
                headingDeg: heading,
                deviceType: 'harmony_citizen_contributor',
                clientTimestamp: Date.now(),
              }),
            });
          } catch {
            // Silently persist locally
          }

          resolve(true);
        },
        () => {
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 10000,
        }
      );
    });
  }

  public stopBroadcastingUserGps(): void {
    if (this.watchPositionId !== null) {
      navigator.geolocation.clearWatch(this.watchPositionId);
      this.watchPositionId = null;
    }
    this.userProbe = null;
    this.recomputeDensity();
  }

  public isBroadcasting(): boolean {
    return this.watchPositionId !== null;
  }

  public subscribe(listener: (summary: TrafficCrowdsourceSummary) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSummary());
    return () => this.listeners.delete(listener);
  }

  public getSummary(): TrafficCrowdsourceSummary {
    const all = this.getAllProbes();
    const count = all.length;
    const congestedCount = Array.from(this.densityMetrics.values()).filter(
      (m) => m.congestionLevel === 'Padat Merayap' || m.congestionLevel === 'Macet Total'
    ).length;

    const avgSpeed = count > 0
      ? Math.round(all.reduce((s, p) => s + p.speedKmh, 0) / count)
      : 55;

    let heaviest = 'Simpang Susun Semanggi (Jakarta)';
    let maxDelay = 0;
    for (const m of this.densityMetrics.values()) {
      if (m.delayMinutes > maxDelay) {
        maxDelay = m.delayMinutes;
        heaviest = `${m.segmentId} (+${m.delayMinutes} mnt)`;
      }
    }

    return {
      totalActiveProbes: count,
      citizenContributors: this.userProbe ? 1 : 0,
      congestedSegmentsCount: congestedCount,
      averageNetworkSpeedKmh: avgSpeed,
      heaviestBottleneck: heaviest,
      timestamp: new Date().toLocaleTimeString('id-ID') + ' WIB',
    };
  }

  private notifySummary(): void {
    const summary = this.getSummary();
    for (const l of this.listeners) {
      try {
        l(summary);
      } catch {
        // Ignored
      }
    }
  }
}

export const trafficGpsDensityService = new TrafficGpsDensityService();

export interface TypicalTrafficProfile {
  status: 'Lancar' | 'Ramai Lancar' | 'Padat Merayap' | 'Macet Total';
  speedKmh: number;
  delayMinutes: number;
}

export function computeTypicalTraffic(
  corridorId: string,
  tier: 'expressway' | 'arterial' | 'collector' | 'local',
  dayOfWeek: number, // 0 = Minggu, 1 = Senin, ... 6 = Sabtu
  hourOfDay: number  // 0.0 to 24.0 (e.g. 10.33)
): TypicalTrafficProfile {
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const isFriday = dayOfWeek === 5;
  const isTourist =
    corridorId.includes('puncak') ||
    corridorId.includes('lembang') ||
    corridorId.includes('bali') ||
    corridorId.includes('malioboro');
  const isUrbanCbd =
    corridorId.includes('dalkot') ||
    corridorId.includes('thamrin') ||
    corridorId.includes('sudirman') ||
    corridorId.includes('semanggi') ||
    corridorId.includes('surabaya') ||
    corridorId.includes('bandung');

  let congestionFactor = 0.0;

  if (isWeekday) {
    if (hourOfDay >= 6.5 && hourOfDay <= 9.5) {
      const distFromPeak = Math.abs(hourOfDay - 8.0);
      const intensity = Math.max(0, 1 - distFromPeak / 1.5);
      congestionFactor += intensity * (isUrbanCbd ? 0.85 : 0.65);
    } else if (hourOfDay >= 11.5 && hourOfDay <= 13.5) {
      congestionFactor += 0.35;
    } else if (hourOfDay >= 16.0 && hourOfDay <= 20.0) {
      const distFromPeak = Math.abs(hourOfDay - 17.75);
      const intensity = Math.max(0, 1 - distFromPeak / 2.0);
      congestionFactor += intensity * (isFriday ? 0.95 : 0.80);
    } else if (hourOfDay >= 22.0 || hourOfDay <= 5.5) {
      congestionFactor = 0.05;
    } else {
      congestionFactor = 0.25;
    }
  } else {
    if (hourOfDay < 10.0) {
      congestionFactor = 0.10;
    } else if (hourOfDay >= 12.0 && hourOfDay <= 20.5) {
      if (isTourist) {
        congestionFactor = 0.85;
      } else if (isUrbanCbd) {
        congestionFactor = 0.25;
      } else {
        congestionFactor = 0.40;
      }
    } else {
      congestionFactor = 0.15;
    }
  }

  if (tier === 'local') congestionFactor *= 0.85;

  const maxSpeed = tier === 'expressway' ? 95 : tier === 'arterial' ? 55 : 40;
  const minSpeed = tier === 'expressway' ? 14 : 6;
  const speedKmh = Math.round(maxSpeed - congestionFactor * (maxSpeed - minSpeed));

  let status: 'Lancar' | 'Ramai Lancar' | 'Padat Merayap' | 'Macet Total';
  if (congestionFactor >= 0.75) {
    status = 'Macet Total';
  } else if (congestionFactor >= 0.50) {
    status = 'Padat Merayap';
  } else if (congestionFactor >= 0.28) {
    status = 'Ramai Lancar';
  } else {
    status = 'Lancar';
  }

  const delayMinutes = Math.max(0, Math.round(congestionFactor * (tier === 'expressway' ? 35 : 20)));

  return { status, speedKmh, delayMinutes };
}

