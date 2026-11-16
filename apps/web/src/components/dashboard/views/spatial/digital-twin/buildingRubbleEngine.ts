import type {
  Phase1Map,
  Phase1Room,
  Phase1ScenarioObject,
  Phase1Tile,
} from "./Phase1Types";

export type RubblePhase = "cracking" | "collapsed";
export type RubbleSeverity = "edge" | "heavy";

export interface DynamicRubbleCell {
  key: string;
  floorId: string;
  x: number;
  y: number;
  phase: RubblePhase;
  severity: RubbleSeverity;
  crackTimerSec: number;
  crackDurationSec: number;
  growth: number;
  generation: number;
  seed: number;
  roomId?: string;
  roomName?: string;
  roomCategory?: string;
  propagationCooldownSec: number;
}

export interface BuildingSeedZone {
  roomId: string;
  roomName: string;
  roomCategory: string;
  vulnerability: number;
  candidateCoords: Array<{ x: number; y: number; severity: RubbleSeverity }>;
}

export interface RubbleStepEvents {
  newlyCracked: DynamicRubbleCell[];
  newlyCollapsed: DynamicRubbleCell[];
  announcedRoomName: string | null;
}

export interface RubbleStepOptions {
  dt: number;
  aftershockPulse?: boolean;
  difficultyMultiplier?: number;
  hazardObjects?: Phase1ScenarioObject[];
  playerTile?: { x: number; y: number } | null;
}

const ROOM_VULNERABILITY: Record<string, number> = {
  lab: 1.5,
  warehouse: 1.45,
  storage: 1.45,
  canteen: 1.3,
  sports: 1.35,
  utility: 1.25,
  classroom: 1.15,
  office: 1.05,
  library: 1.15,
  worship: 0.9,
  health: 1.0,
};

const IMMUNE_ROOM_TYPES = new Set([
  "assembly",
  "parking",
  "gate",
  "garden",
  "corridor",
]);

function coordKey(x: number, y: number): string {
  return `${x},${y}`;
}

function hash2d(x: number, y: number, salt = 0): number {
  let h = (x * 73856093) ^ (y * 19349663) ^ (salt * 83492791);
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = ((h >>> 16) ^ h) >>> 0;
  return h;
}

/**
 * Pure building-aware rubble propagation simulation.
 * Indexes real rooms and structural walls on each map floor, telegraphs cracks
 * before collapsing, and organically spreads rubble along neighboring walls/rooms
 * while guaranteeing at least one evacuation lane remains passable to any EXIT.
 */
export class BuildingRubbleEngine {
  private readonly mapWidth: number;
  private readonly mapHeight: number;
  private readonly floorTiles = new Map<string, Map<string, Phase1Tile>>();
  private readonly staticBlocked = new Map<string, Set<string>>();
  private readonly immuneCells = new Map<string, Set<string>>();
  private readonly safeZoneCells = new Map<string, Set<string>>();
  private readonly spawnCells = new Map<string, Array<{ x: number; y: number }>>();
  private readonly exitCells = new Map<string, Array<{ x: number; y: number }>>();
  private readonly buildingZones = new Map<string, BuildingSeedZone[]>();
  private readonly cellBuildingMeta = new Map<
    string,
    Map<
      string,
      { roomId: string; roomName: string; roomCategory: string; vulnerability: number }
    >
  >();
  private readonly activeRubble = new Map<string, Map<string, DynamicRubbleCell>>();

  private disasterType: string;
  private spreadTimerSec = 0;
  private seedTimerSec = 0;
  private maxCellsPerFloor = 84;
  private baseCrackDurationSec = 1.85;

  constructor(
    map: Phase1Map,
    scenarioObjects: Phase1ScenarioObject[] = [],
    disasterType = "Gempa",
  ) {
    this.mapWidth = Math.max(1, map.width);
    this.mapHeight = Math.max(1, map.height);
    this.disasterType = disasterType;
    this.maxCellsPerFloor = this.resolveMaxCells(disasterType);

    for (const floor of map.floors || []) {
      const tileMap = new Map<string, Phase1Tile>();
      for (const t of floor.tiles || []) {
        tileMap.set(coordKey(t.x, t.y), t);
      }
      this.floorTiles.set(floor.id, tileMap);
      this.staticBlocked.set(floor.id, new Set());
      this.immuneCells.set(floor.id, new Set());
      this.safeZoneCells.set(floor.id, new Set());
      this.spawnCells.set(floor.id, []);
      this.exitCells.set(floor.id, []);
      this.buildingZones.set(floor.id, []);
      this.cellBuildingMeta.set(floor.id, new Map());
      this.activeRubble.set(floor.id, new Map());
    }

    this.indexScenarioConstraints(scenarioObjects);
    this.indexBuildings(map.rooms || [], scenarioObjects);
    this.seedInitialStructuralCracks(scenarioObjects);
  }

