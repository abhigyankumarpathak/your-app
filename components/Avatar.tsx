import { Image, Platform, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface Props {
  size: number;
  borderColor?: string;
  borderWidth?: number;
}

/** A native file URI (file://, content://, ph://) only loads on the device
 *  that owns the file — it's unusable on web. Treat those as "no photo". */
const isLoadableHere = (uri: string | null): uri is string => {
  if (!uri) return false;
  if (Platform.OS !== 'web') return true;
  return /^(https?:|data:|blob:)/i.test(uri);
};

/** Renders the user's photo avatar if set, otherwise the emoji avatar with bg color. */
export default function Avatar({ size, borderColor = 'rgba(255,255,255,0.7)', borderWidth = 3 }: Props) {
  const { avatar, avatarBg, avatarImage } = useTheme();

  if (isLoadableHere(avatarImage)) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth,
          borderColor,
          overflow: 'hidden',
        }}
      >
        <Image
          source={{ uri: avatarImage }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: avatarBg,
        borderWidth,
        borderColor,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: size * 0.55 }}>{avatar}</Text>
    </View>
  );
}
