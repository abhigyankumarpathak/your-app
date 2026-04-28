import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const GRADES = ['6th', '7th', '8th', '9th', '10th', '11th', '12th', 'College'];
const SUBJECTS = ['Math', 'Science', 'English', 'History', 'CS/Coding', 'Art', 'Music', 'Languages', 'PE/Sports', 'Other'];
const FOCUS_AREAS = [
  { icon: '📚', label: 'Academic Excellence' },
  { icon: '🏆', label: 'Competitions & Awards' },
  { icon: '❤️', label: 'Health & Wellness' },
  { icon: '⏰', label: 'Time Management' },
  { icon: '🎯', label: 'Personal Growth' },
  { icon: '🤝', label: 'Extracurriculars' },
];

interface UserProfile {
  name: string;
  grade: string;
  school: string;
  subjects: string[];
  focusAreas: string[];
  studyGoalHours: string;
}

interface Props {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: Props) {
  const dimensions = useWindowDimensions();
  const [step, setStep] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    grade: '',
    school: '',
    subjects: [],
    focusAreas: [],
    studyGoalHours: '2',
  });

  // Responsive values — cap scale at 1.0 so fonts never grow beyond base on large iPhones
  const responsiveFontSize = (baseSize: number) => {
    const scale = Math.min(dimensions.width / 390, dimensions.height / 844, 1.0);
    return Math.round(baseSize * scale);
  };

  const responsiveSpacing = (baseSpacing: number) => {
    const scale = Math.min(dimensions.width / 390, dimensions.height / 844, 1.0);
    return Math.round(baseSpacing * scale);
  };

  // Compute styles dynamically
  const dynamicStyles = StyleSheet.create({
    progressBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingTop: responsiveSpacing(40),
      paddingBottom: responsiveSpacing(12),
    },
    bigEmoji: {
      fontSize: responsiveFontSize(40),
    },
    stepTitle: {
      fontSize: responsiveFontSize(20),
      fontWeight: '800',
      color: '#111827',
      marginBottom: responsiveSpacing(6),
      letterSpacing: -0.5,
    },
    stepSubtitle: {
      fontSize: responsiveFontSize(13),
      color: '#6B7280',
      marginBottom: responsiveSpacing(20),
      fontWeight: '500',
    },
    inputLabel: {
      fontSize: responsiveFontSize(12),
      fontWeight: '600',
      color: '#374151',
      marginBottom: responsiveSpacing(6),
    },
    textInput: {
      backgroundColor: '#fff',
      borderWidth: 1.5,
      borderColor: '#E5E7EB',
      borderRadius: 12,
      padding: responsiveSpacing(12),
      fontSize: responsiveFontSize(14),
      color: '#111827',
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
    },
    welcomeText: {
      fontSize: responsiveFontSize(12),
      color: '#6366F1',
      fontWeight: '600',
      marginTop: responsiveSpacing(10),
      textAlign: 'center',
    },
    chip: {
      paddingHorizontal: responsiveSpacing(14),
      paddingVertical: responsiveSpacing(6),
      borderRadius: 20,
      backgroundColor: '#fff',
      borderWidth: 1.5,
      borderColor: '#E5E7EB',
    },
    chipText: {
      fontSize: responsiveFontSize(12),
      fontWeight: '600',
      color: '#374151',
    },
    hintText: {
      fontSize: responsiveFontSize(11),
      color: '#9CA3AF',
      marginTop: responsiveSpacing(6),
      fontWeight: '500',
    },
    focusCard: {
      width: (dimensions.width - responsiveSpacing(56) - 10) / 2,
      backgroundColor: '#fff',
      borderWidth: 1.5,
      borderColor: '#E5E7EB',
      borderRadius: 14,
      padding: responsiveSpacing(12),
      alignItems: 'flex-start',
    },
    focusIcon: {
      fontSize: responsiveFontSize(22),
      marginBottom: responsiveSpacing(6),
    },
    focusLabel: {
      fontSize: responsiveFontSize(11),
      fontWeight: '600',
      color: '#374151',
    },
    hoursBtn: {
      paddingHorizontal: responsiveSpacing(16),
      paddingVertical: responsiveSpacing(8),
      borderRadius: 20,
      backgroundColor: '#fff',
      borderWidth: 1.5,
      borderColor: '#E5E7EB',
    },
    hoursText: {
      fontSize: responsiveFontSize(13),
      fontWeight: '600',
      color: '#374151',
    },
    summaryBox: {
      backgroundColor: '#fff',
      borderRadius: 14,
      padding: responsiveSpacing(14),
      borderWidth: 1,
      borderColor: '#E5E7EB',
      gap: responsiveSpacing(6),
    },
    summaryTitle: {
      fontSize: responsiveFontSize(12),
      fontWeight: '700',
      color: '#111827',
      marginBottom: responsiveSpacing(2),
    },
    summaryLine: {
      fontSize: responsiveFontSize(12),
      color: '#4B5563',
      fontWeight: '500',
    },
    backBtnText: {
      fontSize: responsiveFontSize(14),
      fontWeight: '600',
      color: '#6B7280',
    },
    nextBtnText: {
      fontSize: responsiveFontSize(14),
      fontWeight: '700',
      color: '#fff',
    },
    finishBtnText: {
      fontSize: responsiveFontSize(14),
      fontWeight: '800',
      color: '#fff',
    },
  });

  const STEPS = [
    { title: "Hey there! 👋", subtitle: "Let's set up your Focus journey" },
    { title: "About You", subtitle: "Tell us a bit about your school life" },
    { title: "Your Subjects", subtitle: "What do you study? Pick all that apply" },
    { title: "Your Goals", subtitle: "What are you focusing on this year?" },
    { title: "Almost there! 🚀", subtitle: "One last thing" },
  ];

  const goNext = () => {
    if (step < STEPS.length - 1) {
      Animated.timing(slideAnim, {
        toValue: -(step + 1) * dimensions.width,
        duration: 300,
        useNativeDriver: true,
      }).start();
      setStep(step + 1);
    }
  };

  const goBack = () => {
    if (step > 0) {
      Animated.timing(slideAnim, {
        toValue: -(step - 1) * dimensions.width,
        duration: 300,
        useNativeDriver: true,
      }).start();
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem('focusUserProfile', JSON.stringify(profile));
      await AsyncStorage.setItem('focusOnboardingComplete', 'true');
      onComplete();
    } catch (e) {
      console.log('Error saving profile', e);
    }
  };

  const toggleSubject = (s: string) => {
    setProfile((p) => ({
      ...p,
      subjects: p.subjects.includes(s) ? p.subjects.filter((x) => x !== s) : [...p.subjects, s],
    }));
  };

  const toggleFocus = (f: string) => {
    setProfile((p) => ({
      ...p,
      focusAreas: p.focusAreas.includes(f) ? p.focusAreas.filter((x) => x !== f) : [...p.focusAreas, f],
    }));
  };

  const canAdvance = () => {
    if (step === 0) return profile.name.trim().length > 0;
    if (step === 1) return profile.grade.length > 0;
    if (step === 2) return profile.subjects.length > 0;
    if (step === 3) return profile.focusAreas.length > 0;
    return true;
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Progress bar */}
      <View style={dynamicStyles.progressBar}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              {
                backgroundColor: i <= step ? '#6366F1' : '#E5E7EB',
                width: i === step ? 28 : 10,
              },
            ]}
          />
        ))}
      </View>

      {/* Slides — overflow:hidden wrapper clips the carousel correctly */}
      <View style={styles.slidesWrapper}>
        <Animated.View
          style={[
            styles.slides,
            {
              width: dimensions.width * STEPS.length,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Step 0 — Name */}
          <View style={[styles.slide, { width: dimensions.width, paddingHorizontal: responsiveSpacing(28), paddingTop: responsiveSpacing(16) }]}>
            <View style={styles.emojiContainer}>
              <Text style={dynamicStyles.bigEmoji}>🎓</Text>
            </View>
            <Text style={dynamicStyles.stepTitle}>{STEPS[0].title}</Text>
            <Text style={dynamicStyles.stepSubtitle}>{STEPS[0].subtitle}</Text>
            <View style={styles.inputGroup}>
              <Text style={dynamicStyles.inputLabel}>What's your name?</Text>
              <TextInput
                style={dynamicStyles.textInput}
                placeholder="Enter your first name"
                placeholderTextColor="#9CA3AF"
                value={profile.name}
                onChangeText={(v) => setProfile((p) => ({ ...p, name: v }))}
                autoFocus
              />
            </View>
            {profile.name.trim().length > 0 && (
              <Text style={dynamicStyles.welcomeText}>
                Welcome, {profile.name}! Let's build something great together. 💪
              </Text>
            )}
          </View>

          {/* Step 1 — Grade & School */}
          <View style={[styles.slide, { width: dimensions.width, paddingHorizontal: responsiveSpacing(28), paddingTop: responsiveSpacing(16) }]}>
            <Text style={dynamicStyles.stepTitle}>{STEPS[1].title}</Text>
            <Text style={dynamicStyles.stepSubtitle}>{STEPS[1].subtitle}</Text>

            <Text style={dynamicStyles.inputLabel}>What grade are you in?</Text>
            <View style={[styles.chipGrid, { gap: responsiveSpacing(10) }]}>
              {GRADES.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    dynamicStyles.chip,
                    profile.grade === g && styles.chipSelected,
                  ]}
                  onPress={() => setProfile((p) => ({ ...p, grade: g }))}
                >
                  <Text style={[dynamicStyles.chipText, profile.grade === g && styles.chipTextSelected]}>
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[dynamicStyles.inputLabel, { marginTop: responsiveSpacing(20) }]}>School name (optional)</Text>
            <TextInput
              style={dynamicStyles.textInput}
              placeholder="Your school"
              placeholderTextColor="#9CA3AF"
              value={profile.school}
              onChangeText={(v) => setProfile((p) => ({ ...p, school: v }))}
            />
          </View>

          {/* Step 2 — Subjects */}
          <View style={[styles.slide, { width: dimensions.width, paddingHorizontal: responsiveSpacing(28), paddingTop: responsiveSpacing(16) }]}>
            <Text style={dynamicStyles.stepTitle}>{STEPS[2].title}</Text>
            <Text style={dynamicStyles.stepSubtitle}>{STEPS[2].subtitle}</Text>
            <View style={[styles.chipGrid, { gap: responsiveSpacing(10) }]}>
              {SUBJECTS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    dynamicStyles.chip,
                    profile.subjects.includes(s) && styles.chipSelected,
                  ]}
                  onPress={() => toggleSubject(s)}
                >
                  <Text style={[dynamicStyles.chipText, profile.subjects.includes(s) && styles.chipTextSelected]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={dynamicStyles.hintText}>
              {profile.subjects.length > 0
                ? `${profile.subjects.length} subject${profile.subjects.length > 1 ? 's' : ''} selected`
                : 'Pick at least one'}
            </Text>
          </View>

          {/* Step 3 — Focus Areas */}
          <View style={[styles.slide, { width: dimensions.width, paddingHorizontal: responsiveSpacing(28), paddingTop: responsiveSpacing(16) }]}>
            <Text style={dynamicStyles.stepTitle}>{STEPS[3].title}</Text>
            <Text style={dynamicStyles.stepSubtitle}>{STEPS[3].subtitle}</Text>
            <View style={[styles.focusGrid, { gap: responsiveSpacing(10) }]}>
              {FOCUS_AREAS.map((f) => (
                <TouchableOpacity
                  key={f.label}
                  style={[
                    dynamicStyles.focusCard,
                    profile.focusAreas.includes(f.label) && styles.focusCardSelected,
                  ]}
                  onPress={() => toggleFocus(f.label)}
                >
                  <Text style={dynamicStyles.focusIcon}>{f.icon}</Text>
                  <Text
                    style={[
                      dynamicStyles.focusLabel,
                      profile.focusAreas.includes(f.label) && styles.focusLabelSelected,
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Step 4 — Study Goal & Done */}
          <View style={[styles.slide, { width: dimensions.width, paddingHorizontal: responsiveSpacing(28), paddingTop: responsiveSpacing(16) }]}>
            <View style={styles.emojiContainer}>
              <Text style={dynamicStyles.bigEmoji}>🚀</Text>
            </View>
            <Text style={dynamicStyles.stepTitle}>You're all set{profile.name ? `, ${profile.name}` : ''}!</Text>
            <Text style={dynamicStyles.stepSubtitle}>How many hours a day do you want to study?</Text>

            <View style={[styles.hoursRow, { gap: responsiveSpacing(10), marginBottom: responsiveSpacing(24) }]}>
              {['1', '1.5', '2', '3', '4', '5+'].map((h) => (
                <TouchableOpacity
                  key={h}
                  style={[
                    dynamicStyles.hoursBtn,
                    profile.studyGoalHours === h && styles.hoursBtnSelected,
                  ]}
                  onPress={() => setProfile((p) => ({ ...p, studyGoalHours: h }))}
                >
                  <Text style={[dynamicStyles.hoursText, profile.studyGoalHours === h && styles.hoursTextSelected]}>
                    {h}h
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={dynamicStyles.summaryBox}>
              <Text style={dynamicStyles.summaryTitle}>📋 Your Profile</Text>
              <Text style={dynamicStyles.summaryLine}>👤 {profile.name}</Text>
              {profile.grade ? <Text style={dynamicStyles.summaryLine}>🎓 Grade {profile.grade}</Text> : null}
              {profile.school ? <Text style={dynamicStyles.summaryLine}>🏫 {profile.school}</Text> : null}
              <Text style={dynamicStyles.summaryLine}>📚 {profile.subjects.join(', ')}</Text>
              <Text style={dynamicStyles.summaryLine}>🎯 {profile.focusAreas.join(', ')}</Text>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Navigation */}
      <View style={[styles.navRow, { paddingHorizontal: responsiveSpacing(24), paddingBottom: responsiveSpacing(40), paddingTop: responsiveSpacing(16) }]}>
        {step > 0 ? (
          <TouchableOpacity style={[styles.backBtn, { paddingVertical: responsiveSpacing(14) }]} onPress={goBack}>
            <Text style={dynamicStyles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {step < STEPS.length - 1 ? (
          <TouchableOpacity
            style={[styles.nextBtn, !canAdvance() && styles.nextBtnDisabled, { paddingVertical: responsiveSpacing(16) }]}
            onPress={canAdvance() ? goNext : undefined}
          >
            <Text style={dynamicStyles.nextBtnText}>Continue →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.finishBtn, { paddingVertical: responsiveSpacing(16) }]} onPress={handleComplete}>
            <Text style={dynamicStyles.finishBtnText}>Start My Journey 🚀</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
  },
  progressDot: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E5E7EB',
  },
  // Clips the sliding panel so only the active slide is visible
  slidesWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  slides: {
    flexDirection: 'row',
    flex: 1,
  },
  slide: {
    flex: 1,
  },
  emojiContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  chipSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  chipTextSelected: {
    color: '#fff',
  },
  focusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  focusCardSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  focusLabelSelected: {
    color: '#6366F1',
  },
  hoursRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  hoursBtnSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  hoursTextSelected: {
    color: '#fff',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  backBtn: {
    flex: 1,
  },
  nextBtn: {
    flex: 2,
    backgroundColor: '#6366F1',
    borderRadius: 14,
    alignItems: 'center',
  },
  nextBtnDisabled: {
    backgroundColor: '#C7D2FE',
  },
  finishBtn: {
    flex: 2,
    backgroundColor: '#6366F1',
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});