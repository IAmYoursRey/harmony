export type ToolMode = "select" | "waypoint" | "exit" | "path" | "delete";

export interface GraphNode {
  id: string;
  x: number;
  y: number;
  type: "waypoint" | "exit" | "safe-zone";
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
}

export type DisasterType =
  "earthquake" | "flood" | "fire" | "storm" | "tsunami" | "landslide";

export interface Hazard {
  id: string;
  type: DisasterType;
  x: number;
  y: number;
  radius: number;
  severity: "low" | "medium" | "high";
  active: boolean;
}

export type SimulationState =
  "idle" | "starting" | "active" | "rerouting" | "completed" | "stopped";

export type MapPosition =
  | { type: "local"; x: number; y: number }
  | { type: "geo"; latitude: number; longitude: number };

export type CellType =
  | "EMPTY" // walkable, default
  | "WALL" // non-walkable, blocking
  | "ROOM" // walkable room interior
  | "CORRIDOR" // walkable corridor
  | "DOOR" // walkable when open, blocking when closed
  | "SAFE_POINT" // evacuation target
  | "SPAWN" // player starting cell
  | "HAZARD" // dangerous zone (deals damage)
  | "OBJECT"; // generic obstacle

export interface MapCell {
  x: number;
  y: number;
  type: CellType;
  walkable: boolean;
  roomId?: string; // reference to Room
  hazardId?: string; // reference to SimulationHazardConfig
  doorId?: string; // reference to Door
  safePointId?: string; // reference to SafePoint
  metadata?: Record<string, unknown>;
}

export interface MapRoom {
  id: string;
  name: string;
  type: "classroom" | "lab" | "corridor" | "hall" | "stairway" | "other";
  cellIds: string[]; // "x,y" string keys
  color?: string;
}

export interface MapDoor {
  id: string;
  x: number;
  y: number;
  state: "open" | "closed" | "locked";
  breakable: boolean;
  roomId?: string;
}

export interface SafePoint {
  id: string;
  name: string;
  x: number;
  y: number;
  capacity: number;
  enabled: boolean;
  priority: number;
}

export interface SpawnPoint {
  id: string;
  name: string;
  x: number;
  y: number;
  roomId?: string;
}

export interface GridMap {
  id: string;
  schoolId: string;
  name: string;
  description: string;
  gridWidth: number; // columns
  gridHeight: number; // rows
  cellScale: number; // e.g., 1
  cellScaleUnit: "meter" | "feet"; // e.g., 'meter'

  cells: Record<string, MapCell>; // key: "x,y"
  rooms: MapRoom[];
  doors: MapDoor[];
  safePoints: SafePoint[];
  spawnPoints: SpawnPoint[];
  referenceImageId?: string; // reference to existing mapImage if teacher wants overlay
  isPublic?: boolean;
  authorName?: string;
  schoolName?: string;
  createdBy: string; // userId
  createdAt: string;
  updatedAt: string;
}

export interface SimulationHazardConfig {
  id: string;
  type: DisasterType;
  label: string;
  x: number;
  y: number;
  radius: number; // in cells
  damagePerSecond: number; // HP damage per second while inside
  lethal: boolean; // instant kill instead of damage
  startTime: number; // seconds after sim start when this activates (0 = immediate)
  duration: number; // seconds active (-1 = until sim ends)
  movementEffect: "none" | "slow" | "stun";
}

export interface SimulationEvent {
  id: string;
  trigger: "TIME" | "ENTER_ZONE" | "ON_START";
  time?: number; // seconds (for TIME trigger)
  zoneCells?: string[]; // "x,y" keys (for ENTER_ZONE trigger)
  action:
    | "BLOCK_CELLS"
    | "UNBLOCK_CELLS"
    | "ACTIVATE_HAZARD"
    | "DEACTIVATE_HAZARD"
    | "CLOSE_DOOR"
    | "OPEN_DOOR";
  targetIds: string[]; // cell keys, hazard ids, or door ids
  description: string;
}

export interface ScenarioObstacle {
  id: string;
  type: string; // e.g., 'fire', 'rubble', 'water', 'debris'
  x: number;
  y: number;
  width: number; // in cells
  height: number; // in cells
  blocking: boolean;
  damage?: number; // optional HP damage per second
}

export interface DisasterSimulation {
  id: string;
  schoolId: string;
  mapId: string;
  disasterType: DisasterType;
  name: string;
  description: string;
  durationSeconds: number;
  spawnPointId: string;
  safePointIds: string[]; // player can reach any of these

  walkableCells?: string[]; // "x,y" explicit safe routes
  blockedCells?: string[]; // "x,y" blocked paths
  obstacles?: ScenarioObstacle[];
  scenarioSpawn?: { x: number; y: number };
  scenarioExits?: { x: number; y: number }[];

  hazards: SimulationHazardConfig[];
  events: SimulationEvent[];
  winCondition: "REACH_SAFE_POINT";
  loseConditions: ("HP_ZERO" | "TIMER_ZERO" | "LETHAL_HAZARD")[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type RoomStatus = "WAITING" | "RUNNING" | "FINISHED" | "CANCELLED";

export interface GameRoom {
  id: string;
  schoolId: string;
  name: string;
  mapId: string;
  simulationId: string;
  targetGrade: string; // e.g., 'X'
  targetClass: string; // e.g., 'IPA 1'
  createdBy: string; // teacher userId
  status: RoomStatus;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  joinedStudents: string[]; // userIds
  activePlayers?: Record<
    string,
    {
      id: string;
      name: string;
      x: number;
      y: number;
      hp: number;
      status: string;
      lastSeen: number;
    }
  >;
}

export interface PlayerState {
  userId: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  status: "alive" | "dead" | "evacuated";
  damageHistory: { time: number; amount: number; source: string }[];
  distanceTravelled: number;
}

export interface ActiveHazard extends SimulationHazardConfig {
  active: boolean;
}

export interface GameState {
  roomId: string;
  simulationId: string;
  map: GridMap;
  simulation: DisasterSimulation;
  player: PlayerState;
  blockedCells: Set<string>; // "x,y" keys dynamically blocked by events
  activeHazards: ActiveHazard[];
  elapsedSeconds: number;
  timerRemaining: number;
  phase: "lobby" | "spawned" | "running" | "won" | "lost";
}

export interface SimulationResult {
  id: string;
  roomId: string;
  simulationId: string;
  mapId: string;
  schoolId: string;
  userId: string;
  outcome: "success" | "failed";
  completionTimeSeconds?: number;
  hpRemaining?: number;
  damageTaken: number;
  distanceTravelled: number;
  hazardsEncountered: string[];
  submittedAt: string;
}
