export type MapStatus = "draft" | "published" | "archived";

export interface Phase1Map {
  id: string;
  school_id: string;
  name: string;
  description: string;
  width: number;
  height: number;
  active_floor_id?: string;
  status: MapStatus;
  version: number;
  created_at: string;
  updated_at: string;

  floors: Phase1Floor[];
  boundaries: Phase1Boundary[];
  stairs: Phase1Stairs[];
  scenarios: Phase1Scenario[];
  rooms: Phase1Room[];
  border?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
}

export interface Phase1Floor {
  id: string;
  map_id: string;
  floor_number: number;
  name: string;
  width?: number;
  height?: number;
  tiles: Phase1Tile[];
  objects: Phase1Object[];
}

export interface Phase1Room {
  id: string;
  map_id: string;
  floor_id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  capacity?: number;
  metadata?: Record<string, any>;
}

export interface Phase1Tile {
  id: string;
  floor_id: string;
  x: number;
  y: number;
  tile_type: string;
  variant: number;
  rotation: number;
  metadata?: Record<string, any>;
}

export interface Phase1Object {
  id: string;
  floor_id: string;
  object_type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  properties?: Record<string, any>;
}

export interface Phase1Boundary {
  id: string;
  map_id: string;
  floor_id: string;
  geometry: {
    points: { x: number; y: number }[];
  };
  closed: boolean;
}

export interface Phase1Stairs {
  id: string;
  map_id: string;
  from_floor_id: string;
  to_floor_id?: string;
  x: number;
  y: number;
  direction: "N" | "S" | "E" | "W";
  type: "UP" | "DOWN" | "UP_DOWN";
}

export interface Phase1Scenario {
  id: string;
  map_id: string;
  name: string;
  disaster_type: string;
  status: MapStatus;
  version: number;
  config: Record<string, any>;
  objects?: Phase1ScenarioObject[];
}

export interface Phase1ScenarioObject {
  id: string;
  scenario_id: string;
  floor_id: string;
  object_type:
    | "FIRE"
    | "SMOKE"
    | "DANGER_ZONE"
    | "DAMAGE_ZONE"
    | "BLOCKED_AREA"
    | "SAFE_ZONE"
    | "EXIT"
    | "OBJECTIVE"
    | "SPAWN";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  properties?: Record<string, any>;
}
