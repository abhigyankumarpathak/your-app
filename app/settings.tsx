import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, DeviceEventEmitter, Image, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Avatar from '../components/Avatar';
import ColorWheel from '../components/ColorWheel';
import { accentGradient } from '../theme/design';
import { useAuth } from '../context/AuthContext';
import { useAppState } from '../context/AppStateContext';
import { AVATAR_OPTIONS, FONT_SIZES, THEME_COLORS, THEME_PRESETS, useTheme } from '../context/ThemeContext';
import { areNotificationsAvailable, cancelAllNotifications, cancelBedtimeReminder, cancelStreakReminder, cancelStudyReminder, hasNotificationPermission, requestNotificationPermission, scheduleBedtimeReminder, scheduleStreakReminder, scheduleStudyReminder } from '../services/notifications';
import { checkCalendarPermission, checkMediaLibraryPermission, isCalendarAvailable, openHealthSettings, pickAvatarImage, requestCalendarPermission, requestMediaLibraryPermission } from '../services/permissions';
import { isHealthAvailable, isHealthDataAvailable, requestHealthPermissions } from '../services/health';
import { isGoogleCalendarConfigured, isGoogleSignedIn, signInToGoogle, signOutGoogle } from '../services/googleCalendar';
import { getLastSyncedAt } from '../services/sync';
import { confirm, notify } from '../services/dialog';
import { toAvatarDataUrl } from '../services/avatar';

const IS_WEB = Platform.OS === 'web';
const NOTIFICATIONS_AVAILABLE = areNotificationsAvailable();
const CALENDAR_AVAILABLE = isCalendarAvailable();
const HEALTH_AVAILABLE = isHealthAvailable();
const GOOGLE_CALENDAR_AVAILABLE = isGoogleCalendarConfigured();

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

type SectionKey =
  | 'account'
  | 'profile'
  | 'avatar'
  | 'theme'
  | 'accent'
  | 'text'
  | 'animations'
  | 'notifications'
  | 'tips'
  | 'danger';

