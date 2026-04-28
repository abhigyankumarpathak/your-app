import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

function TaskItem({ task, onToggle, onDelete, accentColor, presetValues, fontSizes }: any) {
  return (
    <TouchableOpacity
      onPress={() => onToggle(task.id)}
      style={[
        styles.taskCard,
        {
          backgroundColor: presetValues.cardBg,
          borderLeftColor: task.done ? presetValues.textSecondary : accentColor,
          borderBottomColor: presetValues.borderColor,
        },
      ]}
    >
      <View style={styles.taskLeft}>
        <Ionicons
          name={task.done ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={task.done ? presetValues.textSecondary : accentColor}
        />
        <View style={{ marginLeft: 12 }}>
          <Text
            style={[
              styles.taskTitle,
              {
                color: presetValues.text,
                fontSize: fontSizes.base + 1,
                textDecorationLine: task.done ? 'line-through' : 'none',
              },
            ]}
          >
            {task.title}
          </Text>
          {task.subject ? (
            <Text
              style={[
                styles.taskSubject,
                {
                  color: presetValues.textSecondary,
                  fontSize: fontSizes.base - 1,
                },
              ]}
            >
              {task.subject}
            </Text>
          ) : null}
        </View>
      </View>
      <TouchableOpacity onPress={() => onDelete(task.id)}>
        <Ionicons name="trash-outline" size={20} color={presetValues.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function Tasks() {
  const { accentColor, presetValues, fontSizes } = useTheme();
  const [tasks, setTasks] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const data = await AsyncStorage.getItem('focusTasks');
      if (data) setTasks(JSON.parse(data));
    } catch (error) {
      console.log('Error loading tasks:', error);
    }
  };

  const saveTasks = async (newTasks: any[]) => {
    try {
      await AsyncStorage.setItem('focusTasks', JSON.stringify(newTasks));
      setTasks(newTasks);
    } catch (error) {
      console.log('Error saving tasks:', error);
    }
  };

  const addTask = () => {
    if (!title.trim()) {
      Alert.alert('Task needed', 'Please enter a task to add');
      return;
    }
    saveTasks([{ id: Date.now(), title, subject, done: false }, ...tasks]);
    setTitle('');
    setSubject('');
    setShowForm(false);
  };

  const pending = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  return (
    <ScrollView style={[styles.container, { backgroundColor: presetValues.bg }]}>
      <View style={[styles.header, { backgroundColor: accentColor }]}>
        <Text style={[styles.headerTitle, { fontSize: fontSizes.heading, color: '#fff' }]}>
          ✓ Tasks
        </Text>
        <Text style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.9)' }]}>
          {pending.length} pending
        </Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: accentColor }]}
          onPress={() => setShowForm(!showForm)}
        >
          <Ionicons name={showForm ? 'close' : 'add'} size={24} color="#fff" />
          <Text style={[styles.addButtonText, { fontSize: fontSizes.base + 1 }]}>
            {showForm ? 'Cancel' : 'Add Task'}
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
              placeholder="Task title"
              placeholderTextColor={presetValues.textSecondary}
              value={title}
              onChangeText={setTitle}
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
              placeholder="Subject (optional)"
              placeholderTextColor={presetValues.textSecondary}
              value={subject}
              onChangeText={setSubject}
            />
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: accentColor }]}
              onPress={addTask}
            >
              <Text style={[styles.saveButtonText, { fontSize: fontSizes.base + 1 }]}>
                Save Task
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {pending.length > 0 && (
          <>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: presetValues.textSecondary,
                  fontSize: fontSizes.base - 1,
                },
              ]}
            >
              PENDING ({pending.length})
            </Text>
            {pending.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={(id: number) =>
                  saveTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
                }
                onDelete={(id: number) => saveTasks(tasks.filter((t) => t.id !== id))}
                accentColor={accentColor}
                presetValues={presetValues}
                fontSizes={fontSizes}
              />
            ))}
          </>
        )}

        {done.length > 0 && (
          <>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: presetValues.textSecondary,
                  fontSize: fontSizes.base - 1,
                  marginTop: 20,
                },
              ]}
            >
              COMPLETED ({done.length})
            </Text>
            {done.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={(id: number) =>
                  saveTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
                }
                onDelete={(id: number) => saveTasks(tasks.filter((t) => t.id !== id))}
                accentColor={accentColor}
                presetValues={presetValues}
                fontSizes={fontSizes}
              />
            ))}
          </>
        )}

        {pending.length === 0 && done.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyIcon, { fontSize: fontSizes.heading + 20 }]}>📝</Text>
            <Text
              style={[
                styles.emptyText,
                {
                  color: presetValues.textSecondary,
                  fontSize: fontSizes.base,
                },
              ]}
            >
              No tasks yet. Create one to get started!
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
  saveButton: { padding: 12, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: '600' },
  sectionTitle: { fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  taskCard: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 4,
    borderBottomWidth: 0.5,
  },
  taskLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  taskTitle: { fontWeight: '500' },
  taskSubject: { marginTop: 2 },
  emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 20 },
  emptyIcon: { marginBottom: 16 },
  emptyText: { fontWeight: '500', textAlign: 'center' },
});