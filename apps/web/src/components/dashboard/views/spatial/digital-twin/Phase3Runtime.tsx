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
} from "lucide-react";
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
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });

  const handleJoystickMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!joystickActive || !joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let clientX, clientY;
    if ("touches" in e) {
      clientX = (e as React.TouchEvent).touches[0].clientX;
      clientY = (e as React.TouchEvent).touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    let dx = clientX - centerX;
    let dy = clientY - centerY;

    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = rect.width / 2;

    if (distance > maxRadius) {
      dx = (dx / distance) * maxRadius;
      dy = (dy / distance) * maxRadius;
    }

    setJoystickPos({ x: dx, y: dy });

    if (engineRef.current) {
      const normDist = Math.min(distance / maxRadius, 1);
      const angle = Math.atan2(dy, dx);
      engineRef.current.setJoystick(
        Math.cos(angle) * normDist,
        Math.sin(angle) * normDist,
      );
    }
  };

  const handleJoystickEnd = () => {
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
  const isSyncingRef = useRef(false);

  useEffect(() => {
    preloadDigitalTwinAssets();
  }, []);

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
    if (simState !== "RUNNING" && simState !== "SUCCESS" && simState !== "FAILED") {
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
    const intervalMs = simState === "RUNNING" ? 240 : 1400;
    const timer = setInterval(syncOnce, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [
    sessionId,
    user?.id,
    simState,
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
      {/* HUD TOP LAYER */}
      {(simState === "RUNNING" || simState === "PAUSED") && playerState && (
        <div className="absolute top-0 left-0 right-0 p-2 sm:p-4 flex flex-col gap-1.5 z-10 pointer-events-none">
          <div className="flex items-start justify-between gap-2 w-full">
            {/* Left HUD: HP, Stamina & Floor */}
            <div className="flex flex-col gap-1.5 min-w-0">
              <div className="bg-slate-900/85 backdrop-blur border border-slate-700 rounded-xl p-2 sm:p-3 flex flex-col gap-1 sm:gap-1.5 w-44 sm:w-64 shadow-xl">
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
                <div className="hidden sm:inline-flex bg-slate-900/80 backdrop-blur border border-slate-700 text-white rounded-xl px-4 py-1.5 font-bold shadow-xl w-max items-center gap-2 text-sm">
                  <span className="text-slate-400 text-xs uppercase">
                    Lantai:
                  </span>{" "}
                  {activeFloorName}
                </div>
                {sessionId && (
                  <button
                    type="button"
                    onClick={() => setShowLeaderboard((v) => !v)}
                    className="pointer-events-auto inline-flex items-center gap-1.5 bg-indigo-950/90 hover:bg-indigo-900/90 backdrop-blur border border-indigo-500/40 text-indigo-200 rounded-xl px-3 py-1.5 text-xs font-bold shadow-xl transition-colors"
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

            {/* Center HUD (Desktop): Pure Escape Objective */}
            <div className="hidden md:flex bg-slate-900/85 backdrop-blur border border-slate-700 rounded-xl px-6 py-2.5 flex-col items-center gap-0.5 shadow-xl">
              <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                Misi Evakuasi
              </span>
              <span className="text-emerald-400 font-bold text-base text-center">
                {playerState.objectiveProgress}
              </span>
            </div>

            {/* Right HUD: Timer & Controls */}
            <div className="flex flex-col items-end gap-1.5 pointer-events-auto shrink-0">
              <div className="bg-slate-900/85 backdrop-blur border border-slate-700 text-white rounded-xl px-3 py-1 sm:px-5 sm:py-2 font-mono font-bold text-base sm:text-2xl shadow-xl tracking-wider">
                {formatTime(timeMs)}
              </div>
              <div className="flex gap-1 sm:gap-2">
                <button
                  onClick={toggleMute}
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-800 hover:bg-slate-700 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
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
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-800 hover:bg-slate-700 text-white rounded-full flex items-center justify-center transition-colors shadow-lg font-bold text-[9px] sm:text-xs"
                  title="Toggle Debug"
                >
                  DEV
                </button>
                <button
                  onClick={handlePauseToggle}
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-800 hover:bg-slate-700 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
                >
                  {simState === "PAUSED" ? (
                    <Play className="h-3 w-3 sm:h-4 sm:w-4" />
                  ) : (
                    <Pause className="h-3 w-3 sm:h-4 sm:w-4" />
                  )}
                </button>
                <button
                  onClick={handleRestart}
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-800 hover:bg-slate-700 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
                  title="Restart Simulation"
                >
                  <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" />
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
                  title="Exit Simulation"
                >
                  <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile compact mission pill */}
          <div className="md:hidden self-center bg-slate-900/80 backdrop-blur border border-slate-700/80 rounded-full px-3.5 py-1 shadow-lg">
            <span className="text-emerald-400 font-bold text-[11px]">
              {playerState.objectiveProgress}
            </span>
          </div>
        </div>
      )}

      {/* CENTER HUD NOTIFICATION */}
      {message && simState === "RUNNING" && (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-8 py-3 rounded-full font-bold shadow-2xl border border-slate-700 z-20 transition-all">
          {message}
        </div>
      )}

      {/* INTERACTION PROMPT */}
      {simState === "RUNNING" && playerState?.interactionPrompt && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-amber-500/90 backdrop-blur text-black px-6 py-2 rounded-lg font-bold shadow-2xl z-20 animate-bounce">
          {playerState.interactionPrompt}
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

          {report && (
            <div className="w-full max-w-md rounded-2xl bg-slate-900/95 border border-slate-700 p-5 shadow-2xl text-white space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                    Rapor Evaluasi Evakuasi
                  </p>
                  <p className="text-sm font-bold text-slate-200 capitalize mt-0.5">
                    Kesulitan: {report.difficulty} · Skor: {report.score}/100
                  </p>
                </div>
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-2xl border ${report.grade === "S"
                    ? "bg-amber-500/20 text-amber-300 border-amber-400"
                    : report.grade === "A"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-400"
                      : report.grade === "B"
                        ? "bg-sky-500/20 text-sky-300 border-sky-400"
                        : "bg-rose-500/20 text-rose-300 border-rose-500"
                    }`}
                >
                  {report.grade}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="rounded-xl bg-slate-800/80 p-3">
                  <span className="text-slate-400 block">Waktu Evakuasi</span>
                  <span className="text-base font-extrabold text-sky-300">
                    {formatTime(report.timeMs)}
                  </span>
                </div>
                <div className="rounded-xl bg-slate-800/80 p-3">
                  <span className="text-slate-400 block">Sisa HP</span>
                  <span className="text-base font-extrabold text-emerald-400">
                    {report.healthRemaining} / 100
                  </span>
                </div>
                <div className="rounded-xl bg-slate-800/80 p-3">
                  <span className="text-slate-400 block">Jebakan Dihindari</span>
                  <span className="text-base font-extrabold text-amber-300">
                    {Math.max(0, report.totalTraps - report.trapsTriggered)} /{" "}
                    {report.totalTraps}
                  </span>
                </div>
                <div className="rounded-xl bg-slate-800/80 p-3">
                  <span className="text-slate-400 block">Mode Simulasi</span>
                  <span className="text-base font-extrabold text-purple-300 capitalize">
                    {report.difficulty}
                  </span>
                </div>
              </div>
            </div>
          )}

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

        {/* Helper text overlay for WASD */}
        {simState === "RUNNING" && timeMs < 5000 && (
          <div className="hidden sm:block absolute bottom-8 left-1/2 -translate-x-1/2 text-white/70 font-bold text-sm bg-black/45 px-4 py-2 rounded-lg pointer-events-none transition-opacity duration-1000">
            Gunakan W A S D atau tombol panah untuk bergerak
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

        {/* Mobile Controls (Only visible on small screens / touch devices if needed, but we'll show it fixed at bottom corners for demonstration) */}
        {simState === "RUNNING" && (
          <div className="absolute inset-0 pointer-events-none z-40 sm:hidden">
            {/* Virtual Joystick - Left Side */}
            <div
              className="absolute bottom-6 left-6 w-28 h-28 bg-white/10 rounded-full border-2 border-white/20 pointer-events-auto flex items-center justify-center backdrop-blur-sm"
              ref={joystickRef}
              onTouchStart={(e) => {
                e.preventDefault();
                setJoystickActive(true);
                handleJoystickMove(e);
              }}
              onTouchMove={(e) => {
                e.preventDefault();
                handleJoystickMove(e);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleJoystickEnd();
              }}
              onMouseDown={(e) => {
                setJoystickActive(true);
                handleJoystickMove(e);
              }}
              onMouseMove={handleJoystickMove}
              onMouseUp={handleJoystickEnd}
              onMouseLeave={handleJoystickEnd}
            >
              <div
                className="w-10 h-10 bg-white/50 rounded-full shadow-lg pointer-events-none transition-transform duration-75"
                style={{
                  transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
                }}
              />
            </div>

            {/* Action Buttons - Right Side */}
            <div className="absolute bottom-6 right-6 flex gap-3 pointer-events-auto">
              <button
                className="w-14 h-14 bg-white/10 rounded-full border-2 border-white/20 text-white font-bold backdrop-blur-sm active:bg-white/30 active:scale-95 transition-all flex items-center justify-center"
                onTouchStart={(e) => {
                  e.preventDefault();
                  setVirtualButton("run", true);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  setVirtualButton("run", false);
                }}
                onMouseDown={() => setVirtualButton("run", true)}
                onMouseUp={() => setVirtualButton("run", false)}
                onMouseLeave={() => setVirtualButton("run", false)}
              >
                RUN
              </button>
              <button
                className="w-14 h-14 bg-white/10 rounded-full border-2 border-white/20 text-white font-bold backdrop-blur-sm active:bg-white/30 active:scale-95 transition-all flex items-center justify-center"
                onTouchStart={(e) => {
                  e.preventDefault();
                  setVirtualButton("interact", true);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  setVirtualButton("interact", false);
                }}
                onMouseDown={() => setVirtualButton("interact", true)}
                onMouseUp={() => setVirtualButton("interact", false)}
                onMouseLeave={() => setVirtualButton("interact", false)}
              >
                ACT
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
            <p className="text-xs text-slate-400 mb-5 text-center">
              Hindari seluruh bahaya dan capai Gerbang Utama secepat mungkin.
            </p>

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
