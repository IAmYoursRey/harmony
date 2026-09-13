import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import type {
  GameRoom,
  GameState,
  GridMap,
  DisasterSimulation,
} from "../types";
import { fetchMap } from "@/services/digitalTwinService";
import {
  fetchSimulation,
  submitResult,
  syncPlayer,
} from "@/services/digitalTwinService";
import {
  buildInitialGameState,
  tickGame,
  movePlayer,
  getHazardCells,
} from "../game/gameEngine";
import { GameCanvas } from "../game/GameCanvas";
import { GameHUD } from "../game/GameHUD";
import { VirtualJoystick } from "../game/VirtualJoystick";
import { GameResult } from "../game/GameResult";

interface Props {
  room: GameRoom;
  onExit: () => void;
}

export function GameView({ room, onExit }: Props) {
  const { currentUser, currentProfile } = useAuth();
  const { show } = useToast();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [resultSubmitted, setResultSubmitted] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTickRef = useRef<number>(Date.now());
  const gameStateRef = useRef<GameState | null>(null);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    async function load() {
      try {
        const [map, simulation] = await Promise.all([
          fetchMap(room.mapId),
          fetchSimulation(room.simulationId),
        ]);
        let finalSimulation = { ...simulation };

        if (currentProfile?.topicScores) {
          const disasterToTopic: Record<string, string> = {
            earthquake: "Gempa Bumi",
            flood: "Banjir",
            fire: "Kebakaran",
            storm: "Angin Puting Beliung",
            landslide: "Tanah Longsor",
            tsunami: "Tsunami",
          };

          const topicLabel = disasterToTopic[simulation.disasterType];
          const topicScore = currentProfile.topicScores[topicLabel];

          if (topicScore) {
            const isWeak =
              topicScore.averageScore < 60 ||
              (topicScore.weakTopics && topicScore.weakTopics.length > 0);

            if (isWeak) {
              finalSimulation = {
                ...finalSimulation,
                durationSeconds: Math.max(
                  30,
                  Math.floor(finalSimulation.durationSeconds * 0.8),
                ), // 20% less time
                hazards: (finalSimulation.hazards || [])
                  .filter(Boolean)
                  .map((h) => ({
                    ...h,
                    damagePerSecond: h.damagePerSecond * 1.5, // 50% more damage
                    radius: h.radius + 1, // Increase hazard radius by 1 cell
                  })),
              };
            }
          }
        }

        finalSimulation = {
          ...finalSimulation,
          hazards: (finalSimulation.hazards || []).filter(Boolean),
          events: (finalSimulation.events || []).filter(Boolean),
        };

        const state = buildInitialGameState(
          room.id,
          currentUser?.id || "anon",
          map,
          finalSimulation,
        );
        setGameState(state);
      } catch (_e) {
        setLoadError("Gagal memuat data simulasi.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [room.mapId, room.simulationId, room.id, currentUser?.id]);

  useEffect(() => {
    if (!gameState || gameState.phase === "spawned") return;
    if (gameState.phase === "won" || gameState.phase === "lost") {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }

    lastTickRef.current = Date.now();
    tickRef.current = setInterval(() => {
      const now = Date.now();
      const delta = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      setGameState((prev) => (prev ? tickGame(prev, delta) : null));
    }, 500); // tick every 500ms

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [gameState?.phase]);

  useEffect(() => {
    if (!gameState || resultSubmitted) return;
    if (gameState.phase !== "won" && gameState.phase !== "lost") return;
    setResultSubmitted(true);
    submitResult(room.id, {
      outcome: gameState.phase === "won" ? "success" : "failed",
      completionTimeSeconds:
        gameState.phase === "won"
          ? Math.round(gameState.elapsedSeconds)
          : undefined,
      hpRemaining: Math.round(gameState.player.hp),
      damageTaken: Math.round(gameState.player.maxHp - gameState.player.hp),
      distanceTravelled: gameState.player.distanceTravelled,
      hazardsEncountered: [],
    }).catch(() => {
      /* silent */
    });
  }, [gameState?.phase, resultSubmitted, room.id]);

  useEffect(() => {
    if (gameState?.phase !== "running") return;
    const interval = setInterval(async () => {
      const current = gameStateRef.current;
      if (!current) return;
      try {
        const { roomStatus } = await syncPlayer(room.id, {
          x: current.player.x,
          y: current.player.y,
          hp: current.player.hp,
          status: current.player.status,
        });
        if (roomStatus === "FINISHED" || roomStatus === "CANCELLED") {
          setGameState((prev) => (prev ? { ...prev, phase: "lost" } : null));
          show("Simulasi dihentikan oleh guru.", "error");
        }
      } catch (err) {
        console.warn("Sync failed", err);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState?.phase, room.id, show]);
  const handleMove = useCallback((dir: "up" | "down" | "left" | "right") => {
    setGameState((prev) => (prev ? movePlayer(prev, dir) : null));
  }, []);

  const handleStartGame = useCallback(() => {
    setGameState((prev) => (prev ? { ...prev, phase: "running" } : null));
    show("Simulasi dimulai! Menuju titik aman!", "success");
  }, [show]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, "up" | "down" | "left" | "right"> = {
        ArrowUp: "up",
        w: "up",
        W: "up",
        ArrowDown: "down",
        s: "down",
        S: "down",
        ArrowLeft: "left",
        a: "left",
        A: "left",
        ArrowRight: "right",
        d: "right",
        D: "right",
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        handleMove(dir);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleMove]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-ink-400">
        Memuat simulasi...
      </div>
    );

  if (loadError)
    return <div className="text-center text-red-500 p-8">{loadError}</div>;

  if (!gameState) return null;

  const hazardCells = getHazardCells(gameState.activeHazards, gameState.map);

  if (gameState.phase === "won" || gameState.phase === "lost") {
    return (
      <GameResult
        phase={gameState.phase}
        player={gameState.player}
        elapsedSeconds={gameState.elapsedSeconds}
        onExit={onExit}
      />
    );
  }

  return (
    <div className="space-y-4 select-none">
      {/* HUD */}
      <GameHUD
        hp={gameState.player.hp}
        maxHp={gameState.player.maxHp}
        timerRemaining={gameState.timerRemaining}
        disasterType={gameState.simulation.disasterType}
        phase={gameState.phase}
      />

      {/* Start banner */}
      {gameState.phase === "spawned" && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 text-center">
          <p className="text-sm font-bold text-amber-800 dark:text-amber-200 mb-3">
            Kamu muncul di titik spawn. Siap untuk simulasi evakuasi?
          </p>
          <button
            onClick={handleStartGame}
            className="px-6 py-2.5 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 shadow-[0_0_16px_rgba(217,119,6,0.5)]"
          >
            ▶ Mulai Simulasi
          </button>
        </div>
      )}

      {/* Grid */}
      <GameCanvas
        map={gameState.map}
        playerPos={{ x: gameState.player.x, y: gameState.player.y }}
        hazardCells={hazardCells}
        simulation={gameState.simulation}
      />

      {/* Virtual Joystick (Mobile Overlay) */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 sm:bottom-12 md:hidden">
        <VirtualJoystick
          onMove={handleMove}
          disabled={
            gameState.phase !== "running" || gameState.player.status !== "alive"
          }
        />
      </div>
    </div>
  );
}
