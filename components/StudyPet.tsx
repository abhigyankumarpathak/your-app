import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { alpha, darken, elevation, lighten, radius, space } from '../theme/design';
import PetArt, { PetArtKey } from './art/PetArt';

// Pet evolves with level. Each stage has vector art + name + range of levels.
export const PET_STAGES: { level: number; art: PetArtKey; name: string; hint: string }[] = [
  { level: 0,  art: 'egg',       name: 'Mystery Egg', hint: 'Study to hatch!'         },
  { level: 1,  art: 'hatchling', name: 'Hatchling',   hint: "It's waking up!"         },
  { level: 2,  art: 'chick',     name: 'Chick',       hint: 'Growing fast'            },
  { level: 3,  art: 'fox',       name: 'Fox Cub',     hint: 'Curious and bright'      },
  { level: 5,  art: 'wolf',      name: 'Wolf',        hint: 'Loyal companion'         },
  { level: 7,  art: 'eagle',     name: 'Eagle',       hint: 'Sharp focus'             },
  { level: 10, art: 'unicorn',   name: 'Unicorn',     hint: 'Magical study buddy'     },
  { level: 15, art: 'dragon',    name: 'Dragon',      hint: 'Legendary scholar'       },
  { level: 25, art: 'phoenix',   name: 'Phoenix',     hint: 'Eternal flame of focus'  },
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

export default function StudyPet({ level, size = 92, color, textColor, textSecondary, bg }: Props) {
  const pet = getPetForLevel(level);
  const next = getNextPetStage(level);

  const bounce = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(bounce, { toValue: 1, duration: 1400, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      Animated.timing(bounce, { toValue: 0, duration: 1400, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(ring, { toValue: 1, duration: 2600, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
      Animated.timing(ring, { toValue: 0, duration: 0, useNativeDriver: true }),
    ])).start();
  }, []);

  return (
    <View style={[styles.wrap, { backgroundColor: bg, borderColor: alpha(color, 0.25) }, elevation(2)]}>
      {/* Pet stage on a soft gradient pedestal */}
      <LinearGradient
        colors={[lighten(color, 0.32), color, darken(color, 0.12)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.pedestal}
      >
        {/* pulsing aura ring */}
        <Animated.View
          style={[styles.aura, {
            borderColor: '#fff',
            opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
            transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.25] }) }],
          }]}
        />
        <Animated.View style={{ transform: [{ translateY: bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) }] }}>
          <PetArt art={pet.art} size={size} accent={color} />
        </Animated.View>
      </LinearGradient>

      <View style={{ flex: 1, marginLeft: space.lg }}>
        <Text style={[styles.label, { color: textSecondary }]}>YOUR STUDY BUDDY</Text>
        <Text style={[styles.name, { color: textColor }]}>{pet.name}</Text>
        <Text style={[styles.hint, { color: textSecondary }]}>{pet.hint}</Text>
        {next && (
          <View style={[styles.nextBox, { backgroundColor: alpha(color, 0.1), borderColor: alpha(color, 0.28) }]}>
            <View style={styles.nextThumb}>
              <PetArt art={next.art} size={26} accent={color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.nextLabel, { color: textSecondary }]}>NEXT EVOLUTION</Text>
              <Text style={[styles.nextText, { color: textColor }]} numberOfLines={1}>
                {next.name} · Lv {next.level}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', padding: space.lg, borderRadius: radius.lg, borderWidth: 1 },
  pedestal: {
    width: 104, height: 104, borderRadius: radius.lg + 4,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  aura: { position: 'absolute', width: 88, height: 88, borderRadius: 44, borderWidth: 2 },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  name: { fontSize: 21, fontWeight: '900', marginTop: 2 },
  hint: { fontSize: 12, fontWeight: '500', marginTop: 3 },
  nextBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 6, borderWidth: 1 },
  nextThumb: { width: 30, height: 30, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  nextLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  nextText: { fontSize: 12, fontWeight: '700', marginTop: 1 },
});
