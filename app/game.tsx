import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { QuestDisplay, getTodayQuestDisplays } from '../services/quests';
import {
  ALL_ACHIEVEMENTS,
  Achievement,
  LEVEL_TITLES,
  RARITY_COLORS,
  getLevel,
  getLevelTitle,
  loadAchievements,
  loadStreakData,
  loadXP,
} from '../services/streaks';

const CATEGORY_LABELS: Record<Achievement['category'], string> = {
  streak:   '🔥 Streak',
  sessions: '⭐ Sessions',
  time:     '⏱️ Time',
  mastery:  '🎯 Mastery',
  special:  '✨ Special',
};

// ── XP ring (progress circle) ───────────────────────────────────────────────
function XPRing({ pct, size, color, level }: { pct: number; size: number; color: string; level: number }) {
  const deg = Math.round(pct * 360);
  const half = size / 2;
  const bw   = 9;

  // Two-half-circle technique: works for 0-360 without SVG
  const leftDeg  = deg <= 180 ? 0        : deg - 180;
  const rightDeg = deg <= 180 ? deg      : 180;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Track ring */}
      <View style={[StyleSheet.absoluteFill, {
        borderRadius: half, borderWidth: bw, borderColor: 'rgba(255,255,255,0.22)',
      }]} />
      {/* Left half */}
      <View style={{ position: 'absolute', width: half, height: size, left: 0, overflow: 'hidden' }}>
        <View style={{
          width: size, height: size, borderRadius: half, borderWidth: bw,
          borderColor: color,
          borderRightColor: 'transparent', borderTopColor: 'transparent',
          transform: [{ rotate: `${-90 + leftDeg}deg` }],
          opacity: deg > 180 ? 1 : 0,
        }} />
      </View>
      {/* Right half */}
      <View style={{ position: 'absolute', width: half, height: size, right: 0, overflow: 'hidden' }}>
        <View style={{
          position: 'absolute', right: 0,
          width: size, height: size, borderRadius: half, borderWidth: bw,
          borderColor: color,
          borderLeftColor: 'transparent', borderBottomColor: 'transparent',
          transform: [{ rotate: `${-90 + rightDeg}deg` }],
          opacity: deg > 0 ? 1 : 0,
        }} />
      </View>
      {/* Center */}
      <View style={styles.ringCenter}>
        <Text style={[styles.ringLevel, { color, fontSize: size * 0.22 }]}>{level}</Text>
        <Text style={[styles.ringTitle, { color, fontSize: size * 0.09 }]}>{getLevelTitle(level * 100)}</Text>
      </View>
    </View>
  );
}

// ── Level path node ──────────────────────────────────────────────────────────
function LevelNode({ nodeLevel, currentLevel, xp, accentColor, presetValues, fontSizes, isLast }: any) {
  const isCurrent = nodeLevel === currentLevel;
  const isPast    = nodeLevel < currentLevel;
  const isFuture  = nodeLevel > currentLevel;
  const title     = LEVEL_TITLES[Math.min(nodeLevel, LEVEL_TITLES.length - 1)];
  const xpNeeded  = nodeLevel * 100;
  const pulse     = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isCurrent) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isCurrent]);

  const ICONS = ['🥚','🐣','📖','⭐','🚀','🔥','⚡','💎','🏆','👑','🌟'];
  const icon = ICONS[Math.min(nodeLevel, ICONS.length - 1)];

  const side = nodeLevel % 2 === 0 ? 'left' : 'right';

  return (
    <View style={[styles.nodeRow, side === 'right' && { flexDirection: 'row-reverse' }]}>
      {/* Connector line */}
      {!isLast && (
        <View style={[styles.nodeConnector, {
          backgroundColor: isPast ? accentColor : presetValues.borderColor,
          left: side === 'left' ? 42 : undefined,
          right: side === 'right' ? 42 : undefined,
        }]} />
      )}

      {/* Circle */}
      <Animated.View style={[
        styles.nodeCircle,
        isCurrent && { transform: [{ scale: pulse }] },
        {
          backgroundColor: isFuture ? presetValues.bgSecondary : isCurrent ? accentColor : accentColor + 'CC',
          borderColor: isCurrent ? '#fff' : 'transparent',
          borderWidth: isCurrent ? 3 : 0,
          shadowColor: isCurrent ? accentColor : 'transparent',
          shadowOpacity: isCurrent ? 0.6 : 0,
          shadowRadius: 8,
          elevation: isCurrent ? 6 : 0,
        },
      ]}>
        <Text style={[styles.nodeIcon, { opacity: isFuture ? 0.3 : 1 }]}>
          {isFuture ? '🔒' : icon}
        </Text>
      </Animated.View>

      {/* Label */}
      <View style={[styles.nodeLabel, side === 'right' && { alignItems: 'flex-end' }]}>
        <Text style={[styles.nodeLevelNum, {
          color: isCurrent ? accentColor : isFuture ? presetValues.textSecondary : presetValues.text,
          fontSize: fontSizes.base + (isCurrent ? 2 : 0),
          fontWeight: isCurrent ? '800' : '600',
        }]}>
          {isCurrent ? '▶ ' : ''}Level {nodeLevel}
        </Text>
        <Text style={[styles.nodeLevelTitle, {
          color: isCurrent ? accentColor : isFuture ? presetValues.borderColor : presetValues.textSecondary,
          fontSize: fontSizes.base - 2,
        }]}>
          {title}{isCurrent ? ' (You)' : ''}
        </Text>
        {!isFuture && (
          <Text style={[{ color: presetValues.textSecondary, fontSize: fontSizes.base - 3, marginTop: 1 }]}>
            {xpNeeded} XP
          </Text>
        )}
      </View>
    </View>
  );
}

