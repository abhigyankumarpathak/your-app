// ─────────────────────────────────────────────────────────────────────────────
// PetArt — hand-built vector creatures that evolve with the player's level.
//
// One cohesive "rounded geometric mascot" art style. Everything is tinted from
// the theme accent so the companion always matches the app, except signature
// creatures (phoenix fire, unicorn white) which keep their identity.
//
// All art is drawn on a 100×100 viewBox and scales crisply to any size.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Polygon,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { darken, lighten, mix } from '../../theme/design';

export type PetArtKey =
  | 'egg' | 'hatchling' | 'chick' | 'fox' | 'wolf'
  | 'eagle' | 'unicorn' | 'dragon' | 'phoenix';

interface Pal {
  main: string; light: string; dark: string; belly: string; deep: string;
}
function palette(accent: string): Pal {
  return {
    light: lighten(accent, 0.26),
    main: accent,
    dark: darken(accent, 0.18),
    deep: darken(accent, 0.34),
    belly: lighten(accent, 0.52),
  };
}

// Shared facial features ------------------------------------------------------
function Eyes({ cx1, cx2, cy, r = 5, look = '#1A1A2E' }: { cx1: number; cx2: number; cy: number; r?: number; look?: string }) {
  return (
    <G>
      <Circle cx={cx1} cy={cy} r={r} fill={look} />
      <Circle cx={cx2} cy={cy} r={r} fill={look} />
      <Circle cx={cx1 + r * 0.35} cy={cy - r * 0.35} r={r * 0.32} fill="#fff" />
      <Circle cx={cx2 + r * 0.35} cy={cy - r * 0.35} r={r * 0.32} fill="#fff" />
    </G>
  );
}

// ── Individual creatures ─────────────────────────────────────────────────────

function Egg({ p }: { p: Pal }) {
  return (
    <G>
      <Ellipse cx={50} cy={88} rx={26} ry={6} fill="#000" opacity={0.08} />
      <Defs>
        <LinearGradient id="eggG" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={lighten(p.belly, 0.3)} />
          <Stop offset="1" stopColor={p.belly} />
        </LinearGradient>
      </Defs>
      <Path d="M50 16 C68 16 78 44 78 62 C78 80 66 90 50 90 C34 90 22 80 22 62 C22 44 32 16 50 16 Z" fill="url(#eggG)" stroke={mix(p.belly, p.main, 0.4)} strokeWidth={1.5} />
      {/* spots */}
      <Circle cx={40} cy={50} r={5} fill={p.main} opacity={0.25} />
      <Circle cx={60} cy={66} r={6} fill={p.main} opacity={0.22} />
      <Circle cx={54} cy={40} r={3.5} fill={p.main} opacity={0.25} />
      {/* crack hint */}
      <Path d="M40 34 l5 6 l-4 5 l6 4" fill="none" stroke={p.dark} strokeWidth={1.6} strokeLinejoin="round" opacity={0.55} />
      {/* highlight */}
      <Ellipse cx={40} cy={36} rx={6} ry={10} fill="#fff" opacity={0.4} />
      {/* sparkle */}
      <Path d="M70 28 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z" fill="#fff" opacity={0.85} />
    </G>
  );
}

