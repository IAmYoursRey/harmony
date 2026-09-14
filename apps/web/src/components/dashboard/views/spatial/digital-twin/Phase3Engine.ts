import {
  Phase1Map,
  Phase1Scenario,
  Phase1Floor,
  Phase1Tile,
  Phase1Object,
  Phase1ScenarioObject,
  Phase1Stairs,
} from "./Phase1Types";

export type SimState =
  "LOADING" | "READY" | "RUNNING" | "PAUSED" | "SUCCESS" | "FAILED" | "EXITED";

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

const TILE_SIZE = 40;
const PLAYER_RADIUS = 12;

export class Phase3Engine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private map: Phase1Map;
  private scenario: Phase1Scenario;
  private callbacks: EngineCallbacks;

  private state: SimState = "READY";
  private player: PlayerState;
  private input: InputProvider;

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

  private lastDamageTime: number = 0;

  public doorStates: Map<string, "closed" | "open" | "locked"> = new Map();

  constructor(
    canvas: HTMLCanvasElement,
    map: Phase1Map,
    scenario: Phase1Scenario,
    callbacks: EngineCallbacks,
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.map = map;
    this.scenario = scenario;
    this.callbacks = callbacks;

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

    this.player = {
      x: spawnObj.x * TILE_SIZE + TILE_SIZE / 2,
      y: spawnObj.y * TILE_SIZE + TILE_SIZE / 2,
      floorId: startFloor.id,
      health: 100,
      maxHealth: 100,
      stamina: 100,
      maxStamina: 100,
      speed: 150, // px per second base walking speed
      alive: true,
      objectiveProgress: "Evacuate to Exit",
      facing: "down",
      moving: false,
      interactionPrompt: null,
    };

    for (const floor of map.floors) {
      for (const tile of floor.tiles) {
        if (tile.tile_type === "DOOR") {
          this.doorStates.set(tile.id, "closed");
        } else if (tile.tile_type === "DOOR_LOCKED") {
          this.doorStates.set(tile.id, "locked");
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

    const dt = (time - this.lastTime) / 1000; // in seconds
    this.lastTime = time;

    this.update(dt);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    if (!this.player.alive) return;

    if (!this.isAuthoritative) {
      this.simTimeMs += dt * 1000;
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

    const isRunning =
      this.input.isActionDown("run") || this.virtualButtons["run"];
    let currentSpeed = 150; // base walking speed

    if (isRunning && this.player.moving && this.player.stamina > 0) {
      currentSpeed = 300; // run speed
      this.player.stamina -= 30 * dt; // Consume 30 stamina per second
      if (this.player.stamina < 0) this.player.stamina = 0;
    } else {
      if (this.player.stamina < this.player.maxStamina) {
        this.player.stamina += 15 * dt; // Recover 15 stamina per second
        if (this.player.stamina > this.player.maxStamina)
          this.player.stamina = this.player.maxStamina;
      }
    }

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
      this.checkObjectives();
    }
    this.checkStairs();
    this.checkDoors();

    let scale = 1;
    const targetWidth = 15 * TILE_SIZE; // 600px virtual width min
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

    let takingDamage = false;
    let inSafeZone = false;

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

      if (isIntersecting) {
        if (obj.object_type === "FIRE" || obj.object_type === "DAMAGE_ZONE") {
          takingDamage = true;
        }
        if (obj.object_type === "SAFE_ZONE") {
          inSafeZone = true;
        }
      }
    }

    if (inSafeZone) {
      if (!this.player.interactionPrompt) {
        this.player.interactionPrompt = "Safe Zone";
      }
    }

    if (takingDamage && !inSafeZone) {
      this.player.health -= 10 * dt;
      if (this.player.health <= 0) {
        this.player.health = 0;
        this.player.alive = false;
        this.state = "FAILED";
        this.callbacks.onStateChange(this.state);
        this.callbacks.onMessage("You succumbed to the hazards.");
      }
      this.callbacks.onPlayerUpdate({ ...this.player });
    } else if (this.player.health < this.player.maxHealth && !takingDamage) {
    }
  }

  private collectedObjectives: Set<string> = new Set();

  private checkObjectives() {
    const floor = this.map.floors.find((f) => f.id === this.player.floorId);
    if (!floor) return;

    let totalObjectives = 0;

    for (const obj of this.scenario.objects || []) {
      if (obj.object_type === "OBJECTIVE") {
        totalObjectives++;
      }
    }

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

      if (isIntersecting) {
        if (obj.object_type === "OBJECTIVE") {
          if (!this.collectedObjectives.has(obj.id)) {
            this.collectedObjectives.add(obj.id);
            this.callbacks.onMessage(
              `Objective Collected! (${this.collectedObjectives.size}/${totalObjectives})`,
            );
            this.player.objectiveProgress = `Objectives: ${this.collectedObjectives.size}/${totalObjectives}`;
            this.callbacks.onPlayerUpdate({ ...this.player });
          }
        }

        if (obj.object_type === "EXIT") {
          if (this.collectedObjectives.size >= totalObjectives) {
            this.player.interactionPrompt = "Press E to Evacuate";
            if (this.input.isActionDown("interact")) {
              (this.input as any).keys["e"] = false; // consume
              this.state = "SUCCESS";
              this.callbacks.onStateChange(this.state);
              this.callbacks.onMessage("Evacuation Successful!");
              this.player.objectiveProgress = "Reached Exit!";
              this.callbacks.onPlayerUpdate({ ...this.player });
            }
          } else {
            this.player.interactionPrompt = `Objectives Missing (${this.collectedObjectives.size}/${totalObjectives})`;
          }
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
            this.player.interactionPrompt = `Press ACT/E to enter ${targetFloor.name}`;

            if (
              this.input.isActionDown("interact") ||
              this.virtualButtons["interact"]
            ) {
              (this.input as any).keys["e"] = false; // consume input
              this.virtualButtons["interact"] = false;
              this.player.floorId = targetFloor.id;
              this.callbacks.onFloorChange(targetFloor.name);
              this.callbacks.onPlayerUpdate({ ...this.player });
              this.callbacks.onMessage(`Moved to ${targetFloor.name}`);
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
          if (tile.tile_type === "DOOR_LOCKED" && state === "locked") {
            this.player.interactionPrompt = "Door is Locked";
          } else if (state === "closed") {
            this.player.interactionPrompt = "Press ACT/E to Open Door";
            if (
              this.input.isActionDown("interact") ||
              this.virtualButtons["interact"]
            ) {
              (this.input as any).keys["e"] = false;
              this.virtualButtons["interact"] = false;
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
    const targetWidth = 15 * TILE_SIZE;
    if (this.canvas.width < targetWidth) {
      scale = this.canvas.width / targetWidth;
    }
    this.ctx.scale(scale, scale);
    this.ctx.translate(-Math.floor(this.camera.x), -Math.floor(this.camera.y));

    const floor = this.map.floors.find((f) => f.id === this.player.floorId);
    if (!floor) {
      this.ctx.restore();
      return;
    }

    for (const tile of floor.tiles) {
      if (tile.tile_type === "WALL" || tile.tile_type === "BORDER") {
        this.ctx.fillStyle = "#475569"; // Slate wall
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
      } else if (tile.tile_type === "FLOOR" || tile.tile_type === "PAVING") {
        this.ctx.fillStyle =
          tile.tile_type === "PAVING" ? "#94a3b8" : "#e2e8f0";
      } else {
        this.ctx.fillStyle = "#cbd5e1";
      }

      this.ctx.fillRect(
        tile.x * TILE_SIZE,
        tile.y * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE,
      );

      this.ctx.strokeStyle = "rgba(0,0,0,0.1)";
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

      const px = obj.x * TILE_SIZE;
      const py = obj.y * TILE_SIZE;
      const pw = obj.width * TILE_SIZE;
      const ph = obj.height * TILE_SIZE;

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
          this.ctx.fillStyle = "rgba(220, 38, 38, 0.2)";
          this.ctx.fillRect(px, py, pw, ph);
          this.ctx.strokeStyle = "rgba(220, 38, 38, 0.8)";
          this.ctx.lineWidth = 2;
          this.ctx.setLineDash([8, 8]);

          this.ctx.lineDashOffset = -(this.simTimeMs / 50) % 16;
          this.ctx.strokeRect(px, py, pw, ph);
          break;
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
        case "SAFE_ZONE":
          this.ctx.fillStyle = "rgba(34, 197, 94, 0.3)";
          this.ctx.fillRect(px, py, pw, ph);
          this.ctx.strokeStyle = "#22c55e";
          this.ctx.strokeRect(px, py, pw, ph);
          break;
        case "EXIT":
          this.ctx.fillStyle = "#0ea5e9";
          this.ctx.fillRect(px, py, pw, ph);
          this.ctx.fillStyle = "white";
          this.ctx.font = "bold 12px sans-serif";
          this.ctx.fillText("EXIT", px + 4, py + ph / 2 + 4);
          break;
        case "OBJECTIVE":
          this.ctx.fillStyle = "rgba(234, 179, 8, 0.5)";
          this.ctx.beginPath();
          this.ctx.arc(
            px + pw / 2,
            py + ph / 2,
            Math.min(pw, ph) / 2,
            0,
            Math.PI * 2,
          );
          this.ctx.fill();
          break;
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

    this.ctx.restore();

    if (smokeOverlay && this.player.alive) {
      this.ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      this.ctx.fillRect(0, 0, width, height);

      this.ctx.globalCompositeOperation = "destination-out";
      const grad = this.ctx.createRadialGradient(
        this.player.x - this.camera.x,
        this.player.y - this.camera.y,
        10,
        this.player.x - this.camera.x,
        this.player.y - this.camera.y,
        80,
      );
      grad.addColorStop(0, "rgba(255, 255, 255, 1)");
      grad.addColorStop(1, "rgba(255, 255, 255, 0)");
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(
        this.player.x - this.camera.x,
        this.player.y - this.camera.y,
        80,
        0,
        Math.PI * 2,
      );
      this.ctx.fill();
      this.ctx.globalCompositeOperation = "source-over";
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
