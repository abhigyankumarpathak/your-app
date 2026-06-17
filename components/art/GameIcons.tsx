// ─────────────────────────────────────────────────────────────────────────────
// GameIcons — RPG-style quest crests, level medallions and game glyphs.
//
// QuestCrest  → a gradient shield badge framing a white glyph (quest log style)
// LevelMedallion → a hex/coin medallion for the level-path nodes
// Glyphs are drawn on a 100×100 viewBox so they stay crisp at any size.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { darken, lighten } from '../../theme/design';

export type GlyphKey =
  | 'target' | 'swords' | 'dice' | 'swap' | 'books'
  | 'bolt' | 'brain' | 'shield' | 'scroll' | 'medal'
  | 'star' | 'flame' | 'clock' | 'crown' | 'gem' | 'sparkle'
  | 'sun' | 'moon' | 'calendar' | 'check';

// ── Glyphs (white-on-crest, ~60×60 centered in 100 box) ──────────────────────
const GLYPHS: Record<GlyphKey, (c: string) => React.ReactElement> = {
  target: (c) => (
    <G>
      <Circle cx={50} cy={50} r={24} fill="none" stroke={c} strokeWidth={6} />
      <Circle cx={50} cy={50} r={12} fill="none" stroke={c} strokeWidth={6} />
      <Circle cx={50} cy={50} r={3} fill={c} />
    </G>
  ),
  swords: (c) => (
    <G stroke={c} strokeWidth={6} strokeLinecap="round" fill="none">
      <Path d="M28 28 L62 62" />
      <Path d="M72 28 L38 62" />
      <Path d="M24 66 L34 56 M66 66 L56 56" />
    </G>
  ),
  dice: (c) => (
    <G>
      <Rect x={28} y={28} width={44} height={44} rx={10} fill="none" stroke={c} strokeWidth={6} />
      <Circle cx={40} cy={40} r={4} fill={c} />
      <Circle cx={60} cy={40} r={4} fill={c} />
      <Circle cx={50} cy={50} r={4} fill={c} />
      <Circle cx={40} cy={60} r={4} fill={c} />
      <Circle cx={60} cy={60} r={4} fill={c} />
    </G>
  ),
  swap: (c) => (
    <G stroke={c} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M30 40 H66" />
      <Polygon points="64,30 76,40 64,50" fill={c} stroke="none" />
      <Path d="M70 62 H34" />
      <Polygon points="36,52 24,62 36,72" fill={c} stroke="none" />
    </G>
  ),
  books: (c) => (
    <G>
      <Path d="M50 32 C42 27 32 27 26 30 V70 C32 67 42 67 50 72 Z" fill={c} opacity={0.9} />
      <Path d="M50 32 C58 27 68 27 74 30 V70 C68 67 58 67 50 72 Z" fill={c} />
      <Path d="M50 34 V70" stroke={darken(c, 0.25)} strokeWidth={2} />
    </G>
  ),
  bolt: (c) => <Polygon points="56,22 30,54 47,54 42,78 72,44 53,44" fill={c} />,
  brain: (c) => (
    <G fill="none" stroke={c} strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M44 28 C34 28 30 36 32 42 C24 44 24 56 32 58 C30 66 38 74 46 70 V30 C46 28 45 28 44 28 Z" fill={c} stroke="none" />
      <Path d="M56 28 C66 28 70 36 68 42 C76 44 76 56 68 58 C70 66 62 74 54 70 V30 C54 28 55 28 56 28 Z" fill={c} stroke="none" />
      <Path d="M50 30 V72" stroke={darken(c, 0.25)} strokeWidth={2.5} />
    </G>
  ),
  shield: (c) => (
    <G>
      <Path d="M50 24 L74 32 V52 C74 66 63 74 50 78 C37 74 26 66 26 52 V32 Z" fill={c} />
      <Path d="M50 38 L56 50 L50 62 L44 50 Z" fill={darken(c, 0.28)} />
    </G>
  ),
  scroll: (c) => (
    <G>
      <Rect x={32} y={28} width={36} height={44} rx={6} fill={c} />
      <Path d="M40 40 H60 M40 50 H60 M40 60 H54" stroke={darken(c, 0.3)} strokeWidth={4} strokeLinecap="round" />
    </G>
  ),
  medal: (c) => (
    <G>
      <Path d="M40 26 L34 50 M60 26 L66 50" stroke={c} strokeWidth={6} strokeLinecap="round" />
      <Circle cx={50} cy={60} r={18} fill={c} />
      <Polygon points="50,50 53,58 61,58 55,63 57,71 50,66 43,71 45,63 39,58 47,58" fill={darken(c, 0.28)} />
    </G>
  ),
  star: (c) => <Polygon points="50,24 58,42 78,44 63,58 67,78 50,68 33,78 37,58 22,44 42,42" fill={c} />,
  flame: (c) => (
    <Path d="M50 24 C58 36 70 44 66 58 C64 72 56 78 50 78 C44 78 34 72 34 58 C34 48 42 46 44 40 C50 46 48 36 50 24 Z" fill={c} />
  ),
  clock: (c) => (
    <G>
      <Circle cx={50} cy={52} r={24} fill="none" stroke={c} strokeWidth={6} />
      <Path d="M50 40 V52 L60 58" stroke={c} strokeWidth={6} strokeLinecap="round" fill="none" />
      <Path d="M42 22 H58" stroke={c} strokeWidth={6} strokeLinecap="round" />
    </G>
  ),
  crown: (c) => (
    <G>
      <Path d="M26 64 L30 36 L42 50 L50 30 L58 50 L70 36 L74 64 Z" fill={c} />
      <Rect x={26} y={64} width={48} height={9} rx={3} fill={darken(c, 0.2)} />
    </G>
  ),
  gem: (c) => (
    <G>
      <Polygon points="50,26 72,42 50,76 28,42" fill={c} />
      <Path d="M28 42 H72 M50 26 L40 42 L50 76 L60 42 Z" stroke={lighten(c, 0.35)} strokeWidth={2.5} fill="none" />
    </G>
  ),
  sparkle: (c) => (
    <Path d="M50 22 C52 40 60 48 78 50 C60 52 52 60 50 78 C48 60 40 52 22 50 C40 48 48 40 50 22 Z" fill={c} />
  ),
  sun: (c) => (
    <G>
      <Circle cx={50} cy={50} r={14} fill={c} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((d) => (
        <Rect key={d} x={48} y={20} width={4} height={10} rx={2} fill={c} transform={`rotate(${d} 50 50)`} />
      ))}
    </G>
  ),
  moon: (c) => (
    <Path d="M62 26 A26 26 0 1 0 62 74 A20 20 0 0 1 62 26 Z" fill={c} />
  ),
  calendar: (c) => (
    <G>
      <Rect x={26} y={30} width={48} height={42} rx={6} fill={c} />
      <Rect x={26} y={30} width={48} height={12} rx={6} fill={darken(c, 0.25)} />
      <Rect x={36} y={24} width={5} height={12} rx={2.5} fill={darken(c, 0.25)} />
      <Rect x={59} y={24} width={5} height={12} rx={2.5} fill={darken(c, 0.25)} />
      <Path d="M37 56 l5 5 l10 -11" stroke={darken(c, 0.3)} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </G>
  ),
  check: (c) => (
    <G>
      <Circle cx={50} cy={50} r={26} fill={c} />
      <Path d="M38 51 l8 9 l17 -19" stroke={darken(c, 0.3)} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </G>
  ),
};

