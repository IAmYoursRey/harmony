/**
 * Client Service for Hotspot Historical Repository & Timeline
 * Connects to Harmony Hotspot Repository API with localStorage offline persistence.
 */

import { apiClient } from '@/services/apiClient';

export interface TimelineSnapshotMeta {
  id: string;
  snapshotDate: string; // e.g. '2026-10-07'
  fetchedAt: string; // ISO string
  year: number;
  scope: 'indonesia' | 'java' | 'aoi' | string;
  recordCount: number;
  sensors: string;
  notes?: string;
  isBaseline?: boolean;
  summary?: {
    total: number;
    highConfidence: number;
    nominalConfidence: number;
    lowConfidence: number;
    maxFrpMw: number | null;
    sensorBreakdown: Record<string, number>;
  };
}

export interface FullHotspotSnapshot extends TimelineSnapshotMeta {
  rawCsv: string;
  source: string;
  data?: any[];
}

const LOCAL_STORAGE_KEY = 'harmony_hotspot_snapshots_v1';
const MAX_LOCAL_SNAPSHOTS = 20;

class HotspotRepositoryClient {
  /**
   * Save a snapshot into browser localStorage for instant zero-latency offline recovery
   */
  public saveToLocalStorage(snapshot: FullHotspotSnapshot): void {
    try {
      const stored = this.getLocalSnapshots();
      const existingIdx = stored.findIndex((s) => s.id === snapshot.id);
      if (existingIdx >= 0) {
        stored[existingIdx] = snapshot;
      } else {
        stored.unshift(snapshot);
      }
      const trimmed = stored.slice(0, MAX_LOCAL_SNAPSHOTS);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Could not save snapshot to localStorage:', e);
    }
  }

  /**
   * Get all local snapshots saved in the browser
   */
  public getLocalSnapshots(): FullHotspotSnapshot[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Retrieve latest local snapshot matching scope
   */
  public getLatestLocalSnapshot(scope?: string): FullHotspotSnapshot | null {
    const list = this.getLocalSnapshots();
    if (!list.length) return null;
    if (scope && scope !== 'all') {
      const match = list.find((s) => s.scope === scope && s.recordCount > 0);
      if (match) return match;
    }
    return list[0] || null;
  }

  /**
   * Fetch timeline list from backend repository, with offline fallback to localStorage
   */
  public async listTimeline(params: { scope?: string; year?: number | string } = {}): Promise<{
    snapshots: TimelineSnapshotMeta[];
    availableYears: number[];
    totalCount: number;
    isOfflineFallback?: boolean;
  }> {
    try {
      const q = new URLSearchParams();
      if (params.scope) q.set('scope', params.scope);
      if (params.year && params.year !== 'all') q.set('year', String(params.year));

      const res = await apiClient.get<{
        success: boolean;
        snapshots: TimelineSnapshotMeta[];
        availableYears: number[];
        totalCount: number;
      }>(`/api/spatial/hotspots/timeline?${q.toString()}`, { ttl: 60000 });

      if (res && res.success && Array.isArray(res.snapshots)) {
        return {
          snapshots: res.snapshots,
          availableYears: res.availableYears || [],
          totalCount: res.totalCount || res.snapshots.length,
          isOfflineFallback: false,
        };
      }
    } catch (err) {
      console.warn('API timeline fetch failed, checking localStorage fallback:', err);
    }

    // Offline / Network Fallback to local storage
    const local = this.getLocalSnapshots();
    let filtered = [...local];
    if (params.scope && params.scope !== 'all') {
      filtered = filtered.filter((s) => s.scope === params.scope);
    }
    if (params.year && params.year !== 'all') {
      filtered = filtered.filter((s) => s.year === Number(params.year));
    }
    const years = Array.from(new Set(local.map((s) => s.year))).sort((a, b) => b - a);

    return {
      snapshots: filtered.map((s) => ({
        id: s.id,
        snapshotDate: s.snapshotDate,
        fetchedAt: s.fetchedAt,
        year: s.year,
        scope: s.scope,
        recordCount: s.recordCount,
        sensors: s.sensors,
        notes: s.notes,
        isBaseline: s.isBaseline,
        summary: s.summary,
      })),
      availableYears: years,
      totalCount: filtered.length,
      isOfflineFallback: true,
    };
  }

  /**
   * Retrieve a full snapshot by ID from backend or localStorage
   */
  public async getSnapshotById(id: string): Promise<FullHotspotSnapshot | null> {
    // Check local storage first
    const local = this.getLocalSnapshots().find((s) => s.id === id);
    if (local && local.rawCsv) {
      return local;
    }

    try {
      const res = await apiClient.get<{
        success: boolean;
        snapshot: FullHotspotSnapshot;
      }>(`/api/spatial/hotspots/timeline/${encodeURIComponent(id)}`, { ttl: 60000 });

      if (res && res.success && res.snapshot) {
        this.saveToLocalStorage(res.snapshot);
        return res.snapshot;
      }
    } catch (err) {
      console.warn('Failed to fetch snapshot by id:', err);
    }

    return local || null;
  }

  /**
   * Persist a new snapshot to both backend and localStorage
   */
  public async saveSnapshot(payload: {
    rawCsv: string;
    scope?: string;
    dayRange?: number;
    snapshotDate?: string;
    notes?: string;
    source?: string;
  }): Promise<FullHotspotSnapshot | null> {
    try {
      const res = await apiClient.post<{
        success: boolean;
        snapshot: FullHotspotSnapshot;
      }>('/api/spatial/hotspots/snapshot', payload);

      if (res && res.success && res.snapshot) {
        this.saveToLocalStorage(res.snapshot);
        return res.snapshot;
      }
    } catch (err) {
      console.warn('Could not save snapshot to backend, saving locally:', err);
    }

    // Local save fallback
    const now = new Date();
    const dateStr = payload.snapshotDate || now.toISOString().slice(0, 10);
    const lines = payload.rawCsv.trim().split(/\r?\n/);
    const count = Math.max(0, lines.length - 1);
    const fallbackSnap: FullHotspotSnapshot = {
      id: `local-snap-${Date.now().toString(36)}`,
      snapshotDate: dateStr,
      fetchedAt: now.toISOString(),
      year: parseInt(dateStr.slice(0, 4), 10),
      scope: (payload.scope as any) || 'indonesia',
      recordCount: count,
      sensors: 'VIIRS & MODIS',
      notes: payload.notes || 'Snapshot Lokal Tersimpan',
      rawCsv: payload.rawCsv,
      source: payload.source || 'USER_SAVED',
    };
    this.saveToLocalStorage(fallbackSnap);
    return fallbackSnap;
  }
}

export const hotspotRepositoryClient = new HotspotRepositoryClient();
