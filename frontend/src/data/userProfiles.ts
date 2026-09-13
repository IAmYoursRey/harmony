import { apiClient } from '../services/apiClient';

export type Gender = 'male' | 'female' | 'other';
export interface TopicScore {
  totalAttempts: number;
  totalScore: number;
  averageScore: number;
  lastAttempt: string;
  currentLevel?: 'pemula' | 'menengah' | 'mahir';
  sessionsAtCurrentLevel: number;
  isFirstAttempt: boolean;
  weakTopics: string[];
  strongTopics: string[];
}

export interface UserProfile {
  userId: string;
  gender: Gender;
  grade: 'X' | 'XI' | 'XII';
  classSection: string;
  schoolId: string;
  schoolName?: string;
  province?: string;
  regency?: string;
  /** classId links a student to a Class entity (classes[] in database). Optional for backward compatibility with legacy profiles. */
  classId?: string;
  supervisedClasses?: { grade: 'X' | 'XI' | 'XII'; section: string }[];
  dateOfBirth?: string;
  phone?: string;
  avatar?: string;
  topicScores: Record<string, TopicScore>;
  masteredConcepts?: string[];
  totalPoints: number;
  badges: string[];
  lastUpdated: string;
  activities?: { title: string; status: string; timestamp: string; type: 'quiz' | 'simulation' }[];
  pointsHistory?: { date: string; points: number }[];
}

export function createInitialTopicScore(): TopicScore {
  return {
    totalAttempts: 0,
    totalScore: 0,
    averageScore: 0,
    lastAttempt: new Date().toISOString(),
    sessionsAtCurrentLevel: 0,
    isFirstAttempt: true,
    weakTopics: [],
    strongTopics: []
  };
}

export async function getProfile(): Promise<UserProfile | undefined> {
  try {
    const data = await apiClient.get('/api/profile');
    return data.profile;
  } catch {
    return undefined;
  }
}

export async function createProfile(
  userId: string, // Not strictly needed as token provides it, but keeping signature
  gender: Gender,
  grade: 'X' | 'XI' | 'XII',
  classSection: string,
  schoolId: string,
  dateOfBirth?: string,
  supervisedClasses?: { grade: 'X' | 'XI' | 'XII'; section: string }[],
  classId?: string
): Promise<UserProfile | undefined> {
  try {
    const newProfile = {
      gender, grade, classSection, schoolId, dateOfBirth, supervisedClasses,
      classId, topicScores: {}, totalPoints: 0, badges: []
    };
    const data = await apiClient.post('/api/profile', newProfile);
    return data.profile;
  } catch {
    return undefined;
  }
}

export async function updateProfile(
  updates: Partial<Omit<UserProfile, 'userId'>>,
  targetUserId?: string
): Promise<UserProfile | undefined> {
  try {
    const data = await apiClient.post('/api/profile', updates);
    return data.profile;
  } catch {
    return undefined;
  }
}

export async function getAllProfiles(): Promise<UserProfile[]> {
  try {
    const data = await apiClient.get('/api/profile/all');
    return data.profiles || [];
  } catch {
    return [];
  }
}

export function buildAISummary(profile: UserProfile | null, userName?: string): string {
  if (!profile) return 'Tidak ada data profil.';
  const nameStr = userName ? `Siswa bernama ${userName} ` : 'Siswa ';
  return `${nameStr} berada di kelas ${profile.grade} ${profile.classSection}. ` +
         `Total Poin: ${profile.totalPoints}. ` +
         `Topik lemah: ${Object.values(profile.topicScores).flatMap(t => t.weakTopics).join(', ') || 'Belum ada'}.`;
}

export async function recordQuizSession(
  userId: string,
  topic: string,
  score: number,
  weakSubTopics: string[],
  strongSubTopics: string[]
): Promise<void> {
  const profile = await getProfile();
  if (!profile) return;
  const current = profile.topicScores[topic] || createInitialTopicScore();
  current.totalAttempts += 1;
  current.totalScore += score;
  current.averageScore = current.totalScore / current.totalAttempts;
  current.lastAttempt = new Date().toISOString();
  current.isFirstAttempt = false;
  current.sessionsAtCurrentLevel += 1;
  const weakSet = new Set([...current.weakTopics, ...weakSubTopics]);
  strongSubTopics.forEach(s => weakSet.delete(s));
  current.weakTopics = Array.from(weakSet);
  current.strongTopics = Array.from(new Set([...current.strongTopics, ...strongSubTopics]));
  const activities = profile.activities || [];
  activities.unshift({
    title: `Quiz: ${topic}`,
    status: `${score}/100`,
    timestamp: new Date().toISOString(),
    type: 'quiz'
  });
  if (activities.length > 10) activities.pop();

  const pointsHistory = profile.pointsHistory || [];
  const today = new Date().toISOString().split('T')[0];
  const newTotal = profile.totalPoints + score;
  
  const lastHistory = pointsHistory.length > 0 ? pointsHistory[pointsHistory.length - 1] : null;
  if (lastHistory && lastHistory.date === today) {
    lastHistory.points = newTotal;
  } else {
    pointsHistory.push({ date: today, points: newTotal });
  }

  const newScores = { ...profile.topicScores, [topic]: current };
  await updateProfile({ 
    topicScores: newScores, 
    totalPoints: newTotal,
    activities,
    pointsHistory
  });
}

export async function recordSmartSimulationAnswers(
  userId: string,
  masteredConcepts: string[],
  pointsEarned: number
): Promise<void> {
  const profile = await getProfile();
  if (!profile) return;
  
  const newMastered = Array.from(new Set([...(profile.masteredConcepts || []), ...masteredConcepts]));
  const newTotal = profile.totalPoints + pointsEarned;
  const activities = profile.activities || [];
  activities.unshift({
    title: `Smart Simulation`,
    status: `+${pointsEarned} Pts`,
    timestamp: new Date().toISOString(),
    type: 'simulation'
  });
  if (activities.length > 10) activities.pop();

  const pointsHistory = profile.pointsHistory || [];
  const today = new Date().toISOString().split('T')[0];
  
  const lastHistory = pointsHistory.length > 0 ? pointsHistory[pointsHistory.length - 1] : null;
  if (lastHistory && lastHistory.date === today) {
    lastHistory.points = newTotal;
  } else {
    pointsHistory.push({ date: today, points: newTotal });
  }

  await updateProfile({ 
    totalPoints: newTotal, 
    masteredConcepts: newMastered,
    activities,
    pointsHistory
  });
}

export async function getGSS(schoolId?: string): Promise<any> {
  try {
    const url = schoolId ? `/api/profile/gss?schoolId=${encodeURIComponent(schoolId)}` : '/api/profile/gss';
    const data = await apiClient.get(url);
    return data.gss;
  } catch {
    return null;
  }
}
