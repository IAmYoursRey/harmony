import { GraphNode } from "./types";

interface EvacuationArrowProps {
  currentPath: string[];
  nodes: GraphNode[];
}

export function EvacuationArrow({ currentPath, nodes }: EvacuationArrowProps) {
  if (currentPath.length < 2) return null;

  const points = currentPath
    .map((id) => nodes.find((n) => n.id === id))
    .filter(Boolean) as GraphNode[];
  if (points.length < 2) return null;

  const pathData = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`)
    .join(" ");

  return (
    <g>
      {/* Route Line */}
      <path
        d={pathData}
        fill="none"
        stroke="hsl(var(--brand-500))"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-70"
      />

      {/* Animated Arrow heads moving along the path */}
      <circle r="8" fill="hsl(var(--brand-300))" className="shadow-lg">
        <animateMotion
          dur={`${points.length * 0.8}s`}
          repeatCount="indefinite"
          path={pathData}
        />
      </circle>
      <circle r="6" fill="white">
        <animateMotion
          dur={`${points.length * 0.8}s`}
          repeatCount="indefinite"
          path={pathData}
        />
      </circle>
    </g>
  );
}
