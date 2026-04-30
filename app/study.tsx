import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Easing,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { updateQuestProgress } from '../services/quests';
import { getLevel, loadXP, updateStudyStats } from '../services/streaks';

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDuration(s: number) {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}
function formatTime(s: number) {
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
function dateLabel(daysAgo: number) {
  const d = new Date(); d.setDate(d.getDate() - daysAgo); return d.toLocaleDateString();
}
function groupByDate(sessions: any[]) {
  const map: Record<string, any[]> = {};
  for (const s of sessions) { if (!map[s.date]) map[s.date] = []; map[s.date].push(s); }
  return Object.entries(map).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
}
function dateLabelDisplay(d: string) {
  if (d === new Date().toLocaleDateString()) return 'Today';
  if (d === dateLabel(1)) return 'Yesterday';
  return d;
}

// ── Pomodoro config ────────────────────────────────────────────────────────────
const POMO_WORK = 25 * 60;
const POMO_BREAK = 5 * 60;
const POMO_LONG_BREAK = 15 * 60;

export default function Study() {
  const { accentColor, presetValues, fontSizes, enableAnimations } = useTheme();

  // Timer
  const [subject, setSubject] = useState('');
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<any>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Pomodoro
  const [pomodoroEnabled, setPomodoroEnabled] = useState(false);
  const [pomodoroPhase, setPomodoroPhase] = useState<'work' | 'break' | 'longbreak'>('work');
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [pomodoroSeconds, setPomodoroSeconds] = useState(POMO_WORK);

  // Sessions
  const [sessions, setSessions] = useState<any[]>([]);
  const [totalToday, setTotalToday] = useState(0);

  // Save flow
  const [savingSession, setSavingSession] = useState(false);
  const [pendingNotes, setPendingNotes] = useState('');
  const [pendingSeconds, setPendingSeconds] = useState(0);

  // Manual log form
  const [showLogForm, setShowLogForm] = useState(false);
  const [logSubject, setLogSubject] = useState('');
  const [logHours, setLogHours] = useState('');
  const [logMinutes, setLogMinutes] = useState('');
  const [logDateChoice, setLogDateChoice] = useState(0);
  const [logCustomDate, setLogCustomDate] = useState('');
  const [logNotes, setLogNotes] = useState('');

  // Edit modal
  const [editSession, setEditSession] = useState<any>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editHours, setEditHours] = useState('');
  const [editMinutes, setEditMinutes] = useState('');
  const [editDateChoice, setEditDateChoice] = useState(0);
  const [editCustomDate, setEditCustomDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // XP toast
  const [xpToast, setXpToast] = useState('');
  const xpAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { loadSessions(); loadPomodoroPreference(); }, []);

  useEffect(() => {
    if (running && !paused) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
        if (pomodoroEnabled) setPomodoroSeconds((ps) => ps - 1);
      }, 1000);
      if (enableAnimations) {
        Animated.loop(Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.05, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])).start();
      }
    } else {
      clearInterval(intervalRef.current);
      scaleAnim.setValue(1);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, paused, enableAnimations, pomodoroEnabled]);

  // Pomodoro phase transitions
  useEffect(() => {
    if (!running || !pomodoroEnabled || pomodoroSeconds > 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (pomodoroPhase === 'work') {
      const nextCount = pomodoroCount + 1;
      setPomodoroCount(nextCount);
      if (nextCount % 4 === 0) {
        setPomodoroPhase('longbreak');
        setPomodoroSeconds(POMO_LONG_BREAK);
        Alert.alert('🎉 4 Pomodoros done!', 'Take a well-earned 15-minute break!');
      } else {
        setPomodoroPhase('break');
        setPomodoroSeconds(POMO_BREAK);
        Alert.alert('⏸ Break time!', 'Great work! Take a 5-minute break.');
      }
    } else {
      setPomodoroPhase('work');
      setPomodoroSeconds(POMO_WORK);
      Alert.alert('▶ Back to work!', `Starting Pomodoro ${pomodoroCount + 1}`);
    }
  }, [pomodoroSeconds, running, pomodoroEnabled]);

  const loadSessions = async () => {
    try {
      const data = await AsyncStorage.getItem('focusSessions');
      if (data) { const all = JSON.parse(data); setSessions(all); recalcToday(all); }
    } catch (e) { console.log('Error loading sessions:', e); }
  };

  const loadPomodoroPreference = async () => {
    const val = await AsyncStorage.getItem('focusPomodoroEnabled');
    if (val === 'true') setPomodoroEnabled(true);
  };

  const togglePomodoro = async (val: boolean) => {
    setPomodoroEnabled(val);
    await AsyncStorage.setItem('focusPomodoroEnabled', String(val));
    if (val) { setPomodoroPhase('work'); setPomodoroSeconds(POMO_WORK); setPomodoroCount(0); }
  };

  const recalcToday = (all: any[]) => {
    const today = new Date().toLocaleDateString();
    setTotalToday(all.filter((s) => s.date === today).reduce((sum, s) => sum + s.duration, 0));
  };

  const persist = async (updated: any[]) => {
    await AsyncStorage.setItem('focusSessions', JSON.stringify(updated));
    setSessions(updated);
    recalcToday(updated);
  };

  const showXpToast = (msg: string) => {
    setXpToast(msg);
    xpAnim.setValue(0);
    Animated.sequence([
      Animated.timing(xpAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(1400),
      Animated.timing(xpAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setXpToast(''));
  };

  const commitSession = async (secs: number, notes: string) => {
    if (secs < 5) return;
    const newSession = { id: Date.now(), subject: subject || 'General', duration: secs, date: new Date().toLocaleDateString(), notes: notes.trim() || undefined };
    const updated = [newSession, ...sessions];
    await persist(updated);

    const profile = await AsyncStorage.getItem('focusUserProfile');
    const goalHours = profile ? (parseFloat(JSON.parse(profile).studyGoalHours) || 0) : 0;
    const prevXP = await loadXP();
    const { xpGained, newAchievements } = await updateStudyStats(updated, goalHours);
    const { newlyCompleted, bonusXP } = await updateQuestProgress(updated, goalHours);
    const finalXP = prevXP + xpGained + bonusXP;
    const leveledUp = getLevel(finalXP) > getLevel(prevXP);

    const totalXP = xpGained + bonusXP;
    let msg = `+${totalXP} XP`;
    if (newAchievements.length > 0) msg += ` · 🏅 ${newAchievements.length} badge${newAchievements.length > 1 ? 's' : ''}!`;
    if (newlyCompleted.length > 0) msg += ` · ⚔️ ${newlyCompleted.length} quest${newlyCompleted.length > 1 ? 's' : ''}!`;
    if (leveledUp) msg = `🎉 Level Up! · ${msg}`;
    showXpToast(msg);
  };

  const handleStart = () => {
    if (!subject.trim()) { Alert.alert('What are you studying?', 'Please enter a subject to get started!'); return; }
    setRunning(true);
    setPaused(false);
    if (pomodoroEnabled) { setPomodoroPhase('work'); setPomodoroSeconds(POMO_WORK); setPomodoroCount(0); }
  };

  const handlePause = () => {
    setPaused(true);
  };

  const handleResume = () => {
    setPaused(false);
  };

  const handleStop = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setPaused(false);
    setPendingSeconds(seconds);
    setPendingNotes('');
    setSeconds(0);
    setSavingSession(true);
    if (pomodoroEnabled) { setPomodoroPhase('work'); setPomodoroSeconds(POMO_WORK); setPomodoroCount(0); }
  };

  const handleSaveConfirm = async () => {
    setSavingSession(false);
    await commitSession(pendingSeconds, pendingNotes);
    setSubject('');
  };

  const handleSaveDiscard = () => {
    setSavingSession(false);
    setSubject('');
  };

  const resolveDate = (choice: number, custom: string) => {
    if (choice < 4) return dateLabel(choice);
    const p = new Date(custom.trim());
    return isNaN(p.getTime()) ? new Date().toLocaleDateString() : p.toLocaleDateString();
  };

  const handleAddManual = async () => {
    const h = parseFloat(logHours) || 0, m = parseFloat(logMinutes) || 0;
    const totalSecs = Math.round(h * 3600 + m * 60);
    if (!logSubject.trim()) { Alert.alert('Missing subject', 'Please enter a subject.'); return; }
    if (totalSecs <= 0) { Alert.alert('Missing duration', 'Enter hours or minutes.'); return; }
    const newSession = { id: Date.now(), subject: logSubject.trim(), duration: totalSecs, date: resolveDate(logDateChoice, logCustomDate), notes: logNotes.trim() || undefined };
    const updated = [newSession, ...sessions];
    await persist(updated);
    const profile = await AsyncStorage.getItem('focusUserProfile');
    const goalHours = profile ? (parseFloat(JSON.parse(profile).studyGoalHours) || 0) : 0;
    const { xpGained } = await updateStudyStats(updated, goalHours);
    showXpToast(`+${xpGained} XP`);
    setShowLogForm(false);
    setLogSubject(''); setLogHours(''); setLogMinutes(''); setLogDateChoice(0); setLogCustomDate(''); setLogNotes('');
  };

  const openEdit = (session: any) => {
    setEditSession(session);
    setEditSubject(session.subject);
    setEditHours(Math.floor(session.duration / 3600) > 0 ? String(Math.floor(session.duration / 3600)) : '');
    setEditMinutes(Math.floor((session.duration % 3600) / 60) > 0 ? String(Math.floor((session.duration % 3600) / 60)) : '');
    setEditNotes(session.notes || '');
    for (let i = 0; i < 4; i++) { if (session.date === dateLabel(i)) { setEditDateChoice(i); setEditCustomDate(''); return; } }
    setEditDateChoice(4); setEditCustomDate(session.date);
  };

  const handleSaveEdit = () => {
    const h = parseFloat(editHours) || 0, m = parseFloat(editMinutes) || 0;
    const totalSecs = Math.round(h * 3600 + m * 60);
    if (!editSubject.trim()) { Alert.alert('Missing subject', 'Enter a subject.'); return; }
    if (totalSecs <= 0) { Alert.alert('Missing duration', 'Enter hours or minutes.'); return; }
    persist(sessions.map((s) => s.id === editSession.id ? { ...s, subject: editSubject.trim(), duration: totalSecs, date: resolveDate(editDateChoice, editCustomDate), notes: editNotes.trim() || undefined } : s));
    setEditSession(null);
  };

  const handleDelete = () => {
    Alert.alert('Delete session?', `Remove "${editSession.subject}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { persist(sessions.filter((s) => s.id !== editSession.id)); setEditSession(null); } },
    ]);
  };

  const todaySessions = sessions.filter((s) => s.date === new Date().toLocaleDateString());
  const grouped = groupByDate(sessions);
  const stats = {
    sessions: todaySessions.length,
    total: formatDuration(totalToday),
    avg: todaySessions.length > 0 ? formatDuration(Math.floor(totalToday / todaySessions.length)) : 'N/A',
  };

  const DATE_CHIPS = ['Today', 'Yesterday', '2 days ago', '3 days ago', 'Custom'];

  const renderDateChips = (choice: number, setChoice: (n: number) => void, custom: string, setCustom: (s: string) => void) => (
    <View>
      <View style={styles.chipsRow}>
        {DATE_CHIPS.map((label, i) => (
          <TouchableOpacity key={label} style={[styles.chip, { borderColor: accentColor, backgroundColor: choice === i ? accentColor : presetValues.bgSecondary }]} onPress={() => setChoice(i)}>
            <Text style={[styles.chipText, { color: choice === i ? '#fff' : presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {choice === 4 && (
        <TextInput style={[styles.input, { backgroundColor: presetValues.bgSecondary, color: presetValues.text, borderColor: accentColor, fontSize: fontSizes.base, marginTop: 8 }]}
          placeholder="MM/DD/YYYY" placeholderTextColor={presetValues.textSecondary} value={custom} onChangeText={setCustom} keyboardType="numbers-and-punctuation" />
      )}
    </View>
  );

  const renderDurationInputs = (hours: string, setHours: (s: string) => void, minutes: string, setMinutes: (s: string) => void) => (
    <View style={styles.durationRow}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.fieldLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>Hours</Text>
        <TextInput style={[styles.input, { backgroundColor: presetValues.bgSecondary, color: presetValues.text, borderColor: accentColor, fontSize: fontSizes.base }]}
          placeholder="0" placeholderTextColor={presetValues.textSecondary} value={hours} onChangeText={setHours} keyboardType="number-pad" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.fieldLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>Minutes</Text>
        <TextInput style={[styles.input, { backgroundColor: presetValues.bgSecondary, color: presetValues.text, borderColor: accentColor, fontSize: fontSizes.base }]}
          placeholder="0" placeholderTextColor={presetValues.textSecondary} value={minutes} onChangeText={setMinutes} keyboardType="number-pad" />
      </View>
    </View>
  );

  // Pomodoro display
  const pomoDisplay = () => {
    if (!pomodoroEnabled || !running) return null;
    const phaseLabel = pomodoroPhase === 'work' ? `Pomodoro ${pomodoroCount + 1}` : pomodoroPhase === 'break' ? '☕ Break' : '🛋 Long Break';
    const phaseTime = formatTime(pomodoroSeconds);
    return <Text style={[styles.pomoLabel, { color: 'rgba(255,255,255,0.9)', fontSize: fontSizes.base }]}>{phaseLabel} · {phaseTime}</Text>;
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: presetValues.bg }]} keyboardShouldPersistTaps="handled">
      <View style={[styles.header, { backgroundColor: accentColor }]}>
        <Text style={[styles.headerTitle, { fontSize: fontSizes.heading, color: '#fff' }]}>🎯 Focus Mode</Text>
        <Text style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.9)' }]}>Track your study sessions</Text>
      </View>

      <View style={styles.content}>
        {/* Pomodoro toggle */}
        {!running && (
          <TouchableOpacity
            style={[styles.pomoToggle, { backgroundColor: pomodoroEnabled ? accentColor : presetValues.cardBg, borderColor: accentColor }]}
            onPress={() => togglePomodoro(!pomodoroEnabled)}
          >
            <Text style={[styles.pomoToggleText, { color: pomodoroEnabled ? '#fff' : accentColor, fontSize: fontSizes.base - 1 }]}>
              🍅 Pomodoro Mode {pomodoroEnabled ? 'ON · 25m work / 5m break' : 'OFF'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Subject input */}
        <View style={[styles.section, { backgroundColor: presetValues.cardBg, borderColor: presetValues.borderColor }]}>
          <Text style={[styles.label, { color: presetValues.text, fontSize: fontSizes.title }]}>What are you studying?</Text>
          <TextInput
            style={[styles.input, { backgroundColor: presetValues.bgSecondary, color: presetValues.text, borderColor: accentColor, fontSize: fontSizes.base }]}
            placeholder="e.g. Math, History, Coding..." placeholderTextColor={presetValues.textSecondary}
            value={subject} onChangeText={setSubject} editable={!running}
          />
        </View>

        {/* Timer display */}
        <Animated.View style={[styles.timerSection, { backgroundColor: accentColor, transform: [{ scale: scaleAnim }] }]}>
          <Text style={[styles.timer, { fontSize: fontSizes.heading + 20 }]}>{formatTime(seconds)}</Text>
          {pomoDisplay()}
          <Text style={[styles.timerLabel, { fontSize: fontSizes.base }]}>
            {running && paused ? '⏸ Paused' : running ? '⏱️ Active Session' : '⏸️ Ready to start'}
          </Text>
        </Animated.View>

        {/* Control buttons */}
        <View style={styles.buttonContainer}>
          {!running ? (
            <>
              <TouchableOpacity style={[styles.button, { backgroundColor: accentColor }]} onPress={handleStart}>
                <Text style={[styles.buttonText, { fontSize: fontSizes.base + 1 }]}>▶️ Start Studying</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, { backgroundColor: presetValues.cardBg, borderWidth: 1.5, borderColor: accentColor }]} onPress={() => setShowLogForm((v) => !v)}>
                <Text style={[styles.buttonText, { fontSize: fontSizes.base + 1, color: accentColor }]}>{showLogForm ? '✕ Cancel' : '+ Log Past Session'}</Text>
              </TouchableOpacity>
            </>
          ) : paused ? (
            <View style={styles.runningBtns}>
              <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: accentColor }]} onPress={handleResume}>
                <Text style={[styles.buttonText, { fontSize: fontSizes.base + 1 }]}>▶ Resume</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: '#EF4444' }]} onPress={handleStop}>
                <Text style={[styles.buttonText, { fontSize: fontSizes.base + 1 }]}>⏹ Stop & Save</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.runningBtns}>
              <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: '#F59E0B' }]} onPress={handlePause}>
                <Text style={[styles.buttonText, { fontSize: fontSizes.base + 1 }]}>⏸ Pause</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: '#EF4444' }]} onPress={handleStop}>
                <Text style={[styles.buttonText, { fontSize: fontSizes.base + 1 }]}>⏹ Stop & Save</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Save notes prompt */}
        {savingSession && (
          <View style={[styles.section, { backgroundColor: presetValues.cardBg, borderColor: accentColor, borderWidth: 1.5 }]}>
            <Text style={[styles.label, { color: presetValues.text, fontSize: fontSizes.title }]}>💾 Save Session</Text>
            <Text style={[styles.fieldLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>
              {subject || 'General'} · {formatDuration(pendingSeconds)}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: presetValues.bgSecondary, color: presetValues.text, borderColor: accentColor, fontSize: fontSizes.base, marginTop: 10 }]}
              placeholder="Add a note (optional)..." placeholderTextColor={presetValues.textSecondary}
              value={pendingNotes} onChangeText={setPendingNotes} multiline
            />
            <View style={styles.runningBtns}>
              <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: presetValues.bgSecondary, borderWidth: 1, borderColor: presetValues.borderColor }]} onPress={handleSaveDiscard}>
                <Text style={[styles.buttonText, { fontSize: fontSizes.base, color: presetValues.textSecondary }]}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, { flex: 2, backgroundColor: accentColor }]} onPress={handleSaveConfirm}>
                <Text style={[styles.buttonText, { fontSize: fontSizes.base }]}>💾 Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Log past session form */}
        {showLogForm && !running && (
          <View style={[styles.section, { backgroundColor: presetValues.cardBg, borderColor: accentColor, borderWidth: 1.5 }]}>
            <Text style={[styles.label, { color: presetValues.text, fontSize: fontSizes.title }]}>📝 Log Past Session</Text>
            <Text style={[styles.fieldLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>Subject</Text>
            <TextInput style={[styles.input, { backgroundColor: presetValues.bgSecondary, color: presetValues.text, borderColor: accentColor, fontSize: fontSizes.base }]}
              placeholder="e.g. Math, Science..." placeholderTextColor={presetValues.textSecondary} value={logSubject} onChangeText={setLogSubject} />
            <Text style={[styles.fieldLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2, marginTop: 10 }]}>Date</Text>
            {renderDateChips(logDateChoice, setLogDateChoice, logCustomDate, setLogCustomDate)}
            <Text style={[styles.fieldLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2, marginTop: 10 }]}>Duration</Text>
            {renderDurationInputs(logHours, setLogHours, logMinutes, setLogMinutes)}
            <Text style={[styles.fieldLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2, marginTop: 10 }]}>Notes (optional)</Text>
            <TextInput style={[styles.input, { backgroundColor: presetValues.bgSecondary, color: presetValues.text, borderColor: accentColor, fontSize: fontSizes.base }]}
              placeholder="What did you cover?" placeholderTextColor={presetValues.textSecondary} value={logNotes} onChangeText={setLogNotes} multiline />
            <TouchableOpacity style={[styles.button, { backgroundColor: accentColor, marginTop: 14 }]} onPress={handleAddManual}>
              <Text style={[styles.buttonText, { fontSize: fontSizes.base + 1 }]}>💾 Save Session</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsGrid}>
          {[{ label: 'Sessions Today', value: stats.sessions }, { label: 'Total Time', value: stats.total }, { label: 'Avg Session', value: stats.avg }].map((s) => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: presetValues.cardBg, borderColor: presetValues.borderColor }]}>
              <Text style={[styles.statValue, { color: accentColor, fontSize: fontSizes.heading }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Session history */}
        {grouped.length > 0 ? (
          <View style={{ marginTop: 24 }}>
            <Text style={[styles.label, { color: presetValues.text, fontSize: fontSizes.title }]}>📚 Sessions</Text>
            {grouped.map(([date, daySessions]) => (
              <View key={date} style={{ marginBottom: 12 }}>
                <Text style={[styles.dateHeader, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>{dateLabelDisplay(date)}</Text>
                {daySessions.map((session) => (
                  <View key={session.id} style={[styles.sessionCard, { backgroundColor: presetValues.bgSecondary, borderLeftColor: accentColor }]}>
                    <View style={styles.sessionInfo}>
                      <Text style={[styles.sessionSubject, { color: presetValues.text, fontSize: fontSizes.base + 1 }]}>{session.subject}</Text>
                      <Text style={[styles.sessionDuration, { color: presetValues.textSecondary, fontSize: fontSizes.base }]}>{formatDuration(session.duration)}</Text>
                      {session.notes ? <Text style={[styles.sessionNotes, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>📝 {session.notes}</Text> : null}
                    </View>
                    <TouchableOpacity style={[styles.editBtn, { backgroundColor: accentColor + '20' }]} onPress={() => openEdit(session)}>
                      <Text style={[styles.editBtnText, { color: accentColor, fontSize: fontSizes.base - 1 }]}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : !running && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎓</Text>
            <Text style={[styles.emptyText, { color: presetValues.textSecondary, fontSize: fontSizes.base }]}>
              Start a session or log a past one to see your progress!
            </Text>
          </View>
        )}
      </View>

      {/* XP toast */}
      {xpToast !== '' && (
        <Animated.View style={[styles.xpToast, { backgroundColor: accentColor, opacity: xpAnim, transform: [{ translateY: xpAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
          <Text style={styles.xpToastText}>{xpToast}</Text>
        </Animated.View>
      )}

      {/* Edit modal */}
      <Modal visible={!!editSession} transparent animationType="slide" onRequestClose={() => setEditSession(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: presetValues.cardBg }]}>
            <Text style={[styles.label, { color: presetValues.text, fontSize: fontSizes.title, marginBottom: 16 }]}>✏️ Edit Session</Text>
            <Text style={[styles.fieldLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>Subject</Text>
            <TextInput style={[styles.input, { backgroundColor: presetValues.bgSecondary, color: presetValues.text, borderColor: accentColor, fontSize: fontSizes.base }]}
              value={editSubject} onChangeText={setEditSubject} placeholder="Subject" placeholderTextColor={presetValues.textSecondary} />
            <Text style={[styles.fieldLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2, marginTop: 12 }]}>Date</Text>
            {editSession && renderDateChips(editDateChoice, setEditDateChoice, editCustomDate, setEditCustomDate)}
            <Text style={[styles.fieldLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2, marginTop: 12 }]}>Duration</Text>
            {renderDurationInputs(editHours, setEditHours, editMinutes, setEditMinutes)}
            <Text style={[styles.fieldLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2, marginTop: 12 }]}>Notes (optional)</Text>
            <TextInput style={[styles.input, { backgroundColor: presetValues.bgSecondary, color: presetValues.text, borderColor: accentColor, fontSize: fontSizes.base }]}
              value={editNotes} onChangeText={setEditNotes} placeholder="Notes..." placeholderTextColor={presetValues.textSecondary} multiline />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#EF4444' }]} onPress={handleDelete}>
                <Text style={[styles.buttonText, { fontSize: fontSizes.base }]}>🗑 Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: presetValues.bgSecondary, borderWidth: 1, borderColor: presetValues.borderColor }]} onPress={() => setEditSession(null)}>
                <Text style={[styles.buttonText, { fontSize: fontSizes.base, color: presetValues.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: accentColor }]} onPress={handleSaveEdit}>
                <Text style={[styles.buttonText, { fontSize: fontSizes.base }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 40, paddingBottom: 30, paddingHorizontal: 20 },
  headerTitle: { fontWeight: 'bold', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, fontWeight: '500' },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  section: { borderRadius: 14, padding: 16, marginTop: 20, borderWidth: 1 },
  label: { fontWeight: '600', marginBottom: 12 },
  fieldLabel: { fontWeight: '600', marginBottom: 4 },
  input: { borderRadius: 10, padding: 12, borderWidth: 1.5 },
  pomoToggle: { borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 8, marginTop: 16, alignSelf: 'flex-start' },
  pomoToggleText: { fontWeight: '700' },
  timerSection: { borderRadius: 20, padding: 40, marginTop: 24, alignItems: 'center', justifyContent: 'center' },
  timer: { fontWeight: '700', color: '#fff', fontFamily: 'monospace' },
  pomoLabel: { marginTop: 6, fontWeight: '600' },
  timerLabel: { color: 'rgba(255,255,255,0.9)', marginTop: 6, fontWeight: '500' },
  buttonContainer: { marginTop: 24, gap: 10 },
  runningBtns: { flexDirection: 'row', gap: 10 },
  button: { borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  buttonText: { color: '#fff', fontWeight: '700' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1.5 },
  chipText: { fontWeight: '600' },
  durationRow: { flexDirection: 'row', gap: 10 },
  statsGrid: { flexDirection: 'row', gap: 12, marginTop: 24 },
  statCard: { flex: 1, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1 },
  statValue: { fontWeight: '700', marginBottom: 4 },
  statLabel: { fontWeight: '500', textAlign: 'center' },
  dateHeader: { fontWeight: '700', marginBottom: 6, marginLeft: 2 },
  sessionCard: { borderRadius: 10, padding: 12, marginBottom: 8, borderLeftWidth: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sessionInfo: { flex: 1, gap: 3 },
  sessionSubject: { fontWeight: '600' },
  sessionDuration: { fontWeight: '500' },
  sessionNotes: { fontWeight: '500', fontStyle: 'italic' },
  editBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editBtnText: { fontWeight: '700' },
  emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontWeight: '500', textAlign: 'center' },
  xpToast: { position: 'absolute', bottom: 50, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  xpToastText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalBtn: { flex: 1, borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
});