function Hatchling({ p }: { p: Pal }) {
  return (
    <G>
      <Ellipse cx={50} cy={90} rx={24} ry={5} fill="#000" opacity={0.08} />
      {/* bottom shell */}
      <Path d="M24 64 C24 82 36 90 50 90 C64 90 76 82 76 64 L72 68 l-6 -6 l-7 7 l-9 -8 l-8 8 l-6 -6 Z" fill={p.belly} stroke={mix(p.belly, p.main, 0.4)} strokeWidth={1.5} strokeLinejoin="round" />
      {/* chick body popping out */}
      <Circle cx={50} cy={50} r={22} fill={p.light} />
      <Circle cx={50} cy={50} r={22} fill="none" stroke={p.main} strokeWidth={1.2} opacity={0.5} />
      {/* tuft */}
      <Path d="M50 30 q-3 -10 2 -14 q2 6 -2 14" fill={p.main} />
      <Path d="M50 30 q3 -9 8 -10 q-1 6 -8 10" fill={p.dark} />
      <Eyes cx1={43} cx2={57} cy={48} r={4} />
      {/* beak */}
      <Polygon points="50,54 45,60 55,60" fill="#F6A623" />
      {/* cheeks */}
      <Circle cx={38} cy={56} r={3.5} fill={p.main} opacity={0.3} />
      <Circle cx={62} cy={56} r={3.5} fill={p.main} opacity={0.3} />
    </G>
  );
}

function Chick({ p }: { p: Pal }) {
  return (
    <G>
      <Ellipse cx={50} cy={92} rx={22} ry={5} fill="#000" opacity={0.08} />
      {/* feet */}
      <Path d="M42 86 l0 6 M42 92 l-4 3 M42 92 l4 3" stroke="#F6A623" strokeWidth={2.4} strokeLinecap="round" />
      <Path d="M58 86 l0 6 M58 92 l-4 3 M58 92 l4 3" stroke="#F6A623" strokeWidth={2.4} strokeLinecap="round" />
      {/* body */}
      <Ellipse cx={50} cy={66} rx={20} ry={19} fill={p.light} />
      {/* wing */}
      <Path d="M33 64 q-6 6 0 14 q6 0 8 -6 Z" fill={p.main} opacity={0.85} />
      <Path d="M67 64 q6 6 0 14 q-6 0 -8 -6 Z" fill={p.main} opacity={0.85} />
      {/* head */}
      <Circle cx={50} cy={40} r={18} fill={p.light} />
      {/* tuft */}
      <Path d="M44 24 q-2 -8 3 -11 M50 22 q0 -9 4 -11 M56 24 q3 -7 7 -8" stroke={p.main} strokeWidth={3} strokeLinecap="round" fill="none" />
      <Eyes cx1={43} cx2={57} cy={40} r={4.5} />
      <Polygon points="50,46 43,53 57,53" fill="#F6A623" />
      <Circle cx={37} cy={46} r={4} fill={p.main} opacity={0.28} />
      <Circle cx={63} cy={46} r={4} fill={p.main} opacity={0.28} />
    </G>
  );
}

function Fox({ p }: { p: Pal }) {
  return (
    <G>
      <Ellipse cx={50} cy={92} rx={22} ry={5} fill="#000" opacity={0.08} />
      {/* tail */}
      <Path d="M74 70 q18 -2 16 16 q-12 6 -20 -6 Z" fill={p.main} />
      <Path d="M82 80 q6 0 8 6 q-6 3 -10 -2 Z" fill={p.belly} />
      {/* body */}
      <Path d="M30 86 q-2 -20 20 -20 q22 0 20 20 Z" fill={p.main} />
      <Path d="M40 86 q-1 -12 10 -12 q11 0 10 12 Z" fill={p.belly} />
      {/* ears */}
      <Polygon points="30,40 24,14 46,32" fill={p.main} />
      <Polygon points="70,40 76,14 54,32" fill={p.main} />
      <Polygon points="32,36 29,22 40,31" fill={p.deep} />
      <Polygon points="68,36 71,22 60,31" fill={p.deep} />
      {/* face */}
      <Path d="M28 42 q0 -14 22 -14 q22 0 22 14 q0 20 -22 26 q-22 -6 -22 -26 Z" fill={p.main} />
      {/* white muzzle */}
      <Path d="M50 50 q-14 2 -12 14 q4 8 12 10 q8 -2 12 -10 q2 -12 -12 -14 Z" fill={p.belly} />
      <Eyes cx1={41} cx2={59} cy={48} r={4.6} />
      {/* nose */}
      <Polygon points="50,62 46,67 54,67" fill="#22202E" />
      <Path d="M50 67 l0 5" stroke="#22202E" strokeWidth={1.6} strokeLinecap="round" />
    </G>
  );
}

