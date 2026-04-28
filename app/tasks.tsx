import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { cancelTaskDueAlert, scheduleTaskDueAlert } from '../services/notifications';

type Priority = 'high' | 'medium' | 'low';

const PRIORITY_CONFIG: Record<Priority, { color: string; label: string }> = {
  high:   { color: '#EF4444', label: '🔴 High' },
  medium: { color: '#F59E0B', label: '🟡 Medium' },
  low:    { color: '#10B981', label: '🟢 Low' },
};

function dueDateTag(dueDate: string | undefined, fontSizes: any, presetValues: any) {
  if (!dueDate) return null;
  const today = new Date().toLocaleDateString();
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toLocaleDateString();
  const due = new Date(dueDate);
  const now = new Date(); now.setHours(0,0,0,0);
  const overdue = due < now && dueDate !== today;
  const color = overdue ? '#EF4444' : dueDate === today ? '#F59E0B' : '#6B7280';
  const label = dueDate === today ? 'Due today' : dueDate === tomorrowStr ? 'Due tomorrow' : overdue ? `Overdue · ${dueDate}` : dueDate;
  return (
    <View style={[styles.dueTag, { backgroundColor: color + '18', borderColor: color }]}>
      <Text style={[styles.dueTagText, { color, fontSize: fontSizes.base - 3 }]}>📅 {label}</Text>
    </View>
  );
}

