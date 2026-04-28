import AsyncStorage from '@react-native-async-storage/async-storage';
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

function formatDuration(s: number) {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

function formatTime(s: number) {
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function dateLabel(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString();
}

function groupByDate(sessions: any[]) {
  const map: Record<string, any[]> = {};
  for (const s of sessions) {
    if (!map[s.date]) map[s.date] = [];
    map[s.date].push(s);
  }
  return Object.entries(map).sort((a, b) => {
    const da = new Date(a[0]).getTime();
    const db = new Date(b[0]).getTime();
    return db - da;
  });
}

function dateLabelDisplay(dateStr: string) {
  const today = new Date().toLocaleDateString();
  const yesterday = dateLabel(1);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  return dateStr;
}

export default function Study() {
  const { accentColor, presetValues, fontSizes, enableAnimations } = useTheme();

  // Timer state
  const [subject, setSubject] = useState('');
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<any>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Sessions
  const [sessions, setSessions] = useState<any[]>([]);
  const [totalToday, setTotalToday] = useState(0);

  // Log past session form
  const [showLogForm, setShowLogForm] = useState(false);
  const [logSubject, setLogSubject] = useState('');
  const [logHours, setLogHours] = useState('');
  const [logMinutes, setLogMinutes] = useState('');
  const [logDateChoice, setLogDateChoice] = useState(0); // 0=today,1=yesterday,2=2d,3=3d,4=custom
  const [logCustomDate, setLogCustomDate] = useState('');

  // Edit modal
  const [editSession, setEditSession] = useState<any>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editHours, setEditHours] = useState('');
  const [editMinutes, setEditMinutes] = useState('');
  const [editDateChoice, setEditDateChoice] = useState(0);
  const [editCustomDate, setEditCustomDate] = useState('');

  useEffect(() => { loadSessions(); }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      if (enableAnimations) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 1.05, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          ])
        ).start();
      }
    } else {
      clearInterval(intervalRef.current);
      scaleAnim.setValue(1);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, enableAnimations]);

  const loadSessions = async () => {
    try {
      const data = await AsyncStorage.getItem('focusSessions');
      if (data) {
        const all = JSON.parse(data);
        setSessions(all);
        recalcToday(all);
      }
    } catch (e) {
      console.log('Error loading sessions:', e);
    }
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

  // Timer start/stop
  const handleStartStop = () => {
    if (running) {
      const newSession = { id: Date.now(), subject: subject || 'General', duration: seconds, date: new Date().toLocaleDateString() };
      persist([newSession, ...sessions]);
      setSeconds(0);
      setRunning(false);
      setSubject('');
    } else {
      if (!subject.trim()) {
        Alert.alert('What are you studying?', 'Please enter a subject to get started!');
        return;
      }
      setRunning(true);
    }
  };

  // Resolve selected date for log/edit form
  const resolveDate = (choice: number, custom: string) => {
    if (choice < 4) return dateLabel(choice);
    const trimmed = custom.trim();
    if (!trimmed) return new Date().toLocaleDateString();
    const parsed = new Date(trimmed);
    return isNaN(parsed.getTime()) ? new Date().toLocaleDateString() : parsed.toLocaleDateString();
  };

  // Add manual past session
  const handleAddManual = () => {
    const h = parseFloat(logHours) || 0;
    const m = parseFloat(logMinutes) || 0;
    const totalSecs = Math.round(h * 3600 + m * 60);
    if (!logSubject.trim()) { Alert.alert('Missing subject', 'Please enter a subject.'); return; }
    if (totalSecs <= 0) { Alert.alert('Missing duration', 'Enter at least some hours or minutes.'); return; }
    const newSession = { id: Date.now(), subject: logSubject.trim(), duration: totalSecs, date: resolveDate(logDateChoice, logCustomDate) };
    persist([newSession, ...sessions]);
    setShowLogForm(false);
    setLogSubject('');
    setLogHours('');
    setLogMinutes('');
    setLogDateChoice(0);
    setLogCustomDate('');
  };

  // Open edit modal
  const openEdit = (session: any) => {
    setEditSession(session);
    setEditSubject(session.subject);
    const h = Math.floor(session.duration / 3600);
    const m = Math.floor((session.duration % 3600) / 60);
    setEditHours(h > 0 ? String(h) : '');
    setEditMinutes(m > 0 ? String(m) : '');
    // Try to match to a quick date chip
    const today = new Date().toLocaleDateString();
    for (let i = 0; i < 4; i++) {
      if (session.date === dateLabel(i)) { setEditDateChoice(i); setEditCustomDate(''); return; }
    }
    setEditDateChoice(4);
    setEditCustomDate(session.date);
  };

  // Save edits
  const handleSaveEdit = () => {
    const h = parseFloat(editHours) || 0;
    const m = parseFloat(editMinutes) || 0;
    const totalSecs = Math.round(h * 3600 + m * 60);
    if (!editSubject.trim()) { Alert.alert('Missing subject', 'Please enter a subject.'); return; }
    if (totalSecs <= 0) { Alert.alert('Missing duration', 'Enter at least some hours or minutes.'); return; }
    const updated = sessions.map((s) =>
      s.id === editSession.id ? { ...s, subject: editSubject.trim(), duration: totalSecs, date: resolveDate(editDateChoice, editCustomDate) } : s
    );
    persist(updated);
    setEditSession(null);
  };

  // Delete session
  const handleDelete = () => {
    Alert.alert('Delete session?', `Remove "${editSession.subject}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          persist(sessions.filter((s) => s.id !== editSession.id));
          setEditSession(null);
        },
      },
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
          <TouchableOpacity
            key={label}
            style={[styles.chip, { borderColor: accentColor, backgroundColor: choice === i ? accentColor : presetValues.bgSecondary }]}
            onPress={() => setChoice(i)}
          >
            <Text style={[styles.chipText, { color: choice === i ? '#fff' : presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {choice === 4 && (
        <TextInput
          style={[styles.input, { backgroundColor: presetValues.bgSecondary, color: presetValues.text, borderColor: accentColor, fontSize: fontSizes.base, marginTop: 8 }]}
          placeholder="MM/DD/YYYY"
          placeholderTextColor={presetValues.textSecondary}
          value={custom}
          onChangeText={setCustom}
          keyboardType="numbers-and-punctuation"
        />
      )}
    </View>
  );

  const renderDurationInputs = (hours: string, setHours: (s: string) => void, minutes: string, setMinutes: (s: string) => void) => (
    <View style={styles.durationRow}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.fieldLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>Hours</Text>
        <TextInput
          style={[styles.input, { backgroundColor: presetValues.bgSecondary, color: presetValues.text, borderColor: accentColor, fontSize: fontSizes.base }]}
          placeholder="0"
          placeholderTextColor={presetValues.textSecondary}
          value={hours}
          onChangeText={setHours}
          keyboardType="number-pad"
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.fieldLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>Minutes</Text>
        <TextInput
          style={[styles.input, { backgroundColor: presetValues.bgSecondary, color: presetValues.text, borderColor: accentColor, fontSize: fontSizes.base }]}
          placeholder="0"
          placeholderTextColor={presetValues.textSecondary}
          value={minutes}
          onChangeText={setMinutes}
          keyboardType="number-pad"
        />
      </View>
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: presetValues.bg }]} keyboardShouldPersistTaps="handled">
      <View style={[styles.header, { backgroundColor: accentColor }]}>
        <Text style={[styles.headerTitle, { fontSize: fontSizes.heading, color: '#fff' }]}>🎯 Focus Mode</Text>
        <Text style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.9)' }]}>Track your study sessions</Text>
      </View>

      <View style={styles.content}>
        {/* Subject input */}
        <View style={[styles.section, { backgroundColor: presetValues.cardBg, borderColor: presetValues.borderColor }]}>
          <Text style={[styles.label, { color: presetValues.text, fontSize: fontSizes.title }]}>What are you studying?</Text>
          <TextInput
            style={[styles.input, { backgroundColor: presetValues.bgSecondary, color: presetValues.text, borderColor: accentColor, fontSize: fontSizes.base }]}
            placeholder="e.g. Math, History, Coding..."
            placeholderTextColor={presetValues.textSecondary}
            value={subject}
            onChangeText={setSubject}
            editable={!running}
          />
        </View>

        {/* Timer */}
        <Animated.View style={[styles.timerSection, { backgroundColor: accentColor, transform: [{ scale: scaleAnim }] }]}>
          <Text style={[styles.timer, { fontSize: fontSizes.heading + 20 }]}>{formatTime(seconds)}</Text>
          <Text style={[styles.timerLabel, { fontSize: fontSizes.base }]}>{running ? '⏱️ Active Session' : '⏸️ Ready to start'}</Text>
        </Animated.View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: running ? '#EF4444' : accentColor }]}
            onPress={handleStartStop}
          >
            <Text style={[styles.buttonText, { fontSize: fontSizes.base + 1 }]}>
              {running ? '⏹️ Stop & Save' : '▶️ Start Studying'}
            </Text>
          </TouchableOpacity>

          {!running && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: presetValues.cardBg, borderWidth: 1.5, borderColor: accentColor }]}
              onPress={() => setShowLogForm((v) => !v)}
            >
              <Text style={[styles.buttonText, { fontSize: fontSizes.base + 1, color: accentColor }]}>
                {showLogForm ? '✕ Cancel' : '+ Log Past Session'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Log past session form */}
        {showLogForm && !running && (
          <View style={[styles.section, { backgroundColor: presetValues.cardBg, borderColor: accentColor, borderWidth: 1.5 }]}>
            <Text style={[styles.label, { color: presetValues.text, fontSize: fontSizes.title }]}>📝 Log Past Session</Text>

            <Text style={[styles.fieldLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>Subject</Text>
            <TextInput
              style={[styles.input, { backgroundColor: presetValues.bgSecondary, color: presetValues.text, borderColor: accentColor, fontSize: fontSizes.base }]}
              placeholder="e.g. Math, Science..."
              placeholderTextColor={presetValues.textSecondary}
              value={logSubject}
              onChangeText={setLogSubject}
            />

            <Text style={[styles.fieldLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2, marginTop: 10 }]}>Date</Text>
            {renderDateChips(logDateChoice, setLogDateChoice, logCustomDate, setLogCustomDate)}

            <Text style={[styles.fieldLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2, marginTop: 10 }]}>Duration</Text>
            {renderDurationInputs(logHours, setLogHours, logMinutes, setLogMinutes)}

            <TouchableOpacity style={[styles.button, { backgroundColor: accentColor, marginTop: 14 }]} onPress={handleAddManual}>
              <Text style={[styles.buttonText, { fontSize: fontSizes.base + 1 }]}>💾 Save Session</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsGrid}>
          {[
            { label: 'Sessions Today', value: stats.sessions },
            { label: 'Total Time', value: stats.total },
            { label: 'Avg Session', value: stats.avg },
          ].map((s) => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: presetValues.cardBg, borderColor: presetValues.borderColor }]}>
              <Text style={[styles.statValue, { color: accentColor, fontSize: fontSizes.heading }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* All sessions grouped by date */}
        {grouped.length > 0 ? (
          <View style={{ marginTop: 24 }}>
            <Text style={[styles.label, { color: presetValues.text, fontSize: fontSizes.title }]}>📚 Sessions</Text>
            {grouped.map(([date, daySessions]) => (
              <View key={date} style={{ marginBottom: 12 }}>
                <Text style={[styles.dateHeader, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>
                  {dateLabelDisplay(date)}
                </Text>
                {daySessions.map((session) => (
                  <View
                    key={session.id}
                    style={[styles.sessionCard, { backgroundColor: presetValues.bgSecondary, borderLeftColor: accentColor }]}
                  >
                    <View style={styles.sessionInfo}>
                      <Text style={[styles.sessionSubject, { color: presetValues.text, fontSize: fontSizes.base + 1 }]}>{session.subject}</Text>
                      <Text style={[styles.sessionDuration, { color: presetValues.textSecondary, fontSize: fontSizes.base }]}>{formatDuration(session.duration)}</Text>
                    </View>
                    <TouchableOpacity style={[styles.editBtn, { backgroundColor: accentColor + '20' }]} onPress={() => openEdit(session)}>
                      <Text style={[styles.editBtnText, { color: accentColor, fontSize: fontSizes.base - 1 }]}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : (
          !running && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🎓</Text>
              <Text style={[styles.emptyText, { color: presetValues.textSecondary, fontSize: fontSizes.base }]}>
                Start a session or log a past one to see your progress!
              </Text>
            </View>
          )
        )}
      </View>

      {/* Edit modal */}
      <Modal visible={!!editSession} transparent animationType="slide" onRequestClose={() => setEditSession(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: presetValues.cardBg }]}>
            <Text style={[styles.label, { color: presetValues.text, fontSize: fontSizes.title, marginBottom: 16 }]}>✏️ Edit Session</Text>

            <Text style={[styles.fieldLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>Subject</Text>
            <TextInput
              style={[styles.input, { backgroundColor: presetValues.bgSecondary, color: presetValues.text, borderColor: accentColor, fontSize: fontSizes.base }]}
              value={editSubject}
              onChangeText={setEditSubject}
              placeholder="Subject"
              placeholderTextColor={presetValues.textSecondary}
            />

            <Text style={[styles.fieldLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2, marginTop: 12 }]}>Date</Text>
            {editSession && renderDateChips(editDateChoice, setEditDateChoice, editCustomDate, setEditCustomDate)}

            <Text style={[styles.fieldLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2, marginTop: 12 }]}>Duration</Text>
            {renderDurationInputs(editHours, setEditHours, editMinutes, setEditMinutes)}

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
  timerSection: { borderRadius: 20, padding: 40, marginTop: 24, alignItems: 'center', justifyContent: 'center' },
  timer: { fontWeight: '700', color: '#fff', fontFamily: 'monospace' },
  timerLabel: { color: 'rgba(255,255,255,0.9)', marginTop: 10, fontWeight: '500' },
  buttonContainer: { marginTop: 24, gap: 10 },
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
  sessionInfo: { flex: 1, gap: 4 },
  sessionSubject: { fontWeight: '600' },
  sessionDuration: { fontWeight: '500' },
  editBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editBtnText: { fontWeight: '700' },
  emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontWeight: '500', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalBtn: { flex: 1, borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
});
