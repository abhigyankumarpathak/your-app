import AsyncStorage from '@react-native-async-storage/async-storage';

const todayStr = () => new Date().toLocaleDateString();
const filterToday = (sessions: any[]) => sessions.filter(s => s.date === todayStr());

interface QuestDef {
  id: string;
  icon: string;
  title: string;
  description: string;
  bonusXP: number;
  check: (sessions: any[], goalHours: number) => boolean;
  getProgress: (sessions: any[], goalHours: number) => { current: number; total: number };
}

const QUEST_POOL: QuestDef[] = [
  {
    id: 'study_starter',
    icon: '🎯',
    title: 'Study Starter',
    description: 'Log 1 session today',
    bonusXP: 10,
    check: (s) => filterToday(s).length >= 1,
    getProgress: (s) => ({ current: Math.min(filterToday(s).length, 1), total: 1 }),
  },
  {
    id: 'double_session',
    icon: '🔁',
    title: 'Double Down',
    description: 'Log 2 sessions today',
    bonusXP: 20,
    check: (s) => filterToday(s).length >= 2,
    getProgress: (s) => ({ current: Math.min(filterToday(s).length, 2), total: 2 }),
  },
  {
    id: 'triple_session',
    icon: '🎰',
    title: 'Triple Threat',
    description: 'Log 3 sessions today',
    bonusXP: 35,
    check: (s) => filterToday(s).length >= 3,
    getProgress: (s) => ({ current: Math.min(filterToday(s).length, 3), total: 3 }),
  },
  {
    id: 'subject_hopper',
    icon: '🌀',
    title: 'Subject Hopper',
    description: 'Study 2 different subjects today',
    bonusXP: 25,
    check: (s) => new Set(filterToday(s).map(x => x.subject)).size >= 2,
    getProgress: (s) => ({
      current: Math.min(new Set(filterToday(s).map(x => x.subject)).size, 2),
      total: 2,
    }),
  },
  {
    id: 'multi_scholar',
    icon: '🌈',
    title: 'Multi-Scholar',
    description: 'Study 3 different subjects today',
    bonusXP: 40,
    check: (s) => new Set(filterToday(s).map(x => x.subject)).size >= 3,
    getProgress: (s) => ({
      current: Math.min(new Set(filterToday(s).map(x => x.subject)).size, 3),
      total: 3,
    }),
  },
  {
    id: 'focus_block',
    icon: '⚡',
    title: 'Focus Block',
    description: 'Study 30+ min in one session',
    bonusXP: 30,
    check: (s) => filterToday(s).some(x => x.duration >= 1800),
    getProgress: (s) => ({
      current: Math.min(filterToday(s).reduce((m, x) => Math.max(m, x.duration), 0), 1800),
      total: 1800,
    }),
  },
  {
    id: 'deep_focus',
    icon: '🧠',
    title: 'Deep Focus',
    description: 'Study 1+ hour in one session',
    bonusXP: 50,
    check: (s) => filterToday(s).some(x => x.duration >= 3600),
    getProgress: (s) => ({
      current: Math.min(filterToday(s).reduce((m, x) => Math.max(m, x.duration), 0), 3600),
      total: 3600,
    }),
  },
  {
    id: 'hour_hero',
    icon: '🦸',
    title: 'Hour Hero',
    description: 'Study 1+ hour total today',
    bonusXP: 40,
    check: (s) => filterToday(s).reduce((sum, x) => sum + x.duration, 0) >= 3600,
    getProgress: (s) => ({
      current: Math.min(filterToday(s).reduce((sum, x) => sum + x.duration, 0), 3600),
      total: 3600,
    }),
  },
  {
    id: 'note_taker',
    icon: '📝',
    title: 'Note Taker',
    description: 'Add notes to a session',
    bonusXP: 15,
    check: (s) => filterToday(s).some(x => x.notes && x.notes.trim()),
    getProgress: (s) => ({
      current: filterToday(s).some(x => x.notes && x.notes.trim()) ? 1 : 0,
      total: 1,
    }),
  },
  {
    id: 'goal_crusher',
    icon: '🏅',
    title: 'Goal Crusher',
    description: 'Hit your daily study goal',
    bonusXP: 50,
    check: (s, goalHours) => {
      if (!goalHours) return false;
      return filterToday(s).reduce((sum, x) => sum + x.duration, 0) / 3600 >= goalHours;
    },
    getProgress: (s, goalHours) => {
      const goalSecs = (goalHours || 1) * 3600;
      return {
        current: Math.min(filterToday(s).reduce((sum, x) => sum + x.duration, 0), goalSecs),
        total: goalSecs,
      };
    },
  },
];

