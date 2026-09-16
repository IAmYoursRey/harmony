import React, { useEffect, useState, useCallback } from "react";
import { Map, Swords, Users, Globe, Play, BookOpen } from "lucide-react";
import { useSchool } from "@/hooks/useSchool";
import { useToast } from "@/hooks/useToast";
import type { GridMap, DisasterSimulation, GameRoom } from "../types";
import {
  fetchMaps,
  fetchSimulations,
  fetchRooms,
  fetchPublicMaps,
} from "@/services/digitalTwinService";
import { MapList } from "./MapList";
import { SimulationCreator } from "./SimulationCreator";
import { RoomManager } from "./RoomManager";

import { useAuth } from "@/hooks/useAuth";

type Tab = "maps" | "simulations" | "rooms" | "public_maps";

export function TeacherDTView() {
  const { selection } = useSchool();
  const { currentUser } = useAuth();
  const { show } = useToast();
  const schoolId = selection?.school.id || "";
  const [tab, setTab] = useState<Tab>("maps");
  const [maps, setMaps] = useState<GridMap[]>([]);
  const [publicMaps, setPublicMaps] = useState<GridMap[]>([]);
  const [simulations, setSimulations] = useState<DisasterSimulation[]>([]);
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAll = useCallback(
    async (isBackground = false) => {
      if (
        !schoolId ||
        (currentUser?.role !== "teacher" && currentUser?.role !== "developer")
      )
        return;
      if (!isBackground && maps.length === 0) {
        setLoading(true);
      }
      try {
        const [m, s, r, pub] = await Promise.all([
          fetchMaps(schoolId),
          fetchSimulations(schoolId),
          fetchRooms(schoolId),
          fetchPublicMaps().catch(() => []),
        ]);
        setMaps(m);
        setSimulations(s);
        setRooms(r);
        setPublicMaps(pub);
      } catch (_e) {
        console.warn("Silent fail: Failed to load Digital Twin data", _e);
        setMaps([]);
        setSimulations([]);
        setRooms([]);
        setPublicMaps([]);
      } finally {
        setLoading(false);
      }
    },
    [schoolId, currentUser?.role],
  );

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const TABS: {
    id: Tab;
    label: string;
    Icon: React.ElementType;
    count: number;
  }[] = [
    { id: "maps", label: "My School Maps", Icon: Map, count: maps.length },
    {
      id: "simulations",
      label: "Simulations",
      Icon: Swords,
      count: simulations.length,
    },
    {
      id: "rooms",
      label: "Active Sessions",
      Icon: Users,
      count: rooms.filter(
        (r) => r.status !== "FINISHED" && r.status !== "CANCELLED",
      ).length,
    },
    {
      id: "public_maps",
      label: "Public Community Maps",
      Icon: Globe,
      count: publicMaps.length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-6 text-white shadow-glass-lg">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:36px_36px] opacity-10" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm mb-3">
            <Swords className="h-3.5 w-3.5" /> Harmony Twin — Teacher Studio
          </div>
          <h2 className="font-display text-2xl font-extrabold">
            Evacuation Simulation & Map Manager
          </h2>
          <p className="mt-1 text-sm text-brand-100">
            Build digital twin maps, configure disaster hazard scenarios, and share public maps with schools nationwide.
          </p>
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
                ? "bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-brand-400"
                : "text-ink-500 hover:text-ink-800 dark:text-slate-400"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
            {count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                  tab === id
                    ? "bg-brand-100 text-brand-700"
                    : "bg-slate-200 dark:bg-slate-700"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex items-center justify-center h-32 text-ink-400">
          Loading...
        </div>
      ) : (
        <>
          {tab === "maps" && (
            <MapList maps={maps} schoolId={schoolId} onRefresh={loadAll} />
          )}
          {tab === "simulations" && (
            <SimulationCreator
              maps={maps}
              simulations={simulations}
              schoolId={schoolId}
              onRefresh={loadAll}
            />
          )}
          {tab === "rooms" && (
            <RoomManager
              rooms={rooms}
              maps={maps}
              simulations={simulations}
              schoolId={schoolId}
              onRefresh={loadAll}
            />
          )}
          {tab === "public_maps" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-base font-bold text-ink-900 dark:text-white flex items-center gap-2">
                    <Globe className="h-4 w-4 text-brand-600" />
                    Public Community Maps ({publicMaps.length})
                  </h3>
                  <p className="text-xs text-ink-500 dark:text-slate-400 mt-0.5">
                    Maps published by teachers from various schools for inter-school training and practice.
                  </p>
                </div>
              </div>

              {publicMaps.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 rounded-2xl border-2 border-dashed border-brand-200 dark:border-slate-700 text-ink-500">
                  <Globe className="h-10 w-10 mb-2 opacity-40 text-brand-600" />
                  <p className="text-sm font-semibold">No public maps available yet.</p>
                  <p className="text-xs mt-1">Publish a map from "My School Maps" to share with other schools!</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {publicMaps.map((pubMap) => (
                    <div
                      key={pubMap.id}
                      className="glass rounded-xl p-5 dark:bg-slate-900/60 space-y-3 border border-brand-100 dark:border-slate-800"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-ink-900 dark:text-white">
                              {pubMap.name}
                            </h4>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                              <Globe className="h-3 w-3" /> Shared
                            </span>
                          </div>
                          <p className="text-xs text-ink-500 mt-1">
                            By: {pubMap.authorName || "Teacher"} &bull; {pubMap.schoolName || "School"}
                          </p>
                          <p className="text-xs text-brand-600 font-semibold mt-0.5">
                            Size: {pubMap.gridWidth} × {pubMap.gridHeight} cells &bull; 1 cell = {pubMap.cellScale} {pubMap.cellScaleUnit}
                          </p>
                        </div>
                      </div>

                      <div className="text-xs text-ink-400">
                        {pubMap.rooms?.length || 0} rooms &bull; {pubMap.safePoints?.length || 0} evacuation points
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => {
                            show(`Loading drill for "${pubMap.name}"...`, "info");
                            setTab("maps");
                          }}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-lg shadow-sm transition-all"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>Practice on this Map</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
