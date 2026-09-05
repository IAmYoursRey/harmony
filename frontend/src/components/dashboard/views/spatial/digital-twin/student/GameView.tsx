import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {  useToast  } from '@/hooks/useToast';
import type { GameRoom, GameState, GridMap, DisasterSimulation } from '../types';
import { fetchMap } from '@/services/digitalTwinService';
import { fetchSimulation, submitResult, syncPlayer } from '@/services/digitalTwinService';
import { buildInitialGameState, tickGame, movePlayer, getHazardCells } from '../game/gameEngine';
import { GameCanvas } from '../game/GameCanvas';
import { GameHUD } from '../game/GameHUD';
import { VirtualJoystick } from '../game/VirtualJoystick';
import { GameResult } from '../game/GameResult';

interface Props {
  room: GameRoom;
  onExit: () => void;
}

export function GameView({ room, onExit }: Props) {
  const { currentUser } = useAuth();
  const { show } = useToast();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [resultSubmitted, setResultSubmitted] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTickRef = useRef<number>(Date.now());

  // Load map + simulation on mount
  useEffect(() => {
    async function load() {
      try {
        const [map, simulation] = await Promise.all([
          fetchMap(room.mapId),
          fetchSimulation(room.simulationId),
        ]);
        const state = buildInitialGameState(
          room.id,
          currentUser?.id || 'anon',
          map,
          simulation
        );
        setGameState(state);
      } catch (_e) {
        setLoadError('Gagal memuat data simulasi.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [room.mapId, room.simulationId, room.id, currentUser?.id]);

  // Start game loop
  useEffect(() => {
    if (!gameState || gameState.phase === 'spawned') return;
    if (gameState.phase === 'won' || gameState.phase === 'lost') {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }

    lastTickRef.current = Date.now();
    tickRef.current = setInterval(() => {
      const now = Date.now();
      const delta = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      setGameState(prev => prev ? tickGame(prev, delta) : null);
    }, 500); // tick every 500ms

    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [gameState?.phase]);

  // Submit result on game end
  useEffect(() => {
    if (!gameState || resultSubmitted) return;
    if (gameState.phase !== 'won' && gameState.phase !== 'lost') return;
    setResultSubmitted(true);
    submitResult(room.id, {
      outcome: gameState.phase === 'won' ? 'success' : 'failed',
      completionTimeSeconds: gameState.phase === 'won' ? Math.round(gameState.elapsedSeconds) : undefined,
      hpRemaining: Math.round(gameState.player.hp),
      damageTaken: Math.round(gameState.player.maxHp - gameState.player.hp),
      distanceTravelled: gameState.player.distanceTravelled,
      hazardsEncountered: [],
    }).catch(() => { /* silent */ });
  }, [gameState?.phase, resultSubmitted, room.id, gameState]);

  // Telemetry Sync
  useEffect(() => {
    if (!gameState || gameState.phase !== 'running') return;
    const interval = setInterval(async () => {
      try {
        const { roomStatus } = await syncPlayer(room.id, {
          x: gameState.player.x,
          y: gameState.player.y,
          hp: gameState.player.hp,
          status: gameState.player.status,
        });
        if (roomStatus === 'FINISHED' || roomStatus === 'CANCELLED') {
          // Force end if teacher stops
          setGameState(prev => prev ? { ...prev, phase: 'lost' } : null);
          show('Simulasi dihentikan oleh guru.', 'error');
        }
      } catch (err) {
        console.warn('Sync failed', err);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState?.phase, gameState?.player.x, gameState?.player.y, gameState?.player.hp, gameState?.player.status, room.id, show]);
  const handleMove = useCallback((dir: 'up' | 'down' | 'left' | 'right') => {
    setGameState(prev => prev ? movePlayer(prev, dir) : null);
  }, []);

  const handleStartGame = useCallback(() => {
    setGameState(prev => prev ? { ...prev, phase: 'running' } : null);
    show('Simulasi dimulai! Menuju titik aman!', 'success');
  }, [show]);

  // Keyboard handling
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, 'up' | 'down' | 'left' | 'right'> = {
        ArrowUp: 'up', w: 'up', W: 'up',
        ArrowDown: 'down', s: 'down', S: 'down',
        ArrowLeft: 'left', a: 'left', A: 'left',
        ArrowRight: 'right', d: 'right', D: 'right',
      };
      const dir = map[e.key];
      if (dir) { e.preventDefault(); handleMove(dir); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleMove]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-ink-400">
      Memuat simulasi...
    </div>
  );

  if (loadError) return (
    <div className="text-center text-red-500 p-8">{loadError}</div>
  );

  if (!gameState) return null;

  const hazardCells = getHazardCells(gameState.activeHazards, gameState.map);

  // Game result screen
  if (gameState.phase === 'won' || gameState.phase === 'lost') {
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
      {gameState.phase === 'spawned' && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 text-center">
          <p className="text-sm font-bold text-amber-800 dark:text-amber-200 mb-3">
            Kamu muncul di titik spawn. Siap untuk simulasi evakuasi?
          </p>
          <button onClick={handleStartGame}
            className="px-6 py-2.5 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 shadow-[0_0_16px_rgba(217,119,6,0.5)]">
            ▶ Mulai Simulasi
          </button>
        </div>
      )}

      {/* Grid */}
      <GameCanvas
        map={gameState.map}
        playerPos={{ x: gameState.player.x, y: gameState.player.y }}
        hazardCells={hazardCells}
        safePointIds={gameState.simulation.safePointIds}
      />

      {/* Virtual Joystick */}
      <VirtualJoystick
        onMove={handleMove}
        disabled={gameState.phase !== 'running' || gameState.player.status !== 'alive'}
      />
    </div>
  );
}
