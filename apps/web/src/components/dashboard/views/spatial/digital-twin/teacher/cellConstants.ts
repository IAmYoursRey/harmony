export const CELL_COLORS: Record<string, string> = {
  EMPTY: "transparent",
  WALL: "#475569", // slate-600 (Darker, more structural)
  ROOM: "#e0e7ff", // indigo-100 (Soft, habitable space)
  CORRIDOR: "#f1f5f9", // slate-100 (Neutral walking path)
  DOOR: "#fef3c7", // amber-100 (Highlight interactive portal)
  SAFE_POINT: "#d1fae5", // emerald-100 (Reassuring safe zone)
  SPAWN: "#dbeafe", // blue-100 (Starting area)
  HAZARD: "#ffe4e6", // rose-100 (Warning area)
  OBJECT: "#f3e8ff", // purple-100 (Generic prop)
};

export const CELL_BORDER_COLORS: Record<string, string> = {
  WALL: "#334155", // slate-700
  ROOM: "#a5b4fc", // indigo-300
  CORRIDOR: "#cbd5e1", // slate-300
  DOOR: "#fcd34d", // amber-300
  SAFE_POINT: "#6ee7b7", // emerald-300
  SPAWN: "#93c5fd", // blue-300
  HAZARD: "#fda4af", // rose-300
  OBJECT: "#d8b4fe", // purple-300
};

export const CELL_LABELS: Record<string, string> = {
  EMPTY: "",
  WALL: "",
  ROOM: "R",
  CORRIDOR: "",
  DOOR: "D",
  SAFE_POINT: "Safe",
  SPAWN: "Start",
  HAZARD: "!",
  OBJECT: "O",
};
