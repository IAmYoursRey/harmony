import { apiClient } from "@/services/apiClient";
import { Phase1Map, Phase1Scenario } from "./Phase1Types";

export const phase1Api = {
  async getMaps(schoolId: string): Promise<Phase1Map[]> {
    const { data } = await apiClient.get(
      `/api/digital-twin/phase1/maps?schoolId=${schoolId}`,
    );
    return data || [];
  },

  async createMap(
    schoolId: string,
    name: string,
    description: string = "",
    width: number = 64,
    height: number = 64,
  ): Promise<{ id: string }> {
    return await apiClient.post("/api/digital-twin/phase1/maps", {
      schoolId,
      name,
      description,
      width,
      height,
    });
  },

  async getMapDetails(mapId: string): Promise<Phase1Map> {
    const { data } = await apiClient.get(
      `/api/digital-twin/phase1/maps/${mapId}`,
    );
    return data;
  },

  async saveMap(mapId: string, mapData: Partial<Phase1Map>): Promise<void> {
    await apiClient.put(`/api/digital-twin/phase1/maps/${mapId}`, mapData);
  },

  async deleteMap(mapId: string): Promise<void> {
    await apiClient.delete(`/api/digital-twin/phase1/maps/${mapId}`);
  },

  async createScenario(
    mapId: string,
    name: string,
    disasterType: string,
  ): Promise<{ id: string }> {
    const { data } = await apiClient.post(
      `/api/digital-twin/phase1/maps/${mapId}/scenarios`,
      { name, disaster_type: disasterType },
    );
    return data;
  },

  async getScenarioDetails(scenarioId: string): Promise<Phase1Scenario> {
    const { data } = await apiClient.get(
      `/api/digital-twin/phase1/scenarios/${scenarioId}`,
    );
    return data;
  },

  async updateScenario(
    scenarioId: string,
    scenarioData: Partial<Phase1Scenario>,
  ): Promise<void> {
    await apiClient.put(
      `/api/digital-twin/phase1/scenarios/${scenarioId}`,
      scenarioData,
    );
  },

  async duplicateScenario(scenarioId: string): Promise<{ id: string }> {
    const { data } = await apiClient.post(
      `/api/digital-twin/phase1/scenarios/${scenarioId}/duplicate`,
    );
    return data;
  },

  async deleteScenario(scenarioId: string): Promise<void> {
    await apiClient.delete(`/api/digital-twin/phase1/scenarios/${scenarioId}`);
  },
};
