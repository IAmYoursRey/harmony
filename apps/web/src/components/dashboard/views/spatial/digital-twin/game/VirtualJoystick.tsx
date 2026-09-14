import { useRef, useState, useEffect } from "react";

interface Props {
  onMove: (dir: "up" | "down" | "left" | "right") => void;
  disabled?: boolean;
}

export function VirtualJoystick({ onMove, disabled = false }: Props) {
  const baseRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const moveInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentDir = useRef<"up" | "down" | "left" | "right" | null>(null);

  const startMove = (dir: "up" | "down" | "left" | "right") => {
    if (disabled) return;
    if (currentDir.current !== dir) {
      currentDir.current = dir;
      onMove(dir);
      if (moveInterval.current) clearInterval(moveInterval.current);
      moveInterval.current = setInterval(() => {
        if (currentDir.current) onMove(currentDir.current);
      }, 150);
    }
  };

  const stopMove = () => {
    setActive(false);
    setKnobPos({ x: 0, y: 0 });
    currentDir.current = null;
    if (moveInterval.current) {
      clearInterval(moveInterval.current);
      moveInterval.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    setActive(true);
    updateKnobPosition(e.clientX, e.clientY);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!active || disabled) return;
    updateKnobPosition(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    stopMove();
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const updateKnobPosition = (clientX: number, clientY: number) => {
    if (!baseRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = clientX - centerX;
    let dy = clientY - centerY;

    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = rect.width / 2 - 25; // 25 is half of knob width

    if (distance > maxDistance) {
      dx = (dx / distance) * maxDistance;
      dy = (dy / distance) * maxDistance;
    }

    setKnobPos({ x: dx, y: dy });

    const threshold = 15;
    if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
      if (Math.abs(dx) > Math.abs(dy)) {
        startMove(dx > 0 ? "right" : "left");
      } else {
        startMove(dy > 0 ? "down" : "up");
      }
    } else {
      currentDir.current = null;
      if (moveInterval.current) {
        clearInterval(moveInterval.current);
        moveInterval.current = null;
      }
    }
  };

  useEffect(() => {
    return () => {
      if (moveInterval.current) clearInterval(moveInterval.current);
    };
  }, []);

  return (
    <div
      className="flex justify-center select-none"
      style={{ touchAction: "none" }}
    >
      {/* Mobile-only visible overlay, placed fixed at the bottom center if we want to overlay, or just rendered inline */}
      <div
        ref={baseRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative w-36 h-36 rounded-full flex items-center justify-center transition-opacity shadow-inner border-2 border-white/40 dark:border-slate-700/50 backdrop-blur-md ${
          disabled
            ? "opacity-50 bg-slate-200/50 dark:bg-slate-800/30 cursor-not-allowed"
            : "bg-slate-200/40 dark:bg-slate-800/40"
        }`}
        style={{ touchAction: "none" }}
      >
        {/* The Knob */}
        <div
          className={`absolute w-16 h-16 rounded-full shadow-lg border-b-4 transition-transform ease-out duration-75 ${
            disabled
              ? "bg-slate-400 border-slate-500"
              : "bg-brand-500 border-brand-700 active:bg-brand-400 active:border-b-2 active:translate-y-0.5"
          }`}
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
          }}
        >
          {/* Inner details for knob */}
          <div className="absolute inset-1 rounded-full border border-white/20" />
          <div className="absolute inset-3 rounded-full bg-white/10" />
        </div>
      </div>
    </div>
  );
}
