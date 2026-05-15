import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Confetti from '../components/Confetti';
import StarCatchGame from '../components/StarCatchGame';
import StudyPet from '../components/StudyPet';
import { useTheme } from '../context/ThemeContext';
import { QuestDisplay, getTodayQuestDisplays } from '../services/quests';
import {
  ALL_ACHIEVEMENTS,
  Achievement,
  DailyTreasure,
  LEVEL_TITLES,
  RARITY_COLORS,
  claimDailyTreasure,
  getLevel,
  getLevelTitle,
  isTreasureAvailableToday,
  loadAchievements,
  loadStreakData,
  loadTreasureState,
  loadXP,
  todayDateKey,
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

// ── Level path canvas (Duolingo-style) ──────────────────────────────────────
const SEGMENT_H = 150;
const NODE_D    = 60;
const NODE_D_C  = 72;
const PATH_W    = 13;
const TOP_PAD   = 28;  // breathing room above first node so its label fits above the path

const DECO_PATTERNS: { t: 'pill' | 'diamond' | 'sparkle'; rx: number; ry: number }[][] = [
  [{ t: 'sparkle', rx: 0.07, ry: 0.30 }, { t: 'pill',    rx: 0.88, ry: 0.18 }, { t: 'diamond', rx: 0.91, ry: 0.68 }],
  [{ t: 'diamond', rx: 0.05, ry: 0.55 }, { t: 'sparkle', rx: 0.87, ry: 0.40 }, { t: 'pill',    rx: 0.08, ry: 0.78 }],
  [{ t: 'pill',    rx: 0.07, ry: 0.22 }, { t: 'diamond', rx: 0.92, ry: 0.70 }, { t: 'sparkle', rx: 0.86, ry: 0.14 }],
  [{ t: 'sparkle', rx: 0.09, ry: 0.62 }, { t: 'pill',    rx: 0.91, ry: 0.28 }, { t: 'diamond', rx: 0.06, ry: 0.85 }],
  [{ t: 'diamond', rx: 0.10, ry: 0.36 }, { t: 'sparkle', rx: 0.89, ry: 0.56 }, { t: 'pill',    rx: 0.07, ry: 0.76 }],
];

const PATH_ICONS = ['🥚', '🐣', '📖', '⭐', '🚀', '🔥', '⚡', '💎', '🏆', '👑', '🌟'];

// ── Geometric decoration shapes ──────────────────────────────────────────────
function GeoDeco({ type, x, y, size, color }: { type: string; x: number; y: number; size: number; color: string }) {
  if (type === 'pill') {
    return (
      <View style={{
        position: 'absolute',
        left: x - size * 0.75, top: y - size * 0.35,
        width: size * 1.5, height: size * 0.7,
        backgroundColor: color + '40',
        borderRadius: 6,
        borderWidth: 1.5, borderColor: color + '75',
      }} />
    );
  }
  if (type === 'diamond') {
    return (
      <View style={{
        position: 'absolute', left: x - size / 2, top: y - size / 2,
        width: size, height: size,
        backgroundColor: color + '38', borderWidth: 2, borderColor: color + '70',
        transform: [{ rotate: '45deg' }],
      }} />
    );
  }
  // sparkle — 4 radiating bars + center dot
  const bar = 2.5;
  return (
    <View style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size }}>
      {[0, 45, 90, 135].map(deg => (
        <View key={deg} style={{
          position: 'absolute',
          left: size / 2 - size / 2, top: size / 2 - bar / 2,
          width: size, height: bar, borderRadius: bar / 2,
          backgroundColor: color + 'BB',
          transform: [{ rotate: `${deg}deg` }],
        }} />
      ))}
      <View style={{
        position: 'absolute', left: size / 2 - 3, top: size / 2 - 3,
        width: 6, height: 6, borderRadius: 3, backgroundColor: color,
      }} />
    </View>
  );
}

