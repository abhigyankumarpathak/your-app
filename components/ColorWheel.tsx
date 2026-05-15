import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// HSL -> hex
function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const color = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

// Approximate hex -> HSL (just enough for round-tripping)
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.substring(0, 2), 16) / 255;
  const g = parseInt(cleaned.substring(2, 4), 16) / 255;
  const b = parseInt(cleaned.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r)      h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else                h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

interface Props {
  size?: number;
  value: string;
  onChange: (hex: string) => void;
}

const PRESET_SWATCHES = [
  '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899',
  '#EF4444', '#6366F1', '#06B6D4', '#14B8A6', '#A855F7',
  '#F97316', '#84CC16',
];

export default function ColorWheel({ size = 240, value, onChange }: Props) {
  const initial = useMemo(() => hexToHsl(value), [value]);
  const [hue, setHue] = useState(initial.h);
  const [sat, setSat] = useState(Math.max(initial.s, 70));
  const [light, setLight] = useState(initial.l || 55);

  const radius = size / 2;
  const knobSize = 26;

  // Compute knob position from hue/sat
  const angleRad = (hue * Math.PI) / 180;
  const dist = (sat / 100) * (radius - knobSize / 2 - 6);
  const knobX = radius + dist * Math.cos(angleRad) - knobSize / 2;
  const knobY = radius + dist * Math.sin(angleRad) - knobSize / 2;

  const updateFromXY = (x: number, y: number) => {
    const dx = x - radius;
    const dy = y - radius;
    const r = Math.sqrt(dx * dx + dy * dy);
    const maxR = radius - knobSize / 2 - 6;
    const newSat = Math.min(100, (r / maxR) * 100);
    let newHue = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (newHue < 0) newHue += 360;
    setHue(newHue);
    setSat(newSat);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        updateFromXY(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
      },
      onPanResponderMove: (evt) => {
        updateFromXY(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
      },
    })
  ).current;

  // Emit change whenever HSL changes
  useEffect(() => {
    onChange(hslToHex(hue, sat, light));
  }, [hue, sat, light]);

  // Build the disk: concentric rings of hue dots
  const RINGS = 6;
  const dots: { x: number; y: number; size: number; color: string }[] = [];
  for (let ring = 1; ring <= RINGS; ring++) {
    const ringRadius = (ring / RINGS) * (radius - 12);
    const sample = ring / RINGS;
    const count = Math.max(6, Math.round(ring * 8));
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const dx = Math.cos(a) * ringRadius;
      const dy = Math.sin(a) * ringRadius;
      const h = (a * 180) / Math.PI;
      const color = hslToHex(h, sample * 100, light);
      dots.push({ x: radius + dx, y: radius + dy, size: 14, color });
    }
  }
  // Center dot (white/neutral)
  dots.push({ x: radius, y: radius, size: 14, color: hslToHex(0, 0, light) });

  const currentHex = hslToHex(hue, sat, light);

  return (
    <View style={{ alignItems: 'center' }}>
      {/* Disk */}
      <View
        {...panResponder.panHandlers}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#0001',
          position: 'relative',
        }}
      >
        {dots.map((d, i) => (
          <View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: d.x - d.size / 2,
              top: d.y - d.size / 2,
              width: d.size,
              height: d.size,
              borderRadius: d.size / 2,
              backgroundColor: d.color,
            }}
          />
        ))}
        {/* Selection knob */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: knobX,
            top: knobY,
            width: knobSize,
            height: knobSize,
            borderRadius: knobSize / 2,
            backgroundColor: currentHex,
            borderWidth: 3,
            borderColor: '#fff',
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
            elevation: 4,
          }}
        />
      </View>

      {/* Brightness slider */}
      <View style={styles.sliderRow}>
        <Text style={styles.sliderLabel}>☀️</Text>
        <View style={styles.sliderTrack}>
          {Array.from({ length: 20 }, (_, i) => {
            const l = 15 + (i / 19) * 70;
            return (
              <TouchableOpacity
                key={i}
                onPress={() => setLight(l)}
                style={{
                  flex: 1,
                  height: 28,
                  backgroundColor: hslToHex(hue, sat, l),
                  marginHorizontal: 0.5,
                  borderRadius: 4,
                  borderWidth: Math.abs(light - l) < 3 ? 2 : 0,
                  borderColor: '#fff',
                }}
              />
            );
          })}
        </View>
      </View>

      {/* Preset swatches */}
      <View style={styles.swatchRow}>
        {PRESET_SWATCHES.map((hex) => (
          <TouchableOpacity
            key={hex}
            onPress={() => {
              const hsl = hexToHsl(hex);
              setHue(hsl.h);
              setSat(hsl.s);
              setLight(hsl.l);
            }}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: hex,
              borderWidth: currentHex.toUpperCase() === hex.toUpperCase() ? 3 : 1,
              borderColor: currentHex.toUpperCase() === hex.toUpperCase() ? '#fff' : 'rgba(0,0,0,0.15)',
            }}
          />
        ))}
      </View>

      {/* Hex display */}
      <View style={[styles.hexBadge, { backgroundColor: currentHex }]}>
        <Text style={styles.hexText}>{currentHex}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingHorizontal: 8, alignSelf: 'stretch' },
  sliderLabel: { fontSize: 18 },
  sliderTrack: { flex: 1, flexDirection: 'row', height: 28, borderRadius: 6, overflow: 'hidden' },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 14, paddingHorizontal: 4 },
  hexBadge: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  hexText: { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 1 },
});
