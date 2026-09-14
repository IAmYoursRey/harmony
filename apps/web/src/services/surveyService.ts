import { apiClient } from "./apiClient";

export interface SurveyEntry {
  id: string;
  userId: string;
  schoolId: string;
  answers: Record<string, number>;
  score: number | null;
  completed: boolean;
  submittedAt: string;
}

export interface SurveyStats {
  totalRespondents: number;
  averageScore: number;
  completionRate: number;
  totalSurveys: number;
  scoreDistribution?: { name: string; value: number }[];
  vulnerabilityCategories?: { name: string; value: number }[];
}

export interface SurveyData {
  surveys: SurveyEntry[];
  stats: SurveyStats;
}

export async function getSurveyStats(schoolId?: string): Promise<SurveyData> {
  const url = schoolId
    ? `/api/surveys?schoolId=${encodeURIComponent(schoolId)}`
    : "/api/surveys";
  return apiClient.get(url);
}

export async function submitSurvey(
  schoolId: string,
  answers: Record<string, number>,
  score?: number,
): Promise<{ success: boolean; survey: SurveyEntry }> {
  return apiClient.post("/api/surveys", { schoolId, answers, score });
}