// ── Crest shape (rounded shield) ─────────────────────────────────────────────
function ShieldPath() {
  return 'M50 6 L88 18 V48 C88 74 70 90 50 96 C30 90 12 74 12 48 V18 Z';
}

interface CrestProps {
  glyph: GlyphKey;
  size?: number;
  color: string;        // crest base color (tier or accent)
  glyphColor?: string;
  done?: boolean;
  locked?: boolean;     // dim, desaturated, padlock corner
}

/** A gradient shield badge with a white glyph — used for quest log + achievements. */
export function QuestCrest({ glyph, size = 56, color, glyphColor = '#FFFFFF', done, locked }: CrestProps) {
  const id = React.useId().replace(/:/g, '');
  const base = locked ? '#94A3B8' : color;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 102">
      <Defs>
        <LinearGradient id={`cg${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={lighten(base, locked ? 0.12 : 0.22)} />
          <Stop offset="1" stopColor={darken(base, 0.2)} />
        </LinearGradient>
      </Defs>
      <Path d={ShieldPath()} fill={`url(#cg${id})`} stroke={lighten(base, 0.35)} strokeWidth={2} opacity={locked ? 0.55 : 1} />
      {/* top sheen */}
      <Path d="M50 10 L82 20 V30 C70 22 30 22 18 30 V20 Z" fill="#FFFFFF" opacity={locked ? 0.08 : 0.18} />
      <G opacity={locked ? 0.7 : 1}>{GLYPHS[glyph](glyphColor)}</G>
      {done && !locked && (
        <G>
          <Circle cx={76} cy={78} r={15} fill="#22C55E" stroke="#FFFFFF" strokeWidth={3} />
          <Path d="M69 78 l5 5 l9 -10" stroke="#FFFFFF" strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </G>
      )}
      {locked && (
        <G>
          <Circle cx={74} cy={78} r={14} fill="#475569" stroke="#FFFFFF" strokeWidth={2.5} />
          <Rect x={67} y={76} width={14} height={11} rx={2.5} fill="#E2E8F0" />
          <Path d="M69.5 76 V72 a4.5 4.5 0 0 1 9 0 V76" fill="none" stroke="#E2E8F0" strokeWidth={2.6} />
        </G>
      )}
    </Svg>
  );
}

// ── Level medallion (hex coin for the path) ──────────────────────────────────
interface MedallionProps {
  size?: number;
  color: string;
  glyph?: GlyphKey;
  state: 'past' | 'current' | 'future';
  label?: string | number;
}

export function LevelMedallion({ size = 64, color, glyph = 'star', state, label }: MedallionProps) {
  const id = React.useId().replace(/:/g, '');
  const locked = state === 'future';
  const base = locked ? '#94A3B8' : color;
  const hex = 'M50 6 L86 27 V73 L50 94 L14 73 V27 Z';
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={`mg${id}`} x1="0" y1="0" x2="0.4" y2="1">
          <Stop offset="0" stopColor={lighten(base, locked ? 0.1 : 0.28)} />
          <Stop offset="1" stopColor={darken(base, 0.18)} />
        </LinearGradient>
      </Defs>
      {/* outer rim */}
      <Path d={hex} fill={darken(base, 0.3)} />
      {/* inner face */}
      <Path d="M50 14 L79 31 V69 L50 86 L21 69 V31 Z" fill={`url(#mg${id})`} stroke={lighten(base, 0.4)} strokeWidth={2} opacity={locked ? 0.7 : 1} />
      <Path d="M50 14 L79 31 V42 C68 34 32 34 21 42 V31 Z" fill="#FFFFFF" opacity={0.16} />
      {state === 'past' ? (
        <Path d="M38 50 l8 9 l16 -18" stroke="#FFFFFF" strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ) : locked ? (
        <G>
          <Rect x={38} y={48} width={24} height={20} rx={4} fill="#E2E8F0" />
          <Path d="M42 48 V42 a8 8 0 0 1 16 0 V48" fill="none" stroke="#E2E8F0" strokeWidth={5} />
          <Circle cx={50} cy={57} r={3.5} fill="#64748B" />
        </G>
      ) : (
        <G transform="translate(20,20) scale(0.6)">{GLYPHS[glyph]('#FFFFFF')}</G>
      )}
    </Svg>
  );
}

