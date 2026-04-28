import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Easing,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

// This is the complete Study screen

export default function Study() {
  const { accentColor, presetValues, fontSizes, enableAnimations } = useTheme();
  const [subject, setSubject] = useState('');
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [sessions, setSessions] = useState<any[]>([]);
  const [totalToday, setTotalToday] = useState(0);
  const intervalRef = useRef<any>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      if (enableAnimations) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 1.05,
              duration: 500,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 500,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
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
        const allSessions = JSON.parse(data);
        setSessions(allSessions);
        const today = new Date().toLocaleDateString();
        const todayTotal = allSessions
          .filter((s: any) => s.date === today)
          .reduce((sum: number, s: any) => sum + s.duration, 0);
        setTotalToday(todayTotal);
      }
    } catch (error) {
      console.log('Error loading sessions:', error);
    }
  };

  const saveSessions = async (newSessions: any[]) => {
    try {
      await AsyncStorage.setItem('focusSessions', JSON.stringify(newSessions));
      setSessions(newSessions);
      const today = new Date().toLocaleDateString();
      const todayTotal = newSessions
        .filter((s) => s.date === today)
        .reduce((sum, s) => sum + s.duration, 0);
      setTotalToday(todayTotal);
    } catch (error) {
      console.log('Error saving sessions:', error);
    }
  };

  const handleStartStop = () => {
    if (running) {
      const newSession = {
        id: Date.now(),
        subject: subject || 'General',
        duration: seconds,
        date: new Date().toLocaleDateString(),
      };
      saveSessions([newSession, ...sessions]);
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

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const formatDuration = (s: number) => {
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  };

  const todaySessions = sessions.filter((s) => s.date === new Date().toLocaleDateString());
  const stats = {
    sessions: todaySessions.length,
    total: formatDuration(totalToday),
    avg: todaySessions.length > 0 ? formatDuration(Math.floor(totalToday / todaySessions.length)) : 'N/A',
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: presetValues.bg }]}>
      <View style={[styles.header, { backgroundColor: accentColor }]}>
        <Text style={[styles.headerTitle, { fontSize: fontSizes.heading, color: '#fff' }]}>
          🎯 Focus Mode
        </Text>
        <Text style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.9)' }]}>
          Track your study sessions
        </Text>
      </View>

      <View style={styles.content}>
        {/* Input Section */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: presetValues.cardBg,
              borderColor: presetValues.borderColor,
            },
          ]}
        >
          <Text style={[styles.label, { color: presetValues.text, fontSize: fontSizes.title }]}>
            What are you studying?
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: presetValues.bgSecondary,
                color: presetValues.text,
                borderColor: accentColor,
                fontSize: fontSizes.base,
              },
            ]}
            placeholder="e.g. Math, History, Coding..."
            placeholderTextColor={presetValues.textSecondary}
            value={subject}
            onChangeText={setSubject}
            editable={!running}
          />
        </View>

        {/* Timer Display */}
        <Animated.View
          style={[
            styles.timerSection,
            {
              backgroundColor: accentColor,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={[styles.timer, { fontSize: fontSizes.heading + 20 }]}>
            {formatTime(seconds)}
          </Text>
          <Text style={[styles.timerLabel, { fontSize: fontSizes.base }]}>
            {running ? '⏱️ Active Session' : '⏸️ Ready to start'}
          </Text>
        </Animated.View>

        {/* Control Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: running ? '#EF4444' : accentColor,
                paddingVertical: 14,
              },
            ]}
            onPress={handleStartStop}
          >
            <Text style={[styles.buttonText, { fontSize: fontSizes.base + 1 }]}>
              {running ? '⏹️ Stop & Save' : '▶️ Start Studying'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats Section */}
        <View style={styles.statsGrid}>
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: presetValues.cardBg,
                borderColor: presetValues.borderColor,
              },
            ]}
          >
            <Text style={[styles.statValue, { color: accentColor, fontSize: fontSizes.heading }]}>
              {stats.sessions}
            </Text>
            <Text style={[styles.statLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base }]}>
              Sessions Today
            </Text>
          </View>
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: presetValues.cardBg,
                borderColor: presetValues.borderColor,
              },
            ]}
          >
            <Text style={[styles.statValue, { color: accentColor, fontSize: fontSizes.heading }]}>
              {stats.total}
            </Text>
            <Text style={[styles.statLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base }]}>
              Total Time
            </Text>
          </View>
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: presetValues.cardBg,
                borderColor: presetValues.borderColor,
              },
            ]}
          >
            <Text style={[styles.statValue, { color: accentColor, fontSize: fontSizes.heading }]}>
              {stats.avg}
            </Text>
            <Text style={[styles.statLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base }]}>
              Avg Session
            </Text>
          </View>
        </View>

        {/* Recent Sessions */}
        {todaySessions.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: presetValues.text, fontSize: fontSizes.title }]}>
              📚 Today's Sessions
            </Text>
            {todaySessions.map((session: any) => (
              <View
                key={session.id}
                style={[
                  styles.sessionCard,
                  {
                    backgroundColor: presetValues.bgSecondary,
                    borderLeftColor: accentColor,
                  },
                ]}
              >
                <View style={styles.sessionInfo}>
                  <Text
                    style={[
                      styles.sessionSubject,
                      { color: presetValues.text, fontSize: fontSizes.base + 1 },
                    ]}
                  >
                    {session.subject}
                  </Text>
                  <Text
                    style={[
                      styles.sessionDuration,
                      { color: presetValues.textSecondary, fontSize: fontSizes.base },
                    ]}
                  >
                    {formatDuration(session.duration)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {todaySessions.length === 0 && !running && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyIcon]}>🎓</Text>
            <Text
              style={[
                styles.emptyText,
                { color: presetValues.textSecondary, fontSize: fontSizes.base },
              ]}
            >
              Start a study session to see your progress!
            </Text>
          </View>
        )}
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
  section: { borderRadius: 14, padding: 16, marginTop: 20, borderWidth: 1 },
  label: { fontWeight: '600', marginBottom: 12 },
  input: { borderRadius: 10, padding: 14, borderWidth: 2 },
  timerSection: {
    borderRadius: 20,
    padding: 40,
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timer: { fontWeight: '700', color: '#fff', fontFamily: 'monospace' },
  timerLabel: { color: 'rgba(255,255,255,0.9)', marginTop: 10, fontWeight: '500' },
  buttonContainer: { marginTop: 24, gap: 10 },
  button: { borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  statsGrid: { flexDirection: 'row', gap: 12, marginTop: 24 },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  statValue: { fontWeight: '700', marginBottom: 4 },
  statLabel: { fontWeight: '500' },
  sessionCard: { borderRadius: 10, padding: 12, marginBottom: 10, borderLeftWidth: 4 },
  sessionInfo: { gap: 4 },
  sessionSubject: { fontWeight: '600' },
  sessionDuration: { fontWeight: '500' },
  emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontWeight: '500', textAlign: 'center' },
});

// File ends here - no more code below this point