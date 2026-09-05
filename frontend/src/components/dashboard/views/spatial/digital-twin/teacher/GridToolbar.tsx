import type { EditorTool } from './MapEditor';
import { Square, Layout, BoxSelect, Columns3, DoorClosed, ShieldCheck, Flag, AlertTriangle, Eraser } from 'lucide-react';

interface Props {
  activeTool: EditorTool;
  onSelect: (tool: EditorTool) => void;
}

const TOOLS = [
  { id: 'WALL',       label: 'Dinding',      Icon: Square,       color: 'bg-slate-700 text-white',           borderColor: 'border-slate-800',     desc: 'Struktur permanen yang memblokir pergerakan' },
  { id: 'EMPTY',      label: 'Kosong',        Icon: Layout, color: 'bg-white text-slate-500',          borderColor: 'border-slate-300',     desc: 'Area default/kosong' },
  { id: 'ROOM',       label: 'Ruangan',       Icon: BoxSelect,    color: 'bg-indigo-100 text-indigo-700',    borderColor: 'border-indigo-300',    desc: 'Tandai area sebagai ruang kelas/fasilitas' },
  { id: 'CORRIDOR',   label: 'Koridor',       Icon: Columns3,     color: 'bg-slate-200 text-slate-700',      borderColor: 'border-slate-400',     desc: 'Lorong atau jalan utama' },
  { id: 'DOOR',       label: 'Pintu',         Icon: DoorClosed,   color: 'bg-amber-100 text-amber-700',      borderColor: 'border-amber-300',     desc: 'Titik akses masuk/keluar ruangan' },
  { id: 'SAFE_POINT', label: 'Titik Aman',    Icon: ShieldCheck,  color: 'bg-emerald-100 text-emerald-700',  borderColor: 'border-emerald-300',   desc: 'Target zona aman evakuasi' },
  { id: 'SPAWN',      label: 'Titik Mulai',   Icon: Flag,         color: 'bg-blue-100 text-blue-700',        borderColor: 'border-blue-300',      desc: 'Posisi awal saat simulasi dimulai' },
  { id: 'HAZARD',     label: 'Bahaya',        Icon: AlertTriangle,color: 'bg-rose-100 text-rose-700',        borderColor: 'border-rose-300',      desc: 'Tandai area bahaya (hazard zone)' },
  { id: 'ERASE',      label: 'Hapus',         Icon: Eraser,       color: 'bg-slate-100 text-slate-600',      borderColor: 'border-slate-300',     desc: 'Hapus sel kembali menjadi kosong' },
] as const;

export function GridToolbar({ activeTool, onSelect }: Props) {
  const activeDesc = TOOLS.find(t => t.id === activeTool)?.desc;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/80 backdrop-blur-md p-3.5 shadow-glass-sm">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-extrabold tracking-wider text-slate-500 uppercase">Map Elements</h4>
        <span className="text-[11px] font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded-full">
          {TOOLS.find(t => t.id === activeTool)?.label} Mode
        </span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {TOOLS.map(({ id, label, Icon, color, borderColor }) => {
          const isActive = activeTool === id;
          return (
            <button
              key={id}
              onClick={() => onSelect(id as EditorTool)}
              title={label}
              className={`group flex items-center justify-center gap-2 h-9 px-3.5 rounded-lg text-sm font-bold border-2 transition-all duration-200 ${
                isActive
                  ? `${color} ${borderColor} shadow-sm scale-[1.02]`
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent hover:border-slate-300 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-700'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? '' : 'opacity-70 group-hover:opacity-100'}`} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>
      
      {activeDesc && (
        <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span className="text-slate-400 dark:text-slate-500 mr-1">ℹ</span> {activeDesc}
        </div>
      )}
    </div>
  );
}
