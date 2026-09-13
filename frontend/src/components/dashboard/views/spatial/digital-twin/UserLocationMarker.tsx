import { MapPosition } from "./types";

interface UserLocationMarkerProps {
  position: MapPosition | null;
}

export function UserLocationMarker({ position }: UserLocationMarkerProps) {
  if (!position) return null;

  if (position.type === "geo") return null;

  return (
    <g>
      {/* Outer pulse */}
      <circle
        cx={position.x}
        cy={position.y}
        r="24"
        fill="rgba(59, 130, 246, 0.2)"
        className="animate-ping"
      />
      {/* Inner marker */}
      <circle
        cx={position.x}
        cy={position.y}
        r="8"
        fill="#3b82f6"
        stroke="white"
        strokeWidth="3"
        className="shadow-lg"
      />
      <text
        x={position.x}
        y={position.y - 14}
        textAnchor="middle"
        fontSize="12"
        fontWeight="bold"
        fill="#1e40af"
        stroke="white"
        strokeWidth="3"
        paintOrder="stroke"
      >
        You
      </text>
    </g>
  );
}
