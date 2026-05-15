import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert, AppState, DeviceEventEmitter, Image, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Avatar from '../components/Avatar';
import ColorWheel from '../components/ColorWheel';
import { AVATAR_OPTIONS, FONT_SIZES, THEME_COLORS, THEME_PRESETS, useTheme } from '../context/ThemeContext';
import { cancelAllNotifications, cancelBedtimeReminder, cancelStreakReminder, cancelStudyReminder, hasNotificationPermission, requestNotificationPermission, scheduleBedtimeReminder, scheduleStreakReminder, scheduleStudyReminder } from '../services/notifications';
import { checkCalendarPermission, checkMediaLibraryPermission, pickAvatarImage, requestCalendarPermission, requestMediaLibraryPermission } from '../services/permissions';

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
    colorName, setTheme, accentColor, customColor, setCustomColor,
    preset, setPreset,
    fontSize, setFontSize, enableAnimations, toggleAnimations,
    presetValues, fontSizes,
    avatar, setAvatar, avatarBg, setAvatarBg,
    avatarImage, setAvatarImage,
  } = useTheme();

  const [showColorWheel, setShowColorWheel] = useState(false);
  const [pendingHex, setPendingHex] = useState(accentColor);
  const [mediaPermission, setMediaPermission] = useState(false);

  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [profileSaved, setProfileSaved] = useState(false);

  // Permission settings
  const [calendarPermission, setCalendarPermission] = useState(false);

  // Notification settings
  const [notifPermission, setNotifPermission] = useState(false);
  const [studyReminderOn, setStudyReminderOn] = useState(false);
  const [studyReminderTime, setStudyReminderTime] = useState('16:00');
  const [bedtimeReminderOn, setBedtimeReminderOn] = useState(false);
  const [bedtimeReminderTime, setBedtimeReminderTime] = useState('22:00');
  const [streakReminderOn, setStreakReminderOn] = useState(false);

  useEffect(() => {
    loadProfile();
    loadNotifSettings();
    checkMediaLibraryPermission().then(setMediaPermission);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkCalendarPermission().then(setCalendarPermission);
        checkMediaLibraryPermission().then(setMediaPermission);
        hasNotificationPermission().then(granted => {
          setNotifPermission(granted);
          if (granted) AsyncStorage.setItem('focusNotifPermission', 'true');
        });
      }
    });
    return () => sub.remove();
  }, []);

  const loadNotifSettings = async () => {
    checkCalendarPermission().then(setCalendarPermission);
    // Always read actual system permission — AsyncStorage can be stale
    hasNotificationPermission().then(granted => {
      setNotifPermission(granted);
      if (granted) AsyncStorage.setItem('focusNotifPermission', 'true');
    });
    try {
      const [sOn, sTime, bOn, bTime, strOn] = await AsyncStorage.multiGet([
        'focusStudyReminderOn', 'focusStudyReminderTime',
        'focusBedtimeReminderOn', 'focusBedtimeReminderTime', 'focusStreakReminderOn',
      ]);
      setStudyReminderOn(sOn[1] === 'true');
      if (sTime[1]) setStudyReminderTime(sTime[1]);
      setBedtimeReminderOn(bOn[1] === 'true');
      if (bTime[1]) setBedtimeReminderTime(bTime[1]);
      setStreakReminderOn(strOn[1] === 'true');
    } catch {}
  };

  const handleRequestNotifPermission = async () => {
    const granted = await requestNotificationPermission();
    setNotifPermission(granted);
    await AsyncStorage.setItem('focusNotifPermission', String(granted));
  };

  const parseTime = (t: string): [number, number] => {
    const [h, m] = t.split(':').map(Number);
    return [isNaN(h) ? 8 : h, isNaN(m) ? 0 : m];
  };

  const toggleStudyReminder = async (val: boolean) => {
    setStudyReminderOn(val);
    await AsyncStorage.setItem('focusStudyReminderOn', String(val));
    if (val) { const [h, m] = parseTime(studyReminderTime); await scheduleStudyReminder(h, m); }
    else await cancelStudyReminder();
  };

  const toggleBedtimeReminder = async (val: boolean) => {
    setBedtimeReminderOn(val);
    await AsyncStorage.setItem('focusBedtimeReminderOn', String(val));
    if (val) { const [h, m] = parseTime(bedtimeReminderTime); await scheduleBedtimeReminder(h, m); }
    else await cancelBedtimeReminder();
  };

  const toggleStreakReminder = async (val: boolean) => {
    setStreakReminderOn(val);
    await AsyncStorage.setItem('focusStreakReminderOn', String(val));
    if (val) await scheduleStreakReminder();
    else await cancelStreakReminder();
  };

  const applyStudyTime = async () => {
    await AsyncStorage.setItem('focusStudyReminderTime', studyReminderTime);
    if (studyReminderOn) { const [h, m] = parseTime(studyReminderTime); await scheduleStudyReminder(h, m); }
  };

  const applyBedtimeTime = async () => {
    await AsyncStorage.setItem('focusBedtimeReminderTime', bedtimeReminderTime);
    if (bedtimeReminderOn) { const [h, m] = parseTime(bedtimeReminderTime); await scheduleBedtimeReminder(h, m); }
  };

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
              await cancelAllNotifications();
              await AsyncStorage.multiRemove([
                'focusOnboardingComplete', 'focusUserProfile', 'focusSessions',
                'focusTasks', 'focusActivities', 'focusWellness', 'focusGoals',
                'focusThemeColor', 'focusCustomColor', 'focusThemePreset',
                'focusFontSize', 'focusEnableAnimations',
                'focusAvatar', 'focusAvatarBg', 'focusAvatarImage',
                'focusStreak', 'focusXP', 'focusAchievements', 'focusPomodoroEnabled',
                'focusDailyTreasure', 'focusDailyQuests',
                'focusNotifPermission', 'focusStudyReminderOn', 'focusStudyReminderTime',
                'focusBedtimeReminderOn', 'focusBedtimeReminderTime', 'focusStreakReminderOn',
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

  const handlePickPhoto = async () => {
    const uri = await pickAvatarImage();
    if (uri) {
      await setAvatarImage(uri);
      setMediaPermission(true);
    }
  };

  const toggleFocusArea = (f: string) => {
    setProfile((p) => ({
      ...p,
      focusAreas: p.focusAreas.includes(f) ? p.focusAreas.filter((x) => x !== f) : [...p.focusAreas, f],
    }));
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: presetValues.bg }]}>
      <View style={[styles.header, { backgroundColor: accentColor }]}>
        <View style={styles.headerInner}>
          <Avatar size={64} borderColor="rgba(255,255,255,0.6)" borderWidth={3} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { fontSize: fontSizes.heading, color: '#fff' }]}>
              {profile.name ? `Hey, ${profile.name}!` : 'Customize'}
            </Text>
            <Text style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.9)' }]}>
              Make Focus truly yours
            </Text>
          </View>
        </View>
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
                  profile.grade === g && { backgroundColor: accentColor, borderColor: accentColor },
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
                  profile.subjects.includes(s) && { backgroundColor: accentColor, borderColor: accentColor },
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
                  profile.focusAreas.includes(f.label) && { backgroundColor: accentColor, borderColor: accentColor },
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
                  profile.studyGoalHours === h && { backgroundColor: accentColor, borderColor: accentColor },
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
            style={[styles.saveBtn, { backgroundColor: profileSaved ? '#10B981' : accentColor }]}
            onPress={saveProfile}
          >
            <Text style={[styles.saveBtnText, { fontSize: fontSizes.base }]}>
              {profileSaved ? '✅ Saved!' : '💾 Save Profile'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Avatar ────────────────────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: presetValues.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: presetValues.text, fontSize: fontSizes.title }]}>
            🪄 Your Avatar
          </Text>
          <Text style={[styles.sectionSub, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>
            Pick your character. Tap a color to change the background.
          </Text>

          <View style={styles.avatarPreviewRow}>
            <View style={[styles.avatarPreviewWrap, { borderColor: accentColor }]}>
              {avatarImage ? (
                <Image source={{ uri: avatarImage }} style={styles.avatarPreviewImg} />
              ) : (
                <View style={[styles.avatarPreviewEmoji, { backgroundColor: avatarBg }]}>
                  <Text style={{ fontSize: 56 }}>{avatar}</Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <Text style={[{ color: presetValues.text, fontSize: fontSizes.title, fontWeight: '800' }]}>
                {profile.name || 'You'}
              </Text>
              <Text style={[{ color: presetValues.textSecondary, fontSize: fontSizes.base - 1, marginTop: 4 }]}>
                {profile.grade ? `${profile.grade} grade` : 'Make it yours'}
              </Text>
              {!avatarImage && (
                <View style={styles.avatarBgRow}>
                  {Object.values(THEME_COLORS).slice(0, 8).map((hex) => (
                    <TouchableOpacity
                      key={hex}
                      onPress={() => setAvatarBg(hex)}
                      style={[
                        styles.avatarBgDot,
                        { backgroundColor: hex, borderWidth: avatarBg === hex ? 3 : 0, borderColor: '#fff' },
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Photo / emoji toggle row */}
          <View style={styles.photoBtnRow}>
            <TouchableOpacity
              onPress={handlePickPhoto}
              style={[styles.photoBtn, {
                backgroundColor: avatarImage ? accentColor : accentColor + '18',
                borderColor: accentColor,
              }]}
            >
              <Text style={{ fontSize: 18 }}>📷</Text>
              <Text style={[styles.photoBtnText, { color: avatarImage ? '#fff' : accentColor, fontSize: fontSizes.base }]}>
                {avatarImage ? 'Change Photo' : 'Use Camera Roll Photo'}
              </Text>
            </TouchableOpacity>
            {avatarImage && (
              <TouchableOpacity
                onPress={() => setAvatarImage(null)}
                style={[styles.photoClearBtn, { borderColor: presetValues.borderColor }]}
              >
                <Text style={[{ color: presetValues.textSecondary, fontSize: fontSizes.base - 1, fontWeight: '700' }]}>
                  ✕ Remove
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {!mediaPermission && !avatarImage && (
            <Text style={[styles.permHint, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>
              You'll be asked to allow photo library access.
            </Text>
          )}

          {/* Emoji grid (only shown when not using a photo) */}
          {!avatarImage && (
            <>
              <Text style={[styles.orDivider, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>
                OR PICK AN EMOJI
              </Text>
              <View style={styles.avatarGrid}>
                {AVATAR_OPTIONS.map((emoji) => {
                  const selected = avatar === emoji;
                  return (
                    <TouchableOpacity
                      key={emoji}
                      onPress={() => setAvatar(emoji)}
                      style={[
                        styles.avatarBtn,
                        {
                          backgroundColor: selected ? accentColor + '22' : presetValues.bgSecondary,
                          borderColor: selected ? accentColor : presetValues.borderColor,
                          borderWidth: selected ? 2 : 1,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 26 }}>{emoji}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
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
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={[styles.presetName, { color: (themeData as any).text, fontSize: fontSizes.base }]}
                >
                  {key}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Accent Color ──────────────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: presetValues.cardBg }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: presetValues.text, fontSize: fontSizes.title, marginBottom: 0 }]}>
              🎨 Accent Color
            </Text>
            <View style={[styles.currentColorChip, { backgroundColor: accentColor }]} />
          </View>
          <Text style={[styles.sectionSub, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>
            Pick a preset or open the color wheel for a custom hue.
          </Text>

          <View style={styles.colorGrid}>
            {Object.entries(THEME_COLORS).map(([name, hex]) => (
              <TouchableOpacity
                key={name}
                style={[
                  styles.colorBtn,
                  { backgroundColor: hex },
                  !customColor && colorName === name && styles.selected,
                ]}
                onPress={() => setTheme(name)}
              >
                {!customColor && colorName === name && <Text style={styles.check}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.wheelToggle, {
              backgroundColor: showColorWheel ? accentColor : presetValues.bgSecondary,
              borderColor: accentColor,
            }]}
            onPress={() => {
              setPendingHex(accentColor);
              setShowColorWheel((v) => !v);
            }}
          >
            <Text style={[styles.wheelToggleText, {
              color: showColorWheel ? '#fff' : accentColor,
              fontSize: fontSizes.base,
            }]}>
              {showColorWheel ? '✕ Close color wheel' : '🎯 Open custom color wheel'}
            </Text>
          </TouchableOpacity>

          {showColorWheel && (
            <View style={styles.wheelWrap}>
              <ColorWheel size={240} value={pendingHex} onChange={setPendingHex} />
              <TouchableOpacity
                style={[styles.applyBtn, { backgroundColor: pendingHex }]}
                onPress={() => {
                  setCustomColor(pendingHex);
                  setShowColorWheel(false);
                }}
              >
                <Text style={styles.applyBtnText}>✓ Apply this color</Text>
              </TouchableOpacity>
            </View>
          )}

          {customColor && (
            <View style={[styles.customRow, { borderColor: accentColor }]}>
              <View style={[styles.customSwatch, { backgroundColor: customColor }]} />
              <Text style={[{ color: presetValues.text, fontSize: fontSizes.base, fontWeight: '700', flex: 1 }]}>
                Custom: {customColor}
              </Text>
              <TouchableOpacity
                style={[styles.clearCustomBtn, { borderColor: presetValues.borderColor }]}
                onPress={() => setCustomColor(null)}
              >
                <Text style={[{ color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>Clear</Text>
              </TouchableOpacity>
            </View>
          )}
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
              trackColor={{ false: presetValues.bgSecondary, true: '#10B981' }}
              thumbColor="#fff"
            />
          </View>
          <Text style={[styles.subtext, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>
            {enableAnimations ? 'Smooth animations enabled' : 'Animations disabled for faster performance'}
          </Text>
        </View>

        {/* ── Notifications ─────────────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: presetValues.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: presetValues.text, fontSize: fontSizes.title }]}>
            🔔 Notifications
          </Text>

          {/* Calendar row — always shown */}
          <View style={styles.notifRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: presetValues.text, fontSize: fontSizes.base }]}>📅 Calendar Access</Text>
              <Text style={[styles.notifSub, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>Used to display your schedule</Text>
            </View>
            <TouchableOpacity
              style={[styles.permStatusBtn, { backgroundColor: calendarPermission ? '#10B98120' : '#6366F120', borderColor: calendarPermission ? '#10B981' : '#6366F1' }]}
              onPress={async () => { const g = await requestCalendarPermission(); setCalendarPermission(g); }}
            >
              <Text style={[{ fontWeight: '700', fontSize: fontSizes.base - 1, color: calendarPermission ? '#10B981' : '#6366F1' }]}>
                {calendarPermission ? '✓ Granted' : 'Allow'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, { backgroundColor: presetValues.borderColor, marginVertical: 14 }]} />

          {/* Photo library permission row */}
          <View style={styles.notifRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: presetValues.text, fontSize: fontSizes.base }]}>📷 Photo Library</Text>
              <Text style={[styles.notifSub, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>For custom profile pictures</Text>
            </View>
            <TouchableOpacity
              style={[styles.permStatusBtn, { backgroundColor: mediaPermission ? '#10B98120' : accentColor + '20', borderColor: mediaPermission ? '#10B981' : accentColor }]}
              onPress={async () => { const g = await requestMediaLibraryPermission(); setMediaPermission(g); }}
            >
              <Text style={[{ fontWeight: '700', fontSize: fontSizes.base - 1, color: mediaPermission ? '#10B981' : accentColor }]}>
                {mediaPermission ? '✓ Granted' : 'Allow'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, { backgroundColor: presetValues.borderColor, marginVertical: 14 }]} />

          {/* Notification permission row — same style as Calendar */}
          <View style={styles.notifRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: presetValues.text, fontSize: fontSizes.base }]}>🔔 Notification Access</Text>
              <Text style={[styles.notifSub, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>Study reminders & streak alerts</Text>
            </View>
            <TouchableOpacity
              style={[styles.permStatusBtn, { backgroundColor: notifPermission ? '#10B98120' : '#6366F120', borderColor: notifPermission ? '#10B981' : '#6366F1' }]}
              onPress={handleRequestNotifPermission}
            >
              <Text style={[{ fontWeight: '700', fontSize: fontSizes.base - 1, color: notifPermission ? '#10B981' : '#6366F1' }]}>
                {notifPermission ? '✓ Granted' : 'Allow'}
              </Text>
            </TouchableOpacity>
          </View>

          {notifPermission && (
            <>
              <View style={[styles.divider, { backgroundColor: presetValues.borderColor, marginVertical: 14 }]} />
              {/* Study reminder */}
              <View style={styles.notifRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: presetValues.text, fontSize: fontSizes.base }]}>📚 Study Reminder</Text>
                  <Text style={[styles.notifSub, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>Daily reminder to start studying</Text>
                </View>
                <Switch value={studyReminderOn} onValueChange={toggleStudyReminder}
                  trackColor={{ false: presetValues.bgSecondary, true: '#6366F1' }} />
              </View>
              {studyReminderOn && (
                <View style={styles.timeRow}>
                  <TextInput style={[styles.timeInput, { backgroundColor: presetValues.bgSecondary, color: presetValues.text, borderColor: '#6366F1', fontSize: fontSizes.base }]}
                    value={studyReminderTime} onChangeText={setStudyReminderTime} placeholder="HH:MM"
                    placeholderTextColor={presetValues.textSecondary} keyboardType="numbers-and-punctuation" onBlur={applyStudyTime} />
                  <Text style={[{ color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>24h format</Text>
                </View>
              )}

              {/* Bedtime reminder */}
              <View style={[styles.notifRow, { marginTop: 12 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: presetValues.text, fontSize: fontSizes.base }]}>😴 Bedtime Reminder</Text>
                  <Text style={[styles.notifSub, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>Nudge to log sleep and wind down</Text>
                </View>
                <Switch value={bedtimeReminderOn} onValueChange={toggleBedtimeReminder}
                  trackColor={{ false: presetValues.bgSecondary, true: '#6366F1' }} />
              </View>
              {bedtimeReminderOn && (
                <View style={styles.timeRow}>
                  <TextInput style={[styles.timeInput, { backgroundColor: presetValues.bgSecondary, color: presetValues.text, borderColor: '#6366F1', fontSize: fontSizes.base }]}
                    value={bedtimeReminderTime} onChangeText={setBedtimeReminderTime} placeholder="HH:MM"
                    placeholderTextColor={presetValues.textSecondary} keyboardType="numbers-and-punctuation" onBlur={applyBedtimeTime} />
                  <Text style={[{ color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>24h format</Text>
                </View>
              )}

              {/* Streak reminder */}
              <View style={[styles.notifRow, { marginTop: 12 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: presetValues.text, fontSize: fontSizes.base }]}>🔥 Streak At Risk (8 PM)</Text>
                  <Text style={[styles.notifSub, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>Alert if you haven't studied yet today</Text>
                </View>
                <Switch value={streakReminderOn} onValueChange={toggleStreakReminder}
                  trackColor={{ false: presetValues.bgSecondary, true: '#6366F1' }} />
              </View>
            </>
          )}
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
  header: { paddingTop: 40, paddingBottom: 30, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerInner: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerAvatar: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  headerTitle: { fontWeight: '800', marginBottom: 2 },
  headerSubtitle: { fontSize: 14, fontWeight: '500' },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionSub: { fontWeight: '500', marginBottom: 12 },
  currentColorChip: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3, elevation: 2 },

  // Avatar
  avatarPreviewRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatarPreviewWrap: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 3,
    overflow: 'hidden',
  },
  avatarPreviewEmoji: {
    width: '100%', height: '100%',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarPreviewImg: { width: '100%', height: '100%' },
  avatarBgRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  avatarBgDot: { width: 22, height: 22, borderRadius: 11 },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start' },
  avatarBtn: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  photoBtnRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  photoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, borderWidth: 1.5, paddingVertical: 12, paddingHorizontal: 14,
  },
  photoBtnText: { fontWeight: '800' },
  photoClearBtn: {
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  permHint: { fontWeight: '500', marginTop: 6, marginBottom: 4 },
  orDivider: { textAlign: 'center', fontWeight: '700', letterSpacing: 1, marginVertical: 14 },

  // Color wheel
  wheelToggle: { borderRadius: 12, borderWidth: 1.5, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  wheelToggleText: { fontWeight: '700' },
  wheelWrap: { alignItems: 'center', marginTop: 18 },
  applyBtn: { marginTop: 14, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  applyBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  customRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 14, padding: 10, borderRadius: 12, borderWidth: 1.5,
  },
  customSwatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: '#fff' },
  clearCustomBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },

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
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetBtn: { width: '31%', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  presetName: { fontWeight: '700' },
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

  // Notifications / Permissions
  notifRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notifSub: { fontWeight: '500', marginTop: 1 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 4 },
  timeInput: { borderRadius: 8, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 8, width: 90 },
  permStatusBtn: { borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 6 },
  divider: { height: 1 },

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