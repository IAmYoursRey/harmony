// src/data/userProfiles.ts
// Stores per-user learning capability profiles, quiz history, and adaptive level data.

const PROFILES_KEY = 'geosense_profiles';

export type DisasterLevel = 'pemula' | 'menengah' | 'mahir';
export type Gender = 'male' | 'female' | 'other';

export interface TopicScore {
  totalAttempts: number;
  totalScore: number;       // cumulative raw score (0-100 per session)
  averageScore: number;     // 0-100
  currentLevel: DisasterLevel;
  lastAttempt: string;      // ISO date string
  sessionsAtCurrentLevel: number; // sessions completed at this level
  isFirstAttempt: boolean;  // true = show initial diagnostic test (5 questions)
  weakTopics: string[];     // sub-topics with < 60% correct in last session
  strongTopics: string[];   // sub-topics with > 80% correct in last session
}

export interface UserProfile {
  userId: string;
  gender: Gender;
  grade: 'X' | 'XI' | 'XII'; // e.g. "X", "XI", "XII"
  classSection: string;      // e.g. "1", "IPA 2"
  schoolId: string;
  supervisedClasses?: { grade: 'X' | 'XI' | 'XII'; section: string }[]; // Only for teachers
  dateOfBirth?: string;
  topicScores: Record<string, TopicScore>;
  totalPoints: number;
  badges: string[];
  lastUpdated: string;
}

// -- Default/initial topic score -----------------------------------------------

export function createInitialTopicScore(): TopicScore {
  return {
    totalAttempts: 0,
    totalScore: 0,
    averageScore: 0,
    currentLevel: 'pemula',
    lastAttempt: '',
    sessionsAtCurrentLevel: 0,
    isFirstAttempt: true,
    weakTopics: [],
    strongTopics: [],
  };
}

// -- Storage helpers -----------------------------------------------------------

export function getAllProfiles(): UserProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAllProfiles(profiles: UserProfile[]): void {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

// -- CRUD ---------------------------------------------------------------------

export function getProfile(userId: string): UserProfile | undefined {
  return getAllProfiles().find(p => p.userId === userId);
}

export function createProfile(
  userId: string,
  gender: Gender,
  grade: 'X' | 'XI' | 'XII',
  classSection: string,
  schoolId: string,
  dateOfBirth?: string,
  supervisedClasses?: { grade: 'X' | 'XI' | 'XII'; section: string }[]
): UserProfile {
  const newProfile: UserProfile = {
    userId,
    gender,
    grade,
    classSection,
    schoolId,
    supervisedClasses,
    dateOfBirth,
    topicScores: {},
    totalPoints: 0,
    badges: [],
    lastUpdated: new Date().toISOString(),
  };
  const profiles = getAllProfiles();
  saveAllProfiles([...profiles.filter(p => p.userId !== userId), newProfile]);
  return newProfile;
}

export function updateProfile(userId: string, updates: Partial<Omit<UserProfile, 'userId'>>): void {
  const profiles = getAllProfiles().map(p =>
    p.userId === userId ? { ...p, ...updates, lastUpdated: new Date().toISOString() } : p
  );
  saveAllProfiles(profiles);
}

// -- Topic score helpers -------------------------------------------------------

/**
 * Call after a quiz session ends.
 * Calculates running average, detects level-up (>80% avg over 3 sessions),
 * and awards bonus points.
 */
export function recordQuizSession(
  userId: string,
  topic: string,
  sessionScore: number,       // 0-100
  weakSubTopics: string[],
  strongSubTopics: string[],
  pointsEarned: number
): { levelUp: boolean; newLevel: DisasterLevel; badge?: string } {
  const profile = getProfile(userId);
  if (!profile) return { levelUp: false, newLevel: 'pemula' };

  const existing: TopicScore = profile.topicScores[topic] ?? createInitialTopicScore();

  const newTotalAttempts = existing.totalAttempts + 1;
  const newTotalScore = existing.totalScore + sessionScore;
  const newAverage = Math.round(newTotalScore / newTotalAttempts);

  let newLevel = existing.currentLevel;
  let sessionsAtLevel = existing.sessionsAtCurrentLevel + 1;
  let levelUp = false;
  let badge: string | undefined;

  // Level-up threshold: avg > 80 over last 3 sessions at current level
  if (newAverage >= 80 && sessionsAtLevel >= 3) {
    if (existing.currentLevel === 'pemula') {
      newLevel = 'menengah';
      levelUp = true;
      sessionsAtLevel = 0;
      badge = `?? Lulus Level Pemula - ${topic}`;
    } else if (existing.currentLevel === 'menengah') {
      newLevel = 'mahir';
      levelUp = true;
      sessionsAtLevel = 0;
      badge = `?? Lulus Level Menengah - ${topic}`;
    }
  }

  const updatedScore: TopicScore = {
    totalAttempts: newTotalAttempts,
    totalScore: newTotalScore,
    averageScore: newAverage,
    currentLevel: newLevel,
    lastAttempt: new Date().toISOString(),
    sessionsAtCurrentLevel: sessionsAtLevel,
    isFirstAttempt: false,
    weakTopics: weakSubTopics,
    strongTopics: strongSubTopics,
  };

  const newBadges = badge ? [...profile.badges, badge] : profile.badges;

  updateProfile(userId, {
    topicScores: { ...profile.topicScores, [topic]: updatedScore },
    totalPoints: profile.totalPoints + pointsEarned,
    badges: newBadges,
  });

  return { levelUp, newLevel, badge };
}

/**
 * Returns a human-readable summary of the user's capability profile
 * for injection into AI system prompts.
 */
export function buildAISummary(profile: UserProfile, userName: string): string {
  const topics = Object.entries(profile.topicScores);
  if (topics.length === 0) {
    return `Nama siswa: ${userName}. Kelas: ${profile.grade}. Siswa ini baru bergabung dan belum pernah mengerjakan soal sebelumnya.`;
  }

  const strong = topics.filter(([, s]) => s.averageScore >= 75).map(([t]) => t);
  const weak = topics.filter(([, s]) => s.averageScore < 60).map(([t]) => t);
  const levels = topics.map(([t, s]) => `${t} (${s.currentLevel}, rata-rata ${s.averageScore}%)`).join(', ');

  return `
Nama siswa: ${userName}. Kelas: ${profile.grade}. Jenis kelamin: ${profile.gender === 'male' ? 'Laki-laki' : profile.gender === 'female' ? 'Perempuan' : 'Lainnya'}.
Total poin: ${profile.totalPoints}. Lencana: ${profile.badges.length > 0 ? profile.badges.join(', ') : 'Belum ada'}.
Topik & level kemampuan: ${levels}.
${strong.length > 0 ? `Topik yang sudah dikuasai dengan baik: ${strong.join(', ')}.` : ''}
${weak.length > 0 ? `Topik yang masih perlu ditingkatkan: ${weak.join(', ')}.` : ''}
  `.trim();
}
