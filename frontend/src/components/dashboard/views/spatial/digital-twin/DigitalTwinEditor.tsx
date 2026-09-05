import { Move, MapPin, DoorOpen, Route, Trash2, Shield } from 'lucide-react';
import { ToolMode } from './types';

interface DigitalTwinEditorProps {
  activeTool: ToolMode;
  setActiveTool: (tool: ToolMode) => void;
  setPathStart: (id: string | null) => void;
  isEditing: boolean;
  hasNodes: boolean;
}

export function DigitalTwinEditor({
  activeTool,
  setActiveTool,
  setPathStart,
  isEditing,
  hasNodes,
}: DigitalTwinEditorProps) {
  if (!isEditing) return null;

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-5 transition-all hover:shadow-glass dark:bg-slate-900/60 h-auto">
        <h3 className="font-display text-sm font-bold text-ink-900 dark:text-white mb-4 border-b border-brand-50 pb-2 dark:border-slate-800">
          Alat Desain
        </h3>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => { setActiveTool('select'); setPathStart(null); }}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTool === 'select'
                ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                : 'text-ink-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Move className="h-4 w-4" /> Geser
          </button>
          <button
            onClick={() => { setActiveTool('waypoint'); setPathStart(null); }}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTool === 'waypoint'
                ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                : 'text-ink-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <MapPin className="h-4 w-4" /> Titik Jalan
          </button>
          <button
            onClick={() => { setActiveTool('exit'); setPathStart(null); }}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTool === 'exit'
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : 'text-ink-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <DoorOpen className="h-4 w-4" /> Titik Keluar
          </button>
          <button
            onClick={() => { setActiveTool('path'); setPathStart(null); }}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTool === 'path'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-ink-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Route className="h-4 w-4" /> Hubungkan
          </button>
          <button
            onClick={() => { setActiveTool('delete'); setPathStart(null); }}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTool === 'delete'
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : 'text-ink-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Trash2 className="h-4 w-4" /> Hapus
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-ink-500 leading-relaxed">
          {activeTool === 'select' && 'Klik dan tahan titik untuk memindahkannya.'}
          {activeTool === 'waypoint' && 'Klik pada area peta untuk menambah titik kumpul/jalan.'}
          {activeTool === 'exit' && 'Klik pada peta untuk menentukan area aman/luar sekolah.'}
          {activeTool === 'path' && 'Klik Titik A lalu klik Titik B untuk membuat garis jalur evakuasi.'}
          {activeTool === 'delete' && 'Klik pada titik atau garis untuk menghapusnya.'}
        </div>
      </div>

      <div className="glass rounded-2xl p-5 transition-all hover:shadow-glass dark:bg-slate-900/60 h-auto">
        <h3 className="font-display text-sm font-bold text-ink-900 dark:text-white flex items-center gap-2 border-b border-brand-50 pb-2 dark:border-slate-800">
          <Shield className="h-4 w-4 text-brand-500" /> Tahap Validasi
        </h3>
        <div className="text-xs text-ink-500 bg-brand-50 p-4 rounded-lg leading-relaxed mt-4">
          <p className="mb-2"><strong>Pastikan Peta Anda:</strong></p>
          <ul className="list-disc pl-4 space-y-1 text-ink-600">
            <li>Memiliki minimal 1 Titik Keluar.</li>
            <li>Titik Jalan terhubung membentuk jalur.</li>
            <li>Posisi titik sudah sesuai ruangan.</li>
          </ul>
          <p className="mt-4 text-brand-600 font-bold">Tekan tombol <span className="px-2 py-1 bg-brand-600 text-white rounded">Simpan Pembaruan</span> untuk mematikan mode edit dan mencoba Simulasi.</p>
        </div>
      </div>
    </div>
  );
}
