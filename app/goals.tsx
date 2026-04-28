import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

type GoalPeriod = 'daily' | 'weekly' | 'monthly' | 'longterm';

interface SmartGoal {
  id: number;
  title: string;
  period: GoalPeriod;
  category: string;
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timeBound: string;
  progress: number;
  completed: boolean;
  createdAt: string;
}

const CATEGORIES = [
  { icon: '📚', label: 'Academic' },
  { icon: '🏆', label: 'Competition' },
  { icon: '❤️', label: 'Wellness' },
  { icon: '💻', label: 'Project' },
  { icon: '🎭', label: 'Extracurricular' },
  { icon: '🌱', label: 'Personal' },
];

const PERIOD_CONFIG: Record<GoalPeriod, { label: string; icon: string; color: string; description: string }> = {
  daily: { label: 'Daily', icon: '☀️', color: '#F59E0B', description: 'Habits and tasks for today' },
  weekly: { label: 'Weekly', icon: '📅', color: '#10B981', description: 'Goals to finish this week' },
  monthly: { label: 'Monthly', icon: '🗓️', color: '#6366F1', description: 'Monthly milestones to hit' },
  longterm: { label: 'Long-term', icon: '🏆', color: '#EC4899', description: 'Big dreams, competitions & projects' },
};

const SMART_FIELDS: { key: keyof SmartGoal; label: string; letter: string; hint: string; color: string }[] = [
  { key: 'specific', label: 'Specific', letter: 'S', hint: 'What exactly do you want to achieve?', color: '#6366F1' },
  { key: 'measurable', label: 'Measurable', letter: 'M', hint: 'How will you track your progress?', color: '#10B981' },
  { key: 'achievable', label: 'Achievable', letter: 'A', hint: 'Is this realistic for you right now?', color: '#F59E0B' },
  { key: 'relevant', label: 'Relevant', letter: 'R', hint: 'Why does this goal matter to you?', color: '#EC4899' },
  { key: 'timeBound', label: 'Time-bound', letter: 'T', hint: "What's your deadline or timeframe?", color: '#EF4444' },
];

const SMART_EXAMPLES: Record<string, string[]> = {
  S: ['Score 90%+ on the AP Calc exam', 'Win or place top 3 at Regional Science Fair', 'Read 10 pages of textbook each day'],
  M: ['Track practice test scores weekly', 'Count problems completed daily', 'Log study hours per subject each week'],
  A: ['Yes — I study 2hrs/day and have 3 months to prepare', 'Realistic after 6 weeks of consistent practice', 'Manageable if I reduce screen time to 1hr/day'],
  R: ['This will strengthen my college application', 'Competing builds my skills and confidence', 'Better grades reduce my stress and make me proud'],
  T: ['By May 15th (AP exam date)', 'Competition is March 8th — 6 weeks away', 'End of this semester (June 3rd)'],
};

const BLANK_DRAFT = {
  title: '', period: 'weekly' as GoalPeriod, category: 'Academic',
  specific: '', measurable: '', achievable: '', relevant: '', timeBound: '',
  progress: 0, completed: false,
};

