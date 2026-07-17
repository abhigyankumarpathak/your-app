import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Calendar from 'expo-calendar';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import EmptyState from '../components/EmptyState';
import { elevation, radius } from '../theme/design';
import { checkCalendarPermission, isCalendarAvailable } from '../services/permissions';
import { confirm, notify } from '../services/dialog';
import {
  getGoogleEvents,
  isGoogleCalendarConfigured,
  isGoogleSignedIn,
  signInToGoogle,
  signOutGoogle,
} from '../services/googleCalendar';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Device (Apple/system) and Google events, normalized into one shape so the
 *  week view doesn't care where a given event came from. */
type UnifiedEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  location?: string;
  source: 'device' | 'google';
};

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
  const [calendarEvents, setCalendarEvents] = useState<UnifiedEvent[]>([]);
  const [calendarAccess, setCalendarAccess] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
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
    const weekStart = startOfWeek(new Date());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const collected: UnifiedEvent[] = [];

    // Device calendar — native only; there is no OS calendar in a browser.
    const hasAccess = await checkCalendarPermission();
    setCalendarAccess(hasAccess);
    if (hasAccess) {
      try {
        const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        if (calendars.length) {
          const events = await Calendar.getEventsAsync(
            calendars.map((c) => c.id),
            weekStart,
            weekEnd
          );
          for (const e of events) {
            collected.push({
              id: `device-${e.id}`,
              title: e.title,
              start: new Date(e.startDate),
              end: new Date(e.endDate),
              allDay: Boolean(e.allDay),
              location: e.location || undefined,
              source: 'device',
            });
          }
        }
      } catch (e) {
        console.log('Calendar fetch error:', e);
      }
    }

    // Google Calendar — works everywhere, and is the only real source on web.
    const signedIn = await isGoogleSignedIn();
    setGoogleConnected(signedIn);
    if (signedIn) {
      const events = await getGoogleEvents(weekStart, weekEnd);
      if (events === null) {
        // Token expired or was revoked — reflect that instead of showing nothing.
        setGoogleConnected(false);
      } else {
        for (const e of events) {
          collected.push({
            id: `google-${e.id}`,
            title: e.title,
            start: new Date(e.startDate),
            end: new Date(e.endDate),
            allDay: e.allDay,
            location: e.location,
            source: 'google',
          });
        }
      }
    }

    collected.sort((a, b) => a.start.getTime() - b.start.getTime());
    setCalendarEvents(collected);
  };

  const handleConnectGoogle = async () => {
    setConnectingGoogle(true);
    try {
      const ok = await signInToGoogle();
      if (ok) {
        setGoogleConnected(true);
        await loadCalendarEvents();
      } else {
        notify('Not connected', 'Google sign-in was cancelled or failed. Please try again.');
      }
    } finally {
      setConnectingGoogle(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    const ok = await confirm('Disconnect Google Calendar', 'Your events will stop showing here.', {
      confirmText: 'Disconnect',
      destructive: true,
    });
    if (!ok) return;
    await signOutGoogle();
    setGoogleConnected(false);
    await loadCalendarEvents();
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

  const deleteActivity = async (id: number) => {
    const ok = await confirm('Delete Activity', 'Remove this activity?', {
      confirmText: 'Delete',
      destructive: true,
    });
    if (ok) saveActivities(activities.filter((x) => x.id !== id));
  };

  // Group calendar events by day name
  const eventsByDay: Record<string, UnifiedEvent[]> = {};
  calendarEvents.forEach((e) => {
    const d = getDayName(e.start);
    if (!eventsByDay[d]) eventsByDay[d] = [];
    eventsByDay[d].push(e);
  });

  const hasAnything = activities.length > 0 || calendarEvents.length > 0;
  const googleAvailable = isGoogleCalendarConfigured();
  // Any live source at all? On web, Google is the only one that can be.
  const hasEventSource = calendarAccess || googleConnected;

  return (
    <ScrollView style={[styles.container, { backgroundColor: presetValues.bg }]}>
      <View style={styles.content}>

        {/* Calendar events section */}
        <View style={[styles.section, { backgroundColor: presetValues.cardBg }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: presetValues.text, fontSize: fontSizes.title }]}>
              📆 This Week's Events
            </Text>
            {hasEventSource && (
              <TouchableOpacity onPress={loadCalendarEvents}>
                <Ionicons name="refresh" size={18} color={accentColor} />
              </TouchableOpacity>
            )}
          </View>

          {/* Google Calendar connect/disconnect */}
          {googleAvailable && (
            <TouchableOpacity
              style={[
                styles.googleBtn,
                { borderColor: googleConnected ? presetValues.borderColor : accentColor },
              ]}
              onPress={googleConnected ? handleDisconnectGoogle : handleConnectGoogle}
              disabled={connectingGoogle}
            >
              {connectingGoogle ? (
                <ActivityIndicator size="small" color={accentColor} />
              ) : (
                <>
                  <Ionicons
                    name={googleConnected ? 'checkmark-circle' : 'logo-google'}
                    size={18}
                    color={googleConnected ? '#10B981' : accentColor}
                  />
                  <Text
                    style={[
                      styles.googleBtnText,
                      { color: presetValues.text, fontSize: fontSizes.base - 1 },
                    ]}
                  >
                    {googleConnected ? 'Google Calendar connected — tap to disconnect' : 'Connect Google Calendar'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {!hasEventSource ? (
            <Text style={[styles.emptyNote, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>
              {googleAvailable
                ? isCalendarAvailable()
                  ? 'Connect Google Calendar above, or grant device calendar access in Settings → Calendar Access.'
                  : 'Connect Google Calendar above to see your events here.'
                : isCalendarAvailable()
                  ? 'Calendar access not granted. Enable it in Settings → Notifications → Calendar Access.'
                  : 'Your device calendar isn\'t available in a browser. Set up Google Calendar to see events on the web — see README.md.'}
            </Text>
          ) : calendarEvents.length === 0 ? (
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
                      <Text style={[styles.eventTime, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>
                        {e.allDay ? 'All day' : `${formatTime(e.start)} – ${formatTime(e.end)}`}
                      </Text>
                      {e.location ? (
                        <Text style={[styles.eventLocation, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]} numberOfLines={1}>
                          📍 {e.location}
                        </Text>
                      ) : null}
                      {/* Only worth labelling when both sources are live. */}
                      {calendarAccess && googleConnected && (
                        <Text style={[styles.eventSource, { color: presetValues.textSecondary, fontSize: fontSizes.base - 3 }]}>
                          {e.source === 'google' ? 'Google Calendar' : 'Device Calendar'}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              );
            })
          )}
        </View>

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
          <EmptyState icon="📅" text="Your week is wide open. Add activities or grant calendar access to see events here." />
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
  content: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 16 },
  section: { borderRadius: radius.lg, padding: 16, marginTop: 14, ...elevation(1) },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontWeight: '700' },
  dayLabel: { fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 14, marginBottom: 6 },
  // Calendar events
  eventCard: { borderRadius: radius.md, padding: 12, marginBottom: 8, borderLeftWidth: 3 },
  eventTitle: { fontWeight: '600', marginBottom: 2 },
  eventTime: { fontWeight: '500' },
  eventLocation: { fontWeight: '500', marginTop: 2 },
  eventSource: { fontWeight: '500', marginTop: 4, opacity: 0.7 },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 12, minHeight: 44 },
  googleBtnText: { fontWeight: '600' },
  // Manual activities
  addButton: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, justifyContent: 'center', marginBottom: 12 },
  addButtonText: { color: '#fff', fontWeight: '600', marginLeft: 6 },
  form: { borderRadius: radius.md, padding: 14, marginBottom: 12, borderWidth: 1 },
  input: { borderRadius: 8, padding: 11, marginBottom: 10, borderWidth: 1 },
  label: { fontWeight: '500', marginBottom: 8 },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  dayBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  dayText: { fontWeight: '600' },
  saveButton: { padding: 12, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: '600' },
  activityCard: { borderRadius: radius.md, padding: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1 },
  activityName: { fontWeight: '600' },
  activityTime: { marginTop: 2 },
  emptyNote: { fontWeight: '500', lineHeight: 20 },
});