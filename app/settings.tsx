import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert, DeviceEventEmitter, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { FONT_SIZES, THEME_COLORS, THEME_PRESETS, useTheme } from '../context/ThemeContext';

const GRADES = ['6th', '7th', '8th', '9th', '10th', '11th', '12th', 'College'];
const SUBJECTS = ['Math', 'Science', 'English', 'History', 'CS/Coding', 'Art', 'Music', 'Languages', 'PE/Sports', 'Other'];
const FOCUS_AREAS = [
  { icon: '📚', label: 'Academic Excellence' },
  { icon: '🏆', label: 'Competitions & Awards' },
  { icon: '❤️', label: 'Health & Wellness' },
  { icon: '⏰', label: 'Time Management' },
  { icon: '🎯', label: 'Personal Growth' },
  { icon: '🤝', label: 'Extracurriculars' },
];
const STUDY_HOURS = ['1', '1.5', '2', '3', '4', '5+'];

interface UserProfile {
  name: string;
  grade: string;
  school: string;
  subjects: string[];
  focusAreas: string[];
  studyGoalHours: string;
}

const DEFAULT_PROFILE: UserProfile = {
  name: '', grade: '', school: '', subjects: [], focusAreas: [], studyGoalHours: '2',
};

export default function Settings() {
  const {
    colorName, setTheme, preset, setPreset,
    fontSize, setFontSize, enableAnimations, toggleAnimations,
    presetValues, fontSizes,
  } = useTheme();

  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await AsyncStorage.getItem('focusUserProfile');
      if (data) setProfile(JSON.parse(data));
    } catch (_) {}
  };

  const saveProfile = async () => {
    try {
      await AsyncStorage.setItem('focusUserProfile', JSON.stringify(profile));
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (_) {
      Alert.alert('Error', 'Could not save profile.');
    }
  };

  const toggleSubject = (s: string) => {
    setProfile((p) => ({
      ...p,
      subjects: p.subjects.includes(s) ? p.subjects.filter((x) => x !== s) : [...p.subjects, s],
    }));
  };

  const handleReset = () => {
    Alert.alert(
      'Reset App',
      'This will clear all your data and take you back to the beginning. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                'focusOnboardingComplete',
                'focusUserProfile',
                'focusSessions',
                'focusTasks',
                'focusActivities',
                'focusWellness',
                'focusGoals',
                'focusThemeColor',
                'focusThemePreset',
                'focusFontSize',
                'focusEnableAnimations',
              ]);
              DeviceEventEmitter.emit('RESET_APP');
            } catch (_) {
              Alert.alert('Error', 'Could not reset the app. Please try again.');
            }
          },
        },
      ]
    );
  };

  const toggleFocusArea = (f: string) => {
    setProfile((p) => ({
      ...p,
      focusAreas: p.focusAreas.includes(f) ? p.focusAreas.filter((x) => x !== f) : [...p.focusAreas, f],
    }));
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: presetValues.bg }]}>
      <View style={[styles.header, { backgroundColor: '#EC4899' }]}>
        <Text style={[styles.headerTitle, { fontSize: fontSizes.heading, color: '#fff' }]}>
          ⚙️ Customization
        </Text>
        <Text style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.9)' }]}>
          Make Focus yours
        </Text>
      </View>

      <View style={styles.content}>

        {/* ── Your Profile ─────────────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: presetValues.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: presetValues.text, fontSize: fontSizes.title }]}>
            👤 Your Profile
          </Text>

          {/* Name */}
          <Text style={[styles.fieldLabel, { color: presetValues.text, fontSize: fontSizes.base }]}>Name</Text>
          <TextInput
            style={[styles.input, {
              backgroundColor: presetValues.bgSecondary,
              color: presetValues.text,
              borderColor: presetValues.borderColor,
              fontSize: fontSizes.base,
            }]}
            placeholder="Your name"
            placeholderTextColor={presetValues.textSecondary}
            value={profile.name}
            onChangeText={(v) => setProfile((p) => ({ ...p, name: v }))}
          />

          {/* School */}
          <Text style={[styles.fieldLabel, { color: presetValues.text, fontSize: fontSizes.base }]}>School (optional)</Text>
          <TextInput
            style={[styles.input, {
              backgroundColor: presetValues.bgSecondary,
              color: presetValues.text,
              borderColor: presetValues.borderColor,
              fontSize: fontSizes.base,
            }]}
            placeholder="Your school"
            placeholderTextColor={presetValues.textSecondary}
            value={profile.school}
            onChangeText={(v) => setProfile((p) => ({ ...p, school: v }))}
          />

          {/* Grade */}
          <Text style={[styles.fieldLabel, { color: presetValues.text, fontSize: fontSizes.base }]}>Grade</Text>
          <View style={styles.chipGrid}>
            {GRADES.map((g) => (
              <TouchableOpacity
                key={g}
                style={[
                  styles.chip,
                  { backgroundColor: presetValues.bgSecondary, borderColor: presetValues.borderColor },
                  profile.grade === g && { backgroundColor: '#6366F1', borderColor: '#6366F1' },
                ]}
                onPress={() => setProfile((p) => ({ ...p, grade: g }))}
              >
                <Text style={[
                  styles.chipText,
                  { color: presetValues.text, fontSize: fontSizes.base - 1 },
                  profile.grade === g && { color: '#fff' },
                ]}>
                  {g}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Subjects */}
          <Text style={[styles.fieldLabel, { color: presetValues.text, fontSize: fontSizes.base, marginTop: 12 }]}>Subjects</Text>
          <View style={styles.chipGrid}>
            {SUBJECTS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.chip,
                  { backgroundColor: presetValues.bgSecondary, borderColor: presetValues.borderColor },
                  profile.subjects.includes(s) && { backgroundColor: '#6366F1', borderColor: '#6366F1' },
                ]}
                onPress={() => toggleSubject(s)}
              >
                <Text style={[
                  styles.chipText,
                  { color: presetValues.text, fontSize: fontSizes.base - 1 },
                  profile.subjects.includes(s) && { color: '#fff' },
                ]}>
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Focus Areas */}
          <Text style={[styles.fieldLabel, { color: presetValues.text, fontSize: fontSizes.base, marginTop: 12 }]}>Focus Areas</Text>
          <View style={styles.chipGrid}>
            {FOCUS_AREAS.map((f) => (
              <TouchableOpacity
                key={f.label}
                style={[
                  styles.chip,
                  styles.chipWide,
                  { backgroundColor: presetValues.bgSecondary, borderColor: presetValues.borderColor },
                  profile.focusAreas.includes(f.label) && { backgroundColor: '#6366F1', borderColor: '#6366F1' },
                ]}
                onPress={() => toggleFocusArea(f.label)}
              >
                <Text style={[
                  styles.chipText,
                  { color: presetValues.text, fontSize: fontSizes.base - 1 },
                  profile.focusAreas.includes(f.label) && { color: '#fff' },
                ]}>
                  {f.icon} {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Daily Study Goal */}
          <Text style={[styles.fieldLabel, { color: presetValues.text, fontSize: fontSizes.base, marginTop: 12 }]}>
            Daily Study Goal
          </Text>
          <View style={styles.chipGrid}>
            {STUDY_HOURS.map((h) => (
              <TouchableOpacity
                key={h}
                style={[
                  styles.chip,
                  { backgroundColor: presetValues.bgSecondary, borderColor: presetValues.borderColor },
                  profile.studyGoalHours === h && { backgroundColor: '#6366F1', borderColor: '#6366F1' },
                ]}
                onPress={() => setProfile((p) => ({ ...p, studyGoalHours: h }))}
              >
                <Text style={[
                  styles.chipText,
                  { color: presetValues.text, fontSize: fontSizes.base - 1 },
                  profile.studyGoalHours === h && { color: '#fff' },
                ]}>
                  {h}h
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: profileSaved ? '#10B981' : '#6366F1' }]}
            onPress={saveProfile}
          >
            <Text style={[styles.saveBtnText, { fontSize: fontSizes.base }]}>
              {profileSaved ? '✅ Saved!' : '💾 Save Profile'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Theme Style ───────────────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: presetValues.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: presetValues.text, fontSize: fontSizes.title }]}>
            📱 Theme Style
          </Text>
          <View style={styles.presetGrid}>
            {Object.entries(THEME_PRESETS).map(([key, themeData]: [string, any]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.presetBtn,
                  {
                    backgroundColor: (themeData as any).bg,
                    borderColor: preset === key ? '#000' : (themeData as any).borderColor,
                    borderWidth: preset === key ? 3 : 1,
                  },
                ]}
                onPress={() => setPreset(key)}
              >
                <Text style={[styles.presetName, { color: (themeData as any).text, fontSize: fontSizes.base }]}>
                  {key}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Accent Color ──────────────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: presetValues.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: presetValues.text, fontSize: fontSizes.title }]}>
            🎨 Accent Color
          </Text>
          <View style={styles.colorGrid}>
            {Object.entries(THEME_COLORS).map(([name, hex]) => (
              <TouchableOpacity
                key={name}
                style={[
                  styles.colorBtn,
                  { backgroundColor: hex },
                  colorName === name && styles.selected,
                ]}
                onPress={() => setTheme(name)}
              >
                {colorName === name && <Text style={styles.check}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.labelRow}>
            {Object.keys(THEME_COLORS).map(name => (
              <Text
                key={name}
                style={[
                  styles.colorLabel,
                  colorName === name && { color: presetValues.text, fontWeight: '700' },
                  colorName !== name && { color: presetValues.textSecondary },
                  { fontSize: fontSizes.base - 2 },
                ]}
              >
                {name}
              </Text>
            ))}
          </View>
        </View>

        {/* ── Font Size ─────────────────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: presetValues.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: presetValues.text, fontSize: fontSizes.title }]}>
            📝 Text Size
          </Text>
          <View style={styles.fontSizeGrid}>
            {Object.entries(FONT_SIZES).map(([key, sizes]: [string, any]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.fontSizeBtn,
                  {
                    backgroundColor: fontSize === key ? presetValues.text : presetValues.bgSecondary,
                    borderColor: presetValues.borderColor,
                  },
                ]}
                onPress={() => setFontSize(key)}
              >
                <Text
                  style={[
                    styles.fontSizeText,
                    {
                      color: fontSize === key ? presetValues.bg : presetValues.text,
                      fontSize: (sizes as any).base,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {key}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Animations ────────────────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: presetValues.cardBg }]}>
          <View style={styles.toggleRow}>
            <Text style={[styles.sectionTitle, { color: presetValues.text, fontSize: fontSizes.title }]}>
              ✨ Animations
            </Text>
            <Switch
              value={enableAnimations}
              onValueChange={toggleAnimations}
              trackColor={{ false: presetValues.bgSecondary, true: presetValues.text }}
              thumbColor={enableAnimations ? presetValues.text : presetValues.textSecondary}
            />
          </View>
          <Text style={[styles.subtext, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>
            {enableAnimations ? 'Smooth animations enabled' : 'Animations disabled for faster performance'}
          </Text>
        </View>

        {/* ── Tips ──────────────────────────────────────────────────── */}
        <View
          style={[
            styles.infoSection,
            {
              backgroundColor: presetValues.bgSecondary,
              borderColor: presetValues.borderColor,
            },
          ]}
        >
          <Text style={[styles.infoTitle, { color: presetValues.text, fontSize: fontSizes.base }]}>
            💡 Tips for Better Focus
          </Text>
          <Text style={[styles.infoText, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>
            • Use study sessions to track your productivity{'\n'}• Log your sleep and screen time in Wellness{'\n'}•
            Customize colors to reduce eye strain{'\n'}• Adjust text size for comfortable reading
          </Text>
        </View>
        {/* ── Danger Zone ───────────────────────────────────────────── */}
        <View style={[styles.dangerSection, { borderColor: '#EF4444' }]}>
          <Text style={[styles.dangerTitle, { color: '#EF4444', fontSize: fontSizes.base }]}>
            ⚠️ Danger Zone
          </Text>
          <Text style={[styles.dangerText, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>
            Reset the app to its initial state. All your study sessions, tasks, goals, and profile info will be permanently deleted.
          </Text>
          <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
            <Text style={[styles.resetBtnText, { fontSize: fontSizes.base }]}>🔄 Reset App & Restart Onboarding</Text>
          </TouchableOpacity>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 40, paddingBottom: 30, paddingHorizontal: 20 },
  headerTitle: { fontWeight: 'bold', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, fontWeight: '500' },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  section: { borderRadius: 14, padding: 16, marginTop: 16 },
  sectionTitle: { fontWeight: '600', marginBottom: 14 },

  // Profile fields
  fieldLabel: { fontWeight: '600', marginBottom: 6 },
  input: { borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipWide: {
    paddingHorizontal: 14,
  },
  chipText: { fontWeight: '600' },
  saveBtn: {
    marginTop: 18,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700' },

  // Theme / color
  presetGrid: { flexDirection: 'row', gap: 10 },
  presetBtn: { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center', justifyContent: 'center' },
  presetName: { fontWeight: '600' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  colorBtn: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  selected: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 },
  check: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  labelRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  colorLabel: { textAlign: 'center', fontWeight: '500' },

  // Font size
  fontSizeGrid: { flexDirection: 'row', gap: 10 },
  fontSizeBtn: { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  fontSizeText: { fontWeight: '600' },

  // Animations
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subtext: { fontWeight: '500' },

  // Info
  infoSection: { borderRadius: 14, padding: 16, marginTop: 20, marginBottom: 20, borderWidth: 1 },
  infoTitle: { fontWeight: '600', marginBottom: 8 },
  infoText: { fontWeight: '500', lineHeight: 22 },

  // Danger zone
  dangerSection: { borderRadius: 14, padding: 16, marginTop: 8, marginBottom: 32, borderWidth: 1.5 },
  dangerTitle: { fontWeight: '700', marginBottom: 8 },
  dangerText: { fontWeight: '500', lineHeight: 20, marginBottom: 14 },
  resetBtn: {
    backgroundColor: '#EF4444',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  resetBtnText: { color: '#fff', fontWeight: '700' },
});