  private resolveMaxCells(disasterType: string): number {
    const lower = disasterType.toLowerCase();
    if (lower.includes("gempa") || lower.includes("pas")) return 96;
    if (lower.includes("kebakaran") || lower.includes("angin") || lower.includes("longsor")) {
      return 72;
    }
    if (lower.includes("kimia") || lower.includes("petir")) return 52;
    return 44;
  }

  private indexScenarioConstraints(objects: Phase1ScenarioObject[]) {
    for (const obj of objects) {
      const floorImmune = this.immuneCells.get(obj.floor_id);
      const floorBlocked = this.staticBlocked.get(obj.floor_id);
      const floorSafe = this.safeZoneCells.get(obj.floor_id);
      const floorSpawns = this.spawnCells.get(obj.floor_id);
      const floorExits = this.exitCells.get(obj.floor_id);
      if (!floorImmune || !floorBlocked || !floorSafe || !floorSpawns || !floorExits) {
        continue;
      }

      const ox = Math.floor(obj.x);
      const oy = Math.floor(obj.y);
      const ow = Math.max(1, Math.ceil(obj.width || 1));
      const oh = Math.max(1, Math.ceil(obj.height || 1));

      if (obj.object_type === "BLOCKED_AREA") {
        for (let dy = 0; dy < oh; dy++) {
          for (let dx = 0; dx < ow; dx++) {
            floorBlocked.add(coordKey(ox + dx, oy + dy));
          }
        }
        continue;
      }

      if (obj.object_type === "SAFE_ZONE" || obj.object_type === "EXIT" || obj.object_type === "SPAWN") {
        const pad = obj.object_type === "EXIT" ? 2 : obj.object_type === "SPAWN" ? 2 : 0;
        for (let y = oy - pad; y < oy + oh + pad; y++) {
          for (let x = ox - pad; x < ox + ow + pad; x++) {
            if (x < 0 || y < 0 || x >= this.mapWidth || y >= this.mapHeight) continue;
            floorImmune.add(coordKey(x, y));
            if (obj.object_type === "SAFE_ZONE") {
              floorSafe.add(coordKey(x, y));
            }
          }
        }
        if (obj.object_type === "SPAWN") {
          floorSpawns.push({ x: ox, y: oy });
        } else if (obj.object_type === "EXIT") {
          floorExits.push({ x: ox, y: oy });
        }
      }
    }
  }

  private isWalkableGroundTile(tile?: Phase1Tile): boolean {
    if (!tile) return false;
    return (
      tile.tile_type !== "WALL" &&
      tile.tile_type !== "BORDER" &&
      tile.tile_type !== "DOOR_LOCKED"
    );
  }

