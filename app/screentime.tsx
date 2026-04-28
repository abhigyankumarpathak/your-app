import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

function WeekBar({ day, hours, max, accent }: { day: string; hours: number; max: number; accent: string }) {
  const { presetValues, fontSizes } = useTheme();
  const pct = max > 0 ? hours / max : 0;
  return (
    <View style={styles.barCol}>
      <View style={[styles.barBg, { backgroundColor: presetValues.bgSecondary }]}>
        <View style={[styles.barFill, { height: `${Math.round(pct * 100)}%` as any, backgroundColor: accent }]} />
      </View>
      <Text style={[styles.barHours, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>
        {hours > 0 ? `${hours}h` : ''}
      </Text>
      <Text style={[styles.barDay, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>{day}</Text>
    </View>
  );
}

export default function ScreenTime() {
  const { accentColor, presetValues, fontSizes } = useTheme();
  const [logs, setLogs] = useState<any[]>([]);
  const [todayInput, setTodayInput] = useState('');
  const [stats, setStats] = useState({ today: 0, weekAvg: 0, weekTotal: 0 });
  const [weekData, setWeekData] = useState<{ day: string; hours: number }[]>([]);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const data = await AsyncStorage.getItem('focusWellness');
      if (data) {
        const parsed = JSON.parse(data);
        setLogs(parsed);
        buildStats(parsed);
      }
    } catch (e) {
      console.log('Error loading logs:', e);
    }
  };

  const buildStats = (allLogs: any[]) => {
    const todayStr = new Date().toLocaleDateString();
    const todayLog = allLogs.find((l) => l.date === todayStr);
    const today = todayLog ? parseFloat(todayLog.screenTime) || 0 : 0;

    const days: { day: string; hours: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString();
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const found = allLogs.find((l) => l.date === dateStr);
      days.push({ day: dayName, hours: found ? parseFloat(found.screenTime) || 0 : 0 });
    }
    setWeekData(days);

    const withData = days.filter((d) => d.hours > 0);
    const weekAvg = withData.length > 0
      ? Math.round((withData.reduce((s, d) => s + d.hours, 0) / withData.length) * 10) / 10
      : 0;
    const weekTotal = Math.round(days.reduce((s, d) => s + d.hours, 0) * 10) / 10;

    setStats({ today, weekAvg, weekTotal });
  };

  const saveToday = async () => {
    const hours = parseFloat(todayInput);
    if (isNaN(hours) || hours < 0 || hours > 24) {
      Alert.alert('Invalid input', 'Enter a number between 0 and 24');
      return;
    }

    try {
      const data = await AsyncStorage.getItem('focusWellness');
      const allLogs = data ? JSON.parse(data) : [];
      const todayStr = new Date().toLocaleDateString();
      const existingIdx = allLogs.findIndex((l: any) => l.date === todayStr);

      if (existingIdx >= 0) {
        allLogs[existingIdx].screenTime = hours;
      } else {
        allLogs.unshift({ id: Date.now(), date: todayStr, screenTime: hours, sleepDuration: 0, mood: '', bedtime: '', wakeTime: '' });
      }

      await AsyncStorage.setItem('focusWellness', JSON.stringify(allLogs));
      setTodayInput('');
      buildStats(allLogs);
      setLogs(allLogs);
      Alert.alert('Saved!', `Screen time logged as ${hours}h today.`);
    } catch (e) {
      console.log('Save error:', e);
    }
  };

  const openDeviceScreenTime = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('App-prefs:root=SCREEN_TIME').catch(() =>
        Linking.openSettings()
      );
    } else {
      Linking.openURL('android.settings.USAGE_ACCESS_SETTINGS').catch(() =>
        Alert.alert('Open Screen Time', 'Go to Settings > Digital Wellbeing to view your screen time.')
      );
    }
  };

  const maxHours = Math.max(...weekData.map((d) => d.hours), 1);

  const statusColor = stats.today <= 2 ? '#10B981' : stats.today <= 4 ? '#F59E0B' : '#EF4444';
  const statusLabel = stats.today <= 2 ? 'Great!' : stats.today <= 4 ? 'Moderate' : 'High usage';

  return (
    <ScrollView style={[styles.container, { backgroundColor: presetValues.bg }]}>
      <View style={[styles.header, { backgroundColor: '#8B5CF6' }]}>
        <Text style={[styles.headerTitle, { fontSize: fontSizes.heading, color: '#fff' }]}>
          📱 Screen Time
        </Text>
        <Text style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.85)' }]}>
          Track your daily device usage
        </Text>
      </View>

      <View style={styles.content}>
        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { label: "Today", value: `${stats.today}h`, color: statusColor },
            { label: "7-Day Avg", value: `${stats.weekAvg}h`, color: accentColor },
            { label: "Week Total", value: `${stats.weekTotal}h`, color: accentColor },
          ].map((s) => (
            <View
              key={s.label}
              style={[styles.statCard, { backgroundColor: presetValues.cardBg, borderColor: presetValues.borderColor }]}
            >
              <Text style={[styles.statValue, { color: s.color, fontSize: fontSizes.heading }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Status badge */}
        {stats.today > 0 && (
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
            <Text style={[styles.statusText, { color: statusColor, fontSize: fontSizes.base }]}>
              {statusLabel} — {stats.today}h today
            </Text>
          </View>
        )}

        {/* Weekly chart */}
        <View style={[styles.card, { backgroundColor: presetValues.cardBg, borderColor: presetValues.borderColor }]}>
          <Text style={[styles.cardTitle, { color: presetValues.text, fontSize: fontSizes.title }]}>
            📊 This Week
          </Text>
          <View style={styles.barsRow}>
            {weekData.map((d) => (
              <WeekBar key={d.day} day={d.day} hours={d.hours} max={maxHours} accent={accentColor} />
            ))}
          </View>
        </View>

        {/* Log today */}
        <View style={[styles.card, { backgroundColor: presetValues.cardBg, borderColor: presetValues.borderColor }]}>
          <Text style={[styles.cardTitle, { color: presetValues.text, fontSize: fontSizes.title }]}>
            📋 Log Today's Usage
          </Text>
          <Text style={[styles.inputLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>
            Hours spent on your phone today
          </Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { backgroundColor: presetValues.bgSecondary, color: presetValues.text, borderColor: accentColor, fontSize: fontSizes.base }]}
              placeholder="e.g. 3.5"
              placeholderTextColor={presetValues.textSecondary}
              value={todayInput}
              onChangeText={setTodayInput}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accentColor }]} onPress={saveToday}>
              <Text style={[styles.saveBtnText, { fontSize: fontSizes.base }]}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Device screen time link */}
        <TouchableOpacity
          style={[styles.deviceCard, { backgroundColor: '#8B5CF6' + '15', borderColor: '#8B5CF6' }]}
          onPress={openDeviceScreenTime}
        >
          <View>
            <Text style={[styles.deviceTitle, { color: presetValues.text, fontSize: fontSizes.base + 1 }]}>
              📱 View Device Screen Time
            </Text>
            <Text style={[styles.deviceSub, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>
              {Platform.OS === 'ios' ? 'Open iOS Screen Time in Settings →' : 'Open Digital Wellbeing in Settings →'}
            </Text>
          </View>
          <Text style={{ fontSize: 18 }}>→</Text>
        </TouchableOpacity>

        {/* Tips */}
        <View style={[styles.card, { backgroundColor: presetValues.bgSecondary, borderColor: presetValues.borderColor }]}>
          <Text style={[styles.cardTitle, { color: presetValues.text, fontSize: fontSizes.title }]}>
            💡 Screen Time Tips
          </Text>
          {[
            'Aim for under 2 hours of recreational screen time',
            'Set app limits in your device\'s Screen Time settings',
            'Use Do Not Disturb during study sessions',
            'Take a 20-second break every 20 minutes',
          ].map((tip) => (
            <Text key={tip} style={[styles.tip, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>
              • {tip}
            </Text>
          ))}
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
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  statCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1 },
  statValue: { fontWeight: '700', marginBottom: 4 },
  statLabel: { fontWeight: '500', textAlign: 'center' },
  statusBadge: { borderRadius: 10, padding: 10, marginTop: 10, borderWidth: 1, alignItems: 'center' },
  statusText: { fontWeight: '600' },
  card: { borderRadius: 14, padding: 16, marginTop: 16, borderWidth: 1 },
  cardTitle: { fontWeight: '600', marginBottom: 12 },
  barsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 100 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barBg: { width: 24, height: 72, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 6, minHeight: 4 },
  barHours: { fontWeight: '600' },
  barDay: { fontWeight: '500' },
  inputLabel: { marginBottom: 8, fontWeight: '500' },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: { flex: 1, borderRadius: 8, padding: 12, borderWidth: 1 },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  saveBtnText: { color: '#fff', fontWeight: '600' },
  deviceCard: { borderRadius: 14, padding: 16, marginTop: 16, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deviceTitle: { fontWeight: '600', marginBottom: 4 },
  deviceSub: { fontWeight: '500' },
  tip: { marginBottom: 8, fontWeight: '500', lineHeight: 20 },
});
