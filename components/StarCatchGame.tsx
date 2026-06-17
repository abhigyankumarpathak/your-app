import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { StarToken, starColor } from '../components/art/GameIcons';
import { todayDateKey } from '../services/streaks';
import { accentGradient, alpha, elevation } from '../theme/design';

const NIGHT_SKY = ['#1E1B4B', '#312E81', '#4C1D95'] as const;

type GameState = 'idle' | 'playing' | 'over';

interface Star {
  id: number;
  x: number;
  vy: number;        // px / sec
  startY: number;
  startedAt: number; // ms
  emoji: string;
  worth: number;
  caught: boolean;
  spawnedAt: number;
}

const GAME_DURATION = 18; // seconds
const STARS_PER_GAME_KEY = 'focusStarGameDate';

interface Props {
  visible: boolean;
  onClose: () => void;
  accent: string;
  textColor: string;
  cardBg: string;
  bgSecondary: string;
  onReward: (xp: number) => void;
}

const STAR_TYPES = [
  { emoji: '⭐', worth: 5,  weight: 60 },
  { emoji: '🌟', worth: 10, weight: 25 },
  { emoji: '✨', worth: 15, weight: 10 },
  { emoji: '💫', worth: 25, weight: 4  },
  { emoji: '☄️', worth: 50, weight: 1  },  // rare comet
];

function pickStarType() {
  const total = STAR_TYPES.reduce((s, r) => s + r.weight, 0);
  let roll = Math.random() * total;
  for (const t of STAR_TYPES) {
    roll -= t.weight;
    if (roll <= 0) return t;
  }
  return STAR_TYPES[0];
}

