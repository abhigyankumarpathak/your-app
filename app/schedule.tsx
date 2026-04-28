import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Schedule() {
  const { accentColor, presetValues, fontSizes } = useTheme();
  const [activities, setActivities] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [day, setDay] = useState('Mon');
  const [time, setTime] = useState('');

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const data = await AsyncStorage.getItem('focusActivities');
      if (data) setActivities(JSON.parse(data));
    } catch (error) {
      console.log('Error loading activities:', error);
    }
  };

  const saveActivities = async (items: any[]) => {
    try {
      await AsyncStorage.setItem('focusActivities', JSON.stringify(items));
      setActivities(items);
    } catch (error) {
      console.log('Error saving activities:', error);
    }
  };

  const addActivity = () => {
    if (!name.trim()) return;
    saveActivities([...activities, { id: Date.now(), name, day, time }]);
    setName('');
    setTime('');
    setShowForm(false);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: presetValues.bg }]}>
      <View style={[styles.header, { backgroundColor: accentColor }]}>
        <Text style={[styles.headerTitle, { fontSize: fontSizes.heading, color: '#fff' }]}>
          📅 Schedule
        </Text>
        <Text style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.9)' }]}>
          Plan your week
        </Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: accentColor }]}
          onPress={() => setShowForm(!showForm)}
        >
          <Ionicons name={showForm ? 'close' : 'add'} size={24} color="#fff" />
          <Text style={[styles.addButtonText, { fontSize: fontSizes.base + 1 }]}>
            {showForm ? 'Cancel' : 'Add Activity'}
          </Text>
        </TouchableOpacity>

        {showForm && (
          <View
            style={[
              styles.form,
              {
                backgroundColor: presetValues.cardBg,
                borderColor: presetValues.borderColor,
              },
            ]}
          >
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
              placeholder="Club / Activity name"
              placeholderTextColor={presetValues.textSecondary}
              value={name}
              onChangeText={setName}
            />
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
              placeholder="Time (e.g. 3:30 PM)"
              placeholderTextColor={presetValues.textSecondary}
              value={time}
              onChangeText={setTime}
            />
            <Text
              style={[
                styles.label,
                { color: presetValues.text, fontSize: fontSizes.base },
              ]}
            >
              Day
            </Text>
            <View style={styles.dayRow}>
              {DAYS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.dayBtn,
                    {
                      backgroundColor: day === d ? accentColor : presetValues.bgSecondary,
                      borderColor: presetValues.borderColor,
                    },
                  ]}
                  onPress={() => setDay(d)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      {
                        color: day === d ? '#fff' : presetValues.text,
                        fontSize: fontSizes.base,
                      },
                    ]}
                  >
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: accentColor }]}
              onPress={addActivity}
            >
              <Text style={[styles.saveButtonText, { fontSize: fontSizes.base + 1 }]}>
                Save Activity
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {DAYS.map((d) => {
          const items = activities.filter((a) => a.day === d);
          if (!items.length) return null;
          return (
            <View key={d}>
              <Text
                style={[
                  styles.dayHeader,
                  {
                    color: presetValues.textSecondary,
                    fontSize: fontSizes.base - 1,
                  },
                ]}
              >
                {d}
              </Text>
              {items.map((a) => (
                <View
                  key={a.id}
                  style={[
                    styles.activityCard,
                    {
                      backgroundColor: presetValues.cardBg,
                      borderColor: presetValues.borderColor,
                    },
                  ]}
                >
                  <View>
                    <Text
                      style={[
                        styles.activityName,
                        {
                          color: presetValues.text,
                          fontSize: fontSizes.base + 1,
                        },
                      ]}
                    >
                      {a.name}
                    </Text>
                    {a.time ? (
                      <Text
                        style={[
                          styles.activityTime,
                          {
                            color: presetValues.textSecondary,
                            fontSize: fontSizes.base - 1,
                          },
                        ]}
                      >
                        {a.time}
                      </Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      saveActivities(activities.filter((x) => x.id !== a.id))
                    }
                  >
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={presetValues.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          );
        })}

        {activities.length === 0 && !showForm && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyIcon, { fontSize: fontSizes.heading + 20 }]}>
              📅
            </Text>
            <Text
              style={[
                styles.emptyText,
                {
                  color: presetValues.textSecondary,
                  fontSize: fontSizes.base,
                },
              ]}
            >
              No activities scheduled. Start planning!
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    marginTop: 16,
    justifyContent: 'center',
  },
  addButtonText: { color: '#fff', fontWeight: '600', marginLeft: 8 },
  form: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
  input: { borderRadius: 8, padding: 12, marginBottom: 10, borderWidth: 1 },
  label: { fontWeight: '500', marginBottom: 8 },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  dayBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  dayText: { fontWeight: '500' },
  saveButton: { padding: 12, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: '600' },
  dayHeader: {
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activityCard: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
  },
  activityName: { fontWeight: '500' },
  activityTime: { marginTop: 2 },
  emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 20 },
  emptyIcon: { marginBottom: 16 },
  emptyText: { fontWeight: '500', textAlign: 'center' },
});