export default function Settings() {
  const router = useRouter();
  const { user, signOut, syncNow, pullNow } = useAuth();
  const { triggerReset } = useAppState();
  const {
    colorName, setTheme, accentColor, customColor, setCustomColor,
    preset, setPreset,
    fontSize, setFontSize, enableAnimations, toggleAnimations,
    presetValues, fontSizes,
    avatar, setAvatar, avatarBg, setAvatarBg,
    avatarImage, setAvatarImage,
  } = useTheme();

  const [activeSection, setActiveSection] = useState<SectionKey | null>(null);

  const [syncing, setSyncing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    getLastSyncedAt().then(setLastSyncedAt);
  }, [user?.id]);

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const result = await syncNow();
      if (!result.ok) {
        notify('Sync failed', result.error ?? 'Unknown error');
      } else {
        const ts = await getLastSyncedAt();
        setLastSyncedAt(ts);
      }
    } finally {
      setSyncing(false);
    }
  };

  const handlePullNow = async () => {
    const ok = await confirm(
      'Pull from cloud?',
      'This replaces the data on this device with whatever is in the cloud. Anything here that hasn\'t been pushed will be overwritten.',
      { confirmText: 'Pull', destructive: true }
    );
    if (!ok) return;
    setPulling(true);
    try {
      const result = await pullNow();
      if (!result.ok) {
        notify('Pull failed', result.error ?? 'Unknown error');
      } else if (!result.hasData) {
        notify('Nothing to pull', 'The cloud doesn\'t have any saved data for this account yet.');
      } else {
        const ts = await getLastSyncedAt();
        setLastSyncedAt(ts);
      }
    } finally {
      setPulling(false);
    }
  };

  const handleSignOut = async () => {
    const ok = await confirm(
      'Sign out?',
      'Your latest progress will be saved to the cloud before signing out. The data on this device will stay so you can keep using the app.',
      { confirmText: 'Sign Out', destructive: true }
    );
    if (ok) await signOut();
  };

  const formatSyncTime = (iso: string | null) => {
    if (!iso) return 'Not synced yet';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'Not synced yet';
    return `Last synced ${d.toLocaleString()}`;
  };

  const [showColorWheel, setShowColorWheel] = useState(false);
  const [pendingHex, setPendingHex] = useState(accentColor);
  const [mediaPermission, setMediaPermission] = useState(false);

  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [profileSaved, setProfileSaved] = useState(false);

  const [calendarPermission, setCalendarPermission] = useState(false);
  const [healthPermission, setHealthPermission] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

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
    // HealthKit hides read-access status from apps, so we can only remember
    // whether the user has gone through the grant flow at least once.
    AsyncStorage.getItem('focusHealthPermission').then((v) => setHealthPermission(v === 'true'));
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkCalendarPermission().then(setCalendarPermission);
        checkMediaLibraryPermission().then(setMediaPermission);
        hasNotificationPermission().then(granted => {
          setNotifPermission(granted);
          if (granted) AsyncStorage.setItem('focusNotifPermission', 'true');
        });
      }
    });
    const pullSub = DeviceEventEmitter.addListener('CLOUD_PULLED', () => {
      loadProfile();
      getLastSyncedAt().then(setLastSyncedAt);
    });
    return () => {
      appSub.remove();
      pullSub.remove();
    };
  }, []);

  const loadNotifSettings = async () => {
    checkCalendarPermission().then(setCalendarPermission);
    if (GOOGLE_CALENDAR_AVAILABLE) isGoogleSignedIn().then(setGoogleConnected);
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

  const handleToggleGoogle = async () => {
    setGoogleBusy(true);
    try {
      if (googleConnected) {
        const ok = await confirm('Disconnect Google Calendar', 'Your events will stop showing on the Schedule screen.', {
          confirmText: 'Disconnect',
          destructive: true,
        });
        if (!ok) return;
        await signOutGoogle();
        setGoogleConnected(false);
        return;
      }
      const ok = await signInToGoogle();
      setGoogleConnected(ok);
      if (!ok) notify('Not connected', 'Google sign-in was cancelled or failed. Please try again.');
    } finally {
      setGoogleBusy(false);
    }
  };

  const handleRequestHealthPermission = async () => {
    if (!isHealthDataAvailable()) {
      notify('Health not available', 'Open the Health app on this device first, then try again.');
      return;
    }
    // If the user already granted once, tapping again opens iOS Health settings
    // so they can review or change what Focus can read (Apple gives no in-app
    // re-prompt once a choice has been made).
    if (healthPermission) {
      openHealthSettings();
      return;
    }
    await requestHealthPermissions();
    setHealthPermission(true);
    await AsyncStorage.setItem('focusHealthPermission', 'true');
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
      notify('Error', 'Could not save profile.');
    }
  };

  const toggleSubject = (s: string) => {
    setProfile((p) => ({
      ...p,
      subjects: p.subjects.includes(s) ? p.subjects.filter((x) => x !== s) : [...p.subjects, s],
    }));
  };

  const handleReset = async () => {
    const ok = await confirm(
      'Reset App',
      'This will clear all your data and take you back to the beginning. This cannot be undone.',
      { confirmText: 'Reset Everything', destructive: true }
    );
    if (!ok) return;
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
      triggerReset();
      DeviceEventEmitter.emit('RESET_APP');
    } catch (_) {
      notify('Error', 'Could not reset the app. Please try again.');
    }
  };

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handlePickPhoto = async () => {
    const uri = await pickAvatarImage();
    if (!uri) return;
    setMediaPermission(true);

    setUploadingAvatar(true);
    try {
      // Convert to a self-contained data URL so the photo survives sync and
      // renders on every platform (no platform-specific file path).
      const dataUrl = await toAvatarDataUrl(uri);
      await setAvatarImage(dataUrl ?? uri);
      if (user) syncNow().catch(() => undefined);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const toggleFocusArea = (f: string) => {
    setProfile((p) => ({
      ...p,
      focusAreas: p.focusAreas.includes(f) ? p.focusAreas.filter((x) => x !== f) : [...p.focusAreas, f],
    }));
  };

  // ─────────────────────────────────────────────────────────────
  // Menu structure (iOS-style grouped rows)
  // ─────────────────────────────────────────────────────────────
  const SECTION_TITLES: Record<SectionKey, string> = {
    account: 'Account & Sync',
    profile: 'Profile',
    avatar: 'Avatar',
    theme: 'Theme Style',
    accent: 'Accent Color',
    text: 'Text Size',
    animations: 'Animations',
    notifications: 'Notifications & Permissions',
    tips: 'Tips for Better Focus',
    danger: 'Reset App',
  };

  const fontSizeSubtitle = fontSize.charAt(0).toUpperCase() + fontSize.slice(1);

  const groups: { title: string; rows: {
    key: SectionKey; icon: string; title: string; subtitle?: string; destructive?: boolean;
  }[] }[] = [
    {
      title: 'Account',
      rows: [
        { key: 'account', icon: '☁️', title: 'Account & Sync', subtitle: user?.email ?? 'Not signed in' },
        { key: 'profile', icon: '👤', title: 'Profile', subtitle: profile.name ? `${profile.name}${profile.grade ? ` · ${profile.grade}` : ''}` : 'Add your details' },
      ],
    },
    {
      title: 'Personalization',
      rows: [
        { key: 'avatar', icon: '🪄', title: 'Avatar', subtitle: avatarImage ? 'Photo' : `Emoji ${avatar}` },
        { key: 'theme', icon: '📱', title: 'Theme Style', subtitle: preset },
        { key: 'accent', icon: '🎨', title: 'Accent Color', subtitle: customColor ? customColor : colorName },
        { key: 'text', icon: '📝', title: 'Text Size', subtitle: fontSizeSubtitle },
        { key: 'animations', icon: '✨', title: 'Animations', subtitle: enableAnimations ? 'On' : 'Off' },
      ],
    },
    {
      title: 'Reminders',
      rows: [
        {
          key: 'notifications',
          icon: '🔔',
          title: 'Notifications & Permissions',
          subtitle: IS_WEB
            ? 'Limited on web'
            : (notifPermission ? 'Allowed' : 'Tap to set up'),
        },
      ],
    },
    {
      title: 'About',
      rows: [
        { key: 'tips', icon: '💡', title: 'Tips for Better Focus' },
      ],
    },
    {
      title: 'Reset',
      rows: [
        { key: 'danger', icon: '⚠️', title: 'Reset App', subtitle: 'Erase all data', destructive: true },
      ],
    },
  ];

  // ─────────────────────────────────────────────────────────────
  // Section content renderers
  // ─────────────────────────────────────────────────────────────
  const renderAccount = () => (
    <View style={[styles.section, { backgroundColor: presetValues.cardBg }]}>
      {user ? (
        <>
          <Text style={[styles.fieldLabel, { color: presetValues.text, fontSize: fontSizes.base }]}>
            Signed in as
          </Text>
          <Text style={[{ color: presetValues.textSecondary, fontSize: fontSizes.base, marginBottom: 4 }]}>
            {user.email}
          </Text>
          <Text style={[{ color: presetValues.textSecondary, fontSize: fontSizes.base - 2, marginBottom: 14 }]}>
            {formatSyncTime(lastSyncedAt)}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: accentColor, flex: 1, opacity: syncing || pulling ? 0.7 : 1, marginTop: 0 }]}
              onPress={handleSyncNow}
              disabled={syncing || pulling}
            >
              {syncing
                ? <ActivityIndicator color="#fff" />
                : <Text style={[styles.saveBtnText, { fontSize: fontSizes.base }]}>☁️ Push</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, {
                backgroundColor: 'transparent',
                borderWidth: 1.5,
                borderColor: accentColor,
                flex: 1,
                marginTop: 0,
                opacity: syncing || pulling ? 0.7 : 1,
              }]}
              onPress={handlePullNow}
              disabled={syncing || pulling}
            >
              {pulling
                ? <ActivityIndicator color={accentColor} />
                : <Text style={[styles.saveBtnText, { color: accentColor, fontSize: fontSizes.base }]}>⬇️ Pull</Text>}
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.saveBtn, {
              backgroundColor: 'transparent',
              borderWidth: 1.5,
              borderColor: presetValues.borderColor,
              marginTop: 10,
            }]}
            onPress={handleSignOut}
          >
            <Text style={[styles.saveBtnText, { color: presetValues.text, fontSize: fontSizes.base }]}>
              Sign Out
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={[{ color: presetValues.textSecondary, fontSize: fontSizes.base - 1, marginBottom: 14, lineHeight: 20 }]}>
            Sign in to save your progress and pick up where you left off on any device.
          </Text>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: accentColor, marginTop: 0 }]}
            onPress={() => router.push('/login')}
          >
            <Text style={[styles.saveBtnText, { fontSize: fontSizes.base }]}>
              🔐 Sign In / Create Account
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderProfile = () => (
    <View style={[styles.section, { backgroundColor: presetValues.cardBg }]}>
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

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: profileSaved ? '#10B981' : accentColor }]}
        onPress={saveProfile}
      >
        <Text style={[styles.saveBtnText, { fontSize: fontSizes.base }]}>
          {profileSaved ? '✅ Saved!' : '💾 Save Profile'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const photoIsLoadable = !!avatarImage && (
    Platform.OS !== 'web' || /^(https?:|data:|blob:)/i.test(avatarImage)
  );

  const renderAvatar = () => (
    <View style={[styles.section, { backgroundColor: presetValues.cardBg }]}>
      <Text style={[styles.sectionSub, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>
        Pick your character. Tap a color to change the background.
      </Text>

      {IS_WEB && avatarImage && !photoIsLoadable && (
        <View style={[styles.webNotice, { backgroundColor: presetValues.bgSecondary, borderColor: presetValues.borderColor }]}>
          <Text style={[{ color: presetValues.textSecondary, fontSize: fontSizes.base - 1, lineHeight: 20 }]}>
            Your photo was set on a phone and isn't viewable in the browser. Re-pick it on your phone while signed in to sync it everywhere.
          </Text>
        </View>
      )}

      <View style={styles.avatarPreviewRow}>
        <View style={[styles.avatarPreviewWrap, { borderColor: accentColor }]}>
          {photoIsLoadable ? (
            <Image source={{ uri: avatarImage! }} style={styles.avatarPreviewImg} />
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
          {!photoIsLoadable && (
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

      <View style={styles.photoBtnRow}>
        <TouchableOpacity
          onPress={handlePickPhoto}
          disabled={uploadingAvatar}
          style={[styles.photoBtn, {
            backgroundColor: avatarImage ? accentColor : accentColor + '18',
            borderColor: accentColor,
            opacity: uploadingAvatar ? 0.7 : 1,
          }]}
        >
          {uploadingAvatar ? (
            <>
              <ActivityIndicator size="small" color={avatarImage ? '#fff' : accentColor} />
              <Text style={[styles.photoBtnText, { color: avatarImage ? '#fff' : accentColor, fontSize: fontSizes.base }]}>
                Uploading…
              </Text>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 18 }}>📷</Text>
              <Text style={[styles.photoBtnText, { color: avatarImage ? '#fff' : accentColor, fontSize: fontSizes.base }]}>
                {avatarImage ? 'Change Photo' : 'Use Camera Roll Photo'}
              </Text>
            </>
          )}
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

      {!photoIsLoadable && (
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
  );

  const renderTheme = () => (
    <View style={[styles.section, { backgroundColor: presetValues.cardBg }]}>
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
  );

  const renderAccent = () => (
    <View style={[styles.section, { backgroundColor: presetValues.cardBg }]}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionSub, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1, marginBottom: 0 }]}>
          Pick a preset or open the color wheel for a custom hue.
        </Text>
        <View style={[styles.currentColorChip, { backgroundColor: accentColor }]} />
      </View>

      <View style={[styles.colorGrid, { marginTop: 12 }]}>
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
  );

  const renderText = () => (
    <View style={[styles.section, { backgroundColor: presetValues.cardBg }]}>
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
  );

  const renderAnimations = () => (
    <View style={[styles.section, { backgroundColor: presetValues.cardBg }]}>
      <View style={styles.toggleRow}>
        <Text style={[styles.fieldLabel, { color: presetValues.text, fontSize: fontSizes.base, marginBottom: 0 }]}>
          Enable animations
        </Text>
        <Switch
          value={enableAnimations}
          onValueChange={toggleAnimations}
          trackColor={{ false: presetValues.bgSecondary, true: '#10B981' }}
          thumbColor="#fff"
        />
      </View>
      <Text style={[styles.subtext, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1, marginTop: 8 }]}>
        {enableAnimations ? 'Smooth animations enabled' : 'Animations disabled for faster performance'}
      </Text>
    </View>
  );

  const renderNotifications = () => (
    <View style={[styles.section, { backgroundColor: presetValues.cardBg }]}>
      {IS_WEB && (
        <View style={[styles.webNotice, { backgroundColor: presetValues.bgSecondary, borderColor: presetValues.borderColor }]}>
          <Text style={[{ color: presetValues.textSecondary, fontSize: fontSizes.base - 1, lineHeight: 20 }]}>
            {GOOGLE_CALENDAR_AVAILABLE
              ? 'Device calendar access and scheduled reminders are only available in the iOS and Android apps. Connect Google Calendar below to see your events here. Photo uploads work in your browser.'
              : 'Device calendar access and scheduled reminders are only available in the iOS and Android apps. Photo uploads work in your browser.'}
          </Text>
        </View>
      )}

      {/* Calendar */}
      <View style={styles.notifRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.fieldLabel, { color: presetValues.text, fontSize: fontSizes.base }]}>📅 Calendar Access</Text>
          <Text style={[styles.notifSub, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>Used to display your schedule</Text>
        </View>
        {CALENDAR_AVAILABLE ? (
          <TouchableOpacity
            style={[styles.permStatusBtn, { backgroundColor: calendarPermission ? '#10B98120' : '#6366F120', borderColor: calendarPermission ? '#10B981' : '#6366F1' }]}
            onPress={async () => { const g = await requestCalendarPermission(); setCalendarPermission(g); }}
          >
            <Text style={[{ fontWeight: '700', fontSize: fontSizes.base - 1, color: calendarPermission ? '#10B981' : '#6366F1' }]}>
              {calendarPermission ? '✓ Granted' : 'Allow'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.permStatusBtn, styles.unavailableBadge, { borderColor: presetValues.borderColor }]}>
            <Text style={[{ fontWeight: '700', fontSize: fontSizes.base - 1, color: presetValues.textSecondary }]}>
              Not on web
            </Text>
          </View>
        )}
      </View>

      {/* Google Calendar — works on web, where the device calendar can't. */}
      {GOOGLE_CALENDAR_AVAILABLE && (
        <>
          <View style={[styles.divider, { backgroundColor: presetValues.borderColor, marginVertical: 14 }]} />
          <View style={styles.notifRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: presetValues.text, fontSize: fontSizes.base }]}>🗓️ Google Calendar</Text>
              <Text style={[styles.notifSub, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>
                {IS_WEB ? 'Show your events on the web' : 'A second calendar source'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.permStatusBtn, { backgroundColor: googleConnected ? '#10B98120' : '#6366F120', borderColor: googleConnected ? '#10B981' : '#6366F1' }]}
              onPress={handleToggleGoogle}
              disabled={googleBusy}
            >
              {googleBusy ? (
                <ActivityIndicator size="small" color="#6366F1" />
              ) : (
                <Text style={[{ fontWeight: '700', fontSize: fontSizes.base - 1, color: googleConnected ? '#10B981' : '#6366F1' }]}>
                  {googleConnected ? '✓ Connected' : 'Connect'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      <View style={[styles.divider, { backgroundColor: presetValues.borderColor, marginVertical: 14 }]} />

      {/* Apple Health */}
      <View style={styles.notifRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.fieldLabel, { color: presetValues.text, fontSize: fontSizes.base }]}>🍎 Apple Health</Text>
          <Text style={[styles.notifSub, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>Steps, sleep & workouts</Text>
        </View>
        {HEALTH_AVAILABLE ? (
          <TouchableOpacity
            style={[styles.permStatusBtn, { backgroundColor: healthPermission ? '#10B98120' : '#EF444420', borderColor: healthPermission ? '#10B981' : '#EF4444' }]}
            onPress={handleRequestHealthPermission}
          >
            <Text style={[{ fontWeight: '700', fontSize: fontSizes.base - 1, color: healthPermission ? '#10B981' : '#EF4444' }]}>
              {healthPermission ? '✓ Enabled' : 'Allow'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.permStatusBtn, styles.unavailableBadge, { borderColor: presetValues.borderColor }]}>
            <Text style={[{ fontWeight: '700', fontSize: fontSizes.base - 1, color: presetValues.textSecondary }]}>
              iOS only
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.divider, { backgroundColor: presetValues.borderColor, marginVertical: 14 }]} />

      {/* Photo library */}
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
            {mediaPermission ? '✓ Granted' : (IS_WEB ? 'Ready' : 'Allow')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.divider, { backgroundColor: presetValues.borderColor, marginVertical: 14 }]} />

      {/* Notifications */}
      <View style={styles.notifRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.fieldLabel, { color: presetValues.text, fontSize: fontSizes.base }]}>🔔 Notification Access</Text>
          <Text style={[styles.notifSub, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>Study reminders & streak alerts</Text>
        </View>
        {NOTIFICATIONS_AVAILABLE ? (
          <TouchableOpacity
            style={[styles.permStatusBtn, { backgroundColor: notifPermission ? '#10B98120' : '#6366F120', borderColor: notifPermission ? '#10B981' : '#6366F1' }]}
            onPress={handleRequestNotifPermission}
          >
            <Text style={[{ fontWeight: '700', fontSize: fontSizes.base - 1, color: notifPermission ? '#10B981' : '#6366F1' }]}>
              {notifPermission ? '✓ Granted' : 'Allow'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.permStatusBtn, styles.unavailableBadge, { borderColor: presetValues.borderColor }]}>
            <Text style={[{ fontWeight: '700', fontSize: fontSizes.base - 1, color: presetValues.textSecondary }]}>
              Not on web
            </Text>
          </View>
        )}
      </View>

      {NOTIFICATIONS_AVAILABLE && notifPermission && (
        <>
          <View style={[styles.divider, { backgroundColor: presetValues.borderColor, marginVertical: 14 }]} />
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
  );

  const renderTips = () => (
    <View
      style={[
        styles.infoSection,
        {
          backgroundColor: presetValues.cardBg,
          borderColor: presetValues.borderColor,
        },
      ]}
    >
      <Text style={[styles.infoText, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>
        • Use study sessions to track your productivity{'\n'}• Log your sleep and screen time in Wellness{'\n'}•
        Customize colors to reduce eye strain{'\n'}• Adjust text size for comfortable reading
      </Text>
    </View>
  );

  const renderDanger = () => (
    <View style={[styles.dangerSection, { borderColor: '#EF4444', backgroundColor: presetValues.cardBg }]}>
      <Text style={[styles.dangerText, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>
        Reset the app to its initial state. All your study sessions, tasks, goals, and profile info will be permanently deleted.
      </Text>
      <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
        <Text style={[styles.resetBtnText, { fontSize: fontSizes.base }]}>🔄 Reset App & Restart Onboarding</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSection = (key: SectionKey) => {
    switch (key) {
      case 'account': return renderAccount();
      case 'profile': return renderProfile();
      case 'avatar': return renderAvatar();
      case 'theme': return renderTheme();
      case 'accent': return renderAccent();
      case 'text': return renderText();
      case 'animations': return renderAnimations();
      case 'notifications': return renderNotifications();
      case 'tips': return renderTips();
      case 'danger': return renderDanger();
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  if (activeSection) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: presetValues.bg }]}>
        <LinearGradient colors={accentGradient(accentColor)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.detailHeader}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setActiveSection(null)}
          >
            <Text style={styles.backBtnText}>‹ Settings</Text>
          </TouchableOpacity>
          <Text style={[styles.detailTitle, { fontSize: fontSizes.heading }]}>
            {SECTION_TITLES[activeSection]}
          </Text>
        </LinearGradient>
        <View style={styles.content}>
          {renderSection(activeSection)}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: presetValues.bg }]}>
      <LinearGradient colors={accentGradient(accentColor)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={styles.headerInner}>
          <Avatar size={64} borderColor="rgba(255,255,255,0.6)" borderWidth={3} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { fontSize: fontSizes.heading, color: '#fff' }]}>
              {profile.name ? `Hey, ${profile.name}!` : 'Settings'}
            </Text>
            <Text style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.9)' }]}>
              Make Focus truly yours
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {groups.map((group) => (
          <View key={group.title} style={styles.menuGroup}>
            <Text style={[styles.menuGroupTitle, { color: presetValues.textSecondary, fontSize: fontSizes.base - 3 }]}>
              {group.title.toUpperCase()}
            </Text>
            <View style={[styles.menuCard, { backgroundColor: presetValues.cardBg, borderColor: presetValues.borderColor }]}>
              {group.rows.map((row, idx) => (
                <View key={row.key}>
                  <TouchableOpacity
                    style={styles.menuRow}
                    onPress={() => setActiveSection(row.key)}
                    activeOpacity={0.6}
                  >
                    <View style={[styles.menuIconWrap, { backgroundColor: row.destructive ? '#EF444420' : accentColor + '20' }]}>
                      <Text style={styles.menuIcon}>{row.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[
                        styles.menuRowTitle,
                        { color: row.destructive ? '#EF4444' : presetValues.text, fontSize: fontSizes.base },
                      ]}>
                        {row.title}
                      </Text>
                      {row.subtitle ? (
                        <Text
                          numberOfLines={1}
                          style={[styles.menuRowSubtitle, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}
                        >
                          {row.subtitle}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[styles.menuChevron, { color: presetValues.textSecondary }]}>›</Text>
                  </TouchableOpacity>
                  {idx < group.rows.length - 1 && (
                    <View style={[styles.menuRowDivider, { backgroundColor: presetValues.borderColor }]} />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 40, paddingBottom: 30, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerInner: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerTitle: { fontWeight: '800', marginBottom: 2 },
  headerSubtitle: { fontSize: 14, fontWeight: '500' },

  // Detail-view header
  detailHeader: { paddingTop: 40, paddingBottom: 20, paddingHorizontal: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  backBtn: { paddingVertical: 4, marginBottom: 8 },
  backBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  detailTitle: { color: '#fff', fontWeight: '800' },

  // Menu list (iOS-style)
  menuGroup: { marginTop: 18 },
  menuGroupTitle: { fontWeight: '700', letterSpacing: 1, marginLeft: 8, marginBottom: 8 },
  menuCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, gap: 12,
  },
  menuIconWrap: {
    width: 34, height: 34, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  menuIcon: { fontSize: 18 },
  menuRowTitle: { fontWeight: '600' },
  menuRowSubtitle: { fontWeight: '500', marginTop: 2 },
  menuChevron: { fontSize: 24, fontWeight: '400', marginLeft: 4 },
  menuRowDivider: { height: StyleSheet.hairlineWidth, marginLeft: 60 },

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
  unavailableBadge: { backgroundColor: 'transparent' },
  webNotice: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 14 },
  divider: { height: 1 },

  // Info
  infoSection: { borderRadius: 14, padding: 16, marginTop: 16, borderWidth: 1 },
  infoText: { fontWeight: '500', lineHeight: 22 },

  // Danger zone
  dangerSection: { borderRadius: 14, padding: 16, marginTop: 16, borderWidth: 1.5 },
  dangerText: { fontWeight: '500', lineHeight: 20, marginBottom: 14 },
  resetBtn: {
    backgroundColor: '#EF4444',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  resetBtnText: { color: '#fff', fontWeight: '700' },
});
