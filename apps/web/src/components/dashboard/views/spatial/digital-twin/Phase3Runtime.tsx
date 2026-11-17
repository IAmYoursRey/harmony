import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "@/services/apiClient";
import { phase1Api } from "./Phase1API";
import { Phase1Map, Phase1Scenario } from "./Phase1Types";
import {
  Phase3Engine,
  PlayerState,
  SimState,
  DifficultyLevel,
  SimulationReport,
  AvatarStyle,
} from "./Phase3Engine";
import { resolveDisasterStrategy } from "./disasterStrategyRules";
import {
  getDigitalTwinAssetUrl,
  preloadDigitalTwinAssets,
} from "./digitalTwinTextures";
import { simulationAudio } from "./simulationAudio";
import { useToast } from "@/hooks/useToast";
import {
  ArrowLeft,
  Play,
  RotateCcw,
  Pause,
  Volume2,
  VolumeX,
  Trophy,
  Users,
  Gamepad2,
  BookOpen,
  ShieldCheck,
  Shield,
} from "lucide-react";
import {
  evaluateSimulationRubric,
  OFFICIAL_PREPAREDNESS_REFERENCES,
} from "@/data/disasterPreparednessRubric";
import { useAuth } from "@/hooks/useAuth";
import { io, Socket } from "socket.io-client";

export interface OnlineLeaderboardEntry {
  id: string;
  studentId: string;
  displayName: string;
  avatarStyle?: AvatarStyle;
  avatarColor?: string;
  status: string;
  finishedAt?: string | null;
  finishTimeMs?: number | null;
  score?: number;
  grade?: string | null;
  liveState?: {
    x?: number;
    y?: number;
    floorId?: string;
    direction?: "up" | "down" | "left" | "right";
    hp?: number;
    alive?: boolean;
    moving?: boolean;
    sprinting?: boolean;
  };
}