  private indexBuildings(rooms: Phase1Room[], scenarioObjects: Phase1ScenarioObject[]) {
    for (const room of rooms) {
      const floorId = room.floor_id;
      const tileMap = this.floorTiles.get(floorId);
      const immune = this.immuneCells.get(floorId);
      const blocked = this.staticBlocked.get(floorId);
      const zones = this.buildingZones.get(floorId);
      const metaMap = this.cellBuildingMeta.get(floorId);
      if (!tileMap || !immune || !blocked || !zones || !metaMap) continue;

      if (IMMUNE_ROOM_TYPES.has(room.type || "")) continue;

      const category = String(room.metadata?.category || room.type || "classroom").toLowerCase();
      let vuln = ROOM_VULNERABILITY[category] ?? ROOM_VULNERABILITY[room.type || "classroom"] ?? 1.05;

      // Boost collapse propensity for buildings housing fires or damage zones
      for (const h of scenarioObjects) {
        if (h.floor_id !== floorId) continue;
        if (h.object_type !== "FIRE" && h.object_type !== "DAMAGE_ZONE") continue;
        const hx = h.x + (h.width || 1) * 0.5;
        const hy = h.y + (h.height || 1) * 0.5;
        if (
          hx >= room.x - 2 &&
          hx <= room.x + room.width + 2 &&
          hy >= room.y - 2 &&
          hy <= room.y + room.height + 2
        ) {
          vuln += 0.35;
        }
      }

      const candidates: Array<{ x: number; y: number; severity: RubbleSeverity }> = [];
      const minX = Math.max(1, room.x - 1);
      const maxX = Math.min(this.mapWidth - 2, room.x + room.width);
      const minY = Math.max(1, room.y - 1);
      const maxY = Math.min(this.mapHeight - 2, room.y + room.height);

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const k = coordKey(x, y);
          if (immune.has(k) || blocked.has(k)) continue;
          const tile = tileMap.get(k);
          if (!this.isWalkableGroundTile(tile)) continue;

          // Prioritize tiles adjacent to a structural wall (crumbling walls & eaves)
          const touchesWall =
            tileMap.get(coordKey(x - 1, y))?.tile_type === "WALL" ||
            tileMap.get(coordKey(x + 1, y))?.tile_type === "WALL" ||
            tileMap.get(coordKey(x, y - 1))?.tile_type === "WALL" ||
            tileMap.get(coordKey(x, y + 1))?.tile_type === "WALL";

          const isOuterEave =
            x === minX || x === maxX || y === minY || y === maxY;

          if (!touchesWall && !isOuterEave) continue;

          const severity: RubbleSeverity =
            touchesWall && tile?.tile_type !== "DOOR" && hash2d(x, y, 7) % 3 !== 0
              ? "heavy"
              : "edge";

          candidates.push({ x, y, severity });
          metaMap.set(k, {
            roomId: room.id,
            roomName: room.metadata?.shortName || room.name || "Gedung Sekolah",
            roomCategory: category,
            vulnerability: vuln,
          });
        }
      }