function Wolf({ p }: { p: Pal }) {
  const steel = mix(p.main, '#64748B', 0.45);
  const steelL = lighten(steel, 0.22);
  const steelD = darken(steel, 0.2);
  return (
    <G>
      <Ellipse cx={50} cy={92} rx={24} ry={5} fill="#000" opacity={0.09} />
      {/* tail */}
      <Path d="M72 74 q20 4 18 -14 q-14 -2 -20 10 Z" fill={steel} />
      {/* body */}
      <Path d="M26 88 q-3 -22 24 -22 q27 0 24 22 Z" fill={steel} />
      <Path d="M38 88 q-1 -13 12 -13 q13 0 12 13 Z" fill={steelL} />
      {/* ears */}
      <Polygon points="30,38 26,10 48,30" fill={steel} />
      <Polygon points="70,38 74,10 52,30" fill={steel} />
      <Polygon points="33,34 31,18 42,29" fill={steelD} />
      <Polygon points="67,34 69,18 58,29" fill={steelD} />
      {/* head */}
      <Path d="M26 40 q0 -12 24 -12 q24 0 24 12 q0 16 -10 24 l-14 0 q-24 -8 -24 -24 Z" fill={steel} />
      {/* snout */}
      <Path d="M50 52 q-9 1 -9 12 l0 8 q9 6 18 0 l0 -8 q0 -11 -9 -12 Z" fill={steelL} />
      <Eyes cx1={40} cx2={60} cy={46} r={4.4} look={darken(p.main, 0.05)} />
      <Polygon points="50,64 45,70 55,70" fill="#1B1B26" />
      <Path d="M50 70 l0 6" stroke="#1B1B26" strokeWidth={1.8} strokeLinecap="round" />
      {/* brow tufts (fierce) */}
      <Path d="M34 40 l10 3 M66 40 l-10 3" stroke={steelD} strokeWidth={2.4} strokeLinecap="round" />
    </G>
  );
}

function Eagle({ p }: { p: Pal }) {
  const wing = darken(p.main, 0.12);
  return (
    <G>
      <Ellipse cx={50} cy={93} rx={20} ry={4.5} fill="#000" opacity={0.09} />
      {/* wings spread */}
      <Path d="M48 56 q-30 -18 -42 -6 q14 4 18 12 q-12 -2 -16 6 q18 4 40 0 Z" fill={wing} />
      <Path d="M52 56 q30 -18 42 -6 q-14 4 -18 12 q12 -2 16 6 q-18 4 -40 0 Z" fill={wing} />
      <Path d="M48 56 q-30 -18 -42 -6 q14 4 18 12 q-12 -2 -16 6 q18 4 40 0 Z" fill="#000" opacity={0.08} />
      {/* body */}
      <Path d="M50 50 q-14 0 -12 22 q12 12 24 0 q2 -22 -12 -22 Z" fill={wing} />
      <Path d="M50 60 q-6 0 -5 11 q5 5 10 0 q1 -11 -5 -11 Z" fill={darken(p.main, 0.28)} />
      {/* white head */}
      <Circle cx={50} cy={36} r={17} fill="#F4F6FB" />
      <Path d="M50 19 a17 17 0 0 1 0 34 q-6 -17 0 -34 Z" fill="#E2E8F0" />
      <Eyes cx1={44} cx2={56} cy={34} r={4.2} look="#1B1B26" />
      {/* hooked beak */}
      <Path d="M50 40 q-7 1 -7 7 q4 4 7 1 q4 5 7 -1 q0 -6 -7 -7 Z" fill="#F2A900" />
      <Path d="M50 44 q-3 1 -3 5 q3 3 6 0 q0 -4 -3 -5 Z" fill="#D98C00" />
    </G>
  );
}

