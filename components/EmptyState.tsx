import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { space } from '../theme/design';

interface EmptyStateProps {
  /** Big emoji shown at the top. */
  icon: string;
  /** Optional bold headline above the body text. */
  title?: string;
  /** Body copy explaining the empty state. */
  text: string;
  /** Optional colored hint line below the body. */
  hint?: string;
  /** Color for the hint line — defaults to the theme accent. */
  hintColor?: string;
}

/**
 * Shared "nothing here yet" placeholder so every screen's empty state looks
 * identical instead of each rolling its own icon size and spacing.
 */
export default function EmptyState({ icon, title, text, hint, hintColor }: EmptyStateProps) {
  const { accentColor, presetValues, fontSizes } = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={styles.icon}>{icon}</Text>
      {title ? (
        <Text style={[styles.title, { color: presetValues.text, fontSize: fontSizes.title }]}>{title}</Text>
      ) : null}
      <Text style={[styles.text, { color: presetValues.textSecondary, fontSize: fontSizes.base }]}>{text}</Text>
      {hint ? (
        <Text style={[styles.hint, { color: hintColor ?? accentColor, fontSize: fontSizes.base - 1 }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginTop: 56, paddingHorizontal: space.xl, gap: space.sm },
  icon: { fontSize: 60, marginBottom: space.xs },
  title: { fontWeight: '800', textAlign: 'center' },
  text: { fontWeight: '500', textAlign: 'center', lineHeight: 22 },
  hint: { fontWeight: '700', textAlign: 'center', marginTop: space.xs },
});
