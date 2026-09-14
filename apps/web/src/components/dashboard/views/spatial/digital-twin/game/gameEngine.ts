import type {
  GridMap,
  DisasterSimulation,
  PlayerState,
  ActiveHazard,
  GameState,
} from "../types";

export function buildInitialGameState(
  roomId: string,
  userId: string,
  map: GridMap,
  simulation: DisasterSimulation,
): GameState {
  let spawnX = Math.floor(map.gridWidth / 2);
  let spawnY = Math.floor(map.gridHeight / 2);

  if (simulation.scenarioSpawn) {
    spawnX = simulation.scenarioSpawn.x;
    spawnY = simulation.scenarioSpawn.y;
  } else {
    const spawn = simulation.spawnPointId
      ? map.spawnPoints.find((sp) => sp.id === simulation.spawnPointId)
      : map.spawnPoints[0];
    if (spawn) {
      spawnX = spawn.x;
      spawnY = spawn.y;
    }
  }

  const player: PlayerState = {
    userId,
    x: spawnX,
    y: spawnY,
    hp: 100,
    maxHp: 100,
    status: "alive",
    damageHistory: [],
    distanceTravelled: 0,
  };

  const activeHazards: ActiveHazard[] = (simulation.hazards || [])
    .filter(Boolean)
    .map((h) => ({
      ...h,
      startTime: h.startTime ?? 0,
      duration: h.duration ?? -1,
      active: (h.startTime ?? 0) === 0,
    }));

  const initialBlocked = new Set<string>();
  if (simulation.blockedCells) {
    simulation.blockedCells.forEach((c) => initialBlocked.add(c));
  }
  if (simulation.obstacles) {
    simulation.obstacles
      .filter((o) => o.blocking)
      .forEach((o) => {
        for (let w = 0; w < o.width; w++) {
          for (let h = 0; h < o.height; h++) {
            initialBlocked.add(`${o.x + w},${o.y + h}`);
          }
        }
      });
  }

  return {
    roomId,
    simulationId: simulation.id,
    map,
    simulation,
    player,
    blockedCells: initialBlocked,
    activeHazards,
    elapsedSeconds: 0,
    timerRemaining: simulation.durationSeconds,
    phase: "spawned",
  };
}

export function tickGame(state: GameState, deltaSeconds: number): GameState {
  if (state.phase !== "running") return state;

  const elapsed = state.elapsedSeconds + deltaSeconds;
  const timerRemaining = Math.max(0, state.timerRemaining - deltaSeconds);

  const activeHazards: ActiveHazard[] = state.activeHazards
    .filter(Boolean)
    .map((h) => {
      const startTime = h.startTime ?? 0;
      const duration = h.duration ?? -1;
      if (!h.active && startTime > 0 && elapsed >= startTime) {
        return { ...h, startTime, duration, active: true };
      }

      if (h.active && duration > 0 && elapsed >= startTime + duration) {
        return { ...h, startTime, duration, active: false };
      }
      return h;
    });

  const blockedCells = new Set(state.blockedCells);
  state.simulation.events.forEach((event) => {
    if (event.trigger === "TIME" && event.time !== undefined) {
      if (Math.abs(elapsed - event.time) < deltaSeconds) {
        if (event.action === "BLOCK_CELLS")
          event.targetIds.forEach((k) => blockedCells.add(k));
        if (event.action === "UNBLOCK_CELLS")
          event.targetIds.forEach((k) => blockedCells.delete(k));
      }
    }
  });

  let hp = state.player.hp;
  const playerKey = `${state.player.x},${state.player.y}`;
  const hazardsEncountered: string[] = [];

  activeHazards.forEach((h) => {
    if (!h.active) return;

    const dx = Math.abs(state.player.x - h.x);
    const dy = Math.abs(state.player.y - h.y);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= h.radius) {
      hazardsEncountered.push(h.id);
      if (h.lethal) {
        hp = 0;
      } else {
        hp = Math.max(0, hp - h.damagePerSecond * deltaSeconds);
      }
    }
  });

  const player: PlayerState = {
    ...state.player,
    hp,
    status: hp <= 0 ? "dead" : state.player.status,
  };

  const safePointCells = new Set<string>();
  if (
    state.simulation.scenarioExits &&
    state.simulation.scenarioExits.length > 0
  ) {
    state.simulation.scenarioExits.forEach((e) =>
      safePointCells.add(`${e.x},${e.y}`),
    );
  } else {
    state.map.safePoints
      .filter((sp) => state.simulation.safePointIds.includes(sp.id))
      .forEach((sp) => safePointCells.add(`${sp.x},${sp.y}`));
  }
  const playerAtSafe = safePointCells.has(playerKey);

  let phase: GameState["phase"] = state.phase;
  if (playerAtSafe) phase = "won";
  else if (player.status === "dead") phase = "lost";
  else if (timerRemaining <= 0) phase = "lost";

  return {
    ...state,
    elapsedSeconds: elapsed,
    timerRemaining,
    activeHazards,
    blockedCells,
    player,
    phase,
  };
}

const DIRECTION_DELTAS: Record<string, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export function movePlayer(
  state: GameState,
  direction: "up" | "down" | "left" | "right",
): GameState {
  if (state.phase !== "running") return state;
  if (state.player.status !== "alive") return state;

  const { dx, dy } = DIRECTION_DELTAS[direction];
  const nx = state.player.x + dx;
  const ny = state.player.y + dy;

  if (
    nx < 0 ||
    ny < 0 ||
    nx >= state.map.gridWidth ||
    ny >= state.map.gridHeight
  )
    return state;

  const nextKey = `${nx},${ny}`;
  if (state.blockedCells.has(nextKey)) return state;

  const cell = state.map.cells[nextKey];
  if (cell && !cell.walkable && cell.type !== "DOOR") return state;
  if (cell?.type === "WALL") return state;

  const distance = state.player.distanceTravelled + 1;

  return {
    ...state,
    player: { ...state.player, x: nx, y: ny, distanceTravelled: distance },
  };
}

export function getHazardCells(
  hazards: ActiveHazard[],
  map: GridMap,
): Set<string> {
  const result = new Set<string>();
  hazards
    .filter((h) => h.active)
    .forEach((h) => {
      for (
        let x = Math.max(0, h.x - h.radius);
        x <= Math.min(map.gridWidth - 1, h.x + h.radius);
        x++
      ) {
        for (
          let y = Math.max(0, h.y - h.radius);
          y <= Math.min(map.gridHeight - 1, h.y + h.radius);
          y++
        ) {
          const dist = Math.sqrt((x - h.x) ** 2 + (y - h.y) ** 2);
          if (dist <= h.radius) result.add(`${x},${y}`);
        }
      }
    });
  return result;
}
