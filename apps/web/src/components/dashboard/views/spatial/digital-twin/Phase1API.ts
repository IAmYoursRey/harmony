import { apiClient } from "@/services/apiClient";
import { Phase1Map, Phase1Scenario } from "./Phase1Types";

const OFFLINE_MAPS_KEY = "harmony_offline_dt_maps_v1";
const OFFLINE_SCENARIOS_KEY = "harmony_offline_dt_scenarios_v1";

function readStorageJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorageJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

async function buildCanonicalPayload(): Promise<{
  map: Phase1Map;
  scenarios: Phase1Scenario[];
}> {
  const { buildSman1NgoroPdfDigitalTwin } = await import(
    "@/data/sman1NgoroPdfMapBuilder.js"
  );
  const canonical = buildSman1NgoroPdfDigitalTwin();
  const map: Phase1Map = {
    ...canonical.map,
    rooms: canonical.rooms,
    boundaries: canonical.boundaries,
    stairs: [],
    scenarios: canonical.scenarios,
    floors: canonical.floors.map((floor: any) => ({
      ...floor,
      tiles: canonical.tiles,
      objects: canonical.objects,
    })),
  };
  return { map, scenarios: canonical.scenarios as Phase1Scenario[] };
}

export const phase1Api = {
  async getMaps(schoolId: string): Promise<Phase1Map[]> {
    try {
      const { data } = await apiClient.get(
        `/api/digital-twin/phase1/maps?schoolId=${schoolId}`,
      );
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch {
      // Fall through to local offline twin builder
    }

    const customMaps = readStorageJson<Record<string, Phase1Map>>(OFFLINE_MAPS_KEY, {});
    const schoolMaps = Object.values(customMaps).filter((m) => m.school_id === schoolId);
    const { map, scenarios } = await buildCanonicalPayload();
    if (!schoolMaps.some((m) => m.id === map.id)) {
      schoolMaps.unshift({
        ...map,
        scenarios: scenarios.map((sc) => ({ ...sc })),
      });
    }
    return schoolMaps;
  },

  async createMap(
    schoolId: string,
    name: string,
    description: string = "",
    width: number = 64,
    height: number = 64,
  ): Promise<{ id: string }> {
    try {
      return await apiClient.post("/api/digital-twin/phase1/maps", {
        schoolId,
        name,
        description,
        width,
        height,
      });
    } catch {
      const id = `dtmap-local-${Date.now()}`;
      const now = new Date().toISOString();
      const map: Phase1Map = {
        id,
        school_id: schoolId,
        name,
        description,
        width,
        height,
        active_floor_id: `${id}-f1`,
        status: "draft",
        version: 1,
        created_at: now,
        updated_at: now,
        floors: [
          {
            id: `${id}-f1`,
            map_id: id,
            floor_number: 1,
            name: "Lantai 1",
            tiles: [],
            objects: [],
          },
        ],
        boundaries: [],
        stairs: [],
        scenarios: [],
        rooms: [],
      };
      const store = readStorageJson<Record<string, Phase1Map>>(OFFLINE_MAPS_KEY, {});
      store[id] = map;
      writeStorageJson(OFFLINE_MAPS_KEY, store);
      return { id };
    }
  },

  async getMapDetails(mapId: string): Promise<Phase1Map> {
    try {
      const { data } = await apiClient.get(
        `/api/digital-twin/phase1/maps/${mapId}`,
      );
      if (data && data.id) return data;
    } catch {
      // Fall through to local offline twin builder
    }

    const customMaps = readStorageJson<Record<string, Phase1Map>>(OFFLINE_MAPS_KEY, {});
    if (customMaps[mapId]) return customMaps[mapId];

    const { map, scenarios } = await buildCanonicalPayload();
    const customScenarios = Object.values(
      readStorageJson<Record<string, Phase1Scenario>>(OFFLINE_SCENARIOS_KEY, {}),
    ).filter((s) => s.map_id === map.id);
    return {
      ...map,
      scenarios: [...scenarios, ...customScenarios],
    };
  },

  async saveMap(mapId: string, mapData: Partial<Phase1Map>): Promise<void> {
    try {
      await apiClient.put(`/api/digital-twin/phase1/maps/${mapId}`, mapData);
    } catch {
      const store = readStorageJson<Record<string, Phase1Map>>(OFFLINE_MAPS_KEY, {});
      const base = store[mapId] || (await this.getMapDetails(mapId));
      store[mapId] = {
        ...base,
        ...mapData,
        updated_at: new Date().toISOString(),
      };
      writeStorageJson(OFFLINE_MAPS_KEY, store);
    }
  },

  async deleteMap(mapId: string): Promise<void> {
    try {
      await apiClient.delete(`/api/digital-twin/phase1/maps/${mapId}`);
    } catch {
      const store = readStorageJson<Record<string, Phase1Map>>(OFFLINE_MAPS_KEY, {});
      delete store[mapId];
      writeStorageJson(OFFLINE_MAPS_KEY, store);
    }
  },

  async createScenario(
    mapId: string,
    name: string,
    disasterType: string,
  ): Promise<{ id: string }> {
    try {
      const { data } = await apiClient.post(
        `/api/digital-twin/phase1/maps/${mapId}/scenarios`,
        { name, disaster_type: disasterType },
      );
      return data;
    } catch {
      const id = `scn-local-${Date.now()}`;
      const store = readStorageJson<Record<string, Phase1Scenario>>(OFFLINE_SCENARIOS_KEY, {});
      store[id] = {
        id,
        map_id: mapId,
        name,
        disaster_type: disasterType,
        status: "draft",
        version: 1,
        config: {},
        objects: [],
      };
      writeStorageJson(OFFLINE_SCENARIOS_KEY, store);
      return { id };
    }
  },

  async getScenarioDetails(scenarioId: string): Promise<Phase1Scenario> {
    try {
      const { data } = await apiClient.get(
        `/api/digital-twin/phase1/scenarios/${scenarioId}`,
      );
      if (data && data.id) return data;
    } catch {
      // Fall through to local offline twin builder
    }

    const store = readStorageJson<Record<string, Phase1Scenario>>(OFFLINE_SCENARIOS_KEY, {});
    if (store[scenarioId]) return store[scenarioId];

    const { scenarios } = await buildCanonicalPayload();
    const matched = scenarios.find((s) => s.id === scenarioId);
    if (matched) return matched;
    throw new Error("Skenario tidak ditemukan.");
  },

  async updateScenario(
    scenarioId: string,
    scenarioData: Partial<Phase1Scenario>,
  ): Promise<void> {
    try {
      await apiClient.put(
        `/api/digital-twin/phase1/scenarios/${scenarioId}`,
        scenarioData,
      );
    } catch {
      const store = readStorageJson<Record<string, Phase1Scenario>>(OFFLINE_SCENARIOS_KEY, {});
      const base = store[scenarioId] || (await this.getScenarioDetails(scenarioId));
      store[scenarioId] = { ...base, ...scenarioData };
      writeStorageJson(OFFLINE_SCENARIOS_KEY, store);
    }
  },

  async duplicateScenario(scenarioId: string): Promise<{ id: string }> {
    try {
      const { data } = await apiClient.post(
        `/api/digital-twin/phase1/scenarios/${scenarioId}/duplicate`,
        {},
      );
      return data;
    } catch {
      const src = await this.getScenarioDetails(scenarioId);
      const id = `scn-local-${Date.now()}`;
      const store = readStorageJson<Record<string, Phase1Scenario>>(OFFLINE_SCENARIOS_KEY, {});
      store[id] = {
        ...src,
        id,
        name: `${src.name} (Copy)`,
        status: "draft",
      };
      writeStorageJson(OFFLINE_SCENARIOS_KEY, store);
      return { id };
    }
  },

  async deleteScenario(scenarioId: string): Promise<void> {
    try {
      await apiClient.delete(`/api/digital-twin/phase1/scenarios/${scenarioId}`);
    } catch {
      const store = readStorageJson<Record<string, Phase1Scenario>>(OFFLINE_SCENARIOS_KEY, {});
      delete store[scenarioId];
      writeStorageJson(OFFLINE_SCENARIOS_KEY, store);
    }
  },
};
