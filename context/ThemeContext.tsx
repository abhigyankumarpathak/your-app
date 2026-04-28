import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

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
    bg: '#F5F5F5',
    bgSecondary: '#EFEFEF',
    cardBg: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#888888',
    borderColor: '#E5E5E5',
  },
  Dark: {
    bg: '#111827',
    bgSecondary: '#1F2937',
    cardBg: '#1F2937',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    borderColor: '#374151',
  },
  Warm: {
    bg: '#FDF6EC',
    bgSecondary: '#FAF0E4',
    cardBg: '#FFFFFF',
    text: '#2D1B00',
    textSecondary: '#8B6A3E',
    borderColor: '#E8D5B7',
  },
};

export const FONT_SIZES = {
  Small: { base: 13, title: 15, heading: 20 },
  Medium: { base: 15, title: 17, heading: 24 },
  Large: { base: 17, title: 19, heading: 28 },
};

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [colorName, setColorName] = useState('Blue');
  const [preset, setPresetState] = useState('Light');
  const [fontSize, setFontSizeState] = useState('Medium');
  const [enableAnimations, setEnableAnimations] = useState(true);

  useEffect(() => {
    AsyncStorage.multiGet([
      'focusThemeColor',
      'focusThemePreset',
      'focusFontSize',
      'focusEnableAnimations',
    ]).then((values) => {
      const [color, presetVal, fontSizeVal, animVal] = values;
      if (color[1] && THEME_COLORS[color[1]]) setColorName(color[1]);
      if (presetVal[1] && THEME_PRESETS[presetVal[1]]) setPresetState(presetVal[1]);
      if (fontSizeVal[1] && FONT_SIZES[fontSizeVal[1]]) setFontSizeState(fontSizeVal[1]);
      if (animVal[1] !== null) setEnableAnimations(animVal[1] === 'true');
    });
  }, []);

  const setTheme = async (name) => {
    setColorName(name);
    await AsyncStorage.setItem('focusThemeColor', name);
  };

  const setPreset = async (name) => {
    setPresetState(name);
    await AsyncStorage.setItem('focusThemePreset', name);
  };

  const setFontSize = async (name) => {
    setFontSizeState(name);
    await AsyncStorage.setItem('focusFontSize', name);
  };

  const toggleAnimations = async () => {
    const newVal = !enableAnimations;
    setEnableAnimations(newVal);
    await AsyncStorage.setItem('focusEnableAnimations', String(newVal));
  };

  return (
    <ThemeContext.Provider value={{
      colorName,
      accentColor: THEME_COLORS[colorName],
      setTheme,
      preset,
      setPreset,
      presetValues: THEME_PRESETS[preset],
      fontSize,
      setFontSize,
      fontSizes: FONT_SIZES[fontSize],
      enableAnimations,
      toggleAnimations,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);