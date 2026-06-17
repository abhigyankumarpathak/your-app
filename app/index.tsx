import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { QuestCrest } from '../components/art/GameIcons';
import Avatar from '../components/Avatar';
import { useTheme } from '../context/ThemeContext';
import { QuestDisplay, getTodayQuestDisplays } from '../services/quests';
import { ALL_ACHIEVEMENTS, RARITY_COLORS, getLevel, getLevelTitle, loadAchievements, loadStreakData, loadXP } from '../services/streaks';
import { TIER_COLORS, accentGradient, alpha, elevation } from '../theme/design';

function StatCard({ label, value, unit, icon, color, route, presetValues, fontSizes, delay }: any) {
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 400, delay, useNativeDriver: true, easing: Easing.out(Easing.quad) }).start();
  }, []);
  return (
    <Animated.View style={{
      opacity: fade,
      transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
      width: '48%',
    }}>
      <TouchableOpacity
        activeOpacity={0.78}
        onPress={() => router.push(route)}
        style={[styles.statCard, elevation(2), { backgroundColor: presetValues.cardBg, borderColor: presetValues.borderColor }]}
      >
        {/* Accent edge */}
        <View style={[styles.statAccent, { backgroundColor: color }]} />
        <View style={styles.statTopRow}>
          <LinearGradient
            colors={accentGradient(color)}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.statIconBox}
          >
            <Ionicons name={icon} size={20} color="#fff" />
          </LinearGradient>
          <Ionicons name="chevron-forward" size={16} color={presetValues.textSecondary} style={{ opacity: 0.5 }} />
        </View>
        <View style={styles.statValueRow}>
          <Text style={[styles.statValue, { color: presetValues.text, fontSize: fontSizes.heading - 1 }]}>
            {value}
          </Text>
          <Text style={[styles.statUnit, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}> {unit}</Text>
        </View>
        <Text style={[styles.statLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function getTimeEmoji() {
  const h = new Date().getHours();
  if (h < 6)  return '🌙';
  if (h < 12) return '☀️';
  if (h < 17) return '🌤️';
  if (h < 20) return '🌇';
  return '🌙';
}

const MOTIVATIONS = [
  '"Small steps every day add up to big wins."',
  '"You\'re building a future self that thanks you."',
  '"Focus beats talent. Show up today."',
  '"One session today > zero perfect sessions tomorrow."',
  '"Your streak is your superpower."',
  '"Future you is watching. Make them proud."',
];

export default function Dashboard() {
  const { accentColor, presetValues, fontSizes } = useTheme();
  const [stats, setStats] = useState({ studyHours: 0, tasks: 0, sleepHours: 0, screenTime: 0 });
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [showAchievements, setShowAchievements] = useState(false);
  const [questDisplays, setQuestDisplays] = useState<QuestDisplay[]>([]);
  const [userName, setUserName] = useState('');
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const motivation = MOTIVATIONS[new Date().getDate() % MOTIVATIONS.length];

  const heroAnim = useRef(new Animated.Value(0)).current;
  const flameAnim = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [])
  );

  useEffect(() => {
    Animated.spring(heroAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 9 }).start();
    Animated.loop(Animated.sequence([
      Animated.timing(flameAnim, { toValue: 1.18, duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      Animated.timing(flameAnim, { toValue: 1,    duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
    ])).start();
  }, []);

  const loadAll = async () => {
    try {
      const [sessions, tasks, wellness, profileRaw] = await Promise.all([
        AsyncStorage.getItem('focusSessions'),
        AsyncStorage.getItem('focusTasks'),
        AsyncStorage.getItem('focusWellness'),
        AsyncStorage.getItem('focusUserProfile'),
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

      const profile = profileRaw ? JSON.parse(profileRaw) : null;
      setUserName(profile?.name || '');
      const goalHours = profile ? (parseFloat(profile.studyGoalHours) || 0) : 0;

      const [streakData, xpVal, earned, quests] = await Promise.all([
        loadStreakData(), loadXP(), loadAchievements(),
        getTodayQuestDisplays(allSessions, goalHours),
      ]);
      setStreak(streakData.current);
      setLongestStreak(streakData.longest);
      setXp(xpVal);
      setAchievements(earned);
      setQuestDisplays(quests);
    } catch (e) {
      console.log('Error loading stats:', e);
    }
  };

  const level = getLevel(xp);
  const xpInLevel = xp - level * 100;
  const xpPct = xpInLevel / 100;
  const goalToday = stats.studyHours; // already hours
  const doneQuests = questDisplays.filter(q => q.completed).length;

  return (
    <ScrollView style={[styles.container, { backgroundColor: presetValues.bg }]} showsVerticalScrollIndicator={false}>
      {/* ── Modern hero card ───────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.hero,
          {
            opacity: heroAnim,
            transform: [{ translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
          },
        ]}
      >
        <LinearGradient colors={accentGradient(accentColor)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill as any} />
        {/* Floating decorative circles */}
        <View style={[styles.heroBlob, { backgroundColor: 'rgba(255,255,255,0.12)', top: -40, right: -30, width: 140, height: 140 }]} />
        <View style={[styles.heroBlob, { backgroundColor: 'rgba(255,255,255,0.09)', bottom: -50, left: -40, width: 160, height: 160 }]} />
        <View style={[styles.heroBlob, { backgroundColor: 'rgba(255,255,255,0.06)', top: 50, left: 90, width: 60, height: 60 }]} />

        <View style={styles.heroTop}>
          <TouchableOpacity onPress={() => router.push('/settings')} activeOpacity={0.8}>
            <Avatar size={56} borderColor="rgba(255,255,255,0.7)" borderWidth={3} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { fontSize: fontSizes.heading, color: '#fff' }]}>
              {getTimeEmoji()} {userName ? `Hi, ${userName}!` : `Good ${getTimeOfDay()}!`}
            </Text>
            <Text style={[styles.date, { fontSize: fontSizes.base - 1, color: 'rgba(255,255,255,0.85)' }]}>{today}</Text>
          </View>
        </View>

        <Text style={[styles.motivation, { fontSize: fontSizes.base - 1 }]}>{motivation}</Text>

        {/* Level + XP bar */}
        <View style={styles.heroLevelRow}>
          <View style={styles.heroLevelBadge}>
            <Text style={styles.heroLevelText}>Lv {level}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={styles.heroXPTrack}>
              <View style={[styles.heroXPFill, { width: `${xpPct * 100}%` as any }]} />
            </View>
            <View style={styles.heroXPLabels}>
              <Text style={styles.heroXPText}>{getLevelTitle(xp)} · {xp} XP</Text>
              <Text style={styles.heroXPText}>{100 - xpInLevel} → Lv {level + 1}</Text>
            </View>
          </View>
        </View>

        {/* Quick stat row */}
        <View style={styles.heroChips}>
          <TouchableOpacity onPress={() => setShowAchievements((v) => !v)} activeOpacity={0.85} style={styles.heroChip}>
            <Animated.Text style={[styles.heroChipIcon, { transform: [{ scale: flameAnim }] }]}>🔥</Animated.Text>
            <View>
              <Text style={styles.heroChipValue}>{streak}</Text>
              <Text style={styles.heroChipLabel}>day streak</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/game')} activeOpacity={0.85} style={styles.heroChip}>
            <Text style={styles.heroChipIcon}>🏅</Text>
            <View>
              <Text style={styles.heroChipValue}>{achievements.length}</Text>
              <Text style={styles.heroChipLabel}>of {ALL_ACHIEVEMENTS.length} badges</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/game')} activeOpacity={0.85} style={styles.heroChip}>
            <Text style={styles.heroChipIcon}>⚔️</Text>
            <View>
              <Text style={styles.heroChipValue}>{doneQuests}/{questDisplays.length || 3}</Text>
              <Text style={styles.heroChipLabel}>quests</Text>
            </View>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <View style={styles.content}>
        {/* Achievements shelf — collapsible */}
        {showAchievements && (
          <View style={[styles.achShelf, { backgroundColor: presetValues.cardBg, borderColor: presetValues.borderColor }]}>
            <Text style={[styles.achTitle, { color: presetValues.text, fontSize: fontSizes.base }]}>
              Achievements ({achievements.length}/{ALL_ACHIEVEMENTS.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achRow}>
              {ALL_ACHIEVEMENTS.map((ach) => {
                const earned = achievements.includes(ach.id);
                const rc = RARITY_COLORS[ach.rarity];
                return (
                  <View key={ach.id} style={[styles.achBadge, { backgroundColor: earned ? alpha(rc, 0.1) : presetValues.bgSecondary, borderColor: earned ? rc : presetValues.borderColor }]}>
                    <QuestCrest glyph={ach.art} color={rc} size={36} locked={!earned} />
                    <Text style={[styles.achLabel, { color: earned ? presetValues.text : presetValues.textSecondary, fontSize: fontSizes.base - 3 }]}>
                      {ach.label}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Quest teaser */}
        {questDisplays.length > 0 && (() => {
          const allDone = doneQuests === questDisplays.length;
          return (
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => router.push('/game')}
              style={[styles.questTeaser, {
                backgroundColor: allDone ? accentColor : presetValues.cardBg,
                borderColor: accentColor,
              }]}
            >
              <View style={styles.questTeaserLeft}>
                <View style={[styles.questIconBubble, { backgroundColor: allDone ? 'rgba(255,255,255,0.25)' : alpha(accentColor, 0.14) }]}>
                  <QuestCrest glyph="swords" color={allDone ? '#FFFFFF' : accentColor} glyphColor={allDone ? accentColor : '#FFFFFF'} size={38} />
                </View>
                <View>
                  <Text style={[styles.questTeaserTitle, { color: allDone ? '#fff' : presetValues.text, fontSize: fontSizes.base + 1 }]}>
                    Daily Quests
                  </Text>
                  <Text style={[styles.questTeaserSub, { color: allDone ? 'rgba(255,255,255,0.85)' : presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>
                    {allDone ? '🎉 All done — great work!' : `${doneQuests}/${questDisplays.length} completed · earn XP`}
                  </Text>
                </View>
              </View>
              <View style={styles.questTeaserRight}>
                {questDisplays.map(q => (
                  <View key={q.id} style={{ opacity: q.completed ? 1 : 0.4 }}>
                    <QuestCrest glyph={q.art} color={allDone ? '#FFFFFF' : TIER_COLORS[q.tier]} glyphColor={allDone ? accentColor : '#FFFFFF'} size={26} />
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          );
        })()}

        <Text style={[styles.sectionTitle, { color: presetValues.text, fontSize: fontSizes.title }]}>
          📊 Today
        </Text>

        <View style={styles.statGrid}>
          <StatCard label="Study Time"   value={stats.studyHours} unit="hours" icon="time"            color="#3B82F6" route="/study"      presetValues={presetValues} fontSizes={fontSizes} delay={0}   />
          <StatCard label="Tasks"        value={stats.tasks}      unit="open"  icon="checkmark-done" color="#10B981" route="/tasks"      presetValues={presetValues} fontSizes={fontSizes} delay={80}  />
          <StatCard label="Sleep"        value={stats.sleepHours} unit="hours" icon="moon"           color="#8B5CF6" route="/wellness"   presetValues={presetValues} fontSizes={fontSizes} delay={160} />
          <StatCard label="Screen Time"  value={stats.screenTime} unit="hours" icon="phone-portrait" color="#F59E0B" route="/screentime" presetValues={presetValues} fontSizes={fontSizes} delay={240} />
        </View>

        {/* Quick action — start a session */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/study')}
          style={[styles.ctaWrap, elevation(3)]}
        >
          <LinearGradient colors={accentGradient(accentColor)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaBtn}>
            <Text style={styles.ctaIcon}>▶</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.ctaTitle, { fontSize: fontSizes.base + 1 }]}>Start a study session</Text>
              <Text style={styles.ctaSub}>Tap to launch the focus timer</Text>
            </View>
            <Text style={styles.ctaArrow}>→</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={[styles.tipBox, { backgroundColor: presetValues.bgSecondary, borderColor: presetValues.borderColor }]}>
          <Text style={[styles.tipTitle, { color: presetValues.text, fontSize: fontSizes.base + 1, fontWeight: '700' }]}>
            💡 Quick Tips
          </Text>
          <Text style={[styles.tipText, { color: presetValues.textSecondary, fontSize: fontSizes.base, lineHeight: 20 }]}>
            • Set daily goals and beat them{'\n'}• Customize your color & avatar in Settings{'\n'}• Complete quests for bonus XP
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Hero
  hero: {
    paddingTop: 48, paddingHorizontal: 20, paddingBottom: 22,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  heroBlob: { position: 'absolute', borderRadius: 999 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  heroAvatar: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3,
  },
  greeting: { fontWeight: '800', marginBottom: 2 },
  date: { fontWeight: '500' },
  motivation: {
    color: 'rgba(255,255,255,0.9)',
    fontStyle: 'italic',
    fontWeight: '500',
    marginBottom: 14,
  },

  heroLevelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  heroLevelBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  heroLevelText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  heroXPTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 4, overflow: 'hidden' },
  heroXPFill: { height: '100%', backgroundColor: '#fff', borderRadius: 4 },
  heroXPLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  heroXPText: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '700' },

  heroChips: { flexDirection: 'row', gap: 8 },
  heroChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroChipIcon: { fontSize: 22 },
  heroChipValue: { color: '#fff', fontWeight: '900', fontSize: 16 },
  heroChipLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '600' },

  // Body
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  sectionTitle: { fontWeight: '800', marginBottom: 12, marginTop: 16 },

  // Achievements shelf
  achShelf: { borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1 },
  achTitle: { fontWeight: '700', marginBottom: 10 },
  achRow: { gap: 8, paddingBottom: 4 },
  achBadge: { borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1.5, minWidth: 68, gap: 5 },
  achIcon: { fontSize: 22, marginBottom: 4 },
  achLabel: { fontWeight: '600', textAlign: 'center' },

  // Stat grid
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  statCard: {
    borderRadius: 18, padding: 14, borderWidth: 1,
    position: 'relative', overflow: 'hidden',
  },
  statAccent: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, opacity: 0.9 },
  statTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  statIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  statValue: { fontWeight: '900', lineHeight: 30 },
  statUnit: { fontWeight: '700' },
  statLabel: { fontWeight: '600', marginTop: 2, letterSpacing: 0.2 },

  // CTA
  ctaWrap: { borderRadius: 18, marginTop: 18, overflow: 'hidden' },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    padding: 16,
  },
  ctaIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    color: '#fff', fontSize: 18, fontWeight: '900',
    textAlign: 'center', textAlignVertical: 'center', lineHeight: 40,
  },
  ctaTitle: { color: '#fff', fontWeight: '800' },
  ctaSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '500', marginTop: 1 },
  ctaArrow: { color: '#fff', fontSize: 22, fontWeight: '800' },

  // Quest teaser
  questTeaser: {
    borderRadius: 16, padding: 14, borderWidth: 1.5, marginTop: 12, marginBottom: 4,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  questTeaserLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  questIconBubble: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  questTeaserTitle: { fontWeight: '800' },
  questTeaserSub: { fontWeight: '500', marginTop: 1 },
  questTeaserRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  // Tip
  tipBox: { borderRadius: 16, padding: 14, marginTop: 18, borderWidth: 1 },
  tipTitle: { marginBottom: 8 },
  tipText: { fontWeight: '500' },
});
