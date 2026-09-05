import { useRef } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  onMove: (dir: 'up' | 'down' | 'left' | 'right') => void;
  disabled?: boolean;
}

export function VirtualJoystick({ onMove, disabled = false }: Props) {
  const moveInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const startMove = (dir: 'up' | 'down' | 'left' | 'right') => {
    if (disabled) return;

    onMove(dir);
    if (moveInterval.current) clearInterval(moveInterval.current);
    moveInterval.current = setInterval(() => {
      onMove(dir);
    }, 150);
  };

  const stopMove = () => {
    if (moveInterval.current) {
      clearInterval(moveInterval.current);
      moveInterval.current = null;
    }
  };

  const btn = (dir: 'up' | 'down' | 'left' | 'right', Icon: React.ElementType, label: string) => (
    <button
      onPointerDown={(e) => { e.preventDefault(); startMove(dir); }}
      onPointerUp={stopMove}
      onPointerLeave={stopMove}
      onPointerCancel={stopMove}
      disabled={disabled}
      aria-label={label}
      className={`relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-75 active:scale-95 active:translate-y-1 ${
        disabled
          ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-300 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-800 shadow-none'
          : 'bg-white dark:bg-slate-800 text-ink-700 dark:text-slate-200 border-b-4 border-slate-200 dark:border-slate-900 shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 active:border-b-0 active:shadow-inner'
      }`}
    >
      <Icon className="h-7 w-7 drop-shadow-sm" />
    </button>
  );

  return (
    <div className="flex justify-center" style={{ touchAction: 'none' }}>
      <div className="inline-grid grid-cols-3 gap-3 p-5 rounded-3xl bg-slate-100/50 dark:bg-slate-800/30 border border-white dark:border-slate-700 shadow-inner select-none backdrop-blur-sm">
        <div />
        {btn('up', ChevronUp, 'Atas')}
        <div />
        {btn('left', ChevronLeft, 'Kiri')}
        <div className="w-16 h-16 rounded-2xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shadow-inner border border-brand-200 dark:border-brand-800/50">
          <div className="w-8 h-8 rounded-full bg-brand-200 dark:bg-brand-700/50 animate-pulse" />
        </div>
        {btn('right', ChevronRight, 'Kanan')}
        <div />
        {btn('down', ChevronDown, 'Bawah')}
        <div />
      </div>
    </div>
  );
}
