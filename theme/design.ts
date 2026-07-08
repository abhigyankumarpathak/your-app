// ─────────────────────────────────────────────────────────────────────────────
// Shared design system
//
// Central source of truth for spacing, radii, elevation and color math so the
// whole app feels like one product instead of a pile of ad-hoc styles.
// Everything is driven off the user's chosen accent color so theming stays live.
// ─────────────────────────────────────────────────────────────────────────────

import { Platform, ViewStyle } from 'react-native';

// ── Spacing scale (4pt grid) ────────────────────────────────────────────────
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

// ── Corner radii ────────────────────────────────────────────────────────────
export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

// ── Color math ──────────────────────────────────────────────────────────────
function clamp(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const num = parseInt(h, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((c) => clamp(c).toString(16).padStart(2, '0')).join('');
}

/** Blend two hex colors. amount=0 → a, amount=1 → b. */
export function mix(a: string, b: string, amount: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(
    r1 + (r2 - r1) * amount,
    g1 + (g2 - g1) * amount,
    b1 + (b2 - b1) * amount,
  );
}

export const lighten = (hex: string, amount: number) => mix(hex, '#FFFFFF', amount);
export const darken = (hex: string, amount: number) => mix(hex, '#000000', amount);

/** Append an 8-bit alpha (0..1) to a 6-digit hex color. */
export function alpha(hex: string, a: number): string {
  const v = clamp(a * 255).toString(16).padStart(2, '0');
  return hex.length >= 7 ? hex.slice(0, 7) + v : hex + v;
}

/** Relative luminance — used to pick readable text on a colored surface. */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Black or white, whichever reads better on the given background. */
export const readableOn = (hex: string) => (luminance(hex) > 0.55 ? '#0B1020' : '#FFFFFF');

/**
 * Build a cohesive 2-3 stop gradient from a single accent color.
 * Slightly hue-rotated + lightened top, deepened bottom, for depth.
 */
export function accentGradient(accent: string): [string, string, string] {
  return [lighten(accent, 0.18), accent, darken(accent, 0.22)];
}

/** Softer surface gradient for cards / chips. */
export function tintGradient(accent: string): [string, string] {
  return [alpha(accent, 0.16), alpha(accent, 0.04)];
}

// ── Shared screen header ─────────────────────────────────────────────────────
// One rounded, softly-elevated gradient header for every feature screen so they
// all match the dashboard hero instead of each rolling their own flat bar.
export const screenHeader: ViewStyle = {
  paddingTop: 44,
  paddingBottom: space.xxl,
  paddingHorizontal: space.xl,
  borderBottomLeftRadius: radius.xl + 4,
  borderBottomRightRadius: radius.xl + 4,
  overflow: 'hidden',
  shadowColor: '#000',
  shadowOpacity: 0.14,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
};

// ── Elevation presets (cross-platform) ──────────────────────────────────────
export function elevation(level: 1 | 2 | 3 | 4, color = '#000000'): ViewStyle {
  const map = {
    1: { o: 0.06, r: 6, y: 2, e: 2 },
    2: { o: 0.1, r: 12, y: 5, e: 5 },
    3: { o: 0.16, r: 20, y: 9, e: 9 },
    4: { o: 0.24, r: 28, y: 14, e: 14 },
  }[level];
  return Platform.select({
    ios: {
      shadowColor: color,
      shadowOpacity: map.o,
      shadowRadius: map.r,
      shadowOffset: { width: 0, height: map.y },
    },
    android: { elevation: map.e },
    default: {},
  }) as ViewStyle;
}

/** Colored glow — for "live"/active game elements. */
export function glow(color: string, strength: 1 | 2 | 3 = 2): ViewStyle {
  const map = { 1: { o: 0.4, r: 10 }, 2: { o: 0.55, r: 18 }, 3: { o: 0.8, r: 26 } }[strength];
  return Platform.select({
    ios: { shadowColor: color, shadowOpacity: map.o, shadowRadius: map.r, shadowOffset: { width: 0, height: 0 } },
    android: { elevation: map.r / 2 },
    default: {},
  }) as ViewStyle;
}

// ── Rarity / tier system (shared by quests, badges, treasures) ───────────────
export type Tier = 'common' | 'rare' | 'epic' | 'legendary';

export const TIER_COLORS: Record<Tier, string> = {
  common: '#9CA3AF',
  rare: '#3B82F6',
  epic: '#A855F7',
  legendary: '#F59E0B',
};

export const TIER_LABEL: Record<Tier, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};
