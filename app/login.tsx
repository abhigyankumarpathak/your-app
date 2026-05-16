import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { isSupabaseConfigured } from '../services/supabase';

type Mode = 'signIn' | 'signUp';

export default function Login() {
  const router = useRouter();
  const { accentColor, presetValues, fontSizes } = useTheme();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  };

  const submit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing info', 'Enter both an email and a password.');
      return;
    }
    if (mode === 'signUp' && password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      const result = mode === 'signIn'
        ? await signIn(email, password)
        : await signUp(email, password);

      if (result.error) {
        Alert.alert(mode === 'signIn' ? 'Sign in failed' : 'Sign up failed', result.error);
        return;
      }
      if (mode === 'signUp' && 'needsConfirmation' in result && result.needsConfirmation) {
        Alert.alert(
          'Check your email',
          'We sent a confirmation link to ' + email.trim() + '. Confirm to finish creating your account, then sign in.'
        );
        setMode('signIn');
        setPassword('');
        return;
      }
      goBack();
    } finally {
      setBusy(false);
    }
  };

  const isSignIn = mode === 'signIn';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: presetValues.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.header, { backgroundColor: accentColor }]}>
          <Text style={[styles.headerTitle, { fontSize: fontSizes.heading }]}>
            {isSignIn ? 'Welcome back' : 'Create your account'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isSignIn
              ? 'Sign in to sync your progress across devices.'
              : 'Save your progress so it follows you anywhere.'}
          </Text>
        </View>

        <View style={styles.content}>
          {!isSupabaseConfigured && (
            <View style={[styles.warnBox, { borderColor: '#F59E0B', backgroundColor: '#F59E0B22' }]}>
              <Text style={[styles.warnText, { color: presetValues.text, fontSize: fontSizes.base - 1 }]}>
                ⚠️ Sign-in isn&apos;t configured yet. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (see README) to enable it.
              </Text>
            </View>
          )}

          <View style={[styles.tabs, { backgroundColor: presetValues.bgSecondary }]}>
            {(['signIn', 'signUp'] as Mode[]).map((m) => {
              const active = mode === m;
              return (
                <TouchableOpacity
                  key={m}
                  style={[styles.tab, active && { backgroundColor: accentColor }]}
                  onPress={() => setMode(m)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      { color: active ? '#fff' : presetValues.textSecondary, fontSize: fontSizes.base },
                    ]}
                  >
                    {m === 'signIn' ? 'Sign In' : 'Sign Up'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { color: presetValues.text, fontSize: fontSizes.base }]}>Email</Text>
          <TextInput
            style={[styles.input, {
              backgroundColor: presetValues.cardBg,
              color: presetValues.text,
              borderColor: presetValues.borderColor,
              fontSize: fontSizes.base,
            }]}
            placeholder="you@example.com"
            placeholderTextColor={presetValues.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={[styles.label, { color: presetValues.text, fontSize: fontSizes.base }]}>Password</Text>
          <TextInput
            style={[styles.input, {
              backgroundColor: presetValues.cardBg,
              color: presetValues.text,
              borderColor: presetValues.borderColor,
              fontSize: fontSizes.base,
            }]}
            placeholder={isSignIn ? 'Your password' : 'At least 6 characters'}
            placeholderTextColor={presetValues.textSecondary}
            secureTextEntry
            autoCapitalize="none"
            textContentType={isSignIn ? 'password' : 'newPassword'}
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: accentColor, opacity: busy ? 0.7 : 1 }]}
            onPress={submit}
            disabled={busy}
          >
            {busy
              ? <ActivityIndicator color="#fff" />
              : <Text style={[styles.submitText, { fontSize: fontSizes.base }]}>
                  {isSignIn ? 'Sign In' : 'Create Account'}
                </Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={goBack} style={styles.skip}>
            <Text style={[{ color: presetValues.textSecondary, fontSize: fontSizes.base - 1 }]}>
              Maybe later — keep using this device only
            </Text>
          </TouchableOpacity>

          <Text style={[styles.fineprint, { color: presetValues.textSecondary, fontSize: fontSizes.base - 2 }]}>
            Your existing progress on this device will be uploaded the first time you sign in, so nothing is lost.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  header: {
    paddingTop: 60, paddingBottom: 30, paddingHorizontal: 20,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  headerTitle: { color: '#fff', fontWeight: '800', marginBottom: 6 },
  headerSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '500' },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  warnBox: { borderWidth: 1.5, borderRadius: 12, padding: 12, marginBottom: 16 },
  warnText: { fontWeight: '500', lineHeight: 18 },
  tabs: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabText: { fontWeight: '700' },
  label: { fontWeight: '600', marginBottom: 6, marginTop: 8 },
  input: { borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 4 },
  submitBtn: { marginTop: 20, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '700' },
  skip: { marginTop: 18, alignItems: 'center' },
  fineprint: { textAlign: 'center', marginTop: 20, lineHeight: 18 },
});
