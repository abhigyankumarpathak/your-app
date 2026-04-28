import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

function StatCard({ label, value, unit, icon, color, route }: any) {
  const { fontSizes, presetValues } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => router.push(route)}
      style={[
        styles.card,
        {
          backgroundColor: presetValues.cardBg,
          borderLeftColor: color,
          shadowColor: color,
        },
      ]}
    >
      <Text style={[styles.cardIcon, { fontSize: fontSizes.heading + 8 }]}>{icon}</Text>
      <Text style={[styles.cardValue, { fontSize: fontSizes.heading, color: presetValues.text }]}>
        {value}
        <Text style={[styles.cardUnit, { fontSize: fontSizes.base, color: presetValues.textSecondary }]}>
          {' '}
          {unit}
        </Text>
      </Text>
      <Text style={[styles.cardLabel, { fontSize: fontSizes.base - 1, color: presetValues.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.cardArrow, { color: presetValues.textSecondary }]}>→</Text>
    </TouchableOpacity>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export default function Dashboard() {
  const { accentColor, presetValues, fontSizes } = useTheme();
  const [stats, setStats] = useState({ studyHours: 0, tasks: 0, sleepHours: 0, screenTime: 0 });
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [sessions, tasks, wellness] = await Promise.all([
        AsyncStorage.getItem('focusSessions'),
        AsyncStorage.getItem('focusTasks'),
        AsyncStorage.getItem('focusWellness'),
      ]);

      let studyHours = 0;
      let taskCount = 0;
      let sleepHours = 0;
      let screenTime = 0;

      if (sessions) {
        const todayDate = new Date().toLocaleDateString();
        const todaySessions = JSON.parse(sessions).filter((s: any) => s.date === todayDate);
        studyHours = Math.round((todaySessions.reduce((sum: number, s: any) => sum + s.duration, 0) / 3600) * 10) / 10;
      }

      if (tasks) {
        taskCount = JSON.parse(tasks).filter((t: any) => !t.done).length;
      }

      if (wellness) {
        const allLogs = JSON.parse(wellness);
        if (allLogs.length > 0) {
          const latestLog = allLogs[0];
          sleepHours = latestLog.sleepDuration || 0;
          screenTime = latestLog.screenTime || 0;
        }
      }

      setStats({ studyHours, tasks: taskCount, sleepHours, screenTime });
    } catch (error) {
      console.log('Error loading stats:', error);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: presetValues.bg }]}>
      <View style={[styles.header, { backgroundColor: accentColor }]}>
        <Text
          style={[
            styles.greeting,
            { fontSize: fontSizes.heading + 6, color: '#fff', fontWeight: 'bold' },
          ]}
        >
          Good {getTimeOfDay()} 👋
        </Text>
        <Text style={[styles.date, { fontSize: fontSizes.base, color: 'rgba(255,255,255,0.8)' }]}>
          {today}
        </Text>
      </View>

      <View style={styles.content}>
        <Text
          style={[
            styles.sectionTitle,
            { color: presetValues.text, fontSize: fontSizes.title, marginBottom: 16 },
          ]}
        >
          📊 Today's Overview
        </Text>

        <StatCard label="Study Time" value={stats.studyHours} unit="hours" icon="🎯" color={accentColor} route="/study" />
        <StatCard label="Tasks Pending" value={stats.tasks} unit="tasks" icon="✓" color={accentColor} route="/tasks" />
        <StatCard label="Sleep Last Night" value={stats.sleepHours} unit="hours" icon="😴" color={accentColor} route="/wellness" />
        <StatCard label="Screen Time" value={stats.screenTime} unit="hours" icon="📵" color={accentColor} route="/screentime" />

        <View
          style={[
            styles.tipBox,
            {
              backgroundColor: presetValues.bgSecondary,
              borderColor: accentColor,
            },
          ]}
        >
          <Text
            style={[
              styles.tipTitle,
              { color: presetValues.text, fontSize: fontSizes.base + 1, fontWeight: '600' },
            ]}
          >
            💡 Quick Tips
          </Text>
          <Text
            style={[
              styles.tipText,
              {
                color: presetValues.textSecondary,
                fontSize: fontSizes.base,
                lineHeight: 20,
              },
            ]}
          >
            • Set study goals each day{'\n'}• Log your sleep for better tracking{'\n'}• Take breaks during long sessions
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 40, paddingBottom: 24, paddingHorizontal: 20 },
  greeting: { marginBottom: 4 },
  date: { fontWeight: '500' },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  sectionTitle: { fontWeight: '600' },
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardIcon: { marginBottom: 4 },
  cardValue: { fontWeight: 'bold', marginBottom: 4 },
  cardUnit: { fontWeight: 'normal' },
  cardLabel: { fontWeight: '500' },
  cardArrow: { position: 'absolute', right: 14, top: '50%', fontSize: 16, fontWeight: '600' },
  tipBox: { borderRadius: 12, padding: 14, marginTop: 20, borderWidth: 1 },
  tipTitle: { marginBottom: 8 },
  tipText: { fontWeight: '500' },
});