// ─── Study Hours Goal Card ─────────────────────────────────────────────────────
function StudyHoursGoalCard({ hoursToday, goalHours, accentColor, presetValues, fontSizes }: any) {
  const goal = parseFloat(goalHours) || 0;
  const current = Math.round(hoursToday * 10) / 10;
  const pct = goal > 0 ? Math.min(Math.round((current / goal) * 100), 100) : 0;
  const done = pct >= 100;

  const statusColor = done ? '#10B981' : pct >= 60 ? accentColor : '#F59E0B';

  return (
    <View style={[
      studyCardStyles.card,
      {
        backgroundColor: presetValues.cardBg,
        borderColor: statusColor + '50',
        borderLeftColor: statusColor,
      }
    ]}>
      <View style={studyCardStyles.topRow}>
        <View style={studyCardStyles.titleRow}>
          <Text style={[studyCardStyles.icon, { fontSize: fontSizes.base + 6 }]}>🎯</Text>
          <View>
            <Text style={[studyCardStyles.title, { color: presetValues.text, fontSize: fontSizes.base + 1 }]}>
              Hours Studied Today
            </Text>
            <Text style={[studyCardStyles.sub, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>
              Daily study goal
            </Text>
          </View>
        </View>
        <View style={[studyCardStyles.badge, { backgroundColor: statusColor + '18' }]}>
          <Text style={[studyCardStyles.badgeText, { color: statusColor, fontSize: fontSizes.base - 1 }]}>
            {done ? '✅ Done!' : `${pct}%`}
          </Text>
        </View>
      </View>

      <View style={studyCardStyles.progressArea}>
        <View style={[studyCardStyles.track, { backgroundColor: presetValues.bgSecondary }]}>
          <View style={[studyCardStyles.fill, { width: `${pct}%` as any, backgroundColor: statusColor }]} />
        </View>
        <View style={studyCardStyles.labelRow}>
          <Text style={[studyCardStyles.currentLabel, { color: statusColor, fontSize: fontSizes.heading }]}>
            {current}h
          </Text>
          <Text style={[studyCardStyles.goalLabel, { color: presetValues.textSecondary, fontSize: fontSizes.base }]}>
            / {goal > 0 ? `${goal}h goal` : 'no goal set'}
          </Text>
        </View>
      </View>

      {!done && goal > 0 && (
        <Text style={[studyCardStyles.remaining, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>
          {Math.max(0, Math.round((goal - current) * 10) / 10)}h remaining — keep going! 💪
        </Text>
      )}
      {done && (
        <Text style={[studyCardStyles.remaining, { color: '#10B981', fontSize: fontSizes.base - 1, fontWeight: '600' }]}>
          Goal crushed! Amazing work today 🚀
        </Text>
      )}
    </View>
  );
}

const studyCardStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { marginRight: 2 },
  title: { fontWeight: '700' },
  sub: { fontWeight: '500', marginTop: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontWeight: '700' },
  progressArea: { marginBottom: 8 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 10 },
  fill: { height: '100%', borderRadius: 4 },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  currentLabel: { fontWeight: '800' },
  goalLabel: { fontWeight: '500' },
  remaining: { fontWeight: '500' },
});

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Goals() {
  const { accentColor, presetValues, fontSizes } = useTheme();
  const [goals, setGoals] = useState<SmartGoal[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<GoalPeriod>('daily');
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<SmartGoal | null>(null);
  const [draft, setDraft] = useState({ ...BLANK_DRAFT });
  const [smartStep, setSmartStep] = useState(0);
  const [userName, setUserName] = useState('');
  const [studyGoalHours, setStudyGoalHours] = useState('2');
  const [todayStudyHours, setTodayStudyHours] = useState(0);

  useEffect(() => { loadGoals(); loadUser(); }, []);

  useFocusEffect(
    useCallback(() => {
      loadTodayStudy();
      AsyncStorage.getItem('focusTasks').then((d) => { if (d) setTasks(JSON.parse(d)); });
    }, [])
  );

  const loadUser = async () => {
    try {
      const p = await AsyncStorage.getItem('focusUserProfile');
      if (p) {
        const parsed = JSON.parse(p);
        setUserName(parsed.name || '');
        setStudyGoalHours(parsed.studyGoalHours || '2');
      }
    } catch (_) {}
  };

  const loadTodayStudy = async () => {
    try {
      const data = await AsyncStorage.getItem('focusSessions');
      if (data) {
        const today = new Date().toLocaleDateString();
        const sessions = JSON.parse(data);
        const todayTotal = sessions
          .filter((s: any) => s.date === today)
          .reduce((sum: number, s: any) => sum + s.duration, 0);
        setTodayStudyHours(Math.round((todayTotal / 3600) * 100) / 100);
      }
    } catch (_) {}
  };

  const loadGoals = async () => {
    try {
      const data = await AsyncStorage.getItem('focusGoals');
      if (data) setGoals(JSON.parse(data));
    } catch (_) {}
  };

  const saveGoals = async (updated: SmartGoal[]) => {
    try {
      await AsyncStorage.setItem('focusGoals', JSON.stringify(updated));
      setGoals(updated);
    } catch (_) {}
  };

  const openCreate = (period: GoalPeriod) => {
    setDraft({ ...BLANK_DRAFT, period });
    setSmartStep(0);
    setShowCreate(true);
  };

  const saveGoal = () => {
    if (!draft.title.trim() || !draft.specific.trim()) {
      Alert.alert('Almost there!', 'Please fill in the title and Specific (S) field at minimum.');
      return;
    }
    const g: SmartGoal = { ...draft, id: Date.now(), createdAt: new Date().toLocaleDateString() };
    saveGoals([g, ...goals]);
    setShowCreate(false);
  };

  const toggleComplete = (id: number) =>
    saveGoals(goals.map((g) => (g.id === id ? { ...g, completed: !g.completed } : g)));

  const updateProgress = (id: number, progress: number) =>
    saveGoals(goals.map((g) => (g.id === id ? { ...g, progress } : g)));

  const deleteGoal = (id: number) =>
    Alert.alert('Delete Goal', 'Remove this goal?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => saveGoals(goals.filter((g) => g.id !== id)) },
    ]);

  const tabGoals = goals.filter((g) => g.period === activeTab);
  const pending = tabGoals.filter((g) => !g.completed);
  const done = tabGoals.filter((g) => g.completed);
  const cfg = PERIOD_CONFIG[activeTab];

  return (
    <View style={[styles.root, { backgroundColor: presetValues.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: accentColor }]}>
        <Text style={[styles.headerTitle, { fontSize: fontSizes.heading, color: '#fff' }]}>
          🎯 Goals
        </Text>
        <Text style={[styles.headerSub, { color: 'rgba(255,255,255,0.88)' }]}>
          {userName ? `${userName}'s SMART goals` : 'SMART goal tracker'}
        </Text>
        <View style={styles.statsRow}>
          {(Object.keys(PERIOD_CONFIG) as GoalPeriod[]).map((p) => {
            const smartTotal = goals.filter((g) => g.period === p).length;
            const smartCompleted = goals.filter((g) => g.period === p && g.completed).length;
            // Daily tab: include the built-in study hours goal in the count
            const extraTotal = p === 'daily' ? 1 : 0;
            const goalHoursNum = parseFloat(studyGoalHours) || 0;
            const extraCompleted = p === 'daily' && goalHoursNum > 0 && todayStudyHours >= goalHoursNum ? 1 : 0;
            const total = smartTotal + extraTotal;
            const completed = smartCompleted + extraCompleted;
            return (
              <View key={p} style={styles.statChip}>
                <Text style={styles.statNum}>{completed}/{total} goals achieved</Text>
                <Text style={styles.statLabel}>{PERIOD_CONFIG[p].label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Period Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={styles.tabsContent}>
        {(Object.entries(PERIOD_CONFIG) as [GoalPeriod, typeof cfg][]).map(([key, c]) => {
          const count = goals.filter((g) => g.period === key && !g.completed).length;
          const active = activeTab === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.tab, { backgroundColor: active ? c.color : presetValues.cardBg, borderColor: active ? c.color : presetValues.borderColor }]}
              onPress={() => setActiveTab(key)}
            >
              <Text style={styles.tabIcon}>{c.icon}</Text>
              <Text style={[styles.tabLabel, { color: active ? '#fff' : presetValues.text }]}>{c.label}</Text>
              {count > 0 && (
                <View style={[styles.badge, { backgroundColor: active ? 'rgba(255,255,255,0.3)' : c.color }]}>
                  <Text style={styles.badgeText}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List */}
      <ScrollView style={styles.list} contentContainerStyle={styles.listInner}>

        {/* Study Hours Goal — always shown on Daily tab */}
        {activeTab === 'daily' && (
          <StudyHoursGoalCard
            hoursToday={todayStudyHours}
            goalHours={studyGoalHours}
            accentColor={accentColor}
            presetValues={presetValues}
            fontSizes={fontSizes}
          />
        )}

        <View style={[styles.banner, { backgroundColor: presetValues.cardBg, borderColor: presetValues.borderColor }]}>
          <Text style={[styles.bannerText, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>
            {cfg.icon}  {cfg.description} — built with the{' '}
            <Text style={{ color: cfg.color, fontWeight: '700' }}>SMART</Text> framework
          </Text>
        </View>

        <TouchableOpacity style={[styles.addBtn, { backgroundColor: cfg.color }]} onPress={() => openCreate(activeTab)}>
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={[styles.addBtnText, { fontSize: fontSizes.base }]}>Add {cfg.label} Goal</Text>
        </TouchableOpacity>

        {pending.length > 0 && (
          <>
            <Text style={[styles.sectionHead, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>
              IN PROGRESS ({pending.length})
            </Text>
            {pending.map((g) => (
              <GoalCard key={g.id} goal={g} color={cfg.color} presetValues={presetValues} fontSizes={fontSizes}
                onToggle={() => toggleComplete(g.id)} onDelete={() => deleteGoal(g.id)}
                onProgress={(v: number) => updateProgress(g.id, v)} onPress={() => setShowDetail(g)}
                linkedTasks={tasks.filter((t: any) => t.goalId === g.id)} />
            ))}
          </>
        )}

        {done.length > 0 && (
          <>
            <Text style={[styles.sectionHead, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1, marginTop: 20 }]}>
              COMPLETED 🎉 ({done.length})
            </Text>
            {done.map((g) => (
              <GoalCard key={g.id} goal={g} color={cfg.color} presetValues={presetValues} fontSizes={fontSizes}
                onToggle={() => toggleComplete(g.id)} onDelete={() => deleteGoal(g.id)}
                onProgress={(v: number) => updateProgress(g.id, v)} onPress={() => setShowDetail(g)}
                linkedTasks={tasks.filter((t: any) => t.goalId === g.id)} dimmed />
            ))}
          </>
        )}

        {tabGoals.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{cfg.icon}</Text>
            <Text style={[styles.emptyTitle, { color: presetValues.text, fontSize: fontSizes.title }]}>No {cfg.label.toLowerCase()} goals yet</Text>
            <Text style={[styles.emptyText, { color: presetValues.textSecondary, fontSize: fontSizes.base }]}>
              Tap above to set your first SMART goal
            </Text>
            {activeTab === 'longterm' && (
              <Text style={[styles.emptyHint, { color: cfg.color }]}>
                💡 Perfect for competitions, projects & big ambitions!
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <CreateModal
          draft={draft} setDraft={setDraft}
          step={smartStep} setStep={setSmartStep}
          color={PERIOD_CONFIG[draft.period].color}
          presetValues={presetValues} fontSizes={fontSizes}
          onSave={saveGoal} onClose={() => setShowCreate(false)}
        />
      </Modal>

      {/* Detail Modal */}
      <Modal visible={!!showDetail} animationType="slide" presentationStyle="pageSheet">
        {showDetail && (
          <DetailModal goal={showDetail} color={PERIOD_CONFIG[showDetail.period].color}
            presetValues={presetValues} fontSizes={fontSizes} onClose={() => setShowDetail(null)}
            linkedTasks={tasks.filter((t: any) => t.goalId === showDetail.id)} />
        )}
      </Modal>
    </View>
  );
}

// ─── Goal Card ────────────────────────────────────────────────────────────────
function GoalCard({ goal, color, presetValues, fontSizes, onToggle, onDelete, onProgress, onPress, dimmed, linkedTasks = [] }: any) {
  const cat = CATEGORIES.find((c) => c.label === goal.category);
  const smartFilled = SMART_FIELDS.filter((f) => (goal as any)[f.key]?.trim()).length;
  const doneTaskCount = linkedTasks.filter((t: any) => t.done).length;
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: presetValues.cardBg, borderColor: presetValues.borderColor, borderLeftColor: goal.completed ? presetValues.textSecondary : color, opacity: dimmed ? 0.6 : 1 }]}
      onPress={onPress}
    >
      <View style={styles.cardRow}>
        <TouchableOpacity onPress={onToggle}>
          <Ionicons name={goal.completed ? 'checkmark-circle' : 'ellipse-outline'} size={26}
            color={goal.completed ? presetValues.textSecondary : color} />
        </TouchableOpacity>
        <View style={styles.cardBody}>
          <Text style={[styles.cardTitle, { color: presetValues.text, fontSize: fontSizes.base + 1, textDecorationLine: goal.completed ? 'line-through' : 'none' }]}>
            {cat?.icon} {goal.title}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Text style={[styles.cardMeta, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>
              {goal.category} · {goal.timeBound || 'No deadline'} · SMART {smartFilled}/5
            </Text>
            {linkedTasks.length > 0 && (
              <View style={[styles.taskBadge, { backgroundColor: color + '18', borderColor: color }]}>
                <Text style={[styles.taskBadgeText, { color, fontSize: fontSizes.base - 2 }]}>
                  🔗 {doneTaskCount}/{linkedTasks.length} tasks
                </Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity onPress={onDelete}>
          <Ionicons name="trash-outline" size={18} color={presetValues.textSecondary} />
        </TouchableOpacity>
      </View>
      {!goal.completed && (
        <View style={styles.progressArea}>
          <View style={[styles.progTrack, { backgroundColor: presetValues.bgSecondary }]}>
            <View style={[styles.progFill, { width: `${goal.progress}%` as any, backgroundColor: color }]} />
          </View>
          <View style={styles.progBtns}>
            <Text style={[styles.progPct, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>{goal.progress}%</Text>
            {[25, 50, 75, 100].map((v) => (
              <TouchableOpacity key={v} onPress={() => onProgress(v)}
                style={[styles.progBtn, { borderColor: color, backgroundColor: goal.progress >= v ? color : 'transparent' }]}>
                <Text style={[styles.progBtnTxt, { color: goal.progress >= v ? '#fff' : color }]}>{v}%</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────
function CreateModal({ draft, setDraft, step, setStep, color, presetValues, fontSizes, onSave, onClose }: any) {
  const totalSteps = SMART_FIELDS.length + 1;

  return (
    <View style={[styles.modal, { backgroundColor: presetValues.bg }]}>
      <View style={[styles.modalTop, { borderBottomColor: presetValues.borderColor }]}>
        <TouchableOpacity onPress={onClose}>
          <Text style={[styles.modalCancel, { color: presetValues.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.modalHeading, { color: presetValues.text, fontSize: fontSizes.title }]}>New SMART Goal</Text>
        <TouchableOpacity onPress={onSave}>
          <Text style={[styles.modalSaveBtn, { color: color }]}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Step indicator */}
      <View style={styles.dots}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: i <= step ? color : presetValues.bgSecondary, width: i === step ? 22 : 10 }]} />
        ))}
      </View>

      <ScrollView style={styles.modalScroll} contentContainerStyle={{ paddingBottom: 40 }}>
        {step === 0 ? (
          <View>
            <Text style={[styles.stepTitle, { color: presetValues.text, fontSize: fontSizes.title }]}>📝 Goal Basics</Text>
            <Text style={[styles.fieldLbl, { color: presetValues.text }]}>Goal Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: presetValues.bgSecondary, color: presetValues.text, borderColor: color }]}
              placeholder="e.g. Win state science olympiad"
              placeholderTextColor={presetValues.textSecondary}
              value={draft.title}
              onChangeText={(v: string) => setDraft((d: any) => ({ ...d, title: v }))}
              autoFocus
            />

            <Text style={[styles.fieldLbl, { color: presetValues.text }]}>Category</Text>
            <View style={styles.catRow}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.label}
                  style={[styles.catChip, { borderColor: presetValues.borderColor, backgroundColor: presetValues.cardBg },
                    draft.category === c.label && { borderColor: color, backgroundColor: color + '18' }]}
                  onPress={() => setDraft((d: any) => ({ ...d, category: c.label }))}>
                  <Text style={styles.catChipIcon}>{c.icon}</Text>
                  <Text style={[styles.catChipLbl, { color: draft.category === c.label ? color : presetValues.textSecondary }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.smartPreview, { backgroundColor: presetValues.cardBg, borderColor: presetValues.borderColor }]}>
              <Text style={[styles.smartPreviewTitle, { color: presetValues.text, fontSize: fontSizes.base }]}>🧠 Next: SMART Criteria</Text>
              <Text style={[styles.smartPreviewSub, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>
                We'll guide you through each letter to make your goal powerful and achievable.
              </Text>
              <View style={styles.smartPills}>
                {SMART_FIELDS.map((f) => (
                  <View key={f.letter} style={[styles.smartPill, { backgroundColor: f.color + '1A' }]}>
                    <Text style={[styles.smartPillTxt, { color: f.color }]}>{f.letter} — {f.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : (() => {
          const f = SMART_FIELDS[step - 1];
          return (
            <View>
              <View style={[styles.smartCircle, { backgroundColor: f.color }]}>
                <Text style={styles.smartCircleLetter}>{f.letter}</Text>
              </View>
              <Text style={[styles.smartLetter, { color: presetValues.text, fontSize: fontSizes.heading }]}>{f.label}</Text>
              <Text style={[styles.smartHint, { color: presetValues.textSecondary, fontSize: fontSizes.base }]}>{f.hint}</Text>
              <TextInput
                style={[styles.input, styles.inputTall, { backgroundColor: presetValues.bgSecondary, color: presetValues.text, borderColor: f.color }]}
                placeholder={`Your ${f.label.toLowerCase()} answer...`}
                placeholderTextColor={presetValues.textSecondary}
                value={(draft as any)[f.key]}
                onChangeText={(v: string) => setDraft((d: any) => ({ ...d, [f.key]: v }))}
                multiline
                autoFocus
              />
              <View style={[styles.exBox, { backgroundColor: presetValues.cardBg, borderColor: presetValues.borderColor }]}>
                <Text style={[styles.exTitle, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>💡 Tap an example to use it</Text>
                {SMART_EXAMPLES[f.letter]?.map((ex, i) => (
                  <TouchableOpacity key={i} onPress={() => setDraft((d: any) => ({ ...d, [f.key]: ex }))}>
                    <Text style={[styles.exItem, { color: f.color, fontSize: fontSizes.base - 1 }]}>→ {ex}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })()}
      </ScrollView>

      <View style={[styles.navBar, { borderTopColor: presetValues.borderColor }]}>
        {step > 0
          ? <TouchableOpacity style={styles.navBack} onPress={() => setStep((s: number) => s - 1)}>
              <Text style={[styles.navBackTxt, { color: presetValues.textSecondary }]}>← Back</Text>
            </TouchableOpacity>
          : <View style={{ flex: 1 }} />}
        {step < totalSteps - 1
          ? <TouchableOpacity style={[styles.navNext, { backgroundColor: color }]} onPress={() => setStep((s: number) => s + 1)}>
              <Text style={styles.navNextTxt}>Next →</Text>
            </TouchableOpacity>
          : <TouchableOpacity style={[styles.navNext, { backgroundColor: color }]} onPress={onSave}>
              <Text style={styles.navNextTxt}>Save Goal ✓</Text>
            </TouchableOpacity>}
      </View>
    </View>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ goal, color, presetValues, fontSizes, onClose, linkedTasks = [] }: any) {
  const cat = CATEGORIES.find((c) => c.label === goal.category);
  return (
    <View style={[styles.modal, { backgroundColor: presetValues.bg }]}>
      <View style={[styles.modalTop, { borderBottomColor: presetValues.borderColor }]}>
        <TouchableOpacity onPress={onClose}>
          <Text style={[styles.modalCancel, { color: presetValues.textSecondary }]}>Close</Text>
        </TouchableOpacity>
        <Text style={[styles.modalHeading, { color: presetValues.text, fontSize: fontSizes.title }]}>Goal Details</Text>
        <View style={{ width: 50 }} />
      </View>
      <ScrollView style={styles.modalScroll}>
        <View style={[styles.detailBanner, { backgroundColor: color + '14', borderColor: color + '40' }]}>
          <Text style={[styles.detailCat, { color: color, fontSize: fontSizes.base - 1 }]}>
            {cat?.icon} {goal.category} · {PERIOD_CONFIG[goal.period as GoalPeriod].label}
          </Text>
          <Text style={[styles.detailTitle, { color: presetValues.text, fontSize: fontSizes.heading }]}>{goal.title}</Text>
          <Text style={[styles.detailDate, { color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>Created {goal.createdAt}</Text>
        </View>

        {SMART_FIELDS.map((f) => {
          const val = (goal as any)[f.key];
          if (!val) return null;
          return (
            <View key={f.key} style={[styles.smartRow, { backgroundColor: presetValues.cardBg, borderColor: f.color + '35' }]}>
              <View style={[styles.smartDot, { backgroundColor: f.color }]}>
                <Text style={styles.smartDotLetter}>{f.letter}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.smartRowLabel, { color: f.color, fontSize: fontSizes.base - 1 }]}>{f.label}</Text>
                <Text style={[styles.smartRowVal, { color: presetValues.text, fontSize: fontSizes.base }]}>{val}</Text>
              </View>
            </View>
          );
        })}

        <View style={[styles.progBox, { backgroundColor: presetValues.cardBg, borderColor: presetValues.borderColor }]}>
          <Text style={[styles.progBoxTitle, { color: presetValues.text, fontSize: fontSizes.base }]}>📊 Progress: {goal.progress}%</Text>
          <View style={[styles.progTrack, { backgroundColor: presetValues.bgSecondary }]}>
            <View style={[styles.progFill, { width: `${goal.progress}%` as any, backgroundColor: color }]} />
          </View>
          <Text style={[styles.progStatus, { color: goal.completed ? '#10B981' : presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>
            {goal.completed ? '✅ Completed!' : '⏳ In Progress'}
          </Text>
        </View>

        {linkedTasks.length > 0 && (
          <View style={[styles.progBox, { backgroundColor: presetValues.cardBg, borderColor: presetValues.borderColor }]}>
            <Text style={[styles.progBoxTitle, { color: presetValues.text, fontSize: fontSizes.base }]}>
              🔗 Linked Tasks ({linkedTasks.filter((t: any) => t.done).length}/{linkedTasks.length} done)
            </Text>
            {linkedTasks.map((t: any) => (
              <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <Ionicons name={t.done ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={t.done ? '#10B981' : presetValues.textSecondary} />
                <Text style={[{ color: t.done ? presetValues.textSecondary : presetValues.text, fontSize: fontSizes.base - 1, fontWeight: '500', textDecorationLine: t.done ? 'line-through' : 'none', flex: 1 }]}>
                  {t.title}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingTop: 40, paddingBottom: 16, paddingHorizontal: 20 },
  headerTitle: { fontWeight: 'bold', marginBottom: 2 },
  headerSub: { fontSize: 14, fontWeight: '500', marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 20 },
  statChip: { alignItems: 'center' },
  statNum: { color: '#fff', fontSize: 13, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.72)', fontSize: 11, fontWeight: '600' },
  tabs: { flexGrow: 0 },
  tabsContent: { paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, gap: 6 },
  tabIcon: { fontSize: 14 },
  tabLabel: { fontSize: 13, fontWeight: '600' },
  badge: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  list: { flex: 1 },
  listInner: { paddingHorizontal: 16, paddingBottom: 40 },
  banner: { borderRadius: 10, padding: 10, marginTop: 4, marginBottom: 12, borderWidth: 1 },
  bannerText: { fontWeight: '500' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, marginBottom: 16, gap: 8 },
  addBtnText: { color: '#fff', fontWeight: '700' },
  sectionHead: { fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderLeftWidth: 4 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardBody: { flex: 1 },
  cardTitle: { fontWeight: '600', marginBottom: 4 },
  cardMeta: { fontWeight: '500' },
  progressArea: { marginTop: 12 },
  progTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progFill: { height: '100%', borderRadius: 3 },
  progBtns: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  progPct: { fontWeight: '600', marginRight: 4 },
  progBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  progBtnTxt: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, gap: 10 },
  emptyIcon: { fontSize: 60 },
  emptyTitle: { fontWeight: '700', textAlign: 'center' },
  emptyText: { textAlign: 'center', fontWeight: '500' },
  emptyHint: { textAlign: 'center', fontWeight: '600', marginTop: 8, fontSize: 13 },

  modal: { flex: 1 },
  modalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, borderBottomWidth: 1 },
  modalCancel: { fontSize: 16, fontWeight: '500' },
  modalHeading: { fontWeight: '700' },
  modalSaveBtn: { fontSize: 16, fontWeight: '700' },
  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  dot: { height: 10, borderRadius: 5 },
  modalScroll: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  navBar: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 40, borderTopWidth: 1, gap: 12 },
  navBack: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  navBackTxt: { fontSize: 16, fontWeight: '600' },
  navNext: { flex: 2, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  navNextTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },

  stepTitle: { fontWeight: '700', marginBottom: 16 },
  fieldLbl: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: { borderRadius: 12, padding: 14, borderWidth: 1.5, marginBottom: 16, fontSize: 15 },
  inputTall: { minHeight: 100, textAlignVertical: 'top' },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  catChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, gap: 6 },
  catChipIcon: { fontSize: 16 },
  catChipLbl: { fontSize: 13, fontWeight: '600' },
  smartPreview: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 20 },
  smartPreviewTitle: { fontWeight: '700', marginBottom: 6 },
  smartPreviewSub: { fontWeight: '500', lineHeight: 20, marginBottom: 12 },
  smartPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  smartPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  smartPillTxt: { fontSize: 12, fontWeight: '600' },

  smartCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16, alignSelf: 'center' },
  smartCircleLetter: { color: '#fff', fontSize: 32, fontWeight: '800' },
  smartLetter: { fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  smartHint: { textAlign: 'center', fontWeight: '500', marginBottom: 20, lineHeight: 22 },
  exBox: { borderRadius: 12, padding: 14, borderWidth: 1, marginTop: 8, gap: 8 },
  exTitle: { fontWeight: '600', marginBottom: 4 },
  exItem: { fontWeight: '500', lineHeight: 20 },

  detailBanner: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 16, marginTop: 8 },
  detailCat: { fontWeight: '600', marginBottom: 6 },
  detailTitle: { fontWeight: '800', marginBottom: 6 },
  detailDate: { fontWeight: '500' },
  smartRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 10 },
  smartDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  smartDotLetter: { color: '#fff', fontSize: 16, fontWeight: '800' },
  smartRowLabel: { fontWeight: '700', marginBottom: 4 },
  smartRowVal: { fontWeight: '500', lineHeight: 20 },
  progBox: { borderRadius: 14, padding: 16, borderWidth: 1, marginTop: 6, marginBottom: 10, gap: 10 },
  progBoxTitle: { fontWeight: '700' },
  progStatus: { fontWeight: '600' },
  taskBadge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1 },
  taskBadgeText: { fontWeight: '600' },
});