function Unicorn({ p }: { p: Pal }) {
  return (
    <G>
      <Defs>
        <LinearGradient id="mane" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={lighten(p.main, 0.25)} />
          <Stop offset="1" stopColor={darken(p.main, 0.1)} />
        </LinearGradient>
        <LinearGradient id="horn" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFE9A8" />
          <Stop offset="1" stopColor="#F2B705" />
        </LinearGradient>
      </Defs>
      <Ellipse cx={50} cy={93} rx={20} ry={4.5} fill="#000" opacity={0.08} />
      {/* neck/head white */}
      <Path d="M40 88 q-6 -26 6 -40 q6 -7 16 -6 q12 1 12 14 q0 12 -8 18 q4 8 -2 14 Z" fill="#FBFCFE" />
      {/* muzzle */}
      <Path d="M64 56 q12 2 12 12 q-2 8 -12 6 q-6 -10 0 -18 Z" fill="#F1F3F8" />
      {/* mane */}
      <Path d="M44 22 q-12 6 -10 22 q6 -4 8 -2 q-6 8 -4 18 q6 -6 8 -4 q-2 8 0 16 q8 -10 6 -30 q-2 -14 -8 -20 Z" fill="url(#mane)" />
      {/* horn */}
      <Polygon points="52,8 48,26 56,26" fill="url(#horn)" />
      <Path d="M50 12 l4 8 M49 18 l5 6" stroke="#C9960A" strokeWidth={1.2} opacity={0.7} />
      {/* ear */}
      <Polygon points="60,20 66,10 68,22" fill="#F1F3F8" />
      <Eyes cx1={62} cx2={62} cy={44} r={4} />
      <Circle cx={70} cy={62} r={2} fill="#C0C6D4" />
      {/* sparkles */}
      <Path d="M30 40 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5 Z" fill={p.main} opacity={0.9} />
      <Circle cx={26} cy={58} r={2} fill={p.light} />
    </G>
  );
}

function Dragon({ p }: { p: Pal }) {
  const scale = mix(p.main, '#16A34A', 0.25);
  const scaleL = lighten(scale, 0.2);
  const scaleD = darken(scale, 0.22);
  return (
    <G>
      <Ellipse cx={50} cy={93} rx={22} ry={4.5} fill="#000" opacity={0.1} />
      {/* wing */}
      <Path d="M64 50 q26 -16 30 4 q-8 -2 -12 2 q8 2 8 10 q-10 0 -14 -4 q-2 8 -8 8 Z" fill={scaleD} />
      <Path d="M70 48 q14 -6 20 2 M72 56 q10 -2 16 4" stroke={scale} strokeWidth={1.4} opacity={0.5} fill="none" />
      {/* body */}
      <Path d="M28 86 q-6 -24 22 -24 q28 0 22 24 Z" fill={scale} />
      <Path d="M40 86 q-2 -14 10 -14 q12 0 10 14 Z" fill={lighten(scale, 0.4)} />
      {/* belly ridges */}
      <Path d="M44 80 h12 M43 74 h14 M44 68 h12" stroke={darken(lighten(scale, 0.4), 0.12)} strokeWidth={1.4} opacity={0.6} />
      {/* head */}
      <Path d="M28 44 q0 -16 24 -16 q22 0 22 16 q0 16 -12 22 l-12 0 q-22 -6 -22 -22 Z" fill={scale} />
      {/* snout */}
      <Path d="M30 50 q-2 8 6 12 q8 3 8 -4 q-2 -10 -14 -8 Z" fill={scaleL} />
      {/* horns */}
      <Path d="M40 28 q-4 -14 -12 -16 q4 8 6 18 Z" fill={scaleD} />
      <Path d="M60 28 q4 -14 12 -16 q-4 8 -6 18 Z" fill={scaleD} />
      {/* back spikes */}
      <Polygon points="52,34 58,24 62,36" fill={scaleD} />
      <Polygon points="62,40 70,32 72,44" fill={scaleD} />
      {/* eye (reptilian) */}
      <Ellipse cx={42} cy={42} rx={5} ry={5.5} fill="#FDE047" />
      <Ellipse cx={42} cy={42} rx={1.6} ry={5} fill="#1B1B26" />
      {/* nostril */}
      <Circle cx={32} cy={54} r={1.6} fill="#1B1B26" />
      {/* tiny smoke */}
      <Circle cx={26} cy={50} r={2.2} fill={scaleL} opacity={0.6} />
      <Circle cx={21} cy={46} r={1.6} fill={scaleL} opacity={0.4} />
    </G>
  );
}

