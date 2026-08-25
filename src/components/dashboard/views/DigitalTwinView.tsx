import { useState, useEffect, useRef, useMemo } from 'react';
import {
  DoorOpen,
  FlaskConical,
  BookMarked,
  Play,
  RotateCcw,
  CheckCircle2,
  Box,
  Plus,
  Save,
  Trash2,
  Move,
  FileText,
  MapPin,
  Route,
  ArrowRight,
  Shield,
  HelpCircle
} from 'lucide-react';
import { useSchool } from '@/context/SchoolContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';

type RoomType = 'classroom' | 'lab' | 'library' | 'exit' | 'assembly';

interface Room {
  id: string;
  label: string;
  type: RoomType;
  x: number;
  y: number;
  w: number;
  h: number;
}

const legend: { type: RoomType; label: string; color: string }[] = [
  { type: 'classroom', label: 'Ruang Kelas', color: 'hsl(var(--brand-500))' },
  { type: 'lab', label: 'Laboratorium', color: '#8b5cf6' },
  { type: 'library', label: 'Perpustakaan', color: '#0ea5e9' },
  { type: 'exit', label: 'Pintu Darurat', color: '#ef4444' },
  { type: 'assembly', label: 'Titik Kumpul', color: '#10b981' },
];

function getColor(type: RoomType) {
  return legend.find((l) => l.type === type)?.color || '#94a3b8';
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`glass rounded-2xl p-5 transition-all hover:shadow-glass ${className}`}>{children}</div>;
}

