import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { accentGradient } from '../theme/design';
import { notify } from '../services/dialog';
import {
  getExerciseMinutesToday,
  getLastNightSleepHours,
  getStepsToday,
  getWorkoutsToday,
  isHealthAvailable,
  isHealthDataAvailable,
  requestHealthPermissions,
  type TodayWorkout,
} from '../services/health';

type TodayHealth = {
  steps: number | null;
  exerciseMinutes: number | null;
  sleepHours: number | null;
  workouts: TodayWorkout[];
};

export default function Wellness() {
  const { accentColor, presetValues, fontSizes } = useTheme();
  const [bedtime, setBedtime] = useState('');
  const [wakeTime, setWakeTime] = useState('');
  const [sleepDuration, setSleepDuration] = useState('');
  const [screenTime, setScreenTime] = useState('');
  const [mood, setMood] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({ avgSleep: 0, avgScreen: 0, logsCount: 0 });

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [logs]);

  const loadLogs = async () => {
    try {
      const data = await AsyncStorage.getItem('focusWellness');
      if (data) setLogs(JSON.parse(data));
    } catch (error) {
      console.log('Error loading logs:', error);
    }
  };

  const calculateStats = () => {
    if (logs.length === 0) {
      setStats({ avgSleep: 0, avgScreen: 0, logsCount: 0 });
      return;
    }

    const avgSleep =
      logs.reduce((sum, log) => sum + (parseFloat(log.sleepDuration) || 0), 0) / logs.length;
    const avgScreen =
      logs.reduce((sum, log) => sum + (parseFloat(log.screenTime) || 0), 0) / logs.length;

    setStats({
      avgSleep: Math.round(avgSleep * 10) / 10,
      avgScreen: Math.round(avgScreen * 10) / 10,
      logsCount: logs.length,
    });
  };

  const logToday = async () => {
    if (!bedtime || !wakeTime || !sleepDuration || !screenTime) {
      alert('Please fill in all fields');
      return;
    }

    const newLog = {
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      bedtime,
      wakeTime,
      sleepDuration: parseFloat(sleepDuration),
      screenTime: parseFloat(screenTime),
      mood: mood || 'Normal',
      ...(todayHealth?.steps != null && { steps: todayHealth.steps }),
      ...(todayHealth?.exerciseMinutes != null && { exerciseMinutes: todayHealth.exerciseMinutes }),
      ...(todayHealth?.workouts.length ? { workoutsCount: todayHealth.workouts.length } : {}),
    };

    const updated = [newLog, ...logs];
    try {
      await AsyncStorage.setItem('focusWellness', JSON.stringify(updated));
      setLogs(updated);
      setBedtime('');
      setWakeTime('');
      setSleepDuration('');
      setScreenTime('');
      setMood('');
    } catch (error) {
      console.log('Error saving log:', error);
    }
  };

  const [syncingHealth, setSyncingHealth] = useState(false);
  const [todayHealth, setTodayHealth] = useState<TodayHealth | null>(null);

  const handleSyncFromHealth = async () => {
    if (!isHealthAvailable()) {
      notify('Not available', 'Apple Health sync only works on iOS.');
      return;
    }
    if (!isHealthDataAvailable()) {
      notify('Health not enabled', 'Open the Health app on this device first, then try again.');
      return;
    }
    setSyncingHealth(true);
    try {
      await requestHealthPermissions();
      const [sleepHours, steps, exerciseMinutes, workouts] = await Promise.all([
        getLastNightSleepHours(),
        getStepsToday(),
        getExerciseMinutesToday(),
        getWorkoutsToday(),
      ]);
      setTodayHealth({
        steps,
        exerciseMinutes,
        sleepHours,
        workouts: workouts ?? [],
      });
      if (sleepHours != null) setSleepDuration(String(sleepHours));
    } finally {
      setSyncingHealth(false);
    }
  };

  const formatSteps = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
  const formatDistance = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`);

  const moods = ['😴', '😑', '😐', '🙂', '😄'];
  const getMoodLabel = (emoji: string) => {
    const map: any = { '😴': 'Tired', '😑': 'Okay', '😐': 'Normal', '🙂': 'Good', '😄': 'Great' };
    return map[emoji] || '';
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: presetValues.bg }]}>
      <LinearGradient colors={accentGradient('#10B981')} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <Text style={[styles.headerTitle, { fontSize: fontSizes.heading, color: '#fff' }]}>
          ❤️ Wellness Tracker
        </Text>
        <Text style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.9)' }]}>
          Monitor sleep & screen time
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Quick Stats */}
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
              {stats.avgSleep}h
            </Text>
            <Text
              style={[styles.statLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base }]}
            >
              Avg Sleep
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
              {stats.avgScreen}h
            </Text>
            <Text
              style={[styles.statLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base }]}
            >
              Avg Screen
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
              {stats.logsCount}
            </Text>
            <Text
              style={[styles.statLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base }]}
            >
              Total Logs
            </Text>
          </View>
        </View>

        {/* Today from Apple Health */}
        {isHealthAvailable() && todayHealth && (
          <View
            style={[
              styles.form,
              { backgroundColor: presetValues.cardBg, borderColor: presetValues.borderColor },
            ]}
          >
            <Text style={[styles.formTitle, { color: presetValues.text, fontSize: fontSizes.title }]}>
              ❤️ Today from Apple Health
            </Text>
            <View style={styles.healthTodayRow}>
              <View style={styles.healthTodayCell}>
                <Text style={[styles.healthTodayValue, { color: accentColor, fontSize: fontSizes.heading }]}>
                  {todayHealth.steps != null ? formatSteps(todayHealth.steps) : '—'}
                </Text>
                <Text style={[styles.healthTodayLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>
                  👟 Steps
                </Text>
              </View>
              <View style={styles.healthTodayCell}>
                <Text style={[styles.healthTodayValue, { color: accentColor, fontSize: fontSizes.heading }]}>
                  {todayHealth.exerciseMinutes != null ? `${todayHealth.exerciseMinutes}` : '—'}
                </Text>
                <Text style={[styles.healthTodayLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>
                  🏃 Exercise min
                </Text>
              </View>
              <View style={styles.healthTodayCell}>
                <Text style={[styles.healthTodayValue, { color: accentColor, fontSize: fontSizes.heading }]}>
                  {todayHealth.sleepHours != null ? `${todayHealth.sleepHours}h` : '—'}
                </Text>
                <Text style={[styles.healthTodayLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>
                  🛏️ Sleep
                </Text>
              </View>
            </View>
            {todayHealth.workouts.length > 0 && (
              <View style={styles.workoutsList}>
                <Text style={[styles.workoutsTitle, { color: presetValues.text, fontSize: fontSizes.base }]}>
                  🏋️ Workouts today ({todayHealth.workouts.length})
                </Text>
                {todayHealth.workouts.map((w) => {
                  const bits = [`${w.durationMinutes} min`];
                  if (w.distanceMeters != null) bits.push(formatDistance(w.distanceMeters));
                  if (w.energyKcal != null) bits.push(`${w.energyKcal} kcal`);
                  return (
                    <View
                      key={w.id}
                      style={[
                        styles.workoutRow,
                        { backgroundColor: presetValues.bgSecondary, borderColor: presetValues.borderColor },
                      ]}
                    >
                      <Text style={[styles.workoutName, { color: presetValues.text, fontSize: fontSizes.base }]}>
                        {w.activityName}
                      </Text>
                      <Text style={[styles.workoutMeta, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>
                        {bits.join(' · ')}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Form Section */}
        <View
          style={[
            styles.form,
            {
              backgroundColor: presetValues.cardBg,
              borderColor: presetValues.borderColor,
            },
          ]}
        >
          <Text style={[styles.formTitle, { color: presetValues.text, fontSize: fontSizes.title }]}>
            📋 Log Today
          </Text>

          {isHealthAvailable() && (
            <TouchableOpacity
              onPress={handleSyncFromHealth}
              disabled={syncingHealth}
              style={[styles.healthSyncBtn, {
                backgroundColor: accentColor + '18',
                borderColor: accentColor,
                opacity: syncingHealth ? 0.7 : 1,
              }]}
            >
              {syncingHealth ? (
                <ActivityIndicator size="small" color={accentColor} />
              ) : (
                <Text style={{ fontSize: 18 }}>❤️</Text>
              )}
              <Text style={[styles.healthSyncBtnText, { color: accentColor, fontSize: fontSizes.base }]}>
                {syncingHealth ? 'Reading from Apple Health…' : 'Sync from Apple Health'}
              </Text>
            </TouchableOpacity>
          )}

          <Text style={[styles.label, { color: presetValues.text, fontSize: fontSizes.base }]}>
            😴 Bedtime last night
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
            placeholder="e.g. 10:30 PM"
            placeholderTextColor={presetValues.textSecondary}
            value={bedtime}
            onChangeText={setBedtime}
          />

          <Text style={[styles.label, { color: presetValues.text, fontSize: fontSizes.base }]}>
            ☀️ Wake time
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
            placeholder="e.g. 6:30 AM"
            placeholderTextColor={presetValues.textSecondary}
            value={wakeTime}
            onChangeText={setWakeTime}
          />

          <Text style={[styles.label, { color: presetValues.text, fontSize: fontSizes.base }]}>
            🛏️ Sleep duration (hours)
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
            placeholder="e.g. 7.5"
            placeholderTextColor={presetValues.textSecondary}
            value={sleepDuration}
            onChangeText={setSleepDuration}
            keyboardType="decimal-pad"
          />

          <Text style={[styles.label, { color: presetValues.text, fontSize: fontSizes.base }]}>
            📵 Screen time today (hours)
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
            placeholder="e.g. 3.5"
            placeholderTextColor={presetValues.textSecondary}
            value={screenTime}
            onChangeText={setScreenTime}
            keyboardType="decimal-pad"
          />

          <Text style={[styles.label, { color: presetValues.text, fontSize: fontSizes.base }]}>
            How are you feeling?
          </Text>
          <View style={styles.moodSelector}>
            {moods.map((m) => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.moodBtn,
                  {
                    backgroundColor: mood === m ? accentColor : presetValues.bgSecondary,
                    borderColor: accentColor,
                  },
                ]}
                onPress={() => setMood(m)}
              >
                <Text style={[styles.moodEmoji, { fontSize: fontSizes.base + 8 }]}>{m}</Text>
                {mood === m && (
                  <Text
                    style={[
                      styles.moodLabel,
                      { color: '#fff', fontSize: fontSizes.base - 2 },
                    ]}
                  >
                    {getMoodLabel(m)}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: accentColor }]}
            onPress={logToday}
          >
            <Text style={[styles.buttonText, { fontSize: fontSizes.base + 1 }]}>
              💾 Save Log
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recent Logs */}
        {logs.length > 0 && (
          <View style={styles.logsSection}>
            <Text style={[styles.logsTitle, { color: presetValues.text, fontSize: fontSizes.title }]}>
              📚 Recent Logs
            </Text>
            {logs.slice(0, 10).map((log) => (
              <View
                key={log.id}
                style={[
                  styles.logCard,
                  {
                    backgroundColor: presetValues.bgSecondary,
                    borderColor: presetValues.borderColor,
                  },
                ]}
              >
                <View style={styles.logHeader}>
                  <Text
                    style={[
                      styles.logDate,
                      { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 },
                    ]}
                  >
                    {log.date}
                  </Text>
                  <Text style={[styles.logMood, { fontSize: fontSizes.base + 2 }]}>
                    {log.mood}
                  </Text>
                </View>
                <View style={styles.logRow}>
                  <Text
                    style={[
                      styles.logItem,
                      { color: presetValues.text, fontSize: fontSizes.base },
                    ]}
                  >
                    🛏️ {log.sleepDuration}h | 📵 {log.screenTime}h
                  </Text>
                </View>
                {(log.steps != null || log.exerciseMinutes != null || log.workoutsCount) && (
                  <View style={styles.logRow}>
                    <Text
                      style={[
                        styles.logItem,
                        { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 },
                      ]}
                    >
                      {[
                        log.steps != null && `👟 ${formatSteps(log.steps)}`,
                        log.exerciseMinutes != null && `🏃 ${log.exerciseMinutes}m`,
                        log.workoutsCount && `🏋️ ${log.workoutsCount}`,
                      ].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                )}
              </View>
            ))}
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
  statsGrid: { flexDirection: 'row', gap: 12, marginTop: 20 },
  statCard: { flex: 1, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1 },
  statValue: { fontWeight: '700', marginBottom: 4 },
  statLabel: { fontWeight: '500' },
  form: { borderRadius: 14, padding: 16, marginTop: 20, borderWidth: 1 },
  formTitle: { fontWeight: '600', marginBottom: 16 },
  healthSyncBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 12, borderWidth: 1.5,
    marginBottom: 18,
  },
  healthSyncBtnText: { fontWeight: '700' },
  healthTodayRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  healthTodayCell: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  healthTodayValue: { fontWeight: '700', marginBottom: 2 },
  healthTodayLabel: { fontWeight: '500' },
  workoutsList: { marginTop: 12 },
  workoutsTitle: { fontWeight: '600', marginBottom: 8 },
  workoutRow: { borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1 },
  workoutName: { fontWeight: '600', marginBottom: 2 },
  workoutMeta: { fontWeight: '500' },
  label: { fontWeight: '500', marginBottom: 6 },
  input: { borderRadius: 8, padding: 12, marginBottom: 14, borderWidth: 1 },
  moodSelector: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14 },
  moodBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  moodEmoji: { fontWeight: '700' },
  moodLabel: { fontWeight: '600' },
  button: { padding: 14, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  logsSection: { marginTop: 20 },
  logsTitle: { fontWeight: '600', marginBottom: 12 },
  logCard: { borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  logDate: { fontWeight: '600' },
  logMood: { fontWeight: '700' },
  logRow: { flexDirection: 'row' },
  logItem: { fontWeight: '500' },
});