const QUESTS_PER_DAY = 3;

function getDailyQuestIds(dateStr: string): string[] {
  let seed = 0;
  for (let i = 0; i < dateStr.length; i++) {
    seed = (seed * 31 + dateStr.charCodeAt(i)) & 0xffffffff;
  }
  seed = Math.abs(seed);

  const indices = Array.from({ length: QUEST_POOL.length }, (_, i) => i);
  const result: number[] = [];

  while (result.length < QUESTS_PER_DAY && indices.length > 0) {
    seed = ((seed * 1664525 + 1013904223) >>> 0);
    const pick = seed % indices.length;
    result.push(indices[pick]);
    indices.splice(pick, 1);
  }

  return result.map(i => QUEST_POOL[i].id);
}

export interface DailyQuestState {
  date: string;
  questIds: string[];
  completedIds: string[];
}

export interface QuestDisplay {
  id: string;
  icon: string;
  title: string;
  description: string;
  bonusXP: number;
  completed: boolean;
  progress: { current: number; total: number };
}

export const loadDailyQuests = async (): Promise<DailyQuestState> => {
  const today = todayStr();
  try {
    const raw = await AsyncStorage.getItem('focusDailyQuests');
    if (raw) {
      const saved: DailyQuestState = JSON.parse(raw);
      if (saved.date === today) return saved;
    }
  } catch {}
  const fresh: DailyQuestState = {
    date: today,
    questIds: getDailyQuestIds(today),
    completedIds: [],
  };
  await AsyncStorage.setItem('focusDailyQuests', JSON.stringify(fresh));
  return fresh;
};

export const getTodayQuestDisplays = async (
  sessions: any[],
  goalHours: number
): Promise<QuestDisplay[]> => {
  const state = await loadDailyQuests();
  return state.questIds.map(id => {
    const def = QUEST_POOL.find(q => q.id === id)!;
    return {
      id,
      icon: def.icon,
      title: def.title,
      description: def.description,
      bonusXP: def.bonusXP,
      completed: state.completedIds.includes(id),
      progress: def.getProgress(sessions, goalHours),
    };
  });
};

export const updateQuestProgress = async (
  sessions: any[],
  goalHours: number
): Promise<{ newlyCompleted: string[]; bonusXP: number }> => {
  const state = await loadDailyQuests();
  const newlyCompleted: string[] = [];

  for (const questId of state.questIds) {
    if (state.completedIds.includes(questId)) continue;
    const def = QUEST_POOL.find(q => q.id === questId);
    if (def?.check(sessions, goalHours)) {
      newlyCompleted.push(questId);
      state.completedIds.push(questId);
    }
  }

  if (newlyCompleted.length === 0) return { newlyCompleted: [], bonusXP: 0 };

  await AsyncStorage.setItem('focusDailyQuests', JSON.stringify(state));

  const bonusXP = newlyCompleted.reduce(
    (sum, id) => sum + (QUEST_POOL.find(q => q.id === id)?.bonusXP ?? 0),
    0
  );

  if (bonusXP > 0) {
    const raw = await AsyncStorage.getItem('focusXP');
    const currentXP = raw ? parseInt(raw, 10) : 0;
    await AsyncStorage.setItem('focusXP', String(currentXP + bonusXP));
  }

  return { newlyCompleted, bonusXP };
};
