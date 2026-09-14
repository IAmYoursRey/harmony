import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { phase1Api } from "./Phase1API";
import { Phase1Map, Phase1Scenario } from "./Phase1Types";
import { Phase3Engine, PlayerState, SimState } from "./Phase3Engine";
import { useToast } from "@/hooks/useToast";
import { ArrowLeft, Play, RotateCcw, Pause } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { io, Socket } from "socket.io-client";

export function Phase3Runtime({
  mapId,
  scenarioId,
  sessionId,
  onClose,
}: {
  mapId: string;
  scenarioId: string;
  sessionId?: string;
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

  const [avatarColor, setAvatarColor] = useState("#3b82f6");
  const [avatarName, setAvatarName] = useState(user?.name || "Player");
  const [avatarSelected, setAvatarSelected] = useState(false);

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

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (sessionId && user) {
      const url =
        typeof import.meta !== "undefined" && import.meta.env
          ? import.meta.env.VITE_API_URL
          : "http://localhost:3001";
      socketRef.current = io(url || "http://localhost:3001", {
        withCredentials: true,
      });
      const handleConnect = () => {
        console.log(
          "[Phase3Runtime] Socket connected. Emitting join_session:",
          sessionId,
          user.id,
        );
        socketRef.current?.emit("join_session", {
          sessionId,
          participantId: user.id,
          studentId: user.id,
          displayName: user.name || user.email?.split("@")[0] || "Student",
        });
      };

      socketRef.current.on("connect", handleConnect);
      if (socketRef.current.connected) {
        handleConnect();
      }

      socketRef.current.on("remote_player_update", (data) => {
        if (engineRef.current) {
          engineRef.current.updateRemotePlayer(data.participantId, data);
        }
      });

      socketRef.current.on("remote_player_disconnect", (data) => {
        if (engineRef.current) {
          engineRef.current.removeRemotePlayer(data.participantId);
        }
      });

      socketRef.current.on("game_state_update", (data) => {
        if (engineRef.current && user) {
          engineRef.current.syncAuthoritativeState(data, user.id);
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
  }, [sessionId, user]);

  const initEngine = () => {
    if (!canvasRef.current || !map || !scenario) return;
    console.log("INIT ENGINE WITH MAP FLOORS:", map.floors);

    if (containerRef.current) {
      canvasRef.current.width = containerRef.current.clientWidth;
      canvasRef.current.height = containerRef.current.clientHeight;
    }

    if (engineRef.current) {
      engineRef.current.destroy();
    }

    engineRef.current = new Phase3Engine(canvasRef.current, map, scenario, {
      onStateChange: (state) => setSimState(state),
      onPlayerUpdate: (player) => setPlayerState(player),
      onTimeUpdate: (ms) => setTimeMs(ms),
      onMessage: (msg) => {
        setMessage(msg);
        setTimeout(() => setMessage(""), 3000);
      },
      onFloorChange: (fname) => setActiveFloorName(fname),
      onDebugUpdate: (info) => setDebugInfo(info),
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
    });

    engineRef.current.setPlayerAvatar(avatarColor, avatarName);
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
        <div className="absolute top-0 left-0 right-0 p-2 sm:p-4 flex flex-wrap sm:flex-nowrap justify-between items-start z-10 pointer-events-none gap-2">
          {/* Left HUD: HP & Floor */}
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <div className="bg-slate-900/80 backdrop-blur border border-slate-700 rounded-xl p-2 sm:p-3 flex flex-col gap-1 sm:gap-2 w-full sm:w-64 shadow-xl">
              <div className="flex flex-col gap-1">
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

              <div className="flex flex-col gap-1">
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

            <div className="bg-slate-900/80 backdrop-blur border border-slate-700 text-white rounded-xl px-3 py-1 sm:px-4 sm:py-2 font-bold shadow-xl inline-flex w-max items-center gap-2 text-xs sm:text-base">
              <span className="text-slate-400 text-[10px] sm:text-xs uppercase">
                Floor:
              </span>{" "}
              {activeFloorName}
            </div>
          </div>

          {/* Center HUD: Objective */}
          <div className="bg-slate-900/80 backdrop-blur border border-slate-700 rounded-xl px-3 py-1.5 sm:px-6 sm:py-3 flex flex-col items-center gap-0.5 sm:gap-1 shadow-xl">
            <span className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
              Current Objective
            </span>
            <span className="text-yellow-400 font-bold text-sm sm:text-lg">
              {playerState.objectiveProgress}
            </span>
          </div>

          {/* Right HUD: Timer & Controls */}
          <div className="flex flex-col items-end gap-1 sm:gap-2 pointer-events-auto">
            <div className="bg-slate-900/80 backdrop-blur border border-slate-700 text-white rounded-xl px-3 py-1 sm:px-6 sm:py-2 font-mono font-bold text-lg sm:text-2xl shadow-xl tracking-wider">
              {formatTime(timeMs)}
            </div>
            <div className="flex gap-1.5 sm:gap-2 mt-1 sm:mt-2">
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

      {/* GAME OVER / SUCCESS SCREENS */}
      {(simState === "FAILED" || simState === "SUCCESS") && (
        <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex items-center justify-center flex-col gap-6">
          {simState === "SUCCESS" ? (
            <div className="text-center space-y-2">
              <h1 className="text-6xl font-black text-green-400 mb-4">
                EVACUATED
              </h1>
              <p className="text-xl text-slate-300 font-medium">
                You reached safety in {formatTime(timeMs)}.
              </p>
            </div>
          ) : (
            <div className="text-center space-y-2">
              <h1 className="text-6xl font-black text-red-500 mb-4">
                HAZARD OVERWHELMED
              </h1>
              <p className="text-xl text-slate-300 font-medium">
                You did not survive the scenario.
              </p>
            </div>
          )}

          <div className="flex gap-4 mt-8">
            <button
              onClick={handleRestart}
              className="px-8 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold shadow-lg transition-colors flex items-center gap-2 text-lg"
            >
              <RotateCcw className="h-5 w-5" /> Retry Scenario
            </button>
            <button
              onClick={onClose}
              className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold shadow-lg transition-colors flex items-center gap-2 text-lg"
            >
              <ArrowLeft className="h-5 w-5" /> Back to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* CANVAS LAYER */}
      <div className="flex-1 w-full h-full relative" ref={containerRef}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-crosshair"
          style={{ imageRendering: "pixelated" }}
        />

        {/* Helper text overlay for WASD */}
        {simState === "RUNNING" && timeMs < 5000 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 font-bold text-sm bg-black/30 px-4 py-2 rounded-lg pointer-events-none transition-opacity duration-1000">
            Use W A S D or Arrow Keys to move
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

      {/* AVATAR SELECTION OVERLAY */}
      {simState === "READY" && !avatarSelected && (
        <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur flex items-center justify-center flex-col gap-6 text-white p-6">
          <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 max-w-sm w-full shadow-2xl flex flex-col items-center">
            <h2 className="text-2xl font-black mb-6">Select Avatar</h2>

            <div
              className="w-24 h-24 rounded-full border-4 shadow-inner mb-6 transition-colors"
              style={{
                backgroundColor: avatarColor,
                borderColor: "rgba(255,255,255,0.2)",
              }}
            />

            <div className="w-full mb-4">
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Name
              </label>
              <input
                type="text"
                value={avatarName}
                onChange={(e) => setAvatarName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl font-bold text-white outline-none focus:border-brand-500"
              />
            </div>

            <div className="w-full mb-8">
              <label className="block text-xs font-bold text-slate-400 mb-2">
                Color
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

            <button
              onClick={() => setAvatarSelected(true)}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold transition-colors text-lg shadow-lg"
            >
              Start Simulation
            </button>
            <button
              onClick={onClose}
              className="w-full py-2 mt-2 text-slate-400 hover:text-white rounded-xl font-bold transition-colors text-sm"
            >
              Cancel
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
  const navigate = useNavigate();
  if (!mapId || !scenarioId) return null;
  return (
    <Phase3Runtime
      mapId={mapId}
      scenarioId={scenarioId}
      onClose={() => navigate("/app/digital-twin")}
    />
  );
}
