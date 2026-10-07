import { TrafficCorridor } from './trafficTelemetryService';

export interface SimulatedVehicle {
  id: string;
  corridorId: string;
  segmentId?: string;
  corridorName: string;
  type: 'car' | 'truck' | 'bus' | 'motorcycle';
  coord: [number, number]; // [lng, lat]
  headingDeg: number;
  speedKmh: number;
  status: 'Lancar' | 'Ramai Lancar' | 'Padat Merayap' | 'Macet Total';
  color: string;
  progress: number; // 0 to 1 along segment
  segmentIndex: number;
  direction: 1 | -1;
  path: [number, number][];
}

function calculateDistanceMeters(p1: [number, number], p2: [number, number]): number {
  const R = 6371000; // meters
  const dLat = ((p2[1] - p1[1]) * Math.PI) / 180;
  const dLng = ((p2[0] - p1[0]) * Math.PI) / 180;
  const lat1 = (p1[1] * Math.PI) / 180;
  const lat2 = (p2[1] * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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

export class TrafficVehicleEngine {
  private vehicles: SimulatedVehicle[] = [];
  private corridors: TrafficCorridor[] = [];
  private maxVehicles: number = 250;
  private lastTickMs: number = Date.now();

  constructor(maxVehicles = 250) {
    this.maxVehicles = maxVehicles;
  }

  public setCorridors(corridors: TrafficCorridor[]): void {
    this.corridors = corridors;
    this.spawnVehicles();
  }

  public spawnVehicles(): void {
    this.vehicles = [];
    if (!this.corridors || this.corridors.length === 0) return;

    const vehicleTypes: ('car' | 'truck' | 'bus' | 'motorcycle')[] = [
      'car', 'car', 'car', 'motorcycle', 'motorcycle', 'truck', 'bus'
    ];

    let vIdx = 0;
    for (const corridor of this.corridors) {
      const pathsToUse: { path: [number, number][]; status: 'Lancar' | 'Ramai Lancar' | 'Padat Merayap' | 'Macet Total'; speedKmh: number; segId?: string }[] = [];

      if (corridor.segments && corridor.segments.length > 0) {
        corridor.segments.forEach((s) => {
          if (s.path && s.path.length > 1) {
            pathsToUse.push({ path: s.path, status: s.status, speedKmh: s.speedKmh, segId: s.id });
          }
        });
      } else if (corridor.path && corridor.path.length > 1) {
        pathsToUse.push({ path: corridor.path, status: corridor.status, speedKmh: corridor.speedKmh });
      }

      for (const p of pathsToUse) {
        // Density based on congestion status
        const count = p.status === 'Padat Merayap' || p.status === 'Macet Total' ? 8 : 4;

        for (let i = 0; i < count; i++) {
          if (this.vehicles.length >= this.maxVehicles) return;

          const numSegments = p.path.length - 1;
          if (numSegments < 1) continue;

          const segIdx = Math.floor(Math.random() * numSegments);
          const t = Math.random();
          const p1 = p.path[segIdx];
          const p2 = p.path[segIdx + 1];

          const currLng = p1[0] + (p2[0] - p1[0]) * t;
          const currLat = p1[1] + (p2[1] - p1[1]) * t;
          const direction = i % 2 === 0 ? 1 : -1;
          const heading = direction === 1 ? calculateBearing(p1, p2) : (calculateBearing(p1, p2) + 180) % 360;

          const vType = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
          const color =
            p.status === 'Lancar'
              ? '#22c55e'
              : p.status === 'Ramai Lancar'
              ? '#eab308'
              : p.status === 'Padat Merayap'
              ? '#ef4444'
              : '#991b1b';

          this.vehicles.push({
            id: `veh-${corridor.id}-${vIdx++}`,
            corridorId: corridor.id,
            segmentId: p.segId,
            corridorName: corridor.name,
            type: vType,
            coord: [currLng, currLat],
            headingDeg: heading,
            speedKmh: Math.max(8, p.speedKmh * (0.85 + Math.random() * 0.3)),
            status: p.status,
            color,
            progress: t,
            segmentIndex: segIdx,
            direction: direction as 1 | -1,
            path: p.path,
          });
        }
      }
    }
  }

  /**
   * Advance all vehicles based on elapsed time (delta time)
   */
  public advance(deltaSeconds: number): void {
    const dt = Math.min(deltaSeconds, 0.15); // Clamp dt to prevent jumping

    for (const v of this.vehicles) {
      if (!v.path || v.path.length < 2) continue;

      const numSegments = v.path.length - 1;
      let segIdx = v.segmentIndex;
      if (segIdx < 0 || segIdx >= numSegments) {
        segIdx = 0;
        v.segmentIndex = 0;
      }

      const p1 = v.path[segIdx];
      const p2 = v.path[segIdx + 1];
      const segLengthM = calculateDistanceMeters(p1, p2);

      const speedMps = (v.speedKmh * 1000) / 3600;
      const distTraveledM = speedMps * dt;
      const progressDelta = segLengthM > 0 ? distTraveledM / segLengthM : 0.05;

      if (v.direction === 1) {
        v.progress += progressDelta;
        if (v.progress >= 1.0) {
          v.progress = 0;
          v.segmentIndex++;
          if (v.segmentIndex >= numSegments) {
            v.segmentIndex = 0;
          }
        }
      } else {
        v.progress -= progressDelta;
        if (v.progress <= 0.0) {
          v.progress = 1.0;
          v.segmentIndex--;
          if (v.segmentIndex < 0) {
            v.segmentIndex = numSegments - 1;
          }
        }
      }

      // Recompute position and heading
      const curP1 = v.path[v.segmentIndex];
      const curP2 = v.path[v.segmentIndex + 1];
      if (curP1 && curP2) {
        v.coord = [
          curP1[0] + (curP2[0] - curP1[0]) * v.progress,
          curP1[1] + (curP2[1] - curP1[1]) * v.progress,
        ];
        const segBearing = calculateBearing(curP1, curP2);
        v.headingDeg = v.direction === 1 ? segBearing : (segBearing + 180) % 360;
      }
    }
  }

  public updateFlowSpeed(corridorId: string, speedKmh: number, status: 'Lancar' | 'Ramai Lancar' | 'Padat Merayap' | 'Macet Total'): void {
    for (const v of this.vehicles) {
      if (v.corridorId === corridorId) {
        v.speedKmh = Math.max(8, speedKmh * (0.85 + Math.random() * 0.3));
        v.status = status;
        v.color =
          status === 'Lancar'
            ? '#22c55e'
            : status === 'Ramai Lancar'
            ? '#eab308'
            : status === 'Padat Merayap'
            ? '#ef4444'
            : '#991b1b';
      }
    }
  }

  public getVehicles(): SimulatedVehicle[] {
    return this.vehicles;
  }
}

export const trafficVehicleEngine = new TrafficVehicleEngine(220);