export function Phase3Runtime({
  mapId,
  scenarioId,
  sessionId,
  roomCode,
  mode,
  initialDifficulty,
  initialAvatarStyle,
  initialAvatarColor,
  initialAvatarName,
  autoStart = false,
  onReturnToLobby,
  onClose,
}: {
  mapId: string;
  scenarioId: string;
  sessionId?: string;
  roomCode?: string;
  mode?: "mabar" | "race";
  initialDifficulty?: DifficultyLevel;
  initialAvatarStyle?: AvatarStyle;
  initialAvatarColor?: string;
  initialAvatarName?: string;
  autoStart?: boolean;
  onReturnToLobby?: () => void;
  onClose: () => void;
}) {
  const { show } = useToast();
  const { currentUser: user } = useAuth();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Phase3Engine | null>(null);

  const [loading, setLoading] = useState(true);
  const [map, setMap] = useState<Phase1Map | null>(null);
  const [scenario, setScenario] = useState<Phase1Scenario | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [simState, setSimState] = useState<SimState>("LOADING");
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [timeMs, setTimeMs] = useState(0);
  const [activeFloorName, setActiveFloorName] = useState("");
  const [message, setMessage] = useState("");

  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const joystickRef = useRef<HTMLDivElement>(null);
  const joystickPointerIdRef = useRef<number | null>(null);
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const [showTouchControls, setShowTouchControls] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const hasCoarse =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches;
    return hasCoarse || navigator.maxTouchPoints > 0 || window.innerWidth < 1024;
  });
  const [isRunToggled, setIsRunToggled] = useState(false);
  const [isCoverToggled, setIsCoverToggled] = useState(false);

  const updateJoystickFromPoint = (clientX: number, clientY: number) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxRadius = Math.max(32, rect.width * 0.36);

    const rawDx = clientX - centerX;
    const rawDy = clientY - centerY;
    const dist = Math.hypot(rawDx, rawDy);
    const clamped = Math.min(dist, maxRadius);
    const angle = Math.atan2(rawDy, rawDx);

    setJoystickPos({
      x: clamped * Math.cos(angle),
      y: clamped * Math.sin(angle),
    });

    if (engineRef.current) {
      const norm = clamped / maxRadius;
      // Deadzone prevents unintended drift when a thumb rests near the center.
      if (norm < 0.14) {
        engineRef.current.setJoystick(0, 0);
      } else {
        const scaled = (norm - 0.14) / 0.86;
        engineRef.current.setJoystick(
          Math.cos(angle) * scaled,
          Math.sin(angle) * scaled,
        );
      }
    }
  };

  const handleJoystickEnd = () => {
    joystickPointerIdRef.current = null;
    setJoystickActive(false);
    setJoystickPos({ x: 0, y: 0 });
    if (engineRef.current) {
      engineRef.current.setJoystick(0, 0);
    }
  };

  const setVirtualButton = (action: string, isDown: boolean) => {
    if (engineRef.current) {
      engineRef.current.setVirtualButton(action, isDown);
    }
  };

  useEffect(() => {
    if (simState !== "RUNNING") {
      setIsRunToggled(false);
      setIsCoverToggled(false);
      joystickPointerIdRef.current = null;
      setJoystickActive(false);
      setJoystickPos({ x: 0, y: 0 });
      engineRef.current?.setVirtualButton("run", false);
      engineRef.current?.setVirtualButton("cover", false);
      engineRef.current?.setVirtualButton("interact", false);
      engineRef.current?.setJoystick(0, 0);
    }
  }, [simState]);

  const [avatarColor, setAvatarColor] = useState(
    initialAvatarColor || "#3b82f6",
  );
  const [avatarName, setAvatarName] = useState(
    initialAvatarName || user?.name || "Player",
  );
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>(
    initialAvatarStyle || "girl",
  );
  const [avatarSelected, setAvatarSelected] = useState(Boolean(autoStart));
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(
    initialDifficulty || "sulit",
  );
  const [isMuted, setIsMuted] = useState(false);
  const [report, setReport] = useState<SimulationReport | null>(null);
  const [leaderboard, setLeaderboard] = useState<OnlineLeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [waitingForHost, setWaitingForHost] = useState(Boolean(sessionId));
  const [countdownSec, setCountdownSec] = useState<number | null>(null);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    preloadDigitalTwinAssets();
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setWaitingForHost(false);
      return;
    }

    let cancelled = false;
    const pollStatus = async () => {
      try {
        const res = await apiClient.get(
          `/api/sessions/${sessionId}/participants`,
          { ttl: 0 },
        );
        if (cancelled || !res) return;
        if (Array.isArray(res.participants)) {
          setLeaderboard(res.leaderboard || res.participants);
        }
        if (res.sessionStatus === "RUNNING") {
          if (waitingForHost && countdownSec === null) {
            setCountdownSec(3);
            const t = setInterval(() => {
              setCountdownSec((prev) => {
                if (prev === null || prev <= 1) {
                  clearInterval(t);
                  setWaitingForHost(false);
                  engineRef.current?.setWaitingForHost(false);
                  return null;
                }
                return prev - 1;
              });
            }, 900);
          } else if (!waitingForHost) {
            engineRef.current?.setWaitingForHost(false);
          }
        } else {
          setWaitingForHost(true);
          engineRef.current?.setWaitingForHost(true);
        }
      } catch {}
    };

    pollStatus();
    const interval = setInterval(pollStatus, 1500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sessionId, waitingForHost, countdownSec]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    simulationAudio.setMuted(next);
  };

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const mapData = await phase1Api.getMapDetails(mapId);
      const scenData = await phase1Api.getScenarioDetails(scenarioId);

      if (scenData.status?.toLowerCase() !== "published") {
        throw new Error(
          `Scenario harus berstatus PUBLISHED untuk dapat dimainkan (status: ${scenData.status}).`,
        );
      }

      setMap(mapData);
      setScenario(scenData);
      setSimState("READY");
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memuat simulasi.");
      show(`Runtime Error: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [mapId, scenarioId]);

  const syncCanvasResolution = () => {
    if (!canvasRef.current || !containerRef.current) return;
    const cssW = containerRef.current.clientWidth;
    const cssH = containerRef.current.clientHeight;
    if (cssW <= 0 || cssH <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvasRef.current.width = Math.round(cssW * dpr);
    canvasRef.current.height = Math.round(cssH * dpr);
  };

  useEffect(() => {
    syncCanvasResolution();
    window.addEventListener("resize", syncCanvasResolution);
    return () => window.removeEventListener("resize", syncCanvasResolution);
  }, []);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!sessionId || !user) return;

    const isLocalHost =
      typeof window !== "undefined" &&
      ["localhost", "127.0.0.1"].includes(window.location.hostname);
    const socketUrl =
      typeof import.meta !== "undefined" && import.meta.env
        ? import.meta.env.VITE_API_URL
        : undefined;

    if (isLocalHost || socketUrl) {
      socketRef.current = io(socketUrl || "http://localhost:3001", {
        withCredentials: true,
        reconnectionAttempts: 2,
      });
      const handleConnect = () => {
        socketRef.current?.emit("join_session", {
          sessionId,
          participantId: user.id,
          studentId: user.id,
          displayName: avatarName || user.name || "Pemain",
        });
      };

      socketRef.current.on("connect", handleConnect);
      if (socketRef.current.connected) handleConnect();

      socketRef.current.on("remote_player_update", (data) => {
        if (engineRef.current && data.studentId !== user.id) {
          engineRef.current.updateRemotePlayer(
            data.studentId || data.participantId,
            data,
          );
        }
      });

      socketRef.current.on("remote_player_disconnect", (data) => {
        if (engineRef.current) {
          engineRef.current.removeRemotePlayer(data.participantId);
        }
      });

      socketRef.current.on(
        "door_state_update",
        (data: { doorId: string; state: "open" | "closed" | "locked" }) => {
          if (engineRef.current) {
            engineRef.current.updateDoorState(data.doorId, data.state);
          }
        },
      );
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [sessionId, user?.id]);

  // Serverless REST state sync (keeps multiplayer & race rankings live on Vercel too)
  useEffect(() => {
    if (!sessionId || !user) return;
    if (
      simState !== "RUNNING" &&
      simState !== "SUCCESS" &&
      simState !== "FAILED" &&
      !waitingForHost
    ) {
      return;
    }

    let cancelled = false;
    const syncOnce = async () => {
      if (isSyncingRef.current || cancelled) return;
      isSyncingRef.current = true;
      try {
        const snapshot = engineRef.current?.getSyncSnapshot();
        const isFinished = simState === "SUCCESS" && Boolean(report?.succeeded);
        const payload = {
          x: snapshot?.x,
          y: snapshot?.y,
          floorId: snapshot?.floorId,
          direction: snapshot?.direction || "down",
          hp: snapshot?.hp ?? Math.ceil(playerState?.health ?? 100),
          alive: snapshot?.alive ?? simState !== "FAILED",
          moving: snapshot?.moving ?? false,
          sprinting: snapshot?.sprinting ?? false,
          displayName: avatarName || user.name || "Pemain",
          avatarStyle,
          avatarColor,
          finished: isFinished,
          finishTimeMs: isFinished ? report?.timeMs ?? timeMs : undefined,
          score: report?.score ?? 0,
          grade: report?.grade ?? undefined,
          openedDoorIds: snapshot?.openDoorIds || [],
        };

        const res = await apiClient.post(
          `/api/sessions/${sessionId}/sync`,
          payload,
          { timeoutMs: 8000 },
        );
        if (cancelled || !res) return;

        if (Array.isArray(res.leaderboard)) {
          setLeaderboard(res.leaderboard);
        } else if (Array.isArray(res.players)) {
          setLeaderboard(res.players);
        }

        if (engineRef.current && Array.isArray(res.settings?.openDoors)) {
          engineRef.current.applyRemoteDoors(res.settings.openDoors);
        }

        if (engineRef.current && Array.isArray(res.players)) {
          for (const p of res.players) {
            if (!p || p.studentId === user.id) continue;
            if (
              p.liveState &&
              typeof p.liveState.x === "number" &&
              typeof p.liveState.y === "number"
            ) {
              engineRef.current.updateRemotePlayer(p.studentId, {
                participantId: p.id,
                studentId: p.studentId,
                displayName: p.displayName,
                avatarStyle: p.avatarStyle,
                avatarColor: p.avatarColor,
                finished: Boolean(p.finishedAt || p.finishTimeMs != null),
                state: p.liveState,
              });
            }
          }
        }
      } catch {
        // Ignore transient network delays so game loop never stutters
      } finally {
        isSyncingRef.current = false;
      }
    };

    syncOnce();
    const intervalMs = simState === "RUNNING" && !waitingForHost ? 240 : 1200;
    const timer = setInterval(syncOnce, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [
    sessionId,
    user?.id,
    simState,
    waitingForHost,
    report?.succeeded,
    report?.score,
    avatarName,
    avatarStyle,
    avatarColor,
  ]);

  const initEngine = () => {
    if (!canvasRef.current || !map || !scenario) return;
    syncCanvasResolution();

    if (engineRef.current) {
      engineRef.current.destroy();
    }

    setReport(null);
    simulationAudio.setMuted(isMuted);

    engineRef.current = new Phase3Engine(
      canvasRef.current,
      map,
      scenario,
      {
        onStateChange: (state) => setSimState(state),
        onPlayerUpdate: (player) => setPlayerState(player),
        onTimeUpdate: (ms) => setTimeMs(ms),
        onMessage: (msg) => {
          setMessage(msg);
          setTimeout(() => setMessage(""), 3200);
        },
        onFloorChange: (fname) => setActiveFloorName(fname),
        onDebugUpdate: (info) => setDebugInfo(info),
        onReportReady: (rep) => setReport(rep),
        onNetworkEmit: (state) => {
          if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit("player_update", state);
          }
        },
        onDoorStateChange: (doorId, state) => {
          if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit("door_event", {
              doorId,
              state,
              mapId,
              scenarioId,
            });
          }
        },
      },
      { difficulty },
    );

    engineRef.current.setPlayerAvatar(avatarColor, avatarName, avatarStyle);
    if (sessionId && waitingForHost) {
      engineRef.current.setWaitingForHost(true);
    }
    engineRef.current.start();

    (window as any).__getEngine = () => engineRef.current;
  };

  useEffect(() => {
    if (
      simState === "READY" &&
      avatarSelected &&
      canvasRef.current &&
      !engineRef.current
    ) {
      initEngine();
    }
  }, [simState, avatarSelected]);

  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
        delete (window as any).__getEngine;
      }
    };
  }, []);

  const handleRestart = () => {
    setAvatarSelected(false);
    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
    }
  };

  const handlePauseToggle = () => {
    if (simState === "RUNNING") engineRef.current?.pause();
    else if (simState === "PAUSED") engineRef.current?.resume();
  };

  if (loading) {
    return (
      <div className="h-[100dvh] w-full bg-slate-900 flex items-center justify-center flex-col gap-4 text-white">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-bold animate-pulse">Loading Simulation Engine...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="h-[100dvh] w-full bg-slate-900 flex items-center justify-center flex-col gap-4 text-white">
        <p className="font-bold text-red-400 text-xl">Simulation Error</p>
        <p className="text-slate-400">{errorMsg}</p>
        <div className="flex gap-4 mt-4">
          <button
            onClick={loadData}
            className="px-6 py-2 bg-brand-600 hover:bg-brand-700 rounded-lg font-bold transition-colors"
          >
            Retry
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="h-[100dvh] w-full bg-black flex flex-col font-sans overflow-hidden select-none touch-none">
      {/* HUD TOP & PERIMETER GUIDANCE LAYER */}
      {(simState === "RUNNING" || simState === "PAUSED") && playerState && (
        <div className="absolute top-0 left-0 right-0 pt-[max(0.5rem,env(safe-area-inset-top))] px-[max(0.5rem,env(safe-area-inset-left))] sm:px-4 flex flex-col gap-1.5 z-20 pointer-events-none">
          <div className="flex items-start justify-between gap-2 w-full">
            {/* Left HUD: HP, Stamina & Floor */}
            <div className="flex flex-col gap-1 min-w-0 shrink-0">
              <div className="bg-slate-900/88 backdrop-blur border border-slate-700/90 rounded-xl p-2 sm:p-2.5 flex flex-col gap-1 w-36 sm:w-52 lg:w-60 shadow-xl">
                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between items-center text-white font-bold text-[10px] sm:text-xs">
                    <span>HP</span>
                    <span>
                      {Math.ceil(playerState.health)} / {playerState.maxHealth}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 sm:h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-200"
                      style={{
                        width: `${Math.max(0, (playerState.health / playerState.maxHealth) * 100)}%`,
                        backgroundColor:
                          playerState.health < 30 ? "#ef4444" : "#22c55e",
                      }}
                    ></div>
                  </div>
                </div>

                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between items-center text-slate-300 font-bold text-[10px] sm:text-xs">
                    <span>STAMINA</span>
                    <span>
                      {Math.ceil(playerState.stamina)} / {playerState.maxStamina}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1 sm:h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-200"
                      style={{
                        width: `${Math.max(0, (playerState.stamina / playerState.maxStamina) * 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <div className="hidden sm:inline-flex bg-slate-900/82 backdrop-blur border border-slate-700/90 text-white rounded-xl px-3 py-1 font-bold shadow-xl w-max items-center gap-1.5 text-xs">
                  <span className="text-slate-400 text-[10px] uppercase">
                    Lantai:
                  </span>{" "}
                  <span className="truncate max-w-[160px]">{activeFloorName}</span>
                </div>
                {sessionId && (
                  <button
                    type="button"
                    onClick={() => setShowLeaderboard((v) => !v)}
                    className="pointer-events-auto inline-flex items-center gap-1.5 bg-indigo-950/90 hover:bg-indigo-900/90 backdrop-blur border border-indigo-500/40 text-indigo-200 rounded-xl px-2.5 py-1 text-[11px] font-bold shadow-xl transition-colors"
                  >
                    <Users className="h-3.5 w-3.5 text-indigo-400" />
                    <span>
                      {roomCode ? `#${roomCode}` : "Mabar"} ({leaderboard.length || 1})
                    </span>
                  </button>
                )}
              </div>

              {sessionId && showLeaderboard && leaderboard.length > 0 && (
                <div className="bg-slate-900/85 backdrop-blur border border-slate-700/90 rounded-xl p-2 sm:p-2.5 w-48 sm:w-64 shadow-xl space-y-1 text-[10px] sm:text-xs">
                  <div className="flex items-center justify-between text-slate-400 font-bold uppercase tracking-wider px-1 pb-0.5 border-b border-slate-800">
                    <span className="flex items-center gap-1">
                      <Trophy className="h-3 w-3 text-amber-400" />
                      {mode === "race" ? "Balap Evakuasi" : "Peringkat Live"}
                    </span>
                    <span className="text-[10px] text-indigo-300">ONLINE</span>
                  </div>
                  {leaderboard.slice(0, 4).map((entry, idx) => {
                    const isMe = entry.studentId === user?.id;
                    const done = Boolean(entry.finishedAt || entry.finishTimeMs != null);
                    const dead = entry.liveState?.alive === false;
                    return (
                      <div
                        key={entry.id || entry.studentId}
                        className={`flex items-center justify-between gap-1.5 px-1.5 py-1 rounded-lg ${isMe ? "bg-indigo-600/25 border border-indigo-500/40" : ""}`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-black text-amber-300 w-4 shrink-0">
                            #{idx + 1}
                          </span>
                          <span className="truncate font-semibold text-white">
                            {entry.displayName}
                          </span>
                        </div>
                        <span
                          className={`shrink-0 font-bold ${
                            done
                              ? "text-emerald-400"
                              : dead
                                ? "text-rose-400"
                                : "text-slate-300"
                          }`}
                        >
                          {done && entry.finishTimeMs != null
                            ? formatTime(entry.finishTimeMs)
                            : dead
                              ? "Gugur"
                              : `${entry.liveState?.hp ?? 100} HP`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Center HUD (Desktop >=1024px only so tablet/phone never collide) */}
            <div className="hidden lg:flex bg-slate-900/85 backdrop-blur border border-slate-700/90 rounded-xl px-5 py-2 flex-col items-center gap-0.5 shadow-xl min-w-0 max-w-md">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                Misi Evakuasi
              </span>
              <span className="text-emerald-400 font-bold text-sm text-center leading-snug">
                {playerState.objectiveProgress}
              </span>
            </div>

            {/* Right HUD: Timer & Controls */}
            <div className="flex flex-col items-end gap-1.5 pointer-events-auto shrink-0">
              <div className="bg-slate-900/88 backdrop-blur border border-slate-700/90 text-white rounded-xl px-3 py-1 sm:px-4 sm:py-1.5 font-mono font-bold text-sm sm:text-xl shadow-xl tracking-wider">
                {formatTime(timeMs)}
              </div>
              <div className="flex gap-1 sm:gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowTouchControls((prev) => !prev)}
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-colors shadow-lg ${
                    showTouchControls
                      ? "bg-brand-600 text-white border border-brand-400/60"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                  }`}
                  title={showTouchControls ? "Sembunyikan Kontrol Sentuh" : "Tampilkan Kontrol Sentuh"}
                  aria-label="Toggle Kontrol Sentuh"
                >
                  <Gamepad2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
                <button
                  onClick={toggleMute}
                  className="w-8 h-8 sm:w-9 sm:h-9 bg-slate-800 hover:bg-slate-700 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
                  title={isMuted ? "Aktifkan Suara" : "Bisukan Suara"}
                >
                  {isMuted ? (
                    <VolumeX className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                </button>
                <button
                  onClick={() => setShowDebug(!showDebug)}
                  className="w-8 h-8 sm:w-9 sm:h-9 bg-slate-800 hover:bg-slate-700 text-white rounded-full flex items-center justify-center transition-colors shadow-lg font-bold text-[9px] sm:text-[10px]"
                  title="Toggle Debug"
                >
                  DEV
                </button>
                <button
                  onClick={handlePauseToggle}
                  className="w-8 h-8 sm:w-9 sm:h-9 bg-slate-800 hover:bg-slate-700 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
                >
                  {simState === "PAUSED" ? (
                    <Play className="h-3 w-3 sm:h-4 sm:w-4" />
                  ) : (
                    <Pause className="h-3 w-3 sm:h-4 sm:w-4" />
                  )}
                </button>
                <button
                  onClick={handleRestart}
                  className="w-8 h-8 sm:w-9 sm:h-9 bg-slate-800 hover:bg-slate-700 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
                  title="Restart Simulation"
                >
                  <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" />
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 sm:w-9 sm:h-9 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
                  title="Exit Simulation"
                >
                  <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Disaster Phase Status Ribbon (P-wave, Severe shaking Drop-Cover, Golden window, Tsunami ETA & Inundation) */}
          {simState === "RUNNING" && playerState.activeDisasterPhase && (
            <div className="self-center max-w-[96vw] sm:max-w-2xl w-full flex justify-center">
              {playerState.activeDisasterPhase.isSevereShaking ? (
                <div className="w-full bg-rose-600/95 text-white border-2 border-amber-300 rounded-2xl px-3.5 py-1.5 sm:py-2 shadow-2xl animate-pulse flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg sm:text-xl shrink-0">🚨</span>
                    <div className="min-w-0">
                      <div className="font-black text-xs sm:text-sm tracking-wide text-amber-200 uppercase truncate">
                        Guncangan Utama · Sisa: {Math.ceil(playerState.activeDisasterPhase.remainingInPhaseSec)}s
                      </div>
                      <div className="text-[10px] sm:text-xs font-semibold text-rose-100 truncate">
                        {playerState.isCovering
                          ? "🛡️ Posisi Aman: Drop, Cover & Hold On aktif!"
                          : "⚠️ BERLINDUNG DI BAWAH MEJA! Tekan tombol COVER / C!"}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 font-mono font-black text-sm sm:text-lg bg-black/40 px-2 sm:px-2.5 py-0.5 rounded-lg border border-amber-300/60 text-amber-300">
                    {Math.ceil(playerState.activeDisasterPhase.remainingInPhaseSec)}s
                  </div>
                </div>
              ) : playerState.activeDisasterPhase.phaseId.includes("GOLDEN_WINDOW") ? (
                <div className="w-full bg-emerald-600/90 text-white border border-emerald-300/80 rounded-2xl px-3.5 py-1.5 shadow-xl flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base sm:text-lg shrink-0">⚡</span>
                    <div className="min-w-0">
                      <div className="font-black text-xs sm:text-sm text-emerald-100 uppercase truncate">
                        Waktu Emas Evakuasi · Sisa: {Math.ceil(playerState.activeDisasterPhase.remainingInPhaseSec)}s
                      </div>
                      <div className="text-[10px] sm:text-xs text-emerald-100/90 truncate">
                        Guncangan reda! Segera jalan cepat menuju tengah Lapangan Upacara!
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 font-mono font-bold text-xs sm:text-base bg-black/30 px-2 py-0.5 rounded-md text-emerald-200">
                    {Math.ceil(playerState.activeDisasterPhase.remainingInPhaseSec)}s
                  </div>
                </div>
              ) : playerState.activeDisasterPhase.waveEtaSec > 0 ? (
                <div className="w-full bg-cyan-700/92 text-white border-2 border-cyan-300/90 rounded-2xl px-3.5 py-1.5 sm:py-2 shadow-2xl flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg sm:text-xl shrink-0">🌊</span>
                    <div className="min-w-0">
                      <div className="font-black text-xs sm:text-sm text-cyan-200 uppercase truncate">
                        Peringatan Tsunami · Gelombang Tiba (ETA): {playerState.activeDisasterPhase.waveEtaSec}s
                      </div>
                      <div className="text-[10px] sm:text-xs text-cyan-100 truncate">
                        Evakuasi Vertikal! Naik tangga ke Lantai 2 sebelum gelombang tiba!
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 font-mono font-black text-sm sm:text-lg bg-black/40 px-2 sm:px-2.5 py-0.5 rounded-lg border border-cyan-300/60 text-cyan-300">
                    {playerState.activeDisasterPhase.waveEtaSec}s
                  </div>
                </div>
              ) : playerState.activeDisasterPhase.isTsunamiWaveArrival ? (
                <div className="w-full bg-blue-900/95 text-white border-2 border-rose-400 rounded-2xl px-3.5 py-1.5 sm:py-2 shadow-2xl flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg sm:text-xl shrink-0">🌊</span>
                    <div className="min-w-0">
                      <div className="font-black text-xs sm:text-sm text-rose-300 uppercase truncate">
                        Air Bah Tsunami Menerjang Lantai Dasar!
                      </div>
                      <div className="text-[10px] sm:text-xs text-slate-100 truncate">
                        Lantai 1 tergenang arus deras! Bertahan di Lantai 2 / Titik Tinggi!
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] sm:text-xs font-bold bg-rose-600/90 px-2 sm:px-2.5 py-1 rounded-full text-white">
                    BAHAYA L1
                  </span>
                </div>
              ) : (
                <div className="bg-slate-900/85 backdrop-blur border border-slate-700/80 rounded-full px-3.5 py-1 text-slate-200 text-xs font-semibold shadow-md flex items-center gap-2">
                  <span className="text-amber-400 font-bold">{playerState.activeDisasterPhase.name}</span>
                  <span className="text-slate-500 text-[10px]">·</span>
                  <span className="text-slate-300 text-[11px] truncate max-w-xs">{playerState.activeDisasterPhase.instructionText}</span>
                </div>
              )}
            </div>
          )}

          {/* Perimeter Mission Strip (< 1024px) */}
          <div className="lg:hidden self-center bg-slate-900/82 backdrop-blur border border-slate-700/80 rounded-full px-3 py-0.5 shadow-md max-w-[94vw]">
            <span className="text-emerald-400 font-bold text-[10px] sm:text-xs block truncate">
              Misi: {playerState.objectiveProgress}
            </span>
          </div>

          {/* Unified Single-Line Perimeter Guidance & Hazard Strip (keeps central viewport 100% clear) */}
          {simState === "RUNNING" && playerState.interactionPrompt && (
            <div className="self-center max-w-[92vw] sm:max-w-lg bg-amber-500/95 text-slate-950 rounded-full px-4 py-1 shadow-xl text-center">
              <span className="text-[11px] sm:text-xs font-extrabold tracking-tight block truncate">
                {playerState.interactionPrompt}
              </span>
            </div>
          )}

          {simState === "RUNNING" && playerState.indoorDanger && (
            <div className="self-center max-w-[94vw] sm:max-w-xl bg-rose-950/92 border border-rose-500/75 text-rose-100 rounded-xl px-3.5 py-1 shadow-xl text-center">
              <span className="text-[10px] sm:text-xs font-bold leading-snug line-clamp-2">
                {playerState.indoorDanger}
              </span>
            </div>
          )}

          {simState === "RUNNING" && message && (
            <div className="self-center max-w-[92vw] sm:max-w-lg bg-slate-900/92 border border-slate-700/90 text-slate-100 rounded-full px-4 py-1 shadow-lg text-center transition-all">
              <span className="text-[11px] sm:text-xs font-semibold block truncate">
                {message}
              </span>
            </div>
          )}
        </div>
      )}

      {/* DAMAGE OVERLAY */}
      {simState === "RUNNING" &&
        playerState &&
        playerState.health < playerState.maxHealth && (
          <div
            className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle, transparent 50%, rgba(255, 0, 0, ${Math.min(0.4, 1 - playerState.health / playerState.maxHealth)}))`,
            }}
          />
        )}

      {/* GAME OVER / SUCCESS SCREENS WITH EVALUATION REPORT */}
      {(simState === "FAILED" || simState === "SUCCESS") && (
        <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-sm flex items-center justify-center flex-col gap-5 p-4 overflow-y-auto">
          {simState === "SUCCESS" ? (
            <div className="text-center space-y-1.5">
              <h1 className="text-3xl sm:text-5xl font-black text-green-400">
                BERHASIL DIEVAKUASI
              </h1>
              <p className="text-sm sm:text-lg text-slate-300 font-medium">
                Titik aman tercapai dalam waktu {formatTime(timeMs)}.
              </p>
            </div>
          ) : (
            <div className="text-center space-y-1.5">
              <h1 className="text-3xl sm:text-5xl font-black text-red-500">
                EVAKUASI GAGAL
              </h1>
              <p className="text-sm sm:text-lg text-slate-300 font-medium">
                Skenario bahaya belum terlewati. Evaluasi jalur dan ulangi.
              </p>
            </div>
          )}

          {report && (() => {
            const evalResult =
              report.rubric ??
              evaluateSimulationRubric({
                succeeded: report.succeeded,
                timeMs: report.timeMs,
                healthRemaining: report.healthRemaining,
                maxHealth: 100,
                trapsTriggered: report.trapsTriggered,
                totalTraps: report.totalTraps,
                indoorsTimeSec: report.indoorsTimeSec ?? 0,
                difficulty: report.difficulty,
              });
            const cls = evalResult.classification;
            return (
              <div className="w-full max-w-lg rounded-2xl bg-slate-900/95 border border-slate-700 p-4 sm:p-5 shadow-2xl text-white space-y-3.5">
                <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      Evaluasi Kesiapsiagaan SPAB (Level 1–4)
                    </p>
                    <p className="text-base sm:text-lg font-black text-white mt-0.5">
                      {cls.levelLabel} · {cls.lipiCategory}
                    </p>
                    <p className="text-[11px] text-slate-400 capitalize">
                      Skor Indeks: <strong className="text-slate-200">{evalResult.score}/100</strong> (Rentang {cls.rangeLabel}) · Mode {report.difficulty}
                    </p>
                  </div>
                  <div
                    className={`shrink-0 px-3 py-2 rounded-xl flex flex-col items-center justify-center border ${cls.badgeClasses}`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                      BNPB SMAB
                    </span>
                    <span className="text-xl font-black leading-tight">
                      Lv.{cls.level}
                    </span>
                  </div>
                </div>

                {/* 4 Research-Weighted Rubric Criteria */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Rincian 4 Indikator Terukur
                  </p>
                  {evalResult.criteria.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-xl bg-slate-800/75 px-3 py-2 border border-slate-700/60"
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs">
                        <span className="font-bold text-slate-100">
                          {c.label}{" "}
                          <span className="text-[10px] font-normal text-slate-400">
                            ({c.weightPercent}%)
                          </span>
                        </span>
                        <span className="font-mono font-extrabold text-sky-300 shrink-0">
                          {c.score}/100
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-slate-900 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${c.score}%`,
                            backgroundColor:
                              c.score >= 80
                                ? "#10b981"
                                : c.score >= 65
                                  ? "#0ea5e9"
                                  : c.score >= 40
                                    ? "#f59e0b"
                                    : "#f43f5e",
                          }}
                        />
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 gap-2">
                        <span>{c.detail}</span>
                        <span className="shrink-0 font-mono text-indigo-300">
                          {c.pillarRef}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="rounded-xl bg-slate-800/80 p-2.5 text-center">
                    <span className="text-slate-400 block">Waktu</span>
                    <span className="text-sm font-extrabold text-sky-300">
                      {formatTime(report.timeMs)}
                    </span>
                  </div>
                  <div className="rounded-xl bg-slate-800/80 p-2.5 text-center">
                    <span className="text-slate-400 block">Sisa HP</span>
                    <span className="text-sm font-extrabold text-emerald-400">
                      {report.healthRemaining} / 100
                    </span>
                  </div>
                  <div className="rounded-xl bg-slate-800/80 p-2.5 text-center">
                    <span className="text-slate-400 block">Jebakan Aman</span>
                    <span className="text-sm font-extrabold text-amber-300">
                      {Math.max(0, report.totalTraps - report.trapsTriggered)} /{" "}
                      {report.totalTraps}
                    </span>
                  </div>
                </div>

                {report.winTakeaway && (
                  <div className="rounded-xl bg-indigo-950/70 border border-indigo-500/40 p-3 text-xs text-indigo-100 leading-relaxed">
                    <span className="font-bold text-indigo-300 block mb-0.5">
                      Analisis Adaptasi Bencana
                    </span>
                    {report.winTakeaway}
                  </div>
                )}

                <details className="rounded-xl bg-slate-800/50 border border-slate-700/70 px-3 py-2 text-[11px] text-slate-300">
                  <summary className="cursor-pointer font-bold text-slate-200 flex items-center gap-1.5 select-none">
                    <BookOpen className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span>Rujukan Akademik &amp; Standar Level 1–4</span>
                  </summary>
                  <div className="mt-2 space-y-1.5 text-[10.5px] leading-relaxed text-slate-400">
                    <p>{cls.summary}</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {OFFICIAL_PREPAREDNESS_REFERENCES.map((ref) => (
                        <li key={ref.code}>
                          <strong className="text-slate-200">{ref.code}:</strong>{" "}
                          {ref.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                </details>
              </div>
            );
          })()}

          {sessionId && leaderboard.length > 0 && (
            <div className="w-full max-w-md rounded-2xl bg-slate-900/95 border border-indigo-500/40 p-4 shadow-2xl text-white space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                  <Trophy className="h-4 w-4 text-amber-400" />
                  Klasemen Mabar Online {roomCode ? `(#${roomCode})` : ""}
                </span>
                <span className="text-[11px] text-slate-400">
                  {leaderboard.length} Pemain
                </span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {leaderboard.map((entry, idx) => {
                  const done = Boolean(entry.finishedAt || entry.finishTimeMs != null);
                  const dead = entry.liveState?.alive === false;
                  const isMe = entry.studentId === user?.id;
                  return (
                    <div
                      key={entry.id || entry.studentId}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs border ${
                        isMe
                          ? "bg-indigo-600/20 border-indigo-500/50"
                          : "bg-slate-800/70 border-slate-700/70"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`font-black w-5 text-center ${
                            idx === 0
                              ? "text-amber-300"
                              : idx === 1
                                ? "text-slate-200"
                                : idx === 2
                                  ? "text-orange-300"
                                  : "text-slate-400"
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <img
                          src={getDigitalTwinAssetUrl(
                            entry.avatarStyle === "boy"
                              ? "characterBoy"
                              : "characterGirl",
                          )}
                          alt={entry.displayName}
                          className="w-6 h-6 object-contain shrink-0"
                        />
                        <span className="font-bold truncate">
                          {entry.displayName}
                          {isMe ? " (Kamu)" : ""}
                        </span>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        {done && entry.finishTimeMs != null ? (
                          <span className="text-emerald-400 font-extrabold">
                            Selesai · {formatTime(entry.finishTimeMs)}
                            {entry.grade ? ` (${entry.grade})` : ""}
                          </span>
                        ) : dead ? (
                          <span className="text-rose-400 font-bold">Gugur</span>
                        ) : (
                          <span className="text-sky-300 font-bold">
                            Berlari ({entry.liveState?.hp ?? 100} HP)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {onReturnToLobby ? (
              <button
                onClick={onReturnToLobby}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg transition-colors flex items-center gap-2 text-base"
              >
                <Users className="h-4 w-4" /> Kembali ke Lobi Mabar
              </button>
            ) : (
              <button
                onClick={handleRestart}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold shadow-lg transition-colors flex items-center gap-2 text-base"
              >
                <RotateCcw className="h-4 w-4" /> Ulangi Skenario
              </button>
            )}
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold shadow-lg transition-colors flex items-center gap-2 text-base"
            >
              <ArrowLeft className="h-4 w-4" /> Kembali
            </button>
          </div>
        </div>
      )}

      {/* CANVAS LAYER */}
      <div className="flex-1 w-full h-full relative" ref={containerRef}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
        />

        {/* Helper text overlay for keyboard desktop users only */}
        {simState === "RUNNING" && !showTouchControls && timeMs < 5000 && (
          <div className="hidden lg:block absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 font-bold text-xs bg-black/60 px-4 py-1.5 rounded-full pointer-events-none border border-white/20 shadow-xl">
            W A S D gerak · Shift Lari · C / Ctrl Lindungi Kepala · E Aksi Pintu & Tangga
          </div>
        )}

        {/* Debug Panel */}
        {showDebug && debugInfo && (
          <div className="absolute top-32 right-4 bg-black/80 border border-brand-500 text-brand-300 p-4 rounded-xl font-mono text-xs pointer-events-none z-50">
            <h4 className="font-bold border-b border-brand-500/50 pb-1 mb-2">
              DEBUG INFO
            </h4>
            <div>FPS: {debugInfo.fps}</div>
            <div>X: {debugInfo.x}</div>
            <div>Y: {debugInfo.y}</div>
            <div>Floor: {debugInfo.floor}</div>
            <div>HP: {debugInfo.hp}</div>
          </div>
        )}

        {/* Multiplayer Waiting Room State */}
        {waitingForHost && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-indigo-500/60 shadow-2xl text-white text-xs sm:text-sm font-bold flex items-center gap-3 backdrop-blur-md animate-fade-in pointer-events-none">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span>Menunggu Host Memulai Simulasi...</span>
            <span className="px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-300 font-mono text-xs">
              Room #{roomCode || sessionId?.slice(0, 6)}
            </span>
          </div>
        )}

        {/* Synchronized 3-2-1 Countdown Overlay */}
        {countdownSec !== null && (
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in pointer-events-none">
            <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400 mb-2">
              Evakuasi Dimulai Dalam
            </span>
            <div className="text-8xl sm:text-9xl font-display font-black text-white animate-pulse drop-shadow-2xl">
              {countdownSec}
            </div>
            <p className="text-xs text-slate-300 mt-3 font-semibold">
              Bersiaplah menuju titik kumpul teraman!
            </p>
          </div>
        )}

        {/* Cross-platform Touch & Tablet Pointer-Capture Controls */}
        {simState === "RUNNING" && showTouchControls && !waitingForHost && (
          <div className="absolute inset-0 pointer-events-none z-40">
            {/* Pointer-Captured Analog Joystick (Bottom Left - Elevated & Comfortable) */}
            <div
              className={`absolute bottom-[max(2.5rem,calc(env(safe-area-inset-bottom)+1.5rem))] left-[max(1.75rem,calc(env(safe-area-inset-left)+1rem))] w-36 h-36 sm:w-44 sm:h-44 rounded-full border-2 pointer-events-auto flex items-center justify-center backdrop-blur-md touch-none select-none transition-all ${
                joystickActive
                  ? "bg-white/20 border-emerald-400/80 shadow-2xl shadow-emerald-500/30 scale-105"
                  : "bg-slate-900/50 border-white/30 shadow-lg"
              }`}
              ref={joystickRef}
              onPointerDown={(e) => {
                e.preventDefault();
                joystickPointerIdRef.current = e.pointerId;
                e.currentTarget.setPointerCapture(e.pointerId);
                setJoystickActive(true);
                updateJoystickFromPoint(e.clientX, e.clientY);
                try {
                  navigator.vibrate?.(10);
                } catch {}
              }}
              onPointerMove={(e) => {
                if (joystickPointerIdRef.current !== e.pointerId) return;
                e.preventDefault();
                updateJoystickFromPoint(e.clientX, e.clientY);
              }}
              onPointerUp={(e) => {
                if (joystickPointerIdRef.current === e.pointerId) {
                  handleJoystickEnd();
                }
              }}
              onPointerCancel={handleJoystickEnd}
            >
              <div className="absolute top-1 text-[10px] text-white/40 font-black pointer-events-none">▲</div>
              <div className="absolute bottom-1 text-[10px] text-white/40 font-black pointer-events-none">▼</div>
              <div className="absolute left-1 text-[10px] text-white/40 font-black pointer-events-none">◄</div>
              <div className="absolute right-1 text-[10px] text-white/40 font-black pointer-events-none">►</div>

              <div
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-white via-slate-100 to-slate-300 border-2 border-white shadow-2xl pointer-events-none flex items-center justify-center"
                style={{
                  transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
                }}
              >
                <div className="w-5 h-5 rounded-full bg-slate-400/40 border border-slate-300/50" />
              </div>
            </div>

            {/* Right-Thumb Action Deck (Elevated & Comfortable) */}
            <div className="absolute bottom-[max(2.5rem,calc(env(safe-area-inset-bottom)+1.5rem))] right-[max(1.75rem,calc(env(safe-area-inset-right)+1rem))] flex items-end gap-2.5 sm:gap-3.5 pointer-events-auto touch-none select-none">
              {/* LARI Toggle Button */}
              <button
                type="button"
                aria-pressed={isRunToggled}
                onPointerDown={(e) => {
                  e.preventDefault();
                  const next = !isRunToggled;
                  setIsRunToggled(next);
                  setVirtualButton("run", next);
                  try {
                    navigator.vibrate?.(15);
                  } catch {}
                }}
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 font-extrabold text-xs backdrop-blur-md transition-all active:scale-90 flex flex-col items-center justify-center shadow-xl ${
                  isRunToggled
                    ? "bg-gradient-to-br from-amber-500 to-orange-600 border-amber-200 text-slate-950 ring-4 ring-amber-400/30 shadow-amber-500/50"
                    : "bg-slate-900/60 border-white/35 text-white hover:bg-slate-800/70"
                }`}
                title="Ketuk untuk aktif/nonaktif Mode Lari"
              >
                <span className="font-black text-xs">LARI</span>
                <span className={`text-[8px] font-mono font-bold ${isRunToggled ? "text-slate-950" : "text-amber-400"}`}>
                  {isRunToggled ? "AKTIF" : "OFF"}
                </span>
              </button>

              {/* LINDUNGI / COVER Button (Drop, Cover & Hold On) */}
              <button
                type="button"
                aria-pressed={isCoverToggled}
                onPointerDown={(e) => {
                  e.preventDefault();
                  const next = !isCoverToggled;
                  setIsCoverToggled(next);
                  setVirtualButton("cover", next);
                  try {
                    navigator.vibrate?.(25);
                  } catch {}
                }}
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 font-extrabold text-xs backdrop-blur-md transition-all active:scale-90 flex flex-col items-center justify-center shadow-xl ${
                  isCoverToggled
                    ? "bg-gradient-to-br from-emerald-500 to-teal-700 border-emerald-200 text-white ring-4 ring-emerald-400/40 shadow-emerald-500/50"
                    : "bg-slate-900/60 border-white/35 text-white hover:bg-slate-800/70"
                }`}
                title="Tunduk & Lindungi Kepala di bawah Meja (Drop, Cover & Hold On)"
              >
                <Shield className="h-3.5 w-3.5 mb-0.5 text-emerald-300" />
                <span className="font-black text-[10px] leading-none">COVER</span>
                <span className={`text-[8px] font-mono font-bold mt-0.5 ${isCoverToggled ? "text-emerald-100" : "text-slate-400"}`}>
                  {isCoverToggled ? "AMAN" : "OFF"}
                </span>
              </button>

              {/* AKSI / BUKA PINTU & TANGGA Button */}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setVirtualButton("interact", true);
                  try {
                    navigator.vibrate?.(20);
                  } catch {}
                }}
                onPointerUp={(e) => {
                  e.preventDefault();
                  setVirtualButton("interact", false);
                }}
                onPointerCancel={() => setVirtualButton("interact", false)}
                className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 hover:from-emerald-400 hover:to-teal-600 rounded-full border-2 border-emerald-300/90 text-white font-black text-sm sm:text-base backdrop-blur-md active:scale-90 transition-all flex flex-col items-center justify-center shadow-2xl shadow-emerald-950/60 ring-4 ring-emerald-400/30"
                title="Buka atau tutup pintu darurat / gunakan tangga (AKSI)"
              >
                <span className="leading-tight font-black">AKSI</span>
                <span className="text-[9px] font-medium opacity-85">PINTU/NAIK</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CHARACTER & DIFFICULTY SELECTION OVERLAY */}
      {simState === "READY" && !avatarSelected && (
        <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur flex items-center justify-center flex-col gap-6 text-white p-4 sm:p-6 overflow-y-auto">
          <div className="bg-slate-800/95 p-6 sm:p-7 rounded-2xl border border-slate-700 max-w-md w-full shadow-2xl flex flex-col items-center">
            <h2 className="text-xl sm:text-2xl font-black mb-1">
              Pilih Karakter
            </h2>
            <p className="text-xs text-slate-300 mb-3 text-center leading-relaxed">
              {resolveDisasterStrategy(scenario?.disaster_type, scenario?.name).briefingWarning}
            </p>
            <div className="w-full rounded-xl bg-emerald-500/15 border border-emerald-500/35 px-3 py-2 text-[11px] font-bold text-emerald-300 text-center mb-4">
              Target Aman: {resolveDisasterStrategy(scenario?.disaster_type, scenario?.name).headlineTarget}
            </div>

            <div className="grid grid-cols-2 gap-3 w-full mb-5">
              {(
                [
                  {
                    id: "girl" as AvatarStyle,
                    label: "Siswi SMA",
                    src: getDigitalTwinAssetUrl("characterGirl"),
                  },
                  {
                    id: "boy" as AvatarStyle,
                    label: "Siswa SMA",
                    src: getDigitalTwinAssetUrl("characterBoy"),
                  },
                ]
              ).map((preset) => {
                const selected = avatarStyle === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setAvatarStyle(preset.id)}
                    className={`rounded-xl p-3 border-2 transition-all flex flex-col items-center gap-2 ${selected
                        ? "bg-slate-900/90 shadow-lg scale-[1.02]"
                        : "bg-slate-900/45 border-slate-700/80 opacity-75 hover:opacity-100"
                      }`}
                    style={
                      selected
                        ? {
                          borderColor: avatarColor,
                          boxShadow: `0 0 18px ${avatarColor}33`,
                        }
                        : undefined
                    }
                  >
                    <img
                      src={preset.src}
                      alt={preset.label}
                      className="w-16 h-16 object-contain drop-shadow"
                    />
                    <span className="text-xs font-bold text-slate-200">
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="w-full mb-4">
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Nama
              </label>
              <input name="avatarName" id="phase3runtime-avatarname"
                type="text"
                value={avatarName}
                onChange={(e) => setAvatarName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl font-bold text-white outline-none focus:border-brand-500"
              />
            </div>

            <div className="w-full mb-5">
              <label className="block text-xs font-bold text-slate-400 mb-2">
                Warna Cincin
              </label>
              <div className="flex justify-between">
                {[
                  "#ef4444",
                  "#f97316",
                  "#eab308",
                  "#22c55e",
                  "#3b82f6",
                  "#a855f7",
                  "#ec4899",
                ].map((c) => (
                  <button
                    key={c}
                    onClick={() => setAvatarColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${avatarColor === c ? "scale-125 border-white" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="w-full mb-6">
              <label className="block text-xs font-bold text-slate-400 mb-2">
                Tingkat Kesulitan
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-700">
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
                    className={`py-2 rounded-lg text-xs font-bold transition-colors ${difficulty === d.id
                      ? d.id === "sulit"
                        ? "bg-rose-600 text-white"
                        : d.id === "sedang"
                          ? "bg-amber-600 text-white"
                          : "bg-emerald-600 text-white"
                      : "text-slate-400 hover:text-white"
                      }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 text-center">
                {difficulty === "sulit"
                  ? "Lari lambat, damage penuh, jebakan tersembunyi rapat."
                  : difficulty === "sedang"
                    ? "Kecepatan sedang, damage & penyebaran bencana standar."
                    : "Gerak lebih gesit, damage berkurang, jarak ungkap jebakan lebih jauh."}
              </p>
            </div>

            <button
              onClick={() => setAvatarSelected(true)}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold transition-colors text-lg shadow-lg"
            >
              Mulai Simulasi
            </button>
            <button
              onClick={onClose}
              className="w-full py-2 mt-2 text-slate-400 hover:text-white rounded-xl font-bold transition-colors text-sm"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Phase3RuntimeRoute() {
  const { mapId, scenarioId } = useParams<{
    mapId: string;
    scenarioId: string;
  }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session") || undefined;
  const navigate = useNavigate();
  if (!mapId || !scenarioId) return null;
  return (
    <Phase3Runtime
      mapId={mapId}
      scenarioId={scenarioId}
      sessionId={sessionId}
      onClose={() => navigate("/app/digital-twin")}
    />
  );
}