export function DigitalTwinView() {
  const { selection } = useSchool();
  const { show } = useToast();
  
  const [role, setRole] = useState<'teacher' | 'student'>('teacher'); 
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selected, setSelected] = useState<Room | null>(null);
  const [simRunning, setSimRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    if (!selection?.school) {
      setLoading(false);
      return;
    }
    
    const fetchFloorPlan = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('floor_plans')
          .select('data')
          .eq('school_id', selection.school.id)
          .single();

        if (data && data.data && data.data.elements) {
          setRooms(data.data.elements);
        } else {
          setRooms([]);
        }
      } catch (err) {
        console.error('Error fetching floor plan:', err);
        const localData = localStorage.getItem(`floorplan_${selection.school.id}`);
        if (localData) {
          setRooms(JSON.parse(localData));
        } else {
          setRooms([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchFloorPlan();
  }, [selection]);

  const saveFloorPlan = async () => {
    if (!selection?.school) return;
    setSaving(true);
    
    try {
      const payload = { elements: rooms };
      const { error } = await supabase
        .from('floor_plans')
        .upsert({ 
          school_id: selection.school.id, 
          data: payload,
          created_by: 'teacher_demo'
        }, { onConflict: 'school_id' });

      if (error) throw error;
      show('Denah sekolah berhasil disimpan ke database', 'success');
    } catch (err) {
      console.error('Error saving to Supabase, fallback to localStorage', err);
      localStorage.setItem(`floorplan_${selection.school.id}`, JSON.stringify(rooms));
      show('Denah sekolah disimpan secara lokal (mode offline)', 'success');
    } finally {
      setSaving(false);
    }
  };

  const addElement = (type: RoomType) => {
    const newId = `el_${Date.now()}`;
    const count = rooms.filter(r => r.type === type).length + 1;
    
    let defaultLabel = '';
    if (type === 'classroom') defaultLabel = `Kelas ${count}`;
    else if (type === 'exit') defaultLabel = `Pintu Darurat ${count}`;
    else if (type === 'assembly') defaultLabel = `Titik Kumpul ${count}`;
    else if (type === 'lab') defaultLabel = `Laboratorium ${count}`;
    else if (type === 'library') defaultLabel = 'Perpustakaan';

    const newRoom: Room = {
      id: newId,
      label: defaultLabel,
      type,
      x: 50 + (count * 15) % 150,
      y: 50 + (count * 15) % 150,
      w: type === 'exit' || type === 'assembly' ? 30 : 70,
      h: type === 'exit' || type === 'assembly' ? 30 : 50,
    };
    setRooms([...rooms, newRoom]);
    setSelected(newRoom);
  };

  const updateSelected = (updates: Partial<Room>) => {
    if (!selected) return;
    const updated = { ...selected, ...updates };
    setSelected(updated);
    setRooms(rooms.map(r => r.id === selected.id ? updated : r));
  };

  const deleteSelected = () => {
    if (!selected) return;
    setRooms(rooms.filter(r => r.id !== selected.id));
    setSelected(null);
  };

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    if (role !== 'teacher') return;
    e.target.setPointerCapture(e.pointerId);
    setDraggingId(id);
    setSelected(rooms.find(r => r.id === id) || null);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId || !svgRef.current) return;
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return;
    
    const dx = e.movementX / CTM.a;
    const dy = e.movementY / CTM.d;

    setRooms(rooms.map(r => {
      if (r.id === draggingId) {
        const updated = { ...r, x: Math.max(0, Math.min(460, r.x + dx)), y: Math.max(0, Math.min(310, r.y + dy)) };
        if (selected?.id === draggingId) setSelected(updated);
        return updated;
      }
      return r;
    }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setDraggingId(null);
    e.target.releasePointerCapture(e.pointerId);
  };

  // DYNAMIC AI ROUTER LOGIC
  // Calculates the optimal evacuation plan based on coordinates of elements
  const evacuationGuidelines = useMemo(() => {
    const classrooms = rooms.filter(r => ['classroom', 'lab', 'library'].includes(r.type));
    const exits = rooms.filter(r => r.type === 'exit');
    const assemblies = rooms.filter(r => r.type === 'assembly');

    if (exits.length === 0 || assemblies.length === 0) {
      return {
        ready: false,
        message: 'Lengkapi denah dengan minimal 1 Pintu Darurat dan 1 Titik Kumpul untuk menghasilkan panduan rute evakuasi.'
      };
    }

    const routes = classrooms.map(room => {
      // Find closest exit
      let closestExit = exits[0];
      let minExitDist = Infinity;
      exits.forEach(ex => {
        const dist = Math.hypot((room.x + room.w/2) - (ex.x + ex.w/2), (room.y + room.h/2) - (ex.y + ex.h/2));
        if (dist < minExitDist) {
          minExitDist = dist;
          closestExit = ex;
        }
      });

      // Find closest assembly point from that exit
      let closestAssembly = assemblies[0];
      let minAsmDist = Infinity;
      assemblies.forEach(asm => {
        const dist = Math.hypot((closestExit.x + closestExit.w/2) - (asm.x + asm.w/2), (closestExit.y + closestExit.h/2) - (asm.y + asm.h/2));
        if (dist < minAsmDist) {
          minAsmDist = dist;
          closestAssembly = asm;
        }
      });

      return {
        room: room.label,
        exit: closestExit.label,
        assembly: closestAssembly.label,
        distanceEst: Math.round((minExitDist + minAsmDist) * 0.15) // convert to estimated meters
      };
    });

    return {
      ready: true,
      routes
    };
  }, [rooms]);

  if (loading) {
    return <div className="p-8 text-center text-ink-500">Memuat denah sekolah...</div>;
  }

  if (!selection?.school) {
    return (
      <Card className="text-center py-16">
        <Box className="mx-auto h-12 w-12 text-ink-300 dark:text-slate-600 mb-4" />
        <h3 className="font-display text-lg font-bold text-ink-900 dark:text-white">Pilih Sekolah Terlebih Dahulu</h3>
        <p className="mt-2 text-sm text-ink-500 dark:text-slate-400">Anda harus memilih sekolah di menu utama atau Dashboard untuk melihat denah Digital Twin.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-6 text-white shadow-glass-lg sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:36px_36px] opacity-15" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              <Box className="h-3.5 w-3.5 animate-pulse" /> Kembar Digital 3D / Digital Twin Plan
            </div>
            <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              {selection?.school.name}
            </h2>
            <p className="mt-1.5 max-w-md text-sm text-brand-100">
              {role === 'teacher' 
                ? 'Rancang denah sekolah Anda dengan menyeret elemen. Panduan evakuasi akan dihitung secara otomatis.' 
                : 'Pelajari rute evakuasi darurat hasil kalkulasi sensor Kembar Digital.'}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setRole(r => r === 'teacher' ? 'student' : 'teacher')}
              className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors font-bold"
            >
              Mode Pengguna: {role === 'teacher' ? '🔧 Guru (Editor Denah)' : '📖 Siswa (Viewer)'}
            </button>
            <button
              onClick={() => setSimRunning((s) => !s)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-bold text-brand-700 shadow-glass transition-all hover:-translate-y-0.5 hover:shadow-glow"
            >
              {simRunning ? <RotateCcw className="h-4.5 w-4.5" /> : <Play className="h-4.5 w-4.5 fill-brand-600 text-brand-600" />}
              {simRunning ? 'Reset Alur' : 'Simulasi Evakuasi'}
            </button>
          </div>
        </div>
      </div>

      {rooms.length === 0 && role === 'student' ? (
        <Card className="text-center py-12">
          <Box className="mx-auto h-12 w-12 text-ink-300 dark:text-slate-600 mb-4" />
          <h3 className="font-display text-lg font-bold text-ink-900 dark:text-white">Denah Belum Tersedia</h3>
          <p className="text-sm text-ink-500 dark:text-slate-400">Silakan hubungi admin sekolah untuk mengunggah atau mengatur denah.</p>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Floor plan editor area */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-sm font-bold text-ink-900 dark:text-white">
                  Kanvas Pembuat Rencana Gedung
                </h3>
                {role === 'teacher' && (
                  <button onClick={saveFloorPlan} disabled={saving} className="flex items-center gap-2 text-xs font-bold bg-brand-600 text-white px-4 py-2 rounded-full hover:bg-brand-700">
                    <Save className="h-4 w-4" /> {saving ? 'Menyimpan...' : 'Simpan Denah'}
                  </button>
                )}
              </div>

              {role === 'teacher' && (
                <div className="mb-4 flex flex-wrap gap-2">
                  <button onClick={() => addElement('classroom')} className="text-[11px] bg-brand-50 text-brand-700 px-3 py-1.5 rounded-lg font-bold hover:bg-brand-100">
                    + Ruang Kelas
                  </button>
                  <button onClick={() => addElement('lab')} className="text-[11px] bg-brand-50 text-brand-700 px-3 py-1.5 rounded-lg font-bold hover:bg-brand-100">
                    + Laboratorium
                  </button>
                  <button onClick={() => addElement('library')} className="text-[11px] bg-brand-50 text-brand-700 px-3 py-1.5 rounded-lg font-bold hover:bg-brand-100">
                    + Perpustakaan
                  </button>
                  <button onClick={() => addElement('exit')} className="text-[11px] bg-red-50 text-red-700 px-3 py-1.5 rounded-lg font-bold hover:bg-red-100">
                    + Pintu Darurat
                  </button>
                  <button onClick={() => addElement('assembly')} className="text-[11px] bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-100">
                    + Titik Kumpul
                  </button>
                </div>
              )}

              {/* Grid Canvas */}
              <div className="overflow-hidden rounded-xl border border-brand-100 bg-gradient-to-b from-slate-50 to-brand-50 dark:from-slate-900 dark:to-slate-800 touch-none">
                <svg 
                  ref={svgRef}
                  viewBox="0 0 500 350" 
                  className="w-full h-[380px]"
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                >
                  <defs>
                    <pattern id="floorP" width="20" height="20" patternUnits="userSpaceOnUse">
                      <rect width="20" height="20" fill="transparent" />
                      <line x1="0" y1="20" x2="20" y2="20" stroke="#cbd5e1" strokeWidth="0.5" strokeOpacity={0.5} />
                      <line x1="20" y1="0" x2="20" y2="20" stroke="#cbd5e1" strokeWidth="0.5" strokeOpacity={0.5} />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#floorP)" onClick={() => setSelected(null)} />

                  {/* Render simulated paths when running */}
                  {simRunning && evacuationGuidelines.ready && evacuationGuidelines.routes && (
                    <g opacity="0.6">
                      {rooms.filter(r => ['classroom', 'lab', 'library'].includes(r.type)).map(room => {
                        // Find exit target
                        const route = evacuationGuidelines.routes.find(rt => rt.room === room.label);
                        if (!route) return null;
                        const exitObj = rooms.find(ex => ex.label === route.exit);
                        const asmObj = rooms.find(asm => asm.label === route.assembly);
                        if (!exitObj || !asmObj) return null;

                        return (
                          <g key={`path_${room.id}`}>
                            <path
                              d={`M ${room.x + room.w/2} ${room.y + room.h/2} L ${exitObj.x + exitObj.w/2} ${exitObj.y + exitObj.h/2} L ${asmObj.x + asmObj.w/2} ${asmObj.y + asmObj.h/2}`}
                              fill="none"
                              stroke="hsl(var(--brand-600))"
                              strokeWidth="3"
                              strokeDasharray="5,5"
                              className="animate-pulse"
                            />
                          </g>
                        );
                      })}
                    </g>
                  )}

                  {/* Render rooms */}
                  {rooms.map((room) => {
                    const isSelected = selected?.id === room.id;
                    const color = getColor(room.type);
                    return (
                      <g
                        key={room.id}
                        onPointerDown={(e) => handlePointerDown(e, room.id)}
                        className={role === 'teacher' ? 'cursor-move' : 'cursor-pointer'}
                        onClick={(e) => { e.stopPropagation(); setSelected(room); }}
                      >
                        {room.type === 'exit' || room.type === 'assembly' ? (
                          <circle
                            cx={room.x + room.w/2}
                            cy={room.y + room.h/2}
                            r={room.w/2}
                            fill={color}
                            fillOpacity={isSelected ? 0.4 : 0.2}
                            stroke={color}
                            strokeWidth={isSelected ? 3 : 2}
                          />
                        ) : (
                          <rect
                            x={room.x}
                            y={room.y}
                            width={room.w}
                            height={room.h}
                            rx="6"
                            fill={color}
                            fillOpacity={isSelected ? 0.35 : 0.15}
                            stroke={color}
                            strokeWidth={isSelected ? 3 : 1.5}
                          />
                        )}
                        <text
                          x={room.x + room.w / 2}
                          y={room.y + room.h / 2 + 4}
                          textAnchor="middle"
                          fontFamily="Inter, sans-serif"
                          fontSize="9"
                          fontWeight="800"
                          fill={color}
                          pointerEvents="none"
                        >
                          {room.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Legend info */}
              <div className="flex flex-wrap gap-4 text-xs font-semibold mt-3 text-ink-600 justify-center">
                {legend.map(l => (
                  <div key={l.type} className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-full inline-block" style={{ backgroundColor: l.color }} />
                    <span>{l.label}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Generated Evacuation Guidelines List */}
            <Card>
              <div className="flex items-center gap-2 border-b border-brand-50 pb-3 dark:border-slate-800">
                <Route className="h-5 w-5 text-brand-600" />
                <h3 className="font-display text-sm font-bold text-ink-900 dark:text-white">
                  📋 Panduan Rute Evakuasi Hasil Rekomendasi Sensor Kembar Digital
                </h3>
              </div>

              {evacuationGuidelines.ready && evacuationGuidelines.routes ? (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-ink-500 leading-relaxed">
                    Panduan evakuasi berikut dianalisis secara dinamis berdasarkan kalkulasi posisi spasial tiap ruangan terhadap Pintu Darurat dan Titik Kumpul terdekat:
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {evacuationGuidelines.routes.map((route, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-brand-50 bg-white/40 dark:bg-slate-800/40 dark:border-slate-800 text-xs">
                        <div className="flex items-center justify-between font-bold text-brand-700 dark:text-brand-400">
                          <span>Dari: {route.room}</span>
                          <span className="text-[10px] text-ink-400">Estimasi {route.distanceEst} meter</span>
                        </div>
                        <div className="mt-2 flex flex-col gap-1 text-ink-600 dark:text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            <span>Gunakan pintu evakuasi: <strong>{route.exit}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Berkumpul di area terbuka: <strong>{route.assembly}</strong></span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex items-start gap-2 text-xs text-ink-500 leading-relaxed border border-dashed border-brand-100 p-4 rounded-xl">
                  <Info className="h-4 w-4 shrink-0 text-brand-500 mt-0.5" />
                  <span>{evacuationGuidelines.message}</span>
                </div>
              )}
            </Card>
          </div>

          {/* Details / Editor panel */}
          <div>
            <Card className="h-full">
              {role === 'teacher' && selected ? (
                <div className="space-y-4">
                  <h3 className="font-display text-sm font-bold text-ink-900 dark:text-white flex items-center gap-2 border-b border-brand-50 pb-2 dark:border-slate-800">
                    <span className="h-3.5 w-3.5 rounded-full" style={{backgroundColor: getColor(selected.type)}} />
                    Ubah Properti Elemen
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="font-bold text-ink-500">Nama/Label Ruangan</label>
                      <input 
                        type="text" 
                        value={selected.label}
                        onChange={(e) => updateSelected({ label: e.target.value })}
                        className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-950 border border-brand-100 dark:border-slate-800 rounded-lg text-xs font-semibold"
                      />
                    </div>
                    {(selected.type === 'classroom' || selected.type === 'lab' || selected.type === 'library') && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-ink-500">Lebar (W)</label>
                          <input type="number" value={selected.w} onChange={(e) => updateSelected({ w: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-950 border border-brand-100 dark:border-slate-800 rounded-lg text-xs" />
                        </div>
                        <div>
                          <label className="font-bold text-ink-500">Tinggi (H)</label>
                          <input type="number" value={selected.h} onChange={(e) => updateSelected({ h: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-950 border border-brand-100 dark:border-slate-800 rounded-lg text-xs" />
                        </div>
                      </div>
                    )}
                    <button onClick={deleteSelected} className="w-full flex justify-center items-center gap-1.5 mt-4 bg-red-50 text-red-650 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors">
                      <Trash2 className="h-4 w-4" /> Hapus Elemen
                    </button>
                  </div>
                </div>
              ) : selected ? (
                <div className="space-y-4">
                  <h3 className="font-display text-sm font-bold text-ink-900 dark:text-white flex items-center gap-2 border-b border-brand-50 pb-2 dark:border-slate-800">
                    <span className="h-3.5 w-3.5 rounded-full" style={{backgroundColor: getColor(selected.type)}} />
                    {selected.label}
                  </h3>
                  <div className="space-y-2 text-xs text-ink-600 dark:text-slate-300 leading-relaxed">
                    <p>
                      {selected.type === 'exit' && 'Ini adalah Pintu Darurat yang dirancang untuk jalur evakuasi aman menuju lapangan.'}
                      {selected.type === 'assembly' && 'Ini adalah Titik Kumpul luar ruangan aman untuk mengevakuasi seluruh warga sekolah.'}
                      {['classroom', 'lab', 'library'].includes(selected.type) && 'Ruangan sekolah. Sensor Kembar Digital akan merekomendasikan rute menuju Pintu Darurat terdekat secara real-time.'}
                    </p>
                    <div className="pt-2 border-t border-brand-50/50 mt-2">
                      <p><strong>Posisi X:</strong> {Math.round(selected.x)} px</p>
                      <p><strong>Posisi Y:</strong> {Math.round(selected.y)} px</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center py-12">
                  <Box className="mb-3 h-8 w-8 text-ink-300 dark:text-slate-650 animate-pulse" />
                  <p className="text-xs font-semibold text-ink-500 dark:text-slate-400 leading-relaxed max-w-[200px]">
                    {role === 'teacher' ? 'Seret elemen di kanvas atau pilih elemen untuk mulai mengedit properti.' : 'Pilih salah satu ruangan pada kanvas denah di samping untuk melihat rincian jalur evakuasinya.'}
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

export default DigitalTwinView;
