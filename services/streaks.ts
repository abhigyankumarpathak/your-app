import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StreakData {
  current: number;
  longest: number;
  lastDate: string;
}

export interface Achievement {
  id: string;
  icon: string;
  label: string;
  description: string;
  category: 'streak' | 'sessions' | 'time' | 'mastery' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export const ALL_ACHIEVEMENTS: Achievement[] = [
  // ── Streak ──────────────────────────────────────────────────────────────
  { id: 'streak_3',    icon: '🔥', label: '3-Day Streak',     description: 'Study 3 days in a row',          category: 'streak',   rarity: 'common'    },
  { id: 'streak_7',    icon: '⚡', label: 'Week Warrior',      description: 'Study 7 days in a row',          category: 'streak',   rarity: 'rare'      },
  { id: 'streak_14',   icon: '🌙', label: 'Two-Week Titan',    description: 'Study 14 days in a row',         category: 'streak',   rarity: 'epic'      },
  { id: 'streak_30',   icon: '👑', label: 'Monthly Master',    description: 'Study 30 days in a row',         category: 'streak',   rarity: 'legendary' },

  // ── Sessions ─────────────────────────────────────────────────────────────
  { id: 'first_session', icon: '🎓', label: 'First Step',      description: 'Complete your first session',    category: 'sessions', rarity: 'common'    },
  { id: 'sessions_10',   icon: '⭐', label: 'Getting Going',    description: 'Complete 10 sessions',           category: 'sessions', rarity: 'common'    },
  { id: 'sessions_25',   icon: '🌟', label: 'Committed',        description: 'Complete 25 sessions',           category: 'sessions', rarity: 'rare'      },
  { id: 'sessions_50',   icon: '💫', label: 'Dedicated',        description: 'Complete 50 sessions',           category: 'sessions', rarity: 'epic'      },
  { id: 'century',       icon: '🏆', label: 'Century',          description: 'Complete 100 sessions',          category: 'sessions', rarity: 'legendary' },

  // ── Time ─────────────────────────────────────────────────────────────────
  { id: 'marathon',      icon: '📚', label: 'Marathon',         description: 'Study 3+ hours in one day',      category: 'time',     rarity: 'rare'      },
  { id: 'hours_10',      icon: '⏱️', label: '10 Hour Club',     description: 'Study 10 total hours',           category: 'time',     rarity: 'common'    },
  { id: 'hours_50',      icon: '🔋', label: 'Powerhouse',       description: 'Study 50 total hours',           category: 'time',     rarity: 'epic'      },
  { id: 'hours_100',     icon: '💎', label: 'Diamond Grinder',  description: 'Study 100 total hours',          category: 'time',     rarity: 'legendary' },
  { id: 'early_bird',    icon: '🐦', label: 'Early Bird',       description: 'Log a session before 9 AM',      category: 'time',     rarity: 'rare'      },
  { id: 'night_owl',     icon: '🦉', label: 'Night Owl',        description: 'Log a session after 9 PM',       category: 'time',     rarity: 'rare'      },

  // ── Mastery ──────────────────────────────────────────────────────────────
  { id: 'well_rounded',   icon: '🌈', label: 'Well-Rounded',    description: 'Study 5+ different subjects',    category: 'mastery',  rarity: 'rare'      },
  { id: 'subject_master', icon: '🎯', label: 'Subject Master',   description: '10 sessions in one subject',    category: 'mastery',  rarity: 'epic'      },
  { id: 'note_keeper',    icon: '📓', label: 'Note Keeper',      description: 'Add notes to 5 sessions',       category: 'mastery',  rarity: 'common'    },
  { id: 'perfect_day',    icon: '✅', label: 'Perfect Day',      description: 'Hit your daily study goal',     category: 'mastery',  rarity: 'common'    },
  { id: 'perfect_week',   icon: '📅', label: 'Perfect Week',     description: 'Hit your goal 7 days in a row', category: 'mastery',  rarity: 'legendary' },
];

export const RARITY_COLORS: Record<Achievement['rarity'], string> = {
  common:    '#6B7280',
  rare:      '#3B82F6',
  epic:      '#8B5CF6',
  legendary: '#F59E0B',
};

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
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) ? n : 0;
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

export const updateStudyStats = async (
  sessions: any[],
  goalHours: number
): Promise<{ newAchievements: string[]; xpGained: number; streak: StreakData }> => {
  const today = new Date().toLocaleDateString();
  const nowHour = new Date().getHours();

  // ── Streak ───────────────────────────────────────────────────────────────
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
      newStreak.current = 1;
    }
    newStreak.lastDate = today;
    newStreak.longest = Math.max(newStreak.longest, newStreak.current);
    await AsyncStorage.setItem('focusStreak', JSON.stringify(newStreak));
  }

  // ── XP ───────────────────────────────────────────────────────────────────
  const sorted = [...sessions].sort((a, b) => b.id - a.id);
  const latest = sorted[0];
  const xpGained = latest ? Math.max(1, Math.round(latest.duration / 60)) : 0;
  const currentXP = await loadXP();
  await AsyncStorage.setItem('focusXP', String(currentXP + xpGained));

  // ── Achievements ─────────────────────────────────────────────────────────
  const earned = await loadAchievements();
  const newAchievements: string[] = [];
  const unlock = (id: string) => {
    if (!earned.includes(id)) { earned.push(id); newAchievements.push(id); }
  };

  const todaySecs = sessions.filter(s => s.date === today).reduce((sum, s) => sum + s.duration, 0);
  const totalSecs = sessions.reduce((sum, s) => sum + s.duration, 0);
  const withNotes  = sessions.filter(s => s.notes && s.notes.trim()).length;
  const subjects   = new Set(sessions.map(s => s.subject));

  // Sessions
  if (sessions.length >= 1)   unlock('first_session');
  if (sessions.length >= 10)  unlock('sessions_10');
  if (sessions.length >= 25)  unlock('sessions_25');
  if (sessions.length >= 50)  unlock('sessions_50');
  if (sessions.length >= 100) unlock('century');

  // Streak
  if (newStreak.current >= 3)  unlock('streak_3');
  if (newStreak.current >= 7)  unlock('streak_7');
  if (newStreak.current >= 14) unlock('streak_14');
  if (newStreak.current >= 30) unlock('streak_30');

  // Time
  if (todaySecs >= 3 * 3600)    unlock('marathon');
  if (totalSecs >= 10 * 3600)   unlock('hours_10');
  if (totalSecs >= 50 * 3600)   unlock('hours_50');
  if (totalSecs >= 100 * 3600)  unlock('hours_100');
  if (nowHour < 9)              unlock('early_bird');
  if (nowHour >= 21)            unlock('night_owl');

  // Mastery
  if (goalHours > 0 && todaySecs / 3600 >= goalHours) unlock('perfect_day');
  if (subjects.size >= 5) unlock('well_rounded');
  if (withNotes >= 5) unlock('note_keeper');

  // Subject master — most-studied subject has 10+ sessions
  const subjectCounts: Record<string, number> = {};
  for (const s of sessions) subjectCounts[s.subject] = (subjectCounts[s.subject] || 0) + 1;
  if (Object.values(subjectCounts).some(c => c >= 10)) unlock('subject_master');

  // Perfect week — streak of 7 AND goal hit today
  if (newStreak.current >= 7 && goalHours > 0 && todaySecs / 3600 >= goalHours) unlock('perfect_week');

  if (newAchievements.length > 0) {
    await AsyncStorage.setItem('focusAchievements', JSON.stringify(earned));
  }

  return { newAchievements, xpGained, streak: newStreak };
};
