import { useState, useEffect, useRef } from 'react';
import { Plus, Play, Square, Users, Clock, Trash2, RefreshCw, CheckCircle2, XCircle, Eye, Activity } from 'lucide-react';
import {  useToast  } from '@/hooks/useToast';
import type { GridMap, DisasterSimulation, GameRoom } from '../types';
import { createRoom, startRoom, endRoom, fetchRoom, fetchRoomResults } from '@/services/digitalTwinService';
import { GridCanvas } from './GridCanvas';

interface Props {
  rooms: GameRoom[];
  maps: GridMap[];
  simulations: DisasterSimulation[];
  schoolId: string;
  onRefresh: (isBackground?: boolean) => void;
}

const GRADE_OPTIONS = ['X', 'XI', 'XII'];
const CLASS_SECTIONS = ['IPA 1', 'IPA 2', 'IPS 1', 'IPS 2', 'Bahasa', '1', '2', '3'];

const STATUS_COLORS: Record<string, string> = {
  WAITING: 'bg-amber-100 text-amber-700',
  RUNNING: 'bg-green-100 text-green-700 animate-pulse',
  FINISHED: 'bg-slate-100 text-slate-500',
  CANCELLED: 'bg-red-100 text-red-400 line-through',
};

export function RoomManager({ rooms, maps, simulations, schoolId, onRefresh }: Props) {
  const { show } = useToast();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [simId, setSimId] = useState('');
  const [targetGrade, setTargetGrade] = useState('X');
  const [targetClass, setTargetClass] = useState('IPA 1');
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [roomResults, setRoomResults] = useState<Record<string, unknown[]>>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll active rooms every 5 seconds
  useEffect(() => {
    pollRef.current = setInterval(() => onRefresh(true), 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [onRefresh]);

  const handleCreate = async () => {
    const sim = simulations.find(s => s.id === simId);
    if (!name.trim() || !simId || !sim) return show('Nama dan simulasi wajib dipilih', 'error');
    try {
      await createRoom({
        schoolId, name: name.trim(),
        mapId: sim.mapId,
        simulationId: simId,
        targetGrade, targetClass,
      });
      show('Ruang berhasil dibuat', 'success');
      setCreating(false);
      setName(''); setSimId('');
      onRefresh();
    } catch (_e) {
      show('Gagal membuat ruang', 'error');
    }
  };

  const handleStart = async (room: GameRoom) => {
    try {
      await startRoom(room.id);
      show('Simulasi dimulai! Siswa dapat bermain sekarang.', 'success');
      onRefresh();
    } catch (_e) {
      show('Gagal memulai simulasi', 'error');
    }
  };

  const handleEnd = async (room: GameRoom) => {
    if (!confirm('Akhiri sesi ini? Siswa tidak dapat melanjutkan.')) return;
    try {
      await endRoom(room.id);
      show('Sesi diakhiri', 'success');
      onRefresh();
    } catch (_e) {
      show('Gagal mengakhiri sesi', 'error');
    }
  };

  const handleViewResults = async (room: GameRoom) => {
    if (expandedRoom === room.id) { setExpandedRoom(null); return; }
    setExpandedRoom(room.id);
    try {
      const results = await fetchRoomResults(room.id);
      setRoomResults(prev => ({ ...prev, [room.id]: results }));
    } catch (_e) { /* silent */ }
  };

  const activeRooms = rooms.filter(r => r.status !== 'FINISHED' && r.status !== 'CANCELLED');
  const finishedRooms = rooms.filter(r => r.status === 'FINISHED');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">
          Ruang Sesi ({activeRooms.length} aktif)
        </h3>
        <div className="flex gap-2">
          <button onClick={onRefresh} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-ink-500 hover:bg-slate-200">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCreating(true)}
            disabled={simulations.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-bold rounded-lg hover:bg-brand-700 disabled:opacity-50 shadow-glow"
          >
            <Plus className="h-4 w-4" /> Buat Ruang
          </button>
        </div>
      </div>

      {creating && (
        <div className="rounded-xl border border-brand-200 dark:border-slate-700 bg-brand-50 dark:bg-slate-900 p-5 space-y-4">
          <h4 className="font-bold text-sm text-ink-900 dark:text-white">Buat Ruang Sesi Baru</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-ink-600 mb-1">Nama Ruang *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm dark:bg-slate-800 dark:border-slate-600"
                placeholder="cth: Kelas 10A - Kebakaran" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-ink-600 mb-1">Pilih Simulasi *</label>
              <select value={simId} onChange={e => setSimId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm dark:bg-slate-800 dark:border-slate-600">
                <option value="">-- Pilih Simulasi --</option>
                {simulations.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1">Kelas</label>
              <select value={targetGrade} onChange={e => setTargetGrade(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm dark:bg-slate-800 dark:border-slate-600">
                {GRADE_OPTIONS.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1">Jurusan/Seksi *</label>
              <select value={targetClass} onChange={e => setTargetClass(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm dark:bg-slate-800 dark:border-slate-600">
                {CLASS_SECTIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs text-ink-500 bg-white dark:bg-slate-800 rounded-lg p-3">
            Hanya siswa <strong>Kelas {targetGrade} {targetClass}</strong> yang dapat bergabung ke ruang ini.
          </p>
          <div className="flex gap-3">
            <button onClick={handleCreate} className="px-4 py-2 bg-brand-600 text-white text-sm font-bold rounded-lg hover:bg-brand-700">Buat Ruang</button>
            <button onClick={() => setCreating(false)} className="text-sm text-ink-600 hover:underline px-3">Batal</button>
          </div>
        </div>
      )}

      {/* Active Rooms */}
      {rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed border-brand-200 dark:border-slate-700 text-ink-500">
          <Users className="h-10 w-10 mb-2 opacity-40" />
          <p className="text-sm font-semibold">Belum ada ruang aktif.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map(room => {
            const sim = simulations.find(s => s.id === room.simulationId);
            const map = maps.find(m => m.id === room.mapId);
            const results = roomResults[room.id] || [];
            return (
              <div key={room.id} className="glass rounded-xl dark:bg-slate-900/60 overflow-hidden">
                <div className="p-4 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-ink-900 dark:text-white">{room.name}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[room.status]}`}>
                        {room.status}
                      </span>
                    </div>
                    <p className="text-xs text-ink-500 mt-0.5">
                      Kelas {room.targetGrade} {room.targetClass} &bull; {sim?.name || 'Sim?'} &bull; Peta: {map?.name || 'Peta?'}
                    </p>
                    <p className="text-xs text-ink-400">
                      <Users className="h-3 w-3 inline mr-1" />{room.joinedStudents.length} siswa bergabung
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {room.status === 'WAITING' && (
                      <button onClick={() => handleStart(room)}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-[0_0_12px_rgba(22,163,74,0.5)]">
                        <Play className="h-3.5 w-3.5" fill="currentColor" /> START
                      </button>
                    )}
                    {room.status === 'RUNNING' && (
                      <div className="flex gap-2">
                        <button onClick={() => setExpandedRoom(expandedRoom === room.id ? null : room.id)}
                          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg ${
                            expandedRoom === room.id ? 'bg-indigo-600 text-white shadow-[0_0_12px_rgba(79,70,229,0.5)]' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                          }`}>
                          <Eye className="h-3.5 w-3.5" /> Monitor Live
                        </button>
                        <button onClick={() => handleEnd(room)}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700">
                          <Square className="h-3.5 w-3.5" fill="currentColor" /> STOP
                        </button>
                      </div>
                    )}
                    {room.status === 'FINISHED' && (
                      <button onClick={() => handleViewResults(room)}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-brand-50 text-brand-700 rounded-lg hover:bg-brand-100">
                        Hasil ({results.length})
                      </button>
                    )}
                  </div>
                </div>

                {/* Live Monitor panel */}
                {expandedRoom === room.id && room.status === 'RUNNING' && map && (
                  <div className="border-t border-slate-100 dark:border-slate-800 p-5 bg-slate-50/50 dark:bg-slate-900/30">
                    <h5 className="text-sm font-black tracking-wide text-ink-700 dark:text-white mb-4 flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-500" />
                        COMMAND CENTER
                      </span>
                      <span className="text-red-600 animate-pulse flex items-center gap-1.5 px-3 py-1 bg-red-100 dark:bg-red-900/30 rounded-full border border-red-200 dark:border-red-800 shadow-inner">
                        <span className="w-2 h-2 rounded-full bg-red-600"></span>
                        <span className="text-xs font-bold tracking-widest uppercase">Live</span>
                      </span>
                    </h5>
                    <div className="mb-5 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <GridCanvas
                        gridWidth={map.gridWidth}
                        gridHeight={map.gridHeight}
                        cells={map.cells}
                        doors={map.doors}
                        safePoints={map.safePoints}
                        spawnPoints={map.spawnPoints}
                        activePlayers={Object.values(room.activePlayers || {})}
                        onPaint={() => {}}
                        readOnly={true}
                      />
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs">
                      {Object.values(room.activePlayers || {}).map(p => {
                        const isDead = p.hp === 0;
                        const isSafe = p.status === 'evacuated';
                        return (
                          <div key={p.id} className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-colors shadow-sm ${
                            isDead 
                              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50' 
                              : isSafe 
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50' 
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                          }`}>
                            <div className={`w-3 h-3 rounded-full shadow-inner ${isDead ? 'bg-red-500' : (isSafe ? 'bg-green-500' : 'bg-blue-500 animate-pulse')}`} />
                            <span className={`font-bold ${isDead ? 'text-red-700 dark:text-red-400 line-through opacity-80' : 'text-ink-700 dark:text-slate-200'}`}>
                              {p.name.split(' ')[0]}
                            </span>
                            <span className={`font-mono font-bold px-1.5 py-0.5 rounded-md ${
                              isDead ? 'bg-red-100 text-red-600 dark:bg-red-900/50' : 'bg-slate-100 text-ink-600 dark:bg-slate-700'
                            }`}>{p.hp}/100 HP</span>
                          </div>
                        );
                      })}
                      {Object.keys(room.activePlayers || {}).length === 0 && (
                        <div className="w-full text-center py-6 text-ink-400 italic bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                          Menunggu telemetry siswa masuk...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Results panel */}
                {expandedRoom === room.id && results.length > 0 && (
                  <div className="border-t border-slate-100 dark:border-slate-800 p-4">
                    <h5 className="text-xs font-bold text-ink-600 mb-3">Hasil Simulasi</h5>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-ink-400 border-b border-slate-100 dark:border-slate-800">
                            <th className="py-1 pr-3 text-left">Siswa</th>
                            <th className="py-1 pr-3 text-left">Hasil</th>
                            <th className="py-1 pr-3 text-left">Waktu</th>
                            <th className="py-1 pr-3 text-left">HP Sisa</th>
                            <th className="py-1 text-left">Damage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(results as Array<Record<string, unknown>>).map((r, i) => (
                            <tr key={i} className="border-b border-slate-50 dark:border-slate-800/50">
                              <td className="py-1.5 pr-3 font-mono text-ink-500">{String(r.userId).slice(-8)}</td>
                              <td className="py-1.5 pr-3">
                                {r.outcome === 'success'
                                  ? <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Berhasil</span>
                                  : <span className="text-red-500 font-bold flex items-center gap-1"><XCircle className="h-3 w-3" /> Gagal</span>}
                              </td>
                              <td className="py-1.5 pr-3">{r.completionTimeSeconds ? `${r.completionTimeSeconds}s` : '—'}</td>
                              <td className="py-1.5 pr-3">{r.hpRemaining != null ? `${r.hpRemaining}/100` : '—'}</td>
                              <td className="py-1.5">{Number(r.damageTaken)}HP</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
