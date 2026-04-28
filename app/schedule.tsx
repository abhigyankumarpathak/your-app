import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Calendar from 'expo-calendar';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { checkCalendarPermission } from '../services/permissions';
import { useTheme } from '../context/ThemeContext';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getDayName(date: Date) {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
}

function formatTime(date: Date) {
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  // Start on Monday
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function Schedule() {
  const { accentColor, presetValues, fontSizes } = useTheme();
  const [activities, setActivities] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<Calendar.Event[]>([]);
  const [calendarAccess, setCalendarAccess] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [day, setDay] = useState('Mon');
  const [time, setTime] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadActivities();
      loadCalendarEvents();
    }, [])
  );

  const loadActivities = async () => {
    try {
      const data = await AsyncStorage.getItem('focusActivities');
      if (data) setActivities(JSON.parse(data));
    } catch {}
  };

  const loadCalendarEvents = async () => {
    const hasAccess = await checkCalendarPermission();
    setCalendarAccess(hasAccess);
    if (!hasAccess) return;

    try {
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      if (!calendars.length) return;

      const weekStart = startOfWeek(new Date());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const events = await Calendar.getEventsAsync(
        calendars.map((c) => c.id),
        weekStart,
        weekEnd
      );

      // Sort by start date
      events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      setCalendarEvents(events);
    } catch (e) {
      console.log('Calendar fetch error:', e);
    }
  };

  const saveActivities = async (items: any[]) => {
    try {
      await AsyncStorage.setItem('focusActivities', JSON.stringify(items));
      setActivities(items);
    } catch {}
  };

  const addActivity = () => {
    if (!name.trim()) return;
    saveActivities([...activities, { id: Date.now(), name, day, time }]);
    setName('');
    setTime('');
    setShowForm(false);
  };

  const deleteActivity = (id: number) => {
    Alert.alert('Delete Activity', 'Remove this activity?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => saveActivities(activities.filter((x) => x.id !== id)) },
    ]);
  };

  // Group calendar events by day name
  const eventsByDay: Record<string, Calendar.Event[]> = {};
  calendarEvents.forEach((e) => {
    const d = getDayName(new Date(e.startDate));
    if (!eventsByDay[d]) eventsByDay[d] = [];
    eventsByDay[d].push(e);
  });

  const hasAnything = activities.length > 0 || calendarEvents.length > 0;

  return (
    <ScrollView style={[styles.container, { backgroundColor: presetValues.bg }]}>
      <View style={[styles.header, { backgroundColor: accentColor }]}>
        <Text style={[styles.headerTitle, { fontSize: fontSizes.heading, color: '#fff' }]}>
          📅 Schedule
        </Text>
        <Text style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.9)' }]}>
          Your week at a glance
        </Text>
      </View>

      <View style={styles.content}>

        {/* Calendar events section */}
        {calendarAccess ? (
          <View style={[styles.section, { backgroundColor: presetValues.cardBg }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: presetValues.text, fontSize: fontSizes.title }]}>
                📆 This Week's Events
              </Text>
              <TouchableOpacity onPress={loadCalendarEvents}>
                <Ionicons name="refresh" size={18} color={accentColor} />
              </TouchableOpacity>
            </View>

            {calendarEvents.length === 0 ? (
              <Text style={[styles.emptyNote, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>
                No calendar events this week.
              </Text>
            ) : (
              DAYS.map((d) => {
                const events = eventsByDay[d];
                if (!events?.length) return null;
                return (
                  <View key={d}>
                    <Text style={[styles.dayLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>
                      {d.toUpperCase()}
                    </Text>
                    {events.map((e) => (
                      <View key={e.id} style={[styles.eventCard, { backgroundColor: presetValues.bgSecondary, borderLeftColor: accentColor }]}>
                        <Text style={[styles.eventTitle, { color: presetValues.text, fontSize: fontSizes.base }]} numberOfLines={1}>
                          {e.title}
                        </Text>
                        {!e.allDay && (
                          <Text style={[styles.eventTime, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>
                            {formatTime(new Date(e.startDate))} – {formatTime(new Date(e.endDate))}
                          </Text>
                        )}
                        {e.allDay && (
                          <Text style={[styles.eventTime, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>
                            All day
                          </Text>
                        )}
                        {e.location ? (
                          <Text style={[styles.eventLocation, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]} numberOfLines={1}>
                            📍 {e.location}
                          </Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                );
              })
            )}
          </View>
        ) : (
          <View style={[styles.section, { backgroundColor: presetValues.cardBg }]}>
            <Text style={[styles.sectionTitle, { color: presetValues.text, fontSize: fontSizes.title }]}>
              📆 Calendar Events
            </Text>
            <Text style={[styles.emptyNote, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>
              Calendar access not granted. Enable it in Settings → Notifications → Calendar Access.
            </Text>
          </View>
        )}

        {/* Manual activities section */}
        <View style={[styles.section, { backgroundColor: presetValues.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: presetValues.text, fontSize: fontSizes.title }]}>
            📌 My Activities
          </Text>

          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: accentColor }]}
            onPress={() => setShowForm(!showForm)}
          >
            <Ionicons name={showForm ? 'close' : 'add'} size={20} color="#fff" />
            <Text style={[styles.addButtonText, { fontSize: fontSizes.base }]}>
              {showForm ? 'Cancel' : 'Add Activity'}
            </Text>
          </TouchableOpacity>

          {showForm && (
            <View style={[styles.form, { backgroundColor: presetValues.bgSecondary, borderColor: presetValues.borderColor }]}>
              <TextInput
                style={[styles.input, { backgroundColor: presetValues.bg, color: presetValues.text, borderColor: accentColor, fontSize: fontSizes.base }]}
                placeholder="Club / Activity name"
                placeholderTextColor={presetValues.textSecondary}
                value={name}
                onChangeText={setName}
              />
              <TextInput
                style={[styles.input, { backgroundColor: presetValues.bg, color: presetValues.text, borderColor: accentColor, fontSize: fontSizes.base }]}
                placeholder="Time (e.g. 3:30 PM)"
                placeholderTextColor={presetValues.textSecondary}
                value={time}
                onChangeText={setTime}
              />
              <Text style={[styles.label, { color: presetValues.text, fontSize: fontSizes.base }]}>Day</Text>
              <View style={styles.dayRow}>
                {DAYS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dayBtn, { backgroundColor: day === d ? accentColor : presetValues.bg, borderColor: presetValues.borderColor }]}
                    onPress={() => setDay(d)}
                  >
                    <Text style={[styles.dayText, { color: day === d ? '#fff' : presetValues.text, fontSize: fontSizes.base - 1 }]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={[styles.saveButton, { backgroundColor: accentColor }]} onPress={addActivity}>
                <Text style={[styles.saveButtonText, { fontSize: fontSizes.base }]}>Save Activity</Text>
              </TouchableOpacity>
            </View>
          )}

          {activities.length === 0 && !showForm ? (
            <Text style={[styles.emptyNote, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>
              No activities yet. Add clubs, sports, or recurring commitments here.
            </Text>
          ) : (
            DAYS.map((d) => {
              const items = activities.filter((a) => a.day === d);
              if (!items.length) return null;
              return (
                <View key={d}>
                  <Text style={[styles.dayLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>
                    {d.toUpperCase()}
                  </Text>
                  {items.map((a) => (
                    <View key={a.id} style={[styles.activityCard, { backgroundColor: presetValues.bgSecondary, borderColor: presetValues.borderColor }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.activityName, { color: presetValues.text, fontSize: fontSizes.base }]}>{a.name}</Text>
                        {a.time ? <Text style={[styles.activityTime, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>{a.time}</Text> : null}
                      </View>
                      <TouchableOpacity onPress={() => deleteActivity(a.id)}>
                        <Ionicons name="trash-outline" size={18} color={presetValues.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              );
            })
          )}
        </View>

        {!hasAnything && (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>📅</Text>
            <Text style={[styles.emptyText, { color: presetValues.textSecondary, fontSize: fontSizes.base }]}>
              Your week is wide open. Add activities or grant calendar access to see events here.
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
  content: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 },
  section: { borderRadius: 14, padding: 16, marginTop: 14 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontWeight: '700' },
  dayLabel: { fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 14, marginBottom: 6 },
  // Calendar events
  eventCard: { borderRadius: 10, padding: 12, marginBottom: 8, borderLeftWidth: 3 },
  eventTitle: { fontWeight: '600', marginBottom: 2 },
  eventTime: { fontWeight: '500' },
  eventLocation: { fontWeight: '500', marginTop: 2 },
  // Manual activities
  addButton: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, justifyContent: 'center', marginBottom: 12 },
  addButtonText: { color: '#fff', fontWeight: '600', marginLeft: 6 },
  form: { borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1 },
  input: { borderRadius: 8, padding: 11, marginBottom: 10, borderWidth: 1 },
  label: { fontWeight: '500', marginBottom: 8 },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  dayBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  dayText: { fontWeight: '600' },
  saveButton: { padding: 12, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: '600' },
  activityCard: { borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1 },
  activityName: { fontWeight: '600' },
  activityTime: { marginTop: 2 },
  emptyNote: { fontWeight: '500', lineHeight: 20 },
  emptyState: { alignItems: 'center', marginTop: 40, paddingHorizontal: 20 },
  emptyText: { fontWeight: '500', textAlign: 'center', lineHeight: 22 },
});