// ── Star token (for the Star Catch mini-game) ────────────────────────────────
const STAR_PATH = 'M50 8 L61 37 L92 38 L68 58 L76 89 L50 71 L24 89 L32 58 L8 38 L39 37 Z';

export function starColor(worth: number): string {
  if (worth >= 50) return '#F472B6'; // comet — pink
  if (worth >= 25) return '#C084FC'; // purple
  if (worth >= 15) return '#38BDF8'; // cyan
  if (worth >= 10) return '#FBBF24'; // gold
  return '#FDE047';                  // yellow
}

export function StarToken({ size = 48, worth = 5 }: { size?: number; worth?: number }) {
  const id = React.useId().replace(/:/g, '');
  const c = starColor(worth);
  const comet = worth >= 50;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={`sg${id}`} cx="0.5" cy="0.4" r="0.65">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.55" stopColor={c} />
          <Stop offset="1" stopColor={darken(c, 0.22)} />
        </RadialGradient>
        <RadialGradient id={`sgl${id}`} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor={c} stopOpacity={0.55} />
          <Stop offset="1" stopColor={c} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {/* glow halo */}
      <Circle cx={50} cy={50} r={48} fill={`url(#sgl${id})`} />
      {comet && (
        <Path d="M30 70 L8 92 M42 76 L26 96 M22 58 L2 74" stroke={c} strokeWidth={5} strokeLinecap="round" opacity={0.7} />
      )}
      <Path d={STAR_PATH} fill={`url(#sg${id})`} stroke={lighten(c, 0.4)} strokeWidth={2.5} strokeLinejoin="round" />
      {/* sparkle highlight */}
      <Circle cx={42} cy={36} r={5} fill="#FFFFFF" opacity={0.8} />
    </Svg>
  );
}

export { GLYPHS };
