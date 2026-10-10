export type TileCategory =
  | "FLOOR"
  | "WALL"
  | "OPENING"
  | "STAIRS"
  | "ROOM"
  | "BOUNDARY"
  | "OBJECTS"
  | "DECORATION"
  | "SPECIAL";

export interface TileDefinition {
  id: string;
  category: TileCategory;
  name: string;
  visualType: string;
  variants: number;
  defaultWidth: number;
  defaultHeight: number;
  walkable: boolean;
  color: string;
  icon?: string;
  metadata?: Record<string, any>;
}

export const TILE_DEFINITIONS: Record<string, TileDefinition> = {
  WALL: {
    id: "WALL",
    category: "WALL",
    name: "Wall",
    visualType: "wall",
    variants: 1,
    defaultWidth: 1,
    defaultHeight: 1,
    walkable: false,
    color: "#f97316",
    icon: "🧱",
  },
  DOOR: {
    id: "DOOR",
    category: "OPENING",
    name: "Door",
    visualType: "door",
    variants: 1,
    defaultWidth: 1,
    defaultHeight: 1,
    walkable: true,
    color: "#d97706",
    icon: "🚪",
  },
  FLOOR: {
    id: "FLOOR",
    category: "FLOOR",
    name: "Floor",
    visualType: "floor",
    variants: 1,
    defaultWidth: 1,
    defaultHeight: 1,
    walkable: true,
    color: "#ffffff",
    icon: "⬜",
  },
  PAVING: {
    id: "PAVING",
    category: "FLOOR",
    name: "Paving",
    visualType: "floor",
    variants: 1,
    defaultWidth: 1,
    defaultHeight: 1,
    walkable: true,
    color: "#4b5563",
    icon: "⬛",
  },
  STAIR_UP: {
    id: "STAIR_UP",
    category: "STAIRS",
    name: "Stair Up",
    visualType: "stair_up",
    variants: 1,
    defaultWidth: 1,
    defaultHeight: 1,
    walkable: true,
    color: "#3b82f6",
    icon: "↗️",
  },
  STAIR_DOWN: {
    id: "STAIR_DOWN",
    category: "STAIRS",
    name: "Stair Down",
    visualType: "stair_down",
    variants: 1,
    defaultWidth: 1,
    defaultHeight: 1,
    walkable: true,
    color: "#3b82f6",
    icon: "↘️",
  },
  BORDER: {
    id: "BORDER",
    category: "WALL",
    name: "Border",
    visualType: "border",
    variants: 1,
    defaultWidth: 1,
    defaultHeight: 1,
    walkable: false,
    color: "#ef4444",
    icon: "🚧",
  },
  DOOR_LOCKED: {
    id: "DOOR_LOCKED",
    category: "OPENING",
    name: "Locked Door",
    visualType: "door_locked",
    variants: 1,
    defaultWidth: 1,
    defaultHeight: 1,
    walkable: false,
    color: "#5c3a21",
    icon: "🔒",
  },
  ROAD: {
    id: "ROAD",
    category: "FLOOR",
    name: "Road",
    visualType: "road",
    variants: 1,
    defaultWidth: 1,
    defaultHeight: 1,
    walkable: true,
    color: "#334155",
    icon: "🛣️",
  },
  GRASS: {
    id: "GRASS",
    category: "FLOOR",
    name: "Grass / Garden",
    visualType: "grass",
    variants: 1,
    defaultWidth: 1,
    defaultHeight: 1,
    walkable: true,
    color: "#16a34a",
    icon: "🌿",
  },
  COURT_VOLI: {
    id: "COURT_VOLI",
    category: "FLOOR",
    name: "Lapangan Voli",
    visualType: "court_voli",
    variants: 1,
    defaultWidth: 1,
    defaultHeight: 1,
    walkable: true,
    color: "#ea580c",
    icon: "🏐",
  },
  COURT_BASKET: {
    id: "COURT_BASKET",
    category: "FLOOR",
    name: "Lapangan Basket",
    visualType: "court_basket",
    variants: 1,
    defaultWidth: 1,
    defaultHeight: 1,
    walkable: true,
    color: "#475569",
    icon: "🏀",
  },
  PARKING: {
    id: "PARKING",
    category: "FLOOR",
    name: "Area Parkir",
    visualType: "parking",
    variants: 1,
    defaultWidth: 1,
    defaultHeight: 1,
    walkable: true,
    color: "#374151",
    icon: "🅿️",
  },
  MOSQUE: {
    id: "MOSQUE",
    category: "FLOOR",
    name: "Tempat Ibadah / Musholla",
    visualType: "mosque",
    variants: 1,
    defaultWidth: 1,
    defaultHeight: 1,
    walkable: true,
    color: "#059669",
    icon: "🕌",
  },
};

export const ROOM_TYPES = [];
