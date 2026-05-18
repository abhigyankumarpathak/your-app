import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';

interface ThemeContextType {
  colorName: string;
  accentColor: string;
  setTheme: (name: string) => Promise<void>;
  customColor: string | null;
  setCustomColor: (hex: string | null) => Promise<void>;
  preset: string;
  setPreset: (name: string) => Promise<void>;
  presetValues: { bg: string; bgSecondary: string; cardBg: string; text: string; textSecondary: string; borderColor: string };
  fontSize: string;
  setFontSize: (name: string) => Promise<void>;
  fontSizes: { base: number; title: number; heading: number };
  enableAnimations: boolean;
  toggleAnimations: () => Promise<void>;
  avatar: string;
  setAvatar: (emoji: string) => Promise<void>;
  avatarBg: string;
  setAvatarBg: (hex: string) => Promise<void>;
  avatarImage: string | null;
  setAvatarImage: (uri: string | null) => Promise<void>;
}

export const THEME_COLORS = {
  Blue: '#3B82F6',
  Green: '#10B981',
  Purple: '#8B5CF6',
  Orange: '#F59E0B',
  Pink: '#EC4899',
  Red: '#EF4444',
  Indigo: '#6366F1',
  Cyan: '#06B6D4',
};

export const THEME_PRESETS = {
  Light: {
    bg: '#F5F5F7',
    bgSecondary: '#ECECEF',
    cardBg: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#6B7280',
    borderColor: '#E5E5EA',
  },
  Dark: {
    bg: '#0B1020',
    bgSecondary: '#161B2E',
    cardBg: '#1B2238',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    borderColor: '#2A3247',
  },
  Warm: {
    bg: '#FDF6EC',
    bgSecondary: '#FAF0E4',
    cardBg: '#FFFFFF',
    text: '#2D1B00',
    textSecondary: '#8B6A3E',
    borderColor: '#E8D5B7',
  },
  Midnight: {
    bg: '#000814',
    bgSecondary: '#0B132B',
    cardBg: '#10182F',
    text: '#E0E7FF',
    textSecondary: '#94A3B8',
    borderColor: '#1E293B',
  },
  Mint: {
    bg: '#F0FDF4',
    bgSecondary: '#DCFCE7',
    cardBg: '#FFFFFF',
    text: '#052E16',
    textSecondary: '#15803D',
    borderColor: '#BBF7D0',
  },
};

export const FONT_SIZES = {
  Small: { base: 13, title: 15, heading: 20 },
  Medium: { base: 15, title: 17, heading: 24 },
  Large: { base: 17, title: 19, heading: 28 },
};

export const AVATAR_OPTIONS = [
  '🦊', '🐼', '🐧', '🐯', '🦁', '🐻', '🐨', '🐸',
  '🦄', '🐲', '🦉', '🦋', '🌟', '⚡', '🔥', '💎',
  '🚀', '🎮', '🎯', '🎨', '📚', '🧠', '👑', '🤖',
];

const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorName, setColorName] = useState('Blue');
  const [customColor, setCustomColorState] = useState<string | null>(null);
  const [preset, setPresetState] = useState('Light');
  const [fontSize, setFontSizeState] = useState('Medium');
  const [enableAnimations, setEnableAnimations] = useState(true);
  const [avatar, setAvatarState] = useState('🦊');
  const [avatarBg, setAvatarBgState] = useState('#3B82F6');
  const [avatarImage, setAvatarImageState] = useState<string | null>(null);

  const loadFromStorage = async () => {
    const values = await AsyncStorage.multiGet([
      'focusThemeColor',
      'focusCustomColor',
      'focusThemePreset',
      'focusFontSize',
      'focusEnableAnimations',
      'focusAvatar',
      'focusAvatarBg',
      'focusAvatarImage',
    ]);
    const [color, custom, presetVal, fontSizeVal, animVal, av, avBg, avImg] = values;
    if (color[1] && (THEME_COLORS as Record<string, string>)[color[1]]) setColorName(color[1]);
    if (custom[1]) setCustomColorState(custom[1]);
    else setCustomColorState(null);
    if (presetVal[1] && (THEME_PRESETS as Record<string, any>)[presetVal[1]]) setPresetState(presetVal[1]);
    if (fontSizeVal[1] && (FONT_SIZES as Record<string, any>)[fontSizeVal[1]]) setFontSizeState(fontSizeVal[1]);
    if (animVal[1] !== null) setEnableAnimations(animVal[1] === 'true');
    if (av[1]) setAvatarState(av[1]);
    if (avBg[1]) setAvatarBgState(avBg[1]);
    setAvatarImageState(avImg[1] ?? null);
  };

  useEffect(() => {
    loadFromStorage();
    const sub = DeviceEventEmitter.addListener('CLOUD_PULLED', () => {
      loadFromStorage();
    });
    return () => sub.remove();
  }, []);

  const setTheme = async (name: string) => {
    setColorName(name);
    setCustomColorState(null);
    await AsyncStorage.setItem('focusThemeColor', name);
    await AsyncStorage.removeItem('focusCustomColor');
  };

  const setCustomColor = async (hex: string | null) => {
    setCustomColorState(hex);
    if (hex) await AsyncStorage.setItem('focusCustomColor', hex);
    else await AsyncStorage.removeItem('focusCustomColor');
  };

  const setPreset = async (name: string) => {
    setPresetState(name);
    await AsyncStorage.setItem('focusThemePreset', name);
  };

  const setFontSize = async (name: string) => {
    setFontSizeState(name);
    await AsyncStorage.setItem('focusFontSize', name);
  };

  const toggleAnimations = async () => {
    const newVal = !enableAnimations;
    setEnableAnimations(newVal);
    await AsyncStorage.setItem('focusEnableAnimations', String(newVal));
  };

  const setAvatar = async (emoji: string) => {
    setAvatarState(emoji);
    await AsyncStorage.setItem('focusAvatar', emoji);
  };

  const setAvatarBg = async (hex: string) => {
    setAvatarBgState(hex);
    await AsyncStorage.setItem('focusAvatarBg', hex);
  };

  const setAvatarImage = async (uri: string | null) => {
    setAvatarImageState(uri);
    if (uri) await AsyncStorage.setItem('focusAvatarImage', uri);
    else await AsyncStorage.removeItem('focusAvatarImage');
  };

  const accentColor = customColor || (THEME_COLORS as Record<string, string>)[colorName];

  return (
    <ThemeContext.Provider value={{
      colorName,
      accentColor,
      setTheme,
      customColor,
      setCustomColor,
      preset,
      setPreset,
      presetValues: (THEME_PRESETS as Record<string, any>)[preset],
      fontSize,
      setFontSize,
      fontSizes: (FONT_SIZES as Record<string, any>)[fontSize],
      enableAnimations,
      toggleAnimations,
      avatar,
      setAvatar,
      avatarBg,
      setAvatarBg,
      avatarImage,
      setAvatarImage,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