export default function GameScreen() {
  const { accentColor, presetValues, fontSizes, enableAnimations } = useTheme();

  const [xp, setXp]                   = useState(0);
  const [streak, setStreak]            = useState(0);
  const [earned, setEarned]            = useState<string[]>([]);
  const [quests, setQuests]            = useState<QuestDisplay[]>([]);
  const [sessions, setSessions]        = useState<any[]>([]);
  const [goalHours, setGoalHours]      = useState(0);
  const [achCategory, setAchCategory]  = useState<Achievement['category'] | 'all'>('all');
  const [showPath, setShowPath]        = useState(true);
  const [selectedAch, setSelectedAch]  = useState<Achievement | null>(null);

  const headerAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [])
  );

  const loadAll = async () => {
    const [xpVal, streakData, earnedIds, rawSessions, profile] = await Promise.all([
      loadXP(),
      loadStreakData(),
      loadAchievements(),
      AsyncStorage.getItem('focusSessions'),
      AsyncStorage.getItem('focusUserProfile'),
    ]);

    const allSessions = rawSessions ? JSON.parse(rawSessions) : [];
    const gh = profile ? (parseFloat(JSON.parse(profile).studyGoalHours) || 0) : 0;

    setXp(xpVal);
    setStreak(streakData.current);
    setEarned(earnedIds);
    setSessions(allSessions);
    setGoalHours(gh);

    const questData = await getTodayQuestDisplays(allSessions, gh);
    setQuests(questData);

    Animated.spring(headerAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }).start();
  };

  useEffect(() => {
    headerAnim.setValue(0);
  }, []);

  const level      = getLevel(xp);
  const xpInLevel  = xp - level * 100;
  const pct        = xpInLevel / 100;
  const title      = getLevelTitle(xp);
  const doneQuests = quests.filter(q => q.completed).length;

  const categories = ['all', ...Array.from(new Set(ALL_ACHIEVEMENTS.map(a => a.category)))] as const;
  const visibleAch = achCategory === 'all'
    ? ALL_ACHIEVEMENTS
    : ALL_ACHIEVEMENTS.filter(a => a.category === achCategory);

  // Show current level ±3 neighbors, plus a few ahead
  const pathLevels = Array.from({ length: 12 }, (_, i) => Math.max(0, level - 2) + i);

  return (
    <ScrollView style={[styles.container, { backgroundColor: presetValues.bg }]} showsVerticalScrollIndicator={false}>

      {/* ── Hero header ──────────────────────────────────────────────────── */}
      <View style={[styles.hero, { backgroundColor: accentColor }]}>
        <Animated.View style={{ opacity: headerAnim, transform: [{ scale: headerAnim }], alignItems: 'center' }}>
          <XPRing pct={pct} size={120} color="#fff" level={level} />
          <Text style={[styles.heroTitle, { fontSize: fontSizes.heading + 2 }]}>{title}</Text>
          <Text style={[styles.heroSub, { fontSize: fontSizes.base }]}>{xp} total XP · 🔥 {streak}-day streak</Text>
        </Animated.View>

        {/* XP bar */}
        <View style={styles.xpBarWrap}>
          <View style={[styles.xpBarTrack, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
            <View style={[styles.xpBarFill, { width: `${pct * 100}%` as any, backgroundColor: '#fff' }]} />
          </View>
          <View style={styles.xpBarLabels}>
            <Text style={styles.xpBarLabel}>{xpInLevel} XP</Text>
            <Text style={styles.xpBarLabel}>{100 - xpInLevel} to Level {level + 1}</Text>
          </View>
        </View>

        {/* Stat pills */}
        <View style={styles.statRow}>
          {[
            { label: 'Sessions', value: sessions.length },
            { label: 'Badges', value: `${earned.length}/${ALL_ACHIEVEMENTS.length}` },
            { label: 'Best Streak', value: streak },
          ].map(s => (
            <View key={s.label} style={styles.statPill}>
              <Text style={styles.statPillValue}>{s.value}</Text>
              <Text style={styles.statPillLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.body}>

        {/* ── Daily Quests ──────────────────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: presetValues.cardBg, borderColor: presetValues.borderColor }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: presetValues.text, fontSize: fontSizes.title }]}>⚔️ Daily Quests</Text>
            <View style={[styles.questDonePill, { backgroundColor: doneQuests === quests.length && quests.length > 0 ? accentColor : accentColor + '22' }]}>
              <Text style={[styles.questDoneText, { color: doneQuests === quests.length && quests.length > 0 ? '#fff' : accentColor, fontSize: fontSizes.base - 2 }]}>
                {doneQuests === quests.length && quests.length > 0 ? '🎉 All Done!' : `${doneQuests}/${quests.length}`}
              </Text>
            </View>
          </View>
          <Text style={[styles.sectionSub, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>
            Fresh quests every day · earn bonus XP
          </Text>

          {quests.map((quest, idx) => {
            const barPct = quest.progress.total > 0 ? quest.progress.current / quest.progress.total : 0;
            return (
              <View key={quest.id} style={[styles.questCard, {
                backgroundColor: quest.completed ? accentColor + '12' : presetValues.bgSecondary,
                borderColor: quest.completed ? accentColor + '60' : presetValues.borderColor,
              }]}>
                <View style={[styles.questIconBox, { backgroundColor: quest.completed ? accentColor : accentColor + '33' }]}>
                  <Text style={{ fontSize: 22 }}>{quest.icon}</Text>
                </View>
                <View style={styles.questBody}>
                  <View style={styles.questTopRow}>
                    <Text style={[styles.questName, {
                      color: presetValues.text, fontSize: fontSizes.base,
                      textDecorationLine: quest.completed ? 'line-through' : 'none',
                      opacity: quest.completed ? 0.55 : 1,
                    }]}>
                      {quest.title}
                    </Text>
                    <View style={[styles.xpChip, { backgroundColor: accentColor + '22' }]}>
                      <Text style={[styles.xpChipText, { color: accentColor, fontSize: fontSizes.base - 2 }]}>+{quest.bonusXP} XP</Text>
                    </View>
                  </View>
                  <Text style={[styles.questDesc2, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>
                    {quest.description}
                  </Text>
                  <View style={[styles.questTrack, { backgroundColor: presetValues.borderColor }]}>
                    <View style={[styles.questFill, {
                      width: `${Math.min(barPct * 100, 100)}%` as any,
                      backgroundColor: quest.completed ? accentColor : accentColor + 'AA',
                    }]} />
                  </View>
                </View>
                {quest.completed && <Text style={[styles.checkMark, { color: accentColor }]}>✓</Text>}
              </View>
            );
          })}
        </View>

        {/* ── Level Path ────────────────────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: presetValues.cardBg, borderColor: presetValues.borderColor }]}>
          <TouchableOpacity style={styles.sectionHeaderRow} onPress={() => setShowPath(v => !v)}>
            <Text style={[styles.sectionTitle, { color: presetValues.text, fontSize: fontSizes.title }]}>🗺️ Level Path</Text>
            <Text style={[{ color: presetValues.textSecondary }]}>{showPath ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          <Text style={[styles.sectionSub, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>
            Your journey to the top
          </Text>

          {showPath && (
            <View style={styles.pathContainer}>
              {pathLevels.map((lvl, idx) => (
                <LevelNode
                  key={lvl}
                  nodeLevel={lvl}
                  currentLevel={level}
                  xp={xp}
                  accentColor={accentColor}
                  presetValues={presetValues}
                  fontSizes={fontSizes}
                  isLast={idx === pathLevels.length - 1}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── Achievements ─────────────────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: presetValues.cardBg, borderColor: presetValues.borderColor }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: presetValues.text, fontSize: fontSizes.title }]}>🏅 Achievements</Text>
            <Text style={[styles.achCount, { color: accentColor, fontSize: fontSizes.base - 1 }]}>
              {earned.length}/{ALL_ACHIEVEMENTS.length}
            </Text>
          </View>
          <Text style={[styles.sectionSub, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>
            Unlock badges as you study
          </Text>

          {/* Category tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabRow}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat}
                onPress={() => setAchCategory(cat as any)}
                style={[styles.catTab, {
                  backgroundColor: achCategory === cat ? accentColor : presetValues.bgSecondary,
                  borderColor: achCategory === cat ? accentColor : presetValues.borderColor,
                }]}
              >
                <Text style={[styles.catTabText, {
                  color: achCategory === cat ? '#fff' : presetValues.textSecondary,
                  fontSize: fontSizes.base - 2,
                }]}>
                  {cat === 'all' ? '✦ All' : CATEGORY_LABELS[cat as Achievement['category']]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Badge grid */}
          <View style={styles.badgeGrid}>
            {visibleAch.map(ach => {
              const isEarned = earned.includes(ach.id);
              const rarityColor = RARITY_COLORS[ach.rarity];
              return (
                <TouchableOpacity
                  key={ach.id}
                  activeOpacity={0.7}
                  onPress={() => setSelectedAch(ach)}
                  style={[styles.badge, {
                    backgroundColor: isEarned ? rarityColor + '18' : presetValues.bgSecondary,
                    borderColor: isEarned ? rarityColor : presetValues.borderColor,
                    borderWidth: isEarned ? 1.5 : 1,
                  }]}
                >
                  <Text style={[styles.badgeIcon, { opacity: isEarned ? 1 : 0.25 }]}>{ach.icon}</Text>
                  <Text style={[styles.badgeLabel, {
                    color: isEarned ? presetValues.text : presetValues.textSecondary,
                    fontSize: fontSizes.base - 3,
                    opacity: isEarned ? 1 : 0.5,
                  }]} numberOfLines={2}>
                    {ach.label}
                  </Text>
                  {isEarned && (
                    <View style={[styles.rarityDot, { backgroundColor: rarityColor }]} />
                  )}
                  {!isEarned && (
                    <Text style={[styles.lockIcon, { color: presetValues.borderColor }]}>🔒</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Rarity legend */}
          <View style={styles.legendRow}>
            {(Object.entries(RARITY_COLORS) as [Achievement['rarity'], string][]).map(([r, c]) => (
              <View key={r} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: c }]} />
                <Text style={[styles.legendText, { color: presetValues.textSecondary, fontSize: fontSizes.base - 3 }]}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </View>
            ))}
          </View>
        </View>

      </View>

      {/* ── Achievement detail modal ──────────────────────────────────────── */}
      <Modal
        visible={!!selectedAch}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedAch(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedAch(null)}
        >
          {selectedAch && (() => {
            const isEarned     = earned.includes(selectedAch.id);
            const rarityColor  = RARITY_COLORS[selectedAch.rarity];
            const rarityLabel  = selectedAch.rarity.charAt(0).toUpperCase() + selectedAch.rarity.slice(1);
            const categoryLabel = CATEGORY_LABELS[selectedAch.category];
            return (
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => {}}
                style={[styles.modalSheet, { backgroundColor: presetValues.cardBg }]}
              >
                {/* Icon circle */}
                <View style={[styles.modalIconCircle, {
                  backgroundColor: isEarned ? rarityColor + '22' : presetValues.bgSecondary,
                  borderColor: isEarned ? rarityColor : presetValues.borderColor,
                }]}>
                  <Text style={[styles.modalIcon, { opacity: isEarned ? 1 : 0.3 }]}>{selectedAch.icon}</Text>
                </View>

                {/* Title + rarity */}
                <Text style={[styles.modalTitle, { color: presetValues.text, fontSize: fontSizes.heading }]}>
                  {selectedAch.label}
                </Text>
                <View style={styles.modalPillRow}>
                  <View style={[styles.modalPill, { backgroundColor: rarityColor + '22', borderColor: rarityColor }]}>
                    <Text style={[styles.modalPillText, { color: rarityColor, fontSize: fontSizes.base - 2 }]}>
                      ✦ {rarityLabel}
                    </Text>
                  </View>
                  <View style={[styles.modalPill, { backgroundColor: accentColor + '18', borderColor: accentColor + '60' }]}>
                    <Text style={[styles.modalPillText, { color: accentColor, fontSize: fontSizes.base - 2 }]}>
                      {categoryLabel}
                    </Text>
                  </View>
                </View>

                {/* Status banner */}
                <View style={[styles.modalStatus, {
                  backgroundColor: isEarned ? rarityColor + '18' : presetValues.bgSecondary,
                  borderColor: isEarned ? rarityColor : presetValues.borderColor,
                }]}>
                  <Text style={[styles.modalStatusText, {
                    color: isEarned ? rarityColor : presetValues.textSecondary,
                    fontSize: fontSizes.base,
                  }]}>
                    {isEarned ? '🏅 Unlocked!' : '🔒 Not yet earned'}
                  </Text>
                </View>

                {/* Description */}
                <Text style={[styles.modalDescLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>
                  HOW TO EARN
                </Text>
                <Text style={[styles.modalDesc, { color: presetValues.text, fontSize: fontSizes.base + 1 }]}>
                  {selectedAch.description}
                </Text>

                <TouchableOpacity
                  style={[styles.modalClose, { backgroundColor: accentColor }]}
                  onPress={() => setSelectedAch(null)}
                >
                  <Text style={[styles.modalCloseText, { fontSize: fontSizes.base }]}>Got it</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })()}
        </TouchableOpacity>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Hero
  hero: { paddingTop: 40, paddingBottom: 28, paddingHorizontal: 20, alignItems: 'center', gap: 12 },
  heroTitle: { color: '#fff', fontWeight: '800', marginTop: 8 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  xpBarWrap: { width: '100%', marginTop: 4 },
  xpBarTrack: { height: 10, borderRadius: 5, overflow: 'hidden', width: '100%' },
  xpBarFill: { height: '100%', borderRadius: 5 },
  xpBarLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  xpBarLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600' },
  statRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  statPill: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 16 },
  statPillValue: { color: '#fff', fontWeight: '800', fontSize: 16 },
  statPillLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '600', marginTop: 1 },

  // Ring
  ringCenter: { alignItems: 'center' },
  ringLevel: { fontWeight: '900' },
  ringTitle: { fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },

  // Body / Section
  body: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 40, gap: 14 },
  section: { borderRadius: 16, padding: 16, borderWidth: 1 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  sectionTitle: { fontWeight: '700' },
  sectionSub: { fontWeight: '500', marginBottom: 14 },

  // Quests
  questDonePill: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  questDoneText: { fontWeight: '700' },
  questCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1.5, gap: 10 },
  questIconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  questBody: { flex: 1, gap: 4 },
  questTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  questName: { fontWeight: '700', flex: 1, marginRight: 6 },
  questDesc2: { fontWeight: '500' },
  questTrack: { height: 5, borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  questFill: { height: '100%', borderRadius: 3 },
  xpChip: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  xpChipText: { fontWeight: '700' },
  checkMark: { fontWeight: '900', fontSize: 22 },

  // Level path
  pathContainer: { paddingTop: 8 },
  nodeRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0, position: 'relative', minHeight: 80 },
  nodeConnector: { position: 'absolute', width: 3, top: 52, height: 28, borderRadius: 2 },
  nodeCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  nodeIcon: { fontSize: 24 },
  nodeLabel: { flex: 1, paddingHorizontal: 14, paddingTop: 4 },
  nodeLevelNum: {},
  nodeLevelTitle: { marginTop: 1 },

  // Achievements
  achCount: { fontWeight: '700' },
  tabScroll: { marginBottom: 14 },
  tabRow: { gap: 8, paddingRight: 4 },
  catTab: { borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 6 },
  catTabText: { fontWeight: '600' },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge: { width: '22%', borderRadius: 14, padding: 10, alignItems: 'center', gap: 4, position: 'relative' },
  badgeIcon: { fontSize: 26 },
  badgeLabel: { fontWeight: '600', textAlign: 'center', lineHeight: 13 },
  rarityDot: { width: 6, height: 6, borderRadius: 3 },
  lockIcon: { fontSize: 10, marginTop: 2 },
  legendRow: { flexDirection: 'row', gap: 14, marginTop: 14, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontWeight: '600' },

  // Achievement modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, paddingBottom: 44, alignItems: 'center', gap: 12,
  },
  modalIconCircle: {
    width: 90, height: 90, borderRadius: 45,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, marginBottom: 4,
  },
  modalIcon: { fontSize: 44 },
  modalTitle: { fontWeight: '800', textAlign: 'center' },
  modalPillRow: { flexDirection: 'row', gap: 8 },
  modalPill: { borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 4 },
  modalPillText: { fontWeight: '700' },
  modalStatus: { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 18, paddingVertical: 10, marginTop: 4 },
  modalStatusText: { fontWeight: '700' },
  modalDescLabel: { fontWeight: '700', letterSpacing: 0.8, marginTop: 6, alignSelf: 'flex-start' },
  modalDesc: { fontWeight: '500', textAlign: 'center', lineHeight: 22 },
  modalClose: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 48, marginTop: 8 },
  modalCloseText: { color: '#fff', fontWeight: '700' },
});
