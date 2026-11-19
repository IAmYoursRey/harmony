import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Trophy,
  Plus,
  LogIn,
  RefreshCw,
  X,
  Globe,
  Shield,
} from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { DifficultyLevel } from "./Phase3Engine";

interface ScenarioOption {
  id: string;
  name: string;
  disaster_type?: string;
  status?: string;
}

interface PublicRoomSummary {
  id: string;
  code: string;
  mapId: string;
  scenarioId: string;
  scenarioName: string;
  disasterType: string;
  status: string;
  participantCount: number;
  settings?: {
    roomName?: string;
    hostName?: string;
    mode?: "mabar" | "race";
    difficulty?: DifficultyLevel;
  };
}

export function OnlineRoomModal({
  isOpen,
  onClose,
  schoolId,
  mapId,
  scenarios,
  defaultScenarioId,
}: {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  mapId: string;
  scenarios: ScenarioOption[];
  defaultScenarioId?: string;
}) {
  const navigate = useNavigate();
  const { show } = useToast();
  const { currentUser } = useAuth();

  const publishedScenarios = scenarios.filter(
    (s) => s.status?.toLowerCase() === "published",
  );

  const [playerName, setPlayerName] = useState(() => {
    return (
      localStorage.getItem("harmony_player_name") ||
      currentUser?.name ||
      "Pemain"
    );
  });
  const [tab, setTab] = useState<"create" | "join">("create");
  const [scenarioId, setScenarioId] = useState(
    defaultScenarioId || publishedScenarios[0]?.id || "",
  );
  const [mode, setMode] = useState<"race" | "mabar">("race");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("sulit");
  const [roomName, setRoomName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [creating, setCreating] = useState(false);

  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [publicRooms, setPublicRooms] = useState<PublicRoomSummary[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const savePlayerName = (name: string) => {
    const clean = name.slice(0, 24);
    setPlayerName(clean);
    try {
      localStorage.setItem("harmony_player_name", clean);
    } catch {}
  };

  useEffect(() => {
    if (defaultScenarioId) {
      setScenarioId(defaultScenarioId);
    } else if (!scenarioId && publishedScenarios[0]?.id) {
      setScenarioId(publishedScenarios[0].id);
    }
  }, [defaultScenarioId, scenarios]);

  const fetchPublicRooms = async () => {
    setLoadingRooms(true);
    try {
      const res = await apiClient.get(
        `/api/sessions/public?mapId=${encodeURIComponent(mapId)}`,
        { ttl: 0 },
      );
      setPublicRooms(res?.data || []);
    } catch {
      setPublicRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    if (!isOpen || tab !== "join") return;
    fetchPublicRooms();
    const timer = setInterval(fetchPublicRooms, 4000);
    return () => clearInterval(timer);
  }, [isOpen, tab, mapId]);

  if (!isOpen) return null;

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scenarioId) {
      show("Pilih skenario terbit terlebih dahulu.", "error");
      return;
    }
    const cleanName = (playerName || currentUser?.name || "Host").trim();
    setCreating(true);
    try {
      const created = await apiClient.post("/api/sessions", {
        schoolId: schoolId || "unknown",
        classId: "mabar",
        mapId,
        scenarioId,
        displayName: cleanName,
        settings: {
          mode,
          difficulty,
          isPublic,
          allowLateJoin: true,
          roomName: roomName.trim() || undefined,
        },
      });
      onClose();
      navigate(`/app/simulation/lobby/${created.id}`);
    } catch (err: any) {
      show(err.message || "Gagal membuat room online", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = joinCode.replace(/\s+/g, "").toUpperCase();
    if (!cleaned) return;
    const cleanName = (playerName || currentUser?.name || "Pemain").trim();
    setJoining(true);
    try {
      const session = await apiClient.get(`/api/sessions/${cleaned}`, {
        ttl: 0,
      });
      await apiClient.post(`/api/sessions/${session.id}/join`, {
        displayName: cleanName,
      });
      onClose();
      navigate(`/app/simulation/lobby/${session.id}`);
    } catch (err: any) {
      show(err.message || "Kode room tidak ditemukan", "error");
    } finally {
      setJoining(false);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    const cleanName = (playerName || currentUser?.name || "Pemain").trim();
    setJoining(true);
    try {
      await apiClient.post(`/api/sessions/${roomId}/join`, {
        displayName: cleanName,
      });
      onClose();
      navigate(`/app/simulation/lobby/${roomId}`);
    } catch (err: any) {
      show(err.message || "Gagal bergabung ke room", "error");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-600/10 to-brand-600/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Sesi Bersama
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Latihan kolaboratif atau kompetisi menuju titik kumpul.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex border-b border-slate-100 dark:border-slate-800 px-5 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setTab("create")}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-colors ${
              tab === "create"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Buat Ruang
          </button>
          <button
            type="button"
            onClick={() => setTab("join")}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-colors ${
              tab === "join"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Gabung Ruang
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nama Peserta Simulasi
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => savePlayerName(e.target.value)}
              placeholder="Contoh: Budi, Salsa_99"
              maxLength={24}
              required
              className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-indigo-500"
            />
          </div>

          {tab === "create" ? (
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Skenario Bencana
                </label>
                <select
                  value={scenarioId}
                  onChange={(e) => setScenarioId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                >
                  {publishedScenarios.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setMode("race")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    mode === "race"
                      ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                    <Trophy className="h-3.5 w-3.5 text-amber-500" />
                    Kompetisi Cepat
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Peringkat waktu & sisa HP live.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("mabar")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    mode === "mabar"
                      ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                    <Users className="h-3.5 w-3.5 text-emerald-500" />
                    Kolaboratif
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Simulasi bersama dalam satu peta.
                  </p>
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Tingkat Kesulitan
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  {(
                    [
                      { id: "mudah", label: "Mudah" },
                      { id: "sedang", label: "Sedang" },
                      { id: "sulit", label: "Sulit" },
                    ] as const
                  ).map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDifficulty(d.id)}
                      className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                        difficulty === d.id
                          ? d.id === "sulit"
                            ? "bg-rose-600 text-white"
                            : d.id === "sedang"
                              ? "bg-amber-600 text-white"
                              : "bg-emerald-600 text-white"
                          : "text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Nama Ruang (Opsional)
                  </label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder={`Ruang ${currentUser?.name?.split(" ")[0] || "SMAN 1"}`}
                    maxLength={50}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  {isPublic ? (
                    <>
                      <Globe className="h-3.5 w-3.5 text-emerald-500" />
                      Tampilkan di Daftar Publik
                    </>
                  ) : (
                    <>
                      <Shield className="h-3.5 w-3.5 text-amber-500" />
                      Privat (Kode Saja)
                    </>
                  )}
                </label>
              </div>

              <button
                type="submit"
                disabled={creating || publishedScenarios.length === 0}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-colors"
              >
                <Plus className="h-4 w-4" />
                {creating ? "Membuat Ruang..." : "Buat Ruang & Masuk"}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <form onSubmit={handleJoinByCode} className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Masukkan 6 digit kode ruang..."
                  maxLength={8}
                  className="flex-1 px-3.5 py-2.5 text-sm font-mono font-bold tracking-widest uppercase rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={joining || joinCode.trim().length < 4}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors shrink-0"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Gabung
                </button>
              </form>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Ruang Sesi Aktif
                  </span>
                  <button
                    type="button"
                    onClick={fetchPublicRooms}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 hover:underline"
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${loadingRooms ? "animate-spin" : ""}`}
                    />
                    Muat Ulang
                  </button>
                </div>

                {publicRooms.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500">
                    Belum ada ruang publik aktif. Buat ruang baru dan bagikan kodenya.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {publicRooms.map((room) => (
                      <div
                        key={room.id}
                        className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {room.settings?.roomName || room.scenarioName}
                            </span>
                            <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                              #{room.code}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                                room.status === "RUNNING"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                              }`}
                            >
                              {room.status === "RUNNING" ? "BERJALAN" : "LOBI"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {room.disasterType} ·{" "}
                            {room.settings?.mode === "race"
                              ? "Kompetisi"
                              : "Kolaboratif"}{" "}
                            · {room.participantCount} peserta
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={joining}
                          onClick={() => handleJoinRoom(room.id)}
                          className="shrink-0 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          Gabung
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
