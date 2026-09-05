import React, { useEffect, useState } from 'react';
import { Map, Swords, Users, Plus, ChevronRight } from 'lucide-react';
import { useSchool } from '@/hooks/useSchool';
import {  useToast  } from '@/hooks/useToast';
import type { GridMap, DisasterSimulation, GameRoom } from '../types';
import { fetchMaps, fetchSimulations, fetchRooms, startRoom, endRoom } from '@/services/digitalTwinService';
import { MapList } from './MapList';
import { SimulationCreator } from './SimulationCreator';
import { RoomManager } from './RoomManager';

type Tab = 'maps' | 'simulations' | 'rooms';

export function TeacherDTView() {
  const { selection } = useSchool();
  const { show } = useToast();
  const schoolId = selection?.school.id || '';
  const [tab, setTab] = useState<Tab>('maps');
  const [maps, setMaps] = useState<GridMap[]>([]);
  const [simulations, setSimulations] = useState<DisasterSimulation[]>([]);
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAll = async (isBackground = false) => {
    if (!schoolId) return;
    if (!isBackground && maps.length === 0) {
      setLoading(true);
    }
    try {
      const [m, s, r] = await Promise.all([
        fetchMaps(schoolId),
        fetchSimulations(schoolId),
        fetchRooms(schoolId),
      ]);
      setMaps(m);
      setSimulations(s);
      setRooms(r);
    } catch (_e) {
      show('Gagal memuat data Digital Twin', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [schoolId]);

  const TABS: { id: Tab; label: string; Icon: React.ElementType; count: number }[] = [
    { id: 'maps', label: 'Peta Grid', Icon: Map, count: maps.length },
    { id: 'simulations', label: 'Simulasi', Icon: Swords, count: simulations.length },
    { id: 'rooms', label: 'Ruang Aktif', Icon: Users, count: rooms.filter(r => r.status !== 'FINISHED' && r.status !== 'CANCELLED').length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-6 text-white shadow-glass-lg">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:36px_36px] opacity-10" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm mb-3">
            <Swords className="h-3.5 w-3.5" /> Digital Twin — Panel Guru
          </div>
          <h2 className="font-display text-2xl font-extrabold">Manajemen Simulasi Evakuasi</h2>
          <p className="mt-1 text-sm text-brand-100">Buat peta, rancang skenario bencana, dan mulai sesi simulasi untuk kelas Anda.</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
        {TABS.map(({ id, label, Icon, count }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
              tab === id
                ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-brand-400'
                : 'text-ink-500 hover:text-ink-800 dark:text-slate-400'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
            {count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                tab === id ? 'bg-brand-100 text-brand-700' : 'bg-slate-200 dark:bg-slate-700'
              }`}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex items-center justify-center h-32 text-ink-400">Memuat...</div>
      ) : (
        <>
          {tab === 'maps' && (
            <MapList maps={maps} schoolId={schoolId} onRefresh={loadAll} />
          )}
          {tab === 'simulations' && (
            <SimulationCreator
              maps={maps}
              simulations={simulations}
              schoolId={schoolId}
              onRefresh={loadAll}
            />
          )}
          {tab === 'rooms' && (
            <RoomManager
              rooms={rooms}
              maps={maps}
              simulations={simulations}
              schoolId={schoolId}
              onRefresh={loadAll}
            />
          )}
        </>
      )}
    </div>
  );
}
