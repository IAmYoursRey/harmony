import {
  Phase1Map,
  Phase1Scenario,
  Phase1Floor,
  Phase1Tile,
  Phase1Object,
  Phase1ScenarioObject,
  Phase1Stairs,
} from "./Phase1Types";
import { renderRoomOverlays } from "./Phase1RoomRenderer";
import { simulationAudio } from "./simulationAudio";

export type SimState =
  "LOADING" | "READY" | "RUNNING" | "PAUSED" | "SUCCESS" | "FAILED" | "EXITED";

export type DifficultyLevel = "mudah" | "sedang" | "sulit";

export interface PlayerInventoryState {
  keys: number;
  extinguishers: number;
  maskSec: number;
  flashlightSec: number;
  pickupsCollected: number;
  medkitsUsed: number;
}

export interface NpcRuntimeState {
  id: string;
  name: string;
  role: "Siswa" | "Guru";
  x: number;
  y: number;
  floorId: string;
  status: "TRAPPED" | "FOLLOWING" | "RESCUED" | "LOST";
  health: number;
}

export interface SimulationReport {
  grade: "S" | "A" | "B" | "C" | "D";
  score: number;
  succeeded: boolean;
  timeMs: number;
  healthRemaining: number;
  difficulty: DifficultyLevel;
  npcsRescued: number;
  npcsTotal: number;
  trapsTriggered: number;
  totalTraps: number;
  suppliesCollected: number;
  requiredCompleted: number;
  requiredTotal: number;
}

export interface PlayerState {
  x: number;
  y: number;
  floorId: string;
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  speed: number;
  alive: boolean;
  objectiveProgress: string;
  facing: "up" | "down" | "left" | "right";
  moving: boolean;
  interactionPrompt: string | null;
  color?: string;
  displayName?: string;
  inventory?: PlayerInventoryState;
  npcRescuedCount?: number;
  npcFollowingCount?: number;
  npcTotalCount?: number;
  difficulty?: DifficultyLevel;
}

export interface InputProvider {
  getMovementVector(): { dx: number; dy: number };
  isActionDown(action: string): boolean;
  bind(): void;
  unbind(): void;
}

export class KeyboardInputProvider implements InputProvider {
  private keys: Record<string, boolean> = {};

  public bind() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  public unbind() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = true;
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = false;
  };

  public getMovementVector() {
    let dx = 0;
    let dy = 0;
    if (this.keys["w"] || this.keys["arrowup"]) dy -= 1;
    if (this.keys["s"] || this.keys["arrowdown"]) dy += 1;
    if (this.keys["a"] || this.keys["arrowleft"]) dx -= 1;
    if (this.keys["d"] || this.keys["arrowright"]) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      return { dx: dx / len, dy: dy / len };
    }
    return { dx: 0, dy: 0 };
  }

  public isActionDown(action: string): boolean {
    if (action === "pause") return this.keys["escape"] || false;
    if (action === "interact") return this.keys["e"] || false;
    if (action === "run") return this.keys["shift"] || false;
    return false;
  }
}

export interface EngineCallbacks {
  onStateChange: (state: SimState) => void;
  onPlayerUpdate: (player: PlayerState) => void;
  onTimeUpdate: (ms: number) => void;
  onMessage: (msg: string) => void;
  onFloorChange: (floorName: string) => void;
  onDebugUpdate?: (debugInfo: any) => void;
  onNetworkEmit?: (state: any) => void;
  onReportReady?: (report: SimulationReport) => void;
  onDoorStateChange?: (
    doorId: string,
    state: "open" | "closed" | "locked",
  ) => void;
}

export interface RemotePlayer {
  participantId: string;
  studentId: string;
  displayName: string;
  targetX: number;
  targetY: number;
  x: number;
  y: number;
  floorId: string;
  direction: "up" | "down" | "left" | "right";
  alive: boolean;
  lastUpdate: number;
}

export const SIMULATION_PHYSICS = {
  TILE_SIZE: 72,
  PLAYER_RADIUS: 13,
  WALK_SPEED: 86,
  RUN_SPEED: 132,
  STAMINA_DRAIN_PER_SEC: 38,
  STAMINA_RECOVER_WALK: 5,
  STAMINA_RECOVER_IDLE: 14,
  EXHAUSTION_RECOVERY_THRESHOLD: 22,
  FIRE_DPS: 32,
  SMOKE_DPS: 14,
  DEFAULT_ZONE_DPS: 25,
  DEFAULT_HIDDEN_BURST: 30,
  DEFAULT_HIDDEN_REVEAL_TILES: 1.85,
} as const;

export const DIFFICULTY_PROFILES: Record<
  DifficultyLevel,
  {
    walkSpeed: number;
    runSpeed: number;
    damageMultiplier: number;
    revealMultiplier: number;
    darknessMultiplier: number;
    scoreMultiplier: number;
  }
> = {
  mudah: {
    walkSpeed: 104,
    runSpeed: 166,
    damageMultiplier: 0.7,
    revealMultiplier: 1.3,
    darknessMultiplier: 0.5,
    scoreMultiplier: 0.85,
  },
  sedang: {
    walkSpeed: 95,
    runSpeed: 148,
    damageMultiplier: 0.95,
    revealMultiplier: 1.1,
    darknessMultiplier: 0.82,
    scoreMultiplier: 1.0,
  },
  sulit: {
    walkSpeed: SIMULATION_PHYSICS.WALK_SPEED,
    runSpeed: SIMULATION_PHYSICS.RUN_SPEED,
    damageMultiplier: 1.1,
    revealMultiplier: 1.0,
    darknessMultiplier: 1.0,
    scoreMultiplier: 1.25,
  },
};

interface LightningStrike {
  id: string;
  x: number;
  y: number;
  radiusPx: number;
  remainingWarningSec: number;
  flashSec: number;
  struck: boolean;
}

const TILE_SIZE = SIMULATION_PHYSICS.TILE_SIZE;
const PLAYER_RADIUS = SIMULATION_PHYSICS.PLAYER_RADIUS;

