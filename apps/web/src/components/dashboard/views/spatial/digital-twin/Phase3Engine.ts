import {
  Phase1Map,
  Phase1Scenario,
  Phase1Floor,
  Phase1Tile,
  Phase1ScenarioObject,
} from "./Phase1Types";
import { renderRoomOverlays } from "./Phase1RoomRenderer";
import { AssetRenderer } from "./Phase1AssetRenderer";
import { simulationAudio } from "./simulationAudio";
import {
  getDigitalTwinAssetImage,
  DigitalTwinAssetKey,
} from "./digitalTwinTextures";

export type SimState =
  | "LOADING"
  | "READY"
  | "RUNNING"
  | "PAUSED"
  | "SUCCESS"
  | "FAILED"
  | "EXITED";

export type DifficultyLevel = "mudah" | "sedang" | "sulit";
export type AvatarStyle = "girl" | "boy";

export interface SimulationReport {
  grade: "S" | "A" | "B" | "C" | "D";
  score: number;
  succeeded: boolean;
  timeMs: number;
  healthRemaining: number;
  difficulty: DifficultyLevel;
  trapsTriggered: number;
  totalTraps: number;
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
  sprinting?: boolean;
  interactionPrompt: string | null;
  color?: string;
  displayName?: string;
  avatarStyle?: AvatarStyle;
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
  TILE_SIZE: 48,
  PLAYER_RADIUS: 11,
  WALK_SPEED: 74,
  RUN_SPEED: 112,
  STAMINA_DRAIN_PER_SEC: 36,
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
    walkSpeed: 94,
    runSpeed: 142,
    damageMultiplier: 0.7,
    revealMultiplier: 1.3,
    darknessMultiplier: 0.45,
    scoreMultiplier: 0.85,
  },
  sedang: {
    walkSpeed: 84,
    runSpeed: 126,
    damageMultiplier: 0.95,
    revealMultiplier: 1.1,
    darknessMultiplier: 0.78,
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
  private cameraInitialized = false;

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
  private reportEmitted: boolean = false;

  private patternCache = new Map<string, CanvasPattern>();
  private floorTileIndex = new Map<string, Map<string, Phase1Tile>>();

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
        "Titik spawn tidak ditemukan pada skenario ini.",
      );
    }

    const startFloor =
      map.floors.find((f) => f.id === spawnObj.floor_id) || map.floors[0];
    if (!startFloor) {
      throw new Error("Lantai peta tidak valid.");
    }

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
      objectiveProgress: "Hindari Bahaya → Gerbang Utama (EXIT)",
      facing: "down",
      moving: false,
      sprinting: false,
      interactionPrompt: null,
      avatarStyle: "girl",
      difficulty: this.difficulty,
    };

    for (const floor of map.floors) {
      const lookup = new Map<string, Phase1Tile>();
      for (const tile of floor.tiles) {
        lookup.set(`${tile.x},${tile.y}`, tile);
        if (tile.tile_type === "DOOR" || tile.tile_type === "DOOR_LOCKED") {
          this.doorStates.set(tile.id, "closed");
        }
      }
      this.floorTileIndex.set(floor.id, lookup);
    }

    this.input = new KeyboardInputProvider();
    this.input.bind();
  }

  public updateDoorState(doorId: string, state: "open" | "closed" | "locked") {
    if (this.doorStates.has(doorId)) {
      this.doorStates.set(doorId, state);
    }
  }

  public setPlayerAvatar(
    color: string,
    name: string,
    avatarStyle: AvatarStyle = "girl",
  ) {
    this.player.color = color;
    this.player.displayName = name;
    this.player.avatarStyle = avatarStyle;
  }

  public syncAuthoritativeState(data: any, localUserId: string) {
    this.isAuthoritative = true;

    if (data.sessionStatus === "FINISHED") {
      this.state = "FAILED";
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
          me.objectiveProgress || "Hindari Bahaya → Gerbang Utama (EXIT)";
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
      "Kampus Utama";
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
    this.render();
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

  private getViewportMetrics() {
    const cssW = Math.max(
      1,
      this.canvas.clientWidth || this.canvas.width || 1280,
    );
    const cssH = Math.max(
      1,
      this.canvas.clientHeight || this.canvas.height || 720,
    );
    const dpr = Math.max(1, this.canvas.width / cssW);

    // Keep tiles normal-sized across desktop and mobile (~22 tiles horizontally on desktop)
    const targetTilesWide = cssW < 640 ? 13.5 : 22;
    const scale = Math.min(1.12, cssW / (targetTilesWide * TILE_SIZE));
    return {
      cssW,
      cssH,
      dpr,
      scale,
      visibleWidth: cssW / scale,
      visibleHeight: cssH / scale,
    };
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

  private emitFinalReport(succeeded: boolean) {
    if (this.reportEmitted || !this.callbacks.onReportReady) return;
    this.reportEmitted = true;

    const totalTraps = (this.scenario.objects || []).filter(
      (o) => o.properties?.hidden,
    ).length;
    const trapsTriggered = this.triggeredHazards.size;
    const profile = DIFFICULTY_PROFILES[this.difficulty];

    let baseScore = succeeded ? 55 : 10;
    baseScore += Math.round((this.player.health / this.player.maxHealth) * 22);
    baseScore += Math.round(
      ((totalTraps - trapsTriggered) / Math.max(1, totalTraps)) * 13,
    );
    const timeSec = this.simTimeMs / 1000;
    if (succeeded && timeSec < 140) {
      baseScore += Math.round(((140 - timeSec) / 140) * 10);
    }

    const finalScore = Math.max(
      0,
      Math.min(100, Math.round(baseScore * profile.scoreMultiplier)),
    );

    let grade: SimulationReport["grade"] = "D";
    if (succeeded) {
      if (finalScore >= 88) grade = "S";
      else if (finalScore >= 74) grade = "A";
      else if (finalScore >= 58) grade = "B";
      else grade = "C";
    }

    this.callbacks.onReportReady({
      grade,
      score: finalScore,
      succeeded,
      timeMs: this.simTimeMs,
      healthRemaining: Math.ceil(this.player.health),
      difficulty: this.difficulty,
      trapsTriggered,
      totalTraps,
    });
  }

  private updateDynamicDisasters(dt: number) {
    const profile = DIFFICULTY_PROFILES[this.difficulty];
    const diffBoost =
      this.difficulty === "sulit"
        ? 1.15
        : this.difficulty === "mudah"
          ? 0.65
          : 0.9;

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
        "Gempa susulan! Waspada reruntuhan & kabel listrik.",
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
      const distTiles = 2.4 + (this.simTimeMs % 30) / 15;
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
          const dist = Math.hypot(
            this.player.x - bolt.x,
            this.player.y - bolt.y,
          );
          if (dist <= bolt.radiusPx && !this.isPlayerInSafeZone()) {
            const dmg = Math.round(36 * profile.damageMultiplier);
            this.player.health = Math.max(0, this.player.health - dmg);
            this.slowDebuffTimer = Math.max(this.slowDebuffTimer, 1.2);
            this.callbacks.onMessage(`Tersambar petir! (-${dmg} HP)`);
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

  private update(dt: number) {
    if (!this.player.alive) return;

    if (!this.isAuthoritative) {
      this.simTimeMs += dt * 1000;
      this.updateDynamicDisasters(dt);
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
    this.player.sprinting = canSprint;

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
      this.checkHazards(dt);
      this.checkEscapeExit();
    }
    this.checkStairs();
    this.checkDoors();

    const { visibleWidth, visibleHeight } = this.getViewportMetrics();
    const targetCamX = this.player.x - visibleWidth / 2;
    const targetCamY = this.player.y - visibleHeight / 2;

    if (!this.cameraInitialized) {
      this.camera.x = targetCamX;
      this.camera.y = targetCamY;
      this.cameraInitialized = true;
    } else {
      const smooth = 1 - Math.exp(-10 * dt);
      this.camera.x += (targetCamX - this.camera.x) * smooth;
      this.camera.y += (targetCamY - this.camera.y) * smooth;
    }

    const mapWidthPx = this.map.width * TILE_SIZE;
    const mapHeightPx = this.map.height * TILE_SIZE;
    const padding = TILE_SIZE * 1.5;

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
      this.callbacks.onPlayerUpdate({ ...this.player });
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

    const tileMap = this.floorTileIndex.get(floor.id);
    const minTx = Math.max(0, Math.floor((x - PLAYER_RADIUS) / TILE_SIZE));
    const maxTx = Math.min(
      this.map.width - 1,
      Math.floor((x + PLAYER_RADIUS) / TILE_SIZE),
    );
    const minTy = Math.max(0, Math.floor((y - PLAYER_RADIUS) / TILE_SIZE));
    const maxTy = Math.min(
      this.map.height - 1,
      Math.floor((y + PLAYER_RADIUS) / TILE_SIZE),
    );

    if (tileMap) {
      for (let ty = minTy; ty <= maxTy; ty++) {
        for (let tx = minTx; tx <= maxTx; tx++) {
          const tile = tileMap.get(`${tx},${ty}`);
          if (!tile) continue;
          const isWall =
            tile.tile_type === "WALL" || tile.tile_type === "BORDER";
          const isDoor =
            tile.tile_type === "DOOR" || tile.tile_type === "DOOR_LOCKED";
          const isSolid =
            isWall || (isDoor && this.doorStates.get(tile.id) !== "open");
          if (
            isSolid &&
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
    let highestDps = 0;
    let inSafeZone = false;
    let slowFactor = 1;

    for (const obj of this.scenario.objects || []) {
      if (obj.floor_id !== floor.id) continue;

      const { ox, oy, ow, oh } = this.getExpandedHazardRect(obj);

      if (obj.properties?.hidden) {
        const revealPx =
          Number(
            obj.properties.revealRadius ||
              SIMULATION_PHYSICS.DEFAULT_HIDDEN_REVEAL_TILES,
          ) *
          TILE_SIZE *
          profile.revealMultiplier;
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
          profile.damageMultiplier;
        highestDps = Math.max(highestDps, smokeDps);
        slowFactor = Math.min(
          slowFactor,
          Number(obj.properties?.slowFactor ?? 0.74),
        );
      } else if (
        obj.object_type === "DAMAGE_ZONE" ||
        obj.object_type === "DANGER_ZONE"
      ) {
        const zoneDps =
          Number(
            obj.properties?.damagePerSec ?? SIMULATION_PHYSICS.DEFAULT_ZONE_DPS,
          ) * profile.damageMultiplier;
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
      this.player.interactionPrompt = "Zona Aman — Lanjutkan ke Gerbang Utama";
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
      this.callbacks.onPlayerUpdate({ ...this.player });
    }
  }

  private checkEscapeExit() {
    const floor = this.map.floors.find((f) => f.id === this.player.floorId);
    if (!floor || this.state !== "RUNNING") return;

    for (const obj of this.scenario.objects || []) {
      if (obj.floor_id !== floor.id || obj.object_type !== "EXIT") continue;

      const isReached = this.rectCircleCollide(
        obj.x * TILE_SIZE,
        obj.y * TILE_SIZE,
        obj.width * TILE_SIZE,
        obj.height * TILE_SIZE,
        this.player.x,
        this.player.y,
        PLAYER_RADIUS + 4,
      );

      if (isReached) {
        this.state = "SUCCESS";
        simulationAudio.playSuccess();
        this.callbacks.onStateChange(this.state);
        this.callbacks.onMessage("Evakuasi Berhasil!");
        this.player.objectiveProgress = "Selamat Mencapai Gerbang Utama!";
        this.callbacks.onPlayerUpdate({ ...this.player });
        this.emitFinalReport(true);
        return;
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
            this.player.interactionPrompt = `Tekan E / ACT ke ${targetFloor.name}`;
            if (this.consumeInteract()) {
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

    const tileMap = this.floorTileIndex.get(floor.id);
    if (!tileMap) return;

    const interactRadius = PLAYER_RADIUS * 2.4;
    const minTx = Math.max(
      0,
      Math.floor((this.player.x - interactRadius) / TILE_SIZE),
    );
    const maxTx = Math.min(
      this.map.width - 1,
      Math.floor((this.player.x + interactRadius) / TILE_SIZE),
    );
    const minTy = Math.max(
      0,
      Math.floor((this.player.y - interactRadius) / TILE_SIZE),
    );
    const maxTy = Math.min(
      this.map.height - 1,
      Math.floor((this.player.y + interactRadius) / TILE_SIZE),
    );

    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        const tile = tileMap.get(`${tx},${ty}`);
        if (!tile) continue;
        if (tile.tile_type !== "DOOR" && tile.tile_type !== "DOOR_LOCKED") {
          continue;
        }
        const state = this.doorStates.get(tile.id);
        if (
          this.rectCircleCollide(
            tile.x * TILE_SIZE,
            tile.y * TILE_SIZE,
            TILE_SIZE,
            TILE_SIZE,
            this.player.x,
            this.player.y,
            interactRadius,
          )
        ) {
          if (state === "closed" || state === "locked") {
            this.player.interactionPrompt = "Tekan E / ACT untuk Buka Pintu";
            if (this.consumeInteract()) {
              this.updateDoorState(tile.id, "open");
              if (this.callbacks.onDoorStateChange) {
                this.callbacks.onDoorStateChange(tile.id, "open");
              }
            }
          } else {
            this.player.interactionPrompt = "Tekan E / ACT untuk Tutup Pintu";
            if (this.consumeInteract()) {
              this.updateDoorState(tile.id, "closed");
              if (this.callbacks.onDoorStateChange) {
                this.callbacks.onDoorStateChange(tile.id, "closed");
              }
            }
          }
          return;
        }
      }
    }
  }

  private getTiledPattern(
    key: DigitalTwinAssetKey,
    repeatPx: number,
  ): CanvasPattern | null {
    const cacheKey = `${key}_${repeatPx}`;
    const existing = this.patternCache.get(cacheKey);
    if (existing) return existing;

    const img = getDigitalTwinAssetImage(key);
    if (!img) return null;

    const off = document.createElement("canvas");
    off.width = repeatPx;
    off.height = repeatPx;
    const octx = off.getContext("2d");
    if (!octx) return null;
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = "high";
    octx.drawImage(img, 0, 0, repeatPx, repeatPx);

    const pattern = this.ctx.createPattern(off, "repeat");
    if (pattern) {
      this.patternCache.set(cacheKey, pattern);
    }
    return pattern;
  }

  private drawTileWithTexture(
    tile: Phase1Tile,
    px: number,
    py: number,
    floorPattern: CanvasPattern | null,
    pavingPattern: CanvasPattern | null,
    grassPattern: CanvasPattern | null,
    roadPattern: CanvasPattern | null,
  ) {
    const ctx = this.ctx;
    if (tile.tile_type === "FLOOR" && floorPattern) {
      ctx.fillStyle = floorPattern;
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      return;
    }
    if (tile.tile_type === "PAVING" && pavingPattern) {
      ctx.fillStyle = pavingPattern;
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      return;
    }
    if (tile.tile_type === "GRASS" && grassPattern) {
      ctx.fillStyle = grassPattern;
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      return;
    }
    if (tile.tile_type === "ROAD" && roadPattern) {
      ctx.fillStyle = roadPattern;
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = "rgba(248, 250, 252, 0.35)";
      ctx.fillRect(px + TILE_SIZE * 0.46, py + TILE_SIZE * 0.2, 4, TILE_SIZE * 0.6);
      return;
    }
    if (tile.tile_type === "DOOR" || tile.tile_type === "DOOR_LOCKED") {
      if (floorPattern) {
        ctx.fillStyle = floorPattern;
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      } else {
        ctx.fillStyle = "#f1f5f9";
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      }
      const doorState = this.doorStates.get(tile.id);
      if (doorState === "open") {
        ctx.fillStyle = "rgba(251, 191, 36, 0.28)";
        ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        ctx.fillStyle = "#b45309";
        ctx.fillRect(px + 4, py + 4, TILE_SIZE * 0.16, TILE_SIZE - 8);
      } else {
        const doorTex = AssetRenderer.getTexture(
          "DOOR",
          TILE_SIZE,
          TILE_SIZE,
          0,
          0,
        );
        ctx.drawImage(doorTex, px, py, TILE_SIZE, TILE_SIZE);
      }
      return;
    }

    const tex = AssetRenderer.getTexture(
      tile.tile_type,
      TILE_SIZE,
      TILE_SIZE,
      (tile.x * 13 + tile.y * 7) % 16,
      tile.variant || 0,
    );
    ctx.drawImage(tex, px, py, TILE_SIZE, TILE_SIZE);
  }

  private renderScenarioHazard(obj: Phase1ScenarioObject) {
    const ctx = this.ctx;
    const { ox: px, oy: py, ow: pw, oh: ph } = this.getExpandedHazardRect(obj);

    ctx.save();
    switch (obj.object_type) {
      case "FIRE": {
        const cx = px + pw / 2;
        const cy = py + ph / 2;
        const pulse = Math.sin(this.simTimeMs / 110 + px * 0.04) * 0.12 + 0.88;
        const grad = ctx.createRadialGradient(
          cx,
          cy,
          0,
          cx,
          cy,
          Math.max(pw, ph) * 0.85 * pulse,
        );
        grad.addColorStop(0, "rgba(254, 240, 138, 0.92)");
        grad.addColorStop(0.42, "rgba(249, 115, 22, 0.7)");
        grad.addColorStop(1, "rgba(220, 38, 38, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(px - pw * 0.35, py - ph * 0.35, pw * 1.7, ph * 1.7);

        const fireImg = getDigitalTwinAssetImage("hazardFire");
        if (fireImg) {
          const cols = Math.max(1, Math.round(pw / TILE_SIZE));
          const rows = Math.max(1, Math.round(ph / TILE_SIZE));
          const cellW = pw / cols;
          const cellH = ph / rows;
          for (let ry = 0; ry < rows; ry++) {
            for (let rx = 0; rx < cols; rx++) {
              const cellCx = px + (rx + 0.5) * cellW;
              const cellCy = py + (ry + 0.5) * cellH;
              const rot =
                Math.sin(this.simTimeMs / 320 + rx * 1.7 + ry * 2.3) * 0.22;
              const s = Math.min(cellW, cellH) * (0.98 + pulse * 0.14);
              ctx.save();
              ctx.translate(cellCx, cellCy);
              ctx.rotate(rot);
              ctx.drawImage(fireImg, -s / 2, -s / 2, s, s);
              ctx.restore();
            }
          }
        } else {
          ctx.fillStyle = `rgba(239, 68, 68, ${0.88 * pulse})`;
          ctx.beginPath();
          ctx.arc(cx, cy, Math.min(pw, ph) * 0.42, 0, Math.PI * 2);
          ctx.fill();
        }

        // Floating upward sparks
        for (let i = 0; i < 4; i++) {
          const t = ((this.simTimeMs * 0.0014 + i * 0.25) % 1);
          const sparkX =
            cx + Math.sin(this.simTimeMs * 0.004 + i * 2.1) * pw * 0.32;
          const sparkY = py + ph * (0.75 - t * 0.85);
          ctx.fillStyle = `rgba(253, 224, 71, ${(1 - t) * 0.9})`;
          ctx.beginPath();
          ctx.arc(sparkX, sparkY, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case "SMOKE": {
        ctx.beginPath();
        ctx.rect(px, py, pw, ph);
        ctx.clip();
        const driftX = (this.simTimeMs * 0.018) % TILE_SIZE;
        const driftY = (this.simTimeMs * 0.012) % TILE_SIZE;
        for (let ix = -1; ix <= pw / TILE_SIZE + 1; ix++) {
          for (let iy = -1; iy <= ph / TILE_SIZE + 1; iy++) {
            const sx = px + ix * TILE_SIZE + driftX;
            const sy = py + iy * TILE_SIZE + driftY;
            const r = TILE_SIZE * 0.92;
            const smokeGrad = ctx.createRadialGradient(sx, sy, 2, sx, sy, r);
            smokeGrad.addColorStop(0, "rgba(71, 85, 105, 0.72)");
            smokeGrad.addColorStop(0.65, "rgba(51, 65, 85, 0.45)");
            smokeGrad.addColorStop(1, "rgba(30, 41, 59, 0)");
            ctx.fillStyle = smokeGrad;
            ctx.beginPath();
            ctx.arc(sx, sy, r, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
      }

      case "DAMAGE_ZONE": {
        const kind = obj.properties?.hazardKind;
        if (obj.properties?.hidden) {
          const isRevealed = this.revealedHazards.has(obj.id);
          const isTriggered = this.triggeredHazards.has(obj.id);
          if (!isRevealed && !isTriggered) break;

          const pulse = Math.sin(this.simTimeMs / 120) * 0.2 + 0.75;
          if (isTriggered) {
            ctx.fillStyle =
              kind === "ELECTRICAL"
                ? `rgba(250, 204, 21, ${0.35 * pulse})`
                : kind === "TOXIC_SPILL"
                  ? "rgba(132, 204, 22, 0.42)"
                  : "rgba(220, 38, 38, 0.38)";
            ctx.fillRect(px, py, pw, ph);
            ctx.strokeStyle =
              kind === "ELECTRICAL"
                ? "#fde047"
                : kind === "TOXIC_SPILL"
                  ? "#a3e635"
                  : "#ef4444";
            ctx.lineWidth = 2.5;
            ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
            this.drawHazardDetailGlyphs(px, py, pw, ph, kind);
          } else {
            ctx.fillStyle = `rgba(192, 132, 252, ${0.18 * pulse})`;
            ctx.fillRect(px, py, pw, ph);
            ctx.strokeStyle = `rgba(232, 121, 249, ${0.75 * pulse})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
            ctx.setLineDash([]);
            ctx.fillStyle = `rgba(250, 232, 255, ${pulse})`;
            ctx.font = "bold 15px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("!", px + pw / 2, py + ph / 2);
          }
        } else {
          ctx.fillStyle = "rgba(220, 38, 38, 0.26)";
          ctx.fillRect(px, py, pw, ph);
          ctx.strokeStyle = "rgba(239, 68, 68, 0.88)";
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 6]);
          ctx.lineDashOffset = -(this.simTimeMs / 48) % 14;
          ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
          ctx.setLineDash([]);
          this.drawHazardDetailGlyphs(px, py, pw, ph, kind);
        }
        break;
      }

      case "DANGER_ZONE": {
        const kind = obj.properties?.hazardKind;
        const wave = Math.sin(this.simTimeMs / 240 + px * 0.01) * 0.12 + 0.88;
        if (kind === "FLOOD") {
          ctx.fillStyle = `rgba(14, 165, 233, ${0.42 * wave})`;
          ctx.fillRect(px, py, pw, ph);
          ctx.strokeStyle = "rgba(125, 211, 252, 0.8)";
          ctx.lineWidth = 1.8;
          const rip = (this.simTimeMs / 35) % 24;
          for (let wy = py + 10; wy < py + ph - 4; wy += 20) {
            ctx.beginPath();
            ctx.moveTo(px + 4, wy);
            ctx.quadraticCurveTo(px + pw / 2 + rip - 12, wy - 5, px + pw - 4, wy);
            ctx.stroke();
          }
        } else if (kind === "GAS_CLOUD") {
          ctx.fillStyle = `rgba(132, 204, 22, ${0.34 * wave})`;
          ctx.fillRect(px, py, pw, ph);
          ctx.strokeStyle = "rgba(163, 230, 53, 0.8)";
          ctx.lineWidth = 2;
          ctx.setLineDash([10, 6]);
          ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
        } else if (kind === "MUD_SLIDE") {
          ctx.fillStyle = `rgba(120, 53, 15, ${0.58 * wave})`;
          ctx.fillRect(px, py, pw, ph);
          ctx.strokeStyle = "rgba(217, 119, 6, 0.85)";
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
          const rubbleImg = getDigitalTwinAssetImage("hazardRubble");
          if (rubbleImg) {
            ctx.globalAlpha = 0.45;
            ctx.drawImage(
              rubbleImg,
              px + pw * 0.15,
              py + ph * 0.15,
              pw * 0.7,
              ph * 0.7,
            );
          }
        } else {
          ctx.fillStyle = `rgba(56, 189, 248, ${0.26 * wave})`;
          ctx.fillRect(px, py, pw, ph);
          ctx.strokeStyle = "rgba(125, 211, 252, 0.88)";
          ctx.lineWidth = 2;
          ctx.setLineDash([12, 8]);
          ctx.lineDashOffset = -(this.simTimeMs / 18);
          ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
        }
        break;
      }

      case "BLOCKED_AREA": {
        ctx.fillStyle = "rgba(15, 23, 42, 0.42)";
        ctx.fillRect(px, py, pw, ph);

        const rubbleImg = getDigitalTwinAssetImage("hazardRubble");
        if (rubbleImg) {
          const cols = Math.max(1, Math.round(pw / TILE_SIZE));
          const rows = Math.max(1, Math.round(ph / TILE_SIZE));
          const cw = pw / cols;
          const ch = ph / rows;
          for (let ry = 0; ry < rows; ry++) {
            for (let rx = 0; rx < cols; rx++) {
              ctx.drawImage(
                rubbleImg,
                px + rx * cw + 1,
                py + ry * ch + 1,
                cw - 2,
                ch - 2,
              );
            }
          }
        } else {
          ctx.fillStyle = "#334155";
          ctx.fillRect(px + 3, py + 3, pw - 6, ph - 6);
        }

        ctx.strokeStyle = "rgba(245, 158, 11, 0.85)";
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
        break;
      }

      case "SAFE_ZONE": {
        const sPulse = Math.sin(this.simTimeMs / 250) * 0.15 + 0.85;
        ctx.fillStyle = "rgba(34, 197, 94, 0.22)";
        ctx.fillRect(px, py, pw, ph);
        ctx.strokeStyle = `rgba(34, 197, 94, ${0.72 * sPulse})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(px, py, pw, ph);

        const cx = px + pw / 2;
        const cy = py + ph / 2;
        const r = Math.min(pw, ph) * 0.25;
        ctx.fillStyle = `rgba(34, 197, 94, ${0.35 * sPulse})`;
        ctx.beginPath();
        ctx.arc(cx, cy, r * sPulse, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case "EXIT": {
        const ePulse = Math.sin(this.simTimeMs / 200) * 0.15 + 0.85;
        ctx.fillStyle = `rgba(16, 185, 129, ${0.38 * ePulse})`;
        ctx.fillRect(px, py, pw, ph);
        ctx.strokeStyle = `rgba(52, 211, 153, ${0.92 * ePulse})`;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);

        const cx = px + pw / 2;
        const cy = py + ph / 2;
        const arrowOffset = ((this.simTimeMs / 180) % 8) - 4;
        ctx.strokeStyle = "#5eead4";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(cx + 5, cy + 5 - arrowOffset * 0.5);
        ctx.lineTo(cx, cy - 5 - arrowOffset * 0.5);
        ctx.lineTo(cx - 5, cy + 5 - arrowOffset * 0.5);
        ctx.stroke();

        ctx.fillStyle = "#ecfdf5";
        ctx.font = "bold 10px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("KELUAR", cx, py + ph - 5);
        break;
      }
    }
    ctx.restore();
  }

  private drawHazardDetailGlyphs(
    px: number,
    py: number,
    pw: number,
    ph: number,
    kind?: string,
  ) {
    const ctx = this.ctx;
    const cx = px + pw / 2;
    const cy = py + ph / 2;

    if (kind === "ELECTRICAL") {
      const jitter = Math.sin(this.simTimeMs / 45) * 4;
      ctx.strokeStyle = "#fde047";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy - 10);
      ctx.lineTo(cx + 2 + jitter * 0.4, cy - 1);
      ctx.lineTo(cx - 3 - jitter * 0.3, cy + 1);
      ctx.lineTo(cx + 7, cy + 10);
      ctx.stroke();
    } else if (kind === "TOXIC_SPILL" || kind === "GAS_CLOUD") {
      ctx.fillStyle = "rgba(163, 230, 53, 0.72)";
      const r = 4 + Math.sin(this.simTimeMs / 210) * 1.5;
      ctx.beginPath();
      ctx.arc(cx - 6, cy + 2, r, 0, Math.PI * 2);
      ctx.arc(cx + 6, cy - 4, r * 0.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === "GLASS_SHARDS") {
      ctx.fillStyle = "rgba(186, 230, 253, 0.85)";
      ctx.beginPath();
      ctx.moveTo(cx - 7, cy + 5);
      ctx.lineTo(cx - 1, cy - 8);
      ctx.lineTo(cx + 4, cy + 4);
      ctx.closePath();
      ctx.fill();
    }
  }

  private renderPlayerCharacter() {
    const ctx = this.ctx;
    const px = this.player.x;
    const py = this.player.y;

    ctx.save();
    ctx.translate(px, py);

    // Subtle directional guide chevron toward nearest EXIT on current floor
    const exitObj = (this.scenario.objects || []).find(
      (o) => o.floor_id === this.player.floorId && o.object_type === "EXIT",
    );
    if (exitObj && this.player.alive) {
      const ex = (exitObj.x + (exitObj.width || 1) / 2) * TILE_SIZE;
      const ey = (exitObj.y + (exitObj.height || 1) / 2) * TILE_SIZE;
      const dist = Math.hypot(ex - px, ey - py);
      if (dist > TILE_SIZE * 2) {
        const dirAngle = Math.atan2(ey - py, ex - px);
        ctx.save();
        ctx.rotate(dirAngle);
        ctx.fillStyle = "rgba(52, 211, 153, 0.9)";
        ctx.beginPath();
        ctx.moveTo(PLAYER_RADIUS + 13, 0);
        ctx.lineTo(PLAYER_RADIUS + 6, -4.5);
        ctx.lineTo(PLAYER_RADIUS + 6, 4.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // Contact shadow + accent color ring beneath character
    ctx.fillStyle = "rgba(15, 23, 42, 0.38)";
    ctx.beginPath();
    ctx.ellipse(0, PLAYER_RADIUS * 0.72, PLAYER_RADIUS * 1.15, PLAYER_RADIUS * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = this.player.color || "#3b82f6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, PLAYER_RADIUS * 0.72, PLAYER_RADIUS * 1.28, PLAYER_RADIUS * 0.62, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Cute sprint dust puffs
    if (this.player.alive && this.player.sprinting) {
      const puffAlpha = ((this.simTimeMs / 180) % 1);
      ctx.fillStyle = `rgba(226, 232, 240, ${(1 - puffAlpha) * 0.55})`;
      const backX = this.player.facing === "left" ? 10 : this.player.facing === "right" ? -10 : 0;
      const backY = this.player.facing === "up" ? 10 : this.player.facing === "down" ? -8 : 8;
      ctx.beginPath();
      ctx.arc(backX, backY + puffAlpha * 4, 3.5 + puffAlpha * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    const assetKey: DigitalTwinAssetKey =
      this.player.avatarStyle === "boy" ? "characterBoy" : "characterGirl";
    const sprite = getDigitalTwinAssetImage(assetKey);

    if (this.player.alive) {
      const strideBob = this.player.moving
        ? Math.abs(Math.sin(this.simTimeMs / 65)) * 3.5
        : Math.sin(this.simTimeMs / 320) * 1.0;
      const lean = this.player.moving
        ? Math.sin(this.simTimeMs / 65) * 0.08
        : 0;
      const flipX = this.player.facing === "left" ? -1 : 1;

      ctx.save();
      ctx.translate(0, -PLAYER_RADIUS * 0.45 - strideBob);
      ctx.rotate(lean);
      ctx.scale(flipX, 1);

      if (sprite) {
        const spriteSize = TILE_SIZE * 0.94;
        ctx.drawImage(
          sprite,
          -spriteSize / 2,
          -spriteSize * 0.54,
          spriteSize,
          spriteSize,
        );
      } else {
        ctx.fillStyle = this.player.color || "#3b82f6";
        ctx.beginPath();
        ctx.arc(0, 0, PLAYER_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();

      // Overhead compact HP bar & nameplate
      ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
      ctx.fillRect(-16, -TILE_SIZE * 0.78, 32, 5);
      ctx.fillStyle = this.player.health < 30 ? "#ef4444" : "#22c55e";
      ctx.fillRect(
        -15,
        -TILE_SIZE * 0.78 + 1,
        30 * (this.player.health / this.player.maxHealth),
        3,
      );

      if (this.player.displayName) {
        ctx.font = "700 10px Inter, sans-serif";
        const nameW = ctx.measureText(this.player.displayName).width;
        ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
        ctx.fillRect(-nameW / 2 - 4, -TILE_SIZE * 0.78 - 17, nameW + 8, 14);
        ctx.fillStyle = "#f8fafc";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(this.player.displayName, 0, -TILE_SIZE * 0.78 - 10);
      }
    } else {
      ctx.fillStyle = "#64748b";
      ctx.beginPath();
      ctx.arc(0, 0, PLAYER_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-6, -6);
      ctx.lineTo(6, 6);
      ctx.moveTo(6, -6);
      ctx.lineTo(-6, 6);
      ctx.stroke();
    }

    ctx.restore();
  }

  private render() {
    const ctx = this.ctx;
    const { cssW, cssH, dpr, scale, visibleWidth, visibleHeight } =
      this.getViewportMetrics();

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, cssW, cssH);

    // Rich dark slate backdrop outside campus bounds
    ctx.fillStyle = "#0b1120";
    ctx.fillRect(0, 0, cssW, cssH);

    const shakeAmp = this.cameraShakeTime > 0 ? 5 : 0;
    const shakeX =
      shakeAmp > 0 ? Math.sin(this.simTimeMs * 0.09) * shakeAmp : 0;
    const shakeY =
      shakeAmp > 0 ? Math.cos(this.simTimeMs * 0.11) * shakeAmp : 0;

    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-this.camera.x + shakeX, -this.camera.y + shakeY);

    const floor = this.map.floors.find((f) => f.id === this.player.floorId);
    if (!floor) {
      ctx.restore();
      ctx.restore();
      return;
    }

    const patternRepeat = TILE_SIZE * 2;
    const floorPattern = this.getTiledPattern("floorCampus", patternRepeat);
    const pavingPattern = this.getTiledPattern("pavingCampus", patternRepeat);
    const grassPattern = this.getTiledPattern("grassCampus", patternRepeat);
    const roadPattern = this.getTiledPattern("roadCampus", patternRepeat);

    const startTx = Math.max(0, Math.floor(this.camera.x / TILE_SIZE) - 1);
    const endTx = Math.min(
      this.map.width - 1,
      Math.ceil((this.camera.x + visibleWidth) / TILE_SIZE) + 1,
    );
    const startTy = Math.max(0, Math.floor(this.camera.y / TILE_SIZE) - 1);
    const endTy = Math.min(
      this.map.height - 1,
      Math.ceil((this.camera.y + visibleHeight) / TILE_SIZE) + 1,
    );

    const tileMap = this.floorTileIndex.get(floor.id);
    if (tileMap) {
      for (let ty = startTy; ty <= endTy; ty++) {
        for (let tx = startTx; tx <= endTx; tx++) {
          const tile = tileMap.get(`${tx},${ty}`);
          if (!tile) continue;
          this.drawTileWithTexture(
            tile,
            tx * TILE_SIZE,
            ty * TILE_SIZE,
            floorPattern,
            pavingPattern,
            grassPattern,
            roadPattern,
          );
        }
      }
    }

    for (const stair of this.map.stairs) {
      if (stair.from_floor_id === floor.id) {
        const tex = AssetRenderer.getTexture("STAIR_UP", TILE_SIZE, TILE_SIZE);
        ctx.drawImage(
          tex,
          stair.x * TILE_SIZE,
          stair.y * TILE_SIZE,
          TILE_SIZE,
          TILE_SIZE,
        );
      }
    }

    renderRoomOverlays(ctx, this.map.rooms, TILE_SIZE, {
      showZoneTint: true,
      showLabels: true,
      currentFloorId: floor.id,
    });

    for (const obj of floor.objects) {
      ctx.fillStyle = "rgba(100, 116, 139, 0.8)";
      ctx.fillRect(
        obj.x * TILE_SIZE + 2,
        obj.y * TILE_SIZE + 2,
        obj.width * TILE_SIZE - 4,
        obj.height * TILE_SIZE - 4,
      );
    }

    let smokeOverlay = false;

    for (const obj of this.scenario.objects || []) {
      if (obj.floor_id !== floor.id) continue;
      this.renderScenarioHazard(obj);

      if (obj.object_type === "SMOKE") {
        const { ox, oy, ow, oh } = this.getExpandedHazardRect(obj);
        if (
          this.rectCircleCollide(
            ox,
            oy,
            ow,
            oh,
            this.player.x,
            this.player.y,
            PLAYER_RADIUS,
          )
        ) {
          smokeOverlay = true;
        }
      }
    }

    for (const rp of this.remotePlayers.values()) {
      if (rp.floorId !== floor.id) continue;
      if (performance.now() - rp.lastUpdate > 5000) continue;

      ctx.save();
      ctx.translate(rp.x, rp.y);
      ctx.fillStyle = rp.alive ? "#38bdf8" : "#64748b";
      ctx.beginPath();
      ctx.arc(0, 0, PLAYER_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = "700 10px Inter, sans-serif";
      const nw = ctx.measureText(rp.displayName).width;
      ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
      ctx.fillRect(-nw / 2 - 3, -PLAYER_RADIUS - 18, nw + 6, 14);
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(rp.displayName, 0, -PLAYER_RADIUS - 8);
      ctx.restore();
    }

    this.renderPlayerCharacter();

    for (const bolt of this.activeLightningStrikes) {
      ctx.save();
      if (!bolt.struck) {
        const urgency = 1 - Math.max(0, bolt.remainingWarningSec) / 2.2;
        ctx.fillStyle = `rgba(250, 204, 21, ${0.14 + urgency * 0.28})`;
        ctx.beginPath();
        ctx.arc(bolt.x, bolt.y, bolt.radiusPx, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(250, 204, 21, ${0.65 + urgency * 0.35})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.stroke();
        ctx.strokeStyle = "#f43f5e";
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(bolt.x, bolt.y, bolt.radiusPx * urgency, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = `rgba(254, 240, 138, ${Math.min(0.85, bolt.flashSec * 2)})`;
        ctx.beginPath();
        ctx.arc(bolt.x, bolt.y, bolt.radiusPx * 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore();

    const profile = DIFFICULTY_PROFILES[this.difficulty];
    const baseDarkness =
      Number(this.scenario.config?.ambientDarkness || 0) *
      profile.darknessMultiplier;

    if ((smokeOverlay || baseDarkness > 0) && this.player.alive) {
      const overlayAlpha = smokeOverlay
        ? 0.8
        : Math.min(0.72, baseDarkness);
      const sightRadiusPx = (smokeOverlay ? 155 : 275) * scale;
      const screenPlayerX = (this.player.x - this.camera.x + shakeX) * scale;
      const screenPlayerY = (this.player.y - this.camera.y + shakeY) * scale;

      const grad = ctx.createRadialGradient(
        screenPlayerX,
        screenPlayerY,
        sightRadiusPx * 0.28,
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
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cssW, cssH);
    }

    if (this.player.health < this.player.maxHealth && this.player.alive) {
      const damageRatio = 1 - this.player.health / this.player.maxHealth;
      if (damageRatio > 0.5) {
        ctx.fillStyle = `rgba(220, 38, 38, ${Math.sin(this.simTimeMs / 200) * 0.14 + 0.14})`;
        ctx.fillRect(0, 0, cssW, cssH);
      }
    }

    if (this.state === "PAUSED") {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, cssW, cssH);
      ctx.fillStyle = "white";
      ctx.font = "bold 30px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("JEDA", cssW / 2, cssH / 2);
    }

    ctx.restore();
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
    return distX * distX + distY * distY <= cr * cr;
  }
}
