import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import {
  Play,
  CheckCircle2,
  LogOut,
  Copy,
  Check,
  Users,
  Link as LinkIcon,
  Trophy,
  XCircle,
} from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { safeCopyToClipboard } from "@/utils/browserCompat";
import { Phase3Runtime } from "../spatial/digital-twin/Phase3Runtime";
import type {
  AvatarStyle,
  DifficultyLevel,
} from "../spatial/digital-twin/Phase3Engine";
import {
  getDigitalTwinAssetUrl,
  preloadDigitalTwinAssets,
} from "../spatial/digital-twin/digitalTwinTextures";
import { useData } from "@/hooks/useData";
import { LoadingState } from "@/components/ui/LoadingState";

const COLOR_OPTIONS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
];

export function StudentSessionLobby() {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const [session, setSession] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);

  const [playerName, setPlayerName] = useState(() => {
    return (
      localStorage.getItem("harmony_player_name") ||
      currentUser?.name ||
      "Pemain"
    );
  });
  const [nameError, setNameError] = useState<string | null>(null);

  const [ready, setReady] = useState(false);
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>("girl");
  const [avatarColor, setAvatarColor] = useState("#3b82f6");
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [starting, setStarting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [countdownSec, setCountdownSec] = useState<number | null>(null);
  const { show } = useToast();
  const navigate = useNavigate();

  const {
    data: initialSession,
    isLoading: loading,
    error,
  } = useData<any>(id ? `/api/sessions/${id}` : null);

  useEffect(() => {
    preloadDigitalTwinAssets();
  }, []);

  const triggerCountdownAndPlay = () => {
    if (countdownSec !== null || isPlaying) return;
    setCountdownSec(3);
    const interval = setInterval(() => {
      setCountdownSec((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setIsPlaying(true);
          return null;
        }
        return prev - 1;
      });
    }, 900);
  };

  useEffect(() => {
    if (initialSession) {
      setSession(initialSession);
      if (initialSession.status === "RUNNING") {
        setIsPlaying(true);
      }
      if (id && currentUser) {
        apiClient
          .post(`/api/sessions/${id}/join`, {
            displayName: (playerName || currentUser.name || "Pemain").trim(),
            avatarStyle,
            avatarColor,
          })
          .catch((err: any) => {
            if (err.message?.includes("sudah dipakai") || err.message?.includes("DUPLICATE_NAME")) {
              setNameError(err.message);
            }
          });
      }
    }
    if (error) {
      show(error.message, "error");
      navigate("/app/digital-twin");
    }
  }, [initialSession, error, id, currentUser?.id]);

  useEffect(() => {
    if (!id || isPlaying || session?.status === "ENDED") return;

    let cancelled = false;
    const poll = async () => {
      try {
        const res = await apiClient.get(`/api/sessions/${id}/participants`, {
          ttl: 0,
        });
        if (cancelled) return;
        setParticipants(res.participants || []);
        const me = (res.participants || []).find(
          (p: any) => p.studentId === currentUser?.id,
        );
        if (me) {
          setReady(Boolean(me.readyState));
        }
        if (res.sessionStatus === "RUNNING") {
          setSession((s: any) => ({
            ...s,
            status: "RUNNING",
            settings: res.settings || s?.settings,
          }));
          triggerCountdownAndPlay();
        } else if (res.sessionStatus === "ENDED") {
          show("Room telah diakhiri oleh host.", "info");
          navigate("/app/digital-twin");
        } else {
          setSession((s: any) => ({
            ...s,
            status: res.sessionStatus,
            settings: res.settings || s?.settings,
            createdBy: res.createdBy || s?.createdBy,
            code: res.code || s?.code,
          }));
        }
      } catch {}
    };

    poll();
    const interval = setInterval(poll, 1600);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id, isPlaying, countdownSec, session?.status, currentUser?.id]);

  const syncReadyAndAvatar = async (
    nextReady: boolean,
    nextStyle: AvatarStyle,
    nextColor: string,
    nextName: string,
  ) => {
    if (!id) return;
    try {
      setNameError(null);
      await apiClient.post(`/api/sessions/${id}/ready`, {
        ready: nextReady,
        avatarStyle: nextStyle,
        avatarColor: nextColor,
        displayName: nextName.trim() || currentUser?.name || "Pemain",
      });
    } catch (err: any) {
      if (err.message?.includes("sudah dipakai") || err.message?.includes("DUPLICATE_NAME")) {
        setNameError(err.message);
      }
    }
  };

  const handleNameChange = (val: string) => {
    const cleaned = val.slice(0, 24);
    setPlayerName(cleaned);
    try {
      localStorage.setItem("harmony_player_name", cleaned);
    } catch {}
    syncReadyAndAvatar(ready, avatarStyle, avatarColor, cleaned);
  };

  const suggestAlternativeName = () => {
    const base = playerName.replace(/\s*\(\d+\)$/, "").trim();
    const randomSuffix = Math.floor(2 + Math.random() * 8);
    const newName = `${base} (${randomSuffix})`;
    handleNameChange(newName);
  };

  const handleToggleReady = async () => {
    const nextState = !ready;
    setReady(nextState);
    await syncReadyAndAvatar(nextState, avatarStyle, avatarColor, playerName);
  };

  const handleSelectAvatar = async (
    nextStyle: AvatarStyle,
    nextColor: string,
  ) => {
    setAvatarStyle(nextStyle);
    setAvatarColor(nextColor);
    await syncReadyAndAvatar(ready, nextStyle, nextColor, playerName);
  };

  const handleStartGame = async () => {
    if (!id) return;
    setStarting(true);
    try {
      await apiClient.post(`/api/sessions/${id}/start`, {});
      setSession((s: any) => ({ ...s, status: "RUNNING" }));
      triggerCountdownAndPlay();
    } catch (err: any) {
      show(err.message || "Gagal memulai game", "error");
    } finally {
      setStarting(false);
    }
  };

  const handleReturnToLobby = async () => {
    setIsPlaying(false);
    if (isHost && id) {
      try {
        await apiClient.post(`/api/sessions/${id}/restart`, {});
      } catch {}
    }
  };

  const handleEndSession = async () => {
    if (!id) return;
    try {
      await apiClient.post(`/api/sessions/${id}/end`, {});
      navigate("/app/digital-twin");
    } catch (err: any) {
      show(err.message || "Gagal mengakhiri room", "error");
    }
  };

  const handleLeave = async () => {
    try {
      await apiClient.post(`/api/sessions/${id}/leave`, {});
    } catch {}
    navigate("/app/digital-twin");
  };

  const copyCode = async () => {
    if (!session?.code) return;
    const ok = await safeCopyToClipboard(session.code);
    if (ok) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1800);
      show(`Kode room ${session.code} disalin!`, "success");
    } else {
      show("Gagal menyalin kode room.", "error");
    }
  };

  const copyInviteLink = async () => {
    const url = `${window.location.origin}/app/simulation/lobby/${id}`;
    const ok = await safeCopyToClipboard(url);
    if (ok) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1800);
      show("Tautan undangan disalin!", "success");
    } else {
      show("Gagal menyalin tautan undangan.", "error");
    }
  };

  const isHost =
    Boolean(session?.createdBy && currentUser?.id === session.createdBy) ||
    currentUser?.role === "developer" ||
    currentUser?.role === "teacher";

  if (loading) {
    return <LoadingState fullPage message="Menghubungkan ke lobi online..." />;
  }

  if (isPlaying && session) {
    const runtimeView = (
      <div className="fixed inset-0 z-[999] bg-slate-950">
        <Phase3Runtime
          mapId={session.mapId}
          scenarioId={session.scenarioId}
          sessionId={id}
          roomCode={session.code}
          mode={session.settings?.mode || "race"}
          initialDifficulty={
            (session.settings?.difficulty as DifficultyLevel) || "sulit"
          }
          initialAvatarStyle={avatarStyle}
          initialAvatarColor={avatarColor}
          initialAvatarName={playerName.trim() || currentUser?.name || "Pemain"}
          autoStart={true}
          onReturnToLobby={handleReturnToLobby}
          onClose={() => navigate("/app/digital-twin")}
        />
      </div>
    );
    return typeof document !== "undefined"
      ? createPortal(runtimeView, document.body)
      : runtimeView;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 relative">
      {countdownSec !== null && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400 mb-3">
            Bersiap! Simulasi Dimulai Dalam
          </span>
          <div className="text-8xl sm:text-9xl font-display font-black text-white animate-pulse drop-shadow-2xl">
            {countdownSec}
          </div>
          <p className="text-sm font-semibold text-slate-400 mt-4 max-w-sm">
            Semua pemain mulai serentak. Siapkan rute evakuasi teramanmu!
          </p>
        </div>
      )}

      <div className="glass rounded-3xl p-6 sm:p-8 border border-slate-200/70 dark:border-slate-700/80 shadow-xl space-y-6">
        {/* Header & Room Code */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 text-xs font-bold">
                {session?.settings?.mode === "race" ? (
                  <>
                    <Trophy className="h-3 w-3" /> KOMPETISI ONLINE
                  </>
                ) : (
                  <>
                    <Users className="h-3 w-3" /> SESI BERSAMA
                  </>
                )}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase">
                {session?.settings?.difficulty || "sulit"}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-black text-ink-900 dark:text-white">
              {session?.settings?.roomName || "Ruang Sesi Bersama"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {isHost
                ? "Bagikan kode ke peserta lalu klik Mulai Simulasi saat siap."
                : "Pilih karakter lalu tekan Siap sambil menunggu pemandu memulai."}
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Kode Ruang Sesi
            </span>
            <div className="text-3xl font-mono font-black tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
              {session?.code}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyCode}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold flex items-center gap-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100"
              >
                {copiedCode ? (
                  <Check className="h-3 w-3 text-emerald-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                Salin Kode
              </button>
              <button
                type="button"
                onClick={copyInviteLink}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold flex items-center gap-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100"
              >
                {copiedLink ? (
                  <Check className="h-3 w-3 text-emerald-500" />
                ) : (
                  <LinkIcon className="h-3 w-3" />
                )}
                Salin Link
              </button>
            </div>
          </div>
        </div>

        {/* Character Picker & Live Roster Grid */}
        <div className="grid md:grid-cols-5 gap-6 items-start">
          {/* Left 2 cols: Character Selector */}
          <div className="md:col-span-2 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-700/80 p-4 space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Nama Panggilan Karakter
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => handleNameChange(e.target.value)}
                maxLength={24}
                className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              {nameError && (
                <div className="mt-1.5 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-[11px] flex items-center justify-between gap-1">
                  <span>{nameError}</span>
                  <button
                    type="button"
                    onClick={suggestAlternativeName}
                    className="font-bold underline text-indigo-600 dark:text-indigo-400 shrink-0"
                  >
                    Ganti Nama
                  </button>
                </div>
              )}
            </div>

            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Model Chibi
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {(
                [
                  { id: "girl" as AvatarStyle, label: "Siswi SMA" },
                  { id: "boy" as AvatarStyle, label: "Siswa SMA" },
                ]
              ).map((preset) => {
                const selected = avatarStyle === preset.id;
                const imgSrc = getDigitalTwinAssetUrl(
                  preset.id === "boy" ? "characterBoy" : "characterGirl",
                );
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectAvatar(preset.id, avatarColor)}
                    className={`rounded-xl p-2.5 border-2 flex flex-col items-center gap-1.5 transition-all ${
                      selected
                        ? "bg-white dark:bg-slate-800 shadow-md"
                        : "border-slate-200 dark:border-slate-700 opacity-75 hover:opacity-100"
                    }`}
                    style={selected ? { borderColor: avatarColor } : undefined}
                  >
                    <img
                      src={imgSrc}
                      alt={preset.label}
                      className="w-14 h-14 object-contain"
                    />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div>
              <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2">
                Warna Cincin
              </span>
              <div className="flex justify-between">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleSelectAvatar(avatarStyle, c)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      avatarColor === c
                        ? "scale-125 border-slate-900 dark:border-white"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right 3 cols: Connected Players Roster */}
          <div className="md:col-span-3 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-700/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-indigo-500" />
                Daftar Peserta ({participants.length})
              </h3>
            </div>

            {participants.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500">
                Memuat daftar peserta...
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                {participants.map((p) => {
                  const isMe = p.studentId === currentUser?.id;
                  const spriteKey =
                    p.avatarStyle === "boy" ? "characterBoy" : "characterGirl";
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border ${
                        isMe
                          ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-400/50"
                          : "bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-900 border-2 shrink-0"
                          style={{ borderColor: p.avatarColor || "#3b82f6" }}
                        >
                          <img
                            src={getDigitalTwinAssetUrl(spriteKey)}
                            alt={p.displayName}
                            className="w-7 h-7 object-contain"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {p.displayName}
                            {isMe ? " (Kamu)" : ""}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            {p.studentId === session?.createdBy ? "Host" : "Pemain"}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.readyState || p.studentId === session?.createdBy
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                        }`}
                      >
                        {p.readyState || p.studentId === session?.createdBy
                          ? "Siap"
                          : "Menunggu"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Lobby Footer Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleLeave}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 transition-colors"
          >
            <LogOut className="h-4 w-4" /> Keluar Lobi
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            {!isHost && (
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-amber-700 dark:text-amber-300">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  Menunggu Host Memulai Game
                </span>
                <button
                  type="button"
                  onClick={handleToggleReady}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow transition-all ${
                    ready
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-800 hover:bg-slate-700 text-white"
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {ready ? "Sudah Siap" : "Tandai Siap"}
                </button>
              </div>
            )}

            {isHost && (
              <>
                <button
                  type="button"
                  onClick={handleEndSession}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                >
                  <XCircle className="h-4 w-4" /> Tutup Room
                </button>
                <button
                  type="button"
                  disabled={starting}
                  onClick={handleStartGame}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg disabled:opacity-50 transition-colors"
                >
                  <Play className="h-4 w-4 fill-white" />
                  {starting ? "Memulai..." : "Mulai Game Sekarang"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