function TaskItem({ task, onToggle, onDelete, accentColor, presetValues, fontSizes, goalTitle }: any) {
  const pri = task.priority ? PRIORITY_CONFIG[task.priority as Priority] : null;
  return (
    <TouchableOpacity
      onPress={() => onToggle(task.id)}
      style={[styles.taskCard, { backgroundColor: presetValues.cardBg, borderLeftColor: task.done ? presetValues.textSecondary : (pri?.color ?? accentColor), borderBottomColor: presetValues.borderColor }]}
    >
      <View style={styles.taskLeft}>
        <Ionicons name={task.done ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={task.done ? presetValues.textSecondary : (pri?.color ?? accentColor)} />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={[styles.taskTitle, { color: presetValues.text, fontSize: fontSizes.base + 1, textDecorationLine: task.done ? 'line-through' : 'none' }]}>
            {task.title}
          </Text>
          <View style={styles.taskMeta}>
            {task.subject ? <Text style={[styles.taskSubject, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>{task.subject}</Text> : null}
            {pri && !task.done ? <Text style={[styles.priorityDot, { color: pri.color, fontSize: fontSizes.base - 2 }]}>{pri.label}</Text> : null}
            {goalTitle ? <Text style={[styles.goalBadge, { color: accentColor, fontSize: fontSizes.base - 2, borderColor: accentColor }]}>🎯 {goalTitle}</Text> : null}
          </View>
          {!task.done && dueDateTag(task.dueDate, fontSizes, presetValues)}
        </View>
      </View>
      <TouchableOpacity onPress={() => onDelete(task.id)}>
        <Ionicons name="trash-outline" size={20} color={presetValues.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function resolveDueDate(choice: number, custom: string): string | undefined {
  if (choice === 0) return undefined; // no due date
  if (choice === 1) return new Date().toLocaleDateString();
  if (choice === 2) { const d = new Date(); d.setDate(d.getDate() + 1); return d.toLocaleDateString(); }
  if (choice === 3) { const d = new Date(); d.setDate(d.getDate() + 7); return d.toLocaleDateString(); }
  const p = new Date(custom.trim());
  return isNaN(p.getTime()) ? undefined : p.toLocaleDateString();
}

const DUE_DATE_CHIPS = ['No due date', 'Today', 'Tomorrow', 'This week', 'Custom'];
const PRIORITY_OPTIONS: Priority[] = ['high', 'medium', 'low'];

export default function Tasks() {
  const { accentColor, presetValues, fontSizes } = useTheme();
  const [tasks, setTasks] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [dueDateChoice, setDueDateChoice] = useState(0);
  const [customDueDate, setCustomDueDate] = useState('');
  const [linkedGoalId, setLinkedGoalId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showGoalPicker, setShowGoalPicker] = useState(false);

  useFocusEffect(useCallback(() => { loadTasks(); loadGoals(); }, []));

  const loadTasks = async () => {
    try { const d = await AsyncStorage.getItem('focusTasks'); if (d) setTasks(JSON.parse(d)); } catch {}
  };
  const loadGoals = async () => {
    try { const d = await AsyncStorage.getItem('focusGoals'); if (d) setGoals(JSON.parse(d).filter((g: any) => !g.completed)); } catch {}
  };

  const saveTasks = async (newTasks: any[]) => {
    try { await AsyncStorage.setItem('focusTasks', JSON.stringify(newTasks)); setTasks(newTasks); } catch {}
  };

  const addTask = async () => {
    if (!title.trim()) { Alert.alert('Task needed', 'Please enter a task title.'); return; }
    const dueDate = resolveDueDate(dueDateChoice, customDueDate);
    const newTask = { id: Date.now(), title: title.trim(), subject, priority: priority || undefined, dueDate, goalId: linkedGoalId ?? undefined, done: false };
    const updated = [newTask, ...tasks];
    await saveTasks(updated);
    if (dueDate) await scheduleTaskDueAlert(newTask.id, newTask.title, dueDate);
    resetForm();
  };

  const resetForm = () => {
    setTitle(''); setSubject(''); setPriority(''); setDueDateChoice(0); setCustomDueDate(''); setLinkedGoalId(null); setShowForm(false); setShowGoalPicker(false);
  };

  const handleToggle = async (id: number) => {
    const updated = tasks.map((t) => t.id === id ? { ...t, done: !t.done } : t);
    await saveTasks(updated);
    const task = updated.find((t) => t.id === id);
    if (task?.done) await cancelTaskDueAlert(id); // done — cancel any scheduled alert
  };

  const handleDelete = async (id: number) => {
    await cancelTaskDueAlert(id);
    await saveTasks(tasks.filter((t) => t.id !== id));
  };

  const goalTitle = (goalId: number | undefined) => goals.find((g) => g.id === goalId)?.title;

  const today = new Date(); today.setHours(0,0,0,0);
  const dueToday = tasks.filter((t) => !t.done && t.dueDate === new Date().toLocaleDateString());
  const pending = tasks.filter((t) => !t.done && t.dueDate !== new Date().toLocaleDateString());
  const done = tasks.filter((t) => t.done);

  // Sort pending: overdue → by priority → no date
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const sortedPending = [...pending].sort((a, b) => {
    const aOverdue = a.dueDate && new Date(a.dueDate) < today ? -1 : 0;
    const bOverdue = b.dueDate && new Date(b.dueDate) < today ? -1 : 0;
    if (aOverdue !== bOverdue) return aOverdue - bOverdue;
    return (priorityOrder[a.priority ?? ''] ?? 3) - (priorityOrder[b.priority ?? ''] ?? 3);
  });

  return (
    <ScrollView style={[styles.container, { backgroundColor: presetValues.bg }]} keyboardShouldPersistTaps="handled">
      <View style={[styles.header, { backgroundColor: accentColor }]}>
        <Text style={[styles.headerTitle, { fontSize: fontSizes.heading, color: '#fff' }]}>✓ Tasks</Text>
        <Text style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.9)' }]}>{tasks.filter((t) => !t.done).length} pending</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: accentColor }]} onPress={() => setShowForm(!showForm)}>
          <Ionicons name={showForm ? 'close' : 'add'} size={24} color="#fff" />
          <Text style={[styles.addButtonText, { fontSize: fontSizes.base + 1 }]}>{showForm ? 'Cancel' : 'Add Task'}</Text>
        </TouchableOpacity>

        {showForm && (
          <View style={[styles.form, { backgroundColor: presetValues.cardBg, borderColor: accentColor, borderWidth: 1.5 }]}>
            <TextInput style={[styles.input, { backgroundColor: presetValues.bgSecondary, color: presetValues.text, borderColor: presetValues.borderColor, fontSize: fontSizes.base }]}
              placeholder="Task title *" placeholderTextColor={presetValues.textSecondary} value={title} onChangeText={setTitle} autoFocus />
            <TextInput style={[styles.input, { backgroundColor: presetValues.bgSecondary, color: presetValues.text, borderColor: presetValues.borderColor, fontSize: fontSizes.base }]}
              placeholder="Subject (optional)" placeholderTextColor={presetValues.textSecondary} value={subject} onChangeText={setSubject} />

            {/* Priority */}
            <Text style={[styles.fieldLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>Priority</Text>
            <View style={styles.chipsRow}>
              {PRIORITY_OPTIONS.map((p) => (
                <TouchableOpacity key={p} style={[styles.chip, { borderColor: PRIORITY_CONFIG[p].color, backgroundColor: priority === p ? PRIORITY_CONFIG[p].color : presetValues.bgSecondary }]} onPress={() => setPriority(priority === p ? '' : p)}>
                  <Text style={[styles.chipText, { color: priority === p ? '#fff' : PRIORITY_CONFIG[p].color, fontSize: fontSizes.base - 2 }]}>{PRIORITY_CONFIG[p].label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Due date */}
            <Text style={[styles.fieldLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2, marginTop: 10 }]}>Due Date</Text>
            <View style={styles.chipsRow}>
              {DUE_DATE_CHIPS.map((label, i) => (
                <TouchableOpacity key={label} style={[styles.chip, { borderColor: accentColor, backgroundColor: dueDateChoice === i ? accentColor : presetValues.bgSecondary }]} onPress={() => setDueDateChoice(i)}>
                  <Text style={[styles.chipText, { color: dueDateChoice === i ? '#fff' : presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {dueDateChoice === 4 && (
              <TextInput style={[styles.input, { backgroundColor: presetValues.bgSecondary, color: presetValues.text, borderColor: accentColor, fontSize: fontSizes.base, marginTop: 8 }]}
                placeholder="MM/DD/YYYY" placeholderTextColor={presetValues.textSecondary} value={customDueDate} onChangeText={setCustomDueDate} keyboardType="numbers-and-punctuation" />
            )}

            {/* Goal link */}
            {goals.length > 0 && (
              <>
                <Text style={[styles.fieldLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2, marginTop: 10 }]}>Link to Goal (optional)</Text>
                <TouchableOpacity style={[styles.goalPickerBtn, { backgroundColor: presetValues.bgSecondary, borderColor: linkedGoalId ? accentColor : presetValues.borderColor }]} onPress={() => setShowGoalPicker((v) => !v)}>
                  <Text style={[styles.chipText, { color: linkedGoalId ? accentColor : presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>
                    {linkedGoalId ? `🎯 ${goals.find((g) => g.id === linkedGoalId)?.title}` : 'Select a goal...'}
                  </Text>
                  <Ionicons name={showGoalPicker ? 'chevron-up' : 'chevron-down'} size={16} color={presetValues.textSecondary} />
                </TouchableOpacity>
                {showGoalPicker && goals.map((g) => (
                  <TouchableOpacity key={g.id} style={[styles.goalOption, { backgroundColor: linkedGoalId === g.id ? accentColor + '20' : presetValues.bgSecondary, borderColor: linkedGoalId === g.id ? accentColor : presetValues.borderColor }]}
                    onPress={() => { setLinkedGoalId(linkedGoalId === g.id ? null : g.id); setShowGoalPicker(false); }}>
                    <Text style={[styles.chipText, { color: presetValues.text, fontSize: fontSizes.base - 1 }]}>{g.title}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            <TouchableOpacity style={[styles.saveButton, { backgroundColor: accentColor, marginTop: 14 }]} onPress={addTask}>
              <Text style={[styles.saveButtonText, { fontSize: fontSizes.base + 1 }]}>Save Task</Text>
            </TouchableOpacity>
          </View>
        )}

        {dueToday.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: '#F59E0B', fontSize: fontSizes.base - 1 }]}>DUE TODAY ({dueToday.length})</Text>
            {dueToday.map((task) => (
              <TaskItem key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete}
                accentColor={accentColor} presetValues={presetValues} fontSizes={fontSizes} goalTitle={goalTitle(task.goalId)} />
            ))}
          </>
        )}

        {sortedPending.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1, marginTop: dueToday.length > 0 ? 16 : 0 }]}>PENDING ({sortedPending.length})</Text>
            {sortedPending.map((task) => (
              <TaskItem key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete}
                accentColor={accentColor} presetValues={presetValues} fontSizes={fontSizes} goalTitle={goalTitle(task.goalId)} />
            ))}
          </>
        )}

        {done.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1, marginTop: 20 }]}>COMPLETED ({done.length})</Text>
            {done.map((task) => (
              <TaskItem key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete}
                accentColor={accentColor} presetValues={presetValues} fontSizes={fontSizes} goalTitle={goalTitle(task.goalId)} />
            ))}
          </>
        )}

        {tasks.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyIcon, { fontSize: fontSizes.heading + 20 }]}>📝</Text>
            <Text style={[styles.emptyText, { color: presetValues.textSecondary, fontSize: fontSizes.base }]}>No tasks yet. Create one to get started!</Text>
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
  addButton: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 16, marginTop: 16, justifyContent: 'center' },
  addButtonText: { color: '#fff', fontWeight: '600', marginLeft: 8 },
  form: { borderRadius: 12, padding: 16, marginBottom: 16 },
  input: { borderRadius: 8, padding: 12, marginBottom: 10, borderWidth: 1 },
  fieldLabel: { fontWeight: '600', marginBottom: 6 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1.5 },
  chipText: { fontWeight: '600' },
  goalPickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 8, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6 },
  goalOption: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 4 },
  saveButton: { padding: 12, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: '600' },
  sectionTitle: { fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  taskCard: { borderRadius: 10, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', borderLeftWidth: 4, borderBottomWidth: 0.5 },
  taskLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1 },
  taskTitle: { fontWeight: '500' },
  taskMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 3 },
  taskSubject: { fontWeight: '500' },
  priorityDot: { fontWeight: '600' },
  goalBadge: { fontWeight: '600', borderWidth: 1, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  dueTag: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, marginTop: 4, alignSelf: 'flex-start' },
  dueTagText: { fontWeight: '600' },
  emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 20 },
  emptyIcon: { marginBottom: 16 },
  emptyText: { fontWeight: '500', textAlign: 'center' },
});