      if (candidates.length > 0) {
        zones.push({
          roomId: room.id,
          roomName: room.metadata?.shortName || room.name || "Gedung",
          roomCategory: category,
          vulnerability: vuln,
          candidateCoords: candidates,
        });
      }
    }
  }

  private seedInitialStructuralCracks(scenarioObjects: Phase1ScenarioObject[]) {
    for (const [floorId, zones] of this.buildingZones.entries()) {
      const tileMap = this.floorTiles.get(floorId);
      const active = this.activeRubble.get(floorId);
      const blocked = this.staticBlocked.get(floorId);
      if (!tileMap || !active || !blocked) continue;

      // Seed small organic rubble fringes adjacent to existing scenario BLOCKED_AREA / FIRE near buildings
      for (const obj of scenarioObjects) {
        if (obj.floor_id !== floorId) continue;
        if (obj.object_type !== "BLOCKED_AREA" && obj.object_type !== "FIRE") continue;
        const cx = Math.floor(obj.x);
        const cy = Math.floor(obj.y);
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = cx + dx;
          const ny = cy + dy;
          const nk = coordKey(nx, ny);
          const meta = this.cellBuildingMeta.get(floorId)?.get(nk);
          if (!meta || active.has(nk) || blocked.has(nk)) continue;
          if (!this.isWalkableGroundTile(tileMap.get(nk))) continue;
          active.set(nk, {
            key: nk,
            floorId,
            x: nx,
            y: ny,
            phase: "cracking",
            severity: "edge",
            crackTimerSec: 1.4,
            crackDurationSec: 1.4,
            growth: 0.08,
            generation: 0,
            seed: hash2d(nx, ny, 3),
            roomId: meta.roomId,
            roomName: meta.roomName,
            roomCategory: meta.roomCategory,
            propagationCooldownSec: 5.5,
          });
          break;
        }
      }

      // If Gempa or PAS drill, seed 2 initial cracking building nodes away from spawn
      const lower = this.disasterType.toLowerCase();
      if ((lower.includes("gempa") || lower.includes("pas")) && zones.length > 0) {
        const sorted = [...zones].sort((a, b) => b.vulnerability - a.vulnerability);
        for (let i = 0; i < Math.min(3, sorted.length); i++) {
          const z = sorted[i];
          const c = z.candidateCoords[Math.floor(z.candidateCoords.length / 2)];
          if (c) {
            this.trySpawnCrackAt(floorId, c.x, c.y, z.roomId, z.roomName, z.roomCategory, c.severity, 0);
          }
        }
      }
    }
  }

  /**
   * Fast BFS verify ensuring blocking `candidateKey` never isolates spawn/player from EXIT.
   */
  public hasSafeRouteIfBlocked(floorId: string, candidateKey: string): boolean {
    const exits = this.exitCells.get(floorId);
    const spawns = this.spawnCells.get(floorId);
    const tileMap = this.floorTiles.get(floorId);
    const staticB = this.staticBlocked.get(floorId);
    const active = this.activeRubble.get(floorId);

    if (!exits?.length || !spawns?.length || !tileMap || !staticB || !active) {
      return true;
    }

    const total = this.mapWidth * this.mapHeight;
    const visited = new Uint8Array(total);
    const queue = new Int32Array(total);
    let head = 0;
    let tail = 0;

    for (const sp of spawns) {
      const idx = sp.y * this.mapWidth + sp.x;
      if (idx >= 0 && idx < total && !visited[idx]) {
        visited[idx] = 1;
        queue[tail++] = idx;
      }
    }

    const exitSet = new Set(exits.map((e) => e.y * this.mapWidth + e.x));
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];

    while (head < tail) {
      const curr = queue[head++];
      if (exitSet.has(curr)) return true;

      const cx = curr % this.mapWidth;
      const cy = Math.floor(curr / this.mapWidth);

      for (const [dx, dy] of dirs) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= this.mapWidth || ny >= this.mapHeight) continue;
        const nIdx = ny * this.mapWidth + nx;
        if (visited[nIdx]) continue;

        const k = coordKey(nx, ny);
        if (k === candidateKey || staticB.has(k)) continue;
        const dyn = active.get(k);
        if (dyn && dyn.phase === "collapsed" && dyn.severity === "heavy") continue;

        const tile = tileMap.get(k);
        if (!tile || tile.tile_type === "WALL" || tile.tile_type === "BORDER" || tile.tile_type === "DOOR_LOCKED") {
          continue;
        }

        visited[nIdx] = 1;
        queue[tail++] = nIdx;
      }
    }

    return false;
  }

  private trySpawnCrackAt(
    floorId: string,
    x: number,
    y: number,
    roomId: string | undefined,
    roomName: string | undefined,
    roomCategory: string | undefined,
    requestedSeverity: RubbleSeverity,
    generation: number,
    playerTile?: { x: number; y: number } | null,
  ): DynamicRubbleCell | null {
    const active = this.activeRubble.get(floorId);
    const blocked = this.staticBlocked.get(floorId);
    const immune = this.immuneCells.get(floorId);
    const tileMap = this.floorTiles.get(floorId);
    if (!active || !blocked || !immune || !tileMap) return null;
    if (active.size >= this.maxCellsPerFloor) return null;

    const k = coordKey(x, y);
    if (active.has(k) || blocked.has(k) || immune.has(k)) return null;
    if (!this.isWalkableGroundTile(tileMap.get(k))) return null;

    // Never drop heavy rubble right on top of the player with zero reaction time
    if (playerTile && Math.hypot(playerTile.x - x, playerTile.y - y) < 1.35) {
      return null;
    }

    const safeHeavy =
      requestedSeverity === "heavy" &&
      this.hasSafeRouteIfBlocked(floorId, k);

    const cell: DynamicRubbleCell = {
      key: k,
      floorId,
      x,
      y,
      phase: "cracking",
      severity: safeHeavy ? "heavy" : "edge",
      crackTimerSec: this.baseCrackDurationSec,
      crackDurationSec: this.baseCrackDurationSec,
      growth: 0.05,
      generation,
      seed: hash2d(x, y, generation + 11),
      roomId,
      roomName,
      roomCategory,
      propagationCooldownSec: 5.2 + (hash2d(x, y, 5) % 4),
    };
    active.set(k, cell);
    return cell;
  }

  public update(floorId: string, opts: RubbleStepOptions): RubbleStepEvents {
    const events: RubbleStepEvents = {
      newlyCracked: [],
      newlyCollapsed: [],
      announcedRoomName: null,
    };

    const dt = Math.max(0, Math.min(0.2, opts.dt));
    const diffMult = opts.difficultyMultiplier ?? 1;
    const active = this.activeRubble.get(floorId);
    const zones = this.buildingZones.get(floorId) || [];
    const tileMap = this.floorTiles.get(floorId);
    const metaMap = this.cellBuildingMeta.get(floorId);
    if (!active || !tileMap || !metaMap) return events;

    // 1. Advance existing cracking / collapsing / spreading cells
    const toPropagate: DynamicRubbleCell[] = [];
    for (const cell of active.values()) {
      if (cell.phase === "cracking") {
        cell.crackTimerSec -= dt;
        if (cell.crackTimerSec <= 0) {
          cell.phase = "collapsed";
          if (cell.severity === "heavy" && !this.hasSafeRouteIfBlocked(floorId, cell.key)) {
            cell.severity = "edge";
          }
          cell.growth = 0.25;
          events.newlyCollapsed.push(cell);
          if (!events.announcedRoomName && cell.roomName) {
            events.announcedRoomName = cell.roomName;
          }
        }
      } else {
        if (cell.growth < 1) {
          cell.growth = Math.min(1, cell.growth + dt * 2.2);
        }
        if (cell.generation < 2) {
          cell.propagationCooldownSec -= dt * diffMult;
          if (cell.propagationCooldownSec <= 0) {
            cell.propagationCooldownSec = 6.5 + (cell.seed % 4);
            toPropagate.push(cell);
          }
        }
      }
    }

    // 2. Self-spread along adjacent building tiles / corridors / room perimeters
    for (const src of toPropagate) {
      if (active.size >= this.maxCellsPerFloor) break;
      const dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];
      const startIdx = src.seed % 4;
      for (let i = 0; i < 4; i++) {
        const [dx, dy] = dirs[(startIdx + i) % 4];
        const nx = src.x + dx;
        const ny = src.y + dy;
        const nk = coordKey(nx, ny);
        const neighborMeta = metaMap.get(nk);
        const touchesBuildingWall =
          tileMap.get(coordKey(nx - 1, ny))?.tile_type === "WALL" ||
          tileMap.get(coordKey(nx + 1, ny))?.tile_type === "WALL" ||
          tileMap.get(coordKey(nx, ny - 1))?.tile_type === "WALL" ||
          tileMap.get(coordKey(nx, ny + 1))?.tile_type === "WALL";

        if (!neighborMeta && !touchesBuildingWall) continue;

        const spawned = this.trySpawnCrackAt(
          floorId,
          nx,
          ny,
          neighborMeta?.roomId || src.roomId,
          neighborMeta?.roomName || src.roomName,
          neighborMeta?.roomCategory || src.roomCategory,
          src.generation === 0 ? "edge" : "edge",
          src.generation + 1,
          opts.playerTile,
        );
        if (spawned) {
          events.newlyCracked.push(spawned);
          break;
        }
      }
    }

    // 3. Periodic building fatigue + burst triggers during aftershocks
    this.spreadTimerSec += dt * diffMult;
    this.seedTimerSec += dt * diffMult;

    const aftershockCount = opts.aftershockPulse ? 3 : 0;
    const periodicSeed = this.seedTimerSec >= 4.2 ? 1 : 0;
    if (periodicSeed > 0) this.seedTimerSec = 0;

    const seedCount = aftershockCount + periodicSeed;
    if (seedCount > 0 && zones.length > 0 && active.size < this.maxCellsPerFloor) {
      for (let i = 0; i < seedCount; i++) {
        const pickSeed = hash2d(
          Math.floor(this.spreadTimerSec * 10) + i * 17,
          active.size + i * 31,
          99,
        );
        // Weight toward higher-vulnerability buildings (labs, classrooms, GOR, canteen)
        const ranked = zones
          .map((z, idx) => ({
            z,
            score: z.vulnerability + ((pickSeed >> (idx % 12)) & 3) * 0.28,
          }))
          .sort((a, b) => b.score - a.score);
        const chosen = ranked[i % Math.min(5, ranked.length)]?.z;
        if (!chosen || chosen.candidateCoords.length === 0) continue;
        const coord =
          chosen.candidateCoords[pickSeed % chosen.candidateCoords.length];
        const created = this.trySpawnCrackAt(
          floorId,
          coord.x,
          coord.y,
          chosen.roomId,
          chosen.roomName,
          chosen.roomCategory,
          coord.severity,
          0,
          opts.playerTile,
        );
        if (created) {
          events.newlyCracked.push(created);
        }
      }
    }

    return events;
  }

  public getCellsForFloor(floorId: string): DynamicRubbleCell[] {
    const active = this.activeRubble.get(floorId);
    return active ? Array.from(active.values()) : [];
  }

  public isHeavyBlockingTile(floorId: string, tx: number, ty: number): boolean {
    const cell = this.activeRubble.get(floorId)?.get(coordKey(tx, ty));
    return Boolean(cell && cell.phase === "collapsed" && cell.severity === "heavy");
  }

  public getEdgeDebrisAt(floorId: string, tx: number, ty: number): DynamicRubbleCell | null {
    const cell = this.activeRubble.get(floorId)?.get(coordKey(tx, ty));
    if (!cell || cell.phase !== "collapsed") return null;
    return cell;
  }

  public getBuildingZoneCount(floorId: string): number {
    return (this.buildingZones.get(floorId) || []).length;
  }
}