export default function StarCatchGame({
  visible, onClose, accent, textColor, cardBg, bgSecondary, onReward,
}: Props) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const W = Math.min(screenW - 40, 380);
  const H = Math.min(screenH * 0.55, 480);

  const [state, setState] = useState<GameState>('idle');
  const [stars, setStars] = useState<Star[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [floats, setFloats] = useState<{ id: number; x: number; y: number; text: string; color: string }[]>([]);
  const nextId = useRef(1);

  const tickRef    = useRef<any>(null);
  const spawnRef   = useRef<any>(null);
  const countRef   = useRef<any>(null);

  const introPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(introPulse, { toValue: 1.12, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      Animated.timing(introPulse, { toValue: 1, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  const cleanup = () => {
    if (tickRef.current)  clearInterval(tickRef.current);
    if (spawnRef.current) clearInterval(spawnRef.current);
    if (countRef.current) clearInterval(countRef.current);
    tickRef.current = spawnRef.current = countRef.current = null;
  };

  useEffect(() => () => cleanup(), []);

  useEffect(() => {
    if (!visible) {
      cleanup();
      setState('idle');
      setStars([]);
      setScore(0);
      setCombo(0);
      setTimeLeft(GAME_DURATION);
      setFloats([]);
    }
  }, [visible]);

  const startGame = () => {
    cleanup();
    setStars([]);
    setScore(0);
    setCombo(0);
    setTimeLeft(GAME_DURATION);
    setFloats([]);
    setState('playing');

    const startTime = Date.now();

    // Spawn stars
    spawnRef.current = setInterval(() => {
      const type = pickStarType();
      const s: Star = {
        id: nextId.current++,
        x: Math.random() * (W - 50) + 10,
        vy: 70 + Math.random() * 90,
        startY: -50,
        startedAt: Date.now(),
        emoji: type.emoji,
        worth: type.worth,
        caught: false,
        spawnedAt: Date.now(),
      };
      setStars((prev) => [...prev, s]);
    }, 550);

    // Position update tick (drives re-render)
    tickRef.current = setInterval(() => {
      setStars((prev) => prev.filter(s => !s.caught && (Date.now() - s.startedAt) / 1000 * s.vy < H + 50));
    }, 50);

    // Countdown
    countRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = GAME_DURATION - elapsed;
      if (remaining <= 0) {
        cleanup();
        setTimeLeft(0);
        setState('over');
      } else {
        setTimeLeft(Math.ceil(remaining));
      }
    }, 200);
  };

  const catchStar = (s: Star) => {
    if (s.caught) return;
    const elapsed = (Date.now() - s.startedAt) / 1000;
    const y = s.startY + elapsed * s.vy;
    // Compute multiplier: faster combo = more bonus
    const newCombo = combo + 1;
    const mult = 1 + Math.min(newCombo / 10, 1); // up to 2x at combo 10
    const gain = Math.round(s.worth * mult);
    setScore((sc) => sc + gain);
    setCombo(newCombo);
    setStars((prev) => prev.map(st => st.id === s.id ? { ...st, caught: true } : st));

    // Spawn a floating "+gain" indicator
    const fid = nextId.current++;
    setFloats((prev) => [...prev, { id: fid, x: s.x, y, text: `+${gain}`, color: gain >= 25 ? '#FBBF24' : '#fff' }]);
    setTimeout(() => setFloats((prev) => prev.filter(f => f.id !== fid)), 700);
  };

  const claim = async () => {
    const xp = Math.min(score, 250);
    await AsyncStorage.setItem(STARS_PER_GAME_KEY, todayDateKey());
    const currentRaw = await AsyncStorage.getItem('focusXP');
    const current = currentRaw ? parseInt(currentRaw, 10) : 0;
    await AsyncStorage.setItem('focusXP', String(current + xp));
    onReward(xp);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.box, { width: W + 24, backgroundColor: cardBg }]}>
          <View style={styles.topBar}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <StarToken size={22} worth={10} />
              <Text style={[styles.title, { color: textColor }]}>Star Catch</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.closeX, { color: textColor }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {state === 'idle' && (
            <View style={styles.intro}>
              <Animated.View style={{ transform: [{ scale: introPulse }] }}>
                <StarToken size={92} worth={25} />
              </Animated.View>
              <Text style={[styles.introTitle, { color: textColor }]}>Catch the falling stars!</Text>
              <Text style={[styles.introSub, { color: textColor }]}>
                Tap stars before they fall off screen.{'\n'}
                Bigger stars = more XP. Build combos for multipliers!
              </Text>
              {/* Value legend with real tokens */}
              <View style={styles.legend}>
                {STAR_TYPES.map((t) => (
                  <View key={t.worth} style={styles.legendCell}>
                    <StarToken size={26} worth={t.worth} />
                    <Text style={[styles.legendVal, { color: starColor(t.worth) }]}>+{t.worth}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity activeOpacity={0.85} onPress={startGame} style={[styles.playBtnWrap, elevation(2)]}>
                <LinearGradient colors={accentGradient(accent)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.playBtn}>
                  <Text style={styles.playBtnText}>▶  PLAY ({GAME_DURATION}s)</Text>
                </LinearGradient>
              </TouchableOpacity>
              <Text style={[styles.note, { color: textColor }]}>
                Score is converted 1:1 to bonus XP (max 250)
              </Text>
            </View>
          )}

          {state === 'playing' && (
            <View>
              {/* HUD */}
              <View style={styles.hud}>
                <View style={[styles.hudPill, { backgroundColor: bgSecondary }]}>
                  <Text style={[styles.hudLabel, { color: textColor }]}>Score</Text>
                  <Text style={[styles.hudValue, { color: textColor }]}>{score}</Text>
                </View>
                <View style={[styles.hudPill, { backgroundColor: combo > 0 ? accent : bgSecondary }]}>
                  <Text style={[styles.hudLabel, { color: combo > 0 ? '#fff' : textColor }]}>Combo</Text>
                  <Text style={[styles.hudValue, { color: combo > 0 ? '#fff' : textColor }]}>x{combo}</Text>
                </View>
                <View style={[styles.hudPill, { backgroundColor: timeLeft <= 5 ? '#EF4444' : bgSecondary }]}>
                  <Text style={[styles.hudLabel, { color: timeLeft <= 5 ? '#fff' : textColor }]}>Time</Text>
                  <Text style={[styles.hudValue, { color: timeLeft <= 5 ? '#fff' : textColor }]}>{timeLeft}s</Text>
                </View>
              </View>

              {/* Game area — night sky */}
              <View style={[styles.arena, { width: W, height: H }]}>
                <LinearGradient colors={NIGHT_SKY as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill as any} />
                {/* Background star dots for depth */}
                {Array.from({ length: 22 }, (_, i) => (
                  <View key={`d${i}`} style={{
                    position: 'absolute',
                    left: (i * 47) % (W - 6),
                    top: (i * 83) % (H - 6),
                    width: i % 4 === 0 ? 3 : 2, height: i % 4 === 0 ? 3 : 2, borderRadius: 2,
                    backgroundColor: '#fff', opacity: i % 3 === 0 ? 0.5 : 0.22,
                  }} />
                ))}
                {stars.map((s) => {
                  if (s.caught) return null;
                  const elapsed = (Date.now() - s.startedAt) / 1000;
                  const y = s.startY + elapsed * s.vy;
                  if (y > H) return null;
                  const tokenSize = s.worth >= 50 ? 56 : s.worth >= 25 ? 50 : s.worth >= 15 ? 46 : 42;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      activeOpacity={0.6}
                      onPress={() => catchStar(s)}
                      style={{
                        position: 'absolute',
                        left: s.x - (tokenSize - 50) / 2,
                        top: y,
                        width: tokenSize, height: tokenSize,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <StarToken size={tokenSize} worth={s.worth} />
                    </TouchableOpacity>
                  );
                })}
                {floats.map((f) => (
                  <FloatingScore key={f.id} x={f.x} y={f.y} text={f.text} color={f.color} />
                ))}
              </View>
              <Text style={[styles.tapHint, { color: textColor }]}>
                Tap stars · Miss any to reset combo
              </Text>
            </View>
          )}

          {state === 'over' && (
            <View style={styles.intro}>
              <StarToken size={80} worth={score >= 150 ? 50 : score >= 80 ? 25 : 10} />
              <Text style={[styles.introTitle, { color: textColor }]}>Time&apos;s up!</Text>
              <LinearGradient
                colors={[alpha(accent, 0.16), alpha(accent, 0.04)]}
                start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                style={[styles.scoreBox, { borderColor: accent }]}
              >
                <Text style={[styles.scoreLabel, { color: textColor }]}>FINAL SCORE</Text>
                <Text style={[styles.scoreValue, { color: accent }]}>{score}</Text>
                <View style={[styles.xpReward, { backgroundColor: accent }]}>
                  <Text style={styles.xpRewardText}>+{Math.min(score, 250)} bonus XP</Text>
                </View>
              </LinearGradient>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={[styles.playBtnWrap, { flex: 1 }]} activeOpacity={0.85} onPress={startGame}>
                  <View style={[styles.playBtn, { backgroundColor: bgSecondary }]}>
                    <Text style={[styles.playBtnText, { color: textColor }]}>↻ Play again</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.playBtnWrap, { flex: 1 }, elevation(2)]} activeOpacity={0.85} onPress={claim}>
                  <LinearGradient colors={accentGradient(accent)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.playBtn}>
                    <Text style={styles.playBtnText}>✓ Claim XP</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function FloatingScore({ x, y, text, color }: { x: number; y: number; text: string; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true, easing: Easing.out(Easing.quad) }).start();
  }, []);
  return (
    <Animated.Text
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        color,
        fontWeight: '900',
        fontSize: 16,
        textShadowColor: '#000',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -40] }) }],
        opacity: anim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0] }),
      }}
    >
      {text}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 12 },
  box: { borderRadius: 24, padding: 12, alignItems: 'center' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingHorizontal: 8, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '900' },
  closeX: { fontSize: 22, fontWeight: '700', paddingHorizontal: 8 },

  intro: { alignItems: 'center', padding: 16, gap: 10 },
  introTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  introSub: { fontSize: 13, textAlign: 'center', lineHeight: 20, opacity: 0.75 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' },
  legendCell: { alignItems: 'center', gap: 2 },
  legendVal: { fontSize: 11, fontWeight: '900' },
  playBtnWrap: { borderRadius: 14, marginTop: 8, overflow: 'hidden' },
  playBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  playBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  note: { fontSize: 11, opacity: 0.6, marginTop: 4, textAlign: 'center' },
  xpReward: { marginTop: 8, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 6 },
  xpRewardText: { color: '#fff', fontWeight: '900', fontSize: 14 },

  hud: { flexDirection: 'row', gap: 8, width: '100%', paddingHorizontal: 4, marginBottom: 8 },
  hudPill: { flex: 1, borderRadius: 12, paddingVertical: 6, alignItems: 'center' },
  hudLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', opacity: 0.7 },
  hudValue: { fontSize: 18, fontWeight: '900' },

  arena: { borderRadius: 18, overflow: 'hidden', position: 'relative' },
  tapHint: { textAlign: 'center', fontSize: 11, opacity: 0.6, marginTop: 8 },

  scoreBox: { borderWidth: 2, borderRadius: 16, padding: 18, alignItems: 'center', marginVertical: 12, minWidth: 200 },
  scoreLabel: { fontSize: 12, fontWeight: '700', opacity: 0.7 },
  scoreValue: { fontSize: 48, fontWeight: '900', marginVertical: 4 },
});
