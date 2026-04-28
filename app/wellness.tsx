import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

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

  const moods = ['😴', '😑', '😐', '🙂', '😄'];
  const getMoodLabel = (emoji: string) => {
    const map: any = { '😴': 'Tired', '😑': 'Okay', '😐': 'Normal', '🙂': 'Good', '😄': 'Great' };
    return map[emoji] || '';
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: presetValues.bg }]}>
      <View style={[styles.header, { backgroundColor: '#10B981' }]}>
        <Text style={[styles.headerTitle, { fontSize: fontSizes.heading, color: '#fff' }]}>
          ❤️ Wellness Tracker
        </Text>
        <Text style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.9)' }]}>
          Monitor sleep & screen time
        </Text>
      </View>

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