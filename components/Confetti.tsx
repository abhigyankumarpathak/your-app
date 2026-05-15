import { useEffect, useRef } from 'react';
import { Animated, Easing, Dimensions, View } from 'react-native';

interface Props {
  active: boolean;
  count?: number;
  duration?: number;
}

const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#FBBF24'];

/** Fire-and-forget confetti burst. Set `active` to true to play. */
export default function Confetti({ active, count = 50, duration = 1800 }: Props) {
  if (!active) return null;
  return <Burst key={Date.now()} count={count} duration={duration} />;
}

function Burst({ count, duration }: { count: number; duration: number }) {
  const { width: W, height: H } = Dimensions.get('window');
  const pieces = useRef(
    Array.from({ length: count }, (_, i) => ({
      x: Math.random() * W,
      delay: Math.random() * 200,
      drift: (Math.random() - 0.5) * 200,
      rotation: Math.random() * 720,
      color: COLORS[i % COLORS.length],
      size: 6 + Math.random() * 6,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    }))
  ).current;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {pieces.map((p, i) => (
        <Piece key={i} {...p} totalH={H} duration={duration} />
      ))}
    </View>
  );
}

function Piece({
  x, delay, drift, rotation, color, size, shape, totalH, duration,
}: any) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
      easing: Easing.out(Easing.quad),
    }).start();
  }, []);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: -20,
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: shape === 'circle' ? size / 2 : 1,
        opacity: anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
        transform: [
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, totalH + 40] }) },
          { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, drift] }) },
          { rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${rotation}deg`] }) },
        ],
      }}
    />
  );
}
