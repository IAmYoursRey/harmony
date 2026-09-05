import { apiClient } from '@/services/apiClient';
import type { GridMap, DisasterSimulation, GameRoom } from '@/components/dashboard/views/spatial/digital-twin/types';

const BASE = '/api/digital-twin';

// ─── Grid Maps ────────────────────────────────────────────────

export async function fetchMaps(schoolId: string): Promise<GridMap[]> {
  const { data } = await apiClient.get(`${BASE}/maps?schoolId=${schoolId}`);
  return data || [];
}

export async function createMap(payload: Partial<GridMap>): Promise<GridMap> {
  const { data } = await apiClient.post(`${BASE}/maps`, payload);
  return data;
}

export async function fetchMap(mapId: string): Promise<GridMap> {
  const { data } = await apiClient.get(`${BASE}/maps/${mapId}`);
  return data;
}

export async function updateMap(mapId: string, payload: Partial<GridMap>): Promise<GridMap> {
  const { data } = await apiClient.put(`${BASE}/maps/${mapId}`, payload);
  return data;
}

export async function deleteMap(mapId: string): Promise<void> {
  await apiClient.delete(`${BASE}/maps/${mapId}`);
}

// ─── Simulations ─────────────────────────────────────────────

export async function fetchSimulations(schoolId: string): Promise<DisasterSimulation[]> {
  const { data } = await apiClient.get(`${BASE}/simulations?schoolId=${schoolId}`);
  return data || [];
}

export async function createSimulation(payload: Partial<DisasterSimulation>): Promise<DisasterSimulation> {
  const { data } = await apiClient.post(`${BASE}/simulations`, payload);
  return data;
}

export async function fetchSimulation(simId: string): Promise<DisasterSimulation> {
  const { data } = await apiClient.get(`${BASE}/simulations/${simId}`);
  return data;
}

export async function updateSimulation(simId: string, payload: Partial<DisasterSimulation>): Promise<DisasterSimulation> {
  const { data } = await apiClient.put(`${BASE}/simulations/${simId}`, payload);
  return data;
}

export async function deleteSimulation(simId: string): Promise<void> {
  await apiClient.delete(`${BASE}/simulations/${simId}`);
}

// ─── Rooms ────────────────────────────────────────────────────

export async function fetchRooms(schoolId: string): Promise<GameRoom[]> {
  const { data } = await apiClient.get(`${BASE}/rooms?schoolId=${schoolId}`);
  return data || [];
}

export async function createRoom(payload: Partial<GameRoom>): Promise<GameRoom> {
  const { data } = await apiClient.post(`${BASE}/rooms`, payload);
  return data;
}

export async function fetchRoom(roomId: string): Promise<GameRoom> {
  const { data } = await apiClient.get(`${BASE}/rooms/${roomId}`);
  return data;
}

export async function joinRoom(roomId: string): Promise<GameRoom> {
  const { data } = await apiClient.post(`${BASE}/rooms/${roomId}/join`, {});
  return data;
}

export async function startRoom(roomId: string): Promise<GameRoom> {
  const { data } = await apiClient.post(`${BASE}/rooms/${roomId}/start`, {});
  return data;
}

export async function endRoom(roomId: string): Promise<GameRoom> {
  const { data } = await apiClient.post(`${BASE}/rooms/${roomId}/end`, {});
  return data;
}

export async function submitResult(roomId: string, result: {
  outcome: 'success' | 'failed';
  completionTimeSeconds?: number;
  hpRemaining?: number;
  damageTaken: number;
  distanceTravelled: number;
  hazardsEncountered: string[];
}): Promise<void> {
  await apiClient.post(`${BASE}/rooms/${roomId}/result`, result);
}

export async function fetchRoomResults(roomId: string): Promise<unknown[]> {
  const { data } = await apiClient.get(`${BASE}/rooms/${roomId}/results`);
  return data || [];
}

export async function syncPlayer(roomId: string, payload: {
  x: number;
  y: number;
  hp: number;
  status: string;
}): Promise<{ roomStatus: string; players: any[] }> {
  const { data } = await apiClient.post(`${BASE}/rooms/${roomId}/sync`, payload);
  return data;
}
