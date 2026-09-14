import React, { useRef } from "react";
import { GraphNode, GraphEdge, ToolMode, Hazard, MapPosition } from "./types";
import { HazardOverlay } from "./HazardOverlay";
import { EvacuationArrow } from "./EvacuationArrow";
import { UserLocationMarker } from "./UserLocationMarker";

interface DigitalTwinCanvasProps {
  mapImage: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  hazards: Hazard[];
  isEditing: boolean;
  activeTool: ToolMode;
  pathStart: string | null;
  role: "teacher" | "student";
  simRunning: boolean;
  userPosition: MapPosition | null;
  evacuationPath: string[];

  onSvgClick: (e: React.MouseEvent<SVGSVGElement>, svgCTM: DOMMatrix) => void;
  onNodeClick: (e: React.MouseEvent, id: string) => void;
  onNodePointerDown: (e: React.PointerEvent, id: string) => void;
  onPointerMove: (e: React.PointerEvent, svgCTM: DOMMatrix) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onRemoveEdge: (e: React.MouseEvent, id: string) => void;
  onRemoveNode: (e: React.MouseEvent, id: string) => void;
}

export const DigitalTwinCanvas = React.memo(function DigitalTwinCanvas({
  mapImage,
  nodes,
  edges,
  hazards,
  isEditing,
  activeTool,
  pathStart,
  role,
  simRunning,
  userPosition,
  evacuationPath,
  onSvgClick,
  onNodeClick,
  onNodePointerDown,
  onPointerMove,
  onPointerUp,
  onRemoveEdge,
  onRemoveNode,
}: DigitalTwinCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const handleSvgClickWrapper = (e: React.MouseEvent<SVGSVGElement>) => {
    const CTM = svgRef.current?.getScreenCTM();
    if (CTM) onSvgClick(e, CTM);
  };

  const handlePointerMoveWrapper = (e: React.PointerEvent) => {
    const CTM = svgRef.current?.getScreenCTM();
    if (CTM) onPointerMove(e, CTM);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl border-2 ${isEditing ? "border-brand-300" : "border-brand-100"} bg-slate-50 dark:bg-slate-900 touch-none flex justify-center items-center`}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 800 500"
        className="w-full h-[450px]"
        onClick={handleSvgClickWrapper}
        onPointerMove={handlePointerMoveWrapper}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <image
          href={mapImage}
          x="0"
          y="0"
          width="800"
          height="500"
          preserveAspectRatio="xMidYMid slice"
        />

        {/* Hazards Layer */}
        {simRunning && <HazardOverlay hazards={hazards} />}

        {/* Edges Layer */}
        {edges.map((edge) => {
          const nodeA = nodes.find((n) => n.id === edge.from);
          const nodeB = nodes.find((n) => n.id === edge.to);
          if (!nodeA || !nodeB) return null;

          return (
            <g key={edge.id}>
              <line
                x1={nodeA.x}
                y1={nodeA.y}
                x2={nodeB.x}
                y2={nodeB.y}
                stroke="hsl(var(--brand-600))"
                strokeWidth="4"
                strokeDasharray="8,6"
              />
              {isEditing &&
                (activeTool === "select" || activeTool === "delete") && (
                  <line
                    x1={nodeA.x}
                    y1={nodeA.y}
                    x2={nodeB.x}
                    y2={nodeB.y}
                    stroke="transparent"
                    strokeWidth="15"
                    className="cursor-pointer hover:stroke-red-500/30"
                    onClick={(e) => onRemoveEdge(e, edge.id)}
                  />
                )}
            </g>
          );
        })}

        {/* Dynamic Evacuation Arrow */}
        {simRunning && (
          <EvacuationArrow currentPath={evacuationPath} nodes={nodes} />
        )}

        {/* Nodes Layer */}
        {nodes.map((node) => {
          const isExit = node.type === "exit";
          const isActive = pathStart === node.id;
          const fill = isExit ? "#ef4444" : "#ffffff";
          const stroke = isExit ? "#ffffff" : "hsl(var(--brand-600))";

          return (
            <g
              key={node.id}
              onClick={(e) => onNodeClick(e, node.id)}
              onPointerDown={(e) => onNodePointerDown(e, node.id)}
              className={
                activeTool === "select"
                  ? "cursor-move"
                  : activeTool === "path"
                    ? "cursor-pointer hover:opacity-80"
                    : "cursor-default"
              }
            >
              {isActive && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="14"
                  fill="none"
                  stroke="hsl(var(--brand-400))"
                  strokeWidth="3"
                  className="animate-pulse"
                />
              )}
              <circle
                cx={node.x}
                cy={node.y}
                r="8"
                fill={fill}
                stroke={stroke}
                strokeWidth="3"
              />

              {role === "teacher" &&
                !simRunning &&
                isEditing &&
                activeTool === "select" && (
                  <circle
                    cx={node.x + 15}
                    cy={node.y - 15}
                    r="6"
                    fill="hsl(var(--destructive, 0 100% 50%))"
                    className="cursor-pointer"
                    onClick={(e) => onRemoveNode(e, node.id)}
                  />
                )}

              {!isEditing && isExit && (
                <text
                  x={node.x}
                  y={node.y - 12}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="bold"
                  fill="#ef4444"
                  stroke="white"
                  strokeWidth="3"
                  paintOrder="stroke"
                >
                  Pintu Keluar
                </text>
              )}
              {simRunning && isExit && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="12"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2"
                >
                  <animate
                    attributeName="r"
                    values="12;20;12"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="1;0;1"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
            </g>
          );
        })}

        {/* User Location */}
        {simRunning && <UserLocationMarker position={userPosition} />}
      </svg>
    </div>
  );
});
