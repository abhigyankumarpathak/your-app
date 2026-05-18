import { Alert, Platform } from 'react-native';

type ConfirmOptions = {
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

/**
 * Cross-platform confirm dialog. Returns true if the user confirmed.
 * On web, falls back to window.confirm because Alert.alert button callbacks
 * don't fire there.
 */
export const confirm = (
  title: string,
  message: string,
  options: ConfirmOptions = {}
): Promise<boolean> => {
  const { confirmText = 'OK', cancelText = 'Cancel', destructive = false } = options;

  if (Platform.OS === 'web') {
    const ok = typeof window !== 'undefined' && window.confirm
      ? window.confirm(`${title}\n\n${message}`)
      : false;
    return Promise.resolve(ok);
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmText,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
};

/**
 * Cross-platform alert. On web, falls back to window.alert.
 */
export const notify = (title: string, message?: string) => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.alert) {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
    return;
  }
  Alert.alert(title, message);
};
