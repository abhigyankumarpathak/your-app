import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StreakData {
  current: number;
  longest: number;
  lastDate: string; // locale date string
}

export interface Achievement {
  id: string;
  icon: string;
  label: string;
  description: string;
}

export const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_session', icon: '🎓', label: 'First Session', description: 'Complete your first study session' },
  { id: 'streak_3', icon: '🔥', label: '3-Day Streak', description: 'Study 3 days in a row' },
  { id: 'streak_7', icon: '⚡', label: '7-Day Streak', description: 'Study 7 days in a row' },
  { id: 'marathon', icon: '📚', label: 'Marathon', description: 'Study 3+ hours in one day' },
  { id: 'century', icon: '🏆', label: 'Century', description: 'Complete 100 study sessions' },
  { id: 'well_rounded', icon: '🌈', label: 'Well-Rounded', description: 'Study 5+ different subjects' },
  { id: 'perfect_day', icon: '✅', label: 'Perfect Day', description: 'Hit your daily study goal' },
];

export const getLevel = (xp: number) => Math.floor(xp / 100);

export const LEVEL_TITLES = [
  'Rookie', 'Learner', 'Scholar', 'Achiever', 'Expert',
  'Master', 'Champion', 'Genius', 'Legend', 'Prodigy',
];

export const getLevelTitle = (xp: number): string =>
  LEVEL_TITLES[Math.min(getLevel(xp), LEVEL_TITLES.length - 1)];

export const xpForNextLevel = (xp: number) => {
  const level = getLevel(xp);
  return (level + 1) * 100 - xp;
};

export const loadStreakData = async (): Promise<StreakData> => {
  try {
    const raw = await AsyncStorage.getItem('focusStreak');
    return raw ? JSON.parse(raw) : { current: 0, longest: 0, lastDate: '' };
  } catch {
    return { current: 0, longest: 0, lastDate: '' };
  }
};

export const loadXP = async (): Promise<number> => {
  try {
    const raw = await AsyncStorage.getItem('focusXP');
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
};

export const loadAchievements = async (): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem('focusAchievements');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

// Call this after any session is saved. Returns newly unlocked achievement IDs.
export const updateStudyStats = async (
  sessions: any[],
  goalHours: number
): Promise<{ newAchievements: string[]; xpGained: number; streak: StreakData }> => {
  const today = new Date().toLocaleDateString();

  // ── Streak ────────────────────────────────────────────────────────────────
  const streak = await loadStreakData();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString();

  let newStreak = { ...streak };
  if (streak.lastDate !== today) {
    if (streak.lastDate === yesterdayStr) {
      newStreak.current += 1;
    } else if (streak.lastDate === '') {
      newStreak.current = 1;
    } else {
      // gap in days — reset
      newStreak.current = 1;
    }
    newStreak.lastDate = today;
    newStreak.longest = Math.max(newStreak.longest, newStreak.current);
    await AsyncStorage.setItem('focusStreak', JSON.stringify(newStreak));
  }

  // ── XP ────────────────────────────────────────────────────────────────────
  // Find the most recently saved session (largest id) and grant 1 XP/min
  const sorted = [...sessions].sort((a, b) => b.id - a.id);
  const latest = sorted[0];
  const xpGained = latest ? Math.max(1, Math.round(latest.duration / 60)) : 0;
  const currentXP = await loadXP();
  const newXP = currentXP + xpGained;
  await AsyncStorage.setItem('focusXP', String(newXP));

  // ── Achievements ──────────────────────────────────────────────────────────
  const earned = await loadAchievements();
  const newAchievements: string[] = [];

  const unlock = (id: string) => {
    if (!earned.includes(id)) {
      earned.push(id);
      newAchievements.push(id);
    }
  };

  if (sessions.length >= 1) unlock('first_session');
  if (newStreak.current >= 3) unlock('streak_3');
  if (newStreak.current >= 7) unlock('streak_7');
  if (sessions.length >= 100) unlock('century');

  const todaySecs = sessions
    .filter((s) => s.date === today)
    .reduce((sum, s) => sum + s.duration, 0);
  if (todaySecs >= 3 * 3600) unlock('marathon');

  if (goalHours > 0 && todaySecs / 3600 >= goalHours) unlock('perfect_day');

  const subjects = new Set(sessions.map((s) => s.subject));
  if (subjects.size >= 5) unlock('well_rounded');

  if (newAchievements.length > 0) {
    await AsyncStorage.setItem('focusAchievements', JSON.stringify(earned));
  }

  return { newAchievements, xpGained, streak: newStreak };
};
