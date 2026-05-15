import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

// Pet evolves with level. Each stage has an emoji + name + range of levels.
export const PET_STAGES = [
  { level: 0,  emoji: '🥚', name: 'Mystery Egg',     hint: 'Study to hatch!'        },
  { level: 1,  emoji: '🐣', name: 'Hatchling',       hint: 'It\'s waking up!'       },
  { level: 2,  emoji: '🐥', name: 'Chick',           hint: 'Growing fast'            },
  { level: 3,  emoji: '🦊', name: 'Fox Cub',         hint: 'Curious and bright'     },
  { level: 5,  emoji: '🐺', name: 'Wolf',            hint: 'Loyal companion'        },
  { level: 7,  emoji: '🦅', name: 'Eagle',           hint: 'Sharp focus'            },
  { level: 10, emoji: '🦄', name: 'Unicorn',         hint: 'Magical study buddy'    },
  { level: 15, emoji: '🐉', name: 'Dragon',          hint: 'Legendary scholar'      },
  { level: 25, emoji: '🔥', name: 'Phoenix',         hint: 'Eternal flame of focus' },
];

export function getPetForLevel(level: number) {
  let stage = PET_STAGES[0];
  for (const s of PET_STAGES) {
    if (level >= s.level) stage = s;
  }
  return stage;
}

export function getNextPetStage(level: number) {
  for (const s of PET_STAGES) {
    if (s.level > level) return s;
  }
  return null;
}

interface Props {
  level: number;
  size?: number;
  color: string;
  textColor: string;
  textSecondary: string;
  bg: string;
}

export default function StudyPet({ level, size = 90, color, textColor, textSecondary, bg }: Props) {
  const pet = getPetForLevel(level);
  const next = getNextPetStage(level);

  const bounce = useRef(new Animated.Value(0)).current;
  const sparkle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(bounce, { toValue: 1, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      Animated.timing(bounce, { toValue: 0, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(sparkle, { toValue: 1, duration: 1500, useNativeDriver: true }),
      Animated.timing(sparkle, { toValue: 0, duration: 300,  useNativeDriver: true }),
      Animated.delay(2000),
    ])).start();
  }, []);

  return (
    <View style={[styles.wrap, { backgroundColor: bg, borderColor: color }]}>
      <View style={styles.left}>
        <View style={[styles.bubble, { backgroundColor: color + '22', borderColor: color }]}>
          <Animated.Text style={{
            fontSize: size * 0.55,
            transform: [{ translateY: bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }],
          }}>
            {pet.emoji}
          </Animated.Text>
          {/* Sparkle decorations */}
          <Animated.Text style={{
            position: 'absolute', top: 6, right: 8,
            fontSize: 14,
            opacity: sparkle,
          }}>
            ✨
          </Animated.Text>
          <Animated.Text style={{
            position: 'absolute', bottom: 10, left: 6,
            fontSize: 10,
            opacity: sparkle.interpolate({ inputRange: [0, 1], outputRange: [0, 0.7] }),
          }}>
            ⭐
          </Animated.Text>
        </View>
      </View>
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={[styles.label, { color: textSecondary }]}>YOUR STUDY BUDDY</Text>
        <Text style={[styles.name, { color: textColor }]}>{pet.name}</Text>
        <Text style={[styles.hint, { color: textSecondary }]}>{pet.hint}</Text>
        {next && (
          <View style={[styles.nextBox, { backgroundColor: color + '14', borderColor: color + '40' }]}>
            <Text style={[styles.nextLabel, { color: textSecondary }]}>NEXT EVOLUTION</Text>
            <Text style={[styles.nextText, { color: textColor }]}>
              {next.emoji} {next.name} · Lv {next.level}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 18, borderWidth: 1.5 },
  left: {},
  bubble: {
    width: 100, height: 100, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  name: { fontSize: 20, fontWeight: '900', marginTop: 2 },
  hint: { fontSize: 12, fontWeight: '500', marginTop: 4 },
  nextBox: { marginTop: 8, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1 },
  nextLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  nextText: { fontSize: 12, fontWeight: '700', marginTop: 1 },
});