export class Phase3Engine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private map: Phase1Map;
  private scenario: Phase1Scenario;
  private callbacks: EngineCallbacks;

  private state: SimState = "READY";
  private player: PlayerState;
  private input: InputProvider;
  private difficulty: DifficultyLevel = "sulit";

  public joystick: { dx: number; dy: number } = { dx: 0, dy: 0 };
  public virtualButtons: Record<string, boolean> = {};

  public setJoystick(dx: number, dy: number) {
    this.joystick = { dx, dy };
  }

  public setVirtualButton(action: string, isDown: boolean) {
    this.virtualButtons[action] = isDown;
  }

  private lastTime: number = 0;
  private animationFrameId: number = 0;

  private simTimeMs: number = 0;

  private camera = { x: 0, y: 0 };

  private remotePlayers = new Map<string, RemotePlayer>();
  private lastNetworkEmitTime: number = 0;

  private isAuthoritative: boolean = false;

  private staminaExhausted: boolean = false;
  private terrainSlowFactor: number = 1;
  private slowDebuffTimer: number = 0;
  private cameraShakeTime: number = 0;
  private lastAftershockMs: number = 0;
  private lastLightningMs: number = 0;
  private lastHitAudioMs: number = 0;
  private fireExpansionTiles: number = 0;
  private floodExpansionTiles: number = 0;
  private activeLightningStrikes: LightningStrike[] = [];
  private revealedHazards: Set<string> = new Set();
  private triggeredHazards: Set<string> = new Set();
  private extinguishedFires: Set<string> = new Set();
  private inventory: PlayerInventoryState = {
    keys: 0,
    extinguishers: 0,
    maskSec: 0,
    flashlightSec: 0,
    pickupsCollected: 0,
    medkitsUsed: 0,
  };
  private npcs: NpcRuntimeState[] = [];
  private playerTrail: { x: number; y: number }[] = [];
  private reportEmitted: boolean = false;

  public doorStates: Map<string, "closed" | "open" | "locked"> = new Map();

  constructor(
    canvas: HTMLCanvasElement,
    map: Phase1Map,
    scenario: Phase1Scenario,
    callbacks: EngineCallbacks,
    options?: { difficulty?: DifficultyLevel },
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.map = map;
    this.scenario = scenario;
    this.callbacks = callbacks;
    this.difficulty = options?.difficulty || "sulit";

    if (!map.floors || map.floors.length === 0) {
      throw new Error(
        "Peta tidak memiliki lantai. Peta harus dibangun terlebih dahulu.",
      );
    }
    const spawnObj = scenario.objects?.find((o) => o.object_type === "SPAWN");
    if (!spawnObj) {
      throw new Error(
        "No spawn point configured in the scenario. Please edit the scenario and add a Spawn point.",
      );
    }

    const startFloor =
      map.floors.find((f) => f.id === spawnObj.floor_id) || map.floors[0];
    if (!startFloor) {
      throw new Error("The map has no valid floors.");
    }

    const requiredObjectives = (scenario.objects || []).filter(
      (o) => o.object_type === "OBJECTIVE" && !o.properties?.pickupOnly,
    ).length;

    const rawNpcs = Array.isArray(scenario.config?.npcs)
      ? scenario.config.npcs
      : [];
    this.npcs = rawNpcs.map((n: any, idx: number) => ({
      id: n.id || `npc-${idx + 1}`,
      name: n.name || `Siswa ${idx + 1}`,
      role: n.role === "Guru" ? "Guru" : "Siswa",
      x: n.x * TILE_SIZE + TILE_SIZE / 2,
      y: n.y * TILE_SIZE + TILE_SIZE / 2,
      floorId: startFloor.id,
      status: "TRAPPED",
      health: 100,
    }));

    const profile = DIFFICULTY_PROFILES[this.difficulty];
    this.player = {
      x: spawnObj.x * TILE_SIZE + TILE_SIZE / 2,
      y: spawnObj.y * TILE_SIZE + TILE_SIZE / 2,
      floorId: startFloor.id,
      health: 100,
      maxHealth: 100,
      stamina: 100,
      maxStamina: 100,
      speed: profile.walkSpeed,
      alive: true,
      objectiveProgress:
        requiredObjectives > 0
          ? `Ambil Item Misi (0/${requiredObjectives})`
          : "Evakuasi ke Gerbang Utama (EXIT)",
      facing: "down",
      moving: false,
      interactionPrompt: null,
      inventory: { ...this.inventory },
      npcRescuedCount: 0,
      npcFollowingCount: 0,
      npcTotalCount: this.npcs.length,
      difficulty: this.difficulty,
    };

    const lockedCoords = new Set(
      ((scenario.config?.lockedDoors as { x: number; y: number }[]) || []).map(
        (d) => `${d.x},${d.y}`,
      ),
    );

    for (const floor of map.floors) {
      for (const tile of floor.tiles) {
        if (tile.tile_type === "DOOR" || tile.tile_type === "DOOR_LOCKED") {
          const isScenarioLocked =
            tile.tile_type === "DOOR_LOCKED" ||
            lockedCoords.has(`${tile.x},${tile.y}`);
          this.doorStates.set(tile.id, isScenarioLocked ? "locked" : "closed");
        }
      }
    }

    this.input = new KeyboardInputProvider();
    this.input.bind();
  }

  public updateDoorState(doorId: string, state: "open" | "closed" | "locked") {
    if (this.doorStates.has(doorId)) {
      this.doorStates.set(doorId, state);
    }
  }

  public setPlayerAvatar(color: string, name: string) {
    this.player.color = color;
    this.player.displayName = name;
  }

  public syncAuthoritativeState(data: any, localUserId: string) {
    this.isAuthoritative = true;

    if (data.sessionStatus === "FINISHED") {
      this.state = "FAILED"; // or read from player state
      this.callbacks.onStateChange(this.state);
    }

    if (data.timeRemaining !== undefined) {
      this.simTimeMs =
        (this.scenario.config?.durationSeconds || 120 - data.timeRemaining) *
        1000;
      this.callbacks.onTimeUpdate(this.simTimeMs);
    }

    const players = data.players || {};
    const me = players[localUserId];

    if (me) {
      if (
        this.player.health !== me.hp ||
        this.player.alive !== me.alive ||
        this.player.objectiveProgress !== me.objectiveProgress
      ) {
        this.player.health = me.hp;
        this.player.alive = me.alive;
        this.player.objectiveProgress =
          me.objectiveProgress || "Evacuate to Safe Zone / Exit";
        if (!me.alive && this.state !== "FAILED" && this.state !== "SUCCESS") {
          this.state = "FAILED";
          this.callbacks.onStateChange(this.state);
        }
        if (me.status === "success" && this.state !== "SUCCESS") {
          this.state = "SUCCESS";
          this.callbacks.onStateChange(this.state);
        }
        this.callbacks.onPlayerUpdate({ ...this.player });
      }
    }
  }

  public updateRemotePlayer(id: string, data: any) {
    const existing = this.remotePlayers.get(id);
    const now = performance.now();

    if (existing) {
      existing.targetX = data.state.x;
      existing.targetY = data.state.y;
      existing.floorId = data.state.floorId;
      existing.direction = data.state.direction;
      existing.alive = data.state.alive;
      existing.lastUpdate = now;
      const dist = Math.hypot(
        existing.targetX - existing.x,
        existing.targetY - existing.y,
      );
      if (dist > TILE_SIZE * 3 || existing.floorId !== data.state.floorId) {
        existing.x = existing.targetX;
        existing.y = existing.targetY;
      }
    } else {
      this.remotePlayers.set(id, {
        participantId: data.participantId,
        studentId: data.studentId,
        displayName: data.displayName,
        targetX: data.state.x,
        targetY: data.state.y,
        x: data.state.x,
        y: data.state.y,
        floorId: data.state.floorId,
        direction: data.state.direction,
        alive: data.state.alive,
        lastUpdate: now,
      });
    }
  }

  public removeRemotePlayer(id: string) {
    this.remotePlayers.delete(id);
  }

  public start() {
    this.state = "RUNNING";
    this.callbacks.onStateChange(this.state);

    const floorName =
      this.map.floors.find((f) => f.id === this.player.floorId)?.name ||
      "Unknown Floor";
    this.callbacks.onFloorChange(floorName);
    this.callbacks.onPlayerUpdate({ ...this.player });

    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  public pause() {
    if (this.state !== "RUNNING") return;
    this.state = "PAUSED";
    this.callbacks.onStateChange(this.state);
    cancelAnimationFrame(this.animationFrameId);
    this.render(); // Draw pause overlay
  }

  public resume() {
    if (this.state !== "PAUSED") return;
    this.state = "RUNNING";
    this.callbacks.onStateChange(this.state);
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  public destroy() {
    this.input.unbind();
    cancelAnimationFrame(this.animationFrameId);
  }

  private loop = (time: number) => {
    if (this.state !== "RUNNING") return;

    const dt = Math.min(0.08, Math.max(0.001, (time - this.lastTime) / 1000));
    this.lastTime = time;

    this.update(dt);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private consumeInteract(): boolean {
    const triggered =
      this.input.isActionDown("interact") || this.virtualButtons["interact"];
    if (!triggered) return false;
    (this.input as any).keys["e"] = false;
    this.virtualButtons["interact"] = false;
    return true;
  }

  private getExpandedHazardRect(obj: Phase1ScenarioObject) {
    let expandTiles = 0;
    if (obj.object_type === "FIRE") {
      expandTiles = this.fireExpansionTiles;
    } else if (
      obj.object_type === "DANGER_ZONE" &&
      (obj.properties?.hazardKind === "FLOOD" ||
        obj.properties?.hazardKind === "MUD_SLIDE")
    ) {
      expandTiles = this.floodExpansionTiles;
    }
    const padPx = expandTiles * TILE_SIZE;
    return {
      ox: obj.x * TILE_SIZE - padPx,
      oy: obj.y * TILE_SIZE - padPx,
      ow: obj.width * TILE_SIZE + padPx * 2,
      oh: obj.height * TILE_SIZE + padPx * 2,
    };
  }

  private syncPlayerHudSnapshot() {
    this.player.inventory = { ...this.inventory };
    this.player.npcRescuedCount = this.npcs.filter(
      (n) => n.status === "RESCUED",
    ).length;
    this.player.npcFollowingCount = this.npcs.filter(
      (n) => n.status === "FOLLOWING",
    ).length;
    this.player.npcTotalCount = this.npcs.length;
    this.player.difficulty = this.difficulty;
  }

  private emitFinalReport(succeeded: boolean) {
    if (this.reportEmitted || !this.callbacks.onReportReady) return;
    this.reportEmitted = true;

    const totalTraps = (this.scenario.objects || []).filter(
      (o) => o.properties?.hidden,
    ).length;
    const trapsTriggered = this.triggeredHazards.size;
    const requiredObjs = (this.scenario.objects || []).filter(
      (o) => o.object_type === "OBJECTIVE" && !o.properties?.pickupOnly,
    );
    const requiredCompleted = requiredObjs.filter((o) =>
      this.collectedObjectives.has(o.id),
    ).length;
    const npcsRescued = this.npcs.filter(
      (n) => n.status === "RESCUED",
    ).length;
    const profile = DIFFICULTY_PROFILES[this.difficulty];

    let baseScore = succeeded ? 52 : 12;
    baseScore += Math.round((this.player.health / this.player.maxHealth) * 20);
    baseScore += Math.round(
      ((totalTraps - trapsTriggered) / Math.max(1, totalTraps)) * 12,
    );
    baseScore += npcsRescued * 6;
    baseScore += Math.min(8, this.inventory.pickupsCollected * 2);
    const timeSec = this.simTimeMs / 1000;
    if (succeeded && timeSec < 120) {
      baseScore += Math.round(((120 - timeSec) / 120) * 10);
    }

    const finalScore = Math.max(
      0,
      Math.min(100, Math.round(baseScore * profile.scoreMultiplier)),
    );

    let grade: SimulationReport["grade"] = "D";
    if (succeeded) {
      if (finalScore >= 90) grade = "S";
      else if (finalScore >= 76) grade = "A";
      else if (finalScore >= 60) grade = "B";
      else grade = "C";
    }

    this.callbacks.onReportReady({
      grade,
      score: finalScore,
      succeeded,
      timeMs: this.simTimeMs,
      healthRemaining: Math.ceil(this.player.health),
      difficulty: this.difficulty,
      npcsRescued,
      npcsTotal: this.npcs.length,
      trapsTriggered,
      totalTraps,
      suppliesCollected: this.inventory.pickupsCollected,
      requiredCompleted,
      requiredTotal: requiredObjs.length,
    });
  }

  private updateDynamicDisasters(dt: number) {
    const profile = DIFFICULTY_PROFILES[this.difficulty];
    const diffBoost =
      this.difficulty === "sulit" ? 1.15 : this.difficulty === "mudah" ? 0.65 : 0.9;

    const aftershockInterval = Number(
      this.scenario.config?.aftershockIntervalMs || 0,
    );
    if (
      aftershockInterval > 0 &&
      this.simTimeMs - this.lastAftershockMs >= aftershockInterval
    ) {
      this.lastAftershockMs = this.simTimeMs;
      this.cameraShakeTime = 1.1;
      simulationAudio.playHit(false);
      this.callbacks.onMessage(
        "Gempa susulan terdeteksi! Waspada reruntuhan & kabel.",
      );
    }

    const fireInterval = Number(
      this.scenario.config?.fireSpreadIntervalMs || 0,
    );
    if (fireInterval > 0) {
      const stages = Math.floor(this.simTimeMs / fireInterval);
      this.fireExpansionTiles = Math.min(1.1, stages * 0.25 * diffBoost);
    }

    const floodInterval = Number(
      this.scenario.config?.floodRiseIntervalMs || 0,
    );
    if (floodInterval > 0) {
      const stages = Math.floor(this.simTimeMs / floodInterval);
      this.floodExpansionTiles = Math.min(0.85, stages * 0.22 * diffBoost);
    }

    const lightningInterval = Number(
      this.scenario.config?.lightningIntervalMs || 0,
    );
    if (
      lightningInterval > 0 &&
      this.simTimeMs - this.lastLightningMs >= lightningInterval / diffBoost
    ) {
      this.lastLightningMs = this.simTimeMs;
      const offsetAngle = (this.simTimeMs * 0.017) % (Math.PI * 2);
      const distTiles = 2.4 + ((this.simTimeMs % 30) / 15);
      const sx = Math.max(
        TILE_SIZE * 2,
        Math.min(
          (this.map.width - 2) * TILE_SIZE,
          this.player.x + Math.cos(offsetAngle) * distTiles * TILE_SIZE,
        ),
      );
      const sy = Math.max(
        TILE_SIZE * 2,
        Math.min(
          (this.map.height - 2) * TILE_SIZE,
          this.player.y + Math.sin(offsetAngle) * distTiles * TILE_SIZE,
        ),
      );
      this.activeLightningStrikes.push({
        id: `bolt-${Date.now()}-${Math.random()}`,
        x: sx,
        y: sy,
        radiusPx: TILE_SIZE * 1.9,
        remainingWarningSec: 2.2,
        flashSec: 0,
        struck: false,
      });
    }

    for (const bolt of this.activeLightningStrikes) {
      if (!bolt.struck) {
        bolt.remainingWarningSec -= dt;
        if (bolt.remainingWarningSec <= 0) {
          bolt.struck = true;
          bolt.flashSec = 0.45;
          simulationAudio.playThunder();
          this.cameraShakeTime = Math.max(this.cameraShakeTime, 0.5);
          const dist = Math.hypot(this.player.x - bolt.x, this.player.y - bolt.y);
          if (dist <= bolt.radiusPx && !this.isPlayerInSafeZone()) {
            const dmg = Math.round(36 * profile.damageMultiplier);
            this.player.health = Math.max(0, this.player.health - dmg);
            this.slowDebuffTimer = Math.max(this.slowDebuffTimer, 1.2);
            this.callbacks.onMessage(`Tersambar petir jarak dekat! (-${dmg} HP)`);
          }
        }
      } else {
        bolt.flashSec -= dt;
      }
    }
    this.activeLightningStrikes = this.activeLightningStrikes.filter(
      (b) => !b.struck || b.flashSec > 0,
    );
  }

  private isPlayerInSafeZone(): boolean {
    return (this.scenario.objects || []).some(
      (obj) =>
        obj.floor_id === this.player.floorId &&
        obj.object_type === "SAFE_ZONE" &&
        this.rectCircleCollide(
          obj.x * TILE_SIZE,
          obj.y * TILE_SIZE,
          obj.width * TILE_SIZE,
          obj.height * TILE_SIZE,
          this.player.x,
          this.player.y,
          PLAYER_RADIUS,
        ),
    );
  }

  private updateNpcs(dt: number, inSafeZone: boolean) {
    const lastPt = this.playerTrail[this.playerTrail.length - 1];
    if (
      !lastPt ||
      Math.hypot(this.player.x - lastPt.x, this.player.y - lastPt.y) >= 26
    ) {
      this.playerTrail.push({ x: this.player.x, y: this.player.y });
      if (this.playerTrail.length > 160) {
        this.playerTrail.shift();
      }
    }

    let followingIndex = 0;
    let rescuedNow = 0;

    for (const npc of this.npcs) {
      if (npc.floorId !== this.player.floorId) continue;

      if (npc.status === "TRAPPED") {
        const dist = Math.hypot(this.player.x - npc.x, this.player.y - npc.y);
        if (dist <= TILE_SIZE * 1.65) {
          this.player.interactionPrompt = `Tekan E / ACT untuk Menyelamatkan ${npc.name}`;
          if (this.consumeInteract()) {
            npc.status = "FOLLOWING";
            simulationAudio.playRescue();
            this.callbacks.onMessage(
              `${npc.name} bergabung! Antar ke Zona Aman atau Gerbang Keluar.`,
            );
          }
        }
      } else if (npc.status === "FOLLOWING") {
        if (inSafeZone) {
          npc.status = "RESCUED";
          rescuedNow++;
          continue;
        }
        followingIndex++;
        const trailOffset = Math.min(
          this.playerTrail.length - 1,
          followingIndex * 2,
        );
        const target =
          this.playerTrail[
            Math.max(0, this.playerTrail.length - 1 - trailOffset)
          ] || { x: this.player.x, y: this.player.y };

        const dx = target.x - npc.x;
        const dy = target.y - npc.y;
        const d = Math.hypot(dx, dy);
        if (d > 10) {
          const step = Math.min(d, Math.max(96, this.player.speed * 1.15) * dt);
          npc.x += (dx / d) * step;
          npc.y += (dy / d) * step;
        }
      }
    }

    if (rescuedNow > 0) {
      simulationAudio.playRescue();
      this.callbacks.onMessage(
        `${rescuedNow} warga sekolah berhasil mencapai Zona Aman!`,
      );
    }
  }

  private checkExtinguisherAction() {
    if (this.inventory.extinguishers <= 0) return;
    for (const obj of this.scenario.objects || []) {
      if (
        obj.floor_id !== this.player.floorId ||
        obj.object_type !== "FIRE" ||
        this.extinguishedFires.has(obj.id)
      ) {
        continue;
      }
      const { ox, oy, ow, oh } = this.getExpandedHazardRect(obj);
      const isNearFire = this.rectCircleCollide(
        ox,
        oy,
        ow,
        oh,
        this.player.x,
        this.player.y,
        TILE_SIZE * 1.4,
      );
      if (isNearFire) {
        this.player.interactionPrompt = `Tekan E / ACT untuk Padamkan Api (APAR: ${this.inventory.extinguishers}x)`;
        if (this.consumeInteract()) {
          this.extinguishedFires.add(obj.id);
          this.inventory.extinguishers -= 1;
          simulationAudio.playExtinguish();
          this.callbacks.onMessage("Kobaran api berhasil dipadamkan dengan APAR!");
          return;
        }
      }
    }
  }

  private update(dt: number) {
    if (!this.player.alive) return;

    if (!this.isAuthoritative) {
      this.simTimeMs += dt * 1000;
      this.updateDynamicDisasters(dt);
    }

    if (this.inventory.maskSec > 0) {
      this.inventory.maskSec = Math.max(0, this.inventory.maskSec - dt);
    }
    if (this.inventory.flashlightSec > 0) {
      this.inventory.flashlightSec = Math.max(
        0,
        this.inventory.flashlightSec - dt,
      );
    }
    if (this.cameraShakeTime > 0) {
      this.cameraShakeTime = Math.max(0, this.cameraShakeTime - dt);
    }
    if (this.slowDebuffTimer > 0) {
      this.slowDebuffTimer = Math.max(0, this.slowDebuffTimer - dt);
    }

    this.player.interactionPrompt = null;

    const kVec = this.input.getMovementVector();
    let dx = kVec.dx;
    let dy = kVec.dy;

    if (this.joystick.dx !== 0 || this.joystick.dy !== 0) {
      dx = this.joystick.dx;
      dy = this.joystick.dy;
    }

    this.player.moving = dx !== 0 || dy !== 0;

    const wantsToRun =
      this.input.isActionDown("run") || this.virtualButtons["run"];
    const canSprint =
      wantsToRun &&
      !this.staminaExhausted &&
      this.player.moving &&
      this.player.stamina > 0;

    const profile = DIFFICULTY_PROFILES[this.difficulty];
    let currentSpeed: number = profile.walkSpeed;
    if (canSprint) {
      currentSpeed = profile.runSpeed;
      this.player.stamina = Math.max(
        0,
        this.player.stamina - SIMULATION_PHYSICS.STAMINA_DRAIN_PER_SEC * dt,
      );
      if (this.player.stamina <= 0) {
        this.staminaExhausted = true;
      }
    } else {
      const recoveryRate = this.player.moving
        ? SIMULATION_PHYSICS.STAMINA_RECOVER_WALK
        : SIMULATION_PHYSICS.STAMINA_RECOVER_IDLE;
      this.player.stamina = Math.min(
        this.player.maxStamina,
        this.player.stamina + recoveryRate * dt,
      );
      if (
        this.staminaExhausted &&
        this.player.stamina >= SIMULATION_PHYSICS.EXHAUSTION_RECOVERY_THRESHOLD
      ) {
        this.staminaExhausted = false;
      }
    }

    const trapMultiplier = this.slowDebuffTimer > 0 ? 0.55 : 1;
    currentSpeed *= this.terrainSlowFactor * trapMultiplier;
    this.player.speed = currentSpeed;

    if (dx !== 0 || dy !== 0) {
      if (Math.abs(dx) > Math.abs(dy)) {
        this.player.facing = dx > 0 ? "right" : "left";
      } else {
        this.player.facing = dy > 0 ? "down" : "up";
      }
      const nextX = this.player.x + dx * this.player.speed * dt;
      const nextY = this.player.y + dy * this.player.speed * dt;

      this.movePlayer(nextX, nextY);
    }

    if (!this.isAuthoritative) {
      const inSafeZone = this.isPlayerInSafeZone();
      this.updateNpcs(dt, inSafeZone);
      this.checkExtinguisherAction();
      this.checkHazards(dt);
      this.checkObjectives();
    }
    this.checkStairs();
    this.checkDoors();
    this.syncPlayerHudSnapshot();

    let scale = 1;
    const targetWidth = 14 * TILE_SIZE;
    if (this.canvas.width < targetWidth) {
      scale = this.canvas.width / targetWidth;
    }

    const visibleWidth = this.canvas.width / scale;
    const visibleHeight = this.canvas.height / scale;

    const targetCamX = this.player.x - visibleWidth / 2;
    const targetCamY = this.player.y - visibleHeight / 2;

    this.camera.x += (targetCamX - this.camera.x) * 10 * dt;
    this.camera.y += (targetCamY - this.camera.y) * 10 * dt;

    const mapWidthPx = this.map.width * TILE_SIZE;
    const mapHeightPx = this.map.height * TILE_SIZE;
    const padding = TILE_SIZE * 2;

    if (visibleWidth > mapWidthPx) {
      this.camera.x = (mapWidthPx - visibleWidth) / 2;
    } else {
      this.camera.x = Math.max(
        -padding,
        Math.min(this.camera.x, mapWidthPx - visibleWidth + padding),
      );
    }

    if (visibleHeight > mapHeightPx) {
      this.camera.y = (mapHeightPx - visibleHeight) / 2;
    } else {
      this.camera.y = Math.max(
        -padding,
        Math.min(this.camera.y, mapHeightPx - visibleHeight + padding),
      );
    }

    if (this.callbacks.onDebugUpdate) {
      this.callbacks.onDebugUpdate({
        fps: Math.round(1 / dt),
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
        floor: this.player.floorId,
        hp: Math.ceil(this.player.health),
      });
    }

    for (const rp of this.remotePlayers.values()) {
      rp.x += (rp.targetX - rp.x) * 10 * dt;
      rp.y += (rp.targetY - rp.y) * 10 * dt;
    }

    if (this.simTimeMs - this.lastNetworkEmitTime > 66) {
      this.lastNetworkEmitTime = this.simTimeMs;
      if (this.callbacks.onNetworkEmit) {
        this.callbacks.onNetworkEmit({
          x: this.player.x,
          y: this.player.y,
          floorId: this.player.floorId,
          direction: this.player.facing,
          alive: this.player.alive,
          timestamp: this.simTimeMs,
        });
      }
    }

    if (
      Math.floor(this.simTimeMs / 100) >
      Math.floor((this.simTimeMs - dt * 1000) / 100)
    ) {
      this.callbacks.onTimeUpdate(this.simTimeMs);
      this.callbacks.onPlayerUpdate({ ...this.player }); // Update UI with prompt/health
    }
  }

  private movePlayer(nextX: number, nextY: number) {
    const canMoveX = !this.checkCollision(nextX, this.player.y);
    const canMoveY = !this.checkCollision(this.player.x, nextY);

    if (canMoveX && canMoveY) {
      if (!this.checkCollision(nextX, nextY)) {
        this.player.x = nextX;
        this.player.y = nextY;
      }
    } else {
      if (canMoveX) this.player.x = nextX;
      if (canMoveY) this.player.y = nextY;
    }
  }

  private checkCollision(x: number, y: number): boolean {
    const floor = this.map.floors.find((f) => f.id === this.player.floorId);
    if (!floor) return true;

    if (
      x - PLAYER_RADIUS < 0 ||
      x + PLAYER_RADIUS > this.map.width * TILE_SIZE ||
      y - PLAYER_RADIUS < 0 ||
      y + PLAYER_RADIUS > this.map.height * TILE_SIZE
    ) {
      return true;
    }

    for (const tile of floor.tiles) {
      const isWall = tile.tile_type === "WALL" || tile.tile_type === "BORDER";
      const isDoor =
        tile.tile_type === "DOOR" || tile.tile_type === "DOOR_LOCKED";
      let isSolid = isWall;

      if (isDoor) {
        const state = this.doorStates.get(tile.id);
        if (state !== "open") {
          isSolid = true;
        }
      }

      if (isSolid) {
        if (
          this.rectCircleCollide(
            tile.x * TILE_SIZE,
            tile.y * TILE_SIZE,
            TILE_SIZE,
            TILE_SIZE,
            x,
            y,
            PLAYER_RADIUS,
          )
        ) {
          return true;
        }
      }
    }

    for (const obj of this.scenario.objects || []) {
      if (obj.floor_id === floor.id && obj.object_type === "BLOCKED_AREA") {
        if (
          this.rectCircleCollide(
            obj.x * TILE_SIZE,
            obj.y * TILE_SIZE,
            obj.width * TILE_SIZE,
            obj.height * TILE_SIZE,
            x,
            y,
            PLAYER_RADIUS,
          )
        ) {
          return true;
        }
      }
    }

    return false;
  }

  private checkHazards(dt: number) {
    const floor = this.map.floors.find((f) => f.id === this.player.floorId);
    if (!floor) return;

    const profile = DIFFICULTY_PROFILES[this.difficulty];
    const flashlightRevealMult = this.inventory.flashlightSec > 0 ? 1.9 : 1;
    const maskReduction = this.inventory.maskSec > 0 ? 0.25 : 1;

    let highestDps = 0;
    let inSafeZone = false;
    let slowFactor = 1;

    for (const obj of this.scenario.objects || []) {
      if (obj.floor_id !== floor.id) continue;
      if (obj.object_type === "FIRE" && this.extinguishedFires.has(obj.id)) {
        continue;
      }

      const { ox, oy, ow, oh } = this.getExpandedHazardRect(obj);

      if (obj.properties?.hidden) {
        const revealPx =
          Number(
            obj.properties.revealRadius ||
              SIMULATION_PHYSICS.DEFAULT_HIDDEN_REVEAL_TILES,
          ) *
          TILE_SIZE *
          profile.revealMultiplier *
          flashlightRevealMult;
        const distToCenter = Math.hypot(
          this.player.x - (ox + ow / 2),
          this.player.y - (oy + oh / 2),
        );
        if (distToCenter <= revealPx) {
          this.revealedHazards.add(obj.id);
        }
      }

      const isIntersecting = this.rectCircleCollide(
        ox,
        oy,
        ow,
        oh,
        this.player.x,
        this.player.y,
        PLAYER_RADIUS,
      );

      if (!isIntersecting) continue;

      if (obj.object_type === "SAFE_ZONE") {
        inSafeZone = true;
        continue;
      }

      if (obj.object_type === "FIRE") {
        const fireDps =
          Number(obj.properties?.damagePerSec ?? SIMULATION_PHYSICS.FIRE_DPS) *
          profile.damageMultiplier;
        highestDps = Math.max(highestDps, fireDps);
      } else if (obj.object_type === "SMOKE") {
        const smokeDps =
          Number(obj.properties?.damagePerSec ?? SIMULATION_PHYSICS.SMOKE_DPS) *
          profile.damageMultiplier *
          maskReduction;
        highestDps = Math.max(highestDps, smokeDps);
        slowFactor = Math.min(
          slowFactor,
          Number(obj.properties?.slowFactor ?? 0.74),
        );
      } else if (
        obj.object_type === "DAMAGE_ZONE" ||
        obj.object_type === "DANGER_ZONE"
      ) {
        const isGas = obj.properties?.hazardKind === "GAS_CLOUD";
        const zoneDps =
          Number(
            obj.properties?.damagePerSec ?? SIMULATION_PHYSICS.DEFAULT_ZONE_DPS,
          ) *
          profile.damageMultiplier *
          (isGas ? maskReduction : 1);
        highestDps = Math.max(highestDps, zoneDps);

        if (obj.properties?.slowFactor) {
          slowFactor = Math.min(slowFactor, Number(obj.properties.slowFactor));
        }

        if (obj.properties?.hidden) {
          this.revealedHazards.add(obj.id);
          if (!this.triggeredHazards.has(obj.id)) {
            this.triggeredHazards.add(obj.id);
            const burst = Math.round(
              Number(
                obj.properties.burstDamage ??
                  SIMULATION_PHYSICS.DEFAULT_HIDDEN_BURST,
              ) * profile.damageMultiplier,
            );
            this.player.health = Math.max(0, this.player.health - burst);
            this.slowDebuffTimer = Math.max(this.slowDebuffTimer, 1.4);
            this.cameraShakeTime = Math.max(this.cameraShakeTime, 0.45);
            simulationAudio.playHit(true);
            const reason =
              obj.properties.reason || "Menginjak bahaya tersembunyi!";
            this.callbacks.onMessage(`${reason} (-${burst} HP)`);
          }
        }
      }
    }

    this.terrainSlowFactor = slowFactor;

    if (inSafeZone && !this.player.interactionPrompt) {
      this.player.interactionPrompt = "Zona Aman";
    }

    if (highestDps > 0 && !inSafeZone) {
      this.player.health = Math.max(0, this.player.health - highestDps * dt);
      if (this.simTimeMs - this.lastHitAudioMs > 750) {
        this.lastHitAudioMs = this.simTimeMs;
        simulationAudio.playHit(false);
      }
    }

    if (this.player.health <= 0 && this.player.alive) {
      this.player.health = 0;
      this.player.alive = false;
      this.state = "FAILED";
      simulationAudio.playFail();
      this.callbacks.onStateChange(this.state);
      this.callbacks.onMessage("Evakuasi gagal akibat paparan bahaya.");
      this.emitFinalReport(false);
    }

    if (highestDps > 0 || this.player.health <= 0) {
      this.syncPlayerHudSnapshot();
      this.callbacks.onPlayerUpdate({ ...this.player });
    }
  }

  private collectedObjectives: Set<string> = new Set();

  private applySupplyPickup(obj: Phase1ScenarioObject) {
    const kind = obj.properties?.itemKind;
    this.inventory.pickupsCollected += 1;
    simulationAudio.playPickup();

    switch (kind) {
      case "MEDKIT": {
        const heal = Number(obj.properties?.healAmount ?? 35);
        this.player.health = Math.min(
          this.player.maxHealth,
          this.player.health + heal,
        );
        this.inventory.medkitsUsed += 1;
        this.callbacks.onMessage(`Kotak P3K digunakan! (+${heal} HP)`);
        break;
      }
      case "STAMINA_DRINK": {
        const boost = Number(obj.properties?.staminaAmount ?? 55);
        this.player.stamina = Math.min(
          this.player.maxStamina,
          this.player.stamina + boost,
        );
        this.staminaExhausted = false;
        this.callbacks.onMessage(`Air energi diminum! (+${boost} Stamina)`);
        break;
      }
      case "MASK": {
        const dur = Number(obj.properties?.durationSec ?? 15);
        this.inventory.maskSec = Math.max(this.inventory.maskSec, dur);
        this.callbacks.onMessage(
          `Masker Respirator aktif (${dur}s — kebal 75% asap & gas)!`,
        );
        break;
      }
      case "EXTINGUISHER": {
        const charges = Number(obj.properties?.charges ?? 2);
        this.inventory.extinguishers += charges;
        this.callbacks.onMessage(
          `Tabung APAR diperoleh (+${charges}x padamkan api dengan E/ACT)!`,
        );
        break;
      }
      case "KEY": {
        this.inventory.keys += 1;
        this.callbacks.onMessage(
          "Kunci Darurat diambil! Dapat membuka pintu terkunci.",
        );
        break;
      }
      case "FLASHLIGHT": {
        const dur = Number(obj.properties?.durationSec ?? 20);
        this.inventory.flashlightSec = Math.max(
          this.inventory.flashlightSec,
          dur,
        );
        this.callbacks.onMessage(
          `Senter aktif (${dur}s — pandang terang & deteksi jebakan lebih jauh)!`,
        );
        break;
      }
      default:
        this.callbacks.onMessage(
          `${obj.properties?.name || "Perlengkapan"} diambil!`,
        );
    }
  }

  private checkObjectives() {
    const floor = this.map.floors.find((f) => f.id === this.player.floorId);
    if (!floor) return;

    const requiredObjectives = (this.scenario.objects || []).filter(
      (o) => o.object_type === "OBJECTIVE" && !o.properties?.pickupOnly,
    );
    const totalRequired = requiredObjectives.length;
    const completedRequired = requiredObjectives.filter((o) =>
      this.collectedObjectives.has(o.id),
    ).length;

    for (const obj of this.scenario.objects || []) {
      if (obj.floor_id !== floor.id) continue;

      const isIntersecting = this.rectCircleCollide(
        obj.x * TILE_SIZE,
        obj.y * TILE_SIZE,
        obj.width * TILE_SIZE,
        obj.height * TILE_SIZE,
        this.player.x,
        this.player.y,
        PLAYER_RADIUS,
      );

      if (!isIntersecting) continue;

      if (obj.object_type === "OBJECTIVE") {
        if (!this.collectedObjectives.has(obj.id)) {
          this.collectedObjectives.add(obj.id);
          if (obj.properties?.pickupOnly) {
            this.applySupplyPickup(obj);
          } else {
            const newDone = completedRequired + 1;
            const itemName = obj.properties?.name || "Item Misi";
            simulationAudio.playPickup();
            this.callbacks.onMessage(
              `${itemName} selesai! (${newDone}/${totalRequired})`,
            );
            this.player.objectiveProgress =
              newDone >= totalRequired
                ? "Misi Selesai -> Gerbang Utama (EXIT)"
                : `Item Misi (${newDone}/${totalRequired})`;
          }
          this.syncPlayerHudSnapshot();
          this.callbacks.onPlayerUpdate({ ...this.player });
        }
      }

      if (obj.object_type === "EXIT") {
        if (completedRequired >= totalRequired) {
          this.player.interactionPrompt = "Tekan E / ACT untuk Evakuasi";
          if (this.consumeInteract()) {
            for (const npc of this.npcs) {
              if (npc.status === "FOLLOWING") {
                npc.status = "RESCUED";
              }
            }
            this.state = "SUCCESS";
            simulationAudio.playSuccess();
            this.callbacks.onStateChange(this.state);
            this.callbacks.onMessage("Evakuasi Berhasil!");
            this.player.objectiveProgress = "Berhasil Evakuasi!";
            this.syncPlayerHudSnapshot();
            this.callbacks.onPlayerUpdate({ ...this.player });
            this.emitFinalReport(true);
          }
        } else {
          this.player.interactionPrompt = `Ambil Item Misi (${completedRequired}/${totalRequired})`;
        }
      }
    }
  }

  private checkStairs() {
    const floor = this.map.floors.find((f) => f.id === this.player.floorId);
    if (!floor) return;

    for (const stair of this.map.stairs) {
      if (stair.from_floor_id === floor.id) {
        const isIntersecting = this.rectCircleCollide(
          stair.x * TILE_SIZE,
          stair.y * TILE_SIZE,
          TILE_SIZE,
          TILE_SIZE,
          this.player.x,
          this.player.y,
          PLAYER_RADIUS,
        );

        if (isIntersecting) {
          const fIdx = this.map.floors.findIndex((f) => f.id === floor.id);
          let targetIdx = fIdx;
          if (stair.type === "UP_DOWN") {
            targetIdx = (fIdx + 1) % this.map.floors.length;
          }

          if (targetIdx !== fIdx) {
            const targetFloor = this.map.floors[targetIdx];
            this.player.interactionPrompt = `Tekan E / ACT untuk masuk ${targetFloor.name}`;

            if (
              this.input.isActionDown("interact") ||
              this.virtualButtons["interact"]
            ) {
              (this.input as any).keys["e"] = false; // consume input
              this.virtualButtons["interact"] = false;
              this.player.floorId = targetFloor.id;
              this.callbacks.onFloorChange(targetFloor.name);
              this.callbacks.onPlayerUpdate({ ...this.player });
              this.callbacks.onMessage(`Berpindah ke ${targetFloor.name}`);
            }
          }
        }
      }
    }
  }

  private checkDoors() {
    const floor = this.map.floors.find((f) => f.id === this.player.floorId);
    if (!floor) return;

    for (const tile of floor.tiles) {
      if (tile.tile_type === "DOOR" || tile.tile_type === "DOOR_LOCKED") {
        const state = this.doorStates.get(tile.id);

        const interactRadius = PLAYER_RADIUS * 2.5;
        const isIntersecting = this.rectCircleCollide(
          tile.x * TILE_SIZE,
          tile.y * TILE_SIZE,
          TILE_SIZE,
          TILE_SIZE,
          this.player.x,
          this.player.y,
          interactRadius,
        );

        if (isIntersecting) {
          if (state === "locked") {
            if (this.inventory.keys > 0) {
              this.player.interactionPrompt = `Pintu Terkunci — Tekan E / ACT Buka dengan Kunci (${this.inventory.keys})`;
              if (this.consumeInteract()) {
                this.inventory.keys -= 1;
                this.updateDoorState(tile.id, "open");
                simulationAudio.playUnlock();
                this.callbacks.onMessage("Pintu darurat berhasil dibuka dengan kunci!");
                if (this.callbacks.onDoorStateChange) {
                  this.callbacks.onDoorStateChange(tile.id, "open");
                }
              }
            } else {
              this.player.interactionPrompt = "Pintu Terkunci (Butuh Kunci Darurat)";
            }
          } else if (state === "closed") {
            this.player.interactionPrompt = "Tekan E / ACT untuk Buka Pintu";
            if (this.consumeInteract()) {
              this.updateDoorState(tile.id, "open");
              if (this.callbacks.onDoorStateChange) {
                this.callbacks.onDoorStateChange(tile.id, "open");
              }
            }
          }
        }
      }
    }
  }

  private render() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    this.ctx.save();

    let scale = 1;
    const targetWidth = 14 * TILE_SIZE;
    if (this.canvas.width < targetWidth) {
      scale = this.canvas.width / targetWidth;
    }
    const shakeAmp = this.cameraShakeTime > 0 ? 6 : 0;
    const shakeX = shakeAmp > 0 ? (Math.sin(this.simTimeMs * 0.09) * shakeAmp) : 0;
    const shakeY = shakeAmp > 0 ? (Math.cos(this.simTimeMs * 0.11) * shakeAmp) : 0;
    this.ctx.scale(scale, scale);
    this.ctx.translate(
      -Math.floor(this.camera.x) + shakeX,
      -Math.floor(this.camera.y) + shakeY,
    );

    const floor = this.map.floors.find((f) => f.id === this.player.floorId);
    if (!floor) {
      this.ctx.restore();
      return;
    }

    for (const tile of floor.tiles) {
      if (tile.tile_type === "WALL" || tile.tile_type === "BORDER") {
        this.ctx.fillStyle = "#334155"; // Slate wall
      } else if (
        tile.tile_type === "DOOR" ||
        tile.tile_type === "DOOR_LOCKED"
      ) {
        const state = this.doorStates.get(tile.id);
        if (state === "open") {
          this.ctx.fillStyle = "#fef3c7"; // Open door (Walkable/Amber light)
        } else if (state === "locked") {
          this.ctx.fillStyle = "#78350f"; // Locked door (Dark amber)
        } else {
          this.ctx.fillStyle = "#d97706"; // Closed door (Amber)
        }
      } else if (tile.tile_type === "FLOOR") {
        this.ctx.fillStyle = "#f8fafc";
      } else if (tile.tile_type === "PAVING") {
        this.ctx.fillStyle = "#475569";
      } else if (tile.tile_type === "ROAD") {
        this.ctx.fillStyle = "#1e293b";
      } else if (tile.tile_type === "GRASS") {
        this.ctx.fillStyle = "#16a34a";
      } else if (tile.tile_type === "COURT_VOLI") {
        this.ctx.fillStyle = "#ea580c";
      } else if (tile.tile_type === "COURT_BASKET") {
        this.ctx.fillStyle = "#475569";
      } else if (tile.tile_type === "PARKING") {
        this.ctx.fillStyle = "#374151";
      } else if (tile.tile_type === "MOSQUE") {
        this.ctx.fillStyle = "#047857";
      } else {
        this.ctx.fillStyle = "#cbd5e1";
      }

      this.ctx.fillRect(
        tile.x * TILE_SIZE,
        tile.y * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE,
      );

      this.ctx.strokeStyle = "rgba(0,0,0,0.08)";
      this.ctx.strokeRect(
        tile.x * TILE_SIZE,
        tile.y * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE,
      );
    }

    for (const stair of this.map.stairs) {
      if (stair.from_floor_id === floor.id) {
        this.ctx.fillStyle = "#f59e0b";
        this.ctx.fillRect(
          stair.x * TILE_SIZE,
          stair.y * TILE_SIZE,
          TILE_SIZE,
          TILE_SIZE,
        );
        this.ctx.fillStyle = "white";
        this.ctx.font = "10px sans-serif";
        this.ctx.fillText(
          "STAIR",
          stair.x * TILE_SIZE + 4,
          stair.y * TILE_SIZE + 24,
        );
      }
    }

    renderRoomOverlays(this.ctx, this.map.rooms, TILE_SIZE, {
      showZoneTint: true,
      showLabels: true,
      currentFloorId: floor.id,
    });

    for (const obj of floor.objects) {
      this.ctx.fillStyle = "#94a3b8";
      this.ctx.fillRect(
        obj.x * TILE_SIZE,
        obj.y * TILE_SIZE,
        obj.width * TILE_SIZE,
        obj.height * TILE_SIZE,
      );
    }

    let smokeOverlay = false;

    const smokeDriftX = (this.simTimeMs * 0.02) % TILE_SIZE;
    const smokeDriftY = (this.simTimeMs * 0.015) % TILE_SIZE;

    for (const obj of this.scenario.objects || []) {
      if (obj.floor_id !== floor.id) continue;
      if (obj.object_type === "FIRE" && this.extinguishedFires.has(obj.id)) {
        continue;
      }

      const expanded = this.getExpandedHazardRect(obj);
      const px = expanded.ox;
      const py = expanded.oy;
      const pw = expanded.ow;
      const ph = expanded.oh;

      this.ctx.save();
      switch (obj.object_type) {
        case "FIRE":
          const timeOffset = px + py;
          const flicker =
            Math.sin(this.simTimeMs / 100 + timeOffset) * 0.15 + 0.85;

          const grad = this.ctx.createRadialGradient(
            px + pw / 2,
            py + ph / 2,
            0,
            px + pw / 2,
            py + ph / 2,
            (Math.max(pw, ph) / 1.5) * flicker,
          );
          grad.addColorStop(0, "rgba(252, 211, 77, 0.9)"); // center yellow
          grad.addColorStop(0.4, "rgba(239, 68, 68, 0.7)"); // middle red
          grad.addColorStop(1, "rgba(220, 38, 38, 0)"); // fade out
          this.ctx.fillStyle = grad;
          this.ctx.fillRect(px - pw / 2, py - ph / 2, pw * 2, ph * 2);

          this.ctx.fillStyle = `rgba(239, 68, 68, ${flicker})`;
          this.ctx.beginPath();
          this.ctx.moveTo(px + pw / 2, py + ph / 2 - (ph / 3) * flicker);
          this.ctx.quadraticCurveTo(px + pw, py + ph, px + pw / 2, py + ph);
          this.ctx.quadraticCurveTo(
            px,
            py + ph,
            px + pw / 2,
            py + ph / 2 - (ph / 3) * flicker,
          );
          this.ctx.fill();
          break;
        case "SMOKE":
          this.ctx.fillStyle = "rgba(71, 85, 105, 0.85)";

          this.ctx.beginPath();
          this.ctx.rect(px, py, pw, ph);
          this.ctx.clip(); // Restrict to the rectangle bounds

          for (let ix = -1; ix <= pw / TILE_SIZE + 1; ix++) {
            for (let iy = -1; iy <= ph / TILE_SIZE + 1; iy++) {
              this.ctx.beginPath();
              this.ctx.arc(
                px + ix * TILE_SIZE + smokeDriftX,
                py + iy * TILE_SIZE + smokeDriftY,
                TILE_SIZE * 0.8,
                0,
                Math.PI * 2,
              );
              this.ctx.fill();
            }
          }

          if (
            this.rectCircleCollide(
              px,
              py,
              pw,
              ph,
              this.player.x,
              this.player.y,
              PLAYER_RADIUS,
            )
          ) {
            smokeOverlay = true;
          }
          break;
        case "DAMAGE_ZONE":
          if (obj.properties?.hidden) {
            const isRevealed = this.revealedHazards.has(obj.id);
            const isTriggered = this.triggeredHazards.has(obj.id);
            if (!isRevealed && !isTriggered) {
              break;
            }
            const kind = obj.properties.hazardKind;
            const pulseAlpha = Math.sin(this.simTimeMs / 120) * 0.2 + 0.7;
            if (isTriggered) {
              this.ctx.fillStyle =
                kind === "ELECTRICAL"
                  ? `rgba(250, 204, 21, ${0.42 * pulseAlpha})`
                  : kind === "TOXIC_SPILL"
                    ? "rgba(132, 204, 22, 0.45)"
                    : "rgba(220, 38, 38, 0.42)";
              this.ctx.fillRect(px, py, pw, ph);
              this.ctx.strokeStyle = kind === "ELECTRICAL" ? "#fde047" : "#ef4444";
              this.ctx.lineWidth = 3;
              this.ctx.strokeRect(px, py, pw, ph);
            } else {
              // Nearby subtle proximity hint before stepping directly onto trap
              this.ctx.fillStyle = `rgba(192, 132, 252, ${0.18 * pulseAlpha})`;
              this.ctx.fillRect(px, py, pw, ph);
              this.ctx.strokeStyle = `rgba(232, 121, 249, ${0.65 * pulseAlpha})`;
              this.ctx.lineWidth = 2;
              this.ctx.setLineDash([4, 4]);
              this.ctx.strokeRect(px, py, pw, ph);
              this.ctx.fillStyle = `rgba(245, 208, 254, ${pulseAlpha})`;
              this.ctx.font = "bold 16px sans-serif";
              this.ctx.textAlign = "center";
              this.ctx.textBaseline = "middle";
              this.ctx.fillText("!", px + pw / 2, py + ph / 2);
            }
          } else {
            this.ctx.fillStyle = "rgba(220, 38, 38, 0.28)";
            this.ctx.fillRect(px, py, pw, ph);
            this.ctx.strokeStyle = "rgba(239, 68, 68, 0.9)";
            this.ctx.lineWidth = 2.5;
            this.ctx.setLineDash([8, 8]);
            this.ctx.lineDashOffset = -(this.simTimeMs / 50) % 16;
            this.ctx.strokeRect(px, py, pw, ph);
          }
          break;
        case "DANGER_ZONE": {
          const kind = obj.properties?.hazardKind;
          const wave = Math.sin(this.simTimeMs / 240 + px * 0.01) * 0.12 + 0.88;
          if (kind === "FLOOD") {
            this.ctx.fillStyle = `rgba(14, 165, 233, ${0.38 * wave})`;
            this.ctx.fillRect(px, py, pw, ph);
            this.ctx.strokeStyle = "rgba(56, 189, 248, 0.75)";
            this.ctx.lineWidth = 2;
            const ripOffset = (this.simTimeMs / 35) % 24;
            for (let wy = py + 12; wy < py + ph; wy += 24) {
              this.ctx.beginPath();
              this.ctx.moveTo(px + 4, wy);
              this.ctx.quadraticCurveTo(
                px + pw / 2 + ripOffset - 12,
                wy - 6,
                px + pw - 4,
                wy,
              );
              this.ctx.stroke();
            }
          } else if (kind === "GAS_CLOUD") {
            this.ctx.fillStyle = `rgba(132, 204, 22, ${0.34 * wave})`;
            this.ctx.fillRect(px, py, pw, ph);
            this.ctx.strokeStyle = "rgba(163, 230, 53, 0.8)";
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([10, 6]);
            this.ctx.strokeRect(px, py, pw, ph);
          } else if (kind === "MUD_SLIDE") {
            this.ctx.fillStyle = `rgba(120, 53, 15, ${0.52 * wave})`;
            this.ctx.fillRect(px, py, pw, ph);
            this.ctx.strokeStyle = "rgba(180, 83, 9, 0.85)";
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([12, 8]);
            this.ctx.strokeRect(px, py, pw, ph);
          } else {
            this.ctx.fillStyle = `rgba(56, 189, 248, ${0.26 * wave})`;
            this.ctx.fillRect(px, py, pw, ph);
            this.ctx.strokeStyle = "rgba(125, 211, 252, 0.85)";
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([14, 10]);
            this.ctx.lineDashOffset = -(this.simTimeMs / 18);
            this.ctx.strokeRect(px, py, pw, ph);
          }
          break;
        }
        case "BLOCKED_AREA":
          this.ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
          this.ctx.fillRect(px, py, pw, ph);

          this.ctx.save();
          this.ctx.beginPath();
          this.ctx.rect(px, py, pw, ph);
          this.ctx.clip();
          this.ctx.strokeStyle = "#f59e0b";
          this.ctx.lineWidth = 8;
          for (let i = -pw; i < pw + ph; i += 20) {
            this.ctx.beginPath();
            this.ctx.moveTo(px + i, py);
            this.ctx.lineTo(px + i - ph, py + ph);
            this.ctx.stroke();
          }
          this.ctx.restore();
          break;
        case "SAFE_ZONE": {
          const sPulse = Math.sin(this.simTimeMs / 250) * 0.15 + 0.85;
          this.ctx.fillStyle = "rgba(34, 197, 94, 0.22)";
          this.ctx.fillRect(px, py, pw, ph);

          this.ctx.strokeStyle = `rgba(34, 197, 94, ${0.7 * sPulse})`;
          this.ctx.lineWidth = 2.5;
          this.ctx.strokeRect(px, py, pw, ph);

          // Corner brackets
          const bLen = Math.min(16, Math.min(pw, ph) * 0.25);
          this.ctx.strokeStyle = "#4ade80";
          this.ctx.lineWidth = 3;
          this.ctx.beginPath();
          this.ctx.moveTo(px, py + bLen);
          this.ctx.lineTo(px, py);
          this.ctx.lineTo(px + bLen, py);
          this.ctx.moveTo(px + pw - bLen, py);
          this.ctx.lineTo(px + pw, py);
          this.ctx.lineTo(px + pw, py + bLen);
          this.ctx.moveTo(px, py + ph - bLen);
          this.ctx.lineTo(px, py + ph);
          this.ctx.lineTo(px + bLen, py + ph);
          this.ctx.moveTo(px + pw - bLen, py + ph);
          this.ctx.lineTo(px + pw, py + ph);
          this.ctx.lineTo(px + pw, py + ph - bLen);
          this.ctx.stroke();

          // Target crosshair & concentric beacon
          const cx = px + pw / 2;
          const cy = py + ph / 2;
          const r = Math.min(pw, ph) * 0.25;
          this.ctx.fillStyle = `rgba(34, 197, 94, ${0.35 * sPulse})`;
          this.ctx.beginPath();
          this.ctx.arc(cx, cy, r * sPulse, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.strokeStyle = "#22c55e";
          this.ctx.lineWidth = 1.5;
          this.ctx.beginPath();
          this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
          this.ctx.stroke();
          break;
        }
        case "EXIT": {
          const ePulse = Math.sin(this.simTimeMs / 200) * 0.15 + 0.85;
          this.ctx.fillStyle = "rgba(16, 185, 129, 0.35)";
          this.ctx.fillRect(px, py, pw, ph);

          this.ctx.strokeStyle = `rgba(52, 211, 153, ${0.85 * ePulse})`;
          this.ctx.lineWidth = 2;
          this.ctx.strokeRect(px, py, pw, ph);

          // Animated chevron pointing toward West exit gate
          const cx = px + pw / 2;
          const cy = py + ph / 2;
          const arrowOffset = ((this.simTimeMs / 180) % 8) - 4;
          this.ctx.strokeStyle = "#34d1bd";
          this.ctx.lineWidth = 3;
          this.ctx.lineCap = "round";
          this.ctx.beginPath();
          this.ctx.moveTo(cx + 4 + arrowOffset, cy - 6);
          this.ctx.lineTo(cx - 4 + arrowOffset, cy);
          this.ctx.lineTo(cx + 4 + arrowOffset, cy + 6);
          this.ctx.stroke();
          break;
        }
        case "OBJECTIVE": {
          if (this.collectedObjectives.has(obj.id)) break;
          const oPulse = Math.sin(this.simTimeMs / 180) * 0.16 + 0.84;
          const ox = px + pw / 2;
          const oy = py + ph / 2;
          const kind = obj.properties?.itemKind;
          const r = Math.min(pw, ph) * 0.28;

          if (obj.properties?.pickupOnly) {
            const palette: Record<string, { bg: string; fg: string; tag: string }> = {
              MEDKIT: { bg: "rgba(34, 197, 94, 0.35)", fg: "#22c55e", tag: "+" },
              STAMINA_DRINK: { bg: "rgba(6, 182, 212, 0.35)", fg: "#06b6d4", tag: "E" },
              MASK: { bg: "rgba(20, 184, 166, 0.35)", fg: "#2dd4bf", tag: "M" },
              EXTINGUISHER: { bg: "rgba(249, 115, 22, 0.35)", fg: "#fb923c", tag: "A" },
              KEY: { bg: "rgba(250, 204, 21, 0.35)", fg: "#facc15", tag: "K" },
              FLASHLIGHT: { bg: "rgba(253, 224, 71, 0.35)", fg: "#fde047", tag: "S" },
            };
            const style = palette[kind] || {
              bg: "rgba(59, 130, 246, 0.35)",
              fg: "#60a5fa",
              tag: "•",
            };
            this.ctx.fillStyle = style.bg;
            this.ctx.beginPath();
            this.ctx.arc(ox, oy, r * 1.45 * oPulse, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = style.fg;
            this.ctx.beginPath();
            this.ctx.arc(ox, oy, r * 0.85, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = "#0f172a";
            this.ctx.font = "bold 14px sans-serif";
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            this.ctx.fillText(style.tag, ox, oy + 1);
          } else {
            this.ctx.fillStyle = `rgba(250, 204, 21, ${0.35 * oPulse})`;
            this.ctx.beginPath();
            this.ctx.arc(ox, oy, Math.min(pw, ph) * 0.45 * oPulse, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = "#facc15";
            this.ctx.beginPath();
            this.ctx.arc(ox, oy, Math.min(pw, ph) * 0.24, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = "#fef08a";
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
          }
          break;
        }
      }
      this.ctx.restore();
    }

    for (const rp of this.remotePlayers.values()) {
      if (rp.floorId !== floor.id) continue;

      if (performance.now() - rp.lastUpdate > 5000) continue;

      this.ctx.save();
      this.ctx.translate(rp.x, rp.y);

      let rAngle = 0;
      if (rp.direction === "right") rAngle = Math.PI / 2;
      if (rp.direction === "left") rAngle = -Math.PI / 2;
      if (rp.direction === "down") rAngle = Math.PI;

      this.ctx.save();
      this.ctx.rotate(rAngle);

      if (rp.alive) {
        this.ctx.fillStyle = "#475569"; // different color for remote shoulders
        this.ctx.beginPath();
        this.ctx.ellipse(
          0,
          0,
          PLAYER_RADIUS * 1.4,
          PLAYER_RADIUS * 0.8,
          0,
          0,
          Math.PI * 2,
        );
        this.ctx.fill();
        this.ctx.fillStyle = "#fcd34d";
        this.ctx.beginPath();
        this.ctx.arc(
          0,
          -PLAYER_RADIUS * 0.4,
          PLAYER_RADIUS * 0.7,
          0,
          Math.PI * 2,
        );
        this.ctx.fill();
        this.ctx.strokeStyle = "#000000";
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      } else {
        this.ctx.fillStyle = "#64748b";
        this.ctx.beginPath();
        this.ctx.arc(0, 0, PLAYER_RADIUS, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = "#991b1b";
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(-5, -5);
        this.ctx.lineTo(5, 5);
        this.ctx.moveTo(5, -5);
        this.ctx.lineTo(-5, 5);
        this.ctx.stroke();
      }
      this.ctx.restore(); // restore rotation

      this.ctx.fillStyle = "rgba(0,0,0,0.6)";
      this.ctx.font = "bold 10px sans-serif";
      const nameWidth = this.ctx.measureText(rp.displayName).width;
      this.ctx.fillRect(
        -nameWidth / 2 - 2,
        -PLAYER_RADIUS - 16,
        nameWidth + 4,
        12,
      );
      this.ctx.fillStyle = "#ffffff";
      this.ctx.textAlign = "center";
      this.ctx.fillText(rp.displayName, 0, -PLAYER_RADIUS - 6);

      this.ctx.restore(); // restore translation
    }

    this.ctx.save();
    this.ctx.translate(this.player.x, this.player.y);

    let angle = 0;
    if (this.player.facing === "right") angle = Math.PI / 2;
    if (this.player.facing === "left") angle = -Math.PI / 2;
    if (this.player.facing === "down") angle = Math.PI;
    this.ctx.rotate(angle);

    const bob = this.player.moving ? Math.sin(this.simTimeMs / 50) * 2 : 0;

    if (this.player.alive) {
      this.ctx.fillStyle = this.player.color || "#1e3a8a";
      this.ctx.beginPath();
      this.ctx.ellipse(
        0,
        0 + bob,
        PLAYER_RADIUS * 1.4,
        PLAYER_RADIUS * 0.8,
        0,
        0,
        Math.PI * 2,
      );
      this.ctx.fill();

      this.ctx.fillStyle = "#fcd34d"; // Skin tone
      this.ctx.beginPath();
      this.ctx.arc(
        0,
        -PLAYER_RADIUS * 0.4 + bob,
        PLAYER_RADIUS * 0.7,
        0,
        Math.PI * 2,
      );
      this.ctx.fill();
      this.ctx.strokeStyle = "#000000";
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    } else {
      this.ctx.fillStyle = "#64748b";
      this.ctx.beginPath();
      this.ctx.arc(0, 0, PLAYER_RADIUS, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = "#991b1b";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(-5, -5);
      this.ctx.lineTo(5, 5);
      this.ctx.moveTo(5, -5);
      this.ctx.lineTo(-5, 5);
      this.ctx.stroke();
    }
    this.ctx.restore();

    if (this.player.alive) {
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      this.ctx.fillRect(this.player.x - 16, this.player.y - 25, 32, 6);
      this.ctx.fillStyle = this.player.health < 30 ? "#ef4444" : "#22c55e";
      this.ctx.fillRect(
        this.player.x - 15,
        this.player.y - 24,
        30 * (this.player.health / this.player.maxHealth),
        4,
      );

      if (this.player.displayName) {
        this.ctx.fillStyle = "rgba(0,0,0,0.6)";
        this.ctx.font = "bold 10px sans-serif";
        const nameW = this.ctx.measureText(this.player.displayName).width;
        this.ctx.fillRect(
          this.player.x - nameW / 2 - 2,
          this.player.y - 45,
          nameW + 4,
          14,
        );
        this.ctx.fillStyle = "#ffffff";
        this.ctx.textAlign = "center";
        this.ctx.fillText(
          this.player.displayName,
          this.player.x,
          this.player.y - 34,
        );
      }
    }

    // Draw Lightning warning rings & flashes
    for (const bolt of this.activeLightningStrikes) {
      this.ctx.save();
      if (!bolt.struck) {
        const urgency = 1 - Math.max(0, bolt.remainingWarningSec) / 2.2;
        this.ctx.fillStyle = `rgba(250, 204, 21, ${0.14 + urgency * 0.28})`;
        this.ctx.beginPath();
        this.ctx.arc(bolt.x, bolt.y, bolt.radiusPx, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = `rgba(250, 204, 21, ${0.65 + urgency * 0.35})`;
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([8, 6]);
        this.ctx.stroke();
        this.ctx.strokeStyle = "#f43f5e";
        this.ctx.setLineDash([]);
        this.ctx.beginPath();
        this.ctx.arc(bolt.x, bolt.y, bolt.radiusPx * urgency, 0, Math.PI * 2);
        this.ctx.stroke();
      } else {
        this.ctx.fillStyle = `rgba(254, 240, 138, ${Math.min(0.85, bolt.flashSec * 2)})`;
        this.ctx.beginPath();
        this.ctx.arc(bolt.x, bolt.y, bolt.radiusPx * 1.1, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    }

    // Draw Trapped, Following & Rescued NPCs
    for (const npc of this.npcs) {
      if (npc.floorId !== floor.id || npc.status === "RESCUED") continue;
      this.ctx.save();
      this.ctx.fillStyle =
        npc.status === "FOLLOWING"
          ? "#10b981"
          : npc.role === "Guru"
            ? "#8b5cf6"
            : "#0ea5e9";
      this.ctx.beginPath();
      this.ctx.arc(npc.x, npc.y, PLAYER_RADIUS * 0.9, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = "#ffffff";
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      const tag =
        npc.status === "FOLLOWING" ? `${npc.name} (Ikut)` : `TOLONG! ${npc.name}`;
      this.ctx.font = "bold 10px sans-serif";
      const tw = this.ctx.measureText(tag).width;
      this.ctx.fillStyle =
        npc.status === "FOLLOWING"
          ? "rgba(6, 78, 59, 0.85)"
          : "rgba(180, 83, 9, 0.9)";
      this.ctx.fillRect(npc.x - tw / 2 - 4, npc.y - 30, tw + 8, 15);
      this.ctx.fillStyle = "#ffffff";
      this.ctx.textAlign = "center";
      this.ctx.fillText(tag, npc.x, npc.y - 19);
      this.ctx.restore();
    }

    this.ctx.restore();

    const profile = DIFFICULTY_PROFILES[this.difficulty];
    const baseDarkness =
      Number(this.scenario.config?.ambientDarkness || 0) *
      profile.darknessMultiplier;
    const effectiveDarkness =
      this.inventory.flashlightSec > 0 ? baseDarkness * 0.35 : baseDarkness;
    if ((smokeOverlay || effectiveDarkness > 0) && this.player.alive) {
      const overlayAlpha = smokeOverlay
        ? this.inventory.maskSec > 0
          ? 0.56
          : 0.86
        : Math.min(0.75, effectiveDarkness);
      const flashlightBonus = this.inventory.flashlightSec > 0 ? 1.55 : 1;
      const sightRadiusPx =
        (smokeOverlay ? 155 : 275) * flashlightBonus * scale;
      const screenPlayerX =
        (this.player.x - Math.floor(this.camera.x) + shakeX) * scale;
      const screenPlayerY =
        (this.player.y - Math.floor(this.camera.y) + shakeY) * scale;

      const grad = this.ctx.createRadialGradient(
        screenPlayerX,
        screenPlayerY,
        sightRadiusPx * 0.25,
        screenPlayerX,
        screenPlayerY,
        sightRadiusPx,
      );
      grad.addColorStop(0, "rgba(8, 12, 24, 0)");
      grad.addColorStop(
        0.6,
        `rgba(8, 12, 24, ${(overlayAlpha * 0.55).toFixed(3)})`,
      );
      grad.addColorStop(1, `rgba(8, 12, 24, ${overlayAlpha.toFixed(3)})`);
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, 0, width, height);
    }

    if (this.player.health < this.player.maxHealth && this.player.alive) {
      const damageRatio = 1 - this.player.health / this.player.maxHealth;
      if (damageRatio > 0.5) {
        this.ctx.fillStyle = `rgba(220, 38, 38, ${Math.sin(this.simTimeMs / 200) * 0.15 + 0.15})`;
        this.ctx.fillRect(0, 0, width, height);
      }
    }

    if (this.state === "PAUSED") {
      this.ctx.fillStyle = "rgba(0,0,0,0.5)";
      this.ctx.fillRect(0, 0, width, height);
      this.ctx.fillStyle = "white";
      this.ctx.font = "bold 32px sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.fillText("PAUSED", width / 2, height / 2);
    }
  }

  private rectCircleCollide(
    rx: number,
    ry: number,
    rw: number,
    rh: number,
    cx: number,
    cy: number,
    cr: number,
  ): boolean {
    const testX = cx < rx ? rx : cx > rx + rw ? rx + rw : cx;
    const testY = cy < ry ? ry : cy > ry + rh ? ry + rh : cy;
    const distX = cx - testX;
    const distY = cy - testY;
    const distance = Math.sqrt(distX * distX + distY * distY);
    return distance <= cr;
  }
}