function Phoenix() {
  return (
    <G>
      <Defs>
        <RadialGradient id="phx" cx="0.5" cy="0.4" r="0.7">
          <Stop offset="0" stopColor="#FFF3C4" />
          <Stop offset="0.5" stopColor="#FB923C" />
          <Stop offset="1" stopColor="#E11D48" />
        </RadialGradient>
        <LinearGradient id="phxWing" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FBBF24" />
          <Stop offset="1" stopColor="#DC2626" />
        </LinearGradient>
      </Defs>
      <Ellipse cx={50} cy={93} rx={18} ry={4} fill="#000" opacity={0.08} />
      {/* flame aura */}
      <Circle cx={50} cy={52} r={34} fill="#FB923C" opacity={0.16} />
      {/* wings as flames */}
      <Path d="M48 54 q-28 -10 -34 -34 q16 8 22 18 q-6 -14 -2 -26 q10 14 12 30 Z" fill="url(#phxWing)" />
      <Path d="M52 54 q28 -10 34 -34 q-16 8 -22 18 q6 -14 2 -26 q-10 14 -12 30 Z" fill="url(#phxWing)" />
      {/* body */}
      <Path d="M50 40 q-13 0 -12 24 q3 16 12 22 q9 -6 12 -22 q1 -24 -12 -24 Z" fill="url(#phx)" />
      {/* tail flames */}
      <Path d="M50 80 q-8 12 -4 20 q4 -6 6 -8 q0 8 -2 10 q6 -4 6 -12 q4 6 2 12 q6 -10 -2 -22 Z" fill="url(#phxWing)" />
      {/* head crest */}
      <Path d="M50 22 q-4 -12 0 -18 q4 6 0 18 Z" fill="#FBBF24" />
      <Circle cx={50} cy={34} r={12} fill="url(#phx)" />
      <Eyes cx1={45} cx2={55} cy={33} r={3.4} look="#3B0A0A" />
      <Polygon points="50,38 44,44 56,44" fill="#FDE047" />
      {/* embers */}
      <Circle cx={24} cy={30} r={2} fill="#FBBF24" opacity={0.9} />
      <Circle cx={78} cy={36} r={1.6} fill="#F87171" opacity={0.9} />
      <Circle cx={70} cy={22} r={1.4} fill="#FDE047" opacity={0.9} />
    </G>
  );
}

const RENDERERS: Record<PetArtKey, (p: Pal) => React.ReactElement> = {
  egg: (p) => <Egg p={p} />,
  hatchling: (p) => <Hatchling p={p} />,
  chick: (p) => <Chick p={p} />,
  fox: (p) => <Fox p={p} />,
  wolf: (p) => <Wolf p={p} />,
  eagle: (p) => <Eagle p={p} />,
  unicorn: (p) => <Unicorn p={p} />,
  dragon: (p) => <Dragon p={p} />,
  phoenix: () => <Phoenix />,
};

interface Props {
  art: PetArtKey;
  size?: number;
  accent: string;
}

export default function PetArt({ art, size = 96, accent }: Props) {
  const p = palette(accent);
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {RENDERERS[art](p)}
    </Svg>
  );
}