// ── Main path canvas ─────────────────────────────────────────────────────────
function LevelPathCanvas({ pathLevels, currentLevel, accentColor, presetValues, fontSizes }: any) {
  const { width: screenW } = useWindowDimensions();
  const W    = screenW - 32;
  const LX   = W * 0.22;
  const RX   = W * 0.78;
  const segW = RX - LX;

  const totalH  = pathLevels.length * SEGMENT_H + 24 + TOP_PAD;
  const cornerR = Math.min(segW * 0.45, 70);

  // Precompute geometric decorations
  type Deco = { type: string; x: number; y: number; size: number; past: boolean };
  const decos = useMemo<Deco[]>(() => {
    const SIZES = [13, 11, 15];
    return pathLevels.slice(0, -1).flatMap((nodeLevel: number, i: number) => {
      const isPast = nodeLevel < currentLevel;
      return DECO_PATTERNS[i % DECO_PATTERNS.length].map((d, j) => ({
        type: d.t,
        x: d.rx * W,
        y: i * SEGMENT_H + d.ry * SEGMENT_H + TOP_PAD,
        size: SIZES[j % SIZES.length],
        past: isPast,
      }));
    });
  }, [pathLevels, currentLevel, W]);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim  = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const p = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.13, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    const g = Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 0.6, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0.25, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    p.start(); g.start();
    return () => { p.stop(); g.stop(); };
  }, []);

  return (
    <View style={{ height: totalH, position: 'relative' }}>

      {/* ── L-shaped road segments — each runs node-center to node-center
             so the line threads through each node like one continuous trail.
             Only the OUTSIDE corner of the L is rounded; rounding the open
             edges (the default uniform borderRadius) creates ugly tails. ── */}
      {Array.from({ length: pathLevels.length - 1 }, (_, i) => {
        const fromLeft    = i % 2 === 0;
        const sy          = i * SEGMENT_H + NODE_D / 2 + TOP_PAD;        // center of node i
        const ey          = (i + 1) * SEGMENT_H + NODE_D / 2 + TOP_PAD;  // center of node i+1
        const isPast      = pathLevels[i] < currentLevel;
        const color       = isPast ? accentColor : accentColor + '30';
        const borderStyle = fromLeft
          ? { borderTopWidth: PATH_W, borderRightWidth: PATH_W, borderTopRightRadius: cornerR }
          : { borderTopWidth: PATH_W, borderLeftWidth: PATH_W,  borderTopLeftRadius:  cornerR };
        return (
          <View key={`seg${i}`} style={{
            position: 'absolute',
            left: LX, top: sy,
            width: segW, height: ey - sy,
            ...borderStyle,
            borderColor: color,
            backgroundColor: 'transparent',
          }} />
        );
      })}

      {/* ── Geometric decorations ── */}
      {decos.map((d, i) => (
        <GeoDeco
          key={`dc${i}`}
          type={d.type}
          x={d.x}
          y={d.y}
          size={d.size}
          color={d.past ? accentColor : accentColor + '55'}
        />
      ))}

      {/* ── Level nodes ── */}
      {pathLevels.map((nodeLevel: number, i: number) => {
        const fromLeft  = i % 2 === 0;
        const ncx       = fromLeft ? LX : RX;
        const ncy       = i * SEGMENT_H + NODE_D / 2 + TOP_PAD;
        const isCurrent = nodeLevel === currentLevel;
        const isPast    = nodeLevel < currentLevel;
        const isFuture  = nodeLevel > currentLevel;
        const nd        = isCurrent ? NODE_D_C : NODE_D;
        const icon      = isFuture ? '🔒' : PATH_ICONS[Math.min(nodeLevel, PATH_ICONS.length - 1)];
        const title     = LEVEL_TITLES[Math.min(nodeLevel, LEVEL_TITLES.length - 1)];
        const labelRight = fromLeft;
        const labelX     = labelRight ? ncx + nd / 2 + 10 : 0;
        const labelW     = labelRight ? W - (ncx + nd / 2 + 10) - 4 : ncx - nd / 2 - 14;

        return (
          <View key={`n${nodeLevel}`}>
            {/* Breathing glow for current node */}
            {isCurrent && (
              <Animated.View style={{
                position: 'absolute',
                left: ncx - nd / 2 - 12, top: ncy - nd / 2 - 12,
                width: nd + 24, height: nd + 24, borderRadius: (nd + 24) / 2,
                backgroundColor: accentColor, opacity: glowAnim,
                transform: [{ scale: pulseAnim }],
              }} />
            )}
            {/* Faint ring for completed nodes */}
            {isPast && (
              <View style={{
                position: 'absolute',
                left: ncx - nd / 2 - 5, top: ncy - nd / 2 - 5,
                width: nd + 10, height: nd + 10, borderRadius: (nd + 10) / 2,
                borderWidth: 2, borderColor: accentColor + '40',
              }} />
            )}
            {/* Node circle */}
            <Animated.View style={[{
              position: 'absolute',
              left: ncx - nd / 2, top: ncy - nd / 2,
              width: nd, height: nd, borderRadius: nd / 2,
              backgroundColor: isFuture ? presetValues.bgSecondary
                             : isPast   ? accentColor + 'CC'
                             :            accentColor,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: isCurrent ? 3 : 0, borderColor: '#fff',
              shadowColor: isCurrent ? accentColor : isPast ? accentColor : 'transparent',
              shadowOpacity: isCurrent ? 0.6 : isPast ? 0.2 : 0,
              shadowRadius: isCurrent ? 14 : 4,
              elevation: isCurrent ? 10 : isPast ? 3 : 0,
            }, isCurrent && { transform: [{ scale: pulseAnim }] }]}>
              <Text style={{ fontSize: isCurrent ? 28 : 22, opacity: isFuture ? 0.3 : 1 }}>
                {isPast ? '✅' : icon}
              </Text>
            </Animated.View>
            {/* Label — sits above the path stroke so the line doesn't bisect it */}
            <View style={{
              position: 'absolute',
              left: labelX, top: ncy - 52,
              width: Math.max(labelW, 70),
              alignItems: labelRight ? 'flex-start' : 'flex-end',
            }}>
              <Text style={{
                color: isCurrent ? accentColor : isFuture ? presetValues.borderColor : presetValues.text,
                fontSize: fontSizes.base + (isCurrent ? 1 : 0),
                fontWeight: isCurrent ? '800' : '600',
              }} numberOfLines={1}>
                {isCurrent ? '▶ ' : ''}Lv.{nodeLevel}
              </Text>
              <Text style={{
                color: isCurrent ? accentColor : isFuture ? presetValues.borderColor : presetValues.textSecondary,
                fontSize: fontSizes.base - 2,
                fontWeight: isCurrent ? '700' : '500',
                marginTop: 2,
              }} numberOfLines={1}>
                {title}{isCurrent ? ' ←' : ''}
              </Text>
              {!isFuture && (
                <Text style={{ color: presetValues.textSecondary, fontSize: fontSizes.base - 4, marginTop: 1 }}>
                  {nodeLevel * 100} XP
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function GameScreen() {
  const { accentColor, presetValues, fontSizes } = useTheme();

  const [xp, setXp]                   = useState(0);
  const [streak, setStreak]            = useState(0);
  const [earned, setEarned]            = useState<string[]>([]);
  const [quests, setQuests]            = useState<QuestDisplay[]>([]);
  const [sessions, setSessions]        = useState<any[]>([]);
  const [achCategory, setAchCategory]  = useState<Achievement['category'] | 'all'>('all');
  const [showPath, setShowPath]        = useState(true);
  const [selectedAch, setSelectedAch]  = useState<Achievement | null>(null);
  const [treasure, setTreasure]        = useState<DailyTreasure | null>(null);
  const [treasureAvailable, setTreasureAvailable] = useState(false);
  const [openingTreasure, setOpeningTreasure]     = useState(false);
  const [showRewardModal, setShowRewardModal]     = useState<DailyTreasure | null>(null);
  const [showStarGame, setShowStarGame]           = useState(false);
  const [starGamePlayedToday, setStarGamePlayedToday] = useState(false);
  const [confetti, setConfetti]                   = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const chestPulse = useRef(new Animated.Value(1)).current;
  const chestShake = useRef(new Animated.Value(0)).current;
  const rewardScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(chestPulse, { toValue: 1.07, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      Animated.timing(chestPulse, { toValue: 1,    duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(chestShake, { toValue: 1, duration: 80,  useNativeDriver: true }),
      Animated.timing(chestShake, { toValue: -1, duration: 80, useNativeDriver: true }),
      Animated.timing(chestShake, { toValue: 0, duration: 80,  useNativeDriver: true }),
      Animated.delay(3200),
    ])).start();
  }, []);

  const openTreasure = async () => {
    if (!treasureAvailable || openingTreasure) return;
    setOpeningTreasure(true);
    // Quick burst animation
    Animated.sequence([
      Animated.timing(chestPulse, { toValue: 1.3, duration: 200, useNativeDriver: true }),
      Animated.timing(chestPulse, { toValue: 0.3, duration: 200, useNativeDriver: true }),
    ]).start(async () => {
      const reward = await claimDailyTreasure();
      setTreasure(reward);
      setTreasureAvailable(false);
      setXp((x) => x + reward.xp);
      setShowRewardModal(reward);
      rewardScale.setValue(0);
      Animated.spring(rewardScale, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }).start();
      chestPulse.setValue(1);
      setOpeningTreasure(false);
      // Fire confetti for rare+ rewards
      if (reward.rarity !== 'common') {
        setConfetti(true);
        setTimeout(() => setConfetti(false), 2200);
      }
    });
  };

  const handleStarReward = (xp: number) => {
    setXp((x) => x + xp);
    setStarGamePlayedToday(true);
    if (xp >= 50) {
      setConfetti(true);
      setTimeout(() => setConfetti(false), 2200);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [])
  );

  const loadAll = async () => {
    const [xpVal, streakData, earnedIds, rawSessions, profile, treasureState, treasureAvail, starGameDate] = await Promise.all([
      loadXP(),
      loadStreakData(),
      loadAchievements(),
      AsyncStorage.getItem('focusSessions'),
      AsyncStorage.getItem('focusUserProfile'),
      loadTreasureState(),
      isTreasureAvailableToday(),
      AsyncStorage.getItem('focusStarGameDate'),
    ]);
    setStarGamePlayedToday(starGameDate === todayDateKey());

    const allSessions = rawSessions ? JSON.parse(rawSessions) : [];
    const gh = profile ? (parseFloat(JSON.parse(profile).studyGoalHours) || 0) : 0;

    setXp(xpVal);
    setStreak(streakData.current);
    setEarned(earnedIds);
    setSessions(allSessions);
    setTreasure(treasureState);
    setTreasureAvailable(treasureAvail);
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

  const prevAllDoneRef = useRef(false);
  useEffect(() => {
    const allDone = quests.length > 0 && doneQuests === quests.length;
    if (allDone && !prevAllDoneRef.current) {
      setConfetti(true);
      setTimeout(() => setConfetti(false), 2200);
    }
    prevAllDoneRef.current = allDone;
  }, [quests, doneQuests]);

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
        {/* Decorative blobs */}
        <View style={[styles.heroBlob, { top: -50, left: -30, width: 160, height: 160, backgroundColor: 'rgba(255,255,255,0.08)' }]} />
        <View style={[styles.heroBlob, { bottom: -40, right: -40, width: 180, height: 180, backgroundColor: 'rgba(255,255,255,0.10)' }]} />
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

        {/* ── Study Pet companion ───────────────────────────────────────── */}
        <StudyPet
          level={level}
          color={accentColor}
          bg={presetValues.cardBg}
          textColor={presetValues.text}
          textSecondary={presetValues.textSecondary}
        />

        {/* ── Star Catch mini-game ──────────────────────────────────────── */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setShowStarGame(true)}
          style={[styles.minigameCard, {
            backgroundColor: starGamePlayedToday ? presetValues.cardBg : accentColor,
            borderColor: accentColor,
          }]}
        >
          <View style={[styles.minigameIconBox, {
            backgroundColor: starGamePlayedToday ? presetValues.bgSecondary : 'rgba(255,255,255,0.22)',
          }]}>
            <Text style={{ fontSize: 36 }}>🌟</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={[styles.minigameTitle, {
              color: starGamePlayedToday ? presetValues.text : '#fff',
              fontSize: fontSizes.title,
            }]}>
              ⭐ Star Catch
            </Text>
            <Text style={[styles.minigameSub, {
              color: starGamePlayedToday ? presetValues.textSecondary : 'rgba(255,255,255,0.85)',
              fontSize: fontSizes.base - 1,
            }]}>
              {starGamePlayedToday
                ? 'Come back tomorrow for another round'
                : 'Tap falling stars · earn up to 250 bonus XP!'}
            </Text>
            {!starGamePlayedToday && (
              <View style={styles.minigameBadge}>
                <Text style={styles.minigameBadgeText}>PLAY NOW ▶</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* ── Daily Treasure ────────────────────────────────────────────── */}
        <TouchableOpacity
          activeOpacity={treasureAvailable ? 0.7 : 1}
          onPress={openTreasure}
          disabled={!treasureAvailable}
          style={[styles.treasureCard, {
            backgroundColor: treasureAvailable ? accentColor + '18' : presetValues.cardBg,
            borderColor: treasureAvailable ? accentColor : presetValues.borderColor,
          }]}
        >
          <Animated.View style={{
            transform: [
              { scale: chestPulse },
              { translateX: treasureAvailable ? chestShake.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] }) : 0 },
            ],
          }}>
            <View style={[styles.treasureBubble, { backgroundColor: treasureAvailable ? accentColor : presetValues.bgSecondary }]}>
              <Text style={{ fontSize: 36 }}>
                {treasureAvailable ? '🎁' : (treasure?.emoji || '✓')}
              </Text>
            </View>
          </Animated.View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={[styles.treasureTitle, { color: presetValues.text, fontSize: fontSizes.title }]}>
              {treasureAvailable ? '🎁 Daily Treasure!' : '✓ Treasure Claimed Today'}
            </Text>
            <Text style={[styles.treasureSub, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>
              {treasureAvailable
                ? 'Tap to open. Could be 10 to 150 bonus XP!'
                : `+${treasure?.xp || 0} XP earned · come back tomorrow`}
            </Text>
            {treasureAvailable && (
              <View style={[styles.treasureCta, { backgroundColor: accentColor }]}>
                <Text style={styles.treasureCtaText}>TAP TO OPEN ✨</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

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

          {quests.map((quest) => {
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
            <LevelPathCanvas
              pathLevels={pathLevels}
              currentLevel={level}
              accentColor={accentColor}
              presetValues={presetValues}
              fontSizes={fontSizes}
            />
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

      {/* ── Star Catch mini-game modal ────────────────────────────────────── */}
      <StarCatchGame
        visible={showStarGame}
        onClose={() => setShowStarGame(false)}
        accent={accentColor}
        textColor={presetValues.text}
        cardBg={presetValues.cardBg}
        bgSecondary={presetValues.bgSecondary}
        onReward={handleStarReward}
      />

      {/* ── Confetti overlay ──────────────────────────────────────────────── */}
      <Confetti active={confetti} />

      {/* ── Daily treasure reward modal ──────────────────────────────────── */}
      <Modal
        visible={!!showRewardModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRewardModal(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowRewardModal(null)}
        >
          {showRewardModal && (
            <Animated.View
              style={[styles.rewardSheet, {
                backgroundColor: presetValues.cardBg,
                transform: [{ scale: rewardScale }],
              }]}
            >
              <Text style={styles.rewardEmoji}>{showRewardModal.emoji}</Text>
              <Text style={[styles.rewardTitle, { color: presetValues.text }]}>
                You earned a {showRewardModal.rarity} reward!
              </Text>
              <View style={[styles.rewardXPBadge, { backgroundColor: RARITY_COLORS[showRewardModal.rarity] }]}>
                <Text style={styles.rewardXPText}>+{showRewardModal.xp} XP</Text>
              </View>
              <Text style={[styles.rewardSub, { color: presetValues.textSecondary }]}>
                Come back tomorrow for another treasure!
              </Text>
              <TouchableOpacity
                style={[styles.modalClose, { backgroundColor: accentColor, marginTop: 20 }]}
                onPress={() => setShowRewardModal(null)}
              >
                <Text style={[styles.modalCloseText, { fontSize: fontSizes.base }]}>Awesome!</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </TouchableOpacity>
      </Modal>

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
  hero: { paddingTop: 40, paddingBottom: 28, paddingHorizontal: 20, alignItems: 'center', gap: 12, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  heroBlob: { position: 'absolute', borderRadius: 999 },
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

  // Star catch mini-game card
  minigameCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 18, padding: 14, borderWidth: 2,
    shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  minigameIconBox: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  minigameTitle: { fontWeight: '900' },
  minigameSub: { fontWeight: '500', marginTop: 2 },
  minigameBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10, marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  minigameBadgeText: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 0.6 },

  // Daily treasure
  treasureCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 18, padding: 16, borderWidth: 2,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  treasureBubble: {
    width: 68, height: 68, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  treasureTitle: { fontWeight: '800' },
  treasureSub: { fontWeight: '500', marginTop: 2 },
  treasureCta: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10, marginTop: 6,
  },
  treasureCtaText: { color: '#fff', fontWeight: '800', fontSize: 11, letterSpacing: 0.6 },

  // Reward modal
  rewardSheet: {
    margin: 24, padding: 28, borderRadius: 24, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },
  rewardEmoji: { fontSize: 88, marginBottom: 8 },
  rewardTitle: { fontWeight: '800', fontSize: 20, textAlign: 'center', marginBottom: 12 },
  rewardXPBadge: { borderRadius: 14, paddingHorizontal: 18, paddingVertical: 8, marginBottom: 14 },
  rewardXPText: { color: '#fff', fontWeight: '900', fontSize: 22, letterSpacing: 1 },
  rewardSub: { fontSize: 13, textAlign: 'center', fontWeight: '500' },

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
  pathContainer: { paddingTop: 4 },

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