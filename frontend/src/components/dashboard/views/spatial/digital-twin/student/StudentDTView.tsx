import { useState, useEffect, useRef } from 'react';
import { Users, Clock, LogIn, RefreshCw } from 'lucide-react';
import { useSchool } from '@/hooks/useSchool';
import {  useToast  } from '@/hooks/useToast';
import type { GameRoom } from '../types';
import { fetchRooms, joinRoom, fetchRoom } from '@/services/digitalTwinService';
import { GameView } from './GameView';

import { useAuth } from '@/hooks/useAuth';

export function StudentDTView() {
  const { selection } = useSchool();
  const { currentUser } = useAuth();
  const { show } = useToast();
  const schoolId = selection?.school.id || '';
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<GameRoom | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadRooms = async () => {
    if (!schoolId || currentUser?.role !== 'student') return;
    setLoading(true);
    try {
      const data = await fetchRooms(schoolId);
      setRooms(data);
    } catch (_e) {
      // Silent — maybe not in a class
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
    pollRef.current = setInterval(loadRooms, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [schoolId, currentUser?.role]);

  // Poll joined room status
  useEffect(() => {
    if (!activeRoom || activeRoom.status === 'RUNNING') return;
    const interval = setInterval(async () => {
      try {
        const updated = await fetchRoom(activeRoom.id);
        setActiveRoom(updated);
        if (updated.status === 'RUNNING') clearInterval(interval);
      } catch (_e) { /* silent */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [activeRoom?.id, activeRoom?.status]);

  const handleJoin = async (room: GameRoom) => {
    setJoiningId(room.id);
    try {
      const joined = await joinRoom(room.id);
      setActiveRoom(joined);
      show('Bergabung ke ruang berhasil. Menunggu guru memulai...', 'success');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal bergabung';
      show(msg, 'error');
    } finally {
      setJoiningId(null);
    }
  };

  if (activeRoom && activeRoom.status === 'RUNNING') {
    return (
      <GameView
        room={activeRoom}
        onExit={() => { setActiveRoom(null); loadRooms(); }}
      />
    );
  }

  if (activeRoom) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
            <Clock className="h-10 w-10 text-brand-600 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <div className="absolute inset-0 rounded-full bg-brand-200/50 animate-ping" />
        </div>
        <div className="text-center">
          <h3 className="font-display text-xl font-bold text-ink-900 dark:text-white">Menunggu Guru Memulai</h3>
          <p className="text-sm text-ink-500 mt-1">Ruang: <strong>{activeRoom.name}</strong></p>
          <p className="text-xs text-ink-400 mt-1">Halaman akan otomatis berpindah saat simulasi dimulai...</p>
        </div>
        <button onClick={() => setActiveRoom(null)} className="text-sm text-ink-500 hover:underline">
          Batalkan &amp; Kembali
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-6 text-white shadow-glass-lg">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:36px_36px] opacity-10" />
        <div className="relative">
          <h2 className="font-display text-2xl font-extrabold">Simulasi Evakuasi</h2>
          <p className="mt-1 text-sm text-brand-100">Bergabung ke ruang simulasi yang dibuat guru kelasmu.</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">
          Ruang Aktif untuk Kelasmu
        </h3>
        <button onClick={loadRooms} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-ink-500 hover:bg-slate-200">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32 text-ink-400">Mencari ruang...</div>
      ) : rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed border-brand-200 dark:border-slate-700 text-ink-500">
          <Users className="h-10 w-10 mb-2 opacity-40" />
          <p className="text-sm font-semibold">Tidak ada simulasi aktif untuk kelasmu.</p>
          <p className="text-xs mt-1 text-ink-400">Minta gurumu untuk membuat sesi simulasi.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rooms.map(room => (
            <div key={room.id} className="glass rounded-xl p-4 dark:bg-slate-900/60 space-y-3">
              <div>
                <h4 className="font-bold text-sm text-ink-900 dark:text-white">{room.name}</h4>
                <p className="text-xs text-ink-500 mt-0.5">Kelas {room.targetGrade} {room.targetClass}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    room.status === 'WAITING' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                  }`}>{room.status}</span>
                  <span className="text-xs text-ink-400">
                    <Users className="h-3 w-3 inline mr-0.5" />{room.joinedStudents.length} bergabung
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleJoin(room)}
                disabled={joiningId === room.id}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-bold rounded-lg hover:bg-brand-700 disabled:opacity-60 shadow-glow"
              >
                <LogIn className="h-4 w-4" />
                {joiningId === room.id ? 'Bergabung...' : 'Bergabung ke Ruang'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
