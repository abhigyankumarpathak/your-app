import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { QuestDisplay, getTodayQuestDisplays } from '../services/quests';
import { ALL_ACHIEVEMENTS, getLevel, getLevelTitle, loadAchievements, loadStreakData, loadXP } from '../services/streaks';

function StatCard({ label, value, unit, icon, color, route }: any) {
  const { fontSizes, presetValues } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => router.push(route)}
      style={[styles.card, { backgroundColor: presetValues.cardBg, borderLeftColor: color, shadowColor: color }]}
    >
      <Text style={[styles.cardIcon, { fontSize: fontSizes.heading + 8 }]}>{icon}</Text>
      <Text style={[styles.cardValue, { fontSize: fontSizes.heading, color: presetValues.text }]}>
        {value}
        <Text style={[styles.cardUnit, { fontSize: fontSizes.base, color: presetValues.textSecondary }]}>
          {' '}{unit}
        </Text>
      </Text>
      <Text style={[styles.cardLabel, { fontSize: fontSizes.base - 1, color: presetValues.textSecondary }]}>{label}</Text>
      <Text style={[styles.cardArrow, { color: presetValues.textSecondary }]}>→</Text>
    </TouchableOpacity>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export default function Dashboard() {
  const { accentColor, presetValues, fontSizes } = useTheme();
  const [stats, setStats] = useState({ studyHours: 0, tasks: 0, sleepHours: 0, screenTime: 0 });
  const [streak, setStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [showAchievements, setShowAchievements] = useState(false);
  const [questDisplays, setQuestDisplays] = useState<QuestDisplay[]>([]);
  const [showQuests, setShowQuests] = useState(true);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [])
  );

  const loadAll = async () => {
    try {
      const [sessions, tasks, wellness] = await Promise.all([
        AsyncStorage.getItem('focusSessions'),
        AsyncStorage.getItem('focusTasks'),
        AsyncStorage.getItem('focusWellness'),
      ]);

      let studyHours = 0, taskCount = 0, sleepHours = 0, screenTime = 0;
      const todayDate = new Date().toLocaleDateString();
      let allSessions: any[] = [];

      if (sessions) {
        allSessions = JSON.parse(sessions);
        const todaySessions = allSessions.filter((s: any) => s.date === todayDate);
        studyHours = Math.round((todaySessions.reduce((sum: number, s: any) => sum + s.duration, 0) / 3600) * 10) / 10;
      }
      if (tasks) taskCount = JSON.parse(tasks).filter((t: any) => !t.done).length;
      if (wellness) {
        const allLogs = JSON.parse(wellness);
        if (allLogs.length > 0) {
          sleepHours = allLogs[0].sleepDuration || 0;
          screenTime = allLogs[0].screenTime || 0;
        }
      }
      setStats({ studyHours, tasks: taskCount, sleepHours, screenTime });

      const profile = await AsyncStorage.getItem('focusUserProfile');
      const goalHours = profile ? (parseFloat(JSON.parse(profile).studyGoalHours) || 0) : 0;

      const [streakData, xpVal, earned, quests] = await Promise.all([
        loadStreakData(), loadXP(), loadAchievements(),
        getTodayQuestDisplays(allSessions, goalHours),
      ]);
      setStreak(streakData.current);
      setXp(xpVal);
      setAchievements(earned);
      setQuestDisplays(quests);
    } catch (e) {
      console.log('Error loading stats:', e);
    }
  };

  const level = getLevel(xp);
  const xpInLevel = xp - level * 100;

  return (
    <ScrollView style={[styles.container, { backgroundColor: presetValues.bg }]}>
      <View style={[styles.header, { backgroundColor: accentColor }]}>
        <Text style={[styles.greeting, { fontSize: fontSizes.heading + 6, color: '#fff', fontWeight: 'bold' }]}>
          Good {getTimeOfDay()} 👋
        </Text>
        <Text style={[styles.date, { fontSize: fontSizes.base, color: 'rgba(255,255,255,0.8)' }]}>{today}</Text>
      </View>

      <View style={styles.content}>
        {/* ── Streak / XP banner ─────────────────────────────────────── */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setShowAchievements((v) => !v)}
          style={[styles.streakBanner, { backgroundColor: presetValues.cardBg, borderColor: accentColor }]}
        >
          <View style={styles.streakLeft}>
            <Text style={[styles.streakFire, { fontSize: fontSizes.heading }]}>🔥</Text>
            <View>
              <Text style={[styles.streakText, { color: presetValues.text, fontSize: fontSizes.base + 1 }]}>
                {streak > 0 ? `${streak}-day streak` : 'Start your streak today!'}
              </Text>
              <Text style={[styles.streakSub, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>
                Level {level}: {getLevelTitle(xp)} · {xp} XP
              </Text>
            </View>
          </View>
          <View style={styles.streakRight}>
            {/* XP progress pip */}
            <View style={[styles.xpTrack, { backgroundColor: presetValues.bgSecondary }]}>
              <View style={[styles.xpFill, { width: `${xpInLevel}%` as any, backgroundColor: accentColor }]} />
            </View>
            <Text style={[styles.xpNext, { color: presetValues.textSecondary, fontSize: fontSizes.base - 3 }]}>
              {100 - xpInLevel} XP to Lvl {level + 1}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Achievements shelf */}
        {showAchievements && (
          <View style={[styles.achShelf, { backgroundColor: presetValues.cardBg, borderColor: presetValues.borderColor }]}>
            <Text style={[styles.achTitle, { color: presetValues.text, fontSize: fontSizes.base }]}>
              🏅 Achievements ({achievements.length}/{ALL_ACHIEVEMENTS.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achRow}>
              {ALL_ACHIEVEMENTS.map((ach) => {
                const earned = achievements.includes(ach.id);
                return (
                  <View key={ach.id} style={[styles.achBadge, { backgroundColor: earned ? accentColor + '22' : presetValues.bgSecondary, borderColor: earned ? accentColor : presetValues.borderColor }]}>
                    <Text style={[styles.achIcon, { opacity: earned ? 1 : 0.3 }]}>{ach.icon}</Text>
                    <Text style={[styles.achLabel, { color: earned ? presetValues.text : presetValues.textSecondary, fontSize: fontSizes.base - 3 }]}>
                      {ach.label}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── Daily Quests ───────────────────────────────────────────── */}
        {questDisplays.length > 0 && (() => {
          const doneCount = questDisplays.filter(q => q.completed).length;
          return (
            <View style={{ marginTop: 12 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowQuests(v => !v)}
                style={[styles.questHeader, { backgroundColor: presetValues.cardBg, borderColor: accentColor }]}
              >
                <View style={styles.questHeaderLeft}>
                  <Text style={[styles.questHeaderIcon, { fontSize: fontSizes.heading }]}>⚔️</Text>
                  <View>
                    <Text style={[styles.questHeaderTitle, { color: presetValues.text, fontSize: fontSizes.base + 1 }]}>
                      Daily Quests
                    </Text>
                    <Text style={[styles.questHeaderSub, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>
                      {doneCount}/{questDisplays.length} completed today
                    </Text>
                  </View>
                </View>
                <View style={styles.questHeaderRight}>
                  <View style={[styles.questProgressPill, { backgroundColor: doneCount === questDisplays.length ? accentColor : presetValues.bgSecondary }]}>
                    <Text style={[styles.questProgressPillText, { color: doneCount === questDisplays.length ? '#fff' : accentColor, fontSize: fontSizes.base - 2 }]}>
                      {doneCount === questDisplays.length ? '🎉 All Done!' : `${doneCount}/${questDisplays.length}`}
                    </Text>
                  </View>
                  <Text style={[{ color: presetValues.textSecondary, fontSize: 14, marginLeft: 6 }]}>{showQuests ? '▲' : '▼'}</Text>
                </View>
              </TouchableOpacity>

              {showQuests && (
                <View style={[styles.questList, { backgroundColor: presetValues.cardBg, borderColor: presetValues.borderColor }]}>
                  {questDisplays.map((quest, idx) => {
                    const pct = quest.progress.total > 0 ? quest.progress.current / quest.progress.total : 0;
                    return (
                      <View key={quest.id} style={[styles.questRow, idx < questDisplays.length - 1 && { borderBottomWidth: 1, borderBottomColor: presetValues.borderColor }]}>
                        <View style={[styles.questIconWrap, { backgroundColor: quest.completed ? accentColor : accentColor + '22' }]}>
                          <Text style={{ fontSize: 18 }}>{quest.icon}</Text>
                        </View>
                        <View style={styles.questInfo}>
                          <View style={styles.questTitleRow}>
                            <Text style={[styles.questTitle, { color: presetValues.text, fontSize: fontSizes.base, textDecorationLine: quest.completed ? 'line-through' : 'none', opacity: quest.completed ? 0.6 : 1 }]}>
                              {quest.title}
                            </Text>
                            <View style={[styles.xpBadge, { backgroundColor: accentColor + '22' }]}>
                              <Text style={[styles.xpBadgeText, { color: accentColor, fontSize: fontSizes.base - 3 }]}>
                                +{quest.bonusXP} XP
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.questDesc, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>
                            {quest.description}
                          </Text>
                          <View style={[styles.questBar, { backgroundColor: presetValues.bgSecondary }]}>
                            <View style={[styles.questBarFill, { width: `${Math.min(pct * 100, 100)}%` as any, backgroundColor: quest.completed ? accentColor : accentColor + '99' }]} />
                          </View>
                        </View>
                        {quest.completed && (
                          <Text style={[styles.questCheck, { color: accentColor, fontSize: fontSizes.heading }]}>✓</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })()}

        <Text style={[styles.sectionTitle, { color: presetValues.text, fontSize: fontSizes.title, marginBottom: 16, marginTop: 16 }]}>
          📊 Today's Overview
        </Text>

        <StatCard label="Study Time"      value={stats.studyHours} unit="hours" icon="🎯"  color={accentColor} route="/study" />
        <StatCard label="Tasks Pending"   value={stats.tasks}      unit="tasks" icon="✓"   color={accentColor} route="/tasks" />
        <StatCard label="Sleep Last Night" value={stats.sleepHours} unit="hours" icon="😴" color={accentColor} route="/wellness" />
        <StatCard label="Screen Time"     value={stats.screenTime} unit="hours" icon="📵"  color={accentColor} route="/screentime" />

        <View style={[styles.tipBox, { backgroundColor: presetValues.bgSecondary, borderColor: accentColor }]}>
          <Text style={[styles.tipTitle, { color: presetValues.text, fontSize: fontSizes.base + 1, fontWeight: '600' }]}>
            💡 Quick Tips
          </Text>
          <Text style={[styles.tipText, { color: presetValues.textSecondary, fontSize: fontSizes.base, lineHeight: 20 }]}>
            • Set study goals each day{'\n'}• Log your sleep for better tracking{'\n'}• Take breaks during long sessions
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 40, paddingBottom: 24, paddingHorizontal: 20 },
  greeting: { marginBottom: 4 },
  date: { fontWeight: '500' },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
  sectionTitle: { fontWeight: '600' },

  streakBanner: {
    borderRadius: 14, padding: 14, borderWidth: 1.5,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  streakLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  streakFire: {},
  streakText: { fontWeight: '700' },
  streakSub: { fontWeight: '500', marginTop: 1 },
  streakRight: { alignItems: 'flex-end', gap: 4, minWidth: 90 },
  xpTrack: { height: 6, width: 80, borderRadius: 3, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 3 },
  xpNext: { fontWeight: '600' },

  achShelf: { borderRadius: 12, padding: 12, marginTop: 8, borderWidth: 1 },
  achTitle: { fontWeight: '600', marginBottom: 10 },
  achRow: { gap: 8, paddingBottom: 4 },
  achBadge: { borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1.5, minWidth: 68 },
  achIcon: { fontSize: 22, marginBottom: 4 },
  achLabel: { fontWeight: '600', textAlign: 'center' },

  card: {
    borderRadius: 14, padding: 16, marginBottom: 12, borderLeftWidth: 4,
    shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  cardIcon: { marginBottom: 4 },
  cardValue: { fontWeight: 'bold', marginBottom: 4 },
  cardUnit: { fontWeight: 'normal' },
  cardLabel: { fontWeight: '500' },
  cardArrow: { position: 'absolute', right: 14, top: '50%', fontSize: 16, fontWeight: '600' },

  tipBox: { borderRadius: 12, padding: 14, marginTop: 20, borderWidth: 1 },
  tipTitle: { marginBottom: 8 },
  tipText: { fontWeight: '500' },

  questHeader: {
    borderRadius: 14, padding: 14, borderWidth: 1.5,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  questHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  questHeaderIcon: {},
  questHeaderTitle: { fontWeight: '700' },
  questHeaderSub: { fontWeight: '500', marginTop: 1 },
  questHeaderRight: { flexDirection: 'row', alignItems: 'center' },
  questProgressPill: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  questProgressPillText: { fontWeight: '700' },

  questList: { borderRadius: 14, borderWidth: 1, marginTop: 6, overflow: 'hidden' },
  questRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  questIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  questInfo: { flex: 1, gap: 4 },
  questTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  questTitle: { fontWeight: '600', flex: 1 },
  questDesc: { fontWeight: '500' },
  questBar: { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 2 },
  questBarFill: { height: '100%', borderRadius: 2 },
  questCheck: { fontWeight: '900' },
  xpBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  xpBadgeText: { fontWeight: '700' },
});
