import { CellType, GridMap } from "./types";

export interface GridPos {
  x: number;
  y: number;
}

/**
 * BFS shortest path on grid from start to any reachable target.
 * Returns array of positions forming the path, or empty array if unreachable.
 */
export function findPathBFS(
  start: GridPos,
  targets: GridPos[],
  map: GridMap,
  blockedCells: Set<string> = new Set(),
): GridPos[] {
  const targetKeys = new Set(targets.map((t) => `${t.x},${t.y}`));
  if (targetKeys.has(`${start.x},${start.y}`)) return [start];

  const visited = new Set<string>();
  const prev = new Map<string, string>(); // child → parent
  const queue: GridPos[] = [start];
  const startKey = `${start.x},${start.y}`;
  visited.add(startKey);

  const isWalkable = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= map.gridWidth || y >= map.gridHeight)
      return false;
    const key = `${x},${y}`;
    if (blockedCells.has(key)) return false;
    const cell = map.cells[key];
    if (!cell) return true; // empty/default = walkable
    return cell.walkable !== false && cell.type !== "WALL";
  };

  const DIRS = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const currKey = `${curr.x},${curr.y}`;

    if (targetKeys.has(currKey)) {
      const path: GridPos[] = [];
      let k: string | undefined = currKey;
      while (k) {
        const [px, py] = k.split(",").map(Number);
        path.unshift({ x: px, y: py });
        k = prev.get(k);
      }
      return path;
    }

    for (const dir of DIRS) {
      const nx = curr.x + dir.x;
      const ny = curr.y + dir.y;
      const nKey = `${nx},${ny}`;
      if (!visited.has(nKey) && isWalkable(nx, ny)) {
        visited.add(nKey);
        prev.set(nKey, currKey);
        queue.push({ x: nx, y: ny });
      }
    }
  }

  return []; // no path found
}

export interface LegacyNode {
  id: string;
  x: number;
  y: number;
  type: string;
}

export interface LegacyEdge {
  id: string;
  from: string;
  to: string;
}

export interface LegacyHazard {
  id: string;
  x: number;
  y: number;
  radius: number;
  active: boolean;
}

export function calculateEvacuationRoute(
  startNodeId: string,
  nodes: LegacyNode[],
  edges: LegacyEdge[],
  hazards: LegacyHazard[] = [],
): string[] {
  const adj: Record<string, { to: string; weight: number }[]> = {};
  nodes.forEach((n) => (adj[n.id] = []));

  edges.forEach((e) => {
    const n1 = nodes.find((n) => n.id === e.from);
    const n2 = nodes.find((n) => n.id === e.to);
    if (n1 && n2) {
      let hazardPenalty = 0;
      hazards
        .filter(Boolean)
        .filter((h) => h.active)
        .forEach((h) => {
          const d1 = Math.hypot(n1.x - h.x, n1.y - h.y);
          const d2 = Math.hypot(n2.x - h.x, n2.y - h.y);
          if (d1 < h.radius || d2 < h.radius) hazardPenalty += 10000;
        });
      const dist = Math.hypot(n1.x - n2.x, n1.y - n2.y) + hazardPenalty;
      adj[e.from].push({ to: e.to, weight: dist });
      adj[e.to].push({ to: e.from, weight: dist });
    }
  });

  const dist: Record<string, number> = {};
  const prev: Record<string, string | null> = {};
  nodes.forEach((n) => {
    dist[n.id] = Infinity;
    prev[n.id] = null;
  });
  dist[startNodeId] = 0;
  const q = new Set(nodes.map((n) => n.id));

  while (q.size > 0) {
    let u: string | null = null;
    let minD = Infinity;
    for (const id of q) {
      if (dist[id] < minD) {
        minD = dist[id];
        u = id;
      }
    }
    if (u === null) break;
    q.delete(u);

    const uNode = nodes.find((n) => n.id === u);
    if (uNode?.type === "exit") {
      const path: string[] = [];
      let curr: string | null = u;
      while (curr !== null) {
        path.unshift(curr);
        curr = prev[curr];
      }
      return path;
    }

    for (const neighbor of adj[u]) {
      if (q.has(neighbor.to)) {
        const alt = dist[u] + neighbor.weight;
        if (alt < dist[neighbor.to]) {
          dist[neighbor.to] = alt;
          prev[neighbor.to] = u;
        }
      }
    }
  }

  return [];
}
